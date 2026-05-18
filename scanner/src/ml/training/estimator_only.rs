use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
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
const TRAINER_VERSION: &str = "estimator_only_ecdf/v0.1.0";
const MODEL_FAMILY: &str = "forward_labeled_ecdf";
const OUTPUT_CONTRACT_VERSION: &str = "trade_recommendation/v2.3";
const CI_METHOD: &str = "kaplan_meier_loglog_greenwood_95";
const STATE_BUCKET_VERSION: &str = "pit_state_bucket/v1";
const PREDICTION_METHOD: &str = "route_km_shrunk_to_global_pit_state_km";
const EPS: f32 = 1e-4;
const MAX_AUDIT_ISSUES: usize = 1_000;
const ARTIFACT_DIGEST_KIND: &str = "fnv1a128_file_v1";
const STORAGE_V2_LOGICAL_DIGEST_KIND: &str = "fnv1a64_storage_v2_logical_required_v1";
const EXPECTED_FLOOR_BP: &[i32] = &[30, 50, 80, 120, 200, 300];
const EXPECTED_HORIZONS_S: &[u32] = &[900, 1800, 3600, 7200, 14400, 28800];

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
            p_hit_km: km.p_hit,
            p_hit_ci_lower: km.ci_lower,
            p_hit_ci_upper: km.ci_upper,
            p_hit_lower_bound,
            p_hit_complete_naive,
            p_hit_ipw_complete,
            p_censor,
            t_hit_p25_s: quantile_from_counts(&self.event_counts, 0.25),
            t_hit_p50_s: quantile_from_counts(&self.event_counts, 0.50),
            t_hit_p75_s: quantile_from_counts(&self.event_counts, 0.75),
            ci_method: CI_METHOD.to_string(),
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
    p_hit_km: Option<f64>,
    p_hit_ci_lower: Option<f64>,
    p_hit_ci_upper: Option<f64>,
    p_hit_lower_bound: Option<f64>,
    p_hit_complete_naive: Option<f64>,
    p_hit_ipw_complete: Option<f64>,
    p_censor: f64,
    t_hit_p25_s: Option<u32>,
    t_hit_p50_s: Option<u32>,
    t_hit_p75_s: Option<u32>,
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

#[derive(Debug, Default, Serialize)]
struct ScoreStats {
    prediction_scope: String,
    prediction_method: String,
    state_bucket_version: String,
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
    fn new(prediction_scope: String, decision_threshold: f64, shrinkage_k: f64) -> Self {
        Self {
            stats: ScoreStats {
                prediction_scope,
                prediction_method: PREDICTION_METHOD.to_string(),
                state_bucket_version: STATE_BUCKET_VERSION.to_string(),
                decision_threshold,
                shrinkage_k,
                ..ScoreStats::default()
            },
            ..ScoreAccumulator::default()
        }
    }

    fn observe(&mut self, prediction: Option<f64>, outcome: FloorOutcomeKind) {
        self.stats.n_rows = self.stats.n_rows.saturating_add(1);
        let Some(p) = prediction else {
            self.stats.n_abstained = self.stats.n_abstained.saturating_add(1);
            return;
        };
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
    monotonicity_audit: MonotonicityAudit,
    promotion_allowed: bool,
    promotion_blockers: Vec<String>,
    artifacts: BTreeMap<String, ArtifactInfo>,
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
    examples: Vec<String>,
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
    process_training_pass(&manifests, &split, &cli, &mut audit, &mut aggregates)?;

    let (estimator_rows, aggregate_build_stats) =
        build_prediction_surface(&aggregates, cli.min_support);
    let index = build_prediction_index(&estimator_rows);
    let scorecards = process_scoring_pass(&manifests, &split, &cli, &index)?;

    let monotonicity_audit = monotonicity_audit(&estimator_rows);
    let promotion_blockers = promotion_blockers(&audit, &scorecards, &monotonicity_audit, split);
    let promotion_allowed = promotion_blockers.is_empty();

    let estimator_path = out_dir.join("estimator_table.jsonl");
    let estimator_artifact = write_jsonl(&estimator_path, &estimator_rows)?;
    let audit_path = out_dir.join("dataset_audit.json");
    let audit_artifact = write_json(&audit_path, &audit)?;
    let scorecard_path = out_dir.join("scorecard.json");
    let scorecard_artifact = write_json(&scorecard_path, &scorecards)?;
    let sources_path = out_dir.join("sources.jsonl");
    let source_summaries = source_manifest_summaries(&manifests)?;
    let sources_artifact = write_jsonl(&sources_path, &source_summaries)?;

    let mut artifacts = BTreeMap::new();
    artifacts.insert("estimator_table".to_string(), estimator_artifact);
    artifacts.insert("dataset_audit".to_string(), audit_artifact);
    artifacts.insert("scorecard".to_string(), scorecard_artifact);
    artifacts.insert("sources".to_string(), sources_artifact);

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
        monotonicity_audit,
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
) -> Result<()> {
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
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
            process_train_batch(&view, n, split, audit, aggregates)?;
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

fn process_train_batch(
    view: &BatchView<'_>,
    n_rows: usize,
    split: &TemporalSplit,
    audit: &mut DatasetAudit,
    aggregates: &mut HashMap<AggregationKey, GroupStats>,
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
        let sample_decision = required_str(view.sample_decision, row, "sample_decision")?;
        let label_pi = optional_f32(view.label_sampling_probability, row)
            .or_else(|| optional_f32(Some(view.sampling_probability), row));
        let state_bucket = state_bucket_for_row(view, row);
        let hits = floor_hit_range(view.label_floor_hits, row)?;
        for hit_idx in hits {
            let floor_pct =
                required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
            let floor_bp = floor_to_bp(floor_pct);
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

fn process_scoring_pass(
    manifests: &[ManifestRecord],
    split: &TemporalSplit,
    cli: &Cli,
    index: &HashMap<AggregationKey, EstimatorRow>,
) -> Result<BTreeMap<String, ScoreStats>> {
    let mut rows_left = cli.max_rows.unwrap_or(u64::MAX);
    let scopes = score_scopes(cli.prediction_scope);
    let mut scores = scopes
        .iter()
        .map(|scope| {
            (
                scope.as_str().to_string(),
                ScoreAccumulator::new(
                    scope.as_str().to_string(),
                    cli.decision_threshold,
                    cli.shrinkage_k,
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
                &scopes,
                &mut scores,
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
    scopes: &[PredictionScope],
    scores: &mut BTreeMap<String, ScoreAccumulator>,
) -> Result<()> {
    for row in 0..n_rows {
        let ts = required_u64(view.ts_emit_ns, row, "ts_emit_ns")?;
        if split.assign(ts) != SplitName::Test {
            continue;
        }
        let sample_decision = required_str(view.sample_decision, row, "sample_decision")?;
        let route_id = required_str(view.route_id, row, "route_id")?;
        let horizon_s = required_u32(view.horizon_s, row, "horizon_s")?;
        let state_bucket = state_bucket_for_row(view, row);
        for hit_idx in floor_hit_range(view.label_floor_hits, row)? {
            let floor_pct =
                required_f32(view.hit_floor_pct, hit_idx, "label_floor_hits.floor_pct")?;
            let floor_bp = floor_to_bp(floor_pct);
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
                let key = scope.as_str();
                if let Some(score) = scores.get_mut(key) {
                    score.observe(prediction, outcome.outcome);
                }
            }
        }
    }
    Ok(())
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
        .or_else(|| state_row.and_then(|row| row.p_hit_km))
        .or_else(|| route_row.and_then(|row| row.p_hit_km))
        .or_else(|| global_row.and_then(|row| row.p_hit_km))
}

fn shrink_prediction(
    route_row: Option<&EstimatorRow>,
    prior_row: Option<&EstimatorRow>,
    shrinkage_k: f64,
) -> Option<f64> {
    let route = route_row?;
    let route_p = route.p_hit_km?;
    let Some(prior) = prior_row else {
        return Some(route_p);
    };
    let prior_p = prior.p_hit_km?;
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

fn state_bucket_for_row(view: &BatchView<'_>, row: usize) -> String {
    let entry_rank = probability_like_feature(view.features_t0, "entry_rank_percentile_24h", row);
    let exit_support = probability_like_feature(
        view.features_t0,
        "p_exit_ge_label_floor_minus_entry_24h",
        row,
    );
    let exit_start = optional_f32(Some(view.exit_start_pct), row);
    let alive_s = nonnegative_seconds_feature(view.features_t0, "time_alive_at_t0_s", row);
    format!(
        "{}|{}|{}|{}",
        entry_rank_bucket(entry_rank),
        exit_support_bucket(exit_support),
        exit_start_bucket(exit_start),
        alive_bucket(alive_s),
    )
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

fn exit_support_bucket(value: Option<f32>) -> &'static str {
    match value {
        Some(v) if v >= 0.50 => "exit_support_ge_50",
        Some(v) if v >= 0.25 => "exit_support_25_50",
        Some(v) if v >= 0.10 => "exit_support_10_25",
        Some(v) if v >= 0.05 => "exit_support_05_10",
        Some(_) => "exit_support_lt_05",
        None => "exit_support_unknown",
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
    if stats.n_total == 0 {
        return KmEstimate {
            p_hit: None,
            ci_lower: None,
            ci_upper: None,
        };
    }
    let mut times = BTreeMap::<u32, (u64, u64)>::new();
    for (&t, &d) in &stats.event_counts {
        times.entry(t).or_default().0 = d;
    }
    for (&t, &c) in &stats.censor_before_horizon_counts {
        times.entry(t).or_default().1 = c;
    }
    let mut at_risk = stats.n_total as f64;
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
    let mut audit = MonotonicityAudit::default();
    let mut curves = BTreeMap::<(String, String, String), Vec<&EstimatorRow>>::new();
    for row in rows {
        if row.p_hit_km.is_some() {
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
                if let (Some(pa), Some(pb)) = (a.p_hit_km, b.p_hit_km) {
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
                if let (Some(pa), Some(pb)) = (a.p_hit_km, b.p_hit_km) {
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

fn promotion_blockers(
    audit: &DatasetAudit,
    scorecards: &BTreeMap<String, ScoreStats>,
    monotonicity: &MonotonicityAudit,
    split: TemporalSplit,
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
    if !audit
        .schema_versions
        .contains_key(&LABELED_TRADE_SCHEMA_VERSION)
    {
        blockers.push("missing_current_labeled_trade_schema".to_string());
    }
    if scorecards.values().all(|score| score.n_complete == 0) {
        blockers.push("no_complete_test_rows_for_scorecard".to_string());
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
            "monotonicity_violations horizon={} floor={}",
            monotonicity.horizon_monotonicity_violations,
            monotonicity.floor_monotonicity_violations
        ));
    }
    blockers.push("exact_sample_horizon_floor_dedupe_not_yet_enabled".to_string());
    blockers.push("calibration_split_not_yet_used_for_isotonic_beta_or_conformal".to_string());
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

struct TrainerLogicalDigest {
    hash: u64,
    row: u64,
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
                entity: "entry_rank_ge_995|exit_support_ge_50|exit_start_ge_m050|alive_le_15s"
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
            "entry_rank_ge_995|exit_support_ge_50|exit_start_ge_m050|alive_le_15s",
            900,
            floor_to_bp(0.3),
            100.0,
        )
        .unwrap();
        assert!((p - 0.50).abs() < 1e-9);
    }

    #[test]
    fn prediction_falls_back_to_pit_state_when_route_missing() {
        let state = estimator_row(
            "accept",
            "global_state",
            "entry_rank_ge_995|exit_support_ge_50|exit_start_ge_m050|alive_le_15s",
            900,
            0.3,
            0.80,
        );
        let index = build_prediction_index(&[state]);
        let p = predict(
            &index,
            PredictionScope::Accept,
            "missing_route",
            "entry_rank_ge_995|exit_support_ge_50|exit_start_ge_m050|alive_le_15s",
            900,
            floor_to_bp(0.3),
            100.0,
        )
        .unwrap();
        assert!((p - 0.80).abs() < 1e-9);
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
            p_hit_km: Some(p_hit),
            p_hit_ci_lower: Some(p_hit),
            p_hit_ci_upper: Some(p_hit),
            p_hit_lower_bound: Some(p_hit),
            p_hit_complete_naive: Some(p_hit),
            p_hit_ipw_complete: Some(p_hit),
            p_censor: 0.0,
            t_hit_p25_s: Some(1),
            t_hit_p50_s: Some(1),
            t_hit_p75_s: Some(1),
            ci_method: CI_METHOD.to_string(),
            sampling_probability_invalid: 0,
        }
    }
}
