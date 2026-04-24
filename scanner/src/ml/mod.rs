//! Módulo ML — recomendador calibrado de TradeSetup.
//!
//! Vive *dentro* do crate `scanner` (não workspace separado) para Marco 1
//! MVP — evita refatoração estrutural pesada enquanto o stack é minimal.
//! Se Marco 2+ introduzir dependências pesadas (tract ONNX runtime,
//! polars, etc.) que impactem build-time do scanner, migrar para crate
//! separado é opção aberta.
//!
//! # Sub-módulos
//!
//! - [`contract`] — tipos públicos do output (ADR-005 + ADR-016):
//!   `Recommendation`, `TradeSetup`, `AbstainReason`, `TacticalSignal`.
//!
//! Próximos sub-módulos (ver `docs/ml/11_final_stack/ROADMAP.md` Marco 1):
//!
//! - `feature_store/` — redb hot buffer + HotQueryCache + QuestDB + PIT API
//!   (ADR-012).
//! - `baseline/` — A3 ECDF + bootstrap emitindo `TradeSetup` (ADR-001).
//! - `trigger.rs` — gatilho de amostragem `min_vol24 ≥ $50k +
//!   entrySpread ≥ P95(24h)` (ADR-009 + ADR-014).
//! - `serving.rs` — A2 thread dedicada com `crossbeam::bounded(1)` +
//!   `ArcSwap<[TradeSetup; N]>` + circuit breaker (ADR-010).
//! - `eval/` — 5 testes CI de leakage audit (ADR-006).
//!
//! # Contrato vigente
//!
//! Output como thresholds + distribuição empírica de lucro
//! (ADR-016). `P(realize)` computado direto da CDF do modelo G unificado
//! (ADR-008), **não** via decomposição multiplicativa — essa correção é o
//! aprendizado central da investigação PhD Q1/Q2/Q3.

pub mod baseline;
pub mod broadcast;
pub mod contract;
pub mod dto;
pub mod economic;
pub mod eval;
pub mod feature_store;
pub mod listing_history;
pub mod metrics;
pub mod persistence;
pub mod retention;
pub mod serving;
pub mod trigger;
pub mod util;

/// Versão única do scanner para todos os schemas de dataset (fix E5).
///
/// Antes existia uma `const SCANNER_VERSION` replicada em `raw_sample.rs`,
/// `sample.rs` e `labeled_trade.rs`. Se um fosse alterado por engano (override
/// local de teste, macro mal usada), records divergiam sem catch-all. A
/// consolidação elimina essa classe inteira de bug.
pub const SCANNER_VERSION: &str = env!("CARGO_PKG_VERSION");

pub use contract::{
    AbstainDiagnostic, AbstainReason, CalibStatus, ReasonDetail, ReasonKind, Recommendation,
    RouteId, SourceKind, TradeReason, TradeSetup,
};

pub use broadcast::{BroadcasterMetrics, RecommendationBroadcaster, RecommendationFrame};
pub use dto::{RecommendationDto, TradeSetupDto};
pub use economic::{
    EconomicAccumulator, EconomicEvent, EconomicMetrics, TradeOutcome, WindowMetrics,
};
pub use eval::{
    verify_tradesetup, verify_tradesetup_with_floor, InvariantError, DEFAULT_P_HIT_EMISSION_FLOOR,
};
pub use retention::{
    DatasetRetentionPolicy, ManagedDataset, ModelWindowPolicy, RetentionSweepReport,
};
