use anyhow::Context;
use clap::Parser;
use scanner::Config;
use tracing::info;

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

    rt.block_on(async move {
        scanner::run(cfg).await
    })?;

    Ok(())
}
