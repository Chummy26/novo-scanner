#!/usr/bin/env python3
"""Explode LabeledTrade.label_floor_hits into trainer-ready JSONL.

Input unit: one LabeledTrade row per (sample_id, horizon_s).
Output unit: one row per (sample_id, horizon_s, floor_pct).

The dataset skill defines multi-floor labels as first-class supervision.
Training directly on label_floor_pct alone silently collapses the curve
P(realize | floor). This helper is intentionally small and fail-fast so a
trainer cannot accidentally ignore label_floor_hits[].
"""

from __future__ import annotations

import argparse
import gzip
import json
import sys
from pathlib import Path
from typing import Iterable, Iterator

FNV_OFFSET_128 = 0x6C62272E07BB014262B821756295C58D
FNV_PRIME_128 = 0x0000000001000000000000000000013B


def iter_input_paths(root: Path) -> Iterator[Path]:
    if root.is_file():
        yield root
        return
    storage_v2_manifests = sorted(root.rglob("*.storage_v2.manifest.json"))
    if storage_v2_manifests:
        yield from storage_v2_manifests
        return
    for pattern in ("*.jsonl", "*.jsonl.gz", "*.parquet"):
        yield from sorted(root.rglob(pattern))


def iter_jsonl(path: Path) -> Iterator[dict]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_no}: invalid JSONL: {exc}") from exc


def iter_parquet(path: Path, batch_size: int) -> Iterator[dict]:
    name = path.name.lower()
    if name.endswith(".fact.parquet") or name.endswith(".route_dim.parquet"):
        raise RuntimeError(
            f"{path} is a physical ml_storage_v2 sidecar. Pass the "
            "*.storage_v2.manifest.json file or the data/ml_v2/labeled_trades "
            "directory so logical sample_id/route columns are reconstructed."
        )
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError(
            "reading Parquet requires pyarrow; install it or pass JSONL input"
        ) from exc
    parquet = pq.ParquetFile(path)
    for batch in parquet.iter_batches(batch_size=batch_size):
        for row in batch.to_pylist():
            yield row


def resolve_manifest_path(manifest_path: Path, raw: str) -> Path:
    path = Path(raw)
    if path.exists() or path.is_absolute():
        return path
    candidate = manifest_path.parent / path
    if candidate.exists():
        return candidate
    return path


def fnv1a_update(state: int, data: bytes) -> int:
    mask = (1 << 128) - 1
    for byte in data:
        state ^= byte
        state = (state * FNV_PRIME_128) & mask
    return state


def sample_id_of(
    ts_ns: int,
    cycle_seq: int,
    symbol_name: str,
    buy_venue: str,
    buy_market: str,
    sell_venue: str,
    sell_market: str,
) -> str:
    state = FNV_OFFSET_128
    state = fnv1a_update(state, int(ts_ns).to_bytes(8, "little", signed=False))
    state = fnv1a_update(state, int(cycle_seq).to_bytes(4, "little", signed=False))
    state = fnv1a_update(state, str(symbol_name).encode("utf-8"))
    state = fnv1a_update(state, b"|")
    state = fnv1a_update(state, str(buy_venue).encode("utf-8"))
    state = fnv1a_update(state, b":")
    state = fnv1a_update(state, str(buy_market).encode("utf-8"))
    state = fnv1a_update(state, b"->")
    state = fnv1a_update(state, str(sell_venue).encode("utf-8"))
    state = fnv1a_update(state, b":")
    state = fnv1a_update(state, str(sell_market).encode("utf-8"))
    return f"{state:032x}"


def read_route_dim(path: Path) -> dict[int, dict]:
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError("reading ml_storage_v2 requires pyarrow") from exc
    rows = pq.read_table(path).to_pylist()
    out: dict[int, dict] = {}
    required = (
        "route_key",
        "route_id",
        "symbol_name",
        "canonical_symbol",
        "symbol_id",
        "buy_venue",
        "sell_venue",
        "buy_market",
        "sell_market",
    )
    for row in rows:
        if any(row.get(name) is None for name in required):
            raise ValueError(f"{path}: route_dim row has null required identity field")
        key = int(row["route_key"])
        existing = out.get(key)
        if existing is not None and existing != row:
            raise ValueError(f"{path}: conflicting route_key={key}")
        out[key] = row
    return out


def iter_storage_v2_manifest(path: Path, batch_size: int) -> Iterator[dict]:
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError("reading ml_storage_v2 requires pyarrow") from exc
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("dataset_kind") != "labeled_trades":
        raise ValueError(f"{path}: expected dataset_kind=labeled_trades")
    fact_path = resolve_manifest_path(path, manifest["fact_parquet_path"])
    route_dim_path = resolve_manifest_path(path, manifest["route_dim_parquet_path"])
    route_dim = read_route_dim(route_dim_path)
    parquet = pq.ParquetFile(fact_path)
    for batch in parquet.iter_batches(batch_size=batch_size):
        for row in batch.to_pylist():
            route_key = row.pop("route_key", None)
            if route_key is None:
                raise ValueError(f"{fact_path}: fact row missing route_key")
            dim = route_dim.get(int(route_key))
            if dim is None:
                raise ValueError(f"{fact_path}: route_key={route_key} missing from route_dim")
            symbol_name = dim.get("canonical_symbol") or dim["symbol_name"]
            row["sample_id"] = sample_id_of(
                row["ts_emit_ns"],
                row["cycle_seq"],
                symbol_name,
                dim["buy_venue"],
                dim["buy_market"],
                dim["sell_venue"],
                dim["sell_market"],
            )
            row["route_id"] = dim["route_id"]
            row["symbol_name"] = dim["symbol_name"]
            row["canonical_symbol"] = dim["canonical_symbol"]
            row["symbol_id"] = dim["symbol_id"]
            row["buy_venue"] = dim["buy_venue"]
            row["sell_venue"] = dim["sell_venue"]
            row["buy_market"] = dim["buy_market"]
            row["sell_market"] = dim["sell_market"]
            yield row


def iter_rows(paths: Iterable[Path], batch_size: int) -> Iterator[dict]:
    for path in paths:
        name = path.name.lower()
        if name.endswith(".jsonl") or name.endswith(".jsonl.gz"):
            yield from iter_jsonl(path)
        elif name.endswith(".storage_v2.manifest.json"):
            yield from iter_storage_v2_manifest(path, batch_size)
        elif name.endswith(".parquet"):
            yield from iter_parquet(path, batch_size)


def fallback_primary_hit(row: dict) -> list[dict]:
    return [
        {
            "floor_pct": row.get("label_floor_pct"),
            "first_exit_ge_floor_ts_ns": row.get("first_exit_ge_label_floor_ts_ns"),
            "first_exit_ge_floor_pct": row.get("first_exit_ge_label_floor_pct"),
            "t_to_first_hit_s": row.get("t_to_first_hit_s"),
            "realized": row.get("first_exit_ge_label_floor_ts_ns") is not None,
        }
    ]


def floor_outcome(row: dict, hit: dict) -> str:
    if hit.get("realized") is True or hit.get("first_exit_ge_floor_ts_ns") is not None:
        return "realized"
    observed_until = row.get("observed_until_ns")
    closed_at = row.get("label_window_closed_at_ns")
    if observed_until is not None and closed_at is not None:
        try:
            if int(observed_until) >= int(closed_at):
                return "miss"
        except (TypeError, ValueError):
            pass
    if row.get("outcome") == "censored":
        return "censored"
    return "miss"


def explode_row(row: dict, allow_primary_fallback: bool) -> Iterator[dict]:
    sample_id = row.get("sample_id")
    if not sample_id:
        raise ValueError("missing required sample_id")
    if row.get("horizon_s") is None:
        raise ValueError(f"sample_id={sample_id}: missing required horizon_s")
    hits = row.get("label_floor_hits")
    if not hits:
        if not allow_primary_fallback:
            raise ValueError(f"sample_id={sample_id}: missing label_floor_hits[]")
        hits = fallback_primary_hit(row)

    primary_floor = row.get("label_floor_pct")
    base = dict(row)
    base.pop("label_floor_hits", None)
    for hit in hits:
        floor_pct = hit.get("floor_pct")
        out = dict(base)
        out["floor_pct"] = floor_pct
        out["is_primary_floor"] = (
            floor_pct is not None
            and primary_floor is not None
            and abs(float(floor_pct) - float(primary_floor)) < 1e-6
        )
        out["floor_outcome"] = floor_outcome(row, hit)
        out["floor_realized"] = out["floor_outcome"] == "realized"
        out["floor_first_exit_ge_ts_ns"] = hit.get("first_exit_ge_floor_ts_ns")
        out["floor_first_exit_ge_pct"] = hit.get("first_exit_ge_floor_pct")
        out["floor_t_to_first_hit_s"] = hit.get("t_to_first_hit_s")
        yield out


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Explode LabeledTrade label_floor_hits[] for trainer ingestion."
    )
    parser.add_argument("input", type=Path, help="LabeledTrade JSONL/Parquet file or directory")
    parser.add_argument("-o", "--output", type=Path, help="Output JSONL path; default stdout")
    parser.add_argument("--batch-size", type=int, default=65536, help="Parquet batch size")
    parser.add_argument(
        "--allow-primary-fallback",
        action="store_true",
        help="Fallback to primary label fields when label_floor_hits[] is absent",
    )
    args = parser.parse_args()

    paths = list(iter_input_paths(args.input))
    if not paths:
        raise SystemExit(f"no labeled trade files found under {args.input}")

    rows_in = 0
    rows_out = 0
    output_fh = (
        args.output.open("w", encoding="utf-8", newline="\n") if args.output else sys.stdout
    )
    try:
        for row in iter_rows(paths, args.batch_size):
            rows_in += 1
            for exploded in explode_row(row, args.allow_primary_fallback):
                rows_out += 1
                output_fh.write(json.dumps(exploded, separators=(",", ":")) + "\n")
    finally:
        if args.output:
            output_fh.close()

    print(
        f"exploded label floors: input_rows={rows_in} output_rows={rows_out}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
