---
name: ADR-027 — Módulo `ml/eval` (invariants + leakage audit + LOVO)
description: Consolida infraestrutura de auditoria ML como sub-módulo do scanner em vez de crate separado. Três submódulos — invariants (runtime verification), leakage (CI bloqueante 5 testes), lovo (leave-one-venue-out). Resolve pendência infraestrutural para ADR-006, ADR-023 e gates do Marco 1.
type: adr
status: approved
author: operador + critica-review
date: 2026-04-21
version: 1.0.0
supersedes: null
extends: ADR-006 (purged K-fold + leakage audit); ADR-023 (LOVO)
reviewed_by: [operador]
---

# ADR-027 — Módulo `ml/eval`

## Contexto

ADR-006 e ADR-023 especificam auditoria ML (leakage + LOVO) como pré-requisito de promoção Marco 0 → Marco 1. Originalmente planejados como crate `ml_eval` separado. Auditoria crítica pós-Wave S apontou:

> "Falta o split temporal executável com purging e embargo. O protocolo existe em doc, mas não existe pipeline rodando isso de ponta a ponta (`purged_cv_protocol.md:13`). (...) Crate `ml_eval` não existe ainda."

Manter como crate separado adiciona overhead de workspace + duplicação de types (Route, Venue, TradeSetup) + fricção de build. Mover para `scanner/src/ml/eval/` resolve.

## Decisão

### Estrutura

```
scanner/src/ml/eval/
├── mod.rs           — re-exports
├── invariants.rs    — runtime verification do TradeSetup
├── leakage.rs       — 5 testes CI bloqueantes (scaffolding Marco 0)
└── lovo.rs          — leave-one-venue-out (Marco 0 sobre A3; Marco 1 sobre A2)
```

### Submódulo `invariants`

Verifica propriedades estruturais do `TradeSetup` antes de broadcast / persistência:

- Quantis gross monotônicos: `p10 ≤ p25 ≤ median ≤ p75 ≤ p90 ≤ p95`.
- Enter levels monotônicos: `min ≤ typical ≤ peak_p95`.
- Horizon monotônico: `p05 ≤ median ≤ p95`.
- Probabilidades em [0, 1]: `realization_probability`, `p_enter_hit`, `p_exit_hit_given_enter`, `haircut_predicted`.
- IC envolve P: `lo ≤ P(realize) ≤ hi`, `lo ≤ hi`.
- Haircut coerente: `realizable_median ≤ median × (1 − haircut) + 1e-4`.
- Cluster rank válido: `1 ≤ rank ≤ size`.
- Janela de validade: `valid_until > emitted_at`.
- Todos campos numéricos finitos.

API: `verify_tradesetup(&s) -> Result<(), InvariantError>`. Overhead ~80 ns/verificação.

**Uso em runtime** (Marco 1 futuro):

```rust
match verify_tradesetup(&setup) {
    Ok(()) => broadcaster.publish(...),
    Err(e) => {
        metrics.invariant_violations_total.with_label_values(&[e.kind()]).inc();
        // Rejeita emissão (abstenção silenciosa) OU degrada calib_status.
    }
}
```

### Submódulo `leakage`

Scaffolding dos 5 testes do ADR-006:

1. Shuffling temporal.
2. AST feature audit via `syn 2.x`.
3. Dataset-wide statistics flag.
4. Purge verification (embargo 2·T_max).
5. Canary forward-looking.

API:
- `LeakageTestResult { Pass, Fail(String), Skipped(&'static str) }`
- `LeakageAuditReport { fields por teste }`
- `report.all_pass_or_skip() -> bool`
- `run_full_audit() -> LeakageAuditReport` — retorna Skipped em Marco 0 (pipeline Python ainda não existe).

CI gate: `all_pass_or_skip()` deve ser `true` para merge. Skipped é aceito em Marco 0; Fail bloqueia sempre.

### Submódulo `lovo`

`VenueFoldMetrics`, `LovoReport`, `LovoReport::passes_hard_gates()`.

Gates (ADR-023):
- `precision@10_worst_drop ≤ 0.15` (hard)
- `ECE_worst ≤ 0.08` (hard)
- `coverage_worst ≥ 0.85` (hard)
- `economic_value_worst ≥ 0` (soft, alerta)

API: `run_lovo_on_baseline_a3() -> Option<LovoReport>`. Execução real espera ≥ 30 dias de `raw_samples_*.jsonl` para reconstruir features PIT venue-excluded.

## Alternativas consideradas

### Alt-1 — Crate `ml_eval` separado em workspace

**Rejeitada**: duplicação de tipos (Route, Venue, TradeSetup), workspace Cargo mais complexo, sem benefício de isolamento (mesma organização, mesmo time).

### Alt-2 — Módulo `ml/audit/` em vez de `ml/eval/`

Apenas naming; rejeitada porque "eval" alinha com literatura ML (avaliação de modelo) e porque "audit" é ambíguo com auditoria operacional.

### Alt-3 — Testes de invariante apenas em `#[cfg(test)]`

**Rejeitada**: invariant verification precisa rodar em **runtime** antes de broadcast, não apenas unit tests. Violação em produção deve degradar `calib_status` ou acionar abstenção — não pode depender de suite de testes.

## Consequências

**Positivas**:
- Infraestrutura crítica de auditoria ML existe em código (não em doc).
- Runtime verification bloqueia broadcast de setups inválidos.
- LOVO pronto para executar assim que ≥ 30 dias de `raw_samples` acumularem.
- Single crate → build simples, sem overhead de workspace.

**Negativas**:
- Escopo de `scanner` crate aumenta (eval adiciona ~600 LoC + 28 testes). Mitigação: módulo claramente separado com `pub mod eval`.
- 5 testes de leakage em Marco 0 são `Skipped` — CI gate é permissivo até pipeline Python existir. Aceito como design Marco 0 (iteração empírica > doc-only).

**Risco residual**:
- AST feature audit (teste #2) requer parsing de `syn 2.x` sobre código Python de features. Em Marco 0 fica como placeholder; risco de implementação divergir do doc. Mitigação: ADR-021 gatilho automático dispara revisão se teste #2 permanecer Skipped após 90 dias.

## Dependências

- ADR-006 (purged K-fold + leakage audit).
- ADR-023 (LOVO obrigatório).
- ADR-016 (TradeSetup fields para invariants).

## Testes de verificação

- `cargo test --lib ml::eval` — 17 testes:
  - 10 invariants (8 detectam violações + valid + non-finite).
  - 2 leakage (placeholder + fail gate).
  - 5 LOVO (empty, mean/worst, gate violation, soft alert, baseline placeholder).
- Todos passam em 201/201 pós-Wave T.

## Status

**Approved** — implementado 2026-04-21. Leakage completo Marco 1; LOVO completo Marco 0 semanas 4–6.
