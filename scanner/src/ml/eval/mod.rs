//! Módulo de avaliação ML — `ml_eval` submodule.
//!
//! Três responsabilidades:
//!
//! - [`invariants`] — verificadores reutilizáveis de propriedades estruturais
//!   do `TradeSetup` (monotonicidade de quantis, identidade de lucro bruto,
//!   P ∈ [0,1], IC contém P, etc.). Usados em CI e em runtime antes de
//!   broadcast.
//! - [`leakage`] — 5 testes CI bloqueantes contra label leakage (ADR-006).
//!   Infraestrutura mínima em Marco 0; implementação completa em Marco 1
//!   quando dataset e pipeline de treino existirem.
//! - [`lovo`] — Leave-One-Venue-Out evaluation (ADR-023). Scaffolding em
//!   Marco 0 (LOVO sobre baseline A3 já é executável); versão Marco 1 usa
//!   modelo treinado real.
//!
//! # Uso em runtime
//!
//! Antes de broadcast de uma `Recommendation::Trade(setup)`:
//!
//! ```ignore
//! use crate::ml::eval::invariants::verify_tradesetup;
//! match verify_tradesetup(&setup) {
//!     Ok(()) => publish(setup),
//!     Err(e) => {
//!         metrics::invariant_violations_total.inc();
//!         // Rejeita emissão (abstenção silenciosa tipo LowConfidence).
//!     }
//! }
//! ```

pub mod invariants;
pub mod leakage;
pub mod lovo;

pub use invariants::{verify_tradesetup, InvariantError};
pub use lovo::{LovoReport, VenueFoldMetrics};
