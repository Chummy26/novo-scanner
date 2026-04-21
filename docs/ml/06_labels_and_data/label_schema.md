---
name: Label Schema — Triple-Barrier 48 Labels Paramétricas
description: Contrato concreto do esquema de labels para treino do recomendador TradeSetup; derivado de ADR-009
type: spec
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# Label Schema — Triple-Barrier 48 Labels Paramétricas

Contrato de labeling para treino do modelo A2 composta (ADR-001). Derivado de ADR-009 e D4.

## Gatilho de amostragem

Um snapshot `(rota_id, t₀)` entra no dataset de treino se **todas** as condições:

```
entrySpread(t₀) ≥ P95(rota, 24h rolling)   -- top 5% da distribuição recente
AND buy_book_age_ms < 200                  -- book fresco
AND sell_book_age_ms < 200
AND min(buy_vol24, sell_vol24) ≥ $50k      -- liquidez mínima
AND NOT halt_active                         -- venue operacional
```

Fora do gatilho = amostra ignorada. Reduz dataset bruto 1.35×10⁹/dia → ~6.7×10⁶ total em 90 dias (D4).

## Barreiras (operam sobre SOMA dos spreads — respeita identidade PnL)

Dado snapshot em `t₀`, barreira bate no primeiro instante `t₁ ∈ (t₀, t₀+T_max]` que satisfaz:

| Barreira | Condição | Label |
|---|---|---|
| Superior (sucesso) | `S_entrada(t₀) + S_saída(t₁) ≥ meta` | `+1` |
| Inferior (falha) | `S_entrada(t₀) + S_saída(t₁) ≤ −stop` | `−1` |
| Temporal (timeout) | nenhuma das anteriores em `T_max` | `0` |

**Atenção**: barreira é sobre `entry + exit`, NÃO sobre diferença de preços. Respeita identidade `PnL_bruto = S_entrada(t₀) + S_saída(t₁)` (skill §3).

## Grid paramétrico (48 colunas por amostra)

```
meta  ∈ {0.3%, 0.5%, 1.0%, 2.0%}              -- 4 opções
stop  ∈ {None, −1.0%, −2.0%}                   -- 3 opções
T_max ∈ {30min, 4h, 24h}                       -- 3 opções
→ 4 × 3 × 3 = 36 labels primários + 12 exploratórios = 48 colunas.
```

Operador escolhe `(meta, stop, T_max)` via CLI/UI; modelo devolve predição da coluna correspondente.

## Schema da tabela de labels (Parquet particionado)

```sql
CREATE TABLE labels_triple_barrier (
  rota_id        SYMBOL CAPACITY 4096,
  t0             TIMESTAMP,
  -- 36 labels primários + 12 exploratórios = 48 colunas
  lbl_m03_sNone_t30min  BYTE,  -- valores: -1, 0, +1
  lbl_m03_sNone_t4h     BYTE,
  lbl_m03_sNone_t24h    BYTE,
  lbl_m03_s10_t30min    BYTE,
  -- ... (pattern m{meta}_s{stop}_t{tmax})
  -- metadata úteis para debug e inspeção
  touched_meta          DOUBLE,      -- máximo real de entry+exit atingido em T_max
  touched_stop          DOUBLE,      -- mínimo real
  time_to_meta          INT,         -- segundos até atingir meta (null se não atingiu)
  time_to_stop          INT,         -- idem stop
  regime_at_t0          BYTE,        -- 0=calm, 1=opportunity, 2=event
  base_symbol           SYMBOL,
  venue_pair            SYMBOL,
  halt_active           BOOLEAN      -- para filtro pós-label (exclusão)
) TIMESTAMP(t0) PARTITION BY DAY;
```

## Meta-labeling (ADR-009)

- **Primária**: regra simples do gatilho acima (passou trigger?).
- **Secundária**: modelo ML decide se **executar** o sinal da primária.
- Ganho esperado (López de Prado 2018 cap. 3.6): +15–30% precision às custas de −10–20% recall.

## Labeling para abstenção (ADR-005)

Modelo de abstenção separado é treinado com targets derivados:

```python
is_NoOpportunity     = all(label_column == -1 or label_column == 0 for column in positive_labels)
is_InsufficientData  = n_observations_route_before(t0) < 500
is_LowConfidence     = ci_width_if_predicted > tau_abst
is_LongTail          = tail_ratio_p99_p95(route, window=24h) > 3.0
```

Precedência (se múltiplos ativam): `InsufficientData > LongTail > LowConfidence > NoOpportunity`.

## Armadilhas endereçadas

- **T9 label leakage** — `purged_cv_protocol.md` garante; auditoria CI em `ml_eval` crate.
- **T1 reward hacking** — floor configurável aplicado no post-processing de `meta` (ADR-002); operador não vê micro-spreads.
- **T2 joint/marginal** — labels paramétricas permitem treinar modelo joint via variável unificada `G(t,t')` (ADR-008); alternativa de marginais separadas fica como ablation.

## Storage estimado

- 6.7×10⁶ amostras × 90 dias × (48 bytes/amostra labels + 32 bytes metadata) = ~320 MB bruto.
- Comprimido ZSTD level 6: ~32 MB. Negligível.

## Atenção operacional

- **Survivorship bias**: rotas delistadas durante coleta devem ser preservadas no Parquet arquival (ADR-012); NÃO deletar.
- **Fee tier mid-period change**: tabela auxiliar `fee_tier_history(venue, effective_from, fee)` — backtesting com fees realistas.
- **Halts**: `halt_active=true` → excluir do dataset de treino (labels inválidos). Log em `08_drift_reports/`.
- **Spike events** (ex-FTX, ex-Luna): winsorize p99.5% + trimmed mean + flag `spike_event_id`.

## Referências

- [ADR-009](../01_decisions/ADR-009-triple-barrier-parametrico-48-labels.md).
- [ADR-006](../01_decisions/ADR-006-purged-kfold-k6-embargo-2tmax.md).
- [D04_labeling.md](../00_research/D04_labeling.md).
- [purged_cv_protocol.md](purged_cv_protocol.md).
- López de Prado 2018 — cap. 3 (labeling), cap. 7 (cross-validation).
