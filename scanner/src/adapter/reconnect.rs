//! Reconnection backoff policies (PhD#5: per-venue recommended values).

use std::time::Duration;

#[derive(Debug, Clone, Copy)]
pub struct BackoffPolicy {
    pub initial: Duration,
    pub max: Duration,
    pub factor: f64,
    /// Fractional jitter applied on each attempt; 0.25 = ±25%.
    pub jitter: f64,
}

impl BackoffPolicy {
    pub const IMMEDIATE: Self = Self {
        initial: Duration::from_millis(0),
        max: Duration::from_millis(0),
        factor: 1.0,
        jitter: 0.0,
    };

    pub const STANDARD: Self = Self {
        initial: Duration::from_secs(1),
        max: Duration::from_secs(60),
        factor: 2.0,
        jitter: 0.25,
    };

    pub const BITGET: Self = Self {
        // 3s→60s heuristic (not in official docs per PhD#5 D-17;
        // derived from community SDKs)
        initial: Duration::from_secs(3),
        max: Duration::from_secs(60),
        factor: 2.0,
        jitter: 0.25,
    };

    /// Compute the duration for attempt `n` (0-indexed).
    pub fn delay(&self, attempt: u32) -> Duration {
        if self.initial.is_zero() {
            return Duration::ZERO;
        }
        let base_ms = self.initial.as_millis() as f64 * self.factor.powi(attempt as i32);
        let base = Duration::from_millis(base_ms.min(self.max.as_millis() as f64) as u64);
        if self.jitter == 0.0 {
            return base;
        }
        let rand_factor = 1.0 + pseudo_jitter(attempt) * self.jitter;
        Duration::from_millis((base.as_millis() as f64 * rand_factor) as u64)
    }
}

/// Deterministic jitter in [-1, 1] seeded by attempt number. We use a
/// deterministic hash rather than rand to keep reconnection behavior
/// reproducible in tests. Quality is low but sufficient for spread.
fn pseudo_jitter(n: u32) -> f64 {
    // simple 32-bit hash (xorshift-like)
    let mut x = n.wrapping_mul(2654435761);
    x ^= x >> 16;
    x = x.wrapping_mul(0x7FEB352D);
    x ^= x >> 15;
    // map to [-1, 1]
    (x as i32 as f64) / (i32::MAX as f64)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CloseReason {
    /// Normal close (1000) or going-away (1001): reconnect immediately.
    Normal,
    /// Rate limit: use exponential backoff.
    RateLimit,
    /// Auth error: do not reconnect; alert.
    AuthError,
    /// Silent disconnect detected by watchdog.
    Silent,
    /// Any other (parse error, network error).
    Other,
}

impl CloseReason {
    pub fn should_reconnect(self) -> bool {
        !matches!(self, CloseReason::AuthError)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn immediate_is_zero() {
        assert_eq!(BackoffPolicy::IMMEDIATE.delay(0), Duration::ZERO);
        assert_eq!(BackoffPolicy::IMMEDIATE.delay(10), Duration::ZERO);
    }

    #[test]
    fn standard_grows_then_caps_at_max() {
        let p = BackoffPolicy::STANDARD;
        let d0 = p.delay(0);
        let d5 = p.delay(5);
        let d20 = p.delay(20);
        assert!(d5 > d0);
        assert!(d20.as_secs() <= 60 + 60 / 4); // capped with jitter
    }

    #[test]
    fn auth_error_does_not_reconnect() {
        assert!(!CloseReason::AuthError.should_reconnect());
        assert!(CloseReason::Normal.should_reconnect());
        assert!(CloseReason::RateLimit.should_reconnect());
        assert!(CloseReason::Silent.should_reconnect());
    }
}
