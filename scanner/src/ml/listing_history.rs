//! Tracking de histórico de listagem por rota — anti-survivorship bias.
//!
//! Implementa **C5 fix** (DATASET_ACTION_PLAN) + ADR-014 gap A2 (feature
//! `listing_age_days` ausente) + ADR-009 anti-survivorship.
//!
//! # Por que isto existe
//!
//! Sem tracking, rotas delistadas durante a janela de coleta **somem
//! silenciosamente** do dataset — o modelo A2 só "vê" rotas que
//! sobreviveram, criando **survivorship bias** clássico (Brown et al. 1992
//! *RFS* 5; Elton et al. 1996 *JoF* 51). Backtest fica falsamente otimista.
//!
//! # O que este módulo garante
//!
//! 1. **`first_seen_ns`** registra quando uma rota apareceu pela primeira
//!    vez no scanner. Fonte da feature `listing_age_days` (ADR-014 A2).
//! 2. **`last_seen_ns`** rastreia última observação. Se uma rota não é
//!    vista por `delisting_detection_window_ns` (default 1h), é marcada
//!    `Delisted` — `active_until_ns = Some(last_seen_ns)`.
//! 3. **Métricas** para dashboard: `active_routes()` vs `delisted_routes()`
//!    — observável em Prometheus via `MlServer::metrics()`.
//!
//! # Persistência
//!
//! Como C1 (Parquet writer), este estado vive em RAM no MVP; flush para
//! `listing_history.parquet` acontece junto com o writer de
//! `AcceptedSample` em Marco 2. Schema alvo:
//!
//! ```text
//! listing_history {
//!   rota_id STRUCT<symbol_id u32, buy_venue u8, sell_venue u8>,
//!   first_seen_ns i64,
//!   last_seen_ns i64,
//!   active_until_ns i64?,  -- NULL se ativa
//!   n_snapshots u64,
//!   delist_reason STRING?  -- futuro: detected/announced/manual
//! }
//! ```

use std::sync::Arc;

use ahash::AHashMap;
use parking_lot::RwLock;

use crate::ml::contract::RouteId;
use crate::types::SymbolId;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/// Se uma rota não é vista por este período, é marcada como `Delisted`.
///
/// Default 1h (3.6e12 ns) — conservador para evitar false positives por
/// disconnect temporário de WS. Venues reais geralmente reconectam em
/// segundos, e delistings anunciados dão 24h+ de aviso.
pub const DEFAULT_DELISTING_DETECTION_WINDOW_NS: u64 = 3600 * 1_000_000_000;

/// Nanosegundos em um dia — para conversão `listing_age_days`.
const NS_PER_DAY: f64 = 86_400.0 * 1_000_000_000.0;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/// Estado do ciclo de vida de uma rota no scanner.
#[derive(Debug, Clone, Copy)]
pub struct RouteLifecycle {
    /// Primeiro snapshot observado (ns). Usado para `listing_age_days`.
    pub first_seen_ns: u64,
    /// Último snapshot observado (ns).
    pub last_seen_ns: u64,
    /// Total de snapshots observados (TODOS, pré-trigger — não apenas Accept).
    pub n_snapshots: u64,
    /// `Some(ts_ns)` quando rota é marcada como delisted (via
    /// `mark_delisted` explícito ou via `sweep_inactive`).
    pub active_until_ns: Option<u64>,
}

impl RouteLifecycle {
    fn new(ts_ns: u64) -> Self {
        Self {
            first_seen_ns: ts_ns,
            last_seen_ns: ts_ns,
            n_snapshots: 1,
            active_until_ns: None,
        }
    }

    #[inline]
    fn record_seen(&mut self, ts_ns: u64) {
        if ts_ns > self.last_seen_ns {
            self.last_seen_ns = ts_ns;
        }
        self.n_snapshots = self.n_snapshots.saturating_add(1);
        // Resurge rota que tinha sido marcada como delisted (re-listing).
        // Operacionalmente raro mas tratado defensivamente.
        self.active_until_ns = None;
    }

    #[inline]
    fn is_active(&self) -> bool {
        self.active_until_ns.is_none()
    }
}

// ---------------------------------------------------------------------------
// ListingHistory
// ---------------------------------------------------------------------------

/// Tracker thread-safe do histórico de listagem de todas as rotas.
pub struct ListingHistory {
    routes: Arc<RwLock<AHashMap<RouteId, RouteLifecycle>>>,
    delisting_window_ns: u64,
}

impl ListingHistory {
    pub fn new() -> Self {
        Self::with_delisting_window(DEFAULT_DELISTING_DETECTION_WINDOW_NS)
    }

    pub fn with_delisting_window(delisting_window_ns: u64) -> Self {
        Self {
            routes: Arc::new(RwLock::new(AHashMap::with_capacity(4096))),
            delisting_window_ns,
        }
    }

    /// Registra que a rota foi observada no ciclo atual. Cria entrada
    /// se nova; atualiza `last_seen` caso contrário.
    pub fn record_seen(&self, route: RouteId, ts_ns: u64) {
        let mut guard = self.routes.write();
        guard
            .entry(route)
            .and_modify(|lc| lc.record_seen(ts_ns))
            .or_insert_with(|| RouteLifecycle::new(ts_ns));
    }

    /// Idade da rota em dias desde `first_seen`. `None` se rota
    /// desconhecida. Feature A2 (ADR-014 gap) — permite modelo distinguir
    /// listing novo de rota estabelecida.
    pub fn listing_age_days(&self, route: RouteId, now_ns: u64) -> Option<f32> {
        let guard = self.routes.read();
        let lc = guard.get(&route)?;
        let age_ns = now_ns.saturating_sub(lc.first_seen_ns);
        Some((age_ns as f64 / NS_PER_DAY) as f32)
    }

    /// Primeiro instante observado para a rota, `None` se desconhecida.
    pub fn first_seen(&self, route: RouteId) -> Option<u64> {
        let guard = self.routes.read();
        guard.get(&route).map(|lc| lc.first_seen_ns)
    }

    /// Último instante observado.
    pub fn last_seen(&self, route: RouteId) -> Option<u64> {
        let guard = self.routes.read();
        guard.get(&route).map(|lc| lc.last_seen_ns)
    }

    pub fn active_until(&self, route: RouteId) -> Option<u64> {
        let guard = self.routes.read();
        guard.get(&route).and_then(|lc| lc.active_until_ns)
    }

    /// Total de snapshots observados para a rota.
    pub fn n_snapshots(&self, route: RouteId) -> u64 {
        let guard = self.routes.read();
        guard.get(&route).map(|lc| lc.n_snapshots).unwrap_or(0)
    }

    /// Snapshot imutável de uma rota específica.
    pub fn snapshot_for(&self, route: RouteId) -> Option<RouteLifecycle> {
        let guard = self.routes.read();
        guard.get(&route).copied()
    }

    /// Marca explicitamente uma rota como delisted (ex: aviso manual
    /// do operador ou anúncio da venue). Idempotente.
    pub fn mark_delisted(&self, route: RouteId, ts_ns: u64) {
        let mut guard = self.routes.write();
        if let Some(lc) = guard.get_mut(&route) {
            lc.active_until_ns = Some(ts_ns);
        }
    }

    /// Percorre todas as rotas e marca como delisted aquelas não vistas
    /// há mais de `delisting_window_ns`. Chamar periodicamente (ex: 1
    /// vez a cada 5 min em task background).
    ///
    /// Retorna `(n_active, n_newly_delisted)` para métricas.
    pub fn sweep_inactive(&self, now_ns: u64) -> (usize, usize) {
        let cutoff = now_ns.saturating_sub(self.delisting_window_ns);
        let mut guard = self.routes.write();
        let mut newly = 0;
        let mut active = 0;
        for lc in guard.values_mut() {
            if lc.is_active() {
                if lc.last_seen_ns < cutoff {
                    lc.active_until_ns = Some(lc.last_seen_ns);
                    newly += 1;
                } else {
                    active += 1;
                }
            }
        }
        (active, newly)
    }

    /// Número de rotas ativas (não delisted).
    pub fn active_routes(&self) -> usize {
        let guard = self.routes.read();
        guard.values().filter(|lc| lc.is_active()).count()
    }

    /// Rotas ativas do mesmo símbolo canônico, ordenadas de forma estável
    /// por venue. Usado para materializar cluster estrutural PIT em labels
    /// sem depender de detector offline.
    pub fn active_routes_for_symbol(&self, symbol_id: SymbolId) -> Vec<RouteId> {
        let guard = self.routes.read();
        let mut routes: Vec<RouteId> = guard
            .iter()
            .filter_map(|(route, lc)| {
                (route.symbol_id == symbol_id && lc.is_active()).then_some(*route)
            })
            .collect();
        routes.sort_by_key(|route| (route.buy_venue.idx(), route.sell_venue.idx()));
        routes
    }

    /// Número de rotas delisted.
    pub fn delisted_routes(&self) -> usize {
        let guard = self.routes.read();
        guard.values().filter(|lc| !lc.is_active()).count()
    }

    /// Snapshot imutável do estado atual — usado pelo writer Parquet em C1.
    pub fn snapshot(&self) -> Vec<(RouteId, RouteLifecycle)> {
        let guard = self.routes.read();
        guard.iter().map(|(k, v)| (*k, *v)).collect()
    }
}

impl Default for ListingHistory {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for ListingHistory {
    fn clone(&self) -> Self {
        Self {
            routes: Arc::clone(&self.routes),
            delisting_window_ns: self.delisting_window_ns,
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

    fn mk_route(sym: u32) -> RouteId {
        RouteId {
            symbol_id: SymbolId(sym),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    #[test]
    fn unknown_route_returns_none() {
        let lh = ListingHistory::new();
        let r = mk_route(99);
        assert_eq!(lh.first_seen(r), None);
        assert_eq!(lh.listing_age_days(r, 1), None);
        assert_eq!(lh.n_snapshots(r), 0);
    }

    #[test]
    fn first_record_sets_first_seen() {
        let lh = ListingHistory::new();
        let r = mk_route(1);
        let t0 = 1_700_000_000_000_000_000;
        lh.record_seen(r, t0);
        assert_eq!(lh.first_seen(r), Some(t0));
        assert_eq!(lh.last_seen(r), Some(t0));
        assert_eq!(lh.n_snapshots(r), 1);
    }

    #[test]
    fn subsequent_records_update_last_seen_only() {
        let lh = ListingHistory::new();
        let r = mk_route(1);
        let t0 = 1_700_000_000_000_000_000;
        lh.record_seen(r, t0);
        lh.record_seen(r, t0 + 1_000_000_000);
        lh.record_seen(r, t0 + 5_000_000_000);
        assert_eq!(lh.first_seen(r), Some(t0)); // inalterado
        assert_eq!(lh.last_seen(r), Some(t0 + 5_000_000_000));
        assert_eq!(lh.n_snapshots(r), 3);
    }

    #[test]
    fn active_routes_for_symbol_returns_only_active_siblings() {
        let lh = ListingHistory::new();
        let r1 = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        let r2 = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::BinanceFut,
            sell_venue: Venue::MexcFut,
        };
        let other_symbol = mk_route(2);
        lh.record_seen(r1, 10);
        lh.record_seen(r2, 10);
        lh.record_seen(other_symbol, 10);
        lh.mark_delisted(r2, 20);

        assert_eq!(lh.active_routes_for_symbol(SymbolId(1)), vec![r1]);
    }

    #[test]
    fn listing_age_days_reflects_real_duration() {
        let lh = ListingHistory::new();
        let r = mk_route(1);
        let t0 = 1_700_000_000_000_000_000;
        lh.record_seen(r, t0);
        // 7 dias depois
        let now = t0 + 7 * 86_400 * 1_000_000_000;
        let age = lh.listing_age_days(r, now).unwrap();
        assert!((age - 7.0).abs() < 0.01, "age = {age}, expected ~7");
    }

    #[test]
    fn mark_delisted_deactivates_route() {
        let lh = ListingHistory::new();
        let r = mk_route(1);
        lh.record_seen(r, 1);
        assert_eq!(lh.active_routes(), 1);
        assert_eq!(lh.delisted_routes(), 0);
        lh.mark_delisted(r, 1000);
        assert_eq!(lh.active_routes(), 0);
        assert_eq!(lh.delisted_routes(), 1);
    }

    #[test]
    fn sweep_inactive_marks_stale_routes() {
        // Window 500 ns para test rápido.
        let lh = ListingHistory::with_delisting_window(500);
        let r1 = mk_route(1);
        let r2 = mk_route(2);
        lh.record_seen(r1, 100);
        lh.record_seen(r2, 900);
        // now = 1000; r1 last_seen=100 < 500 → delisted.
        let (active, newly) = lh.sweep_inactive(1000);
        assert_eq!(active, 1, "r2 ainda ativa");
        assert_eq!(newly, 1, "r1 recém-delisted");
        assert_eq!(lh.active_routes(), 1);
        assert_eq!(lh.delisted_routes(), 1);
    }

    #[test]
    fn relisting_after_delist_resurrects_route() {
        let lh = ListingHistory::new();
        let r = mk_route(1);
        lh.record_seen(r, 1);
        lh.mark_delisted(r, 100);
        assert_eq!(lh.delisted_routes(), 1);
        // Rota volta a aparecer.
        lh.record_seen(r, 200);
        assert_eq!(lh.active_routes(), 1);
        assert_eq!(lh.delisted_routes(), 0);
    }

    #[test]
    fn snapshot_returns_consistent_view() {
        let lh = ListingHistory::new();
        lh.record_seen(mk_route(1), 1);
        lh.record_seen(mk_route(2), 2);
        let snap = lh.snapshot();
        assert_eq!(snap.len(), 2);
    }

    #[test]
    fn clone_shares_state() {
        let lh = ListingHistory::new();
        let clone = lh.clone();
        lh.record_seen(mk_route(1), 1);
        assert_eq!(clone.n_snapshots(mk_route(1)), 1);
    }
}
