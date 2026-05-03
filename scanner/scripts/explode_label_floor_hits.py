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


def iter_input_paths(root: Path) -> Iterator[Path]:
    if root.is_file():
        yield root
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


def iter_rows(paths: Iterable[Path], batch_size: int) -> Iterator[dict]:
    for path in paths:
        name = path.name.lower()
        if name.endswith(".jsonl") or name.endswith(".jsonl.gz"):
            yield from iter_jsonl(path)
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
    hits = row.get("label_floor_hits")
    if not hits:
        if not allow_primary_fallback:
            sample_id = row.get("sample_id", "<unknown>")
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
