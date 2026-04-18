//! Exchange adapters. Each venue has its own module implementing the
//! `Adapter` trait — connect, subscribe, decode frames, apply updates to the
//! BookStore, handle reconnection.

pub mod binance_fut;
pub mod binance_spot;
pub mod bingx_fut;
pub mod bingx_spot;
pub mod bitget;
pub mod bitget_fut;
pub mod gate_fut;
pub mod gate_spot;
pub mod kucoin;
pub mod kucoin_fut;
pub mod mexc_fut;
pub mod mexc_spot;
pub mod mexc_spot_rest;
pub mod reconnect;
pub mod vol_poller;
pub mod xt_fut;
pub mod xt_spot;

use async_trait::async_trait;

use crate::book::BookStore;
use crate::error::Result;
use crate::types::Venue;

#[async_trait]
pub trait Adapter: Send + Sync {
    fn venue(&self) -> Venue;

    /// Run the adapter until shutdown or an unrecoverable error.
    /// Reconnect logic lives inside the adapter using the policies in
    /// `reconnect::BackoffPolicy`.
    async fn run(&self, store: &BookStore) -> Result<()>;
}
