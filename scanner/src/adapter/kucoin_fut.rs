//! KuCoin Futures WebSocket adapter.
//!
//! Flow mirrors the spot adapter but uses the FUTURES bullet-public endpoint
//! and the `/contractMarket/tickerV2:{symbol}` topic, which pushes best
//! bid/ask at real-time cadence.
//!
//!   1. POST https://api-futures.kucoin.com/api/v1/bullet-public → {token, instanceServers}
//!   2. Connect: {endpoint}?token={token}&connectId={uuid}
//!   3. subscribe per-symbol, batched in groups of 100 (topic cap is 400).
//!   4. Ping/pong per `pingInterval` from the welcome response.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use sonic_rs::JsonValueTrait;
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct KucoinFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub vol:      Arc<crate::broadcast::VolStore>,
    pub http:     reqwest::Client,
}

impl KucoinFutAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale:    Arc<crate::spread::engine::StaleTable>,
        vol:      Arc<crate::broadcast::VolStore>,
    ) -> Self {
        Self {
            universe, stale, vol,
            http: reqwest::Client::builder()
                .user_agent("scanner/0.1")
                .timeout(Duration::from_secs(15))
                .build().expect("reqwest client"),
        }
    }
}

#[async_trait]
impl Adapter for KucoinFutAdapter {
    fn venue(&self) -> Venue { Venue::KucoinFut }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt = 0u32;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "kucoin-fut", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

#[derive(Debug, Deserialize)]
struct Bullet { data: BulletData }
#[derive(Debug, Deserialize)]
struct BulletData {
    token: String,
    #[serde(rename = "instanceServers")]
    instance_servers: Vec<InstServer>,
}
#[derive(Debug, Deserialize)]
struct InstServer {
    endpoint: String,
    #[serde(rename = "pingInterval")]
    ping_interval_ms: u64,
    #[serde(rename = "pingTimeout", default)]
    #[allow(dead_code)]
    ping_timeout_ms: u64,
}

impl KucoinFutAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let bullet: Bullet = self.http
            .post("https://api-futures.kucoin.com/api/v1/bullet-public")
            .send().await?
            .error_for_status()?
            .json().await?;
        let Some(server) = bullet.data.instance_servers.into_iter().next() else {
            return Err(Error::Protocol("kucoin-fut bullet: no instanceServers".into()));
        };
        let connect_id = format!("{}", now_ns());
        let url = format!("{}?token={}&connectId={}",
                          server.endpoint, bullet.data.token, connect_id);
        info!(venue = "kucoin-fut", ping_ms = server.ping_interval_ms, "connecting");

        let uri: Uri = url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Wait welcome.
        let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
        loop {
            tokio::select! {
                m = client.next() => {
                    let Some(m) = m else { return Err(Error::WebSocket("closed pre-welcome".into())); };
                    let m = m.map_err(|e| Error::WebSocket(format!("recv: {}", e)))?;
                    if !m.is_text() { continue; }
                    let text = std::str::from_utf8(m.as_payload())
                        .map_err(|e| Error::Decode(format!("utf8: {}", e)))?;
                    if let Ok(t) = sonic_rs::get(text, &["type"]) {
                        if t.as_str() == Some("welcome") { break; }
                    }
                }
                _ = tokio::time::sleep_until(deadline) => {
                    return Err(Error::Protocol("kucoin-fut welcome timeout".into()));
                }
            }
        }

        // Subscribe: contractMarket/tickerV2:SYM1,SYM2,... (comma-separated, cap 100).
        let syms: Vec<String> = self.universe.per_venue[Venue::KucoinFut.idx()]
            .keys().cloned().collect();
        info!(venue = "kucoin-fut", count = syms.len(), "subscribing");
        for (i, chunk) in syms.chunks(100).enumerate() {
            let topic = format!("/contractMarket/tickerV2:{}", chunk.join(","));
            let sub = format!(
                r#"{{"id":"{id}","type":"subscribe","topic":"{topic}","response":true}}"#,
                id = now_ns().wrapping_add(i as u64),
                topic = topic,
            );
            client.send(Message::text(sub)).await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
            tokio::time::sleep(Duration::from_millis(80)).await;
        }

        let ping_ms = server.ping_interval_ms.max(1000);
        let mut ping_interval = tokio::time::interval(Duration::from_millis(ping_ms));
        let mut last_frame_at = std::time::Instant::now();

        loop {
            tokio::select! {
                _ = ping_interval.tick() => {
                    let p = format!(r#"{{"id":"{}","type":"ping"}}"#, now_ns());
                    client.send(Message::text(p)).await
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

                    let Ok(ty_lv) = sonic_rs::get(text, &["type"]) else { continue };
                    if ty_lv.as_str() != Some("message") { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, ask, bqty, aqty| {
                        if let Some(id) = self.universe.lookup(Venue::KucoinFut, sym) {
                            let ts = now_ns();
                            store.slot(Venue::KucoinFut, id).commit(
                                bid, Qty::from_f64(bqty), ask, Qty::from_f64(aqty), ts
                            );
                            self.stale.cell(Venue::KucoinFut, id).update(ts);
                            Metrics::init().record_ingest(Venue::KucoinFut, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "kucoin-fut: not in universe");
                        }
                    });
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect kucoin-fut".into()));
                }
            }
        }
    }
}

/// tickerV2 frame: `{type:"message",topic:"/contractMarket/tickerV2:XBTUSDTM",
///   subject:"tickerV2",data:{symbol,bestBidPrice,bestBidSize,bestAskPrice,bestAskSize,ts}}`.
fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price, f64, f64),
{
    let sym_lv = sonic_rs::get(json, &["data", "symbol"])
        .map_err(|e| Error::Decode(format!("data.symbol: {}", e)))?;
    let sym = sym_lv.as_str().ok_or_else(|| Error::Decode("symbol not str".into()))?;
    let num = |k: &str| -> f64 {
        sonic_rs::get(json, &["data", k])
            .ok()
            .and_then(|lv| {
                if let Some(s) = lv.as_str() { s.parse::<f64>().ok() }
                else { lv.as_f64() }
            })
            .unwrap_or(0.0)
    };
    let bid = num("bestBidPrice");
    let ask = num("bestAskPrice");
    if bid <= 0.0 || ask <= 0.0 { return Ok(()); }
    let bqty = num("bestBidSize");
    let aqty = num("bestAskSize");
    f(sym, Price::from_f64(bid), Price::from_f64(ask), bqty.max(1.0), aqty.max(1.0));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_kucoin_fut_tickerv2() {
        let js = r#"{"type":"message","topic":"/contractMarket/tickerV2:XBTUSDTM","subject":"tickerV2",
            "data":{"symbol":"XBTUSDTM","bestBidPrice":"77220.5","bestBidSize":10,"bestAskPrice":"77221.5","bestAskSize":15,"ts":1}}"#;
        let mut got: Option<(String, Price, Price)> = None;
        parse_and_apply(js, |s, b, a, _, _| got = Some((s.into(), b, a))).unwrap();
        let (s, b, a) = got.unwrap();
        assert_eq!(s, "XBTUSDTM");
        assert_eq!(b, Price::from_f64(77220.5));
        assert_eq!(a, Price::from_f64(77221.5));
    }
}
