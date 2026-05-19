# CLAUDE.md

Norte do projeto. Leitura obrigatória antes de qualquer tarefa.


## Pré-requisito obrigatório: skills canônicas

Antes de qualquer tarefa envolvendo scanner, dataset, ML, labels, baseline, recomendação, entrada, saída, spread, oportunidade, rota ou arbitragem, é **obrigatório** ler e aplicar a skill:

1. `.claude/skills/spread-arbitrage-strategy/SKILL.md`
2. Se a primeira não estiver disponível: `.agents/skills/spread-arbitrage-strategy/SKILL.md`

Essa skill é o conhecimento crítico canônico da estratégia. Ela define a matemática correta de `S_entrada(t)`, `S_saída(t)`, `PnL_bruto = S_entrada(t0) + S_saída(t1)`, a diferença entre entrada/saída variáveis, a discricionariedade do operador e a separação entre estratégia, scanner e ML.

Para tarefas envolvendo dataset, schema, labels, coleta, features, sampling ou treino, também é obrigatório ler e aplicar:

1. `.claude/skills/spread-arbitrage-dataset/SKILL.md`
2. Se a primeira não estiver disponível: `.agents/skills/spread-arbitrage-dataset/SKILL.md`

Nenhum agente deve propor schema, feature, label, baseline, métrica, filtro, gate ou alteração de código relacionado ao ML sem antes checar se a proposta respeita essas skills. Se houver conflito entre uma interpretação genérica de ML/trading, este arquivo e uma skill canônica, a skill vence.

Importante: a skill também descreve riscos operacionais da estratégia, mas isso **não** autoriza colocar taker fees, slippage, funding, posição, margem, stop, execução parcial ou PnL líquido no objetivo, label, função de perda ou gate do ML. Para este projeto, a skill deve ser usada para preservar o objetivo bruto conceitual: entrada cotada, saída-alvo, lucro bruto, probabilidade, tempo e incerteza.

Para formato público de recomendação, nomes de campos, badges, gates, validade, `ExitTargetPolicy`, curva de candidatos, metadados de modelo/calibração, dedupe/cooldown e semântica de `P`, `T` e `IC`, a fonte canônica é **somente** `docs/ml/07_decision_policy/trade_recommendation_output_contract_v2_3.json`. Se este `CLAUDE.md` e o contrato v2.3 divergirem sobre output, o contrato v2.3 vence.

---

## Três camadas. Não misture.

| Camada | Natureza | Estado |
|---|---|---|
| **Estratégia** | Cross-exchange convergence arbitrage em cripto (SPOT/PERP e PERP/PERP; **nunca** SPOT/SPOT — é outra família) | Documento conceitual canônico na skill |
| **Scanner** | Rust. Detector de spread bruto top-of-book, 14 streams WS, 11 venues, ~2600 rotas, broadcast a 150 ms | Pronto, 90/90 testes, em operação |
| **Modelo ML** | Consome o stream do scanner e produz recomendação calibrada conforme contrato público v2.3 | Em construção; Waves 1–3 de pesquisa parcialmente concluídas em `docs/ml/` |

Scanner não é modelo. Modelo não é scanner. Estratégia é a teoria que ambos servem.

---

## Contexto atual

O scanner Rust já detecta em tempo real 400–2600 oportunidades simultâneas de arbitragem cross-exchange em cripto (SPOT/PERP e PERP/PERP, nunca SPOT/SPOT — essa é outra família). Para cada oportunidade ele emite `entrySpread(t)` e `exitSpread(t)` atuais. Hoje o operador humano precisa olhar manualmente o histórico de ~24h da rota, decidir se o spread atual é realmente bom, ter uma ideia de onde a saída vai chegar, e então executar.

## O gap a preencher

O scanner mostra spread cru. Não diz se vale a pena entrar. Não diz em que valor sair. Não diz se a saída vai realmente chegar onde precisa. Não diz em quanto tempo. Esse é o trabalho mental que o operador faz hoje olhando o histórico da rota — e é exatamente essa etapa que o modelo ML deve automatizar.

---

## Objetivo do modelo (único e central)

### O que o modelo realmente substitui

O modelo deste projeto não existe para "prever mercado" de forma genérica. Ele existe para **substituir a etapa humana de abrir o histórico da rota, comparar o spread atual com esse histórico e transformar essa leitura em uma recomendação concreta e calibrada**.

Hoje o operador faz isso manualmente dezenas ou centenas de vezes por dia: vê a rota, observa o `entrySpread(t0)` e o `exitSpread(t0)` atuais, compara com o comportamento recente da rota, julga se a entrada atual está realmente forte ou apenas normal para aquela rota, estima uma saída-alvo possível e decide se vale entrar. Parte desse processo é análise; parte é heurística; parte é discricionariedade baseada em experiência.

O scanner já responde: **"há um spread agora"**. O modelo deve responder: **"esse spread atual, comparado ao histórico point-in-time desta rota, merece recomendação ativa agora? Se sim, qual leitura calibrada deve ser emitida no contrato público v2.3?"**

### Formulação operacional do objetivo

Para cada rota `r` e para cada instante `t0`, o objetivo do modelo é converter **estado atual + histórico disponível até `t0` da própria rota** em uma recomendação calibrada no domínio de spread bruto:

Conceitualmente: entrada cotada em `t0`, saída-alvo, lucro bruto alvo, probabilidade, tempo até evento e incerteza.

onde:

- a entrada é `S_entrada(t0)` observado/cotado no instante da recomendação e aceito pelo modelo como entrada válida agora;
- a saída-alvo é um threshold de `S_saída(t1)` recomendado para essa entrada e para esse estado atual;
- o lucro bruto é sempre calculado no domínio de spread bruto cotado;
- a probabilidade, o tempo até evento e a incerteza devem ser empiricamente calibrados e auditáveis.

O mapeamento público desses conceitos para nomes de campos, estruturas aninhadas, thresholds, gates, badges, intervalos, validade e semântica de UI/serving pertence exclusivamente ao contrato v2.3: `docs/ml/07_decision_policy/trade_recommendation_output_contract_v2_3.json`.

Importante: entradas e saídas são variáveis. Não existe um par único universalmente correto de `enter` e `exit` para uma rota. Como a skill mostra, diferentes operadores podem entrar e sair em pontos distintos da mesma trajetória e obter PnL diferentes sem violar a estratégia.

Portanto, o objetivo do modelo **não** é acertar a melhor entrada e a melhor saída absolutas em hindsight, nem 100% das vezes. Isso exigiria conhecer a trajetória futura completa e, no limite, escolher entre muitos pares possíveis `(t0, t1)`, o que é problema de oracle, não de previsão.

A solução correta para esse paradoxo é esta: os valores numéricos emitidos pelo modelo devem ser entendidos como **targets recomendados no instante `t0`**, e não como descrição da melhor entrada ou da melhor saída absolutas da trajetória completa. O problema econômico real admite muitos pares possíveis `(t0, t1)`, mas o modelo não tenta identificar o melhor par ex post. Ele implementa uma **regra de decisão em `t0`** que transforma uma trajetória potencialmente infinita em uma recomendação operacional finita, calibrada e auditável.

O objetivo correto é outro: em cada instante `t0`, usando apenas o histórico disponível até `t0` da própria rota, avaliar se a entrada observada agora merece recomendação. Quando houver evidência suficiente, o modelo deve emitir uma recomendação concreta e calibrada conforme o contrato v2.3. A saída-alvo não significa a saída única ou ótima em sentido absoluto; significa uma **saída-alvo recomendada**, condicional à entrada atual e ao estado atual da rota.

### EntryContextT0 para leitura da entrada

`EntryContextT0` é a forma segura de expor a ideia de `entry_quality`: um diagnóstico point-in-time e decomponível da força relativa de `S_entrada(t0)` contra o histórico da própria rota. Ele responde apenas se a entrada atual parece excepcional ou normal para aquela rota.

`EntryContextT0` não é label, não é gate de recomendação, não é `P_hit`, não escolhe `exit_target` e não substitui os componentes crus de `FeaturesT0`. Ele pode usar ranks, distâncias contra mediana/p95, escala robusta, cobertura de histórico e tempo vivo, sempre calculados antes de atualizar o cache com a observação de `t0`. Exequibilidade da saída (`p_exit_ge_label_floor_minus_entry_*`) permanece separada como Teste 2.

### ExitTargetPolicy para output operacional único

Coleta e primeiro treino não precisam escolher um `exit_target` único. O primeiro trainer pode operar em modo **EstimatorOnly**: estimar, por `floor` e horizonte, `P_hit`, `T`, `P_censor`, quantis e `IC`, sem declarar uma utility final.

Quando o contrato público ou a UI exigir um setup primário único, a escolha de `exit_target` deve ser feita por uma `ExitTargetPolicy` versionada, conforme a skill canônica. A policy escolhe entre candidatos já estimados usando fronteira de Pareto e função de utilidade bruta declarada sobre lucro bruto, probabilidade, tempo, censura e incerteza.

Essa escolha é decisão operacional auditável, não label novo e não verdade universal da rota. O dataset deve permitir treinar e auditar múltiplos floors/horizontes; a policy decide qual setup apresentar como primário (`conservador`, `balanceado` ou `agressivo`, quando aplicável). Trocar a policy muda a recomendação, não a identidade matemática da estratégia nem os labels históricos.

Se minutos depois surgir uma entrada ainda melhor, isso caracteriza uma **nova oportunidade** dentro da mesma trajetória, não uma contradição lógica da recomendação anterior. Ainda assim, o modelo continua sendo cobrado empiricamente por precisão, calibração e utilidade econômica: recomendar cedo demais de forma recorrente continua sendo erro do modelo.

Abstenção continua sendo resposta válida e obrigatória quando não houver oportunidade suficientemente forte, evidência suficiente ou confiança suficiente. O modelo não deve forçar recomendação em todo snapshot; deve recomendar apenas quando a oportunidade atual, comparada ao histórico point-in-time da rota, justificar convicção operacional.

### Output público

O output público, incluindo payload de replay, UI/serving, nomes de campos, badges, abstenções, validade, curva de candidatos, `ExitTargetPolicy`, metadados de modelo/calibração, dedupe/cooldown e semântica de probabilidade/tempo/incerteza, é definido exclusivamente em:

`docs/ml/07_decision_policy/trade_recommendation_output_contract_v2_3.json`

Este `CLAUDE.md` não deve duplicar exemplos de payload, linha de UI, lista de badges ou convenções de campo. Ele mantém apenas o norte conceitual: o operador deve receber uma leitura estruturada da oportunidade atual que substitua a consulta manual ao histórico, com rigor estatístico e sem oracle de hindsight. Qualquer mudança no output público deve ser feita primeiro no contrato v2.3 ou em versão posterior do contrato, e só depois refletida aqui como referência.

### O que o modelo deve aprender, e o que ele não deve aprender

O modelo deve aprender a responder, para a rota atual:

1. se o `entrySpread(t0)` atual está forte ou fraco em relação ao histórico recente da própria rota;
2. se a dinâmica histórica da rota e o estado atual tornam defensável uma saída-alvo suficientemente favorável;
3. qual combinação de entrada cotada e saída-alvo produz uma recomendação economicamente interessante em termos de **lucro bruto cotado**;
4. com qual probabilidade e em qual horizonte essa recomendação tende a se realizar;
5. quando deve **abster-se** por falta de oportunidade, evidência ou confiança.

O modelo não deve aprender nem otimizar execução, taxa, funding, slippage, margem, posição, rebalanceamento, fill, stop ou PnL líquido. Esses temas pertencem à operação humana e ficam explicitamente fora da fronteira do ML.

### Consequência epistemológica importante

A estratégia não possui uma entrada única universal nem uma saída única universal. Existem múltiplos pares legítimos `(t0, t1)` ao longo da trajetória da rota. Portanto, o objetivo do modelo não é descobrir "a resposta correta absoluta" da oportunidade, mas produzir uma recomendação útil, calibrada e defensável para o estado atual observado.

O modelo deve, portanto, imitar a parte válida da discricionariedade humana sem herdar sua informalidade: transformar comparação histórica + julgamento de exequibilidade em recomendação quantitativa calibrada.

O alvo supervisionado principal do sistema deve ser falsificável sem oracle de hindsight por trade individual. Variáveis hindsight/oracle podem existir para auditoria e pesquisa, mas não devem definir o objetivo central do modelo.

A auditoria do modelo deve ser feita no agregado, e não por comparação per-trade contra um par ótimo ex post. O modelo é avaliado pela qualidade da recomendação emitida no estado disponível em `t0`: calibração verifica se o `P` reportado coincide com a frequência empírica observada; o reliability diagram verifica a consistência dessa calibração ao longo dos diferentes níveis de confiança; e o intervalo de confiança é avaliado pela sua cobertura empírica em relação à cobertura nominal. Nenhuma dessas métricas exige conhecer a melhor saída possível da trajetória completa. Elas exigem apenas verificar se a recomendação emitida em `t0` se realizou, ou não, dentro do horizonte declarado.

O modelo orbita em torno desse output — **é o objetivo máximo, tudo deve girar em torno dele**.

---

## Critérios de qualidade inegociáveis

- **Precision-first**: falso positivo é catastrófico (operador abre e fica preso). Recall baixo é aceitável — melhor perder 70% das oportunidades e ter 95% de precisão nos 30% emitidos do que o contrário.
- **Calibração rigorosa**: se o modelo diz 80% de probabilidade, ~80% dos trades precisam realizar-se empiricamente (ECE baixa, reliability diagram calibrado).
- **Abstenção é resposta válida**: sem confiança suficiente, não emitir nada — melhor silêncio do que ruído. Tipos públicos de abstenção pertencem ao contrato v2.3.
- **Honestidade sobre lucro bruto**: o modelo não pode viciar em micro-spreads do tipo `enter 0.3%, exit −0.2%, lucro 0.1%` com P=95%. Floor econômico obrigatório no design da função de utilidade, mas sempre como filtro/penalização sobre **lucro bruto cotado**. Não transformar isso em cálculo de PnL líquido.

Detalhamento das 12 armadilhas críticas (T1–T12) em `plans/ml_stack_research_prompt.md` §3.5 e `docs/ml/02_traps/`.

---

## Escopo fechado

O modelo automatiza **apenas a avaliação e recomendação da oportunidade bruta**. Execução de ordens, dimensionamento de posição, stop-loss, quando fechar efetivamente, rebalanceamento entre venues, cálculo de PnL líquido (fees/funding/slippage) — tudo isso continua 100% humano. O operador confia no número do modelo e executa; o resto é problema dele.

### Fronteira explícita do ML

O modelo ML **não** deve modelar nem otimizar taker fees, maker fees, slippage, funding, withdrawal fees, tamanho de posição, margem, liquidação, stop-loss, rebalanceamento, execução parcial, latência de ordem, fill probability ou PnL líquido. Esses temas existem na estratégia/operação, mas ficam fora do objetivo do modelo.

O único objetivo do ML é responder se a oportunidade de spread bruto merece recomendação agora: `enter`, `exit`, `lucro bruto = enter + exit`, `P`, `T`, e intervalo de confiança. O risco que o ML controla é apenas o risco de **recomendação errada**: baixa probabilidade de realização, má calibração, pouca evidência, baixa confiança ou lucro bruto insuficiente. Nesses casos, a saída correta é abstenção.

### Dataset mínimo correto para treinar o ML

`AcceptedSample` no instante `t0` **não é label supervisionado**. É apenas candidato de entrada. Para treinar o objetivo central, o dataset precisa ter, para cada candidato, observações futuras suficientes para reconstruir `exitSpread(t1)`, `lucro bruto = entry(t0) + exit(t1)`, `realizou/não realizou`, `tempo até realização T`, e censura quando a rota desaparece antes do horizonte.

O stream de ML não pode depender apenas das oportunidades emitidas para UI (`entrySpread >= threshold`). Depois de uma entrada válida, a saída pode melhorar quando `entrySpread` já caiu abaixo do threshold. Portanto, a coleta correta deve alimentar o ML com observações válidas da rota também abaixo do threshold de UI, preservando point-in-time: primeiro decide/recomenda usando histórico anterior, depois atualiza o histórico com a observação corrente.

São necessários para treino: `entrySpread`, `exitSpread`, rota, mercados, símbolo canônico, timestamps, volumes como filtros de qualidade, decisão de amostragem, versão do scanner, histórico prévio point-in-time, labels futuros de lucro bruto e splits temporais/por rota/venue com embargo. Métricas de qualidade/freshness do book pertencem à observabilidade operacional da coleta, não ao objetivo, label ou feature set central do modelo. Não são necessários no label/modelo: taker fee, maker fee, slippage, funding, stop, posição, margem, execução parcial ou PnL líquido.

O label supervisionado principal deve ser falsificável dentro de um horizonte declarado, com censura quando a rota deixar de ser observável antes do horizonte. Variáveis hindsight/oracle, como melhor saída observada em retrospecto, podem existir para auditoria e pesquisa, mas não devem definir o objetivo central nem a função de perda principal do modelo.

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

Quando o operador olhar uma recomendação emitida conforme o contrato público v2.3 e conseguir executar com convicção **sem precisar consultar o histórico manualmente**, o sistema venceu. Se o modelo também souber **abster-se corretamente** quando não houver evidência suficiente, melhor ainda. Esse é o norte. Todo o resto é meio.
