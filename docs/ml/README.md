---
status: draft
author: codex
date: 2026-04-23
version: 0.1.0
supersedes: null
reviewed_by: null
---

# ML Dataset

Indice operacional do dataset ML. O contrato canônico de labels e lineage fica
em `06_labels_and_data/`.

- `00_research/model_stack_research_2026-05-03.md` consolida a leitura do
  codigo atual, skills, `CLAUDE.md` e a pesquisa externa sobre stack/modelos.
- `00_research/model_candidate_selection_protocol_2026-05-03.md` define como
  comparar candidatos e declarar vencedor sem confundir hipotese com decisao.
- `00_research/current_collection_review_2026-05-03.md` audita o run de coleta
  ativo em 2026-05-03 e transforma os achados em proximos passos pos-coleta.
- `07_decision_policy/exit_target_policy_checklist.md` lista as perguntas de
  decisao antes de publicar um `TradeSetup` primario unico a partir de
  multiplos candidatos de saida.
- `07_decision_policy/entry_context_t0_checklist.md` formaliza a versao segura
  de `entry_quality`: diagnostico PIT decomponivel da forca relativa da entrada,
  sem virar label, gate ou policy.
- `06_labels_and_data/label_schema.md` descreve os três streams persistidos.
- `06_labels_and_data/data_lineage.md` descreve origem, ordem point-in-time e
  campos que não pertencem ao objetivo do modelo.
