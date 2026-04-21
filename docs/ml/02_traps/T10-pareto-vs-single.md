---
name: T10 — Um Setup vs Fronteira de Pareto
description: Operador tem diferentes risk aversion; emitir setup único força escolha — tratamento via MVP único α=0.5 + Pareto 3 pontos em V2
type: trap
status: addressed
severity: medium
primary_domain: D1
secondary_domains: [D10]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T10 — Um Setup vs Fronteira de Pareto

## Descrição

O operador pode preferir diferentes pontos do trade-off entre `gross_profit` e `realization_probability`:

| Perfil | enter_at | exit_at | gross | P | perfil de risco |
|---|---|---|---|---|---|
| Conservador | 1.0% | −0.5% | 0.5% | 0.85 | baixo risco, alta precision |
| Médio | 2.0% | −1.0% | 1.0% | 0.65 | balance |
| Agressivo | 3.0% | −0.5% | 2.5% | 0.30 | alto upside, baixa precision |

Emitir um **único** TradeSetup força uma escolha. Emitir a **fronteira inteira** dá poder ao operador — mas complica UX e exige mais cômputo.

## Manifestação

- Operador conservador recebe recomendação agressiva → ignora sistematicamente → coverage útil cai.
- Operador agressivo recebe recomendação conservadora → execução de micro-spreads → T1 risk materializa localmente.
- Sem alinhamento, confiança no sistema erode.

## Tratamento

### Fase MVP V1 — ADR-001 Setup único α=0.5 (médio)

- Emite **um TradeSetup** com risk aversion α=0.5 (ponto médio).
- Floor configurável via ADR-002 permite ajuste grosseiro.
- **Razão**: UX simples; validação rápida; sem sobre-engenharia sem evidência.

### Fase V2 (8 semanas pós-deploy) — Pareto 3 pontos

Se dados de shadow mode (ADR-012 D10 pendente) revelarem que operador filtra setups médios e prefere extremos:

- Emitir 3 pontos Pareto: conservador (α=0.8), médio (α=0.5), agressivo (α=0.2).
- Operador escolhe em UI ou configura default.
- Ganho projetado: +0.21 a +1.8% E[PnL_liq] via escolha melhor do operador.

### Fase V3 (futuro) — Frontier completa + λ ajustável

- Operador define `λ` risk aversion continuamente em UI (slider).
- Modelo re-computa setup correspondente em < 100 µs (pós-processamento é trivial dado distribuição conjunta).
- Reservado para quando adoção estabilizar e demanda for clara.

## Gatilhos para promoção V1 → V2

Via shadow mode (D10):
- **Fração de setups ignorados por perfil** — se conservador ignora > 40% dos setups médios, sinaliza demanda por conservador.
- **Execuções em spreads > 3%** — frequência sinaliza demanda por agressivo.
- **Feedback operacional explícito** do usuário (pesquisa UI ou log de comentários).

Se gatilho negativo (operador consome `α=0.5` adequadamente) → V1 permanente.

## Residual risk

- **Pareto complica dataset de treino**: treinar modelo para emitir frontier exige labels paramétricas (48 combos já em ADR-009 cobrem). Sem custo adicional.
- **Operador indeciso**: 3 pontos pode ser too-many-choices. Mitigação: UI com 3 pontos só se operador marcar "show variants".
- **Perfil muda com tempo**: operador conservador hoje pode virar agressivo após ganho; config persistido precisa ser revisável.

## Owner do tratamento

- ADR-001 (V1 setup único).
- Futuro ADR para V2 Pareto (dependente D10 data).

## Referências cruzadas

- [ADR-001](../01_decisions/ADR-001-arquitetura-composta-a2-shadow-a3.md).
- [ADR-002](../01_decisions/ADR-002-utility-function-u1-floor-configuravel.md).
- [D01_formulation.md](../00_research/D01_formulation.md) §T10.
- ADR pendente (D10) para validação shadow.

## Evidência numérica citada

- D1 simulação: U₄ Pareto emissão variável de +0.21 a +1.8% E[PnL_liq] conforme ponto selecionado.
- Steel-man D1 §4.4 — U₄ rejeitada para MVP por UX complexity; aceitável em V2 se dados justificarem.
- MVP → V2 gatilho: shadow mode ≥ 8 semanas (D10 §5.4 pendente).
