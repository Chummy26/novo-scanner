//! Utilidades compartilhadas do módulo ML.

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

/// Hash FNV-1a 64-bit para fingerprint de runtime config.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn days_from_civil_matches_unix_epoch_origin() {
        assert_eq!(days_from_civil(1970, 1, 1), 0);
        assert_eq!(days_from_civil(2000, 1, 1), 10957);
    }

    #[test]
    fn days_from_civil_handles_leap_years() {
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
    fn hostname_best_effort_returns_non_empty() {
        let h = hostname_best_effort();
        assert!(!h.is_empty());
    }
}
