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
    Trade {
        /// Status badge CLAUDE.md (`ENTER` / `CAUTION` / `FLOOR` /
        /// `LOW_CONFIDENCE`). Derivado determinístico dos campos numéricos
        /// do `TradeSetupDto` — UI filtra sem interpretação.
        status: &'static str,
        #[serde(flatten)]
        setup: TradeSetupDto,
    },
    Abstain {
        /// Status badge CLAUDE.md (`NO_OPPORTUNITY` / `INSUFFICIENT_DATA` /
        /// `LOW_CONFIDENCE` / `LONG_TAIL`). Derivado do `AbstainReason`.
        status: &'static str,
        reason: AbstainReasonDto,
        diagnostic: AbstainDiagnosticDto,
    },
}

impl From<&Recommendation> for RecommendationDto {
    fn from(r: &Recommendation) -> Self {
        match r {
            Recommendation::Trade(s) => RecommendationDto::Trade {
                status: classify_trade_status(s),
                setup: TradeSetupDto::from(s),
            },
            Recommendation::Abstain { reason, diagnostic } => RecommendationDto::Abstain {
                status: abstain_status_label(*reason),
                reason: AbstainReasonDto::from(*reason),
                diagnostic: AbstainDiagnosticDto::from(diagnostic),
            },
        }
    }
}

// ---------------------------------------------------------------------------
// Classificador de status badges (CLAUDE.md §Output esperado)
// ---------------------------------------------------------------------------

/// Piso mínimo de `p_hit` para emitir `[ENTER]`. Abaixo → `[CAUTION]`.
/// Default: 0.60. Operador pode revisar se baseline histórico for outro.
pub const STATUS_P_FLOOR: f32 = 0.60;

/// Threshold de `p_hit` acima do qual convicção é alta (permite
/// classificar `[ENTER]` mesmo com T longo). Default: 0.75.
pub const STATUS_P_STRONG: f32 = 0.75;

/// Tempo mediano (s) acima do qual `[CAUTION]` é emitido por "T longo".
/// Default: 3600 s = 1 h. CLAUDE.md exemplo `T~2h15` mostra que T longo é
/// emissível (não invalida trade), mas merece cautela visual.
pub const STATUS_T_LONG_S: u32 = 3600;

/// Floor econômico típico sobre `gross_profit_target` (spread bruto cotado).
/// Abaixo → `[FLOOR]`. Default: 0.8% (mesmo do baseline A3).
pub const STATUS_GROSS_FLOOR_PCT: f32 = 0.8;

/// Largura máxima de IC 95% de `p_hit` para emitir números de execução.
/// Acima → `[LOW_CONFIDENCE]` e setup é suprimido visualmente mesmo que
/// presente no JSON (ver CLAUDE.md §Output).
pub const STATUS_IC_WIDTH_LIMIT: f32 = 0.20;

/// Classifica `TradeSetup` em status badge CLAUDE.md.
///
/// Ordem de precedência (mais restritivo primeiro):
/// 0. **Fix D4**: `calibration_status=Suspended` → `LOW_CONFIDENCE`;
///    `calibration_status=Degraded` → `CAUTION`. CLAUDE.md §Critérios:
///    "se o modelo diz 80%, ~80% precisam realizar-se". ECE entre 0.05-0.10
///    (Degraded) contradiz `ENTER`; kill switch ativo (Suspended) exige
///    `LOW_CONFIDENCE`.
/// 1. `LOW_CONFIDENCE` — `ic_width >= STATUS_IC_WIDTH_LIMIT`.
/// 2. `FLOOR` — `gross_profit_target < STATUS_GROSS_FLOOR_PCT`.
/// 3. `CAUTION` — `p_hit < STATUS_P_FLOOR` OR (`p_hit < STATUS_P_STRONG` AND
///    `t_hit_median_s >= STATUS_T_LONG_S`).
/// 4. `ENTER` — resto.
///
/// Quando `p_hit.is_none()` (baseline A3 degradado), retorna `CAUTION`:
/// sem forecast condicional, evitamos `ENTER` direto para forçar revisão
/// manual pelo operador.
pub fn classify_trade_status(s: &TradeSetup) -> &'static str {
    // 0. Fix D4: calibration_status precede todos os outros gates.
    match s.calibration_status {
        CalibStatus::Suspended => return "LOW_CONFIDENCE",
        CalibStatus::Degraded => return "CAUTION",
        CalibStatus::Ok => {}
    }
    // 1. IC width gate (precede tudo — se IC é ruim, o P não é confiável).
    if let Some((lo, hi)) = s.p_hit_ci {
        let width = hi - lo;
        if width >= STATUS_IC_WIDTH_LIMIT {
            return "LOW_CONFIDENCE";
        }
    }
    // 2. Floor econômico (sobre lucro bruto cotado).
    if s.gross_profit_target < STATUS_GROSS_FLOOR_PCT {
        return "FLOOR";
    }
    // 3. Convicção reduzida.
    let p = match s.p_hit {
        Some(p) => p,
        None => return "CAUTION", // sem forecast condicional.
    };
    if p < STATUS_P_FLOOR {
        return "CAUTION";
    }
    let t_long = s
        .t_hit_median_s
        .map(|t| t >= STATUS_T_LONG_S)
        .unwrap_or(false);
    if p < STATUS_P_STRONG && t_long {
        return "CAUTION";
    }
    // 4. ENTER.
    "ENTER"
}

/// Label string do `AbstainReason` alinhado ao CLAUDE.md.
pub fn abstain_status_label(reason: AbstainReason) -> &'static str {
    match reason {
        AbstainReason::NoOpportunity => "NO_OPPORTUNITY",
        AbstainReason::InsufficientData => "INSUFFICIENT_DATA",
        AbstainReason::LowConfidence => "LOW_CONFIDENCE",
        AbstainReason::LongTail => "LONG_TAIL",
        AbstainReason::Cooldown => "COOLDOWN",
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
    /// Fix D2: método usado para IC (wilson_marginal | conformal_split | ...).
    pub ci_method: &'static str,

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
    /// Fix D3: status explícito da detecção de cluster.
    pub cluster_detection_status: &'static str,

    pub calibration_status: &'static str,
    pub reason_kind: &'static str,
    /// Fix D17: estrutura fechada — zero prosa free-form.
    pub reason_entry_percentile_24h: Option<f32>,
    pub reason_regime_posterior_top: f32,
    pub reason_regime_dominant_idx: u8,
    pub reason_tail_z_score: Option<f32>,

    pub model_version: String,
    /// Fix D15: fonte canônica via enum string.
    pub source_kind: &'static str,
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
            ci_method: s.ci_method,
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
            cluster_detection_status: s.cluster_detection_status,
            calibration_status: match s.calibration_status {
                CalibStatus::Ok => "ok",
                CalibStatus::Degraded => "degraded",
                CalibStatus::Suspended => "suspended",
            },
            reason_kind: reason_kind_label(s.reason.kind),
            reason_entry_percentile_24h: s.reason.detail.entry_percentile_24h,
            reason_regime_posterior_top: s.reason.detail.regime_posterior_top,
            reason_regime_dominant_idx: s.reason.detail.regime_dominant_idx,
            reason_tail_z_score: s.reason.detail.tail_z_score,
            model_version: s.model_version.clone(),
            source_kind: s.source_kind.as_str(),
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
    Cooldown,
}

impl From<AbstainReason> for AbstainReasonDto {
    fn from(r: AbstainReason) -> Self {
        match r {
            AbstainReason::NoOpportunity => AbstainReasonDto::NoOpportunity,
            AbstainReason::InsufficientData => AbstainReasonDto::InsufficientData,
            AbstainReason::LowConfidence => AbstainReasonDto::LowConfidence,
            AbstainReason::LongTail => AbstainReasonDto::LongTail,
            AbstainReason::Cooldown => AbstainReasonDto::Cooldown,
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
            cluster_detection_status: "not_implemented",
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: "test".into(),
            },
            ci_method: "wilson_marginal",
            model_version: "baseline-a3-0.2.0".into(),
            source_kind: crate::ml::contract::SourceKind::Baseline,
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

    // -------------------------------------------------------------------
    // Status badges CLAUDE.md (F2-R3 pós-auditoria 2026-04-22)
    // -------------------------------------------------------------------

    #[test]
    fn status_enter_when_all_gates_pass() {
        // Setup base: p_hit=0.83, ci_width=0.11, gross=1.0, t_median=1680s.
        let s = mk_setup();
        assert_eq!(classify_trade_status(&s), "ENTER");
    }

    #[test]
    fn status_low_confidence_when_ic_width_exceeds_limit() {
        let mut s = mk_setup();
        s.p_hit_ci = Some((0.60, 0.85)); // width = 0.25 >= 0.20
        assert_eq!(classify_trade_status(&s), "LOW_CONFIDENCE");
    }

    #[test]
    fn status_floor_when_gross_below_economic_floor() {
        let mut s = mk_setup();
        s.gross_profit_target = 0.20; // < 0.8
        assert_eq!(classify_trade_status(&s), "FLOOR");
    }

    #[test]
    fn status_caution_when_p_hit_below_floor() {
        let mut s = mk_setup();
        s.p_hit = Some(0.41);
        // Ajusta IC para não disparar LOW_CONFIDENCE primeiro.
        s.p_hit_ci = Some((0.35, 0.47));
        assert_eq!(classify_trade_status(&s), "CAUTION");
    }

    #[test]
    fn status_caution_when_p_hit_borderline_and_t_long() {
        let mut s = mk_setup();
        s.p_hit = Some(0.68); // entre FLOOR e STRONG
        s.p_hit_ci = Some((0.63, 0.73));
        s.t_hit_median_s = Some(STATUS_T_LONG_S + 1);
        assert_eq!(classify_trade_status(&s), "CAUTION");
    }

    #[test]
    fn status_enter_when_p_hit_borderline_but_t_short() {
        let mut s = mk_setup();
        s.p_hit = Some(0.68);
        s.p_hit_ci = Some((0.63, 0.73));
        s.t_hit_median_s = Some(600); // 10 min < STATUS_T_LONG_S
        assert_eq!(classify_trade_status(&s), "ENTER");
    }

    #[test]
    fn status_caution_when_p_hit_missing() {
        let mut s = mk_setup();
        s.p_hit = None; // baseline A3 degradado
        s.p_hit_ci = None;
        assert_eq!(classify_trade_status(&s), "CAUTION");
    }

    #[test]
    fn ic_width_gate_precedes_floor_check() {
        // Gross abaixo do floor E IC width grande — IC width deve vencer.
        let mut s = mk_setup();
        s.gross_profit_target = 0.20;
        s.p_hit_ci = Some((0.40, 0.80)); // width 0.40
        assert_eq!(classify_trade_status(&s), "LOW_CONFIDENCE");
    }

    #[test]
    fn abstain_status_labels_match_claude_md() {
        assert_eq!(
            abstain_status_label(AbstainReason::NoOpportunity),
            "NO_OPPORTUNITY"
        );
        assert_eq!(
            abstain_status_label(AbstainReason::InsufficientData),
            "INSUFFICIENT_DATA"
        );
        assert_eq!(
            abstain_status_label(AbstainReason::LowConfidence),
            "LOW_CONFIDENCE"
        );
        assert_eq!(
            abstain_status_label(AbstainReason::LongTail),
            "LONG_TAIL"
        );
    }

    #[test]
    fn recommendation_dto_includes_status_field_for_trade() {
        let rec = Recommendation::Trade(mk_setup());
        let dto = RecommendationDto::from(&rec);
        let json = serde_json::to_string(&dto).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["kind"], "trade");
        assert_eq!(v["status"], "ENTER");
        // Campos flat do setup continuam no mesmo nível (flatten).
        assert!(v["entry_now"].is_number());
    }

    #[test]
    fn recommendation_dto_includes_status_field_for_abstain() {
        let rec = Recommendation::Abstain {
            reason: AbstainReason::NoOpportunity,
            diagnostic: AbstainDiagnostic {
                n_observations: 800,
                ci_width_if_emitted: None,
                nearest_feasible_utility: Some(0.1),
                tail_ratio_p99_p95: None,
                model_version: "a3-0.1.0".into(),
                regime_posterior: [0.7, 0.2, 0.1],
            },
        };
        let dto = RecommendationDto::from(&rec);
        let json = serde_json::to_string(&dto).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["kind"], "abstain");
        assert_eq!(v["status"], "NO_OPPORTUNITY");
        assert_eq!(v["reason"], "no_opportunity");
    }
}
