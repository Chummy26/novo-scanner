//! Persistência do dataset de treino.
//!
//! # Sub-módulos
//!
//! - [`sample`] — `AcceptedSample` struct (C4 fix) + serialização para
//!   JSONL. Dataset **pós-trigger**, para treino supervisionado.
//! - [`writer`] — `JsonlWriter` com rotação horária (C1 fix MVP) — consome
//!   `AcceptedSample`.
//! - [`raw_sample`] — `RawSample` + `RouteDecimator` (ADR-025). Dataset
//!   **pré-trigger**, decimação 1-in-10 por rota, para medição
//!   não-enviesada de gates empíricos (E1/E2/E4/E6/E8/E10/E11).
//! - [`raw_writer`] — `RawSampleWriter` paralelo ao `JsonlWriter`, mesma
//!   semântica de rotação/flush, grava em `data/ml/raw_samples/`.
//!
//! # Escolha de formato: JSONL no hot path, Parquet/ZSTD após fechamento
//!
//! O scanner continua escrevendo **JSONL append-only** no hot path e
//! compacta a partição horária fechada para **Parquet/ZSTD**. Racional:
//!
//! 1. **Persistência simples e robusta** durante o ciclo atual — só
//!    append/flush no arquivo aberto.
//! 2. **Compressão colunar real** após fechamento — melhor custo de disco
//!    e melhor leitura offline para treino/auditoria.
//! 3. **Mesmo schema lógico** entre produtor e consumidor — o compactor lê
//!    o JSONL já emitido e grava Parquet sem reabrir a semântica do dataset.
//!
//! O produtor (`MlServer`) continua agnóstico ao formato final. A camada de
//! persistência é que decide se a partição fechada fica em `.jsonl`,
//! `.parquet`, ou ambos.

pub mod label_resolver;
pub mod labeled_trade;
pub mod labeled_writer;
pub mod parquet_compactor;
pub mod raw_sample;
pub mod raw_writer;
pub mod route_ranking;
pub mod sample;
pub mod sample_id;
pub mod writer;

pub use label_resolver::{
    LabelResolver, PendingHorizon, PendingLabel, ResolverConfig, ResolverMetrics,
    DEFAULT_HORIZONS_S,
};
pub use parquet_compactor::{
    compact_existing_jsonl_in_tree, compact_jsonl_file, DatasetKind, ParquetCompactionConfig,
};
pub use labeled_trade::{
    CensorReason, FeaturesT0, LabelOutcome, LabeledTrade, PolicyMetadata,
    LABELED_TRADE_SCHEMA_VERSION,
};
pub use labeled_writer::{
    LabeledJsonlWriter, LabeledWriterConfig, LabeledWriterHandle, LabeledWriterSendError,
};
pub use route_ranking::{RouteRanking, RouteScore};
pub use sample_id::sample_id_of;

pub use raw_sample::{
    DecisionResult, RawSample, RouteDecimator, SamplingTier,
    RAW_SAMPLE_SCHEMA_VERSION, ROUTE_DECIMATION_MOD,
};
pub use raw_writer::{
    RawSampleWriter, RawWriterConfig, RawWriterHandle, RawWriterSendError,
};
pub use sample::{AcceptedSample, ACCEPTED_SAMPLE_SCHEMA_VERSION};
pub use writer::{JsonlWriter, WriterConfig, WriterHandle, WriterSendError};
