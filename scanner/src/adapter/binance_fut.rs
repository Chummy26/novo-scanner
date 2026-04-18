//! Binance USDT-Margined Futures WebSocket adapter.
//!
//! Endpoint: wss://fstream.binance.com/ws/!bookTicker
//! Channel:  !bookTicker → ALL futures contracts in one connection.
//!
//! Frame schema differs slightly from spot (extra fields, same b/B/a/A).
//! Per PhD#5 D-02: msg rate is 10/s for futures (vs 5/s spot). Per D-03:
//! ping interval is 3 minutes with 10-minute timeout.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct BinanceFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub url:      String,
}

impl BinanceFutAdapter {
    pub fn new(universe: Arc<SymbolUniverse>, stale: Arc<crate::spread::engine::StaleTable>) -> Self {
        Self {
            universe,
            stale,
            url: "wss://fstream.binance.com/ws/!bookTicker".into(),
        }
    }
}

#[async_trait]
impl Adapter for BinanceFutAdapter {
    fn venue(&self) -> Venue { Venue::BinanceFut }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "binance-fut", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl BinanceFutAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "binance-fut", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Binance futures has 10-minute ping timeout — much more relaxed than spot.
        // We still honor protocol-level pings automatically.
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

                    if msg.is_ping() {
                        client.send(Message::pong(msg.into_payload())).await
                            .map_err(|e| Error::WebSocket(format!("pong: {}", e)))?;
                        continue;
                    }
                    if msg.is_close() { return Ok(()); }
                    if !msg.is_text() { continue; }

                    let text = std::str::from_utf8(msg.as_payload())
                        .map_err(|e| Error::Decode(format!("utf8: {}", e)))?;

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, bq, ask, aq| {
                        if let Some(id) = self.universe.lookup(Venue::BinanceFut, sym) {
                            let ts = now_ns();
                            store.slot(Venue::BinanceFut, id).commit(bid, bq, ask, aq, ts);
                            self.stale.cell(Venue::BinanceFut, id).update(ts);
                            Metrics::init().record_ingest(Venue::BinanceFut, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "binance-fut: not in universe");
                        }
                    });
                }
                // 10-minute idle = stream dead.
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(600)).into()) => {
                    return Err(Error::WebSocket("silent disconnect binance-fut (>10min)".into()));
                }
            }
        }
    }
}

fn parse_and_apply<F>(json: &str, f: F) -> Result<bool>
where
    F: FnOnce(&str, Price, Qty, Price, Qty),
{
    use sonic_rs::JsonValueTrait;
    let Ok(sym_lv) = sonic_rs::get(json, &["s"]) else { return Ok(false); };
    let Some(symbol) = sym_lv.as_str() else { return Ok(false); };

    let getstr = |k: &'static str| -> Result<f64> {
        let lv = sonic_rs::get(json, &[k])
            .map_err(|e| Error::Decode(format!("{}: {}", k, e)))?;
        let s = lv.as_str().ok_or_else(|| Error::Decode(format!("{} not str", k)))?;
        s.parse::<f64>().map_err(|_| Error::Decode(format!("{} not f64", k)))
    };

    let bid_px  = Price::from_f64(getstr("b")?);
    let bid_qty = Qty::from_f64(getstr("B")?);
    let ask_px  = Price::from_f64(getstr("a")?);
    let ask_qty = Qty::from_f64(getstr("A")?);
    f(symbol, bid_px, bid_qty, ask_px, ask_qty);
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_fut_bookticker() {
        let js = r#"{"e":"bookTicker","u":400900217,"s":"BTCUSDT","b":"43567.12","B":"0.25","a":"43568.00","A":"0.30","T":1591784000000,"E":1591784000001}"#;
        let mut got: Option<String> = None;
        parse_and_apply(js, |sym, _, _, _, _| got = Some(sym.to_string())).unwrap();
        assert_eq!(got.as_deref(), Some("BTCUSDT"));
    }
}
