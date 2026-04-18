//! MEXC Spot WebSocket adapter — Protobuf-encoded frames.
//!
//! Endpoint: wss://wbs-api.mexc.com/ws (PhD#5 D-04: new URL since Aug 2025)
//! Channel:  spot@public.miniTickers.v3.api.pb@UTC+8 → ALL spot pairs in 1 conn.
//! Ping:     client sends {"method":"PING"} when idle; disconnects if no data
//!           for 60s with a subscription.
//!
//! Frame format: Protobuf `PushDataV3ApiWrapper` containing a nested
//! `PublicMiniTickersV3Api` (field 306). Schema at
//! https://github.com/mexcdevelop/websocket-proto.
//!
//! We decode manually with `quick-protobuf::BytesReader` to avoid a codegen
//! dependency. Only a minimal set of fields is extracted; unknown fields are
//! skipped via `reader.read_unknown`.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use quick_protobuf::BytesReader;
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct MexcSpotAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub url:      String,
}

impl MexcSpotAdapter {
    pub fn new(universe: Arc<SymbolUniverse>, stale: Arc<crate::spread::engine::StaleTable>) -> Self {
        Self {
            universe,
            stale,
            url: "wss://wbs-api.mexc.com/ws".into(),
        }
    }
}

#[async_trait]
impl Adapter for MexcSpotAdapter {
    fn venue(&self) -> Venue { Venue::MexcSpot }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "mexc-spot", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl MexcSpotAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "mexc-spot", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Subscribe to miniTickers (aggregate — 1 subscription covers all).
        let sub = r#"{"method":"SUBSCRIPTION","params":["spot@public.miniTickers.v3.api.pb@UTC+8"]}"#;
        client.send(Message::text(sub.to_string())).await
            .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;

        let mut ping_interval = tokio::time::interval(Duration::from_secs(20));
        let mut last_frame_at = std::time::Instant::now();

        loop {
            tokio::select! {
                _ = ping_interval.tick() => {
                    client.send(Message::text(r#"{"method":"PING"}"#.to_string())).await
                        .map_err(|e| Error::WebSocket(format!("ping: {}", e)))?;
                }
                msg = client.next() => {
                    let Some(msg) = msg else {
                        return Err(Error::WebSocket("stream closed".into()));
                    };
                    let msg = msg.map_err(|e| Error::WebSocket(format!("recv: {}", e)))?;
                    if msg.is_close() { return Ok(()); }

                    let payload = msg.as_payload();
                    if payload.is_empty() { continue; }

                    // MEXC sends subscribe acks + PONG as plain JSON text.
                    // Protobuf frames are binary.
                    if msg.is_text() {
                        // ack / pong — ignore.
                        continue;
                    }

                    let t0 = std::time::Instant::now();
                    match decode_push(payload) {
                        Ok(tickers) => {
                            let ts = now_ns();
                            let ns = t0.elapsed().as_nanos() as u64;
                            for (sym, bid, ask) in tickers {
                                if let Some(id) = self.universe.lookup(Venue::MexcSpot, &sym) {
                                    store.slot(Venue::MexcSpot, id).commit(
                                        bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                                    );
                                    self.stale.cell(Venue::MexcSpot, id).update(ts);
                                    Metrics::init().record_ingest(Venue::MexcSpot, ns);
                                } else {
                                    debug!(symbol = %sym, "mexc-spot: not in universe");
                                }
                            }
                        }
                        Err(e) => debug!("mexc-spot decode: {}", e),
                    }
                    last_frame_at = std::time::Instant::now();
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect mexc-spot".into()));
                }
            }
        }
    }
}

// ---- Minimal protobuf decoders (manual; no codegen) ----
//
// The wire format:
//   message PushDataV3ApiWrapper {
//     string channel           = 1;
//     oneof body { ... public_mini_tickers = 306 }  // when channel == "...miniTickers..."
//     string symbol            = 303;  // (not used by miniTickers aggregate)
//     int64  send_time         = 301;  // ignored
//   }
//   message PublicMiniTickersV3Api { ... }
//
// miniTickers aggregated channel actually wraps a *repeated* ticker list in
// the body. MEXC's schema shows the wrapper carrying a single PublicMiniTickersBatchV3Api
// whose `items` field is a repeated PublicMiniTickerV3Api.
//
// Decoder strategy: scan tags, descend into nested messages by length-delimited
// sub-readers, extract symbol + bid/ask fields. Field numbers from the published
// .proto (2026-04 snapshot); may shift in future revisions — monitor M10.

fn decode_push(buf: &[u8]) -> std::result::Result<Vec<(String, Price, Price)>, String> {
    let mut reader = BytesReader::from_bytes(buf);
    let mut out: Vec<(String, Price, Price)> = Vec::new();
    while !reader.is_eof() {
        let tag = reader.next_tag(buf).map_err(|e| format!("tag: {}", e))?;
        let field = tag >> 3;
        let wtype = tag & 0x7;
        match (field, wtype) {
            // channel: string(1), wire=2 (length-delimited)
            (1, 2) => { let _ = reader.read_string(buf); }
            // mini-ticker wrapper: typically at field 306 (length-delimited message).
            // Enter sub-reader.
            (306, 2) => {
                let msg = reader.read_bytes(buf).map_err(|e| format!("miniTickers: {}", e))?;
                decode_mini_tickers_batch(msg, &mut out)?;
            }
            // every other tag: skip
            _ => {
                if reader.read_unknown(buf, tag).is_err() { break; }
            }
        }
    }
    Ok(out)
}

/// Decode `PublicMiniTickersBatchV3Api { repeated PublicMiniTickerV3Api items = 1; }`
/// or legacy `PublicMiniTickersV3Api` (single entry). We handle both shapes.
fn decode_mini_tickers_batch(buf: &[u8], out: &mut Vec<(String, Price, Price)>)
    -> std::result::Result<(), String>
{
    let mut reader = BytesReader::from_bytes(buf);
    let mut saw_items = false;
    while !reader.is_eof() {
        let tag = reader.next_tag(buf).map_err(|e| format!("mini tag: {}", e))?;
        let field = tag >> 3;
        let wtype = tag & 0x7;
        match (field, wtype) {
            // repeated sub-message at field 1
            (1, 2) => {
                saw_items = true;
                let item = reader.read_bytes(buf).map_err(|e| format!("item: {}", e))?;
                decode_one_mini_ticker(item, out)?;
            }
            _ => {
                if reader.read_unknown(buf, tag).is_err() { break; }
            }
        }
    }
    // If not a batch but a single message, try decoding the original buf as one ticker.
    if !saw_items {
        decode_one_mini_ticker(buf, out)?;
    }
    Ok(())
}

/// `PublicMiniTickerV3Api` fields (subset used):
///   1  string symbol
///   2  string price (last)
///   3  string rate
///   4  string zonedRate
///   5  string high
///   6  string low
///   7  string volume       (base qty 24h)
///   8  string quantity     (quote qty 24h)
///   9  int64  last_rt
///   10 string y_close
///
/// miniTickers does NOT include bid/ask per channel documentation. If we need
/// bid/ask for the scanner, we must use bookTicker instead of miniTickers on
/// MEXC spot — BUT bookTicker has per-symbol subscribe + 30/conn cap.
/// For the aggregated 1-conn mode we use `price` (last trade) as both bid/ask
/// — a degraded mode that still allows cross-venue comparison, at the cost
/// of not knowing the actual spread inside the venue itself.
fn decode_one_mini_ticker(buf: &[u8], out: &mut Vec<(String, Price, Price)>)
    -> std::result::Result<(), String>
{
    let mut reader = BytesReader::from_bytes(buf);
    let mut symbol = String::new();
    let mut price_s = String::new();
    while !reader.is_eof() {
        let tag = reader.next_tag(buf).map_err(|e| format!("one tag: {}", e))?;
        let field = tag >> 3;
        let wtype = tag & 0x7;
        match (field, wtype) {
            (1, 2) => { symbol  = reader.read_string(buf).map_err(|e| format!("sym: {}", e))?.to_string(); }
            (2, 2) => { price_s = reader.read_string(buf).map_err(|e| format!("price: {}", e))?.to_string(); }
            _ => {
                if reader.read_unknown(buf, tag).is_err() { break; }
            }
        }
    }
    if symbol.is_empty() || price_s.is_empty() { return Ok(()); }
    let Ok(p) = price_s.parse::<f64>() else { return Ok(()); };
    if p <= 0.0 { return Ok(()); }
    // Degraded mode: use last price as both bid and ask (see notes above).
    // When we upgrade to depth5/bookTicker streams in a later iteration,
    // this function's signature stays the same — only the decoded struct changes.
    let px = Price::from_f64(p);
    out.push((symbol, px, px));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper: write a PublicMiniTickerV3Api-like message manually.
    fn encode_ticker(symbol: &str, price: &str) -> Vec<u8> {
        // Protobuf hand-encode: tag 1, wire 2 = 0x0A; then length-prefixed bytes.
        let mut buf = Vec::new();
        buf.push(0x0A); // field 1, wire 2
        buf.push(symbol.len() as u8);
        buf.extend_from_slice(symbol.as_bytes());
        buf.push(0x12); // field 2, wire 2
        buf.push(price.len() as u8);
        buf.extend_from_slice(price.as_bytes());
        buf
    }

    #[test]
    fn decode_single_mini_ticker() {
        let inner = encode_ticker("BTCUSDT", "42000");
        let mut out = Vec::new();
        decode_one_mini_ticker(&inner, &mut out).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].0, "BTCUSDT");
        assert_eq!(out[0].1, Price::from_f64(42000.0));
        assert_eq!(out[0].2, Price::from_f64(42000.0));
    }

    #[test]
    fn decode_batch_of_tickers() {
        // Batch: repeated field 1 with two sub-messages.
        let t1 = encode_ticker("BTCUSDT", "42000");
        let t2 = encode_ticker("ETHUSDT", "2100");
        let mut buf = Vec::new();
        // field 1 (items), wire 2: tag = 0x0A
        buf.push(0x0A); buf.push(t1.len() as u8); buf.extend_from_slice(&t1);
        buf.push(0x0A); buf.push(t2.len() as u8); buf.extend_from_slice(&t2);
        let mut out = Vec::new();
        decode_mini_tickers_batch(&buf, &mut out).unwrap();
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].0, "BTCUSDT");
        assert_eq!(out[1].0, "ETHUSDT");
    }

    #[test]
    fn decode_push_wrapper_with_batch() {
        let t1 = encode_ticker("BTCUSDT", "42000");
        let mut batch = Vec::new();
        batch.push(0x0A); batch.push(t1.len() as u8); batch.extend_from_slice(&t1);

        let mut frame = Vec::new();
        // field 1 (channel) string "test"
        frame.push(0x0A); frame.push(4); frame.extend_from_slice(b"test");
        // field 306 wire 2. Tag = (306 << 3) | 2 = 2450 (varint)
        let tag: u32 = (306 << 3) | 2;
        let mut v = tag;
        while v >= 0x80 { frame.push(((v & 0x7F) | 0x80) as u8); v >>= 7; }
        frame.push(v as u8);
        // length
        frame.push(batch.len() as u8);
        frame.extend_from_slice(&batch);

        let got = decode_push(&frame).unwrap();
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].0, "BTCUSDT");
    }
}
