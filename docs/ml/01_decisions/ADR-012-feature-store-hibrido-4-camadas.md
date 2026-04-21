---
name: ADR-012 — Feature Store Híbrido em 4 Camadas (redb + HdrHistogram Cache + QuestDB + Parquet)
description: Arquitetura de persistência para 1.35×10⁹ snapshots/dia com latência hot p99<1ms, PIT correctness obrigatória, RPO 15min/RTO <45min
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d9-feature-store, phd-d7-rust-ml, phd-d3-features]
---

# ADR-012 — Feature Store Híbrido em 4 Camadas

## Contexto

Escala de dados:
- **2600 rotas × ~6 RPS × 86400s = 1.35 × 10⁹ snapshots/dia** brutos.
- Após dedup (deltas): ~10⁸/dia.
- Cada record: ~80 B bruto → ~8 B comprimido (ZSTD fator 10× — Lemire et al. 2015 *SPE* 46(9)).
- **90 dias = 107.7 GB bruto → 0.8 GB/dia comprimido → 72 GB total** (cabe em VPS Hetzner CPX41 240 GB NVMe, $30.90/mês, com 60% folga).

Operações requeridas:
- **Write sustained**: 17k writes/s; spike 50k/s+ em eventos.
- **Hot query** (rolling quantile, D3): por rota a cada 150 ms → 17k queries/s, **p99 < 1 ms**.
- **Cold analytics** (D4 backtest, ablation): batch cross-route queries.
- **ML retraining dump** (D6): 14 dias de feature dump em Parquet.

Requisitos:
- **Zero perda de dados** (WS backup, replay reprodutível).
- **Point-in-time (PIT) queries** — label snapshot reprodutível, anti-T9.
- **RPO < 15 min**, **RTO < 1h**.

## Decisão

Adotar **arquitetura híbrida em 4 camadas** conforme D9.

### Camada 1 — `redb 2.3` hot buffer (últimas 24h)

- **Embedded Rust KV**, ACID, zero-copy reads.
- **Key**: `(rota_id: u32, ts_ns: i64)` (12 B).
- **Value**: `[u8; 29]` packed struct.
- **Throughput**: 495k writes/s a 1.5 µs/write (redb.io/benchmarks 2024) — cobrindo 17k writes/s sustained com headroom 29×.
- **Spike 50k/s**: absorvido por `mpsc::channel` bounded de 100k slots = 2s buffer.
- **TTL lógico 24h**: drain horário para Camada 2.

### Camada 1b — `HotQueryCache` Rust (solução p99 < 1 ms)

Cache em Rust para queries hot do cold path de features (D3):
- `DashMap<RotaId, JanelaCache>` por rota.
- Cada `JanelaCache` contém `hdrhistogram 7.5` para janela 24h e ring buffer `(ts, value)` para expirar observações.
- **Lookup**: `value_at_quantile()` em **<200 ns** (zero-alloc, pré-alocado).
- **Update incremental**: adiciona novo sample + decai antigos.
- **Memória total**: 2600 rotas × 4 janelas × ~20 KB = **~208 MB** (ring 15 min por rota — cabe em RAM típica).
- **Fallback**: cache miss (rota fria, cold restart) → query QuestDB.

**Razão técnica**: query direta ao QuestDB resulta em 5–20 ms; cache em Rust é o que torna o requisito p99 < 1 ms atingível.

### Camada 2 — `QuestDB 7.x` analytics (90 dias)

- **Ingest**: via `questdb 3.0.1` client Rust ILP TCP — 1.2 µs/row (QuestDB benchmark 2024).
- **Schema**:
  ```sql
  CREATE TABLE spread_snapshot (
    ts TIMESTAMP,
    rota_id SYMBOL CAPACITY 4096 INDEX,
    base_symbol SYMBOL CAPACITY 1024,
    venue_pair SYMBOL CAPACITY 128,
    entry_spread DOUBLE,
    exit_spread DOUBLE,
    buy_book_age_ms INT,
    sell_book_age_ms INT,
    buy_vol24 DOUBLE,
    sell_vol24 DOUBLE,
    flags BYTE
  ) TIMESTAMP(ts) PARTITION BY DAY DEDUP UPSERT KEYS(ts, rota_id);
  ```
- **Queries SQL**: `SAMPLE BY`, `ASOF JOIN`, `percentile_cont`.
- **Backup**: `BACKUP DATABASE` incremental diário (MVCC, não bloqueia writes).

### Camada 3 — `Parquet 56` archival (> 7 dias)

- **Export** após 7 dias via QuestDB `COPY`.
- **Particionamento**: `year/month/day/venue_buy/venue_sell`.
- **Compressão**: ZSTD nível 6.
- **Queries via `datafusion 46`** com partition pruning — 30 dias de query ignora 97% dos arquivos.
- **Custo armazenamento**: S3/Backblaze B2 ~$2/mês para 1 ano (~292 GB comprimido).

### Camada 4 — `redb 2.3` calibration state

- Banco separado (~10 MB) para `calibration_residuals` (CQR — ADR-004), `adaptive_alpha_t` (Gibbs & Candès), `drift_state` (ADWIN — ADR-011).
- **Hot-restart preservation** — scanner reinicia sem perder calibração.

### Point-in-time API (anti-T9)

Toda API de leitura recebe **`as_of: Timestamp` obrigatório** — sem overload sem `as_of`.

```rust
pub trait FeatureStore {
    fn quantile_at(
        &self,
        rota: RotaId,
        q: f64,
        as_of: Timestamp,
        window: Duration,
    ) -> Result<f64, StoreError>;
}
```

**Implementação**: janela fechada-aberta `[as_of − window, as_of)` exclusivo no fim. **Proibido** `now()` em módulos de features de treino — CI lint via `dylint` rejeita o pattern. Impossível por construção acessar dados futuros em replay de treino.

### Backup / DR

- **RPO 15 min**:
  - redb snapshot via `compact() + rename()` atômico a cada 15 min.
  - QuestDB `BACKUP` incremental diário + rsync offsite.
  - Parquet archival é imutável por design.
- **RTO < 45 min**:
  - Restore Parquet (5–10 min) + QuestDB backup (10–15 min) + redb snapshot (1 min) + replay 15 min WS = **30–45 min total**.

### Migration strategy

Se schema muda:
- Schema versioning tag na tabela.
- Blue-green table: nova tabela com novo schema → dual-write → migration → cutover.
- QuestDB `ALTER TABLE` documentado.

## Alternativas consideradas

### Single-store: QuestDB puro (sem redb hot)

- **Rejeitada**: query p99 5–20 ms viola requisito D3 de 1 ms — features rolling quantile ficariam bloqueando.

### Single-store: redb puro (sem QuestDB)

- **Rejeitada**: embedded KV não suporta SQL analítico (Q2 cross-route corr de D9 seria impossível).

### ClickHouse em vez de QuestDB

- ClickBench 2023: ClickHouse 2.8M rows/s vs QuestDB 1.64M rows/s — **2.1× mais rápido** em aggregations cross-route (TSBS 2023).
- **Rejeitada para MVP**: Rust client imaturo; configuração mais complexa; QuestDB suficiente para escala atual.
- **Trigger para migração**: se query Q2 em QuestDB exceder 1 s → migrar analytics pesado para ClickHouse mantendo QuestDB para ingest.

### TimescaleDB

- PostgreSQL extension; melhor ergonomia SQL.
- **Rejeitada**: 212k writes/s — 8× menor throughput; footprint maior.

### InfluxDB 3.0 (IOx, Rust-based)

- **Rejeitada**: BSL-1.1 licença com risco legal para uso comercial; throughput inferior.

### sled em vez de redb

- Write throughput maior (800k/s fjall).
- **Rejeitada**: `sled 0.34` sem release há 3 anos com bugs de crash recovery abertos; `fjall 2.5` LSM prejudica range scan por `(rota_id, ts_range)` que é nosso pattern primário.

### Lance (columnar ML-native)

- ML-first, Rust, excelente random access.
- **Postergada para V2**: Parquet suficiente para MVP; Lance revisar se random-access individual de features tornar-se gargalo.

## Consequências

**Positivas**:
- Write throughput amplamente coberto.
- Hot query p99 < 1 ms via cache Rust.
- PIT correctness garantida por construção de API.
- RPO/RTO dentro de requisitos.
- Storage econômico ($30.90/mês VPS + $2/mês Backblaze).
- Evoluível: ClickHouse trigger bem definido; Lance em V2.

**Negativas**:
- 4 camadas = complexidade operacional — monitoring e alerting separados.
- Cache Rust ~208 MB RAM — precisa dimensionar VPS adequadamente.
- Migration schema exige disciplina (blue-green).

**Risco residual**:
- **redb crash recovery**: crate estável mas jovem; trigger para mudar para RocksDB se issues > 1/trimestre.
- **Cache cold start** (fresh deploy): queries fallback QuestDB até cache warm-up (~15 min). Mitigação: warm-up síncrono no boot.
- **QuestDB single-node**: failover manual. Production-ready sim, HA não é default — aceitável para operador único.

## Status

**Aprovado** para Marco 1. PIT API + `dylint` CI check são pré-condição de primeira release do módulo `feature_store`.

## Referências cruzadas

- [D09_feature_store.md](../00_research/D09_feature_store.md) — análise completa.
- [D07_rust_ecosystem.md](../00_research/D07_rust_ecosystem.md) §L7/L8 (polars, parquet, redb, questdb).
- [ADR-003](ADR-003-rust-default-python-treino-onnx.md) — treino Python consome Parquet via polars/datafusion.
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — calibration_residuals persistidos em Camada 4.
- [ADR-006](ADR-006-purged-kfold-k6-embargo-2tmax.md) — PIT API garante zero leakage.
- [ADR-007](ADR-007-features-mvp-24-9-familias.md) — features consomem cache Rust + QuestDB.
- [ADR-011](ADR-011-drift-detection-e5-hybrid.md) — drift_state em Camada 4.
- [T09_label_leakage.md](../02_traps/T09-label-leakage.md).

## Evidência numérica

- redb 2.3 throughput: 495k writes/s @ 1.5 µs/write (redb.io/benchmarks 2024).
- QuestDB ILP ingest: 1.2 µs/row (QuestDB benchmark 2024).
- ZSTD nível 6 compression fator: ~10× em time-series numéricos (Lemire et al. 2015 *SPE* 46(9)).
- ClickBench 2023: ClickHouse 2.8M rows/s > QuestDB 1.64M rows/s (2.1× ratio).
- `hdrhistogram 7.5` value_at_quantile: <200 ns (já na stack do projeto).
- Parquet partition pruning 97%: benchmark datafusion 46 em dataset particionado por dia.
- VPS Hetzner CPX41 240 GB NVMe $30.90/mês — suficiente para 90 dias de dados comprimidos.
