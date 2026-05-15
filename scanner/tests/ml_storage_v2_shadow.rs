use std::sync::Arc;

use arrow_array::{RecordBatch, StringArray, UInt16Array, UInt32Array, UInt64Array};
use arrow_schema::{DataType, Field, Schema};
use scanner::ml::persistence::sample_id::sample_id_of;
use scanner::ml::persistence::storage_v2::analyze_record_batch_for_storage_v2;
use scanner::ml::persistence::{
    DatasetKind, LABELED_TRADE_SCHEMA_VERSION, RAW_SAMPLE_SCHEMA_VERSION,
};
use scanner::types::Venue;

fn raw_batch(sample_id: &str, route_id: &str) -> RecordBatch {
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
            Arc::new(StringArray::from(vec!["BTC-USDT"])),
            Arc::new(StringArray::from(vec!["BTC-USDT"])),
            Arc::new(StringArray::from(vec![route_id])),
            Arc::new(StringArray::from(vec!["mexc"])),
            Arc::new(StringArray::from(vec!["bingx"])),
            Arc::new(StringArray::from(vec!["FUTURES"])),
            Arc::new(StringArray::from(vec!["FUTURES"])),
        ],
    )
    .expect("valid raw batch")
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
