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
use prometheus::{IntCounter, IntCounterVec, IntGauge, IntGaugeVec, Opts, Registry};

use crate::types::{Venue, VENUE_COUNT};

/// Global metrics registry + shared instruments.
pub struct Metrics {
    pub registry: Registry,
    pub ws_frames_total: IntCounterVec, // labels: venue
    pub stale_drops_total: IntCounterVec,
    pub asym_drops_total: IntCounterVec,
    pub opportunities_total: IntCounter,
    pub hist_record_dropped_total: IntCounterVec,
    pub ml_dataset_compactions_total: IntCounterVec,
    pub ml_dataset_compaction_rows_total: IntCounterVec,
    pub ml_dataset_compaction_bytes_total: IntCounterVec,
    pub ml_dataset_compaction_active_current: IntGaugeVec,
    pub ml_dataset_compaction_waiting_current: IntGaugeVec,
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
    /// Batches de observações aguardando processamento ML assíncrono.
    pub ml_cycle_queue_depth_current: IntGauge,
    /// Eventos de rota aguardando processamento ML assíncrono.
    pub ml_cycle_queue_events_current: IntGauge,
    /// Batch ML atualmente em processamento pelo worker.
    pub ml_cycle_batch_inflight_current: IntGauge,
    /// Eventos de rota atualmente em processamento pelo worker ML.
    pub ml_cycle_events_inflight_current: IntGauge,
    /// Batches ML aceitos pela fila assíncrona.
    pub ml_cycle_batches_enqueued_total: IntCounter,
    /// Batches ML processados pelo worker assíncrono.
    pub ml_cycle_batches_processed_total: IntCounter,
    /// Eventos de rota aceitos pela fila assíncrona.
    pub ml_cycle_events_enqueued_total: IntCounter,
    /// Eventos de rota processados pelo worker assíncrono.
    pub ml_cycle_events_processed_total: IntCounter,
    /// Tentativas de enqueue rejeitadas por fila ML cheia.
    pub ml_cycle_queue_full_total: IntCounter,
    /// Last full spread loop processing latency, excluding scheduler sleep, ns.
    pub full_cycle_last_ns: IntGauge,
    /// Max full spread loop processing latency observed in this process, ns.
    pub full_cycle_max_ns: IntGauge,
    /// Configured full-cycle latency budget, ns.
    pub full_cycle_budget_ns: IntGauge,
    /// Full cycles whose processing latency exceeded the configured budget.
    pub full_cycle_over_budget_total: IntCounter,
    /// Last background ML/cache pass latency, ns.
    pub ml_background_last_ns: IntGauge,
    /// Max background ML/cache pass latency observed in this process, ns.
    pub ml_background_max_ns: IntGauge,
    /// Background ML/cache passes whose latency exceeded the configured budget.
    pub ml_background_over_budget_total: IntCounter,
    /// Current process working set, bytes. Populated on scrape when available.
    pub process_working_set_bytes: IntGauge,
    /// Current process private/commit memory, bytes. Populated on scrape when available.
    pub process_private_bytes: IntGauge,
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
            let hist_record_dropped_total = IntCounterVec::new(
                Opts::new(
                    "scanner_hist_record_dropped_total",
                    "Latency samples skipped because the HdrHistogram lock was busy",
                ),
                &["histogram"],
            )
            .expect("register hist_record_dropped_total");
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
            let ml_dataset_compaction_active_current = IntGaugeVec::new(
                Opts::new(
                    "ml_dataset_compaction_active_current",
                    "ML dataset compactions currently running under the global compaction gate",
                ),
                &["dataset"],
            )
            .expect("register ml_dataset_compaction_active_current");
            let ml_dataset_compaction_waiting_current = IntGaugeVec::new(
                Opts::new(
                    "ml_dataset_compaction_waiting_current",
                    "ML dataset compactions waiting for the global compaction gate",
                ),
                &["dataset"],
            )
            .expect("register ml_dataset_compaction_waiting_current");
            let full_cycle_last_ns = IntGauge::new(
                "scanner_spread_full_cycle_last_ns",
                "Last full spread loop processing latency, excluding scheduler sleep, ns",
            )
            .expect("register full_cycle_last_ns");
            let full_cycle_max_ns = IntGauge::new(
                "scanner_spread_full_cycle_max_ns",
                "Max full spread loop processing latency observed in this process, ns",
            )
            .expect("register full_cycle_max_ns");
            let full_cycle_budget_ns = IntGauge::new(
                "scanner_spread_full_cycle_budget_ns",
                "Configured full spread loop processing budget, ns",
            )
            .expect("register full_cycle_budget_ns");
            let full_cycle_over_budget_total = IntCounter::new(
                "scanner_spread_full_cycle_over_budget_total",
                "Full spread loop cycles whose processing latency exceeded budget",
            )
            .expect("register full_cycle_over_budget_total");
            let ml_background_last_ns = IntGauge::new(
                "scanner_ml_background_last_ns",
                "Last background ML/cache pass latency, ns",
            )
            .expect("register ml_background_last_ns");
            let ml_background_max_ns = IntGauge::new(
                "scanner_ml_background_max_ns",
                "Max background ML/cache pass latency observed in this process, ns",
            )
            .expect("register ml_background_max_ns");
            let ml_background_over_budget_total = IntCounter::new(
                "scanner_ml_background_over_budget_total",
                "Background ML/cache passes whose latency exceeded budget",
            )
            .expect("register ml_background_over_budget_total");
            let ml_cycle_queue_depth_current = IntGauge::new(
                "scanner_ml_cycle_queue_depth_current",
                "ML cycle batches waiting in the asynchronous processing queue",
            )
            .expect("register ml_cycle_queue_depth_current");
            let ml_cycle_queue_events_current = IntGauge::new(
                "scanner_ml_cycle_queue_events_current",
                "Route observations waiting in the asynchronous ML processing queue",
            )
            .expect("register ml_cycle_queue_events_current");
            let ml_cycle_batch_inflight_current = IntGauge::new(
                "scanner_ml_cycle_batch_inflight_current",
                "ML cycle batch currently being processed by the asynchronous worker",
            )
            .expect("register ml_cycle_batch_inflight_current");
            let ml_cycle_events_inflight_current = IntGauge::new(
                "scanner_ml_cycle_events_inflight_current",
                "Route observations currently being processed by the asynchronous ML worker",
            )
            .expect("register ml_cycle_events_inflight_current");
            let ml_cycle_batches_enqueued_total = IntCounter::new(
                "scanner_ml_cycle_batches_enqueued_total",
                "ML cycle batches enqueued for asynchronous processing",
            )
            .expect("register ml_cycle_batches_enqueued_total");
            let ml_cycle_batches_processed_total = IntCounter::new(
                "scanner_ml_cycle_batches_processed_total",
                "ML cycle batches processed by the asynchronous worker",
            )
            .expect("register ml_cycle_batches_processed_total");
            let ml_cycle_events_enqueued_total = IntCounter::new(
                "scanner_ml_cycle_events_enqueued_total",
                "Route observations enqueued for asynchronous ML processing",
            )
            .expect("register ml_cycle_events_enqueued_total");
            let ml_cycle_events_processed_total = IntCounter::new(
                "scanner_ml_cycle_events_processed_total",
                "Route observations processed by the asynchronous ML worker",
            )
            .expect("register ml_cycle_events_processed_total");
            let ml_cycle_queue_full_total = IntCounter::new(
                "scanner_ml_cycle_queue_full_total",
                "ML cycle enqueue attempts rejected because the async queue was full",
            )
            .expect("register ml_cycle_queue_full_total");
            let process_working_set_bytes = IntGauge::new(
                "scanner_process_working_set_bytes",
                "Current process working set, bytes",
            )
            .expect("register process_working_set_bytes");
            let process_private_bytes = IntGauge::new(
                "scanner_process_private_bytes",
                "Current process private/commit memory, bytes",
            )
            .expect("register process_private_bytes");

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
                .register(Box::new(hist_record_dropped_total.clone()))
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
            registry
                .register(Box::new(ml_dataset_compaction_active_current.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_dataset_compaction_waiting_current.clone()))
                .expect("reg");
            registry
                .register(Box::new(full_cycle_last_ns.clone()))
                .expect("reg");
            registry
                .register(Box::new(full_cycle_max_ns.clone()))
                .expect("reg");
            registry
                .register(Box::new(full_cycle_budget_ns.clone()))
                .expect("reg");
            registry
                .register(Box::new(full_cycle_over_budget_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_background_last_ns.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_background_max_ns.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_background_over_budget_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_queue_depth_current.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_queue_events_current.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_batch_inflight_current.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_events_inflight_current.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_batches_enqueued_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_batches_processed_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_events_enqueued_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_events_processed_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(ml_cycle_queue_full_total.clone()))
                .expect("reg");
            registry
                .register(Box::new(process_working_set_bytes.clone()))
                .expect("reg");
            registry
                .register(Box::new(process_private_bytes.clone()))
                .expect("reg");

            for dataset in &["raw_samples", "accepted_samples", "labeled_trades"] {
                ml_dataset_compaction_active_current
                    .with_label_values(&[dataset])
                    .set(0);
                ml_dataset_compaction_waiting_current
                    .with_label_values(&[dataset])
                    .set(0);
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
            for histogram in &[
                "ingest",
                "spread_cycle",
                "spread_full_cycle",
                "ml_foreground",
                "ml_background",
            ] {
                hist_record_dropped_total
                    .with_label_values(&[histogram])
                    .inc_by(0);
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
                hist_record_dropped_total,
                ml_dataset_compactions_total,
                ml_dataset_compaction_rows_total,
                ml_dataset_compaction_bytes_total,
                ml_dataset_compaction_active_current,
                ml_dataset_compaction_waiting_current,
                ingest_hist,
                cycle_hist,
                full_cycle_hist,
                ml_foreground_hist,
                ml_background_hist,
                ml_cycle_queue_depth_current,
                ml_cycle_queue_events_current,
                ml_cycle_batch_inflight_current,
                ml_cycle_events_inflight_current,
                ml_cycle_batches_enqueued_total,
                ml_cycle_batches_processed_total,
                ml_cycle_events_enqueued_total,
                ml_cycle_events_processed_total,
                ml_cycle_queue_full_total,
                full_cycle_last_ns,
                full_cycle_max_ns,
                full_cycle_budget_ns,
                full_cycle_over_budget_total,
                ml_background_last_ns,
                ml_background_max_ns,
                ml_background_over_budget_total,
                process_working_set_bytes,
                process_private_bytes,
            }
        })
    }

    #[inline]
    pub fn record_ingest(&self, venue: Venue, ns: u64) {
        record_hist(
            &self.ingest_hist[venue.idx()],
            ns,
            &self.hist_record_dropped_total,
            "ingest",
        );
        self.ws_frames_total
            .with_label_values(&[venue.as_str()])
            .inc();
    }

    #[inline]
    pub fn record_cycle(&self, ns: u64) {
        record_hist(
            &self.cycle_hist,
            ns,
            &self.hist_record_dropped_total,
            "spread_cycle",
        );
    }

    #[inline]
    pub fn record_full_cycle(&self, ns: u64) {
        self.record_full_cycle_with_budget(ns, 0);
    }

    #[inline]
    pub fn record_full_cycle_with_budget(&self, ns: u64, budget_ns: u64) {
        record_hist(
            &self.full_cycle_hist,
            ns,
            &self.hist_record_dropped_total,
            "spread_full_cycle",
        );
        record_last_max(&self.full_cycle_last_ns, &self.full_cycle_max_ns, ns);
        self.full_cycle_budget_ns.set(gauge_value(budget_ns));
        if budget_ns > 0 && ns > budget_ns {
            self.full_cycle_over_budget_total.inc();
        }
    }

    #[inline]
    pub fn record_ml_foreground(&self, ns: u64) {
        record_hist(
            &self.ml_foreground_hist,
            ns,
            &self.hist_record_dropped_total,
            "ml_foreground",
        );
    }

    #[inline]
    pub fn record_ml_background(&self, ns: u64) {
        self.record_ml_background_with_budget(ns, 0);
    }

    #[inline]
    pub fn record_ml_background_with_budget(&self, ns: u64, budget_ns: u64) {
        record_hist(
            &self.ml_background_hist,
            ns,
            &self.hist_record_dropped_total,
            "ml_background",
        );
        record_last_max(&self.ml_background_last_ns, &self.ml_background_max_ns, ns);
        if budget_ns > 0 && ns > budget_ns {
            self.ml_background_over_budget_total.inc();
        }
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

    pub fn refresh_process_memory(&self) {
        if let Some(snapshot) = process_memory_snapshot() {
            self.process_working_set_bytes
                .set(gauge_value(snapshot.working_set_bytes));
            self.process_private_bytes
                .set(gauge_value(snapshot.private_bytes));
        }
    }
}

#[inline]
fn record_hist(hist: &Mutex<Histogram<u64>>, ns: u64, dropped: &IntCounterVec, name: &str) {
    if let Some(mut h) = hist.try_lock() {
        let v = ns.min(10_000_000_000);
        let _ = h.record(v.max(1));
    } else {
        dropped.with_label_values(&[name]).inc();
    }
}

#[inline]
fn record_last_max(last: &IntGauge, max: &IntGauge, ns: u64) {
    let value = gauge_value(ns);
    last.set(value);
    if value > max.get() {
        max.set(value);
    }
}

#[inline]
fn gauge_value(value: u64) -> i64 {
    value.min(i64::MAX as u64) as i64
}

fn new_hist() -> Histogram<u64> {
    // 1 ns to 10 s, 3 significant figures.
    Histogram::<u64>::new_with_bounds(1, 10_000_000_000, 3).expect("hdrhist")
}

#[derive(Debug, Clone, Copy)]
struct ProcessMemorySnapshot {
    working_set_bytes: u64,
    private_bytes: u64,
}

#[cfg(windows)]
fn process_memory_snapshot() -> Option<ProcessMemorySnapshot> {
    windows_process_memory::snapshot()
}

#[cfg(not(windows))]
fn process_memory_snapshot() -> Option<ProcessMemorySnapshot> {
    None
}

#[cfg(windows)]
mod windows_process_memory {
    use super::ProcessMemorySnapshot;
    use std::ffi::c_void;
    use std::mem::{size_of, zeroed};

    #[repr(C)]
    struct ProcessMemoryCounters {
        cb: u32,
        page_fault_count: u32,
        peak_working_set_size: usize,
        working_set_size: usize,
        quota_peak_paged_pool_usage: usize,
        quota_paged_pool_usage: usize,
        quota_peak_non_paged_pool_usage: usize,
        quota_non_paged_pool_usage: usize,
        pagefile_usage: usize,
        peak_pagefile_usage: usize,
    }

    #[link(name = "psapi")]
    unsafe extern "system" {
        fn GetProcessMemoryInfo(
            process: *mut c_void,
            counters: *mut ProcessMemoryCounters,
            size: u32,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn GetCurrentProcess() -> *mut c_void;
    }

    pub(super) fn snapshot() -> Option<ProcessMemorySnapshot> {
        unsafe {
            let mut counters: ProcessMemoryCounters = zeroed();
            counters.cb = size_of::<ProcessMemoryCounters>() as u32;
            let ok = GetProcessMemoryInfo(GetCurrentProcess(), &mut counters, counters.cb);
            if ok == 0 {
                return None;
            }
            Some(ProcessMemorySnapshot {
                working_set_bytes: counters.working_set_size as u64,
                private_bytes: counters.pagefile_usage as u64,
            })
        }
    }
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

    #[test]
    fn record_full_cycle_tracks_budget_and_max() {
        let m = Metrics::init();
        let before = m.full_cycle_over_budget_total.get();
        m.record_full_cycle_with_budget(100, 150);
        assert_eq!(m.full_cycle_last_ns.get(), 100);
        assert!(m.full_cycle_max_ns.get() >= 100);
        assert_eq!(m.full_cycle_over_budget_total.get(), before);

        m.record_full_cycle_with_budget(200, 150);
        assert_eq!(m.full_cycle_last_ns.get(), 200);
        assert!(m.full_cycle_max_ns.get() >= 200);
        assert_eq!(m.full_cycle_over_budget_total.get(), before + 1);
    }

    #[test]
    fn record_ml_background_tracks_budget_and_max() {
        let m = Metrics::init();
        let before = m.ml_background_over_budget_total.get();
        m.record_ml_background_with_budget(90, 100);
        assert_eq!(m.ml_background_last_ns.get(), 90);
        assert!(m.ml_background_max_ns.get() >= 90);
        assert_eq!(m.ml_background_over_budget_total.get(), before);

        m.record_ml_background_with_budget(120, 100);
        assert_eq!(m.ml_background_last_ns.get(), 120);
        assert!(m.ml_background_max_ns.get() >= 120);
        assert_eq!(m.ml_background_over_budget_total.get(), before + 1);
    }
}
