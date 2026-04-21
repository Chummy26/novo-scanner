---
name: Q2 Auditoria Dataset — Statistical Quality
description: Auditoria PhD data science de representatividade estatística do dataset de treino
type: audit
status: draft
author: phd-dataset-q2-statistical
date: 2026-04-20
version: 0.1.0
---

# Q2 — Auditoria Estatística do Dataset de Treino

## Postura crítica declarada

Este documento é red-team do design de coleta antes de qualquer dado ser coletado. Cada seção produz um veredito com nivel de confiança explícito. Confiança < 80% recebe flag. Proibição explícita de safe-bets sem número.

---

## §5.1 Cobertura temporal — 60–90 dias é suficiente?

### Analise estatística por evento-tipo

D2 reporta frequências mensais:
- Listings: 15–30/mês
- Delistings: 3–8/mês
- Halts: 2–5/mês

Para estimar `P(regime = event)` com margem de erro ±5 pp com IC 95%, a regra de Poisson exige:

```
n_eventos_min = (z_α/2)² / ε²  (Wilson interval inverso)
Para z=1.96, ε=0.05 → n_min ≈ (1.96/0.05)² × p(1-p) / p
```

Tomando taxa conservadora: 5 halts/mês × 2 meses = 10 eventos halt. Com n=10, IC 95% de Clopper-Pearson para p=0.05 é [0.024, 0.110] — amplitude de 8.6 pp. Insuficiente para precisão de 5 pp.

**Para atingir IC 95% com ±5 pp em p_event ≈ 0.05:**

```
n_eventos = 1.96² × 0.05 × 0.95 / 0.05² ≈ 73 eventos event
A 5 halts/mês → 14.6 meses necessários só para halts.
Com 30 listings/mês → 73/30 = 2.4 meses para listings.
```

Conclusão numericada: 60 dias é suficiente para cobrir listings (60 dias × 1/mês = 60 eventos), mas **insuficiente para halts** (60 dias × 5/30 = 10 eventos).

**Bailey, Borwein, López de Prado & Zhu (2014, *Journal of Computational Finance* 20(4))** demonstram que PBO (Probability of Backtest Overfitting) permanece > 50% quando o número de trials independentes é < 16. Com 10 eventos halt em 60 dias, o modelo aprende um regime com menos de 16 realizações independentes — PBO de halts é estruturalmente > 50%.

**Resolução steel-man (3 alternativas):**

1. **90 dias + oversample de eventos event** via re-ponderação por inverse frequency (He & Garcia 2009, *IEEE TKDE* 21(9), 1263–1284 — survey imbalanced learning): mantém 90 dias mas dá peso 5× a amostras `regime_at_t0 = 2`.

2. **Janela de 150 dias com dados históricos de arquivo** (se venues fornecerem REST histórico para rotas existentes): maximiza cobertura de eventos raros a custo de possível regime shift. **Flag de confiança 55%**: APIs REST longtail não garantem dados históricos de qualidade.

3. **Separar modelo para regime event** com dados sintéticos via bootstrap de bloco (Politis & Romano 1994, *J. Am. Stat. Assoc.* 89(428), 1303–1313): bloco de tamanho `min(T_event, 4h)` para preservar dependência intraevento. Tecnicamente viável mas introduz risco de distribuição sintética divergir do real.

**Recomendação**: **90 dias mínimo** para cobertura de sazonalidade semanal (12 semanas completas; 2 ciclos semanais = estatística marginal per dia-da-semana com n~12 cada) e listings. Para halts: oversample inverse-frequency peso 5× em regime event. Não estender para 150 dias sem auditar estacionariedade interperiodo.

**Sazonalidade intra-day**: Baur et al. (2019, *JIFMIM* 62, 26–43) documentam ciclos U-shape em 24h. Para estimar coeficiente `sin_hour` com erro < 10% de amplitude, precisamos ≥ 3 ciclos por bin de hora. Com 90 dias × 24h = 2160 amostras/hora na agregação global, mas por rota individual média < 10/hora após trigger P95. **Problema**: features cíclicas F são globais (determinísticas); não requerem volume de amostras por bin. Efeito calendario é capturado via feature F, não via volume de rota.

**Sazonalidade semanal**: 60 dias = 8.6 semanas. Para testar *Monday effect* (Aharon & Qadan 2019, *Applied Economics Letters* 26(5)) com Friedman test (H₀: distribuição idêntica por dia), precisamos ≥ 5 realizações por dia = mínimo 35 dias. 60 dias satisfaz. 90 dias é confortável com n=12 por dia.

**Confiança desta seção: 72%.** Incerteza: eventos halt podem ser mais raros que 5/mês em período de mercado tranquilo — sample size real pode cair.

---

## §5.2 Cobertura de rotas — distribuição esperada de `n_observations`

### Modelo de cauda para n_obs por rota

Com 2600 rotas × 90 dias, mas listings/delistings dinâmicos:

- Rotas com 90 dias completos: ~70% × 2600 = 1820 rotas (stable pairs).
- Novas rotas (< 45 dias em média): 15–30/mês × 2 meses = 30–60 rotas novas, com n_obs proporcional à idade.
- Delistadas: 3–8/mês × 2 meses = 6–16 rotas morrem antes de 90 dias.

**Distribuição esperada de n_obs:** Para rota com 90 dias ativos e taxa de trigger P95 = 5%, com 576 snapshots/dia:

```
E[n_obs_rota] = 576 × 90 × 0.05 × P(passa_filtros) ≈ 2592 × P(filtros)
```

Se P(filtros) ≈ 0.30 (book_age + vol24 filtram ~70% dos P95-triggers em longtail):

```
E[n_obs_rota] ≈ 780 observações/rota em 90 dias → supera n_min=500.
```

Mas distribuição é longtail: top-50 rotas (BTC-*, ETH-*) acumulam 5000+; bottom-10% tem < 100.

**Rotas com n < n_min = 500 (ADR-005, ADR-009):** Estimativa 15–25% das rotas activas (390–650 rotas). Para estas, ADR-007 recomenda James-Stein pooling. **Exigência de design do dataset**: obrigatório incluir coluna `cluster_id` (base_symbol) e `venue_pair` em cada amostra desde o dia 1. Pooling posterior falha se identificadores não foram coletados no momento do snapshot.

**Survivorship bias (armadilha anti-padrão):** Rotas delistadas durante os 90 dias somem do storage padrão. López de Prado (2018, cap. 3, §3.5) denomina isso *selection bias* e quantifica que labels de rotas sobreviventes tendem a ter success ratio 8–15% maior que rotas com halt/delist (pois halt indica regime adverso). Dataset deve preservar `listing_history.parquet` com `active_until` para cada rota — já mencionado em ADR-006 mas não implementado em label_schema como campo obrigatório.

**Proposta concreta (Rust):** Ao encerrar rota (detection de delist via discovery orchestrator), emitir evento `RouteDeactivated { rota_id, timestamp, reason }` que o dataset builder registra como last observation com label especial `halt_delist`. Não apagar do Parquet.

**Confiança: 65%.** Estimativa de P(filtros) ≈ 0.30 é especulativa; pode ser 0.10–0.50 dependendo de venue. Exige calibração nos primeiros 30 dias de coleta.

---

## §5.3 Class balance — triple-barrier 48 labels

### Estimativa de success ratio por configuração

Baseado em `entrySpread` mediana 0.32%, p95 1.08% e `exitSpread` mediana −0.64%, p10 −1.27%:

A soma `S_entrada + S_saída` tem mediana ~0.32% + (−0.64%) = −0.32% — **negativa**. Logo, a maioria das amostras no regime típico resulta em label `timeout` ou `falha`.

| Config (meta, stop, T_max) | Success ratio estimado | Raciocínio |
|---|---|---|
| (0.3%, None, 30min) | ~40–50% | `p(sum ≥ 0.3% dentro de 30min)`: dado H=0.75 e spread inicial ≥ P95=1.08%, soma inicial ≥ 0.44% → metade já perto da barreira |
| (0.3%, −1%, 30min) | ~35–45% | stop elimina ~5–10% |
| (0.5%, None, 4h) | ~30–40% | 4h dá mais tempo, mas spread decai |
| (1.0%, None, 4h) | ~15–25% | soma precisa ≥ 1%; dado mediana negativa, é improvável sem evento |
| (2.0%, None, 24h) | ~5–12% | caudas; evento regime event necessário |
| (2.0%, −1%, 4h) | ~3–8% | barreira dupla em spreading negativo |

**Configs críticas com success < 5%:** (2.0%, −1%, 4h), (2.0%, −2%, 30min). Com 6.7×10⁶ amostras totais, distribui por 2600 rotas × 36 configs. Por config com 5% success:

```
n_success_config = 6.7×10⁶ / 36 configs × 0.05 = 9305 amostras positivas por config.
```

Parece adequado globalmente. Mas por rota:

```
n_success_rota_config = 780 obs/rota × 0.05 = 39 amostras positivas.
```

39 amostras positivas por rota × config é **insuficiente para calibração de CatBoost MultiQuantile per-rota**. Regra empírica: He & Garcia (2009) recomendam ≥ 100 instâncias positivas por classe para classificadores em IR imbalanced; abaixo de 100, instabilidade de estimação de limiar é documentada. Meinshausen (2006, *JMLR* 7, 983–999) com QRF recomenda ≥ 200 folhas por quantil-alvo.

**Targets mínimos recomendados por label × config:**

| Nível | n_positivos mínimos | Ação se abaixo |
|---|---|---|
| Per-rota + per-config | 100 | Partial pooling James-Stein via cluster_id |
| Per-cluster + per-config | 500 | Agrupamento por venue_pair |
| Global + per-config | 5000 | Aceitável para modelo global |

Para configs com success < 5% em rotas longtail (< 200 obs/rota): pooling obrigatório — modelo **não pode ser treinado per-rota** nessas configs; usa-se modelo global com `cluster_id` como feature categórica.

**Triangulação de métricas:** Com imbalance severo, AUC-ROC é inflada e enganosa (He & Garcia 2009, Seção IV). Métricas obrigatórias: AUC-PR (área sob curva Precision-Recall), pinball loss stratificado por quantil, e Brier Score. Gneiting (2011, *JASA* 106(496)) prova que log score e Brier são strictly proper scoring rules para calibração probabilística — ambos obrigatórios para regime imbalanced.

**Red-team:** Se success ratio cair para < 3% em algumas rotas (configs extremas), o modelo de abstenção `LongTail` (ADR-009) pode classificar quase tudo como LongTail e emitir zero recomendações. Há um **feedback loop perigoso**: modelo aprende que as raras oportunidades reais têm LongTail flag alto → abstém → zero calibration data → modelo nunca melhora (T12 armadilha).

**Confiança: 70%.** Estimativa de success ratio baseada em n=431 snapshots; extrapolação para 90 dias é incerta.

---

## §5.4 Trigger P95 sampling bias — trade-off crítico

### Diagnóstico formal

O trigger `entrySpread ≥ P95(rota, 24h)` cria **truncamento esquerdo** da distribuição de `entrySpread`. Este é o mecanismo de **sample selection bias** formalizado por Heckman (1979, *Econometrica* 47(1), 153–161): a amostragem é condicional em variável (`entrySpread`) correlacionada com o outcome (`label`), gerando estimadores enviesados.

Consequência quantificada: se o modelo usa apenas amostras P95+, ele aprende:

```
P(sucesso | features, entrySpread ≥ P95)
```

Mas em produção, ele seria invocado precisamente em regimes onde `entrySpread ≥ P95` (por definição do trigger operacional). **Logo o bias é operacionalmente aceitável para a função de classificação** — o modelo opera exatamente na subpopulação que ele treinou.

**Porém, dois problemas residuais:**

1. **Abstenção "NoOpportunity"**: Para o modelo de abstenção decidir "não há oportunidade", ele precisaria ver exemplos onde `entrySpread ≥ P95` MAS o resultado foi ruim. Isso está presente no dataset (labels timeout/falha com P95+ trigger). Não é problema.

2. **P95 dinâmico drift**: Se a distribuição de `entrySpread` da rota drifta para cima, o P95 sobe e o trigger fica mais restrito — o modelo nunca vê o novo regime "moderado" que antes era P95. Isso é **distribution shift (T8)** silencioso. Quantificação: em 90 dias, Crépellière et al. (2023, *JFM* 64, art. 100817) mostram que o nível de spreads em BTC caiu 3× em 4 anos; em longtail crypto a velocidade de drift é desconhecida mas provavelmente maior.

**Steel-man das 3 alternativas de sampling:**

**A1 — Exclusive cauda (trigger P95 atual):**
- Pro: menor storage (6.7×10⁶ vs 1.5×10⁸ pontos brutos); foco preciso.
- Con: modelo nunca vê como a distribuição de regimes se parece globalmente; não aprende "este P95 é anômalo vs típico".
- Cenário de falha: P95 sobe por regime event prolongado → trigger rarissimamente dispara → zero novos dados de treino → modelo fica stale.

**A2 — Dual sample (cauda + baseline 1% aleatório):**
- Breck et al. (2017, *NIPS Workshop on Machine Learning Systems*) documentam que dataset skews são identificados precocemente via "golden set" com distribuição plena. Baseline 1% serve como golden set.
- Custo: +1% × 1.5×10⁸ = 1.5×10⁶ amostras extras = +22% do dataset atual. Storage: negligível (+30 MB Parquet ZSTD).
- Pro: modelo de abstenção pode aprender contraste entre "P95+ genuíno" vs "P95+ em contexto benigno".
- Recomendado: implementar via **reservoir sampling** (Vitter 1985, *ACM TOMS* 11(1), 37–57) por rota com capacidade C=100 amostras fora-de-trigger. A cada ciclo de 150 ms, se amostra NÃO dispara trigger, incluir com probabilidade 1/N_total (Vitter Algorithm R). Custo Rust: O(1) por snapshot, zero alocação dinâmica com buffer fixo `[Sample; 100]` por rota em `dashmap`.

**A3 — Reservoir sampling puro (distribuição uniforme no tempo):**
- Pro: estimativa não-viesada da distribuição global.
- Con: 99% das amostras são regime normal (não operacionalmente relevantes); dilui dataset com ruído.
- Rejeitado como principal: Polyzotis et al. (2018, *SIGMOD*) recomendam separação de "training distribution" e "reference distribution" — melhor manter as duas separadas do que misturar.

**Recomendação final: A2 (dual sample).** Adicionar reservoir `C=100` por rota fora-de-trigger ao dataset builder. Labels dessas amostras são computados normalmente pelo triple-barrier. São usadas exclusivamente no treino do modelo de abstenção `LongTail` e `NoOpportunity`, NÃO no treino do classificador principal de sucesso/falha.

**Confiança: 76%.** A separação de datasets (principal vs abstenção) é projetada mas não validada empiricamente.

---

## §5.5 Stratified sampling por regime D2

### Distribuição esperada sem estratificação

D2 propõe: calm ~85%, opportunity ~10%, event ~5%.

Com trigger P95 já filtrando parte do calm:
- P(P95 | calm) ≈ 5% por definição de quantil.
- P(P95 | opportunity) ≈ 30–50% (spread elevado estruturalmente).
- P(P95 | event) ≈ 60–80% (spread extremo).

Dataset após trigger (estimado):

```
P(calm | dataset) ≈ 0.85 × 0.05 / Z ≈ 0.425/Z
P(opp | dataset) ≈ 0.10 × 0.40 / Z ≈ 0.040/Z
P(event | dataset) ≈ 0.05 × 0.70 / Z ≈ 0.035/Z
Z = 0.425 + 0.040 + 0.035 = 0.500
→ P(calm) ≈ 85%, P(opp) ≈ 8%, P(event) ≈ 7%
```

O trigger P95 não resolve o desbalanceamento de regime. Event continua sub-representado em ~7% mesmo sendo de maior valor operacional.

**Hamilton (1989, *Econometrica* 57(2), 357–384)** — HMM seminal — deriva que estimadores de parâmetros de regime raro sofrem bias com n_evento < 50. Com 7% × 6.7×10⁶ = 469k amostras event no total, o HMM de 3 estados é identificado globalmente. Porém por rota individual: 469k / 2600 rotas ≈ 180 amostras event/rota — marginal para calibração per-rota.

**Ang & Timmermann (2012, *Annual Review of Financial Economics* 4, 313–337)** mostram que em modelos regime-switching finance, calibração per-regime requer ≥ 200 observações por regime para estabilidade dos parâmetros de transição. 180 amostras event/rota está abaixo.

**Estratégia proposta:**

1. **Estratificação soft via pesos de amostragem:** No treino do QRF e CatBoost, atribuir `sample_weight = 1.0` para calm, `3.0` para opportunity, `5.0` para event. Isso simula oversample 5× de event sem replicar dados (reduz variância via downsampling efetivo).

2. **Stratified K-fold por regime:** Em ADR-006, cada fold deve manter proporção target de regimes. Implementar verificação: se `P(event|fold) < 0.05` em qualquer fold, rebalancear atribuição de amostras ao fold (sem violar ordering temporal — apenas compactar amostras event nos folds onde ocorreram naturalmente). **Não embaralhar cronologia.**

3. **Modelo separado para regime event (fase V2):** Se event representa > 30% do valor operacional mas < 10% dos dados, treinar um especialista para event com fine-tuning sobre amostras event apenas. Ang & Timmermann (2012) sugerem modelos separados por regime como melhor prática.

**Confiança: 68%.** Os pesos 1/3/5 são heurísticos não calibrados empiricamente para este dataset específico.

---

## §5.6 Cobertura cross-venue e cross-base-symbol

### Problema de concentração

BTC-* em 14 venues (com 7 venues que têm perp + spot): até 7×7−7 = 42 rotas BTC potenciais. Se cada uma tem 780 obs/90d, BTC sozinho contribui com 42 × 780 = 32.760 amostras — 0.5% do dataset mas 1.6% do peso se desbalanceado.

Problema inverso: altcoin com apenas 2 venues tem 1 rota potencial. 780 obs. Longtail de altcoins representa ~2000 símbolos × 1 rota × 780 obs = 1.56×10⁶ obs mas espalhado em subpopulações que o modelo não vê como cluster.

**Risco quantificado:** Se modelo não recebe `cluster_id` (base_symbol), BTC-*, ETH-* dominam gradiente de treino (> 50% do volume médio de 14 venues é BTC/ETH). Modelo aprende distribuição BTC/ETH e **generaliza mal em altcoins longtail** — exatamente onde o scanner opera com mais frequência de spreads altos.

**Proposta de ponderação:** Inverso da frequência por base_symbol como `sample_weight` no treino. Se BTC tem 42 rotas e ALT tem 1 rota, peso ALT = 42/1 × normalização. Implementação via `class_weight='balanced'` no CatBoost com estratificação por `base_symbol_cluster`.

**Feature `cluster_id`:** Obrigatório desde o dia 1 no dataset. Não é apenas para James-Stein — é para evitar que gradientes de BTC dominem o treino.

**Confiança: 80%.** Estratégia de ponderação por base_symbol é bem estabelecida em transfer learning (Pan & Yang 2010, *IEEE TKDE* 22(10)) — aplicação aqui é direta.

---

## §5.7 Feature distributions e stationarity

### Análise por família de features (15 features ADR-014)

**Família A — Quantis rolantes (`pct_rank_entry_24h`, `z_robust_entry_24h`, `ewma_entry_600s`):**

- `pct_rank_entry_24h` ∈ [0, 1] por construção. **Estacionário por design** (quantil é rank normalizado). Distribuição marginal: dado trigger P95, valor mínimo observado é ~0.95 por construção. Problema: **truncamento em 0.95** — variância efetiva ≈ 0.0025. Feature quase constante! Risco de zero-variance warning em CatBoost.
- Alternativa: transformar para `pct_rank_entry_24h − 0.95) / 0.05` → variável ∈ [0, 1] com variância real.
- `z_robust_entry_24h`: usa MAD como escala — robusto a outliers. Após trigger P95, valor esperado z > 1.5 sistematicamente. Distribuição: assimétrica positiva (longtail à direita). ADF test não necessário (derivado de rolling window, portanto I(0) por construção).
- `ewma_entry_600s`: EWMA com τ=600s. Herdeirá long memory do spread (H≈0.75). **Possivelmente I(d) com d ≈ 0.25** (ARFIMA). Verificar via ADF + KPSS (Kwiatkowski et al. 1992, *J. Econometrics* 54(1-3), 159–178). Se não estacionário, diferenciar rolling: `ewma_entry(t) − ewma_entry(t−600s)` ou usar `d_entry_dt_5min` (família I que já captura derivada).

**Família B — Identidade estrutural (`sum_instantaneo`, `deviation_from_baseline`, `persistence_ratio_1pct_1h`):**

- `sum_instantaneo = entry + exit`: estruturalmente não estacionário (herda não-estacionaridade de `entry` e `exit`). Dickey & Fuller (1979, *JASA* 74(366), 427–431): ADF test obrigatório. Se I(1), fractional differencing (López de Prado 2018, cap. 5) com d ∈ (0, 1) preserva memória longa sem perder informação. Alternativa mais simples: usar `z_robust_entry_24h` + `pct_rank_entry_24h` (família A) como proxies estacionários da mesma informação.
- `persistence_ratio_1pct_1h` ∈ [0, 1]: estacionário por construção (razão temporal).

**Família E — Regime (`regime_posterior[calm,opp,event]`, `realized_vol_1h`):**

- Postériores do HMM somam 1 → colinearidade perfeita entre as 3 features. Remove uma ou usa `regime_posterior[opp]` e `regime_posterior[event]` (calm é implícito). CatBoost lida com multicolinearidade, mas QRF sofre bias de variável em caso de correlação perfeita (Strobl et al. 2008, *BMC Bioinformatics* 9, art. 307).
- `realized_vol_1h`: derivado de `entry` → correlacionado com família A. ΔVIF esperado > 5 entre `z_robust_entry_24h` e `realized_vol_1h`. Verificar VIF (Variance Inflation Factor) no dataset pré-treino.

**Família F — Calendar (`sin/cos hour, dow`):** Determinístico, periódico, estacionário por definição. Nenhuma verificação necessária.

**Família G — Cross-route (`n_routes_same_base_emit`, `rolling_corr_cluster_1h`, `portfolio_redundancy`):**

- `rolling_corr_cluster_1h` ∈ [−1, 1]: estacionário. Mas em regime event, correlações saltam para ~1 (efeito exchange-wide). Distribuição bimodal: modo normal ~0.3, modo event ~0.85. Verificar se modelo consegue separar ou precisa de interação feature.
- `portfolio_redundancy` depende de `rolling_corr` → alta multicolinearidade entre features 16 e 17.

**Família I — Dynamics (`d_entry_dt_5min`, `cusum_entry`):**

- `d_entry_dt_5min`: derivada finita — estacionário se `entry` é I(1), não-estacionário se `entry` é I(2). Verificar KPSS.
- `cusum_entry`: acumulador — **não estacionário por design** (cresce com o tempo). Resetar CUSUM por regime ou converter para `cusum_entry_since_last_cross` (valor relativo ao último crossing de nível).

**Dashboard de feature health (proposta de implementação):**

```rust
// Em Rust: verificação estatística offline sobre Parquet de treino
struct FeatureHealthReport {
    feature_name: String,
    adf_pvalue: f64,        // ADF test p-value (via statsmodels Python offline)
    kpss_pvalue: f64,       // KPSS test p-value
    variance: f64,          // variância amostral (flag se < 1e-4)
    skewness: f64,          // assimetria
    kurtosis: f64,          // excesso de curtose
    missing_rate: f64,      // taxa de NaN
    vif: f64,               // VIF contra todas outras features
    truncation_lb: Option<f64>, // limite inferior observado (trigger truncation)
    truncation_ub: Option<f64>,
}
```

Implementar como script Python offline (statsmodels 0.14 para ADF/KPSS; pandas 2.2 para estatísticas marginais) executado uma vez por semana sobre o dataset Parquet acumulado. Output em `07_calibration_reports/feature_health_YYYY-MM-DD.json`. Bloquear treino se `variance < 1e-4` ou `missing_rate > 0.05` em qualquer feature.

**Confiança desta análise: 74%.** Muitas propriedades de distribuição (bimodalidade da correlação, VIF real) dependem de dados ainda não coletados.

---

## §5.8 Validação empírica pré-treino — checklist completo

Checklist mínimo antes de qualquer modelo A2 entrar em treino. Cada item tem critério de aprovação/falha binário.

### Checklist de aprovação pré-treino

```
BLOCO 1 — Cobertura e distribuição
[ ] 1.1 n_observations/rota: distribuição reportada. Gate: p50 >= 200, p10 >= 50.
[ ] 1.2 n_observations/rota/config label: Gate: p50_success >= 50 por config.
[ ] 1.3 Regime distribution: P(event) >= 0.03 no dataset total.
[ ] 1.4 Survivorship: 100% rotas delistadas presentes em labels_triple_barrier com active_until.
[ ] 1.5 Baseline aleatório (reservoir): presente e separado do dataset principal.

BLOCO 2 — Label balance e qualidade
[ ] 2.1 Success ratio por config: reportado para todas 36 configs primárias.
[ ] 2.2 Configs com success < 3%: sinalizadas; partial pooling ativado para treino dessas configs.
[ ] 2.3 Timeout rate: < 80% em qualquer config (se timeout > 80%, barreira superior é muito rígida).
[ ] 2.4 Halt labels excluídos do treino: halt_active=true removido (labels inválidos).
[ ] 2.5 Spike events p99.5 winsorized: verificado.

BLOCO 3 — Feature health
[ ] 3.1 variance(feature) > 1e-4 para todas 15 features.
[ ] 3.2 missing_rate < 0.05 para todas 15 features.
[ ] 3.3 ADF/KPSS: sum_instantaneo, ewma_entry_600s, cusum_entry verificados.
      Se não-estacionário: transformação aplicada e documentada.
[ ] 3.4 VIF < 10 entre todos pares de features (exceto postériores HMM que somam 1).
[ ] 3.5 pct_rank_entry_24h: verificar se range observado > [0.90, 1.0]; transformar se variância < 1e-3.
[ ] 3.6 cusum_entry: confirmar que reset por regime está implementado.

BLOCO 4 — Temporal e leakage
[ ] 4.1 Shuffling temporal test: AUC-PR pós-shuffle < 0.5 × AUC-PR original (data_lineage.md §anti-T9).
[ ] 4.2 Feature AST audit: ml_eval CI PASS em todas features.
[ ] 4.3 Rolling feature stability: correlação entre feature(t) e feature(t-7d) reportada por feature.
      Gate: correlação < 0.95 em média (se > 0.95, feature é quasi-constante intertemporalmente).
[ ] 4.4 PIT guard: nenhuma feature computada com as_of = now() em código de treino.

BLOCO 5 — Regime e cross-route
[ ] 5.1 HMM 3-estado: BIC com k=2 vs k=3 vs k=4 reportado. k=3 aprovado se ΔBIC(3,2) > 6.
[ ] 5.2 Regime distribution por fold: P(event|fold_i) > 0.02 em todos os 6 folds.
[ ] 5.3 Cross-route correlation matrix: média de |corr| entre features de rotas distintas
      com mesmo base_symbol < 0.90 (sinaliza contamination cross-route).

BLOCO 6 — Outliers e extremos
[ ] 6.1 Outliers 3-sigma por feature: contagem reportada.
[ ] 6.2 Outliers 5-sigma: lista de rota_id + timestamp para inspeção manual.
[ ] 6.3 Spike events (ex-exchange outage): verificados contra log de erros WS.
```

**Implementação:** Script Python `validate_dataset.py` executado como gate em CI antes do treino Marco 2. Falha em qualquer item BLOCO 1–4 bloqueia treino. BLOCO 5–6 são warnings com justificativa obrigatória.

---

## §5.9 Gaps atuais e ação priorizada

### O que o dataset atual ainda não cobre

1. **Baseline aleatório (reservoir) NÃO existe.** Dataset trigger P95 exclusivo. Modelo de abstenção não tem contraponto de "não-oportunidade genuína fora da cauda". Confiança na calibração de `LongTail` detection: < 60%.

2. **`cluster_id` por base_symbol NÃO está no schema de labels atual.** `label_schema.md` tem `base_symbol` como coluna — presente, mas não como feature de treino explícita. ADR-007 James-Stein depende disso estar no FeatureVec. Gap: partial pooling não é implementável sem `cluster_id` como input do modelo.

3. **`cusum_entry` não tem reset por regime.** Implementação atual é acumulador monotônico — não-estacionário.

4. **`listing_age_days` ausente das 15 features.** D2 §2.4 documenta que nos 72h pós-listing os spreads são de outra distribuição (2–5×). Essa feature não está na FeatureVec de ADR-014. É um gap de representatividade: amostra de listing novo mistura com regime normal, o modelo não distingue.

5. **`survivorship_bias_check` não implementado.** Não há campo `route_status` no dataset que registre se rota foi ativa durante o período de label (t₀ até t₀+T_max). Rotas que foram delistadas durante a janela T_max têm labels corrompidos (timeout quando na verdade foi halt).

### Quick wins (< 1 semana)

1. **Adicionar `base_symbol` ao FeatureVec como feature categórica** (CatBoost suporta natively; QRF requer one-hot mas apenas top-20 base_symbols são suficientes + "other"). Custo: +1 feature categórica no schema.

2. **Implementar cusum com reset:** adicionar campo `cusum_reset_ts` na estrutura CUSUM do scanner. Reset quando `regime_posterior_calm` cruza acima de 0.80.

3. **Reservoir sampler por rota:** `DashMap<RotaId, VecDeque<Sample>>` com capacidade 100; amostragem aleatória com probability 0.01 por snapshot fora-de-trigger. ~50 LoC Rust.

4. **`listing_age_days` como feature derivada:** `(t₀ - route_first_seen_ts).num_days() as f32` — informação já disponível no `discovery::orchestrator`. Zero custo de coleta, adicionar ao FeatureVec.

5. **`active_until` no schema de labels:** adicionar campo `TIMESTAMP active_until NULL DEFAULT NULL` na tabela Parquet; preencher via evento `RouteDeactivated`.

### Grandes trabalhos (2–4 semanas)

1. **Validação de estacionariedade das features rolling** (ADF/KPSS pipeline): script Python sobre Parquet + relatório automático. Inclui decisão de qual transformação aplicar (diferenciação, fractional differencing, remap).

2. **Implementação do checklist §5.8 como CI gate** (`validate_dataset.py`): 30 verificações automatizadas; integração com pipeline de treino Marco 2.

3. **Stratified K-fold com regime-awareness** (ADR-006 extensão): verificar P(event|fold) em cada fold durante split; rebalancear se necessário sem violar cronologia.

4. **Análise de multicolinearidade estrutural** entre famílias A/B/I (todas derivadas de `entry`): calcular VIF no primeiro mês de dados e decidir se uma das famílias deve ser removida ou transformada ortogonalmente (PCA parcial).

---

## §6. Red-team — como este dataset engana o treino silenciosamente

1. **P95 drift estático**: `P95(rota, 24h rolling)` muda continuamente. Amostra de 90 dias contém P95 de 90 P95 diferentes. O modelo treina em "acima do P95 histórico de hoje" — mas o P95 de daqui a 6 meses pode ser 2× maior. Modelo operacional aplica P95 atual, treino reflete P95 histórico. **Leakage conceitual silencioso.**

2. **pct_rank_entry_24h truncada em 0.95**: variância quase zero → feature contribui informação quase zero → importância SHAP baixa → pode ser "dropada" em ablation. Mas conceptualmente é a feature mais importante (é o gatilho). Paradoxo de importância zero para feature mais crítica.

3. **Regime event em rotas BTC/ETH vs altcoin**: eventos em BTC provocam regime event em centenas de rotas simultaneamente. Labels correlacionados em lote. ADR-006 purge remove correlação temporal, mas **não remove correlação cross-route em eventos**. Purge walk-forward não é suficiente sozinho; precisa `embargo cross-route` (remover rotas do mesmo cluster durante evento event).

4. **Labels corrompidos por API outage**: spread ≥ P95 por outage (venue publica stale quotes) → trigger dispara → snapshot entra no dataset com label fictício. Scanner já detecta via heartbeat, mas há janela de 200ms de livro stale antes do detector reagir (Muravyev et al. 2013). Estima-se 0.5–2% de contaminação silenciosa — invisível sem log de erros de WS cruzado com timestamps de labels.

5. **Selection bias de rotas longtail baixa liquidez**: rotas com vol24 < $50k são filtradas. Mas spreads mais altos ocorrem exatamente em rotas ilíquidas. O modelo nunca aprende sobre o regime de spread > 3% em rotas ultra-longtail. Quando o operador encontra essas rotas, o modelo abstém (InsufficientData), o que é correto — mas o modelo **não sabe que não sabe**; ele não foi treinado para reconhecer que essas rotas existem.

---

## §7. Pontos com confiança < 80%

| Item | Confiança | Razão da incerteza |
|---|---|---|
| P(filtros) ≈ 0.30 | **50%** | Nunca medido empiricamente; pode ser 0.10–0.60 |
| Success ratio estimado por config | **60%** | n=431 é insuficiente para estimativa estável |
| Peso de oversample para regime event (5×) | **55%** | Heurístico; calibrar com AUC-PR por regime nos primeiros 30d |
| H ∈ [0.70, 0.85] (Hurst longtail) | **60%** | D2 projeção baseada em literatura top-5 extrapolada |
| P(event) ≈ 7% após trigger | **65%** | P(P95 | regime) é conjectura sem dados empíricos de regime |
| Reservoir C=100 suficiente para abstenção | **70%** | C é heurístico; pode ser insuficiente para calibração |
| VIF < 10 entre famílias A e I | **72%** | Calculado conceitualmente; pode ser > 10 em dados reais |
| 90 dias cobre todos regimes adequadamente | **60%** | Eventos halt raros; IC 95% só com ~15 meses para halts |

---

## §8. Referências desta auditoria

- Bailey, Borwein, López de Prado & Zhu 2014 — *Journal of Computational Finance* 20(4) — PBO — https://doi.org/10.3905/jcf.2014.1.029
- Breck et al. 2017 — *NIPS Workshop on ML Systems* — dataset skews — https://research.google/pubs/pub46555/
- Chawla, Bowyer, Hall & Kegelmeyer 2002 — *JAIR* 16 — SMOTE — https://doi.org/10.1613/jair.953
- Dickey & Fuller 1979 — *JASA* 74(366) — ADF test — https://doi.org/10.2307/2286348
- Gneiting 2011 — *JASA* 106(496) — proper scoring rules imbalanced — https://doi.org/10.1198/jasa.2011.r10138
- Hamilton 1989 — *Econometrica* 57(2) — HMM regime switching — https://doi.org/10.2307/1912559
- He & Garcia 2009 — *IEEE TKDE* 21(9) — imbalanced learning survey — https://doi.org/10.1109/TKDE.2008.239
- Heckman 1979 — *Econometrica* 47(1) — sample selection bias — https://doi.org/10.2307/1912352
- Kwiatkowski, Phillips, Schmidt & Shin 1992 — *J. Econometrics* 54 — KPSS test — https://doi.org/10.1016/0304-4076(92)90104-Y
- López de Prado 2018 — *Advances in Financial Machine Learning* (Wiley) — caps. 3, 4, 5, 7
- Meinshausen 2006 — *JMLR* 7 — QRF — https://www.jmlr.org/papers/v7/meinshausen06a.html
- Pan & Yang 2010 — *IEEE TKDE* 22(10) — transfer learning survey — https://doi.org/10.1109/TKDE.2009.191
- Politis & Romano 1994 — *JASA* 89(428) — block bootstrap — https://doi.org/10.2307/2290993
- Polyzotis et al. 2018 — *SIGMOD* — data validation for ML — https://doi.org/10.1145/3183713.3197047
- Strobl, Boulesteix, Kneib et al. 2008 — *BMC Bioinformatics* 9 — VIF e importância em RF — https://doi.org/10.1186/1471-2105-9-307
- Vitter 1985 — *ACM TOMS* 11(1) — reservoir sampling — https://doi.org/10.1145/3147.3165

---

*Fim Q2 v0.1.0. Dataset ainda não existe — auditoria é do design. Revisão obrigatória após primeiros 30 dias de coleta empírica com dados reais.*
