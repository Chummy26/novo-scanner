---
name: ADR-016 — Refinamento do Contrato de Output (corrige ADR-015 pós-investigação Q1/Q2/Q3)
description: Incorpora correções dos 3 agentes PhD (microestrutura Q1, distributional ML Q2, UX Q3); corrige bug crítico da decomposição multiplicativa de P(realize); acrescenta flag de toxicidade, cluster de correlação, quantis empíricos e scoring rules explícitas; define layout UI em 3 camadas
type: adr
status: approved
author: operador + programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: ADR-015 (corrige M2 crítico e refina M1, M3, M4 + emendas microestruturais + layout UX)
reviewed_by: [phd-q1-microstructure-output, phd-q2-distributional-ml-output, phd-q3-ux-decision-output, operador]
---

# ADR-016 — Refinamento do Contrato de Output

## Contexto

Operador (CLAUDE.md §Objetivo) levantou ponto crítico:

> "Se o modelo entrega enter em X e saia em Y, pode ser valor muito específico — por poucos % pode não acontecer... a soma dá um lucro bruto variável... isso varia... o ponto mais crítico e mais importante do modelo."

ADR-015 foi a primeira resposta (thresholds + distribuição 5 quantis + P decomposto). Investigação subsequente com 3 agentes PhD independentes (**Q1 microestrutura, Q2 distributional ML, Q3 UX**) identificou:

1. **Bug crítico em ADR-015 M2** (Q2): decomposição `P(realize) = p_enter_hit × p_exit_hit_given_enter` **contradiz ADR-008** (G unificado). Correlação −0.93 invalida independência; decomposição é matematicamente inconsistente.
2. **Emendas microestruturais** (Q1): toxicidade de cauda, clusters correlacionados, simetria de horizonte, exit condicional V2.
3. **Representação distribucional refinada** (Q2): p10/p90 empíricos em vez de `min` determinístico; scoring rules explícitas; CRPS offline.
4. **Layout UI hierárquico** (Q3): struct ADR-015 correto, layout flat errado; F-UX5 em 3 camadas.

**Os 3 agentes endossam a intuição central de ADR-015 (thresholds + distribuição).** Este ADR consolida as correções.

## Decisão

### Correção 1 — `P(realize)` via CDF de G unificado (Q2 M2 CRÍTICA)

```rust
// ❌ ANTES (ADR-015, bugado):
// realization_probability = p_enter_hit × p_exit_hit_given_enter

// ✅ AGORA (ADR-016, correto):
// realization_probability = P(G(t,t') ≥ floor_operador | features, t₀)
//                         — derivado DIRETAMENTE da CDF prevista do modelo G unificado (ADR-008).
```

**Por que**: ADR-008 existe exatamente para evitar decomposição multiplicativa sob correlação forte; ADR-015 caiu nesse erro. A probabilidade de realização é a probabilidade de que **exista** `t₁ ∈ (t₀, t₀+T_max]` com `G(t₀, t₁) ≥ floor`, computada diretamente pelo classifier calibrated pós-CQR sobre G.

**`p_enter_hit`** e **`p_exit_hit_given_enter`** permanecem reportados como **sinais táticos informativos** na UI — operador vê ambos como diagnóstico, não como insumos do cálculo de `P(realize)`.

### Correção 2 — Quantis empíricos verificáveis (Q2 M1)

Substituir `gross_profit_min` (determinístico = enter_min + exit_min) por **quantis empíricos da distribuição prevista de G**:

| Antes ADR-015 | Agora ADR-016 |
|---|---|
| `gross_profit_min = enter_at_min + exit_at_min` (determinístico) | `gross_profit_p10` (quantil empírico do modelo G) |
| — | `gross_profit_p90` (novo — IC 80% simétrico p10–p90) |
| `gross_profit_p25, median, p75, p95` | `gross_profit_p25, median, p75, p95` (mantém) |

**Por que**: Kolassa (2016 *IJF* 32(3)) — quantis empíricos são diretamente verificáveis por operador com ~10 trades; `min` determinístico sugere "pior caso garantido" quando é apenas "pior caso plausível com coverage ~90%".

### Correção 3 — Scoring rules explícitas (Q2 M3)

Treino declara:
- **Quantile regressor sobre G**: pinball loss (Gneiting & Raftery 2007 *JASA* 102(477) Theorem 8 — estritamente própria para quantis).
- **Classifier `P(realize)`**: log loss (Theorem 1 — estritamente própria para probabilidades).
- **Avaliação offline**: **CRPS** sobre distribuição completa (Gneiting & Raftery 2007 §3.3 — fecha gap de "ótimo em quantis específicos, errado entre eles"; Dawid 1984 *JRSS-A* 147).

Implementação CRPS em Rust: ~40 LoC, O(N log N) offline — não impacta hot path.

### Correção 4 — Emendas microestruturais (Q1)

**E1. `fade_above_p97` / `toxicity_flag`** — rotula região da cauda direita como potencialmente tóxica:

```rust
pub enum ToxicityLevel {
    Healthy,      // cauda normal — pico é oportunidade legítima
    Suspicious,   // book_age alto em uma perna, staleness possível
    Toxic,        // staleness confirmada OU outage OU spike de 1 único sample
}
```

Fundamentação: Foucault, Kozhan & Tham (2017 *RFS* 30(4)) — toxic arbitrage. Operador vê pico p95 = 2.80% MAS flag Suspicious → não correr atrás.

**E2. `cluster_id` + `cluster_size`** — previne interpretação errada de N setups correlacionados como N oportunidades independentes:

```rust
pub cluster_id:    Option<u32>,   // None se rota isolada; Some(id) se clusterizada
pub cluster_size:  u8,            // # rotas no cluster (1 se isolada)
pub cluster_rank:  u8,            // ranking desta rota dentro do cluster (1=melhor)
```

Fundamentação: Diebold-Yilmaz (2012 *IJF* 28) spillover; D02 §5.5 FEVD >70% em eventos. UI mostra "1 de 5 rotas correlacionadas BTC-*; executar 1 é suficiente".

**E3. `horizon_p05_s`** — simétrico a `horizon_p95_s`:

```rust
pub horizon_p05_s:    u32,   // pior caso rápido: oportunidade some em X segundos
pub horizon_median_s: u32,
pub horizon_p95_s:    u32,   // pior caso longo (já existia)
```

Fundamentação: first-passage time distribution em processos de saltos tem skew (Kou 2002 *Management Science* 48); p05 informa urgência tática.

**E4. `exit_refined` condicional — V2, não MVP** (Q1 F6):

V2 adicionará `fn exit_refined(actual_enter_price: f32) -> ExitRecommendation` que ajusta `exit_at_min` dada a entrada realizada. Ganho esperado 10–25% (Leung & Li 2015 *IJTAF* 18(3)). **Postergar para V2** — MVP com thresholds estáticos suficiente.

### Correção 5 — Layout UI em 3 camadas (Q3 F-UX5)

Struct TradeSetup **backend inalterado**. Apenas a camada de apresentação UI implementa F-UX5:

**Camada 1 (sempre visível — 3 chunks Cowan 2001):**
```
┌─ BP mexc:FUT → bingx:FUT ── [●] ELIGIBLE ─────┐
│  Agora: 1.95%  min: 1.80%  (+0.15% acima min) │
│  Lucro típico: ~1.0%  (entre 0.6% e 2.8%)     │
│  Probabilidade: 77/100  Horizonte: ~28 min     │
│  Razão: [tendência] regime dispersão + cauda  │
│  [ENTRAR AGORA]    [VER DETALHES]  [IGNORAR]  │
└────────────────────────────────────────────────┘
```

**Camada 2 (drill-down — distribuição completa):**
```
┌─ DETALHES ──────────────────────────────────────┐
│  ENTRADA                                        │
│    Mínimo ≥ 1.80%  Típico 2.00%  Pico 2.80%     │
│    P(aparecer mínimo): 90/100                   │
│  SAÍDA (após entrada)                           │
│    Mínimo ≤ −1.20%  Típico −1.00%               │
│    P(aparecer | entrou): 85/100                 │
│  LUCRO BRUTO                                    │
│    p10 0.60% | p25 0.70% | p50 1.00%            │
│    p75 1.50% | p90 2.30% | p95 2.80% (raro)     │
│    IC 95% sobre P(realize): [70/100, 82/100]    │
│    Horizonte: p05 12 min | p50 28 min | p95 1h40│
│  Cluster: 1 de 5 rotas BTC-* (ranking #1)       │
│  Toxicidade cauda: Saudável                     │
└──────────────────────────────────────────────────┘
```

**Camada 3 (overlay no gráfico 24h do operador):**
- Linha horizontal verde tracejada: `enter_at_min = 1.80%`.
- Linha horizontal laranja tracejada: `exit_at_min = −1.20%`.
- Ponto indicador do spread atual se move em tempo real.
- Banda sombreada entre p50 e p75 = "zona típica de captura".

### Princípios de apresentação (Q3 aprovados)

- **Atualização visual ≤ 2 Hz** (não 150 ms backend). Hirshleifer, Lim & Teoh (2009 *JoF* 64(5)): flickering degrada reação.
- **`P` em frequência natural** "77/100", não "P = 0.77" (Gigerenzer & Hoffrage 1995 *Psych Review* 102(4)).
- **Três estados estáticos** de tier: `SEM SINAL`, `ELIGIBLE`, `PICO IMINENTE`. Sem animação.
- **`enter_typical` na camada 2**, não camada 1: evita anchoring (Tversky & Kahneman 1974 *Science* 185).
- **Reason como 1 linha + ícone categorial** (4 tipos). Sem SHAP na UI — offline apenas.
- **NÃO exibir percentil pós-trade individual** (Fenton-O'Creevy et al. 2003 *JOOP* 76(1) illusion of control). Agregado de calibração OK.
- **Controle de modificação** no botão ENTRAR: operador pode ajustar valor antes de confirmar (Dietvorst, Simmons & Massey 2018 *Management Science* 64(3)) — elimina tanto aversion quanto appreciation excessivo.
- **Badge calibration_status**: `OK` / `DEGRADADA` / `SUSPEITA`. Se DEGRADADA ou SUSPEITA, P exibido como "? / 100".

## Struct final Rust

```rust
pub struct TradeSetup {
    pub route_id:            RouteId,

    // Regra de entrada
    pub enter_at_min:        f32,
    pub enter_typical:       f32,
    pub enter_peak_p95:      f32,
    pub p_enter_hit:         f32,   // TATICAL, NÃO entra em P(realize)

    // Regra de saída
    pub exit_at_min:         f32,
    pub exit_typical:        f32,
    pub p_exit_hit_given_enter: f32, // TATICAL, NÃO entra em P(realize)

    // Lucro bruto — quantis EMPÍRICOS do modelo G (não min determinístico)
    pub gross_profit_p10:    f32,
    pub gross_profit_p25:    f32,
    pub gross_profit_median: f32,
    pub gross_profit_p75:    f32,
    pub gross_profit_p90:    f32,
    pub gross_profit_p95:    f32,

    // P(realize) via CDF de G — NÃO decomposição multiplicativa
    pub realization_probability: f32,
    pub confidence_interval:     (f32, f32),

    // Horizonte com quantis simétricos
    pub horizon_p05_s:       u32,   // NOVO
    pub horizon_median_s:    u32,
    pub horizon_p95_s:       u32,

    // Microestrutura
    pub toxicity_level:      ToxicityLevel,   // NOVO
    pub cluster_id:          Option<u32>,     // NOVO
    pub cluster_size:        u8,              // NOVO
    pub cluster_rank:        u8,              // NOVO

    // Haircut (D10)
    pub haircut_predicted:   f32,
    pub gross_profit_realizable_median: f32,

    // Status da calibração
    pub calibration_status:  CalibStatus,     // NOVO

    // Metadata
    pub reason:              TradeReason,
    pub model_version:       semver::Version,
    pub emitted_at:          Timestamp,
    pub valid_until:         Timestamp,
}

pub enum ToxicityLevel { Healthy, Suspicious, Toxic }
pub enum CalibStatus { Ok, Degraded, Suspended }
```

## Consequências

**Positivas:**
- Consistência matemática com ADR-008 (G unificado): elimina o bug de decomposição multiplicativa.
- Quantis empíricos p10/p25/p50/p75/p90/p95 são verificáveis diretamente pelo operador.
- Scoring rules explícitas garantem convergência teórica.
- CRPS offline fecha gap de qualidade distribucional.
- Toxicidade + cluster previnem dois modos de falha operacional (pegar pico tóxico, executar cluster redundante).
- Horizon p05 informa urgência tática.
- Layout UI em camadas respeita cognição humana sem sacrificar informação.

**Negativas:**
- Struct cresce de ~160 B para ~200 B. Irrelevante (fora do hot path do scanner).
- Treino adiciona CRPS offline como métrica — ~40 LoC Rust.
- Classifier adicional para `P(realize)` direto (em vez de decomposição) — mesma arquitetura A2, apenas head adicional.

**Risco residual:**
- Calibração do classifier direto pode diferir empiricamente da multiplicação marginal sob certos regimes — monitorar ECE split por método nos primeiros 30 dias de shadow.
- Toxicity detector (Suspicious/Toxic) exige calibração empírica; no MVP usar regra simples `book_age > 500 ms OU vol24 < threshold` → Suspicious; refinar com ML V2.

## Pontos em aberto (confiança <80%, agregados dos 3 agentes)

| # | Ponto | Conf | Origem |
|---|---|---|---|
| 1 | `gross_profit_p10` vs `p5` como threshold inferior (Q2 M1) | 55% | Q2 — simulação dados reais |
| 2 | Adaptive conformal γ sob H~0.8 (garantia formal) | 65% | Q2 |
| 3 | Bimodalidade distribuição G em regime event (6 quantis suficientes?) | 70% | Q2 |
| 4 | "77/100" vs "P=0.77" para operador cripto sofisticado | 65% | Q3 — testar em sessão |
| 5 | Overlay gráfico 24h (Few não peer-reviewed) | 72% | Q3 |
| 6 | `fade_above_p97` threshold empírico — simples regra vs ML | 70% | Q1 |
| 7 | `exit_refined` condicional ganho 10–25% em longtail cripto | 75% | Q1 — postergar V2 |

## Status

**Aprovado**. Supersede ADR-015 em pontos M1 (p10/p90), M2 (P via CDF G, CRÍTICO), M3 (scoring rules explícitas), M4 (CRPS offline), + emendas microestruturais Q1 + layout UX Q3.

ADR-015 permanece referência histórica; seu struct inicial guiou a investigação mas o struct final é este.

## Referências cruzadas

- [D11_microstructure_output.md](../00_research/D11_microstructure_output.md) — Q1.
- [D12_distributional_ml_output.md](../00_research/D12_distributional_ml_output.md) — Q2.
- [D13_ux_decision_support.md](../00_research/D13_ux_decision_support.md) — Q3.
- [ADR-015](ADR-015-output-thresholds-e-distribuicao-lucro.md) — versão anterior (parcialmente superseded).
- [ADR-008](ADR-008-joint-forecasting-unified-variable.md) — G(t,t') unified é a base do cálculo correto de P(realize).
- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — arquitetura A2 (acomoda head adicional do classifier P(realize) direto).
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — CQR calibra a CDF de G.

## Evidência numérica

- Decomposição multiplicativa sob ρ=−0.93: ADR-008 §evidência — marginais independentes inflam P otimisticamente.
- Pinball loss própria para quantis (Gneiting & Raftery 2007 Theorem 8); log loss própria para probabilidades (Theorem 1).
- CRPS implementação O(N log N) — ~40 LoC Rust (Gneiting & Raftery 2007 §3.3).
- Quantis p10/p90 IC 80% verificável com n≥10 trades (Kolassa 2016 *IJF* 32(3)).
- Foucault, Kozhan & Tham 2017 *RFS* 30(4) toxic arbitrage.
- Diebold-Yilmaz 2012 *IJF* 28 spillover; D02 §5.5 >70% em eventos.
- Kou 2002 *Management Science* 48 first-passage jumps.
- Leung & Li 2015 *IJTAF* 18(3) exit refinado 10–25% ganho.
- Gigerenzer & Hoffrage 1995 *Psych Review* 102(4) frequências naturais 3× melhores.
- Cowan 2001 *BBS* 24(1) 3–4 slots memory items relacionais.
- Hirshleifer, Lim & Teoh 2009 *JoF* 64(5) distração.
- Tversky & Kahneman 1974 *Science* 185 anchoring.
- Dietvorst, Simmons & Massey 2018 *Management Science* 64(3) controle percebido.
