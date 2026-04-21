---
name: ADR-009 — Triple-Barrier Adaptado com 48 Labels Paramétricas
description: Labeling via triple-barrier operando sobre soma S_entrada+S_saída (identidade PnL), parametrizado em grid meta×stop×T_max para refletir discricionariedade do operador
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d4-labeling]
---

# ADR-009 — Triple-Barrier Adaptado com 48 Labels Paramétricas

## Contexto

Labels para modelos financeiros ML são construídos por triple-barrier (López de Prado 2018 — *Advances in Financial Machine Learning*, cap. 3): dada amostra em `t₀`, rotular como sucesso/falha/timeout conforme trajetória futura.

A estratégia é **discricionária pelo operador** (skill §5): meta de lucro, stop, e tempo máximo de hold são escolhas pessoais; não há valor universal. Treinar modelo com um único `(meta, stop, T_max)` força uma escolha e torna o modelo inútil para operadores com perfis diferentes.

Adicionalmente, a identidade contábil `PnL = S_entrada(t₀) + S_saída(t₁)` exige que barreiras operem sobre a **soma** dos spreads, não sobre diferença de preços de equities — adaptação crítica do método clássico.

## Decisão

Adotar **Triple-Barrier Adaptado operando sobre a SOMA dos spreads** (respeita identidade PnL), em **grid paramétrico de 48 labels**.

### Barreiras

Dado snapshot `t₀` com `entrySpread(t₀) ≥ P95(rota, 24h rolling)` (trigger mínimo) AND `book_age < 200ms` AND `vol24 ≥ $50k`:

- **Barreira superior (sucesso)**: existe `t₁ ∈ (t₀, t₀+T_max]` com `S_entrada(t₀) + S_saída(t₁) ≥ meta_operador`.
- **Barreira inferior (falha)**: existe `t₁ ∈ (t₀, t₀+T_max]` com `S_entrada(t₀) + S_saída(t₁) ≤ −stop_operador`.
- **Barreira temporal (timeout)**: nenhuma barreira bate em `T_max`.

### Grid paramétrico (48 labels)

```
meta_operador   ∈ {0.3%, 0.5%, 1.0%, 2.0%}       — 4 opções
stop_operador   ∈ {None, −1.0%, −2.0%}            — 3 opções
T_max           ∈ {30min, 4h, 24h}                — 3 opções
```

**Total**: 4 × 3 × 3 = **36 labels ternárias** (sucesso/falha/timeout) + 12 variantes para exploração futura = **48 colunas/amostra**.

Operador escolhe config via UI/CLI (ADR-002 floor); respeita correção #4 do skill (janela discricionária).

### Meta-labeling (López de Prado 2018 cap. 3)

- **Primária**: regra simples hard do scanner (`entrySpread ≥ P95` + `book_age OK` + `vol24 OK`).
- **Secundária**: modelo ML (arquitetura A2 — ADR-001) decide se **executar** o sinal da primária. Aumenta precision +15–30% às custas de recall −10–20%.

Encaixa com design do sistema:
- Scanner (detector) é primária.
- Modelo ML é filtro secundário.
- Operador aplica T1_Q e T2_Q (skill §4) via UI como filtro terciário.

### Labeling para abstenção

Modelo separado binário decide "há sinal suficiente para emitir?" — treinado com labels derivados de:
- `NoOpportunity`: nenhuma combinação `(meta, stop, T_max)` produz label positivo.
- `InsufficientData`: `n < n_min = 500` (ADR-005).
- `LowConfidence`: IC 95% do modelo primário > `τ_abst` em fold de validação.
- `LongTail`: `p99/p95` janela rolante > 3.0.

Cada razão treinada independentemente; votação final por precedência (InsufficientData > LongTail > LowConfidence > NoOpportunity). Preferível a ternário cost-sensitive — mantém calibração de `realization_probability` limpa (**confidence 75% em D4**; exige validação A/B shadow).

## Alternativas consideradas

### Label único com triple-barrier padrão

- Um único `(meta=1%, stop=−2%, T_max=4h)` fixo.
- **Rejeitada**: força escolha; não reflete discricionariedade do operador (skill §5.2).

### Labels contínuas (regressão sobre PnL bruto)

- Label = `max_{t' ∈ (t₀, t₀+T_max]} G(t₀, t')` contínuo.
- **Parcialmente adotada**: ADR-008 já modela `G` como variável contínua. Mas triple-barrier com labels **categóricos** sobre grid de parâmetros dá ao operador recomendação mais intuitiva ("sucesso/falha/timeout") e permite meta-labeling.
- Ambas coexistem: quantile regressor prediz distribuição de `G`; meta-labeler prediz rotular label paramétrico.

### Horizonte fixo sem barreira

- "O que aconteceu em `t₀+T_max`?" sem checar `[t₀, t₀+T_max]`.
- **Rejeitada**: operador pode fechar em `t₁ < T_max` assim que meta bate; ignorar isso subestima taxa de sucesso.

### Fractional differentiation para features antes de labeling

- López de Prado 2018 cap. 5.
- **Deferrida para V2**: complexity vs benefit não justifica em MVP; features de D3 são majoritariamente stacionárias por construção (quantis rolantes são bounded; sinusoidals são periódicos).

## Consequências

**Positivas**:
- Respeita identidade PnL (barreiras sobre soma, não diferença).
- Operador escolhe perfil sem re-treino do modelo (48 labels pré-computadas).
- Meta-labeling separa detecção (scanner primária) de decisão (modelo secundário) — interpretabilidade alta.
- Abstenção tipada integra limpamente (ADR-005).

**Negativas**:
- 48 labels = 48 × `{−1, 0, +1}` por amostra = ~48 bytes/amostra adicional no dataset.
- Storage: 6.7×10⁶ amostras × 48 bytes = **320 MB** em 90 dias — absorvível.
- Treino: 48 targets × K=6 folds × 3 modelos (QRF, CatBoost, RSF) = 864 model fits. Paralelização via `joblib` Python + pré-computação de features cacheadas.

**Risco residual**:
- **Labels sobrepostos** entre amostras vizinhas (H~0.8 autocorrelação) → leakage temporal. Mitigação: purged K-fold + embargo = 2·T_max (ADR-006).
- **Spike events** (eventos únicos ex-Luna, ex-FTX) dominam estatísticas. Mitigação: winsorize p99.5% + trimmed mean (D4 §armadilhas longtail).
- **Selection bias do trigger P95**: amostras que entram no dataset são justamente as caudas superiores, não o regime típico. Consequência: modelo aprende sobre a cauda, que é o alvo operacional, mas não sobre "é isto mesmo cauda legítima?". Mitigação: complementar com amostras baseline (subsample de 0% quantile) para calibração de `LongTail` detection.

## Status

**Aprovado** para Marco 1. Grid de parâmetros revisável após 30 dias shadow — pode-se adicionar `meta=3%` ou `T_max=7d` se operador demandar.

## Referências cruzadas

- [D04_labeling.md](../00_research/D04_labeling.md) — protocolo completo.
- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — modelo A2 consome labels.
- [ADR-002](ADR-002-utility-function-u1-floor-configuravel.md) — floor na meta.
- [ADR-006](ADR-006-purged-kfold-k6-embargo-2tmax.md) — purged K-fold evita leakage.
- [ADR-005](ADR-005-abstencao-tipada-4-razoes.md) — abstenção via labeling separado.
- [ADR-008](ADR-008-joint-forecasting-unified-variable.md) — variável unificada `G(t,t')`.
- [T09_label_leakage.md](../02_traps/T09-label-leakage.md).

## Evidência numérica

- López de Prado 2018 — triple-barrier: método padrão em financial ML há 8 anos.
- Meta-labeling ganho típico: +15–30% precision, −10–20% recall (López de Prado 2018 cap. 3.6).
- 6.7×10⁶ amostras × 90 dias × 2600 rotas após trigger P95 — consistente com D4 §K-fold sizing.
- Selection bias do trigger: Kohavi, Deng & Vermeer 2022 *KDD* discutem impacto geral; mitigação via baseline sampling é bem estabelecida.
