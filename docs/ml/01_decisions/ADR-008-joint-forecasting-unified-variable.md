---
name: ADR-008 — Joint Forecasting via Variável Unificada G(t,t') = S_entrada(t) + S_saída(t')
description: Modelar diretamente a soma S_entrada+S_saída como variável escalar única em vez de marginais separadas ou copula — resolve T2 por construção
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d5-calibration, phd-d1-formulation]
---

# ADR-008 — Joint Forecasting via Variável Unificada G(t,t')

## Contexto

A armadilha **T2 — Correlação espúria entre P e gross_profit via marginais separadas** é estrutural: é tentador estimar dois modelos independentes — um para `entrySpread atingível(t)` e outro para `exitSpread atingível(t)` — e multiplicar as probabilidades. **Isso é matematicamente errado**.

A correlação empírica `entrySpread × exitSpread` medida no snapshot real (n=431 do scanner) é **−0.93** (D2). Essa correlação não é coincidência: vem da identidade tautológica

```
S_entrada(t) + S_saída(t) = −(bid_ask_A(t) + bid_ask_B(t)) / ref(t)
```

— soma instantânea é **estruturalmente negativa e determinada pela largura dos books**. Qualquer compressão/expansão de spread entre A e B empurra as duas séries em direções opostas simultaneamente.

Modelar marginais independentes e multiplicar P's produz `realization_probability` **descalibrada, tipicamente otimista** — o modelo acha que dois eventos "independentes" aconteceram quando é **um único evento** (compressão de mispricing) se manifestando duas vezes.

Três soluções foram consideradas em D5 (Camada 4):

1. **Multi-output conformal retangular** (Feldman et al. 2023): intervalo retangular para `(entry, exit)` — ignora correlação; infla volume ~30% vs copula.
2. **Copula-based conformal** (Messoudi et al. 2022): modela correlação explicitamente via copula Gaussian/t; matematicamente rigoroso; complexo de implementar em Rust + calibrar.
3. **Variável unificada `G(t, t') = S_entrada(t) + S_saída(t')`**: modela diretamente a soma — a **variável que importa para o PnL**.

## Decisão

Adotar **variável unificada `G(t, t') = S_entrada(t) + S_saída(t')`** como alvo primário do modelo.

### Semântica

- `G(t₀, t₁)` é **literalmente o PnL bruto** (identidade contábil §3 skill): `PnL_bruto(t₀, t₁) = G(t₀, t₁)`.
- Modelar `G` diretamente torna a predição matematicamente equivalente à predição de PnL.
- Para cada candidato `T_max` (30min, 4h, 24h — ADR-009), modelo prevê distribuição de `max_{t' ∈ (t₀, t₀+T_max]} G(t₀, t')`.

### Decomposição em (enter_at, exit_at) como post-processing

Após emitir `gross_profit ≥ meta_operador + floor`, a decomposição é determinística:

```rust
let gross_target = meta_operador + floor_operador;
let enter_at = entrySpread_current(t₀);  // já conhecido
let exit_at = gross_target − enter_at;
```

### Por que vence alternativas

| Critério | Marginais independentes | Copula | **Unified G** |
|---|---|---|---|
| Calibração do P | errada (viés otimista) | OK se copula correta | **OK por construção** |
| Cobertura empírica IC | subcoberta | OK | **OK por construção** |
| Rust LoC | 2 modelos + fusão | copula + ajuste | **1 modelo + CQR** |
| Interpretabilidade | baixa (P espúria) | média (parâmetro copula) | **alta (é PnL)** |
| Robustez correlação −0.93 | falha | OK | **nativa** |

### Implementação

- Quantile regression de `G` (QRF para quantis principais + CatBoost MultiQuantile condicional em features contextuais — ADR-001 arquitetura A2).
- CQR sobre `G` para intervalos distribution-free (ADR-004).
- Adaptive conformal sobre `G` (γ=0.005) para distribution shift.
- Feature `rolling_corr_entry_exit_1h` **ainda** é útil — não como alvo mas como input explicativo para o modelo.

### Verificação da identidade estrutural

Validador pós-emissão (50 LoC Rust) checa que no instante `t₀` de emissão:

```rust
let structural_cap = -(bid_ask_A + bid_ask_B) / ref;
assert!(sum_inst <= structural_cap + tolerance_f32);
```

Se violação, modelo está em estado inconsistente → abstenção `LowConfidence`.

## Alternativas consideradas

### Multi-output conformal retangular

- **Rejeitada**: infla volume IC ~30% para correlação −0.93 → intervalos largos demais → abstenção excessiva → coverage rate colapsa.

### Copula Gaussian/t-student

- **Rejeitada** como primário por complexidade de calibração em Rust (Sklar 1959; Nelsen 2006 *An Introduction to Copulas*). Reservada para pesquisa V3 se unified G mostrar viés em regime event.

### Bivariate NGBoost (Duan et al. 2020)

- Multivariate distributional boosting.
- **Rejeitada**: NGBoost não existe como crate Rust nativo; treino Python + ONNX export funciona mas CatBoost MultiQuantile sobre variável unificada é mais simples e treinado com a infraestrutura já estabelecida (ADR-003).

### Modelar marginais separadas + pós-ajuste empírico

- Treinar P_entry e P_exit; depois ajustar via regressão empírica `P_joint = f(P_entry, P_exit, corr)`.
- **Rejeitada**: ajuste empírico é frágil; ignora que a própria relação `P_entry × P_exit → P_joint` muda por regime (D2).

## Consequências

**Positivas**:
- Calibração por construção: predizer `G` é predizer PnL.
- Um único modelo (em vez de dois) — simplicidade.
- CQR sobre `G` unidimensional é trivial (~200 LoC — D7 confirmado).
- Cobertura IC 95% garantida distribution-free.
- Verificação de identidade estrutural é simples pós-emissão.

**Negativas**:
- Perde informação de decomposição "natural" (entry e exit separados) — mas decomposição determinística pós-hoc recupera.
- Feature `entrySpread(t₀)` atual é **feature crítica** do modelo; se valor espúrio por staleness (T11), `G` predito é enviesado. Mitigação: C staleness features do ADR-007 + abstenção `LowConfidence` quando `book_age` anômalo.

**Risco residual**:
- Em regime event (D2), distribuição de `G` tem cauda extrema — CQR cobre via adaptive + Camada 5 kill switch (ADR-004).
- Operador que quer controlar `enter_at` e `exit_at` independentemente (estilo limit order) tem menos controle fine-grained. MVP V1 abstrai isso; V2 pode expor.

## Status

**Aprovado** para Marco 1. Revisão em 60 dias de shadow mode: se cobertura empírica de `G` degrada em regime event, considerar copula Gaussian como camada extra.

## Referências cruzadas

- [D01_formulation.md](../00_research/D01_formulation.md) §Arquitetura composta.
- [D05_calibration.md](../00_research/D05_calibration.md) §Camada 4.
- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — arquitetura A2.
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — CQR + adaptive.
- [T02_joint_vs_marginal.md](../02_traps/T02-joint-vs-marginal.md).
- Skill canônica §3 (identidade contábil do PnL).

## Evidência numérica

- Correlação empírica `entrySpread × exitSpread = −0.93` (n=431 scanner snapshot, D2 relatório).
- Identidade estrutural `sum(t) ≈ −0.24%` mediana no snapshot (D2 §5.5).
- Feldman et al. 2023 *JMLR* multi-output conformal retangular reporta volume inflation ~30% para correlação |ρ| > 0.9.
- Messoudi et al. 2022 *ML Journal* copula-based conformal — rigoroso mas complexity vs benefit não justifica em nosso contexto.
