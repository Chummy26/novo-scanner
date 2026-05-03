---
status: draft
author: codex
date: 2026-05-03
version: 0.1.0
supersedes: null
reviewed_by: null
---

# Protocolo de Selecao de Candidatos de Modelo

## Objetivo

Este documento corrige uma ambiguidade importante: ainda nao existe "modelo
vencedor" para o projeto. Existe uma lista de candidatos plausiveis e um
protocolo para descobrir, com dados locais, qual deles merece servir
`TradeSetup`.

Qualquer documento que diga "stack escolhido" antes dos experimentos deve ser
lido como:

```text
hipotese de stack a testar, nao decisao final de producao
```

O vencedor so pode ser declarado depois de treino, validacao temporal,
calibracao, avaliacao de censura e teste de serving.

## Principio de decisao

O melhor candidato nao e o mais sofisticado. E o menor modelo que:

1. emite menos falsos positivos em oportunidades reais;
2. reporta `P(realize)` calibrado;
3. trata censura sem transforma-la em `miss`;
4. entrega intervalos com coverage empirico;
5. preserva monotonicidade por horizonte/floor;
6. roda no orcamento operacional Rust;
7. vence o baseline forte fora da amostra.

Se nenhum candidato passar os gates, a decisao correta e:

```text
nao promover modelo; manter abstencao/degraded e coletar mais dados
```

## Hipoteses vs decisoes

| Item | Status correto hoje |
|---|---|
| `BaselineA3` atual | Implementado, degradado, sem `P` calibrado |
| `ForwardLabeledEcdfBaseline` | Candidato obrigatorio de baseline forte, ainda nao implementado/treinado |
| CatBoost/LightGBM/XGBoost | Challengers para `P(realize)`, ainda nao treinados |
| QRF/CQR | Challengers para quantis, ainda nao treinados |
| Hazard discreto/RSF/XGBoost AFT | Challengers para `T` e censura, ainda nao treinados |
| `QRF + CatBoost + RSF via tract ONNX` | Ideia futura citada em comentario, nao decisao final |
| Python trainer | Possivel ponte de pesquisa; nao requisito confirmado |
| Serving Rust | Restricao arquitetural preferida |

## Pre-condicoes antes de comparar candidatos

Nao comparar modelos antes de passar estes checks:

- `labeled_trades` existe para todos os horizontes/floors configurados.
- Ha labels suficientes por `horizon_s`, `label_floor_pct`, `market_pair` e
  cluster de rota.
- `realized`, `miss` e `censored` aparecem com contagem auditavel.
- `audit_hindsight_*` nao entra como feature nem target principal.
- Features PIT sao recalculadas ou auditadas contra `raw_samples`.
- Split temporal aplica purge/embargo pelo maior horizonte.
- Censura tem tratamento explicito ou auditoria de descarte documentada.
- O periodo de validacao esta depois do periodo de treino, sem overlap de
  janela de label.

## Ordem do torneio

### Fase 0: auditoria de dados

Saida esperada:

```text
dataset_ready = true/false
```

Checks minimos:

- contagem por stream;
- contagem por outcome;
- contagem por horizonte/floor;
- fracao censurada por rota/venue/market_pair;
- cobertura temporal real;
- taxa de labels pendentes;
- `n_eff` aproximado apos stride/autocorrelacao;
- sanity check da identidade `entry + exit <= 0` no mesmo tick;
- vazamento de features PIT.

Se falhar:

```text
nenhum treino ainda
```

### Fase 1: baseline empirico forte

Candidato obrigatorio:

```text
M0_FL_ECDF
```

Familia:

```text
forward-labeled ECDF + censoring correction + calibration
```

Variantes:

| ID | Descricao |
|---|---|
| `M0a_route_ecdf` | ECDF por rota/horizonte/floor sem pooling |
| `M0b_cluster_shrinkage` | ECDF por rota com shrinkage para cluster |
| `M0c_km_ipcw` | ECDF com Kaplan-Meier/IPCW para censura |
| `M0d_conformal` | `M0c` + conformal/calibracao temporal |

Promocao minima:

- `p_hit` preenchido quando `n_eff >= n_min`;
- IC presente;
- `p_censor` presente;
- coverage empirico aceitavel;
- ECE dentro do gate;
- abstencao quando evidencia insuficiente.

Este modelo e a linha de base oficial. Nenhum GBDT deve ser promovido se nao
vence-lo.

### Fase 2: classificadores para `P(realize)`

Candidatos:

| ID | Familia | Objetivo |
|---|---|---|
| `M1_logistic` | Logistic/GLM calibrado | baseline linear interpretavel |
| `M2_catboost` | CatBoost | categoricas fortes e ordered boosting |
| `M3_lightgbm` | LightGBM | rapidez e comparacao GBDT |
| `M4_xgboost` | XGBoost | maturidade e tooling |
| `M5_pooled_ecdf_plus_gbdt_residual` | ECDF + GBDT residual | combinar prior empirico por rota com features condicionais |

Target:

```text
y = realized dentro de horizon_s para label_floor_pct
```

Tratamento:

- `censored` via IPCW, survival target auxiliar ou exclusao auditada;
- calibracao pos-hoc por fold temporal;
- class weights so se nao degradarem probabilidade calibrada;
- thresholds escolhidos em validacao, nunca no teste.

Promocao:

GBDT precisa ganhar de `M0_FL_ECDF` em pelo menos uma metrica primaria sem
perder nos gates obrigatorios.

### Fase 3: quantis de exit/lucro bruto

Candidatos:

| ID | Familia | Target |
|---|---|---|
| `Q0_empirical` | quantis empiricos por rota/cluster | exit/gross observado sob politica definida |
| `Q1_qrf` | Quantile Regression Forest | distribuicao condicional |
| `Q2_lgbm_quantile` | LightGBM quantile | `q25/q50/q75` |
| `Q3_cqr` | CQR sobre Q1/Q2 | intervalo com coverage |

Regra:

Quantis nao decidem trade sozinhos. Eles enriquecem o `TradeSetup` depois que
`P(realize)` passou nos gates.

### Fase 4: tempo ate hit e censura

Candidatos:

| ID | Familia | Quando vence |
|---|---|---|
| `T0_km` | Kaplan-Meier por rota/cluster | baseline de tempo/censura |
| `T1_discrete_hazard` | hazard discreto por bins de horizonte | primeira escolha pratica |
| `T2_rsf` | Random Survival Forest | se melhora ranking/tempo com censura |
| `T3_xgb_aft` | XGBoost AFT | se tempo continuo censurado for melhor |

Saidas:

- `t_hit_p25_s`;
- `t_hit_median_s`;
- `t_hit_p75_s`;
- `p_censor`.

Gate:

Nao aceitar media de T como unica saida.

## Split oficial

Minimo:

```text
train: passado
calibration: periodo imediatamente posterior ao train
test: periodo posterior ao calibration
purge: maior horizon_s + margem operacional
embargo: >= maior horizon_s
```

Quando houver dados suficientes:

```text
CPCV / purged walk-forward + LOVO
```

Agrupamentos obrigatorios:

- `canonical_symbol`;
- venue envolvida;
- `market_pair`;
- direcao da rota;
- cluster temporal do maior horizonte.

## Metricas de decisao

### Gates obrigatorios

Se falhar qualquer gate, o candidato nao pode ser promovido.

| Gate | Direcao |
|---|---|
| Leakage audit | pass |
| `P` dentro de `[0, 1]` | pass |
| IC contem `P` quando ambos existem | pass |
| `P(realize@h)` monotona em horizonte | pass ou correcao declarada |
| `P(realize@floor)` monotona em floor | pass ou correcao declarada |
| ECE por horizonte/floor | abaixo do limite definido |
| Coverage do IC/conformal | acima do limite definido |
| Precision@k | nao pior que baseline |
| Censura | tratada explicitamente |
| Latencia serving | dentro do budget |

### Metricas primarias

Ranking recomendado:

1. `precision@k` em oportunidades emitidas;
2. ECE e reliability diagram;
3. Brier score;
4. coverage de IC/conformal;
5. AUC-PR;
6. pinball loss para quantis;
7. IPCW-Brier/C-index para survival;
8. taxa de abstencao por motivo.

### Tie-breaks

Se dois candidatos empatam dentro do ruido:

1. menor complexidade;
2. melhor calibracao;
3. maior interpretabilidade;
4. menor dependencia externa;
5. menor latencia;
6. mais facil rollback.

## Scorecard padrao

Preencher uma tabela assim para cada experimento:

| Campo | Valor |
|---|---|
| `candidate_id` |  |
| `dataset_version` |  |
| `feature_version` |  |
| `label_schema_version` |  |
| `train_period` |  |
| `calibration_period` |  |
| `test_period` |  |
| `purge_s` |  |
| `embargo_s` |  |
| `n_train` |  |
| `n_test` |  |
| `n_eff_estimate` |  |
| `censored_rate` |  |
| `precision_at_10` |  |
| `precision_at_threshold` |  |
| `auc_pr` |  |
| `brier` |  |
| `ece` |  |
| `coverage_ic_95` |  |
| `pinball_q50` |  |
| `ipcw_brier` |  |
| `latency_p99_us` |  |
| `abstain_rate` |  |
| `failure_modes` |  |
| `decision` | promote/reject/needs_more_data |

## Criterio para declarar vencedor

Um candidato so vence se:

```text
passes_all_hard_gates = true
AND metricas_primarias >= baseline com margem definida
AND residual_risk documentado
AND serving Rust viavel
```

Margem inicial sugerida contra `M0_FL_ECDF`:

- `precision@10` pelo menos igual e preferencialmente melhor;
- ECE menor ou igual;
- coverage igual ou melhor;
- abstencao nao artificialmente baixa;
- latencia dentro do budget.

Se um modelo complexo melhora AUC-PR mas piora ECE/coverage, ele nao vence para
este projeto. Probabilidade calibrada vale mais que ranking bonito.

## Resultado esperado por maturidade dos dados

| Maturidade de dados | Decisao esperada |
|---|---|
| poucas horas | auditoria estrutural apenas |
| 24h | ECDF diagnostico, sem decisao final |
| 48-72h | primeiro `M0_FL_ECDF` defensavel, ainda fraco |
| 7d | features 7d maduras; comparacao inicial de challengers |
| 21-30d | calibracao mais seria e drift inicial |
| 60-90d | selecao mais confiavel, LOVO/CPCV mais informativos |

## Conclusao operacional

A resposta mais correta hoje e:

```text
O candidato inicial obrigatorio e ForwardLabeledEcdfBaseline.
O melhor candidato final ainda nao e conhecido.
Ele deve ser descoberto por torneio temporal contra ECDF, com censura,
calibracao e serving Rust como gates duros.
```

