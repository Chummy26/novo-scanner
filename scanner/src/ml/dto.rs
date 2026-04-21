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
    AbstainDiagnostic, AbstainReason, CalibStatus, EntryQuality, ExitQuality,
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

    /// **Rebrand ADR-auditoria 2026-04-21**: o baseline A3 emite a
    /// frequência empírica BRUTA da janela 24h (`#{gross ≥ floor} / n`),
    /// que é *prior marginal não-condicional*, não `P(realize | state_t₀)`.
    /// Renomeamos o campo para refletir semântica real e evitar que a UI
    /// apresente esse número como "probabilidade agora" (trap T2+T6).
    /// O valor em `[0,1]` continua válido — só o NOME mudou.
    /// Um modelo condicional emitirá `realization_probability_conditional`
    /// separado quando entrar em produção.
    pub historical_base_rate_24h: f32,
    pub confidence_interval_lo: f32,
    pub confidence_interval_hi: f32,

    pub horizon_p05_s: u32,
    pub horizon_median_s: u32,
    pub horizon_p95_s: u32,

    pub cluster_id: Option<u32>,
    pub cluster_size: u8,
    pub cluster_rank: u8,

    pub haircut_predicted: f32,
    pub gross_profit_realizable_median: f32,

    pub calibration_status: &'static str,
    pub reason_kind: &'static str,
    pub reason_detail: String,

    pub model_version: String,
    pub emitted_at_ns: u64,
    pub valid_until_ns: u64,
}

impl From<&TradeSetup> for TradeSetupDto {
    fn from(s: &TradeSetup) -> Self {
        Self {
            route_id: s.route_id.into(),
            enter_at_min: s.enter_at_min,
            enter_typical: s.enter_typical,
            enter_peak_p95: s.enter_peak_p95,
            p_enter_hit: s.p_enter_hit,
            exit_at_min: s.exit_at_min,
            exit_typical: s.exit_typical,
            p_exit_hit_given_enter: s.p_exit_hit_given_enter,
            gross_profit_p10: s.gross_profit_p10,
            gross_profit_p25: s.gross_profit_p25,
            gross_profit_median: s.gross_profit_median,
            gross_profit_p75: s.gross_profit_p75,
            gross_profit_p90: s.gross_profit_p90,
            gross_profit_p95: s.gross_profit_p95,
            historical_base_rate_24h: s.realization_probability,
            confidence_interval_lo: s.confidence_interval.0,
            confidence_interval_hi: s.confidence_interval.1,
            horizon_p05_s: s.horizon_p05_s,
            horizon_median_s: s.horizon_median_s,
            horizon_p95_s: s.horizon_p95_s,
            cluster_id: s.cluster_id,
            cluster_size: s.cluster_size,
            cluster_rank: s.cluster_rank,
            haircut_predicted: s.haircut_predicted,
            gross_profit_realizable_median: s.gross_profit_realizable_median,
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
            realization_probability: 0.77,
            confidence_interval: (0.70, 0.82),
            horizon_p05_s: 720,
            horizon_median_s: 1680,
            horizon_p95_s: 6000,
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
        assert_eq!(v["enter_at_min"], 1.8);
        assert_eq!(v["gross_profit_median"], 1.0);
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
