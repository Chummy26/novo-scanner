---
status: draft
author: codex
date: 2026-04-23
version: 0.1.0
supersedes: null
reviewed_by: null
---

# Label Schema

O dataset treina apenas recomendação de spread bruto. O alvo primário é
falsificável por horizonte: `entry_locked_pct + exit_spread(t1) >= label_floor`.
Fees, funding, slippage, margem, posição, execução parcial e PnL líquido ficam
fora do label.

Streams:

- `raw_samples` (`RawSample` v9): observações pré-trigger amostradas por tier.
  Inclui `sampling_tier`, `sampling_probability`,
  `sampling_probability_kind`, `priority_set_generation_id`,
  `priority_set_updated_at_ns` e lifecycle mínimo da rota.
- `accepted_samples` (`AcceptedSample` v8): candidatos aceitos pelo trigger.
  `was_recommended` indica se o baseline/modelo emitiu `TradeSetup`; também
  carrega config hash, tier/probabilidade de amostragem e lifecycle.
- `labeled_trades` (`LabeledTrade` v7): um registro por
  `(sample_id, horizon_s)`, com `outcome in {realized, miss, censored}`.
  O resolver cria labels para candidates limpos, inclusive `sample_decision !=
  "accept"`, para auditoria de abstenção/background.

Horizontes default: `900, 1800, 3600, 7200, 14400, 28800` segundos.

Campos hindsight com prefixo `audit_hindsight_*` são somente auditoria/pesquisa.
Não são target supervisionado principal.

Invariantes do trainer:

- Não tratar `label_sampling_probability = null` como `1.0`. O labeler usa
  stride por rota/horizonte; pesos de seleção precisam ser reconstruídos a
  partir de `effective_stride_s`, `candidates_in_route_last_24h`,
  `accepts_in_route_last_24h`, `sampling_tier` e `sampling_probability_kind`.
- Não filtrar cegamente `labeled_trades` por `sample_decision == "accept"`.
  Treino precision-first pode priorizar a cauda aceita, mas calibração de
  recomendações em shadow mode deve avaliar todas as linhas onde
  `policy_metadata.recommendation_kind == "trade"`.
- Usar `label_floor_hits[]` quando o objetivo for estimar
  `P(realize | floor)`. O campo primário `first_exit_ge_label_floor_*` cobre
  apenas o `label_floor_pct` principal.
