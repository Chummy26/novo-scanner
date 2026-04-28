//! Bitget Futures (USDT-M perpetuals) WebSocket adapter.
//!
//! The v2 public WS endpoint is shared between spot and futures — the
//! difference is the `instType` parameter in the subscribe args. For
//! futures we pass `"USDT-FUTURES"`.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use sonic_rs::{JsonContainerTrait, JsonValueTrait};
use tracing::{debug, info, warn};

use crate::adapter::reconnect::BackoffPolicy;
use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::config::BitgetMode;
use crate::discovery::SymbolUniverse;
use crate::error::{Error, Result};
use crate::obs::Metrics;
use crate::types::{now_ns, Price, Qty, Venue};

pub struct BitgetFutAdapter {
    pub universe: Arc<SymbolUniverse>,
    pub stale: Arc<crate::spread::engine::StaleTable>,
    pub url: String,
}

impl BitgetFutAdapter {
    pub fn new(
        universe: Arc<SymbolUniverse>,
        stale: Arc<crate::spread::engine::StaleTable>,
        mode: BitgetMode,
    ) -> Self {
        let url = match mode {
            BitgetMode::V2 => "wss://ws.bitget.com/v2/ws/public",
            BitgetMode::V3Uta => "wss://ws.bitget.com/v3/ws/public",
        }
        .to_string();
        Self {
            universe,
            stale,
            url,
        }
    }
}

#[async_trait]
impl Adapter for BitgetFutAdapter {
    fn venue(&self) -> Venue {
        Venue::BitgetFut
    }

    async fn run(&self, store: &BookStore) -> Result<()> {
        let backoff = BackoffPolicy::BITGET;
        let mut attempt = 0u32;
        loop {
            match self.run_once(store).await {
                Ok(()) => attempt = 0,
                Err(e) => {
                    warn!(venue = "bitget-fut", attempt, "run_once failed: {}", e);
                    tokio::time::sleep(backoff.delay(attempt)).await;
                    attempt = attempt.saturating_add(1);
                }
            }
        }
    }
}

impl BitgetFutAdapter {
    async fn run_once(&self, store: &BookStore) -> Result<()> {
        use http::Uri;
        use tokio_websockets::{ClientBuilder, Message};

        let uri: Uri = self
            .url
            .parse()
            .map_err(|e| Error::WebSocket(format!("parse uri: {}", e)))?;
        info!(venue = "bitget-fut", url = %self.url, "connecting");

        let (mut client, _) = ClientBuilder::from_uri(uri)
            .connect()
            .await
            .map_err(|e| Error::WebSocket(format!("connect: {}", e)))?;

        // Subscribe in batches of ≤50 channels per subscribe message.
        let per_venue_map = &self.universe.per_venue[Venue::BitgetFut.idx()];
        let raws: Vec<&String> = per_venue_map.keys().collect();
        info!(venue = "bitget-fut", count = raws.len(), "subscribing");
        for chunk in raws.chunks(50) {
            let args: Vec<String> = chunk
                .iter()
                .map(|raw| {
                    format!(
                        r#"{{"instType":"USDT-FUTURES","channel":"ticker","instId":"{}"}}"#,
                        raw
                    )
                })
                .collect();
            let msg = format!(r#"{{"op":"subscribe","args":[{}]}}"#, args.join(","));
            client
                .send(Message::text(msg))
                .await
                .map_err(|e| Error::WebSocket(format!("subscribe: {}", e)))?;
            tokio::time::sleep(Duration::from_millis(80)).await;
        }

        let mut ping_interval = tokio::time::interval(Duration::from_secs(30));
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

                    let Ok(ch_lv) = sonic_rs::get(text, &["arg", "channel"]) else { continue };
                    let Some(ch) = ch_lv.as_str() else { continue };
                    if ch != "ticker" { continue; }

                    let t0 = std::time::Instant::now();
                    let _ = parse_and_apply(text, |symbol, bid_px, ask_px| {
                        if let Some(sym_id) = self.universe.lookup(Venue::BitgetFut, symbol) {
                            let ts = now_ns();
                            store.slot(Venue::BitgetFut, sym_id).commit(
                                bid_px, Qty::from_f64(1.0), ask_px, Qty::from_f64(1.0), ts
                            );
                            self.stale.cell(Venue::BitgetFut, sym_id).update(ts);
                            Metrics::init().record_ingest(Venue::BitgetFut, t0.elapsed().as_nanos() as u64);
                        } else {
                            debug!(symbol, "bitget-fut: not in universe");
                        }
                    });
                }
                _ = tokio::time::sleep_until((last_frame_at + Duration::from_secs(120)).into()) => {
                    return Err(Error::WebSocket("silent disconnect bitget-fut".into()));
                }
            }
        }
    }
}

fn parse_and_apply<F>(json: &str, f: F) -> Result<()>
where
    F: FnOnce(&str, Price, Price),
{
    let data_lv =
        sonic_rs::get(json, &["data"]).map_err(|e| Error::Decode(format!("data: {}", e)))?;
    let v: sonic_rs::Value = sonic_rs::from_str(data_lv.as_raw_str())
        .map_err(|e| Error::Decode(format!("parse data: {}", e)))?;
    let arr = v
        .as_array()
        .ok_or_else(|| Error::Decode("data not array".into()))?;
    let Some(entry) = arr.iter().next() else {
        return Ok(());
    };
    let obj = entry
        .as_object()
        .ok_or_else(|| Error::Decode("entry not object".into()))?;
    let sym = obj
        .get(&"instId")
        .and_then(|x| x.as_str())
        .ok_or_else(|| Error::Decode("instId".into()))?;
    let bid = obj
        .get(&"bidPr")
        .and_then(|x| x.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let ask = obj
        .get(&"askPr")
        .and_then(|x| x.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    if bid <= 0.0 || ask <= 0.0 {
        return Ok(());
    }
    f(sym, Price::from_f64(bid), Price::from_f64(ask));
    Ok(())
}
