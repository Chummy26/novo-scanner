---
status: draft
author: codex
date: 2026-05-16
version: 0.1.0
supersedes: null
reviewed_by: null
---

# EntryContextT0 Checklist

Este documento formaliza a versao segura da ideia chamada informalmente de
`entry_quality`.

Fonte da verdade conceitual: skills canonicas `spread-arbitrage-strategy` e
`spread-arbitrage-dataset`.

## Escopo

`EntryContextT0` responde apenas:

> O `S_entrada(t0)` atual esta excepcional para esta rota, dado o historico
> point-in-time disponivel antes de `t0`?

Ele materializa o Teste 1 da skill mae. Ele nao decide trade, nao define label,
nao escolhe `exit_target` e nao substitui `P_hit` calibrado.

## Permitido

- Usar apenas campos point-in-time de `FeaturesT0`.
- Preservar componentes crus: ranks, distancias contra mediana/p95, escala
  robusta, cobertura de historico e tempo vivo.
- Expor como diagnostico decomponivel para UI, auditoria ou trainer.
- Marcar cold-start como `insufficient_history` em vez de imputar score `0`.
- Versionar a formula derivada quando houver agregado ou apresentacao publica.

## Proibido

- Usar `EntryContextT0` como label supervisionado.
- Usar campos `audit_*`, first-hit, outcome, `t_realize`, best-exit ou qualquer
  variavel observada depois de `t0`.
- Misturar `p_exit_ge_label_floor_minus_entry_*` no mesmo score de entrada.
  Exequibilidade de saida e o Teste 2; deve permanecer separada.
- Criar regra hardcoded do tipo `entry_quality > X => ENTER`.
- Apagar ou substituir os componentes crus por um escalar opaco.

## Componentes Minimos

- `entry_rank_percentile_1h`
- `entry_rank_percentile_24h`
- distancia de `entry_locked` contra `entry_p50_24h`
- distancia de `entry_locked` contra `entry_p95_24h`
- distancia de `entry_locked` contra `entry_p95_7d`
- z robusto aproximado pela escala robusta 24h quando disponivel
- `n_cache_observations_at_t0`
- cobertura temporal efetiva do historico
- `time_alive_at_t0_s`

## Relacao Com O Modelo

Para treino, os componentes crus devem continuar preferenciais. Um agregado
derivado pode ajudar interpretabilidade, mas nao deve esconder missingness,
janela, escala ou cobertura.

Para output operacional, `EntryContextT0` pode explicar por que a entrada era
forte ou fraca. A decisao final continua sendo do modelo calibrado e da
`ExitTargetPolicy`, quando ela existir.

## Gate De Auditoria

Antes de usar em UI ou trainer:

- A derivacao foi feita antes de atualizar o cache com a observacao de `t0`?
- A formula tem nome/versao?
- Cold-start fica tipado?
- O campo nao mistura Teste 1 com Teste 2?
- O trainer ainda consegue acessar todos os componentes crus?
- A mudanca nao altera schema de label nem popula novos labels?

