//! Leakage audit do pipeline ML.
//!
//! O objetivo aqui é detectar vazamentos que já existem no runtime atual,
//! sem depender de um trainer externo. Dois tipos de checks são possíveis
//! nesta fase:
//!
//! - verificações comportamentais em runtime, usando o `MlServer` atual;
//! - verificações estruturais em source, para garantir que o caminho de
//!   features não esteja consumindo campos de saída ou estatísticas globais.
//!
//! O canary forward-looking continua dependente de um modelo treinado, então
//! é reportado como `Skipped` com motivo explícito.

use std::fmt;

use crate::ml::baseline::{BaselineA3, BaselineConfig};
use crate::ml::contract::{AbstainReason, Recommendation, RouteId};
use crate::ml::feature_store::{hot_cache::CacheConfig, HotQueryCache};
use crate::ml::serving::MlServer;
use crate::ml::trigger::{SampleDecision, SamplingConfig, SamplingTrigger};
use crate::types::{SymbolId, Venue};

/// Resultado de um teste de leakage.
#[derive(Debug, Clone, PartialEq)]
pub enum LeakageTestResult {
    /// Teste passou — nenhuma evidência de leakage detectada.
    Pass,
    /// Teste falhou — leakage detectado. Detalhe textual para diagnóstico.
    Fail(String),
    /// Teste pulado — dependência ainda não disponível (pipeline de treino).
    Skipped(&'static str),
}

impl fmt::Display for LeakageTestResult {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Pass => write!(f, "PASS"),
            Self::Fail(msg) => write!(f, "FAIL: {msg}"),
            Self::Skipped(reason) => write!(f, "SKIP: {reason}"),
        }
    }
}

/// Relatório consolidado dos 5 testes.
#[derive(Debug, Clone)]
pub struct LeakageAuditReport {
    pub shuffling_temporal: LeakageTestResult,
    pub ast_feature_audit: LeakageTestResult,
    pub dataset_wide_statistics: LeakageTestResult,
    pub purge_verification: LeakageTestResult,
    pub canary_forward_looking: LeakageTestResult,
}

impl LeakageAuditReport {
    /// `true` apenas se todos os testes críticos passaram de fato.
    /// `Skipped` não conta como prontidão operacional.
    pub fn all_pass(&self) -> bool {
        let tests = [
            &self.shuffling_temporal,
            &self.ast_feature_audit,
            &self.dataset_wide_statistics,
            &self.purge_verification,
            &self.canary_forward_looking,
        ];
        tests.iter().all(|t| matches!(t, LeakageTestResult::Pass))
    }

/// Conta tests em cada status.
    pub fn summary(&self) -> (usize, usize, usize) {
        let tests = [
            &self.shuffling_temporal,
            &self.ast_feature_audit,
            &self.dataset_wide_statistics,
            &self.purge_verification,
            &self.canary_forward_looking,
        ];
        let (mut pass, mut fail, mut skip) = (0, 0, 0);
        for t in tests {
            match t {
                LeakageTestResult::Pass => pass += 1,
                LeakageTestResult::Fail(_) => fail += 1,
                LeakageTestResult::Skipped(_) => skip += 1,
            }
        }
        (pass, fail, skip)
    }
}

pub fn run_full_audit() -> LeakageAuditReport {
    let shuffling_temporal = if temporal_ordering_guard() {
        LeakageTestResult::Pass
    } else {
        LeakageTestResult::Fail(
            "current observation contaminates cache before recommendation".into(),
        )
    };

    let ast_feature_audit = if source_lacks_any(
        include_str!("../baseline/ecdf.rs"),
        &["sample_decision", "was_recommended", "outcome", "pnl"],
    ) {
        LeakageTestResult::Pass
    } else {
        LeakageTestResult::Fail(
            "baseline feature path references output-side fields".into(),
        )
    };

    let dataset_wide_statistics = if source_lacks_any(
        include_str!("../feature_store/hot_cache.rs"),
        &["global_mean", "global_std", "dataset_mean", "dataset_std", "full_dataset"],
    ) {
        LeakageTestResult::Pass
    } else {
        LeakageTestResult::Fail(
            "feature store contains dataset-wide statistics".into(),
        )
    };

    let purge_verification = if purge_window_excludes_expired_samples() {
        LeakageTestResult::Pass
    } else {
        LeakageTestResult::Fail("rolling window keeps expired samples alive".into())
    };

    LeakageAuditReport {
        shuffling_temporal,
        ast_feature_audit,
        dataset_wide_statistics,
        purge_verification,
        canary_forward_looking: LeakageTestResult::Skipped(
            "requires a trained model artifact; baseline-only Marco 0",
        ),
    }
}

fn source_lacks_any(source: &str, needles: &[&str]) -> bool {
    needles.iter().all(|needle| !source.contains(needle))
}

fn temporal_ordering_guard() -> bool {
    let cache = HotQueryCache::with_config(CacheConfig::for_testing());
    let baseline = BaselineA3::new(
        cache,
        BaselineConfig {
            floor_pct: 0.5,
            n_min: 1,
            ..BaselineConfig::default()
        },
    );
    let trigger = SamplingTrigger::new(SamplingConfig {
        n_min: 1,
        ..SamplingConfig::default()
    });
    let server = MlServer::new(baseline, trigger);
    let route = RouteId {
        symbol_id: SymbolId(1),
        buy_venue: Venue::MexcFut,
        sell_venue: Venue::BingxFut,
    };
    let (rec, dec, accepted) = server.on_opportunity(
        0,
        route,
        "BTC-USDT",
        3.2,
        -0.4,
        1e6,
        1e6,
        1,
    );
    matches!(
        rec,
        Recommendation::Abstain {
            reason: AbstainReason::InsufficientData,
            ..
        }
    ) && dec == SampleDecision::RejectInsufficientHistory && accepted.is_none()
}

fn purge_window_excludes_expired_samples() -> bool {
    let cache = HotQueryCache::with_config(CacheConfig {
        decimation: 1,
        window_ns: 100,
        rebuild_interval_ns: 1,
        ring_initial_capacity: 4,
    });
    let route = RouteId {
        symbol_id: SymbolId(7),
        buy_venue: Venue::MexcFut,
        sell_venue: Venue::BingxFut,
    };
    cache.observe(route, 2.0, -1.0, 0);
    cache.observe(route, 3.0, -1.0, 200);
    cache.n_observations(route) == 1
        && cache
            .quantile_entry(route, 0.5)
            .map(|v| v > 2.5)
            .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audit_returns_concrete_checks_with_one_skipped_canary() {
        let r = run_full_audit();
        let (pass, fail, skip) = r.summary();
        assert!(pass >= 3);
        assert_eq!(fail, 0);
        assert_eq!(skip, 1);
        assert!(
            !r.all_pass(),
            "audit com canary decisivo skipped não pode sinalizar pronto"
        );
    }

    #[test]
    fn audit_reports_temporal_guard_passes() {
        assert!(temporal_ordering_guard());
    }

    #[test]
    fn audit_reports_purge_window_passes() {
        assert!(purge_window_excludes_expired_samples());
    }

    #[test]
    fn audit_source_scans_detect_forbidden_globals() {
        assert!(source_lacks_any(
            include_str!("../feature_store/hot_cache.rs"),
            &["global_mean", "global_std", "dataset_mean", "dataset_std", "full_dataset"],
        ));
    }

    #[test]
    fn audit_source_scans_detect_output_fields_not_used_as_features() {
        assert!(source_lacks_any(
            include_str!("../baseline/ecdf.rs"),
            &["sample_decision", "was_recommended", "outcome", "pnl"],
        ));
    }

    #[test]
    fn fail_blocks_all_pass_check() {
        let r = LeakageAuditReport {
            shuffling_temporal: LeakageTestResult::Pass,
            ast_feature_audit: LeakageTestResult::Fail("found global_mean".into()),
            dataset_wide_statistics: LeakageTestResult::Pass,
            purge_verification: LeakageTestResult::Pass,
            canary_forward_looking: LeakageTestResult::Pass,
        };
        assert!(!r.all_pass());
    }
}
