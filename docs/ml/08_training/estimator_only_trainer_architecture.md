# EstimatorOnly Trainer — Forward-Labeled ECDF/KM

Status: fase inicial implementada em `scanner/src/ml/training/estimator_only.rs`.
O binário `scanner/src/bin/ml_train_estimator_only.rs` é apenas wrapper CLI.

## Objetivo

O primeiro trainer do projeto não escolhe ainda uma `ExitTargetPolicy` final e
não treina um GBDT. Ele estima a curva supervisionada:

```text
P_hit, P_censor, T_hit condicional aos realized dentro do horizonte, e IC por
(population_scope, aggregation_level, entity_key, horizon_s, floor_pct)
```

Isso segue o contrato final `trade_recommendation_output_contract_v2_3.json`.
Quando houver conflito entre esse contrato e `CLAUDE.md`, o contrato v2.3 tem
precedência para o formato/semântica de saída; `CLAUDE.md` permanece como guia
conceitual do paradoxo de entrada/saída:

- `entry_locked_pct` é a entrada observada em `t0`, imutável;
- o evento futuro é first-hit de `S_saida(t)`;
- `label_floor_hits[]` é a unidade multi-floor obrigatória;
- `censored` é categoria de primeira ordem;
- raw/accepted não são fonte de label supervisionado;
- fees, funding, slippage, size, margin, fill, stop e PnL líquido ficam fora.

## Fontes estatísticas usadas

- Kaplan-Meier produto-limite para observações incompletas: o estimador base
  para `P_hit` sob censura à direita.
- Greenwood/log-log para intervalo diagnóstico de sobrevivência, convertido
  para intervalo de `P_hit`.
- Bins PIT globais (`pit_state_bucket/v2`) derivados de `entry_rank_percentile_24h`,
  posição do `exit_target = floor_pct - entry_locked_pct` contra
  `exit_p25/p50/p75/p95_24h`, `exit_start_pct` e `time_alive_at_t0_s`.
  O bucket de saída é específico ao `floor_pct` da curva avaliada; ele não
  reutiliza a feature do floor primário.
- Predição diagnóstica por shrinkage rota -> estado PIT -> global
  (`route_monotone_km_shrunk_to_global_pit_state_km`). A superfície KM é
  projetada por curva `(scope, level, entity)` antes da calibração para cumprir
  as restrições naturais: `P_hit` não pode cair quando o horizonte aumenta e
  não pode subir quando o floor fica mais difícil. A projeção usa PAVA
  isotônico ponderado e preserva `p_hit_km_raw`, `p_hit_ci_*_raw`, contagens,
  labels, floors, horizontes e frequência de coleta.
- Separação temporal com purge/embargo igual ao maior horizonte por default
  para reduzir leakage por overlap de janelas.
- Sampling metadata (`sampling_probability`, `sampling_probability_kind`,
  `sampling_tier`, `label_sampling_probability`) é auditada e preservada; o
  trainer calcula diagnósticos IPW simples, mas ainda bloqueia promoção quando
  o dataset/split não é maduro o bastante.

## Artefatos

O binário grava:

- `estimator_table.jsonl`: superfície de predição elegível por suporte mínimo
  (`min_support`) em rota, estado PIT global e fallback global;
- `dataset_audit.json`: invariantes de schema, floors, horizontes, hashes,
  sampling, split e features PIT. Inclui também um digest supervisionado do
  trainer sobre `sample_id`, `runtime_config_hash`, schema, horizonte, sampling,
  estado PIT usado e o vetor completo de `label_floor_hits[]`; esse digest é
  separado do digest lógico V2 mínimo do storage.
- `scorecard.json`: métricas diagnósticas no teste temporal;
- `calibration_model.json`: calibradores isotônicos (`PAVA`) ajustados somente
  no split temporal de calibração, usando casos completos, por célula
  `(prediction_scope, horizon_s, floor_pct)`. O scorecard de teste usa a
  probabilidade calibrada somente quando a célula tem suporte mínimo; caso
  contrário, registra fallback cru e bloqueia promoção.
- `monotonicity_projection.json`: auditoria da projeção isotônica aplicada ao
  artefato preditivo. Ela registra curvas ajustadas, deltas e exemplos; não
  altera o dataset supervisionado nem remove observações.
- `trainer_manifest.json`: fingerprint do treino e blockers de promoção.
  Inclui também `aggregate_build_stats`, com contagem dos agregados descartados
  por baixo suporte. Esses agregados não são apagados do dataset fonte; eles
  apenas não entram no artefato preditivo porque o próprio índice não os usaria.
- `duplicate_audit.json`: auditoria e dedupe determinístico da linha
  supervisionada `(sample_id, horizon_s)` com fingerprint do vetor completo de
  6 floors. Como `label_floor_hits[]` é obrigatório e completo, isso equivale
  ao dedupe por `(sample_id, horizon_s, floor_pct)` para a estatística de treino
  com bem menos memória. Duplicatas exatas são ignoradas; conflitos viram
  blocker de promoção.
- `corpus_manifest.json`: contrato do corpus consumido, com manifestos V2,
  versões de `sample_id`, política de route-dim, horizontes/floors esperados e
  digests dos manifestos fonte.
- `sources.jsonl`: manifestos V2 consumidos, digests, versões e contagens.
- `_SUCCESS`: marcador escrito apenas depois da publicação dos artefatos.

## Comando

Smoke test:

```powershell
cargo run --manifest-path scanner/Cargo.toml --bin ml_train_estimator_only -- --input data/ml_v2/labeled_trades --max-manifests 2 --out-dir scanner/target/ml_trainer_smoke
```

Treino diagnóstico completo:

```powershell
cargo run --release --manifest-path scanner/Cargo.toml --bin ml_train_estimator_only -- --input data/ml_v2/labeled_trades
```

## Critério de promoção

Com ~24h de dados, o resultado esperado ainda é diagnóstico. O manifest deve
manter `promotion_allowed=false` quando:

- o split temporal não suporta purge/embargo completo com teste maduro;
- há mais de um `runtime_config_hash` supervisionado;
- há qualquer issue de auditoria;
- há conflito de duplicata supervisionada por `(sample_id, horizon_s, floor_pct)`;
- o teste temporal não tem linhas completas suficientes;
- alguma célula `(prediction_scope, horizon_s, floor_pct)` não tem suporte de
  calibração suficiente.

O próximo marco é trocar o IC diagnóstico por bootstrap/conformal por bloco,
avaliar beta/conformal sobre a calibração existente e comparar o EstimatorOnly
contra LightGBM/XGBoost sem misturar corpus incompatível.

## Bloqueios intencionais atuais

A versão `v0.1.0` gera estimadores diagnósticos, mas não deve ser promovida para
recomendação ativa enquanto:

- o intervalo de incerteza ainda não usar bootstrap/conformal por bloco;
- a auditoria pós-projeção ainda encontrar violação de monotonicidade na curva
  `floor × horizon`.
