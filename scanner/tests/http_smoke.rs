//! Smoke tests for the broadcast HTTP+WS server.
//! Spawns the axum server bound to an ephemeral port and hits each endpoint.

use std::sync::Arc;
use std::time::Duration;

use scanner::book::BookStore;
use scanner::broadcast::server::{serve, BroadcastState};
use scanner::discovery::SymbolUniverse;
use scanner::spread::engine::new_stale_table;
use scanner::types::{Price, Qty, SymbolId, Venue};

fn make_universe() -> Arc<SymbolUniverse> {
    use scanner::discovery::VenueSymbol;
    use scanner::types::{CanonicalPair, Market, VENUE_COUNT};
    let mut per_venue: Vec<Vec<VenueSymbol>> = (0..VENUE_COUNT).map(|_| Vec::new()).collect();
    let btc = CanonicalPair::new("BTC", "USDT", Market::Spot);
    per_venue[Venue::BinanceSpot.idx()].push(VenueSymbol {
        venue: Venue::BinanceSpot, raw: "BTCUSDT".into(), canonical: btc.clone(),
    });
    per_venue[Venue::MexcSpot.idx()].push(VenueSymbol {
        venue: Venue::MexcSpot, raw: "BTCUSDT".into(), canonical: btc,
    });
    Arc::new(SymbolUniverse::from_venue_symbols(per_venue))
}

#[tokio::test]
async fn http_endpoints_are_reachable() {
    // Bind to 0 → let OS pick a free port. Then discover it via axum/tokio
    // Listener API: we bind manually first, then pass that listener to serve.
    // But serve() currently re-binds internally, so we use a conventional
    // non-privileged port likely to be free and tolerate conflicts.
    let port: u16 = 18003;

    let universe = make_universe();
    let n = universe.len() as u32;
    let store = Arc::new(BookStore::with_capacity(n.max(4)));
    let stale = new_stale_table(n.max(4));

    store.slot(Venue::BinanceSpot, SymbolId(0))
        .commit(Price::from_f64(100.0), Qty::from_f64(1.0), Price::from_f64(100.1), Qty::from_f64(1.0), 1);
    stale.cell(Venue::BinanceSpot, SymbolId(0)).update(1);

    use scanner::spread::ScanCounters;
    use scanner::broadcast::VolStore;
    let counters = Arc::new(ScanCounters::default());
    let vol = Arc::new(VolStore::with_capacity(universe.len() as u32 + 4));
    let bstate = BroadcastState::new()
        .with_refs(Arc::clone(&universe), Arc::clone(&store), Arc::clone(&stale),
                   counters, vol);

    let addr = ([127, 0, 0, 1], port);
    tokio::spawn(async move {
        let _ = serve(addr, bstate, None).await;
    });

    // Give the server a moment to bind.
    tokio::time::sleep(Duration::from_millis(500)).await;

    let base = format!("http://127.0.0.1:{}", port);
    let client = reqwest::Client::new();

    // /healthz
    let r = client.get(format!("{}/healthz", base)).send().await.expect("healthz");
    assert!(r.status().is_success());
    assert_eq!(r.text().await.unwrap(), "ok");

    // /api/spread/opportunities (empty by default)
    let r = client.get(format!("{}/api/spread/opportunities", base))
        .send().await.expect("opps");
    assert!(r.status().is_success());
    let body = r.text().await.unwrap();
    assert!(body.starts_with('['), "opportunities not a JSON array: {}", body);

    // /api/spread/status
    let r = client.get(format!("{}/api/spread/status", base)).send().await.expect("status");
    assert!(r.status().is_success());
    let body = r.text().await.unwrap();
    assert!(body.contains("\"venues\""), "status missing venues: {}", body);
    assert!(body.contains("\"totalSymbols\""), "status missing totalSymbols: {}", body);
    assert!(body.contains("\"binance\""), "status should include binance: {}", body);

    // /metrics
    let r = client.get(format!("{}/metrics", base)).send().await.expect("metrics");
    assert!(r.status().is_success());
    let body = r.text().await.unwrap();
    assert!(body.contains("scanner_ws_frames_total")
        || body.contains("# HELP"),
        "metrics body too empty: {}", body);
}
