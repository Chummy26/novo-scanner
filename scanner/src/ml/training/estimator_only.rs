use std::{
    collections::{BTreeMap, BTreeSet, HashMap, HashSet},
    fs::{self, File},
    io::{BufWriter, Read, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use crate::ml::persistence::{
    storage_v2::{open_storage_v2_sidecar_logical_reader, StorageV2SidecarManifest},
    DatasetKind, LABELED_TRADE_SCHEMA_VERSION,
};
use anyhow::{bail, Context, Result};
use arrow_array::{
    Array, BooleanArray, Float32Array, ListArray, RecordBatch, StringArray, StructArray,
    UInt16Array, UInt32Array, UInt64Array,
};
use clap::{Parser, ValueEnum};
use serde::Serialize;

const NS_PER_S: u64 = 1_000_000_000;
const TRAINER_VERSION: &str = "estimator_only_ecdf/v0.1.3";
const MODEL_FAMILY: &str = "forward_labeled_ecdf";
const OUTPUT_CONTRACT_VERSION: &str = "trade_recommendation/v2.3";
const CI_METHOD: &str = "temporal_block_bootstrap_km_percentile_95";
const FALLBACK_CI_METHOD: &str = "kaplan_meier_loglog_greenwood_95";
const PROMOTION_INTERVAL_REQUIREMENT: &str = "block_bootstrap_or_conformal_interval";
const STATE_BUCKET_VERSION: &str = "pit_state_bucket/v2";
const PREDICTION_METHOD: &str = "route_serving_monotone_km_shrunk_to_global_pit_state_km";
const CALIBRATOR_VERSION: &str = "isotonic_complete_case_temporal/v0.1.0";
const CALIBRATOR_METHOD: &str = "isotonic_pava_complete_case_temporal";
const SERVING_CALIBRATOR_METHOD: &str = "scope_pooled_isotonic_with_cell_readiness_gate/v0.1.0";
const MONOTONICITY_PROJECTION_METHOD: &str =
    "weighted_coordinate_isotonic_pava_horizon_floor/v0.1.0";
const SERVING_PROBABILITY_PROJECTION_METHOD: &str =
    "scope_pooled_calibrated_weighted_coordinate_isotonic_pava_horizon_floor/v0.1.0";
const EXIT_POLICY_NAME: &str = "gross_utility";
const EXIT_POLICY_VERSION: &str = "gross_utility/v0.1.0";
const EXIT_POLICY_MIN_GROSS_FLOOR_PCT: f64 = 0.80;
const EXIT_POLICY_MIN_P_HIT: f64 = 0.60;
const EXIT_POLICY_MAX_P_CENSOR: f64 = 0.10;
const EXIT_POLICY_MAX_P_HIT_INTERVAL_WIDTH: f64 = 0.20;
const EXIT_POLICY_MAX_T_HIT_P75_S: u32 = 3_600;
const MONOTONICITY_PROJECTION_MAX_ITERATIONS: u32 = 100;
const MONOTONICITY_PROJECTION_TOLERANCE: f64 = 1e-12;
const MIN_CALIBRATION_COMPLETE: u64 = 1_000;
const CALIBRATION_PROB_SCALE: f64 = 1_000_000_000_000.0;
const EPS: f32 = 1e-4;
const MAX_AUDIT_ISSUES: usize = 1_000;
const ARTIFACT_DIGEST_KIND: &str = "fnv1a128_file_v1";
const STORAGE_V2_LOGICAL_DIGEST_KIND: &str = "fnv1a64_storage_v2_logical_required_v1";
const TRAINER_SUPERVISED_DIGEST_KIND: &str = "fnv1a128_estimator_supervised_fields_v1";
const EXPECTED_FLOOR_BP: &[i32] = &[30, 50, 80, 120, 200, 300];
const EXPECTED_HORIZONS_S: &[u32] = &[900, 1800, 3600, 7200, 14400, 28800];
const BLOCK_BOOTSTRAP_MIN_BLOCK_S: u64 = 1_800;
const BLOCK_BOOTSTRAP_REPLICATES: usize = 128;
const BLOCK_BOOTSTRAP_MIN_BLOCKS: usize = 3;
const SUPERVISED_DEDUPE_KEY_ALGORITHM: &str =
    "fnv1a128(sample_id,horizon_s)_complete_floor_vector_v1";
const SUPERVISED_DEDUPE_FINGERPRINT_ALGORITHM: &str =
    "fnv1a128(supervised_outcome_and_bucket_fields_for_all_floors)_v1";

const FNV_OFFSET_128: u128 = 0x6c62272e07bb014262b821756295c58d;
const FNV_PRIME_128: u128 = 0x0000000001000000000000000000013b;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum PredictionScope {
    All,
    Accept,
    Background,
    BelowTail,
    InsufficientHistory,
}

impl PredictionScope {
    fn as_str(self) -> &'static str {
        match self {
            PredictionScope::All => "all",
            PredictionScope::Accept => "accept",
            PredictionScope::Background => "background",
            PredictionScope::BelowTail => "below_tail",
            PredictionScope::InsufficientHistory => "insufficient_history",
        }
    }

    fn includes_sample_decision(self, sample_decision: &str) -> bool {
        match self {
            PredictionScope::All => true,
            PredictionScope::Accept => sample_decision == "accept",
            PredictionScope::Background => sample_decision != "accept",
            PredictionScope::BelowTail => sample_decision == "below_tail",
            PredictionScope::InsufficientHistory => sample_decision == "insufficient_history",
        }
    }
}

impl std::fmt::Display for PredictionScope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Parser, Debug)]
#[command(
    name = "ml_train_estimator_only",
    about = "Treina o baseline EstimatorOnly Forward-Labeled ECDF/KM a partir de labeled_trades V2"
)]
pub struct Cli {
    /// Diretório data/ml_v2/labeled_trades ou um manifesto *.storage_v2.manifest.json.
    #[arg(long, default_value = "data/ml_v2/labeled_trades")]
    input: PathBuf,

    /// Diretório de saída. Se omitido, cria data/ml/trainer_runs/estimator-only-<unix>.
    #[arg(long)]
    out_dir: Option<PathBuf>,

    /// Limita manifestos para smoke/benchmark.
    #[arg(long)]
    max_manifests: Option<usize>,

    /// Limita linhas lógicas de labeled_trades lidas por passe.
    #[arg(long)]
    max_rows: Option<u64>,

    /// Suporte mínimo para o estimador ser elegível em predição.
    #[arg(long, default_value_t = 200)]
    min_support: u64,

    /// Fração temporal inicial usada como treino.
    #[arg(long, default_value_t = 0.60)]
    train_frac: f64,

    /// Fração temporal seguinte usada como calibração diagnóstica.
    #[arg(long, default_value_t = 0.20)]
    calibration_frac: f64,

    /// Purge entre treino e calibração/teste. Default = maior horizonte atual, 8h.
    #[arg(long, default_value_t = 28_800)]
    purge_s: u64,

    /// Embargo antes do teste. Default = maior horizonte atual, 8h.
    #[arg(long, default_value_t = 28_800)]
    embargo_s: u64,

    /// Escopo usado para métricas de recomendação. O dataset completo continua auditado.
    #[arg(long, value_enum, default_value_t = PredictionScope::Accept)]
    prediction_scope: PredictionScope,

    /// Sobrescreve diretório de saída existente. Sem isto, o trainer recusa colisões.
    #[arg(long)]
    overwrite: bool,

    /// Identificador determinístico do run de trainer. Se omitido, usa timestamp em nanos.
    #[arg(long)]
    run_id: Option<String>,

    /// Threshold diagnóstico para precision@threshold.
    #[arg(long, default_value_t = 0.60)]
    decision_threshold: f64,

    /// Força do shrinkage rota->estado PIT. Maior = mais peso ao estado PIT quando a rota tem pouco suporte.
    #[arg(long, default_value_t = 500.0)]
    shrinkage_k: f64,
}

#[derive(Debug, Clone)]
struct ManifestRecord {
    path: PathBuf,
    manifest: StorageV2SidecarManifest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SplitName {
    Train,
    Calibration,
    Test,
    Gap,
}

#[derive(Debug, Clone, Copy, Serialize)]
struct TemporalSplit {
    min_ts_ns: u64,
    max_ts_ns: u64,
    train_end_ns: u64,
    calibration_start_ns: u64,
    calibration_end_ns: u64,
    test_start_ns: u64,
    max_horizon_s: u64,
    requested_purge_s: u64,
    requested_embargo_s: u64,
    purge_s: u64,
    embargo_s: u64,
    data_span_s: u64,
    diagnostic_only: bool,
}

impl TemporalSplit {
    fn assign(self, ts_ns: u64) -> SplitName {
        if ts_ns <= self.train_end_ns {
            SplitName::Train
        } else if ts_ns >= self.calibration_start_ns && ts_ns <= self.calibration_end_ns {
            SplitName::Calibration
        } else if ts_ns >= self.test_start_ns {
            SplitName::Test
        } else {
            SplitName::Gap
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct AggregationKey {
    scope: String,
    level: AggregationLevel,
    entity: String,
    horizon_s: u32,
    floor_bp: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "snake_case")]
enum AggregationLevel {
    Route,
    GlobalState,
    Global,
}

impl AggregationLevel {
    fn as_str(self) -> &'static str {
        match self {
            AggregationLevel::Route => "route",
            AggregationLevel::GlobalState => "global_state",
            AggregationLevel::Global => "global",
        }
    }
}

#[derive(Debug, Default, Clone)]
struct GroupStats {
    n_total: u64,
    n_realized: u64,
    n_miss: u64,
    n_censored: u64,
    n_complete: u64,
    sampling_probability_invalid: u64,
    sampling_weight_sum: f64,
    sampling_weight_sq_sum: f64,
    complete_weight_sum: f64,
    complete_weighted_hits: f64,
    event_counts: BTreeMap<u32, u64>,
    censor_before_horizon_counts: BTreeMap<u32, u64>,
}

impl GroupStats {
    fn update(&mut self, row: FloorOutcome, horizon_s: u32, sampling_probability: Option<f32>) {
        self.n_total = self.n_total.saturating_add(1);
        match row.outcome {
            FloorOutcomeKind::Realized => {
                self.n_realized = self.n_realized.saturating_add(1);
                self.n_complete = self.n_complete.saturating_add(1);
                *self.event_counts.entry(row.duration_s).or_insert(0) += 1;
            }
            FloorOutcomeKind::Miss => {
                self.n_miss = self.n_miss.saturating_add(1);
                self.n_complete = self.n_complete.saturating_add(1);
            }
            FloorOutcomeKind::Censored => {
                self.n_censored = self.n_censored.saturating_add(1);
                if row.duration_s < horizon_s {
                    *self
                        .censor_before_horizon_counts
                        .entry(row.duration_s)
                        .or_insert(0) += 1;
                }
            }
        }

        match sampling_probability {
            Some(pi) if pi.is_finite() && pi > 0.0 && pi <= 1.0 => {
                let w = 1.0 / pi as f64;
                self.sampling_weight_sum += w;
                self.sampling_weight_sq_sum += w * w;
                if row.outcome != FloorOutcomeKind::Censored {
                    self.complete_weight_sum += w;
                    if row.outcome == FloorOutcomeKind::Realized {
                        self.complete_weighted_hits += w;
                    }
                }
            }
            _ => {
                self.sampling_probability_invalid =
                    self.sampling_probability_invalid.saturating_add(1);
            }
        }
    }

    fn finalize(&self, key: &AggregationKey) -> EstimatorRow {
        let km = kaplan_meier(self);
        let p_hit_lower_bound = safe_ratio(self.n_realized, self.n_total);
        let p_hit_complete_naive = safe_ratio(self.n_realized, self.n_complete);
        let p_hit_ipw_complete = if self.complete_weight_sum > 0.0 {
            Some(self.complete_weighted_hits / self.complete_weight_sum)
        } else {
            None
        };
        let p_censor = safe_ratio(self.n_censored, self.n_total).unwrap_or(0.0);
        let n_eff_sampling = if self.sampling_weight_sq_sum > 0.0 {
            Some(
                (self.sampling_weight_sum * self.sampling_weight_sum) / self.sampling_weight_sq_sum,
            )
        } else {
            None
        };

        EstimatorRow {
            trainer_artifact_version: TRAINER_VERSION.to_string(),
            model_family: MODEL_FAMILY.to_string(),
            estimator_method: "kaplan_meier_product_limit".to_string(),
            aggregation_level: key.level.as_str().to_string(),
            population_scope: key.scope.clone(),
            entity_key: key.entity.clone(),
            horizon_s: key.horizon_s,
            floor_pct: key.floor_bp as f32 / 100.0,
            n_total: self.n_total,
            n_complete: self.n_complete,
            n_realized: self.n_realized,
            n_miss: self.n_miss,
            n_censored: self.n_censored,
            n_eff_sampling,
            p_hit_km_raw: km.p_hit,
            p_hit_km: km.p_hit,
            p_hit_ci_lower_raw: km.ci_lower,
            p_hit_ci_lower: km.ci_lower,
            p_hit_ci_upper_raw: km.ci_upper,
            p_hit_ci_upper: km.ci_upper,
            p_hit_monotonicity_delta: km.p_hit.map(|_| 0.0),
            p_hit_monotonicity_adjusted: false,
            p_hit_calibrated_raw: None,
            p_hit_calibration_applied: false,
            p_hit_serving: None,
            p_hit_serving_monotonicity_delta: None,
            p_hit_serving_monotonicity_adjusted: false,
            p_hit_lower_bound,
            p_hit_complete_naive,
            p_hit_ipw_complete,
            p_censor,
            t_hit_conditional_p25_s: quantile_from_counts(&self.event_counts, 0.25),
            t_hit_conditional_p50_s: quantile_from_counts(&self.event_counts, 0.50),
            t_hit_conditional_p75_s: quantile_from_counts(&self.event_counts, 0.75),
            ci_method: FALLBACK_CI_METHOD.to_string(),
            sampling_probability_invalid: self.sampling_probability_invalid,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FloorOutcomeKind {
    Realized,
    Miss,
    Censored,
}

#[derive(Debug, Clone, Copy)]
struct FloorOutcome {
    outcome: FloorOutcomeKind,
    duration_s: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct SupervisedDedupeRowKey {
    digest: u128,
    horizon_s: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct SupervisedDedupeFingerprint {
    digest: u128,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DedupeDecision {
    Unique,
    DuplicateExact,
    DuplicateConflict,
}

#[derive(Debug, Clone, Serialize)]
struct DedupeAudit {
    stage: String,
    enabled: bool,
    key_algorithm: String,
    fingerprint_algorithm: String,
    rows_seen: u64,
    unique_rows: u64,
    duplicate_exact_rows: u64,
    duplicate_conflict_rows: u64,
    floor_keys_seen: u64,
    unique_floor_keys: u64,
    duplicate_exact_floor_keys: u64,
    duplicate_conflict_floor_keys: u64,
    duplicate_exact_by_split: BTreeMap<String, u64>,
    duplicate_conflict_by_split: BTreeMap<String, u64>,
    examples: Vec<String>,
}

impl DedupeAudit {
    fn new(stage: &str) -> Self {
        Self {
            stage: stage.to_string(),
            enabled: true,
            key_algorithm: SUPERVISED_DEDUPE_KEY_ALGORITHM.to_string(),
            fingerprint_algorithm: SUPERVISED_DEDUPE_FINGERPRINT_ALGORITHM.to_string(),
            rows_seen: 0,
            unique_rows: 0,
            duplicate_exact_rows: 0,
            duplicate_conflict_rows: 0,
            floor_keys_seen: 0,
            unique_floor_keys: 0,
            duplicate_exact_floor_keys: 0,
            duplicate_conflict_floor_keys: 0,
            duplicate_exact_by_split: BTreeMap::new(),
            duplicate_conflict_by_split: BTreeMap::new(),
            examples: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize)]
struct DedupeReport {
    training_aggregation: DedupeAudit,
    bootstrap_interval: DedupeAudit,
    calibration_fit: DedupeAudit,
    scoring_scorecard: DedupeAudit,
}

struct DedupeTracker {
    seen: HashMap<SupervisedDedupeRowKey, SupervisedDedupeFingerprint>,
    audit: DedupeAudit,
}

impl DedupeTracker {
    fn new(stage: &str) -> Self {
        Self {
            seen: HashMap::new(),
            audit: DedupeAudit::new(stage),
        }
    }

    fn observe(
        &mut self,
        key: SupervisedDedupeRowKey,
        fingerprint: SupervisedDedupeFingerprint,
        split: SplitName,
        sample_id: &str,
        route_id: &str,
        floor_count: u64,
    ) -> DedupeDecision {
        self.audit.rows_seen = self.audit.rows_seen.saturating_add(1);
        self.audit.floor_keys_seen = self.audit.floor_keys_seen.saturating_add(floor_count);
        match self.seen.get(&key).copied() {
            None => {
                self.seen.insert(key, fingerprint);
                self.audit.unique_rows = self.audit.unique_rows.saturating_add(1);
                self.audit.unique_floor_keys =
                    self.audit.unique_floor_keys.saturating_add(floor_count);
                DedupeDecision::Unique
            }
            Some(existing) if existing == fingerprint => {
                self.audit.duplicate_exact_rows = self.audit.duplicate_exact_rows.saturating_add(1);
                self.audit.duplicate_exact_floor_keys = self
                    .audit
                    .duplicate_exact_floor_keys
                    .saturating_add(floor_count);
                inc_str(
                    &mut self.audit.duplicate_exact_by_split,
                    split_name_str(split),
                );
                if self.audit.examples.len() < 50 {
                    self.audit.examples.push(format!(
                        "exact_duplicate stage={} split={} sample_id={} route={} horizon_s={} floor_count={}",
                        self.audit.stage,
                        split_name_str(split),
                        sample_id,
                        route_id,
                        key.horizon_s,
                        floor_count
                    ));
                }
                DedupeDecision::DuplicateExact
            }
            Some(_) => {
                self.audit.duplicate_conflict_rows =
                    self.audit.duplicate_conflict_rows.saturating_add(1);
                self.audit.duplicate_conflict_floor_keys = self
                    .audit
                    .duplicate_conflict_floor_keys
                    .saturating_add(floor_count);
                inc_str(
                    &mut self.audit.duplicate_conflict_by_split,
                    split_name_str(split),
                );
                if self.audit.examples.len() < 50 {
                    self.audit.examples.push(format!(
                        "conflicting_duplicate stage={} split={} sample_id={} route={} horizon_s={} floor_count={}",
                        self.audit.stage,
                        split_name_str(split),
                        sample_id,
                        route_id,
                        key.horizon_s,
                        floor_count
                    ));
                }
                DedupeDecision::DuplicateConflict
            }
        }
    }

    fn into_audit(self) -> DedupeAudit {
        self.audit
    }
}

#[derive(Debug, Clone, Copy)]
struct AggregateUpdate<'a> {
    scope: &'a str,
    route_id: &'a str,
    state_bucket: &'a str,
    horizon_s: u32,
    floor_bp: i32,
    outcome: FloorOutcome,
    label_pi: Option<f32>,
}

#[derive(Debug, Default, Clone)]
struct BootstrapBlockStats {
    n_total: u64,
    event_counts: BTreeMap<u32, u64>,
    censor_before_horizon_counts: BTreeMap<u32, u64>,
}

impl BootstrapBlockStats {
    fn update(&mut self, row: FloorOutcome, horizon_s: u32) {
        self.n_total = self.n_total.saturating_add(1);
        match row.outcome {
            FloorOutcomeKind::Realized => {
                *self.event_counts.entry(row.duration_s).or_insert(0) += 1;
            }
            FloorOutcomeKind::Miss => {}
            FloorOutcomeKind::Censored => {
                if row.duration_s < horizon_s {
                    *self
                        .censor_before_horizon_counts
                        .entry(row.duration_s)
                        .or_insert(0) += 1;
                }
            }
        }
    }

    fn merge_into(
        &self,
        n_total: &mut u64,
        event_counts: &mut BTreeMap<u32, u64>,
        censor_before_horizon_counts: &mut BTreeMap<u32, u64>,
    ) {
        *n_total = n_total.saturating_add(self.n_total);
        for (&duration_s, &count) in &self.event_counts {
            *event_counts.entry(duration_s).or_insert(0) += count;
        }
        for (&duration_s, &count) in &self.censor_before_horizon_counts {
            *censor_before_horizon_counts.entry(duration_s).or_insert(0) += count;
        }
    }
}

#[derive(Debug, Default)]
struct BootstrapAccumulator {
    blocks: BTreeMap<u64, BootstrapBlockStats>,
}

#[derive(Debug, Clone, Copy)]
struct BootstrapInterval {
    lower: f64,
    upper: f64,
    block_s: u64,
    n_blocks: usize,
    n_replicates: usize,
}

impl BootstrapAccumulator {
    fn update(&mut self, block_id: u64, outcome: FloorOutcome, horizon_s: u32) {
        self.blocks
            .entry(block_id)
            .or_default()
            .update(outcome, horizon_s);
    }

    fn interval(&self, seed: u128, point_estimate: f64, block_s: u64) -> Option<BootstrapInterval> {
        let blocks = self.blocks.values().collect::<Vec<_>>();
        if blocks.len() < BLOCK_BOOTSTRAP_MIN_BLOCKS || BLOCK_BOOTSTRAP_REPLICATES == 0 {
            return None;
        }
        let mut samples = Vec::with_capacity(BLOCK_BOOTSTRAP_REPLICATES);
        for rep in 0..BLOCK_BOOTSTRAP_REPLICATES {
            let mut n_total = 0u64;
            let mut event_counts = BTreeMap::<u32, u64>::new();
            let mut censor_counts = BTreeMap::<u32, u64>::new();
            for draw in 0..blocks.len() {
                let idx = bootstrap_sample_index(seed, rep, draw, blocks.len());
                blocks[idx].merge_into(&mut n_total, &mut event_counts, &mut censor_counts);
            }
            if let Some(p) = kaplan_meier_from_parts(n_total, &event_counts, &censor_counts).p_hit {
                samples.push(p);
            }
        }
        if samples.is_empty() {
            return None;
        }
        samples.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let lower = percentile_sorted(&samples, 0.025)
            .min(point_estimate)
            .clamp(0.0, 1.0);
        let upper = percentile_sorted(&samples, 0.975)
            .max(point_estimate)
            .clamp(0.0, 1.0);
        Some(BootstrapInterval {
            lower,
            upper,
            block_s,
            n_blocks: blocks.len(),
            n_replicates: samples.len(),
        })
    }
}

#[derive(Debug, Default)]
struct CalibrationFitAccumulator {
    n_rows: u64,
    n_predicted: u64,
    n_abstained: u64,
    n_complete: u64,
    n_censored: u64,
    buckets: BTreeMap<u64, CalibrationBucket>,
}

impl CalibrationFitAccumulator {
    fn merge_from(&mut self, other: &Self) {
        self.n_rows = self.n_rows.saturating_add(other.n_rows);
        self.n_predicted = self.n_predicted.saturating_add(other.n_predicted);
        self.n_abstained = self.n_abstained.saturating_add(other.n_abstained);
        self.n_complete = self.n_complete.saturating_add(other.n_complete);
        self.n_censored = self.n_censored.saturating_add(other.n_censored);
        for (&key, bucket) in &other.buckets {
            let out = self.buckets.entry(key).or_default();
            out.n = out.n.saturating_add(bucket.n);
            out.hits = out.hits.saturating_add(bucket.hits);
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct CalibrationCellKey {
    prediction_scope: String,
    horizon_s: u32,
    floor_bp: i32,
}

impl CalibrationCellKey {
    fn new(scope: &str, horizon_s: u32, floor_bp: i32) -> Self {
        Self {
            prediction_scope: scope.to_string(),
            horizon_s,
            floor_bp,
        }
    }

    fn as_artifact_key(&self) -> String {
        format!(
            "{}|h{}|floor_bp{}",
            self.prediction_scope, self.horizon_s, self.floor_bp
        )
    }
}

#[derive(Debug, Default, Clone, Copy)]
struct CalibrationBucket {
    n: u64,
    hits: u64,
}

#[derive(Debug, Clone)]
struct IsotonicBlock {
    lower_key: u64,
    upper_key: u64,
    n: u64,
    hits: u64,
    calibrated_p: f64,
}

#[derive(Debug, Clone, Serialize)]
struct CalibrationSuite {
    calibrator_version: String,
    method: String,
    serving_method: String,
    min_complete: u64,
    diagnostic_only: bool,
    censoring_treatment: String,
    cells_total: u64,
    cells_ready: u64,
    cells_not_ready: u64,
    cells_not_ready_examples: Vec<String>,
    scope_models: BTreeMap<String, ScopeCalibrationModel>,
    cells: BTreeMap<String, CalibrationModel>,
}

#[derive(Debug, Clone, Serialize)]
struct ScopeCalibrationModel {
    prediction_scope: String,
    status: String,
    n_rows: u64,
    n_predicted: u64,
    n_abstained: u64,
    n_complete: u64,
    n_censored: u64,
    unique_raw_scores: u64,
    knots: Vec<CalibrationKnot>,
    raw_quality: CalibrationQuality,
    calibrated_quality: CalibrationQuality,
}

#[derive(Debug, Clone, Serialize)]
struct CalibrationModel {
    prediction_scope: String,
    horizon_s: u32,
    floor_pct: f32,
    floor_bp: i32,
    cell_key: String,
    status: String,
    n_rows: u64,
    n_predicted: u64,
    n_abstained: u64,
    n_complete: u64,
    n_censored: u64,
    unique_raw_scores: u64,
    knots: Vec<CalibrationKnot>,
    raw_quality: CalibrationQuality,
    calibrated_quality: CalibrationQuality,
}

#[derive(Debug, Clone, Serialize)]
struct CalibrationKnot {
    raw_lower: f64,
    raw_upper: f64,
    calibrated_p: f64,
    n_complete: u64,
    hits: u64,
}

#[derive(Debug, Clone, Default, Serialize)]
struct CalibrationQuality {
    n_complete: u64,
    brier: Option<f64>,
    ece_10bin: Option<f64>,
    bins: Vec<ScoreBin>,
}

#[derive(Debug, Clone, Copy)]
struct CalibrationApplication {
    probability: f64,
    applied: bool,
}

#[derive(Debug, Clone, Copy)]
struct ServingCurvePoint {
    horizon_s: u32,
    floor_bp: i32,
    probability: Option<f64>,
    ci_lower: Option<f64>,
    ci_upper: Option<f64>,
    p_censor: Option<f64>,
    t_hit_p75_s: Option<u32>,
    n_total: u64,
    n_complete: u64,
    calibration_applied: bool,
}

#[derive(Debug, Clone, Copy)]
struct FirstHitAuditInput {
    hit_idx: usize,
    ts_emit_ns: u64,
    label_window_closed_at_ns: u64,
    entry_locked_pct: f32,
    floor_pct: f32,
}

#[derive(Debug, Serialize, Clone)]
struct EstimatorRow {
    trainer_artifact_version: String,
    model_family: String,
    estimator_method: String,
    aggregation_level: String,
    population_scope: String,
    entity_key: String,
    horizon_s: u32,
    floor_pct: f32,
    n_total: u64,
    n_complete: u64,
    n_realized: u64,
    n_miss: u64,
    n_censored: u64,
    n_eff_sampling: Option<f64>,
    p_hit_km_raw: Option<f64>,
    p_hit_km: Option<f64>,
    p_hit_ci_lower_raw: Option<f64>,
    p_hit_ci_lower: Option<f64>,
    p_hit_ci_upper_raw: Option<f64>,
    p_hit_ci_upper: Option<f64>,
    p_hit_monotonicity_delta: Option<f64>,
    p_hit_monotonicity_adjusted: bool,
    p_hit_calibrated_raw: Option<f64>,
    p_hit_calibration_applied: bool,
    p_hit_serving: Option<f64>,
    p_hit_serving_monotonicity_delta: Option<f64>,
    p_hit_serving_monotonicity_adjusted: bool,
    p_hit_lower_bound: Option<f64>,
    p_hit_complete_naive: Option<f64>,
    p_hit_ipw_complete: Option<f64>,
    p_censor: f64,
    t_hit_conditional_p25_s: Option<u32>,
    t_hit_conditional_p50_s: Option<u32>,
    t_hit_conditional_p75_s: Option<u32>,
    ci_method: String,
    sampling_probability_invalid: u64,
}

#[derive(Debug, Default, Serialize)]
struct DatasetAudit {
    rows_read: u64,
    floor_rows_seen: u64,
    manifests_read: u64,
    source_fact_rows_from_manifest: u64,
    logical_digest_verified_manifests: u64,
    logical_digest_skipped_manifests: u64,
    schema_versions: BTreeMap<u16, u64>,
    runtime_config_hashes: BTreeMap<String, u64>,
    horizons_s: BTreeMap<u32, u64>,
    label_floor_hit_lengths: BTreeMap<u32, u64>,
    floor_values: BTreeMap<String, u64>,
    sample_decisions: BTreeMap<String, u64>,
    outcomes: BTreeMap<String, u64>,
    censor_reasons: BTreeMap<String, u64>,
    sampling_tiers: BTreeMap<String, u64>,
    sampling_probability_kinds: BTreeMap<String, u64>,
    effective_stride_s: BTreeMap<u32, u64>,
    feature_null_counts: BTreeMap<String, u64>,
    feature_nonfinite_counts: BTreeMap<String, u64>,
    split_rows: BTreeMap<String, u64>,
    trainer_supervised_digest_kind: String,
    trainer_supervised_digest_hex: String,
    trainer_supervised_digest_rows: u64,
    issues: Vec<String>,
    issues_truncated: u64,
}

#[derive(Debug, Default, Clone, Serialize)]
struct AggregateBuildStats {
    groups_total: u64,
    prediction_eligible_groups: u64,
    groups_below_min_support: u64,
    groups_without_p_hit: u64,
    groups_by_level: BTreeMap<String, u64>,
    prediction_eligible_by_level: BTreeMap<String, u64>,
}

#[derive(Debug, Clone, Serialize)]
struct BootstrapIntervalAudit {
    enabled: bool,
    method: String,
    fallback_method: String,
    block_s: u64,
    block_s_policy: String,
    min_blocks: usize,
    requested_replicates: usize,
    eligible_rows: u64,
    ready_rows: u64,
    fallback_rows: u64,
    missing_accumulator_rows: u64,
    insufficient_block_rows: u64,
    min_observed_block_s: Option<u64>,
    max_observed_block_s: Option<u64>,
    min_observed_blocks: Option<usize>,
    max_observed_blocks: Option<usize>,
    min_replicates_used: Option<usize>,
    max_replicates_used: Option<usize>,
    examples: Vec<String>,
}

impl Default for BootstrapIntervalAudit {
    fn default() -> Self {
        Self {
            enabled: true,
            method: CI_METHOD.to_string(),
            fallback_method: FALLBACK_CI_METHOD.to_string(),
            block_s: BLOCK_BOOTSTRAP_MIN_BLOCK_S,
            block_s_policy: "max(bootstrap_min_block_s,horizon_s)".to_string(),
            min_blocks: BLOCK_BOOTSTRAP_MIN_BLOCKS,
            requested_replicates: BLOCK_BOOTSTRAP_REPLICATES,
            eligible_rows: 0,
            ready_rows: 0,
            fallback_rows: 0,
            missing_accumulator_rows: 0,
            insufficient_block_rows: 0,
            min_observed_block_s: None,
            max_observed_block_s: None,
            min_observed_blocks: None,
            max_observed_blocks: None,
            min_replicates_used: None,
            max_replicates_used: None,
            examples: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
struct PublicIntervalAudit {
    enabled: bool,
    probability_field: String,
    interval_fields: Vec<String>,
    checked_rows: u64,
    missing_probability_rows: u64,
    missing_interval_rows: u64,
    outside_interval_rows: u64,
    max_below_lower: f64,
    max_above_upper: f64,
    examples: Vec<String>,
}

impl Default for PublicIntervalAudit {
    fn default() -> Self {
        Self {
            enabled: true,
            probability_field: "p_hit_serving".to_string(),
            interval_fields: vec!["p_hit_ci_lower".to_string(), "p_hit_ci_upper".to_string()],
            checked_rows: 0,
            missing_probability_rows: 0,
            missing_interval_rows: 0,
            outside_interval_rows: 0,
            max_below_lower: 0.0,
            max_above_upper: 0.0,
            examples: Vec::new(),
        }
    }
}

#[derive(Debug, Default, Serialize)]
struct ScoreStats {
    prediction_scope: String,
    prediction_method: String,
    state_bucket_version: String,
    probability_kind: String,
    calibrator_version: Option<String>,
    calibration_status: Option<String>,
    calibration_n_complete: Option<u64>,
    n_calibrated: u64,
    n_raw_fallback: u64,
    decision_threshold: f64,
    shrinkage_k: f64,
    n_rows: u64,
    n_complete: u64,
    n_predicted: u64,
    n_abstained: u64,
    n_above_threshold_complete: u64,
    hits_above_threshold: u64,
    brier: Option<f64>,
    ece_10bin: Option<f64>,
    precision_at_threshold: Option<f64>,
    bins: Vec<ScoreBin>,
}

#[derive(Debug, Clone, Serialize)]
struct ExitPolicyReplayReport {
    enabled: bool,
    policy_name: String,
    policy_version: String,
    prediction_scope: String,
    split: String,
    source_probability_field: String,
    min_gross_floor_pct: f64,
    min_p_hit: f64,
    max_p_censor: f64,
    max_p_hit_interval_width: f64,
    max_t_hit_conditional_p75_s: u32,
    utility_formula: String,
    candidate_grid_floors_bp: Vec<i32>,
    candidate_grid_horizons_s: Vec<u32>,
    canonical_selection_horizon_s: u32,
    canonical_rows_seen: u64,
    candidates_scored: u64,
    selected: u64,
    abstained_no_candidate: u64,
    evaluated: u64,
    complete: u64,
    realized: u64,
    miss: u64,
    censored: u64,
    selected_not_evaluated: u64,
    selected_floor_missing: u64,
    gross_precision_complete: Option<f64>,
    gross_realized_rate_all_evaluated: Option<f64>,
    censor_rate_evaluated: Option<f64>,
    mean_selected_p_hit: Option<f64>,
    mean_selected_gross_floor_pct: Option<f64>,
    mean_selected_utility_score: Option<f64>,
    selected_by_horizon_s: BTreeMap<u32, u64>,
    selected_by_floor_bp: BTreeMap<i32, u64>,
    evaluated_by_horizon_s: BTreeMap<u32, u64>,
    evaluated_by_floor_bp: BTreeMap<i32, u64>,
    gate_fail_counts: BTreeMap<String, u64>,
    examples: Vec<String>,
    #[serde(skip)]
    selected_p_hit_sum: f64,
    #[serde(skip)]
    selected_gross_floor_sum: f64,
    #[serde(skip)]
    selected_utility_sum: f64,
}

impl Default for ExitPolicyReplayReport {
    fn default() -> Self {
        Self {
            enabled: true,
            policy_name: EXIT_POLICY_NAME.to_string(),
            policy_version: EXIT_POLICY_VERSION.to_string(),
            prediction_scope: PredictionScope::Accept.as_str().to_string(),
            split: "test".to_string(),
            source_probability_field: "p_hit_serving".to_string(),
            min_gross_floor_pct: EXIT_POLICY_MIN_GROSS_FLOOR_PCT,
            min_p_hit: EXIT_POLICY_MIN_P_HIT,
            max_p_censor: EXIT_POLICY_MAX_P_CENSOR,
            max_p_hit_interval_width: EXIT_POLICY_MAX_P_HIT_INTERVAL_WIDTH,
            max_t_hit_conditional_p75_s: EXIT_POLICY_MAX_T_HIT_P75_S,
            utility_formula:
                "gross_floor_pct*p_hit - p_censor - 0.10*(interval_width/max_interval_width) - 0.05*(t_hit_p75_s/max_t_hit_p75_s)"
                    .to_string(),
            candidate_grid_floors_bp: EXPECTED_FLOOR_BP.to_vec(),
            candidate_grid_horizons_s: EXPECTED_HORIZONS_S.to_vec(),
            canonical_selection_horizon_s: EXPECTED_HORIZONS_S[0],
            canonical_rows_seen: 0,
            candidates_scored: 0,
            selected: 0,
            abstained_no_candidate: 0,
            evaluated: 0,
            complete: 0,
            realized: 0,
            miss: 0,
            censored: 0,
            selected_not_evaluated: 0,
            selected_floor_missing: 0,
            gross_precision_complete: None,
            gross_realized_rate_all_evaluated: None,
            censor_rate_evaluated: None,
            mean_selected_p_hit: None,
            mean_selected_gross_floor_pct: None,
            mean_selected_utility_score: None,
            selected_by_horizon_s: BTreeMap::new(),
            selected_by_floor_bp: BTreeMap::new(),
            evaluated_by_horizon_s: BTreeMap::new(),
            evaluated_by_floor_bp: BTreeMap::new(),
            gate_fail_counts: BTreeMap::new(),
            examples: Vec::new(),
            selected_p_hit_sum: 0.0,
            selected_gross_floor_sum: 0.0,
            selected_utility_sum: 0.0,
        }
    }
}

#[derive(Debug, Clone)]
struct PolicyCandidate {
    horizon_s: u32,
    floor_bp: i32,
    gross_floor_pct: f64,
    exit_target_pct: f64,
    p_hit: f64,
    ci_lower: f64,
    ci_upper: f64,
    p_censor: f64,
    t_hit_p75_s: u32,
    n_total: u64,
    n_complete: u64,
    utility_score: f64,
}

#[derive(Debug, Clone)]
struct SelectedPolicyDecision {
    candidate: PolicyCandidate,
}

#[derive(Debug, Default, Clone, Serialize)]
struct ScoreBin {
    bin_lower: f64,
    bin_upper: f64,
    n: u64,
    mean_predicted: Option<f64>,
    empirical_hit_rate: Option<f64>,
}

#[derive(Debug, Default)]
struct ScoreAccumulator {
    stats: ScoreStats,
    brier_sum: f64,
    bins: [BinAccumulator; 10],
}

#[derive(Debug, Default, Clone, Copy)]
struct BinAccumulator {
    n: u64,
    pred_sum: f64,
    hit_sum: f64,
}

impl ScoreAccumulator {
    fn new(
        prediction_scope: String,
        decision_threshold: f64,
        shrinkage_k: f64,
        calibration_status: String,
        calibration_n_complete: u64,
    ) -> Self {
        let probability_kind = if calibration_status == "ok" {
            "scope_pooled_isotonic_cell_ready_shape_preserving"
        } else {
            "mixed_scope_pooled_cell_ready_or_raw_fallback"
        }
        .to_string();
        Self {
            stats: ScoreStats {
                prediction_scope,
                prediction_method: PREDICTION_METHOD.to_string(),
                state_bucket_version: STATE_BUCKET_VERSION.to_string(),
                probability_kind,
                calibrator_version: Some(CALIBRATOR_VERSION.to_string()),
                calibration_status: Some(calibration_status),
                calibration_n_complete: Some(calibration_n_complete),
                decision_threshold,
                shrinkage_k,
                ..ScoreStats::default()
            },
            ..ScoreAccumulator::default()
        }
    }

    fn observe(&mut self, prediction: Option<CalibrationApplication>, outcome: FloorOutcomeKind) {
        self.stats.n_rows = self.stats.n_rows.saturating_add(1);
        let Some(prediction) = prediction else {
            self.stats.n_abstained = self.stats.n_abstained.saturating_add(1);
            return;
        };
        let p = prediction.probability;
        if prediction.applied {
            self.stats.n_calibrated = self.stats.n_calibrated.saturating_add(1);
        } else {
            self.stats.n_raw_fallback = self.stats.n_raw_fallback.saturating_add(1);
        }
        self.stats.n_predicted = self.stats.n_predicted.saturating_add(1);
        if outcome == FloorOutcomeKind::Censored {
            return;
        }

        self.stats.n_complete = self.stats.n_complete.saturating_add(1);
        let y = if outcome == FloorOutcomeKind::Realized {
            1.0
        } else {
            0.0
        };
        let err = p - y;
        self.brier_sum += err * err;
        let bin = ((p * 10.0).floor() as usize).min(9);
        self.bins[bin].n = self.bins[bin].n.saturating_add(1);
        self.bins[bin].pred_sum += p;
        self.bins[bin].hit_sum += y;
        if p >= self.stats.decision_threshold {
            self.stats.n_above_threshold_complete =
                self.stats.n_above_threshold_complete.saturating_add(1);
            if outcome == FloorOutcomeKind::Realized {
                self.stats.hits_above_threshold = self.stats.hits_above_threshold.saturating_add(1);
            }
        }
    }

    fn finalize(mut self) -> ScoreStats {
        if self.stats.n_complete > 0 {
            self.stats.brier = Some(self.brier_sum / self.stats.n_complete as f64);
        }
        if self.stats.n_above_threshold_complete > 0 {
            self.stats.precision_at_threshold = Some(
                self.stats.hits_above_threshold as f64
                    / self.stats.n_above_threshold_complete as f64,
            );
        }

        let mut ece = 0.0;
        let mut bins = Vec::with_capacity(10);
        for idx in 0..10 {
            let acc = self.bins[idx];
            let (mean_predicted, empirical_hit_rate) = if acc.n > 0 {
                let mean = acc.pred_sum / acc.n as f64;
                let hit = acc.hit_sum / acc.n as f64;
                ece += (acc.n as f64 / self.stats.n_complete.max(1) as f64) * (mean - hit).abs();
                (Some(mean), Some(hit))
            } else {
                (None, None)
            };
            bins.push(ScoreBin {
                bin_lower: idx as f64 / 10.0,
                bin_upper: (idx + 1) as f64 / 10.0,
                n: acc.n,
                mean_predicted,
                empirical_hit_rate,
            });
        }
        if self.stats.n_complete > 0 {
            self.stats.ece_10bin = Some(ece);
        }
        self.stats.bins = bins;
        self.stats
    }
}

impl CalibrationFitAccumulator {
    fn observe(&mut self, prediction: Option<f64>, outcome: FloorOutcomeKind) {
        self.n_rows = self.n_rows.saturating_add(1);
        let Some(p) = prediction else {
            self.n_abstained = self.n_abstained.saturating_add(1);
            return;
        };
        self.n_predicted = self.n_predicted.saturating_add(1);
        if outcome == FloorOutcomeKind::Censored {
            self.n_censored = self.n_censored.saturating_add(1);
            return;
        }
        self.n_complete = self.n_complete.saturating_add(1);
        let key = probability_key(p);
        let bucket = self.buckets.entry(key).or_default();
        bucket.n = bucket.n.saturating_add(1);
        if outcome == FloorOutcomeKind::Realized {
            bucket.hits = bucket.hits.saturating_add(1);
        }
    }
}

impl CalibrationSuite {
    fn from_accumulators(
        scopes: &[PredictionScope],
        mut accumulators: BTreeMap<CalibrationCellKey, CalibrationFitAccumulator>,
        min_complete: u64,
    ) -> Self {
        for scope in scopes {
            for &horizon_s in EXPECTED_HORIZONS_S {
                for &floor_bp in EXPECTED_FLOOR_BP {
                    accumulators
                        .entry(CalibrationCellKey::new(scope.as_str(), horizon_s, floor_bp))
                        .or_default();
                }
            }
        }
        let mut scope_accumulators = BTreeMap::<String, CalibrationFitAccumulator>::new();
        for (key, acc) in &accumulators {
            scope_accumulators
                .entry(key.prediction_scope.clone())
                .or_default()
                .merge_from(acc);
        }
        let scope_models = scope_accumulators
            .into_iter()
            .map(|(scope, acc)| {
                (
                    scope.clone(),
                    ScopeCalibrationModel::fit(scope, acc, min_complete),
                )
            })
            .collect::<BTreeMap<_, _>>();
        let cells = accumulators
            .into_iter()
            .map(|(key, acc)| {
                let artifact_key = key.as_artifact_key();
                let model = CalibrationModel::fit(key, acc, min_complete);
                (artifact_key, model)
            })
            .collect::<BTreeMap<_, _>>();
        let cells_total = cells.len() as u64;
        let cells_ready = cells.values().filter(|model| model.status == "ok").count() as u64;
        let cells_not_ready = cells_total.saturating_sub(cells_ready);
        let cells_not_ready_examples = cells
            .values()
            .filter(|model| model.status != "ok")
            .take(20)
            .map(|model| {
                format!(
                    "{} h={} floor_bp={} n_complete={}",
                    model.prediction_scope, model.horizon_s, model.floor_bp, model.n_complete
                )
            })
            .collect();
        let diagnostic_only = cells_not_ready > 0;
        Self {
            calibrator_version: CALIBRATOR_VERSION.to_string(),
            method: CALIBRATOR_METHOD.to_string(),
            serving_method: SERVING_CALIBRATOR_METHOD.to_string(),
            min_complete,
            diagnostic_only,
            censoring_treatment:
                "complete_case_for_calibration_only; censored_rows_excluded_from_fit".to_string(),
            cells_total,
            cells_ready,
            cells_not_ready,
            cells_not_ready_examples,
            scope_models,
            cells,
        }
    }

    fn model(&self, scope: &str, horizon_s: u32, floor_bp: i32) -> Option<&CalibrationModel> {
        self.cells
            .get(&CalibrationCellKey::new(scope, horizon_s, floor_bp).as_artifact_key())
    }

    fn scope_status(&self, scope: &str) -> (&'static str, u64) {
        let mut complete = 0u64;
        let mut not_ready = 0u64;
        for model in self
            .cells
            .values()
            .filter(|model| model.prediction_scope == scope)
        {
            complete = complete.saturating_add(model.n_complete);
            if model.status != "ok" {
                not_ready = not_ready.saturating_add(1);
            }
        }
        if not_ready == 0 {
            ("ok", complete)
        } else {
            ("partial_cell_support", complete)
        }
    }

    fn calibrate(
        &self,
        scope: &str,
        horizon_s: u32,
        floor_bp: i32,
        raw_p: f64,
    ) -> CalibrationApplication {
        let cell_ready = self
            .model(scope, horizon_s, floor_bp)
            .map(|model| model.status == "ok")
            .unwrap_or(false);
        match (cell_ready, self.scope_models.get(scope)) {
            (true, Some(model)) if model.status == "ok" => CalibrationApplication {
                probability: model.calibrate(raw_p),
                applied: true,
            },
            _ => CalibrationApplication {
                probability: raw_p.clamp(0.0, 1.0),
                applied: false,
            },
        }
    }
}

impl ScopeCalibrationModel {
    fn fit(scope: String, acc: CalibrationFitAccumulator, min_complete: u64) -> Self {
        let raw_quality = calibration_quality(&acc.buckets, None);
        let blocks = fit_isotonic_blocks(&acc.buckets);
        let knots = blocks
            .iter()
            .map(|block| CalibrationKnot {
                raw_lower: probability_from_key(block.lower_key),
                raw_upper: probability_from_key(block.upper_key),
                calibrated_p: block.calibrated_p,
                n_complete: block.n,
                hits: block.hits,
            })
            .collect::<Vec<_>>();
        let status = if acc.n_complete >= min_complete && !knots.is_empty() {
            "ok"
        } else {
            "insufficient_calibration_support"
        }
        .to_string();
        let calibrated_quality = calibration_quality(&acc.buckets, Some(&knots));
        Self {
            prediction_scope: scope,
            status,
            n_rows: acc.n_rows,
            n_predicted: acc.n_predicted,
            n_abstained: acc.n_abstained,
            n_complete: acc.n_complete,
            n_censored: acc.n_censored,
            unique_raw_scores: acc.buckets.len() as u64,
            knots,
            raw_quality,
            calibrated_quality,
        }
    }

    fn calibrate(&self, raw_p: f64) -> f64 {
        if self.status != "ok" || self.knots.is_empty() {
            return raw_p.clamp(0.0, 1.0);
        }
        let p = raw_p.clamp(0.0, 1.0);
        for knot in &self.knots {
            if p <= knot.raw_upper {
                return knot.calibrated_p;
            }
        }
        self.knots.last().map(|knot| knot.calibrated_p).unwrap_or(p)
    }
}

impl CalibrationModel {
    fn fit(key: CalibrationCellKey, acc: CalibrationFitAccumulator, min_complete: u64) -> Self {
        let raw_quality = calibration_quality(&acc.buckets, None);
        let blocks = fit_isotonic_blocks(&acc.buckets);
        let knots = blocks
            .iter()
            .map(|block| CalibrationKnot {
                raw_lower: probability_from_key(block.lower_key),
                raw_upper: probability_from_key(block.upper_key),
                calibrated_p: block.calibrated_p,
                n_complete: block.n,
                hits: block.hits,
            })
            .collect::<Vec<_>>();
        let status = if acc.n_complete >= min_complete && !knots.is_empty() {
            "ok"
        } else {
            "insufficient_calibration_support"
        }
        .to_string();
        let calibrated_quality = calibration_quality(&acc.buckets, Some(&knots));
        Self {
            prediction_scope: key.prediction_scope.clone(),
            horizon_s: key.horizon_s,
            floor_pct: key.floor_bp as f32 / 100.0,
            floor_bp: key.floor_bp,
            cell_key: key.as_artifact_key(),
            status,
            n_rows: acc.n_rows,
            n_predicted: acc.n_predicted,
            n_abstained: acc.n_abstained,
            n_complete: acc.n_complete,
            n_censored: acc.n_censored,
            unique_raw_scores: acc.buckets.len() as u64,
            knots,
            raw_quality,
            calibrated_quality,
        }
    }

    #[cfg(test)]
    fn calibrate(&self, raw_p: f64) -> f64 {
        if self.status != "ok" || self.knots.is_empty() {
            return raw_p.clamp(0.0, 1.0);
        }
        let p = raw_p.clamp(0.0, 1.0);
        for knot in &self.knots {
            if p <= knot.raw_upper {
                return knot.calibrated_p;
            }
        }
        self.knots.last().map(|knot| knot.calibrated_p).unwrap_or(p)
    }
}

#[derive(Debug, Serialize)]
struct TrainerManifest {
    trainer_version: String,
    model_family: String,
    output_contract_version: String,
    prediction_method: String,
    state_bucket_version: String,
    trainer_run_id: String,
    input: String,
    out_dir: String,
    generated_at_unix_s: u64,
    manifests: usize,
    max_manifests: Option<usize>,
    max_rows: Option<u64>,
    min_support: u64,
    prediction_scope: String,
    shrinkage_k: f64,
    temporal_split: TemporalSplit,
    source_manifests: Vec<SourceManifestSummary>,
    estimator_rows: usize,
    aggregate_build_stats: AggregateBuildStats,
    bootstrap_interval_audit: BootstrapIntervalAudit,
    calibration: CalibrationSuite,
    dedupe_audit: DedupeReport,
    monotonicity_projection: MonotonicityProjectionAudit,
    monotonicity_audit: MonotonicityAudit,
    serving_probability_projection: MonotonicityProjectionAudit,
    serving_monotonicity_audit: MonotonicityAudit,
    public_interval_audit: PublicIntervalAudit,
    exit_policy_replay: ExitPolicyReplayReport,
    promotion_allowed: bool,
    promotion_blockers: Vec<String>,
    artifacts: BTreeMap<String, ArtifactInfo>,
}

#[derive(Debug, Serialize)]
struct ContractOutputMapping {
    output_contract_version: String,
    serving_mode: String,
    candidate_curve_p_hit_source: String,
    primary_setup_p_hit_source: String,
    p_hit_interval_source: String,
    public_probability_field: String,
    intermediate_probability_fields_not_public: Vec<String>,
    promotion_requires: Vec<String>,
}

#[derive(Debug, Serialize)]
struct CorpusManifest {
    storage_contract: String,
    logical_dataset: String,
    output_contract_version: String,
    trainer_version: String,
    trainer_run_id: String,
    manifests: usize,
    source_fact_rows_total: u64,
    min_timestamp_ns: Option<u64>,
    max_timestamp_ns: Option<u64>,
    expected_floor_bp: Vec<i32>,
    expected_horizons_s: Vec<u32>,
    sample_id_algorithm_versions: Vec<String>,
    route_dim_key_policies: Vec<String>,
    source_manifests: Vec<SourceManifestSummary>,
}

#[derive(Debug, Clone, Serialize)]
struct SourceManifestSummary {
    manifest_path: String,
    manifest_digest_kind: String,
    manifest_digest_hex: String,
    dataset_kind: String,
    schema_version: u16,
    source_row_count: u64,
    fact_row_count: u64,
    route_dim_row_count: u64,
    fact_file_bytes: u64,
    route_dim_file_bytes: u64,
    min_timestamp_ns: Option<u64>,
    max_timestamp_ns: Option<u64>,
    logical_required_digest_kind: String,
    logical_required_digest_hex: String,
    sample_id_algorithm_version: String,
    route_dim_key_policy: String,
    virtualized_columns: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
struct ArtifactInfo {
    path: String,
    bytes: u64,
    digest_kind: String,
    digest_hex: String,
}

#[derive(Debug, Clone, Default, Serialize)]
struct MonotonicityAudit {
    checked_curves: u64,
    horizon_monotonicity_violations: u64,
    floor_monotonicity_violations: u64,
    probability_field: String,
    examples: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
struct MonotonicityProjectionAudit {
    enabled: bool,
    method: String,
    max_iterations: u32,
    tolerance: f64,
    checked_curves: u64,
    adjusted_curves: u64,
    rows_seen: u64,
    rows_adjusted: u64,
    uncalibrated_rows_adjusted: u64,
    max_iterations_used: u32,
    max_abs_delta: f64,
    mean_abs_delta: f64,
    p95_abs_delta: f64,
    total_abs_delta: f64,
    max_uncalibrated_abs_delta: f64,
    mean_uncalibrated_abs_delta: f64,
    p95_uncalibrated_abs_delta: f64,
    total_uncalibrated_abs_delta: f64,
    examples: Vec<String>,
    uncalibrated_examples: Vec<String>,
}

impl Default for MonotonicityProjectionAudit {
    fn default() -> Self {
        Self {
            enabled: true,
            method: MONOTONICITY_PROJECTION_METHOD.to_string(),
            max_iterations: MONOTONICITY_PROJECTION_MAX_ITERATIONS,
            tolerance: MONOTONICITY_PROJECTION_TOLERANCE,
            checked_curves: 0,
            adjusted_curves: 0,
            rows_seen: 0,
            rows_adjusted: 0,
            uncalibrated_rows_adjusted: 0,
            max_iterations_used: 0,
            max_abs_delta: 0.0,
            mean_abs_delta: 0.0,
            p95_abs_delta: 0.0,
            total_abs_delta: 0.0,
            max_uncalibrated_abs_delta: 0.0,
            mean_uncalibrated_abs_delta: 0.0,
            p95_uncalibrated_abs_delta: 0.0,
            total_uncalibrated_abs_delta: 0.0,
            examples: Vec::new(),
            uncalibrated_examples: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct KmEstimate {
    p_hit: Option<f64>,
    ci_lower: Option<f64>,
    ci_upper: Option<f64>,
}

pub fn run(cli: Cli) -> Result<()> {
    validate_cli(&cli)?;

    let trainer_run_id = cli.run_id.clone().unwrap_or_else(default_run_id);
    let out_dir = cli
        .out_dir
        .clone()
        .unwrap_or_else(|| default_out_dir(&trainer_run_id));
    prepare_out_dir(&out_dir, cli.overwrite)?;

    let mut manifests = collect_manifest_records(&cli.input)?;
    manifests.sort_by(|a, b| {
        a.manifest
            .min_timestamp_ns
            .cmp(&b.manifest.min_timestamp_ns)
            .then_with(|| a.path.cmp(&b.path))
    });
    if let Some(max) = cli.max_manifests {
        manifests.truncate(max);
    }
    if manifests.is_empty() {
        bail!(
            "no labeled_trades storage_v2 manifests found under {}",
            cli.input.display()
        );
    }
    validate_manifests(&mut manifests)?;
    let split = temporal_split(&manifests, &cli)?;

    let mut audit = DatasetAudit::default();
    let mut aggregates = HashMap::<AggregationKey, GroupStats>::new();
    let mut training_dedupe = DedupeTracker::new("training_aggregation");
    process_training_pass(
        &manifests,
        &split,
        &cli,
        &mut audit,
        &mut aggregates,
        &mut training_dedupe,
    )?;
    let training_dedupe_audit = training_dedupe.into_audit();

    let (mut estimator_rows, aggregate_build_stats) =
        build_prediction_surface(&aggregates, cli.min_support);
    let mut bootstrap_dedupe = DedupeTracker::new("bootstrap_interval");
    let bootstrap_interval_audit = process_bootstrap_interval_pass(
        &manifests,
        &split,
        &cli,
        &mut estimator_rows,
        &mut bootstrap_dedupe,
    )?;
    let bootstrap_dedupe_audit = bootstrap_dedupe.into_audit();
    let monotonicity_projection = apply_monotonicity_projection(&mut estimator_rows);
    let raw_index = build_prediction_index(&estimator_rows);
    let mut calibration_dedupe = DedupeTracker::new("calibration_fit");
    let calibration_suite = process_calibration_pass(
        &manifests,
        &split,
        &cli,
        &raw_index,
        &mut calibration_dedupe,
    )?;
    let calibration_dedupe_audit = calibration_dedupe.into_audit();
    let serving_probability_projection =
        apply_serving_probability_projection(&mut estimator_rows, &calibration_suite);
    let serving_index = build_prediction_index(&estimator_rows);
    let mut scoring_dedupe = DedupeTracker::new("scoring_scorecard");
    let scorecards = process_scoring_pass(
        &manifests,
        &split,
        &cli,
        &serving_index,
        &calibration_suite,
        &mut scoring_dedupe,
    )?;
    let scoring_dedupe_audit = scoring_dedupe.into_audit();
    let exit_policy_replay =
        process_exit_policy_replay(&manifests, &split, &cli, &serving_index, &calibration_suite)?;
    let dedupe_report = DedupeReport {
        training_aggregation: training_dedupe_audit,
        bootstrap_interval: bootstrap_dedupe_audit,
        calibration_fit: calibration_dedupe_audit,
        scoring_scorecard: scoring_dedupe_audit,
    };

    let monotonicity_audit = monotonicity_audit(&estimator_rows);
    let serving_monotonicity_audit = serving_monotonicity_audit(&estimator_rows);
    let public_interval_audit = audit_public_interval_alignment(&estimator_rows);
    let promotion_blockers = promotion_blockers(
        &audit,
        &dedupe_report,
        &bootstrap_interval_audit,
        &public_interval_audit,
        &calibration_suite,
        &scorecards,
        &monotonicity_audit,
        &serving_probability_projection,
        &serving_monotonicity_audit,
        split,
        cli.max_manifests,
        cli.max_rows,
    );
    let promotion_allowed = promotion_blockers.is_empty();

    let estimator_path = out_dir.join("estimator_table.jsonl");
    let estimator_artifact = write_jsonl(&estimator_path, &estimator_rows)?;
    let audit_path = out_dir.join("dataset_audit.json");
    let audit_artifact = write_json(&audit_path, &audit)?;
    let scorecard_path = out_dir.join("scorecard.json");
    let scorecard_artifact = write_json(&scorecard_path, &scorecards)?;
    let exit_policy_replay_path = out_dir.join("exit_policy_replay.json");
    let exit_policy_replay_artifact = write_json(&exit_policy_replay_path, &exit_policy_replay)?;
    let calibration_path = out_dir.join("calibration_model.json");
    let calibration_artifact = write_json(&calibration_path, &calibration_suite)?;
    let dedupe_path = out_dir.join("duplicate_audit.json");
    let dedupe_artifact = write_json(&dedupe_path, &dedupe_report)?;
    let bootstrap_interval_path = out_dir.join("bootstrap_interval_audit.json");
    let bootstrap_interval_artifact =
        write_json(&bootstrap_interval_path, &bootstrap_interval_audit)?;
    let monotonicity_projection_path = out_dir.join("monotonicity_projection.json");
    let monotonicity_projection_artifact =
        write_json(&monotonicity_projection_path, &monotonicity_projection)?;
    let serving_probability_projection_path = out_dir.join("serving_probability_projection.json");
    let serving_probability_projection_artifact = write_json(
        &serving_probability_projection_path,
        &serving_probability_projection,
    )?;
    let public_interval_path = out_dir.join("public_interval_audit.json");
    let public_interval_artifact = write_json(&public_interval_path, &public_interval_audit)?;
    let serving_monotonicity_path = out_dir.join("serving_monotonicity_audit.json");
    let serving_monotonicity_artifact =
        write_json(&serving_monotonicity_path, &serving_monotonicity_audit)?;
    let sources_path = out_dir.join("sources.jsonl");
    let source_summaries = source_manifest_summaries(&manifests)?;
    let sources_artifact = write_jsonl(&sources_path, &source_summaries)?;
    let corpus_manifest = build_corpus_manifest(&manifests, &source_summaries, &trainer_run_id);
    let corpus_manifest_path = out_dir.join("corpus_manifest.json");
    let corpus_manifest_artifact = write_json(&corpus_manifest_path, &corpus_manifest)?;
    let contract_output_mapping = build_contract_output_mapping();
    let contract_output_mapping_path = out_dir.join("contract_output_mapping.json");
    let contract_output_mapping_artifact =
        write_json(&contract_output_mapping_path, &contract_output_mapping)?;

    let mut artifacts = BTreeMap::new();
    artifacts.insert("estimator_table".to_string(), estimator_artifact);
    artifacts.insert("dataset_audit".to_string(), audit_artifact);
    artifacts.insert("scorecard".to_string(), scorecard_artifact);
    artifacts.insert(
        "exit_policy_replay".to_string(),
        exit_policy_replay_artifact,
    );
    artifacts.insert("calibration_model".to_string(), calibration_artifact);
    artifacts.insert("duplicate_audit".to_string(), dedupe_artifact);
    artifacts.insert(
        "bootstrap_interval_audit".to_string(),
        bootstrap_interval_artifact,
    );
    artifacts.insert(
        "monotonicity_projection".to_string(),
        monotonicity_projection_artifact,
    );
    artifacts.insert(
        "serving_probability_projection".to_string(),
        serving_probability_projection_artifact,
    );
    artifacts.insert(
        "public_interval_audit".to_string(),
        public_interval_artifact,
    );
    artifacts.insert(
        "serving_monotonicity_audit".to_string(),
        serving_monotonicity_artifact,
    );
    artifacts.insert("sources".to_string(), sources_artifact);
    artifacts.insert("corpus_manifest".to_string(), corpus_manifest_artifact);
    artifacts.insert(
        "contract_output_mapping".to_string(),
        contract_output_mapping_artifact,
    );

    let manifest = TrainerManifest {
        trainer_version: TRAINER_VERSION.to_string(),
        model_family: MODEL_FAMILY.to_string(),
        output_contract_version: OUTPUT_CONTRACT_VERSION.to_string(),
        prediction_method: PREDICTION_METHOD.to_string(),
        state_bucket_version: STATE_BUCKET_VERSION.to_string(),
        trainer_run_id,
        input: cli.input.display().to_string(),
        out_dir: out_dir.display().to_string(),
        generated_at_unix_s: unix_s(),
        manifests: manifests.len(),
        max_manifests: cli.max_manifests,
        max_rows: cli.max_rows,
        min_support: cli.min_support,
        prediction_scope: cli.prediction_scope.as_str().to_string(),
        shrinkage_k: cli.shrinkage_k,
        temporal_split: split,
        source_manifests: source_summaries,
        estimator_rows: estimator_rows.len(),
        aggregate_build_stats,
        bootstrap_interval_audit,
        calibration: calibration_suite,
        dedupe_audit: dedupe_report,
        monotonicity_projection,
        monotonicity_audit,
        serving_probability_projection,
        serving_monotonicity_audit,
        public_interval_audit,
        exit_policy_replay,
        promotion_allowed,
        promotion_blockers,
        artifacts,
    };
    let manifest_path = out_dir.join("trainer_manifest.json");
    let manifest_artifact = write_json(&manifest_path, &manifest)?;
    write_success_marker(&out_dir, &manifest_artifact)?;

    println!(
        "trainer={} manifests={} rows_read={} estimator_rows={} promotion_allowed={} out={}",
        TRAINER_VERSION,
        manifests.len(),
        audit.rows_read,
        estimator_rows.len(),
        manifest.promotion_allowed,
        out_dir.display()
    );
    Ok(())
}

fn validate_cli(cli: &Cli) -> Result<()> {
    if !(0.0..1.0).contains(&cli.train_frac) {
        bail!("--train-frac must be in (0,1)");
    }
    if !(0.0..1.0).contains(&cli.calibration_frac) {
        bail!("--calibration-frac must be in (0,1)");
    }
    if cli.train_frac + cli.calibration_frac >= 1.0 {
        bail!("train_frac + calibration_frac must be < 1");
    }
    if !(0.0..=1.0).contains(&cli.decision_threshold) {
        bail!("--decision-threshold must be in [0,1]");
    }
    if !cli.shrinkage_k.is_finite() || cli.shrinkage_k <= 0.0 {
        bail!("--shrinkage-k must be finite and > 0");
    }
    Ok(())
}

fn collect_manifest_records(input: &Path) -> Result<Vec<ManifestRecord>> {
    let paths = if input.is_file() {
        vec![input.to_path_buf()]
    } else {
        let mut out = Vec::new();
        collect_manifest_paths(input, &mut out)?;
        out
    };
    let mut records = Vec::with_capacity(paths.len());
    for path in paths {
        let file = File::open(&path).with_context(|| format!("open {}", path.display()))?;
        let manifest: StorageV2SidecarManifest =
            serde_json::from_reader(file).with_context(|| format!("read {}", path.display()))?;
        records.push(ManifestRecord { path, manifest });
    }
    Ok(records)
}

fn collect_manifest_paths(root: &Path, out: &mut Vec<PathBuf>) -> Result<()> {
    if !root.exists() {
        bail!("input path does not exist: {}", root.display());
    }
    for entry in fs::read_dir(root).with_context(|| format!("read_dir {}", root.display()))? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_manifest_paths(&path, out)?;
        } else if path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.ends_with(".storage_v2.manifest.json"))
        {
            out.push(path);
        }
    }
    Ok(())
}

fn validate_manifests(manifests: &mut [ManifestRecord]) -> Result<()> {
    let mut sample_id_algorithms = BTreeSet::new();
    let mut route_dim_policies = BTreeSet::new();
    for rec in manifests {
        if rec.manifest.dataset_kind != DatasetKind::LabeledTrades.as_str() {
            bail!(
                "{}: expected dataset_kind=labeled_trades, got {}",
                rec.path.display(),
                rec.manifest.dataset_kind
            );
        }
        if rec.manifest.schema_version != LABELED_TRADE_SCHEMA_VERSION {
            bail!(
                "{}: expected schema_version={}, got {}",
                rec.path.display(),
                LABELED_TRADE_SCHEMA_VERSION,
                rec.manifest.schema_version
            );
        }
        if rec.manifest.fact_row_count != rec.manifest.source_row_count {
            bail!(
                "{}: fact/source row mismatch: fact={} source={}",
                rec.path.display(),
                rec.manifest.fact_row_count,
                rec.manifest.source_row_count
            );
        }
        if rec.manifest.manifest_version != 1 {
            bail!(
                "{}: unsupported storage_v2 manifest_version={}",
                rec.path.display(),
                rec.manifest.manifest_version
            );
        }
        if rec.manifest.sample_id_algorithm_version != "fnv1a128_sample_id_v1" {
            bail!(
                "{}: unsupported sample_id_algorithm_version={}",
                rec.path.display(),
                rec.manifest.sample_id_algorithm_version
            );
        }
        if rec.manifest.route_dim_key_policy != "snapshot_local_route_key_v1" {
            bail!(
                "{}: unsupported route_dim_key_policy={}",
                rec.path.display(),
                rec.manifest.route_dim_key_policy
            );
        }
        for required in [
            "sample_id",
            "route_id",
            "symbol_id",
            "symbol_name",
            "canonical_symbol",
            "buy_venue",
            "sell_venue",
            "buy_market",
            "sell_market",
        ] {
            if !rec
                .manifest
                .virtualized_columns
                .iter()
                .any(|col| col == required)
            {
                bail!(
                    "{}: storage_v2 manifest missing virtualized column {}",
                    rec.path.display(),
                    required
                );
            }
        }
        rec.manifest.fact_parquet_path =
            resolve_manifest_path(&rec.path, &rec.manifest.fact_parquet_path)
                .display()
                .to_string();
        rec.manifest.route_dim_parquet_path =
            resolve_manifest_path(&rec.path, &rec.manifest.route_dim_parquet_path)
                .display()
                .to_string();
        validate_file_len(
            &rec.manifest.fact_parquet_path,
            rec.manifest.fact_file_bytes,
            "fact",
            &rec.path,
        )?;
        validate_file_len(
            &rec.manifest.route_dim_parquet_path,
            rec.manifest.route_dim_file_bytes,
            "route_dim",
            &rec.path,
        )?;
        if rec.manifest.min_timestamp_ns.is_none() || rec.manifest.max_timestamp_ns.is_none() {
            bail!("{}: manifest missing min/max timestamp", rec.path.display());
        }
        sample_id_algorithms.insert(rec.manifest.sample_id_algorithm_version.clone());
        route_dim_policies.insert(rec.manifest.route_dim_key_policy.clone());
    }
    if sample_id_algorithms.len() != 1 {
        bail!(
            "mixed sample_id_algorithm_version values: {:?}",
            sample_id_algorithms
        );
    }
    if route_dim_policies.len() != 1 {
        bail!(
            "mixed route_dim_key_policy values: {:?}",
            route_dim_policies
        );
    }
    Ok(())
}

fn resolve_manifest_path(manifest_path: &Path, raw: &str) -> PathBuf {
    let path = PathBuf::from(raw);
    if path.is_absolute() || path.exists() {
        return path;
    }
    let parent_candidate = manifest_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(&path);
    if parent_candidate.exists() {
        return parent_candidate;
    }
    let sibling_candidate = manifest_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(path.file_name().unwrap_or_default());
    if sibling_candidate.exists() {
        return sibling_candidate;
    }
    path
}

fn validate_file_len(path: &str, expected: u64, role: &str, manifest_path: &Path) -> Result<()> {
    let actual = fs::metadata(path)
        .with_context(|| {
            format!(
                "{}: missing {} file {}",
                manifest_path.display(),
                role,
                path
            )
        })?
        .len();
    if actual != expected {
        bail!(
            "{}: {} file size mismatch for {}: manifest={} actual={}",
            manifest_path.display(),
            role,
            path,
            expected,
            actual
        );
    }
    Ok(())
}

fn temporal_split(manifests: &[ManifestRecord], cli: &Cli) -> Result<TemporalSplit> {
    let min_ts = manifests
        .iter()
        .filter_map(|m| m.manifest.min_timestamp_ns)
        .min()
        .context("missing min timestamp")?;
    let max_ts = manifests
        .iter()
        .filter_map(|m| m.manifest.max_timestamp_ns)
        .max()
        .context("missing max timestamp")?;
    if max_ts <= min_ts {
        bail!("invalid timestamp span: min={} max={}", min_ts, max_ts);
    }
    let max_horizon_s =
        observed_max_horizon_s(manifests).context("manifest semantic stats have no horizons_s")?;
    let purge_s = cli.purge_s.max(max_horizon_s);
    let embargo_s = cli.embargo_s.max(max_horizon_s);
    let span = max_ts - min_ts;
    let train_end = min_ts + ((span as f64) * cli.train_frac) as u64;
    let calibration_start = train_end.saturating_add(purge_s.saturating_mul(NS_PER_S));
    let calibration_end = min_ts + ((span as f64) * (cli.train_frac + cli.calibration_frac)) as u64;
    let test_start = calibration_end.saturating_add(embargo_s.saturating_mul(NS_PER_S));
    let data_span_s = span / NS_PER_S;
    let diagnostic_only = data_span_s < 2 * (purge_s + embargo_s)
        || calibration_start > calibration_end
        || test_start >= max_ts;
    Ok(TemporalSplit {
        min_ts_ns: min_ts,
        max_ts_ns: max_ts,
        train_end_ns: train_end,
        calibration_start_ns: calibration_start,
        calibration_end_ns: calibration_end,
        test_start_ns: test_start,
        max_horizon_s,
        requested_purge_s: cli.purge_s,
        requested_embargo_s: cli.embargo_s,
        purge_s,
        embargo_s,
        data_span_s,
        diagnostic_only,
    })
}

fn observed_max_horizon_s(manifests: &[ManifestRecord]) -> Option<u64> {
    manifests
        .iter()
        .flat_map(|m| m.manifest.semantic_stats.horizons_s.keys().copied())
        .max()
        .map(u64::from)
}

fn process_training_pass(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    audit: &mut DatasetAudit,
    aggregates: &mut HashMap<AggregationKey, GroupStats>,
    dedupe: &mut DedupeTracker,
) -> Result<()> {
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
    let mut supervised_digest = TrainerSupervisedDigest::new();
    for rec in manifests {
        if rows_left == 0 {
            break;
        }
        audit.manifests_read = audit.manifests_read.saturating_add(1);
        audit.source_fact_rows_from_manifest = audit
            .source_fact_rows_from_manifest
            .saturating_add(rec.manifest.fact_row_count);
        let mut reader =
            open_storage_v2_sidecar_logical_reader(&rec.manifest, DatasetKind::LabeledTrades)
                .with_context(|| format!("open logical V2 reader {}", rec.path.display()))?;
        let should_verify_digest = cli.max_rows.is_none();
        let mut logical_digest = TrainerLogicalDigest::new(DatasetKind::LabeledTrades);
        let mut manifest_rows_seen = 0u64;
        for batch in &mut reader {
            if rows_left == 0 {
                break;
            }
            let batch = batch?;
            let view = BatchView::new(&batch)?;
            let n = batch.num_rows().min(rows_left as usize);
            rows_left -= n as u64;
            manifest_rows_seen = manifest_rows_seen.saturating_add(n as u64);
            if should_verify_digest {
                update_logical_digest_batch(&view, n, &mut logical_digest)?;
            }
            update_supervised_digest_batch(&view, n, &mut supervised_digest)?;
            process_train_batch(&view, n, split, audit, aggregates, dedupe)?;
        }
        if should_verify_digest && manifest_rows_seen == rec.manifest.source_row_count {
            let digest_hex = logical_digest.hex();
            if rec.manifest.logical_required_digest_kind != STORAGE_V2_LOGICAL_DIGEST_KIND
                || rec.manifest.logical_required_digest_hex != digest_hex
            {
                bail!(
                    "{}: storage_v2 logical digest mismatch kind manifest={} expected_kind={} hex manifest={} computed={}",
                    rec.path.display(),
                    rec.manifest.logical_required_digest_kind,
                    STORAGE_V2_LOGICAL_DIGEST_KIND,
                    rec.manifest.logical_required_digest_hex,
                    digest_hex
                );
            }
            audit.logical_digest_verified_manifests =
                audit.logical_digest_verified_manifests.saturating_add(1);
        } else {
            audit.logical_digest_skipped_manifests =
                audit.logical_digest_skipped_manifests.saturating_add(1);
        }
    }
    audit.trainer_supervised_digest_kind = TRAINER_SUPERVISED_DIGEST_KIND.to_string();
    audit.trainer_supervised_digest_hex = supervised_digest.hex();
    audit.trainer_supervised_digest_rows = supervised_digest.rows();
    Ok(())
}

fn update_logical_digest_batch(
    view: &BatchView<'_>,
    n_rows: usize,
    digest: &mut TrainerLogicalDigest,
) -> Result<()> {
    for row in 0..n_rows {
        digest.begin_row();
        digest.update_str(required_str(view.sample_id, row, "sample_id")?);
        digest.update_str(required_str(view.route_id, row, "route_id")?);
        digest.update_u64(required_u64(view.ts_emit_ns, row, "ts_emit_ns")?);
        digest.update_u32(required_u32(view.cycle_seq, row, "cycle_seq")?);
        digest.update_u16(required_u16(view.schema_version, row, "schema_version")?);
        digest.update_u32(required_u32(view.horizon_s, row, "horizon_s")?);
    }
    Ok(())
}

fn update_supervised_digest_batch(
    view: &BatchView<'_>,
    n_rows: usize,
    digest: &mut TrainerSupervisedDigest,
) -> Result<()> {
    for row in 0..n_rows {
        let sample_id = required_str(view.sample_id, row, "sample_id")?;
        let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
        let hits = floor_hit_range(view.label_floor_hits, row)?;
        let fingerprint = supervised_dedupe_row_fingerprint(view, row, hits, horizon_s)?;
        digest.begin_row();
        digest.update_str(sample_id);
        digest.update_str(required_str(
            view.runtime_config_hash,
            row,
            "runtime_config_hash",
        )?);
        digest.update_u16(required_u16(view.schema_version, row, "schema_version")?);
        digest.update_u32(required_u32(view.cycle_seq, row, "cycle_seq")?);
        digest.update_u32(horizon_s);
        digest.update_u128(fingerprint.digest);
    }
    Ok(())
}

fn process_train_batch(
    view: &BatchView<'_>,
    n_rows: usize,
    split: &TemporalSplit,
    audit: &mut DatasetAudit,
    aggregates: &mut HashMap<AggregationKey, GroupStats>,
    dedupe: &mut DedupeTracker,
) -> Result<()> {
    for row in 0..n_rows {
        let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
        let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
        let split_name = split.assign(ts);
        inc_str(&mut audit.split_rows, split_name_str(split_name));
        audit.rows_read = audit.rows_read.saturating_add(1);

        audit_row(view, row, horizon_s, audit)?;
        if split_name != SplitName::Train {
            continue;
        }

        let route_id = required_str(view.route_id, row, "route_id")?;
        let sample_id = required_str(view.sample_id, row, "sample_id")?;
        let sample_decision = required_str(view.sample_decision, row, "sample_decision")?;
        let label_pi = optional_f32(view.label_sampling_probability, row)
            .or_else(|| optional_f32(Some(view.sampling_probability), row));
        let hits = floor_hit_range(view.label_floor_hits, row)?;
        let floor_count = hits.len() as u64;
        let dedupe_key = supervised_dedupe_row_key(sample_id, horizon_s);
        let dedupe_fingerprint =
            supervised_dedupe_row_fingerprint(view, row, hits.clone(), horizon_s)?;
        match dedupe.observe(
            dedupe_key,
            dedupe_fingerprint,
            split_name,
            sample_id,
            route_id,
            floor_count,
        ) {
            DedupeDecision::Unique => {}
            DedupeDecision::DuplicateExact => continue,
            DedupeDecision::DuplicateConflict => {
                push_audit_issue(
                    audit,
                    format!(
                        "supervised_duplicate_conflict sample_id={} route={} horizon_s={} floor_count={}",
                        sample_id, route_id, horizon_s, floor_count
                    ),
                );
                continue;
            }
        }
        for hit_idx in hits {
            let floor_pct =
                required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
            let floor_bp = floor_to_bp(floor_pct);
            let state_bucket = state_bucket_for_floor(view, row, floor_pct);
            let outcome = floor_outcome(view, row, hit_idx, horizon_s)?;
            update_aggregates(
                aggregates,
                AggregateUpdate {
                    scope: "all",
                    route_id,
                    state_bucket: &state_bucket,
                    horizon_s,
                    floor_bp,
                    outcome,
                    label_pi,
                },
            );
            update_aggregates(
                aggregates,
                AggregateUpdate {
                    scope: sample_decision,
                    route_id,
                    state_bucket: &state_bucket,
                    horizon_s,
                    floor_bp,
                    outcome,
                    label_pi,
                },
            );
            if sample_decision != "accept" {
                update_aggregates(
                    aggregates,
                    AggregateUpdate {
                        scope: "background",
                        route_id,
                        state_bucket: &state_bucket,
                        horizon_s,
                        floor_bp,
                        outcome,
                        label_pi,
                    },
                );
            }
        }
    }
    Ok(())
}

fn build_prediction_surface(
    aggregates: &HashMap<AggregationKey, GroupStats>,
    min_support: u64,
) -> (Vec<EstimatorRow>, AggregateBuildStats) {
    let mut rows = Vec::new();
    let mut build = AggregateBuildStats::default();
    for (key, stats) in aggregates {
        build.groups_total = build.groups_total.saturating_add(1);
        inc_str(&mut build.groups_by_level, key.level.as_str());
        let row = stats.finalize(key);
        if row.p_hit_km.is_none() {
            build.groups_without_p_hit = build.groups_without_p_hit.saturating_add(1);
            continue;
        }
        if row.n_total < min_support {
            build.groups_below_min_support = build.groups_below_min_support.saturating_add(1);
            continue;
        }
        build.prediction_eligible_groups = build.prediction_eligible_groups.saturating_add(1);
        inc_str(
            &mut build.prediction_eligible_by_level,
            row.aggregation_level.as_str(),
        );
        rows.push(row);
    }
    rows.sort_by(|a, b| {
        a.aggregation_level
            .cmp(&b.aggregation_level)
            .then_with(|| a.population_scope.cmp(&b.population_scope))
            .then_with(|| a.entity_key.cmp(&b.entity_key))
            .then_with(|| a.horizon_s.cmp(&b.horizon_s))
            .then_with(|| {
                a.floor_pct
                    .partial_cmp(&b.floor_pct)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
    });
    (rows, build)
}

fn process_bootstrap_interval_pass(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    rows: &mut [EstimatorRow],
    dedupe: &mut DedupeTracker,
) -> Result<BootstrapIntervalAudit> {
    let mut audit = BootstrapIntervalAudit {
        eligible_rows: rows.len() as u64,
        ..BootstrapIntervalAudit::default()
    };
    let row_index = rows
        .iter()
        .enumerate()
        .filter_map(|(idx, row)| estimator_row_key(row).map(|key| (key, idx)))
        .collect::<HashMap<_, _>>();
    let mut accumulators = HashMap::<AggregationKey, BootstrapAccumulator>::new();
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
    for rec in manifests {
        if rows_left == 0 {
            break;
        }
        let mut reader =
            open_storage_v2_sidecar_logical_reader(&rec.manifest, DatasetKind::LabeledTrades)
                .with_context(|| format!("open logical V2 reader {}", rec.path.display()))?;
        for batch in &mut reader {
            if rows_left == 0 {
                break;
            }
            let batch = batch?;
            let view = BatchView::new(&batch)?;
            let n = batch.num_rows().min(rows_left as usize);
            rows_left -= n as u64;
            process_bootstrap_interval_batch(
                &view,
                n,
                split,
                &row_index,
                &mut accumulators,
                dedupe,
            )?;
        }
    }

    for row in rows {
        let Some(key) = estimator_row_key(row) else {
            audit.fallback_rows = audit.fallback_rows.saturating_add(1);
            push_bootstrap_interval_example(&mut audit, "invalid_estimator_row_key", row, None);
            continue;
        };
        let Some(point_estimate) = row.p_hit_km_raw else {
            audit.fallback_rows = audit.fallback_rows.saturating_add(1);
            push_bootstrap_interval_example(&mut audit, "missing_point_estimate", row, None);
            continue;
        };
        let Some(acc) = accumulators.get(&key) else {
            audit.fallback_rows = audit.fallback_rows.saturating_add(1);
            audit.missing_accumulator_rows = audit.missing_accumulator_rows.saturating_add(1);
            row.ci_method = format!("{FALLBACK_CI_METHOD};bootstrap_missing_accumulator");
            push_bootstrap_interval_example(&mut audit, "missing_accumulator", row, None);
            continue;
        };
        let block_count = acc.blocks.len();
        audit.min_observed_blocks = Some(
            audit
                .min_observed_blocks
                .map(|current| current.min(block_count))
                .unwrap_or(block_count),
        );
        audit.max_observed_blocks = Some(
            audit
                .max_observed_blocks
                .map(|current| current.max(block_count))
                .unwrap_or(block_count),
        );
        let block_s = bootstrap_block_s(key.horizon_s);
        audit.min_observed_block_s = Some(
            audit
                .min_observed_block_s
                .map(|current| current.min(block_s))
                .unwrap_or(block_s),
        );
        audit.max_observed_block_s = Some(
            audit
                .max_observed_block_s
                .map(|current| current.max(block_s))
                .unwrap_or(block_s),
        );
        let Some(interval) = acc.interval(bootstrap_seed_for_key(&key), point_estimate, block_s)
        else {
            audit.fallback_rows = audit.fallback_rows.saturating_add(1);
            audit.insufficient_block_rows = audit.insufficient_block_rows.saturating_add(1);
            row.ci_method = format!(
                "{FALLBACK_CI_METHOD};bootstrap_insufficient_blocks observed_blocks={block_count} min_blocks={BLOCK_BOOTSTRAP_MIN_BLOCKS}"
            );
            push_bootstrap_interval_example(
                &mut audit,
                "insufficient_blocks",
                row,
                Some(block_count),
            );
            continue;
        };
        audit.ready_rows = audit.ready_rows.saturating_add(1);
        audit.min_replicates_used = Some(
            audit
                .min_replicates_used
                .map(|current| current.min(interval.n_replicates))
                .unwrap_or(interval.n_replicates),
        );
        audit.max_replicates_used = Some(
            audit
                .max_replicates_used
                .map(|current| current.max(interval.n_replicates))
                .unwrap_or(interval.n_replicates),
        );
        audit.min_observed_block_s = Some(
            audit
                .min_observed_block_s
                .map(|current| current.min(interval.block_s))
                .unwrap_or(interval.block_s),
        );
        audit.max_observed_block_s = Some(
            audit
                .max_observed_block_s
                .map(|current| current.max(interval.block_s))
                .unwrap_or(interval.block_s),
        );
        audit.min_observed_blocks = Some(
            audit
                .min_observed_blocks
                .map(|current| current.min(interval.n_blocks))
                .unwrap_or(interval.n_blocks),
        );
        audit.max_observed_blocks = Some(
            audit
                .max_observed_blocks
                .map(|current| current.max(interval.n_blocks))
                .unwrap_or(interval.n_blocks),
        );
        row.p_hit_ci_lower_raw = Some(interval.lower);
        row.p_hit_ci_upper_raw = Some(interval.upper);
        row.p_hit_ci_lower = Some(interval.lower);
        row.p_hit_ci_upper = Some(interval.upper);
        row.ci_method = CI_METHOD.to_string();
    }
    audit.fallback_rows = audit.eligible_rows.saturating_sub(audit.ready_rows);
    Ok(audit)
}

fn process_bootstrap_interval_batch(
    view: &BatchView<'_>,
    n_rows: usize,
    split: &TemporalSplit,
    row_index: &HashMap<AggregationKey, usize>,
    accumulators: &mut HashMap<AggregationKey, BootstrapAccumulator>,
    dedupe: &mut DedupeTracker,
) -> Result<()> {
    for row in 0..n_rows {
        let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
        if split.assign(ts) != SplitName::Train {
            continue;
        }
        let sample_decision = required_str(view.sample_decision, row, "sample_decision")?;
        let route_id = required_str(view.route_id, row, "route_id")?;
        let sample_id = required_str(view.sample_id, row, "sample_id")?;
        let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
        let hits = floor_hit_range(view.label_floor_hits, row)?;
        let floor_count = hits.len() as u64;
        let dedupe_key = supervised_dedupe_row_key(sample_id, horizon_s);
        let dedupe_fingerprint =
            supervised_dedupe_row_fingerprint(view, row, hits.clone(), horizon_s)?;
        if dedupe.observe(
            dedupe_key,
            dedupe_fingerprint,
            SplitName::Train,
            sample_id,
            route_id,
            floor_count,
        ) != DedupeDecision::Unique
        {
            continue;
        }
        let block_id = bootstrap_block_id(ts, horizon_s);
        for hit_idx in hits {
            let floor_pct =
                required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
            let floor_bp = floor_to_bp(floor_pct);
            let state_bucket = state_bucket_for_floor(view, row, floor_pct);
            let outcome = floor_outcome(view, row, hit_idx, horizon_s)?;
            update_bootstrap_interval_aggregate(
                row_index,
                accumulators,
                BootstrapAggregateUpdate {
                    scope: "all",
                    route_id,
                    state_bucket: &state_bucket,
                    horizon_s,
                    floor_bp,
                    outcome,
                    block_id,
                },
            );
            update_bootstrap_interval_aggregate(
                row_index,
                accumulators,
                BootstrapAggregateUpdate {
                    scope: sample_decision,
                    route_id,
                    state_bucket: &state_bucket,
                    horizon_s,
                    floor_bp,
                    outcome,
                    block_id,
                },
            );
            if sample_decision != "accept" {
                update_bootstrap_interval_aggregate(
                    row_index,
                    accumulators,
                    BootstrapAggregateUpdate {
                        scope: "background",
                        route_id,
                        state_bucket: &state_bucket,
                        horizon_s,
                        floor_bp,
                        outcome,
                        block_id,
                    },
                );
            }
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Copy)]
struct BootstrapAggregateUpdate<'a> {
    scope: &'a str,
    route_id: &'a str,
    state_bucket: &'a str,
    horizon_s: u32,
    floor_bp: i32,
    outcome: FloorOutcome,
    block_id: u64,
}

fn update_bootstrap_interval_aggregate(
    row_index: &HashMap<AggregationKey, usize>,
    accumulators: &mut HashMap<AggregationKey, BootstrapAccumulator>,
    update: BootstrapAggregateUpdate<'_>,
) {
    for (level, entity) in [
        (AggregationLevel::Route, update.route_id),
        (AggregationLevel::GlobalState, update.state_bucket),
        (AggregationLevel::Global, "*"),
    ] {
        let key = AggregationKey {
            scope: update.scope.to_string(),
            level,
            entity: entity.to_string(),
            horizon_s: update.horizon_s,
            floor_bp: update.floor_bp,
        };
        if row_index.contains_key(&key) {
            accumulators.entry(key).or_default().update(
                update.block_id,
                update.outcome,
                update.horizon_s,
            );
        }
    }
}

fn estimator_row_key(row: &EstimatorRow) -> Option<AggregationKey> {
    let level = match row.aggregation_level.as_str() {
        "route" => AggregationLevel::Route,
        "global_state" => AggregationLevel::GlobalState,
        "global" => AggregationLevel::Global,
        _ => return None,
    };
    Some(AggregationKey {
        scope: row.population_scope.clone(),
        level,
        entity: row.entity_key.clone(),
        horizon_s: row.horizon_s,
        floor_bp: floor_to_bp(row.floor_pct),
    })
}

fn bootstrap_block_s(horizon_s: u32) -> u64 {
    BLOCK_BOOTSTRAP_MIN_BLOCK_S.max(horizon_s as u64)
}

fn bootstrap_block_id(ts_ns: u64, horizon_s: u32) -> u64 {
    ts_ns / (bootstrap_block_s(horizon_s).saturating_mul(NS_PER_S)).max(1)
}

fn bootstrap_seed_for_key(key: &AggregationKey) -> u128 {
    let mut state = FNV_OFFSET_128;
    fnv1a_update(&mut state, b"bootstrap_interval_seed_v1");
    update_hash_str(&mut state, &key.scope);
    update_hash_str(&mut state, key.level.as_str());
    update_hash_str(&mut state, &key.entity);
    update_hash_u32(&mut state, key.horizon_s);
    update_hash_i32(&mut state, key.floor_bp);
    state
}

fn bootstrap_sample_index(seed: u128, rep: usize, draw: usize, n: usize) -> usize {
    if n == 0 {
        return 0;
    }
    let mut state = seed;
    fnv1a_update(&mut state, b"bootstrap_draw_v1");
    update_hash_u64(&mut state, rep as u64);
    update_hash_u64(&mut state, draw as u64);
    (state % n as u128) as usize
}

fn percentile_sorted(values: &[f64], q: f64) -> f64 {
    if values.is_empty() {
        return f64::NAN;
    }
    let q = q.clamp(0.0, 1.0);
    let idx = ((values.len() as f64 * q).ceil() as usize)
        .saturating_sub(1)
        .min(values.len().saturating_sub(1));
    values[idx]
}

fn push_bootstrap_interval_example(
    audit: &mut BootstrapIntervalAudit,
    reason: &str,
    row: &EstimatorRow,
    block_count: Option<usize>,
) {
    if audit.examples.len() >= 50 {
        return;
    }
    audit.examples.push(format!(
        "reason={} scope={} level={} entity={} horizon_s={} floor_bp={} n_total={} n_complete={} p_hit={:?} observed_blocks={:?}",
        reason,
        row.population_scope,
        row.aggregation_level,
        row.entity_key,
        row.horizon_s,
        floor_to_bp(row.floor_pct),
        row.n_total,
        row.n_complete,
        row.p_hit_km_raw,
        block_count
    ));
}

fn apply_monotonicity_projection(rows: &mut [EstimatorRow]) -> MonotonicityProjectionAudit {
    let mut audit = MonotonicityProjectionAudit::default();
    let mut abs_deltas = Vec::new();
    let mut curves = BTreeMap::<(String, String, String), Vec<usize>>::new();
    for (idx, row) in rows.iter().enumerate() {
        if row.p_hit_km.is_some() {
            curves
                .entry((
                    row.population_scope.clone(),
                    row.aggregation_level.clone(),
                    row.entity_key.clone(),
                ))
                .or_default()
                .push(idx);
        }
    }

    for ((scope, level, entity), row_indices) in curves {
        audit.checked_curves = audit.checked_curves.saturating_add(1);
        audit.rows_seen = audit.rows_seen.saturating_add(row_indices.len() as u64);
        let mut values = row_indices
            .iter()
            .map(|idx| rows[*idx].p_hit_km.unwrap_or(0.0).clamp(0.0, 1.0))
            .collect::<Vec<_>>();
        let weights = row_indices
            .iter()
            .map(|idx| {
                rows[*idx]
                    .n_eff_sampling
                    .filter(|w| w.is_finite() && *w > 0.0)
                    .unwrap_or(rows[*idx].n_total.max(1) as f64)
                    .max(1.0)
            })
            .collect::<Vec<_>>();

        let mut by_floor = BTreeMap::<i32, Vec<usize>>::new();
        let mut by_horizon = BTreeMap::<u32, Vec<usize>>::new();
        for (local_idx, row_idx) in row_indices.iter().enumerate() {
            let row = &rows[*row_idx];
            by_floor
                .entry(floor_to_bp(row.floor_pct))
                .or_default()
                .push(local_idx);
            by_horizon.entry(row.horizon_s).or_default().push(local_idx);
        }
        for positions in by_floor.values_mut() {
            positions.sort_by_key(|local_idx| rows[row_indices[*local_idx]].horizon_s);
        }
        for positions in by_horizon.values_mut() {
            positions.sort_by(|a, b| {
                rows[row_indices[*a]]
                    .floor_pct
                    .partial_cmp(&rows[row_indices[*b]].floor_pct)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }

        let mut iterations_used = 0u32;
        for iteration in 0..MONOTONICITY_PROJECTION_MAX_ITERATIONS {
            iterations_used = iteration.saturating_add(1);
            let mut max_step: f64 = 0.0;
            for positions in by_floor.values() {
                max_step = max_step.max(apply_isotonic_sequence(
                    positions,
                    &mut values,
                    &weights,
                    1.0,
                ));
            }
            for positions in by_horizon.values() {
                max_step = max_step.max(apply_isotonic_sequence(
                    positions,
                    &mut values,
                    &weights,
                    -1.0,
                ));
            }
            if max_step <= MONOTONICITY_PROJECTION_TOLERANCE {
                break;
            }
        }
        audit.max_iterations_used = audit.max_iterations_used.max(iterations_used);

        let mut curve_adjusted = false;
        for (local_idx, row_idx) in row_indices.iter().enumerate() {
            let projected = values[local_idx].clamp(0.0, 1.0);
            let row = &mut rows[*row_idx];
            let raw = row.p_hit_km_raw.or(row.p_hit_km).unwrap_or(projected);
            row.p_hit_km_raw = Some(raw);
            let delta = projected - raw;
            row.p_hit_km = Some(projected);
            row.p_hit_monotonicity_delta = Some(delta);
            row.p_hit_monotonicity_adjusted = delta.abs() > MONOTONICITY_PROJECTION_TOLERANCE;
            if row.p_hit_monotonicity_adjusted {
                curve_adjusted = true;
                audit.rows_adjusted = audit.rows_adjusted.saturating_add(1);
                let abs_delta = delta.abs();
                abs_deltas.push(abs_delta);
                audit.max_abs_delta = audit.max_abs_delta.max(abs_delta);
                audit.total_abs_delta += abs_delta;
                shift_projected_confidence_interval(row, raw, projected);
                if audit.examples.len() < 50 {
                    audit.examples.push(format!(
                        "scope={} level={} entity={} horizon_s={} floor_bp={} raw_p={} projected_p={} delta={}",
                        scope,
                        level,
                        entity,
                        row.horizon_s,
                        floor_to_bp(row.floor_pct),
                        raw,
                        projected,
                        delta
                    ));
                }
            } else {
                shift_projected_confidence_interval(row, raw, projected);
            }
        }
        if curve_adjusted {
            audit.adjusted_curves = audit.adjusted_curves.saturating_add(1);
        }
    }

    finish_projection_delta_summary(&mut audit, &mut abs_deltas);
    audit
}

fn apply_isotonic_sequence(
    positions: &[usize],
    values: &mut [f64],
    weights: &[f64],
    sign: f64,
) -> f64 {
    if positions.len() < 2 {
        return 0.0;
    }
    let sequence = positions
        .iter()
        .map(|position| (values[*position] * sign, weights[*position]))
        .collect::<Vec<_>>();
    let fitted = weighted_isotonic_increasing(&sequence);
    let mut max_step: f64 = 0.0;
    for (idx, position) in positions.iter().enumerate() {
        let next = (fitted[idx] * sign).clamp(0.0, 1.0);
        max_step = max_step.max((values[*position] - next).abs());
        values[*position] = next;
    }
    max_step
}

fn weighted_isotonic_increasing(sequence: &[(f64, f64)]) -> Vec<f64> {
    #[derive(Clone, Copy)]
    struct Block {
        start: usize,
        end: usize,
        weight: f64,
        weighted_sum: f64,
        value: f64,
    }

    let mut blocks = Vec::<Block>::new();
    for (idx, (value, weight)) in sequence.iter().enumerate() {
        let weight = if weight.is_finite() && *weight > 0.0 {
            *weight
        } else {
            1.0
        };
        blocks.push(Block {
            start: idx,
            end: idx,
            weight,
            weighted_sum: value.clamp(-1.0, 1.0) * weight,
            value: value.clamp(-1.0, 1.0),
        });
        while blocks.len() >= 2 {
            let len = blocks.len();
            if blocks[len - 2].value <= blocks[len - 1].value + MONOTONICITY_PROJECTION_TOLERANCE {
                break;
            }
            let right = blocks.pop().expect("right isotonic block");
            let left = blocks.pop().expect("left isotonic block");
            let weight = left.weight + right.weight;
            let weighted_sum = left.weighted_sum + right.weighted_sum;
            blocks.push(Block {
                start: left.start,
                end: right.end,
                weight,
                weighted_sum,
                value: if weight > 0.0 {
                    weighted_sum / weight
                } else {
                    0.0
                },
            });
        }
    }

    let mut fitted = vec![0.0; sequence.len()];
    for block in blocks {
        for value in fitted.iter_mut().take(block.end + 1).skip(block.start) {
            *value = block.value;
        }
    }
    fitted
}

fn shift_projected_confidence_interval(row: &mut EstimatorRow, raw: f64, projected: f64) {
    let delta = projected - raw;
    row.p_hit_ci_lower_raw = row.p_hit_ci_lower_raw.or(row.p_hit_ci_lower);
    row.p_hit_ci_upper_raw = row.p_hit_ci_upper_raw.or(row.p_hit_ci_upper);
    if let Some(lower_raw) = row.p_hit_ci_lower_raw {
        row.p_hit_ci_lower = Some((lower_raw + delta).clamp(0.0, projected));
    }
    if let Some(upper_raw) = row.p_hit_ci_upper_raw {
        row.p_hit_ci_upper = Some((upper_raw + delta).clamp(projected, 1.0));
    }
    if row.p_hit_monotonicity_adjusted && !row.ci_method.contains("monotonicity_delta_shifted") {
        row.ci_method = format!("{};monotonicity_delta_shifted", row.ci_method);
    }
}

fn append_ci_method_tag(row: &mut EstimatorRow, tag: &str) {
    if !row.ci_method.contains(tag) {
        row.ci_method = format!("{};{}", row.ci_method, tag);
    }
}

fn map_confidence_interval_to_serving_calibration(
    row: &mut EstimatorRow,
    calibration_suite: &CalibrationSuite,
) {
    let Some(center) = row.p_hit_calibrated_raw else {
        return;
    };
    let (Some(lower), Some(upper)) = (row.p_hit_ci_lower, row.p_hit_ci_upper) else {
        return;
    };
    let scope = row.population_scope.clone();
    let horizon_s = row.horizon_s;
    let floor_bp = floor_to_bp(row.floor_pct);
    let lower = calibration_suite
        .calibrate(&scope, horizon_s, floor_bp, lower)
        .probability;
    let upper = calibration_suite
        .calibrate(&scope, horizon_s, floor_bp, upper)
        .probability;
    let lower_bound = lower.min(upper).min(center).clamp(0.0, center);
    let upper_bound = lower.max(upper).max(center).clamp(center, 1.0);
    row.p_hit_ci_lower = Some(lower_bound);
    row.p_hit_ci_upper = Some(upper_bound);
    append_ci_method_tag(row, "serving_calibration_mapped");
}

fn shift_serving_confidence_interval(row: &mut EstimatorRow, before: f64, after: f64) {
    let delta = after - before;
    if let Some(lower) = row.p_hit_ci_lower {
        row.p_hit_ci_lower = Some((lower + delta).clamp(0.0, after));
    }
    if let Some(upper) = row.p_hit_ci_upper {
        row.p_hit_ci_upper = Some((upper + delta).clamp(after, 1.0));
    }
    if delta.abs() > MONOTONICITY_PROJECTION_TOLERANCE {
        append_ci_method_tag(row, "serving_monotonicity_delta_shifted");
    }
}

fn apply_serving_probability_projection(
    rows: &mut [EstimatorRow],
    calibration_suite: &CalibrationSuite,
) -> MonotonicityProjectionAudit {
    let mut audit = MonotonicityProjectionAudit {
        method: SERVING_PROBABILITY_PROJECTION_METHOD.to_string(),
        ..MonotonicityProjectionAudit::default()
    };
    let mut abs_deltas = Vec::new();
    let mut uncalibrated_abs_deltas = Vec::new();
    let mut curves = BTreeMap::<(String, String, String), Vec<usize>>::new();
    for (idx, row) in rows.iter_mut().enumerate() {
        let Some(raw_p) = row.p_hit_km else {
            row.p_hit_calibrated_raw = None;
            row.p_hit_calibration_applied = false;
            row.p_hit_serving = None;
            row.p_hit_serving_monotonicity_delta = None;
            row.p_hit_serving_monotonicity_adjusted = false;
            continue;
        };
        let floor_bp = floor_to_bp(row.floor_pct);
        let calibrated =
            calibration_suite.calibrate(&row.population_scope, row.horizon_s, floor_bp, raw_p);
        row.p_hit_calibrated_raw = Some(calibrated.probability);
        row.p_hit_calibration_applied = calibrated.applied;
        row.p_hit_serving = Some(calibrated.probability);
        map_confidence_interval_to_serving_calibration(row, calibration_suite);
        row.p_hit_serving_monotonicity_delta = Some(0.0);
        row.p_hit_serving_monotonicity_adjusted = false;
        curves
            .entry((
                row.population_scope.clone(),
                row.aggregation_level.clone(),
                row.entity_key.clone(),
            ))
            .or_default()
            .push(idx);
    }

    for ((scope, level, entity), row_indices) in curves {
        audit.checked_curves = audit.checked_curves.saturating_add(1);
        audit.rows_seen = audit.rows_seen.saturating_add(row_indices.len() as u64);
        let mut values = row_indices
            .iter()
            .map(|idx| rows[*idx].p_hit_serving.unwrap_or(0.0).clamp(0.0, 1.0))
            .collect::<Vec<_>>();
        let weights = row_indices
            .iter()
            .map(|idx| {
                rows[*idx]
                    .n_eff_sampling
                    .filter(|w| w.is_finite() && *w > 0.0)
                    .unwrap_or(rows[*idx].n_total.max(1) as f64)
                    .max(1.0)
            })
            .collect::<Vec<_>>();

        let mut by_floor = BTreeMap::<i32, Vec<usize>>::new();
        let mut by_horizon = BTreeMap::<u32, Vec<usize>>::new();
        for (local_idx, row_idx) in row_indices.iter().enumerate() {
            let row = &rows[*row_idx];
            by_floor
                .entry(floor_to_bp(row.floor_pct))
                .or_default()
                .push(local_idx);
            by_horizon.entry(row.horizon_s).or_default().push(local_idx);
        }
        for positions in by_floor.values_mut() {
            positions.sort_by_key(|local_idx| rows[row_indices[*local_idx]].horizon_s);
        }
        for positions in by_horizon.values_mut() {
            positions.sort_by(|a, b| {
                rows[row_indices[*a]]
                    .floor_pct
                    .partial_cmp(&rows[row_indices[*b]].floor_pct)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }

        let mut iterations_used = 0u32;
        for iteration in 0..MONOTONICITY_PROJECTION_MAX_ITERATIONS {
            iterations_used = iteration.saturating_add(1);
            let mut max_step: f64 = 0.0;
            for positions in by_floor.values() {
                max_step = max_step.max(apply_isotonic_sequence(
                    positions,
                    &mut values,
                    &weights,
                    1.0,
                ));
            }
            for positions in by_horizon.values() {
                max_step = max_step.max(apply_isotonic_sequence(
                    positions,
                    &mut values,
                    &weights,
                    -1.0,
                ));
            }
            if max_step <= MONOTONICITY_PROJECTION_TOLERANCE {
                break;
            }
        }
        audit.max_iterations_used = audit.max_iterations_used.max(iterations_used);

        let mut curve_adjusted = false;
        for (local_idx, row_idx) in row_indices.iter().enumerate() {
            let projected = values[local_idx].clamp(0.0, 1.0);
            let row = &mut rows[*row_idx];
            let calibrated_raw = row.p_hit_calibrated_raw.unwrap_or(projected);
            let delta = projected - calibrated_raw;
            row.p_hit_serving = Some(projected);
            shift_serving_confidence_interval(row, calibrated_raw, projected);
            row.p_hit_serving_monotonicity_delta = Some(delta);
            row.p_hit_serving_monotonicity_adjusted =
                delta.abs() > MONOTONICITY_PROJECTION_TOLERANCE;
            if row.p_hit_serving_monotonicity_adjusted {
                curve_adjusted = true;
                audit.rows_adjusted = audit.rows_adjusted.saturating_add(1);
                let abs_delta = delta.abs();
                abs_deltas.push(abs_delta);
                audit.max_abs_delta = audit.max_abs_delta.max(abs_delta);
                audit.total_abs_delta += abs_delta;
                if !row.p_hit_calibration_applied {
                    audit.uncalibrated_rows_adjusted =
                        audit.uncalibrated_rows_adjusted.saturating_add(1);
                    uncalibrated_abs_deltas.push(abs_delta);
                    audit.max_uncalibrated_abs_delta =
                        audit.max_uncalibrated_abs_delta.max(abs_delta);
                    audit.total_uncalibrated_abs_delta += abs_delta;
                    if audit.uncalibrated_examples.len() < 50 {
                        audit.uncalibrated_examples.push(format!(
                            "scope={} level={} entity={} horizon_s={} floor_bp={} raw_fallback_p={} serving_p={} delta={}",
                            scope,
                            level,
                            entity,
                            row.horizon_s,
                            floor_to_bp(row.floor_pct),
                            calibrated_raw,
                            projected,
                            delta
                        ));
                    }
                }
                if audit.examples.len() < 50 {
                    audit.examples.push(format!(
                        "scope={} level={} entity={} horizon_s={} floor_bp={} calibrated_p={} serving_p={} delta={}",
                        scope,
                        level,
                        entity,
                        row.horizon_s,
                        floor_to_bp(row.floor_pct),
                        calibrated_raw,
                        projected,
                        delta
                    ));
                }
            }
        }
        if curve_adjusted {
            audit.adjusted_curves = audit.adjusted_curves.saturating_add(1);
        }
    }

    finish_projection_delta_summary(&mut audit, &mut abs_deltas);
    finish_uncalibrated_projection_delta_summary(&mut audit, &mut uncalibrated_abs_deltas);
    audit
}

fn finish_projection_delta_summary(
    audit: &mut MonotonicityProjectionAudit,
    abs_deltas: &mut Vec<f64>,
) {
    if audit.rows_adjusted == 0 || abs_deltas.is_empty() {
        return;
    }
    audit.mean_abs_delta = audit.total_abs_delta / audit.rows_adjusted as f64;
    abs_deltas.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let idx = (((abs_deltas.len() as f64) * 0.95).ceil() as usize)
        .saturating_sub(1)
        .min(abs_deltas.len().saturating_sub(1));
    audit.p95_abs_delta = abs_deltas[idx];
}

fn finish_uncalibrated_projection_delta_summary(
    audit: &mut MonotonicityProjectionAudit,
    abs_deltas: &mut Vec<f64>,
) {
    if audit.uncalibrated_rows_adjusted == 0 || abs_deltas.is_empty() {
        return;
    }
    audit.mean_uncalibrated_abs_delta =
        audit.total_uncalibrated_abs_delta / audit.uncalibrated_rows_adjusted as f64;
    abs_deltas.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let idx = (((abs_deltas.len() as f64) * 0.95).ceil() as usize)
        .saturating_sub(1)
        .min(abs_deltas.len().saturating_sub(1));
    audit.p95_uncalibrated_abs_delta = abs_deltas[idx];
}

fn process_calibration_pass(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    index: &HashMap<AggregationKey, EstimatorRow>,
    dedupe: &mut DedupeTracker,
) -> Result<CalibrationSuite> {
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
    let scopes = score_scopes(cli.prediction_scope);
    let mut accumulators = BTreeMap::<CalibrationCellKey, CalibrationFitAccumulator>::new();
    for rec in manifests {
        if rows_left == 0 {
            break;
        }
        let mut reader =
            open_storage_v2_sidecar_logical_reader(&rec.manifest, DatasetKind::LabeledTrades)
                .with_context(|| format!("open logical V2 reader {}", rec.path.display()))?;
        for batch in &mut reader {
            if rows_left == 0 {
                break;
            }
            let batch = batch?;
            let view = BatchView::new(&batch)?;
            let n = batch.num_rows().min(rows_left as usize);
            rows_left -= n as u64;
            process_calibration_batch(
                &view,
                n,
                split,
                cli.shrinkage_k,
                index,
                &scopes,
                &mut accumulators,
                dedupe,
            )?;
        }
    }

    Ok(CalibrationSuite::from_accumulators(
        &scopes,
        accumulators,
        MIN_CALIBRATION_COMPLETE,
    ))
}

fn process_calibration_batch(
    view: &BatchView<'_>,
    n_rows: usize,
    split: &TemporalSplit,
    shrinkage_k: f64,
    index: &HashMap<AggregationKey, EstimatorRow>,
    scopes: &[PredictionScope],
    accumulators: &mut BTreeMap<CalibrationCellKey, CalibrationFitAccumulator>,
    dedupe: &mut DedupeTracker,
) -> Result<()> {
    for row in 0..n_rows {
        let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
        if split.assign(ts) != SplitName::Calibration {
            continue;
        }
        let sample_decision = required_str(view.sample_decision, row, "sample_decision")?;
        let route_id = required_str(view.route_id, row, "route_id")?;
        let sample_id = required_str(view.sample_id, row, "sample_id")?;
        let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
        let hits = floor_hit_range(view.label_floor_hits, row)?;
        let floor_count = hits.len() as u64;
        let dedupe_key = supervised_dedupe_row_key(sample_id, horizon_s);
        let dedupe_fingerprint =
            supervised_dedupe_row_fingerprint(view, row, hits.clone(), horizon_s)?;
        if dedupe.observe(
            dedupe_key,
            dedupe_fingerprint,
            SplitName::Calibration,
            sample_id,
            route_id,
            floor_count,
        ) != DedupeDecision::Unique
        {
            continue;
        }
        for hit_idx in hits {
            let floor_pct =
                required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
            let floor_bp = floor_to_bp(floor_pct);
            let state_bucket = state_bucket_for_floor(view, row, floor_pct);
            let outcome = floor_outcome(view, row, hit_idx, horizon_s)?;
            for scope in scopes {
                if !scope.includes_sample_decision(sample_decision) {
                    continue;
                }
                let prediction = predict(
                    index,
                    *scope,
                    route_id,
                    &state_bucket,
                    horizon_s,
                    floor_bp,
                    shrinkage_k,
                );
                let key = CalibrationCellKey::new(scope.as_str(), horizon_s, floor_bp);
                accumulators
                    .entry(key)
                    .or_default()
                    .observe(prediction, outcome.outcome);
            }
        }
    }
    Ok(())
}

fn process_scoring_pass(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    index: &HashMap<AggregationKey, EstimatorRow>,
    calibration_suite: &CalibrationSuite,
    dedupe: &mut DedupeTracker,
) -> Result<BTreeMap<String, ScoreStats>> {
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
    let scopes = score_scopes(cli.prediction_scope);
    let mut scores = scopes
        .iter()
        .map(|scope| {
            let (calibration_status, calibration_n_complete) =
                calibration_suite.scope_status(scope.as_str());
            (
                scope.as_str().to_string(),
                ScoreAccumulator::new(
                    scope.as_str().to_string(),
                    cli.decision_threshold,
                    cli.shrinkage_k,
                    calibration_status.to_string(),
                    calibration_n_complete,
                ),
            )
        })
        .collect::<BTreeMap<_, _>>();
    for rec in manifests {
        if rows_left == 0 {
            break;
        }
        let mut reader =
            open_storage_v2_sidecar_logical_reader(&rec.manifest, DatasetKind::LabeledTrades)
                .with_context(|| format!("open logical V2 reader {}", rec.path.display()))?;
        for batch in &mut reader {
            if rows_left == 0 {
                break;
            }
            let batch = batch?;
            let view = BatchView::new(&batch)?;
            let n = batch.num_rows().min(rows_left as usize);
            rows_left -= n as u64;
            process_score_batch(
                &view,
                n,
                split,
                cli.shrinkage_k,
                index,
                calibration_suite,
                &scopes,
                &mut scores,
                dedupe,
            )?;
        }
    }
    Ok(scores
        .into_iter()
        .map(|(scope, acc)| (scope, acc.finalize()))
        .collect())
}

fn process_score_batch(
    view: &BatchView<'_>,
    n_rows: usize,
    split: &TemporalSplit,
    shrinkage_k: f64,
    index: &HashMap<AggregationKey, EstimatorRow>,
    calibration_suite: &CalibrationSuite,
    scopes: &[PredictionScope],
    scores: &mut BTreeMap<String, ScoreAccumulator>,
    dedupe: &mut DedupeTracker,
) -> Result<()> {
    for row in 0..n_rows {
        let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
        if split.assign(ts) != SplitName::Test {
            continue;
        }
        let sample_decision = required_str(view.sample_decision, row, "sample_decision")?;
        let route_id = required_str(view.route_id, row, "route_id")?;
        let sample_id = required_str(view.sample_id, row, "sample_id")?;
        let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
        let hits = floor_hit_range(view.label_floor_hits, row)?;
        let floor_count = hits.len() as u64;
        let floor_state_buckets = expected_floor_state_buckets(view, row);
        let dedupe_key = supervised_dedupe_row_key(sample_id, horizon_s);
        let dedupe_fingerprint =
            supervised_dedupe_row_fingerprint(view, row, hits.clone(), horizon_s)?;
        if dedupe.observe(
            dedupe_key,
            dedupe_fingerprint,
            SplitName::Test,
            sample_id,
            route_id,
            floor_count,
        ) != DedupeDecision::Unique
        {
            continue;
        }
        for scope in scopes {
            if !scope.includes_sample_decision(sample_decision) {
                continue;
            }
            let serving_curve = predict_serving_curve(
                index,
                calibration_suite,
                *scope,
                route_id,
                &floor_state_buckets,
                shrinkage_k,
            );
            for hit_idx in hits.clone() {
                let floor_pct =
                    required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
                let floor_bp = floor_to_bp(floor_pct);
                let outcome = floor_outcome(view, row, hit_idx, horizon_s)?;
                let prediction = serving_curve.get(&(horizon_s, floor_bp)).and_then(|point| {
                    point.probability.map(|probability| CalibrationApplication {
                        probability,
                        applied: point.calibration_applied,
                    })
                });
                let key = scope.as_str();
                if let Some(score) = scores.get_mut(key) {
                    score.observe(prediction, outcome.outcome);
                }
            }
        }
    }
    Ok(())
}

fn process_exit_policy_replay(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    index: &HashMap<AggregationKey, EstimatorRow>,
    calibration_suite: &CalibrationSuite,
) -> Result<ExitPolicyReplayReport> {
    let mut report = ExitPolicyReplayReport {
        prediction_scope: cli.prediction_scope.as_str().to_string(),
        ..ExitPolicyReplayReport::default()
    };
    let mut selected = HashMap::<String, SelectedPolicyDecision>::new();
    collect_exit_policy_selections(
        manifests,
        split,
        cli,
        index,
        calibration_suite,
        &mut report,
        &mut selected,
    )?;
    evaluate_exit_policy_selections(manifests, split, cli, &mut report, &mut selected)?;
    report.selected_not_evaluated = selected.len() as u64;
    finalize_exit_policy_replay(&mut report);
    Ok(report)
}

fn collect_exit_policy_selections(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    index: &HashMap<AggregationKey, EstimatorRow>,
    calibration_suite: &CalibrationSuite,
    report: &mut ExitPolicyReplayReport,
    selected: &mut HashMap<String, SelectedPolicyDecision>,
) -> Result<()> {
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
    let mut seen_canonical = HashSet::<String>::new();
    for rec in manifests {
        if rows_left == 0 {
            break;
        }
        let mut reader =
            open_storage_v2_sidecar_logical_reader(&rec.manifest, DatasetKind::LabeledTrades)
                .with_context(|| format!("open logical V2 reader {}", rec.path.display()))?;
        for batch in &mut reader {
            if rows_left == 0 {
                break;
            }
            let batch = batch?;
            let view = BatchView::new(&batch)?;
            let n = batch.num_rows().min(rows_left as usize);
            rows_left -= n as u64;
            for row in 0..n {
                let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
                if split.assign(ts) != SplitName::Test {
                    continue;
                }
                let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
                if horizon_s != EXPECTED_HORIZONS_S[0] {
                    continue;
                }
                let sample_decision = required_str(view.sample_decision, row, "sample_decision")?;
                if !cli
                    .prediction_scope
                    .includes_sample_decision(sample_decision)
                {
                    continue;
                }
                let sample_id = required_str(view.sample_id, row, "sample_id")?;
                if !seen_canonical.insert(sample_id.to_string()) {
                    continue;
                }
                let route_id = required_str(view.route_id, row, "route_id")?;
                let entry_locked_pct =
                    required_f32(view.entry_locked_pct, row, "entry_locked_pct")?;
                let floor_state_buckets = expected_floor_state_buckets(&view, row);
                let serving_curve = predict_serving_curve(
                    index,
                    calibration_suite,
                    cli.prediction_scope,
                    route_id,
                    &floor_state_buckets,
                    cli.shrinkage_k,
                );
                report.canonical_rows_seen = report.canonical_rows_seen.saturating_add(1);
                if let Some(candidate) =
                    select_exit_policy_candidate(entry_locked_pct, &serving_curve, report)
                {
                    report.selected = report.selected.saturating_add(1);
                    report.selected_p_hit_sum += candidate.p_hit;
                    report.selected_gross_floor_sum += candidate.gross_floor_pct;
                    report.selected_utility_sum += candidate.utility_score;
                    *report
                        .selected_by_horizon_s
                        .entry(candidate.horizon_s)
                        .or_insert(0) += 1;
                    *report
                        .selected_by_floor_bp
                        .entry(candidate.floor_bp)
                        .or_insert(0) += 1;
                    push_exit_policy_example(report, "selected", sample_id, route_id, &candidate);
                    selected.insert(sample_id.to_string(), SelectedPolicyDecision { candidate });
                } else {
                    report.abstained_no_candidate = report.abstained_no_candidate.saturating_add(1);
                }
            }
        }
    }
    Ok(())
}

fn evaluate_exit_policy_selections(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    report: &mut ExitPolicyReplayReport,
    selected: &mut HashMap<String, SelectedPolicyDecision>,
) -> Result<()> {
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
    for rec in manifests {
        if rows_left == 0 || selected.is_empty() {
            break;
        }
        let mut reader =
            open_storage_v2_sidecar_logical_reader(&rec.manifest, DatasetKind::LabeledTrades)
                .with_context(|| format!("open logical V2 reader {}", rec.path.display()))?;
        for batch in &mut reader {
            if rows_left == 0 || selected.is_empty() {
                break;
            }
            let batch = batch?;
            let view = BatchView::new(&batch)?;
            let n = batch.num_rows().min(rows_left as usize);
            rows_left -= n as u64;
            for row in 0..n {
                let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
                if split.assign(ts) != SplitName::Test {
                    continue;
                }
                let sample_id = required_str(view.sample_id, row, "sample_id")?;
                let Some(decision) = selected.get(sample_id).cloned() else {
                    continue;
                };
                let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
                if horizon_s != decision.candidate.horizon_s {
                    continue;
                }
                let route_id = required_str(view.route_id, row, "route_id")?;
                let Some(hit_idx) = find_floor_hit_idx(&view, row, decision.candidate.floor_bp)?
                else {
                    report.selected_floor_missing = report.selected_floor_missing.saturating_add(1);
                    push_exit_policy_example(
                        report,
                        "selected_floor_missing",
                        sample_id,
                        route_id,
                        &decision.candidate,
                    );
                    selected.remove(sample_id);
                    continue;
                };
                let outcome = floor_outcome(&view, row, hit_idx, horizon_s)?;
                report.evaluated = report.evaluated.saturating_add(1);
                *report
                    .evaluated_by_horizon_s
                    .entry(decision.candidate.horizon_s)
                    .or_insert(0) += 1;
                *report
                    .evaluated_by_floor_bp
                    .entry(decision.candidate.floor_bp)
                    .or_insert(0) += 1;
                match outcome.outcome {
                    FloorOutcomeKind::Realized => {
                        report.realized = report.realized.saturating_add(1);
                        report.complete = report.complete.saturating_add(1);
                    }
                    FloorOutcomeKind::Miss => {
                        report.miss = report.miss.saturating_add(1);
                        report.complete = report.complete.saturating_add(1);
                    }
                    FloorOutcomeKind::Censored => {
                        report.censored = report.censored.saturating_add(1);
                    }
                }
                selected.remove(sample_id);
            }
        }
    }
    Ok(())
}

fn select_exit_policy_candidate(
    entry_locked_pct: f32,
    serving_curve: &BTreeMap<(u32, i32), ServingCurvePoint>,
    report: &mut ExitPolicyReplayReport,
) -> Option<PolicyCandidate> {
    let mut best: Option<PolicyCandidate> = None;
    for point in serving_curve.values() {
        report.candidates_scored = report.candidates_scored.saturating_add(1);
        let Some(candidate) = policy_candidate_from_point(entry_locked_pct, point, report) else {
            continue;
        };
        if best
            .as_ref()
            .map(|current| candidate.utility_score > current.utility_score)
            .unwrap_or(true)
        {
            best = Some(candidate);
        }
    }
    best
}

fn policy_candidate_from_point(
    entry_locked_pct: f32,
    point: &ServingCurvePoint,
    report: &mut ExitPolicyReplayReport,
) -> Option<PolicyCandidate> {
    let gross_floor_pct = point.floor_bp as f64 / 100.0;
    if gross_floor_pct + 1e-12 < EXIT_POLICY_MIN_GROSS_FLOOR_PCT {
        bump_gate_fail(report, "gross_floor_below_min");
        return None;
    }
    if !point.calibration_applied {
        bump_gate_fail(report, "uncalibrated_probability");
        return None;
    }
    let Some(p_hit) = point.probability else {
        bump_gate_fail(report, "missing_p_hit");
        return None;
    };
    if p_hit + 1e-12 < EXIT_POLICY_MIN_P_HIT {
        bump_gate_fail(report, "p_hit_below_min");
        return None;
    }
    let (Some(ci_lower), Some(ci_upper)) = (point.ci_lower, point.ci_upper) else {
        bump_gate_fail(report, "missing_p_hit_interval");
        return None;
    };
    let interval_width = (ci_upper - ci_lower).max(0.0);
    if interval_width > EXIT_POLICY_MAX_P_HIT_INTERVAL_WIDTH + 1e-12 {
        bump_gate_fail(report, "p_hit_interval_too_wide");
        return None;
    }
    let Some(p_censor) = point.p_censor else {
        bump_gate_fail(report, "missing_p_censor");
        return None;
    };
    if p_censor > EXIT_POLICY_MAX_P_CENSOR + 1e-12 {
        bump_gate_fail(report, "p_censor_too_high");
        return None;
    }
    let Some(t_hit_p75_s) = point.t_hit_p75_s else {
        bump_gate_fail(report, "missing_t_hit_p75");
        return None;
    };
    if t_hit_p75_s > EXIT_POLICY_MAX_T_HIT_P75_S {
        bump_gate_fail(report, "t_hit_p75_too_slow");
        return None;
    }
    let utility_score = gross_floor_pct * p_hit
        - p_censor
        - 0.10 * (interval_width / EXIT_POLICY_MAX_P_HIT_INTERVAL_WIDTH).clamp(0.0, 10.0)
        - 0.05 * (t_hit_p75_s as f64 / EXIT_POLICY_MAX_T_HIT_P75_S as f64).clamp(0.0, 10.0);
    Some(PolicyCandidate {
        horizon_s: point.horizon_s,
        floor_bp: point.floor_bp,
        gross_floor_pct,
        exit_target_pct: gross_floor_pct - entry_locked_pct as f64,
        p_hit,
        ci_lower,
        ci_upper,
        p_censor,
        t_hit_p75_s,
        n_total: point.n_total,
        n_complete: point.n_complete,
        utility_score,
    })
}

fn bump_gate_fail(report: &mut ExitPolicyReplayReport, reason: &str) {
    *report
        .gate_fail_counts
        .entry(reason.to_string())
        .or_insert(0) += 1;
}

fn find_floor_hit_idx(view: &BatchView<'_>, row: usize, floor_bp: i32) -> Result<Option<usize>> {
    for hit_idx in floor_hit_range(view.label_floor_hits, row)? {
        let floor_pct = required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
        if floor_to_bp(floor_pct) == floor_bp {
            return Ok(Some(hit_idx));
        }
    }
    Ok(None)
}

fn push_exit_policy_example(
    report: &mut ExitPolicyReplayReport,
    reason: &str,
    sample_id: &str,
    route_id: &str,
    candidate: &PolicyCandidate,
) {
    if report.examples.len() >= 50 {
        return;
    }
    report.examples.push(format!(
        "reason={} sample_id={} route_id={} horizon_s={} floor_bp={} gross_floor_pct={} exit_target_pct={} p_hit={} ci=[{},{}] p_censor={} t_hit_p75_s={} n_total={} n_complete={} utility={}",
        reason,
        sample_id,
        route_id,
        candidate.horizon_s,
        candidate.floor_bp,
        candidate.gross_floor_pct,
        candidate.exit_target_pct,
        candidate.p_hit,
        candidate.ci_lower,
        candidate.ci_upper,
        candidate.p_censor,
        candidate.t_hit_p75_s,
        candidate.n_total,
        candidate.n_complete,
        candidate.utility_score
    ));
}

fn finalize_exit_policy_replay(report: &mut ExitPolicyReplayReport) {
    if report.complete > 0 {
        report.gross_precision_complete = Some(report.realized as f64 / report.complete as f64);
    }
    if report.evaluated > 0 {
        report.gross_realized_rate_all_evaluated =
            Some(report.realized as f64 / report.evaluated as f64);
        report.censor_rate_evaluated = Some(report.censored as f64 / report.evaluated as f64);
    }
    if report.selected > 0 {
        let denom = report.selected as f64;
        report.mean_selected_p_hit = Some(report.selected_p_hit_sum / denom);
        report.mean_selected_gross_floor_pct = Some(report.selected_gross_floor_sum / denom);
        report.mean_selected_utility_score = Some(report.selected_utility_sum / denom);
    }
}

fn expected_floor_state_buckets(view: &BatchView<'_>, row: usize) -> BTreeMap<i32, String> {
    EXPECTED_FLOOR_BP
        .iter()
        .copied()
        .map(|floor_bp| {
            (
                floor_bp,
                state_bucket_for_floor(view, row, floor_bp as f32 / 100.0),
            )
        })
        .collect()
}

fn predict_serving_curve(
    index: &HashMap<AggregationKey, EstimatorRow>,
    calibration_suite: &CalibrationSuite,
    scope: PredictionScope,
    route_id: &str,
    floor_state_buckets: &BTreeMap<i32, String>,
    shrinkage_k: f64,
) -> BTreeMap<(u32, i32), ServingCurvePoint> {
    let mut points = Vec::new();
    for &horizon_s in EXPECTED_HORIZONS_S {
        for &floor_bp in EXPECTED_FLOOR_BP {
            let state_bucket = floor_state_buckets
                .get(&floor_bp)
                .map(String::as_str)
                .unwrap_or("exit_target_unknown");
            let point = predict_serving_point(
                index,
                scope,
                route_id,
                state_bucket,
                horizon_s,
                floor_bp,
                shrinkage_k,
                calibration_suite,
            );
            points.push(point);
        }
    }

    project_serving_curve_points(&mut points);
    points
        .into_iter()
        .map(|point| ((point.horizon_s, point.floor_bp), point))
        .collect()
}

fn predict_serving_point(
    index: &HashMap<AggregationKey, EstimatorRow>,
    scope: PredictionScope,
    route_id: &str,
    state_bucket: &str,
    horizon_s: u32,
    floor_bp: i32,
    shrinkage_k: f64,
    calibration_suite: &CalibrationSuite,
) -> ServingCurvePoint {
    let scope_str = scope.as_str().to_string();
    let route_key = AggregationKey {
        scope: scope_str.clone(),
        level: AggregationLevel::Route,
        entity: route_id.to_string(),
        horizon_s,
        floor_bp,
    };
    let route_row = index.get(&route_key);
    let state_key = AggregationKey {
        scope: scope_str.clone(),
        level: AggregationLevel::GlobalState,
        entity: state_bucket.to_string(),
        horizon_s,
        floor_bp,
    };
    let state_row = index.get(&state_key);
    let global_key = AggregationKey {
        scope: scope_str,
        level: AggregationLevel::Global,
        entity: "*".to_string(),
        horizon_s,
        floor_bp,
    };
    let global_row = index.get(&global_key);
    let prior_row = state_row.or(global_row);
    let probability = shrink_serving_component_prediction(route_row, prior_row, shrinkage_k)
        .or_else(|| state_row.and_then(serving_component_probability))
        .or_else(|| route_row.and_then(serving_component_probability))
        .or_else(|| global_row.and_then(serving_component_probability));
    let calibration_applied = calibration_suite
        .model(scope.as_str(), horizon_s, floor_bp)
        .map(|model| model.status == "ok")
        .unwrap_or(false);
    let mut point = if let Some(route) = route_row {
        if let Some(prior) = prior_row {
            let weight = route.n_total as f64 / (route.n_total as f64 + shrinkage_k);
            combined_serving_point(horizon_s, floor_bp, route, prior, weight, probability)
        } else {
            row_serving_point(horizon_s, floor_bp, route, probability)
        }
    } else if let Some(row) = state_row.or(global_row) {
        row_serving_point(horizon_s, floor_bp, row, probability)
    } else {
        ServingCurvePoint {
            horizon_s,
            floor_bp,
            probability,
            ci_lower: None,
            ci_upper: None,
            p_censor: None,
            t_hit_p75_s: None,
            n_total: 0,
            n_complete: 0,
            calibration_applied,
        }
    };
    point.calibration_applied = calibration_applied;
    point
}

fn row_serving_point(
    horizon_s: u32,
    floor_bp: i32,
    row: &EstimatorRow,
    probability: Option<f64>,
) -> ServingCurvePoint {
    ServingCurvePoint {
        horizon_s,
        floor_bp,
        probability,
        ci_lower: row.p_hit_ci_lower,
        ci_upper: row.p_hit_ci_upper,
        p_censor: Some(row.p_censor),
        t_hit_p75_s: row.t_hit_conditional_p75_s,
        n_total: row.n_total,
        n_complete: row.n_complete,
        calibration_applied: row.p_hit_calibration_applied,
    }
}

fn combined_serving_point(
    horizon_s: u32,
    floor_bp: i32,
    route: &EstimatorRow,
    prior: &EstimatorRow,
    weight: f64,
    probability: Option<f64>,
) -> ServingCurvePoint {
    let combine = |a: Option<f64>, b: Option<f64>| match (a, b) {
        (Some(a), Some(b)) => Some((weight * a + (1.0 - weight) * b).clamp(0.0, 1.0)),
        (Some(a), None) => Some(a.clamp(0.0, 1.0)),
        (None, Some(b)) => Some(b.clamp(0.0, 1.0)),
        (None, None) => None,
    };
    let ci_lower = combine(route.p_hit_ci_lower, prior.p_hit_ci_lower);
    let ci_upper = combine(route.p_hit_ci_upper, prior.p_hit_ci_upper);
    let p_censor =
        Some((weight * route.p_censor + (1.0 - weight) * prior.p_censor).clamp(0.0, 1.0));
    let t_hit_p75_s = match (route.t_hit_conditional_p75_s, prior.t_hit_conditional_p75_s) {
        (Some(a), Some(b)) => Some(a.max(b)),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    };
    ServingCurvePoint {
        horizon_s,
        floor_bp,
        probability,
        ci_lower,
        ci_upper,
        p_censor,
        t_hit_p75_s,
        n_total: route.n_total,
        n_complete: route.n_complete,
        calibration_applied: route.p_hit_calibration_applied && prior.p_hit_calibration_applied,
    }
}

fn project_serving_curve_points(points: &mut [ServingCurvePoint]) {
    let present = points
        .iter()
        .enumerate()
        .filter_map(|(idx, point)| point.probability.map(|p| (idx, p.clamp(0.0, 1.0))))
        .collect::<Vec<_>>();
    if present.len() < 2 {
        return;
    }
    let mut index_to_local = HashMap::<usize, usize>::new();
    let mut values = Vec::with_capacity(present.len());
    let weights = vec![1.0; present.len()];
    for (local_idx, (point_idx, probability)) in present.iter().copied().enumerate() {
        index_to_local.insert(point_idx, local_idx);
        values.push(probability);
    }

    let mut by_floor = BTreeMap::<i32, Vec<usize>>::new();
    let mut by_horizon = BTreeMap::<u32, Vec<usize>>::new();
    for (point_idx, _) in present.iter().copied() {
        let Some(&local_idx) = index_to_local.get(&point_idx) else {
            continue;
        };
        by_floor
            .entry(points[point_idx].floor_bp)
            .or_default()
            .push(local_idx);
        by_horizon
            .entry(points[point_idx].horizon_s)
            .or_default()
            .push(local_idx);
    }
    for positions in by_floor.values_mut() {
        positions.sort_by_key(|local_idx| points[present[*local_idx].0].horizon_s);
    }
    for positions in by_horizon.values_mut() {
        positions.sort_by_key(|local_idx| points[present[*local_idx].0].floor_bp);
    }

    for _ in 0..MONOTONICITY_PROJECTION_MAX_ITERATIONS {
        let mut max_step: f64 = 0.0;
        for positions in by_floor.values() {
            max_step = max_step.max(apply_isotonic_sequence(
                positions,
                &mut values,
                &weights,
                1.0,
            ));
        }
        for positions in by_horizon.values() {
            max_step = max_step.max(apply_isotonic_sequence(
                positions,
                &mut values,
                &weights,
                -1.0,
            ));
        }
        if max_step <= MONOTONICITY_PROJECTION_TOLERANCE {
            break;
        }
    }

    for (local_idx, (point_idx, _)) in present.iter().copied().enumerate() {
        let projected = values[local_idx].clamp(0.0, 1.0);
        let before = points[point_idx].probability.unwrap_or(projected);
        let delta = projected - before;
        points[point_idx].probability = Some(projected);
        if let Some(lower) = points[point_idx].ci_lower {
            points[point_idx].ci_lower = Some((lower + delta).clamp(0.0, projected));
        }
        if let Some(upper) = points[point_idx].ci_upper {
            points[point_idx].ci_upper = Some((upper + delta).clamp(projected, 1.0));
        }
    }
}

fn score_scopes(primary: PredictionScope) -> Vec<PredictionScope> {
    let mut out = vec![
        PredictionScope::All,
        PredictionScope::Accept,
        PredictionScope::Background,
    ];
    if !out.contains(&primary) {
        out.push(primary);
    }
    out.sort();
    out.dedup();
    out
}

fn supervised_dedupe_row_key(sample_id: &str, horizon_s: u32) -> SupervisedDedupeRowKey {
    let mut state = FNV_OFFSET_128;
    fnv1a_update(&mut state, b"supervised_dedupe_row_key_v1");
    fnv1a_update(&mut state, sample_id.as_bytes());
    fnv1a_update(&mut state, &horizon_s.to_le_bytes());
    SupervisedDedupeRowKey {
        digest: state,
        horizon_s,
    }
}

fn supervised_dedupe_row_fingerprint(
    view: &BatchView<'_>,
    row: usize,
    hits: std::ops::Range<usize>,
    horizon_s: u32,
) -> Result<SupervisedDedupeFingerprint> {
    let mut state = FNV_OFFSET_128;
    fnv1a_update(&mut state, b"supervised_dedupe_row_fingerprint_v1");
    update_hash_str(&mut state, required_str(view.route_id, row, "route_id")?);
    update_hash_str(
        &mut state,
        required_str(view.sample_decision, row, "sample_decision")?,
    );
    update_hash_u64(
        &mut state,
        required_u64(view.ts_emit_ns, row, "ts_emit_ns")?,
    );
    update_hash_u32(&mut state, horizon_s);
    update_hash_u64(
        &mut state,
        required_u64(view.observed_until_ns, row, "observed_until_ns")?,
    );
    update_hash_u64(
        &mut state,
        required_u64(
            view.label_window_closed_at_ns,
            row,
            "label_window_closed_at_ns",
        )?,
    );
    update_hash_u64(
        &mut state,
        required_u64(view.closed_ts_ns, row, "closed_ts_ns")?,
    );
    update_hash_u64(
        &mut state,
        required_u64(view.written_ts_ns, row, "written_ts_ns")?,
    );
    update_hash_optional_f32(
        &mut state,
        optional_f32(view.label_sampling_probability, row),
    );
    update_hash_optional_f32(
        &mut state,
        optional_f32(Some(view.sampling_probability), row),
    );
    update_hash_u32(&mut state, hits.len() as u32);
    for hit_idx in hits {
        let floor_pct = required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
        let floor_bp = floor_to_bp(floor_pct);
        let outcome = floor_outcome(view, row, hit_idx, horizon_s)?;
        let state_bucket = state_bucket_for_floor(view, row, floor_pct);
        update_hash_i32(&mut state, floor_bp);
        update_hash_str(&mut state, &state_bucket);
        update_hash_u32(&mut state, floor_outcome_kind_code(outcome.outcome));
        update_hash_u32(&mut state, outcome.duration_s);
        update_hash_optional_u64(
            &mut state,
            optional_u64(Some(view.hit_first_ts_ns), hit_idx),
        );
        update_hash_optional_u32(
            &mut state,
            optional_u32(Some(view.hit_t_to_first_s), hit_idx),
        );
        update_hash_optional_f32(
            &mut state,
            optional_f32(Some(view.hit_first_exit_pct), hit_idx),
        );
        update_hash_optional_bool(&mut state, optional_bool(Some(view.hit_realized), hit_idx));
    }
    Ok(SupervisedDedupeFingerprint { digest: state })
}

fn floor_outcome_kind_code(outcome: FloorOutcomeKind) -> u32 {
    match outcome {
        FloorOutcomeKind::Realized => 1,
        FloorOutcomeKind::Miss => 2,
        FloorOutcomeKind::Censored => 3,
    }
}

fn probability_key(p: f64) -> u64 {
    (p.clamp(0.0, 1.0) * CALIBRATION_PROB_SCALE).round() as u64
}

fn probability_from_key(key: u64) -> f64 {
    (key as f64 / CALIBRATION_PROB_SCALE).clamp(0.0, 1.0)
}

fn fit_isotonic_blocks(buckets: &BTreeMap<u64, CalibrationBucket>) -> Vec<IsotonicBlock> {
    let mut blocks = Vec::<IsotonicBlock>::new();
    for (&key, bucket) in buckets {
        if bucket.n == 0 {
            continue;
        }
        blocks.push(IsotonicBlock {
            lower_key: key,
            upper_key: key,
            n: bucket.n,
            hits: bucket.hits,
            calibrated_p: bucket.hits as f64 / bucket.n as f64,
        });
        while blocks.len() >= 2 {
            let len = blocks.len();
            if blocks[len - 2].calibrated_p <= blocks[len - 1].calibrated_p {
                break;
            }
            let right = blocks.pop().expect("right block");
            let left = blocks.pop().expect("left block");
            let n = left.n.saturating_add(right.n);
            let hits = left.hits.saturating_add(right.hits);
            blocks.push(IsotonicBlock {
                lower_key: left.lower_key,
                upper_key: right.upper_key,
                n,
                hits,
                calibrated_p: if n > 0 { hits as f64 / n as f64 } else { 0.0 },
            });
        }
    }
    blocks
}

fn calibration_quality(
    buckets: &BTreeMap<u64, CalibrationBucket>,
    knots: Option<&[CalibrationKnot]>,
) -> CalibrationQuality {
    let mut quality = CalibrationQuality {
        bins: (0..10)
            .map(|idx| ScoreBin {
                bin_lower: idx as f64 / 10.0,
                bin_upper: (idx + 1) as f64 / 10.0,
                n: 0,
                mean_predicted: None,
                empirical_hit_rate: None,
            })
            .collect(),
        ..CalibrationQuality::default()
    };
    let mut brier_sum = 0.0;
    let mut bin_acc = [BinAccumulator::default(); 10];
    for (&key, bucket) in buckets {
        if bucket.n == 0 {
            continue;
        }
        let raw_p = probability_from_key(key);
        let p = knots
            .map(|knots| calibrate_with_knots(knots, raw_p))
            .unwrap_or(raw_p);
        let y_mean = bucket.hits as f64 / bucket.n as f64;
        let misses = bucket.n.saturating_sub(bucket.hits);
        brier_sum += bucket.hits as f64 * (p - 1.0) * (p - 1.0) + misses as f64 * p * p;
        quality.n_complete = quality.n_complete.saturating_add(bucket.n);
        let bin = ((p * 10.0).floor() as usize).min(9);
        bin_acc[bin].n = bin_acc[bin].n.saturating_add(bucket.n);
        bin_acc[bin].pred_sum += p * bucket.n as f64;
        bin_acc[bin].hit_sum += y_mean * bucket.n as f64;
    }
    if quality.n_complete > 0 {
        quality.brier = Some(brier_sum / quality.n_complete as f64);
        let mut ece = 0.0;
        quality.bins.clear();
        for (idx, acc) in bin_acc.iter().enumerate() {
            let (mean_predicted, empirical_hit_rate) = if acc.n > 0 {
                let mean = acc.pred_sum / acc.n as f64;
                let hit = acc.hit_sum / acc.n as f64;
                ece += (acc.n as f64 / quality.n_complete as f64) * (mean - hit).abs();
                (Some(mean), Some(hit))
            } else {
                (None, None)
            };
            quality.bins.push(ScoreBin {
                bin_lower: idx as f64 / 10.0,
                bin_upper: (idx + 1) as f64 / 10.0,
                n: acc.n,
                mean_predicted,
                empirical_hit_rate,
            });
        }
        quality.ece_10bin = Some(ece);
    }
    quality
}

fn calibrate_with_knots(knots: &[CalibrationKnot], raw_p: f64) -> f64 {
    if knots.is_empty() {
        return raw_p.clamp(0.0, 1.0);
    }
    let p = raw_p.clamp(0.0, 1.0);
    for knot in knots {
        if p <= knot.raw_upper {
            return knot.calibrated_p;
        }
    }
    knots.last().map(|knot| knot.calibrated_p).unwrap_or(p)
}

fn update_aggregates(
    aggregates: &mut HashMap<AggregationKey, GroupStats>,
    update: AggregateUpdate<'_>,
) {
    let route_key = AggregationKey {
        scope: update.scope.to_string(),
        level: AggregationLevel::Route,
        entity: update.route_id.to_string(),
        horizon_s: update.horizon_s,
        floor_bp: update.floor_bp,
    };
    aggregates.entry(route_key).or_default().update(
        update.outcome,
        update.horizon_s,
        update.label_pi,
    );

    let state_key = AggregationKey {
        scope: update.scope.to_string(),
        level: AggregationLevel::GlobalState,
        entity: update.state_bucket.to_string(),
        horizon_s: update.horizon_s,
        floor_bp: update.floor_bp,
    };
    aggregates.entry(state_key).or_default().update(
        update.outcome,
        update.horizon_s,
        update.label_pi,
    );

    let global_key = AggregationKey {
        scope: update.scope.to_string(),
        level: AggregationLevel::Global,
        entity: "*".to_string(),
        horizon_s: update.horizon_s,
        floor_bp: update.floor_bp,
    };
    aggregates.entry(global_key).or_default().update(
        update.outcome,
        update.horizon_s,
        update.label_pi,
    );
}

fn build_prediction_index(rows: &[EstimatorRow]) -> HashMap<AggregationKey, EstimatorRow> {
    let mut index = HashMap::new();
    for row in rows {
        if row.p_hit_km.is_none() {
            continue;
        }
        let level = match row.aggregation_level.as_str() {
            "route" => AggregationLevel::Route,
            "global_state" => AggregationLevel::GlobalState,
            "global" => AggregationLevel::Global,
            _ => continue,
        };
        index.insert(
            AggregationKey {
                scope: row.population_scope.clone(),
                level,
                entity: row.entity_key.clone(),
                horizon_s: row.horizon_s,
                floor_bp: floor_to_bp(row.floor_pct),
            },
            row.clone(),
        );
    }
    index
}

fn predict(
    index: &HashMap<AggregationKey, EstimatorRow>,
    scope: PredictionScope,
    route_id: &str,
    state_bucket: &str,
    horizon_s: u32,
    floor_bp: i32,
    shrinkage_k: f64,
) -> Option<f64> {
    let scope = scope.as_str().to_string();
    let route_key = AggregationKey {
        scope: scope.clone(),
        level: AggregationLevel::Route,
        entity: route_id.to_string(),
        horizon_s,
        floor_bp,
    };
    let route_row = index.get(&route_key);

    let state_key = AggregationKey {
        scope: scope.clone(),
        level: AggregationLevel::GlobalState,
        entity: state_bucket.to_string(),
        horizon_s,
        floor_bp,
    };
    let state_row = index.get(&state_key);

    let global_key = AggregationKey {
        scope,
        level: AggregationLevel::Global,
        entity: "*".to_string(),
        horizon_s,
        floor_bp,
    };
    let global_row = index.get(&global_key);

    shrink_prediction(route_row, state_row.or(global_row), shrinkage_k)
        .or_else(|| state_row.and_then(prediction_probability))
        .or_else(|| route_row.and_then(prediction_probability))
        .or_else(|| global_row.and_then(prediction_probability))
}

fn prediction_probability(row: &EstimatorRow) -> Option<f64> {
    row.p_hit_km
}

fn shrink_prediction(
    route_row: Option<&EstimatorRow>,
    prior_row: Option<&EstimatorRow>,
    shrinkage_k: f64,
) -> Option<f64> {
    let route = route_row?;
    let route_p = prediction_probability(route)?;
    let Some(prior) = prior_row else {
        return Some(route_p);
    };
    let prior_p = prediction_probability(prior)?;
    let weight = route.n_total as f64 / (route.n_total as f64 + shrinkage_k);
    Some((weight * route_p + (1.0 - weight) * prior_p).clamp(0.0, 1.0))
}

fn serving_component_probability(row: &EstimatorRow) -> Option<f64> {
    row.p_hit_serving
}

fn shrink_serving_component_prediction(
    route_row: Option<&EstimatorRow>,
    prior_row: Option<&EstimatorRow>,
    shrinkage_k: f64,
) -> Option<f64> {
    let route = route_row?;
    let route_p = serving_component_probability(route)?;
    let Some(prior) = prior_row else {
        return Some(route_p);
    };
    let prior_p = serving_component_probability(prior)?;
    let weight = route.n_total as f64 / (route.n_total as f64 + shrinkage_k);
    Some((weight * route_p + (1.0 - weight) * prior_p).clamp(0.0, 1.0))
}

struct BatchView<'a> {
    sample_id: &'a StringArray,
    sample_decision: &'a StringArray,
    horizon_s: &'a UInt32Array,
    ts_emit_ns: &'a UInt64Array,
    cycle_seq: &'a UInt32Array,
    schema_version: &'a UInt16Array,
    route_id: &'a StringArray,
    canonical_symbol: &'a StringArray,
    buy_venue: &'a StringArray,
    sell_venue: &'a StringArray,
    buy_market: &'a StringArray,
    sell_market: &'a StringArray,
    runtime_config_hash: &'a StringArray,
    entry_locked_pct: &'a Float32Array,
    exit_start_pct: &'a Float32Array,
    outcome: &'a StringArray,
    censor_reason: &'a StringArray,
    observed_until_ns: &'a UInt64Array,
    label_window_closed_at_ns: &'a UInt64Array,
    closed_ts_ns: &'a UInt64Array,
    written_ts_ns: &'a UInt64Array,
    sampling_tier: &'a StringArray,
    sampling_probability: &'a Float32Array,
    sampling_probability_kind: &'a StringArray,
    features_t0: &'a StructArray,
    policy_metadata: &'a StructArray,
    effective_stride_s: Option<&'a UInt32Array>,
    label_sampling_probability: Option<&'a Float32Array>,
    label_floor_hits: &'a ListArray,
    hit_floor_pct: &'a Float32Array,
    hit_first_ts_ns: &'a UInt64Array,
    hit_first_exit_pct: &'a Float32Array,
    hit_t_to_first_s: &'a UInt32Array,
    hit_realized: &'a BooleanArray,
}

impl<'a> BatchView<'a> {
    fn new(batch: &'a RecordBatch) -> Result<Self> {
        let label_floor_hits = col::<ListArray>(batch, "label_floor_hits")?;
        let hit_values = label_floor_hits.values();
        let hit_struct = hit_values
            .as_any()
            .downcast_ref::<StructArray>()
            .with_context(|| {
                format!(
                    "label_floor_hits values have non-Struct type {:?}",
                    hit_values.data_type()
                )
            })?;
        let policy_metadata = col::<StructArray>(batch, "policy_metadata")?;
        Ok(Self {
            sample_id: col(batch, "sample_id")?,
            sample_decision: col(batch, "sample_decision")?,
            horizon_s: col(batch, "horizon_s")?,
            ts_emit_ns: col(batch, "ts_emit_ns")?,
            cycle_seq: col(batch, "cycle_seq")?,
            schema_version: col(batch, "schema_version")?,
            route_id: col(batch, "route_id")?,
            canonical_symbol: col(batch, "canonical_symbol")?,
            buy_venue: col(batch, "buy_venue")?,
            sell_venue: col(batch, "sell_venue")?,
            buy_market: col(batch, "buy_market")?,
            sell_market: col(batch, "sell_market")?,
            runtime_config_hash: col(batch, "runtime_config_hash")?,
            entry_locked_pct: col(batch, "entry_locked_pct")?,
            exit_start_pct: col(batch, "exit_start_pct")?,
            outcome: col(batch, "outcome")?,
            censor_reason: col(batch, "censor_reason")?,
            observed_until_ns: col(batch, "observed_until_ns")?,
            label_window_closed_at_ns: col(batch, "label_window_closed_at_ns")?,
            closed_ts_ns: col(batch, "closed_ts_ns")?,
            written_ts_ns: col(batch, "written_ts_ns")?,
            sampling_tier: col(batch, "sampling_tier")?,
            sampling_probability: col(batch, "sampling_probability")?,
            sampling_probability_kind: col(batch, "sampling_probability_kind")?,
            features_t0: col(batch, "features_t0")?,
            policy_metadata,
            effective_stride_s: struct_child(policy_metadata, "effective_stride_s"),
            label_sampling_probability: struct_child(policy_metadata, "label_sampling_probability"),
            label_floor_hits,
            hit_floor_pct: struct_child_required(hit_struct, "floor_pct")?,
            hit_first_ts_ns: struct_child_required(hit_struct, "first_exit_ge_floor_ts_ns")?,
            hit_first_exit_pct: struct_child_required(hit_struct, "first_exit_ge_floor_pct")?,
            hit_t_to_first_s: struct_child_required(hit_struct, "t_to_first_hit_s")?,
            hit_realized: struct_child_required(hit_struct, "realized")?,
        })
    }
}

fn audit_row(
    view: &BatchView<'_>,
    row: usize,
    horizon_s: u32,
    audit: &mut DatasetAudit,
) -> Result<()> {
    let schema_version = required_u16(view.schema_version, row, "schema_version")?;
    inc(&mut audit.schema_versions, schema_version);
    if schema_version != LABELED_TRADE_SCHEMA_VERSION {
        push_audit_issue(
            audit,
            format!(
                "schema_version_mismatch row={} value={}",
                audit.rows_read, schema_version
            ),
        );
    }

    inc_str(
        &mut audit.runtime_config_hashes,
        required_str(view.runtime_config_hash, row, "runtime_config_hash")?,
    );
    inc(&mut audit.horizons_s, horizon_s);
    inc_str(
        &mut audit.sample_decisions,
        required_str(view.sample_decision, row, "sample_decision")?,
    );
    inc_str(
        &mut audit.outcomes,
        required_str(view.outcome, row, "outcome")?,
    );
    if !view.censor_reason.is_null(row) {
        inc_str(&mut audit.censor_reasons, view.censor_reason.value(row));
    }
    inc_str(
        &mut audit.sampling_tiers,
        required_str(view.sampling_tier, row, "sampling_tier")?,
    );
    inc_str(
        &mut audit.sampling_probability_kinds,
        required_str(
            view.sampling_probability_kind,
            row,
            "sampling_probability_kind",
        )?,
    );
    if let Some(effective) = view.effective_stride_s {
        if !effective.is_null(row) {
            inc(&mut audit.effective_stride_s, effective.value(row));
        }
    }

    let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
    let closed_at = required_u64(
        view.label_window_closed_at_ns,
        row,
        "label_window_closed_at_ns",
    )?;
    let expected_closed_at = ts.saturating_add(horizon_s as u64 * NS_PER_S);
    if closed_at != expected_closed_at {
        push_audit_issue(
            audit,
            format!(
                "label_window_closed_at_ns_mismatch row={} expected={} got={}",
                audit.rows_read, expected_closed_at, closed_at
            ),
        );
    }
    let observed_until = required_u64(view.observed_until_ns, row, "observed_until_ns")?;
    let closed_ts = required_u64(view.closed_ts_ns, row, "closed_ts_ns")?;
    let written_ts = required_u64(view.written_ts_ns, row, "written_ts_ns")?;
    if observed_until > closed_ts || closed_ts > written_ts {
        push_audit_issue(
            audit,
            format!(
                "timestamp_order_violation row={} observed_until={} closed_ts={} written_ts={}",
                audit.rows_read, observed_until, closed_ts, written_ts
            ),
        );
    }

    let entry = required_f32(view.entry_locked_pct, row, "entry_locked_pct")?;
    let exit = required_f32(view.exit_start_pct, row, "exit_start_pct")?;
    if !entry.is_finite() || !exit.is_finite() || entry + exit > EPS {
        push_audit_issue(
            audit,
            format!(
                "entry_exit_identity_violation row={} entry={} exit={}",
                audit.rows_read, entry, exit
            ),
        );
    }

    let route_id = required_str(view.route_id, row, "route_id")?;
    let sample_id = required_str(view.sample_id, row, "sample_id")?;
    let canonical_symbol = required_str(view.canonical_symbol, row, "canonical_symbol")?;
    let buy_venue = required_str(view.buy_venue, row, "buy_venue")?;
    let sell_venue = required_str(view.sell_venue, row, "sell_venue")?;
    let buy_market = required_str(view.buy_market, row, "buy_market")?;
    let sell_market = required_str(view.sell_market, row, "sell_market")?;
    if sample_id.is_empty() || route_id.is_empty() || canonical_symbol.is_empty() {
        push_audit_issue(audit, format!("empty_identity row={}", audit.rows_read));
    }
    if buy_venue == sell_venue {
        push_audit_issue(
            audit,
            format!("same_venue row={} venue={}", audit.rows_read, buy_venue),
        );
    }
    if buy_market == "SPOT" && sell_market == "SPOT" {
        push_audit_issue(
            audit,
            format!("spot_spot_route row={} route={}", audit.rows_read, route_id),
        );
    }
    if sell_market != "FUTURES" && sell_market != "FUTURES_PERP" {
        push_audit_issue(
            audit,
            format!(
                "sell_market_not_futures row={} route={} sell_market={}",
                audit.rows_read, route_id, sell_market
            ),
        );
    }

    let pi = required_f32(view.sampling_probability, row, "sampling_probability")?;
    if !pi.is_finite() || !(0.0..=1.0).contains(&pi) || pi == 0.0 {
        push_audit_issue(
            audit,
            format!(
                "sampling_probability_invalid row={} value={}",
                audit.rows_read, pi
            ),
        );
    }
    if let Some(label_pi) = optional_f32(view.label_sampling_probability, row) {
        if !label_pi.is_finite() || !(0.0..=1.0).contains(&label_pi) || label_pi == 0.0 {
            push_audit_issue(
                audit,
                format!(
                    "label_sampling_probability_invalid row={} value={}",
                    audit.rows_read, label_pi
                ),
            );
        }
    }

    let hits = floor_hit_range(view.label_floor_hits, row)?;
    inc(
        &mut audit.label_floor_hit_lengths,
        (hits.end - hits.start) as u32,
    );
    audit.floor_rows_seen = audit
        .floor_rows_seen
        .saturating_add((hits.end - hits.start) as u64);
    for hit_idx in hits {
        let floor_pct = required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
        audit_first_hit(
            view,
            FirstHitAuditInput {
                hit_idx,
                ts_emit_ns: ts,
                label_window_closed_at_ns: closed_at,
                entry_locked_pct: entry,
                floor_pct,
            },
            audit,
        )?;
        *audit
            .floor_values
            .entry(format!("{:.6}", floor_pct))
            .or_insert(0) += 1;
    }
    audit_feature(view.features_t0, "entry_rank_percentile_24h", row, audit);
    audit_feature(view.features_t0, "entry_rank_percentile_1h", row, audit);
    audit_feature(view.features_t0, "entry_p50_7d", row, audit);
    audit_feature(
        view.features_t0,
        "p_exit_ge_label_floor_minus_entry_24h",
        row,
        audit,
    );
    audit_feature(
        view.features_t0,
        "p_exit_ge_label_floor_minus_entry_7d",
        row,
        audit,
    );
    audit_feature(view.features_t0, "tail_ratio_p99_p95", row, audit);
    audit_feature(view.features_t0, "time_alive_at_t0_s", row, audit);
    let _ = view.cycle_seq;
    let _ = view.policy_metadata;
    Ok(())
}

fn audit_feature(features: &StructArray, name: &str, row: usize, audit: &mut DatasetAudit) {
    let Some(array) = features.column_by_name(name) else {
        inc_str(&mut audit.feature_null_counts, name);
        return;
    };
    if array.is_null(row) {
        inc_str(&mut audit.feature_null_counts, name);
        return;
    }
    if let Some(values) = array.as_any().downcast_ref::<Float32Array>() {
        if !values.value(row).is_finite() {
            inc_str(&mut audit.feature_nonfinite_counts, name);
        }
    }
}

fn state_bucket_for_floor(view: &BatchView<'_>, row: usize, floor_pct: f32) -> String {
    let entry_rank = probability_like_feature(view.features_t0, "entry_rank_percentile_24h", row);
    let exit_position = exit_target_position_for_floor(view, row, floor_pct);
    let exit_start = optional_f32(Some(view.exit_start_pct), row);
    let alive_s = nonnegative_seconds_feature(view.features_t0, "time_alive_at_t0_s", row);
    format!(
        "{}|{}|{}|{}",
        entry_rank_bucket(entry_rank),
        exit_target_position_bucket(exit_position),
        exit_start_bucket(exit_start),
        alive_bucket(alive_s),
    )
}

fn exit_target_position_for_floor(
    view: &BatchView<'_>,
    row: usize,
    floor_pct: f32,
) -> Option<ExitTargetPosition> {
    let entry = optional_f32(Some(view.entry_locked_pct), row)?;
    if !entry.is_finite() || !floor_pct.is_finite() {
        return None;
    }
    exit_target_position_from_quantiles(
        floor_pct - entry,
        f32_feature(view.features_t0, "exit_p25_24h", row),
        f32_feature(view.features_t0, "exit_p50_24h", row),
        f32_feature(view.features_t0, "exit_p75_24h", row),
        f32_feature(view.features_t0, "exit_p95_24h", row),
    )
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ExitTargetPosition {
    LeP25,
    P25P50,
    P50P75,
    P75P95,
    GtP95,
}

fn exit_target_position_from_quantiles(
    target_pct: f32,
    p25: Option<f32>,
    p50: Option<f32>,
    p75: Option<f32>,
    p95: Option<f32>,
) -> Option<ExitTargetPosition> {
    if !target_pct.is_finite() {
        return None;
    }
    let p25 = finite(p25)?;
    let p50 = finite(p50)?;
    let p75 = finite(p75)?;
    let p95 = finite(p95)?;
    if !(p25 <= p50 && p50 <= p75 && p75 <= p95) {
        return None;
    }
    if target_pct <= p25 {
        Some(ExitTargetPosition::LeP25)
    } else if target_pct <= p50 {
        Some(ExitTargetPosition::P25P50)
    } else if target_pct <= p75 {
        Some(ExitTargetPosition::P50P75)
    } else if target_pct <= p95 {
        Some(ExitTargetPosition::P75P95)
    } else {
        Some(ExitTargetPosition::GtP95)
    }
}

fn finite(value: Option<f32>) -> Option<f32> {
    value.filter(|v| v.is_finite())
}

fn probability_like_feature(features: &StructArray, name: &str, row: usize) -> Option<f32> {
    let value = f32_feature(features, name, row)?;
    if !value.is_finite() || value < 0.0 {
        return None;
    }
    if value <= 1.0 {
        Some(value)
    } else if value <= 100.0 {
        Some(value / 100.0)
    } else {
        None
    }
}

fn f32_feature(features: &StructArray, name: &str, row: usize) -> Option<f32> {
    let array = features.column_by_name(name)?;
    if array.is_null(row) {
        return None;
    }
    array
        .as_any()
        .downcast_ref::<Float32Array>()
        .map(|values| values.value(row))
}

fn nonnegative_seconds_feature(features: &StructArray, name: &str, row: usize) -> Option<u32> {
    let array = features.column_by_name(name)?;
    if array.is_null(row) {
        return None;
    }
    if let Some(values) = array.as_any().downcast_ref::<UInt32Array>() {
        return Some(values.value(row));
    }
    let values = array.as_any().downcast_ref::<Float32Array>()?;
    let value = values.value(row);
    if value.is_finite() && value >= 0.0 {
        Some(value.round() as u32)
    } else {
        None
    }
}

fn entry_rank_bucket(value: Option<f32>) -> &'static str {
    match value {
        Some(v) if v >= 0.995 => "entry_rank_ge_995",
        Some(v) if v >= 0.990 => "entry_rank_990_995",
        Some(v) if v >= 0.980 => "entry_rank_980_990",
        Some(v) if v >= 0.950 => "entry_rank_950_980",
        Some(v) if v >= 0.900 => "entry_rank_900_950",
        Some(_) => "entry_rank_lt_900",
        None => "entry_rank_unknown",
    }
}

fn exit_target_position_bucket(value: Option<ExitTargetPosition>) -> &'static str {
    match value {
        Some(ExitTargetPosition::LeP25) => "exit_target_le_p25",
        Some(ExitTargetPosition::P25P50) => "exit_target_p25_p50",
        Some(ExitTargetPosition::P50P75) => "exit_target_p50_p75",
        Some(ExitTargetPosition::P75P95) => "exit_target_p75_p95",
        Some(ExitTargetPosition::GtP95) => "exit_target_gt_p95",
        None => "exit_target_unknown",
    }
}

fn exit_start_bucket(value: Option<f32>) -> &'static str {
    match value {
        Some(v) if v >= -0.50 => "exit_start_ge_m050",
        Some(v) if v >= -1.00 => "exit_start_m100_m050",
        Some(v) if v >= -2.00 => "exit_start_m200_m100",
        Some(v) if v >= -4.00 => "exit_start_m400_m200",
        Some(_) => "exit_start_lt_m400",
        None => "exit_start_unknown",
    }
}

fn alive_bucket(value: Option<u32>) -> &'static str {
    match value {
        Some(v) if v <= 15 => "alive_le_15s",
        Some(v) if v <= 60 => "alive_15_60s",
        Some(v) if v <= 300 => "alive_60_300s",
        Some(v) if v <= 900 => "alive_300_900s",
        Some(_) => "alive_gt_900s",
        None => "alive_unknown",
    }
}

fn audit_first_hit(
    view: &BatchView<'_>,
    input: FirstHitAuditInput,
    audit: &mut DatasetAudit,
) -> Result<()> {
    let hit_idx = input.hit_idx;
    let realized_flag = !view.hit_realized.is_null(hit_idx) && view.hit_realized.value(hit_idx);
    let has_ts = !view.hit_first_ts_ns.is_null(hit_idx);
    if !realized_flag && !has_ts {
        return Ok(());
    }
    if realized_flag && !has_ts {
        push_audit_issue(
            audit,
            format!(
                "realized_floor_without_first_hit_ts row={} hit_idx={}",
                audit.rows_read, hit_idx
            ),
        );
        return Ok(());
    }
    if !realized_flag && has_ts {
        push_audit_issue(
            audit,
            format!(
                "unrealized_floor_with_first_hit_ts row={} hit_idx={}",
                audit.rows_read, hit_idx
            ),
        );
        return Ok(());
    }

    let first_ts = view.hit_first_ts_ns.value(hit_idx);
    if first_ts <= input.ts_emit_ns || first_ts > input.label_window_closed_at_ns {
        push_audit_issue(
            audit,
            format!(
                "first_hit_outside_window row={} hit_idx={} ts_emit={} first_ts={} closed_at={}",
                audit.rows_read,
                hit_idx,
                input.ts_emit_ns,
                first_ts,
                input.label_window_closed_at_ns
            ),
        );
    }
    if view.hit_t_to_first_s.is_null(hit_idx) {
        push_audit_issue(
            audit,
            format!(
                "first_hit_without_duration row={} hit_idx={}",
                audit.rows_read, hit_idx
            ),
        );
    } else {
        let expected_s = first_ts.saturating_sub(input.ts_emit_ns) / NS_PER_S;
        let actual_s = view.hit_t_to_first_s.value(hit_idx) as u64;
        if expected_s.abs_diff(actual_s) > 1 {
            push_audit_issue(
                audit,
                format!(
                    "first_hit_duration_mismatch row={} hit_idx={} expected_s={} actual_s={}",
                    audit.rows_read, hit_idx, expected_s, actual_s
                ),
            );
        }
    }
    if view.hit_first_exit_pct.is_null(hit_idx) {
        push_audit_issue(
            audit,
            format!(
                "first_hit_without_exit_pct row={} hit_idx={}",
                audit.rows_read, hit_idx
            ),
        );
    } else {
        let exit_pct = view.hit_first_exit_pct.value(hit_idx);
        if !exit_pct.is_finite() || input.entry_locked_pct + exit_pct + EPS < input.floor_pct {
            push_audit_issue(
                audit,
                format!(
                    "first_hit_below_floor row={} hit_idx={} entry={} exit={} floor={}",
                    audit.rows_read, hit_idx, input.entry_locked_pct, exit_pct, input.floor_pct
                ),
            );
        }
    }
    Ok(())
}

fn push_audit_issue(audit: &mut DatasetAudit, issue: String) {
    if audit.issues.len() < MAX_AUDIT_ISSUES {
        audit.issues.push(issue);
    } else {
        audit.issues_truncated = audit.issues_truncated.saturating_add(1);
    }
}

fn floor_outcome(
    view: &BatchView<'_>,
    row: usize,
    hit_idx: usize,
    horizon_s: u32,
) -> Result<FloorOutcome> {
    let realized_flag = !view.hit_realized.is_null(hit_idx) && view.hit_realized.value(hit_idx);
    if realized_flag {
        if view.hit_first_ts_ns.is_null(hit_idx) || view.hit_t_to_first_s.is_null(hit_idx) {
            bail!(
                "realized floor missing first-hit fields at row {} hit_idx {}",
                row,
                hit_idx
            );
        }
        let duration = required_u32(
            view.hit_t_to_first_s,
            hit_idx,
            "label_floor_hits.t_to_first_hit_s",
        )?;
        return Ok(FloorOutcome {
            outcome: FloorOutcomeKind::Realized,
            duration_s: duration.min(horizon_s),
        });
    }
    let observed_until = required_u64(view.observed_until_ns, row, "observed_until_ns")?;
    let closed_at = required_u64(
        view.label_window_closed_at_ns,
        row,
        "label_window_closed_at_ns",
    )?;
    if observed_until >= closed_at {
        return Ok(FloorOutcome {
            outcome: FloorOutcomeKind::Miss,
            duration_s: horizon_s,
        });
    }
    let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
    let duration = observed_until.saturating_sub(ts) / NS_PER_S;
    Ok(FloorOutcome {
        outcome: FloorOutcomeKind::Censored,
        duration_s: (duration as u32).min(horizon_s),
    })
}

fn floor_hit_range(list: &ListArray, row: usize) -> Result<std::ops::Range<usize>> {
    if list.is_null(row) {
        bail!("label_floor_hits is null at row {}", row);
    }
    let offsets = list.value_offsets();
    Ok(offsets[row] as usize..offsets[row + 1] as usize)
}

fn kaplan_meier(stats: &GroupStats) -> KmEstimate {
    kaplan_meier_from_parts(
        stats.n_total,
        &stats.event_counts,
        &stats.censor_before_horizon_counts,
    )
}

fn kaplan_meier_from_parts(
    n_total: u64,
    event_counts: &BTreeMap<u32, u64>,
    censor_before_horizon_counts: &BTreeMap<u32, u64>,
) -> KmEstimate {
    if n_total == 0 {
        return KmEstimate {
            p_hit: None,
            ci_lower: None,
            ci_upper: None,
        };
    }
    let mut times = BTreeMap::<u32, (u64, u64)>::new();
    for (&t, &d) in event_counts {
        times.entry(t).or_default().0 = d;
    }
    for (&t, &c) in censor_before_horizon_counts {
        times.entry(t).or_default().1 = c;
    }
    let mut at_risk = n_total as f64;
    let mut survival = 1.0f64;
    let mut greenwood = 0.0f64;
    for (_time, (events, censors)) in times {
        let d = events as f64;
        if at_risk <= 0.0 {
            break;
        }
        if d > 0.0 {
            if d < at_risk {
                survival *= 1.0 - d / at_risk;
                greenwood += d / (at_risk * (at_risk - d));
            } else {
                survival = 0.0;
            }
        }
        at_risk -= d + censors as f64;
    }
    let p_hit = (1.0 - survival).clamp(0.0, 1.0);
    let (ci_lower, ci_upper) = km_loglog_ci_for_p_hit(survival, greenwood);
    KmEstimate {
        p_hit: Some(p_hit),
        ci_lower,
        ci_upper,
    }
}

fn km_loglog_ci_for_p_hit(survival: f64, greenwood: f64) -> (Option<f64>, Option<f64>) {
    if !survival.is_finite() || survival <= 0.0 {
        return (Some(1.0), Some(1.0));
    }
    if survival >= 1.0 || greenwood <= 0.0 || !greenwood.is_finite() {
        let p = (1.0 - survival).clamp(0.0, 1.0);
        return (Some(p), Some(p));
    }
    let log_s = survival.ln();
    if log_s == 0.0 {
        let p = (1.0 - survival).clamp(0.0, 1.0);
        return (Some(p), Some(p));
    }
    let z = 1.959_963_984_540_054_f64;
    let se = greenwood.sqrt() / log_s.abs();
    let lower_s = survival.powf((z * se).exp()).clamp(0.0, 1.0);
    let upper_s = survival.powf((-z * se).exp()).clamp(0.0, 1.0);
    let lower_p = (1.0 - upper_s).clamp(0.0, 1.0);
    let upper_p = (1.0 - lower_s).clamp(0.0, 1.0);
    (Some(lower_p), Some(upper_p))
}

fn quantile_from_counts(counts: &BTreeMap<u32, u64>, q: f64) -> Option<u32> {
    let total: u64 = counts.values().sum();
    if total == 0 {
        return None;
    }
    let target = ((total as f64) * q).ceil().max(1.0) as u64;
    let mut acc = 0u64;
    for (&value, &count) in counts {
        acc = acc.saturating_add(count);
        if acc >= target {
            return Some(value);
        }
    }
    counts.keys().next_back().copied()
}

fn monotonicity_audit(rows: &[EstimatorRow]) -> MonotonicityAudit {
    monotonicity_audit_for(rows, "p_hit_km", |row| row.p_hit_km)
}

fn serving_monotonicity_audit(rows: &[EstimatorRow]) -> MonotonicityAudit {
    monotonicity_audit_for(rows, "p_hit_serving", |row| row.p_hit_serving)
}

fn monotonicity_audit_for<F>(
    rows: &[EstimatorRow],
    probability_field: &str,
    probability: F,
) -> MonotonicityAudit
where
    F: Fn(&EstimatorRow) -> Option<f64> + Copy,
{
    let mut audit = MonotonicityAudit {
        probability_field: probability_field.to_string(),
        ..MonotonicityAudit::default()
    };
    let mut curves = BTreeMap::<(String, String, String), Vec<&EstimatorRow>>::new();
    for row in rows {
        if probability(row).is_some() {
            curves
                .entry((
                    row.population_scope.clone(),
                    row.aggregation_level.clone(),
                    row.entity_key.clone(),
                ))
                .or_default()
                .push(row);
        }
    }

    for ((scope, level, entity), mut curve_rows) in curves {
        audit.checked_curves = audit.checked_curves.saturating_add(1);
        curve_rows.sort_by(|a, b| {
            a.horizon_s.cmp(&b.horizon_s).then_with(|| {
                a.floor_pct
                    .partial_cmp(&b.floor_pct)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
        });

        let mut by_floor = BTreeMap::<i32, Vec<&EstimatorRow>>::new();
        let mut by_horizon = BTreeMap::<u32, Vec<&EstimatorRow>>::new();
        for row in curve_rows {
            by_floor
                .entry(floor_to_bp(row.floor_pct))
                .or_default()
                .push(row);
            by_horizon.entry(row.horizon_s).or_default().push(row);
        }

        for (floor_bp, mut rows) in by_floor {
            rows.sort_by_key(|row| row.horizon_s);
            for pair in rows.windows(2) {
                let a = pair[0];
                let b = pair[1];
                if let (Some(pa), Some(pb)) = (probability(a), probability(b)) {
                    if pb + 1e-12 < pa {
                        audit.horizon_monotonicity_violations =
                            audit.horizon_monotonicity_violations.saturating_add(1);
                        push_monotonicity_example(
                            &mut audit,
                            format!(
                                "scope={} level={} entity={} floor_bp={} horizon {}->{}, p {}->{}",
                                scope, level, entity, floor_bp, a.horizon_s, b.horizon_s, pa, pb
                            ),
                        );
                    }
                }
            }
        }

        for (horizon_s, mut rows) in by_horizon {
            rows.sort_by(|a, b| {
                a.floor_pct
                    .partial_cmp(&b.floor_pct)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            for pair in rows.windows(2) {
                let a = pair[0];
                let b = pair[1];
                if let (Some(pa), Some(pb)) = (probability(a), probability(b)) {
                    if pb > pa + 1e-12 {
                        audit.floor_monotonicity_violations =
                            audit.floor_monotonicity_violations.saturating_add(1);
                        push_monotonicity_example(
                            &mut audit,
                            format!(
                                "scope={} level={} entity={} horizon={} floor {}->{}, p {}->{}",
                                scope, level, entity, horizon_s, a.floor_pct, b.floor_pct, pa, pb
                            ),
                        );
                    }
                }
            }
        }
    }
    audit
}

fn push_monotonicity_example(audit: &mut MonotonicityAudit, example: String) {
    if audit.examples.len() < 50 {
        audit.examples.push(example);
    }
}

fn audit_public_interval_alignment(rows: &[EstimatorRow]) -> PublicIntervalAudit {
    let mut audit = PublicIntervalAudit::default();
    for row in rows {
        audit.checked_rows = audit.checked_rows.saturating_add(1);
        let Some(p) = row.p_hit_serving else {
            audit.missing_probability_rows = audit.missing_probability_rows.saturating_add(1);
            push_public_interval_example(&mut audit, "missing_probability", row, None, None, None);
            continue;
        };
        let (Some(lower), Some(upper)) = (row.p_hit_ci_lower, row.p_hit_ci_upper) else {
            audit.missing_interval_rows = audit.missing_interval_rows.saturating_add(1);
            push_public_interval_example(&mut audit, "missing_interval", row, Some(p), None, None);
            continue;
        };
        if p + 1e-12 < lower {
            audit.outside_interval_rows = audit.outside_interval_rows.saturating_add(1);
            audit.max_below_lower = audit.max_below_lower.max(lower - p);
            push_public_interval_example(
                &mut audit,
                "below_lower",
                row,
                Some(p),
                Some(lower),
                Some(upper),
            );
        } else if p > upper + 1e-12 {
            audit.outside_interval_rows = audit.outside_interval_rows.saturating_add(1);
            audit.max_above_upper = audit.max_above_upper.max(p - upper);
            push_public_interval_example(
                &mut audit,
                "above_upper",
                row,
                Some(p),
                Some(lower),
                Some(upper),
            );
        }
    }
    audit
}

fn push_public_interval_example(
    audit: &mut PublicIntervalAudit,
    reason: &str,
    row: &EstimatorRow,
    p: Option<f64>,
    lower: Option<f64>,
    upper: Option<f64>,
) {
    if audit.examples.len() >= 50 {
        return;
    }
    audit.examples.push(format!(
        "reason={} scope={} level={} entity={} horizon_s={} floor_bp={} p_hit_serving={:?} lower={:?} upper={:?} ci_method={}",
        reason,
        row.population_scope,
        row.aggregation_level,
        row.entity_key,
        row.horizon_s,
        floor_to_bp(row.floor_pct),
        p,
        lower,
        upper,
        row.ci_method
    ));
}

fn uncertainty_interval_ready_for_promotion(audit: &BootstrapIntervalAudit) -> bool {
    audit.ready_rows > 0
        && audit.fallback_rows == 0
        && (audit.method.contains("bootstrap") || audit.method.contains("conformal"))
}

fn promotion_blockers(
    audit: &DatasetAudit,
    dedupe: &DedupeReport,
    bootstrap_intervals: &BootstrapIntervalAudit,
    public_interval: &PublicIntervalAudit,
    calibration: &CalibrationSuite,
    scorecards: &BTreeMap<String, ScoreStats>,
    monotonicity: &MonotonicityAudit,
    serving_projection: &MonotonicityProjectionAudit,
    serving_monotonicity: &MonotonicityAudit,
    split: TemporalSplit,
    max_manifests: Option<usize>,
    max_rows: Option<u64>,
) -> Vec<String> {
    let mut blockers = Vec::new();
    if !audit.issues.is_empty() {
        blockers.push(format!("dataset_audit_issues={}", audit.issues.len()));
    }
    if audit.issues_truncated > 0 {
        blockers.push(format!(
            "dataset_audit_issues_truncated={}",
            audit.issues_truncated
        ));
    }
    if split.diagnostic_only {
        blockers.push("temporal_span_insufficient_for_full_purge_embargo_promotion".to_string());
    }
    if let Some(max_manifests) = max_manifests {
        blockers.push(format!(
            "trainer_max_manifests_set={} reason=limited_corpus_cannot_promote",
            max_manifests
        ));
    }
    if let Some(max_rows) = max_rows {
        blockers.push(format!(
            "trainer_max_rows_set={} reason=partial_read_cannot_promote",
            max_rows
        ));
    }
    if split.requested_purge_s < split.max_horizon_s
        || split.requested_embargo_s < split.max_horizon_s
    {
        blockers.push(format!(
            "purge_or_embargo_raised_to_max_horizon requested_purge_s={} requested_embargo_s={} max_horizon_s={}",
            split.requested_purge_s, split.requested_embargo_s, split.max_horizon_s
        ));
    }
    if audit.runtime_config_hashes.len() != 1 {
        blockers.push(format!(
            "runtime_config_hash_count={}",
            audit.runtime_config_hashes.len()
        ));
    }
    if audit.logical_digest_skipped_manifests > 0 {
        blockers.push(format!(
            "logical_digest_skipped_manifests={} verified_manifests={} reason=max_rows_or_partial_read_cannot_promote",
            audit.logical_digest_skipped_manifests, audit.logical_digest_verified_manifests
        ));
    }
    if !audit
        .schema_versions
        .contains_key(&LABELED_TRADE_SCHEMA_VERSION)
    {
        blockers.push("missing_current_labeled_trade_schema".to_string());
    }
    if scorecards.values().all(|score| score.n_complete == 0) {
        blockers.push("no_complete_test_rows_for_scorecard".to_string());
    }
    if !uncertainty_interval_ready_for_promotion(bootstrap_intervals) {
        blockers.push(format!(
            "uncertainty_interval_not_promotion_ready method={} ready_rows={} fallback_rows={} required={}",
            bootstrap_intervals.method,
            bootstrap_intervals.ready_rows,
            bootstrap_intervals.fallback_rows,
            PROMOTION_INTERVAL_REQUIREMENT
        ));
    }
    if public_interval.missing_probability_rows > 0
        || public_interval.missing_interval_rows > 0
        || public_interval.outside_interval_rows > 0
    {
        blockers.push(format!(
            "public_p_hit_interval_not_aligned probability_field={} missing_probability_rows={} missing_interval_rows={} outside_interval_rows={} max_below_lower={} max_above_upper={}",
            public_interval.probability_field,
            public_interval.missing_probability_rows,
            public_interval.missing_interval_rows,
            public_interval.outside_interval_rows,
            public_interval.max_below_lower,
            public_interval.max_above_upper
        ));
    }
    if !dedupe.training_aggregation.enabled
        || !dedupe.bootstrap_interval.enabled
        || !dedupe.scoring_scorecard.enabled
    {
        blockers.push("supervised_dedupe_disabled".to_string());
    }
    if dedupe.training_aggregation.duplicate_conflict_floor_keys > 0 {
        blockers.push(format!(
            "training_duplicate_conflict_floor_keys={}",
            dedupe.training_aggregation.duplicate_conflict_floor_keys
        ));
    }
    if dedupe.calibration_fit.duplicate_conflict_floor_keys > 0 {
        blockers.push(format!(
            "calibration_duplicate_conflict_floor_keys={}",
            dedupe.calibration_fit.duplicate_conflict_floor_keys
        ));
    }
    if dedupe.bootstrap_interval.duplicate_conflict_floor_keys > 0 {
        blockers.push(format!(
            "bootstrap_interval_duplicate_conflict_floor_keys={}",
            dedupe.bootstrap_interval.duplicate_conflict_floor_keys
        ));
    }
    if dedupe.scoring_scorecard.duplicate_conflict_floor_keys > 0 {
        blockers.push(format!(
            "scoring_duplicate_conflict_floor_keys={}",
            dedupe.scoring_scorecard.duplicate_conflict_floor_keys
        ));
    }
    if calibration.cells_not_ready > 0 {
        blockers.push(format!(
            "calibration_not_ready_cells={} examples={:?}",
            calibration.cells_not_ready, calibration.cells_not_ready_examples
        ));
    }
    if audit.label_floor_hit_lengths.len() != 1 || !audit.label_floor_hit_lengths.contains_key(&6) {
        blockers.push(format!(
            "label_floor_grid_not_exactly_six={:?}",
            audit.label_floor_hit_lengths
        ));
    }
    let observed_floors = observed_floor_bp_set(audit);
    let expected_floors = EXPECTED_FLOOR_BP.iter().copied().collect::<BTreeSet<_>>();
    if observed_floors != expected_floors {
        blockers.push(format!(
            "floor_grid_mismatch observed_bp={:?} expected_bp={:?}",
            observed_floors, expected_floors
        ));
    }
    let observed_horizons = audit.horizons_s.keys().copied().collect::<BTreeSet<_>>();
    let expected_horizons = EXPECTED_HORIZONS_S.iter().copied().collect::<BTreeSet<_>>();
    if observed_horizons != expected_horizons {
        blockers.push(format!(
            "horizon_grid_mismatch observed_s={:?} expected_s={:?}",
            observed_horizons, expected_horizons
        ));
    }
    if monotonicity.horizon_monotonicity_violations > 0
        || monotonicity.floor_monotonicity_violations > 0
    {
        blockers.push(format!(
            "km_monotonicity_violations horizon={} floor={}",
            monotonicity.horizon_monotonicity_violations,
            monotonicity.floor_monotonicity_violations
        ));
    }
    if serving_monotonicity.horizon_monotonicity_violations > 0
        || serving_monotonicity.floor_monotonicity_violations > 0
    {
        blockers.push(format!(
            "serving_monotonicity_violations horizon={} floor={}",
            serving_monotonicity.horizon_monotonicity_violations,
            serving_monotonicity.floor_monotonicity_violations
        ));
    }
    if serving_projection.uncalibrated_rows_adjusted > 0 {
        blockers.push(format!(
            "serving_projection_adjusted_uncalibrated_rows={} max_abs_delta={} p95_abs_delta={}",
            serving_projection.uncalibrated_rows_adjusted,
            serving_projection.max_uncalibrated_abs_delta,
            serving_projection.p95_uncalibrated_abs_delta
        ));
    }
    blockers
}

fn observed_floor_bp_set(audit: &DatasetAudit) -> BTreeSet<i32> {
    audit
        .floor_values
        .keys()
        .filter_map(|floor| floor.parse::<f32>().ok())
        .map(floor_to_bp)
        .collect()
}

fn col<'a, T>(batch: &'a RecordBatch, name: &str) -> Result<&'a T>
where
    T: Array + 'static,
{
    let idx = batch
        .schema()
        .index_of(name)
        .with_context(|| format!("missing column {name}"))?;
    batch
        .column(idx)
        .as_any()
        .downcast_ref::<T>()
        .with_context(|| {
            format!(
                "column {name} has unexpected type {:?}",
                batch.column(idx).data_type()
            )
        })
}

fn struct_child<'a, T>(array: &'a StructArray, name: &str) -> Option<&'a T>
where
    T: Array + 'static,
{
    array.column_by_name(name)?.as_any().downcast_ref::<T>()
}

fn struct_child_required<'a, T>(array: &'a StructArray, name: &str) -> Result<&'a T>
where
    T: Array + 'static,
{
    let child = array
        .column_by_name(name)
        .with_context(|| format!("struct missing child {name}"))?;
    child.as_any().downcast_ref::<T>().with_context(|| {
        format!(
            "struct child {name} has unexpected type {:?}",
            child.data_type()
        )
    })
}

fn required_str<'a>(array: &'a StringArray, row: usize, name: &str) -> Result<&'a str> {
    if array.is_null(row) {
        bail!("{name} is null at row {row}");
    }
    Ok(array.value(row))
}

fn required_u16(array: &UInt16Array, row: usize, name: &str) -> Result<u16> {
    if array.is_null(row) {
        bail!("{name} is null at row {row}");
    }
    Ok(array.value(row))
}

fn required_u32(array: &UInt32Array, row: usize, name: &str) -> Result<u32> {
    if array.is_null(row) {
        bail!("{name} is null at row {row}");
    }
    Ok(array.value(row))
}

fn required_u64(array: &UInt64Array, row: usize, name: &str) -> Result<u64> {
    if array.is_null(row) {
        bail!("{name} is null at row {row}");
    }
    Ok(array.value(row))
}

fn required_f32(array: &Float32Array, row: usize, name: &str) -> Result<f32> {
    if array.is_null(row) {
        bail!("{name} is null at row {row}");
    }
    Ok(array.value(row))
}

fn optional_f32(array: Option<&Float32Array>, row: usize) -> Option<f32> {
    let array = array?;
    if array.is_null(row) {
        None
    } else {
        Some(array.value(row))
    }
}

fn optional_u32(array: Option<&UInt32Array>, row: usize) -> Option<u32> {
    let array = array?;
    if array.is_null(row) {
        None
    } else {
        Some(array.value(row))
    }
}

fn optional_u64(array: Option<&UInt64Array>, row: usize) -> Option<u64> {
    let array = array?;
    if array.is_null(row) {
        None
    } else {
        Some(array.value(row))
    }
}

fn optional_bool(array: Option<&BooleanArray>, row: usize) -> Option<bool> {
    let array = array?;
    if array.is_null(row) {
        None
    } else {
        Some(array.value(row))
    }
}

fn floor_to_bp(floor_pct: f32) -> i32 {
    (floor_pct * 100.0).round() as i32
}

fn safe_ratio(num: u64, den: u64) -> Option<f64> {
    if den == 0 {
        None
    } else {
        Some(num as f64 / den as f64)
    }
}

fn inc<K: Ord>(map: &mut BTreeMap<K, u64>, key: K) {
    *map.entry(key).or_insert(0) += 1;
}

fn inc_str(map: &mut BTreeMap<String, u64>, key: &str) {
    *map.entry(key.to_string()).or_insert(0) += 1;
}

fn update_hash_str(state: &mut u128, value: &str) {
    fnv1a_update(state, b"str");
    fnv1a_update(state, &(value.len() as u64).to_le_bytes());
    fnv1a_update(state, value.as_bytes());
}

fn update_hash_u32(state: &mut u128, value: u32) {
    fnv1a_update(state, b"u32");
    fnv1a_update(state, &value.to_le_bytes());
}

fn update_hash_i32(state: &mut u128, value: i32) {
    fnv1a_update(state, b"i32");
    fnv1a_update(state, &value.to_le_bytes());
}

fn update_hash_u64(state: &mut u128, value: u64) {
    fnv1a_update(state, b"u64");
    fnv1a_update(state, &value.to_le_bytes());
}

fn update_hash_u128(state: &mut u128, value: u128) {
    fnv1a_update(state, b"u128");
    fnv1a_update(state, &value.to_le_bytes());
}

fn update_hash_optional_u32(state: &mut u128, value: Option<u32>) {
    match value {
        Some(v) => {
            fnv1a_update(state, b"some");
            update_hash_u32(state, v);
        }
        None => fnv1a_update(state, b"none_u32"),
    }
}

fn update_hash_optional_u64(state: &mut u128, value: Option<u64>) {
    match value {
        Some(v) => {
            fnv1a_update(state, b"some");
            update_hash_u64(state, v);
        }
        None => fnv1a_update(state, b"none_u64"),
    }
}

fn update_hash_optional_f32(state: &mut u128, value: Option<f32>) {
    match value {
        Some(v) => {
            fnv1a_update(state, b"some");
            fnv1a_update(state, b"f32");
            fnv1a_update(state, &v.to_bits().to_le_bytes());
        }
        None => fnv1a_update(state, b"none_f32"),
    }
}

fn update_hash_optional_bool(state: &mut u128, value: Option<bool>) {
    match value {
        Some(v) => {
            fnv1a_update(state, b"some");
            fnv1a_update(state, &[u8::from(v)]);
        }
        None => fnv1a_update(state, b"none_bool"),
    }
}

struct TrainerLogicalDigest {
    hash: u64,
    row: u64,
}

struct TrainerSupervisedDigest {
    hash: u128,
    row: u64,
}

impl TrainerSupervisedDigest {
    fn new() -> Self {
        let mut digest = Self {
            hash: FNV_OFFSET_128,
            row: 0,
        };
        fnv1a_update(&mut digest.hash, b"estimator_supervised_digest_v1");
        fnv1a_update(
            &mut digest.hash,
            DatasetKind::LabeledTrades.as_str().as_bytes(),
        );
        digest
    }

    fn begin_row(&mut self) {
        self.row = self.row.saturating_add(1);
        fnv1a_update(&mut self.hash, b"\x1esupervised_row");
        update_hash_u64(&mut self.hash, self.row);
    }

    fn update_str(&mut self, value: &str) {
        update_hash_str(&mut self.hash, value);
    }

    fn update_u16(&mut self, value: u16) {
        fnv1a_update(&mut self.hash, b"u16");
        fnv1a_update(&mut self.hash, &value.to_le_bytes());
    }

    fn update_u32(&mut self, value: u32) {
        update_hash_u32(&mut self.hash, value);
    }

    fn update_u128(&mut self, value: u128) {
        update_hash_u128(&mut self.hash, value);
    }

    fn rows(&self) -> u64 {
        self.row
    }

    fn hex(&self) -> String {
        format!("{:032x}", self.hash)
    }
}

impl TrainerLogicalDigest {
    const FNV_OFFSET: u64 = 0xcbf29ce484222325;
    const FNV_PRIME: u64 = 0x100000001b3;

    fn new(dataset_kind: DatasetKind) -> Self {
        let mut digest = Self {
            hash: Self::FNV_OFFSET,
            row: 0,
        };
        digest.update_bytes(b"storage_v2");
        digest.update_bytes(dataset_kind.as_str().as_bytes());
        digest
    }

    fn begin_row(&mut self) {
        self.row = self.row.saturating_add(1);
        self.update_bytes(b"\x1erow");
        self.update_bytes(&self.row.to_le_bytes());
    }

    fn update_str(&mut self, value: &str) {
        self.update_bytes(b"str");
        self.update_bytes(&(value.len() as u64).to_le_bytes());
        self.update_bytes(value.as_bytes());
    }

    fn update_u16(&mut self, value: u16) {
        self.update_bytes(b"u16");
        self.update_bytes(&value.to_le_bytes());
    }

    fn update_u32(&mut self, value: u32) {
        self.update_bytes(b"u32");
        self.update_bytes(&value.to_le_bytes());
    }

    fn update_u64(&mut self, value: u64) {
        self.update_bytes(b"u64");
        self.update_bytes(&value.to_le_bytes());
    }

    fn update_bytes(&mut self, bytes: &[u8]) {
        for &b in bytes {
            self.hash ^= b as u64;
            self.hash = self.hash.wrapping_mul(Self::FNV_PRIME);
        }
    }

    fn hex(&self) -> String {
        format!("{:016x}", self.hash)
    }
}

fn split_name_str(split: SplitName) -> &'static str {
    match split {
        SplitName::Train => "train",
        SplitName::Calibration => "calibration",
        SplitName::Test => "test",
        SplitName::Gap => "purge_or_embargo_gap",
    }
}

fn prepare_out_dir(out_dir: &Path, overwrite: bool) -> Result<()> {
    if out_dir.exists() {
        let has_entries = fs::read_dir(out_dir)
            .with_context(|| format!("read_dir {}", out_dir.display()))?
            .next()
            .transpose()?
            .is_some();
        if has_entries && !overwrite {
            bail!(
                "output directory already exists and is not empty: {} (use --overwrite)",
                out_dir.display()
            );
        }
        if overwrite {
            let success_path = out_dir.join("_SUCCESS");
            if success_path.exists() {
                fs::remove_file(&success_path)
                    .with_context(|| format!("remove stale {}", success_path.display()))?;
            }
        }
    }
    fs::create_dir_all(out_dir).with_context(|| format!("create {}", out_dir.display()))
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<ArtifactInfo> {
    let temp_path = temp_artifact_path(path);
    {
        let file =
            File::create(&temp_path).with_context(|| format!("create {}", temp_path.display()))?;
        let mut writer = BufWriter::new(file);
        serde_json::to_writer_pretty(&mut writer, value)
            .with_context(|| format!("write {}", temp_path.display()))?;
        writer.flush()?;
        writer.get_ref().sync_all()?;
    }
    publish_temp_artifact(&temp_path, path)
}

fn write_jsonl<T: Serialize>(path: &Path, rows: &[T]) -> Result<ArtifactInfo> {
    let temp_path = temp_artifact_path(path);
    {
        let file =
            File::create(&temp_path).with_context(|| format!("create {}", temp_path.display()))?;
        let mut writer = BufWriter::new(file);
        for row in rows {
            serde_json::to_writer(&mut writer, row)
                .with_context(|| format!("serialize row for {}", temp_path.display()))?;
            writer.write_all(b"\n")?;
        }
        writer.flush()?;
        writer.get_ref().sync_all()?;
    }
    publish_temp_artifact(&temp_path, path)
}

fn publish_temp_artifact(temp_path: &Path, path: &Path) -> Result<ArtifactInfo> {
    if path.exists() {
        fs::remove_file(path).with_context(|| format!("remove {}", path.display()))?;
    }
    fs::rename(temp_path, path)
        .with_context(|| format!("rename {} -> {}", temp_path.display(), path.display()))?;
    artifact_info(path)
}

fn temp_artifact_path(path: &Path) -> PathBuf {
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("artifact");
    path.with_file_name(format!("{file_name}.tmp"))
}

fn artifact_info(path: &Path) -> Result<ArtifactInfo> {
    let metadata = fs::metadata(path).with_context(|| format!("metadata {}", path.display()))?;
    Ok(ArtifactInfo {
        path: path.display().to_string(),
        bytes: metadata.len(),
        digest_kind: ARTIFACT_DIGEST_KIND.to_string(),
        digest_hex: file_digest_hex(path)?,
    })
}

fn file_digest_hex(path: &Path) -> Result<String> {
    let mut file = File::open(path).with_context(|| format!("open digest {}", path.display()))?;
    let mut state = FNV_OFFSET_128;
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 {
            break;
        }
        fnv1a_update(&mut state, &buf[..n]);
    }
    Ok(format!("{state:032x}"))
}

fn fnv1a_update(state: &mut u128, bytes: &[u8]) {
    for &b in bytes {
        *state ^= b as u128;
        *state = state.wrapping_mul(FNV_PRIME_128);
    }
}

fn write_success_marker(out_dir: &Path, manifest_artifact: &ArtifactInfo) -> Result<()> {
    let path = out_dir.join("_SUCCESS");
    write_json(&path, manifest_artifact).map(|_| ())
}

fn source_manifest_summaries(manifests: &[ManifestRecord]) -> Result<Vec<SourceManifestSummary>> {
    manifests
        .iter()
        .map(|rec| {
            Ok(SourceManifestSummary {
                manifest_path: rec.path.display().to_string(),
                manifest_digest_kind: ARTIFACT_DIGEST_KIND.to_string(),
                manifest_digest_hex: file_digest_hex(&rec.path)?,
                dataset_kind: rec.manifest.dataset_kind.clone(),
                schema_version: rec.manifest.schema_version,
                source_row_count: rec.manifest.source_row_count,
                fact_row_count: rec.manifest.fact_row_count,
                route_dim_row_count: rec.manifest.route_dim_row_count,
                fact_file_bytes: rec.manifest.fact_file_bytes,
                route_dim_file_bytes: rec.manifest.route_dim_file_bytes,
                min_timestamp_ns: rec.manifest.min_timestamp_ns,
                max_timestamp_ns: rec.manifest.max_timestamp_ns,
                logical_required_digest_kind: rec.manifest.logical_required_digest_kind.clone(),
                logical_required_digest_hex: rec.manifest.logical_required_digest_hex.clone(),
                sample_id_algorithm_version: rec.manifest.sample_id_algorithm_version.clone(),
                route_dim_key_policy: rec.manifest.route_dim_key_policy.clone(),
                virtualized_columns: rec.manifest.virtualized_columns.clone(),
            })
        })
        .collect()
}

fn build_corpus_manifest(
    manifests: &[ManifestRecord],
    source_manifests: &[SourceManifestSummary],
    trainer_run_id: &str,
) -> CorpusManifest {
    let sample_id_algorithm_versions = manifests
        .iter()
        .map(|rec| rec.manifest.sample_id_algorithm_version.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    let route_dim_key_policies = manifests
        .iter()
        .map(|rec| rec.manifest.route_dim_key_policy.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    CorpusManifest {
        storage_contract: "ml_storage_v2".to_string(),
        logical_dataset: DatasetKind::LabeledTrades.as_str().to_string(),
        output_contract_version: OUTPUT_CONTRACT_VERSION.to_string(),
        trainer_version: TRAINER_VERSION.to_string(),
        trainer_run_id: trainer_run_id.to_string(),
        manifests: manifests.len(),
        source_fact_rows_total: manifests
            .iter()
            .map(|rec| rec.manifest.fact_row_count)
            .sum(),
        min_timestamp_ns: manifests
            .iter()
            .filter_map(|rec| rec.manifest.min_timestamp_ns)
            .min(),
        max_timestamp_ns: manifests
            .iter()
            .filter_map(|rec| rec.manifest.max_timestamp_ns)
            .max(),
        expected_floor_bp: EXPECTED_FLOOR_BP.to_vec(),
        expected_horizons_s: EXPECTED_HORIZONS_S.to_vec(),
        sample_id_algorithm_versions,
        route_dim_key_policies,
        source_manifests: source_manifests.to_vec(),
    }
}

fn build_contract_output_mapping() -> ContractOutputMapping {
    ContractOutputMapping {
        output_contract_version: OUTPUT_CONTRACT_VERSION.to_string(),
        serving_mode: "POLICY_SELECTED_AFTER_FULL_CURVE_PROJECTION".to_string(),
        candidate_curve_p_hit_source:
            "ServingCurvePoint.probability after lookup/shrinkage/fallback/projection from EstimatorRow.p_hit_serving"
                .to_string(),
        primary_setup_p_hit_source:
            "selected candidate_curve[].p_hit; never recompute from p_hit_km or p_hit_calibrated_raw"
                .to_string(),
        p_hit_interval_source:
            "EstimatorRow.p_hit_ci_lower/p_hit_ci_upper mapped to p_hit_serving scale with ci_method"
                .to_string(),
        public_probability_field: "candidate_curve[].p_hit".to_string(),
        intermediate_probability_fields_not_public: vec![
            "p_hit_km_raw".to_string(),
            "p_hit_km".to_string(),
            "p_hit_calibrated_raw".to_string(),
            "EstimatorRow.p_hit_serving_component".to_string(),
        ],
        promotion_requires: vec![
            "bootstrap_or_conformal_interval_ready_for_all_eligible_rows".to_string(),
            "public_p_hit_serving_inside_public_interval".to_string(),
            "serving_probability_projection_has_zero_monotonicity_violations".to_string(),
            "no_uncalibrated_raw_fallback_adjusted_by_serving_projection".to_string(),
            "all_calibration_cells_ready".to_string(),
            "temporal_split_not_diagnostic".to_string(),
        ],
    }
}

fn unix_s() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn unix_ns() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}

fn default_run_id() -> String {
    format!("estimator-only-{}", unix_ns())
}

fn default_out_dir(run_id: &str) -> PathBuf {
    PathBuf::from("data/ml/trainer_runs").join(run_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn km_without_censoring_matches_realized_fraction() {
        let mut stats = GroupStats {
            n_total: 4,
            n_realized: 2,
            n_miss: 2,
            n_complete: 4,
            ..GroupStats::default()
        };
        stats.event_counts.insert(10, 1);
        stats.event_counts.insert(20, 1);
        let km = kaplan_meier(&stats);
        assert!((km.p_hit.unwrap() - 0.5).abs() < 1e-9);
    }

    #[test]
    fn km_accounts_for_early_censoring() {
        let mut stats = GroupStats {
            n_total: 4,
            n_realized: 2,
            n_miss: 1,
            n_censored: 1,
            n_complete: 3,
            ..GroupStats::default()
        };
        stats.event_counts.insert(10, 1);
        stats.censor_before_horizon_counts.insert(15, 1);
        stats.event_counts.insert(20, 1);
        let km = kaplan_meier(&stats);
        assert!(km.p_hit.unwrap() > 0.5);
    }

    #[test]
    fn quantile_counts_uses_nearest_rank() {
        let mut counts = BTreeMap::new();
        counts.insert(10, 2);
        counts.insert(30, 2);
        assert_eq!(quantile_from_counts(&counts, 0.25), Some(10));
        assert_eq!(quantile_from_counts(&counts, 0.75), Some(30));
    }

    #[test]
    fn prediction_scope_background_excludes_accept() {
        assert!(PredictionScope::Background.includes_sample_decision("below_tail"));
        assert!(PredictionScope::Background.includes_sample_decision("insufficient_history"));
        assert!(!PredictionScope::Background.includes_sample_decision("accept"));
    }

    #[test]
    fn monotonicity_audit_flags_floor_violation() {
        let rows = vec![
            estimator_row("all", "route", "r1", 900, 0.3, 0.20),
            estimator_row("all", "route", "r1", 900, 0.5, 0.30),
        ];
        let audit = monotonicity_audit(&rows);
        assert_eq!(audit.floor_monotonicity_violations, 1);
    }

    #[test]
    fn monotonicity_audit_flags_horizon_violation() {
        let rows = vec![
            estimator_row("all", "route", "r1", 900, 0.3, 0.40),
            estimator_row("all", "route", "r1", 1800, 0.3, 0.30),
        ];
        let audit = monotonicity_audit(&rows);
        assert_eq!(audit.horizon_monotonicity_violations, 1);
    }

    #[test]
    fn monotonicity_projection_removes_floor_and_horizon_violations() {
        let mut rows = vec![
            estimator_row("all", "route", "r1", 900, 0.3, 0.70),
            estimator_row("all", "route", "r1", 1800, 0.3, 0.40),
            estimator_row("all", "route", "r1", 900, 0.5, 0.80),
            estimator_row("all", "route", "r1", 1800, 0.5, 0.30),
        ];

        let before = monotonicity_audit(&rows);
        assert!(before.horizon_monotonicity_violations > 0);
        assert!(before.floor_monotonicity_violations > 0);

        let projection = apply_monotonicity_projection(&mut rows);
        let after = monotonicity_audit(&rows);

        assert_eq!(after.horizon_monotonicity_violations, 0);
        assert_eq!(after.floor_monotonicity_violations, 0);
        assert!(projection.rows_adjusted > 0);
        assert!(rows.iter().any(|row| row.p_hit_monotonicity_adjusted));
        assert!(rows.iter().all(|row| row.p_hit_km_raw.is_some()));
    }

    #[test]
    fn scope_pooled_serving_calibration_preserves_floor_order_for_ready_cells() {
        let mut rows = vec![
            estimator_row("all", "global", "*", 900, 0.3, 0.70),
            estimator_row("all", "global", "*", 900, 0.5, 0.60),
        ];
        let calibration = calibration_suite_with_constant_cells(vec![
            ("all", 900, 30, 0.40),
            ("all", 900, 50, 0.80),
        ]);

        let calibrated_only = {
            let mut clone = rows.clone();
            for row in &mut clone {
                let floor_bp = floor_to_bp(row.floor_pct);
                let p = row.p_hit_km.unwrap();
                let calibrated =
                    calibration.calibrate(&row.population_scope, row.horizon_s, floor_bp, p);
                row.p_hit_serving = Some(calibrated.probability);
            }
            serving_monotonicity_audit(&clone)
        };
        assert_eq!(calibrated_only.floor_monotonicity_violations, 0);

        let projection = apply_serving_probability_projection(&mut rows, &calibration);
        let serving_audit = serving_monotonicity_audit(&rows);

        assert_eq!(serving_audit.floor_monotonicity_violations, 0);
        assert_eq!(serving_audit.horizon_monotonicity_violations, 0);
        assert_eq!(projection.rows_adjusted, 0);
        assert!(rows.iter().all(|row| row.p_hit_calibrated_raw.is_some()));
        assert!(rows.iter().all(|row| row.p_hit_calibration_applied));
        assert!(rows
            .iter()
            .all(|row| !row.p_hit_serving_monotonicity_adjusted));
    }

    #[test]
    fn serving_projection_audits_uncalibrated_fallback_adjustments() {
        let mut rows = vec![
            estimator_row("all", "global", "*", 900, 0.3, 0.20),
            estimator_row("all", "global", "*", 900, 0.5, 0.80),
        ];
        let mut calibration = calibration_suite_with_constant_cells(vec![
            ("all", 900, 30, 0.20),
            ("all", 900, 50, 0.80),
        ]);
        let easy_floor_key = CalibrationCellKey::new("all", 900, 30).as_artifact_key();
        calibration.cells.get_mut(&easy_floor_key).unwrap().status =
            "insufficient_calibration_support".to_string();

        let projection = apply_serving_probability_projection(&mut rows, &calibration);

        assert!(projection.rows_adjusted > 0);
        assert!(projection.uncalibrated_rows_adjusted > 0);
        assert!(projection.max_uncalibrated_abs_delta > 0.0);
        assert!(projection.mean_uncalibrated_abs_delta > 0.0);
        assert!(!projection.uncalibrated_examples.is_empty());
    }

    #[test]
    fn serving_interval_contains_public_probability_after_calibration_projection() {
        let mut rows = vec![
            estimator_row("accept", "global", "*", 900, 0.3, 0.20),
            estimator_row("accept", "global", "*", 900, 0.5, 0.80),
        ];
        rows[0].p_hit_ci_lower = Some(0.10);
        rows[0].p_hit_ci_upper = Some(0.30);
        rows[1].p_hit_ci_lower = Some(0.70);
        rows[1].p_hit_ci_upper = Some(0.90);
        let mut calibration = calibration_suite_with_constant_cells(vec![
            ("accept", 900, 30, 0.70),
            ("accept", 900, 50, 0.40),
        ]);
        let easy_floor_key = CalibrationCellKey::new("accept", 900, 30).as_artifact_key();
        calibration.cells.get_mut(&easy_floor_key).unwrap().status =
            "insufficient_calibration_support".to_string();

        let projection = apply_serving_probability_projection(&mut rows, &calibration);
        let audit = audit_public_interval_alignment(&rows);

        assert!(projection.rows_adjusted > 0);
        assert_eq!(audit.missing_probability_rows, 0);
        assert_eq!(audit.missing_interval_rows, 0);
        assert_eq!(audit.outside_interval_rows, 0);
        for row in rows {
            let p = row.p_hit_serving.unwrap();
            assert!(row.p_hit_ci_lower.unwrap() <= p);
            assert!(row.p_hit_ci_upper.unwrap() >= p);
            assert!(row.ci_method.contains("serving_calibration_mapped"));
        }
    }

    #[test]
    fn raw_prediction_uses_intermediate_km_for_calibration() {
        let mut row = estimator_row("accept", "global", "*", 900, 0.3, 0.20);
        row.p_hit_serving = Some(0.77);
        let index = build_prediction_index(&[row]);

        let p = predict(
            &index,
            PredictionScope::Accept,
            "missing_route",
            "missing_state",
            900,
            floor_to_bp(0.3),
            100.0,
        )
        .unwrap();

        assert!((p - 0.20).abs() < 1e-12);
    }

    #[test]
    fn exit_policy_replay_selects_best_gated_candidate() {
        let mut report = ExitPolicyReplayReport::default();
        let mut curve = BTreeMap::new();
        curve.insert(
            (900, 80),
            ServingCurvePoint {
                horizon_s: 900,
                floor_bp: 80,
                probability: Some(0.90),
                ci_lower: Some(0.84),
                ci_upper: Some(0.95),
                p_censor: Some(0.02),
                t_hit_p75_s: Some(600),
                n_total: 1_000,
                n_complete: 900,
                calibration_applied: true,
            },
        );
        curve.insert(
            (3600, 120),
            ServingCurvePoint {
                horizon_s: 3600,
                floor_bp: 120,
                probability: Some(0.80),
                ci_lower: Some(0.72),
                ci_upper: Some(0.88),
                p_censor: Some(0.03),
                t_hit_p75_s: Some(1800),
                n_total: 800,
                n_complete: 700,
                calibration_applied: true,
            },
        );

        let selected = select_exit_policy_candidate(3.40, &curve, &mut report).unwrap();

        assert_eq!(selected.horizon_s, 3600);
        assert_eq!(selected.floor_bp, 120);
        assert!((selected.exit_target_pct - (-2.20)).abs() < 1e-6);
        assert_eq!(report.candidates_scored, 2);
    }

    #[test]
    fn exit_policy_replay_rejects_uncalibrated_or_wide_interval_candidates() {
        let mut report = ExitPolicyReplayReport::default();
        let mut curve = BTreeMap::new();
        curve.insert(
            (900, 120),
            ServingCurvePoint {
                horizon_s: 900,
                floor_bp: 120,
                probability: Some(0.90),
                ci_lower: Some(0.10),
                ci_upper: Some(0.90),
                p_censor: Some(0.02),
                t_hit_p75_s: Some(600),
                n_total: 1_000,
                n_complete: 900,
                calibration_applied: true,
            },
        );
        curve.insert(
            (1800, 200),
            ServingCurvePoint {
                horizon_s: 1800,
                floor_bp: 200,
                probability: Some(0.90),
                ci_lower: Some(0.82),
                ci_upper: Some(0.94),
                p_censor: Some(0.02),
                t_hit_p75_s: Some(600),
                n_total: 1_000,
                n_complete: 900,
                calibration_applied: false,
            },
        );

        assert!(select_exit_policy_candidate(3.40, &curve, &mut report).is_none());
        assert_eq!(report.gate_fail_counts["p_hit_interval_too_wide"], 1);
        assert_eq!(report.gate_fail_counts["uncalibrated_probability"], 1);
    }

    #[test]
    fn serving_curve_projection_runs_after_lookup_and_shrinkage() {
        let mut easy = estimator_row("accept", "global", "*", 900, 0.3, 0.40);
        easy.p_hit_serving = Some(0.40);
        let mut hard = estimator_row("accept", "global", "*", 900, 0.5, 0.80);
        hard.p_hit_serving = Some(0.80);
        let index = build_prediction_index(&[easy, hard]);
        let floor_state_buckets =
            BTreeMap::from([(30, "state".to_string()), (50, "state".to_string())]);
        let calibration = calibration_suite_with_constant_cells(Vec::new());

        let curve = predict_serving_curve(
            &index,
            &calibration,
            PredictionScope::Accept,
            "missing_route",
            &floor_state_buckets,
            100.0,
        );

        let p_easy = curve.get(&(900, 30)).unwrap().probability.unwrap();
        let p_hard = curve.get(&(900, 50)).unwrap().probability.unwrap();
        assert!(p_easy + 1e-12 >= p_hard);
    }

    #[test]
    fn contract_mapping_declares_serving_probability_as_public_p_hit() {
        let mapping = build_contract_output_mapping();

        assert_eq!(mapping.output_contract_version, OUTPUT_CONTRACT_VERSION);
        assert_eq!(mapping.public_probability_field, "candidate_curve[].p_hit");
        assert!(mapping
            .candidate_curve_p_hit_source
            .contains("ServingCurvePoint.probability"));
        assert!(mapping
            .candidate_curve_p_hit_source
            .contains("lookup/shrinkage/fallback/projection"));
        assert!(mapping
            .primary_setup_p_hit_source
            .contains("selected candidate_curve[].p_hit"));
        assert!(mapping
            .intermediate_probability_fields_not_public
            .contains(&"p_hit_km".to_string()));
        assert!(mapping
            .intermediate_probability_fields_not_public
            .contains(&"p_hit_calibrated_raw".to_string()));
        assert!(mapping
            .intermediate_probability_fields_not_public
            .contains(&"EstimatorRow.p_hit_serving_component".to_string()));
    }

    #[test]
    fn temporal_block_bootstrap_interval_uses_multiple_blocks_and_contains_point_estimate() {
        let mut acc = BootstrapAccumulator::default();
        for block in 0..4 {
            acc.update(
                block,
                FloorOutcome {
                    outcome: FloorOutcomeKind::Realized,
                    duration_s: 10,
                },
                900,
            );
            acc.update(
                block,
                FloorOutcome {
                    outcome: FloorOutcomeKind::Miss,
                    duration_s: 900,
                },
                900,
            );
        }

        let interval = acc.interval(123, 0.50, bootstrap_block_s(900)).unwrap();

        assert_eq!(interval.n_blocks, 4);
        assert_eq!(interval.block_s, BLOCK_BOOTSTRAP_MIN_BLOCK_S);
        assert_eq!(interval.n_replicates, BLOCK_BOOTSTRAP_REPLICATES);
        assert!(interval.lower <= 0.50);
        assert!(interval.upper >= 0.50);
    }

    #[test]
    fn bootstrap_block_width_is_at_least_horizon() {
        assert_eq!(bootstrap_block_s(900), BLOCK_BOOTSTRAP_MIN_BLOCK_S);
        assert_eq!(bootstrap_block_s(28_800), 28_800);
    }

    #[test]
    fn promotion_blocks_diagnostic_greenwood_interval() {
        let mut audit = DatasetAudit::default();
        audit.runtime_config_hashes.insert("cfg".to_string(), 1);
        audit
            .schema_versions
            .insert(LABELED_TRADE_SCHEMA_VERSION, 1);
        audit.label_floor_hit_lengths.insert(6, 1);
        for &floor_bp in EXPECTED_FLOOR_BP {
            audit
                .floor_values
                .insert(format!("{:.6}", floor_bp as f32 / 100.0), 1);
        }
        for &horizon_s in EXPECTED_HORIZONS_S {
            audit.horizons_s.insert(horizon_s, 1);
        }

        let dedupe = DedupeReport {
            training_aggregation: DedupeAudit::new("training_aggregation"),
            bootstrap_interval: DedupeAudit::new("bootstrap_interval"),
            calibration_fit: DedupeAudit::new("calibration_fit"),
            scoring_scorecard: DedupeAudit::new("scoring_scorecard"),
        };
        let bootstrap_intervals = BootstrapIntervalAudit::default();
        let calibration = CalibrationSuite {
            calibrator_version: CALIBRATOR_VERSION.to_string(),
            method: CALIBRATOR_METHOD.to_string(),
            serving_method: SERVING_CALIBRATOR_METHOD.to_string(),
            min_complete: MIN_CALIBRATION_COMPLETE,
            diagnostic_only: false,
            censoring_treatment: "test".to_string(),
            cells_total: 1,
            cells_ready: 1,
            cells_not_ready: 0,
            cells_not_ready_examples: Vec::new(),
            scope_models: BTreeMap::new(),
            cells: BTreeMap::new(),
        };
        let mut scorecards = BTreeMap::new();
        scorecards.insert(
            "accept".to_string(),
            ScoreStats {
                n_complete: 1,
                ..ScoreStats::default()
            },
        );
        let monotonicity = MonotonicityAudit::default();
        let mut serving_projection = MonotonicityProjectionAudit::default();
        serving_projection.uncalibrated_rows_adjusted = 1;
        serving_projection.max_uncalibrated_abs_delta = 0.10;
        serving_projection.p95_uncalibrated_abs_delta = 0.10;
        let serving_monotonicity = MonotonicityAudit::default();
        let public_interval = PublicIntervalAudit::default();
        let split = TemporalSplit {
            min_ts_ns: 0,
            max_ts_ns: 1,
            train_end_ns: 0,
            calibration_start_ns: 0,
            calibration_end_ns: 0,
            test_start_ns: 0,
            max_horizon_s: 28_800,
            requested_purge_s: 28_800,
            requested_embargo_s: 28_800,
            purge_s: 28_800,
            embargo_s: 28_800,
            data_span_s: 1,
            diagnostic_only: false,
        };

        let blockers = promotion_blockers(
            &audit,
            &dedupe,
            &bootstrap_intervals,
            &public_interval,
            &calibration,
            &scorecards,
            &monotonicity,
            &serving_projection,
            &serving_monotonicity,
            split,
            None,
            None,
        );

        assert!(blockers
            .iter()
            .any(|blocker| blocker.starts_with("uncertainty_interval_not_promotion_ready")));
        assert!(blockers
            .iter()
            .any(|blocker| blocker.starts_with("serving_projection_adjusted_uncalibrated_rows")));
    }

    #[test]
    fn promotion_blocks_skipped_logical_digest_verification() {
        let mut audit = DatasetAudit::default();
        audit.runtime_config_hashes.insert("cfg".to_string(), 1);
        audit
            .schema_versions
            .insert(LABELED_TRADE_SCHEMA_VERSION, 1);
        audit.label_floor_hit_lengths.insert(6, 1);
        audit.logical_digest_skipped_manifests = 1;
        for &floor_bp in EXPECTED_FLOOR_BP {
            audit
                .floor_values
                .insert(format!("{:.6}", floor_bp as f32 / 100.0), 1);
        }
        for &horizon_s in EXPECTED_HORIZONS_S {
            audit.horizons_s.insert(horizon_s, 1);
        }
        let dedupe = DedupeReport {
            training_aggregation: DedupeAudit::new("training_aggregation"),
            bootstrap_interval: DedupeAudit::new("bootstrap_interval"),
            calibration_fit: DedupeAudit::new("calibration_fit"),
            scoring_scorecard: DedupeAudit::new("scoring_scorecard"),
        };
        let mut bootstrap_intervals = BootstrapIntervalAudit::default();
        bootstrap_intervals.ready_rows = 1;
        let calibration = CalibrationSuite {
            calibrator_version: CALIBRATOR_VERSION.to_string(),
            method: CALIBRATOR_METHOD.to_string(),
            serving_method: SERVING_CALIBRATOR_METHOD.to_string(),
            min_complete: MIN_CALIBRATION_COMPLETE,
            diagnostic_only: false,
            censoring_treatment: "test".to_string(),
            cells_total: 1,
            cells_ready: 1,
            cells_not_ready: 0,
            cells_not_ready_examples: Vec::new(),
            scope_models: BTreeMap::new(),
            cells: BTreeMap::new(),
        };
        let scorecards = BTreeMap::from([(
            "accept".to_string(),
            ScoreStats {
                n_complete: 1,
                ..ScoreStats::default()
            },
        )]);
        let split = TemporalSplit {
            min_ts_ns: 0,
            max_ts_ns: 1,
            train_end_ns: 0,
            calibration_start_ns: 0,
            calibration_end_ns: 0,
            test_start_ns: 0,
            max_horizon_s: 28_800,
            requested_purge_s: 28_800,
            requested_embargo_s: 28_800,
            purge_s: 28_800,
            embargo_s: 28_800,
            data_span_s: 1,
            diagnostic_only: false,
        };

        let blockers = promotion_blockers(
            &audit,
            &dedupe,
            &bootstrap_intervals,
            &PublicIntervalAudit::default(),
            &calibration,
            &scorecards,
            &MonotonicityAudit::default(),
            &MonotonicityProjectionAudit::default(),
            &MonotonicityAudit::default(),
            split,
            Some(1),
            Some(1),
        );

        assert!(blockers
            .iter()
            .any(|blocker| blocker.starts_with("logical_digest_skipped_manifests=1")));
        assert!(blockers
            .iter()
            .any(|blocker| blocker.starts_with("trainer_max_manifests_set=1")));
        assert!(blockers
            .iter()
            .any(|blocker| blocker.starts_with("trainer_max_rows_set=1")));
    }

    #[test]
    fn weighted_isotonic_increasing_preserves_monotone_sequence() {
        let fitted = weighted_isotonic_increasing(&[(0.1, 1.0), (0.2, 10.0), (0.3, 1.0)]);

        assert_eq!(fitted, vec![0.1, 0.2, 0.3]);
    }

    #[test]
    fn weighted_isotonic_increasing_pools_decreasing_blocks() {
        let fitted = weighted_isotonic_increasing(&[(0.8, 1.0), (0.2, 1.0), (0.9, 1.0)]);

        assert!((fitted[0] - 0.5).abs() < 1e-12);
        assert!((fitted[1] - 0.5).abs() < 1e-12);
        assert!((fitted[2] - 0.9).abs() < 1e-12);
    }

    #[test]
    fn prediction_shrinks_route_to_pit_state_prior() {
        let mut aggregates = HashMap::new();
        let mut route_stats = GroupStats {
            n_total: 100,
            n_realized: 20,
            n_complete: 100,
            ..GroupStats::default()
        };
        route_stats.event_counts.insert(1, 20);
        aggregates.insert(
            AggregationKey {
                scope: "accept".to_string(),
                level: AggregationLevel::Route,
                entity: "r1".to_string(),
                horizon_s: 900,
                floor_bp: floor_to_bp(0.3),
            },
            route_stats,
        );
        let mut state_stats = GroupStats {
            n_total: 1_000,
            n_realized: 800,
            n_complete: 1_000,
            ..GroupStats::default()
        };
        state_stats.event_counts.insert(1, 800);
        aggregates.insert(
            AggregationKey {
                scope: "accept".to_string(),
                level: AggregationLevel::GlobalState,
                entity: "entry_rank_ge_995|exit_target_le_p25|exit_start_ge_m050|alive_le_15s"
                    .to_string(),
                horizon_s: 900,
                floor_bp: floor_to_bp(0.3),
            },
            state_stats,
        );
        let (surface, build) = build_prediction_surface(&aggregates, 1);
        assert_eq!(build.prediction_eligible_groups, 2);
        let index = build_prediction_index(&surface);
        let p = predict(
            &index,
            PredictionScope::Accept,
            "r1",
            "entry_rank_ge_995|exit_target_le_p25|exit_start_ge_m050|alive_le_15s",
            900,
            floor_to_bp(0.3),
            100.0,
        )
        .unwrap();
        assert!((p - 0.50).abs() < 1e-9);
    }

    #[test]
    fn public_serving_curve_never_falls_back_to_km_component() {
        let mut row = estimator_row("accept", "global", "*", 900, 0.3, 0.77);
        row.p_hit_km = Some(0.77);
        row.p_hit_serving = None;
        let index = build_prediction_index(&[row]);
        let floor_state_buckets = BTreeMap::from([(30, "state".to_string())]);
        let calibration = calibration_suite_with_constant_cells(vec![("accept", 900, 30, 0.77)]);

        let curve = predict_serving_curve(
            &index,
            &calibration,
            PredictionScope::Accept,
            "missing_route",
            &floor_state_buckets,
            100.0,
        );

        assert!(curve.get(&(900, 30)).unwrap().probability.is_none());
    }

    #[test]
    fn public_serving_curve_uses_serving_component_probability() {
        let mut row = estimator_row("accept", "global", "*", 900, 0.3, 0.20);
        row.p_hit_serving = Some(0.77);
        let index = build_prediction_index(&[row]);
        let floor_state_buckets = BTreeMap::from([(30, "state".to_string())]);
        let calibration = calibration_suite_with_constant_cells(vec![("accept", 900, 30, 0.77)]);

        let curve = predict_serving_curve(
            &index,
            &calibration,
            PredictionScope::Accept,
            "missing_route",
            &floor_state_buckets,
            100.0,
        );

        let probability = curve.get(&(900, 30)).unwrap().probability.unwrap();
        assert!((probability - 0.77).abs() < 1e-12);
    }

    #[test]
    fn prediction_falls_back_to_pit_state_when_route_missing() {
        let state = estimator_row(
            "accept",
            "global_state",
            "entry_rank_ge_995|exit_target_le_p25|exit_start_ge_m050|alive_le_15s",
            900,
            0.3,
            0.80,
        );
        let index = build_prediction_index(&[state]);
        let p = predict(
            &index,
            PredictionScope::Accept,
            "missing_route",
            "entry_rank_ge_995|exit_target_le_p25|exit_start_ge_m050|alive_le_15s",
            900,
            floor_to_bp(0.3),
            100.0,
        )
        .unwrap();
        assert!((p - 0.80).abs() < 1e-9);
    }

    #[test]
    fn exit_target_position_is_floor_specific_and_uses_pit_exit_quantiles() {
        let p25 = Some(-3.0);
        let p50 = Some(-2.0);
        let p75 = Some(-1.0);
        let p95 = Some(0.5);

        assert_eq!(
            exit_target_position_from_quantiles(-3.5, p25, p50, p75, p95),
            Some(ExitTargetPosition::LeP25)
        );
        assert_eq!(
            exit_target_position_from_quantiles(-2.5, p25, p50, p75, p95),
            Some(ExitTargetPosition::P25P50)
        );
        assert_eq!(
            exit_target_position_from_quantiles(-1.5, p25, p50, p75, p95),
            Some(ExitTargetPosition::P50P75)
        );
        assert_eq!(
            exit_target_position_from_quantiles(-0.5, p25, p50, p75, p95),
            Some(ExitTargetPosition::P75P95)
        );
        assert_eq!(
            exit_target_position_from_quantiles(1.0, p25, p50, p75, p95),
            Some(ExitTargetPosition::GtP95)
        );
    }

    #[test]
    fn exit_target_position_rejects_non_monotonic_quantiles() {
        assert_eq!(
            exit_target_position_from_quantiles(
                -1.0,
                Some(-2.0),
                Some(-3.0),
                Some(-1.0),
                Some(0.0),
            ),
            None
        );
    }

    #[test]
    fn supervised_dedupe_skips_exact_duplicate_floor_key() {
        let mut tracker = DedupeTracker::new("test");
        let key = supervised_dedupe_row_key("sample-1", 900);
        let fp = SupervisedDedupeFingerprint { digest: 42 };

        assert_eq!(
            tracker.observe(key, fp, SplitName::Train, "sample-1", "route-1", 6),
            DedupeDecision::Unique
        );
        assert_eq!(
            tracker.observe(key, fp, SplitName::Train, "sample-1", "route-1", 6),
            DedupeDecision::DuplicateExact
        );

        let audit = tracker.into_audit();
        assert_eq!(audit.rows_seen, 2);
        assert_eq!(audit.unique_rows, 1);
        assert_eq!(audit.duplicate_exact_rows, 1);
        assert_eq!(audit.duplicate_conflict_rows, 0);
        assert_eq!(audit.floor_keys_seen, 12);
        assert_eq!(audit.unique_floor_keys, 6);
        assert_eq!(audit.duplicate_exact_floor_keys, 6);
        assert_eq!(audit.duplicate_conflict_floor_keys, 0);
        assert_eq!(audit.duplicate_exact_by_split.get("train"), Some(&1));
    }

    #[test]
    fn supervised_dedupe_flags_conflicting_duplicate_floor_key() {
        let mut tracker = DedupeTracker::new("test");
        let key = supervised_dedupe_row_key("sample-1", 900);

        assert_eq!(
            tracker.observe(
                key,
                SupervisedDedupeFingerprint { digest: 42 },
                SplitName::Train,
                "sample-1",
                "route-1",
                6,
            ),
            DedupeDecision::Unique
        );
        assert_eq!(
            tracker.observe(
                key,
                SupervisedDedupeFingerprint { digest: 43 },
                SplitName::Train,
                "sample-1",
                "route-1",
                6,
            ),
            DedupeDecision::DuplicateConflict
        );

        let audit = tracker.into_audit();
        assert_eq!(audit.rows_seen, 2);
        assert_eq!(audit.unique_rows, 1);
        assert_eq!(audit.duplicate_exact_rows, 0);
        assert_eq!(audit.duplicate_conflict_rows, 1);
        assert_eq!(audit.floor_keys_seen, 12);
        assert_eq!(audit.unique_floor_keys, 6);
        assert_eq!(audit.duplicate_exact_floor_keys, 0);
        assert_eq!(audit.duplicate_conflict_floor_keys, 6);
        assert_eq!(audit.duplicate_conflict_by_split.get("train"), Some(&1));
    }

    #[test]
    fn isotonic_calibration_merges_decreasing_blocks() {
        let mut buckets = BTreeMap::new();
        buckets.insert(100, CalibrationBucket { n: 10, hits: 8 });
        buckets.insert(200, CalibrationBucket { n: 10, hits: 2 });
        buckets.insert(300, CalibrationBucket { n: 10, hits: 9 });

        let blocks = fit_isotonic_blocks(&buckets);

        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].lower_key, 100);
        assert_eq!(blocks[0].upper_key, 200);
        assert!((blocks[0].calibrated_p - 0.5).abs() < 1e-12);
        assert_eq!(blocks[1].lower_key, 300);
        assert_eq!(blocks[1].upper_key, 300);
        assert!((blocks[1].calibrated_p - 0.9).abs() < 1e-12);
    }

    #[test]
    fn calibration_model_falls_back_when_support_is_low() {
        let mut acc = CalibrationFitAccumulator::default();
        acc.observe(Some(0.9), FloorOutcomeKind::Realized);
        let model = CalibrationModel::fit(CalibrationCellKey::new("accept", 900, 80), acc, 10);

        assert_eq!(model.status, "insufficient_calibration_support");
        assert_eq!(model.n_complete, 1);
        assert!((model.calibrate(0.42) - 0.42).abs() < 1e-12);
    }

    #[test]
    fn calibration_suite_requires_support_per_horizon_floor_cell() {
        let scopes = vec![PredictionScope::Accept];
        let mut accumulators = BTreeMap::new();
        let key = CalibrationCellKey::new("accept", 900, 80);
        let mut acc = CalibrationFitAccumulator::default();
        for _ in 0..10 {
            acc.observe(Some(0.2), FloorOutcomeKind::Realized);
        }
        accumulators.insert(key, acc);

        let suite = CalibrationSuite::from_accumulators(&scopes, accumulators, 10);

        assert_eq!(suite.model("accept", 900, 80).unwrap().status, "ok");
        assert_eq!(
            suite.model("accept", 28_800, 300).unwrap().status,
            "insufficient_calibration_support"
        );
        assert!(suite.cells_not_ready > 0);
        assert_eq!(suite.scope_status("accept").0, "partial_cell_support");
        let raw_fallback = suite.calibrate("accept", 28_800, 300, 0.42);
        assert!(!raw_fallback.applied);
        assert!((raw_fallback.probability - 0.42).abs() < 1e-12);
    }

    fn estimator_row(
        scope: &str,
        level: &str,
        entity: &str,
        horizon_s: u32,
        floor_pct: f32,
        p_hit: f64,
    ) -> EstimatorRow {
        EstimatorRow {
            trainer_artifact_version: TRAINER_VERSION.to_string(),
            model_family: MODEL_FAMILY.to_string(),
            estimator_method: "test".to_string(),
            aggregation_level: level.to_string(),
            population_scope: scope.to_string(),
            entity_key: entity.to_string(),
            horizon_s,
            floor_pct,
            n_total: 1,
            n_complete: 1,
            n_realized: 1,
            n_miss: 0,
            n_censored: 0,
            n_eff_sampling: Some(1.0),
            p_hit_km_raw: Some(p_hit),
            p_hit_km: Some(p_hit),
            p_hit_ci_lower_raw: Some(p_hit),
            p_hit_ci_lower: Some(p_hit),
            p_hit_ci_upper_raw: Some(p_hit),
            p_hit_ci_upper: Some(p_hit),
            p_hit_monotonicity_delta: Some(0.0),
            p_hit_monotonicity_adjusted: false,
            p_hit_calibrated_raw: None,
            p_hit_calibration_applied: false,
            p_hit_serving: None,
            p_hit_serving_monotonicity_delta: None,
            p_hit_serving_monotonicity_adjusted: false,
            p_hit_lower_bound: Some(p_hit),
            p_hit_complete_naive: Some(p_hit),
            p_hit_ipw_complete: Some(p_hit),
            p_censor: 0.0,
            t_hit_conditional_p25_s: Some(1),
            t_hit_conditional_p50_s: Some(1),
            t_hit_conditional_p75_s: Some(1),
            ci_method: CI_METHOD.to_string(),
            sampling_probability_invalid: 0,
        }
    }

    fn calibration_suite_with_constant_cells(
        cells: Vec<(&str, u32, i32, f64)>,
    ) -> CalibrationSuite {
        let cells = cells
            .into_iter()
            .map(|(scope, horizon_s, floor_bp, calibrated_p)| {
                let key = CalibrationCellKey::new(scope, horizon_s, floor_bp);
                let artifact_key = key.as_artifact_key();
                (
                    artifact_key.clone(),
                    CalibrationModel {
                        prediction_scope: scope.to_string(),
                        horizon_s,
                        floor_pct: floor_bp as f32 / 100.0,
                        floor_bp,
                        cell_key: artifact_key,
                        status: "ok".to_string(),
                        n_rows: MIN_CALIBRATION_COMPLETE,
                        n_predicted: MIN_CALIBRATION_COMPLETE,
                        n_abstained: 0,
                        n_complete: MIN_CALIBRATION_COMPLETE,
                        n_censored: 0,
                        unique_raw_scores: 1,
                        knots: vec![CalibrationKnot {
                            raw_lower: 0.0,
                            raw_upper: 1.0,
                            calibrated_p,
                            n_complete: MIN_CALIBRATION_COMPLETE,
                            hits: (calibrated_p * MIN_CALIBRATION_COMPLETE as f64).round() as u64,
                        }],
                        raw_quality: CalibrationQuality::default(),
                        calibrated_quality: CalibrationQuality::default(),
                    },
                )
            })
            .collect::<BTreeMap<_, _>>();
        CalibrationSuite {
            calibrator_version: CALIBRATOR_VERSION.to_string(),
            method: CALIBRATOR_METHOD.to_string(),
            serving_method: SERVING_CALIBRATOR_METHOD.to_string(),
            min_complete: MIN_CALIBRATION_COMPLETE,
            diagnostic_only: false,
            censoring_treatment: "test".to_string(),
            cells_total: cells.len() as u64,
            cells_ready: cells.len() as u64,
            cells_not_ready: 0,
            cells_not_ready_examples: Vec::new(),
            scope_models: scope_models_for_constant_cells(&cells),
            cells,
        }
    }

    fn scope_models_for_constant_cells(
        cells: &BTreeMap<String, CalibrationModel>,
    ) -> BTreeMap<String, ScopeCalibrationModel> {
        let mut by_scope = BTreeMap::<String, Vec<f64>>::new();
        for cell in cells.values() {
            if let Some(knot) = cell.knots.first() {
                by_scope
                    .entry(cell.prediction_scope.clone())
                    .or_default()
                    .push(knot.calibrated_p);
            }
        }
        by_scope
            .into_iter()
            .map(|(scope, values)| {
                let calibrated_p = if values.is_empty() {
                    0.0
                } else {
                    values.iter().sum::<f64>() / values.len() as f64
                };
                (
                    scope.clone(),
                    ScopeCalibrationModel {
                        prediction_scope: scope,
                        status: "ok".to_string(),
                        n_rows: MIN_CALIBRATION_COMPLETE,
                        n_predicted: MIN_CALIBRATION_COMPLETE,
                        n_abstained: 0,
                        n_complete: MIN_CALIBRATION_COMPLETE,
                        n_censored: 0,
                        unique_raw_scores: 1,
                        knots: vec![CalibrationKnot {
                            raw_lower: 0.0,
                            raw_upper: 1.0,
                            calibrated_p,
                            n_complete: MIN_CALIBRATION_COMPLETE,
                            hits: (calibrated_p * MIN_CALIBRATION_COMPLETE as f64).round() as u64,
                        }],
                        raw_quality: CalibrationQuality::default(),
                        calibrated_quality: CalibrationQuality::default(),
                    },
                )
            })
            .collect()
    }
}
