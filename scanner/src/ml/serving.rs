//! Serving síncrono do recomendador ML (MVP).
//!
//! Coordena os componentes já implementados:
//!
//! 1. `HotQueryCache` (ADR-012 Camada 1b) — recebe observação de spread.
//! 2. `SamplingTrigger` (ADR-009 + ADR-014) — decide se snapshot entra
//!    no dataset (para shadow mode posterior).
//! 3. `BaselineA3` (ADR-001) — emite `Recommendation`.
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
    AbstainDiagnostic, AbstainReason, CalibStatus, Recommendation, RouteId, TradeSetup,
};
use crate::ml::economic::{EconomicAccumulator, EconomicEvent, EconomicMetrics, TradeOutcome};
use crate::ml::eval::verify_tradesetup;
use crate::ml::feature_store::{CacheConfig, HotQueryCache};
use crate::ml::listing_history::{ListingHistory, RouteLifecycle};
use crate::ml::persistence::label_resolver::{DEFAULT_HORIZONS_S, DEFAULT_LABEL_FLOORS_PCT};
use crate::ml::persistence::sample_id::sample_id_of;
use crate::ml::persistence::{
    AcceptedSample, FeaturesT0, LabelResolver, PolicyMetadata, RawSample, RawWriterHandle,
    RouteDecimator, RouteRanking, SamplingTier,
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
    feature_cache_1h: HotQueryCache,
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
    // Rankeador rolling que atualiza `raw_decimator` priority_set.
    // `None` quando desabilitado (tests minimalistas).
    route_ranking: Option<Arc<RouteRanking>>,
    // �� resolvedor de labels supervisionados (LabeledTrade).
    // `None` = label disabled (tests legados). Usa `Arc` porque o sweeper
    // task também segura uma cópia.
    label_resolver: Option<Arc<LabelResolver>>,
    // �� parâmetros de labeling (stride, floor).
    label_stride_s: u32,
    label_floor_pct: f32,
    label_floors_pct: Vec<f32>,
    label_horizons_s: Vec<u32>,
    last_trade_emit_by_route: Mutex<AHashMap<RouteId, u64>>,
    alive_since_by_route: Mutex<AHashMap<RouteId, u64>>,
    opportunity_alive_threshold_pct: f32,
    recommendation_cooldown_ns: u64,
    // fingerprint da config runtime persistida em cada record.
    runtime_config_hash: String,
    // geração do priority_set (incrementado em set_priority_set_and_bump).
    priority_set_generation_id: AtomicU64,
    priority_set_updated_at_ns: AtomicU64,
}

fn compute_runtime_config_hash(
    trigger: crate::ml::trigger::SamplingConfig,
    baseline: crate::ml::baseline::BaselineConfig,
    label_stride_s: u32,
    label_floor_pct: f32,
    label_floors_pct: &[f32],
    label_horizons_s: &[u32],
    raw_decimation_mod: u64,
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
            "label_horizons_s=[{}]|raw_decimation_mod={}|recommendation_cooldown_ns={}|",
            "feature_windows_s=[3600,86400,604800]|opportunity_alive_threshold_pct={:.6}"
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
        raw_decimation_mod,
        recommendation_cooldown_ns,
        opportunity_alive_threshold_pct,
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
                tracing::warn!(
                    route = ?setup.route_id,
                    model_version = %model_version,
                    error = ?err,
                    "blocked invalid TradeSetup before broadcast"
                );
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
        let label_floors_pct = DEFAULT_LABEL_FLOORS_PCT.to_vec();
        let label_horizons_s = DEFAULT_HORIZONS_S.to_vec();
        let recommendation_cooldown_ns = 60 * 1_000_000_000;
        let runtime_config_hash = compute_runtime_config_hash(
            trigger.config(),
            baseline.config(),
            60,
            0.8,
            &label_floors_pct,
            &label_horizons_s,
            raw_decimator.modulus(),
            recommendation_cooldown_ns,
            0.0,
        );
        let cache_24h_cfg = baseline.cache().config();
        let feature_cache_1h = HotQueryCache::with_config(CacheConfig {
            window_ns: FEATURE_WINDOW_1H_NS,
            ..cache_24h_cfg
        });
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
            feature_cache_1h,
            feature_cache_7d,
            trigger,
            listing: ListingHistory::new(),
            economic: Mutex::new(EconomicTracker::new()),
            metrics: Arc::new(ServerMetrics::default()),
            cycle_seq: AtomicU64::new(0),
            raw_decimator,
            raw_writer: None,
            route_ranking: None,
            label_resolver: None,
            label_stride_s: 60,
            label_floor_pct: 0.8,
            label_floors_pct,
            label_horizons_s,
            last_trade_emit_by_route: Mutex::new(AHashMap::with_capacity(4096)),
            alive_since_by_route: Mutex::new(AHashMap::with_capacity(4096)),
            opportunity_alive_threshold_pct: 0.0,
            recommendation_cooldown_ns,
            runtime_config_hash,
            priority_set_generation_id: AtomicU64::new(0),
            priority_set_updated_at_ns: AtomicU64::new(0),
        }
    }

    fn refresh_runtime_config_hash(&mut self) {
        self.runtime_config_hash = compute_runtime_config_hash(
            self.trigger.config(),
            self.baseline.config(),
            self.label_stride_s,
            self.label_floor_pct,
            &self.label_floors_pct,
            &self.label_horizons_s,
            self.raw_decimator.modulus(),
            self.recommendation_cooldown_ns,
            self.opportunity_alive_threshold_pct,
        );
    }

    /// incrementa geração do priority_set e registra timestamp de update.
    /// Deve ser chamado por quem instala novo snapshot em
    /// `raw_decimator.set_priority_set()`.
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
            self.last_trade_emit_by_route.lock().insert(route, now_ns);
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
        self.feature_cache_1h
            .observe(route, entry_spread, exit_spread, now_ns);
        self.feature_cache_7d
            .observe(route, entry_spread, exit_spread, now_ns);
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
        let entry_p25_pre_observe = self.baseline.cache().quantile_entry(route, 0.25);
        let entry_p50_pre_observe = self.baseline.cache().quantile_entry(route, 0.50);
        let entry_p75_pre_observe = self.baseline.cache().quantile_entry(route, 0.75);
        let entry_p95_pre_observe = self.baseline.cache().quantile_entry(route, 0.95);
        let exit_p25_pre_observe = self.baseline.cache().quantile_exit(route, 0.25);
        let exit_p50_pre_observe = self.baseline.cache().quantile_exit(route, 0.50);
        let exit_p75_pre_observe = self.baseline.cache().quantile_exit(route, 0.75);
        let exit_p95_pre_observe = self.baseline.cache().quantile_exit(route, 0.95);
        let entry_rank_pre_observe = self
            .baseline
            .cache()
            .entry_rank_percentile(route, entry_spread);
        let entry_minus_p50_pre = entry_p50_pre_observe.map(|p50| entry_spread - p50);
        let entry_mad_pre = self.baseline.cache().entry_mad_robust(route);
        let exit_threshold_for_primary_floor = self.label_floor_pct - entry_spread;
        let p_exit_ge_floor_pre = self
            .baseline
            .cache()
            .probability_exit_ge(route, exit_threshold_for_primary_floor)
            .map(|(p, _, _)| p);
        let entry_p50_1h_pre_observe = self.feature_cache_1h.quantile_entry(route, 0.50);
        let entry_rank_1h_pre_observe = self
            .feature_cache_1h
            .entry_rank_percentile(route, entry_spread);
        let p_exit_ge_floor_1h_pre = self
            .feature_cache_1h
            .probability_exit_ge(route, exit_threshold_for_primary_floor)
            .map(|(p, _, _)| p);
        let entry_p50_7d_pre_observe = self.feature_cache_7d.quantile_entry(route, 0.50);
        let entry_p95_7d_pre_observe = self.feature_cache_7d.quantile_entry(route, 0.95);
        let p_exit_ge_floor_7d_pre = self
            .feature_cache_7d
            .probability_exit_ge(route, exit_threshold_for_primary_floor)
            .map(|(p, _, _)| p);
        let (gross_run_p05_pre_observe, gross_run_p50_pre_observe, gross_run_p95_pre_observe) =
            self.baseline
                .cache()
                .exit_run_duration_quantiles(route, exit_threshold_for_primary_floor)
                .map(|(p05, p50, p95)| (Some(p05), Some(p50), Some(p95)))
                .unwrap_or((None, None, None));
        let exit_excess_run_pre = exit_p50_pre_observe.and_then(|threshold| {
            self.baseline
                .cache()
                .exit_run_duration_quantiles(route, threshold)
                .map(|(_, p50, _)| p50)
        });
        let tail_ratio_pre_observe = self.baseline.cache().tail_ratio_p99_p95(route);
        let n_cache_obs_pre = self.baseline.cache().n_observations(route) as u32;
        let oldest_cache_ts_pre = self.baseline.cache().oldest_observation_ns(route);
        let time_alive_at_t0_s = self.time_alive_snapshot(route, entry_spread, now_ns);
        let listing_age_days_pre_observe = self.listing.listing_age_days(route, now_ns);

        FeaturesT0 {
            half_spread_buy_now,
            half_spread_sell_now,
            tail_ratio_p99_p95: tail_ratio_pre_observe,
            entry_p25_24h: entry_p25_pre_observe,
            entry_p50_24h: entry_p50_pre_observe,
            entry_p75_24h: entry_p75_pre_observe,
            entry_p95_24h: entry_p95_pre_observe,
            entry_rank_percentile_24h: entry_rank_pre_observe,
            entry_minus_p50_24h: entry_minus_p50_pre,
            entry_mad_robust_24h: entry_mad_pre,
            exit_p25_24h: exit_p25_pre_observe,
            exit_p50_24h: exit_p50_pre_observe,
            exit_p75_24h: exit_p75_pre_observe,
            exit_p95_24h: exit_p95_pre_observe,
            p_exit_ge_label_floor_minus_entry_24h: p_exit_ge_floor_pre,
            entry_p50_1h: entry_p50_1h_pre_observe,
            entry_rank_percentile_1h: entry_rank_1h_pre_observe,
            p_exit_ge_label_floor_minus_entry_1h: p_exit_ge_floor_1h_pre,
            entry_p50_7d: entry_p50_7d_pre_observe,
            entry_p95_7d: entry_p95_7d_pre_observe,
            p_exit_ge_label_floor_minus_entry_7d: p_exit_ge_floor_7d_pre,
            gross_run_p05_s: gross_run_p05_pre_observe,
            gross_run_p50_s: gross_run_p50_pre_observe,
            gross_run_p95_s: gross_run_p95_pre_observe,
            exit_excess_run_s: exit_excess_run_pre,
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
        tier: SamplingTier,
        raw_sampling_probability: f32,
        rec_meta: &RecommendationPersistence,
    ) {
        let label_sampling_probability = f32::NAN;
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
            tier.as_str(),
            raw_sampling_probability,
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

        // �� decimator em tiers.
        let tier_snapshot = if let Some(raw_writer) = self.raw_writer.as_ref() {
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
                    self.runtime_config_hash.clone(),
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
            Some((dr.tier, dr.probability))
        } else {
            let dr = self
                .raw_decimator
                .decide_for_sample(route, now_ns, cycle_seq);
            Some((dr.tier, dr.probability))
        };

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

        // Background abaixo do threshold visual alimenta historico PIT e
        // resolve labels existentes, mas nao pode criar um PendingLabel para
        // todo tick limpo: isso explode cardinalidade e trava o ciclo. So
        // materializa candidato novo aqui se o proprio trigger aceitou.
        let features_t0 = if clean && sample_dec == SampleDecision::Accept {
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
            if let Some(resolver) = self.label_resolver.as_ref() {
                resolver.on_clean_observation(route, now_ns, entry_spread, exit_spread);
            }
        }

        if clean {
            if let (Some(resolver), Some((tier, raw_sampling_probability))) =
                (self.label_resolver.as_ref(), tier_snapshot)
            {
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
                    tier,
                    raw_sampling_probability,
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
        //     se o decimator (com 3 tiers) aprovar. `sample_id` e
        //     `sampling_tier` inclusos no schema v3.
        let tier_snapshot = if let Some(raw_writer) = self.raw_writer.as_ref() {
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
                    self.runtime_config_hash.clone(),
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
            Some((dr.tier, dr.probability))
        } else {
            // Sem raw_writer, ainda calcula o tier para alimentar o label
            // resolver (correção B1 — label persiste mesmo sem raw).
            let dr = self
                .raw_decimator
                .decide_for_sample(route, now_ns, cycle_seq);
            Some((dr.tier, dr.probability))
        };

        // 3. Gera recomendação apenas a partir dos spreads e histórico PIT.
        let rec = self
            .baseline
            .recommend(route, entry_spread, exit_spread, now_ns);
        let n_observations = self
            .baseline
            .cache()
            .n_observations(route)
            .min(u32::MAX as u64) as u32;
        let rec = enforce_recommendation_invariants(
            rec,
            n_observations,
            Some(&self.metrics.rec_invariant_blocked),
        );
        let rec = self.apply_trade_cooldown(route, now_ns, n_observations, rec);
        self.bump_rec_metric(&rec);
        let entry_p25_pre_observe = self.baseline.cache().quantile_entry(route, 0.25);
        let entry_p50_pre_observe = self.baseline.cache().quantile_entry(route, 0.50);
        let entry_p75_pre_observe = self.baseline.cache().quantile_entry(route, 0.75);
        let entry_p95_pre_observe = self.baseline.cache().quantile_entry(route, 0.95);
        let exit_p25_pre_observe = self.baseline.cache().quantile_exit(route, 0.25);
        let exit_p50_pre_observe = self.baseline.cache().quantile_exit(route, 0.50);
        let exit_p75_pre_observe = self.baseline.cache().quantile_exit(route, 0.75);
        let exit_p95_pre_observe = self.baseline.cache().quantile_exit(route, 0.95);
        // percentil empírico de entry_now na ECDF 24h (Teste 1 literal).
        let entry_rank_pre_observe = self
            .baseline
            .cache()
            .entry_rank_percentile(route, entry_spread);
        // magnitude e escala robusta para z-score downstream.
        let entry_minus_p50_pre = entry_p50_pre_observe.map(|p50| entry_spread - p50);
        let entry_mad_pre = self.baseline.cache().entry_mad_robust(route);
        // frequência empírica P_hist(exit ≥ floor − entry_now) (Teste 2).
        let exit_threshold_for_primary_floor = self.label_floor_pct - entry_spread;
        let p_exit_ge_floor_pre = self
            .baseline
            .cache()
            .probability_exit_ge(route, exit_threshold_for_primary_floor)
            .map(|(p, _, _)| p);
        let entry_p50_1h_pre_observe = self.feature_cache_1h.quantile_entry(route, 0.50);
        let entry_rank_1h_pre_observe = self
            .feature_cache_1h
            .entry_rank_percentile(route, entry_spread);
        let p_exit_ge_floor_1h_pre = self
            .feature_cache_1h
            .probability_exit_ge(route, exit_threshold_for_primary_floor)
            .map(|(p, _, _)| p);
        let entry_p50_7d_pre_observe = self.feature_cache_7d.quantile_entry(route, 0.50);
        let entry_p95_7d_pre_observe = self.feature_cache_7d.quantile_entry(route, 0.95);
        let p_exit_ge_floor_7d_pre = self
            .feature_cache_7d
            .probability_exit_ge(route, exit_threshold_for_primary_floor)
            .map(|(p, _, _)| p);
        // PIT: duração histórica dos runs em que a saída teria satisfeito
        // o floor primário dado o entry travado AGORA.
        //
        // Não use `entry(t)+exit(t)` simultâneo aqui: pela identidade da
        // skill §2 isso é estruturalmente negativo e tornava `gross_run_*`
        // nulo em massa. O threshold correto para o histórico de saída é:
        //     exit >= label_floor - entry_locked(t0)
        let (gross_run_p05_pre_observe, gross_run_p50_pre_observe, gross_run_p95_pre_observe) =
            self.baseline
                .cache()
                .exit_run_duration_quantiles(route, exit_threshold_for_primary_floor)
                .map(|(p05, p50, p95)| (Some(p05), Some(p50), Some(p95)))
                .unwrap_or((None, None, None));
        // run condicional em exit_p50_24h (sem condicionamento em entry atual).
        let exit_excess_run_pre = exit_p50_pre_observe.and_then(|threshold| {
            self.baseline
                .cache()
                .exit_run_duration_quantiles(route, threshold)
                .map(|(_, p50, _)| p50)
        });
        let listing_age_days_pre_observe = self.listing.listing_age_days(route, now_ns);
        // tail ratio com safeguard para buckets colapsados.
        let tail_ratio_pre_observe = self.baseline.cache().tail_ratio_p99_p95(route);
        // estado PIT do cache em t0 para reconstrutibilidade offline.
        let n_cache_obs_pre = self.baseline.cache().n_observations(route) as u32;
        let oldest_cache_ts_pre = self.baseline.cache().oldest_observation_ns(route);
        if clean {
            self.observe_clean_spread(route, entry_spread, exit_spread, now_ns);
            self.economic
                .lock()
                .process(route, entry_spread, exit_spread, now_ns, &rec);
            // �� resolvedor supervisionado consome obs limpa.
            if let Some(resolver) = self.label_resolver.as_ref() {
                resolver.on_clean_observation(route, now_ns, entry_spread, exit_spread);
            }
        }

        // 4. **C4** — emite `AcceptedSample` se o trigger aceitou.
        //    O stream accepted é full-capture dos Accepts; a probabilidade
        //    aqui descreve inclusão no papel accepted, não o decimator raw.
        //    `was_recommended` inicializa `false`; o caller marca `true`
        //    quando a recomendação gerada para o snapshot foi `Trade`.
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
            Some(sample)
        } else {
            None
        };

        // �� enfileira `PendingLabel` para candidates limpos, não
        // apenas Accept. Isso dá negativos supervisionáveis
        // (insufficient_history/below_tail) para abstenção sem contaminar
        // com low-volume operacional.
        if let (Some(resolver), Some((tier, raw_sampling_probability))) =
            (self.label_resolver.as_ref(), tier_snapshot)
        {
            if !clean {
                return (rec, sample_dec, accepted);
            }
            let rec_meta = recommendation_persistence(&rec);
            let features_t0 = FeaturesT0 {
                half_spread_buy_now,
                half_spread_sell_now,
                tail_ratio_p99_p95: tail_ratio_pre_observe,
                entry_p25_24h: entry_p25_pre_observe,
                entry_p50_24h: entry_p50_pre_observe,
                entry_p75_24h: entry_p75_pre_observe,
                entry_p95_24h: entry_p95_pre_observe,
                entry_rank_percentile_24h: entry_rank_pre_observe,
                entry_minus_p50_24h: entry_minus_p50_pre,
                entry_mad_robust_24h: entry_mad_pre,
                exit_p25_24h: exit_p25_pre_observe,
                exit_p50_24h: exit_p50_pre_observe,
                exit_p75_24h: exit_p75_pre_observe,
                exit_p95_24h: exit_p95_pre_observe,
                p_exit_ge_label_floor_minus_entry_24h: p_exit_ge_floor_pre,
                entry_p50_1h: entry_p50_1h_pre_observe,
                entry_rank_percentile_1h: entry_rank_1h_pre_observe,
                p_exit_ge_label_floor_minus_entry_1h: p_exit_ge_floor_1h_pre,
                entry_p50_7d: entry_p50_7d_pre_observe,
                entry_p95_7d: entry_p95_7d_pre_observe,
                p_exit_ge_label_floor_minus_entry_7d: p_exit_ge_floor_7d_pre,
                gross_run_p05_s: gross_run_p05_pre_observe,
                gross_run_p50_s: gross_run_p50_pre_observe,
                gross_run_p95_s: gross_run_p95_pre_observe,
                exit_excess_run_s: exit_excess_run_pre,
                n_cache_observations_at_t0: n_cache_obs_pre,
                oldest_cache_ts_ns: oldest_cache_ts_pre,
                time_alive_at_t0_s,
                listing_age_days: listing_age_days_pre_observe,
                route_first_seen_ns: lifecycle.map(|lc| lc.first_seen_ns),
                route_last_seen_ns: lifecycle.map(|lc| lc.last_seen_ns),
                route_active_until_ns: lifecycle.and_then(|lc| lc.active_until_ns),
                route_n_snapshots: lifecycle.map(|lc| lc.n_snapshots),
            };
            // Probabilidade efetiva do label é desconhecida online: o labeler
            // usa stride por rota, então IPW correto depende da taxa observada
            // de candidates/accepts por rota e deve ser estimado offline.
            let label_sampling_probability = f32::NAN;
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
                tier.as_str(),
                raw_sampling_probability,
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
            ci_method: "wilson_marginal",
            model_version: "test-0.1.0".into(),
            source_kind: crate::ml::contract::SourceKind::Baseline,
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
    fn accumulated_observations_eventually_emit_trade() {
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
        match rec {
            Recommendation::Trade(setup) => {
                assert_eq!(setup.route_id, route);
                assert!(
                    setup
                        .baseline_diagnostics
                        .as_ref()
                        .unwrap()
                        .historical_base_rate_24h
                        > 0.0
                );
                assert!(setup.p_hit.is_none());
                assert!(setup.t_hit_median_s.is_none());
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("expected Trade, got Abstain({:?})", reason);
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

        let _ = server.on_opportunity(0, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t0);
        let (first, _, _) = server.on_opportunity(1, route, "BTC-USDT", 3.1, 0.6, 1e6, 1e6, t1);
        assert!(matches!(first, Recommendation::Trade(_)));

        let (second, _, _) = server.on_opportunity(2, route, "BTC-USDT", 3.2, 0.7, 1e6, 1e6, t2);
        match second {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::Cooldown);
            }
            other => panic!("expected cooldown Abstain, got {:?}", other),
        }
    }

    #[test]
    fn economic_tracker_resolves_a_trade_in_sequence() {
        // Semântica pós-auditoria: requer 3 ticks.
        // t0: populate cache + abstain InsufficientHistory
        // t1: emite Trade e trava entry_now em t1 (cache tem 1 sample, n_min=1)
        // t2: tick futuro com exit >= exit_target realiza o trade.
        let server = mk_server_with_min_history(1);
        let route = mk_route();

        let t0: u64 = 1_000_000_000;
        let t1: u64 = t0 + 1_000_000_000;
        let t2: u64 = t1 + 1_000_000_000;

        // Tick 0: populate cache (entry=3.0, exit=0.5 → gross=3.5, bem acima do floor).
        let (_rec, dec, _) = server.on_opportunity(0, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t0);
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);

        // Tick 1: agora cache tem 1 sample ≥ n_min. Emite Trade.
        let (rec, _dec, _accepted) =
            server.on_opportunity(1, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t1);
        let setup = match rec {
            Recommendation::Trade(s) => s,
            Recommendation::Abstain { reason, .. } => panic!("esperava Trade, got {:?}", reason),
        };

        // Tick 2: entry já está travado em t1; só exit futuro precisa cruzar o alvo.
        assert_eq!(setup.entry_now, 3.0);
        assert!(setup.exit_target <= 0.5 + 0.01);

        let (_rec, _dec, _accepted) =
            server.on_opportunity(2, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t2);

        let econ = server.economic_metrics();
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
        let server = mk_server_with_min_history(1);
        let route = mk_route();

        let t0: u64 = 1_000_000_000;
        let t_emit: u64 = t0 + 1_000_000_000;

        // Primeiro popula cache.
        let _ = server.on_opportunity(0, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t0);

        // Tick de emissão: entry E exit já favoráveis no MESMO tick.
        let (rec, _, _) = server.on_opportunity(1, route, "BTC-USDT", 3.5, 0.5, 1e6, 1e6, t_emit);
        assert!(
            matches!(rec, Recommendation::Trade(_)),
            "cache populado deve emitir Trade no 2º tick"
        );

        // SEM fix, trade realizaria no mesmo tick em horizon=0s
        // (violando skill §2). COM fix, grace MIN_HORIZON_NS bloqueia.
        let econ = server.economic_metrics();
        let realized_after_emit = econ.n_realized_total.load(Ordering::Relaxed);
        assert_eq!(
            realized_after_emit, 0,
            "trade NÃO deve realizar intra-tick (horizon > 0 é obrigatório)"
        );
    }

    #[test]
    fn economic_sweeper_closes_silent_route_after_valid_until() {
        let server = mk_server_with_min_history(1);
        let route = mk_route();
        let t0: u64 = 1_000_000_000;
        let t_emit: u64 = t0 + 1_000_000_000;

        let _ = server.on_opportunity(0, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t0);
        let (rec, _, _) = server.on_opportunity(1, route, "BTC-USDT", 3.0, 0.4, 1e6, 1e6, t_emit);
        assert!(matches!(rec, Recommendation::Trade(_)));

        let closed = server.economic_sweep(t_emit + 31_000_000_000);
        let econ = server.economic_metrics();
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
            .with_raw_decimator(RouteDecimator::with_modulus(1));
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
    async fn clean_background_below_tail_does_not_create_new_label_candidate() {
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
            .with_raw_decimator(RouteDecimator::with_modulus(1));
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
            0,
            "background below-tail alimenta cache/raw e resolve labels existentes, mas nao cria pending por tick"
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
                && v["policy_metadata"]["label_sampling_probability"].is_null(),
            "sampling_probability top-level carrega contexto do raw decimator; probabilidade efetiva do label depende do stride por rota e fica em policy_metadata.label_sampling_probability"
        );
    }
}
