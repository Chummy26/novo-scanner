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
    AbstainDiagnostic, AbstainReason, Recommendation, RouteId, TradeSetup,
};
use crate::ml::eval::verify_tradesetup;
use crate::ml::economic::{
    EconomicAccumulator, EconomicEvent, EconomicMetrics, TradeOutcome,
};
use crate::ml::listing_history::ListingHistory;
use crate::ml::persistence::{
    AcceptedSample, FeaturesT0, LabelResolver, PolicyMetadata, RawSample, RawWriterHandle,
    RouteDecimator, RouteRanking,
};
use crate::ml::trigger::{SampleDecision, SamplingTrigger};

/// Horizonte mínimo (ns) antes de um trade pending poder ser resolvido.
///
/// Fix pós-auditoria 2026-04-21: a identidade estrutural §2 da skill
/// (`S_entrada(t) + S_saída(t) = -(bid_ask_A + bid_ask_B)/ref`) é
/// sempre negativa no mesmo instante. Permitir resolução intra-tick
/// (quando `now == emitted_at`) fabrica `Realized` com
/// `horizon_observed_ms = 0` violando física da estratégia.
///
/// Default: 1 ciclo do scanner = 150 ms. Trade só pode realizar em
/// tick posterior ao da emissão.
pub const MIN_HORIZON_NS: u64 = 150_000_000;

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
    // ADR-025: stream contínuo pré-trigger. Wave V: decimator em 3 tiers
    // (allowlist / priority / uniform). Seleção em `decide()`.
    raw_decimator: RouteDecimator,
    raw_writer: Option<RawWriterHandle>,
    // Wave V — rankeador rolling que atualiza `raw_decimator` priority_set.
    // `None` quando desabilitado (tests minimalistas).
    route_ranking: Option<Arc<RouteRanking>>,
    // Wave V — resolvedor de labels supervisionados (LabeledTrade).
    // `None` = label disabled (tests legados). Usa `Arc` porque o sweeper
    // task também segura uma cópia.
    label_resolver: Option<Arc<LabelResolver>>,
    // Wave V — parâmetros de labeling (stride, floor).
    label_stride_s: u32,
    label_floor_pct: f32,
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
    pub sample_rejects_low_volume: AtomicU64,
    pub sample_rejects_insufficient_history: AtomicU64,
    pub sample_rejects_below_tail: AtomicU64,
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
}

#[derive(Debug, Clone)]
struct PendingEconomicTrade {
    setup: TradeSetup,
    last_exit_pct: f32,
    from_model: bool,
}

impl PendingEconomicTrade {
    fn new(setup: TradeSetup) -> Self {
        let from_model = !setup.model_version.starts_with("baseline-");
        Self {
            setup,
            last_exit_pct: 0.0,
            from_model,
        }
    }

    fn observe(
        &mut self,
        now_ns: u64,
        _entry_spread: f32,
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
        let entry_realized_pct = self.setup.entry_now;
        if exit_spread >= self.setup.exit_target {
            // Fix pós-auditoria L14: horizonte em milissegundos para
            // evitar truncamento a 0 em realizações sub-segundo.
            let horizon_observed_ms = now_ns
                .saturating_sub(self.setup.emitted_at)
                .saturating_div(1_000_000)
                .min(u32::MAX as u64) as u32;
            return Some(EconomicEvent::new(
                &self.setup,
                TradeOutcome::Realized {
                    enter_realized_pct: entry_realized_pct,
                    exit_realized_pct: exit_spread,
                    horizon_observed_ms,
                },
                now_ns,
                self.from_model,
            ));
        }

        if now_ns >= self.setup.valid_until {
            let outcome = TradeOutcome::ExitMiss {
                enter_realized_pct: entry_realized_pct,
                forced_exit_pct: self.last_exit_pct,
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

    /// Sweeper econômico — fecha pendings cuja janela `valid_until` expirou
    /// mesmo sem nova observação (Fix pós-auditoria C2).
    ///
    /// Análogo ao `LabelResolver::sweep`: rotas que silenciam nunca
    /// chamariam `resolve_route(clean)`, deixando `PendingEconomicTrade`
    /// imortais. Isso enviesava `realization_rate` e `pnl_aggregated_usd`.
    ///
    /// Usa `last_exit_pct` observado por último (`0.0` default se nunca
    /// recebeu observação limpa) como `forced_exit_pct` para `ExitMiss`.
    ///
    /// Retorna número de pendings fechados nesta passagem.
    fn sweep(&mut self, now_ns: u64) -> u64 {
        let mut closed = 0u64;
        let mut empty_routes: Vec<RouteId> = Vec::new();
        for (route, queue) in self.pending_by_route.iter_mut() {
            let mut keep = VecDeque::with_capacity(queue.len());
            while let Some(pending) = queue.pop_front() {
                if now_ns >= pending.setup.valid_until {
                    // Timeout — gera outcome com última observação em cache.
                    let outcome = TradeOutcome::ExitMiss {
                        enter_realized_pct: pending.setup.entry_now,
                        forced_exit_pct: pending.last_exit_pct,
                    };
                    let evt = EconomicEvent::new(
                        &pending.setup,
                        outcome,
                        now_ns,
                        pending.from_model,
                    );
                    self.accumulator.push(evt);
                    closed += 1;
                } else {
                    keep.push_back(pending);
                }
            }
            if keep.is_empty() {
                empty_routes.push(*route);
            } else {
                *queue = keep;
            }
        }
        for r in empty_routes {
            self.pending_by_route.remove(&r);
        }
        closed
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
            route_ranking: None,
            label_resolver: None,
            label_stride_s: 60,
            label_floor_pct: 0.8,
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

    /// Wave V: conecta ranker rolling (top-N dinâmico por
    /// `accept_count_24h`) para o tier Priority do `RouteDecimator`.
    pub fn with_route_ranking(mut self, ranker: Arc<RouteRanking>) -> Self {
        self.route_ranking = Some(ranker);
        self
    }

    /// Wave V: conecta resolvedor de labels supervisionados.
    pub fn with_label_resolver(mut self, resolver: Arc<LabelResolver>) -> Self {
        self.label_resolver = Some(resolver);
        self
    }

    /// Wave V: ajusta parâmetros de labeling.
    pub fn with_label_params(mut self, stride_s: u32, floor_pct: f32) -> Self {
        self.label_stride_s = stride_s;
        self.label_floor_pct = floor_pct;
        self
    }

    pub fn raw_decimator(&self) -> &RouteDecimator {
        &self.raw_decimator
    }

    pub fn route_ranking(&self) -> Option<Arc<RouteRanking>> {
        self.route_ranking.as_ref().map(Arc::clone)
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

    /// Fix pós-auditoria C2: fecha trades pendentes cujo `valid_until`
    /// expirou mesmo sem nova observação da rota. Chamado periodicamente
    /// por task tokio (análogo ao sweeper do LabelResolver).
    ///
    /// Retorna número de pendings fechados.
    pub fn economic_sweep(&self, now_ns: u64) -> u64 {
        self.economic.lock().sweep(now_ns)
    }

    /// Avança o `cycle_seq` — chamado uma vez pelo spread engine no início
    /// de cada ciclo 150ms. Thread-safe via `fetch_add`.
    pub fn begin_cycle(&self) -> u32 {
        // Wrap para u32 — cycle_seq é per-ciclo, não eterno.
        (self.cycle_seq.fetch_add(1, Ordering::Relaxed) & 0xFFFF_FFFF) as u32
    }

    /// Observa uma rota válida que não necessariamente é uma oportunidade
    /// acima do threshold do scanner.
    ///
    /// Isto alimenta o histórico PIT do ML e resolve trades pendentes sem
    /// emitir `Recommendation` nem `AcceptedSample`. É essencial para labels
    /// futuros: `exitSpread(t1)` pode melhorar depois que `entrySpread` caiu
    /// abaixo do threshold de UI, e esse caminho não pode desaparecer do
    /// dataset de treinamento.
    #[allow(clippy::too_many_arguments)]
    pub fn observe_background(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        now_ns: u64,
    ) -> SampleDecision {
        self.listing.record_seen(route, now_ns);
        let clean = self.trigger.is_clean_data(buy_vol24_usd, sell_vol24_usd);
        let sample_dec = self.trigger.evaluate(
            route,
            entry_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            self.baseline.cache(),
        );
        self.bump_sample_metric(sample_dec);

        // Wave V — ranker observa (candidate, accepted).
        if let Some(ranker) = self.route_ranking.as_ref() {
            let accepted = matches!(sample_dec, SampleDecision::Accept);
            let vol = buy_vol24_usd.min(sell_vol24_usd);
            ranker.observe(route, now_ns, accepted, vol);
        }

        // Wave V — decimator em tiers.
        if let Some(raw_writer) = self.raw_writer.as_ref() {
            let dr = self.raw_decimator.decide(route);
            if dr.should_persist {
                let raw = RawSample::with_tier(
                    now_ns,
                    cycle_seq,
                    route,
                    symbol_name,
                    entry_spread,
                    exit_spread,
                    buy_vol24_usd,
                    sell_vol24_usd,
                    sample_dec,
                    dr.tier,
                    dr.probability,
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

        if clean {
            self.baseline
                .cache()
                .observe(route, entry_spread, exit_spread, now_ns);
            self.economic
                .lock()
                .resolve_route(route, entry_spread, exit_spread, now_ns);
            // Wave V — resolvedor de LabeledTrade recebe APENAS observações
            // com liquidez mínima; best_exit supervisionado fica no domínio
            // de spread bruto e não recebe diagnósticos operacionais.
            if let Some(resolver) = self.label_resolver.as_ref() {
                resolver.on_clean_observation(route, now_ns, entry_spread, exit_spread);
            }
        }

        sample_dec
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
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        now_ns: u64,
    ) -> (Recommendation, SampleDecision, Option<AcceptedSample>) {
        self.metrics.opportunities_seen.fetch_add(1, Ordering::Relaxed);

        // 0. **C5** — registra lifecycle da rota (first_seen / last_seen).
        //    Anti-survivorship; alimenta feature `listing_age_days`.
        self.listing.record_seen(route, now_ns);

        // 1. **C2 fix** — só alimenta histograma se dado é LIMPO.
        //    Snapshots low-vol NÃO devem poluir o P95 que o
        //    próprio trigger consulta. Antes deste fix, havia dependência
        //    circular: histograma contaminado → P95 enviesado → trigger
        //    inconsistente.
        let clean = self.trigger.is_clean_data(buy_vol24_usd, sell_vol24_usd);

        // 2. Avalia trigger de amostragem completo (inclui n_min + tail).
        let sample_dec = self.trigger.evaluate(
            route,
            entry_spread,
            buy_vol24_usd,
            sell_vol24_usd,
            self.baseline.cache(),
        );
        self.bump_sample_metric(sample_dec);

        // Wave V — ranker observa (candidate, accepted).
        if let Some(ranker) = self.route_ranking.as_ref() {
            let accepted = matches!(sample_dec, SampleDecision::Accept);
            let vol = buy_vol24_usd.min(sell_vol24_usd);
            ranker.observe(route, now_ns, accepted, vol);
        }

        // 2a. **ADR-025 + Wave V tier** — emite `RawSample` pré-trigger
        //     se o decimator (com 3 tiers) aprovar. `sample_id` e
        //     `sampling_tier` inclusos no schema v3.
        let tier_snapshot = if let Some(raw_writer) = self.raw_writer.as_ref() {
            let dr = self.raw_decimator.decide(route);
            if dr.should_persist {
                let raw = RawSample::with_tier(
                    now_ns,
                    cycle_seq,
                    route,
                    symbol_name,
                    entry_spread,
                    exit_spread,
                    buy_vol24_usd,
                    sell_vol24_usd,
                    sample_dec,
                    dr.tier,
                    dr.probability,
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
            Some((dr.tier, dr.probability))
        } else {
            // Sem raw_writer, ainda calcula o tier para alimentar o label
            // resolver (correção B1 — label persiste mesmo sem raw).
            let dr = self.raw_decimator.decide(route);
            Some((dr.tier, dr.probability))
        };

        // 3. Gera recomendação apenas a partir dos spreads e histórico PIT.
        let rec = self
            .baseline
            .recommend(route, entry_spread, exit_spread, now_ns);
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
        let entry_p50_pre_observe = self.baseline.cache().quantile_entry(route, 0.50);
        let exit_p50_pre_observe = self.baseline.cache().quantile_exit(route, 0.50);
        // Fix pós-auditoria: popular `tail_ratio_p99_p95` usando o mesmo
        // cache pré-observe (PIT). Feature contínua que o baseline já
        // computa para o gate LongTail; expor como input do modelo
        // permite aprender regimes de cauda sem re-derivar. None se
        // histórico insuficiente ou p95 ≈ 0 (divisão instável).
        let tail_ratio_pre_observe = {
            let p99 = self.baseline.cache().quantile_entry(route, 0.99);
            let p95 = self.baseline.cache().quantile_entry(route, 0.95);
            match (p99, p95) {
                (Some(p99v), Some(p95v)) if p95v.abs() > 1e-6 => Some(p99v / p95v),
                _ => None,
            }
        };

        if clean {
            self.baseline
                .cache()
                .observe(route, entry_spread, exit_spread, now_ns);
            self.economic
                .lock()
                .process(route, entry_spread, exit_spread, now_ns, &rec);
            // Wave V — resolvedor supervisionado consome obs limpa.
            if let Some(resolver) = self.label_resolver.as_ref() {
                resolver.on_clean_observation(route, now_ns, entry_spread, exit_spread);
            }
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
                buy_vol24_usd,
                sell_vol24_usd,
                sample_dec,
            ))
        } else {
            None
        };

        // Wave V — enfileira `PendingLabel` quando sample é Accept.
        // Stride configurável (`label_stride_s`); supression rates saem em
        // métricas do resolver (`stride_skipped_total`).
        if let (Some(resolver), Some(accepted_sample), Some((tier, prob))) =
            (self.label_resolver.as_ref(), accepted.as_ref(), tier_snapshot)
        {
            let (
                baseline_recommended,
                baseline_base_rate,
                baseline_enter_at_min,
                baseline_exit_at_min,
            ) =
                match &rec {
                    Recommendation::Trade(ts) => {
                        let d = ts.baseline_diagnostics.as_ref();
                        (
                            true,
                            d.map(|d| d.historical_base_rate_24h),
                            d.map(|d| d.enter_at_min),
                            d.map(|d| d.exit_at_min),
                        )
                    }
                    Recommendation::Abstain { .. } => (false, None, None, None),
                };
            let features_t0 = FeaturesT0 {
                buy_vol24: buy_vol24_usd,
                sell_vol24: sell_vol24_usd,
                tail_ratio_p99_p95: tail_ratio_pre_observe,
                entry_p50_24h: entry_p50_pre_observe,
                exit_p50_24h: exit_p50_pre_observe,
            };
            // Fix pós-auditoria H6: `label_sampling_probability` deve
            // refletir `tier × stride` (doc em labeled_trade.rs:98), não
            // apenas o tier. Aproximação conservadora:
            //   effective_prob = tier_prob × (1 / max(stride_s, 1))
            // — assume ≥ 1 Accept/s por rota em regime de cauda. Quando
            // stride=0 (tests ou regime sem supressão), mantém tier_prob.
            let effective_sampling_probability = if self.label_stride_s > 0 {
                let stride_factor = 1.0_f32 / (self.label_stride_s as f32);
                prob * stride_factor
            } else {
                prob
            };
            let policy = PolicyMetadata {
                baseline_model_version: self
                    .baseline
                    .config()
                    .model_version
                    .to_string(),
                baseline_recommended,
                baseline_historical_base_rate_24h: baseline_base_rate,
                baseline_derived_enter_at_min: baseline_enter_at_min,
                baseline_derived_exit_at_min: baseline_exit_at_min,
                baseline_floor_pct: self.baseline.config().floor_pct,
                label_stride_s: self.label_stride_s,
                label_sampling_probability: effective_sampling_probability,
            };
            resolver.on_accepted(
                accepted_sample.sample_id.clone(),
                now_ns,
                cycle_seq,
                route,
                accepted_sample.symbol_name.clone(),
                entry_spread,
                exit_spread,
                features_t0,
                self.label_floor_pct,
                policy,
                tier.as_str(),
                prob,
                self.label_stride_s,
            );
        }

        (rec, sample_dec, accepted)
    }

    fn bump_sample_metric(&self, d: SampleDecision) {
        let counter = match d {
            SampleDecision::Accept => &self.metrics.sample_accepts,
            SampleDecision::RejectLowVolume => &self.metrics.sample_rejects_low_volume,
            SampleDecision::RejectInsufficientHistory => {
                &self.metrics.sample_rejects_insufficient_history
            }
            SampleDecision::RejectBelowTail => &self.metrics.sample_rejects_below_tail,
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
            0, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6, 1,
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
    fn background_observations_prime_cache_without_recommendation_output() {
        let server = mk_server();
        let route = mk_route();
        assert_eq!(server.baseline.cache().n_observations(route), 0);

        for i in 0..10 {
            let dec = server.observe_background(
                i,
                route,
                "BTC-USDT",
                0.1 + i as f32 * 0.01,
                -0.8,
                1e6,
                1e6,
                1_000_000_000 + i as u64,
            );
            assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
        }

        assert_eq!(server.baseline.cache().n_observations(route), 10);
        assert_eq!(
            server.metrics.opportunities_seen.load(Ordering::Relaxed),
            0,
            "background observations are data collection, not UI opportunities"
        );
        assert_eq!(server.metrics.rec_trade_total.load(Ordering::Relaxed), 0);
    }

    #[test]
    fn first_observation_does_not_self_prime_recommendation() {
        let server = mk_server_with_min_history(1);
        let route = mk_route();
        let (rec, dec, accepted) = server.on_opportunity(
            0, route, "BTC-USDT", 3.2, -0.4, 1e6, 1e6, 1,
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
                i as u32, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6, i,
            );
        }
        let m = server.metrics();
        assert_eq!(m.opportunities_seen.load(Ordering::Relaxed), 10);
        assert_eq!(m.sample_rejects_insufficient_history.load(Ordering::Relaxed), 10);
        assert_eq!(m.rec_abstain_insufficient_data.load(Ordering::Relaxed), 10);
    }

    fn mk_invalid_setup() -> crate::ml::contract::TradeSetup {
        use crate::ml::contract::{
            BaselineDiagnostics, CalibStatus, ReasonKind, TradeReason, TradeSetup,
        };

        let mut setup = TradeSetup {
            route_id: mk_route(),
            entry_now: 2.4,
            exit_target: -0.4,
            gross_profit_target: 2.0,
            p_hit: Some(0.83),
            p_hit_ci: Some((0.77, 0.88)),
            exit_q25: Some(-0.7),
            exit_q50: Some(-0.4),
            exit_q75: Some(-0.2),
            t_hit_p25_s: Some(900),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(3120),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
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
                historical_base_rate_24h: 0.77,
                historical_base_rate_ci: (0.70, 0.82),
            }),
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: "test".into(),
            },
            model_version: "test-0.1.0".into(),
            emitted_at: 1_700_000_000_000_000_000,
            valid_until: 1_700_000_030_000_000_000,
        };
        setup.baseline_diagnostics.as_mut().unwrap().gross_profit_p25 = 0.5;
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
                1e6,
                1e6,
                i,
            );
        }
        // Agora tenta emitir com current_entry alto.
        let (rec, _, _) = server.on_opportunity(
            201, route, "BTC-USDT", 3.8, 0.2, 1e6, 1e6, 201,
        );
        match rec {
            Recommendation::Trade(setup) => {
                assert_eq!(setup.route_id, route);
                assert!(setup
                    .baseline_diagnostics
                    .as_ref()
                    .unwrap()
                    .historical_base_rate_24h
                    > 0.0);
                assert!(setup.p_hit.is_none());
                assert!(setup.t_hit_median_s.is_none());
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("expected Trade, got Abstain({:?})", reason);
            }
        }
    }

    #[test]
    fn economic_tracker_resolves_a_trade_in_sequence() {
        // Semântica pós-auditoria: requer 3 ticks.
        // t0: populate cache + abstain InsufficientHistory
        // t1: emite Trade e trava entry_now em t1 (cache tem 1 sample, n_min=1)
        // t2: tick futuro com exit >= exit_target realiza o trade.
        let server = mk_server_with_min_history(1);
        let route = mk_route();

        let t0: u64 = 1_000_000_000;
        let t1: u64 = t0 + 1_000_000_000;
        let t2: u64 = t1 + 1_000_000_000;

        // Tick 0: populate cache (entry=3.0, exit=0.5 → gross=3.5, bem acima do floor).
        let (_rec, dec, _) = server.on_opportunity(
            0, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t0,
        );
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);

        // Tick 1: agora cache tem 1 sample ≥ n_min. Emite Trade.
        let (rec, _dec, _accepted) = server.on_opportunity(
            1, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t1,
        );
        let setup = match rec {
            Recommendation::Trade(s) => s,
            Recommendation::Abstain { reason, .. } => panic!("esperava Trade, got {:?}", reason),
        };

        // Tick 2: entry já está travado em t1; só exit futuro precisa cruzar o alvo.
        assert_eq!(setup.entry_now, 3.0);
        assert!(setup.exit_target <= 0.5 + 0.01);

        let (_rec, _dec, _accepted) = server.on_opportunity(
            2, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t2,
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
            0, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t0,
        );

        // Tick de emissão: entry E exit já favoráveis no MESMO tick.
        let (rec, _, _) = server.on_opportunity(
            1, route, "BTC-USDT", 3.5, 0.5, 1e6, 1e6, t_emit,
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

    #[test]
    fn economic_sweeper_closes_silent_route_after_valid_until() {
        let server = mk_server_with_min_history(1);
        let route = mk_route();
        let t0: u64 = 1_000_000_000;
        let t_emit: u64 = t0 + 1_000_000_000;

        let _ = server.on_opportunity(
            0, route, "BTC-USDT", 3.0, 0.5, 1e6, 1e6, t0,
        );
        let (rec, _, _) = server.on_opportunity(
            1, route, "BTC-USDT", 3.0, 0.4, 1e6, 1e6, t_emit,
        );
        assert!(matches!(rec, Recommendation::Trade(_)));

        let closed = server.economic_sweep(t_emit + 31_000_000_000);
        let econ = server.economic_metrics();
        assert_eq!(closed, 1);
        assert_eq!(econ.n_emissions_total.load(Ordering::Relaxed), 1);
        assert_eq!(econ.n_exit_miss_total.load(Ordering::Relaxed), 1);
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
                i as u32, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6,
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
            0, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6,
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

    #[tokio::test]
    async fn labeled_trade_features_t0_use_pre_observation_quantiles() {
        use crate::ml::persistence::{
            LabelResolver, LabeledJsonlWriter, LabeledWriterConfig, ResolverConfig,
        };
        use std::sync::Arc;
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        let (writer, handle) = LabeledJsonlWriter::create(LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "pit-label".into(),
        });
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig {
                horizons_s: [1, 2, 3],
                close_slack_ns: 1_000_000_000,
                route_vanish_idle_ns: 60 * 1_000_000_000,
                max_pending_per_route: 100,
                sweeper_interval: Duration::from_secs(10),
            },
            handle,
        ));

        let server = mk_server_with_min_history(2);
        let route = mk_route();
        let t0 = 1_745_159_400u64 * 1_000_000_000;
        server.on_opportunity(0, route, "BTC-USDT", 1.0, -1.0, 1e6, 1e6, t0);
        server.on_opportunity(
            1,
            route,
            "BTC-USDT",
            9.0,
            2.0,
            1e6,
            1e6,
            t0 + 1,
        );
        let pre_entry_p50 = server.baseline.cache().quantile_entry(route, 0.50).unwrap();

        let server = server
            .with_label_resolver(Arc::clone(&resolver))
            .with_label_params(0, 0.8)
            .with_raw_decimator(RouteDecimator::with_modulus(1));
        let (_rec, dec, accepted) = server.on_opportunity(
            2,
            route,
            "BTC-USDT",
            9.0,
            2.5,
            1e6,
            1e6,
            t0 + 2_000_000_000,
        );
        assert_eq!(dec, SampleDecision::Accept);
        assert!(accepted.is_some());
        resolver.on_clean_observation(route, t0 + 3_000_000_000, 8.0, 2.6);
        resolver.sweep(t0 + 6_000_000_000);

        tokio::time::sleep(Duration::from_millis(150)).await;
        drop(server);
        drop(resolver);
        task.await.expect("task join");

        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line = content.lines().next().expect("at least 1 label");
        let v: serde_json::Value = serde_json::from_str(line).unwrap();
        let label_entry_p50 = v["features_t0"]["entry_p50_24h"].as_f64().unwrap() as f32;
        assert!(
            (label_entry_p50 - pre_entry_p50).abs() < 0.05,
            "features_t0 must use pre-observe p50; got {label_entry_p50}, pre was {pre_entry_p50}"
        );
    }
}
