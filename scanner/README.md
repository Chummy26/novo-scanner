# scanner

Rust cross-exchange price-spread scanner — 11 venues (12 WS streams), sub-ms ingest, 150ms broadcast.

## Status

- **71/71 testes** (70 lib + 1 integration) passando.
- **Release build**: 5.4MB com LTO=fat, panic=abort.
- **Live smoke test**: discovery descobre 2634 símbolos cross-listed em 11 venues em ~3s; todos 12 adapters WS conectam em paralelo.

## Architecture

See `MEMORY/project_architecture_decisions.md` at project root for the full PhD-level design brief. Summary:

- **Runtime**: tokio multi-thread (Windows dev, Linux prod).
- **WS**: tokio-websockets 0.11 + sha1_smol + native-tls + simd.
- **JSON**: sonic-rs `get()` returning `LazyValue<'a>` — zero-copy, no DOM.
- **GZIP**: libdeflater com reusable `Decompressor` + bomb-guard.
- **Protobuf**: quick-protobuf manual decode (MEXC spot) — sem codegen.
- **Book**: `#[repr(align(64))]` seqlock `TopOfBook` + sorted `Vec<Level>` full depth + flat array index.
- **Staleness**: Welford EWMA + Poisson bootstrap + CUSUM cross-feed asymmetry (40B/cell).
- **Metrics**: prometheus IntCounterVec + HdrHistogram per-venue + manual `/metrics` export.
- **Broadcast**: axum WS `/ws/scanner` + REST `/api/spread/*`.

## Build & Run

```bash
cargo check               # quick validate
cargo test --all-targets  # 71 tests
cargo build --release     # 5.4MB binary in target/release/
cargo run --release       # listen on 0.0.0.0:8000
cargo run --release -- --config config.toml
```

## Endpoints

| Route | Kind | Purpose |
|-------|------|---------|
| `/ws/scanner` | WS | Broadcasts opportunity snapshots every 150ms (frontend contract). |
| `/api/spread/opportunities` | GET | Latest snapshot as JSON array. |
| `/api/spread/status` | GET | Per-venue health: connected, last_frame_age_ms, active/stale symbols. |
| `/api/spread/history/:symbol` | GET | Per-symbol ring buffer (stub — returns `[]` for now). |
| `/metrics` | GET | Prometheus text format + HdrHistogram p99 summaries. |
| `/healthz` | GET | Liveness probe. |

## Adapters (12 streams — all implemented)

| Venue | Market | Encoding | Channel | Conns |
|-------|--------|----------|---------|-------|
| Binance | Spot | JSON | `!bookTicker` | 1 |
| Binance | Futures | JSON | `!bookTicker` | 1 |
| MEXC | Spot | **Protobuf** | `spot@public.miniTickers.v3.api.pb@UTC+8` | 1 |
| MEXC | Futures | JSON (gzip:false) | `sub.tickers` | 1 |
| BingX | Spot | JSON + GZIP | per-symbol `@bookTicker` | ⌈n/200⌉ |
| BingX | Futures | JSON + GZIP | per-symbol `@bookTicker` | ⌈n/200⌉ |
| Gate | Spot | JSON | `spot.tickers` `!all` | 1 |
| Gate | Futures | JSON | `futures.tickers` `!all` | 1 |
| Bitget | Spot+Fut | JSON | `ticker` batched ≤50/conn | ⌈n/50⌉ |
| KuCoin | Spot | JSON | `/market/ticker:all` | 1 |
| XT | Spot | **GZIP+Base64 app-level** (D-14) | `ticker@{sym}` | 1 |
| XT | Futures | JSON | `ticker@{sym}` | 1 |

## Key PhD corrections applied

- D-04 MEXC spot URL `wbs-api.mexc.com/ws` (era `wbs.mexc.com/ws`, obsoleto desde ago/2025)
- D-06 MEXC futures é JSON+GZIP, não Protobuf
- D-14 XT spot é GZIP+Base64 em payload (não WS permessage-deflate)
- D-16 Bitget v2 para market data (v3 é order placement)
- D-09 BingX futures ping server = 30s (não 5s como spot)
- D-13 KuCoin default **OFF** em config (beta status Pro API + não testado)

## Output contract (frontend)

```json
{
  "symbol":"BTC", "buyFrom":"binance", "sellTo":"gate",
  "buyType":"SPOT", "sellType":"FUTURES",
  "buyPrice":43567.12, "sellPrice":43812.98,
  "entrySpread":0.5637, "exitSpread":-0.3412,
  "buyVol24":0, "sellVol24":0,
  "buyBookAge":45, "sellBookAge":78
}
```

Frontend conecta em `ws://localhost:8000/ws/scanner` (confirmado inspecionando bundle do frontend).

## Pending (iterações futuras)

- **M9.1** fastrace spans com sampling 1% + force-sample >300µs
- **M9.2** Threading de frame-arrival `Instant` nos adapters → `record_ingest(venue, ns_real)`
- **M10** Validação wire real em staging (XT GZIP+Base64 vs permessage-deflate, BingX gzip vs zlib magic bytes, clock drift por venue)
- **Enhancement** Per-symbol ring buffer para `/api/spread/history/:symbol`
- **Enhancement** Ticker volume24h populado (campos `buyVol24`/`sellVol24` hoje zero)
