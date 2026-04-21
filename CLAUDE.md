# CLAUDE.md

Norte do projeto. Leitura obrigatória antes de qualquer tarefa.


## Pré-requisito obrigatório: skill da estratégia

Antes de qualquer tarefa envolvendo scanner, dataset, ML, labels, baseline, recomendação, entrada, saída, spread, oportunidade, rota ou arbitragem, é **obrigatório** ler e aplicar a skill:

1. `.claude/skills/spread-arbitrage-strategy/SKILL.md`
2. Se a primeira não estiver disponível: `.agents/skills/spread-arbitrage-strategy/SKILL.md`

Essa skill é o conhecimento crítico canônico da estratégia. Ela define a matemática correta de `S_entrada(t)`, `S_saída(t)`, `PnL_bruto = S_entrada(t0) + S_saída(t1)`, a diferença entre entrada/saída variáveis, a discricionariedade do operador e a separação entre estratégia, scanner e ML.

Nenhum agente deve propor schema, feature, label, baseline, métrica, filtro, gate ou alteração de código relacionado ao ML sem antes checar se a proposta respeita essa skill. Se houver conflito entre uma interpretação genérica de ML/trading e a skill, a skill vence.

Importante: a skill também descreve riscos operacionais da estratégia, mas isso **não** autoriza colocar taker fees, slippage, funding, posição, margem, stop, execução parcial ou PnL líquido no objetivo, label, função de perda ou gate do ML. Para este projeto, a skill deve ser usada para preservar o objetivo bruto: `enter`, `exit`, `lucro bruto`, `P`, `T` e `IC`.

---

## Três camadas. Não misture.

| Camada | Natureza | Estado |
|---|---|---|
| **Estratégia** | Cross-exchange convergence arbitrage em cripto (SPOT/PERP e PERP/PERP; **nunca** SPOT/SPOT — é outra família) | Documento conceitual canônico na skill |
| **Scanner** | Rust. Detector de spread bruto top-of-book, 14 streams WS, 11 venues, ~2600 rotas, broadcast a 150 ms | Pronto, 90/90 testes, em operação |
| **Modelo ML** | Consome o stream do scanner e produz recomendação calibrada de TradeSetup | Em construção; Waves 1–3 de pesquisa parcialmente concluídas em `docs/ml/` |

Scanner não é modelo. Modelo não é scanner. Estratégia é a teoria que ambos servem.

---

## Contexto atual

O scanner Rust já detecta em tempo real 400–2600 oportunidades simultâneas de arbitragem cross-exchange em cripto (SPOT/PERP e PERP/PERP, nunca SPOT/SPOT — essa é outra família). Para cada oportunidade ele emite `entrySpread(t)` e `exitSpread(t)` atuais. Hoje o operador humano precisa olhar manualmente o histórico de ~24h da rota, decidir se o spread atual é realmente bom, ter uma ideia de onde a saída vai chegar, e então executar.

## O gap a preencher

O scanner mostra spread cru. Não diz se vale a pena entrar. Não diz em que valor sair. Não diz se a saída vai realmente chegar onde precisa. Não diz em quanto tempo. Esse é o trabalho mental que o operador faz hoje olhando o histórico — e é exatamente o que o modelo ML deve automatizar.

---

## Objetivo do modelo (único e central)

Para cada rota, em cada momento, uma recomendação concreta e calibrada:

> **Entre em X%, saia em Y%, lucro bruto = X + Y%, probabilidade de realização = P, tempo esperado até saída = T minutos, IC 95% = [P_low, P_high].**

Exemplos no formato que o operador consome:

- `BP mexc:FUT → bingx:FUT`: entre a **2.00%**, saia a **−1.00%**, **lucro 1.00% bruto**, P = **83%**, ~**28 min**, IC [77%, 88%]
- `IQ bingx:FUT → xt:FUT`: entre a **2.00%**, saia a **+1.00%**, **lucro 3.00% bruto**, P = **41%**, ~**2h15**, IC [32%, 51%]
- `GRIFFAIN gate:SPOT → bingx:FUT`: entre a **0.50%**, saia a **−0.30%**, **lucro 0.20% bruto**, P = **72%**, ~**6 min**, IC [65%, 79%]

O modelo orbita em torno desse output — **é o objetivo máximo, tudo deve girar em torno dele**.

---

## Critérios de qualidade inegociáveis

- **Precision-first**: falso positivo é catastrófico (operador abre e fica preso). Recall baixo é aceitável — melhor perder 70% das oportunidades e ter 95% de precisão nos 30% emitidos do que o contrário.
- **Calibração rigorosa**: se o modelo diz 80% de probabilidade, ~80% dos trades precisam realizar-se empiricamente (ECE baixa, reliability diagram calibrado).
- **Abstenção é resposta válida**: sem confiança suficiente, não emitir nada — melhor silêncio do que ruído. Distinguir três tipos: `NO_OPPORTUNITY`, `INSUFFICIENT_DATA`, `LOW_CONFIDENCE`.
- **Honestidade sobre lucro bruto**: o modelo não pode viciar em micro-spreads do tipo `enter 0.3%, exit −0.2%, lucro 0.1%` com P=95%. Floor econômico obrigatório no design da função de utilidade, mas sempre como filtro/penalização sobre **lucro bruto cotado**. Não transformar isso em cálculo de PnL líquido.

Detalhamento das 12 armadilhas críticas (T1–T12) em `plans/ml_stack_research_prompt.md` §3.5 e `docs/ml/02_traps/`.

---

## Escopo fechado

O modelo automatiza **apenas a detecção e recomendação**. Execução de ordens, dimensionamento de posição, stop-loss, quando fechar efetivamente, rebalanceamento entre venues, cálculo de PnL líquido (fees/funding/slippage) — tudo isso continua 100% humano. O operador confia no número do modelo e executa; o resto é problema dele.

### Fronteira explícita do ML

O modelo ML **não** deve modelar nem otimizar taker fees, maker fees, slippage, funding, withdrawal fees, tamanho de posição, margem, liquidação, stop-loss, rebalanceamento, execução parcial, latência de ordem, fill probability ou PnL líquido. Esses temas existem na estratégia/operação, mas ficam fora do objetivo do modelo.

O único objetivo do ML é responder se a oportunidade de spread bruto merece recomendação agora: `enter`, `exit`, `lucro bruto = enter + exit`, `P`, `T`, e intervalo de confiança. O risco que o ML controla é apenas o risco de **recomendação errada**: baixa probabilidade de realização, má calibração, pouca evidência, baixa confiança ou lucro bruto insuficiente. Nesses casos, a saída correta é abstenção.

### Dataset mínimo correto para treinar o ML

`AcceptedSample` no instante `t0` **não é label supervisionado**. É apenas candidato de entrada. Para treinar o objetivo central, o dataset precisa ter, para cada candidato, observações futuras suficientes para reconstruir `exitSpread(t1)`, `lucro bruto = entry(t0) + exit(t1)`, `realizou/não realizou`, `tempo até realização T`, e censura quando a rota desaparece antes do horizonte.

O stream de ML não pode depender apenas das oportunidades emitidas para UI (`entrySpread >= threshold`). Depois de uma entrada válida, a saída pode melhorar quando `entrySpread` já caiu abaixo do threshold. Portanto, a coleta correta deve alimentar o ML com observações válidas da rota também abaixo do threshold de UI, preservando point-in-time: primeiro decide/recomenda usando histórico anterior, depois atualiza o histórico com a observação corrente.

São necessários para treino: `entrySpread`, `exitSpread`, rota, mercados, símbolo canônico, timestamps, qualidade/freshness do book, volumes como filtros de qualidade, decisão de amostragem, versão do scanner, histórico prévio point-in-time, labels futuros de lucro bruto e splits temporais/por rota/venue com embargo. Não são necessários no label/modelo: taker fee, maker fee, slippage, funding, stop, posição, margem, execução parcial ou PnL líquido.

**Stack default Rust.** Python tem burden-of-proof (gap Rust >2× provado ou biblioteca inexistente).

---

## Scanner — invariantes

- Localização: `scanner/`. WS → book write **p99 < 500 µs**. Zero alocação no hot path após warmup.
- Emite por rota `r = (symbol, buyFrom, sellTo, buyType, sellType)`:
  - `entrySpread(t) = (bid_sell − ask_buy) / ref × 100`
  - `exitSpread(t)  = (bid_buy  − ask_sell) / ref × 100`
- **Detector, não calculadora.** Não computa fees, funding, slippage ou PnL líquido. Jamais misturar essas variáveis no scanner.

Identidade estrutural: `S_entrada(t) + S_saída(t) = −(bid_ask_A + bid_ask_B) / ref(t)` — soma no mesmo instante é sempre negativa.

---

## Leitura obrigatória antes de qualquer tarefa

1. `.claude/skills/spread-arbitrage-strategy/SKILL.md` — aula canônica da estratégia. Sem isso, o resto não faz sentido.
2. Este `CLAUDE.md`.
3. Tarefa de **scanner** → `scanner/README.md` + código relevante em `scanner/src/`.
4. Tarefa de **modelo ML** → `plans/ml_stack_research_prompt.md` + `docs/ml/11_final_stack/` (STACK, ROADMAP, OPEN_DECISIONS) + `docs/ml/01_decisions/` (ADRs) + `docs/ml/02_traps/` (T01–T12).

---

## Red flags (se pensar isso, pare)

- "Vou calcular PnL líquido no scanner" → scanner é detector; rever.
- "O modelo decide quando sair" → decisão humana.
- "Recall > precision" → invertido.
- "É pairs trading" → pairs trading opera ativos distintos; aqui é o mesmo ativo em duas venues.
- "Modelo emite joint via marginais multiplicadas" → trap T2.
- "Micro-spread com P=95% é ótimo" → trap T1 (reward hacking).
- "Spread típico é 0.05–0.2%" → isso vale para top-5; o regime operado é longtail 0.3–4%.
- "Python é padrão para ML" → default é Rust; justifique Python com número.
- "SPOT/SPOT também entra" → outra família (transfer arbitrage); fora de escopo.

---

## Critério de sucesso

Quando o operador olhar uma recomendação `{enter, exit, lucro, P}` do modelo e conseguir executar com convicção sem precisar consultar o histórico manualmente, o sistema venceu. Esse é o norte. Todo o resto é meio.
