//! Política operacional de retenção do dataset ML.
//!
//! Separação importante:
//! - **retenção física** = por quanto tempo arquivos ficam em disco;
//! - **janela estatística** = qual subconjunto recente o trainer usa
//!   para aprender/calibrar.
//!
//! Para este projeto, alinhado ao objetivo do `CLAUDE.md`, o ativo
//! central é `LabeledTrade`. `RawSample` existe para replay, auditoria
//! point-in-time e reprocessamento; portanto seu TTL deve ser menor.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::config::{MlRetentionConfig, MlWindowConfig};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManagedDataset {
    pub name: &'static str,
    pub root: PathBuf,
    pub retention_days: u16,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatasetRetentionPolicy {
    pub enabled: bool,
    pub sweep_interval: Duration,
    pub keep_recent_hours: u16,
    pub dry_run: bool,
}

impl From<&MlRetentionConfig> for DatasetRetentionPolicy {
    fn from(cfg: &MlRetentionConfig) -> Self {
        Self {
            enabled: cfg.enabled,
            sweep_interval: Duration::from_secs(cfg.sweep_interval_s.max(300)),
            keep_recent_hours: cfg.keep_recent_hours,
            dry_run: cfg.dry_run,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModelWindowPolicy {
    pub train_window_days: u16,
    pub calibration_window_days: u16,
    pub archive_reference_days: u16,
}

impl From<&MlWindowConfig> for ModelWindowPolicy {
    fn from(cfg: &MlWindowConfig) -> Self {
        Self {
            train_window_days: cfg.train_window_days,
            calibration_window_days: cfg.calibration_window_days,
            archive_reference_days: cfg.archive_reference_days,
        }
    }
}

impl ModelWindowPolicy {
    pub fn validate(&self) -> Result<(), String> {
        if self.train_window_days == 0 {
            return Err("ml.windows.train_window_days deve ser > 0".into());
        }
        if self.calibration_window_days == 0 {
            return Err("ml.windows.calibration_window_days deve ser > 0".into());
        }
        if self.archive_reference_days < self.train_window_days {
            return Err("ml.windows.archive_reference_days deve ser >= train_window_days".into());
        }
        if self.calibration_window_days > self.train_window_days {
            return Err("ml.windows.calibration_window_days deve ser <= train_window_days".into());
        }
        Ok(())
    }
}

impl DatasetRetentionPolicy {
    pub fn validate(&self, datasets: &[ManagedDataset]) -> Result<(), String> {
        if self.enabled && datasets.is_empty() {
            return Err("retenção habilitada sem datasets gerenciados".into());
        }
        if self.keep_recent_hours == 0 {
            return Err("ml.retention.keep_recent_hours deve ser > 0".into());
        }
        for ds in datasets {
            if ds.retention_days == 0 {
                return Err(format!(
                    "retenção inválida para {}: retention_days deve ser > 0",
                    ds.name
                ));
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct HourPartition {
    path: PathBuf,
    hour_since_epoch: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DatasetSweepReport {
    pub dataset_name: String,
    pub removed_partitions: u64,
    pub removed_files: u64,
    pub removed_bytes: u64,
    pub kept_partitions: u64,
    pub kept_bytes: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RetentionSweepReport {
    pub datasets: Vec<DatasetSweepReport>,
}

impl RetentionSweepReport {
    pub fn total_removed_bytes(&self) -> u64 {
        self.datasets.iter().map(|d| d.removed_bytes).sum()
    }

    pub fn total_kept_bytes(&self) -> u64 {
        self.datasets.iter().map(|d| d.kept_bytes).sum()
    }

    pub fn summary_line(&self) -> String {
        let parts: Vec<String> = self
            .datasets
            .iter()
            .map(|d| {
                format!(
                    "{}: removed={} in {} partitions, kept={}",
                    d.dataset_name,
                    human_bytes(d.removed_bytes),
                    d.removed_partitions,
                    human_bytes(d.kept_bytes)
                )
            })
            .collect();
        parts.join(" | ")
    }
}

pub fn sweep_datasets(
    datasets: &[ManagedDataset],
    policy: &DatasetRetentionPolicy,
    now: SystemTime,
) -> io::Result<RetentionSweepReport> {
    let mut report = RetentionSweepReport::default();
    let now_hour = hour_since_epoch(now)?;
    let recent_guard_cutoff = now_hour.saturating_sub(policy.keep_recent_hours as u64);

    for dataset in datasets {
        let retention_cutoff = now_hour.saturating_sub((dataset.retention_days as u64) * 24);
        let partitions = collect_hour_partitions(&dataset.root)?;
        let mut ds_report = DatasetSweepReport {
            dataset_name: dataset.name.to_string(),
            ..DatasetSweepReport::default()
        };

        for partition in partitions {
            let (files, bytes) = dir_stats(&partition.path)?;
            let deletable = partition.hour_since_epoch < retention_cutoff
                && partition.hour_since_epoch < recent_guard_cutoff;
            if deletable {
                ds_report.removed_partitions += 1;
                ds_report.removed_files += files;
                ds_report.removed_bytes += bytes;
                if !policy.dry_run {
                    fs::remove_dir_all(&partition.path)?;
                    prune_empty_parents(&partition.path, &dataset.root)?;
                }
            } else {
                ds_report.kept_partitions += 1;
                ds_report.kept_bytes += bytes;
            }
        }

        report.datasets.push(ds_report);
    }

    Ok(report)
}

fn collect_hour_partitions(root: &Path) -> io::Result<Vec<HourPartition>> {
    if !root.exists() {
        return Ok(Vec::new());
    }

    let mut out = Vec::new();
    for year_dir in child_dirs(root)? {
        let Some(year) = parse_partition_component("year", &year_dir)? else {
            continue;
        };
        for month_dir in child_dirs(&year_dir)? {
            let Some(month) = parse_partition_component("month", &month_dir)? else {
                continue;
            };
            for day_dir in child_dirs(&month_dir)? {
                let Some(day) = parse_partition_component("day", &day_dir)? else {
                    continue;
                };
                for hour_dir in child_dirs(&day_dir)? {
                    let Some(hour) = parse_partition_component("hour", &hour_dir)? else {
                        continue;
                    };
                    out.push(HourPartition {
                        path: hour_dir,
                        hour_since_epoch: civil_hour_to_epoch(year, month, day, hour)?,
                    });
                }
            }
        }
    }

    Ok(out)
}

fn child_dirs(root: &Path) -> io::Result<Vec<PathBuf>> {
    let mut dirs = Vec::new();
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            dirs.push(entry.path());
        }
    }
    Ok(dirs)
}

fn parse_partition_component(expected_key: &str, path: &Path) -> io::Result<Option<u32>> {
    let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
        return Ok(None);
    };
    let Some((key, value)) = name.split_once('=') else {
        return Ok(None);
    };
    if key != expected_key {
        return Ok(None);
    }
    let parsed = value.parse::<u32>().map_err(|e| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "partição inválida em {}: {}={}: {}",
                path.display(),
                expected_key,
                value,
                e
            ),
        )
    })?;
    Ok(Some(parsed))
}

fn dir_stats(root: &Path) -> io::Result<(u64, u64)> {
    let mut files = 0u64;
    let mut bytes = 0u64;
    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let ty = entry.file_type()?;
            if ty.is_dir() {
                stack.push(entry.path());
            } else if ty.is_file() {
                files += 1;
                bytes += entry.metadata()?.len();
            }
        }
    }
    Ok((files, bytes))
}

fn prune_empty_parents(mut path: &Path, root: &Path) -> io::Result<()> {
    while let Some(parent) = path.parent() {
        if parent == root {
            break;
        }
        if fs::read_dir(parent)?.next().is_none() {
            fs::remove_dir(parent)?;
            path = parent;
        } else {
            break;
        }
    }
    Ok(())
}

fn hour_since_epoch(now: SystemTime) -> io::Result<u64> {
    let secs = now
        .duration_since(UNIX_EPOCH)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidInput, e.to_string()))?
        .as_secs();
    Ok(secs / 3600)
}

fn civil_hour_to_epoch(year: u32, month: u32, day: u32, hour: u32) -> io::Result<u64> {
    if !(1..=12).contains(&month) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("mês inválido: {}", month),
        ));
    }
    if !(1..=31).contains(&day) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("dia inválido: {}", day),
        ));
    }
    if hour > 23 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("hora inválida: {}", hour),
        ));
    }
    let days = days_from_civil(year as i64, month as i64, day as i64);
    Ok((days as u64) * 24 + hour as u64)
}

// Howard Hinnant / civil-from-days inverse, adaptado para dias desde
// 1970-01-01 UTC.
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = year - if month <= 2 { 1 } else { 0 };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let month_index = month + if month > 2 { -3 } else { 9 };
    let doy = (153 * month_index + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn human_bytes(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KiB", "MiB", "GiB", "TiB"];
    let mut value = bytes as f64;
    let mut idx = 0usize;
    while value >= 1024.0 && idx < UNITS.len() - 1 {
        value /= 1024.0;
        idx += 1;
    }
    if idx == 0 {
        format!("{} {}", bytes, UNITS[idx])
    } else {
        format!("{:.1} {}", value, UNITS[idx])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir_all, write};

    fn mk_partition(root: &Path, y: u32, m: u32, d: u32, h: u32, file: &str) -> PathBuf {
        let dir = root.join(format!(
            "year={:04}/month={:02}/day={:02}/hour={:02}",
            y, m, d, h
        ));
        create_dir_all(&dir).unwrap();
        write(dir.join(file), b"abc").unwrap();
        dir
    }

    #[test]
    fn window_policy_validation_enforces_recent_calibration_inside_train() {
        let ok = ModelWindowPolicy {
            train_window_days: 90,
            calibration_window_days: 21,
            archive_reference_days: 365,
        };
        assert!(ok.validate().is_ok());

        let bad = ModelWindowPolicy {
            train_window_days: 30,
            calibration_window_days: 60,
            archive_reference_days: 365,
        };
        assert!(bad.validate().is_err());
    }

    #[test]
    fn retention_policy_validation_rejects_zero_ttl() {
        let policy = DatasetRetentionPolicy {
            enabled: true,
            sweep_interval: Duration::from_secs(3600),
            keep_recent_hours: 12,
            dry_run: false,
        };
        let datasets = vec![ManagedDataset {
            name: "raw_samples",
            root: PathBuf::from("data/ml/raw_samples"),
            retention_days: 0,
        }];
        assert!(policy.validate(&datasets).is_err());
    }

    #[test]
    fn sweep_respects_dataset_specific_ttls() {
        let tmp = tempfile::tempdir().unwrap();
        let raw_root = tmp.path().join("raw");
        let labeled_root = tmp.path().join("labeled");

        let old_raw = mk_partition(&raw_root, 2026, 1, 1, 0, "raw.jsonl");
        let old_labeled = mk_partition(&labeled_root, 2026, 1, 1, 0, "labeled.jsonl");
        let recent_raw = mk_partition(&raw_root, 2026, 4, 23, 11, "raw_recent.jsonl");

        let datasets = vec![
            ManagedDataset {
                name: "raw_samples",
                root: raw_root.clone(),
                retention_days: 30,
            },
            ManagedDataset {
                name: "labeled_trades",
                root: labeled_root.clone(),
                retention_days: 365,
            },
        ];
        let policy = DatasetRetentionPolicy {
            enabled: true,
            sweep_interval: Duration::from_secs(3600),
            keep_recent_hours: 12,
            dry_run: false,
        };

        // 2026-04-23 12:00 UTC.
        let now = UNIX_EPOCH + Duration::from_secs(1_777_896_000);
        let report = sweep_datasets(&datasets, &policy, now).unwrap();

        assert!(!old_raw.exists(), "raw antigo deveria ser removido");
        assert!(
            old_labeled.exists(),
            "labeled antigo deve sobreviver TTL longo"
        );
        assert!(
            recent_raw.exists(),
            "guard recent hours deve preservar partição atual"
        );

        let raw_report = report
            .datasets
            .iter()
            .find(|d| d.dataset_name == "raw_samples")
            .unwrap();
        assert_eq!(raw_report.removed_partitions, 1);
        assert_eq!(raw_report.kept_partitions, 1);
    }

    #[test]
    fn dry_run_reports_without_deleting() {
        let tmp = tempfile::tempdir().unwrap();
        let raw_root = tmp.path().join("raw");
        let old_raw = mk_partition(&raw_root, 2026, 1, 1, 0, "raw.jsonl");

        let datasets = vec![ManagedDataset {
            name: "raw_samples",
            root: raw_root,
            retention_days: 30,
        }];
        let policy = DatasetRetentionPolicy {
            enabled: true,
            sweep_interval: Duration::from_secs(3600),
            keep_recent_hours: 12,
            dry_run: true,
        };

        let now = UNIX_EPOCH + Duration::from_secs(1_777_896_000);
        let report = sweep_datasets(&datasets, &policy, now).unwrap();

        assert!(old_raw.exists(), "dry-run não deve deletar");
        assert_eq!(report.datasets[0].removed_partitions, 1);
        assert!(report.datasets[0].removed_bytes > 0);
    }
}
