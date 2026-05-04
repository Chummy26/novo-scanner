//! Writer JSONL para `LabeledTrade` — análogo a `JsonlWriter`.
//!
//! Mesmo padrão de `persistence/writer.rs`: canal mpsc, rotação horária
//! Hive-style, flush periódico.
//!
//! Default `data_dir = data/ml/labeled_trades`. Nome de arquivo
//! `labeled-{hostname}-{pid}_{start_ts}.jsonl`.

use std::fs::{create_dir_all, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tokio::sync::{mpsc, oneshot};
use tracing::{info, warn};

use crate::ml::persistence::labeled_trade::LabeledTrade;
use crate::ml::persistence::parquet_compactor::{
    compact_jsonl_file, DatasetKind, ParquetCompactionConfig,
};
use crate::ml::persistence::writer::hour_key_for_ns;

#[derive(Debug, Clone)]
pub struct LabeledWriterConfig {
    pub data_dir: PathBuf,
    pub channel_capacity: usize,
    pub flush_after_n: usize,
    pub flush_interval: Duration,
    pub file_prefix: String,
    pub parquet: ParquetCompactionConfig,
}

impl Default for LabeledWriterConfig {
    fn default() -> Self {
        let hostname = crate::ml::util::hostname_best_effort();
        let pid = std::process::id();
        Self {
            data_dir: PathBuf::from("data/ml/labeled_trades"),
            channel_capacity: 100_000,
            flush_after_n: 512,
            flush_interval: Duration::from_secs(5),
            file_prefix: format!("labeled-{}-{}", hostname, pid),
            parquet: ParquetCompactionConfig::default(),
        }
    }
}

#[derive(Clone)]
pub struct LabeledWriterHandle {
    tx: mpsc::Sender<LabeledWriterCommand>,
}

impl LabeledWriterHandle {
    pub fn try_send(&self, sample: LabeledTrade) -> Result<(), LabeledWriterSendError> {
        self.tx
            .try_send(LabeledWriterCommand::Write(sample))
            .map_err(|e| match e {
                mpsc::error::TrySendError::Full(_) => LabeledWriterSendError::ChannelFull,
                mpsc::error::TrySendError::Closed(_) => LabeledWriterSendError::ChannelClosed,
            })
    }

    pub async fn send(&self, sample: LabeledTrade) -> Result<(), LabeledWriterSendError> {
        self.tx
            .send(LabeledWriterCommand::Write(sample))
            .await
            .map_err(|_| LabeledWriterSendError::ChannelClosed)
    }

    pub async fn seal_current_file(&self) -> Result<LabeledWriterStats, LabeledWriterSendError> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.tx
            .send(LabeledWriterCommand::Seal { reply: reply_tx })
            .await
            .map_err(|_| LabeledWriterSendError::ChannelClosed)?;
        reply_rx
            .await
            .map_err(|_| LabeledWriterSendError::ChannelClosed)
    }
}

enum LabeledWriterCommand {
    Write(LabeledTrade),
    Seal {
        reply: oneshot::Sender<LabeledWriterStats>,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LabeledWriterStats {
    pub total_written: u64,
    pub total_dropped: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LabeledWriterSendError {
    ChannelFull,
    ChannelClosed,
}

pub struct LabeledJsonlWriter {
    cfg: LabeledWriterConfig,
    rx: mpsc::Receiver<LabeledWriterCommand>,
    current_hour_key: Option<String>,
    writer: Option<BufWriter<std::fs::File>>,
    current_path: Option<PathBuf>,
    lines_since_flush: usize,
    total_written: u64,
    total_dropped: u64,
    compaction_tasks: Vec<tokio::task::JoinHandle<()>>,
}

impl LabeledJsonlWriter {
    pub fn create(cfg: LabeledWriterConfig) -> (Self, LabeledWriterHandle) {
        let (tx, rx) = mpsc::channel(cfg.channel_capacity);
        (
            Self {
                cfg,
                rx,
                current_hour_key: None,
                writer: None,
                current_path: None,
                lines_since_flush: 0,
                total_written: 0,
                total_dropped: 0,
                compaction_tasks: Vec::new(),
            },
            LabeledWriterHandle { tx },
        )
    }

    pub async fn run(mut self) {
        info!(
            data_dir = %self.cfg.data_dir.display(),
            channel_capacity = self.cfg.channel_capacity,
            "ML labeled-trade writer iniciado"
        );

        let mut flush_interval = tokio::time::interval(self.cfg.flush_interval);
        flush_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

        loop {
            tokio::select! {
                biased;
                _ = flush_interval.tick() => {
                    self.periodic_flush();
                }
                maybe = self.rx.recv() => {
                    match maybe {
                        Some(LabeledWriterCommand::Write(l)) => self.write_one(l).await,
                        Some(LabeledWriterCommand::Seal { reply }) => {
                            self.close_current_file();
                            self.await_pending_compactions().await;
                            let _ = reply.send(self.stats());
                        }
                        None => {
                            info!(
                                total_written = self.total_written,
                                "ML labeled-trade writer encerrando (canal fechado)"
                            );
                            self.periodic_flush();
                            self.close_current_file();
                            self.await_pending_compactions().await;
                            break;
                        }
                    }
                }
            }
        }
    }

    async fn write_one(&mut self, mut label: LabeledTrade) {
        label.written_ts_ns = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos().min(u64::MAX as u128) as u64)
            .unwrap_or(label.closed_ts_ns);
        let hour_key = hour_key_for_ns(label.closed_ts_ns);
        if self.current_hour_key.as_deref() != Some(hour_key.as_str()) {
            self.close_current_file();
            match self.open_writer_for_hour(&hour_key) {
                Ok((w, path)) => {
                    self.writer = Some(w);
                    self.current_path = Some(path);
                    self.current_hour_key = Some(hour_key);
                }
                Err(e) => {
                    warn!(error = %e, "labeled writer: falha ao abrir arquivo; sample descartada");
                    self.total_dropped = self.total_dropped.saturating_add(1);
                    return;
                }
            }
        }
        let Some(writer) = self.writer.as_mut() else {
            self.total_dropped = self.total_dropped.saturating_add(1);
            return;
        };
        let line = label.to_json_line();
        if let Err(e) = writeln!(writer, "{}", line) {
            warn!(error = %e, "labeled writer: erro ao escrever; sample descartada");
            self.total_dropped = self.total_dropped.saturating_add(1);
            return;
        }
        self.total_written = self.total_written.saturating_add(1);
        self.lines_since_flush = self.lines_since_flush.saturating_add(1);
        if self.lines_since_flush >= self.cfg.flush_after_n {
            let _ = writer.flush();
            self.lines_since_flush = 0;
        }
    }

    fn periodic_flush(&mut self) {
        if let Some(w) = self.writer.as_mut() {
            let _ = w.flush();
            self.lines_since_flush = 0;
        }
    }

    fn close_current_file(&mut self) {
        if let Some(mut w) = self.writer.take() {
            let _ = w.flush();
        }
        let Some(path) = self.current_path.take() else {
            return;
        };
        self.lines_since_flush = 0;

        if !self.cfg.parquet.enabled {
            return;
        }

        let parquet_cfg = self.cfg.parquet.clone();
        let handle = tokio::task::spawn_blocking(move || {
            match compact_jsonl_file(&path, DatasetKind::LabeledTrades, &parquet_cfg) {
                Ok(Some(parquet_path)) => {
                    info!(
                        source = %path.display(),
                        parquet = %parquet_path.display(),
                        "ML labeled writer compactou partição horária para parquet"
                    );
                }
                Ok(None) => {}
                Err(e) => {
                    warn!(
                        error = %e,
                        path = %path.display(),
                        "ML labeled writer falhou ao compactar JSONL para parquet"
                    );
                }
            }
        });
        self.compaction_tasks.push(handle);
    }

    async fn await_pending_compactions(&mut self) {
        while let Some(handle) = self.compaction_tasks.pop() {
            if let Err(e) = handle.await {
                warn!(error = %e, "ML labeled writer compaction task join falhou");
            }
        }
    }

    fn stats(&self) -> LabeledWriterStats {
        LabeledWriterStats {
            total_written: self.total_written,
            total_dropped: self.total_dropped,
        }
    }

    fn open_writer_for_hour(
        &self,
        hour_key: &str,
    ) -> std::io::Result<(BufWriter<std::fs::File>, PathBuf)> {
        let dir_path = self.cfg.data_dir.join(hour_key);
        create_dir_all(&dir_path)?;
        let start_ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let filename = format!("{}_{}.jsonl", self.cfg.file_prefix, start_ts);
        let path = dir_path.join(filename);
        let file = OpenOptions::new().create(true).append(true).open(&path)?;
        info!(path = %path.display(), "labeled writer: abrindo novo arquivo");
        Ok((BufWriter::with_capacity(64 * 1024, file), path))
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::contract::RouteId;
    use crate::ml::persistence::labeled_trade::{
        CensorReason, FeaturesT0, FloorHitLabel, LabelOutcome, LabeledTrade, PolicyMetadata,
        LABELED_TRADE_SCHEMA_VERSION,
    };
    use crate::ml::SCANNER_VERSION;
    use crate::types::{SymbolId, Venue};

    fn mk_label(horizon_s: u32, ts_written_ns: u64) -> LabeledTrade {
        LabeledTrade {
            sample_id: "deadbeef12345678deadbeef12345678".into(),
            sample_decision: "accept",
            horizon_s,
            ts_emit_ns: 1_745_159_400u64 * 1_000_000_000,
            cycle_seq: 1,
            schema_version: LABELED_TRADE_SCHEMA_VERSION,
            scanner_version: SCANNER_VERSION,
            route_id: RouteId {
                symbol_id: SymbolId(7),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
            cluster_id: "0000000000000000".into(),
            cluster_size: 1,
            cluster_rank: 1,
            runtime_config_hash: "0000000000000000".into(),
            priority_set_generation_id: 0,
            priority_set_updated_at_ns: 0,
            symbol_name: "BTC-USDT".into(),
            entry_locked_pct: 2.5,
            exit_start_pct: -1.2,
            features_t0: FeaturesT0 {
                half_spread_buy_now: None,
                half_spread_sell_now: None,
                tail_ratio_p99_p95: None,
                entry_p25_24h: None,
                entry_p50_24h: None,
                entry_p75_24h: None,
                entry_p95_24h: None,
                entry_rank_percentile_24h: None,
                entry_minus_p50_24h: None,
                entry_mad_robust_24h: None,
                exit_p25_24h: None,
                exit_p50_24h: None,
                exit_p75_24h: None,
                exit_p95_24h: None,
                p_exit_ge_label_floor_minus_entry_24h: None,
                entry_p50_1h: None,
                entry_rank_percentile_1h: None,
                p_exit_ge_label_floor_minus_entry_1h: None,
                entry_p50_7d: None,
                entry_p95_7d: None,
                p_exit_ge_label_floor_minus_entry_7d: None,
                gross_run_p05_s: None,
                gross_run_p50_s: None,
                gross_run_p95_s: None,
                exit_excess_run_s: None,
                n_cache_observations_at_t0: 0,
                oldest_cache_ts_ns: 0,
                time_alive_at_t0_s: None,
                listing_age_days: None,
                route_first_seen_ns: None,
                route_last_seen_ns: None,
                route_active_until_ns: None,
                route_n_snapshots: None,
            },
            audit_hindsight_best_exit_pct: Some(-0.3),
            audit_hindsight_best_exit_ts_ns: Some(
                1_745_159_400u64 * 1_000_000_000 + 300_000_000_000,
            ),
            audit_hindsight_best_gross_pct: Some(2.2),
            audit_hindsight_t_to_best_s: Some(300),
            n_clean_future_samples: 60,
            label_floor_pct: 0.8,
            first_exit_ge_label_floor_ts_ns: None,
            first_exit_ge_label_floor_pct: None,
            t_to_first_hit_s: None,
            label_floor_hits: vec![FloorHitLabel {
                floor_pct: 0.8,
                first_exit_ge_floor_ts_ns: None,
                first_exit_ge_floor_pct: None,
                t_to_first_hit_s: None,
                realized: false,
            }],
            outcome: LabelOutcome::Miss,
            censor_reason: None,
            observed_until_ns: 1_745_159_400u64 * 1_000_000_000 + 900_000_000_000,
            label_window_closed_at_ns: 1_745_159_400u64 * 1_000_000_000
                + (horizon_s as u64) * 1_000_000_000,
            closed_ts_ns: ts_written_ns,
            written_ts_ns: ts_written_ns,
            policy_metadata: PolicyMetadata {
                baseline_model_version: "baseline-a3-0.2.0".into(),
                baseline_recommended: false,
                recommendation_kind: "abstain",
                abstain_reason: Some("NO_OPPORTUNITY"),
                prediction_source_kind: "baseline",
                prediction_model_version: "baseline-a3-0.2.0".into(),
                prediction_emitted_at_ns: None,
                prediction_valid_until_ns: None,
                prediction_entry_now: None,
                prediction_exit_target: None,
                prediction_gross_profit_target: None,
                prediction_p_hit: None,
                prediction_p_hit_ci_lo: None,
                prediction_p_hit_ci_hi: None,
                prediction_exit_q25: None,
                prediction_exit_q50: None,
                prediction_exit_q75: None,
                prediction_t_hit_p25_s: None,
                prediction_t_hit_median_s: None,
                prediction_t_hit_p75_s: None,
                prediction_p_censor: None,
                prediction_calibration_status: "not_applicable",
                baseline_historical_base_rate_24h: None,
                baseline_derived_enter_at_min: None,
                baseline_derived_exit_at_min: None,
                baseline_floor_pct: 0.8,
                label_stride_s: 60,
                effective_stride_s: 60,
                label_sampling_probability: 1.0,
                candidates_in_route_last_24h: 0,
                accepts_in_route_last_24h: 0,
                ci_method: "wilson_marginal",
            },
            sampling_tier: "decimated_uniform",
            sampling_probability: 0.1,
            sampling_probability_kind: "marginal_uniform",
        }
    }

    #[tokio::test]
    async fn writes_and_rotates_by_hour() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 16,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(100),
            file_prefix: "labtest".into(),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = LabeledJsonlWriter::create(cfg);
        let task = tokio::spawn(writer.run());

        // Duas horas distintas (hour=14 e hour=15).
        let ts14 = 1_745_159_400u64 * 1_000_000_000;
        let ts15 = 1_745_161_200u64 * 1_000_000_000;
        handle.try_send(mk_label(900, ts14)).expect("send 14");
        handle.try_send(mk_label(1800, ts15)).expect("send 15");

        tokio::time::sleep(Duration::from_millis(300)).await;
        drop(handle);
        task.await.expect("task join");

        let h14 = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let h15 = tmp.path().join("year=2025/month=04/day=20/hour=15");
        assert!(h14.exists());
        assert!(h15.exists());
    }

    #[tokio::test]
    async fn backpressure_drops_without_blocking() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1,
            flush_after_n: 1,
            flush_interval: Duration::from_secs(60),
            file_prefix: "labtest".into(),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (_writer, handle) = LabeledJsonlWriter::create(cfg);
        let l = mk_label(900, 1_745_159_400u64 * 1_000_000_000);
        assert!(handle.try_send(l.clone()).is_ok());
        match handle.try_send(l) {
            Err(LabeledWriterSendError::ChannelFull) => {}
            other => panic!("expected ChannelFull, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn censored_label_serializes_with_reason() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 16,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(100),
            file_prefix: "labtest".into(),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = LabeledJsonlWriter::create(cfg);
        let task = tokio::spawn(writer.run());

        let ts14 = 1_745_159_400u64 * 1_000_000_000;
        let mut l = mk_label(900, ts14);
        l.outcome = LabelOutcome::Censored;
        l.censor_reason = Some(CensorReason::RouteDelisted);
        l.audit_hindsight_best_exit_pct = None;
        l.audit_hindsight_best_gross_pct = None;
        handle.try_send(l).expect("send censored");

        tokio::time::sleep(Duration::from_millis(300)).await;
        drop(handle);
        task.await.expect("task join");

        let dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let files: Vec<_> = std::fs::read_dir(&dir).unwrap().collect();
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let v: serde_json::Value = serde_json::from_str(content.lines().next().unwrap()).unwrap();
        assert_eq!(v["outcome"], "censored");
        assert_eq!(v["censor_reason"], "route_delisted");
    }

    #[tokio::test]
    async fn writer_compacts_closed_hour_to_parquet() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 16,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(100),
            file_prefix: "labtest".into(),
            parquet: ParquetCompactionConfig::default(),
        };
        let (writer, handle) = LabeledJsonlWriter::create(cfg);
        let task = tokio::spawn(writer.run());

        let ts14 = 1_745_159_400u64 * 1_000_000_000;
        handle.try_send(mk_label(900, ts14)).expect("send labeled");

        tokio::time::sleep(Duration::from_millis(200)).await;
        drop(handle);
        task.await.expect("task join");

        let hour14 = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let parquet_files: Vec<_> = std::fs::read_dir(&hour14)
            .unwrap()
            .filter_map(|e| {
                let p = e.ok()?.path();
                (p.extension().and_then(|s| s.to_str()) == Some("parquet")).then_some(p)
            })
            .collect();
        let jsonl_files: Vec<_> = std::fs::read_dir(&hour14)
            .unwrap()
            .filter_map(|e| {
                let p = e.ok()?.path();
                (p.extension().and_then(|s| s.to_str()) == Some("jsonl")).then_some(p)
            })
            .collect();

        assert_eq!(
            parquet_files.len(),
            1,
            "labeled writer deve finalizar em parquet"
        );
        assert!(
            jsonl_files.is_empty(),
            "jsonl intermediário do labeled writer deve ser removido após compactação"
        );
    }
}
