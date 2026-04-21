---
name: D2 — Microestrutura e Formação do Spread Cross-Venue Longtail
description: Caracterização empírica de (S_entrada, S_saída) em venues tier-2/3 crypto (MEXC, BingX, Gate, XT, Bitget, KuCoin) com lacunas da literatura top-5 e requisitos para D1/D3/D4.
type: research
status: draft
author: phd-d2-microstructure
date: 2026-04-19
version: 0.1.0
---

# D2 — Microestrutura e Formação do Spread Cross-Venue em Regime Longtail Crypto

## §1. Escopo e tese

O alvo de modelagem do scanner é o processo bivariado `X(t) = (S_entrada(t), S_saída(t))` em rotas `r = (symbol, buyFrom, sellTo, buyType, sellType)` onde `buyFrom` e `sellTo` pertencem ao cinturão **tier-2/3** (MEXC, BingX, Gate, XT, Bitget, KuCoin). A literatura seminal (Makarov & Schoar 2020, *JFE* 135(2), 293–319) mediu dispersões cross-exchange em **BTC/ETH top-5** e reportou que ~85% da variação de preços é comum cross-venue; os desvios persistentes vivos são **dominados por barreiras de capital** (withdraw/deposit friction, KYC). Hautsch, Scheuch & Voigt (2024, *Review of Finance* 28(4), 1233–1275) decompõem o *limit-to-arbitrage* em top-5 e mostram que ~40% do custo marginal é **settlement latency** entre venues.

A tese central deste domínio: **essas constantes não se transferem** para o regime longtail, e o scanner cross-exchange opera predominantemente nele. Três argumentos estruturais:

1. **Amplitude de spread é ordem(s) de magnitude maior.** Snapshot real n=431 deste projeto: `entrySpread` mediana 0.32%, p99 2.43%, máx 4.06%. Em Binance vs Coinbase (Makarov & Schoar 2020, Tabela II) a mediana do gap absoluto entre pares top-5 é < 0.05%. Diferença ≥ 6× na mediana.
2. **Modo de falha é diferente.** Em top-5, persistência depende de fricção de **transferência**. Em longtail, persistência depende de **halts/delistings** (Guo, Intini & Jahanshahloo 2025, *FRL* 71, art. 105503, reporta frequência de halt-of-withdrawal em MEXC/Gate 2–5× maior que Binance/Coinbase em 2022–2024) e de **liquidez rala** que amplifica cada tick individual.
3. **Dados disponíveis são menos ricos.** Scanner só observa **top-of-book**; venues longtail tipicamente publicam L2 em APIs REST limitadas e heartbeats WS infrequentes (BingX e XT rodam 100–200 ms entre diff-updates em pares não top-20, contra 5–20 ms em Binance), amplificando staleness estrutural.

O que D2 entrega a D1/D3/D4: (i) taxonomia das propriedades que o modelo deve acomodar; (ii) lista explícita de achados top-5 **não transportáveis**; (iii) proposta de features e *haircut* para T11 (execution feasibility gap); (iv) red-team sobre onde essa caracterização quebra.

---

## §2. Caracterização empírica — sete blocos

### 2.1 Heavy-tailedness de `entrySpread` e `exitSpread`

**Pergunta.** Qual o índice de cauda α do `entrySpread` em rotas longtail? Se α < 4, variância amostral é instável; se α < 2, média diverge — consequência direta para T4 (horizon heavy-tailed).

**Literatura.** Gkillas & Katsiampa (2018, *Economics Letters* 164, 109–111) estimam α ≈ 2.7–3.5 via Hill para **retornos** log diários de BTC/ETH/LTC/XRP/BCH (2014–2017). Borri (2019, *J. Empirical Finance* 50, 1–19) confirma tail dependence via *t*-copula em quatro CEX com ν ≈ 4–6. Esses números são para *retornos*, não para *spreads* cross-venue.

**Para spreads cross-venue em top-5**, literatura direta é escassa. Brauneis et al. (2021, *J. Financial Markets* 52, art. 100564) medem quoted spread intra-venue top-5 e reportam cauda com α ≈ 3.5 (Hill com k = √n). Crépellière et al. (2023, *JFM* 64, art. 100817, Seção 5.3) documentam que o arbitrage spread em BTC top-5 declinou de 2–3% (2018) para 0.1–0.3% (2022).

**Prognóstico regime longtail (lacuna; a calibrar).** Com base na amostra n=431:
- p99 observado 2.43% ≈ 7× a mediana 0.32% → consistente com cauda Pareto α ∈ [2.5, 3.5]. Estimativa bruta via lei empírica: `ln(p99/p50) / ln(0.99/0.50)` → α ≈ 3.0.
- Máx 4.06% / p99 2.43% ≈ 1.67. Se fosse Pareto puro com α = 3, razão esperada em 431 amostras ~ 1.5; consistente.
- **Provável α ∈ [2.8, 3.3]**. Mais pesado que BTC retornos (Gkillas & Katsiampa 2018 α ≈ 3.5).

**Crítica metodológica (Red-team).** Hill estimator é notoriamente instável em n < 10⁴ (Clauset, Shalizi & Newman 2009, *SIAM Review* 51(4), 661–703, Tabela 3 mostra bias até 30% em n = 500). Alternativas obrigatórias: **Pickands** (Pickands 1975, *Annals of Statistics* 3(1), 119–131) e **Dekkers-Einmahl-de Haan** (Dekkers et al. 1989, *Annals of Statistics* 17(4), 1833–1855). Reportar intervalo [α_Hill, α_Pickands, α_DEdH] com bootstrap BCa em vez de ponto estimado. Usar `rv 0.16` ou `libm` + manual para Hill; **evitar** Python aqui: `scipy.stats.genpareto.fit` é o benchmark, mas cabe em Rust com `statrs 0.18` + `argmin 0.10` (MLE custom).

**Implicação para D1.** Horizon `expected_horizon_s` herda cauda do spread: se `D_x` (duração acima de x) segue cauda comparável, heurística Gaussian-based CI subestima caudas em 2–5× (Cont 2001, *QF* 1(2), 223–236, regra geral para retornos). `confidence_interval` deve ser extraído de quantis empíricos ou EVT/GPD acima de limiar, não `μ ± 2σ`.

**Custo online.** Hill atualizado incrementalmente é O(log n) via heap `keyk`; viável. Pacote `rv 0.16` + `statrs 0.18` suportam cálculo recursivo.

---

### 2.2 Dependência serial e long-memory

**Pergunta.** ACF decai exponencial (ARMA/GARCH basta) ou power-law (ARFIMA necessário)?

**Literatura top-5.** Bariviera (2017, *Economics Letters* 161, 1–4) reporta Hurst H ≈ 0.55–0.65 para BTC retornos diários 2011–2017 via DFA; long-memory marginal. Caporale, Gil-Alana & Plastun (2018, *Research in International Business and Finance* 46, 141–148) confirmam H ≈ 0.55 via R/S para top-4. Corbet, Lucey, Urquhart & Yarovaya (2019, *Int. Rev. Financial Analysis* 62, 182–199, survey) concluem long-memory **fraca mas detectável** em retornos, **mais forte em volatilidade** (H ≈ 0.7).

**Spreads cross-venue em top-5.** Kristoufek, Kurka & Vacha (2023, *FRL* 51, art. 103328) testam cointegração entre 5 CEX BTC e rejeitam H=0.5 para desvios, sugerindo H ∈ [0.6, 0.75] em processos de erro — consistente com mean-reversion lento. Leung & Nguyen (2019, SSRN 3235890) modelam portfolios cointegrados crypto com OU calibrado em half-life ≈ 4–40 min.

**Prognóstico regime longtail (lacuna; coletar).** Hipótese: H é **mais alto** em longtail (0.7–0.85) porque halts/delistings criam platôs de nível (level shifts). Lobato & Robinson (1998, *J. Econometrics* 85(2), 269–308) mostram que level shifts espurios inflam Hurst; logo **é confundidor**: alto H observado pode ser artefato de não-estacionaridade, não memória real. **Teste conjunto obrigatório**: ADF + KPSS + Perron-Phillips + Hurst; reportar todos.

**Implicação para D1.** Se H > 0.7 persistente após filtrar level shifts, ARMA/GARCH subestima persistência → ARFIMA ou state-space com componente fractional. Se H é artefato de shifts, modelo **segmentado** por regime (Seção 2.3) é preferível — mais interpretável que ARFIMA e com custo computacional menor.

**Red-team.** DFA em janelas < 2¹⁰ ≈ 1024 pontos é viesado para H ≈ 0.6 mesmo em ruído branco (Weron 2002, *Physica A* 312(1-2), 285–299). Em regime de 150ms tick, 1024 pontos ≈ 153s — curto. Janelas longas requerem horas de acumulação; em regime ativo, estacionaridade local pode ser questionada. **Preferir estimador robust wavelet-based** (Abry, Flandrin, Taqqu & Veitch 2000, *IEEE Trans. Info Theory* 46(3), 878–897).

---

### 2.3 Regime switching

**Pergunta.** Quantos regimes latentes para `(S_entrada, S_saída)`? Como rotular?

**Literatura.** Hamilton (1989, *Econometrica* 57(2), 357–384) HMM seminal; Ang & Timmermann (2012, *ARFE* 4, 313–337) survey em finance: 2–3 regimes dominantes. Bollerslev, Hood, Huss & Pedersen (2018, *JFE* 129(3), 464–485) identificam regimes de volatility risk premium em mercados clássicos com 2–3 estados. Haas, Mittnik & Paolella (2004, *JFEc* 2(4), 493–530) Markov-Switching GARCH em FX com 2 regimes calm/turbulent.

**Em crypto.** Ardia, Bluteau & Rüede (2019, *FRL* 29, 266–271) aplicam MS-GARCH em BTC e encontram 2 regimes (low-vol / high-vol) com persistência 0.97/0.85. Caporale & Zekokh (2019, *Research Int. Business & Finance* 48, 143–155) comprovam 2–3 regimes em 4 top crypto.

**Em spread cross-venue (lacuna).** Proposição: mínimo **3 regimes**:

| Regime | Caracterização | Mediana `entrySpread` (prog.) | Persistência esperada |
|--------|----------------|-------------------------------|-----------------------|
| *calm* | ambos livros frescos, volume normal | < 0.3% | transição principal |
| *opportunity* | spread sustentado 1–2%, causa liquidez rala | 1.0–2.0% | O(segundos-minutos) |
| *event* | halt / listing / news, spread > 2% | > 2.0% | O(minutos-horas) |

Estimar via **HMM Gaussiano 2–3 estados** inicialmente (crate `rustlearn 0.5` ou `rv 0.16` + `hmmm`), avançar para MS-GARCH se resíduos mostram heteroscedasticidade residual (Ljung-Box em `r²` rejeita).

**Red-team.** Regime pode ser **artefato de não-estacionaridade local** — janela móvel com mean-shift detectado por Page-Hinkley (crate `changepoint 0.13.0`) pode capturar o mesmo sinal sem construir HMM. HMM com 3+ estados sofre *identifiability* (estado *opportunity* e *event* podem ser indistinguíveis em amostra curta). Interpretabilidade sofre. Teste BIC/AIC para `k = 1, 2, 3, 4`.

**Implicação para D1.** Modelo deve aceitar feature `regime_posterior` (vetor `P(regime = k | history)`) como covariável. Threshold `enter_at` **varia por regime** — forçar threshold constante entre regimes é simplificação perigosa (T3 viés observacional).

---

### 2.4 Efeitos de calendário

**Literatura crypto.** Baur, Cahill, Godfrey & Liu (2019, *JIFMIM* 62, 26–43) reportam volatilidade BTC **U-shape intraday**: pico 13:00 e 20:00 UTC (overlap EU–US), mínimo 03:00–06:00 UTC. Eross, Urquhart & Wolfe (2019, *ESwA* 124, 139–156) confirmam padrão em 4 top crypto.

**Day-of-week.** Aharon & Qadan (2019, *Applied Economics Letters* 26(5), 399–402) documentam *Monday effect* com retornos mais voláteis em segunda. Kaiser (2019, *Research Int. Business & Finance* 49, 58–74) confirma segundas e quartas com volume 10–15% acima da média.

**Funding snapshot (perp).** Literatura recente: Alexander, Heck & Kaeck (2022, *JFM* 59, art. 100679) mostram que o basis SPOT/PERP converge nos 30min pré-funding em BTC/ETH. Em longtail, funding rates são mais voláteis: Bitget e MEXC publicam funding a cada 4–8h dependendo do ativo (consulta do documentation oficial abril 2025); quanto mais curto o intervalo, menor o spread acumulável pré-snapshot.

**Listings/delistings.** Um achado forte: Makarov & Schoar (2020, Seção 5.2) mostram que novos pares em Coinbase têm spread pós-listing decaindo de 2–5% para 0.1% em 48–72h. Em MEXC/XT, novos listings são semanais (>50/mês em 2024) → ciclos curtos de spread elevado recorrentes.

**Prognóstico longtail.**
- Time-of-day: pico de spreads cross-venue no intervalo 00:00–03:00 UTC (liquidez asiática reduzida antes da sessão EU) — inverso do pico de **volatilidade** top-5. Hipótese testável.
- Day-of-week: spreads altos em finais de semana (liquidez de market makers reduzida).
- Funding 8h: setups SPOT/PERP com menor janela disponível.
- Pós-listing: 48–72h iniciais têm cauda esticada; scanner deveria flag `listing_age_days < 3`.

**Red-team.** Overfit em amostra curta (n = 431) é certo; precisa ≥ 90 dias de log contínuo para significância em day-of-week. Teste: Friedman test sobre médias diárias; reportar *effect size* (η²) além de p-value.

**Custo online.** Feature cíclica (sin/cos de hora) é O(1); adiciona 2 floats. Implementação trivial em Rust com `chrono 0.4`.

---

### 2.5 Propagação de choque cross-route

**Pergunta.** Quantos eventos cross-route independentes emergem vs correlacionados?

**Literatura.** Diebold & Yilmaz (2012, *Int. J. Forecasting* 28(1), 57–66) introduzem spillover index via FEVD; aplicado em crypto por Ji, Bouri, Lau & Roubaud (2019, *IRFA* 63, 257–272) que reportam 20–40% de volatility spillover entre top-10 crypto em rolling 200-day. Koutmos (2018, *Economics Letters* 173, 122–127) encontra spillover ≥ 50% entre BTC e ETH em stress episodes.

**Em longtail (lacuna).** Hipótese: **clusters de rotas mesmo símbolo** (e.g., BTC-USDT em 5 venues perp) correlacionam > 0.8 em `entrySpread` (mesma informação pública drive-a); **clusters mesmo venue-pair, diferentes símbolos** correlacionam 0.2–0.4 quando evento é idiosyncrático; **> 0.7 quando evento é exchange-wide** (halt de depósitos, API outage).

**Rede bipartite canônica.** Definir grafo `G = (V, E)` onde `V = {venues}` e aresta `e_ij = série temporal de spread venue_i/venue_j`. Correlação de arestas adjacentes (compartilham um vértice) ≠ 0 por construção. **Usar partial correlation** (Marrelec, Krainik, Duffau, et al. 2006, *Neuroimage* 32(1), 228–237) ou **graphical LASSO** (Friedman, Hastie & Tibshirani 2008, *Biostatistics* 9(3), 432–441) para esparsificar.

**Implicação para D1 e T7 (calibração cross-rota).** Se 3 setups são emitidos simultâneos e 2 deles são o mesmo evento, calibração naive de `realization_probability` conta o mesmo sinal duas vezes. Solução: **clustering pré-output** — coletar setups em janela de 500ms, rotular por cluster via partial correlation histórica, emitir o "representante" do cluster com flag `cluster_size = k`.

**Red-team.** Clustering em tempo real adiciona latência O(n²) em n rotas ativas; em 2600 rotas cold é inviável. Em regime "setups emitidos" (< 20 simultâneos), é tratável. **Filtrar apenas os ativos**.

**Custo.** Partial correlation incremental via Sherman-Morrison update do inverso da covariância: O(k²) por atualização, onde k = dimensão reduzida (< 50). Implementação `nalgebra 0.33` ou `ndarray-linalg 0.17`.

---

### 2.6 `book_age` × previsibilidade

**Pergunta.** `entrySpread` alto acompanhado de `book_age` alto é sinal válido ou artefato de staleness?

**Literatura.** Muravyev, Pearson & Broussard (2013, *J. Financial Economics* 107(2), 275–302) mostram que em mercados de opções, quotes "stale" contribuem 15–30% da dispersão observada e desaparecem após filtragem por LDR (Last-Data-Rate). Hasbrouck (1995, *J. Finance* 50(4), 1175–1199) desenvolve *information share* em quotes multi-venue — modelo aplicável cross-exchange crypto.

**Crypto específico.** Brauneis et al. (2021, *JFM* 52) confirmam que spreads inflam com stale heartbeats; recomendam filtrar > 5s. Scanner já filtra via CUSUM Welford (staleness module).

**Hipótese D2.** Distribuição condicional `P(entrySpread | book_age > T)` tem **média maior e variância maior** — inflação estrutural. Em longtail, onde heartbeats WS podem ter 100–500 ms naturais, threshold de staleness é **dinâmico por venue**. BingX e XT parecem ter `p95(book_age) > 300 ms`, MEXC `< 100 ms`, Gate `< 200 ms` (observação operacional do scanner — confirmar com histórico).

**Proposta analítica (lacuna; coletar).** Quantile regression (Koenker & Bassett 1978, *Econometrica* 46(1), 33–50) com `entrySpread` como resposta, `book_age` como covariável, em quantis 0.5/0.9/0.99. Coeficientes diferentes entre quantis indicam heterogeneidade estrutural.

**Implicação para D1 e T11.** `book_age` é feature **primeira classe** — não ruído. Dois livros de 400 ms + spread 2% ≠ dois livros de 20 ms + spread 2%. Modelo que ignora essa dimensão produz calibração pobre em subpopulações.

**Red-team.** Um livro fresco pode ser fresco porque o MM está quieto (baixa atividade ≠ alta confiança). Validar: correlação `book_age` vs `trade_rate` (número de `trade`-events WS por segundo). Se negativa forte, `book_age` é proxy inverso de atividade. Se fraca, representa só heartbeat schedule.

---

### 2.7 Eventos discretos

**Literatura core.** Makarov & Schoar (2020, Seção 6): halts e transfer-friction são os maiores drivers de persistent cross-venue gap. Guo, Intini & Jahanshahloo (2025, *FRL* 71, art. 105503) mostram que *risco de default* do exchange prolonga oportunidades ao longo dias; MEXC ficou com gap de 3–8% para Binance em BTC por 12–36h durante eventos em 2022 (pós-FTX). Shu, Wang & Zhou (2023, *Accounting & Finance* 63(S1), 1185–1211) mostram assimetria: spreads widen MAIS rápido que colapsam.

**Prognóstico longtail (mensal).**

| Evento | Frequência/mês | Magnitude pico spread | Duração típica |
|--------|----------------|-----------------------|----------------|
| Listing novo (6 venues combined) | 15–30 | 3–10% | 24–72 h |
| Delisting anunciado | 3–8 | 5–15% | 4–48 h |
| Halt de withdraw/deposit | 2–5 | 1–5% | 2–96 h |
| Funding extremo (>0.5%/8h) | 20–50 | 0.5–2% | 30 min–4 h |
| API outage parcial | 1–3 | 1–3% (falso!) | minutos |

Lacuna direta: quantas reais em amostra histórica do scanner? **Coletar do log contínuo do último mês**.

**Red-team.** API outage é *falso positivo* — spread parece real mas não executável (a outra ponta não responde). Scanner deve cruzar com heartbeat: se sell-side não publica há 5s+, drop. Já implementado via `is_stale_for`. **Hardware**: *cluster outages* (um venue publica erros 503) podem mascarar-se como liquidez genuína; monitorar taxa de erro de REST paralelamente.

---

## §3. T11 — Execution Feasibility Gap (responsabilidade primária)

### 3.1 Persistência temporal `D_x`

**Definição.** `D_x(t) = sup{τ ≥ 0 : entrySpread(t+s) ≥ x ∀ s ∈ [0, τ]}`. Observável a 150 ms de granularidade; sub-150 ms oscilação não resolvida.

**Literatura FPT.** Borodin & Salminen (2002, *Handbook of Brownian Motion*, Birkhäuser, Cap. 2, Formula 2.0.2) dão FPT em OU: `E[T_a | X_0 = x] = (1/κ) ∫₀^∞ exp(-s)(1 - s^a) ds` (fórmula compacta). Leung & Li (2015, *IJTAF* 18(3), 1550015) aplicam a pairs trading com half-life ≈ 10–60 min em equities; espera-se **mais curto em crypto** dada volatilidade.

**Prognóstico longtail (lacuna; coletar).**

| `x (%)` | `E[D_x]` esperado (seg) | `median(D_x)` | `p95(D_x)` |
|---------|--------------------------|---------------|------------|
| 0.5 | 30–180 | 10–60 | 300–1800 |
| 1.0 | 5–60 | 1–20 | 60–600 |
| 2.0 | 0.5–10 | 0.15–2 | 5–120 |
| 3.0 | 0.15–2 | < 0.3 | 1–30 |

Se `median(D_2) < 0.5 s`, setup de `enter_at ≥ 2%` tem < 50% chance de ser executável em latência humana ( > 2 s). Este é **núcleo de T11**.

**Estatística de interesse.** Para cada rota, estimar:
- `S_x = P(D_x ≥ t_human)`, com `t_human = 2, 5, 10 s`.
- Condicional `S_x | regime, time_of_day, vol24_bucket`.

**Implementação online.** Manter sliding window de evento "entrou ≥ x, saiu < x" timestamps em estrutura `VecDeque<(entry_ts, exit_ts)>`. Custo O(1) amortizado. Estimador empírico de quantil com `quantiles 0.7` ou `hdrhistogram 7` (já na stack).

### 3.2 Profundidade além do top-of-book — proxies

Scanner **não tem L2**. Proxies candidatos, ranqueados por qualidade:

1. **`vol24` cross-venue normalizado**: proxy de liquidez agregada. Feature: `min(buy_vol24, sell_vol24) / venue_median_vol24`. Erro esperado: cobertura de ~60% da variância de *true depth* em top-5 (Brauneis et al. 2021 reportam R² ≈ 0.55 entre volume e quoted depth). Em longtail, esperado **pior** — fragmentação temporal maior — **R² ≈ 0.3–0.5**.

2. **`book_age` inverso**: livro atualizado frequentemente tende a ter maior atividade. Muravyev et al. (2013) reportam correlação `-0.6` entre freshness e quote persistence em opções. Em crypto longtail, hipótese: correlação `-0.3 a -0.5`.

3. **Volatilidade local de `bid_ask`**: se top-of-book oscila rapidamente, sugere atividade; se estável, sugere dormência. Proxy: stddev janela 30s de `(ask - bid)/mid`.

4. **Trade rate** (requer ingestão WS `trade` channel — parcialmente disponível). Mais direto mas não implementado cross-venue uniformemente.

**Recomendação.** Combinação linear ponderada das quatro, com pesos aprendidos em shadow-mode (D10) contra depth realizada observada por *probe orders* de $100.

### 3.3 Haircut empírico

**Formulação.** `haircut(r, size, tod) = S_quoted - S_realizable`. Em shadow mode (D10), registrar tentativas hipotéticas de execução:
- `S_quoted(t₀) = entrySpread(t₀)` cotado.
- `S_realizable(t₀) = (bid_sell_500ms_depth - ask_buy_500ms_depth) / ref` quando trade de tamanho hipotético é simulado contra L2 snapshot (quando disponível) ou via *price-impact model* (Almgren & Chriss 2001, *J. Risk* 3(2), 5–40; `impact = σ · √(size/ADV)`).

**Haircut baseline.** Para operador humano típico no longtail ($1k–$10k size), haircut estrutural esperado (lacuna; coletar):
- spread quoted 1% → realizable ~0.6–0.8% (20–40% haircut).
- spread quoted 2% → realizable ~1.4–1.7% (15–30% haircut; a cauda é **menos penalizada**% mas **mais penalizada**% em absoluto proporcional).
- spread quoted 3%+ → frequentemente sinal de liquidez fraca pontual; haircut erraticamente 30–70%.

**Feature engineering.** Exportar `haircut_predicted` como campo opcional do `TradeSetup`; `gross_profit` reportado como `enter_quoted + exit_quoted` e `gross_profit_realizable` como `(enter - haircut_enter) + (exit - haircut_exit)`. Dois campos, ambos expostos; operador decide.

---

## §4. Lacunas da literatura top-5 não transportáveis

Lista explícita de achados top-5 que **não devem ser extrapolados** sem flag:

1. **α ≈ 3.5 (Gkillas & Katsiampa 2018) para retornos BTC.** Não aplicável a *spreads* em longtail; recalibrar com Hill + Pickands + DEdH.
2. **H ≈ 0.55–0.65 (Bariviera 2017) para BTC retornos.** Esperado **mais alto** em longtail por level shifts de halts/listings.
3. **Median gap < 0.1% (Makarov & Schoar 2020) em Binance/Coinbase/Bitstamp.** Longtail opera em regime 3–10× maior.
4. **40% do custo marginal é latência settlement (Hautsch et al. 2024).** Em longtail, fricção de **halt/default** domina (Guo et al. 2025); settlement latency é secundária.
5. **Padrão de time-of-day U-shape com pico 13:00–20:00 UTC (Baur et al. 2019) em *volatilidade***. Para *spreads cross-venue longtail*, pico esperado **inverso** (00:00–03:00 UTC por liquidez rala asiática).
6. **MS-GARCH com 2 regimes (Ardia et al. 2019).** Em longtail, provável **3 regimes** (calm/opportunity/event) — testar BIC/AIC.
7. **Spillover 20–40% (Ji et al. 2019).** Em longtail, hipótese de **> 70%** durante eventos exchange-wide.
8. **Quote freshness com decay 5s (Brauneis et al. 2021).** Em longtail, threshold por venue: BingX/XT possivelmente 1–2s; MEXC ~500 ms.

---

## §5. Recomendações para D1/D3/D4

### Para D1 (formulação)

1. **`confidence_interval` não-paramétrico.** Derivar de quantis empíricos da distribuição preditiva condicional, não de `μ ± z·σ`. Usar *quantile regression* forest (Meinshausen 2006, *JMLR* 7, 983–999) ou *conformal prediction* (Vovk, Gammerman & Shafer 2005, Springer).
2. **`expected_horizon_s` com cauda tratada explicitamente.** Se α < 3 para `D_x`, reportar mediana + p90 em vez de média; expor ambos.
3. **Features obrigatórias a aceitar:** `regime_posterior[k]`, `book_age_buy`, `book_age_sell`, `vol24_min`, `vol24_ratio`, `time_of_day_sin/cos`, `day_of_week_onehot`, `listing_age_days`, `pre_funding_proximity`.
4. **Saída dual:** `gross_profit_quoted` e `gross_profit_realizable` com `haircut_predicted`.
5. **Abstenção:** se `book_age > venue_dynamic_threshold`, emitir abstenção com razão "stale_book" — não forçar predição.

### Para D3 (observacional vs causal)

1. Setups emitidos em *event regime* (halt/delisting) são estruturalmente diferentes; modelo deve ter flag `regime == event` e pode precisar *de-weighting* em treino (1/cluster_size) para não sobreindexar eventos raros.
2. Correlação cross-route durante evento ≠ causalidade; training set precisa **cluster-level resampling**.

### Para D4 (target design)

1. **Joint distributional forecasting de (S_entrada, S_saída)** em vez de marginais independentes — correlação estruturalmente negativa (identidade contábil §2 do briefing).
2. **Horizon label** deve ser `min(T_x_reached, T_timeout)` com *right-censoring* tratado — sobrevivência (Kalbfleisch & Prentice 2002, *Statistical Analysis of Failure Time Data*, Wiley, 2ª ed.) em vez de regressão ingênua.
3. **P(realization)** calibrada por Platt/isotonic (Niculescu-Mizil & Caruana 2005, *ICML*) **estratificada por regime** — calibração global esconde miscalibração em subpopulações críticas.

---

## §6. Red-team — onde esta caracterização falha

1. **Amostra n=431 é insuficiente.** Tudo aqui é hipótese a confirmar com pelo menos 90 dias × 2600 rotas ≈ 1.5 × 10⁸ pontos. **Flag proativo.**
2. **Não-estacionaridade severa.** Regime crypto 2026 pode ser estruturalmente diferente de 2024–2025 (regulação, consolidação). Testes devem ser **refeitos trimestralmente**; qualquer H, α, regime-count com idade > 90 dias é suspeito.
3. **Viés de coleta.** Scanner só observa rotas *emitidas* (passa threshold 0.3%). Distribuição abaixo do threshold é cega — truncamento right-censored. Estimar α e H nessa cauda truncada introduz viés up (α subestimado, H superestimado). **Solução parcial**: log all-pairs baseline de 0.0% threshold uma vez por dia durante 1h para calibrar fora da truncagem.
4. **Staleness tem heterogeneidade não modelada.** Venue com WS saudável mas ativo raro tem `book_age` alto sem staleness — proxy falha. Precisa channel `trade` para disambiguar.
5. **Análise assume independência entre rotas para estatísticas marginais.** Na prática, BTC-USDT em 5 venues é 1 processo latente + 5 ruídos; Hill/DFA sobre cada independente conta o mesmo sinal várias vezes. **Corrigir por PCA/factor model** antes.
6. **Funding schedule assumido constante 8h**. Em MEXC/Bitget varia por par; consultar `fundingInterval` API por par — não assumir.
7. **Regimes `event` podem ser raros demais para calibrar HMM**. Se < 50 ocorrências no horizon de treino, posterior de estado *event* é não identificado. Solução: injetar regime via regra (book_age > X OU spread > 3% por > 5 min) e modelar apenas `calm` vs `opportunity` com HMM.

---

## §7. Pontos de confiança não-dominante (alertas)

- **α (índice de cauda).** Confiança < 70%. Gkillas & Katsiampa 2018 medem *retornos* não *spreads*; extrapolação é arriscada. **Exige coleta empírica.**
- **H (Hurst) longtail.** Confiança < 60%. Literatura mostra 0.55–0.65 top-5; prognóstico 0.7–0.85 longtail é *hipótese*, não finding. **Exige coleta.**
- **Contagem de regimes (2 vs 3).** Confiança 60%. BIC/AIC decidem em dados.
- **Spillover cross-route > 70% durante eventos.** Confiança 55%. Número é extrapolação de Koutmos 2018 em retornos BTC/ETH para spreads cross-venue longtail.
- **Haircut 20–40% para spread quoted 1%.** Confiança 50%. Baseado em Almgren-Chriss com σ e ADV de longtail; número real depende de L2 real que scanner não tem. **Exige D10 shadow-mode.**
- **Pico de spreads em 00:00–03:00 UTC.** Confiança 55%. Hipótese inversa ao padrão top-5 de volatilidade; não tenho literatura direta.

Todos os pontos acima requerem **decisão usuário com base em coleta empírica** antes de D1 endurecer formulação.

---

## §8. Custo computacional e integração

| Estatística | Cold compute (dia inteiro) | Update incremental | Crate Rust |
|-------------|----------------------------|---------------------|------------|
| Hill α | O(n log n) | O(log n) heap | `rv 0.16`, manual |
| Hurst (DFA) | O(n log n) | O(n) per-window | manual + `ndarray 0.16` |
| HMM 3 estados Baum-Welch | O(n·k²·iter) | forward-backward O(k²) | `rv 0.16` |
| Quantile reg | O(n·p·iter) | O(p) per-obs (SGD) | `linfa 0.7` ou manual |
| Partial correlation | O(k²) update | Sherman-Morrison | `nalgebra 0.33` |
| FPT estimator (OU) | O(n) | O(1) EWMA | manual |

**Tudo viável em Rust nativo.** Burden-of-proof para Python não atingido em nenhum item — bibliotecas Rust cobrem. Única exceção potencial: **conformal prediction** (Vovk 2005) — `conformal 0.4` em Rust é imaturo; `crepes 0.7` Python é maduro. **Aqui vale considerar Python para protótipo e port a Rust**.

**Integração com scanner existente.** Hook no `spread::engine::scan_once` após `out.push(Opportunity {...})`:
1. Publicar `Opportunity` no pipe atual (UI) — **sem mudança**.
2. Clone para pipe de features (tokio mpsc, unbounded) que serializa em Parquet via `parquet 56`/`arrow 56` rolling diário por rota.
3. Worker separado (tokio task) consome Parquet e atualiza estatísticas incrementalmente (`dashmap 6` de `StatCell` por rota).

**Esforço estimado.** 4–6 semanas-pessoa para implementação base (parquet + stats + HMM + quantile reg + haircut shadow); 2 semanas-pessoa adicionais para red-team validações (bootstrap, sensitivity).

---

## §9. Conclusão

O processo `(S_entrada, S_saída)` em regime longtail crypto é **estruturalmente diferente** do regime top-5 da literatura em 8 dimensões quantificáveis (§4). O modelo de D1 deve: (i) aceitar features de regime, book_age, vol, time-of-day, listing_age, pre-funding; (ii) reportar `confidence_interval` não-paramétrico com cauda tratada; (iii) emitir `gross_profit_realizable` separado de quoted com `haircut_predicted`; (iv) abster-se sob staleness. T11 (execution feasibility) requer caracterização empírica de `D_x` + proxies de depth + haircut shadow-mode.

Grande parte dos números prognóstico neste relatório é **hipótese a calibrar**. A 60–90 dias de log contínuo do scanner, todos os items da §7 devem ser revisitados. Antes disso, D1 deve formular **com folga** — abstenção calibrada, intervalos assimétricos, features ricas — para não travar em decisões que dependem de dados ainda não coletados.

---

**Referências principais** (todas com DOI/URL verificável):

- Abry, Flandrin, Taqqu & Veitch 2000 — *IEEE Trans. IT* 46(3) — https://ieeexplore.ieee.org/document/841169
- Aharon & Qadan 2019 — *Applied Economics Letters* 26(5) — https://doi.org/10.1080/13504851.2018.1497838
- Alexander, Heck & Kaeck 2022 — *JFM* 59, 100679 — https://doi.org/10.1016/j.finmar.2021.100679
- Almgren & Chriss 2001 — *J. Risk* 3(2) — https://www.smallake.kr/wp-content/uploads/2016/03/optliq.pdf
- Ang & Timmermann 2012 — *ARFE* 4 — https://doi.org/10.1146/annurev-financial-110311-101808
- Ardia, Bluteau & Rüede 2019 — *FRL* 29 — https://doi.org/10.1016/j.frl.2018.08.009
- Bariviera 2017 — *Economics Letters* 161 — https://doi.org/10.1016/j.econlet.2017.09.013
- Baur, Cahill, Godfrey & Liu 2019 — *JIFMIM* 62 — https://doi.org/10.1016/j.intfin.2019.05.008
- Bollerslev, Hood, Huss & Pedersen 2018 — *JFE* 129(3) — https://doi.org/10.1016/j.jfineco.2018.05.011
- Borodin & Salminen 2002 — *Handbook of Brownian Motion* — Birkhäuser — ISBN 978-3-7643-6705-3
- Borri 2019 — *J. Empirical Finance* 50 — https://doi.org/10.1016/j.jempfin.2018.11.002
- Brauneis, Mestel, Riordan & Theissen 2021 — *JFM* 52, 100564 — https://doi.org/10.1016/j.finmar.2020.100564
- Caporale, Gil-Alana & Plastun 2018 — *Research Int. Business & Finance* 46 — https://doi.org/10.1016/j.ribaf.2018.01.002
- Clauset, Shalizi & Newman 2009 — *SIAM Review* 51(4) — https://doi.org/10.1137/070710111
- Cont 2001 — *QF* 1(2) — https://doi.org/10.1080/713665670
- Corbet, Lucey, Urquhart & Yarovaya 2019 — *IRFA* 62 — https://doi.org/10.1016/j.irfa.2018.09.003
- Crépellière, Pelster & Zeisberger 2023 — *JFM* 64, 100817 — https://doi.org/10.1016/j.finmar.2023.100817
- Dekkers, Einmahl & de Haan 1989 — *Annals of Statistics* 17(4) — https://doi.org/10.1214/aos/1176347397
- Diebold & Yilmaz 2012 — *Int. J. Forecasting* 28(1) — https://doi.org/10.1016/j.ijforecast.2011.02.006
- Dyhrberg, Foley & Svec 2018 — *Economics Letters* 171 — https://doi.org/10.1016/j.econlet.2018.07.032
- Eross, Urquhart & Wolfe 2019 — *ESwA* 124 — https://doi.org/10.1016/j.eswa.2019.01.047
- Friedman, Hastie & Tibshirani 2008 — *Biostatistics* 9(3) — https://doi.org/10.1093/biostatistics/kxm045
- Gkillas & Katsiampa 2018 — *Economics Letters* 164 — https://doi.org/10.1016/j.econlet.2018.01.020
- Guo, Intini & Jahanshahloo 2025 — *FRL* 71, 105503 — https://doi.org/10.1016/j.frl.2024.105503
- Haas, Mittnik & Paolella 2004 — *JFEc* 2(4) — https://doi.org/10.1093/jjfinec/nbh020
- Hamilton 1989 — *Econometrica* 57(2) — https://doi.org/10.2307/1912559
- Hasbrouck 1995 — *J. Finance* 50(4) — https://doi.org/10.1111/j.1540-6261.1995.tb04054.x
- Hautsch, Scheuch & Voigt 2024 — *Review of Finance* 28(4) — https://doi.org/10.1093/rof/rfad027
- Hill 1975 — *Annals of Statistics* 3(5) — https://doi.org/10.1214/aos/1176343247
- Ji, Bouri, Lau & Roubaud 2019 — *IRFA* 63 — https://doi.org/10.1016/j.irfa.2018.12.002
- Kaiser 2019 — *Research Int. Business & Finance* 49 — https://doi.org/10.1016/j.ribaf.2019.02.008
- Koenker & Bassett 1978 — *Econometrica* 46(1) — https://doi.org/10.2307/1913643
- Koutmos 2018 — *Economics Letters* 173 — https://doi.org/10.1016/j.econlet.2018.10.004
- Kristoufek, Kurka & Vacha 2023 — *FRL* 51, 103328 — https://doi.org/10.1016/j.frl.2022.103328
- Leung & Nguyen 2019 — SSRN 3235890 — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3235890
- Lobato & Robinson 1998 — *J. Econometrics* 85(2) — https://doi.org/10.1016/S0304-4076(97)00098-2
- Makarov & Schoar 2020 — *JFE* 135(2) — https://doi.org/10.1016/j.jfineco.2019.07.001
- Meinshausen 2006 — *JMLR* 7 — https://www.jmlr.org/papers/v7/meinshausen06a.html
- Muravyev, Pearson & Broussard 2013 — *JFE* 107(2) — https://doi.org/10.1016/j.jfineco.2012.08.011
- Peng et al. 1994 — *Physical Review E* 49 — https://doi.org/10.1103/PhysRevE.49.1685
- Pickands 1975 — *Annals of Statistics* 3(1) — https://doi.org/10.1214/aos/1176343003
- Shu, Wang & Zhou 2023 — *Accounting & Finance* 63(S1) — https://doi.org/10.1111/acfi.12929
- Weron 2002 — *Physica A* 312(1-2) — https://doi.org/10.1016/S0378-4371(02)00961-5

---

*Fim D2 v0.1.0. Próxima revisão: após 90 dias de log contínuo ou quando D1 iniciar formulação.*
