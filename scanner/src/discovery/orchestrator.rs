//! Orchestrates all per-venue discoverers in parallel, building a unified
//! SymbolUniverse with coverage ≥ 2 venues.

use std::sync::Arc;
use std::time::Duration;

use futures::future::join_all;
use tracing::{info, warn};

use crate::config::VenueToggles;
use crate::discovery::{Discoverer, SymbolUniverse, VenueSymbol};
use crate::error::Result;
use crate::types::{Venue, VENUE_COUNT};

/// Build the universe once at startup. Returns an Arc shared by adapters +
/// spread engine.
pub async fn discover_all(
    toggles:    &VenueToggles,
    http:       &reqwest::Client,
    discoverers: Vec<Arc<dyn Discoverer>>,
) -> Result<Arc<SymbolUniverse>> {
    // Run all enabled discoverers in parallel. Per-venue failures log a
    // warning but don't abort — a missing venue just shrinks the universe.
    let futures = discoverers.into_iter().filter_map(|d| {
        if !toggles.is_enabled(d.venue()) {
            return None;
        }
        let http = http.clone();
        Some(async move {
            let v = d.venue();
            match tokio::time::timeout(Duration::from_secs(30), d.fetch(&http)).await {
                Ok(Ok(syms)) => {
                    info!(venue = v.as_str(), mkt = v.market().as_str(),
                          count = syms.len(), "discovery OK");
                    (v, syms)
                }
                Ok(Err(e)) => {
                    warn!(venue = v.as_str(), "discovery failed: {}", e);
                    (v, Vec::new())
                }
                Err(_) => {
                    warn!(venue = v.as_str(), "discovery timeout");
                    (v, Vec::new())
                }
            }
        })
    });

    let results = join_all(futures).await;

    let mut per_venue: Vec<Vec<VenueSymbol>> = (0..VENUE_COUNT).map(|_| Vec::new()).collect();
    for (v, syms) in results {
        per_venue[v.idx()] = syms;
    }

    let universe = SymbolUniverse::from_venue_symbols(per_venue);
    info!(cross_listed = universe.len(), "symbol universe built");
    Ok(Arc::new(universe))
}

/// Build the default set of discoverers for all 14 venues (7 exchanges × spot+fut).
pub fn default_discoverers() -> Vec<Arc<dyn Discoverer>> {
    use crate::discovery::binance::BinanceDiscoverer;
    use crate::discovery::bingx::BingxDiscoverer;
    use crate::discovery::bitget::BitgetDiscoverer;
    use crate::discovery::gate::GateDiscoverer;
    use crate::discovery::kucoin::KucoinDiscoverer;
    use crate::discovery::mexc::MexcDiscoverer;
    use crate::discovery::xt::XtDiscoverer;
    vec![
        Arc::new(BinanceDiscoverer::new(Venue::BinanceSpot)),
        Arc::new(BinanceDiscoverer::new(Venue::BinanceFut)),
        Arc::new(MexcDiscoverer::new(Venue::MexcSpot)),
        Arc::new(MexcDiscoverer::new(Venue::MexcFut)),
        Arc::new(BingxDiscoverer::new(Venue::BingxSpot)),
        Arc::new(BingxDiscoverer::new(Venue::BingxFut)),
        Arc::new(GateDiscoverer::new(Venue::GateSpot)),
        Arc::new(GateDiscoverer::new(Venue::GateFut)),
        Arc::new(KucoinDiscoverer::new(Venue::KucoinSpot)),
        Arc::new(KucoinDiscoverer::new(Venue::KucoinFut)),
        Arc::new(XtDiscoverer::new(Venue::XtSpot)),
        Arc::new(XtDiscoverer::new(Venue::XtFut)),
        Arc::new(BitgetDiscoverer::new(Venue::BitgetSpot)),
        Arc::new(BitgetDiscoverer::new(Venue::BitgetFut)),
    ]
}
