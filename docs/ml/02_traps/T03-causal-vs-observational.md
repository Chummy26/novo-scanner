---
name: T03 — Viés Observacional vs Causal (Selection Bias)
description: Modelo treina em observacional; produção é intervencional — gap entre os dois é de primeira ordem; tratamento via protocolo 4 fases + propensity scoring + doubly robust + double ML (ADR-013)
type: trap
status: addressed
severity: critical
primary_domain: D10
secondary_domains: [D4, D3]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T03 — Viés Observacional vs Causal (Selection Bias)

## Descrição

Modelo treina em **histórico observacional** (snapshots do scanner). Mas execução real é **intervencional** — o próprio ato do operador abrir posição consome liquidez e move preço: `P(Y | do(X)) ≠ P(Y | X)` (Pearl 2009). As duas distribuições divergem sistematicamente:

### Peer-effect
Oportunidades que ficam disponíveis no scanner **por muito tempo** são justamente aquelas que **nenhum outro arbitrageur** quis executar. Viés de seleção contra o operador: se persistiu, é porque outros profissionais olharam e passaram.

### Size effect
Scanner mede **top-of-book**; execução de tamanho material caminha pelo book → preço realizado pior que cotado (T11 amplificado via intervenção).

### Velocity
Scanner reporta snapshots a 150 ms; se o spread existe por 50 ms, `P(realize)` histórica é inflada (D2 reporta `median(D_{x=2%}) < 0.5s` — spread some antes da execução humana ≥ 2s). Modelo aprende em janela mais rápida do que operador consegue atuar.

## Manifestação empírica

- Modelo pode aparentar precision@10 > 0.80 em backtest observacional e **falhar para precision < 0.45 em execução real**.
- `P(realize | executed)` < `P(realize | observed_but_not_executed)` — D10 propõe **`T3_gap > 0.15`** como threshold material.
- Sharpe deflacionado (DSR) não captura — backtest é observacional por definição.

## Tratamento

### Primário — ADR-013 Protocolo de validação em 4 fases

1. **Fase 1 — Shadow puro (30–60 dias)**: modelo emite sem executar; coleta ECE, precision, coverage. Não calibra T3 isoladamente.
2. **Fase 2 — Operador-assisted (30 dias)**: operador decide executar ou não; log `was_recommended`; **calibra haircut empírico + mede `T3_gap = P(realize | executed) − P(realize | not_executed)`**.
3. **Fase 3 — Canary por rota (14 dias)**: A/B formal com Bonferroni + power analysis (n=13.220/braço ajustado).
4. **Fase 4 — Rollout gradual (21 dias)**: 20% → 50% → 100% com kill switch.

**Gate T3 material**: se `T3_gap > 0.15` na Fase 2, **propensity scoring + doubly robust obrigatórios antes de avançar** para Fase 3.

### Secundário — Propensity scoring + Doubly robust + Double ML

- **Propensity scoring** (Rosenbaum & Rubin 1983 *Biometrika* 70): modelo auxiliar `P(execute | features)` + IPW (Inverse Propensity Weighting) para ajustar `P(realize)` histórica inflada.
- **Doubly robust estimation** (Bang & Robins 2005 *Biometrics* 61): combina propensity + outcome model. Robusto a mis-specification de qualquer um.
- **Double/debiased ML** (Chernozhukov et al. 2018 *Econometrics Journal* 21): sample-split + cross-fitting para efeito causal limpo.

Implementação cronológica:
- Fase 2: propensity logístico MVP (n < 500 trades).
- Fase 3+: migrar para LightGBM propensity quando `n_trades ≥ 500`.

### Terciário — Features proxy

- `time_alive_before_emit`: tempo em que oportunidade esteve visível antes de emitir — proxy **peer-effect**.
- `book_depth_at_entry`: proxy **size-effect**.
- `velocity_spread`: proxy **velocity-effect** (D2 persistência `D_x`).

### Quaternário — Counterfactual evaluation

Comparar:
- `outcome_observational` da Fase 1 (shadow sem execução).
- `outcome_realized` da Fase 2 (operador executou).

Gap quantifica magnitude empírica do viés causal; usado para calibrar função `P(realize | executed)` no modelo de produção.

## Residual risk

- **Shadow mode viciado** se operador não executa nada na Fase 1 → `T3_gap` não calibrável. Mitigação ADR-013: **Fase 2 força execução real com decisão logada**.
- **Propensity scoring pode overfit** se features de propensity forem as mesmas do modelo principal. Mitigação: doubly robust estimation cobre mis-specification.
- **Heterogeneidade do viés** por rota: MEXC perp BTC tem viés diferente de BingX perp SHIB. Calibração individualizada exige dataset amplo (cobertura Fase 2 ≥ 50 trades por rota material).
- **Operador múltiplo** (se sistema escalar): T3 se amplifica e vira T12; tratamento conjunto. Fora do escopo MVP.
- **Adversarial market maker** detecta operador e arma armadilha. Out of scope D10; mitigação via capital management (fora do scanner).

## Status

**Tratado**. Protocolo operacional definido em ADR-013; gates de rollout quantificados; 4 camadas de mitigação estatística.

Pendente: calibração empírica real do `T3_gap` na Fase 2 do shadow mode (D10 estima ≥ 0.15 em longtail; confiança 62%).

## Owner do tratamento

- ADR-013 (primário).
- ADR-001 + ADR-007 (features proxy contribuindo).

## Referências cruzadas

- [ADR-013](../01_decisions/ADR-013-validation-shadow-rollout-protocol.md).
- [D10_validation.md](../00_research/D10_validation.md) — protocolo completo.
- [ADR-001](../01_decisions/ADR-001-arquitetura-composta-a2-shadow-a3.md).
- [T11_execution_feasibility.md](T11-execution-feasibility.md) — related mechanism.
- [T12_feedback_loop.md](T12-feedback-loop.md).

## Evidência numérica citada

- Pearl 2009 — *Causality* (Cambridge) — `P(Y|do(X)) ≠ P(Y|X)` framework.
- Rubin 1974 *J Educational Psychology* — potential outcomes.
- Rosenbaum & Rubin 1983 *Biometrika* 70 — propensity score.
- Bang & Robins 2005 *Biometrics* 61 — doubly robust.
- Chernozhukov et al. 2018 *Econometrics Journal* 21 — double/debiased ML.
- Hernán & Robins 2020 book — *Causal Inference: What If*.
- Athey & Imbens 2019 *Annual Rev Econ* 11 — propensity + IPW reduz viés observacional 30–80%.
- D10 threshold `T3_gap > 0.15` (confiança 62%).
