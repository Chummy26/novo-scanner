//! Gate.io Spot WebSocket adapter.
//!
//! Endpoint: wss://api.gateio.ws/ws/v4/
//! Channel:  spot.tickers with payload ["!all"] → all symbols, single connection.
//! Ping:     client sends `{"channel":"spot.ping"}` every 10s; server responds.
//!
//! Ticker frame (only the fields we care about):
//! ```json
//! { "time": 1611620983, "channel":"spot.tickers", "event":"update",
//!   "result": { "currency_pair":"BTC_USDT", "highest_bid":"42000", "lowest_ask":"42001" } }
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

pub struct GateSpotAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub vol:      Arc<crate::broadcast::VolStore>,
    pub url:      String,
}

impl GateSpotAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale:    Arc<crate::spread::engine::StaleTable>,
        vol:      Arc<crate::broadcast::VolStore>,
    ) -> Self {
        Self {
            universe,
            stale,
            vol,
            url: "wss://api.gateio.ws/ws/v4/".into(),
        }
    }
}

#[async_trait]
impl Adapter for GateSpotAdapter {
    fn venue(&self) -> Venue { Venue::GateSpot }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "gate-spot", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl GateSpotAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "gate-spot", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Subscribe per-symbol (not "!all" — server rejects the wildcard with
        // error code 2 on v4). We batch so the subscribe doesn't exceed the
        // 50 req/s rate limit.
        let syms: Vec<String> = self.universe.per_venue[Venue::GateSpot.idx()]
            .keys().cloned().collect();
        info!(venue = "gate-spot", count = syms.len(), "subscribing");
        for chunk in syms.chunks(30) {
            let payload: Vec<String> = chunk.iter().map(|s| format!("\"{}\"", s)).collect();
            let sub = format!(
                r#"{{"time":{ts},"channel":"spot.tickers","event":"subscribe","payload":[{list}]}}"#,
                ts = now_ns() / 1_000_000_000,
                list = payload.join(","),
            );
            client.send(Message::text(sub))
                .await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
            tokio::time::sleep(Duration::from_millis(100)).await;
        }

        // Periodic ping (client-driven per PhD#5 D-11 and Exchanges DOCS).
        let mut ping_interval = tokio::time::interval(Duration::from_secs(10));
        let mut last_frame_at = std::time::Instant::now();

        loop {
            tokio::select! {
                _ = ping_interval.tick() => {
                    let ping = r#"{"time":0,"channel":"spot.ping"}"#;
                    client.send(Message::text(ping.to_string()))
                        .await
                        .map_err(|e| Error::WebSocket(format!("ping: {}", e)))?;
                }
                msg = client.next() => {
                    let Some(msg) = msg else {
                        return Err(Error::WebSocket("stream closed".into()));
                    };
                    let msg = msg.map_err(|e| Error::WebSocket(format!("recv: {}", e)))?;
                    if msg.is_ping() {
                        client.send(Message::pong(msg.into_payload())).await
                            .map_err(|e| Error::WebSocket(format!("pong: {}", e)))?;
                        continue;
                    }
                    if msg.is_close() { return Ok(()); }
                    if !msg.is_text() { continue; }

                    let text = std::str::from_utf8(msg.as_payload())
                        .map_err(|e| Error::Decode(format!("utf8: {}", e)))?;

                    // Filter by channel + event to skip subscribe acks, pongs.
                    let Ok(ch_lv) = sonic_rs::get(text, &["channel"]) else { continue };
                    let Some(ch) = ch_lv.as_str() else { continue };
                    if ch != "spot.tickers" { continue; }
                    let Ok(ev_lv) = sonic_rs::get(text, &["event"]) else { continue };
                    let Some(ev) = ev_lv.as_str() else { continue };
                    if ev != "update" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |symbol, bid_px, ask_px, quote_vol| {
                        if let Some(sym_id) = self.universe.lookup(Venue::GateSpot, symbol) {
                            let ts = now_ns();
                            store.slot(Venue::GateSpot, sym_id).commit(
                                bid_px, Qty::from_f64(1.0),
                                ask_px, Qty::from_f64(1.0),
                                ts,
                            );
                            self.stale.cell(Venue::GateSpot, sym_id).update(ts);
                            if quote_vol > 0.0 {
                                self.vol.set(Venue::GateSpot, sym_id, quote_vol);
                            }
                            Metrics::init().record_ingest(Venue::GateSpot, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol, "gate-spot: symbol not in universe");
                        }
                    });
                    last_frame_at = std::time::Instant::now();
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect gate-spot".into()));
                }
            }
        }
    }
}

/// Parse Gate `spot.tickers` update. Fields in `result`:
/// currency_pair, last, lowest_ask, highest_bid, base_volume, quote_volume, change_percentage …
fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price, f64),
{
    use sonic_rs::JsonValueTrait;
    let sym_lv = sonic_rs::get(json, &["result", "currency_pair"])
        .map_err(|e| Error::Decode(format!("currency_pair: {}", e)))?;
    let sym = sym_lv.as_str().ok_or_else(|| Error::Decode("currency_pair not str".into()))?;

    // Gate emits "" (empty string) for bid/ask on newly listed / illiquid
    // symbols. Parsing as f64 would error and the caller swallows errors
    // silently, causing the symbol to be invisible. Treat empty / unparsable
    // as 0 and skip — keeps the symbol in the universe for when liquidity
    // arrives, instead of silently removing it.
    let bid_s = sonic_rs::get(json, &["result", "highest_bid"])
        .ok().and_then(|lv| lv.as_str().map(|s| s.to_string())).unwrap_or_default();
    let ask_s = sonic_rs::get(json, &["result", "lowest_ask"])
        .ok().and_then(|lv| lv.as_str().map(|s| s.to_string())).unwrap_or_default();
    let qvol = sonic_rs::get(json, &["result", "quote_volume"])
        .ok()
        .and_then(|lv| lv.as_str().and_then(|s| s.parse::<f64>().ok()))
        .unwrap_or(0.0);

    let bid_f = bid_s.parse::<f64>().unwrap_or(0.0);
    let ask_f = ask_s.parse::<f64>().unwrap_or(0.0);
    if bid_f <= 0.0 || ask_f <= 0.0 { return Ok(()); }
    f(sym, Price::from_f64(bid_f), Price::from_f64(ask_f), qvol);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_sample_frame() {
        let js = r#"{
            "time":1611620983,"channel":"spot.tickers","event":"update",
            "result":{"currency_pair":"BTC_USDT","last":"42000","lowest_ask":"42001","highest_bid":"41999",
                      "base_volume":"100","quote_volume":"4200000","change_percentage":"0.1"}
        }"#;
        let mut got: Option<(String, Price, Price, f64)> = None;
        parse_and_apply(js, |sym, bid, ask, qv| { got = Some((sym.into(), bid, ask, qv)); }).unwrap();
        let (sym, bid, ask, qv) = got.unwrap();
        assert_eq!(sym, "BTC_USDT");
        assert_eq!(bid, Price::from_f64(41999.0));
        assert_eq!(ask, Price::from_f64(42001.0));
        assert_eq!(qv, 4_200_000.0);
    }
}
