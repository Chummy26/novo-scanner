//! Per-(venue, symbol) staleness — simplified Design B.
//!
//! Prior iteration tried to infer a per-symbol adaptive threshold via an
//! EWMA-of-inter-arrival + Welford-sigma + CUSUM asymmetry detector. In
//! practice that machinery was:
//!
//! - Degenerate for REST-polled venues (MEXC spot at 1 Hz has near-zero
//!   cadence variance, so the computed threshold collapsed onto the floor).
//! - Over-aggressive for event-driven venues where illiquid symbols have
//!   legitimate multi-minute silences (Gate `spot.tickers` emits only on
//!   trades).
//! - Statistically inconsistent: the Welford accumulator was unweighted
//!   while the mean had an EWMA alpha=0.05 — different implicit windows.
//! - Architecturally wrong for asymmetry detection: CUSUM was applied to
//!   the inter-arrival times of one venue, which is not a meaningful
//!   comparison against another venue's independent cadence distribution.
//!
//! The replacement is a flat per-venue wall-clock threshold, chosen from the
//! venue's publicly documented feed mechanism (push vs pull, typical cadence).
//! A symbol is stale iff more than `threshold_ms` wall-clock has elapsed since
//! we last committed a book update for it on that venue. No sigmas, no CUSUM,
//! no bootstrap: just a single atomic timestamp compared to `now`.
//!
//! Rationale for the numbers in `stale_threshold_ms` below: on every venue
//! we allow silence up to ~3× the venue's nominal cadence, clamped to a
//! lower bound that tolerates a normal altcoin quiet stretch. The arithmetic
//! from the audit (BTC vol ≈ 50% annualised ⇒ ~0.028% expected move per
//! 10-second window) shows that even a 60-second silence only produces
//! ~0.07% phantom spread in 1-sigma — well below our 0.2% entry threshold,
//! so we're comfortable with generous bounds.

use std::sync::atomic::{AtomicU64, Ordering};

use crate::types::Venue;

/// Single-atom per-cell state. Writer (adapter) stores the commit wall-clock.
/// Reader (spread engine) compares against `now`. That's it.
pub struct StaleState {
    last_ts: AtomicU64,
}

impl Default for StaleState {
    fn default() -> Self {
        Self::new()
    }
}

impl StaleState {
    pub const fn new() -> Self {
        Self {
            last_ts: AtomicU64::new(0),
        }
    }

    /// Single-writer per cell — the adapter's parse-apply loop.
    #[inline]
    pub fn update(&self, now_ns: u64) {
        self.last_ts.store(now_ns, Ordering::Relaxed);
    }

    /// Milliseconds since the last book commit on this (venue, symbol).
    /// Returns `u64::MAX` if we've never observed a commit.
    #[inline]
    pub fn age_ms(&self, now_ns: u64) -> u64 {
        let prev = self.last_ts.load(Ordering::Relaxed);
        if prev == 0 {
            return u64::MAX;
        }
        (now_ns.saturating_sub(prev)) / 1_000_000
    }

    /// True when the cell has never been updated (fresh allocation).
    #[inline]
    pub fn is_uninitialized(&self) -> bool {
        self.last_ts.load(Ordering::Relaxed) == 0
    }
}

// Safety: only atomic ops.
unsafe impl Send for StaleState {}
unsafe impl Sync for StaleState {}

/// Per-venue staleness threshold in milliseconds. A book update older than
/// this is treated as stale and excluded from the spread calculation.
///
/// Numbers are anchored to the actual feed mechanism per exchange, NOT to
/// market microstructure assumptions about "normal quote rate":
///
/// | Venue            | Mechanism                                  | Threshold |
/// |------------------|--------------------------------------------|-----------|
/// | Binance Spot     | WS per-symbol bookTicker (event-driven)    |  15 s     |
/// | Binance Fut      | WS `!bookTicker` all-stream (~5s cadence)  |  15 s     |
/// | MEXC Spot        | REST polled at 1 Hz                        |   5 s     |
/// | MEXC Fut         | WS sub.ticker (per-symbol, ~1s)            |  10 s     |
/// | BingX Spot/Fut   | WS per-symbol bookTicker (GZIP)            |  30 s     |
/// | Gate Spot        | WS spot.tickers (TRADE-driven, quiet ok)   |  60 s     |
/// | Gate Fut         | WS futures.tickers `!all`                  |  30 s     |
/// | KuCoin Spot      | WS /market/ticker:all                      |  30 s     |
/// | KuCoin Fut       | WS tickerV2                                |  30 s     |
/// | XT Spot/Fut      | WS depth@{sym},5 (1s push cadence)         |  30 s     |
/// | Bitget Spot/Fut  | WS ticker                                  |  30 s     |
pub const fn stale_threshold_ms(v: Venue) -> u64 {
    match v {
        Venue::BinanceSpot | Venue::BinanceFut => 15_000,
        Venue::MexcSpot => 5_000,
        Venue::MexcFut => 10_000,
        Venue::BingxSpot | Venue::BingxFut => 30_000,
        Venue::GateSpot => 60_000,
        Venue::GateFut => 30_000,
        Venue::KucoinSpot | Venue::KucoinFut => 30_000,
        Venue::XtSpot | Venue::XtFut => 30_000,
        Venue::BitgetSpot | Venue::BitgetFut => 30_000,
    }
}

/// Check whether the cell is stale for its venue at the given wall-clock.
#[inline]
pub fn is_stale_for(venue: Venue, cell: &StaleState, now_ns: u64) -> bool {
    cell.age_ms(now_ns) > stale_threshold_ms(venue)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initial_never_stale() {
        let s = StaleState::new();
        assert!(s.is_uninitialized());
        assert_eq!(s.age_ms(1_000_000_000), u64::MAX);
        // A never-updated cell's is_stale relies on age_ms==MAX, which is >
        // threshold — callers that care should check is_uninitialized first.
    }

    #[test]
    fn fresh_update_not_stale() {
        let s = StaleState::new();
        s.update(1_000_000_000);
        assert!(!is_stale_for(Venue::BinanceSpot, &s, 1_001_000_000)); // 1 ms later
    }

    #[test]
    fn expired_update_is_stale() {
        let s = StaleState::new();
        let t = 10_000_000_000u64; // 10s in ns
        s.update(t);
        // 20s later → exceeds 15s Binance threshold.
        assert!(is_stale_for(Venue::BinanceSpot, &s, t + 20_000_000_000));
        // 10s later → still fresh.
        assert!(!is_stale_for(Venue::BinanceSpot, &s, t + 10_000_000_000));
    }

    #[test]
    fn gate_spot_allows_long_quiet() {
        // Gate spot is event-driven and commonly goes quiet on illiquid pairs.
        let s = StaleState::new();
        let t = 1_000_000_000u64;
        s.update(t);
        // 45 seconds of silence: still fresh under Gate's 60s threshold.
        assert!(!is_stale_for(Venue::GateSpot, &s, t + 45_000_000_000));
        assert!(is_stale_for(Venue::GateSpot, &s, t + 65_000_000_000));
    }

    #[test]
    fn mexc_spot_tight_threshold() {
        // REST polled at 1 Hz. 3s silence = 3 missed polls = stale.
        let s = StaleState::new();
        let t = 1_000_000_000u64;
        s.update(t);
        assert!(!is_stale_for(Venue::MexcSpot, &s, t + 4_000_000_000));
        assert!(is_stale_for(Venue::MexcSpot, &s, t + 6_000_000_000));
    }

    #[test]
    fn age_ms_reports_correctly() {
        let s = StaleState::new();
        s.update(1_000_000_000);
        assert_eq!(s.age_ms(1_500_000_000), 500);
        assert_eq!(s.age_ms(1_000_000_000), 0);
    }
}
