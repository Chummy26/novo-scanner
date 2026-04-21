---
name: ADR-026 — Broadcast de `Recommendation` via WebSocket `/ws/ml/recommendations`
description: Resolve lacuna da equipe pós-Wave S (`lib.rs:347 _rec descartado`, `was_recommended sempre false`, broadcast continua só OpportunityDto). Introduz `RecommendationBroadcaster` + endpoint `/ws/ml/recommendations` + fechamento do loop `was_recommended` baseado em subscribers ativos.
type: adr
status: approved
author: operador + critica-team + review
date: 2026-04-21
version: 1.0.0
supersedes: null
extends: ADR-016 (output contract); ADR-013 (serving); ADR-005 (sample persistence)
reviewed_by: [operador]
---

# ADR-026 — Broadcast de Recommendation via WebSocket

## Contexto

Auditoria externa da equipe identificou lacuna estrutural grave:

> "Falta entregar o output final ao operador. O `Recommendation` é produzido e descartado; o broadcast continua mandando apenas `OpportunityDto` bruto (`lib.rs:347`, `broadcast/server.rs:103`). Falta um DTO de `TradeSetup` e a integração no WebSocket/UI. O próprio contrato interno já admite que esse DTO ainda será criado (`contract.rs:15`). Falta o feedback loop auditável do que foi de fato mostrado ao humano. `was_recommended` existe no schema, mas continua `false` no MVP/shadow e não fecha o ciclo operacional ainda (`sample.rs:30`)."

Sem isso, TODO o stack ML está inútil para o operador — dados fluem, métricas acumulam, mas **nenhuma recomendação chega ao humano**. O norte do CLAUDE.md ("operador executa com convicção com `{enter, exit, lucro, P, IC, T}`") não é satisfeito.

## Decisão

### Componentes novos

1. **`ml/dto.rs`** — `RecommendationDto`, `TradeSetupDto`, `AbstainReasonDto`, `AbstainDiagnosticDto`, `TacticalSignalDto`, `RouteIdDto`. Derive `Serialize` via `serde`. Correspondência 1:1 com struct fortemente tipado de `ml/contract.rs` (fields de `ADR-016`).

2. **`ml/broadcast.rs`** — `RecommendationBroadcaster`:
   - Wrapping de `tokio::sync::broadcast::Sender<Arc<RecommendationFrame>>`.
   - Capacidade default 512 frames.
   - `publish()` não bloqueia em backpressure — consumer lento perde mensagens (trade-off correto para hot path de 150 ms).
   - `BroadcasterMetrics` atômico: `published_total`, `trade_published_total`, `abstain_published_total`, `no_subscribers_total`, `was_recommended_publications`.

3. **Endpoint WS `/ws/ml/recommendations`** em `broadcast/server.rs`:
   - Cliente inscreve via `ml_broadcaster.subscribe()`.
   - Frame WS format: `{"type":"ml.recommendation","cycle_seq":N,"emitted_at_ns":N,"payload":<RecommendationDto>}`.
   - Heartbeat 30 s (igual a `/ws/scanner`).
   - Handler responde 503-like ("broadcaster_not_configured") se `ml_broadcaster` for `None` no state.

4. **Endpoint REST `/api/ml/recommendations/status`** — snapshot dos contadores (debugging/monitoramento sem Prometheus).

### Integração em `lib.rs`

Ponto crítico pós-Wave S:

```rust
// ANTES (lacuna):
let (_rec, _dec, accepted) = ml_server.on_opportunity(...);
if let Some(sample) = accepted { let _ = ml_writer.try_send(sample); }

// DEPOIS (ADR-026):
let (rec, _dec, accepted) = ml_server.on_opportunity(...);
let was_shown = ml_broadcaster.publish(cycle_seq, now, route, &rec);
if let Some(mut sample) = accepted {
    if was_shown { sample.mark_recommended(); }
    let _ = ml_writer.try_send(sample);
}
```

**`was_recommended` agora fecha o loop:** é `true` sse havia ≥ 1 consumer inscrito quando a recomendação foi publicada. Persistido no JSONL e consumido pelo pipeline de treino Marco 1 para meta-labeling (López de Prado §5) — "operador viu esse trade" é feature forte de policy learning.

### Semântica de fanout

- Múltiplos consumidores simultâneos (ex: UI do operador + dashboard auxiliar + logger de auditoria) recebem cada frame independentemente.
- Consumer que não chama `recv()` rápido o suficiente entra em estado "Lagged(n)" — skipa frames antigos mas permanece inscrito. Dashboard mostra `broadcaster_lagged_total` (extensão futura).

## Alternativas consideradas

### Alt-1 — Adicionar Recommendation dentro de `OpportunityDto` existente

**Rejeitada**: sobrecarrega contract de `OpportunityDto` (consumido por frontend estável); cria acoplamento indevido entre scanner bruto e layer ML.

### Alt-2 — Endpoint REST long-poll em vez de WebSocket

**Rejeitada**: cadência de 150 ms do scanner × 2600 rotas torna polling ineficiente; WebSocket é padrão adotado pelo `/ws/scanner` existente.

### Alt-3 — `tokio::sync::mpsc` single-consumer

**Rejeitada**: UI do operador + logger de auditoria + métricas de shadow mode são N consumidores simultâneos; broadcast é correto.

### Alt-4 — Só persistir JSONL, operador lê arquivo

**Rejeitada**: latência de arquivo incompatível com decisão operacional em tempo real (ADR-016 §Q3 UI layout).

## Consequências

**Positivas**:
- Recomendação ML finalmente atinge operador em tempo real.
- `was_recommended` vira signal útil (flipa quando UI está conectada, cria dataset de "recomendações efetivamente apresentadas").
- Métricas Prometheus novas (`ml_broadcaster_*`) dão visibilidade do funil end-to-end.
- Múltiplos consumers (UI + logger + dashboard) sem reescrita.

**Negativas**:
- +1 endpoint a manter. +400 LoC Rust (broadcaster + dto + handlers + tests).
- Frontend precisa implementar consumer UI — esforço separado no workstream de UI.
- Frame rate pode causar lag em consumer lento; mitigação via `Lagged(n)` do broadcast channel.

**Risco residual**:
- Se UI do operador cair por backpressure sustentado, `was_recommended` fica `false` silenciosamente e dataset de meta-labeling fica enviesado. Mitigação: alerta Prometheus em `ml_broadcaster_no_subscribers_total` > 0 por >1h durante horário operacional.

## Dependências

- ADR-005 (output tipado `Recommendation`) — resolvido.
- ADR-016 (contrato TradeSetup) — resolvido; DTOs espelham campos.
- ADR-025 (raw_samples) — ortogonal.
- Wave T futura: UI frontend consumindo `/ws/ml/recommendations`.

## Testes de verificação

- `cargo test --lib ml::broadcast` — 5 testes cobrem publish sem subscribers, single/multi subscriber, roundtrip JSON, métricas separadas por variante.
- `cargo test --lib ml::dto` — 5 testes cobrem conversão Trade / Abstain, todos enum labels, campos round-trip via serde_json.
- Integration test ponta-a-ponta com WS handler fica para Marco 1 (requer spawn de scanner + cliente TCP).

## Status

**Approved** — implementado em 2026-04-21 (Wave T). Testes 201/201 passando.
