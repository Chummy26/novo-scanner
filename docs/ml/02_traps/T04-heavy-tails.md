---
name: T04 — Heavy-Tailedness no Horizonte Temporal
description: First-passage time em processos com saltos tem cauda pesada; reportar média é enganoso — obrigatório quantis + CQR distribution-free
type: trap
status: addressed
severity: high
primary_domain: D1
secondary_domains: [D2, D5]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T04 — Heavy-Tailedness no Horizonte Temporal e nos Spreads

## Descrição

`expected_horizon_s` como **média** de tempo até convergência é enganoso — distribuição de first-passage time em processos com saltos tem **cauda pesada**. Operador recebe `expected_horizon = 30 min` e na prática espera 4 horas em 15% dos casos.

Similarmente, `entrySpread` e `exitSpread` em longtail crypto têm índice de cauda α (Hill) ∈ [2.8, 3.3] (D2) — substancialmente mais pesado que top-5 BTC (α ~ 3.5). Intervalo de confiança Gaussian `μ ± 2σ` **subestima cauda em 2.7×** vs Pareto α=3.

## Manifestação empírica

### Horizonte
- Distribuição esperada bimodal: maioria converge rápido; longa cauda até `T_max`.
- Reportar apenas `E[horizon] = 30 min` ignora que p95 pode ser 3h+.
- Operador que aceita recomendação acreditando horizonte 30min fica frustrado em 15% dos casos.

### Spreads
- Gaussian IC subestima eventos extremos — em regime event (2–5 halts/mês) `entrySpread` pode atingir p99.9 = 10%+.
- Intervalos Gaussian falham; coverage empírica < nominal.

## Tratamento

### Primário — ADR-001 Output com quantis do horizonte

Ao invés de reportar apenas `expected_horizon_s`:

```rust
pub struct HorizonDist {
    pub median: f64,
    pub p25: f64,
    pub p75: f64,
    pub p95: f64,
    pub hill_index: Option<f64>,  // opcional, para regime event
}
```

Operador vê **range realista**, não só média.

### Secundário — ADR-004 CQR (Conformalized Quantile Regression)

CQR é **distribution-free** — não assume Gaussian. Garantia formal de cobertura marginal ≥ 1−α via Romano, Patterson & Candès 2019 *NeurIPS*.

- Para α=0.05: cobertura empírica ≥ 95% em distribuições arbitrárias (exchangeability).
- Intervalos **assimétricos** — adequados para distribuições skewed.

### Terciário — Adaptive conformal γ=0.005 (ADR-004)

Para distribution shift sob cauda pesada — shift de α é compensável via online update de α_t.

### Quaternário — Penalização de setups com `p95_horizon > T_max_tolerável`

Se o p95 do horizonte estimado excede o `T_max` configurado pelo operador, o setup é automaticamente abstém `LowConfidence` ou rotulado `uncertain_horizon` no output.

### Extensão — EVT (Extreme Value Theory)

Para `IC > 99%` (caudas extremas), Generalized Pareto Distribution (Gnedenko-Pickands-Balkema-de Haan). Reservado como extensão futura (flag `REQUIRES_EVT_BEYOND_99`).

## Residual risk

- **Hill estimator é instável** em amostras < 10⁴ (Dekkers, Einmahl & de Haan 1989). Mitigação: reportar α com bootstrap CI; robustness via Pickands estimator comparativo.
- **Regime event cauda ainda mais pesada** que média amostral — CQR adaptive compensa online, mas pode haver período de transição sub-coberto.
- **Operador ignora quantis** e foca só em mediana. Mitigação: UI enfatiza p95 em warning visual quando `p95 > 2× median`.

## Owner do tratamento

- ADR-001 (HorizonDist struct).
- ADR-004 (CQR + adaptive).

## Referências cruzadas

- [ADR-001](../01_decisions/ADR-001-arquitetura-composta-a2-shadow-a3.md).
- [ADR-004](../01_decisions/ADR-004-calibration-temperature-cqr-adaptive.md).
- [D02_microstructure.md](../00_research/D02_microstructure.md) §5.1 (heavy tails).
- [D05_calibration.md](../00_research/D05_calibration.md) §Camada 3.

## Evidência numérica citada

- α (Hill) longtail estimado 2.8–3.3 vs α 3.5 BTC top-5 (D2; baseline Gkillas & Katsiampa 2018 *Economics Letters* 164 para BTC returns — spread equivalent requer coleta empírica).
- Gaussian IC subestima cauda 2.7× vs Pareto α=3 (Hill 1975 *Annals of Statistics* 3).
- CQR cobertura empírica: Romano et al. 2019 *NeurIPS* — ≥ nominal em benchmarks regressão com violação moderada de exchangeability.
- Dekkers, Einmahl & de Haan 1989 *Annals of Statistics* 17 — Hill estimator stability.
