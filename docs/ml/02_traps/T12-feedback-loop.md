---
name: T12 — Feedback Loop (Contamination da Distribuição de Treino)
description: Operador que segue recomendações contamina dados de treino futuros; tratamento via was_recommended flag + thresholds share_of_volume + auditoria ECE split + hold-out 5% rotas (ADR-011 + ADR-013)
type: trap
status: addressed
severity: medium
primary_domain: D6
secondary_domains: [D10, D4]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T12 — Feedback Loop (Contamination da Distribuição de Treino)

## Descrição

Se o operador segue as recomendações do modelo e isso move o mercado (consome liquidez, sinaliza direção para outros arbs), o próprio modelo futuro treina em **dados contaminados pelas suas próprias recomendações passadas**.

A severidade depende do tamanho operacional:

- **Single-market-participant em longtail crypto**: efeito **marginal**. Operador individual raramente move rota significativamente.
- **Múltiplos arbs com mesmo scanner**: efeito **catastrófico**. Convergência de comportamento → over-execution → mercado se "imuniza" → modelo obsoleto sem saber.
- **Top-5 venues com operadores institucionais**: efeito dominante; conhecido em literatura stat-arb.

## Manifestação empírica

- Em longtail com operador único (nosso caso MVP), contamination marginal para rotas com `share_of_daily_volume < 5%`.
- Sistemática se:
  - `share_of_daily_volume > 5%` → monitoramento ativo.
  - `share_of_daily_volume > 10%` → alert email/Slack.
  - `share_of_daily_volume > 15%` → **desativar ML para a rota**.

Sem tratamento, modelo pós-retreino pode mostrar degradação de precision@10 em rotas especificamente que operador mais usou — sinal de contaminação.

## Tratamento

### Primário — ADR-011 Flag `was_recommended` + exclusão no retreino

- Log explícito `was_recommended: bool` em cada trade executado (D10 shadow integração).
- Retreino exclui amostras contaminadas + **buffer de `2·T_max` minutos** (até 48h).
- Double exclusion: executed trades **e** vizinhança temporal.

### Secundário — ADR-011 Thresholds `share_of_daily_volume`

Monitoramento por rota:
- `< 5%` → normal (sem ação).
- `5% ≤ share < 10%` → **flag** ativo em dashboard; auditoria semanal.
- `10% ≤ share < 15%` → **alert** email/Slack.
- `≥ 15%` → **ML desativado** para a rota; fallback A3 ECDF+bootstrap (ADR-001).

### Terciário — ADR-013 Auditoria ECE split semanal

- `ECE_recommended` — ECE restrito a amostras com `was_recommended = true`.
- `ECE_not_recommended` — ECE restrito a `false`.
- **Divergência `|ECE_recommended − ECE_not_recommended| > 0.03`** → revisão manual + possível kill switch ou desativação per-rota.

### Quaternário — ADR-013 Hold-out 5% rotas (grupo de controle limpo)

- Designar **5% das rotas (130 de 2600)** como hold-out sem recomendações — operador orientado a **ignorar** intencionalmente.
- Única forma de detectar **feedback loop gradual abaixo de 5% share** (cumulativo global).
- **Rotação de hold-out a cada 30 dias** para evitar stratification effect (rotas hold-out sempre mesmas → viés de seleção).
- Métrica agregada `total_share_executed = Σ(share_per_rota)` — se > 30% do volume agregado, revisão estrutural.

### Quinto — Monitoramento share-of-volume em tempo real

Feature store (ADR-012) expõe query:

```sql
SELECT
    rota_id,
    SUM(CASE WHEN was_recommended THEN qty ELSE 0 END) / vol24 AS share
FROM executions JOIN spread_snapshot USING (rota_id)
WHERE ts > dateadd('d', -1, now())
GROUP BY rota_id
HAVING share > 0.05;
```

Alertas per-rota via Alertmanager quando threshold cruzado.

## Residual risk

- **Efeito oculto** abaixo de 5% per-rota mas distribuído em muitas rotas: cumulativo pode contaminar modelo global sem disparar threshold individual. Mitigação: métrica agregada `total_share_executed` + hold-out.
- **Threshold 15% ainda é estimativa**: baseado em D6 conservadores; validar empiricamente pós-V2 deploy.
- **Operador multi-scanner**: usar concurrently outro scanner com mesmo ML → contaminates duplamente. Fora do escopo MVP.
- **Hold-out viciado** se operador acidentalmente operar em rota hold-out. Mitigação: log de violações; possível automatic enforcement via flag `never_recommend`.

## Status

**Tratado**. Thresholds quantificados (ADR-011); auditoria ECE split + hold-out 5% + rotação 30 dias formalizados (ADR-013).

Pendente: validação empírica dos thresholds em Fase 2+ do shadow mode.

## Owner do tratamento

- ADR-011 (primário — thresholds + exclusão retreino).
- ADR-013 (secundário — auditoria ECE split + hold-out).

## Referências cruzadas

- [ADR-011](../01_decisions/ADR-011-drift-detection-e5-hybrid.md).
- [ADR-013](../01_decisions/ADR-013-validation-shadow-rollout-protocol.md).
- [ADR-012](../01_decisions/ADR-012-feature-store-hibrido-4-camadas.md).
- [D06_online_drift.md](../00_research/D06_online_drift.md) §T12.
- [D10_validation.md](../00_research/D10_validation.md) §5.3.
- [T03_causal_vs_observational.md](T03-causal-vs-observational.md) — mechanism-related.

## Evidência numérica citada

- D6 thresholds 5% / 10% / 15% — propostas conservadoras baseadas em fragilidade longtail; validação empírica pós-V2 deploy.
- 2·T_max buffer: defensive factor baseado em autocorrelação H ~ 0.8 (D2).
- Hold-out 5% = 130 rotas de 2600; rotação 30 dias preserva cobertura temporal.
- Literatura adjacente sobre feedback em mercados: Avellaneda & Lee 2010 *Quantitative Finance* 10 discute em contexto stat-arb.
