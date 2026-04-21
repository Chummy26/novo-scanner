---
name: T07 — Correlação entre Rotas (Diversificação Ilusória)
description: Eventos exchange-wide geram correlação 70%+ entre rotas do mesmo símbolo; tratamento via portfolio penalty + agregação de setups redundantes
type: trap
status: addressed
severity: high
primary_domain: D3
secondary_domains: [D2, D10]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T07 — Correlação entre Rotas (Diversificação Ilusória)

## Descrição

Evento de notícia / halt / hack abre spread em múltiplas rotas do mesmo símbolo base simultaneamente — `BTC-v1→v2`, `BTC-v1→v3`, `BTC-v2→v3`. Modelo emite **3 TradeSetups independentes**, mas é **1 evento correlacionado**. Operador executa os 3 pensando diversificar; está na verdade **3× concentrado em single event risk**.

D2 confirma: **spillover FEVD > 70%** em eventos exchange-wide em longtail crypto (vs 20–40% em top-5). Diversificação ilusória é regra, não exceção.

## Manifestação empírica

- Em evento tipo exchange hack, 5–10 rotas do mesmo símbolo podem emitir setup simultaneamente em < 2 segundos.
- Operador com capital alocado para 3 rotas pensa estar diversificando; na prática:
  - Se evento se resolve favoravelmente → 3× lucro (positivo).
  - Se evento evolve mal (exchange freeze estende) → **3× prejuízo simultâneo**.
- Gestão de risco ingênua subestima max drawdown potencial.

## Tratamento

### Primário — ADR-007 Portfolio penalty + agregação de clusters

**Feature `rolling_corr_cluster_1h`**:
- Pré-computada cold path (a cada 60s, ~24k pairs, ~10 ms SIMD).
- Detecta clusters de rotas correlacionadas em regime atual.

**Connected component via Union-Find** (Tarjan 1975 *JACM* 22):
- Edges: `correlation > 0.6` entre pares de rotas.
- Componentes fortemente conectadas = event clusters.

**Portfolio penalty no ranking**:
```
score_final = score_bruto × (1 − λ · max_corr_emitting)
```
- `λ` default 0.5 (configurável: 0.3 agressivo / 0.7 conservador).
- Rota com alta correlação a outras recentemente emitidas é penalizada.

**Agregação de setups redundantes**:
- Se ≥ 3 rotas BTC-* com mutual corr > 0.7 emitem em < 2s → gerar **1 `TradeSetup` agregado** com flag `CorrelatedCluster`.
- Output mostra operador: "3 rotas correlacionadas emitindo; executar 1 é suficiente; executar 3 é 3× mesmo risco".

### Secundário — Feature `n_routes_same_base_emit` (ADR-007 família G)

Count de rotas do mesmo símbolo base emitindo setup agora. Input direto ao modelo para aprender penalização.

### Terciário — ADR-012 Feature store cross-route queries

Query Q2 do D9 (cross-route correlation) alimenta feature.

### Quaternário — Dashboard shadow mode (D10 pendente ADR)

Monitoring específico:
- `cluster_emission_rate` — quantos eventos correlacionados por dia.
- `operator_executed_redundant` — fração que operador executa setups redundantes (T7 manifesta-se no comportamento).

## Residual risk

- **λ mal-calibrado**: muito baixo → T7 persiste; muito alto → abstém em clusters legítimos (correlação natural BTC global). Calibração empírica via shadow.
- **Detecção de cluster lenta**: 60s de cold path para correlation update; event que evolui em 5s escapa. Mitigação: feature aux `n_routes_same_base_emit` atualizada em hot path.
- **Cross-símbolo spillover** (ex: BTC down → ETH down simultâneo) não coberto por cluster por base_symbol. Extensão V2: cluster por categoria (maior liquidez cross-cap).

## Owner do tratamento

- ADR-007 (primário).
- ADR-012 (secundário, queries).

## Referências cruzadas

- [ADR-007](../01_decisions/ADR-007-features-mvp-24-9-familias.md) §Cross-route (T7 obrigatório).
- [ADR-012](../01_decisions/ADR-012-feature-store-hibrido-4-camadas.md).
- [D02_microstructure.md](../00_research/D02_microstructure.md) §5.5 spillover.
- [D03_features.md](../00_research/D03_features.md) §Cross-route.

## Evidência numérica citada

- Spillover FEVD > 70% em eventos exchange-wide longtail (D2 §5.5; Ji et al. 2019 crypto connectedness corrobora ~75% em eventos).
- Diebold & Yilmaz 2012 *Int J Forecasting* 28 — spillover index methodology.
- Union-Find Tarjan 1975 *JACM* 22 — amortized O(α(n)) por operação.
- Billio et al. 2012 *JFE* 104 — dynamic conditional correlation.
