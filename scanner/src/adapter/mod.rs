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

use std::future::Future;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use tracing::warn;

use crate::adapter::reconnect::BackoffPolicy;
use crate::book::BookStore;
use crate::error::Result;
use crate::types::Venue;

pub type AdapterShutdown = tokio::sync::watch::Receiver<bool>;

#[async_trait]
pub trait Adapter: Send + Sync {
    fn venue(&self) -> Venue;

    /// Run the adapter until shutdown or an unrecoverable error.
    /// Reconnect logic lives inside the adapter using the policies in
    /// `reconnect::BackoffPolicy`.
    async fn run(&self, store: Arc<BookStore>, shutdown: AdapterShutdown) -> Result<()>;
}

pub fn is_shutdown_requested(shutdown: &AdapterShutdown) -> bool {
    *shutdown.borrow()
}

pub async fn wait_for_shutdown(shutdown: &mut AdapterShutdown) -> bool {
    if is_shutdown_requested(shutdown) {
        return true;
    }
    shutdown.changed().await.is_err() || is_shutdown_requested(shutdown)
}

pub async fn sleep_or_shutdown(duration: Duration, shutdown: &mut AdapterShutdown) -> bool {
    tokio::select! {
        _ = tokio::time::sleep(duration) => false,
        requested = wait_for_shutdown(shutdown) => requested,
    }
}

pub async fn run_reconnecting<F, Fut>(
    venue: &'static str,
    backoff: BackoffPolicy,
    mut shutdown: AdapterShutdown,
    mut run_once: F,
) -> Result<()>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<()>>,
{
    let mut attempt: u32 = 0;
    loop {
        if is_shutdown_requested(&shutdown) {
            return Ok(());
        }

        tokio::select! {
            biased;
            requested = wait_for_shutdown(&mut shutdown) => {
                if requested {
                    return Ok(());
                }
            }
            result = run_once() => {
                match result {
                    Ok(()) => {
                        attempt = 0;
                    }
                    Err(e) => {
                        warn!(venue, attempt, "adapter run_once failed: {}", e);
                        if sleep_or_shutdown(backoff.delay(attempt), &mut shutdown).await {
                            return Ok(());
                        }
                        attempt = attempt.saturating_add(1);
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[tokio::test]
    async fn sleep_or_shutdown_wakes_on_signal() {
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);
        let task = tokio::spawn(async move {
            sleep_or_shutdown(Duration::from_secs(60), &mut shutdown_rx).await
        });

        shutdown_tx.send(true).expect("send shutdown");

        let requested = tokio::time::timeout(Duration::from_secs(1), task)
            .await
            .expect("shutdown should wake sleep")
            .expect("task should not panic");
        assert!(requested);
    }

    #[tokio::test]
    async fn run_reconnecting_drops_active_run_once_on_shutdown() {
        let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);
        let calls = Arc::new(AtomicUsize::new(0));
        let calls_for_task = Arc::clone(&calls);

        let task = tokio::spawn(async move {
            run_reconnecting(
                "test-adapter",
                BackoffPolicy::IMMEDIATE,
                shutdown_rx,
                || {
                    let calls = Arc::clone(&calls_for_task);
                    async move {
                        calls.fetch_add(1, Ordering::Relaxed);
                        futures::future::pending::<Result<()>>().await
                    }
                },
            )
            .await
        });

        tokio::time::sleep(Duration::from_millis(10)).await;
        shutdown_tx.send(true).expect("send shutdown");

        tokio::time::timeout(Duration::from_secs(1), task)
            .await
            .expect("shutdown should stop reconnect loop")
            .expect("task should not panic")
            .expect("adapter should exit cleanly");
        assert_eq!(calls.load(Ordering::Relaxed), 1);
    }
}
