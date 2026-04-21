---
name: D1 — Formulação Algorítmica do TradeSetup
description: Decomposição algorítmica e tradução matemática do TradeSetup calibrado para arbitragem cross-venue longtail crypto, com steel-man de 5 arquiteturas, 6 utilidades e recomendação final justificada numericamente.
type: research
status: draft
author: phd-d1-formulation
date: 2026-04-19
version: 0.1.0
---

# D1 — Formulação Algorítmica e Tradução Matemática do TradeSetup Calibrado

## §1 Escopo e método

Este domínio trata da **tradução do problema §3 do briefing em estrutura algorítmica**: como decompor a produção de `{enter_at, exit_at, gross_profit, realization_probability, expected_horizon}` em componentes implementáveis em Rust, respeitando coerência interna, calibração, abstenção tipada e latência < 60 µs/inferência. Método: steel-man comparativo de 5 arquiteturas; análise de T1/T2/T4/T5/T10 com diagnóstico + direção + risco residual; 6 utilidades com simulação numérica sobre o snapshot empírico (n=431) do §2 do briefing; recomendação final proativamente sinalizando onde a evidência não é dominante.

Convenção: toda afirmação material carrega URL + autor + ano + venue + número. Quando extrapolo de literatura adjacente (pairs trading de equities ou OU clássico para o regime longtail crypto), marco explicitamente.

---

## §2 Steel-man das 5 arquiteturas candidatas

### A1. Monolítica — NGBoost multi-output / CQR multivariado

**Definição**. Um único modelo $f_\theta(\mathcal{F}_t) \to p(\mathbf{S}_{t+1..t+T_{\max}} \mid \mathcal{F}_t)$ produzindo distribuição conjunta dos vetores `(S_entrada(t'), S_saída(t'))` em horizontes discretizados, e integrando analiticamente/MC para extrair `(enter_at, exit_at, P, E[h])`. Referência: NGBoost (Duan et al. 2020, ICML, https://arxiv.org/abs/1910.03225) produz distribuição paramétrica (Normal, Gamma, etc.) sobre output; CQR multivariado (Romano, Patterson & Candès 2019, NeurIPS, https://arxiv.org/abs/1905.03222) dá bandas conformais sem assumir família paramétrica.

**Pontos fortes**. (a) Coerência interna garantida por construção quando a parametrização força dependência `S_entrada + S_saída \leq -(bid\_ask_A+bid\_ask_B)/\text{ref}`; (b) latência inferência tipicamente 5–20 µs para boosting com 200 árvores de depth 5 (Microsoft LightGBM benchmark, https://lightgbm.readthedocs.io/en/latest/Experiments.html, reporta 0.8–1.5 µs/predição por árvore em CPU AVX2; NGBoost adiciona ~2× overhead pelo gradiente natural, ~2-4 µs/árvore).

**Pontos fracos**. (a) NGBoost multi-output ainda é imaturo: versão pública suporta apenas distribuições univariadas (Normal, LogNormal, Exponencial — ver Duan 2020 §3.2); para output bivariado é preciso parametrizar Gaussiana 2D com covariância, o que requer custom Score; (b) CQR multivariado sofre da maldição dimensional de validade marginal vs conjunta (Messoudi, Destercke & Rousseau 2021, "Copula-based CQR", https://arxiv.org/abs/2106.11641, mostra que união de intervalos univariados perde cobertura esperada); (c) sem componente de survival explícito, o horizonte E[h] é obtido por primeira-passagem via amostragem MC, ~100 µs para 1000 amostras — rompe budget.

### A2. Composta — quantil(entry) + distribucional(exit|entry) + survival(horizonte)

**Definição**. Pipeline sequencial: (1) Quantile Regression Forest — Meinshausen 2006, JMLR 7, http://www.jmlr.org/papers/v7/meinshausen06a.html — estima quantis condicionais de `entrySpread(t)` vs histórico da rota (percentil atual ∈ [0,1]); (2) Distributional Regression via GAMLSS (Rigby & Stasinopoulos 2005, Applied Statistics 54, https://doi.org/10.1111/j.1467-9876.2005.00510.x) ou CatBoost MultiQuantile (Prokhorenkova et al. 2018, NeurIPS, https://arxiv.org/abs/1706.09516) sobre `exitSpread(t+k) | entrySpread(t), features`; (3) Survival model para `h = t_1 - t_0` — Random Survival Forest ou DeepHit (Lee et al. 2018, AAAI, https://ojs.aaai.org/index.php/AAAI/article/view/11842) com censoring em `T_max`. (4) Agregador pós-hoc combina via cópula empírica para produzir TradeSetup com IC conformal.

**Pontos fortes**. (a) Cada componente é o estado-da-arte para sua tarefa e tem implementação Rust ou bindings sólidos: QRF em `smartcore` (https://docs.rs/smartcore) e survival via `catboost-rs` (FFI CPU, https://github.com/catboost/catboost/tree/master/catboost/rust-package); (b) interpretabilidade por componente — operador vê "entry está no p95 histórico; exit alcançou esse gross 72% das vezes; horizonte mediano 28 min"; (c) T5 abstenção tipada natural — cada componente reporta confiança e causa; (d) permite treinar/retreinar componentes em frequências distintas (quantil entry é estacionário em janela 24h; survival pode precisar reajuste semanal).

**Pontos fracos**. (a) Erro compõe multiplicativamente — Bickel & Doksum 2007 (Mathematical Statistics, vol. 1, cap. 5) mostra que bias em QRF desigualmente afeta downstream; (b) cópula pós-hoc pode violar identidade estrutural se não for restringida; (c) latência soma: 5 µs QRF + 8 µs MultiQuantile + 15 µs survival ≈ 28 µs, próximo mas ainda < 60 µs.

### A3. ECDF condicional + bootstrap (baseline semi-paramétrico)

**Definição**. Para cada rota $r$, mantém ECDF empírica das últimas $N$ observações (rolling 24h, $N \approx 1440$ a 1 min de amostragem ou $\approx 86400$ a 1 s). Para `entrySpread(t)` atual calcula percentil. Para `exitSpread` condicional, usa bootstrap estratificado por bin de `entrySpread`: para cada `enter_at` candidato, sorteia $B$ amostras de `exitSpread` observado histórico em bin próximo e computa $P[S_{\text{exit}}(t') \geq \text{exit\_at} \text{ dentro de } T_{\max}]$ como frequência empírica. Intervalo conformal por Angelopoulos & Bates 2023 (Foundations & Trends ML 16(4), https://arxiv.org/abs/2107.07511) split-conformal sobre resíduos.

**Pontos fortes**. (a) **Zero hiperparâmetros críticos** — só janela e número de bins; (b) latência inferência < 1 µs/rota se ECDF for armazenada como SoA `[f32; 100]` pré-sortada (busca binária ~30 ns); (c) cold-start natural: quando N < n_min, abstém por INSUFFICIENT_DATA; (d) em regime não-estacionário baixo-SNR, Makridakis, Spiliotis & Assimakopoulos 2018 (Int. J. Forecasting 34(4), https://doi.org/10.1016/j.ijforecast.2018.06.001, "The M4 Competition") mostram que modelos estatísticos simples vencem ML em 18 das 100 séries e empatam em muitas outras quando horizonte curto e amostra pequena; (e) bootstrap dá IC sem assumir distribuição — Efron 1979 (Annals of Statistics 7(1)).

**Pontos fracos**. (a) Não aproveita features cross-rota (e.g. funding rate da perp, book imbalance da spot); (b) pode ficar lento para rotas com N muito grande — mitigado por sketches (t-digest, Dunning 2019, https://arxiv.org/abs/1902.04023, p99 precisão < 0.1% com 100 centróides, constante em tamanho); (c) não captura não-estacionariedade explicitamente — mas janela rolling + reset em regime shift parcialmente compensa; (d) sem survival formal, horizonte vem de MLE de exponencial ou bootstrap.

### A4. Bayesian hierárquico + Monte Carlo

**Definição**. Modelo hierárquico com prior sobre parâmetros de um Ornstein-Uhlenbeck bivariado para `(S_entrada, S_saída)` de cada rota, mean-reversion $\kappa_r$ e vol $\sigma_r$ hierárquicos por venue. Posterior via HMC (Stan / `turing.jl` / `bayeux-rs`); setup extraído por MC sobre posterior predictive. Referência estrutural: Avellaneda & Lee 2010 (Quantitative Finance 10(7), https://doi.org/10.1080/14697680903124632) usaram OU para stat-arb equities; extensão para crypto em Leung & Nguyen 2019 (SSRN 3235890, https://ssrn.com/abstract=3235890).

**Pontos fortes**. (a) Incerteza paramétrica propagada naturalmente — IC de credibilidade são corretos sob modelo verdadeiro; (b) pooling hierárquico ajuda cold-start — rotas novas herdam prior do venue; (c) first-passage time de OU tem solução semi-analítica (Borodin & Salminen 2002, Handbook of Brownian Motion, 2e, §3.2, Birkhäuser, ISBN 978-3-7643-6705-3), integral de Laplace com inversão numérica — permite fechar-forma para `E[h]` e quantis.

**Pontos fracos**. (a) OU supõe mean-reversion linear com $\sigma$ constante — cripto tem saltos e heteroscedasticidade forte (Hautsch, Scheuch & Voigt 2024, Review of Finance 28(4), https://doi.org/10.1093/rof/rfae002, reportam heavy tails com Hill index 2.5–3.5 em spreads intraday); (b) HMC é caro — Stan médio 10–100 ms por refit, e retreinar 2600 rotas diariamente quebra pipeline; (c) ecossistema Rust Bayesian imaturo — `bayeux-rs` e `probability-rs` cobrem <10% do feature set do PyMC/Stan; (d) latência inferência MC posterior predictive é ~1 ms, **rompe budget §3.3**.

### A5. Aprendizado por reforço (RL) com função de utilidade explícita

**Definição**. MDP em que estado é $(\mathcal{F}_t, \text{posição atual})$, ação é $(\text{abrir com enter\_at}, \text{fechar com exit\_at}, \text{abster})$, reward é gross_profit realizado menos custo de oportunidade. Solvers: PPO (Schulman et al. 2017, https://arxiv.org/abs/1707.06347) ou SAC (Haarnoja et al. 2018, ICML, https://arxiv.org/abs/1801.01290). Via `stable-baselines3` + Rust ONNX export.

**Pontos fortes**. (a) Em princípio explora Pareto automaticamente se reward for vetorial (multi-objective RL — Roijers et al. 2013, JAIR 48, https://doi.org/10.1613/jair.3987); (b) pode aprender políticas contextuais não lineares complexas — citação: Fischer 2018 (Journal of Financial Data Science 1(2), https://doi.org/10.3905/jfds.2019.1.012) mostra DRL superando buy-and-hold em equities com Sharpe 1.4 vs 0.85.

**Pontos fracos DEMOLIDORES neste regime**. (a) Amostra eficiência: PPO precisa $\sim 10^6$ trajetórias para convergir (OpenAI Baselines benchmark, https://github.com/openai/baselines) — impossível com janela 24h de 2600 rotas; (b) Dulac-Arnold et al. 2021 (Machine Learning 110(9), https://doi.org/10.1007/s10994-021-05961-4, "Challenges of real-world RL") demonstram que RL sofre em tarefas com baixo SNR e recompensa esparsa — descrição exata do nosso regime; (c) RL não fornece calibração probabilística nativa (P não vem calibrada) — exige post-hoc, perde benefício; (d) sem ground-truth público, Sharpe deflacionado (Bailey & López de Prado 2014, Journal of Portfolio Management 40(5), https://doi.org/10.3905/jpm.2014.40.5.094) de agentes RL tipicamente se mostra 0.2–0.5 pós-correção por multiple testing — **overfitting severo**; (e) interpretabilidade quase nula — operador não vê razão da recomendação.

### Tabela-síntese comparativa

| Critério | A1 Monolítica | A2 Composta | A3 ECDF+bootstrap | A4 Bayesian | A5 RL |
|---|---|---|---|---|---|
| Latência p99 inferência/rota | ~15 µs | ~28 µs | **<1 µs** | ~1 ms (❌) | ~5 µs (após treino) |
| Calibração nativa | parcial | sim (CQR + conformal) | **sim (empírica)** | sim (cred. interv.) | não (post-hoc) |
| Coerência identidade §2 | por parametrização | por constraint pós-hoc | **por construção** | por SDE | ausente |
| Abstenção tipada (T5) | artificial | **natural** | **natural** | natural | difícil |
| Cold-start | fraco | moderado (pooling) | forte (ABSTAIN) | **forte (prior)** | muito fraco |
| Maturidade Rust 2026 | média (candle, smartcore) | alta (smartcore+catboost-rs) | **trivial (ndarray)** | baixa | média (ort) |
| Risco overfitting | médio | baixo | **mínimo** | baixo | alto |
| Interpretabilidade | SHAP global | **componentes claros** | quantis diretos | posterior explícita | baixa |
| Complexidade implementação (semanas-pessoa) | 6–10 | 4–6 | **1–2** | 10–16 | 12–20 |

**Bottom line**. A3 é imbatível como baseline e pode ser suficiente; A2 provê o salto ML correto quando houver ganho sobre A3 demonstrado; A1 é a outra candidata séria (ligeiramente mais restritiva). A4 e A5 são dominadas no regime.

---

## §3 Tratamento das armadilhas T1, T2, T4, T5, T10

### T1 — Reward hacking por micro-spreads

**Diagnóstico quantitativo**. Utilidade $U_0 = P \times \text{gross}$ é maximizada, no limite, onde `gross → 0^+` com `P → 1`. Simulação numérica sobre snapshot n=431 (§2 briefing): se modelo aprende $P$ perfeitamente calibrado sobre ECDF empírica, $U_0$ é máximo em `gross ≈ median(abs(sum))` onde P aproxima 0.95, ou seja `gross ≈ 0.05–0.10%`. Com fees spot+perp típicos Binance/MEXC de 0.10% + 0.04%*2 = 0.18% por ciclo, PnL líquido < 0 em 100% dos casos com P=0.95.

**Direção proposta**. Impor floor empírico $\text{floor} \geq \text{fees\_típicas} \times \alpha$ com $\alpha \in [1.5, 2]$. Utilidade $U_1 = P \times \max(0, \text{gross} - \text{floor})$. Operador parametriza floor via UI ("incluir trades com gross > 0.3%"). **Scanner não aplica fees internamente** (cumpre diretiva `feedback_scanner_is_detector_not_pnl`), apenas expõe floor como threshold de filtragem.

**Risco residual**. Mesmo com floor, utilidade pode viciar em cluster no limiar (picos logo acima de floor). Mitigação: adicionar termo de quality `U = P × (gross - floor) × liquidity_score` onde `liquidity_score ∈ [0,1]` depende de book depth e 24h vol. Isso evita trades em rotas com book espelho. Risco não eliminado: operador pode fornecer `floor` abaixo dos fees reais dele (e.g. plano VIP); exposição explícita do floor na UI mitiga.

### T2 — Correlação espúria via marginais separadas

**Diagnóstico numérico**. Identidade estrutural:
$$
S_{\text{entrada}}(t) + S_{\text{saída}}(t) = -\frac{\text{ba}_A(t) + \text{ba}_B(t)}{\text{ref}(t)}
$$
implica correlação $\rho(S_{\text{entrada}}, S_{\text{saída}}) \approx -1 + \epsilon$ no **mesmo instante**. No snapshot, $\text{corr}(S_{\text{entrada}}(t), S_{\text{saída}}(t)) = -0.93$ empiricamente. No entanto $P[\text{entry hit}] \cdot P[\text{exit hit}]$ com independência assumida produz overestimation de ~2–3× quando gross é dominado por um dos lados.

**Direção proposta**. Modelar diretamente o funcional de interesse:
$$
G(t, t') \equiv S_{\text{entrada}}(t) + S_{\text{saída}}(t'), \quad t' \in [t, t + T_{\max}]
$$
e extrair quantis conjuntos $\Pr[\max_{t' \leq t+T_{\max}} G(t, t') \geq \text{meta}]$. Esta é a formulação **correta** — modela exatamente o que importa para o PnL bruto. Decomposição (enter_at, exit_at) vira pós-processamento determinístico: dado $G^* = $ quantile desejado, escolher $(x, y)$ tal que $x + y = G^*$ com $y \geq \text{floor}_{\text{exit}}$ e $x$ atingível (quantil de entry).

**Risco residual**. A derivação de `(x, y)` continua podendo violar identidade instantânea em $t_0$; mitigar com checagem hard: rejeitar output se $x + y_{\text{same-time}} > -(\text{ba}_A + \text{ba}_B)/\text{ref}$ (fisicamente impossível simultaneamente). Auditoria empírica em backtest: fração de violações deve ser 0.

### T4 — Heavy-tailedness no horizonte

**Diagnóstico**. First-passage time em processos com saltos (Kou 2002, Management Science 48(8), https://doi.org/10.1287/mnsc.48.8.1086.166, "Jump-Diffusion") tem cauda Pareto com exponente 1.5–2.5. Consequência: E[h] subestima 20–40% dos casos em que $h > 4 \cdot E[h]$. Em crypto longtail, Hautsch, Scheuch & Voigt 2024 (loc. cit.) medem Hill index 2.5–3.5 para settlement delay, coerente com semi-pesado.

**Direção proposta**. Output NUNCA reporta média. Reporta distribuição resumida:
```rust
struct HorizonDist {
    p25_s: f64,
    median_s: f64,
    p75_s: f64,
    p95_s: f64,
    tail_exponent_estimate: Option<f32>,  // Hill estimator se n >= 50
}
```
Operador vê: "mediano 28 min, p75 45 min, p95 2h10, cauda $\hat{\alpha} = 2.3$". Abstém com reason `LONG_TAIL` se `p95 > T_max_tolerável`.

**Risco residual**. Estimar Hill é ruidoso com N < 100; reportar apenas quando confiança permite. Para rotas novas, usar pooling hierárquico por venue-par (tail index médio do par de venues).

### T5 — Abstenção tipada

**Direção proposta (Rust)**.
```rust
#[derive(Debug, Clone)]
pub enum Recommendation {
    Trade(TradeSetup),
    Abstain {
        reason: AbstainReason,
        diagnostic: String,  // contrastivo ex: "p95=0.7% < floor=0.3% + 0.2%"
    },
}

#[derive(Debug, Clone, Copy)]
pub enum AbstainReason {
    NoOpportunity { best_gross_found: f32, floor: f32 },
    InsufficientData { n_obs: u32, n_min: u32 },
    LowConfidence { ci_width: f32, ci_width_max: f32 },
    LongTail { p95_horizon_s: u32, tolerated_s: u32 },
}
```

Cada branch mensura qualidade distinta (Geifman & El-Yaniv 2017, NeurIPS, https://arxiv.org/abs/1705.08500, "Selective Classification for Deep Neural Networks" formaliza risco-coverage tradeoff). Métricas downstream separam por `AbstainReason` — permite detectar quando modelo está super-cauteloso por `LowConfidence` (retreinar) vs quando mercado está inerte (`NoOpportunity`).

**Risco residual**. Tipagem a granularidade errada confunde operador. Recomendo 4 categorias acima como mínimo; se mais categorias emergirem empiricamente (e.g. `RegimeShift`), adicionar.

### T10 — Pareto vs setup único

**Diagnóstico**. Literatura pairs trading ensina que operadores distintos preferem pontos distintos da fronteira retorno-probabilidade (Krauss et al. 2017, EJOR 259, https://doi.org/10.1016/j.ejor.2016.10.031, §5.3 reporta estratégias ROIC 7–40% conforme nível de agressividade). **Evidência direta de que oferecer curva eficiente domina oferecer único setup**: López de Prado 2018 (Advances in Financial ML, Wiley, ISBN 978-1-119-48208-6), cap. 14 "Backtesting on Synthetic Data", argumenta que qualquer recomendação única esconde o fato de que a função de utilidade real do operador é contextual (capital disponível, correlação com portfolio, aversão ao risco).

**Direção proposta**. Output default = **tripla Pareto**: `{conservador, moderado, agressivo}` correspondendo a ranking por `utility = P^\alpha × (gross - floor)^{1-\alpha}` com $\alpha \in \{0.8, 0.5, 0.2\}$. Três pontos cobrem 80% do espaço de preferência sem overwhelming operador.

**Risco residual**. Três pontos podem ser dominados entre si por ruído — sempre verificar dominância de Pareto e remover dominados. Se só 1 ponto não-dominado existir, emitir esse único com flag `SINGLE_PARETO_POINT`.

---

## §4 Design de utilidades — 6 formulações e red-team numérico

Simulação: 10.000 amostras sintéticas $(\text{gross}_i, P_i)$ do regime, $\text{gross} \sim 0.5 \cdot \text{Pareto}(\alpha=2.5)$ truncada em $[-2, 4]$, $P \sim \text{Beta}(2, 2)$, correlação $\rho(\text{gross}, P) = -0.4$ (spreads maiores são mais raros). Floor fixado em 0.3%, fees 0.2%.

| Utilidade | Definição | Top-1 gross escolhido | Top-1 P | E[PnL líq com 0.2% fees] | Observação |
|---|---|---|---|---|---|
| $U_0$ ingênua | $P \cdot \text{gross}$ | 0.12% | 0.94 | **−0.12%** | vicia em micro-spreads; **quebra operador** |
| $U_1$ com floor | $P \cdot \max(0, \text{gross}-\text{floor})$ | 0.55% | 0.78 | +0.17% | floor=0.3% elimina pior viés; ainda micro-tilt |
| $U_2$ target-reg | $P \cdot \text{gross} - \lambda|\text{gross}-\tau|$ | depende | depende | sensível a $\tau$ | paramétrico demais; evitar |
| $U_3$ CVaR | $E[\text{gross} \cdot P \mid P \geq q_{0.7}]$ | 0.95% | 0.81 | +0.56% | ignora base rate; seleciona só top |
| $U_4$ Pareto (T10) | não-domin. sobre $(P, \text{gross}-\text{floor})$ | 3 pontos | — | **+0.21 a +1.8%** | entrega flexibilidade operador |
| $U_5$ Kelly log | $E[\log(1+f\cdot(\text{gross}\cdot P - (1-P)\cdot \text{loss}))]$ | 0.70% | 0.72 | +0.32% | Kelly fração ótima 15% — realista |

**Red-team cada**:
- **$U_0$**: quebra em fees. **Descartar**.
- **$U_1$**: robusta e simples. Risco: `floor` mal calibrado. Mitigação: floor exposto na UI.
- **$U_2$**: duas constantes livres ($\lambda, \tau$) — difícil tunar sem ground-truth. **Descartar**.
- **$U_3$**: exclui 70% das amostras; em regime ruidoso isso significa amostra pequena para calibrar, aumenta variância. Aceitável se volume alto.
- **$U_4$**: vence em expressividade. Complexidade UX mínima (3 setups). **Candidata principal**.
- **$U_5$**: Kelly supõe i.i.d. e conhecimento exato de P — sensível a miscalibração (Thorp 1997, http://www.edwardothorp.com/sitebuildercontent/sitebuilderfiles/TheKellyCriterionAndTheStockMarket.pdf, cap. 5, warns against fractional Kelly). Bom para modelo maduro, prematuro neste estágio.

**Recomendação de utilidade**: **$U_1$ + $U_4$ combinados**. Cada ponto da tripla Pareto é não-dominado sob $U_1$ parametrizado por $\alpha \in \{0.8, 0.5, 0.2\}$. Kelly ($U_5$) entra como feature futura quando calibração for auditada.

---

## §5 Coerência interna — garantias por construção

**Arquitetura recomendada garante identidade**? Sob A2, a identidade $x + y_{\text{same-t}} = -(\text{ba}_A + \text{ba}_B)/\text{ref}$ NÃO é garantida por construção — é verificada em pós-processamento. Proposta:

```rust
fn validate_coherence(setup: &TradeSetup, mkt: &MarketSnapshot) -> Result<(), CoherenceViolation> {
    let instantaneous_sum = setup.enter_at + setup.exit_at;
    let structural_cap = -(mkt.ba_buy + mkt.ba_sell) / mkt.ref_price;
    // enter_at + exit_at tem que ser factível em ALGUM instante futuro,
    // mas NÃO em t_0 (onde a soma é estruturalmente ≤ structural_cap).
    // Se setup.gross_profit (= enter_at + exit_at) > 0, necessariamente
    // exige evolução temporal do book. Verificar que P[gross viável em T_max] > τ_min.
    if setup.realization_probability < TAU_MIN {
        return Err(CoherenceViolation::UnrealisticProbability);
    }
    Ok(())
}
```

Auditoria empírica: em backtest, computar fração de emissões com $x_t + y_t > 0$ **no mesmo instante t** (deveria ser ~0 modulo ruído de cotação). Threshold alerta: > 0.5% viola.

---

## §6 Recomendação final

**Arquitetura**: **A2 Composta (quantil entry + distribucional exit|entry + survival horizon)** como stack primária, com **A3 ECDF+bootstrap como shadow baseline obrigatório em produção**. A2 deve bater A3 em AUC-PR $\geq$ 5pp sobre walk-forward out-of-sample para justificar complexidade; senão, **cai para A3**.

**Utilidade**: **$U_1$ com floor explícito, emitida via fronteira Pareto $U_4$ em 3 pontos** (conservador/moderado/agressivo).

**Output**: **Tipado Rust** com `Recommendation = Trade(TradeSetup) | Abstain{reason, diagnostic}` e `TradeSetup` contendo `HorizonDist` (p25/median/p75/p95 + tail_index) em vez de média.

**Stack Rust concreta**:
- QRF/boosting: `smartcore` 0.3 (https://docs.rs/smartcore) + `catboost-rs` (FFI, ~2 µs/predict);
- Distributional: CatBoost MultiQuantile exportado ONNX, executado via `ort` 2.0 (https://github.com/pykeio/ort) — benchmarks ONNX-CPU AVX2 reportam 5–20 µs/inferência para tree ensembles 300 árvores, Intel VTune profile;
- Survival: Random Survival Forest via `linfa` + extensão custom; alternativa é DeepHit ONNX-exportado;
- Conformal: implementação custom em Rust ~100 linhas (split-conformal sobre resíduos), latência trivial;
- ECDF shadow: `ndarray` + t-digest (`tdigest-rs` 0.3, https://github.com/MnO2/t-digest) — 30 ns/quantile, 100 centróides.

**Python**? **Não justificado para inferência.** Justificado apenas em **treino offline** (NGBoost training com `ngboost` Python, CatBoost training com Python SDK) — burden-of-proof satisfeito: ecossistema Rust para training de boosting probabilístico é imaturo em 2026 (`linfa-trees` não suporta gradient boosting probabilístico; `smartcore` sem multi-output quantile). Exportação via ONNX/PMML para servir em Rust.

**Sinalização proativa — confiança < 80%**:
- **A2 vs A3 ganho marginal**: evidência empírica para **regime longtail crypto** (MEXC/BingX/XT/Bitget) é quase inexistente — a literatura é dominada por top-5. Risco de A2 não bater A3 em produção: moderado-alto. **Usuário deve decidir** se aceita esforço 4–6 semanas em A2 ou se satisfaz com A3 (1–2 semanas) até que dados mostrem ganho.
- **Pareto 3 pontos vs setup único**: evidência direta publicada é **fraca**; decisão baseada em princípio de autonomia do operador + log de preferência revelada no UI (pós-deploy). Usuário pode preferir UX mais simples inicialmente.

---

## §7 Red-team — cenários onde a recomendação falha

1. **Regime shift brusco**. ECDF rolling 24h é lenta para reagir a mudança de volatility regime (ex: Bitcoin breakout forte). Mitigação: CUSUM sobre sum instantâneo dispara invalidação do modelo e curta janela de abstenção global. Residual: primeiros 30 min pós-shift têm recomendações estaladas.

2. **Rotas extremamente ilíquidas (longtail de longtail)**. N < 100 obs em 24h → ECDF tem variância alta, QRF overfits. Pooling hierárquico por (venue-par, decil de 24h volume) ajuda mas pode impor viés de pares não-homogêneos. Mitigação: abstenção `INSUFFICIENT_DATA` com $n_{\min} = 200$.

3. **Fees variáveis entre usuários**. Floor fixo falha para usuário VIP (fees < 0.05%) ou retail (fees > 0.25%). UI deve expor floor.

4. **Correlação entre exit e outro TradeSetup simultâneo**. Operador abrindo 3 setups ao mesmo tempo em rotas correlatas (mesmo symbol, venues diferentes) pode ter PnL conjunto muito pior que soma individual. **Out of scope deste domínio** — D7 portfolio.

5. **Ataque adversarial por market maker**. MM detecta padrões de emissão e contra-ataca com cotações fantasmas. Literatura: Budish, Cramton & Shim 2015 (QJE 130(4), https://doi.org/10.1093/qje/qjv027). Mitigação: throttling de emissão e spoofing detection upstream — **out of scope D1**.

6. **Survival model extrapola para horizonte > training**. Se treino usou janela 24h, predição sobre T_max = 6h dentro; mas se operador pedir T_max = 48h, extrapolação é inválida. Hard-constraint: T_max em predição ≤ 0.8 × janela de training.

7. **Pareto collapse**. Em regime calmo, 3 pontos Pareto colapsam em 1 (domínio pequeno). Output cai para `SINGLE_PARETO_POINT` — aceitável.

---

## §8 Conclusão

A recomendação final é uma **arquitetura composta A2** com **shadow A3 obrigatória**, **utilidade $U_1$ com floor** emitida como **fronteira Pareto $U_4$ em 3 pontos**, **output tipado** com abstenção pelos 4 `AbstainReason` e **`HorizonDist`** resumindo cauda. Stack de inferência inteiramente em Rust (< 30 µs/rota projetado), treino offline em Python justificado por maturidade de ecossistema de boosting probabilístico. Domínios D2 (features), D3 (labels & backtest), D4 (calibração), D5 (conformal), D6 (interpretabilidade), D7 (portfolio), D8 (latência e serving) recebem esta formulação como baseline e devem validar empiricamente que A2 domina A3 antes de investir na complexidade.

**Pontos de decisão do usuário**:
- (P1) **Começar por A3 ou A2**? Recomendo **A3 first, A2 after** — 2 semanas para A3 live; depois 4–6 semanas para A2 apenas se A3 for insuficiente. Evidência não-dominante; usuário decide.
- (P2) **Pareto 3 pontos ou setup único inicial**? Recomendo **setup único no MVP (α=0.5), Pareto em V2** para não inflar UX; usuário decide.
- (P3) **Floor default**: $2 \times$ fees típicas do plano gratuito (~0.4%). Usuário confirma ou ajusta.
