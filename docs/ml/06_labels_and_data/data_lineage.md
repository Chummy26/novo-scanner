---
name: Data Lineage — 15 Features MVP (Spreads-Only)
description: Mapeamento feature-by-feature de origem, janela de cálculo, fonte e verificação anti-leakage; alinhado com ADR-014 MVP spreads-only
type: spec
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 2.0.0
supersedes: v1.0.0 (24 features com C/D/H)
---

# Data Lineage — 15 Features MVP (Spreads-Only)

Contrato de rastreamento por feature do modelo A2. **Baseado em ADR-014** — MVP spreads-only.

Famílias C (book_age), D (vol24) e H (venue_health) **movidas para filtros de trigger** (ADR-009 label_schema.md §Gatilho), não removidas do sistema.

## Princípios

1. **Todo cálculo é point-in-time**: janela fechada-aberta `[as_of − window, as_of)`. `as_of` nunca é `now()` em código de treino; `dylint` CI rejeita (ADR-012).
2. **Nenhuma estatística global**: features normalizadas usam stats **históricas até `as_of`**, nunca stats do dataset inteiro.
3. **Cross-route features** respeitam PIT — agregações sobre outras rotas também usam apenas `< as_of`.
4. **Input é SPREADS only**: família E (regime), G (cross-route), I (dynamics) derivam de `entry` e `exit` spreads. Nenhuma feature usa book_age, vol24 ou trade_rate diretamente (estão nos filtros de trigger).
5. **Fonte de dados**: scanner WS (stack existente) ou feature store (ADR-012).

## FeatureVec layout atualizado (MVP V1 — 15 features)

```rust
#[repr(C, align(64))]
pub struct FeatureVec {
    // Família A — Quantis rolantes de spread (3)
    pct_rank_entry_24h:             f32,  // [0]
    z_robust_entry_24h:             f32,  // [1]
    ewma_entry_600s:                f32,  // [2]

    // Família B — Identidade estrutural (3)
    sum_instantaneo:                f32,  // [3]
    deviation_from_baseline:        f32,  // [4]
    persistence_ratio_1pct_1h:      f32,  // [5]

    // Família E — Regime 3 estados + vol (4)
    regime_posterior_calm:          f32,  // [6]
    regime_posterior_opp:           f32,  // [7]
    regime_posterior_event:         f32,  // [8]
    realized_vol_1h:                f32,  // [9]

    // Família F — Calendar cíclico (4)
    sin_hour:                       f32,  // [10]
    cos_hour:                       f32,  // [11]
    sin_dow:                        f32,  // [12]
    cos_dow:                        f32,  // [13]

    // Família G — Cross-route correlação de spreads (3)
    n_routes_same_base_emit:        f32,  // [14]
    rolling_corr_cluster_1h:        f32,  // [15]
    portfolio_redundancy:           f32,  // [16]

    // Família I — Spread dynamics (2)
    d_entry_dt_5min:                f32,  // [17]
    cusum_entry:                    f32,  // [18]

    _padding:                       [f32; 5],  // [19..24]
}
// 15 features + 5 padding = 20 × 4 bytes = 80 bytes → cabe em 128 B = 2 cache lines.
```

## Tabela de lineage (15 features MVP)

| # | Feature | Fórmula | Fonte | Janela | PIT guard |
|---|---|---|---|---|---|
| 1 | `pct_rank_entry_24h` | percentile_rank(entry(t), entry[t−24h, t)) | HotQueryCache (hdrhistogram per-rota) | 24h configurável | `as_of − 24h` até `as_of` aberto-fim |
| 2 | `z_robust_entry_24h` | (entry − median_24h) / (1.4826·MAD_24h) | HotQueryCache | 24h | idem |
| 3 | `ewma_entry_600s` | Welford EWMA τ=600s | hot path scanner (stack existente) | 600s | online, nunca vê futuro |
| 4 | `sum_instantaneo` | entry(t) + exit(t) | scanner snapshot `t=t₀` | instantâneo | trivial |
| 5 | `deviation_from_baseline` | sum_inst − (−2·median(half_spread_cluster)) | scanner + HotQueryCache | 24h | `−2·median` do cluster até `as_of` |
| 6 | `persistence_ratio_1pct_1h` | fraction(time entry ≥ 1% em [as_of−1h, as_of)) | HotQueryCache | 1h | fechado-aberto |
| 7–9 | `regime_posterior_{calm,opp,event}` | HMM 3-state Hamilton-Kim filter sobre (entry, exit, realized_vol) | feature_store pré-computado a cada 60s | 7d treino + online inference | `< as_of` |
| 10 | `realized_vol_1h` | stddev(entry) em [as_of−1h, as_of) | HotQueryCache | 1h | fechado-aberto |
| 11–12 | `sin_hour`, `cos_hour` | sin/cos(2π · hour(as_of) / 24) | determinístico | instantâneo | trivial |
| 13–14 | `sin_dow`, `cos_dow` | sin/cos(2π · dow(as_of) / 7) | determinístico | instantâneo | trivial |
| 15 | `n_routes_same_base_emit` | count(outras rotas com mesma base_symbol emitindo em [as_of−2s, as_of)) | scanner shared state | 2s | self-loop excluído explicitamente |
| 16 | `rolling_corr_cluster_1h` | corr(entry_rota, entry_cluster_centroid) em [as_of−1h, as_of) | feature_store pré-computado a cada 60s | 1h | `< as_of` |
| 17 | `portfolio_redundancy` | max_corr_among(rotas emitindo últimos 2s) | scanner + `rolling_corr` | 2s | depende de #16 |
| 18 | `d_entry_dt_5min` | (entry(t) − entry(t−5min)) / 5min | HotQueryCache | 5min lookback | `t − 5min` a `t` |
| 19 | `cusum_entry` | CUSUM sobre entry (stack existente) | hot path scanner | online | online |

## Filtros de trigger (onde vivem agora book_age / vol24 / venue_health)

Conforme **ADR-009 label_schema.md §Gatilho** + **ADR-014**:

```
entrySpread(t₀) ≥ P95(rota, 24h rolling)          -- top 5% distribuição recente
AND buy_book_age_ms < 200                          -- book fresco (antes era feature C)
AND sell_book_age_ms < 200
AND min(buy_vol24, sell_vol24) ≥ $50k              -- liquidez mínima (antes era feature D)
AND NOT halt_active                                 -- venue operacional
```

Amostra só entra no dataset do modelo se passa o filtro. Modelo **não precisa aprender** "rota ilíquida = ignorar"; rotas ilíquidas nem chegam ao modelo.

**Abstenção `LowConfidence` (ADR-005)** cobre degradação de stream WS em tempo real (antes era família H).

## Verificação anti-T9

### Shuffling temporal test

```python
# Em CI (pytest):
def test_no_temporal_leakage_per_feature():
    df = build_dataset(target='lbl_m10_s10_t4h')
    baseline_score = train_and_eval(df)

    df_shuffled = df.copy()
    df_shuffled['label'] = df_shuffled['label'].sample(frac=1).reset_index(drop=True)
    shuffled_score = train_and_eval(df_shuffled)

    # Se shuffling preserva ≥ 50% da performance, leakage provável
    assert shuffled_score < 0.5 * baseline_score, \
        f"leakage suspected: shuffled={shuffled_score:.3f} vs orig={baseline_score:.3f}"
```

### Feature-by-feature AST audit (crate `ml_eval`)

```rust
fn audit_feature_code(feature_name: &str, code: &str) -> Result<()> {
    let ast = syn::parse_file(code)?;
    let forbidden_patterns = [
        r"arr\[i\+\d+\]",                 // forward index
        r"\.mean\(\)",                    // global mean sem scope
        r"\.max\(\)",                     // global max
        r"\.rolling\(.*future.*\)",       // explicit future window
        r"now\(\)",                       // clock leakage in training
    ];
    for pattern in forbidden_patterns {
        if regex::Regex::new(pattern)?.is_match(code) {
            bail!("feature {} uses forbidden pattern {}", feature_name, pattern);
        }
    }
    Ok(())
}
```

Executado em PR que toca código de features → bloqueia merge.

### Feature #15 (`n_routes_same_base_emit`) atenção especial

Esta feature olha **outras rotas simultâneas**. Risco: self-loop (contar a própria rota `r`).

```rust
fn n_routes_same_base_emit(rota: RotaId, as_of: Timestamp) -> f32 {
    let base = rota.base_symbol();
    let window_start = as_of - Duration::from_millis(2000);
    // CRITICAL: excluir a própria rota
    shared_state.count_recent_emissions(base, window_start, as_of, exclude=rota)
}
```

Teste unitário obrigatório: emissão de apenas `rota` → feature retorna 0.

## Atualização (quando feature é adicionada/removida/modificada)

Pull request que toca feature precisa:

1. Atualizar esta tabela.
2. CHANGELOG do `ml_eval` crate.
3. Invalidar modelos treinados antes — `model.features_hash` deve mudar.
4. Rebuild completo dos datasets de treino a partir de raw storage.
5. Atualizar ADR-014 (ou criar novo ADR se mudança material).

## Storage de feature values (ADR-012)

- **Hot path inference**: `FeatureVec` construído on-demand a partir de scanner snapshot + HotQueryCache; não persistido (recomputa a cada ciclo 150 ms).
- **Training dataset**: construído a partir de QuestDB + Parquet archival; snapshot Parquet per-experimento em `04_experiments/<run_id>/features.parquet`.
- **Versioning**: `features_schema_version` no Parquet metadata; bump SemVer se schema muda.

## Referências

- [ADR-014](../01_decisions/ADR-014-mvp-spreads-only-15-features.md) — simplificação 24 → 15 features.
- [ADR-007](../01_decisions/ADR-007-features-mvp-24-9-familias.md) — versão original com 24 features (superseded parcialmente).
- [ADR-009](../01_decisions/ADR-009-triple-barrier-parametrico-48-labels.md) — trigger de amostragem.
- [ADR-012](../01_decisions/ADR-012-feature-store-hibrido-4-camadas.md) — PIT API + storage.
- [D03_features.md](../00_research/D03_features.md) — pesquisa completa.
- [label_schema.md](label_schema.md).
- [purged_cv_protocol.md](purged_cv_protocol.md).
