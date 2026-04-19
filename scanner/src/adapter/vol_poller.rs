//! 24h volume poller — fills `VolStore` for venues whose primary ticker WS
//! stream omits 24h stats. Runs every 60 seconds and hits the venue's
//! REST all-tickers endpoint in a single call when available.

use std::sync::Arc;
use std::time::Duration;

use serde::Deserialize;
use tracing::{debug, warn};

use crate::broadcast::VolStore;
use crate::discovery::SymbolUniverse;
use crate::types::Venue;

const POLL_INTERVAL: Duration = Duration::from_secs(60);

pub async fn run(
    universe: Arc<SymbolUniverse>,
    vol:      Arc<VolStore>,
) {
    let http = reqwest::Client::builder()
        .user_agent("scanner/0.1 vol-poller")
        .timeout(Duration::from_secs(15))
        .build()
        .expect("reqwest client");

    // Initial immediate poll, then interval.
    let mut tick = tokio::time::interval(POLL_INTERVAL);
    loop {
        tick.tick().await;
        let u = Arc::clone(&universe);
        let v = Arc::clone(&vol);
        let h = http.clone();
        tokio::spawn(async move {
            tokio::join!(
                poll_binance_spot(&h, &u, &v),
                poll_binance_fut(&h, &u, &v),
                poll_bingx_spot(&h, &u, &v),
                poll_bingx_fut(&h, &u, &v),
                poll_bitget_spot(&h, &u, &v),
                poll_bitget_fut(&h, &u, &v),
                poll_gate_fut(&h, &u, &v),
                poll_kucoin_spot(&h, &u, &v),
                poll_kucoin_fut(&h, &u, &v),
                poll_mexc_spot(&h, &u, &v),
                poll_xt_spot(&h, &u, &v),
                poll_xt_fut(&h, &u, &v),
            );
        });
    }
}

// ---- Binance spot ----
#[derive(Debug, Deserialize)]
struct BinanceTicker { symbol: String, #[serde(rename = "quoteVolume")] quote_vol: String }

async fn poll_binance_spot(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://api.binance.com/api/v3/ticker/24hr").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("binance-spot vol: {}", e); return; } };
    let tickers: Vec<BinanceTicker> = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("binance-spot parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in tickers {
        if let Some(id) = u.lookup(Venue::BinanceSpot, &t.symbol) {
            if let Ok(qv) = t.quote_vol.parse::<f64>() {
                if qv > 0.0 { v.set(Venue::BinanceSpot, id, qv); n += 1; }
            }
        }
    }
    debug!(updated = n, "binance-spot vol ok");
}

async fn poll_binance_fut(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://fapi.binance.com/fapi/v1/ticker/24hr").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("binance-fut vol: {}", e); return; } };
    let tickers: Vec<BinanceTicker> = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("binance-fut parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in tickers {
        if let Some(id) = u.lookup(Venue::BinanceFut, &t.symbol) {
            if let Ok(qv) = t.quote_vol.parse::<f64>() {
                if qv > 0.0 { v.set(Venue::BinanceFut, id, qv); n += 1; }
            }
        }
    }
    debug!(updated = n, "binance-fut vol ok");
}

// ---- BingX ----
#[derive(Debug, Deserialize)]
struct BingxResp<T> { data: T }
#[derive(Debug, Deserialize)]
struct BingxTicker { symbol: String, #[serde(rename = "quoteVolume", default)] quote_vol: serde_json::Value }

fn bingx_qvol(v: &serde_json::Value) -> f64 {
    match v {
        serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
        serde_json::Value::String(s) => s.parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}

async fn poll_bingx_spot(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    // BingX spot: GET /openApi/spot/v1/ticker/24hr (returns array under data).
    // Despite being a public endpoint, the v1 `ticker/24hr` route now rejects
    // requests without a `timestamp` query parameter (code 100400).
    let ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis()).unwrap_or(0);
    let url = format!("https://open-api.bingx.com/openApi/spot/v1/ticker/24hr?timestamp={}", ms);
    let r = http.get(&url).send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("bingx-spot vol: {}", e); return; } };
    let wrap: BingxResp<Vec<BingxTicker>> = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("bingx-spot parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in wrap.data {
        if let Some(id) = u.lookup(Venue::BingxSpot, &t.symbol) {
            let qv = bingx_qvol(&t.quote_vol);
            if qv > 0.0 { v.set(Venue::BingxSpot, id, qv); n += 1; }
        }
    }
    debug!(updated = n, "bingx-spot vol ok");
}

async fn poll_bingx_fut(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://open-api.bingx.com/openApi/swap/v2/quote/ticker").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("bingx-fut vol: {}", e); return; } };
    let wrap: BingxResp<Vec<BingxTicker>> = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("bingx-fut parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in wrap.data {
        if let Some(id) = u.lookup(Venue::BingxFut, &t.symbol) {
            let qv = bingx_qvol(&t.quote_vol);
            if qv > 0.0 { v.set(Venue::BingxFut, id, qv); n += 1; }
        }
    }
    debug!(updated = n, "bingx-fut vol ok");
}

// ---- Bitget ----
#[derive(Debug, Deserialize)]
struct BitgetWrap { data: Vec<BitgetTicker> }
#[derive(Debug, Deserialize)]
struct BitgetTicker {
    symbol: String,
    #[serde(default, rename = "quoteVolume")]
    quote_vol: String,
    #[serde(default, rename = "usdtVolume")]
    usdt_vol: String,
}

async fn poll_bitget_spot(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://api.bitget.com/api/v2/spot/market/tickers").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("bitget spot vol: {}", e); return; } };
    let wrap: BitgetWrap = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("bitget spot parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in wrap.data {
        if let Some(id) = u.lookup(Venue::BitgetSpot, &t.symbol) {
            let qv = t.usdt_vol.parse::<f64>().ok()
                .or_else(|| t.quote_vol.parse::<f64>().ok())
                .unwrap_or(0.0);
            if qv > 0.0 { v.set(Venue::BitgetSpot, id, qv); n += 1; }
        }
    }
    debug!(updated = n, "bitget-spot vol ok");
}

async fn poll_bitget_fut(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://api.bitget.com/api/v2/mix/market/tickers?productType=usdt-futures")
        .send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("bitget-fut vol: {}", e); return; } };
    let wrap: BitgetWrap = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("bitget-fut parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in wrap.data {
        if let Some(id) = u.lookup(Venue::BitgetFut, &t.symbol) {
            let qv = t.usdt_vol.parse::<f64>().ok()
                .or_else(|| t.quote_vol.parse::<f64>().ok())
                .unwrap_or(0.0);
            if qv > 0.0 { v.set(Venue::BitgetFut, id, qv); n += 1; }
        }
    }
    debug!(updated = n, "bitget-fut vol ok");
}

// ---- KuCoin ----
#[derive(Debug, Deserialize)]
struct KucoinSpotResp { data: KucoinSpotData }
#[derive(Debug, Deserialize)]
struct KucoinSpotData { ticker: Vec<KucoinSpotTicker> }
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KucoinSpotTicker {
    symbol: String,
    #[serde(default)]
    vol_value: String,  // quote-currency 24h volume
}

async fn poll_kucoin_spot(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://api.kucoin.com/api/v1/market/allTickers").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("kucoin spot vol: {}", e); return; } };
    let wrap: KucoinSpotResp = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("kucoin spot parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in wrap.data.ticker {
        if let Some(id) = u.lookup(Venue::KucoinSpot, &t.symbol) {
            if let Ok(qv) = t.vol_value.parse::<f64>() {
                if qv > 0.0 { v.set(Venue::KucoinSpot, id, qv); n += 1; }
            }
        }
    }
    debug!(updated = n, "kucoin-spot vol ok");
}

#[derive(Debug, Deserialize)]
struct KucoinFutResp { data: Vec<KucoinFutTicker> }
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KucoinFutTicker {
    symbol: String,
    #[serde(default)]
    turnover_of24h: serde_json::Value,
    #[serde(default)]
    volume_of24h:  serde_json::Value,
}

async fn poll_kucoin_fut(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://api-futures.kucoin.com/api/v1/contracts/active").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("kucoin fut vol: {}", e); return; } };
    let wrap: KucoinFutResp = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("kucoin fut parse: {}", e); return; }
    };
    let to_f = |x: &serde_json::Value| -> f64 {
        match x {
            serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
            serde_json::Value::String(s) => s.parse::<f64>().unwrap_or(0.0),
            _ => 0.0,
        }
    };
    let mut n = 0u32;
    for t in wrap.data {
        if let Some(id) = u.lookup(Venue::KucoinFut, &t.symbol) {
            let qv = {
                let turnover = to_f(&t.turnover_of24h);
                if turnover > 0.0 { turnover } else { to_f(&t.volume_of24h) }
            };
            if qv > 0.0 { v.set(Venue::KucoinFut, id, qv); n += 1; }
        }
    }
    debug!(updated = n, "kucoin-fut vol ok");
}

// ---- MEXC spot (we don't have a WS volume path for spot; poll REST) ----
async fn poll_mexc_spot(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    #[derive(Debug, Deserialize)]
    struct T { symbol: String, #[serde(rename = "quoteVolume", default)] qv: String }
    let r = http.get("https://api.mexc.com/api/v3/ticker/24hr").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("mexc spot vol: {}", e); return; } };
    let ts: Vec<T> = match r.json().await {
        Ok(v) => v, Err(e) => { debug!("mexc spot parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in ts {
        if let Some(id) = u.lookup(Venue::MexcSpot, &t.symbol) {
            if let Ok(qv) = t.qv.parse::<f64>() {
                if qv > 0.0 { v.set(Venue::MexcSpot, id, qv); n += 1; }
            }
        }
    }
    debug!(updated = n, "mexc-spot vol ok");
}

// ---- Gate futures ----
#[derive(Debug, Deserialize)]
struct GateFutTicker {
    contract: String,
    #[serde(default)]
    volume_24h_usd:  String,
    #[serde(default)]
    volume_24h_quote: String,
}

async fn poll_gate_fut(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://api.gateio.ws/api/v4/futures/usdt/tickers").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("gate-fut vol: {}", e); return; } };
    let tickers: Vec<GateFutTicker> = match r.json().await {
        Ok(v) => v, Err(e) => { warn!("gate-fut parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in tickers {
        if let Some(id) = u.lookup(Venue::GateFut, &t.contract) {
            let qv = t.volume_24h_usd.parse::<f64>().ok()
                .or_else(|| t.volume_24h_quote.parse::<f64>().ok())
                .unwrap_or(0.0);
            if qv > 0.0 { v.set(Venue::GateFut, id, qv); n += 1; }
        }
    }
    debug!(updated = n, "gate-fut vol ok");
}

// ---- XT spot + fut (WS depth channel carries no 24h volume, so we REST it) ----
#[derive(Debug, Deserialize)]
struct XtSpotResp { result: Vec<XtSpotTicker> }
#[derive(Debug, Deserialize)]
struct XtSpotTicker {
    #[serde(default)] s: String,
    // `v` is quote-currency 24h volume in XT's v4 spot schema.
    #[serde(default)] v: String,
}

async fn poll_xt_spot(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    let r = http.get("https://sapi.xt.com/v4/public/ticker/24h").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("xt-spot vol: {}", e); return; } };
    let wrap: XtSpotResp = match r.json().await {
        Ok(w) => w, Err(e) => { debug!("xt-spot parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in wrap.result {
        if let Some(id) = u.lookup(Venue::XtSpot, &t.s) {
            if let Ok(qv) = t.v.parse::<f64>() {
                if qv > 0.0 { v.set(Venue::XtSpot, id, qv); n += 1; }
            }
        }
    }
    debug!(updated = n, "xt-spot vol ok");
}

#[derive(Debug, Deserialize)]
struct XtFutResp { result: Vec<XtFutTicker> }
#[derive(Debug, Deserialize)]
struct XtFutTicker {
    #[serde(default)] s: String,
    // `v` is quote-currency 24h volume (USDT) on XT perp ticker.
    #[serde(default)] v: String,
}

async fn poll_xt_fut(http: &reqwest::Client, u: &SymbolUniverse, v: &VolStore) {
    // `/q/tickers` (plural) returns ALL contracts; `/q/ticker` (singular)
    // requires `?symbol=X` and rejects with `invalid_symbol` otherwise.
    let r = http.get("https://fapi.xt.com/future/market/v1/public/q/tickers").send().await;
    let r = match r { Ok(r) => r, Err(e) => { debug!("xt-fut vol: {}", e); return; } };
    let wrap: XtFutResp = match r.json().await {
        Ok(w) => w, Err(e) => { debug!("xt-fut parse: {}", e); return; }
    };
    let mut n = 0u32;
    for t in wrap.result {
        if let Some(id) = u.lookup(Venue::XtFut, &t.s) {
            if let Ok(qv) = t.v.parse::<f64>() {
                if qv > 0.0 { v.set(Venue::XtFut, id, qv); n += 1; }
            }
        }
    }
    debug!(updated = n, "xt-fut vol ok");
}
