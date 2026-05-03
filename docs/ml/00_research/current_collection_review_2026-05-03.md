---
status: draft
author: codex
date: 2026-05-03
version: 0.1.0
supersedes: null
reviewed_by: null
---

# Revisao da Coleta Atual de Dataset

## Escopo

Esta revisao incorpora o run de coleta que esta em execucao agora e define o
que deve acontecer depois que as janelas minimas de coleta fecharem. Ela nao
declara modelo vencedor. O objetivo e evitar a confusao entre:

- codigo implementado;
- comentarios/roadmap sobre futuro;
- dados que ja existem em disco;
- treino que ainda nao aconteceu.

## Run observado

Auditoria local executada em `2026-05-03T06:08:02-03:00`.

Processo em execucao:

```text
scanner.exe
PID: 14984
start local: 2026-05-02 17:48:43
binario: C:\Users\nicoolas\Pictures\novo sc anner\scanner\target\release\scanner.exe
config: C:\Users\nicoolas\Pictures\novo sc anner\.tmp\smoke-v8-long-config.toml
```

Configuracao ML efetiva do run:

```text
raw_allowlist_symbols = ["BTC-USDT", "ETH-USDT"]
raw_sampling_target_coverage = 0.95
raw_decimation_mod = 10
raw_rerank_interval_s = 300
label_stride_s = 60
label_horizons_s = [900, 1800, 3600, 7200, 14400, 28800]
label_sweeper_interval_s = 10
label_floor_pct = 0.8
label_floors_pct = [0.3, 0.5, 0.8, 1.2, 2.0, 3.0]
recommendation_cooldown_s = 60
parquet.enabled = true
parquet.delete_jsonl_after_success = true
```

Todos os streams auditados estavam no mesmo `runtime_config_hash`:

```text
46f2ce47580bce95
```

Isso e importante: este hash deve ser usado como barreira de compatibilidade
quando houver outros runs com floors, horizontes, stride ou decimacao diferentes.

## Inventario do dataset em disco

Os arquivos estao em `data/ml/*` com rotacao horaria e compactacao Parquet/ZSTD.
No horario corrente havia tres JSONL abertos com tamanho zero, esperado quando a
particao atual ainda nao foi fechada.

| Stream | Arquivos Parquet | Linhas | Bytes | Janela local auditada |
|---|---:|---:|---:|---|
| `raw_samples` | 13 | 11.654.904 | 450.618.182 | `2026-05-02T17:48:48-03:00` -> `2026-05-03T05:59:55-03:00` |
| `accepted_samples` | 12 | 398.964 | 15.916.820 | `2026-05-02T18:14:23-03:00` -> `2026-05-03T05:59:55-03:00` |
| `labeled_trades` | 14 | 564.228 | 64.038.504 | `ts_emit` `2026-05-02T17:48:48-03:00` -> `2026-05-03T05:44:48-03:00` |

Versoes de schema observadas:

| Stream | Schema observado |
|---|---:|
| `raw_samples` | 11 |
| `accepted_samples` | 10 |
| `labeled_trades` | 11 |

Cobertura:

| Stream | Rotas unicas | Simbolos unicos |
|---|---:|---:|
| `raw_samples` | 17.668 | 704 |
| `accepted_samples` | 5.251 | 450 |
| `labeled_trades` | 5.372 | 452 |

## Distribuicao inicial

`raw_samples`:

```text
below_tail=10.936.531
accept=580.974
insufficient_history=137.399
```

`accepted_samples`:

```text
accept=398.964
was_recommended=false: 392.060
was_recommended=true: 6.904
```

`labeled_trades`:

```text
miss=457.628
realized=101.905
censored=4.695
censor_reason=route_dormant para os censurados observados
```

Labels por horizonte no floor primario `0.8%`:

| Horizonte | Realized | Miss | Censored |
|---:|---:|---:|---:|
| 900s | 28.523 | 210.538 | 1.208 |
| 1800s | 24.230 | 120.960 | 927 |
| 3600s | 19.403 | 67.681 | 653 |
| 7200s | 14.794 | 36.172 | 642 |
| 14400s | 10.235 | 17.002 | 639 |
| 28800s | 4.720 | 5.275 | 626 |

`label_floor_hits[]` esta presente para todos os floors configurados. Taxa
bruta inicial de realizacao por floor, agregada sobre a janela ainda curta:

| Floor | Taxa realizada |
|---:|---:|
| 0.3 | 38,51% |
| 0.5 | 28,47% |
| 0.8 | 18,08% |
| 1.2 | 10,43% |
| 2.0 | 5,17% |
| 3.0 | 2,79% |

Essas taxas ainda nao devem ser usadas como performance de modelo. Elas sao
diagnostico de base rate do run parcial.

## Checks estruturais ja observados

- O processo de coleta esta ativo e escrevendo os tres streams esperados.
- Parquet esta habilitado e os JSONL fechados foram removidos apos sucesso.
- `raw_samples`, `accepted_samples` e `labeled_trades` compartilham o mesmo
  `runtime_config_hash`.
- O filtro de familia de estrategia esta coerente com a skill: `sell_market`
  observado e sempre `FUTURES`; nao apareceu SPOT/SPOT no dataset auditado.
- O sanity check de identidade instantanea passou em `raw_samples` e
  `accepted_samples`: `entry_spread + exit_spread > 1e-4` ocorreu zero vezes.
- `labeled_trades` ja possui `realized`, `miss` e `censored`, com censura
  explicitamente separada de miss.
- `prediction_p_hit` esta nulo em 100% dos labels, como esperado no
  `BaselineA3` degradado.
- `policy_metadata.prediction_calibration_status` esta `not_applicable` para
  abstencoes e `degraded` para trades do baseline.
- `effective_stride_s` esta escalando por horizonte:
  `90, 180, 360, 720, 1440, 2880`.

## Metricas live do processo

Consulta local a `http://127.0.0.1:8000/metrics` por volta de
`2026-05-03T06:12:16-03:00` confirmou que o processo continua ativo e que nao
ha backpressure reportado nos writers:

```text
ml_raw_samples_emitted_total = 11.759.742
ml_raw_samples_dropped_total{channel_full,channel_closed} = 0
ml_accepted_samples_dropped_total{channel_full,channel_closed} = 0
ml_labels_created_total = 376.887
ml_labels_written_total{realized} = 103.714
ml_labels_written_total{miss} = 464.630
ml_labels_written_total{censored} = 4.755
ml_labels_dropped_writer_total{channel_full,channel_closed} = 0
ml_labels_dropped_capacity_total = 0
ml_calibration_observations = 0
```

Os contadores live podem ficar ligeiramente a frente da auditoria Parquet,
porque incluem atividade apos o corte da leitura e registros ainda no fluxo de
writer/particao corrente. Para manifesto final do run, usar ambos: metricas
live para drops/backpressure e Parquet fechado para reproducibilidade.

## Como o pipeline atual realmente funciona

Fluxo implementado:

```text
order books -> spread::engine
  -> filtra familias invalidas, low volume e outliers
  -> calcula entry_spread e exit_spread
  -> chama ML observer inclusive abaixo do threshold de UI

MlServer::on_opportunity
  -> registra lifecycle da rota
  -> avalia clean_data e SamplingTrigger
  -> decide RawSample tier/decimation
  -> emite RawSample pre-trigger quando o decimator aprova
  -> emite recomendacao BaselineA3 com cache point-in-time anterior
  -> calcula FeaturesT0 antes de atualizar cache
  -> atualiza HotQueryCache apenas se a observacao e limpa
  -> envia observacao limpa ao LabelResolver
  -> grava AcceptedSample se SampleDecision == accept
  -> cria PendingLabel para candidatos limpos, com stride por rota/horizonte

LabelResolver
  -> atualiza first-hit com exit_spread futuro dentro da janela
  -> fecha horizontes vencidos como realized/miss
  -> censura rota dormente/delistada antes do deadline
  -> escreve um LabeledTrade por (sample_id, horizon_s)
```

O ponto crucial: `accepted_samples` e `labeled_trades` nao sao o mesmo universo.
`accepted_samples` e captura integral dos `Accept`. `labeled_trades` e o stream
supervisionado com stride por rota/horizonte e inclui tambem
`sample_decision != accept` para calibrar abstenção/background.

## Presente vs futuro no codigo

Implementado agora:

- scanner Rust;
- dataset Parquet/JSONL dos tres streams;
- labels forward-looking multi-horizonte e multi-floor;
- censura explicita;
- `BaselineA3` ECDF online degradado;
- checks estruturais de leakage/invariantes;
- contrato `TradeSetup` com campos finais.

Nao implementado ainda:

- treino de modelo;
- `ForwardLabeledEcdfBaseline` usando `labeled_trades`;
- CatBoost/LightGBM/XGBoost;
- QRF/CQR;
- survival/RSF/XGBoost AFT;
- artefato de modelo;
- serving de modelo treinado;
- conformal/calibracao empirica pos-treino.

Comentarios como "modelo A2 composta", "Python trainer em Marco 2" ou
"QRF + CatBoost + RSF via tract ONNX" devem ser lidos como roadmap/hipotese,
nao como decisao final.

## Maturidade do run atual

No momento auditado, a coleta tinha cerca de 12h desde a primeira linha bruta.
Isso e suficiente para auditoria estrutural e smoke de labels, mas ainda e
insuficiente para escolher modelo final.

Interpretação por marco:

| Marco de dados | O que pode ser feito |
|---|---|
| < 24h | QA estrutural, schema, sanity checks, contagens, labels chegando |
| 24h+ | primeira auditoria de janelas 24h e features PIT; ainda sem decisao final |
| 48-72h | primeiro treino exploratorio do `M0_FL_ECDF` em horizontes curtos/medios, com holdout temporal |
| 7d+ | features 7d começam a ter cobertura real; comparar GBDT challengers com mais seriedade |
| 21-30d | calibracao temporal, coverage/conformal e shadow mais defensaveis |
| 60-90d | janela alinhada ao `train_window_days=90`; torneio de candidatos mais robusto |

## Proximos passos apos finalizar as coletas

### 1. Congelar manifesto do run

Registrar:

- inicio/fim local e UTC;
- PID/comando/config usada;
- git SHA do scanner;
- hash de config `46f2ce47580bce95`;
- versoes de schema;
- contagens por stream, dia, hora, rota, venue e market pair.

Sem manifesto, comparar runs vira comparacao de configs misturadas.

### 2. Executar auditoria de dataset antes de qualquer treino

Checks minimos:

- contagem por `horizon_s`, `label_floor_pct` e `label_floor_hits[]`;
- outcomes por rota/venue/market pair;
- fracao de censura por rota/venue e motivo;
- cobertura temporal real de `features_t0.oldest_cache_ts_ns`;
- verificacao de `entry_spread + exit_spread <= 0` em raw/accepted;
- monotonicidade empirica por horizonte/floor;
- checagem de que `audit_hindsight_*` nao entra como feature/target principal;
- estimativa de `n_eff` apos stride e autocorrelacao;
- relatorio de labels pendentes no fim do run.

### 3. Primeiro candidato: `M0_FL_ECDF`

O primeiro treino defensavel nao deve ser GBDT direto. Deve ser um ECDF
forward-labeled sobre `labeled_trades`, por rota/horizonte/floor, com:

- censura tratada ou auditada explicitamente;
- shrinkage para cluster/venue quando `n_eff` por rota for baixo;
- split temporal com purge/embargo pelo maior horizonte usado;
- calibracao temporal e reliability diagram;
- abstencao quando `n_eff` ou coverage forem fracos.

Esse baseline e o candidato a ser batido. Se ele ja entregar precision e
calibracao melhores que modelos complexos, ele deve continuar como baseline
produtivo.

### 4. Challengers so depois do baseline forte

Depois que `M0_FL_ECDF` existir:

- CatBoost/LightGBM/XGBoost para `P(realize | features_t0, horizon, floor)`;
- QRF ou LightGBM quantile + CQR para quantis de `exit`/lucro bruto;
- hazard discreto primeiro para `T`, com RSF/XGBoost AFT como comparacao;
- conformal/calibracao sobre holdout temporal;
- LOVO por venue e scorecard precision-first.

O criterio nao e AUC isolada. O candidato precisa vencer em precision@k,
Brier/ECE por horizonte/floor, coverage dos intervalos, robustez a censura e
serving dentro do budget Rust.

### 5. Nao promover se os gates falharem

Se o dataset ainda estiver curto, enviesado por run parcial, com censura
informativa dominante ou sem `n_eff` suficiente por rota/horizonte/floor, a
decisao correta e:

```text
nao treinar modelo final; continuar coletando; manter BaselineA3 degradado
```

## Decisao operacional atual

Com base na coleta observada ate `2026-05-03T06:08:02-03:00`:

```text
dataset_ready_for_structural_audit = true
dataset_ready_for_first_exploratory_training = not_yet
dataset_ready_for_model_selection = false
production_model_selected = false
```

O proximo passo real, quando a coleta completar pelo menos 24h e idealmente
48-72h, e congelar o manifesto e rodar a Fase 0 do protocolo de selecao de
candidatos antes de qualquer treino.
