//! Binance Spot WebSocket adapter — `!bookTicker` aggregate stream.
//!
//! Endpoint: wss://stream.binance.com:9443/ws/!bookTicker
//!
//! The `!bookTicker` stream pushes best bid/ask for ALL spot symbols in a
//! single connection. This is the simplest high-coverage channel: no
//! snapshot/delta reconciliation (each frame is a complete best-bid/ask
//! update), no sequencing logic, no per-symbol subscribe.
//!
//! Per PhD#5 D-01/D-03: ping is protocol-level (WebSocket frame), NOT a
//! `{"method":"PING"}` JSON message. tokio-websockets handles the automatic
//! pong response.

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

pub struct BinanceSpotAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub url:      String,
}

impl BinanceSpotAdapter {
    pub fn new(universe: Arc<SymbolUniverse>, stale: Arc<crate::spread::engine::StaleTable>) -> Self {
        Self {
            universe,
            stale,
            url: "wss://stream.binance.com:9443/ws".into(),
        }
    }
}

#[async_trait]
impl Adapter for BinanceSpotAdapter {
    fn venue(&self) -> Venue { Venue::BinanceSpot }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => {
                    // Clean close: reconnect immediately.
                    attempt = 0;
                }
                Err(e) => {
                    warn!(venue = "binance-spot", attempt, "adapter run_once failed: {}", e);
                    let d = backoff.delay(attempt);
                    tokio::time::sleep(d).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl BinanceSpotAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use tokio_websockets::{ClientBuilder, Message};
        use http::Uri;

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "binance-spot", "connecting to {}", self.url);

        let (mut client, _resp) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        info!(venue = "binance-spot", "ws connected");

        // Send SUBSCRIBE for each symbol in the universe. Batch into groups of
        // 200 params/message to respect the inbound rate limit (~5 msg/s).
        let symbols: Vec<String> = self.universe.per_venue[Venue::BinanceSpot.idx()]
            .keys()
            .map(|raw| format!("{}@bookTicker", raw.to_ascii_lowercase()))
            .collect();
        info!(venue = "binance-spot", count = symbols.len(), "subscribing");
        for (i, chunk) in symbols.chunks(200).enumerate() {
            let params: Vec<String> = chunk.iter().map(|s| format!("\"{}\"", s)).collect();
            let msg = format!(
                r#"{{"method":"SUBSCRIBE","params":[{}],"id":{}}}"#,
                params.join(","), i + 1
            );
            client.send(Message::text(msg))
                .await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
            tokio::time::sleep(Duration::from_millis(250)).await;
        }

        // Watchdog: disconnect if no frame received for 60s.
        let mut last_frame_at = std::time::Instant::now();
        let mut n_frames: u64 = 0;

        loop {
            tokio::select! {
                msg = client.next() => {
                    let Some(msg) = msg else {
                        return Err(Error::WebSocket("ws stream closed by peer".into()));
                    };
                    let msg = msg.map_err(|e| Error::WebSocket(format!("recv: {}", e)))?;
                    // ANY received frame (including protocol pings and
                    // subscribe acks) counts as proof-of-life. Update the
                    // watchdog BEFORE filtering so we don't false-positive
                    // reconnect during market-quiet windows when the only
                    // traffic is server pings.
                    last_frame_at = std::time::Instant::now();

                    n_frames += 1;
                    if n_frames <= 3 || n_frames % 5000 == 0 {
                        let sz = msg.as_payload().len();
                        info!(n_frames, is_text = msg.is_text(), is_binary = msg.is_binary(),
                              is_ping = msg.is_ping(), is_close = msg.is_close(), size = sz,
                              "binance-spot frame");
                    }

                    if msg.is_ping() {
                        client.send(Message::pong(msg.into_payload()))
                            .await
                            .map_err(|e| Error::WebSocket(format!("pong: {}", e)))?;
                        continue;
                    }
                    if msg.is_close() { return Ok(()); }
                    if !(msg.is_text() || msg.is_binary()) { continue; }

                    let payload = msg.as_payload();
                    let text = match std::str::from_utf8(payload) {
                        Ok(t) => t,
                        Err(e) => {
                            tracing::warn!(n_frames, err = %e, "binance-spot utf8 fail");
                            continue;
                        }
                    };

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |symbol, bid_px, bid_qty, ask_px, ask_qty| {
                        // Binance returns the symbol uppercase (e.g. "BTCUSDT") even
                        // when we subscribed lowercase. Lookup as-is.
                        if let Some(sym_id) = self.universe.lookup(Venue::BinanceSpot, symbol) {
                            let ts = now_ns();
                            store.slot(Venue::BinanceSpot, sym_id).commit(
                                bid_px, bid_qty, ask_px, ask_qty, ts
                            );
                            self.stale.cell(Venue::BinanceSpot, sym_id).update(ts);
                            Metrics::init().record_ingest(Venue::BinanceSpot, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = symbol, "unknown symbol (not in universe)");
                        }
                    });
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket(format!("silent disconnect (>60s no frames, received {})", n_frames)));
                }
            }
        }
    }
}

/// Zero-copy parse of the Binance !bookTicker JSON frame.
/// Fields: u (updateId), s (symbol), b (bid px), B (bid qty), a (ask px), A (ask qty).
///
/// Calls `f(symbol, bid_px, bid_qty, ask_px, ask_qty)` when a valid ticker
/// frame is parsed. Returns Ok(true) in that case. Non-ticker frames (e.g.,
/// subscribe acks) return Ok(false). Parse errors return Err.
fn parse_and_apply<F>(json: &str, f: F) -> Result<bool>
where
    F: FnOnce(&str, Price, Qty, Price, Qty),
{
    use sonic_rs::JsonValueTrait;

    // sonic-rs get() returns a LazyValue borrowing from `json` — zero-copy.
    let Ok(sym_lv) = sonic_rs::get(json, &["s"]) else { return Ok(false); };
    let Some(symbol) = sym_lv.as_str() else { return Ok(false); };

    let getstr = |k: &'static str| -> Result<f64> {
        let lv = sonic_rs::get(json, &[k])
            .map_err(|e| Error::Decode(format!("missing {}: {}", k, e)))?;
        let s = lv.as_str().ok_or_else(|| Error::Decode(format!("{} not str", k)))?;
        s.parse::<f64>().map_err(|_| Error::Decode(format!("{} not f64: {}", k, s)))
    };

    let bid_px  = Price::from_f64(getstr("b")?);
    let bid_qty = Qty::from_f64(  getstr("B")?);
    let ask_px  = Price::from_f64(getstr("a")?);
    let ask_qty = Qty::from_f64(  getstr("A")?);

    f(symbol, bid_px, bid_qty, ask_px, ask_qty);
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_ticker_frame() {
        let js = r#"{"u":400900217,"s":"BTCUSDT","b":"43567.12000000","B":"0.25000000","a":"43568.00000000","A":"0.30000000"}"#;
        let mut captured: Option<(String, Price, Qty, Price, Qty)> = None;
        let matched = parse_and_apply(js, |sym, bp, bq, ap, aq| {
            captured = Some((sym.to_string(), bp, bq, ap, aq));
        }).unwrap();
        assert!(matched);
        let (sym, bp, bq, ap, _aq) = captured.unwrap();
        assert_eq!(sym, "BTCUSDT");
        assert_eq!(bp, Price::from_f64(43567.12));
        assert_eq!(ap, Price::from_f64(43568.00));
        assert_eq!(bq, Qty::from_f64(0.25));
    }

    #[test]
    fn parse_rejects_missing_field() {
        let js = r#"{"u":1,"s":"BTCUSDT","b":"1","B":"1","a":"2"}"#;
        let r = parse_and_apply(js, |_, _, _, _, _| {});
        assert!(r.is_err());
    }

    #[test]
    fn parse_skips_non_ticker() {
        let js = r#"{"result":null,"id":1}"#;
        let matched = parse_and_apply(js, |_, _, _, _, _| {}).unwrap();
        assert!(!matched);
    }
}
