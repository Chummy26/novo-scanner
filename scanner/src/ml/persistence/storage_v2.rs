//! Auditoria shadow para `ml_storage_v2`.
//!
//! O V2 não altera frequência, labels, horizontes ou floors. Ele lê Parquets
//! V1 fechados, materializa `fact + route_dim + manifest`, e reconstrói o
//! contrato lógico virtualizado (`sample_id`, `route_id` e dimensão estática
//! de rota). Em modo primário, o compactor só remove o Parquet V1 pesado
//! depois que a equivalência `V1 == V2 reconstruído` fica Green.

use std::collections::BTreeMap;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    Array, ArrayRef, RecordBatch, StringArray, UInt16Array, UInt32Array, UInt64Array,
};
use arrow_schema::{DataType, Field, Schema, SchemaRef};
use parquet::arrow::{
    arrow_reader::{ParquetRecordBatchReader, ParquetRecordBatchReaderBuilder},
    ArrowWriter,
};
use parquet::basic::{Compression, ZstdLevel};
use parquet::file::properties::WriterProperties;
use parquet::file::reader::{FileReader, SerializedFileReader};
use serde::{Deserialize, Serialize};

use crate::ml::contract::RouteId;
use crate::ml::persistence::parquet_compactor::{
    DatasetKind, DatasetSemanticStats, ParquetManifest,
};
use crate::ml::persistence::sample_id::{route_id_key, sample_id_of};
use crate::ml::persistence::{
    ACCEPTED_SAMPLE_SCHEMA_VERSION, LABELED_TRADE_SCHEMA_VERSION, RAW_SAMPLE_SCHEMA_VERSION,
};
use crate::types::{SymbolId, Venue};

pub const ML_STORAGE_V2_SHADOW_VERSION: u16 = 1;
pub const SAMPLE_ID_ALGORITHM_VERSION: &str = "fnv1a128_sample_id_v1";
pub const ROUTE_DIM_KEY_POLICY: &str = "snapshot_local_route_key_v1";

const NS_PER_SECOND: u64 = 1_000_000_000;
const ROUTE_KEY_FACT_BYTES_PER_ROW: u64 = 4;
const ROUTE_DIM_ESTIMATED_BYTES_PER_ROW: u64 = 160;

const ROUTE_IDENTITY_COLUMNS: &[&str] = &[
    "route_id",
    "symbol_id",
    "symbol_name",
    "canonical_symbol",
    "buy_venue",
    "sell_venue",
    "buy_market",
    "sell_market",
];

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageV2BatchAudit {
    pub rows: u64,
    pub route_dim_rows: u64,
    pub route_dim_conflicts: u64,
    pub schema_version_mismatches: u64,
    pub sample_id_mismatches: u64,
    pub route_id_mismatches: u64,
    pub label_window_mismatches: u64,
    pub required_nulls: u64,
    pub logical_required_digest_kind: String,
    pub logical_required_digest_hex: String,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageV2DatasetAudit {
    pub dataset_kind: String,
    pub files: u64,
    pub rows: u64,
    pub physical_bytes: u64,
    pub sample_id_physical_bytes: u64,
    pub route_identity_physical_bytes: u64,
    pub estimated_reclaimable_bytes_conservative: u64,
    pub estimated_reclaimable_bytes_with_route_dim: u64,
    pub route_dim_rows: u64,
    pub route_dim_conflicts: u64,
    pub schema_version_mismatches: u64,
    pub sample_id_mismatches: u64,
    pub route_id_mismatches: u64,
    pub label_window_mismatches: u64,
    pub required_nulls: u64,
    pub logical_required_digest_kind: String,
    pub logical_required_digest_hex: String,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageV2ShadowReport {
    pub shadow_version: u16,
    pub status: StorageV2ShadowStatus,
    pub sample_id_algorithm_version: String,
    pub route_dim_key_policy: String,
    pub root: String,
    pub datasets: BTreeMap<String, StorageV2DatasetAudit>,
    pub total_physical_bytes: u64,
    pub total_estimated_reclaimable_bytes_conservative: u64,
    pub total_estimated_reclaimable_bytes_with_route_dim: u64,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StorageV2ShadowStatus {
    Green,
    Red,
}

#[derive(Debug, Clone)]
pub struct StorageV2MaterializeConfig {
    pub zstd_level: i32,
    pub overwrite_existing: bool,
}

impl Default for StorageV2MaterializeConfig {
    fn default() -> Self {
        Self {
            zstd_level: 3,
            overwrite_existing: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageV2SidecarManifest {
    pub manifest_version: u16,
    pub dataset_kind: String,
    pub source_parquet_path: String,
    #[serde(default)]
    pub source_manifest_path: String,
    #[serde(default)]
    pub source_jsonl_path: String,
    pub fact_parquet_path: String,
    pub route_dim_parquet_path: String,
    #[serde(default)]
    pub logical_schema_fields: Vec<String>,
    #[serde(default)]
    pub logical_field_nullable: BTreeMap<String, bool>,
    #[serde(default)]
    pub schema_version: u16,
    pub source_row_count: u64,
    pub fact_row_count: u64,
    pub route_dim_row_count: u64,
    pub source_file_bytes: u64,
    pub fact_file_bytes: u64,
    pub route_dim_file_bytes: u64,
    #[serde(default)]
    pub min_timestamp_ns: Option<u64>,
    #[serde(default)]
    pub max_timestamp_ns: Option<u64>,
    #[serde(default)]
    pub semantic_stats: DatasetSemanticStats,
    pub logical_required_digest_kind: String,
    pub logical_required_digest_hex: String,
    pub sample_id_algorithm_version: String,
    pub route_dim_key_policy: String,
    pub virtualized_columns: Vec<String>,
    pub parquet_zstd_level: i32,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageV2MaterializationDatasetSummary {
    pub dataset_kind: String,
    pub files: u64,
    pub source_rows: u64,
    pub route_dim_rows: u64,
    pub source_bytes: u64,
    pub fact_bytes: u64,
    pub route_dim_bytes: u64,
    pub manifest_bytes: u64,
    pub v2_total_bytes: u64,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageV2MaterializationReport {
    pub status: StorageV2ShadowStatus,
    pub source_root: String,
    pub output_root: String,
    pub datasets: BTreeMap<String, StorageV2MaterializationDatasetSummary>,
    pub source_bytes: u64,
    pub v2_total_bytes: u64,
    pub reduction_bytes: u64,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageV2EquivalenceReport {
    pub status: StorageV2ShadowStatus,
    pub source_parquet_path: String,
    pub fact_parquet_path: String,
    pub route_dim_parquet_path: String,
    pub source_rows: u64,
    pub reconstructed_rows: u64,
    pub source_batches: u64,
    pub reconstructed_batches: u64,
    pub mismatched_batches: u64,
    pub issues: Vec<String>,
}

pub struct StorageV2SidecarLogicalReader {
    dataset_kind: DatasetKind,
    logical_schema_fields: Vec<String>,
    logical_field_nullable: BTreeMap<String, bool>,
    route_dim: BTreeMap<u32, RouteDimEntry>,
    fact_reader: ParquetRecordBatchReader,
    expected_rows: u64,
    rows_read: u64,
    finished: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct RouteDimEntry {
    route_id: String,
    symbol_name: String,
    canonical_symbol: String,
    symbol_id: u32,
    buy_venue: String,
    sell_venue: String,
    buy_market: String,
    sell_market: String,
}

#[derive(Debug, Clone)]
struct BatchColumns<'a> {
    sample_id: &'a StringArray,
    symbol_id: &'a UInt32Array,
    symbol_name: &'a StringArray,
    canonical_symbol: &'a StringArray,
    route_id: &'a StringArray,
    buy_venue: &'a StringArray,
    sell_venue: &'a StringArray,
    buy_market: &'a StringArray,
    sell_market: &'a StringArray,
    timestamp: &'a UInt64Array,
    cycle_seq: &'a UInt32Array,
    schema_version: &'a UInt16Array,
    horizon_s: Option<&'a UInt32Array>,
    label_window_closed_at_ns: Option<&'a UInt64Array>,
}

pub fn analyze_record_batch_for_storage_v2(
    dataset_kind: DatasetKind,
    batch: &RecordBatch,
) -> Result<StorageV2BatchAudit> {
    let mut routes = BTreeMap::new();
    analyze_record_batch_inner(dataset_kind, batch, &mut routes)
}

pub fn analyze_parquet_file_for_storage_v2(
    path: &Path,
    dataset_kind: DatasetKind,
) -> Result<StorageV2DatasetAudit> {
    let mut audit = StorageV2DatasetAudit {
        dataset_kind: dataset_kind.as_str().to_string(),
        files: 1,
        physical_bytes: fs::metadata(path)
            .with_context(|| format!("metadata {}", path.display()))?
            .len(),
        logical_required_digest_kind: logical_digest_kind(),
        ..StorageV2DatasetAudit::default()
    };

    let column_bytes = parquet_column_bytes(path)
        .with_context(|| format!("read parquet column metadata {}", path.display()))?;
    audit.sample_id_physical_bytes = *column_bytes.get("sample_id").unwrap_or(&0);
    audit.route_identity_physical_bytes = ROUTE_IDENTITY_COLUMNS
        .iter()
        .filter(|name| **name != "sample_id")
        .map(|name| column_bytes.get(*name).copied().unwrap_or(0))
        .sum();

    let file = File::open(path).with_context(|| format!("open parquet {}", path.display()))?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(file)
        .with_context(|| format!("build parquet reader {}", path.display()))?;
    let mut reader = builder
        .build()
        .with_context(|| format!("read parquet {}", path.display()))?;

    let mut route_dim = BTreeMap::new();
    let mut digest = LogicalDigest::new(dataset_kind);
    for maybe_batch in &mut reader {
        let batch = maybe_batch.with_context(|| format!("read batch {}", path.display()))?;
        let batch_audit = analyze_record_batch_inner_with_digest(
            dataset_kind,
            &batch,
            &mut route_dim,
            &mut digest,
        )
        .with_context(|| format!("audit batch {}", path.display()))?;
        merge_batch_into_dataset(&mut audit, &batch_audit);
    }

    audit.route_dim_rows = route_dim.len() as u64;
    audit.logical_required_digest_hex = digest.hex();
    finalize_dataset_audit(&mut audit);
    Ok(audit)
}

pub fn build_storage_v2_shadow_report(root: &Path) -> Result<StorageV2ShadowReport> {
    build_storage_v2_shadow_report_with_limit(root, None)
}

pub fn build_storage_v2_shadow_report_with_limit(
    root: &Path,
    max_files_per_dataset: Option<usize>,
) -> Result<StorageV2ShadowReport> {
    let datasets = [
        (DatasetKind::RawSamples, "raw_samples"),
        (DatasetKind::AcceptedSamples, "accepted_samples"),
        (DatasetKind::LabeledTrades, "labeled_trades"),
    ];

    let mut out = BTreeMap::new();
    let mut issues = Vec::new();
    for (kind, name) in datasets {
        let mut paths = collect_parquet_files(&root.join(name))?;
        let mut dataset = StorageV2DatasetAudit {
            dataset_kind: kind.as_str().to_string(),
            logical_required_digest_kind: logical_digest_kind(),
            ..StorageV2DatasetAudit::default()
        };
        let mut digest = LogicalDigest::new(kind);
        let mut route_dim = BTreeMap::new();
        if let Some(max_files) = max_files_per_dataset {
            paths.truncate(max_files);
        }
        for path in paths {
            let file_audit =
                analyze_single_file_into_dataset(&path, kind, &mut route_dim, &mut digest)
                    .with_context(|| format!("storage_v2 shadow {}", path.display()))?;
            merge_dataset_into_dataset(&mut dataset, &file_audit);
        }
        dataset.route_dim_rows = route_dim.len() as u64;
        dataset.logical_required_digest_hex = digest.hex();
        finalize_dataset_audit(&mut dataset);
        issues.extend(
            dataset
                .issues
                .iter()
                .map(|issue| format!("{name}: {issue}")),
        );
        out.insert(name.to_string(), dataset);
    }

    let total_physical_bytes = out.values().map(|d| d.physical_bytes).sum();
    let total_estimated_reclaimable_bytes_conservative = out
        .values()
        .map(|d| d.estimated_reclaimable_bytes_conservative)
        .sum();
    let total_estimated_reclaimable_bytes_with_route_dim = out
        .values()
        .map(|d| d.estimated_reclaimable_bytes_with_route_dim)
        .sum();
    let status = if issues.is_empty() {
        StorageV2ShadowStatus::Green
    } else {
        StorageV2ShadowStatus::Red
    };

    Ok(StorageV2ShadowReport {
        shadow_version: ML_STORAGE_V2_SHADOW_VERSION,
        status,
        sample_id_algorithm_version: SAMPLE_ID_ALGORITHM_VERSION.to_string(),
        route_dim_key_policy: ROUTE_DIM_KEY_POLICY.to_string(),
        root: root.display().to_string(),
        datasets: out,
        total_physical_bytes,
        total_estimated_reclaimable_bytes_conservative,
        total_estimated_reclaimable_bytes_with_route_dim,
        issues,
    })
}

pub fn materialize_storage_v2_sidecars(
    source_root: &Path,
    output_root: &Path,
    max_files_per_dataset: Option<usize>,
    cfg: &StorageV2MaterializeConfig,
) -> Result<StorageV2MaterializationReport> {
    let datasets = [
        (DatasetKind::RawSamples, "raw_samples"),
        (DatasetKind::AcceptedSamples, "accepted_samples"),
        (DatasetKind::LabeledTrades, "labeled_trades"),
    ];
    let mut summaries = BTreeMap::new();
    let mut issues = Vec::new();

    for (kind, name) in datasets {
        let mut paths = collect_parquet_files(&source_root.join(name))?;
        if let Some(max_files) = max_files_per_dataset {
            paths.truncate(max_files);
        }
        let dataset_out = output_root.join(name);
        let mut summary = StorageV2MaterializationDatasetSummary {
            dataset_kind: kind.as_str().to_string(),
            ..StorageV2MaterializationDatasetSummary::default()
        };

        for source_path in paths {
            match materialize_parquet_file_to_storage_v2_sidecar(
                &source_path,
                kind,
                &dataset_out,
                cfg,
            ) {
                Ok(manifest) => {
                    summary.files = summary.files.saturating_add(1);
                    summary.source_rows = summary
                        .source_rows
                        .saturating_add(manifest.source_row_count);
                    summary.route_dim_rows = summary
                        .route_dim_rows
                        .saturating_add(manifest.route_dim_row_count);
                    summary.source_bytes = summary
                        .source_bytes
                        .saturating_add(manifest.source_file_bytes);
                    summary.fact_bytes =
                        summary.fact_bytes.saturating_add(manifest.fact_file_bytes);
                    summary.route_dim_bytes = summary
                        .route_dim_bytes
                        .saturating_add(manifest.route_dim_file_bytes);
                    let manifest_bytes =
                        fs::metadata(sidecar_manifest_path_for_source(&source_path, &dataset_out))
                            .map(|m| m.len())
                            .unwrap_or(0);
                    summary.manifest_bytes = summary.manifest_bytes.saturating_add(manifest_bytes);
                }
                Err(e) => {
                    let issue = format!("{}: {}: {e}", name, source_path.display());
                    summary.issues.push(issue.clone());
                    issues.push(issue);
                }
            }
        }
        summary.v2_total_bytes = summary
            .fact_bytes
            .saturating_add(summary.route_dim_bytes)
            .saturating_add(summary.manifest_bytes);
        summaries.insert(name.to_string(), summary);
    }

    let source_bytes: u64 = summaries.values().map(|d| d.source_bytes).sum();
    let v2_total_bytes: u64 = summaries.values().map(|d| d.v2_total_bytes).sum();
    let reduction_bytes = source_bytes.saturating_sub(v2_total_bytes);
    let status = if issues.is_empty() {
        StorageV2ShadowStatus::Green
    } else {
        StorageV2ShadowStatus::Red
    };
    Ok(StorageV2MaterializationReport {
        status,
        source_root: source_root.display().to_string(),
        output_root: output_root.display().to_string(),
        datasets: summaries,
        source_bytes,
        v2_total_bytes,
        reduction_bytes,
        issues,
    })
}

pub fn materialize_parquet_file_to_storage_v2_sidecar(
    source_path: &Path,
    dataset_kind: DatasetKind,
    out_dir: &Path,
    cfg: &StorageV2MaterializeConfig,
) -> Result<StorageV2SidecarManifest> {
    let source_audit = analyze_parquet_file_for_storage_v2(source_path, dataset_kind)
        .with_context(|| {
            format!(
                "validate source before v2 materialization {}",
                source_path.display()
            )
        })?;
    if !source_audit.issues.is_empty() {
        anyhow::bail!("{}", source_audit.issues.join("; "));
    }

    fs::create_dir_all(out_dir).with_context(|| format!("create {}", out_dir.display()))?;
    let fact_path = sidecar_fact_path_for_source(source_path, out_dir);
    let route_dim_path = sidecar_route_dim_path_for_source(source_path, out_dir);
    let manifest_path = sidecar_manifest_path_for_source(source_path, out_dir);
    let temp_fact_path = fact_path.with_extension("fact.parquet.tmp");
    let temp_route_dim_path = route_dim_path.with_extension("route_dim.parquet.tmp");
    let temp_manifest_path = manifest_path.with_extension("manifest.json.tmp");
    let source_manifest_path = source_path.with_extension("parquet.manifest.json");
    let source_manifest = read_source_parquet_manifest_if_present(&source_manifest_path)?;

    prepare_output_path(&fact_path, cfg.overwrite_existing)?;
    prepare_output_path(&route_dim_path, cfg.overwrite_existing)?;
    prepare_output_path(&manifest_path, cfg.overwrite_existing)?;
    remove_file_if_exists(&temp_fact_path)?;
    remove_file_if_exists(&temp_route_dim_path)?;
    remove_file_if_exists(&temp_manifest_path)?;

    let input = File::open(source_path)
        .with_context(|| format!("open source {}", source_path.display()))?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(input)
        .with_context(|| format!("build source reader {}", source_path.display()))?;
    let logical_schema_fields: Vec<String> = builder
        .schema()
        .fields()
        .iter()
        .map(|field| field.name().to_string())
        .collect();
    let logical_field_nullable: BTreeMap<String, bool> = builder
        .schema()
        .fields()
        .iter()
        .map(|field| (field.name().to_string(), field.is_nullable()))
        .collect();
    let mut reader = builder
        .build()
        .with_context(|| format!("read source {}", source_path.display()))?;

    let fact_file = File::create(&temp_fact_path)
        .with_context(|| format!("create {}", temp_fact_path.display()))?;
    let mut fact_file = Some(fact_file);
    let mut fact_writer: Option<ArrowWriter<File>> = None;
    let mut route_id_to_key = BTreeMap::<String, u32>::new();
    let mut route_dim = BTreeMap::<u32, RouteDimEntry>::new();
    let mut fact_row_count = 0u64;

    for maybe_batch in &mut reader {
        let batch = maybe_batch.with_context(|| format!("read batch {}", source_path.display()))?;
        let fact_batch =
            build_fact_batch(dataset_kind, &batch, &mut route_id_to_key, &mut route_dim)?;
        if fact_writer.is_none() {
            let file = fact_file
                .take()
                .context("fact file handle already consumed before writer init")?;
            fact_writer = Some(
                ArrowWriter::try_new(
                    file,
                    fact_batch.schema(),
                    Some(sidecar_writer_properties(cfg)?),
                )
                .with_context(|| format!("create fact writer {}", temp_fact_path.display()))?,
            );
        }
        if let Some(writer) = fact_writer.as_mut() {
            writer
                .write(&fact_batch)
                .with_context(|| format!("write fact {}", temp_fact_path.display()))?;
        }
        fact_row_count = fact_row_count.saturating_add(fact_batch.num_rows() as u64);
    }

    let Some(writer) = fact_writer else {
        anyhow::bail!(
            "source parquet has no record batches: {}",
            source_path.display()
        );
    };
    writer
        .close()
        .with_context(|| format!("close fact {}", temp_fact_path.display()))?;

    let route_dim_batch = build_route_dim_batch(&route_dim)?;
    let route_dim_file = File::create(&temp_route_dim_path)
        .with_context(|| format!("create {}", temp_route_dim_path.display()))?;
    let mut route_dim_writer = ArrowWriter::try_new(
        route_dim_file,
        route_dim_batch.schema(),
        Some(sidecar_writer_properties(cfg)?),
    )
    .with_context(|| format!("create route_dim writer {}", temp_route_dim_path.display()))?;
    route_dim_writer
        .write(&route_dim_batch)
        .with_context(|| format!("write route_dim {}", temp_route_dim_path.display()))?;
    route_dim_writer
        .close()
        .with_context(|| format!("close route_dim {}", temp_route_dim_path.display()))?;

    let source_file_bytes = fs::metadata(source_path)?.len();
    let fact_file_bytes = fs::metadata(&temp_fact_path)?.len();
    let route_dim_file_bytes = fs::metadata(&temp_route_dim_path)?.len();
    let manifest = StorageV2SidecarManifest {
        manifest_version: 1,
        dataset_kind: dataset_kind.as_str().to_string(),
        source_parquet_path: source_path.display().to_string(),
        source_manifest_path: source_manifest
            .as_ref()
            .map(|_| source_manifest_path.display().to_string())
            .unwrap_or_default(),
        source_jsonl_path: source_manifest
            .as_ref()
            .map(|manifest| manifest.source_jsonl_path.clone())
            .unwrap_or_default(),
        fact_parquet_path: fact_path.display().to_string(),
        route_dim_parquet_path: route_dim_path.display().to_string(),
        logical_schema_fields,
        logical_field_nullable,
        schema_version: source_manifest
            .as_ref()
            .map(|manifest| manifest.schema_version)
            .unwrap_or_else(|| dataset_kind.expected_schema_version()),
        source_row_count: source_audit.rows,
        fact_row_count,
        route_dim_row_count: route_dim.len() as u64,
        source_file_bytes,
        fact_file_bytes,
        route_dim_file_bytes,
        min_timestamp_ns: source_manifest
            .as_ref()
            .and_then(|manifest| manifest.min_timestamp_ns),
        max_timestamp_ns: source_manifest
            .as_ref()
            .and_then(|manifest| manifest.max_timestamp_ns),
        semantic_stats: source_manifest
            .as_ref()
            .map(|manifest| manifest.semantic_stats.clone())
            .unwrap_or_default(),
        logical_required_digest_kind: source_audit.logical_required_digest_kind,
        logical_required_digest_hex: source_audit.logical_required_digest_hex,
        sample_id_algorithm_version: SAMPLE_ID_ALGORITHM_VERSION.to_string(),
        route_dim_key_policy: ROUTE_DIM_KEY_POLICY.to_string(),
        virtualized_columns: virtualized_columns()
            .iter()
            .map(|s| s.to_string())
            .collect(),
        parquet_zstd_level: cfg.zstd_level,
    };
    write_sidecar_manifest_temp(&manifest, &temp_manifest_path)?;

    publish_sidecar_files(
        &temp_fact_path,
        &fact_path,
        &temp_route_dim_path,
        &route_dim_path,
        &temp_manifest_path,
        &manifest_path,
    )?;

    Ok(StorageV2SidecarManifest {
        fact_parquet_path: fact_path.display().to_string(),
        route_dim_parquet_path: route_dim_path.display().to_string(),
        ..manifest
    })
}

pub fn remove_storage_v2_sidecar_files(manifest: &StorageV2SidecarManifest) -> Result<()> {
    remove_file_if_exists(Path::new(&manifest.fact_parquet_path))
        .with_context(|| format!("remove {}", manifest.fact_parquet_path))?;
    remove_file_if_exists(Path::new(&manifest.route_dim_parquet_path))
        .with_context(|| format!("remove {}", manifest.route_dim_parquet_path))?;
    let manifest_path = sidecar_manifest_path_for_source(
        Path::new(&manifest.source_parquet_path),
        Path::new(&manifest.fact_parquet_path)
            .parent()
            .unwrap_or_else(|| Path::new(".")),
    );
    remove_file_if_exists(&manifest_path)
        .with_context(|| format!("remove {}", manifest_path.display()))?;
    Ok(())
}

pub fn read_storage_v2_sidecar_as_logical_batches(
    manifest: &StorageV2SidecarManifest,
    dataset_kind: DatasetKind,
) -> Result<Vec<RecordBatch>> {
    open_storage_v2_sidecar_logical_reader(manifest, dataset_kind)?.collect()
}

pub fn open_storage_v2_sidecar_logical_reader(
    manifest: &StorageV2SidecarManifest,
    dataset_kind: DatasetKind,
) -> Result<StorageV2SidecarLogicalReader> {
    if manifest.dataset_kind != dataset_kind.as_str() {
        anyhow::bail!(
            "manifest dataset_kind={} does not match requested {}",
            manifest.dataset_kind,
            dataset_kind.as_str()
        );
    }
    if manifest.logical_schema_fields.is_empty() {
        anyhow::bail!(
            "storage_v2 manifest missing logical_schema_fields: {}",
            manifest.source_parquet_path
        );
    }

    let route_dim = read_route_dim_parquet(Path::new(&manifest.route_dim_parquet_path))?;
    if route_dim.len() as u64 != manifest.route_dim_row_count {
        anyhow::bail!(
            "route_dim row count mismatch: manifest={} actual={}",
            manifest.route_dim_row_count,
            route_dim.len()
        );
    }

    let fact_file = File::open(&manifest.fact_parquet_path)
        .with_context(|| format!("open fact {}", manifest.fact_parquet_path))?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(fact_file)
        .with_context(|| format!("build fact reader {}", manifest.fact_parquet_path))?;
    let fact_reader = builder
        .build()
        .with_context(|| format!("read fact {}", manifest.fact_parquet_path))?;

    Ok(StorageV2SidecarLogicalReader {
        dataset_kind,
        logical_schema_fields: manifest.logical_schema_fields.clone(),
        logical_field_nullable: manifest.logical_field_nullable.clone(),
        route_dim,
        fact_reader,
        expected_rows: manifest.fact_row_count,
        rows_read: 0,
        finished: false,
    })
}

impl Iterator for StorageV2SidecarLogicalReader {
    type Item = Result<RecordBatch>;

    fn next(&mut self) -> Option<Self::Item> {
        match self.fact_reader.next() {
            Some(Ok(fact_batch)) => {
                let logical = reconstruct_logical_batch_from_v2_fact(
                    self.dataset_kind,
                    &fact_batch,
                    &self.route_dim,
                    &self.logical_schema_fields,
                    &self.logical_field_nullable,
                );
                if let Ok(batch) = &logical {
                    self.rows_read = self.rows_read.saturating_add(batch.num_rows() as u64);
                }
                Some(logical)
            }
            Some(Err(e)) => Some(Err(e).context("read storage_v2 fact batch")),
            None if !self.finished => {
                self.finished = true;
                if self.rows_read != self.expected_rows {
                    Some(Err(anyhow::anyhow!(
                        "fact row count mismatch: manifest={} actual={}",
                        self.expected_rows,
                        self.rows_read
                    )))
                } else {
                    None
                }
            }
            None => None,
        }
    }
}

pub fn verify_storage_v2_sidecar_equivalence(
    source_path: &Path,
    manifest: &StorageV2SidecarManifest,
    dataset_kind: DatasetKind,
) -> Result<StorageV2EquivalenceReport> {
    let mut reconstructed_reader = open_storage_v2_sidecar_logical_reader(manifest, dataset_kind)?;
    let source_file = File::open(source_path)
        .with_context(|| format!("open source for equivalence {}", source_path.display()))?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(source_file)
        .with_context(|| format!("build source equivalence reader {}", source_path.display()))?;
    let mut source_reader = builder
        .build()
        .with_context(|| format!("read source equivalence {}", source_path.display()))?;

    let mut source_rows = 0u64;
    let mut reconstructed_rows = 0u64;
    let mut source_batches = 0u64;
    let mut reconstructed_batches = 0u64;
    let mut mismatched_batches = 0u64;
    let mut issues = Vec::new();

    for (idx, maybe_source_batch) in (&mut source_reader).enumerate() {
        let source_batch = maybe_source_batch
            .with_context(|| format!("read source equivalence batch {}", source_path.display()))?;
        source_batches = source_batches.saturating_add(1);
        source_rows = source_rows.saturating_add(source_batch.num_rows() as u64);
        match reconstructed_reader.next() {
            Some(Ok(reconstructed_batch)) if reconstructed_batch == source_batch => {
                reconstructed_batches = reconstructed_batches.saturating_add(1);
                reconstructed_rows =
                    reconstructed_rows.saturating_add(reconstructed_batch.num_rows() as u64);
            }
            Some(Ok(reconstructed_batch)) => {
                reconstructed_batches = reconstructed_batches.saturating_add(1);
                reconstructed_rows =
                    reconstructed_rows.saturating_add(reconstructed_batch.num_rows() as u64);
                mismatched_batches = mismatched_batches.saturating_add(1);
                issues.push(format!(
                    "batch {idx} mismatch: source_rows={} reconstructed_rows={}",
                    source_batch.num_rows(),
                    reconstructed_batch.num_rows()
                ));
            }
            Some(Err(e)) => {
                mismatched_batches = mismatched_batches.saturating_add(1);
                issues.push(format!("reconstructed batch {idx} error: {e}"));
            }
            None => {
                mismatched_batches = mismatched_batches.saturating_add(1);
                issues.push(format!("missing reconstructed batch {idx}"));
            }
        }
    }
    loop {
        match reconstructed_reader.next() {
            Some(Ok(batch)) => {
                reconstructed_batches = reconstructed_batches.saturating_add(1);
                reconstructed_rows = reconstructed_rows.saturating_add(batch.num_rows() as u64);
                mismatched_batches = mismatched_batches.saturating_add(1);
                issues.push(format!(
                    "extra reconstructed batch {} rows={}",
                    reconstructed_batches - 1,
                    batch.num_rows()
                ));
            }
            Some(Err(e)) => {
                mismatched_batches = mismatched_batches.saturating_add(1);
                issues.push(format!("extra reconstructed batch error: {e}"));
            }
            None => break,
        }
    }
    if source_rows != reconstructed_rows {
        issues.push(format!(
            "row count mismatch: source={} reconstructed={}",
            source_rows, reconstructed_rows
        ));
    }

    let status = if issues.is_empty() {
        StorageV2ShadowStatus::Green
    } else {
        StorageV2ShadowStatus::Red
    };
    Ok(StorageV2EquivalenceReport {
        status,
        source_parquet_path: source_path.display().to_string(),
        fact_parquet_path: manifest.fact_parquet_path.clone(),
        route_dim_parquet_path: manifest.route_dim_parquet_path.clone(),
        source_rows,
        reconstructed_rows,
        source_batches,
        reconstructed_batches,
        mismatched_batches,
        issues,
    })
}

fn reconstruct_logical_batch_from_v2_fact(
    dataset_kind: DatasetKind,
    fact_batch: &RecordBatch,
    route_dim: &BTreeMap<u32, RouteDimEntry>,
    logical_schema_fields: &[String],
    logical_field_nullable: &BTreeMap<String, bool>,
) -> Result<RecordBatch> {
    let route_keys = u32_col(fact_batch, "route_key")?;
    let timestamps = u64_col(fact_batch, dataset_kind.timestamp_column())?;
    let cycle_seq = u32_col(fact_batch, "cycle_seq")?;

    let mut fields = Vec::with_capacity(logical_schema_fields.len());
    let mut arrays = Vec::with_capacity(logical_schema_fields.len());

    for name in logical_schema_fields {
        if let Some(field) =
            virtualized_field(name, *logical_field_nullable.get(name).unwrap_or(&false))
        {
            fields.push(field);
            arrays.push(build_virtualized_array(
                name, route_keys, timestamps, cycle_seq, route_dim,
            )?);
            continue;
        }

        let idx = fact_batch
            .schema()
            .index_of(name)
            .with_context(|| format!("fact missing logical field '{name}'"))?;
        fields.push(fact_batch.schema().field(idx).as_ref().clone());
        arrays.push(fact_batch.column(idx).clone());
    }

    RecordBatch::try_new(Arc::new(Schema::new(fields)), arrays)
        .context("reconstruct storage_v2 logical batch")
}

fn build_virtualized_array(
    name: &str,
    route_keys: &UInt32Array,
    timestamps: &UInt64Array,
    cycle_seq: &UInt32Array,
    route_dim: &BTreeMap<u32, RouteDimEntry>,
) -> Result<ArrayRef> {
    match name {
        "sample_id" => {
            let mut values = Vec::with_capacity(route_keys.len());
            for row in 0..route_keys.len() {
                let entry = route_dim_entry_for_key(route_dim, route_keys, row)?;
                let buy_venue = parse_venue(&entry.buy_venue, &entry.buy_market)?;
                let sell_venue = parse_venue(&entry.sell_venue, &entry.sell_market)?;
                let symbol_for_id = if entry.canonical_symbol.is_empty() {
                    entry.symbol_name.as_str()
                } else {
                    entry.canonical_symbol.as_str()
                };
                values.push(sample_id_of(
                    timestamps.value(row),
                    cycle_seq.value(row),
                    symbol_for_id,
                    buy_venue,
                    sell_venue,
                ));
            }
            Ok(Arc::new(StringArray::from(values)) as ArrayRef)
        }
        "route_id" => string_array_from_route_dim(route_dim, route_keys, |entry| &entry.route_id),
        "symbol_name" => {
            string_array_from_route_dim(route_dim, route_keys, |entry| &entry.symbol_name)
        }
        "canonical_symbol" => {
            string_array_from_route_dim(route_dim, route_keys, |entry| &entry.canonical_symbol)
        }
        "buy_venue" => string_array_from_route_dim(route_dim, route_keys, |entry| &entry.buy_venue),
        "sell_venue" => {
            string_array_from_route_dim(route_dim, route_keys, |entry| &entry.sell_venue)
        }
        "buy_market" => {
            string_array_from_route_dim(route_dim, route_keys, |entry| &entry.buy_market)
        }
        "sell_market" => {
            string_array_from_route_dim(route_dim, route_keys, |entry| &entry.sell_market)
        }
        "symbol_id" => {
            let mut values = Vec::with_capacity(route_keys.len());
            for row in 0..route_keys.len() {
                values.push(route_dim_entry_for_key(route_dim, route_keys, row)?.symbol_id);
            }
            Ok(Arc::new(UInt32Array::from(values)) as ArrayRef)
        }
        _ => anyhow::bail!("unsupported virtualized field '{name}'"),
    }
}

fn string_array_from_route_dim(
    route_dim: &BTreeMap<u32, RouteDimEntry>,
    route_keys: &UInt32Array,
    f: impl Fn(&RouteDimEntry) -> &String,
) -> Result<ArrayRef> {
    let mut values = Vec::with_capacity(route_keys.len());
    for row in 0..route_keys.len() {
        values.push(f(route_dim_entry_for_key(route_dim, route_keys, row)?).clone());
    }
    Ok(Arc::new(StringArray::from(values)) as ArrayRef)
}

fn route_dim_entry_for_key<'a>(
    route_dim: &'a BTreeMap<u32, RouteDimEntry>,
    route_keys: &UInt32Array,
    row: usize,
) -> Result<&'a RouteDimEntry> {
    if route_keys.is_null(row) {
        anyhow::bail!("route_key is null at row {}", row + 1);
    }
    let route_key = route_keys.value(row);
    route_dim
        .get(&route_key)
        .with_context(|| format!("route_key {route_key} missing from route_dim"))
}

fn read_route_dim_parquet(path: &Path) -> Result<BTreeMap<u32, RouteDimEntry>> {
    let file = File::open(path).with_context(|| format!("open route_dim {}", path.display()))?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(file)
        .with_context(|| format!("build route_dim reader {}", path.display()))?;
    let mut reader = builder
        .build()
        .with_context(|| format!("read route_dim {}", path.display()))?;
    let mut route_dim = BTreeMap::new();

    for maybe_batch in &mut reader {
        let batch =
            maybe_batch.with_context(|| format!("read route_dim batch {}", path.display()))?;
        let route_key = u32_col(&batch, "route_key")?;
        let route_id = string_col(&batch, "route_id")?;
        let symbol_name = string_col(&batch, "symbol_name")?;
        let canonical_symbol = string_col(&batch, "canonical_symbol")?;
        let symbol_id = u32_col(&batch, "symbol_id")?;
        let buy_venue = string_col(&batch, "buy_venue")?;
        let sell_venue = string_col(&batch, "sell_venue")?;
        let buy_market = string_col(&batch, "buy_market")?;
        let sell_market = string_col(&batch, "sell_market")?;
        for row in 0..batch.num_rows() {
            if route_key.is_null(row)
                || route_id.is_null(row)
                || symbol_name.is_null(row)
                || canonical_symbol.is_null(row)
                || symbol_id.is_null(row)
                || buy_venue.is_null(row)
                || sell_venue.is_null(row)
                || buy_market.is_null(row)
                || sell_market.is_null(row)
            {
                anyhow::bail!("route_dim required field is null at row {}", row + 1);
            }
            let entry = RouteDimEntry {
                route_id: route_id.value(row).to_string(),
                symbol_name: symbol_name.value(row).to_string(),
                canonical_symbol: canonical_symbol.value(row).to_string(),
                symbol_id: symbol_id.value(row),
                buy_venue: buy_venue.value(row).to_string(),
                sell_venue: sell_venue.value(row).to_string(),
                buy_market: buy_market.value(row).to_string(),
                sell_market: sell_market.value(row).to_string(),
            };
            if let Some(existing) = route_dim.insert(route_key.value(row), entry.clone()) {
                if existing != entry {
                    anyhow::bail!("conflicting duplicate route_key {}", route_key.value(row));
                }
            }
        }
    }
    Ok(route_dim)
}

fn build_fact_batch(
    dataset_kind: DatasetKind,
    batch: &RecordBatch,
    route_id_to_key: &mut BTreeMap<String, u32>,
    route_dim: &mut BTreeMap<u32, RouteDimEntry>,
) -> Result<RecordBatch> {
    let columns = BatchColumns::new(dataset_kind, batch)?;
    let mut route_keys = Vec::with_capacity(batch.num_rows());
    for row in 0..batch.num_rows() {
        if required_row_has_nulls(&columns, row) {
            anyhow::bail!("required identity field is null at row {}", row + 1);
        }
        let entry = route_dim_entry_for_row(&columns, row)?;
        let route_id = entry.route_id.clone();
        let route_key = if let Some(route_key) = route_id_to_key.get(&route_id) {
            *route_key
        } else {
            let next = (route_id_to_key.len() + 1)
                .try_into()
                .context("too many routes for u32 route_key")?;
            route_id_to_key.insert(route_id, next);
            route_dim.insert(next, entry.clone());
            next
        };
        if let Some(existing) = route_dim.get(&route_key) {
            if existing != &entry {
                anyhow::bail!("route_dim conflict for route_key={route_key}");
            }
        }
        route_keys.push(route_key);
    }

    let mut fields = Vec::with_capacity(batch.num_columns());
    let mut arrays = Vec::with_capacity(batch.num_columns());
    fields.push(Field::new("route_key", DataType::UInt32, false));
    arrays.push(Arc::new(UInt32Array::from(route_keys)) as ArrayRef);

    for (idx, field) in batch.schema().fields().iter().enumerate() {
        if is_virtualized_column(field.name()) {
            continue;
        }
        fields.push(field.as_ref().clone());
        arrays.push(batch.column(idx).clone());
    }
    let schema: SchemaRef = Arc::new(Schema::new(fields));
    RecordBatch::try_new(schema, arrays).context("build storage_v2 fact batch")
}

fn build_route_dim_batch(route_dim: &BTreeMap<u32, RouteDimEntry>) -> Result<RecordBatch> {
    let mut route_keys = Vec::with_capacity(route_dim.len());
    let mut route_ids = Vec::with_capacity(route_dim.len());
    let mut symbol_names = Vec::with_capacity(route_dim.len());
    let mut canonical_symbols = Vec::with_capacity(route_dim.len());
    let mut symbol_ids = Vec::with_capacity(route_dim.len());
    let mut buy_venues = Vec::with_capacity(route_dim.len());
    let mut sell_venues = Vec::with_capacity(route_dim.len());
    let mut buy_markets = Vec::with_capacity(route_dim.len());
    let mut sell_markets = Vec::with_capacity(route_dim.len());

    for (route_key, entry) in route_dim {
        route_keys.push(*route_key);
        route_ids.push(entry.route_id.as_str());
        symbol_names.push(entry.symbol_name.as_str());
        canonical_symbols.push(entry.canonical_symbol.as_str());
        symbol_ids.push(entry.symbol_id);
        buy_venues.push(entry.buy_venue.as_str());
        sell_venues.push(entry.sell_venue.as_str());
        buy_markets.push(entry.buy_market.as_str());
        sell_markets.push(entry.sell_market.as_str());
    }

    let schema = Arc::new(Schema::new(vec![
        Field::new("route_key", DataType::UInt32, false),
        Field::new("route_id", DataType::Utf8, false),
        Field::new("symbol_name", DataType::Utf8, false),
        Field::new("canonical_symbol", DataType::Utf8, false),
        Field::new("symbol_id", DataType::UInt32, false),
        Field::new("buy_venue", DataType::Utf8, false),
        Field::new("sell_venue", DataType::Utf8, false),
        Field::new("buy_market", DataType::Utf8, false),
        Field::new("sell_market", DataType::Utf8, false),
    ]));
    RecordBatch::try_new(
        schema,
        vec![
            Arc::new(UInt32Array::from(route_keys)) as ArrayRef,
            Arc::new(StringArray::from(route_ids)) as ArrayRef,
            Arc::new(StringArray::from(symbol_names)) as ArrayRef,
            Arc::new(StringArray::from(canonical_symbols)) as ArrayRef,
            Arc::new(UInt32Array::from(symbol_ids)) as ArrayRef,
            Arc::new(StringArray::from(buy_venues)) as ArrayRef,
            Arc::new(StringArray::from(sell_venues)) as ArrayRef,
            Arc::new(StringArray::from(buy_markets)) as ArrayRef,
            Arc::new(StringArray::from(sell_markets)) as ArrayRef,
        ],
    )
    .context("build route_dim batch")
}

fn route_dim_entry_for_row(columns: &BatchColumns<'_>, row: usize) -> Result<RouteDimEntry> {
    let symbol_name = columns.symbol_name.value(row);
    let canonical_symbol = columns.canonical_symbol.value(row);
    let symbol_for_id = if canonical_symbol.is_empty() {
        symbol_name
    } else {
        canonical_symbol
    };
    let buy_venue = parse_venue(columns.buy_venue.value(row), columns.buy_market.value(row))?;
    let sell_venue = parse_venue(
        columns.sell_venue.value(row),
        columns.sell_market.value(row),
    )?;
    let route_id = RouteId {
        symbol_id: SymbolId(columns.symbol_id.value(row)),
        buy_venue,
        sell_venue,
    };
    Ok(RouteDimEntry {
        route_id: route_id_key(symbol_for_id, route_id),
        symbol_name: symbol_name.to_string(),
        canonical_symbol: canonical_symbol.to_string(),
        symbol_id: columns.symbol_id.value(row),
        buy_venue: buy_venue.as_str().to_string(),
        sell_venue: sell_venue.as_str().to_string(),
        buy_market: columns.buy_market.value(row).to_string(),
        sell_market: columns.sell_market.value(row).to_string(),
    })
}

fn sidecar_writer_properties(cfg: &StorageV2MaterializeConfig) -> Result<WriterProperties> {
    let zstd_level = ZstdLevel::try_new(cfg.zstd_level).context("invalid storage_v2 zstd level")?;
    Ok(WriterProperties::builder()
        .set_compression(Compression::ZSTD(zstd_level))
        .build())
}

fn sidecar_fact_path_for_source(source_path: &Path, out_dir: &Path) -> PathBuf {
    out_dir.join(format!("{}.fact.parquet", source_stem(source_path)))
}

fn sidecar_route_dim_path_for_source(source_path: &Path, out_dir: &Path) -> PathBuf {
    out_dir.join(format!("{}.route_dim.parquet", source_stem(source_path)))
}

fn sidecar_manifest_path_for_source(source_path: &Path, out_dir: &Path) -> PathBuf {
    out_dir.join(format!(
        "{}.storage_v2.manifest.json",
        source_stem(source_path)
    ))
}

fn source_stem(source_path: &Path) -> String {
    source_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("part")
        .to_string()
}

fn prepare_output_path(path: &Path, overwrite_existing: bool) -> Result<()> {
    if path.exists() {
        if !overwrite_existing {
            anyhow::bail!("output exists and overwrite disabled: {}", path.display());
        }
        fs::remove_file(path).with_context(|| format!("remove existing {}", path.display()))?;
    }
    Ok(())
}

fn remove_file_if_exists(path: &Path) -> Result<()> {
    if path.exists() {
        fs::remove_file(path).with_context(|| format!("remove {}", path.display()))?;
    }
    Ok(())
}

fn publish_sidecar_files(
    temp_fact_path: &Path,
    fact_path: &Path,
    temp_route_dim_path: &Path,
    route_dim_path: &Path,
    temp_manifest_path: &Path,
    manifest_path: &Path,
) -> Result<()> {
    if let Err(e) = fs::rename(temp_fact_path, fact_path) {
        let _ = remove_file_if_exists(temp_fact_path);
        let _ = remove_file_if_exists(temp_route_dim_path);
        let _ = remove_file_if_exists(temp_manifest_path);
        return Err(e).with_context(|| {
            format!(
                "publish {} -> {}",
                temp_fact_path.display(),
                fact_path.display()
            )
        });
    }

    if let Err(e) = fs::rename(temp_route_dim_path, route_dim_path) {
        let _ = remove_file_if_exists(fact_path);
        let _ = remove_file_if_exists(temp_route_dim_path);
        let _ = remove_file_if_exists(temp_manifest_path);
        return Err(e).with_context(|| {
            format!(
                "publish {} -> {}",
                temp_route_dim_path.display(),
                route_dim_path.display()
            )
        });
    }

    if let Err(e) = fs::rename(temp_manifest_path, manifest_path) {
        let _ = remove_file_if_exists(fact_path);
        let _ = remove_file_if_exists(route_dim_path);
        let _ = remove_file_if_exists(temp_manifest_path);
        return Err(e).with_context(|| {
            format!(
                "publish {} -> {}",
                temp_manifest_path.display(),
                manifest_path.display()
            )
        });
    }

    Ok(())
}

fn read_source_parquet_manifest_if_present(path: &Path) -> Result<Option<ParquetManifest>> {
    if !path.exists() {
        return Ok(None);
    }
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let manifest: ParquetManifest =
        serde_json::from_reader(file).with_context(|| format!("parse {}", path.display()))?;
    Ok(Some(manifest))
}

fn write_sidecar_manifest_temp(manifest: &StorageV2SidecarManifest, path: &Path) -> Result<()> {
    {
        let file = File::create(path).with_context(|| format!("create {}", path.display()))?;
        serde_json::to_writer_pretty(file, manifest)
            .with_context(|| format!("write {}", path.display()))?;
    }
    let file = File::open(path).with_context(|| format!("open {}", path.display()))?;
    let roundtrip: StorageV2SidecarManifest =
        serde_json::from_reader(file).with_context(|| format!("parse {}", path.display()))?;
    if &roundtrip != manifest {
        anyhow::bail!("storage_v2 manifest roundtrip mismatch: {}", path.display());
    }
    Ok(())
}

fn virtualized_columns() -> &'static [&'static str] {
    &[
        "sample_id",
        "route_id",
        "symbol_id",
        "symbol_name",
        "canonical_symbol",
        "buy_venue",
        "sell_venue",
        "buy_market",
        "sell_market",
    ]
}

fn is_virtualized_column(name: &str) -> bool {
    virtualized_columns().contains(&name)
}

fn virtualized_field(name: &str, nullable: bool) -> Option<Field> {
    match name {
        "sample_id" | "route_id" | "symbol_name" | "canonical_symbol" | "buy_venue"
        | "sell_venue" | "buy_market" | "sell_market" => {
            Some(Field::new(name, DataType::Utf8, nullable))
        }
        "symbol_id" => Some(Field::new(name, DataType::UInt32, nullable)),
        _ => None,
    }
}

fn analyze_single_file_into_dataset(
    path: &Path,
    dataset_kind: DatasetKind,
    route_dim: &mut BTreeMap<String, RouteDimEntry>,
    digest: &mut LogicalDigest,
) -> Result<StorageV2DatasetAudit> {
    let mut audit = StorageV2DatasetAudit {
        dataset_kind: dataset_kind.as_str().to_string(),
        files: 1,
        physical_bytes: fs::metadata(path)
            .with_context(|| format!("metadata {}", path.display()))?
            .len(),
        logical_required_digest_kind: logical_digest_kind(),
        ..StorageV2DatasetAudit::default()
    };

    let column_bytes = parquet_column_bytes(path)?;
    audit.sample_id_physical_bytes = *column_bytes.get("sample_id").unwrap_or(&0);
    audit.route_identity_physical_bytes = ROUTE_IDENTITY_COLUMNS
        .iter()
        .filter(|name| **name != "sample_id")
        .map(|name| column_bytes.get(*name).copied().unwrap_or(0))
        .sum();

    let file = File::open(path).with_context(|| format!("open parquet {}", path.display()))?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(file)
        .with_context(|| format!("build parquet reader {}", path.display()))?;
    let mut reader = builder
        .build()
        .with_context(|| format!("read parquet {}", path.display()))?;
    let parquet_rows = parquet_row_count(path).unwrap_or(0);
    for maybe_batch in &mut reader {
        let batch = maybe_batch.with_context(|| format!("read batch {}", path.display()))?;
        match analyze_record_batch_inner_with_digest(dataset_kind, &batch, route_dim, digest) {
            Ok(batch_audit) => merge_batch_into_dataset(&mut audit, &batch_audit),
            Err(e) => {
                if audit.rows == 0 {
                    audit.rows = parquet_rows;
                }
                audit
                    .issues
                    .push(format!("schema_or_contract_error {}: {e}", path.display()));
                break;
            }
        }
    }
    finalize_dataset_audit(&mut audit);
    Ok(audit)
}

fn analyze_record_batch_inner(
    dataset_kind: DatasetKind,
    batch: &RecordBatch,
    route_dim: &mut BTreeMap<String, RouteDimEntry>,
) -> Result<StorageV2BatchAudit> {
    let mut digest = LogicalDigest::new(dataset_kind);
    let mut audit =
        analyze_record_batch_inner_with_digest(dataset_kind, batch, route_dim, &mut digest)?;
    audit.logical_required_digest_hex = digest.hex();
    Ok(audit)
}

fn analyze_record_batch_inner_with_digest(
    dataset_kind: DatasetKind,
    batch: &RecordBatch,
    route_dim: &mut BTreeMap<String, RouteDimEntry>,
    digest: &mut LogicalDigest,
) -> Result<StorageV2BatchAudit> {
    let columns = BatchColumns::new(dataset_kind, batch)?;
    let mut audit = StorageV2BatchAudit {
        rows: batch.num_rows() as u64,
        logical_required_digest_kind: logical_digest_kind(),
        ..StorageV2BatchAudit::default()
    };

    for row in 0..batch.num_rows() {
        if required_row_has_nulls(&columns, row) {
            audit.required_nulls = audit.required_nulls.saturating_add(1);
            continue;
        }

        let symbol_name = columns.symbol_name.value(row);
        let canonical_symbol = columns.canonical_symbol.value(row);
        let symbol_for_id = if canonical_symbol.is_empty() {
            symbol_name
        } else {
            canonical_symbol
        };
        let symbol_id = columns.symbol_id.value(row);
        let buy_venue_name = columns.buy_venue.value(row);
        let sell_venue_name = columns.sell_venue.value(row);
        let buy_market = columns.buy_market.value(row);
        let sell_market = columns.sell_market.value(row);
        let buy_venue = parse_venue(buy_venue_name, buy_market)?;
        let sell_venue = parse_venue(sell_venue_name, sell_market)?;
        let route_id = RouteId {
            symbol_id: SymbolId(symbol_id),
            buy_venue,
            sell_venue,
        };
        if columns.schema_version.value(row) != expected_schema_version(dataset_kind) {
            audit.schema_version_mismatches = audit.schema_version_mismatches.saturating_add(1);
        }

        let expected_route_id = route_id_key(symbol_for_id, route_id);
        let actual_route_id = columns.route_id.value(row);
        if actual_route_id != expected_route_id {
            audit.route_id_mismatches = audit.route_id_mismatches.saturating_add(1);
        }

        let ts_ns = columns.timestamp.value(row);
        let cycle_seq = columns.cycle_seq.value(row);
        let expected_sample_id =
            sample_id_of(ts_ns, cycle_seq, symbol_for_id, buy_venue, sell_venue);
        let actual_sample_id = columns.sample_id.value(row);
        if actual_sample_id != expected_sample_id {
            audit.sample_id_mismatches = audit.sample_id_mismatches.saturating_add(1);
        }

        if let (Some(horizon_s), Some(closed_at)) =
            (columns.horizon_s, columns.label_window_closed_at_ns)
        {
            let expected_closed_at =
                ts_ns.saturating_add((horizon_s.value(row) as u64).saturating_mul(NS_PER_SECOND));
            if closed_at.value(row) != expected_closed_at {
                audit.label_window_mismatches = audit.label_window_mismatches.saturating_add(1);
            }
        }

        let route_entry = RouteDimEntry {
            route_id: expected_route_id.clone(),
            symbol_name: symbol_name.to_string(),
            canonical_symbol: canonical_symbol.to_string(),
            symbol_id,
            buy_venue: buy_venue.as_str().to_string(),
            sell_venue: sell_venue.as_str().to_string(),
            buy_market: buy_market.to_string(),
            sell_market: sell_market.to_string(),
        };
        if let Some(existing) = route_dim.get(&expected_route_id) {
            if existing != &route_entry {
                audit.route_dim_conflicts = audit.route_dim_conflicts.saturating_add(1);
            }
        } else {
            route_dim.insert(expected_route_id, route_entry);
        }

        digest.begin_row();
        digest.update_str(actual_sample_id);
        digest.update_str(actual_route_id);
        digest.update_u64(ts_ns);
        digest.update_u32(cycle_seq);
        digest.update_u16(columns.schema_version.value(row));
        if let Some(horizon_s) = columns.horizon_s {
            digest.update_u32(horizon_s.value(row));
        }
    }

    audit.route_dim_rows = route_dim.len() as u64;
    audit.logical_required_digest_hex = digest.hex();
    finalize_batch_audit(&mut audit);
    Ok(audit)
}

impl<'a> BatchColumns<'a> {
    fn new(dataset_kind: DatasetKind, batch: &'a RecordBatch) -> Result<Self> {
        Ok(Self {
            sample_id: string_col(batch, "sample_id")?,
            symbol_id: u32_col(batch, "symbol_id")?,
            symbol_name: string_col(batch, "symbol_name")?,
            canonical_symbol: string_col(batch, "canonical_symbol")?,
            route_id: string_col(batch, "route_id")?,
            buy_venue: string_col(batch, "buy_venue")?,
            sell_venue: string_col(batch, "sell_venue")?,
            buy_market: string_col(batch, "buy_market")?,
            sell_market: string_col(batch, "sell_market")?,
            timestamp: u64_col(batch, dataset_kind.timestamp_column())?,
            cycle_seq: u32_col(batch, "cycle_seq")?,
            schema_version: u16_col(batch, "schema_version")?,
            horizon_s: if dataset_kind == DatasetKind::LabeledTrades {
                Some(u32_col(batch, "horizon_s")?)
            } else {
                optional_u32_col(batch, "horizon_s")?
            },
            label_window_closed_at_ns: if dataset_kind == DatasetKind::LabeledTrades {
                Some(u64_col(batch, "label_window_closed_at_ns")?)
            } else {
                optional_u64_col(batch, "label_window_closed_at_ns")?
            },
        })
    }
}

fn required_row_has_nulls(columns: &BatchColumns<'_>, row: usize) -> bool {
    let mut has_null = columns.sample_id.is_null(row)
        || columns.symbol_id.is_null(row)
        || columns.symbol_name.is_null(row)
        || columns.canonical_symbol.is_null(row)
        || columns.route_id.is_null(row)
        || columns.buy_venue.is_null(row)
        || columns.sell_venue.is_null(row)
        || columns.buy_market.is_null(row)
        || columns.sell_market.is_null(row)
        || columns.timestamp.is_null(row)
        || columns.cycle_seq.is_null(row)
        || columns.schema_version.is_null(row);
    if let Some(horizon_s) = columns.horizon_s {
        has_null |= horizon_s.is_null(row);
    }
    if let Some(closed_at) = columns.label_window_closed_at_ns {
        has_null |= closed_at.is_null(row);
    }
    has_null
}

fn merge_batch_into_dataset(dataset: &mut StorageV2DatasetAudit, batch: &StorageV2BatchAudit) {
    dataset.rows = dataset.rows.saturating_add(batch.rows);
    dataset.route_dim_conflicts = dataset
        .route_dim_conflicts
        .saturating_add(batch.route_dim_conflicts);
    dataset.schema_version_mismatches = dataset
        .schema_version_mismatches
        .saturating_add(batch.schema_version_mismatches);
    dataset.sample_id_mismatches = dataset
        .sample_id_mismatches
        .saturating_add(batch.sample_id_mismatches);
    dataset.route_id_mismatches = dataset
        .route_id_mismatches
        .saturating_add(batch.route_id_mismatches);
    dataset.label_window_mismatches = dataset
        .label_window_mismatches
        .saturating_add(batch.label_window_mismatches);
    dataset.required_nulls = dataset.required_nulls.saturating_add(batch.required_nulls);
}

fn merge_dataset_into_dataset(dst: &mut StorageV2DatasetAudit, src: &StorageV2DatasetAudit) {
    dst.files = dst.files.saturating_add(src.files);
    dst.rows = dst.rows.saturating_add(src.rows);
    dst.physical_bytes = dst.physical_bytes.saturating_add(src.physical_bytes);
    dst.sample_id_physical_bytes = dst
        .sample_id_physical_bytes
        .saturating_add(src.sample_id_physical_bytes);
    dst.route_identity_physical_bytes = dst
        .route_identity_physical_bytes
        .saturating_add(src.route_identity_physical_bytes);
    dst.route_dim_conflicts = dst
        .route_dim_conflicts
        .saturating_add(src.route_dim_conflicts);
    dst.schema_version_mismatches = dst
        .schema_version_mismatches
        .saturating_add(src.schema_version_mismatches);
    dst.sample_id_mismatches = dst
        .sample_id_mismatches
        .saturating_add(src.sample_id_mismatches);
    dst.route_id_mismatches = dst
        .route_id_mismatches
        .saturating_add(src.route_id_mismatches);
    dst.label_window_mismatches = dst
        .label_window_mismatches
        .saturating_add(src.label_window_mismatches);
    dst.required_nulls = dst.required_nulls.saturating_add(src.required_nulls);
    dst.issues.extend(src.issues.iter().cloned());
}

fn finalize_batch_audit(audit: &mut StorageV2BatchAudit) {
    audit.issues = storage_v2_issues(
        audit.route_dim_conflicts,
        audit.schema_version_mismatches,
        audit.sample_id_mismatches,
        audit.route_id_mismatches,
        audit.label_window_mismatches,
        audit.required_nulls,
    );
}

fn finalize_dataset_audit(audit: &mut StorageV2DatasetAudit) {
    let route_key_fact_bytes = audit.rows.saturating_mul(ROUTE_KEY_FACT_BYTES_PER_ROW);
    let route_dim_bytes = audit
        .route_dim_rows
        .saturating_mul(ROUTE_DIM_ESTIMATED_BYTES_PER_ROW);
    audit.estimated_reclaimable_bytes_conservative = audit.sample_id_physical_bytes;
    audit.estimated_reclaimable_bytes_with_route_dim = audit
        .sample_id_physical_bytes
        .saturating_add(audit.route_identity_physical_bytes)
        .saturating_sub(route_key_fact_bytes)
        .saturating_sub(route_dim_bytes);
    let mut issues = std::mem::take(&mut audit.issues);
    issues.extend(storage_v2_issues(
        audit.route_dim_conflicts,
        audit.schema_version_mismatches,
        audit.sample_id_mismatches,
        audit.route_id_mismatches,
        audit.label_window_mismatches,
        audit.required_nulls,
    ));
    audit.issues = issues;
}

fn storage_v2_issues(
    route_dim_conflicts: u64,
    schema_version_mismatches: u64,
    sample_id_mismatches: u64,
    route_id_mismatches: u64,
    label_window_mismatches: u64,
    required_nulls: u64,
) -> Vec<String> {
    let mut issues = Vec::new();
    if route_dim_conflicts != 0 {
        issues.push(format!("route_dim_conflicts={route_dim_conflicts}"));
    }
    if schema_version_mismatches != 0 {
        issues.push(format!(
            "schema_version_mismatches={schema_version_mismatches}"
        ));
    }
    if sample_id_mismatches != 0 {
        issues.push(format!("sample_id_mismatches={sample_id_mismatches}"));
    }
    if route_id_mismatches != 0 {
        issues.push(format!("route_id_mismatches={route_id_mismatches}"));
    }
    if label_window_mismatches != 0 {
        issues.push(format!("label_window_mismatches={label_window_mismatches}"));
    }
    if required_nulls != 0 {
        issues.push(format!("required_null_rows={required_nulls}"));
    }
    issues
}

fn collect_parquet_files(root: &Path) -> Result<Vec<PathBuf>> {
    if !root.exists() {
        return Ok(Vec::new());
    }
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
            if path.extension().and_then(|ext| ext.to_str()) == Some("parquet") {
                out.push(path);
            }
        }
    }
    out.sort();
    Ok(out)
}

fn parquet_column_bytes(path: &Path) -> Result<BTreeMap<String, u64>> {
    let file =
        File::open(path).with_context(|| format!("open parquet metadata {}", path.display()))?;
    let reader = SerializedFileReader::new(file)
        .with_context(|| format!("read parquet metadata {}", path.display()))?;
    let metadata = reader.metadata();
    let mut out = BTreeMap::new();
    for row_group in metadata.row_groups() {
        for column in row_group.columns() {
            let name = column.column_path().string();
            let bytes = column.compressed_size().max(0) as u64;
            *out.entry(name).or_insert(0) += bytes;
        }
    }
    Ok(out)
}

fn parquet_row_count(path: &Path) -> Result<u64> {
    let file =
        File::open(path).with_context(|| format!("open parquet metadata {}", path.display()))?;
    let reader = SerializedFileReader::new(file)
        .with_context(|| format!("read parquet metadata {}", path.display()))?;
    Ok(reader.metadata().file_metadata().num_rows().max(0) as u64)
}

fn parse_venue(name: &str, market: &str) -> Result<Venue> {
    let is_spot = market.eq_ignore_ascii_case("SPOT");
    let is_fut = market.eq_ignore_ascii_case("FUTURES") || market.eq_ignore_ascii_case("PERP");
    match name.to_ascii_lowercase().as_str() {
        "binance" if is_spot => Ok(Venue::BinanceSpot),
        "binance" if is_fut => Ok(Venue::BinanceFut),
        "mexc" if is_spot => Ok(Venue::MexcSpot),
        "mexc" if is_fut => Ok(Venue::MexcFut),
        "bingx" if is_spot => Ok(Venue::BingxSpot),
        "bingx" if is_fut => Ok(Venue::BingxFut),
        "gate" if is_spot => Ok(Venue::GateSpot),
        "gate" if is_fut => Ok(Venue::GateFut),
        "kucoin" if is_spot => Ok(Venue::KucoinSpot),
        "kucoin" if is_fut => Ok(Venue::KucoinFut),
        "xt" if is_spot => Ok(Venue::XtSpot),
        "xt" if is_fut => Ok(Venue::XtFut),
        "bitget" if is_spot => Ok(Venue::BitgetSpot),
        "bitget" if is_fut => Ok(Venue::BitgetFut),
        _ => anyhow::bail!("unknown venue/market pair: {name}:{market}"),
    }
}

fn expected_schema_version(dataset_kind: DatasetKind) -> u16 {
    match dataset_kind {
        DatasetKind::AcceptedSamples => ACCEPTED_SAMPLE_SCHEMA_VERSION,
        DatasetKind::RawSamples => RAW_SAMPLE_SCHEMA_VERSION,
        DatasetKind::LabeledTrades => LABELED_TRADE_SCHEMA_VERSION,
    }
}

fn string_col<'a>(batch: &'a RecordBatch, name: &str) -> Result<&'a StringArray> {
    batch
        .column(batch.schema().index_of(name)?)
        .as_any()
        .downcast_ref::<StringArray>()
        .with_context(|| format!("column '{name}' is not Utf8"))
}

fn u16_col<'a>(batch: &'a RecordBatch, name: &str) -> Result<&'a UInt16Array> {
    batch
        .column(batch.schema().index_of(name)?)
        .as_any()
        .downcast_ref::<UInt16Array>()
        .with_context(|| format!("column '{name}' is not UInt16"))
}

fn u32_col<'a>(batch: &'a RecordBatch, name: &str) -> Result<&'a UInt32Array> {
    batch
        .column(batch.schema().index_of(name)?)
        .as_any()
        .downcast_ref::<UInt32Array>()
        .with_context(|| format!("column '{name}' is not UInt32"))
}

fn u64_col<'a>(batch: &'a RecordBatch, name: &str) -> Result<&'a UInt64Array> {
    batch
        .column(batch.schema().index_of(name)?)
        .as_any()
        .downcast_ref::<UInt64Array>()
        .with_context(|| format!("column '{name}' is not UInt64"))
}

fn optional_u32_col<'a>(batch: &'a RecordBatch, name: &str) -> Result<Option<&'a UInt32Array>> {
    if batch.schema().index_of(name).is_err() {
        return Ok(None);
    }
    Ok(Some(u32_col(batch, name)?))
}

fn optional_u64_col<'a>(batch: &'a RecordBatch, name: &str) -> Result<Option<&'a UInt64Array>> {
    if batch.schema().index_of(name).is_err() {
        return Ok(None);
    }
    Ok(Some(u64_col(batch, name)?))
}

fn logical_digest_kind() -> String {
    "fnv1a64_storage_v2_logical_required_v1".to_string()
}

struct LogicalDigest {
    hash: u64,
    row: u64,
}

impl LogicalDigest {
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

    fn update_str(&mut self, value: &str) {
        self.update_bytes(b"str");
        self.update_bytes(&(value.len() as u64).to_le_bytes());
        self.update_bytes(value.as_bytes());
    }

    fn update_bytes(&mut self, bytes: &[u8]) {
        for byte in bytes {
            self.hash ^= *byte as u64;
            self.hash = self.hash.wrapping_mul(Self::FNV_PRIME);
        }
    }

    fn hex(&self) -> String {
        format!("{:016x}", self.hash)
    }
}
