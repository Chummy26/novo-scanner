---
name: ADR-015 — Output como Thresholds + Distribuição de Lucro (não pontos exatos)
description: Primeira formulação do contrato de output threshold-based; refinada por ADR-016 após investigação Q1/Q2/Q3
type: adr
status: superseded-partial
superseded_by: ADR-016
author: operador + programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: ADR-001 §Output (parcialmente — contrato do TradeSetup struct)
reviewed_by: [operador]
---

> **NOTA (2026-04-19)** — Este ADR foi refinado por **[ADR-016](ADR-016-output-contract-refined.md)** após investigação PhD de 3 agentes independentes (Q1 microestrutura, Q2 distributional ML, Q3 UX). Correções materiais em ADR-016:
> - **Crítica Q2-M2**: `P(realize)` NÃO é `p_enter × p_exit_given_enter` (contradiz ADR-008 sob correlação −0.93); é `P(G(t,t') ≥ floor | features)` direto da CDF de G.
> - **Q2-M1**: `gross_profit_min` determinístico substituído por quantis empíricos `p10/p90`; distribuição final `{p10, p25, p50, p75, p90, p95}`.
> - **Q2-M3/M4**: scoring rules explícitas (pinball/log loss) + CRPS offline.
> - **Q1 emendas**: `toxicity_level`, `cluster_id/size/rank`, `horizon_p05_s`.
> - **Q3 layout**: struct inalterado; apresentação UI em 3 camadas (overview → drill-down → overlay gráfico 24h); `P` em frequência natural "77/100"; atualização visual ≤ 2 Hz.
>
> ADR-015 permanece como documento histórico que guiou a investigação. **Contrato vigente: ADR-016.**

# ADR-015 — Output como Thresholds + Distribuição de Lucro

## Contexto

ADR-001 e CLAUDE.md §Objetivo definiram o output como:

> "Entre em X%, saia em Y%, lucro bruto = X + Y%, P, T, IC 95%"

Sugerindo X e Y como **valores pontuais exatos**. Revisão operacional do operador aponta bug de design:

> "Se o modelo vai te entregar entre a X e saia a Y, pode ocorrer alguns problemas. Talvez assim seja um valor muito específico entrar X exato e Y exato — talvez por poucos % de diferença possa não acontecer ou acontecer um pouco menor. Como ele vai definir esse cálculo? A soma dos dois dá um lucro bruto do spread total ao final, **ou seja que isso varia**. Se eu entrasse a 1% e uma pessoa por sorte conseguisse entrar a 3% pois esperou 2 minutos após minha entrada, e eu saísse a 1% e essa pessoa saísse mais cedo quando a saída estava a 2%, ou seja eu lucrei 2% e ela 5%. **Isso não é tão simples para ser definido assim** — é o ponto mais crítico e mais importante do modelo."

## Diagnóstico

A observação expõe três fatos estruturais:

1. **`entrySpread(t)` flutua continuamente** enquanto oportunidade existe — operador captura *algum* valor, não um pré-determinado.
2. **`exitSpread(t)` também flutua** — saída é em *algum* valor também.
3. **Lucro bruto é variável entre operadores** seguindo o mesmo sinal, dependendo de timing tático (entra no primeiro ELIGIBLE vs espera pico).

Output como par de pontos esconde essa variabilidade — o modelo prometia falsa precisão.

## Decisão

Reformular o contrato do `TradeSetup` para:
- **enter_at e exit_at são thresholds mínimos**, não valores exatos.
- **gross_profit é reportado como distribuição** (min/p25/p50/p75/p95), não escalar.
- **P(realize) é decomposto** em P(entry atingir threshold) × P(exit atingir threshold | entrou).
- **Sinal tactical em tempo real** emitido a cada 150 ms enquanto oportunidade viva.

### Novo struct

```rust
pub struct TradeSetup {
    pub route_id:            RouteId,

    // Regra de entrada (threshold, não ponto)
    pub enter_at_min:        f32,   // entrar quando entrySpread >= este valor
    pub enter_typical:       f32,   // mediana esperada (p50) no próximo horizonte
    pub enter_peak_p95:      f32,   // pico esperado (p95) — informa decisão "esperar por mais?"
    pub p_enter_hit:         f32,   // P(entrySpread atingir enter_at_min em horizonte)

    // Regra de saída (threshold, não ponto)
    pub exit_at_min:         f32,   // sair quando exitSpread >= este valor
    pub exit_typical:        f32,   // mediana esperada pós-entrada
    pub p_exit_hit_given_enter: f32, // P(exitSpread atingir em T_max | entrou)

    // Lucro bruto como distribuição (dado regra seguida)
    pub gross_profit_min:    f32,   // pior caso = enter_at_min + exit_at_min
    pub gross_profit_p25:    f32,
    pub gross_profit_median: f32,   // = enter_typical + exit_typical
    pub gross_profit_p75:    f32,
    pub gross_profit_p95:    f32,   // pico afortunado

    // Probabilidade global e IC
    pub realization_probability: f32, // = p_enter_hit × p_exit_hit_given_enter
    pub confidence_interval:     (f32, f32),  // IC 95% sobre realization_probability

    // Horizonte (cauda pesada — reportar quantis)
    pub horizon_median_s:    u32,
    pub horizon_p95_s:       u32,

    // Haircut empírico (ADR-013 calibra em shadow)
    pub haircut_predicted:   f32,   // aplicado sobre gross_profit_*
    pub gross_profit_realizable_median: f32,  // mediana × (1 − haircut)

    // Metadata
    pub reason:              TradeReason,
    pub model_version:       semver::Version,
    pub emitted_at:          Timestamp,
    pub valid_until:         Timestamp,
}
```

### Sinal tactical em tempo real (complementar)

A cada ciclo 150 ms enquanto `TradeSetup` está válido:

```rust
pub struct TacticalSignal {
    pub route_id:       RouteId,
    pub setup_ref:      SetupId,  // referência ao TradeSetup que gerou
    pub current_entry:  f32,      // entrySpread(t) atual
    pub current_exit:   f32,      // exitSpread(t) atual

    pub entry_eligible: bool,     // current_entry >= enter_at_min
    pub entry_quality:  EntryQuality,  // HasNotAppeared | Eligible | AboveMedian | NearPeak

    pub exit_eligible:  bool,     // current_exit >= exit_at_min (só se operador já entrou)
    pub exit_quality:   ExitQuality,   // HasNotAppeared | Eligible | AboveMedian | NearBest

    pub time_since_emit_s: u32,
    pub time_remaining_s:  u32,   // até valid_until expirar
}
```

### Exemplo UI (como operador vê)

```
┌─ BP mexc:FUT → bingx:FUT ────────────────────────────────┐
│ ENTRADA                                                  │
│   entrySpread agora: 1.95% ← ELIGIBLE                    │
│   mínimo da regra:   1.80%                               │
│   típico esperado:   2.00%  (se esperar, prob. aparece)  │
│   pico esperado:     2.80%  (raro)                       │
│                                                          │
│ SAÍDA (pós-entrada)                                      │
│   mínimo da regra:   −1.20%                              │
│   típico esperado:   −1.00%                              │
│                                                          │
│ LUCRO BRUTO (se regra seguida)                           │
│   pior caso:         0.60%                               │
│   mediana:           1.00%                               │
│   p95 (afortunado):  2.80%                               │
│                                                          │
│ P(realize): 0.77  IC [0.70, 0.82]                        │
│ Horizonte: 28 min mediana, 1h40 p95                      │
│                                                          │
│ [ENTRAR AGORA a 1.95%]  [ESPERAR por pico]  [IGNORAR]    │
└──────────────────────────────────────────────────────────┘
```

Operador decide taticamente **dentro da regra** — sistema não é autômato.

## Alternativas consideradas

### Manter output pontual (ADR-001 original)

- **Rejeitado**: oculta variabilidade estrutural; falsa precisão mina credibilidade quando operador não consegue exatamente X%.

### Apenas quantis de lucro, sem thresholds

- **Rejeitado**: operador precisa de regra acionável ("quando entro?"), não só distribuição.

### Thresholds mas lucro escalar (apenas mediana)

- **Rejeitado**: esconde cauda; operador não vê que pode ficar em p25=0.7% (ainda positivo mas mediocre) ou p95=2.8% (afortunado).

### Execução automática (sistema decide timing)

- **Rejeitado pelo CLAUDE.md §Escopo fechado**: "Execução de ordens, dimensionamento de posição, stop-loss, quando fechar efetivamente — tudo isso continua 100% humano."

## Consequências

**Positivas**:
- **Honestidade estatística**: operador vê distribuição real, não promessa pontual.
- **Flexibilidade tática**: operador A conservador entra em ELIGIBLE; operador B tático espera pico — ambos seguiram a mesma regra do modelo.
- **Reason calibrada**: quando p95 é 2.8% mas mediana é 1.0%, operador entende que "pode dar mais, mas conte com 1%".
- **Kill switch ganha critério**: se precision cai especificamente no quantil inferior (lucros < p25 predito), sinaliza miscalibração da cauda.

**Negativas**:
- UI mais densa — mais números. Mitigação: layout padrão mostra min/median; detalhes em drill-down.
- Struct `TradeSetup` cresce de ~80 B para ~160 B. Irrelevante (não no hot path da memória scanner).

**Risco residual**:
- **Operador interpreta p95 como garantia**: "sempre vou conseguir 2.8%". UI deve rotular claramente "afortunado, p=5%".
- **Thresholds conservadores** (p10 para entry/exit hit) reduzem emissões mas aumentam P(realize). Floor da `gross_profit_min ≥ floor_operador` garante economicidade.

## Como computar thresholds

Proposta conservadora (MVP V1):

```python
# Previsões do modelo:
entry_future_dist = quantile_regressor.predict(features, quantiles=[0.1, 0.25, 0.5, 0.75, 0.95])
# entry_future_dist = [p10, p25, p50, p75, p95] de max(entrySpread) em horizonte

# Threshold mínimo: p10 = "90% de chance de aparecer pelo menos este valor"
enter_at_min = entry_future_dist[0]
enter_typical = entry_future_dist[2]
enter_peak_p95 = entry_future_dist[4]

# Similarmente para exit:
exit_at_min = exit_future_dist[0]
exit_typical = exit_future_dist[2]

# Lucro bruto distribuição
gross_profit_min = enter_at_min + exit_at_min
gross_profit_median = enter_typical + exit_typical
gross_profit_p95 = entry_future_dist[4] + exit_future_dist[4]  # ambos afortunados

# Emit apenas se:
if gross_profit_min >= floor_operador and realization_probability >= tau_min:
    emit(trade_setup)
else:
    abstain(NoOpportunity)
```

Implementação usa CatBoost MultiQuantile já treinado sobre `G(t,t')` unified (ADR-008). Quantis são nativos do modelo.

## Status

**Aprovado** para Marco 1. Supersede parcialmente ADR-001 no que tange ao struct de output.

Se coleta empírica de 60 dias revelar que operador ignora sistematicamente certas regiões da distribuição (ex: nunca espera por p95), V2 pode simplificar para `{min, typical, prob}`. Até lá, mais informação é melhor.

## Referências cruzadas

- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — arquitetura A2 (inalterada; apenas output reformulado).
- [ADR-008](ADR-008-joint-forecasting-unified-variable.md) — G(t,t') unified já modela distribuição conjunta.
- [ADR-009](ADR-009-triple-barrier-parametrico-48-labels.md) — labels threshold-based (compatíveis).
- [ADR-013](ADR-013-validation-shadow-rollout-protocol.md) — haircut empírico aplica sobre distribuição.
- [ADR-014](ADR-014-mvp-spreads-only-15-features.md) — features inalteradas.
- CLAUDE.md §Objetivo — reformulação preserva a intenção (operador executa com convicção) com precisão estatística correta.

## Evidência numérica

- Exemplo do operador: regra fixa → operador A lucra 2%, operador B lucra 5%. **Ambos seguiram a regra**; diferença é posição na distribuição. Modelo precisa reportar essa distribuição.
- CatBoost MultiQuantile prediz quantis nativamente (Prokhorenkova et al. 2018 *NeurIPS*).
- QRF (Meinshausen 2006 *JMLR* 7) idem.
- Modelagem via G(t,t') unified (ADR-008) garante consistência quantis.
