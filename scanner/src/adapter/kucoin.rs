//! KuCoin Spot WebSocket adapter.
//!
//! Flow:
//!   1. POST https://api.kucoin.com/api/v1/bullet-public (no auth) → token + endpoint + pingInterval + pingTimeout
//!   2. Connect: {endpoint}?token={token}&connectId={uuid}
//!   3. Receive welcome: {"id":"...","type":"welcome"}
//!   4. Subscribe: {"id":"1","type":"subscribe","topic":"/market/ticker:all","response":true}
//!   5. Loop: parse ticker frames; send {"id":"N","type":"ping"} per pingInterval.
//!
//! Token expires in 24h → full reconnect (new token).
//!
//! Per PhD#5 D-13: Pro/UTA API is beta. Classic API is production-safe; by
//! default KuCoin is DISABLED in config. User must flip `kucoin=true` and set
//! `kucoin_mode="classic"` (default) to opt-in.

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

pub struct KucoinAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale:    Arc<crate::spread::engine::StaleTable>,
    pub http:     reqwest::Client,
}

impl KucoinAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale:    Arc<crate::spread::engine::StaleTable>,
    ) -> Self {
        Self {
            universe,
            stale,
            http: reqwest::Client::builder()
                .user_agent("scanner/0.1")
                .timeout(Duration::from_secs(15))
                .build()
                .expect("reqwest client"),
        }
    }
}

#[async_trait]
impl Adapter for KucoinAdapter {
    fn venue(&self) -> Venue { Venue::KucoinSpot }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::STANDARD;
        let mut attempt: u32 = 0;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "kucoin", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

#[derive(Debug, Deserialize)]
struct BulletResp {
    data: BulletData,
}

#[derive(Debug, Deserialize)]
struct BulletData {
    token: String,
    #[serde(rename = "instanceServers")]
    instance_servers: Vec<InstanceServer>,
}

#[derive(Debug, Deserialize)]
struct InstanceServer {
    endpoint: String,
    #[serde(rename = "pingInterval")]
    ping_interval_ms: u64,
    /// Server-declared pong timeout (ms). Retained for future watchdog
    /// tightening — currently we use a fixed 60s silent-disconnect bound.
    #[serde(rename = "pingTimeout")]
    #[allow(dead_code)]
    ping_timeout_ms: u64,
}

impl KucoinAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        // 1. Fetch bullet token.
        let bullet: BulletResp = self.http.post("https://api.kucoin.com/api/v1/bullet-public")
            .send().await?
            .error_for_status()?
            .json().await?;
        let Some(server) = bullet.data.instance_servers.into_iter().next() else {
            return Err(Error::Protocol("bullet-public: no instanceServers".into()));
        };
        let connect_id = format!("{}", now_ns());
        let url = format!("{}?token={}&connectId={}", server.endpoint, bullet.data.token, connect_id);
        info!(venue = "kucoin", ping_ms = server.ping_interval_ms, "connecting via bullet-public");

        let uri: Uri = url.parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect().await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // 2. Wait for welcome.
        let welcome_deadline = tokio::time::Instant::now() + Duration::from_secs(5);
        loop {
            tokio::select! {
                msg = client.next() => {
                    let Some(msg) = msg else { return Err(Error::WebSocket("closed pre-welcome".into())); };
                    let msg = msg.map_err(|e| Error::WebSocket(format!("recv: {}", e)))?;
                    if !msg.is_text() { continue; }
                    let text = std::str::from_utf8(msg.as_payload())
                        .map_err(|e| Error::Decode(format!("utf8: {}", e)))?;
                    if let Ok(t_lv) = sonic_rs::get(text, &["type"]) {
                        if t_lv.as_str() == Some("welcome") { break; }
                    }
                }
                _ = tokio::time::sleep_until(welcome_deadline) => {
                    return Err(Error::Protocol("kucoin: welcome timeout".into()));
                }
            }
        }

        // 3. Subscribe to /market/ticker:all.
        let sub = format!(
            r#"{{"id":"{}","type":"subscribe","topic":"/market/ticker:all","response":true}}"#,
            now_ns()
        );
        client.send(Message::text(sub)).await
            .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;

        // 4. Ping loop + ingest loop.
        // PhD#5: max 1 ping/s. Use server's pingInterval but clamp ≥ 1000ms.
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
                    let Some(ty) = ty_lv.as_str() else { continue };
                    if ty != "message" { continue; }  // skip pong, ack, welcome repeats

                    let Ok(tp_lv) = sonic_rs::get(text, &["topic"]) else { continue };
                    let Some(tp) = tp_lv.as_str() else { continue };
                    if tp != "/market/ticker:all" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |sym, bid, ask| {
                        if let Some(id) = self.universe.lookup(Venue::KucoinSpot, sym) {
                            let ts = now_ns();
                            store.slot(Venue::KucoinSpot, id).commit(
                                bid, Qty::from_f64(1.0), ask, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::KucoinSpot, id).update(ts);
                            Metrics::init().record_ingest(Venue::KucoinSpot, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol = sym, "kucoin: not in universe");
                        }
                    });
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(60)).into()) => {
                    return Err(Error::WebSocket("silent disconnect kucoin".into()));
                }
            }
        }
    }
}

/// Frame: { "type":"message","topic":"/market/ticker:all","subject":"BTC-USDT",
///           "data":{"bestAsk":"42001","bestBid":"41999","price":"42000", ...}}
fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price),
{
    let subj_lv = sonic_rs::get(json, &["subject"])
        .map_err(|e| Error::Decode(format!("subject: {}", e)))?;
    let sym = subj_lv.as_str().ok_or_else(|| Error::Decode("subject not str".into()))?;

    let bid = sonic_rs::get(json, &["data", "bestBid"])
        .map_err(|e| Error::Decode(format!("bestBid: {}", e)))?
        .as_str().ok_or_else(|| Error::Decode("bestBid not str".into()))?
        .parse::<f64>().map_err(|_| Error::Decode("bestBid f64".into()))?;
    let ask = sonic_rs::get(json, &["data", "bestAsk"])
        .map_err(|e| Error::Decode(format!("bestAsk: {}", e)))?
        .as_str().ok_or_else(|| Error::Decode("bestAsk not str".into()))?
        .parse::<f64>().map_err(|_| Error::Decode("bestAsk f64".into()))?;
    f(sym, Price::from_f64(bid), Price::from_f64(ask));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_kucoin_ticker() {
        let js = r#"{
            "type":"message","topic":"/market/ticker:all","subject":"BTC-USDT",
            "data":{"bestAsk":"42001","bestBid":"41999","price":"42000","size":"0.5","time":1}
        }"#;
        let mut got: Option<(String, Price, Price)> = None;
        parse_and_apply(js, |s, b, a| got = Some((s.into(), b, a))).unwrap();
        let (s, b, a) = got.unwrap();
        assert_eq!(s, "BTC-USDT");
        assert_eq!(b, Price::from_f64(41999.0));
        assert_eq!(a, Price::from_f64(42001.0));
    }
}
