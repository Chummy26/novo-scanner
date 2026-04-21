---
name: ADR-005 — Abstenção Tipada com 4 Razões Explícitas
description: Output do recomendador é enum Recommendation {Trade(TradeSetup), Abstain{reason, diagnostic}} com 4 razões distintas (NoOpportunity, InsufficientData, LowConfidence, LongTail)
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d1-formulation, phd-d3-features, phd-d5-calibration]
---

# ADR-005 — Abstenção Tipada com 4 Razões Explícitas

## Contexto

A armadilha **T5 — Design de abstenção tipada** (§3.5 briefing) estabelece que tratar abstenção como monolítica ("modelo não emite nada") perde informação. Três causas distintas para abstenção foram inicialmente identificadas:

- **Oportunidade inexiste**: nenhuma combinação `(x, y)` viável atinge floor de utilidade.
- **Dados insuficientes**: rota nova, halt recente, histórico < n_min.
- **Incerteza epistêmica alta**: dados existem mas IC do P é largo demais.

Literatura suporta design tipado: El-Yaniv & Wiener 2010 (*JMLR* 11); Geifman & El-Yaniv 2017 (*NeurIPS* — selective classification DL); Gangrade, Kag & Saligrama 2021 (*ICML* — selective regression).

D1 refinou a tipologia para **4 razões** após análise cruzada com D2 (longtail de longtail) e D3 (partial pooling).

## Decisão

O output do recomendador é um enum Rust:

```rust
pub enum Recommendation {
    Trade(TradeSetup),
    Abstain {
        reason: AbstainReason,
        diagnostic: AbstainDiagnostic,
    },
}

pub enum AbstainReason {
    /// Nenhuma tupla (enter_at, exit_at) atinge o floor de utilidade configurado
    /// pelo operador. Modelo tem confiança nos dados, mas não há trade viável.
    NoOpportunity,

    /// Rota tem histórico insuficiente (n < n_min). Listing novo, halt recente,
    /// delisting anunciado, mudança de ticker, etc.
    InsufficientData,

    /// Dados existem (n ≥ n_min), mas largura do IC 95% excede τ_abst configurado.
    /// Modelo tem incerteza epistêmica alta — possivelmente regime transition,
    /// feature shift, calibração degradada recentemente.
    LowConfidence,

    /// Distribuição amostral apresenta cauda excepcional (p99 > 3× p95 em janela
    /// rolante) — spike event, hack, exchange manipulation. Modelo não treinou
    /// para este regime; melhor abster-se que extrapolar.
    LongTail,
}

pub struct AbstainDiagnostic {
    pub n_observations: u32,           // histórico disponível da rota
    pub ci_width_if_emitted: Option<f32>,  // presente se LowConfidence
    pub nearest_feasible_utility: Option<f32>,  // presente se NoOpportunity
    pub tail_ratio_p99_p95: Option<f32>,  // presente se LongTail
    pub model_version: semver::Version,
    pub regime_posterior: [f32; 3],    // calm / opportunity / event
}
```

### Parâmetros de configuração (via CLI/UI)

- **n_min** (default 500): observações mínimas para sair de `InsufficientData`.
  Fundamentação estatística: Serfling 1980 — quantis p95 ± 0.01 require n ≥ 0.05·0.95/0.01² ≈ 475. Arredondado para 500.
- **τ_abst_prob** (default 0.20): largura máxima do IC 95% de `realization_probability`.
- **τ_abst_gross** (default 0.5%): largura máxima do IC 95% de `gross_profit`.
- **tail_threshold** (default 3.0): razão `p99/p95` acima da qual ativa `LongTail`.
- **floor_utility** — vem de ADR-002 (default 0.8%).

### Métricas de qualidade da abstenção

- **Coverage rate** — fração de requests que emitem Trade.
- **Precision entre emitidos** — condicionada a `Recommendation::Trade(_)`.
- **Abstention quality por razão**:
  - `NoOpportunity`: fração de janelas pós-abstenção que de fato não tiveram trade lucrativo no shadow.
  - `InsufficientData`: fração de rotas com `n < n_min` que depois tornaram-se produtivas (falso negativo estrutural).
  - `LowConfidence`: fração de abstenções em que o spread subsequente superou floor.
  - `LongTail`: fração de abstenções em regimes classificados ex-post como spike events.

## Alternativas consideradas

### Abstenção binária (monolítica)

- Output `Option<TradeSetup>` — `None` = abstém.
- **Rejeitada**: perde informação diagnóstica; operador não sabe se deve ajustar floor, esperar mais dados, ou ignorar rota.

### Abstenção ternária (sem LongTail)

- Apenas `NoOpportunity` / `InsufficientData` / `LowConfidence`.
- **Rejeitada**: D2 reporta 2–5 halts/mês + 15–30 listings/mês + spike events; dimensão LongTail é suficientemente recorrente para merecer tratamento explícito.

### Cost-sensitive learning ternário (sucesso / falha / abstenção)

- Treinar modelo com rótulo ternário e custo assimétrico de erro por classe.
- **Rejeitada**: mistura detecção de oportunidade com meta-decisão de abstenção; interfere com calibração de `realization_probability`. Meta-labeling com modelo de abstenção separado (ADR-006) é conceitualmente mais limpo.

### Rejection option no CQR

- Geifman & El-Yaniv 2017 propõem coupling rejection com a própria regressão.
- **Parcialmente adotada**: a `LowConfidence` usa essa lógica (IC largo → abstém).

## Consequências

**Positivas**:
- Operador tem interpretabilidade: entende por que modelo não emitiu.
- Métricas diferenciadas permitem detectar qual causa de abstenção está dominando — diagnóstico de problemas sistêmicos.
- `InsufficientData` + partial pooling (D3/ADR-007) cobrem cold-start graciosamente.
- `LongTail` protege contra extrapolação catastrófica em spike events (T4 + T8 combinados).
- `LowConfidence` integra naturalmente com CQR + Adaptive (ADR-004).

**Negativas**:
- Complexidade do output maior que `Option<T>` — consumers (UI, logs, metrics) precisam distinguir 5 variantes.
- Parâmetros default (n_min=500, τ_abst_prob=0.20, etc.) são estimativas iniciais; calibração empírica exige shadow mode ≥ 30 dias.

**Risco residual**:
- **Abstenção excessiva** (modelo foge de tudo) → coverage rate colapsa, operador não recebe recomendação útil. Mitigação: kill switch no dashboard se `abstention_rate > 0.95` por 1h (ADR-012 D10 pendente).
- **Abstenção insuficiente** (modelo emite onde deveria abster-se) → T11 execution failures. Mitigação: shadow haircut + métrica "fração emitida que o operador ignorou".

## Status

**Aprovado** para Marco 1. Parâmetros default revisáveis após 30 dias de shadow mode.

## Referências cruzadas

- [D01_formulation.md](../00_research/D01_formulation.md) — output design.
- [D03_features.md](../00_research/D03_features.md) — partial pooling + n_min fundamentação.
- [D05_calibration.md](../00_research/D05_calibration.md) — `LowConfidence` via IC.
- [T05_abstention.md](../02_traps/T05-abstencao-tipada.md).
- [T06_cold_start.md](../02_traps/T06-cold-start.md).
- [ADR-002](ADR-002-utility-function-u1-floor-configuravel.md) — floor controla `NoOpportunity`.
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — CQR controla `LowConfidence`.

## Evidência numérica

- n_min = 500 derivado de Serfling 1980 para quantis `p95 ± 0.01`.
- El-Yaniv & Wiener 2010 *JMLR* — selective classification reduz error rate em 30–60% em benchmarks típicos às custas de coverage 40–70%.
- Geifman & El-Yaniv 2017 *NeurIPS* — selective classification DL atinge 99% precision em ImageNet com 50% coverage — demonstra viabilidade do trade-off em alta precisão.
