---
name: ADR-024 — Protocolo de Construção de Confiança Operacional
description: Resolve C-06. Institui componentes e cadência para o operador humano calibrar confiança no modelo — explicabilidade contrastiva, track record auditável, dashboards de calibração visíveis, feedback loop estruturado operador→ADR. Reduz gap entre "modelo tecnicamente pronto" e "operador executa com convicção".
type: adr
status: approved
author: operador + critica-review
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: ADR-016 §Q3 (UX); ADR-013 (shadow mode rollout)
reviewed_by: [operador]
---

# ADR-024 — Protocolo de Construção de Confiança Operacional

## Contexto

Crítica C-06: critério de sucesso do CLAUDE.md é comportamental — "operador executa com convicção sem consultar histórico manualmente". Plano atual trata isso implicitamente (30 dias fase 2 shadow "operador-assisted"), mas literatura documenta que adoção de sistemas ML em decisão financeira requer N falhas/acertos nulos antes de confiança, frequentemente N > 30 trades significativos.

- Dietvorst, Simmons & Massey 2015 *JEP-G* "Algorithm Aversion": humanos que veem modelo errar rejeitam-no mesmo quando modelo é demonstravelmente melhor que humano.
- Logg, Minson & Moore 2019 *OBHDP* "Algorithm Appreciation": efeito oposto depende fortemente de contexto e de como o modelo é apresentado.
- Dietvorst, Simmons & Massey 2018 *Management Science* "Overcoming Algorithm Aversion": permitir operador **modificar levemente** recomendações aumenta adoção.

**Lacuna**: stack atual constrói modelo rigoroso mas não constrói sistematicamente a confiança do operador. Risco real: modelo fica em shadow indefinidamente porque operador nunca confia suficientemente.

## Decisão

Instituir 5 componentes obrigatórios para construção de confiança, implantados escalonadamente nos Marcos 0–3.

### Componente 1 — Explicabilidade contrastiva por TradeSetup (Marco 2)

Para cada emissão, além dos campos estruturais (ADR-016), gerar **3 contrafactuais locais**:

```rust
pub struct TradeSetup {
    // ... campos existentes ADR-016 ...
    pub rationale: Rationale,
}

pub struct Rationale {
    /// Top-3 features que mais empurraram `realization_probability` para cima.
    /// Format: (feature_name, current_value, counterfactual_value, delta_P).
    pub positive_drivers: [FeatureContribution; 3],

    /// Top-3 features que mais empurraram P para baixo (razão de incerteza residual).
    pub negative_drivers: [FeatureContribution; 3],

    /// Frase operacional de 1 linha (humanamente lida).
    pub one_liner: &'static str,
}

pub struct FeatureContribution {
    pub feature_name:         &'static str,
    pub current_value:        f32,
    pub counterfactual_value: f32,  // valor que tornaria efeito neutro
    pub delta_p_absolute:     f32,  // quanto P subiria/cairia se feature fosse no valor CF
}
```

**Exemplo de `rationale.one_liner`**:
> "P alto (83%) porque entrySpread atual (2.0%) está no p92 histórico da rota e `rolling_corr_entry_exit_1h` indica compressão ativa; incerteza residual vem de `book_age_mexc_fut` elevado (420 ms vs p50=120 ms)."

**Implementação**: SHAP offline sobre train-set para global importance; para runtime, usar aproximação local via tree interpreter do QRF (Saabas 2014; Lundberg et al. 2018 *Nature MI* TreeSHAP) — latência <5 µs per emissão. Esforço ~500 LoC Rust + Python offline para validação.

### Componente 2 — Track record auditável (Marco 0)

Log append-only em `docs/ml/09_shadow_mode/track_record/YYYY-WW.jsonl` com schema:

```json
{
  "ts":               "2026-04-23T14:32:05Z",
  "route_id":         "BP-mexc:FUT-bingx:FUT",
  "setup":            { ... TradeSetup completo ... },
  "shadow_outcome":   {
    "entered":         true,
    "enter_realized":  2.02,
    "exit_realized":   -0.95,
    "gross_realized":  1.07,
    "horizon_observed_s": 1640,
    "realization_matched_prob": true
  },
  "model_version":    "0.3.0",
  "reason_abstention_nearest": null
}
```

Operador tem acesso direto ao arquivo. Consultas via dashboard Grafana ("Quantos shadow trades tiveram `gross_realized > 1%` na última semana?").

### Componente 3 — Reliability diagram em tempo real (Marco 0)

Painel Grafana dedicado com:
- Reliability diagram rolling 7 dias, 30 dias.
- Breakdown per-venue, per-regime (quando HMM existir), per-tier de `realization_probability` reportada.
- Indicador visual `OK / DEGRADADA / SUSPEITA` (status da calibração, ADR-016 Q3).
- Gráfico comparativo: "P reportado vs P empírico" por buckets.

Operador consulta este painel antes de executar qualquer recomendação. Confiança calibrada é emergente: operador vê "nos últimos 7 dias, quando modelo disse 80%, realização foi 78% — está calibrado", ou "foi 55% — suspeitar".

### Componente 4 — Feedback loop operador → ADR (Marco 2+)

Endpoint para operador marcar shadow trade:
- `executed_real` (operador executou em vivo)
- `would_execute_but_missed` (quis executar mas janela fechou)
- `would_not_execute` (mesmo emitido, operador não executaria — anotar razão livre texto)
- `ficou_preso` (executou e não conseguiu sair dentro de T_max)

Agregação semanal:
- Se `would_not_execute > 30%` das emissões: sinal de que modelo emite recomendações que operador rejeita — ADR-002 (utility), ADR-005 (abstention), ADR-007 (features) são reabertos (protocolo ADR-021).
- Se `ficou_preso > 10%` das execuções: sinal de calibração otimista de `P` — ADR-004 reaberto.
- Se `would_execute_but_missed > 20%` em setups `enter_at ≥ 2%`: confirma T11 empiricamente — ADR-017 promovido a approved.

### Componente 5 — Weekly performance report (Marco 0+)

Todo domingo, sistema gera automaticamente `docs/ml/09_shadow_mode/weekly_reports/YYYY-WW_report.md`:

```markdown
---
week: YYYY-WW
model_version: X.Y.Z
generated_at: 2026-04-26T00:00:00Z
---

# Week YYYY-WW — Performance Report

## Volume
- Emissões totais: N
- Emissões úteis: M (ratio: X%)
- Por razão de abstenção: {NoOpp: A, InsuffData: B, LowConf: C, LongTail: D, NoWindow: E}

## Performance econômica (ADR-019)
- simulated_pnl_bruto_aggregated_7d: $X
- Comparativo baseline A3: $Y (delta: +Z%)
- Realization rate: R%

## Calibração (ADR-004)
- ECE_global: X
- ECE_worst_regime: Y
- Coverage IC 95: Z%

## LOVO (ADR-023)
- precision@10_mean: X
- precision@10_worst_drop: Y

## Gatilhos de revisão disparados (ADR-021)
- [lista]

## Operador feedback agregado
- executed_real: N
- would_not_execute: M (razões top-3)
- ficou_preso: K

## Comentários automáticos
- [observações de tendências, outliers, recomendações de ajuste de config]
```

Operador recebe via email/Slack/console todo domingo. Conteúdo reproduz em 2 minutos o que seria consulta manual ao dashboard.

### Cadência de adoção

**Marco 0 (semanas 1–6)**:
- Componente 2 (track record) implementado no Rust.
- Componente 3 (reliability diagram real-time) no dashboard Grafana.
- Componente 5 (weekly report) gerado semanalmente.

**Marco 2 (semanas pós-Marco 0)**:
- Componente 1 (explicabilidade contrastiva) no struct TradeSetup.
- Componente 4 (feedback loop operador→ADR) endpoint + agregação semanal.

**Marco 3**:
- Todos componentes ativos em produção.
- Gatilhos do Componente 4 disparam revisões ADR conforme ADR-021.

## Alternativas consideradas

### Alt-1 — Manter abordagem implícita (só shadow fase 2)

**Rejeitada**: não constrói confiança sistematicamente. Depende de sorte (primeiras semanas terem resultados bons).

### Alt-2 — Gamification (pontos, badges, etc.)

**Rejeitada**: infantil para contexto profissional; risco de distorcer incentivos.

### Alt-3 — Construir explicabilidade apenas no Marco 3

**Rejeitada**: operador confia mais rapidamente se explicabilidade está presente desde Marco 2 (quando primeiro modelo ML entra em shadow).

### Alt-4 — Operador edita manualmente cada recomendação antes de executar (Dietvorst et al. 2018)

**Integrado parcialmente**: ADR-016 §Q3 já inclui "controle de modificação no botão ENTRAR" — operador pode ajustar valor antes de confirmar. ADR-024 estende com feedback loop pós-execução.

## Consequências

**Positivas**:
- Fecha gap comportamental entre "pronto técnico" e "pronto operacional".
- Gera dados empíricos de alinhamento operador-modelo (Componente 4) que reabastecem protocolo ADR-021.
- Weekly reports mantêm operador engajado sem demandar vigilância constante.
- Explicabilidade contrastiva é também ferramenta de debugging do modelo.

**Negativas**:
- Esforço de implementação moderado: ~500 LoC TreeSHAP Rust + endpoint feedback + templates de report ≈ 1.5 semanas-pessoa espalhadas nos marcos.
- Risco de sobrecarga cognitiva se operador recebe demasiada informação. Mitigação: Componente 3 (reliability) + Componente 5 (weekly) são opt-in após primeiros 30 dias; defaults são sensatos.

**Risco residual**:
- Confiança é fundamentalmente humana; protocolo oferece ferramentas mas não garante adoção. Mitigação: ADR-021 dispara revisões se métricas de adoção (Componente 4) indicam rejeição persistente.

## Dependências

- ADR-016 §Q3 — UI layout base (3 camadas).
- ADR-017 — razão de abstenção `NoWindowForHuman` aparece em Componente 4.
- ADR-019 — métrica econômica aparece em Componente 5.
- ADR-020 — gate de volume útil aparece em Componente 5.
- ADR-021 — gatilhos de reabertura usam dados de Componente 4.
- ADR-023 — LOVO aparece em Componente 5.

## Referências cruzadas

- [ADR-016](ADR-016-output-contract-refined.md) — struct TradeSetup estendido com `rationale`.
- [ADR-013](ADR-013-validation-shadow-rollout-protocol.md) — shadow fase 2 complementada por feedback loop.
- [STACK.md §Dashboard](../11_final_stack/STACK.md) — painéis adicionais documentados.

## Status

**Approved** — Componentes 2, 3, 5 em Marco 0; Componentes 1, 4 em Marco 2.
