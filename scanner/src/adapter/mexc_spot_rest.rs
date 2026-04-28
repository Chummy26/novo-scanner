//! MEXC Spot adapter via REST polling.
//!
//! MEXC migrated the spot WS feeds to Protobuf-only (`spot@public.*.v3.api.pb`)
//! in August 2025, and the wire tag numbering is not stable enough to rely on
//! without a generated schema from the current .proto. Rather than carry a
//! protobuf-gen build step just for this venue, we poll the REST
//! `/api/v3/ticker/bookTicker` all-symbols endpoint at 1-second cadence. The
//! endpoint returns the entire spot book-ticker snapshot in a single
//! ~120 KB JSON response, which parses with sonic-rs in well under a
//! millisecond.
//!
//! This trades the 100-millisecond push cadence of the WS stream for a
//! 1-second poll — acceptable for spreads ≥ 0.1% which persist for seconds.

use std::sync::Arc;
use std::time::Duration;

use serde::Deserialize;
use sonic_rs::{JsonContainerTrait, JsonValueTrait};
use tracing::{debug, info, warn};

use crate::book::BookStore;
use crate::discovery::SymbolUniverse;
use crate::obs::Metrics;
use crate::spread::engine::StaleTable;
use crate::types::{now_ns, Price, Qty, Venue};

const POLL_INTERVAL: Duration = Duration::from_millis(1000);
const ENDPOINT: &str = "https://api.mexc.com/api/v3/ticker/bookTicker";

pub async fn run(universe: Arc<SymbolUniverse>, stale: Arc<StaleTable>, store: Arc<BookStore>) {
    let http = reqwest::Client::builder()
        .user_agent("scanner/0.1 mexc-spot-rest")
        .timeout(Duration::from_secs(10))
        .build()
        .expect("reqwest client");

    info!(venue = "mexc-spot", "starting REST poller at 1s cadence");
    let mut tick = tokio::time::interval(POLL_INTERVAL);
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    let mut consecutive_fails = 0u32;
    loop {
        tick.tick().await;
        match poll_once(&http, &universe, &stale, &store).await {
            Ok(n) => {
                if consecutive_fails > 0 {
                    info!(
                        venue = "mexc-spot",
                        "recovered after {} failures", consecutive_fails
                    );
                    consecutive_fails = 0;
                }
                debug!(venue = "mexc-spot", updated = n, "poll ok");
            }
            Err(e) => {
                consecutive_fails = consecutive_fails.saturating_add(1);
                if consecutive_fails == 1 || consecutive_fails % 30 == 0 {
                    warn!(
                        venue = "mexc-spot",
                        fails = consecutive_fails,
                        "poll fail: {}",
                        e
                    );
                }
            }
        }
    }
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Entry {
    symbol: String,
    #[serde(rename = "bidPrice", default)]
    bid_price: String,
    #[serde(rename = "askPrice", default)]
    ask_price: String,
    #[serde(rename = "bidQty", default)]
    bid_qty: String,
    #[serde(rename = "askQty", default)]
    ask_qty: String,
}

async fn poll_once(
    http: &reqwest::Client,
    universe: &SymbolUniverse,
    stale: &StaleTable,
    store: &BookStore,
) -> Result<u32, String> {
    let t0 = std::time::Instant::now();
    let resp = http.get(ENDPOINT).send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("http {}", status));
    }
    let text = resp.text().await.map_err(|e| e.to_string())?;

    // MEXC returns EITHER an array of entries OR a single object if `symbol`
    // is passed as query. Here we call with no query so we expect an array.
    let v: sonic_rs::Value = sonic_rs::from_str(&text).map_err(|e| format!("parse: {}", e))?;
    let arr = v.as_array().ok_or("not array")?;

    let ts = now_ns();
    let mut n = 0u32;
    for entry in arr.iter() {
        let obj = match entry.as_object() {
            Some(o) => o,
            None => continue,
        };
        let sym = match obj.get(&"symbol").and_then(|x| x.as_str()) {
            Some(s) => s,
            None => continue,
        };
        let bid_s = obj.get(&"bidPrice").and_then(|x| x.as_str()).unwrap_or("0");
        let ask_s = obj.get(&"askPrice").and_then(|x| x.as_str()).unwrap_or("0");
        let bqty_s = obj.get(&"bidQty").and_then(|x| x.as_str()).unwrap_or("0");
        let aqty_s = obj.get(&"askQty").and_then(|x| x.as_str()).unwrap_or("0");
        let bid = bid_s.parse::<f64>().unwrap_or(0.0);
        let ask = ask_s.parse::<f64>().unwrap_or(0.0);
        if bid <= 0.0 || ask <= 0.0 {
            continue;
        }

        if let Some(sym_id) = universe.lookup(Venue::MexcSpot, sym) {
            store.slot(Venue::MexcSpot, sym_id).commit(
                Price::from_f64(bid),
                Qty::from_f64(bqty_s.parse::<f64>().unwrap_or(0.0)),
                Price::from_f64(ask),
                Qty::from_f64(aqty_s.parse::<f64>().unwrap_or(0.0)),
                ts,
            );
            stale.cell(Venue::MexcSpot, sym_id).update(ts);
            n += 1;
        }
    }
    Metrics::init().record_ingest(Venue::MexcSpot, t0.elapsed().as_nanos() as u64);
    // We suppress the Vec / Entry reference so the compiler keeps the derive.
    let _ = std::marker::PhantomData::<Entry>;
    Ok(n)
}
