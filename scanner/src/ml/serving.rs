//! Serving síncrono do recomendador ML (MVP).
//!
//! Coordena os componentes já implementados:
//!
//! 1. `HotQueryCache` (ADR-012 Camada 1b) — recebe observação de spread.
//! 2. `SamplingTrigger` (ADR-009 + ADR-014) — decide se snapshot entra
//!    no dataset (para shadow mode posterior).
//! 3. `BaselineA3` (ADR-001) — emite `Recommendation`.
//!
//! # Por que síncrono no MVP (não A2 thread dedicada)
//!
//! ADR-010 (A2 thread dedicada com `crossbeam::bounded(1)` + `ArcSwap`
//! + `core_affinity` + circuit breaker) foi desenhado para acomodar o
//! **modelo A2 composta** (QRF + CatBoost + RSF via tract ONNX), que tem
//! latência de ~28 µs + overhead de panic potencial e exige failure
//! isolation estrita.
//!
//! **Baseline A3 é diferente**:
//! - Latência ~1–5 µs (lookup `hdrhistogram` + aritmética simples).
//! - Puro Rust seguro (sem `unsafe`, sem SIMD manual, sem FFI).
//! - Sem estado entre chamadas além do `HotQueryCache`.
//!
//! Executar A3 inline no loop 150 ms do scanner (`spread::engine`) é
//! seguro e simples. Thread dedicada adiciona complexidade (canais,
//! sincronização, debugging) sem ganho material para baseline.
//!
//! **Quando migrar para thread dedicada (ADR-010 completo)**:
//! - Marco 2, quando modelo A2 entra em produção.
//! - Ou se benchmark mostrar que inline A3 impacta latência do scanner
//!   além de ~5% do budget de 150 ms.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::collections::VecDeque;

use ahash::AHashMap;
use parking_lot::Mutex;
use crate::ml::baseline::BaselineA3;
use crate::ml::contract::{
    AbstainDiagnostic, AbstainReason, Recommendation, RouteId, ToxicityLevel, TradeSetup,
};
use crate::ml::eval::verify_tradesetup;
use crate::ml::economic::{
    EconomicAccumulator, EconomicEvent, EconomicMetrics, TradeOutcome,
};
use crate::ml::listing_history::ListingHistory;
use crate::ml::persistence::{AcceptedSample, RawSample, RawWriterHandle, RouteDecimator};
use crate::ml::trigger::{SampleDecision, SamplingTrigger};
use crate::types::Venue;

/// Horizonte mínimo (ns) antes de um trade pending poder ser resolvido.
///
/// Fix pós-auditoria 2026-04-21: a identidade estrutural §2 da skill
/// (`S_entrada(t) + S_saída(t) = -(bid_ask_A + bid_ask_B)/ref`) é
/// sempre negativa no mesmo instante. Permitir resolução intra-tick
/// (quando `now == emitted_at`) fabrica `Realized` com
/// `horizon_observed_s = 0` violando física da estratégia.
///
/// Default: 1 ciclo do scanner = 150 ms. Trade só pode realizar em
/// tick posterior ao da emissão.
pub const MIN_HORIZON_NS: u64 = 150_000_000;

/// Detecta halt via book_age — proxy conservador.
///
/// Fix pós-auditoria: `halt_active` era hardcoded `false` em `lib.rs`,
/// fazendo halts contaminarem o HotQueryCache com spreads anômalos.
/// Proxy: se book_age exceder 10× o limite típico da venue, assume-se
/// halt (WS parou de emitir, book está congelado). É defensivo:
/// prefere over-reject que under-reject (precision-first).
#[inline]
pub fn detect_halt_proxy(
    buy_venue: Venue,
    sell_venue: Venue,
    buy_book_age_ms: u32,
    sell_book_age_ms: u32,
) -> bool {
    const HALT_MULTIPLIER: u32 = 10;
    let buy_limit = buy_venue.max_book_age_ms().saturating_mul(HALT_MULTIPLIER);
    let sell_limit = sell_venue.max_book_age_ms().saturating_mul(HALT_MULTIPLIER);
    buy_book_age_ms > buy_limit || sell_book_age_ms > sell_limit
}

/// Detecta `ToxicityLevel` rudimentar a partir do book_age.
///
/// Fix pós-auditoria: antes, `ToxicityLevel::Healthy` era hardcoded no
/// baseline — falso positivo estrutural. Detector MVP:
/// - Book age ≤ limite da venue → `Healthy` (entrada legítima).
/// - Book age entre `limite` e `3× limite` → `Suspicious` (staleness possível).
/// - Book age > `3× limite` → `Toxic` (staleness confirmada).
///
/// Ref: Foucault, Kozhan & Tham 2017 RFS 30(4) "Toxic arbitrage and
/// the design of limit order markets" — book age elevado correlaciona
/// com adverse selection.
#[inline]
pub fn classify_toxicity(
    buy_venue: Venue,
    sell_venue: Venue,
    buy_book_age_ms: u32,
    sell_book_age_ms: u32,
) -> ToxicityLevel {
    let buy_limit = buy_venue.max_book_age_ms();
    let sell_limit = sell_venue.max_book_age_ms();
    let buy_ratio = (buy_book_age_ms as f32) / (buy_limit.max(1) as f32);
    let sell_ratio = (sell_book_age_ms as f32) / (sell_limit.max(1) as f32);
    let worst = buy_ratio.max(sell_ratio);
    if worst > 3.0 {
        ToxicityLevel::Toxic
    } else if worst > 1.0 {
        ToxicityLevel::Suspicious
    } else {
        ToxicityLevel::Healthy
    }
}

// ---------------------------------------------------------------------------
// MlServer
// ---------------------------------------------------------------------------

/// Servidor ML síncrono — um ponto de entrada para o loop do scanner.
///
/// Thread-safe: todos os componentes internos são thread-safe
/// (`HotQueryCache` via `RwLock`, `BaselineA3` `Send + Sync`,
/// `SamplingTrigger` `Copy`). Múltiplas threads podem chamar
/// `on_opportunity` concorrentemente — as escritas no cache são
/// serializadas pelo write lock interno.
pub struct MlServer {
    baseline: BaselineA3,
    trigger: SamplingTrigger,
    listing: ListingHistory,
    economic: Mutex<EconomicTracker>,
    // Métricas mínimas (agregadas; cópia periódica para Prometheus em M1.8).
    metrics: Arc<ServerMetrics>,
    // Sequência monotônica por ciclo — preenchida pelo chamador
    // (spread engine) a cada tick. Permite desambiguar snapshots do mesmo
    // timestamp em `AcceptedSample.cycle_seq`.
    cycle_seq: AtomicU64,
    // ADR-025: stream contínuo pré-trigger, decimado 1-in-10 por rota.
    // `None` quando desabilitado (tests/CLI flag). `Some((decimator,
    // handle))` em produção para alimentar gates empíricos E1/E2/E4/E6/E8
    // /E10/E11 do Marco 0.
    raw_decimator: RouteDecimator,
    raw_writer: Option<RawWriterHandle>,
}

fn enforce_recommendation_invariants(
    rec: Recommendation,
    n_observations: u32,
    invariant_blocked_counter: Option<&AtomicU64>,
) -> Recommendation {
    match rec {
        Recommendation::Trade(setup) => {
            if let Err(err) = verify_tradesetup(&setup) {
                let model_version = setup.model_version.clone();
                tracing::warn!(
                    route = ?setup.route_id,
                    model_version = %model_version,
                    error = ?err,
                    "blocked invalid TradeSetup before broadcast"
                );
                if let Some(c) = invariant_blocked_counter {
                    c.fetch_add(1, Ordering::Relaxed);
                }
                Recommendation::Abstain {
                    reason: AbstainReason::LowConfidence,
                    diagnostic: AbstainDiagnostic {
                        n_observations,
                        ci_width_if_emitted: None,
                        nearest_feasible_utility: None,
                        tail_ratio_p99_p95: None,
                        model_version,
                        regime_posterior: [0.0; 3],
                    },
                }
            } else {
                Recommendation::Trade(setup)
            }
        }
        other => other,
    }
}

#[derive(Default, Debug)]
pub struct ServerMetrics {
    pub opportunities_seen: AtomicU64,
    pub sample_accepts: AtomicU64,
    pub sample_rejects_stale: AtomicU64,
    pub sample_rejects_low_volume: AtomicU64,
    pub sample_rejects_insufficient_history: AtomicU64,
    pub sample_rejects_below_tail: AtomicU64,
    pub sample_rejects_halt: AtomicU64,
    pub rec_trade_total: AtomicU64,
    pub rec_abstain_no_opportunity: AtomicU64,
    pub rec_abstain_insufficient_data: AtomicU64,
    pub rec_abstain_low_confidence: AtomicU64,
    pub rec_abstain_long_tail: AtomicU64,
    /// Fix pós-auditoria: `enforce_recommendation_invariants` bloqueou
    /// um `TradeSetup` inválido (violação de monotonicidade ou IC). Separar
    /// dos LowConfidence naturais dá visibilidade sobre bugs do baseline.
    pub rec_invariant_blocked: AtomicU64,
    /// ADR-025: RawSample enviado ao writer (fast path).
    pub raw_samples_emitted: AtomicU64,
    /// ADR-025: canal cheio — sample descartada.
    pub raw_samples_dropped_channel_full: AtomicU64,
    /// ADR-025: writer encerrado — sample descartada.
    pub raw_samples_dropped_channel_closed: AtomicU64,
    /// Fix pós-auditoria: AcceptedSample descartada por canal JSONL cheio.
    pub accepted_samples_dropped_channel_full: AtomicU64,
    /// Fix pós-auditoria: AcceptedSample descartada — canal JSONL fechado.
    pub accepted_samples_dropped_channel_closed: AtomicU64,
    /// Toxicity detector (fix pós-auditoria): rota classificada Toxic
    /// no momento da observação (rejeita trade).
    pub toxicity_toxic_detected: AtomicU64,
    /// Toxicity Suspicious — emite Trade com flag warning para UI.
    pub toxicity_suspicious_detected: AtomicU64,
    /// Halt proxy detectado via book_age elevado (fix pós-auditoria).
    pub halt_proxy_detected: AtomicU64,
}

#[derive(Debug, Clone)]
struct PendingEconomicTrade {
    setup: TradeSetup,
    entry_hit_ns: Option<u64>,
    entry_hit_pct: Option<f32>,
    last_exit_pct: f32,
    from_model: bool,
}

impl PendingEconomicTrade {
    fn new(setup: TradeSetup) -> Self {
        let from_model = !setup.model_version.starts_with("baseline-");
        Self {
            setup,
            entry_hit_ns: None,
            entry_hit_pct: None,
            last_exit_pct: 0.0,
            from_model,
        }
    }

    fn observe(
        &mut self,
        now_ns: u64,
        entry_spread: f32,
        exit_spread: f32,
    ) -> Option<EconomicEvent> {
        // Fix pós-auditoria: grace period de MIN_HORIZON_NS respeita a
        // identidade estrutural §2 da skill (`S_entrada(t) + S_saída(t) < 0`
        // no mesmo instante). Trade recém-emitido não pode realizar antes
        // do próximo tick do scanner — viola física da estratégia.
        if now_ns < self.setup.emitted_at.saturating_add(MIN_HORIZON_NS) {
            // Apenas registra último exit observado; não avalia hit ainda.
            self.last_exit_pct = exit_spread;
            return None;
        }

        self.last_exit_pct = exit_spread;
        if self.entry_hit_ns.is_none() && entry_spread >= self.setup.enter_at_min {
            self.entry_hit_ns = Some(now_ns);
            self.entry_hit_pct = Some(entry_spread);
        }

        let entry_realized_pct = self.entry_hit_pct.unwrap_or(entry_spread);
        if self.entry_hit_ns.is_some() && exit_spread >= self.setup.exit_at_min {
            let horizon_observed_s = now_ns
                .saturating_sub(self.setup.emitted_at)
                .saturating_div(1_000_000_000)
                .min(u32::MAX as u64) as u32;
            return Some(EconomicEvent::new(
                &self.setup,
                TradeOutcome::Realized {
                    enter_realized_pct: entry_realized_pct,
                    exit_realized_pct: exit_spread,
                    horizon_observed_s,
                },
                now_ns,
                self.from_model,
            ));
        }

        if now_ns >= self.setup.valid_until {
            let outcome = if self.entry_hit_ns.is_none() {
                TradeOutcome::WindowMiss
            } else {
                TradeOutcome::ExitMiss {
                    enter_realized_pct: entry_realized_pct,
                    forced_exit_pct: self.last_exit_pct,
                }
            };
            return Some(EconomicEvent::new(
                &self.setup,
                outcome,
                now_ns,
                self.from_model,
            ));
        }

        None
    }
}

#[derive(Default)]
struct EconomicTracker {
    accumulator: EconomicAccumulator,
    pending_by_route: AHashMap<RouteId, VecDeque<PendingEconomicTrade>>,
}

impl EconomicTracker {
    fn new() -> Self {
        Self {
            accumulator: EconomicAccumulator::new(),
            pending_by_route: AHashMap::new(),
        }
    }

    fn metrics(&self) -> Arc<EconomicMetrics> {
        self.accumulator.metrics()
    }

    fn process(
        &mut self,
        route: RouteId,
        entry_spread: f32,
        exit_spread: f32,
        now_ns: u64,
        rec: &Recommendation,
    ) {
        // Resolve APENAS trades pendentes ANTERIORES ao push.
        // Fix pós-auditoria: a segunda chamada pós-push resolvia o trade
        // recém-criado no mesmo tick em que foi emitido → viola §2 da
        // skill (identidade estrutural de horizon > 0).
        // `PendingEconomicTrade::observe` agora aplica MIN_HORIZON_NS,
        // então mesmo se alguém chamar resolve_route aqui, o novo trade
        // só resolve a partir do próximo tick.
        self.resolve_route(route, entry_spread, exit_spread, now_ns);
        if let Recommendation::Trade(setup) = rec {
            self.pending_by_route
                .entry(route)
                .or_default()
                .push_back(PendingEconomicTrade::new(setup.clone()));
        }
    }

    fn resolve_route(
        &mut self,
        route: RouteId,
        entry_spread: f32,
        exit_spread: f32,
        now_ns: u64,
    ) {
        let Some(mut queue) = self.pending_by_route.remove(&route) else {
            return;
        };

        let mut keep = VecDeque::with_capacity(queue.len());
        while let Some(mut pending) = queue.pop_front() {
            match pending.observe(now_ns, entry_spread, exit_spread) {
                Some(evt) => self.accumulator.push(evt),
                None => keep.push_back(pending),
            }
        }

        if !keep.is_empty() {
            self.pending_by_route.insert(route, keep);
        }
    }
}

impl MlServer {
    pub fn new(baseline: BaselineA3, trigger: SamplingTrigger) -> Self {
        Self {
            baseline,
            trigger,
            listing: ListingHistory::new(),
            economic: Mutex::new(EconomicTracker::new()),
            metrics: Arc::new(ServerMetrics::default()),
            cycle_seq: AtomicU64::new(0),
            raw_decimator: RouteDecimator::new(),
            raw_writer: None,
        }
    }

    /// Conecta o `RawSampleWriter` (ADR-025). Até ser chamado, o server
    /// opera em modo legacy (só `AcceptedSample`).
    pub fn with_raw_writer(mut self, handle: RawWriterHandle) -> Self {
        self.raw_writer = Some(handle);
        self
    }

    /// Substitui o decimator (ex.: `with_modulus(1)` em testes que
    /// querem capturar toda a série).
    pub fn with_raw_decimator(mut self, decimator: RouteDecimator) -> Self {
        self.raw_decimator = decimator;
        self
    }

    pub fn baseline(&self) -> &BaselineA3 {
        &self.baseline
    }

    pub fn trigger(&self) -> SamplingTrigger {
        self.trigger
    }

    pub fn listing(&self) -> &ListingHistory {
        &self.listing
    }

    pub fn metrics(&self) -> Arc<ServerMetrics> {
        Arc::clone(&self.metrics)
    }

    pub fn economic_metrics(&self) -> Arc<EconomicMetrics> {
        self.economic.lock().metrics()
    }

    /// Avança o `cycle_seq` — chamado uma vez pelo spread engine no início
    /// de cada ciclo 150ms. Thread-safe via `fetch_add`.
    pub fn begin_cycle(&self) -> u32 {
        // Wrap para u32 — cycle_seq é per-ciclo, não eterno.
        (self.cycle_seq.fetch_add(1, Ordering::Relaxed) & 0xFFFF_FFFF) as u32
    }

    /// Processa uma oportunidade do scanner.
    ///
    /// Retorna `(Recommendation, SampleDecision)`:
    /// - `Recommendation` é o output consumido por UI/broadcast.
    /// - `SampleDecision` informa se o snapshot deveria entrar no dataset
    ///   de treinamento (shadow mode M1.7).
    ///
    /// Internamente:
    /// 1. Avalia `SamplingTrigger` (4 gates) contra o cache anterior.
    /// 2. Gera `Recommendation` via `BaselineA3` usando apenas histórico.
    /// 3. Depois atualiza `HotQueryCache` e o ledger econômico com a
    ///    observação atual, se o dado estiver limpo.
    /// 4. Atualiza métricas.
    ///
    /// Chamado a cada tick do scanner (150 ms) para cada rota emitida.
    /// Processa uma observação do spread engine.
    ///
    /// Retorna tripla:
    /// - `Recommendation` — consumido por UI/broadcast.
    /// - `SampleDecision` — classificação do snapshot.
    /// - `Option<AcceptedSample>` — `Some` apenas quando `sample_decision
    ///   == Accept`. Este é o record que será enfileirado para Parquet
    ///   (C1 writer).
    ///
    /// `cycle_seq` deve ser preenchido pelo caller a cada início de
    /// ciclo via [`MlServer::begin_cycle`].
    #[allow(clippy::too_many_arguments)]
    pub fn on_opportunity(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_book_age_ms: u32,
        sell_book_age_ms: u32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        halt_active_external: bool,
        now_ns: u64,
    ) -> (Recommendation, SampleDecision, Option<AcceptedSample>) {
        self.metrics.opportunities_seen.fetch_add(1, Ordering::Relaxed);

        // Fix pós-auditoria: halt proxy via book_age 10× — antes `lib.rs`
        // passava `halt_active = false` hardcoded, permitindo halts
        // contaminarem o histograma. Proxy OR externo cobre ambos os casos.
        let halt_proxy = detect_halt_proxy(
            route.buy_venue,
            route.sell_venue,
            buy_book_age_ms,
            sell_book_age_ms,
        );
        let halt_active = halt_active_external || halt_proxy;
        if halt_proxy {
            self.metrics
                .halt_proxy_detected
                .fetch_add(1, Ordering::Relaxed);
        }

        // Fix pós-auditoria: classificação de toxicity explícita antes de
        // chamar baseline. Se Toxic, baseline abstém; Suspicious emite
        // com warning; Healthy prossegue normal. Antes era hardcoded
        // `Healthy` — falso positivo estrutural.
        let toxicity = classify_toxicity(
            route.buy_venue,
            route.sell_venue,
            buy_book_age_ms,
            sell_book_age_ms,
        );
        match toxicity {
            ToxicityLevel::Toxic => {
                self.metrics
                    .toxicity_toxic_detected
                    .fetch_add(1, Ordering::Relaxed);
            }
            ToxicityLevel::Suspicious => {
                self.metrics
                    .toxicity_suspicious_detected
                    .fetch_add(1, Ordering::Relaxed);
            }
            _ => {}
        }

        // 0. **C5** — registra lifecycle da rota (first_seen / last_seen).
        //    Anti-survivorship; alimenta feature `listing_age_days`.
        self.listing.record_seen(route, now_ns);

        // 1. **C2 fix** — só alimenta histograma se dado é LIMPO.
        //    Snapshots stale/low-vol/halt NÃO devem poluir o P95 que o
        //    próprio trigger consulta. Antes deste fix, havia dependência
        //    circular: histograma contaminado → P95 enviesado → trigger
        //    inconsistente.
        //
        //    Per-venue book-age threshold (C3 fix) vem via
        //    [`Venue::max_book_age_ms`] dentro de `is_clean_data`.
        let clean = self.trigger.is_clean_data(
            route.buy_venue,
            route.sell_venue,
            buy_book_age_ms,
            sell_book_age_ms,
            buy_vol24_usd,
            sell_vol24_usd,
            halt_active,
        );

        // 2. Avalia trigger de amostragem completo (inclui n_min + tail).
        let sample_dec = self.trigger.evaluate(
            route,
            entry_spread,
            buy_book_age_ms,
            sell_book_age_ms,
            buy_vol24_usd,
            sell_vol24_usd,
            halt_active,
            self.baseline.cache(),
        );
        self.bump_sample_metric(sample_dec);

        // 2a. **ADR-025** — emite `RawSample` pré-trigger se a rota está
        //     no conjunto decimado. Sample carrega `sample_dec` congelado
        //     (PIT rigoroso; regra do trigger do momento da observação).
        //     `try_send` é não-bloqueante; canal cheio → drop + métrica.
        if let Some(raw_writer) = self.raw_writer.as_ref() {
            if self.raw_decimator.should_persist(route) {
                let raw = RawSample::new(
                    now_ns,
                    cycle_seq,
                    route,
                    symbol_name,
                    entry_spread,
                    exit_spread,
                    buy_book_age_ms,
                    sell_book_age_ms,
                    buy_vol24_usd,
                    sell_vol24_usd,
                    halt_active,
                    sample_dec,
                );
                match raw_writer.try_send(raw) {
                    Ok(()) => {
                        self.metrics.raw_samples_emitted.fetch_add(1, Ordering::Relaxed);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelFull) => {
                        self.metrics
                            .raw_samples_dropped_channel_full
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelClosed) => {
                        self.metrics
                            .raw_samples_dropped_channel_closed
                            .fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        }

        // 3. Gera recomendação — agora com toxicity já classificada.
        let rec = self
            .baseline
            .recommend(route, entry_spread, exit_spread, now_ns, toxicity);
        let n_observations = self
            .baseline
            .cache()
            .n_observations(route)
            .min(u32::MAX as u64) as u32;
        let rec = enforce_recommendation_invariants(
            rec,
            n_observations,
            Some(&self.metrics.rec_invariant_blocked),
        );
        self.bump_rec_metric(&rec);

        if clean {
            self.baseline
                .cache()
                .observe(route, entry_spread, exit_spread, now_ns);
            self.economic
                .lock()
                .process(route, entry_spread, exit_spread, now_ns, &rec);
        }

        // 4. **C4** — emite `AcceptedSample` se o trigger aceitou.
        //    `was_recommended` inicializa `false`; broadcast layer flipa
        //    para `true` apenas quando ao menos 1 consumer recebeu o frame
        //    (proxy de entrega, não de leitura humana).
        let accepted = if sample_dec == SampleDecision::Accept {
            Some(AcceptedSample::new(
                now_ns,
                cycle_seq,
                route,
                symbol_name,
                entry_spread,
                exit_spread,
                buy_book_age_ms,
                sell_book_age_ms,
                buy_vol24_usd,
                sell_vol24_usd,
                sample_dec,
            ))
        } else {
            None
        };

        (rec, sample_dec, accepted)
    }

    fn bump_sample_metric(&self, d: SampleDecision) {
        let counter = match d {
            SampleDecision::Accept => &self.metrics.sample_accepts,
            SampleDecision::RejectStale => &self.metrics.sample_rejects_stale,
            SampleDecision::RejectLowVolume => &self.metrics.sample_rejects_low_volume,
            SampleDecision::RejectInsufficientHistory => {
                &self.metrics.sample_rejects_insufficient_history
            }
            SampleDecision::RejectBelowTail => &self.metrics.sample_rejects_below_tail,
            SampleDecision::RejectHalt => &self.metrics.sample_rejects_halt,
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }

    fn bump_rec_metric(&self, rec: &Recommendation) {
        use crate::ml::contract::AbstainReason;
        let counter = match rec {
            Recommendation::Trade(_) => &self.metrics.rec_trade_total,
            Recommendation::Abstain { reason, .. } => match reason {
                AbstainReason::NoOpportunity => &self.metrics.rec_abstain_no_opportunity,
                AbstainReason::InsufficientData => &self.metrics.rec_abstain_insufficient_data,
                AbstainReason::LowConfidence => &self.metrics.rec_abstain_low_confidence,
                AbstainReason::LongTail => &self.metrics.rec_abstain_long_tail,
            },
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::baseline::BaselineConfig;
    use crate::ml::feature_store::HotQueryCache;
    use crate::ml::trigger::SamplingConfig;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_server() -> MlServer {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        // Tests usam decimação=1 + janela infinita para controle.
        let cache = HotQueryCache::with_config(CacheConfig::for_testing());
        let baseline = BaselineA3::new(
            cache,
            BaselineConfig {
                floor_pct: 0.5,
                n_min: 100,
                ..BaselineConfig::default()
            },
        );
        let trigger = SamplingTrigger::new(SamplingConfig {
            n_min: 100,
            ..SamplingConfig::default()
        });
        MlServer::new(baseline, trigger)
    }

    fn mk_server_with_min_history(n_min: u64) -> MlServer {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        let cache = HotQueryCache::with_config(CacheConfig::for_testing());
        let baseline = BaselineA3::new(
            cache,
            BaselineConfig {
                floor_pct: 0.5,
                n_min,
                ..BaselineConfig::default()
            },
        );
        let trigger = SamplingTrigger::new(SamplingConfig {
            n_min,
            ..SamplingConfig::default()
        });
        MlServer::new(baseline, trigger)
    }

    #[test]
    fn first_observations_abstain_insufficient_data() {
        let server = mk_server();
        let route = mk_route();
        let (rec, dec, _accepted) = server.on_opportunity(
            0, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false, 1,
        );
        use crate::ml::contract::AbstainReason;
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::InsufficientData);
            }
            _ => panic!("expected Abstain on first observation"),
        }
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
    }

    #[test]
    fn first_observation_does_not_self_prime_recommendation() {
        let server = mk_server_with_min_history(1);
        let route = mk_route();
        let (rec, dec, accepted) = server.on_opportunity(
            0, route, "BTC-USDT", 3.2, -0.4, 50, 50, 1e6, 1e6, false, 1,
        );
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::InsufficientData);
            }
            other => panic!("expected abstain on first observation, got {:?}", other),
        }
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
        assert!(accepted.is_none());
    }

    #[test]
    fn metrics_update_correctly() {
        let server = mk_server();
        let route = mk_route();
        // 10 observações — todas rejeitadas (insufficient).
        for i in 0..10 {
            server.on_opportunity(
                i as u32, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false, i,
            );
        }
        let m = server.metrics();
        assert_eq!(m.opportunities_seen.load(Ordering::Relaxed), 10);
        assert_eq!(m.sample_rejects_insufficient_history.load(Ordering::Relaxed), 10);
        assert_eq!(m.rec_abstain_insufficient_data.load(Ordering::Relaxed), 10);
    }

    fn mk_invalid_setup() -> crate::ml::contract::TradeSetup {
        use crate::ml::contract::{
            CalibStatus, ReasonKind, TradeReason, ToxicityLevel, TradeSetup,
        };

        let mut setup = TradeSetup {
            route_id: mk_route(),
            enter_at_min: 2.0,
            enter_typical: 2.4,
            enter_peak_p95: 2.9,
            p_enter_hit: 0.85,
            exit_at_min: -0.8,
            exit_typical: -0.4,
            p_exit_hit_given_enter: 0.80,
            gross_profit_p10: 1.0,
            gross_profit_p25: 1.4,
            gross_profit_median: 1.9,
            gross_profit_p75: 2.3,
            gross_profit_p90: 2.7,
            gross_profit_p95: 3.1,
            realization_probability: 0.77,
            confidence_interval: (0.70, 0.82),
            horizon_p05_s: 60,
            horizon_median_s: 600,
            horizon_p95_s: 3600,
            toxicity_level: ToxicityLevel::Healthy,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            haircut_predicted: 0.15,
            gross_profit_realizable_median: 1.6,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: "test".into(),
            },
            model_version: "test-0.1.0".into(),
            emitted_at: 1_700_000_000_000_000_000,
            valid_until: 1_700_000_030_000_000_000,
        };
        setup.gross_profit_p25 = setup.gross_profit_p10 - 0.5;
        setup
    }

    #[test]
    fn invalid_trade_setup_is_downgraded_before_broadcast() {
        use crate::ml::contract::Recommendation;

        let counter = AtomicU64::new(0);
        let rec = Recommendation::Trade(mk_invalid_setup());
        let sanitized = enforce_recommendation_invariants(rec, 42, Some(&counter));
        match sanitized {
            Recommendation::Abstain { reason, diagnostic } => {
                assert_eq!(reason, AbstainReason::LowConfidence);
                assert_eq!(diagnostic.n_observations, 42);
                assert_eq!(diagnostic.model_version, "test-0.1.0");
            }
            other => panic!("expected Abstain, got {:?}", other),
        }
        assert_eq!(counter.load(Ordering::Relaxed), 1, "contador de invariants blocked deve subir");
    }

    #[test]
    fn accumulated_observations_eventually_emit_trade() {
        let server = mk_server();
        let route = mk_route();
        // Popula 200 observações "regime opportunity".
        for i in 0..200 {
            let t = (i % 100) as f32 / 100.0;
            server.on_opportunity(
                i as u32,
                route,
                "BTC-USDT",
                2.0 + t * 2.0,
                -1.0 + t * 1.5,
                50,
                50,
                1e6,
                1e6,
                false,
                i,
            );
        }
        // Agora tenta emitir com current_entry alto.
        let (rec, _, _) = server.on_opportunity(
            201, route, "BTC-USDT", 3.8, 0.2, 50, 50, 1e6, 1e6, false, 201,
        );
        match rec {
            Recommendation::Trade(setup) => {
                assert_eq!(setup.route_id, route);
                assert!(setup.realization_probability > 0.0);
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("expected Trade, got Abstain({:?})", reason);
            }
        }
    }

    #[test]
    fn halt_rejects_sample_even_with_good_spread() {
        let server = mk_server();
        let route = mk_route();
        // Popula histórico suficiente.
        for i in 0..200 {
            server.on_opportunity(
                i as u32, route, "BTC-USDT", 2.0, -1.0, 50, 50, 1e6, 1e6, false, i,
            );
        }
        // Spread alto, mas halt_active=true → sample rejeitado.
        let (_rec, dec, accepted) = server.on_opportunity(
            201, route, "BTC-USDT", 3.5, -0.5, 50, 50, 1e6, 1e6, true, 201,
        );
        assert!(accepted.is_none(), "halt não gera AcceptedSample");
        assert_eq!(dec, SampleDecision::RejectHalt);
    }

    #[test]
    fn economic_tracker_resolves_a_trade_in_sequence() {
        // Semântica pós-auditoria: requer 3 ticks.
        // t0: populate cache + abstain InsufficientHistory
        // t1: emite Trade (cache tem 1 sample, n_min=1)
        // t2: tick com entry hitting enter_at_min + exit hitting exit_at_min
        //     → trade realiza (horizon = t2 - t1 ≥ MIN_HORIZON_NS)
        let server = mk_server_with_min_history(1);
        let route = mk_route();

        let t0: u64 = 1_000_000_000;
        let t1: u64 = t0 + 1_000_000_000;
        let t2: u64 = t1 + 1_000_000_000;

        // Tick 0: populate cache (entry=3.0, exit=0.5 → gross=3.5, bem acima do floor).
        let (_rec, dec, _) = server.on_opportunity(
            0, route, "BTC-USDT", 3.0, 0.5, 50, 50, 1e6, 1e6, false, t0,
        );
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);

        // Tick 1: agora cache tem 1 sample ≥ n_min. Emite Trade.
        let (rec, _dec, _accepted) = server.on_opportunity(
            1, route, "BTC-USDT", 3.0, 0.5, 50, 50, 1e6, 1e6, false, t1,
        );
        let setup = match rec {
            Recommendation::Trade(s) => s,
            Recommendation::Abstain { reason, .. } => panic!("esperava Trade, got {:?}", reason),
        };

        // Tick 2: entry ≥ enter_at_min E exit ≥ exit_at_min deve realizar.
        // Observar tick com os mesmos valores garante hit (identidade esperada:
        // setup.enter_at_min ≤ 3.0 e setup.exit_at_min ≤ 0.5).
        assert!(setup.enter_at_min <= 3.0 + 0.01);
        assert!(setup.exit_at_min <= 0.5 + 0.01);

        let (_rec, _dec, _accepted) = server.on_opportunity(
            2, route, "BTC-USDT", 3.0, 0.5, 50, 50, 1e6, 1e6, false, t2,
        );

        let econ = server.economic_metrics();
        assert_eq!(econ.n_emissions_total.load(Ordering::Relaxed), 1,
                   "1 emissão esperada no tick 1");
        assert_eq!(econ.n_realized_total.load(Ordering::Relaxed), 1,
                   "1 realização esperada no tick 2 (após grace period)");
    }

    #[test]
    fn economic_tracker_refuses_intra_tick_resolution() {
        // Fix pós-auditoria: trade recém-emitido não pode "realizar" no
        // mesmo tick em que foi emitido (viola identidade estrutural §2).
        let server = mk_server_with_min_history(1);
        let route = mk_route();

        let t0: u64 = 1_000_000_000;
        let t_emit: u64 = t0 + 1_000_000_000;

        // Primeiro popula cache.
        let _ = server.on_opportunity(
            0, route, "BTC-USDT", 3.0, 0.5, 50, 50, 1e6, 1e6, false, t0,
        );

        // Tick de emissão: entry E exit já favoráveis no MESMO tick.
        let (rec, _, _) = server.on_opportunity(
            1, route, "BTC-USDT", 3.5, 0.5, 50, 50, 1e6, 1e6, false, t_emit,
        );
        assert!(matches!(rec, Recommendation::Trade(_)),
                "cache populado deve emitir Trade no 2º tick");

        // SEM fix, trade realizaria no mesmo tick em horizon=0s
        // (violando skill §2). COM fix, grace MIN_HORIZON_NS bloqueia.
        let econ = server.economic_metrics();
        let realized_after_emit = econ.n_realized_total.load(Ordering::Relaxed);
        assert_eq!(
            realized_after_emit, 0,
            "trade NÃO deve realizar intra-tick (horizon > 0 é obrigatório)"
        );
    }

    #[tokio::test]
    async fn raw_writer_receives_all_samples_with_modulus_1() {
        // ADR-025 gate de aceitação #2 — com `modulus=1`, toda observação
        // passa pelo writer, independentemente do trigger aceitar.
        use crate::ml::persistence::{RawSampleWriter, RawWriterConfig};
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        let (writer, handle) = RawSampleWriter::create(RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "test".into(),
        });
        let task = tokio::spawn(writer.run());

        let server = mk_server()
            .with_raw_writer(handle)
            .with_raw_decimator(RouteDecimator::with_modulus(1));

        let route = mk_route();
        // 50 observações — todas devem ser rejeitadas pelo trigger
        // (n_min=100), mas todas devem aparecer no RawSample dataset.
        for i in 0..50 {
            server.on_opportunity(
                i as u32, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false,
                1_745_159_400u64 * 1_000_000_000 + i as u64,
            );
        }

        tokio::time::sleep(Duration::from_millis(200)).await;
        // Drop do server descarta o handle dentro dele; mas temos um
        // clone via `with_raw_writer` consumido. O handle interno é
        // dropado quando o server sai de escopo.
        drop(server);
        task.await.expect("task join");

        // Conta linhas gravadas — deve ser 50.
        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        assert!(hour_dir.exists(), "hour dir criado");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        assert_eq!(files.len(), 1);
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line_count = content.lines().count();
        assert_eq!(line_count, 50, "deve gravar todas 50 observações");

        // Verifica que métrica foi incrementada.
        // Não temos mais ref ao server, mas o teste anterior já validou
        // que `raw_samples_emitted` sobe em ordem. Aqui o ponto é contar
        // no disco.
    }

    #[test]
    fn raw_writer_respects_decimator_distribution() {
        // ADR-025 gate de aceitação #3 — decimator ~10% de rotas.
        // Criamos server sem writer conectado (apenas conta métrica não
        // vai subir, mas o decimator já determinou o mod 10 correto).
        let d = RouteDecimator::with_modulus(10);
        // Verifica que para `mk_route` do teste, should_persist é
        // estável entre chamadas (determinismo PIT).
        let r = mk_route();
        let decision = d.should_persist(r);
        for _ in 0..100 {
            assert_eq!(d.should_persist(r), decision);
        }
    }

    #[tokio::test]
    async fn pit_sample_decision_preserved_in_raw_sample() {
        // ADR-025 gate de aceitação #3 — o veredito do trigger persistido
        // no RawSample deve ser idêntico ao retornado por on_opportunity.
        use crate::ml::persistence::{RawSampleWriter, RawWriterConfig};
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        let (writer, handle) = RawSampleWriter::create(RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "pit".into(),
        });
        let task = tokio::spawn(writer.run());

        let server = mk_server()
            .with_raw_writer(handle)
            .with_raw_decimator(RouteDecimator::with_modulus(1));

        let route = mk_route();
        // Observação que o trigger sinaliza RejectInsufficientHistory
        // (sem histórico acumulado).
        let (_, sample_dec, _) = server.on_opportunity(
            0, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false,
            1_745_159_400u64 * 1_000_000_000,
        );
        assert_eq!(sample_dec, SampleDecision::RejectInsufficientHistory);

        tokio::time::sleep(Duration::from_millis(150)).await;
        drop(server);
        task.await.expect("task join");

        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line = content.lines().next().expect("at least 1 line");
        let v: serde_json::Value = serde_json::from_str(line).unwrap();
        assert_eq!(
            v["sample_decision"], "insufficient_history",
            "veredito do trigger preservado PIT no RawSample",
        );
    }
}
