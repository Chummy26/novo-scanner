//! Spread engine and staleness / feed-asymmetry detection.
//!
//! - `staleness::StaleState`: per-(venue, symbol) Welford + CUSUM, 40B each.
//! - `engine`: 150ms loop that scans the cross-venue universe and emits
//!   `Opportunity` events when a valid, non-stale, non-asymmetric spread
//!   exceeds the threshold.

pub mod engine;
pub mod staleness;

pub use engine::{Opportunity, ScanCounters};
pub use staleness::StaleState;
