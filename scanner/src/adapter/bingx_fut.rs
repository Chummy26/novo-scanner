//! BingX Futures/Swap WebSocket adapter — mirrors Bingx Spot (GZIP + per-symbol).
//!
//! Endpoint: wss://open-api-swap.bingx.com/swap-market
//! Ping:     Server Ping every 30s (futures — vs 5s for spot, PhD#5 D-09).
//!           Old endpoint open-ws-swap.bingbon.pro decommissioned 2025-09-18.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use sonic_rs::JsonValueTrait;
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::decode::GzipDecoder;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

const BINGX_FUT_SUBS_PER_CONN: usize = 200; // same as spot, conservative

pub struct BingxFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale: Arc<crate::spread::engine::StaleTable>,
    pub url: String,
}

impl BingxFutAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale: Arc<crate::spread::engine::StaleTable>,
    ) -> Self {
        Self {
            universe,
            stale,
            url: "wss://open-api-swap.bingx.com/swap-market".into(),
        }
    }
}

#[async_trait]
impl Adapter for BingxFutAdapter {
    fn venue(&self) -> Venue {
        Venue::BingxFut
    }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let all: Vec<String> = self.universe.per_venue[Venue::BingxFut.idx()]
            .keys()
            .cloned()
            .collect();
        if all.is_empty() {
            warn!("bingx-fut: no symbols in universe; adapter idle");
            futures::future::pending::<()>().await;
            return Ok(());
        }
        info!(
            "bingx-fut: sharding {} symbols into {} conns",
            all.len(),
            (all.len() + BINGX_FUT_SUBS_PER_CONN - 1) / BINGX_FUT_SUBS_PER_CONN
        );

        let mut handles = Vec::new();
        for (i, chunk) in all.chunks(BINGX_FUT_SUBS_PER_CONN).enumerate() {
            let shard: Vec<String> = chunk.to_vec();
            let url = self.url.clone();
            let universe = Arc::clone(&self.universe);
            let stale = Arc::clone(&self.stale);
            let store_ptr = store as *const BookStore as usize;
            let h = tokio::spawn(async move {
                let store = unsafe { &*(store_ptr as *const BookStore) };
                let backoff = BackoffPolicy::STANDARD;
                let mut attempt: u32 = 0;
                loop {
                    match run_shard(&url, &shard, &universe, &stale, store).await {
                        Ok(()) => attempt = 0,
                        Err(e) => {
                            warn!(shard = i, attempt, "bingx-fut shard failed: {}", e);
                            tokio::time::sleep(backoff.delay(attempt)).await;
                            attempt = attempt.saturating_add(1);
                        }
                    }
                }
            });
            handles.push(h);
        }
        for h in handles {
            let _ = h.await;
        }
        Ok(())
    }
}

async fn run_shard(
    url: &str,
    symbols: &[String],
    universe: &SymbolUniverse,
    stale: &crate::spread::engine::StaleTable,
    store: &BookStore,
) -> Result<()> {
    use http::Uri;
    use tokio_websockets::{ClientBuilder, Message};

    let uri: Uri = url
        .parse()
        .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
    info!(
        venue = "bingx-fut",
        syms = symbols.len(),
        "connecting shard"
    );

    let (mut client, _) = ClientBuilder::from_uri(uri)
        .connect()
        .await
        .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

    for sym in symbols {
        let sub = format!(
            r#"{{"id":"{}","reqType":"sub","dataType":"{}@bookTicker"}}"#,
            now_ns(),
            sym
        );
        client
            .send(Message::text(sub))
            .await
            .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
        tokio::time::sleep(Duration::from_millis(25)).await;
    }

    let mut decoder = GzipDecoder::new(8 * 1024);
    let mut last_frame_at = std::time::Instant::now();

    loop {
        tokio::select! {
            msg = client.next() => {
                let Some(msg) = msg else {
                    return Err(Error::WebSocket("stream closed".into()));
                };
                let msg = msg.map_err(|e| Error::WebSocket(format!("recv: {}", e)))?;
                // ANY frame proves TCP alive — update before filters to avoid
                // false-positive reconnect during market-quiet windows.
                last_frame_at = std::time::Instant::now();

                if msg.is_close() { return Ok(()); }

                let payload = msg.as_payload();
                if payload.is_empty() { continue; }

                let decoded = if payload.len() >= 2 && &payload[..2] == b"\x1f\x8b" {
                    decoder.decode(payload, 64 * 1024)?
                } else if msg.is_text() {
                    payload
                } else {
                    continue;
                };
                let Ok(text) = std::str::from_utf8(decoded) else { continue };
                if text == "Ping" {
                    client.send(Message::text("Pong".to_string())).await
                        .map_err(|e| Error::WebSocket(format!("pong: {}", e)))?;
                    continue;
                }

                let t0 = std::time::Instant::now();
                let _ = parse_and_apply(text, |sym, bid, ask| {
                    if let Some(id) = universe.lookup(Venue::BingxFut, sym) {
                        let ts = now_ns();
                        store.slot(Venue::BingxFut, id).commit(
                            bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                        );
                        stale.cell(Venue::BingxFut, id).update(ts);
                        Metrics::init().record_ingest(Venue::BingxFut, t0.elapsed().as_nanos() as u64);
                    } else {
                        debug!(symbol = sym, "bingx-fut: not in universe");
                    }
                });
            }
            _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(90)).into()) => {
                return Err(Error::WebSocket("silent disconnect bingx-fut".into()));
            }
        }
    }
}

fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price),
{
    let Ok(sym_lv) = sonic_rs::get(json, &["data", "s"]) else {
        return Ok(());
    };
    let Some(sym) = sym_lv.as_str() else {
        return Ok(());
    };

    let b = sonic_rs::get(json, &["data", "b"])
        .map_err(|e| Error::Decode(format!("data.b: {}", e)))?
        .as_str()
        .ok_or_else(|| Error::Decode("data.b not str".into()))?
        .parse::<f64>()
        .map_err(|_| Error::Decode("data.b f64".into()))?;
    let a = sonic_rs::get(json, &["data", "a"])
        .map_err(|e| Error::Decode(format!("data.a: {}", e)))?
        .as_str()
        .ok_or_else(|| Error::Decode("data.a not str".into()))?
        .parse::<f64>()
        .map_err(|_| Error::Decode("data.a f64".into()))?;
    f(sym, Price::from_f64(b), Price::from_f64(a));
    Ok(())
}
