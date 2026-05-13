//! Resolver de `LabeledTrade` com horizontes independentes (Opção B).
//!
//! Cada candidate limpo elegível pelo stride gera um `PendingLabel`
//! contendo um `PendingHorizon` por horizonte configurado. Cada slot é
//! resolvido independentemente: quando `now_ns >= t_emit + horizon_s`,
//! escreve seu record no `LabeledWriterHandle` e fecha.
//!
//! Observações atualizam `best_exit`, `first_exit_ge_label_floor` APENAS
//! quando `is_clean_data == true` (correção PhD Q2). Observações sujas
//! entram no RawSample mas não contaminam o supervisionado.
//!
//! # Sweeper global
//!
//! Task tokio `interval(sweeper_interval_s)` varre todos os `PendingHorizon`
//! abertos:
//! - Se `observed_until_ns < now - 5 min` → censura `route_vanished`.
//! - Se `now >= t_emit + h + slack` → fecha normal.
//!
//! Em SIGTERM limpo, pendings abertos são fechados preservando outcomes já
//! determinados; apenas janelas incompletas viram `censored { shutdown }`.

use std::collections::VecDeque;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use ahash::AHashMap;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use smallvec::SmallVec;
use tokio::sync::{mpsc, oneshot};

use crate::ml::contract::RouteId;
use crate::ml::persistence::labeled_trade::{
    CensorReason, FeaturesT0, FloorHitLabel, LabelOutcome, LabeledTrade, PolicyMetadata,
    LABELED_TRADE_SCHEMA_VERSION,
};
use crate::ml::persistence::labeled_writer::{LabeledWriterHandle, LabeledWriterSendError};
use crate::ml::persistence::raw_sample::sampling_probability_kind_for_tier_label;
use crate::ml::SCANNER_VERSION;
use crate::types::{SymbolId, Venue};

/// Padrões de horizonte (s) — fix A7.
///
/// Grid log-uniforme cobrindo lacuna 2h→8h. CLAUDE.md cita `T~2h15` como
/// exemplo típico; rotas com `gross_run_p95` em 1–4h sem este grid ficavam
/// sempre `Miss@2h` e `Realized@8h`, quantizando `T` em 4 pontos. Chen 2024
/// (arXiv:2410.01086) §4 recomenda grid log-uniforme para fill-time.
pub const DEFAULT_HORIZONS_S: [u32; 6] = [900, 1800, 3600, 7200, 14400, 28800];

/// Floors brutos padrao para estimar P(exit atinge floor | estado, floor).
/// `0.8` permanece como floor primario de compatibilidade.
pub const DEFAULT_LABEL_FLOORS_PCT: [f32; 6] = [0.3, 0.5, 0.8, 1.2, 2.0, 3.0];

/// Slack após `t_emit + h` antes de fechar o horizonte.
///
/// Default 120s — observações em rotas longtail legítimas podem chegar com
/// cadência >30s; o slack original de 30s descartava silenciosamente Hits
/// tardios e enviesava `P` para baixo. Valor adaptativo `max(120s, 2 ×
/// p99_inter_evento_rota)` seria ideal em produção; aqui configuramos um
/// piso mais conservador. Para regimes muito esparsos, caller deve injetar
/// via `ResolverConfig::close_slack_ns`.
pub const DEFAULT_CLOSE_SLACK_NS: u64 = 120 * 1_000_000_000; // 120 s

/// Tempo após último `observed_until_ns` que caracteriza rota sumida.
///
/// Antes 5min — menor que o horizonte mínimo de 15min, causando
/// `Censored{RouteVanished}` falso em rotas ilíquidas cuja cadência
/// inter-evento legítima supera 5min (skill/CLAUDE.md: regime longtail 0.3–4%
/// tem cadência esparsa). Novo default 30min; operador que queira detectar
/// delisting rápido parametriza via `ResolverConfig::route_vanish_idle_ns`.
/// Arroyo et al. 2023 arXiv:2306.05479 §3 discute informative censoring
/// em LOB — o pressuposto Kaplan-Meier de independência entre mecanismo
/// de censura e evento exige separar ilíquidez transitória de delisting.
pub const ROUTE_VANISH_IDLE_NS: u64 = 30 * 60 * 1_000_000_000; // 30 min

/// Limite superior de idle antes de classificar rota como delistada.
///
/// Entre `ROUTE_VANISH_IDLE_NS` e este threshold → `RouteDormant`.
/// Acima → `RouteDelisted`. Permite distinguir ilíquidez transitória de
/// eventos estruturais (halt, delisting, ticker rename).
pub const ROUTE_DELISTED_IDLE_NS: u64 = 60 * 60 * 1_000_000_000; // 1 h

/// Limite de pending labels por rota antes de ajustar stride (fix A5/C6).
///
/// Mantém cap original de 10_000 por compat; a política foi invertida para
/// evitar enviesar contra regime atual em rotas quentes — agora incoming é
/// aceito e novos candidates aplicam stride adaptativo via
/// `LabelResolver::on_candidate`.
pub const MAX_PENDING_PER_ROUTE: usize = 10_000;

/// Stride base global para `on_candidate`.
pub const LABEL_STRIDE_BASE_S: u32 = 60;

/// Eventos independentes alvo por horizonte; controla stride efetivo.
pub const N_EVENTS_TARGET_PER_HORIZON: u32 = 10;

#[derive(Debug, Clone)]
pub struct PendingFloorHitState {
    pub first_exit_ge_floor_ts_ns: Option<u64>,
    pub first_exit_ge_floor_pct: Option<f32>,
}

#[derive(Debug, Clone)]
pub struct PendingHorizon {
    pub horizon_s: u32,
    pub best_exit_pct_so_far: Option<f32>,
    pub best_exit_ts_ns_so_far: Option<u64>,
    pub first_exit_ge_floor_ts_ns: Option<u64>,
    pub first_exit_ge_floor_pct: Option<f32>,
    pub floor_hits: SmallVec<[PendingFloorHitState; 8]>,
    pub observed_until_ns: u64,
    pub n_clean_future_samples: u32,
    pub closed: bool,
}

impl PendingHorizon {
    fn new(horizon_s: u32, t_emit_ns: u64, n_floors: usize) -> Self {
        Self {
            horizon_s,
            best_exit_pct_so_far: None,
            best_exit_ts_ns_so_far: None,
            first_exit_ge_floor_ts_ns: None,
            first_exit_ge_floor_pct: None,
            floor_hits: (0..n_floors)
                .map(|_| PendingFloorHitState {
                    first_exit_ge_floor_ts_ns: None,
                    first_exit_ge_floor_pct: None,
                })
                .collect(),
            observed_until_ns: t_emit_ns,
            n_clean_future_samples: 0,
            closed: false,
        }
    }
}

/// Metadados congelados em t₀ — não mudam ao longo da vida do pending.
///
/// Fix C3 + C13 + C2: v6 carrega cluster_id, runtime_config_hash,
/// priority_set_generation_id para persistir em cada record fechado.
#[derive(Debug, Clone)]
pub struct PendingLabel {
    pub sample_id: String,
    pub sample_decision: &'static str,
    pub ts_emit_ns: u64,
    pub cycle_seq: u32,
    pub route_id: RouteId,
    pub symbol_name: String,
    pub entry_locked_pct: f32,
    pub exit_start_pct: f32,
    pub features_t0: FeaturesT0,
    pub label_floor_pct: f32,
    pub label_floors_pct: Vec<f32>,
    pub policy_metadata: PolicyMetadata,
    pub sampling_tier: &'static str,
    pub sampling_probability: f32,
    pub horizons: Vec<PendingHorizon>,
    // Fix C3
    pub cluster_id: String,
    pub cluster_size: u32,
    pub cluster_rank: u32,
    // Fix C13
    pub runtime_config_hash: String,
    // Fix C2
    pub priority_set_generation_id: u32,
    pub priority_set_updated_at_ns: u64,
}

impl PendingLabel {
    pub fn all_closed(&self) -> bool {
        self.horizons.iter().all(|h| h.closed)
    }
}

/// Parte imutável de `PendingLabel`, congelada em t0.
///
/// Produção grava este bloco em spool append-only e mantém em RAM apenas
/// `PendingLabelState`. Isso preserva 100% da semântica do label fechado,
/// mas evita reter features, policy metadata e strings durante horas.
#[derive(Debug, Clone)]
struct PendingLabelMeta {
    sample_id: String,
    sample_decision: &'static str,
    ts_emit_ns: u64,
    cycle_seq: u32,
    route_id: RouteId,
    symbol_name: String,
    entry_locked_pct: f32,
    exit_start_pct: f32,
    features_t0: FeaturesT0,
    label_floor_pct: f32,
    label_floors_pct: Vec<f32>,
    policy_metadata: PolicyMetadata,
    sampling_tier: &'static str,
    sampling_probability: f32,
    cluster_id: String,
    cluster_size: u32,
    cluster_rank: u32,
    runtime_config_hash: String,
    priority_set_generation_id: u32,
    priority_set_updated_at_ns: u64,
}

#[derive(Debug, Clone)]
struct PendingLabelState {
    meta_ref: PendingMetaRef,
    ts_emit_ns: u64,
    route_id: RouteId,
    entry_locked_pct: f32,
    label_floor_pct: f32,
    label_floors_pct: SmallVec<[f32; 8]>,
    // Keep horizon storage heap-backed so memory can actually shrink as
    // shorter horizons close. An inline SmallVec<[PendingHorizon; 6]> keeps
    // six full PendingHorizon slots reserved for every live candidate until
    // the last 8h horizon closes, which creates multi-hour RAM growth without
    // adding training signal.
    horizons: Vec<PendingHorizon>,
}

impl PendingLabelState {
    fn all_closed(&self) -> bool {
        self.horizons.is_empty()
    }
}

#[derive(Debug, Clone)]
enum PendingMetaRef {
    Memory(usize),
    Disk {
        segment_id: u64,
        offset: u64,
        len: u32,
    },
}

#[derive(Debug)]
struct ClosedHorizonWrite {
    meta_ref: PendingMetaRef,
    route_id: RouteId,
    horizon: PendingHorizon,
    censor_reason: Option<CensorReason>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PendingLabelMetaDto {
    sample_id: String,
    sample_decision: String,
    ts_emit_ns: u64,
    cycle_seq: u32,
    symbol_id: u32,
    buy_venue_idx: u8,
    sell_venue_idx: u8,
    symbol_name: String,
    entry_locked_pct: f32,
    exit_start_pct: f32,
    features_t0: FeaturesT0,
    label_floor_pct: f32,
    label_floors_pct: Vec<f32>,
    policy_metadata: PolicyMetadataDto,
    sampling_tier: String,
    sampling_probability: f32,
    cluster_id: String,
    cluster_size: u32,
    cluster_rank: u32,
    runtime_config_hash: String,
    priority_set_generation_id: u32,
    priority_set_updated_at_ns: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct PolicyMetadataDto {
    baseline_model_version: String,
    baseline_recommended: bool,
    recommendation_kind: String,
    abstain_reason: Option<String>,
    prediction_source_kind: String,
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
    prediction_calibration_status: String,
    baseline_historical_base_rate_24h: Option<f32>,
    baseline_derived_enter_at_min: Option<f32>,
    baseline_derived_exit_at_min: Option<f32>,
    baseline_floor_pct: f32,
    label_stride_s: u32,
    effective_stride_s: u32,
    label_sampling_probability: f32,
    candidates_in_route_last_24h: u32,
    accepts_in_route_last_24h: u32,
    ci_method: String,
}

impl From<&PendingLabelMeta> for PendingLabelMetaDto {
    fn from(meta: &PendingLabelMeta) -> Self {
        Self {
            sample_id: meta.sample_id.clone(),
            sample_decision: meta.sample_decision.to_string(),
            ts_emit_ns: meta.ts_emit_ns,
            cycle_seq: meta.cycle_seq,
            symbol_id: meta.route_id.symbol_id.0,
            buy_venue_idx: meta.route_id.buy_venue as u8,
            sell_venue_idx: meta.route_id.sell_venue as u8,
            symbol_name: meta.symbol_name.clone(),
            entry_locked_pct: meta.entry_locked_pct,
            exit_start_pct: meta.exit_start_pct,
            features_t0: meta.features_t0.clone(),
            label_floor_pct: meta.label_floor_pct,
            label_floors_pct: meta.label_floors_pct.clone(),
            policy_metadata: PolicyMetadataDto::from(&meta.policy_metadata),
            sampling_tier: meta.sampling_tier.to_string(),
            sampling_probability: meta.sampling_probability,
            cluster_id: meta.cluster_id.clone(),
            cluster_size: meta.cluster_size,
            cluster_rank: meta.cluster_rank,
            runtime_config_hash: meta.runtime_config_hash.clone(),
            priority_set_generation_id: meta.priority_set_generation_id,
            priority_set_updated_at_ns: meta.priority_set_updated_at_ns,
        }
    }
}

impl PendingLabelMetaDto {
    fn into_meta(self) -> anyhow::Result<PendingLabelMeta> {
        let buy_venue = Venue::ALL
            .get(self.buy_venue_idx as usize)
            .copied()
            .ok_or_else(|| anyhow::anyhow!("invalid buy venue idx {}", self.buy_venue_idx))?;
        let sell_venue = Venue::ALL
            .get(self.sell_venue_idx as usize)
            .copied()
            .ok_or_else(|| anyhow::anyhow!("invalid sell venue idx {}", self.sell_venue_idx))?;
        Ok(PendingLabelMeta {
            sample_id: self.sample_id,
            sample_decision: intern_static_label(self.sample_decision),
            ts_emit_ns: self.ts_emit_ns,
            cycle_seq: self.cycle_seq,
            route_id: RouteId {
                symbol_id: SymbolId(self.symbol_id),
                buy_venue,
                sell_venue,
            },
            symbol_name: self.symbol_name,
            entry_locked_pct: self.entry_locked_pct,
            exit_start_pct: self.exit_start_pct,
            features_t0: self.features_t0,
            label_floor_pct: self.label_floor_pct,
            label_floors_pct: self.label_floors_pct,
            policy_metadata: self.policy_metadata.into_policy(),
            sampling_tier: intern_static_label(self.sampling_tier),
            sampling_probability: self.sampling_probability,
            cluster_id: self.cluster_id,
            cluster_size: self.cluster_size,
            cluster_rank: self.cluster_rank,
            runtime_config_hash: self.runtime_config_hash,
            priority_set_generation_id: self.priority_set_generation_id,
            priority_set_updated_at_ns: self.priority_set_updated_at_ns,
        })
    }
}

impl From<&PolicyMetadata> for PolicyMetadataDto {
    fn from(p: &PolicyMetadata) -> Self {
        Self {
            baseline_model_version: p.baseline_model_version.clone(),
            baseline_recommended: p.baseline_recommended,
            recommendation_kind: p.recommendation_kind.to_string(),
            abstain_reason: p.abstain_reason.map(str::to_string),
            prediction_source_kind: p.prediction_source_kind.to_string(),
            prediction_model_version: p.prediction_model_version.clone(),
            prediction_emitted_at_ns: p.prediction_emitted_at_ns,
            prediction_valid_until_ns: p.prediction_valid_until_ns,
            prediction_entry_now: p.prediction_entry_now,
            prediction_exit_target: p.prediction_exit_target,
            prediction_gross_profit_target: p.prediction_gross_profit_target,
            prediction_p_hit: p.prediction_p_hit,
            prediction_p_hit_ci_lo: p.prediction_p_hit_ci_lo,
            prediction_p_hit_ci_hi: p.prediction_p_hit_ci_hi,
            prediction_exit_q25: p.prediction_exit_q25,
            prediction_exit_q50: p.prediction_exit_q50,
            prediction_exit_q75: p.prediction_exit_q75,
            prediction_t_hit_p25_s: p.prediction_t_hit_p25_s,
            prediction_t_hit_median_s: p.prediction_t_hit_median_s,
            prediction_t_hit_p75_s: p.prediction_t_hit_p75_s,
            prediction_p_censor: p.prediction_p_censor,
            prediction_calibration_status: p.prediction_calibration_status.to_string(),
            baseline_historical_base_rate_24h: p.baseline_historical_base_rate_24h,
            baseline_derived_enter_at_min: p.baseline_derived_enter_at_min,
            baseline_derived_exit_at_min: p.baseline_derived_exit_at_min,
            baseline_floor_pct: p.baseline_floor_pct,
            label_stride_s: p.label_stride_s,
            effective_stride_s: p.effective_stride_s,
            label_sampling_probability: p.label_sampling_probability,
            candidates_in_route_last_24h: p.candidates_in_route_last_24h,
            accepts_in_route_last_24h: p.accepts_in_route_last_24h,
            ci_method: p.ci_method.to_string(),
        }
    }
}

impl PolicyMetadataDto {
    fn into_policy(self) -> PolicyMetadata {
        PolicyMetadata {
            baseline_model_version: self.baseline_model_version,
            baseline_recommended: self.baseline_recommended,
            recommendation_kind: intern_static_label(self.recommendation_kind),
            abstain_reason: self.abstain_reason.map(intern_static_label),
            prediction_source_kind: intern_static_label(self.prediction_source_kind),
            prediction_model_version: self.prediction_model_version,
            prediction_emitted_at_ns: self.prediction_emitted_at_ns,
            prediction_valid_until_ns: self.prediction_valid_until_ns,
            prediction_entry_now: self.prediction_entry_now,
            prediction_exit_target: self.prediction_exit_target,
            prediction_gross_profit_target: self.prediction_gross_profit_target,
            prediction_p_hit: self.prediction_p_hit,
            prediction_p_hit_ci_lo: self.prediction_p_hit_ci_lo,
            prediction_p_hit_ci_hi: self.prediction_p_hit_ci_hi,
            prediction_exit_q25: self.prediction_exit_q25,
            prediction_exit_q50: self.prediction_exit_q50,
            prediction_exit_q75: self.prediction_exit_q75,
            prediction_t_hit_p25_s: self.prediction_t_hit_p25_s,
            prediction_t_hit_median_s: self.prediction_t_hit_median_s,
            prediction_t_hit_p75_s: self.prediction_t_hit_p75_s,
            prediction_p_censor: self.prediction_p_censor,
            prediction_calibration_status: intern_static_label(self.prediction_calibration_status),
            baseline_historical_base_rate_24h: self.baseline_historical_base_rate_24h,
            baseline_derived_enter_at_min: self.baseline_derived_enter_at_min,
            baseline_derived_exit_at_min: self.baseline_derived_exit_at_min,
            baseline_floor_pct: self.baseline_floor_pct,
            label_stride_s: self.label_stride_s,
            effective_stride_s: self.effective_stride_s,
            label_sampling_probability: self.label_sampling_probability,
            candidates_in_route_last_24h: self.candidates_in_route_last_24h,
            accepts_in_route_last_24h: self.accepts_in_route_last_24h,
            ci_method: intern_static_label(self.ci_method),
        }
    }
}

fn intern_static_label(value: String) -> &'static str {
    match value.as_str() {
        "accept" => "accept",
        "low_volume" => "low_volume",
        "insufficient_history" => "insufficient_history",
        "below_tail" => "below_tail",
        "allowlist" => "allowlist",
        "priority" => "priority",
        "decimated_uniform" => "decimated_uniform",
        "accepted_full_capture" => "accepted_full_capture",
        "foreground_full_capture" => "foreground_full_capture",
        "trade" => "trade",
        "abstain" => "abstain",
        "baseline" => "baseline",
        "model" => "model",
        "none" => "none",
        "ok" => "ok",
        "degraded" => "degraded",
        "suspended" => "suspended",
        "not_applicable" => "not_applicable",
        "NO_OPPORTUNITY" => "NO_OPPORTUNITY",
        "INSUFFICIENT_DATA" => "INSUFFICIENT_DATA",
        "LOW_CONFIDENCE" => "LOW_CONFIDENCE",
        "LONG_TAIL" => "LONG_TAIL",
        "COOLDOWN" => "COOLDOWN",
        "wilson_marginal" => "wilson_marginal",
        "conformal_split" => "conformal_split",
        other => Box::leak(other.to_owned().into_boxed_str()),
    }
}

/// Config do resolvedor.
#[derive(Debug, Clone)]
pub struct ResolverConfig {
    pub horizons_s: Vec<u32>,
    pub close_slack_ns: u64,
    pub route_vanish_idle_ns: u64,
    /// threshold acima do qual `RouteDormant` vira `RouteDelisted`.
    pub route_delisted_idle_ns: u64,
    pub max_pending_per_route: usize,
    pub sweeper_interval: Duration,
}

impl Default for ResolverConfig {
    fn default() -> Self {
        Self {
            horizons_s: DEFAULT_HORIZONS_S.to_vec(),
            close_slack_ns: DEFAULT_CLOSE_SLACK_NS,
            route_vanish_idle_ns: ROUTE_VANISH_IDLE_NS,
            route_delisted_idle_ns: ROUTE_DELISTED_IDLE_NS,
            max_pending_per_route: MAX_PENDING_PER_ROUTE,
            sweeper_interval: Duration::from_secs(10),
        }
    }
}

const META_SPOOL_MAGIC: &[u8; 8] = b"LRMETA01";
#[cfg(not(test))]
const META_SPOOL_SEGMENT_MAX_BYTES: u64 = 64 * 1024 * 1024;
#[cfg(test)]
const META_SPOOL_SEGMENT_MAX_BYTES: u64 = 1024;

struct PendingMetaStore {
    backend: PendingMetaBackend,
    metrics: Arc<ResolverMetrics>,
}

enum PendingMetaBackend {
    Memory(Mutex<Vec<PendingLabelMeta>>),
    Disk(Mutex<PendingMetaSpool>),
}

struct PendingMetaSpool {
    dir: PathBuf,
    prefix: String,
    current_segment_id: u64,
    write_file: File,
    segments: AHashMap<u64, PendingMetaSegment>,
    scratch: Vec<u8>,
}

struct PendingMetaSegment {
    path: PathBuf,
    read_file: File,
    bytes: u64,
    live_records: u64,
    sealed: bool,
}

impl PendingMetaStore {
    fn new(spool_dir: Option<PathBuf>, metrics: Arc<ResolverMetrics>) -> Self {
        let backend = match spool_dir {
            Some(dir) => match PendingMetaSpool::open(dir) {
                Ok(spool) => {
                    let path = spool.current_path_display();
                    tracing::info!(
                        path = %path,
                        "label_resolver pending metadata spool enabled"
                    );
                    PendingMetaBackend::Disk(Mutex::new(spool))
                }
                Err(e) => {
                    metrics
                        .meta_spool_errors_total
                        .fetch_add(1, Ordering::Relaxed);
                    panic!("label_resolver pending metadata spool unavailable: {e}");
                }
            },
            None => PendingMetaBackend::Memory(Mutex::new(Vec::new())),
        };
        Self { backend, metrics }
    }

    fn insert(&self, meta: PendingLabelMeta) -> anyhow::Result<PendingMetaRef> {
        match &self.backend {
            PendingMetaBackend::Memory(items) => {
                let mut items = items.lock();
                let idx = items.len();
                items.push(meta);
                self.metrics
                    .meta_spool_records_total
                    .fetch_add(1, Ordering::Relaxed);
                Ok(PendingMetaRef::Memory(idx))
            }
            PendingMetaBackend::Disk(spool) => {
                let start = SystemTime::now();
                let mut spool = spool.lock();
                let meta_ref = spool.append_meta(&meta)?;
                self.metrics
                    .meta_spool_records_total
                    .fetch_add(1, Ordering::Relaxed);
                self.metrics
                    .meta_spool_bytes_current
                    .store(spool.total_bytes(), Ordering::Relaxed);
                self.metrics
                    .meta_spool_write_ops_total
                    .fetch_add(1, Ordering::Relaxed);
                self.metrics
                    .meta_spool_write_ns_total
                    .fetch_add(elapsed_ns_since(start), Ordering::Relaxed);
                Ok(meta_ref)
            }
        }
    }

    fn load(&self, meta_ref: &PendingMetaRef) -> anyhow::Result<PendingLabelMeta> {
        match (meta_ref, &self.backend) {
            (PendingMetaRef::Memory(idx), PendingMetaBackend::Memory(items)) => items
                .lock()
                .get(*idx)
                .cloned()
                .ok_or_else(|| anyhow::anyhow!("pending meta memory ref {idx} missing")),
            (
                PendingMetaRef::Disk {
                    segment_id,
                    offset,
                    len,
                },
                PendingMetaBackend::Disk(spool),
            ) => {
                let start = SystemTime::now();
                let mut spool = spool.lock();
                let bytes = spool.read_at(*segment_id, *offset, *len)?;
                self.metrics
                    .meta_spool_read_ops_total
                    .fetch_add(1, Ordering::Relaxed);
                self.metrics
                    .meta_spool_read_ns_total
                    .fetch_add(elapsed_ns_since(start), Ordering::Relaxed);
                let dto: PendingLabelMetaDto = serde_json::from_slice(&bytes)?;
                dto.into_meta()
            }
            _ => Err(anyhow::anyhow!("pending meta backend/ref mismatch")),
        }
    }

    fn release(&self, meta_ref: &PendingMetaRef) {
        if let (PendingMetaRef::Disk { segment_id, .. }, PendingMetaBackend::Disk(spool)) =
            (meta_ref, &self.backend)
        {
            let mut spool = spool.lock();
            if let Err(e) = spool.release(*segment_id) {
                self.metrics
                    .meta_spool_errors_total
                    .fetch_add(1, Ordering::Relaxed);
                tracing::warn!(error = %e, segment_id, "failed to release pending meta segment ref");
            }
            self.metrics
                .meta_spool_bytes_current
                .store(spool.total_bytes(), Ordering::Relaxed);
        }
    }

    fn cleanup_all(&self) {
        if let PendingMetaBackend::Disk(spool) = &self.backend {
            let mut spool = spool.lock();
            if let Err(e) = spool.cleanup_all() {
                self.metrics
                    .meta_spool_errors_total
                    .fetch_add(1, Ordering::Relaxed);
                tracing::warn!(error = %e, "failed to cleanup pending meta spool");
            }
            self.metrics
                .meta_spool_bytes_current
                .store(0, Ordering::Relaxed);
        }
    }
}

impl PendingMetaSpool {
    fn open(dir: PathBuf) -> anyhow::Result<Self> {
        fs::create_dir_all(&dir)?;
        let started_ns = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let prefix = format!("label-pending-{}-{}", std::process::id(), started_ns);
        let path = segment_path(&dir, &prefix, 0);
        let mut write_file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)?;
        write_file.write_all(META_SPOOL_MAGIC)?;
        let read_file = OpenOptions::new().read(true).open(&path)?;
        let mut segments = AHashMap::with_capacity(8);
        segments.insert(
            0,
            PendingMetaSegment {
                path,
                read_file,
                bytes: META_SPOOL_MAGIC.len() as u64,
                live_records: 0,
                sealed: false,
            },
        );
        Ok(Self {
            dir,
            prefix,
            current_segment_id: 0,
            write_file,
            segments,
            scratch: Vec::with_capacity(4096),
        })
    }

    fn append_meta(&mut self, meta: &PendingLabelMeta) -> anyhow::Result<PendingMetaRef> {
        self.scratch.clear();
        let dto = PendingLabelMetaDto::from(meta);
        serde_json::to_writer(&mut self.scratch, &dto)?;
        if self.scratch.len() > u32::MAX as usize {
            anyhow::bail!(
                "pending meta payload too large: {} bytes",
                self.scratch.len()
            );
        }
        let len = self.scratch.len() as u32;
        let record_bytes = 4u64.saturating_add(len as u64);
        let current_bytes = self
            .segments
            .get(&self.current_segment_id)
            .map(|s| s.bytes)
            .unwrap_or(META_SPOOL_MAGIC.len() as u64);
        if current_bytes > META_SPOOL_MAGIC.len() as u64
            && current_bytes.saturating_add(record_bytes) > META_SPOOL_SEGMENT_MAX_BYTES
        {
            self.rotate_segment()?;
        }
        let segment_id = self.current_segment_id;
        let segment = self
            .segments
            .get_mut(&segment_id)
            .ok_or_else(|| anyhow::anyhow!("current segment {segment_id} missing"))?;
        let offset = segment.bytes;
        self.write_file.write_all(&len.to_le_bytes())?;
        self.write_file.write_all(&self.scratch)?;
        segment.bytes = segment.bytes.saturating_add(record_bytes);
        segment.live_records = segment.live_records.saturating_add(1);
        Ok(PendingMetaRef::Disk {
            segment_id,
            offset,
            len,
        })
    }

    fn read_at(&mut self, segment_id: u64, offset: u64, len: u32) -> anyhow::Result<Vec<u8>> {
        let segment = self
            .segments
            .get_mut(&segment_id)
            .ok_or_else(|| anyhow::anyhow!("pending meta segment {segment_id} missing"))?;
        segment.read_file.seek(SeekFrom::Start(offset))?;
        let mut len_buf = [0u8; 4];
        segment.read_file.read_exact(&mut len_buf)?;
        let actual_len = u32::from_le_bytes(len_buf);
        if actual_len != len {
            anyhow::bail!("pending meta len mismatch: ref={len}, file={actual_len}");
        }
        let mut bytes = vec![0u8; len as usize];
        segment.read_file.read_exact(&mut bytes)?;
        Ok(bytes)
    }

    fn release(&mut self, segment_id: u64) -> anyhow::Result<()> {
        let Some(segment) = self.segments.get_mut(&segment_id) else {
            return Ok(());
        };
        segment.live_records = segment.live_records.saturating_sub(1);
        self.cleanup_released_segments()
    }

    fn total_bytes(&self) -> u64 {
        self.segments
            .values()
            .fold(0u64, |acc, segment| acc.saturating_add(segment.bytes))
    }

    fn current_path_display(&self) -> String {
        self.segments
            .get(&self.current_segment_id)
            .map(|s| s.path.display().to_string())
            .unwrap_or_else(|| self.dir.display().to_string())
    }

    fn rotate_segment(&mut self) -> anyhow::Result<()> {
        self.write_file.flush()?;
        if let Some(segment) = self.segments.get_mut(&self.current_segment_id) {
            segment.sealed = true;
        }
        self.cleanup_released_segments()?;
        let next_id = self.current_segment_id.saturating_add(1);
        let path = segment_path(&self.dir, &self.prefix, next_id);
        let mut write_file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)?;
        write_file.write_all(META_SPOOL_MAGIC)?;
        let read_file = OpenOptions::new().read(true).open(&path)?;
        self.segments.insert(
            next_id,
            PendingMetaSegment {
                path,
                read_file,
                bytes: META_SPOOL_MAGIC.len() as u64,
                live_records: 0,
                sealed: false,
            },
        );
        self.current_segment_id = next_id;
        self.write_file = write_file;
        Ok(())
    }

    fn cleanup_released_segments(&mut self) -> anyhow::Result<()> {
        let current = self.current_segment_id;
        let removable: Vec<u64> = self
            .segments
            .iter()
            .filter_map(|(segment_id, segment)| {
                if *segment_id != current && segment.sealed && segment.live_records == 0 {
                    Some(*segment_id)
                } else {
                    None
                }
            })
            .collect();
        for segment_id in removable {
            if let Some(segment) = self.segments.remove(&segment_id) {
                drop(segment.read_file);
                fs::remove_file(&segment.path)?;
            }
        }
        Ok(())
    }

    fn cleanup_all(&mut self) -> anyhow::Result<()> {
        self.write_file.flush()?;
        let cleanup_sink = self.dir.join(format!("{}-cleanup-sink.tmp", self.prefix));
        let replacement = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&cleanup_sink)?;
        let old_write = std::mem::replace(&mut self.write_file, replacement);
        drop(old_write);
        let segments = std::mem::take(&mut self.segments);
        for (_segment_id, segment) in segments {
            drop(segment.read_file);
            match fs::remove_file(&segment.path) {
                Ok(()) => {}
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
                Err(e) => return Err(e.into()),
            }
        }
        let _ = fs::remove_file(cleanup_sink);
        Ok(())
    }
}

fn segment_path(dir: &std::path::Path, prefix: &str, segment_id: u64) -> PathBuf {
    dir.join(format!("{prefix}-seg-{segment_id:06}.spool"))
}

fn elapsed_ns_since(start: SystemTime) -> u64 {
    start
        .elapsed()
        .map(|d| d.as_nanos().min(u64::MAX as u128) as u64)
        .unwrap_or(0)
}

fn elapsed_instant_ns(start: Instant) -> u64 {
    start.elapsed().as_nanos().min(u64::MAX as u128) as u64
}

struct ResolverOpTiming<'a> {
    ns_total: &'a AtomicU64,
    ops_total: &'a AtomicU64,
    started: Instant,
}

impl<'a> ResolverOpTiming<'a> {
    fn new(ns_total: &'a AtomicU64, ops_total: &'a AtomicU64) -> Self {
        Self {
            ns_total,
            ops_total,
            started: Instant::now(),
        }
    }
}

impl Drop for ResolverOpTiming<'_> {
    fn drop(&mut self) {
        self.ops_total.fetch_add(1, Ordering::Relaxed);
        self.ns_total
            .fetch_add(elapsed_instant_ns(self.started), Ordering::Relaxed);
    }
}

/// Stride efetivo por horizonte.
///
/// Fórmula: `stride = max(base, horizon_s / n_events_target)`. Para h=28800
/// (8h) com N=10: stride=2880s, muito acima dos 60s globais. Isso reduz o
/// overlap massivo entre labels de longo horizonte que inflavam calibração
/// de `P@8h` em ordens de magnitude.
#[inline]
pub fn effective_stride_for_horizon(base_s: u32, horizon_s: u32, n_events_target: u32) -> u32 {
    if n_events_target == 0 {
        return base_s;
    }
    let proposed = horizon_s / n_events_target;
    base_s.max(proposed)
}

/// Métricas agregadas (sem cardinalidade por rota — correção P6).
#[derive(Debug, Default)]
pub struct ResolverMetrics {
    /// Labels enfileirados (um por candidate limpo com ao menos um horizonte
    /// elegível após stride).
    pub pending_created_total: AtomicU64,
    /// Skips por stride — nenhum horizonte elegível no candidate.
    pub stride_skipped_total: AtomicU64,
    /// Records escritos (1 por horizonte fechado).
    pub labels_written_total: AtomicU64,
    pub labels_written_realized_total: AtomicU64,
    pub labels_written_miss_total: AtomicU64,
    pub labels_written_censored_total: AtomicU64,
    pub labels_dropped_channel_full_total: AtomicU64,
    pub labels_dropped_channel_closed_total: AtomicU64,
    /// Descartes por backpressure interno (cap por rota).
    pub labels_dropped_capacity_overflow_total: AtomicU64,
    /// Shutdown — labels forçados como `censored{shutdown}`.
    pub shutdown_lost_pending_total: AtomicU64,
    /// Pendings vivos no resolver, após stride e antes de todos horizontes fecharem.
    pub pending_candidates_current: AtomicU64,
    /// Rotas com pelo menos um pending label vivo.
    pub pending_routes_current: AtomicU64,
    /// Horizontes ainda abertos entre todos os pendings vivos.
    pub pending_horizons_current: AtomicU64,
    /// Bytes escritos no spool temporário de metadados imutáveis.
    pub meta_spool_bytes_current: AtomicU64,
    /// Records de metadata persistidos no spool/memory-store.
    pub meta_spool_records_total: AtomicU64,
    /// Latência agregada de escrita de metadata em ns.
    pub meta_spool_write_ns_total: AtomicU64,
    pub meta_spool_write_ops_total: AtomicU64,
    /// Latência agregada de leitura de metadata em ns.
    pub meta_spool_read_ns_total: AtomicU64,
    pub meta_spool_read_ops_total: AtomicU64,
    pub meta_spool_errors_total: AtomicU64,
    pub on_candidate_ns_total: AtomicU64,
    pub on_candidate_ops_total: AtomicU64,
    pub on_observation_ns_total: AtomicU64,
    pub on_observation_ops_total: AtomicU64,
    pub sweep_ns_total: AtomicU64,
    pub sweep_ops_total: AtomicU64,
    /// Entradas vivas no índice de stride `(rota, horizonte)`.
    pub stride_index_entries_current: AtomicU64,
    /// Entradas de stride removidas por já terem expirado.
    pub stride_index_pruned_total: AtomicU64,
    pub shutdown_flush_ns_total: AtomicU64,
    pub shutdown_flush_ops_total: AtomicU64,
    pub async_queue_depth_current: AtomicU64,
    pub async_queue_full_total: AtomicU64,
    pub async_queue_closed_total: AtomicU64,
    pub async_observation_enqueued_total: AtomicU64,
    pub async_observation_processed_total: AtomicU64,
    pub async_sweep_enqueued_total: AtomicU64,
    pub async_sweep_processed_total: AtomicU64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LabelResolverAsyncError {
    QueueFull,
    QueueClosed,
}

#[derive(Debug)]
enum LabelResolverAsyncCommand {
    CleanObservation {
        route_id: RouteId,
        now_ns: u64,
        entry_spread: f32,
        exit_spread: f32,
    },
    Candidate(LabelCandidateCommand),
    Sweep {
        now_ns: u64,
        reply: oneshot::Sender<u64>,
    },
    Flush {
        reply: oneshot::Sender<()>,
    },
}

/// Candidate de label congelado em t0 para envio ordenado ao worker assíncrono.
///
/// Carrega os mesmos campos de `on_candidate`; a diferença é operacional:
/// serialização/spool e inserção no índice de pending saem do loop quente do
/// scanner, sem reduzir linhas nem mudar a semântica PIT.
#[derive(Debug)]
pub struct LabelCandidateCommand {
    pub sample_id: String,
    pub sample_decision: &'static str,
    pub ts_emit_ns: u64,
    pub cycle_seq: u32,
    pub route_id: RouteId,
    pub symbol_name: String,
    pub entry_locked_pct: f32,
    pub exit_start_pct: f32,
    pub features_t0: FeaturesT0,
    pub label_floor_pct: f32,
    pub label_floors_pct: Vec<f32>,
    pub policy_metadata: PolicyMetadata,
    pub sampling_tier: &'static str,
    pub sampling_probability: f32,
    pub label_stride_s: u32,
    pub cluster_id: String,
    pub cluster_size: u32,
    pub cluster_rank: u32,
    pub runtime_config_hash: String,
    pub priority_set_generation_id: u32,
    pub priority_set_updated_at_ns: u64,
}

#[derive(Clone)]
pub struct LabelResolverAsyncHandle {
    tx: mpsc::Sender<LabelResolverAsyncCommand>,
    metrics: Arc<ResolverMetrics>,
}

impl LabelResolverAsyncHandle {
    pub fn spawn(resolver: Arc<LabelResolver>, capacity: usize) -> Self {
        let (tx, mut rx) = mpsc::channel(capacity.max(1));
        let metrics = resolver.metrics();
        let worker_metrics = Arc::clone(&metrics);
        tokio::spawn(async move {
            while let Some(cmd) = rx.recv().await {
                worker_metrics
                    .async_queue_depth_current
                    .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                        Some(v.saturating_sub(1))
                    })
                    .ok();
                match cmd {
                    LabelResolverAsyncCommand::CleanObservation {
                        route_id,
                        now_ns,
                        entry_spread,
                        exit_spread,
                    } => {
                        resolver.on_clean_observation(route_id, now_ns, entry_spread, exit_spread);
                        worker_metrics
                            .async_observation_processed_total
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    LabelResolverAsyncCommand::Candidate(candidate) => {
                        let LabelCandidateCommand {
                            sample_id,
                            sample_decision,
                            ts_emit_ns,
                            cycle_seq,
                            route_id,
                            symbol_name,
                            entry_locked_pct,
                            exit_start_pct,
                            features_t0,
                            label_floor_pct,
                            label_floors_pct,
                            policy_metadata,
                            sampling_tier,
                            sampling_probability,
                            label_stride_s,
                            cluster_id,
                            cluster_size,
                            cluster_rank,
                            runtime_config_hash,
                            priority_set_generation_id,
                            priority_set_updated_at_ns,
                        } = candidate;
                        resolver.on_candidate(
                            sample_id,
                            sample_decision,
                            ts_emit_ns,
                            cycle_seq,
                            route_id,
                            symbol_name,
                            entry_locked_pct,
                            exit_start_pct,
                            features_t0,
                            label_floor_pct,
                            label_floors_pct,
                            policy_metadata,
                            sampling_tier,
                            sampling_probability,
                            label_stride_s,
                            cluster_id,
                            cluster_size,
                            cluster_rank,
                            runtime_config_hash,
                            priority_set_generation_id,
                            priority_set_updated_at_ns,
                        );
                    }
                    LabelResolverAsyncCommand::Sweep { now_ns, reply } => {
                        let n = resolver.sweep(now_ns);
                        worker_metrics
                            .async_sweep_processed_total
                            .fetch_add(1, Ordering::Relaxed);
                        let _ = reply.send(n);
                    }
                    LabelResolverAsyncCommand::Flush { reply } => {
                        let _ = reply.send(());
                    }
                }
            }
        });
        Self { tx, metrics }
    }

    pub fn try_enqueue_candidate(
        &self,
        candidate: LabelCandidateCommand,
    ) -> Result<(), LabelResolverAsyncError> {
        self.metrics
            .async_queue_depth_current
            .fetch_add(1, Ordering::Relaxed);
        match self
            .tx
            .try_send(LabelResolverAsyncCommand::Candidate(candidate))
        {
            Ok(()) => Ok(()),
            Err(mpsc::error::TrySendError::Full(_)) => {
                self.metrics
                    .async_queue_depth_current
                    .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                        Some(v.saturating_sub(1))
                    })
                    .ok();
                self.metrics
                    .async_queue_full_total
                    .fetch_add(1, Ordering::Relaxed);
                Err(LabelResolverAsyncError::QueueFull)
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                self.metrics
                    .async_queue_depth_current
                    .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                        Some(v.saturating_sub(1))
                    })
                    .ok();
                self.metrics
                    .async_queue_closed_total
                    .fetch_add(1, Ordering::Relaxed);
                Err(LabelResolverAsyncError::QueueClosed)
            }
        }
    }

    pub fn try_observe_clean(
        &self,
        route_id: RouteId,
        now_ns: u64,
        entry_spread: f32,
        exit_spread: f32,
    ) -> Result<(), LabelResolverAsyncError> {
        let cmd = LabelResolverAsyncCommand::CleanObservation {
            route_id,
            now_ns,
            entry_spread,
            exit_spread,
        };
        self.metrics
            .async_queue_depth_current
            .fetch_add(1, Ordering::Relaxed);
        match self.tx.try_send(cmd) {
            Ok(()) => {
                self.metrics
                    .async_observation_enqueued_total
                    .fetch_add(1, Ordering::Relaxed);
                Ok(())
            }
            Err(mpsc::error::TrySendError::Full(_)) => {
                self.metrics
                    .async_queue_depth_current
                    .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                        Some(v.saturating_sub(1))
                    })
                    .ok();
                self.metrics
                    .async_queue_full_total
                    .fetch_add(1, Ordering::Relaxed);
                Err(LabelResolverAsyncError::QueueFull)
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                self.metrics
                    .async_queue_depth_current
                    .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                        Some(v.saturating_sub(1))
                    })
                    .ok();
                self.metrics
                    .async_queue_closed_total
                    .fetch_add(1, Ordering::Relaxed);
                Err(LabelResolverAsyncError::QueueClosed)
            }
        }
    }

    pub async fn sweep(&self, now_ns: u64) -> Result<u64, LabelResolverAsyncError> {
        let (reply, rx) = oneshot::channel();
        self.metrics
            .async_queue_depth_current
            .fetch_add(1, Ordering::Relaxed);
        self.tx
            .send(LabelResolverAsyncCommand::Sweep { now_ns, reply })
            .await
            .map_err(|_| {
                self.metrics
                    .async_queue_depth_current
                    .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                        Some(v.saturating_sub(1))
                    })
                    .ok();
                self.metrics
                    .async_queue_closed_total
                    .fetch_add(1, Ordering::Relaxed);
                LabelResolverAsyncError::QueueClosed
            })?;
        self.metrics
            .async_sweep_enqueued_total
            .fetch_add(1, Ordering::Relaxed);
        rx.await.map_err(|_| {
            self.metrics
                .async_queue_closed_total
                .fetch_add(1, Ordering::Relaxed);
            LabelResolverAsyncError::QueueClosed
        })
    }

    pub async fn flush(&self) -> Result<(), LabelResolverAsyncError> {
        let (reply, rx) = oneshot::channel();
        self.metrics
            .async_queue_depth_current
            .fetch_add(1, Ordering::Relaxed);
        self.tx
            .send(LabelResolverAsyncCommand::Flush { reply })
            .await
            .map_err(|_| {
                self.metrics
                    .async_queue_depth_current
                    .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                        Some(v.saturating_sub(1))
                    })
                    .ok();
                self.metrics
                    .async_queue_closed_total
                    .fetch_add(1, Ordering::Relaxed);
                LabelResolverAsyncError::QueueClosed
            })?;
        rx.await.map_err(|_| {
            self.metrics
                .async_queue_closed_total
                .fetch_add(1, Ordering::Relaxed);
            LabelResolverAsyncError::QueueClosed
        })
    }
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct ShutdownFlushStats {
    pub closed_total: u64,
    pub sent_total: u64,
    pub censored_total: u64,
    pub dropped_channel_closed_total: u64,
}

/// Resolver compartilhado. Thread-safe via interior mutability.
pub struct LabelResolver {
    cfg: ResolverConfig,
    inner: Mutex<ResolverInner>,
    metrics: Arc<ResolverMetrics>,
    meta_store: PendingMetaStore,
    writer: LabeledWriterHandle,
}

struct ResolverInner {
    /// Pending labels por rota.
    ///
    /// Em strict-lossless, overflow de pending é falha operacional: depois que
    /// um candidato entrou na população supervisionada, descartá-lo enviesaria
    /// treino/auditoria. O cap existe como tripwire, não como política de
    /// sampling.
    pending_by_route: AHashMap<RouteId, VecDeque<PendingLabelState>>,
    /// Último `ts_ns` em que um label foi criado por `(rota, horizonte)`.
    /// Stride por horizonte evita sobreposição extrema em horizontes longos.
    last_label_ts_by_horizon: AHashMap<(RouteId, u32), LastLabelStride>,
}

#[derive(Debug, Clone, Copy)]
struct LastLabelStride {
    ts_emit_ns: u64,
    effective_stride_s: u32,
}

impl LastLabelStride {
    fn new(ts_emit_ns: u64, effective_stride_s: u32) -> Self {
        Self {
            ts_emit_ns,
            effective_stride_s,
        }
    }

    fn is_blocking_with(&self, ts_emit_ns: u64, current_effective_stride_s: u32) -> bool {
        let effective_stride_s = self.effective_stride_s.max(current_effective_stride_s);
        let stride_ns = (effective_stride_s as u64).saturating_mul(1_000_000_000);
        ts_emit_ns < self.ts_emit_ns.saturating_add(stride_ns)
    }

    fn expired_at(&self, now_ns: u64) -> bool {
        let stride_ns = (self.effective_stride_s as u64).saturating_mul(1_000_000_000);
        now_ns >= self.ts_emit_ns.saturating_add(stride_ns)
    }
}

#[inline]
fn record_future_sample(
    slot: &mut PendingHorizon,
    now_ns: u64,
    exit_spread: f32,
    entry_locked: f32,
    label_floor: f32,
    label_floors: &[f32],
) {
    slot.observed_until_ns = now_ns;
    slot.n_clean_future_samples = slot.n_clean_future_samples.saturating_add(1);
    let is_better = slot
        .best_exit_pct_so_far
        .map(|b| exit_spread > b)
        .unwrap_or(true);
    if is_better {
        slot.best_exit_pct_so_far = Some(exit_spread);
        slot.best_exit_ts_ns_so_far = Some(now_ns);
    }
    let gross = entry_locked + exit_spread;
    if gross >= label_floor && slot.first_exit_ge_floor_ts_ns.is_none() {
        slot.first_exit_ge_floor_ts_ns = Some(now_ns);
        slot.first_exit_ge_floor_pct = Some(exit_spread);
    }
    for (hit, &floor_pct) in slot.floor_hits.iter_mut().zip(label_floors.iter()) {
        if gross >= floor_pct && hit.first_exit_ge_floor_ts_ns.is_none() {
            hit.first_exit_ge_floor_ts_ns = Some(now_ns);
            hit.first_exit_ge_floor_pct = Some(exit_spread);
        }
    }
}

impl LabelResolver {
    pub fn new(cfg: ResolverConfig, writer: LabeledWriterHandle) -> Self {
        Self::new_with_spool_dir(cfg, writer, None)
    }

    pub fn new_with_spool_dir(
        cfg: ResolverConfig,
        writer: LabeledWriterHandle,
        spool_dir: Option<PathBuf>,
    ) -> Self {
        let metrics = Arc::new(ResolverMetrics::default());
        let meta_store = PendingMetaStore::new(spool_dir, Arc::clone(&metrics));
        Self {
            cfg,
            inner: Mutex::new(ResolverInner {
                pending_by_route: AHashMap::with_capacity(4096),
                last_label_ts_by_horizon: AHashMap::with_capacity(4096),
            }),
            metrics,
            meta_store,
            writer,
        }
    }

    pub fn metrics(&self) -> Arc<ResolverMetrics> {
        Arc::clone(&self.metrics)
    }

    /// Checagem barata para evitar materializar `FeaturesT0`/metadata quando
    /// nenhum horizonte passaria pelo stride determinístico.
    ///
    /// Não altera estado. `on_candidate()` continua sendo a fonte canônica que
    /// grava `last_label_ts_by_horizon` quando o candidato é efetivamente
    /// criado.
    pub fn candidate_stride_eligible(
        &self,
        route_id: RouteId,
        ts_emit_ns: u64,
        label_stride_s: u32,
    ) -> bool {
        if label_stride_s == 0 {
            return !self.cfg.horizons_s.is_empty();
        }
        let inner = self.inner.lock();
        self.cfg.horizons_s.iter().any(|&horizon_s| {
            let effective_stride_s = effective_stride_for_horizon(
                label_stride_s,
                horizon_s,
                N_EVENTS_TARGET_PER_HORIZON,
            );
            let key = (route_id, horizon_s);
            inner
                .last_label_ts_by_horizon
                .get(&key)
                .map(|prev| !prev.is_blocking_with(ts_emit_ns, effective_stride_s))
                .unwrap_or(true)
        })
    }

    pub fn record_stride_skipped(&self) {
        self.metrics
            .stride_skipped_total
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn horizons(&self) -> &[u32] {
        &self.cfg.horizons_s
    }

    /// Helper de teste: atalho para `on_candidate` com defaults Accept.
    /// Não exposto em produção — callers reais usam `on_candidate` direto.
    #[cfg(test)]
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn on_accepted(
        &self,
        sample_id: String,
        ts_emit_ns: u64,
        cycle_seq: u32,
        route_id: RouteId,
        symbol_name: String,
        entry_locked_pct: f32,
        exit_start_pct: f32,
        features_t0: FeaturesT0,
        label_floor_pct: f32,
        policy_metadata: PolicyMetadata,
        sampling_tier: &'static str,
        sampling_probability: f32,
        label_stride_s: u32,
    ) -> bool {
        self.on_candidate(
            sample_id,
            "accept",
            ts_emit_ns,
            cycle_seq,
            route_id,
            symbol_name,
            entry_locked_pct,
            exit_start_pct,
            features_t0,
            label_floor_pct,
            vec![label_floor_pct],
            policy_metadata,
            sampling_tier,
            sampling_probability,
            label_stride_s,
            derive_cluster_id(route_id, ts_emit_ns),
            1,
            1,
            "0000000000000000".to_string(),
            0,
            0,
        )
    }

    /// Cria `PendingLabel` para um candidate limpo em t0, respeitando stride.
    /// Retorna `true` se criou, `false` se pulou por stride.
    #[allow(clippy::too_many_arguments)]
    pub fn on_candidate(
        &self,
        sample_id: String,
        sample_decision: &'static str,
        ts_emit_ns: u64,
        cycle_seq: u32,
        route_id: RouteId,
        symbol_name: String,
        entry_locked_pct: f32,
        exit_start_pct: f32,
        features_t0: FeaturesT0,
        label_floor_pct: f32,
        label_floors_pct: Vec<f32>,
        policy_metadata: PolicyMetadata,
        sampling_tier: &'static str,
        sampling_probability: f32,
        label_stride_s: u32,
        cluster_id: String,
        cluster_size: u32,
        cluster_rank: u32,
        runtime_config_hash: String,
        priority_set_generation_id: u32,
        priority_set_updated_at_ns: u64,
    ) -> bool {
        let _timing = ResolverOpTiming::new(
            &self.metrics.on_candidate_ns_total,
            &self.metrics.on_candidate_ops_total,
        );
        let floors = normalized_floors(label_floor_pct, label_floors_pct);

        let (horizons, stride_keys) = {
            let mut inner = self.inner.lock();
            let mut horizons: Vec<PendingHorizon> = Vec::with_capacity(self.cfg.horizons_s.len());
            let mut stride_keys = Vec::with_capacity(self.cfg.horizons_s.len());
            for &horizon_s in &self.cfg.horizons_s {
                if label_stride_s > 0 {
                    let effective_stride_s = effective_stride_for_horizon(
                        label_stride_s,
                        horizon_s,
                        N_EVENTS_TARGET_PER_HORIZON,
                    );
                    let key = (route_id, horizon_s);
                    if let Some(prev) = inner.last_label_ts_by_horizon.get(&key) {
                        if prev.is_blocking_with(ts_emit_ns, effective_stride_s) {
                            continue;
                        }
                    }
                    inner
                        .last_label_ts_by_horizon
                        .insert(key, LastLabelStride::new(ts_emit_ns, effective_stride_s));
                    stride_keys.push(key);
                }
                horizons.push(PendingHorizon::new(horizon_s, ts_emit_ns, floors.len()));
            }
            if inner
                .pending_by_route
                .get(&route_id)
                .map(|queue| queue.len() >= self.cfg.max_pending_per_route)
                .unwrap_or(false)
            {
                for key in &stride_keys {
                    if inner
                        .last_label_ts_by_horizon
                        .get(key)
                        .map(|prev| prev.ts_emit_ns == ts_emit_ns)
                        .unwrap_or(false)
                    {
                        inner.last_label_ts_by_horizon.remove(key);
                    }
                }
                self.metrics
                    .labels_dropped_capacity_overflow_total
                    .fetch_add(1, Ordering::Relaxed);
                self.metrics.stride_index_entries_current.store(
                    inner.last_label_ts_by_horizon.len() as u64,
                    Ordering::Relaxed,
                );
                tracing::error!(
                    route = ?route_id,
                    max_pending_per_route = self.cfg.max_pending_per_route,
                    "pending_labels overflow: strict-lossless abort before spooling metadata"
                );
                panic!(
                    "label_resolver strict-lossless violation: max_pending_per_route={} exceeded for route {:?}",
                    self.cfg.max_pending_per_route,
                    route_id
                );
            }
            (horizons, stride_keys)
        };

        if horizons.is_empty() {
            self.metrics
                .stride_skipped_total
                .fetch_add(1, Ordering::Relaxed);
            return false;
        }

        let horizon_count = horizons.len() as u64;
        let pending_label_floors_pct: SmallVec<[f32; 8]> = floors.iter().copied().collect();
        let meta = PendingLabelMeta {
            sample_id,
            sample_decision,
            ts_emit_ns,
            cycle_seq,
            route_id,
            symbol_name,
            entry_locked_pct,
            exit_start_pct,
            features_t0,
            label_floor_pct,
            label_floors_pct: floors,
            policy_metadata,
            sampling_tier,
            sampling_probability,
            cluster_id,
            cluster_size,
            cluster_rank,
            runtime_config_hash,
            priority_set_generation_id,
            priority_set_updated_at_ns,
        };
        let meta_ref = match self.meta_store.insert(meta) {
            Ok(meta_ref) => meta_ref,
            Err(e) => {
                self.metrics
                    .meta_spool_errors_total
                    .fetch_add(1, Ordering::Relaxed);
                tracing::error!(
                    error = %e,
                    route = ?route_id,
                    "label_resolver failed to persist pending metadata; candidate skipped"
                );
                let mut inner = self.inner.lock();
                for key in stride_keys {
                    if inner
                        .last_label_ts_by_horizon
                        .get(&key)
                        .map(|prev| prev.ts_emit_ns == ts_emit_ns)
                        .unwrap_or(false)
                    {
                        inner.last_label_ts_by_horizon.remove(&key);
                    }
                }
                self.metrics.stride_index_entries_current.store(
                    inner.last_label_ts_by_horizon.len() as u64,
                    Ordering::Relaxed,
                );
                return false;
            }
        };
        let pending = PendingLabelState {
            meta_ref,
            ts_emit_ns,
            route_id,
            entry_locked_pct,
            label_floor_pct,
            label_floors_pct: pending_label_floors_pct,
            horizons,
        };

        {
            let mut inner = self.inner.lock();
            let queue = inner
                .pending_by_route
                .entry(route_id)
                .or_insert_with(VecDeque::new);
            queue.push_back(pending);
        }
        self.metrics
            .pending_created_total
            .fetch_add(1, Ordering::Relaxed);
        self.metrics
            .pending_candidates_current
            .fetch_add(1, Ordering::Relaxed);
        self.metrics
            .pending_horizons_current
            .fetch_add(horizon_count, Ordering::Relaxed);
        let (pending_routes, stride_entries) = {
            let inner = self.inner.lock();
            (
                inner.pending_by_route.len() as u64,
                inner.last_label_ts_by_horizon.len() as u64,
            )
        };
        self.metrics
            .pending_routes_current
            .store(pending_routes, Ordering::Relaxed);
        self.metrics
            .stride_index_entries_current
            .store(stride_entries, Ordering::Relaxed);
        true
    }

    /// Observa uma observação limpa da rota (`is_clean_data == true`)
    /// atualizando os `PendingHorizon` em aberto. Horizontes vencidos
    /// são fechados+escritos imediatamente.
    pub fn on_clean_observation(
        &self,
        route_id: RouteId,
        now_ns: u64,
        _entry_spread: f32,
        exit_spread: f32,
    ) {
        let _timing = ResolverOpTiming::new(
            &self.metrics.on_observation_ns_total,
            &self.metrics.on_observation_ops_total,
        );
        let mut to_write: Vec<ClosedHorizonWrite> = Vec::new();
        let mut released_meta: Vec<PendingMetaRef> = Vec::new();
        {
            let mut inner = self.inner.lock();
            let Some(queue) = inner.pending_by_route.get_mut(&route_id) else {
                return;
            };
            let mut route_closed_any = false;
            for pending in queue.iter_mut() {
                // Observações podem ser entregues por worker assíncrono após
                // a criação síncrona de um candidate do mesmo ciclo. O label
                // é PIT: t0 não pode contar como futuro do próprio sample.
                if pending.ts_emit_ns >= now_ns {
                    continue;
                }
                // Snapshot dos escalares imutáveis para usar sem empréstimo
                // conflitante durante o iter_mut sobre horizons.
                let t_emit = pending.ts_emit_ns;
                let entry_locked = pending.entry_locked_pct;
                let label_floor = pending.label_floor_pct;
                let label_floors = pending.label_floors_pct.as_slice();
                let mut closed_horizons: Vec<(PendingHorizon, Option<CensorReason>)> = Vec::new();
                let mut idx = 0usize;
                while idx < pending.horizons.len() {
                    let mut close_reason: Option<Option<CensorReason>> = None;
                    {
                        let slot = &mut pending.horizons[idx];
                        let deadline = t_emit + (slot.horizon_s as u64) * 1_000_000_000;
                        if now_ns == deadline {
                            record_future_sample(
                                slot,
                                deadline,
                                exit_spread,
                                entry_locked,
                                label_floor,
                                label_floors,
                            );
                            slot.closed = true;
                            close_reason = Some(None);
                        } else if now_ns > deadline {
                            let gap_to_deadline = deadline.saturating_sub(slot.observed_until_ns);
                            let window_observed_close_enough = slot.n_clean_future_samples > 0
                                && gap_to_deadline <= self.cfg.close_slack_ns;
                            if window_observed_close_enough {
                                slot.observed_until_ns = deadline;
                                slot.closed = true;
                                close_reason = Some(None);
                            } else {
                                slot.closed = true;
                                close_reason = Some(Some(CensorReason::IncompleteWindow));
                            }
                        } else {
                            record_future_sample(
                                slot,
                                now_ns,
                                exit_spread,
                                entry_locked,
                                label_floor,
                                label_floors,
                            );
                        }
                    }
                    if let Some(reason) = close_reason {
                        let horizon = pending.horizons.remove(idx);
                        closed_horizons.push((horizon, reason));
                    } else {
                        idx += 1;
                    }
                }
                if !closed_horizons.is_empty() {
                    pending.horizons.shrink_to_fit();
                    route_closed_any = true;
                    self.metrics
                        .pending_horizons_current
                        .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                            Some(v.saturating_sub(closed_horizons.len() as u64))
                        })
                        .ok();
                    for (horizon, reason) in closed_horizons {
                        to_write.push(ClosedHorizonWrite {
                            meta_ref: pending.meta_ref.clone(),
                            route_id: pending.route_id,
                            horizon,
                            censor_reason: reason,
                        });
                    }
                }
            }
            let mut remove_route = false;
            if route_closed_any {
                let before_released = released_meta.len();
                queue.retain(|pending| {
                    if pending.all_closed() {
                        released_meta.push(pending.meta_ref.clone());
                        false
                    } else {
                        true
                    }
                });
                let removed = released_meta.len().saturating_sub(before_released) as u64;
                if removed > 0 {
                    self.metrics
                        .pending_candidates_current
                        .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                            Some(v.saturating_sub(removed))
                        })
                        .ok();
                }
                remove_route = queue.is_empty();
            }
            if remove_route {
                inner.pending_by_route.remove(&route_id);
                self.metrics
                    .pending_routes_current
                    .store(inner.pending_by_route.len() as u64, Ordering::Relaxed);
            }
        }
        for item in to_write {
            let meta = self.materialize_meta(&item.meta_ref, item.route_id);
            let outcome = LabelOutcome::from_horizon(meta.ts_emit_ns, &item.horizon);
            let reason = if matches!(outcome, LabelOutcome::Censored) {
                item.censor_reason.or(Some(CensorReason::IncompleteWindow))
            } else {
                None
            };
            self.write_closed_horizon_with_reason(&meta, &item.horizon, now_ns, outcome, reason);
        }
        for meta_ref in &released_meta {
            self.meta_store.release(meta_ref);
        }
    }

    /// Sweeper global — chamado por task tokio em interval.
    /// Fecha horizontes vencidos (mesmo sem observações) e censura rotas
    /// sumidas. Retorna número de horizontes fechados nesta passagem.
    pub fn sweep(&self, now_ns: u64) -> u64 {
        let _timing =
            ResolverOpTiming::new(&self.metrics.sweep_ns_total, &self.metrics.sweep_ops_total);
        let mut to_write: Vec<ClosedHorizonWrite> = Vec::new();
        let mut released_meta: Vec<PendingMetaRef> = Vec::new();
        {
            let mut inner = self.inner.lock();
            let mut any_queue_removed = false;
            for (_route, queue) in inner.pending_by_route.iter_mut() {
                let mut route_closed_any = false;
                for pending in queue.iter_mut() {
                    let t_emit = pending.ts_emit_ns;
                    let mut closed_horizons: Vec<(PendingHorizon, Option<CensorReason>)> =
                        Vec::new();
                    let mut idx = 0usize;
                    while idx < pending.horizons.len() {
                        let mut close_reason: Option<Option<CensorReason>> = None;
                        {
                            let slot = &mut pending.horizons[idx];
                            let deadline = t_emit + (slot.horizon_s as u64) * 1_000_000_000;
                            let idle_for = now_ns.saturating_sub(slot.observed_until_ns);
                            // Distingue Dormant (ilíquidez transitória) de
                            // Delisted (evento estrutural). Kaplan-Meier exige essa
                            // separação para preservar independência de censura.
                            let dormant = idle_for >= self.cfg.route_vanish_idle_ns;
                            let delisted = idle_for >= self.cfg.route_delisted_idle_ns;
                            let expired =
                                now_ns >= deadline.saturating_add(self.cfg.close_slack_ns);
                            if expired {
                                slot.closed = true;
                                close_reason = Some(None);
                            } else if dormant && now_ns < deadline {
                                slot.closed = true;
                                close_reason = Some(Some(if delisted {
                                    CensorReason::RouteDelisted
                                } else {
                                    CensorReason::RouteDormant
                                }));
                            }
                        }
                        if let Some(reason) = close_reason {
                            let horizon = pending.horizons.remove(idx);
                            closed_horizons.push((horizon, reason));
                        } else {
                            idx += 1;
                        }
                    }
                    if !closed_horizons.is_empty() {
                        pending.horizons.shrink_to_fit();
                        route_closed_any = true;
                        self.metrics
                            .pending_horizons_current
                            .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                                Some(v.saturating_sub(closed_horizons.len() as u64))
                            })
                            .ok();
                        for (horizon, reason) in closed_horizons {
                            to_write.push(ClosedHorizonWrite {
                                meta_ref: pending.meta_ref.clone(),
                                route_id: pending.route_id,
                                horizon,
                                censor_reason: reason,
                            });
                        }
                    }
                }
                if route_closed_any {
                    let before_released = released_meta.len();
                    queue.retain(|pending| {
                        if pending.all_closed() {
                            released_meta.push(pending.meta_ref.clone());
                            false
                        } else {
                            true
                        }
                    });
                    let removed = released_meta.len().saturating_sub(before_released) as u64;
                    if removed > 0 {
                        any_queue_removed = true;
                        self.metrics
                            .pending_candidates_current
                            .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |v| {
                                Some(v.saturating_sub(removed))
                            })
                            .ok();
                    }
                }
            }
            if any_queue_removed {
                inner.pending_by_route.retain(|_, q| !q.is_empty());
                self.metrics
                    .pending_routes_current
                    .store(inner.pending_by_route.len() as u64, Ordering::Relaxed);
            }
            let before_stride = inner.last_label_ts_by_horizon.len();
            inner
                .last_label_ts_by_horizon
                .retain(|_, last| !last.expired_at(now_ns));
            let after_stride = inner.last_label_ts_by_horizon.len();
            let pruned = before_stride.saturating_sub(after_stride) as u64;
            if pruned > 0 {
                self.metrics
                    .stride_index_pruned_total
                    .fetch_add(pruned, Ordering::Relaxed);
            }
            self.metrics
                .stride_index_entries_current
                .store(after_stride as u64, Ordering::Relaxed);
        }
        let n = to_write.len() as u64;
        for item in to_write {
            let meta = self.materialize_meta(&item.meta_ref, item.route_id);
            // Hit dentro da janela vence qualquer fechamento posterior por
            // sweep. Forcar Censored aqui sobrescrevia realizacoes ja observadas.
            let final_outcome = LabelOutcome::from_horizon(meta.ts_emit_ns, &item.horizon);
            let final_reason = if matches!(final_outcome, LabelOutcome::Censored) {
                item.censor_reason.or(Some(CensorReason::IncompleteWindow))
            } else {
                None
            };
            self.write_closed_horizon_with_reason(
                &meta,
                &item.horizon,
                now_ns,
                final_outcome,
                final_reason,
            );
        }
        for meta_ref in &released_meta {
            self.meta_store.release(meta_ref);
        }
        n
    }

    /// Em shutdown limpo, fecha pendings abertos preservando o outcome real.
    ///
    /// versão anterior forçava `Censored{Shutdown}`
    /// em todos os horizontes abertos, sobrescrevendo labels que já tinham
    /// `first_exit_ge_floor_ts_ns.is_some()` (Realized) ou que já haviam
    /// passado do deadline sem hit (Miss). Isso subestimava `P_hit` empírico
    /// no dataset supervisionado. A lógica correta é a mesma do `sweep`:
    /// derivar o outcome do horizonte fechado e só atribuir `Shutdown` quando
    /// o outcome for de fato `Censored` (incomplete window).
    pub async fn shutdown_flush(&self, now_ns: u64) -> ShutdownFlushStats {
        let _timing = ResolverOpTiming::new(
            &self.metrics.shutdown_flush_ns_total,
            &self.metrics.shutdown_flush_ops_total,
        );
        let mut to_write: Vec<ClosedHorizonWrite> = Vec::new();
        {
            let mut inner = self.inner.lock();
            for (_route, queue) in inner.pending_by_route.iter_mut() {
                for pending in queue.iter_mut() {
                    for mut horizon in pending.horizons.drain(..) {
                        horizon.closed = true;
                        to_write.push(ClosedHorizonWrite {
                            meta_ref: pending.meta_ref.clone(),
                            route_id: pending.route_id,
                            horizon,
                            censor_reason: Some(CensorReason::Shutdown),
                        });
                    }
                }
            }
            inner.pending_by_route.clear();
            inner.last_label_ts_by_horizon.clear();
            self.metrics
                .pending_candidates_current
                .store(0, Ordering::Relaxed);
            self.metrics
                .pending_routes_current
                .store(0, Ordering::Relaxed);
            self.metrics
                .pending_horizons_current
                .store(0, Ordering::Relaxed);
            self.metrics
                .stride_index_entries_current
                .store(0, Ordering::Relaxed);
        }
        let mut stats = ShutdownFlushStats {
            closed_total: to_write.len() as u64,
            ..ShutdownFlushStats::default()
        };
        for item in to_write {
            let meta = self.materialize_meta(&item.meta_ref, item.route_id);
            let outcome = LabelOutcome::from_horizon(meta.ts_emit_ns, &item.horizon);
            let reason = match outcome {
                LabelOutcome::Censored => item.censor_reason,
                _ => None,
            };
            // Métrica conta apenas labels realmente "perdidos" — Realized e
            // Miss são outcomes válidos, não perdas.
            if matches!(outcome, LabelOutcome::Censored) {
                stats.censored_total = stats.censored_total.saturating_add(1);
                self.metrics
                    .shutdown_lost_pending_total
                    .fetch_add(1, Ordering::Relaxed);
            }
            let label =
                self.build_closed_horizon_label(&meta, &item.horizon, now_ns, outcome, reason);
            match self.writer.send(label).await {
                Ok(()) => {
                    stats.sent_total = stats.sent_total.saturating_add(1);
                    self.bump_written_metrics(outcome);
                }
                Err(LabeledWriterSendError::ChannelClosed) => {
                    stats.dropped_channel_closed_total =
                        stats.dropped_channel_closed_total.saturating_add(1);
                    self.metrics
                        .labels_dropped_channel_closed_total
                        .fetch_add(1, Ordering::Relaxed);
                }
                Err(LabeledWriterSendError::ChannelFull) => {
                    // `send().await` nunca retorna Full; mantenha o braço
                    // defensivo caso o handle mude no futuro.
                    self.metrics
                        .labels_dropped_channel_full_total
                        .fetch_add(1, Ordering::Relaxed);
                }
            }
        }
        self.meta_store.cleanup_all();
        stats
    }

    fn materialize_meta(&self, meta_ref: &PendingMetaRef, route_id: RouteId) -> PendingLabelMeta {
        match self.meta_store.load(meta_ref) {
            Ok(meta) => meta,
            Err(e) => {
                self.metrics
                    .meta_spool_errors_total
                    .fetch_add(1, Ordering::Relaxed);
                tracing::error!(
                    error = %e,
                    route = ?route_id,
                    "label_resolver failed to load pending metadata; aborting strict-lossless label path"
                );
                panic!(
                    "label_resolver strict-lossless violation: failed to load pending metadata for route {:?}: {e}",
                    route_id
                );
            }
        }
    }

    fn write_closed_horizon_with_reason(
        &self,
        meta: &PendingLabelMeta,
        horizon: &PendingHorizon,
        now_ns: u64,
        outcome: LabelOutcome,
        censor_reason: Option<CensorReason>,
    ) {
        let label = self.build_closed_horizon_label(meta, horizon, now_ns, outcome, censor_reason);
        match self.writer.try_send(label) {
            Ok(()) => {
                self.bump_written_metrics(outcome);
            }
            Err(LabeledWriterSendError::ChannelFull) => {
                self.metrics
                    .labels_dropped_channel_full_total
                    .fetch_add(1, Ordering::Relaxed);
                panic!(
                    "label_resolver strict-lossless violation: labeled writer channel full while closing horizon"
                );
            }
            Err(LabeledWriterSendError::ChannelClosed) => {
                self.metrics
                    .labels_dropped_channel_closed_total
                    .fetch_add(1, Ordering::Relaxed);
                panic!(
                    "label_resolver strict-lossless violation: labeled writer channel closed while closing horizon"
                );
            }
        }
    }

    fn build_closed_horizon_label(
        &self,
        meta: &PendingLabelMeta,
        slot: &PendingHorizon,
        now_ns: u64,
        outcome: LabelOutcome,
        censor_reason: Option<CensorReason>,
    ) -> LabeledTrade {
        let best_gross = slot.best_exit_pct_so_far.map(|e| meta.entry_locked_pct + e);
        let t_to_best = slot.best_exit_ts_ns_so_far.map(|ts| {
            ((ts.saturating_sub(meta.ts_emit_ns)) / 1_000_000_000).min(u32::MAX as u64) as u32
        });
        let t_to_first_hit = slot.first_exit_ge_floor_ts_ns.map(|ts| {
            ((ts.saturating_sub(meta.ts_emit_ns)) / 1_000_000_000).min(u32::MAX as u64) as u32
        });
        let label_floor_hits = meta
            .label_floors_pct
            .iter()
            .enumerate()
            .map(|(idx, &floor_pct)| {
                let hit = slot.floor_hits.get(idx);
                let first_exit_ge_floor_ts_ns = hit.and_then(|h| h.first_exit_ge_floor_ts_ns);
                let first_exit_ge_floor_pct = hit.and_then(|h| h.first_exit_ge_floor_pct);
                let t_to_first_hit_s = first_exit_ge_floor_ts_ns.map(|ts| {
                    ((ts.saturating_sub(meta.ts_emit_ns)) / 1_000_000_000).min(u32::MAX as u64)
                        as u32
                });
                FloorHitLabel {
                    floor_pct,
                    first_exit_ge_floor_ts_ns,
                    first_exit_ge_floor_pct,
                    t_to_first_hit_s,
                    realized: first_exit_ge_floor_ts_ns.is_some(),
                }
            })
            .collect();

        let mut policy = meta.policy_metadata.clone();
        policy.effective_stride_s = effective_stride_for_horizon(
            meta.policy_metadata.label_stride_s,
            slot.horizon_s,
            N_EVENTS_TARGET_PER_HORIZON,
        );
        if !policy.label_sampling_probability.is_finite() && meta.sampling_probability.is_finite() {
            policy.label_sampling_probability = meta.sampling_probability;
        }

        LabeledTrade {
            sample_id: meta.sample_id.clone(),
            sample_decision: meta.sample_decision,
            horizon_s: slot.horizon_s,
            ts_emit_ns: meta.ts_emit_ns,
            cycle_seq: meta.cycle_seq,
            schema_version: LABELED_TRADE_SCHEMA_VERSION,
            scanner_version: SCANNER_VERSION,
            cluster_id: meta.cluster_id.clone(),
            cluster_size: meta.cluster_size,
            cluster_rank: meta.cluster_rank,
            runtime_config_hash: meta.runtime_config_hash.clone(),
            priority_set_generation_id: meta.priority_set_generation_id,
            priority_set_updated_at_ns: meta.priority_set_updated_at_ns,
            route_id: meta.route_id,
            symbol_name: meta.symbol_name.clone(),
            entry_locked_pct: meta.entry_locked_pct,
            exit_start_pct: meta.exit_start_pct,
            features_t0: meta.features_t0.clone(),
            // renomes protetores aplicados.
            audit_hindsight_best_exit_pct: slot.best_exit_pct_so_far,
            audit_hindsight_best_exit_ts_ns: slot.best_exit_ts_ns_so_far,
            audit_hindsight_best_gross_pct: best_gross,
            audit_hindsight_t_to_best_s: t_to_best,
            n_clean_future_samples: slot.n_clean_future_samples,
            label_floor_pct: meta.label_floor_pct,
            first_exit_ge_label_floor_ts_ns: slot.first_exit_ge_floor_ts_ns,
            first_exit_ge_label_floor_pct: slot.first_exit_ge_floor_pct,
            t_to_first_hit_s: t_to_first_hit,
            label_floor_hits,
            outcome,
            censor_reason,
            observed_until_ns: slot.observed_until_ns,
            label_window_closed_at_ns: meta
                .ts_emit_ns
                .saturating_add((slot.horizon_s as u64).saturating_mul(1_000_000_000)),
            closed_ts_ns: now_ns,
            // writer task faz override para o ts real de write.
            // Aqui preenchemos com now_ns (close time) como fallback; writer
            // override semanticamente distingue os dois timestamps.
            written_ts_ns: now_ns,
            policy_metadata: policy,
            sampling_tier: meta.sampling_tier,
            sampling_probability: meta.sampling_probability,
            sampling_probability_kind: sampling_probability_kind_for_tier_label(meta.sampling_tier),
        }
    }

    fn bump_written_metrics(&self, outcome: LabelOutcome) {
        self.metrics
            .labels_written_total
            .fetch_add(1, Ordering::Relaxed);
        match outcome {
            LabelOutcome::Realized => self
                .metrics
                .labels_written_realized_total
                .fetch_add(1, Ordering::Relaxed),
            LabelOutcome::Miss => self
                .metrics
                .labels_written_miss_total
                .fetch_add(1, Ordering::Relaxed),
            LabelOutcome::Censored => self
                .metrics
                .labels_written_censored_total
                .fetch_add(1, Ordering::Relaxed),
        };
    }
}

impl LabelOutcome {
    fn from_horizon(ts_emit_ns: u64, slot: &PendingHorizon) -> LabelOutcome {
        let deadline = ts_emit_ns + (slot.horizon_s as u64) * 1_000_000_000;
        if slot.first_exit_ge_floor_ts_ns.is_some() {
            LabelOutcome::Realized
        } else if slot.observed_until_ns >= deadline {
            LabelOutcome::Miss
        } else {
            LabelOutcome::Censored
        }
    }
}

fn normalized_floors(primary_floor: f32, mut floors: Vec<f32>) -> Vec<f32> {
    floors.retain(|v| v.is_finite());
    // dedup com tolerância 1e-4 (antes 1e-6, muito fino para f32
    // quando primary próximo de valor da lista tinha erro de arredondamento).
    floors.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    floors.dedup_by(|a, b| (*a - *b).abs() < 1e-4);
    // primary_floor SEMPRE em hits[0] (semântica explícita).
    // Antes o sort+dedup posicionava primary onde quer que fosse por ordem
    // numérica; trainer assumindo `hits[0] = primary` quebrava.
    if primary_floor.is_finite() {
        floors.retain(|v| (*v - primary_floor).abs() >= 1e-4);
        floors.insert(0, primary_floor);
    } else if floors.is_empty() {
        floors.push(primary_floor);
    }
    floors
}

/// Deriva `cluster_id` determinístico a partir do símbolo e da janela default
/// do maior horizonte. Rotas irmãs do mesmo ativo compartilham o cluster
/// temporal para purge/CPCV conservador.
pub fn derive_cluster_id(route: RouteId, ts_emit_ns: u64) -> String {
    let max_horizon_s = DEFAULT_HORIZONS_S.iter().copied().max().unwrap_or(900);
    derive_cluster_id_for_horizon_window(route, ts_emit_ns, max_horizon_s)
}

/// Deriva `cluster_id` com janela temporal compatível com o maior horizonte
/// configurado. Isso evita separar em clusters distintos amostras do mesmo
/// símbolo cujas janelas de label ainda se sobrepõem.
pub fn derive_cluster_id_for_horizon_window(
    route: RouteId,
    ts_emit_ns: u64,
    max_horizon_s: u32,
) -> String {
    use crate::ml::util::fnv1a_64;
    let min_window_ns = 15 * 60 * 1_000_000_000u64;
    let horizon_window_ns = (max_horizon_s as u64).saturating_mul(1_000_000_000);
    let window_ns = min_window_ns.max(horizon_window_ns);
    let bucket = ts_emit_ns / window_ns;
    let mut payload = Vec::with_capacity(16);
    payload.extend_from_slice(&bucket.to_le_bytes());
    payload.extend_from_slice(&route.symbol_id.0.to_le_bytes());
    format!("{:016x}", fnv1a_64(&payload))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::persistence::labeled_writer::{LabeledJsonlWriter, LabeledWriterConfig};
    use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
    use crate::types::{SymbolId, Venue};
    use std::time::Duration;
    use tokio::time::sleep;

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_alt_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(8),
            buy_venue: Venue::BinanceFut,
            sell_venue: Venue::BitgetFut,
        }
    }

    fn mk_features() -> FeaturesT0 {
        FeaturesT0 {
            half_spread_buy_now: None,
            half_spread_sell_now: None,
            tail_ratio_p99_p95: None,
            entry_p25_24h: None,
            entry_p50_24h: None,
            entry_p75_24h: None,
            entry_p95_24h: None,
            entry_rank_percentile_24h: None,
            entry_minus_p50_24h: None,
            entry_mad_robust_24h: None,
            exit_p25_24h: None,
            exit_p50_24h: None,
            exit_p75_24h: None,
            exit_p95_24h: None,
            p_exit_ge_label_floor_minus_entry_24h: None,
            entry_p50_1h: None,
            entry_rank_percentile_1h: None,
            p_exit_ge_label_floor_minus_entry_1h: None,
            entry_p50_7d: None,
            entry_p95_7d: None,
            p_exit_ge_label_floor_minus_entry_7d: None,
            gross_run_p05_s: None,
            gross_run_p50_s: None,
            gross_run_p95_s: None,
            exit_excess_run_s: None,
            n_cache_observations_at_t0: 0,
            oldest_cache_ts_ns: 0,
            time_alive_at_t0_s: None,
            listing_age_days: None,
            route_first_seen_ns: None,
            route_last_seen_ns: None,
            route_active_until_ns: None,
            route_n_snapshots: None,
        }
    }

    fn mk_policy() -> PolicyMetadata {
        PolicyMetadata {
            baseline_model_version: "baseline-a3-0.2.0".into(),
            baseline_recommended: false,
            recommendation_kind: "abstain",
            abstain_reason: Some("NO_OPPORTUNITY"),
            prediction_source_kind: "baseline",
            prediction_model_version: "baseline-a3-0.2.0".into(),
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
            baseline_historical_base_rate_24h: None,
            baseline_derived_enter_at_min: None,
            baseline_derived_exit_at_min: None,
            baseline_floor_pct: 0.8,
            label_stride_s: 60,
            effective_stride_s: 60,
            label_sampling_probability: 1.0,
            candidates_in_route_last_24h: 0,
            accepts_in_route_last_24h: 0,
            ci_method: "wilson_marginal",
        }
    }

    async fn setup_resolver(
        cfg: ResolverConfig,
    ) -> (
        Arc<LabelResolver>,
        tempfile::TempDir,
        tokio::task::JoinHandle<()>,
    ) {
        let tmp = tempfile::tempdir().unwrap();
        let wcfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "lrtest".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = LabeledJsonlWriter::create(wcfg);
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(cfg, handle));
        (resolver, tmp, task)
    }

    async fn setup_resolver_with_spool(
        cfg: ResolverConfig,
    ) -> (
        Arc<LabelResolver>,
        tempfile::TempDir,
        tokio::task::JoinHandle<()>,
    ) {
        let tmp = tempfile::tempdir().unwrap();
        let wcfg = LabeledWriterConfig {
            data_dir: tmp.path().join("labels"),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "lrtest".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = LabeledJsonlWriter::create(wcfg);
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new_with_spool_dir(
            cfg,
            handle,
            Some(tmp.path().join("spool")),
        ));
        (resolver, tmp, task)
    }

    fn first_labeled_json(tmp: &tempfile::TempDir) -> serde_json::Value {
        let mut stack = vec![tmp.path().to_path_buf()];
        while let Some(dir) = stack.pop() {
            for entry in std::fs::read_dir(&dir).unwrap() {
                let path = entry.unwrap().path();
                if path.is_dir() {
                    stack.push(path);
                } else if path.extension().and_then(|ext| ext.to_str()) == Some("jsonl") {
                    let content = std::fs::read_to_string(path).unwrap();
                    let line = content.lines().next().expect("at least one label");
                    return serde_json::from_str(line).unwrap();
                }
            }
        }
        panic!("no labeled jsonl found");
    }

    #[tokio::test]
    async fn disk_spool_preserves_metadata_when_label_closes() {
        let cfg = ResolverConfig {
            horizons_s: vec![2],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver_with_spool(cfg).await;
        let t_emit = 1_000_000_000u64;
        let mut features = mk_features();
        features.entry_p50_24h = Some(1.23);
        features.route_n_snapshots = Some(42);
        let mut policy = mk_policy();
        policy.baseline_recommended = true;
        policy.recommendation_kind = "trade";
        policy.prediction_calibration_status = "degraded";

        assert!(resolver.on_accepted(
            "sid_spool".into(),
            t_emit,
            7,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            features,
            0.8,
            policy,
            "priority",
            1.0,
            0,
        ));
        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 1.8, -1.0);
        sleep(Duration::from_millis(150)).await;

        let m = resolver.metrics();
        assert_eq!(m.pending_candidates_current.load(Ordering::Relaxed), 0);
        assert_eq!(m.pending_horizons_current.load(Ordering::Relaxed), 0);
        assert!(m.meta_spool_bytes_current.load(Ordering::Relaxed) > META_SPOOL_MAGIC.len() as u64);
        assert_eq!(m.meta_spool_write_ops_total.load(Ordering::Relaxed), 1);
        assert_eq!(m.meta_spool_read_ops_total.load(Ordering::Relaxed), 1);
        assert_eq!(m.meta_spool_errors_total.load(Ordering::Relaxed), 0);

        let v = first_labeled_json(&tmp);
        assert_eq!(v["sample_id"], "sid_spool");
        assert_eq!(v["cycle_seq"], 7);
        assert_eq!(v["symbol_name"], "BTC-USDT");
        assert_eq!(v["sampling_tier"], "priority");
        assert_eq!(v["features_t0"]["entry_p50_24h"], 1.23);
        assert_eq!(v["features_t0"]["route_n_snapshots"], 42);
        assert_eq!(v["policy_metadata"]["recommendation_kind"], "trade");
        assert_eq!(
            v["policy_metadata"]["prediction_calibration_status"],
            "degraded"
        );
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn same_timestamp_observation_does_not_update_new_candidate() {
        let cfg = ResolverConfig {
            horizons_s: vec![2],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;

        assert!(resolver.on_accepted(
            "sid_no_same_tick_hit".into(),
            t_emit,
            7,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "priority",
            1.0,
            0,
        ));
        resolver.on_clean_observation(mk_route(), t_emit, 2.0, 99.0);
        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 2.0, -2.0);
        sleep(Duration::from_millis(150)).await;

        let v = first_labeled_json(&tmp);
        assert_eq!(v["sample_id"], "sid_no_same_tick_hit");
        assert_eq!(v["outcome"], "miss");
        assert_eq!(
            v["first_exit_ge_label_floor_ts_ns"],
            serde_json::Value::Null
        );
        assert_eq!(v["n_clean_future_samples"], 1);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn closed_horizons_are_evicted_before_longest_horizon_closes() {
        let cfg = ResolverConfig {
            horizons_s: vec![2, 4],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;

        assert!(resolver.on_accepted(
            "sid_multi_horizon".into(),
            t_emit,
            7,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "priority",
            1.0,
            0,
        ));
        assert_eq!(
            resolver
                .metrics()
                .pending_horizons_current
                .load(Ordering::Relaxed),
            2
        );

        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 2.0, -1.0);

        {
            let inner = resolver.inner.lock();
            let queue = inner.pending_by_route.get(&mk_route()).unwrap();
            assert_eq!(queue.len(), 1);
            let pending = queue.front().unwrap();
            let open_horizons: Vec<_> = pending.horizons.iter().collect();
            assert_eq!(open_horizons.len(), 1);
            assert_eq!(open_horizons[0].horizon_s, 4);
        }
        assert_eq!(
            resolver
                .metrics()
                .pending_candidates_current
                .load(Ordering::Relaxed),
            1
        );
        assert_eq!(
            resolver
                .metrics()
                .pending_horizons_current
                .load(Ordering::Relaxed),
            1
        );
        assert_eq!(
            resolver
                .metrics()
                .labels_written_total
                .load(Ordering::Relaxed),
            1
        );

        resolver.on_clean_observation(mk_route(), t_emit + 4_000_000_000, 2.0, -1.0);
        assert_eq!(
            resolver
                .metrics()
                .pending_candidates_current
                .load(Ordering::Relaxed),
            0
        );
        assert_eq!(
            resolver
                .metrics()
                .pending_horizons_current
                .load(Ordering::Relaxed),
            0
        );
        assert_eq!(
            resolver
                .metrics()
                .labels_written_total
                .load(Ordering::Relaxed),
            2
        );
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn disk_spool_keeps_sealed_segment_until_closed_label_is_materialized() {
        let cfg = ResolverConfig {
            horizons_s: vec![2],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver_with_spool(cfg).await;
        let t_emit = 1_000_000_000u64;

        assert!(resolver.on_accepted(
            "sid_old_segment".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "priority",
            1.0,
            0,
        ));
        assert!(resolver.on_accepted(
            "sid_new_segment".into(),
            t_emit,
            2,
            mk_alt_route(),
            "ETH-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "priority",
            1.0,
            0,
        ));
        let spool_segments = std::fs::read_dir(tmp.path().join("spool"))
            .unwrap()
            .filter(|entry| {
                entry
                    .as_ref()
                    .ok()
                    .and_then(|entry| {
                        entry
                            .path()
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(str::to_owned)
                    })
                    .as_deref()
                    == Some("spool")
            })
            .count();
        assert!(
            spool_segments >= 2,
            "teste precisa forcar rotacao do spool para cobrir segmento selado"
        );

        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 2.0, -1.0);
        sleep(Duration::from_millis(150)).await;

        let m = resolver.metrics();
        assert_eq!(m.meta_spool_errors_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.labels_written_total.load(Ordering::Relaxed), 1);
        let v = first_labeled_json(&tmp);
        assert_eq!(v["sample_id"], "sid_old_segment");
        assert!(m.meta_spool_read_ops_total.load(Ordering::Relaxed) >= 1);

        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn disk_spool_is_removed_after_shutdown_flush() {
        let cfg = ResolverConfig {
            horizons_s: vec![900],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver_with_spool(cfg).await;
        let spool_dir = tmp.path().join("spool");
        let t_emit = 1_000_000_000u64;
        assert!(resolver.on_accepted(
            "sid_shutdown_spool".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        ));
        assert!(
            std::fs::read_dir(&spool_dir).unwrap().any(|entry| entry
                .unwrap()
                .path()
                .extension()
                .and_then(|e| e.to_str())
                == Some("spool")),
            "spool deve existir enquanto ha pending vivo"
        );

        let closed = resolver.shutdown_flush(t_emit + 1_000_000_000).await;
        assert_eq!(closed.closed_total, 1);
        sleep(Duration::from_millis(150)).await;
        assert_eq!(
            resolver
                .metrics()
                .meta_spool_errors_total
                .load(Ordering::Relaxed),
            0
        );
        assert_eq!(
            resolver
                .metrics()
                .meta_spool_bytes_current
                .load(Ordering::Relaxed),
            0
        );
        assert!(
            !std::fs::read_dir(&spool_dir).unwrap().any(|entry| entry
                .unwrap()
                .path()
                .extension()
                .and_then(|e| e.to_str())
                == Some("spool")),
            "shutdown_flush deve remover spool temporario"
        );
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn realized_when_first_hit_occurs_within_horizon() {
        let cfg = ResolverConfig {
            horizons_s: vec![2, 4, 6],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_a".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // t+1s: exit=-1.5 → gross = 2.5 + (-1.5) = 1.0 >= floor 0.8 → hit!
        resolver.on_clean_observation(mk_route(), t_emit + 1_000_000_000, 2.0, -1.5);
        // t+3s: best_exit melhora para -0.5
        resolver.on_clean_observation(mk_route(), t_emit + 3_000_000_000, 1.5, -0.5);
        // t+7s (sweeper): 6s horizonte deve ter fechado (t_emit + 6s + slack = t+7s)
        let closed = resolver.sweep(t_emit + 7_000_000_000);
        assert!(closed >= 1);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_realized_total.load(Ordering::Relaxed) >= 1);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn miss_when_first_hit_never_occurs() {
        let cfg = ResolverConfig {
            horizons_s: vec![2, 4, 6],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_m".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            10.0,
            mk_policy(), // floor absurdo
            "allowlist",
            1.0,
            0,
        );
        // Observações com exit muito negativo → nunca hita floor 10%.
        for i in 1..=5u64 {
            resolver.on_clean_observation(mk_route(), t_emit + i * 1_000_000_000, 2.0, -2.0);
        }
        resolver.sweep(t_emit + 10_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_miss_total.load(Ordering::Relaxed) >= 1);
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn future_entry_improvement_does_not_realize_locked_label() {
        let cfg = ResolverConfig {
            horizons_s: vec![2],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_locked_entry".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            1.0,
            -2.0,
            mk_features(),
            3.0,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );

        // Se o label usasse entry(t>t0), este tick realizaria: 99 + 0 >= 3.
        // Correto: entry_locked=1, então 1 + 0 < 3 e o horizonte vira Miss.
        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 99.0, 0.0);
        resolver.sweep(t_emit + 4_000_000_000);
        sleep(Duration::from_millis(150)).await;

        let m = resolver.metrics();
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.labels_written_miss_total.load(Ordering::Relaxed), 1);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn post_deadline_only_observation_censors_horizon() {
        let cfg = ResolverConfig {
            horizons_s: vec![2],
            close_slack_ns: 60_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_late".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // t+3s fica fora do horizonte de 2s. Sem observação limpa dentro
        // da janela, também não é falsificável como miss.
        resolver.on_clean_observation(mk_route(), t_emit + 3_000_000_000, 1.9, -0.5);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.labels_written_miss_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 1);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn expired_incomplete_horizon_is_censored_not_miss() {
        let cfg = ResolverConfig {
            horizons_s: vec![10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_incomplete".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            10.0,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        resolver.on_clean_observation(mk_route(), t_emit + 5_000_000_000, 2.0, -2.0);
        resolver.sweep(t_emit + 12_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 1);
        assert_eq!(m.labels_written_miss_total.load(Ordering::Relaxed), 0);
        let v = first_labeled_json(&tmp);
        assert_eq!(v["outcome"], "censored");
        assert_eq!(v["censor_reason"], "incomplete_window");
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn censored_when_route_silent_beyond_idle_threshold() {
        let cfg = ResolverConfig {
            horizons_s: vec![60, 120, 180],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 5 * 1_000_000_000, // 5s no teste
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_c".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // Sem observações; só sweeper após 6s.
        resolver.sweep(t_emit + 6_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_censored_total.load(Ordering::Relaxed) >= 3);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn dormant_sweep_preserves_realized_when_hit_already_seen() {
        let cfg = ResolverConfig {
            horizons_s: vec![60],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 5 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_dormant_realized".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.5,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // t+2s: gross = 2.0 + (-0.5) = 1.5 >= floor 0.5.
        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 1.8, -0.5);
        // t+8s: rota ja esta dormente pelo threshold de 5s, mas o hit foi
        // observado antes do silencio; outcome correto e Realized.
        resolver.sweep(t_emit + 8_000_000_000);
        sleep(Duration::from_millis(150)).await;

        let m = resolver.metrics();
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 1);
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn stride_suppresses_labels_within_window() {
        let cfg = ResolverConfig::default();
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        let created_a = resolver.on_accepted(
            "sid1".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            60, // stride 60s
        );
        assert!(created_a);
        // 30s depois — dentro do stride → skip.
        assert!(!resolver.candidate_stride_eligible(mk_route(), t0 + 30_000_000_000, 60));
        let created_b = resolver.on_accepted(
            "sid2".into(),
            t0 + 30_000_000_000,
            2,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            60,
        );
        assert!(!created_b);
        let m = resolver.metrics();
        assert_eq!(m.stride_skipped_total.load(Ordering::Relaxed), 1);
        // 91s depois — menor horizonte default tem stride efetivo 90s.
        assert!(resolver.candidate_stride_eligible(mk_route(), t0 + 91_000_000_000, 60));
        let created_c = resolver.on_accepted(
            "sid3".into(),
            t0 + 91_000_000_000,
            3,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            60,
        );
        assert!(created_c);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn sweep_prunes_expired_stride_index_without_closing_open_horizon() {
        let cfg = ResolverConfig {
            horizons_s: vec![900],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 10,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;

        assert!(resolver.on_accepted(
            "sid_stride_prune".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            60,
        ));

        let m = resolver.metrics();
        assert_eq!(m.stride_index_entries_current.load(Ordering::Relaxed), 1);
        assert_eq!(m.pending_candidates_current.load(Ordering::Relaxed), 1);

        // h=900 com target 10 => effective_stride=90s. Depois disso,
        // remover a chave de stride e manter o pending aberto é equivalente:
        // um novo candidato já estaria elegível de qualquer forma.
        assert_eq!(resolver.sweep(t0 + 90_000_000_000), 0);

        assert_eq!(m.stride_index_entries_current.load(Ordering::Relaxed), 0);
        assert_eq!(m.stride_index_pruned_total.load(Ordering::Relaxed), 1);
        assert_eq!(m.pending_candidates_current.load(Ordering::Relaxed), 1);

        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn stride_filters_horizons_independently() {
        let cfg = ResolverConfig {
            horizons_s: vec![60, 600],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        assert!(resolver.on_accepted(
            "sid1".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            10,
        ));

        // 20s depois: h=60 tem stride efetivo 10s; h=600 tem 60s.
        assert!(resolver.on_accepted(
            "sid2".into(),
            t0 + 20_000_000_000,
            2,
            mk_route(),
            "BTC-USDT".into(),
            2.6,
            -1.1,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            10,
        ));

        let inner = resolver.inner.lock();
        let queue = inner.pending_by_route.get(&mk_route()).unwrap();
        assert_eq!(queue.len(), 2);
        let second = queue.back().unwrap();
        let open_horizons: Vec<_> = second.horizons.iter().collect();
        assert_eq!(open_horizons.len(), 1);
        assert_eq!(open_horizons[0].horizon_s, 60);
        drop(inner);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn best_exit_tracks_max_even_after_first_hit() {
        let cfg = ResolverConfig {
            horizons_s: vec![10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.5,
            mk_features(),
            0.5,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // t+2s: exit=-1.0 → gross=1.0 (hit)
        resolver.on_clean_observation(mk_route(), t0 + 2_000_000_000, 1.9, -1.0);
        // t+5s: exit melhora para +0.5 → best_exit deve atualizar
        resolver.on_clean_observation(mk_route(), t0 + 5_000_000_000, 1.8, 0.5);
        resolver.sweep(t0 + 40_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_realized_total.load(Ordering::Relaxed) >= 3);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn shutdown_censors_all_pending() {
        let cfg = ResolverConfig::default();
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // Sem observações → observed_until == t_emit < qualquer deadline → Censored.
        // DEFAULT_HORIZONS_S agora tem 6 elementos (buraco 2h→8h fechado).
        let closed = resolver.shutdown_flush(t0 + 1_000_000_000).await;
        assert_eq!(
            closed.closed_total, 6,
            "6 horizontes default devem ter sido fechados"
        );
        assert_eq!(closed.sent_total, 6);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(
            m.shutdown_lost_pending_total.load(Ordering::Relaxed),
            6,
            "sem observações, todos 6 são Censored (lost)"
        );
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 6);
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn shutdown_flush_drains_more_than_writer_channel_capacity() {
        fn count_jsonl_lines(root: &std::path::Path) -> usize {
            let mut total = 0usize;
            let mut stack = vec![root.to_path_buf()];
            while let Some(dir) = stack.pop() {
                for entry in std::fs::read_dir(dir).expect("read_dir") {
                    let entry = entry.expect("dir entry");
                    let path = entry.path();
                    if path.is_dir() {
                        stack.push(path);
                    } else if path.extension().and_then(|s| s.to_str()) == Some("jsonl") {
                        let content = std::fs::read_to_string(&path).expect("jsonl content");
                        total += content.lines().count();
                    }
                }
            }
            total
        }

        let tmp = tempfile::tempdir().unwrap();
        let wcfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1,
            flush_after_n: 512,
            flush_interval: Duration::from_secs(60),
            file_prefix: "lr-shutdown-drain".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = LabeledJsonlWriter::create(wcfg);
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig::default(),
            handle.clone(),
        ));
        let t0 = 1_000_000_000u64;
        for i in 0..25u32 {
            resolver.on_accepted(
                format!("sid_{i}"),
                t0 + i as u64,
                i,
                mk_route(),
                "BTC-USDT".into(),
                2.0,
                -1.0,
                mk_features(),
                0.8,
                mk_policy(),
                "allowlist",
                1.0,
                0,
            );
        }

        let closed = resolver.shutdown_flush(t0 + 1_000_000_000).await;
        assert_eq!(closed.closed_total, 25 * DEFAULT_HORIZONS_S.len() as u64);
        assert_eq!(
            closed.sent_total, closed.closed_total,
            "shutdown must not drop when pending burst exceeds channel capacity"
        );
        assert_eq!(closed.dropped_channel_closed_total, 0);
        let writer_stats = handle.seal_current_file().await.expect("seal writer");
        assert_eq!(writer_stats.total_written, closed.closed_total);
        assert_eq!(count_jsonl_lines(tmp.path()), closed.closed_total as usize);

        drop(resolver);
        drop(handle);
        task.abort();
    }

    #[tokio::test]
    async fn shutdown_preserves_realized_when_first_hit_before_shutdown() {
        // U1 pós-auditoria 2026-04-22: shutdown_flush não deve
        // sobrescrever labels que já tinham `first_exit_ge_floor_ts_ns` —
        // eles devem ser emitidos como Realized, não como Censored{Shutdown}.
        let cfg = ResolverConfig {
            horizons_s: vec![10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_realized".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.5,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // Observação dentro de 2s: gross = 2.0 + (-0.5) = 1.5 > floor 0.5 → hit.
        resolver.on_clean_observation(mk_route(), t0 + 2_000_000_000, 1.8, -0.5);
        // Shutdown em t0+5s (antes de qualquer horizonte expirar).
        let closed = resolver.shutdown_flush(t0 + 5_000_000_000).await;
        assert_eq!(closed.closed_total, 3, "3 horizontes fechados no shutdown");
        assert_eq!(closed.sent_total, 3);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(
            m.labels_written_realized_total.load(Ordering::Relaxed),
            3,
            "todos 3 horizontes tinham first_exit.is_some() → Realized"
        );
        assert_eq!(
            m.labels_written_censored_total.load(Ordering::Relaxed),
            0,
            "nenhum deve virar Censored se já havia hit"
        );
        assert_eq!(
            m.shutdown_lost_pending_total.load(Ordering::Relaxed),
            0,
            "métrica shutdown_lost_pending só conta Censored de verdade"
        );
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn shutdown_emits_miss_when_deadline_passed_without_hit() {
        // Caso de borda: horizonte vencido mas ainda aberto (não foi
        // fechado pelo sweep ainda). Shutdown deve emitir Miss, não
        // Censored, porque observed_until >= deadline.
        let cfg = ResolverConfig {
            horizons_s: vec![2, 4, 6],
            close_slack_ns: 5_000_000_000, // slack grande — sweep não fecharia ainda
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_miss".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            10.0, // floor inalcançável → nunca hita
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // Observações continuam chegando (rota não sumiu) até além do último
        // deadline (6s), mas nunca hitam o floor de 10%.
        for i in 1..=7u64 {
            resolver.on_clean_observation(mk_route(), t0 + i * 1_000_000_000, 1.9, -2.0);
        }
        // Shutdown em t0+7s — slot 900s/1800s/2h (no config test: 2/4/6s)
        // todos têm observed_until >= deadline → Miss, não Censored.
        resolver.shutdown_flush(t0 + 7_000_000_000).await;
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(
            m.labels_written_miss_total.load(Ordering::Relaxed),
            3,
            "3 horizontes expiraram observados sem hit → Miss"
        );
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.shutdown_lost_pending_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    #[should_panic(expected = "strict-lossless violation")]
    async fn pending_overflow_fails_high_instead_of_dropping_labels() {
        // Depois que um candidate entra na população supervisionada, removê-lo
        // por pressão de RAM cria viés. O cap é tripwire operacional: falha
        // alto antes de descartar qualquer label.
        let cfg = ResolverConfig {
            horizons_s: vec![60, 120, 180],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 3,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, _tmp, _task) = setup_resolver(cfg).await;
        for i in 0..5u32 {
            resolver.on_accepted(
                format!("sid{}", i),
                1_000_000_000 + (i as u64) * 1_000_000_000,
                i,
                mk_route(),
                "BTC-USDT".into(),
                2.5,
                -1.2,
                mk_features(),
                0.8,
                mk_policy(),
                "allowlist",
                1.0,
                0, // sem stride
            );
        }
    }

    #[test]
    fn normalized_floors_places_primary_in_head_position() {
        // primary_floor sempre em hits[0] mesmo quando não-monotônico.
        let floors = normalized_floors(0.8, vec![0.3, 0.5, 1.2, 2.0]);
        assert_eq!(floors[0], 0.8, "primary deve estar em hits[0]");
        assert!(floors.len() == 5);
        // dedup com tolerância 1e-4.
        let dedup = normalized_floors(0.800001, vec![0.8, 0.5]);
        assert_eq!(dedup.len(), 2, "0.8 e 0.800001 dedupam; primary permanece");
        assert_eq!(dedup[0], 0.800001);
    }

    #[test]
    fn effective_stride_scales_with_horizon() {
        // stride por horizonte evita overlap massivo em h longo.
        // h=900 com N=10: 90s > base 60 ⇒ 90s.
        assert_eq!(effective_stride_for_horizon(60, 900, 10), 90);
        // h=28800 com N=10: 2880s.
        assert_eq!(effective_stride_for_horizon(60, 28800, 10), 2880);
    }

    #[test]
    fn cluster_id_deterministic_and_symbol_window_sensitive() {
        // cluster_id derivável deterministicamente.
        use crate::types::{SymbolId, Venue};
        let r1 = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        let r_same_symbol = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::BinanceFut,
            sell_venue: Venue::MexcFut,
        };
        let r2 = RouteId {
            symbol_id: SymbolId(2),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        let t = 0u64;
        assert_eq!(derive_cluster_id(r1, t), derive_cluster_id(r1, t));
        assert_eq!(
            derive_cluster_id(r1, t),
            derive_cluster_id(r_same_symbol, t)
        );
        assert_ne!(derive_cluster_id(r1, t), derive_cluster_id(r2, t));
        // Mesma janela do horizonte máximo default (8h) → mesmo cluster.
        assert_eq!(
            derive_cluster_id(r1, t),
            derive_cluster_id(r1, t + 16 * 60 * 1_000_000_000)
        );
        // Janela seguinte ao horizonte máximo → cluster distinto.
        assert_ne!(
            derive_cluster_id(r1, t),
            derive_cluster_id(r1, t + 8 * 60 * 60 * 1_000_000_000)
        );
    }
}
