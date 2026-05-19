# EstimatorOnly Trainer — Forward-Labeled ECDF/KM

Status: fase inicial implementada em `scanner/src/ml/training/estimator_only.rs`.
O binário `scanner/src/bin/ml_train_estimator_only.rs` é apenas wrapper CLI.

## Objetivo

O primeiro trainer do projeto ainda não ativa uma `ExitTargetPolicy` online e
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

Além da superfície probabilística, o trainer gera um replay offline da política
`gross_utility/v0.1.0` no split de teste. Esse replay reconstrói a
`candidate_curve` completa a partir de `p_hit_serving`, aplica gates de
probabilidade/censura/incerteza/tempo e escolhe no máximo um candidato por
`sample_id` apenas para diagnóstico. Ele não reescreve labels, não reduz
floors/horizontes, não altera a coleta e não habilita recomendação em tempo
real.

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
  (`route_serving_monotone_km_shrunk_to_global_pit_state_km`). A superfície KM é
  projetada por curva `(scope, level, entity)` antes da calibração para cumprir
  as restrições naturais: `P_hit` não pode cair quando o horizonte aumenta e
  não pode subir quando o floor fica mais difícil. A projeção usa PAVA
  isotônico ponderado e preserva `p_hit_km_raw`, `p_hit_ci_*_raw`, contagens,
  labels, floors, horizontes e frequência de coleta.
- A probabilidade que alimenta o contrato público é `p_hit_serving`. O trainer
  mantém diagnósticos e readiness por célula `(scope, horizon, floor)`, mas a
  transformação de serving usa um calibrador isotônico pooled por `scope` e só
  aplica quando a célula correspondente tem suporte mínimo. Isso preserva o
  blocker por célula sem deixar calibradores independentes quebrarem a ordem
  natural entre floors/horizontes. `p_hit_calibrated_raw` preserva o valor
  calibrado antes da projeção final.
- No serving/scorecard, a curva completa da oportunidade passa por uma projeção
  final depois de lookup, shrinkage e fallback. Essa é a camada mais próxima do
  contrato: `candidate_curve[].p_hit` e `primary_setup.p_hit` devem sair dessa
  curva final, não de uma célula consultada isoladamente.
- O intervalo publicado acompanha a mesma escala de `p_hit_serving`: o IC
  bootstrap nasce na escala KM, é mapeado pela calibração aplicada e deslocado
  pela projeção final quando necessário. A promoção bloqueia se qualquer linha
  ficar com `p_hit_serving` fora de `p_hit_ci_lower/p_hit_ci_upper`.
- Separação temporal com purge/embargo igual ao maior horizonte por default
  para reduzir leakage por overlap de janelas.
- Sampling metadata (`sampling_probability`, `sampling_probability_kind`,
  `sampling_tier`, `label_sampling_probability`) é auditada e preservada; o
  trainer calcula diagnósticos IPW simples e usa IPCW por Kaplan-Meier para
  censura na calibração e no scorecard. A população fonte não é reduzida: linhas
  censuradas antes do horizonte recebem peso zero no estimando de hit/miss, e
  `n_rows`, `n_predicted`, `n_abstained`, `n_complete`, `n_censored`,
  `ipcw_weight_sum` e `ipcw_effective_n` ficam explícitos nos artefatos.

## Artefatos

O binário grava:

- `estimator_table.jsonl`: superfície de predição elegível por suporte mínimo
  (`min_support`) em rota, estado PIT global e fallback global;
- `dataset_audit.json`: invariantes de schema, floors, horizontes, hashes,
  sampling, split e features PIT. Inclui também um digest supervisionado do
  trainer sobre `sample_id`, `runtime_config_hash`, schema, horizonte, sampling,
  estado PIT usado e o vetor completo de `label_floor_hits[]`; esse digest é
  separado do digest lógico V2 mínimo do storage.
- `scorecard.json`: métricas diagnósticas no teste temporal. Brier, ECE e
  precision-at-threshold são ponderados por IPCW usando um modelo de censura
  ajustado somente no split de teste para avaliação offline. Esse modelo de
  censura não ajusta o calibrador nem altera a probabilidade de serving.
- `calibration_model.json`: calibradores isotônicos (`PAVA`) ajustados somente
  no split temporal de calibração. O ajuste usa PAVA ponderado por IPCW, com
  Kaplan-Meier de censura por `(prediction_scope, horizon_s, floor_pct)` e
  suporte mínimo por `effective_n` ponderado. O scorecard de teste usa a
  probabilidade calibrada somente quando a célula tem suporte mínimo; caso
  contrário, registra fallback cru e bloqueia promoção.
- `scoring_censoring_model.json`: modelo de censura usado exclusivamente para
  ponderar o scorecard no split de teste. Ele reporta `models_ready`,
  `models_not_ready`, sobrevivência no horizonte e exemplos de células sem
  suporte, sem reescrever labels nem mudar a curva pública.
- `bootstrap_interval_audit.json`: auditoria do intervalo de confiança
  `temporal_block_bootstrap_km_percentile_95`, calculado em passe separado
  apenas para as linhas elegíveis do artefato. O passe usa blocos temporais
  determinísticos por horizonte, com largura `max(30 min, horizon_s)`, 128
  réplicas e dedupe próprio. Se alguma linha elegível cair para o IC diagnóstico
  antigo, a promoção fica bloqueada.
- `monotonicity_projection.json`: auditoria da projeção isotônica aplicada ao
  artefato preditivo. Ela registra curvas ajustadas, deltas e exemplos; não
  altera o dataset supervisionado nem remove observações.
- `serving_probability_projection.json`: auditoria da projeção aplicada à
  probabilidade componente de serving (`EstimatorRow.p_hit_serving`). O payload
  público não deve ler esse campo isoladamente: `candidate_curve[].p_hit` vem de
  `ServingCurvePoint.probability`, produzido por lookup rota/PIT/global,
  shrinkage, fallback e projeção da curva 6x6. O artefato separa ajustes feitos
  em células sem calibração aplicada (`raw fallback`); qualquer ajuste desse
  tipo bloqueia promoção, porque indica que uma probabilidade não calibrada
  precisou ser alterada para cumprir a forma monotônica da curva.
- `public_interval_audit.json`: auditoria de contrato que prova que todo
  `p_hit_serving` publicado está dentro de `p_hit_ci_lower/p_hit_ci_upper` após
  calibração e projeção final.
- `serving_monotonicity_audit.json`: auditoria standalone da monotonicidade da
  probabilidade pública de serving, além da cópia embutida no manifest.
- `exit_policy_replay.json`: replay offline da `ExitTargetPolicy` diagnóstica
  sobre o split de teste. Ele usa a curva final de serving (`p_hit_serving`) por
  6 floors x 6 horizontes, calcula `exit_target_pct = gross_floor_pct -
  entry_locked_pct`, aplica os gates versionados e mede realized/miss/censored
  do candidato escolhido contra o vetor multi-floor real de `labeled_trades`.
  O replay faz dedupe por `sample_id` no horizonte canônico de seleção e reporta
  qualquer candidato selecionado que não pôde ser avaliado.
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
- `contract_output_mapping.json`: contrato machine-readable entre o artefato do
  trainer e o payload público `trade_recommendation/v2.3`. Ele declara
  explicitamente que `candidate_curve[].p_hit` deve vir de
  `ServingCurvePoint.probability` após lookup/shrinkage/fallback/projeção, e que
  `primary_setup.p_hit` é apenas o `p_hit` do candidato selecionado pela policy,
  nunca recomputado a partir de `p_hit_km`, `p_hit_calibrated_raw` ou do
  componente agregado `EstimatorRow.p_hit_serving`.
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
- alguma linha elegível não recebeu IC bootstrap/conformal por bloco;
- algum `p_hit_serving` público ficou fora do intervalo público gravado;
- alguma célula `(prediction_scope, horizon_s, floor_pct)` não tem suporte de
  calibração suficiente;
- algum modelo de censura IPCW de calibração ou scorecard estiver ausente ou
  instável;
- o scorecard não tiver linhas com peso IPCW positivo;
- a projeção final de serving ajustou qualquer célula sem calibração aplicada;
- o intervalo de incerteza ainda for diagnóstico.

O próximo marco é fixar o contrato público end-to-end e comparar o
EstimatorOnly contra LightGBM/XGBoost sem misturar corpus incompatível, depois
que uma coleta longa deixar as células 28800s prontas.

## Bloqueios intencionais atuais

A versão `v0.2.0` gera estimadores diagnósticos, mas não deve ser promovida para
recomendação ativa enquanto:

- o intervalo de incerteza tiver fallback diagnóstico em qualquer linha elegível;
- o intervalo público não estiver alinhado com `p_hit_serving`;
- a projeção final de serving precisar ajustar células sem calibração aplicada;
- a auditoria pós-projeção encontrar violação de monotonicidade na curva
  `floor × horizon`, especialmente na probabilidade final de serving;
- alguma célula de calibração de 28800s não tiver suporte mínimo.
