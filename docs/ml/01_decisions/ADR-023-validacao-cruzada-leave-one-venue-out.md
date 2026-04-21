---
name: ADR-023 — Validação Cruzada Leave-One-Venue-Out Obrigatória
description: Resolve C-07. Institui protocolo leave-one-venue-out (LOVO) no pipeline de avaliação para detectar viés sistemático por venue no modelo; gates de performance mínima per-venue; proteção contra o modelo aprender artefatos de feed específicos como sinal preditivo.
type: adr
status: approved
author: operador + critica-review
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: ADR-006 (purged K-fold); ADR-013 (validation shadow protocol)
reviewed_by: [operador]
---

# ADR-023 — Validação Cruzada Leave-One-Venue-Out (LOVO)

## Contexto

Crítica C-07: scanner tem feedback documentado de staleness/spreads fantasma (memória `feedback_no_masking.md`); snapshot real de 2026-04-19 mostra 12 de 14 streams conectados, `book_age` até 1796ms em MEXC FUT. Modelo ML vai consumir features desses feeds.

Mitigações atuais (ADR-005 abstenção, ADR-007 features C staleness, ADR-016 toxicity) são **sintomáticas**: abstêm ou flagam quando staleness individual é detectado. Não protegem contra **viés sistemático por venue**: se uma venue específica tem `book_age` persistentemente alto ou WS com jitter estrutural, o modelo pode aprender esse padrão como feature preditiva genuína.

Exemplo de modo de falha: modelo aprende que "rotas envolvendo MEXC FUT com `book_age > 800 ms` têm spread_entrada mais persistente" — mas isso é artefato do feed MEXC FUT (ele entrega frames em batch com lag estrutural), não propriedade econômica da venue. Em produção, modelo emite recomendações enviesadas para/contra MEXC FUT por razão não-econômica.

## Decisão

### Protocolo LOVO obrigatório

Em cada run de treino:
1. Para cada venue `v` (11 venues — Binance, MEXC, BingX, Gate, KuCoin, XT, Bitget, ambos spot e futuros quando aplicável):
   - Construir train-set excluindo todas rotas em que `buyFrom = v` OR `sellTo = v`.
   - Treinar modelo sobre train-set reduzido.
   - Avaliar sobre test-set composto apenas de rotas envolvendo venue `v`.
2. Coletar métricas per-venue: `precision@10`, `ECE`, `coverage`, `realization_rate`, `economic_value`.
3. Computar:
   - `LOVO_metric_mean` = média das métricas sobre 11 folds.
   - `LOVO_metric_worst_drop` = (métrica média full-data) − (pior métrica entre 11 venues).

### Gates LOVO

**Gate 1 (hard)**: `LOVO_precision@10_worst_drop ≤ 0.15`. Se alguma venue tem precision@10 mais que 15 pp pior que média, modelo está enviesado por artefato de feed daquela venue.

**Gate 2 (hard)**: `LOVO_ECE_worst ≤ 0.08`. Se alguma venue tem ECE acima de 8% (vs meta global de 3–5%), calibração está venue-dependente.

**Gate 3 (hard)**: `LOVO_coverage_worst ≥ 0.85`. Coverage empírica mínima per-venue.

**Gate 4 (soft, alerta)**: `LOVO_economic_value_worst < 0`. Se alguma venue gera PnL simulado negativo em LOVO, indica que modelo performa mal fora do viés dessa venue.

### Ação obrigatória se gate dispara

Se Gate 1/2/3 dispara:
1. Identificar features específicas que tornam modelo dependente da venue problemática (SHAP local sobre subset da venue vs subset sem).
2. Decidir:
   - **Se feature capturada é artefato de feed**: remover ou regularizar essa feature. Revisar ADR-007.
   - **Se feature é legítima mas altamente venue-específica**: adicionar `venue_id` como feature categórica explícita + regularização de interação; retreinar.
   - **Se modelo estrutural não consegue generalizar cross-venue**: reabrir ADR-001 (arquitetura); considerar ensemble venue-aware.

Qualquer ação acima vira ADR novo ou reabertura de ADR existente (conforme protocolo ADR-021).

### Cadência de LOVO

- **Marco 0**: executar LOVO sobre baseline A3 (sim, sobre ECDF também — detecta vieses do próprio scanner antes do ML). Estabelece baseline LOVO per-venue.
- **Marco 2**: LOVO obrigatório em cada run de treino do modelo A2 composta, antes de shadow deploy. CI bloqueia deploy se gates falham.
- **Marco 3**: LOVO em cada retreino (nightly, ADWIN-triggered, manual). Gates verificados antes de hot-reload.
- **Produção contínua**: LOVO weekly sobre modelo em produção (simulado offline usando dados recentes).

### Gatilho para ADR-021 reabertura

Se LOVO_precision@10_worst_drop persistir > 0.12 (próximo ao gate) por 3 semanas consecutivas, ADR-021 dispara reabertura automática de ADR-007 (features) e/ou ADR-001 (arquitetura).

### Implementação

Crate `ml_eval` (já previsto em ADR-006 para leakage audit) ganha módulo `lovo.rs`:
- API: `fn lovo_evaluate(model_factory, dataset, venues: &[Venue]) -> LovoReport`.
- Paralelização: 11 venues × N folds K=6 = 66 treinos por LOVO completo. Aceitável para nightly (horas, não minutos). Aceitável com retreino emergencial (horas).
- Output: JSON + markdown report persistido em `docs/ml/05_benchmarks/lovo_reports/YYYY-MM-DD.md`.

**Esforço**: ~300 LoC Rust (módulo `lovo.rs`) + orquestração Python para Marco 2. Integração no CI bloqueante. ~3–5 dias-pessoa.

## Alternativas consideradas

### Alt-1 — Apenas cross-validation temporal (K-fold purged, já em ADR-006)

**Rejeitada como suficiente**: K-fold temporal captura drift temporal mas não viés estrutural por venue. Rotas de Binance dominam dataset (por liquidez); modelo pode funcionar bem em média e falhar estruturalmente em venues tier-2/3.

### Alt-2 — Apenas inspeção qualitativa de feature importance per venue

**Rejeitada**: depende de julgamento humano, não é gate formal. LOVO é mensurável e automatizável.

### Alt-3 — Validação leave-one-route-out em vez de leave-one-venue-out

**Rejeitada**: 2600 rotas × retreino = inviável computacionalmente. LOVO com 11 folds é tratável.

### Alt-4 — Apenas detecção pós-hoc de enviesamento (monitoramento em produção)

**Rejeitada como substituta**: monitorar produção é reativo. LOVO é preventivo (detecta antes de deploy). Combinação de ambos é o design (LOVO em CI + monitoramento produção).

## Consequências

**Positivas**:
- Detecção estrutural de viés de feed/venue antes de deploy.
- Força generalização cross-venue como propriedade testada, não assumida.
- Gatilho automático para reabrir ADRs (protocolo ADR-021) se viés reaparece.

**Negativas**:
- Overhead computacional de CI: 11× número de treinos vs single model. Mitigação: paralelização + LOVO só em merge para main (não em cada commit).
- Alguns vieses legítimos (e.g., Binance ter liquidez muito maior que outras) podem ser flagados. Mitigação: gates são thresholds, não zero-tolerância; operador julga.

**Risco residual**:
- Se todas venues têm viés de feed similar (ex: todas exchanges longtail reportam `book_age` com lag estrutural), LOVO não detecta — média é boa, worst-drop é pequeno. Mitigação: combinação com auditoria qualitativa ADR-007; features de venue_id + regularização como proxy.

## Dependências

- ADR-006 (purged K-fold + crate `ml_eval`) — módulo `lovo.rs` adicionado.
- ADR-007 (features) — reabertura disparada se LOVO detecta feature enviesada.
- ADR-018 (Marco 0) — LOVO sobre baseline A3 fica em Marco 0.
- ADR-021 (revisão pós-empírica) — gatilho de reabertura incluído.

## Referências cruzadas

- [ADR-006](ADR-006-purged-kfold-k6-embargo-2tmax.md) — crate `ml_eval` estendido.
- [ADR-007](ADR-007-features-mvp-24-9-familias.md) — features sob escrutínio.
- [ADR-021](ADR-021-protocolo-revisao-pos-empirica-adrs.md) — gatilho de reabertura.
- [STACK.md §10](../11_final_stack/STACK.md) — adicionar LOVO como gate de promoção.

## Status

**Approved** — execução sobre A3 em Marco 0; sobre modelo A2 em Marco 2 (CI bloqueante antes de shadow deploy).
