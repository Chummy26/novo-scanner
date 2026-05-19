# ml_storage_v2 Primary Audit

`ml_storage_v2` com `fact.parquet + route_dim.parquet + manifest` ja e o formato
principal de persistencia do corpus ML atual. Este documento registra o caminho
de auditoria que levou a essa migracao e os gates que continuam obrigatorios
para treino/serving.

Objetivo: manter a representacao fisica compacta sem perder o contrato logico
usado por auditoria e trainer.

## Regra de seguranca

O V2 nao pode reduzir frequencia, linhas, horizontes, floors, labels,
`sampling_probability`, PIT features, `entry_locked` ou outcomes. O trainer deve
ler o schema logico reconstruido pelo loader V2, nao a forma fisica compactada
diretamente.

Como os defaults atuais removem JSONL e Parquet V1 apos compactacao/equivalencia
bem-sucedida, a promocao de qualquer modelo deve exigir:

- manifests V2 presentes para todos os arquivos do corpus;
- digest logico V2 verificado em todos os manifests consumidos;
- `schema_version`, `runtime_config_hash`, politica de sampling e grid
  floor/horizon compativeis;
- `_SUCCESS` do trainer e `promotion_allowed=true` antes de servir online.

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

Essa etapa foi originalmente shadow. No modo primary atual, a publicacao V2 so
pode apagar o V1 depois de validar equivalencia logica, contagens e manifesto.
Falha de equivalencia deve preservar a fonte anterior e remover sidecars
incompletos.

## Loader logico V2

O V2 agora tambem possui reader logico:

- carrega `route_dim.parquet`, que e pequeno por arquivo;
- le `fact.parquet` em streaming, batch a batch;
- reconstroi `sample_id`, `route_id` e identidade de rota no mesmo schema
  logico do v1;
- valida contagem de linhas contra o manifesto;
- possui gate de equivalencia `v1 parquet -> v2 fact+route_dim -> batch logico`
  para comparar o batch reconstruido com o batch v1 original.

Esse e o gate necessario para o V2 permanecer formato principal sem reduzir
dados: o trainer consome o schema logico reconstruido, nao depende da forma
fisica compactada.

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

## Proximos gates

- Adicionar hash forte de corpus por arquivo (`fact`, `route_dim`, manifest e
  schema logico) alem do digest logico operacional atual.
- Bloquear promocao de trainer quando qualquer manifest tiver digest logico
  pulado, inclusive em runs com `--max-rows`.
- Manter auditoria de run Green para corpus destinado a promocao.
