# scanner

Rust cross-exchange price-spread scanner — 11 venues (14 WS streams + REST vol poller), sub-ms ingest, 150ms broadcast.

## Estratégia detectada (nomenclatura)

O scanner é um **detector** (não calculadora de PnL) das oportunidades de uma única família de estratégia. Os termos abaixo são sinônimos ou recortes técnicos da mesma coisa, listados para remover ambiguidade em docs, issues e discussões:

- **Nome canônico (genérico):** *Cross-exchange convergence arbitrage* — two-leg, market-neutral, discretionary, mean-reverting
- **Literatura acadêmica equivalente:** *Cross-exchange statistical arbitrage with delayed unwind*
- **Por topologia das pernas:** *Cross-exchange arbitrage* (sin. *spatial arbitrage*)
- **Por mecanismo de retorno:** *Statistical arbitrage* / *mean-reversion arbitrage*
- **Por estrutura temporal:** *Two-leg convergence trade with delayed unwind* / *open-position spread trade*
- **Quando uma perna é SPOT e a outra PERP/FUTURES:** *Cross-exchange perpetual–spot basis arbitrage* (caso particular de *cash-and-carry / basis arbitrage*)
- **Em português:** *arbitragem de spread cross-venue*

**Explicitamente NÃO é:**
- ❌ Arbitragem triangular (intra-venue, três pares em loop)
- ❌ Latency arbitrage HFT (janela é minutos a horas, não microssegundos)
- ❌ Arbitragem livre de risco (*risk-free arb*) — existe risco direcional residual enquanto a posição está aberta
- ❌ Funding-rate arbitrage pura — funding é termo auxiliar de carrego, não fonte primária de retorno
- ❌ Pairs trading (clássico) — pairs trading opera ativos *distintos* correlacionados; aqui o "par" é o **mesmo** ativo em venues diferentes

Ver `.claude/skills/spread-arbitrage-strategy/SKILL.md` para a aula conceitual completa (modelo de duas séries, identidade de PnL bruto, regra de dois testes, fronteira estrutural vs. discricionário).

## Status

- **90/90 testes** (89 lib + 1 integration) passando.
- **Release build**: 6.0 MB com LTO=fat, panic=abort.
- **Live smoke test**: discovery descobre 2600+ símbolos cross-listed em 11 venues em ~3s; todos 14 adapters WS conectam em paralelo.

## Architecture

Design decisions e trade-offs registrados na memória de projeto (`project_architecture_decisions.md`, em `~/.claude/projects/.../memory/`). Summary:

- **Runtime**: tokio multi-thread (Windows dev, Linux prod).
- **WS**: tokio-websockets 0.11 + sha1_smol + rustls/webpki + simd.
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

## Adapters (14 WS streams + 2 auxiliares — all implemented)

| Venue | Market | Encoding | Channel | Conns |
|-------|--------|----------|---------|-------|
| Binance | Spot | JSON | `!bookTicker` | 1 |
| Binance | Futures | JSON | `!bookTicker` | 1 |
| MEXC | Spot | **Protobuf** | `spot@public.miniTickers.v3.api.pb@UTC+8` | 1 |
| MEXC | Futures | JSON (gzip:false) | `sub.tickers` | 1 |
| BingX | Spot | JSON + GZIP | per-symbol `@bookTicker` | ⌈n/200⌉ |
| BingX | Futures | JSON + GZIP | per-symbol `@bookTicker` | ⌈n/200⌉ |
| Gate | Spot | JSON | `spot.tickers` `!all` | 1 |
| Gate | Futures | JSON | `futures.book_ticker` batched | 1 |
| Bitget | Spot | JSON | `ticker` batched ≤50/conn | ⌈n/50⌉ |
| Bitget | Futures | JSON | `ticker` batched ≤50/conn | ⌈n/50⌉ |
| KuCoin | Spot | JSON | `/market/ticker:all` | 1 |
| KuCoin | Futures | JSON | `/contractMarket/ticker:all` | 1 |
| XT | Spot | JSON text (no permessage-deflate advertised) | `depth@{sym},5` | 1 |
| XT | Futures | JSON | `ticker@{sym}` | 1 |

**Auxiliares (não-WS):**
- `mexc_spot_rest.rs` — fallback REST para MEXC spot quando a stream Protobuf fica stale
- `vol_poller.rs` — poll REST 60s para preencher `vol24` em venues cuja stream WS primária não carrega 24h stats

## Key PhD corrections applied

- D-04 MEXC spot URL `wbs-api.mexc.com/ws` (era `wbs.mexc.com/ws`, obsoleto desde ago/2025)
- D-06 MEXC futures é JSON+GZIP, não Protobuf
- D-14 XT spot atual usa `method=subscribe` + `depth@{sym},5`; manter handshake sem permessage-deflate até o cliente WS suportar descompressão dessa extensão
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
  "buyVol24":1234567.89, "sellVol24":987654.32,
  "buyBookAge":45, "sellBookAge":78
}
```

Frontend conecta em `ws://localhost:8000/ws/scanner` (confirmado inspecionando bundle do frontend).

## Pending (iterações futuras)

- **M9.1** fastrace spans com sampling 1% + force-sample >300µs
- **M9.2** Threading de frame-arrival `Instant` nos adapters → `record_ingest(venue, ns_real)`
- **M10** Validação wire real em staging (XT handshake sem/acom permessage-deflate, BingX gzip vs zlib magic bytes, clock drift por venue)

## Done (recent)

- Per-symbol ring buffer real em `broadcast/history.rs` alimentando `/api/spread/history/:symbol` (era stub `[]`).
- `vol24` populado via `adapter/vol_poller.rs` (REST poll 60s, 12 streams); campos `buyVol24`/`sellVol24` agora carregam valor.
- Ghost-spread guard em spot/spot (commit `4c120a7 spot ghosts arb fix`).
- MEXC spot REST fallback (`adapter/mexc_spot_rest.rs`) quando a stream Protobuf fica stale.
- KuCoin Futures adapter (`kucoin_fut.rs`) e Bitget split Spot/Futures (`bitget.rs` + `bitget_fut.rs`).
