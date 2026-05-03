# Perguntas Sobre Rotas, Labels, Entry Locked e Quantis

Data: 2026-05-02

Este documento consolida as respostas sobre o dataset de arbitragem de spread cross-venue: como uma rota e aceita, como o `entry_locked` vira uma simulacao de entrada, como o sistema decide se deu green, quais horizontes existem, quantos labels podem ficar pendentes simultaneamente e como os quantis atuais devem ser interpretados.

## 1. Objetivo Final Entendido

O objetivo final nao e criar um modelo perfeito. Em mercado real, perfeicao nao existe: o regime muda, rotas somem, liquidez muda, a execucao real pode divergir do top-of-book e parte dos eventos fica censurada.

O objetivo correto e construir um modelo que substitua a etapa humana de abrir a rota, olhar o historico e decidir se aquela oportunidade merece entrada agora.

Para cada rota no instante `t0`, usando apenas informacao disponivel ate `t0`, o modelo deve responder:

```text
Vale recomendar entrada agora ou e melhor abster?
```

Se valer, a saida esperada do modelo deve ter este formato operacional:

```text
{
  enter_now,
  exit_target,
  lucro_bruto_alvo,
  P,
  T,
  IC,
  p_censor
}
```

Significado:

- `enter_now`: o `entry_spread(t0)` atual, tratado como entrada travada.
- `exit_target`: o nivel minimo de `exit_spread(t1)` que precisa ser atingido no futuro.
- `lucro_bruto_alvo`: `enter_now + exit_target`.
- `P`: probabilidade calibrada de atingir o alvo dentro do horizonte.
- `T`: tempo esperado ou distribuicao ate atingir o alvo.
- `IC`: intervalo de confianca/incerteza.
- `p_censor`: probabilidade ou risco de a rota sumir antes da janela fechar.

O modelo nao substitui a operacao completa do humano. Ele nao decide tamanho de posicao, ordem real, fill, taxa, funding, slippage, margem, stop, rebalanceamento ou PnL liquido. Ele substitui a leitura estatistica da oportunidade bruta.

## 2. O Que E Uma Rota

A unidade correta nao e apenas o simbolo. A unidade e a rota direcionada:

```text
(symbol, buy_venue, sell_venue, buy_market, sell_market)
```

Exemplos de rotas diferentes:

```text
BTC-USDT | MEXC SPOT    -> Binance FUTURES
BTC-USDT | MEXC FUTURES -> Binance FUTURES
BTC-USDT | Binance FUTURES -> MEXC FUTURES
ETH-USDT | MEXC SPOT    -> Binance FUTURES
```

Cada uma dessas rotas tem historico proprio. O historico de `BTC-USDT | MEXC -> Binance` nao mistura com `ETH-USDT | MEXC -> Binance`, nem com a direcao invertida `BTC-USDT | Binance -> MEXC`.

## 3. Como Uma Rota E Validada Pelo Scanner

Antes de virar qualquer coisa de ML, a rota precisa ser mecanicamente valida para a estrategia.

Regras principais:

- As venues de compra e venda precisam ser diferentes.
- Nao pode ser `SPOT -> SPOT`.
- A perna de venda nao pode ser `SPOT`; vender spot exigiria inventario do ativo na venue de venda.
- A perna vendida precisa ser `FUTURES/PERP`.
- Os books precisam estar vivos, sem stale.
- `bid` e `ask` precisam ser positivos e validos.
- O volume 24h das duas pernas precisa passar o minimo configurado.
- `entry_spread` e `exit_spread` nao podem ser absurdos, acima de `max_spread_pct`.

Exemplo valido:

```text
BTC-USDT
buy:  MEXC SPOT
sell: Binance FUTURES

ask_buy  = 100.00
bid_sell = 102.00

entry_spread = (102.00 - 100.00) / 100.00 = +2.00%
```

Exemplo invalido:

```text
buy:  MEXC FUTURES
sell: Binance SPOT
```

Isso e rejeitado porque vender spot exigiria ter o ativo na venue de venda. Esta nao e a familia de estrategia do dataset.

## 4. Como Cada Ponto De Observacao E Criado

A cada ciclo do scanner, aproximadamente a cada `150 ms`, a rota produz uma observacao se estiver valida.

O scanner olha quatro precos:

```text
buy_bid
buy_ask
sell_bid
sell_ask
```

Com esses quatro precos calcula:

```text
entry_spread = quanto seria favoravel abrir agora
exit_spread  = quanto seria favoravel fechar agora
```

Exemplo:

```text
A = venue onde compro
B = venue onde vendo

A bid = 99.90
A ask = 100.00
B bid = 103.00
B ask = 103.20
```

Calculo:

```text
entry_spread = (103.00 - 100.00) / 100.00 = +3.00%
exit_spread  = (99.90 - 103.20) / 100.00 = -3.30%
```

Observacao gravada:

```text
timestamp: t
route: BTC-USDT | A -> B
entry: +3.00%
exit:  -3.30%
```

O sistema nao soma todos os pontos como se fosse saldo. Ele guarda a distribuicao historica da rota: mediana, P95, percentil do entry atual, frequencia de exit favoravel e outros sinais point-in-time.

## 5. Quando Os Spreads Mudam

Os spreads mudam sempre que muda algum dos quatro precos:

```text
buy_bid
buy_ask
sell_bid
sell_ask
```

Se o `sell_bid` sobe, o `entry_spread` tende a melhorar, porque voce venderia mais caro.

Se o `buy_bid` sobe ou o `sell_ask` cai, o `exit_spread` tende a melhorar, porque fechar a posicao ficaria menos caro.

Exemplo de evolucao:

```text
t0:
entry_spread = +3.00%
exit_spread  = -3.30%

t1:
entry_spread = +0.80%
exit_spread  = -1.00%
```

Para quem ainda nao entrou, a oportunidade piorou: `entry` caiu. Para quem entrou em `t0`, a saida melhorou: `exit` subiu de `-3.30%` para `-1.00%`.

Essa e a mecanica central da estrategia.

## 6. Existe Historico De Entry E De Exit

Sim. O historico da rota guarda as duas series:

```text
entry_spread historico
exit_spread historico
```

O historico de `entry` responde:

```text
Esta entrada atual esta forte em relacao ao passado da propria rota?
```

O historico de `exit` responde:

```text
Essa rota costuma permitir uma saida que daria green depois da entrada?
```

Por isso, um `entry` alto sozinho nao basta. Uma rota pode ter entrada bonita, mas historicamente nunca entregar uma saida suficiente. Isso e a armadilha de saida.

## 7. O Que Significa Rejeitado Por Nao Estar Na Cauda

"Cauda" significa que o `entry_spread` atual precisa estar entre os maiores valores recentes daquela rota.

No codigo atual, o trigger compara o `entry_spread` atual contra o P95 historico da rota.

Exemplo rejeitado:

```text
Historico 24h da rota:
entry P50 = 0.80%
entry P95 = 2.40%

Agora:
entry atual = 1.30%
```

Mesmo sendo positivo, `1.30%` e normal para essa rota. Entao:

```text
sample_decision = below_tail
```

Exemplo aceito:

```text
Historico 24h da rota:
entry P95 = 2.40%

Agora:
entry atual = 2.90%
```

Como `2.90% >= 2.40%`:

```text
sample_decision = accept
```

`below_tail` nao significa que o dado e lixo. Significa que aquele ponto nao virou candidato forte de entrada. Ele ainda pode alimentar historico, resolver labels pendentes ou servir como background, dependendo de onde entrou no pipeline.

## 8. O Que E Accepted Sample

Um sample e aceito pelo trigger quando passa pelos gates principais:

- dado limpo por volume;
- `entry_spread > 0`;
- historico minimo da rota;
- `entry_spread` atual acima da cauda historica configurada, hoje P95.

Exemplo:

```text
Rota: MEXC FUTURES -> BingX FUTURES

entry atual = +2.80%
exit atual  = -2.95%

Historico da rota:
n_observations = 900
entry P95 = +2.40%

Como:
n_observations >= 500
entry atual >= P95

sample_decision = accept
```

Na auditoria feita em 2026-05-02, o primeiro `accept` apareceu cerca de 25,7 minutos apos o inicio do raw. O tempo teorico minimo pode ser menor, mas depende da rota acumular historico suficiente e depois aparecer uma entrada acima da cauda.

## 9. Entry Locked Como Simulacao De Entrada

`entry_locked` e a simulacao de que voce entrou naquele instante `t0`.

Em termos do dataset, a pergunta vira:

```text
Se eu tivesse entrado neste t0 com esse entry_spread, teria dado green depois?
```

Exemplo:

```text
t0:
entry_locked = +3.00%
label_floor  = +0.80%
```

`label_floor` e o lucro bruto minimo que o projeto considera green.

Para dar green, o `exit_spread` futuro precisa satisfazer:

```text
entry_locked + exit_spread(t1) >= label_floor
```

Reorganizando:

```text
exit_spread(t1) >= label_floor - entry_locked
exit_spread(t1) >= 0.80% - 3.00%
exit_spread(t1) >= -2.20%
```

Ou seja, se depois da entrada a saida chegar em `-2.20%` ou melhor, o trade simulado deu green.

## 10. Exemplo De Green

Entrada simulada:

```text
t0:
entry_locked = +3.00%
label_floor  = +0.80%
exit_target  = -2.20%
```

Depois:

```text
t1:
exit_spread = -1.70%
```

Lucro bruto:

```text
lucro_bruto = entry_locked + exit_spread
lucro_bruto = 3.00% + (-1.70%)
lucro_bruto = +1.30%
```

Como `1.30% >= 0.80%`:

```text
outcome = realized
```

## 11. Exemplo De Miss

Entrada simulada:

```text
t0:
entry_locked = +3.00%
label_floor  = +0.80%
exit_target  = -2.20%
```

Melhor saida observada dentro do horizonte:

```text
exit_spread = -2.60%
```

Lucro bruto:

```text
lucro_bruto = 3.00% + (-2.60%)
lucro_bruto = +0.40%
```

Como `0.40% < 0.80%`:

```text
outcome = miss
```

## 12. Exemplo De Censored

Entrada simulada:

```text
t0:
entry_locked = +3.00%
horizon = 1h
```

Se a rota para de produzir observacoes limpas antes de completar a janela de 1h, o sistema nao sabe se teria dado green ou nao.

Nesse caso:

```text
outcome = censored
```

Censored nao deve ser tratado como miss automaticamente. Na literatura de survival analysis, censura precisa ser modelada ou tratada explicitamente. Kaplan-Meier e Cox sao as referencias classicas para esse tipo de problema.

## 13. Qual Tempo Definido Para A Saida

Existem dois tempos diferentes no sistema atual.

### 13.1 Tempo De Validade Da Recomendacao

O baseline A3 atual emite recomendacao com validade curta:

```text
valid_for_s = 30 segundos
```

Isso significa: a recomendacao exibida agora nao deve ser considerada fresca depois de 30 segundos.

Isso nao e o mesmo que horizonte de green.

### 13.2 Horizontes Do Label

O label supervisionado usa multiplos horizontes:

```text
15 min  = 900s
30 min  = 1800s
1h      = 3600s
2h      = 7200s
4h      = 14400s
8h      = 28800s
```

Para cada horizonte, a pergunta e:

```text
Dentro deste tempo, o exit_spread atingiu o alvo necessario para dar green?
```

Exemplo com `entry_locked = +3.00%` e `label_floor = +0.80%`:

```text
exit_target = -2.20%
```

Resultados possiveis:

```text
15m: miss
30m: miss
1h: realized
2h: realized
4h: realized
8h: realized
```

Isso significa que a saida nao apareceu nos primeiros 30 minutos, mas apareceu antes de 1h.

## 14. Quantos Entry Locked Sao Feitos Simultaneamente

Nao existe apenas um `entry_locked` global. Cada candidato limpo acima do threshold operacional pode criar um novo `PendingLabel` com seu proprio `entry_locked`.

Unidade:

```text
(rota, t0, sample_id)
```

Um mesmo `entry_locked` pode carregar varios horizontes ao mesmo tempo:

```text
sample_id = abc
entry_locked = +3.00%

horizons:
15m
30m
1h
2h
4h
8h
```

Ao mesmo tempo, milhares de rotas podem ter labels pendentes. O codigo usa uma fila por rota e um limite de seguranca:

```text
max_pending_per_route = 10_000
```

Para evitar labels quase identicos demais, existe stride por horizonte. O stride efetivo e:

```text
effective_stride = max(label_stride_s, horizon_s / 10)
```

Com `label_stride_s = 60s`, os strides aproximados sao:

```text
15m:  90s
30m:  180s
1h:   360s
2h:   720s
4h:   1440s
8h:   2880s
```

Intuicao: o sistema tenta manter aproximadamente 10 eventos independentes por horizonte e por rota, em vez de gerar um label novo a cada 150 ms para a mesma rota.

Exemplo:

```text
Rota BTC-USDT | MEXC FUT -> BingX FUT
horizon = 15m
stride efetivo = 90s
```

Em uma janela de 15 minutos, a rota pode ter por volta de 10 `entry_locked` pendentes para esse horizonte:

```text
t0
t0 + 90s
t0 + 180s
...
t0 + 810s
```

Isso reduz autocorrelacao e evita que o dataset conte varias vezes a mesma oportunidade praticamente igual.

## 15. P50, P95 E Outros Quantis No Codigo Atual

O codigo atual usa `HotQueryCache` por rota, com:

- janela principal de 24h;
- janela curta de 1h;
- janela longa de 7d;
- histogramas `entry_hist` e `exit_hist`;
- `hdrhistogram`;
- decimacao no cache de features, por padrao 1 em 10 para a janela 24h;
- decimacao mais grossa para 7d.

O sistema calcula, entre outros:

```text
entry_p50_24h
entry_p95_24h
exit_p50_24h
exit_p95_24h
entry_rank_percentile_24h
p_exit_ge_label_floor_minus_entry_24h
```

O P95 usado pelo trigger e calculado por rota, sobre o historico point-in-time anterior ao ponto atual. Isso e correto conceitualmente porque evita usar o futuro ou o proprio ponto atual como evidencia.

## 16. Os Quantis Atuais Sao A Forma Mais Precisa E Simples Possivel?

Resposta curta: sao simples e rapidos para tempo real, mas nao sao a forma mais precisa possivel.

Eles sao bons como cache operacional de baixa latencia. Nao sao, sozinhos, o padrao ideal para auditoria estatistica final ou treino offline.

### 16.1 O Que Esta Bom

Pontos fortes:

- Sao por rota, nao globais.
- Sao point-in-time: primeiro consulta historico, depois atualiza com o ponto atual.
- Ha historico de entry e exit.
- Ha janelas 1h, 24h e 7d.
- O histograma e reconstruido quando amostras expiram, evitando manter dado vencido.
- O desenho e rapido o bastante para rodar dentro do scanner.

### 16.2 O Que Nao E O Maximo De Precisao

Limites:

- `hdrhistogram` entrega quantis aproximados por buckets, nao quantis exatos.
- A decimacao do cache faz os quantis serem estimativas da serie completa.
- A decimacao sequencial 1-em-10 pode introduzir erro se houver periodicidade alinhada com o ciclo.
- O P95 atual nao declara uma definicao tipo Hyndman-Fan de quantil amostral, porque e um quantil de histograma.
- O erro relevante nao e so numerico. Em series financeiras autocorrelacionadas, muitas observacoes proximas nao equivalem a muitas observacoes independentes.

### 16.3 O Que A Literatura Diz

Hyndman e Fan mostram que ate o conceito de quantil amostral tem varias definicoes usadas por softwares estatisticos. Portanto, para treino/auditoria, o projeto deve declarar explicitamente qual definicao offline usa.

Greenwald-Khanna e KLL tratam quantis em stream com garantias de erro de rank. KLL e especialmente importante porque e um sketch quase otimo em memoria para quantis aproximados.

t-digest e forte para estimar quantis, especialmente nas caudas, com sketches pequenos e mergeaveis.

`hdrhistogram` e muito pratico para monitoramento e percentis de baixa latencia, mas sua garantia principal e precisao de valor por buckets configuraveis, nao erro formal de rank como GK/KLL.

### 16.4 Recomendacao Pratica

Para tempo real:

```text
HotQueryCache + hdrhistogram esta aceitavel como baseline operacional.
```

Para treino e auditoria offline:

```text
Recalcular p50, p95, ranks e frequencias diretamente do raw/parquet por rota,
com janela point-in-time aberta em t0, usando quantil exato ou sketch com erro declarado.
```

Melhorias possiveis:

- Aumentar `sigfig` do `hdrhistogram` se memoria permitir.
- Auditar erro do histograma contra quantil exato em amostras reais.
- Trocar decimacao sequencial por amostragem deterministica hash-based por observacao.
- Para treino offline, usar sort/exact quantile por janela quando viavel.
- Para stream de longo prazo, avaliar KLL ou t-digest com politica clara para janela rolante.
- Reportar sempre `n_cache_observations_at_t0` e cobertura temporal real da janela.

Conclusao: a implementacao atual e adequada para MVP e serving em tempo real, mas a etapa PhD de treino deve recalcular ou validar os quantis offline. Se o modelo final for julgado por P, T e IC, os quantis do cache nao devem ser aceitos sem uma auditoria de erro contra a serie bruta.

## 17. Como Saber Se Deu Green

A regra e sempre:

```text
entry_locked + exit_spread(t1) >= label_floor
```

Onde:

- `entry_locked` vem do momento de entrada simulada `t0`;
- `exit_spread(t1)` vem do futuro;
- `label_floor` e o lucro bruto minimo definido;
- `t1` precisa estar dentro do horizonte avaliado.

Exemplo:

```text
entry_locked = +2.50%
label_floor  = +0.80%

exit_target = 0.80% - 2.50% = -1.70%
```

Se em ate 30m o exit chega em `-1.50%`:

```text
2.50% + (-1.50%) = +1.00%
outcome@30m = realized
```

Se em 30m nao chega, mas em 1h chega:

```text
outcome@30m = miss
outcome@1h  = realized
```

## 18. O Que Ja Da Para Analisar Com Pouca Coleta

Com poucas horas, ja da para analisar:

- se as identidades matematicas estao fechando;
- se `entry + exit <= 0` no mesmo tick;
- se labels nao realizam em `t0`;
- se `first_hit` esta dentro da janela;
- se accepted samples existem;
- se o pipeline raw, accepted e labeled esta gravando.

Ainda nao da para concluir:

- que o modelo substitui o humano com confianca;
- que `P` esta calibrado;
- que `T` esta confiavel;
- que o P95 de 24h representa um ciclo inteiro;
- que features 7d estao maduras.

Minimos praticos:

```text
Primeira analise estrutural: algumas horas
Historico 24h real: pelo menos 24h continuas
Treino inicial defensavel: 48h a 72h
Features 7d maduras: 7 dias
```

## 19. Checklist De Auditoria Antes De Treinar

Antes de treino real:

- Verificar que existem labels `accept` em todos os horizontes relevantes.
- Separar `accept`, `below_tail` e `insufficient_history`.
- Nao tratar `censored` como `miss`.
- Recalcular ou auditar p50/p95 offline contra raw.
- Usar split temporal com purge/embargo.
- Avaliar por horizonte, nao so agregado.
- Usar metricas precision-first.
- Controlar autocorrelacao e overlap de labels.
- Verificar monotonicidade: `P(realized@15m) <= P(realized@30m) <= ...`.
- Nunca usar `audit_hindsight_*` como target principal.

## 20. Referencias Tecnicas

- Makarov e Schoar, 2020, Journal of Financial Economics: cross-exchange arbitrage em cripto.
- Hautsch, Scheuch e Voigt, 2024, Review of Finance: limites a arbitragem em cripto.
- Lopez de Prado, 2018, Advances in Financial Machine Learning: triple-barrier labeling, leakage, purge e embargo.
- Kaplan e Meier, 1958, Journal of the American Statistical Association: estimacao com observacoes incompletas.
- Cox, 1972, Journal of the Royal Statistical Society B: modelos de regressao para survival/life tables.
- Hyndman e Fan, 1996, The American Statistician: definicoes de quantis amostrais.
- Greenwald e Khanna, 2001, SIGMOD: quantile summaries em stream com garantias.
- Karnin, Lang e Liberty, 2016, FOCS/arXiv: KLL, quantile sketch quase otimo.
- Dunning e Ertl, 2019, arXiv: t-digest para quantis acurados, especialmente caudas.
- Saito e Rehmsmeier, 2015, PLOS ONE: precision-recall e mais informativo que ROC em datasets desbalanceados.

