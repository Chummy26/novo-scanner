//! Hot cache em memória para queries de percentil de spread por rota.
//!
//! Implementa a **Camada 1b** da arquitetura de feature store (ADR-012).
//! Cache em RAM com janela rolante **24h real** (Fase 0 C6 fix), baseado
//! em ring buffer decimado 1-em-10 com pesos para expiração de samples
//! antigos e queries exatas sobre a representação retida.
//!
//! # Arquitetura
//!
//! Cada `PerRouteCache` mantém:
//!
//! - `ring` — `VecDeque<SampleTick>` decimada 1-em-10 e compactada por peso.
//!   Contém representantes dentro da janela de 24h.
//! - `decimation_counter` — contador sequencial; só guarda no ring
//!   quando `counter % DECIMATION == 0`.
//! - `n_observations` — contagem efetiva de observações limpas na janela,
//!   compensada pela decimação. Queries usam o ring decimado ponderado.
//!
//! # Decimação (por que 1-em-10)
//!
//! - **Redução de memória**: sem decimação, 2600 rotas × 6 RPS × 24h =
//!   1.35×10⁹ samples em RAM → impossível.
//! - **Cobertura temporal mantida**: com 6 RPS, 1-em-10 = 1.67 samples/s
//!   por rota — suficiente para percentis estáveis em janela 24h
//!   (~144_000 samples/rota).
//! - **Precisão estatística**: Serfling (1980) mostra que n ≥ 475 é
//!   suficiente para quantis p95 ± 0.01. Decimada 1:10, warm-up é
//!   ~500 × 10 / 6 ≈ 14 min por rota a taxa típica.
//!
//! # Janela rolante 24h real
//!
//! Ring buffer pop-front samples com `ts_ns < now_ns - WINDOW_NS`.
//! Para evitar crescimento linear de RAM durante coletas longas, o ring mantém
//! uma cauda recente exata e compacta o prefixo antigo por pares: o ring mantém
//! um representante com `weight = soma dos pesos` e intervalo temporal
//! `[start_ts_ns, end_ts_ns]`. Queries de subjanela usam apenas a fração do
//! representante que cruza o cutoff, evitando tratar todo peso antigo como
//! recente. Isso não remove raw/accepted/labels nem altera o resolver
//! supervisionado; como as features e decisões derivadas do cache podem mudar,
//! a política é versionada no `runtime_config_hash`.
//!
//! # Encoding de spread em u64
//!
//! ```text
//!   bucket_u64 = (spread_pct * 10_000) + 100_000
//! ```
//!
//! Range `[-10%, +10%]` (bucket `[1, 200_000]`) cobre folgadamente o
//! regime cripto longtail. Valores fora são clampeados.
//!
//! Precisão de bucket: 0.01% em spreads típicos.

use std::cell::RefCell;
use std::collections::VecDeque;
use std::sync::Arc;

use ahash::AHashMap;
use parking_lot::RwLock;

use crate::ml::contract::RouteId;

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

const BUCKET_SHIFT: i64 = 100_000;
const BUCKET_SCALE: f32 = 10_000.0;
const BUCKET_MAX: u64 = 200_000;
const MAX_PHYSICAL_TICKS_PER_ROUTE: usize = 512;
const RECENT_EXACT_TICKS_PER_ROUTE: usize = 256;
const COMPACTED_PREFIX_TICKS_PER_ROUTE: usize =
    MAX_PHYSICAL_TICKS_PER_ROUTE - RECENT_EXACT_TICKS_PER_ROUTE;

/// Fingerprint da política de representação do cache usada em `FeaturesT0`.
///
/// Qualquer alteração aqui deve fragmentar `runtime_config_hash`, porque as
/// features PIT derivadas do cache podem mudar mesmo com labels idênticos.
pub const HOT_CACHE_POLICY_VERSION: &str =
    "weighted_ring_v4:ring_only:max_physical_ticks_per_route=512:recent_exact_ticks=256:interval_weighted";

#[inline]
fn to_bucket(spread_pct: f32) -> u64 {
    if !spread_pct.is_finite() {
        return BUCKET_SHIFT as u64;
    }
    let max_pct = (BUCKET_MAX as f32) / BUCKET_SCALE - 10.0;
    let min_pct = -10.0_f32;
    let clamped = spread_pct.clamp(min_pct, max_pct);
    let shifted = (clamped * BUCKET_SCALE) as i64 + BUCKET_SHIFT;
    shifted.clamp(1, BUCKET_MAX as i64) as u64
}

#[inline]
fn from_bucket(bucket: u64) -> f32 {
    ((bucket as i64 - BUCKET_SHIFT) as f32) / BUCKET_SCALE
}

#[inline]
fn select_quantile_u64(values: &mut [u64], q: f64) -> u32 {
    debug_assert!(!values.is_empty());
    if values.len() == 1 {
        return values[0].min(u32::MAX as u64) as u32;
    }
    let clamped = q.clamp(0.0, 1.0);
    let idx = (clamped * (values.len() - 1) as f64).round() as usize;
    let idx = idx.min(values.len() - 1);
    let (_, value, _) = values.select_nth_unstable(idx);
    (*value).min(u32::MAX as u64) as u32
}

#[inline]
fn select_weighted_quantile_u32(values: &mut [(u32, u64)], q: f64) -> u32 {
    debug_assert!(!values.is_empty());
    values.sort_unstable_by_key(|(bucket, _)| *bucket);
    select_weighted_quantile_sorted_u32(values, q)
}

#[inline]
fn select_weighted_quantile_sorted_u32(values: &[(u32, u64)], q: f64) -> u32 {
    debug_assert!(!values.is_empty());
    let total = values
        .iter()
        .fold(0u64, |acc, (_, w)| acc.saturating_add(*w));
    if total == 0 {
        return values[0].0;
    }
    let idx = (q.clamp(0.0, 1.0) * total.saturating_sub(1) as f64).round() as u64;
    let mut seen = 0u64;
    for (bucket, weight) in values.iter() {
        seen = seen.saturating_add(*weight);
        if seen > idx {
            return *bucket;
        }
    }
    values.last().map(|(bucket, _)| *bucket).unwrap_or(0)
}

// ---------------------------------------------------------------------------
// Configuração do cache
// ---------------------------------------------------------------------------

/// Parâmetros da janela rolante + decimação.
///
/// Defaults escolhidos em `DATASET_ACTION_PLAN.md` Fase 0:
/// - decimação 1-em-10 → 2.4 GB total para 2600 rotas × 24h.
/// - janela 24h (convenção do skill §4).
/// - rebuild imediato quando há expiração → quantis PIT exatos.
#[derive(Debug, Clone, Copy)]
pub struct CacheConfig {
    /// Guarda 1 a cada `decimation` samples no ring (e histograma).
    /// `1` = sem decimação (usado em testes).
    pub decimation: u32,
    /// Tamanho da janela rolante em nanosegundos. Default 24h.
    pub window_ns: u64,
    /// Campo legado de compatibilidade. A implementação atual reconstrói
    /// imediatamente quando expira amostra para evitar histograma stale.
    pub rebuild_interval_ns: u64,
    /// Capacidade inicial do `VecDeque` ring buffer (não hard limit; VecDeque
    /// cresce sob demanda). Mantida pequena porque milhares de rotas podem
    /// existir em três janelas simultâneas; o ring cresce só quando necessário.
    pub ring_initial_capacity: usize,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct HotCacheStats {
    pub routes_tracked: usize,
    pub materialized_routes: usize,
    pub retained_ticks: u64,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct HotCacheSweepStats {
    pub routes_removed: usize,
    pub routes_rebuilt: usize,
    pub ticks_expired: u64,
}

#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct HotCacheFeatureStats {
    pub entry_p25: Option<f32>,
    pub entry_p50: Option<f32>,
    pub entry_p75: Option<f32>,
    pub entry_p95: Option<f32>,
    pub exit_p25: Option<f32>,
    pub exit_p50: Option<f32>,
    pub exit_p75: Option<f32>,
    pub exit_p95: Option<f32>,
    pub entry_rank_percentile: Option<f32>,
    pub entry_mad_robust: Option<f32>,
    pub p_exit_ge_threshold: Option<f32>,
    pub tail_ratio_p99_p95: Option<f32>,
    pub gross_run_p05_s: Option<u32>,
    pub gross_run_p50_s: Option<u32>,
    pub gross_run_p95_s: Option<u32>,
    pub exit_excess_run_s: Option<u32>,
    pub n_observations: u64,
    pub oldest_observation_ns: u64,
}

#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct HotCacheWindowStats {
    pub entry_p50: Option<f32>,
    pub entry_p95: Option<f32>,
    pub entry_rank_percentile: Option<f32>,
    pub p_exit_ge_threshold: Option<f32>,
}

thread_local! {
    static RUN_DURATION_SCRATCH: RefCell<Vec<u64>> = RefCell::new(Vec::new());
    static WEIGHTED_BUCKET_SCRATCH: RefCell<Vec<(u32, u64)>> = RefCell::new(Vec::new());
    static WEIGHTED_BUCKET_SCRATCH_2: RefCell<Vec<(u32, u64)>> = RefCell::new(Vec::new());
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            decimation: 10,
            window_ns: 24 * 3600 * 1_000_000_000,
            rebuild_interval_ns: 3600 * 1_000_000_000,
            ring_initial_capacity: 64,
        }
    }
}

impl CacheConfig {
    /// Config para testes: sem decimação, janela curta para expiração rápida.
    pub fn for_testing() -> Self {
        Self {
            decimation: 1,
            window_ns: u64::MAX,           // sem expiração por padrão em tests
            rebuild_interval_ns: u64::MAX, // sem rebuild por padrão
            ring_initial_capacity: 64,
        }
    }
}

// ---------------------------------------------------------------------------
// Per-route cache
// ---------------------------------------------------------------------------

/// Uma observação decimada no ring buffer.
///
/// `weight` conta quantas observações decimadas este representante acumula
/// após compactação. A decimação bruta continua separada em `CacheConfig`.
#[derive(Debug, Clone, Copy)]
struct SampleTick {
    start_ts_ns: u64,
    end_ts_ns: u64,
    entry_bucket: u32,
    exit_bucket: u32,
    weight: u32,
}

struct PerRouteStorage {
    ring: VecDeque<SampleTick>,
}

impl PerRouteStorage {
    fn new(cfg: CacheConfig) -> Self {
        Self {
            ring: VecDeque::with_capacity(cfg.ring_initial_capacity),
        }
    }
}

#[inline]
fn logical_sampled_observations(storage: &PerRouteStorage) -> u64 {
    storage
        .ring
        .iter()
        .fold(0u64, |acc, s| acc.saturating_add(s.weight as u64))
}

#[inline]
fn weighted_quantile_entry(storage: &PerRouteStorage, q: f64) -> Option<u32> {
    WEIGHTED_BUCKET_SCRATCH.with(|scratch| {
        let mut values = scratch.borrow_mut();
        values.clear();
        values.extend(
            storage
                .ring
                .iter()
                .map(|sample| (sample.entry_bucket, sample.weight as u64)),
        );
        if values.is_empty() {
            return None;
        }
        Some(select_weighted_quantile_u32(&mut values, q))
    })
}

#[inline]
fn weighted_quantile_exit(storage: &PerRouteStorage, q: f64) -> Option<u32> {
    WEIGHTED_BUCKET_SCRATCH.with(|scratch| {
        let mut values = scratch.borrow_mut();
        values.clear();
        values.extend(
            storage
                .ring
                .iter()
                .map(|sample| (sample.exit_bucket, sample.weight as u64)),
        );
        if values.is_empty() {
            return None;
        }
        Some(select_weighted_quantile_u32(&mut values, q))
    })
}

#[inline]
fn merge_bucket(older_bucket: u32, older_weight: u32, newer_bucket: u32, newer_weight: u32) -> u32 {
    let total = (older_weight as u64)
        .saturating_add(newer_weight as u64)
        .max(1);
    let weighted = (older_bucket as u64)
        .saturating_mul(older_weight as u64)
        .saturating_add((newer_bucket as u64).saturating_mul(newer_weight as u64))
        .saturating_add(total / 2)
        / total;
    weighted.clamp(1, BUCKET_MAX) as u32
}

#[inline]
fn merge_ticks(older: SampleTick, newer: SampleTick) -> SampleTick {
    let weight = older.weight.saturating_add(newer.weight).max(1);
    SampleTick {
        start_ts_ns: older.start_ts_ns.min(newer.start_ts_ns),
        end_ts_ns: older.end_ts_ns.max(newer.end_ts_ns),
        entry_bucket: merge_bucket(
            older.entry_bucket,
            older.weight,
            newer.entry_bucket,
            newer.weight,
        ),
        exit_bucket: merge_bucket(
            older.exit_bucket,
            older.weight,
            newer.exit_bucket,
            newer.weight,
        ),
        weight,
    }
}

#[inline]
fn proportional_weight(sample: &SampleTick, cutoff_ns: u64) -> u64 {
    if sample.end_ts_ns < cutoff_ns {
        return 0;
    }
    let weight = sample.weight as u64;
    if sample.start_ts_ns >= cutoff_ns || weight <= 1 {
        return weight;
    }
    let total_span = sample
        .end_ts_ns
        .saturating_sub(sample.start_ts_ns)
        .saturating_add(1)
        .max(1);
    let kept_span = sample
        .end_ts_ns
        .saturating_sub(cutoff_ns)
        .saturating_add(1)
        .min(total_span);
    weight
        .saturating_mul(kept_span)
        .saturating_add(total_span - 1)
        / total_span
}

#[inline]
fn trim_front_sample_to_cutoff(storage: &mut PerRouteStorage, cutoff_ns: u64) -> bool {
    let Some(front) = storage.ring.front_mut() else {
        return false;
    };
    if front.start_ts_ns >= cutoff_ns || front.end_ts_ns < cutoff_ns {
        return false;
    }
    let kept = proportional_weight(front, cutoff_ns)
        .max(1)
        .min(front.weight as u64) as u32;
    let changed = kept != front.weight || front.start_ts_ns != cutoff_ns;
    front.weight = kept;
    front.start_ts_ns = cutoff_ns;
    changed
}

fn compact_prefix_once(prefix: Vec<SampleTick>) -> Vec<SampleTick> {
    let mut compacted = Vec::with_capacity((prefix.len() / 2).saturating_add(prefix.len() % 2));
    let mut iter = prefix.into_iter();
    while let Some(first) = iter.next() {
        if let Some(second) = iter.next() {
            compacted.push(merge_ticks(first, second));
        } else {
            compacted.push(first);
        }
    }
    compacted
}

fn compact_ring_if_needed(storage: &mut PerRouteStorage) -> bool {
    if storage.ring.len() <= MAX_PHYSICAL_TICKS_PER_ROUTE {
        return false;
    }

    let recent_exact_len = RECENT_EXACT_TICKS_PER_ROUTE.min(storage.ring.len());
    let prefix_len = storage.ring.len().saturating_sub(recent_exact_len);
    if prefix_len < 2 {
        return false;
    }

    let recent_tail = storage.ring.split_off(prefix_len);
    let mut prefix = storage.ring.drain(..).collect::<Vec<_>>();
    while prefix.len() > COMPACTED_PREFIX_TICKS_PER_ROUTE && prefix.len() >= 2 {
        prefix = compact_prefix_once(prefix);
    }

    storage.ring = VecDeque::with_capacity(MAX_PHYSICAL_TICKS_PER_ROUTE);
    storage.ring.extend(prefix);
    storage.ring.extend(recent_tail);
    true
}

#[inline]
fn exit_run_duration_quantiles_from_storage(
    storage: &PerRouteStorage,
    threshold_bucket: u32,
) -> Option<(u32, u32, u32)> {
    if storage.ring.is_empty() {
        return None;
    }

    RUN_DURATION_SCRATCH.with(|scratch| {
        let mut runs = scratch.borrow_mut();
        runs.clear();
        let mut active_start: Option<u64> = None;
        let mut last_ts: Option<u64> = None;

        for sample in &storage.ring {
            last_ts = Some(sample.end_ts_ns);
            if sample.exit_bucket >= threshold_bucket {
                if active_start.is_none() {
                    active_start = Some(sample.start_ts_ns);
                }
            } else if let Some(start) = active_start.take() {
                runs.push((sample.start_ts_ns.saturating_sub(start) + 999_999_999) / 1_000_000_000);
            }
        }

        if let (Some(start), Some(end)) = (active_start, last_ts) {
            runs.push((end.saturating_sub(start) + 999_999_999) / 1_000_000_000);
        }

        if runs.is_empty() {
            return None;
        }

        let p05 = select_quantile_u64(&mut runs, 0.05);
        let p50 = select_quantile_u64(&mut runs, 0.50);
        let p95 = select_quantile_u64(&mut runs, 0.95);
        Some((p05, p50, p95))
    })
}

struct PerRouteCache {
    storage: Option<PerRouteStorage>,
    cached_entry_p95_bucket: Option<u32>,
    /// Wrap seguro por ~34×10⁹ anos em 17k RPS.
    decimation_counter: u64,
    /// Contagem efetiva de samples limpos na janela, compensada pela
    /// decimação. Usado para `n_min` gate pelo trigger/baseline.
    n_observations: u64,
    last_update_ns: u64,
    cfg: CacheConfig,
}

impl PerRouteCache {
    fn new(cfg: CacheConfig) -> Self {
        Self {
            storage: None,
            cached_entry_p95_bucket: None,
            decimation_counter: 0,
            n_observations: 0,
            last_update_ns: 0,
            cfg,
        }
    }

    fn storage_mut(&mut self) -> &mut PerRouteStorage {
        self.storage
            .get_or_insert_with(|| PerRouteStorage::new(self.cfg))
    }

    #[inline]
    fn refresh_cached_common_quantiles(&mut self) {
        self.cached_entry_p95_bucket = self.storage.as_ref().and_then(|storage| {
            if storage.ring.is_empty() {
                None
            } else {
                weighted_quantile_entry(storage, 0.95)
            }
        });
    }

    #[inline]
    fn observe(&mut self, entry: f32, exit: f32, ts_ns: u64) {
        self.decimation_counter = self.decimation_counter.wrapping_add(1);
        if self.decimation_counter % (self.cfg.decimation as u64) != 0 {
            self.last_update_ns = ts_ns;
            return;
        }

        let eb = to_bucket(entry);
        let xb = to_bucket(exit);
        let cfg = self.cfg;

        let retained_len = {
            let storage = self.storage_mut();
            storage.ring.push_back(SampleTick {
                start_ts_ns: ts_ns,
                end_ts_ns: ts_ns,
                entry_bucket: eb as u32,
                exit_bucket: xb as u32,
                weight: 1,
            });

            let cutoff = ts_ns.saturating_sub(cfg.window_ns);
            while let Some(front) = storage.ring.front() {
                if front.end_ts_ns < cutoff {
                    storage.ring.pop_front();
                } else {
                    break;
                }
            }
            let _ = trim_front_sample_to_cutoff(storage, cutoff);
            let _ = compact_ring_if_needed(storage);

            logical_sampled_observations(storage)
        };

        self.n_observations = retained_len.saturating_mul(cfg.decimation.max(1) as u64);
        self.refresh_cached_common_quantiles();
        self.last_update_ns = ts_ns;
    }

    #[inline]
    fn sampled_observations(&self) -> u64 {
        self.storage
            .as_ref()
            .map(|storage| storage.ring.len() as u64)
            .unwrap_or(0)
    }

    #[inline]
    fn logical_sampled_observations(&self) -> u64 {
        self.storage
            .as_ref()
            .map(logical_sampled_observations)
            .unwrap_or(0)
    }

    #[inline]
    fn quantile_entry(&self, q: f64) -> Option<f32> {
        let storage = self.storage.as_ref()?;
        if storage.ring.is_empty() {
            return None;
        }
        if (q - 0.95).abs() < 1e-12 {
            if let Some(bucket) = self.cached_entry_p95_bucket {
                return Some(from_bucket(bucket as u64));
            }
        }
        weighted_quantile_entry(storage, q).map(|bucket| from_bucket(bucket as u64))
    }

    #[inline]
    fn quantile_exit(&self, q: f64) -> Option<f32> {
        let storage = self.storage.as_ref()?;
        if storage.ring.is_empty() {
            return None;
        }
        weighted_quantile_exit(storage, q).map(|bucket| from_bucket(bucket as u64))
    }

    #[inline]
    fn quantile_entry_since(&self, cutoff_ns: u64, q: f64) -> Option<f32> {
        let storage = self.storage.as_ref()?;
        WEIGHTED_BUCKET_SCRATCH.with(|scratch| {
            let mut values = scratch.borrow_mut();
            values.clear();
            values.extend(storage.ring.iter().filter_map(|s| {
                let weight = proportional_weight(s, cutoff_ns);
                (weight > 0).then_some((s.entry_bucket, weight))
            }));
            if values.is_empty() {
                return None;
            }
            let bucket = select_weighted_quantile_u32(&mut values, q);
            Some(from_bucket(bucket as u64))
        })
    }

    #[inline]
    fn probability_entry_ge(&self, threshold: f32) -> Option<(f32, u64, u64)> {
        let storage = self.storage.as_ref()?;
        let total = self.logical_sampled_observations();
        if total == 0 {
            return None;
        }
        let low = to_bucket(threshold) as u32;
        let successes = storage.ring.iter().fold(0u64, |acc, sample| {
            if sample.entry_bucket >= low {
                acc.saturating_add(sample.weight as u64)
            } else {
                acc
            }
        });
        let p = successes as f32 / total as f32;
        Some((p, successes, total))
    }

    /// percentil empírico de `spread_pct` na ECDF 24h de entry.
    /// Retorna fração em `[0, 1]` — Teste 1 da skill §4 literal.
    #[inline]
    fn entry_rank_percentile(&self, spread_pct: f32) -> Option<f32> {
        let storage = self.storage.as_ref()?;
        let total = self.logical_sampled_observations();
        if total == 0 {
            return None;
        }
        let bucket = to_bucket(spread_pct);
        // Count de amostras com entry_bucket <= bucket (inclui o próprio).
        let below = storage.ring.iter().fold(0u64, |acc, sample| {
            if sample.entry_bucket <= bucket as u32 {
                acc.saturating_add(sample.weight as u64)
            } else {
                acc
            }
        });
        Some(below as f32 / total as f32)
    }

    #[inline]
    fn entry_rank_percentile_since(&self, spread_pct: f32, cutoff_ns: u64) -> Option<f32> {
        let storage = self.storage.as_ref()?;
        let bucket = to_bucket(spread_pct) as u32;
        let mut total = 0u64;
        let mut below = 0u64;
        for sample in storage.ring.iter() {
            let weight = proportional_weight(sample, cutoff_ns);
            if weight == 0 {
                continue;
            }
            total = total.saturating_add(weight);
            if sample.entry_bucket <= bucket {
                below = below.saturating_add(weight);
            }
        }
        if total == 0 {
            return None;
        }
        Some(below as f32 / total as f32)
    }

    /// MAD (Median Absolute Deviation) robusto de entry.
    /// Computa passo-único: mediana + MAD estimado via quantis do hist.
    #[inline]
    fn entry_mad_robust(&self) -> Option<f32> {
        if self.logical_sampled_observations() < 30 {
            return None; // MAD instável com amostra pequena.
        }
        // Aproximação via quantis do próprio histograma de entry: desvio
        // absoluto mediano ≈ q75 - q50 (para distribuição simétrica ~0.67 σ,
        // mas para robust scale estimation usamos a expressão direta com
        // hist).
        let p25 = self.quantile_entry(0.25)?;
        let p75 = self.quantile_entry(0.75)?;
        // IQR / 2 é proxy de MAD em distribuições simétricas; multiplicamos
        // por 0.7413 (consistência com normal) para alinhar semântica a MAD.
        Some(((p75 - p25) / 2.0).abs() * 0.7413)
    }

    /// Tail ratio p99/p95 com safeguard para buckets colapsados.
    /// Retorna `None` quando a amostra é pequena OR quando `p99` e `p95`
    /// caem no mesmo bucket do HDR histogram (indistinção cauda).
    #[inline]
    fn tail_ratio_p99_p95(&self) -> Option<f32> {
        let storage = self.storage.as_ref()?;
        if self.logical_sampled_observations() < 30 {
            return None;
        }
        let p99_bucket = weighted_quantile_entry(storage, 0.99)?;
        let p95_bucket = weighted_quantile_entry(storage, 0.95)?;
        // buckets idênticos → colapso de cauda → None.
        // Antes retornava 1.0, semanticamente "cauda fina normal" falso.
        if p99_bucket <= p95_bucket + 1 {
            return None;
        }
        let p99 = from_bucket(p99_bucket as u64);
        let p95 = from_bucket(p95_bucket as u64);
        if p95.abs() < 1e-6 {
            return None;
        }
        Some(p99 / p95)
    }

    #[inline]
    fn probability_exit_ge(&self, threshold: f32) -> Option<(f32, u64, u64)> {
        let storage = self.storage.as_ref()?;
        let total = self.logical_sampled_observations();
        if total == 0 {
            return None;
        }
        let low = to_bucket(threshold) as u32;
        let successes = storage.ring.iter().fold(0u64, |acc, sample| {
            if sample.exit_bucket >= low {
                acc.saturating_add(sample.weight as u64)
            } else {
                acc
            }
        });
        let p = successes as f32 / total as f32;
        Some((p, successes, total))
    }

    #[inline]
    fn probability_exit_ge_since(&self, threshold: f32, cutoff_ns: u64) -> Option<(f32, u64, u64)> {
        let storage = self.storage.as_ref()?;
        let low = to_bucket(threshold) as u32;
        let mut total = 0u64;
        let mut successes = 0u64;
        for sample in storage.ring.iter() {
            let weight = proportional_weight(sample, cutoff_ns);
            if weight == 0 {
                continue;
            }
            total = total.saturating_add(weight);
            if sample.exit_bucket >= low {
                successes = successes.saturating_add(weight);
            }
        }
        if total == 0 {
            return None;
        }
        Some((successes as f32 / total as f32, successes, total))
    }

    fn feature_stats(&self, entry_spread: f32, exit_threshold: f32) -> HotCacheFeatureStats {
        let Some(storage) = self.storage.as_ref() else {
            return HotCacheFeatureStats::default();
        };
        if storage.ring.is_empty() {
            return HotCacheFeatureStats::default();
        }

        let total = self.logical_sampled_observations();
        let oldest_observation_ns = self.oldest_observation_ns();
        let entry_bucket = to_bucket(entry_spread) as u32;
        let exit_threshold_bucket = to_bucket(exit_threshold) as u32;

        WEIGHTED_BUCKET_SCRATCH.with(|entry_scratch| {
            WEIGHTED_BUCKET_SCRATCH_2.with(|exit_scratch| {
                let mut entry_values = entry_scratch.borrow_mut();
                let mut exit_values = exit_scratch.borrow_mut();
                entry_values.clear();
                exit_values.clear();

                let mut entry_below = 0u64;
                let mut exit_successes = 0u64;
                for sample in &storage.ring {
                    let weight = sample.weight as u64;
                    entry_values.push((sample.entry_bucket, weight));
                    exit_values.push((sample.exit_bucket, weight));
                    if sample.entry_bucket <= entry_bucket {
                        entry_below = entry_below.saturating_add(weight);
                    }
                    if sample.exit_bucket >= exit_threshold_bucket {
                        exit_successes = exit_successes.saturating_add(weight);
                    }
                }

                entry_values.sort_unstable_by_key(|(bucket, _)| *bucket);
                exit_values.sort_unstable_by_key(|(bucket, _)| *bucket);

                let entry_p25_bucket = select_weighted_quantile_sorted_u32(&entry_values, 0.25);
                let entry_p50_bucket = select_weighted_quantile_sorted_u32(&entry_values, 0.50);
                let entry_p75_bucket = select_weighted_quantile_sorted_u32(&entry_values, 0.75);
                let entry_p95_bucket = select_weighted_quantile_sorted_u32(&entry_values, 0.95);
                let entry_p99_bucket = select_weighted_quantile_sorted_u32(&entry_values, 0.99);
                let exit_p25_bucket = select_weighted_quantile_sorted_u32(&exit_values, 0.25);
                let exit_p50_bucket = select_weighted_quantile_sorted_u32(&exit_values, 0.50);
                let exit_p75_bucket = select_weighted_quantile_sorted_u32(&exit_values, 0.75);
                let exit_p95_bucket = select_weighted_quantile_sorted_u32(&exit_values, 0.95);

                let entry_p25 = from_bucket(entry_p25_bucket as u64);
                let entry_p50 = from_bucket(entry_p50_bucket as u64);
                let entry_p75 = from_bucket(entry_p75_bucket as u64);
                let entry_p95 = from_bucket(entry_p95_bucket as u64);
                let exit_p50 = from_bucket(exit_p50_bucket as u64);
                let tail_ratio_p99_p95 = if total >= 30
                    && entry_p99_bucket > entry_p95_bucket + 1
                    && entry_p95.abs() >= 1e-6
                {
                    Some(from_bucket(entry_p99_bucket as u64) / entry_p95)
                } else {
                    None
                };
                let entry_mad_robust = if total >= 30 {
                    Some(((entry_p75 - entry_p25) / 2.0).abs() * 0.7413)
                } else {
                    None
                };
                let (gross_run_p05_s, gross_run_p50_s, gross_run_p95_s) =
                    exit_run_duration_quantiles_from_storage(storage, exit_threshold_bucket)
                        .map(|(p05, p50, p95)| (Some(p05), Some(p50), Some(p95)))
                        .unwrap_or((None, None, None));
                let exit_excess_run_s =
                    exit_run_duration_quantiles_from_storage(storage, exit_p50_bucket)
                        .map(|(_, p50, _)| p50);

                HotCacheFeatureStats {
                    entry_p25: Some(entry_p25),
                    entry_p50: Some(entry_p50),
                    entry_p75: Some(entry_p75),
                    entry_p95: Some(entry_p95),
                    exit_p25: Some(from_bucket(exit_p25_bucket as u64)),
                    exit_p50: Some(exit_p50),
                    exit_p75: Some(from_bucket(exit_p75_bucket as u64)),
                    exit_p95: Some(from_bucket(exit_p95_bucket as u64)),
                    entry_rank_percentile: (total > 0).then_some(entry_below as f32 / total as f32),
                    entry_mad_robust,
                    p_exit_ge_threshold: (total > 0)
                        .then_some(exit_successes as f32 / total as f32),
                    tail_ratio_p99_p95,
                    gross_run_p05_s,
                    gross_run_p50_s,
                    gross_run_p95_s,
                    exit_excess_run_s,
                    n_observations: self.n_observations,
                    oldest_observation_ns,
                }
            })
        })
    }

    fn window_stats(
        &self,
        entry_spread: f32,
        exit_threshold: f32,
        cutoff_ns: Option<u64>,
        include_p95: bool,
    ) -> HotCacheWindowStats {
        let Some(storage) = self.storage.as_ref() else {
            return HotCacheWindowStats::default();
        };
        let entry_bucket = to_bucket(entry_spread) as u32;
        let exit_threshold_bucket = to_bucket(exit_threshold) as u32;

        WEIGHTED_BUCKET_SCRATCH.with(|scratch| {
            let mut values = scratch.borrow_mut();
            values.clear();
            let mut total = 0u64;
            let mut below = 0u64;
            let mut exit_successes = 0u64;
            for sample in storage.ring.iter() {
                let weight = cutoff_ns
                    .map(|cutoff| proportional_weight(sample, cutoff))
                    .unwrap_or(sample.weight as u64);
                if weight == 0 {
                    continue;
                }
                values.push((sample.entry_bucket, weight));
                total = total.saturating_add(weight);
                if sample.entry_bucket <= entry_bucket {
                    below = below.saturating_add(weight);
                }
                if sample.exit_bucket >= exit_threshold_bucket {
                    exit_successes = exit_successes.saturating_add(weight);
                }
            }
            if values.is_empty() || total == 0 {
                return HotCacheWindowStats::default();
            }
            values.sort_unstable_by_key(|(bucket, _)| *bucket);
            let entry_p50 = from_bucket(select_weighted_quantile_sorted_u32(&values, 0.50) as u64);
            let entry_p95 = include_p95
                .then(|| from_bucket(select_weighted_quantile_sorted_u32(&values, 0.95) as u64));
            HotCacheWindowStats {
                entry_p50: Some(entry_p50),
                entry_p95,
                entry_rank_percentile: Some(below as f32 / total as f32),
                p_exit_ge_threshold: Some(exit_successes as f32 / total as f32),
            }
        })
    }

    #[inline]
    fn exit_run_duration_quantiles(&self, exit_threshold: f32) -> Option<(u32, u32, u32)> {
        let storage = self.storage.as_ref()?;
        exit_run_duration_quantiles_from_storage(storage, to_bucket(exit_threshold) as u32)
    }

    #[inline]
    fn oldest_observation_ns(&self) -> u64 {
        self.storage
            .as_ref()
            .and_then(|storage| storage.ring.front().map(|s| s.start_ts_ns))
            .unwrap_or(0)
    }

    fn sweep_expired(&mut self, now_ns: u64) -> (u64, bool) {
        let cutoff = now_ns.saturating_sub(self.cfg.window_ns);
        let mut expired = 0u64;
        let mut should_clear_storage = false;
        let mut cache_changed = false;

        if let Some(storage) = self.storage.as_mut() {
            while let Some(front) = storage.ring.front() {
                if front.end_ts_ns < cutoff {
                    storage.ring.pop_front();
                    expired = expired.saturating_add(1);
                } else {
                    break;
                }
            }
            let trimmed = trim_front_sample_to_cutoff(storage, cutoff);

            if expired > 0 || trimmed {
                cache_changed = true;
                self.n_observations = logical_sampled_observations(storage)
                    .saturating_mul(self.cfg.decimation.max(1) as u64);
                let min_capacity = self.cfg.ring_initial_capacity.max(storage.ring.len());
                if storage.ring.capacity() > min_capacity.saturating_mul(4) {
                    storage.ring.shrink_to(min_capacity);
                }
            }
            should_clear_storage = storage.ring.is_empty();
        }

        if should_clear_storage {
            self.storage = None;
            self.n_observations = 0;
            self.cached_entry_p95_bucket = None;
        } else if cache_changed {
            self.refresh_cached_common_quantiles();
        }

        let route_expired = now_ns.saturating_sub(self.last_update_ns) > self.cfg.window_ns;
        (expired, self.storage.is_none() && route_expired)
    }
}

// ---------------------------------------------------------------------------
// HotQueryCache — API pública
// ---------------------------------------------------------------------------

/// Cache thread-safe de percentis de spread por rota com janela rolante 24h.
pub struct HotQueryCache {
    routes: Arc<RwLock<AHashMap<RouteId, PerRouteCache>>>,
    cfg: CacheConfig,
}

impl HotQueryCache {
    /// Constrói com config default (decimação 10, janela 24h).
    pub fn new() -> Self {
        Self::with_config(CacheConfig::default())
    }

    pub fn with_config(cfg: CacheConfig) -> Self {
        Self {
            routes: Arc::new(RwLock::new(AHashMap::with_capacity(4096))),
            cfg,
        }
    }

    pub fn config(&self) -> CacheConfig {
        self.cfg
    }

    /// Registra nova observação `(entry_spread, exit_spread)` para `route` em `ts_ns`.
    ///
    /// Lembre: em produção (decimation=10) apenas 1-em-10 samples chegam ao
    /// ring/histograma. `n_observations()` compensa a decimação para que o
    /// gate `n_min=500` represente ~500 observações limpas brutas, enquanto os
    /// percentis seguem calculados sobre a amostra decimada.
    pub fn observe(&self, route: RouteId, entry_spread: f32, exit_spread: f32, ts_ns: u64) {
        let mut guard = self.routes.write();
        let cache = guard
            .entry(route)
            .or_insert_with(|| PerRouteCache::new(self.cfg));
        cache.observe(entry_spread, exit_spread, ts_ns);
    }

    pub fn quantile_entry(&self, route: RouteId, q: f64) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.quantile_entry(q)
    }

    pub fn feature_stats(
        &self,
        route: RouteId,
        entry_spread: f32,
        exit_threshold: f32,
    ) -> HotCacheFeatureStats {
        let guard = self.routes.read();
        guard
            .get(&route)
            .map(|cache| cache.feature_stats(entry_spread, exit_threshold))
            .unwrap_or_default()
    }

    pub fn window_stats(
        &self,
        route: RouteId,
        entry_spread: f32,
        exit_threshold: f32,
        cutoff_ns: Option<u64>,
        include_p95: bool,
    ) -> HotCacheWindowStats {
        let guard = self.routes.read();
        guard
            .get(&route)
            .map(|cache| cache.window_stats(entry_spread, exit_threshold, cutoff_ns, include_p95))
            .unwrap_or_default()
    }

    pub fn quantile_exit(&self, route: RouteId, q: f64) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.quantile_exit(q)
    }

    pub fn quantile_entry_since(&self, route: RouteId, q: f64, cutoff_ns: u64) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.quantile_entry_since(cutoff_ns, q)
    }

    pub fn n_observations(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard.get(&route).map(|c| c.n_observations).unwrap_or(0)
    }

    pub fn sampled_observations(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard
            .get(&route)
            .map(|c| c.sampled_observations())
            .unwrap_or(0)
    }

    pub fn probability_entry_ge(&self, route: RouteId, threshold: f32) -> Option<(f32, u64, u64)> {
        let guard = self.routes.read();
        guard.get(&route)?.probability_entry_ge(threshold)
    }

    pub fn probability_exit_ge(&self, route: RouteId, threshold: f32) -> Option<(f32, u64, u64)> {
        let guard = self.routes.read();
        guard.get(&route)?.probability_exit_ge(threshold)
    }

    pub fn probability_exit_ge_since(
        &self,
        route: RouteId,
        threshold: f32,
        cutoff_ns: u64,
    ) -> Option<(f32, u64, u64)> {
        let guard = self.routes.read();
        guard
            .get(&route)?
            .probability_exit_ge_since(threshold, cutoff_ns)
    }

    /// percentil empírico de `spread_pct` na ECDF 24h de entry.
    /// Retorna `P_hist(entry ≤ spread_pct)` em [0,1] — Teste 1 literal.
    pub fn entry_rank_percentile(&self, route: RouteId, spread_pct: f32) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.entry_rank_percentile(spread_pct)
    }

    /// Percentil empírico dentro de uma subjanela da mesma amostra decimada
    /// mantida pelo cache. Isso evita duplicar o ring 24h só para features 1h.
    pub fn entry_rank_percentile_since(
        &self,
        route: RouteId,
        spread_pct: f32,
        cutoff_ns: u64,
    ) -> Option<f32> {
        let guard = self.routes.read();
        guard
            .get(&route)?
            .entry_rank_percentile_since(spread_pct, cutoff_ns)
    }

    /// MAD robusto de entry (via IQR consistente com normal).
    pub fn entry_mad_robust(&self, route: RouteId) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.entry_mad_robust()
    }

    /// tail ratio com safeguard para buckets colapsados.
    pub fn tail_ratio_p99_p95(&self, route: RouteId) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.tail_ratio_p99_p95()
    }

    /// Quantis de duração dos runs históricos em que `exit_spread >= threshold`.
    ///
    /// Para labels ML, o caller deve passar `threshold = label_floor - entry_now`.
    /// Isso evita o bug conceitual de usar `entry(t)+exit(t)` no mesmo tick,
    /// que pela identidade da skill tende a ser sempre negativo.
    pub fn exit_run_duration_quantiles(
        &self,
        route: RouteId,
        exit_threshold: f32,
    ) -> Option<(u32, u32, u32)> {
        let guard = self.routes.read();
        guard
            .get(&route)?
            .exit_run_duration_quantiles(exit_threshold)
    }

    pub fn last_update_ns(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard.get(&route).map(|c| c.last_update_ns).unwrap_or(0)
    }

    /// Timestamp real da observação mais antiga atualmente retida no ring.
    ///
    /// Diferente de `last_update_ns - window_ns`: rotas frias ou recém-listadas
    /// podem ter apenas minutos de histórico dentro de uma janela configurada
    /// para 24h. Esse valor é usado no dataset para medir cobertura PIT real.
    pub fn oldest_observation_ns(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard
            .get(&route)
            .map(|c| c.oldest_observation_ns())
            .unwrap_or(0)
    }

    pub fn routes_tracked(&self) -> usize {
        self.routes.read().len()
    }

    pub fn stats(&self) -> HotCacheStats {
        let guard = self.routes.read();
        let mut stats = HotCacheStats {
            routes_tracked: guard.len(),
            materialized_routes: 0,
            retained_ticks: 0,
        };
        for cache in guard.values() {
            if cache.storage.is_some() {
                stats.materialized_routes += 1;
            }
            stats.retained_ticks = stats
                .retained_ticks
                .saturating_add(cache.sampled_observations());
        }
        stats
    }

    pub fn sweep_expired(&self, now_ns: u64) -> HotCacheSweepStats {
        let mut guard = self.routes.write();
        let mut stats = HotCacheSweepStats::default();
        guard.retain(|_, cache| {
            let (expired, remove_route) = cache.sweep_expired(now_ns);
            if expired > 0 {
                stats.ticks_expired = stats.ticks_expired.saturating_add(expired);
                stats.routes_rebuilt = stats.routes_rebuilt.saturating_add(1);
            }
            if remove_route {
                stats.routes_removed = stats.routes_removed.saturating_add(1);
                false
            } else {
                true
            }
        });
        stats
    }
}

impl Default for HotQueryCache {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for HotQueryCache {
    /// Cheap clone — compartilha o estado via Arc.
    fn clone(&self) -> Self {
        Self {
            routes: Arc::clone(&self.routes),
            cfg: self.cfg,
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SymbolId, Venue};

    fn mk_route(symbol_id: u32) -> RouteId {
        RouteId {
            symbol_id: SymbolId(symbol_id),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    /// Cache para tests — decimação=1 e janela infinita por padrão.
    fn mk_cache() -> HotQueryCache {
        HotQueryCache::with_config(CacheConfig::for_testing())
    }

    #[test]
    fn bucket_roundtrip_preserves_4_decimals() {
        for v in [1.85_f32, 2.00, -1.20, 0.0, -0.50, 3.14, 0.0001] {
            let b = to_bucket(v);
            let back = from_bucket(b);
            assert!((back - v).abs() < 0.0002, "roundtrip {v} -> {back}");
        }
    }

    #[test]
    fn empty_cache_returns_none() {
        let cache = mk_cache();
        let route = mk_route(1);
        assert_eq!(cache.quantile_entry(route, 0.5), None);
        assert_eq!(cache.n_observations(route), 0);
    }

    #[test]
    fn single_observation_is_queryable() {
        let cache = mk_cache();
        let route = mk_route(1);
        cache.observe(route, 2.0, -1.0, 1);
        let p50 = cache.quantile_entry(route, 0.5).unwrap();
        assert!((p50 - 2.0).abs() < 0.05, "p50 = {p50}, expected ~2.0");
        assert_eq!(cache.n_observations(route), 1);
    }

    #[test]
    fn quantiles_match_distribution() {
        let cache = mk_cache();
        let route = mk_route(1);
        for _ in 0..100 {
            cache.observe(route, 1.0, -1.0, 1);
            cache.observe(route, 2.0, -1.0, 2);
            cache.observe(route, 3.0, -1.0, 3);
            cache.observe(route, 4.0, -1.0, 4);
            cache.observe(route, 5.0, -1.0, 5);
        }
        let p50 = cache.quantile_entry(route, 0.5).unwrap();
        let p95 = cache.quantile_entry(route, 0.95).unwrap();
        assert!((p50 - 3.0).abs() < 0.35, "p50 = {p50}");
        assert!(p95 >= 4.5 && p95 <= 5.2, "p95 = {p95}");
    }

    #[test]
    fn cached_p95_refreshes_after_window_expiration() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: 500,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);

        for i in 0..100 {
            cache.observe(route, 0.5, -1.0, i);
        }
        let old_p95 = cache.quantile_entry(route, 0.95).unwrap();
        assert!(
            old_p95 <= 0.7,
            "p95 inicial deveria refletir janela antiga baixa; p95={old_p95}"
        );

        cache.observe(route, 5.0, -1.0, 1_000);

        let new_p95 = cache.quantile_entry(route, 0.95).unwrap();
        assert!(
            new_p95 >= 4.8,
            "p95 cacheado deve ser reconstruido apos expiracao; p95={new_p95}"
        );
    }

    #[test]
    fn negative_exit_spread_roundtrips() {
        let cache = mk_cache();
        let route = mk_route(1);
        for &v in &[-1.0, -1.2, -1.5, -0.8, -1.3] {
            cache.observe(route, 1.5, v, 1);
        }
        let p50 = cache.quantile_exit(route, 0.5).unwrap();
        assert!(p50 >= -1.3 && p50 <= -0.8, "p50 exit = {p50}");
    }

    #[test]
    fn multiple_routes_isolated() {
        let cache = mk_cache();
        let r1 = mk_route(1);
        let r2 = mk_route(2);
        cache.observe(r1, 2.0, -1.0, 1);
        cache.observe(r2, 5.0, -2.0, 1);
        assert!((cache.quantile_entry(r1, 0.5).unwrap() - 2.0).abs() < 0.1);
        assert!((cache.quantile_entry(r2, 0.5).unwrap() - 5.0).abs() < 0.15);
        assert_eq!(cache.routes_tracked(), 2);
    }

    #[test]
    fn clone_shares_state() {
        let cache = mk_cache();
        let clone = cache.clone();
        let route = mk_route(1);
        cache.observe(route, 2.0, -1.0, 1);
        assert_eq!(clone.n_observations(route), 1);
    }

    #[test]
    fn spreads_outside_range_do_not_panic() {
        let cache = mk_cache();
        let route = mk_route(1);
        cache.observe(route, 1e6, -1e6, 1);
        cache.observe(route, f32::INFINITY, f32::NEG_INFINITY, 2);
        cache.observe(route, f32::NAN, f32::NAN, 3);
        assert!(cache.n_observations(route) >= 1);
    }

    #[test]
    fn decimation_keeps_one_in_n() {
        // Config com decimação 10, janela infinita.
        let cfg = CacheConfig {
            decimation: 10,
            window_ns: u64::MAX,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        // 100 observações brutas → 10 no ring, mas n_min enxerga o n efetivo.
        for i in 0..100 {
            cache.observe(route, 2.0, -1.0, i);
        }
        let n = cache.n_observations(route);
        assert_eq!(
            n, 100,
            "decimação 10 em 100 samples deve preservar n efetivo para o gate, got {n}"
        );
        assert_eq!(
            cache.sampled_observations(route),
            10,
            "histograma continua armazenando 10 samples decimados"
        );
    }

    #[test]
    fn decimation_skips_do_not_materialize_route_storage() {
        let cfg = CacheConfig {
            decimation: 10,
            window_ns: u64::MAX,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);

        for i in 0..9 {
            cache.observe(route, 2.0, -1.0, i);
        }

        assert_eq!(cache.routes_tracked(), 1);
        assert_eq!(cache.sampled_observations(route), 0);
        assert_eq!(cache.n_observations(route), 0);
        assert_eq!(cache.quantile_entry(route, 0.5), None);
        {
            let guard = cache.routes.read();
            assert!(
                guard.get(&route).unwrap().storage.is_none(),
                "decimation skips must not allocate histograms/ring"
            );
        }

        cache.observe(route, 2.0, -1.0, 9);
        assert_eq!(cache.sampled_observations(route), 1);
        assert_eq!(cache.n_observations(route), 10);
        assert!(cache.quantile_entry(route, 0.5).is_some());
    }

    #[test]
    fn rolling_window_expires_old_samples() {
        // Janela 1000 ns, decimação 1, rebuild imediato.
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: 1000,
            rebuild_interval_ns: 1, // rebuild a cada expiração
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        // 10 samples em ts 0..9, janela 1000 → todos dentro.
        for i in 0..10 {
            cache.observe(route, 2.0, -1.0, i);
        }
        assert_eq!(cache.n_observations(route), 10);
        // Sample em ts=2000 expira todos os anteriores (0..9 < 2000 - 1000 = 1000).
        cache.observe(route, 3.0, -1.5, 2000);
        let n = cache.n_observations(route);
        assert_eq!(
            n, 1,
            "após ts=2000 com janela 1000, só resta a última; got {n}"
        );
        // Quantile reflete o novo sample.
        let p50 = cache.quantile_entry(route, 0.5).unwrap();
        assert!((p50 - 3.0).abs() < 0.1);
    }

    #[test]
    fn rebuild_after_expiration_gives_accurate_quantiles() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: 500,
            rebuild_interval_ns: 1, // forçar rebuild em cada expiração
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        // Popular com spread baixo em ts=0..100.
        for i in 0..100 {
            cache.observe(route, 0.5, -1.0, i);
        }
        // Popular com spread alto em ts=700..800 (janela expira os primeiros).
        for i in 700..800 {
            cache.observe(route, 5.0, -1.0, i);
        }
        // Agora p50 deveria refletir apenas samples 5.0 (os 0.5 expiraram).
        let p50 = cache.quantile_entry(route, 0.5).unwrap();
        assert!(
            p50 >= 4.8 && p50 <= 5.2,
            "p50 = {p50}, expected ~5.0 após expiração"
        );
    }

    #[test]
    fn expired_samples_never_remain_in_histogram_until_rebuild_interval() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: 500,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        for i in 0..100 {
            cache.observe(route, 0.5, -1.0, i);
        }
        cache.observe(route, 5.0, -1.0, 1_000);

        assert_eq!(cache.n_observations(route), 1);
        let p50 = cache.quantile_entry(route, 0.5).unwrap();
        assert!(
            p50 >= 4.8 && p50 <= 5.2,
            "histograma não pode manter samples expirados; p50={p50}"
        );
    }

    #[test]
    fn sweep_expired_removes_route_after_window_without_new_observation() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: 1_000,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        cache.observe(route, 2.0, -1.0, 0);

        let stats = cache.sweep_expired(1_001);

        assert_eq!(stats.ticks_expired, 1);
        assert_eq!(stats.routes_rebuilt, 1);
        assert_eq!(stats.routes_removed, 1);
        assert_eq!(cache.routes_tracked(), 0);
        assert_eq!(cache.n_observations(route), 0);
        assert_eq!(cache.quantile_entry(route, 0.50), None);
    }

    #[test]
    fn sweep_expired_preserves_boundary_sample_inside_window() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: 1_000,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        cache.observe(route, 2.0, -1.0, 0);

        let stats = cache.sweep_expired(1_000);

        assert_eq!(stats.ticks_expired, 0);
        assert_eq!(stats.routes_rebuilt, 0);
        assert_eq!(stats.routes_removed, 0);
        assert_eq!(cache.routes_tracked(), 1);
        assert_eq!(cache.n_observations(route), 1);
        assert!(cache.quantile_entry(route, 0.50).is_some());
    }

    #[test]
    fn weighted_compaction_bounds_ring_without_losing_logical_count() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: u64::MAX,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        let total = MAX_PHYSICAL_TICKS_PER_ROUTE + 2_048;

        for i in 0..total {
            let entry = 0.5 + ((i % 100) as f32 / 100.0);
            cache.observe(route, entry, -1.0, i as u64 * 1_000_000_000);
        }

        assert!(
            cache.sampled_observations(route) <= MAX_PHYSICAL_TICKS_PER_ROUTE as u64,
            "ring físico deve ficar limitado por rota"
        );
        assert_eq!(
            cache.n_observations(route),
            total as u64,
            "peso lógico precisa preservar o n efetivo usado por gates"
        );
        let (_, successes, denominator) = cache
            .probability_entry_ge(route, -10.0)
            .expect("cache ponderado deve continuar queryable");
        assert_eq!(successes, total as u64);
        assert_eq!(denominator, total as u64);
    }

    #[test]
    fn weighted_compaction_bounds_aggregate_stats_across_many_routes() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: u64::MAX,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let n_routes = 64u32;
        let samples_per_route = MAX_PHYSICAL_TICKS_PER_ROUTE + 1_024;

        for route_id in 0..n_routes {
            let route = mk_route(route_id);
            for i in 0..samples_per_route {
                cache.observe(route, 0.5 + (i % 10) as f32, -1.0, i as u64);
            }
        }

        let stats = cache.stats();
        assert_eq!(stats.routes_tracked, n_routes as usize);
        assert!(
            stats.retained_ticks <= n_routes as u64 * MAX_PHYSICAL_TICKS_PER_ROUTE as u64,
            "cache físico agregado deve respeitar cap por rota; retained={}",
            stats.retained_ticks
        );
    }

    #[test]
    fn compaction_preserves_recent_tail_for_since_features() {
        let cfg = CacheConfig {
            decimation: 1,
            window_ns: u64::MAX,
            rebuild_interval_ns: u64::MAX,
            ring_initial_capacity: 64,
        };
        let cache = HotQueryCache::with_config(cfg);
        let route = mk_route(1);
        let old_total = MAX_PHYSICAL_TICKS_PER_ROUTE + 2_048;

        for i in 0..old_total {
            cache.observe(route, 0.1, -1.0, i as u64 * 1_000_000_000);
        }
        for j in 0..10usize {
            cache.observe(
                route,
                2.0 + (j as f32 * 0.1),
                -1.0,
                (old_total + j) as u64 * 1_000_000_000,
            );
        }

        let cutoff = old_total as u64 * 1_000_000_000;
        let p50 = cache
            .quantile_entry_since(route, 0.50, cutoff)
            .expect("subjanela recente deve permanecer materializada");
        assert!(
            p50 >= 2.3,
            "features since-cutoff recentes não devem ser diluídas por prefixo compactado; p50={p50}"
        );
    }

    #[test]
    fn proportional_weight_counts_only_overlap_after_cutoff() {
        let sample = SampleTick {
            start_ts_ns: 0,
            end_ts_ns: 100,
            entry_bucket: to_bucket(1.0) as u32,
            exit_bucket: to_bucket(-1.0) as u32,
            weight: 101,
        };

        assert_eq!(proportional_weight(&sample, 0), 101);
        assert_eq!(proportional_weight(&sample, 50), 51);
        assert_eq!(proportional_weight(&sample, 101), 0);
    }

    #[test]
    fn exit_run_duration_quantiles_measures_exit_only_not_gross_intra_tick() {
        let cache = mk_cache();
        let route = mk_route(1);
        for i in 0..5u64 {
            cache.observe(route, 0.2, -1.0, i * 1_000_000_000);
        }
        let (p05, p50, p95) = cache
            .exit_run_duration_quantiles(route, -1.2)
            .expect("exit >= -1.2 deveria formar um run histórico");
        assert_eq!((p05, p50, p95), (4, 4, 4));
    }

    #[test]
    fn oldest_observation_ns_uses_real_ring_front() {
        let cache = mk_cache();
        let route = mk_route(1);

        cache.observe(route, 2.0, -1.0, 1_000);
        cache.observe(route, 2.1, -0.9, 2_000);

        assert_eq!(cache.oldest_observation_ns(route), 1_000);
        assert_ne!(
            cache.oldest_observation_ns(route),
            cache
                .last_update_ns(route)
                .saturating_sub(cache.config().window_ns),
            "oldest cache ts must not be synthesized from a full 24h window"
        );
    }

    #[test]
    fn default_config_has_production_params() {
        let cfg = CacheConfig::default();
        assert_eq!(cfg.decimation, 10);
        assert_eq!(cfg.window_ns, 24 * 3600 * 1_000_000_000);
        assert_eq!(cfg.rebuild_interval_ns, 3600 * 1_000_000_000);
        assert_eq!(cfg.ring_initial_capacity, 64);
    }
}
