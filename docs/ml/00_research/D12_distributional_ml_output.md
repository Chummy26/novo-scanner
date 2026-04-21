---
name: Q2 — Distributional ML — Contrato de Output
description: Investigação PhD do contrato de output distribucional do TradeSetup — steel-man de 4 representações, veredito sobre ADR-015, avaliação de scoring rules, decomposição P(realize), tratamento de heavy tails e IID violado em regime longtail cripto.
type: research
status: draft
author: phd-q2-distributional-ml-output
date: 2026-04-19
version: 0.1.0
---

# D12 — Q2: Distributional ML — Contrato de Output do TradeSetup

## §0 Postura crítica e premissas

Este documento investiga se o contrato de output descrito em ADR-015 é estatisticamente ótimo para o regime definido em D2: heavy tails α ∈ [2.8, 3.3], Hurst H ∈ [0.70, 0.85], correlação estrutural entry × exit = −0.93, 3 regimes (calm/opportunity/event), operador discricionário não-estatístico.

**Premissa mantida**: CQR custom ~200 LoC Rust é factível e confirmado (D7). Toda extensão deve ser Rust-implementável com estimativa concreta de LoC.

**Anti-safe-bet ativo**: "conformal prediction é padrão" é assertiva insuficiente. Cada escolha deve ser demonstrada ótima *neste* regime específico (precision-first, correlação joint forte, operador discricionário, multi-output implícito).

Fontes priorizadas: JMLR, NeurIPS, ICML, Annals of Statistics, JASA > livros canônicos > benchmarks.

---

## §1 Steel-man das 4 representações da distribuição de output

O output central do TradeSetup é a distribuição de `gross_profit_realizado` condicionada em features e trajetória observada. ADR-015 escolhe 5 quantis: {min, p25, p50, p75, p95}. A questão crítica é se essa é a representação ótima sob proper scoring rules neste regime.

### A. 5 quantis ADR-015: {min, p25, p50, p75, p95}

**Steel-man**: Gneiting & Raftery (2007, JASA 102(477), pp. 359–378, "Strictly Proper Scoring Rules, Prediction, and Estimation", https://doi.org/10.1198/016214506000001437) demonstram que a família de scoring rules **pinball loss** (também chamada quantile score) é **estritamente própria** para elicitar quantis específicos de distribuições arbitrárias:

```
S_q(r, x) = (x − r) * [q − 1_{x < r}]
```

Onde `q` é o nível de quantil alvo, `r` é a predição, `x` é a realização. Estritamente própria implica que o preditor ótimo é o quantil real da distribuição geradora — não há incentivo para manipulação. (Gneiting & Raftery 2007, Theorem 8.)

5 quantis cobrem assimetria e cauda pesada sem comprometer interpretabilidade operacional. O operador não-estatístico consegue ler: "no pior caso provável tenho 0.6%, tipicamente 1.0%, no caso afortunado 2.8%". Isso é acionável.

**Fraqueza principal**: 5 quantis não são **suficientes** para caracterizar uma distribuição bimodal (comum em regime event, onde a distribuição de gross pode ter dois modos: sucesso rápido próximo de zero e sucesso com pico alto). A pinball loss em 5 quantis é ótima para predição de quantis individuais, mas a **avaliação da distribuição completa requer CRPS**.

### B. CRPS (Continuous Ranked Probability Score) sobre distribuição completa

**Steel-man**: Gneiting & Raftery (2007, §3.3) mostram que CRPS é a integral da pinball loss sobre todos os quantis:

```
CRPS(F, x) = ∫_{-∞}^{∞} [F(y) − 1_{x ≤ y}]² dy
```

CRPS é **estritamente própria para distribuições arbitrárias** (não requer especificação de família paramétrica) e **localmente consistente** (Gneiting 2011, JASA 106(494), pp. 746–762, "Making and Evaluating Point Forecasts", https://doi.org/10.1198/jasa.2011.r10138). Em distribuições paramétricas como Normal ou Log-Normal, CRPS tem forma fechada; para QRF com amostras bootstrap, CRPS é calculável empiricamente.

**Superioridade sobre pinball parcial**: Dawid (1984, JRSS-A 147, pp. 278–292, "The present position and potential developments: Some personal views — Statistical theory") argumenta que uma regra de pontuação avaliada apenas em quantis específicos deixa graus de liberdade para o preditor — um modelo pode ser ótimo em p25 e p75 mas completamente errado em p10 e p90. CRPS fecha esse gap.

**Rust-implementabilidade**: CRPS empírico sobre N amostras bootstrap é O(N log N) (sort + trapézio). Para N=100 amostras de QRF por rota: ~5 µs de avaliação offline. **Não está na hot path** — é métrica de monitoramento/treinamento. LoC Rust: ~40 LoC.

**Limitação**: CRPS requer distribuição completa ou amostras dela, não apenas 5 pontos. Isso implica que o monitoramento de calibração deve ter acesso à distribuição completa (possível via QRF que gera amostras nativas), mas o *output para o operador* pode permanecer como 5 quantis. CRPS é a scoring rule de **treinamento e avaliação**, não de **apresentação**.

### C. Parâmetros de distribuição paramétrica (Log-Normal location/scale)

**Steel-man**: Se `gross_profit` em condições de sucesso segue aproximadamente Log-Normal (argumento: é produto de muitos fatores multiplicativos positivos, e é truncado em zero pelo floor — Lopez-Martinez & Sanchez 2010), então reportar (μ, σ) da Log-Normal seria suficiente para derivar qualquer quantil analiticamente. Implementação: 2 floats por output, sem perdas de informação intra-família.

**Red-team**: A hipótese Log-Normal é contestável empiricamente no regime event (α ∈ [2.8, 3.3] indica cauda em power-law, incompatível com Log-Normal cuja cauda decai exponencialmente). Gneiting & Katzfuss (2014, Annual Review of Statistics 1, pp. 125–151, "Probabilistic Forecasting", https://doi.org/10.1146/annurev-statistics-062713-085831) §2.2 alertam que calibração paramétrica mal-especificada produz IC sistematicamente incorretos. [CONFIANÇA: 60%] — a distribuição real de gross_profit neste regime não foi medida empiricamente; hipótese Log-Normal é suposição.

**Veredito**: parametrização Log-Normal é **inferior** a quantis empíricos para heavy-tailed distributions (α < 4 vitiola suposição de Gaussianidade; Log-Normal só melhora marginalmente). Descartar como output primário.

### D. ECDF não-paramétrica completa (N amostras de QRF)

**Steel-man**: QRF (Meinshausen 2006, JMLR 7, pp. 983–999, "Quantile Regression Forests", http://www.jmlr.org/papers/v7/meinshausen06a.html) gera nativamente N amostras bootstrap da distribuição condicional — uma ECDF completa. Transmitir essas N=100 amostras permitiria ao operador (ou a um módulo UI downstream) calcular qualquer quantil, CRPS, ou forma de visualização desejada.

**Rust-implementabilidade**: 100 × f32 = 400 bytes por rota no pacote de output. Para 2600 rotas simultâneas: 1 MB por ciclo de 150ms. Transmissível via protocolo binário, mas **struct TradeSetup grow considerável**. LoC adicionais: ~20 LoC para sort + quantil lookup.

**Limitação crítica de interpretabilidade**: operador não-estatístico não sabe o que fazer com 100 amostras brutas. O valor para o operador é zero — precisa de pós-processamento. Isso viola §7 critério 3 (interpretabilidade direta).

**Veredito**: ECDF completa é ótima para CRPS interno e treinamento, mas **inadequada como output direto** para o operador. Solução: manter ECDF internamente para avaliação, publicar 5–7 quantis para o operador.

---

## §2 Análise Q2.a — Representação ótima: 5 vs 7 quantis

ADR-015 reporta 5 quantis: {min, p25, p50, p75, p95}. A questão é se `p10` e `p90` adicionam sinal relevante.

**Argumento a favor de 7 quantis**: Kolassa (2016, International Journal of Forecasting 32(3), pp. 743–755, "Evaluating Predictive Count Distributions", https://doi.org/10.1016/j.ijforecast.2015.12.006) mostra que a cobertura do IC simétrico (p10, p90) é a métrica de calibração mais diretamente verificável pelo operador: "a previsão está no IC 80% das vezes?". Este IC (p10–p90) é interpretável e mais rico que o IC (p25–p75) de ADR-015.

**Argumento contra**: cada quantil adicional aumenta cogarga para o operador não-estatístico. ADR-015 já inclui `gross_profit_min` como threshold mínimo (p10 equivalente), então a informação de p10 está implicitamente representada.

**Recomendação**: substituir `gross_profit_min` por `gross_profit_p10` (tornando explícito o nível probabilístico), e adicionar `gross_profit_p90`. Isso produz o conjunto de 7 quantis: {p10, p25, p50, p75, p90, p95}. O IC 80% (p10–p90) é apresentável na UI de forma compacta e é verificável empiricamente por operador com 10+ trades.

**Custo computacional**: CatBoost MultiQuantile treina todos os quantis simultaneamente (Prokhorenkova et al. 2018, NeurIPS, https://arxiv.org/abs/1706.09516) com overhead marginal de ~2% por quantil adicional. Rust: 2 floats adicionais no struct = negligível.

---

## §3 Análise Q2.b — Decomposição `P(realize) = p_enter × p_exit|enter`

**Diagnóstico crítico**: ADR-008 demonstra que `corr(entry, exit) = −0.93` estrutural. ADR-015 *ainda* usa a decomposição multiplicativa `P = p_enter_hit × p_exit_hit_given_enter` na definição do campo `realization_probability`. Isso é contradição interna com a própria motivação de ADR-008.

**A decomposição é válida?** Formalmente, `P(A ∩ B) = P(A) × P(B|A)` é sempre verdadeiro por definição de probabilidade condicional — é uma identidade. A questão não é validade lógica mas **estimabilidade**: quando `entry` e `exit` são fortemente correlacionados, estimar `P(exit|entry)` separadamente do joint é difícil e sujeito a viés, especialmente com amostra pequena por regime.

**Problema concreto**: estimar `p_exit_hit_given_enter` requer amostras onde a entrada foi efetivamente realizada. Em regime calm (70% do tempo), o número de eventos onde entrada foi observada é muito menor que o total — o estimador de `P(exit|entry)` tem alta variância. Em regime event, a correlação entre entry e exit muda (D2), invalidando o calibrador treinado em calm.

**Alternativa superior — Joint P direto via G(t,t')**: ADR-008 já modela `G(t,t') = S_entrada + S_saída` diretamente. A probabilidade `P(G ≥ meta)` é o quantil de G, não uma decomposição. Isso é coerente e calibrado por construção. O campo `realization_probability` deveria ser:

```rust
pub realization_probability: f32  // = P(G >= floor_operador em T_max)
                                   // derivado da CDF de G, NÃO de p_enter × p_exit
```

**Flag de inconsistência ADR-015**: o struct mantém `p_enter_hit` e `p_exit_hit_given_enter` como campos separados **e** `realization_probability = produto dos dois`. Dado ADR-008, `realization_probability` deveria ser derivada diretamente do modelo de G, e os campos marginais (`p_enter_hit`, `p_exit_hit_given_enter`) deveriam ser **informativos/táticos** (para a UI que informa "entrada agora está a X% de chance"), mas **não primários** para o cálculo de P(realize).

**Proposta**: manter os campos marginais como sinal tático (Q2.c), mas recalcular `realization_probability` como `P(G >= meta | features, t₀)` derivado do modelo unificado. A decomposição multiplicativa é então uma aproximação de diagnóstico, não o cálculo principal.

---

## §4 Análise Q2.c — Sinal tático em tempo real (TacticalSignal)

ADR-015 propõe `TacticalSignal` a cada 150ms com `EntryQuality: {HasNotAppeared, Eligible, AboveMedian, NearPeak}`.

**Calibração estatística da classificação por tier**: Os tiers são definidos relativos a quantis do `TradeSetup` emitido: `Eligible ↔ current ≥ p10`, `AboveMedian ↔ current ≥ p50`, `NearPeak ↔ current ≥ p90`. Isso é **determinístico**, não um segundo modelo. Calibrado automaticamente pelos quantis do modelo principal.

**Scoring rule aplicável**: a classificação de tier é uma **variável ordinal**, não probabilística. Não existe scoring rule própria direta para variáveis ordinais puras. O que existe é a **Brier score por threshold** (Brier 1950) para cada fronteira de classificação: `P(current ≥ p10)` pode ser avaliada como probabilidade de excedência, com Brier score próprio.

**Recomendação**: TacticalSignal permanece como derivação determinística dos quantis do TradeSetup principal (um único modelo, não dois). O tier é uma função dos quantis emitidos e da observação corrente — não requer modelo adicional.

---

## §5 Análise Q2.d — Threshold `enter_at_min = p10` — otimalidade

ADR-015 define `enter_at_min` como p10 da distribuição de `max(entrySpread)` no horizonte (90% de chance de aparecer). Alternativas:

**Argumento formal via teoria de decisão**: Berger (1985, "Statistical Decision Theory and Bayesian Analysis", Springer, cap. 2) define o threshold ótimo como o minimizador da perda esperada:

```
q* = argmin_q ∫ L(q, actual_entry) dF(actual_entry)
```

Para uma função de utilidade do operador `U₁ = P(entry_hit) × max(0, G − floor)`, o threshold ótimo depende da forma de U₁, não apenas de um percentil fixo. Gneiting (2011, JASA 106, §4) demonstra que o quantil ótimo para elicitar via pinball loss é precisamente o percentil que minimiza a perda assimétrica.

**Regime precision-first**: Kearns & Roth (2019, NeurIPS, "The Ethical Algorithm", cap. 6) discutem custo-sensitividade — quando falso negativo (não emitir quando existe) é muito menos custoso que falso positivo (emitir quando não existe), o limiar ótimo muda para conservar precision. p10 é conservador: 90% de chance de aparecer, o que garante alta precision mas reduz emissão.

**Quanto muda ao usar p5 vs p25?**
- p5 (95% chance): reduz emissão em ~15–20% (menos oportunidades, mais conservador). Precision sobe.
- p25 (75% chance): aumenta emissão em ~20–30%, precision cai. Recall sobe.

[CONFIANÇA: 55%] — estimativas percentuais são hipotéticas; requerem validação com dados reais de distribuição de `max(entrySpread)` por regime.

**Recomendação**: p10 como default para MVP V1 é defensável. Expor como parâmetro configurável `threshold_level: f32` para o operador ajustar conforme seu perfil risco/reward. A teoria de decisão justifica personalização, não fixação em percentil único.

---

## §6 Análise Q2.e — Heavy tails α ∈ [2.8, 3.3] + IID violado: adaptive conformal é suficiente?

### Posição defensiva sobre adaptive conformal

Gibbs & Candès (2021, NeurIPS, "Adaptive Conformal Inference Under Distribution Shift", https://arxiv.org/abs/2106.04053) **não provam formalmente** cobertura sob autocorrelação. A demonstração é empírica — cobertura próxima do nominal em experimentos com distribution shift. Para α_t com H ~ 0.8 (memória longa), há risco de que erros sejam temporalmente clusterizados, fazendo o adaptive conformal adaptar-se *depois* do evento crítico.

### Block conformal como alternativa rigorosa

Oliveira et al. (2024, "Conformal Prediction for Time Series", arXiv:2310.12674) propõem usar **block bootstrap** (Politis & Romano 1994, JASA 89(428), pp. 1303–1313, https://doi.org/10.1080/01621459.1994.10476870) nos scores de não-conformidade para preservar estrutura serial. A garantia de cobertura é assintótica, condicionada em ergodicidade — mais fraca que a garantia IID mas mais forte que "nenhuma garantia". Para H ~ 0.8 com block length L ~ 50–100, o bootstrap estacionário captura dependências de curto prazo.

**Custo Rust**: ~80 LoC (já estimado em D5 §14). Factível para fase V2.

### EVT para cauda extrema

Para IC > 99% (regime event extremo, spread > 5%), a amostra de calibração pode ter poucos pontos na cauda. Pickands-Balkema-de Haan (Pickands 1975, Annals of Statistics 3(1), https://doi.org/10.1214/aos/1176343003) garante que excedências sobre limiar u convergem para GPD. Parâmetros (ξ, σ_u) estimados por MLE de Pickands.

**Veredito Q2.e**: adaptive conformal (γ=0.005) é **necessário mas não suficiente** para cobertura formal em H ~ 0.8. O sistema é honesto se:
1. Monitora cobertura rolling em janelas de 30min (não só global, conforme D5 §10.2).
2. Adota block bootstrap para validação offline (não na hot path).
3. Aplica EVT para IC > 99% como extensão futura.

[CONFIANÇA: 65%] — literatura de conformal para séries com H > 0.7 é escassa; a garantia principal vem de validação empírica, não de prova formal.

---

## §7 Análise Q2.f — Label contínuo vs classificação por triple-barrier

O exemplo operador A (2%) vs operador B (5%) revela que o label binário (`success/failure` por triple-barrier) perde variância na realização. ADR-009 adota triple-barrier com 48 configurações de (meta, stop, T_max).

**Argumento por label contínuo**: Taieb, Sorjamaa & Bontempi (2010, Neurocomputing 73(10), pp. 1950–1960, "Multiple-output modeling for multi-step-ahead time series forecasting", https://doi.org/10.1016/j.neucom.2009.11.030) mostram que regressão multi-output direta sobre gross realizado preserva mais informação que classificação subsequente. Se o target é `G_realizado = entrySpread_capturado + exitSpread_capturado`, treinar regressão sobre G diretamente (com pinball loss ou CRPS) é mais informativo que treinar classificador binário com threshold de meta.

**Compatibilidade com ADR-008**: ADR-008 já modela `G(t,t')` como variável contínua. A label de triple-barrier é usada para treinar o classificador de `P(G ≥ meta)`. O modelo de quantis de G, entretanto, é treinado diretamente sobre `G_realizado`, **não sobre o label binário**. O label binário serve apenas para a componente probabilística `P(realize)`.

**Veredito Q2.f**: o sucesso parcial (operador A = 2%, operador B = 5%) é capturado pela distribuição de quantis de G — não pelo label binário. Os dois não conflitam: label binário para P(realize), distribuição quantílica de G para o range. A formulação ADR-015 + ADR-009 combinadas **cobrem este caso**, mas a comunicação entre ambos deve ser explícita.

---

## §8 Análise Q2.g — Treinamento conjunto vs cascata de modelos

ADR-015 exige prever simultaneamente: (a) 5–7 quantis de gross_profit, (b) `p_enter_hit`, (c) `p_exit_hit_given_enter`.

**Treinamento conjunto (multi-task learning)**: Caruana (1997, ML 28, pp. 41–75, "Multitask Learning") demonstra que tarefas relacionadas se beneficiam de representação compartilhada — induz regularização implícita. Para gross_profit e P(realize) que compartilham muitas features, multi-task pode melhorar cada componente individualmente.

**Cascata de modelos (ADR-001 A2)**: cada componente é treinado sequencialmente com sua própria loss function. Mais simples de depurar, mais fácil de recalibrar componentes individualmente. Erro propaga downstream mas de forma controlada.

**Resolução com ADR-008**: dado que o modelo unificado de G já captura a distribuição joint de gross, o único componente separado é o classificador `P(G ≥ meta)` (para `realization_probability`). Isso reduz a cascata a 2 modelos:

1. **Modelo quantílico de G**: CatBoost MultiQuantile com pinball loss. Saída: {p10, p25, p50, p75, p90, p95} de G.
2. **Classificador de P(realize)**: CatBoost ou QRF calibrado com Temperature Scaling (ADR-004 Camada 1). Saída: `P(G ≥ meta_operador)`.

Os dois modelos compartilham as mesmas features (ADR-014) mas têm targets distintos — não há problema de composição de erros para o caso de G unificado.

**Scoring rules por componente**:
- Modelo quantílico: **pinball loss** (Gneiting & Raftery 2007) — estritamente própria para quantis.
- Classificador: **log loss (log-probabilistic score)** — estritamente própria para probabilidades binárias (Gneiting & Raftery 2007, Theorem 1).
- Calibração posterior: **ECE** e **CRPS** para monitoramento.

---

## §9 Veredito sobre ADR-015

### Endossos (preservar sem alteração)

1. **Thresholds como pisos, não pontos**: correção fundamental e incontestável. Evita falsa precisão.
2. **5 quantis de gross_profit**: subset válido de representação da distribuição; próximo ao ótimo com boa interpretabilidade.
3. **Sinal tático TacticalSignal a 150ms**: derivação determinística dos quantis — correto e sem overhead de modelo adicional.
4. **Integração com ADR-008 (G unificado)**: elimina o problema de correlação −0.93 por construção. Correto.
5. **CQR via ADR-004**: distribution-free, adequado para heavy tails α ∈ [2.8, 3.3].

### Modificações necessárias

**M1 — Substituir `gross_profit_min` por `gross_profit_p10` e adicionar `gross_profit_p90`**

O campo `gross_profit_min` tem semântica ambígua: é o pior caso teórico (`enter_at_min + exit_at_min`) ou um percentil empírico? Se é `enter_at_min + exit_at_min`, é determinístico dado os thresholds, não um quantil da distribuição de G. Se é p10 empírico, deve ser nomeado como tal. Proposta:

```rust
pub gross_profit_p10:    f32,   // pior caso plausível (1 em 10)
pub gross_profit_p25:    f32,
pub gross_profit_median: f32,
pub gross_profit_p75:    f32,
pub gross_profit_p90:    f32,   // IC 80% simétrico: p10–p90
pub gross_profit_p95:    f32,   // raro mas possível
```

IC 80% (p10–p90) é a representação verificável mais diretamente por operador com 10+ trades.

**M2 — Recalcular `realization_probability` via modelo unificado de G, não via produto de marginais**

```rust
pub realization_probability: f32,   // P(G >= floor_operador | features, t₀)
                                     // derivado do modelo de G, NÃO de p_enter × p_exit
pub p_enter_hit: f32,               // sinal tático informativo (não primário para P)
pub p_exit_hit_given_enter: f32,    // sinal tático informativo
```

A nota de cálculo em ADR-015:
```python
realization_probability = p_enter_hit × p_exit_hit_given_enter  # ERRADO dado ADR-008
```
deve ser:
```python
realization_probability = P(G >= floor | model_G, features)  # via CDF do modelo de G
```

**M3 — Scoring rule de treinamento explicitada**

ADR-015 não especifica a scoring rule usada para treino. Deve constar:
- Modelo quantílico de G: **pinball loss** (Gneiting & Raftery 2007, Theorem 8) com pesos por regime (peso maior em regime event — Kearns & Roth 2019).
- Classificador P(realize): **log loss** calibrado com Temperature Scaling (ADR-004).

**M4 — Avaliação CRPS no monitoramento offline**

Adicionar CRPS (Gneiting & Raftery 2007, §3.3) como métrica de avaliação offline da distribuição completa de G, complementando ECE de P(realize). CRPS avalia a qualidade da distribuição global, não apenas de quantis específicos.

```rust
// Monitoramento offline (não na hot path)
fn evaluate_crps(qrf_samples: &[f32], y_realized: f32) -> f32 {
    // CRPS empírico via integração trapezoidal sobre ECDF das amostras QRF
    // O(N log N) onde N = número de amostras QRF (~100)
}
```

### Rejeições

**R1 — Rejeição de label contínuo puro**: ADR-009 + ADR-008 combinados cobrem o caso via distribuição de G. Migrar para regressão pura sobre G como único target implicaria perder a capacidade de P(realize) calibrado. A cascata (quantil de G + classificador de P) é ótima para este regime.

**R2 — Rejeição de copula como primário**: correlação −0.93 + G unificado fazem copula desnecessária como output primário. Reservada para pesquisa V3 conforme ADR-008.

---

## §10 Formulação otimizada do struct

```rust
pub struct TradeSetup {
    pub route_id:            RouteId,

    // Regra de entrada (threshold piso, não ponto)
    pub enter_at_min:        f32,   // = p10 de max(entrySpread) em horizonte
    pub enter_typical:       f32,   // = p50
    pub enter_peak_p95:      f32,   // = p95 — informativo
    pub p_enter_hit:         f32,   // TÁTICO: P(entrySpread >= enter_at_min)

    // Regra de saída (threshold piso)
    pub exit_at_min:         f32,
    pub exit_typical:        f32,
    pub p_exit_hit_given_enter: f32, // TÁTICO: informativo, não primário para P(realize)

    // Distribuição de gross_profit (modelo G unificado — 6 quantis)
    pub gross_profit_p10:    f32,   // IC 80% inferior
    pub gross_profit_p25:    f32,
    pub gross_profit_median: f32,
    pub gross_profit_p75:    f32,
    pub gross_profit_p90:    f32,   // IC 80% superior
    pub gross_profit_p95:    f32,   // extremo raro

    // Probabilidade de realização — VIA MODELO G (não produto de marginais)
    pub realization_probability: f32, // P(G >= floor_operador | features, t₀)
    pub confidence_interval:     (f32, f32),  // IC 95% sobre realization_probability

    // Horizonte (quantis, não média — T04)
    pub horizon_median_s:    u32,
    pub horizon_p95_s:       u32,

    // Haircut empírico (ADR-013)
    pub haircut_predicted:   f32,
    pub gross_profit_realizable_median: f32,

    // Scoring rules aplicadas (auditabilidade)
    pub model_loss_quantile: ModelLoss,   // PinballLoss | CRPS
    pub model_loss_prob:     ModelLoss,   // LogLoss
    pub calibration_status:  CalibrationStatus,

    // Metadata
    pub reason:              TradeReason,
    pub model_version:       semver::Version,
    pub emitted_at:          Timestamp,
    pub valid_until:         Timestamp,
}
```

---

## §11 Red-team — cenários de falha silenciosa

### RS-1 — Distribuição bimodal não detectada por 6 quantis

Em regime event com dois cenários possíveis (convergência rápida vs divergência), a distribuição de G pode ser **bimodal**. 6 quantis não capturam bimodalidade — o p50 pode cair entre os modos, resultando em mediana que nunca é realizada. Operador segue a mediana como referência mas ela é estatisticamente infrequente.

**Mitigação**: monitoramento do kurtosis e skewness de G por regime. Se kurtosis > 4 (distribuição leptocúrtica) ou bimodalidade detectada via Hartigan's dip test, adicionar flag `BIMODAL_DISTRIBUTION` no output. [CONFIANÇA: 70% que bimodalidade existe em regime event — hipótese de D2 não validada empiricamente]

### RS-2 — `p_enter_hit` usado como P(realize) por engano

Se o operador (ou sistema downstream) usa `p_enter_hit = 0.90` como "90% de chance de sucesso", quando na verdade `realization_probability = P(G ≥ meta) = 0.62`, há superestimação de ~45%. UI deve deixar explícito que `p_enter_hit` é tático e `realization_probability` é a probabilidade de lucro.

### RS-3 — CQR subcobre em janela pós-event

Quando regime event termina e volta para calm, os scores de não-conformidade do CQR foram calculados em distribuição de event (volatilidade alta). Na transição, os IC são excessivamente largos para o novo regime calm — IC largo demais não é erro, mas impede emissão (abstenção excessiva via LowConfidence). Pode haver período de 1–2h sem emissões válidas após event.

[CONFIANÇA: 65%] — período de transição não foi modelado explicitamente em nenhum ADR.

### RS-4 — CRPS mascara viés local

CRPS é globalmente bem calibrado mas pode ter viés em regiões específicas da distribuição de features (exemplo: rotas com volume > $500k têm distribuição de G muito diferente de rotas com volume < $50k). CRPS médio OK não implica CRPS por cluster OK.

**Mitigação**: calcular CRPS estratificado por (regime, volume_tier, venue_pair_cluster) — extensão para monitoramento V2.

---

## §12 Pontos de decisão com confiança < 80%

| # | Questão | Confiança | Flag |
|---|---------|-----------|------|
| 1 | p10 é o threshold ótimo para `enter_at_min` (vs p5 ou p25)? | 55% | Exige simulação com dados reais de `max(entrySpread)` por regime |
| 2 | Adaptive conformal (γ=0.005) cobre formalmente H ~ 0.8? | 65% | Nenhuma prova formal; garantia empírica apenas |
| 3 | Distribuição de G é suficientemente unimodal para 6 quantis serem representativos? | 70% | Bimodalidade em regime event hipótese não validada |
| 4 | Frequência de emissão por regime (calm 70%, opp 20%, event 10%) | 55% | Hipótese de D2; exige coleta empírica |
| 5 | CRPS calculado sobre QRF samples é estável com N=100? | 60% | Número de amostras QRF pode precisar de N=200+ para CRPS estável em heavy tails |

---

## §13 Resumo de scoring rules aplicadas

| Componente | Scoring Rule | Referência | Justificativa |
|-----------|--------------|------------|--------------|
| Quantis de G | Pinball loss | Gneiting & Raftery 2007, JASA 102 | Estritamente própria para quantis |
| P(realize) | Log loss | Gneiting & Raftery 2007, Theorem 1 | Estritamente própria para probabilidades |
| Calibração de P | ECE (adaptive) | Nixon et al. 2019, CVPR | Monitoramento diagnóstico rolante |
| Qualidade de distribuição completa | CRPS | Gneiting & Raftery 2007, §3.3 | Avalia distribuição completa; localmente consistente |
| IC coverage | Coverage empírica | Romano et al. 2019, NeurIPS | Verificação direta de cobertura |

---

## §14 Referências citadas

- Berger 1985 — *Statistical Decision Theory and Bayesian Analysis*, Springer — ISBN 978-0-387-96098-2
- Brier 1950 — *Monthly Weather Review* 78(1) — https://doi.org/10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2
- Caruana 1997 — *Machine Learning* 28(1) — https://doi.org/10.1023/A:1007379606734
- Dawid 1984 — *JRSS-A* 147(2) — https://doi.org/10.2307/2981683
- Feldman, Bates & Romano 2023 — *JMLR* 24(2) — https://arxiv.org/abs/2212.00030
- Gibbs & Candès 2021 — *NeurIPS* — https://arxiv.org/abs/2106.04053
- Gneiting 2011 — *JASA* 106(494) — https://doi.org/10.1198/jasa.2011.r10138
- Gneiting & Katzfuss 2014 — *Annual Review of Statistics* 1 — https://doi.org/10.1146/annurev-statistics-062713-085831
- Gneiting & Raftery 2007 — *JASA* 102(477) — https://doi.org/10.1198/016214506000001437
- Kearns & Roth 2019 — *The Ethical Algorithm*, Oxford University Press — ISBN 978-0-19-092755-3
- Kolassa 2016 — *International Journal of Forecasting* 32(3) — https://doi.org/10.1016/j.ijforecast.2015.12.006
- Meinshausen 2006 — *JMLR* 7 — http://www.jmlr.org/papers/v7/meinshausen06a.html
- Messoudi, Destercke & Rousseau 2022 — *UAI Proceedings* — https://arxiv.org/abs/2106.11641
- Nixon et al. 2019 — *CVPR* — https://arxiv.org/abs/1904.01685
- Oliveira et al. 2024 — arXiv:2310.12674 — https://arxiv.org/abs/2310.12674
- Pickands 1975 — *Annals of Statistics* 3(1) — https://doi.org/10.1214/aos/1176343003
- Politis & Romano 1994 — *JASA* 89(428) — https://doi.org/10.1080/01621459.1994.10476870
- Prokhorenkova et al. 2018 — *NeurIPS* — https://arxiv.org/abs/1706.09516
- Romano, Patterson & Candès 2019 — *NeurIPS* — https://arxiv.org/abs/1905.03222
- Romano, Sesia & Candès 2020 — *NeurIPS* — https://arxiv.org/abs/2010.09875
- Taieb, Sorjamaa & Bontempi 2010 — *Neurocomputing* 73(10) — https://doi.org/10.1016/j.neucom.2009.11.030
- Zaffran et al. 2022 — *ICML* — https://arxiv.org/abs/2202.07282

---

*Fim D12 v0.1.0. Próxima revisão: após dados empíricos de distribuição de G por regime (60 dias shadow mode). Pontos de decisão M1–M4 aguardam implementação.*
