pub mod adapter;
pub mod book;
pub mod broadcast;
pub mod config;
pub mod decode;
pub mod discovery;
pub mod error;
pub mod normalize;
pub mod obs;
pub mod spread;
pub mod types;

pub use config::Config;
pub use error::{Error, Result};

use std::sync::Arc;
use std::time::Duration;

use tracing::{info, warn};

use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::broadcast::server::BroadcastState;
use crate::broadcast::VolStore;
use crate::discovery::SymbolUniverse;
use crate::spread::engine::{new_stale_table, scan_once, Opportunity, ScanCounters, StaleTable};

/// Top-level entry point. Wires: discovery → book store → adapters →
/// spread engine → broadcast server.
pub async fn run(cfg: Config) -> anyhow::Result<()> {
    obs::Metrics::init();

    // --- Symbol discovery (REST, parallel per-venue) ---
    let http = reqwest::Client::builder()
        .user_agent("scanner/0.1")
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| Error::Other(format!("http client: {}", e)))?;
    let discoverers = discovery::orchestrator::default_discoverers();
    let universe = discovery::orchestrator::discover_all(&cfg.venues, &http, discoverers).await?;
    info!(symbols = universe.len(), "symbol universe ready");

    // --- Book store + staleness table + vol store ---
    let n_symbols = (universe.len() as u32).max(cfg.limits.max_symbols);
    let store = Arc::new(BookStore::with_capacity(n_symbols));
    let stale = new_stale_table(n_symbols);
    let vol   = Arc::new(VolStore::with_capacity(n_symbols));
    info!(n_symbols, "book store + staleness table + vol store allocated");

    // --- Scan counters (shared with /api/spread/debug) ---
    let counters = Arc::new(ScanCounters::default());

    // --- Broadcast state + server ---
    let bstate = BroadcastState::new()
        .with_refs(
            Arc::clone(&universe),
            Arc::clone(&store),
            Arc::clone(&stale),
            Arc::clone(&counters),
            Arc::clone(&vol),
        );
    let addr: std::net::SocketAddr = cfg.bind.parse()
        .map_err(|e| Error::Config(format!("invalid bind {:?}: {}", cfg.bind, e)))?;
    {
        let bs = bstate.clone();
        let frontend = cfg.frontend_dir.clone();
        tokio::spawn(async move {
            if let Err(e) = broadcast::server::serve(addr, bs, frontend).await {
                warn!("broadcast server terminated: {}", e);
            }
        });
    }

    // --- Adapters ---
    spawn_adapters(&cfg, Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol), Arc::clone(&store));

    // --- REST vol poller (fills VolStore for venues whose WS omits 24h vol) ---
    {
        let u = Arc::clone(&universe);
        let v = Arc::clone(&vol);
        tokio::spawn(async move { adapter::vol_poller::run(u, v).await; });
    }

    // --- Spread engine loop (150ms) ---
    let u_engine  = Arc::clone(&universe);
    let s_engine  = Arc::clone(&store);
    let st_engine = Arc::clone(&stale);
    let v_engine  = Arc::clone(&vol);
    let threshold = cfg.entry_threshold_pct;
    let max_spread = cfg.max_spread_pct;
    let min_vol = cfg.min_vol_usd;
    let broadcast_ms = cfg.broadcast_ms;
    let c_engine = Arc::clone(&counters);
    run_spread_engine(u_engine, s_engine, st_engine, v_engine, c_engine, threshold, max_spread, min_vol, broadcast_ms, bstate).await;
    Ok(())
}

fn spawn_adapters(
    cfg:       &Config,
    universe:  Arc<SymbolUniverse>,
    stale:     Arc<StaleTable>,
    vol:       Arc<VolStore>,
    store:     Arc<BookStore>,
) {
    let _ = vol;  // consumed below per-venue where applicable
    use crate::types::Venue;

    if cfg.venues.is_enabled(Venue::BinanceSpot) {
        let a = adapter::binance_spot::BinanceSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("binance-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::GateSpot) {
        let a = adapter::gate_spot::GateSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("gate-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BitgetSpot) {
        let a = adapter::bitget::BitgetAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), cfg.bitget_mode);
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bitget-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BitgetFut) {
        let a = adapter::bitget_fut::BitgetFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), cfg.bitget_mode);
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bitget-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::MexcFut) {
        let a = adapter::mexc_fut::MexcFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("mexc-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::GateFut) {
        let a = adapter::gate_fut::GateFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("gate-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BinanceFut) {
        let a = adapter::binance_fut::BinanceFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("binance-fut adapter exited: {}", e); }
        });
    }
    // (mexc-spot is handled below via REST polling)
    if cfg.venues.is_enabled(Venue::BingxSpot) {
        let a = adapter::bingx_spot::BingxSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("bingx-spot adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::BingxFut) {
        let a = adapter::bingx_fut::BingxFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("bingx-fut adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::XtSpot) {
        let a = adapter::xt_spot::XtSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("xt-spot adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::XtFut) {
        let a = adapter::xt_fut::XtFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("xt-fut adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::KucoinSpot) && cfg.kucoin_mode != crate::config::KucoinMode::Disabled {
        let a = adapter::kucoin::KucoinAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("kucoin-spot adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::KucoinFut) && cfg.kucoin_mode != crate::config::KucoinMode::Disabled {
        let a = adapter::kucoin_fut::KucoinFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("kucoin-fut adapter exited: {}", e); }
        });
    }

    // MEXC spot is a REST-polled adapter (WS is Protobuf-only; REST at 1s
    // gives complete coverage with simpler decode).
    if cfg.venues.is_enabled(Venue::MexcSpot) {
        let u = Arc::clone(&universe);
        let st = Arc::clone(&stale);
        let s = Arc::clone(&store);
        tokio::spawn(async move {
            adapter::mexc_spot_rest::run(u, st, s).await;
        });
    }

    // All 14 venues covered: Binance Spot+Fut, MEXC Spot(REST)+Fut,
    // BingX Spot+Fut, Gate Spot+Fut, KuCoin Spot+Fut, XT Spot+Fut, Bitget Spot+Fut.
}

async fn run_spread_engine(
    universe:      Arc<SymbolUniverse>,
    store:         Arc<BookStore>,
    stale:         Arc<StaleTable>,
    vol:           Arc<VolStore>,
    counters:      Arc<ScanCounters>,
    threshold_pct: f64,
    max_spread_pct: f64,
    min_vol_usd:   f64,
    broadcast_ms:  u64,
    bstate:        BroadcastState,
) {
    let mut buf: Vec<Opportunity> = Vec::with_capacity(1024);
    let mut tick = tokio::time::interval(Duration::from_millis(broadcast_ms));
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        tick.tick().await;
        let t0 = std::time::Instant::now();
        buf.clear();
        scan_once(&universe, &store, &stale, &vol, threshold_pct, max_spread_pct, min_vol_usd, &counters, &mut buf);
        let elapsed_ns = t0.elapsed().as_nanos() as u64;
        obs::Metrics::init().record_cycle(elapsed_ns);

        let count = buf.len();
        if count > 0 {
            obs::Metrics::init().opportunities_total.inc_by(count as u64);
        }
        // Move buf contents into DTOs; reuse allocation on next cycle.
        let snapshot: Vec<Opportunity> = std::mem::take(&mut buf);
        buf = Vec::with_capacity(count.max(1024));
        bstate.publish(snapshot);
    }
}
