# ml_storage_v2 Shadow Audit

`ml_storage_v2` deve entrar primeiro como auditoria shadow/offline, nao como
substituicao imediata do writer canonico.

Objetivo: provar que uma representacao fisica mais compacta poderia remover
redundancia sem perder o contrato logico usado por auditoria e trainer.

## Regra de seguranca

O storage v1 continua sendo a fonte canonica ate o shadow report ficar Green em
runs longos e representativos. O v2 nao pode reduzir frequencia, linhas,
horizontes, floors, labels, `sampling_probability`, PIT features, `entry_locked`
ou outcomes.

## O que o shadow valida

- `sample_id` continua existindo no schema logico e e reconstruivel por
  `fnv1a128_sample_id_v1`.
- `route_id` logico e reconstruivel por `canonical_symbol + venues + markets`.
- `route_dim` e local ao snapshot/run; `symbol_id` e preservado como valor
  run-local, nunca usado como chave global.
- `label_window_closed_at_ns == ts_emit_ns + horizon_s * 1e9` para labels.
- Arquivos com schema antigo ou incompleto viram status Red.
- Economia estimada separa:
  - conservadora: virtualizar apenas `sample_id` fisico;
  - com `route_dim`: virtualizar `sample_id` + identidade textual de rota,
    descontando `route_key` fisico e dimensao de rota.

## Uso

Smoke test rapido:

```powershell
cargo run --bin ml_storage_v2_shadow -- --root data/ml --max-files-per-dataset 1 --allow-red
```

Auditoria completa offline:

```powershell
cargo run --release --bin ml_storage_v2_shadow -- --root data/ml --out data/ml/storage_v2_shadow_report.json
```

Se o report vier Red, o v2 nao esta liberado para substituir nenhuma fonte de
dados. Isso inclui schemas antigos: eles devem ficar particionados/filtrados no
trainer por `schema_version`, `scanner_version` e hashes de config.

## O que ainda nao foi implementado

Esta etapa ainda nao escreve fatos v2 nem `route_dim.parquet`. Ela implementa o
gate necessario antes disso: detectar se o contrato logico atual pode ser
reconstruido com diff zero. A etapa seguinte deve gerar Parquets sidecar v2 a
partir de Parquets v1 ja validados, mantendo v1 ate comparacao full-schema.
