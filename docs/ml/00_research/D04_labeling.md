---
name: D4 — Labeling, Backtesting e Avaliação
description: Protocolo de labeling triple-barrier adaptado a cross-exchange arbitrage + purged walk-forward K-fold com embargo + catálogo de métricas + auditoria automatizada de T9 label leakage, sem ground-truth público, para stack Rust precision-first longtail crypto.
type: research
status: draft
author: phd-d4-labeling
date: 2026-04-19
version: 0.1.0
---

# D4 — Labeling, Backtesting e Avaliação sem Ground-Truth Público

> Responsabilidade primária: **T9 label leakage** — armadilha que destrói 90% dos backtests de ML financeiro.
> Confiança geral: 82%. Flags explícitos onde evidência cai para < 80%.
> Input Wave 1: D1 (arquitetura A2 composta + baseline A3 ECDF), D2 (α∈[2.8,3.3]; H∈[0.70,0.85]; 3 regimes; `median(D_2)<0.5s`), D7 (treino Python→ONNX→inferência Rust `tract`; `polars 0.46`; CQR ~200 LoC).

---

## §1 Tese central e esqueleto metodológico

Não há dataset rotulado público para cross-exchange arbitrage longtail — nem de sinais confirmados, nem de horizontes realizados, nem de haircut medido. Construir labels a partir do stream de `(entrySpread, exitSpread, book_age, vol24)` e avaliar sem overfitting estatístico requer três pilares simultâneos:

1. **Labeling triple-barrier adaptado** (López de Prado 2018, *Advances in Financial Machine Learning*, Wiley, ISBN 978-1-119-48208-6, cap. 3, §3.3) — modificado para respeitar a identidade contábil `PnL = S_entrada(t₀) + S_saída(t₁)` do skill canônico e o baseline `−2·half_spread_típico` (NÃO zero).
2. **Purged walk-forward K-fold com embargo** (López de Prado 2018, cap. 7, §7.4) — protocolo de validação cruzada que elimina leakage causado por sobreposição de janelas de label.
3. **Auditoria automatizada T9** em CI — shuffle temporal, AST scan de features, forward-looking synthetic tests.

Em paralelo, corrigir os sete pitfalls documentados por Bailey, Borwein, López de Prado & Zhu 2014 ("The Probability of Backtest Overfitting", *Journal of Computational Finance* 20(4), 39–69, https://doi.org/10.21314/JCF.2016.322): multiple testing inflation, Sharpe haircut, survivorship. Ajuste por multiple testing via **Deflated Sharpe Ratio** (Bailey & López de Prado 2014, *Journal of Portfolio Management* 40(5), 94–107, https://doi.org/10.3905/jpm.2014.40.5.094) e **Benjamini-Hochberg FDR** (Benjamini & Hochberg 1995, *JRSS-B* 57(1), 289–300, https://www.jstor.org/stable/2346101).

---

## §2 Protocolo de labeling

### 2.1 Triple-barrier adaptado ao skill canônico

Dado snapshot `t₀` com `entrySpread(t₀)` na cauda superior do percentil histórico da rota (gatilho mínimo: `entrySpread(t₀) ≥ P95(rota, 24h)` — impede etiquetar ruído), três barreiras:

- **Sucesso (barreira superior)**: `∃ t₁ ∈ (t₀, t₀+T_max]` tal que `S_entrada(t₀) + S_saída(t₁) ≥ meta_operador`.
- **Falha (barreira inferior / stop)**: `∃ t₁ ∈ (t₀, t₀+T_max]` tal que `S_entrada(t₀) + S_saída(t₁) ≤ −stop_operador`.
- **Timeout (barreira temporal)**: nenhuma das duas ocorre em `[t₀, t₀+T_max]`. Rótulo: `timeout` (separado de "falha"; ver §2.3 abaixo).

**Correção crítica vs López de Prado 2018 original**: em equities, barreiras são simétricas em dólares de preço. Aqui, a barreira é `meta_operador` em termos de **soma de spreads**, e o baseline natural NÃO é zero — é `−2·half_spread_típico` (reversão estrutural do bid-ask effect). Portanto:

- `meta_operador ∈ {0.3%, 0.5%, 1.0%, 2.0%}` — expressa PnL bruto desejado acima de baseline. Note que `meta_operador = 0.3%` já descarta ~70% do snapshot (n=431) de D2, porque `entrySpread` mediana é 0.32%. O baseline `meta = 0.5%` alinha com o floor U₁ proposto em D1 (0.6–1.0%), abaixo para reservar margem.
- `stop_operador ∈ {−0.5%, −1.0%, −2.0%}` — opcional (`None` permitido para operador que aceita cauda ruim).
- `T_max ∈ {30min, 4h, 24h}` — corrige rigidez do skill canônico (correção #4).

**Labels paramétricas**: cada amostra tem dataset wide com colunas `label_meta_M_stop_S_Tmax_T`, uma por combinação. MVP = grid 4×4×3 = 48 labels. Operador seleciona na UI qual perfil quer e o modelo é retreinado offline com o label selecionado. Custo de armazenamento: 48 × 1 byte × 2600 rotas × 90 dias × 86400 s / 150ms ≈ 6 GB comprimido Parquet (`polars 0.46` com `zstd`).

### 2.2 Meta-labeling (López de Prado 2018, cap. 3, §3.6)

Decomposição em duas cascatas:

1. **Modelo primário (regra determinística)**: `entrySpread(t₀) ≥ P95(rota, 24h)` AND `book_age(A) < 200ms` AND `book_age(B) < 200ms` AND `vol24 ≥ $50k`. Esta é a regra que o scanner já aplica hoje.
2. **Modelo secundário (ML — A2 de D1)**: dado que primário disparou, predizer `P(sucesso | primário_disparou, features_completas)`.

**Ganho de precision**: López de Prado 2018 Fig. 3.4 mostra ganho médio de precision de 15–30% às custas de 10–20% de recall em equities. Em crypto longtail, Guo, Intini & Jahanshahloo 2025 (*FRL* 71, art. 105503) implicitamente sugerem ganho maior por event-driven nature (halts, listings).

**Encaixe com arquitetura D1**: meta-labeling torna o pipeline A2 mais limpo — o scanner Rust é a camada primária (regra hard), e o modelo ONNX é a camada secundária. Abstenção tipada é output da secundária.

### 2.3 Labeling ternário vs binário com abstenção

Duas candidatas explicitamente debatidas (steel-man):

- **Binário {sucesso, não-sucesso} + abstenção learned separadamente**: treinar classifier binário + modelo separado para decidir "emitir sinal?" (baseado em quantile do modelo principal e cobertura conformal). Vantagem: separação clara de responsabilidades; abstenção multi-causa (LowConfidence vs InsufficientData). Desvantagem: duas calibrações independentes.
- **Ternário {sucesso, falha, timeout} com cost-sensitive loss**: uma rede só, loss assimétrica (FP custa mais que FN — precision-first). Usar **focal loss** (Lin et al. 2017, *ICCV*, https://arxiv.org/abs/1708.02002) ou **class-balanced loss** (Cui et al. 2019, *CVPR*, https://arxiv.org/abs/1901.05555). Vantagem: um único artefato ONNX. Desvantagem: abstenção não é causa-tipada.

**Decisão recomendada**: binário + abstenção separada. Razões: (a) alinhamento com A2 composta de D1 (cada componente tipado); (b) abstenção causa-tipada crítica operacionalmente; (c) manutenção mais fácil em Rust inferência. **[Confiança 75% — exige validação A/B em shadow mode]**.

### 2.4 Parâmetros concretos

| Parâmetro | Valor recomendado | Justificativa |
|---|---|---|
| Trigger mínimo para rotular | `entrySpread(t₀) ≥ P95(rota, 24h rolling)` | Elimina ~95% de ruído sem colocar modelo em stress na cauda extrema |
| Grid `meta_operador` | {0.3, 0.5, 1.0, 2.0}% | Cobre operadores conservadores a agressivos; alinhado com §5.5 |
| Grid `stop_operador` | {None, −1.0, −2.0}% | `None` aceitável: operador pode usar só timeout |
| Grid `T_max` | {30min, 4h, 24h} | D2 reportou `median(D_2)<0.5s` mas operadores humanos têm latência de reação; 30min é mínimo realista |
| Horizonte mínimo de coleta | 90 dias × 2600 rotas | Alinhado D2; com `T_max=24h` exige 1 mês extra de buffer = 120 dias |

---

## §3 Purged walk-forward K-fold com embargo

### 3.1 Protocolo (López de Prado 2018, cap. 7)

Ordenar amostras por `t₀` cronologicamente. Dividir em K folds consecutivos (sem shuffle). Para cada fold k como teste:

1. **Purge**: remover do train todas amostras `i` cuja window de label `[t₀(i), t₀(i)+T_max]` intersecta com `[min(t₀ test), max(t₀ test) + T_max]`. Isso garante que nenhum exemplo de treino compartilha futuro com teste.
2. **Embargo**: remover também amostras nas `h` horas antes e depois do fold de teste (evita autocorrelação residual via regime persistence — Bariviera 2017, *Economics Letters* 161, 1–4, H ≈ 0.55–0.65 em BTC, e D2 prognostica H ∈ [0.70, 0.85] em longtail).

**Parâmetros recomendados**:

| Parâmetro | Valor | Justificativa |
|---|---|---|
| K (número de folds) | **6** | López de Prado 2018 §7.4 recomenda 5–10; com 90 dias × ~2.6k rotas × 576 snapshots/dia a 150ms (amostra desnsa) temos ~1.3×10⁸ obs → 6 folds × 15 dias cada; suficiente para GBT converge |
| Embargo (h) | **2 × T_max** | López de Prado 2018 §7.4 sugere 1%. 2× é conservador dado H alto em longtail; para `T_max=24h`, embargo = 48h |
| Gap mínimo | `T_max + embargo` | Garante zero overlap mesmo com autocorrelação de regime (D2 §2.2) |
| Walk-forward vs K-fold | **Walk-forward expanding** | Janela expande progressivamente; mais realista que rolling para modelagem de regime-shift |

**Tamanho de dataset que cada config consume**: 90 dias × 2600 rotas × 576 snapshots/dia ≈ 1.35×10⁸ observações brutas. Após trigger filtering (P95 do `entrySpread`): ~6.7×10⁶ observações labeláveis. Após purge em 6 folds: ~5.0×10⁶ por fold. Bailey & López de Prado 2014 sugere que para DSR estável são necessárias 10³–10⁴ observações independentes por config — estamos muito acima; viável.

### 3.2 Critério de dataset mínimo

Bailey, Borwein, López de Prado & Zhu 2014 (§4, "Probability of Backtest Overfitting") mostra que o Combinatorially Symmetric Cross-Validation (CSCV) exige ≥ 16 configs × ≥ 1000 obs por config para PBO < 5%. Com nosso 6-fold × 4.5M obs/fold, PBO fica confortavelmente abaixo de 5% **desde que multiple testing seja corrigido no final**. **[Confiança 85%]**.

### 3.3 Comparação com baselines (steel-man)

| Método | Leakage risk | Custo computacional | Apto para T9? |
|---|---|---|---|
| Random train/test split | **CATASTRÓFICO** — viola IID | baixo | NÃO — ANTI-PADRÃO §7 |
| Time-series split (sklearn TimeSeriesSplit) | moderado — não purga | médio | Parcial — sem purge/embargo |
| **Purged K-fold com embargo** | **mínimo** | médio-alto | SIM — padrão López de Prado |
| CPCV (Combinatorial Purged CV) | mínimo | MUITO ALTO (C(N,K) combinations) | SIM — overkill para MVP |

Recomendação: purged K-fold para MVP; CPCV para validação final pré-produção (rodar só uma vez antes de deploy).

---

## §4 Catálogo de métricas (precision-first + calibração + operacional)

### 4.1 Classificação / seleção

- **Precision@k** (crítico precision-first): `P(sucesso | modelo emite top-k sinais por janela de 1h)`. k ∈ {1, 5, 10, 50}. Alvo MVP: `precision@10 ≥ 0.70` para perfil médio.
- **Recall@k**: reportar mas secundário.
- **AUC-PR** (Area Under Precision-Recall): preferível a AUC-ROC em class-imbalanced. Saito & Rehmsmeier 2015 (*PLoS ONE* 10(3), e0118432, https://doi.org/10.1371/journal.pone.0118432) mostram que ROC é enganoso quando classe positiva é <5% (nosso caso: ~2% dos snapshots são sucessos com `meta=1%`).
- **F0.5-k**: β=0.5 dá peso maior a precision. `F_{0.5} = 1.25 · P·R / (0.25·P + R)`.

### 4.2 Calibração

- **Brier score** (Brier 1950, *Monthly Weather Review* 78(1), 1–3, https://doi.org/10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2): `mean((p_i − y_i)²)`. Proper scoring rule.
- **ECE** (Expected Calibration Error, Guo et al. 2017, *ICML*, https://arxiv.org/abs/1706.04599): `sum_m (|B_m|/n) · |acc(B_m) − conf(B_m)|` com 10 bins uniformes.
- **Reliability diagram**: plot visual (inclui no relatório de backtest).
- **MCE** (Maximum Calibration Error): máximo por-bin de ECE.

**Alvo**: ECE < 5% em calibration test fold; reliability diagram visualmente alinhado com diagonal.

### 4.3 Probabilistic / quantile

- **Pinball loss** (Koenker & Bassett 1978, *Econometrica* 46(1), 33–50): `ρ_τ(y − ŷ_τ) = (y − ŷ_τ)·(τ − 1[y<ŷ_τ])`. Core de CQR.
- **CRPS** (Gneiting & Raftery 2007, *JASA* 102(477), 359–378, https://doi.org/10.1198/016214506000001437): `∫ (F(x) − 1[x≥y])² dx`. Proper scoring rule para distribuições completas.
- **Coverage empírica** de intervalos conformal: `fraction(y ∈ [q_α/2, q_{1-α/2}])` vs nominal `1-α`. Desvio < 2 pp é aceitável (Angelopoulos & Bates 2023, *Foundations & Trends ML* 16(4), https://arxiv.org/abs/2107.07511).

### 4.4 Operacional simulada

- **Profit curve simulada**: aplicar haircut empírico de D2 (`quoted 1% → realizable 0.6–0.8%`) para converter `gross_profit_quoted` em realizable. Subtrair floor (0.6–1.0%) e fees (estimados) simulados.
- **Sharpe simulado deflacionado** (Bailey & López de Prado 2014): `DSR = Z · [(SR_observed − E[SR|H0]) / sigma_SR]` com ajuste por `N = número de configs testadas` e skew/kurt do backtest. Referência alvo: DSR ≥ 2.0 após deflate.
- **Max drawdown simulado** e **Calmar** (anualizado / maxDD).
- **Capacity**: até que tamanho (USD por setup) o modelo mantém edge? Simulação via price-impact (Almgren & Chriss 2001, *J. Risk* 3(2), 5–40).

### 4.5 Abstenção

- **Coverage rate**: fração de snapshots em que modelo emite sinal. Alvo MVP: 1–5% (seletivo).
- **Precision entre emitidos**: mede que o modelo abstém onde deveria abster.
- **Abstention quality por causa** (T5):
  - `NoOpportunity`: em janelas que ex-post não tiveram `meta` alcançada, fração corretamente abstida. Alvo: ≥ 95%.
  - `InsufficientData`: em rotas recém-listadas, fração abstida. Alvo: 100% até N_min observações.
  - `LowConfidence`: em janelas de regime `event` (D2 §2.3), fração abstida.

### 4.6 Simpson's paradox mitigation

Agregar Precision@k por subpopulação antes de reportar média:

| Subpopulação | Motivo |
|---|---|
| Por venue-pair | Liquidez e fee tier variam |
| Por listing_age (< 7d, 7–30d, > 30d) | D2 §2.4: pós-listing tem cauda esticada |
| Por regime D2 (calm / opportunity / event) | Calibração degrada entre regimes (T8) |
| Por tipo (SPOT/PERP vs PERP/PERP) | Mecânica de funding distinta |
| Por quantil de vol24 | Liquidity regime muda comportamento |

Reportar `mean ± std` por bucket, NÃO só média global. Simpson's paradox (Simpson 1951, *JRSS-B* 13(2), 238–241) pode produzir precision global 0.80 mascarando precision 0.20 em rotas longtail.

### 4.7 Multiple testing correction

Cada fold testa `N = |grid_meta| × |grid_stop| × |grid_Tmax| × |subpopulations| ≈ 48 × 5 = 240` hipóteses simultâneas. Aplicar:

- **Benjamini-Hochberg** (1995, *JRSS-B* 57(1), 289–300) para FDR < 10%.
- **Deflated Sharpe Ratio** para Sharpe agregado.
- **Romano-Wolf stepwise** (Romano & Wolf 2005, *Econometrica* 73(4), 1237–1282, https://doi.org/10.1111/j.1468-0262.2005.00615.x) quando cauda da distribuição importa — mais potente que Bonferroni em contexto crypto heavy-tail.

**Threshold de decisão**: uma config é declarada "significante" sse `p-value BH-corrigido < 0.05` AND `DSR > 2.0` AND `precision@10 > 0.70 em cada subpopulação`.

---

## §5 Protocolo de auditoria T9 automatizado em Rust CI

### 5.1 Quatro testes obrigatórios em CI

Implementação em `scanner/crates/ml_eval/` (crate nova; `polars 0.46` + `ndarray 0.16`):

**(a) Shuffling temporal** (sanity check):
```rust
// pseudo-code
fn test_temporal_shuffle_leakage(model, dataset) {
    let perf_original = evaluate(model, dataset);
    let dataset_shuffled = shuffle_labels_within_time_buckets(&dataset);
    let perf_shuffled = evaluate(model, dataset_shuffled);
    assert!(perf_shuffled.precision_at_10 < perf_original.precision_at_10 * 0.5);
    // se performance quase igual -> há leakage
}
```

**(b) Feature-by-feature AST audit**:
```rust
// CI step: scan src/features/*.rs por padrões proibidos
fn audit_feature_code() {
    for feature_fn in collect_feature_functions() {
        let ast = parse_syn(feature_fn);
        assert!(no_index_into_future(&ast)); // rejeita dataset[t+k]
        assert!(no_global_statistics(&ast));  // rejeita dataset.mean()
        assert!(rolling_windows_are_past_only(&ast)); // rejeita rolling que avança
    }
}
```

Usar `syn 2.x` para AST parsing; `proc-macro2` para pattern matching. Patterns proibidos: `arr[i + k]`, `dataset.iter().all()`, `slice[..].mean()` sem `< t0` guard.

**(c) Dataset-wide statistics flag**: scanner estático de features que usam `mean`, `std`, `min`, `max`, `quantile` sobre arrays cruzando `t₀`. Whitelist: `expanding_mean_until(t₀)`, `rolling_window_past(t₀, W)`. Blacklist: `dataset.mean()`, `dataset.std()`.

**(d) Purge verification**: checar que, após split train/test, zero pares `(i_train, j_test)` satisfazem `[t₀(i), t₀(i)+T_max] ∩ [t₀(j), t₀(j)+T_max] ≠ ∅`.

```rust
fn verify_no_purge_violation(train: &[Label], test: &[Label], t_max: Duration) -> Result<()> {
    for tr in train {
        for te in test {
            let tr_window = tr.t0..=tr.t0 + t_max;
            let te_window = te.t0..=te.t0 + t_max;
            if windows_overlap(&tr_window, &te_window) {
                return Err(LeakageError::PurgeViolation(tr.idx, te.idx));
            }
        }
    }
    Ok(())
}
```

**(e) Forward-looking synthetic test** (canary):
```rust
// injeta feature sintética que LÊ FUTURO; pipeline deve rejeitar via audit (a)+(b)
fn canary_test() {
    let poisoned = add_feature(dataset, |row, ctx| {
        ctx.future_window(row.t0, Duration::hours(1)).mean()
    });
    assert!(audit_pipeline(poisoned).is_err());
}
```

### 5.2 Integração GitHub Actions

`.github/workflows/ml_leakage.yml`:
- trigger: PR em `crates/ml_*`, `labels/*`
- etapas: `cargo test -p ml_eval --test leakage_audit`
- fail fast: qualquer violation bloqueia PR
- artifact: `leakage_report.json` com detalhe por feature

Custo: ~3 min em runner padrão (dataset amostrado para CI).

### 5.3 Red-team sobre o auditor

- AST audit pode ser burlado por indireção (feature computada em outra função, chamada por ponteiro): compensar com taint tracking.
- Purge verification tem custo O(N_train × N_test); amostrar 10k × 10k ainda custa 1e8 comparações mas é ok (<5s em runner).
- Shuffle temporal não detecta leakage em features que dependem de estatísticas de pares (cross-row leakage via groupby); complementar com teste de bloco temporal.

---

## §6 Simulação de operador — 3 perfis

Reportar todas métricas condicionadas a cada perfil (§4.6 Simpson mitigation).

| Perfil | τ_P (prob threshold) | floor | T_max | Stop | Rotas aceitas |
|---|---|---|---|---|---|
| Conservador | 0.85 | 1.0% | 30min | −1.0% | Top-20 vol24 |
| Médio | 0.65 | 0.5% | 4h | −2.0% | Top-200 vol24 |
| Agressivo | 0.40 | 0.2% | 24h | None | Todas 2600 |

**Métricas por perfil**:
- `precision@10_conditional = P(sucesso | modelo emite ∧ P≥τ ∧ gross≥floor)`.
- `coverage_rate_conditional` — fração de snapshots que passam filtro.
- `profit_curve_conditional` — lucro simulado com haircut de D2 aplicado.
- `MTTF` (mean time to fail) — quantos sinais em sequência antes de drawdown > 10%.

**Steel-man**: operadores podem preferir **MDD minimization** em vez de **expected profit** (Kelly-averse). Incluir `Calmar ratio` como métrica secundária.

**Red-team**: perfil Agressivo com `T_max=24h` cruza múltiplos regimes de D2 — calibração provavelmente degrada fora do regime `calm`. Reportar por-regime.

---

## §7 DSR + multiple testing aplicado

### 7.1 Deflated Sharpe Ratio

Bailey & López de Prado 2014 fórmula (eq. 7):

```
DSR = Φ^(-1)[(SR_obs - E[max SR_i]) · sqrt((N-1) / (1 - γ₃·SR_obs + (γ₄-1)/4 · SR_obs²))]
```

onde γ₃ = skew do backtest, γ₄ = kurtosis (>3 em heavy-tail), N = obs, E[max] = expected max Sharpe sob H0 dado #trials.

**Aplicação aqui**:
- #trials = |grid_meta| × |grid_stop| × |grid_Tmax| × |architecture_variants| × |subpopulations| ≈ 48 × 4 × 5 = 960.
- kurtosis empírico crypto ~10–30 (D2 §2.1 α ∈ [2.8, 3.3]).
- E[max SR | H0, N=960] ≈ 1.4 (Bailey 2014 Fig. 1).

**Threshold efetivo**: SR_obs > 3.0 para DSR > 2.0 pós-deflate em nosso regime. Barra alta mas adequada — é o que protege contra overfitting multiple-testing.

### 7.2 BH para múltiplas precisions

240 hipóteses (cada config × subpop). BH procedure:
1. Ordenar p-values `p_(1) ≤ p_(2) ≤ ... ≤ p_(m)`.
2. Rejeitar `H_(k)` se `p_(k) ≤ (k/m) · α` com α=0.10.
3. Reportar #rejections e FDR estimado.

### 7.3 Romano-Wolf para tail

Quando métrica-alvo é tail-sensitive (e.g., `precision@10` em regime `event`), Romano-Wolf 2005 stepwise controla FWER sob heavy-tail via bootstrap. Implementação em Rust via `statrs 0.18` + bootstrap loop (block bootstrap Künsch 1989 para séries temporais).

### 7.4 Bootstrap temporal apropriado

Dados não-IID exigem block bootstrap:
- **Stationary bootstrap** (Politis & Romano 1994, *JASA* 89(428), 1303–1313, https://doi.org/10.1080/01621459.1994.10476870) — block lengths geometric.
- **Moving block bootstrap** (Künsch 1989, *Annals of Statistics* 17(3), 1217–1241, https://doi.org/10.1214/aos/1176347265) — block fixo; escolher L ≈ n^(1/3).

Com n=5×10⁶ por fold: L ≈ 170. Custo bootstrap: B=1000 resamples × 170 LoC Rust ≈ viável em 30min CI.

---

## §8 Armadilhas longtail crypto específicas

### 8.1 Survivorship bias

Rotas que delistaram somem do dataset "atual" — backtest não as vê. D2 §2.7 nota listing/delisting 15–30/mês por venue-combo. Mitigação:

- Preservar `listing_history.parquet` com `(symbol, venue, status, listed_at, delisted_at)` imutável.
- Rodar backtest sobre `all(rotas_listadas_na_janela_do_fold)`, não sobre `rotas_ativas_hoje`.
- Marcar amostras pós-delisting como `label = NA` (não-executável por definição).

### 8.2 Fee tier mid-period change

Venues mudam fee tiers historicamente (MEXC, BingX reduziram fees em 2023–2024). Mitigação:

- Tabela `fee_schedule.parquet` com `(venue, start_date, end_date, maker, taker, vip_tier)`.
- Simular `gross_profit_realizable` com fee vigente na data do snapshot, não fee atual.
- Reportar sensibilidade: `precision@10 com fees 2023 vs 2024 vs 2026`.

### 8.3 Halts

Rotas com halt ativo têm `entrySpread` extremo mas não-executável. Mitigação:

- Adicionar campo `halt_active: bool` ao snapshot (derivado de `book_age > 60s` + ausência de trades em 5min).
- Excluir amostras com `halt_active=true` do sucesso label (não contar como lucro que não pode ser realizado).
- Manter no dataset como label `NotExecutable` — útil para treinar modelo de abstenção.

### 8.4 Spike events

Eventos únicos (exchange hack, regulatory ban) dominam estatísticas por outlier leverage. Mitigação:

- **Winsorize labels** em p99.5% bilateral na `sum_of_spreads`.
- **Trimmed mean** para métricas agregadas: reportar 10%-trimmed mean junto com mean.
- **Flag event dates** (`event_calendar.parquet`): FTX collapse (2022-11), Luna collapse (2022-05), Silicon Valley Bank (2023-03). Avaliar modelo com/sem essas janelas.

---

## §9 Red-team: cenários de falha silenciosa

**S1 — Purge "aparente" mas não "profundo"**: purge remove overlap direto `[t₀, t₀+T_max]` mas não considera autocorrelação residual via features rolling. Se feature tem rolling window de 48h, precisa purgar 48h de contexto além de T_max. **Mitigação**: embargo conservador = 2×T_max + 2×max_feature_lookback.

**S2 — Selection bias via trigger mínimo**: usar `P95(rota, 24h rolling)` como gatilho mínimo introduz dependência — rotas em regime `event` têm P95 dinâmico. Modelo pode aprender "P95 está subindo → trigger vai disparar" sem aprender nada sobre realização real. **Mitigação**: trigger absoluto adicional (`entrySpread ≥ 0.2%`) e reportar precision@k sem condicionamento no trigger.

**S3 — DSR subestima trials reais**: analista "explorou" 960 configs conscientes mas pode ter testado muitas mais tacitamente (hiperparâmetros GBT, features candidatas, etc). Bailey & López de Prado 2014 §5 alerta para "researcher's secret history". **Mitigação**: manter `research_log.md` com TODA tentativa; contar honestamente.

**S4 — Regime shift pós-treino invalida calibração**: D2 prognostica 3 regimes; se teste cai em regime não-visto em train, ECE explode. **Mitigação**: adaptive conformal (Zaffran et al. 2022, *ICML*, https://arxiv.org/abs/2110.09192); monitoramento ECE em produção com alarme quando ECE > 10%.

**S5 — Feedback loop pós-deploy**: modelo emite sinal → operador executa → impact price → próxima janela tem menos spread → modelo retreina com dados "deprimidos" → loss function espúria. **Mitigação**: flag snapshots pós-execução interna (requer acoplamento com execution log); usar só snapshots "virgens".

**S6 — Auditor AST não cobre macros procedurais**: `proc_macro` gerado em build.rs pode inserir features com leakage. **Mitigação**: auditar AST EXPANDIDO via `cargo expand`, não só AST superficial.

**S7 — Meta-labeling propaga bias**: regra primária (P95) filtra amostras de um modo; secundário aprende em distribuição condicional que difere de produção. **Mitigação**: reportar ambas precisions (primária só + primária+secundária); comparar ROC-PR de primária vs completa.

---

## §10 Pontos de decisão do usuário (confiança < 80%)

1. **Granularidade de amostragem do dataset de treino** — 150ms (densidade máxima, ~1.35×10⁸ obs/dia) ou subsampling (e.g., só snapshots em que `entrySpread ≥ P90`)? Subsampling reduz custo 100× mas enviesa. **Flag: exige decisão — trade-off custo vs bias**.
2. **Binário com abstenção separada vs ternário com cost-sensitive** — §2.3 debate; confiança 75%. A/B em shadow mode.
3. **Fee schedule quanto detalhado** — VIP tier por usuário ou só retail padrão? Retail é default seguro; VIP exige coleta.
4. **Winsorize p99.5% ou 99.0%** — mais agressivo corta eventos reais; mais permissivo permite outliers. 99.5% é default mas operador pode querer 99.0% (mais robusto) — expor na config.
5. **Paralelismo do purged K-fold em CI** — 6 folds sequenciais (30min) ou paralelos (8min, custo 6× RAM). Default sequencial.
6. **Benchmark baseline A3** — reportado alvo AUC-PR 0.4–0.6 e precision@10 0.45–0.60 em regime longtail baseado em proxy de equities (Chan 2013, *Algorithmic Trading*, Wiley, ch. 7 com stat-arb 0.55 precision). **Confiança 60% — exige calibração real do baseline em shadow mode antes de declarar "modelo ML > baseline"**.
7. **K=6 vs K=10** — trade-off entre variância do fold estimate e overlap de purging. K=6 é meio-termo; K=10 com embargo 2×T_max pode deixar folds minúsculos em `T_max=24h`. Confiança 78%.
8. **Capacity analysis em MVP ou V2?** — MVP pode rodar sem; V2 imprescindível para deploy sizing. Recomendação: MVP reporta capacity para 1 tamanho ($5k); V2 cobre Pareto.

---

## §11 Aderência Rust e custo de implementação

Pipeline avaliação em Rust puro (cumpre §0.5 precedência Rust absoluta):

| Componente | Crate | LoC estimadas |
|---|---|---|
| Labeling triple-barrier | `ml_eval::labeling` | 400 |
| Purged K-fold + embargo | `ml_eval::cv` | 300 |
| Métricas (Brier/ECE/CRPS/pinball) | `ml_eval::metrics` | 500 |
| DSR + BH + Romano-Wolf | `ml_eval::significance` | 350 |
| Bootstrap (stationary + block) | `ml_eval::bootstrap` | 200 |
| T9 leakage audit (AST + shuffle + canary) | `ml_eval::leakage` | 450 |
| Simulação operador + profit curve | `ml_eval::simulation` | 300 |
| CI hooks (GitHub Actions + polars read/write) | `.github/workflows/ml_eval.yml` | 80 |
| **Total** | — | **~2600 LoC Rust puro** |

Dependências: `polars 0.46`, `ndarray 0.16`, `statrs 0.18`, `syn 2.x`, `proc-macro2`, `rayon 1.10` (paralelismo por fold). Zero FFI. Esforço: **4–6 semanas-pessoa**.

---

## §12 Sumário e integração com D5/D10

D4 entrega para **D5 (calibração e conformal prediction)**: labels paramétricas + folds purgados + Brier/ECE como métricas chave de calibração cross-regime.

D4 entrega para **D10 (shadow mode)**: protocolo de avaliação em produção contínua — os mesmos métricas em janela rolling, com alarme quando ECE/precision@10 degrada > 2σ.

D4 recebe de **D1 (arquitetura)**: A2 + A3 para avaliar comparativamente; de **D2 (microestrutura)**: haircut empírico, regimes, D_x persistência; de **D7 (stack Rust)**: polars/ndarray confirmados.

**Thread de convergência Wave 2 (D3/D4/D5/D6 + D8–D10)**: próximo passo é validar com D5 (calibração) se triple-barrier binário + abstenção separada produz ECE < 5% em regime switch — crítico para decidir §2.3. Se não, cost-sensitive ternário vira plano B.

**Rigor T9 não-negociável**: qualquer PR que modifique `crates/ml_*` ou `labels/*` SEM passar audit é bloqueado por CI. Shuffle temporal + AST + canary são executados em toda PR. Esse é o guard-rail que impede que 90% dos backtests financeiros falhem silenciosamente.

---

## Referências primárias consolidadas

1. **López de Prado 2018** — *Advances in Financial Machine Learning*, Wiley, ISBN 978-1-119-48208-6. Cap. 3 (triple-barrier, meta-labeling), cap. 7 (purged K-fold + embargo). **Leitura mandatória**.
2. **López de Prado 2020** — *Machine Learning for Asset Managers*, Cambridge Univ Press, ISBN 978-1-108-79289-5.
3. **Bailey & López de Prado 2014** — "The Deflated Sharpe Ratio", *J. Portfolio Management* 40(5), 94–107, https://doi.org/10.3905/jpm.2014.40.5.094.
4. **Bailey, Borwein, López de Prado & Zhu 2014** — "The Probability of Backtest Overfitting", *J. Computational Finance* 20(4), 39–69, https://doi.org/10.21314/JCF.2016.322.
5. **Harvey, Liu & Zhu 2016** — "...and the Cross-Section of Expected Returns", *RFS* 29(1), 5–68, https://doi.org/10.1093/rfs/hhv059.
6. **Benjamini & Hochberg 1995** — FDR, *JRSS-B* 57(1), 289–300, https://www.jstor.org/stable/2346101.
7. **Romano & Wolf 2005** — Stepwise multiple testing, *Econometrica* 73(4), 1237–1282, https://doi.org/10.1111/j.1468-0262.2005.00615.x.
8. **Gneiting & Raftery 2007** — Proper scoring rules, *JASA* 102(477), 359–378, https://doi.org/10.1198/016214506000001437.
9. **Guo et al. 2017** — Calibration of modern NN, *ICML*, https://arxiv.org/abs/1706.04599.
10. **Brier 1950** — Brier score, *Monthly Weather Review* 78(1), 1–3.
11. **Politis & Romano 1994** — Stationary bootstrap, *JASA* 89(428), 1303–1313, https://doi.org/10.1080/01621459.1994.10476870.
12. **Künsch 1989** — Block bootstrap, *Annals of Statistics* 17(3), 1217–1241, https://doi.org/10.1214/aos/1176347265.
13. **Angelopoulos & Bates 2023** — Gentle intro to conformal, *Foundations & Trends ML* 16(4), https://arxiv.org/abs/2107.07511.
14. **Saito & Rehmsmeier 2015** — Precision-recall vs ROC, *PLoS ONE* 10(3), e0118432.
15. **Makarov & Schoar 2020** — Crypto arbitrage, *JFE* 135(2), 293–319.
16. **Guo, Intini & Jahanshahloo 2025** — Crypto default risk, *FRL* 71, art. 105503.
17. **El-Yaniv & Wiener 2010** — Selective classification, *JMLR* 11, 1605–1641.
18. **Zaffran et al. 2022** — Adaptive conformal, *ICML*, https://arxiv.org/abs/2110.09192.
19. **Almgren & Chriss 2001** — Market impact, *J. Risk* 3(2), 5–40.
20. **Lin et al. 2017** — Focal loss, *ICCV*, https://arxiv.org/abs/1708.02002.
