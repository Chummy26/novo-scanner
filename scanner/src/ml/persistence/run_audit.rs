//! Auditoria lossless por run de coleta ML.
//!
//! Esta camada não altera linhas, labels, sampling nem features. Ela apenas
//! agrega os manifestos Parquet já validados e produz um relatório que permite
//! ao trainer ou ao operador rejeitar uma coleta incompleta antes do treino.

use std::collections::{BTreeMap, BTreeSet, HashSet};
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use arrow_array::{Array, RecordBatch, StringArray, UInt32Array};
use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;
use parquet::file::reader::{FileReader, SerializedFileReader};
use serde::{Deserialize, Serialize};

use crate::ml::persistence::parquet_compactor::{DatasetKind, ParquetManifest};
use crate::ml::persistence::storage_v2::{
    open_storage_v2_sidecar_logical_reader, StorageV2SidecarManifest,
};

#[derive(Debug, Clone)]
pub struct RunAuditInput {
    pub run_id: String,
    pub pid: u32,
    pub started_ns: u64,
    pub ended_ns: u64,
    pub root_dir: PathBuf,
    pub raw_root: PathBuf,
    pub accepted_root: PathBuf,
    pub labeled_root: PathBuf,
    pub storage_v2_root: Option<PathBuf>,
    pub storage_v2_primary: bool,
    pub parquet_enabled: bool,
    pub strict_lossless: bool,
    pub cycles_started: u64,
    pub label_shutdown: LabelShutdownAudit,
    pub writers: Vec<WriterAudit>,
    pub preexisting_issues: Vec<String>,
    pub operational: OperationalAudit,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct LabelShutdownAudit {
    pub closed_total: u64,
    pub sent_total: u64,
    pub censored_total: u64,
    pub dropped_channel_closed_total: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WriterAudit {
    pub dataset_kind: String,
    pub total_written: u64,
    pub total_dropped: u64,
    pub compaction_succeeded: u64,
    pub compaction_failed: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct OperationalAudit {
    pub ml_cycle_queue_full_total: u64,
    pub full_cycle_over_budget_total: u64,
    pub ml_background_over_budget_total: u64,
    pub ml_cycle_queue_depth_current: i64,
    pub ml_cycle_queue_events_current: i64,
    pub ml_cycle_batch_inflight_current: i64,
    pub ml_cycle_events_inflight_current: i64,
    pub full_cycle_budget_ns: u64,
    pub full_cycle_p99_ns: u64,
    pub full_cycle_max_ns: u64,
    pub ml_background_p99_ns: u64,
    pub ml_background_max_ns: u64,
    pub ml_cycle_queue_wait_ops_total: u64,
    pub ml_cycle_queue_wait_ns_total: u64,
    pub process_working_set_bytes: u64,
    pub process_private_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunAuditReport {
    pub run_id: String,
    pub pid: u32,
    pub started_ns: u64,
    pub ended_ns: u64,
    pub duration_s: f64,
    pub verdict: RunAuditVerdict,
    pub issues: Vec<String>,
    #[serde(default)]
    pub warnings: Vec<String>,
    pub strict_lossless: bool,
    pub parquet_enabled: bool,
    pub storage_v2_primary: bool,
    pub cycles_started: u64,
    pub label_shutdown: LabelShutdownAudit,
    pub operational: OperationalAudit,
    pub writers: Vec<WriterAudit>,
    pub datasets: BTreeMap<String, DatasetRunSummary>,
    pub total_projected_7d_bytes: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RunAuditVerdict {
    Green,
    Red,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DatasetRunSummary {
    pub files: u64,
    pub rows: u64,
    pub parquet_files: u64,
    pub parquet_bytes: u64,
    pub jsonl_files: u64,
    pub jsonl_rows: u64,
    pub jsonl_bytes: u64,
    pub min_timestamp_ns: Option<u64>,
    pub max_timestamp_ns: Option<u64>,
    pub rows_per_min: f64,
    pub rows_per_cycle: f64,
    pub projected_7d_bytes: u64,
    pub schema_versions: BTreeMap<u16, u64>,
    pub sample_decisions: BTreeMap<String, u64>,
    pub horizons_s: BTreeMap<u32, u64>,
    pub outcomes: BTreeMap<String, u64>,
    pub censor_reasons: BTreeMap<String, u64>,
    pub label_floor_hit_lengths: BTreeMap<u32, u64>,
    pub label_floor_values: BTreeSet<String>,
    pub duplicate_keys_exact: Option<u64>,
    pub duplicate_check_status: String,
}

#[derive(Debug, Clone)]
struct ManifestWithPath {
    path: PathBuf,
    manifest: ParquetManifest,
}

#[derive(Debug, Clone)]
struct StorageV2ManifestWithPath {
    path: PathBuf,
    manifest: StorageV2SidecarManifest,
}

#[derive(Debug, Clone)]
struct JsonlRunFile {
    rows: u64,
    bytes: u64,
    min_timestamp_ns: Option<u64>,
    max_timestamp_ns: Option<u64>,
}

const MAX_EXACT_DUPLICATE_ROWS: u64 = 20_000_000;
const OPERATIONAL_QUEUE_FULL_RATE_RED: f64 = 0.001; // 0.1% of cycles.
const OPERATIONAL_FULL_CYCLE_OVER_BUDGET_RATE_RED: f64 = 0.001; // 0.1% of cycles.
const OPERATIONAL_BACKGROUND_OVER_BUDGET_RATE_RED: f64 = 0.01; // 1% of cycles, conservative.

fn per_cycle_rate(count: u64, cycles_started: u64) -> f64 {
    if count == 0 {
        return 0.0;
    }
    count as f64 / cycles_started.max(1) as f64
}

pub fn write_run_audit(input: RunAuditInput) -> Result<RunAuditReport> {
    let report = build_run_audit(&input)?;
    let report_dir = input.root_dir.join("runs").join(&input.run_id);
    fs::create_dir_all(&report_dir)
        .with_context(|| format!("create run audit dir {}", report_dir.display()))?;
    let json_path = report_dir.join("audit_report.json");
    let tmp_path = report_dir.join("audit_report.json.tmp");
    {
        let file =
            File::create(&tmp_path).with_context(|| format!("create {}", tmp_path.display()))?;
        serde_json::to_writer_pretty(file, &report)
            .with_context(|| format!("write {}", tmp_path.display()))?;
    }
    let file = File::open(&tmp_path).with_context(|| format!("open {}", tmp_path.display()))?;
    let roundtrip: RunAuditReport =
        serde_json::from_reader(file).with_context(|| format!("parse {}", tmp_path.display()))?;
    if roundtrip.run_id != report.run_id || roundtrip.verdict != report.verdict {
        let _ = fs::remove_file(&tmp_path);
        anyhow::bail!(
            "run audit report roundtrip mismatch em {}",
            json_path.display()
        );
    }
    fs::rename(&tmp_path, &json_path)
        .with_context(|| format!("rename {} -> {}", tmp_path.display(), json_path.display()))?;
    Ok(report)
}

fn build_run_audit(input: &RunAuditInput) -> Result<RunAuditReport> {
    let duration_s =
        input.ended_ns.saturating_sub(input.started_ns).max(1) as f64 / 1_000_000_000.0;
    let mut issues = input.preexisting_issues.clone();
    let mut warnings = Vec::new();
    if input.label_shutdown.closed_total != input.label_shutdown.sent_total {
        issues.push(format!(
            "label shutdown mismatch: closed_total={} sent_total={}",
            input.label_shutdown.closed_total, input.label_shutdown.sent_total
        ));
    }
    if input.label_shutdown.dropped_channel_closed_total != 0 {
        issues.push(format!(
            "label shutdown dropped_channel_closed_total={}",
            input.label_shutdown.dropped_channel_closed_total
        ));
    }
    for writer in &input.writers {
        if writer.total_dropped != 0 {
            issues.push(format!(
                "{} writer total_dropped={}",
                writer.dataset_kind, writer.total_dropped
            ));
        }
        if writer.compaction_failed != 0 {
            issues.push(format!(
                "{} writer compaction_failed={}",
                writer.dataset_kind, writer.compaction_failed
            ));
        }
    }
    if input.operational.ml_cycle_queue_full_total != 0 {
        let rate = per_cycle_rate(
            input.operational.ml_cycle_queue_full_total,
            input.cycles_started,
        );
        let message = format!(
            "operational backpressure: ml_cycle_queue_full_total={} rate_per_cycle={:.6} wait_ops={} wait_ns_total={}",
            input.operational.ml_cycle_queue_full_total,
            rate,
            input.operational.ml_cycle_queue_wait_ops_total,
            input.operational.ml_cycle_queue_wait_ns_total
        );
        if rate >= OPERATIONAL_QUEUE_FULL_RATE_RED {
            issues.push(message);
        } else {
            warnings.push(message);
        }
    }
    if input.operational.full_cycle_over_budget_total != 0 {
        let rate = per_cycle_rate(
            input.operational.full_cycle_over_budget_total,
            input.cycles_started,
        );
        let p99_over_budget = input.operational.full_cycle_budget_ns > 0
            && input.operational.full_cycle_p99_ns > input.operational.full_cycle_budget_ns;
        let message = format!(
            "operational latency: full_cycle_over_budget_total={} rate_per_cycle={:.6} budget_ns={} full_cycle_p99_ns={} full_cycle_max_ns={}",
            input.operational.full_cycle_over_budget_total,
            rate,
            input.operational.full_cycle_budget_ns,
            input.operational.full_cycle_p99_ns,
            input.operational.full_cycle_max_ns
        );
        if p99_over_budget || rate >= OPERATIONAL_FULL_CYCLE_OVER_BUDGET_RATE_RED {
            issues.push(message);
        } else {
            warnings.push(message);
        }
    } else if input.operational.full_cycle_budget_ns > 0
        && input.operational.full_cycle_max_ns > input.operational.full_cycle_budget_ns
    {
        warnings.push(format!(
            "operational latency warning: full_cycle_max_ns={} exceeds budget_ns={} with over_budget counter at 0",
            input.operational.full_cycle_max_ns, input.operational.full_cycle_budget_ns
        ));
    }
    if input.operational.ml_background_over_budget_total != 0 {
        let rate = per_cycle_rate(
            input.operational.ml_background_over_budget_total,
            input.cycles_started,
        );
        let p99_over_budget = input.operational.full_cycle_budget_ns > 0
            && input.operational.ml_background_p99_ns > input.operational.full_cycle_budget_ns;
        let message = format!(
            "operational latency: ml_background_over_budget_total={} rate_per_cycle={:.6} budget_ns={} ml_background_p99_ns={} ml_background_max_ns={}",
            input.operational.ml_background_over_budget_total,
            rate,
            input.operational.full_cycle_budget_ns,
            input.operational.ml_background_p99_ns,
            input.operational.ml_background_max_ns
        );
        if p99_over_budget || rate >= OPERATIONAL_BACKGROUND_OVER_BUDGET_RATE_RED {
            issues.push(message);
        } else {
            warnings.push(message);
        }
    } else if input.operational.full_cycle_budget_ns > 0
        && input.operational.ml_background_max_ns > input.operational.full_cycle_budget_ns
    {
        warnings.push(format!(
            "operational latency warning: ml_background_max_ns={} exceeds budget_ns={} with over_budget counter at 0",
            input.operational.ml_background_max_ns, input.operational.full_cycle_budget_ns
        ));
    }
    if input.operational.ml_cycle_queue_depth_current != 0
        || input.operational.ml_cycle_queue_events_current != 0
        || input.operational.ml_cycle_batch_inflight_current != 0
        || input.operational.ml_cycle_events_inflight_current != 0
    {
        issues.push(format!(
            "operational drain mismatch: queue_depth={} queue_events={} inflight_batches={} inflight_events={}",
            input.operational.ml_cycle_queue_depth_current,
            input.operational.ml_cycle_queue_events_current,
            input.operational.ml_cycle_batch_inflight_current,
            input.operational.ml_cycle_events_inflight_current
        ));
    }

    let mut datasets = BTreeMap::new();
    let dataset_roots = [
        ("raw_samples", input.raw_root.as_path()),
        ("accepted_samples", input.accepted_root.as_path()),
        ("labeled_trades", input.labeled_root.as_path()),
    ];
    for (dataset, root) in dataset_roots {
        let manifests =
            collect_current_run_manifests(root, input.pid, input.started_ns, input.ended_ns)
                .with_context(|| format!("collect manifests for {dataset}"))?;
        let storage_v2_manifests = if input.storage_v2_primary {
            match input.storage_v2_root.as_ref() {
                Some(storage_v2_root) => collect_current_run_storage_v2_manifests(
                    &storage_v2_root.join(dataset),
                    input.pid,
                    input.started_ns,
                    input.ended_ns,
                )
                .with_context(|| format!("collect storage_v2 manifests for {dataset}"))?,
                None => Vec::new(),
            }
        } else {
            Vec::new()
        };
        let use_storage_v2 = input.storage_v2_primary && !storage_v2_manifests.is_empty();
        let storage_v2_sources = storage_v2_manifest_source_jsonl_file_names(&storage_v2_manifests);
        let manifest_summary_inputs: Vec<ManifestWithPath> = if use_storage_v2 {
            manifests
                .iter()
                .filter(|item| {
                    manifest_source_jsonl_file_name(&item.manifest)
                        .map(|name| !storage_v2_sources.contains(&name))
                        .unwrap_or(true)
                })
                .cloned()
                .collect()
        } else {
            manifests.clone()
        };
        let mut summary =
            summarize_manifests(&manifest_summary_inputs, duration_s, input.cycles_started)?;
        if use_storage_v2 {
            let storage_v2_summary = summarize_storage_v2_manifests(
                &storage_v2_manifests,
                duration_s,
                input.cycles_started,
            )?;
            merge_dataset_summary(&mut summary, &storage_v2_summary);
            finalize_summary(&mut summary, duration_s, input.cycles_started);
        }
        let mut manifested_sources = manifest_source_jsonl_file_names(&manifests);
        manifested_sources.extend(storage_v2_manifest_source_jsonl_file_names(
            &storage_v2_manifests,
        ));
        let jsonl_files = collect_current_run_jsonl_files(
            root,
            dataset,
            input.pid,
            input.started_ns,
            input.ended_ns,
            &manifested_sources,
        )
        .with_context(|| format!("collect JSONLs for {dataset}"))?;
        merge_jsonl_files(&mut summary, &jsonl_files, duration_s, input.cycles_started);
        if let Some(writer) = input.writers.iter().find(|w| w.dataset_kind == dataset) {
            if summary.rows != writer.total_written {
                issues.push(format!(
                    "{dataset} row mismatch: disk_rows={} manifest_rows={} jsonl_rows={} writer_total_written={}",
                    summary.rows, summary.rows.saturating_sub(summary.jsonl_rows), summary.jsonl_rows, writer.total_written
                ));
            }
        }
        if summary.jsonl_rows > 0 {
            summary.duplicate_check_status = "skipped_jsonl_present".to_string();
        } else if summary.rows <= MAX_EXACT_DUPLICATE_ROWS {
            let duplicate_result = exact_duplicate_count_combined(
                dataset,
                &manifest_summary_inputs,
                if use_storage_v2 {
                    &storage_v2_manifests
                } else {
                    &[]
                },
            );
            match duplicate_result {
                Ok(n) => {
                    summary.duplicate_keys_exact = Some(n);
                    summary.duplicate_check_status = "exact".to_string();
                    if n > 0 {
                        issues.push(format!("{dataset} duplicate_keys_exact={n}"));
                    }
                }
                Err(e) => {
                    summary.duplicate_check_status = format!("error: {e}");
                    issues.push(format!("{dataset} duplicate check failed: {e}"));
                }
            }
        } else {
            summary.duplicate_check_status =
                format!("skipped_rows_exceed_limit_{}", MAX_EXACT_DUPLICATE_ROWS);
        }
        datasets.insert(dataset.to_string(), summary);
    }

    let total_projected_7d_bytes = datasets.values().map(|d| d.projected_7d_bytes).sum();
    let verdict = if issues.is_empty() {
        RunAuditVerdict::Green
    } else {
        RunAuditVerdict::Red
    };
    Ok(RunAuditReport {
        run_id: input.run_id.clone(),
        pid: input.pid,
        started_ns: input.started_ns,
        ended_ns: input.ended_ns,
        duration_s,
        verdict,
        issues,
        warnings,
        strict_lossless: input.strict_lossless,
        parquet_enabled: input.parquet_enabled,
        storage_v2_primary: input.storage_v2_primary,
        cycles_started: input.cycles_started,
        label_shutdown: input.label_shutdown,
        operational: input.operational.clone(),
        writers: input.writers.clone(),
        datasets,
        total_projected_7d_bytes,
    })
}

fn collect_current_run_manifests(
    root: &Path,
    pid: u32,
    started_ns: u64,
    ended_ns: u64,
) -> Result<Vec<ManifestWithPath>> {
    if !root.exists() {
        return Ok(Vec::new());
    }
    let pid_marker = format!("-{}_", pid);
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir).with_context(|| format!("read_dir {}", dir.display()))? {
            let entry = entry.with_context(|| format!("read_dir entry {}", dir.display()))?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
                continue;
            };
            if !name.ends_with(".parquet.manifest.json") {
                continue;
            }
            let file = File::open(&path).with_context(|| format!("open {}", path.display()))?;
            let manifest: ParquetManifest = serde_json::from_reader(file)
                .with_context(|| format!("parse {}", path.display()))?;
            let source_name = manifest
                .source_jsonl_path
                .replace('\\', "/")
                .rsplit('/')
                .next()
                .unwrap_or_default()
                .to_string();
            if source_name.contains(&pid_marker)
                && manifest_overlaps_run_window(&manifest, started_ns, ended_ns)
            {
                out.push(ManifestWithPath { path, manifest });
            }
        }
    }
    Ok(out)
}

fn collect_current_run_storage_v2_manifests(
    root: &Path,
    pid: u32,
    started_ns: u64,
    ended_ns: u64,
) -> Result<Vec<StorageV2ManifestWithPath>> {
    if !root.exists() {
        return Ok(Vec::new());
    }
    let pid_marker = format!("-{}_", pid);
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir).with_context(|| format!("read_dir {}", dir.display()))? {
            let entry = entry.with_context(|| format!("read_dir entry {}", dir.display()))?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
                continue;
            };
            if !name.ends_with(".storage_v2.manifest.json") {
                continue;
            }
            let file = File::open(&path).with_context(|| format!("open {}", path.display()))?;
            let manifest: StorageV2SidecarManifest = serde_json::from_reader(file)
                .with_context(|| format!("parse {}", path.display()))?;
            let source_name = storage_v2_source_file_name(&manifest);
            if source_name.contains(&pid_marker)
                && storage_v2_manifest_overlaps_run_window(&manifest, started_ns, ended_ns)
            {
                out.push(StorageV2ManifestWithPath { path, manifest });
            }
        }
    }
    Ok(out)
}

fn manifest_overlaps_run_window(
    manifest: &ParquetManifest,
    started_ns: u64,
    ended_ns: u64,
) -> bool {
    let Some(min_ts) = manifest.min_timestamp_ns else {
        return false;
    };
    let Some(max_ts) = manifest.max_timestamp_ns else {
        return false;
    };
    max_ts >= started_ns && min_ts <= ended_ns
}

fn storage_v2_manifest_overlaps_run_window(
    manifest: &StorageV2SidecarManifest,
    started_ns: u64,
    ended_ns: u64,
) -> bool {
    match (manifest.min_timestamp_ns, manifest.max_timestamp_ns) {
        (Some(min_ts), Some(max_ts)) => max_ts >= started_ns && min_ts <= ended_ns,
        _ => true,
    }
}

fn summarize_manifests(
    manifests: &[ManifestWithPath],
    duration_s: f64,
    cycles_started: u64,
) -> Result<DatasetRunSummary> {
    let mut summary = DatasetRunSummary::default();
    summary.parquet_files = manifests.len() as u64;
    summary.files = summary.parquet_files;
    for item in manifests {
        let m = &item.manifest;
        summary.rows = summary.rows.saturating_add(m.parquet_row_count);
        summary.parquet_bytes = summary.parquet_bytes.saturating_add(m.parquet_file_bytes);
        merge_minmax(
            &mut summary.min_timestamp_ns,
            &mut summary.max_timestamp_ns,
            m.min_timestamp_ns,
            m.max_timestamp_ns,
        );
        merge_u16_counts(
            &mut summary.schema_versions,
            &m.semantic_stats.schema_versions,
        );
        merge_str_counts(
            &mut summary.sample_decisions,
            &m.semantic_stats.sample_decisions,
        );
        merge_u32_counts(&mut summary.horizons_s, &m.semantic_stats.horizons_s);
        merge_str_counts(&mut summary.outcomes, &m.semantic_stats.outcomes);
        merge_str_counts(
            &mut summary.censor_reasons,
            &m.semantic_stats.censor_reasons,
        );
        merge_u32_counts(
            &mut summary.label_floor_hit_lengths,
            &m.semantic_stats.label_floor_hit_lengths,
        );
        summary
            .label_floor_values
            .extend(m.semantic_stats.label_floor_values.iter().cloned());
    }
    finalize_summary(&mut summary, duration_s, cycles_started);
    Ok(summary)
}

fn summarize_storage_v2_manifests(
    manifests: &[StorageV2ManifestWithPath],
    duration_s: f64,
    cycles_started: u64,
) -> Result<DatasetRunSummary> {
    let mut summary = DatasetRunSummary::default();
    summary.parquet_files = manifests.len().saturating_mul(2) as u64;
    summary.files = summary.parquet_files;
    for item in manifests {
        let m = &item.manifest;
        let manifest_bytes = fs::metadata(&item.path)
            .with_context(|| format!("metadata {}", item.path.display()))?
            .len();
        let fact_bytes = fs::metadata(&m.fact_parquet_path)
            .with_context(|| format!("metadata {}", m.fact_parquet_path))?
            .len();
        let route_dim_bytes = fs::metadata(&m.route_dim_parquet_path)
            .with_context(|| format!("metadata {}", m.route_dim_parquet_path))?
            .len();
        let actual_fact_rows = parquet_row_count(Path::new(&m.fact_parquet_path))
            .with_context(|| format!("validate fact {}", m.fact_parquet_path))?;
        if actual_fact_rows != m.fact_row_count {
            anyhow::bail!(
                "storage_v2 fact row count mismatch {}: manifest={} actual={}",
                m.fact_parquet_path,
                m.fact_row_count,
                actual_fact_rows
            );
        }
        let actual_route_dim_rows = parquet_row_count(Path::new(&m.route_dim_parquet_path))
            .with_context(|| format!("validate route_dim {}", m.route_dim_parquet_path))?;
        if actual_route_dim_rows != m.route_dim_row_count {
            anyhow::bail!(
                "storage_v2 route_dim row count mismatch {}: manifest={} actual={}",
                m.route_dim_parquet_path,
                m.route_dim_row_count,
                actual_route_dim_rows
            );
        }
        summary.rows = summary.rows.saturating_add(m.fact_row_count);
        summary.parquet_bytes = summary
            .parquet_bytes
            .saturating_add(fact_bytes)
            .saturating_add(route_dim_bytes)
            .saturating_add(manifest_bytes);
        merge_minmax(
            &mut summary.min_timestamp_ns,
            &mut summary.max_timestamp_ns,
            m.min_timestamp_ns,
            m.max_timestamp_ns,
        );
        if m.semantic_stats.schema_versions.is_empty() && m.schema_version != 0 {
            *summary.schema_versions.entry(m.schema_version).or_insert(0) += m.fact_row_count;
        } else {
            merge_u16_counts(
                &mut summary.schema_versions,
                &m.semantic_stats.schema_versions,
            );
        }
        merge_str_counts(
            &mut summary.sample_decisions,
            &m.semantic_stats.sample_decisions,
        );
        merge_u32_counts(&mut summary.horizons_s, &m.semantic_stats.horizons_s);
        merge_str_counts(&mut summary.outcomes, &m.semantic_stats.outcomes);
        merge_str_counts(
            &mut summary.censor_reasons,
            &m.semantic_stats.censor_reasons,
        );
        merge_u32_counts(
            &mut summary.label_floor_hit_lengths,
            &m.semantic_stats.label_floor_hit_lengths,
        );
        summary
            .label_floor_values
            .extend(m.semantic_stats.label_floor_values.iter().cloned());
    }
    finalize_summary(&mut summary, duration_s, cycles_started);
    Ok(summary)
}

fn merge_jsonl_files(
    summary: &mut DatasetRunSummary,
    jsonl_files: &[JsonlRunFile],
    duration_s: f64,
    cycles_started: u64,
) {
    for item in jsonl_files {
        summary.files = summary.files.saturating_add(1);
        summary.jsonl_files = summary.jsonl_files.saturating_add(1);
        summary.jsonl_rows = summary.jsonl_rows.saturating_add(item.rows);
        summary.jsonl_bytes = summary.jsonl_bytes.saturating_add(item.bytes);
        summary.rows = summary.rows.saturating_add(item.rows);
        merge_minmax(
            &mut summary.min_timestamp_ns,
            &mut summary.max_timestamp_ns,
            item.min_timestamp_ns,
            item.max_timestamp_ns,
        );
    }
    finalize_summary(summary, duration_s, cycles_started);
}

fn finalize_summary(summary: &mut DatasetRunSummary, duration_s: f64, cycles_started: u64) {
    summary.rows_per_min = (summary.rows as f64) / (duration_s / 60.0).max(1.0 / 60.0);
    summary.rows_per_cycle = if cycles_started > 0 {
        (summary.rows as f64) / (cycles_started as f64)
    } else {
        0.0
    };
    let total_bytes = summary.parquet_bytes.saturating_add(summary.jsonl_bytes);
    summary.projected_7d_bytes = ((total_bytes as f64) / duration_s * 604_800.0).round() as u64;
}

fn merge_dataset_summary(dst: &mut DatasetRunSummary, src: &DatasetRunSummary) {
    dst.files = dst.files.saturating_add(src.files);
    dst.rows = dst.rows.saturating_add(src.rows);
    dst.parquet_files = dst.parquet_files.saturating_add(src.parquet_files);
    dst.parquet_bytes = dst.parquet_bytes.saturating_add(src.parquet_bytes);
    dst.jsonl_files = dst.jsonl_files.saturating_add(src.jsonl_files);
    dst.jsonl_rows = dst.jsonl_rows.saturating_add(src.jsonl_rows);
    dst.jsonl_bytes = dst.jsonl_bytes.saturating_add(src.jsonl_bytes);
    merge_minmax(
        &mut dst.min_timestamp_ns,
        &mut dst.max_timestamp_ns,
        src.min_timestamp_ns,
        src.max_timestamp_ns,
    );
    merge_u16_counts(&mut dst.schema_versions, &src.schema_versions);
    merge_str_counts(&mut dst.sample_decisions, &src.sample_decisions);
    merge_u32_counts(&mut dst.horizons_s, &src.horizons_s);
    merge_str_counts(&mut dst.outcomes, &src.outcomes);
    merge_str_counts(&mut dst.censor_reasons, &src.censor_reasons);
    merge_u32_counts(
        &mut dst.label_floor_hit_lengths,
        &src.label_floor_hit_lengths,
    );
    dst.label_floor_values
        .extend(src.label_floor_values.iter().cloned());
}

fn manifest_source_jsonl_file_names(manifests: &[ManifestWithPath]) -> BTreeSet<String> {
    manifests
        .iter()
        .filter_map(|item| manifest_source_jsonl_file_name(&item.manifest))
        .collect()
}

fn manifest_source_jsonl_file_name(manifest: &ParquetManifest) -> Option<String> {
    manifest
        .source_jsonl_path
        .replace('\\', "/")
        .rsplit('/')
        .next()
        .map(ToString::to_string)
}

fn storage_v2_manifest_source_jsonl_file_names(
    manifests: &[StorageV2ManifestWithPath],
) -> BTreeSet<String> {
    manifests
        .iter()
        .filter_map(|item| {
            if item.manifest.source_jsonl_path.is_empty() {
                None
            } else {
                item.manifest
                    .source_jsonl_path
                    .replace('\\', "/")
                    .rsplit('/')
                    .next()
                    .map(ToString::to_string)
            }
        })
        .collect()
}

fn storage_v2_source_file_name(manifest: &StorageV2SidecarManifest) -> String {
    let source = if manifest.source_jsonl_path.is_empty() {
        &manifest.source_parquet_path
    } else {
        &manifest.source_jsonl_path
    };
    source
        .replace('\\', "/")
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .to_string()
}

fn collect_current_run_jsonl_files(
    root: &Path,
    dataset: &str,
    pid: u32,
    started_ns: u64,
    ended_ns: u64,
    manifested_sources: &BTreeSet<String>,
) -> Result<Vec<JsonlRunFile>> {
    if !root.exists() {
        return Ok(Vec::new());
    }
    let pid_marker = format!("-{}_", pid);
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir).with_context(|| format!("read_dir {}", dir.display()))? {
            let entry = entry.with_context(|| format!("read_dir entry {}", dir.display()))?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
                continue;
            }
            let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
                continue;
            };
            if manifested_sources.contains(name) || !name.contains(&pid_marker) {
                continue;
            }
            let stats = summarize_jsonl_file(dataset, &path)
                .with_context(|| format!("summarize {}", path.display()))?;
            if stats.rows == 0 || jsonl_overlaps_run_window(&stats, started_ns, ended_ns) {
                out.push(stats);
            }
        }
    }
    Ok(out)
}

fn summarize_jsonl_file(dataset: &str, path: &Path) -> Result<JsonlRunFile> {
    let metadata = fs::metadata(path).with_context(|| format!("metadata {}", path.display()))?;
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let reader = BufReader::new(file);
    let timestamp_field = timestamp_field_for_dataset(dataset);
    let mut rows = 0u64;
    let mut min_timestamp_ns = None;
    let mut max_timestamp_ns = None;
    for maybe_line in reader.lines() {
        let line = maybe_line.with_context(|| format!("read line from {}", path.display()))?;
        if line.trim().is_empty() {
            continue;
        }
        rows = rows.saturating_add(1);
        let value: serde_json::Value = serde_json::from_str(&line)
            .with_context(|| format!("parse JSONL row from {}", path.display()))?;
        let timestamp = value.get(timestamp_field).and_then(|v| v.as_u64());
        merge_minmax(
            &mut min_timestamp_ns,
            &mut max_timestamp_ns,
            timestamp,
            timestamp,
        );
    }
    Ok(JsonlRunFile {
        rows,
        bytes: metadata.len(),
        min_timestamp_ns,
        max_timestamp_ns,
    })
}

fn timestamp_field_for_dataset(dataset: &str) -> &'static str {
    if dataset == "labeled_trades" {
        "ts_emit_ns"
    } else {
        "ts_ns"
    }
}

fn jsonl_overlaps_run_window(stats: &JsonlRunFile, started_ns: u64, ended_ns: u64) -> bool {
    match (stats.min_timestamp_ns, stats.max_timestamp_ns) {
        (Some(min_ts), Some(max_ts)) => max_ts >= started_ns && min_ts <= ended_ns,
        _ => true,
    }
}

fn parquet_row_count(path: &Path) -> Result<u64> {
    let file =
        File::open(path).with_context(|| format!("open parquet metadata {}", path.display()))?;
    let reader = SerializedFileReader::new(file)
        .with_context(|| format!("read parquet metadata {}", path.display()))?;
    Ok(reader.metadata().file_metadata().num_rows().max(0) as u64)
}

fn exact_duplicate_count_combined(
    dataset: &str,
    manifests: &[ManifestWithPath],
    storage_v2_manifests: &[StorageV2ManifestWithPath],
) -> Result<u64> {
    let dataset_kind = dataset_kind_for_name(dataset)?;
    let mut seen = HashSet::<String>::new();
    let mut duplicates = 0u64;
    duplicates = duplicates.saturating_add(exact_duplicate_count_into_seen(
        dataset, manifests, &mut seen,
    )?);
    duplicates = duplicates.saturating_add(exact_duplicate_count_storage_v2_into_seen(
        dataset,
        dataset_kind,
        storage_v2_manifests,
        &mut seen,
    )?);
    Ok(duplicates)
}

fn exact_duplicate_count_into_seen(
    dataset: &str,
    manifests: &[ManifestWithPath],
    seen: &mut HashSet<String>,
) -> Result<u64> {
    let mut duplicates = 0u64;
    for item in manifests {
        let parquet_path = PathBuf::from(&item.manifest.parquet_path);
        let file = File::open(&parquet_path)
            .with_context(|| format!("open parquet {}", parquet_path.display()))?;
        let builder = ParquetRecordBatchReaderBuilder::try_new(file)
            .with_context(|| format!("build parquet reader {}", parquet_path.display()))?;
        let mut reader = builder
            .build()
            .with_context(|| format!("read parquet {}", parquet_path.display()))?;
        for maybe_batch in &mut reader {
            let batch = maybe_batch
                .with_context(|| format!("read parquet batch {}", parquet_path.display()))?;
            duplicates = duplicates
                .saturating_add(duplicate_count_in_batch(dataset, &batch, seen, &item.path)?);
        }
    }
    Ok(duplicates)
}

fn exact_duplicate_count_storage_v2_into_seen(
    dataset: &str,
    dataset_kind: DatasetKind,
    manifests: &[StorageV2ManifestWithPath],
    seen: &mut HashSet<String>,
) -> Result<u64> {
    let mut duplicates = 0u64;
    for item in manifests {
        let mut reader = open_storage_v2_sidecar_logical_reader(&item.manifest, dataset_kind)
            .with_context(|| format!("open storage_v2 logical reader {}", item.path.display()))?;
        for maybe_batch in &mut reader {
            let batch = maybe_batch.with_context(|| {
                format!("read storage_v2 logical batch {}", item.path.display())
            })?;
            duplicates = duplicates
                .saturating_add(duplicate_count_in_batch(dataset, &batch, seen, &item.path)?);
        }
    }
    Ok(duplicates)
}

fn dataset_kind_for_name(dataset: &str) -> Result<DatasetKind> {
    match dataset {
        "raw_samples" => Ok(DatasetKind::RawSamples),
        "accepted_samples" => Ok(DatasetKind::AcceptedSamples),
        "labeled_trades" => Ok(DatasetKind::LabeledTrades),
        _ => anyhow::bail!("unknown dataset kind '{dataset}'"),
    }
}

fn duplicate_count_in_batch(
    dataset: &str,
    batch: &RecordBatch,
    seen: &mut HashSet<String>,
    manifest_path: &Path,
) -> Result<u64> {
    let sample_idx = batch.schema().index_of("sample_id").with_context(|| {
        format!(
            "sample_id missing for duplicate check {}",
            manifest_path.display()
        )
    })?;
    let sample_ids = batch
        .column(sample_idx)
        .as_any()
        .downcast_ref::<StringArray>()
        .context("sample_id has non-Utf8 type")?;
    let horizon_values = if dataset == "labeled_trades" {
        let idx = batch
            .schema()
            .index_of("horizon_s")
            .context("horizon_s missing for labeled duplicate check")?;
        Some(
            batch
                .column(idx)
                .as_any()
                .downcast_ref::<UInt32Array>()
                .context("horizon_s has non-UInt32 type")?,
        )
    } else {
        None
    };

    let mut duplicates = 0u64;
    for row in 0..batch.num_rows() {
        if sample_ids.is_null(row) {
            continue;
        }
        let key = match horizon_values {
            Some(horizons) if !horizons.is_null(row) => {
                format!("{}#{}", sample_ids.value(row), horizons.value(row))
            }
            _ => sample_ids.value(row).to_string(),
        };
        if !seen.insert(key) {
            duplicates = duplicates.saturating_add(1);
        }
    }
    Ok(duplicates)
}

fn merge_minmax(
    min_out: &mut Option<u64>,
    max_out: &mut Option<u64>,
    min_in: Option<u64>,
    max_in: Option<u64>,
) {
    if let Some(v) = min_in {
        *min_out = Some(min_out.map_or(v, |cur| cur.min(v)));
    }
    if let Some(v) = max_in {
        *max_out = Some(max_out.map_or(v, |cur| cur.max(v)));
    }
}

fn merge_u16_counts(dst: &mut BTreeMap<u16, u64>, src: &BTreeMap<u16, u64>) {
    for (k, v) in src {
        *dst.entry(*k).or_insert(0) += *v;
    }
}

fn merge_u32_counts(dst: &mut BTreeMap<u32, u64>, src: &BTreeMap<u32, u64>) {
    for (k, v) in src {
        *dst.entry(*k).or_insert(0) += *v;
    }
}

fn merge_str_counts(dst: &mut BTreeMap<String, u64>, src: &BTreeMap<String, u64>) {
    for (k, v) in src {
        *dst.entry(k.clone()).or_insert(0) += *v;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_raw_jsonl(path: &std::path::Path, ts_ns: u64, cycle_seq: u32) {
        use crate::ml::persistence::sample_id::sample_id_of;
        use crate::types::Venue;

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("create raw parent");
        }
        let sample_id = sample_id_of(
            ts_ns,
            cycle_seq,
            "BTC-USDT",
            Venue::MexcFut,
            Venue::BingxFut,
        );
        let mut file = File::create(path).expect("create raw jsonl");
        writeln!(
            file,
            r#"{{"ts_ns":{},"cycle_seq":{},"schema_version":11,"scanner_version":"0.1.0","sample_id":"{}","runtime_config_hash":"0000000000000001","symbol_id":7,"symbol_name":"BTC-USDT","canonical_symbol":"BTC-USDT","route_id":"BTC-USDT|mexc:FUTURES->bingx:FUTURES","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":2.0,"exit_spread":-1.0,"buy_vol24":1000000.0,"sell_vol24":1000000.0,"sample_decision":"accept","sampling_tier":"priority","sampling_probability":1.0,"sampling_probability_kind":"conditional_priority","route_first_seen_ns":1,"route_last_seen_ns":{},"route_active_until_ns":null,"route_n_snapshots":{}}}"#,
            ts_ns, cycle_seq, sample_id, ts_ns, cycle_seq
        )
        .expect("write raw jsonl");
    }

    fn find_file_with_suffix(root: &std::path::Path, suffix: &str) -> PathBuf {
        let mut stack = vec![root.to_path_buf()];
        while let Some(dir) = stack.pop() {
            for entry in fs::read_dir(&dir).expect("read dir") {
                let path = entry.expect("dir entry").path();
                if path.is_dir() {
                    stack.push(path);
                } else if path
                    .file_name()
                    .and_then(|s| s.to_str())
                    .is_some_and(|name| name.ends_with(suffix))
                {
                    return path;
                }
            }
        }
        panic!(
            "file with suffix {suffix} not found under {}",
            root.display()
        );
    }

    #[test]
    fn audit_marks_mismatched_shutdown_unhealthy_without_touching_data() {
        let tmp = tempfile::tempdir().expect("tmp");
        let input = RunAuditInput {
            run_id: "scanner-1-test".to_string(),
            pid: 1,
            started_ns: 1,
            ended_ns: 1_000_000_001,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: None,
            storage_v2_primary: false,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 10,
            label_shutdown: LabelShutdownAudit {
                closed_total: 2,
                sent_total: 1,
                censored_total: 1,
                dropped_channel_closed_total: 0,
            },
            writers: vec![WriterAudit {
                dataset_kind: "labeled_trades".to_string(),
                total_written: 1,
                total_dropped: 0,
                compaction_succeeded: 0,
                compaction_failed: 0,
            }],
            preexisting_issues: Vec::new(),
            operational: OperationalAudit::default(),
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Red);
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("label shutdown mismatch")));
    }

    #[test]
    fn audit_counts_jsonl_and_flags_writer_mismatch_when_parquet_disabled() {
        let tmp = tempfile::tempdir().expect("tmp");
        let raw_root = tmp.path().join("raw_samples");
        fs::create_dir_all(&raw_root).expect("create raw root");
        let jsonl = raw_root.join("raw-scanner-4242_10_part-000000.jsonl");
        let mut file = File::create(&jsonl).expect("create jsonl");
        writeln!(file, r#"{{"ts_ns":10,"sample_id":"s1"}}"#).expect("write jsonl");
        drop(file);

        let input = RunAuditInput {
            run_id: "scanner-4242-test".to_string(),
            pid: 4242,
            started_ns: 1,
            ended_ns: 100,
            root_dir: tmp.path().join("ml"),
            raw_root,
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: None,
            storage_v2_primary: false,
            parquet_enabled: false,
            strict_lossless: true,
            cycles_started: 10,
            label_shutdown: LabelShutdownAudit {
                closed_total: 0,
                sent_total: 0,
                censored_total: 0,
                dropped_channel_closed_total: 0,
            },
            writers: vec![WriterAudit {
                dataset_kind: "raw_samples".to_string(),
                total_written: 2,
                total_dropped: 0,
                compaction_succeeded: 0,
                compaction_failed: 0,
            }],
            preexisting_issues: Vec::new(),
            operational: OperationalAudit::default(),
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Red);
        let raw = report.datasets.get("raw_samples").expect("raw summary");
        assert_eq!(raw.rows, 1);
        assert_eq!(raw.jsonl_rows, 1);
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("raw_samples row mismatch: disk_rows=1")));
    }

    #[test]
    fn audit_reads_storage_v2_primary_as_logical_dataset() {
        use crate::ml::persistence::parquet_compactor::{
            compact_jsonl_file, ParquetCompactionConfig, StorageV2CompactionConfig,
        };
        use crate::ml::persistence::sample_id::sample_id_of;
        use crate::types::Venue;

        let tmp = tempfile::tempdir().expect("tmp");
        let raw_root = tmp
            .path()
            .join("raw_samples/year=2026/month=05/day=16/hour=00");
        fs::create_dir_all(&raw_root).expect("create raw partition");
        let jsonl = raw_root.join("raw-scanner-4242_1_part-000000.jsonl");
        let sample_id = sample_id_of(1, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        let mut file = File::create(&jsonl).expect("create jsonl");
        writeln!(
            file,
            r#"{{"ts_ns":1,"cycle_seq":1,"schema_version":11,"scanner_version":"0.1.0","sample_id":"{}","runtime_config_hash":"0000000000000001","symbol_id":7,"symbol_name":"BTC-USDT","canonical_symbol":"BTC-USDT","route_id":"BTC-USDT|mexc:FUTURES->bingx:FUTURES","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":2.0,"exit_spread":-1.0,"buy_vol24":1000000.0,"sell_vol24":1000000.0,"sample_decision":"accept","sampling_tier":"priority","sampling_probability":1.0,"sampling_probability_kind":"conditional_priority","route_first_seen_ns":1,"route_last_seen_ns":1,"route_active_until_ns":null,"route_n_snapshots":1}}"#,
            sample_id
        )
        .expect("write jsonl");
        drop(file);

        let storage_v2_root = tmp.path().join("ml_v2");
        let cfg = ParquetCompactionConfig {
            storage_v2: StorageV2CompactionConfig {
                enabled: true,
                output_root: storage_v2_root.clone(),
                verify_equivalence: true,
                delete_v1_parquet_after_success: true,
                zstd_level: 3,
            },
            ..ParquetCompactionConfig::default()
        };
        compact_jsonl_file(&jsonl, DatasetKind::RawSamples, &cfg)
            .expect("compact")
            .expect("published");

        let input = RunAuditInput {
            run_id: "scanner-4242-v2".to_string(),
            pid: 4242,
            started_ns: 1,
            ended_ns: 2,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: Some(storage_v2_root),
            storage_v2_primary: true,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 1,
            label_shutdown: LabelShutdownAudit {
                closed_total: 0,
                sent_total: 0,
                censored_total: 0,
                dropped_channel_closed_total: 0,
            },
            writers: vec![WriterAudit {
                dataset_kind: "raw_samples".to_string(),
                total_written: 1,
                total_dropped: 0,
                compaction_succeeded: 1,
                compaction_failed: 0,
            }],
            preexisting_issues: Vec::new(),
            operational: OperationalAudit::default(),
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Green);
        assert!(report.storage_v2_primary);
        let raw = report.datasets.get("raw_samples").expect("raw summary");
        assert_eq!(raw.rows, 1);
        assert_eq!(raw.jsonl_rows, 0);
        assert_eq!(raw.duplicate_keys_exact, Some(0));
        assert_eq!(raw.schema_versions.get(&11), Some(&1));
        assert_eq!(raw.sample_decisions.get("accept"), Some(&1));
    }

    #[test]
    fn audit_storage_v2_primary_includes_v1_manifest_without_double_counting() {
        use crate::ml::persistence::parquet_compactor::{
            compact_jsonl_file, ParquetCompactionConfig, StorageV2CompactionConfig,
        };

        let tmp = tempfile::tempdir().expect("tmp");
        let raw_root = tmp
            .path()
            .join("raw_samples/year=2026/month=05/day=16/hour=00");
        let v2_jsonl = raw_root.join("raw-scanner-4242_1_part-000000.jsonl");
        let v1_jsonl = raw_root.join("raw-scanner-4242_2_part-000000.jsonl");
        write_raw_jsonl(&v2_jsonl, 1, 1);
        write_raw_jsonl(&v1_jsonl, 2, 2);

        let storage_v2_root = tmp.path().join("ml_v2");
        let v2_cfg = ParquetCompactionConfig {
            storage_v2: StorageV2CompactionConfig {
                enabled: true,
                output_root: storage_v2_root.clone(),
                verify_equivalence: true,
                delete_v1_parquet_after_success: true,
                zstd_level: 3,
            },
            ..ParquetCompactionConfig::default()
        };
        compact_jsonl_file(&v2_jsonl, DatasetKind::RawSamples, &v2_cfg)
            .expect("compact v2")
            .expect("v2 published");
        compact_jsonl_file(
            &v1_jsonl,
            DatasetKind::RawSamples,
            &ParquetCompactionConfig::default(),
        )
        .expect("compact v1")
        .expect("v1 published");

        let input = RunAuditInput {
            run_id: "scanner-4242-mixed".to_string(),
            pid: 4242,
            started_ns: 1,
            ended_ns: 3,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: Some(storage_v2_root),
            storage_v2_primary: true,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 2,
            label_shutdown: LabelShutdownAudit {
                closed_total: 0,
                sent_total: 0,
                censored_total: 0,
                dropped_channel_closed_total: 0,
            },
            writers: vec![WriterAudit {
                dataset_kind: "raw_samples".to_string(),
                total_written: 2,
                total_dropped: 0,
                compaction_succeeded: 2,
                compaction_failed: 0,
            }],
            preexisting_issues: Vec::new(),
            operational: OperationalAudit::default(),
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Green);
        let raw = report.datasets.get("raw_samples").expect("raw summary");
        assert_eq!(raw.rows, 2);
        assert_eq!(raw.jsonl_rows, 0);
        assert_eq!(raw.duplicate_keys_exact, Some(0));
        assert_eq!(raw.schema_versions.get(&11), Some(&2));
    }

    #[test]
    fn audit_storage_v2_primary_rejects_missing_sidecar_even_when_duplicate_check_skips() {
        use crate::ml::persistence::parquet_compactor::{
            compact_jsonl_file, ParquetCompactionConfig, StorageV2CompactionConfig,
        };

        let tmp = tempfile::tempdir().expect("tmp");
        let raw_root = tmp
            .path()
            .join("raw_samples/year=2026/month=05/day=16/hour=00");
        let jsonl = raw_root.join("raw-scanner-4242_3_part-000000.jsonl");
        write_raw_jsonl(&jsonl, 3, 3);

        let storage_v2_root = tmp.path().join("ml_v2");
        let cfg = ParquetCompactionConfig {
            storage_v2: StorageV2CompactionConfig {
                enabled: true,
                output_root: storage_v2_root.clone(),
                verify_equivalence: true,
                delete_v1_parquet_after_success: true,
                zstd_level: 3,
            },
            ..ParquetCompactionConfig::default()
        };
        compact_jsonl_file(&jsonl, DatasetKind::RawSamples, &cfg)
            .expect("compact")
            .expect("v2 published");
        let fact_sidecar = find_file_with_suffix(&storage_v2_root, ".fact.parquet");
        fs::remove_file(fact_sidecar).expect("remove fact sidecar");

        let input = RunAuditInput {
            run_id: "scanner-4242-v2-missing".to_string(),
            pid: 4242,
            started_ns: 1,
            ended_ns: 4,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: Some(storage_v2_root),
            storage_v2_primary: true,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 1,
            label_shutdown: LabelShutdownAudit {
                closed_total: 0,
                sent_total: 0,
                censored_total: 0,
                dropped_channel_closed_total: 0,
            },
            writers: vec![WriterAudit {
                dataset_kind: "raw_samples".to_string(),
                total_written: 1,
                total_dropped: 0,
                compaction_succeeded: 1,
                compaction_failed: 0,
            }],
            preexisting_issues: Vec::new(),
            operational: OperationalAudit::default(),
        };

        let err = write_run_audit(input).expect_err("missing V2 sidecar must fail audit");
        assert!(format!("{err:#}").contains("fact.parquet"));
    }

    #[test]
    fn audit_marks_operational_backpressure_unhealthy() {
        let tmp = tempfile::tempdir().expect("tmp");
        let input = RunAuditInput {
            run_id: "scanner-777-test".to_string(),
            pid: 777,
            started_ns: 1,
            ended_ns: 1_000_000_001,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: None,
            storage_v2_primary: false,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 10,
            label_shutdown: LabelShutdownAudit {
                closed_total: 0,
                sent_total: 0,
                censored_total: 0,
                dropped_channel_closed_total: 0,
            },
            writers: Vec::new(),
            preexisting_issues: Vec::new(),
            operational: OperationalAudit {
                ml_cycle_queue_full_total: 1,
                full_cycle_over_budget_total: 0,
                ml_background_over_budget_total: 0,
                ..OperationalAudit::default()
            },
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Red);
        assert_eq!(report.operational.ml_cycle_queue_full_total, 1);
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("ml_cycle_queue_full_total=1")));
    }

    #[test]
    fn audit_marks_operational_latency_and_drain_unhealthy() {
        let tmp = tempfile::tempdir().expect("tmp");
        let input = RunAuditInput {
            run_id: "scanner-778-test".to_string(),
            pid: 778,
            started_ns: 1,
            ended_ns: 1_000_000_001,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: None,
            storage_v2_primary: false,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 10,
            label_shutdown: LabelShutdownAudit {
                closed_total: 0,
                sent_total: 0,
                censored_total: 0,
                dropped_channel_closed_total: 0,
            },
            writers: Vec::new(),
            preexisting_issues: Vec::new(),
            operational: OperationalAudit {
                full_cycle_over_budget_total: 2,
                ml_background_over_budget_total: 3,
                ml_cycle_queue_depth_current: 1,
                ml_cycle_queue_events_current: 12,
                ml_cycle_batch_inflight_current: 1,
                ml_cycle_events_inflight_current: 7,
                full_cycle_budget_ns: 150_000_000,
                full_cycle_p99_ns: 180_000_000,
                full_cycle_max_ns: 220_000_000,
                ml_background_p99_ns: 170_000_000,
                ml_background_max_ns: 210_000_000,
                ..OperationalAudit::default()
            },
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Red);
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("full_cycle_over_budget_total=2")));
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("ml_background_over_budget_total=3")));
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("operational drain mismatch")));
    }

    #[test]
    fn audit_warns_latency_snapshot_over_budget_without_counter() {
        let tmp = tempfile::tempdir().expect("tmp");
        let input = RunAuditInput {
            run_id: "scanner-779-test".to_string(),
            pid: 779,
            started_ns: 1,
            ended_ns: 1_000_000_001,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: None,
            storage_v2_primary: false,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 10,
            label_shutdown: LabelShutdownAudit {
                closed_total: 0,
                sent_total: 0,
                censored_total: 0,
                dropped_channel_closed_total: 0,
            },
            writers: Vec::new(),
            preexisting_issues: Vec::new(),
            operational: OperationalAudit {
                full_cycle_budget_ns: 150_000_000,
                full_cycle_max_ns: 151_000_000,
                ml_background_max_ns: 152_000_000,
                ..OperationalAudit::default()
            },
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Green);
        assert!(report.issues.is_empty());
        assert!(report
            .warnings
            .iter()
            .any(|i| i.contains("full_cycle_max_ns=151000000 exceeds")));
        assert!(report
            .warnings
            .iter()
            .any(|i| i.contains("ml_background_max_ns=152000000 exceeds")));
    }

    #[test]
    fn audit_warns_rare_operational_tail_events_when_p99_is_healthy_and_drained() {
        let tmp = tempfile::tempdir().expect("tmp");
        let input = RunAuditInput {
            run_id: "scanner-780-test".to_string(),
            pid: 780,
            started_ns: 1,
            ended_ns: 86_400_000_000_001,
            root_dir: tmp.path().join("ml"),
            raw_root: tmp.path().join("raw_samples"),
            accepted_root: tmp.path().join("accepted_samples"),
            labeled_root: tmp.path().join("labeled_trades"),
            storage_v2_root: None,
            storage_v2_primary: false,
            parquet_enabled: true,
            strict_lossless: true,
            cycles_started: 576_018,
            label_shutdown: LabelShutdownAudit {
                closed_total: 890_059,
                sent_total: 890_059,
                censored_total: 874_673,
                dropped_channel_closed_total: 0,
            },
            writers: Vec::new(),
            preexisting_issues: Vec::new(),
            operational: OperationalAudit {
                ml_cycle_queue_full_total: 110,
                full_cycle_over_budget_total: 15,
                ml_background_over_budget_total: 1_140,
                full_cycle_budget_ns: 150_000_000,
                full_cycle_p99_ns: 2_486_271,
                full_cycle_max_ns: 4_519_321_400,
                ml_background_p99_ns: 30_359_551,
                ml_background_max_ns: 4_967_811_200,
                ml_cycle_queue_wait_ops_total: 110,
                ml_cycle_queue_wait_ns_total: 13_620_771_300,
                ..OperationalAudit::default()
            },
        };

        let report = write_run_audit(input).expect("audit report");

        assert_eq!(report.verdict, RunAuditVerdict::Green);
        assert!(report.issues.is_empty());
        assert_eq!(report.warnings.len(), 3);
        assert!(report
            .warnings
            .iter()
            .any(|i| i.contains("ml_cycle_queue_full_total=110")));
        assert!(report
            .warnings
            .iter()
            .any(|i| i.contains("full_cycle_over_budget_total=15")));
        assert!(report
            .warnings
            .iter()
            .any(|i| i.contains("ml_background_over_budget_total=1140")));
    }
}
