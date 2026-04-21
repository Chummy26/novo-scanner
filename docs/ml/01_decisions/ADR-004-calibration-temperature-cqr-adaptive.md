---
name: ADR-004 — Pipeline de Calibração (Temperature Scaling + CQR + Adaptive Conformal)
description: Calibração em 5 camadas — marginal global, condicional por regime, CQR+adaptive conformal, joint via G(t,t') unificado, monitoramento online com kill switch
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d5-calibration, phd-d1-formulation]
---

# ADR-004 — Pipeline de Calibração em 5 Camadas

## Contexto

A estratégia de arbitragem é **precision-first**: falso positivo é catastrófico (operador abre e fica preso); recall baixo é aceitável. Consequentemente, `realization_probability` reportada pelo modelo precisa ser **empiricamente calibrada** com ECE < 0.02 marginal e < 0.05 condicional por estrato (regime D2, venue-pair).

Adicionalmente, D2 identifica:
- Distribuições **heavy-tailed** com índice α (Hill) ∈ [2.8, 3.3] — Gaussian `μ ± 2σ` subestima caudas em **2.7×** para α=3.
- **3 regimes latentes** (calm / opportunity / event) — calibração global esconde miscalibração local no regime de maior valor.
- **Spillover FEVD > 70%** em eventos — IID violado severamente no cross-route.
- **Hurst H ~ 0.70–0.85** — IID violado na dimensão temporal.

D5 avaliou 5 camadas de calibração:
1. Marginal global post-hoc (Platt, isotonic, temperature, beta).
2. Condicional estratificada (por regime).
3. Intervalos conformal (split, CQR, adaptive).
4. Calibração conjunta (T2 — correlação −0.93 entre entry × exit).
5. Monitoramento online + kill switch.

## Decisão

Implementar o **pipeline de calibração em 5 camadas** conforme especificado em `00_research/D05_calibration.md`:

### Camada 1 — Marginal global: **Temperature Scaling**

- Método: único parâmetro `T > 0`; busca via Brent em `[0.1, 10.0]`.
- Implementação: ~20 LoC Rust com `argmin 0.10`.
- Preserva ranking estrito (requisito precision-first).
- Risco de overfitting mínimo quando `n_calib` por estrato < 500 (provável fase inicial).
- Alternativas rejeitadas e razão:
  - **Platt scaling** (sigmoid): viés paramétrico; Niculescu-Mizil & Caruana 2005 *ICML* reportam isotonic e beta vencerem em muitos casos.
  - **Isotonic PAV**: não-paramétrico; overfitting alto com `n < 1000`. Usado apenas como diagnóstico residual.
  - **Beta calibration** (Kull et al. 2017): 3 parâmetros; fallback ativado se `n_calib > 800` e ECE residual > 0.02.

### Camada 2 — Condicional estratificada por regime

- Três calibradores Temperature Scaling independentes — um por regime (calm / opportunity / event) identificado em D2 via HMM 3-estado.
- Se `max(regime_posterior[k]) < 0.70`: mistura ponderada dos calibradores por probabilidade.
- Justificativa: Romano, Sesia & Candès 2020 (*NeurIPS*) demonstram formalmente que cobertura marginal OK não implica cobertura condicional OK. Em nosso regime `event` (maior valor monetário), `ECE_event` pode atingir 0.09 mesmo com `ECE_global = 0.018`.

### Camada 3 — Intervalos conformal (CQR + Adaptive)

- **CQR — Conformalized Quantile Regression** (Romano, Patterson & Candès 2019 *NeurIPS*):
  - Garante cobertura marginal ≥ 1−α **distribution-free**.
  - Resposta direta para T4 (heavy tails α~3): Gaussian subestima cauda 2.7×; CQR não assume forma.
  - Implementação: ~200 LoC Rust custom (não há crate dedicado — confirmado D7).
  - Latência: O(1) inferência (<10 ns por quantile lookup).
- **Adaptive Conformal Inference** (Gibbs & Candès 2021 *NeurIPS*):
  - `α_t+1 = α_t + γ·(α* − 𝟙[y_t ∉ IC_t])`.
  - `γ = 0.005` recomendado por Zaffran et al. 2022 *ICML* para time-series.
  - Compensa T8 (distribution shift) sem retreino; mesmo sem garantia formal sob autocorrelação, cobertura empírica degrada muito menos que conformal estático.

### Camada 4 — Calibração conjunta via variável unificada

A correlação empírica `entrySpread × exitSpread = −0.93` torna **multiplicar P's marginais incorreto** (T2). Solução adotada:

- Modelar diretamente `G(t, t') = S_entrada(t) + S_saída(t')` como **variável escalar única**.
- Aplicar CQR sobre `G`.
- Cobertura garantida para o joint sem copula ou multi-output conformal.
- CQR multi-output retangular (Feldman et al. 2023) inflaria ~30% em volume vs copula para correlação −0.93 — rejeitado como primário.
- Ver [ADR-008](ADR-008-joint-forecasting-unified-variable.md) para detalhamento.

### Camada 5 — Monitoramento online + kill switch

- **Reliability diagram** rolante janelas 1h, 4h, 24h por estrato.
- **Adaptive ECE** rolante — Nixon et al. 2019 *CVPR*.
- **Coverage empírica** do IC (68/90/95%) rolante.
- **Abstention rate** por reason code.
- **Kill switch**: se `ECE_4h > 0.05` OR `coverage_4h < nominal − 0.05` → fallback para **baseline A3** (ECDF+bootstrap; <1 µs/rota). Todas as emissões em fallback carregam flag `calibration_status: kill_switch_active`.
- **Reativação** manual: operador aprova após retreino/recalibração em holdout.
- Flag adicional por estrato (sem kill global) para detectar miscalibração localizada em regime event sem derrubar sistema inteiro.

## Alternativas consideradas

### Calibração única marginal (sem estratificação)

- Mais simples, menos LoC.
- **Rejeitada**: Romano et al. 2020 evidência formal; D2 regime event é precisamente onde erro causa maior prejuízo monetário.

### Bayesian full posterior (alternativa à Camada 3)

- Gaussian Process com posterior MC.
- **Rejeitada**: latência MCMC ~1 ms viola budget 60 µs; ecossistema Rust imaturo (<10% cobertura PyMC/Stan em 2026).

### Conformal clássico IID (sem adaptive)

- Mais simples, zero hiperparâmetros.
- **Rejeitada**: IID violado severamente (H~0.8, spillover >70%); cobertura empírica degrada materialmente em regime shift.

### EVT para cauda pura (alternativa à CQR)

- Generalized Pareto Distribution para tail (Gnedenko-Pickands-Balkema-de Haan theorem).
- **Reservada** para IC > 99% — extensão futura flag `[REQUIRES_EVT_BEYOND_99]`. CQR cobre 95/90/68% adequadamente.

## Consequências

**Positivas**:
- ECE target 0.02 alcançável com margem (Temperature Scaling típico 0.015–0.025 pós-calibração vs 0.04–0.10 raw).
- Garantia formal de cobertura distribution-free (CQR).
- Resiliência a distribution shift (Adaptive).
- Abstenção calibrada via `LowConfidence` quando IC largo demais.
- Latência desprezível no hot path (<60 ns/rota total).

**Negativas**:
- 5 camadas = complexidade operacional; exige monitoramento robusto.
- IID violado implica cobertura formal **não é** garantida — precisa validação empírica por estrato + mitigação via purged walk-forward (ADR-006) + stationary bootstrap (Politis & Romano 1994 *JASA* 89) para erros de calibração.
- ~690 LoC Rust + dependências já no stack (`statrs 0.17`, `argmin 0.10`, `ndarray 0.16`).

**Risco residual**:
- Regime transition: calibrador per-regime pode estar errado se HMM classifica mal.
- Overfitting da calibração em `n_calib` muito pequeno — mitigação: hold-out específico para calibração distinto de train/test do modelo base.

## Status

**Aprovado** para Marco 1. `γ=0.005` adaptive conformal é default, configurável via CLI.

## Referências cruzadas

- [D05_calibration.md](../00_research/D05_calibration.md) — relatório completo.
- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — arquitetura A2.
- [ADR-005](ADR-005-abstencao-tipada-4-razoes.md) — abstenção via `LowConfidence`.
- [ADR-008](ADR-008-joint-forecasting-unified-variable.md) — unificação via G(t,t').
- ADR-011 (drift detection E5 Hybrid) — ADWIN sobre residuais de calibração complementa adaptive.
- [T02_joint_vs_marginal.md](../02_traps/T02-joint-vs-marginal.md).
- [T04_heavy_tails.md](../02_traps/T04-heavy-tails.md).
- [T08_distribution_shift.md](../02_traps/T08-distribution-shift.md).

## Evidência numérica

- Gaussian IC `μ±2σ` subestima cauda 2.7× vs Pareto α=3 (Hill 1975 *Annals of Statistics* 3).
- Temperature Scaling reduz ECE de 0.04–0.10 raw para 0.015–0.025 (Guo et al. 2017 *ICML*).
- CQR cobertura empírica: Romano et al. 2019 *NeurIPS* reportam cobertura ≥ nominal em benchmarks regressão com violação moderada de exchangeability.
- Adaptive γ=0.005: Zaffran et al. 2022 *ICML* mostram cobertura dentro de 1pp do nominal em M4 time-series dataset.
- Latência Rust calibration (estimada): Temperature Scaling lookup O(1) < 10 ns; CQR quantile lookup < 10 ns; Adaptive update 5 ops aritméticas < 5 ns.
