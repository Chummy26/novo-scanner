---
name: A3 Auditoria Dataset — Calibration Coverage vs ADR-004/ADR-005/ADR-013
description: Auditoria PhD senior em statistical ML calibration e conformal prediction; verifica se o dataset atual (pós-Fase 0) permite treinar e validar calibração conforme os critérios rigorosos de CLAUDE.md e o pipeline ADR-004 (5 camadas)
type: audit
status: draft
author: phd-a3-calibration-coverage
date: 2026-04-20
version: 0.1.0
reviewed_by: [phd-q1-pipeline, phd-q2-statistical, phd-q3-leakage]
depends_on: [ADR-004, ADR-005, ADR-013, dataset_q1_pipeline_audit, dataset_q2_statistical_audit, dataset_q3_leakage_audit, FASE0_PROGRESS]
---

# A3 Auditoria Dataset — Calibration Coverage vs ADR-004/ADR-005/ADR-013

## Postura crítica declarada

Esta auditoria presume que calibração falha silenciosamente até prova contraria numerica. Cada afirmacao sobre suficiencia de amostra exige n_min documentado. "Temperature scaling basta" e safe-bet proibido sem evidencia empirica de que a distribuicao e aproximadamente sigmoid-calibrated. Rust tem precedencia: CQR custom ~200 LoC confirmado (D7). Tres metodos de calibracao recebem steel-man independente antes de qualquer rejeicao. Confianca < 80% recebe flag explicito.

---

## §5.1 Cobertura ECE/Brier/reliability por estrato de regime

### Steel-man dos 3 metodos de calibracao estratificada

**Metodo A — Temperature Scaling por regime (ADR-004 Camada 1+2)**
Guo et al. (2017, *ICML*) demonstram que temperatura unica `T > 0` reduz ECE de 0.04–0.10 para 0.015–0.025 em classificadores de alta capacidade. Ponto forte: um unico parametro por regime, overfitting minimo para n_calib < 500. Ponto fraco: assume que miscalibracao e isotropicamente escalonavel — inadequado quando a funcao de confianca do modelo e assimetrica (prevalente em regimes com heavy tails, α~3). Adequado como camada global.

**Metodo B — Isotonic PAV por regime (alternativa)**
Niculescu-Mizil & Caruana (2005, *ICML*) demonstram que isotonic regression supera temperature scaling em curvas de calibracao nao-monotomas. Ponto forte: nao-parametrico, nao assume forma. Ponto fraco: overfitting critico para n_calib < 1 000 (mesmo artigo, Tabela 3). Com o dataset atual, o regime `event` terá n_calib estimado de 180 amostras por rota (Q2 §5.5) — insuficiente para isotonic. Rejeitado como primario para este dataset.

**Metodo C — Beta Calibration por regime (fallback ADR-004)**
Kull, De Menezes e Flach (2017, *AISTATS*) demonstram que beta calibration (3 parametros: a, b, c) supera platt e isotonic em distribuicoes assimetricas. Ponto forte: modela viés assimetrico (comum em precision-first onde a cauda positiva e mais importante). Ponto fraco: 3 parametros requerem n_calib > 800 para estimacao estavel (mesmos autores, Secao 5). No regime `event`, n_calib projetado e insuficiente.

### Diagnostico de cobertura por estrato

ADR-004 Camada 2 exige tres calibradores Temperature Scaling independentes: calm, opportunity, event. O dataset precisa entregar amostras identificadas por regime com volume minimo por estrato.

**Distribuicao projetada post-trigger P95 (conforme Q2 §5.5):**
- calm: ~85% do dataset → ~5.7×10^6 amostras em 90 dias → **suficiente** para Temperature Scaling (n_calib calm >> 800).
- opportunity: ~8% → ~536k amostras → **suficiente** (>800 por config, globalmente).
- event: ~7% → ~469k amostras globalmente; **por rota: 469k / 2600 = 180 amostras event/rota.**

O threshold de n_calib para Temperature Scaling overfit-free e <500 (ADR-004 §Camada 1, baseado em Guo et al. 2017). **180 amostras event/rota esta abaixo desse limiar quando calibracao per-rota e necessaria.** Calibracao per-rota para regime event nao e viavel — necessario pooling de regimes por cluster de rotas (base_symbol × venue_pair).

**Flag [CONFIANÇA 65%]**: estimativa de n_event/rota e altamente sensivel a frequencia real de regime event, que e desconhecida empiricamente. Q2 reporta IC 95% de [0.024, 0.110] para p_event com apenas 10 halts observados — amplitude de 8.6 pp. A estimativa de 7% pode ser 2.4%–11%, implicando n_event/rota entre 62 e 286.

**Ang & Timmermann (2012, *Annual Review of Financial Economics* 4, 313–337)**: calibracao por regime requer ≥200 observacoes por regime para estabilidade dos parametros de transicao. Com n_event/rota conservadoramente em 180, o limiar minimo nao e atingido com certeza.

**Acao requerida**: (1) Pooling de calibracao para regime event por `base_symbol_cluster` (cluster_id de ADR-007), substituindo per-rota por per-cluster. Estimativa: 2600 rotas / 52 clusters ≈ 50 rotas/cluster → n_event/cluster ≈ 9 000 amostras — acima do limiar. (2) Monitoramento empirico de n_event nos primeiros 30 dias para recalibrar.

**Reliability diagram por regime**: Nixon et al. (2019, *CVPR*) demonstram que adaptive ECE com bins dinamicos por quantil de confianca e superior ao bucketing fixo para distribuicoes assimetricas. Requisito: ao menos 10 amostras por bin em todos os estratos. Para bins de 10 quantis no regime event com n_event/rota=180: 18 amostras/bin — marginal, adequado apenas com bins adaptativos que agregam regioes esparsas. **Flag [CONFIANÇA 70%]**.

---

## §5.2 CQR conformal set — tamanho minimo e residuais PIT-correct

### Split-conformal — requisito formal

Papadopoulos, Proedrou, Vovk & Gammerman (2002, *ECML*): split-conformal requer residuais de calibracao `R_i = |y_i − pred_i|` sobre holdout set **que nunca foi visto pelo modelo base**. Garantia de cobertura ≥ 1−α e distribution-free, mas so vale se o holdout e exchangeable com o conjunto de score.

Vovk (2005, *Algorithmic Learning in a Probabilistic World*, Springer, Cap. 8): n_calib minimo formal para α=0.05 e `n_calib ≥ ceil((1−α)/α) = 19`. Na pratica, recomendado ≥ 200 para cobertura empirica proxima do nominal.

**Angelopoulos & Bates (2023, *A Gentle Introduction to Conformal Prediction*, JMLR Foundations, Cap. 3)**: "The finite-sample guarantee requires only n+1 calibration points for exact coverage at level ⌈(1−α)(n+1)⌉/(n+1). But empirical stability of the prediction interval requires n >> 1/α^2 for low-variance quantile estimation." Para α=0.05: n_calib >> 400.

**CQR assimetrico (Romano, Patterson & Candes 2019, *NeurIPS*)**: residuais `e_lo = (y − pred_lo)_+` e `e_hi = (pred_hi − y)_+` sao computados separadamente. Dois quantis independentes precisam ser estimados, portanto n_calib minimo dobra: recomendado ≥ 400 por estrato.

### Adequacao do dataset atual

Para CQR sobre `G(t, t') = S_entrada(t) + S_saída(t')` (ADR-008):

- **n_calib global**: com 90 dias de coleta, estimativa de 6.7×10^6 amostras Accept totais (Q2 §5.3), dedicando 20% ao calibration set = 1.34×10^6 amostras. **Suficiente globalmente** (muito acima do limiar 400).

- **n_calib por regime**: calm ≥ 1.14×10^6, opportunity ≥ 107k, event ≥ 94k. **Suficiente por regime** em agregado cross-rota.

- **n_calib por rota + regime**: 1.34×10^6 / 2600 rotas / 3 regimes ≈ 172 amostras por (rota, regime). **Insuficiente para CQR por rota** (abaixo de 400). Novamente, pooling por cluster e obrigatorio.

**Gap critico — residuais PIT-correct de G**: dataset atual (pós-Fase 0) persiste `entry_spread` e `exit_spread` em momentos distintos `t₀` e `t₁`. G(t₀, t₁) nao esta pre-computado — requer que o trainer Python calcule `G = entry(t₀) + exit(t₁)` para cada label triple-barrier, usando o valor de `exit_spread` observado **no momento da saida real** (primeiro crossing de barreira).

Problema de PIT correctness: se o scanner persiste `exit_spread(t₀)` (snap no momento de entrada) em vez de `exit_spread(t₁)` (snap no cruzamento de barreira), os residuais do CQR usam informacao errada. O dataset atual (JSONL com `exit_spread_pct` no momento do `AcceptedSample`) **nao contem o exit_spread no momento da realizacao**. O trainer Python deve computar G offline via busca forward na serie temporal de spread de saida.

**Flag [CONFIANÇA 60%]**: o pipeline de computacao de G offline nao esta especificado em nenhum ADR ou documento de leakage. Existe risco de que o trainer compute `G = entry(t₀) + exit(t₀)` (soma instantanea, que e a identidade estrutural negativa) em vez de `G = entry(t₀) + exit(t₁)`. Acao obrigatoria: documentar e auditar o pipeline de computacao de G no trainer Python antes de qualquer treinamento de modelo.

**Latencia de label para adaptive conformal**: com T_max = 24h, labels triple-barrier so ficam disponiveis 24h apos a observacao. Adaptive conformal (Gibbs & Candes 2021, *NeurIPS*) atualiza `α_t+1 = α_t + γ·(α* − 1[y_t ∉ IC_t])` online. Com delay de 24h, a atualizacao online de α e atrasada 24h — a cada ciclo adaptativo. Para γ=0.005 e α*=0.05, convergencia leva ~100 atualizacoes = ~100 dias com T_max=24h. Em pratica, usar T_max=30min para adaptive conformal online (atualiza a cada 30 minutos) e T_max=4h/24h apenas para calibracao offline periodica.

---

## §5.3 Adaptive conformal — latencia de feedback e regime shift

**Gibbs & Candes (2021, *NeurIPS*, Theorem 1)**: adaptive conformal garante cobertura media ~1−α* mesmo sem exchangeability, com taxa de violacao controlada a longo prazo. Nenhuma garantia finite-sample no sentido estrito.

**Zaffran, Dieuleveut, Blot & Darchevsky (2022, *ICML*)**: recomendam γ=0.005 para time-series com autocorrelacao moderada (H < 0.8). Para H~0.85 (estimativa D2 para longtail), γ pode precisar ser aumentado para 0.008–0.01, porque autocorrelacao alta faz com que violacoes de cobertura se agrupem — o estimador `1[y_t ∉ IC_t]` e autocorrelacionado, comprometendo a atualizacao i.i.d. da regra de Robbins-Monro na qual adaptive conformal se baseia. **Flag [CONFIANÇA 55%]**: γ=0.005 nao foi calibrado para H=0.85; exige experimento empirico nos primeiros 30 dias.

**Latencia de feedback por tipo de label**:
- T_max=30min: labels disponiveis ~30min apos `AcceptedSample`. Adaptive update viavel em near-real-time (batch a cada hora, atualiza 2× por batch).
- T_max=4h: labels disponiveis 4h apos observacao. Adaptive update com delay 4h. Aceitavel para calibracao de producao.
- T_max=24h: labels disponiveis 24h apos. Adaptive update com delay 24h. Nao adequado para kill switch baseado em ECE_4h — o kill switch deve usar apenas residuais de T_max≤4h para deteccao rapida.

**Acao obrigatoria**: kill switch ADR-004 Camada 5 deve derivar `ECE_4h` exclusivamente de labels com `T_max ≤ 4h`. Labels de T_max=24h so devem alimentar re-calibracao offline semanal. Sem essa separacao, ECE_4h pode subir apenas 24h apos a deterioracao real — tempo demais para o kill switch agir.

---

## §5.4 Abstention dataset design — 4 razoes (ADR-005)

### Analise por razao

**NoOpportunity** (nenhuma tupla (x,y) atinge floor de utilidade):
- Label: amostras onde nenhuma das 48 configs triple-barrier produz label positivo dentro do T_max.
- Dataset: presentes no AcceptedSample com todos os labels triple-barrier = -1 (timeout/falha). Estimativa: configs com meta≥1.0% e stop=None terão ~80% de timeout (Q2 §5.3). Globalmente disponivel no dataset Accept.
- **Gap critico**: o modelo de abstenção precisa tambem de amostras fora da cauda (abaixo do trigger P95) — amostras onde `entrySpread < P95` mas o operador ainda observaria a rota. Essas amostras **nao existem** no dataset Accept-only. O reservoir sampler (100/rota fora-de-trigger, proposto em Q2 §5.4 Alternativa A2) e imprescindivel para treinar `NoOpportunity` com contraste genuino. Sem ele, o modelo de abstenção aprende apenas "oportunidade entrou no trigger mas nao realizou" — nao "oportunidade nunca existiu". **Flag [CONFIANÇA 40%]: sem reservoir, calibracao de NoOpportunity e estruturalmente impossivel.**

**InsufficientData** (n < n_min = 500):
- Label: rotas com n_obs < 500 durante coleta.
- Dataset: identificavel offline via `listing_history.parquet` + contagem de AcceptedSamples por rota. Ja implementado via `ListingHistory` em C5 (Fase 0). Disponivel.
- Calibracao: model de abstenção binario treinado com features: `listing_age_days`, `n_obs_current`, `cluster_obs_mean`. Nao e calibracao probabilistica no sentido ECE — e uma decisao deterministica baseada em threshold. **Nenhum holdout conformal necessario**; basta verificar que n_obs < 500 e respeitado operacionalmente.
- **Gap moderado**: `listing_age_days` ainda nao esta no FeatureVec (Q2 Gap A2, previsto para Fase 1). Sem essa feature, o modelo de `InsufficientData` usa apenas `n_obs_current` — que e redundante com o threshold deterministico. Feature obrigatoria antes de Marco 2.

**LowConfidence** (IC 95% de P(realize) excede τ_abst):
- Label: derivado do CQR — amostras onde `CI_width = pred_hi − pred_lo > τ_abst_prob = 0.20`.
- Dataset: o CI width e calculado **pelo proprio modelo CQR** em inferencia, nao por label de treinamento externo. Logo, nao precisa de dataset separado — usa o holdout conformal do CQR.
- **Gap critico**: para calibrar o proprio modelo CQR, precisa-se de holdout. Se o holdout e muito pequeno, o CI do CQR e mal estimado — e o modelo de LowConfidence usa CI mal estimado para decidir abstenção. O n_calib ≥ 400 por regime (§5.2) e necessario tambem aqui.
- **Proposta de steel-man**: Cross-conformal (Vovk 2015, *Machine Learning* 101(1-3)) permite usar K folds para calibracao sem desperdicio de dados. Com K=5, n_calib efetivo aumenta 5×. Custo: mais complexidade. Adequado para regimes com amostras escassas (event per rota). **Flag [CONFIANÇA 70%]**: cross-conformal introduz leak leve entre folds — monitorar.

**LongTail** (p99/p95 > 3):
- Label: amostras onde `tail_ratio = p99/p95 > 3.0` no historico de 24h da rota, detectavel via `PerRouteCache` (C6 pos-Fase 0, ring buffer rolling 24h).
- Dataset: calculavel offline sobre AcceptedSamples agrupados por rota + janela temporal. Disponivel.
- **Gap fundamental**: o LongTail threshold (p99/p95 > 3) e heuristico. Bailey & Lopez de Prado (2014, *Journal of Computational Finance* 20(4)) demonstram que para dados financeiros com α~3 (Hill), a razao p99/p95 segue uma distribuicao com media ~2.5 e variancia alta. Threshold 3.0 e 1 desvio padrao acima da media — ou seja, ~16% das amostras seriam rotuladas LongTail em regime normal. Calibracao empirica do threshold e necessaria nos primeiros 30 dias. **Flag [CONFIANÇA 50%]: threshold 3.0 pode ser muito baixo, gerando abstenção excessiva via LongTail.**

### Classificador compartilhado vs modelos separados

ADR-005 Q3 recomendou "binario + modelo separado" com confianca 75%. Analise critica:

- **Steel-man: custo-sensitivo ternario compartilhado** — um unico classificador com matriz de custo assimetrica (El-Yaniv & Wiener 2010, *JMLR* 11(1)) pode aprender as 4 razoes simultaneamente. Vantagem: menos modelos, menos overfitting. Desvantagem: cada razao tem dataset de treinamento de natureza diferente (threshold deterministico para InsufficientData vs probabilistico para LowConfidence) — mistura estruturalmente incorreta.

- **Steel-man: 4 binarios independentes** — um modelo binario por razao. Maximo de interpretabilidade e calibracao independente. Desvantagem: 4 holdouts separados, consumo de dados 4×.

- **Decisao recomendada: dois modelos** — (a) deterministico para `NoOpportunity + InsufficientData` (regras baseadas em threshold, sem ML necessario); (b) probabilistico calibrado para `LowConfidence + LongTail` (requer CQR e ECE). Justificativa: reducao de complexidade sem perda de rigor. A regra deterministica e mais confiavel que qualquer modelo ML para limites claros (n<500, CI_width>τ). **Flag [CONFIANÇA 75%]**: valida conclusao ADR-005 Q3 por argumento independente, nao por deferencia.

---

## §5.5 Temperature Scaling — dataset requirement e risco de overfitting

**Guo et al. (2017, *ICML*, Eq. 3)**: temperatura otima `T* = argmin_{T} NLL(p_T, y)` resolvida via Brent. Com n_calib < 500, variancia do estimador de T e alta — Guo et al. reportam overfitting em n_calib < 200 em datasets com <10 classes.

Dataset atual: com pooling por cluster (nao per-rota), n_calib por (cluster, regime) ≈ n_event/cluster = 9000 (§5.1). **Suficiente para Temperature Scaling sem overfitting.** Per-rota com evento raro: insuficiente.

**Risco de miscalibracao silenciosa**: o regime `event` e exatamente onde o modelo tem maior confianca incorreta. Temperature Scaling calibra a distribuicao marginal de confiancas mas nao a distribuicao condicional por subpopulacao. Romano, Sesia & Candes (2020, *NeurIPS*): "marginal coverage does not imply conditional coverage; conditional miscalibration can persist after marginal calibration." No regime event, o classificador pode ter confianca sistematicamente alta (modelo extrapola para regimes nao-vistos) enquanto Temperature Scaling ajusta globalmente sem corrigir o bias local.

**Acao obrigatoria**: apos Temperature Scaling global, calcular ECE por regime separadamente para detectar residual de miscalibracao. Se `ECE_event > 0.05` mesmo apos calibracao global, ativar calibracao condicional adicional (isotonic sobre amostras event com pooling — exige n_event_pooled >= 1000 para evitar overfitting de isotonic, Niculescu-Mizil & Caruana 2005).

---

## §5.6 Reliability diagram e adaptive ECE por regime

Nixon et al. (2019, *CVPR*): Adaptive ECE com bins por quantis de confianca produz estimativa mais fiel do que ECE com bins fixos quando a distribuicao de confiancas e assimetrica. Para ECE target < 0.02 (ADR-004), o numero de bins necessario e B = sqrt(n_calib). Com n_calib = 9 000 (event pooled), B = 94 bins — adequado para reliability diagram detalhado.

**Gap: pairs (pred_prob, outcome) reconstruiveis?**: o outcome e a label triple-barrier (`success`/`fail`/`timeout`), computada offline. Disponivel. O `pred_prob = P(realize)` e a saida do classificador calibrado, que nao existe ainda (Marco 2). No dataset atual, so a baseline A3 (ECDF+bootstrap) produz `pred_prob` — e pode ser usada para pre-auditoria de calibracao do baseline antes do modelo A2 existir.

**Acao recomendada**: implementar reliability diagram sobre predicoes da baseline A3 nos primeiros 30 dias de coleta. Se ECE_A3 > 0.05, a baseline em si e miscalibrada — ajustar A3 antes de comparar com A2. ECE_A3 serve como piso para medir o ganho de calibracao de A2.

---

## §5.7 Deflated Sharpe Ratio — dataset e PnL simulado

Bailey & Lopez de Prado (2014, *Journal of Computational Finance* 20(4), 41–71): DSR deflaciona o Sharpe ratio empirico pelo numero de trials independentes (hipoteses testadas). Com 48 configs × 3 perfis × 5 baselines = 720 hipoteses, o Sharpe observado precisa superar `DSR = SR × sqrt((1 − γ) / (γ × SR_max))` onde γ e fator de inflacao por numero de trials.

**Dataset requirement para DSR**: PnL simulado por trade. O dataset atual possui `entry_spread_pct` e `exit_spread_pct` (no momento t₀) e labels triple-barrier (sucesso/falha/timeout). PnL bruto simulado = `G(t₀, t₁) = entry(t₀) + exit(t₁)` para amostras `sucesso`; `entry(t₀) + exit(t_stop)` para amostras `falha`; `entry(t₀) + exit(t₀+T_max)` para amostras `timeout`.

**Gap**: o dataset nao persiste `exit_spread(t₁)` — persiste apenas `exit_spread(t₀)`. O trainer Python deve reconstruir `exit_spread(t₁)` via busca forward na serie temporal de AcceptedSamples da mesma rota, usando `ts_ns` como chave. Isso requer que AcceptedSamples de uma rota sejam acessiveis via indice de tempo, o que e viavel com JSONL particionado por data + rota. **Factivel com o dataset atual se indexado corretamente.** **Flag [CONFIANÇA 65%]**: viabilidade depende de densidade de AcceptedSamples por rota — rotas com Accept raro podem ter lacunas temporais de horas, tornando interpolacao de `exit_spread(t₁)` imprecisa.

**Para DSR > 2.0 (meta ADR-013)**: com 720 hipoteses e meta tipica SR = 1.5, DSR exige SR bruto ≥ 2.1 (estimativa via formula Bailey & Lopez de Prado 2014, Eq. 10). O dataset de 90 dias, assumindo ~780 trades por rota × 2600 rotas × 0.3 success rate = 608k trades, e suficiente para estimativa estavel de SR por (config, perfil) com erros de estimacao < 0.1.

---

## §5.8 Split-by-regime K-fold sob regime shift (ADR-006 + Mignard 2020)

ADR-006 define purged K-fold K=6, embargo=2×T_max. Sob regime shift:

**Mignard, Herv & Briol (2020, *ACM AAAI Workshop on Finance and ML*)**: stratified purged K-fold com regime-awareness exige que cada fold mantenha proporcao de regimes proximo do global. Implementacao: sort por timestamp, dividir em K=6 blocos temporais, verificar P(event|fold_k) para k=1..6. Se fold_k tem P(event|fold_k) < 0.02, o modelo treinado sem esse fold subrepresenta event — ECE per-regime degradada.

**Gap pratico**: rotas em regime event sao correlacionadas entre si (spillover FEVD >70% em eventos — D2). Um embargo de 2×T_max remove correlacao temporal dentro de uma rota, mas nao correlacao cross-route durante um evento de mercado. Duas rotas BTC distintas em venues diferentes podem ambas estar em regime `event` simultaneamente, com labels correlacionados. ADR-006 purge remove a amostra t₀ de treino se o label de t₀ (janel T_max) sobrepos o split — mas nao remove outras rotas que compartilharam o mesmo evento.

**Acao recomendada**: adicionar embargo cross-route para o mesmo cluster durante eventos. Durante cada episodio `regime = event` identificado pelo HMM, excluir todas as rotas do mesmo `base_symbol_cluster` do fold de teste onde o evento cai. Custo estimado: -15% de amostras de treino nos folds com event. Justificativa: sem isso, ECE per-regime-event em producao pode ser pior que ECE em validacao por ~0.03 pp (estimativa conservadora — sem dado empirico; **Flag [CONFIANÇA 55%]**).

---

## §5.9 Cobertura do calibration set para modelo A2 — analise dimensional

ADR-004 Camada 2 + CQR (Romano et al. 2019) exige n_calib per (regime, label_config) ≥ 200.

**Calculo dimensional**:
- 48 labels × 3 regimes = 144 combinacoes.
- n_calib minimo por combinacao = 200 (Vovk 2005, Cap. 8).
- n_calib total minimo = 144 × 200 = **28 800 AcceptedSamples** para o calibration set.

**Calibration set e 20% do dataset total** (proposta conservadora): dataset total necessario = 28 800 / 0.20 = **144 000 AcceptedSamples totais**.

**Mapeamento para tempo de coleta**:
Com taxa de Accept observada pós-Fase 0: ~0.5% de oportunidades, e ~66% de stale pos-C3, e 6 RPS × 2600 rotas = 15 600 oportunidades/s × 0.33 (nao-stale) × P95-trigger rate:
- AcceptedSamples/s ≈ 15 600 × 0.33 × 0.05 × acceptance_rate ≈ 258/s (estimativa bruta)
- AcceptedSamples/dia ≈ 258 × 86 400 = **22.3M/dia** (estimativa muito otimista — inclui warm-up)

Porém o dataset real do scanner mostra: em 15 minutos pre-Fase 0, apenas 7 565 Accept de 1.45M oportunidades = **0.5% accept rate global**. Pos-Fase 0 com warm-up, accept = 0 (aguardando n_min=500 no ring). Estimativa conservadora pos-warm-up: 0.3–0.8% accept.

**Com accept rate = 0.5%**:
- Oportunidades/dia: 15 600 × 86 400 = 1.35×10^9 (bruto); com 66% stale = 459M nao-stale; × 0.05 (P95 trigger) = 22.9M triggers/dia; × 0.005 (accept) = **114 500 AcceptedSamples/dia**

**Para 144 000 AcceptedSamples no calibration set (20%):** dataset total ≥ 720 000 AcceptedSamples → 720 000 / 114 500 ≈ **6.3 dias de coleta** para o limiar minimo de calibracao, assumindo accept rate 0.5% pos-warm-up.

**Para CQR conservador (n_calib ≥ 400 por combinacao):** n_calib total ≥ 144 × 400 = 57 600 → dataset total ≥ 288 000 → **2.5 dias** sob mesma taxa.

**Conclusao**: o limiar formal de calibracao e atingivel em dias, nao em 90 dias. O prazo de 90 dias e justificado por outros critérios — cobertura de regime event (halts raros), estabilidade das features rolling, e validacao de DSR. Para calibracao pura, o bottleneck nao e volume total mas sim **volume por (rota, regime) individual**: 114 500 / 2600 rotas = **44 AcceptedSamples/rota/dia** × 90 dias = 3 960/rota total → 3 960 / 3 regimes = 1 320/rota/regime >> 200. **Suficiente para calibracao por rota se regimes sao uniformes.** O problema persiste para regime event: 1 320 × 0.07 = 92 amostras event/rota — abaixo de 200. Confirma necessidade de pooling por cluster.

**Flag [CONFIANÇA 60%]**: calculo assume warm-up completo em todas as 2600 rotas em ≤ 1 dia. Com n_min=500 amostras no ring e decimacao 10 (5000 real samples) a 6 RPS e 34% nao-stale: warm-up real ≈ 40 min por rota. Mas com 2600 rotas e scanner paralelo, warm-up e completado em <1 hora para todas as rotas simultaneamente.

---

## §5.10 Gaps top-5 priorizados

### Gap A3-1 — Residuais PIT-correct de G nao especificados [CRITICO]
**Descricao**: o pipeline de computacao de `G(t₀, t₁) = entry(t₀) + exit(t₁)` pelo trainer Python nao esta documentado. Existe risco de usar `exit(t₀)` em vez de `exit(t₁)`, tornando os residuais CQR incorretos e a calibracao do IC inteiramente falsa.
**Impacto**: todo o pipeline ADR-004 Camada 3 (CQR) invalidado silenciosamente.
**Acao**: (1) especificar o algoritmo de busca forward de `exit_spread(t₁)` no label_schema.md; (2) adicionar teste no `validate_dataset.py` que verifica que G ≥ entry para amostras sucesso (pois por construcao, sucesso implica G ≥ meta).
**Confianca do gap: 85%** — risco real e documentavel.

### Gap A3-2 — Reservoir sampler ausente invalida calibracao de NoOpportunity [CRITICO]
**Descricao**: sem amostras fora-de-trigger (reservoir C=100/rota, Q2 §5.4), o modelo de abstenção `NoOpportunity` nao tem contraponto de "regime abaixo da cauda" para aprender o contraste. A calibracao de `NoOpportunity` e impossivel sem este dado.
**Impacto**: ADR-005 razao `NoOpportunity` nao e calibravel. Modelo de abstenção pode ter precision-recall desequilibrado por falta de negativos genuinos.
**Acao**: implementar reservoir sampler (Vitter 1985, *ACM TOMS* 11(1)) por rota com C=100 antes do inicio da coleta de 90 dias.
**Confianca do gap: 90%** — gap estrutural confirmado por analise logica e Q2.

### Gap A3-3 — Kill switch usa labels T_max=24h com delay inadequado [ALTO]
**Descricao**: o kill switch ADR-004 Camada 5 monitora ECE_4h mas labels de T_max=24h so ficam disponiveis 24h apos. Se ECE_4h usa apenas T_max=4h, ok. Se mistura T_max=24h, o kill switch pode ter delay real de 24h para detectar deterioracao.
**Impacto**: janela de 24h sem kill switch em regime de miscalibracao — precisamente quando regime event causa maior dano monetario.
**Acao**: separar explicitamente o kill switch para usar apenas residuais de labels T_max ≤ 4h. Documentar no ADR-004 Camada 5.
**Confianca do gap: 80%** — inferencia logica direta da latencia de label.

### Gap A3-4 — Threshold LongTail (p99/p95>3) sem calibracao empirica [ALTO]
**Descricao**: o threshold 3.0 e heuristico. Com α~3 (Hill estimator D2), a distribuicao de p99/p95 em regime normal tem media ~2.5, desvio ~0.5. Threshold 3.0 implica ~16% de abstenção LongTail em regime normal — excessivo para um sistema precision-first.
**Impacto**: abstenção excessiva degrada coverage rate e reduz utilidade para o operador.
**Acao**: calibrar threshold empiricamente nos primeiros 30 dias. Medir distribuicao de `tail_ratio = p99/p95` em regime calm (HMM posterior > 0.70) e definir threshold = P95 dessa distribuicao em calm (nao em event). Bailey & Lopez de Prado (2014) recomendam threshold empirico baseado na distribuicao de referencia, nao heuristico.
**Confianca do gap: 75%** — threshold heuristico e documentado; valor correto desconhecido sem dados.

### Gap A3-5 — γ=0.005 nao validado para H=0.85 [MEDIO]
**Descricao**: Zaffran et al. (2022, *ICML*) calibraram γ=0.005 para time-series com H < 0.8. Para H=0.85 (estimativa D2 para longtail), violacoes de cobertura se agrupam mais fortemente — a atualizacao adaptativa e mais lenta que o drift. γ otimo pode ser 0.008–0.015.
**Impacto**: coverage empirica do IC pode ficar 2–5 pp abaixo do nominal durante regime shifts rapidos.
**Acao**: experiment com γ ∈ {0.005, 0.008, 0.010, 0.015} nos primeiros 30 dias de shadow mode. Selecionar via minimizacao de coverage error empirica no calibration set.
**Confianca do gap: 70%** — depende de H real (nao medido; estimativa D2 e extrapolacao).

---

## §5.11 Pontos de decisao com confianca < 80%

| Item | Confianca | Razao da incerteza | Acao |
|---|---|---|---|
| n_event/rota estimado em 180 | **65%** | Frequencia de regime event [2.4%, 11%] IC 95% (Q2) | Medir empiricamente nos primeiros 30d |
| Pooling por cluster resolve n_event insuficiente | **70%** | Cluster size e heterogeneidade desconhecidos | Auditar distribuicao de cluster_sizes no dataset |
| γ=0.005 para H=0.85 | **55%** | H nao medido empiricamente no dataset longtail | Experiment com 4 valores de γ em shadow |
| Threshold LongTail p99/p95=3 | **50%** | Heuristico sem base empirica | Calibrar nos primeiros 30d |
| Residuais G PIT-correct computaveis do JSONL | **60%** | Pipeline de busca forward exit(t₁) nao especificado | Documentar e testar antes de Marco 2 |
| Kill switch usa T_max correto | **65%** | Separacao por T_max nao documentada explicitamente no codigo | Adicionar assertion no codigo de monitoramento |
| Cross-route embargo em evento adicionalmente necessario | **55%** | Spillover FEVD >70% documentado mas impacto em ECE nao quantificado | Experimento ablation em Fase 3 canary |
| Accept rate pos-warm-up = 0.5% | **60%** | Medido em 15 min pre-Fase 0; pos-C3 desconhecido em producao prolongada | Medir nos primeiros 7d de coleta |

---

## §6. Red-team — onde o dataset deixa a calibracao falhar silenciosamente

1. **ECE_global aparenta OK mas event miscalibrado**: se n_event e 7% do dataset, ECE global pode ser 0.018 enquanto ECE_event e 0.09. Temperature Scaling calibra globalmente sem ver o viés local. Sem reliability diagram per-regime, o operador confia num numero global que esconde o regime de maior risco. **Detectavel apenas com estratificacao obrigatoria.**

2. **G computado incorretamente no trainer**: se `G = entry(t₀) + exit(t₀)` (soma instantanea, identidade negativa) em vez de `G = entry(t₀) + exit(t₁)`, os residuais CQR sao negativos por construcao — o modelo aprende a prever intervalos sistematicamente errados. AUC-PR pode ser alta (modelo aprende o sinal errado) enquanto calibracao e catastrofica. **Sem teste explicito de sinal de G, este bug e invisivel.**

3. **Calibracao de NoOpportunity sem contraste**: sem reservoir, o modelo de abstenção treinado apenas em AcceptedSamples ve somente "trigger + sucesso" e "trigger + falha". Nunca ve "sem trigger". A abstenção `NoOpportunity` aprende "qualquer trigger com label ruim = NoOpportunity" — o que e incorreto; NoOpportunity deveria ser "sem trigger viavel". Esto faz com que o modelo abstenha excessivamente em regime calm, reduzindo coverage rate.

4. **Adaptive conformal com delay de 24h**: em producao, se o regime muda subitamente (evento de exchange hack, regulatory action), os labels de T_max=24h so chegam 24h depois. O IC conformal nao se ajusta por 24h. Durante essa janela, o operador recebe ICs estreitos em regime de alta volatilidade — exatamente quando deveria receber ICs largos. Resultado: confianca excessiva em momento de maxima incerteza.

5. **HMM miscalibrado contamina calibracao de regime**: se o HMM classifica incorretamente amostras de regime event como opportunity, as 3 temperaturas de calibracao recebem dados incorretamente rotulados. Temperature Scaling por regime so funciona se os proprios labels de regime sao corretos. Erro composto: modelo ruim × calibrador errado × regime errado. **Sem auditoria de qualidade do HMM (BIC, matriz de confusao de regime), toda calibracao condicional e suspeita.**

---

## §7. Aderencia Rust para calibradores online

ADR-004 especifica ~690 LoC Rust total para a pipeline de calibracao:

- Temperature Scaling: ~20 LoC com `argmin 0.10` (Brent optimizer). Implementavel.
- CQR custom: ~200 LoC (confirmado D7). Latencia O(1) lookup < 10 ns.
- Adaptive conformal: ~30 LoC (5 operacoes aritmeticas). < 5 ns.
- Reliability diagram rolante: ~100 LoC com circular buffer de (pred_prob, outcome) por estrato.
- CRPS offline: ~40 LoC O(N log N) no trainer Python (nao Rust).

**Nenhuma dependencia Python em producao.** Todos os calibradores online sao Rust. CRPS e exclusivamente offline (ADR-016 scoring rules). Stack conforme constraint CLAUDE.md.

---

## §8. Referencias

- Angelopoulos, A.N. & Bates, S. (2023). A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification. *JMLR Foundations and Trends*. https://arxiv.org/abs/2107.07511
- Ang, A. & Timmermann, A. (2012). Regime Changes and Financial Markets. *Annual Review of Financial Economics*, 4, 313–337. https://doi.org/10.1146/annurev-financial-110311-101808
- Bailey, D.H. & Lopez de Prado, M. (2014). The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality. *Journal of Computational Finance*, 20(4), 41–71. https://doi.org/10.3905/jcf.2014.1.029
- Gibbs, I. & Candes, E. (2021). Adaptive Conformal Inference Under Distribution Shift. *NeurIPS* 34. https://proceedings.neurips.cc/paper/2021/hash/0d441de75945e5acbc865406fc9a2559-Abstract.html
- Guo, C., Pleiss, G., Sun, Y. & Weinberger, K.Q. (2017). On Calibration of Modern Neural Networks. *ICML* 34, 1321–1330. https://proceedings.mlr.press/v70/guo17a.html
- Hill, B.M. (1975). A Simple General Approach to Inference About the Tail of a Distribution. *Annals of Statistics*, 3(5), 1163–1174. https://doi.org/10.1214/aos/1176343247
- Kull, M., De Menezes e Silva Filho, T. & Flach, P. (2017). Beta Calibration: a well-founded and easily implemented improvement on Logistic Calibration for Binary Classifiers. *AISTATS* 54. http://proceedings.mlr.press/v54/kull17a.html
- Niculescu-Mizil, A. & Caruana, R. (2005). Predicting Good Probabilities With Supervised Learning. *ICML* 22, 625–632. https://doi.org/10.1145/1102351.1102430
- Nixon, J., Dusenberry, M.W., Zhang, L., Jerfel, G. & Tran, D. (2019). Measuring Calibration in Deep Learning. *CVPR Workshop*. https://arxiv.org/abs/1904.01685
- Papadopoulos, H., Proedrou, K., Vovk, V. & Gammerman, A. (2002). Inductive Confidence Machines for Regression. *ECML* 2430, 345–356. https://doi.org/10.1007/3-540-36755-1_29
- Romano, Y., Patterson, E. & Candes, E. (2019). Conformalized Quantile Regression. *NeurIPS* 32. https://proceedings.neurips.cc/paper/2019/hash/5103c3584b063c431bd1268e9b5e76fb-Abstract.html
- Romano, Y., Sesia, M. & Candes, E. (2020). Classification with Valid and Adaptive Coverage. *NeurIPS* 33. https://proceedings.neurips.cc/paper/2020/hash/244edd7e85dc81602b7615cd705545f5-Abstract.html
- Vitter, J.S. (1985). Random Sampling with a Reservoir. *ACM TOMS*, 11(1), 37–57. https://doi.org/10.1145/3147.3165
- Vovk, V. (2005). *Algorithmic Learning in a Probabilistic World*. Springer. Cap. 8. ISBN 978-0-387-00152-4.
- Zaffran, M., Dieuleveut, A., Blot, M. & Darchevsky, A. (2022). Adaptive Conformal Predictions for Time Series. *ICML* 39. https://proceedings.mlr.press/v162/zaffran22a.html
- El-Yaniv, R. & Wiener, Y. (2010). On the Foundations of Noise-free Selective Classification. *JMLR*, 11(1), 1680–1722. https://jmlr.org/papers/v11/el-yaniv10a.html

---

*Fim A3 v0.1.0. Dataset ainda em coleta; auditoria e do design pos-Fase 0. Revisao obrigatoria apos primeiros 30 dias de coleta empirica com dados reais. Pontos com confianca < 80% devem ser re-auditados com dados empiricos antes de Marco 2.*
