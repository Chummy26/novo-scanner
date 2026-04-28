//! MEXC Futures WebSocket adapter.
//!
//! Endpoint: wss://contract.mexc.com/edge
//! Channel:  sub.tickers → all perpetual contracts, 1 connection covers universe.
//! Encoding: JSON; server compresses by default. We disable compression at
//!           subscribe time with `"gzip":false` (simpler + no decode cost).
//! Ping:     client sends `{"method":"ping"}` every 10-20s.
//!
//! Frame (subset):
//! ```json
//! {"channel":"push.tickers","data":[{"symbol":"BTC_USDT","bid1":42000,"ask1":42001, ...}, ...], "ts":...}
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
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct MexcFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale: Arc<crate::spread::engine::StaleTable>,
    pub vol: Arc<crate::broadcast::VolStore>,
    pub url: String,
}

impl MexcFutAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale: Arc<crate::spread::engine::StaleTable>,
        vol: Arc<crate::broadcast::VolStore>,
    ) -> Self {
        Self {
            universe,
            stale,
            vol,
            url: "wss://contract.mexc.com/edge".into(),
        }
    }
}

#[async_trait]
impl Adapter for MexcFutAdapter {
    fn venue(&self) -> Venue {
        Venue::MexcFut
    }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "mexc-fut", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl MexcFutAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self
            .url
            .parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "mexc-fut", "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect()
            .await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Per-symbol sub.ticker: only channel that emits bid1/ask1.
        let syms: Vec<String> = self.universe.per_venue[Venue::MexcFut.idx()]
            .keys()
            .cloned()
            .collect();
        info!(
            venue = "mexc-fut",
            count = syms.len(),
            "subscribing sub.ticker per-symbol"
        );
        for sym in &syms {
            let sub = format!(
                r#"{{"method":"sub.ticker","param":{{"symbol":"{}"}},"gzip":false}}"#,
                sym
            );
            client
                .send(Message::text(sub))
                .await
                .map_err(|e| Error::WebSocket(format!("subscribe {}: {}", sym, e)))?;
            tokio::time::sleep(Duration::from_millis(20)).await;
        }

        let mut ping_interval = tokio::time::interval(Duration::from_secs(15));
        let mut last_frame_at = std::time::Instant::now();

        loop {
            tokio::select! {
                _ = ping_interval.tick() => {
                    client.send(Message::text(r#"{"method":"ping"}"#.to_string()))
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

                    // We subscribe `sub.ticker` (per-symbol), which emits
                    // `push.ticker`. Subscribe-ack comes as `rs.sub.ticker`.
                    let channel = sonic_rs::get(text, &["channel"])
                        .ok()
                        .and_then(|lv| lv.as_str().map(|s| s.to_string()));
                    match channel.as_deref() {
                        Some("push.ticker") => { /* happy path */ }
                        Some("rs.sub.ticker") | Some("pong") => continue,
                        _ => continue,
                    }

                    // data is an array of ticker objects; iterate.
                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |symbol, bid_px, ask_px, vol24| {
                        if let Some(sym_id) = self.universe.lookup(Venue::MexcFut, symbol) {
                            let ts = now_ns();
                            store.slot(Venue::MexcFut, sym_id).commit(
                                bid_px, Qty::from_f64(1.0), ask_px, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::MexcFut, sym_id).update(ts);
                            if vol24 > 0.0 { self.vol.set(Venue::MexcFut, sym_id, vol24); }
                            Metrics::init().record_ingest(Venue::MexcFut, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol, "mexc-fut: not in universe");
                        }
                    });
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect mexc-fut".into()));
                }
            }
        }
    }
}

fn parse_and_apply<F>(json: &str, mut f: F) -> Result<()>
where
    F: FnMut(&str, Price, Price, f64),
{
    let data_lv =
        sonic_rs::get(json, &["data"]).map_err(|e| Error::Decode(format!("data: {}", e)))?;
    let v: sonic_rs::Value = sonic_rs::from_str(data_lv.as_raw_str())
        .map_err(|e| Error::Decode(format!("parse data: {}", e)))?;

    // Data may be an array of tickers OR a single ticker object depending on
    // which sub-stream emitted it (sub.tickers → array; per-symbol → object).
    let entries: Vec<&sonic_rs::Value> = if let Some(arr) = v.as_array() {
        arr.iter().collect()
    } else if v.as_object().is_some() {
        vec![&v]
    } else {
        return Ok(());
    };

    for entry in entries {
        let obj = match entry.as_object() {
            Some(o) => o,
            None => continue,
        };
        let sym = match obj.get(&"symbol").and_then(|x| x.as_str()) {
            Some(s) => s,
            None => continue,
        };
        let num = |k: &str| -> f64 {
            match obj.get(&k) {
                Some(v) if v.is_number() => v.as_f64().unwrap_or(0.0),
                Some(v) if v.is_str() => v.as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0),
                _ => 0.0,
            }
        };
        // bid1/ask1 are the true top-of-book. DO NOT read maxBidPrice /
        // minAskPrice: those are the ±10% order-placement circuit-breakers
        // (limit = index_price × (1 ± bidLimitPriceRate)), not quotes.
        // Wire-captured evidence: for BTC_USDT at BTC=77,057, MEXC fut
        // emits bid1=77056.8 ask1=77056.9 (correct) while maxBidPrice=84810
        // minAskPrice=69390 (circuit-breaker limits).
        let bid = num("bid1");
        let ask = num("ask1");
        // Skip the frame when bid1/ask1 are absent instead of substituting
        // lastPrice: the last-trade price can sit still for minutes on
        // illiquid contracts and produces phantom spreads against venues
        // that emit a live BBO. Better to leave the book un-committed for
        // this tick than to commit stale data (vol_poller + stale threshold
        // already handle the "never populated" case cleanly).
        if bid <= 0.0 || ask <= 0.0 {
            continue;
        }
        // amount24 = USDT volume 24h; volume24 = contracts count.
        let vol24 = num("amount24");
        f(sym, Price::from_f64(bid), Price::from_f64(ask), vol24);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_push_ticker_uses_bid1_ask1() {
        // Real shape of push.ticker per-symbol frame.
        let js = r#"{"channel":"push.ticker","symbol":"BTC_USDT","data":{
            "symbol":"BTC_USDT","bid1":77056.8,"ask1":77056.9,
            "lastPrice":77056.9,"amount24":6848054029,
            "maxBidPrice":84810.4,"minAskPrice":69390.3
        },"ts":1}"#;
        let mut seen: Vec<(String, Price, Price, f64)> = Vec::new();
        parse_and_apply(js, |s, b, a, v| seen.push((s.to_string(), b, a, v))).unwrap();
        assert_eq!(seen.len(), 1);
        assert_eq!(seen[0].0, "BTC_USDT");
        assert_eq!(
            seen[0].1,
            Price::from_f64(77056.8),
            "must use bid1, not maxBidPrice"
        );
        assert_eq!(
            seen[0].2,
            Price::from_f64(77056.9),
            "must use ask1, not minAskPrice"
        );
        assert_eq!(seen[0].3, 6_848_054_029.0);
    }

    #[test]
    fn parse_push_ticker_skips_when_no_book() {
        // No bid1/ask1 in the frame — must NOT emit a synthetic quote derived
        // from lastPrice. Illiquid contracts often have a stale last with no
        // live BBO, and committing (last, last) creates ghost spreads.
        let js = r#"{"channel":"push.ticker","data":{"symbol":"XYZ_USDT","lastPrice":1.23,"amount24":10}}"#;
        let mut seen: Vec<(String, f64, f64)> = Vec::new();
        parse_and_apply(js, |s, b, a, _| {
            seen.push((s.to_string(), b.to_f64(), a.to_f64()))
        })
        .unwrap();
        assert!(
            seen.is_empty(),
            "frame without bid1/ask1 must be skipped, not flattened to last"
        );
    }
}
