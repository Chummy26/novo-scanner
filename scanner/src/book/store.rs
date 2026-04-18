//! Global BookStore: flat array of TopOfBook slots indexed by (venue, symbol).
//!
//! Layout: slots[venue_idx * n_symbols + symbol_id.0]
//!
//! Rationale (PhD#2): a flat `Box<[TopOfBook; _]>` avoids hashing on the hot
//! path and eliminates shard hot-spotting that would occur with `DashMap`
//! when a hot symbol (BTCUSDT) gets 10k updates/s on Binance. Readers access
//! slots by direct index — ~1ns load vs 80+ ns for a DashMap shard acquire.

use crate::book::seqlock::TopOfBook;
use crate::types::{Venue, SymbolId, VENUE_COUNT};

pub struct BookStore {
    slots: Box<[TopOfBook]>,
    n_symbols: u32,
}

impl BookStore {
    /// Allocate `n_symbols * VENUE_COUNT` TopOfBook slots. Must be called once
    /// at startup after symbol discovery has enumerated the universe.
    pub fn with_capacity(n_symbols: u32) -> Self {
        let total = (n_symbols as usize) * VENUE_COUNT;
        let mut v: Vec<TopOfBook> = Vec::with_capacity(total);
        for _ in 0..total {
            v.push(TopOfBook::new());
        }
        Self {
            slots:     v.into_boxed_slice(),
            n_symbols: n_symbols,
        }
    }

    #[inline(always)]
    pub fn n_symbols(&self) -> u32 {
        self.n_symbols
    }

    #[inline(always)]
    fn idx(&self, venue: Venue, sym: SymbolId) -> usize {
        venue.idx() * (self.n_symbols as usize) + (sym.0 as usize)
    }

    /// Borrow a slot for write (single-writer invariant enforced by caller).
    #[inline(always)]
    pub fn slot(&self, venue: Venue, sym: SymbolId) -> &TopOfBook {
        let i = self.idx(venue, sym);
        debug_assert!(i < self.slots.len(), "slot out of bounds: venue={:?} sym={:?} n={}", venue, sym, self.n_symbols);
        &self.slots[i]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Price, Qty};

    #[test]
    fn store_indexing_is_isolated_per_venue_and_symbol() {
        let s = BookStore::with_capacity(10);

        s.slot(Venue::BinanceSpot, SymbolId(0))
            .commit(Price::from_f64(100.0), Qty::from_f64(1.0), Price::from_f64(101.0), Qty::from_f64(1.0), 1);
        s.slot(Venue::MexcSpot, SymbolId(0))
            .commit(Price::from_f64(200.0), Qty::from_f64(1.0), Price::from_f64(201.0), Qty::from_f64(1.0), 2);
        s.slot(Venue::BinanceSpot, SymbolId(3))
            .commit(Price::from_f64(300.0), Qty::from_f64(1.0), Price::from_f64(301.0), Qty::from_f64(1.0), 3);

        assert_eq!(s.slot(Venue::BinanceSpot, SymbolId(0)).read().unwrap().bid_px.to_f64(), 100.0);
        assert_eq!(s.slot(Venue::MexcSpot,    SymbolId(0)).read().unwrap().bid_px.to_f64(), 200.0);
        assert_eq!(s.slot(Venue::BinanceSpot, SymbolId(3)).read().unwrap().bid_px.to_f64(), 300.0);

        // Uninitialized slots remain so.
        assert!(s.slot(Venue::BingxSpot, SymbolId(0)).is_uninitialized());
        assert!(s.slot(Venue::BinanceSpot, SymbolId(5)).is_uninitialized());
    }

    #[test]
    fn store_total_size_matches_capacity() {
        let s = BookStore::with_capacity(1000);
        // 12 venues × 1000 symbols
        assert_eq!(s.slots.len(), VENUE_COUNT * 1000);
    }
}
