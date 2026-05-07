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

- `raw_samples` (`RawSample` v11): observações pré-trigger amostradas por tier.
  Inclui `sampling_tier`, `sampling_probability`,
  `sampling_probability_kind`, `priority_set_generation_id`,
  `priority_set_updated_at_ns` e lifecycle mínimo da rota.
- `accepted_samples` (`AcceptedSample` v10): candidatos aceitos pelo trigger.
  `was_recommended` indica se o baseline/modelo emitiu `TradeSetup`; também
  carrega config hash, tier/probabilidade de amostragem e lifecycle.
- `labeled_trades` (`LabeledTrade` v11): um registro por
  `(sample_id, horizon_s)`, com `outcome in {realized, miss, censored}`.
  O resolver cria labels para candidates limpos. No foreground, isso inclui
  `sample_decision != "accept"`; no background abaixo do threshold visual,
  rejeições limpas entram quando selecionadas pelo
  `label_background_decimation_mod` e pelos tiers allowlist/priority
  compartilhados. O decimator físico de raw é separado: storage raw não deve
  alterar a população supervisionada.

`features_t0` não inclui diagnósticos operacionais do book. Volume 24h pode
existir nos streams bruto/aceito como metadado de amostragem/filtro de
qualidade, mas não como feature supervisionada do label.

Horizontes default: `900, 1800, 3600, 7200, 14400, 28800` segundos.

Campos hindsight com prefixo `audit_hindsight_*` são somente auditoria/pesquisa.
Não são target supervisionado principal.

Invariantes do trainer:

- Não tratar `label_sampling_probability = null` como `1.0`. Em dados novos,
  o campo deve carregar a probabilidade conhecida de candidatura
  supervisionada; `null` indica histórico legado ou política sem probabilidade
  materializável. O trainer ainda deve considerar `effective_stride_s`,
  `candidates_in_route_last_24h`, `accepts_in_route_last_24h`,
  `sampling_tier` e `sampling_probability_kind`.
- Não assumir que `runtime_config_hash` é comparável entre streams. Em
  `accepted_samples`/`labeled_trades`, ele versiona a política supervisionada;
  em `raw_samples`, versiona também a persistência física raw.
- Não filtrar cegamente `labeled_trades` por `sample_decision == "accept"`.
  Treino precision-first pode priorizar a cauda aceita, mas calibração de
  recomendações em shadow mode deve avaliar todas as linhas onde
  `policy_metadata.recommendation_kind == "trade"`.
- Usar `label_floor_hits[]` quando o objetivo for estimar
  `P(realize | floor)`. O campo primário `first_exit_ge_label_floor_*` cobre
  apenas o `label_floor_pct` principal. Para treino multi-floor, a ingestão
  deve explodir cada registro para a unidade
  `(sample_id, horizon_s, floor_pct)`, derivando `floor_outcome` por floor.
  Helper canônico:
  `python scanner/scripts/explode_label_floor_hits.py data/ml/labeled_trades -o labeled_floors.jsonl`.
