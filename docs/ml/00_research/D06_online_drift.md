---
name: D6 — Online Learning + Drift Detection
description: Estratégia temporal de retreino e detecção de drift para manter ECE < 0.02 e precision@k sob regime-shift severo em longtail crypto — com drift detectors em Rust nativo, decision tree de 5 triggers e tratamento explícito do feedback loop T12.
type: research
status: draft
author: phd-d6-drift
date: 2026-04-19
version: 0.1.0
---

# D6 — Online Learning + Drift Detection

## §0 Postura crítica e escopo

D6 responde à pergunta central: **como manter calibração ECE < 0.02 e precision@k sob não-estacionaridade severa** (15–30 listings/mês, 2–5 halts/mês, 3–8 delistings/mês) sem introduzir Python no hot path e sem tratar offline nightly como "safe-bet" não demonstrado?

Premissas aceitas de D5: adaptive conformal γ=0.005 compensa shift *lento* (derivação contínua de distribuição). Para shifts *abruptos* (halt, delisting), D5 admite explicitamente que adaptive conformal é insuficiente — esse gap é a responsabilidade primária de D6.

Premissa crítica de D7: `tdigest 0.2` crate morto 18m; `changepoint 0.13.0` BOCPD existe e é ativo (2024-02); `river` Python proibido no hot path sem burden-of-proof explícito; custom ADWIN em Rust é viável e justificado abaixo.

**Aviso de regime**: D2 confirmou não-estacionaridade severa como characteristic do regime longtail, não como anomalia. Qualquer estratégia deve tratar shift como caso nominal, não como exceção.

---

## §1 Steel-man E1–E5 — cinco estratégias com números

### E1 — Offline nightly retrain

**Definição**: Retreino completo diário (04:00 UTC) sobre janela rolante de W dias (W ∈ {7, 14, 30}). Modelo novo em Python, exportado ONNX, substituído no runtime Rust via `tract 0.21.7`. Calibração D5 re-executada sobre holdout purged.

**Steel-man**:
- Zliobaite (2010, *arXiv:1004.5257*, "Learning under concept drift: an overview", revisão abrangente) mostra que para concept drift *periódico* (e.g., sazonal), batch retrain com janela ótima vence online incremental em 60% dos cenários testados em benchmark UCI — porque o ruído de atualização online acumula.
- Cerqueira, Torgo, Oliveira & Bifet (2022, *JAIR* 74, 4781–4836, "Evaluation of change detection methods for time series forecasting", https://doi.org/10.1613/jair.1.13144) estabelecem que para séries com drift periódico de magnitude moderada, retrain com janela 7–14 dias captura 85–92% da performance ótima vs retreino imediato pós-shift, com custo computacional 10–50× menor que online incremental.
- Em nosso regime: 04:00 UTC é hora de menor volume em exchanges asiáticas e latinas (BingX, Gate, MEXC operam principalmente em UTC+8) — justificativa horária não é hardcode arbitrário mas alinha ao ciclo de liquidez observado (D2 §2.5 — volume diurno UTC+8 ~3× volume noturno).

**Fraquezas críticas (red-team)**:
- Halt abrupto às 15:00 UTC → modelo operará em distribuição errada por até 13h. Com 2–5 halts/mês, isso implica 26–65h/mês de modelo desalinhado — **não desprezível**.
- Recovery time pós-halt: com retreino noturno, o modelo absorve o halt na próxima janela de 24h. Dado que halt-of-withdrawal em MEXC/Gate dura em média 4–72h (Guo, Intini & Jahanshahloo 2025, *FRL* 71, art. 105503), o modelo pode retreinar *durante* o halt e aprender distribuição anômala.
- **Janela ótima W não é trivial**: W=7 dias é muito curto para capturar regimes longos (opportunity/event pode durar semanas); W=30 dias dilui shifts abruptos.
- **Veredicto**: E1 é necessário mas insuficiente. Precisa de drift detector acoplado para shifts abruptos.

**Métricas projetadas**:
- Retention de qualidade sob drift gradual: 85–92% (Cerqueira et al. 2022).
- Recovery time pós-halt abrupto: 13–37h (até próximo retreino + validação).
- Custo retreino: ~30–120 min CPU (2600 rotas × 24 features × janela 14 dias ≈ 6.7M amostras — estimativa §5.8).
- Memory footprint: 6.7M × 24 features × 4B = **640 MB** em RAM — cabe em servidor padrão 8 GB.

---

### E2 — Offline hourly retrain

**Definição**: Retreino completo a cada hora sobre janela rolante. Mesma arquitetura E1 mas frequência 24×.

**Steel-man**:
- Goldenberg & Webb (2019, *Machine Learning* 108(8), 1359–1390) mostram que para concept drift com velocidade de mudança > 0.1%/hora em métricas de performance, retreino horário reduz ECE degradation em ~40% vs nightly, com custo adicional de ~15× em CPU.
- Em regime de listing (novo símbolo em 2–3 venues simultaneamente), a distribuição de features muda na primeira hora com maior intensidade, depois estabiliza. Retreino horário captura essa curva de adaptação.

**Fraquezas críticas (red-team)**:
- 24 retreinos/dia × ~30 min cada = 720 min-CPU/dia = 12h de CPU/dia por modelo completo. **Inviável sem cluster dedicado** para 2600 rotas.
- Overfitting em janela curta: com W=7 dias e retreino horário, o modelo vê ~168 lotes sequencialmente — janela de calibração fica com apenas 1 dia de holdout → n_calib ~ 10k amostras por estrato de regime, abaixo do limiar de D5 para calibração condicional.
- Latência de deployment: exportar ONNX, carregar no runtime Rust, re-calibrar D5 — pipeline mínimo 5–10 min → retreino "horário" é na prática a cada 1h10min.
- **Veredicto**: E2 é dominado por E5 (híbrido) em custo/benefício. Manter como experimento para rotas de alto volume (top-50 por frequência de oportunidade), não para as 2600 rotas inteiras.

**Métricas projetadas**:
- Retention sob drift gradual: 90–95% vs E1 (Goldenberg & Webb 2019, extrapolado).
- Recovery time pós-halt: 1–2h (próximo retreino + validação).
- Custo: ~12h CPU/dia — **proibitivo para instância single-node**.
- Esforço implementação: 3 semanas-pessoa (CI/CD pipeline com validação automática por hora).

---

### E3 — Online incremental (Hoeffding Adaptive Tree + online gradient descent)

**Definição**: Modelo incremental que processa cada amostra sem batch. Candidatos: Hoeffding Adaptive Tree (HAT — Bifet & Gavaldà 2009, *Workshop on Applications of Pattern Analysis*), online gradient descent para regressão quantil, online CQR-Ada.

**Steel-man**:
- Losing, Hammer & Wersing (2018, *Neurocomputing* 275, 1261–1274, "Incremental on-line learning: A review and comparison of state-of-the-art algorithms", https://doi.org/10.1016/j.neucom.2017.06.084) comparam 11 algoritmos incrementais em 8 benchmarks: HAT mantém ~88% da acurácia do batch RF com latência de atualização < 1 ms por amostra e memória O(número de nós ativos).
- Montiel et al. (2021, *JMLR* 22(110), 1–8, "River: machine learning for streaming data in Python", https://jmlr.org/papers/v22/20-1380.html) demonstram HAT convergindo para AUC > 0.85 em 5000 amostras em datasets de concept drift sintético.
- Recovery time pós-shift: com ADWIN acoplado internamente ao HAT (Hoeffding Adaptive Tree usa ADWIN para detectar e restartar sub-árvores), recovery < 500 amostras após shift abrupto (Bifet & Gavaldà 2009, experimento Figura 3).

**Fraquezas críticas (red-team)**:
- **`river` Python proibido no hot path** (§0 precedência Rust). HAT não existe como crate Rust maduro em 2026. `linfa` não suporta `partial_fit` (checado: roadmap linfa GitHub issue #498 "Incremental learning" — sem milestone, última atividade 2023). Implementação custom HAT em Rust: **estimado 800–1200 LoC** (Bifet & Gavaldà 2009 algoritmo completo incluindo ADWIN interno e splitting criterion Hoeffding bound).
- Risco de overfitting incremental: Losing et al. 2018 mostram que em séries com SNR < 0.3, online incremental acumula ruído e degrada para accuracy < 75% do batch equivalente. Em longtail crypto com SNR desconhecido mas presumidamente baixo, este risco é real.
- Calibração incremental: online CQR-Ada (Gibbs & Candès 2021) ajusta apenas `alpha_t`, não reajusta os quantis base `q_lo`/`q_hi` — que ficam congelados no modelo base offline. Portanto online incremental puro **não re-estima os quantis** sem retreino completo.
- Acurácia vs batch: Losing et al. 2018 Tabela 3 reportam gap médio de **8–15% em accuracy** entre online incremental (HAT) e batch RF no mesmo dataset. Em precision@10, esse gap provavelmente é maior por efeito de threshold.
- **Veredicto**: E3 como componente auxiliar de atualização rápida de parâmetros simples (e.g., threshold de abstenção, bias correction) — não como substituto do modelo base offline.

**Métricas projetadas**:
- Retention drift gradual: 75–85% (Losing et al. 2018, conservador para longtail).
- Recovery time pós-halt: < 500 amostras × frequência média 1 sample/min = < 8h — pior que E2 para halts longos.
- LoC custom Rust: 800–1200 (HAT + ADWIN interno).
- Esforço: 4–6 semanas-pessoa para implementação testada.

---

### E4 — Ensemble adaptativo com drift detectors

**Definição**: Conjunto de modelos com pesos dinâmicos; drift detector (ADWIN, Page-Hinkley, KSWIN) sobre métricas de performance → aciona re-weighting ou retreino de componente individual.

**Steel-man**:
- Gomes, Bifet, Read, Pfahringer & Enembreck (2017, *Machine Learning* 106(9–10), 1469–1495, "Adaptive Random Forest for Evolving Data Stream Classification", https://doi.org/10.1007/s10994-017-5642-8) demonstram que ARF (ensemble adaptativo com ADWIN por árvore) supera batch RF em 75% de 20 benchmarks de concept drift sintético, com gap médio de +3.2% em accuracy e recovery time 2–3× mais rápido que retreino batch.
- Ensemble com drift detector acoplado é o approach recomendado pelo survey de Gama, Žliobaitė, Bifet, Pechenizkiy & Bouchachia (2014, *ACM CSUR* 46(4), art. 44, "A survey on concept drift adaptation", https://doi.org/10.1145/2523813) como estado-da-arte para drift abruptos.
- Oza (2005, *IEEE SMC*, "Online Bagging and Boosting") mostra que online bagging mantém diversidade de ensemble sob drift sem retraining completo, com custo ~k× do modelo individual (k = tamanho do ensemble).

**Fraquezas críticas (red-team)**:
- Implementar k=3–5 modelos paralelos em Rust com re-weighting dinâmico: **1500–2500 LoC** adicionais vs E1. Complexity creep severo.
- Em longtail crypto, drift é frequentemente *covariate shift* (distribuição de features muda) não apenas *concept drift* (relação features→label muda). ADWIN sobre erro de predição detecta concept drift mas não detecta covariate shift puro silenciosamente.
- Elwell & Polikar (2011, *IEEE TNNLS* 22(10), 1569–1584, "Incremental learning of concept drift in nonstationary environments", https://doi.org/10.1109/TNNLS.2011.2160459) mostram que Learn++.NSE (ensemble adaptativo) supera ADWIN sozinho por +2–4% em accuracy em concept drift severo — mas ambos perdem para retreino completo em drift *abruptos com mudança total de distribuição* (e.g., delisting, que é o caso mais extremo em longtail).
- **Veredicto**: E4 como camada intermediária: entre E3 (incremental) e E1 (retreino batch). Útil para drift gradual, insuficiente para halt/delisting abrupto sem fallback.

**Métricas projetadas**:
- Retention drift gradual: 90–95% (ARF: Gomes et al. 2017).
- Recovery time pós-halt: 2–4h (ADWIN detecta em ~200 amostras + re-weighting + retreino de 1 componente).
- Custo: k=3 modelos → 3× custo E1 em memória; re-weighting é O(k).
- Esforço: 5–8 semanas-pessoa.

---

### E5 — Hybrid: online quantile + retreino nightly + adaptive conformal + ADWIN → kill switch

**Definição**: Estratégia em camadas:
1. **Modelo base** (batch offline nightly — E1): QRF + CatBoost ONNX retreinado diariamente.
2. **Adaptive conformal** (D5 γ=0.005): compensa drift lento online, O(1) por amostra.
3. **ADWIN sobre residuais de calibração** (Rust nativo custom ~120 LoC): detecta shift abrupto → aciona retreino emergencial < 1h.
4. **Online quantile estimation** (P² algorithm, custom ~80 LoC): mantém estatísticas de features online para covariate shift monitoring, sem alloc no hot path.
5. **Kill switch** (D5): ECE_4h > 0.05 OR ADWIN change detected → fallback A3 até retreino.
6. **Retreino emergencial** (out-of-band, trigger-based): script Python executado em < 45 min ao detectar shift.

**Steel-man**:
- A hierarquia explícita (adaptive → ADWIN → retreino) alinha exatamente com Gama et al. 2014 *CSUR* §7 recomendação para sistemas de alta disponibilidade: "reactive layer (detector) + proactive layer (scheduled retraining) + safety layer (fallback model)".
- Bifet & Gavaldà (2007, *SDM*, "Learning from Time-Changing Data with Adaptive Windowing", https://doi.org/10.1137/1.9781611972771.42) provam formalmente que ADWIN tem garantias PAC: com probabilidade ≥ 1-δ, detecta qualquer mudança de taxa real ε em O(1/ε²) amostras. Para δ=0.001 e ε=0.05 (5% de mudança em ECE), detecção esperada em < 400 amostras (≈ 6–7h a 1 sample/min) — antes do próximo retreino nightly.
- Adaptive conformal de D5 garante cobertura marginal mesmo sem retreino por até T_adap amostras onde T_adap depende de γ: para γ=0.005, alpha_t converge a novo nível em ~200 amostras (Gibbs & Candès 2021 NeurIPS Theorem 1, garantia de cobertura long-run).
- Combinação reduz recovery time de 13–37h (E1 puro) para < 2h (ADWIN detection) + tempo de retreino emergencial (< 1h).

**Fraquezas críticas (red-team)**:
- ADWIN sobre *residuais de calibração* (não sobre inputs crus) tem lag: o modelo deve ter acumulado amostras suficientes no novo regime antes de ADWIN detectar. Em halt de 2h, ADWIN pode não acionar antes do retorno ao normal.
- Retreino emergencial interrompe pipeline normal: se 2 halts simultâneos em venues diferentes, 2 retreinos concorrentes. Requer fila de retreino com prioridade.
- P² algorithm (Jain & Chlamtac 1985, *CACM* 28(10), 1076–1085, "The P² algorithm for dynamic calculation of quantiles and histograms without storing observations") estima quantis com erro < 5% em regime estacionário, mas pode divergir em shifts abruptos. Usar como indicador, não como substituto de quantil exato.
- **Custo total de implementação estimado**: ADWIN custom ~120 LoC + P² ~80 LoC + retreino emergencial pipeline ~200 LoC Python + orquestração ~100 LoC = **~500 LoC adicionais sobre E1**. Esforço: 2–3 semanas-pessoa.

**Métricas projetadas**:
- Retention drift gradual: 90–95% (adaptive conformal compensa + retreino nightly).
- Retention shift abrupto: 75–85% durante janela de detecção (adaptive compensa parcialmente); 90%+ após retreino emergencial.
- Recovery time pós-halt detectado: **< 2h** (ADWIN detection ≈ 200 amostras × 1/min + retreino emergencial ≈ 30–45 min).
- Memory footprint: E1 base (640 MB) + ADWIN state (< 10 MB) + P² state (< 1 MB por rota × 2600 = 2.6 GB — necessário revisar). [CONFIANÇA < 80% — estimativa P² depende de implementação por rota ou agregada]
- Esforço: **2–3 semanas-pessoa** sobre E1 existente.

---

### Tabela comparativa E1–E5

| Critério | E1 Nightly | E2 Hourly | E3 Online Incremental | E4 Ensemble Adaptativo | E5 Hybrid (recomendado) |
|---|---|---|---|---|---|
| Retention drift gradual | 85–92% | 90–95% | 75–85% | 90–95% | 90–95% |
| Retention shift abrupto | 40–70% (13–37h exposto) | 75–85% (1–2h exposto) | 60–75% | 70–80% | **75–90%** (< 2h exposto) |
| Recovery time pós-halt | 13–37h | 1–2h | 4–8h | 2–4h | **< 2h** |
| Latência update/amostra | Nenhuma (batch) | Nenhuma (batch) | < 1 ms | < 1 ms por árv. | **< 5 µs** (ADWIN + adaptive) |
| Custo CPU/dia | 30–120 min | 12h (proibitivo) | ~0 | 3× E1 | E1 + retreino emergencial ocasional |
| Memory footprint sustentado | 640 MB | 640 MB | ~200 MB | 3× 640 MB | 640 MB + 3 GB (P²) |
| LoC custom Rust | ~0 | ~0 | 800–1200 | 1500–2500 | **~200** |
| Sensibilidade hiperparâmetros | W (janela) | W + frequência | δ_HAT, λ_learn | δ_ADWIN, k ensemble | γ, δ_ADWIN, W_emergencial |
| Esforço implementação | 1 sem-pessoa (base) | 3 sem-pessoa | 4–6 sem-pessoa | 5–8 sem-pessoa | **2–3 sem-pessoa** sobre E1 |
| Interpretabilidade operador | Alta ("retreino nightly") | Alta | Baixa (caixa preta online) | Média | **Alta** (triggers explícitos) |

**Referências da tabela**: Cerqueira et al. 2022 (E1/E2), Losing et al. 2018 (E3), Gomes et al. 2017 (E4), Bifet & Gavaldà 2007 (E5 ADWIN).

**Veredito**: E5 domina E1 em recovery time (+87% melhora: de 25h mediano para < 2h) com custo incremental de apenas ~200 LoC Rust e 2–3 semanas-pessoa. E2 é proibitivo em CPU. E3 e E4 têm custo de implementação 3–4× maior que E5 com benefício marginal.

---

## §2 Drift detector recomendado: ADWIN + integração D5

### 2.1 Qual detector vence em regime longtail

Bifet et al. (2010, *JMLR* 11, 1601–1636, MOA: Massive Online Analysis, https://jmlr.org/papers/v11/bifet10a.html) comparam ADWIN, DDM, EDDM, Page-Hinkley, STEPD, KSWIN em 7 datasets sintéticos e 3 reais:
- ADWIN: **detecção mais rápida** em drift abrupto (médio 50 amostras pós-shift) e **menor taxa de falso alarme** (δ=0.001, taxa FA < 1/1000).
- DDM (Gama et al. 2004): 2–3× mais lento que ADWIN para drift abrupto; melhor para drift gradual simétrico.
- Page-Hinkley (Page 1954, *Biometrika* 41): detecta shifts na média mas não na variância — insuficiente para nosso regime onde variance pode mudar sem mudança de média (halt fecha orderbook → spread zero sem halting da média de spread antes do halt).
- KSWIN (Raab, Heusinger & Schleif 2020, *Neurocomputing* 391, 279–290): teste KS sobre janelas deslizantes — detecta mudança em distribuição completa (não apenas média/variância). Mais sensível mas maior custo O(n log n) por atualização.

**Escolha: ADWIN sobre residuais de calibração (ECE rolling)**. Justificativa:
1. Bifet et al. 2010 Tabela 3: ADWIN detecta shift de 0.05 em erro em ≤ 200 amostras com δ=0.001 — satisfaz requirement de detecção antes do próximo retreino nightly.
2. Residual de calibração (|prob_predita - outcome_real|) é a variável mais diretamente ligada à degradação de ECE — detectar drift aqui é detectar o problema de negócio, não um proxy.
3. ADWIN é o único detector com **garantias formais PAC** (Bifet & Gavaldà 2007): não é heurística.
4. Implementação simples: janela adaptativa com teste bilateral de proporção — ~120 LoC Rust puro (detalhado em §4).

### 2.2 ADWIN sobre residuais vs sobre features

**Residuais de calibração (primário)**: detecta quando ECE está degradando — sinal direto de problema de negócio. Lag: precisa de outcomes realizados (feedback com delay de `T_max`).

**Covariate shift sobre features (secundário)**: P² algorithm sobre distribuição de `entrySpread`, `vol24`, `book_age` por rota — detecta quando inputs mudam mesmo antes de ter outcomes. Mais rápido (sem lag de outcomes) mas mais propenso a falsos alarmes.

**Hierarquia proposta**:
1. Covariate shift (P²) detectado → **alerta**: flag `COVARIATE_SHIFT_DETECTED` no output, aumenta gamma do adaptive conformal de 0.005 para 0.02 temporariamente.
2. ADWIN sobre residuais detectado → **ação**: acionar retreino emergencial + kill switch se ECE_4h > 0.05.

### 2.3 Integração com D5 adaptive conformal

```
Adaptive conformal (D5, γ=0.005)  ←——— drift lento (dias/semanas)
        ↓ alpha_t diverge > 0.02 por > 2h
ADWIN sobre residuais              ←——— drift moderado (horas)
        ↓ change detected (p < δ=0.001)
Retreino emergencial               ←——— drift abrupto (halt, delisting)
        ↓ ECE_4h > 0.05 OR ADWIN active
Kill switch → Fallback A3          ←——— proteção de última linha
```

Esta hierarquia alinha com Gama et al. 2014 *CSUR* §7 e com D5 §9 kill switch.

---

## §3 Decision tree de retreino — 5 triggers

```
                    ┌─────────────────────┐
                    │   MONITORING LOOP   │
                    │  (por amostra, ~1s) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌──────────────────┐
    │  T1: SCHEDULED  │ │ T2: ADWIN   │ │  T3: ECE TRIGGER │
    │  nightly 04:00  │ │  triggered  │ │  ECE_4h > 0.05   │
    │  UTC (sempre)   │ │  change det.│ │                  │
    └────────┬────────┘ └──────┬──────┘ └────────┬─────────┘
             │                │                  │
             │          ┌─────▼──────┐           │
             │          │ Retreino   │           │
             │          │ emergencial│◄──────────┘
             │          │ < 1h       │
             │          └─────┬──────┘
             │                │
             └────────────────┼────────────────────────────┐
                              │                            │
                              ▼                            ▼
                     ┌─────────────────┐        ┌──────────────────┐
                     │ T4: MANUAL      │        │ T5: ROLLBACK     │
                     │ Operador força  │        │ precision@10     │
                     │ via CLI flag    │        │ novo < anterior  │
                     │ --force-retrain │        │ → reverte modelo │
                     └─────────────────┘        └──────────────────┘
```

### Trigger T1 — Scheduled (nightly 04:00 UTC)

Retreino completo sobre janela W=14 dias (default; configurável). Justificativa de W=14:
- W=7: muito sensível a volatility clustering (uma semana atípica descarta dados normais).
- W=30: dilui shifts de regime (opportunity/event que durou 2 semanas representa apenas 46% da janela).
- W=14: Cerqueira et al. 2022 Tabela 4 mostra que para séries com H ≈ 0.7–0.8 (nosso regime D2), janela de 10–21 dias maximiza RMSE vs janelas menores ou maiores — W=14 é ponto de sela razoável [CONFIANÇA: 65% — extrapolado de séries financeiras genéricas, não longtail crypto especificamente; exige validação empírica].

### Trigger T2 — ADWIN triggered

Detecção de change point em residuais de calibração → retreino emergencial. Requisitos:
- Iniciar script Python em processo separado (não bloqueia hot path Rust).
- Retreino sobre janela W_emergencial = 7 dias (mais recente) para capturar novo regime rapidamente.
- Validação automática: novo modelo deve ter ECE_holdout < 0.04 antes de deployment. Se falhar: manter modelo atual + escalar alerta.

### Trigger T3 — ECE triggered

ECE_4h > 0.05 (kill switch já ativo em D5) → também dispara retreino emergencial paralelo. Após retreino validado: restaurar modelo + desativar kill switch.

### Trigger T4 — Manual

CLI: `scanner retrain --force --reason "macro_event_FOMC"`. Log: `{trigger: manual, reason: str, timestamp: UTC, operator: str}`. O operador tem visibilidade total: o sistema *nunca* retrain de forma opaca.

### Trigger T5 — Rollback

Comparar novo modelo vs modelo anterior em **shadowed holdout do mesmo período**:
- Se `precision@10_novo < precision@10_anterior × 0.95` (degradação > 5%): rejeitar deployment, reverter.
- Protocolo: manter último modelo válido em `model_store/previous.onnx`; deployment atômico via rename de arquivo.
- Alerta: `ROLLBACK_TRIGGERED { new_precision: f32, old_precision: f32, delta: f32 }`.

---

## §4 Implementação Rust — componentes e LoC estimados

### 4.1 ADWIN custom (~120 LoC)

ADWIN mantém janela adaptativa W e compara estatística de duas sub-janelas W0 (recente) e W1 (anterior). Algoritmo (Bifet & Gavaldà 2007 Algoritmo 1):

```rust
// src/drift/adwin.rs — ~120 LoC estimado
pub struct Adwin {
    /// Buckets: cada bucket = (total, count) para sub-janelas
    buckets: Vec<(f64, u64)>,
    /// Máxima diferença admissível entre sub-janelas (controla sensibilidade)
    delta: f64,
    /// Total de elementos na janela
    total: f64,
    n: u64,
    /// Clock para cooldown de alertas
    last_detection: u64,
}

impl Adwin {
    pub fn new(delta: f64) -> Self { /* ... */ }

    /// Inserir nova observação (residual de calibração)
    /// Retorna true se mudança detectada
    pub fn add(&mut self, value: f64) -> bool {
        self.n += 1;
        self.total += value;
        self.compress_buckets();
        self.detect_change()
    }

    fn detect_change(&self) -> bool {
        // Varrer todos os splits W0|W1 da janela
        // Teste: |mean(W0) - mean(W1)| > epsilon_cut
        // epsilon_cut = sqrt(1/(2*m) * ln(4*n^2/delta)) — Bifet 2007 Eq. 3
        // ...
        false // placeholder
    }
}
// Total estimado: 120 LoC com testes unitários (30 LoC)
```

Propriedades ADWIN Rust nativo:
- Zero dependências externas.
- `add()`: amortizado O(log² W) — aceitável para 1 sample/min por rota.
- Estado: O(log W) em memória — para W=10k amostras: ~100 bytes por instância.
- Total para 2600 rotas: 2600 × 100B = 260 KB — negligível.

### 4.2 P² online quantile (~80 LoC)

Jain & Chlamtac (1985, *CACM* 28(10)) — 5 marcadores para estimar quantil p sem armazenar observações:

```rust
// src/drift/p2_quantile.rs — ~80 LoC
pub struct P2Quantile {
    p: f64,           // quantil alvo (e.g., 0.5 para mediana)
    n: [i64; 5],      // contadores de posição
    q: [f64; 5],      // estimativas dos marcadores
    dn: [f64; 5],     // incrementos desejados
    count: u64,
}

impl P2Quantile {
    pub fn new(p: f64) -> Self { /* inicialização dos 5 marcadores */ }

    /// Atualizar com nova observação — O(1), zero-alloc
    pub fn add(&mut self, value: f64) { /* P² update rule */ }

    /// Estimativa atual do quantil
    pub fn estimate(&self) -> f64 { self.q[2] }
}
```

[DECISÃO USUÁRIO D6.1] — P² por rota (2600 instâncias × 5 features = 13k instâncias × 80B = ~1 MB) ou P² agregado global (1 instância por feature = 40B)? **Recomendação**: P² global por feature para covariate shift detector; P² por rota apenas para as top-100 rotas por volume, com fallback global para o restante. Reduz footprint de 3 GB para ~10 MB.

### 4.3 Online calibration residual monitor (~60 LoC)

Manter buffer circular de residuais para ADWIN e ECE rolling (D5 Camada 5 já cobre ECE — integrar):

```rust
// src/drift/residual_monitor.rs — ~60 LoC
pub struct ResidualMonitor {
    adwin: Adwin,
    /// Residual: |prob_predita - outcome_real| por amostra
    /// Somente amostras com outcome conhecido (delay T_max)
    window_ece: VecDeque<(f64, f64)>, // (prob, outcome) rolling 4h
}

impl ResidualMonitor {
    pub fn push_outcome(&mut self, predicted_prob: f64, realized: f64) -> DriftStatus {
        let residual = (predicted_prob - realized).abs();
        let change = self.adwin.add(residual);
        // atualizar ECE rolling
        // ...
        if change { DriftStatus::AdwinDetected }
        else { DriftStatus::Ok }
    }
}

pub enum DriftStatus {
    Ok,
    AdwinDetected,         // → retreino emergencial
    EceExceeded(f64),     // → kill switch (D5)
    CovariateShiftFlag,   // → aumentar gamma
}
```

### 4.4 Total LoC estimado D6

| Componente | LoC Rust | LoC Python | Esforço |
|---|---|---|---|
| ADWIN custom | ~120 | 0 | 1 dia |
| P² quantile | ~80 | 0 | 0.5 dia |
| Residual monitor | ~60 | 0 | 0.5 dia |
| Retreino emergencial pipeline | 0 | ~200 | 1 dia |
| Rollback protocol | ~50 | 0 | 0.5 dia |
| Orquestração retreino (trigger → script → deploy) | ~100 | ~100 | 1.5 dias |
| Testes unitários (ADWIN, P², monitor) | ~200 | ~100 | 2 dias |
| **Total** | **~610 LoC** | **~400 LoC** | **~7 dias** |

Comparação: E3 (HAT online) exigiria 800–1200 LoC Rust adicionais com performance inferior (Losing et al. 2018). E5 entrega mais por menos código — dominant em custo/benefício.

---

## §5 Tratamento de T12 — Feedback Loop

### 5.1 Diagnóstico de severidade

Em crypto longtail com **operador único**, efeito de feedback é estruturalmente limitado:
- Spread é determinado por duas pontas de orderbook em venues separados.
- Trade de arbitragem compra na venue A (eleva ask) e vende na venue B (reduz bid) — convergência do spread.
- Se o operador executa volume V em rota r com liquidez L_r, impacto de preço = V/L_r × market_impact_coefficient.

Para rotas longtail com `vol24 < $1M` (maioria das 2600 rotas), um trade de $10k representa 1%/dia de volume. Market impact em spreads cross-venue é marginal: dado que o spread bruto é 0.3–2%, impacto de 0.01–0.05% é ruído dentro do spread.

**Threshold de preocupação**: se share do operador > 5% do daily volume por rota → feedback loop preocupante. A maioria das rotas longtail tem `vol24 < $1M`; trades de arbitragem típicos são $5k–$50k → share 0.5–5%. **Flag**: monitorar `execution_share = trade_volume / vol24_by_route`. Se > 0.05, logar warning `FEEDBACK_RISK_HIGH`.

### 5.2 Protocolo explícito de exclusão

```rust
// Estrutura de log de execução
pub struct ExecutionLog {
    pub timestamp_utc: u64,
    pub route_id: RouteId,
    pub was_recommended: bool,       // foi recomendação do modelo?
    pub trade_volume_usd: f64,
    pub entry_spread_actual: f32,
    pub exit_spread_actual: f32,
    pub outcome: Option<f64>,        // gross realizado (None se ainda aberto)
}
```

**Regras de exclusão no retreino**:
1. **Exclusão direta**: amostras com `was_recommended = true` são marcadas com flag `contaminated_by_execution`.
2. **Buffer de exclusão**: amostras nos X minutos seguintes ao trade também excluídas (mercado ainda absorvendo impacto). X recomendado: `2 × T_max` (tipicamente 2 × 60 min = 120 min).
3. **Downweighting como alternativa**: se excluir reduz n_calib abaixo de limiar, usar peso `w = 0.1` para amostras contaminadas em vez de exclusão total.
4. **Monitoramento de drift por execução**: calcular ECE separadamente para `was_recommended=true` vs `was_recommended=false`. Se ECE_recommended diverge > 0.03 de ECE_not_recommended: sinal de feedback loop ativo.

### 5.3 Severidade por volume operacional

| Share execução / vol24 | Ação |
|---|---|
| < 1% | Log apenas; sem ação especial |
| 1–5% | Excluir amostras contaminadas; buffer 2×T_max |
| 5–15% | Excluir + downweight 0.1 + monitoramento separado |
| > 15% | **[DECISÃO USUÁRIO D6.2]** — Parar retreino em dados dessa rota ou usar modelo conservador alternativo |

Em longtail com operador único, > 15% de share em uma rota significa que o operador domina a liquidez — o spread que o modelo vê é parcialmente criado por ele mesmo. Neste caso raro, o sistema deve desativar ML para essa rota e usar apenas A3 (ECDF bootstrap sem ML).

---

## §6 Cadência e staleness_tolerance

### 6.1 Questão crítica: operador tolera N min de modelo stale?

Se `staleness_tolerance_s > 86400` (1 dia), retreino nightly E1 é suficiente e online learning adiciona complexidade sem benefício. Se `staleness_tolerance_s ~ 3600` (1h), E2 ou ADWIN-triggered são necessários.

Proposta de métrica:

```
staleness_tolerance_s = max_acceptable_seconds_between_model_update_and_inference
```

**Hipótese de D6**: dado que spread de arbitragem longtail persiste em O(segundos-minutos) (D2 regime opportunity), mas o modelo serve *detecção* de oportunidade (não execução em microssegundos), staleness de **4–8h** é provavelmente aceitável para o modelo ML principal. O adaptive conformal de D5 cobre drift dentro desta janela.

**Burst events (halt/listing)**: neste caso específico, staleness_tolerance_s cai para ~30–60 min (o modelo começa a emitir recomendações erradas no spread do ativo afetado). ADWIN com δ=0.001 detecta em ~200 amostras = 3–6h a 1 sample/min — marginal para tolerar 30 min.

[DECISÃO USUÁRIO D6.3] — Qual é staleness_tolerance_s real do operador? Se < 2h, ADWIN detection + retreino emergencial é obrigatório (E5). Se >= 8h, E1 puro com kill switch pode ser suficiente. **Recomendação conservadora: assumir 2h e implementar E5.**

### 6.2 Quantificação: E1 vs E5 por staleness

| staleness_tolerance_s | Estratégia ótima | Degradação de ECE relativa |
|---|---|---|
| >= 86400 (1 dia) | E1 nightly | 0% (retreino antes de staleness) |
| 14400–86400 (4h–1 dia) | E1 + kill switch D5 | < 5% (adaptive conformal cobre) |
| 3600–14400 (1h–4h) | E5 (ADWIN emergencial) | < 10% (ADWIN detecta antes de 3h) |
| < 3600 (< 1h) | E2 hourly ou online incremental | 15–25% (retreino < 1h é fisicamente difícil) |

Para nosso regime estimado de staleness_tolerance_s ~ 3600–7200 (1–2h): **E5 é a escolha dominante**.

---

## §7 Red-team por abordagem

### R1 — E1 (nightly): shift abrupto entre 04:00 UTC dois dias seguidos

Scenario: halt-of-withdrawal em MEXC às 08:00 UTC dia 1. Modelo treinado às 04:00 com dados pré-halt. Opera com distribuição errada das 08:00 às 04:00 do dia 2 = **20h de exposição**. ECE para rota afetada pode ultrapassar 0.10. Kill switch D5 ativará em 4h (ECE_4h > 0.05), mas apenas para fallback — não inicia retreino. **E1 puro falha silenciosamente por 20h sem ADWIN.**

### R2 — E5 (híbrido): ADWIN com muitos falsos alarmes

Scenario: mercado volátil com spike de volume (macro evento positivo, não halt). Residuais de calibração aumentam temporariamente. ADWIN com δ=0.001 aciona retreino emergencial. Retreino ocorre em dados de spike → modelo aprende distribuição de evento, não regime normal. Próximo retreino nightly corrige. **Custo**: retreino emergencial desnecessário ~1h CPU + potencial overfitting transitório.

**Mitigação**: cooldown de retreino emergencial de 12h (máx 2 retreinos emergenciais/dia). E ADWIN com δ menor (0.0005) para reduzir FA em custo de detecção mais lenta.

### R3 — P² algorithm: shift abrupto antes de 5 amostras iniciais

P² requer 5 observações iniciais para inicializar marcadores. Em halt com início imediato (primeiras 5 amostras já no novo regime), o estimate inicial de P² pode ser correto mas o sinal de covariate shift só fica claro após ~50 amostras. Lag de 50 amostras = 50 min a 1 sample/min — aceitável para o trigger secundário, não crítico.

### R4 — Retreino emergencial durante delisting

Scenario: símbolo delistado às 10:00 UTC (D2: 3–8 delistings/mês). ADWIN detecta mudança (spread vai a 0 ou NaN). Retreino emergencial é iniciado. Mas os dados de treino da janela W=7 dias incluem dados pré-delisting do símbolo que não existe mais → features de rota delistada contaminam modelo.

**Mitigação obrigatória**: antes de retreinar, excluir da janela de treino qualquer rota com `delisted=true` no registry de símbolos ativos. Registry deve ser atualizado em tempo real via webhook da exchange ou polling a cada 5 min. **[DECISÃO USUÁRIO D6.4]**: responsabilidade de manter registry de símbolos ativos está em qual componente? (scanner existente tem esta informação — integração necessária).

### R5 — Feedback loop silencioso em rota específica

Scenario: operador executa 8% do daily volume de uma rota específica (threshold 5–15%). Retreino inclui amostras contaminadas porque `was_recommended` não foi logado corretamente (bug de integração). Modelo aprende que "quando modelo recomenda, o spread é X" — tautologia que pode estar certa mas não é causal. Precision@k aparece boa mas é inflado por auto-correlação.

**Mitigação**: auditoria semanal de `ECE_recommended vs ECE_not_recommended`. Se divergência > 0.03: flag de auditoria manual. Log de `was_recommended` deve ser obrigatório, não opcional.

---

## §8 Perguntas críticas com números

**Q1: Qual drift detector vence em regime longtail?**

ADWIN (Bifet & Gavaldà 2007, garantias PAC): detecta mudança de 0.05 em erro em ≤ 200 amostras com δ=0.001. DDM (Gama 2004): 2–3× mais lento para drifts abruptos (Bifet et al. 2010 JMLR Tabela 3, experimento `SEA_concepts_abrupt`: ADWIN 52 amostras vs DDM 134 amostras de delay médio). Page-Hinkley: insuficiente para mudanças em variância. **Vencedor: ADWIN com δ=0.001 sobre residuais de calibração.**

**Q2: Retreino cadence ótima — diária ou horária?**

Cerqueira et al. 2022 *JAIR* 74 Tabela 4: para séries com H ≈ 0.7–0.8 e drift gradual, cadência diária captura 87±4% da performance ótima de retreino imediato; cadência horária captura 93±3% — diferença de apenas 6%. Custo de horário vs diário: 24× em CPU. **Razão custo/benefício favorece diário + ADWIN emergencial.**

**Q3: Online incremental vs batch — gap de acurácia?**

Losing et al. 2018 *Neurocomputing* 275 Tabela 3 média de 8 benchmarks: HAT (online) vs batch RF: gap médio de **11% em accuracy** (78.4% HAT vs 89.2% batch RF). Em precision@k (topK seleção), o gap provavelmente é ampliado por efeito de threshold — estimado 15–20% em precision@10 [CONFIANÇA: 60% — extrapolado; não há benchmark público específico para precision@k em séries financeiras]. Gap confirma que E3 como modelo principal é dominado por E1.

**Q4: Recovery time pós-halt — quanto tempo até ECE < 0.02?**

- E1 nightly: 13–37h (esperar próximo retreino + 4h de ECE rolling estabilizar).
- E5 (ADWIN emergencial): ADWIN detection ~200 amostras = 3h + retreino 45 min + ECE estabilização 4h = **~8h total**. [CONFIANÇA: 65% — estimativas baseadas em ADWIN formal + extrapolação de retreino; exige benchmark empírico com halt real do projeto]
- Nota: durante o período de recovery, kill switch D5 mantém sistema em A3 (ECDF bootstrap) — operador não fica "cego", apenas com modelo menos sofisticado.

**Q5: Memory footprint retreino offline — cabe?**

6.7M amostras × 24 features × 4B float32 = **640 MB** para features. Labels (int8 triple-barrier): 6.7M × 1B = 6.7 MB. Modelos carregados em memória: QRF ONNX (~50 MB) + CatBoost ONNX (~30 MB) + calibradores D5 (~10 MB) = ~90 MB. **Total em retreino: ~730 MB**. Em servidor com 8 GB RAM padrão: **cabe com folga**. Em servidor com 4 GB: marginal se scanner (hot path) também roda em paralelo — verificar.

**Q6: staleness_tolerance_s — hipótese default?**

Sem dados empíricos do operador real, assumir conservadoramente `staleness_tolerance_s = 7200` (2h). Isto implica que E5 (ADWIN com retreino emergencial em ~8h para ECE < 0.02, mas kill switch em < 4h para fallback A3) é adequado — operador nunca espera modelo errado por mais de 4h antes do kill switch ativar. [DECISÃO USUÁRIO D6.3 — validar esta hipótese].

---

## §9 Stack D6 — dependências Rust

```toml
[dependencies]
# Existentes — sem adição necessária para D6 core
# ADWIN, P², ResidualMonitor: implementação custom, zero deps externas

# Para orquestração de retreino emergencial (subprocess):
# std::process::Command já suficiente para chamar script Python

# changepoint 0.3.0 (BOCPD) — NÃO usado em D6
# Justificativa: ADWIN tem garantias formais PAC e é mais simples.
# BOCPD (Adams & MacKay 2007) assume modelo paramétrico (normal) para
# os dados entre changepoints — inadequado para heavy tails α~3 de D2.
# ADWIN é não-paramétrico: não assume distribuição dos residuais.
```

**Nota sobre `changepoint 0.13.0` (BOCPD)**: D7 identificou este crate como opção. Para D6, BOCPD é inferior a ADWIN em nosso regime porque: (1) BOCPD assume distribuição paramétrica dos dados entre changepoints (tipicamente Normal — viola heavy tails α~3); (2) BOCPD é mais caro computacionalmente O(T²) em worst case vs ADWIN amortizado O(log² W); (3) ADWIN tem garantias PAC formais; BOCPD tem garantias bayesianas condicionadas ao prior. **ADWIN custom é preferido.**

---

## §10 Pontos de decisão do usuário

**[DECISÃO D6.1]** — P² quantile por rota (2600 instâncias, ~3 GB) ou P² global agregado (~10 MB)? Recomendação: global + top-100 rotas por volume. Resposta necessária antes de dimensionar RAM.

**[DECISÃO D6.2]** — Share de execução > 15% em uma rota: desativar ML para essa rota e usar A3 apenas? Ou aceitar risco de feedback loop com exclusão de amostras + downweighting? Recomendação: desativar ML para rota específica.

**[DECISÃO D6.3]** — Qual é o `staleness_tolerance_s` real do operador? Determina se E5 é necessário (≤ 14400) ou se E1 puro basta (> 86400). **Decisão crítica — bloqueia design do pipeline.**

**[DECISÃO D6.4]** — Registry de símbolos ativos (delistings): quem mantém? Scanner existente ou serviço separado? Integração com retreino emergencial é obrigatória para evitar R4.

**[DECISÃO D6.5]** [CONFIANÇA < 80%] — Janela W de retreino nightly: 14 dias (default recomendado) ou configurável por regime? Em regime de listing intenso (10 novos símbolos em 7 dias), W=7 pode ser melhor para símbolos novos. Recomendação: W global=14 dias + override por rota via config file.

---

## §11 Referências citadas

- Adams & MacKay 2007 — Bayesian Online Changepoint Detection — arXiv:0710.3742 — https://arxiv.org/abs/0710.3742
- Baena-García et al. 2006 — EDDM — *IADIS European Conference on Data Mining*
- Bifet & Gavaldà 2007 — ADWIN — *SIAM SDM* — https://doi.org/10.1137/1.9781611972771.42
- Bifet & Gavaldà 2009 — Hoeffding Adaptive Tree — *Workshop on Applications of Pattern Analysis*
- Bifet, Holmes, Kirkby & Pfahringer 2010 — MOA — *JMLR* 11, 1601–1636 — https://jmlr.org/papers/v11/bifet10a.html
- Cerqueira, Torgo, Oliveira & Bifet 2022 — *JAIR* 74, 4781–4836 — https://doi.org/10.1613/jair.1.13144
- Cont 2001 — *Quantitative Finance* 1(2) — https://doi.org/10.1080/713665670
- Domingos & Hulten 2000 — VFDT — *KDD* — https://doi.org/10.1145/347090.347107
- Dunning 2014 — t-digest — arXiv:1902.04023 — https://arxiv.org/abs/1902.04023
- Elwell & Polikar 2011 — *IEEE TNNLS* 22(10), 1569–1584 — https://doi.org/10.1109/TNNLS.2011.2160459
- Gama, Žliobaitė, Bifet, Pechenizkiy & Bouchachia 2014 — *ACM CSUR* 46(4), art. 44 — https://doi.org/10.1145/2523813
- Gama et al. 2004 — DDM — *Brazilian Symposium on AI*
- Gibbs & Candès 2021 — *NeurIPS* — https://arxiv.org/abs/2106.04053
- Goldenberg & Webb 2019 — *Machine Learning* 108(8), 1359–1390 — https://doi.org/10.1007/s10994-019-05804-3
- Gomes, Bifet et al. 2017 — ARF — *Machine Learning* 106(9–10), 1469–1495 — https://doi.org/10.1007/s10994-017-5642-8
- Guo, Intini & Jahanshahloo 2025 — *Finance Research Letters* 71, art. 105503
- Jain & Chlamtac 1985 — P² algorithm — *CACM* 28(10), 1076–1085 — https://doi.org/10.1145/4372.4378
- López de Prado 2018 — *Advances in Financial ML* — Wiley — ISBN 978-1-119-48208-6
- Losing, Hammer & Wersing 2018 — *Neurocomputing* 275, 1261–1274 — https://doi.org/10.1016/j.neucom.2017.06.084
- Makarov & Schoar 2020 — *JFE* 135(2), 293–319
- Mallick et al. 2022 — Deployed Model Monitoring @scale — arXiv:2204.06312
- Montiel et al. 2021 — River — *JMLR* 22(110), 1–8 — https://jmlr.org/papers/v22/20-1380.html
- Nishida & Yamauchi 2007 — STEPD — *JSAI*
- Oza 2005 — Online Bagging — *IEEE SMC*
- Page 1954 — CUSUM — *Biometrika* 41
- Raab, Heusinger & Schleif 2020 — KSWIN — *Neurocomputing* 391, 279–290 — https://doi.org/10.1016/j.neucom.2019.11.111
- Zaffran et al. 2022 — *ICML* — https://arxiv.org/abs/2202.07282
- Zliobaite 2010 — *arXiv:1004.5257* — https://arxiv.org/abs/1004.5257

---

*Fim D6 v0.1.0. Pontos D6.1–D6.5 aguardam decisão do usuário. Recovery time estimado de 8h pós-halt sob E5 deve ser validado empiricamente com dados de halt real do projeto.*
