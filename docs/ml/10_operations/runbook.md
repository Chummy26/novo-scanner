---
name: Runbook Operacional — ML Recomendador TradeSetup
description: Procedimentos operacionais concretos para deploy, rollback, diagnóstico e recuperação em produção
type: runbook
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# Runbook Operacional — ML Recomendador TradeSetup

Referência rápida para operador/on-call. Derivado de ADR-010, ADR-011, ADR-013.

## Deploy de novo modelo

### Pre-condição obrigatória

**Todas** as verificações abaixo devem passar antes de considerar deploy:

- [ ] Self-test Rust `tract` sobre `model_vX.Y.Z.onnx`: carrega, infere em 100 smoke samples, latência p99 < 60 µs, `rtol < 1e-4` vs predições Python.
- [ ] Leakage audit CI (`cargo test -p ml_eval --release`): 5 testes verdes.
- [ ] MIRI verification do kernel de inferência extraído: zero alocações.
- [ ] GlobalAlloc debug counter em hot path benchmark 1h: `alloc_delta == 0`.
- [ ] Heaptrack sustained 1h: RSS estabiliza < 200 MB em 5 min, crescimento < 1 MB/min.
- [ ] Purged K-fold K=6 completo: `mean precision@10 ≥ baseline_A3 + 0.05` com `std ≤ 0.08`.
- [ ] ECE global ≤ 0.03; ECE por regime ≤ 0.05.
- [ ] DSR > 2.0.
- [ ] CHANGELOG.md entry + bump SemVer.

### Deploy atomic (hot-reload)

```bash
# 1. Upload modelo para storage compartilhado
aws s3 cp model_v1.2.0.onnx s3://scanner-models/production/

# 2. File watcher detecta; thread ML do scanner faz reload automático
#    (sem downtime do scanner — apenas 1–2 ciclos de emissão perdidos = 150–300ms)

# 3. Verificar promoção
curl http://localhost:8080/api/ml/status
# Esperado: {"model_version": "1.2.0", "status": "active", "loaded_at": "..."}

# 4. Monitorar primeiros 10 min no Grafana
open http://grafana.internal/d/ml-recomendador
# Observar: ECE_4h, precision@10_1h, abstention_rate, circuit_breaker_status
```

## Rollback

### Quando (automático)

Gatilhos de rollback automático (ADR-010, ADR-013):

- Circuit breaker disparou (p99 ML > 100 µs sustentado 1s).
- Kill switch de D5 ativou (ECE_4h > 0.05).
- Precision@10_24h degradou < baseline_A3_median − 0.05.

### Quando (manual)

- Operador percebe comportamento anômalo (FP óbvio, recomendações para rotas halted, etc.).
- Shadow comparison mostra modelo V2 é pior que V1 de forma material.

### Como

```bash
# Rollback atomic via ArcSwap<Model> (< 1 µs)
curl -X POST http://localhost:8080/api/ml/rollback \
  -H "Content-Type: application/json" \
  -d '{"to_version": "1.1.0", "reason": "ece_spike_after_deploy"}'

# Monitorar retorno ao baseline
watch -n 5 'curl -s http://localhost:8080/api/ml/metrics | jq ".ece_4h, .precision_10_24h"'
```

Rollback bloqueia deploys subsequentes até:
1. RCA (root cause analysis) registrado em `08_drift_reports/<timestamp>_rollback.md`.
2. Nova build passar em todos os gates pre-deploy.

## Diagnóstico rápido

### ECE subindo

1. Qual estrato? `curl /api/ml/ece | jq '.by_regime'`
2. Halt recente? `SELECT * FROM halts WHERE ts > now() - 4h;`
3. ADWIN detectou drift? `curl /api/ml/drift/status`
4. **Ação**: se regime event ativo + ADWIN fired → aguardar retreino emergencial (< 45 min). Se não → investigar dataset/features.

### Precision caindo

1. Fração de setups emitidos em rotas novas? Se alta → `InsufficientData` deveria abster; investigar partial pooling.
2. T3 gap atual? `curl /api/ml/metrics | jq '.t3_gap'` — se > 0.15, viés causal material.
3. Execução de portfolio correlacionado (T7)? `curl /api/ml/t7/cluster_rate`.
4. **Ação**: kill switch se < baseline_A3 − 0.05.

### Abstention rate > 0.95 por 1h

1. Cada razão: `curl /api/ml/abstain/by_reason`.
2. `NoOpportunity` dominante → regime calmo; ok.
3. `InsufficientData` dominante → bug de partial pooling ou halt massivo.
4. `LowConfidence` dominante → calibração quebrou; CQR degradou; kill switch + fallback A3.
5. `LongTail` dominante → spike event ativo; investigar venue.

### Scanner travado (não emite)

1. Circuit breaker aberto? `curl /api/ml/circuit/status`.
2. Thread ML crashed? `curl /api/ml/thread/status`.
3. **Ação**: restart thread ML (scanner continua operacional via fallback A3). Se scanner inteiro travou → restart completo + post-mortem.

## On-call escalation

```
Severity       Resposta inicial   Escalation
────────────── ─────────────────  ──────────────────────────
P0 (scanner    imediata           operador principal + dev   
caído)
P1 (kill       30 min             operador principal
switch global)
P2 (kill per-  4h                 dev durante horário
rota ≥ 10 rotas)
P3 (ECE alto   próximo business   dev durante horário
sem trigger)   day
```

## Post-incident template

Salvar em `08_drift_reports/<YYYY-MM-DD>_<incident>.md`:

```markdown
## Incident: <descrição>

- **Time start**: 
- **Time detected**: 
- **Time mitigated**: 
- **Time resolved**: 
- **Severity**: P0/P1/P2/P3

## Detecção

Qual métrica disparou? Qual threshold?

## Root cause

O que realmente aconteceu? (não o sintoma)

## Remediation

Ações tomadas.

## Follow-ups (action items)

- [ ] Item 1 (owner, due date)
- [ ] Item 2

## Prevenção

O que evita este tipo de incidente recorrer?
```

## Backup / recovery (D9 ADR-012)

- **redb hot**: snapshot a cada 15 min (RPO 15 min).
- **QuestDB**: BACKUP DATABASE diário incremental.
- **Parquet archival**: imutável; sem restore necessário.
- **RTO end-to-end**: < 45 min (restore Parquet 5-10m + QuestDB 10-15m + redb 1m + replay WS 15m).

### Procedimento de restore

```bash
# 1. Stop serviços
systemctl stop scanner-ml
systemctl stop questdb

# 2. Restore QuestDB
questdb_restore --backup /backups/questdb/latest --to /var/lib/questdb

# 3. Restore redb hot
cp /backups/redb/latest.redb /var/lib/scanner/hot.redb

# 4. Start QuestDB, aguardar ready
systemctl start questdb
until curl -s http://localhost:9000/health; do sleep 2; done

# 5. Start scanner (vai replay últimos 15 min automaticamente via WS seqno)
systemctl start scanner-ml

# 6. Verificar recovery
curl http://localhost:8080/api/ml/status
```

## Referências

- [ADR-010](../01_decisions/ADR-010-serving-a2-thread-dedicada.md) — serving + circuit breaker.
- [ADR-011](../01_decisions/ADR-011-drift-detection-e5-hybrid.md) — retreino emergencial.
- [ADR-012](../01_decisions/ADR-012-feature-store-hibrido-4-camadas.md) — backup/DR.
- [ADR-013](../01_decisions/ADR-013-validation-shadow-rollout-protocol.md) — kill switch gates.
- [kill_switch.md](kill_switch.md) — thresholds detalhados.
