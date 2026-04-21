---
name: ADR-020 — Gate de Volume Útil Substituindo Threshold de Abstenção Binária
description: Resolve C-03. Substitui gate `abstention_rate ≤ 0.95` (que detecta apenas silêncio absoluto) por gate multi-condicional de volume útil emitido, que detecta silêncio parcial tornando o modelo inútil vs olhar scanner.
type: adr
status: approved
author: operador + critica-review
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: STACK.md §10 (kill switch gate abstenção); ADR-013 (kill switch 6 gates)
reviewed_by: [operador]
---

# ADR-020 — Gate de Volume Útil

## Contexto

Crítica C-03: stack empilha 4 filtros para emissão (`gross ≥ floor` ∧ `P ≥ τ` ∧ `toxicity = Healthy` ∧ `cluster_rank = 1`). Em regime longtail com cauda pesada + HMM que não separa regimes confiavelmente + precision-first + floor 0.8%, a taxa de emissão útil pode cair para <1% das rotas.

Gate atual (STACK.md §10): `abstention > 0.95 por 1h → alert investigação`. Detecta **silêncio absoluto** (95%+ de abstenção agregada). Não detecta **silêncio parcial**: modelo pode ter abstention 0.94 e ainda assim emitir apenas 1–2 recomendações úteis por hora agregado sobre 2600 rotas — cenário em que olhar scanner manualmente vence facilmente.

**Lacuna**: gating atual não mede "volume operacionalmente útil emitido" como proteção de primeira classe.

## Decisão

### Substituir gate de abstenção por gate de volume útil multi-condicional

**Definição de "emissão útil"**: recomendação que passa todos 4 filtros atuais E tem `realization_probability_ic_lower_95 ≥ τ_useful_P` E `gross_profit_median ≥ τ_useful_gross`.

Default: `τ_useful_P = 0.60`, `τ_useful_gross = 1.0%` (50% acima do floor da utility function). Configurável pelo operador.

### Métricas derivadas

```
useful_emissions_per_hour_agg           = |{emissões úteis em 1h sobre todas 2600 rotas}|
useful_emissions_per_hour_p25_per_route = quantil 25% inferior per-rota (algumas rotas podem dominar)
useful_emissions_per_hour_p75_per_route = quantil 75% (para ver dispersão)
useful_to_scanner_ratio_1h              = useful_emissions / total_scanner_opportunities_passing_scanner_floor
```

### Gates operacionais

**Gate volume mínimo agregado**:
```
useful_emissions_per_hour_agg_24h ≥ τ_volume_min_agg
```
Default: `τ_volume_min_agg = 5 emissões/hora agregado` (calibrado em Marco 0 via baseline A3).

**Gate valor sobre scanner**:
```
useful_emissions_per_hour_agg_24h ≥ 0.05 × total_scanner_opportunities_per_hour_passing_gross_1pct
```
Ou seja: modelo deve emitir ao menos 5% das oportunidades que o scanner bruto mostra acima de 1% de entrySpread. Abaixo desse nível, operador venceria olhando scanner direto.

**Gate distribuição por rota**:
```
n_rotas_com_ao_menos_1_emissao_7d ≥ 0.15 × total_rotas_ativas
```
Pelo menos 15% das rotas ativas geram ao menos uma emissão útil em 7 dias. Se apenas ~5% das rotas dominam todas emissões, modelo está super-concentrado em subset estreito (risco de viés).

### Gates como kill switch

Adicionar aos gates existentes (STACK.md §10):

**Gate 9 (novo)**: `useful_emissions_per_hour_agg_24h < τ_volume_min_agg / 2` por ≥ 6h consecutivas → **kill switch** (desliga modelo, volta para A3).

**Gate 10 (novo)**: `useful_to_scanner_ratio_1h < 0.01` por ≥ 12h consecutivas → alerta investigação severa.

### Manter métrica `abstention_rate` como diagnóstica

`abstention_rate` e `abstention_rate_by_reason` continuam sendo coletadas e exibidas no dashboard como **métricas diagnósticas** (revelam qual razão de abstenção domina). Deixam de ser gate de promoção/kill switch primário.

Se `abstention_rate_by_reason.NoOpportunity` domina: regime pobre em oportunidades — fato, não problema do modelo.
Se `abstention_rate_by_reason.LowConfidence` domina: calibração pode estar muito conservadora.
Se `abstention_rate_by_reason.InsufficientData` domina: cobertura de rotas é baixa (cold start ou halt cluster).
Se `abstention_rate_by_reason.LongTail` domina: modelo detectando cauda atípica adequadamente.
Se `abstention_rate_by_reason.NoWindowForHuman` domina (ADR-017 aprovado): regime tem janelas curtas demais para workflow humano configurado.

Cada razão informa ajustes diferentes — eliminar gate binário agregado em favor de ação per-razão.

### Simulação obrigatória pré-Marco 2 (ação AP-04 da crítica)

Antes de iniciar construção de modelo em Marco 2:

1. Aplicar os 4 filtros **simulados** (gross ≥ 0.8%, P_simulated ≥ 0.20, toxicity heurística = Healthy, cluster_rank = 1) sobre snapshot histórico de Marco 0 (≥ 30 dias de dados).
2. Contar emissões úteis resultantes.
3. Se `useful_emissions_per_hour_agg_simulated < 3`: **bloqueio de Marco 2**. Revisitar floor, τ's, critérios de toxicity/cluster antes de construir modelo.
4. Se `useful_emissions_per_hour_agg_simulated ∈ [3, 10]`: seguir Marco 2 com vigilância extra; primeiro gate shadow é mais rigoroso.
5. Se `useful_emissions_per_hour_agg_simulated > 10`: seguir Marco 2 normalmente.

Relatório desta simulação fica em `docs/ml/05_benchmarks/pre_marco_2_emission_simulation.md`.

## Alternativas consideradas

### Alt-1 — Manter `abstention_rate ≤ 0.95` apenas

**Rejeitada**: cenário de silêncio parcial (abstention 0.94 + emissões inúteis) não é detectado.

### Alt-2 — Usar apenas `useful_to_scanner_ratio` sem gate absoluto

**Rejeitada**: se scanner tiver dia pobre em oportunidades, ratio pode ficar alta mesmo com volume agregado baixo. Dois gates em conjunto cobrem ambos cenários.

### Alt-3 — Incluir filtro de diversidade temporal (e.g., emissões espalhadas no tempo)

**Pospostaposta para V2**: útil mas adiciona complexidade; cobrir primeiro com os 3 gates primários. Se ficar claro em produção que emissões agregam-se em pequenas janelas, revisar.

### Alt-4 — Gate absoluto baseado em PnL em vez de volume

**Rejeitada como substituto**: gate econômico é ADR-019; gate de volume é complementar. Pequeno volume com alto PnL/emissão médio é aceitável; pequeno volume com baixo PnL é o problema. Volume sozinho já sinaliza.

## Consequências

**Positivas**:
- Fecha lacuna de silêncio parcial.
- Força validação quantitativa pré-Marco 2 da viabilidade operacional antes de construir modelo.
- Alinha incentivos: modelo precisa ser útil operacionalmente, não apenas estatisticamente calibrado.

**Negativas**:
- `τ_volume_min_agg = 5/hora` é chute inicial que precisará calibração empírica em Marco 0.
- Adiciona 2 painéis Grafana e 2 alertas Alertmanager.

**Risco residual**:
- Se regime real for tal que mesmo A3 puro gera <5 emissões úteis/hora agregado, gate é irrealista. Mitigação: recalibrar τ_volume_min_agg como `0.5 × baseline_A3_useful_emissions_per_hour_30d` em vez de número absoluto.

## Dependências

- ADR-018 (Marco 0) — Marco 0 mede baseline A3 para calibrar τ's.
- ADR-005 (Abstenção tipada) — métricas por razão são diagnósticas.
- ADR-019 (gating econômico) — complementar.

## Referências cruzadas

- [STACK.md §10](../11_final_stack/STACK.md) — adicionar gates 9 e 10; remover `abstention > 0.95` como kill switch (mover para diagnóstico).
- [ADR-013](ADR-013-validation-shadow-rollout-protocol.md) — kill switch agora tem 10 gates (6 originais + 4 novos dos ADRs 019 e 020).
- [ADR-017](ADR-017-execution-window-guard-no-window-for-human.md) — `NoWindowForHuman` é uma das razões de abstention diagnóstica.

## Status

**Approved** — simulação pré-Marco 2 (passo 5 acima) é obrigatória e precede qualquer construção de modelo ML.
