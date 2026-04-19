# Prompt PhD-style v3 — Stack ML para Recomendação Calibrada de TradeSetup em Arbitragem Cross-Venue Longtail

> Documento de briefing para despacho de sub-agentes de pesquisa PhD. Pode ser usado como prompt único (1 agente gigante) ou recortado por domínio (§5, 10 agentes paralelos). Versão 3 — 2026-04-19.

---

## 0. Postura crítica obrigatória (meta-protocolo, vale acima de tudo)

Você é pesquisador sênior PhD em **quantitative finance** + **applied ML para microestrutura de mercado**. As cinco regras abaixo valem acima de qualquer instrução específica deste prompt:

1. **Steel-man obrigatório.** Antes de recomendar qualquer escolha X, você DEVE apresentar ao menos **3 alternativas sérias** a X e demonstrar, com número e evidência citada, por que X vence cada uma. Recomendação sem steel-man é rejeitada de saída.
2. **Red-team auto-imposto.** Toda recomendação final acompanha uma seção **"Cenários em que esta escolha é sub-ótima ou falha"** — você mesmo aponta fraquezas antes que o invocador precise questionar. Se tudo parece ótimo, você não foi rigoroso. Reexamine.
3. **Proatividade em dúvida.** Quando sua confiança na recomendação for < 80%, **sinalize explicitamente**: "escolha entre X e Y exige decisão do usuário — evidência não-dominante". Não esconda ambiguidade sob falsa convergência.
4. **Proibição de safe-bet silencioso.** Se a escolha recomendada é o "padrão da indústria" (XGBoost, LightGBM, PyTorch, Python), você precisa demonstrar **com número** que é também ótima **neste regime específico de dado** (baixo signal-to-noise, não-estacionário, 2600 séries paralelas curtas, regime longtail crypto, budget Rust < 500 µs). Caso contrário, aponte proativamente que o safe-bet não é ótimo aqui.
5. **Precedência Rust.** Este projeto é Rust-native. A recomendação default para qualquer componente é Rust. Python entra **somente** se você comprovar numericamente uma das três condições:
   - (a) O algoritmo/biblioteca **não existe em Rust** com qualidade comparável em 2026.
   - (b) Benchmark publicado mostra **>2× vantagem** da alternativa Python em métrica relevante (não velocidade de dev — métrica do modelo ou do sistema).
   - (c) O ecossistema Rust ainda não amadureceu para o caso específico (cite tickets, issues abertos, maturity status em crates.io).
   Sem uma das três condições comprovadas com URL e número, Python **não** é recomendável.

**Prioridade de fontes**: (1) papers peer-reviewed (JFE, JFM, RFS, Review of Finance, Quantitative Finance, FRL, JMLR, NeurIPS, ICML, KDD, arXiv q-fin/stat.ML); (2) docs oficiais com benchmark publicado; (3) white-papers de firmas quantitativas (Jump, Two Sigma, Jane Street, Paradigm); (4) benchmarks cruzados de crates Rust e libs Python. Blogs/Reddit apenas como contexto, nunca como evidência.

Toda afirmação material exige **URL + autor + ano + venue + valor quantitativo**. Proibido "it depends" sem os dois lados com número. Proibido "a literatura sugere" sem citação direta.

---

## 1. Contexto do projeto (leitura obrigatória antes de pesquisar)

**Sistema existente** em `C:\Users\nicoolas\Pictures\novo sc anner\scanner\`. Stack consolidada via 6 relatórios PhD anteriores (2026-04-17):

- **Runtime/WS**: tokio multi-thread + core_affinity pin por venue + tokio-websockets 0.11 (Bytes zero-copy, SIMD masking) — NÃO tokio-tungstenite.
- **JSON/Protobuf**: sonic-rs `get() → LazyValue<'a>` (zero-copy, sem DOM); quick-protobuf manual decode para MEXC spot.
- **Compressão**: libdeflater (1047 MB/s Silesia corpus vs 478 zlib-ng).
- **Orderbook**: sorted `Vec<Level>` cap 64 + seqlock `TopOfBook` `#[repr(align(64))]` 64 B cache-aligned + flat array indexado por `symbol_id`.
- **Staleness/assimetria**: Welford EWMA + CUSUM diferencial + Poisson bootstrap, 40 B/cell.
- **Observabilidade**: tikv/rust-prometheus + HdrHistogram per-venue + fastrace 1% sampling + eBPF profiler.
- **Broadcast**: axum WS `/ws/scanner` + REST `/api/spread/*` a cada 150 ms.

**Latência hard**: WS frame → book write p99 < 500 µs; ciclo de spread p99 < 2 ms para ≥ 2600 símbolos; zero alocações no hot path após warmup. **Windows dev / Linux prod**. 90/90 testes passando. Release build 6.0 MB com LTO=fat, panic=abort.

**Cobertura**: 11 venues — Binance, MEXC, BingX, Gate, KuCoin, XT, Bitget — spot + futuros. 14 streams WS + auxiliares REST (`mexc_spot_rest`, `vol_poller`). Discovery ~2600 pares cross-listed em ≥ 2 venues.

**Natureza do scanner**: **detector, não calculadora de PnL**. Emite para cada rota `r = (symbol, buyFrom, sellTo, buyType, sellType)`:
- `entrySpread(t) = (bid_sell − ask_buy) / ref × 100`
- `exitSpread(t)  = (bid_buy  − ask_sell) / ref × 100`
- `buyBookAge`, `sellBookAge` (staleness), `buyVol24`, `sellVol24`.

Não computa fees, funding, slippage nem PnL líquido — foco em spread bruto.

---

## 2. Contexto da estratégia (condensado da skill `spread-arbitrage-strategy`)

**Nome canônico**: *cross-exchange convergence arbitrage* (Makarov & Schoar 2020, *JFE* 135(2)). Variantes operadas: **SPOT/PERP** (cross-exchange basis trade) e **PERP/PERP**. SPOT/SPOT é família diferente (transfer arbitrage) e está **fora de escopo**. Operador é **discricionário** — o sistema é filtro e recomendador, não autômato.

**Identidade contábil fundamental**: `PnL_bruto(t₀, t₁) = S_entrada(t₀) + S_saída(t₁)`, com `t₁ > t₀`. Propriedade estrutural não-trivial:

```
S_entrada(t) + S_saída(t) = −(bid_ask_A(t) + bid_ask_B(t)) / ref(t)
```

— soma no **mesmo instante** é estruturalmente negativa (determinada pela largura dos books). PnL positivo depende exclusivamente da **diferença temporal** entre `S_entrada(t₀)` travado alto e `S_saída(t₁)` colhido após reabsorção do mispricing.

**Regra de Dois Testes que o humano aplica mentalmente**:
- **T1 — Qualidade da entrada**: `S_entrada(t₀)` está na cauda superior da distribuição recente (~24 h) da rota.
- **T2 — Exequibilidade da saída**: `S_saída` historicamente visita valores tais que `S_entrada(t₀) + S_saída(t₁) ≥ meta_operador` com frequência suficiente.

Falha em T2 → **armadilha de liquidez**.

**Regime operado**: longtail crypto (MEXC, Gate, BingX, XT, Bitget, KuCoin). Dados empíricos recentes do scanner (n=431 oportunidades emitidas em snapshot real):
- Distribuição de `entrySpread`: median 0.32%, p95 1.08%, p99 2.43%, max 4.06%.
- Distribuição de `exitSpread`: median −0.64%, p10 −1.27%, min −5.58%.
- Sum instantâneo `entry+exit`: median −0.24%; apenas 0.5% com sum > 0 (confirma identidade estrutural negativa).
- Top-25 dominadas por MEXC/BingX/XT/Bitget/KuCoin em perp.

Este regime é **distinto** da literatura sobre top-5 venues (Binance/Coinbase/OKX) — extrapolações precisam ser explícitas.

---

## 3. Problema de ML — formulação precisa e output concreto

### 3.1 Output: TradeSetup calibrado

**Para cada rota `r` em cada instante `t`**, o modelo emite (ou se abstém):

```rust
TradeSetup {
    route_id:               RouteId,
    enter_at:               f64,   // valor de S_entrada em que abrir (e.g., 2.00 %)
    exit_at:                f64,   // valor de S_saída em que fechar (e.g., -1.00 %)
    gross_profit:           f64,   // enter_at + exit_at (e.g., 1.00 %) — identidade de PnL bruto
    realization_probability: f64,  // P(enter_at atingível agora E exit_at alcançado antes de t_max)
    expected_horizon_s:     f64,   // E[t₁ - t₀] em segundos, dado (enter_at, exit_at)
    confidence_interval:    (f64, f64),  // IC 95 % sobre realization_probability
    model_version:          SemVer,
}
```

**Exemplos concretos** (formato exato que o operador consome):

| route | enter_at | exit_at | gross_profit | P(realize) | E[horizon] | IC 95 % |
|---|---|---|---|---|---|---|
| BP mexc:FUT → bingx:FUT | 2.00 % | −1.00 % | +1.00 % | 0.83 | 28 min | [0.77, 0.88] |
| IQ bingx:FUT → xt:FUT   | 2.00 % | +1.00 % | +3.00 % | 0.41 | 2 h 15 min | [0.32, 0.51] |
| GRIFFAIN gate:SPOT → bingx:FUT | 0.50 % | −0.30 % | +0.20 % | 0.72 | 6 min | [0.65, 0.79] |

**Abstenção é explicitamente aceitável**: se `realization_probability < τ_min` para **toda** combinação viável (`enter_at`, `exit_at`), o modelo **não emite nada** para essa rota — "não há trade calibrado agora" é resposta válida e frequentemente preferível. Isto é **selective prediction** / learning to reject (Chow 1957; El-Yaniv & Wiener 2010 *JMLR*; Geifman & El-Yaniv 2017 *NeurIPS*).

### 3.2 Subproblemas estatísticos

Produzir o `TradeSetup` do §3.1 exige resolver simultaneamente:

1. **Conditional joint distributional forecasting** sobre o par futuro `(S_entrada(t), S_saída(t'))` para `t' ∈ [t, t+T_max]`, condicionado em features atuais e histórico da rota. Não é forecasting de uma série só; é a conjunta.
2. **Threshold selection** — escolher `(enter_at, exit_at)` que maximizam utilidade sob constraint de calibração. Utilidade plausível: `U = gross_profit × P(realize)`, sujeito a `P(realize) ≥ τ_min` (p.ex., 0.80). Trade-off Pareto entre `gross_profit` alto (cauda rara) e `P(realize)` alto (faixa conservadora).
3. **First-passage time estimation** — dado `(enter_at, exit_at)`, estimar distribuição de `t₁ − t₀` para fornecer `expected_horizon` e permitir cutoff de hold.
4. **Calibração probabilística** — `realization_probability` reportada deve ter cobertura empírica quase idêntica (ECE < 0.02, reliability diagram próximo da diagonal).
5. **Abstenção calibrada** — quando `IC` é largo demais ou nenhuma tupla `(x, y)` satisfaz o threshold de utilidade, abster-se.

### 3.3 Requisitos operacionais do output

- **Precision-first regime**: falso positivo é catastrófico (operador abre, fica preso). Recall baixo é aceitável — modelo pode perder 70 % das oportunidades e ainda ser valioso se os 30 % emitidos forem de alta precisão.
- **Calibração obrigatória**: métricas mínimas — Brier score, ECE (Expected Calibration Error), reliability diagram. Isotonic regression ou Platt scaling como post-hoc calibration se preciso (Niculescu-Mizil & Caruana 2005 ICML).
- **Intervalos de cobertura garantida**: conformal prediction preferível a intervalos paramétricos (Angelopoulos & Bates 2023, *Foundations & Trends in ML*). Para variant condicional: CQR — Conformalized Quantile Regression (Romano et al. 2019 *NeurIPS*).
- **Interpretabilidade contrastiva**: operador deve ver por que o modelo recomendou (`enter_at`, `exit_at`) — feature importance local (SHAP, LIME) ou regras simbólicas extraídas.
- **Latência de inferência**: compatível com emissão a 150 ms por rota × 2600 rotas → orçar < 60 µs/rota em inferência (fica dentro do budget p99 < 500 µs com folga). Se impossível, arquitetura serviço-separado é alternativa (ver D8).

### 3.4 Restrições de stack — Rust default, Python burden-of-proof

**Default**: toda a pipeline (treino, inferência, feature engineering, feature store, histórico, serving, drift detection) em **Rust**. Crates-candidate a investigar em D7:

- **Modelos**: `linfa` (sklearn-like), `smartcore`, `candle` (HF, tensor-based), `burn` (deep learning Rust-native com múltiplos backends), `tangram` (gradient boosting Rust-native), `lightgbm-rs` / `xgboost-rs` (bindings), `tract` (ONNX inference pure-Rust, sem deps externas), `ort` (ONNX Runtime bindings oficiais).
- **Dados**: `polars` (DataFrames Rust-native, bindings Python opcionais), `datafusion`, `arrow-rs`, `lance` (columnar format ML-friendly), `ndarray`.
- **Quantile regression**: `linfa-linear`, `smartcore::ensemble::random_forest_regressor` com quantile aggregation custom.
- **Time series**: ecosystem imaturo em Rust — checar `augurs`, `chronoutil`, `tempo`.
- **Conformal**: nenhum crate dedicado conhecido; implementação direta é viável (algoritmo é simples).
- **Feature store**: `questdb` (client Rust), `clickhouse-rs`, `sled`, `redb`, `fjall`.

**Python permitido apenas se**:
- Não existe alternativa Rust minimamente adequada (provar com search em crates.io + GitHub).
- Alternativa Rust tem gap de qualidade/features >2× (provar com benchmark citado).
- Caso raríssimo: bootstrap inicial de prototipagem com treino offline Python → export ONNX → inferência Rust pode ser aceitável, mas deve ser explicitamente transitório com roadmap de migração.

### 3.5 Armadilhas críticas do design do output (tratamento obrigatório)

O `TradeSetup` é o objetivo máximo do modelo — todo o sistema gira em torno dele. Pequenas falhas de design neste output **quebram o sistema inteiro** sem que métricas clássicas acusem. Os 12 pontos abaixo são armadilhas documentadas em literatura adjacente ou antecipáveis teoricamente. **Cada um deve ser explicitamente endereçado** pelo agente do domínio correspondente, não silenciado.

#### T1 — Reward hacking por spreads baixos (crítico)

**Armadilha**: se a função de utilidade for ingenuamente `U = P(realize) × gross_profit`, o modelo aprende que setups pequenos têm probabilidade alta e converge para emitir **micro-spreads com alta confiança** — e.g., `enter 0.30%, exit −0.20%, gross_profit 0.10%, P=0.95`. Economicamente: operador paga fees de ~0.20–0.40% no ciclo; PnL líquido é **negativo** mesmo com P=0.95.

**Complicação**: o scanner é explicitamente "detector, não calculadora de PnL" (feedback na memória `feedback_scanner_is_detector_not_pnl.md`) — portanto o modelo não **deve** aplicar fees. Mas deve impor **floor empírico** sobre `gross_profit` de forma que recomendações sempre estejam acima do piso onde o operador humano considera economicamente viável.

**Direções a investigar**:
- Utilidade com floor: `U = P × max(0, gross_profit − floor)` com floor parametrizável pelo operador.
- Constraint dura: rejeitar candidatos com `gross_profit < floor` antes de ranking.
- Multi-objective com fronteira de Pareto reportada (ver T10).
- Aprendizado com custo explícito por falso positivo em produção, calibrado de forma que micro-spreads deixem de ser ótimos.

**Anti-padrão absoluto**: função de utilidade única, fixa, sem mecanismo de floor. Sistema vai viciar; operador vai perder dinheiro; métricas de ML parecerão excelentes.

#### T2 — Correlação espúria entre P e gross_profit via marginais separadas

**Armadilha**: é tentador estimar dois modelos independentes — um para `entrySpread atingível(t)` e outro para `exitSpread atingível(t)` — e multiplicar probabilidades. **Errado**: `entrySpread` e `exitSpread` são correlacionados (identidade estrutural do §2). Modelo marginal produz `P(realize)` descalibrado, tipicamente **otimista**.

**Direção a investigar**: modelos joint (NGBoost multivariado, Gaussian copulas condicionais, quantile multi-output via CQR). Alternativamente: modelar diretamente `max_{t' ∈ [t, t+T]} (S_entrada(t) + S_saída(t'))` como variável única e extrair decomposição do par (x, y).

**Red-team crítico**: mostrar que a decomposição final em (enter_at, exit_at) **não** viola a identidade `S_entrada(t) + S_saída(t) = −(bid_ask_A + bid_ask_B)/ref`, verificando empiricamente em backtest.

#### T3 — Viés observacional vs causal (selection bias)

**Armadilha**: o modelo treina em histórico do scanner — distribuição observacional. Mas quando o operador **executa** um setup, o próprio ato consome liquidez e move preço no book — distribuição intervencional (causal). As duas divergem sistematicamente:

- **Peer-effect**: oportunidades que ficam disponíveis no scanner por muito tempo são justamente aquelas que **nenhum outro arbitrageur** quis executar → viés de seleção contra o operador.
- **Size effect**: scanner mede top-of-book; execução de tamanho material caminha pelo book → preço realizado pior que cotado.
- **Velocity**: scanner reporta snapshots a 150 ms; se o spread existe por 50 ms, `P(realize)` histórica é inflada.

**Direção**: features de "tempo vivo" da oportunidade antes de desaparecer; haircut empírico pós-execução calibrado via shadow mode (D10); causal inference (propensity scoring) se viável.

**Red-team**: o modelo pode parecer perfeito em backtest observacional e falhar catastroficamente em execução real. Protocolo de shadow mode (D10) é mandatório antes de confiança.

#### T4 — Heavy-tailedness no horizonte temporal

**Armadilha**: `expected_horizon_s` como média de tempo até convergência é enganoso — distribuição de first-passage time em processos com saltos tem cauda pesada. Operador pode receber `expected_horizon = 30 min` e na prática esperar 4 horas em 15% dos casos.

**Direção**: reportar **mediana + p25 + p75 + p95**, não média. Ou distribuição completa (CDF amostrada) para o operador visualizar. Penalização explícita por recomendar setups com cauda p95 > T_max tolerável.

#### T5 — Design de abstenção (três tipos distintos)

**Armadilha**: tratar abstenção como monolítica ("modelo não emite nada") perde informação. Três causas distintas:

- **(a) Oportunidade inexiste**: nenhuma combinação `(x, y)` viável atinge floor de utilidade.
- **(b) Dados insuficientes**: rota nova, halt recente, histórico < n_min.
- **(c) Incerteza epistêmica alta**: dados existem mas IC do `P(realize)` é largo demais.

**Direção**: saída tipada com reason code (`NO_OPPORTUNITY`, `INSUFFICIENT_DATA`, `LOW_CONFIDENCE`). Operador vê por que. Métricas de qualidade diferenciam os três.

#### T6 — Rotas com dados escassos (cold start)

**Armadilha**: 2600 rotas ≠ 2600 séries bem populadas. Listings novos, delistings, halts, mudanças de ticker resultam em rotas com histórico < 24h. Modelo treinado ingenuamente ou extrapola (perigo) ou ignora (perda de cobertura).

**Direção**: **hierarchical Bayesian partial pooling** — rota herda prior de cluster de rotas similares (mesma venue-pair, mesmo símbolo base em venues diferentes). Ou meta-learning cross-route. Ou rejection explícita com `INSUFFICIENT_DATA` se n < n_min.

#### T7 — Correlação entre rotas (diversificação ilusória)

**Armadilha**: se evento de notícia/halt abre spread em `BTC-venue1→venue2`, `BTC-venue1→venue3`, `BTC-venue2→venue3` simultaneamente, o modelo emite **3 TradeSetups independentes** mas na prática é **1 evento correlacionado**. Operador executa os 3 pensando diversificar; na verdade está 3× concentrado em single event risk.

**Direção**: feature cross-route ("quantas rotas do mesmo símbolo base estão emitindo setup agora"); cluster penalty no ranking; recomendação "portfólio consciente" que sinaliza correlação.

#### T8 — Distribution shift entre treino e inferência

**Armadilha**: cripto longtail tem regimes — funding schedule muda, venue adiciona/remove par, fee tier é atualizado, halt macro. Modelo treinado em janela X opera em janela X+k com distribuição diferente → calibração silenciosa-mente quebra.

**Direção**: **adaptive conformal inference** (Gibbs & Candès 2021); monitorização online de ECE rolante com kill switch em D10; retreino triggered por detectores de drift (D6).

#### T9 — Label leakage (armadilha clássica que destrói 90% dos backtests de ML financeiro)

**Armadilha**: para criar label "setup em `t₀` realizou em `T`", é preciso olhar o futuro `[t₀, t₀+T_max]`. Se qualquer feature do modelo inclui informação desse intervalo (quantis rolantes que incluem `t₀+k`, forward-looking z-score, estatísticas globais computadas no dataset inteiro), o modelo **aprende a enganar** — precision@k parece fantástica em backtest e colapsa em produção.

**Direção**: **purged K-fold com embargo** (López de Prado 2018); auditoria feature-by-feature de horizonte temporal; detecção automática de leakage via shuffling temporal (se shuffling preserva performance, há leakage).

#### T10 — Um setup vs fronteira de Pareto

**Armadilha**: o operador pode preferir diferentes pontos do trade-off:
- **Conservador**: enter 1.0%, exit −0.5%, gross 0.5%, P=0.85
- **Médio**: enter 2.0%, exit −1.0%, gross 1.0%, P=0.65
- **Agressivo**: enter 3.0%, exit −0.5%, gross 2.5%, P=0.30

Emitir um único TradeSetup força uma escolha. Emitir a fronteira inteira dá poder ao operador.

**Direção a investigar**: (a) output do modelo é o TradeSetup único sob utility function fixa; (b) output é Pareto frontier (conjunto de setups não-dominados); (c) output é parametrizado por risk aversion `λ` que operador ajusta em UI. Trade-off entre UX simples e flexibilidade.

#### T11 — Execution feasibility gap

**Armadilha**: `enter_at = 2%` significa "abrir quando entrySpread atingir 2%". Mas:
- Quanto **tempo** o spread permanece em 2%? Se for 80 ms, operador humano não executa.
- Qual a **profundidade** no preço 2%? Top-of-book pode ter apenas $500 de liquidez; tamanho do operador é $10 k → preço realizado é pior.

Scanner não tem dados de profundidade além de top-of-book (limitação fundamental). Modelo que ignora isso entrega setups "existentes" mas não "executáveis".

**Direção**: feature "tempo médio em que spread esteve acima de 2% nas últimas 24h dessa rota" (proxy de persistência); haircut empírico calibrado via shadow mode comparando cotado vs realizado. Recomendar **bandas** (`enter_at ∈ [1.8%, 2.2%]`) em vez de ponto único.

#### T12 — Feedback loop (contamination da distribuição de treino)

**Armadilha**: se o operador segue as recomendações do modelo e isso move o mercado (consome liquidez, sinaliza direção para outros arbs), o próprio modelo futuro treina em dados contaminados pelas suas próprias recomendações passadas.

**Direção**: logar explicitamente trades executados com flag `was_recommended`; excluir ou downweightar amostras pós-execução no retreino; monitorar drift específico induzido por execução.

**Severidade**: em cripto longtail com operador single-market-participant, efeito é marginal. Em top-5 com múltiplos arbs usando mesmo scanner, seria catastrófico. Dimensionar cautela pelo tamanho operacional.

#### Síntese: qual domínio endereça cada armadilha

| Armadilha | Domínio primário | Domínios secundários |
|---|---|---|
| T1 reward hacking | D1 (formulação) | D4 (labeling), D10 (validação) |
| T2 marginais vs joint | D1 | D5 (calibração) |
| T3 observacional vs causal | D10 (validação) | D3 (features) |
| T4 heavy tails | D1 | D5 |
| T5 abstenção tipada | D1 | D5 |
| T6 cold start | D3 | D1, D6 |
| T7 correlação de rotas | D3 | D10 |
| T8 distribution shift | D6 | D5 |
| T9 label leakage | D4 | (auditoria cross-D) |
| T10 Pareto vs setup único | D1 | D10 |
| T11 execution feasibility | D2 (microestrutura) | D3, D10 |
| T12 feedback loop | D10 | D6 |

Cada agente do domínio deve abrir a armadilha sob sua responsabilidade, propor tratamento concreto, e reportar residual risk (quanto o tratamento mitiga mas não elimina).

---

## 4. Literatura adjacente — triangulação obrigatória com grau de extrapolação

Não existe paper peer-reviewed sobre "ML-assisted distributional forecasting para TradeSetup calibrado em cross-exchange convergence arbitrage em longtail crypto com stack Rust". Agentes devem **triangular** e **explicitar o grau de extrapolação** de cada fonte.

### Pairs trading com ML (extrapolação metodológica — ativos distintos ≠ mesmo ativo em duas venues)

- Gatev, Goetzmann & Rouwenhorst 2006 (*RFS* 19) — baseline distance.
- Krauss, Do & Huck 2017 (*EJOR* 259) — DL vs. boosting em S&P 500.
- Sarmento & Horta 2020 (*Expert Systems with Applications* 158) — pairs trading crypto com RL.
- Fil & Kristoufek 2020 (*FRL* 33) — pairs em crypto.

### Statistical arbitrage cross-venue em crypto (extrapolação mais direta)

- Kristoufek et al. 2023 (*FRL* 51) — cointegração entre 5 CEXes BTC.
- Leung & Nguyen 2019 (SSRN 3235890) — portfolios cointegrados crypto.
- Avellaneda & Lee 2010 (*Quantitative Finance* 10) — stat-arb equities, metodologia próxima.

### Conditional joint/distributional forecasting

- NGBoost: Duan et al. 2020 (ICML) — probabilistic predictions via natural gradient.
- Quantile Regression Forests: Meinshausen 2006 (*JMLR* 7).
- Deep Quantile Networks: Dabney et al. 2018 (ICML — quantile DQN); Implicit Quantile Networks (Dabney et al. 2018b).
- GAMLSS: Rigby & Stasinopoulos 2005 (*Applied Statistics* 54).
- Distributional regression com copulas: Klein & Kneib 2016 (*Statistics & Computing* 26).

### Conformal prediction (calibração rigorosa)

- Vovk, Gammerman & Shafer 2005 — *Algorithmic Learning in a Random World* (book).
- Angelopoulos & Bates 2023 — *Foundations & Trends in ML* 16(4) — tutorial gentil.
- Romano, Patterson & Candès 2019 (*NeurIPS*) — Conformalized Quantile Regression (CQR).
- Adaptive conformal inference sob distribution shift: Gibbs & Candès 2021 (*NeurIPS*).

### Selective prediction / learning to reject

- Chow 1957 (*IRE Trans Electronic Computers*) — Chow's rule, baseline histórico.
- El-Yaniv & Wiener 2010 (*JMLR* 11) — selective classification framework.
- Geifman & El-Yaniv 2017 (*NeurIPS*) — selective classification for DL.
- Gangrade, Kag & Saligrama 2021 (*ICML*) — selective regression.

### First-passage time e survival analysis

- Borodin & Salminen 2002 — *Handbook of Brownian Motion* (first-passage fórmulas em OU).
- Kvamme, Borgan & Scheel 2019 (*JMLR* 20) — time-to-event com neural networks.
- Lee et al. 2018 (*AAAI*) — DeepHit.

### Online learning + drift detection

- Bifet et al. 2010 — MOA framework; Montiel et al. 2021 (*JMLR* 22) — river library.
- ADWIN: Bifet & Gavaldà 2007 (*SDM*).
- Page-Hinkley, DDM (Gama et al. 2004), KSWIN (Raab et al. 2020).
- Online quantile estimation: t-digest (Dunning 2014 github.com/tdunning/t-digest); GK algorithm (Greenwald & Khanna 2001 SIGMOD).

### Anomaly detection em TS financeiras (baseline para "oportunidade vs ruído")

- Hundman et al. 2018 (KDD) — LSTM + nonparametric thresholding.
- Audibert et al. 2020 (KDD) — USAD autoencoder.
- Blázquez-García et al. 2021 (*ACM Computing Surveys* 54) — review.

### Financial ML methodology (labeling, evaluation)

- López de Prado 2018 — *Advances in Financial Machine Learning* (book): triple-barrier, meta-labeling, purged K-fold CV, embargo, fractional differentiation.
- Bailey & López de Prado 2014 — Deflated Sharpe Ratio.

### Microestrutura e formação do spread cross-venue (mandatório para D2/D3)

- Makarov & Schoar 2020 (*JFE* 135) — seminal cross-exchange crypto.
- Hautsch, Scheuch & Voigt 2024 (*Review of Finance* 28(4)) — limits to arbitrage, latência settlement > 40 % dos custos marginais.
- Crépellière et al. 2023 (*JFM* 64) — declínio pós-2018 em top-5.
- Guo, Intini & Jahanshahloo 2025 (*FRL* 71) — risco de default prolonga oportunidades.
- Shu et al. 2023 (*Accounting & Finance* 63) — asymmetry de base de investidores.

### Rust ML ecosystem (mandatório D7)

- linfa: github.com/rust-ml/linfa
- candle: github.com/huggingface/candle
- burn: github.com/tracel-ai/burn
- tract: github.com/sonos/tract
- ort: github.com/pykeio/ort
- polars: github.com/pola-rs/polars
- smartcore: github.com/smartcorelib/smartcore
- tangram: github.com/tangramdotdev/tangram
- benchmarks cruzados: nenhum canônico ainda — agente deve compilar tabela comparativa própria citando fontes.

---

## 5. Decomposição em 10 domínios de pesquisa paralela

Cada domínio vai para um sub-agente PhD distinto. Relatório por domínio: 1000–2000 palavras, URLs, número, steel-man, red-team.

### D1 — Formulação algorítmica e tradução matemática do TradeSetup

**Questão central**: dada a formulação do §3, qual é a melhor decomposição algorítmica para produzir `{enter_at, exit_at, gross_profit, realization_probability, expected_horizon}` simultaneamente e com coerência interna?

**Armadilhas do §3.5 sob responsabilidade primária**: **T1** (reward hacking), **T2** (marginais vs conjunta), **T4** (heavy tails), **T5** (abstenção), **T10** (Pareto vs setup único).

Investigar pelo menos:
1. **Arquitetura monolítica**: um único modelo (NGBoost ou CQR multi-output) prevendo distribuição conjunta.
2. **Arquitetura composta**: (a) quantile regression de `entrySpread` atual vs histórico; (b) distributional regression condicional de `exitSpread` futuro; (c) survival model para horizonte; (d) pós-processamento que combina em TradeSetup + abstém quando necessário.
3. **Abordagem ECDF + bootstrap empírico condicional** (baseline trivial semi-paramétrico) — muitas vezes indistinguível de ML em baixo SNR.
4. **Abordagem Bayesian** com posterior conjunto e Monte Carlo para extrair quantis de utilidade.
5. **Aprendizado por reforço** com função de utilidade explícita (discutir se é over-engineering).

**Design da função de utilidade (T1 — obrigatório, não pode ser esquecido)**: apresentar ao menos 3 formulações de utilidade e discutir susceptibilidade a reward hacking de cada. Exemplos:
- `U₀ = P × gross_profit` (ingênuo — vicia em micro-spreads).
- `U₁ = P × max(0, gross_profit − floor)` com floor configurável.
- `U₂ = P × gross_profit − λ × |gross_profit − target|` (regularização por target explícito).
- `U₃ = expected CVaR` (retorno esperado condicionado a casos bons).
- `U₄` = multi-objective Pareto (ver T10).

Red-team explícito de **cada**: sob que distribuição de histórico cada utility vicia? Quantifique com simulação.

**Output estruturado do TradeSetup**: deve incluir reason code para abstenção (T5), quantis do horizonte além da média (T4), e verificação de coerência interna (T2) — o modelo verifica que a decomposição (enter_at, exit_at) respeita a identidade `S_entrada + S_saída = −(bid_ask_A + bid_ask_B)/ref` no instante t₀ antes de emitir.

**Steel-man obrigatório** entre as 5 arquiteturas. **Red-team**: para cada, cenários de falha.

**Perguntas críticas**:
- Se ECDF empírica + bootstrap dá AUC-PR a 5 pp do modelo ML mais sofisticado, **por que não ficar com ECDF**? Quantifique ganho marginal em Sharpe/capacity, não em elegância.
- Coerência interna (`gross_profit = enter_at + exit_at` respeita `P(realize)` por construção) — quais arquiteturas garantem isso e quais exigem post-hoc?
- **Pareto vs setup único (T10)**: recomendar um setup força o modelo a escolher risk aversion pelo operador; emitir frontier dá poder ao operador mas complica UX. Qual vence em evidência?

### D2 — Microestrutura e formação do spread cross-venue em regime longtail

**Questão central**: quais propriedades estatísticas do processo `(S_entrada(t), S_saída(t))` em venues tier-2/3 crypto são **diferentes** do regime top-5 que a literatura majoritariamente estuda? O que dita a previsibilidade?

Investigar: heavy-tailedness (estimar índice de cauda α via Hill estimator); dependência serial (ACF, long-memory via Hurst exponent R/S ou DFA); regime switching (Hamilton 1989, HMM); efeitos time-of-day e day-of-week empíricos (horário asiático vs US vs overlap); propagação de choque entre rotas compartilhando símbolo; relação entre `book_age` e previsibilidade do spread; impacto de eventos (listings, delistings, funding snapshots, halts).

**Saída**: caracterização empírica mínima que o modelo de D1 precisa acomodar. Cite papers de microestrutura com número. Aponte onde literatura é silenciosa sobre longtail — essas lacunas viram cuidados metodológicos para D1/D3/D4.

### D3 — Feature engineering

**Questão central**: dado o stream de entrada (§1), que features derivadas por rota agregam poder preditivo aos subproblemas do §3.2?

Candidatos a investigar com ablation em literatura adjacente:
- Quantis rolantes de `entrySpread`/`exitSpread` em múltiplas janelas (15 min, 1 h, 4 h, 24 h, 7 d).
- Z-score robusto (median + MAD) vs Welford EWMA.
- Estatísticas da distribuição histórica condicional de `exitSpread` dado `entrySpread(t)` atual (percentis, moments).
- Correlação rolante `entrySpread × exitSpread` e desvio do baseline `−(bid_ask_A + bid_ask_B)/ref`.
- `book_age` transformado (log, exp-decayed) como proxy de liquidez.
- `vol24` normalizado cross-venue.
- Features de regime: Hurst, realized volatility, Parkinson estimator.
- Time-of-day sinusoidal (hora do dia, dia da semana).
- Cross-route: quantas rotas do mesmo símbolo estão com entry alto simultaneamente (sinaliza news).
- Features de venue: latency média de WS frames, fração de stale symbols, reconnect recency.

**Steel-man**: conjunto enxuto (≤ 15 features) vs conjunto rico (> 50). Qual ganha qual métrica?

**Red-team**: quais features têm leakage retrospectivo silencioso (incluir `t₀` na janela de cálculo das estatísticas históricas)? Quais são instáveis entre venues (vol24 reportado diferentemente)?

Recomendar set inicial mínimo viável + roadmap de expansão testável com ablation.

### D4 — Labeling, backtesting e avaliação sem ground-truth público

**Questão central**: como construir labels e protocolo de avaliação para o `TradeSetup` calibrado do §3.1, sem dataset rotulado público?

Investigar:
- **Triple-barrier method** (López de Prado 2018) adaptado: dado snapshot em `t₀` com `entrySpread(t₀)`, rotular sucesso sse ∃ `t₁ ∈ [t₀, t₀+T_max]` com `S_entrada(t₀) + S_saída(t₁) ≥ target`, onde `target` e `T_max` variam para gerar dataset de múltiplas targets.
- **Meta-labeling** para separar "existe oportunidade" de "executar este trade agora".
- Labeling para **abstenção**: tratar não-emissão como ação válida com utilidade 0.
- **Purged walk-forward K-fold** com embargo temporal (evita leakage via autocorrelação).
- Métricas: **precision@k**, **recall@k**, **AUC-PR**, **pinball loss** (quantile regression), **ECE** e **Brier score** (calibração), **coverage** para conformal intervals, **profit curve simulada** pós-fee hipotético, **Sharpe simulado com DSR deflation** (Bailey & López de Prado 2014).
- **Multiple testing correction** quando rankear muitas configurações (Benjamini-Hochberg, DSR).
- **Simulação de uso humano**: operador só executa se `P(realize) ≥ τ` — avaliar métrica condicionada a este filtro.

**Steel-man**: protocolo proposto vs alternativas (random train/test, time-based holdout simples, block bootstrap).

**Red-team**: regimes em que o backtest mente (survivorship de símbolos, mudança de fee tier no meio do período, halts, spike events concentrados); como detectar.

### D5 — Calibração e quantificação de incerteza

**Questão central**: como garantir que `realization_probability` reportada é **empiricamente calibrada** (se modelo diz 0.80, ~80% dos trades daquela categoria realizam)? E como fornecer IC 95% com **cobertura garantida** em regime não-IID?

Investigar:
- Conformal prediction **marginal** (cobertura empírica em média sobre teste) vs **condicional** (cobertura empírica para cada categoria/rota).
- CQR (Romano et al. 2019) para intervalos não-simétricos apropriados a distribuições assimétricas de retorno.
- **Adaptive conformal inference** sob distribution shift (Gibbs & Candès 2021; Zaffran et al. 2022).
- Post-hoc calibration: Platt scaling, isotonic regression, temperature scaling (Guo et al. 2017 ICML), beta calibration.
- Monitorização online de calibração: reliability diagram rolante, ECE rolante.

**Implementação em Rust**: conformal core é trivial (quantis de resíduos). CQR idem. Conseguem-se sem deps externas? Confirmar.

**Steel-man**: conformal vs Bayesian posterior vs bootstrap. Qual vence quando.

**Red-team**: regimes em que conformal falha (IID violado, distribution shift severo); como detectar.

### D6 — Online learning + drift detection

**Questão central**: crypto longtail tem não-estacionariedade severa (listings, delistings, halts, mudanças de funding, mudanças de fee tier, eventos macro). Qual estratégia temporal vence?

Comparar:
- **Retreino periódico offline** com janela rolante (1 dia? 7 dias? 30 dias?) e cadência fixa (diária? horária?).
- **Online learning incremental** (Hoeffding Adaptive Tree, online gradient descent, online quantile estimation via t-digest, online CQR com CQR-Ada).
- **Ensemble adaptativo** com drift detectors (ADWIN, Page-Hinkley, DDM, KSWIN) que acionam retreino.
- **Hybrid**: online estimation para quantis rolantes + retreino offline noturno para modelo principal.

Benchmarks: retention de quality sob drift sintético e real; latência incremental update; custo de retreino; memory footprint.

**Preferência Rust**: avaliar se `linfa` suporta incremental fit; se não, implementação direta de online quantile estimation (t-digest Rust-native existe: `tdigest` crate). `river` é Python — só se Rust não tem nada.

**Steel-man**: offline periódico vs online vs hybrid.

**Red-team**: regime shift brusco (halt de venue, delisting) — como cada opção degrada?

**Pergunta crítica**: o operador tolera recomendação ML 10 min "stale"? Se sim, retreino offline simples noturno pode bater online learning complexo. Quantifique.

### D7 — Rust ML ecosystem: estado da arte 2026 (mandatório, denso)

**Questão central**: mapear exaustivamente o ecossistema Rust para os componentes do §3. Para cada crate candidato, reportar:

- Crate name, autor/mantenedor, versão atual, última release, stars, issues abertos.
- Algoritmos suportados.
- Benchmarks (inferência latência p50/p99, memória, throughput, acurácia vs equivalentes Python).
- Maturidade (toy / beta / production-ready) — justificar com evidência.
- Integração com outros crates do projeto (tokio, serde, polars).
- Dependências externas (libtorch? CUDA? BLAS?).
- Licença.
- Casos conhecidos em produção (cite).

Crates mínimos a cobrir:

**Tabular ML**:
- `linfa` + sub-crates (linfa-trees, linfa-linear, linfa-nn, linfa-ensemble).
- `smartcore`.
- `tangram` (gradient boosting Rust-native).
- `lightgbm-rs`, `xgboost-rs`, `catboost-rs` (bindings).

**Deep learning**:
- `candle` (HuggingFace, tensor-based).
- `burn` (multi-backend, Rust-native).
- `tch` (PyTorch bindings).
- `dfdx`.

**Inference-only**:
- `tract` (ONNX pure-Rust, sem deps).
- `ort` (ONNX Runtime Microsoft bindings).

**Probabilistic / Bayesian**:
- `rv` (distributions), `changepoint` (BOCPD), `rustats`.
- `statrs`.

**Time series**:
- `augurs` (HuggingFace TS).
- `temporal_rs`, `tempo`.

**Dados**:
- `polars`, `datafusion`, `arrow-rs`, `lance`, `ndarray`.

**Feature store / DB**:
- `questdb-rs`, `clickhouse-rs`, `sled`, `redb`, `fjall`, `rocksdb-rs`.

**Quantile / streaming statistics**:
- `tdigest`, `p2`, `streaming-stats`, `hdrhistogram` (já no projeto).

**Conformal / calibration**:
- Nenhum crate dedicado conhecido — confirmar via busca github + crates.io.

**Output**: tabela comparativa grande + recomendação por camada + **pontos de dor** onde Rust ainda não tem solução (justificativa explícita para possível Python bridge).

**Red-team**: para cada recomendação Rust, cite o equivalente Python maduro. Comprove com número que Rust é adequado OU explicite a lacuna.

### D8 — Serving architecture: Rust inline vs serviço separado

**Questão central**: dada a latência hard (p99 < 500 µs scanner; ciclo spread < 2 ms; 2600 símbolos × 150 ms → 17 k updates/s), onde colocar a inferência ML?

Comparar arquiteturas com números:

- **A1 — Inline no processo scanner Rust**: modelo embedado; shared memory; ZERO IPC overhead. Restrição: modelo precisa caber em budget < 60 µs/inferência para 2600 rotas em 150 ms (assumindo single-thread; paralelismo expande isso).
- **A2 — Thread dedicada no mesmo binário**: scanner publica snapshot em shared memory (ex: `crossbeam::channel` ou `arc_swap`); thread ML consome, enriquece, re-publica. Overhead micro-segundo. Budget ML maior (milissegundos).
- **A3 — Processo separado same-host**: IPC via shared memory (`shared_memory` crate), named pipe, ou Unix socket. Overhead ~10–100 µs.
- **A4 — Serviço gRPC remoto**: scanner é cliente. Overhead ~1–10 ms. Permite GPU/Python no serviço.
- **A5 — Sidecar consumindo `/ws/scanner`**: menor acoplamento, reaproveita broadcast existente. Overhead WS ~100 µs–1 ms.

Para cada, estimar: latência added, memory overhead, failure modes, dev complexity, update cadence do modelo.

**Steel-man**: A1 vs A2 vs A5. **Red-team**: qual falha catastroficamente sob qual carga?

**Recomendação final**: combinação específica com justificativa numérica.

### D9 — Feature store e histórico persistente

**Questão central**: cálculo dos quantis rolantes e distribuições condicionais da §3.2 exige histórico de 24h+ por rota. Ordem de magnitude: 2600 rotas × ~6 RPS × 24 h ≈ 1.35 × 10⁹ observações/dia (se arquivarmos tudo). Mais realista se apenas snapshots distintos ou updates delta: ainda na ordem de 10⁸/dia.

Comparar:
- **QuestDB** (time-series nativa, já próximo do ecossistema Rust, client oficial existe): latência de inserção, latência de query de percentil rolante, footprint.
- **ClickHouse** (OLAP, compressão agressiva, funciones quantil nativas): crate `clickhouse-rs`.
- **Arrow-Flight + Parquet particionado em disco local**: sem servidor, compressão excelente; queries ad-hoc via `datafusion`.
- **Lance** (columnar ML-native, Rust): otimizado para vetores e ML.
- **Embedded KV: `sled`, `redb`, `fjall`, `rocksdb`**: baixa latência, exige app-layer para estatísticas.
- **Híbrido**: KV embedded para hot path + Parquet archival noturno.

Para cada: benchmark publicado de latência de insert single-row, batch, e query de percentile em janela rolante; memory footprint; failure modes.

**Steel-man**: QuestDB vs embedded Rust DB. **Red-team**: corrupção, backup, migration path.

### D10 — Validação shadow mode, ablation, production-readiness

**Armadilhas do §3.5 sob responsabilidade primária**: **T3** (viés observacional vs causal), **T7** (correlação de rotas), **T11** (execution feasibility gap), **T12** (feedback loop).

**Questão central**: como validar o modelo em produção antes de operador confiar?

Protocolo:
- **Shadow mode**: modelo roda em paralelo com operação real; emite recomendações sem executar; coleta-se calibração empírica (ECE) e precision@k observados vs. previstos por 30–60 dias.
- **Ablation study** em produção: rotacionar periodicamente versões do modelo com feature sets reduzidos; comparar métricas.
- **A/B discriminado por rota**: algumas rotas servidas por modelo A, outras por modelo B, medir drift.
- **Canary release** com fração de rotas usando novo modelo.
- **Kill switch**: métrica de calibração ou precision@k abaixo de threshold → reverter automaticamente.
- **Dashboard**: reliability diagram rolante, precision@k rolante, coverage do IC rolante, utilização de abstenção.

**Steel-man**: shadow mode vs canary vs A/B.

**Red-team**: como o modelo pode parecer bom em shadow e falhar em exec? (slippage não modelado, viés de seleção nas rotas cobertas, hard-to-fill no pico do spread).

Recomendar plano de rollout gradual com gating metrics específicos.

---

## 6. Critérios de qualidade das recomendações (todos os domínios)

Cada recomendação responde explicitamente:

1. **Baseline trivial não-ML** (percentil histórico + ECDF condicional + bootstrap) e **quanto ML agrega em número** — AUC-PR, pinball loss, Sharpe simulado, capacity absorvida.
2. **Custo computacional**: FLOPs/inferência, memória, latência p99 projetada, throughput.
3. **Interpretabilidade**: feature importance local; operador vê razão contrastiva?
4. **Risco de overfitting** sem ground-truth público — mitigação via protocolo.
5. **Sensibilidade a regime shift** — degradação quantificada.
6. **Esforço de implementação** em semanas-pessoa; pontos de integração com scanner Rust existente.
7. **Gatilho proativo**: se confiança < 80%, flag "exige decisão do usuário — evidência não-dominante".
8. **Aderência à preferência Rust**: Rust como default; Python só com burden-of-proof cumprido.

---

## 7. Anti-padrões proibidos

- Recomendar Python sem cumprir burden-of-proof de §0 regra 5.
- Recomendar deep learning (Transformer, LSTM) sem benchmark direto vs gradient boosting / regras simples **neste regime** (baixo SNR, não-estacionário, 2600 séries paralelas curtas).
- Propor pipeline que quebre budget de latência do scanner sem arquitetura alternativa (serviço separado com números).
- Silenciar extrapolação de literatura adjacente.
- Esconder trade-off interpretabilidade × acurácia.
- Convergir antes de steel-man das 3 alternativas.
- Presumir que "padrão da indústria" (XGBoost, PyTorch) é ótimo aqui sem demonstrar.
- Omitir cenários em que a recomendação falha.
- Tratar o operador como autômato — é filtro para decisão humana de alta confiança.
- Recomendar modelo sem protocolo de **calibração obrigatória** (ECE, reliability diagram).
- Omitir abstenção do design — modelo precisa poder "não emitir" quando não tem certeza.

---

## 8. Documentação obrigatória organizada

Todo o output dos agentes, toda decisão, todo benchmark, toda armadilha tratada, todo experimento deve ser persistido numa estrutura de pastas versionada em git. Fontes dispersas em mensagens de chat não contam — precisa virar artefato. Estrutura proposta:

```
docs/ml/
├── 00_research/                    # Relatórios dos 10 sub-agentes
│   ├── D01_formulation.md          # D1 — formulação algorítmica
│   ├── D02_microstructure.md
│   ├── D03_features.md
│   ├── D04_labeling.md
│   ├── D05_calibration.md
│   ├── D06_online_drift.md
│   ├── D07_rust_ecosystem.md       # Tabela comparativa exaustiva
│   ├── D08_serving.md
│   ├── D09_feature_store.md
│   └── D10_validation.md
│
├── 01_decisions/                   # ADRs (Architecture Decision Records)
│   ├── ADR-001-formulation-choice.md
│   ├── ADR-002-utility-function.md
│   ├── ADR-003-rust-vs-python.md
│   ├── ADR-004-calibration-method.md
│   ├── ADR-005-serving-architecture.md
│   └── ...                         # Uma ADR por decisão não-trivial
│
├── 02_traps/                       # Armadilhas §3.5 tratadas
│   ├── T01_reward_hacking.md       # Tratamento + residual risk por armadilha
│   ├── T02_joint_vs_marginal.md
│   ├── T03_causal_vs_observational.md
│   ├── ...                         # 12 arquivos, um por armadilha
│   └── T12_feedback_loop.md
│
├── 03_models/                      # Model cards
│   ├── <model_name>_<version>.md   # nome, versão, features, dataset, métricas, known failure modes
│   └── ...
│
├── 04_experiments/                 # Experiment tracking
│   ├── runs/                       # Export de runs (MLflow/wandb ou YAML/JSON Rust-native)
│   ├── configs/                    # Config por experimento (hyperparameters, feature set, split)
│   └── README.md                   # Convenção de nomeação e metadados
│
├── 05_benchmarks/                  # Resultados de benchmarks
│   ├── rust_libs_comparison.md     # Output do D7 denso
│   ├── latency_e2e.md              # p50/p95/p99 por componente
│   ├── calibration_drift.md        # ECE rolante por regime
│   └── ...
│
├── 06_labels_and_data/             # Schema e protocolo de labeling
│   ├── label_schema.md             # Triple-barrier parametrization, purging rules
│   ├── data_lineage.md             # Origem de cada feature, janela de cálculo, auditoria de leakage
│   └── purged_cv_protocol.md
│
├── 07_calibration_reports/         # Reliability diagrams, ECE, coverage
│   ├── <model>_<period>/           # Um subdir por modelo × período
│   │   ├── reliability.png
│   │   ├── ece_rolling.csv
│   │   ├── conformal_coverage.csv
│   │   └── report.md
│   └── ...
│
├── 08_drift_reports/               # Logs de drift detection, retreino triggers
│   ├── drift_events.csv            # Log append-only de eventos detectados
│   └── retrain_decisions.md
│
├── 09_shadow_mode/                 # Resultados de shadow mode (D10)
│   ├── precision_at_k_observed.csv
│   ├── calibration_observed.md
│   ├── execution_haircut.md        # Diferença cotado vs realizado, T11
│   └── ...
│
├── 10_operations/                  # Runbook operacional
│   ├── runbook.md                  # Deploy, rollback, monitor
│   ├── kill_switch.md              # Gating metrics + triggers automáticos
│   ├── on_call_procedures.md
│   └── alerting.md
│
└── 11_final_stack/                 # Documento consolidado final
    ├── STACK.md                    # §6 entregável consolidado
    ├── ROADMAP.md                  # 3 marcos
    └── OPEN_DECISIONS.md           # Pontos onde evidência não é dominante
```

### Convenções obrigatórias

- Todo documento em `docs/ml/` tem **frontmatter YAML**: `status` (draft / review / approved / superseded), `author`, `date`, `version` (semver), `supersedes` (quando aplicável), `reviewed_by`.
- ADRs seguem template curto: **Contexto / Decisão / Alternativas consideradas / Consequências / Status**.
- Model cards seguem Mitchell et al. 2019 (*FAccT*) — Model Details, Intended Use, Factors, Metrics, Training Data, Evaluation Data, Ethical Considerations, Caveats.
- Versionado em git do projeto principal. Não é opcional — **código sem documentação correspondente não merge**.
- README na raiz de `docs/ml/` serve como índice navegável; cada domínio linka seus sub-documentos.

### Por que isto não pode ser negligenciado

O stack ML terá decisões tomadas ao longo de meses, com trade-offs sutis (T1–T12). Seis meses depois, sem documentação:
- Ninguém lembra por que a utilidade `U₁` com floor foi escolhida sobre `U₀` — risco de regressão.
- Novo colaborador refaz os mesmos estudos que já foram feitos.
- Auditoria de leakage (T9) fica sem rastro; regressão silenciosa é indetectável.
- Operador humano perde confiança no sistema por não saber o que justifica cada recomendação.

---

## 9. Entregável consolidado final

Após convergência inter-agentes, produzir documento único:

```
STACK ML RECOMENDADO PARA TRADESETUP CALIBRADO

1. FORMULAÇÃO ALGORÍTMICA (D1): …
2. MICROESTRUTURA ACOMODADA (D2): …
3. FEATURES (D3): …
4. LABELING + AVALIAÇÃO (D4): …
5. CALIBRAÇÃO + INCERTEZA (D5): …
6. DRIFT HANDLING (D6): …
7. RUST ECOSYSTEM ESCOLHIDO (D7): …
8. SERVING ARCHITECTURE (D8): …
9. FEATURE STORE (D9): …
10. VALIDAÇÃO EM PRODUÇÃO (D10): …

JUSTIFICATIVA CRUZADA (por que os 10 domínios formam stack coerente)

BASELINE NÃO-ML CONTRA QUAL SEMPRE COMPARAR
(ECDF condicional + bootstrap; protocolo de avaliação contínua)

ALTERNATIVAS SÉRIAS REJEITADAS (≥ 2 por domínio, razão numérica)

ADERÊNCIA RUST: inventário de componentes Rust; componentes Python se houver + justificativa burden-of-proof

CENÁRIOS EM QUE ESTE STACK FALHA (red-team consolidado)

ROADMAP DE IMPLEMENTAÇÃO
- Marco 1 (2–3 semanas): …
- Marco 2 (6–8 semanas): …
- Marco 3 (12–16 semanas): …

MÉTRICAS DE GATING PARA CADA MARCO
(precision@k mínimo, ECE máximo, coverage mínimo, latência p99 máxima)

DECISÕES QUE REQUEREM INPUT DO USUÁRIO
(pontos onde evidência não é dominante — listar com alternativas e trade-offs numéricos)
```

Quando agentes discordarem entre domínios: **explicitar o conflito com evidência de cada lado antes de convergir**. Não fabricar consenso.

---

## Apêndice A — Checklist de briefing ao despachar sub-agente

Ao despachar cada um dos 10 sub-agentes, incluir ao prompt:

- §0 (postura crítica) completa.
- §1 (contexto projeto) completa.
- §2 (estratégia) completa.
- §3 (problema ML) completa.
- §4 (literatura adjacente) completa — ou a subseção relevante ao domínio.
- Apenas o domínio específico do §5 que o agente deve atacar.
- §6 (critérios) completa.
- §7 (anti-padrões) completa.

Nunca despachar com contexto truncado. O custo de tokens extra é desprezível comparado ao custo de recomendação mal-calibrada.

---

## Apêndice B — Execução sugerida

1. Despachar os 10 sub-agentes em uma única mensagem com múltiplos tool-uses paralelos (background).
2. Aguardar convergência — cada sub-agente retorna relatório próprio.
3. Agente consolidador (pode ser o próprio invocador ou um 11º agente) faz §8.
4. Apresentar ao usuário: stack recomendado + decisões que exigem input + roadmap.
5. Usuário autoriza ou pede revisão de pontos específicos.
6. Só então iniciar implementação do Marco 1.

**Nunca pular steel-man ou red-team para ganhar tempo.** Marcos de implementação posteriores dependem de as escolhas iniciais estarem certas — refatoração de arquitetura ML custa semanas.
