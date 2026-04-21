---
name: ADR-013 — Protocolo de Validação Shadow + Rollout em 4 Fases
description: Protocolo operacional de validação pré-produção em 4 fases (shadow puro, operador-assisted, canary por rota, rollout gradual) com gates quantificados, kill switch 6-gates, e mitigação T3/T12
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d10-validation-v2]
---

# ADR-013 — Protocolo de Validação Shadow + Rollout em 4 Fases

## Contexto

Antes de colocar modelo A2 composta (ADR-001) em produção com operador discricionário real, é necessário protocolo de validação que:

1. **Detecta miscalibração** empírica em regime longtail (ECE, precision, coverage).
2. **Mitiga T3** — gap entre distribuição observacional (backtest) e intervencional (produção com execução real).
3. **Mitiga T12** — feedback loop via recomendações que movem mercado.
4. **Calibra T11** — haircut empírico entre spread cotado e realizado.
5. **Valida T7** — portfolio penalty em eventos correlacionados reais.
6. **Rollout escalonado** com rollback atômico.

Literatura canônica:
- Google SRE (Beyer et al. 2016) — canary + dark launch.
- Kohavi, Tang & Xu 2020 book — *Trustworthy Online Controlled Experiments*.
- Pearl 2009 — *Causality*.
- Rosenbaum & Rubin 1983 *Biometrika* 70 — propensity scoring.
- Bang & Robins 2005 *Biometrics* 61 — doubly robust.

## Decisão

Adotar **protocolo de validação em 4 fases** conforme D10 (`00_research/D10_validation.md`):

### Fase 1 — Shadow mode puro (30–60 dias)

- Modelo A2 roda em thread dedicada (ADR-010).
- Emite `TradeSetup` **sem operador ver**; logs persistidos em QuestDB (ADR-012).
- Baseline A3 ECDF+bootstrap roda sempre em paralelo (ADR-001 shadow).
- Labels triple-barrier (ADR-009) aplicadas post-hoc para calcular ECE, precision@k, reliability por regime (D2).

**Gates para avançar Fase 2**:
- `ECE_global_30d < 0.03`.
- `precision@10_30d ≥ 0.60` em cada perfil (conservador/médio/agressivo — D4).
- `DSR > 1.5`.
- `coverage_IC95 ≥ 0.90`.
- `abstention_rate < 0.85`.
- `n_label_positivo ≥ 500` por perfil.

**Duração mínima 30 dias**; estender para 60 dias se **< 3 episódios de regime event** observados (D2 reporta 2–5 halts/mês; coleta insuficiente = extensão).

### Fase 2 — Operador-assisted (30 dias)

- Recomendações **visíveis** ao operador; decisão dele executar ou não.
- Cada decisão registrada: `{Executou, Ignorou, Reverteu, StopLoss}` + `was_recommended: bool`.
- **Haircut empírico**: para trades executados, coletar `(rota, size, tod, S_quoted, S_realized)`; regressão `haircut(rota, size, tod)`.
- **T3 gap medição**: `P(realize | executed) − P(realize | not_executed)` — se `> 0.15`, viés causal material (ver §T3 abaixo).

**Gates para avançar Fase 3**:
- `ECE_4h < 0.04`.
- `precision@10 ≥ 0.65`.
- `T3_gap < 0.15` OU propensity scoring corrigido com IPW satisfatório.
- `n_trades_executados ≥ 50`.

### Fase 3 — Canary por rota (14 dias)

- **Top-20 rotas por vol24h** divididas 10 A2 vs 10 A3.
- **Rotação a cada 7 dias** para controlar confounding rota-específico.

**Power analysis formal**:
- `p0 = 0.65, p1 = 0.70, α_Bonferroni = 0.005` (corrigido para 10 pares), `β = 0.20`.
- `n_ajustado ~ 13.220 amostras/braço` (ajuste ICC=0.02 para clustering intra-rota).
- Volume snapshots: 17k req/s → n atingido em < 1h.
- **Unidade limitante são trades executados (~5/dia)** — precision@k calculada sobre snapshots emitidos, não trades.

**Gates para avançar Fase 4**:
- `Δ precision@10 ≥ 0.05` com `p < 0.05`.
- `ECE_4h < 0.04` em todas as rotas tratamento.

### Fase 4 — Rollout gradual (21 dias)

Escalonamento:
- **Dia 1–7**: 20% das rotas servidas por A2.
- **Dia 8–14**: 50%.
- **Dia 15–21**: 100%.

Em cada transição: `ECE_24h`, `precision@10_24h`, `share_of_daily_volume` (T12) avaliados. **Rollback atômico** via `ArcSwap<[TradeSetup; 2600]>` (ADR-010) em < 1 µs.

### Kill switch automático (6 gates)

| # | Gate | Threshold | Ação |
|---|---|---|---|
| 1 | ECE_4h | > 0.05 | Kill global → fallback A3 |
| 2 | precision@10_24h | < baseline_A3_median − 0.05 | Kill global |
| 3 | coverage_4h | < nominal − 0.05 em ≥ 2 estratos | Kill global |
| 4 | abstention_rate_1h | > 0.95 por 1h | Kill global + investigar |
| 5 | inference_p99_us | > 100 µs (ADR-010 circuit breaker) | Kill global |
| 6 | share_of_daily_volume | > 15% por rota | Desativa ML per-rota (não kill global) |

**Pós-kill**: `ArcSwap` atômico para A3; alert Alertmanager; deploy bloqueado até retreino manual aprovado. **FP rate estimado ~1.5 kills/semana** com threshold 0.05 (confiança 65%); ajustar para 0.06 se operador considerar excessivo.

### Mitigação T3 — Observacional vs causal

Protocolo em camadas (D10 §5.2):

1. **Propensity scoring** (Rosenbaum & Rubin 1983 *Biometrika* 70(1)): modelo auxiliar `P(execute | features)` + IPW (Inverse Propensity Weighting) para ajustar `P(realize)` histórica inflada.
2. **Doubly robust estimation** (Bang & Robins 2005 *Biometrics* 61(4)): combina propensity + outcome model; robusto a mis-specification de qualquer um.
3. **Double/debiased ML** (Chernozhukov et al. 2018 *Econometrics Journal* 21(1)): sample-split + cross-fitting para efeito causal limpo.
4. **Features proxy**:
   - `time_alive_before_emit` — peer-effect (quanto tempo oportunidade estava visível antes de emitir).
   - `book_depth_at_entry` — size-effect.
   - `velocity_spread` — velocity (spread evanescente).
5. **Counterfactual evaluation**: outcomes não-executados da Fase 1 shadow como counterfactual para calibrar gap na Fase 2.

### Mitigação T12 — Feedback loop

Thresholds de D6 (ADR-011) validados empiricamente em D10:

- `share_of_daily_volume > 5%` → **flag** ativo em dashboard.
- `> 10%` → **alert** email/slack.
- `> 15%` → **desativa ML** per-rota (não kill global); rota servida por A3.

Protocolo:
1. Log `was_recommended: bool` em cada trade.
2. Retreino exclui `was_recommended = true` + buffer `2·T_max` (até 48h).
3. **Auditoria ECE split semanal**: `ECE_recommended` vs `ECE_not_recommended`; divergência `> 0.03` → revisão manual.
4. **Hold-out 5% rotas** (130 de 2600) sem recomendações como grupo de controle; operador orientado a ignorar; **única forma de detectar feedback loop abaixo de 5% share**.
5. **Rotação de hold-out a cada 30 dias** para evitar stratification effect.

### Dashboard operacional

Stack: tikv/rust-prometheus (já na stack) + Grafana + Alertmanager.

Métricas prioritárias:
- Reliability diagram rolante 1h/4h/24h por estrato (regime D2, venue-pair).
- ECE rolling (Nixon et al. 2019 adaptive ECE).
- Precision@k rolling por perfil operador.
- Coverage empírica IC 68/90/95%.
- Abstention rate por reason code (4 razões — ADR-005).
- Setups emitted vs executed — gap sinaliza T3.
- Haircut empírico cotado vs realizado.
- Drift detector status (ADWIN).
- Kill switch history + frequência.
- Cluster correlated emissions (T7).
- `share_of_daily_volume` per rota (T12).

### Ablation study em produção

Rotacionar em canary 5% rotas por 3–7 dias:

- Sem família E (regime) → quanto ECE degrada?
- Sem família G (cross-route penalty) → quantas duplicate emissions?
- Sem CQR (apenas quantile regression) → ECE sobe quanto?
- Sem adaptive conformal → coverage colapsa em shift?
- Sem meta-labeling → precision degrada?

## Alternativas consideradas

### Deploy direto sem shadow

- **Rejeitado absolutamente**. T3 inerente + T11 não-calibrado = catástrofe.

### Shadow < 30 dias

- **Rejeitado**: D2 reporta 2–5 halts/mês; shadow curto não vê episódios de regime event. Kohavi 2020 sugere ≥ 4 semanas para A/B significativo.

### Fase 3 canary per-user

- Operador é **único** → per-user não aplicável. Per-rota é a única opção viável.

### Rollout binário 0→100%

- **Rejeitado**: risco inaceitável; gradual 20/50/100% é padrão SRE.

### Rollout mais gradual (10→25→50→75→100%)

- Considerado. **Confidence 60%**: operador decide; default 20/50/100% para balance entre rapidez e cautela.

## Consequências

**Positivas**:
- Risco de falha em produção minimizado por detecção em shadow/canary antes.
- T3, T7, T11, T12 endereçados estruturalmente.
- Rollback atômico < 1 µs via `ArcSwap` (ADR-010).
- Dashboard dá visibilidade operacional completa.

**Negativas**:
- Delay total: 30 + 30 + 14 + 21 = **95–125 dias** até full production.
- Dual pipeline (A2 + A3 shadow) custa +50% infraestrutura.
- Operador precisa **orientar-se a ignorar** hold-out (T12) — disciplina requerida.

**Risco residual**:
- **Shadow não pega viés causal** se operador não executa nada na Fase 1 → `T3_gap` não calibrável. Mitigação: Fase 2 força execução real.
- **T12 cumulativo** distribuído em < 5% per-rota pode agregado ultrapassar threshold global. Mitigação: métrica `total_share_executed` agregada.
- **Adversarial market maker** detecta operador e armadilha. Out of scope D10; mitigação via position sizing em capital management (fora do escopo do scanner).

## Status

**Aprovado** para Marco 2 finalização + Marco 3 rollout.

## Referências cruzadas

- [D10_validation.md](../00_research/D10_validation.md) — protocolo completo.
- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — A2 + A3 baseline.
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — kill switch ECE.
- [ADR-010](ADR-010-serving-a2-thread-dedicada.md) — circuit breaker + `ArcSwap` rollback.
- [ADR-011](ADR-011-drift-detection-e5-hybrid.md) — T12 thresholds + `was_recommended`.
- [ADR-012](ADR-012-feature-store-hibrido-4-camadas.md) — storage de logs.
- [T03_causal_vs_observational.md](../02_traps/T03-causal-vs-observational.md).
- [T07_cross_route.md](../02_traps/T07-cross-route.md).
- [T11_execution_feasibility.md](../02_traps/T11-execution-feasibility.md).
- [T12_feedback_loop.md](../02_traps/T12-feedback-loop.md).
- [10_operations/](../10_operations/) — runbook detalhado (pendente preenchimento durante Marco 1).

## Evidência numérica

- Power analysis Fase 3: n=13.220/braço com Bonferroni p<0.005, ICC=0.02, p0=0.65, p1=0.70 (Cohen 1988 sample size formula).
- Kill switch FP rate ~1.5/semana com threshold 0.05 (estimativa D10; confiança 65%).
- 95–125 dias total: Fase 1 (30–60) + Fase 2 (30) + Fase 3 (14) + Fase 4 (21).
- `ArcSwap` rollback < 1 µs atômico (D8 benchmark).
- Propensity scoring + IPW reduz viés observacional em 30–80% em benchmarks de observational causal inference (Athey & Imbens 2019 *Annual Rev Econ* 11).
