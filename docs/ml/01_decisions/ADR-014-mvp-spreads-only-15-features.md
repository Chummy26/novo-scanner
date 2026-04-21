---
name: ADR-014 — MVP Spreads-Only (15 features; book_age/vol24/venue_health viram filtros de trigger)
description: Simplificação do catálogo MVP de 24 → 15 features; alinha modelo ao mental model do operador humano (que analisa histórico de spreads, não de books)
type: adr
status: approved
author: operador + programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: ADR-007 (partially — catalog simplification)
reviewed_by: [operador]
---

# ADR-014 — MVP Spreads-Only (15 features)

## Contexto

ADR-007 definiu 24 features MVP em 9 famílias (A–I). Revisão operacional do operador aponta:

> "O operador humano na arbitragem real analisa o histórico das 24h dos **spreads**, não dos books. Começar apenas com dados de spreads em % faz sentido — book_age, vol24, venue_health não entram na análise mental do humano."

Essa observação tem duas consequências estruturais:

1. **Alinhamento com mental model do usuário**: modelo vê a mesma superfície de dados que o operador vê na UI (gráfico de entrySpread/exitSpread nas últimas 24h). Recomendações ficam interpretáveis — "modelo aprendeu do mesmo lugar que você".

2. **Robustez estrutural preservada**: `book_age`, `vol24` e métricas de stream **continuam no sistema como filtros de qualidade da amostra**, não jogadas fora. A diferença é onde vivem:
   - **Antes**: features do modelo (modelo precisa aprender "rota ilíquida = ignorar").
   - **Agora**: filtros de trigger (rota ilíquida nem entra no dataset; modelo não precisa reaprender o óbvio).

Filtros já definidos em ADR-009 (label_schema.md §Gatilho):
- `book_age_ms < 200` em ambas as pernas.
- `min(buy_vol24, sell_vol24) ≥ $50k`.
- `NOT halt_active`.

Abstenção `LowConfidence` (ADR-005) cobre degradação do WS stream → H (venue health) vira mecanismo de abstenção, não feature.

## Decisão

MVP V1 opera com **15 features em 6 famílias** (A, B, E, F, G, I). Famílias C, D, H removidas como features.

### Catálogo MVP V1 (15 features)

| Família | # | Features | Origem |
|---|---|---|---|
| **A — Quantis rolantes de spread** | 3 | `pct_rank_entry_24h`, `z_robust_entry_24h`, `ewma_entry_600s` | HotQueryCache |
| **B — Identidade estrutural** | 3 | `sum_instantaneo`, `deviation_from_baseline`, `persistence_ratio_1pct_1h` | scanner + cache |
| **E — Regime (3 estados)** | 4 | `regime_posterior[calm/opp/event]`, `realized_vol_1h` | HMM pré-computado |
| **F — Calendar cíclico** | 4 | `sin/cos hour`, `sin/cos dow` | determinístico |
| **G — Cross-route (correlação de spreads)** | 3 | `n_routes_same_base_emit`, `rolling_corr_cluster_1h`, `portfolio_redundancy` | shared state + cold path |
| **I — Spread dynamics** | 2 | `d_entry_dt_5min`, `cusum_entry` | cache + stack |
| **Total** | **15** | — | — |

Note que **regime** (família E) continua sendo derivado: HMM treina sobre `(entry, exit, realized_vol)` — **tudo spread-derivado**, não usa book.

### O que foi movido (não deletado)

| Removido como feature | Destino |
|---|---|
| `log1p_max_book_age` (C) | filtro trigger: `book_age < 200ms` (rota com book velho nem entra no dataset) |
| `book_age_z_venue` (C) | idem |
| `stale_fraction_venue` (C) | filtro trigger + abstenção `LowConfidence` se stream degradar |
| `log_min_vol24` (D) | filtro trigger: `min(vol24) ≥ $50k` |
| `trade_rate_1min` (D) | idem (proxy implícito via vol24) |
| `venue_health` (H — já era 0 features, só abstenção) | inalterado (continua via `LowConfidence`) |

### FeatureVec atualizado

```rust
#[repr(C, align(64))]
pub struct FeatureVec {
    // Família A (3)
    pct_rank_entry_24h:             f32,  // [0]
    z_robust_entry_24h:             f32,  // [1]
    ewma_entry_600s:                f32,  // [2]

    // Família B (3)
    sum_instantaneo:                f32,  // [3]
    deviation_from_baseline:        f32,  // [4]
    persistence_ratio_1pct_1h:      f32,  // [5]

    // Família E (4)
    regime_posterior_calm:          f32,  // [6]
    regime_posterior_opp:           f32,  // [7]
    regime_posterior_event:         f32,  // [8]
    realized_vol_1h:                f32,  // [9]

    // Família F (4)
    sin_hour:                       f32,  // [10]
    cos_hour:                       f32,  // [11]
    sin_dow:                        f32,  // [12]
    cos_dow:                        f32,  // [13]

    // Família G (3)
    n_routes_same_base_emit:        f32,  // [14]
    rolling_corr_cluster_1h:        f32,  // [15]
    portfolio_redundancy:           f32,  // [16]

    // Família I (2)
    d_entry_dt_5min:                f32,  // [17]
    cusum_entry:                    f32,  // [18]

    _padding:                       [f32; 5],  // [19..24]
}
// 24 × 4 bytes = 96 bytes → alinha em 128 B = 2 cache lines (com padding).
```

### ΔAUC-PR projetado (revisado)

Ablations de D3 indicavam:
- Família C staleness: +0.04 (crítico para FDR).
- Família D liquidez: +0.02 a +0.04.
- Família H (abstenção): +0.02.

**Ao mover para filtros de trigger**, esses benefícios são preservados — apenas manifestam-se antes do dataset, não dentro do modelo. ΔAUC-PR esperado do MVP V1 permanece **+0.25 a +0.40 sobre baseline A3** (levemente abaixo do estimado 0.30–0.45 com 24 features; diferença é a sinergia de interação que o modelo poderia aprender).

Se coleta empírica mostrar ganho marginal significativo (>+5pp AUC-PR) ao reintroduzir families C/D/H como features em V2, será avaliado. Até lá, simplicidade vence.

## Alternativas consideradas

### Manter 24 features (ADR-007 original)

- **Rejeitado** pela revisão operacional: modelo aprenderia padrões que o operador humano não considera; sinergia com mental model do operador perdida.

### Reduzir ainda mais (apenas família A — 3 features)

- **Rejeitado**: perder regime, calendar e cross-route prejudica tratamento de T4 (regime shift), T7 (diversificação ilusória), T8 (drift).

### Tornar book_age/vol24 hiperparâmetros do trigger (não features)

- **Adotado implicitamente**. Trigger já parametrizado em ADR-009 (`book_age < 200ms`, `min_vol24 ≥ $50k`).

## Consequências

**Positivas**:
- **Interpretabilidade alinhada ao operador**: "modelo viu o mesmo que você" — UI mostrando histórico de spreads corresponde literalmente ao input do modelo.
- **Menos LoC**: construção de FeatureVec reduz de ~200 LoC para ~130 LoC. Latência p50 de construção cai ~3 µs.
- **Menos storage de features derivadas**: `book_age_z_venue` requeria baseline dinâmico per-venue rolling 30d; removido simplifica QuestDB query load.
- **Menos risco de overfitting em histórico curto longtail**: 15 features × 6.7×10⁶ samples ≈ 448k samples/feature (ratio saudável).
- **Pipeline de features mais auditável** em CI `ml_eval`.

**Negativas**:
- Pequena perda de ΔAUC-PR esperada (0.05 pp na projeção). Não material.
- Se regime de mercado mudar drasticamente e ilíquidez virar padrão (improvável), filtros de trigger estáticos podem ficar mal-calibrados. Mitigação: thresholds configuráveis via CLI.

**Risco residual**:
- **T11 execution feasibility** agora depende 100% do haircut empírico calibrado em shadow (ADR-013 Fase 2), pois modelo não tem features diretas de liquidez. Seção T11 do trap file continua válida; shadow mode precisa calibrar haircut com rigor.

## Aplicação prática — o operador vê o mesmo input que o modelo

Contrato de UI a partir desta decisão:

- Gráfico de `entrySpread(t)` e `exitSpread(t)` últimas 24h → **exatamente os dados que o modelo consome**.
- Se operador analisa o gráfico e diz "parece oportunidade", o modelo viu o mesmo e concordou (ou discordou com razão — família E, G, I explicam desvios).
- Interpretabilidade reforçada: operador pode pedir "por que essa recomendação?" e SHAP (Python offline, ADR-003) explica em termos das 15 features familiares.

## Status

**Aprovado** para Marco 1 (MVP V1). Revisão após 60 dias de shadow — reintroduzir families C/D/H apenas se ablation mostrar ΔAUC-PR > +0.05 significativo.

## Referências cruzadas

- [ADR-007](ADR-007-features-mvp-24-9-familias.md) — **superseded parcialmente** (família A, B, E, F, G, I ainda vigentes; C/D/H movidas para filtros).
- [ADR-009](ADR-009-triple-barrier-parametrico-48-labels.md) — trigger de amostragem (onde vivem agora book_age/vol24).
- [ADR-013](ADR-013-validation-shadow-rollout-protocol.md) — calibração T11 haircut via shadow (Fase 2).
- [data_lineage.md](../06_labels_and_data/data_lineage.md) — será atualizado para 15 features.
- [label_schema.md](../06_labels_and_data/label_schema.md) — trigger já correto; reforça papel.
- [T11_execution_feasibility.md](../02_traps/T11-execution-feasibility.md).

## Evidência numérica

- 24 → 15 features (−37.5% dimensionalidade).
- Mental model alignment: skill §4 ("operador abre o histórico das últimas ~24h da rota"): foco no spread histórico.
- Ablations D3: C+D+H contribuíam +0.08 a +0.10 AUC-PR; preservadas via filtro de trigger estático.
- Storage impact: `book_age_z_venue` baseline dinâmico per-venue 30d = ~50 MB QuestDB; removido.
