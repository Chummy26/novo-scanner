//! Per-symbol ring buffer of opportunity snapshots.
//!
//! For each symbol, keeps the last N `OpportunityDto` instances the spread
//! engine emitted. The `/api/spread/history/:symbol` endpoint reads this.
//!
//! The ring is a flat `Box<[Slot; N]>` per symbol, guarded by a single
//! atomic head index. Writers are the spread engine (single-threaded).
//! Readers are HTTP handlers (cheap RwLock on the Slot Vec — reads rare).

use std::sync::atomic::{AtomicU32, Ordering};

use ahash::AHashMap;
use parking_lot::Mutex;

use crate::broadcast::contract::OpportunityDto;

const DEFAULT_CAP: usize = 512;

pub struct HistoryStore {
    capacity: usize,
    buckets:  AHashMap<String, Mutex<Ring>>,
}

struct Ring {
    head: AtomicU32,
    slots: Vec<Option<OpportunityDto>>,
}

impl Ring {
    fn new(cap: usize) -> Self {
        Self {
            head: AtomicU32::new(0),
            slots: (0..cap).map(|_| None).collect(),
        }
    }

    fn push(&mut self, o: OpportunityDto) {
        let n = self.slots.len() as u32;
        let h = self.head.load(Ordering::Relaxed);
        self.slots[(h % n) as usize] = Some(o);
        self.head.store(h.wrapping_add(1), Ordering::Relaxed);
    }

    fn snapshot(&self) -> Vec<OpportunityDto> {
        let n = self.slots.len() as u32;
        let h = self.head.load(Ordering::Relaxed);
        let start = if h < n { 0 } else { h - n };
        let mut out = Vec::with_capacity(n as usize);
        let mut i = start;
        while i < h {
            if let Some(x) = &self.slots[(i % n) as usize] {
                out.push(x.clone());
            }
            i = i.wrapping_add(1);
        }
        out
    }
}

impl HistoryStore {
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity: if capacity == 0 { DEFAULT_CAP } else { capacity },
            buckets:  AHashMap::new(),
        }
    }

    /// Ingest a snapshot of current opportunities, appending per-symbol.
    /// If a symbol isn't yet tracked, creates its ring lazily.
    pub fn record_batch(&mut self, ops: &[OpportunityDto]) {
        for op in ops {
            let sym = op.symbol.clone();
            let ring = self.buckets
                .entry(sym)
                .or_insert_with(|| Mutex::new(Ring::new(self.capacity)));
            ring.lock().push(op.clone());
        }
    }

    pub fn history_of(&self, symbol: &str) -> Vec<OpportunityDto> {
        match self.buckets.get(symbol) {
            Some(m) => m.lock().snapshot(),
            None    => Vec::new(),
        }
    }
}

impl Default for HistoryStore {
    fn default() -> Self { Self::new(DEFAULT_CAP) }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn op(sym: &str, entry: f64) -> OpportunityDto {
        OpportunityDto {
            id: format!("{sym}-USDT-binance-spot-gate-future"),
            symbol: sym.into(),
            current: "USDT".into(),
            buy_from: "binance".into(), sell_to: "gate".into(),
            buy_type: "SPOT".into(), sell_type: "FUTURES".into(),
            buy_price: 100.0, sell_price: 100.5,
            entry_spread: entry, exit_spread: -entry,
            buy_vol24: 0.0, sell_vol24: 0.0,
            buy_book_age: 1, sell_book_age: 1,
        }
    }

    #[test]
    fn ring_stays_bounded() {
        let mut h = HistoryStore::new(3);
        for i in 0..10 {
            h.record_batch(&[op("BTC", i as f64)]);
        }
        let seen = h.history_of("BTC");
        assert_eq!(seen.len(), 3);
        // Should contain entries 7, 8, 9.
        let spreads: Vec<_> = seen.iter().map(|x| x.entry_spread).collect();
        assert_eq!(spreads, vec![7.0, 8.0, 9.0]);
    }

    #[test]
    fn history_of_unknown_symbol_is_empty() {
        let h = HistoryStore::new(3);
        assert!(h.history_of("UNKNOWN").is_empty());
    }

    #[test]
    fn separate_symbols_kept_independent() {
        let mut h = HistoryStore::new(10);
        h.record_batch(&[op("BTC", 1.0), op("ETH", 2.0)]);
        h.record_batch(&[op("BTC", 1.5)]);
        assert_eq!(h.history_of("BTC").len(), 2);
        assert_eq!(h.history_of("ETH").len(), 1);
    }
}
