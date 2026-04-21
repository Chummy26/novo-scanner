//! Hot cache em memória para queries de percentil de spread por rota.
//!
//! Implementa a **Camada 1b** da arquitetura de feature store (ADR-012).
//! Cache em RAM com janela rolante **24h real** (Fase 0 C6 fix), baseado
//! em `hdrhistogram` para queries O(log range) + ring buffer decimado
//! 1-em-10 para expiração de samples antigos.
//!
//! # Arquitetura
//!
//! Cada `PerRouteCache` mantém:
//!
//! - `entry_hist` / `exit_hist` — `Histogram<u64>` (hdrhistogram 7.x).
//! - `ring` — `VecDeque<SampleTick>` decimada 1-em-10. Contém só samples
//!   dentro da janela de 24h.
//! - `decimation_counter` — contador sequencial; só guarda no ring
//!   quando `counter % DECIMATION == 0`.
//! - `last_rebuild_ns` — timestamp do último rebuild completo do
//!   histograma a partir do ring.
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
//! Histograma é **reconstruído periodicamente** (a cada 1h) a partir
//! do ring atual — mais simples que decremento incremental
//! (hdrhistogram não suporta nativamente) e custo amortizado é aceitável
//! (~3 ms por rota por hora = desprezível).
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
//! Precisão com `sigfig=2` + `median_equivalent` → bucket effective
//! ≈ 0.01% em spreads típicos.

use std::collections::VecDeque;
use std::sync::Arc;

use ahash::AHashMap;
use hdrhistogram::Histogram;
use parking_lot::RwLock;

use crate::ml::contract::RouteId;

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

const BUCKET_SHIFT: i64 = 100_000;
const BUCKET_SCALE: f32 = 10_000.0;
const BUCKET_MAX: u64 = 200_000;

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

// ---------------------------------------------------------------------------
// Configuração do cache
// ---------------------------------------------------------------------------

/// Parâmetros da janela rolante + decimação.
///
/// Defaults escolhidos em `DATASET_ACTION_PLAN.md` Fase 0:
/// - decimação 1-em-10 → 2.4 GB total para 2600 rotas × 24h.
/// - janela 24h (convenção do skill §4).
/// - rebuild 1h → custo amortizado ~3 ms/rota/hora.
#[derive(Debug, Clone, Copy)]
pub struct CacheConfig {
    /// Guarda 1 a cada `decimation` samples no ring (e histograma).
    /// `1` = sem decimação (usado em testes).
    pub decimation: u32,
    /// Tamanho da janela rolante em nanosegundos. Default 24h.
    pub window_ns: u64,
    /// Intervalo entre rebuilds completos do histograma (ns). Default 1h.
    pub rebuild_interval_ns: u64,
    /// Capacidade inicial do `VecDeque` ring buffer (não hard limit; VecDeque
    /// cresce sob demanda). Default 1024; max esperado ~144k por rota.
    pub ring_initial_capacity: usize,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            decimation: 10,
            window_ns: 24 * 3600 * 1_000_000_000,
            rebuild_interval_ns: 3600 * 1_000_000_000,
            ring_initial_capacity: 1024,
        }
    }
}

impl CacheConfig {
    /// Config para testes: sem decimação, janela curta para expiração rápida.
    pub fn for_testing() -> Self {
        Self {
            decimation: 1,
            window_ns: u64::MAX, // sem expiração por padrão em tests
            rebuild_interval_ns: u64::MAX, // sem rebuild por padrão
            ring_initial_capacity: 64,
        }
    }
}

// ---------------------------------------------------------------------------
// Per-route cache
// ---------------------------------------------------------------------------

/// Uma observação decimada no ring buffer. 24 bytes; 2600 × 144k × 24 B ≈ 9 GB
/// teórico, mas na prática rotas raramente saturam janela.
#[derive(Debug, Clone, Copy)]
struct SampleTick {
    ts_ns: u64,
    entry_bucket: u32, // cabe em u32 (BUCKET_MAX = 200_000)
    exit_bucket: u32,
}

/// Estado de uma rota: dois histogramas (entry, exit) + ring decimado + contadores.
struct PerRouteCache {
    entry_hist: Histogram<u64>,
    exit_hist: Histogram<u64>,
    ring: VecDeque<SampleTick>,
    decimation_counter: u32,
    /// Contador de samples **no ring** (não total desde boot). Usado
    /// para `n_min` gate pelo trigger/baseline.
    n_observations: u64,
    last_update_ns: u64,
    last_rebuild_ns: u64,
    cfg: CacheConfig,
}

impl PerRouteCache {
    fn new(cfg: CacheConfig) -> Self {
        // Range [1, 200_000] cobre spread ∈ [-10%, +10%]. sigfig=2 com
        // median_equivalent em queries → bucket effective ≈ 0.01% em
        // spreads típicos. Memória: ~14 KB/histograma × 2 × 2600 rotas ≈ 73 MB.
        let entry_hist = Histogram::<u64>::new_with_bounds(1, BUCKET_MAX, 2)
            .expect("hdrhistogram init");
        let exit_hist = Histogram::<u64>::new_with_bounds(1, BUCKET_MAX, 2)
            .expect("hdrhistogram init");
        Self {
            entry_hist,
            exit_hist,
            ring: VecDeque::with_capacity(cfg.ring_initial_capacity),
            decimation_counter: 0,
            n_observations: 0,
            last_update_ns: 0,
            last_rebuild_ns: 0,
            cfg,
        }
    }

    #[inline]
    fn observe(&mut self, entry: f32, exit: f32, ts_ns: u64) {
        // Decimação: só registra 1-em-`decimation` samples.
        self.decimation_counter = self.decimation_counter.wrapping_add(1);
        if self.decimation_counter % self.cfg.decimation != 0 {
            self.last_update_ns = ts_ns;
            return;
        }

        let eb = to_bucket(entry);
        let xb = to_bucket(exit);

        // Push into ring.
        self.ring.push_back(SampleTick {
            ts_ns,
            entry_bucket: eb as u32,
            exit_bucket: xb as u32,
        });

        // Expira samples > janela.
        let cutoff = ts_ns.saturating_sub(self.cfg.window_ns);
        let mut expired = 0u64;
        while let Some(front) = self.ring.front() {
            if front.ts_ns < cutoff {
                self.ring.pop_front();
                expired += 1;
            } else {
                break;
            }
        }

        // Rebuild periódico — mais simples que decremento incremental.
        let should_rebuild = expired > 0
            && (ts_ns.saturating_sub(self.last_rebuild_ns) >= self.cfg.rebuild_interval_ns);
        if should_rebuild {
            self.entry_hist.reset();
            self.exit_hist.reset();
            for s in &self.ring {
                let _ = self.entry_hist.record(s.entry_bucket as u64);
                let _ = self.exit_hist.record(s.exit_bucket as u64);
            }
            self.last_rebuild_ns = ts_ns;
        } else {
            // Fast path: incremental record.
            let _ = self.entry_hist.record(eb);
            let _ = self.exit_hist.record(xb);
        }

        // n_observations = samples atualmente no ring (pós-expiração).
        self.n_observations = self.ring.len() as u64;
        self.last_update_ns = ts_ns;
    }

    #[inline]
    fn quantile_entry(&self, q: f64) -> Option<f32> {
        if self.n_observations == 0 {
            return None;
        }
        let v = self.entry_hist.value_at_quantile(q);
        let mid = self.entry_hist.median_equivalent(v);
        Some(from_bucket(mid))
    }

    #[inline]
    fn quantile_exit(&self, q: f64) -> Option<f32> {
        if self.n_observations == 0 {
            return None;
        }
        let v = self.exit_hist.value_at_quantile(q);
        let mid = self.exit_hist.median_equivalent(v);
        Some(from_bucket(mid))
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
    /// Constrói com config default (decimação 10, janela 24h, rebuild 1h).
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
    /// ring/histograma. Isso reduz warm-up-visível de `n_min=500` para
    /// ~14 min a 6 RPS (500 × 10 / 6 ≈ 833s).
    pub fn observe(&self, route: RouteId, entry_spread: f32, exit_spread: f32, ts_ns: u64) {
        let mut guard = self.routes.write();
        let cache = guard.entry(route).or_insert_with(|| PerRouteCache::new(self.cfg));
        cache.observe(entry_spread, exit_spread, ts_ns);
    }

    pub fn quantile_entry(&self, route: RouteId, q: f64) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.quantile_entry(q)
    }

    pub fn quantile_exit(&self, route: RouteId, q: f64) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.quantile_exit(q)
    }

    pub fn n_observations(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard.get(&route).map(|c| c.n_observations).unwrap_or(0)
    }

    pub fn last_update_ns(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard.get(&route).map(|c| c.last_update_ns).unwrap_or(0)
    }

    pub fn routes_tracked(&self) -> usize {
        self.routes.read().len()
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
        // 100 observações brutas → 10 no ring.
        for i in 0..100 {
            cache.observe(route, 2.0, -1.0, i);
        }
        let n = cache.n_observations(route);
        assert_eq!(n, 10, "decimação 10 em 100 samples → 10 no ring, got {n}");
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
        assert_eq!(n, 1, "após ts=2000 com janela 1000, só resta a última; got {n}");
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
        assert!(p50 >= 4.8 && p50 <= 5.2, "p50 = {p50}, expected ~5.0 após expiração");
    }

    #[test]
    fn default_config_has_production_params() {
        let cfg = CacheConfig::default();
        assert_eq!(cfg.decimation, 10);
        assert_eq!(cfg.window_ns, 24 * 3600 * 1_000_000_000);
        assert_eq!(cfg.rebuild_interval_ns, 3600 * 1_000_000_000);
    }
}
