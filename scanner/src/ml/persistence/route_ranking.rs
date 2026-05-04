//! Ranker de rotas com janela rolling real.
//!
//! Mantém **96 buckets de 15 min** (= 24h de histórico). A cada rollover,
//! o bucket mais antigo é descartado e um novo bucket vazio criado.
//! **Score primário**: `accept_count_24h` (cobre objetivo "raw completo onde
//! precisa reconstruir label"). **Desempate**: `candidate_count_24h * (1 +
//! vol24_mean).ln_1p()` seguido de `vol24_mean`.
//!
//! A seleção do `priority_set` usa `target_coverage` dinâmico (default 0.95):
//! ordena rotas por score descendente e cumula até cobrir 95% do total.
//! Clamp `[20, 200]` rotas — evita ranker degenerar em 1-2 ou explodir.

use std::collections::{HashMap, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};

use parking_lot::Mutex;

use crate::ml::contract::RouteId;

/// Duração de cada bucket em ns (15 min).
pub const BUCKET_NS: u64 = 15 * 60 * 1_000_000_000;

/// Número de buckets mantidos (24 h).
pub const BUCKET_COUNT: usize = 96;

/// Clamp mínimo do priority_set.
pub const PRIORITY_MIN: usize = 20;

/// Clamp máximo do priority_set.
pub const PRIORITY_MAX: usize = 200;

/// Estatísticas por rota dentro de UM bucket temporal.
#[derive(Debug, Default, Clone, Copy)]
struct RouteBucketStats {
    accept_count: u32,
    candidate_count: u32,
    vol24_sum: f64,
    n: u32,
}

/// Score composto de uma rota agregado sobre 24 h.
#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub struct RouteScore {
    pub accept_count_24h: u64,
    pub candidate_count_24h: u64,
    pub vol24_mean: f64,
}

impl RouteScore {
    /// Score lexicográfico — retornado como (primary, secondary) para
    /// ordenação estável via `sort_by`. Primary = accept_count (correção Q1);
    /// secondary = candidate_count * (1 + vol).ln_1p() (Q1 desempate).
    pub fn composite(&self) -> (u64, f64) {
        let secondary = (self.candidate_count_24h as f64) * (1.0 + self.vol24_mean).ln_1p();
        (self.accept_count_24h, secondary)
    }
}

/// Ranker concorrente. Interior mutable via `Mutex` (escrita ~ 5 obs/s por
/// rota = baixa contenção). Priority_set materializado é retornado por
/// `snapshot_priority_set` e instalado atomicamente no `RouteDecimator`.
pub struct RouteRanking {
    inner: Mutex<Inner>,
    target_coverage: f64,
}

struct Inner {
    /// Ring de buckets, indexado por `bucket_idx`.
    buckets: [HashMap<RouteId, RouteBucketStats>; BUCKET_COUNT],
    /// Primeiro ns do bucket atual (alinhado a múltiplos de BUCKET_NS).
    current_bucket_start_ns: u64,
    /// Índice do bucket atual dentro do ring.
    current_idx: usize,
}

impl RouteRanking {
    /// Cria ranker inicializado em `now_ns`. `target_coverage` clamp em
    /// `[0.5, 0.999]`.
    pub fn new(now_ns: u64, target_coverage: f64) -> Self {
        let aligned = (now_ns / BUCKET_NS) * BUCKET_NS;
        let buckets: [HashMap<RouteId, RouteBucketStats>; BUCKET_COUNT] =
            std::array::from_fn(|_| HashMap::new());
        Self {
            inner: Mutex::new(Inner {
                buckets,
                current_bucket_start_ns: aligned,
                current_idx: 0,
            }),
            target_coverage: target_coverage.clamp(0.5, 0.999),
        }
    }

    /// Conveniência: usa `now_ns` via SystemTime.
    pub fn with_defaults() -> Self {
        let now_ns = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0);
        Self::new(now_ns, 0.95)
    }

    /// Registra uma observação (candidate). `accepted` indica se passou o
    /// trigger `SampleDecision::Accept`. `vol24` = `min(buy_vol24, sell_vol24)`.
    pub fn observe(&self, route: RouteId, now_ns: u64, accepted: bool, vol24: f64) {
        let mut inner = self.inner.lock();
        inner.rollover_if_needed(now_ns);
        let idx = inner.current_idx;
        let e = inner.buckets[idx].entry(route).or_default();
        e.candidate_count = e.candidate_count.saturating_add(1);
        if accepted {
            e.accept_count = e.accept_count.saturating_add(1);
        }
        if vol24.is_finite() && vol24 > 0.0 {
            e.vol24_sum += vol24;
            e.n = e.n.saturating_add(1);
        }
    }

    /// Computa agregação 24h por rota. O(N_rotas × 96).
    fn aggregate(&self) -> HashMap<RouteId, RouteScore> {
        let inner = self.inner.lock();
        let mut agg: HashMap<RouteId, RouteScore> = HashMap::new();
        for bucket in inner.buckets.iter() {
            for (route, stats) in bucket.iter() {
                let s = agg.entry(*route).or_default();
                s.accept_count_24h = s.accept_count_24h.saturating_add(stats.accept_count as u64);
                s.candidate_count_24h = s
                    .candidate_count_24h
                    .saturating_add(stats.candidate_count as u64);
                if stats.n > 0 {
                    let weighted_sum = stats.vol24_sum;
                    // vol24_mean é running mean de bucket means — suficiente para desempate.
                    let bucket_mean = weighted_sum / (stats.n as f64);
                    // Média móvel incremental: MediaAcc = (n_acum * media_acum + bucket_mean) / (n_acum+1).
                    // Simplificação: manter soma de médias por bucket e dividir por num buckets não-vazios.
                    // Aqui acumulamos na soma e contamos buckets não-vazios via n_observations.
                    s.vol24_mean += bucket_mean;
                }
            }
        }
        // Divide vol24_mean pelo número de buckets não-vazios desta rota.
        // Aproximação — suficiente para ordenação relativa.
        for (route, score) in agg.iter_mut() {
            let non_empty_buckets = inner
                .buckets
                .iter()
                .filter(|b| b.get(route).map(|s| s.n > 0).unwrap_or(false))
                .count() as f64;
            if non_empty_buckets > 0.0 {
                score.vol24_mean /= non_empty_buckets;
            }
        }
        agg
    }

    /// Retorna o score 24h de uma rota sem agregar/ordenar o universo todo.
    ///
    /// Usado no hot path de criação de labels. `top_k(usize::MAX)` é correto
    /// para dashboards, mas é O(N rotas × buckets) + sort; chamar isso para
    /// cada candidato degrada o ciclo de coleta.
    pub fn score_for_route(&self, route: RouteId) -> Option<RouteScore> {
        let inner = self.inner.lock();
        let mut score = RouteScore::default();
        let mut non_empty_buckets = 0u64;
        for bucket in inner.buckets.iter() {
            let Some(stats) = bucket.get(&route) else {
                continue;
            };
            score.accept_count_24h = score
                .accept_count_24h
                .saturating_add(stats.accept_count as u64);
            score.candidate_count_24h = score
                .candidate_count_24h
                .saturating_add(stats.candidate_count as u64);
            if stats.n > 0 {
                score.vol24_mean += stats.vol24_sum / stats.n as f64;
                non_empty_buckets = non_empty_buckets.saturating_add(1);
            }
        }
        if score.accept_count_24h == 0
            && score.candidate_count_24h == 0
            && non_empty_buckets == 0
        {
            return None;
        }
        if non_empty_buckets > 0 {
            score.vol24_mean /= non_empty_buckets as f64;
        }
        Some(score)
    }

    /// Seleciona priority_set via `target_coverage`. Clamp `[20, 200]`.
    ///
    /// Estratégia:
    /// 1. Ordena rotas por score composto descendente.
    /// 2. Cumula score até atingir `target_coverage` do total.
    /// 3. Aplica clamp inferior/superior.
    pub fn snapshot_priority_set(&self) -> HashSet<RouteId> {
        let agg = self.aggregate();
        if agg.is_empty() {
            return HashSet::new();
        }

        let mut scored: Vec<(RouteId, (u64, f64))> =
            agg.into_iter().map(|(r, s)| (r, s.composite())).collect();
        // Sort descendente: primeiro primary (accept_count), depois secondary.
        scored.sort_by(|a, b| {
            b.1 .0.cmp(&a.1 .0).then(
                b.1 .1
                    .partial_cmp(&a.1 .1)
                    .unwrap_or(std::cmp::Ordering::Equal),
            )
        });

        let total_primary: u64 = scored.iter().map(|(_, (p, _))| *p).sum();
        if total_primary == 0 {
            // Sem accepts — priority = top PRIORITY_MIN por candidate_count
            // (secondary) como fallback.
            return scored
                .into_iter()
                .take(PRIORITY_MIN)
                .map(|(r, _)| r)
                .collect();
        }

        let target = (total_primary as f64) * self.target_coverage;
        let mut acc_primary: u64 = 0;
        let mut chosen: Vec<RouteId> = Vec::new();
        for (route, (primary, _)) in scored.iter() {
            chosen.push(*route);
            acc_primary = acc_primary.saturating_add(*primary);
            if (acc_primary as f64) >= target && chosen.len() >= PRIORITY_MIN {
                break;
            }
        }
        // Clamp superior.
        if chosen.len() > PRIORITY_MAX {
            chosen.truncate(PRIORITY_MAX);
        }
        chosen.into_iter().collect()
    }

    /// Helper para dashboards/tests — retorna top-K rotas com scores.
    pub fn top_k(&self, k: usize) -> Vec<(RouteId, RouteScore)> {
        let agg = self.aggregate();
        let mut v: Vec<(RouteId, RouteScore)> = agg.into_iter().collect();
        v.sort_by(|a, b| {
            let (pa, sa) = a.1.composite();
            let (pb, sb) = b.1.composite();
            pb.cmp(&pa)
                .then(sb.partial_cmp(&sa).unwrap_or(std::cmp::Ordering::Equal))
        });
        v.truncate(k);
        v
    }
}

impl Inner {
    fn rollover_if_needed(&mut self, now_ns: u64) {
        let target = (now_ns / BUCKET_NS) * BUCKET_NS;
        if target <= self.current_bucket_start_ns {
            return;
        }
        // Rolar quantos buckets passaram. Se passaram > BUCKET_COUNT,
        // limpa tudo (gap longo).
        let buckets_to_advance =
            ((target - self.current_bucket_start_ns) / BUCKET_NS).min(BUCKET_COUNT as u64) as usize;
        for _ in 0..buckets_to_advance {
            self.current_idx = (self.current_idx + 1) % BUCKET_COUNT;
            self.buckets[self.current_idx].clear();
        }
        self.current_bucket_start_ns = target;
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SymbolId, Venue};

    fn mk_route(sym: u32, b: Venue, s: Venue) -> RouteId {
        RouteId {
            symbol_id: SymbolId(sym),
            buy_venue: b,
            sell_venue: s,
        }
    }

    #[test]
    fn ranker_accumulates_within_single_bucket() {
        let r = RouteRanking::new(0, 0.95);
        let route = mk_route(1, Venue::MexcFut, Venue::BingxFut);
        for _ in 0..50 {
            r.observe(route, 1_000, true, 1e6);
        }
        let top = r.top_k(5);
        assert_eq!(top.len(), 1);
        assert_eq!(top[0].0, route);
        assert_eq!(top[0].1.accept_count_24h, 50);
        assert_eq!(r.score_for_route(route), Some(top[0].1));
        assert_eq!(
            r.score_for_route(mk_route(99, Venue::GateFut, Venue::BinanceFut)),
            None
        );
    }

    #[test]
    fn ranker_bucket_rolls_over_after_15min() {
        let r = RouteRanking::new(0, 0.95);
        let route = mk_route(1, Venue::MexcFut, Venue::BingxFut);
        // Bucket 0: 10 accepts
        for _ in 0..10 {
            r.observe(route, 1_000, true, 1e6);
        }
        // Bucket 1 (15 min depois): 20 accepts
        let t1 = BUCKET_NS + 1_000;
        for _ in 0..20 {
            r.observe(route, t1, true, 1e6);
        }
        // Total = 30 dentro dos 24h.
        let top = r.top_k(5);
        assert_eq!(top[0].1.accept_count_24h, 30);
    }

    #[test]
    fn ranker_drops_buckets_older_than_24h() {
        let r = RouteRanking::new(0, 0.95);
        let route = mk_route(1, Venue::MexcFut, Venue::BingxFut);
        for _ in 0..10 {
            r.observe(route, 1_000, true, 1e6);
        }
        // Avança 25 horas — bucket original fora da janela.
        let far_future = 25 * 3600 * 1_000_000_000u64;
        for _ in 0..5 {
            r.observe(route, far_future, true, 1e6);
        }
        let top = r.top_k(5);
        assert_eq!(
            top[0].1.accept_count_24h, 5,
            "accepts antigos devem ter sido dropados ao rolar > BUCKET_COUNT"
        );
    }

    #[test]
    fn priority_set_respects_target_coverage_and_min_clamp() {
        let r = RouteRanking::new(0, 0.50);
        // 30 rotas com acceptcount variado: rota 0 = 100, 1 = 90, ... 29 = 1
        for i in 0..30u32 {
            let route = mk_route(i, Venue::MexcFut, Venue::BingxFut);
            let n = (100u32).saturating_sub(i * 3);
            for _ in 0..n {
                r.observe(route, 1_000, true, 1e6);
            }
        }
        let ps = r.snapshot_priority_set();
        // 50% coverage + PRIORITY_MIN = 20. Logo >= 20.
        assert!(ps.len() >= PRIORITY_MIN);
        assert!(ps.len() <= PRIORITY_MAX);
    }

    #[test]
    fn priority_set_does_not_exceed_max_clamp() {
        let r = RouteRanking::new(0, 0.99);
        // 500 rotas com distribuição uniforme: MAX=200 corta.
        for i in 0..500u32 {
            let route = mk_route(i, Venue::MexcFut, Venue::BingxFut);
            for _ in 0..5 {
                r.observe(route, 1_000, true, 1e6);
            }
        }
        let ps = r.snapshot_priority_set();
        assert!(ps.len() <= PRIORITY_MAX);
    }

    #[test]
    fn primary_score_is_accept_count_not_candidate_count() {
        // Q1: rotina com muitos candidates mas poucos accepts perde para
        // rotina com mais accepts.
        let r = RouteRanking::new(0, 0.95);
        let route_a = mk_route(1, Venue::MexcFut, Venue::BingxFut);
        let route_b = mk_route(2, Venue::KucoinFut, Venue::GateFut);
        // A: 10 candidates, 10 accepts
        for _ in 0..10 {
            r.observe(route_a, 1_000, true, 1e6);
        }
        // B: 100 candidates, 5 accepts
        for _ in 0..5 {
            r.observe(route_b, 1_000, true, 1e6);
        }
        for _ in 0..95 {
            r.observe(route_b, 1_000, false, 1e6);
        }
        let top = r.top_k(2);
        assert_eq!(top[0].0, route_a, "A tem mais accepts → deve liderar");
        assert_eq!(top[0].1.accept_count_24h, 10);
        assert_eq!(top[1].0, route_b);
        assert_eq!(top[1].1.accept_count_24h, 5);
    }

    #[test]
    fn empty_ranker_returns_empty_priority_set() {
        let r = RouteRanking::new(0, 0.95);
        assert!(r.snapshot_priority_set().is_empty());
    }
}
