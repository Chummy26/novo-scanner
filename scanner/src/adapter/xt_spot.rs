//! XT Spot WebSocket adapter.
//!
//! Endpoint: wss://stream.xt.com/public
//! Encoding (per PhD#5 D-14): application-level GZIP+Base64, NOT WS permessage-deflate.
//!   Server sends binary frames containing Base64 text that decodes to GZIP bytes
//!   that inflate to JSON. Pipeline:  frame → base64::decode → gzip decompress → JSON.
//! Ping:     server pushes "ping" every 5s; 3 consecutive misses → disconnect
//!           (effective 15s timeout per PhD#5 D-18, tighter than the
//!           prompt's "1 min" assumption).
//! Channel:  `depth@{sym},5` — top-5 levels of the order book.
//!   The `ticker@{sym}` channel is NOT used because XT spot ticker frames
//!   omit `bp`/`ap` — the only price present is `c` (last trade), which on
//!   illiquid symbols stays stale for minutes and creates ghost spreads
//!   (e.g. SIREN/RAVE appearing to trade at 30% apart vs other venues when
//!   the real bid/ask was actually aligned).
//! Subscribe: `{"sub":"depth@btc_usdt,5"}` per message (XT docs "Limited Depth").
//!   The `{"method":"subscribe","params":[...]}` shape is the XT **futures**
//!   request format; spot public streams use the `sub` keyword and a single
//!   topic per frame. Sending the wrong shape silently drops — server never
//!   emits data → adapter reconnects every 30s with zero frames received.
//! Volume:    Not in depth frames — picked up by `vol_poller` via REST.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use sonic_rs::JsonValueTrait;
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::decode::{gzip::sniff_format, GzipDecoder};
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct XtSpotAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub vol:      Arc<crate::broadcast::VolStore>,
    pub url:      String,
}

impl XtSpotAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale:    Arc<crate::spread::engine::StaleTable>,
        vol:      Arc<crate::broadcast::VolStore>,
    ) -> Self {
        Self {
            universe,
            stale,
            vol,
            url: "wss://stream.xt.com/public".into(),
        }
    }
}

#[async_trait]
impl Adapter for XtSpotAdapter {
    fn venue(&self) -> Venue { Venue::XtSpot }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "xt-spot", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl XtSpotAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "xt-spot", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Subscribe one topic per message using XT spot's `{"sub":"<topic>"}`
        // shape. The spot server rejects (silently) the futures-style
        // `{"method":"subscribe","params":[…]}` wrapper — we verified this
        // empirically: the old wrapper produced 0 frames across 3 reconnects.
        let xt_symbols: Vec<String> = self.universe.per_venue[Venue::XtSpot.idx()]
            .keys().cloned().collect();
        info!(venue = "xt-spot", count = xt_symbols.len(), "subscribing depth@sym,5");
        for sym in &xt_symbols {
            let sub = format!(r#"{{"sub":"depth@{},5"}}"#, sym);
            client.send(Message::text(sub)).await
                .map_err(|e| Error::WebSocket(format!("subscribe {}: {}", sym, e)))?;
            // Light spacing — XT docs don't publish a hard rate limit for
            // public sub but being polite avoids any server-side throttle.
            tokio::time::sleep(Duration::from_millis(10)).await;
        }

        let mut decoder = GzipDecoder::new(8 * 1024);
        let mut base64_buf = Vec::with_capacity(8 * 1024);
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
                    let bytes: &[u8] = &payload[..];
                    if bytes.is_empty() { continue; }

                    // "ping" from server → reply "pong".
                    if bytes == b"ping" {
                        client.send(Message::text("pong".to_string())).await
                            .map_err(|e| Error::WebSocket(format!("pong: {}", e)))?;
                        continue;
                    }
                    if bytes == b"pong" { continue; }

                    // Decode pipeline: frame → maybe base64 → maybe gzip → JSON.
                    // We sniff the first 2 bytes after each decode step to adapt
                    // to alternate framings (connection acks are plain JSON text).
                    let decoded_bytes: Vec<u8> = if sniff_format(bytes) == crate::decode::gzip::Format::Gzip {
                        // Already gzip — skip base64.
                        decoder.decode(bytes, 256 * 1024)?.to_vec()
                    } else if msg.is_binary() {
                        // Try base64 + gzip.
                        base64_buf.clear();
                        match base64::engine::general_purpose::STANDARD.decode_vec(bytes, &mut base64_buf) {
                            Ok(()) => {
                                if sniff_format(&base64_buf) == crate::decode::gzip::Format::Gzip {
                                    decoder.decode(&base64_buf, 256 * 1024)?.to_vec()
                                } else {
                                    base64_buf.clone()
                                }
                            }
                            Err(_) => bytes.to_vec(),
                        }
                    } else {
                        bytes.to_vec()
                    };

                    let Ok(text) = std::str::from_utf8(&decoded_bytes) else { continue };

                    // Connection ack / subscribe ack: {"rc":0,"mc":"SUCCESS", ...}
                    if sonic_rs::get(text, &["rc"]).is_ok() { continue; }

                    let Ok(topic_lv) = sonic_rs::get(text, &["topic"]) else { continue };
                    let Some(topic) = topic_lv.as_str() else { continue };
                    if topic != "depth" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, ask| {
                        if let Some(id) = self.universe.lookup(Venue::XtSpot, sym) {
                            let ts = now_ns();
                            store.slot(Venue::XtSpot, id).commit(
                                bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::XtSpot, id).update(ts);
                            Metrics::init().record_ingest(Venue::XtSpot, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "xt-spot: not in universe");
                        }
                    });
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(30)).into()) => {
                    return Err(Error::WebSocket("silent disconnect xt-spot (15-30s window)".into()));
                }
            }
        }
    }
}

fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price),
{
    // XT spot depth@{sym},5 frame observed on wire:
    //   {
    //     "topic":"depth",
    //     "event":"depth@btc_usdt,5",
    //     "data": {
    //       "s":"btc_usdt",
    //       "b":[["41999.50","0.5"], ...],   // best bid first (desc by price)
    //       "a":[["42001.00","0.3"], ...],   // best ask first (asc by price)
    //       "t":1234567890
    //     }
    //   }
    let s_lv = sonic_rs::get(json, &["data", "s"])
        .map_err(|e| Error::Decode(format!("data.s: {}", e)))?;
    let sym = s_lv.as_str().ok_or_else(|| Error::Decode("data.s not str".into()))?;

    // Best bid at data.b[0][0], best ask at data.a[0][0]. Both sides may be
    // empty momentarily on sparse books — skip the frame in that case rather
    // than committing a zero price. sonic_rs paths with mixed string+index
    // segments require the `pointer!` macro (homogeneous arrays don't work).
    let bid_s = sonic_rs::get(json, sonic_rs::pointer!["data", "b", 0, 0])
        .ok().and_then(|lv| lv.as_str().map(|s| s.to_string())).unwrap_or_default();
    let ask_s = sonic_rs::get(json, sonic_rs::pointer!["data", "a", 0, 0])
        .ok().and_then(|lv| lv.as_str().map(|s| s.to_string())).unwrap_or_default();

    let bid_f = bid_s.parse::<f64>().unwrap_or(0.0);
    let ask_f = ask_s.parse::<f64>().unwrap_or(0.0);
    if bid_f <= 0.0 || ask_f <= 0.0 { return Ok(()); }
    f(sym, Price::from_f64(bid_f), Price::from_f64(ask_f));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_xt_spot_depth_top_of_book() {
        let js = r#"{"topic":"depth","event":"depth@btc_usdt,5","data":{"s":"btc_usdt","b":[["41999.50","0.5"],["41999.00","1.0"]],"a":[["42001.00","0.3"],["42001.50","0.8"]],"t":1700000000000}}"#;
        let mut got: Option<(String, Price, Price)> = None;
        parse_and_apply(js, |s, b, a| got = Some((s.into(), b, a))).unwrap();
        let (s, b, a) = got.unwrap();
        assert_eq!(s, "btc_usdt");
        assert_eq!(b, Price::from_f64(41999.50));
        assert_eq!(a, Price::from_f64(42001.00));
    }

    #[test]
    fn parse_xt_spot_depth_empty_side_skipped() {
        // Missing one side → must not commit a zero price.
        let js = r#"{"topic":"depth","event":"depth@ill_usdt,5","data":{"s":"ill_usdt","b":[],"a":[["0.01","1"]],"t":1}}"#;
        let mut got: Option<(String, Price, Price)> = None;
        parse_and_apply(js, |s, b, a| got = Some((s.into(), b, a))).unwrap();
        assert!(got.is_none(), "empty-side frame must skip");
    }
}
