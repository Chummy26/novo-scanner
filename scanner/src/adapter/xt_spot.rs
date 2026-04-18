//! XT Spot WebSocket adapter.
//!
//! Endpoint: wss://stream.xt.com/public
//! Encoding (per PhD#5 D-14): application-level GZIP+Base64, NOT WS permessage-deflate.
//!   Server sends binary frames containing Base64 text that decodes to GZIP bytes
//!   that inflate to JSON. Pipeline:  frame → base64::decode → gzip decompress → JSON.
//! Ping:     server pushes "ping" every 5s; 3 consecutive misses → disconnect
//!           (effective 15s timeout per PhD#5 D-18, tighter than the
//!           prompt's "1 min" assumption).
//! Subscribe: `{"method":"subscribe","params":["ticker@btc_usdt"]}`

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

        // Subscribe to ticker@{sym} for each universe symbol.
        let xt_symbols: Vec<String> = self.universe.per_venue[Venue::XtSpot.idx()]
            .keys().cloned().collect();
        for chunk in xt_symbols.chunks(50) {
            let params: Vec<String> = chunk.iter().map(|s| format!("\"ticker@{}\"", s)).collect();
            let sub = format!(r#"{{"method":"subscribe","params":[{}]}}"#, params.join(","));
            client.send(Message::text(sub)).await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
            tokio::time::sleep(Duration::from_millis(20)).await;
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
                    if topic != "ticker" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, ask, qv| {
                        if let Some(id) = self.universe.lookup(Venue::XtSpot, sym) {
                            let ts = now_ns();
                            store.slot(Venue::XtSpot, id).commit(
                                bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::XtSpot, id).update(ts);
                            if qv > 0.0 { self.vol.set(Venue::XtSpot, id, qv); }
                            Metrics::init().record_ingest(Venue::XtSpot, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "xt-spot: not in universe");
                        }
                    });
                    last_frame_at = std::time::Instant::now();
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
    F: FnOnce(&str, Price, Price, f64),
{
    // XT spot ticker frame doesn't include bid/ask — only open/close/high/low
    // and base/quote volume. We take `c` (close=last) as a flat-spread proxy
    // until the per-symbol book-ticker channel is wired up.
    //
    // Observed payload:
    //   data.s  symbol (lowercase)
    //   data.c  close/last trade price (string)
    //   data.q  base volume 24h (string)
    //   data.v  quote volume 24h (string)
    let s_lv = sonic_rs::get(json, &["data", "s"])
        .map_err(|e| Error::Decode(format!("data.s: {}", e)))?;
    let sym = s_lv.as_str().ok_or_else(|| Error::Decode("data.s not str".into()))?;

    let get_num = |k: &str| -> f64 {
        sonic_rs::get(json, &["data", k])
            .ok()
            .and_then(|lv| lv.as_str().and_then(|s| s.parse::<f64>().ok()))
            .unwrap_or(0.0)
    };
    // Prefer real bp/ap if the server ever includes them; otherwise flatten to c.
    let mut bp = get_num("bp");
    let mut ap = get_num("ap");
    if bp <= 0.0 || ap <= 0.0 {
        let c = get_num("c");
        if c > 0.0 { bp = c; ap = c; } else { return Ok(()); }
    }
    // volume 24h in quote currency (USDT for */USDT pairs).
    let qvol = get_num("v");
    f(sym, Price::from_f64(bp), Price::from_f64(ap), qvol);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_xt_spot_ticker_with_bp_ap() {
        let js = r#"{"topic":"ticker","event":"ticker@btc_usdt","data":{"s":"btc_usdt","c":"42000","ap":"42001","bp":"41999","v":"1000000"}}"#;
        let mut got: Option<(String, Price, Price, f64)> = None;
        parse_and_apply(js, |s, b, a, v| got = Some((s.into(), b, a, v))).unwrap();
        let (s, b, a, v) = got.unwrap();
        assert_eq!(s, "btc_usdt");
        assert_eq!(b, Price::from_f64(41999.0));
        assert_eq!(a, Price::from_f64(42001.0));
        assert_eq!(v, 1_000_000.0);
    }

    #[test]
    fn parse_xt_spot_ticker_fallback_to_close() {
        // XT spot really emits frames with no bp/ap — only c.
        let js = r#"{"topic":"ticker","event":"ticker@btc_usdt","data":{"s":"btc_usdt","c":"77220.76","o":"74687.23","v":"915000","q":"11930"}}"#;
        let mut got: Option<(String, Price, Price, f64)> = None;
        parse_and_apply(js, |s, b, a, v| got = Some((s.into(), b, a, v))).unwrap();
        let (s, b, a, v) = got.unwrap();
        assert_eq!(s, "btc_usdt");
        assert_eq!(b, Price::from_f64(77220.76));
        assert_eq!(a, Price::from_f64(77220.76));
        assert_eq!(v, 915000.0);
    }
}
