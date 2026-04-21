//! Schema de persistência — `RawSample` (ADR-025).
//!
//! Stream contínuo, **pré-trigger**, decimado 1-in-10 por rota. Paralelo
//! ao [`AcceptedSample`](super::sample::AcceptedSample) (que é pós-trigger).
//!
//! # Por que dois streams
//!
//! `AcceptedSample` serve ao **treino supervisionado**: já filtrado, fácil
//! de consumir. Mas filtrar antes de medir viola o princípio de análise
//! empírica — gates E1/E2/E4/E6/E8/E10/E11 (ADR-018) e ADRs 019/020/023
//! exigem a distribuição **pré-filtro** para evitar viés de seleção:
//!
//! - Hill tail (E1): remover `book_age > limite` decepa a cauda.
//! - Persistência D_{x=2%} (E4): precisa todos os cruzamentos em 2%.
//! - LOVO per-venue (E11): filtro de staleness remove venues lentas
//!   desigualmente → venue aparece "generalizável" sem ter sido vista.
//! - Simulação pnl_bruto (ADR-019): precisa `exit_spread(t₁)` para todo
//!   par `(rota, t₀)` candidato.
//!
//! # Decimação determinística por rota
//!
//! `hash(route) mod 10 == 0` → persiste **toda observação** daquela rota.
//! Demais rotas são descartadas. Preserva correlação serial intra-rota
//! (crítico para Hurst E2 e correlação E8 `corr(entry, exit) ≈ −0.93`).
//!
//! ~260 de 2600 rotas capturadas; compensa via bootstrap estratificado
//! em gates agregados e cobertura identical per-rota em gates per-rota.

use std::collections::HashSet;
use std::sync::Arc;

use arc_swap::ArcSwap;

use crate::ml::contract::RouteId;
use crate::ml::persistence::sample_id::sample_id_of;
use crate::ml::trigger::SampleDecision;

/// Versão atual do schema do `RawSample`. Bump quando adicionar/remover
/// campos. `AcceptedSample` tem versão independente — decisões de schema
/// dos dois streams são desacopladas.
///
/// # Histórico
/// - **v1** (ADR-025): schema inicial com `symbol_id` numérico.
/// - **v2** (ADR-029, 2026-04-21): adiciona `symbol_name` canonical (BASE-QUOTE)
///   e `scanner_version`. Motivação: `SymbolId` não é estável entre runs;
///   sem nome canonical, join retrospectivo cross-dia quebra.
/// - **v3** (Wave V dataset PhD, 2026-04-21): adiciona `sample_id`,
///   `sampling_tier`, `sampling_probability`. Decimator agora em 3 tiers
///   (allowlist + priority + uniforme); auditoria de amostragem.
pub const RAW_SAMPLE_SCHEMA_VERSION: u16 = 3;

/// Versão do scanner — mesmo que em `sample.rs`.
pub const SCANNER_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Fator de decimação por rota. 1-in-10 conforme ADR-025.
pub const ROUTE_DECIMATION_MOD: u64 = 10;

/// Amostra bruta do scanner, **pré-trigger**. Emitida por toda chamada
/// `MlServer::on_opportunity` para rotas selecionadas pela decimação.
///
/// # Diferenças vs [`AcceptedSample`](super::sample::AcceptedSample)
///
/// | Campo | RawSample | AcceptedSample |
/// |---|---|---|
/// | Quando emite | toda obs (se rota selecionada) | só `SampleDecision::Accept` |
/// | `halt_active` | ✅ campo explícito | implícito em `sample_decision` |
/// | `was_recommended` | ❌ ausente | ✅ presente |
/// | `sample_decision` | ✅ veredito congelado | ✅ sempre `Accept` |
///
/// # Contrato PIT
///
/// `sample_decision` carrega o veredito calculado **no momento da
/// observação** — se o trigger mudar em Marco 1+, amostras antigas
/// preservam a regra antiga. Identificável via `schema_version`.
#[derive(Debug, Clone)]
pub struct RawSample {
    pub ts_ns: u64,
    pub cycle_seq: u32,
    pub schema_version: u16,
    pub route_id: RouteId,
    /// **v2 (ADR-029)** — nome canonical estável entre runs (ex: "BTC-USDT").
    pub symbol_name: String,
    /// **v2 (ADR-029)** — scanner que gerou.
    pub scanner_version: &'static str,
    /// **v3** — hash determinístico cross-schema (join com AcceptedSample/LabeledTrade).
    pub sample_id: String,
    pub entry_spread: f32,
    pub exit_spread: f32,
    pub buy_book_age_ms: u32,
    pub sell_book_age_ms: u32,
    pub buy_vol24: f64,
    pub sell_vol24: f64,
    pub halt_active: bool,
    pub sample_decision: SampleDecision,
    /// **v3** — tier que aprovou persistência. "allowlist" | "priority"
    /// | "decimated_uniform".
    pub sampling_tier: &'static str,
    /// **v3** — probabilidade de amostragem efetiva (auditoria para treino).
    /// `allowlist`/`priority` = 1.0; `decimated_uniform` = 1/modulus.
    pub sampling_probability: f32,
}

impl RawSample {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        ts_ns: u64,
        cycle_seq: u32,
        route_id: RouteId,
        symbol_name: impl Into<String>,
        entry_spread: f32,
        exit_spread: f32,
        buy_book_age_ms: u32,
        sell_book_age_ms: u32,
        buy_vol24: f64,
        sell_vol24: f64,
        halt_active: bool,
        sample_decision: SampleDecision,
    ) -> Self {
        // Default tier "decimated_uniform" + probabilidade 1.0 (a API legada
        // não sabe tier). Caminhos novos devem usar [`RawSample::with_tier`].
        Self::with_tier(
            ts_ns, cycle_seq, route_id, symbol_name,
            entry_spread, exit_spread, buy_book_age_ms, sell_book_age_ms,
            buy_vol24, sell_vol24, halt_active, sample_decision,
            SamplingTier::DecimatedUniform, 1.0,
        )
    }

    /// Construtor novo (Wave V) com tier e probabilidade explícitos.
    #[allow(clippy::too_many_arguments)]
    pub fn with_tier(
        ts_ns: u64,
        cycle_seq: u32,
        route_id: RouteId,
        symbol_name: impl Into<String>,
        entry_spread: f32,
        exit_spread: f32,
        buy_book_age_ms: u32,
        sell_book_age_ms: u32,
        buy_vol24: f64,
        sell_vol24: f64,
        halt_active: bool,
        sample_decision: SampleDecision,
        sampling_tier: SamplingTier,
        sampling_probability: f32,
    ) -> Self {
        let symbol_name = symbol_name.into();
        let sample_id = sample_id_of(
            ts_ns, cycle_seq, &symbol_name,
            route_id.buy_venue, route_id.sell_venue,
        );
        Self {
            ts_ns,
            cycle_seq,
            schema_version: RAW_SAMPLE_SCHEMA_VERSION,
            route_id,
            symbol_name,
            scanner_version: SCANNER_VERSION,
            sample_id,
            entry_spread,
            exit_spread,
            buy_book_age_ms,
            sell_book_age_ms,
            buy_vol24,
            sell_vol24,
            halt_active,
            sample_decision,
            sampling_tier: sampling_tier.as_str(),
            sampling_probability,
        }
    }

    /// Serializa para uma linha JSON (sem newline).
    pub fn to_json_line(&self) -> String {
        format!(
            concat!(
                r#"{{"ts_ns":{},"cycle_seq":{},"schema_version":{},"#,
                r#""scanner_version":"{}","sample_id":"{}","#,
                r#""symbol_id":{},"symbol_name":"{}","#,
                r#""buy_venue":"{}","sell_venue":"{}","#,
                r#""buy_market":"{}","sell_market":"{}","#,
                r#""entry_spread":{},"exit_spread":{},"#,
                r#""buy_book_age_ms":{},"sell_book_age_ms":{},"#,
                r#""buy_vol24":{},"sell_vol24":{},"#,
                r#""halt_active":{},"sample_decision":"{}","#,
                r#""sampling_tier":"{}","sampling_probability":{}}}"#,
            ),
            self.ts_ns,
            self.cycle_seq,
            self.schema_version,
            self.scanner_version,
            self.sample_id,
            self.route_id.symbol_id.0,
            escape_json_string(&self.symbol_name),
            self.route_id.buy_venue.as_str(),
            self.route_id.sell_venue.as_str(),
            self.route_id.buy_venue.market().as_str(),
            self.route_id.sell_venue.market().as_str(),
            format_f32(self.entry_spread),
            format_f32(self.exit_spread),
            self.buy_book_age_ms,
            self.sell_book_age_ms,
            format_f64(self.buy_vol24),
            format_f64(self.sell_vol24),
            self.halt_active,
            self.sample_decision.reason_label(),
            self.sampling_tier,
            format_f32(self.sampling_probability),
        )
    }
}

#[inline]
fn escape_json_string(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

// ---------------------------------------------------------------------------
// SamplingTier — 3 tiers de amostragem (Wave V)
// ---------------------------------------------------------------------------

/// Tier que aprovou persistência de uma rota no RawSample dataset.
///
/// Ordem de precedência: `Allowlist > Priority > DecimatedUniform`.
/// Se a rota está na allowlist fixa, entra sempre; senão, se está no
/// priority_set dinâmico (top-N por score), entra sempre; senão, entra
/// somente se passa no filtro `hash(route) mod modulus == 0`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SamplingTier {
    /// Rota listada em config `raw_allowlist_symbols` — persiste SEMPRE.
    Allowlist,
    /// Rota no top-N dinâmico por score (accept_count_24h).
    Priority,
    /// Residual: decimada por hash (probabilidade `1/modulus`).
    DecimatedUniform,
}

impl SamplingTier {
    pub fn as_str(self) -> &'static str {
        match self {
            SamplingTier::Allowlist => "allowlist",
            SamplingTier::Priority => "priority",
            SamplingTier::DecimatedUniform => "decimated_uniform",
        }
    }
}

/// Resultado da decisão do decimator.
#[derive(Debug, Clone, Copy)]
pub struct DecisionResult {
    pub should_persist: bool,
    pub tier: SamplingTier,
    /// Probabilidade efetiva: 1.0 para allowlist/priority; `1/modulus` se
    /// decimated uniform entrou; 0.0 se decimated uniform descartou.
    pub probability: f32,
}

/// Decimator por rota com 3 tiers (Wave V, correção PhD B1+A6).
///
/// Mantém internamente:
/// - `allowlist`: HashSet de rotas fixas via config (todas as rotas
///   engine-elegíveis de um conjunto de `symbol_name`). Pode ser trocada
///   atomicamente via `set_allowlist`.
/// - `priority_set`: HashSet dinâmico atualizado a cada 1h pelo
///   `RouteRanking` via `set_priority_set`. Compartilhado Arc<ArcSwap>.
/// - `hasher + modulus`: mesma semântica anterior para o tier residual.
#[derive(Clone)]
pub struct RouteDecimator {
    hasher: ahash::RandomState,
    modulus: u64,
    allowlist: Arc<ArcSwap<HashSet<RouteId>>>,
    priority_set: Arc<ArcSwap<HashSet<RouteId>>>,
}

impl std::fmt::Debug for RouteDecimator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RouteDecimator")
            .field("modulus", &self.modulus)
            .field("allowlist_len", &self.allowlist.load().len())
            .field("priority_set_len", &self.priority_set.load().len())
            .finish()
    }
}

impl RouteDecimator {
    /// Novo decimator com modulus default e conjuntos vazios.
    pub fn new() -> Self {
        Self::with_modulus(ROUTE_DECIMATION_MOD)
    }

    /// Novo decimator com modulus custom, allowlist e priority_set vazios.
    pub fn with_modulus(modulus: u64) -> Self {
        assert!(modulus >= 1, "modulus deve ser ≥ 1");
        let hasher = ahash::RandomState::with_seeds(
            0x5A5A_5A5A_5A5A_5A5A,
            0xC3C3_C3C3_C3C3_C3C3,
            0x1234_5678_9ABC_DEF0,
            0xFEDC_BA98_7654_3210,
        );
        Self {
            hasher,
            modulus,
            allowlist: Arc::new(ArcSwap::from_pointee(HashSet::new())),
            priority_set: Arc::new(ArcSwap::from_pointee(HashSet::new())),
        }
    }

    /// Substitui a allowlist por snapshot atômico (chamado no startup
    /// após resolver `raw_allowlist_symbols` via `SymbolUniverse`).
    pub fn set_allowlist(&self, routes: HashSet<RouteId>) {
        self.allowlist.store(Arc::new(routes));
    }

    /// Substitui o priority_set dinâmico (chamado pelo `RouteRanking`
    /// a cada 1h).
    pub fn set_priority_set(&self, routes: HashSet<RouteId>) {
        self.priority_set.store(Arc::new(routes));
    }

    /// Decisão completa — retorna tier + probabilidade.
    #[inline]
    pub fn decide(&self, route: RouteId) -> DecisionResult {
        if self.allowlist.load().contains(&route) {
            return DecisionResult {
                should_persist: true,
                tier: SamplingTier::Allowlist,
                probability: 1.0,
            };
        }
        if self.priority_set.load().contains(&route) {
            return DecisionResult {
                should_persist: true,
                tier: SamplingTier::Priority,
                probability: 1.0,
            };
        }
        // Residual: hash uniforme.
        use std::hash::{BuildHasher, Hash, Hasher};
        let mut h = self.hasher.build_hasher();
        route.hash(&mut h);
        let v = h.finish();
        let should = (v % self.modulus) == 0;
        DecisionResult {
            should_persist: should,
            tier: SamplingTier::DecimatedUniform,
            probability: 1.0 / (self.modulus as f32),
        }
    }

    /// Legacy shim — mantém API antiga. Retorna apenas `should_persist`.
    #[inline]
    pub fn should_persist(&self, route: RouteId) -> bool {
        self.decide(route).should_persist
    }

    pub fn modulus(&self) -> u64 {
        self.modulus
    }

    pub fn allowlist_snapshot(&self) -> Arc<HashSet<RouteId>> {
        self.allowlist.load_full()
    }

    pub fn priority_snapshot(&self) -> Arc<HashSet<RouteId>> {
        self.priority_set.load_full()
    }
}

impl Default for RouteDecimator {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Helpers (duplicated from sample.rs — intentionally kept local to avoid
// coupling the two schemas through a shared util module).
// ---------------------------------------------------------------------------

#[inline]
fn format_f32(v: f32) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
    }
}

#[inline]
fn format_f64(v: f64) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SymbolId, Venue};

    fn mk_route(symbol_id: u32, buy: Venue, sell: Venue) -> RouteId {
        RouteId {
            symbol_id: SymbolId(symbol_id),
            buy_venue: buy,
            sell_venue: sell,
        }
    }

    #[test]
    fn schema_version_present_and_stable() {
        let s = RawSample::new(
            1_700_000_000_000_000_000,
            17,
            mk_route(42, Venue::MexcFut, Venue::BingxFut),
            "BTC-USDT",
            2.5,
            -0.8,
            50,
            80,
            1e6,
            2e6,
            false,
            SampleDecision::Accept,
        );
        assert_eq!(s.schema_version, RAW_SAMPLE_SCHEMA_VERSION);
        assert_eq!(RAW_SAMPLE_SCHEMA_VERSION, 3);
        assert_eq!(s.symbol_name, "BTC-USDT");
        assert!(!s.scanner_version.is_empty());
        assert_eq!(s.sample_id.len(), 16);
    }

    #[test]
    fn json_line_is_single_line_valid_json_with_halt() {
        let s = RawSample::new(
            1_700_000_000_000_000_000,
            17,
            mk_route(42, Venue::MexcFut, Venue::BingxFut),
            "BTC-USDT",
            2.5,
            -0.8,
            50,
            80,
            1e6,
            2e6,
            true, // halt_active
            SampleDecision::RejectHalt,
        );
        let line = s.to_json_line();
        assert!(!line.contains('\n'));
        let v: serde_json::Value = serde_json::from_str(&line).expect("valid json");
        assert_eq!(v["symbol_id"], 42);
        assert_eq!(v["symbol_name"], "BTC-USDT");
        assert_eq!(v["buy_venue"], "mexc");
        assert_eq!(v["sell_venue"], "bingx");
        assert_eq!(v["halt_active"], true);
        assert_eq!(v["sample_decision"], "halt");
        assert_eq!(v["schema_version"], 3);
        assert!(v["scanner_version"].is_string());
        assert_eq!(v["sample_id"].as_str().unwrap().len(), 16);
        assert_eq!(v["sampling_tier"], "decimated_uniform");
        assert!(v["sampling_probability"].as_f64().is_some());
    }

    #[test]
    fn non_finite_floats_serialize_as_null() {
        let s = RawSample::new(
            1, 0,
            mk_route(7, Venue::MexcFut, Venue::BingxFut),
            "ETH-USDT",
            f32::NAN, f32::INFINITY, 50, 50,
            f64::NEG_INFINITY, 1e6,
            false,
            SampleDecision::RejectStale,
        );
        let line = s.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert!(v["entry_spread"].is_null());
        assert!(v["exit_spread"].is_null());
        assert!(v["buy_vol24"].is_null());
    }

    #[test]
    fn decimator_is_deterministic_across_instances() {
        let r = mk_route(999, Venue::BinanceFut, Venue::KucoinFut);
        let d1 = RouteDecimator::new();
        let d2 = RouteDecimator::new();
        // Dois decimators com mesmas seeds fixas → mesma decisão.
        assert_eq!(d1.should_persist(r), d2.should_persist(r));
    }

    #[test]
    fn decimator_modulus_1_accepts_everything() {
        let d = RouteDecimator::with_modulus(1);
        let routes = [
            mk_route(1, Venue::MexcFut, Venue::BingxFut),
            mk_route(2, Venue::KucoinFut, Venue::GateFut),
            mk_route(3, Venue::BitgetFut, Venue::XtFut),
        ];
        for r in routes {
            assert!(d.should_persist(r), "modulus=1 deve aceitar {:?}", r);
        }
    }

    #[test]
    fn decimator_approx_10_percent_acceptance_over_many_routes() {
        let d = RouteDecimator::with_modulus(10);
        // 2000 rotas sintéticas variando symbol_id e par venues.
        let venues = [
            Venue::BinanceSpot, Venue::BinanceFut,
            Venue::MexcSpot,    Venue::MexcFut,
            Venue::KucoinSpot,  Venue::KucoinFut,
            Venue::BitgetSpot,  Venue::BitgetFut,
            Venue::GateSpot,    Venue::GateFut,
            Venue::BingxSpot,   Venue::BingxFut,
            Venue::XtSpot,      Venue::XtFut,
        ];
        let mut total = 0;
        let mut accepted = 0;
        for symbol in 0..2000u32 {
            for (i, b) in venues.iter().enumerate() {
                for s in venues.iter().skip(i + 1) {
                    let r = mk_route(symbol, *b, *s);
                    total += 1;
                    if d.should_persist(r) {
                        accepted += 1;
                    }
                }
            }
        }
        // 10% ± 2% com este N.
        let ratio = accepted as f64 / total as f64;
        assert!(
            (0.08..0.12).contains(&ratio),
            "razão {} fora de [0.08, 0.12] (accepted={} total={})",
            ratio,
            accepted,
            total,
        );
    }

    #[test]
    fn decimator_distribution_uniform_per_venue_chi_square_like() {
        // Gate de aceitação ADR-025 #1: hash uniforme sobre rotas.
        // Verifica que a taxa de aceitação por venue não diverge > 5pp
        // da média global — proxy simples para uniformidade sem importar
        // crate de teste χ².
        let d = RouteDecimator::with_modulus(10);
        let venues = [
            Venue::BinanceSpot, Venue::BinanceFut,
            Venue::MexcSpot,    Venue::MexcFut,
            Venue::KucoinSpot,  Venue::KucoinFut,
            Venue::BitgetSpot,  Venue::BitgetFut,
            Venue::GateSpot,    Venue::GateFut,
            Venue::BingxSpot,   Venue::BingxFut,
            Venue::XtSpot,      Venue::XtFut,
        ];
        let mut per_venue_total = std::collections::HashMap::<Venue, u32>::new();
        let mut per_venue_accept = std::collections::HashMap::<Venue, u32>::new();
        for symbol in 0..1000u32 {
            for (i, b) in venues.iter().enumerate() {
                for s in venues.iter().skip(i + 1) {
                    let r = mk_route(symbol, *b, *s);
                    *per_venue_total.entry(*b).or_default() += 1;
                    *per_venue_total.entry(*s).or_default() += 1;
                    if d.should_persist(r) {
                        *per_venue_accept.entry(*b).or_default() += 1;
                        *per_venue_accept.entry(*s).or_default() += 1;
                    }
                }
            }
        }
        for v in venues {
            let t = *per_venue_total.get(&v).unwrap_or(&0) as f64;
            let a = *per_venue_accept.get(&v).unwrap_or(&0) as f64;
            let ratio = a / t;
            assert!(
                (0.05..0.15).contains(&ratio),
                "venue {:?} com taxa {:.3} fora de [0.05, 0.15]",
                v,
                ratio,
            );
        }
    }

    // ------------------------------------------------------------------
    // Tier tests (Wave V — correção PhD B1)
    // ------------------------------------------------------------------

    #[test]
    fn decider_allowlist_wins_over_priority_and_uniform() {
        let d = RouteDecimator::with_modulus(u64::MAX); // efetivamente zero no residual
        let r = mk_route(1, Venue::MexcFut, Venue::BingxFut);
        let mut al = HashSet::new();
        al.insert(r);
        d.set_allowlist(al);
        // Mesmo com priority_set vazio e modulus que rejeitaria residual,
        // allowlist passa.
        let dr = d.decide(r);
        assert!(dr.should_persist);
        assert_eq!(dr.tier, SamplingTier::Allowlist);
        assert_eq!(dr.probability, 1.0);
    }

    #[test]
    fn decider_priority_wins_over_uniform_when_no_allowlist() {
        let d = RouteDecimator::with_modulus(u64::MAX);
        let r = mk_route(7, Venue::KucoinFut, Venue::GateFut);
        let mut pri = HashSet::new();
        pri.insert(r);
        d.set_priority_set(pri);
        let dr = d.decide(r);
        assert!(dr.should_persist);
        assert_eq!(dr.tier, SamplingTier::Priority);
        assert_eq!(dr.probability, 1.0);
    }

    #[test]
    fn decider_falls_back_to_uniform_decimation() {
        let d = RouteDecimator::with_modulus(10);
        // Rota fora de allowlist/priority; aceita ou rejeita conforme hash.
        let r = mk_route(42, Venue::MexcFut, Venue::BingxFut);
        let dr = d.decide(r);
        assert_eq!(dr.tier, SamplingTier::DecimatedUniform);
        assert_eq!(dr.probability, 0.1);
        // Determinístico — chamar duas vezes retorna igual.
        assert_eq!(dr.should_persist, d.decide(r).should_persist);
    }

    #[test]
    fn with_tier_builds_sample_with_correct_labels() {
        let r = mk_route(42, Venue::MexcFut, Venue::BingxFut);
        let s = RawSample::with_tier(
            1_700_000_000_000_000_000, 17, r, "BTC-USDT",
            2.5, -0.8, 50, 80, 1e6, 2e6,
            false, SampleDecision::Accept,
            SamplingTier::Allowlist, 1.0,
        );
        assert_eq!(s.sampling_tier, "allowlist");
        assert!((s.sampling_probability - 1.0).abs() < f32::EPSILON);
        // Serialização respeita o tier e o sample_id é hex16.
        let line = s.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(v["sampling_tier"], "allowlist");
        assert_eq!(v["sample_id"].as_str().unwrap().len(), 16);
    }

    #[test]
    fn default_new_uses_decimated_uniform_tier_for_backcompat() {
        // Cria via API legada — tier default para compat.
        let r = mk_route(1, Venue::MexcFut, Venue::BingxFut);
        let s = RawSample::new(
            100, 1, r, "BTC-USDT",
            2.0, -1.0, 50, 50, 1e6, 1e6, false,
            SampleDecision::Accept,
        );
        assert_eq!(s.sampling_tier, "decimated_uniform");
    }
}
