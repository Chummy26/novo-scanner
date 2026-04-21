---
name: Q3 Auditoria Dataset — Leakage & Contamination
description: Auditoria PhD financial ML de vetores de leakage e contaminação no pipeline de dataset
type: audit
status: draft
author: phd-dataset-q3-leakage
date: 2026-04-20
version: 0.1.0
---

# Q3 — Auditoria de Leakage & Contamination

**Postura**: leakage é presumido presente até prova de ausência. Cada vetor recebe pelo menos três métodos de auditoria candidatos. Red-team explícito após cada seção. Confiança < 80% é flagada.

---

## §5.1 Matriz de Leakage — 12 Vetores × Detectabilidade

| # | Vetor | Detectável por teste automático? | Método A | Método B | Método C | Status no design atual |
|---|---|---|---|---|---|---|
| 1 | Future in features (`arr[i+k]`) | SIM — AST via `syn 2.x` | Regex `arr\[i\+\d+\]` em AST IdentExpr | `dylint` lint custom em módulos `#[ml_training]` | Canary feature sintética lendo `t₀+1` (teste runtime) | Parcialmente coberto: `dylint` proposto em ADR-012 mas **não implementado no MVP** |
| 2 | Forward z-score (mean/std com futuro) | SIM — AST + runtime | AST: detectar `mean()` / `std()` sem guard `< t₀` | PIT API `quantile_at(as_of)` por construção bloqueia | Canary z-score global vs local — desempenho deve divergir >50% | Coberto pela PIT API em design; HotQueryCache usa histograma acumulativo — **leakage de warm-up presente** (ver §5.8) |
| 3 | Global dataset stats (mean/min/max sem guard) | SIM — AST + static analysis | Blacklist de `df.mean()` / `.std()` sem `filter t < t₀` | Dataset shuffle: stats globais não mudam, performance deve cair | `dylint` rejeita `polars::Series::mean()` fora de janela temporal | **Não implementado**; Python pipeline ainda não existe; risco latente para Marco 2 |
| 4 | Random train/test split (viola autocorr) | SIM — inspeção de código + performance test | Assert `sorted(train_t0) < min(test_t0)` antes de treinar | Performance com shuffle temporal deve cair ≥ 50% (ADR-006 teste 1) | Log timestamps dos índices de cada fold — deve ser estritamente crescente | Design cobre via purged walk-forward; **implementação Python ainda não escrita** |
| 5 | Label overlap (triple-barrier sliding window) | PARCIAL — verificação empírica | Calcular fração de overlap entre labels adjacentes: `overlap(i, i+1) = T_max / (t_{i+1} − t_i + T_max)` | Purge verification: zero pares train/test com window overlap (ADR-006 teste 4) | Heatmap de overlap cross-amostras para visualização | Endereçado por purge em ADR-006; **fração de overlap não calculada empiricamente ainda** — flag |
| 6 | Purge/embargo insuficiente | PARCIAL — cálculo analítico + runtime | Calcular `autocorr(h)` empírica e verificar `embargo ≥ h_90%` (onde autocorr < 0.05) | Assert: `min(test_t0) − max(train_t0) ≥ embargo` para todo par fold | Randomization test: embaralhar apenas embargo e medir mudança de performance | **Embargo = 2·T_max aprovado mas H~0.8 implica que para T_max=24h, embargo=48h pode ser insuficiente** — ver §5.3 |
| 7 | Multiple testing inflation (DSR/FDR) | PARCIAL — estatístico | BH FDR < 10% sobre p-values individuais por (label, modelo) | DSR > 2.0 calculado para cada configuração | Romano-Wolf stepwise para tail-sensitive correction | Design prevê em ADR-006; **720 hipóteses exige implementação correta** — ver §5.9 |
| 8 | Feedback loop T12 (`was_recommended`) | PARCIAL — ECE split semanal | ECE_recommended vs ECE_not_recommended — divergência > 0.03 aciona revisão | Hold-out 5% rotas sem recomendações como grupo controle | ADWIN sobre resíduo de calibração por rota (ADR-011) | Design prevê em ADR-011/ADR-013; **MVP V1 não tem `was_recommended` flag no schema** — lacuna crítica |
| 9 | Cross-route spillover (info futura via correlação) | DIFÍCIL — não detectável por AST | Calcular lag-correlation entre rotas: `corr(A_t, B_{t+k})` para todos k > 0 | PIT obrigatória em `rolling_corr_cluster_1h` — janela `[t₀−1h, t₀)` exclusiva | Granger causality reversa: testar se `B_{t+k}` Granger-causa `A_t` | **Vetor indetectável por análise estática — ver §5.5** |
| 10 | Survivorship bias (rotas delistadas) | PARCIAL — schema check | `listing_history.parquet` deve conter `active_until` para rotas delistadas | Backtest filtra por `active_from ≤ t₀ ≤ active_until` antes de carregar features | Audit: dataset atual deve ter ao menos N% de rotas com `active_until < now()` | `listing_history.parquet` mencionado em ADR-006 mas **schema não definido e arquivo não existe** — ver §5.6 |
| 11 | Regime shift entre folds | PARCIAL — análise de distribuição | Calcular distribuição de regime por fold; KL-divergência entre folds deve ser < threshold | Estratificar por regime dentro de cada fold | Reportar métricas por regime dentro de cada fold (não apenas global) | Design menciona o risco em ADR-006; **estratificação por regime não implementada** — ver §5.7 |
| 12 | Clock leakage (`now_ns()` em treino) | SIM — `dylint` + AST | `dylint` lint rejeita `SystemTime::now()` em módulos marcados `#[ml_training]` | Trait `TimeSource` injetável: `Real` (produção) vs `Replay(as_of)` (treino) | Runtime assert: `as_of` nunca excede timestamp do snapshot sendo processado | `now_ns` é parâmetro em `on_opportunity` — **correto na assinatura, mas `HotQueryCache` usa `now_ns` para `last_update_ns` apenas, não para janelas temporais** — risco moderado |

**Red-team — vetores indetectáveis por teste automatizado**:
1. **Cross-route spillover por lag implícito** (vetor 9): feature computada sobre janela `[t₀−1h, t₀)` de rota B pode refletir estado futuro de rota A com delay −5min se autocorrelação cruzada A↔B tem lead/lag estrutural. Nenhum teste AST detecta isso.
2. **Global normalization implícita via partial pooling** (James-Stein em ADR-007): se o prior `cluster_prior` for recalculado com dados do futuro no momento de retreino, o prior carrega leakage implícito.
3. **Regime shift gradual não detectado por K-fold temporal**: se a fronteira train/test cai exatamente numa transição de regime calmo→evento, ambos os lados têm distribuições incomparáveis, e não existe teste automático que detecte que o split foi "azarado".
4. **Leakage via hiperparâmetros**: se os hyperparâmetros do modelo (p. ex., `floor_pct = 0.8`) foram escolhidos olhando o período inteiro de dados (incluindo test), o modelo efetivamente usa informação futura via os hyperparâmetros — mesmo que nenhuma feature olhe para frente.

---

## §5.2 Audit Automático em Rust CI — M1.6 Implementação Concreta

ADR-006 propõe 5 testes bloqueantes no crate `ml_eval`. Auditoria de viabilidade:

### Teste 1 — Shuffling temporal (proposto: factível, implementação simples)

Viável. Implantação: reordenar aleatoriamente os timestamps dos labels mantendo features fixas; medir queda de AUC-PR. Se queda < 50%, leakage presente.

```rust
// ml_eval/src/leakage/temporal_shuffle.rs
pub fn temporal_shuffle_test(
    features: &Array2<f32>,   // [N, 15]
    labels: &Array1<i8>,      // [N]
    ts: &Array1<i64>,         // timestamps em ns
    model: &dyn Classifier,
    rng: &mut impl Rng,
) -> ShuffleTestResult {
    let auc_original = evaluate_auc(features, labels, model);
    let mut shuffled_labels = labels.to_owned();
    shuffled_labels.as_slice_mut().unwrap().shuffle(rng);
    let auc_shuffled = evaluate_auc(features, &shuffled_labels, model);
    let ratio = auc_shuffled / auc_original;
    ShuffleTestResult {
        auc_original,
        auc_shuffled,
        ratio,
        leakage_flag: ratio > 0.50,
    }
}
```

**Cobertura**: vetores 3, 4, 5. Não cobre 1, 2, 6, 9, 10, 11, 12.

### Teste 2 — AST Feature Audit via `syn 2.x` (proposto: factível, cobertura parcial)

Viável para padrões explícitos. Implementação concreta:

```rust
// ml_eval/src/leakage/ast_audit.rs
use syn::{visit::Visit, Expr, ExprIndex};

pub struct ForwardLookAuditor {
    pub violations: Vec<AstViolation>,
}

impl<'ast> Visit<'ast> for ForwardLookAuditor {
    fn visit_expr_index(&mut self, node: &'ast ExprIndex) {
        // Detecta padrões: arr[i + k], arr[i + 1], slice[idx + offset]
        if let Expr::Binary(bin) = node.index.as_ref() {
            if matches!(bin.op, syn::BinOp::Add(_)) {
                self.violations.push(AstViolation {
                    kind: ViolationKind::ForwardIndex,
                    span: format!("{:?}", node.bracket_token.span),
                });
            }
        }
        syn::visit::visit_expr_index(self, node);
    }

    fn visit_macro(&mut self, node: &'ast syn::Macro) {
        // Detecta now(), SystemTime::now(), Instant::now()
        let path_str = node.path.segments.iter()
            .map(|s| s.ident.to_string())
            .collect::<Vec<_>>()
            .join("::");
        if path_str.contains("now") {
            self.violations.push(AstViolation {
                kind: ViolationKind::ClockCall,
                span: format!("{:?}", node.path.segments.first().unwrap().ident.span()),
            });
        }
        syn::visit::visit_macro(self, node);
    }
}
```

**Limitação crítica**: proc-macros expandem antes de `syn` ver o AST. Código gerado por macro (p. ex., `derive`, `serde`) não é auditado. Confiança 65% na cobertura total do vetor 1 via AST puro.

**`dylint` lint customizado** (mais robusto):

```toml
# Cargo.toml do crate dylint customizado
[package]
name = "scanner_ml_lints"
[lib]
crate-type = ["cdylib"]
[dependencies]
dylint_linting = "3"
```

```rust
// src/lib.rs — lint rejeita SystemTime::now() em módulos #[ml_training]
declare_lint! {
    pub CLOCK_IN_TRAINING,
    Deny,
    "SystemTime::now() is forbidden in #[ml_training] modules"
}
// Registrar via dylint_library!()
```

**Cobertura**: vetores 1, 2 (parcial), 12.

### Teste 3 — Dataset-wide statistics flag (proposto: factível)

```rust
// ml_eval/src/leakage/global_stats_audit.rs
// Verifica que nenhuma coluna do dataset tem variância zero (sinal de normalização global)
// e que stats não mudam quando período de teste é excluído
pub fn global_stats_contamination_test(
    train_features: &Array2<f32>,
    full_features: &Array2<f32>,  // train + test
) -> GlobalStatsResult {
    let train_means = train_features.mean_axis(Axis(0)).unwrap();
    let full_means = full_features.mean_axis(Axis(0)).unwrap();
    // Se médias diferem > 1% entre train e full, normalização usou o dataset inteiro
    let contamination = (train_means - full_means).mapv(f32::abs).mean().unwrap();
    GlobalStatsResult {
        mean_contamination: contamination,
        flag: contamination > 0.01,
    }
}
```

**Cobertura**: vetor 3. Custo: < 1s por fold.

### Teste 4 — Purge Verification (proposto: factível e crítico)

```rust
// ml_eval/src/leakage/purge_verify.rs
pub fn purge_verification_test(
    train_t0: &[i64],      // timestamps ns do conjunto de treino
    test_t0: &[i64],       // timestamps ns do conjunto de teste
    t_max_ns: i64,         // duração da janela de label
    embargo_ns: i64,       // = 2 * t_max_ns
) -> PurgeResult {
    let mut overlap_pairs = 0usize;
    for &train_ts in train_t0 {
        let train_label_end = train_ts + t_max_ns;
        for &test_ts in test_t0 {
            let test_label_end = test_ts + t_max_ns;
            // Overlap se janelas se intersectam
            if train_ts < test_label_end && train_label_end > test_ts {
                overlap_pairs += 1;
            }
        }
    }
    PurgeResult {
        overlap_pairs,
        flag: overlap_pairs > 0,
    }
}
```

**Cobertura**: vetores 5, 6. Tempo de execução: O(N²) por fold — para N=1.1×10⁶ amostras é inviável ingênuo. Otimizar com `sort + binary search` para O(N log N).

### Teste 5 — Canary Forward-Looking (proposto: factível)

```rust
// ml_eval/src/leakage/canary.rs
// Injeta feature sintética que é o label futuro (t₀+1)
// Pipeline de features deve rejeitar ou performance deve ser perfeita (sinal de leakage)
pub fn canary_forward_test(
    labels: &Array1<i8>,
    features: &Array2<f32>,
    model: &dyn Classifier,
) -> CanaryResult {
    // Feature canary = label com ruído 5%
    let n = labels.len();
    let canary: Vec<f32> = labels.iter().map(|&l| l as f32 + rand::thread_rng().gen_range(-0.05..0.05)).collect();
    // Se AUC com canary ≈ 1.0, pipeline aceita informação futura
    let mut feat_with_canary = features.to_owned();
    feat_with_canary.column_mut(0).assign(&Array1::from(canary));
    let auc = evaluate_auc(&feat_with_canary, labels, model);
    CanaryResult {
        auc_with_canary: auc,
        leakage_flag: auc > 0.95,
    }
}
```

**Cobertura**: vetor 1 (runtime). Custo: desprezível.

### Lacunas dos 5 testes propostos

Os 5 testes cobrem vetores: 1(parcial), 2(parcial), 3, 4, 5, 6, 12(parcial). **Vetores NÃO cobertos**: 7 (multiple testing — é pós-treinamento), 8 (feedback loop — é operacional), 9 (cross-route spillover — requer lag analysis), 10 (survivorship — requer schema check), 11 (regime shift — requer distribuição de regimes por fold).

**Testes adicionais propostos para M1.6**:
- Teste 6: lag-correlation entre rotas (vetor 9) — `corr(A_t, B_{t+k})` para k ∈ {1..12} × 5min.
- Teste 7: schema check de `listing_history.parquet` (vetor 10) — assert N_delistadas > 0.
- Teste 8: KL-divergência de regime entre folds (vetor 11) — threshold KL < 0.5 nat.
- Teste 9: fold timestamp monotonicity assert (vetor 4) — O(N).

**Custo CI estimado dos 9 testes**: < 4 minutos para N=6.7×10⁶ amostras em máquina CI padrão. Detalhe: purge verification O(N log N) é o gargalo (~90s para 1.1×10⁶/fold).

---

## §5.3 Purged K-Fold + Embargo — Verificação do Protocolo

### Embargo suficiente para H ~ 0.8?

Para processo fracionalmente integrado com Hurst H, a autocorrelação de lag k é:
`ρ(k) ∝ k^{2H−2}` (Lo 1991 *Econometrica* 59(5)).

Para H = 0.80: `ρ(1h) ≈ 1^{−0.4} = 1.0` (normalizado), `ρ(k)` decai como k^{−0.4}. A autocorrelação atinge 0.05 quando `k ≈ (0.05)^{1/(2H−2)} = (0.05)^{−1.67} ≈ 126` unidades de tempo.

**Se unidade = 5min (tick padrão)**: autocorr < 0.05 em `≈ 126 × 5min = 630min ≈ 10.5h`.

Para `T_max = 30min`: embargo aprovado = 1h. Autocorrelação residual em 1h ≈ `(12)^{−0.4} ≈ 0.40` — **substancialmente não-zero**.

**Conclusão**: embargo = 2·T_max é insuficiente para H = 0.80 quando T_max = 30min. O embargo mínimo teoricamente correto seria ≈ 10.5h para todos os valores de T_max. Para T_max = 24h (embargo = 48h), a situação é mais confortável: autocorr em 48h para H=0.80 ≈ `(576)^{−0.4} ≈ 0.11` — ainda não negligível.

**Proposta**: para T_max ≤ 4h, usar embargo mínimo de 12h (já está no `MIN_GAP_HOURS = max(embargo, 12h)` — este parâmetro é o que salva o design). Verificar que `min_gap = 12h` está sendo aplicado corretamente no pseudocódigo de `purged_cv_protocol.md`. Confiança na adequação do embargo: **70%** — flag.

### Purge de labels sobrepostos com 48 configs de triple-barrier

Para 48 configs, cada sample `t₀` tem 48 label windows de comprimentos diferentes (T_max ∈ {30min, 4h, 24h}). Purge deve ser aplicado para o `T_max` **máximo da config selecionada**, não para a média.

**Risco específico**: se modelo é treinado em config `meta=0.3%, stop=None, T_max=30min` com embargo=1h, mas o dataset inclui samples de outras configs com T_max=24h que não foram purgadas corretamente para a janela de 24h, há leakage cruzado entre configs.

**Proposta**: purge deve usar `max(T_max_utilizado)` por batch de treinamento, não o T_max da config individual. Implementar verificação em `purge_verification_test()` com `t_max_ns = max_t_max_ns_all_configs`.

### CPCV — Vale implementar?

Bailey et al. 2014 (*J Computational Finance* 20(4)) demonstram que CPCV com K=6, n_splits=4 (15 combinações) reduz Probability of Backtest Overfitting de ~35% (K-fold simples) para ~8% em datasets financeiros de tamanho comparável.

Para 720 hipóteses (48 labels × 5 baselines × 3 perfis), a combinação CPCV + BH FDR é a única estratégia que oferece controle formal de PBO. Custo: 15× o custo de um único fold — no nosso setup, ≈ 15 × 30min = 7.5h. Aceitável como validação pré-deploy uma vez. **Recomendação: implementar CPCV para Marco 3 (validação final), não para CI iterativo.**

---

## §5.4 T12 Feedback Loop — Auditoria do Protocolo

ADR-011 e ADR-013 propõem: `was_recommended` flag + buffer 2·T_max + hold-out 5% rotas + auditoria ECE semanal.

**Lacuna 1 — Schema MVP não inclui `was_recommended`**: o schema atual em `label_schema.md` não tem coluna `was_recommended` na tabela de labels ou de execuções. O campo precisa existir no schema de Parquet antes de qualquer dado ser coletado.

**Lacuna 2 — Buffer 2·T_max não é suficiente para spillover**: Avellaneda & Lee 2010 (*Quantitative Finance* 10(7)) demonstram que trades de stat arb em mercados de baixa liquidez podem afetar preços por até 5·T_max. Para rotas longtail, o buffer deveria ser conservadoramente 5·T_max nas primeiras semanas até calibração empírica do impacto.

**Lacuna 3 — ECE split apenas semanal é tarde**: com T_max = 30min e 5 trades/dia, em 7 dias há apenas 35 amostras de feedback. ECE instável com N < 100. Proposta: auditoria de feedback diária com janela rolante 14d para estabilidade estatística.

**Lacuna 4 — Hold-out 5% rotas insuficiente para detectar feedback diluído**: se feedback é distribuído em 40% das rotas (cada com share < 5%), o grupo controle de 5% é demasiado pequeno para detectar o efeito agregado. Proposta: group controle estratificado por volume (vol24h decil).

**O que está correto**: o threshold de 15% por rota para desativar ML (ADR-013) é conservador e adequado. A lógica de exclusão de amostras `was_recommended=true` do retreino é metodologicamente sólida (Lopez de Prado 2018 cap. 3.6).

---

## §5.5 Cross-Route Spillover como Leakage — Auditoria

Feature `rolling_corr_cluster_1h` (família G) calcula correlação entre rotas na janela `[t₀−1h, t₀)`. O problema não é a janela em si, mas a **estrutura de lag implícita** da autocorrelação cruzada.

**Mecanismo de leakage**: se rota B tem autocorrelação cruzada com rota A na lag de +5min (B lidera A), então `corr(A[t₀−1h:t₀], B[t₀−1h:t₀])` está correlacionado com `A[t₀:t₀+5min]` — informação futura de A.

**Quantificação**: para FEVD cross-route > 70% (D2) e autocorrelação H~0.8, a janela de "contaminação efetiva" pode chegar a 15–30min de informação futura implícita.

**Protocolo de auditoria de PIT para cross-route**:

```python
# Auditoria de lag-correlation entre rotas
def audit_cross_route_pit(spreads_df, lag_minutes_list=[5, 10, 15, 30, 60]):
    """
    Para cada par de rotas (A, B), calcula corr(A_t, B_{t+k}) para k > 0.
    Se corr significativa para k > 0, feature rolling_corr usa info "futura" de A via B.
    """
    routes = spreads_df.columns
    violations = []
    for route_a in routes:
        for route_b in routes:
            if route_a == route_b:
                continue
            for lag in lag_minutes_list:
                corr = spreads_df[route_a].corr(
                    spreads_df[route_b].shift(-lag)  # B lidera A por `lag`
                )
                if abs(corr) > 0.15:  # threshold de significância
                    violations.append({
                        'route_a': route_a, 'route_b': route_b,
                        'lag_min': lag, 'corr': corr
                    })
    return violations
```

**Mitigação**: para rotas onde lag-correlation é significativa, a feature `rolling_corr_cluster_1h` deve ser **excluída** ou substituída por `rolling_corr_cluster_1h_lagged_adjusted` que subtrai a componente de autocorrelação cruzada.

**Confiança de que o design atual está seguro**: **55%** — flag alto. A PIT API garante a janela, mas não garante a ausência de leakage por autocorrelação cruzada com lag positivo.

---

## §5.6 Survivorship Bias — Auditoria

ADR-006 menciona `listing_history.parquet` imutável com `active_from`, `active_until`. O arquivo **não existe no repositório atual**.

**Schema proposto para `listing_history.parquet`**:

```
listing_history.parquet
├── rota_id:        SYMBOL / String
├── base_symbol:    String            (ex: "PEPE")
├── venue_buy:      String            (ex: "MexcFut")
├── venue_sell:     String            (ex: "BingxFut")
├── active_from:    TIMESTAMP (ns)    -- timestamp de primeira observação no scanner
├── active_until:   TIMESTAMP (ns)    -- null se ainda ativa; preenchido ao detectar delisting
├── delist_reason:  String?           -- "venue_removed", "zero_volume_7d", "manual"
├── last_seen_ns:   TIMESTAMP (ns)    -- último snapshot registrado
└── n_snapshots:    UInt64            -- total de snapshots coletados
```

**Como o scanner preserva rotas delistadas**: o adapter WS detecta que um símbolo parou de receber updates por > `stale_threshold` (ex: 10min) e marca `active_until = now_ns()`. O símbolo permanece no `listing_history` com todos os snapshots históricos intactos em QuestDB. Rota **nunca** é deletada do symbol universe.

**Filtro de backtest**: `WHERE active_from <= t₀ AND (active_until IS NULL OR active_until >= t₀)` — garante que amostras de rotas delistadas antes de `t₀` não sejam usadas para labels em `t₀`.

**Lacuna atual**: não há código de detecção de delisting implementado, nem o arquivo `listing_history.parquet`. A probabilidade de rotas delistadas contaminarem backtest quando o arquivo for gerado é alta se o arquivo não for preenchido retroativamente. Confiança no tratamento atual: **45%** — flag crítico.

---

## §5.7 Regime Shift em CV — Estratificação Proposta

Se fold K=1 tem 80% regime calm e fold K=6 tem 40% calm + 30% event, a comparação de métricas entre folds é distorcida por confoundimento de regime.

**Estratificação de CV por regime** (inspirada em Mignard et al. 2020, *Working Paper* — estratificação adaptativa para séries financeiras):

```python
def stratified_regime_kfold(df, regime_col='regime', k=6):
    """
    Garante distribuição proporcional de regimes em cada fold.
    Para H~0.8, usar blocos temporais contíguos dentro de cada estrato.
    """
    # Identificar blocos de regime contíguos
    df['regime_block'] = (df[regime_col] != df[regime_col].shift()).cumsum()
    blocks = df.groupby('regime_block').agg(
        regime=('regime', 'first'),
        start=('t0', 'min'),
        end=('t0', 'max'),
        n=('t0', 'count')
    ).reset_index()

    # Alocar blocos de cada regime aos K folds proporcionalmente
    # Manter contiguidade temporal dentro de cada bloco (não fragmentar)
    for regime in blocks['regime'].unique():
        regime_blocks = blocks[blocks['regime'] == regime]
        # Distribuir ciclicamente pelos K folds
        for i, (_, block) in enumerate(regime_blocks.iterrows()):
            blocks.loc[block.name, 'fold'] = i % k

    return blocks
```

**Custo**: O(N log N) por fold. Adiciona < 30s ao CI.

**Atenção**: estratificação com blocos temporais contíguos é essencial — não embaralhar dentro dos estratos (violaria autocorrelação). Confiança na adequação desta proposta: **72%** — flag moderado, pois a abordagem não tem benchmark publicado específico para H~0.8.

---

## §5.8 Clock Leakage — `TimeSource` Trait

**Problema identificado no código MVP**: em `ml/serving.rs`, `on_opportunity` recebe `now_ns: u64` como parâmetro — correto. Mas `HotQueryCache::observe()` usa `ts_ns` apenas para `last_update_ns` (staleness), não para janelas temporais. O risco real está na pipeline de treino Python futura: quando replay de histórico for executado, qualquer módulo que chamar `std::time::SystemTime::now()` ou Python `datetime.now()` retornará o tempo real, não o tempo do snapshot.

**Proposta de `TimeSource` trait**:

```rust
// scanner/src/ml/time_source.rs

/// Abstração de fonte de tempo para isolar produção vs replay de treino.
/// Qualquer módulo de features DEVE receber TimeSource em vez de chamar now_ns() diretamente.
pub trait TimeSource: Send + Sync + 'static {
    /// Retorna timestamp atual em nanosegundos Unix.
    fn now_ns(&self) -> u64;
}

/// Implementação de produção: usa SystemTime real.
pub struct RealTimeSource;

impl TimeSource for RealTimeSource {
    #[inline]
    fn now_ns(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64
    }
}

/// Implementação de replay: retorna timestamp fixo do snapshot sendo processado.
/// Usar em todos os pipelines de treino/backtest.
pub struct ReplayTimeSource {
    pub as_of_ns: std::sync::atomic::AtomicU64,
}

impl ReplayTimeSource {
    pub fn new(initial_ns: u64) -> Self {
        Self {
            as_of_ns: std::sync::atomic::AtomicU64::new(initial_ns),
        }
    }

    /// Avança o relógio do replay para o próximo timestamp.
    pub fn advance(&self, ts_ns: u64) {
        self.as_of_ns.store(ts_ns, std::sync::atomic::Ordering::Release);
    }
}

impl TimeSource for ReplayTimeSource {
    #[inline]
    fn now_ns(&self) -> u64 {
        self.as_of_ns.load(std::sync::atomic::Ordering::Acquire)
    }
}
```

**`dylint` lint customizado para rejeitar `SystemTime::now()` em módulos de treino**:

```rust
// dylint custom lint: CLOCK_IN_ML_TRAINING
// Rejeita: SystemTime::now(), Instant::now(), chrono::Local::now()
// em qualquer arquivo com atributo de módulo #[ml_training] ou em caminhos
// que contenham "training", "replay", "backtest"

declare_lint! {
    pub CLOCK_IN_ML_TRAINING,
    Deny,
    "Direct clock calls forbidden in ML training context — use TimeSource trait"
}
```

**Cobertura do lint**: vetores 1 (parcial), 12. Bloqueante em CI; zero falso-positivo em código de produção se `#[ml_training]` for aplicado apenas em módulos de treino.

**Integração com `FeatureStore`**: o trait `FeatureStore` em ADR-012 já recebe `as_of: Timestamp` — correto. Apenas garantir que a implementação interna do `HotQueryCache` NÃO chame `now()` internamente ao computar quantis (atualmente não chama, mas o `last_update_ns` usado para staleness check deve ser o `as_of` do replay, não o clock real).

---

## §5.9 Multiple Testing Correction — Auditoria

**Escopo real**: 48 labels × 3 perfis × 5 baselines = 720 hipóteses primárias. Com 6 métricas por hipótese (AUC-PR, ECE, precision@10, coverage, DSR, pinball), o total de testes é 4.320.

**O que ADR-006 propõe**:
1. BH FDR < 10% — correto para controle de falso positivo em seleção de modelos.
2. DSR > 2.0 — threshold correto mas insuficiente sozinho (não controla multiplicidade entre as 720 configs).
3. Romano-Wolf stepwise — correto para tail-sensitive, mas computacionalmente custoso para 4.320 testes.

**Lacunas**:

**Lacuna 1 — BH FDR não é suficiente para seleção de hiperparâmetros**: Bergstra & Bengio 2012 (*JMLR* 13) demonstram que busca em grade gera p-hacking mesmo com FDR controlado se o espaço de busca não for pré-registrado. Para 48 configs pré-definidas (grid fixo), o risco é moderado. Para ajustes iterativos, o risco é alto.

**Lacuna 2 — DSR para 720 configs requer cálculo correto de `V_n` (variância dos Sharpes)**:
Bailey & López de Prado 2014 (*JPM* 40(5)) definem `DSR = SR / √(V_n/T)` onde `V_n` é computado sobre os `n` Sharpes tentados. Com 720 tentativas, o denominador do DSR cresce substancialmente, reduzindo DSR efetivo. A implementação deve usar `n = 720`, não `n = 1`.

**Proposta**:
```python
def deflated_sharpe_ratio(sharpe_observed, sharpe_trials, n_trials, n_obs):
    """
    Bailey & López de Prado 2014 JPM 40(5).
    sharpe_trials: lista de Sharpes de todas as 720 configurações tentadas.
    """
    from scipy.stats import norm
    import numpy as np
    e_max = norm.ppf(1 - 1/(n_trials)) * (1 - gamma_euler + np.log(n_trials) / np.log(np.log(n_trials)))
    v_n = np.var(sharpe_trials)
    dsr = (sharpe_observed - e_max) / np.sqrt(v_n / n_obs)
    return dsr
```

**Confiança de que BH + DSR cobre adequadamente 720 hipóteses**: **65%** — flag. Romano-Wolf deve ser implementado para as métricas mais importantes (AUC-PR, precision@10) dado o regime de cauda pesada.

---

## §5.10 Gaps Atuais + Ação Priorizada

### Leakage vectors NÃO cobertos pelo design atual

1. **`listing_history.parquet` inexistente** (vetor 10 — survivorship bias): arquivo não existe, schema não definido, código de detecção de delisting ausente. Se dataset for gerado sem este arquivo, survivorship bias é garantido. **Prioridade: CRÍTICA**.

2. **`was_recommended` ausente no schema de dados** (vetor 8 — feedback loop): campo não está em `label_schema.md` nem em `data_lineage.md`. Sem ele, protocolo T12 inteiro não pode ser auditado. **Prioridade: ALTA**.

3. **Implementação Python do purged K-fold não existe** (vetor 4, 5, 6): `purged_cv_protocol.md` descreve o algoritmo mas não há código Python implementado e testado. Até ser implementado, nenhuma verificação automática de embargo é possível. **Prioridade: ALTA**.

4. **`dylint` lint anti-clock não implementado** (vetor 12): ADR-012 propõe `dylint` mas crate `scanner_ml_lints` não existe no repositório. **Prioridade: MÉDIA** (risco só materializa na pipeline Python de treino).

5. **Lag-correlation cross-route não auditada** (vetor 9): nenhum código ou protocolo de auditoria de lag implícito entre rotas. A feature `rolling_corr_cluster_1h` pode carregar até 30min de informação futura implícita em regime H~0.8. **Prioridade: MÉDIA-ALTA**.

### Quick wins (< 1 dia de implementação cada)

- Criar schema YAML de `listing_history.parquet` com campos mínimos (rota_id, active_from, active_until).
- Adicionar campo `was_recommended BOOLEAN DEFAULT false` ao schema de labels e execuções.
- Escrever `purge_verification_test()` em Rust (< 100 LoC) para CI.
- Adicionar asserção de timestamps monotônicos no carregamento de folds.

### Grandes trabalhos (Marco 2)

- Implementar `TimeSource` trait + `ReplayTimeSource` + wiring em `HotQueryCache` e features pipeline.
- Implementar pipeline Python completa com purged K-fold, purge verification, embargo check.
- Implementar crate `scanner_ml_lints` com `dylint` para CLOCK_IN_ML_TRAINING.
- Auditar lag-correlation entre rotas e ajustar feature G se violações encontradas.
- Implementar `listing_history` via detecção de delisting no adapter WS.

---

## §6 — Critérios e Pontos de Confiança < 80%

| Item | Confiança | Motivo do Flag |
|---|---|---|
| Embargo 2·T_max suficiente para H~0.8 | **70%** | Para T_max=30min, autocorr residual em 1h ≈ 0.40 — não negligível |
| `rolling_corr_cluster_1h` é PIT para todas rotas | **55%** | Lag implícito por autocorrelação cruzada não auditado |
| survivorship bias controlado | **45%** | `listing_history.parquet` não existe |
| BH + DSR cobre 720 hipóteses adequadamente | **65%** | DSR com n=720 reduz threshold efetivo; Romano-Wolf custoso |
| AST audit cobre proc-macros | **65%** | Código gerado por macro não é auditado por `syn` |
| Estratificação por regime proposta | **72%** | Sem benchmark publicado específico para H~0.8 com blocos contíguos |
| Protocolo T12 detecta feedback < 5% share | **60%** | Hold-out 5% pequeno para efeito distribuído |

---

## §7 — Referências

- López de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley. Cap. 3, 4, 7.
- Kaufman, S., Rosset, S. & Perlich, C. (2012). Leakage in data mining. *ACM TKDD* 6(4).
- Bailey, D., Borwein, J., López de Prado, M. & Zhu, Q. (2014). Probability of backtest overfitting. *Journal of Computational Finance* 20(4).
- Bailey, D. & López de Prado, M. (2014). The deflated Sharpe ratio. *JPM* 40(5).
- Benjamini, Y. & Hochberg, Y. (1995). Controlling the false discovery rate. *JRSS-B* 57.
- Romano, J.P. & Wolf, M. (2005). Stepwise multiple testing as formalized data snooping. *Econometrica* 73(4).
- Arnott, R., Harvey, C.R. & Markowitz, H. (2019). A backtesting protocol in the era of machine learning. *JPM* 45(1).
- Bifet, A. & Gavaldà, R. (2007). Learning from time-changing data with adaptive windowing. *SDM 2007*.
- Bifet, A. et al. (2010). MOA: Massive online analysis. *JMLR* 11.
- Brown, S., Goetzmann, W., Ibbotson, R. & Ross, S. (1992). Survivorship bias in performance studies. *RFS* 5(4).
- Elton, E., Gruber, M. & Blake, C. (1996). Survivor bias and mutual fund performance. *Journal of Finance* 51(3).
- Avellaneda, M. & Lee, J.H. (2010). Statistical arbitrage in the U.S. equities market. *Quantitative Finance* 10(7).
- Lo, A. (1991). Long-term memory in stock market prices. *Econometrica* 59(5).
- Stankevičiūtė, K., Alaa, A.M. & van der Schaar, M. (2021). Conformal time-series forecasting. *NeurIPS 2021*.
- Xu, C. & Xie, Y. (2023). Sequential predictive conformal inference. *ICML 2023*.
- Bergstra, J. & Bengio, Y. (2012). Random search for hyper-parameter optimization. *JMLR* 13.
- Zaffran, M. et al. (2022). Adaptive conformal predictions for time series. *ICML 2022*.
