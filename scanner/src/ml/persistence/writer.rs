//! Writer JSONL com rotação horária.
//!
//! Implementa **C1 fix (MVP)** — persistência do dataset de treino.
//!
//! # Arquitetura
//!
//! ```text
//!   [MlServer::on_opportunity] --Option<AcceptedSample>--+
//!                                                       |
//!   [lib.rs loop] --tokio::mpsc::channel(100k)---------->+
//!                                                       |
//!                           [JsonlWriter task]<---------+
//!                                  |
//!                                  v  (rotação horária)
//!   {data_dir}/year=YYYY/month=MM/day=DD/hour=HH/{hostname}_{start_ts}.jsonl
//! ```
//!
//! # Properties
//!
//! - **Canal bounded 100k**: cobre picos de ~100 min a 17 req/s sem
//!   backpressure. Em overflow, `try_send` descarta — acepitável para
//!   shadow mode (contagem em `ServerMetrics` marca perdas).
//! - **Rotação por hora UTC**: arquivos < 100 MB gz típico.
//! - **Append-only**: writer flush via `BufWriter::flush()` a cada
//!   5s ou a cada `flush_after_n` linhas (default 1024) — garante
//!   durabilidade sem sobrecarregar FS.
//! - **Crash recovery**: ao restart, novo arquivo é criado (append no
//!   existente da hora se houver). Trainer Python dedup via `ts_ns +
//!   cycle_seq + route_id` se necessário.

use std::fs::{create_dir_all, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::ml::persistence::parquet_compactor::{
    compact_jsonl_file, DatasetKind, ParquetCompactionConfig,
};
use crate::ml::persistence::sample::AcceptedSample;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct WriterConfig {
    /// Diretório base para gravação. Subdirs `year=/month=/day=/hour=/` são
    /// criados automaticamente.
    pub data_dir: PathBuf,
    /// Capacidade do canal mpsc. Default 100_000.
    pub channel_capacity: usize,
    /// Flush para disco após N linhas escritas. Default 1024.
    pub flush_after_n: usize,
    /// Flush para disco após este intervalo. Default 5 segundos.
    pub flush_interval: Duration,
    /// Prefixo para nome de arquivo (antes de `_{start_ts}.jsonl`).
    /// Default: hostname + pid. Permite múltiplos scanners no mesmo
    /// disco sem conflito.
    pub file_prefix: String,
    /// Compactação assíncrona do JSONL fechado para Parquet/ZSTD.
    pub parquet: ParquetCompactionConfig,
}

impl Default for WriterConfig {
    fn default() -> Self {
        let hostname = hostname_best_effort();
        let pid = std::process::id();
        Self {
            data_dir: PathBuf::from("data/ml/accepted_samples"),
            channel_capacity: 100_000,
            flush_after_n: 1024,
            flush_interval: Duration::from_secs(5),
            file_prefix: format!("{}-{}", hostname, pid),
            parquet: ParquetCompactionConfig::default(),
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

/// Handle para enviar `AcceptedSample` ao writer task. Clone é barato
/// (compartilha o `Sender` via tokio).
#[derive(Clone)]
pub struct WriterHandle {
    tx: mpsc::Sender<AcceptedSample>,
}

impl WriterHandle {
    /// Envia uma amostra sem bloquear. Retorna `Err` se o canal está
    /// cheio (backpressure) — caller deve incrementar counter e continuar.
    pub fn try_send(&self, sample: AcceptedSample) -> Result<(), WriterSendError> {
        self.tx.try_send(sample).map_err(|e| match e {
            mpsc::error::TrySendError::Full(_) => WriterSendError::ChannelFull,
            mpsc::error::TrySendError::Closed(_) => WriterSendError::ChannelClosed,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WriterSendError {
    /// Canal cheio — consumer atrasou. Caller deve dropar a amostra e
    /// incrementar métrica de perda.
    ChannelFull,
    /// Writer task encerrou — bug ou shutdown. Drop e alert.
    ChannelClosed,
}

// ---------------------------------------------------------------------------
// Writer task
// ---------------------------------------------------------------------------

/// Task background que consome `AcceptedSample` do canal e escreve em
/// arquivos JSONL com rotação horária.
pub struct JsonlWriter {
    cfg: WriterConfig,
    rx: mpsc::Receiver<AcceptedSample>,
    current_hour_key: Option<String>,
    writer: Option<BufWriter<std::fs::File>>,
    current_path: Option<PathBuf>,
    lines_since_flush: usize,
    total_written: u64,
    total_dropped: u64,
    compaction_tasks: Vec<tokio::task::JoinHandle<()>>,
}

impl JsonlWriter {
    /// Cria um novo par `(writer_task, handle)`. Consumer gasta o task via
    /// `tokio::spawn(writer.run())`. Handle é dado ao produtor.
    pub fn create(cfg: WriterConfig) -> (Self, WriterHandle) {
        let (tx, rx) = mpsc::channel(cfg.channel_capacity);
        let writer = Self {
            cfg,
            rx,
            current_hour_key: None,
            writer: None,
            current_path: None,
            lines_since_flush: 0,
            total_written: 0,
            total_dropped: 0,
            compaction_tasks: Vec::new(),
        };
        (writer, WriterHandle { tx })
    }

    /// Consome o canal. Encerra quando o canal é fechado (todos handles
    /// dropped) ou o processo recebe shutdown.
    pub async fn run(mut self) {
        info!(
            data_dir = %self.cfg.data_dir.display(),
            channel_capacity = self.cfg.channel_capacity,
            "ML dataset writer iniciado"
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
                        Some(sample) => self.write_one(sample).await,
                        None => {
                            info!(
                                total_written = self.total_written,
                                "ML dataset writer encerrando (canal fechado)"
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

    async fn write_one(&mut self, sample: AcceptedSample) {
        let hour_key = hour_key_for_ns(sample.ts_ns);
        if self.current_hour_key.as_deref() != Some(hour_key.as_str()) {
            self.close_current_file();
            match self.open_writer_for_hour(&hour_key) {
                Ok((w, path)) => {
                    self.writer = Some(w);
                    self.current_path = Some(path);
                    self.current_hour_key = Some(hour_key);
                }
                Err(e) => {
                    warn!(error = %e, "ML writer: falha ao abrir arquivo; sample descartada");
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
            warn!(error = %e, "ML writer: erro ao escrever; sample descartada");
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
            match compact_jsonl_file(&path, DatasetKind::AcceptedSamples, &parquet_cfg) {
                Ok(Some(parquet_path)) => {
                    info!(
                        source = %path.display(),
                        parquet = %parquet_path.display(),
                        "ML accepted writer compactou partição horária para parquet"
                    );
                }
                Ok(None) => {}
                Err(e) => {
                    warn!(
                        error = %e,
                        path = %path.display(),
                        "ML accepted writer falhou ao compactar JSONL para parquet"
                    );
                }
            }
        });
        self.compaction_tasks.push(handle);
    }

    async fn await_pending_compactions(&mut self) {
        while let Some(handle) = self.compaction_tasks.pop() {
            if let Err(e) = handle.await {
                warn!(error = %e, "ML accepted writer compaction task join falhou");
            }
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
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        info!(path = %path.display(), "ML writer: abrindo novo arquivo");
        Ok((BufWriter::with_capacity(64 * 1024, file), path))
    }

    pub fn total_written(&self) -> u64 {
        self.total_written
    }

    pub fn total_dropped(&self) -> u64 {
        self.total_dropped
    }
}

// ---------------------------------------------------------------------------
// Partitioning helpers
// ---------------------------------------------------------------------------

/// `ns` → `"year=2026/month=04/day=20/hour=14"`.
///
/// Uses UTC. Precisão: hora (3600 s). Particionamento compatível com
/// Hive/Spark/DataFusion partition pruning.
pub fn hour_key_for_ns(ns: u64) -> String {
    let secs = ns / 1_000_000_000;
    // Algoritmo simples para UTC (sem timezone crate).
    // Válido até 2106-02-07 (u32 seconds overflow; ns cobre muito além disso).
    let days = secs / 86_400;
    let hour = (secs % 86_400) / 3600;
    let (year, month, day) = days_to_ymd(days);
    format!(
        "year={:04}/month={:02}/day={:02}/hour={:02}",
        year, month, day, hour
    )
}

/// Conversão de dias UNIX para (year, month, day) UTC. Implementação
/// canônica simples; não depende de crate.
fn days_to_ymd(days: u64) -> (u32, u32, u32) {
    // 1970-01-01 = day 0.
    let mut y: i64 = 1970;
    let mut remaining = days as i64;
    loop {
        let days_in_year = if is_leap(y) { 366 } else { 365 };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }
    let month_lengths = if is_leap(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut month = 1;
    for &mlen in &month_lengths {
        if remaining < mlen {
            break;
        }
        remaining -= mlen;
        month += 1;
    }
    let day = remaining + 1;
    (y as u32, month, day as u32)
}

#[inline]
fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::contract::RouteId;
    use crate::ml::trigger::SampleDecision;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    #[test]
    fn hour_key_format_is_hive_partition_style() {
        // 2025-04-20 14:30 UTC.
        // 1_745_107_200 = 2025-04-20 00:00 UTC; +14.5h = 1_745_159_400.
        let ns = 1_745_159_400u64 * 1_000_000_000;
        let key = hour_key_for_ns(ns);
        assert_eq!(key, "year=2025/month=04/day=20/hour=14");
    }

    #[test]
    fn hour_key_changes_on_hour_boundary() {
        // 2025-04-20 14:59:59 vs 15:00:00 UTC.
        let ns1 = 1_745_161_199u64 * 1_000_000_000;
        let ns2 = 1_745_161_200u64 * 1_000_000_000;
        assert_eq!(hour_key_for_ns(ns1), "year=2025/month=04/day=20/hour=14");
        assert_eq!(hour_key_for_ns(ns2), "year=2025/month=04/day=20/hour=15");
    }

    #[test]
    fn leap_year_handled() {
        // 2024-02-29 é válido (leap year).
        // 2024-02-29 00:00:00 UTC = 1_709_164_800 secs.
        let ns = 1_709_164_800u64 * 1_000_000_000;
        let key = hour_key_for_ns(ns);
        assert_eq!(key, "year=2024/month=02/day=29/hour=00");
    }

    #[tokio::test]
    async fn writer_writes_and_rotates() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = WriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 16,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(100),
            file_prefix: "test".into(),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = JsonlWriter::create(cfg);
        let task = tokio::spawn(writer.run());

        // Envia 3 amostras em horas consecutivas (2025-04-20 UTC).
        let route = mk_route();
        // Hora 14 (14:30).
        let s1 = AcceptedSample::new(
            1_745_159_400u64 * 1_000_000_000,
            0, route, "BTC-USDT", 2.0, -1.0, 1e6, 1e6,
            SampleDecision::Accept,
        );
        // Hora 15 (15:00).
        let s2 = AcceptedSample::new(
            1_745_161_200u64 * 1_000_000_000,
            1, route, "BTC-USDT", 2.1, -1.1, 1e6, 1e6,
            SampleDecision::Accept,
        );
        // Hora 15 ainda (15:01).
        let s3 = AcceptedSample::new(
            1_745_161_260u64 * 1_000_000_000,
            2, route, "BTC-USDT", 2.2, -1.2, 1e6, 1e6,
            SampleDecision::Accept,
        );
        handle.try_send(s1).expect("send s1");
        handle.try_send(s2).expect("send s2");
        handle.try_send(s3).expect("send s3");

        // Deixa a task processar e flushar.
        tokio::time::sleep(Duration::from_millis(300)).await;
        drop(handle);
        task.await.expect("task join");

        // Verifica que arquivos foram criados nas duas horas.
        let hour14 = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let hour15 = tmp.path().join("year=2025/month=04/day=20/hour=15");
        assert!(hour14.exists(), "hora 14 deve existir");
        assert!(hour15.exists(), "hora 15 deve existir");

        // Conta linhas em hora 15 — deve ser 2.
        let files_h15: Vec<_> = std::fs::read_dir(&hour15).unwrap().collect();
        assert_eq!(files_h15.len(), 1, "um arquivo por prefix/start_ts");
        let content = std::fs::read_to_string(files_h15[0].as_ref().unwrap().path()).unwrap();
        let lines: Vec<_> = content.lines().collect();
        assert_eq!(lines.len(), 2);
        // Primeira linha deve ser s2 (hora 15 primeiro).
        let v: serde_json::Value = serde_json::from_str(lines[0]).unwrap();
        assert_eq!(v["cycle_seq"], 1);
    }

    #[tokio::test]
    async fn writer_compacts_closed_hour_to_parquet() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        let cfg = WriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 16,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(100),
            file_prefix: "test".into(),
            parquet: ParquetCompactionConfig::default(),
        };
        let (writer, handle) = JsonlWriter::create(cfg);
        let task = tokio::spawn(writer.run());

        let route = mk_route();
        let s = AcceptedSample::new(
            1_745_159_400u64 * 1_000_000_000,
            0,
            route,
            "BTC-USDT",
            2.0,
            -1.0,
            1e6,
            1e6,
            SampleDecision::Accept,
        );
        handle.try_send(s).expect("send sample");

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

        assert_eq!(parquet_files.len(), 1, "writer deve finalizar em parquet");
        assert!(
            jsonl_files.is_empty(),
            "jsonl intermediário deve ser removido após compactação"
        );
    }

    #[tokio::test]
    async fn backpressure_drops_without_blocking() {
        let tmp = tempfile::tempdir().expect("tmpdir");
        // Canal 1 de capacidade.
        let cfg = WriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1,
            flush_after_n: 1,
            flush_interval: Duration::from_secs(60),
            file_prefix: "test".into(),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        // Cria mas NÃO spawna — canal não consumido.
        let (_writer, handle) = JsonlWriter::create(cfg);
        let s = AcceptedSample::new(
            1_745_159_400u64 * 1_000_000_000,
            0, mk_route(), "BTC-USDT", 2.0, -1.0, 1e6, 1e6,
            SampleDecision::Accept,
        );
        // Primeiro envio OK.
        assert!(handle.try_send(s.clone()).is_ok());
        // Segundo envio falha com ChannelFull.
        match handle.try_send(s) {
            Err(WriterSendError::ChannelFull) => {}
            other => panic!("expected ChannelFull, got {:?}", other),
        }
    }
}
