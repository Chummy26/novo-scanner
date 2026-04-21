---
name: Dataset Action Plan — Consolidação das 3 Auditorias PhD + Dados Reais do Scanner
description: Síntese operacional das 3 auditorias (Q1 pipeline, Q2 statistical, Q3 leakage) + observações do scanner em operação real; gaps priorizados com ações concretas antes de iniciar coleta de 90 dias
type: action-plan
status: draft
author: programa-phd-sub-agentes + operador
date: 2026-04-20
version: 0.1.0
---

# Dataset Action Plan — Pós-Auditorias PhD

Três agentes PhD auditaram o design do dataset; scanner foi rodado em dev mode para verificar comportamento real. Este documento consolida os achados e prioriza ações **antes** da coleta de 90 dias começar.

**Artefatos de origem**:
- [Q1 Pipeline Integrity](dataset_q1_pipeline_audit.md) — data-engineer PhD.
- [Q2 Statistical Quality](dataset_q2_statistical_audit.md) — data-scientist PhD.
- [Q3 Leakage & Contamination](dataset_q3_leakage_audit.md) — ml-engineer PhD.

---

## 1. O que o scanner mostrou em operação real (~15 min dev mode)

| Métrica | Valor | Interpretação |
|---|---|---|
| `ml_cache_routes_tracked` | **2826** | Acima de 2600 esperado ✅ |
| `ml_opportunities_seen_total` | **1 451 873** | Fluxo real saudável |
| `ml_sample_decisions_total{reason=accept}` | 7 565 (**0.5%**) | Dataset muito esparso |
| `ml_sample_decisions_total{reason=stale}` | 1 346 598 (**93%**) | 🚨 Threshold 200ms rejeita longtail |
| `ml_sample_decisions_total{reason=below_tail}` | 68 486 (4.7%) | OK |
| `ml_sample_decisions_total{reason=insufficient_history}` | 29 224 (2%) | OK (n_min atingido em ~3min) |
| `ml_recommendations_total{kind=trade}` | **0** | Baseline A3 conservador (esperado em MVP) |
| `ml_recommendations_total{kind=abstain_insufficient_data}` | 439 958 | OK (gate 1) |
| `ml_recommendations_total{kind=abstain_no_opportunity}` | 1 011 914 | OK (gate 2) |
| `scanner_ingest_latency_ns_p99{venue=binance}` | ~40–50 µs | Dentro do budget 500 µs ✅ |

**Descoberta #1 (ALARMANTE)**: 93% dos snapshots são `stale`. ADR-009 assumiu threshold universal 200ms — **inadequado para longtail**. D2 já reportava: MEXC ~500ms, BingX/XT ~1-2s book update rates. Se mantivermos 200ms: dataset 90d ≈ 6.75×10⁶ snapshots (suficiente) mas **excluindo sistematicamente venues longtail** (bias estrutural contra MEXC/BingX/XT — exatamente as venues operacionais).

**Descoberta #2**: zero Trades emitidos em 15 min. Baseline A3 exige `current > p50` + `gross_p10 ≥ floor 0.8%`. Em regime calm típico, cauda não bateu. Normal em curto período.

---

## 2. Convergência das 3 auditorias

### 2.1 Gaps CRÍTICOS (bloqueiam Marco 2)

| # | Gap | Origem | Impacto |
|---|---|---|---|
| **C1** | **Zero persistência** — dataset em RAM, perde no restart | Q1 Gap-1 | Coleta inviável |
| **C2** | **Ordem bug**: `observe()` antes do `trigger()` — stale/low-vol contaminam P95 | Q1 Gap-2 | Circular dependency |
| **C3** | **Threshold `book_age < 200ms` muito agressivo** — confirmado 93% em dados reais | Live + D2 | Bias venue top-5 |
| **C4** | **`was_recommended` ausente** em schema | Q3 Gap-2 + ADR-011 | T12 audit impossível |
| **C5** | **`listing_history.parquet` inexistente** — survivorship bias | Q2 Gap-5 + Q3 V10 | Backtest inflado |
| **C6** | **HotQueryCache monotonic growth** — P95 degrada com uptime | Q1 GM-2 | Features instáveis |

### 2.2 Gaps ALTOS (impactam precisão do A2)

| # | Gap | Origem |
|---|---|---|
| A1 | **Reservoir baseline (dual sample)** ausente — abstention sem contraste | Q2 Gap-1 |
| A2 | **`listing_age_days`** ausente das 15 features ADR-014 | Q2 Gap-2 |
| A3 | **Purged K-fold Python** não implementado | Q3 Gap-3 |
| A4 | **Cross-route lag-correlation audit** ausente — feature G pode levar 30min de futuro | Q3 Gap-4 |
| A5 | **Schema sem versionamento** | Q1 Gap-5 |

### 2.3 Gaps MÉDIOS

M1. `cusum_entry` não-estacionário — reset por regime (Q2 Gap-3).
M2. `pct_rank_entry_24h` truncada em [0.95, 1.0] pós-trigger → quase constante (Q2 Gap-4).
M3. Regime-stratified CV (Q3 Vetor-11).
M4. DSR para n=720 hipóteses (Q3 Vetor-7).
M5. Range clamp silencioso no HotQueryCache (Q1 GM-3).
M6. Clock monotônico (`Instant`) em vez de `SystemTime` (Q1 GM-4).

---

## 3. Plano priorizado — pré-coleta

### Fase 0 (2–4 dias) — Gaps críticos de código

**C2 Reordenar gates** (~2h):
```rust
// ANTES: observe() primeiro → P95 contaminado com stale/low-vol
// AGORA: trigger first, observe apenas se passou stale/vol
let fresh_and_liquid = trigger.is_fresh(...) && trigger.has_vol(...);
if fresh_and_liquid { cache.observe(route, e, x, ts); }
let sample_dec = trigger.evaluate(...); // agora P95 limpo
let rec = baseline.recommend(...);
```

**C3 Book-age per-venue** (~1 dia):
```rust
pub fn venue_max_book_age_ms(v: Venue) -> u32 {
    match v {
        Venue::BinanceSpot | Venue::BinanceFut => 100,
        Venue::MexcFut | Venue::MexcSpot => 500,
        Venue::BingxSpot | Venue::BingxFut
        | Venue::XtSpot | Venue::XtFut => 2000,
        _ => 1000,
    }
}
```

**C6 Ring buffer decimation** (~2 dias): 1-em-10 samples guardados per rota → 57.6k × 2600 × 16 B ≈ **2.4 GB**. Rolling 24h efetivo.

**C4 `was_recommended` field**: 30 min quando schema existir.

**C5 `listing_history.parquet` skeleton** (~1 dia):
- `active_from: now_ns()` quando rota aparece.
- `active_until: Option<u64>` setado após 2 ciclos ausentes.
- Flush diário.

### Fase 1 (1–2 sem) — Persistência Parquet mínima (C1)

- `mpsc::channel(100k)` + writer task async.
- Flush horário Parquet particionado `year/month/day/hour/`.
- Schema Q1 §5.3: `(ts_ns, cycle_seq, schema_version, symbol_id, buy_venue, sell_venue, entry_spread_pct, exit_spread_pct, buy_book_age_ms, sell_book_age_ms, buy_vol24_usd, sell_vol24_usd, sample_decision, was_recommended, scanner_build_hash)`.
- **Labels triple-barrier + 15 features computadas OFFLINE** pelo trainer Python (reproducibilidade garantida por `ts_ns`).
- Dependências novas: `parquet = "56"`, `arrow = "56"`.

### Fase 2 (1 sem) — Statistical enhancements (Q2)

- **A1** Reservoir sampler (Vitter 1985): 100 out-of-trigger/rota.
- **A2** `listing_age_days` feature.
- **A5** `schema_version` em metadata Parquet.

### Fase 3 (2 sem) — Leakage infra (Q3)

- **A3** Purged K-fold Python (ADR-006).
- **A4** `lag_correlation_audit()` Rust CI (lags 5/10/15/30/60 min).
- **TimeSource trait** + `dylint` lint `CLOCK_IN_ML_TRAINING`.

### Fase 4 (Marco 2) — Pipeline treino completo

Python trainer via `pyarrow` → features PIT-correct + triple-barrier + purged K-fold → ONNX → Rust `tract`.

---

## 4. Dependências

```
Fase 0 (5d) ─┬─→ Fase 1 (10d) ─┬─→ Fase 2 (5d)
             │                  └─→ Fase 3 (10d)
             └───────────────────────→ ⚠️ Sem Fase 0, coleta é lixo
                                       ↓
                                       Coleta 90 dias
                                       ↓
                                       Fase 4 (Marco 2)
```

---

## 5. Pontos de decisão usuário (confiança < 80%)

1. **Book-age thresholds per-venue** — números heurísticos D2; confirmar via observação.
2. **Duração coleta 60 vs 90 dias** — Q2 argumenta 90 (Clopper-Pearson halts).
3. **Decimation 1-em-10 vs 1-em-60** — storage 2.4 GB vs 400 MB mas perde granularidade.
4. **Features online vs offline computed** — Q1 recomenda offline para reproducibilidade.
5. **Reservoir 100 samples/rota** — heurístico; calibrar em 30 dias.
6. **DSR threshold com n=720** — revisar em Marco 2.

---

## 6. Resumo executivo

Scanner **funciona** e ML **coleta corretamente**. Mas **6 gaps críticos** bloqueiam coleta de 90 dias:

1. **C2** Reordenar observe()/trigger() — **2h**.
2. **C3** Book-age per-venue — **1 dia**.
3. **C6** Ring buffer decimation — **2 dias**.
4. **C1** Persistência Parquet — **1 semana**.
5. **C4** `was_recommended` — 30 min.
6. **C5** `listing_history` — **1 dia**.

**Fase 0**: ~5 dias-pessoa. **Fase 0+1+2+3**: ~4 semanas-pessoa.

**Sem Fase 0, dataset coletado agora é lixo para modelo A2** — biased (C3), contaminado (C2), não-persistido (C1), sem lineage (C4+C5).

---

## 7. Referências

- [dataset_q1_pipeline_audit.md](dataset_q1_pipeline_audit.md)
- [dataset_q2_statistical_audit.md](dataset_q2_statistical_audit.md)
- [dataset_q3_leakage_audit.md](dataset_q3_leakage_audit.md)
- ADRs: 006, 009, 011, 012, 014.
