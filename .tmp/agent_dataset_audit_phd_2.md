Não há P0.

A resposta central é: o dataset atual está bem orientado para substituir a leitura histórica humana no domínio de spread bruto, separado do modelo e sem misturar fees, funding, slippage, posição ou PnL líquido no label. A arquitetura já separa `RawSample`, `AcceptedSample` e `LabeledTrade`; gera features point-in-time antes de atualizar o cache; trava `entry_locked_pct`; resolve label por `S_saida(t1)` dentro de horizonte; e mantém hindsight sob prefixo `audit_hindsight_*`.

Ainda assim, há riscos P1/P2 que afetam auditoria, reweighting e abstenção.

**Achados**

1. **P1 — `effective_stride_s` não corresponde à amostragem realmente aplicada**
   - Evidência: [label_resolver.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/label_resolver.rs:346>) aplica `label_stride_s` uma vez por rota via `last_label_ts`; [label_resolver.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/label_resolver.rs:675>) depois grava `effective_stride_s` por horizonte com `effective_stride_for_horizon(...)`.
   - Impacto direto: horizontes longos podem ser amostrados a cada 60s, mas persistidos como se tivessem stride efetivo maior. Isso infla pseudo-replicação temporal, deixa calibração/IC otimistas e prejudica reweighting honesto.
   - Correção mínima saudável: ou aplicar stride por horizonte ao criar cada `PendingHorizon`, ou persistir `effective_stride_s` como o stride realmente aplicado. Não declarar um stride que não controlou a seleção.

2. **P1 — `sampling_probability=1.0` em tier `priority` é condicional, não marginal**
   - Evidência: [raw_sample.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/raw_sample.rs:435>) documenta que `1.0` é condicional à membership no `priority_set`; [raw_sample.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/raw_sample.rs:442>) persiste `probability: 1.0`.
   - Impacto direto: o trainer pode tratar rotas `priority` como full-capture marginal, quando na verdade a entrada no tier já é seleção endógena por ranking. Isso vicia IPW/reweighting e auditoria de seleção.
   - Correção mínima saudável: serializar `sampling_probability=null` para `priority` ou adicionar campo explícito `sampling_probability_kind="conditional_priority"`. Manter `priority_set_generation_id` ajuda, mas não substitui a probabilidade marginal.

3. **P1 — abstenção do modelo não fica tipada no label supervisionado**
   - Evidência: `LabeledTrade` persiste `sample_decision` em [labeled_trade.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/labeled_trade.rs:235>) e `baseline_recommended: bool` em [labeled_trade.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/labeled_trade.rs:182>), mas não persiste `AbstainReason`. Em [serving.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/serving.rs:958>), abstenções viram apenas `baseline_recommended=false`.
   - Impacto direto: há dados para `INSUFFICIENT_DATA` e `NO_OPPORTUNITY` via `sample_decision`, mas `LOW_CONFIDENCE`, `LongTail` e `Cooldown` ficam indistinguíveis no dataset rotulado. Isso pode ensinar “não recomendou” como classe única e confundir baixa confiança com trade ruim ou ausência real de oportunidade.
   - Correção mínima saudável: persistir em `PolicyMetadata` campos como `recommendation_kind` e `abstain_reason`, somente como metadata/target auxiliar de abstenção, não como feature.

4. **P2 — lifecycle anti-survivorship ainda é majoritariamente RAM**
   - Evidência: [listing_history.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/listing_history.rs:27>) diz que persistência de `listing_history` fica para Marco 2; o estado tem `first_seen_ns`, `last_seen_ns`, `active_until_ns` em [listing_history.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/listing_history.rs:68>), mas o `LabeledTrade` só recebe `listing_age_days` em [serving.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/serving.rs:896>).
   - Impacto direto: censura por amostra existe, mas auditoria populacional de rotas dormentes/delistadas/shutdown entre dias e restarts fica fraca. O trainer pode ver menos sobreviventes ruins do que deveria.
   - Correção mínima saudável: persistir um snapshot/event log simples de lifecycle por rota: `first_seen_ns`, `last_seen_ns`, `active_until_ns`, `n_snapshots`, `reason`.

5. **P2 — `written_ts_ns` não mede o write real**
   - Evidência: [label_resolver.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/label_resolver.rs:715>) comenta que o writer faz override, mas [labeled_writer.rs](</c:/Users/nicoolas/Pictures/novo sc anner/scanner/src/ml/persistence/labeled_writer.rs:135>) apenas usa `label.written_ts_ns` para particionar e escreve a linha sem sobrescrever.
   - Impacto direto: latência de persistência/backpressure não é auditável com precisão; `closed_ts_ns` e `written_ts_ns` podem ser semanticamente iguais.
   - Correção mínima saudável: sobrescrever `written_ts_ns` no writer imediatamente antes de `to_json_line()`, ou renomear/remover a distinção se não for medida.

**Leitura das perguntas obrigatórias**

- Dataset vs modelo: em geral correto. O dataset guarda fatos, features PIT, labels falsificáveis e metadata; decisão de trade fica no `Recommendation`/baseline.
- Point-in-time: correto no fluxo principal; features são capturadas antes de `cache.observe(...)`.
- Label: correto para MVP. `entry_locked_pct + exit_spread(t1)` resolve first-hit por floor/horizonte; `audit_hindsight_*` está separado.
- Testes 1 e 2: cobertos por `entry_rank_percentile_24h`, quantis de entry/exit, `p_exit_ge_label_floor_minus_entry_24h` e runs de saída.
- Abstenção: parcial; falta tipagem persistida de `AbstainReason`.
- Seleção/amostragem: boa base, mas `priority` e stride efetivo precisam ajuste para auditoria honesta.
- Survivorship/censura: censura por label está boa; lifecycle populacional ainda incompleto por não persistir fora da RAM.