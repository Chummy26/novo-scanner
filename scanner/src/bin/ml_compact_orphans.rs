use std::fs::{self, File, OpenOptions};
use std::io;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, SystemTime};

use anyhow::Context;
use clap::Parser;
use scanner::ml::persistence::{DatasetKind, ParquetCompactionConfig};

#[derive(Debug, Parser)]
#[command(
    author,
    version,
    about = "Compacta JSONL órfãos de data/ml para Parquet/ZSTD com manifesto validado"
)]
struct Cli {
    /// Diretório raiz de data/ml.
    #[arg(long, default_value = "data/ml")]
    root: PathBuf,

    /// Mantém o JSONL fonte mesmo após Parquet+manifesto validarem.
    #[arg(long)]
    keep_jsonl: bool,

    /// Batch Arrow usado na leitura JSONL.
    #[arg(long, default_value_t = 4096)]
    batch_size: usize,

    /// Nível ZSTD do Parquet.
    #[arg(long, default_value_t = 3)]
    zstd_level: i32,

    /// Executa continuamente, compactando arquivos elegíveis a cada intervalo.
    #[arg(long)]
    watch: bool,

    /// Intervalo do modo watch.
    #[arg(long, default_value_t = 600)]
    interval_seconds: u64,

    /// Só compacta JSONL sem escrita recente. Protege arquivo ainda quente.
    #[arg(long, default_value_t = 120)]
    min_age_seconds: u64,

    /// Rele metadados depois desta pausa; tamanho e mtime precisam ficar iguais.
    #[arg(long, default_value_t = 2_000)]
    stability_probe_ms: u64,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    prefer_background_priority();
    if cli.batch_size == 0 {
        anyhow::bail!("--batch-size must be >= 1");
    }
    if !(1..=22).contains(&cli.zstd_level) {
        anyhow::bail!("--zstd-level must be in [1, 22]");
    }

    let cfg = ParquetCompactionConfig {
        enabled: true,
        delete_jsonl_after_success: !cli.keep_jsonl,
        batch_size: cli.batch_size,
        zstd_level: cli.zstd_level,
        rotation_interval_s: 600,
    };

    loop {
        let total = compact_once(
            &cli.root,
            &cfg,
            cli.min_age_seconds,
            Duration::from_millis(cli.stability_probe_ms),
        )?;
        println!("total_compacted_jsonl={total}");

        if !cli.watch {
            break;
        }
        thread::sleep(Duration::from_secs(cli.interval_seconds.max(1)));
    }

    Ok(())
}

fn compact_once(
    root: &Path,
    cfg: &ParquetCompactionConfig,
    min_age_seconds: u64,
    stability_probe: Duration,
) -> anyhow::Result<usize> {
    let datasets = [
        (DatasetKind::RawSamples, "raw_samples"),
        (DatasetKind::AcceptedSamples, "accepted_samples"),
        (DatasetKind::LabeledTrades, "labeled_trades"),
    ];

    let mut total = 0usize;
    for (kind, name) in datasets {
        let root = root.join(name);
        let compacted = compact_existing_jsonl_in_tree_min_age(
            &root,
            kind,
            cfg,
            min_age_seconds,
            stability_probe,
        )
        .with_context(|| format!("compact JSONLs in {}", root.display()))?;
        total += compacted;
        println!("{name}: compacted_jsonl={compacted}");
    }
    Ok(total)
}

fn compact_existing_jsonl_in_tree_min_age(
    root: &Path,
    dataset_kind: DatasetKind,
    cfg: &ParquetCompactionConfig,
    min_age_seconds: u64,
    stability_probe: Duration,
) -> anyhow::Result<usize> {
    if !cfg.enabled || !root.exists() {
        return Ok(0);
    }

    let min_age = Duration::from_secs(min_age_seconds);
    let now = SystemTime::now();
    let mut candidates = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir).with_context(|| format!("read_dir {}", dir.display()))? {
            let entry = entry.with_context(|| format!("read_dir entry {}", dir.display()))?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
                continue;
            }

            if belongs_to_live_scanner_pid(&path) {
                continue;
            }

            let metadata = match entry.metadata() {
                Ok(metadata) => metadata,
                Err(_) => continue,
            };
            let Ok(modified) = metadata.modified() else {
                continue;
            };
            if !is_old_enough(now, modified, min_age) {
                continue;
            }
            candidates.push(JsonlCandidate {
                path,
                len: metadata.len(),
                modified,
            });
        }
    }

    if candidates.is_empty() {
        return Ok(0);
    }
    if !stability_probe.is_zero() {
        thread::sleep(stability_probe);
    }

    let mut compacted = 0usize;
    let now = SystemTime::now();
    for candidate in candidates {
        if belongs_to_live_scanner_pid(&candidate.path) {
            continue;
        }
        if !candidate_metadata_still_stable(&candidate, min_age, now) {
            continue;
        }
        let Some(_lock) = JsonlCompactionLock::try_acquire(&candidate.path)? else {
            continue;
        };
        if candidate_metadata_still_stable(&candidate, min_age, SystemTime::now())
            && scanner::ml::persistence::compact_jsonl_file(&candidate.path, dataset_kind, cfg)?
                .is_some()
        {
            compacted += 1;
        }
    }
    Ok(compacted)
}

#[derive(Debug)]
struct JsonlCandidate {
    path: PathBuf,
    len: u64,
    modified: SystemTime,
}

fn candidate_metadata_still_stable(
    candidate: &JsonlCandidate,
    min_age: Duration,
    now: SystemTime,
) -> bool {
    let Ok(metadata) = fs::metadata(&candidate.path) else {
        return false;
    };
    if metadata.len() != candidate.len {
        return false;
    }
    let Ok(modified) = metadata.modified() else {
        return false;
    };
    if modified != candidate.modified {
        return false;
    }
    is_old_enough(now, modified, min_age)
}

fn is_old_enough(now: SystemTime, modified: SystemTime, min_age: Duration) -> bool {
    now.duration_since(modified)
        .map(|age| age >= min_age)
        .unwrap_or(false)
}

fn belongs_to_live_scanner_pid(path: &Path) -> bool {
    scanner_pid_from_jsonl_path(path).is_some_and(process_is_running)
}

fn scanner_pid_from_jsonl_path(path: &Path) -> Option<u32> {
    let file_name = path.file_name()?.to_str()?;
    if !file_name.ends_with(".jsonl") {
        return None;
    }
    let stem = file_name.strip_suffix(".jsonl")?;
    let run_prefix = stem.split_once('_').map_or(stem, |(prefix, _)| prefix);
    let scanner_prefix = run_prefix
        .strip_prefix("raw-")
        .or_else(|| run_prefix.strip_prefix("labeled-"))
        .unwrap_or(run_prefix);
    let pid_text = scanner_prefix.rsplit_once('-')?.1;
    pid_text.parse().ok()
}

struct JsonlCompactionLock {
    path: PathBuf,
    _file: File,
}

impl JsonlCompactionLock {
    fn try_acquire(jsonl_path: &Path) -> anyhow::Result<Option<Self>> {
        let lock_path = jsonl_path.with_extension("jsonl.compact.lock");
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_path)
        {
            Ok(file) => Ok(Some(Self {
                path: lock_path,
                _file: file,
            })),
            Err(e) if e.kind() == io::ErrorKind::AlreadyExists => Ok(None),
            Err(e) => Err(e).with_context(|| format!("create {}", lock_path.display())),
        }
    }
}

impl Drop for JsonlCompactionLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

#[cfg(windows)]
fn process_is_running(pid: u32) -> bool {
    use std::ffi::c_void;

    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x00001000;

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn OpenProcess(desired_access: u32, inherit_handle: i32, process_id: u32) -> *mut c_void;
        fn CloseHandle(handle: *mut c_void) -> i32;
    }

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            false
        } else {
            let _ = CloseHandle(handle);
            true
        }
    }
}

#[cfg(unix)]
fn process_is_running(pid: u32) -> bool {
    Path::new("/proc").join(pid.to_string()).exists()
}

#[cfg(not(any(windows, unix)))]
fn process_is_running(_pid: u32) -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn extracts_pid_from_scanner_jsonl_names() {
        assert_eq!(
            scanner_pid_from_jsonl_path(Path::new("raw-scanner-host-35876_1_part-000000.jsonl")),
            Some(35876)
        );
        assert_eq!(
            scanner_pid_from_jsonl_path(Path::new("scanner-host-35876_1_part-000000.jsonl")),
            Some(35876)
        );
        assert_eq!(
            scanner_pid_from_jsonl_path(Path::new(
                "labeled-scanner-host-35876_1_part-000000.jsonl"
            )),
            Some(35876)
        );
        assert_eq!(
            scanner_pid_from_jsonl_path(Path::new("not-a-scanner-file.jsonl")),
            None
        );
    }

    #[test]
    fn skips_current_process_jsonl_even_when_old_enough() {
        let tmp = tempfile::tempdir().expect("tmp");
        let root = tmp.path().join("raw_samples");
        fs::create_dir_all(&root).expect("create root");
        let pid = std::process::id();
        let jsonl = root.join(format!("raw-scanner-{pid}_1_part-000000.jsonl"));
        let mut file = File::create(&jsonl).expect("create jsonl");
        writeln!(file, "{{\"ts_ns\":1}}").expect("write jsonl");
        drop(file);

        let cfg = ParquetCompactionConfig {
            enabled: true,
            delete_jsonl_after_success: true,
            batch_size: 1,
            zstd_level: 3,
            rotation_interval_s: 600,
        };
        let compacted = compact_existing_jsonl_in_tree_min_age(
            &root,
            DatasetKind::RawSamples,
            &cfg,
            0,
            Duration::ZERO,
        )
        .expect("compact");

        assert_eq!(compacted, 0);
        assert!(jsonl.exists());
        assert!(!jsonl.with_extension("parquet").exists());
    }
}

#[cfg(windows)]
fn prefer_background_priority() {
    use std::ffi::c_void;

    const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x00004000;

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn GetCurrentProcess() -> *mut c_void;
        fn SetPriorityClass(process: *mut c_void, priority_class: u32) -> i32;
    }

    unsafe {
        let _ = SetPriorityClass(GetCurrentProcess(), BELOW_NORMAL_PRIORITY_CLASS);
    }
}

#[cfg(not(windows))]
fn prefer_background_priority() {}
