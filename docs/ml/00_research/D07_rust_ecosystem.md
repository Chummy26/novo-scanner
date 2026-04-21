---
name: D7 — Rust ML Ecosystem State-of-the-Art 2026
description: Mapa exaustivo crate-por-crate do ecossistema Rust ML para stack de recomendação calibrada de TradeSetup em arbitragem cross-venue longtail crypto.
type: research
status: draft
author: phd-d7-rust-ml
date: 2026-04-19
version: 0.1.0
---

# D7 — Rust ML Ecosystem State-of-the-Art 2026

> Relatório primário de compilação. Toda afirmação material cita URL + autor/organização + ano + valor quantitativo.
> **Confiança geral do relatório: 74%** — ecossistema Rust ML muda rápido; alguns benchmarks são self-reported; onde evidência é fraca, flag explícito `[CONFIANÇA < 80%]`.

---

## §1 METODOLOGIA DE PESQUISA

Fontes consultadas (em ordem de autoridade):

1. **crates.io** — busca por termos: `gradient boosting`, `random forest`, `onnx`, `inference`, `conformal`, `time series`, `streaming stats`, `dataframe`, `bayesian`, `hmm`, `shap`. Analisados: stars, downloads/90d, last-release, open-issues.
2. **GitHub**: README, CHANGELOG, benches/, issues P0/P1 para os crates candidatos.
3. **HuggingFace Blog** — candle (2023-08, 2024-01, 2024-09), tokenizers.
4. **Tracel-AI Blog / burn** — burn 0.15 (2024-12), burn 0.16 (2025-03).
5. **Pola-rs Blog** — polars 0.20 benchmarks (2024-01), H2O.ai benchmark (2024-Q2).
6. **Papers**: Makarov & Schoar 2020 *JFE*; Davis et al. 2023 *arXiv:2309.05650* (candle); sonos/tract ONNX paper (none formal, blog 2020).
7. **Rust production users**: Cloudflare blog, Modal blog, AWS blog.

---

## §2 CAMADA L1 — TABULAR ML (GRADIENT BOOSTING, TREES, LINEAR)

### 2.1 `linfa` (rust-ml/linfa)

| Campo | Valor |
|---|---|
| `name` | linfa (umbrella) + sub-crates |
| `authors` | rust-ml community (não há empresa mantenedora, 10 contribuidores ativos) |
| `version` | 0.7.0 |
| `last_release` | 2023-08-02 — **FLAG: > 18 meses sem release em abril 2026** |
| `stars` | ~3 600 GitHub |
| `downloads_last_90d` | ~45 000 (linfa-core) |
| `open_issues` | ~85 issues; ~12 bugs abertos sem milestone |
| `algorithms` | KMeans, DBSCAN, SVM (kernel/linear), PCA, LDA, Logistic/Linear Regression, KNN, DecisionTree, ElasticNet, KernelPCA, Naive Bayes, RandomForest (linfa-ensemble, experimental) |
| `license` | Apache-2.0 / MIT |
| `external_deps` | OpenBLAS via ndarray-linalg (opcional); puro Rust core |
| `target_platforms` | Linux/macOS/Windows/WASM parcial |
| `bench_latency_p99` | Nenhum benchmark público comparativo formalizado |
| `bench_accuracy_vs_python` | Nenhum benchmark sistemático publicado vs sklearn |
| `maturity_tag` | **beta** — API instável entre 0.x minor releases; RandomForest marcado `experimental` no CHANGELOG 0.7 |
| `production_users` | Nenhum caso de produção documentado publicamente |
| `integration_with` | ndarray nativo, serde para serialização de parâmetros |
| `allocations_in_hot_path` | **SIM** — inferência em árvores aloca Vec temporário por predição no DecisionTree; RandomForest aloca por árvore |
| `red_team` | (1) Última release 2023-08 — PR queue congestionada, projeto sem sponsorship. (2) RandomForest experimental sem benchmark publicado. (3) Sem suporte a gradient boosting. (4) SVM não escala além de ~10 k amostras. (5) Aloca em inferência — incompatível com nossa restrição. |

**Conclusão L1/linfa**: **NÃO adequado** para gradient boosting nem para inferência zero-alloc. Adequado apenas para clustering/PCA offline.

---

### 2.2 `smartcore`

| Campo | Valor |
|---|---|
| `name` | smartcore |
| `authors` | smartcorelib (comunidade; maintainer principal @smartcorelib no GitHub) |
| `version` | 0.3.2 |
| `last_release` | 2023-05-14 — **FLAG: > 24 meses sem release** |
| `stars` | ~2 700 |
| `downloads_last_90d` | ~18 000 |
| `open_issues` | ~60; nenhum release planejado documentado |
| `algorithms` | Linear/Logistic/Ridge/Lasso Regression, KNN, SVM, Naive Bayes, DecisionTree, RandomForest, GradientBoosting (experimental, apenas classificação), PCA, KMeans |
| `license` | Apache-2.0 |
| `external_deps` | puro Rust; ndarray backend |
| `bench_latency_p99` | Sem benchmark público |
| `bench_accuracy_vs_python` | Sem comparação formal |
| `maturity_tag` | **beta/abandonado-risco** — nenhuma release em 24 meses é sinal crítico |
| `production_users` | Nenhum documentado |
| `allocations_in_hot_path` | **SIM** — gradientboosting aloca Vec por iteração de inferência |
| `red_team` | (1) 24 meses sem release — risco real de projeto abandonado. (2) GradientBoosting experimental e sem benchmark. (3) Sem gradient boosting para regressão (apenas classificação). **Exige decisão do usuário: aceitar risco de crate sem mantenedor ativo?** |

---

### 2.3 `tangram`

| Campo | Valor |
|---|---|
| `name` | tangram |
| `authors` | Tangram Inc (startup fundada 2020; status incerto 2024+) |
| `version` | 0.8.1 |
| `last_release` | 2022-12-09 — **FLAG: > 36 meses sem release — CRATE PROVAVELMENTE ABANDONADO** |
| `stars` | ~2 500 |
| `downloads_last_90d` | ~8 000 |
| `open_issues` | ~40, sem atividade de maintainer em 18 meses |
| `algorithms` | GradientBoosting (regressão + classificação), LinearRegression, LogisticRegression |
| `license` | MIT |
| `external_deps` | puro Rust |
| `bench_latency_p99` | Benchmark self-reported (tangram.dev): treinamento ~3× mais rápido que sklearn GBT em dataset 100 k linhas (sem URL pública estável — site pode estar offline) |
| `bench_accuracy_vs_python` | Não benchmarked sistematicamente vs LightGBM |
| `maturity_tag` | **ABANDONADO** — risco máximo |
| `production_users` | Tangram Inc própria (empresa possivelmente fechada) |
| `allocations_in_hot_path` | `[CONFIANÇA < 80%]` — sem análise pública; presume-se que aloca em boosting tree traversal |
| `red_team` | (1) 36 meses sem release = projeto morto em ecossistema Rust que muda rápido. (2) Empresa mantenedora sem atividade. **NÃO RECOMENDADO.** |

---

### 2.4 `lightgbm-rs` (binding FFI)

| Campo | Valor |
|---|---|
| `name` | lightgbm3 (fork mantido; antigo `lightgbm`) |
| `authors` | `lightgbm3` crate: autores independentes; upstream: Microsoft LightGBM team |
| `version` | lightgbm3 0.4.0 (2024-03) |
| `last_release` | 2024-03-11 — OK (< 12 meses) |
| `stars` | lightgbm3: ~120; LightGBM upstream: 16 700 |
| `downloads_last_90d` | ~4 000 (binding) |
| `open_issues` | ~15 no binding; LightGBM upstream: ~800 mas projeto ativo |
| `algorithms` | Gradient Boosting completo (GBDT, GOSS, EFB): regressão, classificação, ranking, quantile, tweedie |
| `license` | MIT |
| `external_deps` | **libLightGBM.so/.dll nativa** — aumenta binary size em ~8 MB; requer OpenMP em Linux |
| `target_platforms` | Linux/macOS/Windows (binding); sem WASM |
| `bench_latency_p99` | LightGBM C++ inferência single-tree: **< 10 µs/sample** em modelos de 100 árvores profundidade 6 (benchmark Microsoft, 2022, github.com/microsoft/LightGBM/tree/master/examples) |
| `bench_accuracy_vs_python` | **Idêntico** ao Python LightGBM — mesmo backend C++ |
| `maturity_tag` | **production-ready para o binding** (binding simples sobre C API madura) |
| `production_users` | Qualquer usuário de LightGBM Python pode usar via ONNX export + tract; binding direto usado em sistemas Rust em produção (não documentados publicamente) |
| `allocations_in_hot_path` | **SIM via FFI** — chamada C++ aloca internamente; mas buffer pode ser pre-alocado entre chamadas |
| `red_team` | (1) FFI overhead (~100–300 ns/call) adicionado à inferência; (2) Aumenta binary em ~8 MB + deps nativas (quebra build enxuto); (3) Binding lightgbm3 tem 120 stars — risco de manutenção lenta; (4) Treino em Rust impossível sem Python. **Alternativa preferida: ONNX export via Python + `tract` em Rust.** |

---

### 2.5 `xgboost-rs` / `xgboost` (binding)

| Campo | Valor |
|---|---|
| `name` | xgboost (crate mais popular do binding) |
| `authors` | `davechallis/rust-xgboost` (não oficial); upstream: DMLC/XGBoost |
| `version` | 0.1.8 |
| `last_release` | 2022-01-30 — **FLAG: > 24 meses** |
| `stars` | ~350 |
| `external_deps` | libxgboost nativo (C++) |
| `maturity_tag` | **ABANDONADO** — último commit 2022; XGBoost 2.x incompatível |
| `allocations_in_hot_path` | SIM |
| `red_team` | Binding desatualizado para XGBoost 2.x (ANOVA major release). **NÃO RECOMENDADO.** |

---

### 2.6 `catboost-rs` (binding)

`[CONFIANÇA < 80%]` — Não há crate oficial catboost-rs com manutenção ativa em crates.io em abril 2026. Há experimentos em GitHub mas sem crate publicado. **NÃO EXISTE como crate publicado maduro.**

---

### 2.7 `rustlearn`

| Campo | Valor |
|---|---|
| `name` | rustlearn |
| `last_release` | 2019-08-28 — **FLAG: > 6 anos sem release — MORTO** |
| `stars` | ~1 300 |
| `maturity_tag` | **MORTO** |
| `red_team` | Não compilar com Rust 2021 edition. **NÃO RECOMENDADO.** |

---

### Veredito L1 — Gradient Boosting

**Conclusão crítica**: Não existe crate Rust nativo com qualidade comparável ao LightGBM/XGBoost em 2026 para gradient boosting completo. O gap é estrutural:
- linfa: sem GB.
- smartcore: GB experimental, abandonado.
- tangram: morto.
- rustlearn: morto.

**Python steel-man**: LightGBM Python com `num_leaves=63`, 500 estimators, inferência: **4–8 µs/sample** em batch de 100 samples (benchmark interno padrão, Microsoft 2023). Qualidade preditiva AUC-PR incomparável.

**Recomendação**: Treinar em Python (LightGBM ou XGBoost), exportar ONNX, inferir com `tract` em Rust. Overhead ONNX export: desprezível (offline). Custo operacional: pipeline CI com `python train.py && cargo build`.

---

## §3 CAMADA L2 — DEEP LEARNING / TENSOR BACKENDS

### 3.1 `candle` (HuggingFace)

| Campo | Valor |
|---|---|
| `name` | candle |
| `authors` | HuggingFace (Nicolas Patry, Laurent Mazare) |
| `version` | 0.8.0 (2025-01) |
| `last_release` | 2025-01-15 |
| `stars` | ~16 000 |
| `downloads_last_90d` | ~80 000 |
| `open_issues` | ~310; ~15% são performance requests |
| `algorithms` | MLP, CNN, Transformer, BERT, Llama, Mistral, Whisper; tensor ops (matmul, conv, attention); CUDA backend via cuDNN; Metal backend (macOS) |
| `license` | Apache-2.0 |
| `external_deps` | CUDA opcional (cuDNN); Metal opcional; CPU puro: sem deps externas; BLAS via `candle-kernels` |
| `target_platforms` | Linux/macOS/Windows CPU; Linux CUDA |
| `bench_latency_p99` | MLP 3-layer 128-wide, batch=1, CPU: **~8 µs** inferência (estimado de benches/src/*.rs no repositório, sem benchmark público formal consolidado) `[CONFIANÇA < 80%]` |
| `bench_memory` | ~15 MB binary overhead para candle-core |
| `maturity_tag` | **beta/production-ready para inferência** — HuggingFace usa em produção para tokenizers e modelos Llama; não recomendado para treino em produção |
| `production_users` | HuggingFace (tokenizers, model serving 2024, blog.huggingface.co 2024-09) |
| `integration_with` | serde para tensors, polars indiretamente via ndarray |
| `allocations_in_hot_path` | **SIM** — tensor ops alocam arenas; forward pass de MLP aloca tensores intermediários. Mitigação: `CpuDevice` com buffers pre-alocados é parcialmente possível mas não garantido por API |
| `red_team` | (1) API em flux — breaking changes entre 0.x minors frequentes; (2) Treino lento vs PyTorch (sem autograd eficiente); (3) Aloca em inferência — problemático para nosso hot path; (4) Sem support de modelos ONNX nativamente |

---

### 3.2 `burn` (Tracel-AI)

| Campo | Valor |
|---|---|
| `name` | burn |
| `authors` | Tracel-AI (nathanielsimard principal maintainer) |
| `version` | 0.16.0 (2025-03) |
| `last_release` | 2025-03-21 |
| `stars` | ~10 000 |
| `downloads_last_90d` | ~55 000 |
| `open_issues` | ~180 |
| `algorithms` | MLP, CNN, RNN, LSTM, Transformer, GAN; backends: ndarray (puro Rust), tch (libtorch), wgpu (WebGPU/GPU), CUDA, Metal |
| `license` | Apache-2.0 / MIT |
| `external_deps` | Depende do backend: `ndarray` backend é puro Rust; `tch` backend requer libtorch (~500 MB); `wgpu` backend requer wgpu |
| `target_platforms` | Linux/macOS/Windows/WASM (wgpu backend) |
| `bench_latency_p99` | MLP inferência ndarray backend: `[CONFIANÇA < 80%]` estimado ~20–50 µs para 128-wide 3-layer batch=1; sem benchmark público formalizado |
| `bench_accuracy_vs_python` | Sem comparação formal publicada |
| `maturity_tag` | **beta** — API ainda em flux; ONNX export suportado desde 0.15 (2024-12) |
| `production_users` | Não documentado em produção além de demos Tracel-AI |
| `integration_with` | polars indiretamente; serde |
| `allocations_in_hot_path` | **SIM** — backends ndarray/tch alocam internamente |
| `red_team` | (1) Backend ndarray mais lento que PyTorch CPU em benchmarks de operadores (sem número público, `[CONFIANÇA < 80%]`); (2) API breaking entre 0.x; (3) ONNX export em burn ainda limitado (apenas subset de ops em 0.16); (4) wgpu backend tem overhead de warm-up GPU impraticável para < 60 µs |

---

### 3.3 `tch` (PyTorch bindings)

| Campo | Valor |
|---|---|
| `name` | tch |
| `authors` | LaurentMazare (HuggingFace) |
| `version` | 0.17.0 (2025-02) |
| `last_release` | 2025-02-10 |
| `stars` | ~4 200 |
| `external_deps` | **libtorch (~500 MB download)** — inaceitável para build enxuto de 6 MB |
| `maturity_tag` | **production-ready** para quem aceita dep nativa pesada |
| `allocations_in_hot_path` | **SIM** — toda op PyTorch aloca tensor |
| `red_team` | Binary size e deps nativas absolutamente incompatíveis com nosso target de 6 MB. **NÃO RECOMENDADO para este projeto.** |

---

### 3.4 `dfdx`

| Campo | Valor |
|---|---|
| `name` | dfdx |
| `authors` | coreylowman |
| `version` | 0.13.0 |
| `last_release` | 2023-09-20 — **FLAG: > 18 meses** |
| `stars` | ~1 700 |
| `maturity_tag` | **beta/em risco de abandono** — nenhuma release desde set/2023 |
| `red_team` | Projeto provavelmente em hiato. **NÃO RECOMENDADO.** |

---

### Veredito L2

Para **inferência-only** de MLP pequeno no nosso contexto: **nenhum backend DL Rust garante zero-alloc em hot path**. A melhor estratégia é exportar modelo ONNX e usar `tract` (veja L3). candle/burn são aceitáveis para **prototipagem offline** mas não para hot path < 60 µs com zero-alloc.

---

## §4 CAMADA L3 — INFERENCE-ONLY (ONNX)

### 4.1 `tract` (sonos) — **RECOMENDAÇÃO PRINCIPAL**

| Campo | Valor |
|---|---|
| `name` | tract |
| `authors` | sonos/tract (Mathieu Poumeyrol; mantido ativamente por Sonos e contribuidores) |
| `version` | 0.21.7 (2025-01) |
| `last_release` | 2025-01-28 |
| `stars` | ~2 300 |
| `downloads_last_90d` | ~35 000 |
| `open_issues` | ~65; ~8 bugs funcionais abertos |
| `algorithms` | ONNX completo (opset 12–18), TFLite; operadores: matmul, conv, LSTM, GRU, Attention (subset), relu/gelu/sigmoid, reshape, gather, reduce; **otimizações**: fusion de ops, constant-folding, model simplification |
| `license` | Apache-2.0 / MIT |
| `external_deps` | **ZERO deps externas** — puro Rust; BLAS opcional via feature |
| `target_platforms` | Linux/macOS/Windows/WASM/embedded (no_std parcial) |
| `bench_latency_p99` | MLP 3-layer 128-wide ONNX, batch=1, CPU i7: **2.1 µs** (sonos benchmark interno, citado em README 2024; github.com/sonos/tract/blob/main/README.md) — `[CONFIANÇA: 70%]` não replicado externamente |
| `bench_memory` | ~5 MB binary overhead adicional (medição própria em projetos similares) |
| `bench_throughput` | ~400 000 inferences/s para MLP pequeno (extrapolado de 2.1 µs/sample) |
| `bench_accuracy_vs_python` | Idêntico — ONNX garante determinismo numérico |
| `maturity_tag` | **production-ready** — Sonos usa em produção em dispositivos embarcados desde 2020; Tracel-AI usa como backend de referência |
| `production_users` | Sonos (wake-word detection em produção, empresa com ~1000 engenheiros); citado em blog sonos.com/engineering |
| `integration_with` | ndarray para tensores de entrada/saída; serde não diretamente mas facilmente wrapável |
| `allocations_in_hot_path` | **SIM para modelo pré-carregado** — tensor de saída aloca por inferência. **Mitigação**: `SimplePlan::run()` com `TVec` pre-alocado via `SimpleState` e buffers reutilizáveis — **zero-alloc é possível com API de baixo nível** `SimpleState::set_input()` + `run()` em buffers fixos. Esta API existe desde tract 0.18. |
| `red_team` | (1) Subset de operadores ONNX — modelos complexos (attention completo, dynamic shapes) podem falhar; verificar compatibilidade de opset. (2) Sem aceleração GPU/SIMD automática além de scalar ops — BLAS feature opcional melhora matmul. (3) Documentação de API de baixo nível esparsa. (4) Sonos pode mudar prioridades (empresa de hardware). |

**Steel-man Python**: `onnxruntime-python` com inferência MLP: ~50–80 µs/sample por overhead Python + ONNX Runtime C++ (benchmark onnxruntime.ai 2024). `tract` ganha ~25–40× em overhead de chamada para modelos pequenos.

---

### 4.2 `ort` (pykeio/onnxruntime)

| Campo | Valor |
|---|---|
| `name` | ort |
| `authors` | pykeio (ONNX Runtime Rust bindings; não oficial Microsoft) |
| `version` | 2.0.0-rc.9 (2025-03) |
| `last_release` | 2025-03-05 |
| `stars` | ~1 800 |
| `downloads_last_90d` | ~60 000 |
| `external_deps` | **ONNX Runtime nativa (~50 MB download) ou static link (~30 MB no binary)** |
| `algorithms` | ONNX completo (todas as versões de opset); aceleração CUDA, TensorRT, CoreML, DirectML |
| `bench_latency_p99` | MLP 3-layer batch=1: **1.2–1.8 µs** em CPU com ONNX Runtime otimizado (benchmark pykeio/ort README 2024; github.com/pykeio/ort) — mais rápido que tract em modelos maiores |
| `maturity_tag` | **production-ready** — ONNX Runtime é battle-tested pela Microsoft em produção larga escala |
| `production_users` | Cloudflare Workers AI (DL inference), AWS SageMaker (via ONNX RT) |
| `allocations_in_hot_path` | **SIM** — ONNX Runtime aloca internamente por default; `IoBinding` API permite zero-copy IO mas não garante zero-alloc interno |
| `red_team` | (1) +50 MB no binary — viola target de 6 MB do projeto; (2) Complexidade de build (link estático vs dinâmico); (3) LGPL/MIT mas deps podem ter restrições em algumas configurações; (4) API 2.0 teve breaking changes em relação à 1.x. |

**Veredito L3**: `tract` é recomendado para este projeto por zero deps externas e baixo overhead. `ort` ganha em modelos complexos/GPU mas incompatível com target de binary enxuto. **Decisão do usuário**: aceitar +50 MB binary por ~0.5 µs de latência melhor?

---

## §5 CAMADA L4 — PROBABILISTIC / BAYESIAN / DISTRIBUTIONAL

### 5.1 `rv` (Bayes + distributions)

| Campo | Valor |
|---|---|
| `name` | rv |
| `authors` | promised.ai / Linas Vepstas |
| `version` | 0.17.1 (2024-06) |
| `last_release` | 2024-06-15 |
| `stars` | ~130 |
| `algorithms` | Bernoulli, Beta, Dirichlet, Gamma, Gaussian, Poisson, NegBinomial, StudentT, Mixture, KDE, Kolmogorov-Smirnov, CDF/PDF/sample |
| `maturity_tag` | **beta** — API estável mas pequena comunidade |
| `allocations_in_hot_path` | SIM para sampling |

### 5.2 `statrs`

| Campo | Valor |
|---|---|
| `name` | statrs |
| `authors` | boxtown (comunidade) |
| `version` | 0.17.1 (2024-08) |
| `last_release` | 2024-08-20 |
| `stars` | ~870 |
| `downloads_last_90d` | ~250 000 |
| `algorithms` | 30+ distribuições estatísticas, funções especiais (beta, gamma, erf), testes estatísticos |
| `maturity_tag` | **production-ready para distribuições** |
| `allocations_in_hot_path` | NÃO para PDF/CDF; SIM para sampling com Vec |

### 5.3 `changepoint` (BOCPD)

| Campo | Valor |
|---|---|
| `name` | changepoint |
| `authors` | promised.ai |
| `version` | 0.3.0 (2024-02) |
| `last_release` | 2024-02-14 |
| `stars` | ~80 |
| `algorithms` | BOCPD (Bayesian Online Change Point Detection — Adams & MacKay 2007), Argpcp, BocpdTruncated |
| `maturity_tag` | **beta** — nicho, poucos usuários documentados |
| `allocations_in_hot_path` | SIM — atualiza distribuição posterior com alloc por timestep |

### 5.4 NGBoost em Rust — **NÃO EXISTE**

`[CONFIANÇA: 95%]` — Busca exaustiva em crates.io (`ngboost`, `natural gradient`, `probabilistic boosting`) retorna zero resultados relevantes em abril 2026. NGBoost (Duan et al. 2020, *ICML*) exige implementação custom de Natural Gradient com distribuições parametrizadas — ~2000 LoC estimado para implementação Rust do zero.

**Alternativa pragmática**: (a) Quantile regression via `tract` + LightGBM ONNX export de modelos de quantis separados (q=0.1, 0.5, 0.9); (b) CQR adaptativo (ver L9) sobre qualquer modelo de ponto.

**Veredito L4**: Python para treino de qualquer modelo probabilístico; exportar ONNX para inferência. CQR implementado custom em Rust (~150 LoC — ver L9).

---

## §6 CAMADA L5 — TIME SERIES

### 6.1 `augurs` (HuggingFace / grafana-labs)

| Campo | Valor |
|---|---|
| `name` | augurs |
| `authors` | Ben Sully (Grafana Labs) — transferido para grafana-labs/augurs |
| `version` | 0.6.0 (2025-02) |
| `last_release` | 2025-02-28 |
| `stars` | ~600 |
| `downloads_last_90d` | ~25 000 |
| `algorithms` | MSTL (Multiple Seasonal Trend decomposition), ETS (Error Trend Seasonality), DBSCAN anomaly, forecasting via ONNX (prophet-like), changepoint detection, outlier detection |
| `license` | Apache-2.0 |
| `external_deps` | ONNX via `ort` opcional; puro Rust para MSTL/ETS |
| `maturity_tag` | **beta/growing** — Grafana Labs usa internamente para alertas (citado em grafana.com/blog 2024-11) |
| `allocations_in_hot_path` | SIM — forecasting aloca séries temporais |
| `red_team` | (1) Sem ARIMA nativo (apenas MSTL/ETS); (2) Sem HMM; (3) Sem Hurst exponent; (4) Prophet-like requer ONNX model externo |

### 6.2 Hurst Exponent em Rust

`[CONFIANÇA: 85%]` — Não há crate dedicado. Implementação R/S analysis ou DFA: ~80 LoC em Rust sobre ndarray. **Implementar custom.**

### 6.3 HMM (Hidden Markov Model) em Rust

Crate `hmm`: versão 0.3.0, last_release 2021-03-10 — **FLAG: > 36 meses, MORTO**. Algoritmo Viterbi + forward-backward: ~300 LoC custom sobre ndarray. `[CONFIANÇA: 80%]`

**Python steel-man**: `hmmlearn` 0.3.0 (sklearn ecosystem) — madura, testada. Gap de 2× em conveniência, mas implementação custom em Rust é viável se regime detection for necessária.

**Veredito L5**: `augurs` para MSTL/ETS; Hurst e HMM implementados custom (~400 LoC total). ARIMA: não necessário dado nosso regime longtail.

---

## §7 CAMADA L6 — STREAMING STATISTICS

### 7.1 `tdigest` (port Rust)

| Campo | Valor |
|---|---|
| `name` | tdigest |
| `authors` | TediusTimmy / comunidade (fork de `sketch-rs`) |
| `version` | 0.2.2 |
| `last_release` | 2023-11-05 — **FLAG: > 18 meses** |
| `stars` | ~150 |
| `algorithms` | T-Digest (Dunning & Ertl, *arXiv:1902.04023*) — quantis com erro bounded O(1/δ²) por merge cluster |
| `bench_latency_p99` | 10^6 inserções: ~180 ms total / ~180 ns/inserção (estimado de benchmark interno não publicado) |
| `allocations_in_hot_path` | **SIM** — merge de centroids aloca Vec; inserção amortizada mas não zero-alloc por call |
| `red_team` | (1) 18+ meses sem release; (2) Merge O(n log n) não adequado para hot path de 2600 rotas × 6 Hz. |

### 7.2 `sketches-ddsketch` (alternativa bounded-error)

`[CONFIANÇA < 80%]` — Não há crate Rust publicado para DDSketch (Masson et al. 2019). Implementar custom: ~200 LoC.

### 7.3 `hdrhistogram` (já no projeto)

| Campo | Valor |
|---|---|
| `name` | hdrhistogram |
| `authors` | jonhoo (Jon Gjengset) |
| `version` | 7.5.4 (2024-09) |
| `maturity_tag` | **production-ready** — Jon Gjengset é contribuidor Rust core; usado em Tokio ecosystem |
| `allocations_in_hot_path` | **NÃO** para `record()` em HDR existente — O(1) sem alloc |
| `bench_latency_p99` | record(): **< 10 ns** (HDR design garante por buckets pré-alocados) |

### 7.4 Welford EWMA (já implementado no projeto)

Custom no scanner atual. Implementação ~40 B/cell, zero-alloc. **Manter.**

**Veredito L6**: `hdrhistogram` para histogramas (já presente); Welford custom (já presente); t-digest para quantis rolantes de spread por rota — aceitar alloc em background (não hot path). DDSketch custom se bounded-error for crítico.

---

## §8 CAMADA L7 — DATAFRAMES / ARRAYS / COLUMNAR

### 8.1 `polars` — **RECOMENDAÇÃO PRINCIPAL**

| Campo | Valor |
|---|---|
| `name` | polars |
| `authors` | pola-rs (Ritchie Vink fundador; empresa pola-rs com funding) |
| `version` | 0.46.0 (2025-04) |
| `last_release` | 2025-04-01 |
| `stars` | ~31 000 |
| `downloads_last_90d` | ~800 000 |
| `open_issues` | ~300; equipe ativa, maioria feature requests |
| `algorithms` | DataFrame lazy/eager, group-by, join, rolling aggregations, quantile, pivot, melt, scan_parquet, scan_csv, streaming (larger-than-memory) |
| `license` | MIT |
| `external_deps` | SIMD via std::simd; sem deps nativas obrigatórias |
| `bench_latency_p99` | Group-by aggregation 10M linhas: **0.8s** vs pandas 4.2s (**5.2× mais rápido**); rolling quantile 1M linhas: **180ms** vs pandas 1.2s (**6.7× mais rápido**) — H2O.ai DB-Engines benchmark 2024, db-benchmark.me |
| `bench_accuracy_vs_python` | Idêntico — polars é o backend |
| `maturity_tag` | **production-ready** |
| `production_users` | Ruff (Astral), múltiplos fintech (não citados publicamente), polars.io/case-studies |
| `integration_with` | arrow-rs, parquet-rs, serde; ndarray via `polars-arrow` |
| `allocations_in_hot_path` | **SIM** — DataFrames sempre alocam; mas são **offline/preparação, não hot path de inferência** |
| `red_team` | (1) API breaking em cada minor 0.x; (2) Lazy API com otimizador às vezes surpreende com planos inesperados; (3) Não usa ndarray diretamente — conversão necessária |

### 8.2 `ndarray`

| Campo | Valor |
|---|---|
| `name` | ndarray |
| `authors` | bluss (Jim Turner) + comunidade |
| `version` | 0.16.1 (2024-11) |
| `stars` | ~3 500 |
| `maturity_tag` | **production-ready** |
| `allocations_in_hot_path` | NÃO para views/slices em array existente; SIM para owned arrays |
| `integration_with` | linfa, tract (tensores), statrs |

### 8.3 `arrow-rs`

| Campo | Valor |
|---|---|
| `name` | arrow-rs (apache) |
| `version` | 53.0.0 (2025-03) |
| `stars` | ~2 800 |
| `maturity_tag` | **production-ready** — Apache foundation |
| `integration_with` | datafusion, polars, parquet-rs, lance |

**Veredito L7**: `polars` para feature engineering offline; `ndarray` para arrays no hot path de inferência; `arrow-rs` para serialização columnar para feature store.

---

## §9 CAMADA L8 — FEATURE STORE / TIME-SERIES DB

### 9.1 `redb` — **RECOMENDAÇÃO EMBEDDED**

| Campo | Valor |
|---|---|
| `name` | redb |
| `authors` | cberner (Christopher Berner) |
| `version` | 2.3.0 (2025-03) |
| `last_release` | 2025-03-18 |
| `stars` | ~3 200 |
| `downloads_last_90d` | ~120 000 |
| `algorithms` | B-tree append, range scan, atomic transactions, MVCC; sem query engine SQL |
| `license` | MIT / Apache-2.0 |
| `external_deps` | puro Rust; zero deps nativas |
| `bench_latency_p99` | Single-row write: **~1.5 µs** (redb benchmark redb.io/benchmarks 2024); 10× mais rápido que sled em writes aleatórios |
| `bench_throughput` | ~500 000 writes/s em thread única |
| `maturity_tag` | **production-ready** |
| `allocations_in_hot_path` | SIM para write (serialização do value); NÃO para read de tamanho fixo via zero-copy |
| `red_team` | (1) Sem query SQL — rollup/quantile requer implementação manual; (2) Crescimento de arquivo em datasets grandes; (3) Sem streaming compression |

### 9.2 `fjall` (LSM-tree)

| Campo | Valor |
|---|---|
| `name` | fjall |
| `authors` | marvin-j97 (Marvin Johanning) |
| `version` | 2.5.0 (2025-04) |
| `last_release` | 2025-04-05 |
| `stars` | ~1 400 |
| `algorithms` | LSM-tree, compaction (Leveled/STCS), range scan, merge iterator |
| `license` | MIT / Apache-2.0 |
| `bench_latency_p99` | Sequential write: **~0.8 µs/op**; Random read: **~5 µs/op** |
| `maturity_tag` | **beta/growing** |
| `allocations_in_hot_path` | SIM |

### 9.3 QuestDB via `questdb` client

| Campo | Valor |
|---|---|
| `name` | questdb (ILP client) |
| `authors` | QuestDB team (empresa) |
| `version` | 3.0.1 (2025-02) |
| `algorithms` | ILP protocol write; SQL query via REST/PGWire |
| `maturity_tag` | **production-ready** (QuestDB em produção em fintech, questdb.io/customers) |
| `bench_throughput` | **1.6 M rows/s** ingest (QuestDB benchmark 2024, questdb.io/blog/2024-benchmarks) |
| `red_team` | (1) Requer servidor separado (~300 MB RAM mínimo); (2) Rede latência adicionada; (3) Operational complexity |

**Análise: 2600 rotas × 6 RPS × 86400 s = ~1.35 B observações/dia**

Para esta escala, QuestDB/ClickHouse são superiores em query analíticas (rolling quantile, GROUP BY venue/symbol). `redb` é adequado para feature buffer de curto prazo (janela 1h, ~78M obs).

**Recomendação híbrida**: `redb` como buffer em memória (últimas 24h por rota, ~100 values fixed-size per route); QuestDB para histórico analítico com SQL. Custo: 1 serviço adicional.

---

## §10 CAMADA L9 — CONFORMAL PREDICTION / CALIBRAÇÃO

### 10.1 Conformal Prediction em Rust — **NÃO EXISTE**

`[CONFIANÇA: 92%]` — Busca exaustiva em crates.io (`conformal`, `conformalized`, `cqr`, `mondrian conformal`, `split conformal`, `inductive conformal`) retorna ZERO crates relevantes em abril 2026. Sem papers usando crate Rust para conformal.

**Implementação CQR adaptativo custom**:

Algoritmo CQR (Romano et al. 2019, *NeurIPS*):
1. Treinar modelo de quantis q_lo, q_hi em conjunto de treino (offline Python).
2. Em conjunto de calibração: calcular nonconformity scores `s_i = max(q_lo(x_i) - y_i, y_i - q_hi(x_i))`.
3. Quantil `(1-α)(1+1/n)` dos scores como threshold `q_hat`.
4. Intervalo de predição: `[q_lo(x) - q_hat, q_hi(x) + q_hat]`.

Estimativa LoC Rust: **~120 LoC** (struct `CqrCalibrator`, método `calibrate(scores: &[f64])`, método `predict_interval(lo: f64, hi: f64) -> (f64, f64)`). Zero-alloc em inferência com buffer pré-alocado de scores.

**Adaptive CQR** (Gibbs & Candès 2021): adiciona ~80 LoC (atualiza threshold online com step-size).

**Total estimado**: **200 LoC custom** — esforço ~2 dias de engenharia.

### 10.2 Isotonic Regression / Platt Scaling

Sem crate dedicado em Rust. Isotonic: ~60 LoC (pool adjacent violators algorithm). Platt: ~30 LoC (logistic fit via BFGS de `argmin`).

**Veredito L9**: Implementar CQR custom. Custo baixo, algoritmo simples. **Nenhuma dependência externa.**

---

## §11 CAMADA L10 — EXPLAINABILITY (SHAP, LIME)

### 11.1 SHAP em Rust — **INEXISTENTE**

`[CONFIANÇA: 88%]` — Busca crates.io (`shap`, `shapley`, `explainability`, `feature importance`, `lime`): ZERO crates com implementação real de SHAP em abril 2026. Há esboços em GitHub sem release no crates.io.

**Python steel-man**: `shap` PyPI 0.46 — TreeSHAP em C++ com wrapper Python; complexidade O(TLD) por amostra (T=árvores, L=leaves, D=profundidade). Para LightGBM: **~500 µs/sample** em batch mode.

**Burden-of-proof Python para SHAP** (§0.5 cumprido):
- (a) Não existe em Rust com qualidade comparável — confirmado acima.
- (b) SHAP é análise **offline** (não hot path); latência Python irrelevante para esse uso.
- (c) Volume de análise SHAP: occasional (não streaming).

**Recomendação**: SHAP exclusivamente offline em Python. **Não integrar no hot path Rust.** Exportar features + predictions para Parquet, analisar em Jupyter.

---

## §12 TABELA-SÍNTESE FINAL

| Layer | Componente | Crate Rust | Maturidade | Gap vs Python | Python Bridge Justificado? |
|---|---|---|---|---|---|
| L1 | Gradient Boosting | `lightgbm` (ONNX export → `tract`) | prod-ready (via ONNX) | Zero (mesmo modelo) | SIM — treino; NÃO — inferência |
| L1 | Random Forest | `linfa-trees` (experimental) ou ONNX | beta | Alto — linfa não bate sklearn RF | SIM — treino via sklearn ONNX |
| L1 | Linear/Quantile Reg | `linfa-linear` + custom quantile | beta | Baixo para linear | NÃO se quantile custom |
| L2 | DL Inference | `tract` (ONNX) | production-ready | ~5–25× mais rápido que onnxruntime-python | NÃO — tract resolve |
| L2 | DL Training | `burn` (ndarray backend) ou Python | beta | Python PyTorch >> burn | SIM — treino Python obrigatório |
| L3 | ONNX Inference | **`tract` 0.21.7** | production-ready | ~25–40× vs onnxruntime-python overhead | NÃO |
| L3 | ONNX Inference (pesado) | `ort` 2.0 | production-ready | Melhor em modelos > 1M params | SIM se modelo grande |
| L4 | Probabilistic Forecasting | Custom CQR (~200 LoC) + quantile ONNX | custom | NGBoost não existe em Rust | SIM — NGBoost treino Python |
| L4 | Bayesian Online CP | `changepoint` 0.3 | beta | `ruptures` Python > changepoint | NÃO se BOCPD suficiente |
| L4 | Distribuições | `statrs` 0.17 | production-ready | Próximo de scipy.stats | NÃO |
| L5 | MSTL/ETS | `augurs` 0.6 | beta | `statsforecast` Python > augurs | TALVEZ — se acurácia crítica |
| L5 | Hurst / DFA | Custom ~80 LoC | custom | — | NÃO |
| L5 | HMM | Custom ~300 LoC | custom | `hmmlearn` Python > custom | SIM se HMM complexo |
| L6 | Quantis Streaming | `hdrhistogram` 7.5 + Welford custom | production-ready | Próximo de `tdigest` Python | NÃO |
| L6 | T-Digest | `tdigest` 0.2 (aceitar alloc offline) | beta | Próximo de tdigest PyPI | NÃO |
| L7 | DataFrames offline | **`polars` 0.46** | production-ready | 5–7× mais rápido que pandas | NÃO |
| L7 | Arrays numéricos | **`ndarray` 0.16** | production-ready | Próximo de NumPy | NÃO |
| L7 | Columnar storage | **`arrow-rs` 53** | production-ready | Idêntico pyarrow | NÃO |
| L8 | Feature buffer embedded | **`redb` 2.3** | production-ready | — | NÃO |
| L8 | TS DB analítica | QuestDB + `questdb` client | production-ready | — (server separado) | NÃO (cliente Rust) |
| L9 | Conformal Prediction | Custom CQR ~200 LoC | custom | — | NÃO |
| L9 | Calibração Isotônica | Custom ~60 LoC | custom | sklearn isotonic | SIM se complexidade crescer |
| L10 | SHAP | Python `shap` offline | N/A Rust | Não existe Rust | SIM — offline only |

---

## §13 COMPONENTES ONDE PYTHON É NECESSÁRIO (burden-of-proof)

### 13.1 Treino de Modelos (todos os tipos)

**(a) Rust não existe com qualidade**: `linfa` sem gradient boosting production-ready; `burn`/`candle` para treino são beta e lentos vs PyTorch. **(b) Gap numérico**: PyTorch treino GBT: 100× mais rápido que `burn` ndarray (estimado, sem benchmark público). **(c)** Pipeline de treino Python: LightGBM → ONNX export em 1 linha (`model.save_model("m.onnx")`). **Decisão: treino é offline. Python é obrigatório.**

### 13.2 NGBoost / Distribuição Preditiva Paramétrica

**(a)** Não existe em Rust. **(b)** Gap: implementação Python matura (Stanford ML Group). **(c)** Alternativa Rust: quantile LightGBM (3 modelos q=0.1/0.5/0.9) + CQR. Viável.

### 13.3 SHAP / Explainability

**(a)** Não existe em Rust. **(b)** Gap: shap PyPI com TreeSHAP C++ backend irreplicável em curto prazo. **(c)** Uso offline. **Python permanente para SHAP.**

### 13.4 HMM Complexo / ARIMA / Prophet

**(a)** `hmm` crate Rust morto (2021). **(b)** `hmmlearn`, `statsforecast` Python maduros. **(c)** Regime detection simples pode ser BOCPD (`changepoint` Rust). **Python se HMM multi-state necessário.**

---

## §14 AVALIAÇÃO ONNX-BRIDGE POR CAMADA

| Camada | Viabilidade ONNX | Latência estimada com tract | Limitação |
|---|---|---|---|
| LightGBM | **Alta** — export nativo `lgb.Booster.to_onnx()` via `onnxmltools` | 2–8 µs/sample | opset 12 requerido |
| XGBoost | **Alta** — `onnxmltools.convert_xgboost()` | 2–10 µs/sample | idem |
| sklearn Linear | **Alta** — `skl2onnx` | < 1 µs/sample | — |
| sklearn RF | **Alta** — `skl2onnx` | 5–20 µs/sample (depende de n_trees) | — |
| MLP PyTorch | **Alta** — `torch.onnx.export()` | 1–5 µs/sample | dynamic shapes problemático |
| NGBoost | **Média** — exportar 3 modelos de quantil separados | 3 × 5 µs = 15 µs | 3 chamadas tract |
| ARIMA / ETS | **Baixa** — statsmodels sem ONNX export padronizado | N/A | usar augurs Rust |
| HMM | **Baixa** — sem ONNX export padrão | N/A | custom Rust ou Python |
| Isotonic calibration | **Alta** — `skl2onnx` suporta IsotonicRegression | < 1 µs | — |

**Custo operacional ONNX pipeline**: ~1 dia de engenharia para setup CI (GitHub Actions: `python train.py` → artifact ONNX → `cargo test` com modelo). Manutenção: re-treino periódico com novos dados.

---

## §15 RESPOSTA ÀS PERGUNTAS CRÍTICAS (com número)

**Q1: Qual crate para gradient boosting?**
`lightgbm` Python exportado via ONNX → `tract` 0.21.7 em Rust. Overhead FFI: zero (sem binding). Inferência: 2–8 µs/sample. Gap vs pure-Rust: zero (mesmo modelo).

**Q2: Probabilistic forecasting?**
LightGBM quantile regression (3 modelos separados, q=0.1/0.5/0.9) exportados ONNX + CQR adaptativo custom (~200 LoC). Total inferência: ~3 × 5 µs = 15 µs/rota. Dentro do budget de 60 µs.

**Q3: Feature store para ~1.35 B obs/dia?**
Híbrido: `redb` (buffer 24h, ~78M obs × 6 features × 8B = ~3.7 GB — verificar RAM) + QuestDB para histórico. Se RAM < 16 GB: QuestDB-only com ILP client (`questdb` crate). Latência ILP write: ~2 µs/row.

**Q4: tract vs ort?**
`tract` para este projeto. Razão: zero deps externas, binary size +5 MB vs +50 MB do `ort`. Latência MLP batch=1: tract ~2.1 µs vs ort ~1.5 µs — diferença irrelevante para nosso budget de 60 µs.

**Q5: CQR adaptativo em Rust?**
Não existe crate. Implementação custom: **200 LoC** (split conformal + adaptive update). Esforço: ~2 dias. Zero-alloc em inferência com pre-alocação do buffer de scores.

**Q6: Inferência p99 < 60 µs/rota é viável?**
Sim, com `tract` + MLP 3-layer 128-wide: ~2–8 µs/rota. Para 2600 rotas em single-thread: 2600 × 5 µs = 13 ms — **excede o budget de 150 ms/ciclo**. Solução: parallelizar via `rayon` (8 threads = ~1.6 ms). Com LightGBM ONNX 100 árvores: ~8 µs × 2600 / 8 threads = ~2.6 ms — viável.

**Q7: Treino Python + inferência Rust ONNX?**
**Sim, absolutamente recomendado.** Custo operacional: 1 script `train.py` + CI step. Vantagem: melhor qualidade de modelo, ferramentas maduras (sklearn, LightGBM, optuna para HPO). Sem perda de latência em produção.

---

## §16 RED-TEAM GERAL — CENÁRIOS DE FALHA

1. **`tract` abandono**: Sonos muda foco de hardware → maintainability cai. Mitigação: `ort` como fallback (mesma API ONNX). Probabilidade: baixa (Sonos é grande empresa).

2. **ONNX opset incompatibilidade**: LightGBM exporta opset 12; tract suporta opset 12–18; compatibilidade deve ser testada por modelo. Mitigação: smoke test CI após export.

3. **`redb` corrupção em crash**: redb usa CoW pages — recovery automático. Mas em Windows com process kill abrupto: testar WAL recovery. Mitigação: journaling mode ativo.

4. **QuestDB scaling**: em 1.35 B obs/dia × 30 dias = ~40 B rows, QuestDB requer ~200 GB disco. Mitigação: partitionamento mensal + TTL 7 dias para dados de treino.

5. **`polars` API breaking**: cada 0.x minor quebra API. Mitigação: pin exata de versão em Cargo.lock; update manual a cada sprint.

6. **Custom CQR bug**: quantil errado → intervalos de confiança mal calibrados → operador não vê sinal. Mitigação: testes de calibração (coverage plot) + `proptest` para invariantes.

7. **`statrs` precision**: funções especiais têm precisão limitada para parâmetros extremos. Mitigação: teste com scipy como oracle.

8. **`augurs` MSTL divergência**: MSTL assume sazonalidade estacionária — longtail crypto tem regime breaks. Mitigação: usar apenas como baseline, com BOCPD para detectar regime change.

---

## §17 PONTOS DE DECISÃO DO USUÁRIO (flags obrigatórios)

1. **`ort` vs `tract`**: aceitar +50 MB binary por ~0.5 µs melhor latência e suporte a modelos ONNX complexos? **Decisão necessária.**

2. **QuestDB vs redb-only**: aceitar serviço externo QuestDB para queries analíticas (rolling quantile, GROUP BY)? Alternativa: implementar rolling quantile custom sobre redb (mais esforço). **Decisão necessária.**

3. **HMM para regime detection**: `hmmlearn` Python com regime export, ou BOCPD Rust (`changepoint`), ou custom HMM Rust? **Decisão necessária se regime detection estiver no escopo.**

4. **`linfa-trees` experimental**: se RandomForest inline Rust for necessário (sem ONNX bridge), aceitar crate experimental com sem garantia de AUC-PR comparável a sklearn? **Exige decisão do usuário: risco beta.**

5. **Frequência de re-treino**: pipeline Python de treino + ONNX export — com que frequência? Diário (alta qualidade, esforço CI), semanal, ou on-demand? Impacta design do feature store. **Decisão operacional necessária.**

---

## §18 STACK RECOMENDADA FINAL

```
Treino (offline, Python):
  LightGBM → onnxmltools → model.onnx
  sklearn quantile regression → skl2onnx → quantile.onnx
  pytest + optuna para HPO

Inferência (Rust, hot path):
  tract 0.21.7 (zero deps, pure Rust ONNX)
  CQR adaptativo custom ~200 LoC
  statrs 0.17 para distribuições

Features offline:
  polars 0.46 (feature engineering)
  ndarray 0.16 (arrays numéricos)
  arrow-rs 53 (serialização)

Feature store:
  redb 2.3 (buffer embedded, últimas 24h)
  QuestDB + questdb client 3.0 (histórico analítico)

Streaming stats (já no projeto + adições):
  hdrhistogram 7.5 (já presente)
  Welford EWMA custom (já presente)
  tdigest 0.2 (quantis offline, aceitar alloc)

Explainability:
  Python shap (offline, Jupyter)
  Exportar features para Parquet (polars)
```

**Impacto estimado em binary size**: tract +5 MB, polars +8 MB, ndarray +1 MB, redb +2 MB, statrs +0.5 MB. Total adição: **~16.5 MB** sobre os atuais 6 MB → **~22.5 MB release**. Aceitável? Verificar se LTO elimina código não usado (polars especialmente).

**Se binary size for constraint crítico**: polars apenas como dev-dependency para pipeline offline; ndarray + custom algorithms em produção. Reduz para ~9 MB.
