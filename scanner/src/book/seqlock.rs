//! Cache-line-aligned top-of-book seqlock fastpath.
//!
//! Single-writer / many-readers per (venue, symbol). Writer toggles a sequence
//! counter: odd = writing, even = committed. Readers spin until they observe
//! the same even seq before and after reading the payload — this is the
//! classical seqlock pattern (Lameter 2005; Linux kernel seqlock; Amanieu/seqlock).
//!
//! The payload fits entirely within a single 64-byte cache line to avoid
//! false sharing with adjacent symbols' slots when stored in a flat array.

use std::sync::atomic::{AtomicU64, Ordering};

use crate::types::{Price, Qty};

/// Snapshot returned by a successful consistent read.
#[derive(Debug, Clone, Copy)]
pub struct TopOfBookSnapshot {
    pub bid_px: Price,
    pub bid_qty: Qty,
    pub ask_px: Price,
    pub ask_qty: Qty,
    pub seq_ingest: u64,
    pub ts_ns: u64,
}

impl TopOfBookSnapshot {
    #[inline(always)]
    pub fn is_valid(&self) -> bool {
        !self.bid_px.is_zero() && !self.ask_px.is_zero() && self.ask_px >= self.bid_px
    }
}

/// 64-byte cache-aligned seqlock slot. Each symbol × venue gets one of these
/// in a flat array. `#[repr(align(64))]` prevents false sharing with neighbor
/// slots on x86-64 (cache-line size 64B) and aarch64 (also 64B on most cores).
#[repr(align(64))]
pub struct TopOfBook {
    /// Writer-owned sequence counter. Even = committed; odd = write-in-progress.
    seq: AtomicU64,
    bid_px: AtomicU64,
    bid_qty: AtomicU64,
    ask_px: AtomicU64,
    ask_qty: AtomicU64,
    /// Monotonic ingest sequence (unrelated to seqlock seq).
    seq_ingest: AtomicU64,
    /// Client wall-clock ns at commit time.
    ts_ns: AtomicU64,
    _pad: [u8; 0],
}

impl Default for TopOfBook {
    fn default() -> Self {
        Self::new()
    }
}

impl TopOfBook {
    pub const fn new() -> Self {
        Self {
            seq: AtomicU64::new(0),
            bid_px: AtomicU64::new(0),
            bid_qty: AtomicU64::new(0),
            ask_px: AtomicU64::new(0),
            ask_qty: AtomicU64::new(0),
            seq_ingest: AtomicU64::new(0),
            ts_ns: AtomicU64::new(0),
            _pad: [],
        }
    }

    /// Writer-side commit. MUST be called from a single thread per slot
    /// (single-writer invariant). Readers observe either the old or new state,
    /// never a torn read.
    #[inline(always)]
    pub fn commit(&self, bid_px: Price, bid_qty: Qty, ask_px: Price, ask_qty: Qty, ts_ns: u64) {
        // 1. Flip seq to odd (in-progress). Release so readers spinning on even seq
        //    don't observe partial writes from a previous commit.
        let seq = self.seq.load(Ordering::Relaxed);
        let new_seq = seq.wrapping_add(1);
        self.seq.store(new_seq, Ordering::Release);

        // 2. Write payload (Relaxed; the Release on seq above orders these wrt readers
        //    that see the odd seq).
        self.bid_px.store(bid_px.0, Ordering::Relaxed);
        self.bid_qty.store(bid_qty.0, Ordering::Relaxed);
        self.ask_px.store(ask_px.0, Ordering::Relaxed);
        self.ask_qty.store(ask_qty.0, Ordering::Relaxed);
        self.ts_ns.store(ts_ns, Ordering::Relaxed);

        // 3. Increment ingest seq (monotonic external count).
        self.seq_ingest.fetch_add(1, Ordering::Relaxed);

        // 4. Flip seq to even (committed). Release so readers see all stores above.
        self.seq.store(new_seq.wrapping_add(1), Ordering::Release);
    }

    /// Consistent read. Spins until seq is even and unchanged across the read
    /// (single retry pass; caller should budget N retries).
    ///
    /// Returns Some(snapshot) on success; None if the writer churned past the
    /// max retry budget.
    #[inline(always)]
    pub fn read(&self) -> Option<TopOfBookSnapshot> {
        self.read_with_budget(16)
    }

    #[inline(always)]
    pub fn read_with_budget(&self, mut retries: u32) -> Option<TopOfBookSnapshot> {
        loop {
            let s1 = self.seq.load(Ordering::Acquire);
            if s1 & 1 == 1 {
                // Writer in progress.
                if retries == 0 {
                    return None;
                }
                retries -= 1;
                std::hint::spin_loop();
                continue;
            }
            let bid_px = self.bid_px.load(Ordering::Relaxed);
            let bid_qty = self.bid_qty.load(Ordering::Relaxed);
            let ask_px = self.ask_px.load(Ordering::Relaxed);
            let ask_qty = self.ask_qty.load(Ordering::Relaxed);
            let seq_ingest = self.seq_ingest.load(Ordering::Relaxed);
            let ts_ns = self.ts_ns.load(Ordering::Relaxed);
            let s2 = self.seq.load(Ordering::Acquire);
            if s2 == s1 {
                return Some(TopOfBookSnapshot {
                    bid_px: Price(bid_px),
                    bid_qty: Qty(bid_qty),
                    ask_px: Price(ask_px),
                    ask_qty: Qty(ask_qty),
                    seq_ingest,
                    ts_ns,
                });
            }
            if retries == 0 {
                return None;
            }
            retries -= 1;
            std::hint::spin_loop();
        }
    }

    /// Read the raw seq counter without copying payload. Useful for the
    /// cross-venue double-read pattern in the spread engine (read seqA, read A,
    /// read B, re-check seqA).
    #[inline(always)]
    pub fn seq(&self) -> u64 {
        self.seq.load(Ordering::Acquire)
    }

    /// True if no writer has committed yet (fresh slot).
    #[inline(always)]
    pub fn is_uninitialized(&self) -> bool {
        self.seq.load(Ordering::Relaxed) == 0
    }
}

// Safety: TopOfBook uses only atomic ops internally; sharing across threads is
// the whole point. Send+Sync are auto-derived from AtomicU64 fields, but we
// state explicitly for clarity.
unsafe impl Send for TopOfBook {}
unsafe impl Sync for TopOfBook {}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn size_is_cache_line() {
        // The struct must fit in one cache line to avoid false sharing.
        // On both x86-64 and aarch64 common cores, that's 64B.
        assert_eq!(std::mem::align_of::<TopOfBook>(), 64);
        assert!(std::mem::size_of::<TopOfBook>() <= 64);
    }

    #[test]
    fn uninitialized_flag() {
        let t = TopOfBook::new();
        assert!(t.is_uninitialized());
        t.commit(
            Price::from_f64(100.0),
            Qty::from_f64(1.0),
            Price::from_f64(101.0),
            Qty::from_f64(1.0),
            42,
        );
        assert!(!t.is_uninitialized());
    }

    #[test]
    fn commit_and_read() {
        let t = TopOfBook::new();
        t.commit(
            Price::from_f64(42000.50),
            Qty::from_f64(0.25),
            Price::from_f64(42001.00),
            Qty::from_f64(0.30),
            123_456_789,
        );
        let s = t.read().expect("read");
        assert_eq!(s.bid_px, Price::from_f64(42000.50));
        assert_eq!(s.ask_px, Price::from_f64(42001.00));
        assert_eq!(s.bid_qty, Qty::from_f64(0.25));
        assert_eq!(s.ts_ns, 123_456_789);
        assert!(s.is_valid());
        assert_eq!(s.seq_ingest, 1);
    }

    #[test]
    fn ingest_seq_monotonic() {
        let t = TopOfBook::new();
        for i in 1..=100 {
            t.commit(
                Price::from_f64(100.0 + i as f64),
                Qty::from_f64(1.0),
                Price::from_f64(101.0 + i as f64),
                Qty::from_f64(1.0),
                i,
            );
        }
        let s = t.read().unwrap();
        assert_eq!(s.seq_ingest, 100);
    }

    #[test]
    fn concurrent_reader_never_sees_torn_state() {
        let t = Arc::new(TopOfBook::new());
        let stop = Arc::new(AtomicBool::new(false));

        let writer = {
            let t = Arc::clone(&t);
            let stop = Arc::clone(&stop);
            thread::spawn(move || {
                let mut i = 1u64;
                while !stop.load(Ordering::Relaxed) {
                    let bid = 1000 + (i % 100);
                    let ask = bid + 1;
                    t.commit(
                        Price::from_f64(bid as f64),
                        Qty::from_f64(1.0),
                        Price::from_f64(ask as f64),
                        Qty::from_f64(1.0),
                        i,
                    );
                    i = i.wrapping_add(1);
                }
            })
        };

        let reader = {
            let t = Arc::clone(&t);
            let stop = Arc::clone(&stop);
            thread::spawn(move || {
                let mut observed = 0u64;
                let mut valid = 0u64;
                while !stop.load(Ordering::Relaxed) {
                    if let Some(s) = t.read_with_budget(1024) {
                        observed += 1;
                        if s.is_valid() {
                            valid += 1;
                            // Invariant: ask_px == bid_px + fixed 1 unit;
                            // if ever we observe a bid paired with wrong ask,
                            // it is a torn read.
                            let diff = s.ask_px.0 as i64 - s.bid_px.0 as i64;
                            assert_eq!(
                                diff,
                                super::super::super::types::FIXED_POINT_SCALE as i64,
                                "torn read: bid={} ask={}",
                                s.bid_px.to_f64(),
                                s.ask_px.to_f64()
                            );
                        }
                    }
                }
                (observed, valid)
            })
        };

        thread::sleep(std::time::Duration::from_millis(200));
        stop.store(true, Ordering::Relaxed);
        let (observed, valid) = reader.join().unwrap();
        writer.join().unwrap();

        assert!(observed > 100, "reader did far too few reads: {}", observed);
        assert!(valid > 0, "no valid reads observed");
    }
}
