//! Gate.io Futures (USDT-margined) WebSocket adapter.
//!
//! Endpoint: wss://fx-ws.gateio.ws/v4/ws/usdt
//! Channel:  futures.tickers → all USDT perpetuals.
//! Ping:     `{"channel":"futures.ping"}` every 10s.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use sonic_rs::{JsonContainerTrait, JsonValueTrait};
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct GateFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub url:      String,
}

impl GateFutAdapter {
    pub fn new(universe: Arc<SymbolUniverse>, stale: Arc<crate::spread::engine::StaleTable>) -> Self {
        Self {
            universe,
            stale,
            url: "wss://fx-ws.gateio.ws/v4/ws/usdt".into(),
        }
    }
}

#[async_trait]
impl Adapter for GateFutAdapter {
    fn venue(&self) -> Venue { Venue::GateFut }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "gate-fut", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl GateFutAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self.url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "gate-fut", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Subscribe to all USDT perpetuals.
        let sub = format!(
            r#"{{"time":{ts},"channel":"futures.tickers","event":"subscribe","payload":["!all"]}}"#,
            ts = now_ns() / 1_000_000_000,
        );
        client.send(Message::text(sub))
            .await
            .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;

        let mut ping_interval = tokio::time::interval(Duration::from_secs(10));
        let mut last_frame_at = std::time::Instant::now();

        loop {
            tokio::select! {
                _ = ping_interval.tick() => {
                    let ping = format!(
                        r#"{{"time":{ts},"channel":"futures.ping"}}"#,
                        ts = now_ns() / 1_000_000_000,
                    );
                    client.send(Message::text(ping))
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

                    let Ok(ch_lv) = sonic_rs::get(text, &["channel"]) else { continue };
                    let Some(ch) = ch_lv.as_str() else { continue };
                    if ch != "futures.tickers" { continue; }
                    let Ok(ev_lv) = sonic_rs::get(text, &["event"]) else { continue };
                    let Some(ev) = ev_lv.as_str() else { continue };
                    if ev != "update" && ev != "all" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, ask| {
                        if let Some(id) = self.universe.lookup(Venue::GateFut, sym) {
                            let ts = now_ns();
                            store.slot(Venue::GateFut, id).commit(
                                bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::GateFut, id).update(ts);
                            Metrics::init().record_ingest(Venue::GateFut, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "gate-fut: not in universe");
                        }
                    });
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect gate-fut".into()));
                }
            }
        }
    }
}

/// Gate futures.tickers `result` is typically an ARRAY of ticker objects.
/// Fields of interest: contract (symbol), highest_bid, lowest_ask.
///
/// We deliberately do NOT fall back to `last` (last-trade price) when bid/ask
/// are missing: on illiquid contracts Gate can go minutes without a new
/// trade, so `last` stays frozen while the BBO on peer venues moves,
/// generating phantom 5-30% cross-venue spreads. Skipping the frame leaves
/// the slot un-updated — the per-venue staleness threshold will then mark it
/// stale and the spread engine will drop the leg cleanly.
fn parse_and_apply<F>(json: &str, mut f: F) -> Result<()>
where
    F: FnMut(&str, Price, Price),
{
    let result_lv = sonic_rs::get(json, &["result"])
        .map_err(|e| Error::Decode(format!("result: {}", e)))?;
    let v: sonic_rs::Value = sonic_rs::from_str(result_lv.as_raw_str())
        .map_err(|e| Error::Decode(format!("parse result: {}", e)))?;

    let apply_entry = |obj: &sonic_rs::Object, f: &mut F| {
        let Some(sym) = obj.get(&"contract").and_then(|x| x.as_str()) else { return; };
        let bid = obj.get(&"highest_bid").and_then(|x| x.as_str()).and_then(|s| s.parse::<f64>().ok());
        let ask = obj.get(&"lowest_ask").and_then(|x| x.as_str()).and_then(|s| s.parse::<f64>().ok());
        let (bid, ask) = match (bid, ask) {
            (Some(b), Some(a)) if b > 0.0 && a > 0.0 => (b, a),
            _ => return, // no live BBO → do NOT substitute `last` (see header comment)
        };
        f(sym, Price::from_f64(bid), Price::from_f64(ask));
    };

    if let Some(arr) = v.as_array() {
        for entry in arr.iter() {
            if let Some(obj) = entry.as_object() {
                apply_entry(obj, &mut f);
            }
        }
    } else if let Some(obj) = v.as_object() {
        apply_entry(obj, &mut f);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_futures_tickers() {
        let js = r#"{
            "channel":"futures.tickers","event":"update","time":1,
            "result":[
                {"contract":"BTC_USDT","last":"42000","highest_bid":"41999","lowest_ask":"42001"},
                {"contract":"ETH_USDT","last":"2100","highest_bid":"2099","lowest_ask":"2101"}
            ]
        }"#;
        let mut seen = Vec::new();
        parse_and_apply(js, |s, b, a| seen.push((s.to_string(), b, a))).unwrap();
        assert_eq!(seen.len(), 2);
        assert_eq!(seen[0].0, "BTC_USDT");
        assert_eq!(seen[0].1, Price::from_f64(41999.0));
    }

    #[test]
    fn parse_futures_skips_when_no_bbo() {
        // No highest_bid / lowest_ask → must skip entirely (no flat-spread
        // substitution from `last`), otherwise illiquid contracts pollute
        // the book with stale last-trade prices.
        let js = r#"{"channel":"futures.tickers","event":"update","time":1,
            "result":[{"contract":"XYZ_USDT","last":"100"}]}"#;
        let mut seen: Vec<(String, Price, Price)> = Vec::new();
        parse_and_apply(js, |s, b, a| seen.push((s.to_string(), b, a))).unwrap();
        assert!(seen.is_empty(), "contracts with no BBO must be skipped, not flattened to last");
    }
}
