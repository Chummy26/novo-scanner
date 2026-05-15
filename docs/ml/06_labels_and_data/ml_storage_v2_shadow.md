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

Materializacao sidecar offline para benchmark:

```powershell
cargo run --release --bin ml_storage_v2_shadow -- --root data/ml --materialize-out-dir target/ml_storage_v2_sidecars --out target/ml_storage_v2_sidecars/storage_v2_materialization_report.json
```

Se o report vier Red, o v2 nao esta liberado para substituir nenhuma fonte de
dados. Isso inclui schemas antigos: eles devem ficar particionados/filtrados no
trainer por `schema_version`, `scanner_version` e hashes de config.

## Materializacao sidecar

A materializacao sidecar le Parquets v1 ja fechados e validados, grava:

- `*.fact.parquet`: fato v2 com `route_key` e sem colunas fisicas
  virtualizaveis (`sample_id`, `route_id`, identidade textual de rota e
  `symbol_id`);
- `*.route_dim.parquet`: dimensao local do snapshot/run para reconstruir a
  rota logica;
- `*.storage_v2.manifest.json`: manifesto com contagens, bytes, digest logico e
  versoes de contrato.

Essa etapa nao substitui writer, nao altera a coleta e nao remove o Parquet v1.
Ela existe para medir compressao real e validar contrato antes de qualquer
migracao.

## Benchmarks reais

Benchmark materializado em dois snapshots ja auditados:

| Snapshot | Status | Linhas | V1 | V2 sidecar | Reducao |
| --- | --- | ---: | ---: | ---: | ---: |
| `scanner-43192` | Green | 16.613.765 | 0,552 GiB | 0,202 GiB | 63,51% |
| `scanner-51688` | Green | 37.931.635 | 1,271 GiB | 0,466 GiB | 63,36% |

Projetando sobre os tamanhos de 7 dias estimados anteriormente:

| Snapshot | Projecao v1 7d | Projecao v2 7d |
| --- | ---: | ---: |
| `scanner-43192` | 307,6 GiB | ~112,3 GiB |
| `scanner-51688` | 327,7 GiB | ~120,1 GiB |

O ganho real ficou acima da estimativa shadow porque remover colunas de alta
cardinalidade tambem melhora a compressao das colunas restantes no Parquet.

## Proximo gate

Antes de qualquer substituicao do storage canonico, ainda precisa existir um
loader/auditor que leia `fact + route_dim + manifest`, reconstitua o schema
logico usado pelo trainer e compare contra o v1 em amostras completas por
dataset.
