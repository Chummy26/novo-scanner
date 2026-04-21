---
name: ADR-018 — Inserção de Marco 0 (Coleta Empírica Pura) Antes de Marco 2
description: Resolve C-01 + C-09 + C-10. Adiciona marco de 4-6 semanas operando apenas A3 ECDF + feature store + coleta empírica, antes de qualquer construção de modelo ML complexo. Objetivo: confirmar/refutar projeções D2 com dados reais antes de fixar hiperparâmetros dependentes.
type: adr
status: approved
author: operador + critica-review
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: ROADMAP.md (insere Marco 0 antes do Marco 1 original)
reviewed_by: [operador]
---

# ADR-018 — Inserção de Marco 0 (Coleta Empírica Pura)

## Contexto

Crítica-review identificou três problemas estruturais interconectados:

- **C-01**: todas projeções estruturais do stack (α cauda ∈ [2.8, 3.3]; H Hurst ∈ [0.70, 0.85]; 3 regimes; haircut 20–70%; persistência `D_{x=2%} < 0.5s`) são extrapolações da literatura top-5 venues. Nenhum dado empírico do regime longtail real confirma.
- **C-09**: Marco 2 (6–8 semanas) inicia imediatamente após Marco 1 (2–3 semanas), com ≤ 30 dias de dados de scanner. Múltiplas decisões em Marco 2 dependem de 60–90 dias de coleta (OPEN_DECISIONS §D.1–D.4). Gap temporal garante que parâmetros serão calibrados no escuro e recalibrados 2–3 meses depois.
- **C-10**: ~53k palavras de pesquisa, 17 ADRs, 12 traps documentadas — e zero linhas de código ML implementadas. Feature store inexistente. Baseline A3 não construído.

O padrão anti-pattern é **planning paralysis**: planejamento extensivo substitui iteração empírica. López de Prado 2018 *Advances in Financial Machine Learning* cap. 1: *"The first model is always wrong; the question is how fast you iterate."* Planejamento sem dado real tem viés de escritório substancial (Kahneman, Lovallo & Sibony 2011 *HBR*).

## Decisão

**Inserir Marco 0 como primeiro marco executável** e **absorver Marco 1 original** (infraestrutura + A3 baseline) dentro dele. Renumeração final do ROADMAP:

| Antes | Agora | Escopo resumido |
|---|---|---|
| Marco 1 (original) | — absorvido em Marco 0 | infra + A3 baseline |
| — | **Marco 0 (novo)** | infra + A3 baseline + coleta empírica 4-6 semanas + gates empíricos E1–E11 |
| Marco 2 (original) | **Marco 1** | modelo A2 composta + calibração + shadow |
| Marco 3 (original) | **Marco 2** | drift + validação + rollout |

Toda referência subsequente em ADRs e documentos a "Marco 1/2/3" será lida com a nomenclatura **nova** (Marco 0/1/2). Referências cruzadas nos ADRs 019–024 ainda contêm "Marco 2/Marco 3" como escritas originalmente; uma tabela de equivalência é mantida em `ROADMAP.md §Nomenclatura`.

### Escopo de Marco 0 — 4-6 semanas, 1 pessoa

**Implementação**:
- Feature store conforme ADR-012 (redb hot buffer + QuestDB ingest + PIT API + CI dylint check).
- **Baseline A3 puro**: ECDF empírica condicional + bootstrap, implementação < 300 LoC Rust, latência < 1 µs/rota.
- Serving A2 thread dedicada conforme ADR-010, rodando apenas A3.
- Output tipado enum `Recommendation` conforme ADR-005 (4 razões; ADR-017 `NoWindowForHuman` adicionado se aprovado).
- Shadow mode infrastructure: emissão sem execução; logs persistidos em QuestDB.
- Dashboard Prometheus + Grafana com ≥ 15 séries temporais (abaixo).
- CI leakage audit conforme ADR-006 (5 testes bloqueantes).
- Zero-alloc verification do hot path (MIRI + custom GlobalAlloc counter + heaptrack sustained 1h).

**NÃO incluído em Marco 0**:
- ❌ Nenhum modelo ML (QRF, CatBoost, RSF, HMM, Temperature Scaling, CQR, Adaptive Conformal).
- ❌ Nenhum training pipeline Python.
- ❌ Nenhuma função de utilidade além da trivial (baseline A3 já tem filtros mínimos).
- ❌ Nenhum sistema de drift detection (ADWIN, DDM).

### Coleta empírica (paralela à implementação)

Objetivo: acumular dados que permitam validar ou refutar 11 projeções D2/D4 antes de Marco 2 iniciar.

| ID | Projeção a confirmar | Fonte | Amostra mínima | Método de medição |
|---|---|---|---|---|
| E1 | `α_cauda ∈ [2.8, 3.3]` (Hill) | D2 §5 | ≥ 30 dias × 2600 rotas | Hill estimator rolling 7d |
| E2 | `H_Hurst ∈ [0.70, 0.85]` | D2 §5 | ≥ 30 dias × 2600 rotas | R/S rescaled range; DFA |
| E3 | 3 regimes latentes | D2 §5 | ≥ 45 dias | Clustering não-supervisionado sobre features de regime (variância rolante, Hurst local) |
| E4 | `median(D_{x=2%}) < 0.5s` (T11) | D2 §T11 | ≥ 30 dias × rotas com spread ≥ 2% ao menos uma vez | Medição direta da persistência do spread em níveis altos |
| E5 | Haircut quoted vs realizable 20–70% | D2 §T11 | N/A em shadow puro (requer execução) | **NÃO mensurável em Marco 0**; fica para Marco 2 Fase 2 shadow operador-assisted |
| E6 | Spillover FEVD > 70% em eventos | D2 §5.5 | ≥ 15 eventos observados | Diebold-Yilmaz FEVD |
| E7 | Eventos/mês {2–5 halts, 15–30 listings, 3–8 delistings} | D2 | ≥ 30 dias | Log de eventos a partir de venue status |
| E8 | Correlação `entrySpread × exitSpread ≈ −0.93` | ADR-008 | ≥ 30 dias × rotas com N ≥ 1000 obs | Correlação empírica rolling por rota |
| E9 | Taxa de emissão útil de A3 puro | nova | ≥ 30 dias | `emissions_per_hour_per_route` passando filtros |
| E10 | Distribuição real de `entrySpread` por rota (cauda, moments) | D4 §6 | ≥ 60 dias | Histogramas empíricos rolling |
| E11 | Qualidade do feed por venue (vieses de `book_age`, staleness) | C-07 | ≥ 30 dias | Distribuição de `book_age` per venue; leave-one-venue-out sobre baseline A3 |

### Dashboard Marco 0 — séries temporais obrigatórias

1. `a3_emissions_per_hour_by_route` (mediana, p95)
2. `a3_precision@10_simulated_24h`
3. `abstention_rate_by_reason` (4 razões; 5 se ADR-017 aprovado)
4. `entry_spread_ecdf_rolling_24h` (15 quantis) per venue-pair
5. `exit_spread_ecdf_rolling_24h` idem
6. `rolling_corr_entry_exit_1h` per rota agregada
7. `hill_tail_alpha_rolling_7d` per rota agregada
8. `hurst_exponent_rolling_7d` per rota agregada
9. `regime_cluster_assignment_rolling_24h` (HMM pré-fit só para diagnóstico, não para produção)
10. `book_age_percentile_per_venue_1m` (p50, p99)
11. `stale_symbol_count_per_venue_1m`
12. `D_x_histogram` para x ∈ {0.5%, 1%, 2%, 3%} per rota agregada
13. `feature_store_write_throughput`
14. `feature_store_pit_query_latency_p99`
15. `inference_latency_a3_p99`

### Gates obrigatórios para avançar de Marco 0 → Marco 1

**Operacionais (necessários e suficientes)**:
- `feature_store_write_throughput ≥ 50k/s` sustentado 1h.
- `pit_api_test_coverage = 100%` (todas leituras usam `as_of`).
- `leakage_audit_ci = PASS` (5 testes verdes).
- `zero_alloc_sustained_1h = PASS`.
- `a3_inference_p99 < 1 µs/rota`.
- `dashboard_uptime_24h ≥ 99.9%`.

**Empíricos (confirmar ou refutar projeções)**:
- Coleta de ≥ 30 dias contíguos completados.
- ≥ 9 das 11 projeções E1–E11 **confirmadas ou refutadas com evidência documentada**.
- Relatório explícito em `docs/ml/05_benchmarks/marco_0_empirical_report.md` consolidando os resultados.

**Econômicos (baseline para referência futura)**:
- `simulated_pnl_bruto_aggregated_30d` do A3 (ver ADR-019) registrado como baseline absoluto a ser superado por qualquer modelo ML em Marco 2+.

### Gatilhos de reabertura de ADRs (ver ADR-021)

Se qualquer projeção E1–E11 divergir **mais de 20%** do intervalo projetado, os ADRs dependentes são automaticamente reabertos para revisão antes de Marco 1 iniciar:

| Divergência empírica | ADRs reabertos |
|---|---|
| `α` real < 2.0 | ADR-001 (arquitetura QRF/CatBoost), ADR-004 (calibração), ADR-009 (triple-barrier config) |
| `H` real > 0.90 | ADR-006 (purged K=6 embargo), ADR-011 (drift detection cadence) |
| Regime event > 15% do tempo | ADR-007 (features regime), ADR-014 (MVP features), ADR-011 (retrain triggers) |
| `median(D_{x=2%}) ≥ 10s` | ADR-017 (rejeitado; filtro duro não necessário) |
| `median(D_{x=2%}) < 2s` | ADR-017 **promovido a approved** (filtro duro obrigatório) |
| Correlação `entry × exit` \|ρ\| < 0.80 | ADR-008 (joint via G unificado) — revisar alternativas copula |
| Vieses sistemáticos por venue em leave-one-out | ADR-007 (adicionar features de venue), ADR-023 (protocolo leave-one-venue-out fica obrigatório) |

## Alternativas consideradas

### Alt-1 — Manter cronograma original (Marco 1 → Marco 2 sem Marco 0)

**Rejeitada**: aceita o paradoxo temporal C-09. Garante retrabalho de 30–50% em Marco 2 quando dados reais divergirem das projeções. Viola princípio "iterate fast" de ML financeiro.

### Alt-2 — Coleta empírica em paralelo com Marco 2

**Rejeitada**: construir modelo ML complexo (HMM, CQR, ensembles) sobre fundação projetada pode requerer refatoração substancial se fundação for refutada. Custa mais caro em tempo total.

### Alt-3 — Marco 0 reduzido (2 semanas, só infraestrutura)

**Rejeitada**: não gera dados suficientes para confirmar projeções E1–E11. Mantém paradoxo C-09 parcialmente.

### Alt-4 — Marco 0 estendido (8-12 semanas)

**Rejeitada por ora**: aceita a perda de velocidade sem benefício marginal claro após 4-6 semanas em 9+ das 11 projeções. Se coleta após 6 semanas mostrar que ainda faltam dados críticos, estender pontualmente é menos arriscado que pré-alocar tempo.

## Consequências

**Positivas**:
- Elimina o paradoxo C-09 completamente.
- Reduz viés de escritório nas decisões de Marco 1/Marco 2.
- Gera baseline A3 real (não simulado) contra o qual medir valor marginal do ML.
- Fornece evidência empírica para aprovar/rejeitar ADR-017 e múltiplos outros pontos condicionais.
- Constrói infraestrutura (feature store, serving, dashboard, CI leakage) que é invariante às decisões do modelo.
- Operador pode começar a usar A3 em shadow imediatamente, mesmo antes do modelo ML, acumulando familiaridade operacional.

**Negativas**:
- Atraso nominal de 4-6 semanas no cronograma total. **Compensado** pela redução de retrabalho de 30–50% em Marco 1.
- Requer disciplina para resistir à tentação de adicionar "só um pouquinho de ML" durante Marco 0.

**Risco residual**:
- Se 30 dias de coleta não for suficiente para projeções E1–E11, Marco 0 pode estender-se. Mitigação: critério explícito de "9 das 11 confirmadas/refutadas" como gate; se 30d não bastarem, estender Marco 0 em incrementos de 15 dias até atingir.
- Disciplina organizacional: resistir à pressão de "pular" Marco 0. Mitigação: gates formais no CI/CD que bloqueiam merge de código ML até Marco 0 encerrar.

## Estrutura de esforço

| Semana | Atividade | Output |
|---|---|---|
| 1 | Feature store redb + QuestDB + PIT API + dylint CI | Infra minimamente viável |
| 2 | Serving A2 + A3 ECDF baseline + shadow logging | Pipeline end-to-end |
| 3 | Dashboard Prometheus/Grafana + 15 séries + leakage audit CI + zero-alloc verification | Gates operacionais |
| 4 | Coleta ativa + primeiros relatórios diários E1–E11 | Primeiras 20-30% projeções em convergência |
| 5-6 | Continuação coleta + consolidação + relatório Marco 0 | Relatório final + gates atingidos |

## Dependências

- ADR-010 (Serving A2) — implementação necessária.
- ADR-012 (Feature store) — implementação necessária.
- ADR-005 (Abstenção tipada) — enum `Recommendation` necessário.
- ADR-006 (Purged K-fold CV + leakage audit) — CI audit necessário.
- ADR-019 (gating econômico) — métrica baseline A3 definida por ele.
- ADR-021 (protocolo revisão pós-empírica) — gatilhos de reabertura.

## Referências cruzadas

- [ROADMAP.md](../11_final_stack/ROADMAP.md) — atualizar para inserir Marco 0 antes do Marco 1 original.
- [STACK.md](../11_final_stack/STACK.md) — §Gates de produção será atualizado com Marco 0.
- [OPEN_DECISIONS.md §D.1-D.4](../11_final_stack/OPEN_DECISIONS.md) — itens resolvidos por Marco 0.
- [ADR-017](ADR-017-execution-window-guard-no-window-for-human.md) — promoção depende de Marco 0 E4.

## Status

**Approved** — prioridade máxima, precede Marco 1. Implementação inicia imediatamente.
