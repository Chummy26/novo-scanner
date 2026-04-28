"""Analise PhD-level do dataset coletado em data/ml/.

Inventaria arquivos parquet e jsonl, valida schema v7 da Wave W, e
gera estatisticas para avaliar adequacao para Marco 2 (trainer).
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pyarrow.json as pajson
import pandas as pd

DATA = Path(r"C:\Users\nicoolas\Pictures\novo sc anner\data\ml")


def inventory() -> dict[str, list[Path]]:
    out: dict[str, list[Path]] = defaultdict(list)
    for kind in ("raw_samples", "accepted_samples", "labeled_trades"):
        d = DATA / kind
        if not d.exists():
            continue
        for ext in ("*.parquet", "*.jsonl"):
            out[kind].extend(sorted(d.rglob(ext)))
    return out


def parquet_meta(path: Path) -> dict:
    pf = pq.ParquetFile(path)
    schema = pf.schema_arrow
    return {
        "path": str(path),
        "rows": pf.metadata.num_rows,
        "size_bytes": path.stat().st_size,
        "n_columns": len(schema),
        "columns": [(f.name, str(f.type)) for f in schema],
    }


def jsonl_first_record(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        first = fh.readline()
        return json.loads(first)


def section(title: str) -> None:
    print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")


def main() -> int:
    inv = inventory()
    section("1. INVENTARIO")
    for kind, files in inv.items():
        total_bytes = sum(p.stat().st_size for p in files)
        print(f"  {kind}: {len(files)} arquivo(s), {total_bytes / 1e6:.1f} MB total")
        for p in files:
            print(f"    {p.stat().st_size / 1e6:8.2f} MB  {p.relative_to(DATA)}")

    section("2. SCHEMA RAW_SAMPLES")
    raw_files = inv.get("raw_samples", [])
    parquets = [p for p in raw_files if p.suffix == ".parquet"]
    jsonls = [p for p in raw_files if p.suffix == ".jsonl"]
    if parquets:
        meta = parquet_meta(parquets[0])
        print(f"  Parquet schema (de {meta['path']}): {meta['rows']} rows, {meta['n_columns']} cols")
        for name, dtype in meta["columns"]:
            print(f"    {name}: {dtype}")
    if jsonls:
        rec = jsonl_first_record(jsonls[0])
        print(f"\n  JSONL primeira linha (de {jsonls[0].name}):")
        for k, v in rec.items():
            tv = type(v).__name__
            print(f"    {k}: {tv}  = {v if not isinstance(v, (dict, list)) else '...'}")

    section("3. SCHEMA LABELED_TRADES")
    lbl_files = inv.get("labeled_trades", [])
    if not lbl_files:
        print("  (vazio)")
    else:
        for lp in lbl_files:
            if lp.suffix != ".parquet":
                continue
            meta = parquet_meta(lp)
            print(f"  {meta['path']}: {meta['rows']} rows, {meta['n_columns']} cols")
            for name, dtype in meta["columns"]:
                print(f"    {name}: {dtype}")

    section("4. RAW_SAMPLES — ESTATISTICAS AGREGADAS")
    if parquets:
        # Concatenar todos parquets
        tables = [pq.read_table(p) for p in parquets]
        df_raw = pa.concat_tables(tables, promote_options="default").to_pandas()
        print(f"  Total linhas (parquet): {len(df_raw)}")
        if "schema_version" in df_raw:
            print(f"  schema_version distribution: {dict(Counter(df_raw['schema_version']))}")
        for col in ("sample_decision", "sampling_tier", "buy_venue", "sell_venue", "buy_market", "sell_market"):
            if col in df_raw:
                ctr = Counter(df_raw[col])
                top = ctr.most_common(10)
                print(f"  {col}: {len(ctr)} unique, top 10 = {top}")
        if "sample_id" in df_raw:
            n_unique = df_raw["sample_id"].nunique()
            print(f"  sample_id unique = {n_unique} / total {len(df_raw)}, dup rate = {(len(df_raw) - n_unique) / len(df_raw):.4%}")
            sample_id_lens = df_raw["sample_id"].str.len().describe()
            print(f"  sample_id length stats: min={int(sample_id_lens['min'])} max={int(sample_id_lens['max'])} mean={sample_id_lens['mean']:.1f}")
        if "entry_spread" in df_raw and "exit_spread" in df_raw:
            print(f"  entry_spread quantis: p1={df_raw['entry_spread'].quantile(0.01):.4f} p50={df_raw['entry_spread'].median():.4f} p99={df_raw['entry_spread'].quantile(0.99):.4f}")
            print(f"  exit_spread quantis:  p1={df_raw['exit_spread'].quantile(0.01):.4f} p50={df_raw['exit_spread'].median():.4f} p99={df_raw['exit_spread'].quantile(0.99):.4f}")
        if "ts_ns" in df_raw:
            t_min = df_raw["ts_ns"].min()
            t_max = df_raw["ts_ns"].max()
            span_min = (t_max - t_min) / 1e9 / 60
            print(f"  ts_ns span: {span_min:.2f} min   ({pd.Timestamp(t_min, unit='ns')} -> {pd.Timestamp(t_max, unit='ns')})")
    else:
        print("  (sem parquet raw_samples)")

    section("5. LABELED_TRADES — ESTATISTICAS")
    parquet_labels = [p for p in lbl_files if p.suffix == ".parquet"]
    if parquet_labels:
        tables = [pq.read_table(p) for p in parquet_labels]
        df_lbl = pa.concat_tables(tables, promote_options="default").to_pandas()
        print(f"  Total linhas: {len(df_lbl)}")
        if "schema_version" in df_lbl:
            print(f"  schema_version: {dict(Counter(df_lbl['schema_version']))}")
        for col in ("outcome", "horizon_s", "sample_decision", "censor_reason", "sampling_tier"):
            if col in df_lbl:
                ctr = Counter(df_lbl[col].dropna()) if hasattr(df_lbl[col], "dropna") else Counter(df_lbl[col])
                print(f"  {col}: {dict(ctr.most_common())}")
        # Cross-tab outcome × horizon
        if "outcome" in df_lbl and "horizon_s" in df_lbl:
            xt = pd.crosstab(df_lbl["horizon_s"], df_lbl["outcome"])
            print(f"\n  Cross-tab horizon_s × outcome:\n{xt}")
            xt_norm = xt.div(xt.sum(axis=1), axis=0).round(4)
            print(f"\n  Mesma cross-tab normalizada (taxa por horizonte):\n{xt_norm}")
        # Cross-tab outcome × sample_decision
        if "outcome" in df_lbl and "sample_decision" in df_lbl:
            xt = pd.crosstab(df_lbl["sample_decision"], df_lbl["outcome"])
            print(f"\n  Cross-tab sample_decision × outcome:\n{xt}")
        # Time-to-first-hit
        for col in ("t_to_first_hit_s", "t_to_best_s"):
            if col in df_lbl:
                ser = df_lbl[col].dropna()
                if len(ser) > 0:
                    print(f"\n  {col}: n={len(ser)} min={ser.min()} p25={ser.quantile(0.25):.0f} p50={ser.median():.0f} p75={ser.quantile(0.75):.0f} p95={ser.quantile(0.95):.0f} max={ser.max()}")
        # Realized analysis
        if "audit_hindsight_best_exit_pct" in df_lbl or "best_exit_pct" in df_lbl:
            col_best = "audit_hindsight_best_exit_pct" if "audit_hindsight_best_exit_pct" in df_lbl else "best_exit_pct"
            col_gross = "audit_hindsight_best_gross_pct" if "audit_hindsight_best_gross_pct" in df_lbl else "best_gross_pct"
            if col_gross in df_lbl:
                ser = df_lbl[col_gross].dropna()
                if len(ser) > 0:
                    print(f"\n  {col_gross}: n={len(ser)} min={ser.min():.4f} p25={ser.quantile(0.25):.4f} p50={ser.median():.4f} p75={ser.quantile(0.75):.4f} p95={ser.quantile(0.95):.4f} max={ser.max():.4f}")
        # Multi-floor analysis
        for col in df_lbl.columns:
            if "floor_hits" in col or "label_floor_hits" in col or "normalized_floors" in col:
                print(f"\n  Coluna multi-floor encontrada: {col}; tipo {df_lbl[col].dtype}")
                first = df_lbl[col].iloc[0]
                print(f"    primeira amostra: {first}")
                break
        # Realized rate por route
        if "buy_venue" in df_lbl and "sell_venue" in df_lbl and "outcome" in df_lbl:
            df_lbl["route"] = df_lbl["buy_venue"].astype(str) + "->" + df_lbl["sell_venue"].astype(str)
            top_routes = df_lbl.groupby("route")["outcome"].agg(["count", lambda x: (x == "realized").mean()]).rename(columns={"<lambda_0>": "realized_rate"}).sort_values("count", ascending=False).head(15)
            print(f"\n  Top 15 routes por count:\n{top_routes}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
