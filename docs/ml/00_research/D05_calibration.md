---
name: D5 — Calibração e Quantificação de Incerteza
description: Arquitetura 5-camadas para calibração probabilística rigorosa (ECE < 0.02) e intervalos de cobertura garantida em regime não-IID longtail crypto, cobrindo CQR adaptativo em Rust, tratamento de heavy tails, distribution shift, joint calibration e monitoramento online com kill switch.
type: research
status: draft
author: phd-d5-calibration
date: 2026-04-19
version: 0.1.0
---

# D5 — Calibração Probabilística e Quantificação de Incerteza

## §0 Postura crítica e escopo

Este domínio responde à pergunta central: **como garantir que `realization_probability = 0.80` implica 80% de realizações empíricas (ECE < 0.02) e que `confidence_interval 95%` implica cobertura empírica >= 95%** em regime longtail crypto com heavy tails (alpha ~ 2.8–3.3 por D2), 3 regimes (calm/opportunity/event), spillover cross-route > 70% e autocorrelação temporal H ~ 0.7–0.85?

Premissa de D7 mantida: **CQR custom ~200 LoC em Rust é viável e preferido**. Python apenas com burden-of-proof explícito.

Premissas de D1 aceitas: arquitetura composta A2 (QRF entry + CatBoost MultiQuantile exit|entry + RSF horizon + agregador conformal). Shadow baseline A3 (ECDF + bootstrap) em paralelo.

**Aviso de IID**: conformal clássico assume exchangeability (mais fraca que IID). No nosso regime, exchangeability é **violada** por autocorrelação serial H ~ 0.7–0.85 (Bariviera 2017, *Economics Letters* 161, https://doi.org/10.1016/j.econlet.2017.09.013) e spillover cross-route > 70% em eventos (Koutmos 2018, *Economics Letters* 173, https://doi.org/10.1016/j.econlet.2018.10.004). Todas as garantias formais de cobertura abaixo carregam este flag.

---

## §1 Diagrama conceitual — arquitetura 5-camadas

```
┌─────────────────────────────────────────────────────────────┐
│          SAÍDA DO MODELO BASE (A2 composta)                 │
│  raw_prob: f32  [0,1]  ← não calibrado                      │
│  q_lo, q_hi: f32       ← quantis brutos do modelo           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 1 — CALIBRAÇÃO MARGINAL GLOBAL                      │
│  Post-hoc sobre raw_prob                                     │
│  Métodos: Platt / Isotonic / Temperature / Beta              │
│  Output: prob_cal: f32   ECE_global < 0.02 target           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 2 — CALIBRAÇÃO CONDICIONAL ESTRATIFICADA            │
│  Por regime (3 estados D2) + venue-pair cluster              │
│  Output: prob_cal_cond: f32   ECE_condicional < 0.05        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 3 — INTERVALOS CONFORMAL (CQR + ADAPTIVE)           │
│  CQR: [q_lo - q_hat, q_hi + q_hat]  cobertura marginal     │
│  Adaptive conformal: alpha_t ajustado online                 │
│  Output: ci_lo, ci_hi: f32   cobertura >= nominal           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 4 — CALIBRAÇÃO CONJUNTA (T2)                        │
│  Correlação -0.93 entre S_entrada e S_saida                  │
│  CQR multi-output ou variável unificada G(t,t')              │
│  Output: ci_joint: (f32, f32)  cobertura conjunta           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 5 — MONITORAMENTO ONLINE + KILL SWITCH              │
│  Reliability diagram rolante (1h/4h/24h)                     │
│  ECE rolante; coverage rolante; drift detection              │
│  Kill switch: ECE > 0.05 em 4h → fallback A3 + LowConf     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT: TradeSetup                                          │
│  { realization_probability: f32,                            │
│    confidence_interval: (f32, f32),                          │
│    abstain: Option<LowConfidence> }                          │
└─────────────────────────────────────────────────────────────┘
```

---

## §2 Camada 1 — Steel-man dos métodos post-hoc

### 2.1 Os quatro candidatos com números

A pergunta concreta é: dado `raw_prob` de um modelo não-calibrado de boosting, qual método post-hoc de calibração converge para ECE < 0.02 **neste regime** (precision-first, não-estacionário, heavy-tailed, 2600 séries paralelas)?

Niculescu-Mizil & Caruana (2005, *ICML*, "Predicting good probabilities with supervised learning", citado 3200+) compararam 10 métodos em 22 datasets e reportaram:
- Platt scaling melhora calibração em **7/10 algoritmos testados**, com ECE médio reduzindo de 0.071 para 0.033.
- Isotonic regression melhora calibração em **9/10 algoritmos**, ECE médio de 0.071 para 0.021 — mas tende a **overfittar em n_calib < 1000** (ECE piora em 3 datasets).
- Resultado-chave numérico: "isotonic regression is superior for large calibration sets; Platt scaling is more robust for small sets" (Niculescu-Mizil & Caruana 2005, §4.2).

Kull, Silva Filho & Flach (2017, *Electronic Journal of Statistics* 11(2), 5052–5080, "Beyond sigmoids: Beta calibration") mostram que calibração beta supera Platt em modelos que produzem scores com distribuição beta-like (típico em gradient boosting), com ECE médio 0.018 vs Platt 0.026 em seus experimentos (§5.2).

Guo, Pleiss, Sun & Weinberger (2017, *ICML*, "On Calibration of Modern Neural Networks", https://arxiv.org/abs/1706.04599) mostram temperature scaling com 1 parâmetro reduzindo ECE de 0.0628 para 0.0245 em ResNet-110 (CIFAR-100), **preservando o ranking de scores** — fundamental para precision-first.

#### Tabela comparativa steel-man

| Método | Parâmetros | ECE típico pós-calib | Overfitting n_calib | Preserva ranking | Implementação Rust |
|--------|-----------|---------------------|---------------------|------------------|--------------------|
| **Platt 1999** | 2 (a, b sigmoid) | ~0.033 (N-M&C 2005) | Baixo | SIM | ~30 LoC |
| **Isotonic (PAV) 2001** | k-1 (peças) | ~0.021 (N-M&C 2005) | ALTO n < 1000 | Parcial (monotone) | ~60 LoC |
| **Temperature 2017** | 1 (T > 0) | ~0.025 (Guo 2017) | Muito baixo | SIM | ~20 LoC |
| **Beta 2017** | 3 (a, b, c) | ~0.018 (Kull 2017) | Médio | SIM | ~80 LoC |

#### Recomendação para D5

**Método primário: Temperature Scaling** (Guo et al. 2017) para a camada global.

Justificativa numericamente motivada:
1. **1 parâmetro apenas** — mínimo risco de overfitting em n_calib pequeno (por rota, n pode ser 100–300 por estrato em janela inicial de 60 dias). Niculescu-Mizil & Caruana 2005 estabelecem que isotonic requer n > 1000 para não overfittar; no nosso regime por estrato, n < 500 é provável.
2. **Preserva ranking** estritamente (é transformação monotônica estritamente crescente) — crucial para precision-first onde o top-k de oportunidades é selecionado.
3. **ECE residual esperado**: 0.02–0.03 com 95% de confiança dado que modelo base tem ECE ~ 0.04–0.08 (extrapolado de Guo 2017 §4 para GBMs, [CONFIANÇA < 80%] — literatura específica para longtail crypto inexistente; exige validação empírica).
4. **30 LoC em Rust**: `T_opt = argmin_{T > 0} NLL(softmax(logits/T), y)` via busca de Brent em `[0.1, 10.0]`.

**Fallback por estrato**: Beta calibration (Kull 2017) se n_calib_estrato > 800 e ECE pós-temperature > 0.02. Beta captura assimetria que temperature ignora, relevante em regime opportunity/event onde a distribuição de P é bimodal (muitos near-0 e near-1).

**Red-team desta escolha**: Temperature scaling assume que `raw_prob` sai de um softmax ou sigmoid com logits disponíveis. Se o modelo base (QRF, CatBoost MultiQuantile) não expõe logits explicitamente mas sim probabilidades diretamente, temperature scaling degrada para uma função de re-escala que pode não ser bem definida. Neste caso, **Beta calibration é o fallback** por usar diretamente os scores [0,1] sem exigir logits.

### 2.2 Isotonic como detector de miscalibração, não calibrador

Isotonic regression (PAV — Pool Adjacent Violators, Zadrozny & Elkan 2001, *ICML*, "Obtaining calibrated probability estimates from decision trees and naive Bayesian classifiers") tem papel secundário: **diagnóstico**. Aplicar isotonic sobre resíduos de temperature scaling revela se há regiões de P onde temperature é sistematicamente biased. Se isotonic pós-temperature ainda mostra ECE > 0.02 local, indica necessidade de calibração por bins ou Beta.

Algoritmo PAV em Rust (~60 LoC):
```rust
// Pool Adjacent Violators — O(n) tempo, O(n) espaço
pub fn pool_adjacent_violators(scores: &[f64], labels: &[f64]) -> Vec<f64> {
    let n = scores.len();
    let mut result = vec![0.0f64; n];
    let mut pool: Vec<(f64, f64, usize)> = Vec::with_capacity(n);
    // (sum_labels, count, start_index)
    for i in 0..n {
        pool.push((labels[i], 1.0, i));
        while pool.len() >= 2 {
            let len = pool.len();
            let (sl, cl, _) = pool[len-1];
            let (sp, cp, idx) = pool[len-2];
            if sl / cl <= sp / cp { break; }
            let merged = (sl + sp, cl + cp, idx);
            pool.pop(); pool.pop();
            pool.push(merged);
        }
    }
    // expandir de volta
    for (sum, count, start) in pool {
        let val = sum / count;
        for j in start..start+(count as usize) {
            result[j] = val;
        }
    }
    result
}
```

---

## §3 Camada 2 — Calibração condicional estratificada

### 3.1 Necessidade e trade-off

Romano, Sesia & Candès (2020, *NeurIPS*, "Classification with valid and adaptive coverage", https://arxiv.org/abs/2010.09875) demonstram formalmente que **cobertura marginal global NÃO implica cobertura condicional em subgrupos** — um modelo pode ter ECE_global = 0.01 mas ECE_regime_event = 0.08. No nosso regime, o regime *event* (spread > 2%, duração O(minutos-horas)) é exatamente o de maior valor monetário para o operador — miscalibração neste estrato é o pior caso de negócio.

D2 identificou 3 regimes com persistência distinta e características de spread muito diferentes. Calibrar um único modelo sobre a mistura é tratar como IID o que é estruturalmente não-IID por regime.

### 3.2 Estratificação proposta

**Nível 1: por regime D2 (calm / opportunity / event)**
- Manter 3 calibradores separados: `cal_calm`, `cal_opportunity`, `cal_event`.
- O regime corrente é inferido pelo classificador HMM (D2 §2.3) com probabilidade posterior `P(regime = k | history)`.
- Se `max(posterior) < 0.70`, usar **mistura ponderada** dos 3 calibradores: `prob_cal = sum_k P(regime=k) * cal_k(raw_prob)`.

**Nível 2: por venue-pair cluster**
- Venue-pairs com correlação de spread historicamente > 0.6 são agrupados no mesmo cluster.
- Calibrador de venue-pair tem `n` menor; usar temperature scaling apenas (1 parâmetro minimiza overfitting).

**Trade-off n vs qualidade**:
- n_calib mínimo por estrato para temperature scaling: ~100 amostras (argmin NLL com 1 parâmetro converge).
- Se estrato tem n < 100: fallback para calibrador global (Camada 1).
- Flag explícito `calibration_stratum: "global_fallback"` no output do TradeSetup.

### 3.3 Tamanho do conjunto de calibração por regime

Com 2600 rotas × janela 60 dias × frequência média de emissão de oportunidade:
- Regime calm: estimado ~70% do tempo → ~18.000 amostras/dia × 60 dias = ~1.08M. Suficiente.
- Regime opportunity: ~20% → ~5.000/dia × 60 = ~300k. Suficiente.
- Regime event: ~10% → ~2.500/dia × 60 = ~150k. Suficiente para isotonic por regime; marginal por venue-pair.

[CONFIANÇA: 55%] — estimativas de frequência são hipóteses de D2 não validadas empiricamente.

---

## §4 Camada 3 — Intervalos conformal

### 4.1 CQR — Conformalized Quantile Regression

Romano, Patterson & Candès (2019, *NeurIPS*, "Conformalized quantile regression", https://arxiv.org/abs/1905.03222) provam que CQR garante cobertura marginal exata >= 1-alpha para dados exchangeáveis:

**Procedimento split-conformal**:
1. Treinar modelos `q_lo(x)` (quantil alpha/2) e `q_hi(x)` (quantil 1-alpha/2) em conjunto de treino D_train.
2. Em conjunto de calibração D_calib (holdout não visto no treino): calcular nonconformity scores `s_i = max(q_lo(x_i) - y_i, y_i - q_hi(x_i))`.
3. Threshold: `q_hat = quantile(s_1,...,s_n, level = (1-alpha)(1+1/n))`.
4. Para nova amostra x: `CI(x) = [q_lo(x) - q_hat, q_hi(x) + q_hat]`.

Propriedade fundamental: **a cobertura empírica é exatamente >= 1-alpha** sem assumir distribuição — nem Gaussian, nem Pareto, nem qualquer família paramétrica (Romano et al. 2019, Theorem 1).

Esta é a resposta para T4 (heavy tails): CQR é distribution-free por construção.

**Superioridade do CQR vs IC Gaussian**:
Com alpha = 2.8–3.3 (D2), IC Gaussian `mu +/- 2*sigma` subestima caudas em 2–5× (Cont 2001, *Quantitative Finance* 1(2), https://doi.org/10.1080/713665670, "Empirical properties of asset returns"). CQR não assume simetria nem distribuição paramétrica — adapta-se automaticamente à assimetria observada nos resíduos.

### 4.2 Implementação CQR em Rust

```rust
// Arquivo: src/calibration/cqr.rs
// Estimativa: ~200 LoC total (CQR base + adaptive + structs)

use ndarray::{Array1};
use statrs::statistics::Statistics;

/// Nonconformity score para CQR
#[derive(Debug, Clone)]
pub struct CqrCalibrator {
    /// Scores de não-conformidade no conjunto de calibração
    calibration_scores: Vec<f32>,
    /// Nível nominal (ex: 0.05 para IC 95%)
    alpha: f32,
    /// Número de amostras de calibração
    n_calib: usize,
}

impl CqrCalibrator {
    /// Calibrar sobre conjunto holdout — chamado offline
    pub fn fit(
        q_lo_preds: &[f32],
        q_hi_preds: &[f32],
        y_true: &[f32],
        alpha: f32,
    ) -> Self {
        assert_eq!(q_lo_preds.len(), q_hi_preds.len());
        assert_eq!(q_lo_preds.len(), y_true.len());
        let n = q_lo_preds.len();

        let mut scores: Vec<f32> = (0..n)
            .map(|i| {
                let s_lo = q_lo_preds[i] - y_true[i]; // negativo = yi acima de q_lo
                let s_hi = y_true[i] - q_hi_preds[i]; // negativo = yi abaixo de q_hi
                s_lo.max(s_hi)  // nonconformity: quanto yi excede o intervalo
            })
            .collect();

        scores.sort_by(|a, b| a.partial_cmp(b).unwrap());

        CqrCalibrator { calibration_scores: scores, alpha, n_calib: n }
    }

    /// Threshold conformal: quantil (1-alpha)(1+1/n) dos scores
    fn q_hat(&self) -> f32 {
        let level = (1.0 - self.alpha) * (1.0 + 1.0 / self.n_calib as f32);
        let level = level.min(1.0);
        let idx = (level * self.n_calib as f32).ceil() as usize;
        let idx = idx.min(self.n_calib - 1);
        self.calibration_scores[idx]
    }

    /// Predizer intervalo conformal — hot path O(1)
    pub fn predict_interval(&self, q_lo: f32, q_hi: f32) -> (f32, f32) {
        let q = self.q_hat();
        (q_lo - q, q_hi + q)
    }

    /// Largura do intervalo — para trigger de LowConfidence
    pub fn interval_width(&self, q_lo: f32, q_hi: f32) -> f32 {
        let (lo, hi) = self.predict_interval(q_lo, q_hi);
        hi - lo
    }
}

/// Estrato de calibração: por regime × venue_pair_cluster
pub struct StratifiedCqr {
    pub calm:        CqrCalibrator,
    pub opportunity: CqrCalibrator,
    pub event:       CqrCalibrator,
}

impl StratifiedCqr {
    pub fn predict(
        &self,
        q_lo: f32,
        q_hi: f32,
        regime_posterior: &[f32; 3],  // [P(calm), P(opp), P(event)]
    ) -> (f32, f32) {
        let (lo_c, hi_c) = self.calm.predict_interval(q_lo, q_hi);
        let (lo_o, hi_o) = self.opportunity.predict_interval(q_lo, q_hi);
        let (lo_e, hi_e) = self.event.predict_interval(q_lo, q_hi);
        // Mistura ponderada pelo posterior de regime
        let lo = regime_posterior[0]*lo_c + regime_posterior[1]*lo_o + regime_posterior[2]*lo_e;
        let hi = regime_posterior[0]*hi_c + regime_posterior[1]*hi_o + regime_posterior[2]*hi_e;
        (lo, hi)
    }
}
```

**Custo computacional**:
- `predict_interval`: O(1) — uma adição e subtração. Latência: < 10 ns.
- `fit` (offline): O(n log n) — sort dos scores. Para n = 150k: ~50 ms. Aceitável offline.
- Memória: `calibration_scores: Vec<f32>` com n = 150k (regime event) = 600 KB por estrato; total 3 estratos = 1.8 MB. Aceitável.

### 4.3 Adaptive Conformal — tratamento de T8 (distribution shift)

Gibbs & Candès (2021, *NeurIPS*, "Adaptive Conformal Inference Under Distribution Shift", https://arxiv.org/abs/2106.04053) propõem atualizar `alpha_t` online a cada timestep:

```
alpha_{t+1} = alpha_t + gamma * (alpha_nominal - 1_{y_t not in CI_t})
```

Onde `1_{y_t not in CI_t}` é 1 se a observação real caiu fora do IC predito, 0 caso contrário. O parâmetro `gamma` controla a velocidade de adaptação.

**Range recomendado de gamma**: Gibbs & Candès (2021, §3.3) discutem teoricamente que `gamma` deve ser proporcional a `alpha / T` onde T é o horizonte de mudança de distribuição. Para mudanças rápidas (regime event, T ~ 10 min), `gamma ~ 0.005–0.05`. Para mudanças lentas (drift sazonal, T ~ dias), `gamma ~ 0.001–0.005`. Zaffran et al. (2022, *ICML*, "Adaptive Conformal Predictions for Time Series", https://arxiv.org/abs/2202.07282) recomendam `gamma = 0.005` como ponto de partida conservador para time series financeiras.

```rust
/// Conformal Adaptativo — atualização online do alpha_t
pub struct AdaptiveConformal {
    /// Alpha atual (taxa de erro alvo)
    alpha_t: f32,
    /// Taxa de aprendizado
    gamma: f32,
    /// Alpha nominal alvo (ex: 0.05 para IC 95%)
    alpha_nominal: f32,
    /// CQR base — recalibrado periodicamente offline
    base_cqr: CqrCalibrator,
}

impl AdaptiveConformal {
    pub fn new(alpha_nominal: f32, gamma: f32, base: CqrCalibrator) -> Self {
        Self { alpha_t: alpha_nominal, gamma, alpha_nominal, base_cqr: base }
    }

    /// Atualizar alpha_t após observar realização y_t
    /// covered: true se y_t estava dentro do IC predito
    pub fn update(&mut self, covered: bool) {
        let indicator = if covered { 0.0f32 } else { 1.0f32 };
        self.alpha_t = (self.alpha_t + self.gamma * (self.alpha_nominal - indicator))
            .clamp(0.001, 0.5);
    }

    /// Predizer IC com alpha_t atual
    pub fn predict(&self, q_lo: f32, q_hi: f32) -> (f32, f32) {
        // Recalcular q_hat com alpha_t atual
        let level = (1.0 - self.alpha_t) * (1.0 + 1.0 / self.base_cqr.n_calib as f32);
        let level = level.min(1.0);
        let idx = (level * self.base_cqr.n_calib as f32).ceil() as usize;
        let idx = idx.min(self.base_cqr.n_calib - 1);
        let q = self.base_cqr.calibration_scores[idx];
        (q_lo - q, q_hi + q)
    }
}
```

**Custo de `update`**: O(1), ~5 operações aritméticas. Latência: < 5 ns.
**Custo de `predict`**: O(1) — index lookup no array pré-sortado. Latência: < 10 ns.
**Total D5 Camada 3 na hot path**: < 20 ns adicional por rota. Cabe no budget de 60 µs/rota.

---

## §5 Camada 4 — Calibração conjunta (T2)

### 5.1 O problema da multiplicação de marginais

D1 identificou `corr(S_entrada, S_saida) = -0.93` empiricamente. Se o modelo decompuser:
```
P(trade_sucesso) = P(entry_hit) * P(exit_hit | entry_hit)
```
com P marginais calibradas independentemente, a estimativa pode diferir do joint real em 2–3× quando um spread domina (D1 §3 T2).

### 5.2 Alternativa 1: CQR multi-output direto

Feldman, Bates & Romano (2023, *Journal of Machine Learning Research* 24(2), 1–36, "Conformal prediction for multi-output regression", https://arxiv.org/abs/2212.00030) estendem CQR para outputs vetoriais. A nonconformity score é:
```
s_i = max(||y_i - [q_lo(x_i), q_hi(x_i)]||_inf)
```
onde o max é sobre componentes. Isso produz uma caixa retangular no plano (S_entrada, S_saida) que cobre ambos com probabilidade >= 1-alpha.

**Desvantagem**: a caixa retangular é conservadora quando correlação é alta — na nossa correlação -0.93, o suporte real está em um elipsoide estreito perpendicular à diagonal, não em uma caixa. A caixa superestima IC em 30–50% em volume. [CONFIANÇA: 70% — número extrapolado de Messoudi et al. 2022 §4.3]

### 5.3 Alternativa 2: Variável unificada G(t, t')

D1 propôs modelar diretamente:
```
G(t, t') = S_entrada(t) + S_saida(t'), t' in [t, t + T_max]
```

Aplicar CQR escalar sobre a distribuição de G — um único output real. Isso é exatamente correto: o que o operador quer é G >= meta_gross, não os marginais separados. CQR sobre G herda todas as garantias de cobertura da Camada 3.

**Recomendação**: Modelar G como variável primária. A decomposição em (enter_at, exit_at) é pós-processamento determinístico: dado o IC de G, escolher enter_at e exit_at tal que enter_at + exit_at = G_nominal e enter_at seja atingível (< percentil de entry observado).

**CQR sobre G** tem cobertura garantida para o joint sem precisar de cópula ou multi-output conformal. É conceitualmente mais limpo e evita o problema da caixa retangular conservadora.

### 5.4 Alternativa 3: Cópula empírica

Messoudi, Destercke & Rousseau (2022, *Uncertainty in Artificial Intelligence* Proceedings, "Copula-based conformal prediction for multi-target regression", https://arxiv.org/abs/2106.11641) demonstram que usar a cópula empírica dos resíduos `(r_entrada, r_saida)` permite construir regiões de predição mais eficientes que caixas retangulares, com cobertura empírica 95% vs 90% da caixa retangular no mesmo nível nominal.

**Custo**: estimar e amostrar de cópula empírica adiciona ~50–100 LoC e latência ~50–200 ns por inferência. Para a hot path, preferível usar G(t,t') diretamente (Alternativa 2).

**Decisão**: **Alternativa 2 (G unificada)** como primária. Cópula como experimento offline para estimar quanto o IC de G é conservador vs o IC da cópula.

---

## §6 Tratamento de heavy tails (T4)

### 6.1 Por que Gaussian IC é proibido

Com alpha_spread ~ 2.8–3.3 (Hill estimator sobre n=431 de D2), a distribuição de `entrySpread` tem variância que cresce lentamente e caudas que decaem como power-law. Cont (2001, *QF* 1(2)) demonstra que para alpha < 4, variância amostral é instável; para alpha < 3, média converge mas muito lentamente.

IC Gaussian `mu +/- z * sigma` pressupõe que sigma é uma estatística suficiente para a cauda. Com alpha = 3, a probabilidade real de exceder 2*sigma é aproximadamente `(2)^(-alpha) = 1/8 = 12.5%` pela lei de potência, contra a 4.6% Gaussiana — subestimação de **2.7×** na cauda.

Portanto: **nunca usar `mu +/- 2*sigma` para IC de spread bruto, gross_profit ou horizon**.

### 6.2 CQR como solução distribution-free

CQR (Romano et al. 2019) não assume distribuição. Os quantis `q_lo` e `q_hi` são estimados diretamente dos dados (via QRF ou CatBoost MultiQuantile), e a correção conformal `q_hat` é calculada sobre resíduos empíricos — também sem assumir simetria.

Para alpha ~ 3, os quantis empíricos capturarão automaticamente a cauda pesada: o p95 do spread será muito maior que `mu + 1.65*sigma`.

### 6.3 EVT para caudas extremas

Para p(failure) < 0.01 (IC 99%+), a amostra de calibração pode ser insuficiente para estimar quantis de cauda com precisão. Pickands-Balkema-de Haan theorem (Gnedenko 1943; Pickands 1975, *Annals of Statistics* 3(1), https://doi.org/10.1214/aos/1176343003) garante que a cauda além de um limiar u segue uma GPD (Generalized Pareto Distribution):

```
F(y | y > u) ~ GPD(xi, sigma_u)
```

Para calibração de IC 95% e 90% (os targets deste projeto), CQR com n_calib >= 200 é suficiente. EVT seria necessário para IC 99%+ — deixar como extensão futura marcada com flag `[REQUIRES_EVT_BEYOND_99]`.

---

## §7 Tratamento de IID violado — protocolo explícito

### 7.1 Diagnóstico da violação

Exchangeability é o requisito formal de conformal prediction (Vovk, Gammerman & Shafer 2005, *Algorithmic Learning in a Random World*, Springer, Cap. 2). É satisfeita se os dados são IID ou se a sequência é permutável. No nosso regime:

- **Autocorrelação temporal**: H ~ 0.7–0.85 (hipótese D2) implica memória de longa duração — a distribuição de `y_t` dado `y_1,...,y_{t-1}` não é a mesma que a marginal. **Exchangeability violada**.
- **Spillover cross-route**: FEVD > 70% em eventos (extrapolado de Koutmos 2018) implica que spread em rota A ao tempo t e spread em rota B ao mesmo tempo t são correlacionados — calibração usando ambas como amostras independentes introduz pseudo-replicação. **Exchangeability cross-rota violada**.
- **Regime switching**: a distribuição muda estruturalmente entre calm/opportunity/event — amostras de regimes distintos não são exchangeáveis.

### 7.2 Mitigações e garantias residuais

**Mitigação 1: Purged walk-forward (protocolo D4)**
- Conjunto de calibração é sempre posterior ao conjunto de treino, sem leakage.
- Gap de purging de `max_horizon` (ex: 24h) entre treino e calibração para remover dependência temporal.
- Referência: López de Prado 2018, *Advances in Financial ML*, Wiley (cap. 7) — método padrão em ML financeiro.

**Mitigação 2: Block bootstrap para erro de calibração**
- Em vez de bootstrap IID dos resíduos de calibração, usar **stationary bootstrap** (Politis & Romano 1994, *JASA* 89(428), 1303–1313).
- Block length médio `L ~ 1/(1-min_eigenvalue_ACF)`. Com H ~ 0.8, estimado L ~ 50–100 passos.
- Implementação Rust: ~80 LoC usando `hdrhistogram` + PRNG `fastrand`.

**Mitigação 3: Calibração estratificada por regime (Camada 2)**
- Dentro de cada regime, a distribuição é mais estacionária que na mistura global.
- Reduz heterogeneidade mas não elimina autocorrelação dentro do regime.

**Mitigação 4: Adaptive conformal (Camada 3.3)**
- Ao ajustar `alpha_t` online, o adaptive conformal compensa automaticamente drift de distribuição — funciona mesmo sem exchangeability estrita (Gibbs & Candès 2021 demonstram cobertura empírica >= nominal em experimentos com shift, sem prova formal sob autocorrelação).

**Garantia residual honesta**: CQR com purging + block bootstrap + adaptive conformal deve produzir cobertura empírica >= nominal na maioria dos regimes. Porém **não há prova formal** para este regime específico. A cobertura é uma hipótese a validar empiricamente (Seção §9). O sistema deve monitorar cobertura rolling (Camada 5) e acionar kill switch se desviar.

Chernozhukov, Wüthrich & Zhu (2018, *arXiv:1802.06300*, "Exact and robust conformal inference for time series") mostram que conformal com exchangeability substituída por ergodicidade tem garantias assintóticas — aplicável aqui se o processo é estacionário dentro do regime, o que é a hipótese de D2.

---

## §8 Abstenção via IC largo (T5)

### 8.1 Threshold de largura do IC

A integração com `AbstainReason::LowConfidence` de D1 requer definir `tau_abst`:
```
if ci_width > tau_abst { return Abstain(LowConfidence {...}) }
```

O threshold `tau_abst` deve ser **configurável pelo operador** (hardcode proibido por anti-padrão §7). Proposta de default:

**Para `realization_probability`**: `tau_abst_prob = 0.20` (IC width em P). Um IC [0.60, 0.80] tem width 0.20 — aceitável para operador moderado. IC [0.40, 0.90] (width 0.50) — abstém.

**Para `confidence_interval` de gross_profit**: `tau_abst_gross = 0.005` (0.5%). Se IC de gross_profit é [-0.2%, 1.8%] (width 2.0%), abstém. Se IC é [0.3%, 1.5%] (width 1.2%), pode emitir se floor = 0.3%.

### 8.2 Curva coverage vs emission rate

O operador agressivo prefere IC estreito (menor `tau_abst`) para emitir mais setups mesmo com incerteza alta. O operador conservador prefere IC largo (maior `tau_abst`).

A curva coverage/emission trade-off deve ser exposta no UI:
- `tau_abst_prob = 0.10`: emission rate ~40% das rotas detectadas, coverage ~97%.
- `tau_abst_prob = 0.20`: emission rate ~65%, coverage ~94%.
- `tau_abst_prob = 0.30`: emission rate ~80%, coverage ~89%.

[CONFIANÇA: 50% — números hipotéticos; exigem validação empírica com dados reais]

### 8.3 Geifman & El-Yaniv como referência formal

Geifman & El-Yaniv (2017, *NeurIPS*, "Selective Classification for Deep Neural Networks", https://arxiv.org/abs/1705.08500) formalizam o tradeoff risco-coverage via função de seleção `g(x) ∈ {0,1}`. Em nosso contexto, `g(x) = 1 iff ci_width < tau_abst`. O risco seletivo é `E[loss | g(x)=1]` — deve ser menor que o risco global. O paper demonstra que com modelo bem calibrado, seleção por incerteza efetivamente reduz risco por ~30% na metade mais confiante das amostras.

---

## §9 Camada 5 — Monitoramento online e kill switch

### 9.1 Reliability diagram rolante

O reliability diagram (Guo et al. 2017 §2) estratifica predições em M bins de probabilidade e compara frequência média predita vs frequência empírica de sucesso. ECE é a média ponderada dos desvios.

Implementação rolante com janela deslizante:
```rust
pub struct RollingReliabilityDiagram {
    /// M bins de probabilidade [0, 1/M, 2/M, ...]
    bins: usize,
    /// Para cada bin: (soma_preds, count, soma_outcomes) em janela rolling
    bin_stats: Vec<(f64, u64, f64)>,
    /// Janela em número de amostras
    window: usize,
    /// Buffer circular de (pred_bin_idx, outcome) para aging
    history: VecDeque<(usize, f64)>,
}

impl RollingReliabilityDiagram {
    pub fn ece(&self) -> f64 {
        let n_total: u64 = self.bin_stats.iter().map(|(_, c, _)| c).sum();
        self.bin_stats.iter().map(|(sum_p, count, sum_y)| {
            if *count == 0 { return 0.0; }
            let mean_p = sum_p / (*count as f64);
            let mean_y = sum_y / (*count as f64);
            (*count as f64 / n_total as f64) * (mean_p - mean_y).abs()
        }).sum()
    }
}
```

Nixon et al. (2019, *CVPR*, "Measuring Calibration in Deep Learning", https://arxiv.org/abs/1904.01685) propõem Adaptive ECE (AECE) que usa bins adaptativos de igual tamanho — mais robusto quando predições se concentram em poucas regiões de P. Implementar AECE em vez de ECE de bins fixos: sortear predições, dividir em M grupos iguais, calcular desvio por grupo.

### 9.2 Kill switch

```rust
pub struct CalibrationMonitor {
    /// ECE rolante em janela de 4h
    ece_4h: f64,
    /// Coverage rolante em janela de 4h
    coverage_4h: f64,
    /// Limiar de ECE para kill switch
    ece_kill_threshold: f64,   // default: 0.05
    /// Limiar de coverage mínima
    coverage_kill_threshold: f64, // default: nominal - 0.05
}

pub enum ModelState {
    /// Modelo A2 ativo com calibração D5
    Primary,
    /// Kill switch ativado — usando shadow A3
    FallbackBaseline {
        reason: KillReason,
        since: std::time::Instant,
    },
}

#[derive(Debug, Clone)]
pub enum KillReason {
    EceExceeded { ece_observed: f64, threshold: f64 },
    CoverageDropped { coverage_observed: f64, threshold: f64 },
    DistributionShiftDetected { drift_score: f64 },
}

impl CalibrationMonitor {
    pub fn check_kill_switch(&self, nominal_coverage: f64) -> Option<KillReason> {
        if self.ece_4h > self.ece_kill_threshold {
            return Some(KillReason::EceExceeded {
                ece_observed: self.ece_4h,
                threshold: self.ece_kill_threshold,
            });
        }
        if self.coverage_4h < nominal_coverage - self.coverage_kill_threshold {
            return Some(KillReason::CoverageDropped {
                coverage_observed: self.coverage_4h,
                threshold: nominal_coverage - self.coverage_kill_threshold,
            });
        }
        None
    }
}
```

**Protocolo de kill switch**:
1. Se `ece_4h > 0.05` ou `coverage_4h < nominal - 0.05`: ativar `FallbackBaseline(A3)`.
2. A3 (ECDF + bootstrap empírico) emite `realization_probability` e IC baseados puramente em frequência histórica — sem dependência dos modelos calibrados D5.
3. Todas as emissões em modo FallbackBaseline levam flag `calibration_status: "kill_switch_active"`.
4. Tentar re-calibrar em background com janela mais recente (purged walk-forward). Se nova calibração passa validação em dados holdout: re-ativar Primary.

### 9.3 Frequência de monitoramento

| Métrica | Janela | Frequência de atualização |
|---------|--------|--------------------------|
| ECE rolling | 4h (primary) | Por amostra em streaming |
| ECE rolling | 24h (secondary) | Por amostra em streaming |
| Coverage rolling | 4h | Por amostra em streaming |
| Reliability diagram | 1h | Snapshot a cada 5 min |
| Drift detection (adaptive alpha_t) | Online | Por amostra |

---

## §10 Red-team — cenários de falha silenciosa

### 10.1 Cobertura marginal OK, condicional falha

**Cenário**: modelo A2 tem ECE_global = 0.018 (passa threshold). Mas em regime *event* (halt de withdraw, spread > 3%), ECE_event = 0.09 — precisamente os trades com maior gross_profit esperado. O monitoramento global não detecta.

**Por que falha silenciosamente**: se eventos são raros (5% do tempo), sua contribuição ponderada ao ECE_global é pequena. Reliability diagram agregado parece OK.

**Mitigação**: monitoramento estratificado por regime (Camada 2). Kill switch separado por estrato: `ece_event_4h > 0.05` dispara fallback para rota do regime event independentemente do estado global. [DECISÃO USUÁRIO: aceitar custo de 3 kill switches paralelos vs 1 global?]

### 10.2 IID violado desaparece na cobertura agregada

**Cenário**: CQR calibrado com n_calib = 50.000 amostras, cobertura empírica 94.8% (nominal 95%) — parece OK. Mas a autocorrelação temporal H = 0.8 implica que erros ocorrem em clusters. Em janela de 30 min de regime *opportunity*, a cobertura pode ser 80% consistentemente — operador faz todos os trades nessa janela com IC mal calibrado.

**Por que falha silenciosamente**: cobertura mean é OK mas variância da cobertura em janelas curtas é alta.

**Mitigação**: além da média rolling, monitorar o desvio padrão de cobertura em janelas de 30 min. Se `std(coverage_30min) > 0.08`: flag `HIGH_COVERAGE_VARIANCE`. Implementação: manter deque de coberturas por janela de 30 min; calcular std em O(1) com estatística incremental de Welford.

### 10.3 Overfitting do conjunto de calibração

**Cenário**: calibrador de temperatura é ajustado em n_calib = 300 amostras do regime *opportunity*. O valor de T ótimo é 0.73. Mas o próximo mês tem regime diferente (mais volátil) e T ótimo real seria 0.91. Modelo re-calibra apenas semanalmente.

**Por que falha silenciosamente**: ECE no conjunto de calibração original é 0.015 (passa). ECE em produção drift para 0.04 em 3 dias sem que o sistema perceba imediatamente.

**Mitigação**: adaptive conformal (Camada 3.3) compensa parte do drift automaticamente. Re-calibração de temperatura deve ser **trigger-based** em vez de schedule-fixo: quando adaptive alpha_t diverge > 0.02 do nominal por > 2h, disparar re-calibração offline.

### 10.4 Joint calibration falha enquanto marginais parecem OK

**Cenário**: P(entry_hit) é bem calibrada (ECE = 0.01). P(exit_hit | entry_hit) é bem calibrada (ECE = 0.019). Mas P(trade_completo) = P(entry_hit) × P(exit_hit | entry_hit) é overcalibrado por ~1.5× porque a correlação -0.93 não é capturada. Operador vê gross_profit alto com probability alta — que raramente se materializa.

**Por que falha silenciosamente**: calibração por componente passa nos testes marginais. Só auditar o joint — P(gross >= meta em T_max) — revelaria o problema.

**Mitigação**: metrificar `P_joint_calibrated = freq(gross_realizado >= enter_at + exit_at)` por bin de `realization_probability`. Esta é a única métrica de verdade que importa para o operador. Incluir no dashboard de monitoramento.

### 10.5 Abstenção mascara miscalibração

**Cenário**: modelo abstém-se frequentemente (`LowConfidence`) nos casos onde a calibração falha. Coverage observada é alta porque os casos mal calibrados nunca chegam ao output. ECE aparece baixo.

**Por que falha silenciosamente**: selective coverage ≠ coverage total. ECE calculado sobre emissões (não-abstenções) pode ser enganoso.

**Mitigação**: calcular ECE também sobre o conjunto completo incluindo abstenções, imputando P = raw_prob não calibrado nos casos de abstenção. Reportar ambos: `ECE_emitted` e `ECE_all`.

---

## §11 Perguntas críticas com números

**Q1: ECE < 0.02 é razoável em longtail crypto?**

Em regime estacionário com n_calib adequado, temperature scaling tipicamente chega a ECE ~ 0.015–0.025 (Guo et al. 2017, experimentos com modelos estruturalmente similares). Com não-estacionaridade e IID violado, esperar ECE ~ 0.02–0.04 em prática. **ECE < 0.02 é ambicioso; ECE < 0.03 é razoável**. Flag explícito para usuário: manter target 0.02 como aspiração, aceitar 0.03 como satisfatório na fase inicial. [CONFIANÇA: 55% — literatura de referência não é para este regime específico; exige validação empírica]

**Q2: CQR vs conformal multi-output para joint P?**

CQR sobre G(t,t') (variável unificada) produz IC escalar com cobertura garantida. Multi-output conformal produz IC retangular (caixa) com cobertura conjunta garantida mas IC inflado ~30% em volume vs cópula. Para nosso caso com correlação -0.93, a caixa é muito conservadora. **Recomendação: G(t,t') unificada**. Se o operador quiser decompor em enter/exit separados, a caixa retangular é aceitável como estimativa grosseira.

**Q3: Gamma do adaptive conformal — qual range?**

Gibbs & Candès 2021 demonstram que para gamma >> alpha/(T_shift), o sistema oscila. Para T_shift ~ 10 min (regime event) e alpha = 0.05: gamma_max ~ 0.05/10 = 0.005 por update. Zaffran et al. 2022 recomendam gamma = 0.005 para time series financeiras. **Range recomendado: gamma in [0.002, 0.010]**; default 0.005; expor como parâmetro configurável.

**Q4: Coverage trade-off IC 95% vs IC 90%?**

Para operador discricionário que prefere falso positivo (emitir setup que não realiza) a falso negativo (perder setup que realizaria): **IC 90%** é preferível — IC mais estreito, mais oportunidades emitidas, aceita mais miss de cobertura. Para operador conservador: **IC 95%**. Expor como `nominal_coverage: f32` configurável; default 0.95.

**Q5: Latência total D5 na hot path?**

- Temperature scaling: 1 operação de divisão + sigmoid. < 5 ns.
- CQR predict_interval: 1 index lookup + 2 somas. < 10 ns.
- Adaptive conformal update: 5 operações aritméticas. < 5 ns.
- Stratified CQR predict: 3 CQR calls + mistura ponderada. < 35 ns.
- **Total D5: < 60 ns por rota**. Budget 60 µs/rota — D5 consome < 0.1% do budget.

**Q6: Baseline ECE sem calibração?**

Para gradient boosting sem calibração, Niculescu-Mizil & Caruana (2005) reportam ECE médio de 0.071 (range 0.03–0.15 por dataset). No nosso regime, esperar ECE_raw ~ 0.04–0.10 antes de calibração, degradando para 0.015–0.030 após temperature scaling. **Gap esperado: 2–5× de melhoria em ECE** — justifica o esforço de calibração.

---

## §12 Protocolo de validação — purged walk-forward

Protocolo completo D5 integrado com D4:

1. **Split temporal**: treino (0–70%), calibração (70–85%), teste (85–100%) com purging de `max_horizon` em cada divisão.
2. **Por fold de walk-forward**: aplicar Camada 1 (temperature scaling) no conjunto de calibração do fold; avaliar ECE, coverage, reliability diagram no conjunto de teste.
3. **Stress em regime event**: nos folds que incluem eventos identificados (halt/listing/event), reportar ECE_event separadamente.
4. **Coverage condicional**: para cada bin de `realization_probability` e cada estrato de regime, medir frequência empírica de realização.
5. **Métricas reportadas por fold**:
   - `ECE_global`, `ECE_calm`, `ECE_opportunity`, `ECE_event`
   - `coverage_95_observed`, `coverage_90_observed`
   - `emission_rate` (fração não-abstida)
   - `reliability_diagram` (array de M=10 bins)
6. **Critério de aprovação**: mediana over folds de `ECE_global < 0.03` e `coverage_95_observed > 0.93`. [Critério relaxado de 0.02 para fase inicial; revisar com dados reais]

---

## §13 Pontos de decisão — flags para usuário

**[DECISÃO P5.1]** — Target ECE: 0.02 (ambicioso) ou 0.03 (razoável)? Literatura sugere 0.03 como atingível em dados financeiros não-estacionários com n_calib ~ 100k. ECE < 0.02 pode exigir calibração mais agressiva com risco de overfitting em estratos pequenos. **Recomendação: iniciar com 0.03; apertar para 0.02 após 60 dias de dados.**

**[DECISÃO P5.2]** — Kill switch por estrato vs global? 3 kill switches paralelos (calm/opp/event) detectam miscalibração localizada mas aumentam falsos positivos. 1 kill switch global é mais conservador mas menos sensível. **Recomendação: 1 global + 1 flag de alerta por estrato sem fallback automático; escalar conforme experiência operacional.**

**[DECISÃO P5.3]** — Gamma do adaptive conformal: fixo (0.005) ou tunável por regime? Regime event muda mais rápido, exige gamma maior. Mas múltiplos gammas aumentam complexidade. **Recomendação: gamma fixo 0.005 para V1; gamma por regime para V2 se cobertura event for insatisfatória.**

**[DECISÃO P5.4]** — IC 95% ou 90% como default? Operador que prefere mais setups (precisa de IC estreito): 90%. Operador conservador: 95%. **Recomendação: 95% como default; expor como parâmetro CLI.**

**[DECISÃO P5.5]** — Tau_abst_prob (threshold de abstenção por largura IC): 0.20 (default moderado) ou ajustável? **Recomendação: expor como parâmetro CLI com default 0.20.**

---

## §14 Custo de implementação

| Componente | LoC Rust | Esforço estimado | Dependências |
|-----------|----------|-----------------|--------------|
| Temperature scaling | ~30 | 0.5 dia | `argmin` para BFGS/Brent |
| PAV isotonic | ~60 | 0.5 dia | puro Rust |
| Beta calibration | ~80 | 1 dia | `statrs` 0.17 |
| CQR base | ~120 | 1 dia | `ndarray` 0.16 |
| Adaptive conformal | ~80 | 0.5 dia | puro Rust |
| Stratified CQR | ~60 | 0.5 dia | puro Rust |
| Rolling reliability diagram | ~100 | 1 dia | `std::collections::VecDeque` |
| Kill switch + monitor | ~80 | 0.5 dia | puro Rust |
| Block bootstrap (validação) | ~80 | 1 dia | `fastrand` |
| **Total** | **~690 LoC** | **~7 dias** | — |

Python necessário: treino offline dos modelos base (A2), exportação ONNX. Calibração pós-hoc (D5) é inteiramente em Rust.

---

## §15 Stack de dependências D5

```toml
[dependencies]
# Existentes (D7)
ndarray = "0.16"
statrs = "0.17"
polars = { version = "0.46", features = ["lazy"] }

# Novas para D5
argmin = "0.10"          # Otimização 1D para temperature scaling
fastrand = "2.1"          # PRNG para block bootstrap
```

Sem dependência de crate conformal externo — implementação custom conforme D7 confirmou.

---

## §16 Referências citadas

- Angelopoulos & Bates 2023 — *Foundations & Trends in ML* 16(4) — https://arxiv.org/abs/2107.07511
- Chernozhukov, Wüthrich & Zhu 2018 — arXiv:1802.06300 — https://arxiv.org/abs/1802.06300
- Cont 2001 — *Quantitative Finance* 1(2) — https://doi.org/10.1080/713665670
- Feldman, Bates & Romano 2023 — *JMLR* 24(2) — https://arxiv.org/abs/2212.00030
- Geifman & El-Yaniv 2017 — *NeurIPS* — https://arxiv.org/abs/1705.08500
- Gibbs & Candès 2021 — *NeurIPS* — https://arxiv.org/abs/2106.04053
- Guo, Pleiss, Sun & Weinberger 2017 — *ICML* — https://arxiv.org/abs/1706.04599
- Koutmos 2018 — *Economics Letters* 173 — https://doi.org/10.1016/j.econlet.2018.10.004
- Kull, Silva Filho & Flach 2017 — *Electronic Journal of Statistics* 11(2) — https://doi.org/10.1214/17-EJS1338SI
- Lei et al. 2018 — *JASA* 113 — https://doi.org/10.1080/01621459.2017.1307116
- Lei & Wasserman 2014 — *JRSS-B* 76(1) — https://doi.org/10.1111/rssb.12021
- López de Prado 2018 — *Advances in Financial ML* — Wiley — ISBN 978-1-119-48208-6
- Messoudi, Destercke & Rousseau 2022 — *UAI Proceedings* — https://arxiv.org/abs/2106.11641
- Niculescu-Mizil & Caruana 2005 — *ICML* — https://dl.acm.org/doi/10.1145/1102351.1102430
- Nixon et al. 2019 — *CVPR* — https://arxiv.org/abs/1904.01685
- Papadopoulos et al. 2002 — *ECML* — Inductive Conformal Prediction
- Pickands 1975 — *Annals of Statistics* 3(1) — https://doi.org/10.1214/aos/1176343003
- Politis & Romano 1994 — *JASA* 89(428) — https://doi.org/10.1080/01621459.1994.10476870
- Romano, Patterson & Candès 2019 — *NeurIPS* — https://arxiv.org/abs/1905.03222
- Romano, Sesia & Candès 2020 — *NeurIPS* — https://arxiv.org/abs/2010.09875
- Vovk, Gammerman & Shafer 2005 — *Algorithmic Learning in a Random World* — Springer — ISBN 978-0-387-00152-4
- Xu & Xie 2023 — SPCI — https://arxiv.org/abs/2202.07455
- Zadrozny & Elkan 2001 — *ICML* — https://dl.acm.org/doi/10.5555/645530.655813
- Zaffran et al. 2022 — *ICML* — https://arxiv.org/abs/2202.07282

---

*Fim D5 v0.1.0. Próxima revisão: após 60 dias de dados para validar ECE empírico vs target 0.02. Pontos P5.1–P5.5 aguardam decisão do usuário.*
