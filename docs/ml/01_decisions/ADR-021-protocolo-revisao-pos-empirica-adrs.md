---
name: ADR-021 — Protocolo Formal de Revisão Pós-Empírica dos ADRs
description: Resolve C-01 + C-10 (governance). Institui cadência, gatilhos quantitativos e template formal para reabrir ADRs aprovados quando dados empíricos divergem das projeções usadas na decisão original.
type: adr
status: approved
author: operador + critica-review
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: OPEN_DECISIONS.md §P.G.3; toda decisão approved em docs/ml/01_decisions/
reviewed_by: [operador]
---

# ADR-021 — Protocolo de Revisão Pós-Empírica

## Contexto

Críticas C-01 e C-10 apontam viés de escritório nos ADRs: 17 ADRs aprovados foram escritos antes de existirem dados empíricos do regime longtail real. López de Prado 2018: *"The first model is always wrong; the question is how fast you iterate."* OPEN_DECISIONS §P.G.3 mencionava "revisão trimestral planejada" mas sem protocolo formal, sem gatilhos quantitativos, sem template.

**Lacuna**: ADRs aprovados antes de Marco 0 são tratados como estáveis. Quando dados reais divergirem (e vão divergir), não há mecanismo formal que force reabertura. Risco: stack construído sobre fundação errada sem detecção estrutural.

## Decisão

### Cadência de revisão

**Janela intensiva pós-Marco 0** (primeiros 90 dias após Marco 0 encerrar):
- Revisão mensal obrigatória.
- Check-in semanal das projeções E1–E11 (ADR-018) vs dados correntes.

**Regime estável** (após 90 dias com ≤1 ADR reaberto/mês):
- Revisão trimestral obrigatória.
- Revisão ad-hoc disparada por gatilhos automáticos (abaixo).

### Gatilhos quantitativos automáticos de reabertura

Sistema de monitoramento (instrumentado em dashboard Grafana + Alertmanager) deve disparar reabertura automática se:

| Categoria | Métrica | Threshold | ADRs auto-reabertos |
|---|---|---|---|
| **Regime structural** | `abs(α_hill_real - α_projected) / α_projected` | > 0.20 | ADR-001, ADR-004, ADR-009 |
| | `abs(H_hurst_real - H_projected) / H_projected` | > 0.15 | ADR-006, ADR-011 |
| | `regime_event_proportion_real` | > 0.15 | ADR-007, ADR-014, ADR-011 |
| **Microestrutura** | `median(D_{x=2%})_real` | < 2s **OU** > 10s | ADR-017 (promover ou rejeitar) |
| | `mean(haircut)_real` | > 1.5 × projection OU < 0.5 × projection | T11 reavaliação + ADR-007 features proxy |
| | `spillover_FEVD_real` em eventos | < 0.50 | ADR-007 cross-route features |
| **Correlação** | `abs(rho_entry_exit_real)` | < 0.80 | ADR-008 (copula como alternativa) |
| **Performance econômica** | `economic_value_over_a3_30d` (ADR-019) | < 0 | ADR-002, ADR-014 (features), ADR-005 (abstention) |
| **Performance ML** | `ECE_30d` | > 2 × target por 14 dias | ADR-004 (calibração) |
| | `precision@10_30d` | < `baseline_A3 × 0.90` | ADR-001 (arquitetura) |
| **Operacional** | `useful_emissions_per_hour_agg_7d` (ADR-020) | < τ_min / 2 por 14 dias | ADR-002 (floor), ADR-005 (τ abstention) |
| **Venue** | `leave_one_venue_out_max_drop` (ADR-023) | > 0.15 precision@10 | ADR-007 (adicionar venue features) |

Quando um gatilho dispara:
1. Dashboard marca ADR afetado como `REOPEN_TRIGGERED` com timestamp e métrica responsável.
2. Alertmanager emite notificação.
3. Operador tem 7 dias para revisar; se não revisar, escalar para auto-rebaixar ADR de `approved` → `under_review`.

### Template de ADR superseded

Quando revisão reabrir ADR-XXX e resultar em nova decisão:

- Criar novo ADR-YYY com template padrão.
- Campo `supersedes: ADR-XXX (razão: evidência empírica divergente em METRIC_NAME — ver report R)`.
- ADR-XXX original: campo `status` muda para `superseded`, campo `superseded_by: ADR-YYY`, adicionar seção final `## Histórico de supersession` com link para relatório que forçou revisão.
- Manter ambos arquivos em `01_decisions/`; nunca deletar. Histórico é ativo.

### Relatórios de revisão

**Relatório mensal pós-Marco 0** (primeiros 90 dias):

Localização: `docs/ml/01_decisions/reviews/review_YYYY-MM.md`

Template mínimo:
```markdown
---
type: adr-review
period: YYYY-MM
reviewed_adrs: [lista]
triggers_fired: [lista]
reopened: [lista]
kept_approved: [lista]
author: operador
---

# Revisão de ADRs — YYYY-MM

## Gatilhos disparados no período
| Métrica | Valor observado | Threshold | ADRs impactados | Ação |
|---|---|---|---|---|

## ADRs revisados
[seção por ADR, com decisão: keep_approved / reopen / promote_proposed / reject_proposed]

## Sinais de atenção para próximo período
[métricas em trajetória de disparar gatilho, mas ainda não dispararam]
```

**Relatório trimestral**:

Localização: `docs/ml/01_decisions/reviews/review_YYYY-Q[1-4].md`

Formato: agregado dos 3 relatórios mensais + análise de tendência + decisões estratégicas (ex.: migrar ADR estrutural completo).

### Responsabilidade

- **Operador**: aprova ou rejeita reaberturas, assina relatórios.
- **Dashboards automatizados**: detectam gatilhos, emitem alertas, marcam status.
- **Sistema de CI/CD**: bloqueia merge de código novo em ADRs com status `REOPEN_TRIGGERED` até resolução.

### Gate obrigatório de Marco transition

Não é permitido avançar de Marco N para Marco N+1 se houver ≥ 1 ADR com status `REOPEN_TRIGGERED` não resolvido.

## Alternativas consideradas

### Alt-1 — Revisão ad-hoc sem protocolo formal

**Rejeitada**: é o estado atual (OPEN_DECISIONS §P.G.3 mencionava "revisão trimestral" sem detalhes). Na prática, sem gatilhos quantitativos e sem obrigatoriedade, revisões são pospostas.

### Alt-2 — Revisão só se operador solicitar

**Rejeitada**: operador tem vieses próprios (incluindo confirmação). Gatilhos automáticos são proteção contra viés cognitivo.

### Alt-3 — Revisão trimestral sem janela intensiva pós-Marco 0

**Rejeitada**: janela pós-Marco 0 é onde evidência mais rapidamente diverge de projeções. Cadência mensal é justificada pelo alto valor marginal de detecção rápida nos primeiros 90 dias.

### Alt-4 — Thresholds mais frouxos (e.g., > 0.30 em vez de > 0.20 para α)

**Rejeitada como default**: 20% é ponto de corte defendido em literatura de parâmetros estruturais (e.g., estimação de cauda heavy-tail em finanças — Embrechts, Klüppelberg & Mikosch 1997 *Modelling Extremal Events* cap. 6 sugere sensibilidade de modelos a α dentro de ±0.3 na prática). Para thresholds mais críticos (econômico, precisão), 10% foi considerado muito frouxo. Thresholds podem ser recalibrados em Marco 3 com evidência.

## Consequências

**Positivas**:
- Fecha lacuna de governance: decisões aprovadas ficam sob vigilância empírica contínua.
- Torna inevitável a revisão de ADRs que se tornaram obsoletos — elimina risco de stack construído sobre fundação errada.
- Template de supersession formal preserva histórico institucional.
- Bloqueio de Marco transition impede avanço sobre fundação instável.

**Negativas**:
- Overhead operacional: relatório mensal nos primeiros 90 dias é trabalho real (~4–8h/mês).
- Risco de fadiga de alertas se gatilhos disparam frequentemente — mitigação: revisar thresholds após 90 dias se FP rate > 1/semana.

**Risco residual**:
- Gatilhos podem não cobrir modos de falha não antecipados. Mitigação: revisão pode ser disparada manualmente pelo operador a qualquer momento; gatilhos automáticos são chão, não teto.

## Dependências

- ADR-018 (Marco 0) — dashboards e métricas base necessárias.
- ADR-019 (gating econômico) — métrica para gatilhos de performance econômica.
- ADR-020 (gate volume) — métrica para gatilhos operacionais.
- ADR-023 (leave-one-venue-out, este protocolo) — métrica para gatilho de venue bias.

## Referências cruzadas

- [OPEN_DECISIONS.md §P.G.3](../11_final_stack/OPEN_DECISIONS.md) — mencionava revisão trimestral; agora formalizada aqui.
- [ADR-018](ADR-018-marco-0-coleta-empirica-antes-de-modelo.md) — gatilhos de reabertura listados lá correspondem aos E1–E11.
- [ROADMAP.md](../11_final_stack/ROADMAP.md) — gate de Marco transition atualizado.
- Todos os ADRs approved — passíveis de reabertura.

## Status

**Approved** — instalação dos gatilhos automáticos é parte do escopo de Marco 0.
