//! DTOs serializáveis de `Recommendation` / `TradeSetup` para broadcast.
//!
//! `contract.rs` mantém tipos fortemente tipados com `Venue`/`SymbolId`
//! (não-serde por design do scanner). Este módulo converte para DTOs
//! JSON-safe consumidos pelo WebSocket `/ws/ml/recommendations` e pelo
//! REST `/api/ml/recommendations`.
//!
//! Schema JSON corresponde exatamente a ADR-016 §Struct final.

use serde::Serialize;

use crate::ml::contract::{
    AbstainDiagnostic, AbstainReason, BaselineDiagnostics, CalibStatus, EntryQuality, ExitQuality,
    ReasonKind, Recommendation, RouteId, TacticalSignal, TradeSetup,
};

// ---------------------------------------------------------------------------
// RouteIdDto
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct RouteIdDto {
    pub symbol_id: u32,
    pub buy_venue: &'static str,
    pub sell_venue: &'static str,
    pub buy_market: &'static str,
    pub sell_market: &'static str,
}

impl From<RouteId> for RouteIdDto {
    fn from(r: RouteId) -> Self {
        Self {
            symbol_id: r.symbol_id.0,
            buy_venue: r.buy_venue.as_str(),
            sell_venue: r.sell_venue.as_str(),
            buy_market: r.buy_venue.market().as_str(),
            sell_market: r.sell_venue.market().as_str(),
        }
    }
}

// ---------------------------------------------------------------------------
// RecommendationDto (top-level)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RecommendationDto {
    Trade(TradeSetupDto),
    Abstain {
        reason: AbstainReasonDto,
        diagnostic: AbstainDiagnosticDto,
    },
}

impl From<&Recommendation> for RecommendationDto {
    fn from(r: &Recommendation) -> Self {
        match r {
            Recommendation::Trade(s) => RecommendationDto::Trade(TradeSetupDto::from(s)),
            Recommendation::Abstain { reason, diagnostic } => RecommendationDto::Abstain {
                reason: AbstainReasonDto::from(*reason),
                diagnostic: AbstainDiagnosticDto::from(diagnostic),
            },
        }
    }
}

// ---------------------------------------------------------------------------
// TradeSetupDto (ADR-016 struct fields)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct TradeSetupDto {
    pub route_id: RouteIdDto,

    pub entry_now: f32,
    pub exit_target: f32,
    pub gross_profit_target: f32,
    pub p_hit: Option<f32>,
    pub p_hit_ci_lo: Option<f32>,
    pub p_hit_ci_hi: Option<f32>,

    pub exit_q25: Option<f32>,
    pub exit_q50: Option<f32>,
    pub exit_q75: Option<f32>,
    pub t_hit_p25_s: Option<u32>,
    pub t_hit_median_s: Option<u32>,
    pub t_hit_p75_s: Option<u32>,
    pub p_censor: Option<f32>,

    pub baseline_diagnostics: Option<BaselineDiagnosticsDto>,

    pub cluster_id: Option<u32>,
    pub cluster_size: u8,
    pub cluster_rank: u8,

    pub calibration_status: &'static str,
    pub reason_kind: &'static str,
    pub reason_detail: String,

    pub model_version: String,
    pub emitted_at_ns: u64,
    pub valid_until_ns: u64,
}

impl From<&TradeSetup> for TradeSetupDto {
    fn from(s: &TradeSetup) -> Self {
        let (p_hit_ci_lo, p_hit_ci_hi) = s
            .p_hit_ci
            .map(|(lo, hi)| (Some(lo), Some(hi)))
            .unwrap_or((None, None));
        Self {
            route_id: s.route_id.into(),
            entry_now: s.entry_now,
            exit_target: s.exit_target,
            gross_profit_target: s.gross_profit_target,
            p_hit: s.p_hit,
            p_hit_ci_lo,
            p_hit_ci_hi,
            exit_q25: s.exit_q25,
            exit_q50: s.exit_q50,
            exit_q75: s.exit_q75,
            t_hit_p25_s: s.t_hit_p25_s,
            t_hit_median_s: s.t_hit_median_s,
            t_hit_p75_s: s.t_hit_p75_s,
            p_censor: s.p_censor,
            baseline_diagnostics: s.baseline_diagnostics.as_ref().map(BaselineDiagnosticsDto::from),
            cluster_id: s.cluster_id,
            cluster_size: s.cluster_size,
            cluster_rank: s.cluster_rank,
            calibration_status: match s.calibration_status {
                CalibStatus::Ok => "ok",
                CalibStatus::Degraded => "degraded",
                CalibStatus::Suspended => "suspended",
            },
            reason_kind: reason_kind_label(s.reason.kind),
            reason_detail: s.reason.detail.clone(),
            model_version: s.model_version.clone(),
            emitted_at_ns: s.emitted_at,
            valid_until_ns: s.valid_until,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct BaselineDiagnosticsDto {
    pub enter_at_min: f32,
    pub enter_typical: f32,
    pub enter_peak_p95: f32,
    pub p_enter_hit: f32,
    pub exit_at_min: f32,
    pub exit_typical: f32,
    pub p_exit_hit_given_enter: f32,
    pub gross_profit_p10: f32,
    pub gross_profit_p25: f32,
    pub gross_profit_median: f32,
    pub gross_profit_p75: f32,
    pub gross_profit_p90: f32,
    pub gross_profit_p95: f32,
    pub historical_base_rate_24h: f32,
    pub historical_base_rate_ci_lo: f32,
    pub historical_base_rate_ci_hi: f32,
}

impl From<&BaselineDiagnostics> for BaselineDiagnosticsDto {
    fn from(d: &BaselineDiagnostics) -> Self {
        Self {
            enter_at_min: d.enter_at_min,
            enter_typical: d.enter_typical,
            enter_peak_p95: d.enter_peak_p95,
            p_enter_hit: d.p_enter_hit,
            exit_at_min: d.exit_at_min,
            exit_typical: d.exit_typical,
            p_exit_hit_given_enter: d.p_exit_hit_given_enter,
            gross_profit_p10: d.gross_profit_p10,
            gross_profit_p25: d.gross_profit_p25,
            gross_profit_median: d.gross_profit_median,
            gross_profit_p75: d.gross_profit_p75,
            gross_profit_p90: d.gross_profit_p90,
            gross_profit_p95: d.gross_profit_p95,
            historical_base_rate_24h: d.historical_base_rate_24h,
            historical_base_rate_ci_lo: d.historical_base_rate_ci.0,
            historical_base_rate_ci_hi: d.historical_base_rate_ci.1,
        }
    }
}

fn reason_kind_label(k: ReasonKind) -> &'static str {
    match k {
        ReasonKind::Trend => "trend",
        ReasonKind::Regime => "regime",
        ReasonKind::Tail => "tail",
        ReasonKind::Combined => "combined",
    }
}

// ---------------------------------------------------------------------------
// Abstain DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AbstainReasonDto {
    NoOpportunity,
    InsufficientData,
    LowConfidence,
    LongTail,
}

impl From<AbstainReason> for AbstainReasonDto {
    fn from(r: AbstainReason) -> Self {
        match r {
            AbstainReason::NoOpportunity => AbstainReasonDto::NoOpportunity,
            AbstainReason::InsufficientData => AbstainReasonDto::InsufficientData,
            AbstainReason::LowConfidence => AbstainReasonDto::LowConfidence,
            AbstainReason::LongTail => AbstainReasonDto::LongTail,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AbstainDiagnosticDto {
    pub n_observations: u32,
    pub ci_width_if_emitted: Option<f32>,
    pub nearest_feasible_utility: Option<f32>,
    pub tail_ratio_p99_p95: Option<f32>,
    pub model_version: String,
    pub regime_posterior: [f32; 3],
}

impl From<&AbstainDiagnostic> for AbstainDiagnosticDto {
    fn from(d: &AbstainDiagnostic) -> Self {
        Self {
            n_observations: d.n_observations,
            ci_width_if_emitted: d.ci_width_if_emitted,
            nearest_feasible_utility: d.nearest_feasible_utility,
            tail_ratio_p99_p95: d.tail_ratio_p99_p95,
            model_version: d.model_version.clone(),
            regime_posterior: d.regime_posterior,
        }
    }
}

// ---------------------------------------------------------------------------
// TacticalSignalDto
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct TacticalSignalDto {
    pub route_id: RouteIdDto,
    pub at_ns: u64,
    pub current_entry: f32,
    pub current_exit: f32,
    pub entry_quality: &'static str,
    pub exit_quality: &'static str,
    pub time_since_emit_s: u32,
    pub time_remaining_s: u32,
}

impl From<&TacticalSignal> for TacticalSignalDto {
    fn from(t: &TacticalSignal) -> Self {
        Self {
            route_id: t.route_id.into(),
            at_ns: t.at,
            current_entry: t.current_entry,
            current_exit: t.current_exit,
            entry_quality: entry_quality_label(t.entry_quality),
            exit_quality: exit_quality_label(t.exit_quality),
            time_since_emit_s: t.time_since_emit_s,
            time_remaining_s: t.time_remaining_s,
        }
    }
}

fn entry_quality_label(q: EntryQuality) -> &'static str {
    match q {
        EntryQuality::HasNotAppeared => "has_not_appeared",
        EntryQuality::Eligible => "eligible",
        EntryQuality::AboveMedian => "above_median",
        EntryQuality::NearPeak => "near_peak",
    }
}

fn exit_quality_label(q: ExitQuality) -> &'static str {
    match q {
        ExitQuality::HasNotAppeared => "has_not_appeared",
        ExitQuality::Eligible => "eligible",
        ExitQuality::AboveMedian => "above_median",
        ExitQuality::NearBest => "near_best",
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::contract::{ReasonKind, Recommendation, TradeReason};
    use crate::types::{SymbolId, Venue};

    fn mk_setup() -> TradeSetup {
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
            t_hit_p25_s: Some(900),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(3120),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
                enter_at_min: 1.8,
                enter_typical: 2.0,
                enter_peak_p95: 2.8,
                p_enter_hit: 0.9,
                exit_at_min: -1.2,
                exit_typical: -1.0,
                p_exit_hit_given_enter: 0.85,
                gross_profit_p10: 0.6,
                gross_profit_p25: 0.7,
                gross_profit_median: 1.0,
                gross_profit_p75: 1.5,
                gross_profit_p90: 2.3,
                gross_profit_p95: 2.8,
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
            model_version: "a3-0.1.0".into(),
            emitted_at: 1_700_000_000_000_000_000,
            valid_until: 1_700_000_150_000_000_000,
        }
    }

    #[test]
    fn trade_setup_dto_round_trip_through_json() {
        let s = mk_setup();
        let dto: TradeSetupDto = (&s).into();
        let json = serde_json::to_string(&dto).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["route_id"]["symbol_id"], 42);
        assert_eq!(v["route_id"]["buy_venue"], "mexc");
        assert_eq!(v["route_id"]["buy_market"], "FUTURES");
        assert!(v.get("toxicity_level").is_none());
        assert_eq!(v["calibration_status"], "ok");
        assert_eq!(v["reason_kind"], "combined");
        assert_eq!(v["entry_now"], 2.0);
        assert_eq!(v["exit_target"], -1.0);
        assert_eq!(v["gross_profit_target"], 1.0);
        assert_eq!(v["p_hit"], 0.83);
        assert_eq!(v["t_hit_median_s"], 1680);
        assert_eq!(v["baseline_diagnostics"]["enter_at_min"], 1.8);
        assert!(v.get("enter_at_min").is_none());
        assert!(v.get("gross_profit_median").is_none());
        assert!(
            v.get("haircut_predicted").is_none(),
            "haircut não deve sair no DTO do ML"
        );
        assert!(
            v.get("gross_profit_realizable_median").is_none(),
            "gross realizable não deve sair no DTO do ML"
        );
    }

    #[test]
    fn recommendation_dto_trade_variant() {
        let rec = Recommendation::Trade(mk_setup());
        let dto = RecommendationDto::from(&rec);
        let json = serde_json::to_string(&dto).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["kind"], "trade");
        assert!(v["route_id"].is_object());
    }

    #[test]
    fn recommendation_dto_abstain_variant() {
        let rec = Recommendation::Abstain {
            reason: AbstainReason::LowConfidence,
            diagnostic: AbstainDiagnostic {
                n_observations: 800,
                ci_width_if_emitted: Some(0.35),
                nearest_feasible_utility: None,
                tail_ratio_p99_p95: None,
                model_version: "a3-0.1.0".into(),
                regime_posterior: [0.6, 0.3, 0.1],
            },
        };
        let dto = RecommendationDto::from(&rec);
        let json = serde_json::to_string(&dto).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["kind"], "abstain");
        assert_eq!(v["reason"], "low_confidence");
        assert_eq!(v["diagnostic"]["n_observations"], 800);
    }

    #[test]
    fn all_calib_statuses_serialize() {
        for (status, label) in [
            (CalibStatus::Ok, "ok"),
            (CalibStatus::Degraded, "degraded"),
            (CalibStatus::Suspended, "suspended"),
        ] {
            let mut s = mk_setup();
            s.calibration_status = status;
            let dto: TradeSetupDto = (&s).into();
            assert_eq!(dto.calibration_status, label);
        }
    }
}
