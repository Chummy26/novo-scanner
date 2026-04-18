//! XT Futures WebSocket adapter.
//!
//! Endpoint: wss://fstream.xt.com/ws/market (primary per PhD#5 D-15 correction)
//! Alt:      wss://fstream.x.group/ws/market
//! Channel:  ticker@{symbol} — per-symbol subscribe.
//! Ping:     client sends "ping" (plain text) every 20s; 30s timeout.
//! Encoding: JSON plain (no GZIP, no Base64 — futures is simpler than spot).
//!
//! Frame (ticker):
//! ```json
//! {"topic":"ticker","event":"ticker@btc_usdt","data":{"s":"btc_usdt","c":"42000","ap":"42001","bp":"41999", ... }}
//! ```

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use sonic_rs::JsonValueTrait;
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct XtFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub vol:      Arc<crate::broadcast::VolStore>,
    pub url:      String,
}

impl XtFutAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale:    Arc<crate::spread::engine::StaleTable>,
        vol:      Arc<crate::broadcast::VolStore>,
    ) -> Self {
        Self {
            universe,
            stale,
            vol,
            url: "wss://fstream.xt.com/ws/market".into(),
        }
    }
}

#[async_trait]
impl Adapter for XtFutAdapter {
    fn venue(&self) -> Venue { Venue::XtFut }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "xt-fut", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl XtFutAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "xt-fut", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Subscribe: each symbol ticker channel.
        let xt_symbols: Vec<String> = self.universe.per_venue[Venue::XtFut.idx()]
            .keys().cloned().collect();
        // XT docs limit at ~10 depth pairs/conn but ticker is lighter — we
        // conservatively batch in groups of 50.
        for chunk in xt_symbols.chunks(50) {
            let params: Vec<String> = chunk.iter().map(|s| format!("ticker@{}", s)).collect();
            let sub = format!(
                r#"{{"method":"subscribe","params":[{}],"id":"{}"}}"#,
                params.iter().map(|p| format!("\"{}\"", p)).collect::<Vec<_>>().join(","),
                now_ns(),
            );
            client.send(Message::text(sub))
                .await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
        }

        let mut ping_interval = tokio::time::interval(Duration::from_secs(20));
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
                    if text == "pong" { continue; }

                    // Subscribe ack: {"id":"...","code":0} → skip.
                    let Ok(topic_lv) = sonic_rs::get(text, &["topic"]) else { continue };
                    let Some(topic) = topic_lv.as_str() else { continue };
                    if topic != "ticker" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, ask, qv| {
                        if let Some(id) = self.universe.lookup(Venue::XtFut, sym) {
                            let ts = now_ns();
                            store.slot(Venue::XtFut, id).commit(
                                bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::XtFut, id).update(ts);
                            if qv > 0.0 { self.vol.set(Venue::XtFut, id, qv); }
                            Metrics::init().record_ingest(Venue::XtFut, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "xt-fut: not in universe");
                        }
                    });
                    last_frame_at = std::time::Instant::now();
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect xt-fut".into()));
                }
            }
        }
    }
}

fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price, f64),
{
    // XT futures ticker fields (observed on wire):
    //   data.s symbol ("btc_usdt"), data.c close/last,
    //   data.a amount 24h (contracts), data.v volume 24h (USDT-ish)
    let s_lv = sonic_rs::get(json, &["data", "s"])
        .map_err(|e| Error::Decode(format!("data.s: {}", e)))?;
    let sym = s_lv.as_str().ok_or_else(|| Error::Decode("data.s not str".into()))?;

    let get_num = |k: &str| -> f64 {
        sonic_rs::get(json, &["data", k])
            .ok()
            .and_then(|lv| lv.as_str().and_then(|s| s.parse::<f64>().ok()))
            .unwrap_or(0.0)
    };
    let mut bp = get_num("bp");
    let mut ap = get_num("ap");
    if bp <= 0.0 || ap <= 0.0 {
        let c = get_num("c");
        if c > 0.0 { bp = c; ap = c; } else { return Ok(()); }
    }
    let qvol = get_num("v");
    f(sym, Price::from_f64(bp), Price::from_f64(ap), qvol);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_xt_fut_ticker_fallback() {
        // Wire format observed: {data:{s, c, o, h, l, a, v, r, t}} — no bp/ap.
        let js = r#"{"topic":"ticker","event":"ticker@btc_usdt","data":{"s":"btc_usdt","o":"74653.8","c":"77169.7","h":"78272.7","l":"74510.4","a":"280131849","v":"2147604990","r":"0.03","t":1}}"#;
        let mut got: Option<(String, Price, Price, f64)> = None;
        parse_and_apply(js, |s, b, a, v| got = Some((s.into(), b, a, v))).unwrap();
        let (s, b, a, v) = got.unwrap();
        assert_eq!(s, "btc_usdt");
        assert_eq!(b, Price::from_f64(77169.7));
        assert_eq!(a, Price::from_f64(77169.7));
        assert_eq!(v, 2_147_604_990.0);
    }
}
