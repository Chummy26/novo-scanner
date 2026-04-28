---
status: draft
author: codex
date: 2026-04-23
version: 0.1.0
supersedes: null
reviewed_by: null
---

# Data Lineage

Ordem point-in-time por snapshot:

1. O scanner calcula `entry_spread(t0)` e `exit_spread(t0)` para rota válida.
2. O ML avalia trigger e recomendação usando apenas o cache anterior a `t0`.
3. O snapshot pré-trigger pode ser gravado em `raw_samples`.
4. Se limpo, o snapshot atualiza cache e pendings de labels futuros.
5. Se elegível, cria `PendingLabel` com `FeaturesT0` congeladas antes da
   observação corrente entrar no histórico.
6. Observações futuras limpas atualizam `first_exit_ge_label_floor_*`,
   `audit_hindsight_*` e censura por horizonte.

Lineage crítico:

- Rota estável: `symbol_name + buy_venue + buy_market + sell_venue + sell_market`.
- `symbol_id` é auxiliar de runtime e não deve ser usado para join cross-run.
- `oldest_cache_ts_ns` é a observação real mais antiga retida, não
  `last_update - 24h`.
- `runtime_config_hash` separa datasets gerados por configs diferentes de
  floor, stride, horizons, decimation e cooldown.
- `priority_set_generation_id` e `priority_set_updated_at_ns` permitem auditar
  membership do tier `priority`.

Fora do objetivo do modelo: book age, halt, taker/maker fees, funding, slippage,
position sizing, stop-loss, margem, execução parcial e PnL líquido.
