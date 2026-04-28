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

- `raw_samples` (`RawSample` v7): observações pré-trigger amostradas por tier.
  Inclui `sampling_tier`, `sampling_probability`,
  `priority_set_generation_id` e `priority_set_updated_at_ns`.
- `accepted_samples` (`AcceptedSample` v6): candidatos aceitos pelo trigger.
  `was_recommended` indica se o baseline/modelo emitiu `TradeSetup`.
- `labeled_trades` (`LabeledTrade` v6): um registro por
  `(sample_id, horizon_s)`, com `outcome in {realized, miss, censored}`.

Horizontes default: `900, 1800, 3600, 7200, 14400, 28800` segundos.

Campos hindsight com prefixo `audit_hindsight_*` são somente auditoria/pesquisa.
Não são target supervisionado principal.
