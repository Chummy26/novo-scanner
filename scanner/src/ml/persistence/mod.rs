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
//! # Escolha de formato: JSONL em vez de Parquet no MVP
//!
//! O `DATASET_ACTION_PLAN.md` Fase 1 recomendou Parquet. No MVP,
//! escolhemos **JSONL (one JSON object per line)** com rotação horária.
//! Racional:
//!
//! 1. **Zero dependências novas** — scanner já tem `serde_json`. Parquet
//!    adiciona `arrow` + `parquet` crates (~20 MB binary, 100+ deps
//!    transitivos).
//! 2. **Trainer Python consome trivialmente** — `pandas.read_json(path,
//!    lines=True)` em 1 linha; ou `pyarrow.json.read_json` quando scale
//!    justificar.
//! 3. **Migração para Parquet é 1-líner depois** — mesmo schema, mesmo
//!    writer task; só troca formato de output em Marco 2 quando pipeline
//!    Python exigir.
//! 4. **Storage aceitável**: ~200 B/sample uncompressed, 6.7×10⁶
//!    samples/90d = ~1.3 GB. Gzip comprime ~5–10×. Tolerável.
//!
//! Em Marco 2, ao trocar para Parquet, o *mesmo* schema de `AcceptedSample`
//! é mapeado para Arrow RecordBatch. Zero mudança no produtor (MlServer).

pub mod label_resolver;
pub mod labeled_trade;
pub mod labeled_writer;
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
