---
name: Kill Switch — 6 Gates Automáticos + Ações
description: Contratos concretos dos gates de rollback automático do sistema ML; thresholds, janelas, ações e regeneração de confiança
type: spec
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# Kill Switch — 6 Gates Automáticos

Derivado de ADR-004, ADR-010, ADR-013. Implementação em thread ML (ADR-010) avaliada a cada 60s.

## Princípio

Sistema **nunca fica sem resposta**. Em qualquer falha detectada:

1. Modelo A2 composta é suspenso.
2. Baseline A3 ECDF+bootstrap (ADR-001) assume emissão com flag `calibration_status: kill_switch_active`.
3. Alert disparado via Alertmanager.
4. Deploys bloqueados até RCA + retreino + re-aprovação manual.

FP rate estimado com defaults: ~1.5/semana (D10 conf 65%).

## 6 Gates

### Gate 1 — ECE absoluto

```rust
if rolling_window(4h).expected_calibration_error > 0.05 {
    kill_switch.trigger(Reason::EceExceededGlobal);
}
```

- **Janela**: 4h rolling.
- **Threshold**: 0.05 (ajustável 0.05–0.07 via CLI).
- **Escopo**: global (todos os estratos).
- **Ação**: kill global → fallback A3.

### Gate 2 — Precision absoluta vs baseline

```rust
let p10 = rolling_window(24h).precision_at_k(10);
let baseline = baseline_a3_p10_median;
if p10 < baseline - 0.05 {
    kill_switch.trigger(Reason::PrecisionDegraded);
}
```

- **Janela**: 24h rolling (precision é ruidoso em janela menor).
- **Threshold**: 5pp abaixo da mediana histórica do baseline A3.
- **Escopo**: global por perfil (conservador/médio/agressivo).
- **Ação**: kill global.

### Gate 3 — Coverage IC empírico

```rust
for stratum in strata {
    let cov = rolling_window(4h).coverage_ic95(&stratum);
    if cov < 0.95 - 0.05 {
        stratum.kill();
    }
}
// Kill global apenas se ≥ 2 estratos falharam
if killed_strata.len() >= 2 {
    kill_switch.trigger(Reason::CoverageFailed);
}
```

- **Janela**: 4h rolling.
- **Threshold**: cobertura < (nominal − 0.05) em ≥ 2 estratos.
- **Estratos**: regime (calm/opportunity/event) × venue_pair.
- **Ação**: kill per-estrato primeiro; kill global se propagar.

### Gate 4 — Abstenção excessiva

```rust
if rolling_window(1h).abstention_rate > 0.95 {
    alert(Severity::P1, "modelo desistiu de quase tudo em 1h");
    if rolling_window(4h).abstention_rate > 0.90 {
        kill_switch.trigger(Reason::ExcessiveAbstention);
    }
}
```

- **Janela**: 1h para alert + 4h para kill.
- **Threshold**: > 0.95 (alert), > 0.90 sustentado 4h (kill).
- **Ação**: investigar causa antes de kill; kill se sustentado indica modelo colapsou.

### Gate 5 — Latência inferência (circuit breaker)

```rust
if rolling_window(1s).inference_latency_p99 > Duration::from_micros(100) {
    circuit_breaker.open();
    // Scanner emite sem TradeSetup (ml_status: CircuitOpen); A3 fallback.
}
```

- **Janela**: 1s rolling (tight — latência é sensível).
- **Threshold**: p99 > 100 µs.
- **Ação**: circuit breaker abre imediatamente; probe após 10s; fecha se p99 < 100 µs e sem panic.
- **Escalation**: se reabre ≥ 3 vezes em 1h → alert P1 + bloqueio automático.

### Gate 6 — Feedback loop per-rota (T12)

```rust
for rota in active_routes {
    let share = rota.daily_volume_share_30d();
    match share {
        x if x >= 0.15 => rota.disable_ml(),               // kill per-rota
        x if x >= 0.10 => alert(Severity::P2, &rota),      // alert
        x if x >= 0.05 => dashboard.flag(&rota),           // flag
        _ => {}
    }
}
```

- **Janela**: 30 dias rolling.
- **Thresholds**: 5% flag / 10% alert / 15% desativa ML per-rota.
- **Escopo**: per-rota (não kill global).
- **Ação**: rota ≥ 15% servida por A3 até share cair para < 10% por 30 dias.

## Métricas auxiliares (disparam alert, não kill)

### T3 gap sinal alerta

```rust
let gap = rolling_window(7d).t3_gap();  // P(realize|executed) − P(realize|not)
if gap > 0.15 {
    alert(Severity::P2, "T3 gap material detected; review propensity model");
}
```

### Storage growth

```rust
if storage_growth_24h > storage_budget / retention_days {
    alert(Severity::P3, "storage growing faster than retention allows");
}
```

### ECE split (T12 auditoria)

```rust
let ece_rec = ece_among(|sample| sample.was_recommended);
let ece_not = ece_among(|sample| !sample.was_recommended);
if (ece_rec - ece_not).abs() > 0.03 {
    alert(Severity::P2, "feedback loop contamination suspected");
}
```

## Regeneração de confiança (como sair de kill)

Após kill switch ativar, processo obrigatório antes de re-enable:

1. **RCA** registrado em `08_drift_reports/<timestamp>_kill_<reason>.md` (template em runbook.md).
2. **Retreino** (se causa foi drift): Python pipeline K-fold purged → ONNX export → Rust self-test.
3. **Shadow** do novo modelo por ≥ 7 dias: ECE, precision vs baseline.
4. **Aprovação manual** do operador via CLI:
   ```bash
   curl -X POST http://localhost:8080/api/ml/re_enable \
     -d '{"model_version": "1.2.1", "rca_ref": "08_drift_reports/2026-04-21_ece_spike.md"}'
   ```
5. Hot-reload (ADR-010) com flag `restoration_after_kill: true` por 48h para monitoramento reforçado.

## Observabilidade (Prometheus metrics)

```
ml_ece{window="4h",stratum="calm"} 0.023
ml_ece{window="4h",stratum="opportunity"} 0.029
ml_ece{window="4h",stratum="event"} 0.061          # ← acima de threshold
ml_precision_at_k{k="10",window="24h",profile="medium"} 0.72
ml_coverage_ic95{window="4h",stratum="calm"} 0.94
ml_abstention_rate{window="1h",reason="LowConfidence"} 0.12
ml_inference_latency_us_p99{window="1s"} 58.3
ml_kill_switch_active 0                             # ← 1 quando ativo
ml_circuit_breaker_open 0
ml_route_volume_share_30d{rota="BTC-MEXC-BINGX-FUT"} 0.08
ml_t3_gap{window="7d"} 0.09
```

## Alertmanager config (exemplo)

```yaml
- alert: ECE_4h_exceeded
  expr: ml_ece{window="4h"} > 0.05
  for: 5m
  labels:
    severity: P1
  annotations:
    summary: "ECE 4h > 0.05 → kill switch imminent"
    runbook_url: "docs/ml/10_operations/runbook.md#ece-subindo"

- alert: Circuit_breaker_flapping
  expr: increase(ml_circuit_breaker_opens_total[1h]) > 3
  for: 0m
  labels:
    severity: P1
  annotations:
    summary: "Circuit breaker abriu >3× em 1h; thread ML instável"
```

## Referências

- [ADR-004](../01_decisions/ADR-004-calibration-temperature-cqr-adaptive.md) §Camada 5.
- [ADR-010](../01_decisions/ADR-010-serving-a2-thread-dedicada.md) §Circuit breaker.
- [ADR-013](../01_decisions/ADR-013-validation-shadow-rollout-protocol.md) §Kill switch 6 gates.
- [runbook.md](runbook.md) — procedimento operacional.
- [D10_validation.md](../00_research/D10_validation.md) §5.4–5.5.
