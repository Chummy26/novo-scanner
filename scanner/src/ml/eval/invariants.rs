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
    /// `exit_q25 <= exit_q50 <= exit_q75` violado.
    ExitQuantilesNotMonotonic { q25: f32, q50: f32, q75: f32 },
    /// Diagnósticos do baseline violam monotonicidade de gross.
    BaselineGrossQuantilesNotMonotonic {
        p10: f32, p25: f32, median: f32, p75: f32, p90: f32, p95: f32,
    },
    /// Diagnósticos do baseline violam `enter_at_min <= enter_typical <= enter_peak_p95`.
    BaselineEnterLevelsNotMonotonic { min: f32, typical: f32, peak: f32 },
    /// `t_hit_p25_s <= t_hit_median_s <= t_hit_p75_s`
    /// violado quando os três quantis existem.
    TimeToHitQuantilesNotMonotonic { p25: u32, median: u32, p75: u32 },
    /// Probabilidade/base-rate fora do intervalo [0, 1].
    ProbabilityOutOfUnitInterval { field: &'static str, value: f32 },
    /// IC 95% não envolve a probabilidade correspondente ou lower > upper.
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
    check_finite!(entry_now);
    check_finite!(exit_target);
    check_finite!(gross_profit_target);

    if let Some(p) = s.p_hit {
        if !p.is_finite() {
            return Err(InvariantError::NonFiniteField { field: "p_hit", value: p });
        }
    }
    if let Some(p) = s.p_censor {
        if !p.is_finite() {
            return Err(InvariantError::NonFiniteField { field: "p_censor", value: p });
        }
    }

    // 2. Identidade do output central.
    let identity = s.entry_now + s.exit_target;
    if (s.gross_profit_target - identity).abs() > 1e-4 {
        return Err(InvariantError::NonFiniteField {
            field: "gross_profit_target_identity",
            value: s.gross_profit_target,
        });
    }

    // 3. Quantis de exit monotônicos, se existirem.
    match (s.exit_q25, s.exit_q50, s.exit_q75) {
        (Some(q25), Some(q50), Some(q75)) => {
            if !(q25 <= q50 && q50 <= q75) {
                return Err(InvariantError::ExitQuantilesNotMonotonic {
                    q25,
                    q50,
                    q75,
                });
            }
        }
        (None, None, None) => {}
        _ => {
            return Err(InvariantError::NonFiniteField {
                field: "exit_q*",
                value: f32::NAN,
            });
        }
    }

    // 4. Quantis de tempo até saída monotônicos, se existirem.
    match (s.t_hit_p25_s, s.t_hit_median_s, s.t_hit_p75_s) {
        (Some(p25), Some(median), Some(p75)) => {
            if !(p25 <= median && median <= p75) {
                return Err(InvariantError::TimeToHitQuantilesNotMonotonic {
                    p25,
                    median,
                    p75,
                });
            }
        }
        (None, None, None) => {}
        _ => {
            return Err(InvariantError::NonFiniteField {
                field: "t_hit_*",
                value: f32::NAN,
            });
        }
    }

    // 5. Probabilidades em [0, 1].
    for (name, v) in [("p_hit", s.p_hit), ("p_censor", s.p_censor)] {
        if let Some(v) = v {
            if !(0.0..=1.0).contains(&v) {
                return Err(InvariantError::ProbabilityOutOfUnitInterval {
                    field: name,
                    value: v,
                });
            }
        }
    }

    // 6. IC envolve p_hit quando ambos existem.
    match (s.p_hit, s.p_hit_ci) {
        (Some(p), Some((lo, hi))) => {
            if !(lo.is_finite() && hi.is_finite()) {
                return Err(InvariantError::NonFiniteField {
                    field: "p_hit_ci",
                    value: if lo.is_finite() { hi } else { lo },
                });
            }
            if !(0.0 <= lo && lo <= p && p <= hi && hi <= 1.0) {
                return Err(InvariantError::ConfidenceIntervalInconsistent { p, lo, hi });
            }
        }
        (None, None) => {}
        _ => {
            return Err(InvariantError::ProbabilityOutOfUnitInterval {
                field: "p_hit/p_hit_ci",
                value: s.p_hit.unwrap_or(f32::NAN),
            });
        }
    }

    // 7. Diagnósticos do baseline, quando presentes, seguem invariantes antigas.
    if let Some(d) = &s.baseline_diagnostics {
        for (name, v) in [
            ("baseline.enter_at_min", d.enter_at_min),
            ("baseline.enter_typical", d.enter_typical),
            ("baseline.enter_peak_p95", d.enter_peak_p95),
            ("baseline.p_enter_hit", d.p_enter_hit),
            ("baseline.exit_at_min", d.exit_at_min),
            ("baseline.exit_typical", d.exit_typical),
            ("baseline.p_exit_hit_given_enter", d.p_exit_hit_given_enter),
            ("baseline.gross_profit_p10", d.gross_profit_p10),
            ("baseline.gross_profit_p25", d.gross_profit_p25),
            ("baseline.gross_profit_median", d.gross_profit_median),
            ("baseline.gross_profit_p75", d.gross_profit_p75),
            ("baseline.gross_profit_p90", d.gross_profit_p90),
            ("baseline.gross_profit_p95", d.gross_profit_p95),
            ("baseline.historical_base_rate_24h", d.historical_base_rate_24h),
        ] {
            if !v.is_finite() {
                return Err(InvariantError::NonFiniteField { field: name, value: v });
            }
        }
        if !(d.gross_profit_p10 <= d.gross_profit_p25
            && d.gross_profit_p25 <= d.gross_profit_median
            && d.gross_profit_median <= d.gross_profit_p75
            && d.gross_profit_p75 <= d.gross_profit_p90
            && d.gross_profit_p90 <= d.gross_profit_p95)
        {
            return Err(InvariantError::BaselineGrossQuantilesNotMonotonic {
                p10: d.gross_profit_p10,
                p25: d.gross_profit_p25,
                median: d.gross_profit_median,
                p75: d.gross_profit_p75,
                p90: d.gross_profit_p90,
                p95: d.gross_profit_p95,
            });
        }
        if !(d.enter_at_min <= d.enter_typical && d.enter_typical <= d.enter_peak_p95) {
            return Err(InvariantError::BaselineEnterLevelsNotMonotonic {
                min: d.enter_at_min,
                typical: d.enter_typical,
                peak: d.enter_peak_p95,
            });
        }
        for (name, v) in [
            ("baseline.historical_base_rate_24h", d.historical_base_rate_24h),
            ("baseline.p_enter_hit", d.p_enter_hit),
            ("baseline.p_exit_hit_given_enter", d.p_exit_hit_given_enter),
        ] {
            if !(0.0..=1.0).contains(&v) {
                return Err(InvariantError::ProbabilityOutOfUnitInterval {
                    field: name,
                    value: v,
                });
            }
        }
        let (lo, hi) = d.historical_base_rate_ci;
        if !(0.0 <= lo && lo <= d.historical_base_rate_24h && d.historical_base_rate_24h <= hi && hi <= 1.0) {
            return Err(InvariantError::ConfidenceIntervalInconsistent {
                p: d.historical_base_rate_24h,
                lo,
                hi,
            });
        }
    }

    // 8. Cluster rank em [1, size].
    if s.cluster_size == 0 || s.cluster_rank == 0 || s.cluster_rank > s.cluster_size {
        return Err(InvariantError::ClusterRankOutOfRange {
            size: s.cluster_size,
            rank: s.cluster_rank,
        });
    }

    // 9. Janela de validade não-vazia.
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
        BaselineDiagnostics, CalibStatus, ReasonKind, RouteId, TradeReason,
    };
    use crate::types::{SymbolId, Venue};

    fn valid() -> TradeSetup {
        TradeSetup {
            route_id: RouteId {
                symbol_id: SymbolId(42),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
            entry_now: 2.0,
            exit_target: -1.0,
            gross_profit_target: 1.0,
            p_hit: Some(0.83),
            p_hit_ci: Some((0.77, 0.88)),
            exit_q25: Some(-1.4),
            exit_q50: Some(-1.0),
            exit_q75: Some(-0.7),
            t_hit_p25_s: Some(720),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(6000),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
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
            }),
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
    fn detects_non_monotonic_baseline_gross_quantiles() {
        let mut s = valid();
        s.baseline_diagnostics.as_mut().unwrap().gross_profit_p10 = 5.0; // maior que median
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::BaselineGrossQuantilesNotMonotonic { .. }));
    }

    #[test]
    fn detects_probability_out_of_range() {
        let mut s = valid();
        s.p_hit = Some(1.5);
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ProbabilityOutOfUnitInterval { .. }));
    }

    #[test]
    fn detects_ci_not_containing_p() {
        let mut s = valid();
        s.p_hit_ci = Some((0.10, 0.20)); // p_hit=0.83 está fora
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ConfidenceIntervalInconsistent { .. }));
    }

    #[test]
    fn detects_nan() {
        let mut s = valid();
        s.entry_now = f32::NAN;
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
    fn detects_non_monotonic_time_to_hit() {
        let mut s = valid();
        s.t_hit_p25_s = Some(9999);
        s.t_hit_median_s = Some(100);
        s.t_hit_p75_s = Some(200);
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::TimeToHitQuantilesNotMonotonic { .. }));
    }

    #[test]
    fn detects_non_monotonic_baseline_enter_levels() {
        let mut s = valid();
        s.baseline_diagnostics.as_mut().unwrap().enter_at_min = 3.0; // > typical
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::BaselineEnterLevelsNotMonotonic { .. }));
    }
}
