---
name: Decisões Aprovadas — Contrato Formal MVP
description: Valores finais aprovados pelo operador em 2026-04-19 para todos os ~30 pontos de OPEN_DECISIONS; contrato formal que desbloqueia implementação
type: approval-log
status: approved
author: operador + programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# Decisões Aprovadas — Contrato Formal MVP

Aprovação em bloco do operador em **2026-04-19**, com refinamento explícito:

> "Aprovo tudo. Porém: começar apenas com dados de spreads em %. Operador humano na arbitragem real analisa o histórico das 24h dos spreads, não dos books. `book_age`, `vol24` e venue_health viram filtros, não features."

Consequência: **ADR-014 adicionado**; simplifica MVP V1 de 24 → 15 features.

---

## TEMA A — MVP vs V2

| # | Decisão | Valor aprovado | ADR/arquivo |
|---|---|---|---|
| A.1 | Começar com A3 ECDF ou direto A2? | **A3 first (1–2 sem); A2 só se ΔAUC-PR ≥ 5pp** | ADR-001 |
| A.2 | Setup único vs Pareto? | **Único α=0.5 em MVP; Pareto em V2 contingente** | ADR-001, T10 |
| A.3 | Abstenção binária + modelo separado ou ternário? | **Binário + modelo separado** | ADR-005, ADR-009 |
| A.4 | Capacity analysis MVP ou V2? | **V2** | — |

---

## TEMA B — Defaults (desbloqueia Marco 1) ✅

| # | Parâmetro | Valor aprovado | Efeito |
|---|---|---|---|
| B.1 | Floor U₁ default | **0.8%** | cobre 4 fees + funding + rebalance + capital idle |
| B.2 | Janela histórico default | **24h** (togglável 6h/12h/7d) | ciclo intradiário completo |
| B.3 | λ portfolio penalty | **0.5** | conservador 0.7 / agressivo 0.3 |
| B.4 | Target ECE | **0.03 em V1**, apertar para 0.02 após 60d | realista em longtail |
| B.5 | IC nominal default | **95%** | operador discricionário conservador |
| B.6 | τ_abst (abstenção LowConfidence) | **τ_prob=0.20, τ_gross=0.5%** | calibrável em shadow |
| B.7 | Número de features MVP | **15** (revisado via ADR-014) | spreads-only alinhado ao operador |
| B.8 | K purged K-fold | **K=6** | balance entre variância e dados por fold |

---

## TEMA C — Infraestrutura

| # | Decisão | Valor aprovado | ADR |
|---|---|---|---|
| C.1 | ONNX runtime | **`tract 0.21.7`** (pure-Rust, zero deps) | ADR-003 |
| C.2 | Binary size alvo | **~22.5 MB aceitável** | — |
| C.3 | Feature store | **redb + HdrHistogram cache + QuestDB + Parquet** (4 camadas) | ADR-012 |
| C.4 | Granularidade amostragem labels | **150 ms full para trigger P95+; subsampling para resto** | ADR-009 |
| C.5 | Winsorize | **p99.5%** | ADR-006 |
| C.6 | K-fold paralelo | **Sim** (reduz 30 min → 8 min CI) | ADR-006 |
| C.7 | Fee tier | **Retail default + VIP configurável por usuário** | ADR-002 |
| C.8 | Serving architecture | **A2 thread dedicada** (não inline) | ADR-010 |

---

## TEMA D — Coleta empírica

| # | Parâmetro | Valor aprovado |
|---|---|---|
| D.1 | Coleta antes de endurecer hiperparâmetros | **60–90 dias × 2600 rotas (~1.5×10⁸ pontos)** |
| D.2 | Target AUC-PR baseline A3 | **Em aberto** (calibrar empiricamente primeiros 30 dias; esperado 0.4–0.6) |
| D.3 | Assinar L2 depth | **V2 contingente** (só se haircut > 40%) |
| D.4 | `staleness_tolerance_s` do operador | **4h (14400s)** default; confirmar com operador |

---

## TEMA E — Thresholds operacionais

| # | Parâmetro | Valor aprovado | ADR |
|---|---|---|---|
| E.1 | T12 thresholds (share_of_daily_volume) | **5% flag / 10% alert / 15% desativa ML per-rota** | ADR-011 |
| E.2 | Kill switch escopo | **Global com alert per-estrato** em V1 | ADR-013 |
| E.3 | Horário retreino noturno | **04:00 UTC** | ADR-011 |
| E.4 | Janela de treino (rolling) | **14 dias** | ADR-011 |
| E.5 | ADWIN δ (falso alarme) | **0.001** | ADR-011 |
| E.6 | Adaptive conformal γ | **0.005 fixo em V1** | ADR-004 |
| E.7 | MAML meta-learning | **V3 roadmap** (partial pooling James-Stein basta em V1/V2) | ADR-007 |

---

## TEMA F — Validação e deploy

| # | Parâmetro | Valor aprovado | ADR |
|---|---|---|---|
| F.1 | Shadow duração | **30 dias Fase 1 + 30 dias Fase 2 = 60 dias** | ADR-013 |
| F.2 | Canary % rotas | **Top-20 rotas por vol24** (~0.8% do volume) | ADR-013 |
| F.3 | Rollout stages | **50/50 por 7d → 80/20 por 7d → 100%** | ADR-013 |
| F.4 | Kill switch FP rate tolerável | **≤ 1/semana** | ADR-013 |

---

## Refinamentos adicionais aprovados (2026-04-19)

### R.1 — Feature set MVP: 24 → 15 features (spreads-only)
- Famílias A, B, E, F, G, I mantidas (15 features).
- Famílias C (book_age), D (vol24), H (venue_health) **movidas para filtros de trigger**, não removidas do sistema.
- Trigger existing em ADR-009: `book_age < 200ms` + `min(vol24) ≥ $50k` + `NOT halt_active`.
- Formalizado em **ADR-014**.
- Alinha modelo ao mental model do operador humano (que analisa histórico de spreads, não de books).

### R.2 — Output como thresholds + distribuição de lucro (primeira formulação, ADR-015)
- `enter_at_min`, `exit_at_min` são **thresholds mínimos** (regra acionável), não valores pontuais.
- `gross_profit` reportado como **distribuição** de quantis, não escalar.
- Sinal tactical em tempo real (150 ms): eligibility + quality indicator.
- Operadores distintos seguindo a mesma regra ficam em quantis distintos da distribuição — modelo não promete precisão pontual espúria.
- **Formalizado em ADR-015** (refinado por ADR-016 abaixo).

### R.3 — Refinamento do output pós-investigação PhD Q1/Q2/Q3 (ADR-016)

Investigação com 3 agentes PhD independentes (Q1 microestrutura, Q2 distributional ML, Q3 UX) produziu correções materiais a ADR-015:

- **Crítica Q2-M2**: `P(realize)` **NÃO é** `p_enter_hit × p_exit_hit_given_enter` (contradiz ADR-008 sob correlação −0.93). Correto: **`P(G(t,t') ≥ floor | features)` derivado direto da CDF** do modelo G unificado. `p_enter_hit` e `p_exit_hit_given_enter` permanecem como **sinais táticos informativos**, não insumos do cálculo.
- **Q2-M1**: `gross_profit_min` determinístico substituído por quantis empíricos `p10/p90` verificáveis com ~10 trades (Kolassa 2016 *IJF* 32(3)); distribuição final `{p10, p25, median, p75, p90, p95}`.
- **Q2-M3**: scoring rules de treino declaradas explicitamente — pinball loss para quantile regressor (Gneiting & Raftery 2007 Theorem 8), log loss para classifier P(realize) (Theorem 1).
- **Q2-M4**: CRPS como métrica offline de avaliação da distribuição completa (~40 LoC Rust, O(N log N)).
- **Q1-E1**: `toxicity_level ∈ {Healthy, Suspicious, Toxic}` — rotula região da cauda direita como tóxica se book_age alto OU staleness OU spike-único (Foucault, Kozhan & Tham 2017 *RFS* 30(4)).
- **Q1-E2**: `cluster_id` + `cluster_size` + `cluster_rank` — previne interpretação errada de N setups correlacionados como N oportunidades independentes (Diebold-Yilmaz 2012).
- **Q1-E3**: `horizon_p05_s` simétrico a `horizon_p95_s` — informa urgência tática.
- **Q1-F6**: `exit_refined(actual_enter_price)` — **postergado para V2** (ganho 10–25% Leung & Li 2015).
- **Q3-F-UX5**: layout UI em **3 camadas** (overview minimalista → drill-down distribuição → overlay gráfico 24h); atualização visual **≤ 2 Hz** (não 150 ms); `P` em **frequência natural "77/100"** (Gigerenzer & Hoffrage 1995 *Psych Review* 102(4)); `enter_typical` na camada 2 (evita anchoring Tversky & Kahneman 1974).
- **Formalizado em ADR-016**. Arquitetura A2 + stack técnico inalterados; apenas contrato de output e head adicional para classifier `P(realize)` direto.

---

## Status por Marco

### Marco 1 — DESBLOQUEADO (pode iniciar)
- Todas as decisões de Tema B + C aprovadas ✅
- Tema A aprovado (A3 baseline primeiro) ✅
- Arquitetura de serving (C.8) e feature store (C.3) decididos ✅
- Output tipado (ADR-005) aprovado ✅

### Marco 2 — Pendente Marco 1 + Tema D (coleta)
- Tema A.1 segunda parte (A2 se ΔAUC-PR ≥ 5pp) acontece durante Marco 2 conforme dados do shadow.
- Tema D.2 (target AUC-PR) calibrado empiricamente durante shadow.

### Marco 3 — Pendente Marco 2 + Tema F
- Tema F (validação + rollout) já aprovado; executa durante Marco 3.
- Tema E (drift thresholds) aprovado; implementação em E5 Hybrid durante Marco 3.

---

## Pontos que ficam em revisão após shadow (60 dias)

Estes estão formalmente **aprovados em V1**, mas serão **recalibrados empiricamente** após 60 dias:

- B.4 (Target ECE → 0.02).
- B.6 (τ_abst — curva coverage/emission rate real).
- D.2 (Target AUC-PR do baseline).
- D.4 (staleness_tolerance_s real do operador).
- E.1 (T12 thresholds — validar 5/10/15 em share real).
- ADR-014 (reintroduzir families C/D/H se ablation mostrar ΔAUC-PR > +0.05).

Não são pendências pré-deploy; são gates pós-deploy.

---

## Próximo passo concreto

**Marco 1 inicia**. Backlog (2–3 sem-pessoa):

1. Feature store redb + QuestDB + HotQueryCache + PIT API + `dylint` CI check (ADR-012).
2. Baseline A3 ECDF + bootstrap emitindo TradeSetup (ADR-001).
3. Leakage audit CI crate `ml_eval` (5 testes bloqueantes) (ADR-006).
4. Dashboard básico Prometheus + Grafana (ADR-013 §Dashboard).
5. Serving A2 thread dedicada com canal crossbeam + ArcSwap + circuit breaker (ADR-010).
6. Output tipado enum `Recommendation` (ADR-005).
7. Shadow mode infrastructure (emissão sem execução).
8. Trigger de amostragem (book_age < 200ms + min_vol24 ≥ $50k + NOT halt) (ADR-009 + ADR-014).

Gates Marco 1 (pré-Marco 2):
- `feature_store_write_throughput ≥ 50k/s` sustentado 1h.
- `pit_api_test_coverage = 100%`.
- `leakage_audit_ci = PASS`.
- `zero_alloc_sustained_1h = PASS` (MIRI + GlobalAlloc + heaptrack).
- `baseline_a3_precision@10` registrado como barra absoluta.

---

## Referências

- [OPEN_DECISIONS.md](OPEN_DECISIONS.md) — documento original com 30 pontos.
- [ADR-001](../01_decisions/ADR-001-arquitetura-composta-a2-shadow-a3.md) a [ADR-014](../01_decisions/ADR-014-mvp-spreads-only-15-features.md).
- [STACK.md](STACK.md).
- [ROADMAP.md](ROADMAP.md).
