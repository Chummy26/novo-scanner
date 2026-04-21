---
name: T05 — Design de Abstenção (Monolítica vs Tipada)
description: Tratar abstenção como unica perde informação; tratamento via enum Recommendation com 4 razões tipadas
type: trap
status: addressed
severity: medium
primary_domain: D1
secondary_domains: [D3, D5]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T05 — Design de Abstenção (Monolítica vs Tipada)

## Descrição

Tratar abstenção como monolítica ("modelo não emite nada") **perde informação**. Três causas distintas foram identificadas inicialmente, depois refinadas para quatro em D1:

- **(a) Oportunidade inexiste**: nenhuma combinação `(x, y)` viável atinge floor de utilidade.
- **(b) Dados insuficientes**: rota nova, halt recente, histórico < n_min.
- **(c) Incerteza epistêmica alta**: dados existem mas IC do `P(realize)` é largo demais.
- **(d) Cauda excepcional**: distribuição amostral sinaliza spike event fora do regime de treino.

Sem separar, operador não sabe se deve ajustar floor, esperar mais dados, ou ignorar rota — informação diagnóstica perdida silenciosamente.

## Manifestação

- UI com apenas `None` / `Some(TradeSetup)` deixa operador às escuras.
- Log agregado "taxa de abstenção 30%" não distingue: é todo `NoOpportunity` saudável, ou é `InsufficientData` patológico?
- Investigações de bug em produção se tornam longas porque a causa raiz da abstenção está obscura.

## Tratamento

### Primário — ADR-005 Enum Recommendation com 4 razões tipadas

```rust
pub enum Recommendation {
    Trade(TradeSetup),
    Abstain { reason: AbstainReason, diagnostic: AbstainDiagnostic },
}

pub enum AbstainReason {
    NoOpportunity,    // (a)
    InsufficientData, // (b)
    LowConfidence,    // (c)
    LongTail,         // (d)
}
```

Cada razão tem `diagnostic` estruturado com métricas específicas (n_observations, ci_width, tail_ratio, etc.).

### Secundário — Métricas diferenciadas por razão

- `coverage_rate` (fração emitindo Trade).
- `abstention_quality_{NoOpportunity|InsufficientData|LowConfidence|LongTail}` — métricas específicas por razão (D3 ADR-005).

### Terciário — Precedência operacional

Se múltiplas razões se aplicam simultaneamente, precedência:
1. `InsufficientData` (hard — rota sem dados).
2. `LongTail` (regime fora do treino).
3. `LowConfidence` (incerteza epistêmica).
4. `NoOpportunity` (simples falta de setup).

### Quaternário — Kill switch se abstenção excessiva

Se `coverage_rate < 0.05` por 1h (modelo desistiu de tudo) → alert + investigação manual + possível fallback ou retreino (ADR-011).

## Residual risk

- **Parâmetros default** (n_min=500, τ_abst_prob=0.20, etc.) são estimativas iniciais; calibração empírica exige shadow mode ≥ 30 dias.
- **Abstenção excessiva** (modelo foge de tudo) → coverage colapsa; mitigação via kill switch.
- **Abstenção insuficiente** (modelo emite onde deveria abster-se) → T11 execution failures; mitigação via shadow haircut.
- **Misclassificação entre razões** (e.g., ativa `LowConfidence` quando deveria ser `LongTail`): raramente crítico mas dificulta diagnóstico.

## Owner do tratamento

- ADR-005 (primário).

## Referências cruzadas

- [ADR-005](../01_decisions/ADR-005-abstencao-tipada-4-razoes.md).
- [ADR-002](../01_decisions/ADR-002-utility-function-u1-floor-configuravel.md) — floor dispara `NoOpportunity`.
- [ADR-004](../01_decisions/ADR-004-calibration-temperature-cqr-adaptive.md) — CQR dispara `LowConfidence`.
- [T06_cold_start.md](T06-cold-start.md) — partial pooling dispara `InsufficientData`.
- [T04_heavy_tails.md](T04-heavy-tails.md) — cauda dispara `LongTail`.

## Evidência numérica citada

- Chow 1957 *IRE Trans Electronic Computers* — Chow's rule, baseline histórico de selective classification.
- El-Yaniv & Wiener 2010 *JMLR* 11 — selective classification reduz error rate 30–60% em benchmarks típicos.
- Geifman & El-Yaniv 2017 *NeurIPS* — selective classification DL atinge 99% precision em ImageNet com 50% coverage.
- Gangrade, Kag & Saligrama 2021 *ICML* — selective regression generalization.
- n_min = 500 derivado de Serfling 1980 (quantis `p95 ± 0.01` requerem n ≥ 475).
