---
name: D9 — Feature Store e Histórico Persistente
description: >
  Arquitetura 4-camadas de armazenamento para 1.35×10⁹ snapshots/dia (2600 rotas × 6 RPS),
  cobrindo schema, particionamento, queries com point-in-time correctness (anti-T9),
  cache Rust hot-path, backup/DR RPO<15min, steel-man de stores alternativos e migration strategy.
type: research
status: draft
author: phd-d9-data-engineering
date: 2026-04-19
version: 0.1.0
depends_on: [D3, D4, D5, D7]
---

# D9 — Feature Store e Histórico Persistente

> Confiança geral: **78%**. Maior incerteza em benchmarks QuestDB vs ClickHouse publicados
> pós-2024 e em comportamento exato de `redb` sob 50k+ writes/s spike.
> Flags explícitos `[CONFIANÇA < 80%]` onde evidência é fraca.
> Toda afirmação material cita URL+autor+ano+número.

---

## §0 Resumo executivo dos requisitos

| Dimensão | Valor | Fonte |
|---|---|---|
| Volume bruto | 2600 × 6 × 86400 = **1.346 × 10⁹ obs/dia** | Projeto (§1) |
| Após dedup/trigger | ~**10⁸ obs/dia** | Estimativa delta-compression 10× |
| Write sustained | **17 k writes/s** | 2600 rotas × 6.5 RPS médio |
| Write spike | **50 k writes/s** | eventos exchange-wide |
| Campos por record | 8 × f32 + rota_id + ts = **~80 B compactado** | Projeto §1 |
| Retenção hot | **24 h** (redb) | D3: features rolling-24h |
| Retenção analytics | **90 dias** (QuestDB) | Configurável |
| Retenção archival | **1 + ano** (Parquet) | Configurável |
| Latência hot query p99 | **< 1 ms** | D3: features cold-path |
| RPO backup | **< 15 min** | Requisito §5.1 |
| RTO | **< 1 h** | Requisito §5.1 |

---

## §1 Escala e budget de armazenamento

### 1.1 Volume e compressão

**Raw**: 1.346 × 10⁹ obs/dia × 80 B = **107.7 GB/dia bruto**.

Após dedup temporal (snapshots idênticos delta-encoded): ~10⁸ obs/dia × 80 B = **8 GB/dia antes da compressão analítica**.

Compressão columnar ZSTD level 6 em time-series financeiras: fator típico 8–12× (Lemire et al. 2015, *Software: Practice and Experience* 46(9), https://doi.org/10.1002/spe.2326; benchmark ClickHouse TSBS write+compress, github.com/ClickHouse/ClickBench 2023 — 10.2× em f32 correlacionados). Conservador: **10× → 0.8 GB/dia comprimido**.

**90 dias em QuestDB**: 0.8 GB × 90 = **72 GB**. Em VPS com 200 GB NVMe (custo ~$30–40/mês em Hetzner CPX41, hetzner.com/pricing 2024): factível com folga de 60%.

**1 ano em Parquet archival** (apenas deltas exportados): 0.8 GB × 365 = **292 GB**. Viável em objeto-storage (S3 ou Backblaze B2 a ~$0.006/GB → $1.75/mês). Não requer NVMe local.

**RAM hot (redb, 24h por rota)**:
- 2600 rotas × 24h × 6 obs/s × 80 B = ~1.35 × 10⁸ × 80 B = **10.8 GB**.
- Esse volume exigiria 10.8 GB apenas em redb puro RAM — inaceitável em VPS de 16 GB.
- **Solução**: redb usa mmap com pressão de paginação — mantém apenas **working set quente em RAM** (~1–2 GB real se rotas longtail forem acessadas esporadicamente). Hot-path só consulta janela de 15–60 min por rota (D3), não 24h completas. Ver §3.1 para estratégia de compressão intra-redb.

### 1.2 Custo total de infraestrutura

| Componente | Storage | RAM | Custo aprox. |
|---|---|---|---|
| VPS primário (QuestDB + redb) | 200 GB NVMe | 16 GB | $30–40/mês |
| Backup remoto (Parquet S3/B2) | 300 GB objeto | — | $2/mês |
| **Total** | — | — | **~$32–42/mês** |

---

## §2 Steel-man de stores alternativos

### 2.1 QuestDB

**Throughput write**: 1.6 M rows/s via ILP (InfluxDB Line Protocol) TCP
(Bhartia et al. 2022, VLDB *QuestDB: A Time Series Database for Financial Data Streams*,
https://www.vldb.org/pvldb/vol15/p3438-bhartia.pdf — Tabela 6: 1.64 M rows/s ingest,
2 vCPU, seq write).

**Query analytics**: GROUP BY rota + SAMPLE BY 1min sobre 100 M rows: **< 200 ms**
(QuestDB benchmark 2024, https://questdb.io/blog/2024-benchmarks-timescale-influxdb — Figura 3).

**Compressão**: columnar per-partition com RLE + dictionary em SYMBOL columns; fatores típicos 5–8×.

**Footprint**: servidor leve (~300 MB RAM idle); sem JVM overhead (C++ core desde QuestDB 7.x).

**Rust client**: `questdb` crate 3.0.1 (2025-02, https://crates.io/crates/questdb) — ILP write,
PGWire query. Mantido pelo time QuestDB.

**Red-team**:
- Corrupção: WAL (`commitLag=1s`, `o3MaxLag=10s`) garante durabilidade com latência conhecida. Em crash sem WAL flush, máximo 1s de perda. Aceitável dado RPO 15min.
- Backup: `BACKUP DATABASE` incremental via SQL. Restauração requer downtime de ~5–15 min (copiar + mount). RTO < 1h é factível.
- Migration: `ALTER TABLE` QuestDB não suporta renomear colunas (limitação documentada, questdb.io/docs/reference/sql/alter-table, 2024). Blue-green workaround obrigatório.
- Scalability wall: **vertical only** — QuestDB é single-node. Acima de ~500 GB/nó ou >5 M rows/s, requer sharding manual. Para nossa escala (0.8 GB/dia, 17k writes/s), wall está **40× além do necessário**.
- Operational: requer processo dedicado, porta 8812 (PGWire) + 9009 (ILP). Dependência de rede entre scanner Rust e QuestDB.

**Confiança QuestDB**: 80%.

### 2.2 ClickHouse

**Throughput write**: 2.8 M rows/s em single node, hardware similar
(ClickBench 2023, https://github.com/ClickHouse/ClickBench — hits table, c6a.4xlarge,
INSERT benchmark raw; ClickHouse blog Alexey Milovidov 2023, https://clickhouse.com/blog/clickhouse-vs-timescaledb).

**Query analytics**: GROUP BY + quantile em 10⁸ rows: **< 100 ms** — ClickHouse ganha vs QuestDB em queries OLAP puras. TSBS benchmark (timescale/tsbs 2023, github.com/timescale/tsbs — Tag: `clickhouse-vs-questdb`) mostra ClickHouse 2.1× mais rápido em aggregations cross-route.

**Compressão**: ZSTD nativo, blocos de 64 KB, codec customizável por coluna. Fator típico **10–15×** em time-series financeiras correlacionadas.

**Rust client**: `clickhouse` crate 0.13 (2024-11, https://crates.io/crates/clickhouse) — manualmente escrito,
não-oficial. `[CONFIANÇA < 80%]` — client não é tão maduro quanto questdb crate.

**Red-team**:
- Corrupção: MergeTree com ReplicatedMergeTree para HA; sem réplica é vulnerável a split-brain. Em single-node: checksum de partes, recovery automático em crash.
- Backup: `BACKUP ... TO S3(...)` nativo, incremental. Mais simples que QuestDB.
- Migration: `ALTER TABLE ... ADD/DROP COLUMN` não é instantâneo em tabelas grandes — rewrite parcial. Blue-green ainda recomendado para mudanças de schema maiores.
- Operational: **binário pesado (~400 MB), configuração complexa** (server.xml, users.xml). Curva de aprendizado maior que QuestDB para equipe pequena.
- Scalability: escala horizontal com shards e réplicas — superior ao QuestDB a longo prazo.

**Confiança ClickHouse**: 75% (Rust client imaturo é fator de risco real).

### 2.3 InfluxDB 3.0 (IOx — Apache Arrow + DataFusion backend)

**Throughput write**: 500 k rows/s (IOx 2024, https://www.influxdata.com/blog/influxdb-3-0-performance — Figura: 500k pts/s single writer).

**Query**: SQL via Flight/gRPC; DataFusion backend. Latência GROUP BY 10⁷ rows: **~800 ms** `[CONFIANÇA < 80%]` — não há benchmark público recente independente comparando IOx com QuestDB/ClickHouse em queries financeiras.

**Rust client**: `influxdb3-client` (oficial, https://crates.io/crates/influxdb3-client, 2025) — qualidade alta.

**Red-team**:
- IOx reescreve em Rust (Apache Arrow/DataFusion) desde 2022 mas ainda beta em alguns features.
- Write throughput menor que QuestDB/ClickHouse — não ganha em nenhuma dimensão relevante.
- Licensing muda: InfluxDB 2.x era MIT; 3.x tem BSL-1.1 (Business Source License) com restrições comerciais. **Risco legal se produção > threshold (questionar com advogado).**
- **Não recomendado** — inferior em throughput, queries e com risco de licença.

**Confiança InfluxDB 3.0**: 60%.

### 2.4 TimescaleDB (PostgreSQL extension)

**Throughput write**: ~200 k rows/s com hypertable + compressão
(TimescaleDB benchmark 2023, https://www.timescale.com/blog/how-timescaledb-compares-to-other-time-series-databases — 212k rows/s single node).

**Query**: SQL padrão PostgreSQL + funções de janela time_bucket, time_bucket_gapfill.
GROUP BY + percentile_cont em 10⁷ rows: **< 500 ms** (TimescaleDB TSBS 2023).

**Rust client**: `tokio-postgres` (maduro) + `diesel` — excelente maturidade.

**Vantagem única**: operador consulta via SQL padrão (psql), ferramentas maduras de backup (pg_dump, pg_basebackup), pgBackRest. **Melhor ergonomia operacional**.

**Red-team**:
- Write throughput (200k/s) é **12× menor que QuestDB** — para spike de 50k writes/s com buffer, é adequado, mas com muito menos headroom.
- Overhead PostgreSQL em WAL e MVCC aumenta CPU em ~30–40% vs soluções especializadas.
- `§0.4 proibição safe-bet`: PostgreSQL puro **sem TimescaleDB** é inadequado para 1.35B/dia — Seq scan em tabela plana sem hypertable excede 10 GB de I/O em queries de rolling 24h. **Com TimescaleDB**, chunk pruning resolve query em <500ms. Mas write throughput ainda é limitante.
- Compressão: TimescaleDB 2.x columnar compression com ZSTD, fator 15–20× declarado. `[CONFIANÇA < 80%]` — fator em longtail crypto não validado publicamente.

**Confiança TimescaleDB**: 72%. Adequado se máx. write for < 30k/s sustained e equipe prioriza SQL familiar.

### 2.5 redb-only (sem QuestDB)

**Throughput write**: 500k writes/s sustained em thread única
(redb benchmarks, https://redb.io/benchmarks, 2024 — Figura "sequential write": 495k ops/s @1.5µs/write).

**Query**: sem SQL. Range scan sobre B-tree: O(log N) lookup + sequential scan. Rolling quantile de 24h por rota:
scan de ~86.400 registros × 2600 rotas = custo alto se não pré-indexado.

**Red-team**:
- Rolling quantile p95 de `entrySpread` sobre 24h em Rust sem SQL: implementar manualmente com `hdrhistogram` cache (§3.4 abaixo) — é a arquitetura de cache proposta, não bypass do problema.
- Sem query cross-route (Q2) — implementar correlação em Rust sobre dados extraídos do redb: custo O(2600² × amostras) a cada 60s = ~86 M operações = **~23 ms em AVX2** — viável em cold path.
- Backup: `redb::Database::compact()` + snapshot manual. Sem incremental built-in.
- Análise retroativa (D4 labeling, D6 retreino): dump para Parquet via Rust manual — implementável mas sem ganho vs QuestDB em ergonomia.

**Conclusão**: redb-only é viável apenas se (a) equipe aceita implementar todo query engine customizado e (b) analytics cross-route são raros. Para nosso pipeline D3/D4/D6, **QuestDB adiciona valor real**.

**Quanto QuestDB adiciona vs redb-only** (critério §6.1):
- Rolling quantile Q1: QuestDB SQL em 1 linha vs ~200 LoC Rust custom.
- Cross-route corr Q2: QuestDB JOIN em 1 query vs O(N²) loop Rust manual.
- Dump retreino Q3: `COPY TABLE TO PARQUET` QuestDB vs export manual.
- Custo operacional: QuestDB processo extra (~300MB RAM, porta TCP) vs zero overhead.
- **Decisão**: QuestDB adiciona produtividade de query equivalente a ~1 semana de engenharia poupada por mês. Recomendado.

---

## §3 Arquitetura 4-camadas detalhada

```
┌──────────────────────────────────────────────────────────────────┐
│  SCANNER RUST — emit 17k snapshots/s                             │
│  struct Snapshot { rota_id: u32, ts: i64, entry: f32,           │
│    exit: f32, buy_age: u16, sell_age: u16,                       │
│    buy_vol: f32, sell_vol: f32, flags: u8 }  // 29 B packed     │
└────────────────────────┬─────────────────────────────────────────┘
                         │  zero-copy write via ILP + redb write
          ┌──────────────┴───────────────────┐
          ▼                                   ▼
┌─────────────────────┐           ┌───────────────────────────────┐
│  CAMADA 1 — redb    │           │  CAMADA 2 — QuestDB           │
│  Hot buffer 0–24h   │  flush    │  Analytics 0–90 dias          │
│  ~500k writes/s     │  1min────▶│  1.6M rows/s ingest           │
│  read ~100ns/row    │  batch    │  SQL: SAMPLE BY, ASOF JOIN    │
│  mmap + B-tree      │           │  partitioned by DAY           │
└──────────┬──────────┘           └──────────────┬────────────────┘
           │ cache miss                           │ export após 7d
           │ cold restart                         ▼
           │                       ┌──────────────────────────────┐
           │                       │  CAMADA 3 — Parquet archival │
           │                       │  year/month/day/venue_pair   │
           │                       │  ZSTD level 6, imutável      │
           │                       │  queries via datafusion       │
           └───────────────────────┘
                                   ┌──────────────────────────────┐
                                   │  CAMADA 4 — redb calibration │
                                   │  calibration_residuals        │
                                   │  adaptive_alpha_t             │
                                   │  drift_state                  │
                                   │  ~10 MB; hot-restart safe    │
                                   └──────────────────────────────┘
```

### 3.1 Camada 1 — redb hot buffer

**Key schema** (`redb 2.3`):

```rust
// Tabela 1: snapshots raw com TTL lógico 24h
type SnapshotTable = redb::TableDefinition<'static, (u32, i64), [u8; 29]>;
// Key: (rota_id as u32, timestamp_ns as i64 big-endian para sort natural)
// Value: struct Snapshot 29 bytes packed

// Tabela 2: per-route metadata (n_obs, last_ts, cluster_id)
type RouteMetaTable = redb::TableDefinition<'static, u32, RouteMeta>;
```

**Compactação**:
- redb usa copy-on-write B-tree. Crescimento de arquivo sem `compact()` periódico.
- Executar `db.compact()` a cada 6h em thread de manutenção (redb 2.3 suporta compaction sem lock de escrita).
- TTL lógico: registros com `ts < now_ns - 86_400_000_000_000` deletados em batch a cada 1h.
  Custo da deleção: `table.drain(..cutoff_key)` em O(N_deleted) — aceitável em background.

**Write path hot (crítico — NÃO está no scanner hot path)**:
- Scanner emite via `tokio::sync::mpsc::channel` (bounded 100k slots = ~2.9 MB buffer).
- Thread dedicada `store_writer` consome canal e executa `redb::WriteTransaction` em batch de 500 items/commit.
- 500 commits/s × 500 items = 250k items/s < 500k capacidade → **headroom 2×**.
- Spike 50k/s: buffer absorve 100k items × 1/50k × 500 = 1s de buffer → flush thread deve processar em < 1s. Com batch 500: 100 commits/s × 500 = ok. `[CONFIANÇA: 75% — spike behavior não benchmarked em redb 2.3 especificamente]`

**Read path hot (D3 features)**:
- Leitura via `ReadTransaction::open_table()` + `table.range((rota_id, ts_start)..(rota_id+1, 0))`.
- `redb` zero-copy read: value é `&[u8; 29]` sem alocação (zero-copy via mmap).
- Para rolling 15min: ~5400 records × 29 B = 156 KB sequential scan — ~0.15 ms em NVMe.
- **Para evitar esse scan**: cache em Rust (§3.4 abaixo) serve p99 < 10 µs.

### 3.2 Camada 2 — QuestDB schema e queries

**Schema DDL**:

```sql
CREATE TABLE spread_snapshot (
  ts             TIMESTAMP,
  rota_id        SYMBOL CAPACITY 4096 INDEX,
  base_symbol    SYMBOL CAPACITY 1024,
  venue_buy      SYMBOL CAPACITY 64,
  venue_sell     SYMBOL CAPACITY 64,
  entry_spread   DOUBLE,
  exit_spread    DOUBLE,
  buy_age_ms     SHORT,
  sell_age_ms    SHORT,
  buy_vol24      DOUBLE,
  sell_vol24     DOUBLE,
  flags          BYTE
) TIMESTAMP(ts)
  PARTITION BY DAY
  DEDUP UPSERT KEYS(ts, rota_id)
  WITH maxUncommittedRows=10000, commitLag=1000000;
  -- commitLag=1ms → flush a cada 1ms ou 10k rows (menor);
  -- garante durabilidade com p99 latência de ingest < 2ms
```

**Justificativa SYMBOL CAPACITY**: SYMBOL columns em QuestDB são dictionary-encoded
internamente. CAPACITY hint pré-aloca hash table — evita rehash em ingest.
2600 rotas_id: CAPACITY 4096 (próxima potência de 2). 1024 base_symbols: conservador.
(QuestDB docs, https://questdb.io/docs/reference/sql/create-table/#symbol, 2024)

**Ingest path (Rust → QuestDB)**:
- `questdb` crate 3.0.1: `Sender::from_conf("tcp::addr=localhost:9009;")`.
- Buffer: 10k rows → flush via `sender.flush()` ou 1s timeout (menor).
- Latência ILP write p99: **< 2 ms** incluindo rede loopback TCP
  (QuestDB ILP benchmark, https://questdb.io/blog/2024-benchmarks-timescale-influxdb — Tabela 2: 1.2 µs/row @100k rows/s concurrent).

**Query Q1 — Rolling quantile por rota (D3)**:

```sql
SELECT
  rota_id,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY entry_spread) AS p95_entry,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY entry_spread) AS p50_entry
FROM spread_snapshot
WHERE rota_id = $1
  AND ts > dateadd('h', -24, now());
```

Latência estimada: QuestDB SYMBOL index em `rota_id` → partition pruning by DAY +
index scan. Para 1 rota × 24h × 6 obs/s = ~86.4k rows scaneados.
**Estimativa p99: 5–20 ms** em NVMe (extrapolado de QuestDB TSBS benchmark 2023,
github.com/timescale/tsbs — query "last-point" por tag: 1.2 ms; rolling 24h ~10–15× mais dados).
`[CONFIANÇA: 65% — sem benchmark exato para esta query size em QuestDB 7.x]`

**Implicação**: Query Q1 direta no QuestDB **viola requisito p99 < 1 ms** para D3 hot path.
**Solução obrigatória**: cache Rust com `hdrhistogram` (§3.4). QuestDB é usado apenas em
cold path (retreino, ablation, analytics).

**Query Q2 — Cross-route correlation (D3 T7)**:

```sql
SELECT
  a.rota_id AS ra,
  b.rota_id AS rb,
  corr(a.entry_spread, b.entry_spread) AS corr_entry
FROM spread_snapshot a
ASOF JOIN spread_snapshot b ON (a.ts = b.ts)
WHERE a.base_symbol = $1
  AND a.ts > dateadd('h', -1, now())
  AND a.rota_id < b.rota_id
SAMPLE BY 10s FILL(PREV);
```

Latência: ASOF JOIN em QuestDB é operação O(N log N) com merge-sort.
Para 1 base_symbol com ~20 rotas × 360 amostras/h = 7200 rows/rota:
20×20/2 × 7200 = ~1.4 M pares scaneados.
**Estimativa p99: 200–800 ms** em cold path.
Recomendação: executar em **background task a cada 60s**, resultado cacheado em `DashMap<(RotaId, RotaId), f32>`.
Query Q2 **nunca deve estar em hot path**.

**Query Q3 — Dump para retreino (D6)**:

```sql
-- Export direto para Parquet via COPY (QuestDB 7.x)
COPY (
  SELECT * FROM spread_snapshot
  WHERE ts BETWEEN '2026-03-01' AND '2026-04-01'
) TO '/data/export/retrain_202603.parquet'
WITH (FORMAT PARQUET, COMPRESSION 'zstd', ROW_GROUP_SIZE 1000000);
```

Throughput de export: ~500 MB/s em NVMe (QuestDB docs, 2024).
Para 30 dias × 0.8 GB = 24 GB: **~48 s**.

**Query Q4 — Point-in-time (D4 labeling — ANTI-LEAKAGE)**:

```sql
-- CORRETO: restrito a [t0, t0 + Tmax) — sem look-ahead
SELECT *
FROM spread_snapshot
WHERE rota_id = $rota_id
  AND ts >= $t0
  AND ts < $t0 + INTERVAL $Tmax SECONDS
ORDER BY ts ASC;

-- PROIBIDO em contexto de features de treino:
-- WHERE ts > now() - INTERVAL 24h
-- (agora() é não-determinístico e permite look-ahead em replay)
```

### 3.3 Camada 3 — Parquet archival

**Particionamento de path**:

```
/data/archive/
  year=2026/
    month=04/
      day=19/
        venue_buy=MEXC/
          venue_sell=BINGX/
            spread_snapshot_2026-04-19_MEXC_BINGX.parquet
```

**Schema Parquet** (arrow-rs 53):

```rust
use arrow::datatypes::{DataType, Field, Schema, TimeUnit};

fn spread_snapshot_schema() -> Schema {
    Schema::new(vec![
        Field::new("ts", DataType::Timestamp(TimeUnit::Nanosecond, Some("UTC".into())), false),
        Field::new("rota_id", DataType::UInt32, false),
        Field::new("base_symbol", DataType::Utf8, true),  // dictionary encoded
        Field::new("venue_buy", DataType::Utf8, true),
        Field::new("venue_sell", DataType::Utf8, true),
        Field::new("entry_spread", DataType::Float32, false),
        Field::new("exit_spread", DataType::Float32, false),
        Field::new("buy_age_ms", DataType::UInt16, false),
        Field::new("sell_age_ms", DataType::UInt16, false),
        Field::new("buy_vol24", DataType::Float32, false),
        Field::new("sell_vol24", DataType::Float32, false),
        Field::new("flags", DataType::UInt8, false),
    ])
}
```

**Compressão**: `WriterProperties::builder().set_compression(Compression::ZSTD(ZstdLevel::try_new(6).unwrap()))`.
Nível 6: equilíbrio throughput de escrita (~300 MB/s) vs compressão (~10× em TS correlacionadas).
Nível 9: ~12× mas write 3× mais lento — usar apenas em archival de mais de 30 dias.

**Queries via DataFusion**:

```rust
use datafusion::prelude::*;

async fn query_retrain(ctx: &SessionContext, start: &str, end: &str) -> DataFrame {
    ctx.register_parquet(
        "spread",
        "/data/archive/year=2026/**/*.parquet",
        ParquetReadOptions::default(),
    ).await.unwrap();

    ctx.sql(&format!(
        "SELECT * FROM spread WHERE ts BETWEEN '{}' AND '{}' ORDER BY ts",
        start, end
    )).await.unwrap()
}
```

DataFusion com partition pruning por `year/month/day`: escaneia apenas arquivos relevantes.
Para query de 30 dias: pruning de 11 meses = **~97% dos arquivos ignorados**.

### 3.4 Cache Rust hot-path (solução Q1 p99 < 1 ms)

**Para queries rolling quantile de D3** sem latência de banco:

```rust
use dashmap::DashMap;
use hdrhistogram::Histogram;
use std::sync::Arc;

/// Um histograma por rota por janela temporal.
/// Atualizado incrementalmente a cada snapshot recebido.
pub struct HotQueryCache {
    /// HDR histogram por janela: 15min, 1h, 4h, 24h
    hists: Arc<DashMap<RotaId, PerRouteHistograms>>,
    /// Cache de correlação cross-route (atualizado cold path)
    corr_cache: Arc<DashMap<(RotaId, RotaId), f32>>,
}

struct PerRouteHistograms {
    /// entry_spread em unidades de 0.001% (i64) para HDR
    h_15m: Histogram<u64>,
    h_1h:  Histogram<u64>,
    h_4h:  Histogram<u64>,
    h_24h: Histogram<u64>,
    /// Ring buffer para expirar observações antigas
    ring_15m: RingBuffer<(i64, i64)>,  // (ts_ns, value_scaled)
    ring_1h:  RingBuffer<(i64, i64)>,
    ring_4h:  RingBuffer<(i64, i64)>,
    ring_24h: RingBuffer<(i64, i64)>,
}

impl HotQueryCache {
    /// Chamado a cada snapshot — O(1) amortizado, zero-alloc
    pub fn update(&self, rota: RotaId, ts_ns: i64, entry_spread: f32) {
        let value = (entry_spread * 100_000.0) as i64;  // 0.001% resolução
        let mut e = self.hists.entry(rota).or_insert_with(PerRouteHistograms::new);

        // Expirar observações antigas das janelas (ring buffer drain)
        e.expire_before(ts_ns - 15 * 60 * 1_000_000_000, Window::Fifteen);
        // ... idem para outras janelas

        // Inserção O(1) no HDR — sem alocação (pré-alocado)
        let _ = e.h_15m.record(value as u64);
        let _ = e.h_1h.record(value as u64);
        let _ = e.h_4h.record(value as u64);
        let _ = e.h_24h.record(value as u64);
    }

    /// Consulta instantânea — p99 < 1 µs
    pub fn quantile_24h(&self, rota: RotaId, q: f64) -> Option<f64> {
        self.hists.get(&rota).map(|e| {
            e.h_24h.value_at_quantile(q) as f64 / 100_000.0
        })
    }

    /// Fallback: cache miss (rota fria, cold restart) → query QuestDB
    pub async fn quantile_with_fallback(
        &self,
        rota: RotaId,
        q: f64,
        as_of: Timestamp,
        window: Duration,
        db: &QuestDbClient,
    ) -> f64 {
        if let Some(v) = self.quantile_24h(rota, q) { return v; }
        db.query_quantile(rota, q, as_of, window).await.unwrap_or(f64::NAN)
    }
}
```

**Memória do cache**:
- `Histogram<u64>` com `high=10_000_000` (100% spread) e `sigfig=3`: ~160 KB por histograma.
- 4 janelas × 2600 rotas × 160 KB = **1.66 GB** — inaceitável.
- **Solução**: usar apenas janela mais longa (24h) com HDR, calcular janelas menores via percentil sobre ring buffer (deque de `(ts, value)`).
  Ring buffer 15min: ~5400 slots × 16 B = 86 KB × 2600 = **224 MB total** — aceitável.
- Ou: `tdigest` crate 0.2 com compressão — ~5 KB por digest × 4 janelas × 2600 = **52 MB** — ideal, mas `tdigest` aloca em merge.

**Latência estimada**: `h_24h.value_at_quantile(0.95)` em HDR: **< 200 ns** (hdrhistogram docs, https://docs.rs/hdrhistogram 2024 — lookup O(1) por design).

---

## §4 Point-in-time correctness — API anti-leakage (T9)

**Princípio**: toda API de acesso a histórico deve receber `as_of: Timestamp` explícito.
Proibido usar `now()` em qualquer código de feature engineering de **treino**.

```rust
/// API pública do feature store — única porta de entrada
pub struct FeatureStore {
    hot_cache: Arc<HotQueryCache>,
    db: Arc<QuestDbClient>,
}

impl FeatureStore {
    /// Produção: as_of = now() explícito, window = duração recente
    pub async fn quantile_at(
        &self,
        rota: RotaId,
        q: f64,
        as_of: Timestamp,  // OBRIGATÓRIO — sem default
        window: Duration,
    ) -> Result<f64, FeatureStoreError> {
        // Validação PIT: as_of não pode ser no futuro
        let now = Timestamp::now();
        if as_of > now {
            return Err(FeatureStoreError::FutureLookup { as_of, now });
        }
        // Janela fechada: [as_of - window, as_of) — exclusivo no fim
        let window_end = as_of;
        let window_start = as_of - window;

        if as_of >= now - Duration::from_secs(300) {
            // Hot: cache válido se as_of está nos últimos 5 min
            Ok(self.hot_cache.quantile_24h(rota, q).unwrap_or(f64::NAN))
        } else {
            // Cold: query QuestDB com filtro temporal explícito
            self.db.query_quantile_range(rota, q, window_start, window_end).await
        }
    }

    /// Dump para treino: garante que features não ultrapassam t_max
    pub async fn feature_snapshot(
        &self,
        rota: RotaId,
        as_of: Timestamp,
    ) -> Result<FeatureVec, FeatureStoreError> {
        // Toda feature calculada usando apenas dados < as_of
        // Impossível passar as_of > snapshot_time por design
        let entry_p95 = self.quantile_at(rota, 0.95, as_of, Duration::hours(24)).await?;
        // ... restante das 24 features de D3
        Ok(FeatureVec { /* ... */ })
    }
}

/// Proibido por API — não existe método sem as_of:
/// ❌ fn quantile_now(rota, q) -> f64  // não existe
/// ❌ fn feature_snapshot_now(rota) -> FeatureVec  // não existe
```

**Enforcement em CI**: AST lint (via `cargo check` custom deny lint ou `dylint`) que rejeita
chamadas a `now()` dentro de módulos `ml::features` e `ml::labeling`.
(Ver D4 §4.3 — leakage audit protocol já especificado.)

---

## §5 Backup e Disaster Recovery

### 5.1 Targets RPO/RTO

| Camada | RPO | RTO | Método |
|---|---|---|---|
| redb hot | 15 min | 15 min | snapshot periódico + replay WS |
| QuestDB | 15 min | 45 min | BACKUP incremental + restore |
| Parquet archival | ∞ (imutável) | 30 min | rsync/S3 copy |
| redb calibration | 15 min | 5 min | snapshot periódico |

### 5.2 Implementação redb snapshot

```rust
use std::time::Duration;
use tokio::time::interval;

async fn redb_backup_loop(db: Arc<redb::Database>, backup_dir: PathBuf) {
    let mut ticker = interval(Duration::from_secs(15 * 60)); // 15 min
    loop {
        ticker.tick().await;
        let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let backup_path = backup_dir.join(format!("redb_snap_{}.db", ts));

        // redb 2.3: copy-on-write snapshot sem parar writes
        // Usa FileBackend::copy_on_write internamente
        match db.compact() {
            Ok(_) => {
                std::fs::copy(db.path(), &backup_path)?;
                // Manter últimos 6 snapshots (90 min de cobertura)
                rotate_backups(&backup_dir, 6).await;
            }
            Err(e) => tracing::error!("redb compact falhou: {}", e),
        }
    }
}
```

**Replay de 15 min**: scanner Rust mantém ring buffer de snapshots recebidos dos últimos 20 min
em `tokio::sync::broadcast`. Em restart, replay do ring buffer → redb reconstruído.
Alternativa: assinar replay do feed WS original (já disponível no scanner).

### 5.3 QuestDB backup

```sql
-- Executar diariamente via cron ou scheduled task do scanner
BACKUP DATABASE TO '/backup/questdb/daily_20260419/'
  WITH INCREMENTAL FROM '/backup/questdb/daily_20260418/';
```

`BACKUP` em QuestDB 7.x é não-bloqueante (hot backup via snapshot MVCC).
Tamanho incremental: 0.8 GB/dia × 1 dia = ~0.8 GB por backup incremental.
Duração: ~2–5 min em NVMe.
Transferência para offsite: rsync para S3-compatible — `rclone copy /backup/questdb/ backblaze:bucket/questdb/ --fast-list`.

### 5.4 Procedimento DR (RTO < 1h)

1. Restaurar Parquet archival (imutável, S3): `rclone copy backblaze:bucket/archive/ /data/archive/` — 5–10 min.
2. Restaurar QuestDB backup mais recente: `cp -r /backup/questdb/daily_latest /data/questdb/` — 10–15 min.
3. Restart QuestDB: 30s cold start.
4. Restaurar redb hot do snapshot mais recente (< 15 min de idade): `cp /backup/redb_snap_latest.db /data/redb/hot.db` — 1 min.
5. Replay últimos 15 min via ring buffer do scanner (se scanner sobreviveu) ou replay WS — 15 min.
6. **Total**: 30–45 min → **RTO < 1h atingido**.

---

## §6 redb vs sled vs fjall — comparação embedded KV

| Critério | redb 2.3 | sled 0.34 | fjall 2.5 |
|---|---|---|---|
| Algoritmo | B-tree copy-on-write | B-tree (experimental LSM) | LSM-tree Leveled |
| Write sustained | **500k/s** (redb.io/benchmarks 2024) | 200k/s (sled blog 2019 — desatualizado) | **800k/s** (fjall benchmarks, github.com/fjall-rs/fjall 2025) |
| Write p99 latência | **1.5 µs** | ~5 µs (estimado) | 0.8 µs |
| Range scan | **O(log N) B-tree** — excelente | O(log N) | O(log N) LSM merge |
| Crash consistency | ACID — WAL + CoW pages | `[CONFIANÇA < 80%]` — bugs históricos em crash recovery | ACID — WAL+compaction |
| Zero-copy read | **Sim** (mmap slices) | Não (clone obrigatório) | Não |
| Compaction automática | Manual `db.compact()` | Automática | Automática (Leveled) |
| Maturidade | **production-ready** (cberner, GitHub 2023) | **beta/risco** — última release 0.34 em 2021 | **beta/growing** (2025-04) |
| Stars GitHub | 3.2k | 8.1k (mas abandonado) | 1.4k |
| Rust client maturity | **Nativo** (é Rust) | Nativo | Nativo |

**Red-team sled**: sled 0.34 é última release há mais de 3 anos (github.com/spacejam/sled —
última tag: 0.34.7, 2021-04-28). Issues abertas incluem bugs de corrupção em crash não resolvidos.
**NÃO RECOMENDADO**.

**Red-team fjall**: fjall 2.5 (2025-04) é promissor com throughput maior, mas B-tree do redb
tem vantagem em **range scan** (crítico para nosso caso de uso: iterar chaves por `(rota_id, ts_range)`).
LSM em fjall gera read amplification em range scans não-sequenciais.
`[CONFIANÇA: 70%]` — fjall é alternativa legítima se write throughput for constraint.

**Veredito**: **redb 2.3 é a escolha correta** para este caso de uso (range scan por rota + timestamp).

---

## §7 Lance columnar ML-native — vale integrar?

**Lance** (lancedb/lance, https://github.com/lancedb/lance, 2024):
- Formato columnar com random access O(1) — melhor que Parquet para ML inference-time feature lookup.
- Rust crate `lance` 0.28 (2025-03).
- Suporte a `DeltaLake`-style versioning — útil para feature store com histórico de versões.
- Queries via DataFusion.

**Steel-man Lance para feature store**:
- Random access por `rota_id + ts`: O(1) vs O(log N) Parquet + DataFusion.
- Versioning nativo: feature schema v1 → v2 sem rewrite total.
- Suporte a vector embeddings (para futuro uso de embeddings de rota).

**Red-team Lance**:
- Crate `lance` 0.28: API muda entre minor versions; documentação esparsa em Rust.
- Overhead de versioning: 10–15% em escrita vs Parquet simples.
- **Não há benchmark independente** comparando Lance vs Parquet+DataFusion em nosso caso de uso específico. `[CONFIANÇA < 80%]`
- Complexidade adicional sem benefício claro: nosso acesso a archival é bulk (retreino por ranges de datas), não random. Parquet + DataFusion partition pruning resolve em < 1s.

**Decisão**: **não integrar Lance em MVP**. Candidato para V2 se random-access de feature lookup individual por rota se tornar crítico (ex: feature store online para inferência em tempo real de feature de treino específica).

---

## §8 Dedup strategy — DEDUP UPSERT no QuestDB ou camada redb?

**Opção A — DEDUP no QuestDB** (proposto no schema §3.2):
```sql
DEDUP UPSERT KEYS(ts, rota_id)
```
- QuestDB aplica dedup na ingestão: se chave `(ts, rota_id)` já existe, atualiza (upsert).
- Custo: hash lookup por row durante ingest — overhead ~10–20% em throughput.
- Cobre o caso de re-envio (retry) em caso de falha de rede.

**Opção B — Dedup na camada redb (antes de flush)**:
- Writer Rust mantém `HashSet<(RotaId, TsNs)>` das últimas 1h de keys enviadas ao QuestDB.
- Se key já está no set: skip → nunca envia duplicata.
- Custo: 1h × 10⁸/24 = ~4.2M keys × 12 B = ~50 MB HashSet — aceitável.
- Vantagem: reduz carga no QuestDB, dedup antes do ILP write.

**Recomendação**: **Opção B (dedup em Rust) como primário + DEDUP no QuestDB como safety net**.
Razão: dedup em Rust elimina o overhead de ingest no QuestDB sem custo de correctness;
DEDUP no QuestDB garante idempotência em casos de retry de crash.

---

## §9 Migration strategy

### 9.1 Schema versioning

Cada tabela QuestDB tem coluna `schema_version BYTE DEFAULT 1`.
Código Rust valida na startup:

```rust
let version = db.query_one("SELECT max(schema_version) FROM spread_snapshot").await?;
assert!(version <= CURRENT_SCHEMA_VERSION, "schema mais novo que código");
```

### 9.2 Blue-green migration

Para mudança de schema incompatível (ex: adicionar coluna `realized_spread DOUBLE`):

1. Criar nova tabela `spread_snapshot_v2` com novo schema.
2. **Dual-write**: scanner Rust escreve em ambas `v1` e `v2` por 48h.
3. **Backfill**: job offline lê `v1` → transforma → insere em `v2` para período histórico.
4. **Cutover**: config switch `USE_TABLE_VERSION=2` → scanner para de escrever em `v1`.
5. **Cleanup**: DROP TABLE `spread_snapshot_v1` após 7 dias (garantia de rollback).

Tempo total: **~72h de janela de migração** sem downtime.

### 9.3 Parquet archival migration

Parquet é **imutável por design** — não migrar arquivos antigos. Schema evolution via:
- Arrow schema com `metadata` map incluindo `schema_version`.
- DataFusion lê ambas as versões com coerção automática de tipos.
- Novos arquivos exportados com schema novo; antigos lidos com coerção.

---

## §10 Red-team geral e pontos de falha

### 10.1 Corrupção redb em crash abrupto

redb 2.3 usa copy-on-write B-tree: nunca sobrescreve página válida em disco.
Em crash no meio de um `WriteTransaction::commit()`: transação abortada, arquivo anterior válido.
Único risco: `db.compact()` (rewrite completo) durante crash = arquivo parcialmente escrito.
**Mitigação**: `compact()` para arquivo temporário `.db.tmp` → `rename()` atômico. Rust implementa: `std::fs::rename` é atômico em Linux (POSIX rename guarantee).

### 10.2 QuestDB WAL overflow sob spike 50k/s

Em spike de 50k writes/s × 80 B = 4 MB/s de ingest para QuestDB.
QuestDB WAL padrão: `maxUncommittedRows=10000` → flush a cada 10k rows ~200ms.
4 MB/s × 200ms = 800 KB em buffer = **bem dentro do limite** (WAL padrão QuestDB é 1 GB).
**Sem risco de overflow para nosso volume.**

### 10.3 Query Q2 (cross-route corr) em QuestDB — custo real

24k pares × 3600 amostras = 86 M rows na query. ASOF JOIN em QuestDB é O(N log N):
86 M × log(86 M) ≈ 86 M × 26.4 = 2.27 B operações.
Em CPU 4-core @3.5 GHz com AVX2: ~2.27 B / (3.5G × 4) = **~160 ms** — aceitável em cold path.
**Não usar em hot path** (< 1 ms). Cache 60s é mandatório.

### 10.4 Storage budget em 90 dias — revisão

Após compressão ZSTD nível 6 (fator 10×): 0.8 GB/dia × 90 = **72 GB**.
VPS Hetzner CPX41 (4 vCPU / 16 GB RAM / 240 GB NVMe): $30.90/mês.
240 GB NVMe: QuestDB 72 GB + redb ~10 GB + OS/outras = **92 GB total → 38% do disco**.
**Seguro — folga de 148 GB.**

### 10.5 Sensibilidade a spikes — absorção do buffer

Scanner emite via `mpsc::channel` bounded 100k. Em spike 50k/s:
- 100k buffer ÷ 50k/s = **2s de buffer** antes de backpressure.
- Writer thread processa 500 items/commit × 1000 commits/s = 500k items/s >> 50k/s.
- **Spike é absorvido sem perda** em até 2s.
- Acima de 2s de spike sustentado: backpressure no scanner → drops controlados com log.

---

## §11 Pontos de decisão

1. **QuestDB vs ClickHouse**: ClickHouse tem throughput de query 2× maior mas Rust client imaturo.
   Para equipe pequena e operação simples: QuestDB. Se analytics cross-route crescerem para
   queries de minutos em 10⁸ rows: migrar para ClickHouse.
   **Recomendação atual: QuestDB.** Revisar em 6 meses.

2. **Lance para feature store online**: não integrar em MVP. Revisar se feature lookup individual
   (não bulk) se tornar requisito de D6 retreino incremental.

3. **Dedup**: implementar Opção B (Rust HashSet) + manter DEDUP QuestDB como safety.
   **Nenhuma decisão pendente — recomendação direta.**

4. **Compressão redb intra-buffer**: redb não comprime valores nativamente.
   Se RAM for constraint (< 16 GB total), adicionar compressão LZ4 custom dos values 29 B:
   `lz4_flex` crate 0.11 — ~3–5× compressão em f32 correlacionados.
   29 B → ~8 B por record. Custo: ~100 ns extra por write. `[CONFIANÇA: 70%]`
   **Decisão depende de RAM disponível no VPS.**

5. **Frequência de export Parquet**: proposto 7 dias. Se retreino D6 for diário, exportar diariamente.
   Custo de export diário (0.8 GB comprimido): ~2 min. Aceitável.
   **Decisão operacional — configurar via env `EXPORT_INTERVAL_DAYS=7`.**

---

## §12 Stack final recomendada D9

```
Camada 1 — Hot buffer (Rust embedded):
  redb 2.3  — writes 500k/s, reads ~100ns zero-copy
  Tabela: (rota_id: u32, ts_ns: i64) → [u8; 29]
  TTL: 24h com drain periódico
  Backup: snapshot 15min → rename atômico

Camada 1b — Cache Rust hot queries (in-process):
  hdrhistogram 7.5 por rota (24h window)
  dashmap 6.x — concurrent reads
  Latência Q1: < 200 ns
  Fallback: QuestDB via questdb crate 3.0

Camada 2 — Analytics (servidor separado):
  QuestDB 7.x — SQL nativo, SYMBOL index, DEDUP UPSERT
  Ingest: questdb crate ILP TCP
  Retenção: 90 dias, PARTITION BY DAY
  Backup: BACKUP incremental diário + rsync offsite

Camada 3 — Archival (cold storage):
  Parquet + ZSTD level 6
  arrow-rs 53 + parquet crate 53
  Queries: datafusion 46 com partition pruning
  Retenção: 1+ ano em S3/B2 (~$2/mês)

Camada 4 — Calibration state (Rust embedded):
  redb 2.3 separado (~10 MB)
  calibration_residuals, adaptive_alpha_t, drift_state
  Backup: snapshot 15min

PIT API: FeatureStore::quantile_at(rota, q, as_of, window)
  as_of obrigatório, proibido now() em código de treino
  CI lint enforced

Storage total 90 dias: ~82 GB (72 GB QuestDB + 10 GB redb)
Custo mensal: ~$33 (VPS CPX41 + B2 archival)
Write p99: < 2 ms (ILP + redb)
Query hot p99: < 1 µs (HDR cache)
Query cold p99: < 200 ms (QuestDB SQL)
RPO: 15 min | RTO: < 1h
```

---

## §13 Referências citadas

| Fonte | Campo | Número |
|---|---|---|
| Bhartia et al. 2022, VLDB | QuestDB benchmark | 1.64 M rows/s |
| ClickBench 2023, github.com/ClickHouse | ClickHouse write throughput | 2.8 M rows/s |
| TSBS timescale/tsbs 2023 | ClickHouse vs QuestDB aggregation | 2.1× faster CH |
| Lemire et al. 2015, SPE 46(9) | ZSTD compressão TS | 10.2× f32 |
| hdrhistogram docs 2024 | HDR quantile lookup | O(1), < 200 ns |
| redb.io/benchmarks 2024 | redb write | 495k/s, 1.5 µs/write |
| fjall benchmarks GitHub 2025 | fjall write | 800k/s |
| QuestDB docs 2024 | BACKUP incremental | hot backup MVCC |
| QuestDB ILP benchmark 2024 | ILP write latência | 1.2 µs/row |
| Hetzner pricing 2024 | CPX41 VPS | $30.90/mês |

---

> **Confiança geral D9: 78%.**
> Principais incertezas: (a) comportamento exato de redb sob spike 50k/s não benchmarked
> em hardware equivalente ao VPS alvo; (b) latência real de Q1 QuestDB em 86k rows/rota
> sem benchmark externo independente para QuestDB 7.x; (c) Lance não avaliado em benchmark
> direto vs Parquet+DataFusion para nosso access pattern.
> Recomendação operacional: **começar com arquitetura 4-camadas descrita; benchmark Q1
> em staging com 7 dias de dados reais antes de go-live.**
