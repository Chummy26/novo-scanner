//! Schema `LabeledTrade` — label supervisionado do objetivo ML.
//!
//! Wave V 2026-04-21. Correções PhD rodada 1 (C1-C5, A1-A6) e rodada 2
//! (P1-P6, Q1-Q5) integradas.
//!
//! # Semântica canônica
//!
//! - `entry_locked_pct = entry_spread(t0)` é **imutável por design**
//!   (skill §3.1 — "preços executados, não cotados"). O operador já entrou
//!   em t0; não é hipótese futura.
//! - Label resolve APENAS `exit(t1)` em `[t0, t0+horizon_s]` com t1 > t0.
//! - O alvo supervisionado principal é `first_exit_ge_label_floor_*` com
//!   censura; `best_exit_pct`/`best_gross_pct` são auditoria hindsight.
//!
//! # Opção B: 1 record por (sample_id, horizon_s)
//!
//! Cada horizonte (15 min, 30 min, 2 h) escreve seu próprio record quando
//! fecha. JSONL é append-only; sem update in-place. Smoke test vê h15m em
//! 15 min sem esperar 2 h.
//!
//! # Alvos contínuos vs first-hit
//!
//! - First-hit (alvo principal anti-hindsight): `first_exit_ge_label_floor_*`
//!   com `label_floor_pct` explícito — falsificável sem conhecer a melhor
//!   saída absoluta da trajetória.
//! - Alvos contínuos: `best_exit_pct`, `best_gross_pct`, `T_to_best_s`.
//!   **Oracle hindsight** — usar apenas como auditoria/pesquisa ou alvo
//!   auxiliar explicitamente separado.
//!
//! # Fronteira ML
//!
//! Proibido por CLAUDE.md + skill §Fronteira: fees, funding, slippage,
//! PnL líquido, position sizing. Label só mede **lucro bruto cotado**.

use crate::ml::contract::RouteId;

/// Versão atual do schema do LabeledTrade.
///
/// v4 (2026-04-22): adiciona `sample_decision` e `label_floor_hits`
/// multi-threshold. Mantem os campos first-hit primarios por compatibilidade,
/// mas permite treinar P(exit >= floor | state, floor) sem congelar o modelo
/// em um unico floor global.
/// v5 (2026-04-23): `gross_run_*` passa a significar run histórico de
/// `exit >= label_floor - entry_locked(t0)`; `sampling_probability` do label
/// serializa null quando a probabilidade efetiva depende do stride por rota.
pub const LABELED_TRADE_SCHEMA_VERSION: u16 = 5;

/// Scanner version — mesma convenção dos outros schemas.
pub const SCANNER_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Outcome resolvido de um horizonte do label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LabelOutcome {
    /// `first_exit_ge_label_floor` existe dentro de `[t0, t0+h]`.
    Realized,
    /// Horizonte completo observado; first-hit nunca ocorreu.
    Miss,
    /// Horizonte não foi observado por inteiro (rota silenciou ou shutdown).
    Censored,
}

impl LabelOutcome {
    pub fn as_str(self) -> &'static str {
        match self {
            LabelOutcome::Realized => "realized",
            LabelOutcome::Miss => "miss",
            LabelOutcome::Censored => "censored",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CensorReason {
    RouteVanished,
    IncompleteWindow,
    Shutdown,
}

impl CensorReason {
    pub fn as_str(self) -> &'static str {
        match self {
            CensorReason::RouteVanished => "route_vanished",
            CensorReason::IncompleteWindow => "incomplete_window",
            CensorReason::Shutdown => "shutdown",
        }
    }
}

/// Features observadas em t0 (estado estrutural de spread bruto).
#[derive(Debug, Clone)]
pub struct FeaturesT0 {
    pub buy_vol24: f64,
    pub sell_vol24: f64,
    pub tail_ratio_p99_p95: Option<f32>,
    pub entry_p25_24h: Option<f32>,
    pub entry_p50_24h: Option<f32>,
    pub entry_p75_24h: Option<f32>,
    pub entry_p95_24h: Option<f32>,
    pub exit_p25_24h: Option<f32>,
    pub exit_p50_24h: Option<f32>,
    pub exit_p75_24h: Option<f32>,
    pub exit_p95_24h: Option<f32>,
    /// Duração histórica de janelas em que `entry_locked(t0) + exit_hist`
    /// teria atingido o `label_floor_pct` primário. Computado como run de
    /// `exit_hist >= label_floor_pct - entry_locked(t0)`, não como
    /// `entry(t)+exit(t)` simultâneo.
    pub gross_run_p05_s: Option<u32>,
    pub gross_run_p50_s: Option<u32>,
    pub gross_run_p95_s: Option<u32>,
    pub listing_age_days: Option<f32>,
}

/// Metadados de policy (auditoria, não target do modelo — correção A1/P3).
#[derive(Debug, Clone)]
pub struct PolicyMetadata {
    pub baseline_model_version: String,
    pub baseline_recommended: bool,
    pub baseline_historical_base_rate_24h: Option<f32>,
    pub baseline_derived_enter_at_min: Option<f32>,
    pub baseline_derived_exit_at_min: Option<f32>,
    pub baseline_floor_pct: f32,
    pub label_stride_s: u32,
    /// Probabilidade efetiva do label quando conhecida.
    ///
    /// No runtime atual, o labeler usa stride por rota, não amostragem
    /// Bernoulli independente. A probabilidade efetiva depende da taxa
    /// observada de candidates por rota/horizonte; quando não for conhecida
    /// online, serializa como `null` e o trainer deve estimar offline.
    pub label_sampling_probability: f32,
}

/// Resultado first-hit para um floor bruto especifico.
///
/// O primeiro elemento normalmente replica `label_floor_pct` e os campos
/// `first_exit_ge_label_floor_*` para compatibilidade. Demais elementos
/// permitem estimar a curva condicional P(exit atinge floor) sem oracle de
/// melhor saida absoluta.
#[derive(Debug, Clone)]
pub struct FloorHitLabel {
    pub floor_pct: f32,
    pub first_exit_ge_floor_ts_ns: Option<u64>,
    pub first_exit_ge_floor_pct: Option<f32>,
    pub t_to_first_hit_s: Option<u32>,
    pub realized: bool,
}

/// `LabeledTrade` — 1 record por `(sample_id, horizon_s)` conforme Opção B.
#[derive(Debug, Clone)]
pub struct LabeledTrade {
    // Identificação & join
    pub sample_id: String,
    pub sample_decision: &'static str,
    pub horizon_s: u32,
    pub ts_emit_ns: u64,
    pub cycle_seq: u32,
    pub schema_version: u16,
    pub scanner_version: &'static str,
    pub route_id: RouteId,
    pub symbol_name: String,

    // Entrada TRAVADA em t0 (imutável, skill §3.1)
    pub entry_locked_pct: f32,
    pub exit_start_pct: f32,

    // Features t0
    pub features_t0: FeaturesT0,

    // Auditoria oracle/hindsight — não é o target principal do modelo.
    pub best_exit_pct: Option<f32>,
    pub best_exit_ts_ns: Option<u64>,
    pub best_gross_pct: Option<f32>,
    pub t_to_best_s: Option<u32>,
    pub n_clean_future_samples: u32,

    // Alvos first-hit DERIVADOS de floor explícito (anti-hindsight)
    pub label_floor_pct: f32,
    pub first_exit_ge_label_floor_ts_ns: Option<u64>,
    pub first_exit_ge_label_floor_pct: Option<f32>,
    pub t_to_first_hit_s: Option<u32>,
    pub label_floor_hits: Vec<FloorHitLabel>,

    // Outcome + 3 timestamps distintos por semântica (correção P5)
    pub outcome: LabelOutcome,
    pub censor_reason: Option<CensorReason>,
    pub observed_until_ns: u64,
    pub closed_ts_ns: u64,
    pub written_ts_ns: u64,

    // Policy metadata (não é target)
    pub policy_metadata: PolicyMetadata,

    // Contexto de tier bruto. `sampling_probability` pode ser null quando
    // a probabilidade efetiva do label depende do stride por rota.
    pub sampling_tier: &'static str,
    pub sampling_probability: f32,
}

impl LabeledTrade {
    /// Serializa para linha JSON (sem newline).
    pub fn to_json_line(&self) -> String {
        let censor_str = self
            .censor_reason
            .map(|r| format!("\"{}\"", r.as_str()))
            .unwrap_or_else(|| "null".to_string());
        let label_floor_hits = floor_hits_json(&self.label_floor_hits);

        format!(
            concat!(
                r#"{{"sample_id":"{}","sample_decision":"{}","horizon_s":{},"ts_emit_ns":{},"cycle_seq":{},"#,
                r#""schema_version":{},"scanner_version":"{}","#,
                r#""symbol_id":{},"symbol_name":"{}","#,
                r#""buy_venue":"{}","sell_venue":"{}","#,
                r#""buy_market":"{}","sell_market":"{}","#,
                r#""entry_locked_pct":{},"exit_start_pct":{},"#,
                r#""features_t0":{{"buy_vol24":{},"sell_vol24":{},"#,
                r#""tail_ratio_p99_p95":{},"entry_p25_24h":{},"entry_p50_24h":{},"#,
                r#""entry_p75_24h":{},"entry_p95_24h":{},"exit_p25_24h":{},"#,
                r#""exit_p50_24h":{},"exit_p75_24h":{},"exit_p95_24h":{},"#,
                r#""gross_run_p05_s":{},"gross_run_p50_s":{},"gross_run_p95_s":{},"#,
                r#""listing_age_days":{}}},"#,
                r#""best_exit_pct":{},"best_exit_ts_ns":{},"best_gross_pct":{},"#,
                r#""t_to_best_s":{},"n_clean_future_samples":{},"#,
                r#""label_floor_pct":{},"first_exit_ge_label_floor_ts_ns":{},"#,
                r#""first_exit_ge_label_floor_pct":{},"t_to_first_hit_s":{},"#,
                r#""label_floor_hits":{},"#,
                r#""outcome":"{}","censor_reason":{},"#,
                r#""observed_until_ns":{},"closed_ts_ns":{},"written_ts_ns":{},"#,
                r#""policy_metadata":{{"baseline_model_version":"{}","#,
                r#""baseline_recommended":{},"baseline_historical_base_rate_24h":{},"#,
                r#""baseline_derived_enter_at_min":{},"baseline_derived_exit_at_min":{},"#,
                r#""baseline_floor_pct":{},"label_stride_s":{},"#,
                r#""label_sampling_probability":{}}},"#,
                r#""sampling_tier":"{}","sampling_probability":{}}}"#,
            ),
            self.sample_id,
            self.sample_decision,
            self.horizon_s,
            self.ts_emit_ns,
            self.cycle_seq,
            self.schema_version,
            self.scanner_version,
            self.route_id.symbol_id.0,
            escape_json(&self.symbol_name),
            self.route_id.buy_venue.as_str(),
            self.route_id.sell_venue.as_str(),
            self.route_id.buy_venue.market().as_str(),
            self.route_id.sell_venue.market().as_str(),
            f32_or_null(self.entry_locked_pct),
            f32_or_null(self.exit_start_pct),
            f64_or_null(self.features_t0.buy_vol24),
            f64_or_null(self.features_t0.sell_vol24),
            opt_f32(self.features_t0.tail_ratio_p99_p95),
            opt_f32(self.features_t0.entry_p25_24h),
            opt_f32(self.features_t0.entry_p50_24h),
            opt_f32(self.features_t0.entry_p75_24h),
            opt_f32(self.features_t0.entry_p95_24h),
            opt_f32(self.features_t0.exit_p25_24h),
            opt_f32(self.features_t0.exit_p50_24h),
            opt_f32(self.features_t0.exit_p75_24h),
            opt_f32(self.features_t0.exit_p95_24h),
            opt_u32(self.features_t0.gross_run_p05_s),
            opt_u32(self.features_t0.gross_run_p50_s),
            opt_u32(self.features_t0.gross_run_p95_s),
            opt_f32(self.features_t0.listing_age_days),
            opt_f32(self.best_exit_pct),
            opt_u64(self.best_exit_ts_ns),
            opt_f32(self.best_gross_pct),
            opt_u32(self.t_to_best_s),
            self.n_clean_future_samples,
            f32_or_null(self.label_floor_pct),
            opt_u64(self.first_exit_ge_label_floor_ts_ns),
            opt_f32(self.first_exit_ge_label_floor_pct),
            opt_u32(self.t_to_first_hit_s),
            label_floor_hits,
            self.outcome.as_str(),
            censor_str,
            self.observed_until_ns,
            self.closed_ts_ns,
            self.written_ts_ns,
            escape_json(&self.policy_metadata.baseline_model_version),
            self.policy_metadata.baseline_recommended,
            opt_f32(self.policy_metadata.baseline_historical_base_rate_24h),
            opt_f32(self.policy_metadata.baseline_derived_enter_at_min),
            opt_f32(self.policy_metadata.baseline_derived_exit_at_min),
            f32_or_null(self.policy_metadata.baseline_floor_pct),
            self.policy_metadata.label_stride_s,
            f32_or_null(self.policy_metadata.label_sampling_probability),
            self.sampling_tier,
            f32_or_null(self.sampling_probability),
        )
    }
}

#[inline]
fn f32_or_null(v: f32) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
    }
}
#[inline]
fn f64_or_null(v: f64) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
    }
}
#[inline]
fn opt_f32(o: Option<f32>) -> String {
    match o {
        Some(v) => f32_or_null(v),
        None => "null".to_string(),
    }
}
#[inline]
fn opt_u32(o: Option<u32>) -> String {
    match o {
        Some(v) => v.to_string(),
        None => "null".to_string(),
    }
}
#[inline]
fn opt_u64(o: Option<u64>) -> String {
    match o {
        Some(v) => v.to_string(),
        None => "null".to_string(),
    }
}
#[inline]
fn escape_json(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn floor_hits_json(hits: &[FloorHitLabel]) -> String {
    let mut out = String::from("[");
    for (idx, hit) in hits.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push_str(&format!(
            concat!(
                r#"{{"floor_pct":{},"first_exit_ge_floor_ts_ns":{},"#,
                r#""first_exit_ge_floor_pct":{},"t_to_first_hit_s":{},"#,
                r#""realized":{}}}"#
            ),
            f32_or_null(hit.floor_pct),
            opt_u64(hit.first_exit_ge_floor_ts_ns),
            opt_f32(hit.first_exit_ge_floor_pct),
            opt_u32(hit.t_to_first_hit_s),
            hit.realized,
        ));
    }
    out.push(']');
    out
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(42),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_label() -> LabeledTrade {
        LabeledTrade {
            sample_id: "abcdef0123456789abcdef0123456789".into(),
            sample_decision: "accept",
            horizon_s: 900,
            ts_emit_ns: 1_700_000_000_000_000_000,
            cycle_seq: 42,
            schema_version: LABELED_TRADE_SCHEMA_VERSION,
            scanner_version: SCANNER_VERSION,
            route_id: mk_route(),
            symbol_name: "BTC-USDT".into(),
            entry_locked_pct: 2.5,
            exit_start_pct: -1.2,
            features_t0: FeaturesT0 {
                buy_vol24: 1e6,
                sell_vol24: 2e6,
                tail_ratio_p99_p95: Some(1.8),
                entry_p25_24h: Some(1.4),
                entry_p50_24h: Some(2.0),
                entry_p75_24h: Some(2.4),
                entry_p95_24h: Some(3.0),
                exit_p25_24h: Some(-1.4),
                exit_p50_24h: Some(-1.1),
                exit_p75_24h: Some(-0.8),
                exit_p95_24h: Some(-0.5),
                gross_run_p05_s: Some(30),
                gross_run_p50_s: Some(120),
                gross_run_p95_s: Some(600),
                listing_age_days: Some(14.0),
            },
            best_exit_pct: Some(-0.3),
            best_exit_ts_ns: Some(1_700_000_000_000_000_000 + 300 * 1_000_000_000),
            best_gross_pct: Some(2.2),
            t_to_best_s: Some(300),
            n_clean_future_samples: 60,
            label_floor_pct: 0.8,
            first_exit_ge_label_floor_ts_ns: Some(
                1_700_000_000_000_000_000 + 120 * 1_000_000_000,
            ),
            first_exit_ge_label_floor_pct: Some(-1.7),
            t_to_first_hit_s: Some(120),
            label_floor_hits: vec![
                FloorHitLabel {
                    floor_pct: 0.5,
                    first_exit_ge_floor_ts_ns: Some(
                        1_700_000_000_000_000_000 + 60 * 1_000_000_000,
                    ),
                    first_exit_ge_floor_pct: Some(-1.9),
                    t_to_first_hit_s: Some(60),
                    realized: true,
                },
                FloorHitLabel {
                    floor_pct: 0.8,
                    first_exit_ge_floor_ts_ns: Some(
                        1_700_000_000_000_000_000 + 120 * 1_000_000_000,
                    ),
                    first_exit_ge_floor_pct: Some(-1.7),
                    t_to_first_hit_s: Some(120),
                    realized: true,
                },
                FloorHitLabel {
                    floor_pct: 3.0,
                    first_exit_ge_floor_ts_ns: None,
                    first_exit_ge_floor_pct: None,
                    t_to_first_hit_s: None,
                    realized: false,
                },
            ],
            outcome: LabelOutcome::Realized,
            censor_reason: None,
            observed_until_ns: 1_700_000_000_000_000_000 + 900 * 1_000_000_000,
            closed_ts_ns: 1_700_000_000_000_000_000 + 900 * 1_000_000_000 + 1_000_000_000,
            written_ts_ns: 1_700_000_000_000_000_000 + 900 * 1_000_000_000 + 2_000_000_000,
            policy_metadata: PolicyMetadata {
                baseline_model_version: "baseline-a3-0.2.0".into(),
                baseline_recommended: true,
                baseline_historical_base_rate_24h: Some(0.77),
                baseline_derived_enter_at_min: Some(1.9),
                baseline_derived_exit_at_min: Some(-1.1),
                baseline_floor_pct: 0.8,
                label_stride_s: 60,
                label_sampling_probability: 1.0,
            },
            sampling_tier: "allowlist",
            sampling_probability: 1.0,
        }
    }

    #[test]
    fn json_line_is_parseable_and_carries_all_fields() {
        let l = mk_label();
        let line = l.to_json_line();
        assert!(!line.contains('\n'));
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(v["sample_id"], "abcdef0123456789abcdef0123456789");
        assert_eq!(v["sample_decision"], "accept");
        assert_eq!(v["horizon_s"], 900);
        assert_eq!(v["schema_version"], 5);
        assert_eq!(v["symbol_name"], "BTC-USDT");
        assert_eq!(v["entry_locked_pct"], 2.5);
        assert_eq!(v["outcome"], "realized");
        assert!(v["censor_reason"].is_null());
        assert_eq!(v["label_floor_pct"], 0.8);
        assert_eq!(v["label_floor_hits"].as_array().unwrap().len(), 3);
        assert_eq!(v["label_floor_hits"][0]["floor_pct"], 0.5);
        assert_eq!(v["label_floor_hits"][2]["realized"], false);
        assert_eq!(v["policy_metadata"]["baseline_model_version"], "baseline-a3-0.2.0");
        assert_eq!(v["sampling_tier"], "allowlist");
        assert_eq!(v["features_t0"]["entry_p95_24h"], 3.0);
        assert_eq!(v["features_t0"]["exit_p25_24h"], -1.4);
        assert_eq!(v["features_t0"]["gross_run_p50_s"], 120);
        assert_eq!(v["features_t0"]["listing_age_days"], 14.0);
        assert!(v["features_t0"].get("buy_book_age_ms").is_none());
        assert!(v["features_t0"].get("sell_book_age_ms").is_none());
        assert!(v["features_t0"].get("halt_active").is_none());
        assert!(v["features_t0"].get("toxicity_level").is_none());
    }

    #[test]
    fn censored_outcome_serializes_reason() {
        let mut l = mk_label();
        l.outcome = LabelOutcome::Censored;
        l.censor_reason = Some(CensorReason::RouteVanished);
        l.best_exit_pct = None;
        l.best_gross_pct = None;
        l.best_exit_ts_ns = None;
        l.t_to_best_s = None;
        l.first_exit_ge_label_floor_ts_ns = None;
        l.first_exit_ge_label_floor_pct = None;
        l.t_to_first_hit_s = None;
        let line = l.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(v["outcome"], "censored");
        assert_eq!(v["censor_reason"], "route_vanished");
        assert!(v["best_exit_pct"].is_null());
        assert!(v["first_exit_ge_label_floor_ts_ns"].is_null());
    }

    #[test]
    fn miss_outcome_has_no_hit_but_has_observation_window() {
        let mut l = mk_label();
        l.outcome = LabelOutcome::Miss;
        l.first_exit_ge_label_floor_ts_ns = None;
        l.first_exit_ge_label_floor_pct = None;
        l.t_to_first_hit_s = None;
        let line = l.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(v["outcome"], "miss");
        assert!(v["censor_reason"].is_null());
        assert!(v["first_exit_ge_label_floor_ts_ns"].is_null());
        // Mesmo em miss, best_exit_pct é um número (melhor da janela).
        assert!(v["best_exit_pct"].is_number());
    }

    #[test]
    fn three_timestamps_are_distinct() {
        let l = mk_label();
        assert!(l.observed_until_ns <= l.closed_ts_ns);
        assert!(l.closed_ts_ns <= l.written_ts_ns);
    }

}
