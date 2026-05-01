---
name: spread-arbitrage-strategy
description: >-
  Use esta skill quando o assunto for explicar, raciocinar sobre ou ensinar a estratégia manual de arbitragem de spread cross-venue em cripto: abrir duas pernas simultâneas em venues distintas, travar spread de entrada favorável e esperar melhora no spread de saída. Cobre taxonomia técnica, definição de spread de entrada e saída como séries derivadas dos quatro preços, identidade de PnL bruto `PnL = S_entrada(t₀) + S_saída(t₁)`, heurística humana de decisão e fronteira entre fatores estruturais de mercado e escolhas pessoais do operador. Não cobre execução de ordens, automação, ML ou detalhes de implementação.
---

# Arbitragem de Spread Cross-Venue — Aula de Referência

> Documento conceitual canônico da estratégia. Lê-se de cima para baixo como uma aula. Cada seção pode ser citada isoladamente.

---

## Fronteira com o modelo ML deste projeto

Esta skill explica a estratégia manual e seus riscos conceituais. Ela **não** autoriza o modelo ML a otimizar ou modelar taker fees, maker fees, slippage, funding, withdrawal fees, tamanho de posição, margem, liquidação, stop-loss, rebalanceamento, execução parcial, latência de ordem, fill probability ou PnL líquido.

Quando esta skill for usada para orientar o ML do projeto, o objetivo continua sendo exclusivamente recomendar oportunidade calibrada em termos de spread bruto: `enter`, `exit`, `lucro bruto = enter + exit`, `P`, `T`, e intervalo de confiança. Os riscos de execução e custos líquidos descritos aqui pertencem ao operador/camada operacional, não ao label, objetivo, função de perda ou gate do ML.

---

## 1. Classificação técnica da estratégia

A estratégia opera sobre uma **rota** definida por uma quíntupla:

```
r = (symbol, venue_compra, venue_venda, tipo_mercado_compra, tipo_mercado_venda)
```

onde `tipo_mercado ∈ {SPOT, FUTURES_PERP}`.

### 1.1 Nome canônico

**Na literatura peer-reviewed de tier 1 e em documentação institucional, o nome canônico desta estratégia é `cross-exchange arbitrage`** (sinônimo aceitável: `spatial arbitrage`, com conotação geográfica). Esse é o termo que aparece verbatim em:

- Makarov & Schoar 2020, *Journal of Financial Economics* 135(2) — paper seminal
- Hautsch, Scheuch, Voigt 2024, *Review of Finance* 28(4) — "limits to arbitrage"
- Crépellière, Pelster, Zeisberger 2023, *Journal of Financial Markets* 64
- John, Li, Liu 2024, SSRN WP (80 exchanges)
- CFA Institute Digest (2020); BIS Working Paper 1087 (2023)
- Hummingbot docs; BitMEX blog; Shift Markets; Bitsgap; AlgoTrading101

### 1.2 Camadas descritivas (não-sinônimos do nome canônico)

A estratégia se classifica simultaneamente — e sem contradição — em múltiplas camadas descritivas. **Estas são propriedades, não nomes alternativos:**

| Camada | Termo técnico | Por que se aplica |
|---|---|---|
| **Topologia das pernas** | *Cross-exchange arbitrage* (sin. *spatial arbitrage*) | As pernas vivem em venues distintas; o preço do mesmo ativo não converge instantaneamente entre venues por fricção de transferência. |
| **Topologia do produto** (quando os tipos de mercado das duas pernas diferem) | *Basis arbitrage* / *cash-and-carry*; especificamente *perpetual–spot basis trade* quando perp está envolvido (BIS WP 1087; Deribit Insights) | SPOT e perpetual têm preços que oscilam em torno do basis, com funding rate como termo de carrego. Quando duas PERP de venues distintas com funding rates divergentes: *funding rate arbitrage* (ScienceDirect 2025). |
| **Mecanismo gerador de retorno** | *Mean-reversion* é propriedade, não nome. **"Statistical arbitrage"** só é nome correto quando o sinal de entrada usa modelo probabilístico formal — z-score sobre spread, cointegração, PCA — e.g., Kristoufek et al. 2023 (*FRL*). A variante descrita aqui é **observacional/discricionária** (operador lê spread bruto no orderbook), portanto **NÃO é stat-arb no sentido estrito da literatura**. | A estratégia não trava lucro em t₀ (não é livre de risco); aposta na reversão do spread durante o hold. |
| **Estrutura temporal das pernas** | *Two-leg convergence trade with delayed unwind* / *open-position spread trade* | As duas pernas são abertas simultaneamente em t₀ (travando o spread de entrada); o fechamento simultâneo em t₁ > t₀ é discricionário e determina o spread de saída realizado. |

### 1.3 Nomenclatura por variante de rota

Esta estratégia opera **apenas** em duas variantes de rota — aquelas em que pelo menos uma perna é perpetual, porque perp permite abrir short nativo sem inventário pré-existente do ativo:

| Rota | Nome correto na literatura/indústria | Referência canônica |
|---|---|---|
| SPOT ↔ PERP (cross-venue) | `basis trade` / `cash-and-carry arbitrage`; especificamente `cross-exchange basis trade` | BIS WP 1087 "Crypto Carry"; Deribit Insights |
| PERP_A ↔ PERP_B (capturando gap de preço ou funding divergente) | `cross-exchange perpetual arbitrage` — ou `funding rate arbitrage` quando o sinal primário é divergência de funding | ScienceDirect 2025 "Risk and Return Profiles of Funding Rate Arbitrage" |

A variante **SPOT/SPOT** é **outro tipo de arbitragem** (transfer/spatial arbitrage clássico) e está **fora do escopo desta aula** — ver §1.4.

### 1.4 O que esta estratégia explicitamente NÃO é

- ❌ **Arbitragem triangular** — essa é intra-venue, três pares formando um loop.
- ❌ **Latency arbitrage HFT** — a janela operada aqui é minutos a horas, não microssegundos.
- ❌ **Arbitragem livre de risco** (*risk-free arb*) — existe risco direcional residual durante o tempo em que a posição está aberta; ver §6.
- ❌ **Funding-rate arbitrage pura** — funding é, no máximo, um termo *auxiliar* de carrego (custo ou crédito durante o hold), não a fonte primária de retorno quando o sinal primário é gap de preço entre venues.
- ❌ **Transfer / spatial arbitrage SPOT/SPOT** — a variante "compra SPOT barato em A, transfere on-chain, vende SPOT caro em B" (ou a variante simultânea que exige inventário do ativo pré-posicionado em B) é **outro tipo de arbitragem**, não cobre por esta aula. Mecanicamente é diferente: depende de transferência on-chain (com latência de minutos a horas, janela de preço exposta) ou de manter inventário do ativo parado na venue de venda. A estratégia desta aula abre short nativo em perp, eliminando a necessidade de inventário do ativo e de transferência para executar a perna de venda.
- ❌ **Pairs trading** (Gatev et al. 2006, *Review of Financial Studies*) — pairs trading opera em **ativos distintos** correlacionados (BTC/ETH, KO/PEP) apostando em reversão do spread entre eles. Aqui o par é o **mesmo ativo** em duas venues — categoricamente diferente. Aplicar "pairs trading" a BTCUSDT em Binance vs. BTCUSDT em OKX é erro terminológico frequente na indústria.
- ⚠️ **"Delta-neutral"** — termo impreciso para esta estratégia. "Delta" é conceito nascido de options; aqui a perna perp (short) cancela a perna long (spot ou perp) em termos de exposição direcional, mas o termo não captura risco de funding, margem e basis, que são primeiro-ordem no PnL líquido. Termo preferido: **market-neutral** ou **dollar-neutral**.

---

## 2. O modelo de duas séries de spread

Para uma rota, com cotações de top-of-book observadas continuamente:

| Símbolo | Definição | Sinal "favorável" |
|---|---|---|
| `ask_A(t)` | Melhor preço de venda em A — preço que pagamos para comprar em A | — |
| `bid_A(t)` | Melhor preço de compra em A — preço que recebemos ao vender em A | — |
| `ask_B(t)`, `bid_B(t)` | Análogos em B | — |
| `ref(t)` | Preço de referência (e.g., `mid_A(t)` ou min dos asks) | — |
| **`S_entrada(t)`** | `(bid_B(t) − ask_A(t)) / ref(t)` | **Positivo grande** = oportunidade gorda de abrir |
| **`S_saída(t)`** | `(bid_A(t) − ask_B(t)) / ref(t)` | **Subir em direção a zero ou positivo** = janela boa para fechar |

### Convenção de direção: qual venue é A e qual é B

A direção do trade não é arbitrária — emerge mecanicamente do mispricing. Por convenção desta aula:

- **A é a venue mais barata** no instante de entrada — onde se **compra**
- **B é a venue mais cara** no instante de entrada — onde se **vende**

É essa assimetria de preço que torna `S_entrada(t₀) = (bid_B − ask_A)/ref` positivo. Trocar A por B inverte o sinal de tudo: comprar onde está caro e vender onde está barato produz `S_entrada` negativo, ou seja, **o trade já começa no prejuízo**. Por isso o scanner reporta cada oportunidade já com a direção orientada (`buyFrom`/`sellTo`); não há ambiguidade — a "rota" inclui a direção.

### Observação estrutural: as duas séries se movem juntas, em sentidos opostos

`S_entrada` e `S_saída` são funções **dos mesmos quatro preços**, e por isso são **anti-correlacionadas**: qualquer compressão do gap de preço entre A e B empurra `S_entrada` para baixo **e** `S_saída` para cima, simultaneamente. Não são dois sinais independentes que precisam alinhar por sorte — é uma única dinâmica de preço se manifestando duas vezes.

#### Para qual valor os spreads revertem (e não é zero)

Em condições normais de mercado, sem mispricing entre venues:

```
S_entrada(t) ≈ S_saída(t) ≈ −2 × half_spread_típico
```

Ambos são **ligeiramente negativos**, refletindo o custo de cruzar bid-ask em duas venues. Esse é o **baseline estrutural** da rota — e é para ele que os spreads tendem a reverter, não para zero. Esperar `S_saída` atingir 0% (ou positivo) significa esperar não só que o mispricing se resolva, mas que se **inverta**. Na prática, a maioria dos trades fecha quando `S_saída` sobe até "perto o suficiente" do baseline, não quando atravessa zero.

#### Leitura direta do scanner: por que fechar imediato sempre dá negativo

Num **mesmo instante** t, a soma dos dois spreads é uma identidade contábil:

```
S_entrada(t) + S_saída(t)  =  −(bid_ask_A(t) + bid_ask_B(t)) / ref(t)
```

— sempre ligeiramente negativa, determinada **puramente pela largura dos books** das duas venues, nada mais. É exatamente **por isso** que o scanner mostra a imensa maioria das oportunidades com `entrySpread + exitSpread ≤ 0` quando o operador olha a foto atual: não é falha de sinal, é a própria matemática da identidade avaliada num único instante. Fechar a posição no mesmo momento em que se abriu equivale a cruzar o bid-ask das duas venues duas vezes — o operador paga exatamente isso, e é por isso que a soma `entrySpread + exitSpread` no scanner não pode ser positiva em condições normais.

O PnL positivo da identidade de §3 **não** vem da magnitude de `sum(t)` num instante qualquer — `sum(t)` é aproximadamente constante e negativa enquanto a largura dos books não mudar muito. Vem da **diferença temporal**: trava-se `S_entrada(t₀)` quando está elevado (mispricing aberto) e colhe-se `S_saída(t₁)` em `t₁ > t₀`, depois que o mispricing reabsorveu e `S_saída` subiu em direção ao baseline. Esperar não é preferência operacional — é estrutural: sem `t₁ ≠ t₀`, a identidade matematicamente não fecha positivo.

#### Mecanicamente: por que esperar funciona

Suponha que A esteja barato e B caro, criando `S_entrada(t₀) = +5%`. Para essa oportunidade existir, o preço em B teve que subir, ou o de A teve que cair, ou ambos. Conforme o mercado reabsorve esse mispricing, três coisas equivalentes podem acontecer:

- **(a)** o preço em A sobe (compradores acharam que estava barato)
- **(b)** o preço em B cai (vendedores acharam que estava caro)
- **(c)** ambos se movem em direção um ao outro

Em qualquer dos três cenários, simultaneamente:
- `bid_B − ask_A` **diminui** → `S_entrada` cai (a oportunidade evapora — quem chegou tarde não a vê mais)
- `bid_A − ask_B` **aumenta** → `S_saída` sobe (a janela de saída aparece — quem entrou cedo agora pode fechar com lucro)

É a **mesma** dinâmica de preço empurrando uma série para baixo e a outra para cima. Por isso "esperar funciona": não é aposta em dois eventos independentes, é aposta em **um único evento** (mispricing reabsorvido) que se manifesta nos dois spreads simultaneamente.

#### Exemplo numérico da evolução em t₀ → t₁

**t₀ — mispricing aberto:**
- A: ask = 100.00, bid = 99.95
- B: ask = 105.05, bid = 105.00
- `S_entrada(t₀) = (105.00 − 100.00) / 100 = +5.00%`
- `S_saída(t₀)  = (99.95 − 105.05) / 100  = −5.10%`

Operador entra: compra em A a 100.00, vende em B a 105.00. Locked: `S_entrada(t₀) = +5.00%`.

**t₁ — mispricing parcialmente reabsorvido (preços convergiram):**
- A: ask = 102.00, bid = 101.95
- B: ask = 103.05, bid = 103.00
- `S_entrada(t₁) = (103.00 − 102.00) / 100 = +1.00%` (oportunidade quase evaporada)
- `S_saída(t₁)  = (101.95 − 103.05) / 100  = −1.10%` (janela de saída)

Operador fecha: vende em A a 101.95, recompra em B a 103.05. **PnL bruto = +5.00% + (−1.10%) = +3.90%**.

Note que o gap entre as venues **não fechou completamente** (ainda sobra 1% de `S_entrada`), mas comprimiu o suficiente para que a soma dos dois spreads fosse positiva. Esperar pelo fechamento total seria desnecessário — e arriscado, porque o mispricing pode reabrir antes.

### Mecânica de "vender" em cada tipo de mercado

A perna vendida (em B) **exige que seja perpetual** nesta estratégia — abrir short em perp é nativo (basta margem na venue). Vender SPOT exigiria inventário do ativo pré-posicionado na venue de venda, e essa é exatamente a restrição que torna SPOT/SPOT *outro tipo de arbitragem* (§1.4) e não desta aula.

Portanto, as duas combinações operáveis são:

| Tipo A (compra) | Tipo B (venda) | O que precisa ter onde |
|---|---|---|
| SPOT | PERP | Capital base (e.g., USDT) em A; margem em B |
| PERP | PERP | Apenas margem em ambas |

Nos dois casos, a perna vendida é perp — isso é o que permite abrir a posição sem inventário do ativo e sem transferência on-chain.

---

## 3. Identidade fundamental do PnL bruto

Seja `t₀` o instante de entrada (ambas as pernas abertas simultaneamente) e `t₁ > t₀` o instante de saída (ambas fechadas simultaneamente). O PnL bruto realizado é:

$$
\boxed{\;\text{PnL}_{\text{bruto}}(t_0, t_1) \;=\; S_{\text{entrada}}(t_0) \;+\; S_{\text{saída}}(t_1)\;}
$$

Essa é uma **identidade contábil** — derivada diretamente da álgebra das quatro execuções (compra em A em t₀, venda em B em t₀, venda em A em t₁, recompra em B em t₁). Não há termo cruzado, não há composição multiplicativa: é literalmente a soma algébrica dos dois spreads sinalizados, cada um avaliado no instante em que o operador "fixou" aquela perna pela ação de executar.

### 3.1 Por que `S_entrada(t₀)` é constante após a entrada

Uma vez que ambas as pernas estão abertas, `ask_A(t₀)` e `bid_B(t₀)` são preços **executados**, não cotados. Nada que aconteça em t > t₀ muda esses dois números. O único grau de liberdade que resta após a entrada é **quando** o operador decide fechar — e isso amostra um valor de `S_saída(t₁)` da trajetória futura.

### 3.2 Verificação com exemplos canônicos

**Exemplo 1 — saída imediata em prejuízo:**
- `S_entrada(t₀) = +5%` (entrei aqui)
- `S_saída(t₀) = −6%` (sair agora seria ruim)
- Hipotético: `PnL = +5% + (−6%) = −1%` ✓

**Exemplo 2 — espera + saída em lucro:**
- `S_entrada(t₀) = +5%` (travado, constante para o resto do trade)
- `S_saída(t₁) = −2%` após X minutos/horas
- `PnL = +5% + (−2%) = +3%` bruto ✓

**Exemplo 3 — ambas as pernas fechando favoráveis:**
- `S_entrada(t₀) = +1%`, `S_saída(t₁) = +1%`
- `PnL = +1% + 1% = +2%` bruto ✓

A identidade vale para **qualquer** combinação de sinais. O Exemplo 3 ilustra que mesmo um spread de entrada modesto (1%) pode render lucro respeitável (2%) quando o spread de saída também passa para o lado favorável — não há nenhuma exigência de que `S_entrada(t₀)` seja "alto" no sentido absoluto, basta que a soma com `S_saída(t₁)` final seja positiva o bastante para o gosto do operador.

### 3.3 Exemplo didático: dois operadores, mesma rota, entradas e saídas diferentes

Considere uma mesma moeda, na mesma rota A→B. Dois operadores observam a mesma dinâmica de mercado, mas entram e saem em tempos diferentes. Ambos estão operando a **mesma identidade estrutural**; o que muda são as decisões discricionárias de cada um.

**t₀ — Operador 1 entra cedo:**
- `S_entrada(t₀) = +3%`
- `S_saída(t₀) = −4%`
- Operador 1 decide abrir porque, para o critério dele, `+3%` é uma entrada suficiente.

**t₀ + 2 minutos — Operador 2 entra depois:**
- O mispricing já começou a comprimir.
- `S_entrada(t₀ + 2m) = +2%`
- Operador 2 viu a mesma moeda mais tarde e decide abrir mesmo assim, porque para o critério dele `+2%` ainda é aceitável.

**t₁ — primeira janela de saída razoável:**
- `S_saída(t₁) = −1%`
- Operador 1 fecha: `PnL_bruto = +3% + (−1%) = +2%`
- Para o Operador 1, esse lucro bruto já satisfaz sua meta. Ele sai.

**t₂ > t₁ — saída melhora ainda mais:**
- `S_saída(t₂) = +1%`
- Operador 2 decide esperar mais e fecha só agora: `PnL_bruto = +2% + (+1%) = +3%`

Conclusão: **não existe uma entrada fixa nem uma saída fixa da estratégia**. Existe uma trajetória de `S_entrada(t)` e `S_saída(t)`, e cada operador escolhe quais pontos dessa trajetória aceita como entrada e saída. O mesmo mercado pode produzir PnL bruto diferente para operadores diferentes sem violar a identidade:

```
PnL_bruto = S_entrada(t₀_do_operador) + S_saída(t₁_do_operador)
```

Isso é exatamente por que a estratégia é um framework de decisão, não uma regra universal. A matemática é fixa; os thresholds e o timing são pessoais.

### 3.4 Múltiplas oportunidades dentro da mesma trajetória

Em uma janela temporal, não existe uma única oportunidade absoluta. Existem múltiplas oportunidades possíveis definidas por pares `(t₀, t₁)`: o instante em que o operador decide travar `S_entrada(t₀)` e o instante futuro em que decide realizar `S_saída(t₁)`.

Dois operadores podem observar a mesma rota e obter resultados diferentes porque escolhem pares temporais diferentes. A incerteza vem da trajetória futura de `S_saída(t)`: parte é estimável por histórico e calibração, parte permanece incerta.

Por isso a estratégia é probabilística e dependente do critério do operador, não uma regra fixa. Conceitualmente, se o tempo fosse contínuo, haveria infinitos pares `(t₀, t₁)` possíveis dentro de uma janela; na prática, o scanner observa ciclos discretos, então há muitas combinações finitas.

```
oportunidade = escolher um t₀ de entrada + escolher um t₁ de saída
lucro_bruto = S_entrada(t₀) + S_saída(t₁)
```

### 3.4.1 O paradoxo dos múltiplos pares possíveis

A ideia acima cria um paradoxo aparente:

> Se existem muitos pares legítimos `(t₀, t₁)` dentro da mesma trajetória, então qual é "a" oportunidade correta?

A resposta é: **não existe uma oportunidade correta absoluta em hindsight**. Existe uma decisão tomada com a informação disponível em `t₀`. O operador não escolhe o melhor par da trajetória inteira — isso exigiria conhecer o futuro. O operador escolhe se a entrada observada agora merece ser travada e qual zona de saída futura seria aceitável para aquela entrada.

Esse ponto é essencial para não transformar a estratégia num problema impossível de "oracle". Em retrospecto, sempre será possível olhar a curva inteira e dizer que havia um `t₀` melhor ou um `t₁` melhor. Mas isso não invalida a decisão original, porque a decisão original não prometia ser o melhor par ex post; ela prometia ser uma decisão defensável **point-in-time**.

Exemplo:

- Em `t₀`, a rota mostra `S_entrada(t₀) = +2.00%`.
- Com base no histórico disponível até `t₀`, o operador considera aceitável mirar `S_saída >= -1.00%`.
- A recomendação implícita é: `lucro_bruto alvo = +2.00% + (-1.00%) = +1.00%`.

Cinco minutos depois, a mesma rota pode mostrar `S_entrada = +3.00%`. Isso não torna a decisão de `t₀` logicamente falsa. Significa apenas que surgiu uma **nova oportunidade** dentro da mesma trajetória. A recomendação anterior só foi ruim se, no agregado, decisões daquele tipo forem cedo demais, mal calibradas ou economicamente fracas.

Portanto, a pergunta correta nunca é:

```
Qual foi a melhor entrada e a melhor saída possíveis olhando o futuro inteiro?
```

A pergunta correta é:

```
Dado apenas o que era conhecido em t₀, fazia sentido recomendar entrada agora?
E qual saída-alvo era defensável para essa entrada?
```

Essa é a ponte conceitual entre a estratégia manual e qualquer modelo de recomendação: o modelo não deve tentar descobrir o melhor par absoluto `(t₀, t₁)` da trajetória completa. Ele deve implementar uma regra de decisão em `t₀`, auditável depois por calibração, precisão e utilidade econômica.

### 3.5 Pré-condição operacional: inventário pré-posicionado

A identidade de PnL pressupõe que **as duas pernas são abertas em t₀** (mesmo instante, ou tão próximo quanto possível). Isso só é viável se o capital necessário **já está pré-posicionado nas duas venues antes do trade** — não há tempo para ver a oportunidade, transferir fundos, e então abrir. O tempo de transferência on-chain (minutos a horas, dependendo do ativo e da rede) é várias ordens de magnitude maior que a meia-vida típica de uma oportunidade (segundos a minutos), e a transferência também expõe o capital a risco de preço durante o trânsito.

Implicações operacionais:

- **Capital total em jogo é multiplicado pelo número de venues cobertas.** Se o operador quer poder operar qualquer rota entre 5 venues, precisa de capital pré-posicionado em todas as 5, mesmo sabendo que em qualquer instante só uma rota está sendo operada.
- **Capital "ocioso" é estrutural, não desperdício.** O capital parado em cada venue esperando uma oportunidade aparecer ali é o custo de manter a optionality de operar qualquer rota.
- **Rebalanceamento é um problema separado.** Conforme trades acontecem, o inventário de cada venue se desbalanceia (uma esvazia ativo, outra esvazia caixa). Eventualmente é preciso transferir para rebalancear — e isso é um custo recorrente que erode o retorno líquido agregado da estratégia.

---

## 4. A heurística humana de decisão de entrada — regra de dois testes

Uma oportunidade observada em t₀ com `S_entrada(t₀)` alto **não basta**. O operador humano, antes de abrir, abre o histórico das últimas ~24h da rota e aplica dois testes complementares:

O nome "regra de dois testes" é didático, porque descreve o que o operador faz na prática. Em linguagem mais formal, o mesmo processo pode ser chamado de **critério de decisão point-in-time em dois estágios**:

1. primeiro se avalia se a entrada atual é excepcional para a própria rota;
2. depois se avalia se existe uma saída futura plausível para essa entrada.

Esses testes são separados no sentido econômico — perguntam coisas diferentes — mas não são independentes no sentido estatístico estrito. `S_entrada` e `S_saída` vêm dos mesmos quatro preços e se movem de forma anti-correlacionada (§2). A separação é conceitual: o primeiro teste pergunta se vale travar a entrada; o segundo pergunta se essa entrada tem caminho realista de saída.

### Teste 1 — Qualidade da entrada
`S_entrada(t₀)` está na cauda superior da sua própria distribuição histórica recente?

Operacionalmente: o spread de entrada atual está significativamente acima da média/mediana das últimas 24h da rota? Se a média típica é 0.2% e o atual é 5%, o teste passa folgado. Se a média típica é 4% e o atual é 5%, o teste *praticamente não passa* — o "5%" é normal para essa rota, não é oportunidade.

### Teste 2 — Exequibilidade da saída
A trajetória histórica de `S_saída` passa por valores favoráveis o suficiente, e com frequência suficiente?

A pergunta concreta é: olhando para as últimas 24h dessa rota, **em que fração do tempo o `S_saída` esteve em valores que, somados ao `S_entrada(t₀)` atual, dariam o lucro que eu quero?** Se o `S_saída` quase nunca sobe acima de um certo nível, a janela de saída lucrativa quase nunca aparece — entrar é apostar que algo atípico aconteça.

### Por que os dois testes precisam passar

**Falha no Teste 1 isolada**: o spread de entrada atual é apenas um preço normal disfarçado de oportunidade — provavelmente reverte rápido sem te dar tempo/PnL.

**Falha no Teste 2 isolada**: o spread de entrada parece atraente mas a janela de saída quase nunca aparece — esse é o cenário de **armadilha de saída**: você abre, fica preso, e acaba fechando no prejuízo ou no zero a zero depois de pagar custo de oportunidade. Spread de entrada de 5% numa rota cujo spread de saída quase nunca sobe acima de −4% é exatamente esse caso.

### Como os dois testes resolvem o paradoxo

A regra de dois testes é a versão humana da solução do paradoxo dos múltiplos pares (§3.4.1).

O **Teste 1** escolhe se o `t₀` atual merece consideração. Ele não pergunta se este é o melhor `t₀` do dia; pergunta se, com o histórico disponível agora, a entrada atual está suficientemente fora do normal.

O **Teste 2** transforma esse `t₀` aceito numa região de saídas aceitáveis. Ele não pergunta qual será o melhor `t₁` possível; pergunta se existe probabilidade razoável de algum `t₁` futuro atingir a zona que torna o trade bom o suficiente.

Em forma compacta:

```
Teste 1: S_entrada(t₀) está alto o bastante para esta rota?
Teste 2: existe chance suficiente de S_saída(t₁) alcançar a zona necessária dentro do horizonte?
```

Ou, numa formulação mais quantitativa:

```
passa_T1  ⇔  S_entrada(t₀) está na cauda superior da distribuição recente da rota
passa_T2  ⇔  P[∃ t₁ ∈ (t₀, t₀+H] tal que S_entrada(t₀) + S_saída(t₁) ≥ alvo] é suficiente
```

O operador humano faz isso de modo aproximado, olhando o gráfico e aplicando experiência. Um modelo de recomendação deve fazer a mesma decomposição de modo explícito: `enter` é o spread observado em `t₀`; `exit` é uma saída-alvo probabilística; `P` é a probabilidade calibrada dessa saída ser atingida; `T` é o tempo esperado; `IC` é a incerteza honesta.

Por isso `exit` não deve ser interpretado como a saída ótima absoluta da trajetória. É apenas o threshold de saída recomendado para a entrada atual. Se depois aparece uma entrada melhor, isso é uma nova oportunidade; se o sistema recomenda cedo demais repetidamente, isso é erro de calibração e precisão, não contradição da estratégia.

### 4.1 Paradoxos específicos da recomendação

Quando a regra de dois testes deixa de ser leitura humana e vira modelo, a recomendação precisa ser entendida como um **contrato probabilístico point-in-time**, não como ordem executada nem como prova retrospectiva de lucro. A pergunta correta é:

> dado apenas o histórico disponível antes de `t₀`, esta entrada atual merece recomendação ativa, qual zona de saída futura torna o trade aceitável, com qual `P`, qual `T` e qual `IC`?

Isso cria paradoxos adicionais que precisam ser ensinados separadamente:

1. **Paradoxo do oráculo retrospectivo.** No passado sempre é possível escolher o melhor par `(t₀,t₁)` depois de ver a trajetória inteira. Isso não é recomendação; é otimização com informação futura. O modelo só pode escolher em `t₀`, usando histórico anterior a `t₀`, e depois ser julgado pelo que ocorreu em `(t₀,t₀+H]`.

2. **Paradoxo da observação que se explica sozinha.** Se o snapshot atual entra no histórico antes da decisão, o Teste 1 fica contaminado: a entrada atual ajuda a calcular a própria normalidade. A ordem correta é `decidir -> congelar features de t₀ -> só depois observar t₀ como histórico para decisões futuras`.

3. **Paradoxo do fechamento instantâneo.** Usar `S_entrada(t) + S_saída(t)` no mesmo instante como label parece natural, mas pela identidade do §2 isso mede basicamente o custo cruzado imediato e tende a ser estruturalmente negativo. O label correto trava `S_entrada(t₀)` e procura `S_saída(t₁)` com `t₁ > t₀`.

4. **Paradoxo do alvo de saída.** `exit` no output do modelo não é a saída ótima que acontecerá nem uma ordem obrigatória. É uma região/threshold/quantil de saída compatível com a entrada atual. O operador ou sistema ainda pode fechar melhor, pior, antes ou nunca.

5. **Paradoxo marginal vs. condicional.** A frequência histórica de `S_saída` acima de um threshold é evidência útil para o Teste 2, mas não é automaticamente `P_hit` calibrado. `P_hit` precisa ser condicional ao estado em `t₀` e validado fora da amostra; se o modelo só tem proxy marginal, a recomendação deve ser marcada como degradada ou cautelosa.

6. **Paradoxo do candidato aceito.** Um gatilho de amostragem pode dizer "este snapshot deve entrar no dataset", mas isso não significa "recomendar trade", e também não é o label. O label só nasce quando o futuro da janela de avaliação resolve se a saída atingiu a zona necessária.

7. **Paradoxo da abstenção invisível.** Não recomendar é uma decisão informativa. `NO_OPPORTUNITY`, `INSUFFICIENT_DATA`, `LOW_CONFIDENCE`, `LONG_TAIL` e `COOLDOWN` têm significados diferentes; tratar todos como silêncio destrói a leitura operacional e as métricas de qualidade.

8. **Paradoxo da repetição.** A mesma rota pode aparecer em vários ciclos consecutivos quase iguais. Sem `valid_until`, cooldown ou deduplicação temporal, uma única oportunidade vira muitas recomendações pseudo-independentes e infla a confiança percebida.

9. **Paradoxo da censura.** Se a rota some, o par fica dormente ou a coleta termina antes do horizonte, não se deve chamar automaticamente de erro. O correto é separar `realized`, `miss` e `censored`; caso contrário, `P_hit` fica enviesado.

10. **Paradoxo do setup único.** Pode existir uma fronteira de Pareto entre lucro bruto, probabilidade e tempo: um setup conservador, um médio e um agressivo podem ser todos defensáveis. Emitir um único `TradeSetup` é uma escolha de política/utility, não uma verdade universal sobre a rota.

11. **Paradoxo observacional vs. intervencional.** O histórico mostra spreads cotados observados. Uma execução real pode alterar o preço efetivo, especialmente quando tamanho, latência e competição entram em cena. Por isso o scanner e a skill continuam trabalhando com spread bruto cotado; validação operacional real pertence a shadow mode e métricas pós-execução.

12. **Paradoxo do feedback.** Se o operador passa a seguir o modelo, os dados futuros podem refletir as próprias recomendações anteriores. O dataset precisa preservar metadados como `was_recommended` e separar avaliação em modo sombra, execução real e retreino.

Invariantes mínimos para uma implementação respeitar a skill:

```
em t₀:
  calcular S_entrada(t₀) e S_saída(t₀)
  consultar apenas histórico anterior a t₀
  decidir TradeSetup ou Abstain
  congelar entry_now = S_entrada(t₀)
  congelar features point-in-time

depois de t₀:
  observar S_saída(t₁), t₁ > t₀
  resolver first-hit dentro do horizonte H
  separar realized, miss e censored
  guardar best_exit retrospectivo apenas como auditoria, nunca como alvo primário
```

Esse bloco é a versão "nível modelo" da regra de dois testes: ele preserva a intuição humana, mas impede que o dataset ou a UI transformem hindsight, amostragem, repetição ou proxy marginal em recomendação forte.

### Por que ~24h, e não outra janela

A janela de 24h é **convencional**, não fundamental. Ela captura um ciclo intradiário completo de atividade (cripto opera 24/7, então 24h pega um dia inteiro de comportamento) sem ainda incluir muita variação de regime semanal (mudanças de funding, datas de unlock, eventos macro). É um compromisso entre amostra estatisticamente significativa e relevância para o regime atual.

A janela em si é **discricionária** (ver §5.2): em mercados muito voláteis o operador pode usar 6h ou 12h para responder mais rápido a mudanças de regime; em rotas mais estáveis pode estender para 7 dias para ter mais sinal estatístico. Não há resposta universal.

---

## 5. Parâmetros estruturais vs. discricionários — a fronteira não-negociável

> **Princípio fundamental**: a estratégia **não tem regra de lucro**. Tem uma **estrutura matemática rígida** (§3) parametrizada por **escolhas pessoais do operador**. Confundir as duas é o erro mais comum ao tentar formalizar ou ensinar a estratégia.

### 5.1 O que é estrutural (vem do mercado, não-negociável)

| Parâmetro | Origem |
|---|---|
| `ask_A`, `bid_A`, `ask_B`, `bid_B` em qualquer t | Order book das venues — é o estado do mundo |
| `S_entrada(t)`, `S_saída(t)` | Funções determinísticas dos quatro preços acima |
| Identidade de PnL `S_entrada(t₀) + S_saída(t₁)` | Tautologia contábil das quatro execuções |
| Custos (taker fee, withdrawal, funding por unidade de tempo) | Schedule de fees da venue |

Nada disso o operador "ajusta". Ou aceita ou não opera.

### 5.2 O que é discricionário (escolha pessoal, **NÃO são regras**)

Cada operador, cada conta, cada regime de mercado, cada tolerância a risco produz valores diferentes para todos os parâmetros abaixo. **Nenhum deles tem valor "correto" universal.**

| Parâmetro | Significado |
|---|---|
| Threshold de entrada | Qual `S_entrada(t₀)` mínimo justifica abrir |
| Janela de histórico para os Testes 1 e 2 | 6h? 12h? 24h (convencional)? 7d? Operador escolhe em função da volatilidade do regime e da estabilidade da rota |
| Critério do Teste 1 | Quão acima da média da janela precisa estar (percentil 90? 95? z-score 2? "muito acima a olho"?) |
| Critério do Teste 2 | Quão frequentemente o `S_saída` precisa visitar a zona favorável (20% do tempo? 50%? "razoável"?) |
| Meta de lucro bruto (`target_pnl`) | 0.5%? 2%? 5%? Ou nenhuma — sair quando "parecer bom" |
| Tempo máximo de hold | 30min? 4h? 24h? Sem limite? |
| Critério de stop-loss | Sair se `S_saída` cair abaixo de quê? Ou sem stop? |
| Critério de saída em si | Como decidir o `t₁` exato — meta atingida, reversão à mediana, intuição, regra de tempo, ou combinação |
| Tamanho da posição | Função do capital, da profundidade disponível e do risco percebido |

### 5.3 Implicações práticas — três permissões legítimas

Tudo abaixo é **legítimo** dentro da estratégia, mesmo que pareça "fora da regra":

- **Entrar agora sem teste algum**: o operador percebe um contexto que o histórico de 24h não captura (notícia, regime de volatilidade) e abre por intuição. Legítimo.
- **Sair agora sem ter atingido `target_pnl`**: precisa do capital, não confia mais no regime, ou simplesmente "tá bom o bastante". Legítimo.
- **Definir `target_pnl = 0%` e sair zerado**: o objetivo do trade era apenas liberar capital ou rebalancear. Legítimo.

A estratégia é um **framework de decisão**, não um algoritmo. As decisões finais (entrar agora? sair agora?) são, e devem permanecer, do operador.

---

## 6. Riscos não modelados pela identidade de PnL bruto

A fórmula `PnL = S_entrada(t₀) + S_saída(t₁)` é, como o nome diz, **bruta**. O PnL líquido subtrai uma série de termos, e existem riscos que nem se materializam como custo direto — eles aparecem como variância do retorno ou como cenário de cauda:

### 6.1 Custos diretos
- **Taker fee** em A (entrada e saída) + taker fee em B (entrada e saída) = quatro fees por trade
- **Funding acumulado** durante `[t₀, t₁]` quando alguma perna é perpetual (pode ser custo ou crédito, dependendo da direção)
- **Withdrawal/transfer fee** se for necessário rebalancear inventário entre venues

### 6.2 Custos de carrego
- Capital alocado em **duas venues simultaneamente** durante todo o hold (custo de oportunidade)
- **Margem requerida** quando há perna em perp

### 6.3 Riscos não-custos (entram como variância ou cauda)
- **Risco de execução** (*legging risk*): as duas pernas raramente são preenchidas no mesmo instante; se uma preenche e a outra não — ou preenche a um preço pior — o `S_entrada(t₀)` real diverge do cotado.
- **Risco de profundidade vs. tamanho** (*depth/slippage risk*): `S_entrada(t)` e `S_saída(t)` são calculados sobre o **top of book** (melhores bid/ask, com profundidade limitada). Operar tamanho maior que o disponível no topo significa "caminhar pelo book" — preencher a níveis sucessivamente piores, fazendo o `S_entrada` **realizado** ser pior que o `S_entrada` **cotado**. Esse efeito é silencioso (não aparece no scanner, que só vê o topo) e é função do tamanho da posição vs. a profundidade instantânea da rota. Em rotas com pouca profundidade, mesmo posições modestas podem destruir todo o spread.
- **Risco de inventário/transferência**: se o saldo numa venue acaba, é preciso transferir, e a janela de transferência expõe a preço.
- **Risco de venue**: halt, congelamento de saques, hack, manutenção não anunciada.
- **Risco de funding adverso** (se perp): a perna perpetual paga ou recebe funding em snapshots discretos (tipicamente a cada 8h, varia por venue). O sinal e a magnitude do funding dependem do **basis perp-spot global do ativo**, não do trade do operador:
  - Perna perp **short** + funding **positivo** (caso típico em mercado em alta) → operador **recebe** → soma ao PnL
  - Perna perp **short** + funding **negativo** (mercado em baixa) → operador **paga** → erode o PnL
  - (Sinais invertidos se a perna perp for long em vez de short)
  
  Para holds curtos (minutos) o funding é desprezível. Para holds que cruzam um ou mais snapshots de funding, vira termo material — pode somar ou subtrair na ordem de ±0.01% a ±0.1% por snapshot em condições normais, e bem mais em regimes extremos. Holds longos em rotas perp/spot precisam tratar funding como termo de primeira ordem do PnL líquido, não como ruído.
- **Risco de divergência permanente**: o spread pode **não** reverter — o regime estrutural mudou (delisting iminente, problema de wallet, news idiossincrática) e o operador fica preso até o stop ou o tempo máximo de hold.

Esses riscos são exatamente o motivo pelo qual mesmo um `S_entrada(t₀)` extremo, com Teste 2 forte, **não garante** PnL positivo. A estratégia é estatística, não livre de risco — opera na expectativa, não na certeza.

---

## 7. Glossário operacional

- **Rota** — quíntupla `(symbol, venue_compra, venue_venda, tipo_compra, tipo_venda)`. Unidade básica de tracking e decisão.
- **Oportunidade** — instância de uma rota num timestamp t com `S_entrada(t)` que passa pelos filtros do operador.
- **Travar a entrada** — abrir as duas pernas simultaneamente, fixando `S_entrada(t₀)` permanentemente como contribuição à identidade de PnL.
- **Janela de saída favorável** — qualquer intervalo de tempo durante o qual `S_saída(t)` está em valores que, somados ao `S_entrada(t₀)` travado, satisfazem a meta do operador.
- **Spread de entrada** — função `S_entrada(t) = (bid_B(t) − ask_A(t)) / ref(t)` — quão lucrativo é abrir agora (positivo grande = oportunidade).
- **Spread de saída** — função `S_saída(t) = (bid_A(t) − ask_B(t)) / ref(t)` — quão lucrativo é fechar agora (negativo profundo = ruim, perto de zero ou positivo = bom).
- **Armadilha de saída** — rota com `S_entrada` historicamente alto mas `S_saída` quase nunca favorável: parece oportunidade, na prática prende o operador.
- **Identidade de PnL bruto** — `PnL = S_entrada(t₀) + S_saída(t₁)`. Não é heurística, é tautologia contábil.
