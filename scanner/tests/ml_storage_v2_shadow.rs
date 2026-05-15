use std::sync::Arc;

use arrow_array::{RecordBatch, StringArray, UInt16Array, UInt32Array, UInt64Array};
use arrow_schema::{DataType, Field, Schema};
use parquet::arrow::ArrowWriter;
use parquet::basic::{Compression, ZstdLevel};
use parquet::file::properties::WriterProperties;
use scanner::ml::persistence::sample_id::sample_id_of;
use scanner::ml::persistence::storage_v2::{
    analyze_record_batch_for_storage_v2, materialize_parquet_file_to_storage_v2_sidecar,
    read_storage_v2_sidecar_as_logical_batches, verify_storage_v2_sidecar_equivalence,
    StorageV2MaterializeConfig, StorageV2ShadowStatus,
};
use scanner::ml::persistence::{
    DatasetKind, LABELED_TRADE_SCHEMA_VERSION, RAW_SAMPLE_SCHEMA_VERSION,
};
use scanner::types::Venue;
use tempfile::tempdir;

fn raw_batch(sample_id: &str, route_id: &str) -> RecordBatch {
    raw_batch_with_symbol(sample_id, route_id, "BTC-USDT", "BTC-USDT")
}

fn raw_batch_with_symbol(
    sample_id: &str,
    route_id: &str,
    symbol_name: &str,
    canonical_symbol: &str,
) -> RecordBatch {
    let schema = Arc::new(Schema::new(vec![
        Field::new("ts_ns", DataType::UInt64, false),
        Field::new("cycle_seq", DataType::UInt32, false),
        Field::new("schema_version", DataType::UInt16, false),
        Field::new("sample_id", DataType::Utf8, false),
        Field::new("symbol_id", DataType::UInt32, false),
        Field::new("symbol_name", DataType::Utf8, false),
        Field::new("canonical_symbol", DataType::Utf8, false),
        Field::new("route_id", DataType::Utf8, false),
        Field::new("buy_venue", DataType::Utf8, false),
        Field::new("sell_venue", DataType::Utf8, false),
        Field::new("buy_market", DataType::Utf8, false),
        Field::new("sell_market", DataType::Utf8, false),
    ]));
    RecordBatch::try_new(
        schema,
        vec![
            Arc::new(UInt64Array::from(vec![1_700_000_000_000_000_000])),
            Arc::new(UInt32Array::from(vec![7])),
            Arc::new(UInt16Array::from(vec![RAW_SAMPLE_SCHEMA_VERSION])),
            Arc::new(StringArray::from(vec![sample_id])),
            Arc::new(UInt32Array::from(vec![42])),
            Arc::new(StringArray::from(vec![symbol_name])),
            Arc::new(StringArray::from(vec![canonical_symbol])),
            Arc::new(StringArray::from(vec![route_id])),
            Arc::new(StringArray::from(vec!["mexc"])),
            Arc::new(StringArray::from(vec!["bingx"])),
            Arc::new(StringArray::from(vec!["FUTURES"])),
            Arc::new(StringArray::from(vec!["FUTURES"])),
        ],
    )
    .expect("valid raw batch")
}

fn raw_batch_with_route_dim_conflict() -> RecordBatch {
    let ts0 = 1_700_000_000_000_000_000;
    let ts1 = ts0 + 1_000_000_000;
    let sample_id0 = sample_id_of(ts0, 7, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
    let sample_id1 = sample_id_of(ts1, 8, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
    let schema = Arc::new(Schema::new(vec![
        Field::new("ts_ns", DataType::UInt64, false),
        Field::new("cycle_seq", DataType::UInt32, false),
        Field::new("schema_version", DataType::UInt16, false),
        Field::new("sample_id", DataType::Utf8, false),
        Field::new("symbol_id", DataType::UInt32, false),
        Field::new("symbol_name", DataType::Utf8, false),
        Field::new("canonical_symbol", DataType::Utf8, false),
        Field::new("route_id", DataType::Utf8, false),
        Field::new("buy_venue", DataType::Utf8, false),
        Field::new("sell_venue", DataType::Utf8, false),
        Field::new("buy_market", DataType::Utf8, false),
        Field::new("sell_market", DataType::Utf8, false),
    ]));
    RecordBatch::try_new(
        schema,
        vec![
            Arc::new(UInt64Array::from(vec![ts0, ts1])),
            Arc::new(UInt32Array::from(vec![7, 8])),
            Arc::new(UInt16Array::from(vec![
                RAW_SAMPLE_SCHEMA_VERSION,
                RAW_SAMPLE_SCHEMA_VERSION,
            ])),
            Arc::new(StringArray::from(vec![sample_id0, sample_id1])),
            Arc::new(UInt32Array::from(vec![42, 42])),
            Arc::new(StringArray::from(vec!["BTC-USDT", "BTC-USDT"])),
            Arc::new(StringArray::from(vec!["", "BTC-USDT"])),
            Arc::new(StringArray::from(vec![
                "BTC-USDT|mexc:FUTURES->bingx:FUTURES",
                "BTC-USDT|mexc:FUTURES->bingx:FUTURES",
            ])),
            Arc::new(StringArray::from(vec!["mexc", "mexc"])),
            Arc::new(StringArray::from(vec!["bingx", "bingx"])),
            Arc::new(StringArray::from(vec!["FUTURES", "FUTURES"])),
            Arc::new(StringArray::from(vec!["FUTURES", "FUTURES"])),
        ],
    )
    .expect("valid raw batch")
}

fn write_parquet(path: &std::path::Path, batch: &RecordBatch) {
    let file = std::fs::File::create(path).expect("create parquet");
    let props = WriterProperties::builder()
        .set_compression(Compression::ZSTD(ZstdLevel::try_new(3).unwrap()))
        .build();
    let mut writer = ArrowWriter::try_new(file, batch.schema(), Some(props)).unwrap();
    writer.write(batch).unwrap();
    writer.close().unwrap();
}

#[test]
fn storage_v2_shadow_reconstructs_sample_id_and_route_id() {
    let sample_id = sample_id_of(
        1_700_000_000_000_000_000,
        7,
        "BTC-USDT",
        Venue::MexcFut,
        Venue::BingxFut,
    );
    let batch = raw_batch(&sample_id, "BTC-USDT|mexc:FUTURES->bingx:FUTURES");

    let audit = analyze_record_batch_for_storage_v2(DatasetKind::RawSamples, &batch)
        .expect("audit succeeds");

    assert_eq!(audit.rows, 1);
    assert_eq!(audit.route_dim_rows, 1);
    assert_eq!(audit.sample_id_mismatches, 0);
    assert_eq!(audit.route_id_mismatches, 0);
    assert_eq!(audit.required_nulls, 0);
    assert_eq!(audit.issues, Vec::<String>::new());
}

#[test]
fn storage_v2_shadow_flags_sample_id_drift() {
    let batch = raw_batch(
        "00000000000000000000000000000000",
        "BTC-USDT|mexc:FUTURES->bingx:FUTURES",
    );

    let audit = analyze_record_batch_for_storage_v2(DatasetKind::RawSamples, &batch)
        .expect("audit succeeds");

    assert_eq!(audit.rows, 1);
    assert_eq!(audit.sample_id_mismatches, 1);
    assert!(audit
        .issues
        .iter()
        .any(|issue| issue.contains("sample_id_mismatches=1")));
}

#[test]
fn storage_v2_shadow_flags_labeled_window_drift() {
    let sample_id = sample_id_of(
        10_000_000_000,
        3,
        "ETH-USDT",
        Venue::MexcSpot,
        Venue::BingxFut,
    );
    let schema = Arc::new(Schema::new(vec![
        Field::new("sample_id", DataType::Utf8, false),
        Field::new("horizon_s", DataType::UInt32, false),
        Field::new("ts_emit_ns", DataType::UInt64, false),
        Field::new("cycle_seq", DataType::UInt32, false),
        Field::new("schema_version", DataType::UInt16, false),
        Field::new("symbol_id", DataType::UInt32, false),
        Field::new("symbol_name", DataType::Utf8, false),
        Field::new("canonical_symbol", DataType::Utf8, false),
        Field::new("route_id", DataType::Utf8, false),
        Field::new("buy_venue", DataType::Utf8, false),
        Field::new("sell_venue", DataType::Utf8, false),
        Field::new("buy_market", DataType::Utf8, false),
        Field::new("sell_market", DataType::Utf8, false),
        Field::new("label_window_closed_at_ns", DataType::UInt64, false),
        Field::new("closed_ts_ns", DataType::UInt64, false),
        Field::new("outcome", DataType::Utf8, false),
    ]));
    let batch = RecordBatch::try_new(
        schema,
        vec![
            Arc::new(StringArray::from(vec![sample_id])),
            Arc::new(UInt32Array::from(vec![900])),
            Arc::new(UInt64Array::from(vec![10_000_000_000])),
            Arc::new(UInt32Array::from(vec![3])),
            Arc::new(UInt16Array::from(vec![LABELED_TRADE_SCHEMA_VERSION])),
            Arc::new(UInt32Array::from(vec![99])),
            Arc::new(StringArray::from(vec!["ETH-USDT"])),
            Arc::new(StringArray::from(vec!["ETH-USDT"])),
            Arc::new(StringArray::from(vec!["ETH-USDT|mexc:SPOT->bingx:FUTURES"])),
            Arc::new(StringArray::from(vec!["mexc"])),
            Arc::new(StringArray::from(vec!["bingx"])),
            Arc::new(StringArray::from(vec!["SPOT"])),
            Arc::new(StringArray::from(vec!["FUTURES"])),
            Arc::new(UInt64Array::from(vec![10_000_000_001])),
            Arc::new(UInt64Array::from(vec![10_000_000_001])),
            Arc::new(StringArray::from(vec!["censored"])),
        ],
    )
    .expect("valid labeled batch");

    let audit = analyze_record_batch_for_storage_v2(DatasetKind::LabeledTrades, &batch)
        .expect("audit succeeds");

    assert_eq!(audit.rows, 1);
    assert_eq!(audit.label_window_mismatches, 1);
    assert!(audit
        .issues
        .iter()
        .any(|issue| issue.contains("label_window_mismatches=1")));
}

#[test]
fn storage_v2_sidecar_materializes_fact_and_route_dim_without_touching_v1() {
    let sample_id = sample_id_of(
        1_700_000_000_000_000_000,
        7,
        "BTC-USDT",
        Venue::MexcFut,
        Venue::BingxFut,
    );
    let batch = raw_batch(&sample_id, "BTC-USDT|mexc:FUTURES->bingx:FUTURES");
    let dir = tempdir().unwrap();
    let source = dir.path().join("raw-source.parquet");
    let out_dir = dir.path().join("v2");
    write_parquet(&source, &batch);

    let manifest = materialize_parquet_file_to_storage_v2_sidecar(
        &source,
        DatasetKind::RawSamples,
        &out_dir,
        &StorageV2MaterializeConfig::default(),
    )
    .expect("materialize v2 sidecar");

    assert_eq!(manifest.source_row_count, 1);
    assert_eq!(manifest.fact_row_count, 1);
    assert_eq!(manifest.route_dim_row_count, 1);
    assert!(
        source.exists(),
        "v1 source must remain canonical and untouched"
    );
    assert!(manifest.fact_parquet_path.ends_with(".fact.parquet"));
    assert!(manifest
        .route_dim_parquet_path
        .ends_with(".route_dim.parquet"));

    let fact_schema = parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder::try_new(
        std::fs::File::open(&manifest.fact_parquet_path).unwrap(),
    )
    .unwrap()
    .schema()
    .clone();
    assert!(fact_schema.field_with_name("route_key").is_ok());
    assert!(fact_schema.field_with_name("sample_id").is_err());
    assert!(fact_schema.field_with_name("route_id").is_err());
    assert!(fact_schema.field_with_name("symbol_name").is_err());
    assert!(fact_schema.field_with_name("canonical_symbol").is_err());

    let dim_schema = parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder::try_new(
        std::fs::File::open(&manifest.route_dim_parquet_path).unwrap(),
    )
    .unwrap()
    .schema()
    .clone();
    assert!(dim_schema.field_with_name("route_key").is_ok());
    assert!(dim_schema.field_with_name("route_id").is_ok());
    assert!(dim_schema.field_with_name("canonical_symbol").is_ok());
}

#[test]
fn storage_v2_sidecar_reconstructs_logical_batch_equal_to_v1() {
    let sample_id = sample_id_of(
        1_700_000_000_000_000_000,
        7,
        "BTC-USDT",
        Venue::MexcFut,
        Venue::BingxFut,
    );
    let batch = raw_batch(&sample_id, "BTC-USDT|mexc:FUTURES->bingx:FUTURES");
    let dir = tempdir().unwrap();
    let source = dir.path().join("raw-source.parquet");
    let out_dir = dir.path().join("v2");
    write_parquet(&source, &batch);

    let manifest = materialize_parquet_file_to_storage_v2_sidecar(
        &source,
        DatasetKind::RawSamples,
        &out_dir,
        &StorageV2MaterializeConfig::default(),
    )
    .expect("materialize v2 sidecar");

    let reconstructed =
        read_storage_v2_sidecar_as_logical_batches(&manifest, DatasetKind::RawSamples)
            .expect("read v2 as logical v1");

    assert_eq!(reconstructed.len(), 1);
    assert_eq!(
        format!("{:?}", reconstructed[0].schema()),
        format!("{:?}", batch.schema())
    );
    assert_eq!(reconstructed[0], batch);
}

#[test]
fn storage_v2_sidecar_preserves_empty_canonical_symbol_losslessly() {
    let sample_id = sample_id_of(
        1_700_000_000_000_000_000,
        7,
        "BTC-USDT",
        Venue::MexcFut,
        Venue::BingxFut,
    );
    let batch = raw_batch_with_symbol(
        &sample_id,
        "BTC-USDT|mexc:FUTURES->bingx:FUTURES",
        "BTC-USDT",
        "",
    );
    let dir = tempdir().unwrap();
    let source = dir.path().join("raw-source.parquet");
    let out_dir = dir.path().join("v2");
    write_parquet(&source, &batch);

    let manifest = materialize_parquet_file_to_storage_v2_sidecar(
        &source,
        DatasetKind::RawSamples,
        &out_dir,
        &StorageV2MaterializeConfig::default(),
    )
    .expect("materialize v2 sidecar");

    let reconstructed =
        read_storage_v2_sidecar_as_logical_batches(&manifest, DatasetKind::RawSamples)
            .expect("read v2 as logical v1");

    assert_eq!(reconstructed[0], batch);
}

#[test]
fn storage_v2_sidecar_equivalence_gate_compares_v1_and_reconstructed_v2() {
    let sample_id = sample_id_of(
        1_700_000_000_000_000_000,
        7,
        "BTC-USDT",
        Venue::MexcFut,
        Venue::BingxFut,
    );
    let batch = raw_batch(&sample_id, "BTC-USDT|mexc:FUTURES->bingx:FUTURES");
    let dir = tempdir().unwrap();
    let source = dir.path().join("raw-source.parquet");
    let out_dir = dir.path().join("v2");
    write_parquet(&source, &batch);

    let manifest = materialize_parquet_file_to_storage_v2_sidecar(
        &source,
        DatasetKind::RawSamples,
        &out_dir,
        &StorageV2MaterializeConfig::default(),
    )
    .expect("materialize v2 sidecar");

    let equivalence =
        verify_storage_v2_sidecar_equivalence(&source, &manifest, DatasetKind::RawSamples)
            .expect("verify v1/v2 equivalence");

    assert_eq!(equivalence.status, StorageV2ShadowStatus::Green);
    assert_eq!(equivalence.source_rows, 1);
    assert_eq!(equivalence.reconstructed_rows, 1);
    assert_eq!(equivalence.mismatched_batches, 0);
    assert_eq!(equivalence.issues, Vec::<String>::new());
}

#[test]
fn storage_v2_sidecar_refuses_contract_mismatch() {
    let batch = raw_batch(
        "00000000000000000000000000000000",
        "BTC-USDT|mexc:FUTURES->bingx:FUTURES",
    );
    let dir = tempdir().unwrap();
    let source = dir.path().join("bad-raw-source.parquet");
    let out_dir = dir.path().join("v2");
    write_parquet(&source, &batch);

    let err = materialize_parquet_file_to_storage_v2_sidecar(
        &source,
        DatasetKind::RawSamples,
        &out_dir,
        &StorageV2MaterializeConfig::default(),
    )
    .expect_err("bad sample_id must block sidecar publication");

    assert!(err.to_string().contains("sample_id_mismatches=1"));
    assert!(!out_dir.exists() || std::fs::read_dir(&out_dir).unwrap().next().is_none());
}

#[test]
fn storage_v2_sidecar_refuses_route_dim_identity_conflict() {
    let batch = raw_batch_with_route_dim_conflict();
    let dir = tempdir().unwrap();
    let source = dir.path().join("conflict-raw-source.parquet");
    let out_dir = dir.path().join("v2");
    write_parquet(&source, &batch);

    let err = materialize_parquet_file_to_storage_v2_sidecar(
        &source,
        DatasetKind::RawSamples,
        &out_dir,
        &StorageV2MaterializeConfig::default(),
    )
    .expect_err("route_dim identity drift must block lossless sidecar publication");

    assert!(err.to_string().contains("route_dim_conflicts=1"));
    assert!(!out_dir.exists() || std::fs::read_dir(&out_dir).unwrap().next().is_none());
}
