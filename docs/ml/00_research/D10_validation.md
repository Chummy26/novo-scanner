---
name: D10 — Validação Shadow Mode + Ablation + Rollout
description: Protocolo de 4 fases para transição observacional→produção com mitigação causal T3, controle de feedback loop T12, kill switch automático, ablation study em canary e runbook operacional completo para scanner cross-exchange Rust precision-first.
type: research
status: draft
author: phd-d10-validation-v2
date: 2026-04-19
version: 0.1.0
depends_on: [D1, D2, D3, D4, D5, D6, D7, D8, D9]
---

# D10 — Validação Shadow Mode + Ablation + Production-Readiness

> Toda afirmação material carrega URL + autor/organização + ano + valor quantitativo.
> **Confiança geral: 74%** — shadow mode em cross-exchange arbitrage discricionário não tem
> literatura peer-reviewed direta; extrapolações são explicitamente sinalizadas.
> Flags `[CONFIANÇA < 80%]` marcam afirmações frágeis.
> **T3 é a armadilha primária**: observacional ≠ causal. Nunca assumir o contrário.

---

## §0 Postura crítica e escopo

D10 encerra a Wave 3 respondendo à pergunta: **como validar que o modelo A2 composto (D1)
treinado em dados observacionais (D4) com calibração rigorosa (D5) e drift detection (D6)
realmente melhora a decisão de um operador humano discricionário — e não apenas parece bom
em backtest offline?**

A distinção é não-trivial. Confundir acurácia observacional com eficácia intervencional
é o erro mais comum em ML financeiro discricionário (Pearl 2009, *Causality*, Cambridge
University Press, cap. 1, §1.3: "predicting the effects of actions requires causal, not
merely associational knowledge"). Toda Wave anterior treinou, calibrou e validou offline.
D10 valida *em produção real* sem assumir que o processo de geração dos dados de teste
é idêntico ao processo de execução do operador.

**Relação com domínios upstream**:
- D1: arquitetura A2 + output dual `gross_profit_quoted` / `gross_profit_realizable` + haircut.
- D2: 3 regimes; `median(D_2%)<0.5s` → <50% dos setups executáveis em latência humana.
- D4: labels triple-barrier; purged K-fold; `was_recommended` flag definida aqui.
- D5: kill switch ECE_4h > 0.05 → fallback A3.
- D6: ADWIN Rust + retreino emergencial < 45 min; T12 thresholds 5%/15%.
- D8: circuit breaker p99_ML > 100 µs → fallback A3; hot-reload 150–300 ms.
- D9: feature store PIT API; RPO 15 min.

---

## §1 Steel-man de 3 protocolos de validação com números

### P1 — Deploy direto com monitoramento intenso (baseline ingênuo)

**Steel-man**: Breck et al. (2017, *NIPS Workshop on ML Systems*, "What's your ML test
score?", https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/
aad9f93b86b7addfea4c419b9100c6cdd374879.pdf) argumentam que em sistemas com monitoramento
suficiente (>28 testes de ML), detecção pós-deploy pode ser mais rápida do que shadow
prolongado — porque dados de produção têm distribuição mais fiel do que shadow.
Deploy direto com kill switch automático (ECE < 0.05, precision@10 monitorado em tempo real)
pode detectar degradação em < 4h e reverter. Custo: zero dias de delay.

**Fraquezas críticas (red-team)**:
- Durante as 4h de detecção, operador pode ter executado N trades no modelo ruim.
- Falso positivo catastrófico (FP): operador abre posição em spread que não se realiza →
  preso em posição. Com precision@10 = 0.50 (sem validação), esperado 50% dos sinais
  emitidos nas primeiras horas serem ruins.
- T3 nunca detectado: modelo pode degradar *por causa* da execução (feedback loop T12),
  e kill switch dispara mas causa desconhecida fica não-resolvida.
- **Veredicto**: inaceitável para sistema precision-first. FP é catastrófico per-spec.

### P2 — Shadow mode puro por 90 dias (protocolo conservador máximo)

**Steel-man**: Kohavi, Tang & Xu (2020, *Trustworthy Online Controlled Experiments*,
Cambridge University Press, cap. 3, §3.2, p. 42–47) demonstram que experimentos com
menos de 4 semanas de exposição frequentemente não capturam efeitos sazonais e de fim
de semana que alteram métricas-chave em até 15–25%. Para longtail crypto com regimes
(D2), 90 dias garantem cobertura de listing/delisting cycles (15–30 eventos/mês) e
pelo menos 3 ciclos de regime event.

**Fraquezas críticas (red-team)**:
- Shadow puro não resolve T3: se operador *não executa* nenhuma recomendação, a amostra
  de validação é puramente observacional → viés de seleção persiste.
- Haircut empírico (T11) não calibrado em shadow: modelo emite `haircut_predicted` mas
  sem execuções reais não há `haircut_realizado` para ajustar a função D1.
- 90 dias = 3 meses sem benefício ao operador → custo de oportunidade não desprezível.
- **Veredicto**: necessário como fase 1, mas insuficiente como protocolo completo.
  Shadow deve alimentar fase 2 operador-assistido para coletar causalidade.

### P3 — Protocolo 4 fases com coleta causal (proposto)

**Steel-man**: Google SRE Book (Beyer, Jones, Petoff & Murphy, 2016, O'Reilly,
"Site Reliability Engineering", cap. 26 — "Data Integrity: What You Read Is What You
Wrote", https://sre.google/sre-book/data-integrity/) define dark launch (shadow) + canary
progressivo como padrão para sistemas de alta confiabilidade. Netflix Engineering
(Izrailevsky & Jain 2011, Netflix Tech Blog, "Fault Tolerance in a High Volume Distributed
System", https://netflixtechblog.com/) combina shadow com chaos injection: o sistema
"vê" tráfego real mas opera em modo observação. A inovação de D10 é adicionar
**coleta causal estruturada** na fase 2 para resolver T3, ausente dos protocolos padrão
de dark launch.

**Fraquezas críticas (red-team)**:
- Fase 2 (operador-assistido) contamina amostra: operador que *vê* recomendações e
  decide pode introduzir viés de conformidade (segue modelo mais do que deveria).
  **Mitigação**: randomizar exibição (metade do tempo sem mostrar confidence, apenas sinal).
- Canary per-rota (fase 3) com usuário único é A/B de n=1 por braço de decisão →
  poder estatístico limitado. **Mitigação**: usar volume de snapshots emitidos (17k/s),
  não número de operadores, como unidade de análise.
- **Veredicto**: protocolo P3 é o recomendado. Custo: 74–104 dias de validação progressiva.

---

## §2 Protocolo de 4 fases — especificação completa

### Fase 1 — Shadow Mode Puro (30–60 dias)

**Objetivo**: calibrar ECE, coverage, precision@k sem intervenção humana. Identificar
regimes (D2) insuficientemente cobertos. Medir `abstention_rate` por reason code.

**Operação**: modelo A2 roda em thread dedicada (D8: `crossbeam::bounded(1)`) emitindo
`TradeSetup` a cada ciclo 150 ms. Output gravado em estrutura de auditoria separada do
operador. Operador NÃO vê recomendações nesta fase (ou vê com etiqueta "experimental:
ignorar").

**Coleta obrigatória**:
```
shadow_record {
    ts_emit:               i64,          // Unix ms
    rota_id:               u32,          // 0..2599
    regime_detected:       u8,           // 0=calm, 1=opportunity, 2=event
    gross_profit_quoted:   f32,          // saída A2
    gross_profit_realizable: f32,        // após haircut_predicted
    haircut_predicted:     f32,
    realization_prob:      f32,          // calibrado D5
    ci_lo_95:              f32,
    ci_hi_95:              f32,
    abstention_reason:     Option<u8>,   // 0=NoOpportunity, 1=InsufficientData,
                                         // 2=LowConfidence, 3=LongTail
    label_triple_barrier:  Option<u8>,   // aplicado post-hoc com D4 pipeline
    a3_baseline_prob:      f32,          // shadow baseline A3 sempre rodando
}
```

**Labels post-hoc**: o pipeline D4 Python aplica triple-barrier retroativamente após
T_max (4h ou 24h) para gerar `label_triple_barrier`. Isso alimenta o cálculo de ECE,
precision@k e reliability diagrams na fase 1.

**Gates para avançar para Fase 2** (todos devem ser satisfeitos):
- `ECE_global_30d < 0.03` (limiar intermediário; target final < 0.02 de D5).
- `precision@10_30d >= 0.60` por perfil operador (conservador/médio/agressivo de D4).
- `DSR > 1.5` (Deflated Sharpe Ratio, Bailey & López de Prado 2014, *JPM* 40(5)).
- `coverage_empirica_95_30d >= 0.90` (tolerância de 5% abaixo do nominal).
- `abstention_rate_30d < 0.85` (modelo não deve recusar mais de 85% dos snapshots).
- `n_label_positivo >= 500 por perfil` (n_min D3 para pooling).

**Duração**: 30 dias mínimo, 60 dias se regime event < 3 episódios observados em 30 dias.
Justificativa: Kohavi et al. (2020, cap. 3, p. 42): "at least two weeks to account for
weekly seasonality; four or more weeks for monthly patterns." Cross-exchange longtail tem
ciclos de listing que são mensais (D2: 15–30 listings/mês), exigindo cobertura ≥ 30 dias.

**Risco fase 1**: shadow não pega viés causal (T3). Operador que não executa ≠ mercado
que não reage. Ver §3 para mitigação estrutural.

---

### Fase 2 — Operador-Assistido com Coleta Causal (30 dias)

**Objetivo primário**: calibrar `haircut(rota, size, tod)` empiricamente (T11); medir
gap causal T3; registrar decisão do operador para análise de propensity.

**Operação**: modelo emite recomendações visíveis. Operador decide executar ou não.
Cada decisão é registrada com flag `was_recommended: bool` (D6 design). O operador
tem um botão na UI "Executar" / "Ignorar" / "Reverteu" / "Stop-loss".

**Coleta obrigatória por trade**:
```
operator_decision {
    ts_decision:           i64,
    rota_id:               u32,
    was_recommended:       bool,
    action:                enum { Executou, Ignorou, Reverteu, StopLoss },
    gross_profit_realized: Option<f32>,  // preenchido após saída
    haircut_real:          Option<f32>,  // S_quoted - S_realized
    tod_bucket:            u8,           // hora UTC em bucket de 4h
    size_tier:             u8,           // pequeno/médio/grande
    features_snapshot:     Vec<f32>,     // features D3 no momento da decisão
}
```

**T3 gap medição** — quantificação do viés causal:
- `P(realize | was_recommended=true, executou)` vs `P(realize | was_recommended=false)`.
- Gap > 0.15 indica viés de seleção causal material.
- Gap > 0.25 `[CONFIANÇA < 80% no modelo]` — exige revisão de propensity scoring §3.

**T11 calibração haircut empírica**:
- Para cada `(rota_id, size_tier, tod_bucket)`, calcular `haircut_empirico` mediano.
- Comparar com `haircut_predicted` de D1.
- Erro absoluto médio > 0.30% → retreino da função haircut obrigatório.
- Estimativa de n necessário: para erro < 10% com 90% confiança, `n ~ 68` observações
  por célula (rota × size × tod) — com ~2600 rotas e operador executando ~5 trades/dia,
  células individuais levarão semanas. Priorizar células de alta frequência primeiro.
  `[CONFIANÇA < 80%]` — n estimado assume distribuição aproximadamente normal do haircut;
  com heavy tail α~2.8 (D2), pode exigir n~200+ por célula para erro estável.

**Gates para avançar para Fase 3**:
- `ECE_4h < 0.04` (abaixo do kill switch de D5; validação mais rigorosa).
- `precision@10_30d >= 0.65` por perfil.
- `gap_causal_T3 < 0.15` ou propensity model ajustado com IPW satisfatório (§3).
- `n_trades_executados >= 50` (mínimo para calibração haircut preliminar).
- Kill switch não disparou em fase 2.

**Duração**: 30 dias. Não encurtar: semanas 1–2 são período de adaptação comportamental
do operador; semanas 3–4 têm comportamento estabilizado.

---

### Fase 3 — Canary por Rota (14 dias)

**Objetivo**: A/B test formal modelo A2 (tratamento) vs baseline A3 (controle) em
subconjunto de rotas. Validar que A2 supera A3 em precision@10 por delta ≥ 0.05.

**Design**:
- Selecionar top-20 rotas por `vol24h` (representam ~15–20% do volume total, mas são
  as mais calibráveis — n_samples alto).
- Rotas pares: 10 servidas por A2 (tratamento), 10 por A3 (controle). Rotacionar a
  cada 7 dias para controlar confounding por rota-específico.
- Operador não sabe qual rota usa qual modelo (blinding parcial).

**Power analysis** (Cohen 1988, *Statistical Power Analysis for the Behavioral Sciences*,
LEA, 2nd ed., §6.2; Kohavi, Longbotham, Sommerfield & Henne 2009, *KDD*, p. 972):

```
Hipóteses: H0: precision@10_A2 = precision@10_A3
           H1: precision@10_A2 - precision@10_A3 >= 0.05

Parâmetros:
  p0 = 0.65 (A3 baseline estimado pós-fase-2)
  p1 = 0.70 (alvo A2)
  alpha = 0.05 (two-sided, Bonferroni-corrigido para 10 pares de rotas: alpha_ajustado = 0.005)
  beta  = 0.20 (poder 80%)
  z_alpha/2 = 2.807 (Bonferroni alpha=0.005)
  z_beta    = 0.842

Fórmula:
  n = 2 * (z_alpha/2 + z_beta)^2 * p_bar * (1-p_bar) / delta^2
  p_bar = (0.65 + 0.70) / 2 = 0.675
  delta = 0.05

  n = 2 * (2.807 + 0.842)^2 * 0.675 * 0.325 / 0.0025
    = 2 * 13.32 * 0.219 / 0.0025
    = 2336 amostras por braço (sem ajuste clustering)
```

**Ajuste para clustering por rota** (ICC estimado entre rotas correlacionadas = 0.15,
baseado em spillover FEVD > 70% de D2 — `[CONFIANÇA < 80%]`):

```
  Design effect = 1 + (n_per_rota - 1) * ICC
  Com n_per_rota = 234 (2336 / 10 rotas) e ICC = 0.15:
  DEFF = 1 + 233 * 0.15 = 35.95
  n_ajustado = 2336 * 35.95 = 83.993 → inviável por rota individual

  Revisão: usar ICC menor (0.02, baseado em rotas em venues diferentes):
  DEFF = 1 + 233 * 0.02 = 5.66
  n_ajustado = 2336 * 5.66 ≈ 13.220 amostras por braço
```

Com 17k snapshots/s × top-20 rotas × 14 dias:
  `17000 * (20/2600) * 14 * 86400 ≈ 1.59 × 10^6 snapshots por braço`.
  n_ajustado = 13.220 é atingido em < 1 hora de operação — poder estatístico não é
  o limitante. O limitante é o número de *trades executados* pelo operador (~5/dia).
  Para trades executados: n=13.220 leva 13.220/5 ≈ 2644 dias → **poder não atingível
  em fase 3**. `[CONFIANÇA < 80%]` nesta estimativa — recomendação: usar snapshots
  emitidos (não trades executados) como unidade primária de análise para precision@k.

**Gates para avançar para Fase 4**:
- `precision@10_A2 - precision@10_A3 >= 0.05` com significância p < 0.05 (snapshots).
- `ECE_4h < 0.04` em todas as 10 rotas tratamento.
- `cluster_emission_rate` normal (sem T7 amplificação).
- `abstention_rate` proporcional (não > 2× baseline).

**Duração**: 14 dias mínimo para capturar efeitos intra-semana.

---

### Fase 4 — Rollout Gradual com Kill Switch (7+7+7 dias)

**Escalonamento progressivo** (referência: Flagger docs, "Progressive Delivery",
https://docs.flagger.app/usage/deployment-strategies; Argo Rollouts, "Canary Deployments",
https://argo-rollouts.readthedocs.io/en/stable/concepts/):

```
Dia 1–7:  A2 em 20% rotas (top-20 × vol24h), A3 em 80%
Dia 8–14: A2 em 50% rotas (top-520), A3 em 50%
Dia 15–21: A2 em 100% rotas
```

Em cada transição: avaliar ECE_24h, precision@10_24h, `share_of_daily_volume` (T12).
Qualquer gate disparado → pausa automática + investigação 24h antes de continuar.

**Rollback** via `ArcSwap<[TradeSetup; 2600]>` (D8): swap atômico de volta ao modelo A3
em < 1 µs de latência de substituição (downtime perceptível apenas no ciclo de 150 ms).

---

## §3 Mitigação T3 — Observacional vs Causal (PRIMÁRIA)

O problema fundamental: o modelo treinou em dados onde `label = outcome_observacional`.
Em produção, o operador *intervém* → o ato de executar uma recomendação altera o mercado
(tamanho, timing, liquidez disponível), criando uma distribuição de outcomes diferente
da distribuição de treinamento. Pearl (2009, cap. 3, §3.2): `P(Y|do(X)) ≠ P(Y|X)`.

### 3.1 Propensity Scoring (Rosenbaum & Rubin 1983, *Biometrika* 70(1), 41–55)

Treinar modelo auxiliar `propensity_model`:
```
Input:  features_D3 no momento da recomendação
Output: P(operador_executa | features)
```

Usar IPW (Inverse Probability Weighting) para ajustar estimativas de `P(realize)`:
```
P_IPW(realize | features) = E[outcome * was_executed / propensity] / E[was_executed / propensity]
```

Implementação: modelo logístico Rust (simples) ou LightGBM Python retreinado semanalmente.
Peso máximo clampado em 10× (para evitar instabilidade com propensity → 0).

### 3.2 Doubly Robust Estimation (Bang & Robins 2005, *Biometrics* 61(4), 962–972)

Combinar propensity model + outcome model. Robusto a mis-specification de qualquer um:
```
DR_estimate = E[outcome_model(features)] +
              E[(outcome - outcome_model(features)) * was_executed / propensity]
```

Vantagem: se propensity model estiver errado mas outcome model correto → estimativa
correta. Se outcome model errado mas propensity correto → estimativa correta.
Custo computacional: marginal (second-stage regression sobre resíduos).

### 3.3 Double/Debiased ML (Chernozhukov et al. 2018, *Econometrics Journal* 21(1), C1–C68)

Para estimativa do efeito causal da recomendação em `P(realize)`:
1. Regredir `outcome` em `controls` (features de microestrutura) → resíduo `ẽ`.
2. Regredir `was_executed` em `controls` → resíduo `d̃`.
3. Regredir `ẽ ~ d̃` → coeficiente = efeito causal local da execução.

Sample-split + cross-fitting para evitar regularization bias. Implementar em Python
semanalmente; resultado alimenta ajuste do haircut_predicted em D1.

### 3.4 Features proxy para peer-effect e size-effect

**`time_alive_before_emit`**: tempo decorrido desde que o spread excedeu o threshold
até o modelo emitir. Spreads que persistem > 500 ms foram rejeitados por outros arbs
— peer-effect signal. Incluir como feature de propensity model.

**`book_depth_at_entry`**: profundidade de livro no momento de emissão. Proxy direto
de size-effect (top-of-book ≠ preço realizado em tamanho material).

**`velocity_spread`**: taxa de mudança do spread em 150 ms window. Spreads que decaem
rapidamente têm `P(realize)` menor em execução real do que em observação (D2: `median
D_2% < 0.5s`).

### 3.5 Counterfactual evaluation em shadow

Na fase 1 (shadow), o modelo emitiu mas o operador NÃO executou. Esses outcomes
não-executados são counterfactuals: o que teria acontecido se o operador tivesse executado?
Coletar `outcome_observado_sem_execucao` (o que o spread fez após emissão, sem intervenção)
como proxy. Gap `outcome_executado (fase 2) - outcome_observado_sem_execucao (fase 1)` =
estimativa do efeito causal da execução. Gap > 0.10 em spread realizado → T3 material.

---

## §4 Mitigação T12 — Feedback Loop (PRIMÁRIA)

Protocolo completo definido em D6; D10 valida empiricamente os thresholds.

### 4.1 Registro `was_recommended`

Todo trade registrado com `was_recommended: bool`. Regra: `True` se e somente se o modelo
A2 estava em modo ativo E emitiu recomendação para a rota em janela de ±30s do trade.
Buffer de 30s é conservador — D4 usa 2·T_max de embargo, mas para o flag binário, 30s
captura a grande maioria das execuções imediatas.

### 4.2 Exclusão de retreino

Pipeline D6 Python exclui explicitamente samples onde `was_recommended=True` do conjunto
de treino, mais buffer `2·T_max` (4h × 2 = 8h, ou 24h × 2 = 48h, dependendo do perfil).
Verificação CI: teste que conta samples `was_recommended=True` no training dataframe →
deve ser 0. Teste bloqueante em pipeline D4.

### 4.3 Auditoria ECE split semanal

Toda semana, calcular ECE separadamente:
- `ECE_recommended`: calibração em trades onde `was_recommended=True`.
- `ECE_not_recommended`: calibração em trades onde `was_recommended=False`.

Se `|ECE_recommended - ECE_not_recommended| > 0.03` → flag para revisão manual.
Divergência sustentada por 2 semanas → pausa retreino + auditoria de dados.

Implementar como job Python agendado (Airflow/cron) + alert Grafana/Alertmanager.

### 4.4 Monitor `share_of_daily_volume` por rota

```
share_dvol(rota, dia) = volume_executado_recomendado(rota, dia) / volume_total(rota, dia)
```

Thresholds (D6):
- `> 5%`: flag amarelo + log.
- `> 10%`: flag laranja + alert on-call.
- `> 15%`: desativar ML para rota específica → fallback A3 per-rota. NÃO kill global.

Dashboard: heatmap 2600 × 24h com color coding por threshold.

### 4.5 Hold-out rotas não-recomendadas

Designar 5% das rotas (130 de 2600) para o operador operar *sem* ver recomendações ML.
Essas rotas servem como grupo de controle limpo para auditoria T12. Rotacionar a cada
30 dias para não penalizar sempre as mesmas rotas.

Comparar `ECE(hold_out_rotas)` vs `ECE(rotas_com_ML)` — diferença persistente sinaliza
contaminação de feedback loop nas rotas com ML.

---

## §5 Dashboard Operacional

Stack: `tikv/rust-prometheus` (já no stack) → Prometheus scraping → Grafana + Alertmanager.

### 5.1 Métricas priorizadas (ordenadas por criticidade)

**Nível 1 — Kill switch metrics** (Alertmanager: PagerDuty/email imediato):
1. `ece_4h_rolling{regime}` — alerta > 0.05.
2. `precision_at10_24h{profile}` — alerta < baseline_A3 − 0.05.
3. `coverage_4h_rolling{stratum}` — alerta < nominal − 0.05 em ≥ 2 estratos.
4. `abstention_rate_1h` — alerta > 0.95.
5. `kill_switch_active` — booleano, alerta em transição.
6. `model_inference_p99_us` — alerta > 100 µs (D8 circuit breaker).

**Nível 2 — Operational health** (Grafana: visualização, sem alert automático):
7. `reliability_diagram_1h_{regime}_{venue_pair}` — plot binned por estrato.
8. `abstention_breakdown{reason_code}` — NoOpportunity/InsufficientData/LowConfidence/LongTail.
9. `setups_emitted_vs_executed_ratio_1h` — gap emissão vs execução (proxy T3).
10. `haircut_empirical_vs_predicted_mae` — erro calibração haircut (T11).
11. `adwin_drift_detector_status{rota}` — número de fires por hora.
12. `share_daily_volume{rota}` — heatmap com threshold colors (T12).

**Nível 3 — Research/ablation** (job diário, não real-time):
13. `cluster_emission_rate_1h` — rotas emitidas simultaneamente (T7).
14. `operator_executed_redundant_rate` — operador executou rotas correlacionadas (T7).
15. `ecg_recommended_vs_not` — auditoria T12 semanal.
16. `propensity_distribution_shift` — drift no propensity model (T3).
17. `kill_switch_history` — frequência, reason, duração de fallback.

### 5.2 Reliability diagram rolante

Implementar via `hdrhistogram 7.5` (D7): bucketing automático de `realization_prob`
em 10 bins [0.0, 0.1), [0.1, 0.2), ..., [0.9, 1.0]. A cada 1h/4h/24h, calcular
fração de realizações empíricas por bin. Expor como métrica Prometheus gauge com
label `bin` e `window`. Grafana: Bar chart com linha de perfeita calibração.

---

## §6 Kill Switch Automático — 6+ Gates

Implementação Rust: thread de monitoramento separada (não hot path) lendo métricas
de `HdrHistogram` compartilhado via `ArcSwap`. Swap para A3 é atômico.

```rust
// kill_switch.rs (esboço)
pub enum KillReason {
    EceThreshold { ece_4h: f32, threshold: f32 },
    PrecisionDrop { precision_24h: f32, baseline: f32 },
    CoverageCollapse { stratum: u8, coverage: f32 },
    AbstentionSpike { rate_1h: f32 },
    LatencyBreach { p99_us: u64 },
    ShareDailyVolume { rota: u32, share: f32 },
}

fn evaluate_kill_switch(metrics: &MetricsSnapshot) -> Option<KillReason> {
    // Gate 1: ECE
    if metrics.ece_4h > 0.05 { return Some(EceThreshold { ... }); }
    // Gate 2: Precision
    if metrics.precision_at10_24h < metrics.baseline_a3_median - 0.05 { ... }
    // Gate 3: Coverage (≥ 2 estratos)
    if metrics.coverage_strata_below_nominal.count() >= 2 { ... }
    // Gate 4: Abstention
    if metrics.abstention_rate_1h > 0.95 { ... }
    // Gate 5: Latência (D8 circuit breaker)
    if metrics.inference_p99_us > 100 { ... }
    // Gate 6: Share vol por rota (não global — desativa per-rota)
    for rota in 0..2600 {
        if metrics.share_daily_volume[rota] > 0.15 { ... }
    }
    None
}
```

**Gate 6 detalhe**: desativação per-rota (não kill global) — modelo continua nas outras
2599 rotas. Flag `ml_disabled_per_rota: AtomicBool` no `ArcSwap<[TradeSetup; 2600]>`.

**Pós-kill**:
1. Fallback A3 ativo com flag `fallback_active` em todas as métricas.
2. Alert imediato (Alertmanager → email + webhook).
3. Deploy bloqueado até retreino manual aprovado por operador.
4. Log `kill_event` com `KillReason`, timestamp, valores que dispararam.

**Falso positivo rate tolerável**: `[CONFIANÇA < 80%]`. Estimativa: com ECE_4h em
distribuição normal (conservador), threshold 0.05 com média real 0.025 → z = (0.05-0.025)/σ.
Com σ~0.01 (estimado), z=2.5 → FP rate ~0.6%/período de 4h → ~1.5 kills/semana em
operação normal. Threshold pode ser relaxado para 0.06 se FP rate inaceitável — mas
exige evidência de 30 dias. Recomendação MVP: aceitar até 1 kill/semana como custo de
segurança.

---

## §7 Ablation Study em Produção

Protocolo: rotacionar 5% das rotas (130 rotas) por 3–7 dias sem cada componente.
A/B test rotas ablated vs rotas completas. Comparar ECE, precision@10, abstention_rate.

### Experimento AB-1 — Sem família E (regime features, D3)

Remover features `regime_calm`, `regime_opportunity`, `regime_event` e derivadas.
**Hipótese**: ECE degrada em regime event (onde spillover > 70% — D2) mas pouco em calm.
**Critério**: ECE_event ↑ > 0.02 confirma que família E é necessária.
**Duração**: 7 dias para garantir ≥ 1 episódio de evento (D2: 2–5 halts/mês → 7 dias
dá ~50% de chance de capturar um halt).

### Experimento AB-2 — Sem família G (cross-route penalty, D3 λ=0.5)

Remover penalidade de correlação cross-route.
**Hipótese**: `cluster_emission_rate` aumenta significativamente; operador vê 3–5 rotas
correlacionadas emitidas simultaneamente.
**Critério**: `redundant_emission_rate` ↑ > 20% confirma que λ=0.5 é necessário.
**Mitigação ao ablation**: alert se operador executar > 2 rotas correlacionadas → pausa
automática do experimento (risco real de 3× exposure).

### Experimento AB-3 — Sem CQR (apenas quantile regression bruta, D5)

Remover Conformalized Quantile Regression; manter apenas o modelo de quantis do CatBoost.
**Hipótese**: coverage empírica cai abaixo do nominal em regime event (distribuição
shift rápido não captado por CQR estática — D5 §0 warning explícito).
**Critério**: coverage_4h < 0.90 em evento confirma necessidade de CQR.

### Experimento AB-4 — Sem adaptive conformal (D5 γ=0.005)

Manter CQR base mas remover atualização adaptativa γ=0.005.
**Hipótese**: coverage colapsa em shift contínuo lento (exatamente o caso que D5 afirma
que adaptive conformal resolve, mas ADWIN não detecta).
**Critério**: |coverage_empirica − nominal| > 0.05 sustentado por 12h confirma.

### Experimento AB-5 — Sem meta-labeling (apenas modelo primário, D4)

Usar somente saída raw do modelo primário A2 sem segundo estágio de meta-labeling.
**Hipótese**: precision@k cai porque meta-labeling filtra FP do modelo primário.
**Critério**: precision@10 ↓ > 0.05 confirma contribuição do meta-labeling.
**Safety**: ativar apenas em regime calm (D2) para não exposer operador a FP em evento.

### Experimento AB-6 — Sem ADWIN (D6), apenas retreino nightly

Desativar ADWIN detector; manter apenas E1 nightly.
**Hipótese**: recovery time pós-halt passa de < 2h (D6: E5 hybrid) para 13–37h (D6: E1).
**Critério**: ECE_4h pós-halt event > 0.05 antes do próximo retreino confirma.
**Observação**: este é o mais arriscado — kill switch deve estar ativo para cortar fast.

---

## §8 Red-team: Shadow-OK, Produção-Falha

### Cenário R1 — Viés de seleção pós-shadow (T3 persistente)

**Setup**: shadow fase 1 mostra ECE = 0.022, precision@10 = 0.68. Fase 2 começa.
**Falha**: operador executa somente as recomendações de **alta confiança** (top 30% por
`realization_prob`). Os outcomes observados são melhores do que a distribuição completa.
ECE parece < 0.03 em fase 2. Rollout ocorre.
**Produção**: modelo emite toda a distribuição de sinais (não só top 30%). Operador
passa a confiar mais e executa mais amplamente. Precision@10 real = 0.55 (abaixo do
0.60 de gate fase 1 com operador seletivo).
**Detecção**: `precision@10_24h` cai para 0.55 em 3 dias → kill switch gate 2 dispara.
**Mitigação D10**: na fase 2, registrar `realization_prob` do sinal no momento da decisão
e calibrar precision por quintil de probabilidade. Não apenas precision@10 agregado.

### Cenário R2 — Cold start em regime event (D2)

**Setup**: modelo treinou em 90 dias de dados com 4 halts registrados. Deploy em produção.
**Falha**: no dia 3 pós-deploy, exchange-wide halt não visto em treinamento (ativo novo,
padrão diferente). ADWIN não dispara (drift lento). ECE_4h = 0.07 → kill switch dispara.
**Recovery**: retreino emergencial D6 < 45 min. Mas 45 min em evento = operador viu
muitos sinais ruins antes do kill.
**Mitigação D10**: cold start protocol — ao detectar halt (via exchange status feed),
ativar A3 automaticamente *sem esperar* ECE_4h. Implementar `exchange_status_monitor`
em Rust que sinaliza halt → `ml_disabled_per_rota` para todas as rotas do exchange.

### Cenário R3 — Adversarial market maker (T7 amplificado)

**Setup**: modelo emite spread BTC-USDT cross-exchange. Market maker detecta que toda
vez que o spread excede 2%, há um operador (humano) que executa nos próximos 30s.
**Falha**: market maker passa a inflar artificialmente o spread para 2.1% e revert antes
do operador executar → haircut real é 80% (spread desaparece na execução).
**Detecção**: `haircut_empirico` sobe de 0.25 para 0.75 em 5 dias para uma rota específica.
`MAE(haircut_pred vs haircut_real)` > 0.30% → alert T11.
**Mitigação**: banir rota da recomendação por 14 dias; retreinar haircut model. Sinalizar
rota como `adversarial_suspect` no dashboard. Verificação manual.

### Cenário R4 — Feedback loop silencioso (T12 < threshold)

**Setup**: operador executa 4% do volume diário por rota (abaixo do flag de 5%). T12
não dispara. Mas em 60 dias, o modelo aprendeu que "oportunidades que o operador executa"
são as "boas" — viés confirmação gradual.
**Falha**: precision@10 parece subir para 0.75 (inflação por feedback). ECE sobe
gradualmente para 0.04 (abaixo do kill switch 0.05). Nenhum gate dispara.
**Detecção**: auditoria ECE split semanal §4.3 detecta
`ECE_recommended - ECE_not_recommended = 0.04` após 6 semanas. Flag manual.
**Mitigação**: hold-out rotas §4.5 (5% sem recomendações) serve como ground truth não
contaminado. Se hold-out ECE estável e rotas-com-ML ECE subindo → T12 confirmado.

---

## §9 Pontos de Decisão para o Usuário (confiança < 80%)

**PD-1** `[CONFIANÇA 68%]` — Duração da fase 1: 30 vs 60 dias.
D2 recomenda 60–90 para calibrar parâmetros de regime. Kohavi (2020) recomenda ≥ 4 semanas.
**Decisão necessária**: tolerar 30 dias se ≥ 3 episódios de evento observados; caso
contrário, estender para 60 dias. O operador deve definir esse threshold.

**PD-2** `[CONFIANÇA 62%]` — Threshold gap causal T3 material.
Gap `P(realize|exec) − P(realize|not_exec) > 0.15` foi proposto como threshold de
preocupação, mas não há literatura direta para cross-exchange arbitrage discricionário.
**Decisão necessária**: operador deve validar se gap < 0.15 é aceitável para o tamanho
de operação planejado. Gap de 0.15 = 15% de viés de seleção em outcomes.

**PD-3** `[CONFIANÇA 70%]` — ECE target final: 0.02 (D5) vs 0.03 (D10 gate fase 1).
Target de 0.02 é ambicioso para longtail com heavy tail. Pode ser que 0.03 seja o
teto realístico em regime event.
**Decisão necessária**: se após 60 dias de shadow `ECE_event_strat > 0.025` mas
`ECE_global < 0.020`, o sistema está calibrado globalmente mas não condicionalmente.
Aceitar ou exigir recalibração condicional antes de avançar para fase 2?

**PD-4** `[CONFIANÇA 65%]` — Kill switch false positive rate tolerável.
Estimativa de 1.5 kills/semana pode ser excessiva (ou insuficiente). O operador
precisa decidir o custo-benefício: cada kill = ~2h sem recomendações ML.
**Decisão necessária**: testar threshold em shadow antes de produção; ajustar ECE threshold
de 0.05 para 0.06 se FP rate > 1/semana for inaceitável.

**PD-5** `[CONFIANÇA 60%]` — Rollout pace: 20/50/100 vs mais gradual 10/25/50/100.
O rollout proposto (20%→50%→100%) é mais agressivo do que alguns frameworks recomendam.
Flagger docs sugerem 10%→25%→50%→100% com janelas de 24h cada.
**Decisão necessária**: o operador decide quantos dias de exposição parcial aceita antes
de full rollout. Com usuário único, o risco de 50% de rotas degradadas é real.

**PD-6** `[CONFIANÇA 72%]` — Propensity model: logístico vs LightGBM.
Modelo logístico é interpretável e robusto a overfitting com n pequeno. LightGBM captura
não-linearidades mas exige n > 500 por grupo de features para não overfitar.
**Decisão necessária**: usar logístico em MVP (fase 2 com n < 500 trades) e migrar
para LightGBM em fase 3+ se n for suficiente. Validar com hold-out.

---

## §10 Runbook Operacional — Esboço

### 10.1 Deploy do modelo A2 (fase por fase)

```
PRÉ-DEPLOY:
  1. CI verde: ECE_offline < 0.03, precision@10_offline >= 0.60, zero T9 leakage.
  2. A3 baseline carregado e funcionando (fallback pronto).
  3. Snapshot feature store (D9 RPO 15 min).
  4. Kill switch testado manualmente (ativar/desativar A3 swap).

DEPLOY FASE 1 (shadow):
  1. `cargo run --release -- --mode shadow` (ou flag config).
  2. Verificar `shadow_active = true` em métricas Prometheus.
  3. Monitorar ECE_4h por 48h antes de confirmar fase estável.

DEPLOY FASE 2 (operador-assistido):
  1. Ativar log de decisões: `operator_decision_log = true`.
  2. Verificar `was_recommended` sendo gravado.
  3. Confirmar propensity model carregado (ou inicializar com modelo logístico simples).
  4. Alert manual: verificar ECE_split após 1 semana.
```

### 10.2 Kill switch — procedimento de ativação e recovery

```
ATIVAÇÃO AUTOMÁTICA:
  - Gate dispara → ArcSwap para A3 → flag fallback_active.
  - Alertmanager dispara webhook → operador notificado.
  - Log kill_event com reason + valores.

INVESTIGAÇÃO (SLA: 2h):
  1. Identificar KillReason no log.
  2. Se EceThreshold: verificar drift detector (ADWIN). Retreino emergencial?
  3. Se PrecisionDrop: verificar se regime event ocorreu. Shadow comparison.
  4. Se LatencyBreach: verificar carga de CPU. feature_store lento? ONNX runtime spike?

RECOVERY:
  1. Retreino D6 emergencial < 45 min (se drift).
  2. Validação offline: ECE_offline < 0.03.
  3. Aprovação manual do operador para re-ativar.
  4. Hot-reload (D8 notify 6.1): 150–300 ms downtime.
  5. Monitorar ECE_4h por 4h pós-recovery antes de confirmar estabilidade.
```

### 10.3 On-call procedures

```
ON-CALL PRIMÁRIO (operador):
  - Kill switch ativo → investigar KillReason.
  - ECE_4h > 0.04 por 2 ciclos consecutivos → alert preventivo.
  - share_dvol > 10% para qualquer rota → revisão manual.

ON-CALL SECUNDÁRIO (engenheiro):
  - Retreino emergencial falhou → diagnose Python pipeline.
  - feature_store unreachable → ativar recovery D9 (RPO 15 min).
  - ONNX runtime crash → fallback A3 + restart processo.

POST-INCIDENT REVIEW (dentro de 24h):
  - Timeline do incidente.
  - KillReason confirmado ou refutado.
  - Root cause: T3 / T12 / drift / bug?
  - Ação corretiva (threshold ajuste, retreino, feature engineering).
  - Atualização deste runbook.
```

---

## §11 Custo e Esforço Estimado

| Componente | Esforço (semanas-pessoa) | Dependência |
|---|---|---|
| Shadow mode infra + coleta | 1.5 | D8 serving thread |
| Propensity model + IPW | 2.0 | D3 features + dados fase 2 |
| Doubly robust + DML | 1.5 | propensity model pronto |
| Dashboard Grafana (Nível 1+2) | 1.5 | prometheus já na stack |
| Kill switch Rust implementation | 1.0 | D8 ArcSwap |
| Ablation rotação infra | 0.5 | canary routing |
| Runbook + auditoria T12 semanal | 0.5 | pipeline D6 |
| **Total estimado** | **8.5 semanas-pessoa** | |

Duração total do protocolo: 74–104 dias de validação + 8.5 semanas-pessoa de engenharia.
Custo de oportunidade (delay de benefício ao operador): 74–104 dias.
Custo de não-validar (deploy direto): risco de FP catastrófico com operador preso em
posição — catastrófico per-spec do sistema (§1).

---

## §12 Síntese e Recomendações Finais

1. **T3 é não-negociável**: implementar propensity scoring (P3.1) desde o início da
   fase 2. Doubly robust e DML são refinamentos para fase 3+.

2. **Shadow < 30 dias em longtail é inaceitável**: D2 confirma que regimes precisam
   de cobertura completa (listing cycles são mensais). Gate de 3 episódios de evento
   mínimo é necessário.

3. **Kill switch deve ser testado antes de produção**: ativar manualmente em staging,
   verificar que ArcSwap para A3 funciona e que alert chega ao operador.

4. **Hold-out rotas (5%) é a única forma de detectar T12 < 5% share_dvol**:
   sem grupo de controle limpo, feedback loop gradual é indetectável.

5. **Propensity model deve usar features de microestrutura** (book_depth, velocity_spread,
   time_alive) — não apenas features D3 de performance do spread. O viés causal vem
   de *quando* o operador decide, não de *qual* spread está disponível.

6. **Rollout 20→50→100% é o mínimo gradual aceitável**. Para precision-first, considerar
   10→25→50→75→100% com janelas de 7 dias cada (35 dias total de rollout gradual).

---

## Referências

Bang, H. & Robins, J.M. (2005). Doubly robust estimation in missing data and causal
inference models. *Biometrics* 61(4), 962–972.

Bailey, D.H. & López de Prado, M. (2014). The deflated Sharpe ratio: correcting for
selection bias, backtest overfitting, and non-normality. *Journal of Portfolio Management*
40(5), 94–107. https://doi.org/10.3905/jpm.2014.40.5.094

Beyer, B., Jones, C., Petoff, J. & Murphy, N.R. (2016). *Site Reliability Engineering*.
O'Reilly Media. https://sre.google/sre-book/

Breck, E. et al. (2017). The ML Test Score: A Rubric for ML Production Readiness and
Technical Debt Reduction. *NIPS Workshop on ML Systems*.
https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/
aad9f93b86b7addfea4c419b9100c6cdd374879.pdf

Chernozhukov, V. et al. (2018). Double/debiased machine learning for treatment and
structural parameters. *The Econometrics Journal* 21(1), C1–C68.
https://doi.org/10.1111/ectj.12097

Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences*, 2nd ed.
Lawrence Erlbaum Associates.

Flagger (2024). Progressive Delivery Strategies. https://docs.flagger.app/

Hernán, M.A. & Robins, J.M. (2020). *Causal Inference: What If*. Chapman & Hall/CRC.
https://www.hsph.harvard.edu/miguel-hernan/causal-inference-book/

Kohavi, R., Longbotham, R., Sommerfield, D. & Henne, R.M. (2009). Controlled experiments
on the web: survey and practical guide. *KDD*, 972. https://doi.org/10.1007/s10618-008-0114-1

Kohavi, R., Tang, D. & Xu, Y. (2020). *Trustworthy Online Controlled Experiments*.
Cambridge University Press.

López de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley.
ISBN 978-1-119-48208-6.

Pearl, J. (2009). *Causality: Models, Reasoning, and Inference*, 2nd ed.
Cambridge University Press.

Rosenbaum, P.R. & Rubin, D.B. (1983). The central role of the propensity score in
observational studies for causal effects. *Biometrika* 70(1), 41–55.
