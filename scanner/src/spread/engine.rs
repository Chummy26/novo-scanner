//! Spread engine: scans the cross-venue universe every `broadcast_ms` and
//! emits `Opportunity` events when a cross-exchange spread ≥ threshold is
//! detected AND both sides pass the staleness + asymmetry checks.

use std::sync::Arc;

use std::sync::atomic::{AtomicU64, Ordering};

use crate::book::{BookStore, TopOfBookSnapshot};
use crate::broadcast::VolStore;
use crate::discovery::SymbolUniverse;
use crate::spread::staleness::{is_stale_for, StaleState};
use crate::types::{now_ns, Market, SymbolId, Venue, VENUE_COUNT};

/// Per-cycle counters of WHY a candidate opportunity was dropped. Populated
/// by `scan_once` and consumed by the `/api/spread/debug` endpoint.
#[derive(Debug, Default)]
pub struct ScanCounters {
    pub considered: AtomicU64,
    pub emitted: AtomicU64,
    pub dropped_stale: AtomicU64,
    pub dropped_asym: AtomicU64,
    pub dropped_below_threshold: AtomicU64,
    pub dropped_above_max: AtomicU64,
    pub dropped_low_vol: AtomicU64,
    pub dropped_same_exchange: AtomicU64,
    pub dropped_spot_spot: AtomicU64,
    /// Fut→Spot pairings: spot is only valid as the BUY side of a basis arb.
    /// Selling spot cross-exchange requires shorting on the spot venue, which
    /// in practice isn't executable — you don't have the asset there. Counted
    /// separately from spot_spot for observability.
    pub dropped_spot_as_sell: AtomicU64,
    pub dropped_uninit_side: AtomicU64,
}

impl ScanCounters {
    pub fn snapshot(&self) -> serde_json::Value {
        let g = |a: &AtomicU64| a.load(Ordering::Relaxed);
        serde_json::json!({
            "considered":              g(&self.considered),
            "emitted":                 g(&self.emitted),
            "dropped_stale":           g(&self.dropped_stale),
            "dropped_asymmetric":      g(&self.dropped_asym),
            "dropped_below_threshold": g(&self.dropped_below_threshold),
            "dropped_above_max":       g(&self.dropped_above_max),
            "dropped_low_vol":         g(&self.dropped_low_vol),
            "dropped_same_exchange":   g(&self.dropped_same_exchange),
            "dropped_spot_spot":       g(&self.dropped_spot_spot),
            "dropped_spot_as_sell":    g(&self.dropped_spot_as_sell),
            "dropped_uninit_side":     g(&self.dropped_uninit_side),
        })
    }
}

/// Event emitted by the engine. Field names match the frontend WS/REST contract.
///
/// ML routing fields (`symbol_id`, `buy_venue`, `sell_venue`) foram adicionados
/// em M1.7 para que o módulo `crate::ml` possa derivar `RouteId` sem precisar
/// fazer lookup reverso via strings. Não afetam o wire format do broadcast
/// (serialização via `OpportunityDto` continua usando apenas os campos
/// originais — aditivo para o tipo interno, zero impacto no frontend).
#[derive(Debug, Clone)]
pub struct Opportunity {
    pub symbol: String,
    pub current: String,
    pub buy_from: &'static str,
    pub sell_to: &'static str,
    pub buy_type: &'static str,
    pub sell_type: &'static str,
    pub buy_price: f64,
    pub sell_price: f64,
    pub entry_spread: f64,
    pub exit_spread: f64,
    pub buy_vol24: f64,
    pub sell_vol24: f64,
    pub buy_book_age: u64,
    pub sell_book_age: u64,
    // ML routing (M1.7) — tipos fortes para consumo pelo `crate::ml`.
    pub symbol_id: SymbolId,
    pub buy_venue: Venue,
    pub sell_venue: Venue,
}

/// Per-cell (venue, symbol) staleness state. Laid out as [venue][symbol] for
/// contiguous per-venue access during scan.
pub struct StaleTable {
    cells: Box<[StaleState]>,
    n_symbols: u32,
}

impl StaleTable {
    pub fn with_capacity(n_symbols: u32) -> Self {
        let total = (n_symbols as usize) * VENUE_COUNT;
        let mut v: Vec<StaleState> = Vec::with_capacity(total);
        for _ in 0..total {
            v.push(StaleState::new());
        }
        Self {
            cells: v.into_boxed_slice(),
            n_symbols,
        }
    }

    #[inline]
    pub fn cell(&self, venue: Venue, sym: SymbolId) -> &StaleState {
        let i = venue.idx() * (self.n_symbols as usize) + sym.0 as usize;
        &self.cells[i]
    }
}

/// Scan the universe once, populating `out` with detected opportunities.
/// Caller is expected to drain `out` before the next call (zero-alloc pattern:
/// reuse the same Vec across scans, just clear() at the start).
pub fn scan_once(
    universe: &SymbolUniverse,
    store: &BookStore,
    stale: &StaleTable,
    vol: &VolStore,
    threshold_pct: f64,
    max_spread_pct: f64,
    min_vol_usd: f64,
    counters: &ScanCounters,
    out: &mut Vec<Opportunity>,
) {
    scan_once_with_observer(
        universe,
        store,
        stale,
        vol,
        threshold_pct,
        max_spread_pct,
        min_vol_usd,
        counters,
        out,
        |_| {},
    );
}

/// Scan the universe once and also reports every valid route observation to
/// `observe`, including observations below the UI/scanner entry threshold.
///
/// The `out` vector keeps the original scanner semantics: only opportunities
/// with `entry_spread >= threshold_pct` and passing the regular gates are
/// pushed. The observer exists for ML data collection, where future `exit`
/// labels require seeing the route after the entry opportunity has faded.
pub fn scan_once_with_observer<F>(
    universe: &SymbolUniverse,
    store: &BookStore,
    stale: &StaleTable,
    vol: &VolStore,
    threshold_pct: f64,
    max_spread_pct: f64,
    min_vol_usd: f64,
    counters: &ScanCounters,
    out: &mut Vec<Opportunity>,
    mut observe: F,
) where
    F: FnMut(&Opportunity),
{
    let now = now_ns();
    for (i, canonical) in universe.by_id.iter().enumerate() {
        let sym_id = SymbolId(i as u32);
        let coverage = &universe.coverage[i];
        // This single SymbolId may be carried across spot AND perp venues.
        // That's intentional: we want buy-on-spot sell-on-perp (and vice
        // versa) to be detectable as a single cross-market opportunity.

        // Collect the set of valid (non-stale, non-asymmetric) venue snapshots.
        let mut snaps: [(Option<TopOfBookSnapshot>, u64); VENUE_COUNT] =
            std::array::from_fn(|_| (None, 0));

        for v in Venue::ALL {
            if !coverage[v.idx()] {
                continue;
            }
            let slot = store.slot(v, sym_id);
            if slot.is_uninitialized() {
                counters.dropped_uninit_side.fetch_add(1, Ordering::Relaxed);
                continue;
            }
            let st = stale.cell(v, sym_id);
            if is_stale_for(v, st, now) {
                counters.dropped_stale.fetch_add(1, Ordering::Relaxed);
                continue;
            }
            let snap = match slot.read() {
                Some(s) if s.is_valid() => s,
                _ => continue,
            };
            let age = st.age_ms(now);
            snaps[v.idx()] = (Some(snap), age);
        }

        // Try each directed pair (buy from A's ask, sell on B's bid).
        //
        // Business rules on market direction:
        //   1. spot↔spot is excluded — cross-exchange spot arb requires
        //      physically moving the asset between venues.
        //   2. spot can ONLY be the BUY side when paired with a future.
        //      Selling spot cross-exchange would require holding the asset
        //      on the sell venue (to short it or transfer-and-sell), which
        //      isn't executable passively. A `fut_buy → spot_sell` pair is
        //      therefore dropped — the equivalent legitimate direction is
        //      the reverse (`spot_buy → fut_sell`) which will be tested on
        //      another iteration of this loop.
        //   3. fut↔fut across different venues is allowed (cross-exchange
        //      perp basis).
        for buy_v in Venue::ALL {
            let (Some(buy), buy_age) = &snaps[buy_v.idx()] else {
                continue;
            };
            for sell_v in Venue::ALL {
                if sell_v == buy_v {
                    continue;
                }
                if sell_v.as_str() == buy_v.as_str() {
                    counters
                        .dropped_same_exchange
                        .fetch_add(1, Ordering::Relaxed);
                    continue;
                }
                counters.considered.fetch_add(1, Ordering::Relaxed);
                // Rule 1: spot↔spot is excluded.
                if buy_v.market() == Market::Spot && sell_v.market() == Market::Spot {
                    counters.dropped_spot_spot.fetch_add(1, Ordering::Relaxed);
                    continue;
                }
                // Rule 2: spot is only valid as the BUY leg.
                if sell_v.market() == Market::Spot {
                    counters
                        .dropped_spot_as_sell
                        .fetch_add(1, Ordering::Relaxed);
                    continue;
                }
                let (Some(sell), sell_age) = &snaps[sell_v.idx()] else {
                    continue;
                };

                // Asymmetry gate removed in Design B (was CUSUM on
                // inter-arrival times — see staleness.rs header comment).
                // The per-venue `is_stale_for` check above already covers the
                // real-world failure mode (a venue stops emitting).

                let buy_ask = buy.ask_px.to_f64();
                let sell_bid = sell.bid_px.to_f64();
                if buy_ask <= 0.0 || sell_bid <= 0.0 {
                    continue;
                }
                let entry_spread = (sell_bid / buy_ask - 1.0) * 100.0;
                // Sanity clamp before both UI and ML observer. This keeps
                // ticker collisions/corrupt books out of cache and labels.
                if !entry_spread.is_finite() || entry_spread.abs() > max_spread_pct {
                    counters.dropped_above_max.fetch_add(1, Ordering::Relaxed);
                    continue;
                }

                // Volume gate: both legs must have at least `min_vol_usd` of
                // 24h volume. Tolerates 0 on either side only during a
                // cold-start window (first 60s, before vol_poller runs) — by
                // checking > 0 AND < min; a genuine 0 (not yet populated) passes.
                let buy_vol = vol.get(buy_v, sym_id);
                let sell_vol = vol.get(sell_v, sym_id);
                if buy_vol > 0.0 && buy_vol < min_vol_usd {
                    counters.dropped_low_vol.fetch_add(1, Ordering::Relaxed);
                    continue;
                }
                if sell_vol > 0.0 && sell_vol < min_vol_usd {
                    counters.dropped_low_vol.fetch_add(1, Ordering::Relaxed);
                    continue;
                }

                // exit_spread: the reverse trip measured with the SAME
                // denominator as entry_spread (buy_ask). This keeps both
                // metrics on a common base so the invariant |entry| ≤ |exit|
                // holds whenever the market is free of free-lunches —
                // i.e. the scanner cannot produce the algebraic artifact of
                // "|entry| > |exit|" that arises purely from x + 1/x convexity
                // when entry and exit are normalized by different prices.
                //
                // Formula: (buy_bid - sell_ask) / buy_ask × 100.
                // Note this field is purely DISPLAY — it is never used as a
                // filter in the engine (only entry_spread drives emission),
                // so changing the denominator cannot drop any opportunity.
                let exit_spread = (buy.bid_px.to_f64() - sell.ask_px.to_f64()) / buy_ask * 100.0;
                if !exit_spread.is_finite() || exit_spread.abs() > max_spread_pct {
                    counters.dropped_above_max.fetch_add(1, Ordering::Relaxed);
                    continue;
                }

                let opp = Opportunity {
                    symbol: canonical.base.clone(),
                    current: canonical.quote.clone(),
                    buy_from: buy_v.as_str(),
                    sell_to: sell_v.as_str(),
                    buy_type: buy_v.market().as_str(),
                    sell_type: sell_v.market().as_str(),
                    buy_price: buy_ask,
                    sell_price: sell_bid,
                    entry_spread,
                    exit_spread,
                    buy_vol24: buy_vol,
                    sell_vol24: sell_vol,
                    buy_book_age: *buy_age,
                    sell_book_age: *sell_age,
                    // M1.7 — ML routing fields. Vars já em escopo.
                    symbol_id: sym_id,
                    buy_venue: buy_v,
                    sell_venue: sell_v,
                };

                observe(&opp);

                if entry_spread < threshold_pct {
                    counters
                        .dropped_below_threshold
                        .fetch_add(1, Ordering::Relaxed);
                    continue;
                }

                out.push(opp);
                counters.emitted.fetch_add(1, Ordering::Relaxed);
            }
        }
    }
}

pub fn new_stale_table(n_symbols: u32) -> Arc<StaleTable> {
    Arc::new(StaleTable::with_capacity(n_symbols))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{CanonicalPair, Market, Price, Qty};

    fn make_universe() -> SymbolUniverse {
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::new("BTC", "USDT", Market::Spot);
        per_venue[Venue::BinanceSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceSpot,
            raw: "BTCUSDT".into(),
            canonical: btc.clone(),
        });
        per_venue[Venue::MexcSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::MexcSpot,
            raw: "BTCUSDT".into(),
            canonical: btc.clone(),
        });
        SymbolUniverse::from_venue_symbols(per_venue)
    }

    fn make_vol(u: &SymbolUniverse) -> VolStore {
        VolStore::with_capacity(u.len() as u32)
    }

    #[test]
    fn no_opportunity_below_threshold() {
        let u = make_universe();
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);

        // Both venues roughly equal: spread ~0%.
        store.slot(Venue::BinanceSpot, SymbolId(0)).commit(
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            Price::from_f64(100.01),
            Qty::from_f64(1.0),
            now_ns(),
        );
        store.slot(Venue::MexcSpot, SymbolId(0)).commit(
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            Price::from_f64(100.01),
            Qty::from_f64(1.0),
            now_ns(),
        );

        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, &c, &mut out);
        assert!(out.is_empty(), "should find no ops below 0.3% threshold");
    }

    #[test]
    fn spot_vs_spot_is_filtered_out() {
        // Both venues are SPOT — business rule says skip this pair entirely.
        let u = make_universe();
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);

        // Even with a very wide spread, a pure spot↔spot must not be emitted.
        store.slot(Venue::BinanceSpot, SymbolId(0)).commit(
            Price::from_f64(99.9),
            Qty::from_f64(1.0),
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            now_ns(),
        );
        store.slot(Venue::MexcSpot, SymbolId(0)).commit(
            Price::from_f64(105.0),
            Qty::from_f64(1.0),
            Price::from_f64(105.1),
            Qty::from_f64(1.0),
            now_ns(),
        );

        let vol = make_vol(&u);
        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, &c, &mut out);
        assert!(
            out.is_empty(),
            "spot↔spot should be filtered; got {} ops",
            out.len()
        );
    }

    #[test]
    fn cross_market_spot_to_perp_emitted() {
        // BTC-USDT on BinanceSpot and MexcFut — same canonical pair now.
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::of("BTC", "USDT");
        per_venue[Venue::BinanceSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceSpot,
            raw: "BTCUSDT".into(),
            canonical: btc.clone(),
        });
        per_venue[Venue::MexcFut.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::MexcFut,
            raw: "BTC_USDT".into(),
            canonical: btc,
        });
        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);

        let now = now_ns();
        store.slot(Venue::BinanceSpot, SymbolId(0)).commit(
            Price::from_f64(99.9),
            Qty::from_f64(1.0),
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::BinanceSpot, SymbolId(0)).update(now);
        store.slot(Venue::MexcFut, SymbolId(0)).commit(
            Price::from_f64(101.0),
            Qty::from_f64(1.0),
            Price::from_f64(101.1),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::MexcFut, SymbolId(0)).update(now);

        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, &c, &mut out);
        let op = out
            .iter()
            .find(|o| o.buy_from == "binance" && o.sell_to == "mexc")
            .expect("cross-market spot→perp op not emitted");
        assert_eq!(op.buy_type, "SPOT");
        assert_eq!(op.sell_type, "FUTURES");
        assert!(op.entry_spread > 0.9 && op.entry_spread < 1.1);
    }

    #[test]
    fn same_exchange_spot_to_perp_filtered_before_observer() {
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::of("BTC", "USDT");
        per_venue[Venue::BinanceSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceSpot,
            raw: "BTCUSDT".into(),
            canonical: btc.clone(),
        });
        per_venue[Venue::BinanceFut.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceFut,
            raw: "BTCUSDT".into(),
            canonical: btc,
        });
        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);

        let now = now_ns();
        store.slot(Venue::BinanceSpot, SymbolId(0)).commit(
            Price::from_f64(99.9),
            Qty::from_f64(1.0),
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::BinanceSpot, SymbolId(0)).update(now);
        store.slot(Venue::BinanceFut, SymbolId(0)).commit(
            Price::from_f64(101.0),
            Qty::from_f64(1.0),
            Price::from_f64(101.1),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::BinanceFut, SymbolId(0)).update(now);

        let mut out = Vec::new();
        let mut observed = Vec::new();
        let c = ScanCounters::default();
        scan_once_with_observer(
            &u,
            &store,
            &stale,
            &vol,
            0.3,
            30.0,
            0.0,
            &c,
            &mut out,
            |opp| observed.push(opp.clone()),
        );

        assert!(out.is_empty(), "intra-exchange route must not be emitted");
        assert!(
            observed.is_empty(),
            "intra-exchange route must not reach ML observer"
        );
        assert_eq!(
            c.dropped_same_exchange.load(Ordering::Relaxed),
            2,
            "both directed Binance spot/perp routes should be dropped"
        );
    }

    #[test]
    fn exit_spread_outlier_filtered_before_observer() {
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::of("BTC", "USDT");
        per_venue[Venue::BinanceSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceSpot,
            raw: "BTCUSDT".into(),
            canonical: btc.clone(),
        });
        per_venue[Venue::MexcFut.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::MexcFut,
            raw: "BTC_USDT".into(),
            canonical: btc,
        });
        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);

        let now = now_ns();
        store.slot(Venue::BinanceSpot, SymbolId(0)).commit(
            Price::from_f64(1.0),
            Qty::from_f64(1.0),
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::BinanceSpot, SymbolId(0)).update(now);
        store.slot(Venue::MexcFut, SymbolId(0)).commit(
            Price::from_f64(101.0),
            Qty::from_f64(1.0),
            Price::from_f64(200.0),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::MexcFut, SymbolId(0)).update(now);

        let mut out = Vec::new();
        let mut observed = Vec::new();
        let c = ScanCounters::default();
        scan_once_with_observer(
            &u,
            &store,
            &stale,
            &vol,
            0.3,
            30.0,
            0.0,
            &c,
            &mut out,
            |opp| observed.push(opp.clone()),
        );

        assert!(out.is_empty(), "outlier route must not be emitted");
        assert!(
            observed.is_empty(),
            "outlier route must not reach ML observer"
        );
        assert!(
            c.dropped_above_max.load(Ordering::Relaxed) > 0,
            "outlier guard should tick"
        );
    }

    #[test]
    fn observer_sees_cross_market_route_below_threshold_without_emitting() {
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::of("BTC", "USDT");
        per_venue[Venue::BinanceSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceSpot,
            raw: "BTCUSDT".into(),
            canonical: btc.clone(),
        });
        per_venue[Venue::MexcFut.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::MexcFut,
            raw: "BTC_USDT".into(),
            canonical: btc,
        });
        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);

        let now = now_ns();
        store.slot(Venue::BinanceSpot, SymbolId(0)).commit(
            Price::from_f64(99.9),
            Qty::from_f64(1.0),
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::BinanceSpot, SymbolId(0)).update(now);
        store.slot(Venue::MexcFut, SymbolId(0)).commit(
            Price::from_f64(100.1),
            Qty::from_f64(1.0),
            Price::from_f64(100.2),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::MexcFut, SymbolId(0)).update(now);

        let mut out = Vec::new();
        let mut observed = Vec::new();
        let c = ScanCounters::default();
        scan_once_with_observer(
            &u,
            &store,
            &stale,
            &vol,
            0.3,
            100.0,
            0.0,
            &c,
            &mut out,
            |opp| observed.push(opp.clone()),
        );

        assert!(
            out.is_empty(),
            "below-threshold route must not be emitted to UI"
        );
        let op = observed
            .iter()
            .find(|o| o.buy_type == "SPOT" && o.sell_type == "FUTURES")
            .expect("ML observer must still see valid SPOT/FUT route");
        assert!(op.entry_spread > 0.0 && op.entry_spread < 0.3);
    }

    #[test]
    fn spot_as_sell_side_is_rejected() {
        // FUT → SPOT is not executable (requires shorting spot cross-exchange).
        // Set up a scenario where the FUT is on MexcFut (cheap) and SPOT on
        // BinanceSpot (expensive): a naïve scan would emit "buy mexc-fut,
        // sell binance-spot" at ~2.5% spread. The rule must drop it and the
        // counter `dropped_spot_as_sell` must tick.
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::of("BTC", "USDT");
        per_venue[Venue::BinanceSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceSpot,
            raw: "BTCUSDT".into(),
            canonical: btc.clone(),
        });
        per_venue[Venue::MexcFut.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::MexcFut,
            raw: "BTC_USDT".into(),
            canonical: btc,
        });
        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);

        let now = now_ns();
        // MexcFut cheap (~97.5) vs BinanceSpot pricey (~100).
        store.slot(Venue::MexcFut, SymbolId(0)).commit(
            Price::from_f64(97.4),
            Qty::from_f64(1.0),
            Price::from_f64(97.5),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::MexcFut, SymbolId(0)).update(now);
        store.slot(Venue::BinanceSpot, SymbolId(0)).commit(
            Price::from_f64(99.9),
            Qty::from_f64(1.0),
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            now,
        );
        stale.cell(Venue::BinanceSpot, SymbolId(0)).update(now);

        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, &c, &mut out);

        // No opp should have a SPOT sell leg.
        assert!(
            out.iter().all(|o| o.sell_type != "SPOT"),
            "sell leg must never be SPOT; got: {:?}",
            out
        );
        // The fut→spot direction must have been counted as dropped.
        assert!(
            c.dropped_spot_as_sell.load(Ordering::Relaxed) > 0,
            "dropped_spot_as_sell should tick when FUT tries to sell to SPOT"
        );
    }
}
