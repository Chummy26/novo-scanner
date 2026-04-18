//! Spread engine: scans the cross-venue universe every `broadcast_ms` and
//! emits `Opportunity` events when a cross-exchange spread ≥ threshold is
//! detected AND both sides pass the staleness + asymmetry checks.

use std::sync::Arc;

use std::sync::atomic::{AtomicU64, Ordering};

use crate::book::{BookStore, TopOfBookSnapshot};
use crate::broadcast::VolStore;
use crate::discovery::SymbolUniverse;
use crate::spread::staleness::{is_stale_for, StaleState};
use crate::types::{Market, SymbolId, Venue, VENUE_COUNT, now_ns};

/// Per-cycle counters of WHY a candidate opportunity was dropped. Populated
/// by `scan_once` and consumed by the `/api/spread/debug` endpoint.
#[derive(Debug, Default)]
pub struct ScanCounters {
    pub considered:    AtomicU64,
    pub emitted:       AtomicU64,
    pub dropped_stale: AtomicU64,
    pub dropped_asym:  AtomicU64,
    pub dropped_below_threshold: AtomicU64,
    pub dropped_above_max:       AtomicU64,
    pub dropped_low_vol:         AtomicU64,
    pub dropped_spot_spot:       AtomicU64,
    pub dropped_uninit_side:     AtomicU64,
    /// Venues kicked off a scan because their mid-price deviated from the
    /// cross-venue median. Symptomatic of ticker collisions.
    pub dropped_median_outlier:  AtomicU64,
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
            "dropped_spot_spot":       g(&self.dropped_spot_spot),
            "dropped_uninit_side":     g(&self.dropped_uninit_side),
            "dropped_median_outlier":  g(&self.dropped_median_outlier),
        })
    }
}

/// Event emitted by the engine. Field names match the frontend WS/REST contract.
#[derive(Debug, Clone)]
pub struct Opportunity {
    pub symbol:        String,
    pub buy_from:      &'static str,
    pub sell_to:       &'static str,
    pub buy_type:      &'static str,
    pub sell_type:     &'static str,
    pub buy_price:     f64,
    pub sell_price:    f64,
    pub entry_spread:  f64,
    pub exit_spread:   f64,
    pub buy_vol24:     f64,
    pub sell_vol24:    f64,
    pub buy_book_age:  u64,
    pub sell_book_age: u64,
}

/// Per-cell (venue, symbol) staleness state. Laid out as [venue][symbol] for
/// contiguous per-venue access during scan.
pub struct StaleTable {
    cells:     Box<[StaleState]>,
    n_symbols: u32,
}

impl StaleTable {
    pub fn with_capacity(n_symbols: u32) -> Self {
        let total = (n_symbols as usize) * VENUE_COUNT;
        let mut v: Vec<StaleState> = Vec::with_capacity(total);
        for _ in 0..total { v.push(StaleState::new()); }
        Self {
            cells:     v.into_boxed_slice(),
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
    universe:  &SymbolUniverse,
    store:     &BookStore,
    stale:     &StaleTable,
    vol:       &VolStore,
    threshold_pct: f64,
    max_spread_pct: f64,
    min_vol_usd: f64,
    median_deviation_pct: f64,
    counters:  &ScanCounters,
    out:       &mut Vec<Opportunity>,
) {
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
            if !coverage[v.idx()] { continue; }
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

        // Ticker-collision guard: when ≥3 venues quote this symbol, require
        // each venue's mid to sit within `median_deviation_pct` of the group
        // median. A "SIREN" that's a meme coin on XT/Gate spot and a protocol
        // token on Binance/BingX/Bitget futures will split into two clusters
        // with mid-prices an order of magnitude apart; this cut removes the
        // minority-cluster snapshots for THIS scan without polluting state.
        let populated: Vec<(Venue, f64)> = snaps.iter().enumerate().filter_map(|(i, (s, _))| {
            let s = s.as_ref()?;
            let mid = (s.bid_px.to_f64() + s.ask_px.to_f64()) * 0.5;
            if mid > 0.0 {
                Some((Venue::ALL[i], mid))
            } else { None }
        }).collect();
        if populated.len() >= 3 && median_deviation_pct > 0.0 {
            let mut mids: Vec<f64> = populated.iter().map(|(_, m)| *m).collect();
            mids.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            let median = mids[mids.len() / 2];
            let tol = median_deviation_pct / 100.0;
            for (v, mid) in &populated {
                // Deviation relative to the median — symmetric in log-space
                // but we use a simple relative check because `mid` and
                // `median` are both positive.
                let dev = ((mid / median) - 1.0).abs();
                if dev > tol {
                    snaps[v.idx()] = (None, 0);
                    counters.dropped_median_outlier.fetch_add(1, Ordering::Relaxed);
                }
            }
        }

        // Try each directed pair (buy from A's ask, sell on B's bid).
        // Business rule: at least ONE leg must be futures (PERP). Pure spot↔spot
        // opportunities are excluded.
        for buy_v in Venue::ALL {
            let (Some(buy), buy_age) = &snaps[buy_v.idx()] else { continue };
            for sell_v in Venue::ALL {
                if sell_v == buy_v { continue; }
                counters.considered.fetch_add(1, Ordering::Relaxed);
                // Exclude spot↔spot pairings.
                if buy_v.market() == Market::Spot && sell_v.market() == Market::Spot {
                    counters.dropped_spot_spot.fetch_add(1, Ordering::Relaxed);
                    continue;
                }
                let (Some(sell), sell_age) = &snaps[sell_v.idx()] else { continue };

                // Asymmetry gate removed in Design B (was CUSUM on
                // inter-arrival times — see staleness.rs header comment).
                // The per-venue `is_stale_for` check above already covers the
                // real-world failure mode (a venue stops emitting).

                let buy_ask  = buy.ask_px.to_f64();
                let sell_bid = sell.bid_px.to_f64();
                if buy_ask <= 0.0 || sell_bid <= 0.0 { continue; }
                let entry_spread = (sell_bid / buy_ask - 1.0) * 100.0;
                if entry_spread < threshold_pct {
                    counters.dropped_below_threshold.fetch_add(1, Ordering::Relaxed);
                    continue;
                }
                // Sanity clamp: only cut truly absurd spreads (default 100%).
                // 5–50% spreads are real on illiquid new listings and are
                // intentionally emitted so the trader can decide.
                if entry_spread > max_spread_pct {
                    counters.dropped_above_max.fetch_add(1, Ordering::Relaxed);
                    continue;
                }

                // Volume gate: both legs must have at least `min_vol_usd` of
                // 24h volume. Tolerates 0 on either side only during a
                // cold-start window (first 60s, before vol_poller runs) — by
                // checking > 0 AND < min; a genuine 0 (not yet populated) passes.
                let buy_vol  = vol.get(buy_v,  sym_id);
                let sell_vol = vol.get(sell_v, sym_id);
                if buy_vol  > 0.0 && buy_vol  < min_vol_usd {
                    counters.dropped_low_vol.fetch_add(1, Ordering::Relaxed);
                    continue;
                }
                if sell_vol > 0.0 && sell_vol < min_vol_usd {
                    counters.dropped_low_vol.fetch_add(1, Ordering::Relaxed);
                    continue;
                }

                // exit_spread is the reverse trip (inverse direction).
                let exit_spread = (buy.bid_px.to_f64() / sell.ask_px.to_f64() - 1.0) * 100.0;

                out.push(Opportunity {
                    symbol:       canonical.base.clone(),
                    buy_from:     buy_v.as_str(),
                    sell_to:      sell_v.as_str(),
                    buy_type:     buy_v.market().as_str(),
                    sell_type:    sell_v.market().as_str(),
                    buy_price:    buy_ask,
                    sell_price:   sell_bid,
                    entry_spread,
                    exit_spread,
                    buy_vol24:    buy_vol,
                    sell_vol24:   sell_vol,
                    buy_book_age: *buy_age,
                    sell_book_age:*sell_age,
                });
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
            venue: Venue::BinanceSpot, raw: "BTCUSDT".into(), canonical: btc.clone(),
        });
        per_venue[Venue::MexcSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::MexcSpot, raw: "BTCUSDT".into(), canonical: btc.clone(),
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
        let vol   = make_vol(&u);

        // Both venues roughly equal: spread ~0%.
        store.slot(Venue::BinanceSpot, SymbolId(0))
            .commit(Price::from_f64(100.0), Qty::from_f64(1.0), Price::from_f64(100.01), Qty::from_f64(1.0), now_ns());
        store.slot(Venue::MexcSpot, SymbolId(0))
            .commit(Price::from_f64(100.0), Qty::from_f64(1.0), Price::from_f64(100.01), Qty::from_f64(1.0), now_ns());

        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, 0.0, &c, &mut out);
        assert!(out.is_empty(), "should find no ops below 0.3% threshold");
    }

    #[test]
    fn spot_vs_spot_is_filtered_out() {
        // Both venues are SPOT — business rule says skip this pair entirely.
        let u = make_universe();
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);

        // Even with a very wide spread, a pure spot↔spot must not be emitted.
        store.slot(Venue::BinanceSpot, SymbolId(0))
            .commit(Price::from_f64(99.9), Qty::from_f64(1.0), Price::from_f64(100.0), Qty::from_f64(1.0), now_ns());
        store.slot(Venue::MexcSpot, SymbolId(0))
            .commit(Price::from_f64(105.0), Qty::from_f64(1.0), Price::from_f64(105.1), Qty::from_f64(1.0), now_ns());

        let vol = make_vol(&u);
        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, 0.0, &c, &mut out);
        assert!(out.is_empty(), "spot↔spot should be filtered; got {} ops", out.len());
    }

    #[test]
    fn ticker_collision_filtered_by_median_gate() {
        // BTC on 4 venues ≈ $100; one outlier at $50 (different token sharing
        // the ticker). The outlier must be kicked off by the median gate.
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::of("BTC", "USDT");
        for v in [Venue::BinanceFut, Venue::MexcFut, Venue::GateFut, Venue::BingxFut, Venue::BitgetFut] {
            per_venue[v.idx()].push(crate::discovery::VenueSymbol {
                venue: v, raw: "BTCUSDT".into(), canonical: btc.clone(),
            });
        }
        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);
        let now = now_ns();
        for v in [Venue::BinanceFut, Venue::MexcFut, Venue::GateFut, Venue::BingxFut] {
            store.slot(v, SymbolId(0))
                .commit(Price::from_f64(99.5), Qty::from_f64(1.0), Price::from_f64(100.0), Qty::from_f64(1.0), now);
            stale.cell(v, SymbolId(0)).update(now);
        }
        // Outlier: same ticker, different token → half the price.
        store.slot(Venue::BitgetFut, SymbolId(0))
            .commit(Price::from_f64(49.5), Qty::from_f64(1.0), Price::from_f64(50.0), Qty::from_f64(1.0), now);
        stale.cell(Venue::BitgetFut, SymbolId(0)).update(now);

        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, 50.0, &c, &mut out);
        // The outlier venue (bitget) must not appear in any emitted op.
        assert!(!out.iter().any(|o| o.buy_from == "bitget" || o.sell_to == "bitget"),
                "collision outlier must be removed; got: {:?}", out);
        assert!(c.dropped_median_outlier.load(Ordering::Relaxed) > 0);
    }

    #[test]
    fn cross_market_spot_to_perp_emitted() {
        // BTC-USDT on BinanceSpot and MexcFut — same canonical pair now.
        let mut per_venue: Vec<Vec<crate::discovery::VenueSymbol>> =
            (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        let btc = CanonicalPair::of("BTC", "USDT");
        per_venue[Venue::BinanceSpot.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::BinanceSpot, raw: "BTCUSDT".into(), canonical: btc.clone(),
        });
        per_venue[Venue::MexcFut.idx()].push(crate::discovery::VenueSymbol {
            venue: Venue::MexcFut, raw: "BTC_USDT".into(), canonical: btc,
        });
        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let store = BookStore::with_capacity(u.len() as u32);
        let stale = StaleTable::with_capacity(u.len() as u32);
        let vol = make_vol(&u);

        let now = now_ns();
        store.slot(Venue::BinanceSpot, SymbolId(0))
            .commit(Price::from_f64(99.9), Qty::from_f64(1.0), Price::from_f64(100.0), Qty::from_f64(1.0), now);
        stale.cell(Venue::BinanceSpot, SymbolId(0)).update(now);
        store.slot(Venue::MexcFut, SymbolId(0))
            .commit(Price::from_f64(101.0), Qty::from_f64(1.0), Price::from_f64(101.1), Qty::from_f64(1.0), now);
        stale.cell(Venue::MexcFut, SymbolId(0)).update(now);

        let mut out = Vec::new();
        let c = ScanCounters::default();
        scan_once(&u, &store, &stale, &vol, 0.3, 100.0, 0.0, 0.0, &c, &mut out);
        let op = out.iter().find(|o| o.buy_from == "binance" && o.sell_to == "mexc")
            .expect("cross-market spot→perp op not emitted");
        assert_eq!(op.buy_type,  "SPOT");
        assert_eq!(op.sell_type, "FUTURES");
        assert!(op.entry_spread > 0.9 && op.entry_spread < 1.1);
    }
}
