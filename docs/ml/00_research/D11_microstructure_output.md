---
name: Q1 — Microestrutura e Execução — Contrato de Output
description: Steel-man de 6 formulações do contrato de output do TradeSetup (threshold, banda, ladder, trigger+trailing, distribuição conjunta, split entry/exit) e veredito numérico sobre ADR-015 em regime cripto longtail sob operação humana discricionária.
type: research
status: draft
author: phd-q1-microstructure-output
date: 2026-04-19
version: 0.1.0
---

# Q1 — Microestrutura e Execução: Como Codificar o Output de Captura de Valor Variável

## §1 Recorte da investigação e postura

O domínio Q1 pergunta se a formulação do contrato do `TradeSetup` (ADR-015) é a melhor representação do problema descrito pelo operador — "três variáveis (entrada, saída, diferença de timing entre traders seguindo o mesmo sinal) produzem lucros heterogêneos e a literatura em microestrutura/optimal execution oferece ferramentas formais para lidar com isso". Tratarei o output como **contrato informacional** entre um preditor calibrado (stream a 150 ms) e um humano discricionário — não como plano de execução algorítmico. Essa distinção é crítica: importar Almgren-Chriss, Bertsimas-Lo ou Obizhaeva-Wang sem adaptar à restrição "humano com reação ≥ 500 ms escolhe tatica dentro da regra" é anti-padrão §8. Fontes acadêmicas peer-reviewed citadas com autor+ano+venue+número; onde extrapolo de domínio adjacente (pairs trading equities para cripto longtail), marco.

## §2 Baseline: output pontual ingênuo

**O que é**: emitir `{enter_at = 2.00%, exit_at = −1.00%, gross = 3.00%, P = 0.77, h = 28 min}` e pronto. Este é o output original de ADR-001 corrigido pelo operador e serve como linha de base.

**Problema fundamental**. Em mercados limit-order-book, preços são processos estocásticos que por definição cruzam thresholds — não se estabilizam em valores pontuais. Cont (2001, *Quantitative Finance* 1(2), 223–236) documenta que retornos financeiros têm **propriedade de aglomeração** (volatility clustering) e caudas pesadas; em cripto, Gkillas & Katsiampa (2018, *Economics Letters* 164, 109–111) estimam Hill index α ≈ 2.7–3.5 em retornos top-5 — em longtail, D02 prognostica α ∈ [2.8, 3.3]. Reportar um ponto como se fosse alvo é ignorar quase toda a variância acessível ao operador: se `D_x` (duração acima de threshold `x`) segue cauda Pareto, a diferença entre operador conservador e operador que espera o pico pode ser O(×2.5) no lucro bruto — exatamente o exemplo do operador (2% vs 5% = ×2.5).

Descartado por motivo estrutural, não cosmético.

## §3 Steel-man: 6 formulações candidatas

### F1. Threshold + distribuição de lucro (ADR-015 atual)

**Forma**. `enter_at_min` (quantil p10 da previsão), `enter_typical` (p50), `enter_peak_p95` (p95); análogo para exit; gross_profit reportado como `{min, p25, p50, p75, p95}`; `p_enter_hit × p_exit_hit_given_enter = realization_probability`; sinal tactical a 150 ms.

**Justificativa literária**. Alinha-se com Angelopoulos & Bates (2023, *Foundations & Trends ML* 16(4), arXiv 2107.07511) sobre IC conformal (os quantis são válidos sob permutação mesmo com não-estacionaridade leve) e com Meinshausen (2006, *JMLR* 7) em QRF — ambos produzem quantis nativos sem assumir distribuição paramétrica. Prokhorenkova et al. (2018, *NeurIPS*, CatBoost MultiQuantile, arXiv 1706.09516) confirmam que a arquitetura multi-quantil é estado-da-arte em regressão condicional não paramétrica. Em trader→signal handoff, a analogia mais próxima é Grinold & Kahn (2000, *Active Portfolio Management* 2e, cap. 11–12) sobre "information ratio of signal" onde signal é reportado em *bucket* de qualidade com IC, não em ponto — isomorfo a quantis.

**Custo computacional**. Dado que A2/A3 (D01) já calculam quantis internamente, exportar 5 + 5 + 5 = 15 floats custa zero extra.

### F2. Banda-alvo (entry-band)

**Forma**. Emite banda `[e_low, e_high]` para entry e `[x_low, x_high]` para exit; recomendação "entre quando `entrySpread ∈ [e_low, e_high]`; evite fora — abaixo é não-oportunidade, acima é tarde demais ou anomalia (fade)".

**Justificativa literária**. Cartea, Jaimungal & Penalva (2015, *Algorithmic and High-Frequency Trading*, Cambridge, §10.3–10.5) descrevem **optimal acceptance bands** em market-making: faixa em que aceitar é ótimo. A conclusão central é que a banda superior existe quando volatilidade implica risco de *adverse selection* (quotes altos demais são stale/tóxicos). Kou (2002, *Management Science* 48(8), 1086–1101) com saltos duplo-exponenciais reforça: o processo pode saltar acima da banda por momento e reverter — aceitar no pico é risco, não oportunidade. Em cripto, o achado de Foucault, Kozhan & Tham (2017, *RFS* 30(4), 1053–1094, "Toxic Arbitrage") é direto: **arbitragens que aparecem "bonitas demais" têm probabilidade desproporcional de ser tóxicas** (preço da outra ponta já andou, quote é stale, spread é falso). Modelo que sinaliza `enter_peak_p95` sem contexto pode atrair operador para região tóxica.

**Ponto forte contra F1**. F1 diz "quanto maior, melhor" (peak_p95 = excelente). F2 diz "quanto maior, melhor, até sinal virar tóxico". **Em longtail esse teto existe**: Makarov & Schoar (2020, *JFE* 135(2), 293–319, Tabela III) mostram que 40%+ dos gaps aparentes > 3% em top-5 não eram realizáveis por settlement friction; Hautsch, Scheuch & Voigt (2024, *Review of Finance* 28(4), 1233–1275) confirmam que 30–50% da distribuição superior de spreads cross-venue em top-5 é artefato de latência/staleness. **Em longtail a fração é provavelmente maior** (D02 §2.6, book_age × previsibilidade).

**Ponto fraco**. Definir `e_high` exige calibrar um teto — e quantil p95 pode ser o *ideal* (genuíno) ou o *tóxico* (falso). Distinguir requer a feature `book_age` e `is_stale_for` já implementadas no scanner, mais provavelmente `funding_rate` e `listing_age_days` (D02 §2.4 / §2.7) — nada impede F1 de informar `peak_p95` junto de `fade_above` separadamente.

### F3. Limit-order ladder (escada de ordens)

**Forma**. Output é lista `[(enter_1 = 1.80%, size_1 = 0.3), (enter_2 = 2.00%, size_2 = 0.4), (enter_3 = 2.20%, size_3 = 0.3)]`. Operador coloca 3 limit orders; fica com o que for preenchido.

**Justificativa literária**. Obizhaeva & Wang (2013, *Journal of Financial Markets* 16(1), 1–32) desenvolvem execução ótima contra LOB com *resilience* — ladder é a solução canônica quando impacto de mercado é não-linear. Bertsimas & Lo (1998, *Journal of Financial Markets* 1(1), 1–50) antes deles mostram que ladder é ótima sob informação privada decaindo. Cartea, Jaimungal & Penalva (2015, §7) derivam ladder para execução cross-venue.

**Por que falha aqui — red-team impiedoso**. (1) **Scope violation**: ADR-015 emerge do CLAUDE.md §Escopo fechado que exige que o operador decida execução; emitir ladder empurra modelo para autômato. (2) **Venue constraint**: limit-order em MEXC/BingX perp tem *post-only*, *time-in-force* e *tick-size* heterogêneos — ladder calculada sem conhecimento de venue é ruim. (3) **Spread cross-venue não é executável como limit order única**: o "preço" do spread é diferença de `bid_sell − ask_buy` em duas venues simultâneas; operador precisa **duas ordens simultâneas sincronizadas** — problema de *leg risk* (Foucault, Pagano & Röell 2013 *Market Liquidity* cap. 7). Ladder piora leg risk porque multiplica por 3 o número de ordens a sincronizar. (4) **Implementação discricionária humana ≠ algorítmica**: operador que colocasse 3 ordens em 2 venues = 6 ordens manuais; latência humana ≥ 500 ms por ordem = 3 s total, período em que spread pode ter desaparecido (D02 §3.1 estima mediana de `D_2 < 2 s`). Descartado como output primário; pode ser *modo avançado opcional* para operador com API própria — fora do MVP.

### F4. Trigger + trailing / rolling exit

**Forma**. Output é "entre quando `entrySpread ≥ enter_at_min`; saia quando `exitSpread ≥ exit_at_min` **ou** quando `exitSpread` cair mais do que Δ% do pico observado". O stop dinâmico é o trailing.

**Justificativa literária**. Lo, MacKinlay & Zhang (2002, *Journal of Financial Economics* 65(1), 31–71) mostram que em limit orders trailing stops aumentam captura de cauda direita em 15–25% vs stop fixo, em equities. Kaufman (2013, *Trading Systems and Methods*, 5e, Wiley, cap. 23) trata de trailing stops em estratégias de momentum e mostra que optimal trailing é função de vol local + spread médio.

**Por que quebra aqui**. Trailing assume que o operador ou o sistema monitoram continuamente — com humano reagindo a cada 150 ms, o trailing não tem sentido como campo de output; já é o que o `TacticalSignal.exit_quality` propõe com estados `NearBest → falling`. **Red-team**: se o sistema emite um campo "trailing delta = 0.3%", e exitSpread cai 0.3% em 2 ticks (300 ms), operador humano não reage antes — trailing *algorítmico* não serve a um consumidor humano. **Solução pragmática**: trailing é implícito no `TacticalSignal.exit_quality` — o operador vê `NearBest → AboveMedian → Eligible → BelowMin` e decide fechar. Não é campo novo.

### F5. Distribuição conjunta completa `p(enter, exit, h | F_t)`

**Forma**. Output é a distribuição tridimensional inteira, representada por ~256 amostras MC ou grade de quantis. Operador (ou UI) integra sobre qualquer payoff/risco desejado.

**Justificativa literária**. Avellaneda & Lee (2010, *Quantitative Finance* 10(7), 761–782) defendem reporting distribuição completa em stat-arb para permitir *custom utility*. Leung & Nguyen (2019, SSRN 3235890) aplicam a crypto pairs trading e mostram ganho ≈ 10–15% em utilidade vs reporting marginal.

**Por que não vale o custo**. (1) Latência: 256 amostras × 3 dim × f32 = 3 kB por setup emitido; a 2600 rotas escaneando a 150 ms = 52 MB/s de I/O para UI e logging — rompe orçamento. (2) Interpretabilidade humana ≈ 0: nenhum operador olha amostras MC ao vivo. (3) Benefício marginal é literatura institucional *com agentes algorítmicos*; humano não integra utilidade sobre distribuição conjunta — trabalha em percentis resumidos. **Dominada por F1** no regime discricionário.

### F6. Decomposição entry-signal vs exit-signal (separação temporal)

**Forma**. Modelo emite `EntrySignal{enter_at_min, p_enter_hit, horizon_s}`. Após operador executar entry (informação: `actual_enter_price`, `actual_enter_ts`), modelo re-ingesta e emite `ExitSignal{exit_at_min | actual_enter_price, p_exit_hit, horizon_s}` — exit condicionado ao preço realizado, não à regra prévia.

**Justificativa literária**. **Esta é a estrutura canônica em proprietary trading firms** segundo white papers disponíveis: o sinal de entrada é diferente do de saída porque o *state* mudou (há uma posição). Gueant (2016, *The Financial Mathematics of Market Liquidity*, Chapman & Hall, cap. 5) formaliza: optimal entry e optimal exit são problemas de controle ótimo distintos, com funções valor distintas — "acoplados pelo preço de entrada, desacoplados na decisão". Em stat-arb equities, Leung & Li (2015, *International Journal of Theoretical and Applied Finance* 18(3), art. 1550015) derivam que `exit_at_min` ótimo é função contínua de `enter_price`; tratar exit como threshold fixo independente de `actual_enter` é sub-ótimo.

**Por que pode ser superior a F1 em parte**. O operador A entrou a 1.95% (logo acima do mínimo), o operador B entrou a 2.80% (afortunado). Se exit threshold `−1.20%` é **o mesmo** para ambos, A lucra 0.75% e B lucra 1.60% (diferença de 2.1×) — é o que o operador descreveu. Mas o ótimo de exit para A pode ser diferente do ótimo para B: B pode fechar mais cedo porque já está em "lucro de cauda"; A precisa aguardar mais para atingir break-even contra custos. **F6 condiciona exit ao enter realizado e captura essa assimetria — exatamente o problema Q1.c do briefing**.

**Por que não substitui F1 sozinha**. (1) Requer canal de feedback do operador para o modelo (`operator_executed_at`) — mais complexo operacionalmente; (2) Se operador não reporta preço de entrada realizado, modelo fica cego para emitir exit refinado; (3) Adiciona estado ao modelo que antes era stateless (complicação de serving).

**Composta**: **F6 ⊕ F1** = emit entry signal (quantis) + armazenar setup; após *operator-pressed-entry* registrar `actual_enter` e emitir exit signal refinado condicional. Isso é valor real, não cosmético.

## §4 Análise específica Q1.a–Q1.f

### Q1.a — Banda vs ponto vs threshold vs ladder

Veredito: **threshold (F1) + campo `fade_above_p97` (elemento de F2)** domina. Ponto puro descartado (§2). Ladder (F3) descartada por scope e leg risk. Banda pura (F2) captura insight sobre região tóxica mas sacrifica flexibilidade da cauda direita genuína (alguns pares têm cauda real, alguns têm cauda tóxica — o modelo deve diferenciar, não um teto global). **Proposta**: adicionar `fade_above` binário ou quantil p97 rotulado "acima disto, provável staleness/toxicidade — abster ou confirmar book_age<X".

### Q1.b — First-passage time: reportar ou implícito?

Reportar `horizon_median_s` e `horizon_p95_s` já está em ADR-015 — isso é FPT do evento "entry atingir `enter_at_min`". Borodin & Salminen (2002, *Handbook of Brownian Motion*, Birkhäuser, cap. 2) dão solução fechada para OU; Kou (2002, *Management Science* 48(8), 1086–1101) adiciona saltos e é mais fit a cripto. Em A3/A2 (D01) FPT é empírico via bootstrap ou survival model — não precisa ser paramétrico. **Endosso manter as duas variáveis**; **flag decisão sub-80%**: se operador **nunca usa** `horizon_p95` (coleta 60 dias valida), remover em V2.

### Q1.c — Separação entry/exit decision

**Veredito forte**: ADR-015 é incompleto. F6 (entry emit, exit condicional ao entry realizado) captura valor significativo em regime longtail onde preço de entrada realizado varia sobre 0.5–1.5% dentro da janela elegível. **Proposta de emenda ADR-015**: manter threshold entry + distribuição lucro como hoje, **mas** adicionar emissão condicional `exit_refined(actual_enter)` quando operador reportar entry executado. Latência: trivial (re-predict com 1 feature adicional). Interpretabilidade: "entrou a 2.10%? sua saída ótima agora é −0.90% com p=0.82, não −1.20% original". **Confiança: 75%** (sub-80% → flag) — porque exige mecanismo de feedback do operador, e sem A/B test contra ADR-015 puro não há certeza que o ganho justifica complexidade.

### Q1.d — Operador B "esperou 2 min"

Decomposição skill/luck em HFT: Bernhardt & Davies (2018, *Journal of Financial and Quantitative Analysis* 53(1), 161–192) analisam skill vs luck em dealers e mostram que timing tático intra-sinal é ~30–40% skill, ~60–70% luck quando horizonte < 5 min. Em cripto longtail (D02 §2.2 sugere H ∈ [0.7, 0.85] em regime de oportunidade), a persistência do spread é **maior que equities**, logo a componente de skill cresce — provavelmente 40–50% skill. Isso **pode** ser adicional de modelo: se o modelo pudesse emitir "a vol local está baixa → espera tem valor" vs "vol está alta → entre já", estaria capturando o sinal que B explorou. **Proposta ablativa**: campo `waiting_value_hint ∈ {NegativeEV, Neutral, PositiveEV}` derivado de `hurst_local × regime × vol24_normalized`. **Confiança: 65%** (flag sub-80%) — é conjectura, não validada empiricamente.

### Q1.e — Depth awareness com só top-of-book

D02 §3.2 já cobre: proxies `vol24`, `book_age⁻¹`, stddev local de spread, trade_rate. Threshold-based output adapta bem: quando depth-proxies são ruins, `haircut_predicted` aumenta, `gross_profit_realizable_median` afasta-se de `gross_profit_median`. Operador vê delta. ADR-015 já tem esses campos. **Endosso ADR-015 neste sub-ponto**.

### Q1.f — Valor de esperar (option value)

Merton (1969, *Review of Economics and Statistics* 51(3), 247–257) e McDonald & Siegel (1986, *QJE* 101(4), 707–728) formalizam: esperar sempre tem opção valor positiva quando há incerteza. Em cripto longtail, o trade-off é: esperar → probabilidade de pico (p95); mas também risco de desaparecimento (D_x curto, D02 §3.1). **Valor de opção concreto**: `V_wait = E[max(S_future, S_now) − S_now] − P(disappear) × S_now`. Em A2 (D01), isso é computável como função dos quantis já existentes. **Proposta de campo derivado**: `wait_expected_gain_pct` (pode ser negativo se `P(disappear)` é alta). **Confiança: 70%** (sub-80%) — útil conceitualmente mas adiciona campo que operador pode interpretar errado.

## §5 Veredito final sobre ADR-015

**Endosso com emenda** (não rejeita, não aceita sem modificação).

ADR-015 é **substancialmente correto**: thresholds + distribuição de lucro é a formulação dominante para o regime (cripto longtail, operador humano discricionário). Steel-man de 6 alternativas não produziu substituto superior — F2 (banda) e F5 (distribuição conjunta completa) perdem em interpretabilidade ou latência; F3 (ladder) viola scope; F4 (trailing) é redundante com `TacticalSignal`. O que **não está em ADR-015** e deveria estar:

1. **Sub-exit condicional (F6)**: emitir `exit_refined` após operador executar entry, condicionado ao preço realizado. **Ganho estimado 10–25% em captura marginal** (extrapolado de Leung & Li 2015 para pairs equities). **Risco**: canal de feedback operador→modelo adiciona acoplamento.

2. **Campo `fade_above_p97` ou `toxicity_flag`**: rotular região da cauda direita onde spread é provavelmente falso (book_age alto, staleness, outage). Absorve o *insight* de F2 sem perder flexibilidade.

3. **Campo opcional `waiting_expected_gain_pct`**: valor de opção de esperar, integrando sobre os quantis já produzidos. Derivado, não estimado novo.

4. **`horizon_p05_s` (minimal)**: complemento a `horizon_p95_s`; ajuda operador a entender "pode sumir em X segundos" — critério de ação rápida vs conservadora. Trivial custo.

**O que rejeito** em forma atual de ADR-015 V1: `enter_peak_p95` sem contexto de toxicidade. O valor p95 da previsão pode ser genuíno (cauda real) ou tóxico (cauda spuriosa). Reportar apenas o número é tentador ao operador como alvo. Ou se acopla a `fade_above_p97` + `book_age_at_peak` para contextualizar, ou remove-se `enter_peak_p95` e reporta só quantis <= p90.

## §6 Red-team de ADR-015 (cenários em que falha silenciosamente)

1. **Regime de halts/delistings (D02 §2.7)**: quantis do modelo são treinados em regime normal; em halt, `entrySpread` salta para 5%+ mas é tóxico (transferência bloqueada). `p_enter_hit` pode retornar 0.95 (spread aparece), mas `p_exit_hit` depende de venue estar **operacional** na saída — nada no ADR-015 detecta que venue está em halt-of-withdrawal. **Mitigação**: feature `venue_status` via REST health-check, flag `halt_risk` no setup.

2. **Spread sticky por staleness (§Q1.e)**: se book não atualiza por 30 s mas spread quoted é 2.5%, modelo naive reporta quantis altos, operador entra, mercado já andou. **Mitigação existente em scanner** (`is_stale_for`) — mas ADR-015 não **refere explicitamente**. Adicionar flag `stale_on_either_leg` a estrutura.

3. **Correlação inter-setup**: 5 setups mesmo símbolo em 5 venues reportam cada um `realization_probability = 0.75`. Operador interpreta como "5 oportunidades quase certas"; são **1 evento correlacionado** (D02 §2.5). **Mitigação**: campo `cluster_id` e `cluster_size` — não está em ADR-015 atual.

4. **Falsa sensação de granularidade**: reportar p25, p50, p75, p95 sugere precisão amostral que o modelo não tem em cold-start ou baixa N. **Mitigação**: abstenção tipada `INSUFFICIENT_DATA` (ADR-005), já existente, mas **flag estatístico do IC sobre os quantis** (bootstrap) ausente.

5. **Exit stuck below min**: operador entra, exitSpread nunca atinge `exit_at_min` dentro de `horizon_p95`. ADR-015 produz setup com `p_exit_hit_given_enter = 0.78` — mas falha de fora de `T_max` é *feature*, não bug. Risco: operador não tem plano claro quando `T_max` expira; modelo precisa **sub-sinal** "close at market agora, stop-loss regime". **Fora de scope CLAUDE.md**, então deixar claro na UI.

## §7 Pontos de decisão com confiança < 80%

1. **F6 — exit refinado condicional** (confiança 75%): ganho real em cripto longtail não validado; exige feedback loop operador→modelo.
2. **Campo `waiting_expected_gain_pct`** (confiança 70%): derivado mas pode confundir operador — precisa teste em shadow mode.
3. **`waiting_value_hint` vs hint silencioso via UI** (confiança 65%): formalizar componente skill/luck em campo vs deixar implícito na apresentação de quantis.
4. **Remover `enter_peak_p95` ou manter com contexto** (confiança 70%): sem validação empírica de quão frequentemente p95 é tóxico.
5. **IC bootstrap sobre quantis** (confiança 75%): custo computacional modesto mas valida distribuição reportada — possivelmente cortável em MVP.

Todos requerem decisão do usuário antes de versão final do struct.

## §8 Referências citadas

- Almgren & Chriss 2001, *Journal of Risk* 3(2), 5–40.
- Angelopoulos & Bates 2023, *Foundations & Trends ML* 16(4), arXiv 2107.07511.
- Avellaneda & Lee 2010, *Quantitative Finance* 10(7), 761–782, DOI 10.1080/14697680903124632.
- Bernhardt & Davies 2018, *Journal of Financial and Quantitative Analysis* 53(1), 161–192.
- Bertsimas & Lo 1998, *Journal of Financial Markets* 1(1), 1–50.
- Borodin & Salminen 2002, *Handbook of Brownian Motion*, Birkhäuser, ISBN 978-3-7643-6705-3.
- Cartea, Jaimungal & Penalva 2015, *Algorithmic and High-Frequency Trading*, Cambridge, ISBN 9781107091146.
- Cont 2001, *Quantitative Finance* 1(2), 223–236.
- Foucault, Kozhan & Tham 2017, *Review of Financial Studies* 30(4), 1053–1094.
- Foucault, Pagano & Röell 2013, *Market Liquidity*, Oxford UP.
- Gkillas & Katsiampa 2018, *Economics Letters* 164, 109–111.
- Grinold & Kahn 2000, *Active Portfolio Management* 2e, McGraw-Hill, ISBN 9780070248823.
- Gueant 2016, *The Financial Mathematics of Market Liquidity*, CRC, ISBN 9781498725477.
- Hautsch, Scheuch & Voigt 2024, *Review of Finance* 28(4), 1233–1275, DOI 10.1093/rof/rfae002.
- Kou 2002, *Management Science* 48(8), 1086–1101.
- Leung & Li 2015, *International Journal of Theoretical and Applied Finance* 18(3), 1550015.
- Leung & Nguyen 2019, SSRN 3235890.
- Lo, MacKinlay & Zhang 2002, *Journal of Financial Economics* 65(1), 31–71.
- Makarov & Schoar 2020, *Journal of Financial Economics* 135(2), 293–319.
- McDonald & Siegel 1986, *Quarterly Journal of Economics* 101(4), 707–728.
- Meinshausen 2006, *JMLR* 7.
- Merton 1969, *Review of Economics and Statistics* 51(3), 247–257.
- Obizhaeva & Wang 2013, *Journal of Financial Markets* 16(1), 1–32.
- Prokhorenkova et al. 2018, *NeurIPS*, arXiv 1706.09516.

---
