//! Observability: Prometheus counters + HdrHistogram latency tracking.
//!
//! Follows PhD#6 recommendations:
//! - Counters: prometheus crate (tikv/rust-prometheus) with static metrics.
//! - Histograms: HdrHistogram per-VENUE (11 instances), not per-symbol.
//! - Custom Prometheus collector converts HdrHistogram snapshots into summary
//!   format at scrape time (no hot-path lock).

use hdrhistogram::Histogram;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use prometheus::{IntCounter, IntCounterVec, Opts, Registry};

use crate::types::{Venue, VENUE_COUNT};

/// Global metrics registry + shared instruments.
pub struct Metrics {
    pub registry: Registry,
    pub ws_frames_total: IntCounterVec, // labels: venue
    pub stale_drops_total: IntCounterVec,
    pub asym_drops_total: IntCounterVec,
    pub opportunities_total: IntCounter,
    pub ml_dataset_compactions_total: IntCounterVec,
    pub ml_dataset_compaction_rows_total: IntCounterVec,
    pub ml_dataset_compaction_bytes_total: IntCounterVec,
    /// Per-venue ingest-latency histograms (frame decode + book write), ns.
    pub ingest_hist: [Mutex<Histogram<u64>>; VENUE_COUNT],
    /// Spread-engine scan latency histogram, ns. Nome Prometheus legado:
    /// `scanner_spread_cycle_ns_p99`.
    pub cycle_hist: Mutex<Histogram<u64>>,
    /// Full spread loop processing latency, excluding scheduler sleep, ns.
    pub full_cycle_hist: Mutex<Histogram<u64>>,
    /// Foreground ML pass over UI opportunities, ns.
    pub ml_foreground_hist: Mutex<Histogram<u64>>,
    /// Background ML/cache pass over below-threshold observations, ns.
    pub ml_background_hist: Mutex<Histogram<u64>>,
}

static METRICS: OnceCell<Metrics> = OnceCell::new();

impl Metrics {
    pub fn init() -> &'static Metrics {
        METRICS.get_or_init(|| {
            let registry = Registry::new();
            let ws_frames_total = IntCounterVec::new(
                Opts::new("scanner_ws_frames_total", "WebSocket frames ingested"),
                &["venue"],
            )
            .expect("register ws_frames_total");
            let stale_drops_total = IntCounterVec::new(
                Opts::new("scanner_stale_drops_total", "Stale-frame drops"),
                &["venue"],
            )
            .expect("register stale_drops_total");
            let asym_drops_total = IntCounterVec::new(
                Opts::new("scanner_asymmetry_drops_total", "Asymmetric-feed drops"),
                &["venue"],
            )
            .expect("register asym_drops_total");
            let opportunities_total = IntCounter::new(
                "scanner_opportunities_total",
                "Opportunities emitted to clients",
            )
            .expect("register opportunities_total");
            let ml_dataset_compactions_total = IntCounterVec::new(
                Opts::new(
                    "ml_dataset_compactions_total",
                    "ML dataset compactions by dataset and status",
                ),
                &["dataset", "status"],
            )
            .expect("register ml_dataset_compactions_total");
            let ml_dataset_compaction_rows_total = IntCounterVec::new(
                Opts::new(
                    "ml_dataset_compaction_rows_total",
                    "Rows validated during ML dataset compaction by dataset and status",
                ),
                &["dataset", "status"],
            )
            .expect("register ml_dataset_compaction_rows_total");
            let ml_dataset_compaction_bytes_total = IntCounterVec::new(
                Opts::new(
                    "ml_dataset_compaction_bytes_total",
                    "Bytes observed during ML dataset compaction by dataset, direction and status",
                ),
                &["dataset", "direction", "status"],
            )
            .expect("register ml_dataset_compaction_bytes_total");

            registry
                .register(Box::new(ws_frames_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(stale_drops_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(asym_drops_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(opportunities_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_dataset_compactions_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_dataset_compaction_rows_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_dataset_compaction_bytes_total.clone()))
                .expect("reg");

            for dataset in &["raw_samples", "accepted_samples", "labeled_trades"] {
                for status in &["success", "failure"] {
                    ml_dataset_compactions_total
                        .with_label_values(&[dataset, status])
                        .inc_by(0);
                    ml_dataset_compaction_rows_total
                        .with_label_values(&[dataset, status])
                        .inc_by(0);
                    for direction in &["source_jsonl", "parquet"] {
                        ml_dataset_compaction_bytes_total
                            .with_label_values(&[dataset, direction, status])
                            .inc_by(0);
                    }
                }
            }

            // HdrHistogram: track 1ns..10s with 3 sig figs. Per-venue instance
            // so recording is contention-scoped to each adapter task.
            let ingest_hist: [Mutex<Histogram<u64>>; VENUE_COUNT] =
                std::array::from_fn(|_| Mutex::new(new_hist()));
            let cycle_hist = Mutex::new(new_hist());
            let full_cycle_hist = Mutex::new(new_hist());
            let ml_foreground_hist = Mutex::new(new_hist());
            let ml_background_hist = Mutex::new(new_hist());

            Metrics {
                registry,
                ws_frames_total,
                stale_drops_total,
                asym_drops_total,
                opportunities_total,
                ml_dataset_compactions_total,
                ml_dataset_compaction_rows_total,
                ml_dataset_compaction_bytes_total,
                ingest_hist,
                cycle_hist,
                full_cycle_hist,
                ml_foreground_hist,
                ml_background_hist,
            }
        })
    }

    #[inline]
    pub fn record_ingest(&self, venue: Venue, ns: u64) {
        if let Some(mut h) = self.ingest_hist[venue.idx()].try_lock() {
            // Bounded by histogram range; saturate rather than panic.
            let v = ns.min(10_000_000_000);
            let _ = h.record(v.max(1));
        }
        self.ws_frames_total
            .with_label_values(&[venue.as_str()])
            .inc();
    }

    #[inline]
    pub fn record_cycle(&self, ns: u64) {
        record_hist(&self.cycle_hist, ns);
    }

    #[inline]
    pub fn record_full_cycle(&self, ns: u64) {
        record_hist(&self.full_cycle_hist, ns);
    }

    #[inline]
    pub fn record_ml_foreground(&self, ns: u64) {
        record_hist(&self.ml_foreground_hist, ns);
    }

    #[inline]
    pub fn record_ml_background(&self, ns: u64) {
        record_hist(&self.ml_background_hist, ns);
    }

    #[inline]
    pub fn record_ml_dataset_compaction(
        &self,
        dataset: &'static str,
        status: &'static str,
        rows: u64,
        source_bytes: u64,
        parquet_bytes: u64,
    ) {
        self.ml_dataset_compactions_total
            .with_label_values(&[dataset, status])
            .inc();
        self.ml_dataset_compaction_rows_total
            .with_label_values(&[dataset, status])
            .inc_by(rows);
        self.ml_dataset_compaction_bytes_total
            .with_label_values(&[dataset, "source_jsonl", status])
            .inc_by(source_bytes);
        self.ml_dataset_compaction_bytes_total
            .with_label_values(&[dataset, "parquet", status])
            .inc_by(parquet_bytes);
    }
}

#[inline]
fn record_hist(hist: &Mutex<Histogram<u64>>, ns: u64) {
    if let Some(mut h) = hist.try_lock() {
        let v = ns.min(10_000_000_000);
        let _ = h.record(v.max(1));
    }
}

fn new_hist() -> Histogram<u64> {
    // 1 ns to 10 s, 3 significant figures.
    Histogram::<u64>::new_with_bounds(1, 10_000_000_000, 3).expect("hdrhist")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_is_idempotent() {
        let a = Metrics::init();
        let b = Metrics::init();
        assert!(std::ptr::eq(a, b));
    }

    #[test]
    fn record_ingest_increments_counter() {
        let m = Metrics::init();
        let before = m
            .ws_frames_total
            .with_label_values(&[Venue::BinanceSpot.as_str()])
            .get();
        m.record_ingest(Venue::BinanceSpot, 250);
        let after = m
            .ws_frames_total
            .with_label_values(&[Venue::BinanceSpot.as_str()])
            .get();
        assert_eq!(after, before + 1);
    }

    #[test]
    fn record_ml_dataset_compaction_increments_counter() {
        let m = Metrics::init();
        let before = m
            .ml_dataset_compactions_total
            .with_label_values(&["raw_samples", "success"])
            .get();
        m.record_ml_dataset_compaction("raw_samples", "success", 3, 10, 4);
        let after = m
            .ml_dataset_compactions_total
            .with_label_values(&["raw_samples", "success"])
            .get();
        assert_eq!(after, before + 1);
    }
}
