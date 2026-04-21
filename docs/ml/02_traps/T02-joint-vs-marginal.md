---
name: T02 — Correlação Espúria via Marginais Separadas
description: Multiplicar P(entry) × P(exit) ignora correlação estrutural -0.93; tratamento via variável unificada G(t,t')
type: trap
status: addressed
severity: critical
primary_domain: D1
secondary_domains: [D5]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T02 — Correlação Espúria entre P e gross_profit via Marginais Separadas

## Descrição

É tentador estimar dois modelos independentes — um para `entrySpread atingível(t)` e outro para `exitSpread atingível(t)` — e **multiplicar as probabilidades**. Isso é matematicamente errado.

A correlação empírica `entrySpread × exitSpread` no snapshot real do scanner é **−0.93**. Não é coincidência: é consequência direta da identidade tautológica

```
S_entrada(t) + S_saída(t) = −(bid_ask_A(t) + bid_ask_B(t)) / ref(t)
```

Qualquer compressão/expansão de spread entre A e B empurra as duas séries em direções opostas simultaneamente — é uma única dinâmica de preço se manifestando duas vezes.

## Manifestação empírica

- Multiplicar marginais **infla `realization_probability`**: modelo "acha" que dois eventos independentes aconteceram quando é **um único evento** (compressão de mispricing).
- ECE sob marginais independentes em regime típico: ~0.05–0.10 (miscalibração substancial).
- **Pior em regime event** (D2): correlação fica ainda mais negativa; ECE sob marginais pode atingir 0.15+.

## Tratamento

### Primário — ADR-008 Variável unificada `G(t, t') = S_entrada(t) + S_saída(t')`

Modelar diretamente a soma como variável escalar única. `G` é **literalmente** o PnL bruto (identidade §3 skill). Calibração por construção.

- Quantile regression de `G` via CatBoost MultiQuantile (ADR-001 arquitetura A2).
- CQR sobre `G` unidimensional (ADR-004 Camada 3).
- Decomposição em `(enter_at, exit_at)` é **pós-processamento determinístico**:
  ```rust
  let gross_target = meta_operador + floor_operador;
  let enter_at = entrySpread_current(t₀);
  let exit_at = gross_target − enter_at;
  ```

### Secundário — Validador da identidade estrutural

Pós-emissão (50 LoC Rust), verifica coerência:

```rust
let structural_cap = -(bid_ask_A + bid_ask_B) / ref;
assert!(sum_inst <= structural_cap + tolerance);
```

Se violação → abstém `LowConfidence`.

### Terciário — Feature `rolling_corr_entry_exit_1h`

A correlação não é o alvo mas é **input explicativo** do modelo (ADR-007 família B).

## Residual risk

- **Regime event** amplifica correlação → CQR pode precisar de calibração estratificada adicional (já feito em ADR-004 Camada 2 por regime).
- **Multi-output conformal retangular** como fallback se unified G falhar em calibração específica. Trade-off: infla IC ~30%.
- **Copula Gaussian/t-student** reservada para V3 se unified G mostrar viés sistemático.

## Owner do tratamento

- ADR-008 (primário).
- ADR-004 (secundário, via CQR sobre G).

## Referências cruzadas

- [ADR-008](../01_decisions/ADR-008-joint-forecasting-unified-variable.md).
- [ADR-004](../01_decisions/ADR-004-calibration-temperature-cqr-adaptive.md).
- [D05_calibration.md](../00_research/D05_calibration.md) §Camada 4.
- Skill canônica §2 (observação estrutural).

## Evidência numérica citada

- Correlação empírica `entrySpread × exitSpread = −0.93` (n=431, D2 relatório).
- Feldman et al. 2023 *JMLR* — multi-output conformal retangular infla volume ~30% para |ρ|>0.9.
- Messoudi et al. 2022 *ML Journal* — copula-based conformal matematicamente rigoroso.
