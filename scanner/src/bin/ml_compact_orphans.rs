use std::fs;
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
        let total = compact_once(&cli.root, &cfg, cli.min_age_seconds)?;
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
) -> anyhow::Result<usize> {
    let datasets = [
        (DatasetKind::RawSamples, "raw_samples"),
        (DatasetKind::AcceptedSamples, "accepted_samples"),
        (DatasetKind::LabeledTrades, "labeled_trades"),
    ];

    let mut total = 0usize;
    for (kind, name) in datasets {
        let root = root.join(name);
        let compacted = compact_existing_jsonl_in_tree_min_age(&root, kind, cfg, min_age_seconds)
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
) -> anyhow::Result<usize> {
    if !cfg.enabled || !root.exists() {
        return Ok(0);
    }

    let min_age = Duration::from_secs(min_age_seconds);
    let now = SystemTime::now();
    let mut compacted = 0usize;
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
            let modified = entry
                .metadata()
                .and_then(|metadata| metadata.modified())
                .unwrap_or(SystemTime::UNIX_EPOCH);
            if now
                .duration_since(modified)
                .map(|age| age < min_age)
                .unwrap_or(true)
            {
                continue;
            }
            if scanner::ml::persistence::compact_jsonl_file(&path, dataset_kind, cfg)?.is_some() {
                compacted += 1;
            }
        }
    }
    Ok(compacted)
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
