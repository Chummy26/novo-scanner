pub mod adapter;
pub mod book;
pub mod broadcast;
pub mod config;
pub mod decode;
pub mod discovery;
pub mod error;
pub mod ml;
pub mod normalize;
pub mod obs;
pub mod spread;
pub mod types;

pub use config::Config;
pub use error::{Error, Result};

use std::path::PathBuf;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;

use tracing::{info, warn};

use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::broadcast::server::BroadcastState;
use crate::broadcast::VolStore;
use crate::discovery::SymbolUniverse;
use crate::ml::baseline::{BaselineA3, BaselineConfig};
use crate::ml::broadcast::RecommendationBroadcaster;
use crate::ml::contract::RouteId;
use crate::ml::feature_store::HotQueryCache;
use crate::ml::metrics::MlPrometheusMetrics;
use crate::ml::persistence::{
    compact_existing_jsonl_in_tree, write_run_audit, DatasetKind, JsonlWriter, LabelResolver,
    LabelShutdownAudit, LabeledJsonlWriter, LabeledWriterConfig, OperationalAudit,
    ParquetCompactionConfig, RawSampleWriter, RawWriterConfig, ResolverConfig, RouteDecimator,
    RouteRanking, RunAuditInput, RunAuditVerdict, WriterAudit, WriterConfig, WriterHandle,
    WriterSendError,
};
use crate::ml::retention::{
    sweep_datasets, DatasetRetentionPolicy, ManagedDataset, ModelWindowPolicy,
};
use crate::ml::serving::MlServer;
use crate::ml::trigger::SamplingTrigger;
use crate::spread::engine::{
    new_stale_table, scan_once_with_observer, Opportunity, RouteObservation, ScanCounters,
    StaleTable,
};
use crate::types::now_ns;

const ML_CYCLE_CHANNEL_CAPACITY: usize = 2;
const ML_CYCLE_BUFFER_RECYCLE_CAPACITY: usize = 4;
const ML_CYCLE_MAX_SHARDS: usize = 32;

#[inline]
fn should_mark_sample_recommended(rec: &crate::ml::contract::Recommendation) -> bool {
    matches!(rec, crate::ml::contract::Recommendation::Trade(_))
}

fn enqueue_accepted_sample(
    ml_server: &MlServer,
    ml_writer: &WriterHandle,
    mut sample: crate::ml::persistence::AcceptedSample,
    was_recommended: bool,
) {
    let metrics = obs::Metrics::init();
    if was_recommended {
        sample.mark_recommended();
    }
    let t0 = std::time::Instant::now();
    if let Err(e) = ml_writer.try_send(sample) {
        let metrics = ml_server.metrics();
        match e {
            WriterSendError::ChannelFull => {
                metrics
                    .accepted_samples_dropped_channel_full
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                panic!("accepted_samples strict-lossless violation: writer channel full");
            }
            WriterSendError::ChannelClosed => {
                metrics
                    .accepted_samples_dropped_channel_closed
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                panic!("accepted_samples strict-lossless violation: writer channel closed");
            }
        }
    }
    metrics.record_current_ml_stage("writer_enqueue_accepted", t0.elapsed().as_nanos() as u64);
}

#[derive(Debug, Clone, Copy)]
struct MlCycleObservation {
    observation: RouteObservation,
    foreground: bool,
}

#[derive(Debug)]
struct MlCycleBatch {
    cycle_seq: u32,
    event_time_ns: u64,
    cycle_budget_ns: u64,
    observations: Vec<MlCycleObservation>,
}

#[derive(Debug)]
struct MlRecycledShardBuffer {
    shard_index: usize,
    observations: Vec<MlCycleObservation>,
}

enum MlCycleCommand {
    Batch(MlCycleBatch),
    Sweep {
        now_ns: u64,
        resolver_shards: Arc<[usize]>,
        reply_tx: tokio::sync::oneshot::Sender<u64>,
    },
}

#[inline]
fn record_ml_cycle_command_queued(metrics: &obs::Metrics, shard_index: usize, n_events: u64) {
    metrics.ml_cycle_queue_depth_current.inc();
    metrics
        .ml_cycle_queue_events_current
        .add(n_events.min(i64::MAX as u64) as i64);
    metrics.inc_ml_shard_queue(shard_index, n_events);
}

#[inline]
fn record_ml_cycle_command_enqueued(metrics: &obs::Metrics, n_events: u64) {
    metrics.ml_cycle_batches_enqueued_total.inc();
    metrics.ml_cycle_events_enqueued_total.inc_by(n_events);
}

async fn enqueue_ml_cycle_command_lossless(
    metrics: &obs::Metrics,
    shard_index: usize,
    tx: &tokio::sync::mpsc::Sender<MlCycleCommand>,
    cmd: MlCycleCommand,
    n_events: u64,
) -> std::result::Result<(), MlCycleCommand> {
    match tx.try_reserve() {
        Ok(permit) => {
            record_ml_cycle_command_queued(metrics, shard_index, n_events);
            permit.send(cmd);
            record_ml_cycle_command_enqueued(metrics, n_events);
            Ok(())
        }
        Err(tokio::sync::mpsc::error::TrySendError::Full(())) => {
            metrics.ml_cycle_queue_full_total.inc();
            let wait_t0 = std::time::Instant::now();
            match tx.reserve().await {
                Ok(permit) => {
                    metrics.record_ml_stage(
                        shard_index,
                        "queue_wait",
                        wait_t0.elapsed().as_nanos() as u64,
                    );
                    record_ml_cycle_command_queued(metrics, shard_index, n_events);
                    permit.send(cmd);
                    record_ml_cycle_command_enqueued(metrics, n_events);
                    Ok(())
                }
                Err(_) => {
                    metrics.record_ml_stage(
                        shard_index,
                        "queue_wait",
                        wait_t0.elapsed().as_nanos() as u64,
                    );
                    Err(cmd)
                }
            }
        }
        Err(tokio::sync::mpsc::error::TrySendError::Closed(())) => Err(cmd),
    }
}

fn ml_cycle_shard_count_from_ml_config(ml: &config::MlConfig) -> anyhow::Result<usize> {
    let shards = ml.cycle_shards;
    if !matches!(shards, 1 | 2 | 4 | 8 | 16 | 32) {
        anyhow::bail!("cycle_shards must be one of [1, 2, 4, 8, 16, 32], got {shards}");
    }
    if shards > ML_CYCLE_MAX_SHARDS {
        anyhow::bail!("cycle_shards must be <= {ML_CYCLE_MAX_SHARDS}, got {shards}");
    }
    Ok(shards)
}

fn resolver_shards_for_ml_shard(
    ml_shard_index: usize,
    ml_shard_count: usize,
    resolver_shard_count: usize,
) -> Arc<[usize]> {
    debug_assert!(ml_shard_count > 0);
    debug_assert_eq!(resolver_shard_count % ml_shard_count, 0);
    (ml_shard_index..resolver_shard_count)
        .step_by(ml_shard_count)
        .collect::<Vec<_>>()
        .into()
}

fn spawn_isolated_writer_task<F>(name: &'static str, fut: F)
where
    F: std::future::Future<Output = ()> + Send + 'static,
{
    std::thread::Builder::new()
        .name(name.to_string())
        .spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .unwrap_or_else(|e| {
                        panic!(
                            "writer runtime strict-lossless violation: failed to start {name}: {e}"
                        )
                    });
                rt.block_on(fut);
            }));
            if result.is_err() {
                eprintln!(
                    "writer thread strict-lossless violation: {name} panicked; aborting process"
                );
                std::process::abort();
            }
        })
        .unwrap_or_else(|e| {
            panic!("writer thread strict-lossless violation: failed to spawn {name}: {e}")
        });
}

#[inline]
fn route_shard_index(route: RouteId, shard_count: usize) -> usize {
    debug_assert!(shard_count > 0);
    if shard_count <= 1 {
        return 0;
    }
    let mut x = route.symbol_id.0 as u64;
    x ^= (route.buy_venue.idx() as u64) << 32;
    x ^= (route.sell_venue.idx() as u64) << 40;
    x ^= x >> 30;
    x = x.wrapping_mul(0xbf58_476d_1ce4_e5b9);
    x ^= x >> 27;
    x = x.wrapping_mul(0x94d0_49bb_1331_11eb);
    x ^= x >> 31;
    (x % shard_count as u64) as usize
}

async fn run_ml_cycle_worker(
    shard_index: usize,
    universe: Arc<SymbolUniverse>,
    ml_server: Arc<MlServer>,
    ml_writer: WriterHandle,
    ml_broadcaster: RecommendationBroadcaster,
    mut rx: tokio::sync::mpsc::Receiver<MlCycleCommand>,
    buffer_recycle_tx: tokio::sync::mpsc::Sender<MlRecycledShardBuffer>,
) {
    let metrics = obs::Metrics::init();
    while let Some(cmd) = rx.recv().await {
        match cmd {
            MlCycleCommand::Batch(mut batch) => {
                let n_events = batch.observations.len() as u64;
                metrics.ml_cycle_queue_depth_current.dec();
                metrics
                    .ml_cycle_queue_events_current
                    .sub(n_events.min(i64::MAX as u64) as i64);
                metrics.dec_ml_shard_queue(shard_index, n_events);
                metrics.ml_cycle_batch_inflight_current.inc();
                metrics
                    .ml_cycle_events_inflight_current
                    .add(n_events.min(i64::MAX as u64) as i64);
                metrics.inc_ml_shard_inflight(shard_index, n_events);
                let _shard_scope = metrics.enter_ml_shard(shard_index);
                let batch_t0 = std::time::Instant::now();
                process_ml_cycle_batch(&universe, &ml_server, &ml_writer, &ml_broadcaster, &batch)
                    .await;
                metrics.record_ml_shard_batch(
                    shard_index,
                    n_events,
                    batch_t0.elapsed().as_nanos() as u64,
                );
                batch.observations.clear();
                let _ = buffer_recycle_tx.try_send(MlRecycledShardBuffer {
                    shard_index,
                    observations: batch.observations,
                });
                metrics.ml_cycle_batch_inflight_current.dec();
                metrics
                    .ml_cycle_events_inflight_current
                    .sub(n_events.min(i64::MAX as u64) as i64);
                metrics.dec_ml_shard_inflight(shard_index, n_events);
                metrics.ml_cycle_batches_processed_total.inc();
                metrics.ml_cycle_events_processed_total.inc_by(n_events);
            }
            MlCycleCommand::Sweep {
                now_ns,
                resolver_shards,
                reply_tx,
            } => {
                let t0 = std::time::Instant::now();
                let n = ml_server
                    .label_resolver()
                    .map(|resolver| {
                        resolver_shards
                            .iter()
                            .map(|&resolver_shard| resolver.sweep_shard(resolver_shard, now_ns))
                            .sum()
                    })
                    .unwrap_or(0);
                metrics.record_ml_stage(shard_index, "label_sweep", t0.elapsed().as_nanos() as u64);
                let _ = reply_tx.send(n);
            }
        }
    }
}

async fn run_label_sweeper_by_ml_shard(
    ml_cycle_txs: Vec<tokio::sync::mpsc::Sender<MlCycleCommand>>,
    label_sweeper_interval: Duration,
    resolver_shard_count: usize,
) {
    let assignments = (0..ml_cycle_txs.len())
        .map(|shard_index| {
            resolver_shards_for_ml_shard(shard_index, ml_cycle_txs.len(), resolver_shard_count)
        })
        .collect::<Vec<_>>();
    let mut tick = tokio::time::interval(label_sweeper_interval);
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        tick.tick().await;
        let sweep_ts = now_ns();
        let mut replies = Vec::with_capacity(ml_cycle_txs.len());
        for (tx, resolver_shards) in ml_cycle_txs.iter().zip(assignments.iter()) {
            let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
            if tx
                .send(MlCycleCommand::Sweep {
                    now_ns: sweep_ts,
                    resolver_shards: Arc::clone(resolver_shards),
                    reply_tx,
                })
                .await
                .is_err()
            {
                return;
            }
            replies.push(reply_rx);
        }
        let mut n = 0u64;
        for reply_rx in replies {
            match reply_rx.await {
                Ok(closed) => n = n.saturating_add(closed),
                Err(_) => return,
            }
        }
        if n > 0 {
            tracing::debug!(n_closed = n, "label_resolver sweep");
        }
    }
}

async fn process_ml_cycle_batch(
    universe: &SymbolUniverse,
    ml_server: &MlServer,
    ml_writer: &WriterHandle,
    ml_broadcaster: &RecommendationBroadcaster,
    batch: &MlCycleBatch,
) {
    let metrics = obs::Metrics::init();
    let batch_t0 = std::time::Instant::now();
    let ml_foreground_t0 = std::time::Instant::now();
    for item in batch.observations.iter().filter(|item| item.foreground) {
        let opp = item.observation;
        let route = RouteId {
            symbol_id: opp.symbol_id,
            buy_venue: opp.buy_venue,
            sell_venue: opp.sell_venue,
        };
        let symbol_name = universe.canonical_name_of(opp.symbol_id);
        let (rec, _dec, accepted) = ml_server.on_opportunity_with_books(
            batch.cycle_seq,
            route,
            &symbol_name,
            opp.entry_spread as f32,
            opp.exit_spread as f32,
            opp.buy_vol24,
            opp.sell_vol24,
            opp.buy_bid_price,
            opp.buy_price,
            opp.sell_price,
            opp.sell_ask_price,
            batch.event_time_ns,
        );
        let _had_active_consumers = ml_broadcaster.publish(
            batch.cycle_seq,
            batch.event_time_ns,
            route,
            symbol_name.as_str(),
            &rec,
        );
        if let Some(sample) = accepted {
            enqueue_accepted_sample(
                ml_server,
                ml_writer,
                sample,
                should_mark_sample_recommended(&rec),
            );
        }
    }
    let ml_foreground_elapsed_ns = ml_foreground_t0.elapsed().as_nanos() as u64;
    metrics.record_ml_foreground(ml_foreground_elapsed_ns);
    metrics.record_current_ml_stage("foreground_pass_total", ml_foreground_elapsed_ns);

    let ml_background_t0 = std::time::Instant::now();
    let mut background_events = 0u64;
    for item in batch.observations.iter().filter(|item| !item.foreground) {
        background_events = background_events.saturating_add(1);
        let opp = item.observation;
        let route = RouteId {
            symbol_id: opp.symbol_id,
            buy_venue: opp.buy_venue,
            sell_venue: opp.sell_venue,
        };
        let symbol_id = opp.symbol_id;
        let (_dec, accepted) = ml_server.observe_background_with_books_lazy_symbol(
            batch.cycle_seq,
            route,
            || universe.canonical_name_of(symbol_id),
            opp.entry_spread as f32,
            opp.exit_spread as f32,
            opp.buy_vol24,
            opp.sell_vol24,
            opp.buy_bid_price,
            opp.buy_price,
            opp.sell_price,
            opp.sell_ask_price,
            batch.event_time_ns,
        );
        if let Some(sample) = accepted {
            enqueue_accepted_sample(ml_server, ml_writer, sample, false);
        }
    }
    let ml_background_elapsed_ns = ml_background_t0.elapsed().as_nanos() as u64;
    if background_events > 0 {
        metrics.record_ml_background_event_estimate(ml_background_elapsed_ns / background_events);
    }
    metrics.record_current_ml_background_batch_events(background_events);
    metrics.record_ml_background_with_budget(ml_background_elapsed_ns, batch.cycle_budget_ns);
    metrics.record_current_ml_stage("background_pass_total", ml_background_elapsed_ns);
    metrics.record_current_ml_stage("batch_total", batch_t0.elapsed().as_nanos() as u64);
}

fn route_decimator_from_ml_config(ml: &config::MlConfig) -> RouteDecimator {
    RouteDecimator::with_modulus(ml.raw_decimation_mod.max(1))
}

fn label_decimator_from_ml_config(ml: &config::MlConfig) -> RouteDecimator {
    RouteDecimator::with_modulus(ml.label_background_decimation_mod.max(1))
}

fn label_allowlist_symbols_key_from_ml_config(ml: &config::MlConfig) -> String {
    let mut symbols = ml
        .raw_allowlist_symbols
        .iter()
        .map(|symbol| symbol.trim().to_ascii_uppercase())
        .filter(|symbol| !symbol.is_empty())
        .collect::<Vec<_>>();
    symbols.sort();
    symbols.dedup();
    symbols.join(",")
}

fn label_priority_target_coverage_from_ml_config(ml: &config::MlConfig) -> f64 {
    ml.raw_sampling_target_coverage.clamp(0.5, 0.999)
}

fn label_priority_rerank_interval_s_from_ml_config(ml: &config::MlConfig) -> u64 {
    ml.raw_rerank_interval_s.max(60)
}

fn operational_audit_from_metrics(metrics: &obs::Metrics) -> OperationalAudit {
    metrics.refresh_process_memory();

    let full_cycle_p99_ns = {
        let hist = metrics.full_cycle_hist.lock();
        if hist.len() == 0 {
            0
        } else {
            hist.value_at_quantile(0.99)
        }
    };
    let ml_background_p99_ns = {
        let hist = metrics.ml_background_hist.lock();
        if hist.len() == 0 {
            0
        } else {
            hist.value_at_quantile(0.99)
        }
    };

    let mut queue_wait_ops_total = 0u64;
    let mut queue_wait_ns_total = 0u64;
    for shard_index in 0..ML_CYCLE_MAX_SHARDS {
        let shard = shard_index.to_string();
        queue_wait_ops_total = queue_wait_ops_total.saturating_add(
            metrics
                .ml_cycle_stage_ops_total
                .with_label_values(&[shard.as_str(), "queue_wait"])
                .get(),
        );
        queue_wait_ns_total = queue_wait_ns_total.saturating_add(
            metrics
                .ml_cycle_stage_ns_total
                .with_label_values(&[shard.as_str(), "queue_wait"])
                .get(),
        );
    }

    OperationalAudit {
        ml_cycle_queue_full_total: metrics.ml_cycle_queue_full_total.get(),
        full_cycle_over_budget_total: metrics.full_cycle_over_budget_total.get(),
        ml_background_over_budget_total: metrics.ml_background_over_budget_total.get(),
        ml_cycle_queue_depth_current: metrics.ml_cycle_queue_depth_current.get(),
        ml_cycle_queue_events_current: metrics.ml_cycle_queue_events_current.get(),
        ml_cycle_batch_inflight_current: metrics.ml_cycle_batch_inflight_current.get(),
        ml_cycle_events_inflight_current: metrics.ml_cycle_events_inflight_current.get(),
        full_cycle_budget_ns: metrics.full_cycle_budget_ns.get().max(0) as u64,
        full_cycle_p99_ns,
        full_cycle_max_ns: metrics.full_cycle_max_ns.get().max(0) as u64,
        ml_background_p99_ns,
        ml_background_max_ns: metrics.ml_background_max_ns.get().max(0) as u64,
        ml_cycle_queue_wait_ops_total: queue_wait_ops_total,
        ml_cycle_queue_wait_ns_total: queue_wait_ns_total,
        process_working_set_bytes: metrics.process_working_set_bytes.get().max(0) as u64,
        process_private_bytes: metrics.process_private_bytes.get().max(0) as u64,
    }
}

fn parquet_compaction_from_ml_config(
    ml: &config::MlConfig,
) -> anyhow::Result<ParquetCompactionConfig> {
    if ml.parquet.batch_size == 0 {
        anyhow::bail!("ml.parquet.batch_size must be >= 1");
    }
    if !(1..=22).contains(&ml.parquet.zstd_level) {
        anyhow::bail!("ml.parquet.zstd_level must be in [1, 22]");
    }
    Ok(ParquetCompactionConfig {
        enabled: ml.parquet.enabled,
        delete_jsonl_after_success: ml.parquet.delete_jsonl_after_success,
        batch_size: ml.parquet.batch_size,
        zstd_level: ml.parquet.zstd_level,
        rotation_interval_s: ml.parquet.rotation_interval_s,
    })
}

fn dataset_rotation_interval_from_ml_config(ml: &config::MlConfig) -> anyhow::Result<Duration> {
    let seconds = ml.parquet.rotation_interval_s;
    if seconds == 0 {
        anyhow::bail!("ml.parquet.rotation_interval_s must be >= 1");
    }
    if seconds > 3600 {
        anyhow::bail!("ml.parquet.rotation_interval_s must be <= 3600");
    }
    Ok(Duration::from_secs(seconds))
}

async fn compact_existing_partitions(
    root: PathBuf,
    dataset_kind: DatasetKind,
    parquet: ParquetCompactionConfig,
    dataset_name: &'static str,
) {
    let root_for_task = root.clone();
    match tokio::task::spawn_blocking(move || {
        compact_existing_jsonl_in_tree(&root_for_task, dataset_kind, &parquet)
    })
    .await
    {
        Ok(Ok(n)) if n > 0 => {
            info!(dataset = dataset_name, compacted = n, root = %root.display(), "startup parquet sweep compactou partições órfãs");
        }
        Ok(Ok(_)) => {}
        Ok(Err(e)) => {
            warn!(dataset = dataset_name, error = %e, root = %root.display(), "startup parquet sweep falhou");
        }
        Err(e) => {
            warn!(dataset = dataset_name, error = %e, root = %root.display(), "startup parquet sweep join falhou");
        }
    }
}

/// Top-level entry point. Wires: discovery → book store → adapters →
/// spread engine → broadcast server.
pub async fn run(cfg: Config) -> anyhow::Result<()> {
    obs::Metrics::init();
    let run_started_ns = now_ns();
    let run_id = format!("scanner-{}-{}", std::process::id(), run_started_ns);

    let model_window_policy = ModelWindowPolicy::from(&cfg.ml.windows);
    model_window_policy
        .validate()
        .map_err(|e| Error::Config(format!("ml.windows: {}", e)))?;
    let parquet_compaction = parquet_compaction_from_ml_config(&cfg.ml)
        .map_err(|e| Error::Config(format!("ml.parquet: {}", e)))?;
    let dataset_rotation_interval = dataset_rotation_interval_from_ml_config(&cfg.ml)
        .map_err(|e| Error::Config(format!("ml.parquet: {}", e)))?;
    let ml_cycle_shards = ml_cycle_shard_count_from_ml_config(&cfg.ml)
        .map_err(|e| Error::Config(format!("ml.cycle_shards: {}", e)))?;
    info!(
        train_window_days = model_window_policy.train_window_days,
        calibration_window_days = model_window_policy.calibration_window_days,
        archive_reference_days = model_window_policy.archive_reference_days,
        parquet_enabled = parquet_compaction.enabled,
        parquet_batch_size = parquet_compaction.batch_size,
        parquet_zstd_level = parquet_compaction.zstd_level,
        parquet_rotation_interval_s = dataset_rotation_interval.as_secs(),
        parquet_strict_lossless = cfg.ml.parquet.strict_lossless,
        ml_cycle_shards,
        run_id = %run_id,
        "ML window policy carregada"
    );

    // --- Symbol discovery (REST, parallel per-venue) ---
    let http = reqwest::Client::builder()
        .user_agent("scanner/0.1")
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| Error::Other(format!("http client: {}", e)))?;
    let discoverers = discovery::orchestrator::default_discoverers();
    let universe = discovery::orchestrator::discover_all(&cfg.venues, &http, discoverers).await?;
    info!(symbols = universe.len(), "symbol universe ready");

    // --- Book store + staleness table + vol store ---
    let n_symbols = (universe.len() as u32).max(cfg.limits.max_symbols);
    let store = Arc::new(BookStore::with_capacity(n_symbols));
    let stale = new_stale_table(n_symbols);
    let vol = Arc::new(VolStore::with_capacity(n_symbols));
    info!(
        n_symbols,
        "book store + staleness table + vol store allocated"
    );

    // --- Scan counters (shared with /api/spread/debug) ---
    let counters = Arc::new(ScanCounters::default());

    // --- ML Recommendation broadcaster ---
    // Criado cedo para ser anexado ao `BroadcastState` e ao engine.
    // Canal `tokio::sync::broadcast` cap 512; não bloqueia em backpressure.
    // Resolve lacuna "Recommendation descartada em lib.rs" (Wave T).
    let ml_broadcaster = RecommendationBroadcaster::new();
    let (admin_shutdown_tx, mut admin_shutdown_rx) = tokio::sync::broadcast::channel::<()>(1);

    // --- Broadcast state + server ---
    let bstate = BroadcastState::new()
        .with_refs(
            Arc::clone(&universe),
            Arc::clone(&store),
            Arc::clone(&stale),
            Arc::clone(&counters),
            Arc::clone(&vol),
        )
        .with_ml_broadcaster(ml_broadcaster.clone())
        .with_admin_shutdown(admin_shutdown_tx.clone());
    let addr: std::net::SocketAddr = cfg
        .bind
        .parse()
        .map_err(|e| Error::Config(format!("invalid bind {:?}: {}", cfg.bind, e)))?;
    {
        let bs = bstate.clone();
        let frontend = cfg.frontend_dir.clone();
        tokio::spawn(async move {
            if let Err(e) = broadcast::server::serve(addr, bs, frontend).await {
                warn!("broadcast server terminated: {}", e);
            }
        });
    }

    // --- Adapters ---
    spawn_adapters(
        &cfg,
        Arc::clone(&universe),
        Arc::clone(&stale),
        Arc::clone(&vol),
        Arc::clone(&store),
    );

    // --- REST vol poller (fills VolStore for venues whose WS omits 24h vol) ---
    {
        let u = Arc::clone(&universe);
        let v = Arc::clone(&vol);
        tokio::spawn(async move {
            adapter::vol_poller::run(u, v).await;
        });
    }

    // --- ML recomendador (M1.7) ---
    // Módulo `ml` roda inline no loop do spread engine — baseline A3 tem
    // latência ~1–5 µs/opp, desprezível vs ciclo 150 ms. Não altera a
    // lógica de emissão de oportunidades; apenas observa spreads no
    // HotQueryCache e produz `Recommendation` (logadas; broadcast em
    // iteração futura). Se o módulo ML falhar, scanner continua normal.
    let ml_cache = HotQueryCache::new();
    let ml_baseline = BaselineA3::new(ml_cache, BaselineConfig::default());

    // --- ML RawSample writer (ADR-025) ---
    // Stream contínuo pré-trigger, decimado 1-in-10 por rota, para medição
    // não-enviesada dos gates empíricos E1/E2/E4/E6/E8/E10/E11 do Marco 0.
    // Paralelo ao AcceptedSample writer; ambos usam Hive-style partitioning.
    //
    // Fix pós-auditoria: log ABSOLUTO do path data_dir no startup.
    // Default é relativo ("data/ml/..."), dependendo do CWD — primeira
    // coleta podia "sumir" silenciosamente no disco errado.
    let mut raw_writer_cfg = RawWriterConfig::default();
    raw_writer_cfg.parquet = parquet_compaction.clone();
    raw_writer_cfg.rotation_interval = dataset_rotation_interval;
    let raw_writer_abs = std::env::current_dir()
        .map(|cwd| cwd.join(&raw_writer_cfg.data_dir))
        .unwrap_or_else(|_| raw_writer_cfg.data_dir.clone());
    info!(
        abs_path = %raw_writer_abs.display(),
        cap = raw_writer_cfg.channel_capacity,
        "ML raw writer — path absoluto"
    );
    compact_existing_partitions(
        raw_writer_abs.clone(),
        DatasetKind::RawSamples,
        raw_writer_cfg.parquet.clone(),
        "raw_samples",
    )
    .await;
    let (ml_raw_writer, ml_raw_writer_handle) = RawSampleWriter::create(raw_writer_cfg);
    let raw_shutdown_handle = ml_raw_writer_handle.clone();
    spawn_isolated_writer_task("ml-raw-writer", async move {
        ml_raw_writer.run().await;
    });

    // --- Wave V: Labeled trade writer + resolver + ranker ---
    let mut labeled_writer_cfg = LabeledWriterConfig::default();
    labeled_writer_cfg.parquet = parquet_compaction.clone();
    labeled_writer_cfg.rotation_interval = dataset_rotation_interval;
    let labeled_writer_abs = std::env::current_dir()
        .map(|cwd| cwd.join(&labeled_writer_cfg.data_dir))
        .unwrap_or_else(|_| labeled_writer_cfg.data_dir.clone());
    info!(
        abs_path = %labeled_writer_abs.display(),
        cap = labeled_writer_cfg.channel_capacity,
        "ML labeled-trade writer — path absoluto"
    );
    compact_existing_partitions(
        labeled_writer_abs.clone(),
        DatasetKind::LabeledTrades,
        labeled_writer_cfg.parquet.clone(),
        "labeled_trades",
    )
    .await;
    let (labeled_writer, labeled_handle) = LabeledJsonlWriter::create(labeled_writer_cfg);
    let labeled_shutdown_handle = labeled_handle.clone();
    spawn_isolated_writer_task("ml-labeled-writer", async move {
        labeled_writer.run().await;
    });

    let resolver_cfg = ResolverConfig {
        horizons_s: cfg.ml.label_horizons_s.clone(),
        sweeper_interval: Duration::from_secs(cfg.ml.label_sweeper_interval_s),
        ..ResolverConfig::default()
    };
    let label_resolver = Arc::new(LabelResolver::new_with_spool_dir_and_route_exit_log_shadow(
        resolver_cfg,
        labeled_handle,
        Some(labeled_writer_abs.join("_pending_spool")),
        cfg.ml.route_exit_log_shadow_enabled,
    ));
    let label_resolver_shard_count = label_resolver.shard_count();
    if label_resolver_shard_count % ml_cycle_shards != 0 {
        return Err(Error::Config(format!(
            "ml.cycle_shards={} must divide label_resolver_shards={}",
            ml_cycle_shards, label_resolver_shard_count
        ))
        .into());
    }

    // Ranker rolling — 24h de buckets × 15 min.
    let ranker = Arc::new(RouteRanking::new(
        now_ns(),
        cfg.ml.raw_sampling_target_coverage,
    ));

    let ml_server = Arc::new(
        MlServer::new(ml_baseline, SamplingTrigger::with_defaults())
            .with_raw_decimator(route_decimator_from_ml_config(&cfg.ml))
            .with_label_decimator(label_decimator_from_ml_config(&cfg.ml))
            .with_label_population_policy(
                label_allowlist_symbols_key_from_ml_config(&cfg.ml),
                label_priority_target_coverage_from_ml_config(&cfg.ml),
                label_priority_rerank_interval_s_from_ml_config(&cfg.ml),
            )
            .with_ml_cycle_shards(ml_cycle_shards)
            .with_raw_writer(ml_raw_writer_handle)
            .with_route_ranking(Arc::clone(&ranker))
            .with_label_resolver(Arc::clone(&label_resolver))
            .with_label_config(
                cfg.ml.label_stride_s,
                cfg.ml.label_floor_pct,
                cfg.ml.label_floors_pct.clone(),
            )
            .with_recommendation_cooldown_s(cfg.ml.recommendation_cooldown_s)
            .with_opportunity_alive_threshold_pct(cfg.entry_threshold_pct as f32),
    );

    // --- Allowlist Wave V: resolver símbolos em rotas engine-elegíveis ---
    // Precede qualquer outra atividade para tier_0 funcionar desde o 1º tick.
    {
        use std::collections::HashSet;
        let mut allow_routes: HashSet<ml::contract::RouteId> = HashSet::new();
        for symbol_name in &cfg.ml.raw_allowlist_symbols {
            if let Some(sym_id) = universe.find_canonical(symbol_name) {
                // Para cada par (buy, sell) cross-venue elegível pelo engine
                // (qualquer venue coberta pelo símbolo, nas 2 direções).
                let coverage = &universe.coverage[sym_id.0 as usize];
                for buy_v in crate::types::Venue::ALL {
                    if !coverage[buy_v.idx()] {
                        continue;
                    }
                    for sell_v in crate::types::Venue::ALL {
                        if sell_v == buy_v || !coverage[sell_v.idx()] {
                            continue;
                        }
                        if sell_v.as_str() == buy_v.as_str() {
                            continue;
                        }
                        // Skip spot/spot e spot-as-sell (regra do engine).
                        if buy_v.market() == crate::types::Market::Spot
                            && sell_v.market() == crate::types::Market::Spot
                        {
                            continue;
                        }
                        if sell_v.market() == crate::types::Market::Spot {
                            continue;
                        }
                        allow_routes.insert(ml::contract::RouteId {
                            symbol_id: sym_id,
                            buy_venue: buy_v,
                            sell_venue: sell_v,
                        });
                    }
                }
            }
        }
        let n_routes = allow_routes.len();
        ml_server
            .raw_decimator()
            .set_allowlist(allow_routes.clone());
        ml_server.label_decimator().set_allowlist(allow_routes);
        info!(
            n_allowlist_routes = n_routes,
            n_allowlist_symbols = cfg.ml.raw_allowlist_symbols.len(),
            "ML allowlist carregada em raw e label background"
        );
    }

    // Task rerank (configurável via `raw_rerank_interval_s`).
    {
        let ranker_clone = Arc::clone(&ranker);
        let raw_decimator = ml_server.raw_decimator().clone();
        let label_decimator = ml_server.label_decimator().clone();
        let ml_for_priority_metadata = Arc::clone(&ml_server);
        let rerank_interval =
            Duration::from_secs(label_priority_rerank_interval_s_from_ml_config(&cfg.ml));
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(rerank_interval);
            tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                tick.tick().await;
                let priority = ranker_clone.snapshot_priority_set();
                let n = priority.len();
                raw_decimator.set_priority_set(priority.clone());
                label_decimator.set_priority_set(priority);
                ml_for_priority_metadata.bump_priority_set_generation(now_ns());
                info!(
                    n_priority_routes = n,
                    "ML rerank atualizou priority_set raw e label"
                );
            }
        });
    }

    // O sweep de labels deve passar pela mesma fila FIFO do pipeline ML.
    // Assim, se houver backlog, o sweep fica atrás das observações já
    // capturadas e não censura janelas antes de processar o futuro observado.
    let label_sweeper_interval = Duration::from_secs(cfg.ml.label_sweeper_interval_s.max(1));

    // Fix C2 — Sweeper econômico: fecha pendings cujo `valid_until` expirou
    // mesmo sem nova observação da rota (rotas que silenciam). Mesma cadência
    // do label sweeper para manter simetria operacional. Sem isso,
    // `realization_rate` e `pnl_aggregated_usd` ficavam enviesados.
    {
        let server_clone = Arc::clone(&ml_server);
        let interval = Duration::from_secs(cfg.ml.label_sweeper_interval_s.max(1));
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(interval);
            tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                tick.tick().await;
                let n = server_clone.economic_sweep(now_ns());
                if n > 0 {
                    tracing::debug!(n_closed = n, "economic sweeper");
                }
            }
        });
    }

    // Sweeper dos HotQueryCaches: remove apenas amostras que já saíram da
    // janela estatística da própria feature (1h/24h/7d). Não altera labels,
    // floors, horizontes ou política de sampling; evita reter rotas frias que
    // não recebem nova observação decimada para disparar expiração local.
    {
        let server_clone = Arc::clone(&ml_server);
        let interval = Duration::from_secs(cfg.ml.label_sweeper_interval_s.max(60));
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(interval);
            tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                tick.tick().await;
                let now = now_ns();
                let state = server_clone.state_sweep(now);
                let (s24h, s1h, s7d) = server_clone.cache_sweep_expired(now);
                if s24h.routes_removed
                    + s1h.routes_removed
                    + s7d.routes_removed
                    + s24h.routes_rebuilt
                    + s1h.routes_rebuilt
                    + s7d.routes_rebuilt
                    + state.listing_newly_delisted
                    + state.cooldown_entries_removed
                    + state.alive_entries_removed
                    > 0
                {
                    tracing::debug!(
                        listing_active_routes = state.listing_active_routes,
                        listing_newly_delisted = state.listing_newly_delisted,
                        cooldown_entries_removed = state.cooldown_entries_removed,
                        alive_entries_removed = state.alive_entries_removed,
                        removed_24h = s24h.routes_removed,
                        removed_1h = s1h.routes_removed,
                        removed_7d = s7d.routes_removed,
                        rebuilt_24h = s24h.routes_rebuilt,
                        rebuilt_1h = s1h.routes_rebuilt,
                        rebuilt_7d = s7d.routes_rebuilt,
                        expired_ticks_24h = s24h.ticks_expired,
                        expired_ticks_1h = s1h.ticks_expired,
                        expired_ticks_7d = s7d.ticks_expired,
                        "hot cache sweep expired out-of-window samples"
                    );
                }
            }
        });
    }
    let ml_metrics_opt = match MlPrometheusMetrics::register(&obs::Metrics::init().registry) {
        Ok(m) => {
            info!("ML prometheus metrics registered");
            Some(m)
        }
        Err(e) => {
            warn!(
                "ML prometheus register failed: {} — métricas ML indisponíveis",
                e
            );
            None
        }
    };
    if let Some(mut metrics) = ml_metrics_opt {
        let server_for_metrics = Arc::clone(&ml_server);
        let broadcaster_for_metrics = ml_broadcaster.clone();
        let resolver_for_metrics = Arc::clone(&label_resolver);
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_secs(1));
            loop {
                tick.tick().await;
                let economic = server_for_metrics.economic_metrics();
                let resolver_metrics = resolver_for_metrics.metrics();
                metrics.update_from_runtime(
                    &server_for_metrics,
                    Some(&broadcaster_for_metrics),
                    Some(economic.as_ref()),
                    Some(resolver_metrics.as_ref()),
                );
            }
        });
    }

    // --- ML dataset writer (C1 fix) ---
    // Consumer task que grava cada `AcceptedSample` em JSONL rotativa
    // dentro de partição horária em `{data_dir}/year=YYYY/month=MM/day=DD/hour=HH/`. Alimenta
    // o dataset de treino do modelo A2 (Marco 2). Canal bounded 100k
    // amortece picos de ~100 min a 17 req/s.
    //
    // Fix pós-auditoria: log ABSOLUTO do path.
    let mut writer_cfg = WriterConfig::default();
    writer_cfg.parquet = parquet_compaction;
    writer_cfg.rotation_interval = dataset_rotation_interval;
    let writer_abs = std::env::current_dir()
        .map(|cwd| cwd.join(&writer_cfg.data_dir))
        .unwrap_or_else(|_| writer_cfg.data_dir.clone());
    info!(
        abs_path = %writer_abs.display(),
        cap = writer_cfg.channel_capacity,
        "ML accepted writer — path absoluto"
    );
    compact_existing_partitions(
        writer_abs.clone(),
        DatasetKind::AcceptedSamples,
        writer_cfg.parquet.clone(),
        "accepted_samples",
    )
    .await;
    let (ml_writer, ml_writer_handle) = JsonlWriter::create(writer_cfg);
    let accepted_shutdown_handle = ml_writer_handle.clone();
    spawn_isolated_writer_task("ml-accepted-writer", async move {
        ml_writer.run().await;
    });

    // --- Dataset retention policy ---
    // Persistência física != janela estatística do modelo. O runtime
    // mantém TTL operacional por camada; o trainer usa a política de
    // `ml.windows` para escolher lookback/calibração.
    {
        let retention_policy = DatasetRetentionPolicy::from(&cfg.ml.retention);
        let managed = vec![
            ManagedDataset {
                name: "raw_samples",
                root: raw_writer_abs.clone(),
                retention_days: cfg.ml.retention.raw_retention_days,
            },
            ManagedDataset {
                name: "accepted_samples",
                root: writer_abs.clone(),
                retention_days: cfg.ml.retention.accepted_retention_days,
            },
            ManagedDataset {
                name: "labeled_trades",
                root: labeled_writer_abs.clone(),
                retention_days: cfg.ml.retention.labeled_retention_days,
            },
        ];
        retention_policy
            .validate(&managed)
            .map_err(|e| Error::Config(format!("ml.retention: {}", e)))?;
        info!(
            enabled = retention_policy.enabled,
            dry_run = retention_policy.dry_run,
            sweep_interval_s = retention_policy.sweep_interval.as_secs(),
            keep_recent_hours = retention_policy.keep_recent_hours,
            raw_retention_days = cfg.ml.retention.raw_retention_days,
            accepted_retention_days = cfg.ml.retention.accepted_retention_days,
            labeled_retention_days = cfg.ml.retention.labeled_retention_days,
            "ML retention policy carregada"
        );
        if retention_policy.enabled {
            tokio::spawn(async move {
                let mut tick = tokio::time::interval(retention_policy.sweep_interval);
                tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
                loop {
                    tick.tick().await;
                    let managed = managed.clone();
                    let policy = retention_policy.clone();
                    match tokio::task::spawn_blocking(move || {
                        sweep_datasets(&managed, &policy, std::time::SystemTime::now())
                    })
                    .await
                    {
                        Ok(Ok(report)) => {
                            info!(
                                removed = %report.summary_line(),
                                total_removed = %crate::ml::retention::human_bytes(
                                    report.total_removed_bytes()
                                ),
                                total_kept = %crate::ml::retention::human_bytes(
                                    report.total_kept_bytes()
                                ),
                                "ML retention sweep concluído"
                            );
                        }
                        Ok(Err(e)) => {
                            warn!(error = %e, "ML retention sweep falhou");
                        }
                        Err(e) => {
                            warn!(error = %e, "ML retention task join falhou");
                        }
                    }
                }
            });
        }
    }

    // --- ML cycle workers ---
    // O scan loop só publica UI e enfileira observações imutáveis. Todo o
    // trabalho variável de dataset/cache/label/recommendation roda aqui,
    // particionado por rota. Com `cycle_shards=1`, preserva a ordem global
    // histórica; com >1, preserva FIFO por rota e agenda sweeps dentro da
    // fila do shard correspondente, sem travar os demais shards.
    let mut ml_cycle_txs = Vec::with_capacity(ml_cycle_shards);
    let mut ml_worker_tasks = Vec::with_capacity(ml_cycle_shards);
    let (ml_buffer_recycle_tx, ml_buffer_recycle_rx) =
        tokio::sync::mpsc::channel::<MlRecycledShardBuffer>(
            ML_CYCLE_BUFFER_RECYCLE_CAPACITY.saturating_mul(ml_cycle_shards),
        );
    for shard_index in 0..ml_cycle_shards {
        let (ml_cycle_tx, ml_cycle_rx) =
            tokio::sync::mpsc::channel::<MlCycleCommand>(ML_CYCLE_CHANNEL_CAPACITY);
        ml_cycle_txs.push(ml_cycle_tx);
        ml_worker_tasks.push(tokio::spawn(run_ml_cycle_worker(
            shard_index,
            Arc::clone(&universe),
            Arc::clone(&ml_server),
            ml_writer_handle.clone(),
            ml_broadcaster.clone(),
            ml_cycle_rx,
            ml_buffer_recycle_tx.clone(),
        )));
    }
    drop(ml_buffer_recycle_tx);
    let label_sweeper_task = {
        let txs = ml_cycle_txs.clone();
        tokio::spawn(run_label_sweeper_by_ml_shard(
            txs,
            label_sweeper_interval,
            label_resolver_shard_count,
        ))
    };

    // --- Spread engine loop (150ms) ---
    let u_engine = Arc::clone(&universe);
    let s_engine = Arc::clone(&store);
    let st_engine = Arc::clone(&stale);
    let v_engine = Arc::clone(&vol);
    let threshold = cfg.entry_threshold_pct;
    let max_spread = cfg.max_spread_pct;
    let min_vol = cfg.min_vol_usd;
    let broadcast_ms = cfg.broadcast_ms;
    let c_engine = Arc::clone(&counters);
    let ml_engine = Arc::clone(&ml_server);
    let ml_broadcaster_engine = ml_broadcaster.clone();
    let ml_cycle_txs_engine = ml_cycle_txs.clone();
    drop(ml_cycle_txs);
    let label_resolver_shutdown = Arc::clone(&label_resolver);
    let engine_shutdown = Arc::new(AtomicBool::new(false));
    let engine_shutdown_task = Arc::clone(&engine_shutdown);
    let mut engine_task = tokio::spawn(async move {
        run_spread_engine(
            u_engine,
            s_engine,
            st_engine,
            v_engine,
            c_engine,
            threshold,
            max_spread,
            min_vol,
            broadcast_ms,
            bstate,
            ml_engine,
            ml_writer_handle.clone(),
            ml_broadcaster_engine,
            ml_cycle_txs_engine,
            ml_buffer_recycle_rx,
            engine_shutdown_task,
        )
        .await;
    });
    let mut engine_task_completed = false;
    let mut terminal_error: Option<anyhow::Error> = None;
    let shutdown_reason = tokio::select! {
        result = &mut engine_task => {
            engine_task_completed = true;
            match result {
                Ok(()) => {
                    warn!("spread engine task terminou inesperadamente");
                    terminal_error = Some(anyhow::anyhow!(
                        "spread engine task terminated unexpectedly"
                    ));
                }
                Err(e) => {
                    warn!(error = %e, "spread engine task terminou com erro");
                    terminal_error = Some(anyhow::anyhow!("spread engine task failed: {e}"));
                }
            }
            Some("engine_task")
        }
        signal = tokio::signal::ctrl_c() => {
            match signal {
                Ok(()) => {
                    info!("shutdown solicitado via ctrl_c");
                }
                Err(e) => {
                    warn!(error = %e, "falha aguardando sinal de shutdown");
                }
            }
            Some("ctrl_c")
        }
        signal = admin_shutdown_rx.recv() => {
            match signal {
                Ok(()) | Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                    info!("shutdown solicitado via endpoint admin");
                    Some("admin_endpoint")
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => None,
            }
        }
    };
    if let Some(reason) = shutdown_reason {
        if !engine_task_completed {
            engine_shutdown.store(true, Ordering::Relaxed);
            if let Err(e) = engine_task.await {
                warn!(error = %e, "spread engine task terminou com erro durante shutdown cooperativo");
            }
        }
        label_sweeper_task.abort();
        if let Err(e) = label_sweeper_task.await {
            if !e.is_cancelled() {
                warn!(error = %e, "label sweeper task terminou com erro durante shutdown");
            }
        }
        for (shard_index, ml_worker_task) in ml_worker_tasks.into_iter().enumerate() {
            match ml_worker_task.await {
                Ok(()) => {
                    info!(shard_index, "shutdown: ML cycle worker drenado");
                }
                Err(e) => {
                    warn!(shard_index, error = %e, "shutdown: ML cycle worker terminou com erro");
                    terminal_error = Some(anyhow::anyhow!(
                        "ML cycle worker shard {shard_index} failed during shutdown: {e}"
                    ));
                }
            }
        }

        let label_stats = label_resolver_shutdown.shutdown_flush(now_ns()).await;
        info!(
            reason,
            n_closed = label_stats.closed_total,
            n_sent = label_stats.sent_total,
            n_censored = label_stats.censored_total,
            n_dropped_channel_closed = label_stats.dropped_channel_closed_total,
            "shutdown: labels pendentes fechados"
        );
        let mut preexisting_issues = Vec::new();
        if let Some(error) = terminal_error.as_ref() {
            preexisting_issues.push(format!("terminal error before audit: {error}"));
        }
        let labeled_writer_stats = match labeled_shutdown_handle.seal_current_file().await {
            Ok(stats) => {
                if stats.compaction_failed > 0 {
                    warn!(
                        total_written = stats.total_written,
                        total_dropped = stats.total_dropped,
                        compaction_succeeded = stats.compaction_succeeded,
                        compaction_failed = stats.compaction_failed,
                        "shutdown: labeled writer selado com falha de compactacao"
                    );
                } else {
                    info!(
                        total_written = stats.total_written,
                        total_dropped = stats.total_dropped,
                        compaction_succeeded = stats.compaction_succeeded,
                        compaction_failed = stats.compaction_failed,
                        "shutdown: labeled writer selado"
                    );
                }
                Some(stats)
            }
            Err(e) => {
                warn!(error = ?e, "shutdown: falha selando labeled writer");
                preexisting_issues.push(format!("labeled writer seal failed: {:?}", e));
                None
            }
        };
        let raw_writer_stats = match raw_shutdown_handle.seal_current_file().await {
            Ok(stats) => {
                if stats.compaction_failed > 0 {
                    warn!(
                        total_written = stats.total_written,
                        total_dropped = stats.total_dropped,
                        compaction_succeeded = stats.compaction_succeeded,
                        compaction_failed = stats.compaction_failed,
                        "shutdown: raw writer selado com falha de compactacao"
                    );
                } else {
                    info!(
                        total_written = stats.total_written,
                        total_dropped = stats.total_dropped,
                        compaction_succeeded = stats.compaction_succeeded,
                        compaction_failed = stats.compaction_failed,
                        "shutdown: raw writer selado"
                    );
                }
                Some(stats)
            }
            Err(e) => {
                warn!(error = ?e, "shutdown: falha selando raw writer");
                preexisting_issues.push(format!("raw writer seal failed: {:?}", e));
                None
            }
        };
        let accepted_writer_stats = match accepted_shutdown_handle.seal_current_file().await {
            Ok(stats) => {
                if stats.compaction_failed > 0 {
                    warn!(
                        total_written = stats.total_written,
                        total_dropped = stats.total_dropped,
                        compaction_succeeded = stats.compaction_succeeded,
                        compaction_failed = stats.compaction_failed,
                        "shutdown: accepted writer selado com falha de compactacao"
                    );
                } else {
                    info!(
                        total_written = stats.total_written,
                        total_dropped = stats.total_dropped,
                        compaction_succeeded = stats.compaction_succeeded,
                        compaction_failed = stats.compaction_failed,
                        "shutdown: accepted writer selado"
                    );
                }
                Some(stats)
            }
            Err(e) => {
                warn!(error = ?e, "shutdown: falha selando accepted writer");
                preexisting_issues.push(format!("accepted writer seal failed: {:?}", e));
                None
            }
        };

        let mut writers = Vec::new();
        if let Some(stats) = raw_writer_stats {
            writers.push(WriterAudit {
                dataset_kind: "raw_samples".to_string(),
                total_written: stats.total_written,
                total_dropped: stats.total_dropped,
                compaction_succeeded: stats.compaction_succeeded,
                compaction_failed: stats.compaction_failed,
            });
        }
        if let Some(stats) = accepted_writer_stats {
            writers.push(WriterAudit {
                dataset_kind: "accepted_samples".to_string(),
                total_written: stats.total_written,
                total_dropped: stats.total_dropped,
                compaction_succeeded: stats.compaction_succeeded,
                compaction_failed: stats.compaction_failed,
            });
        }
        if let Some(stats) = labeled_writer_stats {
            writers.push(WriterAudit {
                dataset_kind: "labeled_trades".to_string(),
                total_written: stats.total_written,
                total_dropped: stats.total_dropped,
                compaction_succeeded: stats.compaction_succeeded,
                compaction_failed: stats.compaction_failed,
            });
        }

        let audit_report = write_run_audit(RunAuditInput {
            run_id: run_id.clone(),
            pid: std::process::id(),
            started_ns: run_started_ns,
            ended_ns: now_ns(),
            root_dir: std::env::current_dir()
                .map(|cwd| cwd.join("data/ml"))
                .unwrap_or_else(|_| PathBuf::from("data/ml")),
            raw_root: raw_writer_abs.clone(),
            accepted_root: writer_abs.clone(),
            labeled_root: labeled_writer_abs.clone(),
            parquet_enabled: cfg.ml.parquet.enabled,
            strict_lossless: cfg.ml.parquet.strict_lossless,
            cycles_started: ml_server.cycles_started(),
            label_shutdown: LabelShutdownAudit {
                closed_total: label_stats.closed_total,
                sent_total: label_stats.sent_total,
                censored_total: label_stats.censored_total,
                dropped_channel_closed_total: label_stats.dropped_channel_closed_total,
            },
            writers,
            preexisting_issues,
            operational: operational_audit_from_metrics(obs::Metrics::init()),
        });
        match audit_report {
            Ok(report) => {
                info!(
                    run_id = %report.run_id,
                    verdict = ?report.verdict,
                    issues = report.issues.len(),
                    projected_7d_bytes = report.total_projected_7d_bytes,
                    "ML run audit concluída"
                );
                if cfg.ml.parquet.strict_lossless && report.verdict != RunAuditVerdict::Green {
                    anyhow::bail!(
                        "ML strict_lossless: run {} unhealthy: {}",
                        report.run_id,
                        report.issues.join("; ")
                    );
                }
            }
            Err(e) => {
                warn!(error = %e, run_id = %run_id, "ML run audit falhou");
                if cfg.ml.parquet.strict_lossless {
                    return Err(e.context("ML strict_lossless: run audit failed"));
                }
            }
        }
        if let Some(error) = terminal_error {
            return Err(error.context(
                "ML strict_lossless: spread engine terminated; shutdown flush/seal/audit completed",
            ));
        }
    }
    Ok(())
}

fn spawn_adapters(
    cfg: &Config,
    universe: Arc<SymbolUniverse>,
    stale: Arc<StaleTable>,
    vol: Arc<VolStore>,
    store: Arc<BookStore>,
) {
    let _ = vol; // consumed below per-venue where applicable
    use crate::types::Venue;

    if cfg.venues.is_enabled(Venue::BinanceSpot) {
        let a = adapter::binance_spot::BinanceSpotAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("binance-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::GateSpot) {
        let a = adapter::gate_spot::GateSpotAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
            Arc::clone(&vol),
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("gate-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BitgetSpot) {
        let a = adapter::bitget::BitgetAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
            cfg.bitget_mode,
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bitget-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BitgetFut) {
        let a = adapter::bitget_fut::BitgetFutAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
            cfg.bitget_mode,
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bitget-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::MexcFut) {
        let a = adapter::mexc_fut::MexcFutAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
            Arc::clone(&vol),
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("mexc-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::GateFut) {
        let a = adapter::gate_fut::GateFutAdapter::new(Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("gate-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BinanceFut) {
        let a =
            adapter::binance_fut::BinanceFutAdapter::new(Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("binance-fut adapter exited: {}", e);
            }
        });
    }
    // (mexc-spot is handled below via REST polling)
    if cfg.venues.is_enabled(Venue::BingxSpot) {
        let a =
            adapter::bingx_spot::BingxSpotAdapter::new(Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bingx-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BingxFut) {
        let a = adapter::bingx_fut::BingxFutAdapter::new(Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bingx-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::XtSpot) {
        let a = adapter::xt_spot::XtSpotAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
            Arc::clone(&vol),
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("xt-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::XtFut) {
        let a = adapter::xt_fut::XtFutAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
            Arc::clone(&vol),
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("xt-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::KucoinSpot)
        && cfg.kucoin_mode != crate::config::KucoinMode::Disabled
    {
        let a = adapter::kucoin::KucoinAdapter::new(Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("kucoin-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::KucoinFut)
        && cfg.kucoin_mode != crate::config::KucoinMode::Disabled
    {
        let a = adapter::kucoin_fut::KucoinFutAdapter::new(
            Arc::clone(&universe),
            Arc::clone(&stale),
            Arc::clone(&vol),
        );
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("kucoin-fut adapter exited: {}", e);
            }
        });
    }

    // MEXC spot is a REST-polled adapter (WS is Protobuf-only; REST at 1s
    // gives complete coverage with simpler decode).
    if cfg.venues.is_enabled(Venue::MexcSpot) {
        let u = Arc::clone(&universe);
        let st = Arc::clone(&stale);
        let s = Arc::clone(&store);
        tokio::spawn(async move {
            adapter::mexc_spot_rest::run(u, st, s).await;
        });
    }

    // All 14 venues covered: Binance Spot+Fut, MEXC Spot(REST)+Fut,
    // BingX Spot+Fut, Gate Spot+Fut, KuCoin Spot+Fut, XT Spot+Fut, Bitget Spot+Fut.
}

async fn run_spread_engine(
    universe: Arc<SymbolUniverse>,
    store: Arc<BookStore>,
    stale: Arc<StaleTable>,
    vol: Arc<VolStore>,
    counters: Arc<ScanCounters>,
    threshold_pct: f64,
    max_spread_pct: f64,
    min_vol_usd: f64,
    broadcast_ms: u64,
    bstate: BroadcastState,
    ml_server: Arc<MlServer>,
    ml_writer: WriterHandle,
    ml_broadcaster: RecommendationBroadcaster,
    ml_cycle_txs: Vec<tokio::sync::mpsc::Sender<MlCycleCommand>>,
    mut ml_buffer_recycle_rx: tokio::sync::mpsc::Receiver<MlRecycledShardBuffer>,
    shutdown_requested: Arc<AtomicBool>,
) {
    let mut buf: Vec<Opportunity> = Vec::with_capacity(1024);
    let ml_cycle_shards = ml_cycle_txs.len().max(1);
    let per_shard_initial_capacity = (4096 / ml_cycle_shards).max(256);
    let mut ml_observations_by_shard: Vec<Vec<MlCycleObservation>> = (0..ml_cycle_shards)
        .map(|_| Vec::with_capacity(per_shard_initial_capacity))
        .collect();
    let mut recycled_by_shard: Vec<Vec<Vec<MlCycleObservation>>> =
        (0..ml_cycle_shards).map(|_| Vec::new()).collect();
    let mut tick = tokio::time::interval(Duration::from_millis(broadcast_ms));
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        tick.tick().await;
        if shutdown_requested.load(Ordering::Relaxed) {
            info!("spread engine encerrando em boundary de ciclo");
            break;
        }
        let cycle_t0 = std::time::Instant::now();
        let metrics = obs::Metrics::init();
        let t0 = std::time::Instant::now();
        buf.clear();
        while let Ok(mut recycled) = ml_buffer_recycle_rx.try_recv() {
            if recycled.shard_index < recycled_by_shard.len() {
                recycled.observations.clear();
                recycled_by_shard[recycled.shard_index].push(recycled.observations);
            }
        }
        for shard_buffer in &mut ml_observations_by_shard {
            shard_buffer.clear();
        }
        scan_once_with_observer(
            &universe,
            &store,
            &stale,
            &vol,
            threshold_pct,
            max_spread_pct,
            min_vol_usd,
            &counters,
            &mut buf,
            |obs| {
                let route = RouteId {
                    symbol_id: obs.symbol_id,
                    buy_venue: obs.buy_venue,
                    sell_venue: obs.sell_venue,
                };
                let shard_index = route_shard_index(route, ml_cycle_shards);
                ml_observations_by_shard[shard_index].push(MlCycleObservation {
                    observation: *obs,
                    foreground: obs.entry_spread >= threshold_pct,
                });
            },
        );
        let elapsed_ns = t0.elapsed().as_nanos() as u64;
        metrics.record_cycle(elapsed_ns);

        let count = buf.len();
        if count > 0 {
            metrics.opportunities_total.inc_by(count as u64);
        }

        let now = now_ns();
        let cycle_seq = ml_server.begin_cycle();
        let cycle_budget_ns = broadcast_ms.saturating_mul(1_000_000);
        let mut ml_cycle_send_failure_reason: Option<&'static str> = None;
        for (shard_index, shard_buffer) in ml_observations_by_shard.iter_mut().enumerate() {
            if shard_buffer.is_empty() {
                continue;
            }
            let next_capacity = shard_buffer.capacity().max(per_shard_initial_capacity);
            let mut next_buffer = recycled_by_shard[shard_index]
                .pop()
                .unwrap_or_else(|| Vec::with_capacity(next_capacity));
            next_buffer.clear();
            if next_buffer.capacity() < next_capacity {
                next_buffer.reserve(next_capacity - next_buffer.capacity());
            }
            let observations = std::mem::replace(shard_buffer, next_buffer);
            let n_events = observations.len() as u64;
            let batch = MlCycleBatch {
                cycle_seq,
                event_time_ns: now,
                cycle_budget_ns,
                observations,
            };
            if ml_cycle_send_failure_reason.is_some() {
                let _shard_scope = metrics.enter_ml_shard(shard_index);
                let batch_t0 = std::time::Instant::now();
                process_ml_cycle_batch(&universe, &ml_server, &ml_writer, &ml_broadcaster, &batch)
                    .await;
                metrics.record_ml_shard_batch(
                    shard_index,
                    n_events,
                    batch_t0.elapsed().as_nanos() as u64,
                );
                continue;
            }
            match enqueue_ml_cycle_command_lossless(
                &metrics,
                shard_index,
                &ml_cycle_txs[shard_index],
                MlCycleCommand::Batch(batch),
                n_events,
            )
            .await
            {
                Ok(()) => {}
                Err(cmd) => {
                    match cmd {
                        MlCycleCommand::Batch(batch) => {
                            let _shard_scope = metrics.enter_ml_shard(shard_index);
                            let batch_t0 = std::time::Instant::now();
                            process_ml_cycle_batch(
                                &universe,
                                &ml_server,
                                &ml_writer,
                                &ml_broadcaster,
                                &batch,
                            )
                            .await;
                            metrics.record_ml_shard_batch(
                                shard_index,
                                n_events,
                                batch_t0.elapsed().as_nanos() as u64,
                            );
                        }
                        MlCycleCommand::Sweep { reply_tx, .. } => {
                            let _ = reply_tx.send(0);
                        }
                    }
                    ml_cycle_send_failure_reason = Some("closed");
                }
            }
        }
        if let Some(reason) = ml_cycle_send_failure_reason {
            panic!("ml_cycle strict-lossless violation: async ML cycle queue {reason}");
        }

        bstate.publish(&buf);
        metrics
            .record_full_cycle_with_budget(cycle_t0.elapsed().as_nanos() as u64, cycle_budget_ns);
    }
}

#[cfg(test)]
mod tests {
    use crate::ml::contract::{
        AbstainDiagnostic, AbstainReason, BaselineDiagnostics, CalibStatus, ReasonKind,
        Recommendation, RouteId, TradeReason, TradeSetup,
    };
    use crate::types::{SymbolId, Venue};
    use std::time::Duration;

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_trade() -> Recommendation {
        use crate::ml::contract::SourceKind;
        Recommendation::Trade(TradeSetup {
            route_id: mk_route(),
            entry_now: 2.0,
            exit_target: -1.0,
            gross_profit_target: 1.0,
            p_hit: Some(0.83),
            p_hit_ci: Some((0.77, 0.88)),
            ci_method: "wilson_marginal",
            exit_q25: Some(-1.4),
            exit_q50: Some(-1.0),
            exit_q75: Some(-0.7),
            t_hit_p25_s: Some(900),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(3120),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
                enter_at_min: 1.8,
                enter_typical: 2.0,
                enter_peak_p95: 2.8,
                p_enter_hit: 0.9,
                exit_at_min: -1.2,
                exit_typical: -1.0,
                p_exit_hit_given_enter: 0.85,
                gross_profit_p10: 0.6,
                gross_profit_p25: 0.7,
                gross_profit_median: 1.0,
                gross_profit_p75: 1.5,
                gross_profit_p90: 2.3,
                gross_profit_p95: 2.8,
                historical_base_rate_24h: 0.77,
                historical_base_rate_ci: (0.70, 0.82),
            }),
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            cluster_detection_status: "not_implemented",
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: crate::ml::ReasonDetail::placeholder(),
            },
            model_version: "baseline-a3-0.2.0".into(),
            source_kind: SourceKind::Baseline,
            emitted_at: 1_700_000_000_000_000_000,
            valid_until: 1_700_000_150_000_000_000,
        })
    }

    fn mk_abstain() -> Recommendation {
        Recommendation::Abstain {
            reason: AbstainReason::LowConfidence,
            diagnostic: AbstainDiagnostic {
                n_observations: 100,
                ci_width_if_emitted: Some(0.4),
                nearest_feasible_utility: None,
                tail_ratio_p99_p95: None,
                model_version: "a3-0.1.0".into(),
                regime_posterior: [0.6, 0.3, 0.1],
            },
        }
    }

    #[test]
    fn only_trade_recommendations_mark_samples_as_recommended() {
        assert!(super::should_mark_sample_recommended(&mk_trade()));
        assert!(!super::should_mark_sample_recommended(&mk_abstain()));
    }

    #[test]
    fn route_decimator_uses_configured_raw_decimation_mod() {
        let mut ml = crate::config::MlConfig::default();
        ml.raw_decimation_mod = 7;

        let decimator = super::route_decimator_from_ml_config(&ml);

        assert_eq!(decimator.modulus(), 7);
    }

    #[test]
    fn label_decimator_uses_configured_background_decimation_mod() {
        let mut ml = crate::config::MlConfig::default();
        ml.raw_decimation_mod = 50;
        ml.label_background_decimation_mod = 7;

        let raw_decimator = super::route_decimator_from_ml_config(&ml);
        let label_decimator = super::label_decimator_from_ml_config(&ml);

        assert_eq!(raw_decimator.modulus(), 50);
        assert_eq!(label_decimator.modulus(), 7);
    }

    #[test]
    fn label_population_policy_helpers_materialize_effective_shared_policy() {
        let mut ml = crate::config::MlConfig::default();
        ml.raw_allowlist_symbols = vec![
            " eth-usdt ".to_string(),
            "BTC-USDT".to_string(),
            "eth-usdt".to_string(),
        ];
        ml.raw_sampling_target_coverage = 0.9999;
        ml.raw_rerank_interval_s = 10;

        assert_eq!(
            super::label_allowlist_symbols_key_from_ml_config(&ml),
            "BTC-USDT,ETH-USDT"
        );
        assert_eq!(
            super::label_priority_target_coverage_from_ml_config(&ml),
            0.999
        );
        assert_eq!(
            super::label_priority_rerank_interval_s_from_ml_config(&ml),
            60
        );
    }

    #[test]
    fn ml_cycle_shard_count_uses_configured_positive_value() {
        let mut ml = crate::config::MlConfig::default();
        ml.cycle_shards = 8;

        assert_eq!(super::ml_cycle_shard_count_from_ml_config(&ml).unwrap(), 8);
    }

    #[test]
    fn ml_cycle_shard_count_rejects_non_divisor_values() {
        let mut ml = crate::config::MlConfig::default();
        ml.cycle_shards = 6;

        assert!(super::ml_cycle_shard_count_from_ml_config(&ml).is_err());
    }

    #[test]
    fn resolver_shard_assignments_cover_all_resolver_shards_once() {
        let assignments = (0..8)
            .map(|shard| super::resolver_shards_for_ml_shard(shard, 8, 32))
            .collect::<Vec<_>>();
        let mut seen = assignments
            .iter()
            .flat_map(|assignment| assignment.iter().copied())
            .collect::<Vec<_>>();
        seen.sort_unstable();

        assert_eq!(seen, (0..32).collect::<Vec<_>>());
        assert_eq!(&*assignments[0], &[0, 8, 16, 24]);
        assert_eq!(&*assignments[7], &[7, 15, 23, 31]);
    }

    #[tokio::test]
    async fn ml_cycle_enqueue_waits_for_capacity_without_reordering() {
        let metrics = crate::obs::Metrics::init();
        let (tx, mut rx) = tokio::sync::mpsc::channel(1);

        let first = super::MlCycleCommand::Batch(super::MlCycleBatch {
            cycle_seq: 1,
            event_time_ns: 10,
            cycle_budget_ns: 150_000_000,
            observations: Vec::new(),
        });
        assert!(
            super::enqueue_ml_cycle_command_lossless(&metrics, 0, &tx, first, 1)
                .await
                .is_ok()
        );

        let second = super::MlCycleCommand::Batch(super::MlCycleBatch {
            cycle_seq: 2,
            event_time_ns: 20,
            cycle_budget_ns: 150_000_000,
            observations: Vec::new(),
        });
        let enqueue_second = super::enqueue_ml_cycle_command_lossless(&metrics, 0, &tx, second, 1);
        tokio::pin!(enqueue_second);

        assert!(
            tokio::time::timeout(Duration::from_millis(10), &mut enqueue_second)
                .await
                .is_err(),
            "a full queue must backpressure instead of running the newer batch inline"
        );

        match rx.recv().await.expect("first batch") {
            super::MlCycleCommand::Batch(batch) => assert_eq!(batch.cycle_seq, 1),
            super::MlCycleCommand::Sweep { .. } => panic!("unexpected sweep"),
        }

        assert!(
            tokio::time::timeout(Duration::from_secs(1), &mut enqueue_second)
                .await
                .expect("enqueue after capacity is freed")
                .is_ok()
        );
        match rx.recv().await.expect("second batch") {
            super::MlCycleCommand::Batch(batch) => assert_eq!(batch.cycle_seq, 2),
            super::MlCycleCommand::Sweep { .. } => panic!("unexpected sweep"),
        }
    }

    #[test]
    fn route_shard_index_preserves_single_worker_path() {
        assert_eq!(super::route_shard_index(mk_route(), 1), 0);
    }

    #[test]
    fn route_shard_index_is_stable_for_same_route() {
        let route = mk_route();
        let first = super::route_shard_index(route, 8);
        for _ in 0..16 {
            assert_eq!(super::route_shard_index(route, 8), first);
        }
    }

    #[test]
    fn parquet_compaction_uses_configured_policy() {
        let mut ml = crate::config::MlConfig::default();
        ml.parquet.enabled = true;
        ml.parquet.rotation_interval_s = 300;
        ml.parquet.delete_jsonl_after_success = true;
        ml.parquet.batch_size = 8192;
        ml.parquet.zstd_level = 6;

        let parquet = super::parquet_compaction_from_ml_config(&ml).expect("parquet cfg");
        let rotation =
            super::dataset_rotation_interval_from_ml_config(&ml).expect("rotation interval");

        assert!(parquet.enabled);
        assert!(parquet.delete_jsonl_after_success);
        assert_eq!(parquet.batch_size, 8192);
        assert_eq!(parquet.zstd_level, 6);
        assert_eq!(parquet.rotation_interval_s, 300);
        assert_eq!(rotation.as_secs(), 300);
    }

    #[test]
    fn parquet_rotation_interval_rejects_unbounded_open_jsonl_window() {
        let mut ml = crate::config::MlConfig::default();
        ml.parquet.rotation_interval_s = 3601;

        let result = super::dataset_rotation_interval_from_ml_config(&ml);

        assert!(
            result.is_err(),
            "rotation_interval_s > 1h manteria JSONL quente grande demais"
        );
    }
}
