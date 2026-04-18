//! Broadcast server: WebSocket on /ws/scanner + REST on /api/spread/*.
//!
//! Contract is fixed by the existing frontend (field names observed in the
//! frontend's bundled JS: symbol, buyFrom, sellTo, buyType, sellType,
//! buyPrice, sellPrice, entrySpread, exitSpread, buyVol24, sellVol24,
//! buyBookAge, sellBookAge).

pub mod contract;
pub mod history;
pub mod server;

pub use contract::{OpportunityDto, VolStore};
pub use history::HistoryStore;
pub use server::serve;
