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

    /// Horizontes em segundos. Default `[900, 1800, 7200, 28800]`.
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
        }
    }
}

fn default_raw_target_coverage()     -> f64      { 0.95 }
fn default_raw_decimation_mod()      -> u64      { 10 }
fn default_raw_rerank_interval_s()   -> u64      { 3600 }
fn default_label_stride_s()          -> u32      { 60 }
fn default_label_horizons_s()        -> Vec<u32>  { vec![900, 1800, 7200, 28800] }
fn default_label_sweeper_interval_s()-> u64      { 10 }
fn default_label_floor_pct()         -> f32      { 0.8 }
fn default_label_floors_pct()        -> Vec<f32>  { vec![0.3, 0.5, 0.8, 1.2, 2.0, 3.0] }
fn default_recommendation_cooldown_s()-> u32      { 60 }

#[derive(Debug, Clone, Default, Deserialize)]
pub struct VenueToggles {
    #[serde(default = "enabled_default")] pub binance_spot:  bool,
    #[serde(default = "enabled_default")] pub binance_fut:   bool,
    #[serde(default = "enabled_default")] pub mexc_spot:     bool,
    #[serde(default = "enabled_default")] pub mexc_fut:      bool,
    #[serde(default = "enabled_default")] pub bingx_spot:    bool,
    #[serde(default = "enabled_default")] pub bingx_fut:     bool,
    #[serde(default = "enabled_default")] pub gate_spot:     bool,
    #[serde(default = "enabled_default")] pub gate_fut:      bool,
    #[serde(default = "enabled_default", alias = "kucoin")]
    pub kucoin_spot:  bool,
    #[serde(default = "enabled_default")] pub kucoin_fut:    bool,
    #[serde(default = "enabled_default")] pub xt_spot:       bool,
    #[serde(default = "enabled_default")] pub xt_fut:        bool,
    #[serde(default = "enabled_default", alias = "bitget")]
    pub bitget_spot:  bool,
    #[serde(default = "enabled_default")] pub bitget_fut:    bool,
}

impl VenueToggles {
    pub fn is_enabled(&self, v: Venue) -> bool {
        match v {
            Venue::BinanceSpot => self.binance_spot,
            Venue::BinanceFut  => self.binance_fut,
            Venue::MexcSpot    => self.mexc_spot,
            Venue::MexcFut     => self.mexc_fut,
            Venue::BingxSpot   => self.bingx_spot,
            Venue::BingxFut    => self.bingx_fut,
            Venue::GateSpot    => self.gate_spot,
            Venue::GateFut     => self.gate_fut,
            Venue::KucoinSpot  => self.kucoin_spot,
            Venue::KucoinFut   => self.kucoin_fut,
            Venue::XtSpot      => self.xt_spot,
            Venue::XtFut       => self.xt_fut,
            Venue::BitgetSpot  => self.bitget_spot,
            Venue::BitgetFut   => self.bitget_fut,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Limits {
    #[serde(default = "default_max_symbols")]   pub max_symbols: u32,
    #[serde(default = "default_max_levels")]    pub max_levels:  u16,
    #[serde(default = "default_history_len")]   pub history_len: u32,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            max_symbols: default_max_symbols(),
            max_levels:  default_max_levels(),
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

fn default_bind()            -> String { "0.0.0.0:8000".into() }
fn default_broadcast_ms()    -> u64    { 150 }
fn default_entry_threshold() -> f64    { 0.20 } // 0.20%
fn default_max_spread()      -> f64    { 30.0 }
fn default_min_vol_usd()     -> f64    { 100_000.0 } // $100k min per leg
fn default_max_symbols()     -> u32    { 4000 }
fn default_max_levels()      -> u16    { 20 }
fn default_history_len()     -> u32    { 512 }
fn enabled_default()         -> bool   { true }

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
            bind:                "0.0.0.0:8000".into(),
            broadcast_ms:        150,
            entry_threshold_pct: 0.20,
            max_spread_pct:      30.0,
            min_vol_usd:         100_000.0,
            frontend_dir:        default_frontend_dir(),
            venues:              VenueToggles::default_enabled(),
            limits:              Limits::default(),
            core_pinning:        CorePinning::default(),
            kucoin_mode:         KucoinMode::Classic,
            bitget_mode:         BitgetMode::V2,
            ml:                  MlConfig::default(),
        }
    }
}

impl VenueToggles {
    fn default_enabled() -> Self {
        Self {
            binance_spot: true,  binance_fut: true,
            mexc_spot:    true,  mexc_fut:    true,
            bingx_spot:   true,  bingx_fut:   true,
            gate_spot:    true,  gate_fut:    true,
            kucoin_spot:  true,  kucoin_fut:  true,
            xt_spot:      true,  xt_fut:      true,
            bitget_spot:  true,  bitget_fut:  true,
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
}
