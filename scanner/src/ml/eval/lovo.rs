//! LOVO — Leave-One-Venue-Out evaluation (ADR-023).
//!
//! Protocolo para detectar viés sistemático do modelo por venue/feed:
//! treina sobre dataset excluindo todas rotas de uma venue `v`, avalia
//! sobre rotas envolvendo `v`, repete para cada venue, coleta métricas
//! per-venue, computa `worst_drop` vs média.
//!
//! Gates (ADR-023):
//! - `LOVO_precision@10_worst_drop ≤ 0.15` (hard)
//! - `LOVO_ECE_worst ≤ 0.08` (hard)
//! - `LOVO_coverage_worst ≥ 0.85` (hard)
//! - `LOVO_economic_value_worst ≥ 0` (soft, alerta)
//!
//! # Estado atual (Marco 0)
//!
//! Este módulo define **types e API**. Execução real de LOVO sobre modelo
//! treinado espera Marco 1. Em Marco 0, LOVO é executável sobre **baseline
//! A3**: estabelece baseline de viés por venue sem modelo ML.

use crate::types::Venue;

/// Métricas coletadas em um fold LOVO (uma venue excluída do treino).
#[derive(Debug, Clone)]
pub struct VenueFoldMetrics {
    /// Venue excluída do treino (test-set contém apenas rotas envolvendo-a).
    pub held_out_venue: Venue,
    pub n_routes_in_fold: u32,
    pub n_samples_in_fold: u64,

    /// Métricas ML sobre o test-set desta venue.
    pub precision_at_10: f32,
    pub ece: f32,
    pub coverage_ic_95: f32,
    pub realization_rate: f32,

    /// PnL bruto simulado no fold (ADR-019 integration).
    pub simulated_pnl_aggregated: f32,
}

/// Relatório consolidado LOVO.
#[derive(Debug, Clone)]
pub struct LovoReport {
    pub folds: Vec<VenueFoldMetrics>,

    // Estatísticas agregadas.
    pub precision_at_10_mean: f32,
    pub precision_at_10_worst: f32,
    pub precision_at_10_worst_drop: f32,
    pub ece_worst: f32,
    pub coverage_worst: f32,
    pub economic_value_worst: f32,
}

impl LovoReport {
    /// Avalia se LOVO passa os gates hard do ADR-023.
    pub fn passes_hard_gates(&self) -> bool {
        self.precision_at_10_worst_drop <= 0.15
            && self.ece_worst <= 0.08
            && self.coverage_worst >= 0.85
    }

    /// Soft gate alerta (não bloqueia).
    pub fn economic_soft_gate_alert(&self) -> bool {
        self.economic_value_worst < 0.0
    }

    /// Agrega a partir da lista de folds.
    pub fn from_folds(folds: Vec<VenueFoldMetrics>) -> Self {
        let n = folds.len() as f32;
        if n == 0.0 {
            return Self {
                folds,
                precision_at_10_mean: 0.0,
                precision_at_10_worst: 0.0,
                precision_at_10_worst_drop: 0.0,
                ece_worst: 0.0,
                coverage_worst: 1.0,
                economic_value_worst: 0.0,
            };
        }
        let mean = folds.iter().map(|f| f.precision_at_10).sum::<f32>() / n;
        let worst = folds
            .iter()
            .map(|f| f.precision_at_10)
            .fold(f32::INFINITY, f32::min);
        let ece_worst = folds.iter().map(|f| f.ece).fold(0.0_f32, f32::max);
        let coverage_worst = folds
            .iter()
            .map(|f| f.coverage_ic_95)
            .fold(f32::INFINITY, f32::min);
        let econ_worst = folds
            .iter()
            .map(|f| f.simulated_pnl_aggregated)
            .fold(f32::INFINITY, f32::min);
        Self {
            folds,
            precision_at_10_mean: mean,
            precision_at_10_worst: worst,
            precision_at_10_worst_drop: (mean - worst).max(0.0),
            ece_worst,
            coverage_worst,
            economic_value_worst: econ_worst,
        }
    }
}

/// Placeholder Marco 0: retorna `None` até execução real estar disponível.
pub fn run_lovo_on_baseline_a3() -> Option<LovoReport> {
    // Implementação efetiva será preenchida em Marco 0 após `raw_samples_*.jsonl`
    // acumular ≥ 30 dias. Requer:
    // 1. Reconstruir features PIT por venue a partir de raw_samples.
    // 2. Rodar A3.recommend() sobre test-set venue-excluded.
    // 3. Calcular precision@k, ECE (calibrado com observed vs predicted),
    //    coverage, simulated_pnl.
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mk_fold(v: Venue, p: f32, ece: f32, cov: f32, econ: f32) -> VenueFoldMetrics {
        VenueFoldMetrics {
            held_out_venue: v,
            n_routes_in_fold: 100,
            n_samples_in_fold: 1000,
            precision_at_10: p,
            ece,
            coverage_ic_95: cov,
            realization_rate: 0.7,
            simulated_pnl_aggregated: econ,
        }
    }

    #[test]
    fn empty_folds_returns_neutral_report() {
        let r = LovoReport::from_folds(vec![]);
        assert_eq!(r.precision_at_10_mean, 0.0);
        assert!(r.passes_hard_gates()); // nada para falhar ainda
    }

    #[test]
    fn computes_mean_and_worst_correctly() {
        let folds = vec![
            mk_fold(Venue::BinanceFut, 0.80, 0.02, 0.93, 100.0),
            mk_fold(Venue::MexcFut, 0.70, 0.04, 0.90, 50.0),
            mk_fold(Venue::BingxFut, 0.75, 0.03, 0.92, 80.0),
        ];
        let r = LovoReport::from_folds(folds);
        assert!((r.precision_at_10_mean - 0.75).abs() < 1e-4);
        assert_eq!(r.precision_at_10_worst, 0.70);
        assert!((r.precision_at_10_worst_drop - 0.05).abs() < 1e-4);
        assert!(r.passes_hard_gates());
    }

    #[test]
    fn detects_gate_violation() {
        // Dois folds com drop de 0.175 (> 0.15): mean=0.675, worst=0.50.
        let folds = vec![
            mk_fold(Venue::BinanceFut, 0.85, 0.02, 0.93, 100.0),
            mk_fold(Venue::MexcFut, 0.50, 0.02, 0.93, 100.0),
        ];
        let r = LovoReport::from_folds(folds);
        assert!(
            !r.passes_hard_gates(),
            "should fail gate (worst_drop = {}, gate = 0.15)",
            r.precision_at_10_worst_drop
        );
    }

    #[test]
    fn soft_gate_alerts_when_economic_negative() {
        let folds = vec![
            mk_fold(Venue::BinanceFut, 0.80, 0.02, 0.93, 100.0),
            mk_fold(Venue::MexcFut, 0.75, 0.02, 0.93, -50.0),
        ];
        let r = LovoReport::from_folds(folds);
        assert!(r.passes_hard_gates());
        assert!(r.economic_soft_gate_alert());
    }

    #[test]
    fn baseline_placeholder_returns_none() {
        assert!(run_lovo_on_baseline_a3().is_none());
    }
}
