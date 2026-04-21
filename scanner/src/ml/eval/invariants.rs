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
    /// `horizon_p05_s <= horizon_median_s <= horizon_p95_s` violado.
    HorizonQuantilesNotMonotonic { p05: u32, median: u32, p95: u32 },
    /// Probabilidade fora do intervalo [0, 1].
    ProbabilityOutOfUnitInterval { field: &'static str, value: f32 },
    /// IC 95% não envolve `realization_probability` ou lower > upper.
    ConfidenceIntervalInconsistent { p: f32, lo: f32, hi: f32 },
    /// `haircut_predicted` fora de [0, 1] ou `realizable_median` incoerente.
    HaircutInconsistent {
        haircut: f32, median: f32, realizable_median: f32,
    },
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
    check_finite!(realization_probability);
    check_finite!(haircut_predicted);
    check_finite!(gross_profit_realizable_median);

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

    // 4. Horizon quantis monotônicos.
    if !(s.horizon_p05_s <= s.horizon_median_s && s.horizon_median_s <= s.horizon_p95_s) {
        return Err(InvariantError::HorizonQuantilesNotMonotonic {
            p05: s.horizon_p05_s,
            median: s.horizon_median_s,
            p95: s.horizon_p95_s,
        });
    }

    // 5. Probabilidades em [0, 1].
    for (name, v) in [
        ("realization_probability", s.realization_probability),
        ("p_enter_hit", s.p_enter_hit),
        ("p_exit_hit_given_enter", s.p_exit_hit_given_enter),
        ("haircut_predicted", s.haircut_predicted),
    ] {
        if !(0.0..=1.0).contains(&v) {
            return Err(InvariantError::ProbabilityOutOfUnitInterval {
                field: name,
                value: v,
            });
        }
    }

    // 6. IC envolve P(realize).
    let (lo, hi) = s.confidence_interval;
    if !(lo.is_finite() && hi.is_finite()) {
        return Err(InvariantError::NonFiniteField {
            field: "confidence_interval",
            value: if lo.is_finite() { hi } else { lo },
        });
    }
    if !(0.0 <= lo && lo <= s.realization_probability && s.realization_probability <= hi && hi <= 1.0) {
        return Err(InvariantError::ConfidenceIntervalInconsistent {
            p: s.realization_probability,
            lo,
            hi,
        });
    }

    // 7. Haircut coerente. Tolerância 1e-4 para erro de ponto flutuante.
    let expected_realizable = s.gross_profit_median * (1.0 - s.haircut_predicted);
    if s.gross_profit_realizable_median > expected_realizable + 1e-4 {
        return Err(InvariantError::HaircutInconsistent {
            haircut: s.haircut_predicted,
            median: s.gross_profit_median,
            realizable_median: s.gross_profit_realizable_median,
        });
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
        CalibStatus, ReasonKind, RouteId, ToxicityLevel, TradeReason,
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
            realization_probability: 0.77,
            confidence_interval: (0.70, 0.82),
            horizon_p05_s: 720,
            horizon_median_s: 1680,
            horizon_p95_s: 6000,
            toxicity_level: ToxicityLevel::Healthy,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            haircut_predicted: 0.25,
            gross_profit_realizable_median: 0.75,
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
        s.realization_probability = 1.5;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ProbabilityOutOfUnitInterval { .. }));
    }

    #[test]
    fn detects_ci_not_containing_p() {
        let mut s = valid();
        s.confidence_interval = (0.10, 0.20); // P=0.77 está fora
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::ConfidenceIntervalInconsistent { .. }));
    }

    #[test]
    fn detects_nan() {
        let mut s = valid();
        s.realization_probability = f32::NAN;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::NonFiniteField { .. }));
    }

    #[test]
    fn detects_haircut_inconsistency() {
        let mut s = valid();
        // median=1.0, haircut=0.25 → expected <= 0.75. Violar.
        s.gross_profit_realizable_median = 0.95;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::HaircutInconsistent { .. }));
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
    fn detects_non_monotonic_horizon() {
        let mut s = valid();
        s.horizon_p05_s = 9999;
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::HorizonQuantilesNotMonotonic { .. }));
    }

    #[test]
    fn detects_non_monotonic_enter_levels() {
        let mut s = valid();
        s.enter_at_min = 3.0; // > typical
        let err = verify_tradesetup(&s).unwrap_err();
        assert!(matches!(err, InvariantError::EnterLevelsNotMonotonic { .. }));
    }
}
