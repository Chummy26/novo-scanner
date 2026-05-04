use std::fs::{self, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    Array, ArrayRef, RecordBatch, StringArray, UInt16Array, UInt32Array, UInt64Array,
};
use arrow_json::reader::ReaderBuilder;
use arrow_schema::{DataType, Field, Schema, SchemaRef};
use parquet::arrow::ArrowWriter;
use parquet::basic::{Compression, ZstdLevel};
use parquet::file::properties::WriterProperties;
use parquet::file::reader::{FileReader, SerializedFileReader};

use crate::ml::persistence::labeled_trade::LABELED_TRADE_SCHEMA_VERSION;
use crate::ml::persistence::raw_sample::RAW_SAMPLE_SCHEMA_VERSION;
use crate::ml::persistence::sample::ACCEPTED_SAMPLE_SCHEMA_VERSION;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DatasetKind {
    AcceptedSamples,
    RawSamples,
    LabeledTrades,
}

#[derive(Debug, Clone)]
pub struct ParquetCompactionConfig {
    pub enabled: bool,
    pub delete_jsonl_after_success: bool,
    pub batch_size: usize,
    pub zstd_level: i32,
}

impl Default for ParquetCompactionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            delete_jsonl_after_success: true,
            batch_size: 4096,
            zstd_level: 3,
        }
    }
}

pub fn compact_jsonl_file(
    jsonl_path: &Path,
    dataset_kind: DatasetKind,
    cfg: &ParquetCompactionConfig,
) -> Result<Option<PathBuf>> {
    if !cfg.enabled {
        return Ok(None);
    }
    if jsonl_path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
        return Ok(None);
    }

    let metadata =
        fs::metadata(jsonl_path).with_context(|| format!("metadata {}", jsonl_path.display()))?;
    if metadata.len() == 0 {
        if cfg.delete_jsonl_after_success {
            fs::remove_file(jsonl_path)
                .with_context(|| format!("removing empty {}", jsonl_path.display()))?;
        }
        return Ok(None);
    }

    let parquet_path = jsonl_path.with_extension("parquet");
    let temp_parquet_path = jsonl_path.with_extension("parquet.tmp");
    let schema = schema_for(dataset_kind);

    if temp_parquet_path.exists() {
        let _ = fs::remove_file(&temp_parquet_path);
    }

    let input =
        File::open(jsonl_path).with_context(|| format!("open input {}", jsonl_path.display()))?;
    let reader = BufReader::new(input);
    let mut json_reader = ReaderBuilder::new(schema.clone())
        .with_batch_size(cfg.batch_size)
        .build(reader)
        .with_context(|| format!("build json reader for {}", jsonl_path.display()))?;

    let zstd_level = ZstdLevel::try_new(cfg.zstd_level).context("invalid parquet zstd level")?;
    let props = WriterProperties::builder()
        .set_compression(Compression::ZSTD(zstd_level))
        .build();
    let output = File::create(&temp_parquet_path)
        .with_context(|| format!("create output {}", temp_parquet_path.display()))?;
    let mut writer = match ArrowWriter::try_new(output, schema, Some(props)) {
        Ok(writer) => writer,
        Err(e) => {
            let _ = fs::remove_file(&temp_parquet_path);
            return Err(e).with_context(|| {
                format!("create parquet writer for {}", temp_parquet_path.display())
            });
        }
    };

    let mut rows_written = 0usize;
    let mut source_validation = ValidationDigest::new(dataset_kind);
    let write_result = (|| -> Result<()> {
        for maybe_batch in &mut json_reader {
            let batch = maybe_batch
                .with_context(|| format!("read record batch from {}", jsonl_path.display()))?;
            validate_required_batch(dataset_kind, &batch, &mut source_validation).with_context(
                || {
                    format!(
                        "validate required fields from source {}",
                        jsonl_path.display()
                    )
                },
            )?;
            rows_written += batch.num_rows();
            writer.write(&batch).with_context(|| {
                format!("write parquet batch for {}", temp_parquet_path.display())
            })?;
        }
        writer
            .close()
            .with_context(|| format!("close parquet writer for {}", temp_parquet_path.display()))?;
        Ok(())
    })();
    if let Err(e) = write_result {
        let _ = fs::remove_file(&temp_parquet_path);
        return Err(e);
    }

    if rows_written == 0 {
        let _ = fs::remove_file(&temp_parquet_path);
        if cfg.delete_jsonl_after_success {
            fs::remove_file(jsonl_path)
                .with_context(|| format!("remove empty source {}", jsonl_path.display()))?;
        }
        return Ok(None);
    }

    let parquet_rows = match parquet_row_count(&temp_parquet_path) {
        Ok(rows) => rows,
        Err(e) => {
            let _ = fs::remove_file(&temp_parquet_path);
            return Err(e).with_context(|| {
                format!("validate parquet row count {}", temp_parquet_path.display())
            });
        }
    };
    if parquet_rows != rows_written as u64 {
        let _ = fs::remove_file(&temp_parquet_path);
        anyhow::bail!(
            "parquet row-count mismatch em {}: writer_rows={}, parquet_rows={}. \
            JSONL fonte preservado; nao removendo apos compactacao inconsistente.",
            jsonl_path.display(),
            rows_written,
            parquet_rows
        );
    }

    let parquet_validation = match parquet_validation_digest(&temp_parquet_path, dataset_kind) {
        Ok(validation) => validation,
        Err(e) => {
            let _ = fs::remove_file(&temp_parquet_path);
            return Err(e).with_context(|| {
                format!(
                    "validate parquet required-field digest {}",
                    temp_parquet_path.display()
                )
            });
        }
    };
    if parquet_validation != source_validation {
        let _ = fs::remove_file(&temp_parquet_path);
        anyhow::bail!(
            "parquet required-field digest mismatch em {}: source_rows={}, parquet_rows={}, \
             source_hash={:016x}, parquet_hash={:016x}. JSONL fonte preservado.",
            jsonl_path.display(),
            source_validation.rows,
            parquet_validation.rows,
            source_validation.hash,
            parquet_validation.hash
        );
    }

    fs::rename(&temp_parquet_path, &parquet_path).with_context(|| {
        format!(
            "rename parquet {} -> {}",
            temp_parquet_path.display(),
            parquet_path.display()
        )
    })?;
    if cfg.delete_jsonl_after_success {
        fs::remove_file(jsonl_path)
            .with_context(|| format!("remove source {}", jsonl_path.display()))?;
    }

    Ok(Some(parquet_path))
}

fn parquet_row_count(path: &Path) -> Result<u64> {
    let file =
        File::open(path).with_context(|| format!("open parquet metadata {}", path.display()))?;
    let reader = SerializedFileReader::new(file)
        .with_context(|| format!("read parquet metadata {}", path.display()))?;
    Ok(reader.metadata().file_metadata().num_rows().max(0) as u64)
}

fn parquet_validation_digest(path: &Path, dataset_kind: DatasetKind) -> Result<ValidationDigest> {
    let file = File::open(path).with_context(|| format!("open parquet {}", path.display()))?;
    let builder = parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder::try_new(file)
        .with_context(|| format!("build parquet reader {}", path.display()))?;
    let mut reader = builder
        .build()
        .with_context(|| format!("read parquet {}", path.display()))?;
    let mut digest = ValidationDigest::new(dataset_kind);
    for maybe_batch in &mut reader {
        let batch =
            maybe_batch.with_context(|| format!("read parquet batch {}", path.display()))?;
        validate_required_batch(dataset_kind, &batch, &mut digest)?;
    }
    Ok(digest)
}

#[derive(Debug, Clone, Copy)]
enum RequiredColumnKind {
    Utf8NonEmpty,
    U16Eq(u16),
    U32,
    U64,
}

#[derive(Debug, Clone, Copy)]
struct RequiredColumn {
    name: &'static str,
    kind: RequiredColumnKind,
}

const ACCEPTED_REQUIRED_COLUMNS: &[RequiredColumn] = &[
    RequiredColumn {
        name: "schema_version",
        kind: RequiredColumnKind::U16Eq(ACCEPTED_SAMPLE_SCHEMA_VERSION),
    },
    RequiredColumn {
        name: "sample_id",
        kind: RequiredColumnKind::Utf8NonEmpty,
    },
    RequiredColumn {
        name: "route_id",
        kind: RequiredColumnKind::Utf8NonEmpty,
    },
    RequiredColumn {
        name: "ts_ns",
        kind: RequiredColumnKind::U64,
    },
    RequiredColumn {
        name: "cycle_seq",
        kind: RequiredColumnKind::U32,
    },
];

const RAW_REQUIRED_COLUMNS: &[RequiredColumn] = &[
    RequiredColumn {
        name: "schema_version",
        kind: RequiredColumnKind::U16Eq(RAW_SAMPLE_SCHEMA_VERSION),
    },
    RequiredColumn {
        name: "sample_id",
        kind: RequiredColumnKind::Utf8NonEmpty,
    },
    RequiredColumn {
        name: "route_id",
        kind: RequiredColumnKind::Utf8NonEmpty,
    },
    RequiredColumn {
        name: "ts_ns",
        kind: RequiredColumnKind::U64,
    },
    RequiredColumn {
        name: "cycle_seq",
        kind: RequiredColumnKind::U32,
    },
];

const LABELED_REQUIRED_COLUMNS: &[RequiredColumn] = &[
    RequiredColumn {
        name: "schema_version",
        kind: RequiredColumnKind::U16Eq(LABELED_TRADE_SCHEMA_VERSION),
    },
    RequiredColumn {
        name: "sample_id",
        kind: RequiredColumnKind::Utf8NonEmpty,
    },
    RequiredColumn {
        name: "route_id",
        kind: RequiredColumnKind::Utf8NonEmpty,
    },
    RequiredColumn {
        name: "horizon_s",
        kind: RequiredColumnKind::U32,
    },
    RequiredColumn {
        name: "ts_emit_ns",
        kind: RequiredColumnKind::U64,
    },
    RequiredColumn {
        name: "cycle_seq",
        kind: RequiredColumnKind::U32,
    },
    RequiredColumn {
        name: "label_window_closed_at_ns",
        kind: RequiredColumnKind::U64,
    },
    RequiredColumn {
        name: "closed_ts_ns",
        kind: RequiredColumnKind::U64,
    },
    RequiredColumn {
        name: "outcome",
        kind: RequiredColumnKind::Utf8NonEmpty,
    },
];

fn required_columns(dataset_kind: DatasetKind) -> &'static [RequiredColumn] {
    match dataset_kind {
        DatasetKind::AcceptedSamples => ACCEPTED_REQUIRED_COLUMNS,
        DatasetKind::RawSamples => RAW_REQUIRED_COLUMNS,
        DatasetKind::LabeledTrades => LABELED_REQUIRED_COLUMNS,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct ValidationDigest {
    rows: u64,
    hash: u64,
}

impl ValidationDigest {
    const FNV_OFFSET: u64 = 0xcbf29ce484222325;
    const FNV_PRIME: u64 = 0x100000001b3;

    fn new(dataset_kind: DatasetKind) -> Self {
        let mut digest = Self {
            rows: 0,
            hash: Self::FNV_OFFSET,
        };
        digest.update_bytes(b"dataset");
        digest.update_bytes(format!("{dataset_kind:?}").as_bytes());
        digest
    }

    fn begin_row(&mut self, row: u64) {
        self.update_bytes(b"\x1erow");
        self.update_bytes(&row.to_le_bytes());
    }

    fn update_field_name(&mut self, name: &str) {
        self.update_bytes(b"\x1ffield");
        self.update_bytes(&(name.len() as u64).to_le_bytes());
        self.update_bytes(name.as_bytes());
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
}

fn validate_required_batch(
    dataset_kind: DatasetKind,
    batch: &RecordBatch,
    digest: &mut ValidationDigest,
) -> Result<()> {
    let mut columns = Vec::with_capacity(required_columns(dataset_kind).len());
    for required in required_columns(dataset_kind) {
        let idx = batch
            .schema()
            .index_of(required.name)
            .with_context(|| format!("required column '{}' not found", required.name))?;
        columns.push((*required, batch.column(idx).clone()));
    }

    for row_idx in 0..batch.num_rows() {
        let global_row = digest.rows + row_idx as u64 + 1;
        digest.begin_row(global_row);
        for (required, array) in &columns {
            digest.update_field_name(required.name);
            validate_required_value(dataset_kind, *required, array, row_idx, global_row, digest)?;
        }
    }
    digest.rows = digest.rows.saturating_add(batch.num_rows() as u64);
    Ok(())
}

fn validate_required_value(
    dataset_kind: DatasetKind,
    required: RequiredColumn,
    array: &ArrayRef,
    row_idx: usize,
    global_row: u64,
    digest: &mut ValidationDigest,
) -> Result<()> {
    if array.is_null(row_idx) {
        anyhow::bail!(
            "{dataset_kind:?} required field '{}' is null at row {}",
            required.name,
            global_row
        );
    }

    match required.kind {
        RequiredColumnKind::Utf8NonEmpty => {
            let values = array
                .as_any()
                .downcast_ref::<StringArray>()
                .with_context(|| {
                    format!(
                        "{dataset_kind:?} required field '{}' has non-Utf8 type {:?}",
                        required.name,
                        array.data_type()
                    )
                })?;
            let value = values.value(row_idx);
            if value.is_empty() {
                anyhow::bail!(
                    "{dataset_kind:?} required field '{}' is empty at row {}",
                    required.name,
                    global_row
                );
            }
            digest.update_str(value);
        }
        RequiredColumnKind::U16Eq(expected) => {
            let values = array
                .as_any()
                .downcast_ref::<UInt16Array>()
                .with_context(|| {
                    format!(
                        "{dataset_kind:?} required field '{}' has non-UInt16 type {:?}",
                        required.name,
                        array.data_type()
                    )
                })?;
            let value = values.value(row_idx);
            if value != expected {
                anyhow::bail!(
                    "schema_version mismatch em {dataset_kind:?} row {}: arquivo={}, compactor espera={}. \
                     Migração em voo — atualize o compactor antes de processar este arquivo.",
                    global_row,
                    value,
                    expected
                );
            }
            digest.update_u16(value);
        }
        RequiredColumnKind::U32 => {
            let values = array
                .as_any()
                .downcast_ref::<UInt32Array>()
                .with_context(|| {
                    format!(
                        "{dataset_kind:?} required field '{}' has non-UInt32 type {:?}",
                        required.name,
                        array.data_type()
                    )
                })?;
            digest.update_u32(values.value(row_idx));
        }
        RequiredColumnKind::U64 => {
            let values = array
                .as_any()
                .downcast_ref::<UInt64Array>()
                .with_context(|| {
                    format!(
                        "{dataset_kind:?} required field '{}' has non-UInt64 type {:?}",
                        required.name,
                        array.data_type()
                    )
                })?;
            digest.update_u64(values.value(row_idx));
        }
    }

    Ok(())
}

pub fn compact_existing_jsonl_in_tree(
    root: &Path,
    dataset_kind: DatasetKind,
    cfg: &ParquetCompactionConfig,
) -> Result<usize> {
    if !cfg.enabled || !root.exists() {
        return Ok(0);
    }

    let mut compacted = 0usize;
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
            if compact_jsonl_file(&path, dataset_kind, cfg)?.is_some() {
                compacted += 1;
            }
        }
    }

    Ok(compacted)
}

fn schema_for(dataset_kind: DatasetKind) -> SchemaRef {
    Arc::new(match dataset_kind {
        DatasetKind::AcceptedSamples => Schema::new(vec![
            u64_field("ts_ns"),
            u32_field("cycle_seq"),
            u16_field("schema_version"),
            utf8_field("scanner_version"),
            utf8_field("sample_id"),
            utf8_field("runtime_config_hash"),
            u32_field("symbol_id"),
            utf8_field("symbol_name"),
            utf8_field("canonical_symbol"),
            utf8_field("route_id"),
            utf8_field("buy_venue"),
            utf8_field("sell_venue"),
            utf8_field("buy_market"),
            utf8_field("sell_market"),
            f32_field("entry_spread"),
            f32_field("exit_spread"),
            f64_field("buy_vol24"),
            f64_field("sell_vol24"),
            utf8_field("sample_decision"),
            utf8_field("sampling_tier"),
            f32_field("sampling_probability"),
            utf8_field("sampling_probability_kind"),
            u64_field("route_first_seen_ns"),
            u64_field("route_last_seen_ns"),
            u64_field("route_active_until_ns"),
            u64_field("route_n_snapshots"),
            bool_field("was_recommended"),
        ]),
        DatasetKind::RawSamples => Schema::new(vec![
            u64_field("ts_ns"),
            u32_field("cycle_seq"),
            u16_field("schema_version"),
            utf8_field("scanner_version"),
            utf8_field("sample_id"),
            utf8_field("runtime_config_hash"),
            u32_field("symbol_id"),
            utf8_field("symbol_name"),
            utf8_field("canonical_symbol"),
            utf8_field("route_id"),
            utf8_field("buy_venue"),
            utf8_field("sell_venue"),
            utf8_field("buy_market"),
            utf8_field("sell_market"),
            f32_field("entry_spread"),
            f32_field("exit_spread"),
            f64_field("buy_vol24"),
            f64_field("sell_vol24"),
            utf8_field("sample_decision"),
            utf8_field("sampling_tier"),
            f32_field("sampling_probability"),
            utf8_field("sampling_probability_kind"),
            u32_field("priority_set_generation_id"),
            u64_field("priority_set_updated_at_ns"),
            u64_field("route_first_seen_ns"),
            u64_field("route_last_seen_ns"),
            u64_field("route_active_until_ns"),
            u64_field("route_n_snapshots"),
        ]),
        DatasetKind::LabeledTrades => Schema::new(vec![
            utf8_field("sample_id"),
            utf8_field("sample_decision"),
            u32_field("horizon_s"),
            u64_field("ts_emit_ns"),
            u32_field("cycle_seq"),
            u16_field("schema_version"),
            utf8_field("scanner_version"),
            // metadados v6.
            utf8_field("cluster_id"),
            u32_field("cluster_size"),
            u32_field("cluster_rank"),
            utf8_field("runtime_config_hash"),
            u32_field("priority_set_generation_id"),
            u64_field("priority_set_updated_at_ns"),
            u32_field("symbol_id"),
            utf8_field("symbol_name"),
            utf8_field("canonical_symbol"),
            utf8_field("route_id"),
            utf8_field("buy_venue"),
            utf8_field("sell_venue"),
            utf8_field("buy_market"),
            utf8_field("sell_market"),
            f32_field("entry_locked_pct"),
            f32_field("exit_start_pct"),
            struct_field(
                "features_t0",
                vec![
                    f32_field("half_spread_buy_now"),
                    f32_field("half_spread_sell_now"),
                    f32_field("tail_ratio_p99_p95"),
                    f32_field("entry_p25_24h"),
                    f32_field("entry_p50_24h"),
                    f32_field("entry_p75_24h"),
                    f32_field("entry_p95_24h"),
                    // Fix B1
                    f32_field("entry_rank_percentile_24h"),
                    f32_field("entry_minus_p50_24h"),
                    f32_field("entry_mad_robust_24h"),
                    f32_field("exit_p25_24h"),
                    f32_field("exit_p50_24h"),
                    f32_field("exit_p75_24h"),
                    f32_field("exit_p95_24h"),
                    // Fix B2
                    f32_field("p_exit_ge_label_floor_minus_entry_24h"),
                    f32_field("entry_p50_1h"),
                    f32_field("entry_rank_percentile_1h"),
                    f32_field("p_exit_ge_label_floor_minus_entry_1h"),
                    f32_field("entry_p50_7d"),
                    f32_field("entry_p95_7d"),
                    f32_field("p_exit_ge_label_floor_minus_entry_7d"),
                    u32_field("gross_run_p05_s"),
                    u32_field("gross_run_p50_s"),
                    u32_field("gross_run_p95_s"),
                    // Fix A4
                    u32_field("exit_excess_run_s"),
                    // Fix C7
                    u32_field("n_cache_observations_at_t0"),
                    u64_field("oldest_cache_ts_ns"),
                    u32_field("time_alive_at_t0_s"),
                    f32_field("listing_age_days"),
                    u64_field("route_first_seen_ns"),
                    u64_field("route_last_seen_ns"),
                    u64_field("route_active_until_ns"),
                    u64_field("route_n_snapshots"),
                ],
            ),
            // renomeação protetora.
            f32_field("audit_hindsight_best_exit_pct"),
            u64_field("audit_hindsight_best_exit_ts_ns"),
            f32_field("audit_hindsight_best_gross_pct"),
            u32_field("audit_hindsight_t_to_best_s"),
            u32_field("n_clean_future_samples"),
            f32_field("label_floor_pct"),
            u64_field("first_exit_ge_label_floor_ts_ns"),
            f32_field("first_exit_ge_label_floor_pct"),
            u32_field("t_to_first_hit_s"),
            list_of_struct_field(
                "label_floor_hits",
                vec![
                    f32_field("floor_pct"),
                    u64_field("first_exit_ge_floor_ts_ns"),
                    f32_field("first_exit_ge_floor_pct"),
                    u32_field("t_to_first_hit_s"),
                    bool_field("realized"),
                ],
            ),
            utf8_field("outcome"),
            utf8_field("censor_reason"),
            u64_field("observed_until_ns"),
            u64_field("label_window_closed_at_ns"),
            u64_field("closed_ts_ns"),
            u64_field("written_ts_ns"),
            struct_field(
                "policy_metadata",
                vec![
                    utf8_field("baseline_model_version"),
                    bool_field("baseline_recommended"),
                    utf8_field("recommendation_kind"),
                    utf8_field("abstain_reason"),
                    utf8_field("prediction_source_kind"),
                    utf8_field("prediction_model_version"),
                    u64_field("prediction_emitted_at_ns"),
                    u64_field("prediction_valid_until_ns"),
                    f32_field("prediction_entry_now"),
                    f32_field("prediction_exit_target"),
                    f32_field("prediction_gross_profit_target"),
                    f32_field("prediction_p_hit"),
                    f32_field("prediction_p_hit_ci_lo"),
                    f32_field("prediction_p_hit_ci_hi"),
                    f32_field("prediction_exit_q25"),
                    f32_field("prediction_exit_q50"),
                    f32_field("prediction_exit_q75"),
                    u32_field("prediction_t_hit_p25_s"),
                    u32_field("prediction_t_hit_median_s"),
                    u32_field("prediction_t_hit_p75_s"),
                    f32_field("prediction_p_censor"),
                    utf8_field("prediction_calibration_status"),
                    f32_field("baseline_historical_base_rate_24h"),
                    f32_field("baseline_derived_enter_at_min"),
                    f32_field("baseline_derived_exit_at_min"),
                    f32_field("baseline_floor_pct"),
                    u32_field("label_stride_s"),
                    u32_field("effective_stride_s"),
                    f32_field("label_sampling_probability"),
                    u32_field("candidates_in_route_last_24h"),
                    u32_field("accepts_in_route_last_24h"),
                    utf8_field("ci_method"),
                ],
            ),
            utf8_field("sampling_tier"),
            f32_field("sampling_probability"),
            utf8_field("sampling_probability_kind"),
        ]),
    })
}

fn utf8_field(name: &'static str) -> Field {
    Field::new(name, DataType::Utf8, true)
}

fn bool_field(name: &'static str) -> Field {
    Field::new(name, DataType::Boolean, true)
}

fn f32_field(name: &'static str) -> Field {
    Field::new(name, DataType::Float32, true)
}

fn f64_field(name: &'static str) -> Field {
    Field::new(name, DataType::Float64, true)
}

fn u16_field(name: &'static str) -> Field {
    Field::new(name, DataType::UInt16, true)
}

fn u32_field(name: &'static str) -> Field {
    Field::new(name, DataType::UInt32, true)
}

fn u64_field(name: &'static str) -> Field {
    Field::new(name, DataType::UInt64, true)
}

fn struct_field(name: &'static str, fields: Vec<Field>) -> Field {
    Field::new(name, DataType::Struct(fields.into()), true)
}

fn list_of_struct_field(name: &'static str, item_fields: Vec<Field>) -> Field {
    Field::new(
        name,
        DataType::List(Arc::new(Field::new(
            "item",
            DataType::Struct(item_fields.into()),
            true,
        ))),
        true,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;

    fn write_lines(path: &Path, lines: &[&str]) {
        let text = lines.join("\n");
        fs::write(path, format!("{text}\n")).expect("write jsonl");
    }

    fn parquet_row_count(path: &Path) -> usize {
        let file = File::open(path).expect("open parquet");
        let builder = ParquetRecordBatchReaderBuilder::try_new(file).expect("reader builder");
        let mut reader = builder.build().expect("build reader");
        let mut total = 0usize;
        for maybe_batch in &mut reader {
            total += maybe_batch.expect("batch").num_rows();
        }
        total
    }

    #[test]
    fn compacts_accepted_jsonl_to_parquet() {
        let tmp = tempfile::tempdir().expect("tmp");
        let jsonl = tmp.path().join("accepted.jsonl");
        write_lines(
            &jsonl,
            &[
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":10,"scanner_version":"0.1.0","sample_id":"id1","runtime_config_hash":"0000000000000001","symbol_id":7,"symbol_name":"BTC-USDT","canonical_symbol":"BTC-USDT","route_id":"BTC-USDT|mexc:FUTURES->bingx:FUTURES","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":2.0,"exit_spread":-1.0,"buy_vol24":1000000.0,"sell_vol24":1000000.0,"sample_decision":"accept","sampling_tier":"priority","sampling_probability":1.0,"sampling_probability_kind":"conditional_priority","route_first_seen_ns":1,"route_last_seen_ns":1,"route_active_until_ns":null,"route_n_snapshots":1,"was_recommended":true}"#,
            ],
        );

        let parquet = compact_jsonl_file(
            &jsonl,
            DatasetKind::AcceptedSamples,
            &ParquetCompactionConfig::default(),
        )
        .expect("compact")
        .expect("parquet path");

        assert!(!jsonl.exists());
        assert_eq!(parquet_row_count(&parquet), 1);
    }

    #[test]
    fn compacts_raw_jsonl_to_parquet() {
        let tmp = tempfile::tempdir().expect("tmp");
        let jsonl = tmp.path().join("raw.jsonl");
        write_lines(
            &jsonl,
            &[
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":11,"scanner_version":"0.1.0","sample_id":"id1","runtime_config_hash":"0000000000000001","symbol_id":7,"symbol_name":"BTC-USDT","canonical_symbol":"BTC-USDT","route_id":"BTC-USDT|mexc:FUTURES->bingx:FUTURES","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":2.0,"exit_spread":-1.0,"buy_vol24":1000000.0,"sell_vol24":1000000.0,"sample_decision":"accept","sampling_tier":"priority","sampling_probability":1.0,"sampling_probability_kind":"conditional_priority","priority_set_generation_id":3,"priority_set_updated_at_ns":2,"route_first_seen_ns":1,"route_last_seen_ns":1,"route_active_until_ns":null,"route_n_snapshots":1}"#,
            ],
        );

        let parquet = compact_jsonl_file(
            &jsonl,
            DatasetKind::RawSamples,
            &ParquetCompactionConfig::default(),
        )
        .expect("compact")
        .expect("parquet path");

        assert!(!jsonl.exists());
        assert_eq!(parquet_row_count(&parquet), 1);
    }

    #[test]
    fn compacts_labeled_jsonl_to_parquet() {
        let tmp = tempfile::tempdir().expect("tmp");
        let jsonl = tmp.path().join("labeled.jsonl");
        // Schema atual com campos de spread bruto e sem volume em features_t0.
        write_lines(
            &jsonl,
            &[concat!(
                r#"{"sample_id":"id1","sample_decision":"accept","horizon_s":900,"ts_emit_ns":1,"cycle_seq":1,"#,
                r#""schema_version":11,"scanner_version":"0.1.0","#,
                r#""cluster_id":"aaaa0000aaaa0000","cluster_size":1,"cluster_rank":1,"#,
                r#""runtime_config_hash":"0000000000000000","#,
                r#""priority_set_generation_id":0,"priority_set_updated_at_ns":0,"#,
                r#""symbol_id":7,"symbol_name":"BTC-USDT","canonical_symbol":"BTC-USDT","route_id":"BTC-USDT|mexc:FUTURES->bingx:FUTURES","#,
                r#""buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","#,
                r#""entry_locked_pct":2.0,"exit_start_pct":-1.0,"#,
                r#""features_t0":{"#,
                r#""half_spread_buy_now":0.02,"half_spread_sell_now":0.03,"#,
                r#""tail_ratio_p99_p95":1.8,"entry_p25_24h":1.0,"entry_p50_24h":1.5,"#,
                r#""entry_p75_24h":2.0,"entry_p95_24h":2.5,"#,
                r#""entry_rank_percentile_24h":0.8,"entry_minus_p50_24h":0.5,"entry_mad_robust_24h":0.3,"#,
                r#""exit_p25_24h":-1.5,"exit_p50_24h":-1.2,"exit_p75_24h":-0.8,"exit_p95_24h":-0.3,"#,
                r#""p_exit_ge_label_floor_minus_entry_24h":0.4,"#,
                r#""entry_p50_1h":1.7,"entry_rank_percentile_1h":0.75,"p_exit_ge_label_floor_minus_entry_1h":0.35,"#,
                r#""entry_p50_7d":1.4,"entry_p95_7d":2.8,"p_exit_ge_label_floor_minus_entry_7d":0.45,"#,
                r#""gross_run_p05_s":30,"gross_run_p50_s":120,"gross_run_p95_s":600,"#,
                r#""exit_excess_run_s":90,"#,
                r#""n_cache_observations_at_t0":500,"oldest_cache_ts_ns":0,"#,
                r#""time_alive_at_t0_s":42,"#,
                r#""listing_age_days":14.0,"route_first_seen_ns":1,"route_last_seen_ns":1,"#,
                r#""route_active_until_ns":null,"route_n_snapshots":1},"#,
                r#""audit_hindsight_best_exit_pct":-0.5,"audit_hindsight_best_exit_ts_ns":2,"#,
                r#""audit_hindsight_best_gross_pct":1.5,"audit_hindsight_t_to_best_s":120,"#,
                r#""n_clean_future_samples":10,"label_floor_pct":0.8,"#,
                r#""first_exit_ge_label_floor_ts_ns":2,"first_exit_ge_label_floor_pct":-1.2,"#,
                r#""t_to_first_hit_s":120,"#,
                r#""label_floor_hits":[{"floor_pct":0.8,"first_exit_ge_floor_ts_ns":2,"#,
                r#""first_exit_ge_floor_pct":-1.2,"t_to_first_hit_s":120,"realized":true}],"#,
                r#""outcome":"realized","censor_reason":null,"#,
                r#""observed_until_ns":2,"label_window_closed_at_ns":900000000001,"closed_ts_ns":3,"written_ts_ns":4,"#,
                r#""policy_metadata":{"baseline_model_version":"baseline-a3","baseline_recommended":true,"#,
                r#""recommendation_kind":"trade","abstain_reason":null,"#,
                r#""prediction_source_kind":"baseline","prediction_model_version":"baseline-a3","#,
                r#""prediction_emitted_at_ns":1,"prediction_valid_until_ns":61,"#,
                r#""prediction_entry_now":2.0,"prediction_exit_target":-1.2,"prediction_gross_profit_target":0.8,"#,
                r#""prediction_p_hit":null,"prediction_p_hit_ci_lo":null,"prediction_p_hit_ci_hi":null,"#,
                r#""prediction_exit_q25":-1.5,"prediction_exit_q50":-1.2,"prediction_exit_q75":-0.8,"#,
                r#""prediction_t_hit_p25_s":null,"prediction_t_hit_median_s":null,"prediction_t_hit_p75_s":null,"#,
                r#""prediction_p_censor":null,"prediction_calibration_status":"degraded","#,
                r#""baseline_historical_base_rate_24h":0.7,"baseline_derived_enter_at_min":1.8,"#,
                r#""baseline_derived_exit_at_min":-1.1,"baseline_floor_pct":0.8,"#,
                r#""label_stride_s":60,"effective_stride_s":60,"label_sampling_probability":1.0,"#,
                r#""candidates_in_route_last_24h":100,"accepts_in_route_last_24h":10,"#,
                r#""ci_method":"wilson_marginal"},"#,
                r#""sampling_tier":"priority","sampling_probability":1.0,"sampling_probability_kind":"conditional_priority"}"#,
            )],
        );

        let parquet = compact_jsonl_file(
            &jsonl,
            DatasetKind::LabeledTrades,
            &ParquetCompactionConfig::default(),
        )
        .expect("compact")
        .expect("parquet path");

        assert!(!jsonl.exists());
        assert_eq!(parquet_row_count(&parquet), 1);
    }

    #[test]
    fn compactor_preserves_nulls_and_non_finite_floats() {
        // JSONL com `null` em campos nullable deve produzir Parquet
        // válido com os nulls preservados.
        let tmp = tempfile::tempdir().expect("tmp");
        let jsonl = tmp.path().join("accepted_nulls.jsonl");
        write_lines(
            &jsonl,
            &[
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":10,"scanner_version":"0.1.0","sample_id":"id1","runtime_config_hash":"0000000000000001","symbol_id":7,"symbol_name":"BTC-USDT","canonical_symbol":"BTC-USDT","route_id":"BTC-USDT|mexc:FUTURES->bingx:FUTURES","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":null,"exit_spread":null,"buy_vol24":null,"sell_vol24":null,"sample_decision":"accept","sampling_tier":"accepted_full_capture","sampling_probability":1.0,"sampling_probability_kind":"marginal_full_capture","route_first_seen_ns":1,"route_last_seen_ns":1,"route_active_until_ns":null,"route_n_snapshots":1,"was_recommended":false}"#,
            ],
        );

        let parquet = compact_jsonl_file(
            &jsonl,
            DatasetKind::AcceptedSamples,
            &ParquetCompactionConfig::default(),
        )
        .expect("compact")
        .expect("parquet path");

        assert!(!jsonl.exists());
        assert_eq!(parquet_row_count(&parquet), 1);
    }

    #[test]
    fn compactor_rejects_schema_version_mismatch() {
        // arquivo com schema_version != esperado deve falhar loud.
        let tmp = tempfile::tempdir().expect("tmp");
        let jsonl = tmp.path().join("old.jsonl");
        write_lines(
            &jsonl,
            &[
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":5,"scanner_version":"0.1.0","sample_id":"id1","symbol_id":7,"symbol_name":"BTC-USDT","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":2.0,"exit_spread":-1.0,"buy_vol24":1000000.0,"sell_vol24":1000000.0,"sample_decision":"accept","was_recommended":true}"#,
            ],
        );
        let result = compact_jsonl_file(
            &jsonl,
            DatasetKind::AcceptedSamples,
            &ParquetCompactionConfig::default(),
        );
        assert!(
            result.is_err(),
            "schema v5 deveria ser rejeitado pelo compactor vigente"
        );
        assert!(
            jsonl.exists(),
            "JSONL fonte deve ser preservado quando a validacao falha"
        );
        assert!(!jsonl.with_extension("parquet").exists());
    }

    #[test]
    fn compactor_rejects_missing_required_identity_and_keeps_jsonl() {
        let tmp = tempfile::tempdir().expect("tmp");
        let jsonl = tmp.path().join("missing_identity.jsonl");
        write_lines(
            &jsonl,
            &[
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":10,"sample_id":"id1","route_id":"route-a"}"#,
                r#"{"ts_ns":2,"cycle_seq":2,"schema_version":10,"route_id":"route-a"}"#,
            ],
        );

        let result = compact_jsonl_file(
            &jsonl,
            DatasetKind::AcceptedSamples,
            &ParquetCompactionConfig::default(),
        );

        assert!(
            result.is_err(),
            "sample_id ausente em linha posterior deve ser rejeitado"
        );
        assert!(jsonl.exists());
        assert!(!jsonl.with_extension("parquet").exists());
        assert!(!jsonl.with_extension("parquet.tmp").exists());
    }

    #[test]
    fn compactor_rejects_later_schema_version_mismatch_and_keeps_jsonl() {
        let tmp = tempfile::tempdir().expect("tmp");
        let jsonl = tmp.path().join("later_schema_mismatch.jsonl");
        write_lines(
            &jsonl,
            &[
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":10,"sample_id":"id1","route_id":"route-a"}"#,
                r#"{"ts_ns":2,"cycle_seq":2,"schema_version":11,"sample_id":"id2","route_id":"route-a"}"#,
            ],
        );

        let result = compact_jsonl_file(
            &jsonl,
            DatasetKind::AcceptedSamples,
            &ParquetCompactionConfig::default(),
        );

        assert!(
            result.is_err(),
            "schema_version divergente em linha posterior deve ser rejeitado"
        );
        assert!(jsonl.exists());
        assert!(!jsonl.with_extension("parquet").exists());
        assert!(!jsonl.with_extension("parquet.tmp").exists());
    }
}
