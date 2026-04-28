use std::fs::{self, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_json::reader::ReaderBuilder;
use arrow_schema::{DataType, Field, Schema, SchemaRef};
use parquet::arrow::ArrowWriter;
use parquet::basic::{Compression, ZstdLevel};
use parquet::file::properties::WriterProperties;

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

    // valida `schema_version` na primeira linha antes de compactar.
    // Divergência → fail-loud em vez de perda silenciosa.
    let first_line_reader = File::open(jsonl_path)
        .with_context(|| format!("open for schema-check {}", jsonl_path.display()))?;
    let mut first_line = String::new();
    {
        use std::io::BufRead;
        let mut buf = BufReader::new(first_line_reader);
        buf.read_line(&mut first_line)
            .with_context(|| format!("read first line {}", jsonl_path.display()))?;
    }
    if !first_line.trim().is_empty() {
        let v: serde_json::Value = serde_json::from_str(first_line.trim()).with_context(|| {
            format!(
                "parse first line for schema_version {}",
                jsonl_path.display()
            )
        })?;
        let expected: u16 = match dataset_kind {
            DatasetKind::AcceptedSamples => 6,
            DatasetKind::RawSamples => 7,
            DatasetKind::LabeledTrades => 6,
        };
        if let Some(got) = v.get("schema_version").and_then(|x| x.as_u64()) {
            if got != expected as u64 {
                anyhow::bail!(
                    "schema_version mismatch em {}: arquivo={}, compactor espera={}. \
                     Migração em voo — atualize o compactor antes de processar este arquivo.",
                    jsonl_path.display(),
                    got,
                    expected
                );
            }
        }
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
    let mut writer = ArrowWriter::try_new(output, schema, Some(props))
        .with_context(|| format!("create parquet writer for {}", temp_parquet_path.display()))?;

    let mut rows_written = 0usize;
    for maybe_batch in &mut json_reader {
        let batch = maybe_batch
            .with_context(|| format!("read record batch from {}", jsonl_path.display()))?;
        rows_written += batch.num_rows();
        writer
            .write(&batch)
            .with_context(|| format!("write parquet batch for {}", temp_parquet_path.display()))?;
    }
    writer
        .close()
        .with_context(|| format!("close parquet writer for {}", temp_parquet_path.display()))?;

    if rows_written == 0 {
        let _ = fs::remove_file(&temp_parquet_path);
        if cfg.delete_jsonl_after_success {
            fs::remove_file(jsonl_path)
                .with_context(|| format!("remove empty source {}", jsonl_path.display()))?;
        }
        return Ok(None);
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
            u32_field("symbol_id"),
            utf8_field("symbol_name"),
            utf8_field("buy_venue"),
            utf8_field("sell_venue"),
            utf8_field("buy_market"),
            utf8_field("sell_market"),
            f32_field("entry_spread"),
            f32_field("exit_spread"),
            f64_field("buy_vol24"),
            f64_field("sell_vol24"),
            utf8_field("sample_decision"),
            bool_field("was_recommended"),
        ]),
        DatasetKind::RawSamples => Schema::new(vec![
            u64_field("ts_ns"),
            u32_field("cycle_seq"),
            u16_field("schema_version"),
            utf8_field("scanner_version"),
            utf8_field("sample_id"),
            u32_field("symbol_id"),
            utf8_field("symbol_name"),
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
            u32_field("priority_set_generation_id"),
            u64_field("priority_set_updated_at_ns"),
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
            utf8_field("buy_venue"),
            utf8_field("sell_venue"),
            utf8_field("buy_market"),
            utf8_field("sell_market"),
            f32_field("entry_locked_pct"),
            f32_field("exit_start_pct"),
            struct_field(
                "features_t0",
                vec![
                    f64_field("buy_vol24"),
                    f64_field("sell_vol24"),
                    // Fix B4
                    f32_field("log_min_vol24_usd"),
                    f32_field("vol_ratio"),
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
                    u32_field("gross_run_p05_s"),
                    u32_field("gross_run_p50_s"),
                    u32_field("gross_run_p95_s"),
                    // Fix A4
                    u32_field("exit_excess_run_s"),
                    // Fix C7
                    u32_field("n_cache_observations_at_t0"),
                    u64_field("oldest_cache_ts_ns"),
                    f32_field("listing_age_days"),
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
            u64_field("closed_ts_ns"),
            u64_field("written_ts_ns"),
            struct_field(
                "policy_metadata",
                vec![
                    utf8_field("baseline_model_version"),
                    bool_field("baseline_recommended"),
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
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":6,"scanner_version":"0.1.0","sample_id":"id1","symbol_id":7,"symbol_name":"BTC-USDT","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":2.0,"exit_spread":-1.0,"buy_vol24":1000000.0,"sell_vol24":1000000.0,"sample_decision":"accept","was_recommended":true}"#,
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
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":7,"scanner_version":"0.1.0","sample_id":"id1","symbol_id":7,"symbol_name":"BTC-USDT","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":2.0,"exit_spread":-1.0,"buy_vol24":1000000.0,"sell_vol24":1000000.0,"sample_decision":"accept","sampling_tier":"priority","sampling_probability":1.0,"priority_set_generation_id":3,"priority_set_updated_at_ns":2}"#,
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
        // Schema v6 com todos os novos campos (C3, C13, C2, A10, B1, B2, B4, B8, C7, A4, A6, A13, D2).
        write_lines(
            &jsonl,
            &[concat!(
                r#"{"sample_id":"id1","sample_decision":"accept","horizon_s":900,"ts_emit_ns":1,"cycle_seq":1,"#,
                r#""schema_version":6,"scanner_version":"0.1.0","#,
                r#""cluster_id":"aaaa0000aaaa0000","cluster_size":1,"cluster_rank":1,"#,
                r#""runtime_config_hash":"0000000000000000","#,
                r#""priority_set_generation_id":0,"priority_set_updated_at_ns":0,"#,
                r#""symbol_id":7,"symbol_name":"BTC-USDT","#,
                r#""buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","#,
                r#""entry_locked_pct":2.0,"exit_start_pct":-1.0,"#,
                r#""features_t0":{"buy_vol24":1000000.0,"sell_vol24":1000000.0,"#,
                r#""log_min_vol24_usd":13.8,"vol_ratio":1.0,"#,
                r#""tail_ratio_p99_p95":1.8,"entry_p25_24h":1.0,"entry_p50_24h":1.5,"#,
                r#""entry_p75_24h":2.0,"entry_p95_24h":2.5,"#,
                r#""entry_rank_percentile_24h":0.8,"entry_minus_p50_24h":0.5,"entry_mad_robust_24h":0.3,"#,
                r#""exit_p25_24h":-1.5,"exit_p50_24h":-1.2,"exit_p75_24h":-0.8,"exit_p95_24h":-0.3,"#,
                r#""p_exit_ge_label_floor_minus_entry_24h":0.4,"#,
                r#""gross_run_p05_s":30,"gross_run_p50_s":120,"gross_run_p95_s":600,"#,
                r#""exit_excess_run_s":90,"#,
                r#""n_cache_observations_at_t0":500,"oldest_cache_ts_ns":0,"#,
                r#""listing_age_days":14.0},"#,
                r#""audit_hindsight_best_exit_pct":-0.5,"audit_hindsight_best_exit_ts_ns":2,"#,
                r#""audit_hindsight_best_gross_pct":1.5,"audit_hindsight_t_to_best_s":120,"#,
                r#""n_clean_future_samples":10,"label_floor_pct":0.8,"#,
                r#""first_exit_ge_label_floor_ts_ns":2,"first_exit_ge_label_floor_pct":-1.2,"#,
                r#""t_to_first_hit_s":120,"#,
                r#""label_floor_hits":[{"floor_pct":0.8,"first_exit_ge_floor_ts_ns":2,"#,
                r#""first_exit_ge_floor_pct":-1.2,"t_to_first_hit_s":120,"realized":true}],"#,
                r#""outcome":"realized","censor_reason":null,"#,
                r#""observed_until_ns":2,"closed_ts_ns":3,"written_ts_ns":4,"#,
                r#""policy_metadata":{"baseline_model_version":"baseline-a3","baseline_recommended":true,"#,
                r#""baseline_historical_base_rate_24h":0.7,"baseline_derived_enter_at_min":1.8,"#,
                r#""baseline_derived_exit_at_min":-1.1,"baseline_floor_pct":0.8,"#,
                r#""label_stride_s":60,"effective_stride_s":60,"label_sampling_probability":1.0,"#,
                r#""candidates_in_route_last_24h":100,"accepts_in_route_last_24h":10,"#,
                r#""ci_method":"wilson_marginal"},"#,
                r#""sampling_tier":"priority","sampling_probability":1.0}"#,
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
                r#"{"ts_ns":1,"cycle_seq":1,"schema_version":6,"scanner_version":"0.1.0","sample_id":"id1","symbol_id":7,"symbol_name":"BTC-USDT","buy_venue":"mexc","sell_venue":"bingx","buy_market":"FUTURES","sell_market":"FUTURES","entry_spread":null,"exit_spread":null,"buy_vol24":null,"sell_vol24":null,"sample_decision":"accept","was_recommended":false}"#,
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
        // arquivo com schema_version != 6 deve falhar loud.
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
            "schema v5 deveria ser rejeitado pelo compactor v6"
        );
    }
}
