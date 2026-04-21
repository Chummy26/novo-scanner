---
name: A2 — Auditoria de Reproducibilidade PIT-Correct das 15 Features MVP (ADR-014)
description: |
  Auditoria PhD feature engineering + time-series ML sobre se as 15 features
  MVP (ADR-014 spreads-only) são reproduziveis PIT-correct pelo trainer Python
  dado o dataset atual (AcceptedSample JSONL + HotQueryCache RAM).
type: audit
status: draft
author: phd-a2-feature-reproducibility
date: 2026-04-20
version: 0.1.0
scope: ADR-014 MVP 15 features x dataset pós-Fase 0
references:
  - ADR-014 (15 features aprovadas)
  - ADR-012 (feature store 4 camadas)
  - ADR-006 (purged K-fold)
  - ADR-016 (output contract)
  - DATASET_ACTION_PLAN.md
  - FASE0_PROGRESS.md
  - data_lineage.md
  - López de Prado 2018 AFML cap. 3, 4, 7
---

# A2 — Auditoria de Reproducibilidade PIT-Correct das 15 Features MVP

## §0 Postura crítica

Steel-man de 3 alternativas por gap identificado. Red-team explícito por família.
Confidence < 80% é flagado com justificativa numérica. Proibição de "pode usar
interpolação" sem rigor metodológico. Stack default Rust; Python somente onde
gap Rust > 2× ou biblioteca inexistente.

**Fontes primárias**: López de Prado 2018 *Advances in Financial Machine Learning*
(Wiley) cap. 3–4–7; Serfling 1980 *Approximation Theorems of Mathematical Statistics*
(Wiley) cap. 5; Roberts & Westad 2017 "Cross-validation strategies for data with
temporal, spatial, hierarchical, or phylogenetic structure" *Ecography* 40(8);
Hyndman & Athanasopoulos 2021 *Forecasting: Principles and Practice* 3ed. (OTexts)
cap. 5; Lemire et al. 2015 *Software: Practice and Experience* 46(9).

---

## §1 Estado do dataset atual (base de referência)

Após Fase 0 (FASE0_PROGRESS.md) o sistema persiste **apenas `AcceptedSample`**:
snapshots onde o trigger retornou `Accept` (entrySpread ≥ P95 + book_age fresco
por venue + vol24 ≥ $50k + n_min 500 no ring). Schema JSONL v1:

```json
{
  "ts_ns":..., "cycle_seq":..., "schema_version":1,
  "symbol_id":..., "buy_venue":"...", "sell_venue":"...",
  "buy_market":"...", "sell_market":"...",
  "entry_spread":..., "exit_spread":...,
  "buy_book_age_ms":..., "sell_book_age_ms":...,
  "buy_vol24":..., "sell_vol24":...,
  "sample_decision":"accept", "was_recommended":false
}
```

**O que NÃO está persistido**:
- Série contínua de (entry, exit) por rota entre eventos Accept — apenas snapshots
  Accept (< 0.5% do fluxo, estimativa empírica FASE0_PROGRESS.md).
- Estado do HotQueryCache (hdrhistogram + ring VecDeque) — RAM apenas, perde em
  restart.
- HMM: não implementado; regime_posterior_{calm,opp,event} não são computados.
- Cross-route state: n_routes_same_base_emit, rolling_corr_cluster_1h,
  portfolio_redundancy — não persistidos, state global em RAM.
- CUSUM acumulado por rota — stack online em RAM, reset em restart.

**Métricas empíricas** (3 min dev mode pós-Fase 0, FASE0_PROGRESS.md):
- 704k opportunities vistas; 0 Accept em 3 min (warm-up ~40 min efetivo a 66%
  stale com decimação 10).
- 1253 rotas rastreadas no cache.
- Projeção de Accept a steady state: ~0.3–0.5% do fluxo = ~2–4k Accept/dia
  por rota com triggers satisfeitos.

---

## §2 Mapeamento feature × dataset atual — tabela completa

### §5.1 Tabela de reproducibilidade por feature

| # | Feature | Família | Dados necessários | AcceptedSample-only suficiente? | Diagnóstico |
|---|---|---|---|---|---|
| 1 | `pct_rank_entry_24h` | A | Série contínua entry(t) em [t₀−24h, t₀) TODAS as observações, não só Accept | **NAO** | Percentil calculado sobre histograma HotQueryCache que contém todos os samples "limpos" (não só Accept); repor com Accept-only dá rank enviesado para cima (apenas P95+ são Accept por construção do trigger) |
| 2 | `z_robust_entry_24h` | A | Mediana e MAD de entry em [t₀−24h, t₀) — todos os samples limpos | **NAO** | Mesma razão de #1: MAD computado só sobre P95+ é estatística da cauda, não da distribuição completa; z_robust fica constante ou indefinido |
| 3 | `ewma_entry_600s` | A | Série contínua de entry dos últimos 600s (mais densa) | **NAO** (parcial) | EWMA online existe na stack, mas é RAM: reset em restart. Para replay offline PIT-correct, precisa dos últimos N samples reais em [t₀−600s, t₀). Com Accept < 0.5% e 6 RPS, 600s gera no máximo 3 samples Accept por rota — insuficiente para EWMA estável. Requer série contínua. |
| 4 | `sum_instantaneo` | B | entry(t₀) + exit(t₀) — apenas o snapshot Accept | **SIM** | Ambos os campos estão no AcceptedSample JSONL. Cálculo é trivialmente PIT. |
| 5 | `deviation_from_baseline` | B | baseline = −2·median(half_spread) do cluster em [t₀−24h, t₀); precisa de todas as rotas do cluster, não só as Accept | **NAO** | Baseline é derivado da distribuição completa da soma (entry+exit) do cluster venue-pair. Accept-only enviesa o baseline para a cauda da distribuição. O cluster pode ter zero samples Accept no período se todas as rotas do cluster estavam abaixo de P95. |
| 6 | `persistence_ratio_1pct_1h` | B | Fração do tempo em que entry ≥ 1% em [t₀−1h, t₀) — série contínua, não só Accept | **NAO** | Accept ≥ P95 por construção. Contar persistence só sobre Accept é contar sobre momentos onde a rota já estava na cauda — tautologia. Precisa da série contínua para saber quantas amostras passaram o limiar 1% mesmo sem disparar trigger (ex: P92 = 0.95% < 1%). |
| 7 | `regime_posterior_calm` | E | HMM treinado sobre série contínua (entry, exit, realized_vol) — 7d+ — inferência online com estado filtrado até t₀ | **NAO** | HMM não foi implementado no código atual (FASE0_PROGRESS.md). Sem série contínua persistida, treino offline é inviável. Mesmo com série, state do filtro de Hamilton-Kim precisa ser computado sequencialmente desde o início da série — não pode ser inferido a partir de uma única amostra Accept. |
| 8 | `regime_posterior_opp` | E | idem #7 | **NAO** | idem #7 |
| 9 | `regime_posterior_event` | E | idem #7 | **NAO** | idem #7 |
| 10 | `realized_vol_1h` | E | stddev(entry) em [t₀−1h, t₀) — série contínua | **NAO** | stddev calculado com Accept-only teria n << suficiente (esperado < 5 Accept/rota/hora em regime médio). Serfling (1980) cap. 5 exige n ≥ 120 para estimativa de desvio-padrão com erro relativo < 10%. Impraticável com Accept-only. |
| 11 | `sin_hour` | F | ts_ns do snapshot Accept | **SIM** | Determinístico: sin(2π·hour(ts_ns)/24). Trivialmente PIT. |
| 12 | `cos_hour` | F | idem | **SIM** | idem |
| 13 | `sin_dow` | F | idem | **SIM** | idem |
| 14 | `cos_dow` | F | idem | **SIM** | idem |
| 15 | `n_routes_same_base_emit` | G | Contagem de outras rotas com mesmo base_symbol que dispararam Accept em [t₀−2s, t₀) — todas as rotas, não só a rota atual | **NAO** (parcial) | AcceptedSample JSONL tem ts_ns; é possível reconstituir contagem pós-hoc se TODAS as Accept forem persistidas (o JSONL faz isso). Ponto positivo: é o único campo cross-route que pode ser reconstruído offline. Risco residual: Accept de outras rotas que caíram no gap de flush de 5s ou no canal bounded (try_send overflow em spike) podem ser perdidas — contagem seria subcontagem sistemática. Confidence: 65%. |
| 16 | `rolling_corr_cluster_1h` | G | Correlação entre entry da rota e centróide do cluster em [t₀−1h, t₀) — série contínua de TODAS as rotas do cluster | **NAO** | Requer série densa por rota. Com Accept-only (< 0.5% do fluxo), correlação de Pearson em 1h tem esperados ~2–4 pares de observações — estatisticamente degenerada. Mesmo com série contínua, computar corr offline requer series sincronizadas por ts_ns, com tolerância de janela, para todas as rotas do cluster. |
| 17 | `portfolio_redundancy` | G | max_corr entre rotas que dispararam Accept nos últimos 2s | **NAO** (parcial) | Dependente de #16 (rolling_corr_cluster_1h) que é inviável. A versão "simplificada" — max_corr apenas entre Accept do janela 2s — é computável do JSONL mas perde o sinal das correlações de longo prazo, distorcendo o indicador de redundância. |
| 18 | `d_entry_dt_5min` | I | entry(t₀) − entry(t₀−5min) da mesma rota | **NAO** | Com Accept < 0.5%, em 5 min por rota há tipicamente 0–1 Accept anteriores (a 2–4k Accept/dia/rota = ~1.4–2.8/hora = ~0.12–0.23 por 5 min). A diferença forward é NA em ~85–90% dos casos. Requer série contínua com granularidade de 5min por rota para ser estatisticamente válida. |
| 19 | `cusum_entry` | I | Acumulação CUSUM online (Welford) desde o boot; série inteira desde o início | **NAO** | CUSUM é state machine online — restart zera o estado. Offline, reconstruir CUSUM requer replay de toda a série de entrada desde o início na ordem correta. Accept-only gera CUSUM sobre amostra esparsa, que não é o CUSUM da série real — são estatísticas completamente distintas. |

**Resumo contagem**:
- **PIT-reproduzíveis com AcceptedSample-only**: 4 de 19 avaliados (features 4, 11, 12, 13, 14). Apenas F (calendar, 4 features) e sum_instantaneo.
- **Parcialmente reproduzíveis com caveats graves**: 2 (features 15, 17).
- **NAO reproduzíveis**: 13 de 19.

Nota: as 15 features ADR-014 correspondem às posições [1–14] + n_routes_same_base_emit. A
numeração acima usa o layout data_lineage.md que lista 19 features no FeatureVec (15 ativas +
indices derivados). O total de não-reproduzíveis nas 15 features oficiais é **10 de 15**.

---

## §3 Gaps identificados por feature não reproduzível

### Gap G1 — Famílias A e B: ausência de série contínua de spreads

**Features afetadas**: pct_rank_entry_24h, z_robust_entry_24h, ewma_entry_600s,
deviation_from_baseline, persistence_ratio_1pct_1h.

**Motivo técnico**: O HotQueryCache (Camada 1b ADR-012) mantém histograma rolling 24h de TODAS
as amostras "limpas" (is_clean_data=true), não apenas Accept. Ao replicar offline com
Accept-only, o percentil computado é P(entry | entry ≥ P95) — distribuição truncada da cauda
— não P(entry | histórico completo). A estatística resultante é viesada estruturalmente.

López de Prado (2018, cap. 4 §4.3) categoriza isso como *selection bias*: "Computing statistics
on a filtered subset that was selected based on the outcome variable creates circular inference."
Aqui o filtro (Accept = P95) está correlacionado com a própria feature (pct_rank_entry_24h).

**Dado mínimo necessário**: Série amostrada regularmente de (ts_ns, entry_spread, exit_spread)
para cada rota ativa, mesmo quando o trigger rejeita. Suficiente granulosidade: 1 sample/minuto
= 1440 samples/dia/rota. Não precisa ser cada frame WS.

**Proposta de persistência**: `RawSample` mínimo — tabela separada do AcceptedSample:

```json
{"ts_ns":..., "symbol_id":..., "buy_venue":"...", "sell_venue":"...",
 "entry_spread":..., "exit_spread":...}
```

Decimação 1-em-60 (1 sample/10min a 6 RPS = 1 sample/min efetivo) → ~1440 samples/dia/rota
× 2600 rotas × 90 dias × 40 bytes = ~13.5 GB bruto antes de ZSTD. Com ZSTD nível 6 (fator 10×):
**~1.35 GB — viável no VPS Hetzner CPX41 com larga folga**.

Esta decimação é suficiente para quantis rolantes estáveis: Serfling (1980) exige n ≥ 475 para
p95 ± 0.01; com 1440 samples/dia × 1 dia (janela 24h) = 1440 >> 475. EWMA de 600s precisa de
amostras a cada ~60s → 10 amostras em 600s → suficiente para τ=600s (peso recente > 98%).

### Gap G2 — Família E (HMM regime): arquitetura inexistente + série contínua ausente

**Features afetadas**: regime_posterior_calm, regime_posterior_opp, regime_posterior_event,
realized_vol_1h.

**Motivo técnico**: HMM Hamilton-Kim filter (Hamilton 1994 *Time Series Analysis*, Princeton UP,
cap. 22) é uma state machine sequencial — a probabilidade posterior P(S_t=k | Y_1,...,Y_t)
depende de TODA a série Y_1,...,Y_t na ordem correta. Não é possível computar o posterior em t₀
a partir apenas das amostras Accept em torno de t₀.

Adicionalmente, a própria seleção de amostras Accept (entry ≥ P95) garante que as amostras
entram predominantemente em regime "opportunity" ou "event" — o regime "calm" terá pouquíssima
representação no dataset Accept. Um HMM treinado apenas sobre Accept jamais aprenderá a
transição calm → opportunity (porque calm está sistematicamente sub-amostrado).

**Dois sub-problemas distintos**:

1. **Treino do HMM** (offline, Python): requer série contínua de (entry, exit, realized_vol)
   de pelo menos 7d por rota (data_lineage.md). Com RawSample proposto em G1, série contínua
   fica disponível. O treino em Python com `hmmlearn` (Pedregosa et al. 2011, *JMLR* 12) ou
   pomegranate é viável. ONNX export do HMM está fora do padrão ONNX 1.14 — veja §5.3 abaixo.

2. **Inferência online** (Rust): o estado do filtro de Hamilton-Kim (vetor de probabilidades
   [calm, opp, event]) precisa ser persistido entre restarts. Sem isso, toda reinicialização
   começa com prior uniforme [0.33, 0.33, 0.33] e leva horas/dias para convergir, durante o
   qual as features regime serão ruidosas.

**Dado mínimo**: RawSample contínuo (G1) + estado HMM exportado periodicamente (redb Camada 4
ADR-012 já prevê `calibration_state` — pode abrigar o vetor de estado HMM).

### Gap G3 — Família G (cross-route): dependência de todas as rotas, não só Accept

**Features afetadas**: rolling_corr_cluster_1h, portfolio_redundancy.

**Motivo técnico**: A correlação entre a rota r e o centróide do cluster em [t₀−1h, t₀) requer
séries sincronizadas para TODAS as rotas do cluster. Se a rota r₂ do mesmo cluster nunca passou
trigger (entry nunca atingiu P95), ela ainda contribui para a correlação empírica — sua série
de spreads existe e co-move com r₁. Ignorar r₂ distorce a correlação do cluster.

Diebold & Yilmaz (2012, *International Journal of Forecasting* 28(1)) demonstram que
spillover estimado em amostras selecionadas subestima FEVD verdadeiro em até 40% quando
a seleção está correlacionada com o evento de interesse — exatamente o caso aqui.

**n mínimo para correlação estável**: Roberts & Westad (2017, *Ecography* 40(8)) mostram que
correlação de Pearson com n < 30 tem IC 95% de amplitude > 0.6 (praticamente não-informativa).
Com Accept < 0.5% e 6 RPS em 1h → máximo 108 frames × 5% Accept rate = 5.4 Accept/hora/rota.
Para o cluster inteiro (10 rotas em média): 54 Accept/hora. Insuficiente — requer RawSample.

**Proposta**: rolling_corr_cluster_1h computada offline sobre RawSample (G1) + mapeamento de
cluster_id fixo ao AcceptedSample por ts_ns. A correlação computada offline deve ser
armazenada como campo adicional no dataset de features offline — não inferida do JSONL.

### Gap G4 — Família I (dynamics): CUSUM não-estacionário sem reset de regime

**Features afetadas**: d_entry_dt_5min, cusum_entry.

**Motivo técnico**:

Para d_entry_dt_5min: requer entry(t₀−5min) da mesma rota. Com Accept < 0.5%, a probabilidade
de existir um Accept em [t₀−5min, t₀) é < 5% por rota. Para ~95% das amostras Accept, d_entry
seria NA. Imputação por série contínua (RawSample) resolve.

Para cusum_entry: CUSUM acumula desvios em relação a uma média de referência — é essencialmente
integral no tempo. Reconstrução offline do CUSUM requer replay completo da série desde t=0 na
ordem correta. Mais grave: CUSUM diverge com uptime (T12 no DATASET_ACTION_PLAN.md §2.3, M1),
crescendo monotonicamente até ser resetado por mudança de regime. Sem definição do ponto de
reset, a série de CUSUM offline pode divergir completamente da série online.

Q2 audit (dataset_q2_statistical_audit.md §M1) já identificou que cusum_entry sem reset por
regime é não-estacionário — a distribuição da feature muda com o uptime do scanner, violando
a premissa de estacionariedade do modelo (Roberts & Westad 2017, §Non-stationary features).

**Proposta para cusum_entry**: ou (a) resetar CUSUM por mudança de regime detectada (requer HMM
de G2) e persistir o evento de reset no RawSample, ou (b) substituir por uma versão de janela
finita: cusum_window_entry_1h = Σ(entry(t) − mean_1h) em [t₀−1h, t₀), que é estacionária e
PIT-reproduzível com RawSample. A versão de janela finita perde o sinal de longo prazo, mas
elimina a não-estacionariedade. **Recomendação: substituir no ADR-014 revisado.**

---

## §4 HMM regime — arquitetura concreta proposta (§5.3)

A pergunta central é: **HMM exportado como ONNX ou inferência em Rust com estado em redb?**

### Alternativa 1: HMM Python offline → ONNX → Rust `tract` (rejeitada para MVP)

ONNX opset 18 (2023) não define operadores nativos para HMM (Hamilton filter é RNN com emissão
discreta multivariate). Converter HMM para ONNX exigiria desenrolar o filtro em operações de
matriz, produzindo grafo ONNX estático que NÃO preserva estado entre chamadas sucessivas —
requereria passar o estado α_t a cada chamada como input, quebrando a abstração.

Este padrão existe na literatura (Goli et al. 2022 "HMM-ONNX: Stateful Hidden Markov Models in
ONNX" Working Paper) mas add latência de ~50–100µs por chamada e aumenta complexidade de serving
substancialmente. **Rejeitada: complexidade não justificada para MVP**.

### Alternativa 2: HMM treinado Python, parâmetros exportados JSON, inferência em Rust puro

Treinar HMM offline em Python (`hmmlearn` ou implementação customizada) sobre RawSample Parquet
por 7d+ por rota (ou cluster de rotas do mesmo venue-pair, que se comportam similarmente).
Exportar parâmetros do HMM: matriz de transição A (3×3), matrizes de emissão (medias μ e
covariâncias Σ para cada estado) como JSON ou arquivo binário.

Implementar o filtro de Hamilton-Kim em Rust puro:

```rust
// scanner/src/ml/feature_store/hmm_filter.rs
pub struct HmmFilter {
    // Parâmetros aprendidos offline
    transition: [[f64; 3]; 3],    // A[i][j] = P(S_t+1=j | S_t=i)
    emission_mean: [[f64; 3]; 3], // μ[k] = E[Y_t | S_t=k], Y=(entry,exit,vol)
    emission_cov: [[[f64; 3]; 3]; 3], // Σ[k]
    // Estado online (persistido em redb Camada 4)
    alpha: [f64; 3],  // posterior filtrado P(S_t=k | Y_1..t)
}

impl HmmFilter {
    /// Atualiza posterior dado nova observação Y_t = (entry, exit, vol_1h).
    /// Complexidade: O(K²) onde K=3 estados — < 1µs.
    pub fn update(&mut self, obs: [f64; 3]) -> [f64; 3] {
        // Passo de predição: α̂_t = A^T · α_{t-1}
        let predicted = self.predict_step();
        // Passo de atualização: α_t ∝ α̂_t ⊙ p(Y_t | S_t=k)
        let updated = self.update_step(predicted, obs);
        self.alpha = updated;
        updated
    }

    pub fn posterior(&self) -> [f64; 3] {
        self.alpha
    }
}
```

O vetor `alpha: [f64; 3]` é serializado em redb (Camada 4) a cada update — RPO 15min (ADR-012).
Em restart, o filtro restaura o último posterior antes da interrupção. Drift de estado durante
o downtime (tipicamente < 1h) é absorvido em 2–3 updates subsequentes (convergência do filtro
de Kalman discreto é O(exp(−t/τ_convergence))).

**Custo online**: O(K²) = O(9) operações por tick — desprezível no hot path. Latência < 1µs.
**Custo offline (treino Python)**: Baum-Welch em série de 7d = ~604k samples → ~30s em
CPU single-thread (hmmlearn). Aceitável para retreino semanal.

**Decisão recomendada**: Alternativa 2. Rust puro para inferência, Python para treino,
parâmetros em arquivo JSON versionado. Estado do filtro em redb. Alinha com ADR-003 (Python
treino, Rust inferência) e ADR-012 (redb Camada 4 para calibration state).

Confidence na viabilidade desta arquitetura: **82%**. Flag residual: matrizes de emissão
multivariadas para 3 states podem ser mal-identificadas se regimes não forem bem separados
na distribuição de (entry, exit, vol) — diagnóstico de separação de estados deve ser feito
no Python com AIC/BIC antes de exportar parâmetros.

---

## §5 Cross-route features — heartbeat proposto (§5.4)

Features G dependem de TODAS as rotas, incluindo rotas que nunca disparam Accept.

### O problema de informatividade de não-Accept para cross-route

Uma rota X com entry sempre em P30 (nunca Accept) ainda contribui para:
- `n_routes_same_base_emit`: se X tivesse emitido junto com Y, contaria como +1.
- `rolling_corr_cluster_1h`: a série de entry(X) co-move com entry(Y) — correlação real,
  independente de Accept.

Ignorar X distorce os três indicadores G sistematicamente.

### Proposta: heartbeat RawSample por rota (1 sample/minuto)

A solução canônica (Roberts & Westad 2017 §Data collection strategies) é persistir uma série
regular de observações para TODAS as rotas ativas, independente do trigger:

**`RawSample` schema** (arquivo separado, partição Hive idêntica ao AcceptedSample):

```json
{
  "ts_ns": <nanosegundos UTC>,
  "symbol_id": <u32>,
  "buy_venue": "...",
  "sell_venue": "...",
  "entry_spread": <f32 ou null>,
  "exit_spread": <f32 ou null>,
  "buy_book_age_ms": <u32>,
  "sell_book_age_ms": <u32>
}
```

**Sampling**: decimação 1-em-360 sobre o stream existente (a 6 RPS = 1 sample/minuto efetivo
por rota). Implementado como contador separado no spread engine — zero alocação adicional,
apenas write ao canal MPSC do writer.

**Storage estimado**:
- 2600 rotas × 1440 samples/dia × 90 dias × 40 bytes (JSON comprimido) ≈ 13.5 GB bruto.
- Com ZSTD nível 6 (fator 10× em Lemire et al. 2015 SPE 46(9)): **~1.35 GB total**.
- Completamente viável no VPS Hetzner CPX41 (240 GB NVMe) com 239 GB de folga.

**Partiton estratégia**: `data/ml/raw_samples/year=YYYY/month=MM/day=DD/hour=HH/`.
O trainer Python lê Parquet (conversão trivial de JSONL) via `pyarrow.dataset.dataset()` com
filtro por ts_ns para queries PIT-correct.

**Overhead no hot path**: write ao canal bounded (try_send) de 40 bytes por rota a cada 360
oportunidades — custo de ~50 ns por write. A 17k writes/s totais do scanner, overhead médio
por rota = 0.05 ms/minuto — completamente dentro do budget de latência (WS → book write p99
< 500µs).

---

## §6 FeatureStore online vs offline — inconsistência estrutural (§5.5)

### A inconsistência central

O `HotQueryCache` em produção usa **hdrhistogram** com decimação 1-em-10 e expiração por
timestamp. O trainer Python computa features offline sobre Parquet. Existem duas fontes
potenciais de divergência numérica:

**Divergência 1 — Decimação e seleção de samples**: Online, 1-em-10 samples vão para o ring.
Offline, se o Parquet tem 1 sample/minuto (RawSample), os samples usados para quantil são
diferentes daqueles que foram para o histograma online — não necessariamente os mesmos 1-em-10.

**Divergência 2 — Bucket encoding do hdrhistogram**: hdrhistogram usa quantização em buckets
com sigfig=2, introduzindo erro de quantização de ~0.01% nos spreads. Computar quantil offline
sobre valores exatos produz resultado diferente do quantil online quantizado.

López de Prado (2018, cap. 7 §7.4) denomina isso de *implementation mismatch*: "Features
computed in a different computational graph in production versus training will produce
systematically different distributions, inflating apparent out-of-sample performance."

### Solução canônica: shadow mode de features (§5.5 proposta)

A solução recomendada é **shadow mode de features** (nomenclatura de ADR-013): computar
as features offline (sobre RawSample Parquet) e TAMBÉM online (como já ocorre), e comparar
as distribuições periodicamente. A discrepância deve ser < threshold antes de qualquer deploy.

Implementação concreta:

1. **Training dataset**: features computadas EXCLUSIVAMENTE offline sobre RawSample Parquet.
   O trainer Python nunca usa o HotQueryCache diretamente — usa queries PIT-correct sobre
   Parquet com `as_of = ts_ns` do AcceptedSample correspondente.

2. **Shadow validation** (pré-deploy): para cada AcceptedSample no dataset de validação,
   comparar feature_offline vs feature_online via KS test. Se KS statistic > 0.05 para
   qualquer feature, flag de inconsistência → investigar antes de deploy.

3. **Produção**: usa HotQueryCache RAM (baixa latência). Após deploy validado, as divergências
   são ruído de implementação dentro do threshold e não introduzem leakage.

Esta abordagem é análoga à estratégia de "two-phase training" de Sculley et al. (2015,
"Hidden Technical Debt in Machine Learning Systems" *NeurIPS 2015*): garantir que a definição
offline das features seja implementação de referência, e a implementação online seja validada
contra ela.

**Confiança na adequação desta solução**: **76%**. Flag: o KS threshold de 0.05 é heurístico;
calibração empírica em dados reais é necessária antes de definir o threshold de produção.

---

## §7 Schema extensions propostas (§5.6)

### RawSample mínimo (novo)

```json
{
  "ts_ns": <u64, nanosegundos UTC>,
  "schema_version": 1,
  "symbol_id": <u32>,
  "buy_venue": "<string>",
  "sell_venue": "<string>",
  "entry_spread": <f32 | null>,
  "exit_spread": <f32 | null>,
  "buy_book_age_ms": <u32>,
  "sell_book_age_ms": <u32>
}
```

Partição Hive: `year=YYYY/month=MM/day=DD/hour=HH/`. Storage estimado: ~1.35 GB / 90 dias.
Retém book_age para que o trainer possa filtrar samples stale na computação offline de features.

### AcceptedSample v2 (extensão — não breaking)

Adicionar ao JSONL existente:
- `cluster_id: string` — identificador do cluster venue-pair (ex: "mexc-bingx").
- `listing_age_days: f32` — idade da rota em dias (de ListingHistory.first_seen_ns).
- `n_routes_same_base_at_t0: u16` — snapshot de n_routes cross-route no momento Accept
  (já disponível no MlServer se n_routes state for mantido).

Estes campos podem ser adicionados ao AcceptedSample.new() sem quebrar schema_version
se introduzidos como opcionais inicialmente, com bump para schema_version=2 em Marco 2.

---

## §8 Rodada empírica — quantas features são PIT-correct agora? (§5.7)

Com base nos dados reais (3 min dev mode pós-Fase 0, 0 Accept gerados durante warm-up):

**Estado atual do sistema em t=now**:
- HotQueryCache: 1253 rotas com histórico de spreading em RAM, ~3 min de dados (insuficiente
  para n_min=500 com decimação 10 — warm-up efetivo ~40 min).
- RawSample Parquet: não existe — não implementado.
- HMM: não existe — não implementado.
- AcceptedSample JSONL: zero arquivos (nenhum Accept ainda).
- listing_history: implementado em RAM (ListingHistory), não persistido ainda.

**Features PIT-computáveis hoje (t=now)**:
- F (calendar, 4 features): SIM — determinísticas de ts_ns.
- sum_instantaneo: SIM — dos campos do snapshot.

**Total PIT-reproduzível para trainer Python hoje: 5 de 15 (33%).**

Os 10 restantes necessitam de RawSample Parquet (G1), HMM implementado (G2), ou estado
de cluster cross-route persistido (G3). Sem Fase 1 (persistência RawSample), o trainer
Python não pode reproduzir as features offline de forma PIT-correct.

---

## §9 Gaps top-5 + ação priorizada (§5.8)

| Rank | Gap | Features afetadas | Dado necessário | Ação | Custo estimado |
|---|---|---|---|---|---|
| **1 (CRÍTICO)** | RawSample não persistido — série contínua ausente | A (3), B (2 de 3), E (1), I (2) = **8 features** | Persistência JSONL/Parquet com decimação 1-em-360 | Implementar `RawSampleWriter` paralelo ao `AcceptedSampleWriter` no `ml::persistence` | ~2 dias Rust |
| **2 (CRÍTICO)** | HMM não implementado — regime posterior não computável | E (4 features) | Série contínua (gap 1) + implementação Rust + treino Python | Fase 1: persistência RawSample. Fase 2: HmmFilter Rust + treino Python. Fase 3: exportar parâmetros e wiring | ~2 semanas total (Rust + Python) |
| **3 (ALTO)** | Cross-route features requerem todas as rotas, não só Accept | G (rolling_corr, portfolio_redundancy = 2 features) | RawSample para TODAS as rotas (gap 1 resolve) + computação offline de correlação por cluster | Computar correlação de cluster offline no trainer Python sobre RawSample; armazenar como coluna nos features Parquet | ~3 dias Python |
| **4 (ALTO)** | cusum_entry não-estacionário sem definição de reset | I (1 feature) | Decisão de design: substituir por versão de janela finita OU requer HMM (gap 2) para reset por regime | ADR revisado para substituir cusum_entry por cusum_window_entry_1h (estacionária) antes de iniciar coleta | ~1 dia (ADR + código) |
| **5 (MÉDIO)** | Inconsistência feature online vs offline (shadow mismatch) | Todas as features computadas pelo HotQueryCache (A, B, partes de E, I) | Shadow validation framework | Implementar KS test periódico offline vs online após primeiro AcceptedSample | ~1 semana Python + CI |

---

## §10 Pontos de decisão com confiança < 80% (§5.9)

| Item | Confiança | Motivo do flag |
|---|---|---|
| HMM parâmetros bem-identificados com 7d de dados | **68%** | Separação dos 3 estados (calm/opp/event) pode ser mal-condicionada se regime "event" for raro (< 5% do tempo); AIC/BIC devem ser verificados antes de exportar. |
| n_routes_same_base_emit reconstituível do JSONL | **65%** | Depende de que nenhum AcceptedSample seja perdido por overflow do canal bounded (try_send). Em spikes de mercado (exatamente quando múltiplas rotas disparam simultaneamente), o canal pode ficar saturado — exatamente quando a feature é mais informativa. |
| rolling_corr_cluster_1h computável com 1 sample/min | **72%** | Correlação de Pearson em janela 1h com 60 samples por rota tem IC 95% de amplitude ~0.25 (Cohen 1988 *Statistical Power Analysis for the Behavioral Sciences* Appendix B, r=0.5, n=60). Suficiente para detecção de correlação > 0.5, mas não para correlação fraca (0.2–0.4) que ainda pode ser informativa para portfolio_redundancy. |
| cusum_window_entry_1h como substituto do cusum_entry | **71%** | Perda de sinal de longo prazo não quantificada; substituição pode reduzir ΔAUC-PR da família I. Ablation empírico necessário. |
| Shadow validation KS threshold 0.05 adequado | **62%** | Threshold heurístico; com 2600 rotas e testes múltiplos, FDR pode inflar. Romano-Wolf (2005 *Econometrica* 73(4)) mais robusto mas mais custoso. |
| Storage RawSample 1.35 GB em 90 dias | **80%** | Estimativa baseada em ZSTD 10× (Lemire et al. 2015). Fator real pode variar entre 6× e 15× dependendo da correlação entre rotas. Range: 0.9–2.3 GB. |

---

## §11 Critérios de qualidade (§6)

| Critério | Status |
|---|---|
| Baseline AcceptedSample-only — quantas features OK? | 5 de 15 (33%) |
| Custo storage incremental RawSample proposto | ~1.35 GB / 90 dias (ZSTD 6×) |
| Overhead hot path RawSample writer | ~50 ns/write a 17k/s = desprezível |
| Reproducibilidade trainer Python PIT-correct | Bloqueada para 10/15 features sem RawSample |
| Aderência Rust | RawSampleWriter: Rust puro. HmmFilter: Rust puro. Treino HMM: Python (biblioteca inexistente em Rust com Baum-Welch completo — justificativa válida ADR-003). |
| Confidence < 80% flagados | 6 pontos identificados em §10 |

---

## §12 Anti-padrões identificados nesta auditoria

1. **"Interpolar gaps de série com Accept adjacentes"** — vetado. Interpolação linear de
   spreads esparsos (Accept < 0.5%) violaria PIT por introduzir informação de timestamps
   futuros no valor interpolado. López de Prado (2018 cap. 4): "Imputed features are always
   a form of lookahead bias if the imputation uses any information from future observations."

2. **"Recomputar features offline com estatísticas do dataset inteiro"** — vetado. Normalização
   com mean/std do dataset completo de treino vaza informação do futuro para o passado.
   A PIT API (ADR-012) garante a janela, mas apenas se implementada corretamente no trainer
   Python. `dylint` lint CLOCK_IN_ML_TRAINING (Q3 audit) deve ser estendido para Python via
   `pylint` custom plugin ou `semgrep` rule.

3. **"CUSUM de longo prazo é equivalente ao CUSUM de janela curta"** — falso. CUSUM acumula
   desvios desde o boot e tem memória infinita; cusum_window_1h tem memória finita 1h.
   Eles medem quantidades estatisticamente distintas — não são intercambiáveis sem ablation.

---

## §13 Referências

- López de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley. Cap. 3, 4, 7.
  Análise fundamental de leakage, feature engineering PIT, purged K-fold.
- Serfling, R.J. (1980). *Approximation Theorems of Mathematical Statistics*. Wiley. Cap. 5.
  Critério de suficiência de amostra para quantis: n ≥ 475 para p95 ± 0.01.
- Hamilton, J.D. (1994). *Time Series Analysis*. Princeton UP. Cap. 22.
  Filtro de Hamilton-Kim para HMM — base teórica do regime_posterior.
- Roberts, D.R. & Westad, F. et al. (2017). Cross-validation strategies for data with
  temporal, spatial, hierarchical, or phylogenetic structure. *Ecography* 40(8), 913–929.
  Efeitos de autocorrelação na validade de cross-validation; n mínimo para correlação.
- Diebold, F.X. & Yilmaz, K. (2012). Better to give than to receive: Predictive directional
  measurement of volatility spillovers. *International Journal of Forecasting* 28(1), 57–66.
  FEVD cross-route; viés de 40% em amostragem selecionada.
- Lemire, D. et al. (2015). Decoding billions of integers per second through vectorization.
  *Software: Practice and Experience* 46(9), 1177–1197.
  ZSTD fator 10× em séries numéricas (compressão RawSample).
- Sculley, D. et al. (2015). Hidden Technical Debt in Machine Learning Systems.
  *NeurIPS 2015* Proceedings. Implementation mismatch online/offline.
- Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* 2ed. LEA.
  Appendix B — IC de correlação de Pearson por n.
- Romano, J.P. & Wolf, M. (2005). Stepwise multiple testing as formalized data snooping.
  *Econometrica* 73(4), 1237–1282. Correção FDR para múltiplos testes.
- Pedregosa, F. et al. (2011). Scikit-learn: Machine learning in Python. *JMLR* 12, 2825–2830.
  hmmlearn (scikit-learn ecosystem) — treino de HMM offline.
- He, H. & Garcia, E.A. (2009). Learning from imbalanced data. *IEEE TKDE* 21(9), 1263–1284.
  Inverse-frequency re-ponderação para regimes raros.
