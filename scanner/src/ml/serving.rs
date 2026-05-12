//! Serving síncrono do recomendador ML (MVP).
//!
//! Coordena os componentes já implementados:
//!
//! 1. `HotQueryCache` (ADR-012 Camada 1b) — recebe observação de spread.
//! 2. `SamplingTrigger` (ADR-009 + ADR-014) — decide se snapshot entra
//!    no dataset (para shadow mode posterior).
//! 3. `BaselineA3` (ADR-001) — gera proxy degradado que só atravessa como
//!    `Trade` se os invariantes finais de calibração estiverem completos.
//!
//! # Por que síncrono no MVP (não A2 thread dedicada)
//!
//! ADR-010 (A2 thread dedicada com `crossbeam::bounded(1)` + `ArcSwap`
//! + `core_affinity` + circuit breaker) foi desenhado para acomodar o
//! **modelo A2 composta** (QRF + CatBoost + RSF via tract ONNX), que tem
//! latência de ~28 µs + overhead de panic potencial e exige failure
//! isolation estrita.
//!
//! **Baseline A3 é diferente**:
//! - Latência ~1–5 µs (lookup `hdrhistogram` + aritmética simples).
//! - Puro Rust seguro (sem `unsafe`, sem SIMD manual, sem FFI).
//! - Sem estado entre chamadas além do `HotQueryCache`.
//!
//! Executar A3 inline no loop 150 ms do scanner (`spread::engine`) é
//! seguro e simples. Thread dedicada adiciona complexidade (canais,
//! sincronização, debugging) sem ganho material para baseline.
//!
//! **Quando migrar para thread dedicada (ADR-010 completo)**:
//! - Marco 2, quando modelo A2 entra em produção.
//! - Ou se benchmark mostrar que inline A3 impacta latência do scanner
//!   além de ~5% do budget de 150 ms.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use crate::ml::baseline::BaselineA3;
use crate::ml::contract::{
    AbstainDiagnostic, AbstainReason, CalibStatus, Recommendation, RouteId, SourceKind, TradeSetup,
};
use crate::ml::economic::{EconomicAccumulator, EconomicEvent, EconomicMetrics, TradeOutcome};
use crate::ml::eval::{verify_tradesetup, InvariantError};
use crate::ml::feature_store::{
    CacheConfig, HotCacheStats, HotCacheSweepStats, HotQueryCache, HOT_CACHE_POLICY_VERSION,
};
use crate::ml::listing_history::{
    ListingHistory, RouteLifecycle, DEFAULT_DELISTING_DETECTION_WINDOW_NS,
};
use crate::ml::persistence::label_resolver::{LabelResolverAsyncError, LabelResolverAsyncHandle};
use crate::ml::persistence::label_resolver::{DEFAULT_HORIZONS_S, DEFAULT_LABEL_FLOORS_PCT};
use crate::ml::persistence::sample_id::sample_id_of;
use crate::ml::persistence::{
    AcceptedSample, DecisionResult, FeaturesT0, LabelResolver, PolicyMetadata, RawSample,
    RawWriterHandle, RouteDecimator, RouteRanking, SamplingTier,
};
use crate::ml::trigger::{SampleDecision, SamplingTrigger};
use ahash::AHashMap;
use parking_lot::Mutex;

/// Horizonte mínimo (ns) antes de um trade pending poder ser resolvido.
/// Identidade §2 da skill: soma intra-tick sempre negativa; trade só realiza
/// em tick posterior ao da emissão. Default: 1 ciclo do scanner = 150 ms.
const MIN_HORIZON_NS: u64 = 150_000_000;
const FEATURE_WINDOW_1H_NS: u64 = 60 * 60 * 1_000_000_000;
const FEATURE_WINDOW_7D_NS: u64 = 7 * 24 * 60 * 60 * 1_000_000_000;
const FEATURE_WINDOW_7D_DECIMATION_MULTIPLIER: u32 = 12;

struct RecommendationPersistence {
    baseline_recommended: bool,
    baseline_base_rate: Option<f32>,
    baseline_enter_at_min: Option<f32>,
    baseline_exit_at_min: Option<f32>,
    recommendation_kind: &'static str,
    abstain_reason: Option<&'static str>,
    prediction_source_kind: &'static str,
    prediction_model_version: String,
    prediction_emitted_at_ns: Option<u64>,
    prediction_valid_until_ns: Option<u64>,
    prediction_entry_now: Option<f32>,
    prediction_exit_target: Option<f32>,
    prediction_gross_profit_target: Option<f32>,
    prediction_p_hit: Option<f32>,
    prediction_p_hit_ci_lo: Option<f32>,
    prediction_p_hit_ci_hi: Option<f32>,
    prediction_exit_q25: Option<f32>,
    prediction_exit_q50: Option<f32>,
    prediction_exit_q75: Option<f32>,
    prediction_t_hit_p25_s: Option<u32>,
    prediction_t_hit_median_s: Option<u32>,
    prediction_t_hit_p75_s: Option<u32>,
    prediction_p_censor: Option<f32>,
    prediction_calibration_status: &'static str,
}

fn recommendation_persistence(rec: &Recommendation) -> RecommendationPersistence {
    match rec {
        Recommendation::Trade(ts) => {
            let d = ts.baseline_diagnostics.as_ref();
            let (ci_lo, ci_hi) = ts
                .p_hit_ci
                .map(|(lo, hi)| (Some(lo), Some(hi)))
                .unwrap_or((None, None));
            RecommendationPersistence {
                baseline_recommended: true,
                baseline_base_rate: d.map(|d| d.historical_base_rate_24h),
                baseline_enter_at_min: d.map(|d| d.enter_at_min),
                baseline_exit_at_min: d.map(|d| d.exit_at_min),
                recommendation_kind: "trade",
                abstain_reason: None,
                prediction_source_kind: ts.source_kind.as_str(),
                prediction_model_version: ts.model_version.clone(),
                prediction_emitted_at_ns: Some(ts.emitted_at),
                prediction_valid_until_ns: Some(ts.valid_until),
                prediction_entry_now: Some(ts.entry_now),
                prediction_exit_target: Some(ts.exit_target),
                prediction_gross_profit_target: Some(ts.gross_profit_target),
                prediction_p_hit: ts.p_hit,
                prediction_p_hit_ci_lo: ci_lo,
                prediction_p_hit_ci_hi: ci_hi,
                prediction_exit_q25: ts.exit_q25,
                prediction_exit_q50: ts.exit_q50,
                prediction_exit_q75: ts.exit_q75,
                prediction_t_hit_p25_s: ts.t_hit_p25_s,
                prediction_t_hit_median_s: ts.t_hit_median_s,
                prediction_t_hit_p75_s: ts.t_hit_p75_s,
                prediction_p_censor: ts.p_censor,
                prediction_calibration_status: calib_status_label(ts.calibration_status),
            }
        }
        Recommendation::Abstain { reason, diagnostic } => RecommendationPersistence {
            baseline_recommended: false,
            baseline_base_rate: None,
            baseline_enter_at_min: None,
            baseline_exit_at_min: None,
            recommendation_kind: "abstain",
            abstain_reason: Some(abstain_reason_label(*reason)),
            prediction_source_kind: "baseline",
            prediction_model_version: diagnostic.model_version.clone(),
            prediction_emitted_at_ns: None,
            prediction_valid_until_ns: None,
            prediction_entry_now: None,
            prediction_exit_target: None,
            prediction_gross_profit_target: None,
            prediction_p_hit: None,
            prediction_p_hit_ci_lo: None,
            prediction_p_hit_ci_hi: None,
            prediction_exit_q25: None,
            prediction_exit_q50: None,
            prediction_exit_q75: None,
            prediction_t_hit_p25_s: None,
            prediction_t_hit_median_s: None,
            prediction_t_hit_p75_s: None,
            prediction_p_censor: None,
            prediction_calibration_status: "not_applicable",
        },
    }
}

fn background_recommendation_persistence(model_version: &str) -> RecommendationPersistence {
    RecommendationPersistence {
        baseline_recommended: false,
        baseline_base_rate: None,
        baseline_enter_at_min: None,
        baseline_exit_at_min: None,
        recommendation_kind: "abstain",
        abstain_reason: Some("NO_OPPORTUNITY"),
        prediction_source_kind: "none",
        prediction_model_version: model_version.to_string(),
        prediction_emitted_at_ns: None,
        prediction_valid_until_ns: None,
        prediction_entry_now: None,
        prediction_exit_target: None,
        prediction_gross_profit_target: None,
        prediction_p_hit: None,
        prediction_p_hit_ci_lo: None,
        prediction_p_hit_ci_hi: None,
        prediction_exit_q25: None,
        prediction_exit_q50: None,
        prediction_exit_q75: None,
        prediction_t_hit_p25_s: None,
        prediction_t_hit_median_s: None,
        prediction_t_hit_p75_s: None,
        prediction_p_censor: None,
        prediction_calibration_status: "not_applicable",
    }
}

fn half_spreads_from_books(
    buy_bid_price: Option<f64>,
    buy_ask_price: Option<f64>,
    sell_bid_price: Option<f64>,
    sell_ask_price: Option<f64>,
) -> (Option<f32>, Option<f32>) {
    let half_spread_buy_now = match (buy_bid_price, buy_ask_price) {
        (Some(bid), Some(ask)) if bid.is_finite() && ask.is_finite() && ask > 0.0 && ask >= bid => {
            Some((((ask - bid) / ask) * 50.0) as f32)
        }
        _ => None,
    };
    let half_spread_sell_now = match (sell_bid_price, sell_ask_price, buy_ask_price) {
        (Some(bid), Some(ask), Some(base))
            if bid.is_finite()
                && ask.is_finite()
                && base.is_finite()
                && base > 0.0
                && ask >= bid =>
        {
            Some((((ask - bid) / base) * 50.0) as f32)
        }
        _ => None,
    };
    (half_spread_buy_now, half_spread_sell_now)
}

fn abstain_reason_label(reason: AbstainReason) -> &'static str {
    match reason {
        AbstainReason::NoOpportunity => "NO_OPPORTUNITY",
        AbstainReason::InsufficientData => "INSUFFICIENT_DATA",
        AbstainReason::LowConfidence => "LOW_CONFIDENCE",
        AbstainReason::LongTail => "LONG_TAIL",
        AbstainReason::Cooldown => "COOLDOWN",
    }
}

fn calib_status_label(status: CalibStatus) -> &'static str {
    match status {
        CalibStatus::Ok => "ok",
        CalibStatus::Degraded => "degraded",
        CalibStatus::Suspended => "suspended",
    }
}

/// Largura máxima de IC 95% antes de abstenção por `LowConfidence`.
const IC_WIDTH_LIMIT: f32 = 0.20;

#[derive(Debug, Clone, Copy)]
struct LabelCandidateSnapshot {
    tier: &'static str,
    probability: f32,
    selected: bool,
}

impl LabelCandidateSnapshot {
    const ACCEPTED_FULL_CAPTURE: Self = Self {
        tier: "accepted_full_capture",
        probability: 1.0,
        selected: true,
    };

    const FOREGROUND_FULL_CAPTURE: Self = Self {
        tier: "foreground_full_capture",
        probability: 1.0,
        selected: true,
    };
}

impl From<DecisionResult> for LabelCandidateSnapshot {
    fn from(d: DecisionResult) -> Self {
        Self {
            tier: d.tier.as_str(),
            probability: d.probability,
            selected: d.should_persist,
        }
    }
}

// ---------------------------------------------------------------------------
// MlServer
// ---------------------------------------------------------------------------

/// Servidor ML síncrono — um ponto de entrada para o loop do scanner.
///
/// Thread-safe: todos os componentes internos são thread-safe
/// (`HotQueryCache` via `RwLock`, `BaselineA3` `Send + Sync`,
/// `SamplingTrigger` `Copy`). Múltiplas threads podem chamar
/// `on_opportunity` concorrentemente — as escritas no cache são
/// serializadas pelo write lock interno.
pub struct MlServer {
    baseline: BaselineA3,
    feature_cache_7d: HotQueryCache,
    trigger: SamplingTrigger,
    listing: ListingHistory,
    economic: Mutex<EconomicTracker>,
    // Métricas mínimas (agregadas; cópia periódica para Prometheus em M1.8).
    metrics: Arc<ServerMetrics>,
    // Sequência monotônica por ciclo — preenchida pelo chamador
    // (spread engine) a cada tick. Permite desambiguar snapshots do mesmo
    // timestamp em `AcceptedSample.cycle_seq`.
    cycle_seq: AtomicU64,
    // ADR-025: stream contínuo pré-trigger. decimator em 3 tiers
    // (allowlist / priority / uniform). Seleção em `decide()`.
    raw_decimator: RouteDecimator,
    raw_writer: Option<RawWriterHandle>,
    // Decimator usado apenas para escolher rejeições/background limpos que
    // viram candidatos supervisionados. Não controla storage físico.
    label_decimator: RouteDecimator,
    // Rankeador rolling que atualiza `raw_decimator` priority_set.
    // `None` quando desabilitado (tests minimalistas).
    route_ranking: Option<Arc<RouteRanking>>,
    // �� resolvedor de labels supervisionados (LabeledTrade).
    // `None` = label disabled (tests legados). Usa `Arc` porque o sweeper
    // task também segura uma cópia.
    label_resolver: Option<Arc<LabelResolver>>,
    label_observer: Option<LabelResolverAsyncHandle>,
    // �� parâmetros de labeling (stride, floor).
    label_stride_s: u32,
    label_floor_pct: f32,
    label_floors_pct: Vec<f32>,
    label_horizons_s: Vec<u32>,
    last_trade_emit_by_route: Mutex<AHashMap<RouteId, u64>>,
    alive_since_by_route: Mutex<AHashMap<RouteId, u64>>,
    opportunity_alive_threshold_pct: f32,
    recommendation_cooldown_ns: u64,
    // Fingerprint da política supervisionada persistida em accepted/labeled.
    // Intencionalmente não inclui `raw_decimation_mod`: mudar storage físico
    // não deve fragmentar datasets supervisionados idênticos.
    runtime_config_hash: String,
    // Fingerprint da política de persistência raw. Persistida apenas no raw.
    raw_persistence_config_hash: String,
    // Parte compartilhada da política de seleção label/background. Estes
    // valores alteram a população supervisionada via allowlist/priority, mesmo
    // enquanto os nomes de config ainda forem `raw_*`.
    label_allowlist_symbols_key: String,
    label_priority_target_coverage: f64,
    label_priority_rerank_interval_s: u64,
    // geração do priority_set (incrementado em set_priority_set_and_bump).
    priority_set_generation_id: AtomicU64,
    priority_set_updated_at_ns: AtomicU64,
}

fn compute_supervised_config_hash(
    trigger: crate::ml::trigger::SamplingConfig,
    baseline: crate::ml::baseline::BaselineConfig,
    label_stride_s: u32,
    label_floor_pct: f32,
    label_floors_pct: &[f32],
    label_horizons_s: &[u32],
    label_background_decimation_mod: u64,
    label_allowlist_symbols_key: &str,
    label_priority_target_coverage: f64,
    label_priority_rerank_interval_s: u64,
    recommendation_cooldown_ns: u64,
    opportunity_alive_threshold_pct: f32,
) -> String {
    let floors = label_floors_pct
        .iter()
        .map(|v| format!("{:.6}", v))
        .collect::<Vec<_>>()
        .join(",");
    let horizons = label_horizons_s
        .iter()
        .map(|v| v.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let config_blob = format!(
        concat!(
            "scanner_version={}|trigger_n_min={}|tail_q={:.6}|min_vol_usd={:.6}|",
            "baseline_floor_pct={:.6}|baseline_n_min={}|baseline_valid_for_s={}|",
            "label_stride_s={}|label_floor_pct={:.6}|label_floors_pct=[{}]|",
            "label_horizons_s=[{}]|label_background_decimation_mod={}|",
            "label_allowlist_symbols=[{}]|label_priority_target_coverage={:.6}|",
            "label_priority_rerank_interval_s={}|",
            "recommendation_cooldown_ns={}|",
            "feature_windows_s=[3600,86400,604800]|opportunity_alive_threshold_pct={:.6}|",
            "hot_cache_policy={}"
        ),
        crate::ml::SCANNER_VERSION,
        trigger.n_min,
        trigger.tail_quantile,
        trigger.min_vol24_usd,
        baseline.floor_pct,
        baseline.n_min,
        baseline.valid_for_s,
        label_stride_s,
        label_floor_pct,
        floors,
        horizons,
        label_background_decimation_mod,
        label_allowlist_symbols_key,
        label_priority_target_coverage,
        label_priority_rerank_interval_s,
        recommendation_cooldown_ns,
        opportunity_alive_threshold_pct,
        HOT_CACHE_POLICY_VERSION,
    );
    format!("{:016x}", crate::ml::util::fnv1a_64(config_blob.as_bytes()))
}

fn compute_raw_persistence_config_hash(supervised_hash: &str, raw_decimation_mod: u64) -> String {
    let config_blob = format!(
        "scanner_version={}|supervised_config_hash={}|raw_decimation_mod={}|",
        crate::ml::SCANNER_VERSION,
        supervised_hash,
        raw_decimation_mod,
    );
    format!("{:016x}", crate::ml::util::fnv1a_64(config_blob.as_bytes()))
}

fn enforce_recommendation_invariants(
    rec: Recommendation,
    n_observations: u32,
    invariant_blocked_counter: Option<&AtomicU64>,
) -> Recommendation {
    match rec {
        Recommendation::Trade(setup) => {
            if let Err(err) = verify_tradesetup(&setup) {
                let model_version = setup.model_version.clone();
                let expected_baseline_proxy = setup.source_kind == SourceKind::Baseline
                    && matches!(
                        err,
                        InvariantError::ActiveTradeMissingCalibratedOutput {
                            field: "source_kind"
                        }
                    );
                if expected_baseline_proxy {
                    tracing::debug!(
                        route = ?setup.route_id,
                        model_version = %model_version,
                        "downgraded baseline Trade proxy before public broadcast"
                    );
                } else {
                    tracing::warn!(
                        route = ?setup.route_id,
                        model_version = %model_version,
                        error = ?err,
                        "blocked invalid TradeSetup before broadcast"
                    );
                }
                if let Some(c) = invariant_blocked_counter {
                    c.fetch_add(1, Ordering::Relaxed);
                }
                Recommendation::Abstain {
                    reason: AbstainReason::LowConfidence,
                    diagnostic: AbstainDiagnostic {
                        n_observations,
                        ci_width_if_emitted: None,
                        nearest_feasible_utility: None,
                        tail_ratio_p99_p95: None,
                        model_version,
                        regime_posterior: [0.0; 3],
                    },
                }
            } else if let Some((lo, hi)) = setup.p_hit_ci {
                let width = (hi - lo).max(0.0);
                if width >= IC_WIDTH_LIMIT {
                    let model_version = setup.model_version.clone();
                    return Recommendation::Abstain {
                        reason: AbstainReason::LowConfidence,
                        diagnostic: AbstainDiagnostic {
                            n_observations,
                            ci_width_if_emitted: Some(width),
                            nearest_feasible_utility: None,
                            tail_ratio_p99_p95: None,
                            model_version,
                            regime_posterior: [0.0; 3],
                        },
                    };
                }
                Recommendation::Trade(setup)
            } else {
                Recommendation::Trade(setup)
            }
        }
        other => other,
    }
}

#[derive(Default, Debug)]
pub struct ServerMetrics {
    pub opportunities_seen: AtomicU64,
    pub sample_accepts: AtomicU64,
    pub sample_rejects_low_volume: AtomicU64,
    pub sample_rejects_insufficient_history: AtomicU64,
    pub sample_rejects_below_tail: AtomicU64,
    pub rec_trade_total: AtomicU64,
    pub rec_abstain_no_opportunity: AtomicU64,
    pub rec_abstain_insufficient_data: AtomicU64,
    pub rec_abstain_low_confidence: AtomicU64,
    pub rec_abstain_long_tail: AtomicU64,
    pub rec_abstain_cooldown: AtomicU64,
    /// Fix pós-auditoria: `enforce_recommendation_invariants` bloqueou
    /// um `TradeSetup` inválido (violação de monotonicidade ou IC). Separar
    /// dos LowConfidence naturais dá visibilidade sobre bugs do baseline.
    pub rec_invariant_blocked: AtomicU64,
    /// ADR-025: RawSample enviado ao writer (fast path).
    pub raw_samples_emitted: AtomicU64,
    pub raw_samples_emitted_allowlist: AtomicU64,
    pub raw_samples_emitted_priority: AtomicU64,
    pub raw_samples_emitted_decimated_uniform: AtomicU64,
    /// ADR-025: canal cheio — sample descartada.
    pub raw_samples_dropped_channel_full: AtomicU64,
    /// ADR-025: writer encerrado — sample descartada.
    pub raw_samples_dropped_channel_closed: AtomicU64,
    /// Fix pós-auditoria: AcceptedSample descartada por canal JSONL cheio.
    pub accepted_samples_dropped_channel_full: AtomicU64,
    /// Fix pós-auditoria: AcceptedSample descartada — canal JSONL fechado.
    pub accepted_samples_dropped_channel_closed: AtomicU64,
}

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
pub struct MlStateSweepStats {
    pub listing_active_routes: usize,
    pub listing_newly_delisted: usize,
    pub cooldown_entries_removed: usize,
    pub alive_entries_removed: usize,
}

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
pub struct MlStateStats {
    pub listing_routes_total: usize,
    pub listing_active_routes: usize,
    pub listing_delisted_routes: usize,
    pub cooldown_entries: usize,
    pub alive_entries: usize,
    pub economic_pending_routes: usize,
    pub economic_pending_trades: usize,
}

#[derive(Debug, Clone)]
struct PendingEconomicTrade {
    setup: TradeSetup,
    last_exit_pct: f32,
    last_observed_ns: u64,
}

impl PendingEconomicTrade {
    fn new(setup: TradeSetup, initial_exit_pct: f32) -> Self {
        // `from_model` agora deriva de `setup.source_kind` — enum
        // explícito substitui prefix match frágil `!starts_with("baseline-")`.
        Self {
            last_observed_ns: setup.emitted_at,
            setup,
            last_exit_pct: initial_exit_pct,
        }
    }

    fn observe(
        &mut self,
        now_ns: u64,
        _entry_spread: f32,
        exit_spread: f32,
    ) -> Option<EconomicEvent> {
        // Fix pós-auditoria: grace period de MIN_HORIZON_NS respeita a
        // identidade estrutural §2 da skill (`S_entrada(t) + S_saída(t) < 0`
        // no mesmo instante). Trade recém-emitido não pode realizar antes
        // do próximo tick do scanner — viola física da estratégia.
        if now_ns < self.setup.emitted_at.saturating_add(MIN_HORIZON_NS) {
            // Apenas registra último exit observado; não avalia hit ainda.
            self.last_observed_ns = now_ns;
            self.last_exit_pct = exit_spread;
            return None;
        }

        if now_ns > self.setup.valid_until {
            // Observação pós-valid_until fecha a janela, mas não pode criar
            // realização fora do horizonte declarado. Usa o último exit
            // observado dentro da janela como forced exit.
            let outcome = TradeOutcome::ExitMiss {
                forced_exit_pct: self.last_exit_pct,
            };
            self.last_observed_ns = now_ns;
            self.last_exit_pct = exit_spread;
            return Some(EconomicEvent::new(&self.setup, outcome, now_ns));
        }

        self.last_observed_ns = now_ns;
        self.last_exit_pct = exit_spread;
        if exit_spread >= self.setup.exit_target {
            // Fix pós-auditoria L14: horizonte em milissegundos para
            // evitar truncamento a 0 em realizações sub-segundo.
            let horizon_observed_ms = now_ns
                .saturating_sub(self.setup.emitted_at)
                .saturating_div(1_000_000)
                .min(u32::MAX as u64) as u32;
            // TradeOutcome::Realized não carrega mais `enter_realized_pct`.
            return Some(EconomicEvent::new(
                &self.setup,
                TradeOutcome::Realized {
                    exit_realized_pct: exit_spread,
                    horizon_observed_ms,
                },
                now_ns,
            ));
        }

        if now_ns >= self.setup.valid_until {
            // TradeOutcome::ExitMiss sem enter_realized.
            let outcome = TradeOutcome::ExitMiss {
                forced_exit_pct: self.last_exit_pct,
            };
            return Some(EconomicEvent::new(&self.setup, outcome, now_ns));
        }

        None
    }
}

#[derive(Default)]
struct EconomicTracker {
    accumulator: EconomicAccumulator,
    pending_by_route: AHashMap<RouteId, VecDeque<PendingEconomicTrade>>,
}

impl EconomicTracker {
    fn new() -> Self {
        Self {
            accumulator: EconomicAccumulator::new(),
            pending_by_route: AHashMap::new(),
        }
    }

    fn metrics(&self) -> Arc<EconomicMetrics> {
        self.accumulator.metrics()
    }

    fn pending_stats(&self) -> (usize, usize) {
        let pending_routes = self.pending_by_route.len();
        let pending_trades = self
            .pending_by_route
            .values()
            .map(VecDeque::len)
            .sum::<usize>();
        (pending_routes, pending_trades)
    }

    fn process(
        &mut self,
        route: RouteId,
        entry_spread: f32,
        exit_spread: f32,
        now_ns: u64,
        rec: &Recommendation,
    ) {
        // Resolve APENAS trades pendentes ANTERIORES ao push.
        // Fix pós-auditoria: a segunda chamada pós-push resolvia o trade
        // recém-criado no mesmo tick em que foi emitido → viola §2 da
        // skill (identidade estrutural de horizon > 0).
        // `PendingEconomicTrade::observe` agora aplica MIN_HORIZON_NS,
        // então mesmo se alguém chamar resolve_route aqui, o novo trade
        // só resolve a partir do próximo tick.
        self.resolve_route(route, entry_spread, exit_spread, now_ns);
        if let Recommendation::Trade(setup) = rec {
            self.pending_by_route
                .entry(route)
                .or_default()
                .push_back(PendingEconomicTrade::new(setup.clone(), exit_spread));
        }
    }

    fn resolve_route(&mut self, route: RouteId, entry_spread: f32, exit_spread: f32, now_ns: u64) {
        let Some(mut queue) = self.pending_by_route.remove(&route) else {
            return;
        };

        let mut keep = VecDeque::with_capacity(queue.len());
        while let Some(mut pending) = queue.pop_front() {
            match pending.observe(now_ns, entry_spread, exit_spread) {
                Some(evt) => self.accumulator.push(evt),
                None => keep.push_back(pending),
            }
        }

        if !keep.is_empty() {
            self.pending_by_route.insert(route, keep);
        }
    }

    /// Sweeper econômico — fecha pendings cuja janela `valid_until` expirou
    /// mesmo sem nova observação (Fix pós-auditoria C2).
    ///
    /// Análogo ao `LabelResolver::sweep`: rotas que silenciam nunca
    /// chamariam `resolve_route(clean)`, deixando `PendingEconomicTrade`
    /// imortais. Isso enviesava `realization_rate` e `pnl_aggregated_usd`.
    ///
    /// Usa `last_exit_pct` observado por último (`0.0` default se nunca
    /// recebeu observação limpa) como `forced_exit_pct` para `ExitMiss`.
    ///
    /// Retorna número de pendings fechados nesta passagem.
    fn sweep(&mut self, now_ns: u64) -> u64 {
        let mut closed = 0u64;
        let mut empty_routes: Vec<RouteId> = Vec::new();
        for (route, queue) in self.pending_by_route.iter_mut() {
            let mut keep = VecDeque::with_capacity(queue.len());
            while let Some(pending) = queue.pop_front() {
                if now_ns >= pending.setup.valid_until {
                    // Timeout só vira miss quando o horizonte foi observado
                    // com dado limpo. Rota silenciosa antes de `valid_until`
                    // é censura, não PnL bruto forçado.
                    let outcome = if pending.last_observed_ns >= pending.setup.valid_until {
                        TradeOutcome::ExitMiss {
                            forced_exit_pct: pending.last_exit_pct,
                        }
                    } else {
                        TradeOutcome::Censored
                    };
                    let evt = EconomicEvent::new(&pending.setup, outcome, now_ns);
                    self.accumulator.push(evt);
                    closed += 1;
                } else {
                    keep.push_back(pending);
                }
            }
            if keep.is_empty() {
                empty_routes.push(*route);
            } else {
                *queue = keep;
            }
        }
        for r in empty_routes {
            self.pending_by_route.remove(&r);
        }
        closed
    }
}

impl MlServer {
    pub fn new(baseline: BaselineA3, trigger: SamplingTrigger) -> Self {
        // fingerprint da config efetiva do dataset. Builders abaixo
        // recomputam depois de aplicar raw/label/cooldown config.
        let raw_decimator = RouteDecimator::new();
        let label_decimator = RouteDecimator::new();
        let label_floors_pct = DEFAULT_LABEL_FLOORS_PCT.to_vec();
        let label_horizons_s = DEFAULT_HORIZONS_S.to_vec();
        let recommendation_cooldown_ns = 60 * 1_000_000_000;
        let label_allowlist_symbols_key = String::new();
        let label_priority_target_coverage = 0.95;
        let label_priority_rerank_interval_s = 3600;
        let runtime_config_hash = compute_supervised_config_hash(
            trigger.config(),
            baseline.config(),
            60,
            0.8,
            &label_floors_pct,
            &label_horizons_s,
            label_decimator.modulus(),
            &label_allowlist_symbols_key,
            label_priority_target_coverage,
            label_priority_rerank_interval_s,
            recommendation_cooldown_ns,
            0.0,
        );
        let raw_persistence_config_hash =
            compute_raw_persistence_config_hash(&runtime_config_hash, raw_decimator.modulus());
        let cache_24h_cfg = baseline.cache().config();
        let seven_day_decimation = if cache_24h_cfg.decimation <= 1 {
            cache_24h_cfg.decimation
        } else {
            cache_24h_cfg
                .decimation
                .saturating_mul(FEATURE_WINDOW_7D_DECIMATION_MULTIPLIER)
                .max(cache_24h_cfg.decimation)
        };
        let feature_cache_7d = HotQueryCache::with_config(CacheConfig {
            window_ns: FEATURE_WINDOW_7D_NS,
            decimation: seven_day_decimation,
            ..cache_24h_cfg
        });
        Self {
            baseline,
            feature_cache_7d,
            trigger,
            listing: ListingHistory::new(),
            economic: Mutex::new(EconomicTracker::new()),
            metrics: Arc::new(ServerMetrics::default()),
            cycle_seq: AtomicU64::new(0),
            raw_decimator,
            label_decimator,
            raw_writer: None,
            route_ranking: None,
            label_resolver: None,
            label_observer: None,
            label_stride_s: 60,
            label_floor_pct: 0.8,
            label_floors_pct,
            label_horizons_s,
            last_trade_emit_by_route: Mutex::new(AHashMap::with_capacity(4096)),
            alive_since_by_route: Mutex::new(AHashMap::with_capacity(4096)),
            opportunity_alive_threshold_pct: 0.0,
            recommendation_cooldown_ns,
            runtime_config_hash,
            raw_persistence_config_hash,
            label_allowlist_symbols_key,
            label_priority_target_coverage,
            label_priority_rerank_interval_s,
            priority_set_generation_id: AtomicU64::new(0),
            priority_set_updated_at_ns: AtomicU64::new(0),
        }
    }

    fn refresh_runtime_config_hash(&mut self) {
        self.runtime_config_hash = compute_supervised_config_hash(
            self.trigger.config(),
            self.baseline.config(),
            self.label_stride_s,
            self.label_floor_pct,
            &self.label_floors_pct,
            &self.label_horizons_s,
            self.label_decimator.modulus(),
            &self.label_allowlist_symbols_key,
            self.label_priority_target_coverage,
            self.label_priority_rerank_interval_s,
            self.recommendation_cooldown_ns,
            self.opportunity_alive_threshold_pct,
        );
        self.raw_persistence_config_hash = compute_raw_persistence_config_hash(
            &self.runtime_config_hash,
            self.raw_decimator.modulus(),
        );
    }

    /// Incrementa geração do priority_set e registra timestamp de update.
    /// Deve ser chamado por quem instala novo snapshot nos decimators raw e
    /// supervisionado.
    pub fn bump_priority_set_generation(&self, now_ns: u64) {
        self.priority_set_generation_id
            .fetch_add(1, Ordering::Relaxed);
        self.priority_set_updated_at_ns
            .store(now_ns, Ordering::Relaxed);
    }

    fn priority_set_metadata_snapshot(&self) -> (u32, u64) {
        if self.route_ranking.is_none() {
            return (0, 0);
        }
        let generation = self
            .priority_set_generation_id
            .load(Ordering::Relaxed)
            .min(u32::MAX as u64) as u32;
        let updated_at = self.priority_set_updated_at_ns.load(Ordering::Relaxed);
        (generation, updated_at)
    }

    /// Conecta o `RawSampleWriter` (ADR-025). Até ser chamado, o server
    /// opera em modo legacy (só `AcceptedSample`).
    pub fn with_raw_writer(mut self, handle: RawWriterHandle) -> Self {
        self.raw_writer = Some(handle);
        self
    }

    /// Substitui o decimator (ex.: `with_modulus(1)` em testes que
    /// querem capturar toda a série).
    pub fn with_raw_decimator(mut self, decimator: RouteDecimator) -> Self {
        self.raw_decimator = decimator;
        self.refresh_runtime_config_hash();
        self
    }

    /// Substitui o decimator de candidatura supervisionada de background.
    /// Separado do raw para que storage físico não mude labels/abstenções.
    pub fn with_label_decimator(mut self, decimator: RouteDecimator) -> Self {
        self.label_decimator = decimator;
        self.refresh_runtime_config_hash();
        self
    }

    /// Versiona a política que escolhe quais rejeições/background entram como
    /// candidatos supervisionados via allowlist e priority_set compartilhados.
    pub fn with_label_population_policy(
        mut self,
        allowlist_symbols_key: String,
        priority_target_coverage: f64,
        priority_rerank_interval_s: u64,
    ) -> Self {
        self.label_allowlist_symbols_key = allowlist_symbols_key;
        self.label_priority_target_coverage = priority_target_coverage;
        self.label_priority_rerank_interval_s = priority_rerank_interval_s;
        self.refresh_runtime_config_hash();
        self
    }

    /// conecta ranker rolling (top-N dinâmico por
    /// `accept_count_24h`) para o tier Priority do `RouteDecimator`.
    pub fn with_route_ranking(mut self, ranker: Arc<RouteRanking>) -> Self {
        self.route_ranking = Some(ranker);
        self
    }

    /// conecta resolvedor de labels supervisionados.
    pub fn with_label_resolver(mut self, resolver: Arc<LabelResolver>) -> Self {
        self.label_horizons_s = resolver.horizons().to_vec();
        self.label_resolver = Some(resolver);
        self.refresh_runtime_config_hash();
        self
    }

    pub fn with_label_observer(mut self, observer: LabelResolverAsyncHandle) -> Self {
        self.label_observer = Some(observer);
        self
    }

    pub fn with_label_config(
        mut self,
        stride_s: u32,
        floor_pct: f32,
        floors_pct: Vec<f32>,
    ) -> Self {
        self.label_stride_s = stride_s;
        self.label_floor_pct = floor_pct;
        self.label_floors_pct = floors_pct;
        self.refresh_runtime_config_hash();
        self
    }

    pub fn with_recommendation_cooldown_s(mut self, cooldown_s: u32) -> Self {
        self.recommendation_cooldown_ns = (cooldown_s as u64) * 1_000_000_000;
        self.refresh_runtime_config_hash();
        self
    }

    pub fn with_opportunity_alive_threshold_pct(mut self, threshold_pct: f32) -> Self {
        self.opportunity_alive_threshold_pct = threshold_pct;
        self.refresh_runtime_config_hash();
        self
    }

    pub fn raw_decimator(&self) -> &RouteDecimator {
        &self.raw_decimator
    }

    pub fn label_decimator(&self) -> &RouteDecimator {
        &self.label_decimator
    }

    pub fn baseline(&self) -> &BaselineA3 {
        &self.baseline
    }

    pub fn metrics(&self) -> Arc<ServerMetrics> {
        Arc::clone(&self.metrics)
    }

    pub fn economic_metrics(&self) -> Arc<EconomicMetrics> {
        self.economic.lock().metrics()
    }

    /// Fix pós-auditoria C2: fecha trades pendentes cujo `valid_until`
    /// expirou mesmo sem nova observação da rota. Chamado periodicamente
    /// por task tokio (análogo ao sweeper do LabelResolver).
    ///
    /// Retorna número de pendings fechados.
    pub fn economic_sweep(&self, now_ns: u64) -> u64 {
        self.economic.lock().sweep(now_ns)
    }

    pub fn state_stats(&self) -> MlStateStats {
        let (economic_pending_routes, economic_pending_trades) =
            self.economic.lock().pending_stats();
        MlStateStats {
            listing_routes_total: self.listing.total_routes(),
            listing_active_routes: self.listing.active_routes(),
            listing_delisted_routes: self.listing.delisted_routes(),
            cooldown_entries: self.last_trade_emit_by_route.lock().len(),
            alive_entries: self.alive_since_by_route.lock().len(),
            economic_pending_routes,
            economic_pending_trades,
        }
    }

    /// Varre estados auxiliares que não são fonte de verdade supervisionada.
    ///
    /// Não remove raw/accepted/labeled, não fecha labels e não altera floors
    /// ou horizontes. Remove apenas entradas cujo efeito operacional ja
    /// expirou: cooldown vencido e rotas "alive" que sumiram por mais que a
    /// janela conservadora de delisting.
    pub fn state_sweep(&self, now_ns: u64) -> MlStateSweepStats {
        let (listing_active_routes, listing_newly_delisted) = self.listing.sweep_inactive(now_ns);
        let cooldown_entries_removed = self.sweep_cooldown_index(now_ns);
        let alive_entries_removed = self.sweep_alive_index(now_ns);
        MlStateSweepStats {
            listing_active_routes,
            listing_newly_delisted,
            cooldown_entries_removed,
            alive_entries_removed,
        }
    }

    fn sweep_cooldown_index(&self, now_ns: u64) -> usize {
        let mut last_by_route = self.last_trade_emit_by_route.lock();
        let before = last_by_route.len();
        if self.recommendation_cooldown_ns == 0 {
            last_by_route.clear();
        } else {
            let cooldown_ns = self.recommendation_cooldown_ns;
            last_by_route
                .retain(|_, last_emit_ns| now_ns < last_emit_ns.saturating_add(cooldown_ns));
        }
        let removed = before.saturating_sub(last_by_route.len());
        if removed > 0 {
            last_by_route.shrink_to_fit();
        }
        removed
    }

    fn sweep_alive_index(&self, now_ns: u64) -> usize {
        let mut alive = self.alive_since_by_route.lock();
        let before = alive.len();
        alive.retain(|route, _| {
            self.listing
                .last_seen(*route)
                .map(|last_seen_ns| {
                    now_ns.saturating_sub(last_seen_ns) <= DEFAULT_DELISTING_DETECTION_WINDOW_NS
                })
                .unwrap_or(false)
        });
        let removed = before.saturating_sub(alive.len());
        if removed > 0 {
            alive.shrink_to_fit();
        }
        removed
    }

    fn apply_trade_cooldown(
        &self,
        route: RouteId,
        now_ns: u64,
        n_observations: u32,
        rec: Recommendation,
    ) -> Recommendation {
        let Recommendation::Trade(setup) = rec else {
            return rec;
        };
        if self.recommendation_cooldown_ns == 0 {
            return Recommendation::Trade(setup);
        }
        let mut last_by_route = self.last_trade_emit_by_route.lock();
        if let Some(prev) = last_by_route.get(&route) {
            if now_ns < prev.saturating_add(self.recommendation_cooldown_ns) {
                return Recommendation::Abstain {
                    reason: AbstainReason::Cooldown,
                    diagnostic: AbstainDiagnostic {
                        n_observations,
                        ci_width_if_emitted: setup.p_hit_ci.map(|(lo, hi)| (hi - lo).max(0.0)),
                        nearest_feasible_utility: Some(setup.gross_profit_target),
                        tail_ratio_p99_p95: None,
                        model_version: setup.model_version,
                        regime_posterior: [0.0; 3],
                    },
                };
            }
        }
        last_by_route.insert(route, now_ns);
        Recommendation::Trade(setup)
    }

    /// Avança o `cycle_seq` — chamado uma vez pelo spread engine no início
    /// de cada ciclo 150ms. Thread-safe via `fetch_add`.
    pub fn begin_cycle(&self) -> u32 {
        // Wrap para u32 — cycle_seq é per-ciclo, não eterno.
        (self.cycle_seq.fetch_add(1, Ordering::Relaxed) & 0xFFFF_FFFF) as u32
    }

    pub fn cycles_started(&self) -> u64 {
        self.cycle_seq.load(Ordering::Relaxed)
    }

    pub fn cache_stats_24h(&self) -> HotCacheStats {
        self.baseline.cache().stats()
    }

    pub fn cache_stats_1h(&self) -> HotCacheStats {
        // A janela curta é derivada sob demanda do ring 24h para não duplicar
        // ticks em RAM. Portanto não há HotQueryCache 1h dedicado.
        HotCacheStats::default()
    }

    pub fn cache_stats_7d(&self) -> HotCacheStats {
        self.feature_cache_7d.stats()
    }

    pub fn cache_sweep_expired(
        &self,
        now_ns: u64,
    ) -> (HotCacheSweepStats, HotCacheSweepStats, HotCacheSweepStats) {
        (
            self.baseline.cache().sweep_expired(now_ns),
            HotCacheSweepStats::default(),
            self.feature_cache_7d.sweep_expired(now_ns),
        )
    }

    fn observe_clean_spread(
        &self,
        route: RouteId,
        entry_spread: f32,
        exit_spread: f32,
        now_ns: u64,
    ) {
        self.baseline
            .cache()
            .observe(route, entry_spread, exit_spread, now_ns);
        self.feature_cache_7d
            .observe(route, entry_spread, exit_spread, now_ns);
    }

    fn dispatch_clean_label_observation(
        &self,
        route: RouteId,
        now_ns: u64,
        entry_spread: f32,
        exit_spread: f32,
    ) {
        let Some(resolver) = self.label_resolver.as_ref() else {
            return;
        };
        if let Some(observer) = self.label_observer.as_ref() {
            if let Err(err) = observer.try_observe_clean(route, now_ns, entry_spread, exit_spread) {
                match err {
                    LabelResolverAsyncError::QueueFull => {
                        panic!(
                            "label_resolver strict-lossless violation: async observation queue full"
                        );
                    }
                    LabelResolverAsyncError::QueueClosed => {
                        panic!(
                            "label_resolver strict-lossless violation: async observation queue closed"
                        );
                    }
                }
            }
        } else {
            resolver.on_clean_observation(route, now_ns, entry_spread, exit_spread);
        }
    }

    fn time_alive_snapshot(&self, route: RouteId, entry_spread: f32, now_ns: u64) -> Option<u32> {
        if entry_spread < self.opportunity_alive_threshold_pct {
            self.alive_since_by_route.lock().remove(&route);
            return None;
        }
        let mut alive = self.alive_since_by_route.lock();
        let since = *alive.entry(route).or_insert(now_ns);
        Some(((now_ns.saturating_sub(since)) / 1_000_000_000).min(u32::MAX as u64) as u32)
    }

    fn clear_alive_if_below_threshold(&self, route: RouteId, entry_spread: f32) {
        if entry_spread < self.opportunity_alive_threshold_pct {
            self.alive_since_by_route.lock().remove(&route);
        }
    }

    fn build_accepted_sample(
        &self,
        sample_dec: SampleDecision,
        now_ns: u64,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        lifecycle: Option<RouteLifecycle>,
    ) -> Option<AcceptedSample> {
        if sample_dec != SampleDecision::Accept {
            return None;
        }
        let mut sample = AcceptedSample::new(
            now_ns,
            cycle_seq,
            route,
            symbol_name,
            entry_spread,
            exit_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            sample_dec,
            self.runtime_config_hash.clone(),
            "accepted_full_capture",
            1.0,
        );
        if let Some(lc) = lifecycle {
            sample.set_lifecycle(
                lc.first_seen_ns,
                lc.last_seen_ns,
                lc.active_until_ns,
                lc.n_snapshots,
            );
        }
        Some(sample)
    }

    fn build_features_t0(
        &self,
        route: RouteId,
        entry_spread: f32,
        now_ns: u64,
        lifecycle: Option<RouteLifecycle>,
        half_spread_buy_now: Option<f32>,
        half_spread_sell_now: Option<f32>,
    ) -> FeaturesT0 {
        let exit_threshold_for_primary_floor = self.label_floor_pct - entry_spread;
        let stats_24h = self.baseline.cache().feature_stats(
            route,
            entry_spread,
            exit_threshold_for_primary_floor,
        );
        let entry_minus_p50_pre = stats_24h.entry_p50.map(|p50| entry_spread - p50);
        let one_hour_cutoff_ns = now_ns.saturating_sub(FEATURE_WINDOW_1H_NS);
        let stats_1h = self.baseline.cache().window_stats(
            route,
            entry_spread,
            exit_threshold_for_primary_floor,
            Some(one_hour_cutoff_ns),
            false,
        );
        let stats_7d = self.feature_cache_7d.window_stats(
            route,
            entry_spread,
            exit_threshold_for_primary_floor,
            None,
            true,
        );
        let n_cache_obs_pre = stats_24h.n_observations as u32;
        let oldest_cache_ts_pre = stats_24h.oldest_observation_ns;
        let time_alive_at_t0_s = self.time_alive_snapshot(route, entry_spread, now_ns);
        let listing_age_days_pre_observe = self.listing.listing_age_days(route, now_ns);

        FeaturesT0 {
            half_spread_buy_now,
            half_spread_sell_now,
            tail_ratio_p99_p95: stats_24h.tail_ratio_p99_p95,
            entry_p25_24h: stats_24h.entry_p25,
            entry_p50_24h: stats_24h.entry_p50,
            entry_p75_24h: stats_24h.entry_p75,
            entry_p95_24h: stats_24h.entry_p95,
            entry_rank_percentile_24h: stats_24h.entry_rank_percentile,
            entry_minus_p50_24h: entry_minus_p50_pre,
            entry_mad_robust_24h: stats_24h.entry_mad_robust,
            exit_p25_24h: stats_24h.exit_p25,
            exit_p50_24h: stats_24h.exit_p50,
            exit_p75_24h: stats_24h.exit_p75,
            exit_p95_24h: stats_24h.exit_p95,
            p_exit_ge_label_floor_minus_entry_24h: stats_24h.p_exit_ge_threshold,
            entry_p50_1h: stats_1h.entry_p50,
            entry_rank_percentile_1h: stats_1h.entry_rank_percentile,
            p_exit_ge_label_floor_minus_entry_1h: stats_1h.p_exit_ge_threshold,
            entry_p50_7d: stats_7d.entry_p50,
            entry_p95_7d: stats_7d.entry_p95,
            p_exit_ge_label_floor_minus_entry_7d: stats_7d.p_exit_ge_threshold,
            gross_run_p05_s: stats_24h.gross_run_p05_s,
            gross_run_p50_s: stats_24h.gross_run_p50_s,
            gross_run_p95_s: stats_24h.gross_run_p95_s,
            exit_excess_run_s: stats_24h.exit_excess_run_s,
            n_cache_observations_at_t0: n_cache_obs_pre,
            oldest_cache_ts_ns: oldest_cache_ts_pre,
            time_alive_at_t0_s,
            listing_age_days: listing_age_days_pre_observe,
            route_first_seen_ns: lifecycle.map(|lc| lc.first_seen_ns),
            route_last_seen_ns: lifecycle.map(|lc| lc.last_seen_ns),
            route_active_until_ns: lifecycle.and_then(|lc| lc.active_until_ns),
            route_n_snapshots: lifecycle.map(|lc| lc.n_snapshots),
        }
    }

    fn label_candidate_snapshot(
        &self,
        sample_dec: SampleDecision,
        route: RouteId,
        now_ns: u64,
        cycle_seq: u32,
    ) -> LabelCandidateSnapshot {
        if sample_dec == SampleDecision::Accept {
            return LabelCandidateSnapshot::ACCEPTED_FULL_CAPTURE;
        }
        LabelCandidateSnapshot::from(
            self.label_decimator
                .decide_for_sample(route, now_ns, cycle_seq),
        )
    }

    fn should_materialize_label_candidate(
        &self,
        resolver: Option<&Arc<LabelResolver>>,
        selected: bool,
        clean: bool,
        route: RouteId,
        now_ns: u64,
    ) -> bool {
        if !clean || !selected {
            return false;
        }
        let Some(resolver) = resolver else {
            return false;
        };
        if resolver.candidate_stride_eligible(route, now_ns, self.label_stride_s) {
            true
        } else {
            resolver.record_stride_skipped();
            false
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn enqueue_label_candidate(
        &self,
        resolver: &Arc<LabelResolver>,
        sample_id: String,
        sample_dec: SampleDecision,
        now_ns: u64,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        features_t0: FeaturesT0,
        sampling_tier: &'static str,
        sampling_probability: f32,
        label_sampling_probability: f32,
        rec_meta: &RecommendationPersistence,
    ) {
        let (candidates_24h, accepts_24h) = self
            .route_ranking
            .as_ref()
            .and_then(|r| {
                r.score_for_route(route).map(|score| {
                    (
                        score.candidate_count_24h.min(u32::MAX as u64) as u32,
                        score.accept_count_24h.min(u32::MAX as u64) as u32,
                    )
                })
            })
            .unwrap_or((0, 0));
        let policy = PolicyMetadata {
            baseline_model_version: self.baseline.config().model_version.to_string(),
            baseline_recommended: rec_meta.baseline_recommended,
            recommendation_kind: rec_meta.recommendation_kind,
            abstain_reason: rec_meta.abstain_reason,
            prediction_source_kind: rec_meta.prediction_source_kind,
            prediction_model_version: rec_meta.prediction_model_version.clone(),
            prediction_emitted_at_ns: rec_meta.prediction_emitted_at_ns,
            prediction_valid_until_ns: rec_meta.prediction_valid_until_ns,
            prediction_entry_now: rec_meta.prediction_entry_now,
            prediction_exit_target: rec_meta.prediction_exit_target,
            prediction_gross_profit_target: rec_meta.prediction_gross_profit_target,
            prediction_p_hit: rec_meta.prediction_p_hit,
            prediction_p_hit_ci_lo: rec_meta.prediction_p_hit_ci_lo,
            prediction_p_hit_ci_hi: rec_meta.prediction_p_hit_ci_hi,
            prediction_exit_q25: rec_meta.prediction_exit_q25,
            prediction_exit_q50: rec_meta.prediction_exit_q50,
            prediction_exit_q75: rec_meta.prediction_exit_q75,
            prediction_t_hit_p25_s: rec_meta.prediction_t_hit_p25_s,
            prediction_t_hit_median_s: rec_meta.prediction_t_hit_median_s,
            prediction_t_hit_p75_s: rec_meta.prediction_t_hit_p75_s,
            prediction_p_censor: rec_meta.prediction_p_censor,
            prediction_calibration_status: rec_meta.prediction_calibration_status,
            baseline_historical_base_rate_24h: rec_meta.baseline_base_rate,
            baseline_derived_enter_at_min: rec_meta.baseline_enter_at_min,
            baseline_derived_exit_at_min: rec_meta.baseline_exit_at_min,
            baseline_floor_pct: self.baseline.config().floor_pct,
            label_stride_s: self.label_stride_s,
            effective_stride_s: self.label_stride_s,
            label_sampling_probability,
            candidates_in_route_last_24h: candidates_24h,
            accepts_in_route_last_24h: accepts_24h,
            ci_method: "wilson_marginal",
        };
        let max_horizon_s = self.label_horizons_s.iter().copied().max().unwrap_or(900);
        let cluster_id =
            crate::ml::persistence::label_resolver::derive_cluster_id_for_horizon_window(
                route,
                now_ns,
                max_horizon_s,
            );
        let cluster_routes = self.listing.active_routes_for_symbol(route.symbol_id);
        let cluster_size = cluster_routes.len().max(1).min(u32::MAX as usize) as u32;
        let cluster_rank = cluster_routes
            .iter()
            .position(|candidate| *candidate == route)
            .map(|idx| idx + 1)
            .unwrap_or(cluster_routes.len().max(1))
            .min(u32::MAX as usize) as u32;
        let runtime_config_hash = self.runtime_config_hash.clone();
        let (priority_gen, priority_updated_ns) = self.priority_set_metadata_snapshot();
        resolver.on_candidate(
            sample_id,
            sample_dec.reason_label(),
            now_ns,
            cycle_seq,
            route,
            symbol_name.to_string(),
            entry_spread,
            exit_spread,
            features_t0,
            self.label_floor_pct,
            self.label_floors_pct.clone(),
            policy,
            sampling_tier,
            sampling_probability,
            self.label_stride_s,
            cluster_id,
            cluster_size,
            cluster_rank,
            runtime_config_hash,
            priority_gen,
            priority_updated_ns,
        );
    }

    /// Observa uma rota válida que não necessariamente é uma oportunidade
    /// acima do threshold do scanner.
    ///
    /// Isto alimenta o histórico PIT do ML e resolve trades pendentes sem
    /// emitir `Recommendation` nem `AcceptedSample`. É essencial para labels
    /// futuros: `exitSpread(t1)` pode melhorar depois que `entrySpread` caiu
    /// abaixo do threshold de UI, e esse caminho não pode desaparecer do
    /// dataset de treinamento.
    #[allow(clippy::too_many_arguments)]
    pub fn observe_background(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        now_ns: u64,
    ) -> (SampleDecision, Option<AcceptedSample>) {
        self.observe_background_inner(
            cycle_seq,
            route,
            symbol_name,
            entry_spread,
            exit_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            None,
            None,
            None,
            None,
            now_ns,
        )
    }

    #[allow(clippy::too_many_arguments)]
    pub fn observe_background_with_books(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        buy_bid_price: f64,
        buy_ask_price: f64,
        sell_bid_price: f64,
        sell_ask_price: f64,
        now_ns: u64,
    ) -> (SampleDecision, Option<AcceptedSample>) {
        self.observe_background_inner(
            cycle_seq,
            route,
            symbol_name,
            entry_spread,
            exit_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            Some(buy_bid_price),
            Some(buy_ask_price),
            Some(sell_bid_price),
            Some(sell_ask_price),
            now_ns,
        )
    }

    #[allow(clippy::too_many_arguments)]
    fn observe_background_inner(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        buy_bid_price: Option<f64>,
        buy_ask_price: Option<f64>,
        sell_bid_price: Option<f64>,
        sell_ask_price: Option<f64>,
        now_ns: u64,
    ) -> (SampleDecision, Option<AcceptedSample>) {
        self.listing.record_seen(route, now_ns);
        let lifecycle = self.listing.snapshot_for(route);
        let (half_spread_buy_now, half_spread_sell_now) =
            half_spreads_from_books(buy_bid_price, buy_ask_price, sell_bid_price, sell_ask_price);
        let clean = self.trigger.is_clean_data(buy_vol24_usd, sell_vol24_usd);
        let sample_dec = self.trigger.evaluate(
            route,
            entry_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            self.baseline.cache(),
        );
        self.bump_sample_metric(sample_dec);
        self.clear_alive_if_below_threshold(route, entry_spread);

        // �� ranker observa (candidate, accepted).
        if let Some(ranker) = self.route_ranking.as_ref() {
            let accepted = matches!(sample_dec, SampleDecision::Accept);
            let vol = buy_vol24_usd.min(sell_vol24_usd);
            ranker.observe(route, now_ns, accepted, vol);
        }

        // Decimator físico do raw: controla apenas persistência raw.
        if let Some(raw_writer) = self.raw_writer.as_ref() {
            let dr = self
                .raw_decimator
                .decide_for_sample(route, now_ns, cycle_seq);
            if dr.should_persist {
                let (priority_gen, priority_updated_ns) = self.priority_set_metadata_snapshot();
                let mut raw = RawSample::with_tier_and_priority_metadata(
                    now_ns,
                    cycle_seq,
                    route,
                    symbol_name,
                    entry_spread,
                    exit_spread,
                    buy_vol24_usd,
                    sell_vol24_usd,
                    sample_dec,
                    dr.tier,
                    dr.probability,
                    priority_gen,
                    priority_updated_ns,
                    self.raw_persistence_config_hash.clone(),
                );
                if let Some(lc) = lifecycle {
                    raw.set_lifecycle(
                        lc.first_seen_ns,
                        lc.last_seen_ns,
                        lc.active_until_ns,
                        lc.n_snapshots,
                    );
                }
                match raw_writer.try_send(raw) {
                    Ok(()) => {
                        self.metrics
                            .raw_samples_emitted
                            .fetch_add(1, Ordering::Relaxed);
                        self.bump_raw_sample_tier_metric(dr.tier);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelFull) => {
                        self.metrics
                            .raw_samples_dropped_channel_full
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelClosed) => {
                        self.metrics
                            .raw_samples_dropped_channel_closed
                            .fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        }

        // Decimator supervisionado: controla apenas quais rejeições/background
        // limpos viram candidatos de label. Storage raw não pode alterar esta
        // população, ou o trainer aprende uma distribuição diferente.
        let label_snapshot = self.label_candidate_snapshot(sample_dec, route, now_ns, cycle_seq);

        let accepted = self.build_accepted_sample(
            sample_dec,
            now_ns,
            cycle_seq,
            route,
            symbol_name,
            entry_spread,
            exit_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            lifecycle,
        );

        let should_label_background = self.should_materialize_label_candidate(
            self.label_resolver.as_ref(),
            label_snapshot.selected,
            clean,
            route,
            now_ns,
        );

        // Background abaixo do threshold visual alimenta histórico PIT e
        // resolve labels existentes. Para não explodir cardinalidade,
        // rejeições limpas viram labels apenas quando a política
        // supervisionada selecionou o snapshot; Accept continua full-capture.
        let features_t0 = if should_label_background {
            Some(self.build_features_t0(
                route,
                entry_spread,
                now_ns,
                lifecycle,
                half_spread_buy_now,
                half_spread_sell_now,
            ))
        } else {
            None
        };

        if clean {
            self.observe_clean_spread(route, entry_spread, exit_spread, now_ns);
            self.economic
                .lock()
                .resolve_route(route, entry_spread, exit_spread, now_ns);
            // O resolvedor de LabeledTrade recebe APENAS observações
            // com volume 24h mínimo; best_exit supervisionado fica no domínio
            // de spread bruto e não recebe diagnósticos operacionais.
            self.dispatch_clean_label_observation(route, now_ns, entry_spread, exit_spread);
        }

        if clean {
            if let Some(resolver) = self.label_resolver.as_ref() {
                let Some(features_t0) = features_t0 else {
                    return (sample_dec, accepted);
                };
                let label_sample_id = accepted
                    .as_ref()
                    .map(|s| s.sample_id.clone())
                    .unwrap_or_else(|| {
                        sample_id_of(
                            now_ns,
                            cycle_seq,
                            symbol_name,
                            route.buy_venue,
                            route.sell_venue,
                        )
                    });
                let rec_meta =
                    background_recommendation_persistence(self.baseline.config().model_version);
                self.enqueue_label_candidate(
                    resolver,
                    label_sample_id,
                    sample_dec,
                    now_ns,
                    cycle_seq,
                    route,
                    symbol_name,
                    entry_spread,
                    exit_spread,
                    features_t0,
                    label_snapshot.tier,
                    label_snapshot.probability,
                    label_snapshot.probability,
                    &rec_meta,
                );
            }
        }

        (sample_dec, accepted)
    }

    /// Processa uma oportunidade do scanner.
    ///
    /// Retorna `(Recommendation, SampleDecision)`:
    /// - `Recommendation` é o output consumido por UI/broadcast.
    /// - `SampleDecision` informa se o snapshot deveria entrar no dataset
    ///   de treinamento (shadow mode M1.7).
    ///
    /// Internamente:
    /// 1. Avalia `SamplingTrigger` (4 gates) contra o cache anterior.
    /// 2. Gera `Recommendation` via `BaselineA3` usando apenas histórico.
    /// 3. Depois atualiza `HotQueryCache` e o ledger econômico com a
    ///    observação atual, se o dado estiver limpo.
    /// 4. Atualiza métricas.
    ///
    /// Chamado a cada tick do scanner (150 ms) para cada rota emitida.
    /// Processa uma observação do spread engine.
    ///
    /// Retorna tripla:
    /// - `Recommendation` — consumido por UI/broadcast.
    /// - `SampleDecision` — classificação do snapshot.
    /// - `Option<AcceptedSample>` — `Some` apenas quando `sample_decision
    ///   == Accept`. Este é o record que será enfileirado para Parquet
    ///   (C1 writer).
    ///
    /// `cycle_seq` deve ser preenchido pelo caller a cada início de
    /// ciclo via [`MlServer::begin_cycle`].
    #[allow(clippy::too_many_arguments)]
    pub fn on_opportunity(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        now_ns: u64,
    ) -> (Recommendation, SampleDecision, Option<AcceptedSample>) {
        self.on_opportunity_inner(
            cycle_seq,
            route,
            symbol_name,
            entry_spread,
            exit_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            None,
            None,
            None,
            None,
            now_ns,
        )
    }

    #[allow(clippy::too_many_arguments)]
    pub fn on_opportunity_with_books(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        buy_bid_price: f64,
        buy_ask_price: f64,
        sell_bid_price: f64,
        sell_ask_price: f64,
        now_ns: u64,
    ) -> (Recommendation, SampleDecision, Option<AcceptedSample>) {
        self.on_opportunity_inner(
            cycle_seq,
            route,
            symbol_name,
            entry_spread,
            exit_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            Some(buy_bid_price),
            Some(buy_ask_price),
            Some(sell_bid_price),
            Some(sell_ask_price),
            now_ns,
        )
    }

    #[allow(clippy::too_many_arguments)]
    fn on_opportunity_inner(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        buy_bid_price: Option<f64>,
        buy_ask_price: Option<f64>,
        sell_bid_price: Option<f64>,
        sell_ask_price: Option<f64>,
        now_ns: u64,
    ) -> (Recommendation, SampleDecision, Option<AcceptedSample>) {
        self.metrics
            .opportunities_seen
            .fetch_add(1, Ordering::Relaxed);

        // 0. **C5** — registra lifecycle da rota (first_seen / last_seen).
        //    Anti-survivorship; alimenta feature `listing_age_days`.
        self.listing.record_seen(route, now_ns);
        let lifecycle = self.listing.snapshot_for(route);
        let time_alive_at_t0_s = self.time_alive_snapshot(route, entry_spread, now_ns);
        let half_spread_buy_now = match (buy_bid_price, buy_ask_price) {
            (Some(bid), Some(ask))
                if bid.is_finite() && ask.is_finite() && ask > 0.0 && ask >= bid =>
            {
                Some((((ask - bid) / ask) * 50.0) as f32)
            }
            _ => None,
        };
        let half_spread_sell_now = match (sell_bid_price, sell_ask_price, buy_ask_price) {
            (Some(bid), Some(ask), Some(base))
                if bid.is_finite()
                    && ask.is_finite()
                    && base.is_finite()
                    && base > 0.0
                    && ask >= bid =>
            {
                Some((((ask - bid) / base) * 50.0) as f32)
            }
            _ => None,
        };

        // 1. **C2 fix** — só alimenta histograma se dado é LIMPO.
        //    Snapshots low-vol NÃO devem poluir o P95 que o
        //    próprio trigger consulta. Antes deste fix, havia dependência
        //    circular: histograma contaminado → P95 enviesado → trigger
        //    inconsistente.
        let clean = self.trigger.is_clean_data(buy_vol24_usd, sell_vol24_usd);

        // 2. Avalia trigger de amostragem completo (inclui n_min + tail).
        let sample_dec = self.trigger.evaluate(
            route,
            entry_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            self.baseline.cache(),
        );
        self.bump_sample_metric(sample_dec);

        // �� ranker observa (candidate, accepted).
        if let Some(ranker) = self.route_ranking.as_ref() {
            let accepted = matches!(sample_dec, SampleDecision::Accept);
            let vol = buy_vol24_usd.min(sell_vol24_usd);
            ranker.observe(route, now_ns, accepted, vol);
        }

        // 2a. **ADR-025 + Wave V tier** — emite `RawSample` pré-trigger
        //     se o decimator físico aprovar. Esta decisão não controla
        //     candidatura supervisionada.
        if let Some(raw_writer) = self.raw_writer.as_ref() {
            let dr = self
                .raw_decimator
                .decide_for_sample(route, now_ns, cycle_seq);
            if dr.should_persist {
                let (priority_gen, priority_updated_ns) = self.priority_set_metadata_snapshot();
                let mut raw = RawSample::with_tier_and_priority_metadata(
                    now_ns,
                    cycle_seq,
                    route,
                    symbol_name,
                    entry_spread,
                    exit_spread,
                    buy_vol24_usd,
                    sell_vol24_usd,
                    sample_dec,
                    dr.tier,
                    dr.probability,
                    priority_gen,
                    priority_updated_ns,
                    self.raw_persistence_config_hash.clone(),
                );
                if let Some(lc) = lifecycle {
                    raw.set_lifecycle(
                        lc.first_seen_ns,
                        lc.last_seen_ns,
                        lc.active_until_ns,
                        lc.n_snapshots,
                    );
                }
                match raw_writer.try_send(raw) {
                    Ok(()) => {
                        self.metrics
                            .raw_samples_emitted
                            .fetch_add(1, Ordering::Relaxed);
                        self.bump_raw_sample_tier_metric(dr.tier);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelFull) => {
                        self.metrics
                            .raw_samples_dropped_channel_full
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelClosed) => {
                        self.metrics
                            .raw_samples_dropped_channel_closed
                            .fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        }
        let label_snapshot = if sample_dec == SampleDecision::Accept {
            LabelCandidateSnapshot::ACCEPTED_FULL_CAPTURE
        } else {
            LabelCandidateSnapshot::FOREGROUND_FULL_CAPTURE
        };

        // 3. Gera recomendação apenas a partir dos spreads e histórico PIT.
        let prediction_rec = self
            .baseline
            .recommend(route, entry_spread, exit_spread, now_ns);
        let n_observations = self
            .baseline
            .cache()
            .n_observations(route)
            .min(u32::MAX as u64) as u32;
        let rec = enforce_recommendation_invariants(
            prediction_rec.clone(),
            n_observations,
            Some(&self.metrics.rec_invariant_blocked),
        );
        let rec = self.apply_trade_cooldown(route, now_ns, n_observations, rec);
        self.bump_rec_metric(&rec);
        let should_label_foreground = self.should_materialize_label_candidate(
            self.label_resolver.as_ref(),
            label_snapshot.selected,
            clean,
            route,
            now_ns,
        );
        let features_t0 = if should_label_foreground {
            let mut features = self.build_features_t0(
                route,
                entry_spread,
                now_ns,
                lifecycle,
                half_spread_buy_now,
                half_spread_sell_now,
            );
            features.time_alive_at_t0_s = time_alive_at_t0_s;
            Some(features)
        } else {
            None
        };
        if clean {
            self.observe_clean_spread(route, entry_spread, exit_spread, now_ns);
            self.economic
                .lock()
                .process(route, entry_spread, exit_spread, now_ns, &rec);
            // �� resolvedor supervisionado consome obs limpa.
            self.dispatch_clean_label_observation(route, now_ns, entry_spread, exit_spread);
        }

        // 4. **C4** — emite `AcceptedSample` se o trigger aceitou.
        //    O stream accepted é full-capture dos Accepts; a probabilidade
        //    aqui descreve inclusão no papel accepted, não o decimator raw.
        //    `was_recommended` preserva o sinal shadow pre-gate: se o
        //    baseline/modelo quis recomendar em t0, o AcceptedSample precisa
        //    carregar isso mesmo quando o contrato publico rebaixa para
        //    LowConfidence.
        let accepted = if sample_dec == SampleDecision::Accept {
            let mut sample = AcceptedSample::new(
                now_ns,
                cycle_seq,
                route,
                symbol_name,
                entry_spread,
                exit_spread,
                buy_vol24_usd,
                sell_vol24_usd,
                sample_dec,
                self.runtime_config_hash.clone(),
                "accepted_full_capture",
                1.0,
            );
            if let Some(lc) = lifecycle {
                sample.set_lifecycle(
                    lc.first_seen_ns,
                    lc.last_seen_ns,
                    lc.active_until_ns,
                    lc.n_snapshots,
                );
            }
            if matches!(&prediction_rec, Recommendation::Trade(_)) {
                sample.mark_recommended();
            }
            Some(sample)
        } else {
            None
        };

        // �� enfileira `PendingLabel` para candidates limpos, não
        // apenas Accept. Isso dá negativos supervisionáveis
        // (insufficient_history/below_tail) para abstenção sem contaminar
        // com low-volume operacional.
        if let Some(resolver) = self.label_resolver.as_ref() {
            if !clean {
                return (rec, sample_dec, accepted);
            }
            let Some(features_t0) = features_t0 else {
                return (rec, sample_dec, accepted);
            };
            // Persistencia usa o snapshot pre-gate para shadow-mode: A3/modelo
            // podem produzir um proxy auditavel mesmo quando o contrato publico
            // e rebaixado para LowConfidence.
            let rec_meta = recommendation_persistence(&prediction_rec);
            // Foreground limpo é candidatado integralmente; o stride temporal
            // por horizonte é determinístico e fica versionado em
            // effective_stride_s no label fechado.
            let label_sampling_probability = label_snapshot.probability;
            // contadores de RouteRanking para IPW offline.
            let (candidates_24h, accepts_24h) = self
                .route_ranking
                .as_ref()
                .and_then(|r| {
                    r.score_for_route(route).map(|score| {
                        (
                            score.candidate_count_24h.min(u32::MAX as u64) as u32,
                            score.accept_count_24h.min(u32::MAX as u64) as u32,
                        )
                    })
                })
                .unwrap_or((0, 0));
            let policy = PolicyMetadata {
                baseline_model_version: self.baseline.config().model_version.to_string(),
                baseline_recommended: rec_meta.baseline_recommended,
                recommendation_kind: rec_meta.recommendation_kind,
                abstain_reason: rec_meta.abstain_reason,
                prediction_source_kind: rec_meta.prediction_source_kind,
                prediction_model_version: rec_meta.prediction_model_version,
                prediction_emitted_at_ns: rec_meta.prediction_emitted_at_ns,
                prediction_valid_until_ns: rec_meta.prediction_valid_until_ns,
                prediction_entry_now: rec_meta.prediction_entry_now,
                prediction_exit_target: rec_meta.prediction_exit_target,
                prediction_gross_profit_target: rec_meta.prediction_gross_profit_target,
                prediction_p_hit: rec_meta.prediction_p_hit,
                prediction_p_hit_ci_lo: rec_meta.prediction_p_hit_ci_lo,
                prediction_p_hit_ci_hi: rec_meta.prediction_p_hit_ci_hi,
                prediction_exit_q25: rec_meta.prediction_exit_q25,
                prediction_exit_q50: rec_meta.prediction_exit_q50,
                prediction_exit_q75: rec_meta.prediction_exit_q75,
                prediction_t_hit_p25_s: rec_meta.prediction_t_hit_p25_s,
                prediction_t_hit_median_s: rec_meta.prediction_t_hit_median_s,
                prediction_t_hit_p75_s: rec_meta.prediction_t_hit_p75_s,
                prediction_p_censor: rec_meta.prediction_p_censor,
                prediction_calibration_status: rec_meta.prediction_calibration_status,
                baseline_historical_base_rate_24h: rec_meta.baseline_base_rate,
                baseline_derived_enter_at_min: rec_meta.baseline_enter_at_min,
                baseline_derived_exit_at_min: rec_meta.baseline_exit_at_min,
                baseline_floor_pct: self.baseline.config().floor_pct,
                label_stride_s: self.label_stride_s,
                effective_stride_s: self.label_stride_s,
                label_sampling_probability,
                candidates_in_route_last_24h: candidates_24h,
                accepts_in_route_last_24h: accepts_24h,
                ci_method: "wilson_marginal",
            };
            let label_sample_id = accepted
                .as_ref()
                .map(|s| s.sample_id.clone())
                .unwrap_or_else(|| {
                    sample_id_of(
                        now_ns,
                        cycle_seq,
                        symbol_name,
                        route.buy_venue,
                        route.sell_venue,
                    )
                });
            // metadados v6 persistidos em cada record.
            let max_horizon_s = self.label_horizons_s.iter().copied().max().unwrap_or(900);
            let cluster_id =
                crate::ml::persistence::label_resolver::derive_cluster_id_for_horizon_window(
                    route,
                    now_ns,
                    max_horizon_s,
                );
            let cluster_routes = self.listing.active_routes_for_symbol(route.symbol_id);
            let cluster_size = cluster_routes.len().max(1).min(u32::MAX as usize) as u32;
            let cluster_rank = cluster_routes
                .iter()
                .position(|candidate| *candidate == route)
                .map(|idx| idx + 1)
                .unwrap_or(cluster_routes.len().max(1))
                .min(u32::MAX as usize) as u32;
            let runtime_config_hash = self.runtime_config_hash.clone();
            let (priority_gen, priority_updated_ns) = self.priority_set_metadata_snapshot();
            resolver.on_candidate(
                label_sample_id,
                sample_dec.reason_label(),
                now_ns,
                cycle_seq,
                route,
                symbol_name.to_string(),
                entry_spread,
                exit_spread,
                features_t0,
                self.label_floor_pct,
                self.label_floors_pct.clone(),
                policy,
                label_snapshot.tier,
                label_snapshot.probability,
                self.label_stride_s,
                cluster_id,
                cluster_size,
                cluster_rank,
                runtime_config_hash,
                priority_gen,
                priority_updated_ns,
            );
        }

        (rec, sample_dec, accepted)
    }

    fn bump_sample_metric(&self, d: SampleDecision) {
        let counter = match d {
            SampleDecision::Accept => &self.metrics.sample_accepts,
            SampleDecision::RejectLowVolume => &self.metrics.sample_rejects_low_volume,
            SampleDecision::RejectInsufficientHistory => {
                &self.metrics.sample_rejects_insufficient_history
            }
            SampleDecision::RejectBelowTail => &self.metrics.sample_rejects_below_tail,
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }

    fn bump_raw_sample_tier_metric(&self, tier: SamplingTier) {
        match tier {
            SamplingTier::Allowlist => &self.metrics.raw_samples_emitted_allowlist,
            SamplingTier::Priority => &self.metrics.raw_samples_emitted_priority,
            SamplingTier::DecimatedUniform => &self.metrics.raw_samples_emitted_decimated_uniform,
        }
        .fetch_add(1, Ordering::Relaxed);
    }

    fn bump_rec_metric(&self, rec: &Recommendation) {
        use crate::ml::contract::AbstainReason;
        let counter = match rec {
            Recommendation::Trade(_) => &self.metrics.rec_trade_total,
            Recommendation::Abstain { reason, .. } => match reason {
                AbstainReason::NoOpportunity => &self.metrics.rec_abstain_no_opportunity,
                AbstainReason::InsufficientData => &self.metrics.rec_abstain_insufficient_data,
                AbstainReason::LowConfidence => &self.metrics.rec_abstain_low_confidence,
                AbstainReason::LongTail => &self.metrics.rec_abstain_long_tail,
                AbstainReason::Cooldown => &self.metrics.rec_abstain_cooldown,
            },
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::baseline::BaselineConfig;
    use crate::ml::feature_store::HotQueryCache;
    use crate::ml::trigger::SamplingConfig;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_server() -> MlServer {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        // Tests usam decimação=1 + janela infinita para controle.
        let cache = HotQueryCache::with_config(CacheConfig::for_testing());
        let baseline = BaselineA3::new(
            cache,
            BaselineConfig {
                floor_pct: 0.5,
                n_min: 100,
                ..BaselineConfig::default()
            },
        );
        let trigger = SamplingTrigger::new(SamplingConfig {
            n_min: 100,
            ..SamplingConfig::default()
        });
        MlServer::new(baseline, trigger)
    }

    fn mk_server_with_min_history(n_min: u64) -> MlServer {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        let cache = HotQueryCache::with_config(CacheConfig::for_testing());
        let baseline = BaselineA3::new(
            cache,
            BaselineConfig {
                floor_pct: 0.5,
                n_min,
                ..BaselineConfig::default()
            },
        );
        let trigger = SamplingTrigger::new(SamplingConfig {
            n_min,
            ..SamplingConfig::default()
        });
        MlServer::new(baseline, trigger)
    }

    #[test]
    fn raw_decimation_does_not_fragment_supervised_config_hash() {
        let a = mk_server()
            .with_label_decimator(RouteDecimator::with_modulus(7))
            .with_raw_decimator(RouteDecimator::with_modulus(10));
        let b = mk_server()
            .with_label_decimator(RouteDecimator::with_modulus(7))
            .with_raw_decimator(RouteDecimator::with_modulus(50));

        assert_eq!(
            a.runtime_config_hash, b.runtime_config_hash,
            "storage-only raw decimation must not fragment accepted/labeled lineage"
        );
        assert_ne!(
            a.raw_persistence_config_hash, b.raw_persistence_config_hash,
            "raw lineage still needs to record physical persistence policy"
        );
    }

    #[test]
    fn label_background_decimation_changes_supervised_config_hash() {
        let a = mk_server().with_label_decimator(RouteDecimator::with_modulus(7));
        let b = mk_server().with_label_decimator(RouteDecimator::with_modulus(11));

        assert_ne!(
            a.runtime_config_hash, b.runtime_config_hash,
            "label/background sampling changes supervised population and must version labels"
        );
    }

    #[test]
    fn label_population_policy_changes_supervised_config_hash() {
        let base = mk_server().with_label_population_policy("BTC-USDT,ETH-USDT".into(), 0.95, 3600);
        let changed_allowlist =
            mk_server().with_label_population_policy("BTC-USDT".into(), 0.95, 3600);
        let changed_priority_target =
            mk_server().with_label_population_policy("BTC-USDT,ETH-USDT".into(), 0.90, 3600);
        let changed_rerank =
            mk_server().with_label_population_policy("BTC-USDT,ETH-USDT".into(), 0.95, 900);

        assert_ne!(
            base.runtime_config_hash, changed_allowlist.runtime_config_hash,
            "allowlist compartilhada altera quais backgrounds viram labels"
        );
        assert_ne!(
            base.runtime_config_hash, changed_priority_target.runtime_config_hash,
            "target coverage do priority_set altera full-capture supervisionado"
        );
        assert_ne!(
            base.runtime_config_hash, changed_rerank.runtime_config_hash,
            "cadencia de rerank altera quando rotas entram em priority supervisionado"
        );
    }

    #[test]
    fn seven_day_feature_cache_uses_coarser_decimation() {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        let cache = HotQueryCache::with_config(CacheConfig::default());
        let baseline = BaselineA3::new(cache, BaselineConfig::default());
        let server = MlServer::new(baseline, SamplingTrigger::with_defaults());
        let base_decimation = CacheConfig::default().decimation;
        assert_eq!(
            server.feature_cache_7d.config().decimation,
            base_decimation * FEATURE_WINDOW_7D_DECIMATION_MULTIPLIER
        );
    }

    #[test]
    fn state_sweep_removes_only_expired_auxiliary_entries() {
        let server = mk_server()
            .with_recommendation_cooldown_s(60)
            .with_opportunity_alive_threshold_pct(1.0);
        let route = mk_route();
        let t0 = 1_000_000_000u64;
        server.listing.record_seen(route, t0);
        server.last_trade_emit_by_route.lock().insert(route, t0);
        server.alive_since_by_route.lock().insert(route, t0);

        let stats = server.state_sweep(t0 + 3_700_000_000_000);

        assert_eq!(stats.cooldown_entries_removed, 1);
        assert_eq!(stats.alive_entries_removed, 1);
        assert_eq!(stats.listing_newly_delisted, 1);
        assert!(server.last_trade_emit_by_route.lock().is_empty());
        assert!(server.alive_since_by_route.lock().is_empty());
    }

    #[test]
    fn first_observations_abstain_insufficient_data() {
        let server = mk_server();
        let route = mk_route();
        let (rec, dec, _accepted) =
            server.on_opportunity(0, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6, 1);
        use crate::ml::contract::AbstainReason;
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::InsufficientData);
            }
            _ => panic!("expected Abstain on first observation"),
        }
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
    }

    #[test]
    fn background_observations_prime_cache_without_recommendation_output() {
        let server = mk_server();
        let route = mk_route();
        assert_eq!(server.baseline.cache().n_observations(route), 0);

        for i in 0..10 {
            let (dec, accepted) = server.observe_background(
                i,
                route,
                "BTC-USDT",
                0.1 + i as f32 * 0.01,
                -0.8,
                1e6,
                1e6,
                1_000_000_000 + i as u64,
            );
            assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
            assert!(accepted.is_none());
        }

        assert_eq!(server.baseline.cache().n_observations(route), 10);
        assert_eq!(
            server.metrics.opportunities_seen.load(Ordering::Relaxed),
            0,
            "background observations are data collection, not UI opportunities"
        );
        assert_eq!(server.metrics.rec_trade_total.load(Ordering::Relaxed), 0);
    }

    #[test]
    fn background_accept_returns_accepted_sample_without_recommendation() {
        let server = mk_server_with_min_history(3);
        let route = mk_route();

        for i in 0..3 {
            let (dec, accepted) = server.observe_background(
                i,
                route,
                "BTC-USDT",
                1.0 + i as f32 * 0.1,
                -1.0,
                1e6,
                1e6,
                1_000_000_000 + i as u64,
            );
            assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
            assert!(accepted.is_none());
        }

        let (dec, accepted) =
            server.observe_background(4, route, "BTC-USDT", 5.0, -1.0, 1e6, 1e6, 2_000_000_000);
        assert_eq!(dec, SampleDecision::Accept);
        let accepted = accepted.expect("background trigger Accept must be persisted");
        assert_eq!(accepted.sample_decision, SampleDecision::Accept);
        assert_eq!(accepted.sampling_tier, "accepted_full_capture");
        assert_eq!(accepted.sampling_probability, 1.0);
        assert!(!accepted.was_recommended);
    }

    #[test]
    fn first_observation_does_not_self_prime_recommendation() {
        let server = mk_server_with_min_history(1);
        let route = mk_route();
        let (rec, dec, accepted) =
            server.on_opportunity(0, route, "BTC-USDT", 3.2, -0.4, 1e6, 1e6, 1);
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::InsufficientData);
            }
            other => panic!("expected abstain on first observation, got {:?}", other),
        }
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
        assert!(accepted.is_none());
    }

    #[test]
    fn metrics_update_correctly() {
        let server = mk_server();
        let route = mk_route();
        // 10 observações — todas rejeitadas (insufficient).
        for i in 0..10 {
            server.on_opportunity(i as u32, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6, i);
        }
        let m = server.metrics();
        assert_eq!(m.opportunities_seen.load(Ordering::Relaxed), 10);
        assert_eq!(
            m.sample_rejects_insufficient_history
                .load(Ordering::Relaxed),
            10
        );
        assert_eq!(m.rec_abstain_insufficient_data.load(Ordering::Relaxed), 10);
    }

    fn mk_invalid_setup() -> crate::ml::contract::TradeSetup {
        use crate::ml::contract::{
            BaselineDiagnostics, CalibStatus, ReasonKind, TradeReason, TradeSetup,
        };

        let mut setup = TradeSetup {
            route_id: mk_route(),
            entry_now: 2.4,
            exit_target: -0.4,
            gross_profit_target: 2.0,
            p_hit: Some(0.83),
            p_hit_ci: Some((0.77, 0.88)),
            exit_q25: Some(-0.7),
            exit_q50: Some(-0.4),
            exit_q75: Some(-0.2),
            t_hit_p25_s: Some(900),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(3120),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
                enter_at_min: 2.0,
                enter_typical: 2.4,
                enter_peak_p95: 2.9,
                p_enter_hit: 0.85,
                exit_at_min: -0.8,
                exit_typical: -0.4,
                p_exit_hit_given_enter: 0.80,
                gross_profit_p10: 1.0,
                gross_profit_p25: 1.4,
                gross_profit_median: 1.9,
                gross_profit_p75: 2.3,
                gross_profit_p90: 2.7,
                gross_profit_p95: 3.1,
                historical_base_rate_24h: 0.77,
                historical_base_rate_ci: (0.70, 0.82),
            }),
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            cluster_detection_status: "not_implemented",
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: crate::ml::ReasonDetail::placeholder(),
            },
            ci_method: "conformal_split",
            model_version: "test-0.1.0".into(),
            source_kind: crate::ml::contract::SourceKind::Model,
            emitted_at: 1_700_000_000_000_000_000,
            // valid_until ≥ 2 × t_hit_p75_s (3120s); usar 7000s para folga.
            valid_until: 1_700_000_000_000_000_000 + 7000 * 1_000_000_000,
        };
        setup
            .baseline_diagnostics
            .as_mut()
            .unwrap()
            .gross_profit_p25 = 0.5;
        setup
    }

    fn mk_calibrated_setup(route: RouteId, emitted_at: u64) -> crate::ml::contract::TradeSetup {
        use crate::ml::contract::{CalibStatus, ReasonKind, SourceKind, TradeReason, TradeSetup};

        TradeSetup {
            route_id: route,
            entry_now: 3.0,
            exit_target: 0.4,
            gross_profit_target: 3.5,
            p_hit: Some(0.82),
            p_hit_ci: Some((0.76, 0.88)),
            exit_q25: Some(0.2),
            exit_q50: Some(0.5),
            exit_q75: Some(0.8),
            t_hit_p25_s: Some(1),
            t_hit_median_s: Some(2),
            t_hit_p75_s: Some(10),
            p_censor: Some(0.03),
            baseline_diagnostics: None,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            cluster_detection_status: "not_implemented",
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: crate::ml::ReasonDetail::placeholder(),
            },
            ci_method: "conformal_split",
            model_version: "model-test-0.1.0".into(),
            source_kind: SourceKind::Model,
            emitted_at,
            valid_until: emitted_at + 30 * 1_000_000_000,
        }
    }

    #[test]
    fn invalid_trade_setup_is_downgraded_before_broadcast() {
        use crate::ml::contract::Recommendation;

        let counter = AtomicU64::new(0);
        let rec = Recommendation::Trade(mk_invalid_setup());
        let sanitized = enforce_recommendation_invariants(rec, 42, Some(&counter));
        match sanitized {
            Recommendation::Abstain { reason, diagnostic } => {
                assert_eq!(reason, AbstainReason::LowConfidence);
                assert_eq!(diagnostic.n_observations, 42);
                assert_eq!(diagnostic.model_version, "test-0.1.0");
            }
            other => panic!("expected Abstain, got {:?}", other),
        }
        assert_eq!(
            counter.load(Ordering::Relaxed),
            1,
            "contador de invariants blocked deve subir"
        );
    }

    #[test]
    fn wide_confidence_interval_is_downgraded_before_broadcast() {
        use crate::ml::contract::Recommendation;

        let counter = AtomicU64::new(0);
        let mut setup = mk_invalid_setup();
        setup
            .baseline_diagnostics
            .as_mut()
            .unwrap()
            .gross_profit_p25 = 1.4;
        setup.p_hit_ci = Some((0.55, 0.90));
        let sanitized =
            enforce_recommendation_invariants(Recommendation::Trade(setup), 42, Some(&counter));
        match sanitized {
            Recommendation::Abstain { reason, diagnostic } => {
                assert_eq!(reason, AbstainReason::LowConfidence);
                let width = diagnostic.ci_width_if_emitted.unwrap();
                assert!((width - 0.35).abs() < 1e-6);
            }
            other => panic!("expected Abstain, got {:?}", other),
        }
        assert_eq!(
            counter.load(Ordering::Relaxed),
            0,
            "IC largo é gate de confiança, não invariant quebrada"
        );
    }

    #[test]
    fn accumulated_observations_without_calibrated_model_abstain_low_confidence() {
        let server = mk_server().with_recommendation_cooldown_s(0);
        let route = mk_route();
        // Popula 200 observações "regime opportunity".
        for i in 0..200 {
            let t = (i % 100) as f32 / 100.0;
            server.on_opportunity(
                i as u32,
                route,
                "BTC-USDT",
                2.0 + t * 2.0,
                -1.0 + t * 1.5,
                1e6,
                1e6,
                i,
            );
        }
        // Agora tenta emitir com current_entry alto.
        let (rec, dec, accepted) =
            server.on_opportunity(201, route, "BTC-USDT", 4.0, 0.2, 1e6, 1e6, 201);
        assert_eq!(dec, SampleDecision::Accept);
        let accepted = accepted.expect("accepted sample");
        assert_eq!(accepted.sampling_tier, "accepted_full_capture");
        assert_eq!(accepted.sampling_probability, 1.0);
        assert_eq!(accepted.sampling_probability_kind, "marginal_full_capture");
        assert!(
            accepted.was_recommended,
            "accepted stream deve preservar o Trade shadow A3 mesmo quando o output publico vira LowConfidence"
        );
        match rec {
            Recommendation::Abstain { reason, diagnostic } => {
                assert_eq!(reason, AbstainReason::LowConfidence);
                assert_eq!(diagnostic.model_version, "baseline-a3-0.2.0");
            }
            Recommendation::Trade(setup) => {
                panic!("degraded baseline must not cross as Trade: {:?}", setup);
            }
        }
    }

    #[test]
    fn cooldown_suppresses_duplicate_trade_on_same_route() {
        let server = mk_server_with_min_history(1).with_recommendation_cooldown_s(60);
        let route = mk_route();
        let t0 = 1_000_000_000u64;
        let t1 = t0 + 1_000_000_000;
        let t2 = t1 + 1_000_000_000;

        let first = server.apply_trade_cooldown(
            route,
            t1,
            10,
            Recommendation::Trade(mk_calibrated_setup(route, t1)),
        );
        assert!(matches!(first, Recommendation::Trade(_)));

        let second = server.apply_trade_cooldown(
            route,
            t2,
            10,
            Recommendation::Trade(mk_calibrated_setup(route, t2)),
        );
        match second {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::Cooldown);
            }
            other => panic!("expected cooldown Abstain, got {:?}", other),
        }
    }

    #[test]
    fn economic_tracker_resolves_a_trade_in_sequence() {
        let route = mk_route();
        let t1: u64 = 2_000_000_000;
        let t2: u64 = t1 + MIN_HORIZON_NS + 1;
        let setup = mk_calibrated_setup(route, t1);
        assert_eq!(setup.entry_now, 3.0);

        let mut tracker = EconomicTracker::new();
        tracker.process(
            route,
            setup.entry_now,
            -1.0,
            t1,
            &Recommendation::Trade(setup),
        );
        tracker.process(
            route,
            3.0,
            0.5,
            t2,
            &Recommendation::Abstain {
                reason: AbstainReason::NoOpportunity,
                diagnostic: AbstainDiagnostic {
                    n_observations: 1,
                    ci_width_if_emitted: None,
                    nearest_feasible_utility: None,
                    tail_ratio_p99_p95: None,
                    model_version: "test".into(),
                    regime_posterior: [1.0, 0.0, 0.0],
                },
            },
        );

        let econ = tracker.metrics();
        assert_eq!(
            econ.n_emissions_total.load(Ordering::Relaxed),
            1,
            "1 emissão esperada no tick 1"
        );
        assert_eq!(
            econ.n_realized_total.load(Ordering::Relaxed),
            1,
            "1 realização esperada no tick 2 (após grace period)"
        );
    }

    #[test]
    fn economic_tracker_refuses_intra_tick_resolution() {
        // Fix pós-auditoria: trade recém-emitido não pode "realizar" no
        // mesmo tick em que foi emitido (viola identidade estrutural §2).
        let route = mk_route();
        let t_emit: u64 = 2_000_000_000;
        let setup = mk_calibrated_setup(route, t_emit);
        let mut tracker = EconomicTracker::new();
        tracker.process(
            route,
            setup.entry_now,
            0.5,
            t_emit,
            &Recommendation::Trade(setup),
        );

        // SEM fix, trade realizaria no mesmo tick em horizon=0s
        // (violando skill §2). COM fix, grace MIN_HORIZON_NS bloqueia.
        let econ = tracker.metrics();
        let realized_after_emit = econ.n_realized_total.load(Ordering::Relaxed);
        assert_eq!(
            realized_after_emit, 0,
            "trade NÃO deve realizar intra-tick (horizon > 0 é obrigatório)"
        );
    }

    #[test]
    fn economic_sweeper_closes_silent_route_after_valid_until() {
        let route = mk_route();
        let t_emit: u64 = 2_000_000_000;
        let setup = mk_calibrated_setup(route, t_emit);
        let mut tracker = EconomicTracker::new();
        tracker.process(
            route,
            setup.entry_now,
            0.0,
            t_emit,
            &Recommendation::Trade(setup),
        );

        let closed = tracker.sweep(t_emit + 31_000_000_000);
        let econ = tracker.metrics();
        assert_eq!(closed, 1);
        assert_eq!(econ.n_emissions_total.load(Ordering::Relaxed), 1);
        assert_eq!(econ.n_censored_total.load(Ordering::Relaxed), 1);
        assert_eq!(econ.n_exit_miss_total.load(Ordering::Relaxed), 0);
    }

    #[test]
    fn economic_sweeper_censors_when_route_silences() {
        use crate::ml::contract::{CalibStatus, ReasonKind, TradeReason, TradeSetup};

        let route = mk_route();
        let t_emit = 1_000_000_000u64;
        let setup = TradeSetup {
            route_id: route,
            entry_now: 2.0,
            exit_target: 0.5,
            gross_profit_target: 2.5,
            p_hit: None,
            p_hit_ci: None,
            exit_q25: None,
            exit_q50: None,
            exit_q75: None,
            t_hit_p25_s: None,
            t_hit_median_s: None,
            t_hit_p75_s: None,
            p_censor: None,
            baseline_diagnostics: None,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            cluster_detection_status: "not_implemented",
            calibration_status: CalibStatus::Degraded,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: crate::ml::ReasonDetail::placeholder(),
            },
            ci_method: "wilson_marginal",
            model_version: "baseline-a3-test".into(),
            source_kind: crate::ml::contract::SourceKind::Baseline,
            emitted_at: t_emit,
            valid_until: t_emit + 30_000_000_000,
        };
        let mut tracker = EconomicTracker::new();
        tracker.process(
            route,
            setup.entry_now,
            -1.3,
            t_emit,
            &Recommendation::Trade(setup),
        );

        let closed = tracker.sweep(t_emit + 31_000_000_000);
        assert_eq!(closed, 1);
        let window = tracker
            .accumulator
            .snapshot_window(60, t_emit + 31_000_000_000);
        assert_eq!(window.n_censored, 1);
        assert_eq!(window.n_exit_miss, 0);
        assert_eq!(window.simulated_pnl_aggregated_usd, 0.0);
    }

    #[tokio::test]
    async fn raw_writer_receives_all_samples_with_modulus_1() {
        // ADR-025 gate de aceitação #2 — com `modulus=1`, toda observação
        // passa pelo writer, independentemente do trigger aceitar.
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        use crate::ml::persistence::{RawSampleWriter, RawWriterConfig};
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        let (writer, handle) = RawSampleWriter::create(RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "test".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());

        let server = mk_server()
            .with_raw_writer(handle)
            .with_raw_decimator(RouteDecimator::with_modulus(1));

        let route = mk_route();
        // 50 observações — todas devem ser rejeitadas pelo trigger
        // (n_min=100), mas todas devem aparecer no RawSample dataset.
        for i in 0..50 {
            server.on_opportunity(
                i as u32,
                route,
                "BTC-USDT",
                2.5,
                -0.8,
                1e6,
                1e6,
                1_745_159_400u64 * 1_000_000_000 + i as u64,
            );
        }

        tokio::time::sleep(Duration::from_millis(200)).await;
        // Drop do server descarta o handle dentro dele; mas temos um
        // clone via `with_raw_writer` consumido. O handle interno é
        // dropado quando o server sai de escopo.
        drop(server);
        task.await.expect("task join");

        // Conta linhas gravadas — deve ser 50.
        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        assert!(hour_dir.exists(), "hour dir criado");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        assert_eq!(files.len(), 1);
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line_count = content.lines().count();
        assert_eq!(line_count, 50, "deve gravar todas 50 observações");

        // Verifica que métrica foi incrementada.
        // Não temos mais ref ao server, mas o teste anterior já validou
        // que `raw_samples_emitted` sobe em ordem. Aqui o ponto é contar
        // no disco.
    }

    #[test]
    fn raw_writer_respects_decimator_distribution() {
        // ADR-025 gate de aceitação #3 — decimator ~10% de rotas.
        // Criamos server sem writer conectado (apenas conta métrica não
        // vai subir, mas o decimator já determinou o mod 10 correto).
        let d = RouteDecimator::with_modulus(10);
        // Verifica que para `mk_route` do teste, should_persist é
        // estável entre chamadas (determinismo PIT).
        let r = mk_route();
        let decision = d.should_persist(r);
        for _ in 0..100 {
            assert_eq!(d.should_persist(r), decision);
        }
    }

    #[tokio::test]
    async fn pit_sample_decision_preserved_in_raw_sample() {
        // ADR-025 gate de aceitação #3 — o veredito do trigger persistido
        // no RawSample deve ser idêntico ao retornado por on_opportunity.
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        use crate::ml::persistence::{RawSampleWriter, RawWriterConfig};
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        let (writer, handle) = RawSampleWriter::create(RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "pit".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());

        let server = mk_server()
            .with_raw_writer(handle)
            .with_raw_decimator(RouteDecimator::with_modulus(1));

        let route = mk_route();
        // Observação que o trigger sinaliza RejectInsufficientHistory
        // (sem histórico acumulado).
        let (_, sample_dec, _) = server.on_opportunity(
            0,
            route,
            "BTC-USDT",
            2.5,
            -0.8,
            1e6,
            1e6,
            1_745_159_400u64 * 1_000_000_000,
        );
        assert_eq!(sample_dec, SampleDecision::RejectInsufficientHistory);

        tokio::time::sleep(Duration::from_millis(150)).await;
        drop(server);
        task.await.expect("task join");

        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line = content.lines().next().expect("at least 1 line");
        let v: serde_json::Value = serde_json::from_str(line).unwrap();
        assert_eq!(
            v["sample_decision"], "insufficient_history",
            "veredito do trigger preservado PIT no RawSample",
        );
    }

    #[tokio::test]
    async fn clean_rejected_snapshots_create_supervised_negative_labels() {
        use crate::ml::persistence::{
            LabelResolver, LabeledJsonlWriter, LabeledWriterConfig, ResolverConfig,
        };
        use std::sync::Arc;
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        let (writer, handle) = LabeledJsonlWriter::create(LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "neg-label".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig {
                horizons_s: vec![1],
                close_slack_ns: 1_000_000_000,
                route_vanish_idle_ns: 60 * 1_000_000_000,
                route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
                max_pending_per_route: 100,
                sweeper_interval: Duration::from_secs(10),
            },
            handle,
        ));

        let server = mk_server()
            .with_label_resolver(Arc::clone(&resolver))
            .with_raw_decimator(RouteDecimator::with_modulus(u64::MAX))
            .with_label_decimator(RouteDecimator::with_modulus(1));
        let route = mk_route();
        let (_rec, dec, accepted) = server.on_opportunity(
            0,
            route,
            "BTC-USDT",
            2.5,
            -0.8,
            1e6,
            1e6,
            1_745_159_400u64 * 1_000_000_000,
        );
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
        assert!(accepted.is_none());
        assert_eq!(
            resolver
                .metrics()
                .pending_created_total
                .load(Ordering::Relaxed),
            1,
            "snapshot limpo rejeitado deve gerar label negativo supervisionavel"
        );
        drop(server);
        drop(resolver);
        drop(tmp);
        task.abort();
    }

    #[tokio::test]
    async fn clean_background_below_tail_selected_by_decimator_creates_label_candidate() {
        use crate::ml::persistence::{
            LabelResolver, LabeledJsonlWriter, LabeledWriterConfig, ResolverConfig,
        };
        use std::sync::Arc;
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        let (writer, handle) = LabeledJsonlWriter::create(LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "bg-label".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig {
                horizons_s: vec![1],
                close_slack_ns: 1_000_000_000,
                route_vanish_idle_ns: 60 * 1_000_000_000,
                route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
                max_pending_per_route: 100,
                sweeper_interval: Duration::from_secs(10),
            },
            handle,
        ));

        let server = mk_server()
            .with_label_resolver(Arc::clone(&resolver))
            .with_raw_decimator(RouteDecimator::with_modulus(u64::MAX))
            .with_label_decimator(RouteDecimator::with_modulus(1));
        let route = mk_route();
        let (dec, accepted) = server.observe_background(
            0,
            route,
            "BTC-USDT",
            -0.1,
            -0.8,
            1e6,
            1e6,
            1_745_159_400u64 * 1_000_000_000,
        );
        assert_eq!(dec, SampleDecision::RejectBelowTail);
        assert!(accepted.is_none());
        assert_eq!(
            resolver
                .metrics()
                .pending_created_total
                .load(Ordering::Relaxed),
            1,
            "background below-tail limpo selecionado pelo label_decimator deve gerar negativo supervisionavel"
        );
        drop(server);
        drop(resolver);
        drop(tmp);
        task.abort();
    }

    #[tokio::test]
    async fn raw_persistence_decimator_does_not_gate_background_labels() {
        use crate::ml::persistence::{
            LabelResolver, LabeledJsonlWriter, LabeledWriterConfig, ResolverConfig,
        };
        use std::sync::Arc;
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        let (writer, handle) = LabeledJsonlWriter::create(LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "bg-decoupled-label".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig {
                horizons_s: vec![1],
                close_slack_ns: 1_000_000_000,
                route_vanish_idle_ns: 60 * 1_000_000_000,
                route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
                max_pending_per_route: 100,
                sweeper_interval: Duration::from_secs(10),
            },
            handle,
        ));

        let server = mk_server()
            .with_label_resolver(Arc::clone(&resolver))
            .with_raw_decimator(RouteDecimator::with_modulus(u64::MAX))
            .with_label_decimator(RouteDecimator::with_modulus(1));
        let route = mk_route();
        let (dec, accepted) = server.observe_background(
            0,
            route,
            "BTC-USDT",
            -0.1,
            -0.8,
            1e6,
            1e6,
            1_745_159_400u64 * 1_000_000_000,
        );
        assert_eq!(dec, SampleDecision::RejectBelowTail);
        assert!(accepted.is_none());
        assert_eq!(
            resolver
                .metrics()
                .pending_created_total
                .load(Ordering::Relaxed),
            1,
            "label_decimator deve controlar labels de background mesmo quando raw_decimator rejeita persistencia"
        );
        drop(server);
        drop(resolver);
        drop(tmp);
        task.abort();
    }

    #[tokio::test]
    async fn raw_full_capture_does_not_force_background_label() {
        use crate::ml::persistence::{
            LabelResolver, LabeledJsonlWriter, LabeledWriterConfig, ResolverConfig,
        };
        use std::sync::Arc;
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        let (writer, handle) = LabeledJsonlWriter::create(LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "bg-raw-only-label".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig {
                horizons_s: vec![1],
                close_slack_ns: 1_000_000_000,
                route_vanish_idle_ns: 60 * 1_000_000_000,
                route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
                max_pending_per_route: 100,
                sweeper_interval: Duration::from_secs(10),
            },
            handle,
        ));

        let route = mk_route();
        let t_emit = 1_745_159_400u64 * 1_000_000_000;
        let label_decimator = RouteDecimator::with_modulus(u64::MAX);
        let cycle_seq = (0..1_000)
            .find(|cycle| {
                !label_decimator
                    .decide_for_sample(route, t_emit, *cycle)
                    .should_persist
            })
            .expect("test route must have a rejected label sampling point");

        let server = mk_server()
            .with_label_resolver(Arc::clone(&resolver))
            .with_raw_decimator(RouteDecimator::with_modulus(1))
            .with_label_decimator(label_decimator);
        let (dec, accepted) =
            server.observe_background(cycle_seq, route, "BTC-USDT", -0.1, -0.8, 1e6, 1e6, t_emit);
        assert_eq!(dec, SampleDecision::RejectBelowTail);
        assert!(accepted.is_none());
        assert_eq!(
            resolver
                .metrics()
                .pending_created_total
                .load(Ordering::Relaxed),
            0,
            "raw full-capture nao deve criar label de background sem selecao supervisionada"
        );
        drop(server);
        drop(resolver);
        drop(tmp);
        task.abort();
    }

    #[tokio::test]
    async fn clean_background_accept_creates_label_candidate() {
        use crate::ml::persistence::{
            LabelResolver, LabeledJsonlWriter, LabeledWriterConfig, ResolverConfig,
        };
        use std::sync::Arc;
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        let (writer, handle) = LabeledJsonlWriter::create(LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "bg-accept-label".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig {
                horizons_s: vec![1],
                close_slack_ns: 1_000_000_000,
                route_vanish_idle_ns: 60 * 1_000_000_000,
                route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
                max_pending_per_route: 100,
                sweeper_interval: Duration::from_secs(10),
            },
            handle,
        ));

        let server = mk_server_with_min_history(3)
            .with_label_resolver(Arc::clone(&resolver))
            .with_raw_decimator(RouteDecimator::with_modulus(1));
        let route = mk_route();
        for i in 0..3 {
            let _ = server.observe_background(
                i,
                route,
                "BTC-USDT",
                0.10 + i as f32 * 0.01,
                -0.8,
                1e6,
                1e6,
                1_000_000_000 + i as u64,
            );
        }
        let (dec, accepted) =
            server.observe_background(4, route, "BTC-USDT", 1.0, -0.8, 1e6, 1e6, 2_000_000_000);
        assert_eq!(dec, SampleDecision::Accept);
        assert!(accepted.is_some());
        assert_eq!(
            resolver
                .metrics()
                .pending_created_total
                .load(Ordering::Relaxed),
            1,
            "background Accept ainda deve virar candidato supervisionado"
        );
        drop(server);
        drop(resolver);
        drop(tmp);
        task.abort();
    }

    #[tokio::test]
    async fn labeled_trade_features_t0_use_pre_observation_quantiles() {
        use crate::ml::persistence::{
            LabelResolver, LabeledJsonlWriter, LabeledWriterConfig, ResolverConfig,
        };
        use std::sync::Arc;
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
        let (writer, handle) = LabeledJsonlWriter::create(LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "pit-label".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        });
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig {
                horizons_s: vec![1, 2, 3],
                close_slack_ns: 1_000_000_000,
                route_vanish_idle_ns: 60 * 1_000_000_000,
                route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
                max_pending_per_route: 100,
                sweeper_interval: Duration::from_secs(10),
            },
            handle,
        ));

        let server = mk_server_with_min_history(2);
        let route = mk_route();
        let t0 = 1_745_159_400u64 * 1_000_000_000;
        server.on_opportunity(0, route, "BTC-USDT", 1.0, -1.0, 1e6, 1e6, t0);
        server.on_opportunity(1, route, "BTC-USDT", 9.0, 2.0, 1e6, 1e6, t0 + 1);
        let pre_entry_p50 = server.baseline.cache().quantile_entry(route, 0.50).unwrap();

        let server = server
            .with_label_resolver(Arc::clone(&resolver))
            .with_label_config(0, 0.8, DEFAULT_LABEL_FLOORS_PCT.to_vec())
            .with_raw_decimator(RouteDecimator::with_modulus(1));
        let (_rec, dec, accepted) = server.on_opportunity_with_books(
            2,
            route,
            "BTC-USDT",
            9.0,
            2.5,
            1e6,
            1e6,
            99.0,
            100.0,
            109.0,
            110.0,
            t0 + 2_000_000_000,
        );
        assert_eq!(dec, SampleDecision::Accept);
        assert!(accepted.is_some());
        resolver.on_clean_observation(route, t0 + 3_000_000_000, 8.0, 2.6);
        resolver.sweep(t0 + 6_000_000_000);

        tokio::time::sleep(Duration::from_millis(150)).await;
        drop(server);
        drop(resolver);
        task.await.expect("task join");

        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line = content.lines().next().expect("at least 1 label");
        let v: serde_json::Value = serde_json::from_str(line).unwrap();
        assert_eq!(v["sample_decision"], "accept");
        assert_eq!(v["policy_metadata"]["recommendation_kind"], "trade");
        assert_eq!(v["policy_metadata"]["baseline_recommended"], true);
        assert_eq!(v["policy_metadata"]["prediction_source_kind"], "baseline");
        assert_eq!(
            v["policy_metadata"]["prediction_calibration_status"],
            "degraded"
        );
        assert!(
            v["policy_metadata"]["baseline_historical_base_rate_24h"]
                .as_f64()
                .is_some(),
            "label deve preservar snapshot A3 para shadow-mode mesmo quando Trade publico vira LowConfidence"
        );
        assert!(
            v["label_floor_hits"].as_array().unwrap().len() > 1,
            "label deve carregar multiplos floors para curva P(exit>=floor)"
        );
        let label_entry_p50 = v["features_t0"]["entry_p50_24h"].as_f64().unwrap() as f32;
        assert!(
            (label_entry_p50 - pre_entry_p50).abs() < 0.05,
            "features_t0 must use pre-observe p50; got {label_entry_p50}, pre was {pre_entry_p50}"
        );
        assert!(
            v["features_t0"]["entry_p50_1h"].as_f64().is_some()
                && v["features_t0"]["entry_p50_7d"].as_f64().is_some()
                && v["features_t0"]["p_exit_ge_label_floor_minus_entry_7d"]
                    .as_f64()
                    .is_some(),
            "features_t0 deve carregar janela curta e longa além de 24h"
        );
        assert_eq!(v["features_t0"]["half_spread_buy_now"], 0.5);
        assert_eq!(v["features_t0"]["half_spread_sell_now"], 0.5);
        assert_eq!(v["features_t0"]["time_alive_at_t0_s"], 2);
        assert_eq!(
            v["label_window_closed_at_ns"],
            v["ts_emit_ns"].as_u64().unwrap() + v["horizon_s"].as_u64().unwrap() * 1_000_000_000
        );
        assert!(
            v["features_t0"]["gross_run_p50_s"].as_u64().is_some(),
            "gross_run_* deve ser derivado do run histórico de exit >= floor-entry(t0), não ficar nulo por usar gross simultâneo"
        );
        assert!(
            v["sampling_probability"].as_f64().is_some()
                && v["policy_metadata"]["label_sampling_probability"]
                    .as_f64()
                    .is_some(),
            "sampling_probability top-level e policy_metadata.label_sampling_probability devem materializar a probabilidade conhecida de candidatura supervisionada"
        );
    }
}
