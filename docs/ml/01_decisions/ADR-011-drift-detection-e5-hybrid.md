---
name: ADR-011 — Drift Detection E5 Hybrid (Adaptive Conformal + ADWIN + Retreino Emergencial)
description: Estratégia híbrida de drift handling combinando adaptive conformal (D5 γ=0.005) para drift lento, ADWIN custom Rust sobre residuais de calibração para drift moderado, e retreino emergencial Python para drift abrupto
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d6-drift, phd-d5-calibration]
---

# ADR-011 — Drift Detection E5 Hybrid

## Contexto

Longtail crypto tem não-estacionariedade severa e característica do regime (D2):
- **15–30 listings/mês**.
- **2–5 halts/mês**.
- **3–8 delistings/mês**.
- Funding schedule changes; fee tier updates; eventos macro.

Modelo treinado em janela X opera em janela X+k com distribuição diferente → calibração silenciosamente quebra.

D6 avaliou 5 estratégias:

| # | Estratégia | Recovery abrupto | Custo | Complexidade |
|---|---|---|---|---|
| E1 | Offline nightly retrain | 13–37h (inaceitável) | baixo | baixa |
| E2 | Offline hourly retrain | ~1h | **24× E1** inviável | baixa |
| E3 | Online incremental (HAT) | variável | médio | alta (800–1200 LoC) |
| E4 | Ensemble com drift detectors | médio | médio-alto | média-alta |
| **E5** | **Hybrid: Adaptive + ADWIN + Retreino emergencial** | **< 2h** | **baixo** | **média** |

## Decisão

Adotar **E5 Hybrid** como estratégia de drift handling, com 3 camadas acopladas:

### Camada 1 — Adaptive Conformal (γ=0.005) — drift lento

- Implementado em ADR-004 (Camada 3 de calibração).
- `α_t+1 = α_t + γ·(α* − 𝟙[y_t ∉ IC_t])`.
- Compensa distribution shift **lento** sem retreino.
- Zero custo adicional (já na stack).

### Camada 2 — ADWIN sobre residuais de calibração — drift moderado

**Algoritmo**: ADWIN (Bifet & Gavaldà 2007 *SDM*) sobre série de `|prob_predita − outcome_real|` por rota (residuais de calibração).

**Parâmetros**:
- `δ = 0.001` (nível de significância) — taxa de falso alarme < 1/1000.
- Janela adaptativa máxima: 2000 samples.
- Detecção de drift de 0.05 em erro em < 200 amostras.

**Implementação**:
- **~120 LoC Rust custom** (D6 confirmado).
- Zero dependências externas.
- Estado O(log W) por instância < 100 bytes.
- Para 2600 rotas: 260 KB total — negligível.

**Ação**: ao detectar drift, dispara **retreino emergencial** (Camada 3).

### Camada 3 — Retreino emergencial — drift abrupto

- **Trigger**: ADWIN fires OR `ECE_4h > 0.05` (kill switch D5 ADR-004).
- **Ação**: scheduler Python enfileira retreino; kill switch de D5 ativa fallback A3 até retreino terminar.
- **Pipeline**:
  1. Dump últimas 14 dias do feature store (ADR-012).
  2. Purged K-fold K=6 re-run (ADR-006).
  3. Export ONNX; self-test Rust (ADR-003).
  4. Hot-reload modelo (ADR-010).
- **Duração alvo**: < 45 min end-to-end.
- **Rollback automático**: se `precision@10_novo < precision@10_anterior × 0.95` em shadow 5 min pós-deploy, reverte via `ArcSwap<Model>`.

### Decision tree de retreino (5 triggers)

| # | Trigger | Latência ação | Ação |
|---|---|---|---|
| T1 | Scheduled (nightly 04:00 UTC) | Planejada | Retreino completo janela rolante 14 dias |
| T2 | ADWIN change detected | < 1h | Retreino emergencial |
| T3 | ECE_4h > 0.05 | < 1h | Retreino emergencial + kill switch fallback |
| T4 | Manual (operador CLI) | imediata | Retreino com motivo logado |
| T5 | Rollback automático | imediata | Reverte para previous model |

Sistema **nunca retrain opacamente** — todo retreino tem causa auditável em `08_drift_reports/`.

### T12 — Feedback loop

Severidade em longtail com operador único: **marginal para rotas com share de execução < 5% do vol24**.

**Thresholds**:
- `share_of_daily_volume > 5%` → monitoramento ativo (log `was_recommended` flag extra).
- `> 15%` → **desativar ML para a rota** específica; fallback A3.

**Protocolo**:
- Log explícito `was_recommended: bool` em cada trade executado (integra com D10 shadow).
- Retreino exclui amostras contaminadas + buffer de `2·T_max` minutos após cada trade recomendado.
- Auditoria semanal: `ECE_recommended vs ECE_not_recommended` — divergência > 0.03 → revisão manual.

## Alternativas consideradas

### E1 offline nightly puro

- **Rejeitada**: halt abrupto às 15:00 UTC deixa modelo operando com distribuição errada por até 13h antes do próximo retreino. Com 2–5 halts/mês → 26–65h/mês de modelo desalinhado. Cerqueira et al. 2022 *JAIR* 74 demonstram E1 captura apenas 85–92% da performance ótima para drift *gradual* — não cobre shifts abruptos.

### E2 offline hourly

- **Rejeitada**: 24 retreinos/dia × ~30 min CPU cada = 12h CPU/dia por modelo. Inviável single-node. Goldenberg & Webb 2019 *ML Journal* 108 reportam apenas 6% ganho de E2 sobre E1 — não justifica custo 24×.

### E3 online incremental (Hoeffding Adaptive Tree)

- **Rejeitada**: Losing, Hammer & Wersing 2018 *Neurocomputing* 275 reportam gap de 11% accuracy entre HAT online e batch RF. `river` Python é proibido no hot path (ADR-003). HAT nativo Rust custaria 800–1200 LoC custom. Performance inferior com custo 4–6× maior que E5.

### E4 ensemble com múltiplos detectors

- **Parcialmente adotada em E5**: usa ADWIN, mas não ensemble (DDM + EDDM + KSWIN paralelos). Benchmarks Bifet et al. 2010 *JMLR* 11 mostram ADWIN dominante em regime longtail-like.

### `changepoint 0.13.0` BOCPD em vez de ADWIN

- **Rejeitada**: BOCPD (Adams & MacKay 2007) assume distribuição normal entre changepoints, violando heavy tails α ~ 3 de D2. ADWIN é não-paramétrico e tem garantias PAC (Probably Approximately Correct) — superior neste regime.

## Consequências

**Positivas**:
- Recovery time pós-halt: < 2h (E5) vs 13–37h (E1 puro).
- Custo incremental sobre E1: 7 dias-engenharia + 120 LoC ADWIN.
- Detecção formal (PAC) de drift — não depende de threshold mágico.
- Integrada com kill switch D5 via fallback A3.
- T12 endereçado estruturalmente com thresholds quantificados.

**Negativas**:
- Complexidade operacional: 3 camadas + 5 triggers + rollback.
- ADWIN por rota × 2600 rotas = 2600 detectores paralelos; manutenção disciplinada necessária.
- Retreino emergencial bloqueia deploy de features até terminar.

**Risco residual**:
- **False positives de ADWIN** em regime event legítimo (não drift, apenas outlier). Mitigação: δ=0.001 conservador; logs detalhados para revisão.
- **Drift gradual não detectado** (abaixo do radar do ADWIN). Mitigação: scheduled retreino T1 cobre com baseline 24h.
- **Retreino contaminado** por T12 feedback. Mitigação: exclusão `was_recommended` + auditoria ECE split.

## Status

**Aprovado** para Marco 2 (post-MVP). MVP V1 opera com E1 nightly + kill switch D5; E5 completo entra em V2 (8 semanas pós-deploy inicial).

## Referências cruzadas

- [D06_online_drift.md](../00_research/D06_online_drift.md) — análise E1–E5 completa.
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — adaptive conformal (Camada 1).
- [ADR-010](ADR-010-serving-a2-thread-dedicada.md) — hot-reload e circuit breaker.
- [ADR-012](ADR-012-feature-store-hibrido-4-camadas.md) — dump do feature store para retreino.
- ADR-005 `InsufficientData` (abstenção) integra com retreino de rotas novas.
- [T08_distribution_shift.md](../02_traps/T08-distribution-shift.md).
- [T12_feedback_loop.md](../02_traps/T12-feedback-loop.md).

## Evidência numérica

- ADWIN benchmark comparativo: Bifet et al. 2010 *JMLR* 11 — detecta shift 0.05 error em <200 amostras; 2–3× mais rápido que DDM para drifts abruptos.
- Adaptive γ=0.005: Zaffran et al. 2022 *ICML* — cobertura empírica dentro de 1pp de nominal em M4 dataset.
- HAT vs batch RF gap: Losing, Hammer & Wersing 2018 *Neurocomputing* 275 — 11% accuracy gap médio em streaming benchmarks.
- Recovery time E1 puro estimativa: janela retreino 04:00 UTC; halt 15:00 UTC → 13h modelo stale; até ECE retornar normal após retreino (4h) → 37h worst case.
- T12 threshold 5% / 15%: propostas conservadoras em D6; validação empírica após V2 deploy em shadow.
