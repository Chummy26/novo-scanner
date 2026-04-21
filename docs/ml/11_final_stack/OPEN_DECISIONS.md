---
name: OPEN_DECISIONS — Pendências de Decisão do Usuário
description: Consolidação de ~30 pontos onde evidência é não-dominante ou decisão exige input do operador; agrupados por tema + recomendação do agente + confidence level
type: open-decisions
status: draft
author: programa-phd-sub-agentes
date: 2026-04-19
version: 0.2.0
---

# OPEN_DECISIONS — Pendências de Decisão do Usuário

Cada item abaixo é um ponto onde a evidência acumulada pelos agentes PhD **não é dominante** ou onde a escolha depende de **preferência operacional** do usuário. Recomendações são defaults razoáveis; usuário pode sobrescrever.

Organizado por **tema** para facilitar decisão em batches.

---

## Tema A — MVP vs V2 (approach gradualidade)

### A.1 — MVP com A3 ECDF (1–2 sem) vs direto A2 composta (Marco 2)
**Recomendação (conf 75%)**: **A3 first**, A2 só se ΔAUC-PR ≥ 5pp.
**Razão**: literatura ML é dominada por top-5 venues; extrapolação para longtail é incerta. A3 é baseline irrefutável e operacionalmente simples.
**Origem**: D1 P1.

### A.2 — Setup único (α=0.5) em V1 vs Pareto 3 pontos
**Recomendação (conf 70%)**: **setup único em MVP**, Pareto em V2 se log de UI mostrar demanda por agressividade variável.
**Razão**: UX simples vence complexity sem evidência; gatilho quantitativo para V2 definido em T10.
**Origem**: D1 P2; T10.

### A.3 — Abstenção binária + modelo separado vs ternária cost-sensitive
**Recomendação (conf 75%)**: **binária + modelo separado**.
**Razão**: mantém calibração de `realization_probability` limpa; conceitualmente mais claro.
**Origem**: D4; ADR-005.

### A.4 — Capacity analysis em MVP ou V2
**Recomendação (conf 80%)**: **V2**.
**Razão**: capacity só importa se operador executa — MVP é shadow-first.
**Origem**: D4 P8.

---

## Tema B — Parâmetros de configuração default

### B.1 — Floor de utilidade U₁ default
**Recomendação (conf 80%)**: **0.8%** (meio do range 0.6–1.0%).
**Razão**: cobre 4 fees (0.22%) + funding cross-snapshot típico (0.1%) + rebalance amortizado (0.05%) + capital idle (0.03%) + margem operacional.
**Configurável via CLI**.
**Origem**: ADR-002; skill §6.1 (revisou proposta original D1 de 0.4%).

### B.2 — Janela default de histórico
**Recomendação (conf 90%)**: **24h** (convencional skill §4), com toggle UI 6h/12h/7d.
**Configurável via CLI**.
**Origem**: D3; correção #4 skill.

### B.3 — λ portfolio penalty cross-route
**Recomendação (conf 70%)**: **0.5** default; agressivo 0.3 / conservador 0.7.
**Configurável**.
**Origem**: D3 P4.

### B.4 — Target ECE
**Recomendação (conf 60%)**: **0.03 em V1**, apertar para 0.02 após 60 dias de dados.
**Razão**: 0.02 é ambicioso em longtail crypto sem histórico empírico.
**Origem**: D5 P5.1.

### B.5 — IC nominal default
**Recomendação (conf 75%)**: **95%**, expor como CLI.
**Razão**: operador discricionário conservador prefere IC largo a apertado.
**Origem**: D5 P5.4.

### B.6 — τ_abst_prob e τ_abst_gross (abstenção LowConfidence)
**Recomendação (conf 60%)**: **τ_abst_prob = 0.20, τ_abst_gross = 0.5%**.
**Razão**: curva coverage/emission rate ainda não empirica — expor como CLI para ajuste.
**Origem**: D5 P5.5.

### B.7 — Número de features MVP (alternativas 15 / 24 / 30)
**Recomendação (conf 75%)**: **24** (nossa proposta D3).
**Razão**: 15 deixa sinal na mesa; 30 overfit; 24 é via-média justificada.
**Origem**: D3 P1.

### B.8 — K em purged K-fold (6 vs 10)
**Recomendação (conf 78%)**: **K=6**.
**Razão**: 10 reduziria amostra por fold abaixo do limite RSF.
**Origem**: D4 P7.

---

## Tema C — Infraestrutura

### C.1 — `tract` (+0 MB) vs `ort` (+50 MB, ~0.5 µs melhor)
**Recomendação (conf 85%)**: **`tract`**.
**Razão**: build enxuto; zero deps; latência melhor insignificante para nosso budget.
**Origem**: D7.

### C.2 — Binary size: aceitar crescimento 6 MB → ~22.5 MB (ou restringir polars a dev-deps → ~9 MB)
**Recomendação (conf 70%)**: **aceitar crescimento completo** (~22.5 MB).
**Razão**: polars é usado em cold path features (ADR-012 cache, D3); separar aumenta complexidade. Binary 22.5 MB ainda é modesto para produção.
**Origem**: D7 P6.

### C.3 — Feature store: QuestDB + redb híbrido vs redb-only vs QuestDB-only
**Recomendação (conf 85%)**: **híbrido** (ADR-012).
**Razão**: redb-only não suporta SQL analítico; QuestDB-only viola latência p99 < 1 ms.
**Origem**: D7/D9.

### C.4 — Granularidade de amostragem de labels (150 ms full vs subsampling)
**Recomendação (conf 70%)**: **150 ms full** para trigger P95+; subsampling para resto.
**Razão**: trigger região é minoria do volume; full granularity preserva sinal.
**Origem**: D4 P1.

### C.5 — Winsorize p99.5% vs p99.0%
**Recomendação (conf 70%)**: **p99.5%**.
**Razão**: preserva mais informação em cauda legítima; spike events (FTX, Luna) flagados separadamente.
**Origem**: D4 P4.

### C.6 — K-fold paralelo (30 min → 8 min, RAM 6×)
**Recomendação (conf 85%)**: **sim**, se RAM disponível.
**Razão**: CI time matters; RAM extra custa pouco em 2026.
**Origem**: D4 P5.

### C.7 — Fee tier: só retail ou VIP configurável por-usuário
**Recomendação (conf 65%)**: **retail como default + VIP configurável**.
**Razão**: maioria de operadores é retail; VIP é extensão fácil.
**Origem**: D4 P3.

### C.8 — Serving architecture: A2 thread dedicada confirmada
**Recomendação (conf 80%)**: **A2** (ADR-010).
**Risco**: 70% confidence em `tract` zero-alloc — MIRI + sustained benchmark obrigatórios antes de go-live.
**Origem**: D8.

---

## Tema D — Coleta empírica (60–90 dias pré-calibração)

### D.1 — Duração de coleta antes de endurecer hiperparâmetros
**Recomendação (conf 85%)**: **60–90 dias × 2600 rotas** → ~1.5 × 10⁸ pontos.
**Razão**: D2 parâmetros (α, H, regimes) exigem amostra ampla; n=431 snapshot é insuficiente.
**Origem**: D1 P5, D2, D4 P6.

### D.2 — Target AUC-PR do baseline A3
**Confidence (60%)**: esperado 0.4–0.6 em regime longtail.
**Razão**: extrapolação da literatura top-5; exige calibração shadow real.
**Origem**: D4 P6.

### D.3 — Subscrição L2 depth em exchanges que oferecem (Binance, Bybit)
**Recomendação (conf 60%)**: **V2 contingente a haircut calibrado**.
**Razão**: se haircut empírico < 40% em setups > 1%, top-of-book + proxies é suficiente; senão, L2 adds signal.
**Origem**: D3 P2.

### D.4 — `staleness_tolerance_s` real do operador (quanto modelo pode ficar stale?)
**Recomendação (conf 50%)**: **4h** (14400s).
**Razão**: se ≥ 4h tolerável, E1 nightly + kill switch suficiente (E5 não obrigatório em V1).
**Origem**: D6 P3.

---

## Tema E — Thresholds e limites

### E.1 — T12 threshold `share_of_daily_volume`
**Recomendação (conf 60%)**: **flag em 5%, desativa em 15%**.
**Razão**: conservadores baseados em D6; validação empírica pós-V2.
**Origem**: ADR-011; T12.

### E.2 — Kill switch global vs per estrato
**Recomendação (conf 75%)**: **global com alert per estrato em V1**.
**Razão**: menos fragmentado; alerts granulares dão visibilidade.
**Origem**: D5 P5.2.

### E.3 — Retreino nightly cadence
**Recomendação (conf 80%)**: **04:00 UTC** (baixo volume).
**Origem**: ADR-011.

### E.4 — Janela de treino (rolling 14 dias)
**Recomendação (conf 70%)**: **14 dias**.
**Razão**: cobre cycle semanal completo; evita acúmulo excessivo de regimes passados.
**Origem**: D6 P5.

### E.5 — ADWIN δ (taxa de falso alarme)
**Recomendação (conf 80%)**: **0.001** (falso alarme < 1/1000).
**Origem**: D6; Bifet & Gavaldà 2007.

### E.6 — Adaptive conformal γ
**Recomendação (conf 80%)**: **0.005 fixo em V1**; per-regime em V2 se evidência justificar.
**Origem**: D5 P5.3; Zaffran et al. 2022.

### E.7 — MAML para T6 cold start
**Recomendação (conf 80%)**: **V3 roadmap**.
**Razão**: complexity high, GPU-bound, contra stack Rust; James-Stein partial pooling suficiente em V1/V2.
**Origem**: D3 P5.

---

## Tema F — Validação e deploy

### F.1 — Shadow mode duração
**Recomendação (conf 70%)**: **30 dias fase 1 + 30 dias fase 2**.
**Razão**: Kohavi 2020 sugere ≥ 4 semanas para A/B estatisticamente significativo em regimes heterogêneos.
**Origem**: D10 (pendente re-despacho para detalhes finais).

### F.2 — Canary % tráfego (ou % rotas)
**Recomendação (conf 65%)**: **top-20 rotas por vol24** em canary (~0.8% do volume).
**Razão**: começar com rotas líquidas reduz risco; power analysis cobre amostra.
**Origem**: D10 (pendente).

### F.3 — Rollout stages
**Recomendação (conf 75%)**: **50/50 por 7 dias → 80/20 por 7 dias → 100%**.
**Origem**: D10 (pendente).

### F.4 — Kill switch false positive rate tolerável
**Recomendação (conf 60%)**: **≤ 1/semana**.
**Razão**: mais frequente erode confiança operador.
**Origem**: D10 (pendente).

---

## Pendências internas do programa PhD

### P.G.1 — D10 re-despacho
**Status**: rate-limited em Wave 3 (2026-04-19 18:47).
**Ação**: re-dispatch após 21h BR (2026-04-19) com briefing equivalente ao original.

### P.G.2 — Model cards e experiment tracking
**Status**: `03_models/` e `04_experiments/` vazios.
**Ação**: preencher durante Marco 1 (um model card por versão deploy; runs de experimento via MLflow Python + YAML Rust).

### P.G.3 — Validação periódica dos ADRs
**Status**: **resolvido em 2026-04-20** via ADR-021 (protocolo formal de revisão pós-empírica com gatilhos quantitativos automáticos).
**Ação**: implementar gatilhos no dashboard durante Marco 0; relatórios mensais obrigatórios nos primeiros 90 dias.

---

## Atualização 2026-04-20 — Auditoria crítica (C-01..C-10)

Revisão crítica identificou 10 pontos C-01 a C-10 (documentados em sessão de auditoria). **5 pontos bloqueantes** + **5 altos/condicionais** foram endereçados via **7 novos ADRs**:

| Crítica | ADR que resolve | Status |
|---|---|---|
| C-01 Stack sem validação empírica | ADR-018 (Marco 0 coleta 4-6 sem) + ADR-021 (revisão pós-empírica) | approved |
| C-02 Marco 2 maximalista sem bailout | ADR-022 (priorização core/estendido/nice) | approved |
| C-03 Abstenção pode colapsar | ADR-020 (gate volume útil multi-condicional) | approved |
| C-04 Janela humana vs emissão sub-segundo | ADR-017 (execution window guard) | proposed — decisão em Marco 0 |
| C-05 U₁ floor protege agregado não distribuição | ADR-019 (gating econômico direto) | approved |
| C-06 Confiança humana não-validada | ADR-024 (protocolo de construção de confiança) | approved |
| C-07 Modelo herda defeitos do scanner | ADR-023 (LOVO leave-one-venue-out) | approved |
| C-08 Gating sem métrica econômica | ADR-019 (gating econômico direto) | approved |
| C-09 Paradoxo temporal Marco 1 vs Marco 2 | ADR-018 (Marco 0 novo absorve Marco 1 original) | approved |
| C-10 Zero código ML implementado | ADR-018 (Marco 0 força iteração empírica) + ADR-021 (revisão) | approved |

### Itens deste documento resolvidos por novos ADRs

| Item | Resolvido por | Observação |
|---|---|---|
| A.4 Capacity analysis em MVP ou V2 | ADR-019 (gating econômico em Marco 0 baseline) | parcialmente resolvido |
| P.G.3 Validação periódica ADRs | ADR-021 | resolvido |
| Tema F F.1–F.4 Shadow/canary/rollout | ADR-013 (já aprovado) + ADR-022 (priorização) | mantém pendências mas estrutura clara |
| D.2 Target AUC-PR baseline A3 | ADR-018 Marco 0 medirá empiricamente | resolvido estruturalmente |

### Novas pendências pós-auditoria

### N.1 — Calibração de `τ_volume_min_agg` (ADR-020)
**Recomendação (conf 50%)**: `5 emissões/hora agregado` default; recalibrar como `0.5 × baseline_A3_useful_emissions_per_hour_30d` após Marco 0.
**Origem**: ADR-020.

### N.2 — Calibração de `T_trigger_max` (ADR-019)
**Recomendação (conf 60%)**: `300 s` default; operador configurável.
**Origem**: ADR-019 §Definição operacional.

### N.3 — `execution_window_min_s` default (ADR-017)
**Recomendação (conf 40%)**: sem default universal; 5s agressivo / 10s padrão / 30s conservador. Operador calibra conforme workflow.
**Origem**: ADR-017.
**Condição**: só relevante se ADR-017 for promovido a approved após Marco 0.

### N.4 — Thresholds de gatilhos ADR-021 (20%, 15%, 10%)
**Recomendação (conf 70%)**: usar valores da tabela ADR-021; recalibrar após 90 dias se FP rate de reabertura > 1/semana.
**Origem**: ADR-021.

### N.5 — Escolha entre TreeSHAP aproximado (Saabas) vs SHAP exato para explicabilidade
**Recomendação (conf 75%)**: **TreeSHAP aproximado Saabas** em tempo real (< 5 µs/emissão); SHAP exato apenas offline para validação.
**Origem**: ADR-024 Componente 1.

### N.6 — Capital hipotético para `simulated_pnl_bruto_aggregated`
**Recomendação (conf 65%)**: **10.000 USDT fixo** por trade para comparabilidade cross-modelo.
**Origem**: ADR-019.

---

## Como consumir este documento

- **Revisão em sessão com operador**: ler por tema; decidir por tema (não por item isolado).
- **Defaults seguros**: recomendações com conf ≥ 75% podem ser aceitas sem revisão profunda.
- **Atenção especial**: itens com conf ≤ 65% requerem input direto do operador ou coleta empírica antes de fixar.
- **Atualização**: após cada decisão, mover item para ADR próprio e marcar como resolvido aqui.
