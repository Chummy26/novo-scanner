//! Gate.io Futures (USDT-margined) WebSocket adapter.
//!
//! Endpoint: wss://fx-ws.gateio.ws/v4/ws/usdt
//! Channel:  futures.book_ticker → per-contract top-of-book.
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

const GATE_FUT_SUBSCRIBE_CHUNK_SIZE: usize = 100;

pub struct GateFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale: Arc<crate::spread::engine::StaleTable>,
    pub url: String,
}

impl GateFutAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale: Arc<crate::spread::engine::StaleTable>,
    ) -> Self {
        Self {
            universe,
            stale,
            url: "wss://fx-ws.gateio.ws/v4/ws/usdt".into(),
        }
    }
}

#[async_trait]
impl Adapter for GateFutAdapter {
    fn venue(&self) -> Venue {
        Venue::GateFut
    }

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

        let uri: Uri = self
            .url
            .parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "gate-fut", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect()
            .await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Subscribe to true top-of-book. `futures.tickers` does not include
        // live bid/ask fields on the current Gate feed, and `!all` is not
        // accepted for `futures.book_ticker`, so subscribe the discovered
        // contracts in chunks.
        let mut contracts: Vec<String> = self.universe.per_venue[Venue::GateFut.idx()]
            .keys()
            .cloned()
            .collect();
        contracts.sort_unstable();
        if contracts.is_empty() {
            return Err(Error::Protocol("gate-fut universe has no contracts".into()));
        }
        info!(
            venue = "gate-fut",
            count = contracts.len(),
            chunk_size = GATE_FUT_SUBSCRIBE_CHUNK_SIZE,
            "subscribing futures.book_ticker"
        );
        for chunk in contracts.chunks(GATE_FUT_SUBSCRIBE_CHUNK_SIZE) {
            let payload = serde_json::to_string(chunk)?;
            let sub = format!(
                r#"{{"time":{ts},"channel":"futures.book_ticker","event":"subscribe","payload":{payload}}}"#,
                ts = now_ns() / 1_000_000_000,
                payload = payload,
            );
            client
                .send(Message::text(sub))
                .await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
            tokio::time::sleep(Duration::from_millis(25)).await;
        }

        let mut ping_interval = tokio::time::interval(Duration::from_secs(10));
        let mut last_frame_at = std::time::Instant::now();
        let mut last_bbo_at = std::time::Instant::now();

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

                    if msg.is_close() {
                        return Err(Error::WebSocket("close frame gate-fut".into()));
                    }
                    if !msg.is_text() { continue; }

                    let text = std::str::from_utf8(msg.as_payload())
                        .map_err(|e| Error::Decode(format!("utf8: {}", e)))?;

                    let Ok(ch_lv) = sonic_rs::get(text, &["channel"]) else { continue };
                    let Some(ch) = ch_lv.as_str() else { continue };
                    if ch != "futures.book_ticker" { continue; }
                    let Ok(ev_lv) = sonic_rs::get(text, &["event"]) else { continue };
                    let Some(ev) = ev_lv.as_str() else { continue };
                    if ev == "subscribe" {
                        if let Ok(code_lv) = sonic_rs::get(text, &["error", "code"]) {
                            let code = code_lv
                                .as_str()
                                .map(str::to_string)
                                .unwrap_or_else(|| code_lv.as_raw_str().to_string());
                            let message = sonic_rs::get(text, &["error", "message"])
                                .ok()
                                .and_then(|lv| lv.as_str().map(str::to_string))
                                .unwrap_or_default();
                            return Err(Error::Protocol(format!(
                                "gate-fut subscription error code={} message={}",
                                code, message
                            )));
                        }
                        let ok = sonic_rs::get(text, &["result", "status"])
                            .ok()
                            .and_then(|lv| lv.as_str().map(|s| s.eq_ignore_ascii_case("success")))
                            .unwrap_or(false);
                        if !ok {
                            return Err(Error::Protocol(format!(
                                "gate-fut subscription rejected: {}",
                                text
                            )));
                        }
                        debug!(venue = "gate-fut", payload = %text, "subscription ack");
                        continue;
                    }
                    if ev != "update" { continue; }

                    let t0 = std::time::Instant::now();
                    let mut applied = 0u64;
                    let _ = parse_and_apply(text, |sym, bid, ask, bid_qty, ask_qty| {
                        if let Some(id) = self.universe.lookup(Venue::GateFut, sym) {
                            let ts = now_ns();
                            store.slot(Venue::GateFut, id).commit(
                                bid, bid_qty, ask, ask_qty, ts
                            );
                            self.stale.cell(Venue::GateFut, id).update(ts);
                            Metrics::init().record_ingest(Venue::GateFut, t0.elapsed().as_nanos() as u64);
                            applied = applied.saturating_add(1);
                        } else {
                            debug!(symbol = sym, "gate-fut: not in universe");
                        }
                    });
                    if applied > 0 {
                        last_bbo_at = std::time::Instant::now();
                    }
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect gate-fut".into()));
                }
                _ = tokio::time::sleep_until((last_bbo_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent BBO feed gate-fut".into()));
                }
            }
        }
    }
}

/// Gate futures.book_ticker `result` can be an object or an array.
/// Fields of interest: `s` (contract), `b`/`a` (bid/ask), `B`/`A`
/// (bid/ask size).
///
/// We deliberately do NOT fall back to `last` (last-trade price) when bid/ask
/// are missing: on illiquid contracts Gate can go minutes without a new
/// trade, so `last` stays frozen while the BBO on peer venues moves,
/// generating phantom 5-30% cross-venue spreads. Skipping the frame leaves
/// the slot un-updated — the per-venue staleness threshold will then mark it
/// stale and the spread engine will drop the leg cleanly.
fn parse_and_apply<F>(json: &str, mut f: F) -> Result<()>
where
    F: FnMut(&str, Price, Price, Qty, Qty),
{
    let result_lv =
        sonic_rs::get(json, &["result"]).map_err(|e| Error::Decode(format!("result: {}", e)))?;
    let v: sonic_rs::Value = sonic_rs::from_str(result_lv.as_raw_str())
        .map_err(|e| Error::Decode(format!("parse result: {}", e)))?;

    let apply_entry = |obj: &sonic_rs::Object, f: &mut F| {
        let Some(sym) = obj
            .get(&"s")
            .or_else(|| obj.get(&"contract"))
            .and_then(|x| x.as_str())
        else {
            return;
        };
        let num = |k: &str| -> Option<f64> {
            obj.get(&k).and_then(|x| {
                if let Some(s) = x.as_str() {
                    s.parse::<f64>().ok()
                } else {
                    x.as_f64()
                }
            })
        };
        let bid = num("b").or_else(|| num("highest_bid"));
        let ask = num("a").or_else(|| num("lowest_ask"));
        let (bid, ask) = match (bid, ask) {
            (Some(b), Some(a)) if b > 0.0 && a > 0.0 => (b, a),
            _ => return, // no live BBO → do NOT substitute `last` (see header comment)
        };
        let bid_qty = num("B").unwrap_or(1.0);
        let ask_qty = num("A").unwrap_or(1.0);
        if bid_qty <= 0.0 || ask_qty <= 0.0 {
            return;
        }
        f(
            sym,
            Price::from_f64(bid),
            Price::from_f64(ask),
            Qty::from_f64(bid_qty),
            Qty::from_f64(ask_qty),
        );
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
    fn parse_futures_book_ticker() {
        let js = r#"{
            "channel":"futures.book_ticker","event":"update","time":1,
            "result":[
                {"s":"BTC_USDT","b":"41999","B":2,"a":"42001","A":3},
                {"s":"ETH_USDT","b":"2099","B":4,"a":"2101","A":5}
            ]
        }"#;
        let mut seen = Vec::new();
        parse_and_apply(js, |s, b, a, bq, aq| {
            seen.push((s.to_string(), b, a, bq, aq))
        })
        .unwrap();
        assert_eq!(seen.len(), 2);
        assert_eq!(seen[0].0, "BTC_USDT");
        assert_eq!(seen[0].1, Price::from_f64(41999.0));
        assert_eq!(seen[0].3, Qty::from_f64(2.0));
        assert_eq!(seen[0].4, Qty::from_f64(3.0));
    }

    #[test]
    fn parse_futures_skips_when_no_bbo() {
        // No bid / ask → must skip entirely (no flat-spread
        // substitution from `last`), otherwise illiquid contracts pollute
        // the book with stale last-trade prices.
        let js = r#"{"channel":"futures.book_ticker","event":"update","time":1,
            "result":[{"contract":"XYZ_USDT","last":"100"}]}"#;
        let mut seen: Vec<(String, Price, Price)> = Vec::new();
        parse_and_apply(js, |s, b, a, _, _| seen.push((s.to_string(), b, a))).unwrap();
        assert!(
            seen.is_empty(),
            "contracts with no BBO must be skipped, not flattened to last"
        );
    }
}
