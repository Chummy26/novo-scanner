//! Writer JSONL para `LabeledTrade` (Wave V — análogo a `JsonlWriter`).
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

use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::ml::persistence::labeled_trade::LabeledTrade;
use crate::ml::persistence::writer::hour_key_for_ns;

#[derive(Debug, Clone)]
pub struct LabeledWriterConfig {
    pub data_dir: PathBuf,
    pub channel_capacity: usize,
    pub flush_after_n: usize,
    pub flush_interval: Duration,
    pub file_prefix: String,
}

impl Default for LabeledWriterConfig {
    fn default() -> Self {
        let hostname = hostname_best_effort();
        let pid = std::process::id();
        Self {
            data_dir: PathBuf::from("data/ml/labeled_trades"),
            channel_capacity: 100_000,
            flush_after_n: 512,
            flush_interval: Duration::from_secs(5),
            file_prefix: format!("labeled-{}-{}", hostname, pid),
        }
    }
}

fn hostname_best_effort() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "scanner".into())
}

#[derive(Clone)]
pub struct LabeledWriterHandle {
    tx: mpsc::Sender<LabeledTrade>,
}

impl LabeledWriterHandle {
    pub fn try_send(&self, sample: LabeledTrade) -> Result<(), LabeledWriterSendError> {
        self.tx.try_send(sample).map_err(|e| match e {
            mpsc::error::TrySendError::Full(_) => LabeledWriterSendError::ChannelFull,
            mpsc::error::TrySendError::Closed(_) => LabeledWriterSendError::ChannelClosed,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LabeledWriterSendError {
    ChannelFull,
    ChannelClosed,
}

pub struct LabeledJsonlWriter {
    cfg: LabeledWriterConfig,
    rx: mpsc::Receiver<LabeledTrade>,
    current_hour_key: Option<String>,
    writer: Option<BufWriter<std::fs::File>>,
    lines_since_flush: usize,
    total_written: u64,
    total_dropped: u64,
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
                lines_since_flush: 0,
                total_written: 0,
                total_dropped: 0,
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
                        Some(l) => self.write_one(l),
                        None => {
                            info!(
                                total_written = self.total_written,
                                "ML labeled-trade writer encerrando (canal fechado)"
                            );
                            self.periodic_flush();
                            break;
                        }
                    }
                }
            }
        }
    }

    fn write_one(&mut self, label: LabeledTrade) {
        let hour_key = hour_key_for_ns(label.written_ts_ns);
        if self.current_hour_key.as_deref() != Some(hour_key.as_str()) {
            if let Some(mut w) = self.writer.take() {
                let _ = w.flush();
            }
            match self.open_writer_for_hour(&hour_key) {
                Ok(w) => {
                    self.writer = Some(w);
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

    fn open_writer_for_hour(&self, hour_key: &str) -> std::io::Result<BufWriter<std::fs::File>> {
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
        Ok(BufWriter::with_capacity(64 * 1024, file))
    }

    pub fn total_written(&self) -> u64 {
        self.total_written
    }
    pub fn total_dropped(&self) -> u64 {
        self.total_dropped
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
        CensorReason, FeaturesT0, LabelOutcome, LabeledTrade, PolicyMetadata,
        LABELED_TRADE_SCHEMA_VERSION, SCANNER_VERSION,
    };
    use crate::types::{SymbolId, Venue};

    fn mk_label(horizon_s: u32, ts_written_ns: u64) -> LabeledTrade {
        LabeledTrade {
            sample_id: "deadbeef12345678deadbeef12345678".into(),
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
            symbol_name: "BTC-USDT".into(),
            entry_locked_pct: 2.5,
            exit_start_pct: -1.2,
            features_t0: FeaturesT0 {
                buy_vol24: 1e6,
                sell_vol24: 2e6,
                tail_ratio_p99_p95: None,
                entry_p25_24h: None,
                entry_p50_24h: None,
                entry_p75_24h: None,
                entry_p95_24h: None,
                exit_p25_24h: None,
                exit_p50_24h: None,
                exit_p75_24h: None,
                exit_p95_24h: None,
                gross_run_p05_s: None,
                gross_run_p50_s: None,
                gross_run_p95_s: None,
                listing_age_days: None,
            },
            best_exit_pct: Some(-0.3),
            best_exit_ts_ns: Some(1_745_159_400u64 * 1_000_000_000 + 300_000_000_000),
            best_gross_pct: Some(2.2),
            t_to_best_s: Some(300),
            n_clean_future_samples: 60,
            label_floor_pct: 0.8,
            first_exit_ge_label_floor_ts_ns: None,
            first_exit_ge_label_floor_pct: None,
            t_to_first_hit_s: None,
            outcome: LabelOutcome::Miss,
            censor_reason: None,
            observed_until_ns: 1_745_159_400u64 * 1_000_000_000 + 900_000_000_000,
            closed_ts_ns: ts_written_ns,
            written_ts_ns: ts_written_ns,
            policy_metadata: PolicyMetadata {
                baseline_model_version: "baseline-a3-0.2.0".into(),
                baseline_recommended: false,
                baseline_historical_base_rate_24h: None,
                baseline_derived_enter_at_min: None,
                baseline_derived_exit_at_min: None,
                baseline_floor_pct: 0.8,
                label_stride_s: 60,
                label_sampling_probability: 1.0,
            },
            sampling_tier: "decimated_uniform",
            sampling_probability: 0.1,
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
        };
        let (writer, handle) = LabeledJsonlWriter::create(cfg);
        let task = tokio::spawn(writer.run());

        let ts14 = 1_745_159_400u64 * 1_000_000_000;
        let mut l = mk_label(900, ts14);
        l.outcome = LabelOutcome::Censored;
        l.censor_reason = Some(CensorReason::RouteVanished);
        l.best_exit_pct = None;
        l.best_gross_pct = None;
        handle.try_send(l).expect("send censored");

        tokio::time::sleep(Duration::from_millis(300)).await;
        drop(handle);
        task.await.expect("task join");

        let dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let files: Vec<_> = std::fs::read_dir(&dir).unwrap().collect();
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let v: serde_json::Value = serde_json::from_str(content.lines().next().unwrap()).unwrap();
        assert_eq!(v["outcome"], "censored");
        assert_eq!(v["censor_reason"], "route_vanished");
    }
}
