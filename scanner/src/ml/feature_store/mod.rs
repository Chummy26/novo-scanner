//! Feature store — persistência e queries de histórico de spreads por rota.
//!
//! Implementa ADR-012 (arquitetura híbrida em 4 camadas). Para Marco 1
//! MVP, apenas a **Camada 1b (HotQueryCache em RAM)** é implementada —
//! suficiente para alimentar baseline A3 ECDF em inferência online.
//!
//! # Fases de implementação
//!
//! - **M1.1a (agora)**: [`hot_cache::HotQueryCache`] — percentis online via
//!   `hdrhistogram`. Queries de `now()` only.
//! - **M1.1b (pós-MVP)**: redb 2.3 hot buffer (24h com rolling window real)
//!   + QuestDB ingest para analítica + PIT API histórica (`quantile_at(rota,
//!   q, as_of, window)`) + `dylint` CI check rejeitando `now()` em código
//!   de treino.
//! - **M1.1c (Marco 2)**: Parquet archival (>7 dias) + datafusion queries.
//!
//! # Princípios invariantes
//!
//! 1. **PIT correctness** — toda leitura histórica (quando M1.1b chegar)
//!    receberá `as_of: Timestamp` obrigatório. API não permite `now()` em
//!    módulos de features de treino.
//! 2. **Thread-safe** — múltiplas threads (ingest scanner cold path,
//!    inferência baseline A3, cold path features) compartilham cache via
//!    `Arc`.
//! 3. **Zero-alloc hot path** — queries de percentil são O(log range) em
//!    `hdrhistogram` e não alocam (verificado via inspeção da lib).

pub mod hot_cache;

pub use hot_cache::{CacheConfig, HotQueryCache};
