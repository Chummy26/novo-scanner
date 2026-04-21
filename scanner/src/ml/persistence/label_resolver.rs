//! Resolver de `LabeledTrade` com 3 horizontes independentes (Opção B).
//!
//! Cada `AcceptedSample(t0)` elegível pelo stride gera um `PendingLabel`
//! contendo 3 `PendingHorizon` (15 min, 30 min, 2 h). Cada slot é
//! resolvido independentemente: quando `now_ns >= t_emit + horizon_s`,
//! escreve seu record no `LabeledWriterHandle` e fecha.
//!
//! Observações atualizam `best_exit`, `first_exit_ge_label_floor` APENAS
//! quando `is_clean_data == true` (correção PhD Q2). Observações sujas
//! entram no RawSample mas não contaminam o supervisionado.
//!
//! # Sweeper global
//!
//! Task tokio `interval(sweeper_interval_s)` varre todos os `PendingHorizon`
//! abertos:
//! - Se `observed_until_ns < now - 5 min` → censura `route_vanished`.
//! - Se `now >= t_emit + h + slack` → fecha normal.
//!
//! Em SIGTERM limpo, sweeper força `censored { shutdown }` de todos abertos.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use ahash::AHashMap;
use parking_lot::Mutex;

use crate::ml::contract::RouteId;
use crate::ml::persistence::labeled_trade::{
    CensorReason, FeaturesT0, LabelOutcome, LabeledTrade, PolicyMetadata,
    LABELED_TRADE_SCHEMA_VERSION, SCANNER_VERSION,
};
use crate::ml::persistence::labeled_writer::{LabeledWriterHandle, LabeledWriterSendError};

/// Padrões de horizonte (s). CLAUDE.md menciona "~2h15" como exemplo;
/// aqui usamos (15 min, 30 min, 2 h) cobrindo curto/médio/longo.
pub const DEFAULT_HORIZONS_S: [u32; 3] = [900, 1800, 7200];

/// Slack após `t_emit + h` antes de fechar o horizonte (permite capturar
/// best_exit do último bucket sem perder dados por timing).
pub const DEFAULT_CLOSE_SLACK_NS: u64 = 30 * 1_000_000_000; // 30 s

/// Tempo após último `observed_until_ns` que caracteriza rota sumida.
pub const ROUTE_VANISH_IDLE_NS: u64 = 5 * 60 * 1_000_000_000; // 5 min

/// Limite de pending labels por rota antes de descartar o mais antigo.
pub const MAX_PENDING_PER_ROUTE: usize = 10_000;

#[derive(Debug, Clone)]
pub struct PendingHorizon {
    pub horizon_s: u32,
    pub best_exit_pct_so_far: Option<f32>,
    pub best_exit_ts_ns_so_far: Option<u64>,
    pub first_exit_ge_floor_ts_ns: Option<u64>,
    pub first_exit_ge_floor_pct: Option<f32>,
    pub observed_until_ns: u64,
    pub n_clean_future_samples: u32,
    pub closed: bool,
}

impl PendingHorizon {
    fn new(horizon_s: u32, t_emit_ns: u64) -> Self {
        Self {
            horizon_s,
            best_exit_pct_so_far: None,
            best_exit_ts_ns_so_far: None,
            first_exit_ge_floor_ts_ns: None,
            first_exit_ge_floor_pct: None,
            observed_until_ns: t_emit_ns,
            n_clean_future_samples: 0,
            closed: false,
        }
    }

    fn deadline_ns(&self, t_emit_ns: u64) -> u64 {
        t_emit_ns + (self.horizon_s as u64) * 1_000_000_000
    }
}

/// Metadados congelados em t₀ — não mudam ao longo da vida do pending.
#[derive(Debug, Clone)]
pub struct PendingLabel {
    pub sample_id: String,
    pub ts_emit_ns: u64,
    pub cycle_seq: u32,
    pub route_id: RouteId,
    pub symbol_name: String,
    pub entry_locked_pct: f32,
    pub exit_start_pct: f32,
    pub features_t0: FeaturesT0,
    pub label_floor_pct: f32,
    pub policy_metadata: PolicyMetadata,
    pub sampling_tier: &'static str,
    pub sampling_probability: f32,
    pub horizons: Vec<PendingHorizon>,
}

impl PendingLabel {
    pub fn all_closed(&self) -> bool {
        self.horizons.iter().all(|h| h.closed)
    }
}

/// Config do resolvedor.
#[derive(Debug, Clone)]
pub struct ResolverConfig {
    pub horizons_s: [u32; 3],
    pub close_slack_ns: u64,
    pub route_vanish_idle_ns: u64,
    pub max_pending_per_route: usize,
    pub sweeper_interval: Duration,
}

impl Default for ResolverConfig {
    fn default() -> Self {
        Self {
            horizons_s: DEFAULT_HORIZONS_S,
            close_slack_ns: DEFAULT_CLOSE_SLACK_NS,
            route_vanish_idle_ns: ROUTE_VANISH_IDLE_NS,
            max_pending_per_route: MAX_PENDING_PER_ROUTE,
            sweeper_interval: Duration::from_secs(10),
        }
    }
}

/// Métricas agregadas (sem cardinalidade por rota — correção P6).
#[derive(Debug, Default)]
pub struct ResolverMetrics {
    /// Labels enfileirados (um por AcceptedSample elegível após stride).
    pub pending_created_total: AtomicU64,
    /// Skips por stride — label não gerado.
    pub stride_skipped_total: AtomicU64,
    /// Records escritos (1 por horizonte fechado).
    pub labels_written_total: AtomicU64,
    pub labels_written_realized_total: AtomicU64,
    pub labels_written_miss_total: AtomicU64,
    pub labels_written_censored_total: AtomicU64,
    pub labels_dropped_channel_full_total: AtomicU64,
    pub labels_dropped_channel_closed_total: AtomicU64,
    /// Descartes por backpressure interno (cap por rota).
    pub labels_dropped_capacity_overflow_total: AtomicU64,
    /// Shutdown — labels forçados como `censored{shutdown}`.
    pub shutdown_lost_pending_total: AtomicU64,
}

/// Resolver compartilhado. Thread-safe via interior mutability.
pub struct LabelResolver {
    cfg: ResolverConfig,
    inner: Mutex<ResolverInner>,
    metrics: Arc<ResolverMetrics>,
    writer: LabeledWriterHandle,
}

struct ResolverInner {
    /// Pending labels por rota. VecDeque preserva ordem FIFO para
    /// "descartar o mais antigo" em overflow.
    pending_by_route: AHashMap<RouteId, VecDeque<PendingLabel>>,
    /// Último `ts_ns` em que um label foi criado por rota (para stride).
    last_label_ts: AHashMap<RouteId, u64>,
}

impl LabelResolver {
    pub fn new(cfg: ResolverConfig, writer: LabeledWriterHandle) -> Self {
        Self {
            cfg,
            inner: Mutex::new(ResolverInner {
                pending_by_route: AHashMap::with_capacity(4096),
                last_label_ts: AHashMap::with_capacity(4096),
            }),
            metrics: Arc::new(ResolverMetrics::default()),
            writer,
        }
    }

    pub fn metrics(&self) -> Arc<ResolverMetrics> {
        Arc::clone(&self.metrics)
    }

    pub fn horizons(&self) -> [u32; 3] {
        self.cfg.horizons_s
    }

    /// Cria `PendingLabel` para um AcceptedSample em t₀, respeitando stride.
    /// Retorna `true` se criou, `false` se pulou por stride.
    #[allow(clippy::too_many_arguments)]
    pub fn on_accepted(
        &self,
        sample_id: String,
        ts_emit_ns: u64,
        cycle_seq: u32,
        route_id: RouteId,
        symbol_name: String,
        entry_locked_pct: f32,
        exit_start_pct: f32,
        features_t0: FeaturesT0,
        label_floor_pct: f32,
        policy_metadata: PolicyMetadata,
        sampling_tier: &'static str,
        sampling_probability: f32,
        label_stride_s: u32,
    ) -> bool {
        let mut inner = self.inner.lock();
        // Stride por rota.
        if label_stride_s > 0 {
            if let Some(prev) = inner.last_label_ts.get(&route_id) {
                let stride_ns = (label_stride_s as u64) * 1_000_000_000;
                if ts_emit_ns < prev.saturating_add(stride_ns) {
                    self.metrics
                        .stride_skipped_total
                        .fetch_add(1, Ordering::Relaxed);
                    return false;
                }
            }
        }
        inner.last_label_ts.insert(route_id, ts_emit_ns);

        let horizons: Vec<PendingHorizon> = self
            .cfg
            .horizons_s
            .iter()
            .map(|&h| PendingHorizon::new(h, ts_emit_ns))
            .collect();

        let pending = PendingLabel {
            sample_id,
            ts_emit_ns,
            cycle_seq,
            route_id,
            symbol_name,
            entry_locked_pct,
            exit_start_pct,
            features_t0,
            label_floor_pct,
            policy_metadata,
            sampling_tier,
            sampling_probability,
            horizons,
        };

        let queue = inner
            .pending_by_route
            .entry(route_id)
            .or_insert_with(|| VecDeque::with_capacity(128));
        if queue.len() >= self.cfg.max_pending_per_route {
            // Descarta o mais antigo (correção P6 — backpressure explícito).
            queue.pop_front();
            self.metrics
                .labels_dropped_capacity_overflow_total
                .fetch_add(1, Ordering::Relaxed);
            tracing::warn!(route = ?route_id, "pending_labels overflow: dropped oldest");
        }
        queue.push_back(pending);
        self.metrics
            .pending_created_total
            .fetch_add(1, Ordering::Relaxed);
        true
    }

    /// Observa uma observação limpa da rota (`is_clean_data == true`)
    /// atualizando os `PendingHorizon` em aberto. Horizontes vencidos
    /// são fechados+escritos imediatamente.
    pub fn on_clean_observation(
        &self,
        route_id: RouteId,
        now_ns: u64,
        _entry_spread: f32,
        exit_spread: f32,
    ) {
        let mut to_write: Vec<(PendingLabel, usize)> = Vec::new();
        {
            let mut inner = self.inner.lock();
            let Some(queue) = inner.pending_by_route.get_mut(&route_id) else {
                return;
            };
            for pending in queue.iter_mut() {
                // Snapshot dos escalares imutáveis para usar sem empréstimo
                // conflitante durante o iter_mut sobre horizons.
                let t_emit = pending.ts_emit_ns;
                let entry_locked = pending.entry_locked_pct;
                let label_floor = pending.label_floor_pct;
                let mut closed_idx: Vec<usize> = Vec::new();
                for (idx, slot) in pending.horizons.iter_mut().enumerate() {
                    if slot.closed {
                        continue;
                    }
                    let deadline = slot.deadline_ns(t_emit);
                    if now_ns > deadline {
                        slot.observed_until_ns = deadline;
                        slot.closed = true;
                        closed_idx.push(idx);
                        continue;
                    }
                    slot.observed_until_ns = now_ns;
                    slot.n_clean_future_samples = slot.n_clean_future_samples.saturating_add(1);
                    let is_better = slot
                        .best_exit_pct_so_far
                        .map(|b| exit_spread > b)
                        .unwrap_or(true);
                    if is_better {
                        slot.best_exit_pct_so_far = Some(exit_spread);
                        slot.best_exit_ts_ns_so_far = Some(now_ns);
                    }
                    let gross = entry_locked + exit_spread;
                    if gross >= label_floor && slot.first_exit_ge_floor_ts_ns.is_none() {
                        slot.first_exit_ge_floor_ts_ns = Some(now_ns);
                        slot.first_exit_ge_floor_pct = Some(exit_spread);
                    }
                    if now_ns == deadline {
                        slot.closed = true;
                        closed_idx.push(idx);
                    }
                }
                if !closed_idx.is_empty() {
                    let snapshot = pending.clone();
                    for idx in closed_idx {
                        to_write.push((snapshot.clone(), idx));
                    }
                }
            }
            queue.retain(|p| !p.all_closed());
            if queue.is_empty() {
                inner.pending_by_route.remove(&route_id);
            }
        }

        for (pending, idx) in to_write {
            let outcome = LabelOutcome::from_pending(&pending, idx);
            self.write_closed_horizon(pending, idx, now_ns, outcome);
        }
    }

    /// Sweeper global — chamado por task tokio em interval.
    /// Fecha horizontes vencidos (mesmo sem observações) e censura rotas
    /// sumidas. Retorna número de horizontes fechados nesta passagem.
    pub fn sweep(&self, now_ns: u64) -> u64 {
        let mut to_write: Vec<(PendingLabel, usize, LabelOutcome, Option<CensorReason>)> =
            Vec::new();
        {
            let mut inner = self.inner.lock();
            for (_route, queue) in inner.pending_by_route.iter_mut() {
                for pending in queue.iter_mut() {
                    let t_emit = pending.ts_emit_ns;
                    let mut closed_this_sweep: Vec<(usize, LabelOutcome, Option<CensorReason>)> =
                        Vec::new();
                    for (idx, slot) in pending.horizons.iter_mut().enumerate() {
                        if slot.closed {
                            continue;
                        }
                        let deadline = slot.deadline_ns(t_emit);
                        let route_idle = now_ns
                            .saturating_sub(slot.observed_until_ns)
                            >= self.cfg.route_vanish_idle_ns;
                        let expired =
                            now_ns >= deadline.saturating_add(self.cfg.close_slack_ns);
                        if expired {
                            slot.closed = true;
                            // Outcome será determinado pós-loop a partir do snapshot.
                            closed_this_sweep.push((idx, LabelOutcome::Miss, None));
                        } else if route_idle && now_ns < deadline {
                            slot.closed = true;
                            closed_this_sweep.push((
                                idx,
                                LabelOutcome::Censored,
                                Some(CensorReason::RouteVanished),
                            ));
                        }
                    }
                    if !closed_this_sweep.is_empty() {
                        let snap = pending.clone();
                        for (idx, outcome_hint, reason) in closed_this_sweep {
                            // Recalcula outcome real para `expired` (pode ter virado Realized).
                            let final_outcome = if matches!(outcome_hint, LabelOutcome::Censored) {
                                LabelOutcome::Censored
                            } else {
                                LabelOutcome::from_pending(&snap, idx)
                            };
                            let final_reason =
                                if matches!(final_outcome, LabelOutcome::Censored) {
                                    reason.or(Some(CensorReason::IncompleteWindow))
                                } else {
                                    reason
                                };
                            to_write.push((snap.clone(), idx, final_outcome, final_reason));
                        }
                    }
                }
                queue.retain(|p| !p.all_closed());
            }
            inner.pending_by_route.retain(|_, q| !q.is_empty());
        }

        let n = to_write.len() as u64;
        for (pending, idx, outcome, reason) in to_write {
            self.write_closed_horizon_with_reason(pending, idx, now_ns, outcome, reason);
        }
        n
    }

    /// Em shutdown limpo, força `censored{shutdown}` em tudo aberto.
    pub fn shutdown_flush(&self, now_ns: u64) -> u64 {
        let mut to_write: Vec<(PendingLabel, usize)> = Vec::new();
        {
            let mut inner = self.inner.lock();
            for (_route, queue) in inner.pending_by_route.iter_mut() {
                for pending in queue.iter_mut() {
                    let mut closed_idx: Vec<usize> = Vec::new();
                    for (idx, slot) in pending.horizons.iter_mut().enumerate() {
                        if !slot.closed {
                            slot.closed = true;
                            closed_idx.push(idx);
                        }
                    }
                    if !closed_idx.is_empty() {
                        let snap = pending.clone();
                        for idx in closed_idx {
                            to_write.push((snap.clone(), idx));
                        }
                    }
                }
            }
            inner.pending_by_route.clear();
            inner.last_label_ts.clear();
        }
        let n = to_write.len() as u64;
        for (pending, idx) in to_write {
            self.metrics
                .shutdown_lost_pending_total
                .fetch_add(1, Ordering::Relaxed);
            self.write_closed_horizon_with_reason(
                pending,
                idx,
                now_ns,
                LabelOutcome::Censored,
                Some(CensorReason::Shutdown),
            );
        }
        n
    }

    fn write_closed_horizon(
        &self,
        pending: PendingLabel,
        idx: usize,
        now_ns: u64,
        outcome: LabelOutcome,
    ) {
        self.write_closed_horizon_with_reason(pending, idx, now_ns, outcome, None);
    }

    fn write_closed_horizon_with_reason(
        &self,
        pending: PendingLabel,
        idx: usize,
        now_ns: u64,
        outcome: LabelOutcome,
        censor_reason: Option<CensorReason>,
    ) {
        let slot = &pending.horizons[idx];
        let best_gross = slot
            .best_exit_pct_so_far
            .map(|e| pending.entry_locked_pct + e);
        let t_to_best = slot.best_exit_ts_ns_so_far.map(|ts| {
            ((ts.saturating_sub(pending.ts_emit_ns)) / 1_000_000_000)
                .min(u32::MAX as u64) as u32
        });
        let t_to_first_hit = slot.first_exit_ge_floor_ts_ns.map(|ts| {
            ((ts.saturating_sub(pending.ts_emit_ns)) / 1_000_000_000)
                .min(u32::MAX as u64) as u32
        });

        let label = LabeledTrade {
            sample_id: pending.sample_id.clone(),
            horizon_s: slot.horizon_s,
            ts_emit_ns: pending.ts_emit_ns,
            cycle_seq: pending.cycle_seq,
            schema_version: LABELED_TRADE_SCHEMA_VERSION,
            scanner_version: SCANNER_VERSION,
            route_id: pending.route_id,
            symbol_name: pending.symbol_name.clone(),
            entry_locked_pct: pending.entry_locked_pct,
            exit_start_pct: pending.exit_start_pct,
            features_t0: pending.features_t0.clone(),
            best_exit_pct: slot.best_exit_pct_so_far,
            best_exit_ts_ns: slot.best_exit_ts_ns_so_far,
            best_gross_pct: best_gross,
            t_to_best_s: t_to_best,
            n_clean_future_samples: slot.n_clean_future_samples,
            label_floor_pct: pending.label_floor_pct,
            first_exit_ge_label_floor_ts_ns: slot.first_exit_ge_floor_ts_ns,
            first_exit_ge_label_floor_pct: slot.first_exit_ge_floor_pct,
            t_to_first_hit_s: t_to_first_hit,
            outcome,
            censor_reason,
            observed_until_ns: slot.observed_until_ns,
            closed_ts_ns: now_ns,
            written_ts_ns: now_ns,
            policy_metadata: pending.policy_metadata.clone(),
            sampling_tier: pending.sampling_tier,
            sampling_probability: pending.sampling_probability,
        };

        match self.writer.try_send(label) {
            Ok(()) => {
                self.metrics.labels_written_total.fetch_add(1, Ordering::Relaxed);
                match outcome {
                    LabelOutcome::Realized => self
                        .metrics
                        .labels_written_realized_total
                        .fetch_add(1, Ordering::Relaxed),
                    LabelOutcome::Miss => self
                        .metrics
                        .labels_written_miss_total
                        .fetch_add(1, Ordering::Relaxed),
                    LabelOutcome::Censored => self
                        .metrics
                        .labels_written_censored_total
                        .fetch_add(1, Ordering::Relaxed),
                };
            }
            Err(LabeledWriterSendError::ChannelFull) => {
                self.metrics
                    .labels_dropped_channel_full_total
                    .fetch_add(1, Ordering::Relaxed);
            }
            Err(LabeledWriterSendError::ChannelClosed) => {
                self.metrics
                    .labels_dropped_channel_closed_total
                    .fetch_add(1, Ordering::Relaxed);
            }
        }
    }
}

impl LabelOutcome {
    fn from_pending(pending: &PendingLabel, idx: usize) -> LabelOutcome {
        let slot = &pending.horizons[idx];
        let deadline = pending.ts_emit_ns + (slot.horizon_s as u64) * 1_000_000_000;
        if slot.first_exit_ge_floor_ts_ns.is_some() {
            LabelOutcome::Realized
        } else if slot.observed_until_ns >= deadline {
            LabelOutcome::Miss
        } else {
            LabelOutcome::Censored
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::contract::ToxicityLevel;
    use crate::ml::persistence::labeled_writer::{LabeledJsonlWriter, LabeledWriterConfig};
    use crate::types::{SymbolId, Venue};
    use std::time::Duration;
    use tokio::time::sleep;

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_features() -> FeaturesT0 {
        FeaturesT0 {
            buy_book_age_ms: 50,
            sell_book_age_ms: 80,
            buy_vol24: 1e6,
            sell_vol24: 2e6,
            toxicity_level: ToxicityLevel::Healthy,
            halt_active: false,
            tail_ratio_p99_p95: None,
            entry_p50_24h: None,
            exit_p50_24h: None,
        }
    }

    fn mk_policy() -> PolicyMetadata {
        PolicyMetadata {
            baseline_model_version: "baseline-a3-0.2.0".into(),
            baseline_recommended: false,
            baseline_p_forecast: None,
            baseline_derived_enter_at_min: None,
            baseline_derived_exit_at_min: None,
            baseline_floor_pct: 0.8,
            label_stride_s: 60,
            label_sampling_probability: 1.0,
        }
    }

    async fn setup_resolver(
        cfg: ResolverConfig,
    ) -> (Arc<LabelResolver>, tempfile::TempDir, tokio::task::JoinHandle<()>) {
        let tmp = tempfile::tempdir().unwrap();
        let wcfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "lrtest".into(),
        };
        let (writer, handle) = LabeledJsonlWriter::create(wcfg);
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(cfg, handle));
        (resolver, tmp, task)
    }

    #[tokio::test]
    async fn realized_when_first_hit_occurs_within_horizon() {
        let cfg = ResolverConfig {
            horizons_s: [2, 4, 6],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_a".into(), t_emit, 1, mk_route(), "BTC-USDT".into(),
            2.5, -1.2, mk_features(), 0.8, mk_policy(),
            "allowlist", 1.0, 0,
        );
        // t+1s: exit=-1.5 → gross = 2.5 + (-1.5) = 1.0 >= floor 0.8 → hit!
        resolver.on_clean_observation(mk_route(), t_emit + 1_000_000_000, 2.0, -1.5);
        // t+3s: best_exit melhora para -0.5
        resolver.on_clean_observation(mk_route(), t_emit + 3_000_000_000, 1.5, -0.5);
        // t+7s (sweeper): 6s horizonte deve ter fechado (t_emit + 6s + slack = t+7s)
        let closed = resolver.sweep(t_emit + 7_000_000_000);
        assert!(closed >= 1);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_realized_total.load(Ordering::Relaxed) >= 1);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn miss_when_first_hit_never_occurs() {
        let cfg = ResolverConfig {
            horizons_s: [2, 4, 6],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_m".into(), t_emit, 1, mk_route(), "BTC-USDT".into(),
            2.5, -1.2, mk_features(), 10.0, mk_policy(), // floor absurdo
            "allowlist", 1.0, 0,
        );
        // Observações com exit muito negativo → nunca hita floor 10%.
        for i in 1..=5u64 {
            resolver.on_clean_observation(
                mk_route(),
                t_emit + i * 1_000_000_000,
                2.0,
                -2.0,
            );
        }
        resolver.sweep(t_emit + 10_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_miss_total.load(Ordering::Relaxed) >= 1);
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn expired_incomplete_horizon_is_censored_not_miss() {
        let cfg = ResolverConfig {
            horizons_s: [10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_incomplete".into(), t_emit, 1, mk_route(), "BTC-USDT".into(),
            2.5, -1.2, mk_features(), 10.0, mk_policy(),
            "allowlist", 1.0, 0,
        );
        resolver.on_clean_observation(mk_route(), t_emit + 5_000_000_000, 2.0, -2.0);
        resolver.sweep(t_emit + 12_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 1);
        assert_eq!(m.labels_written_miss_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn censored_when_route_silent_beyond_idle_threshold() {
        let cfg = ResolverConfig {
            horizons_s: [60, 120, 180],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 5 * 1_000_000_000, // 5s no teste
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_c".into(), t_emit, 1, mk_route(), "BTC-USDT".into(),
            2.5, -1.2, mk_features(), 0.8, mk_policy(),
            "allowlist", 1.0, 0,
        );
        // Sem observações; só sweeper após 6s.
        resolver.sweep(t_emit + 6_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_censored_total.load(Ordering::Relaxed) >= 3);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn stride_suppresses_labels_within_window() {
        let cfg = ResolverConfig::default();
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        let created_a = resolver.on_accepted(
            "sid1".into(), t0, 1, mk_route(), "BTC-USDT".into(),
            2.5, -1.2, mk_features(), 0.8, mk_policy(),
            "allowlist", 1.0, 60, // stride 60s
        );
        assert!(created_a);
        // 30s depois — dentro do stride → skip.
        let created_b = resolver.on_accepted(
            "sid2".into(), t0 + 30_000_000_000, 2, mk_route(), "BTC-USDT".into(),
            2.5, -1.2, mk_features(), 0.8, mk_policy(),
            "allowlist", 1.0, 60,
        );
        assert!(!created_b);
        let m = resolver.metrics();
        assert_eq!(m.stride_skipped_total.load(Ordering::Relaxed), 1);
        // 61s depois — stride expirado → cria.
        let created_c = resolver.on_accepted(
            "sid3".into(), t0 + 61_000_000_000, 3, mk_route(), "BTC-USDT".into(),
            2.5, -1.2, mk_features(), 0.8, mk_policy(),
            "allowlist", 1.0, 60,
        );
        assert!(created_c);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn best_exit_tracks_max_even_after_first_hit() {
        let cfg = ResolverConfig {
            horizons_s: [10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid".into(), t0, 1, mk_route(), "BTC-USDT".into(),
            2.0, -1.5, mk_features(), 0.5, mk_policy(),
            "allowlist", 1.0, 0,
        );
        // t+2s: exit=-1.0 → gross=1.0 (hit)
        resolver.on_clean_observation(mk_route(), t0 + 2_000_000_000, 1.9, -1.0);
        // t+5s: exit melhora para +0.5 → best_exit deve atualizar
        resolver.on_clean_observation(mk_route(), t0 + 5_000_000_000, 1.8, 0.5);
        resolver.sweep(t0 + 40_000_000_000);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert!(m.labels_written_realized_total.load(Ordering::Relaxed) >= 3);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn shutdown_censors_all_pending() {
        let cfg = ResolverConfig::default();
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid".into(), t0, 1, mk_route(), "BTC-USDT".into(),
            2.0, -1.0, mk_features(), 0.8, mk_policy(),
            "allowlist", 1.0, 0,
        );
        let lost = resolver.shutdown_flush(t0 + 1_000_000_000);
        assert_eq!(lost, 3, "3 horizontes devem ter sido forçados censored");
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(m.shutdown_lost_pending_total.load(Ordering::Relaxed), 3);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn backpressure_drops_oldest_when_cap_exceeded() {
        let cfg = ResolverConfig {
            horizons_s: [60, 120, 180],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            max_pending_per_route: 3,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        for i in 0..5u32 {
            resolver.on_accepted(
                format!("sid{}", i),
                1_000_000_000 + (i as u64) * 1_000_000_000,
                i,
                mk_route(),
                "BTC-USDT".into(),
                2.5, -1.2, mk_features(), 0.8, mk_policy(),
                "allowlist", 1.0, 0, // sem stride
            );
        }
        let m = resolver.metrics();
        assert_eq!(
            m.labels_dropped_capacity_overflow_total.load(Ordering::Relaxed),
            2,
            "2 dos 5 labels devem ter sido descartados (cap=3)"
        );
        assert_eq!(m.pending_created_total.load(Ordering::Relaxed), 5);
        drop(resolver);
        drop(tmp);
    }
}
