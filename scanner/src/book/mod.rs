//! Orderbook data structures.
//!
//! - `seqlock::TopOfBook`: 64B cache-aligned atomic fastpath for best bid/ask.
//! - `depth::DepthBook`:   sorted Vec<Level> full-depth store (cold path).
//! - `store::BookStore`:   flat array indexed by (venue, symbol) for O(1) access.

pub mod depth;
pub mod seqlock;
pub mod store;

pub use depth::{DepthBook, Level};
pub use seqlock::{TopOfBook, TopOfBookSnapshot};
pub use store::BookStore;
