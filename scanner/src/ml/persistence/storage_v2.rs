//! Auditoria shadow para `ml_storage_v2`.
//!
//! Este módulo implementa a primeira fase segura do storage v2: ele **não**
//! substitui o writer canônico, **não** remove colunas físicas e **não** altera
//! frequência, labels, horizontes ou floors. Ele lê Parquets v1 fechados,
//! reconstrói o contrato lógico que seria virtualizado no v2 (`sample_id`,
//! `route_id` e dimensão estática de rota), e gera métricas/erros antes de
//! qualquer migração.

use std::collections::BTreeMap;
use std::fs::{self, File};
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use arrow_array::{Array, RecordBatch, StringArray, UInt16Array, UInt32Array, UInt64Array};
use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;
use parquet::file::reader::{FileReader, SerializedFileReader};
use serde::{Deserialize, Serialize};

use crate::ml::contract::RouteId;
use crate::ml::persistence::parquet_compactor::DatasetKind;
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
            canonical_symbol: symbol_for_id.to_string(),
            symbol_id,
            buy_venue: buy_venue.as_str().to_string(),
            sell_venue: sell_venue.as_str().to_string(),
            buy_market: buy_venue.market().as_str().to_string(),
            sell_market: sell_venue.market().as_str().to_string(),
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

trait DatasetKindExt {
    fn timestamp_column(self) -> &'static str;
}

impl DatasetKindExt for DatasetKind {
    fn timestamp_column(self) -> &'static str {
        match self {
            DatasetKind::AcceptedSamples | DatasetKind::RawSamples => "ts_ns",
            DatasetKind::LabeledTrades => "ts_emit_ns",
        }
    }
}
