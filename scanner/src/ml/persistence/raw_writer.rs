//! Writer JSONL para `RawSample` (ADR-025).
//!
//! Segue o mesmo padrão do [`JsonlWriter`](super::writer::JsonlWriter)
//! para `AcceptedSample`, mas com duas diferenças:
//!
//! 1. **Data dir default** diferente: `data/ml/raw_samples/` (vs
//!    `data/ml/accepted_samples/`). Assim os dois datasets são
//!    consumidos independentemente pelo trainer.
//! 2. **Prefixo de arquivo** diferente (`raw-{hostname}-{pid}`) para
//!    evitar colisão caso algum operador configure ambos para o mesmo
//!    data_dir por acidente.
//!
//! Core rotation logic (hour-key helper) é importado de
//! [`super::writer::hour_key_for_ns`] — ponto único de verdade.

use std::fs::{create_dir_all, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::ml::persistence::raw_sample::RawSample;
use crate::ml::persistence::writer::hour_key_for_ns;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct RawWriterConfig {
    pub data_dir: PathBuf,
    pub channel_capacity: usize,
    pub flush_after_n: usize,
    pub flush_interval: Duration,
    pub file_prefix: String,
}

impl Default for RawWriterConfig {
    fn default() -> Self {
        let hostname = hostname_best_effort();
        let pid = std::process::id();
        Self {
            data_dir: PathBuf::from("data/ml/raw_samples"),
            channel_capacity: 100_000,
            flush_after_n: 1024,
            flush_interval: Duration::from_secs(5),
            file_prefix: format!("raw-{}-{}", hostname, pid),
        }
    }
}

fn hostname_best_effort() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "scanner".into())
}

// ---------------------------------------------------------------------------
// Handle
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct RawWriterHandle {
    tx: mpsc::Sender<RawSample>,
}

impl RawWriterHandle {
    pub fn try_send(&self, sample: RawSample) -> Result<(), RawWriterSendError> {
        self.tx.try_send(sample).map_err(|e| match e {
            mpsc::error::TrySendError::Full(_) => RawWriterSendError::ChannelFull,
            mpsc::error::TrySendError::Closed(_) => RawWriterSendError::ChannelClosed,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RawWriterSendError {
    ChannelFull,
    ChannelClosed,
}

// ---------------------------------------------------------------------------
// Writer task
// ---------------------------------------------------------------------------

pub struct RawSampleWriter {
    cfg: RawWriterConfig,
    rx: mpsc::Receiver<RawSample>,
    current_hour_key: Option<String>,
    writer: Option<BufWriter<std::fs::File>>,
    lines_since_flush: usize,
    total_written: u64,
    total_dropped: u64,
}

impl RawSampleWriter {
    pub fn create(cfg: RawWriterConfig) -> (Self, RawWriterHandle) {
        let (tx, rx) = mpsc::channel(cfg.channel_capacity);
        let writer = Self {
            cfg,
            rx,
            current_hour_key: None,
            writer: None,
            lines_since_flush: 0,
            total_written: 0,
            total_dropped: 0,
        };
        (writer, RawWriterHandle { tx })
    }

    pub async fn run(mut self) {
        info!(
            data_dir = %self.cfg.data_dir.display(),
            channel_capacity = self.cfg.channel_capacity,
            "ML raw-sample writer iniciado"
        );

        let mut flush_interval = tokio::time::interval(self.cfg.flush_interval);
        flush_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

        loop {
            tokio::select! {
                biased;
                _ = flush_interval.tick() => {
                    self.periodic_flush();
                }
                maybe_sample = self.rx.recv() => {
                    match maybe_sample {
                        Some(sample) => self.write_one(sample),
                        None => {
                            info!(
                                total_written = self.total_written,
                                "ML raw-sample writer encerrando (canal fechado)"
                            );
                            self.periodic_flush();
                            break;
                        }
                    }
                }
            }
        }
    }

    fn write_one(&mut self, sample: RawSample) {
        let hour_key = hour_key_for_ns(sample.ts_ns);
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
                    warn!(error = %e, "ML raw writer: falha ao abrir arquivo; sample descartada");
                    self.total_dropped = self.total_dropped.saturating_add(1);
                    return;
                }
            }
        }

        let Some(writer) = self.writer.as_mut() else {
            self.total_dropped = self.total_dropped.saturating_add(1);
            return;
        };

        let line = sample.to_json_line();
        if let Err(e) = writeln!(writer, "{}", line) {
            warn!(error = %e, "ML raw writer: erro ao escrever; sample descartada");
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
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        info!(path = %path.display(), "ML raw writer: abrindo novo arquivo");
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
    use crate::ml::persistence::raw_sample::RAW_SAMPLE_SCHEMA_VERSION;
    use crate::ml::trigger::SampleDecision;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    #[tokio::test]
    async fn writer_writes_and_rotates() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 16,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(100),
            file_prefix: "rawtest".into(),
        };
        let (writer, handle) = RawSampleWriter::create(cfg);
        let task = tokio::spawn(writer.run());

        let route = mk_route();
        // Hora 14.
        let s1 = RawSample::new(
            1_745_159_400u64 * 1_000_000_000,
            0, route, "BTC-USDT", 2.0, -1.0, 50, 50, 1e6, 1e6,
            false, SampleDecision::Accept,
        );
        // Hora 15.
        let s2 = RawSample::new(
            1_745_161_200u64 * 1_000_000_000,
            1, route, "BTC-USDT", 2.1, -1.1, 50, 50, 1e6, 1e6,
            true, SampleDecision::RejectHalt,
        );
        handle.try_send(s1).expect("send s1");
        handle.try_send(s2).expect("send s2");

        tokio::time::sleep(Duration::from_millis(300)).await;
        drop(handle);
        task.await.expect("task join");

        let hour14 = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let hour15 = tmp.path().join("year=2025/month=04/day=20/hour=15");
        assert!(hour14.exists(), "hora 14 deve existir");
        assert!(hour15.exists(), "hora 15 deve existir");

        let files_h14: Vec<_> = std::fs::read_dir(&hour14).unwrap().collect();
        let content = std::fs::read_to_string(files_h14[0].as_ref().unwrap().path()).unwrap();
        let lines: Vec<_> = content.lines().collect();
        assert_eq!(lines.len(), 1);
        let v: serde_json::Value = serde_json::from_str(lines[0]).unwrap();
        assert_eq!(v["halt_active"], false);
        assert_eq!(v["sample_decision"], "accept");
        assert_eq!(
            v["schema_version"].as_u64().unwrap() as u16,
            RAW_SAMPLE_SCHEMA_VERSION,
        );
    }

    #[tokio::test]
    async fn backpressure_drops_without_blocking() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1,
            flush_after_n: 1,
            flush_interval: Duration::from_secs(60),
            file_prefix: "rawtest".into(),
        };
        let (_writer, handle) = RawSampleWriter::create(cfg);
        let s = RawSample::new(
            1_745_159_400u64 * 1_000_000_000,
            0, mk_route(), "BTC-USDT", 2.0, -1.0, 50, 50, 1e6, 1e6,
            false, SampleDecision::Accept,
        );
        assert!(handle.try_send(s.clone()).is_ok());
        match handle.try_send(s) {
            Err(RawWriterSendError::ChannelFull) => {}
            other => panic!("expected ChannelFull, got {:?}", other),
        }
    }
}
