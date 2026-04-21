//! Trigger de amostragem para o dataset de treinamento.
//!
//! Implementa ADR-009 + ADR-014: decide **quais snapshots do scanner
//! entram** no dataset que será usado para treinar o modelo A2 e
//! rotular via triple-barrier.
//!
//! # Por que gate de amostragem é importante
//!
//! O scanner emite ~17k updates/s × 86400s = **1.35×10⁹ snapshots/dia
//! brutos**. Treinar em dados brutos é:
//! - Caro (dataset gigante).
//! - Ruidoso (maioria é "não-oportunidade" trivial; modelo aprende o óbvio).
//! - Contaminado por qualidade de dado ruim (stale, rota ilíquida).
//!
//! O trigger filtra para manter apenas snapshots **operacionalmente
//! relevantes** — aqueles que passam critérios mínimos de qualidade e
//! estão na cauda superior da distribuição da rota.
//!
//! # Quatro gates (ordenados por custo ascendente)
//!
//! 1. **Book freshness** (`buy_book_age < 200ms` AND `sell_book_age < 200ms`)
//!    — book velho = staleness, rota possivelmente em halt.
//! 2. **Min volume** (`min(vol24) ≥ $50k USD`) — rota ilíquida não é
//!    operacionalmente interessante (T11 execution feasibility).
//! 3. **Historical sufficiency** (`n_observations ≥ 500` por rota) —
//!    sem histórico, percentil p95 é mal estimado.
//! 4. **Tail quality** (`entry_spread ≥ P95(rota, 24h)`) — apenas cauda
//!    superior é oportunidade; resto é regime normal.
//!
//! Gates 3–4 dependem de `HotQueryCache` (ADR-012 Camada 1b).
//!
//! # Correção ADR-014 aplicada
//!
//! `book_age`, `vol24` e `halt_active` vivem aqui como **filtros de
//! trigger**, não como features do modelo. A amostra só entra no dataset
//! após passar os gates; modelo A2 não precisa aprender "rota ilíquida
//! = ignorar" (é decidido antes).

use crate::ml::contract::RouteId;
use crate::ml::feature_store::HotQueryCache;
use crate::types::Venue;

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/// Parâmetros do trigger. Defaults de `DECISIONS_APPROVED.md` Tema B.
///
/// A partir de Fase 0 (Ação C3), `max_book_age_ms` funciona como **teto
/// global opcional** aplicado sobre o threshold per-venue de
/// [`Venue::max_book_age_ms`]. Uso típico: default `u32::MAX` (sem override),
/// deixando venue decidir; operador pode apertar via CLI.
#[derive(Debug, Clone, Copy)]
pub struct SamplingConfig {
    /// Teto global para book age (ms). Default `u32::MAX` = desabilitado
    /// (usa apenas per-venue). Se ajustado via CLI, aplicado como `min`
    /// com o threshold per-venue.
    pub max_book_age_ms: u32,
    /// Volume 24h mínimo USD por perna (default 50_000).
    pub min_vol24_usd: f64,
    /// Quantil histórico que o spread atual deve superar (default 0.95).
    pub tail_quantile: f64,
    /// Observações mínimas antes de lookup de percentil válido (default 500).
    pub n_min: u64,
}

impl Default for SamplingConfig {
    fn default() -> Self {
        Self {
            max_book_age_ms: u32::MAX, // desabilitado — use per-venue
            min_vol24_usd: 50_000.0,
            tail_quantile: 0.95,
            n_min: 500,
        }
    }
}

// ---------------------------------------------------------------------------
// Decisão
// ---------------------------------------------------------------------------

/// Resultado do gate de amostragem para um snapshot.
///
/// `Accept` é a única decisão que gera entrada no dataset. Os demais são
/// razões categorizadas de rejeição, usadas em métricas Prometheus
/// (`ml_trigger_rejected_total{reason="..."}`) para monitorar qualidade
/// da coleta de dados.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SampleDecision {
    /// Snapshot passou todos os gates — entra no dataset.
    Accept,
    /// `buy_book_age` ou `sell_book_age` excedeu `max_book_age_ms`.
    RejectStale,
    /// `min(buy_vol24, sell_vol24) < min_vol24_usd`.
    RejectLowVolume,
    /// `n_observations < n_min` — sem p95 confiável.
    RejectInsufficientHistory,
    /// `entry_spread < P95(rota, histórico)` — não é cauda superior.
    RejectBelowTail,
    /// Halt explícito sinalizado pelo scanner (flag externo).
    RejectHalt,
}

impl SampleDecision {
    /// Label curto para dashboards Prometheus.
    pub fn reason_label(self) -> &'static str {
        match self {
            Self::Accept => "accept",
            Self::RejectStale => "stale",
            Self::RejectLowVolume => "low_volume",
            Self::RejectInsufficientHistory => "insufficient_history",
            Self::RejectBelowTail => "below_tail",
            Self::RejectHalt => "halt",
        }
    }

    #[inline]
    pub fn is_accept(self) -> bool {
        matches!(self, Self::Accept)
    }
}

// ---------------------------------------------------------------------------
// SamplingTrigger
// ---------------------------------------------------------------------------

/// Trigger stateless de amostragem. Thread-safe (Copy); instância compartilhada
/// entre threads sem lock.
#[derive(Debug, Clone, Copy)]
pub struct SamplingTrigger {
    cfg: SamplingConfig,
}

impl SamplingTrigger {
    pub fn new(cfg: SamplingConfig) -> Self {
        Self { cfg }
    }

    pub fn with_defaults() -> Self {
        Self::new(SamplingConfig::default())
    }

    pub fn config(&self) -> SamplingConfig {
        self.cfg
    }

    /// Gate de **qualidade do dado bruto** — halt + book freshness + volume.
    ///
    /// Retorna `true` se o snapshot é limpo o suficiente para **alimentar o
    /// HotQueryCache** (entra no histograma usado para calcular P95).
    ///
    /// Importante (C2 fix — ordem): este gate deve ser chamado **antes**
    /// de `cache.observe(...)`, caso contrário snapshots stale/low-vol
    /// contaminam o P95 que o próprio trigger consulta depois (dependência
    /// circular). Fase 0 corrige a ordem em `MlServer::on_opportunity`.
    ///
    /// Per-venue book-age thresholds (C3 fix): usa
    /// [`Venue::max_book_age_ms`] em vez de threshold universal 200ms,
    /// capado opcionalmente por `cfg.max_book_age_ms`.
    #[inline]
    pub fn is_clean_data(
        &self,
        buy_venue: Venue,
        sell_venue: Venue,
        buy_book_age_ms: u32,
        sell_book_age_ms: u32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        halt_active: bool,
    ) -> bool {
        if halt_active {
            return false;
        }
        let buy_limit = buy_venue.max_book_age_ms().min(self.cfg.max_book_age_ms);
        let sell_limit = sell_venue.max_book_age_ms().min(self.cfg.max_book_age_ms);
        if buy_book_age_ms > buy_limit || sell_book_age_ms > sell_limit {
            return false;
        }
        if buy_vol24_usd < self.cfg.min_vol24_usd
            || sell_vol24_usd < self.cfg.min_vol24_usd
        {
            return false;
        }
        true
    }

    /// Aplica os 4 gates e classifica o snapshot com `SampleDecision`.
    ///
    /// `halt_active` é flag explícito (venue em halt sinalizado fora do
    /// scanner — futuro hook de monitoramento operacional; MVP passa
    /// `false`).
    ///
    /// Ordem dos checks maximiza short-circuit: gates baratos (primitives)
    /// antes de lookups no cache.
    pub fn evaluate(
        &self,
        route: RouteId,
        entry_spread: f32,
        buy_book_age_ms: u32,
        sell_book_age_ms: u32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        halt_active: bool,
        cache: &HotQueryCache,
    ) -> SampleDecision {
        // Gate 0 — halt explícito (mais barato: flag booleana).
        if halt_active {
            return SampleDecision::RejectHalt;
        }

        // Gate 1 — book freshness per-venue (C3 fix).
        let buy_limit = route.buy_venue.max_book_age_ms().min(self.cfg.max_book_age_ms);
        let sell_limit = route.sell_venue.max_book_age_ms().min(self.cfg.max_book_age_ms);
        if buy_book_age_ms > buy_limit || sell_book_age_ms > sell_limit {
            return SampleDecision::RejectStale;
        }

        // Gate 2 — volume mínimo (evita rotas ilíquidas cedo).
        if buy_vol24_usd < self.cfg.min_vol24_usd
            || sell_vol24_usd < self.cfg.min_vol24_usd
        {
            return SampleDecision::RejectLowVolume;
        }

        // Gate 3 — histórico suficiente no cache.
        let n = cache.n_observations(route);
        if n < self.cfg.n_min {
            return SampleDecision::RejectInsufficientHistory;
        }

        // Gate 4 — cauda superior.
        let p_tail = match cache.quantile_entry(route, self.cfg.tail_quantile) {
            Some(v) => v,
            None => return SampleDecision::RejectInsufficientHistory,
        };
        if entry_spread < p_tail {
            return SampleDecision::RejectBelowTail;
        }

        SampleDecision::Accept
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_cache() -> HotQueryCache {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        HotQueryCache::with_config(CacheConfig::for_testing())
    }

    fn populate(cache: &HotQueryCache, route: RouteId, n: u64) {
        // Distribuição: entry ∈ [1%, 3%] uniforme; p95 ≈ 2.9%.
        for i in 0..n {
            let t = (i % 100) as f32 / 100.0;
            cache.observe(route, 1.0 + t * 2.0, -1.0, i);
        }
    }

    #[test]
    fn reject_halt_first() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        // Tudo OK exceto halt — ainda rejeita.
        populate(&cache, route, 1000);
        let d = trig.evaluate(route, 2.9, 50, 50, 1e6, 1e6, true, &cache);
        assert_eq!(d, SampleDecision::RejectHalt);
    }

    #[test]
    fn reject_stale_on_buy_leg() {
        // MexcFut limit = 500ms; 800 > 500 = stale
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        let d = trig.evaluate(route, 2.9, 800, 50, 1e6, 1e6, false, &cache);
        assert_eq!(d, SampleDecision::RejectStale);
    }

    #[test]
    fn reject_stale_on_sell_leg() {
        // BingxFut limit = 2000ms; 2500 > 2000 = stale
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        let d = trig.evaluate(route, 2.9, 50, 2500, 1e6, 1e6, false, &cache);
        assert_eq!(d, SampleDecision::RejectStale);
    }

    #[test]
    fn is_clean_data_composites_all_gates() {
        let trig = SamplingTrigger::with_defaults();
        // Tudo OK — aceito.
        assert!(trig.is_clean_data(
            Venue::MexcFut, Venue::BingxFut, 50, 50, 1e6, 1e6, false
        ));
        // Halt — não limpo.
        assert!(!trig.is_clean_data(
            Venue::MexcFut, Venue::BingxFut, 50, 50, 1e6, 1e6, true
        ));
        // Book age MEXC 600 > 500 limit — não limpo.
        assert!(!trig.is_clean_data(
            Venue::MexcFut, Venue::BingxFut, 600, 50, 1e6, 1e6, false
        ));
        // Book age BingX 1500 < 2000 limit — ok.
        assert!(trig.is_clean_data(
            Venue::MexcFut, Venue::BingxFut, 50, 1500, 1e6, 1e6, false
        ));
        // Low volume — não limpo.
        assert!(!trig.is_clean_data(
            Venue::MexcFut, Venue::BingxFut, 50, 50, 10_000.0, 1e6, false
        ));
    }

    #[test]
    fn per_venue_book_age_distinct() {
        // Venues diferentes têm limites distintos.
        assert_eq!(Venue::BinanceSpot.max_book_age_ms(), 100);
        assert_eq!(Venue::MexcFut.max_book_age_ms(), 500);
        assert_eq!(Venue::BingxFut.max_book_age_ms(), 2000);
        assert_eq!(Venue::GateSpot.max_book_age_ms(), 1000);
    }

    #[test]
    fn reject_low_volume() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        // 10k < 50k threshold.
        let d = trig.evaluate(route, 2.9, 50, 50, 10_000.0, 1e6, false, &cache);
        assert_eq!(d, SampleDecision::RejectLowVolume);
    }

    #[test]
    fn reject_insufficient_history() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        populate(&cache, route, 100); // < n_min=500
        let d = trig.evaluate(route, 2.9, 50, 50, 1e6, 1e6, false, &cache);
        assert_eq!(d, SampleDecision::RejectInsufficientHistory);
    }

    #[test]
    fn reject_below_tail() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        populate(&cache, route, 1000);
        // p95 ≈ 2.9; current 1.5 bem abaixo.
        let d = trig.evaluate(route, 1.5, 50, 50, 1e6, 1e6, false, &cache);
        assert_eq!(d, SampleDecision::RejectBelowTail);
    }

    #[test]
    fn accept_when_all_gates_pass() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        populate(&cache, route, 1000);
        // 3.0 > p95≈2.9, volume 1M, book fresh — aceito.
        let d = trig.evaluate(route, 3.0, 50, 50, 1e6, 1e6, false, &cache);
        assert_eq!(d, SampleDecision::Accept);
    }

    #[test]
    fn reason_labels_stable() {
        // Labels são contratos com Prometheus — não devem mudar sem warning.
        assert_eq!(SampleDecision::Accept.reason_label(), "accept");
        assert_eq!(SampleDecision::RejectStale.reason_label(), "stale");
        assert_eq!(SampleDecision::RejectLowVolume.reason_label(), "low_volume");
        assert_eq!(
            SampleDecision::RejectInsufficientHistory.reason_label(),
            "insufficient_history"
        );
        assert_eq!(SampleDecision::RejectBelowTail.reason_label(), "below_tail");
        assert_eq!(SampleDecision::RejectHalt.reason_label(), "halt");
    }
}
