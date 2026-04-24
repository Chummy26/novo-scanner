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
//! - `gross_hist` — histograma do lucro bruto pareado `entry + exit`.
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
//! Histograma é **reconstruído imediatamente quando há expiração** a partir
//! do ring atual. `hdrhistogram` não suporta decremento incremental; rebuild
//! imediato preserva quantis point-in-time sem carregar amostras vencidas.
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

#[inline]
fn quantile_sorted_u64(values: &[u64], q: f64) -> u32 {
    debug_assert!(!values.is_empty());
    if values.len() == 1 {
        return values[0].min(u32::MAX as u64) as u32;
    }
    let clamped = q.clamp(0.0, 1.0);
    let idx = (clamped * (values.len() - 1) as f64).round() as usize;
    values[idx.min(values.len() - 1)].min(u32::MAX as u64) as u32
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
            window_ns: u64::MAX,           // sem expiração por padrão em tests
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
    entry_bucket: u32,
    exit_bucket: u32,
}

struct PerRouteCache {
    entry_hist: Histogram<u64>,
    exit_hist: Histogram<u64>,
    ring: VecDeque<SampleTick>,
    /// Wrap seguro por ~34×10⁹ anos em 17k RPS.
    decimation_counter: u64,
    /// Contador de samples no ring (não total desde boot). Usado para
    /// `n_min` gate pelo trigger/baseline.
    n_observations: u64,
    last_update_ns: u64,
    last_rebuild_ns: u64,
    cfg: CacheConfig,
}

impl PerRouteCache {
    fn new(cfg: CacheConfig) -> Self {
        // Range [1, 200_000] cobre spread ∈ [-10%, +10%]. sigfig=2 com
        // median_equivalent em queries → bucket effective ≈ 0.01% em
        // spreads típicos.
        let entry_hist =
            Histogram::<u64>::new_with_bounds(1, BUCKET_MAX, 2).expect("hdrhistogram init");
        let exit_hist =
            Histogram::<u64>::new_with_bounds(1, BUCKET_MAX, 2).expect("hdrhistogram init");
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
        self.decimation_counter = self.decimation_counter.wrapping_add(1);
        if self.decimation_counter % (self.cfg.decimation as u64) != 0 {
            self.last_update_ns = ts_ns;
            return;
        }

        let eb = to_bucket(entry);
        let xb = to_bucket(exit);

        self.ring.push_back(SampleTick {
            ts_ns,
            entry_bucket: eb as u32,
            exit_bucket: xb as u32,
        });

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

        // `hdrhistogram` não decrementa. Se houve expiração, rebuild
        // imediato evita quantis PIT contaminados por amostras fora da janela.
        if expired > 0 {
            self.entry_hist.reset();
            self.exit_hist.reset();
            for s in &self.ring {
                let _ = self.entry_hist.record(s.entry_bucket as u64);
                let _ = self.exit_hist.record(s.exit_bucket as u64);
            }
            self.last_rebuild_ns = ts_ns;
        } else {
            let _ = self.entry_hist.record(eb);
            let _ = self.exit_hist.record(xb);
        }

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

    #[inline]
    fn probability_entry_ge(&self, threshold: f32) -> Option<(f32, u64, u64)> {
        if self.n_observations == 0 {
            return None;
        }
        let low = to_bucket(threshold);
        let successes = self.entry_hist.count_between(low, BUCKET_MAX);
        let total = self.n_observations;
        let p = successes as f32 / total as f32;
        Some((p, successes, total))
    }

    /// Fix B1: percentil empírico de `spread_pct` na ECDF 24h de entry.
    /// Retorna fração em `[0, 1]` — Teste 1 da skill §4 literal.
    #[inline]
    fn entry_rank_percentile(&self, spread_pct: f32) -> Option<f32> {
        if self.n_observations == 0 {
            return None;
        }
        let bucket = to_bucket(spread_pct);
        // Count de amostras com entry_bucket <= bucket (inclui o próprio).
        let below = self.entry_hist.count_between(1, bucket);
        Some(below as f32 / self.n_observations as f32)
    }

    /// Fix B1: MAD (Median Absolute Deviation) robusto de entry.
    /// Computa passo-único: mediana + MAD estimado via quantis do hist.
    #[inline]
    fn entry_mad_robust(&self) -> Option<f32> {
        if self.n_observations < 30 {
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

    /// Fix B9: Tail ratio p99/p95 com safeguard para buckets colapsados.
    /// Retorna `None` quando a amostra é pequena OR quando `p99` e `p95`
    /// caem no mesmo bucket do HDR histogram (indistinção cauda).
    #[inline]
    fn tail_ratio_p99_p95(&self) -> Option<f32> {
        if self.n_observations < 30 {
            return None;
        }
        let p99_bucket = self.entry_hist.value_at_quantile(0.99);
        let p95_bucket = self.entry_hist.value_at_quantile(0.95);
        // Fix B9: buckets idênticos → colapso de cauda → None.
        // Antes retornava 1.0, semanticamente "cauda fina normal" falso.
        if p99_bucket <= p95_bucket + 1 {
            return None;
        }
        let p99 = from_bucket(self.entry_hist.median_equivalent(p99_bucket));
        let p95 = from_bucket(self.entry_hist.median_equivalent(p95_bucket));
        if p95.abs() < 1e-6 {
            return None;
        }
        Some(p99 / p95)
    }

    #[inline]
    fn probability_exit_ge(&self, threshold: f32) -> Option<(f32, u64, u64)> {
        if self.n_observations == 0 {
            return None;
        }
        let low = to_bucket(threshold);
        let successes = self.exit_hist.count_between(low, BUCKET_MAX);
        let total = self.n_observations;
        let p = successes as f32 / total as f32;
        Some((p, successes, total))
    }

    #[inline]
    fn exit_run_duration_quantiles(&self, exit_threshold: f32) -> Option<(u32, u32, u32)> {
        if self.n_observations == 0 {
            return None;
        }

        let threshold_bucket = to_bucket(exit_threshold) as u32;
        let mut runs: Vec<u64> = Vec::new();
        let mut active_start: Option<u64> = None;
        let mut last_ts: Option<u64> = None;

        for s in &self.ring {
            last_ts = Some(s.ts_ns);
            if s.exit_bucket >= threshold_bucket {
                if active_start.is_none() {
                    active_start = Some(s.ts_ns);
                }
            } else if let Some(start) = active_start.take() {
                runs.push((s.ts_ns.saturating_sub(start) + 999_999_999) / 1_000_000_000);
            }
        }

        if let (Some(start), Some(end)) = (active_start, last_ts) {
            runs.push((end.saturating_sub(start) + 999_999_999) / 1_000_000_000);
        }

        if runs.is_empty() {
            return None;
        }

        runs.sort_unstable();
        Some((
            quantile_sorted_u64(&runs, 0.05),
            quantile_sorted_u64(&runs, 0.50),
            quantile_sorted_u64(&runs, 0.95),
        ))
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
    /// ring/histograma. Isso reduz warm-up-visível de `n_min=500` para
    /// ~14 min a 6 RPS (500 × 10 / 6 ≈ 833s).
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

    pub fn quantile_exit(&self, route: RouteId, q: f64) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.quantile_exit(q)
    }

    pub fn n_observations(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard.get(&route).map(|c| c.n_observations).unwrap_or(0)
    }

    pub fn probability_entry_ge(&self, route: RouteId, threshold: f32) -> Option<(f32, u64, u64)> {
        let guard = self.routes.read();
        guard.get(&route)?.probability_entry_ge(threshold)
    }

    pub fn probability_exit_ge(&self, route: RouteId, threshold: f32) -> Option<(f32, u64, u64)> {
        let guard = self.routes.read();
        guard.get(&route)?.probability_exit_ge(threshold)
    }

    /// Fix B1: percentil empírico de `spread_pct` na ECDF 24h de entry.
    /// Retorna `P_hist(entry ≤ spread_pct)` em [0,1] — Teste 1 literal.
    pub fn entry_rank_percentile(&self, route: RouteId, spread_pct: f32) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.entry_rank_percentile(spread_pct)
    }

    /// Fix B1: MAD robusto de entry (via IQR consistente com normal).
    pub fn entry_mad_robust(&self, route: RouteId) -> Option<f32> {
        let guard = self.routes.read();
        guard.get(&route)?.entry_mad_robust()
    }

    /// Fix B9: tail ratio com safeguard para buckets colapsados.
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
            .and_then(|c| c.ring.front().map(|s| s.ts_ns))
            .unwrap_or(0)
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
    }
}
