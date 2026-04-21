---
name: ROADMAP — Implementação do Stack ML TradeSetup
description: Três marcos sequenciais após revisão crítica 2026-04-20. Marco 0 (novo) incorpora infra + coleta empírica pura; Marco 1 (antes era Marco 2) é modelo composto + shadow; Marco 2 (antes era Marco 3) é drift + validação + rollout.
type: roadmap
status: approved
author: operador + critica-review
date: 2026-04-20
version: 2.0.0
supersedes: ROADMAP v1.0.0 (2026-04-19)
---

# ROADMAP — Implementação do Stack ML TradeSetup

## 0. Nomenclatura de Marcos (após revisão crítica 2026-04-20)

Nos ADRs 019, 020, 022, 023, 024 (escritos em 2026-04-20), "Marco 2" e "Marco 3" referem-se à numeração **pré-renumeração**. Equivalência:

| Na ADR | No ROADMAP vigente |
|---|---|
| Marco 1 (original, infra + A3 2-3 sem) | absorvido em **Marco 0** |
| Marco 2 (modelo composto + shadow) | **Marco 1** |
| Marco 3 (drift + validação + rollout) | **Marco 2** |

Toda referência a "Marco N" neste documento usa a numeração nova (0/1/2). Na leitura dos ADRs afetados, aplique a equivalência acima.

---

## 1. Visão geral

Três marcos sequenciais. Cada marco tem **gating metrics** — operacionais, empíricos, econômicos e de calibração — que devem ser atingidas antes de avançar. Falha em qualquer gate não é bloqueador absoluto mas **exige justificativa explícita e reabertura de ADR relevante** (protocolo ADR-021).

Total esforço estimado: **22–32 semanas-pessoa** distribuído em 5–7 meses calendário, com paralelismo limitado em Marco 1.

**Gates inegociáveis em todos os Marcos**:
- Zero-alloc verification antes de qualquer deploy em produção.
- Leakage audit CI PASS (ADR-006) em todas PRs.
- LOVO (leave-one-venue-out, ADR-023) PASS em todas PRs pós-Marco 0.
- PIT API obrigatória em todas queries de features de treino.
- Baseline A3 rodando sempre em shadow como safety net.

---

## 2. Marco 0 — Coleta empírica + Infra + A3 baseline (4–6 semanas)

**ADR de autoridade**: [ADR-018](../01_decisions/ADR-018-marco-0-coleta-empirica-antes-de-modelo.md).

**Objetivo**: construir infraestrutura operacional (feature store, serving, dashboards) e baseline A3 ECDF, acumular ≥ 30 dias de dados empíricos reais do regime longtail antes de construir qualquer modelo ML. Validar ou refutar 11 projeções estruturais D2/D4 usadas em ADRs aprovados.

### Escopo

**Implementação (semanas 1–3)**:
- Feature store (ADR-012): `redb 2.3` hot buffer + QuestDB ingest + PIT API + CI `dylint` check.
- **Baseline A3** (ADR-001): ECDF condicional + bootstrap empírico; < 300 LoC Rust; latência < 1 µs/rota.
- Serving A2 thread dedicada (ADR-010) rodando apenas A3.
- Output tipado (ADR-005): enum `Recommendation` com 4 razões de abstenção (5 se ADR-017 já aprovado após ≥ 30 dias de E4).
- Shadow mode infrastructure: emissão sem execução; logs persistidos em QuestDB.
- **RawSample stream contínuo** (ADR-025): `RawSampleWriter` + `RouteDecimator` 1-in-10; paralelo ao `AcceptedSample` para medir gates E1/E2/E4/E6/E8/E10/E11 sem viés de truncamento. Pré-requisito das medições empíricas abaixo.
- Dashboard Prometheus + Grafana com as 15 séries temporais obrigatórias (ADR-018 §Dashboard Marco 0).
- CI leakage audit (ADR-006): crate `ml_eval` com 5 testes bloqueantes.
- Zero-alloc verification (MIRI + GlobalAlloc counter + heaptrack sustained 1h).
- **Gating econômico infrastructure** (ADR-019): cálculo de `simulated_pnl_bruto_aggregated` persistido em QuestDB — consome série RawSample (ADR-025) para reconstituir trajetórias.
- **Confiança operacional básica** (ADR-024): track record jsonl + reliability diagram real-time + weekly report semanal.
- **LOVO** (ADR-023) sobre baseline A3: registrar baseline de viés por venue mesmo no A3 — LOVO sobre RawSample (ADR-025), não sobre AcceptedSample, para distribuição não-enviesada por venue.

**Coleta empírica (paralela semanas 2–6)**:
- Execução do A3 em shadow coletando as 11 projeções E1–E11 listadas em ADR-018.
- Relatórios diários automáticos acumulando em `docs/ml/05_benchmarks/marco_0_daily/YYYY-MM-DD.md`.
- Relatório consolidado ao final de Marco 0 em `docs/ml/05_benchmarks/marco_0_empirical_report.md`.

**NÃO incluído** (movido para Marco 1):
- ❌ Modelos ML (QRF, CatBoost, RSF, HMM, Temperature Scaling, CQR, Adaptive Conformal).
- ❌ Training pipeline Python.
- ❌ Função de utilidade U₁ com floor além da trivial.
- ❌ Drift detection ADWIN.

### Gating metrics — Marco 0 → Marco 1

**Operacionais (necessários)**:
- `feature_store_write_throughput ≥ 50k/s` sustentado 1h.
- `pit_api_test_coverage = 100%` (todas leituras usam `as_of`).
- `leakage_audit_ci = PASS` (5 testes verdes).
- `circuit_breaker_fallback_a3 < 100 µs/rota`.
- `zero_alloc_sustained_1h = PASS`.
- `a3_inference_p99 < 1 µs/rota`.
- `dashboard_uptime_24h ≥ 99.9%`.
- LOVO sobre A3 executado e baseline por venue registrado.
- **`raw_samples_emitted ≥ 1M` em ≥ 7 dias consecutivos** (ADR-025): cobertura de ≥ 260 rotas com ≥ 1k obs cada; distribuição per-venue dentro de ±5pp da prevalência real.
- **`raw_samples_dropped_channel_full / raw_samples_emitted < 0.1%`**: backpressure do writer não enviesa a série.

**Empíricos (ADR-018)**:
- Coleta contínua ≥ 30 dias consecutivos completados.
- ≥ 9 das 11 projeções E1–E11 confirmadas ou refutadas com evidência documentada.
- Relatório consolidado de Marco 0 publicado.

**Econômicos (ADR-019)**:
- `simulated_pnl_bruto_aggregated_30d_a3` registrado como baseline absoluto.

**Simulação pré-Marco 1 obrigatória (ADR-020)**:
- Aplicar os 4 filtros simulados sobre snapshot de Marco 0 (≥ 30 dias).
- Se `useful_emissions_per_hour_agg_simulated < 3`: **bloqueio de Marco 1** — revisitar floor, τ's e critérios de toxicity/cluster.
- Relatório em `docs/ml/05_benchmarks/pre_marco_1_emission_simulation.md`.

**Promoção/rejeição de ADRs condicionais**:
- **ADR-017** (execution window guard): promover para `approved` se `median(D_{x=2%}) < 2s` confirmado; rejeitar se `≥ 10s`; condicional se intermediário.
- Gatilhos ADR-021 avaliados: se qualquer E1–E11 divergir > 20% da projeção, reabrir ADRs dependentes antes de Marco 1 iniciar.

### Esforço: 4–6 semanas, 1 pessoa

---

## 3. Marco 1 — Modelo A2 composta + Calibração + Shadow (7–10 semanas)

**ADRs de autoridade**: [ADR-001](../01_decisions/ADR-001-arquitetura-composta-a2-shadow-a3.md), [ADR-022](../01_decisions/ADR-022-priorizacao-marco-2-core-estendido-nice.md) (priorização).

**Objetivo**: modelo ML completo operando em shadow; calibração auditada; gates econômicos e de volume atingidos; dados empíricos para calibrar T3/T11 em operação real.

### Escopo tier Core (ADR-022 — não-negociável)

- Training pipeline Python (dataset builder + triple-barrier 48 labels ADR-009 + purged K=6 embargo 2·T_max ADR-006).
- **QRF** (Quantile Regression Forest) para quantis de G unificado (ADR-008).
- **Joint forecasting via G unificado** (ADR-008).
- **Utility function U₁** com floor configurável (ADR-002) — default 0.8%.
- **Temperature Scaling** marginal (Camada 1 ADR-004).
- **ONNX export + Rust self-test** `rtol=1e-4` (ADR-003).
- **Shadow fase 1** (30 dias emissão sem execução).
- **Gating econômico em shadow** (ADR-019).
- **LOVO** (ADR-023) em todas PRs — CI bloqueante.
- **Leakage audit** (ADR-006) em todas PRs — CI bloqueante.
- **Contrato de output** (ADR-016 + ADR-017 se aprovado): thresholds + distribuição de quantis empíricos + `realization_probability` via CDF + toxicity + cluster + horizon p05.
- **Explicabilidade contrastiva** no struct (ADR-024 Componente 1): TreeSHAP aproximado para top-3 positive/negative drivers.
- **Feedback loop operador→ADR** (ADR-024 Componente 4).
- **Features MVP** (ADR-014 ou refinamento pós-Marco 0): 15 features em 6 famílias (spreads-only) ou refinadas com evidência empírica.

### Escopo tier Estendido (ADR-022 — adiável se prazo derrapar)

- CatBoost MultiQuantile (condicional em features) — ganho esperado +5–10 pp precision@10.
- Temperature Scaling per-regime (Camada 2 ADR-004).
- CQR distribution-free (Camada 3 ADR-004).
- RSF (Random Survival Forest) para horizonte — se não, estatística empírica simples sobre dados de Marco 0.
- Monitoring reliability diagram online (já em dashboard Marco 0; aqui é instrumentação no modelo).

### Escopo tier Nice-to-Have (ADR-022 — cortar primeiro)

- HMM 3-estado regime — adiar para Marco 2; features de regime como proxy no interim.
- Adaptive Conformal dinâmico — Marco 2.
- Shadow fase 2 (operador-assisted) — move para Marco 2.
- Ablation study contínuo — ablation pontual em PR, não contínuo.

### Gating metrics — Marco 1 → Marco 2

**ML tradicionais**:
- `precision@10_shadow_30d ≥ baseline_A3_precision@10 + 0.05` (5 pp acima).
- `ECE_global_30d ≤ 0.03`.
- `ECE_per_regime ≤ 0.05` (quando HMM ou proxies de regime implementados).
- `coverage_IC95 ≥ 0.93`.
- `DSR > 2.0` em purged K-fold.
- `leakage_audit_passes` em todas PRs.

**LOVO (ADR-023)**:
- `LOVO_precision@10_worst_drop ≤ 0.15`.
- `LOVO_ECE_worst ≤ 0.08`.
- `LOVO_coverage_worst ≥ 0.85`.

**Econômico (ADR-019)**:
- `simulated_pnl_bruto_30d_modelo ≥ 1.20 × baseline_A3_30d` OU `economic_value_over_a3_30d ≥ threshold_absoluto` (calibrado em Marco 0).
- `realization_rate_30d ≥ 0.70`.
- `pnl_per_emission_median_30d ≥ 0.5% × capital_hipotético`.

**Volume útil (ADR-020)**:
- `useful_emissions_per_hour_agg_24h ≥ τ_volume_min_agg` (calibrado em Marco 0).
- `useful_to_scanner_ratio_1h ≥ 0.05`.
- `n_rotas_com_ao_menos_1_emissao_7d ≥ 0.15 × total_rotas_ativas`.

**Protocolo revisão (ADR-021)**:
- Nenhum ADR com status `REOPEN_TRIGGERED` não resolvido.
- Relatório mensal de revisão publicado.

### Decisões fim de Marco 1

- Se `economic_value_over_a3_30d < 0` apesar dos gates ML: **simplificar para A3 puro em produção**; Marco 1 redesenhado via reabertura de ADRs.
- Se `LOVO_worst_drop > 0.15`: reabrir ADR-001 e ADR-007 (ADR-021 dispara).
- Se `useful_emissions_per_hour_agg < τ_volume_min_agg`: reabrir ADR-002 (floor) e ADR-005 (τ abstention).

### Esforço: 7–10 semanas, 2 pessoas (1 Rust, 1 Python ML)

---

## 4. Marco 2 — Drift detection + Validação completa + Rollout (10–14 semanas, incluindo Marco 1)

**ADRs de autoridade**: [ADR-013](../01_decisions/ADR-013-validation-shadow-rollout-protocol.md), [ADR-011](../01_decisions/ADR-011-drift-detection-e5-hybrid.md).

**Objetivo**: sistema production-ready com E5 Hybrid drift + full validation + rollout escalonado.

### Escopo

- **E5 Hybrid drift** (ADR-011): ADWIN sobre residuais + 5 triggers retreino + rollback automático via `ArcSwap<Model>` + T12 thresholds.
- **Validação completa** (ADR-013):
  - Shadow fase 2 (operador-assisted, 30 dias): calibrar haircut empírico, medir T3_gap via propensity scoring.
  - Canary por rota (14 dias) com power analysis Bonferroni p<0.005.
  - A/B discriminado por rota.
  - Rollout escalonado: 20% (dia 1–7) → 50% (8–14) → 100% (15–21).
- **Propensity scoring / doubly robust** para T3 mitigação.
- **Haircut empírico function** calibrada e deployada.
- **Kill switch completo** — 10 gates (6 originais + 4 dos ADRs 019 e 020):
  - ECE_4h > 0.05
  - precision@10_24h < baseline_A3 − 0.05
  - coverage < nominal − 0.05 em ≥ 2 estratos
  - abstention_rate_1h > 0.95 (diagnóstico, não kill)
  - inference_p99 > 100 µs (circuit breaker)
  - share_volume > 15% per-rota (desativa per-rota)
  - **economic_value_over_a3_30d < 0 por ≥ 7 dias** (ADR-019)
  - **pnl_per_emission_p10_30d < -2 × operator_attention_cost** (ADR-019, alerta)
  - **useful_emissions_per_hour_agg_24h < τ_volume_min_agg / 2 por ≥ 6h** (ADR-020)
  - **useful_to_scanner_ratio_1h < 0.01 por ≥ 12h** (ADR-020, alerta)
- **Ablation study em produção**: rotação periódica de famílias para quantificar contribuição marginal.
- **Tier Estendido e Nice-to-Have** que foram adiados de Marco 1 (HMM 3-estado, Adaptive Conformal, CatBoost MultiQuantile se justificado).
- **Revisão trimestral** ADR-021 (após 90 dias de Marco 2 em produção).

### Gating metrics — Marco 2 → Steady state

- `precision@10_production ≥ precision@10_shadow × 0.90` (haircut máximo 10%).
- `ECE_rolling_4h ≤ 0.05` sustentado 14 dias.
- `coverage_IC95_rolling_4h ≥ nominal − 0.05` sustentado.
- `abstention_rate_1h` diagnóstico (não gate).
- `useful_emissions_per_hour_agg_24h ≥ τ_volume_min_agg` sustentado.
- `economic_value_over_a3_30d > 0` sustentado em 30 dias consecutivos.
- `drift_detection_false_positive_rate ≤ 1/semana` (ADWIN calibrado).
- `T3_gap ≤ 0.15` após propensity scoring.
- `rollback_test_sucessful` (verificação semanal).
- `LOVO_worst_drop ≤ 0.15` em shadow semanal.

### Esforço (Marco 0 + Marco 1 + Marco 2 totais): 21–30 semanas com 2 pessoas.

---

## 5. Dependências críticas

```
Marco 0 (coleta + infra + A3)
  ├─ ≥ 30 dias de dados
  ├─ ≥ 9 de 11 projeções E1–E11 confirmadas/refutadas
  ├─ Promoção ou rejeição de ADR-017
  ├─ Gatilhos ADR-021 avaliados (reaberturas se necessário)
  ├─ Simulação pré-Marco 1 emissões úteis ≥ 3/hora
  ↓
Marco 1 (modelo + shadow)
  ├─ Core obrigatório (10 itens ADR-022)
  ├─ Gates econômico + LOVO + volume útil em shadow
  ├─ Feedback loop operador→ADR ativo
  ↓
Marco 2 (drift + validação + rollout)
  ├─ Shadow fase 2 operador-assisted
  ├─ Kill switch 10 gates
  ├─ Revisão trimestral ADR-021
  ↓
Steady state (produção contínua + revisão trimestral)
```

---

## 6. Riscos do cronograma (atualizados)

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| 1 | Projeções E1–E11 divergirem > 20% em Marco 0 | Alta (>50%) | Médio | ADR-021 dispara reabertura de ADRs dependentes; esforço de reabertura absorvido no cronograma |
| 2 | Coleta Marco 0 > 6 semanas para atingir 9 de 11 projeções | Média (20–40%) | Baixo | Estender Marco 0 em incrementos de 15 dias; não bloqueia em si |
| 3 | ONNX CatBoost MultiQuantile export revela ops não suportados | Baixa (<20%) | Baixo (ADR-022) | Fallback A: QRF sozinho (tier Core) |
| 4 | MIRI false positive sobre `tract` | Baixa (<10%) | Moderado | Workaround via processo separado (reabertura ADR-010) |
| 5 | Rate limits para pesquisa | Média | Baixo | Scheduling |
| 6 | Simulação pré-Marco 1 revela < 3 emissões úteis/hora | Média | Alto (bloqueio) | Revisar τ's, floor, toxicity critérios; possível Marco 0b |
| 7 | `economic_value_over_a3_30d < 0` em Marco 1 mesmo após ajustes | Baixa–média | Alto | Simplificação para A3 puro em produção; investigação profunda |
| 8 | LOVO_worst_drop > 0.15 persistente | Média | Alto | Reabrir ADR-007 (features venue-aware) e/ou ADR-001 (arquitetura venue-aware) |
| 9 | Operador recusa a confiar no modelo após Marco 2 | Média | Alto | ADR-024 Componentes 1 + 4 + 5; shadow estendido se necessário |

---

## 7. Revisão

Este roadmap é revisado:
- Mensalmente nos primeiros 90 dias após Marco 0 (janela intensiva ADR-021).
- Ao final de cada Marco.
- Trimestralmente após 90 dias pós-Marco 0 em steady state.
- Ad-hoc quando gatilho de ADR-021 dispara.

## 8. Histórico

- **v1.0.0** (2026-04-19): roadmap inicial com 3 Marcos (1/2/3 originais).
- **v2.0.0** (2026-04-20): revisão crítica pós-auditoria — 10 pontos endereçados via 7 novos ADRs (018–024); renumeração para Marco 0/1/2; Marco 0 absorve Marco 1 original e adiciona coleta empírica + gates empíricos/econômicos/LOVO.
