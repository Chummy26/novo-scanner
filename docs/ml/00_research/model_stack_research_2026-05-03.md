---
status: draft
author: codex
date: 2026-05-03
version: 0.1.0
supersedes: null
reviewed_by: null
---

# Pesquisa de Stack ML para TradeSetup Calibrado

> Nota de status: este relatorio nao declara um vencedor definitivo. Ele
> organiza hipoteses de stack e recomenda a primeira ordem de teste. A escolha
> final deve seguir o protocolo em
> `docs/ml/00_research/model_candidate_selection_protocol_2026-05-03.md`.

## Escopo

Este relatorio separa o que existe hoje no codigo do que aparece como plano
futuro em comentarios, `CLAUDE.md`, skills e prompts de pesquisa. Tambem
consolida uma pesquisa feita em 2026-05-03 usando:

- leitura local de `CLAUDE.md`;
- skills de dominio: `spread-arbitrage-strategy` e `spread-arbitrage-dataset`;
- docs em `docs/ml/`;
- codigo atual em `scanner/src/ml/`, `scanner/src/spread/` e `scanner/Cargo.toml`;
- Paper MCP: buscas em Semantic Scholar, Crossref, OpenAlex, arXiv, SSRN,
  Google Scholar e BASE;
- web search padrao para fontes primarias e docs oficiais.

O objetivo nao e escolher "o modelo de ML mais famoso". O objetivo e escolher
uma pilha que responda, por rota e por instante `t0`, se vale emitir uma
recomendacao bruta de spread:

```text
{enter_now, exit_target, lucro_bruto_alvo, P(realize), T, IC, p_censor}
```

com abstencao quando a evidencia for fraca.

## Resposta curta

Hoje nao existe treino e nao existe modelo final treinado.

O codigo implementado atualmente e:

- scanner Rust de oportunidades cross-venue;
- coleta supervisionada em `raw_samples`, `accepted_samples` e `labeled_trades`;
- labels forward-looking por horizonte/floor com `realized`, `miss` e `censored`;
- `BaselineA3` ECDF operacional, degradado, sem `P` calibrado;
- scaffolding de avaliacao, gates e leakage checks, mas sem folds/model artifacts.

O stack recomendado para o primeiro ciclo real de treino e uma escada:

1. `FL-ECDF`: ECDF forward-labeled por rota/horizonte/floor, com shrinkage por
   clusters de rota quando `n_eff` for baixo, tratamento de censura via
   Kaplan-Meier/IPCW, intervalos Wilson/Jeffreys/bootstrap e calibracao
   temporal/conformal. Este e o baseline forte que deve ser batido.
2. `GBDT-P`: CatBoost/LightGBM/XGBoost como challengers para
   `P(realize | features_t0, horizon, floor)`, calibrados pos-hoc e avaliados
   contra o `FL-ECDF`.
3. `Q/T layer`: QRF ou quantile GBDT + CQR para quantis de `exit`/lucro bruto;
   discrete-time hazard como primeira escolha para `T` e censura; RSF/XGBoost AFT
   como alternativa se a modelagem continua de tempo vencer.
4. `serving`: inferencia Rust. Treino pode ser Rust-native para o baseline e
   prototipagem; Python so deve entrar de forma transitoria para bibliotecas
   que ainda nao tem equivalente Rust robusto, com export/compilacao para
   serving Rust.

Nao recomendo pular direto para "QRF + CatBoost + RSF via ONNX" como stack
final. Isso aparece no codigo como plano futuro A2, nao como decisao provada.
O primeiro modelo promovivel deve ser o `FL-ECDF`; os modelos complexos entram
somente se ganharem em `precision@k`, Brier/ECE, coverage e estabilidade temporal.

## Estado real do codigo

### Implementado agora

| Area | Evidencia local | Estado |
|---|---|---|
| Estrategia | `CLAUDE.md`, skill `spread-arbitrage-strategy` | Cross-exchange convergence/basis arbitrage; SPOT/PERP e PERP/PERP; SPOT/SPOT fora |
| Scanner | `scanner/src/spread/engine.rs` | Calcula `entry_spread` e `exit_spread`; filtra rotas invalidas; envia observacoes ao ML observer |
| Dataset | `scanner/src/ml/persistence/*` | Grava samples e `labeled_trades` |
| Labels | `scanner/src/ml/persistence/label_resolver.rs` | Multi-horizonte; multi-floor; censura explicita; stride por horizonte |
| Baseline atual | `scanner/src/ml/baseline/ecdf.rs` | `BaselineA3` com ECDF online, `p_hit=None`, `p_hit_ci=None`, `CalibStatus::Degraded` |
| Contrato output | `scanner/src/ml/contract.rs` | `TradeSetup` ja tem campos para `P`, IC, quantis de exit/T e `p_censor` |
| Avaliacao | `scanner/src/ml/eval/*` | Invariantes e gates existem, mas sem modelo treinado/folds |
| Dependencias | `scanner/Cargo.toml` | Sem CatBoost, LightGBM, XGBoost, ONNX Runtime, tract, Polars ou trainer ML |

### Futuro/plano em comentario

| Trecho | O que significa |
|---|---|
| `scanner/src/ml/serving.rs` cita "modelo A2 composta (QRF + CatBoost + RSF via tract ONNX)" | Plano/hipotese futura. Nao esta implementado nem treinado. |
| `scanner/src/ml/mod.rs` fala de A2 thread dedicada e CDF unificada | Design-alvo/roadmap, nao modelo real. |
| `scanner/src/ml/persistence/sample.rs` cita "Python trainer em Marco 2" | Comentario de consumo futuro do schema. Nao existe trainer hoje. |
| `plans/ml_stack_research_prompt.md` lista Rust/Python/GBDT/ONNX/QuestDB/etc. | Prompt de pesquisa, nao decisao final aprovada. |
| `docs/ml/11_final_stack/STACK.md` | Ainda e rascunho minimo: consolida coleta supervisionada, nao escolhe algoritmo final. |

Conclusao: qualquer resposta que diga "o projeto ja escolheu CatBoost/LightGBM"
ou "ja existe A2 treinado" esta confundindo plano com implementacao.

## Relacao com a frase do usuario

A frase:

```text
ECDF forward-labeled forte como baseline
+ GBDT/CatBoost/LightGBM/XGBoost para P(realize)
+ CQR/QRF para quantis de exit/lucro bruto
+ survival/RSF ou hazard discreto para T e censura
+ conformal/calibracao
+ split temporal com purge/embargo
```

tem relacao direta com o projeto e esta tecnicamente alinhada, com uma
correcao importante:

- `BaselineA3` atual do codigo nao e esse ECDF forte. Ele e um ECDF online
  degradado, sem `P` calibrado.
- O ECDF forte seria outro componente: usar `labeled_trades` ja resolvidos,
  agrupados por rota/horizonte/floor, respeitando censura e split temporal.
- Esse `FL-ECDF` pode ser competitivo e, em rotas com `n_eff` suficiente,
  pode vencer GBDT por ser menos propenso a overfit, mais auditavel e mais
  alinhado com a heuristica humana T1/T2 da skill.
- GBDT, QRF/CQR e survival entram como challengers, nao como substitutos
  obrigatorios.

Assim, "o externo" esta certo sobre o ECDF atual ser degradado se ele fala do
`BaselineA3`; e "Jason" tambem esta certo se ele fala de ECDF forward-labeled
como baseline forte.

## Formula estatistica do problema

Unidade de decisao:

```text
(route_id, ts_emit_ns, horizon_s, label_floor_pct)
```

Label principal:

```text
realized = exists t1 in (t0, t0 + horizon] such that
           entry_locked_pct(t0) + exit_spread_pct(t1) >= label_floor_pct
```

Outcomes:

- `realized`: first-hit observado dentro do horizonte;
- `miss`: horizonte completo observado sem hit;
- `censored`: rota deixou de ser observavel antes de concluir a janela.

Variaveis que o modelo deve prever:

- `P(realize)`: probabilidade calibrada de `realized`;
- `T`: distribuicao de tempo ate first-hit, com censura;
- `exit_q25/q50/q75` e/ou quantis de lucro bruto;
- `p_censor`;
- abstencao tipada.

Variaveis que nao pertencem ao objetivo central:

- taker fee, maker fee, funding, slippage, position sizing, margem, stop,
  fill parcial, PnL liquido.

Isso e coerente com `CLAUDE.md`: o ML controla risco de recomendacao bruta,
nao execucao completa.

## Evidencia academica por bloco

### 1. Crypto cross-venue e limites a arbitragem

O projeto esta em uma familia real de literatura, mas o regime do codigo e
mais especifico que muitos papers: longtail crypto, cross-venue, SPOT/PERP e
PERP/PERP, sem SPOT/SPOT.

Fontes principais:

- Makarov e Schoar (2020), *Journal of Financial Economics*, documentam
  oportunidades recorrentes de arbitragem entre exchanges cripto. Fonte:
  [FMG/LSE](https://www.fmg.ac.uk/pwc/publications/academic-journals/trading-and-arbitrage-cryptocurrency-markets),
  DOI `10.1016/j.jfineco.2019.07.001`.
- Hautsch, Scheuch e Voigt (2024), *Review of Finance*, mostram que latencia de
  settlement cria limites economicos a arbitragem cross-exchange. Fonte:
  [Oxford Academic](https://academic.oup.com/rof/article/28/4/1345/7609678),
  DOI `10.1093/rof/rfae004`.
- BIS Working Paper 1087 (2023), *Crypto Carry*, caracteriza cash-and-carry em
  cripto e escassez de capital arbitrador. Fonte:
  [BIS](https://www.bis.org/publ/work1087.htm).
- Crepelliere, Pelster e Zeisberger (2023), *Journal of Financial Markets*,
  `Arbitrage in the Market for Cryptocurrencies`. Fonte:
  [Paderborn record](https://ris.uni-paderborn.de/publication/34449),
  DOI `10.1016/j.finmar.2023.100817`.
- `Fundamentals of Perpetual Futures` discute no-arbitrage bounds para perps
  e custos de trading. Fonte: [arXiv](https://arxiv.org/abs/2212.06888).

Implicacao para este projeto:

- nao modelar PnL liquido e aceitavel no contrato atual, mas o modelo nao pode
  otimizar micro-spreads que o operador nunca aceitaria;
- `gross_profit_floor` e hard constraint, nao detalhe de fee;
- rotas longtail exigem drift, censura e abstencao como conceitos centrais.

### 2. Labeling financeiro, leakage e validacao temporal

Fontes principais:

- Lopez de Prado (2018), *Advances in Financial Machine Learning*, Wiley,
  formaliza triple-barrier, meta-labeling, purging e embargo. Fonte:
  [Wiley](https://www.wiley-vch.de/de/fachgebiete/finanzen-wirtschaft-recht/advances-in-financial-machine-learning-978-1-119-48208-6).
- Bailey e Lopez de Prado (2014), *Journal of Portfolio Management*, DSR para
  selecao/overfitting em backtests. Fonte:
  [SSRN](https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID2460551_code87814.pdf?abstractid=2460551&mirid=1).
- Saito e Rehmsmeier (2015), *PLOS ONE*, defendem PR curve sobre ROC em dados
  desbalanceados. Fonte:
  [PLOS ONE](https://journals.plos.org/plosone/article/citation?id=10.1371%2Fjournal.pone.0118432).

Implicacao:

- random split e invalido;
- split deve ser temporal, com purge/embargo pelo maior horizonte e clusters
  de rotas correlacionadas;
- metricas principais: precision@k, AUC-PR, Brier, ECE, coverage, monotonicidade
  por horizonte e LOVO.

### 3. ECDF, KM/IPCW e baseline empirico

Fontes principais:

- Kaplan e Meier (1958), *JASA*, produto-limite para observacoes incompletas.
  Fonte: DOI `10.1080/01621459.1958.10501452`.
- Cox (1972), *JRSS-B*, modelos de regressao e life-tables. Fonte:
  [Stanford PDF](https://web.stanford.edu/~lutian/coursepdf/cox1972paper.pdf).
- IPCW e Brier para sobrevivencia aparecem em avaliacao moderna de survival,
  por exemplo `The Brier Score under Administrative Censoring`, JMLR 2023.
  Fonte: [JMLR PDF](https://www.jmlr.org/papers/volume24/19-1030/19-1030.pdf).

Implicacao:

- censura nao pode virar `miss`;
- `FL-ECDF` deve estimar frequencias por `(route, horizon, floor)` com
  denominador corrigido quando houver censura;
- para `n_eff` baixo, usar shrinkage/partial pooling por cluster:
  `(symbol_family, venue_pair, market_pair, direction)`.

### 4. GBDT para `P(realize)`

Fontes principais:

- XGBoost, Chen e Guestrin (2016), KDD, sistema escalavel de tree boosting.
  Fonte: [KDD PDF](https://www.kdd.org/kdd2016/papers/files/rfp0697-chenAemb.pdf)
  e [arXiv](https://arxiv.org/abs/1603.02754).
- LightGBM, Ke et al. (2017), NeurIPS, GOSS e EFB para eficiencia. Fonte:
  [NeurIPS PDF](https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree.pdf).
- CatBoost, Prokhorenkova et al. (2018), NeurIPS, ordered boosting e tratamento
  de categoricas para reduzir target leakage de encoding. Fonte:
  [NeurIPS](https://papers.neurips.cc/paper/7898-catboost-unbiased-boosting-with-categorical-features).
- `A Closer Look at Deep Learning Methods on Tabular Datasets` avalia 300+
  datasets e mostra que arvores continuam baseline forte para tabular. Fonte:
  [arXiv](https://arxiv.org/abs/2407.00956).

Implicacao:

- dados do projeto sao tabulares, heterogeneos e com categoricas fortes
  (`venue`, `symbol`, `route`, `market_pair`), entao GBDT e candidato natural;
- CatBoost e especialmente atraente para categoricas e leakage de encoding;
- LightGBM e atraente para rapidez e objetivos quantile;
- XGBoost e atraente pela maturidade, AFT survival e tooling de deployment;
- todos precisam calibracao externa, porque score de boosting nao deve ser
  assumido como probabilidade perfeita.

### 5. Calibracao probabilistica

Fontes principais:

- Niculescu-Mizil e Caruana (2005), ICML, mostram distorcoes de probabilidades
  em boosted trees/SVMs e ganhos de calibracao. Fonte:
  [ICML PDF](https://icml.cc/Conferences/2005/proceedings/papers/079_GoodProbabilities_NiculescuMizilCaruana.pdf),
  DOI `10.1145/1102351.1102430`.
- Guo et al. (2017), ICML, temperature scaling para calibracao de redes
  modernas. Fonte: [arXiv](https://arxiv.org/abs/1706.04599) e
  [PMLR PDF](https://proceedings.mlr.press/v70/guo17a/guo17a.pdf).
- Brier (1950), *Monthly Weather Review*, score de previsao probabilistica.
  Fonte: DOI `10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2`.
- Surveys recentes de calibration reforcam reliability diagrams, Brier e ECE.
  Fonte: [Springer Machine Learning survey](https://link.springer.com/article/10.1007/s10994-023-06336-7).

Implicacao:

- `P` emitido pelo modelo deve ser calibrado por fold temporal, horizon e floor;
- Platt/beta/isotonic devem ser testados como calibradores;
- cuidado: LightGBM documenta que `is_unbalance` pode piorar estimativas de
  probabilidade individual. Fonte:
  [LightGBM Parameters](https://lightgbm.readthedocs.io/en/stable/Parameters.html?highlight=metric).

### 6. Quantis de exit/lucro bruto e conformal

Fontes principais:

- Meinshausen (2006), *JMLR*, Quantile Regression Forests. Fonte:
  [JMLR](https://jmlr.org/papers/v7/meinshausen06a.html).
- Romano, Patterson e Candes (2019), NeurIPS, Conformalized Quantile Regression.
  Fonte: [NeurIPS](https://papers.neurips.cc/paper/by-source-2019-1926)
  e [arXiv](https://arxiv.org/abs/1905.03222).
- Angelopoulos e Bates (2023), *Foundations and Trends in ML*, introducao
  pratica de conformal prediction. Fonte:
  [Now Publishers PDF](https://www.nowpublishers.com/article/Download/MAL-101).
- Gibbs e Candes (2021), NeurIPS, adaptive conformal sob distribution shift.
  Fonte: [NeurIPS](https://proceedings.neurips.cc/paper/2021/hash/0d441de75945e5acbc865406fc9a2559-Abstract.html)
  e [arXiv](https://arxiv.org/abs/2106.00170).
- Tibshirani, Barber, Candes e Ramdas (2019), NeurIPS, conformal sob covariate
  shift. Fonte:
  [NeurIPS](https://papers.neurips.cc/paper/8522-conformal-prediction-under-covariate-shift).

Implicacao:

- intervalos de `P`, `exit` e lucro bruto nao devem ser Wald ingenuo;
- CQR e adequado porque os residuos tendem a ser heteroscedasticos por rota,
  venue e regime;
- adaptive/weighted conformal e relevante porque longtail crypto muda de regime.

### 7. T, hazard e survival

Fontes principais:

- Ishwaran et al. (2008), *Annals of Applied Statistics*, Random Survival
  Forests para right-censored data. Fonte:
  [Project Euclid](https://projecteuclid.org/journals/annals-of-applied-statistics/volume-2/issue-3/Random-survival-forests/10.1214/08-AOAS169.short)
  e [arXiv](https://arxiv.org/abs/0811.1645).
- Candes, Lei e Ren (2023), *JRSS-B*, Conformalized Survival Analysis. Fonte:
  [arXiv](https://arxiv.org/abs/2103.09763).
- XGBoost AFT survival objective. Fonte:
  [XGBoost docs](https://xgboost.readthedocs.io/en/release_3.2.0/tutorials/aft_survival_analysis.html)
  e [arXiv implementation paper](https://arxiv.org/abs/2006.04920).
- Discrete-time neural survival models mostram a formulacao por hazard discreto.
  Fonte: [arXiv nnet-survival](https://arxiv.org/abs/1805.00917) e
  [continuous/discrete survival prediction](https://arxiv.org/abs/1910.06724).

Implicacao:

- como o dataset ja e multi-horizonte, hazard discreto por bin temporal e a
  primeira escolha pratica para `T`;
- RSF/XGBoost AFT entram se houver valor em modelar `t_to_first_hit_s` continuo;
- censura precisa aparecer tanto no target quanto nas metricas.

### 8. Streaming quantiles e features point-in-time

Fontes principais:

- Hyndman e Fan (1996), definicoes de quantis amostrais.
- Greenwald e Khanna (2001), summaries de quantis em stream.
- Karnin, Lang e Liberty (2016), KLL sketch.
- Dunning e Ertl (2019), t-digest.

Implicacao:

- `HotQueryCache + hdrhistogram` e aceitavel para serving e MVP;
- treino/auditoria offline deve recalcular quantis de `raw/parquet` com janela
  point-in-time e definicao declarada;
- o erro dos quantis online deve ser auditado antes de virar feature autoritativa.

## Stack recomendado

### Camada 0: dados e features

Recomendado:

- manter coleta Rust atual;
- persistir `raw_samples`, `accepted_samples`, `labeled_trades` em JSONL/Parquet;
- usar Arrow/Parquet ja presentes no `Cargo.toml`;
- adicionar DataFusion ou Polars Rust para treino/auditoria offline quando a
  escala exigir query columnar;
- recalcular features PIT offline a partir do raw:
  `entry_rank`, `entry_p50/p95`, `exit_ecdf`, frequencia de exit acima do target,
  tempo desde listing, cobertura da janela, volume/freshness como qualidade.

Fontes de stack:

- DataFusion e Rust/Arrow query engine com SQL/DataFrame, Parquet/JSON/CSV.
  Fonte: [DataFusion docs](https://datafusion.apache.org/index.html).
- Arrow Rust e implementacao oficial de Arrow/Parquet em Rust. Fonte:
  [arrow-rs GitHub](https://github.com/apache/arrow-rs).

### Modelo 0: FL-ECDF

Nome sugerido:

```text
ForwardLabeledEcdfBaseline
```

Entrada:

```text
route_id, horizon_s, label_floor_pct, entry_rank_24h, entry_now,
exit_target = floor - entry_now, market_pair, venue_pair, n_eff, window_age
```

Estimador:

- por rota/horizonte/floor:
  `P_hat = hits / observed_complete`, com censura corrigida;
- se censura relevante:
  Kaplan-Meier/IPCW por horizonte;
- se `n_eff` baixo:
  shrinkage para cluster de rota;
- intervalo:
  Wilson/Jeffreys ou bootstrap block-aware;
- calibracao:
  reliability por split temporal e conformal para cobertura.

Vantagens:

- explica diretamente os dois testes humanos da skill;
- robusto em baixo sinal/alto ruido;
- evita leakage de categorical target encoding;
- latencia de inferencia trivial em Rust;
- perfeito como baseline que modelos complexos precisam bater.

Risco:

- cold start de rota;
- baixa adaptacao condicional a estados finos de mercado;
- pode falhar em regime shift brusco sem janela/calibracao adaptiva.

Decisao:

```text
Este deve ser o primeiro modelo treinado de verdade.
```

### Modelo 1: GBDT-P

Objetivo:

```text
P(realized within horizon | features_t0, floor, horizon)
```

Candidatos:

| Modelo | Quando faz sentido | Risco |
|---|---|---|
| CatBoost | muitas categoricas: venue, route, symbol, market_pair; ordered boosting reduz leakage de target encoding | ONNX export so suporta features numericas; formato nativo pode ser mais rapido mas integra melhor via bindings/applier |
| LightGBM | velocidade, dataset grande, quantile objective, bom para tabular | cuidado com `is_unbalance`; bindings Rust nao sao oficiais/maduros |
| XGBoost | maturidade, AFT survival, Treelite, tooling solido | categoricas menos convenientes que CatBoost em alguns regimes |
| Logistic/GAM monotone | baseline interpretavel e calibravel | pode underfit non-linearidades de rota |
| Deep learning tabular | so depois de GBDT/ECDF vencerem; nao recomendado agora | alto risco de overfit e baixa interpretabilidade no regime atual |

Calibradores:

- isotonic regression por `(horizon, floor)` quando houver dados;
- Platt/beta calibration quando dados forem menores;
- calibracao separada para tail/accept e background;
- ECE/Brier por fold temporal.

Regra de promocao:

GBDT so entra em serving se bater `FL-ECDF` em:

- `precision@k` ou `precision@threshold`;
- Brier/ECE;
- coverage dos IC;
- estabilidade em LOVO e rotas novas;
- monotonicidade de `P(horizon)` e `P(floor)`.

### Modelo 2: quantis de exit/lucro

Objetivo:

```text
Q(exit_spread_future | x, horizon) ou Q(max_gross_within_horizon | x)
```

Primeira implementacao:

- `FL-ECDF` de `exit`/gross por rota/horizonte;
- depois QRF ou LightGBM quantile para `q25/q50/q75`;
- CQR sobre os quantis para cobertura.

Cuidados:

- nao usar `audit_hindsight_best_*` como target principal de decisao;
- para quantis, definir se o target e first-hit, best observed audit ou
  distribuicao de exit condicional. Para decisao operacional, o mais seguro e
  modelar o evento de first-hit e, separadamente, quantis de resultado observado
  dentro de politica definida.

### Modelo 3: tempo ate hit e censura

Primeira escolha:

```text
discrete-time hazard
```

Por que:

- labels ja existem por horizontes discretos;
- produz curva de sobrevivencia/hazard por bin;
- trata censura naturalmente;
- e simples de calibrar e auditar.

Alternativas:

- RSF para baseline nao-parametrico de survival;
- XGBoost AFT para tempo continuo censurado;
- Cox somente como baseline, porque proporcional hazards pode ser restritivo.

Saida recomendada:

- `t_hit_p25_s`;
- `t_hit_median_s`;
- `t_hit_p75_s`;
- opcionalmente `t_hit_p95_s`;
- `p_censor`.

Evitar:

- media simples de T como unico numero. Distribuicao de first-passage em cripto
  provavelmente e cauda pesada.

### Camada de abstencao

Abstencao nao deve ser um boolean generico. Ela deve preservar causa:

- `INSUFFICIENT_HISTORY`;
- `LOW_CONFIDENCE`;
- `NO_OPPORTUNITY`;
- `HIGH_CENSOR_RISK`;
- `REGIME_SHIFT`;
- `MODEL_DEGRADED`.

Isso esta alinhado com o contrato atual de `AbstainReason`.

## Rust/Python/serving

### O que deve ficar Rust

- scanner e hot path;
- `FL-ECDF`;
- feature lookup online;
- calibracao simples e conformal;
- abstencao;
- serving do modelo promovido;
- metricas e circuit breakers.

### Onde Python pode ser aceito temporariamente

Python e aceitavel para prototipar treino offline de:

- CatBoost;
- LightGBM;
- XGBoost;
- QRF/CQR;
- RSF/scikit-survival.

Justificativa:

- ecossistema Rust puro ainda nao tem a mesma maturidade para survival, QRF/CQR
  e GBDT calibrado com todo o tooling de validacao;
- inferencia nao precisa ser Python;
- o projeto ja tem restricao Rust-default, entao Python deve ser ponte de
  pesquisa, nao dependencia critica do scanner.

### Caminhos de inferencia

| Caminho | Status recomendado |
|---|---|
| `FL-ECDF` puro Rust | Melhor para Marco 1 |
| CatBoost native/Rust applier | Bom candidato se CatBoost vencer; docs oficiais citam Rust |
| CatBoost ONNX-ML | Cuidado: docs oficiais dizem que ONNX suporta so features numericas e pode ser mais lento que formato nativo |
| LightGBM/XGBoost via bindings Rust | Possivel, mas exige avaliar maturidade dos crates |
| Treelite | Forte para serving de tree ensembles; docs citam 2-6x throughput e runtime Rust |
| tract ONNX | Bom para ONNX neural/tensor, mas ONNX-ML/tree ensembles podem ser limitantes; docs citam ~85% dos backend tests ONNX |
| ONNX Runtime via `ort`/bindings | Mais robusto que tract, mas adiciona dependencia externa |

Fontes:

- CatBoost ONNX-ML: [CatBoost docs](https://catboost.ai/docs/en/concepts/apply-onnx-ml).
- CatBoost Rust: [CatBoost docs](https://catboost.ai/docs/en/concepts/apply-rust).
- Treelite: [docs](https://treelite.readthedocs.io/en/2.2.2/).
- tract: [GitHub](https://github.com/sonos/tract).
- ONNX Runtime Rust wrapper: [docs.rs](https://docs.rs/onnxruntime/latest/onnxruntime/).
- SmartCore: [official docs](https://smartcorelib.org/user_guide/quick_start.html).
- Linfa ensemble: [docs.rs](https://docs.rs/linfa-ensemble).

## Validacao obrigatoria

Splits:

- temporal walk-forward;
- purge pelo maior horizonte efetivo;
- embargo apos cutoff;
- cluster por `canonical_symbol`/venue-pair quando rotas irmaos se movem juntas;
- LOVO para venue holdout quando houver amostra suficiente.

Metricas:

- `precision@10`, `precision@k`, `precision@threshold`;
- AUC-PR, nao somente ROC;
- Brier;
- ECE e reliability diagram;
- coverage dos IC/conformal;
- pinball loss para quantis;
- C-index/IBS/IPCW-Brier para survival quando aplicavel;
- monotonicidade:
  `P(realize@15m) <= P(realize@30m) <= ...`
  e `P(realize@floor alto) <= P(realize@floor baixo)`;
- taxa de abstencao e motivo de abstencao;
- metricas por rota, venue, market-pair, symbol cluster e regime.

Gates iniciais sugeridos:

| Gate | Proposta |
|---|---|
| Dados minimos | 48-72h para treino inicial; 7d para features 7d; ideal 21-90d para calibracao mais seria |
| A3 atual | Nunca promover como `P` final; apenas baseline degradado/diagnostico |
| FL-ECDF | precisa `p_hit`, IC e calibracao temporal minima |
| GBDT | precisa bater FL-ECDF em precision e calibracao sem piorar coverage |
| Survival | precisa melhorar estimativa de T/censura vs KM/hazard discreto |
| Serving | p99 dentro do budget; falha vira abstencao/degraded |

## Plano em marcos

### Marco 1: baseline treinavel

Implementar `ForwardLabeledEcdfBaseline` offline e/ou Rust-native:

- ler `labeled_trades`;
- agrupar por rota/horizonte/floor;
- tratar censura;
- calcular `P`, IC, `p_censor`, T empirico;
- validar em split temporal;
- escrever model card.

Saida esperada:

```text
source_kind = Baseline
calibration_status = Ok/Warning/Degraded conforme gates
p_hit != None quando ha evidencia suficiente
```

### Marco 2: challengers GBDT

Treinar:

- CatBoost para `P(realize)`;
- LightGBM/XGBoost como comparacao;
- calibradores pos-hoc;
- QRF/LightGBM quantile para exit/gross;
- hazard discreto para T.

Promover apenas se bater o Marco 1.

### Marco 3: serving e shadow

- escolher formato de inference Rust;
- rodar shadow mode 30-60 dias;
- monitorar ECE/precision/coverage;
- kill switch por degradacao;
- comparar recomendacoes vs outcomes reais.

## Hipotese recomendada hoje

Modelo candidato obrigatorio para o proximo treino real:

```text
Forward-labeled ECDF baseline com censura + calibracao/conformal.
```

Stack de treino inicial:

```text
Rust + Arrow/Parquet + DataFusion/Polars para dados
ECDF/KM/IPCW/Wilson-bootstrap/conformal implementavel em Rust
split temporal com purge/embargo
metricas precision-first
```

Stack challenger:

```text
CatBoost/LightGBM/XGBoost para P(realize)
QRF ou LightGBM quantile + CQR para quantis
hazard discreto primeiro; RSF/XGBoost AFT se vencerem em T/censura
serving Rust via native applier, Treelite, bindings ou ONNX/ORT conforme benchmark
```

Nao escolher agora como final definitivo:

```text
QRF + CatBoost + RSF via tract ONNX
```

porque isso ainda e desenho futuro sem treino, sem benchmark local, sem validacao
temporal e sem prova contra `FL-ECDF`.

## Lista de referencias usadas ou triadas

### Cripto/arbitragem

- Makarov, I.; Schoar, A. (2020). *Trading and arbitrage in cryptocurrency markets*. JFE. [Link](https://www.fmg.ac.uk/pwc/publications/academic-journals/trading-and-arbitrage-cryptocurrency-markets)
- Hautsch, N.; Scheuch, C.; Voigt, S. (2024). *Building trust takes time: limits to arbitrage for blockchain-based assets*. Review of Finance. [Link](https://academic.oup.com/rof/article/28/4/1345/7609678)
- BIS Working Paper 1087 (2023). *Crypto Carry*. [Link](https://www.bis.org/publ/work1087.htm)
- Crepelliere, T.; Pelster, M.; Zeisberger, S. (2023). *Arbitrage in the Market for Cryptocurrencies*. JFM. [Link](https://ris.uni-paderborn.de/publication/34449)
- *Fundamentals of Perpetual Futures*. [arXiv](https://arxiv.org/abs/2212.06888)

### Financial ML/evaluation

- Lopez de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley. [Link](https://www.wiley-vch.de/de/fachgebiete/finanzen-wirtschaft-recht/advances-in-financial-machine-learning-978-1-119-48208-6)
- Bailey, D.; Lopez de Prado, M. (2014). *The Deflated Sharpe Ratio*. JPM. [SSRN](https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID2460551_code87814.pdf?abstractid=2460551&mirid=1)
- Saito, T.; Rehmsmeier, M. (2015). *The Precision-Recall Plot Is More Informative than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets*. PLOS ONE. [Link](https://journals.plos.org/plosone/article/citation?id=10.1371%2Fjournal.pone.0118432)

### GBDT/tabular

- Chen, T.; Guestrin, C. (2016). *XGBoost: A Scalable Tree Boosting System*. KDD. [PDF](https://www.kdd.org/kdd2016/papers/files/rfp0697-chenAemb.pdf)
- Ke, G. et al. (2017). *LightGBM: A Highly Efficient Gradient Boosting Decision Tree*. NeurIPS. [PDF](https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree.pdf)
- Prokhorenkova, L. et al. (2018). *CatBoost: unbiased boosting with categorical features*. NeurIPS. [Link](https://papers.neurips.cc/paper/7898-catboost-unbiased-boosting-with-categorical-features)
- Ye, H.-J. et al. (2024). *A Closer Look at Deep Learning Methods on Tabular Datasets*. [arXiv](https://arxiv.org/abs/2407.00956)
- Duan, T. et al. (2020). *NGBoost: Natural Gradient Boosting for Probabilistic Prediction*. ICML. [PMLR](https://proceedings.mlr.press/v119/duan20a.html)

### Quantis/conformal/calibration

- Meinshausen, N. (2006). *Quantile Regression Forests*. JMLR. [Link](https://jmlr.org/papers/v7/meinshausen06a.html)
- Romano, Y.; Patterson, E.; Candes, E. (2019). *Conformalized Quantile Regression*. NeurIPS. [Link](https://papers.neurips.cc/paper/by-source-2019-1926)
- Angelopoulos, A.; Bates, S. (2023). *Conformal Prediction: A Gentle Introduction*. Foundations and Trends in ML. [PDF](https://www.nowpublishers.com/article/Download/MAL-101)
- Gibbs, I.; Candes, E. (2021). *Adaptive Conformal Inference Under Distribution Shift*. NeurIPS. [Link](https://proceedings.neurips.cc/paper/2021/hash/0d441de75945e5acbc865406fc9a2559-Abstract.html)
- Tibshirani, R.; Barber, R.; Candes, E.; Ramdas, A. (2019). *Conformal Prediction Under Covariate Shift*. NeurIPS. [Link](https://papers.neurips.cc/paper/8522-conformal-prediction-under-covariate-shift)
- Niculescu-Mizil, A.; Caruana, R. (2005). *Predicting Good Probabilities With Supervised Learning*. ICML. [PDF](https://icml.cc/Conferences/2005/proceedings/papers/079_GoodProbabilities_NiculescuMizilCaruana.pdf)
- Guo, C. et al. (2017). *On Calibration of Modern Neural Networks*. ICML. [arXiv](https://arxiv.org/abs/1706.04599)
- Brier, G. (1950). *Verification of Forecasts Expressed in Terms of Probability*. Monthly Weather Review. DOI `10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2`

### Survival/censura

- Kaplan, E.; Meier, P. (1958). *Nonparametric Estimation from Incomplete Observations*. JASA. DOI `10.1080/01621459.1958.10501452`
- Cox, D. (1972). *Regression Models and Life-Tables*. JRSS-B. [PDF](https://web.stanford.edu/~lutian/coursepdf/cox1972paper.pdf)
- Ishwaran, H. et al. (2008). *Random Survival Forests*. Annals of Applied Statistics. [Project Euclid](https://projecteuclid.org/journals/annals-of-applied-statistics/volume-2/issue-3/Random-survival-forests/10.1214/08-AOAS169.short)
- Candes, E.; Lei, L.; Ren, Z. (2023). *Conformalized Survival Analysis*. JRSS-B. [arXiv](https://arxiv.org/abs/2103.09763)
- XGBoost docs. *Survival Analysis with Accelerated Failure Time*. [Link](https://xgboost.readthedocs.io/en/release_3.2.0/tutorials/aft_survival_analysis.html)

### Rust/data/serving

- Apache DataFusion docs. [Link](https://datafusion.apache.org/index.html)
- Apache Arrow Rust implementation. [GitHub](https://github.com/apache/arrow-rs)
- SmartCore docs. [Link](https://smartcorelib.org/user_guide/quick_start.html)
- Linfa ensemble docs. [docs.rs](https://docs.rs/linfa-ensemble)
- CatBoost ONNX docs. [Link](https://catboost.ai/docs/en/concepts/apply-onnx-ml)
- CatBoost Rust docs. [Link](https://catboost.ai/docs/en/concepts/apply-rust)
- Treelite docs. [Link](https://treelite.readthedocs.io/en/2.2.2/)
- tract GitHub. [Link](https://github.com/sonos/tract)
- ONNX Runtime Rust wrapper. [docs.rs](https://docs.rs/onnxruntime/latest/onnxruntime/)
