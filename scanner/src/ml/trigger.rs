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
//! - Contaminado por rotas sem volume 24h mínimo normalizado.
//!
//! O trigger filtra para manter apenas snapshots **operacionalmente
//! relevantes** — aqueles que passam critérios mínimos de qualidade e
//! estão na cauda superior da distribuição da rota.
//!
//! # Três gates (ordenados por custo ascendente)
//!
//! 1. **Min volume** (`min(vol24_usd) > 0 && ≥ $50k USD`) — rota sem
//!    notional normalizado mínimo não é candidata confiável.
//! 2. **Historical sufficiency** (`n_observations ≥ 500` por rota) —
//!    sem histórico, percentil p95 é mal estimado.
//! 3. **Tail quality** (`entry_spread ≥ P95(rota, 24h)`) — apenas cauda
//!    superior é oportunidade; resto é regime normal.
//!
//! Gates 3–4 dependem de `HotQueryCache` (ADR-012 Camada 1b).
//!
//! # Correção ADR-014 aplicada
//!
//! `book_age`, `halt_active` e `toxicity_level` são diagnósticos operacionais,
//! não features ou filtros do ML/dataset. O trigger conserva apenas filtros
//! diretamente ligados à oportunidade bruta: volume 24h mínimo, histórico e cauda.

use crate::ml::contract::RouteId;
use crate::ml::feature_store::HotQueryCache;

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/// Parâmetros do trigger. Defaults de `DECISIONS_APPROVED.md` Tema B.
///
#[derive(Debug, Clone, Copy)]
pub struct SamplingConfig {
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
    /// `min(buy_vol24, sell_vol24) <= 0` ou `< min_vol24_usd`.
    RejectLowVolume,
    /// `n_observations < n_min` — sem p95 confiável.
    RejectInsufficientHistory,
    /// `entry_spread < P95(rota, histórico)` — não é cauda superior.
    RejectBelowTail,
}

impl SampleDecision {
    /// Label curto para dashboards Prometheus.
    pub fn reason_label(self) -> &'static str {
        match self {
            Self::Accept => "accept",
            Self::RejectLowVolume => "low_volume",
            Self::RejectInsufficientHistory => "insufficient_history",
            Self::RejectBelowTail => "below_tail",
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

    /// Gate mínimo para alimentar o `HotQueryCache`.
    ///
    /// `book_age` e `halt` ficam fora do ML/dataset. Aqui filtramos apenas
    /// volume 24h mínimo em USD-equivalente para evitar snapshots sem
    /// notional normalizado no histórico usado para quantis de spread.
    #[inline]
    pub fn is_clean_data(&self, buy_vol24_usd: f64, sell_vol24_usd: f64) -> bool {
        if !buy_vol24_usd.is_finite() || !sell_vol24_usd.is_finite() {
            return false;
        }
        if buy_vol24_usd <= 0.0 || sell_vol24_usd <= 0.0 {
            return false;
        }
        if buy_vol24_usd < self.cfg.min_vol24_usd || sell_vol24_usd < self.cfg.min_vol24_usd {
            return false;
        }
        true
    }

    /// Aplica os gates e classifica o snapshot com `SampleDecision`.
    ///
    /// Ordem dos checks maximiza short-circuit: gates baratos (primitives)
    /// antes de lookups no cache.
    pub fn evaluate(
        &self,
        route: RouteId,
        entry_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        cache: &HotQueryCache,
    ) -> SampleDecision {
        // Gate 1 — volume 24h mínimo.
        if !self.is_clean_data(buy_vol24_usd, sell_vol24_usd) {
            return SampleDecision::RejectLowVolume;
        }

        // Candidato ativo de entrada precisa começar com spread favorável.
        // Observações background com entry <= 0 continuam úteis como
        // abstention/no-opportunity, mas não podem passar como Trade candidate.
        if !entry_spread.is_finite() || entry_spread <= 0.0 {
            return SampleDecision::RejectBelowTail;
        }

        // Gate 2 — histórico suficiente no cache.
        let n = cache.n_observations(route);
        if n < self.cfg.n_min {
            return SampleDecision::RejectInsufficientHistory;
        }

        // Gate 3 — cauda superior.
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
    fn is_clean_data_checks_only_volume_for_ml() {
        let trig = SamplingTrigger::with_defaults();
        assert!(trig.is_clean_data(1e6, 1e6));
        assert!(!trig.is_clean_data(10_000.0, 1e6));
        assert!(!trig.is_clean_data(0.0, 1e6));
        assert!(!trig.is_clean_data(f64::NAN, 1e6));
    }

    #[test]
    fn reject_low_volume() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        // 10k < 50k threshold.
        let d = trig.evaluate(route, 2.9, 10_000.0, 1e6, &cache);
        assert_eq!(d, SampleDecision::RejectLowVolume);
    }

    #[test]
    fn reject_insufficient_history() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        populate(&cache, route, 100); // < n_min=500
        let d = trig.evaluate(route, 2.9, 1e6, 1e6, &cache);
        assert_eq!(d, SampleDecision::RejectInsufficientHistory);
    }

    #[test]
    fn reject_below_tail() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        populate(&cache, route, 1000);
        // p95 ≈ 2.9; current 1.5 bem abaixo.
        let d = trig.evaluate(route, 1.5, 1e6, 1e6, &cache);
        assert_eq!(d, SampleDecision::RejectBelowTail);
    }

    #[test]
    fn reject_non_positive_entry_as_active_candidate() {
        let cache = mk_cache();
        let trig = SamplingTrigger::new(SamplingConfig {
            n_min: 10,
            ..SamplingConfig::default()
        });
        let route = mk_route();
        populate(&cache, route, 100);

        let d = trig.evaluate(route, -0.1, 1e6, 1e6, &cache);
        assert_eq!(d, SampleDecision::RejectBelowTail);

        let d = trig.evaluate(route, f32::NAN, 1e6, 1e6, &cache);
        assert_eq!(d, SampleDecision::RejectBelowTail);
    }

    #[test]
    fn accept_when_all_gates_pass() {
        let cache = mk_cache();
        let trig = SamplingTrigger::with_defaults();
        let route = mk_route();
        populate(&cache, route, 1000);
        // 3.0 > p95≈2.9 e volume 1M — aceito.
        let d = trig.evaluate(route, 3.0, 1e6, 1e6, &cache);
        assert_eq!(d, SampleDecision::Accept);
    }

    #[test]
    fn reason_labels_stable() {
        // Labels são contratos com Prometheus — não devem mudar sem warning.
        assert_eq!(SampleDecision::Accept.reason_label(), "accept");
        assert_eq!(SampleDecision::RejectLowVolume.reason_label(), "low_volume");
        assert_eq!(
            SampleDecision::RejectInsufficientHistory.reason_label(),
            "insufficient_history"
        );
        assert_eq!(SampleDecision::RejectBelowTail.reason_label(), "below_tail");
    }
}
