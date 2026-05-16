//! Operational exchange-connectivity audit for scanner runs.
//!
//! This module is deliberately outside the ML dataset path. It observes the
//! same store/staleness state used by `/api/spread/status` and writes a small
//! run artifact so a collection can be audited after shutdown without any
//! manual sidecar script.

use std::fs::{self, File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use parking_lot::Mutex;
use serde::Serialize;
use tokio::sync::watch;
use tokio::task::JoinHandle;
use tracing::warn;

use crate::book::BookStore;
use crate::config::{Config, KucoinMode};
use crate::discovery::SymbolUniverse;
use crate::obs::Metrics;
use crate::spread::engine::StaleTable;
use crate::spread::staleness::is_stale_for;
use crate::types::{now_ns, SymbolId, Venue};

const DEFAULT_INTERVAL_SECS: u64 = 60;
const DEFAULT_WARMUP_SECS: u64 = 120;

#[derive(Debug, Clone)]
pub struct ExchangeConnectivityPlan {
    interval_secs: u64,
    warmup_secs: u64,
    venues: Vec<VenuePlan>,
}

#[derive(Debug, Clone)]
struct VenuePlan {
    venue: Venue,
    enabled: bool,
    planned_symbols: Vec<SymbolId>,
}

#[derive(Clone)]
pub struct ExchangeConnectivityMonitor {
    inner: Arc<ExchangeConnectivityInner>,
}

struct ExchangeConnectivityInner {
    run_id: String,
    started_ns: u64,
    output_dir: PathBuf,
    plan: ExchangeConnectivityPlan,
    snapshots: Mutex<Vec<ExchangeConnectivitySnapshot>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExchangeConnectivitySnapshot {
    pub run_id: String,
    pub ts_ns: u64,
    pub elapsed_s: f64,
    pub label: String,
    pub venues: Vec<VenueConnectivitySnapshot>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VenueConnectivitySnapshot {
    pub venue: String,
    pub market: String,
    pub enabled: bool,
    pub planned_symbols: u32,
    pub active_symbols: u32,
    pub stale_symbols: u32,
    pub min_book_age_ms: Option<u64>,
    pub max_book_age_ms: Option<u64>,
    pub frame_total_exchange: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExchangeConnectivityReport {
    pub run_id: String,
    pub started_ns: u64,
    pub ended_ns: u64,
    pub output_dir: String,
    pub snapshot_count: usize,
    pub warmup_secs: u64,
    pub status: ConnectivityStatus,
    pub issues: Vec<ConnectivityIssue>,
    pub venues: Vec<VenueConnectivitySummary>,
    pub limitations: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectivityStatus {
    Green,
    P2,
    P1,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectivityIssue {
    pub severity: String,
    pub venue: Option<String>,
    pub market: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VenueConnectivitySummary {
    pub venue: String,
    pub market: String,
    pub enabled: bool,
    pub planned_symbols: u32,
    pub samples_after_warmup: usize,
    pub first_active_symbols: u32,
    pub last_active_symbols: u32,
    pub max_active_symbols: u32,
    pub last_stale_symbols: u32,
    pub max_stale_symbols: u32,
    pub min_book_age_ms: Option<u64>,
    pub max_book_age_ms: Option<u64>,
    pub first_frame_total_exchange: u64,
    pub last_frame_total_exchange: u64,
    pub frame_delta_exchange: u64,
}

pub fn build_plan(cfg: &Config, universe: &SymbolUniverse) -> ExchangeConnectivityPlan {
    let venues = Venue::ALL
        .iter()
        .copied()
        .map(|venue| {
            let planned_symbols = universe.per_venue[venue.idx()]
                .values()
                .copied()
                .collect::<Vec<_>>();
            VenuePlan {
                venue,
                enabled: venue_enabled_for_runtime(cfg, venue),
                planned_symbols,
            }
        })
        .collect::<Vec<_>>();

    ExchangeConnectivityPlan {
        interval_secs: DEFAULT_INTERVAL_SECS,
        warmup_secs: DEFAULT_WARMUP_SECS,
        venues,
    }
}

#[inline]
fn venue_enabled_for_runtime(cfg: &Config, venue: Venue) -> bool {
    if !cfg.venues.is_enabled(venue) {
        return false;
    }
    if matches!(venue, Venue::KucoinSpot | Venue::KucoinFut)
        && cfg.kucoin_mode == KucoinMode::Disabled
    {
        return false;
    }
    true
}

impl ExchangeConnectivityMonitor {
    pub fn new(
        run_id: String,
        started_ns: u64,
        output_dir: PathBuf,
        plan: ExchangeConnectivityPlan,
    ) -> Self {
        Self {
            inner: Arc::new(ExchangeConnectivityInner {
                run_id,
                started_ns,
                output_dir,
                plan,
                snapshots: Mutex::new(Vec::new()),
            }),
        }
    }

    pub fn spawn(
        &self,
        store: Arc<BookStore>,
        stale: Arc<StaleTable>,
        mut shutdown_rx: watch::Receiver<bool>,
    ) -> JoinHandle<()> {
        let monitor = self.clone();
        tokio::spawn(async move {
            let mut interval =
                tokio::time::interval(Duration::from_secs(monitor.inner.plan.interval_secs));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        monitor.record_snapshot("periodic", &store, &stale);
                    }
                    changed = shutdown_rx.changed() => {
                        match changed {
                            Ok(()) if *shutdown_rx.borrow() => break,
                            Ok(()) => {}
                            Err(_) => break,
                        }
                    }
                }
            }
        })
    }

    pub fn record_snapshot(&self, label: impl Into<String>, store: &BookStore, stale: &StaleTable) {
        let snapshot = self.snapshot(label.into(), store, stale);
        if let Err(e) = self.append_live_snapshot(&snapshot) {
            warn!(
                error = %e,
                dir = %self.inner.output_dir.display(),
                "failed to append live exchange connectivity snapshot"
            );
        }
        self.inner.snapshots.lock().push(snapshot);
    }

    pub fn write_report(&self) -> Result<ExchangeConnectivityReport> {
        let snapshots = self.inner.snapshots.lock().clone();
        fs::create_dir_all(&self.inner.output_dir).with_context(|| {
            format!(
                "creating exchange connectivity dir {}",
                self.inner.output_dir.display()
            )
        })?;

        let snapshots_path = self
            .inner
            .output_dir
            .join("exchange_connectivity_snapshots.jsonl");
        write_snapshots_jsonl_atomic(&snapshots_path, &snapshots)?;

        let report = self.build_report(&snapshots);
        let report_path = self
            .inner
            .output_dir
            .join("exchange_connectivity_report.json");
        write_json_atomic(&report_path, &report)?;
        Ok(report)
    }

    pub fn output_dir(&self) -> &Path {
        &self.inner.output_dir
    }

    fn append_live_snapshot(&self, snapshot: &ExchangeConnectivitySnapshot) -> Result<()> {
        fs::create_dir_all(&self.inner.output_dir).with_context(|| {
            format!(
                "creating exchange connectivity dir {}",
                self.inner.output_dir.display()
            )
        })?;
        let path = self
            .inner
            .output_dir
            .join("exchange_connectivity_snapshots.live.jsonl");
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .with_context(|| format!("opening {}", path.display()))?;
        let mut writer = BufWriter::new(file);
        serde_json::to_writer(&mut writer, snapshot)
            .with_context(|| format!("serializing {}", path.display()))?;
        writer.write_all(b"\n")?;
        writer.flush()?;
        Ok(())
    }

    fn snapshot(
        &self,
        label: String,
        store: &BookStore,
        stale: &StaleTable,
    ) -> ExchangeConnectivitySnapshot {
        let now = now_ns();
        let metrics = Metrics::init();
        let venues = self
            .inner
            .plan
            .venues
            .iter()
            .map(|venue_plan| snapshot_venue(venue_plan, store, stale, metrics, now))
            .collect::<Vec<_>>();

        ExchangeConnectivitySnapshot {
            run_id: self.inner.run_id.clone(),
            ts_ns: now,
            elapsed_s: now.saturating_sub(self.inner.started_ns) as f64 / 1_000_000_000.0,
            label,
            venues,
        }
    }

    fn build_report(
        &self,
        snapshots: &[ExchangeConnectivitySnapshot],
    ) -> ExchangeConnectivityReport {
        let ended_ns = snapshots.last().map(|s| s.ts_ns).unwrap_or_else(now_ns);
        let stable = snapshots
            .iter()
            .filter(|s| s.elapsed_s >= self.inner.plan.warmup_secs as f64)
            .collect::<Vec<_>>();
        let analysis_set = if stable.is_empty() {
            snapshots.iter().collect::<Vec<_>>()
        } else {
            stable
        };

        let mut issues = Vec::new();
        if snapshots.is_empty() {
            issues.push(ConnectivityIssue {
                severity: "P1".to_string(),
                venue: None,
                market: None,
                message: "exchange connectivity monitor produced zero snapshots".to_string(),
            });
        } else if analysis_set
            .first()
            .map(|s| s.elapsed_s < self.inner.plan.warmup_secs as f64)
            .unwrap_or(false)
        {
            issues.push(ConnectivityIssue {
                severity: "P2".to_string(),
                venue: None,
                market: None,
                message: format!(
                    "run shorter than warmup window ({}s); report uses warm-up snapshots",
                    self.inner.plan.warmup_secs
                ),
            });
        }

        let mut venue_summaries = Vec::with_capacity(self.inner.plan.venues.len());
        for venue_plan in &self.inner.plan.venues {
            let mut records = Vec::new();
            for snapshot in &analysis_set {
                if let Some(v) = snapshot.venues.iter().find(|v| {
                    v.venue == venue_plan.venue.as_str()
                        && v.market == venue_plan.venue.market().as_str()
                }) {
                    records.push(v);
                }
            }
            let summary = summarize_venue(venue_plan, &records);
            classify_venue(&summary, &mut issues);
            venue_summaries.push(summary);
        }

        let status = if issues.iter().any(|i| i.severity == "P1") {
            ConnectivityStatus::P1
        } else if issues.iter().any(|i| i.severity == "P2") {
            ConnectivityStatus::P2
        } else {
            ConnectivityStatus::Green
        };

        ExchangeConnectivityReport {
            run_id: self.inner.run_id.clone(),
            started_ns: self.inner.started_ns,
            ended_ns,
            output_dir: self.inner.output_dir.display().to_string(),
            snapshot_count: snapshots.len(),
            warmup_secs: self.inner.plan.warmup_secs,
            status,
            issues,
            venues: venue_summaries,
            limitations: vec![
                "plannedSymbols is the discovered subscription plan per venue, not an exchange ACK count".to_string(),
                "frameTotalExchange comes from the existing Prometheus venue label and is exchange-level; spot/futures markets share the same exchange counter label".to_string(),
                "this report is operational-only and is intentionally not part of raw/accepted/labeled ML datasets".to_string(),
            ],
        }
    }
}

fn snapshot_venue(
    venue_plan: &VenuePlan,
    store: &BookStore,
    stale: &StaleTable,
    metrics: &Metrics,
    now: u64,
) -> VenueConnectivitySnapshot {
    let mut active_symbols = 0u32;
    let mut stale_symbols = 0u32;
    let mut min_book_age_ms: Option<u64> = None;
    let mut max_book_age_ms: Option<u64> = None;

    for &symbol_id in &venue_plan.planned_symbols {
        let slot = store.slot(venue_plan.venue, symbol_id);
        if slot.is_uninitialized() {
            continue;
        }
        active_symbols = active_symbols.saturating_add(1);
        let cell = stale.cell(venue_plan.venue, symbol_id);
        let age_ms = cell.age_ms(now);
        if is_stale_for(venue_plan.venue, cell, now) {
            stale_symbols = stale_symbols.saturating_add(1);
        }
        min_book_age_ms = Some(min_book_age_ms.map_or(age_ms, |current| current.min(age_ms)));
        max_book_age_ms = Some(max_book_age_ms.map_or(age_ms, |current| current.max(age_ms)));
    }

    VenueConnectivitySnapshot {
        venue: venue_plan.venue.as_str().to_string(),
        market: venue_plan.venue.market().as_str().to_string(),
        enabled: venue_plan.enabled,
        planned_symbols: venue_plan.planned_symbols.len().min(u32::MAX as usize) as u32,
        active_symbols,
        stale_symbols,
        min_book_age_ms,
        max_book_age_ms,
        frame_total_exchange: metrics
            .ws_frames_total
            .with_label_values(&[venue_plan.venue.as_str()])
            .get(),
    }
}

fn summarize_venue(
    venue_plan: &VenuePlan,
    records: &[&VenueConnectivitySnapshot],
) -> VenueConnectivitySummary {
    let first = records.first().copied();
    let last = records.last().copied();
    let max_active_symbols = records.iter().map(|r| r.active_symbols).max().unwrap_or(0);
    let max_stale_symbols = records.iter().map(|r| r.stale_symbols).max().unwrap_or(0);
    let min_book_age_ms = records.iter().filter_map(|r| r.min_book_age_ms).min();
    let max_book_age_ms = records.iter().filter_map(|r| r.max_book_age_ms).max();
    let first_frame_total_exchange = first.map(|r| r.frame_total_exchange).unwrap_or(0);
    let last_frame_total_exchange = last.map(|r| r.frame_total_exchange).unwrap_or(0);

    VenueConnectivitySummary {
        venue: venue_plan.venue.as_str().to_string(),
        market: venue_plan.venue.market().as_str().to_string(),
        enabled: venue_plan.enabled,
        planned_symbols: venue_plan.planned_symbols.len().min(u32::MAX as usize) as u32,
        samples_after_warmup: records.len(),
        first_active_symbols: first.map(|r| r.active_symbols).unwrap_or(0),
        last_active_symbols: last.map(|r| r.active_symbols).unwrap_or(0),
        max_active_symbols,
        last_stale_symbols: last.map(|r| r.stale_symbols).unwrap_or(0),
        max_stale_symbols,
        min_book_age_ms,
        max_book_age_ms,
        first_frame_total_exchange,
        last_frame_total_exchange,
        frame_delta_exchange: last_frame_total_exchange.saturating_sub(first_frame_total_exchange),
    }
}

fn classify_venue(summary: &VenueConnectivitySummary, issues: &mut Vec<ConnectivityIssue>) {
    if !summary.enabled {
        return;
    }
    let venue = Some(summary.venue.clone());
    let market = Some(summary.market.clone());

    if summary.planned_symbols == 0 {
        issues.push(ConnectivityIssue {
            severity: "P2".to_string(),
            venue,
            market,
            message: "enabled venue has zero planned symbols after discovery".to_string(),
        });
        return;
    }
    if summary.samples_after_warmup == 0 {
        issues.push(ConnectivityIssue {
            severity: "P2".to_string(),
            venue,
            market,
            message: "no post-warmup snapshots available for this venue".to_string(),
        });
        return;
    }
    if summary.max_active_symbols == 0 {
        issues.push(ConnectivityIssue {
            severity: "P1".to_string(),
            venue,
            market,
            message: "enabled venue never produced an active book after warmup".to_string(),
        });
        return;
    }
    if summary.last_active_symbols == 0 {
        issues.push(ConnectivityIssue {
            severity: "P1".to_string(),
            venue,
            market,
            message:
                "enabled venue had active books during the run but ended with zero active books"
                    .to_string(),
        });
        return;
    }
    if summary.last_stale_symbols >= summary.last_active_symbols && summary.last_active_symbols > 0
    {
        issues.push(ConnectivityIssue {
            severity: "P2".to_string(),
            venue,
            market,
            message: "all active books for this venue were stale in the final stable snapshot"
                .to_string(),
        });
    }
}

fn write_snapshots_jsonl_atomic(
    path: &Path,
    snapshots: &[ExchangeConnectivitySnapshot],
) -> Result<()> {
    let tmp = path.with_extension("jsonl.tmp");
    {
        let file = File::create(&tmp).with_context(|| format!("creating {}", tmp.display()))?;
        let mut writer = BufWriter::new(file);
        for snapshot in snapshots {
            serde_json::to_writer(&mut writer, snapshot)
                .with_context(|| format!("serializing {}", tmp.display()))?;
            writer.write_all(b"\n")?;
        }
        writer.flush()?;
    }
    fs::rename(&tmp, path)
        .with_context(|| format!("publishing {} -> {}", tmp.display(), path.display()))?;
    Ok(())
}

fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<()> {
    let tmp = path.with_extension("json.tmp");
    {
        let file = File::create(&tmp).with_context(|| format!("creating {}", tmp.display()))?;
        let mut writer = BufWriter::new(file);
        serde_json::to_writer_pretty(&mut writer, value)
            .with_context(|| format!("serializing {}", tmp.display()))?;
        writer.write_all(b"\n")?;
        writer.flush()?;
    }
    fs::rename(&tmp, path)
        .with_context(|| format!("publishing {} -> {}", tmp.display(), path.display()))?;
    Ok(())
}

pub async fn stop_monitor_and_write_report(
    monitor: &ExchangeConnectivityMonitor,
    shutdown_tx: watch::Sender<bool>,
    task: JoinHandle<()>,
    store: &BookStore,
    stale: &StaleTable,
) -> Result<ExchangeConnectivityReport> {
    monitor.record_snapshot("pre_shutdown", store, stale);
    let _ = shutdown_tx.send(true);
    if let Err(e) = task.await {
        if !e.is_cancelled() {
            warn!(error = %e, "exchange connectivity monitor task failed during shutdown");
        }
    }
    monitor.write_report()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::VenueToggles;
    use crate::discovery::{SymbolUniverse, VenueSymbol};
    use crate::types::{CanonicalPair, Market};

    fn venue_symbol(venue: Venue, raw: &str, base: &str) -> VenueSymbol {
        VenueSymbol {
            venue,
            raw: raw.to_string(),
            canonical: CanonicalPair::new(base, "USDT", Market::Spot),
        }
    }

    #[test]
    fn plan_respects_kucoin_disabled_runtime_policy() {
        let mut per_venue = (0..crate::types::VENUE_COUNT)
            .map(|_| Vec::new())
            .collect::<Vec<_>>();
        per_venue[Venue::KucoinSpot.idx()].push(venue_symbol(Venue::KucoinSpot, "BTC-USDT", "BTC"));
        per_venue[Venue::BinanceSpot.idx()].push(venue_symbol(
            Venue::BinanceSpot,
            "BTCUSDT",
            "BTC",
        ));
        let universe = SymbolUniverse::from_venue_symbols(per_venue);
        let mut cfg = Config::default_in_memory();
        cfg.kucoin_mode = KucoinMode::Disabled;

        let plan = build_plan(&cfg, &universe);
        let kucoin = plan
            .venues
            .iter()
            .find(|v| v.venue == Venue::KucoinSpot)
            .expect("kucoin spot plan");
        assert!(!kucoin.enabled);
        assert_eq!(kucoin.planned_symbols.len(), 1);
    }

    #[test]
    fn summary_flags_enabled_venue_without_active_books() {
        let plan = ExchangeConnectivityPlan {
            interval_secs: 60,
            warmup_secs: 120,
            venues: vec![VenuePlan {
                venue: Venue::BinanceSpot,
                enabled: true,
                planned_symbols: vec![SymbolId(0)],
            }],
        };
        let monitor = ExchangeConnectivityMonitor::new(
            "test-run".to_string(),
            1_000_000_000,
            PathBuf::from("target/test-connectivity"),
            plan,
        );
        let snapshots = vec![ExchangeConnectivitySnapshot {
            run_id: "test-run".to_string(),
            ts_ns: 130_000_000_000,
            elapsed_s: 129.0,
            label: "periodic".to_string(),
            venues: vec![VenueConnectivitySnapshot {
                venue: "binance".to_string(),
                market: "SPOT".to_string(),
                enabled: true,
                planned_symbols: 1,
                active_symbols: 0,
                stale_symbols: 0,
                min_book_age_ms: None,
                max_book_age_ms: None,
                frame_total_exchange: 0,
            }],
        }];

        let report = monitor.build_report(&snapshots);
        assert_eq!(report.status, ConnectivityStatus::P1);
        assert!(report
            .issues
            .iter()
            .any(|issue| issue.message.contains("never produced an active book")));
    }

    #[test]
    fn disabled_venue_is_not_flagged() {
        let plan = ExchangeConnectivityPlan {
            interval_secs: 60,
            warmup_secs: 120,
            venues: vec![VenuePlan {
                venue: Venue::KucoinFut,
                enabled: false,
                planned_symbols: vec![SymbolId(0)],
            }],
        };
        let monitor = ExchangeConnectivityMonitor::new(
            "test-run".to_string(),
            1_000_000_000,
            PathBuf::from("target/test-connectivity"),
            plan,
        );
        let report = monitor.build_report(&[]);
        assert_eq!(report.status, ConnectivityStatus::P1);

        let mut cfg = Config::default_in_memory();
        cfg.venues = VenueToggles {
            kucoin_fut: false,
            ..VenueToggles::default()
        };
        assert!(!venue_enabled_for_runtime(&cfg, Venue::KucoinFut));
    }
}
