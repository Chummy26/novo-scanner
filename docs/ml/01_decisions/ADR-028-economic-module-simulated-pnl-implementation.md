---
name: ADR-028 — Implementação do módulo `ml/economic` (simulated_pnl_bruto_aggregated)
description: Concretiza ADR-019 em Rust. Introduz TradeOutcome (Realized/WindowMiss/ExitMiss) + EconomicAccumulator rolling 1h/24h/7d/30d + métricas Prometheus + persistência JSONL. Substitui ADR-019 como "aprovado em documentação" por "implementado em código".
type: adr
status: approved
author: operador + critica-review
date: 2026-04-21
version: 1.0.0
supersedes: null
extends: ADR-019 (gating econômico direto — especificação)
reviewed_by: [operador]
---

# ADR-028 — Implementação do módulo `ml/economic`

## Contexto

ADR-019 aprovou gating econômico via `simulated_pnl_bruto_aggregated` (gates 7 e 8 do kill switch). Auditoria crítica pós-Wave S detectou:

> "Falta a ponte correta entre scanner bruto e gating econômico fora do scanner. O scanner deve continuar cego a fees/funding/execução, mas o modelo precisa de um critério econômico consistente para não recomendar lixo estatisticamente 'bonito'. (...) Falta kill switch / rollback baseado em métricas reais do modelo final."

Especificação existia em ADR-019; implementação em código não. Ponte real (`RawSample ou AcceptedSample → resolve_outcome → PnL acumulado`) faltava.

## Decisão

### Módulo `ml/economic`

**Constantes** (ADR-019 valores default):
- `CAPITAL_HYPOTHETICAL_USD = 10_000.0`
- `DEFAULT_T_TRIGGER_MAX_S = 300`
- `DEFAULT_OPERATOR_ATTENTION_COST_USD = 0.10`

**`TradeOutcome` enum**:

```rust
pub enum TradeOutcome {
    Realized {
        enter_realized_pct: f32,
        exit_realized_pct: f32,
        horizon_observed_s: u32,
    },
    WindowMiss,          // enter_at_min não atingido em T_trigger_max
    ExitMiss {
        enter_realized_pct: f32,
        forced_exit_pct: f32,
    },
}
```

`gross_pnl_pct()`, `gross_pnl_usd()` métodos.

**`EconomicEvent`**:

Cacheia `gross_pnl_pct` e `gross_pnl_usd` pré-computados + `from_model` flag (distingue A2 de baseline A3). Serializa a JSONL em `data/ml/economic/`.

**`EconomicAccumulator`**:

Ring buffer de até 100k eventos recentes. Métodos:
- `push(event)` — atualiza counters atômicos + push ring.
- `snapshot_window(window_s, now_ns) -> WindowMetrics` — agregação rolling.
- `standard_windows(now_ns) -> [WindowMetrics; 4]` — 1h, 24h, 7d, 30d.

**`WindowMetrics`**:

```rust
pub struct WindowMetrics {
    pub window_s: u32,
    pub n_emissions: u64,
    pub n_realized: u64,
    pub n_window_miss: u64,
    pub n_exit_miss: u64,
    pub simulated_pnl_aggregated_usd: f64,
    pub pnl_per_emission_median_usd: f64,
    pub pnl_per_emission_p10_usd: f64,
    pub realization_rate: f32,
}
```

Método `economic_value_minus(baseline) -> f64` para o gate `ADR-019 gate 7`.

**`EconomicMetrics`** (atômico, para Prometheus):

```rust
pub struct EconomicMetrics {
    pub n_emissions_total: AtomicU64,
    pub n_realized_total: AtomicU64,
    pub n_window_miss_total: AtomicU64,
    pub n_exit_miss_total: AtomicU64,
    pub pnl_aggregated_usd_times_10k: AtomicU64,  // scaled int to avoid atomic f64
}
```

### Métricas Prometheus

Expostas via `ml/metrics.rs::update_from_economic(&em)`:

- `ml_economic_emissions_total` (Counter)
- `ml_economic_outcomes_total{outcome}` (CounterVec — realized/window_miss/exit_miss)
- `ml_economic_pnl_aggregated_usd` (Gauge — valor absoluto em USD)

### Integração com resolução de outcomes

**Marco 0 (atual)**: módulo define types + acumulador + métricas. Resolução `RawSample → TradeOutcome` fica pendente; requer lookup histórico em `raw_samples_*.jsonl` com fase de "replay" offline.

**Marco 0 semanas 4–6**: implementar resolver que consome stream `raw_samples_*.jsonl` e gera `EconomicEvent` em batch (batch resolver). Persistência em `data/ml/economic/YYYY-MM-DD.jsonl`.

**Marco 1**: resolver inline no hot path quando `Recommendation::Trade(setup)` expirar (`valid_until < now`), lookup O(log N) no ring buffer do `HotQueryCache`.

## Alternativas consideradas

### Alt-1 — QuestDB direct para acumulador

**Rejeitada como primário**: QuestDB é storage persistente, não ring buffer para métricas rolling em tempo real. Acumulador Rust in-process é ordens de magnitude mais rápido. QuestDB continua como destino de persistência via JSONL batch import.

### Alt-2 — Capital proporcional a vol24 da rota

**Rejeitada**: quebra comparabilidade cross-modelo; adiciona viés de normalização que precisaria ser justificado empiricamente. Capital fixo 10k é ADR-019 aprovado.

### Alt-3 — PnL líquido (fees estimadas)

**Rejeitada**: viola escopo fechado do scanner (detector, não calculadora). Operador aplica fees mentalmente; métrica bruta é coerente com resto do stack.

### Alt-4 — Deque sem ring buffer (armazenar tudo)

**Rejeitada**: a ~2600 rotas × 1 rec/min = ~3.7M/dia seria ~110M em 30 dias — memória inaceitável. Ring buffer 100k eventos recentes + persistência JSONL é compromisso correto.

## Consequências

**Positivas**:
- Gate econômico ADR-019 agora é implementável (código existe).
- Métricas Prometheus `ml_economic_*` alimentam dashboards Grafana Marco 0.
- `WindowMetrics` cobre as 4 janelas especificadas (1h/24h/7d/30d) com O(N) onde N = eventos na janela.
- Atomicidade garantida — não há data race em contagem.

**Negativas**:
- Resolver de outcome (convertir RawSample em TradeOutcome concreto) fica para Marco 0 semanas 4–6. Scaffolding em código é importante mas loop end-to-end não está fechado ainda.
- `pnl_aggregated_usd_times_10k` usa scale 1e4 para `AtomicU64` (sem `AtomicF64` estável em Rust). Overflow em cenários extremos (PnL agregado > 1.8 × 10^15 USD) — não relevante para capital 10k × regime longtail.

**Risco residual**:
- Se resolver (Marco 0 sem 4-6) divergir entre batch replay vs inline hot path (Marco 1), métricas entre fases podem apresentar descontinuidade. Mitigação: documentar em `data_lineage.md` e comparar ambos em Marco 1 primeiros 7 dias.

## Dependências

- ADR-019 (especificação do gate econômico).
- ADR-025 (RawSample stream — fonte de dados para resolver).
- ADR-016 (TradeSetup.emitted_at, valid_until).

## Testes de verificação

- `cargo test --lib ml::economic` — 7 testes:
  - `realized_outcome_computes_pnl_correctly`
  - `window_miss_has_zero_pnl`
  - `accumulator_tracks_aggregations`
  - `events_outside_window_are_excluded`
  - `json_line_serialization_is_parseable`
  - `buffer_respects_max_capacity`
  - `standard_windows_returns_four`
- Passam em 201/201 da suite.

## Status

**Approved** — implementação base em 2026-04-21. Resolver + persistência JSONL a concluir em Marco 0 semanas 4–6. Integração hot path em Marco 1.
