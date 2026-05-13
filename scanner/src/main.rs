use anyhow::Context;
use clap::Parser;
use scanner::Config;
use tracing::{info, warn};

#[global_allocator]
static GLOBAL_ALLOCATOR: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[derive(Debug, Parser)]
#[command(author, version, about = "Cross-exchange price-spread scanner")]
struct Cli {
    /// Path to config.toml (optional; defaults are used if absent).
    #[arg(short, long)]
    config: Option<std::path::PathBuf>,
}

fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_target(false)
        .init();

    prefer_latency_priority();

    let cli = Cli::parse();
    let cfg = match cli.config {
        Some(path) => Config::load(&path).with_context(|| format!("load {}", path.display()))?,
        None => Config::default_in_memory(),
    };

    info!(bind = %cfg.bind, broadcast_ms = cfg.broadcast_ms, "scanner starting");

    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .thread_name("scanner-worker")
        .build()
        .context("build tokio runtime")?;

    rt.block_on(async move { scanner::run(cfg).await })?;

    Ok(())
}

#[cfg(windows)]
fn prefer_latency_priority() {
    use std::ffi::c_void;

    const ABOVE_NORMAL_PRIORITY_CLASS: u32 = 0x00008000;

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn GetCurrentProcess() -> *mut c_void;
        fn SetPriorityClass(process: *mut c_void, priority_class: u32) -> i32;
    }

    unsafe {
        if SetPriorityClass(GetCurrentProcess(), ABOVE_NORMAL_PRIORITY_CLASS) == 0 {
            warn!("failed to raise scanner process priority to ABOVE_NORMAL");
        }
    }
}

#[cfg(not(windows))]
fn prefer_latency_priority() {}
