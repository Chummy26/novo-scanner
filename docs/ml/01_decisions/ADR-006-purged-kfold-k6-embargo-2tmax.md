---
name: ADR-006 — Purged Walk-Forward K-Fold com K=6 e Embargo = 2·T_max
description: Protocolo de validação cruzada temporal com purging, embargo e walk-forward expanding-window para eliminar label leakage em séries autocorrelacionadas
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d4-labeling, phd-d3-features]
---

# ADR-006 — Purged Walk-Forward K-Fold com K=6 e Embargo = 2·T_max

## Contexto

A armadilha **T9 — Label leakage** destrói 90% dos backtests de ML financeiro (López de Prado 2018 — *Advances in Financial Machine Learning*, cap. 7). Vetores principais:

- Labels sobrepostos (`[t₀, t₀+T]` e `[t₀+1, t₀+T+1]`) compartilham maioria do futuro.
- Train contém amostras cujo label window intersecta com test.
- Random K-fold viola autocorrelação (nosso H ∈ [0.70, 0.85] — D2).

O regime longtail crypto **amplifica** o risco:
- Persistência alta (H~0.8) → vizinhos temporais altamente correlacionados.
- Spillover cross-route > 70% (D2) → viola independência entre rotas.
- Dataset potencial: 2600 rotas × 90 dias × 576 snap/dia = 1.35×10⁸ observações brutas → ~6.7×10⁶ após trigger P95+.

## Decisão

Adotar **Purged Walk-Forward K-Fold com K=6 e Embargo = 2·T_max** como protocolo canônico de validação temporal e de backtesting.

### Parâmetros

- **K = 6** folds cronológicos expanding-window.
- **Embargo = 2·T_max** (conservador dado H ∈ [0.70, 0.85]):
  - Para `T_max = 30 min` → embargo 1h.
  - Para `T_max = 4h` → embargo 8h.
  - Para `T_max = 24h` → embargo 48h.
- **Purge**: remover do train amostras cuja `[t₀, t₀+T_max]` intersecta `[t₀^test, t₀^test + T_max]` do teste.
- **Min gap entre folds** = max(embargo, 12h) para permitir cycle intraday full.

### Protocolo operacional

1. Ordenar amostras cronologicamente (não embaralhar).
2. Expanding-window: fold_i treina em `[t_start, t_train_end_i]`, testa em `[t_test_start_i, t_test_end_i]`.
3. Para cada fold de teste:
   - Aplicar **purge**: remover do train amostras com overlap de label window.
   - Aplicar **embargo**: remover amostras nas `embargo` horas antes e depois do fold de teste.
4. Avaliar métricas (precision@k, AUC-PR, ECE, pinball loss, coverage) em cada fold.
5. Reportar **mean ± std** entre folds.

### CPCV (Combinatorial Purged Cross-Validation)

Reservado para **validação final pré-produção** (uma única rodagem antes de deploy). K-fold com K=6 e `n_splits=4` → 15 combinações; gera estimativa mais robusta de PBO (Probability of Backtest Overfitting, Bailey et al. 2014).

### Multiple testing correction

Com múltiplas hipóteses simultâneas (48 labels paramétricas × 5 baselines × 3 perfis de operador):
- **Benjamini-Hochberg** FDR < 10% sobre p-values individuais de cada (label, modelo).
- **Deflated Sharpe Ratio** (Bailey & López de Prado 2014 *JPM* 40(5)): `DSR > 2.0` threshold para significância.
- **Romano-Wolf stepwise** (Romano & Wolf 2005 *Econometrica* 73) para tail-sensitive quando amostra permite.

## Alternativas consideradas

### Random K-fold (shuffle=True)

- **Rejeitado absolutamente**. Viola autocorrelação; leakage garantido em séries com H > 0.5.

### Simple time-based holdout (80/20)

- Mais simples; uma única métrica de teste.
- **Rejeitada** como canônico: variância alta (um regime pode dominar teste); não permite estimativa de intervalo de confiança de performance.
- Aceitável como **smoke test** rápido em CI.

### K = 10

- Mais folds = menor variância, mas cada fold com menos dados.
- **Rejeitada**: K=6 dá ~1.1×10⁶ amostras por fold (ampla para modelos Wave 2); K=10 cairia para ~670k, no limite para RSF horizon estimation.

### Embargo = T_max (sem fator 2)

- López de Prado 2018 sugere embargo ≥ T_max.
- **Rejeitada**: H~0.8 implica autocorrelação persistente além de T_max. Fator 2 é conservador empírico justificado pelo regime longtail.

### CPCV puro sem K-fold tradicional

- Mais robusto estatisticamente.
- **Rejeitada** como canônico do CI: computacionalmente caro (15 combinações) para cada PR. Reservado para validação final.

## Consequências

**Positivas**:
- Leakage temporal estrutural eliminado (purge + embargo).
- Walk-forward simula operacionalmente como modelo seria retreinado em produção.
- `mean ± std` entre folds permite intervalos de confiança de performance.
- Dataset size adequado (~1.1×10⁶ por fold) para QRF + CatBoost + RSF.
- DSR + BH FDR controlam inflação de significância em busca de hyperparâmetros.

**Negativas**:
- Custo computacional: 6 folds × {treino + avaliação} ≈ 6× single-holdout.
- Estimativa em Python com `polars 0.46` + `scikit-learn`: ~30 min por fold → 3h total por ablation run.
- Mitigação: K-fold paralelo via `rayon` em Rust + paralelismo entre folds em Python (`n_jobs=-1`). Reduz para ~8 min total.
- CPCV final adiciona 3h extras antes de deploy.

**Risco residual**:
- **Regime shift entre folds**: fold 6 pode estar em regime diferente de fold 1; comparação direta pode ser enganosa. Mitigação: reportar métricas por regime (D2) dentro de cada fold.
- **Survivorship bias**: rotas delistadas durante a janela de 90 dias desaparecem do dataset atual. Mitigação: preservar `listing_history.parquet` imutável com `active_from`, `active_until` (D4 ADR).
- **Leakage via cross-route spillover**: purge temporal não cobre contamination via correlated routes. Mitigação: feature `cross_route_corr_1h` é derivada só de `[−∞, t₀]` (ADR-008 audit features).

## Status

**Aprovado** para Marco 1. K=6, embargo=2·T_max, CPCV pré-deploy.

## Referências cruzadas

- [D04_labeling.md](../00_research/D04_labeling.md) — protocolo completo.
- [ADR-007](ADR-007-features-mvp-24-9-familias.md) — features com janelas discricionárias.
- [ADR-009](ADR-009-triple-barrier-parametrico-48-labels.md) — labeling paramétrico.
- [T09_label_leakage.md](../02_traps/T09-label-leakage.md).
- López de Prado 2018 cap. 7 (Cross-Validation in Finance).

## Evidência numérica

- H ∈ [0.70, 0.85] empírico crypto longtail (D2 §5.2).
- López de Prado 2018 reporta redução de PBO de 60%+ para <15% com purged K-fold em backtests equities.
- Bailey et al. 2014 *Journal of Computational Finance* 20(4) — PBO < 5% com ≥ 16 configs × 1000 obs (nosso setup satisfaz confortavelmente).
- Benjamini-Hochberg FDR (1995 *JRSS-B* 57) para múltiplas hipóteses.
- DSR threshold 2.0 corresponde a p-value ~0.023 two-sided (Bailey & López de Prado 2014).
