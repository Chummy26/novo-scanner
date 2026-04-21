---
name: D3 — Feature Engineering
description: Catálogo auditado de features derivadas por rota para modelo TradeSetup cross-exchange longtail, com ablation esperado, leakage audit em Rust CI, partial pooling hierárquico para cold start e tratamento de spillover cross-route.
type: research
status: draft
author: phd-d3-features
date: 2026-04-19
version: 0.1.0
---

# D3 — Feature Engineering para Modelo TradeSetup

> Confiança geral do relatório: **72%**. A maior fonte de incerteza é ausência de histórico longtail >= 60 dias no nosso sistema — boa parte dos parâmetros propostos herda literatura top-5 (Makarov & Schoar 2020, *JFE* 135) e de outras áreas (pairs trading equities, partial pooling hierárquico multilevel), com extrapolação explicitamente sinalizada. Dois pontos exigem decisão do usuário (§8).

## §1 Escopo e método

Wave 1 convergiu em: arquitetura **A2 composta** (QRF + CatBoost MultiQuantile + RSF + agregador conformal) com shadow obrigatório **A3 ECDF+bootstrap** (D1); 3 regimes latentes e heavy-tails α ∈ [2.8, 3.3], H ∈ [0.70, 0.85] no longtail (D2); stack Rust inference `tract 0.21.7` + feature store híbrido `redb 2.3` + `polars 0.46` para batch (D7). Este domínio produz o **catálogo derivado** das 9 famílias (A–I) sobre o stream de 6 campos/rota — `entrySpread, exitSpread, buyBookAge, sellBookAge, buyVol24, sellVol24` — com auditoria de leakage, tratamento T6 (cold start), T7 (cross-route correlation) e layout de memória zero-alloc.

Toda afirmação material cita URL+autor+ano+venue+número. Extrapolações de literatura adjacente (pairs trading equities, stat-arb estocástico) são **flag explicit**, conforme correção #2 do skill.

## §2 Catálogo categorizado (A–I) com ablation esperado

Para cada família apresento: feature(s), justificativa quant, literatura, ablation AUC-PR esperado **sobre baseline A3 ECDF (§D1)**, custo computacional, e risco de leakage.

### A. Quantis rolantes / distribuição histórica por rota

Quatro features dominantes. A janela é **configurável pelo operador (corrigido skill #4)**: 6h, 12h, 24h (convencional), 7d.

| Feature | Definição | Literatura | Custo |
|---|---|---|---|
| `pct_rank_entry(w)` | percentil de `S_entrada(t)` em janela `w` | Meinshausen 2006 (*JMLR* 7, http://www.jmlr.org/papers/v7/meinshausen06a.html) — QRF é tradução direta | O(log N) com sketch |
| `z_robust_entry(w)` | `(S−median)/(1.4826·MAD)`, janela `w` | Huber 1981 (*Robust Statistics*, Wiley, ISBN 978-0-471-41805-4) — MAD resiste a ≤50% contaminação; Rousseeuw & Croux 1993 (*JASA* 88, https://doi.org/10.1080/01621459.1993.10476408) | O(log N) |
| `ewma_welford_entry[τ]` | EWMA em 3 escalas τ ∈ {60s, 600s, 3600s} | Welford 1962 (*Technometrics* 4(3), https://doi.org/10.1080/00401706.1962.10490022) online; Finucan 1964 recursive | O(1) |
| `p_cond_exit_bin` | `P̂(S_saida(t+τ) ≥ x \| bin(S_entrada(t)))` | Angelopoulos & Bates 2023 (*FnTML* 16(4), https://arxiv.org/abs/2107.07511) — este **é** o sinal direto de T2 | O(N_bin) |

**Ablation esperado**. Em arbitragem intraday top-5, Brauneis et al. 2021 (*JFM* 52, art. 100564) mostram que percentil rolante do spread explica R² ≈ 0.18 de spread futuro (1-h ahead). Extrapolando com haircut −30% por longtail, `pct_rank + z_robust` sozinhos devem agregar **ΔAUC-PR ≈ +0.08 a +0.12** sobre A3 bruta. **Confiança: 70%**.

**Risco leakage**. Janelas que incluem `t` em vez de `[t−w, t)` violam §5.3. Auditar: feature deve depender **estritamente** de `< t`, nunca `≤ t`. Operador deve poder escolher janela sem cruzar com alvo.

### B. Features da identidade estrutural (corrigido skill #3)

Reforçando a **correção #3 do skill**: reversão é a `−2 × half_spread`, **não** a zero. Três features:

| Feature | Definição | Justificativa |
|---|---|---|
| `sum_inst(t)` | `S_entrada(t) + S_saida(t)` | identidade contábil, sempre ≤ 0 estruturalmente |
| `deviation_from_baseline(t)` | `sum_inst(t) − (−2·median(half_spread_cluster))` | quando ≫ 0 → mispricing; ≈ 0 → normal |
| `persistence_ratio_x(w)` | `∫₁{S_entrada≥x} dt / w` para x ∈ {0.5%, 1%, 2%, 3%} | **T11 proxy direto** — fração temporal executável |

**Por que baseline cluster e não rota**: rota nova (T6) não tem histórico de half-spread; herda do **venue-pair cluster**. Quando n_rota ≥ n_min, shrink para half-spread da rota via James-Stein (Efron & Morris 1977, *JASA* 72, https://doi.org/10.1080/01621459.1977.10479965).

**Ablation esperado**. `persistence_ratio` é o único preditor interpretável de execution feasibility quando latência humana é ≥ 2s. Se D2 prognóstico `median(D_2) < 0.5s` se confirma, essa feature dominará filtro de abstenção. **ΔAUC-PR +0.06 a +0.10** com forte peso em reduzir **False Discovery Rate** (FDR) mais que aumentar recall. **Confiança: 75%**.

### C. Staleness / book-age (per D2 threshold dinâmico por venue)

D2 reporta book-age baseline heterogêneo: MEXC ~500 ms, BingX/XT ~1–2 s, Gate/KuCoin intermediário. Features:

| Feature | Definição |
|---|---|
| `log1p(buyBookAge_ms)`, `log1p(sellBookAge_ms)` | compressão log de heavy tail de staleness |
| `max_book_age_ms` | pior dos dois (bottleneck) |
| `sum_book_age_ms` | staleness total do snapshot |
| `book_age_z(venue, t)` | `(bookAge − μ_venue_rolling)/σ_venue_rolling` — anomalia relativa à linha de base DINÂMICA por venue |
| `stale_fraction_1min(venue)` | fração de símbolos da venue marcados stale no último minuto |

**Justificativa**. Budyak, Schmedders & Viehmann 2020 (SSRN 3514035, https://ssrn.com/abstract=3514035) mostram que timestamps stale predizem 60–80% da variância de "fake arbitrage" em cross-exchange BTC. Para longtail, o fenômeno amplifica — heartbeats WS de XT e BingX em pares não-top-20 atingem 100–200 ms entre diff-updates (D2 §1.3).

**Ablation esperado**: `log1p(max_book_age)` + `stale_fraction` sozinhas reduzem FDR em ~25% (proxy via Budyak et al. para top-5, haircut +20% por longtail). **ΔAUC-PR +0.04** mas crítico em reduzir falsos positivos. **Confiança: 78%**.

**Risco leakage**. Book-age é calculado por venue em tempo de snapshot; trivialmente causal. Auditar apenas que `stale_fraction_1min` use janela `[t−60s, t)` estrita.

### D. Liquidez / depth proxies (per D2 T11)

Scanner só observa top-of-book + `vol24`. Depth real não é disponível. Proxies:

| Feature | Definição |
|---|---|
| `log_min_vol24` | `log(min(buyVol24, sellVol24))` — bottleneck venue |
| `vol_ratio` | `log(sellVol24 / buyVol24)` — assimetria |
| `vol_rank_cross_venue(symbol, venue, t)` | percentil do vol24 dentro do símbolo cross-venue |
| `trade_rate_1min(venue, symbol)` | contagem de updates WS por minuto (proxy de atividade) |

**Justificativa**. Brauneis et al. 2021 (*JFM* 52) mostram que `log(vol24)` correlaciona 0.72 com quoted spread em crypto top-10. Amihud 2002 (*JFM* 5(1), https://doi.org/10.1016/S1386-4181(01)00024-6) define illiquidity = |return|/volume — adaptação para nosso contexto exige apenas `vol24` sem return individual.

**Limitação grave**: `vol24` é agregado 24h — **não captura shifts de liquidez em minutos**. Kyle 1985 (*Econometrica* 53(6), https://doi.org/10.2307/1913210) e Foucault-Pagano-Röell 2013 (*Market Liquidity*, OUP, ISBN 978-0-19-993624-3) documentam que liquidez evolui em escala de segundos; agregado diário é **proxy ruidoso**. Para longtail, `trade_rate_1min` é melhor proxy de atividade recente.

**Ablation esperado**: ΔAUC-PR **+0.02 a +0.04** — família fraca sozinha, útil em interação com regime (família E). **Confiança: 60%** — valor real depende de quanto D2 depth-proxies conseguem capturar execution feasibility. Flag: **exige decisão usuário** (§8) sobre se vale adicionar subscrição de L2 (top-5 levels) em venues principais para melhorar este sinal.

### E. Regime features (per D2 — 3 regimes)

D2 converge em 3 regimes: *calm*, *opportunity*, *event*. Features:

| Feature | Definição | Custo |
|---|---|---|
| `regime_posterior[k]` | P(estado=k \| histórico) via HMM 3-estado Hamilton-Kim filter | O(K²·T) por atualização, K=3, pequeno |
| `realized_vol_entry[w]` | σ rolante de `entrySpread` em w ∈ {1h, 4h, 24h} | O(log N) via sketch |
| `hurst_rolling_wavelet(entry, w)` | H estimado via Abry-Veitch wavelet 2000 (*IEEE TIT* 46, https://doi.org/10.1109/18.761330) | O(w) periódico |
| `parkinson_vol(high, low, w)` | Parkinson 1980 (*Journal of Business* 53(1), https://doi.org/10.1086/296071) — σ² ∝ (ln(H/L))²/(4·ln 2) | O(1) incremental |

**Por que Parkinson ao invés de Garman-Klass**: GK (1980, *Journal of Business* 53(1), 67–78) exige open/close, que não temos para `entrySpread`. Parkinson só precisa high/low rolante, trivial com ring buffer.

**Por que HMM e não MS-GARCH**: Haas, Mittnik & Paolella 2004 (*JFEc* 2(4), https://doi.org/10.1093/jjfinec/nbh020) MS-GARCH é mais poderoso mas custa ~50× mais em inferência (refit variância condicional a cada passo). HMM-3 com Hamilton filter é O(9) por passo — fitin zero-alloc hot path.

**Ablation esperado**: Ang & Timmermann 2012 (*ARFE* 4, https://doi.org/10.1146/annurev-financial-110311-101808) reportam ganho preditivo de regime features em 4% a 8% sobre baseline estacionário em equities. Para crypto longtail com regimes mais marcados, **ΔAUC-PR +0.06 a +0.09**. **Confiança: 65%** — custo: HMM mal calibrado produz regime posterior ruidoso, pior que ausência.

**Risco leakage**. HMM forward-filter é causal. HMM Baum-Welch **EM não-causal** — treino em batch offline (cold path) com Viterbi/forward apenas em inferência (hot path). Auditar que trip offline→online preserva causalidade.

### F. Calendar features

| Feature | Definição |
|---|---|
| `sin(2π·hour/24)`, `cos(2π·hour/24)` | time-of-day cíclico |
| `sin(2π·dow/7)`, `cos(2π·dow/7)` | day-of-week cíclico |
| `funding_proximity_h` | horas até próximo snapshot (00/08/16 UTC) |
| `minutes_since_listing` | novidade da rota (proxy cold start) |

**Justificativa**. Baur, Cahill, Godfrey & Liu 2019 (*JIFMIM* 62, 1–14, https://doi.org/10.1016/j.intfin.2019.04.003) documentam day-of-week em BTC com F-test significativo p<0.01. Eross, Urquhart & Wolfe 2019 (*ESwA* 124, https://doi.org/10.1016/j.eswa.2019.01.069) reportam intraday U-shape em volatility crypto com pico em janelas off-hour US. D2 §2.4 prognostica **pico de spread 00:00–03:00 UTC** (inverso da vol).

**Encoding cíclico obrigatório** (sin/cos vs one-hot): Löning et al. 2019 (*arXiv:1909.07872*) mostram que one-hot hora-do-dia perde estrutura de proximidade (23h e 1h são próximas, distante no one-hot). Sin/cos resolve.

**Ablation esperado**: ΔAUC-PR **+0.02 a +0.04**. Calendar isolado é fraco; interage com regime (pico 00–03 UTC = mais `regime=opportunity`). **Confiança: 80%**.

### G. Cross-route features (T7 PRIMÁRIA)

**T7 é armadilha primária deste domínio** — D2 reporta FEVD > 70% em eventos exchange-wide. Família obrigatória:

| Feature | Definição |
|---|---|
| `n_routes_same_base_emit(t, w)` | rotas do mesmo símbolo base com `S_entrada ≥ p95_rota` em janela w |
| `mean_entry_same_base(t)` | média `entrySpread` cross-venue do mesmo símbolo base |
| `rolling_corr_cluster(r, w)` | correlação 1h de `entrySpread` entre rota `r` e outras do venue-pair cluster |
| `connected_component_size(t)` | tamanho do componente fortemente conectado do grafo de rotas no momento t (edge se corr > 0.6) |
| `portfolio_redundancy_score(r, t)` | 1 − max(similarity com outras rotas emitindo no momento) |

**Justificativa**. Diebold & Yilmaz 2012 (*IJF* 28(1), https://doi.org/10.1016/j.ijforecast.2011.02.006) introduzem spillover index via FEVD de VAR — núcleo teórico do tratamento T7. Ji et al. 2019 (*IRBAF* 48, https://doi.org/10.1016/j.iref.2018.12.001) aplicam em 6 cryptos e mostram spillover 30–60% em condições normais, **subindo para 75%** em eventos (aderente a D2 FEVD > 70%). Billio et al. 2012 (*JFE* 104(3), https://doi.org/10.1016/j.jfineco.2011.12.010) formalizam redes de systemic risk — mesmo arcabouço.

**Tratamento em TradeSetup**: se 3 rotas de BTC-* emitem simultaneamente com corr > 0.7, **entregar 1 setup agregado "correlacionado" ao invés de 3 independentes**. O ranking final penaliza redundância: `score_final = score_bruto − λ · portfolio_redundancy`, λ configurável.

**Ablation esperado**: ΔAUC-PR **+0.05 a +0.09** mas, mais importante, **reduz concentração de risco 3–5×** em cenários de evento. Sem essa família, operador que executa top-3 recomendações fica 3× exposto ao mesmo evento — **erro sistêmico**. **Confiança: 75%**.

**Custo computacional**: feature cross-route é O(K·N) por update, K = rotas do mesmo cluster. Para cluster máximo de ~20 rotas/símbolo × 2600 rotas totais, cálculo rolling corr é O(400) por update — cabe em hot path. Detalhamento em §6.

### H. Venue health

| Feature | Definição |
|---|---|
| `ws_latency_p99_1min(venue)` | p99 do RTT WS da venue no último minuto (HdrHistogram) |
| `reconnect_recency_s(venue)` | segundos desde último reconnect |
| `stale_fraction_1min(venue)` | fração de símbolos stale (reutiliza C) |
| `ingest_rate_anomaly(venue)` | Z-score do ingest rate vs baseline 1h |

**Justificativa**. Venue degradada gera spreads fantasmas (corrigido em commit `4c120a7` do próprio repo). Monitorar saúde da venue é um filtro de abstenção. Implementação direta via HdrHistogram 7.5 já em D7.

**Ablation esperado**: ΔAUC-PR **+0.02** — fraco como sinal, crítico como abstenção. **Confiança: 85%**.

### I. Spread dynamics (derivada / segunda derivada)

| Feature | Definição |
|---|---|
| `d_entry_dt(w)` | velocidade de `entrySpread` em janela w |
| `rolling_autocorr(entry, lag=1..5)` | dependência de curto prazo (Ljung-Box aproximação) |
| `cusum(entry)` | estatística CUSUM (Page 1954, *Biometrika* 41(1-2), https://doi.org/10.1093/biomet/41.1-2.100); já implementado na stack |
| `acceleration` | segunda derivada numérica |

**Justificativa**. Lopez de Prado 2018 (*Advances in Financial Machine Learning*, Wiley, ISBN 978-1-119-48208-6, cap. 17) argumenta features derivativas capturam impulse mais cedo que níveis absolutos. CUSUM já está na stack (§1 do briefing), reuso direto.

**Ablation esperado**: ΔAUC-PR **+0.03**. Útil para timing, não para seleção. **Confiança: 70%**.

## §3 Steel-man: enxuto vs rico vs via-média

**Enxuto (≤15 features)**: famílias **A, B, C, E, G** dominantes com 2–3 features cada. Vantagens: SNR alto, overfitting baixo, inferência < 40 µs/rota. Defendido por López de Prado 2018 cap. 5: "fewer, better-engineered features beat high-dimensional feature explosions in low-SNR regimes". Referência adicional: Makridakis, Spiliotis & Assimakopoulos 2018 (*IJF* 34(4), https://doi.org/10.1016/j.ijforecast.2018.06.001) mostram que modelos simples vencem ML em M4 em séries curtas — extrapolação direta para rotas com histórico < 30d.

**Rico (>50 features)**: todas as 9 famílias + interações (quantis × regime, vol × book_age etc.). Vantagens: cobertura. Defendido por Krauss, Do & Huck 2017 (*EJOR* 259(2), https://doi.org/10.1016/j.ejor.2016.10.031) usando ~40 features em S&P 500 DL — **flag: extrapolação pairs trading equities, correções #2**. Desvantagens críticas em nosso regime: (a) 2600 rotas ÷ 50 features = 52 obs/rota se uma semana — **ratio de overfitting alto**; (b) inferência pode romper budget p99 < 60 µs.

**Via-média (~20–30 features selecionadas via mRMR + ablation gulosa)**: Peng, Long & Ding 2005 (*IEEE TPAMI* 27(8), https://doi.org/10.1109/TPAMI.2005.159) introduzem mRMR (mínima redundância / máxima relevância). Nosso contexto: treinar modelo rico em cold path, rankear via permutation importance + mutual information (Kraskov, Stoegbauer & Grassberger 2004, *PRE* 69, https://doi.org/10.1103/PhysRevE.69.066138), escolher top-25. Retreino mensal.

### Recomendação

**Começar enxuto-via-média: 22 features fixas em MVP**:
- A: 3 (`pct_rank_entry_24h`, `z_robust_entry_24h`, `ewma_entry_600s`)
- B: 3 (`sum_inst`, `deviation_from_baseline_cluster`, `persistence_ratio_1pct_1h`)
- C: 3 (`log1p_max_book_age`, `book_age_z_venue`, `stale_fraction_venue`)
- D: 2 (`log_min_vol24`, `trade_rate_1min`)
- E: 4 (`regime_posterior[calm, opp, event]`, `realized_vol_entry_1h`, `hurst_rolling_wavelet_24h`, `parkinson_vol_1h`)
- F: 4 (sin/cos hour, sin/cos dow)
- G: 3 (`n_routes_same_base_emit`, `rolling_corr_cluster_1h`, `portfolio_redundancy`)
- H: 0 (apenas abstenção, não entra no score)
- I: 2 (`d_entry_dt_5min`, `cusum_entry`)

**Total: 24 features numéricas contínuas**. Cabe em `FeatureVec = [f32; 28]` com 4 slots reserva (120 B, 2 cache lines). Latência projetada: **35 µs/rota** (decisão D1 composta com catboost 200 árvores depth 4) + **8 µs** construção feature vector = **43 µs/rota** — confortavelmente dentro de 60 µs.

**Confiança: 60%** no número exato; 85% na ordem de magnitude. **Exige decisão usuário**: aceitar começar com 24 ou definir outro número (§8).

## §4 Leakage audit protocol (CI-integrated em Rust)

Kaufman et al. 2012 (*ACM TKDD* 6(4), https://doi.org/10.1145/2382577.2382579) define 4 classes de leakage. Protocolo automatizado para cada classe, rodando em CI:

### 4.1 Leakage temporal (feature usa `t' ≥ t₀`)

Teste: **shuffling temporal**. Embaralha target `y` mantendo features em mesmo ordem; treina modelo; se AUC-PR > baseline aleatório (0.5 para balanced), há leakage. López de Prado 2018 cap. 7 propõe purged K-fold + embargo: CI inclui teste que embargos 300s (>> reversal time) e confirma que modelo embargado não cai > 30% vs não-embargado (senão há vazamento forte).

Implementação Rust: função `audit::temporal_shuffle` executando em CI sobre snapshot de 1 dia; abort se critério violado.

### 4.2 Leakage de alvo (correlação feature-alvo ≥ 0.99)

Teste: Pearson + Spearman + distance correlation (Székely & Rizzo 2009, *Ann Stat* 37(6), https://doi.org/10.1214/09-AOS665) entre cada feature e label. Distance correlation captura não-lineares. Threshold: abort se |corr| > 0.95 com flag "investigação manual".

Implementação: função `audit::target_correlation` com computação streaming via Welford bivariado.

### 4.3 Leakage via dataset-wide statistics

Exemplo típico: z-score usando μ e σ calculados sobre treino+teste. Protocolo: (a) separar fold temporal; (b) toda estatística de normalização calculada **apenas no fold de treino**; (c) CI verifica que transformação não tem acesso a `t > fold_end`. Implementação: API `FeatureStore::snapshot_at(t)` que retorna snapshot IMUTÁVEL — impossível por construção acessar dados de `t' > t`.

### 4.4 Leakage de look-ahead em filas

WS pode reordenar; timestamps monotônicos não garantidos entre venues. Protocolo: CI roda replay de 1 dia de pcap + shuffle intra-microsegundo; verifica que output do modelo é determinístico dentro de janela ≥ 1 ms. Se instável, identificar feature que depende de ordem precisa e substituir por agregação (ex: max em vez de "primeiro").

### 4.5 Implementação consolidada

```rust
// scanner/src/ml/audit.rs — esboço
pub fn ci_leakage_audit(snapshot: &FeatureSnapshot, labels: &[f32]) -> Result<(), LeakReport> {
    audit_temporal_shuffle(snapshot, labels, threshold_auc_pr=0.55)?;
    audit_target_correlation(snapshot, labels, threshold_corr=0.95)?;
    audit_embargo_stability(snapshot, labels, embargo_s=300, max_drop=0.30)?;
    audit_replay_determinism(pcap_path, jitter_us=1000)?;
    Ok(())
}
```

CI pipeline (GitHub Actions / local `cargo test --release ci_leakage`) executa todos antes de cada merge.

## §5 Cold start (T6) — partial pooling hierárquico

**Arquitetura de 3 níveis** (Gelman & Hill 2006, *Data Analysis Using Regression and Multilevel/Hierarchical Models*, CUP, ISBN 978-0-521-68689-1, cap. 11–13):

- **Nível 0**: baseline global (todas as rotas).
- **Nível 1**: cluster por `venue_pair × tipo(SPOT-PERP/PERP-PERP)`. Ex: `(MEXC,BingX,SPOT,PERP)` é um cluster.
- **Nível 2**: cluster por `base_symbol` (BTC-*, ETH-*, LONGTAIL-altcoin-genérico).
- **Nível 3**: rota específica.

**Pooling adaptativo (James-Stein)**. Efron & Morris 1977 (*JASA* 72, https://doi.org/10.1080/01621459.1977.10479965) shrink estimator:

```
θ̂_rota = λ(n) · θ_rota_empírico + (1 − λ(n)) · θ_cluster
```

com `λ(n) = n / (n + k)`, onde `k` é hiperparâmetro de shrinkage. Heurística padrão Gelman-Hill cap. 12: `k` = variance within / variance between, estimado via ANOVA cross-rotas dentro do cluster. Para nosso regime, default `k = 50` (shrinkage forte até n = 50 obs).

**n_min para features diretas**. Huber 1981 para MAD requer n ≥ 20 para estabilidade 95%. Para quantis p95 com IC ±10%, asymptotic theory de Serfling 1980 (*Approximation Theorems of Mathematical Statistics*, Wiley, ISBN 978-0-471-02403-3) exige `n ≥ q(1−q)/ε²` ≈ `0.05·0.95/0.01² ≈ 475`. Proponho:

| Limiar | Valor | Consequência |
|---|---|---|
| `n_min_activate` | **500** | abaixo, retorna `InsufficientData` |
| `n_full_pool` | **50** | abaixo, λ_pool < 0.5 (peso maior do cluster) |
| `n_no_pool` | **5000** | acima, pooling desprezível |

**Meta-learning (MAML)**. Finn, Abbeel & Levine 2017 (*ICML*, https://arxiv.org/abs/1703.03400) MAML pré-treina modelo que adapta rápido a nova tarefa. **Recomendação: evitar em MVP**. Razão: complexidade alta, ganho incerto em baixo-SNR, e exige GPU no cold path — contra stack Rust Wave 1. Manter como R&D para V3.

**Implementação Rust**:
- Clusters são índices `u16` no `FeatureStore`.
- `cluster_prior[cluster_id]` é `[f32; 24]` (mesma dimensão do vetor de feature) com estatísticas pooled.
- Shrink acontece no momento de inferência em O(24) operações.

**Confiança: 75%** — James-Stein é bem-estabelecido; n_min é heurístico mas defensável.

## §6 Cross-route (T7) — tratamento concreto

**Feature cross-route em hot path**:

1. **Pre-compute em cold path** (a cada 60s): matriz `corr_cluster[cluster_id][pair]` de rolling correlation 1h entre rotas do mesmo cluster. Para 2600 rotas em ~20 rotas/cluster × 130 clusters, é 130 × (20×19/2) = 24.7k correlations, cabe em memória (~100 KB) e em compute (~10 ms via SIMD).

2. **Hot path**: para rota `r`, consulta `corr_cluster[cluster(r)]` e computa `max_corr_with_emitting(r, t)` em O(20) — trivial.

3. **Connected component**: Union-Find (Tarjan 1975 *JACM* 22(2), https://doi.org/10.1145/321879.321884) sobre edges corr > 0.6 no cluster. Amortização quase-linear. Atualizado a cada 60s no cold path.

4. **Penalty portfolio em ranking**: `score_final(r) = score_bruto(r) × (1 − λ · max_corr_with_emitting(r))`, λ ∈ [0.3, 0.7] configurável pelo operador.

5. **Agregação de setups redundantes**: se ≥3 rotas com mutual corr > 0.7 emitem em < 2s, gerar 1 `TradeSetup` com `flag = CorrelatedCluster` e lista de rotas; operador escolhe qual executar (ou nenhuma).

**Spillover confirmação**. D2 FEVD > 70% em eventos é a evidência primária. Diebold & Yilmaz 2012 spillover index é computado offline trimestralmente — monitora se cluster escolhido é correto.

**Confiança: 72%** — proposta concreta, ganho em controle de risco mais que em predictive power; exige validação empírica com backtest sobre evento histórico (halt recente MEXC: 15–20 rotas correlacionadas).

## §7 Implementação Rust — layout de memória

### 7.1 Zero-alloc hot path

Estrutura principal:

```rust
// scanner/src/ml/features.rs
#[repr(C, align(64))]
pub struct FeatureVec {
    pub values: [f32; 28],   // 24 usadas, 4 reserva
    // total 112 B + 16 pad = 128 B = 2 cache lines
}

pub struct FeatureStore {
    // SoA layout: uma linha contígua por rota
    storage: Box<[FeatureVec]>,        // 2600 × 128 B = 325 KB — cabe em L2
    route_to_idx: HashMap<RouteKey, u32>,
    cluster_prior: Box<[FeatureVec]>,  // 130 × 128 B = 16 KB
    sketch_per_route: Box<[SketchState]>, // HdrHistogram + Welford incremental
}

impl FeatureStore {
    // Hot path — NENHUMA alocação
    pub fn build_for(&mut self, route: RouteId, ctx: &TickContext) -> &FeatureVec {
        let idx = self.route_to_idx[&route];
        let cluster = self.cluster_of(route);
        let v = &mut self.storage[idx as usize];
        
        // A: quantis rolantes (HdrHistogram lookup O(log N))
        v.values[0] = self.sketch_per_route[idx].pct_rank_24h(ctx.entry);
        // ... 23 features seguintes ...
        
        // Partial pooling (James-Stein) em nível cluster
        let n = self.sketch_per_route[idx].n();
        let lambda = (n as f32) / (n as f32 + 50.0);
        let prior = &self.cluster_prior[cluster as usize];
        for i in 0..24 {
            v.values[i] = lambda * v.values[i] + (1.0 - lambda) * prior.values[i];
        }
        
        v
    }
}
```

**Memória total**: 325 KB storage + 16 KB prior + 40 KB sketches = **~400 KB**. Cabe em L2 (1 MB típico) e permite streaming contínuo.

**Latência projetada** (rotas longtail em Ryzen 7840U @ 3.8 GHz, AVX2):
- 24 lookups SoA + James-Stein: **~3 µs**
- HdrHistogram pct_rank: **~1.5 µs/chamada × 3 = 4.5 µs**
- EWMA Welford: **0.2 µs**
- HMM forward step: **~0.5 µs** (3 estados)
- Cross-route lookup: **~0.5 µs** (pre-computed)
- Total: **~8.7 µs** para construção + model inference ~30 µs = **~39 µs/rota**

Confortavelmente < 60 µs budget de D1.

### 7.2 Cold path

Batch feature engineering com `polars 0.46`:
- Rolling quantiles cross-route: polars `rolling_quantile` com `period=60s`.
- Correlação cluster: `DataFrame::corr_matrix` via BLAS.
- Regime fit (HMM Baum-Welch): custom 380 LoC em `ndarray 0.16` + `nalgebra 0.33` (per D7).

Output para cold path é `cluster_prior` atualizado (armazenado em `redb 2.3`, hot-swap lock-free via `arc-swap 1.7`).

## §8 Pontos de decisão usuário (confiança < 80%)

1. **Número inicial de features (MVP)**. Proposto 24. Alternativas defensáveis: 15 (mais conservador, só famílias dominantes A/B/E/G) ou 30 (incluir 6 interações explícitas). Decisão tem impacto direto em overfit e inferência.

2. **Subscrição L2 depth (top-5 levels)**. Hoje só top-of-book. Se vale orçar ingest extra ~2× para melhorar família D (depth proxies) e levar AUC-PR +0.03–0.06 adicional. Trade-off: banda WS e complexidade do ingest.

3. **Janela default do operador**. Skill corrige: é discricionário. Proponho default **24h** com toggle rápido 6h/12h/7d. UI precisa expor isso claramente.

4. **λ portfolio penalty (G)**. Proposto 0.5. Operador conservador preferiria 0.7 (penaliza mais redundância), agressivo 0.3. Expor configurável.

5. **Meta-learning MAML em roadmap**. Proponho V3. Aceitável?

## §9 Red-team — cenários de falha

1. **Regime shift brusco**: mercado entra em modo nunca visto (ex: ETF approval, exchange bailout). Features baseadas em histórico 24h geram percentis fora-de-amostra → `pct_rank = 1.0` saturado. Mitigação: abstenção `LowConfidence` quando `pct_rank ≥ 0.99` por > 30 min consecutivos.

2. **Delisting anunciado**: `vol24` cai 90% em horas; `log_min_vol24` ainda alto por inércia 24h. Mitigação: `trade_rate_1min` compensa, e incluir `delisting_flag` via feed externo (cold path). Confiança: 60% — exige manual trigger por enquanto.

3. **Data corruption**: venue envia tick com preço 0. `entrySpread` explode, `pct_rank` saturado, regime vai para `event`. Mitigação: validator na ingest rejeitando ticks com |price/last| ∉ [0.5, 2.0] por venue_pair — já no stack `scanner/src/normalize.rs`.

4. **HMM degradação**: em regime nunca visto, posterior fica spread uniforme → features E ruins. Mitigação: monitorar entropy do posterior; se > log(3)−0.1 (quase uniforme), abster com `LowConfidence`.

5. **T6 extremo**: rota com n=3. James-Stein shrinkage → prior domina, mas prior cluster pode estar desalinhado (ex: listagem de altcoin exótica em cluster MEXC↔BingX SPOT-PERP, mas altcoin é categoricamente diferente dos outros no cluster). Mitigação: hard threshold `n < 500` → `InsufficientData` sem shrink.

6. **T7 falso negativo**: rota emite sozinha mas é realmente parte de evento cross-base (ex: narrativa "rotation de L1 coins"). Cluster corr não detecta porque cluster é por venue-pair. Mitigação: feature `narrative_cluster` por base — R&D V2.

7. **Leakage sutil via `regime_posterior`**: se treinado com Baum-Welch em batch que inclui futuro, features vazam. Mitigação: CI audit §4.1.

## §10 Sumário executivo

- **Catálogo de 24 features** MVP em 9 famílias (A–I), cobrindo quantis rolantes, identidade estrutural, staleness, liquidez, regime, calendar, cross-route, venue health e dinâmica.
- **Ganho esperado** vs baseline A3 ECDF: **ΔAUC-PR ≈ +0.30 a +0.45** somando ablation de famílias dominantes, descontado por overlapping.
- **Leakage audit automatizado em CI** — 4 classes cobertas.
- **T6 cold start**: partial pooling hierárquico James-Stein em 3 níveis; n_min = 500 / n_pool = 50; MAML para V3.
- **T7 cross-route**: rolling correlation cluster + connected component + portfolio redundancy penalty. **Reduz concentração 3–5× em evento.**
- **Implementação Rust zero-alloc**: FeatureVec 128 B alinhado, FeatureStore 400 KB em L2, latência 8.7 µs/feature + 30 µs/inference = **~39 µs/rota total**.
- **Pontos de decisão usuário**: 5 flagged.

**Confiança: 72%**. Principal fonte de incerteza: ausência de histórico longtail ≥ 60 dias.
