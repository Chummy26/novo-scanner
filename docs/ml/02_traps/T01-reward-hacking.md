---
name: T01 — Reward Hacking por Spreads Baixos
description: Modelo vicia em micro-spreads com P alto sob utilidade ingênua; tratamento via U₁ = P × max(0, gross − floor) configurável
type: trap
status: addressed
severity: critical
primary_domain: D1
secondary_domains: [D4, D10]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T01 — Reward Hacking por Spreads Baixos

## Descrição

Se a função de utilidade for ingenuamente `U = P(realize) × gross_profit`, o modelo aprende que setups pequenos têm probabilidade alta e converge para emitir **micro-spreads com alta confiança** — e.g., `enter 0.30%, exit −0.20%, gross_profit 0.10%, P=0.95`. Economicamente: operador paga fees de ~0.20–0.40% no ciclo; PnL líquido é **negativo** mesmo com P=0.95.

O conflito é estrutural: scanner é explicitamente "detector, não calculadora de PnL" (skill §1.4 e feedback canônico na memória) — portanto o modelo **não deve** aplicar fees nas recomendações. A solução correta impõe **floor empírico** sobre `gross_profit` de forma que recomendações sempre estejam acima do piso onde o operador considera economicamente viável.

## Manifestação empírica

Simulação D1 §5 com 431 snapshots reais do scanner:
- **U₀ ingênua**: `P × gross` → E[PnL_liq] = **−0.12%** (sistema perde dinheiro com fees realistas retail).
- **U₁ com floor 0.4% (2× fees)**: E[PnL_liq] = **+0.17%**.
- **U₁ com floor 0.8% (revisado skill)**: E[PnL_liq] projetado **+0.25%** com emissão ~60% menor mas precisão superior.

Patrão de falha silencioso: **métricas de ML parecem excelentes** (precision@10 ~0.90, ECE ~0.01) porque modelo está acertando em micro-spreads; **apenas backtest com fees descobre o prejuízo**.

## Tratamento

### Primário — ADR-002 Função de utilidade U₁ com floor

```
U₁ = P × max(0, gross_profit − floor)
```

- **Floor default**: 0.6–1.0% (configurável via CLI/UI).
- Componentes do floor empírico:
  - **4 taker fees** (2 pernas × 2 operações) ≈ 0.20%.
  - **Funding cross-snapshot** se `T_max` cruza 8h ≈ ±0.01–0.1%.
  - **Rebalance amortizado** ≈ 0.02–0.10%.
  - **Custo capital idle** em 2 venues simultâneas ≈ 0.01–0.05%.

### Secundário — Sanity check em backtest

- Profit curve simulada com fees hipotéticos aplicados pós-emissão (D4 §métricas).
- **Não** para ajustar modelo (viola princípio detector-não-calculadora), mas para **validar externamente** que floor default é adequado.
- Se profit curve simulada < 0 com floor 0.6%, operador ajusta configuração.

### Terciário — Abstenção via `NoOpportunity` (ADR-005)

- Se nenhuma tupla `(enter_at, exit_at)` viável atinge floor → abstém tipado `NoOpportunity` em vez de emitir sub-ótimo.

### Quaternário — Shadow mode validação (ADR-012 D10 pendente)

- Coleta precision@10 **pós-filtro de floor** em shadow.
- Ajuste empírico do floor recomendado após 60 dias de dados.

## Residual risk

- **Operador mal-configurado**: floor muito baixo reproduz armadilha localmente. Mitigação: UI mostra warning "floor abaixo do mínimo recomendado".
- **Proxy imperfeito do floor**: rebalance + capital idle são estimativas. Shadow calibra haircut real.
- **Regime change fees**: venue muda fee tier sem aviso. Mitigação: config de fee tier por venue com datas; revisão trimestral.

## Owner do tratamento

- ADR-002 (primário).
- Revisão: 60 dias pós-deploy via dados shadow.

## Referências cruzadas

- [ADR-002](../01_decisions/ADR-002-utility-function-u1-floor-configuravel.md).
- [ADR-005](../01_decisions/ADR-005-abstencao-tipada-4-razoes.md).
- [D01_formulation.md](../00_research/D01_formulation.md) §Utilidades.
- Skill canônica §6.1 (custos diretos).

## Evidência numérica citada

- Simulação D1 §5: U₀ → −0.12%; U₁ (floor=0.4%) → +0.17%.
- Fees taker retail tier crypto 2026-04: MEXC 0.020%, BingX 0.050%, XT 0.040%, Gate 0.075%, Bitget 0.060%, KuCoin 0.080%.
- Funding rate extremo observado: até ±0.3% por snapshot (MEXC perp, eventos 2025-11 documentados em operação real).
