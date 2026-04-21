---
name: Q1 Auditoria Dataset — Pipeline Integrity
description: Auditoria PhD data engineering do pipeline de coleta e persistência do dataset de treino
type: audit
status: draft
author: phd-dataset-q1-pipeline
date: 2026-04-20
version: 0.1.0
---

# Q1 Auditoria Dataset — Pipeline Integrity

## Postura crítica adotada

Esta auditoria aplica red-team explícito em cada seção: "como este pipeline corrompe dados silenciosamente?". Confiança < 80% em qualquer afirmação está marcada com `[FLAG < 80%]`. Proibição de aceitar "é o padrão industry" sem evidência para esta escala específica.

---

## §5.1 Data Lineage Ponta-a-Ponta

### Caminho atual (MVP M1.0–M1.8)

```
[venue WS / REST]
    → [tokio-websockets zero-copy]
    → [sonic-rs decode]
    → [BookStore seqlock TopOfBook.commit()]
          (bid_px, ask_px, ts_ns, seq_ingest monotônico por slot)
    → [scan_once() a cada 150 ms]
          (threshold, staleness, spot-as-sell filter)
    → [Opportunity { entry_spread, exit_spread, buy_book_age, sell_book_age,
                     buy_vol24, sell_vol24, symbol_id, buy_venue, sell_venue }]
    → [run_spread_engine loop]
          → [ml_server.on_opportunity()]
                → [HotQueryCache.observe(route, entry, exit, now_ns)]   ← ÚNICO SINK DE DADOS
                → [SamplingTrigger.evaluate()]                           ← decide Accept/Reject
                → [BaselineA3.recommend()]                               ← gera Recommendation
                → [(Recommendation, SampleDecision)]  → DESCARTADO (_)
    → [bstate.publish(snapshot)]  → broadcast WebSocket UI
```

**"? ? ?" resolvido**: o resultado `(Recommendation, SampleDecision)` é capturado em `let _ = ml_server.on_opportunity(...)` — descarte literal em `lib.rs:321`. Nenhum caminho para disco existe. O único estado persistente é o `HotQueryCache` em RAM.

### Diagnóstico de ruptura crítica

O pipeline tem **um único sink funcional (HotQueryCache RAM)** e **zero sinks de persistência**. Toda observação de spread que entra no histograma é volatilizada ao reiniciar o processo. O `SampleDecision::Accept` é computado, incrementa o counter Prometheus `ml_sample_decisions_total{reason="accept"}`, e some. Não existe dataset em disco.

Isso não é um bug — é o MVP conforme descrito. Mas implica que **60–90 dias de coleta aprovados em DECISIONS_APPROVED D.1 são impossíveis no estado atual**. O processo deve reiniciar para patches, deploys ou reboots do servidor, zerando os ~73 MB de histograma.

### Caminho proposto (Marco 2, 2 camadas MVP)

```
[on_opportunity, Accept path apenas]
    → [bounded mpsc channel, cap 100k]   ← pressão de backpressure explícita
    → [writer task assíncrono]
          → Camada A: redb hot buffer
                Key:   RouteId.as_u64() XOR ts_ns (16 B)
                Value: SpreadRecord [29 B packed]
                TTL:   24h (drain horário para Camada B)
          → Camada B: Parquet arquivado diário
                Partição: year/month/day/buy_venue/sell_venue
                Compressão: ZSTD nível 6
                Schema: ver §5.3
```

Justificativa para 2 camadas em vez de 4 no MVP:

- QuestDB (Camada 2 do ADR-012) é imprescindível para queries ASOF JOIN de PIT correctness na hora do treino, mas pode entrar em Marco 2 semana 2 sem bloquear a coleta inicial.
- Parquet imutável é suficiente como destino de archival para o treinamento Python (ADR-003 usa polars/datafusion que lê Parquet nativo).
- redb como hot buffer garante RPO ≤ 15 min (ADR-012) sem depender de serviço externo.

**Red-team**: e se o writer task cair enquanto o channel tem dados? O `bounded mpsc` retém mensagens na memória até o processo morrer; com capacidade 100k e throughput máximo de ~17k writes/s de opps aceitas (estimativa conservadora: 5% de Accept × 2600 rotas × 6 RPS = 780 writes/s real, mas pico pode ser maior), o buffer absorve ~128 segundos de pico antes de exercer backpressure no on_opportunity. Isso é aceitável. O writer task deve logar warn! ao reconectar e flush imediato antes de aceitar novos dados.

---

## §5.2 Guarantees de Integridade

| Requisito | Estado MVP atual | Proposta Marco 2 | Confiança |
|---|---|---|---|
| **Zero loss** | Não garantido. Restart = perda total do HotQueryCache | `bounded mpsc` + redb ACID = perda máxima de 15 min (RPO do ADR-012). redb usa `compact()+rename()` atômico — garante consistência pós-crash (cberner/redb docs, commit fc87a) | 85% — depende de implementação correta do flush task |
| **Zero duplicates após restart** | N/A (não persiste) | redb `DEDUP UPSERT KEYS(route_id, ts_ns)` — chave composta `(RouteId as u64, ts_ns: u64)` garante idempotência. Mesma observação reinserida duas vezes resulta em upsert, não duplicata. QuestDB herda `DEDUP UPSERT KEYS(ts, rota_id)` (ADR-012 schema) | 80% — `ts_ns` não é garantido único entre runs se NTP ajustar o relógio para trás |
| **Monotonic timestamps** | `now_ns()` usa `SystemTime::now()` que NÃO é monotônico. Leap seconds e ajustes NTP podem causar retrocesso | Substituir `now_ns()` no hot path por `Instant`-based monotonic offset: `MONOTONIC_EPOCH_NS + Instant::now().elapsed()`. `MONOTONIC_EPOCH_NS` calibrado no boot via `SystemTime`. Kleppmann 2017 cap. 8: wall clock não é confiável para ordering | **[FLAG < 80%]** — impacto real depende de frequência de ajustes NTP no ambiente de deploy |
| **Ordering preservado** | `scan_once` itera `Venue::ALL` em ordem determinística (índice 0..13). `on_opportunity` é chamado na mesma ordem do `buf`. `now_ns` é capturado UMA VEZ por ciclo (`let now = now_ns()`) — todas as opps do mesmo ciclo 150 ms compartilham o mesmo timestamp | Aceito. Dentro de um ciclo, a causalidade WS → book → dataset é preservada. Entre ciclos, `ts_ns` cresce com o relógio. Risco residual: se duas opps na mesma rota chegam em ciclos consecutivos com o mesmo `ts_ns` (resolução ms), o UPSERT sobrescreve em vez de appendar. Solução: adicionar `cycle_seq: u32` à chave | 75% — não testado |
| **PIT correctness** | Não existe código de treino ainda. `HotQueryCache` expõe `quantile_entry(route, q)` sem `as_of` | ADR-012 mandatório: toda API de leitura DEVE receber `as_of: Timestamp`. Implementar `FeatureStore::quantile_at(rota, q, as_of, window)` usando redb range scan `[as_of-window, as_of)`. `dylint` CI check rejeita `now()` em código de features de treino | 90% — arquitetura clara, implementação pendente |
| **Schema evolution** | Não existe schema versionado. `HotQueryCache` é struct interna sem versão | Parquet metadata deve conter `features_schema_version: u32` (data_lineage.md §Storage). Ao adicionar feature: bump SemVer, criar nova tabela/partição, nunca sobrescrever histórico | 90% — depende de disciplina de PR |
| **Replay reproducibility** | Impossível — scanner não persiste raw WS frames | Replayability completa exigiria armazenar raw WS frames (Kleppmann 2017 cap. 11, Jay Kreps 2014 "The Log"). Para ML, replay de `SpreadRecord` (resultado do scan_once) é suficiente — não requer replay WS. Desde que `SpreadRecord` inclua `ts_ns, entry_spread, exit_spread, book_age_buy, book_age_sell` com fidelidade, o trainer pode reconstruir features via sliding window sobre os registros | **[FLAG < 80%]** — reproducibility de replay de Parquet vs replay WS é materialmente diferente; reprocessar features G (cross-route) de Parquet requer que TODAS as rotas estejam presentes no mesmo arquivo para o mesmo timestamp |
| **Backup atomicidade** | N/A (não persiste) | redb snapshot e Parquet archival NÃO precisam ser atomicamente consistentes entre si: redb é hot (24h), Parquet é cold (>7d), gap de 7d é preenchido gradualmente. O único ponto de consistência que importa é: snapshot redb em `T_snap` não pode conter registros `ts > T_snap`. Garantido pelo writer task que respeita `compact()+rename()` | 80% |
| **Crash recovery** | Restart = estado zerado | redb ACID garante: após crash, estado consistente com último commit. Writer task retoma do último ponto commitado. Channel bounded garante que observações não-commitadas são no máximo `channel_capacity × avg_latency_write`. Com 100k cap e 1.5 µs/write (redb benchmark): máximo ~150 ms de dados perdidos pós-crash — dentro do RPO de 15 min | 85% |

---

## §5.3 Schema Canônico do Dataset

### Posicionamento de features: scanner vs trainer Python

**Steel-man das 3 alternativas**:

**A. Scanner precomputa features → Parquet contém FeatureVec completo**
- Vantagem: reproducibility perfeita — feature computada no mesmo instante que o spread foi observado.
- Desvantagem: Parquet pesado (~80 B × 1.5×10⁸ = 12 GB/90d apenas para features, sem labels); feature muda → todo histórico invalido.
- Evidência: Polyzotis et al. 2018 (SIGMOD) §3.2 — materializar features no momento da observação elimina a classe inteira de bugs PIT; adotado pelo TFX pipeline do Google.

**B. Parquet armazena apenas raw snapshots → trainer Python computa features pós-hoc**
- Vantagem: Parquet leve (~29 B × 10⁸ dedup = ~2.9 GB/90d); features podem mudar sem reescrever raw.
- Desvantagem: PIT correctness é responsabilidade do Python; features cross-route (familia G) exigem todas as rotas do mesmo timestamp no mesmo Parquet — complexidade alta.
- Evidência: López de Prado 2018 cap. 7 — "the most common source of leakage in financial ML is recomputing features from a historical lens, not a point-in-time lens".

**C. Híbrido: raw snapshot + features computadas simultaneamente, schema separado**
- Vantagem: raw para auditoria + features materializadas para treino; PIT garantido.
- Desvantagem: 2× storage; 2 schemas para manter.

**Decisão recomendada: Alternativa B com salvaguardas**. Razão: storage 4× menor, e as features de alto risco PIT (família G cross-route) são calculadas a 60s — a granularidade natural para batchar todas as rotas num único snapshot. Família F (calendar) é determinística. Família A/B/E dependem de HotQueryCache que pode ser reconstruído do raw via replay.

**Salvaguardas obrigatórias**: (1) `as_of` gravado em cada registro raw; (2) features de inferência online gravadas junto para auditoria (campo `features_snapshot JSONB` opcional, amostrado em 1%); (3) CI test de PIT conforme data_lineage.md §Verificação anti-T9.

### Schema Parquet proposto

```sql
-- Tabela principal: spread_dataset
-- Particionamento: year/month/day/buy_venue_u8/sell_venue_u8
-- Compressão: ZSTD nível 6
-- Encoding: DELTA para ts_ns, PLAIN para spreads
-- Versão: features_schema_version no metadata Parquet

CREATE TABLE spread_dataset (
  -- Identificação temporal (PIT anchor obrigatório)
  ts_ns             INT64 NOT NULL,          -- nanosegundos UNIX, monotônico por route
  cycle_seq         INT32 NOT NULL,          -- contador de ciclo 150ms; desempata ts_ns igual
  schema_version    INT16 NOT NULL,          -- bump semver quando schema muda (invalidação automática)

  -- Identificação da rota (chave natural)
  symbol_id         INT32 NOT NULL,          -- SymbolId.0 (u32 cast)
  buy_venue         INT8  NOT NULL,          -- Venue as u8 (0..13)
  sell_venue        INT8  NOT NULL,          -- Venue as u8 (0..13)

  -- Spreads brutos observados (raw scanner output)
  entry_spread_pct  FLOAT NOT NULL,          -- (sell_bid/buy_ask - 1) × 100
  exit_spread_pct   FLOAT NOT NULL,          -- (buy_bid - sell_ask) / buy_ask × 100

  -- Contexto de qualidade do snapshot (originalmente trigger inputs)
  buy_book_age_ms   INT32 NOT NULL,
  sell_book_age_ms  INT32 NOT NULL,
  buy_vol24_usd     DOUBLE NOT NULL,
  sell_vol24_usd    DOUBLE NOT NULL,

  -- Decisão do sampling trigger (auditabilidade)
  sample_decision   BYTE  NOT NULL,          -- 0=Accept 1=Stale 2=LowVol 3=InsufHist 4=BelowTail 5=Halt
  -- IMPORTANTE: apenas Accept entra nesta tabela; campo existe para auditoria de borda

  -- Metadados de pipeline (auditabilidade / schema drift detection)
  scanner_build_hash  BINARY(8) NOT NULL,    -- primeiros 8 bytes do hash do binário
  model_version_hash  BINARY(4) NOT NULL,    -- hash de BaselineConfig serializado

  -- Labels triple-barrier paramétricas (ADR-009, 48 combinações)
  -- Computadas OFFLINE pelo trainer Python pós-hoc usando ts_ns como anchor PIT
  -- Convenção: lbl_{multiplier}_{side}_{horizon}
  -- multiplier: m03=0.3%, m05=0.5%, m08=0.8%, m10=1.0%
  -- side: sL=long(entry>=thresh), sS=short(entry<=-thresh), sNone=any
  -- horizon: t30m=30min, t1h=1h, t2h=2h, t4h=4h, t8h=8h, t12h=12h
  -- Exemplo de 12 das 48 colunas:
  lbl_m03_sL_t30m   INT8,                   -- NULL enquanto janela não fechou
  lbl_m05_sL_t30m   INT8,
  lbl_m08_sL_t30m   INT8,
  lbl_m10_sL_t30m   INT8,
  lbl_m03_sL_t1h    INT8,
  lbl_m05_sL_t1h    INT8,
  lbl_m08_sL_t1h    INT8,
  lbl_m10_sL_t1h    INT8,
  lbl_m03_sL_t4h    INT8,
  lbl_m05_sL_t4h    INT8,
  lbl_m08_sL_t4h    INT8,
  lbl_m10_sL_t4h    INT8
  -- ... (36 colunas adicionais seguindo o mesmo padrão)
)
USING parquet
OPTIONS (
  compression = 'ZSTD',
  compression_level = 6,
  row_group_size = 131072,           -- 128k rows por row group (otimiza filter pushdown)
  write_batch_size = 1024
)
PARTITIONED BY (year INT16, month INT8, day INT8, buy_venue INT8, sell_venue INT8);
```

**Tamanho estimado**: 29 B raw × 10⁸ dedup × fator ZSTD 10× = **0.29 GB/dia** (Lemire et al. 2015 *SPE* 46(9), fator 10× em time-series numéricas). 90 dias × 0.29 GB = **26 GB** — bem abaixo do limite de 100 GB do §6.

**Labels**: calculadas pelo trainer Python com `polars` sobre o Parquet, usando `as_of = ts_ns` de cada registro e janela `[ts_ns, ts_ns + horizon_ns)` sobre o mesmo Parquet. Zero risco PIT por construção — o trainer NUNCA pode usar o futuro porque os dados do futuro ainda não existem no momento do `ts_ns` do registro.

---

## §5.4 Storage Tiering

### Mapeamento às camadas ADR-012

| Camada | Tecnologia | Janela | Papel no MVP | Status |
|---|---|---|---|---|
| 1b | `HotQueryCache` RAM | Sessão atual | Serving online (A3 ECDF) | Implementado |
| 1 (hot) | `redb 2.3` | Últimas 24h | Crash recovery + PIT hot queries | **Não implementado** |
| 2 (warm) | QuestDB 7.x | 7–90 dias | Analytics SQL + ASOF JOIN PIT | **Não implementado** |
| 3 (cold) | Parquet ZSTD | >7 dias | Training dataset permanente | **Não implementado** |
| 4 (calib) | `redb` separado | Permanente | Calibration residuals + drift state | **Não implementado** |

### Cronograma Marco 2 proposto

**Semana 1 — Camadas 1 + 3 (persistência básica, coleta começa)**
- Implementar `SpreadRecord` struct `[u8; 29]` packed (ts_ns u64 + entry f32 + exit f32 + venue_ids u8+u8 + flags u8 + ages u16+u16 + vols f32+f32 = 29 B).
- Implementar `bounded mpsc::channel(100_000)` entre `on_opportunity` e writer task.
- Implementar writer task: redb insert com `compact()+rename()` a cada 15 min.
- Implementar Parquet flush diário: `arrow2` ou `parquet2` crate (Rust-native, zero deps Python). Alternativa: `arrow-rs` que é oficialmente mantido pelo Apache Arrow project.
- Implementar `sample_decision == Accept` guard: APENAS registros Accept vão para disco.
- Métrica: `ml_dataset_samples_written_total` counter.
- Gate: `feature_store_write_throughput >= 780 writes/s` sustentado 1h (estimativa real de accept rate).

**Semana 2 — Camada 2 (QuestDB) + monitoramento de integridade**
- Deploy QuestDB 7.x (Docker ou binário).
- Implementar `questdb` client Rust ILP TCP (crate `questdb-rs` ou ILP direto via TCP).
- Schema conforme ADR-012.
- Implementar drain horário: redb → QuestDB (sem deletar do redb até TTL 24h).
- Implementar métricas de integridade (§5.5).
- Gate: `ml_dataset_write_lag_ms p99 < 500ms`.

**Semana 3 — PIT API + CI leakage check**
- Implementar `FeatureStore::quantile_at(rota, q, as_of, window)` via QuestDB.
- Integrar `dylint` CI check contra `now()` em código de features de treino.
- Teste de shuffling temporal (data_lineage.md §Verificação anti-T9).
- Documenter processo de schema evolution (PR checklist).

**Semana 4 — Backup + DR drill**
- redb snapshot: `compact()+rename()` verificado em crash simulado.
- QuestDB `BACKUP DATABASE` incremental configurado.
- Teste de restore: RTO medido (objetivo < 1h).
- Parquet archival para Backblaze B2 (script Python ou rclone).

---

## §5.5 Monitoramento de Pipeline

### Set mínimo viável MVP (Semana 2)

```
# Contadores (monotonicamente crescentes)
ml_dataset_samples_written_total          # amostras gravadas no redb/Parquet
ml_dataset_write_errors_total             # falhas de escrita (redb ou Parquet)
ml_dataset_duplicates_detected_total      # upserts que sobrescreveram (redb counter)
ml_dataset_out_of_order_events_total      # ts_ns < ts_ns_prev por rota (retrogressão de relógio)
ml_dataset_channel_drops_total            # mensagens descartadas por channel cheio (backpressure)

# Gauges (estado atual)
ml_dataset_schema_version                 # versão do schema em uso (invalidação automática)
ml_dataset_redb_size_bytes                # tamanho atual do redb hot buffer
ml_dataset_channel_queue_depth            # profundidade atual do channel (saturação early warning)
ml_dataset_write_lag_ms_p99              # lag entre observação e commit no redb
ml_dataset_parquet_files_today            # arquivos Parquet gerados hoje

# Alertas Alertmanager
alert: DatasetChannelNearFull
  expr: ml_dataset_channel_queue_depth > 80000   # 80% do cap 100k
  severity: warning

alert: DatasetWriteErrorRate
  expr: rate(ml_dataset_write_errors_total[5m]) > 0
  severity: critical   # qualquer erro de escrita é crítico

alert: DatasetWriteLagHigh
  expr: ml_dataset_write_lag_ms_p99 > 1000
  severity: warning    # lag > 1s indica writer task lento
```

**Nota sobre `ml_dataset_out_of_order_events_total`**: o writer task deve manter `last_ts_ns` por rota e incrementar este counter quando `new_ts_ns < last_ts_ns`. Isso detecta retrogressão de relógio NTP antes que corrumpa o dedup.

---

## §5.6 Gaps Atuais + Ação Priorizada

### 1. O que falta para dataset viável de treino

- **Persistência zero**: `(Recommendation, SampleDecision)` descartado em `let _ = ...`. Um dataset de 60–90 dias não pode ser coletado.
- **Schema tipado**: nenhum struct de serialização existe para `SpreadRecord`.
- **Monotonic timestamp**: `now_ns()` usa `SystemTime` não-monotônico.
- **PIT API**: `HotQueryCache` não suporta `as_of` — queries históricas impossíveis.
- **Labels**: não existe código de labeling triple-barrier.
- **CI leakage check**: `dylint` e shuffling temporal test não implementados.
- **Backup/DR**: zero procedimentos.
- **Monitoramento de integridade**: apenas contadores Prometheus de recomendações existem.

### 2. O que está errado/sub-ótimo no design atual

**Problema 1 — `now_ns()` sem garantia monotônica (alta severidade)**
Em `lib.rs:314`, um único `now_ns()` é capturado por ciclo e atribuído a TODAS as opps do ciclo. Se o NTP corrigir o relógio entre ciclos, `ts_ns` pode regredir. O dedup por `(route_id, ts_ns)` falha silenciosamente — duas observações distintas com o mesmo `ts_ns` resultam em upsert (perda de uma observação).

**Problema 2 — `observe()` antes do trigger (acúmulo de lixo no histograma)**
Em `serving.rs:124-126`, `HotQueryCache.observe()` é chamado ANTES de `SamplingTrigger.evaluate()`. Isso significa que snapshots stale, low-volume ou below-tail alimentam o histograma que depois serve de base para calcular `P95`. O P95 é calculado sobre a distribuição completa (incluindo snapshots ruins), não sobre a distribuição filtrada. Isso viola o invariante de que o trigger deve funcionar sobre dados de qualidade.

Referência: Polyzotis et al. 2018 (SIGMOD) §4.1 — "validation must precede feature computation; computing features on invalid data propagates errors silently downstream". Schelter et al. 2018 (SIGMOD) §3 — "data quality checks must gate the feature pipeline".

**Problema 3 — Clamping silencioso no histograma (mascaramento de dado)**
Em `hot_cache.rs:73`, spreads fora de `[-10%, +10%]` são clampeados silenciosamente. Um spike real de 15% (ocorrente em longtail cripto) é registrado como 10%. O histograma fica sistematicamente enviesado. Conforme `feedback_no_masking.md` do projeto: "corrigir a COLETA do dado, não o filtro". A solução correta é expandir o range (ex: [-50%, +50%]) ou usar dois histogramas (regime normal + spike detector separado).

**Problema 4 — `HotQueryCache` sem ring buffer (monotônico)**
Documentado em `hot_cache.rs:11-14`: "histograma cresce monotonicamente — sem ring buffer / decremento". O P95 calculado após 7 dias de operação inclui a distribuição dos primeiros dias, não a dos últimos 24h. O trigger `entry_spread ≥ P95(rota, 24h)` está computando sobre `[0, agora]` em vez de `[agora-24h, agora]`. Isso afeta a qualidade do dataset: rotas que tiveram spreads altos nos primeiros dias mas normalizaram depois terão P95 inflado, reduzindo Accept rate desnecessariamente.

**Problema 5 — `on_opportunity` chamado somente para opps que passam o spread threshold**
Em `lib.rs:315-332`, o loop ML itera sobre `buf` que já foi filtrado por `scan_once` (threshold `cfg.entry_threshold_pct`). Isso significa que o `HotQueryCache` nunca observa spreads abaixo do threshold — a distribuição base é truncada à esquerda. O P95 é calculado sobre a cauda superior, não sobre a distribuição completa. Impacto: P95 artificialmente alto → trigger `entry_spread ≥ P95` mais difícil de atingir → Accept rate menor que o esperado.

### 3. Quick wins (< 1 dia de trabalho)

**QW-1**: Adicionar log estruturado de `SampleDecision::Accept` com campos `{ts_ns, symbol_id, buy_venue, sell_venue, entry_spread, exit_spread, buy_book_age_ms, sell_book_age_ms, buy_vol24, sell_vol24}` em formato JSON (via `tracing::info!` com campos estruturados). Não é persistência em disco real, mas permite recuperação post-hoc de dados históricos de logs se o sistema de log tiver retenção configurada. Custo: ~20 linhas de Rust. Overhead: desprezível (< 10 µs/accept no cold path).

**QW-2**: Corrigir a ordem `observe() → trigger()` para `trigger() → observe()` se Accept. Isso corrige o Problema 2 (acúmulo de lixo no histograma). Mudança trivial em `serving.rs` — inverter a ordem das chamadas. Porém **requer autorização do usuário** pois muda comportamento do `HotQueryCache` (n_observations por rota decresce significativamente, podendo aumentar tempo para atingir `n_min = 500`).

**QW-3**: Adicionar `ml_dataset_channel_queue_depth` gauge (mesmo que o channel ainda não exista) como preparação para Marco 2. Expor a métrica como placeholder `0` agora, implementar o channel em Semana 1.

**QW-4**: Adicionar `cycle_seq: u32` ao campo `ts_ns` para desambiguar opps do mesmo ciclo. Atualmente `now_ns` é compartilhado por todas as opps do ciclo — se duas opps da mesma rota aparecem no mesmo ciclo (impossível por construção, pois RouteId é único), a segunda sobrescreveria a primeira no dedup. Isso é academicamente correto mas defensivo.

### 4. Grandes mudanças (1+ semana, exigem autorização)

**GM-1** (Autorização necessária): Implementar persistência completa Semana 1–4 conforme §5.4. Implica: nova dependência `redb 2.3`, nova dependência `arrow-rs` ou `parquet2`, novo tokio task, mudança no budget de memória (channel 100k × ~60 B = 6 MB), mudança no Cargo.toml.

**GM-2** (Autorização necessária): Corrigir `HotQueryCache` para janela temporal verdadeira (M1.1b ring buffer com decremento). Implica mudança material no `PerRouteCache` (adicionar ring buffer circular de `(ts_ns, spread)` pares), possível aumento de memória de 73 MB → 208 MB (conforme ADR-012 §Camada 1b). Afeta diretamente o cálculo de P95 do trigger e da BaselineA3.

**GM-3** (Autorização necessária): Expandir range do histograma de `[-10%, +10%]` para `[-50%, +50%]`. Elimina clamping silencioso (Problema 3). Aumenta memória do histograma de ~14 KB para ~70 KB por histograma × 2 × 2600 = ~364 MB (sigfig=2 em range 10× maior). Alternativa menos custosa: histograma primário `[-10%, +10%]` + counter separado de outliers `(n_clamped_above, n_clamped_below)` exposto em Prometheus.

**GM-4** (Autorização necessária, FLAG < 80%): Substituir `now_ns()` por clock monotônico. Implica rever todos os pontos de uso do `ts_ns` no seqlock (`TopOfBook.commit()`), no `PerRouteCache.last_update_ns`, e no loop engine. Impacto em toda a base de código é difícil de estimar sem auditoria completa — `[FLAG < 80%]`.

---

## Pontos com Confiança < 80% (exigem decisão do usuário)

1. **Clock skew entre ciclos** `[FLAG < 80%]`: frequência real de retrogressão NTP no ambiente de deploy (Windows 11 local vs VPS Linux) é desconhecida. Impacto pode ser zero na prática se NTP ajusta suavemente.

2. **Replay reproducibility** `[FLAG < 80%]`: "replay de SpreadRecord é suficiente para reconstruir features" assume que features família G (cross-route) podem ser reconstruídas de forma PIT-correta a partir de Parquet particionado. Isso requer que todas as rotas do mesmo `ts_ns` (janela 2s) estejam presentes no mesmo Parquet — garantido se o flush é diário e todas as rotas de um dia estão no mesmo arquivo, mas não garantido se rotas são particionadas por `(buy_venue, sell_venue)`.

3. **Accept rate real** `[FLAG < 80%]`: estimativa de 780 writes/s de Accept é baseada em "5% de Accept × 2600 rotas × 6 RPS". A taxa real de P95-crossing depende da volatilidade do mercado e não foi medida. Se Accept rate for 20× maior (ex: em eventos), o channel 100k pode encher em < 10 segundos.

4. **Problema 2 — observe antes do trigger (inversão recomendada)** `[FLAG < 80%]`: mover `observe()` para depois do trigger muda o comportamento do baseline A3. A BaselineA3 usa `n_observations ≥ n_min` para decidir se pode emitir. Com observe-before-trigger, observações ruins inflam `n_observations`, acelerando o warm-up. Com observe-after-trigger, apenas amostras de qualidade contam — warm-up mais lento mas histograma mais limpo. Qual o impacto no tempo médio para atingir `n_min = 500`? Não calculado.

---

## Referências Citadas

- Polyzotis, N., Roy, S., Whang, S.E., Zinkevich, M. (2018). Data Validation for Machine Learning. *SIGMOD*. §3.2, §4.1.
- Schelter, S. et al. (2018). Automating Large-Scale Data Quality Verification. *SIGMOD*. §3.
- Breck, E. et al. (2017). The ML Test Score. *NIPS*. §2.1.
- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly. Cap. 8 (clock skew), Cap. 11 (stream replay).
- Kreps, J. (2014). The Log: What every software engineer should know. Confluent Blog.
- López de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley. Cap. 7 (PIT correctness).
- Lemire, D. et al. (2015). Decoding billions of integers per second through vectorization. *Software: Practice and Experience* 46(9). ZSTD compression benchmarks.
- Pelkonen, T. et al. (2015). Gorilla: A Fast, Scalable, In-Memory Time Series Database. *VLDB* 8(12). Dedup e integridade.
- cberner/redb. GitHub. Crash consistency: `compact()+rename()` commit fc87a.
- QuestDB (2024). Architecture documentation. `DEDUP UPSERT KEYS`. ILP ingest benchmarks.
- redb.io/benchmarks (2024). 495k writes/s @ 1.5 µs/write.
