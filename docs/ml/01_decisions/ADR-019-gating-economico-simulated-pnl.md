---
name: ADR-019 — Gating Econômico Direto via simulated_pnl_bruto_aggregated
description: Resolve C-05 + C-08. Adiciona métrica econômica direta como gate de promoção entre Marcos e como kill switch em produção. Substitui gating puramente ML-métrico por avaliação de valor econômico bruto entregue.
type: adr
status: approved
author: operador + critica-review
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: STACK.md §10 Métricas de gating; ROADMAP.md §Gating metrics por Marco
reviewed_by: [operador]
---

# ADR-019 — Gating Econômico Direto

## Contexto

Crítica-review identificou dois problemas correlatos:

- **C-05**: função de utilidade U₁ com floor 0.8% (ADR-002) protege utilidade agregada em otimização mas não impede cauda longa de emissões com `gross = floor + ε`, `P → 1`. Modelo pode emitir N micro-wins consecutivos sem agregar valor econômico material vs custo de vigilância humana.
- **C-08**: todos os gates (STACK.md §10, ROADMAP.md gating por Marco) são métricas ML (`precision@k`, `ECE`, `coverage`, `DSR`). Modelo pode atingir todos e ainda ser economicamente inútil. `DSR > 2.0` existe mas é agregado pós-validação purged K-fold, não rolling em shadow/produção.

**Ausência estrutural**: não há gate específico que force o stack a provar que entrega **valor econômico marginal sobre olhar o scanner manualmente**. Métricas ML excelentes + valor econômico zero é cenário plausível e não detectado pelo gating atual.

## Decisão

Introduzir métrica `simulated_pnl_bruto_aggregated` como gate econômico de primeira classe, com definição operacional precisa e gates específicos por Marco.

### Definição operacional da métrica

Para cada recomendação `r_i` emitida em `t_i` com `(enter_at_i, exit_at_i, route_i, T_max_i)`:

```
resultado_i = {
    REALIZED     se ∃ t_enter ∈ [t_i, t_i + T_trigger_max]: entrySpread(t_enter) ≥ enter_at_i
                 AND ∃ t_exit ∈ [t_enter, t_enter + T_max_i]: exitSpread(t_exit) ≥ exit_at_i,
    WINDOW_MISS  se enter_at_i não foi atingido em T_trigger_max,
    EXIT_MISS    se enter_at_i foi atingido mas exit_at_i não em T_max_i,
}

pnl_bruto_i = {
    (enter_realized + exit_realized) × capital_hipotético    se REALIZED,
    0                                                         se WINDOW_MISS,
    (enter_realized + exitSpread(t_i + T_max_i)) × capital   se EXIT_MISS (fechamento forçado no limite)
}
```

Onde `T_trigger_max` = janela máxima de espera para `entrySpread` atingir `enter_at_i` antes de considerar que a oportunidade não se concretizou. Default proposto: 300 s (operador configurável).

**Agregação**:

```
simulated_pnl_bruto_aggregated_window = Σ_{r_i emitidas em window} pnl_bruto_i
```

**Janelas obrigatórias**: 1h (detecção rápida), 24h (estabilidade diária), 7d (ciclos semanais), 30d (estabilidade mensal).

### Capital hipotético fixo de referência

Para comparabilidade cross-Marco e cross-modelo, fixar `capital_hipotético = 10 000 USDT por trade`. Valor é referência contábil — não pressupõe execução real, apenas normaliza métrica.

Operador pode adicionalmente configurar `capital_real_planejado` para dashboard próprio (ex: 1 000 USDT se retail; 100 000 USDT se institucional). Métrica de gate permanece fixa em 10 000 USDT.

### Métricas derivadas adicionais

```
pnl_per_emission_median_window       = median({pnl_bruto_i : r_i emitida em window})
pnl_per_emission_p10_window          = quantil 10% (cauda esquerda — pior 10%)
realization_rate_window              = |{REALIZED}| / |{emitidas}|
economic_value_over_a3_window        = simulated_pnl_bruto_aggregated_model - simulated_pnl_bruto_aggregated_a3
emissions_cost_adjusted_pnl_window   = pnl_aggregated - operator_attention_cost_per_emission × n_emitted
```

Onde `operator_attention_cost_per_emission` é custo fixo estimado por olhar uma recomendação (default 0.001% sobre capital hipotético, configurável).

### Gates econômicos por Marco

**Marco 0 (baseline A3)**:
- Registrar `simulated_pnl_bruto_aggregated_30d_a3` como baseline absoluto.
- **Sem gate mínimo**: apenas medir. Se A3 puro gerar PnL simulado negativo ou próximo de zero, registrar como fato (sinaliza que o regime atual não suporta nem a estratégia base, independente do modelo).

**Marco 1 (implementação feature store + infraestrutura)**:
- Não se aplica (infraestrutura, não modelo).

**Marco 2 (modelo A2 composta + calibração + shadow)**:
- `simulated_pnl_bruto_aggregated_30d_modelA2 ≥ 1.20 × baseline_A3_30d` **OU** `economic_value_over_a3_30d ≥ threshold_absoluto` (threshold calibrado em Marco 0).
- Se nenhuma das condições for atingida: simplificar para A3 puro; Marco 2 cancelado (conforme já previsto em ROADMAP.md §Marco 2 decisões).
- `realization_rate_30d ≥ 0.70`.
- `pnl_per_emission_median_30d ≥ 0.5% × capital_hipotético` (i.e., ≥ 50 USDT por emissão média).

**Marco 3 (drift + validação + rollout)**:
- `simulated_pnl_bruto_aggregated_30d ≥ baseline_A3_30d` sustentado (não pode degradar em produção).
- `economic_value_over_a3_7d ≥ 0` rolling (não pode ter semanas em que A3 puro venceria).
- `emissions_cost_adjusted_pnl_7d > 0` (PnL cobre custo de vigilância humana).

### Gates como kill switch em produção

Adicionar aos 6 gates existentes (STACK.md §10):

**Gate 7 (novo)**: `economic_value_over_a3_30d < 0` por ≥ 7 dias consecutivos → kill switch (desliga modelo, volta para A3 puro).

**Gate 8 (novo)**: `pnl_per_emission_p10_30d < -2 × operator_attention_cost` → alerta investigação (cauda esquerda muito pesada mesmo se média for boa).

### Implementação

**Marco 0**: cálculo em Rust de `simulated_pnl_bruto` per rota, persistido em QuestDB como tabela `ml_simulated_pnl` particionada por dia. Queries rolling via agregação SQL. ~400 LoC Rust + 2 queries SQL prontas.

**Marco 2**: adicionar painel Grafana dedicado com as métricas derivadas acima; alertas via Alertmanager nos gates 7 e 8.

## Alternativas consideradas

### Alt-1 — Sharpe ratio simulado em vez de PnL agregado

**Rejeitada como primária**: Sharpe é escala relativa; operador discricionário quer saber PnL absoluto. Manter Sharpe como métrica secundária (já coberto por DSR).

### Alt-2 — Apenas `realization_rate` sem PnL

**Rejeitada**: realization_rate alta com PnL médio baixo é cenário de C-05 exatamente — modelo vicia em micro-wins. PnL agregado captura o que realization_rate perde.

### Alt-3 — Capital hipotético variável por rota proporcional a vol24

**Rejeitada por ora**: adiciona complexidade sem benefício claro; capital fixo é mais interpretável e comparável. Revisar em V2 se evidência mostrar que distribuição de vol24 por rota viesa significativamente a métrica.

### Alt-4 — Calcular PnL líquido (pós fees) em vez de bruto

**Rejeitada**: viola escopo fechado — scanner e modelo não calculam fees (CLAUDE.md §Scanner — invariantes; `feedback_scanner_is_detector_not_pnl`). Operador aplica fees mentalmente. Métrica de gate é bruto por coerência com resto do stack.

## Consequências

**Positivas**:
- Fecha lacuna crítica de gating: modelo tem que provar valor econômico, não só métricas ML.
- Detecta reward hacking T1 na prática (micro-wins acima do floor) via `pnl_per_emission_median`.
- Fornece métrica única comparável entre baseline A3 e modelo ML ao longo dos marcos.
- Alinha incentivos: modelo só avança se entrega valor econômico.

**Negativas**:
- Adiciona ~400 LoC Rust + painel Grafana — trabalho marginal em Marco 0.
- Depende de `T_trigger_max` calibrado; valor inicial 300 s pode requerer ajuste após Marco 0.
- `capital_hipotético` fixo de 10k USDT é arbitrário — escolhido por ordem de magnitude coerente com retail/semi-pro operadores típicos.

**Risco residual**:
- Se distribuição empírica de `entrySpread` for tal que A3 puro gera PnL simulado essencialmente zero ou negativo, gates de Marco 2 (`modelo ≥ 1.20 × A3`) não aplicam bem — ficam indefinidos quando baseline é zero. Mitigação: fallback para threshold absoluto calibrado em Marco 0.
- Métrica ignora custo de oportunidade do capital bloqueado durante hold. Mitigação: em V2 adicionar `pnl_per_capital_hour` normalizado.

## Dependências

- ADR-018 (Marco 0) — infra de cálculo e persistência instalada em Marco 0.
- ADR-012 (Feature store) — tabela `ml_simulated_pnl` hospedada em QuestDB existente.
- ADR-009 (Triple-barrier labels) — compartilha lógica de `REALIZED / WINDOW_MISS / EXIT_MISS` com labeling.

## Referências cruzadas

- [STACK.md §10](../11_final_stack/STACK.md) — adicionar gates 7 e 8.
- [ROADMAP.md](../11_final_stack/ROADMAP.md) — adicionar gate econômico em cada Marco.
- [ADR-002](ADR-002-utility-function-u1-floor-configuravel.md) — floor complementar, não substituído.
- [ADR-018](ADR-018-marco-0-coleta-empirica-antes-de-modelo.md) — baseline A3 medido em Marco 0.

## Status

**Approved** — implementação em Marco 0.
