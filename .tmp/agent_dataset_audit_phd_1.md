Não há P0.

Conclusão central: o dataset está majoritariamente no caminho correto. Ele não está tentando decidir trade como target; ele guarda fatos em `t0`, features PIT, labels first-hit por horizonte, censura e campos de auditoria. Porém ainda não cumpre plenamente a função final de substituir a leitura histórica humana para treinar `{enter, exit, lucro_bruto, P, T, IC}` com auditoria honesta, principalmente por lacunas em abstenção, amostragem/stride e lifecycle persistido.

**P1**
- **Evidência:** [serving.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/serving.rs:974) monta `FeaturesT0` antes de atualizar o cache; [serving.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/serving.rs:913) atualiza cache depois. Isso é bom. Mas [label_resolver.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/label_resolver.rs:343) aplica um `label_stride_s` único por rota, enquanto [label_resolver.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/label_resolver.rs:672) só registra `effective_stride_s` por horizonte no fechamento.
- **Impacto:** o dataset aparenta ter stride efetivo por horizonte, mas a seleção real foi feita com stride global. Isso prejudica auditoria de sobreposição temporal, reweighting e calibração por horizonte, especialmente em 4h/8h.
- **Correção mínima saudável:** ou aplicar o stride efetivo por horizonte na criação dos pendings, ou persistir explicitamente “stride real usado para seleção” separado de “stride recomendado/diagnóstico”.

**P1**
- **Evidência:** [contract.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/contract.rs:151) define `NO_OPPORTUNITY`, `INSUFFICIENT_DATA`, `LOW_CONFIDENCE`, `LongTail`, `Cooldown`; [serving.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/serving.rs:952) cria labels para candidatos limpos rejeitados, mas [labeled_trade.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/labeled_trade.rs:130) persiste `baseline_recommended`, não a razão completa de abstenção do recomendador.
- **Impacto:** dá para aprender `INSUFFICIENT_DATA` e uma aproximação de `NO_OPPORTUNITY` via `sample_decision`, mas `LOW_CONFIDENCE` fica fraco/indireto. O trainer pode confundir “não recomendado por baixa confiança” com “trade ruim” ou “sem oportunidade”.
- **Correção mínima saudável:** persistir `recommendation_kind` e `abstain_reason` no label/policy metadata para snapshots limpos, mantendo isso fora do target principal.

**P1**
- **Evidência:** [listing_history.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/listing_history.rs:25) declara que persistência de lifecycle fica para “Marco 2”; hoje o `LabeledTrade` tem `listing_age_days` e `censor_reason`, mas não carrega `first_seen`, `last_seen`, `active_until` ou tabela persistida de lifecycle.
- **Impacto:** censura por amostra está razoável, mas auditoria anti-survivorship por rota ainda fica incompleta. O trainer consegue ver labels censurados, mas não consegue auditar plenamente rotas dormentes/delistadas/shutdown no universo total.
- **Correção mínima saudável:** persistir snapshot simples de lifecycle por rota com `first_seen_ns`, `last_seen_ns`, `active_until_ns`, `n_snapshots` e motivo quando conhecido.

**P2**
- **Evidência:** [labeled_trade.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/labeled_trade.rs:103) inclui `entry_rank_percentile_24h`, `entry_minus_p50_24h`, MAD e quantis de entry; [labeled_trade.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/labeled_trade.rs:117) inclui quantis de exit e `p_exit_ge_label_floor_minus_entry_24h`.
- **Impacto:** Teste 1 e Teste 2 estão cobertos para MVP em janela 24h, mas a evolução fica limitada porque regimes de 6h/12h/7d não aparecem no schema atual. Isso reduz capacidade do modelo de distinguir mudança curta de regime vs. comportamento estável da rota.
- **Correção mínima saudável:** manter 24h como MVP e adicionar uma segunda janela PIT curta somente quando houver histórico suficiente; não precisa redesenhar o dataset.

**P2**
- **Evidência:** [raw_sample.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/raw_sample.rs:81) persiste `sampling_tier`, `sampling_probability`, `priority_set_generation_id` e `runtime_config_hash`; porém [raw_sample.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/raw_sample.rs:390) documenta que `Priority` usa `1.0` condicional à membership, não probabilidade marginal real.
- **Impacto:** a auditoria é possível, mas um trainer ingênuo pode tratar `sampling_probability=1.0` como probabilidade marginal honesta e superponderar rotas priority.
- **Correção mínima saudável:** persistir um campo separado como `sampling_probability_kind = conditional|marginal_estimated|uniform`, ou forçar o trainer a usar `sampling_tier + priority_set_generation_id` para IPW.

**P2**
- **Evidência:** [labeled_trade.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/labeled_trade.rs:207) mantém `audit_hindsight_best_exit_*` com prefixo protetor, e [label_resolver.rs](/C:/Users/nicoolas/Pictures/novo%20sc%20anner/scanner/src/ml/persistence/label_resolver.rs:701) popula esses campos.
- **Impacto:** a separação está conceitualmente correta, mas esses campos ainda ficam no mesmo registro do target principal. O risco não é no dataset em si; é uso indevido no trainer.
- **Correção mínima saudável:** no contrato do trainer, bloquear por allowlist de features/targets em vez de blacklist, excluindo qualquer `audit_hindsight_*`.

No ponto mais importante: `entry_locked + S_saida(t1)` está implementado como label falsificável e não como melhor saída ex-post. Os campos `audit_hindsight_*` existem, mas estão nomeados como auditoria. O maior cuidado agora é garantir que o trainer respeite essa fronteira.