---
name: STACK ML Consolidado — TradeSetup Calibrado para Arbitragem Cross-Venue Longtail
description: Síntese executiva do stack recomendado sobre 10 domínios de pesquisa PhD; Wave 1+2 completas, Wave 3 parcial (D10 pendente re-despacho)
type: final-stack
status: draft
author: programa-phd-sub-agentes
date: 2026-04-19
version: 0.3.0
---

# STACK ML Consolidado — TradeSetup Calibrado

Síntese de 10 relatórios PhD (~53k palavras) + 13 ADRs + 12 análises de armadilha. Para o racional completo, ver respectivos artefatos linkados.

## 0. Objetivo central (do CLAUDE.md) — tudo gira em torno disto

**Por rota, por instante**, uma recomendação concreta e calibrada:

> **Entre em X%, saia em Y%, lucro bruto = X + Y%, probabilidade P, horizonte T, IC 95% = [P_low, P_high].**

Exemplos do formato que o operador consome (CLAUDE.md):

- `BP mexc:FUT → bingx:FUT` — enter **2.00%**, exit **−1.00%**, lucro **1.00% bruto**, P=**83%**, ~**28 min**, IC [77%, 88%].
- `IQ bingx:FUT → xt:FUT` — enter **2.00%**, exit **+1.00%**, lucro **3.00% bruto**, P=**41%**, ~**2h15**, IC [32%, 51%].
- `GRIFFAIN gate:SPOT → bingx:FUT` — enter **0.50%**, exit **−0.30%**, lucro **0.20% bruto**, P=**72%**, ~**6 min**, IC [65%, 79%].

**Critério de sucesso** (CLAUDE.md §99): operador olha a recomendação e executa com convicção **sem consultar histórico manualmente**.

**Escopo fechado** (CLAUDE.md §56): modelo automatiza APENAS detecção e recomendação. Execução, stop-loss, rebalance, PnL líquido — 100% humano.

### Contrato preciso do output (ADR-016) — thresholds + distribuição + P via CDF

Na prática, `entrySpread(t)` e `exitSpread(t)` flutuam continuamente. Operador captura *algum* valor durante a vida da oportunidade, não um pré-determinado. **Por isso enter e exit são thresholds mínimos** (regras acionáveis), e **lucro bruto é reportado como distribuição de quantis empíricos**:

- `enter_at_min`, `exit_at_min` — regras acionáveis (entre/saia quando spread ≥ threshold).
- `gross_profit_{p10, p25, median, p75, p90, p95}` — quantis empíricos do modelo G unificado (ADR-008).
- `realization_probability = P(G(t,t') ≥ floor | features)` — derivado **direto da CDF de G**, NÃO decomposição multiplicativa de marginais (correção crítica pós-investigação PhD Q2).
- `toxicity_level` (Healthy/Suspicious/Toxic) + `cluster_id/size/rank` + `horizon_p05_s` — contextos microestruturais (Q1 emendas).
- Scoring rules de treino declaradas: pinball para quantis, log loss para P, CRPS offline para distribuição (Q2-M3/M4).
- Layout UI em 3 camadas (overview minimalista → drill-down distribuição → overlay no gráfico 24h); atualização visual ≤ 2 Hz; `P` em frequência natural "77/100" (Q3 F-UX5).

Operadores distintos seguindo a mesma regra ficam em pontos distintos da distribuição (conservador pega mínimo; tático espera pico). Modelo não promete pontos exatos — entrega regra acionável + distribuição honesta.

O stack §1–§10 abaixo é meio; este output é o fim.

## 1. Formulação algorítmica (D1) — ADR-001

**Arquitetura A2 composta**:
- QRF (Quantile Regression Forest, Meinshausen 2006 *JMLR* 7) — quantis de `entrySpread`.
- CatBoost MultiQuantile — quantis condicionais de `exit | entry`.
- RSF (Random Survival Forest, Ishwaran et al. 2008 *AAS* 2(3)) — first-passage horizon.
- **Agregador conformal** (ADR-004) integra os três via CQR sobre `G(t, t')`.

**Baseline shadow A3**: ECDF + bootstrap empírico condicional (<1 µs/rota). Roda sempre em paralelo como safety-net do kill switch e barra absoluta de comparação.

**Rejeições**: A1 monolítica (calibração pós-hoc frágil, cold-start ruim); A4 Bayesian MCMC (latência ~1 ms viola budget); A5 RL (sample efficiency catastrófica).

## 2. Microestrutura longtail (D2)

Regime é **estruturalmente distinto** de top-5:

| Parâmetro | Top-5 | Longtail estimado |
|---|---|---|
| α cauda (Hill) | 3.5 | **2.8–3.3** |
| H (Hurst) | 0.55–0.65 | **0.70–0.85** |
| Mediana `entrySpread` | < 0.1% | **0.32%** |
| Regimes latentes | 2 | **3** (calm / opportunity / event) |
| Spillover FEVD eventos | 20–40% | **>70%** |
| Eventos/mês | < 1 halt | **2–5 halts + 15–30 listings + 3–8 delistings** |

**Crítico**: `median(D_{x=2%}) < 0.5s` → **< 50% dos setups `enter_at ≥ 2%` executáveis em latência humana ≥ 2s**. Haircut empírico projetado 20–70% conforme magnitude.

**Lacuna aberta**: parâmetros acima exigem **60–90 dias de coleta** empírica para confirmar. N=431 do snapshot atual é insuficiente.

## 3. Feature engineering (D3) — ADR-007

**MVP: 24 features em 9 famílias**:

| Família | # | ΔAUC-PR vs A3 |
|---|---|---|
| A quantis rolantes | 3 | +0.08 a +0.12 |
| B identidade estrutural | 3 | +0.06 a +0.10 |
| C staleness/book-age | 3 | +0.04 (crítico FDR) |
| D liquidez proxies | 2 | +0.02 a +0.04 |
| E regime (3 estados) | 4 | +0.06 a +0.09 |
| F calendar cíclico | 4 | +0.02 a +0.04 |
| G cross-route | 3 | +0.05 a +0.09 |
| H venue health | 0 (via abstenção) | +0.02 |
| I spread dynamics | 2 | +0.03 |
| **Total** | **24** | **+0.30 a +0.45** |

Janelas **configuráveis pelo operador** (correção skill #4). Partial pooling James-Stein (T6). Portfolio penalty λ=0.5 + agregação de clusters correlacionados (T7). Layout `FeatureVec = [f32; 28]` 128 B / 2 cache lines.

## 4. Labeling & backtesting (D4) — ADR-006, ADR-009

**Triple-barrier sobre SOMA de spreads** (respeita identidade PnL): grid paramétrico **48 labels** (4 meta × 3 stop × 3 T_max) — operador escolhe config via UI.

**Meta-labeling**: scanner é primária; modelo ML é secundária. Ganho típico +15–30% precision às custas de −10–20% recall.

**Purged walk-forward K-fold K=6 com embargo = 2·T_max**. Dataset: 90 dias × 2600 rotas × 576 snap/dia → 1.35×10⁸ brutas → ~6.7×10⁶ após trigger P95+.

**Métricas**: precision@{1,5,10,50} (alvo MVP precision@10 ≥ 0.70); AUC-PR; ECE < 5%; pinball; coverage; DSR > 2.0; Calmar; abstention quality por razão.

**Auditoria T9 (CI-bloqueante, crate `ml_eval`)**:
1. Shuffling temporal.
2. AST feature audit via `syn 2.x`.
3. Dataset-wide statistics flag.
4. Purge verification.
5. Canary forward-looking.

## 5. Calibração & incerteza (D5) — ADR-004

**5 camadas**:

1. **Marginal global**: Temperature Scaling (1 param, ~20 LoC Rust); Isotonic PAV diagnóstico; Beta fallback se n > 800.
2. **Condicional por regime**: 3 calibradores separados (calm/opportunity/event); mixtura ponderada se posterior ambíguo.
3. **CQR + Adaptive Conformal**: CQR distribution-free (Romano et al. 2019 *NeurIPS*); γ=0.005 adaptive (Zaffran et al. 2022 *ICML*).
4. **Joint via variável unificada `G(t,t') = S_entrada + S_saída`** — T2 resolvido por construção (ADR-008).
5. **Monitoramento online + kill switch**: reliability rolling por estrato; ECE rolling; coverage rolling; ECE_4h > 0.05 → fallback A3.

**Total Rust**: ~690 LoC; zero deps externas além de já-na-stack; <60 ns/rota overhead (0.1% do budget 60 µs).

## 6. Online learning & drift (D6) — ADR-011

**E5 Hybrid**:
1. Adaptive conformal γ=0.005 (Camada 1 D5) — drift lento.
2. ADWIN sobre residuais de calibração (δ=0.001, ~120 LoC Rust) — drift moderado.
3. Retreino emergencial Python → ONNX → Rust hot-reload — drift abrupto. < 45 min duração.

**5 triggers de retreino**:
- T1 Scheduled (nightly 04:00 UTC).
- T2 ADWIN fires.
- T3 ECE_4h > 0.05.
- T4 Manual (operador CLI).
- T5 Rollback automático se precision@10_novo < previous × 0.95.

**T12**: thresholds quantificados — `share_of_daily_volume > 5%` flag; `> 15%` desativa ML por rota.

**Recovery time**: E1 nightly puro 13–37h → E5 Hybrid < 2h.

## 7. Rust ML ecosystem (D7) — ADR-003

**Inferência Rust nativa**:
- `tract 0.21.7` — pure-Rust ONNX, zero deps, zero-alloc via `SimpleState` (requer MIRI verification).
- `polars 0.46` — DataFrames production-ready.
- `ndarray 0.16`, `statrs 0.17`, `argmin 0.10`, `hdrhistogram 7.5`.
- `rv 0.16`, `changepoint 0.13`, `nalgebra 0.33`, `parquet 56`, `arrow 56`.

**Treino Python (burden-of-proof §0.5 cumprido)**:
- LightGBM / CatBoost / scikit-survival — gap 3–5 anos maturidade Rust.
- Jupyter para análise exploratória e ablation offline.
- SHAP permanente em Python (offline only).
- Export ONNX + self-test Rust (`rtol=1e-4`) antes de promoção.

**Rejeitados**: Python em-process via FastAPI/gRPC (viola budget); `ort` (+50MB binary); `catboost-rs` FFI (complexidade sem ganho vs ONNX).

## 8. Serving architecture (D8) — ADR-010

**A2 — Thread dedicada no mesmo binário**:
- Entrega 99.7% do ganho de latência de A1 (0.8 µs p99 vs 0 µs) com failure isolation.
- `crossbeam::bounded(1)` canal entrada; `ArcSwap<[TradeSetup; 2600]>` saída.
- `core_affinity` em core distinto do spread engine.
- `notify 6.1` + canal controle para hot-reload (150–300 ms downtime).
- Circuit breaker: p99 ML > 100 µs → fallback A3.

**Rejeitados**: A1 inline (panic não-capturável mata scanner inteiro); A4 gRPC (300–5000 µs viola budget); A5 sidecar (260 µs serialização por ciclo).

**Zero-alloc verification**: MIRI (com kernel extraído) + custom GlobalAlloc counter + sustained 1h benchmark heaptrack.

## 9. Feature store persistente (D9) — ADR-012

**4 camadas**:
1. `redb 2.3` hot buffer (últimas 24h) — 495k writes/s; `mpsc::channel(100k)` spike buffer.
2. `HotQueryCache` Rust com `hdrhistogram` per-rota — **<200 ns lookup**, ~208 MB RAM.
3. QuestDB 7.x (90 dias) — ILP TCP 1.2 µs/row; `PARTITION BY DAY DEDUP UPSERT`.
4. Parquet 56 archival (>7 dias) — ZSTD nível 6; S3/B2 ~$2/mês/ano.

**PIT API obrigatória**: `quantile_at(rota, q, as_of, window)` — `dylint` CI rejeita `now()` em features de treino. Anti-T9 por construção.

**Storage**: 72 GB em 90 dias comprimido (fator 10× ZSTD); cabe em VPS Hetzner CPX41 $30.90/mês com 60% folga.

**RPO 15 min / RTO < 45 min**.

## 10. Validação shadow & rollout (D10) — ADR-013

**Protocolo em 4 fases (95–125 dias total)**:

- **Fase 1 — Shadow puro (30–60 dias)**: emite sem executar; gates ECE_30d < 0.03, precision@10 ≥ 0.60, DSR > 1.5, coverage ≥ 0.90, abstention < 0.85, n_label_positivo ≥ 500/perfil. Estender para 60 dias se < 3 episódios de regime event observados.
- **Fase 2 — Operador-assisted (30 dias)**: calibra haircut empírico + mede `T3_gap = P(realize|executed) − P(realize|not)`; gate `T3_gap < 0.15` ou propensity + IPW satisfatório.
- **Fase 3 — Canary por rota (14 dias)**: top-20 vol24h em 10 A2 vs 10 A3 split, rotação 7 dias; power analysis Bonferroni p<0.005, n=13.220/braço (ICC=0.02); gate Δprecision@10 ≥ 0.05 significativo.
- **Fase 4 — Rollout gradual (21 dias)**: 20% (dia 1–7) → 50% (8–14) → 100% (15–21); rollback atômico < 1 µs via `ArcSwap`.

**Kill switch 6 gates**: ECE_4h > 0.05, precision@10_24h < baseline_A3 − 0.05, coverage < nominal − 0.05 em ≥ 2 estratos, abstention > 0.95 por 1h, inference_p99 > 100 µs, share_volume > 15% per-rota (desativa per-rota, não kill global). FP rate estimado ~1.5/semana.

**T3 mitigação** (4 camadas): propensity scoring (Rosenbaum & Rubin 1983) + doubly robust (Bang & Robins 2005) + double ML (Chernozhukov et al. 2018) + features proxy (`time_alive_before_emit`, `book_depth_at_entry`, `velocity_spread`) + counterfactual evaluation shadow vs execuço.

**T12 mitigação**: `was_recommended` flag + thresholds 5% flag / 10% alert / 15% desativa ML per-rota + auditoria ECE split semanal + **hold-out 5% rotas** (130 de 2600, rotação 30 dias, única forma de detectar feedback loop < 5%).

**Ablation study em produção**: rotacionar em canary 5% rotas × 3–7 dias removendo (E regime / G cross-route / CQR / adaptive / meta-labeling) para quantificar contribuição marginal.

Dashboard: tikv/rust-prometheus + Grafana + Alertmanager — reliability rolling por estrato, ECE adaptive (Nixon 2019), precision@k por perfil, coverage IC 68/90/95, abstention por reason, haircut empírico, ADWIN status, kill switch history, cluster emissions T7, share_of_volume per-rota.

## Convergência cross-domínio

**Princípios invariantes unânimes**:
- **Baseline A3 ECDF é safety net** em todo o stack — fallback do kill switch D5, barra de comparação em D3, target mínimo em D4.
- **Estratificação por regime D2** end-to-end — feature D3, métrica D4, calibrador D5, detector D6, guard D10.
- **Identidade estrutural `PnL = S_ent + S_sai`** respeitada 100% — baseline `−2·half_spread` em D3, soma em D4, `G(t,t')` em D5/D8.
- **Correção #4 skill** (janela discricionária) implementada em todas camadas — features, labels, calibração.
- **Pairs trading / stat-arb literatura** flagged como extrapolação arriscada em todos os 9 relatórios.

**Budget latência total**:
- D3 features: ~39 µs/rota.
- D1 inferência: ~28 µs/rota.
- D5 calibração: <60 ns/rota.
- D8 thread overhead: +0.8 µs p99.
- **Total ~68 µs/rota** single-thread; com 4 cores paralelos = ~230 µs budget efetivo, folga 3×.

## Red-team consolidado (atualizado 2026-04-20 pós-auditoria C-01..C-10)

1. **Backtest fictício**: precision em backtest observacional pode estar 2× real (T3 inerente). Shadow mode pré-deploy é inegociável.
2. **Rate limiting cadeia**: MIRI não detecta alocação → A2 thread isola blast radius; cold-start cache miss → QuestDB fallback lento.
3. **T8 shift abrupto** (halt exchange-wide): recovery via E5 Hybrid é sub-2h, melhor que E1 puro 13-37h; ainda vulnerável a eventos que afetam >2 venues simultâneas.
4. **T9 leakage silencioso via proc_macro** escapa AST audit. Mitigação: code review + test coverage.
5. **T12 cumulativo** abaixo de 5% per-rota mas agregado elevado. Mitigação: métrica `total_share_executed`.
6. **Operador descalibrado** (floor muito baixo reproduz T1 localmente). Mitigação: UI warning + gate econômico ADR-019.
7. **C-01 Projeções D2 divergem do regime real**. Mitigação estrutural: Marco 0 (ADR-018) coleta empírica + ADR-021 revisão pós-empírica com gatilhos quantitativos de reabertura.
8. **C-03 Silêncio parcial de emissões** (abstention 0.94 + emissões inúteis). Mitigação: ADR-020 gate de volume útil substitui gate binário de abstenção.
9. **C-05/C-08 Modelo ótimo em ML-metrics mas economicamente inútil**. Mitigação: ADR-019 gating econômico direto (gates 7 e 8) + simulação pré-Marco 1.
10. **C-07 Viés sistemático de feed/venue**. Mitigação: ADR-023 LOVO obrigatório em CI bloqueante.
11. **C-06 Adoção pelo operador demora indefinidamente**. Mitigação: ADR-024 protocolo de construção de confiança operacional (5 componentes escalonados).
12. **C-10 Paralisia por análise** (zero código implementado). Mitigação: ADR-018 Marco 0 força iteração empírica antes de qualquer ADR ser tratado como definitivo.
13. **ADR-017 condicional pendente** (janela humana vs emissão sub-segundo). Promoção ou rejeição depende de E4 em Marco 0.

## Métricas de gating de produção (revisadas 2026-04-20 — 10 gates)

Após auditoria crítica (10 críticas C-01–C-10) e aprovação de ADRs 018–024, o kill switch passa de 6 para 10 gates, incorporando proteção econômica direta e volume útil:

**Gates ML tradicionais (6 originais)**:

1. `precision@10_24h ≥ baseline_A3_median − 0.05` (kill switch).
2. `ECE_4h ≤ 0.05` em ≥ 2/3 estratos (kill switch).
3. `coverage_IC95_4h ≥ 0.92` (kill switch).
4. `abstention_rate_1h` — **agora apenas diagnóstico**, não kill switch (ADR-020). Breakdown por razão expõe ação específica.
5. `inference_latency_p99 ≤ 100 µs` (circuit breaker aberto).
6. `storage_growth_24h ≤ storage_budget / retention_days` (alert).

**Gates econômicos (novos — ADR-019)**:

7. `economic_value_over_a3_30d ≥ 0` por ≥ 7 dias consecutivos — se violar, **kill switch** (desliga modelo, volta para A3 puro).
8. `pnl_per_emission_p10_30d ≥ -2 × operator_attention_cost` — se violar, alerta investigação (cauda esquerda muito pesada).

**Gates volume útil (novos — ADR-020)**:

9. `useful_emissions_per_hour_agg_24h ≥ τ_volume_min_agg / 2` (calibrado em Marco 0) por ≥ 6h consecutivas — se violar, **kill switch**.
10. `useful_to_scanner_ratio_1h ≥ 0.01` por ≥ 12h consecutivas — se violar, alerta investigação severa.

**Gates estruturais (em todos Marcos)**:

- Zero-alloc verification antes de deploy.
- Leakage audit CI PASS em todas PRs (ADR-006).
- **LOVO_worst_drop ≤ 0.15** em todas PRs pós-Marco 0 (ADR-023).
- PIT API obrigatória em queries de features de treino.
- Baseline A3 rodando sempre em shadow como safety net.

**Gatilhos automáticos de ADR-021** (revisão pós-empírica):

- Divergência empírica > 20% em qualquer projeção E1–E11 (ADR-018) dispara reabertura automática de ADRs dependentes.
- Sistema marca ADR como `REOPEN_TRIGGERED`; operador tem 7 dias para resolver; CI bloqueia novo merge em ADR não resolvido.

## Nomenclatura de Marcos (após revisão 2026-04-20)

Três marcos sequenciais — versão antes e depois da renumeração:

| Antes | Agora | Escopo |
|---|---|---|
| Marco 1 (original) | absorvido em Marco 0 | infra + A3 |
| — | **Marco 0 (novo, 4-6 sem)** | infra + A3 + **coleta empírica + gates empíricos E1–E11** |
| Marco 2 (original) | **Marco 1 (7-10 sem)** | modelo composto + calibração + shadow |
| Marco 3 (original) | **Marco 2 (10-14 sem total)** | drift + validação + rollout |

Referências cruzadas nos ADRs 019–024 citam "Marco 2/Marco 3" com significado original. Tabela de equivalência em ROADMAP.md §0.
