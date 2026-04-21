---
name: ADR-007 — Features MVP (24 features, 9 famílias, janelas configuráveis)
description: Catálogo original de 24 features; superseded parcialmente por ADR-014 (MVP spreads-only 15 features)
type: adr
status: superseded-partial
superseded_by: ADR-014
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d3-features, phd-d2-microstructure]
---

> **NOTA (2026-04-19)** — Este ADR foi refinado por **[ADR-014](ADR-014-mvp-spreads-only-15-features.md)** após revisão operacional: MVP V1 opera com **15 features** (famílias A, B, E, F, G, I). Famílias **C (book_age), D (vol24) e H (venue_health) foram movidas para filtros de trigger** (`book_age < 200ms`, `min_vol24 ≥ $50k`, `NOT halt_active` em ADR-009) — não removidas do sistema, apenas realocadas para onde pertencem conceitualmente.
>
> Racional de partial pooling James-Stein, cross-route penalty, leakage audit e layout `FeatureVec` permanecem válidos (ADR-014 apenas reduz cardinalidade). **Contrato vigente: ADR-014.**

# ADR-007 — Features MVP (24 features, 9 famílias, janelas configuráveis)

## Contexto

O recomendador precisa de features que capturem:

1. **Distribuição histórica da rota** — para detectar `entrySpread` na cauda superior (T1_Q do skill).
2. **Assimetria da identidade estrutural** — `S_entrada + S_saída = −(ba_A + ba_B)/ref`; desvio do baseline sinaliza mispricing (ver correção #3 do skill: reversão a `−2·half_spread`, não zero).
3. **Staleness dos books** — `book_age` alto com spread alto pode ser artefato (D2 threshold dinâmico).
4. **Liquidez/depth proxies** — scanner só tem top-of-book (limitação fundamental, T11 D2).
5. **Regime** — 3 estados latentes identificados em D2 (calm / opportunity / event).
6. **Calendário** — time-of-day e funding proximity.
7. **Cross-route** — diversificação ilusória quando eventos exchange-wide geram correlação 3–5 rotas (T7).
8. **Venue health** — qualidade do stream WS.
9. **Dinâmica do spread** — derivada + CUSUM (stack existente).

Design space:
- **Enxuto** (≤15): baixa complexidade, resiliente a overfitting; arrisca deixar sinal na mesa.
- **Rico** (>50): cobertura ampla; overfitting alto em 2600 rotas × histórico curto longtail.
- **Via-média** (~24): compromisso; recomendação D3.

## Decisão

Adotar **catálogo de 24 features em 9 famílias (A–I)** como MVP, com **janelas configuráveis pelo operador** (correção #4 skill).

### Catálogo

| Família | # | Features dominantes |
|---|---|---|
| **A — Quantis rolantes / distribuição histórica** | 3 | `pct_rank_entry_24h`, `z_robust_entry_24h` (median + MAD, Huber 1981), `ewma_entry_600s` |
| **B — Identidade estrutural** | 3 | `sum_instantaneo`, `deviation_from_baseline_cluster` (usa `−2·median(half_spread)`, **NÃO zero**), `persistence_ratio_1pct_1h` |
| **C — Staleness / book-age** | 3 | `log1p_max_book_age`, `book_age_z_venue` (Z-score vs baseline dinâmico da venue — MEXC ~500ms, BingX/XT ~1–2s), `stale_fraction_venue` |
| **D — Liquidez proxies** | 2 | `log_min_vol24`, `trade_rate_1min` |
| **E — Regime (3 estados)** | 4 | `regime_posterior[calm]`, `regime_posterior[opportunity]`, `regime_posterior[event]`, `realized_vol_1h` + `hurst_rolling_wavelet` (Abry-Veitch 2000) + `parkinson_vol_1h` (Parkinson 1980) |
| **F — Calendar cíclico** | 4 | `sin(2π·hour/24)`, `cos(2π·hour/24)`, `sin(2π·dow/7)`, `cos(2π·dow/7)` + `pre_funding_proximity_hours` |
| **G — Cross-route (T7)** | 3 | `n_routes_same_base_emit`, `rolling_corr_cluster_1h`, `portfolio_redundancy` |
| **H — Venue health** | 0 (abstenção only) | HdrHistogram da stack aciona abstenção via `LowConfidence`, não score |
| **I — Spread dynamics** | 2 | `d_entry_dt_5min`, `cusum_entry` (stack existente) |

**Total**: 24 features contínuas `f32` em layout `FeatureVec = [f32; 28]` alinhado a 64 B = 128 B = **2 cache lines**.

### ΔAUC-PR esperado por família (vs baseline A3 ECDF)

| Família | ΔAUC-PR |
|---|---|
| A quantis | +0.08 a +0.12 |
| B identidade | +0.06 a +0.10 |
| C staleness | +0.04 (crítico para FDR) |
| D liquidez | +0.02 a +0.04 |
| E regime | +0.06 a +0.09 |
| F calendar | +0.02 a +0.04 |
| G cross-route | +0.05 a +0.09 (controle risco 3–5×) |
| H venue health | +0.02 (via abstenção) |
| I dynamics | +0.03 |
| **Total** | **+0.30 a +0.45** |

### Janelas configuráveis (correção #4 skill)

Operador define via CLI/UI:
- Janela default: 24h.
- Alternativas: 6h, 12h, 7d.
- Detecção adaptativa de regime (futuro V2).

**Implementação**: feature store (ADR-012) expõe API paramétrica `quantile_at(rota, q, as_of, window)`. Não há hardcoding.

### Cold start — Partial pooling hierárquico (T6)

Três níveis:
- **Nível 0**: global (todas rotas).
- **Nível 1**: cluster venue-pair (ex: MEXC↔BingX).
- **Nível 2**: base-symbol (ex: BTC-*).
- **Nível 3**: rota específica.

**James-Stein shrinkage** (Efron & Morris 1977 *JASA* 72):
```
θ̂ = λ · empírico + (1 − λ) · cluster_prior
λ = n / (n + 50)
```

**Thresholds**:
- `n_min_activate = 500` (abaixo → `InsufficientData` — ADR-005).
- `n_full_pool = 50` (λ = 0.5).
- `n_no_pool = 5000` (λ ≈ 0.99 — rota suficientemente populada para ignorar prior).

Fundamentação: Serfling 1980 — quantis estáveis com n ≥ 0.05·0.95/0.01² ≈ 475 (arredondado 500).

### Cross-route — T7 tratamento obrigatório

- **`rolling_corr_cluster_1h`**: pré-computada cold path (a cada 60s, 24k pairs, ~10 ms SIMD).
- **Connected component** via Union-Find (Tarjan 1975 *JACM* 22) sobre edges de correlação > 0.6.
- **Portfolio penalty** no ranking: `score_final = score_bruto × (1 − λ · max_corr_emitting)`; λ default 0.5 (configurável 0.3 agressivo / 0.7 conservador).
- **Agregação de setups redundantes**: se ≥ 3 rotas BTC-* com mutual corr > 0.7 emitem em < 2s, gerar 1 `TradeSetup` com flag `CorrelatedCluster` — operador não fica 3× exposto ao mesmo evento.

### Latência

- Construção features: 8.7 µs/rota.
- Inferência com features: ~30 µs/rota.
- Total: **~39 µs/rota** dentro do budget 60 µs (confirmado D3).
- Memória: 2600 rotas × 60 f32 × 4B = **624 KB** (cabe em L2 cache).

### Leakage audit (ADR-006 complementar)

Cinco testes CI bloqueantes em crate `ml_eval`:
1. **Shuffling temporal**: performance deve cair ≥ 50% com labels shuffled.
2. **AST feature audit** via `syn 2.x`: detecta padrões proibidos (`arr[i+k]`, `dataset.mean()`, rolling que avança).
3. **Dataset-wide statistics flag**: blacklist de operações globais sem guard `< t₀`.
4. **Purge verification**: zero pares train/test com window overlap.
5. **Canary forward-looking**: feature sintética lendo futuro deve ser rejeitada.

## Alternativas consideradas

### Feature learning end-to-end (Transformer, TCN)

- Promete extrair features automaticamente.
- **Rejeitada**: ausência de evidência publicada de DL vencer boosting em regime baixo SNR com amostra < 10⁷; Makridakis M5 2022 confirma tree-based venceu DL em 80+ % dos casos. Em stack Rust, treinar DL custom é ainda mais custoso.

### Feature set enxuto (≤15)

- Mais resiliente; argumento forte em López de Prado 2018 ("fewer, better").
- **Rejeitada como default**: deixa na mesa cross-route (T7 — essencial) e regime features (valor alto em D2).
- Aceitável como variante "conservative preset" — V2.

### Feature set rico (>50 features Krauss et al. 2017 extrapolado)

- Krauss et al. 2017 *EJOR* usa ~40–50 em S&P 500 DL.
- **Rejeitada**: extrapolação arriscada de pairs trading equities → mesmo ativo cross-venue (correção #2 skill); 2600 rotas / 50 features → overfitting severo em histórico longtail.

### Apenas features de `(entrySpread, exitSpread)` brutos

- Simplicidade máxima.
- **Rejeitada**: ignora cross-route (T7), regime (T4/T8), staleness (T11). Perdas quantificadas acima.

## Consequências

**Positivas**:
- ΔAUC-PR projetado **+0.30 a +0.45** sobre baseline A3 ECDF.
- Interpretabilidade média — operador entende cada família; SHAP (Python offline, ADR-003) para local explanation.
- Latência dentro do budget (39 µs total, budget 60 µs).
- Configurabilidade (janelas, λ portfolio) mantém operador no controle discricionário.

**Negativas**:
- 24 features em 28 slots (4 padding) = `FeatureVec` layout exige discipline — tests MIRI para zero-alloc.
- Família E (regime features) dependem de HMM 3-estado treinado; se HMM mal-calibrado, 4 features degradam juntas.

**Risco residual**:
- Feature stability sob listings novos (rota < 24h histórico): `InsufficientData` via ADR-005.
- Feature stability sob delistings anunciados: liquidez features explodem; mitigação via flag `delisting_announced_at` que força abstenção `LongTail`.
- Feature stability sob halts: `book_age` fica 0 e depois gigante; features já tratadas via `log1p` e `book_age_z_venue`.

## Status

**Aprovado** para Marco 1. Ablation obrigatório em shadow mode (ADR-012 D10 pendente) — cada família pode ser removida e ΔAUC-PR medido.

## Referências cruzadas

- [D03_features.md](../00_research/D03_features.md) — catálogo completo.
- [D02_microstructure.md](../00_research/D02_microstructure.md) — regime, threshold book_age.
- [ADR-006](ADR-006-purged-kfold-k6-embargo-2tmax.md) — leakage audit integrado.
- ADR-012 (feature store) — persistência + API point-in-time.
- [T06_cold_start.md](../02_traps/T06-cold-start.md).
- [T07_cross_route.md](../02_traps/T07-cross-route.md).
- [T11_execution_feasibility.md](../02_traps/T11-execution-feasibility.md).

## Evidência numérica

- Latência construção features: 8.7 µs/rota benchmark Rust SIMD (D3 §Implementação Rust).
- James-Stein shrinkage derivação: Efron & Morris 1977 *JASA* 72; Gelman & Hill 2006 livro cap. 7.
- Union-Find Tarjan 1975 *JACM* 22 amortized O(α(n)) por operação.
- Correlação empírica cross-route durante eventos: >70% FEVD (D2 §5.5).
- Diebold & Yilmaz 2012 *Int J Forecasting* 28 spillover index para referência.
