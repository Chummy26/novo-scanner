---
name: spread-arbitrage-dataset
description: >-
  Use esta skill quando o assunto for projetar, auditar ou justificar o dataset histórico que treina o modelo de arbitragem de spread cross-venue descrito por `spread-arbitrage-strategy`. Cobre a distinção entre stream operacional e amostras supervisionadas, features point-in-time, labels multi-horizonte, censura à direita, separação `entry_locked` vs. saída estocástica, materialização dos Testes 1 e 2 da skill mãe, limites entre estrutura de mercado e escolha discricionária, riscos de leakage e efeitos no comportamento real-time do modelo. Depende da skill mãe; em conflito, a skill mãe vence. Não substitui um schema implementado.
---

# Dataset para Modelo de Arbitragem de Spread Cross-Venue — Aula de Referência

> Documento conceitual canônico do dataset que treina o modelo desta estratégia. Lê-se de cima para baixo como uma aula. Cada seção pode ser citada isoladamente. Esta skill **depende** de `spread-arbitrage-strategy` (referida como **skill mãe**); quando houver conflito, a skill mãe vence.

---

## 1. Classificação técnica do dataset

### 1.1 Posição taxonômica entre datasets de ML financeiro

Datasets de ML aplicados a mercado têm famílias bem distintas, e identificar onde este está e onde não está afasta a maior parte da confusão na hora de escolher protocolo de validação, splits, métricas e auditoria.

| Família | Unidade básica | Relação com este dataset |
|---|---|---|
| Tick-by-tick / order book replay | Tick microsegundo | Granularidade muito mais fina; objetivo distinto |
| OHLCV histórico | Barra | Granularidade grossa; ativo único |
| **Triple-barrier de eventos** | Evento `(rota, t₀)` com barreiras de retorno e tempo | **Família-mãe deste dataset** |

Posição: derivado da família triple-barrier (López de Prado 2018, *Advances in Financial Machine Learning*, cap. 3), com duas particularidades não triviais que o afastam da forma canônica e exigem tratamento próprio:

- **Multi-horizonte simultâneo** em vez de barreira temporal única (§3.4).
- **Multi-floor opcional** sobre o lucro bruto cotado em vez de barreira de retorno única (§5.2).

A consequência prática é que ferramentas que valem para uma família não valem automaticamente para outra. Um dataset OHLCV pode tolerar shuffle entre blocos de meses distintos com cuidado leve; aqui shuffle entre observações próximas no tempo da mesma rota produz leakage trivial via autocorrelação. Confundir família é confundir o que validar.

### 1.2 O que este dataset é

Este dataset é o **histórico que substitui, para um modelo, a leitura mental que o operador faz quando abre a rota e olha o passado dela** antes de decidir se entra. A skill mãe §4 descreve essa leitura como Teste 1 (qualidade da entrada) + Teste 2 (exequibilidade da saída) operando sobre o histórico recente da própria rota.

Cada amostra de supervisão codifica uma proposição falsificável: dada uma rota `r` num instante `t₀`, dada a observação atual `(S_entrada(t₀), S_saída(t₀))` e o histórico point-in-time disponível até `t₀`, e dado um horizonte `h` declarado de antemão, **isto é o que o operador veria se abrisse o histórico agora** (features), **e isto é o que de fato aconteceu** com `S_saída(t)` na janela `[t₀, t₀+h]` — `realized` se a saída visitou um valor favorável segundo critério declarado em `t₀`, `miss` se não visitou e a janela completou, `censored` se a rota deixou de ser observada antes da janela completar.

### 1.3 O que este dataset explicitamente NÃO é

- ❌ **Não é o stream operacional do scanner.** O scanner produz observações em alta cadência e serve UI/broadcast em tempo real; o dataset filtra, decima, congela features point-in-time, e anexa labels que só ficam disponíveis ao longo do tempo.
- ❌ **Não é dataset de execução nem de PnL líquido.** Não há `fill_price`, `slippage_realizado`, `taker_fee_paga`, `funding_recebido`, `pnl_liquido`. Esses pertencem a tracking de execução do operador específico (skill mãe §6).
- ❌ **Não é dataset oracle hindsight.** O target supervisionado primário deve ser falsificável em horizonte declarado a partir do estado em `t₀`. Hindsight pode coexistir em campos `audit_*` para auditoria/pesquisa, nunca na função de perda principal.
- ❌ **Não é dataset de imitação literal do operador.** O dataset rotula proposições falsificáveis sobre `S_saída` futuro, não "operador X entrou aqui" (§4.5).
- ❌ **Não é dataset de famílias adjacentes:** SPOT/SPOT (transfer arbitrage), arbitragem triangular intra-venue, latency arb HFT single-venue, funding-rate arbitrage pura, pairs trading clássico (skill mãe §1.4). Misturar amostras dessas famílias produziria viés categórico — granularidade, topologia ou sinal primário diferentes.
- ❌ **Não é survivorship-clean por sorte.** Rotas que delistam, halts, mudanças de ticker, listings novos: o dataset precisa ter representação explícita desses eventos para que o trainer não veja apenas sobreviventes (§7.2).

### 1.4 Relação com a skill mãe

Esta skill assume conhecimento da skill mãe. Tudo abaixo presume: definição de **rota** (skill mãe §1.1), álgebra de `S_entrada(t)` e `S_saída(t)` (§2), identidade contábil `PnL_bruto = S_entrada(t₀) + S_saída(t₁)` (§3), regra dos dois testes (§4), fronteira estrutural vs. discricionário (§5), riscos não modelados pelo PnL bruto (§6). Quando esta skill diz "skill mãe §X", é referência literal — abrir e ler.

---

## 2. Modelo das duas escalas — observação contínua vs. amostra de supervisão

A confusão mais cara na prática é tratar "uma linha do dataset" como conceito único. Não é. Existem duas escalas distintas, com unidade diferente, consumidor diferente, regra de validação diferente.

### 2.1 Observação contínua

A observação é uma tupla mínima `(rota, t, S_entrada(t), S_saída(t))` produzida pelo scanner a cada atualização relevante, acompanhada apenas por metadados necessários de amostragem, versão e lifecycle quando materializada. É a unidade que vive no streaming e a fonte do histórico.

Diagnósticos operacionais do scanner/UI não pertencem às features supervisionadas, ao label, nem ao objetivo do modelo. Volume 24 h pode existir fora de `features_t0` como metadado de filtro/amostragem, mas não como proxy de execução ou capacidade do book.

Propriedades estruturais:

- **Não-decimada conceitualmente.** Toda atualização válida da rota gera, em princípio, uma observação. Decimação é decisão de implementação para conter custo (§5.2), não propriedade da unidade.
- **Point-in-time honesta.** `S_entrada(t)` e `S_saída(t)` são funções determinísticas dos quatro preços naquele instante; nenhum termo dependente do futuro entra aqui.
- **Fonte do histórico.** Se a observação não foi gravada, qualquer feature point-in-time que dependa daquele intervalo fica indefinida.

### 2.2 Amostra de supervisão

A amostra é uma estrutura mais rica: `(rota, t₀, features point-in-time(t₀), horizonte h, label resolvido em [t₀, t₀+h])`. É a unidade que entra no treino.

Propriedades:

- **Snapshot congelado em `t₀`** — todas as features são derivadas exclusivamente do que era observável em `t₀` ou antes (§3.1).
- **Um ou mais horizontes simultâneos** com labels possivelmente diferentes (§3.4).
- **Outcome categorizado** dentro de cada horizonte: `realized`, `miss`, `censored` (§3.5).
- **Metadata de discricionariedade** (§5.3) — parâmetros do projeto sob os quais a amostra foi gerada. Sem isso, amostras de configurações diferentes acabam misturadas.

Uma observação pode virar zero, uma ou várias amostras dependendo da política de seleção.

### 2.3 Os três papéis funcionais

A separação observação/amostra implica três papéis funcionais distintos. Não precisam aparecer como três streams físicos separados, mas precisam existir como conceitos identificáveis.

**Papel 1 — histórico de observação contínua.** Responde *o que estava acontecendo em cada rota a cada instante*. Base sobre a qual qualquer feature point-in-time é reconstruída. Qualidade central é completude temporal.

**Papel 2 — conjunto de amostras candidatas.** Responde *quais momentos de observação merecem virar amostra de supervisão*. Critério de candidatura é decisão de design (§5.2); precisa ser **rastreável** — para cada amostra, o dataset precisa saber por qual critério foi candidatada e com qual probabilidade marginal de seleção.

**Papel 3 — conjunto de amostras rotuladas.** Responde *para cada candidato, dado horizonte `h` e critério, qual o outcome*. Rotular não é instantâneo: exige observar `[t₀, t₀+h]` por completo. Por isso amostras rotuladas chegam atrasadas em relação às candidatas.

### 2.4 Por que esses papéis não podem ser fundidos

Tentação frequente é fundir tudo num único stream e adiar rotulagem para tempo de treino. Aparentemente simplifica; quebra três coisas: **auditoria de candidatura** (a decisão fica fora do dataset, sem versionamento e sem probabilidade marginal acessível); **falsificabilidade do label em horizonte** (rotulagem ad-hoc no trainer pode misturar janelas observadas com janelas usadas como features); **censura à direita correta** (§3.5 só funciona se houver autoridade temporal explícita que decide outcome final). A regra prática: os três são entidades distintas com lifecycle distinto.

---

## 3. Identidades fundamentais (não-negociáveis)

Esta seção lista as identidades que **não podem ser negociadas** sem violar a estratégia ou a ciência por trás do treino. Cada uma tem justificativa explícita.

### 3.1 Point-in-time strict

**Identidade.** Toda feature anexada a uma amostra de `t₀` é função exclusiva de informação observável em instantes `t ≤ t₀`. Toda label de horizonte `h` é função exclusiva de informação observável em `t ∈ [t₀, t₀ + h]`.

**Ordem de operações em `t₀`.** A regra operacional não-ambígua que materializa point-in-time: **ler histórico → decidir/recomendar → atualizar histórico com a observação corrente**. Inverter a ordem (atualizar antes de ler) faz a feature de `t₀` incluir, por construção, o que ela deveria predizer. Esta ordem é aplicável tanto na coleta quanto no replay para treino.

**Sanity-check de coleta.** Toda observação limpa precisa satisfazer `S_entrada(t) + S_saída(t) ≤ 0` no mesmo instante (skill mãe §2: a soma é função pura da largura dos books — `−(bid_ask_A + bid_ask_B)/ref`, sempre não-positiva). Observação que viole essa identidade indica bug de coleta — pernas invertidas, parsing incorreto, clock skew — e não pode alimentar histórico nem candidatura.

**Armadilhas que a ordem de operações evita** (López de Prado 2018, cap. 7 trata como erro #1 em ML financeiro):

- **Quantil rolante "incluindo `t₀`".** Se o quantil 95 das últimas 24 h for calculado sobre janela fechada `[t₀ − 24h, t₀]`, e a observação corrente em `t₀` for a mais alta da janela, a feature "minha entry está em quantil X" sempre fica em quantil alto por construção em amostras candidatas.
- **Estatística global do dataset.** Normalizar `entry_spread` pela média global de toda a coleção é leak: o trainer vê o futuro da rota através da média global. Normalização precisa ser por rota dentro de janela point-in-time.
- **Cache atualizado por escrita-antes-leitura.** Mesma armadilha que a ordem de operações resolve, vista do lado do código: o cache que serve features para `t₀` precisa estar congelado no estado anterior à observação de `t₀`.

### 3.2 `entry_locked` é imutável; `exit` é estocástico

**Identidade.** Em cada amostra de `t₀`, `S_entrada(t₀)` é registrado como `entry_locked` e tratado como **constante imutável** dali em diante. O label depende exclusivamente de `S_saída(t)` para `t ∈ [t₀, t₀+h]`.

Origem: skill mãe §3.1. Uma vez que o operador trava a entrada, `ask_A(t₀)` e `bid_B(t₀)` viram preços executados, não cotados. Nada que aconteça em `t > t₀` muda esses dois números na contabilidade do trade. O único grau de liberdade restante é **quando** decidir fechar.

Consequência operacional clara: **`S_entrada(t)` para `t > t₀` é ignorado pelo label**. Se o `S_entrada` melhorar mais tarde, isso caracteriza outra oportunidade — uma nova amostra com novo `t₀` e novo `entry_locked`, não retroalimentação na amostra original. Tentar simular "entrada futura" no label mistura dois trades distintos e quebra a identidade contábil de PnL bruto.

### 3.3 Label nunca é "melhor saída ex-post"

**Identidade.** O target supervisionado primário **não é** a melhor saída observada na trajetória futura. É a resolução, dentro de horizonte declarado, de uma proposição falsificável definida em `t₀`.

Skill mãe §3.3 e §3.4 estabelecem que existem múltiplos pares `(t₀, t₁)` legítimos na mesma trajetória; descobrir o par ótimo ex-post é problema de oracle, não de previsão. O modelo é avaliado pela qualidade da recomendação emitida em `t₀`, com o estado disponível em `t₀`.

Forma operacional: para cada amostra de `t₀` com horizonte `h` e critério declarado em `t₀` (e.g., "existe `t ∈ [t₀, t₀+h]` com `S_saída(t) ≥ exit_threshold`"), o label resolve `realized` se a proposição é verdadeira na janela observada, `miss` se é falsa e a janela completou, `censored` se a janela não completou.

Hindsight tem lugar como **auditoria offline** em campos `audit_*` — comparar o que o modelo emitiu com o que a trajetória completa permitia, estudar fronteira de Pareto. Nada disso entra em função de perda nem como feature, sob pena de viciar o modelo em direção ao oracle e colapsar a generalização.

### 3.4 Multi-horizonte é estrutural, não opcional

**Identidade.** O dataset codifica resolução em múltiplos horizontes simultâneos por amostra candidata, não em horizonte fixo único.

Justificativa: skill mãe §5.2 lista tempo máximo de hold como parâmetro discricionário do operador. Diferentes operadores, diferentes regimes, diferentes tolerâncias produzem horizontes diferentes. Reduzir a horizonte fixo único: (i) treina modelo apenas para essa escala, sem calibração para vizinhas; (ii) destrói informação que a estratégia tem por construção sobre como `S_saída` evolui em escalas diferentes; (iii) força retreino do zero quando o horizonte de interesse muda.

Implicações operacionais:

- **Unidade rotulada é `(amostra, horizonte)`**, não `amostra` sozinha. Uma amostra com `|H|` horizontes produz `|H|` registros.
- **Calibração reportada por horizonte.** Calibração agregada esconde modelos bem calibrados em `h₁` e mal calibrados em `h_k` cuja média parece aceitável.
- **Monotonicidade entre horizontes.** A estrutura de probabilidade cumulativa de hit-time exige `P(realize | h₁) ≤ P(realize | h₂)` para `h₁ ≤ h₂`. Modelos multi-output sem cabeça conjunta podem violar essa monotonicidade silenciosamente; auditoria de calibração deve verificá-la, e treino deve ou usar cabeça conjunta ou impor penalty de monotonicidade.

### 3.5 Censura à direita é primeira ordem

**Identidade.** Para cada amostra com horizonte `h`, o outcome é variável categórica de **três níveis** — `realized`, `miss`, `censored`. Não binária.

Censura é o caso em que `[t₀, t₀+h]` não foi completamente observada antes da rota deixar de produzir observações limpas. Skill mãe §6 lista risco de venue e divergência permanente como riscos do trade — esses riscos têm correspondente direto no dataset.

Tratar censurados como `miss` enviesa `P(realize)` para baixo; tratar como `realized` enviesa para cima. Ambos quebram calibração. Tratar como categoria explícita preserva a indeterminação no schema e permite ao trainer aplicar a técnica certa — Kaplan & Meier 1958, *JASA* 53(282) é o tratamento original; Cox 1972, *JRSS-B* 34(2) generaliza para regressão. Subcategorias úteis para o tratamento (com regimes de censura distintos) ficam em §7.2 onde a textura de regime pertence.

### 3.6 Falsificabilidade

**Identidade.** Para uma amostra rotulada ser parte do dataset supervisionado, sua proposição precisa ser falsificável sem oracle de hindsight por trade individual.

Forma operacional: dado `(t₀, h, critério)` declarados em `t₀`, e dada a sequência observada em `[t₀, t₀+h]`, o outcome é decidível mecanicamente — função pura da janela e do critério. Sem juízo retrospectivo, sem comparação com par ótimo.

**Hipótese implícita.** A falsificabilidade assume que `t₀` corresponde a um instante operacionalmente acessível — skill mãe §3.3 estabelece como pré-condição que o capital esteja pré-posicionado nas duas venues simultaneamente. Rotas estruturalmente fora desse perímetro (uma das venues sem inventário possível, sem listing simultâneo, sem disponibilidade de margem) ficam fora da candidatura, não viram amostras com label inválido. Quando essa condição não pode ser identificada com certeza pelo coletor, a amostra entra mas a hipótese fica documentada na metadata.

Razões para esta identidade:

- **Reproduzibilidade** — dois processos de rotulagem independentes sobre o mesmo histórico produzem o mesmo outcome.
- **Auditabilidade** — para qualquer amostra `realized`, o dataset deve poder mostrar o instante exato e o valor de `S_saída` que disparou a realização (ver §6.1, campos `t_realize` e `S_saída_realize`).
- **Calibração** — métricas como ECE só fazem sentido contra labels falsificáveis; calibração contra labels de oracle é tautologia.

---

## 4. O que o dataset codifica da leitura mental do operador

A skill mãe §4 descreve a Regra de Dois Testes que o operador aplica antes de entrar. Esta seção mapeia esses testes para features e label.

### 4.1 Teste 1 (qualidade da entrada) → features de cauda

O Teste 1 pergunta se `S_entrada(t₀)` está na cauda superior da distribuição histórica recente da própria rota. Tradução exige duas escolhas:

- **Definição de "histórico recente".** Skill mãe §4 trata 24 h como convenção, não fundamento — janelas curtas para regimes voláteis, longas para rotas estáveis. O dataset não escolhe uma janela única e impõe; carrega features para múltiplas janelas paralelas e deixa o modelo aprender qual peso dar.
- **Métrica de cauda.** Quantil empírico (rank), z-score robusto (mediana + MAD) e distância para um percentil específico carregam informação não-redundante. Carregar pelo menos uma de **rank** e uma de **distância robusta** é prudência metodológica.

**Nota sobre o critério de candidatura.** Skill mãe §3.2 (Exemplo 3, `S_entrada=1%`, `S_saída=+1%`, PnL=2%) mostra que entradas modestas podem render lucro respeitável quando exit é favorável — o requisito é a soma positiva, não entry alto isolado. Critério de candidatura filtrado exclusivamente por percentil alto de `entry` perde essa região da distribuição. Critério deve ser tratado como hiperparâmetro com sensibilidade auditada, não fixado em quantil canônico.

Anti-padrões: **média + desvio-padrão como base de cauda** (distribuições de spread em longtail são fortemente assimétricas com caudas pesadas); **estatística da janela incluindo `t₀`** (§3.1).

### 4.2 Teste 2 (exequibilidade da saída) → features de exit + label

O Teste 2 pergunta se a trajetória histórica de `S_saída` passa por valores favoráveis com frequência suficiente, dado o `S_entrada(t₀)` atual. Skill mãe §4 dá a forma exata: "fração do tempo em que `S_saída` esteve em valores que, somados ao `S_entrada(t₀)` atual, dariam o lucro que eu quero".

**Como feature em `t₀`.** A invariante é que a feature carregue informação suficiente para responder à pergunta condicional `P_hist(S_saída ≥ y | rota, janela)` para qualquer `y` plausível, sem reabrir o histórico em treino. A forma de carregar essa informação é discricionária — pode ser grade pré-computada de `P_hist` em valores de `y`, pode ser ECDF amostrada, pode ser conjunto rico de quantis. O que não é discricionário é a invariante.

**Como label.** O outcome multi-horizonte é exatamente a realização empírica do Teste 2 na janela futura. A simetria entre feature (Teste 2 olhando para trás) e label (Teste 2 olhando para frente, sem oracle) é a essência do dataset.

### 4.3 Janela rolante por rota

Cada rota tem distribuição própria de entry, exit, frequência de visita a faixas favoráveis, autocorrelação. Tratar todas as rotas como amostras de uma única distribuição é erro caro — o regime de uma rota MEXC/BingX em token longtail é categoricamente diferente de uma rota Binance/Coinbase em top-5.

Implicação imediata: **features condicionais à rota são obrigatórias** — quantil, z-score, fração de visita, tudo calculado por rota dentro de janela point-in-time. Features cross-rota podem coexistir como complemento, não como substituto.

### 4.4 Abstenção como resposta válida

Skill mãe §5.2 trata "entrar agora" como decisão discricionária. O modelo herda a opção de abster-se: emitir "não há trade defensável agora" em vez de forçar recomendação. Para o dataset, **candidatura ≠ recomendação ≠ ação** — três entidades coexistem no schema:

- **Candidato** — passou no critério de candidatura (decisão do dataset).
- **Recomendação** — o que o modelo emitiu (`Trade(setup)` ou `Abstain(motivo)`).
- **Ação do operador**, se rastreada.

O target de qualidade é a realização do critério de label, não "operador entrou". Importante: **abstenção (decisão do modelo) não se confunde com `miss` (label do horizonte)**. Amostras em que o modelo se absteve permanecem no dataset com label resolvido normalmente; o que muda é que a decisão do modelo nessas amostras é `Abstain`, e isso é métrica (cobertura, calibração condicional), não label. Calibração de `P(realize | abstain)` é sinal valioso — é a base rate da população que o modelo decidiu não cobrir.

### 4.5 Substituir, não imitar

**Imitar** seria rotular cada amostra com "operador X entrou aqui". O modelo aprende a reproduzir comportamento humano específico, com vieses incluídos. **Substituir** é rotular com a realização empírica do critério em `t₀`, derivada do que aconteceu na janela futura, independente de ter ou não havido entrada humana. O dataset codifica a estrutura matemática rígida da skill mãe §5; as escolhas pessoais do operador entram como discricionárias no nível da função de utilidade do modelo (§5.2), não no nível do label.

---

## 5. Estrutural vs. discricionário — fronteira não-negociável

A skill mãe §5 estabelece a fronteira para a estratégia. Esta seção replica o exercício para o dataset.

### 5.1 Estrutural (não-negociável)

Lista exaustiva. Cada item é justificado por seções anteriores ou pela skill mãe.

- Existência da unidade `(rota, t₀)` como ponto de amostragem (skill mãe §1.1; §3.1).
- **Direção da rota como parte da identidade da rota** — `(buyFrom, sellTo)` orientado pelo lado do mispricing (skill mãe §2). Para recomendação ativa de `Trade`, `entry_locked < 0` não é entrada válida. Isso não torna a observação inválida para histórico contínuo, calibração de abstenção ou amostra `NO_OPPORTUNITY`: observações abaixo do threshold de UI continuam necessárias para reconstrução point-in-time e para ensinar o modelo a não recomendar.
- Separação observação contínua / candidato / amostra rotulada como três papéis funcionais (§2.3).
- Point-in-time strict com ordem de operações `ler → decidir → atualizar` (§3.1).
- Sanity-check de soma instantânea: `S_entrada(t) + S_saída(t) ≤ 0` para qualquer `t` em qualquer observação limpa (§3.1).
- `entry_locked` imutável ao longo da janela de label (§3.2).
- Label nunca como melhor saída ex-post; hindsight permitido apenas em `audit_*` (§3.3).
- Multi-horizonte como propriedade do dataset, com monotonicidade verificada (§3.4).
- Censura à direita representada como categoria do outcome (§3.5).
- Falsificabilidade do label primário, com hipótese implícita de acessibilidade operacional (§3.6).
- Identidade contábil `entry_locked + S_saída(t) = lucro bruto cotado` preservada (skill mãe §3).
- Fora do label: fees, funding, slippage, margem, posição, execução parcial, PnL líquido (skill mãe §6; §1.3).
- Features condicionais à rota (§4.3).
- Reprodutibilidade — para cada amostra, é possível reconstruir features e label a partir do histórico bruto e dos parâmetros declarados (§5.3).

Negociar qualquer ponto descaracteriza-o como dataset desta estratégia.

### 5.2 Discricionário (escolha do projeto)

Lista não-exaustiva. Cada parâmetro pode mudar entre fases; o dataset deve carregar metadata explícita do valor sob o qual cada amostra foi gerada (§5.3).

- **Janela de histórico** para features de cauda (Teste 1) — escala curta, longa, ou múltiplas em paralelo.
- **Conjunto de horizontes `H`** da rotulagem multi-horizonte — único requisito é que `H` cubra a faixa em que o trade é defensável.
- **Critério de candidatura** — combinação de volume 24 h mínimo como filtro de qualidade, histórico mínimo, percentil de cauda do entry, stride temporal, allowlist explícita.
- **Critério de realização do label** — função de `entry_locked` e piso operacional (`label_floor`) sobre lucro bruto cotado.
- **`label_floor` e multi-floor.** Patamar de lucro bruto cotado para considerar realização. Skill mãe §5.2 trata "meta de lucro bruto" como discricionário do operador. **Sempre opera sobre lucro bruto, nunca sobre PnL líquido.** Quando multi-floor é ativado, materializa-se um label por floor por horizonte na mesma amostra; a unidade rotulada passa a ser `(amostra, horizonte, floor)` em vez de `(amostra, horizonte)`. Permite aprender empiricamente a curva `P(realize | floor)`.
- **Stride entre amostras candidatas da mesma rota** — trade-off entre cobertura de eventos e overlap autocorrelacionado.
- **Decimação da observação contínua** para conter custo, com a exigência de probabilidade marginal recuperável (§7.3).
- **Subcategorização e thresholds da censura** (§3.5; tratamento em §7.2).
- **Definição operacional de "observação limpa"** — filtros aplicados antes da observação alimentar histórico.

### 5.3 Metadata como exigência do dataset

Discricionariedade só é aproveitável se for registrada. Para cada amostra, o dataset deve carregar — em campos de primeira classe — o valor concreto de cada parâmetro discricionário sob o qual aquela amostra foi gerada.

**Mínimo do fingerprint da versão de configuração:** hash determinístico de `(conjunto de horizontes, lista de floors, critério de candidatura, política de "observação limpa", versão do schema, versão do scanner)`. Duas amostras só são intercambiáveis em treino se têm mesmo fingerprint.

Sem isso, três coisas quebram: **mistura silenciosa** (amostras geradas com `label_floor = 0.5` e `1.5` ficam indistinguíveis); **reweighting impossível** (importance sampling para reduzir viés de seleção precisa da probabilidade marginal **conjuntamente com a versão da política** que a gerou — duas amostras com mesma `P_marginal` numérica geradas por políticas diferentes não são intercambiáveis); **auditoria off** (a pergunta "por que esta amostra foi candidatada?" só tem resposta se a metadata está registrada).

Treino e auditoria filtram por versão de configuração explícita; conjuntos de versões incompatíveis são tratados como séries distintas, não como coleção contínua.

---

## 6. Necessário vs. complementar — o mínimo viável para treino

A skill mãe §5 e a §3 desta skill estabelecem o que é estrutural. Esta seção é ortogonal: dado o que é estrutural, **qual é o subconjunto sem o qual o modelo não consegue ser treinado de forma cientificamente defensável**, e o que pode esperar fases posteriores?

A pergunta crítica para cada feature, label e metadata é uma só: **se removermos isto, qual classe de erro se torna invisível ou inevitável?**

### 6.1 Necessário (mínimo viável)

O conjunto necessário corresponde aos campos exigidos pelas identidades de §3 e §5.1, mais quatro exigências adicionais de schema que o resto da skill assume implicitamente e que merecem nomeação explícita aqui:

- **Identificadores e tempo:** ID estável de rota, `sample_id` determinístico e timestamp em nanosegundos (§3.1). O registro também precisa carregar os componentes auditáveis da rota — `canonical_symbol`, `buy_venue`, `sell_venue`, `buy_market`, `sell_market` — para permitir validações diretas de ausência de SPOT/SPOT, `sell_market = FUTURES_PERP` e `buy_venue != sell_venue` sem depender de parsing opaco do `route_id`.
- **Estado em `t₀`:** `entry_locked` (§3.2) e `exit_start = S_saída(t₀)`. Sem `exit_start`, a foto de `t₀` não fecha a identidade instantânea `entry + exit`, o Teste 2 não é auditável contra o estado observado, e a recomendação `{enter, exit, lucro_bruto, P, T, IC}` perde contexto de comparação.
- **Features point-in-time da rota:** quantis rolantes de `entry` e `exit` em **ao menos uma janela curta e uma janela longa** (Testes 1 e 2 da skill mãe; §4.1, §4.2).
- **Outcome multi-horizonte em três níveis:** `realized | miss | censored` por horizonte (§3.4, §3.5).
- **Para amostras `realized`, registrar `t_realize` e `S_saída(t_realize)`** — instante e valor que dispararam a realização. Sem esses dois campos, o modelo emite `T` (tempo esperado até realização) só por proxies categóricos por horizonte; a auditabilidade exigida por §3.6 não fecha. Esta é a exigência que materializa a auditabilidade de §3.6 como campo de schema.
- **Probabilidade marginal de candidatura** registrada por amostra, conjuntamente com a versão da política que a produziu (§5.3). Sem isso, importance weighting honesto fica impossível (Horvitz & Thompson 1952, *JASA* 47(260)) e o viés de seleção da §7.2 torna-se irremovível analiticamente.
- **Versão de configuração e versão de schema** por amostra (§5.3).
- **Critério de realização do label registrado na amostra**, não inferido depois.
- **Histórico ordenado de `(predição, versão_modelo, outcome, timestamp)`** a partir do momento em que o primeiro modelo entra em produção. Conformal prediction online (§7.4) opera sobre esse histórico; sem ele, o IC reportado por modelos posteriores é tautológico. Em fase de coleta pré-modelo, este campo nasce vazio e passa a popular-se quando shadow mode (§7.8) começa. Quando o modelo principal substituir o baseline, o histórico precisa preservar o output completo da recomendação ou abstenção tipada: `TradeSetup` (`entry_now`, `exit_target`, lucro bruto central, `p_hit`, IC, quantis de `exit`, quantis de `T`, `p_censor`, validade) ou `Abstain(reason)`.

**Tratamento mínimo defensável de `censored` em treino:** descartar `censored` enviesa para sobreviventes; tratar como `miss` enviesa `P(realize)` para baixo. Para um primeiro modelo, o piso defensável é Inverse Probability of Censoring Weighting (IPCW) com pesos derivados de Kaplan-Meier por rota dentro de janela point-in-time, ou descarte explícito acompanhado de auditoria documentada de fração e padrão de censura. Random Survival Forest e variantes mais sofisticadas (§6.2) ficam como complementaridade.

### 6.2 Complementar (nice-to-have)

Agrega poder ou robustez, mas a falta em fase 1 não impede um primeiro modelo defensável.

- Features cross-rota (correlação com rotas-irmãs do mesmo símbolo).
- Features de regime explícitas (Hurst, realized volatility, time-of-day sinusoidal).
- Múltiplas janelas rolantes em paralelo além das duas mínimas (§6.1).
- Lifecycle estruturado rico de listing/delisting/halt e eventos externos. O mínimo anti-survivorship não é opcional: o dataset precisa carregar pelo menos idade ou `first_seen`, último ponto observado ou `last_seen` quando disponível, e `censor_reason` nas amostras censuradas. A classificação rica do evento pode ficar para fase posterior.
- Campos de hindsight (`audit_*`) — auditoria offline; podem ser adicionados depois sem retro-coletar, pois a observação contínua já contém a informação para reconstrução.
- Survival modeling explícito (Random Survival Forest, Ishwaran et al. 2008, *Annals of Applied Statistics* 2(3)) — ganho marginal quando o trainer quer estimar funções de sobrevivência contínuas; a categorização em três níveis basta para análises por horizonte com IPCW.

### 6.3 Critério para promoção e anti-padrão

A regra: **se a ausência torna uma classe de erro de calibração invisível ou inevitável, é necessária**. Probabilidade marginal de candidatura e versão da política são necessárias — sem ambas, viés de seleção (§7.2) só é estimável com hipóteses não testáveis dentro do dataset. Cross-rota é complementar — sua ausência empobrece o modelo em eventos correlacionados, mas não introduz erro de calibração estimável dentro de cada rota.

Anti-padrões frequentes:

- Adiar registro de probabilidade marginal por simplicidade — campo é simples de adicionar, mas amostras sem ele precisam ser re-amostradas ou descartadas; o trainer não tem como inferir retroativamente.
- Coletar features cross-rota antes de garantir point-in-time strict para features de quantil. Cross-rota sem point-in-time é leakage garantido.
- Coletar `audit_*` sem coletar o critério de realização. `audit_*` mistura amostras de critérios diferentes como se fossem comparáveis.
- Adiar registro de `t_realize` por considerá-lo redundante com `realized = true` — perde informação de tempo contínuo necessária para reportar `T` de forma honesta.

A ordem correta é piso necessário primeiro, complementaridade depois.

---

## 7. Riscos do dataset e impacto no comportamento real-time do modelo

Esta seção integra duas perguntas com a mesma resposta mecânica: (i) quais riscos o dataset cria por construção, e (ii) como cada decisão de coleta condiciona o comportamento que o operador vai ver em produção. Em produção o modelo é função pura de `(rota, t_now, observação corrente, histórico até t_now)` para `Recomendação ∈ {Trade, Abstain}`. Cada subseção mostra como uma classe de risco aparece como falha observável real-time.

A skill mãe §4 estabelece **precision-first**: o operador prefere perder oportunidades a entrar em armadilhas. Operacionalmente, o real-time é avaliado por calibração honesta de `P(realize)`, precisão@k entre as `Trade`, cobertura útil moderada, e estabilidade temporal.

### 7.1 Leakage — quando o futuro contamina o passado

Quatro variantes temporais que aparecem na prática:

- **Janela** — estatística rolante de feature inclui `t₀`. Mitigação: janela aberta no extremo superior, ordem de operações `ler → decidir → atualizar` (§3.1).
- **Label** — feature derivada da janela `[t₀, t₀+h]`. Mitigação: auditoria explícita listando, para cada feature, qual janela ela usa.
- **Estatística global** — feature normalizada por estatística do dataset inteiro. Mitigação: normalização por rota dentro de janela point-in-time.
- **Shuffle** — split aleatório de amostras geradas a partir do mesmo histórico temporal coloca, com alta probabilidade, observações `t` no treino e `t + δ` da mesma rota no teste. Mitigação: split temporal com **embargo** — nenhuma amostra de teste com `t₀` em janela `[T_split − embargo, T_split + embargo]` (López de Prado 2018, cap. 7).

(Leakage por critério de candidatura é viés de seleção, não temporal — tratado em §7.2.)

**Protocolo de validação.** Para datasets multi-horizonte com janelas de label sobrepostas e amostras inter-rota correlacionadas como este, split aleatório é inválido e walk-forward simples pode deixar resíduo de leakage que aparece em produção como precisão@k caindo abruptamente. O piso mínimo para MVP e primeiras coletas longas é split temporal com purge/embargo compatível com o maior horizonte. Arian, Norouzi & Seco 2024 (*Knowledge-Based Systems* 305:112477) mostram empiricamente em ambiente sintético controlado que **CPCV (Combinatorial Purged Cross-Validation)** reduz Probabilidade de Backtest Overfitting e Deflated Sharpe frente a walk-forward neste regime; portanto CPCV é a auditoria preferida quando houver histórico e custo computacional suficientes. Walk-forward permanece sanity-check secundário.

Impacto real-time: leakage faz métricas de validação ficarem otimistas e o modelo aprender sinal que em produção não existe. Manifestação típica: AUC-PR alta em validação, calibração colapsada nas primeiras semanas em shadow mode.

### 7.2 Viéses de seleção — survivorship, candidatura, peer-effect

Três viéses distintos com origem na seleção, que se compõem.

- **Survivorship.** Brown, Goetzmann, Ibbotson & Ross 1992 (*RFS* 5) é referência clássica. Aqui: rotas que delistaram ou sumiram durante a coleta tendem a desaparecer do snapshot atual; se o dataset só registra rotas existentes na extração, vê apenas sobreviventes — em média mais favoráveis que a população. Mitigação: registro de lifecycle por rota (`first_seen`, `last_seen`, marca de delisting), censura à direita (§3.5) em amostras individuais, auditoria periódica de cobertura.
- **Selection bias por candidatura.** Critério de candidatura (§5.2) seleciona subconjunto sistemático. Se o trainer ignora, estima `P(realize)` como se fosse amostra IID da população — tipicamente otimista. Mitigação: probabilidade marginal registrada com versão de política (§6.1); importance weighting (Horvitz-Thompson 1952); coleta paralela de observações não-candidatas decimadas.
- **Peer-effect.** Variante específica com origem fora do dataset: se o operador é um entre vários arbitradores, oportunidades que ficam visíveis por muito tempo são justamente as que outros decidiram não pegar — possivelmente porque enxergaram risco que o scanner não enxerga. O dataset, sozinho, **não consegue resolver**. Pode mitigar registrando "tempo vivo" da oportunidade antes de desaparecer, como proxy de quão concorrida foi.

**Subcategorias de censura úteis para tratamento.** Quando o tratamento de censura em treino exige diferenciação (a partir de regimes de censura aleatória vs. informativa), três subcategorias têm regimes distintos:

- **Rota dormente** — silêncio temporário que voltou. Compatível com censura aleatória; IPCW válido.
- **Rota delistada** — silêncio prolongado seguido de evidência de desaparecimento. Censura informativa — o desaparecimento carrega informação sobre o regime; IPCW ingênuo enviesa.
- **Shutdown do coletor** — janela interrompida pelo lado do dataset, não do mercado. Censura aleatória pura, independente do estado da rota; o caso menos enviesado.

Subcategorizar é discricionário (§5.2); quando não subcategorizado, o tratamento de censura usa o caso conservador (assumir censura informativa).

Impacto real-time: modelo treinado em sobreviventes recompensa rotas que historicamente acertaram e falha em rotas novas; modelo ignorando candidatura mostra calibração que quebra em rotas fora do tier alto; peer-effect manifesta-se como `realized` em shadow sistematicamente menor do que `realized` no histórico para a mesma `predição`.

### 7.3 Granularidade do histórico × autocorrelação

Decisão de desenho com consequência observável real-time.

Histórico denso (toda observação limpa anexada): cobertura máxima, custo alto, **alta autocorrelação entre vizinhas**. Em séries de spread, observações separadas por segundos têm correlação serial elevada; tratar `n` correlacionadas como `n` independentes superestima poder estatístico. Lahiri 2003, *Resampling Methods for Dependent Data* trata o caso geral; a regra prática é que `n` efetivo é frequentemente fração pequena de `n` aparente.

Histórico decimado fixo (1-em-N): custo previsível, redução proporcional de autocorrelação, mas perde sub-janelas curtas onde a oportunidade aparece e some entre amostras.

Histórico decimado por tier (allowlist + priority + uniforme): preserva resolução em rotas de cauda, mas introduz viés de seleção entre rotas que precisa de reweighting honesto, sob pena do modelo aprender calibração tier-específica que quebra fora dela.

A regra: "mais dado é sempre melhor" só vale após desconto de autocorrelação. Decimar 1-em-10 com point-in-time correto tipicamente preserva mais sinal efetivo do que 1-em-1 com leakage parcial.

### 7.4 Distribution shift — quando 24 h não cobrem a vida da rota

Cripto longtail tem regimes que mudam em escala curta — funding, halts macro, listings/delistings agressivos, alterações estruturais. Modelo treinado em janela `X` opera em `X + k` com distribuição diferente. Calibração originalmente honesta em `X` pode estar quebrada em `X + k` sem aviso. Hautsch, Scheuch & Voigt 2024 (*Review of Finance* 28(4)) documentam que latência de settlement em arbitragem cripto sozinha responde por mais de 40% dos custos marginais, e Makarov & Schoar 2020 (*JFE* 135(2)) já estabelecem que mispricing persiste por dias em rotas longtail; o regime que o dataset captura é não-estacionário por design.

Mecanismos com requisito modesto sobre o dataset:

- **Família conformal adaptativa** (Gibbs & Candès 2021, *NeurIPS* 34, e variantes posteriores) mantém cobertura empírica do intervalo em torno de `P(realize)` mesmo sob shift, ajustando o quantil online sem retreinar o modelo. Pré-condição: o histórico ordenado de `(predição, outcome, timestamp)` exigido em §6.1 precisa estar disponível.
- **Reliability diagram rolante e ECE em janela** (Niculescu-Mizil & Caruana 2005, *ICML*; Guo et al. 2017, *ICML*): a métrica não corrige drift, mas detecta. O dataset deve permitir reconstruir esse diagrama ex-post para qualquer janela.
- **Retreino com purged K-fold + embargo** (López de Prado 2018, cap. 7) ou **CPCV** (§7.1) em horizonte mais longo. Embargo evita que amostras com janelas de label sobrepostas caiam em lados opostos do split.

### 7.5 Feedback loop — quando o modelo contamina o próprio dataset

Se o operador segue recomendações do modelo, e isso altera os preços observados na rota, futuras observações carregam o eco da ação informada pelo modelo. Dataset alimentado dessas observações e usado para retreinar produz modelo que aprendeu sobre o impacto do próprio modelo, não sobre o mercado natural.

Quando o volume executado representa fração material do book daquela rota, o efeito vira primeira ordem; em operação cuja execução é pequena frente ao book disponível, é desprezível. A linha entre os dois regimes é qualitativa e empírica.

Mitigação: flag explícita por amostra identificando se a observação aconteceu em janela "pós-recomendação ativa" daquela rota; análise periódica de drift induzido por execução; reweighting ou exclusão das amostras pós-emissão durante retreinos que queiram modelar mercado natural.

### 7.6 Métricas em desbalanceado — precision-first como consequência de design

`label_floor` (§5.2) condiciona o balanceio do dataset. Floors mais altos produzem `realized` minoritário; accuracy ou AUC-ROC ficam enganosamente altas mesmo em modelos quase triviais.

Saito & Rehmsmeier 2015 (*PLoS ONE* 10(3)) mostram que **AUC-PR é mais informativa que AUC-ROC em desbalanceado** — PR penaliza falso positivo onde ele dói (operador entra em armadilha), enquanto ROC mistura performance em ambas as classes. Para precision-first, AUC-PR + Brier (calibração) + ECE rolante formam o trio operacional honesto.

Implicação direta para o `label_floor`: precisa ser sintonizado de modo que a base rate fique numa faixa em que o problema seja não-trivial. Floors muito baixos colapsam para "tudo realiza" (modelo aprende discriminação trivial); muito altos para "quase nada realiza" (sem positivos suficientes). A faixa exata é discricionária e empírica.

### 7.7 Riscos não removíveis pelo dataset

Alguns riscos da skill mãe §6 não podem ser representados aqui. Listá-los é honestidade epistemológica.

- **Latência de execução real.** Spread cotado a 2 % pode existir por 80 ms ou 15 min. Amostragem a 150 ms torna persistência abaixo de 150 ms invisível.
- **Halts não-anunciados.** Quando uma venue suspende silenciosamente, o scanner para de receber updates; do ponto de vista do dataset, vira censura, com motivo fora do schema.
- **Funding e fees do operador específico.** Pertencem ao operador, não à estratégia bruta (skill mãe §6).
- **Legging risk.** `entry_locked` no dataset é cotado em `t₀`; em produção, fills assimétricos das duas pernas divergem do cotado (skill mãe §6.3). O modelo aprende sobre o cotado; o operador absorve a divergência.
- **Risco de inventário e rebalanceamento entre venues.** Pertence ao operador (skill mãe §3.3, §6.3); custo recorrente que erode retorno líquido agregado, não o lucro bruto cotado por trade.
- **Risco de divergência permanente.** Quando o regime estrutural muda e o spread não reverte (skill mãe §6.3), a censura categoriza, mas as subcategorias de §7.2 só diferenciam divergência permanente de rota dormente quando o critério explicita.

A consequência operacional é uma margem irredutível entre `P(realize)` cotada pelo modelo e a fração efetivamente fechada pelo operador em produção. **Essa margem não é falha do modelo** — é o gap entre lucro bruto cotado (escopo do dataset) e lucro líquido executado (escopo do operador).

### 7.8 Shadow mode como ponte entre dataset e produção

Antes de o operador confiar na recomendação real, o modelo precisa rodar em shadow — emite recomendações sem executar; o sistema coleta calibração empírica vs. prevista por dias a semanas. Único caminho para detectar:

- Selection bias residual após reweighting (§7.2): se em shadow a calibração diverge da prevista, o reweighting estava errado.
- Peer-effect: `realized` em shadow sistematicamente menor que no histórico para a mesma `predição` é o sintoma.
- Drift em fast-mode: calibração degradando em janela de horas (não dias) sinaliza regime shift e necessidade de adaptação online ou retreino imediato.

**Latência de rotulagem como exigência de protocolo.** Rotulagem só fecha após o horizonte completar; calibração rolante em produção tem lag igual ao maior horizonte. Operacionalmente: se `max(H) = 8 h`, a calibração de hoje só vai ser auditável amanhã. Em retreino periódico, esta latência exige `cutoff_train ≤ T_now − max(H)` — usar amostras com janela de label parcialmente sobreposta ao período de validação produz leakage de horizonte longo mesmo quando o embargo de §7.1 está corretamente aplicado.

O shadow mode **não é o dataset**, mas o dataset precisa carregar o necessário para suportá-lo — exatamente os campos exigidos em §6.1: timestamp da emissão, `valid_until`, predição armazenada com versão de modelo, outcome resolvido contra critério declarado (§3.6), flag indicando se a amostra foi recomendada. Reconstrução da trajetória de cada recomendação ao longo da janela de validade é função pura desse conjunto.

---

## 8. Glossário operacional

Termos canônicos que introduzem nome novo ou importam significado da skill mãe. Definições já dadas no corpo não são repetidas — entradas abaixo apenas amarram o termo à seção autoritativa.

- **Rota** — quíntupla `(symbol, venue_compra, venue_venda, tipo_compra, tipo_venda)`. Idêntico a skill mãe §1.1. Direção `(buyFrom, sellTo)` é parte da identidade (§5.1).
- **Observação (limpa)** — registro `(rota, t, S_entrada(t), S_saída(t), …)` que passou pelos filtros de "observação limpa" e do sanity-check de soma instantânea (§3.1). Apenas observações limpas alimentam histórico point-in-time.
- **Amostra candidata** — observação que passou no critério de candidatura e foi selecionada para virar amostra de supervisão. Carrega probabilidade marginal de seleção e versão da política (§6.1).
- **Amostra rotulada** — amostra candidata com `outcome ∈ {realized, miss, censored}` por horizonte (e por floor quando multi-floor). Unidade do dataset supervisionado.
- **`entry_locked`** — `S_entrada(t₀)` registrado na amostra; constante durante toda a janela de label (§3.2).
- **`label_floor`** — patamar de lucro bruto cotado para considerar realização. Discricionário (§5.2). Sempre opera sobre lucro bruto, nunca sobre PnL líquido.
- **`t_realize`, `S_saída(t_realize)`** — instante e valor que dispararam a realização para uma amostra `realized`. Materializam a auditabilidade exigida por §3.6 (§6.1).
- **`audit_*`** — prefixo de campo que carrega informação de hindsight, usada apenas em auditoria/pesquisa, fora do objetivo central e da função de perda (§3.3).
- **Versão de configuração** — fingerprint determinístico do conjunto de parâmetros discricionários sob o qual uma amostra foi gerada (§5.3, mínimo enumerado).
- **Probabilidade marginal de candidatura** — `P(amostra é candidatada | observação)`, registrada conjuntamente com a versão da política que a calculou (§6.1, §7.2).
- **Lifecycle de rota** — `first_seen`, `last_seen`, marca de delisting/halt por rota. Anti-survivorship (§7.2).
- **Shadow mode** — modelo emite recomendações sem executar; sistema coleta calibração empírica vs. prevista. Ponte entre dataset e produção real (§7.8).
