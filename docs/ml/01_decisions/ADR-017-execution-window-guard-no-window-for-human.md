---
name: ADR-017 — Execution Window Guard + 5ª Razão de Abstenção `NoWindowForHuman`
description: Adiciona filtro duro que aborta emissão quando a janela esperada de persistência do entrySpread é menor que o tempo mínimo que o operador humano precisa para consumir a recomendação e executar a perna de entrada. Estende ADR-005 (abstenção tipada) de 4 para 5 razões.
type: adr
status: proposed
author: operador + critica-review
date: 2026-04-20
version: 0.1.0
supersedes: null
extends: ADR-005 (5ª razão); ADR-016 (novo campo)
reviewed_by: [pendente-aprovacao-operador]
---

# ADR-017 — Execution Window Guard

## Contexto

Crítica-review identificou contradição estrutural não-mitigada:

- T11 (D2 §T11) projeta `median(D_{x=2%}) < 0.5s` — mediana da persistência do `entrySpread ≥ 2%` é sub-segundo em longtail crypto.
- Critério de sucesso do CLAUDE.md: "operador executa com convicção sem consultar histórico manualmente".
- Escopo fechado: execução é 100% humana.

**Contradição**: se o modelo emite recomendação com `enter_at ≥ 2%` e a janela física de persistência é < 0.5s, o humano não consegue consumir + decidir + executar a tempo. Recomendação entregue, janela fechada antes do clique.

Observação refinada do operador (2026-04-20): o problema é exclusivamente a **persistência da janela de entrada**. A saída após entrada tem horizonte de minutos a horas como esperado — esse lado não é crítico. O filtro é para dar tempo ao humano de fazer a entrada.

ADR-016 já reporta `horizon_p05_s` no struct como diagnóstico, mas o plano atual **não bloqueia** emissão de recomendações fisicamente impossíveis — só reporta.

## Decisão

Adicionar:

### 1. Campo configurável pelo operador (CLI/UI)

```rust
/// Tempo mínimo (segundos) que o operador precisa para consumir uma
/// recomendação e executar a perna de entrada. Configurável por operador.
/// Defaults propostos: 5s (agressivo), 10s (default), 30s (conservador).
pub execution_window_min_s: u32,
```

Sem default universal — cada operador calibra conforme seu workflow (UI nativa? bot de chat? alerta + click manual em venue? latência de rede?).

### 2. 5ª razão de abstenção (estende ADR-005)

```rust
pub enum AbstainReason {
    NoOpportunity,
    InsufficientData,
    LowConfidence,
    LongTail,
    NoWindowForHuman,   // NOVO — ADR-017
}
```

### 3. Filtro duro pré-emissão

```rust
// Pseudocódigo do recomendador, antes de emitir Trade(TradeSetup):
if setup.horizon_p05_s < operator_config.execution_window_min_s {
    return Recommendation::Abstain {
        reason: AbstainReason::NoWindowForHuman,
        diagnostic: AbstainDiagnostic::HorizonTooShort {
            horizon_p05_s: setup.horizon_p05_s,
            required_s: operator_config.execution_window_min_s,
        },
    };
}
```

`horizon_p05_s` aqui é **persistência esperada da janela de entrada** (tempo até o `entrySpread` cair abaixo do `enter_at_min`), não tempo até saída.

### 4. Métrica operacional correspondente

Adicionar à dashboard:

- `abstention_rate_by_reason.no_window_for_human` rolling 1h, 24h, 7d.
- Se > 50% por 24h consistente → sinal de que `execution_window_min_s` está alto demais OU regime atual tem persistência estruturalmente curta (decisão operador: reduzir τ ou aceitar menos emissões).

## Condicionalidade (importante)

**Este ADR é PROPOSED, não APPROVED**. Conversão para APPROVED depende de uma das duas condições empíricas serem observadas no Marco 0/1 de coleta:

- **Condição A**: `median(D_{x=2%}) < 2s` confirmado em ≥ 30 dias de coleta real → filtro é inegociável.
- **Condição B**: `median(D_{x=2%}) ≥ 10s` contradiz projeção D2 → filtro torna-se redundante; ADR rejeitado, mantém-se apenas reporte de `horizon_p05_s` como já está em ADR-016.

Se a realidade cair entre (`2s` e `10s`), decisão depende de valor operacional empírico — revisar com operador.

## Alternativas consideradas

### Alt-1 — Manter só reporte (status quo)

Operador vê `horizon_p05_s` no struct e decide sozinho se tenta executar.

**Rejeitada (condicional)**: se T11 se confirmar, operador vai receber recomendações fisicamente impossíveis em volume material — erode confiança no modelo ("recomendou e quando cliquei já foi"), viola critério de sucesso do CLAUDE.md (executar com convicção).

### Alt-2 — Penalizar no utility function em vez de abstenção

Modificar U₁ para `U = P × max(0, gross − floor) × min(1, horizon_p05_s / τ_humano)`.

**Rejeitada**: mistura preocupação de execução física com preocupação econômica; torna U₁ menos interpretável; não gera métrica separada de "quantas rotas foram bloqueadas por janela humana".

### Alt-3 — Apenas flag visual, sem bloqueio

Emitir com flag `⚠️ WINDOW_TOO_SHORT`.

**Rejeitada**: operador humano sob pressão de alertas em tempo real não vai filtrar consistentemente por flag visual. Latência cognitiva de humano é parte do problema; pedir que humano compense com atenção extra é não resolver o problema.

## Consequências

**Positivas**:
- Modelo respeita limitação física do consumidor final (humano).
- Métrica `NoWindowForHuman` expõe tensão entre regime de mercado e workflow operacional, permitindo ajuste consciente.
- Torna o sistema honesto: não finge que setups impossíveis são acionáveis.

**Negativas**:
- Pode aumentar taxa de abstenção agregada, comprimindo volume útil emitido.
- Em regimes de alta volatilidade onde janelas são naturalmente curtas, pode silenciar o modelo exatamente quando mais oportunidade existe.

**Risco residual**:
- Se operador configurar `execution_window_min_s` muito conservador (ex: 60s), pode perder 80%+ das oportunidades viáveis. Dashboard com `abstention_rate_by_reason` permite auto-calibração.
- `horizon_p05_s` é predição do modelo, não medição — se o preditor de horizonte for enviesado (otimista), filtro vaza; se for pessimista, filtro sobrecorrige. Exige validação empírica em Marco 0/1 comparando `horizon_p05_predicted` vs `D_x_realizado`.

## Dependências

- Requer que `horizon_p05_s` esteja implementado no struct (ADR-016 — já previsto).
- Requer canal de configuração CLI/env para `execution_window_min_s` por operador.
- Dashboard Prometheus precisa de nova série `abstention_rate_by_reason{reason="no_window_for_human"}`.

## Referências cruzadas

- [ADR-005](ADR-005-abstencao-tipada-4-razoes.md) — define enum `AbstainReason` que este ADR estende.
- [ADR-016](ADR-016-output-contract-refined.md) — define `horizon_p05_s` no struct.
- [T11 — execution-feasibility](../02_traps/T11-execution-feasibility.md) — origem da contradição estrutural.
- CLAUDE.md §Critério de sucesso — "operador executa com convicção".
- [STACK.md §2](../11_final_stack/STACK.md) — D2 projeção `median(D_{x=2%}) < 0.5s`.
- [OPEN_DECISIONS.md](../11_final_stack/OPEN_DECISIONS.md) — adicionar nova entrada sob Tema F (validação pós Marco 0).

## Evidência a coletar em Marco 0

- Histograma empírico de `D_{x=2%}` por rota (2600 rotas × ≥30 dias).
- Correlação entre `horizon_p05_predicted` pelo modelo preliminar e `D_x_realizado` (validação do preditor).
- Benchmark de `τ_humano` real observando tempo entre notificação e clique em shadow fase 2.

## Status

**Proposed** — aguardando:
1. Aprovação do operador (validou conceitualmente em 2026-04-20; aguarda decisão formal de promover para approved).
2. Confirmação empírica via Marco 0 (30 dias mínimo) antes de promoção automática para approved.
