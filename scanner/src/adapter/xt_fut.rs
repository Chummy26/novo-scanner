//! XT Futures WebSocket adapter.
//!
//! Endpoint: wss://fstream.xt.com/ws/market (primary per PhD#5 D-15 correction)
//! Alt:      wss://fstream.x.group/ws/market
//! Channel:  `depth@{symbol},5` — top-5 bid/ask levels per symbol.
//!   `ticker@{symbol}` is NOT used: XT futures ticker frames emit only `c`
//!   (last trade) with no `bp`/`ap`, so falling back to `c` generates stale
//!   prices when trades are sparse.
//! Ping:     client sends "ping" (plain text) every 20s; 30s timeout.
//! Encoding: JSON plain (no GZIP, no Base64 — futures is simpler than spot).
//! Volume:   picked up by `vol_poller` via REST (depth frames don't carry it).
//!
//! Frame (depth):
//! ```json
//! {"topic":"depth","event":"depth@btc_usdt,5",
//!  "data":{"s":"btc_usdt","b":[["41999","0.5"], ...],"a":[["42001","0.3"], ...]}}
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

        // Subscribe: each symbol depth@5 channel (top-of-book from level-5
        // snapshot). Batch size 50 to stay well under XT's per-connection
        // depth subscription rate limit.
        let xt_symbols: Vec<String> = self.universe.per_venue[Venue::XtFut.idx()]
            .keys().cloned().collect();
        for chunk in xt_symbols.chunks(50) {
            let params: Vec<String> = chunk.iter().map(|s| format!("depth@{},5", s)).collect();
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
                    // ANY frame proves TCP alive — update before filters to avoid
                    // false-positive reconnect during market-quiet windows.
                    last_frame_at = std::time::Instant::now();

                    if msg.is_close() { return Ok(()); }
                    if !msg.is_text() { continue; }

                    let text = std::str::from_utf8(msg.as_payload())
                        .map_err(|e| Error::Decode(format!("utf8: {}", e)))?;
                    if text == "pong" { continue; }

                    // Subscribe ack: {"id":"...","code":0} → skip.
                    let Ok(topic_lv) = sonic_rs::get(text, &["topic"]) else { continue };
                    let Some(topic) = topic_lv.as_str() else { continue };
                    if topic != "depth" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, ask| {
                        if let Some(id) = self.universe.lookup(Venue::XtFut, sym) {
                            let ts = now_ns();
                            store.slot(Venue::XtFut, id).commit(
                                bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::XtFut, id).update(ts);
                            Metrics::init().record_ingest(Venue::XtFut, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "xt-fut: not in universe");
                        }
                    });
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
    F: FnOnce(&str, Price, Price),
{
    // XT futures depth@{sym},5 frame — same shape as spot:
    //   {"topic":"depth","event":"depth@btc_usdt,5",
    //    "data":{"s":"btc_usdt","b":[["px","qty"], ...],"a":[["px","qty"], ...]}}
    let s_lv = sonic_rs::get(json, &["data", "s"])
        .map_err(|e| Error::Decode(format!("data.s: {}", e)))?;
    let sym = s_lv.as_str().ok_or_else(|| Error::Decode("data.s not str".into()))?;

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
    fn parse_xt_fut_depth_top_of_book() {
        let js = r#"{"topic":"depth","event":"depth@btc_usdt,5","data":{"s":"btc_usdt","b":[["77169.5","1.2"],["77169.0","5.0"]],"a":[["77170.1","0.8"],["77170.5","2.3"]]}}"#;
        let mut got: Option<(String, Price, Price)> = None;
        parse_and_apply(js, |s, b, a| got = Some((s.into(), b, a))).unwrap();
        let (s, b, a) = got.unwrap();
        assert_eq!(s, "btc_usdt");
        assert_eq!(b, Price::from_f64(77169.5));
        assert_eq!(a, Price::from_f64(77170.1));
    }
}
