---
name: ADR-002 — Função de Utilidade U₁ com Floor Configurável pelo Operador
description: Adoção de utilidade U₁ = P × max(0, gross_profit − floor) com floor empírico ≥ 2× fees + funding + rebalance + capital idle, rejeitando utilidade ingênua U₀
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d1-formulation]
---

# ADR-002 — Função de Utilidade U₁ com Floor Configurável

## Contexto

A armadilha **T1 — Reward hacking por spreads baixos** (§3.5 prompt original) é crítica: com utilidade ingênua `U₀ = P × gross_profit`, o modelo aprende que setups pequenos têm probabilidade alta e converge para emitir **micro-spreads com alta confiança** (ex: enter 0.30%, exit −0.20%, gross 0.10%, P=0.95). Operador paga fees de ~0.20–0.40% no ciclo → **PnL líquido negativo mesmo com P=0.95** (D1 §5, simulação).

Por outro lado, o scanner é explicitamente "detector, não calculadora de PnL" (feedback canônico na memória; skill §1.4): o modelo **não deve aplicar fees** nas recomendações. A solução é impor **floor empírico** sobre `gross_profit` que o operador configura.

Cinco formulações foram avaliadas em D1:

| Utilidade | Fórmula | E[PnL_liq] (simulação) | Vicia em micro? |
|---|---|---|---|
| U₀ | `P × gross_profit` | **−0.12 %** | sim |
| **U₁** | **`P × max(0, gross_profit − floor)`** | **+0.17 %** | **não** |
| U₂ | `P × gross − λ·\|gross − target\|` | +0.10 % | parcial |
| U₃ | E[CVaR conditioned on success] | +0.09 % | não |
| U₄ | Pareto frontier (3 pontos) | variável: +0.21 a +1.8% | não |
| U₅ | Kelly log-utility | −0.04 % (sensível a miscalib) | — |

## Decisão

Adotar **U₁ = P × max(0, gross_profit − floor)** como função de utilidade em produção, com os seguintes parâmetros:

### Floor default (revisado pela skill canônica)

Floor mínimo plausível = **2× fees típicas + funding cross-snapshot + rebalance amortizado + custo capital idle**:

- **Fees**: 4 taker fees (entrada A, entrada B, saída A, saída B). Exchange tier retail típico ~0.05% cada → 0.20%.
- **Funding cross-snapshot**: se `T_max` cruza snapshot 8h, operador paga/recebe funding — magnitude típica ±0.01% a ±0.1% por snapshot em condições normais (skill §6.1).
- **Rebalance amortizado**: transferências periódicas entre venues para manter inventário. Custo por trade: ~0.02–0.10% dependendo do ativo e da frequência.
- **Custo capital idle**: oportunidade perdida ao manter capital pré-posicionado em 2 venues simultaneamente. Magnitude depende do CoC do operador; default proxy: 0.01–0.05%.

**Floor default recomendado**: **0.6% a 1.0%** (configurável via UI/CLI). Conservador 1.0%; agressivo 0.6%.

**Substitui a sugestão anterior de 0.4%** (2× fees) de D1, incorporando a correção derivada do skill canônico §6.

### Output: MVP com setup único

MVP V1 emite **um único TradeSetup** por rota sob α = 0.5 risk aversion (ponto médio). Pareto frontier (U₄) com 3 pontos (conservador α=0.8 / médio α=0.5 / agressivo α=0.2) é postergado para V2, contingente a evidência empírica de que operador consome variedade de perfis.

### Utilidades rejeitadas

- **U₀ ingênua**: rejeitada — viés comprovado de micro-spreads; PnL líquido negativo.
- **U₂ target-reg**: rejeitada — dois hiperparâmetros livres (λ, target) sem ground-truth para calibrar.
- **U₃ CVaR**: descartada — exclui ~70% das amostras; variância alta em regime ruidoso.
- **U₅ Kelly**: descartada por ora — sensível a miscalibração (Thorp 1997 *Handbook of Asset & Liability Management*); prematuro antes de calibração auditada por 60 dias.

## Alternativas consideradas

### Constraint dura vs. soft penalty

- **Constraint dura**: rejeitar candidatos com `gross_profit < floor` antes de ranking. Mais interpretável, mais agressivo.
- **Soft penalty (U₁ com max(0, ...))**: retorna 0 utilidade sob floor; ainda deixa modelo aprender a priorizar acima do floor.

**Decisão**: **soft penalty U₁**. Constraint dura elimina abstenção tipada `NoOpportunity` (ADR-005) — modelo ficaria forçado a emitir alguma coisa acima do floor, mesmo que sub-ótima. Soft permite abstenção.

### Floor fixo vs. floor configurável pelo operador

A estratégia é **discricionária** (skill §5). Operadores distintos têm:
- Tier de fees distintos (retail vs VIP).
- Tolerância de risco distintos.
- Tamanhos de posição distintos (afeta rebalance amortizado).
- Perfis de ativo (BTC vs altcoin longtail).

**Decisão**: **floor configurável via CLI/UI**. Default 0.8% (meio do range recomendado).

## Consequências

**Positivas**:
- Modelo não vicia em micro-spreads (T1 mitigado estruturalmente).
- Operador mantém controle discricionário (princípio do skill §5).
- Abstenção tipada `NoOpportunity` funciona coerentemente (ADR-005).

**Negativas**:
- Operador mal-configurado (floor muito baixo) pode reproduzir a armadilha T1 localmente. Mitigação: UI mostra "floor abaixo do mínimo recomendado" como warning.
- Dataset de treinamento precisa ser gerado com múltiplos floors para cada amostra — labels paramétricas (ADR-006) resolvem isso.

**Risco residual**:
- Floor proxy (rebalance, capital idle) é estimativa grosseira. Shadow mode (D10 pendente) calibra o haircut real (`quoted` vs `realized`) e ajusta floor recomendado.

## Status

**Aprovado** para Marco 1. Revisar em 60 dias com dados de shadow mode.

## Referências cruzadas

- [D01_formulation.md](../00_research/D01_formulation.md) §Utilidades.
- [T01_reward_hacking.md](../02_traps/T01-reward-hacking.md).
- [ADR-005](ADR-005-abstencao-tipada-4-razoes.md) — abstenção via `NoOpportunity`.
- Skill canônica §5.1–5.2 (parâmetros estruturais vs discricionários), §6.1–6.3 (custos).

## Evidência numérica

- Simulação D1 §5 com 431 snapshot do scanner: U₀ → E[PnL_liq] = −0.12%; U₁ (floor=0.4%) → +0.17%; U₁ (floor=0.8%, revisado) → projetado +0.25% com emissão ~60% menor mas precisão superior.
- Fees taker exchanges tier retail (2026-04): MEXC 0.020%/trade, BingX 0.050%, XT 0.040%, Gate 0.075%, Bitget 0.060%, KuCoin 0.080%. Média ~0.054% → 4 trades = 0.216%.
- Funding rate extremo observado longtail: até ±0.3% por snapshot (MEXC perp ACE-USDT 2025-11 evento documentado em operação real).
