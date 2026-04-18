//! Full-depth book: sorted Vec<Level> per side with pre-allocated capacity.
//!
//! - Bids sorted DESCENDING (best bid = [0]).
//! - Asks sorted ASCENDING  (best ask = [0]).
//! - Insert/update: binary search + in-place memmove.
//! - Zero allocations after warmup (capacity reserved once).
//!
//! Used only on the cold path (slippage estimation, snapshot replay).
//! Top-of-book for hot-path reads lives in `seqlock::TopOfBook`.

use crate::types::{Price, Qty};

pub const MAX_LEVELS: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Level {
    pub px:  Price,
    pub qty: Qty,
}

#[derive(Debug)]
pub struct DepthBook {
    pub bids: Vec<Level>, // descending
    pub asks: Vec<Level>, // ascending
    pub seq:  u64,
}

impl DepthBook {
    pub fn new() -> Self {
        Self {
            bids: Vec::with_capacity(MAX_LEVELS),
            asks: Vec::with_capacity(MAX_LEVELS),
            seq:  0,
        }
    }

    pub fn clear(&mut self) {
        self.bids.clear();
        self.asks.clear();
        self.seq = 0;
    }

    /// Replace entire book (snapshot apply).
    pub fn replace(&mut self, bids: &[Level], asks: &[Level], seq: u64) {
        self.bids.clear();
        self.bids.extend_from_slice(bids);
        self.bids.sort_unstable_by(|a, b| b.px.cmp(&a.px));
        if self.bids.len() > MAX_LEVELS { self.bids.truncate(MAX_LEVELS); }

        self.asks.clear();
        self.asks.extend_from_slice(asks);
        self.asks.sort_unstable_by(|a, b| a.px.cmp(&b.px));
        if self.asks.len() > MAX_LEVELS { self.asks.truncate(MAX_LEVELS); }

        self.seq = seq;
    }

    /// Apply a delta update on the bid side. `qty.0 == 0` = remove level.
    /// Returns true if top-of-book was affected.
    pub fn apply_bid(&mut self, px: Price, qty: Qty) -> bool {
        let was_top = self.bids.first().map(|l| l.px) == Some(px);
        apply_sorted(&mut self.bids, px, qty, true);
        let is_top = was_top || self.bids.first().map(|l| l.px) == Some(px);
        is_top
    }

    /// Apply a delta update on the ask side. Returns true if top-of-book affected.
    pub fn apply_ask(&mut self, px: Price, qty: Qty) -> bool {
        let was_top = self.asks.first().map(|l| l.px) == Some(px);
        apply_sorted(&mut self.asks, px, qty, false);
        let is_top = was_top || self.asks.first().map(|l| l.px) == Some(px);
        is_top
    }

    #[inline]
    pub fn best_bid(&self) -> Option<Level> {
        self.bids.first().copied()
    }

    #[inline]
    pub fn best_ask(&self) -> Option<Level> {
        self.asks.first().copied()
    }
}

impl Default for DepthBook {
    fn default() -> Self { Self::new() }
}

/// Apply a single level. `descending` flags bid-side sort order.
///
/// - qty == 0 → remove level (if present).
/// - px exists → update qty.
/// - px new   → insert at sorted position.
///
/// Vec has pre-allocated capacity MAX_LEVELS; if we exceed that, we drop the
/// farthest-from-top level to keep the invariant (zero alloc after warmup).
fn apply_sorted(v: &mut Vec<Level>, px: Price, qty: Qty, descending: bool) {
    // Binary search by price in sorted order.
    let cmp = |a: &Level| if descending {
        a.px.cmp(&px).reverse() // descending: larger comes first
    } else {
        a.px.cmp(&px)
    };
    match v.binary_search_by(cmp) {
        Ok(idx) => {
            if qty.0 == 0 {
                v.remove(idx);
            } else {
                v[idx].qty = qty;
            }
        }
        Err(idx) => {
            if qty.0 == 0 { return; } // remove of nonexistent level
            if v.len() >= MAX_LEVELS {
                // Full: drop the worst level (end of Vec) if the new one would rank better,
                // else ignore. For descending bids, end = smallest bid; for ascending asks,
                // end = largest ask — both are the "worst" in their side.
                if idx < v.len() {
                    v.pop();
                } else {
                    return;
                }
            }
            v.insert(idx, Level { px, qty });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn l(px: f64, qty: f64) -> Level {
        Level { px: Price::from_f64(px), qty: Qty::from_f64(qty) }
    }

    #[test]
    fn replace_sorts_bids_desc_asks_asc() {
        let mut b = DepthBook::new();
        b.replace(
            &[l(100.0, 1.0), l(102.0, 2.0), l(101.0, 1.5)],
            &[l(103.0, 1.0), l(104.0, 2.0), l(102.5, 1.5)],
            5,
        );
        assert_eq!(b.bids[0].px.to_f64(), 102.0);
        assert_eq!(b.bids[1].px.to_f64(), 101.0);
        assert_eq!(b.bids[2].px.to_f64(), 100.0);
        assert_eq!(b.asks[0].px.to_f64(), 102.5);
        assert_eq!(b.asks[1].px.to_f64(), 103.0);
        assert_eq!(b.asks[2].px.to_f64(), 104.0);
    }

    #[test]
    fn apply_delta_update_and_remove() {
        let mut b = DepthBook::new();
        b.replace(&[l(100.0, 1.0), l(101.0, 1.0)], &[l(102.0, 1.0)], 1);

        // Update qty on existing level.
        b.apply_bid(Price::from_f64(100.0), Qty::from_f64(5.0));
        assert_eq!(b.bids.iter().find(|l| l.px == Price::from_f64(100.0)).unwrap().qty, Qty::from_f64(5.0));

        // Insert a new bid that becomes new top.
        let top = b.apply_bid(Price::from_f64(103.0), Qty::from_f64(2.0));
        assert!(top);
        assert_eq!(b.best_bid().unwrap().px, Price::from_f64(103.0));

        // Remove a level.
        b.apply_bid(Price::from_f64(101.0), Qty::from_f64(0.0));
        assert!(b.bids.iter().find(|l| l.px == Price::from_f64(101.0)).is_none());
    }

    #[test]
    fn apply_ask_insert_in_middle() {
        let mut b = DepthBook::new();
        b.replace(&[], &[l(100.0, 1.0), l(102.0, 1.0)], 1);
        b.apply_ask(Price::from_f64(101.0), Qty::from_f64(5.0));
        assert_eq!(b.asks[0].px.to_f64(), 100.0);
        assert_eq!(b.asks[1].px.to_f64(), 101.0);
        assert_eq!(b.asks[2].px.to_f64(), 102.0);
    }

    #[test]
    fn cap_enforced_no_growth() {
        let mut b = DepthBook::new();
        let cap = b.bids.capacity();
        assert_eq!(cap, MAX_LEVELS);

        for i in 0..MAX_LEVELS * 2 {
            b.apply_bid(Price::from_f64(1000.0 - i as f64), Qty::from_f64(1.0));
        }

        assert!(b.bids.len() <= MAX_LEVELS);
        assert_eq!(b.bids.capacity(), MAX_LEVELS); // no reallocation
    }

    #[test]
    fn remove_of_nonexistent_is_noop() {
        let mut b = DepthBook::new();
        b.apply_bid(Price::from_f64(100.0), Qty::from_f64(0.0));
        assert!(b.bids.is_empty());
    }
}
