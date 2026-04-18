//! Bitget Spot + Futures unified WebSocket adapter (v2 market data endpoint).
//!
//! Endpoint: wss://ws.bitget.com/v2/ws/public (PhD#5 D-16 correction)
//! Channels: ticker (instType=SPOT|USDT-FUTURES|COIN-FUTURES).
//! Ping:     client sends text "ping" every 30s; server responds "pong".
//!           Disconnect after 2min without ping.
//!
//! Ticker frame:
//! ```json
//! { "action":"snapshot", "arg":{"instType":"SPOT","channel":"ticker","instId":"BTCUSDT"},
//!   "data":[{"instId":"BTCUSDT","bidPr":"42000","askPr":"42001", ...}] }
//! ```

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use sonic_rs::{JsonContainerTrait, JsonValueTrait};
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::config::BitgetMode;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct BitgetAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub url:      String,
}

impl BitgetAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale:    Arc<crate::spread::engine::StaleTable>,
        mode:     BitgetMode,
    ) -> Self {
        let url = match mode {
            BitgetMode::V2    => "wss://ws.bitget.com/v2/ws/public",
            BitgetMode::V3Uta => "wss://ws.bitget.com/v3/ws/public",
        }.to_string();
        Self { universe, stale, url }
    }
}

#[async_trait]
impl Adapter for BitgetAdapter {
    fn venue(&self) -> Venue { Venue::BitgetSpot }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::BITGET;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "bitget", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl BitgetAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "bitget", url = %self.url, "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Build subscribe batches (≤50 channels/conn is the stable recommendation
        // per PhD#5 / Exchanges DOCS). This first connection carries a slice;
        // in M8 we extend to a ConnectionPool to cover 1000+ symbols.
        let batch = self.build_subscribe_batch(50);
        for msg in batch {
            client.send(Message::text(msg))
                .await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
        }

        let mut ping_interval = tokio::time::interval(Duration::from_secs(30));
        let mut last_frame_at = std::time::Instant::now();

        loop {
            tokio::select! {
                _ = ping_interval.tick() => {
                    client.send(Message::text("ping".to_string()))
                        .await
                        .map_err(|e| Error::WebSocket(format!("ping: {}", e)))?;
                }
                msg = client.next() => {
                    let Some(msg) = msg else {
                        return Err(Error::WebSocket("stream closed".into()));
                    };
                    let msg = msg.map_err(|e| Error::WebSocket(format!("recv: {}", e)))?;
                    if msg.is_close() { return Ok(()); }
                    if !msg.is_text() { continue; }

                    let text = std::str::from_utf8(msg.as_payload())
                        .map_err(|e| Error::Decode(format!("utf8: {}", e)))?;

                    // "pong" is plain text per the Bitget docs.
                    if text == "pong" { continue; }

                    // Filter: only ticker updates.
                    let Ok(ch_lv) = sonic_rs::get(text, &["arg", "channel"]) else { continue };
                    let Some(ch) = ch_lv.as_str() else { continue };
                    if ch != "ticker" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |symbol, bid_px, ask_px| {
                        if let Some(sym_id) = self.universe.lookup(Venue::BitgetSpot, symbol) {
                            let ts = now_ns();
                            store.slot(Venue::BitgetSpot, sym_id).commit(
                                bid_px, Qty::from_f64(1.0), ask_px, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::BitgetSpot, sym_id).update(ts);
                            Metrics::init().record_ingest(Venue::BitgetSpot, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol, "bitget: symbol not in universe");
                        }
                    });
                    last_frame_at = std::time::Instant::now();
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(120)).into()) => {
                    return Err(Error::WebSocket("silent disconnect bitget (>2min)".into()));
                }
            }
        }
    }

    /// Build subscribe messages, ≤ `batch_size` channels per message.
    fn build_subscribe_batch(&self, batch_size: usize) -> Vec<String> {
        let mut msgs = Vec::new();
        let mut args: Vec<String> = Vec::new();
        let per_venue_map = &self.universe.per_venue[Venue::BitgetSpot.idx()];
        for (raw, _id) in per_venue_map {
            args.push(format!(
                r#"{{"instType":"SPOT","channel":"ticker","instId":"{}"}}"#, raw
            ));
            if args.len() >= batch_size {
                msgs.push(format!(r#"{{"op":"subscribe","args":[{}]}}"#, args.join(",")));
                args.clear();
            }
        }
        if !args.is_empty() {
            msgs.push(format!(r#"{{"op":"subscribe","args":[{}]}}"#, args.join(",")));
        }
        msgs
    }
}

fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price),
{
    // data is an array (Bitget v2), usually length 1.
    let data_lv = sonic_rs::get(json, &["data"])
        .map_err(|e| Error::Decode(format!("data: {}", e)))?;
    let v: sonic_rs::Value = sonic_rs::from_str(data_lv.as_raw_str())
        .map_err(|e| Error::Decode(format!("parse data: {}", e)))?;
    let arr = v.as_array().ok_or_else(|| Error::Decode("data not array".into()))?;
    let Some(entry) = arr.iter().next() else { return Ok(()); };
    let obj = entry.as_object().ok_or_else(|| Error::Decode("entry not object".into()))?;
    let sym = obj.get(&"instId").and_then(|x| x.as_str())
        .ok_or_else(|| Error::Decode("instId".into()))?;
    let bid_s = obj.get(&"bidPr").and_then(|x| x.as_str())
        .ok_or_else(|| Error::Decode("bidPr".into()))?;
    let ask_s = obj.get(&"askPr").and_then(|x| x.as_str())
        .ok_or_else(|| Error::Decode("askPr".into()))?;
    let bid = Price::from_f64(bid_s.parse::<f64>().map_err(|_| Error::Decode("bid f64".into()))?);
    let ask = Price::from_f64(ask_s.parse::<f64>().map_err(|_| Error::Decode("ask f64".into()))?);
    f(sym, bid, ask);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_sample_frame() {
        let js = r#"{
            "action":"snapshot",
            "arg":{"instType":"SPOT","channel":"ticker","instId":"BTCUSDT"},
            "data":[{"instId":"BTCUSDT","last":"42000","bidPr":"41999","askPr":"42001"}]
        }"#;
        let mut got: Option<(String, Price, Price)> = None;
        parse_and_apply(js, |sym, bid, ask| { got = Some((sym.into(), bid, ask)); }).unwrap();
        let (sym, bid, ask) = got.unwrap();
        assert_eq!(sym, "BTCUSDT");
        assert_eq!(bid, Price::from_f64(41999.0));
        assert_eq!(ask, Price::from_f64(42001.0));
    }
}
