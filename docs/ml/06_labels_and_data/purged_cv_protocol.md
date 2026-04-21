---
name: Purged Walk-Forward K-Fold Protocol
description: Protocolo concreto de validação cruzada temporal com purging e embargo para eliminar label leakage em séries com autocorrelação H ~ 0.8
type: spec
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# Purged Walk-Forward K-Fold Protocol

Contrato operacional derivado de ADR-006 e D4. Execução em pipeline Python (treino) e auditoria em Rust CI (`ml_eval` crate).

## Parâmetros canônicos

```
K               = 6                    -- folds cronológicos expanding-window
EMBARGO_FACTOR  = 2.0                  -- embargo = EMBARGO_FACTOR × T_max
MIN_GAP_HOURS   = max(embargo, 12h)    -- piso para cycle intraday
```

Para cada `T_max` ∈ {30min, 4h, 24h}, embargo é diferente:
- `T_max=30min` → embargo=1h → min_gap=12h.
- `T_max=4h` → embargo=8h → min_gap=12h.
- `T_max=24h` → embargo=48h → min_gap=48h.

## Algoritmo (pseudocódigo)

```python
def purged_walk_forward_kfold(df, k=6, t_max_minutes=30, embargo_factor=2.0):
    """
    df: DataFrame ordenado cronologicamente por t0.
    Returns: generator de (train_idx, test_idx) com purging + embargo.
    """
    df = df.sort_values('t0').reset_index(drop=True)
    n = len(df)
    fold_size = n // k
    embargo_delta = timedelta(minutes=t_max_minutes * embargo_factor)
    min_gap = max(embargo_delta, timedelta(hours=12))

    for fold_i in range(k):
        test_start_idx = fold_i * fold_size
        test_end_idx = min((fold_i + 1) * fold_size, n)

        test_t0_start = df.loc[test_start_idx, 't0']
        test_t0_end = df.loc[test_end_idx - 1, 't0']

        # Purge: remover amostras de train cuja [t0, t0+T_max] intersecta [test_start, test_end+T_max]
        t_max = timedelta(minutes=t_max_minutes)
        purge_window_start = test_t0_start - t_max
        purge_window_end = test_t0_end + t_max

        # Embargo: adicionar margem antes e depois do teste
        embargo_window_start = purge_window_start - min_gap
        embargo_window_end = purge_window_end + min_gap

        train_mask = (df['t0'] < embargo_window_start) | (df['t0'] > embargo_window_end)
        test_mask = (df.index >= test_start_idx) & (df.index < test_end_idx)

        # Verificações pré-condition
        assert train_mask.sum() > 0, f"fold {fold_i}: train vazio após purge+embargo"
        assert test_mask.sum() > 0, f"fold {fold_i}: test vazio"
        assert not (train_mask & test_mask).any(), "overlap train/test"

        yield df.index[train_mask].values, df.index[test_mask].values
```

## Garantias formais

1. **Zero overlap temporal**: `assert not (train_mask & test_mask).any()` em tempo de execução.
2. **Zero overlap de label window**: purge window ≥ `T_max` cobre labels que dependem de futuro até `t₀+T_max`.
3. **Embargo conservador**: `2·T_max` cobre autocorrelação empírica H ∈ [0.70, 0.85] (D2).

## Auditoria CI (crate `ml_eval`)

Cinco testes bloqueantes em GitHub Actions (ADR-006, D4):

| # | Test | Esperado | Falha se |
|---|---|---|---|
| 1 | Shuffling temporal | performance_shuffled < 0.5 × performance_original | ≥ 0.5 (leakage provável) |
| 2 | AST feature audit (`syn 2.x`) | nenhum padrão proibido | uso de `arr[i+k]`, `dataset.mean()`, rolling avançando |
| 3 | Dataset-wide statistics flag | stats globais apenas com guard `< t₀` | blacklist ativada |
| 4 | Purge verification | 0% overlap pares train/test | qualquer overlap |
| 5 | Canary forward-looking | pipeline rejeita feature que lê `t₀+1` | aceita |

Rust stub (crate `ml_eval`):

```rust
pub fn audit_fold(train_idx: &[usize], test_idx: &[usize], df: &DataFrame) -> Result<()> {
    // #4 purge verification
    let train_t0 = df.column("t0")?.filter_by_idx(train_idx)?;
    let test_t0 = df.column("t0")?.filter_by_idx(test_idx)?;
    let t_max = df.get_meta_t_max()?;

    for &test_t in test_t0.iter() {
        let window_start = test_t - t_max;
        let window_end = test_t + t_max;
        let overlap = train_t0.iter().filter(|&&tr_t| tr_t >= window_start && tr_t <= window_end).count();
        ensure!(overlap == 0, "purge violation at test_t={:?}", test_t);
    }
    Ok(())
}
```

## Métricas reportadas (por fold + agregado)

Conforme ADR-006 e D4:

- **Precision@k** (k ∈ {1, 5, 10, 50}) — precision-first; relatório `mean ± std` entre folds.
- **AUC-PR** (area under PR curve) — class-imbalanced aware.
- **ECE** (Expected Calibration Error) — por estrato (regime, venue-pair).
- **Pinball loss** para quantis.
- **Coverage empírica** IC 95% — garantia CQR.
- **DSR** (Deflated Sharpe Ratio — Bailey & López de Prado 2014) — desinflaciona por # hipóteses testadas.
- **Brier score** — calibração probabilística.
- **Abstention rate** — por `AbstainReason`.

## Multiple testing correction

Com 48 labels × 3 perfis × 5 baselines = **720 hipóteses simultâneas**:

- **Benjamini-Hochberg FDR < 10%** sobre p-values individuais (BH 1995 *JRSS-B* 57).
- **DSR > 2.0** como threshold global de significância.
- **Romano-Wolf stepwise** (Romano & Wolf 2005 *Econometrica* 73) para tail-sensitive quando amostra permite.

## Uso prático

```bash
# Python training
python train_model.py \
  --dataset data/labels_triple_barrier.parquet \
  --cv purged_walk_forward \
  --k 6 \
  --embargo-factor 2.0 \
  --target-column lbl_m10_s10_t4h \
  --output-metrics runs/2026-04-19/metrics.json

# Rust CI
cargo test -p ml_eval --release  # Testes 1-5 automáticos em PR
```

## Referências

- [ADR-006](../01_decisions/ADR-006-purged-kfold-k6-embargo-2tmax.md).
- [D04_labeling.md](../00_research/D04_labeling.md) §Purged K-fold.
- [label_schema.md](label_schema.md).
- López de Prado 2018 — *Advances in Financial Machine Learning*, cap. 7 (CV in Finance).
- Bailey & López de Prado 2014 — *Journal of Portfolio Management* 40(5).
