use serde::Deserialize;
use std::path::Path;

use crate::error::{Error, Result};
use crate::types::Venue;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    #[serde(default = "default_bind")]
    pub bind: String,

    #[serde(default = "default_broadcast_ms")]
    pub broadcast_ms: u64,

    #[serde(default = "default_entry_threshold")]
    pub entry_threshold_pct: f64,

    /// Upper bound on emitted spreads. Anything above this is treated as a
    /// data glitch or ticker collision (different tokens sharing a base
    /// symbol on different venues). Default 30%.
    #[serde(default = "default_max_spread")]
    pub max_spread_pct: f64,

    /// Minimum 24h USD volume required on EACH side of an opportunity.
    /// Opportunities where either leg has less volume are dropped — keeps
    /// only symbols that are liquid enough to actually trade.
    #[serde(default = "default_min_vol_usd")]
    pub min_vol_usd: f64,

    /// Optional path to a directory of static files (frontend build output)
    /// that the broadcast server will also serve under `/`. Leave unset to
    /// disable static serving (backend-only).
    #[serde(default)]
    pub frontend_dir: Option<std::path::PathBuf>,

    #[serde(default)]
    pub venues: VenueToggles,

    #[serde(default)]
    pub limits: Limits,

    #[serde(default)]
    pub core_pinning: CorePinning,

    #[serde(default)]
    pub kucoin_mode: KucoinMode,

    #[serde(default)]
    pub bitget_mode: BitgetMode,

    /// Config ML/dataset (Wave V).
    #[serde(default)]
    pub ml: MlConfig,
}

/// Configuração ML — Wave V (correções PhD).
///
/// Todos campos têm defaults razoáveis. Operadores podem sobrescrever
/// via TOML `[ml]`.
#[derive(Debug, Clone, Deserialize)]
pub struct MlConfig {
    /// Símbolos (canonical "BASE-QUOTE") sempre persistidos no RawSample,
    /// independentemente de ranking. Ex.: `["BTC-USDT", "ETH-USDT"]`.
    #[serde(default)]
    pub raw_allowlist_symbols: Vec<String>,

    /// Fração de `accept_count_24h` coberta pelo priority_set. Default 0.95.
    #[serde(default = "default_raw_target_coverage")]
    pub raw_sampling_target_coverage: f64,

    /// Decimator residual uniforme: 1-em-N. Default 10.
    #[serde(default = "default_raw_decimation_mod")]
    pub raw_decimation_mod: u64,

    /// Intervalo entre reranks do `RouteRanking` (s). Default 3600 (1h).
    #[serde(default = "default_raw_rerank_interval_s")]
    pub raw_rerank_interval_s: u64,

    /// Stride mínimo entre labels da mesma rota (s). Default 60.
    #[serde(default = "default_label_stride_s")]
    pub label_stride_s: u32,

    /// Horizontes em segundos. Default `[900, 1800, 3600, 7200, 14400, 28800]`.
    #[serde(default = "default_label_horizons_s")]
    pub label_horizons_s: Vec<u32>,

    /// Intervalo do sweeper global de labels (s). Default 10.
    #[serde(default = "default_label_sweeper_interval_s")]
    pub label_sweeper_interval_s: u64,

    /// Floor percentual bruto usado pelo baseline A3 + labels derivados.
    /// Default 0.8% — filtro sobre LUCRO BRUTO COTADO (fees/funding ficam
    /// fora, fronteira ML explícita).
    #[serde(default = "default_label_floor_pct")]
    pub label_floor_pct: f32,

    /// Floors brutos adicionais para labels multi-threshold.
    /// O primeiro target operacional continua `label_floor_pct`; esta lista
    /// permite treinar curva P(exit >= floor | estado, floor).
    #[serde(default = "default_label_floors_pct")]
    pub label_floors_pct: Vec<f32>,

    /// Cooldown de emissao por rota para evitar spam/dedup no layer serving.
    #[serde(default = "default_recommendation_cooldown_s")]
    pub recommendation_cooldown_s: u32,

    /// Política operacional de retenção física do dataset em disco.
    /// Separada das janelas de treino/calibração porque retenção e
    /// lookback estatístico não são a mesma coisa.
    #[serde(default)]
    pub retention: MlRetentionConfig,

    /// Compactação de arquivos fechados para Parquet/ZSTD.
    /// Mantém o hot path em JSONL append-only e converte apenas quando
    /// um arquivo JSONL fecha.
    #[serde(default)]
    pub parquet: MlParquetConfig,

    /// Janelas efetivas de treino/calibração/archive do modelo.
    /// Não deletam arquivos; definem a memória estatística que o
    /// trainer deve privilegiar.
    #[serde(default)]
    pub windows: MlWindowConfig,
}

impl Default for MlConfig {
    fn default() -> Self {
        Self {
            raw_allowlist_symbols: Vec::new(),
            raw_sampling_target_coverage: default_raw_target_coverage(),
            raw_decimation_mod: default_raw_decimation_mod(),
            raw_rerank_interval_s: default_raw_rerank_interval_s(),
            label_stride_s: default_label_stride_s(),
            label_horizons_s: default_label_horizons_s(),
            label_sweeper_interval_s: default_label_sweeper_interval_s(),
            label_floor_pct: default_label_floor_pct(),
            label_floors_pct: default_label_floors_pct(),
            recommendation_cooldown_s: default_recommendation_cooldown_s(),
            retention: MlRetentionConfig::default(),
            parquet: MlParquetConfig::default(),
            windows: MlWindowConfig::default(),
        }
    }
}

/// Política de retenção física em disco para os datasets ML.
///
/// Defaults alinhados ao estado atual do projeto:
/// - `raw`: 30d enquanto o schema/label ainda amadurece;
/// - `accepted`: 30d para auditoria de trigger/recomendação;
/// - `labeled`: 365d, pois é o ativo supervisionado central do ML.
#[derive(Debug, Clone, Deserialize)]
pub struct MlRetentionConfig {
    /// Ativa sweeper periódico de retenção.
    #[serde(default = "default_retention_enabled")]
    pub enabled: bool,

    /// Cadência do sweeper em segundos. Default 1h.
    #[serde(default = "default_retention_sweep_interval_s")]
    pub sweep_interval_s: u64,

    /// Guard-rail operacional: nunca tocar em partições das últimas N horas,
    /// mesmo que o TTL configurado seja agressivo. Protege contra clock skew,
    /// escrita ainda em andamento e investigações recentes.
    #[serde(default = "default_retention_keep_recent_hours")]
    pub keep_recent_hours: u16,

    /// TTL físico do dataset bruto pré-trigger.
    #[serde(default = "default_raw_retention_days")]
    pub raw_retention_days: u16,

    /// TTL físico do dataset pós-trigger (`AcceptedSample`).
    #[serde(default = "default_accepted_retention_days")]
    pub accepted_retention_days: u16,

    /// TTL físico do dataset supervisionado (`LabeledTrade`).
    #[serde(default = "default_labeled_retention_days")]
    pub labeled_retention_days: u16,

    /// Modo observação: calcula e loga, mas não remove nada.
    #[serde(default)]
    pub dry_run: bool,
}

impl Default for MlRetentionConfig {
    fn default() -> Self {
        Self {
            enabled: default_retention_enabled(),
            sweep_interval_s: default_retention_sweep_interval_s(),
            keep_recent_hours: default_retention_keep_recent_hours(),
            raw_retention_days: default_raw_retention_days(),
            accepted_retention_days: default_accepted_retention_days(),
            labeled_retention_days: default_labeled_retention_days(),
            dry_run: false,
        }
    }
}

/// Política de rotação/compactação dos arquivos JSONL para Parquet/ZSTD.
#[derive(Debug, Clone, Deserialize)]
pub struct MlParquetConfig {
    /// Ativa compactação assíncrona de arquivos `.jsonl` fechados.
    #[serde(default = "default_parquet_enabled")]
    pub enabled: bool,

    /// Fecha o arquivo JSONL quente a cada N segundos para compactar mais
    /// cedo. O particionamento em disco continua por hora; este campo só
    /// controla o tamanho/tempo do arquivo aberto dentro da hora.
    #[serde(default = "default_parquet_rotation_interval_s")]
    pub rotation_interval_s: u64,

    /// Remove o `.jsonl` após gerar o `.parquet` com sucesso.
    #[serde(default = "default_parquet_delete_jsonl_after_success")]
    pub delete_jsonl_after_success: bool,

    /// Tamanho do batch Arrow usado na leitura do JSONL.
    #[serde(default = "default_parquet_batch_size")]
    pub batch_size: usize,

    /// Nível do codec ZSTD do Parquet.
    #[serde(default = "default_parquet_zstd_level")]
    pub zstd_level: i32,
}

impl Default for MlParquetConfig {
    fn default() -> Self {
        Self {
            enabled: default_parquet_enabled(),
            rotation_interval_s: default_parquet_rotation_interval_s(),
            delete_jsonl_after_success: default_parquet_delete_jsonl_after_success(),
            batch_size: default_parquet_batch_size(),
            zstd_level: default_parquet_zstd_level(),
        }
    }
}

/// Janelas estatísticas do modelo.
///
/// Estas janelas não deletam dados. Elas codificam o consenso operacional:
/// - treino principal privilegia uma janela rolling recente;
/// - calibração de `P`/`IC` deve ser ainda mais recente;
/// - archive de referência preserva caudas/regimes raros para auditoria.
#[derive(Debug, Clone, Deserialize)]
pub struct MlWindowConfig {
    /// Janela rolling primária do trainer.
    #[serde(default = "default_train_window_days")]
    pub train_window_days: u16,

    /// Janela recente para calibração de P/T/IC.
    #[serde(default = "default_calibration_window_days")]
    pub calibration_window_days: u16,

    /// Horizonte de referência para slices frios / regimes raros.
    #[serde(default = "default_archive_reference_days")]
    pub archive_reference_days: u16,
}

impl Default for MlWindowConfig {
    fn default() -> Self {
        Self {
            train_window_days: default_train_window_days(),
            calibration_window_days: default_calibration_window_days(),
            archive_reference_days: default_archive_reference_days(),
        }
    }
}

fn default_raw_target_coverage() -> f64 {
    0.95
}
fn default_raw_decimation_mod() -> u64 {
    10
}
fn default_raw_rerank_interval_s() -> u64 {
    3600
}
fn default_label_stride_s() -> u32 {
    60
}
fn default_label_horizons_s() -> Vec<u32> {
    vec![900, 1800, 3600, 7200, 14400, 28800]
}
fn default_label_sweeper_interval_s() -> u64 {
    10
}
fn default_label_floor_pct() -> f32 {
    0.8
}
fn default_label_floors_pct() -> Vec<f32> {
    vec![0.3, 0.5, 0.8, 1.2, 2.0, 3.0]
}
fn default_recommendation_cooldown_s() -> u32 {
    60
}
fn default_retention_enabled() -> bool {
    true
}
fn default_retention_sweep_interval_s() -> u64 {
    3600
}
fn default_retention_keep_recent_hours() -> u16 {
    12
}
fn default_raw_retention_days() -> u16 {
    30
}
fn default_accepted_retention_days() -> u16 {
    30
}
fn default_labeled_retention_days() -> u16 {
    365
}
fn default_parquet_enabled() -> bool {
    true
}
fn default_parquet_rotation_interval_s() -> u64 {
    600
}
fn default_parquet_delete_jsonl_after_success() -> bool {
    true
}
fn default_parquet_batch_size() -> usize {
    4096
}
fn default_parquet_zstd_level() -> i32 {
    3
}
fn default_train_window_days() -> u16 {
    90
}
fn default_calibration_window_days() -> u16 {
    21
}
fn default_archive_reference_days() -> u16 {
    365
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct VenueToggles {
    #[serde(default = "enabled_default")]
    pub binance_spot: bool,
    #[serde(default = "enabled_default")]
    pub binance_fut: bool,
    #[serde(default = "enabled_default")]
    pub mexc_spot: bool,
    #[serde(default = "enabled_default")]
    pub mexc_fut: bool,
    #[serde(default = "enabled_default")]
    pub bingx_spot: bool,
    #[serde(default = "enabled_default")]
    pub bingx_fut: bool,
    #[serde(default = "enabled_default")]
    pub gate_spot: bool,
    #[serde(default = "enabled_default")]
    pub gate_fut: bool,
    #[serde(default = "enabled_default", alias = "kucoin")]
    pub kucoin_spot: bool,
    #[serde(default = "enabled_default")]
    pub kucoin_fut: bool,
    #[serde(default = "enabled_default")]
    pub xt_spot: bool,
    #[serde(default = "enabled_default")]
    pub xt_fut: bool,
    #[serde(default = "enabled_default", alias = "bitget")]
    pub bitget_spot: bool,
    #[serde(default = "enabled_default")]
    pub bitget_fut: bool,
}

impl VenueToggles {
    pub fn is_enabled(&self, v: Venue) -> bool {
        match v {
            Venue::BinanceSpot => self.binance_spot,
            Venue::BinanceFut => self.binance_fut,
            Venue::MexcSpot => self.mexc_spot,
            Venue::MexcFut => self.mexc_fut,
            Venue::BingxSpot => self.bingx_spot,
            Venue::BingxFut => self.bingx_fut,
            Venue::GateSpot => self.gate_spot,
            Venue::GateFut => self.gate_fut,
            Venue::KucoinSpot => self.kucoin_spot,
            Venue::KucoinFut => self.kucoin_fut,
            Venue::XtSpot => self.xt_spot,
            Venue::XtFut => self.xt_fut,
            Venue::BitgetSpot => self.bitget_spot,
            Venue::BitgetFut => self.bitget_fut,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Limits {
    #[serde(default = "default_max_symbols")]
    pub max_symbols: u32,
    #[serde(default = "default_max_levels")]
    pub max_levels: u16,
    #[serde(default = "default_history_len")]
    pub history_len: u32,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            max_symbols: default_max_symbols(),
            max_levels: default_max_levels(),
            history_len: default_history_len(),
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct CorePinning {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub spread_engine_core: Option<usize>,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum KucoinMode {
    /// Classic API (spot 400 topics, futures unlimited) — production-safe.
    #[default]
    Classic,
    /// Pro API / UTA — documented as BETA by exchange. Opt-in only.
    ProBeta,
    /// Disabled entirely (conservative default given beta status).
    Disabled,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BitgetMode {
    /// V2 market-data endpoint (ws.bitget.com/v2/ws/public).
    #[default]
    V2,
    /// V3/UTA endpoint (ws.bitget.com/v3/ws/public) — newer unified account.
    V3Uta,
}

fn default_bind() -> String {
    "0.0.0.0:8000".into()
}
fn default_broadcast_ms() -> u64 {
    150
}
fn default_entry_threshold() -> f64 {
    0.20
} // 0.20%
fn default_max_spread() -> f64 {
    30.0
}
fn default_min_vol_usd() -> f64 {
    100_000.0
} // $100k min per leg
fn default_max_symbols() -> u32 {
    4000
}
fn default_max_levels() -> u16 {
    20
}
fn default_history_len() -> u32 {
    512
}
fn enabled_default() -> bool {
    true
}

/// Default frontend dir: tries `../novo frontend/frontend` relative to
/// scanner working directory. Returns None if not found so we never hard-fail.
fn default_frontend_dir() -> Option<std::path::PathBuf> {
    for candidate in &[
        "../novo frontend/frontend",
        "./novo frontend/frontend",
        "./frontend",
    ] {
        let p = std::path::PathBuf::from(candidate);
        if p.join("index.html").is_file() {
            return Some(p);
        }
    }
    None
}

impl Config {
    pub fn load(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref();
        let text = std::fs::read_to_string(path)
            .map_err(|e| Error::Config(format!("reading {}: {}", path.display(), e)))?;
        let cfg: Config = toml::from_str(&text)
            .map_err(|e| Error::Config(format!("parsing {}: {}", path.display(), e)))?;
        Ok(cfg)
    }

    pub fn default_in_memory() -> Self {
        Self {
            bind: "0.0.0.0:8000".into(),
            broadcast_ms: 150,
            entry_threshold_pct: 0.20,
            max_spread_pct: 30.0,
            min_vol_usd: 100_000.0,
            frontend_dir: default_frontend_dir(),
            venues: VenueToggles::default_enabled(),
            limits: Limits::default(),
            core_pinning: CorePinning::default(),
            kucoin_mode: KucoinMode::Classic,
            bitget_mode: BitgetMode::V2,
            ml: MlConfig::default(),
        }
    }
}

impl VenueToggles {
    fn default_enabled() -> Self {
        Self {
            binance_spot: true,
            binance_fut: true,
            mexc_spot: true,
            mexc_fut: true,
            bingx_spot: true,
            bingx_fut: true,
            gate_spot: true,
            gate_fut: true,
            kucoin_spot: true,
            kucoin_fut: true,
            xt_spot: true,
            xt_fut: true,
            bitget_spot: true,
            bitget_fut: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_loads() {
        let cfg = Config::default_in_memory();
        assert_eq!(cfg.bind, "0.0.0.0:8000");
        assert_eq!(cfg.broadcast_ms, 150);
        assert!(cfg.venues.is_enabled(Venue::BinanceSpot));
        assert!(cfg.venues.is_enabled(Venue::KucoinSpot));
        assert!(cfg.ml.retention.enabled);
        assert_eq!(cfg.ml.retention.raw_retention_days, 30);
        assert!(cfg.ml.parquet.enabled);
        assert_eq!(cfg.ml.parquet.rotation_interval_s, 600);
        assert_eq!(cfg.ml.parquet.zstd_level, 3);
        assert_eq!(cfg.ml.windows.train_window_days, 90);
    }

    #[test]
    fn toml_parses() {
        let t = r#"
broadcast_ms = 200
entry_threshold_pct = 0.5

[venues]
binance_spot = true
kucoin       = true

[kucoin_mode]
# not applicable as enum
"#;
        // using the plain form:
        let t2 = r#"
broadcast_ms = 200
entry_threshold_pct = 0.5
kucoin_mode = "probeta"

[venues]
binance_spot = true
kucoin       = true
"#;
        let cfg: Config = toml::from_str(t2).expect("parse");
        assert_eq!(cfg.broadcast_ms, 200);
        assert_eq!(cfg.kucoin_mode, KucoinMode::ProBeta);
        assert!(cfg.venues.is_enabled(Venue::KucoinSpot));
        // ignore t to silence unused-var lint
        let _ = t;
    }

    #[test]
    fn nested_ml_policy_toml_parses() {
        let t = r#"
[ml]
raw_decimation_mod = 7

[ml.retention]
enabled = true
raw_retention_days = 14
accepted_retention_days = 21
labeled_retention_days = 400

[ml.parquet]
enabled = true
rotation_interval_s = 300
delete_jsonl_after_success = true
batch_size = 8192
zstd_level = 6

[ml.windows]
train_window_days = 120
calibration_window_days = 30
archive_reference_days = 500
"#;
        let cfg: Config = toml::from_str(t).expect("parse");
        assert_eq!(cfg.ml.raw_decimation_mod, 7);
        assert_eq!(cfg.ml.retention.raw_retention_days, 14);
        assert_eq!(cfg.ml.retention.accepted_retention_days, 21);
        assert_eq!(cfg.ml.retention.labeled_retention_days, 400);
        assert!(cfg.ml.parquet.enabled);
        assert_eq!(cfg.ml.parquet.rotation_interval_s, 300);
        assert!(cfg.ml.parquet.delete_jsonl_after_success);
        assert_eq!(cfg.ml.parquet.batch_size, 8192);
        assert_eq!(cfg.ml.parquet.zstd_level, 6);
        assert_eq!(cfg.ml.windows.train_window_days, 120);
        assert_eq!(cfg.ml.windows.calibration_window_days, 30);
        assert_eq!(cfg.ml.windows.archive_reference_days, 500);
    }
}
