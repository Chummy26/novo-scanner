//! BingX Spot WebSocket adapter — GZIP-compressed frames, 200 subs/conn.
//!
//! Endpoint: wss://open-api-ws.bingx.com/market
//! Encoding: GZIP (every frame). Disable not possible.
//! Ping:     server sends Ping every 5s → client must Pong (PhD#5 D-09).
//! Channel:  per-symbol bookTicker@{SYMBOL}.
//!
//! With 200 symbols/conn cap (per 2024-08-20 change), 1000 symbols → 5+ conns.
//! We shard the universe into ceil(N/200) connections, each an independent task.

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

const BINGX_SUBS_PER_CONN: usize = 200;

pub struct BingxSpotAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub url:      String,
}

impl BingxSpotAdapter {
    pub fn new(universe: Arc<SymbolUniverse>, stale: Arc<crate::spread::engine::StaleTable>) -> Self {
        Self {
            universe,
            stale,
            url: "wss://open-api-ws.bingx.com/market".into(),
        }
    }
}

#[async_trait]
impl Adapter for BingxSpotAdapter {
    fn venue(&self) -> Venue { Venue::BingxSpot }

    async fn run(&self, store: &BookStore) -> Result<()> {
        // Partition venue symbols into shards of up to 200.
        let all: Vec<String> = self.universe.per_venue[Venue::BingxSpot.idx()]
            .keys().cloned().collect();
        if all.is_empty() {
            warn!("bingx-spot: no symbols in universe; adapter idle");
            // Sleep forever — no symbols means no subscriptions. Return Ok so
            // the task parks instead of spamming reconnect.
            futures::future::pending::<()>().await;
            return Ok(());
        }
        info!("bingx-spot: sharding {} symbols into {} conns",
              all.len(), (all.len() + BINGX_SUBS_PER_CONN - 1) / BINGX_SUBS_PER_CONN);

        // Spawn one task per shard. Each shard retries with backoff internally.
        let mut handles = Vec::new();
        for (i, chunk) in all.chunks(BINGX_SUBS_PER_CONN).enumerate() {
            let shard: Vec<String> = chunk.to_vec();
            let url = self.url.clone();
            let universe = Arc::clone(&self.universe);
            let stale = Arc::clone(&self.stale);
            // Safety: the store outlives every adapter (owned by the runtime).
            // We coerce the `&BookStore` into a raw pointer that the spawned task
            // dereferences — this avoids forcing `'static` on the callsite.
            // Caller contract: run() blocks until Ctrl-C, so `store` never drops.
            let store_ptr = store as *const BookStore as usize;
            let h = tokio::spawn(async move {
                let store = unsafe { &*(store_ptr as *const BookStore) };
                let backoff = BackoffPolicy::STANDARD;
                let mut attempt: u32 = 0;
                loop {
                    let r = run_shard(&url, &shard, &universe, &stale, store).await;
                    match r {
                        Ok(()) => attempt = 0,
                        Err(e) => {
                            warn!(shard = i, attempt, "bingx-spot shard failed: {}", e);
                            tokio::time::sleep(backoff.delay(attempt)).await;
                            attempt = attempt.saturating_add(1);
                        }
                    }
                }
            });
            handles.push(h);
        }
        // Await any — this adapter runs for the process lifetime.
        for h in handles { let _ = h.await; }
        Ok(())
    }
}

async fn run_shard(
    url:      &str,
    symbols:  &[String],
    universe: &SymbolUniverse,
    stale:    &crate::spread::engine::StaleTable,
    store:    &BookStore,
) -> Result<()> {
    use http::Uri;
    use tokio_websockets::{ClientBuilder, Message};

    let uri: Uri = url.parse()
        .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
    info!(venue = "bingx-spot", syms = symbols.len(), "connecting shard");

    let (mut client, _) = ClientBuilder::from_uri(uri)
        .connect().await
        .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

    // Subscribe to each symbol's bookTicker channel.
    for sym in symbols {
        let sub = format!(
            r#"{{"id":"{}","reqType":"sub","dataType":"{}@bookTicker"}}"#,
            now_ns(), sym
        );
        client.send(Message::text(sub))
            .await
            .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
        // Rate-limit spacing: BingX tight rate limits at 10 req/s for orders;
        // subscribes not explicitly rate-limited but being conservative.
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

                // BingX frames are GZIP-compressed binary. Server may also
                // send a "Ping" text frame at 5s cadence.
                let decoded = if payload.len() >= 2 && &payload[..2] == b"\x1f\x8b" {
                    decoder.decode(payload, 64 * 1024)?
                } else if msg.is_text() {
                    payload
                } else {
                    continue;
                };
                let text = match std::str::from_utf8(decoded) {
                    Ok(s) => s,
                    Err(_) => continue,
                };

                // Server-initiated Ping is the literal string "Ping" (documented PhD#5).
                if text == "Ping" {
                    client.send(Message::text("Pong".to_string())).await
                        .map_err(|e| Error::WebSocket(format!("pong: {}", e)))?;
                    continue;
                }

                let t0 = std::time::Instant::now();
                let _ = parse_and_apply(text, |sym, bid, ask| {
                    if let Some(id) = universe.lookup(Venue::BingxSpot, sym) {
                        let ts = now_ns();
                        store.slot(Venue::BingxSpot, id).commit(
                            bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                        );
                        stale.cell(Venue::BingxSpot, id).update(ts);
                        Metrics::init().record_ingest(Venue::BingxSpot, t0.elapsed().as_nanos() as u64);
                    } else {
                        debug!(symbol = sym, "bingx-spot: not in universe");
                    }
                });
            }
            _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                return Err(Error::WebSocket("silent disconnect bingx-spot".into()));
            }
        }
    }
}

/// Parse BingX bookTicker event.
/// Payload shape: `{"code":0,"data":{"A":"0.01","B":"0.5","T":1,"a":"42001","b":"41999","s":"BTC-USDT"}, ...}`
fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price),
{
    let Ok(sym_lv) = sonic_rs::get(json, &["data", "s"]) else { return Ok(()); };
    let Some(sym) = sym_lv.as_str() else { return Ok(()); };

    let b = sonic_rs::get(json, &["data", "b"])
        .map_err(|e| Error::Decode(format!("data.b: {}", e)))?
        .as_str().ok_or_else(|| Error::Decode("data.b not str".into()))?
        .parse::<f64>().map_err(|_| Error::Decode("data.b f64".into()))?;
    let a = sonic_rs::get(json, &["data", "a"])
        .map_err(|e| Error::Decode(format!("data.a: {}", e)))?
        .as_str().ok_or_else(|| Error::Decode("data.a not str".into()))?
        .parse::<f64>().map_err(|_| Error::Decode("data.a f64".into()))?;
    f(sym, Price::from_f64(b), Price::from_f64(a));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_bingx_bookticker() {
        let js = r#"{"code":0,"timestamp":1,"data":{"s":"BTC-USDT","b":"41999.5","B":"0.5","a":"42001.0","A":"0.01"},"dataType":"BTC-USDT@bookTicker"}"#;
        let mut got: Option<(String, Price, Price)> = None;
        parse_and_apply(js, |s, b, a| got = Some((s.into(), b, a))).unwrap();
        let (s, b, a) = got.unwrap();
        assert_eq!(s, "BTC-USDT");
        assert_eq!(b, Price::from_f64(41999.5));
        assert_eq!(a, Price::from_f64(42001.0));
    }
}
