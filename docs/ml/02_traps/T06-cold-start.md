---
name: T06 — Rotas com Dados Escassos (Cold Start)
description: 2600 rotas ≠ 2600 séries bem populadas; tratamento via partial pooling hierárquico James-Stein + InsufficientData rejection
type: trap
status: addressed
severity: high
primary_domain: D3
secondary_domains: [D1, D6]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T06 — Rotas com Dados Escassos (Cold Start)

## Descrição

2600 rotas **não** é 2600 séries bem populadas. Listings novos, delistings, halts, mudanças de ticker, reconectores recentes resultam em rotas com histórico < 24h ou < 500 observações. D2 reporta **15–30 listings/mês + 3–8 delistings/mês** em longtail — cold start é recorrente, não excepcional.

Dois falhos ingênuos:
- **Extrapolar** prior global para rota nova → recomendações erradas.
- **Ignorar** rotas com histórico insuficiente → perda de cobertura em exatamente onde oportunidades novas surgem.

## Manifestação empírica

- Em backtest, modelo treinado sem partial pooling produz AUC-PR ~0.40 para rotas com n < 200 (vs ~0.70 para rotas com n > 1000).
- Calibração em rotas frias é catastroficamente ruim (ECE > 0.15).
- Sem tratamento, operador desconfia de recomendações em listings novos e desliga modelo — perda de valor justamente onde oportunidade é maior.

## Tratamento

### Primário — ADR-007 Partial pooling hierárquico James-Stein

Três níveis de prior:
- **Nível 0**: global (todas rotas).
- **Nível 1**: cluster venue-pair (ex: MEXC↔BingX) — prior mais específico.
- **Nível 2**: base-symbol (ex: BTC-*) — prior da volatilidade típica do ativo.
- **Nível 3**: rota específica.

**Shrinkage James-Stein** (Efron & Morris 1977 *JASA* 72):
```
θ̂_rota = λ · empírico_rota + (1 − λ) · cluster_prior
λ = n / (n + 50)
```

- `n = 0` → `λ = 0` → usa puramente cluster prior.
- `n = 50` → `λ = 0.5` → meio-termo.
- `n = 5000` → `λ ≈ 0.99` → ignora prior (rota amadureceu).

### Secundário — ADR-005 Abstenção `InsufficientData`

Threshold `n_min = 500` (derivado Serfling 1980):
- Abaixo → abstém `InsufficientData` com diagnóstico `{n_observations, min_window_hours_available}`.
- Operador sabe que precisa esperar; não confunde com ausência de oportunidade.

### Terciário — Cluster features (ADR-007 famílias A/B/D)

Para rotas novas, features rolling quantile + identidade estrutural são calculadas **usando cluster histórico** até rota acumular histórico próprio. Transição suave via λ James-Stein.

### Quaternário — Meta-learning (V3 roadmap)

MAML-style (Finn, Abbeel & Levine 2017 *ICML*) para "treinar modelo que adapta rápido a nova rota". Descartado para MVP por complexidade alta (GPU-bound, contra stack Rust); postergado para V3.

## Residual risk

- **Cluster mal-identificado**: rota nova em venue-pair sem histórico (dois venues novos ao mesmo tempo). Fallback: usar Nível 0 global.
- **Longtail de longtail**: rotas com n < 50 mesmo após semanas → `InsufficientData` sustentado. Aceitável — algumas rotas são de fato não operáveis.
- **Mudança estrutural de ticker**: MEXC renomear ACE-USDT para ACE2-USDT → cold start "artificial". Mitigação: mapping table de tickers + merge histórico quando venue confirma rename.

## Owner do tratamento

- ADR-007 (primário).
- ADR-005 (secundário, abstenção).

## Referências cruzadas

- [ADR-007](../01_decisions/ADR-007-features-mvp-24-9-familias.md) §Cold start partial pooling.
- [ADR-005](../01_decisions/ADR-005-abstencao-tipada-4-razoes.md) — `InsufficientData`.
- [D03_features.md](../00_research/D03_features.md) §5.5.
- [D02_microstructure.md](../00_research/D02_microstructure.md) §5.7 (eventos discretos).

## Evidência numérica citada

- Efron & Morris 1977 *JASA* 72 — James-Stein shrinkage.
- Gelman & Hill 2006 — *Data Analysis Using Regression and Multilevel/Hierarchical Models*, cap. 7.
- Serfling 1980 — quantis `p95 ± 0.01` estáveis com n ≥ 475.
- Finn, Abbeel & Levine 2017 *ICML* — MAML (para referência futura V3).
- D2 eventos: 15–30 listings + 3–8 delistings + 2–5 halts por mês em longtail.
