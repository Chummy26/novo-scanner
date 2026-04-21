---
name: T09 — Label Leakage
description: Armadilha clássica que destrói 90% dos backtests ML financeiros; tratamento via purged K-fold + embargo + 5 testes CI bloqueantes
type: trap
status: addressed
severity: critical
primary_domain: D4
secondary_domains: [D3, D6]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T09 — Label Leakage (destrói 90% dos backtests ML financeiros)

## Descrição

Para criar label "setup em `t₀` realizou em `T`", é preciso olhar o futuro `[t₀, t₀+T_max]`. Se qualquer feature do modelo incluir informação desse intervalo — quantis rolantes que incluem `t₀+k`, forward-looking z-score, estatísticas globais computadas no dataset inteiro — o modelo **aprende a enganar**: precision@k fantástica em backtest; colapsa em produção.

O regime longtail **amplifica** o risco:
- Persistência alta H ∈ [0.70, 0.85] (D2) → vizinhos temporais altamente correlacionados.
- Spillover cross-route > 70% (D2) → viola independência entre rotas.
- Overlap temporal de labels (`[t₀, t₀+T]` e `[t₀+1, t₀+T+1]`) é severo.

## Vetores principais (López de Prado 2018)

1. **Quantis rolantes que incluem `t₀+k`** — feature "percentile de entrySpread nas últimas X horas" calculada com janela que avança e inclui o próprio label.
2. **Forward-looking z-score** — normalização com mean/std pós-t₀.
3. **Estatísticas globais** — min/max/mean computados no dataset inteiro (train + test).
4. **Resampling indiscriminado** — random train/test em dados temporais.
5. **Horizonte sobreposto não-respeitado** — labels adjacentes compartilham maioria do futuro.
6. **Purging inadequado** — teste contém amostras cuja window de label sobrepõe com train.

## Manifestação

- Precision@10 em backtest ingênuo pode atingir 0.92 com leakage; em produção cai para 0.35.
- AUC-PR inflado de 0.65 real para 0.88 com leakage.
- Sharpe deflacionado (DSR) não detecta se CV contaminada.
- Operador perde confiança quando modelo "perfeito" em backtest falha silenciosamente.

## Tratamento

### Primário — ADR-006 Purged Walk-Forward K-Fold

- K=6 folds cronológicos expanding-window.
- **Purge**: remover do train amostras cuja `[t₀, t₀+T_max]` intersecta `[t₀^test, t₀^test + T_max]` do teste.
- **Embargo = 2·T_max** (conservador dado H~0.8).

### Secundário — Protocolo de auditoria CI (5 testes bloqueantes em `ml_eval` crate)

1. **Shuffling temporal**: comparar performance com labels originais vs shuffle-temporal — se próxima, há leakage. Abort PR se performance shuffled > 50% da original.
2. **AST feature audit** via `syn 2.x`: detecta padrões proibidos (`arr[i+k]`, `dataset.mean()`, rolling que avança). Blacklist hardcoded.
3. **Dataset-wide statistics flag**: blacklist de operações globais sem guard `< t₀`.
4. **Purge verification**: calcula % pares train/test com overlap — deve ser 0.
5. **Canary forward-looking**: feature sintética usando `t₀+1` — pipeline deve rejeitar por construção.

Integração CI: GitHub Actions; falha PR se qualquer leakage detectado.

### Terciário — ADR-012 PIT API

Toda API de leitura recebe `as_of: Timestamp` obrigatório. Proíbe `now()` em módulos de features de treino via `dylint` CI check. Impossível acessar dados futuros por construção.

### Quaternário — DSR (Deflated Sharpe Ratio)

Bailey & López de Prado 2014 *JPM* 40(5) — desinflaciona Sharpe por número de backtests tentados. Threshold `DSR > 2.0` para significância. Detecta overfitting via multiplicidade de hipóteses.

### Quinto — Benjamini-Hochberg FDR

Com 48 labels × 5 baselines × 3 perfis = 720 hipóteses. BH com FDR < 10% sobre p-values individuais.

## Residual risk

- **AST audit burlado por proc-macro**: código gerado em macro pode escapar AST estático. Mitigação: disciplina de code review + cobertura de testes em macros.
- **Cross-route leakage via spillover**: feature derivada de outras rotas pode incluir indiretamente informação do label se não for PIT. Mitigação: PIT API obrigatória em cross-route features também.
- **Seasonality global leakage**: features cyclicas (time-of-day) são globais por natureza; mas são determinísticas (funções de `ts` atual). Não constituem leakage de label.

## Owner do tratamento

- ADR-006 (primário).
- ADR-012 (secundário, PIT API).
- ADR-007 (features respeitam `as_of`).

## Referências cruzadas

- [ADR-006](../01_decisions/ADR-006-purged-kfold-k6-embargo-2tmax.md).
- [ADR-007](../01_decisions/ADR-007-features-mvp-24-9-familias.md).
- [ADR-012](../01_decisions/ADR-012-feature-store-hibrido-4-camadas.md).
- [D04_labeling.md](../00_research/D04_labeling.md) §Auditoria T9.

## Evidência numérica citada

- López de Prado 2018 — *Advances in Financial Machine Learning* cap. 7.
- Kaufman et al. 2012 *ACM TKDD* 6 — leakage in data mining.
- Bailey, Borwein, López de Prado & Zhu 2014 *J Computational Finance* 20(4) — Probability of Backtest Overfitting.
- Bailey & López de Prado 2014 *JPM* 40(5) — Deflated Sharpe Ratio.
- Benjamini & Hochberg 1995 *JRSS-B* 57 — FDR.
- H ∈ [0.70, 0.85] empírico crypto longtail (D2 §5.2).
