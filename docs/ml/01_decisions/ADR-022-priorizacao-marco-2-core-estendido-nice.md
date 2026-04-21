---
name: ADR-022 — Priorização de Marco 2 em Core / Estendido / Nice-to-Have + Ordem de Deprecação
description: Resolve C-02. Estabelece lista explícita de componentes de Marco 2 priorizados em 3 tiers, com ordem de deprecação se prazo estourar. Evita paralisia por análise e garante entregáveis mínimos viáveis.
type: adr
status: approved
author: operador + critica-review
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: ROADMAP.md §Marco 2
reviewed_by: [operador]
---

# ADR-022 — Priorização de Marco 2

## Contexto

Crítica C-02: Marco 2 (6–8 semanas, 2 pessoas) empilha 13+ subsistemas inter-dependentes sem priorização explícita nem ordem de bailout. Derrapagem provável; sem plano B, Marco 2 estende indefinidamente.

Subsistemas declarados em ROADMAP.md §Marco 2:
1. Training pipeline Python (dataset builder + triple-barrier 48 labels + purged K=6).
2. QRF.
3. CatBoost MultiQuantile.
4. RSF (Random Survival Forest).
5. ONNX export + Rust self-test.
6. 15 features MVP (ADR-014) em 6 famílias.
7. HMM 3-estado regime.
8. Joint forecasting via G unificado (ADR-008).
9. Temperature Scaling marginal + per-regime.
10. CQR distribution-free.
11. Adaptive Conformal γ=0.005.
12. Monitoring reliability diagram online.
13. Utility function U₁ com floor configurável.
14. Shadow fase 1 (30 dias).
15. Shadow fase 2 (30 dias) — operador-assisted.

Riscos conhecidos (ROADMAP.md §Riscos #3): ONNX CatBoost MultiQuantile pode não exportar, probabilidade <20% mas sem contingência de cronograma.

## Decisão

### Tier Core (não-negociável)

Sem estes componentes, Marco 2 não entrega valor mínimo viável. Falha em qualquer um destes bloqueia Marco 2 inteiro.

| # | Componente | Justificativa |
|---|---|---|
| C1 | Training pipeline Python + dataset builder PIT-safe | Sem pipeline não há modelo. |
| C2 | Triple-barrier 48 labels paramétricas (ADR-009) | Labels são pré-requisito de treino supervisionado. |
| C3 | Purged K-fold K=6 com embargo 2·T_max (ADR-006) | Sem isso, backtest é enganoso (T9 label leakage). |
| C4 | QRF (Quantile Regression Forest) para quantis de G | Modelo mais simples que produz `TradeSetup` concreto. Baseline ML. |
| C5 | Joint forecasting via G unificado (ADR-008) | Resolve T2 por construção; fundamental. |
| C6 | Utility function U₁ com floor configurável (ADR-002) | Seleção de `enter_at, exit_at` precisa de utility definida. |
| C7 | Temperature Scaling marginal (Camada 1 ADR-004) | Calibração mínima necessária para probabilidade utilizável. |
| C8 | ONNX export + Rust self-test (`rtol=1e-4`) | Ponte Python → Rust obrigatória dado ADR-003. |
| C9 | Shadow fase 1 (30 dias emissão sem execução) | Sem validação em dados reais, promoção é insegura. |
| C10 | Gating econômico (ADR-019) em shadow | Gate de promoção por valor econômico. |

**Estimativa de esforço Core**: 4-5 semanas × 2 pessoas.

### Tier Estendido (adiável se prazo estourar; impacto moderado)

Melhoram precisão e cobertura mas não são bloqueantes.

| # | Componente | Ganho esperado | Adiar para | Custo de adiar |
|---|---|---|---|---|
| E1 | CatBoost MultiQuantile (condicional em features) | +5–10 pp precision@10 | Marco 2b (pós-rollout inicial) | Moderado |
| E2 | Temperature Scaling per-regime (Camada 2 ADR-004) | +2–3 pp ECE dentro de regimes | Marco 3 | Baixo |
| E3 | CQR distribution-free (Camada 3 ADR-004) | Coverage garantida teórica | Marco 3 | Moderado (sem ele, coverage depende de assumpção) |
| E4 | RSF (Random Survival Forest) para horizon | Melhora `horizon_p05/median/p95` | Marco 3 | Moderado — horizon reportado via estatística simples enquanto isso |
| E5 | Monitoring reliability diagram online | Visibilidade em shadow | Marco 3 | Baixo — diagnóstico offline inicial |

**Estimativa de esforço Estendido**: +2-3 semanas.

### Tier Nice-to-Have (cortar primeiro; impacto marginal)

| # | Componente | Ganho esperado | Justificativa de adiamento |
|---|---|---|---|
| N1 | HMM 3-estado regime | Estratificação de regime em calibração | HMM sobre 2600 séries paralelas é notoriamente instável (Gagniuc 2017); em alternativa, usar features de regime (volatilidade rolante, Hurst local) como proxies sem HMM formal. Adiar HMM para Marco 3 com evidência. |
| N2 | Adaptive Conformal γ=0.005 dinâmico | Adaptação a distribution shift | Em shadow inicial, conformal estático é suficiente; adaptive entra em Marco 3 quando drift for medido. |
| N3 | Shadow fase 2 (operador-assisted) dentro de Marco 2 | Medir haircut empírico | Pode ficar em Marco 3 (rollout). Fase 1 (shadow puro) já dá dados suficientes para gating de Marco 2 → Marco 3. |
| N4 | Ablation study contínuo em Marco 2 | Ataque a feature importance | Ablation é de Marco 3; durante Marco 2 ablation apenas pontual em incubação. |

**Estimativa de esforço Nice-to-Have**: +1-2 semanas (cortada sem perda crítica).

### Ordem de deprecação se prazo derrapar

Em ordem de primeiro-a-cortar:

1. **N4 ablation contínuo** → ablation pontual só em pull request
2. **N3 shadow fase 2 dentro de Marco 2** → move para Marco 3
3. **N2 Adaptive Conformal** → Marco 3
4. **N1 HMM 3-estado** → Marco 3, substituído por features de regime
5. **E5 Monitoring reliability online** → offline-only em Marco 2
6. **E4 RSF** → Marco 3; horizon via estatística simples no interim
7. **E3 CQR distribution-free** → Marco 3; coverage paramétrica em interim
8. **E2 Temperature per-regime** → Marco 3
9. **E1 CatBoost MultiQuantile** → Marco 2b (pós-rollout inicial); QRF sozinho em produção inicial

**Nunca cortar**: C1–C10 (Core). Se Core for inviável, parar Marco 2 e voltar à prancheta.

### Decisão por componente se ONNX CatBoost falhar (contingência ROADMAP #3)

Se CatBoost MultiQuantile não exportar para `tract` (ops não suportados):
1. **Fallback A**: usar só QRF (tier Core C4). Aceita perda de +5–10 pp; Marco 2 prossegue.
2. **Fallback B**: aceitar binary +50MB com `ort`. Rejeitado em ADR-003 §5; reconsiderar apenas se ΔPR-AUC justificar.
3. **Fallback C**: reimplementar quantile regression em Rust puro (linfa-ensemble + agregador de quantis custom). Esforço estimado: +2 semanas.

Decisão default: **Fallback A**. Outros só com justificativa numérica.

### Gates de Marco 2 atualizados (incorporando priorização)

Para promover de Marco 2 → Marco 3, obrigatório:

- **Todos Core (C1–C10) implementados e testados**.
- **Gate econômico ADR-019 passado** (`simulated_pnl_bruto_30d_modelo ≥ 1.20 × baseline_A3` ou valor absoluto equivalente).
- **Gate volume útil ADR-020 passado**.
- **Gate ML tradicional** (`precision@10 ≥ baseline_A3 + 0.05`, `ECE_global ≤ 0.03`, `DSR > 2.0`).
- **Leakage audit CI passando em todas PRs**.
- **Zero-alloc verification**.

Tiers Estendido e Nice-to-Have: registrar no relatório de Marco 2 quais foram implementados, quais foram adiados e justificativa.

## Alternativas consideradas

### Alt-1 — Manter escopo atual sem priorização

**Rejeitada**: aceita risco C-02 integralmente. Se prazo estourar, derrapagem sem critério é caótica.

### Alt-2 — Marco 2 menor só com Core

**Rejeitada como default**: Estendido agrega precisão significativa que justifica esforço se prazo permitir. Priorização permite atingir Estendido se viável, cortar se não.

### Alt-3 — Dois Marcos 2 separados (2a Core, 2b Estendido)

**Considerada**: tem mérito de clareza. **Rejeitada por ora**: adiciona overhead de transição entre Marcos. Se na prática derrapagem ocorrer, ADR-022 já permite migração de componentes para Marco 3 sem re-estrutura.

## Consequências

**Positivas**:
- Garante entregáveis mínimos viáveis (Core) com alto grau de certeza.
- Ordem explícita de deprecação elimina caos em caso de derrapagem.
- Permite planejamento financeiro e de recursos: pessoa-semana necessário por tier.
- Alinha expectativa: QRF sozinho em produção inicial é aceitável; CatBoost é otimização.

**Negativas**:
- Criar expectativa de que Estendido/Nice-to-Have "vai chegar" pode atrasá-los indefinidamente. Mitigação: Marco 3 tem prazos explícitos para migração.
- Risco de fragmentação: Marco 2 incompleto sai para produção. Mitigação: Core é aprovado como "mínimo viável para produção" com documentação explícita das limitações.

**Risco residual**:
- Se Core sozinho não bater gate econômico (ADR-019), Marco 2 falha. Mitigação: reavaliar se o stack ML agrega valor sobre A3; considerar operar apenas A3 em produção enquanto retrabalha Marco 2.

## Dependências

- ADR-018 (Marco 0) — antecede Marco 2.
- ADR-019 (gating econômico) — gate de promoção Marco 2 → Marco 3.
- ADR-020 (gate volume útil) — gate de promoção.
- ADR-008, ADR-009, ADR-003, ADR-001, ADR-002, ADR-004, ADR-006, ADR-007, ADR-014 — componentes citados.
- ADR-021 (protocolo revisão) — Estendido/Nice pode virar ADR reaberto se medições empíricas mostrarem valor alto.

## Referências cruzadas

- [ROADMAP.md §Marco 2](../11_final_stack/ROADMAP.md) — escopo original; atualizar para referenciar este ADR.
- [ADR-003](ADR-003-rust-default-python-treino-onnx.md) — `tract` como default; fallback `ort` só com burden-of-proof.

## Status

**Approved** — Marco 2 deve seguir esta priorização. Qualquer alteração requer novo ADR.
