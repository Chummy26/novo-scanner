---
status: draft
author: codex
date: 2026-05-16
version: 0.1.0
supersedes: null
reviewed_by: null
---

# ExitTargetPolicy Checklist

Este documento nao substitui a skill canonica `spread-arbitrage-strategy`. Ele existe como checklist de alto nivel para pesquisas e decisoes futuras antes de publicar um `TradeSetup` primario unico.

Fonte da verdade conceitual: skill `spread-arbitrage-strategy`, secao `ExitTargetPolicy`.

## Escopo

- Coleta e primeiro treino podem rodar sem `ExitTargetPolicy` final.
- O primeiro trainer deve poder operar em modo **EstimatorOnly**: estimar `P_hit`, `T_hit`, `P_censor`, quantis e `IC` por `floor` e horizonte, sem escolher uma utility final.
- A policy so vira bloqueio quando o sistema quiser publicar um unico `exit_target` operacional/acionavel.
- A policy nunca vira label, target supervisionado ou "saida correta" da rota.

## Perguntas Antes De Output Operacional Unico

1. Qual e a funcao de utilidade bruta?

- Qual quantidade a policy maximiza: lucro esperado bruto, precision@coverage, utilidade conservadora, ou outro criterio?
- A utilidade aumenta com `lucro_bruto_alvo` e `P_hit`?
- A utilidade penaliza `T_hit`, `P_censor` e largura do `IC`?
- Quais pisos duros existem para lucro bruto minimo, probabilidade minima, horizonte maximo e confianca minima?
- Como a policy impede reward hacking por micro-spread com `P` alto?
- Como a policy prova que nao usa fees, funding, slippage, tamanho, margem ou PnL liquido?

2. Como escolher entre varios candidatos de saida?

- Qual grade de `exit_threshold` ou `label_floor` gera os candidatos?
- Cada candidato tem `P_hit`, quantis de `T`, `P_censor` e `IC` estimados de forma point-in-time?
- O candidato escolhido e uma decisao de policy versionada ou esta sendo tratado incorretamente como verdade do modelo?
- A recomendacao persiste `exit_target_policy_name`, versao, parametros e `runtime_config_hash`?
- O outcome posterior e avaliado contra o threshold emitido, nao contra a melhor saida ex-post?

3. A fronteira de Pareto dos setups foi calculada?

- Um setup dominado foi removido quando outro tinha maior lucro bruto, maior `P_hit`, menor `T_hit`, menor `P_censor` e menor incerteza?
- Os setups nao-dominados foram preservados para auditoria?
- Existe perfil conservador, balanceado e agressivo quando a fronteira permitir?
- Se a UI mostra apenas um setup, esta claro qual policy escolheu o primario?
- Se nenhum candidato passa os pisos, a saida vira `Abstain` tipado?

4. O dataset suporta a policy sem virar policy?

- Existem labels multi-horizonte e multi-floor suficientes para estimar `P(realize | floor, horizon, estado_t0)`?
- `entry_locked`, `exit_start`, `t_realize`, `S_saida(t_realize)`, `outcome`, `censor_reason`, `label_floor_hits[]` e `label_window_closed_at_ns` estao preservados?
- A policy consegue ser alterada sem reescrever labels antigos?
- Auditorias hindsight ficam em campos `audit_*`, fora da funcao de perda principal?

5. Como validar a policy?

- A calibracao de `P_hit` e medida por horizonte, floor e perfil de setup?
- A precision@coverage melhora frente ao baseline ECDF e frente a policies simples?
- O reliability diagram mostra `P` honesto nos setups escolhidos pela policy?
- O sistema mede cobertura: quantos candidatos viram `Trade` e quantos viram `Abstain`?
- Shadow mode registra predicao, versao_modelo, policy, outcome e timestamp antes de uso operacional?

## Regra de Bloqueio Operacional

Sem resposta auditavel para as perguntas 1, 2 e 3, o sistema pode treinar estimadores de probabilidade, quantis, tempo e censura, mas nao deve declarar que possui uma policy final de escolha de `exit_target` nem publicar um `TradeSetup` primario unico como decisao operacional.
