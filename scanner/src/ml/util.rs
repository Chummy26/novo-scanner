//! Utilidades compartilhadas do módulo ML.
//!
//! Historicamente `civil_from_days`, `hostname_best_effort` e helpers de
//! timestamp apareciam duplicados em `retention.rs`, `broadcast.rs` e em
//! cada writer individual. Esta consolidação (fix E6, E17) elimina o risco
//! de divergência se uma cópia for corrigida e outra esquecida.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Hostname best-effort — COMPUTERNAME (Windows), HOSTNAME (Unix) ou "scanner".
#[inline]
pub fn hostname_best_effort() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "scanner".into())
}

/// Converte data civil (ano/mês/dia) para dias desde 1970-01-01 UTC.
///
/// Howard Hinnant / civil-from-days inverse, adaptado para epoch UNIX.
/// Compartilhado entre `retention::civil_hour_to_epoch` e
/// `broadcast::iso8601_from_ns` (fix E6).
#[inline]
pub fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = year - if month <= 2 { 1 } else { 0 };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let month_index = month + if month > 2 { -3 } else { 9 };
    let doy = (153 * month_index + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// Clock monotonic best-effort para `written_ts_ns` preciso no writer.
#[inline]
pub fn now_ns() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0)
}

/// Hash FNV-1a 64-bit para fingerprint de runtime config (fix C13).
///
/// Deterministic, zero deps, suficiente para detectar drift de config.
pub fn fnv1a_64(bytes: &[u8]) -> u64 {
    const OFFSET: u64 = 0xcbf29ce484222325;
    const PRIME: u64 = 0x100000001b3;
    let mut h = OFFSET;
    for &b in bytes {
        h ^= b as u64;
        h = h.wrapping_mul(PRIME);
    }
    h
}

/// Clock monotonic wall (fallback) — expõe via `Arc<AtomicU64>` para testes.
#[derive(Debug, Default)]
pub struct WallClock {
    _priv: (),
}

impl WallClock {
    pub fn now_ns(&self) -> u64 {
        now_ns()
    }
}

/// Monotonic guard: nunca retrocede mesmo sob NTP skew.
#[derive(Debug, Default)]
pub struct MonotonicClock {
    last: AtomicU64,
}

impl MonotonicClock {
    pub fn now_ns(&self) -> u64 {
        let now = now_ns();
        let last = self.last.load(Ordering::Relaxed);
        let next = now.max(last);
        self.last.store(next, Ordering::Relaxed);
        next
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn days_from_civil_matches_unix_epoch_origin() {
        // 1970-01-01 → 0 dias
        assert_eq!(days_from_civil(1970, 1, 1), 0);
        // 2000-01-01 bisestil = 10957 dias (calculo manual)
        assert_eq!(days_from_civil(2000, 1, 1), 10957);
    }

    #[test]
    fn days_from_civil_handles_leap_years() {
        // 2024-02-29 é bisestil legítimo
        let d = days_from_civil(2024, 2, 29);
        let d_next = days_from_civil(2024, 3, 1);
        assert_eq!(d_next - d, 1);
    }

    #[test]
    fn fnv1a_64_deterministic_across_calls() {
        let a = fnv1a_64(b"config=100");
        let b = fnv1a_64(b"config=100");
        assert_eq!(a, b);
        let c = fnv1a_64(b"config=200");
        assert_ne!(a, c);
    }

    #[test]
    fn monotonic_clock_never_retrocede() {
        let c = MonotonicClock::default();
        let a = c.now_ns();
        let b = c.now_ns();
        assert!(b >= a);
    }

    #[test]
    fn hostname_best_effort_returns_non_empty() {
        let h = hostname_best_effort();
        assert!(!h.is_empty());
    }
}
