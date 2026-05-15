use std::fs::{self, File};
use std::path::PathBuf;

use anyhow::Context;
use clap::Parser;
use scanner::ml::persistence::storage_v2::{
    build_storage_v2_shadow_report, build_storage_v2_shadow_report_with_limit,
    StorageV2ShadowStatus,
};

#[derive(Debug, Parser)]
#[command(
    author,
    version,
    about = "Gera auditoria shadow do ml_storage_v2 sem alterar o storage canonico"
)]
struct Cli {
    /// Diretório raiz de data/ml.
    #[arg(long, default_value = "data/ml")]
    root: PathBuf,

    /// Caminho do relatório JSON. Se omitido, grava em data/ml/storage_v2_shadow_report.json.
    #[arg(long)]
    out: Option<PathBuf>,

    /// Retorna exit code 0 mesmo se o relatório vier Red.
    #[arg(long)]
    allow_red: bool,

    /// Limita a quantidade de Parquets lidos por dataset, útil para smoke tests.
    #[arg(long)]
    max_files_per_dataset: Option<usize>,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let report = if cli.max_files_per_dataset.is_some() {
        build_storage_v2_shadow_report_with_limit(&cli.root, cli.max_files_per_dataset)
    } else {
        build_storage_v2_shadow_report(&cli.root)
    }
    .with_context(|| format!("build storage_v2 shadow report for {}", cli.root.display()))?;
    let out = cli
        .out
        .unwrap_or_else(|| cli.root.join("storage_v2_shadow_report.json"));
    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }
    let tmp = out.with_extension("json.tmp");
    {
        let file = File::create(&tmp).with_context(|| format!("create {}", tmp.display()))?;
        serde_json::to_writer_pretty(file, &report)
            .with_context(|| format!("write {}", tmp.display()))?;
    }
    let file = File::open(&tmp).with_context(|| format!("open {}", tmp.display()))?;
    let roundtrip: scanner::ml::persistence::storage_v2::StorageV2ShadowReport =
        serde_json::from_reader(file).with_context(|| format!("parse {}", tmp.display()))?;
    if roundtrip.shadow_version != report.shadow_version || roundtrip.status != report.status {
        let _ = fs::remove_file(&tmp);
        anyhow::bail!("storage_v2 shadow report roundtrip mismatch");
    }
    fs::rename(&tmp, &out)
        .with_context(|| format!("rename {} -> {}", tmp.display(), out.display()))?;

    println!(
        "status={:?} total_physical_bytes={} conservative_reclaimable_bytes={} route_dim_reclaimable_bytes={} report={}",
        report.status,
        report.total_physical_bytes,
        report.total_estimated_reclaimable_bytes_conservative,
        report.total_estimated_reclaimable_bytes_with_route_dim,
        out.display()
    );
    for (dataset, audit) in &report.datasets {
        println!(
            "{} rows={} files={} physical_bytes={} sample_id_bytes={} route_identity_bytes={} route_dim_rows={} issues={}",
            dataset,
            audit.rows,
            audit.files,
            audit.physical_bytes,
            audit.sample_id_physical_bytes,
            audit.route_identity_physical_bytes,
            audit.route_dim_rows,
            audit.issues.len()
        );
    }

    if report.status == StorageV2ShadowStatus::Red && !cli.allow_red {
        anyhow::bail!("storage_v2 shadow report is Red: {:?}", report.issues);
    }
    Ok(())
}
