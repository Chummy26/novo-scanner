//! Verificadores de invariantes estruturais do `TradeSetup`.
//!
//! Chamar `verify_tradesetup(&setup)` antes de broadcast / persistência.
//! Em caso de violação, retornar `InvariantError` permite ao caller
//! decidir: rejeitar emissão (abstenção silenciosa) OU aceitar com flag
//! de warning (calibration_status = Degraded).
//!
//! Runtime overhead: ~80 ns/verificação (10 comparações float).

use crate::ml::contract::TradeSetup;

/// Tipos de violação de invariante detectados.
///
/// Cada variante aponta para uma propriedade específica da skill / ADR
/// que foi violada. Mensagens são concatenáveis em logs.
#[derive(Debug, Clone, PartialEq)]
pub enum InvariantError {
    /// `gross_profit_{p10, p25, median, p75, p90, p95}` não é monotônico.
    GrossQuantilesNotMonotonic {
        p10: f32, p25: f32, median: f32, p75: f32, p90: f32, p95: f32,
    },
    /// `enter_at_min <= enter_typical <= enter_peak_p95` violado.
    EnterLevelsNotMonotonic { min: f32, typical: f32, peak: f32 },
    /// `time_to_exit_p05_s <= time_to_exit_median_s <= time_to_exit_p95_s`
    /// violado quando os três quantis existem.
    TimeToExitQuantilesNotMonotonic { p05: u32, median: u32, p95: u32 },
    /// Probabilidade/base-rate fora do intervalo [0, 1].
    ProbabilityOutOfUnitInterval { field: &'static str, value: f32 },
    /// IC 95% não envolve `historical_base_rate_24h` ou lower > upper.
    ConfidenceIntervalInconsistent { p: f32, lo: f32, hi: f32 },
    /// `cluster_rank` não está em [1, cluster_size].
    ClusterRankOutOfRange { size: u8, rank: u8 },
    /// `valid_until <= emitted_at` — janela de validade vazia.
    ValidUntilBeforeEmittedAt { emitted_at: u64, valid_until: u64 },
    /// Algum campo numérico é NaN ou infinito.
    NonFiniteField { field: &'static str, value: f32 },
}

/// Verifica todas as invariantes estruturais do `TradeSetup`.
///
/// Retorna `Err` no primeiro violation detectado. Para diagnóstico
/// completo (múltiplas violações), usar `verify_tradesetup_all`.
pub fn verify_tradesetup(s: &TradeSetup) -> Result<(), InvariantError> {
    // 1. Finitos — filtra NaN/Inf antes de comparações.
    macro_rules! check_finite {
        ($field:ident) => {
            if !s.$field.is_finite() {
                return Err(InvariantError::NonFiniteField {
                    field: stringify!($field),
                    value: s.$field,
                });
            }
        };
    }
    check_finite!(enter_at_min);
    check_finite!(enter_typical);
    check_finite!(enter_peak_p95);
    check_finite!(p_enter_hit);
    check_finite!(exit_at_min);
    check_finite!(exit_typical);
    check_finite!(p_exit_hit_given_enter);
    check_finite!(gross_profit_p10);
    check_finite!(gross_profit_p25);
    check_finite!(gross_profit_median);
    check_finite!(gross_profit_p75);
    check_finite!(gross_profit_p90);
    check_finite!(gross_profit_p95);
    check_finite!(historical_base_rate_24h);

    // 2. Quantis gross monotônicos.
    if !(s.gross_profit_p10 <= s.gross_profit_p25
        && s.gross_profit_p25 <= s.gross_profit_median
        && s.gross_profit_median <= s.gross_profit_p75
        && s.gross_profit_p75 <= s.gross_profit_p90
        && s.gross_profit_p90 <= s.gross_profit_p95)
    {
        return Err(InvariantError::GrossQuantilesNotMonotonic {
            p10: s.gross_profit_p10,
            p25: s.gross_profit_p25,
            median: s.gross_profit_median,
            p75: s.gross_profit_p75,
            p90: s.gross_profit_p90,
            p95: s.gross_profit_p95,
        });
    }

    // 3. Níveis de entry monotônicos.
    if !(s.enter_at_min <= s.enter_typical && s.enter_typical <= s.enter_peak_p95) {
        return Err(InvariantError::EnterLevelsNotMonotonic {
            min: s.enter_at_min,
            typical: s.enter_typical,
            peak: s.enter_peak_p95,
        });
    }

    // 4. Quantis de tempo até saída monotônicos, se existirem.
    match (
        s.time_to_exit_p05_s,
        s.time_to_exit_median_s,
        s.time_to_exit_p95_s,
    ) {
        (Some(p05), Some(median), Some(p95)) => {
            if !(p05 <= median && median <= p95) {
                return Err(InvariantError::TimeToExitQuantilesNotMonotonic {
                    p05,
                    median,
                    p95,
                });
            }
        }
        (None, None, None) => {}
        _ => {
            return Err(InvariantError::NonFiniteField {
                field: "time_to_exit_*",
                value: f32::NAN,
            });
        }
    }

    // 5. Probabilidades/base-rate em [0, 1].
    for (name, v) in [
        ("historical_base_rate_24h", s.historical_base_rate_24h),
        ("p_enter_hit", s.p_enter_hit),
        ("p_exit_hit_given_enter", s.p_exit_hit_given_enter),
    ] {
        if !(0.0..=1.0).contains(&v) {
            return Err(InvariantError::ProbabilityOutOfUnitInterval {
                field: name,
                value: v,
            });
        }
    }

    // 6. IC envolve a base rate histórica.
    let (lo, hi) = s.historical_base_rate_ci;
    if !(lo.is_finite() && hi.is_finite()) {
        return Err(InvariantError::NonFiniteField {
            field: "historical_base_rate_ci",
            value: if lo.is_finite() { hi } else { lo },
        });
    }
    if !(0.0 <= lo && lo <= s.historical_base_rate_24h && s.historical_base_rate_24h <= hi && hi <= 1.0) {
        return Err(InvariantError::ConfidenceIntervalInconsistent {
            p: s.historical_base_rate_24h,
            lo,
            hi,
        });
    }

    // 7. Cluster rank em [1, size].
    if s.cluster_size == 0 || s.cluster_rank == 0 || s.cluster_rank > s.cluster_size {
        return Err(InvariantError::ClusterRankOutOfRange {
            size: s.cluster_size,
            rank: s.cluster_rank,
        });
    }

    // 8. Janela de validade não-vazia.
    if s.valid_until <= s.emitted_at {
        return Err(InvariantError::ValidUntilBeforeEmittedAt {
            emitted_at: s.emitted_at,
            valid_until: s.valid_until,
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::contract::{
        CalibStatus, ReasonKind, RouteId, TradeReason,
    };
    use crate::types::{SymbolId, Venue};

    fn valid() -> TradeSetup {
        TradeSetup {
            route_id: RouteId {
                symbol_id: SymbolId(42),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
            enter_at_min: 1.80,
            enter_typical: 2.00,
            enter_peak_p95: 2.80,
            p_enter_hit: 0.90,
            exit_at_min: -1.20,
            exit_typical: -1.00,
            p_exit_hit_given_enter: 0.85,
            gross_profit_p10: 0.60,
            gross_profit_p25: 0.70,
            gross_profit_median: 1.00,
            gross_profit_p75: 1.50,
            gross_profit_p90: 2.30,
            gross_profit_p95: 2.80,
            historical_base_rate_24h: 0.77,
            historical_base_rate_ci: (0.70, 0.82),
            time_to_exit_p05_s: None,
            time_to_exit_median_s: None,
            time_to_exit_p95_s: None,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: "test".into(),
            },
            model_version: "0.1.0".into(),
            emitted_at: 1_000_000_000_000_000_000,
            valid_until: 1_000_000_150_000_000_000,
        }
    }

    #[test]
    fn valid_setup_passes() {
        assert!(verify_tradesetup(&valid()).is_ok());
    }

    #[test]
    fn detects_non_monotonic_gross_quantiles() {
        let mut s = valid();
        s.gross_profit_p10 = 5.0; // maior que median
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::GrossQuantilesNotMonotonic { .. }));
    }

    #[test]
    fn detects_probability_out_of_range() {
        let mut s = valid();
        s.historical_base_rate_24h = 1.5;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ProbabilityOutOfUnitInterval { .. }));
    }

    #[test]
    fn detects_ci_not_containing_p() {
        let mut s = valid();
        s.historical_base_rate_ci = (0.10, 0.20); // base_rate=0.77 está fora
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ConfidenceIntervalInconsistent { .. }));
    }

    #[test]
    fn detects_nan() {
        let mut s = valid();
        s.historical_base_rate_24h = f32::NAN;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::NonFiniteField { .. }));
    }

    #[test]
    fn detects_cluster_rank_out_of_range() {
        let mut s = valid();
        s.cluster_size = 3;
        s.cluster_rank = 5;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ClusterRankOutOfRange { .. }));
    }

    #[test]
    fn detects_invalid_validity_window() {
        let mut s = valid();
        s.valid_until = s.emitted_at;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ValidUntilBeforeEmittedAt { .. }));
    }

    #[test]
    fn detects_non_monotonic_time_to_exit() {
        let mut s = valid();
        s.time_to_exit_p05_s = Some(9999);
        s.time_to_exit_median_s = Some(100);
        s.time_to_exit_p95_s = Some(200);
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::TimeToExitQuantilesNotMonotonic { .. }));
    }

    #[test]
    fn detects_non_monotonic_enter_levels() {
        let mut s = valid();
        s.enter_at_min = 3.0; // > typical
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::EnterLevelsNotMonotonic { .. }));
    }
}
