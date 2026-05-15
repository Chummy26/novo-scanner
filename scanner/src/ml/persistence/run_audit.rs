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
use serde::{Deserialize, Serialize};

use crate::ml::persistence::parquet_compactor::ParquetManifest;

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
    pub strict_lossless: bool,
    pub parquet_enabled: bool,
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
struct JsonlRunFile {
    rows: u64,
    bytes: u64,
    min_timestamp_ns: Option<u64>,
    max_timestamp_ns: Option<u64>,
}

const MAX_EXACT_DUPLICATE_ROWS: u64 = 20_000_000;

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
        issues.push(format!(
            "operational backpressure: ml_cycle_queue_full_total={}",
            input.operational.ml_cycle_queue_full_total
        ));
    }
    if input.operational.full_cycle_over_budget_total != 0 {
        issues.push(format!(
            "operational latency: full_cycle_over_budget_total={} budget_ns={} full_cycle_p99_ns={} full_cycle_max_ns={}",
            input.operational.full_cycle_over_budget_total,
            input.operational.full_cycle_budget_ns,
            input.operational.full_cycle_p99_ns,
            input.operational.full_cycle_max_ns
        ));
    } else if input.operational.full_cycle_budget_ns > 0
        && input.operational.full_cycle_max_ns > input.operational.full_cycle_budget_ns
    {
        issues.push(format!(
            "operational latency: full_cycle_max_ns={} exceeds budget_ns={} with over_budget counter at 0",
            input.operational.full_cycle_max_ns, input.operational.full_cycle_budget_ns
        ));
    }
    if input.operational.ml_background_over_budget_total != 0 {
        issues.push(format!(
            "operational latency: ml_background_over_budget_total={} budget_ns={} ml_background_p99_ns={} ml_background_max_ns={}",
            input.operational.ml_background_over_budget_total,
            input.operational.full_cycle_budget_ns,
            input.operational.ml_background_p99_ns,
            input.operational.ml_background_max_ns
        ));
    } else if input.operational.full_cycle_budget_ns > 0
        && input.operational.ml_background_max_ns > input.operational.full_cycle_budget_ns
    {
        issues.push(format!(
            "operational latency: ml_background_max_ns={} exceeds budget_ns={} with over_budget counter at 0",
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
        let mut summary = summarize_manifests(&manifests, duration_s, input.cycles_started)?;
        let manifested_sources = manifest_source_jsonl_file_names(&manifests);
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
            match exact_duplicate_count(dataset, &manifests) {
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
        strict_lossless: input.strict_lossless,
        parquet_enabled: input.parquet_enabled,
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

fn manifest_source_jsonl_file_names(manifests: &[ManifestWithPath]) -> BTreeSet<String> {
    manifests
        .iter()
        .filter_map(|item| {
            item.manifest
                .source_jsonl_path
                .replace('\\', "/")
                .rsplit('/')
                .next()
                .map(ToString::to_string)
        })
        .collect()
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

fn exact_duplicate_count(dataset: &str, manifests: &[ManifestWithPath]) -> Result<u64> {
    let mut seen = HashSet::<String>::new();
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
            duplicates = duplicates.saturating_add(duplicate_count_in_batch(
                dataset, &batch, &mut seen, &item.path,
            )?);
        }
    }
    Ok(duplicates)
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
    fn audit_marks_latency_snapshot_over_budget_unhealthy_even_without_counter() {
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

        assert_eq!(report.verdict, RunAuditVerdict::Red);
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("full_cycle_max_ns=151000000 exceeds")));
        assert!(report
            .issues
            .iter()
            .any(|i| i.contains("ml_background_max_ns=152000000 exceeds")));
    }
}
