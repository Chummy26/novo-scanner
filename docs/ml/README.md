---
name: Stack ML — Recomendador Calibrado de TradeSetup (Longtail Crypto)
description: Índice navegável da documentação ML do projeto scanner cross-exchange arbitrage
type: index
status: approved
author: programa-phd-sub-agentes + operador
date: 2026-04-20
version: 2.0.0
---

# Stack ML — Recomendador Calibrado de TradeSetup

Documentação de pesquisa PhD e decisões arquiteturais para o recomendador ML do scanner cross-exchange arbitrage (longtail crypto).

Leitura pré-requisito:
- `../../.claude/skills/spread-arbitrage-strategy/SKILL.md` — aula canônica da estratégia.
- `../../CLAUDE.md` — norte do projeto (três camadas: estratégia / scanner / modelo ML).

---

## Estrutura

```
docs/ml/
├── 00_research/          Relatórios dos sub-agentes PhD (Waves 1, 2, 3 + Wave Q)
├── 01_decisions/         ADRs — Architecture Decision Records (16 aprovadas)
├── 02_traps/             Análises das 12 armadilhas críticas do output
├── 03_models/            Model cards (preenchido pós-MVP)
├── 04_experiments/       Experiment tracking (runs, configs) — pós-Marco 2
├── 05_benchmarks/        Resultados de benchmarks — pós-Marco 1
├── 06_labels_and_data/   Schema de labels, data lineage, purged K-fold (3 specs)
├── 07_calibration_reports/   Reliability diagrams, ECE, coverage — pós-deploy
├── 08_drift_reports/     Eventos de drift detectados, decisões de retreino — pós-deploy
├── 09_shadow_mode/       Resultados de shadow mode — pós-Marco 3 Fase 1
├── 10_operations/        Runbook + kill switch (2 specs; mais pós-Marco 1)
└── 11_final_stack/       STACK + ROADMAP + OPEN_DECISIONS + DECISIONS_APPROVED
```

Pastas vazias (03, 04, 05, 07, 08, 09) são placeholders para conteúdo empírico que só existe pós-deploy; mantidas para evitar criar depois e preservar estrutura.

## Status de pesquisa (2026-04-19) — Programa COMPLETO

### Wave 1 — Fundacional ✅

| Domínio | Relatório | Responsabilidade primária |
|---|---|---|
| D1 — Formulação algorítmica TradeSetup | [D01_formulation.md](00_research/D01_formulation.md) | T1, T2, T4, T5, T10 |
| D2 — Microestrutura longtail | [D02_microstructure.md](00_research/D02_microstructure.md) | T11 |
| D7 — Rust ML ecosystem 2026 | [D07_rust_ecosystem.md](00_research/D07_rust_ecosystem.md) | — |

### Wave 2 — Core ML ✅

| Domínio | Relatório | Responsabilidade |
|---|---|---|
| D3 — Feature engineering | [D03_features.md](00_research/D03_features.md) | T6, T7 |
| D4 — Labeling + backtesting | [D04_labeling.md](00_research/D04_labeling.md) | T9 |
| D5 — Calibração + incerteza | [D05_calibration.md](00_research/D05_calibration.md) | T2, T4, T5, T8 sec. |

### Wave 3 — Produção ✅

| Domínio | Relatório | Responsabilidade |
|---|---|---|
| D6 — Online learning + drift | [D06_online_drift.md](00_research/D06_online_drift.md) | T8 prim., T12 sec. |
| D8 — Serving architecture | [D08_serving.md](00_research/D08_serving.md) | — |
| D9 — Feature store | [D09_feature_store.md](00_research/D09_feature_store.md) | — |
| D10 — Validação shadow + rollout | [D10_validation.md](00_research/D10_validation.md) | T3 prim., T12 prim. |

### Wave Q — Investigação do contrato de output ✅

Acionada após operador levantar ponto crítico sobre output pontual vs distributional. 3 agentes independentes validaram e corrigiram ADR-015.

| Agente | Ângulo | Relatório |
|---|---|---|
| Q1 — Microestrutura & Execução | Como arb profissional lida com captura de valores variáveis | [D11_microstructure_output.md](00_research/D11_microstructure_output.md) |
| Q2 — Distributional ML | Rigor estatístico da representação conjunta | [D12_distributional_ml_output.md](00_research/D12_distributional_ml_output.md) |
| Q3 — UX & Decisão humana | Como operador consome sinais probabilísticos | [D13_ux_decision_support.md](00_research/D13_ux_decision_support.md) |

Consolidado em ADR-016 (refina ADR-015 com correção crítica Q2-M2 + emendas Q1 + layout Q3).

### Wave R — Auditoria Crítica ✅ (2026-04-20)

Revisão crítica independente identificou **10 pontos (C-01..C-10)** estruturalmente não-mitigados. 7 novos ADRs resolvem os pontos bloqueantes + altos:

| ADR | Título | Endereça |
|---|---|---|
| ADR-017 | Execution Window Guard (`NoWindowForHuman`) | C-04 (condicional) |
| ADR-018 | Marco 0 coleta empírica antes de modelo | C-01, C-09, C-10 |
| ADR-019 | Gating econômico direto (`simulated_pnl_bruto`) | C-05, C-08 |
| ADR-020 | Gate de volume útil substituindo abstenção binária | C-03 |
| ADR-021 | Protocolo revisão pós-empírica + gatilhos automáticos | C-01, C-10 |
| ADR-022 | Priorização Marco 1 em core/estendido/nice-to-have | C-02 |
| ADR-023 | LOVO (leave-one-venue-out) obrigatório | C-07 |
| ADR-024 | Protocolo construção confiança operacional | C-06 |

### Wave S — Auditoria sobre os ADRs 018/019/020/023 (2026-04-20 tarde)

Auditoria de segunda ordem detectou lacuna oculta: gates E1/E2/E4/E6/E8/E10/E11 e ADRs 019/020/023 dependem de distribuição pré-filtro, mas `AcceptedSample` é pós-trigger. Viés estrutural de seleção nas medições go/no-go. Endereçado por:

| ADR | Título | Endereça |
|---|---|---|
| ADR-025 | RawSample stream contínuo (decimação 1-in-10) | lacuna nos gates E1/E2/E4/E6/E8/E10/E11; pré-requisito ADR-019/020/023 |

### Consolidação ✅

- **24 ADRs** em [01_decisions/](01_decisions/) — 23 `approved`, 1 `proposed` (ADR-017, pendente de validação empírica em Marco 0). ADR-025 (RawSample stream) aprovado em 2026-04-20 tarde.
  - Supersededs: ADR-007 parcialmente por ADR-014; ADR-015 parcialmente por ADR-016.
- **12 trap analyses** em [02_traps/](02_traps/) — todas `addressed`.
- **3 labels/data specs** em [06_labels_and_data/](06_labels_and_data/) — label_schema, purged_cv_protocol, data_lineage.
- **2 operations specs** em [10_operations/](10_operations/) — runbook, kill_switch.
- **4 final stack docs** em [11_final_stack/](11_final_stack/) — STACK v0.4 (10 gates pós-auditoria), ROADMAP v2.0 (Marco 0/1/2 renumerados), OPEN_DECISIONS v0.3 (itens resolvidos marcados), DECISIONS_APPROVED.

## Como Navegar

1. **Visão executiva**: [11_final_stack/STACK.md](11_final_stack/STACK.md).
2. **Contrato de output vigente**: [01_decisions/ADR-016-output-contract-refined.md](01_decisions/ADR-016-output-contract-refined.md).
3. **Decisões aprovadas (contrato MVP)**: [11_final_stack/DECISIONS_APPROVED.md](11_final_stack/DECISIONS_APPROVED.md).
4. **Roadmap de implementação**: [11_final_stack/ROADMAP.md](11_final_stack/ROADMAP.md).
5. **Pendências conhecidas (< 80% conf)**: [11_final_stack/OPEN_DECISIONS.md](11_final_stack/OPEN_DECISIONS.md).
6. **Decisões arquiteturais por domínio**: [01_decisions/](01_decisions/) — cada ADR responde "por que X e não Y?".
7. **Armadilhas tratadas**: [02_traps/](02_traps/) — 12 armadilhas com diagnóstico + tratamento + residual risk.
8. **Pesquisa profunda por domínio**: [00_research/](00_research/).
9. **Operações (deploy/kill)**: [10_operations/](10_operations/).

## Convenções

- Todo documento tem frontmatter YAML (`status`, `author`, `date`, `version`).
- ADRs em template **Contexto / Decisão / Alternativas consideradas / Consequências / Status**.
- ADRs supersededs mantêm histórico em `01_decisions/` com `status: superseded-partial` e nota no topo apontando para o substituto.
- Trap files: **Descrição / Manifestação / Tratamento / Residual risk / Owner do tratamento**.
- Toda afirmação material: URL + autor + ano + venue + valor quantitativo.
- Português Brasil em prosa; identificadores e trechos de código em inglês.

## Princípios Não-Negociáveis

1. **Precedência Rust absoluta** — Python só com burden-of-proof (não existe em Rust com qualidade comparável OU >2× vantagem numérica OU ecossistema imaturo).
2. **Scanner é detector, não calculadora de PnL** — spreads brutos; fees/funding/slippage tratados por operador ou pós-processamento separado.
3. **Operador é discricionário** — o ML é filtro/recomendador, não autômato.
4. **Precision-first** — falso positivo catastrófico; recall baixo aceitável.
5. **Abstenção obrigatória** — modelo pode "não emitir" quando não tem certeza (4 razões tipadas — ADR-005).
6. **Calibração auditada** — ECE < 0.02 target; reliability diagram monitorado.
7. **Zero alocações no hot path após warmup** — constraint invariante do scanner.
8. **Output como thresholds + distribuição** (não pontos exatos) — ADR-016.
9. **P(realize) via CDF de G unificado** (não decomposição multiplicativa) — ADR-016 correção crítica.
