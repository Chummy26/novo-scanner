//! Resolver de `LabeledTrade` com horizontes independentes (Opção B).
//!
//! Cada candidate limpo elegível pelo stride gera um `PendingLabel`
//! contendo um `PendingHorizon` por horizonte configurado. Cada slot é
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
//! Em SIGTERM limpo, pendings abertos são fechados preservando outcomes já
//! determinados; apenas janelas incompletas viram `censored { shutdown }`.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use ahash::AHashMap;
use parking_lot::Mutex;

use crate::ml::contract::RouteId;
use crate::ml::persistence::labeled_trade::{
    CensorReason, FeaturesT0, FloorHitLabel, LabelOutcome, LabeledTrade, PolicyMetadata,
    LABELED_TRADE_SCHEMA_VERSION,
};
use crate::ml::persistence::labeled_writer::{LabeledWriterHandle, LabeledWriterSendError};
use crate::ml::persistence::raw_sample::sampling_probability_kind_for_tier_label;
use crate::ml::SCANNER_VERSION;

/// Padrões de horizonte (s) — fix A7.
///
/// Grid log-uniforme cobrindo lacuna 2h→8h. CLAUDE.md cita `T~2h15` como
/// exemplo típico; rotas com `gross_run_p95` em 1–4h sem este grid ficavam
/// sempre `Miss@2h` e `Realized@8h`, quantizando `T` em 4 pontos. Chen 2024
/// (arXiv:2410.01086) §4 recomenda grid log-uniforme para fill-time.
pub const DEFAULT_HORIZONS_S: [u32; 6] = [900, 1800, 3600, 7200, 14400, 28800];

/// Floors brutos padrao para estimar P(exit atinge floor | estado, floor).
/// `0.8` permanece como floor primario de compatibilidade.
pub const DEFAULT_LABEL_FLOORS_PCT: [f32; 6] = [0.3, 0.5, 0.8, 1.2, 2.0, 3.0];

/// Slack após `t_emit + h` antes de fechar o horizonte.
///
/// Default 120s — observações em rotas longtail legítimas podem chegar com
/// cadência >30s; o slack original de 30s descartava silenciosamente Hits
/// tardios e enviesava `P` para baixo. Valor adaptativo `max(120s, 2 ×
/// p99_inter_evento_rota)` seria ideal em produção; aqui configuramos um
/// piso mais conservador. Para regimes muito esparsos, caller deve injetar
/// via `ResolverConfig::close_slack_ns`.
pub const DEFAULT_CLOSE_SLACK_NS: u64 = 120 * 1_000_000_000; // 120 s

/// Tempo após último `observed_until_ns` que caracteriza rota sumida.
///
/// Antes 5min — menor que o horizonte mínimo de 15min, causando
/// `Censored{RouteVanished}` falso em rotas ilíquidas cuja cadência
/// inter-evento legítima supera 5min (skill/CLAUDE.md: regime longtail 0.3–4%
/// tem cadência esparsa). Novo default 30min; operador que queira detectar
/// delisting rápido parametriza via `ResolverConfig::route_vanish_idle_ns`.
/// Arroyo et al. 2023 arXiv:2306.05479 §3 discute informative censoring
/// em LOB — o pressuposto Kaplan-Meier de independência entre mecanismo
/// de censura e evento exige separar ilíquidez transitória de delisting.
pub const ROUTE_VANISH_IDLE_NS: u64 = 30 * 60 * 1_000_000_000; // 30 min

/// Limite superior de idle antes de classificar rota como delistada.
///
/// Entre `ROUTE_VANISH_IDLE_NS` e este threshold → `RouteDormant`.
/// Acima → `RouteDelisted`. Permite distinguir ilíquidez transitória de
/// eventos estruturais (halt, delisting, ticker rename).
pub const ROUTE_DELISTED_IDLE_NS: u64 = 60 * 60 * 1_000_000_000; // 1 h

/// Limite de pending labels por rota antes de ajustar stride (fix A5/C6).
///
/// Mantém cap original de 10_000 por compat; a política foi invertida para
/// evitar enviesar contra regime atual em rotas quentes — agora incoming é
/// aceito e novos candidates aplicam stride adaptativo via
/// `LabelResolver::on_candidate`.
pub const MAX_PENDING_PER_ROUTE: usize = 10_000;

/// Stride base global para `on_candidate`.
pub const LABEL_STRIDE_BASE_S: u32 = 60;

/// Eventos independentes alvo por horizonte; controla stride efetivo.
pub const N_EVENTS_TARGET_PER_HORIZON: u32 = 10;

#[derive(Debug, Clone)]
pub struct PendingFloorHit {
    pub floor_pct: f32,
    pub first_exit_ge_floor_ts_ns: Option<u64>,
    pub first_exit_ge_floor_pct: Option<f32>,
}

#[derive(Debug, Clone)]
pub struct PendingHorizon {
    pub horizon_s: u32,
    pub best_exit_pct_so_far: Option<f32>,
    pub best_exit_ts_ns_so_far: Option<u64>,
    pub first_exit_ge_floor_ts_ns: Option<u64>,
    pub first_exit_ge_floor_pct: Option<f32>,
    pub floor_hits: Vec<PendingFloorHit>,
    pub observed_until_ns: u64,
    pub n_clean_future_samples: u32,
    pub closed: bool,
}

impl PendingHorizon {
    fn new(horizon_s: u32, t_emit_ns: u64, floors_pct: &[f32]) -> Self {
        Self {
            horizon_s,
            best_exit_pct_so_far: None,
            best_exit_ts_ns_so_far: None,
            first_exit_ge_floor_ts_ns: None,
            first_exit_ge_floor_pct: None,
            floor_hits: floors_pct
                .iter()
                .map(|&floor_pct| PendingFloorHit {
                    floor_pct,
                    first_exit_ge_floor_ts_ns: None,
                    first_exit_ge_floor_pct: None,
                })
                .collect(),
            observed_until_ns: t_emit_ns,
            n_clean_future_samples: 0,
            closed: false,
        }
    }
}

/// Metadados congelados em t₀ — não mudam ao longo da vida do pending.
///
/// Fix C3 + C13 + C2: v6 carrega cluster_id, runtime_config_hash,
/// priority_set_generation_id para persistir em cada record fechado.
#[derive(Debug, Clone)]
pub struct PendingLabel {
    pub sample_id: String,
    pub sample_decision: &'static str,
    pub ts_emit_ns: u64,
    pub cycle_seq: u32,
    pub route_id: RouteId,
    pub symbol_name: String,
    pub entry_locked_pct: f32,
    pub exit_start_pct: f32,
    pub features_t0: FeaturesT0,
    pub label_floor_pct: f32,
    pub label_floors_pct: Vec<f32>,
    pub policy_metadata: PolicyMetadata,
    pub sampling_tier: &'static str,
    pub sampling_probability: f32,
    pub horizons: Vec<PendingHorizon>,
    // Fix C3
    pub cluster_id: String,
    pub cluster_size: u32,
    pub cluster_rank: u32,
    // Fix C13
    pub runtime_config_hash: String,
    // Fix C2
    pub priority_set_generation_id: u32,
    pub priority_set_updated_at_ns: u64,
}

impl PendingLabel {
    pub fn all_closed(&self) -> bool {
        self.horizons.iter().all(|h| h.closed)
    }
}

/// Config do resolvedor.
#[derive(Debug, Clone)]
pub struct ResolverConfig {
    pub horizons_s: Vec<u32>,
    pub close_slack_ns: u64,
    pub route_vanish_idle_ns: u64,
    /// threshold acima do qual `RouteDormant` vira `RouteDelisted`.
    pub route_delisted_idle_ns: u64,
    pub max_pending_per_route: usize,
    pub sweeper_interval: Duration,
}

impl Default for ResolverConfig {
    fn default() -> Self {
        Self {
            horizons_s: DEFAULT_HORIZONS_S.to_vec(),
            close_slack_ns: DEFAULT_CLOSE_SLACK_NS,
            route_vanish_idle_ns: ROUTE_VANISH_IDLE_NS,
            route_delisted_idle_ns: ROUTE_DELISTED_IDLE_NS,
            max_pending_per_route: MAX_PENDING_PER_ROUTE,
            sweeper_interval: Duration::from_secs(10),
        }
    }
}

/// Stride efetivo por horizonte.
///
/// Fórmula: `stride = max(base, horizon_s / n_events_target)`. Para h=28800
/// (8h) com N=10: stride=2880s, muito acima dos 60s globais. Isso reduz o
/// overlap massivo entre labels de longo horizonte que inflavam calibração
/// de `P@8h` em ordens de magnitude.
#[inline]
pub fn effective_stride_for_horizon(base_s: u32, horizon_s: u32, n_events_target: u32) -> u32 {
    if n_events_target == 0 {
        return base_s;
    }
    let proposed = horizon_s / n_events_target;
    base_s.max(proposed)
}

/// Métricas agregadas (sem cardinalidade por rota — correção P6).
#[derive(Debug, Default)]
pub struct ResolverMetrics {
    /// Labels enfileirados (um por candidate limpo com ao menos um horizonte
    /// elegível após stride).
    pub pending_created_total: AtomicU64,
    /// Skips por stride — nenhum horizonte elegível no candidate.
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

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct ShutdownFlushStats {
    pub closed_total: u64,
    pub sent_total: u64,
    pub censored_total: u64,
    pub dropped_channel_closed_total: u64,
}

/// Resolver compartilhado. Thread-safe via interior mutability.
pub struct LabelResolver {
    cfg: ResolverConfig,
    inner: Mutex<ResolverInner>,
    metrics: Arc<ResolverMetrics>,
    writer: LabeledWriterHandle,
}

struct ResolverInner {
    /// Pending labels por rota. Em overflow, labels antigos podem ser
    /// descartados para preservar representatividade do regime atual.
    pending_by_route: AHashMap<RouteId, VecDeque<PendingLabel>>,
    /// Último `ts_ns` em que um label foi criado por `(rota, horizonte)`.
    /// Stride por horizonte evita sobreposição extrema em horizontes longos.
    last_label_ts_by_horizon: AHashMap<(RouteId, u32), u64>,
}

impl LabelResolver {
    pub fn new(cfg: ResolverConfig, writer: LabeledWriterHandle) -> Self {
        Self {
            cfg,
            inner: Mutex::new(ResolverInner {
                pending_by_route: AHashMap::with_capacity(4096),
                last_label_ts_by_horizon: AHashMap::with_capacity(4096),
            }),
            metrics: Arc::new(ResolverMetrics::default()),
            writer,
        }
    }

    pub fn metrics(&self) -> Arc<ResolverMetrics> {
        Arc::clone(&self.metrics)
    }

    pub fn horizons(&self) -> &[u32] {
        &self.cfg.horizons_s
    }

    /// Helper de teste: atalho para `on_candidate` com defaults Accept.
    /// Não exposto em produção — callers reais usam `on_candidate` direto.
    #[cfg(test)]
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn on_accepted(
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
        self.on_candidate(
            sample_id,
            "accept",
            ts_emit_ns,
            cycle_seq,
            route_id,
            symbol_name,
            entry_locked_pct,
            exit_start_pct,
            features_t0,
            label_floor_pct,
            vec![label_floor_pct],
            policy_metadata,
            sampling_tier,
            sampling_probability,
            label_stride_s,
            derive_cluster_id(route_id, ts_emit_ns),
            1,
            1,
            "0000000000000000".to_string(),
            0,
            0,
        )
    }

    /// Cria `PendingLabel` para um candidate limpo em t0, respeitando stride.
    /// Retorna `true` se criou, `false` se pulou por stride.
    #[allow(clippy::too_many_arguments)]
    pub fn on_candidate(
        &self,
        sample_id: String,
        sample_decision: &'static str,
        ts_emit_ns: u64,
        cycle_seq: u32,
        route_id: RouteId,
        symbol_name: String,
        entry_locked_pct: f32,
        exit_start_pct: f32,
        features_t0: FeaturesT0,
        label_floor_pct: f32,
        label_floors_pct: Vec<f32>,
        policy_metadata: PolicyMetadata,
        sampling_tier: &'static str,
        sampling_probability: f32,
        label_stride_s: u32,
        cluster_id: String,
        cluster_size: u32,
        cluster_rank: u32,
        runtime_config_hash: String,
        priority_set_generation_id: u32,
        priority_set_updated_at_ns: u64,
    ) -> bool {
        let floors = normalized_floors(label_floor_pct, label_floors_pct);
        let mut inner = self.inner.lock();

        let mut horizons = Vec::with_capacity(self.cfg.horizons_s.len());
        for &horizon_s in &self.cfg.horizons_s {
            if label_stride_s > 0 {
                let effective_stride_s = effective_stride_for_horizon(
                    label_stride_s,
                    horizon_s,
                    N_EVENTS_TARGET_PER_HORIZON,
                );
                let stride_ns = (effective_stride_s as u64) * 1_000_000_000;
                let key = (route_id, horizon_s);
                if let Some(prev) = inner.last_label_ts_by_horizon.get(&key) {
                    if ts_emit_ns < prev.saturating_add(stride_ns) {
                        continue;
                    }
                }
                inner.last_label_ts_by_horizon.insert(key, ts_emit_ns);
            }
            horizons.push(PendingHorizon::new(horizon_s, ts_emit_ns, &floors));
        }

        if horizons.is_empty() {
            self.metrics
                .stride_skipped_total
                .fetch_add(1, Ordering::Relaxed);
            return false;
        }

        let pending = PendingLabel {
            sample_id,
            sample_decision,
            ts_emit_ns,
            cycle_seq,
            route_id,
            symbol_name,
            entry_locked_pct,
            exit_start_pct,
            features_t0,
            label_floor_pct,
            label_floors_pct: floors,
            policy_metadata,
            sampling_tier,
            sampling_probability,
            horizons,
            cluster_id,
            cluster_size,
            cluster_rank,
            runtime_config_hash,
            priority_set_generation_id,
            priority_set_updated_at_ns,
        };

        let queue = inner
            .pending_by_route
            .entry(route_id)
            .or_insert_with(|| VecDeque::with_capacity(128));
        if queue.len() >= self.cfg.max_pending_per_route {
            // política invertida — drop oldest em vez de reject novo.
            // Regime atual é mais relevante para calibração em t0 do que
            // labels antigos já próximos de resolver. Contador mantido com
            // o mesmo nome por compat de dashboards, mas semântica é
            // "labels antigos dropados para preservar representatividade".
            queue.pop_front();
            self.metrics
                .labels_dropped_capacity_overflow_total
                .fetch_add(1, Ordering::Relaxed);
            tracing::warn!(
                route = ?route_id,
                "pending_labels overflow: dropped oldest (regime atual preservado)"
            );
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
                    let deadline = t_emit + (slot.horizon_s as u64) * 1_000_000_000;
                    // ramo `now_ns == deadline` era código morto (u64
                    // nanos, igualdade exata tem probabilidade ~0). Consolidado
                    // em `>=` — fecha na primeira observação pós-deadline.
                    if now_ns >= deadline {
                        // Observação pós-deadline apenas comprova que a janela foi
                        // observada até o horizonte. Ela NÃO pode criar first-hit:
                        // o label é falsificável só dentro de [t0, t0+h].
                        slot.observed_until_ns = deadline;
                        if now_ns == deadline {
                            let gross = entry_locked + exit_spread;
                            if gross >= label_floor && slot.first_exit_ge_floor_ts_ns.is_none() {
                                slot.first_exit_ge_floor_ts_ns = Some(now_ns);
                                slot.first_exit_ge_floor_pct = Some(exit_spread);
                            }
                            for hit in slot.floor_hits.iter_mut() {
                                if gross >= hit.floor_pct && hit.first_exit_ge_floor_ts_ns.is_none()
                                {
                                    hit.first_exit_ge_floor_ts_ns = Some(now_ns);
                                    hit.first_exit_ge_floor_pct = Some(exit_spread);
                                }
                            }
                        }
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
                    for hit in slot.floor_hits.iter_mut() {
                        if gross >= hit.floor_pct && hit.first_exit_ge_floor_ts_ns.is_none() {
                            hit.first_exit_ge_floor_ts_ns = Some(now_ns);
                            hit.first_exit_ge_floor_pct = Some(exit_spread);
                        }
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
            self.write_closed_horizon_with_reason(pending, idx, now_ns, outcome, None);
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
                        let deadline = t_emit + (slot.horizon_s as u64) * 1_000_000_000;
                        let idle_for = now_ns.saturating_sub(slot.observed_until_ns);
                        // distingue Dormant (ilíquidez transitória) de
                        // Delisted (evento estrutural). Kaplan-Meier exige essa
                        // separação para preservar independência de censura.
                        let dormant = idle_for >= self.cfg.route_vanish_idle_ns;
                        let delisted = idle_for >= self.cfg.route_delisted_idle_ns;
                        let expired = now_ns >= deadline.saturating_add(self.cfg.close_slack_ns);
                        if expired {
                            slot.closed = true;
                            // Outcome será determinado pós-loop a partir do snapshot.
                            closed_this_sweep.push((idx, LabelOutcome::Miss, None));
                        } else if dormant && now_ns < deadline {
                            slot.closed = true;
                            let reason = if delisted {
                                CensorReason::RouteDelisted
                            } else {
                                CensorReason::RouteDormant
                            };
                            closed_this_sweep.push((idx, LabelOutcome::Censored, Some(reason)));
                        }
                    }
                    if !closed_this_sweep.is_empty() {
                        let snap = pending.clone();
                        for (idx, _outcome_hint, reason) in closed_this_sweep {
                            // Hit dentro da janela vence qualquer fechamento
                            // posterior por sweep. Forcar Censored aqui
                            // sobrescrevia realizacoes ja observadas quando
                            // a rota ficava dormente antes do deadline.
                            let final_outcome = LabelOutcome::from_pending(&snap, idx);
                            // `IncompleteWindow` removido. Se outcome é
                            // Censored sem reason específico (caminho
                            // teoricamente inalcançável dado o gate acima),
                            // usa `RouteDormant` como fallback conservador.
                            let final_reason = if matches!(final_outcome, LabelOutcome::Censored) {
                                reason.or(Some(CensorReason::RouteDormant))
                            } else {
                                None
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

    /// Em shutdown limpo, fecha pendings abertos preservando o outcome real.
    ///
    /// versão anterior forçava `Censored{Shutdown}`
    /// em todos os horizontes abertos, sobrescrevendo labels que já tinham
    /// `first_exit_ge_floor_ts_ns.is_some()` (Realized) ou que já haviam
    /// passado do deadline sem hit (Miss). Isso subestimava `P_hit` empírico
    /// no dataset supervisionado. A lógica correta é a mesma do `sweep`:
    /// chamar `LabelOutcome::from_pending()` e só atribuir `Shutdown` quando
    /// o outcome for de fato `Censored` (incomplete window).
    pub async fn shutdown_flush(&self, now_ns: u64) -> ShutdownFlushStats {
        let mut to_write: Vec<(PendingLabel, usize, LabelOutcome, Option<CensorReason>)> =
            Vec::new();
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
                            let outcome = LabelOutcome::from_pending(&snap, idx);
                            let reason = match outcome {
                                LabelOutcome::Censored => Some(CensorReason::Shutdown),
                                _ => None,
                            };
                            to_write.push((snap.clone(), idx, outcome, reason));
                        }
                    }
                }
            }
            inner.pending_by_route.clear();
            inner.last_label_ts_by_horizon.clear();
        }
        let mut stats = ShutdownFlushStats {
            closed_total: to_write.len() as u64,
            ..ShutdownFlushStats::default()
        };
        for (pending, idx, outcome, reason) in to_write {
            // Métrica conta apenas labels realmente "perdidos" — Realized e
            // Miss são outcomes válidos, não perdas.
            if matches!(outcome, LabelOutcome::Censored) {
                stats.censored_total = stats.censored_total.saturating_add(1);
                self.metrics
                    .shutdown_lost_pending_total
                    .fetch_add(1, Ordering::Relaxed);
            }
            let label = self.build_closed_horizon_label(pending, idx, now_ns, outcome, reason);
            match self.writer.send(label).await {
                Ok(()) => {
                    stats.sent_total = stats.sent_total.saturating_add(1);
                    self.bump_written_metrics(outcome);
                }
                Err(LabeledWriterSendError::ChannelClosed) => {
                    stats.dropped_channel_closed_total =
                        stats.dropped_channel_closed_total.saturating_add(1);
                    self.metrics
                        .labels_dropped_channel_closed_total
                        .fetch_add(1, Ordering::Relaxed);
                }
                Err(LabeledWriterSendError::ChannelFull) => {
                    // `send().await` nunca retorna Full; mantenha o braço
                    // defensivo caso o handle mude no futuro.
                    self.metrics
                        .labels_dropped_channel_full_total
                        .fetch_add(1, Ordering::Relaxed);
                }
            }
        }
        stats
    }

    fn write_closed_horizon_with_reason(
        &self,
        pending: PendingLabel,
        idx: usize,
        now_ns: u64,
        outcome: LabelOutcome,
        censor_reason: Option<CensorReason>,
    ) {
        let label = self.build_closed_horizon_label(pending, idx, now_ns, outcome, censor_reason);
        match self.writer.try_send(label) {
            Ok(()) => {
                self.bump_written_metrics(outcome);
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

    fn build_closed_horizon_label(
        &self,
        pending: PendingLabel,
        idx: usize,
        now_ns: u64,
        outcome: LabelOutcome,
        censor_reason: Option<CensorReason>,
    ) -> LabeledTrade {
        let slot = &pending.horizons[idx];
        let best_gross = slot
            .best_exit_pct_so_far
            .map(|e| pending.entry_locked_pct + e);
        let t_to_best = slot.best_exit_ts_ns_so_far.map(|ts| {
            ((ts.saturating_sub(pending.ts_emit_ns)) / 1_000_000_000).min(u32::MAX as u64) as u32
        });
        let t_to_first_hit = slot.first_exit_ge_floor_ts_ns.map(|ts| {
            ((ts.saturating_sub(pending.ts_emit_ns)) / 1_000_000_000).min(u32::MAX as u64) as u32
        });
        let label_floor_hits = slot
            .floor_hits
            .iter()
            .map(|hit| {
                let t_to_first_hit_s = hit.first_exit_ge_floor_ts_ns.map(|ts| {
                    ((ts.saturating_sub(pending.ts_emit_ns)) / 1_000_000_000).min(u32::MAX as u64)
                        as u32
                });
                FloorHitLabel {
                    floor_pct: hit.floor_pct,
                    first_exit_ge_floor_ts_ns: hit.first_exit_ge_floor_ts_ns,
                    first_exit_ge_floor_pct: hit.first_exit_ge_floor_pct,
                    t_to_first_hit_s,
                    realized: hit.first_exit_ge_floor_ts_ns.is_some(),
                }
            })
            .collect();

        let mut policy = pending.policy_metadata.clone();
        policy.effective_stride_s = effective_stride_for_horizon(
            pending.policy_metadata.label_stride_s,
            slot.horizon_s,
            N_EVENTS_TARGET_PER_HORIZON,
        );

        LabeledTrade {
            sample_id: pending.sample_id.clone(),
            sample_decision: pending.sample_decision,
            horizon_s: slot.horizon_s,
            ts_emit_ns: pending.ts_emit_ns,
            cycle_seq: pending.cycle_seq,
            schema_version: LABELED_TRADE_SCHEMA_VERSION,
            scanner_version: SCANNER_VERSION,
            cluster_id: pending.cluster_id.clone(),
            cluster_size: pending.cluster_size,
            cluster_rank: pending.cluster_rank,
            runtime_config_hash: pending.runtime_config_hash.clone(),
            priority_set_generation_id: pending.priority_set_generation_id,
            priority_set_updated_at_ns: pending.priority_set_updated_at_ns,
            route_id: pending.route_id,
            symbol_name: pending.symbol_name.clone(),
            entry_locked_pct: pending.entry_locked_pct,
            exit_start_pct: pending.exit_start_pct,
            features_t0: pending.features_t0.clone(),
            // renomes protetores aplicados.
            audit_hindsight_best_exit_pct: slot.best_exit_pct_so_far,
            audit_hindsight_best_exit_ts_ns: slot.best_exit_ts_ns_so_far,
            audit_hindsight_best_gross_pct: best_gross,
            audit_hindsight_t_to_best_s: t_to_best,
            n_clean_future_samples: slot.n_clean_future_samples,
            label_floor_pct: pending.label_floor_pct,
            first_exit_ge_label_floor_ts_ns: slot.first_exit_ge_floor_ts_ns,
            first_exit_ge_label_floor_pct: slot.first_exit_ge_floor_pct,
            t_to_first_hit_s: t_to_first_hit,
            label_floor_hits,
            outcome,
            censor_reason,
            observed_until_ns: slot.observed_until_ns,
            label_window_closed_at_ns: pending
                .ts_emit_ns
                .saturating_add((slot.horizon_s as u64).saturating_mul(1_000_000_000)),
            closed_ts_ns: now_ns,
            // writer task faz override para o ts real de write.
            // Aqui preenchemos com now_ns (close time) como fallback; writer
            // override semanticamente distingue os dois timestamps.
            written_ts_ns: now_ns,
            policy_metadata: policy,
            sampling_tier: pending.sampling_tier,
            sampling_probability: pending.sampling_probability,
            sampling_probability_kind: sampling_probability_kind_for_tier_label(
                pending.sampling_tier,
            ),
        }
    }

    fn bump_written_metrics(&self, outcome: LabelOutcome) {
        self.metrics
            .labels_written_total
            .fetch_add(1, Ordering::Relaxed);
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

fn normalized_floors(primary_floor: f32, mut floors: Vec<f32>) -> Vec<f32> {
    floors.retain(|v| v.is_finite());
    // dedup com tolerância 1e-4 (antes 1e-6, muito fino para f32
    // quando primary próximo de valor da lista tinha erro de arredondamento).
    floors.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    floors.dedup_by(|a, b| (*a - *b).abs() < 1e-4);
    // primary_floor SEMPRE em hits[0] (semântica explícita).
    // Antes o sort+dedup posicionava primary onde quer que fosse por ordem
    // numérica; trainer assumindo `hits[0] = primary` quebrava.
    if primary_floor.is_finite() {
        floors.retain(|v| (*v - primary_floor).abs() >= 1e-4);
        floors.insert(0, primary_floor);
    } else if floors.is_empty() {
        floors.push(primary_floor);
    }
    floors
}

/// Deriva `cluster_id` determinístico a partir do símbolo e da janela default
/// do maior horizonte. Rotas irmãs do mesmo ativo compartilham o cluster
/// temporal para purge/CPCV conservador.
pub fn derive_cluster_id(route: RouteId, ts_emit_ns: u64) -> String {
    let max_horizon_s = DEFAULT_HORIZONS_S.iter().copied().max().unwrap_or(900);
    derive_cluster_id_for_horizon_window(route, ts_emit_ns, max_horizon_s)
}

/// Deriva `cluster_id` com janela temporal compatível com o maior horizonte
/// configurado. Isso evita separar em clusters distintos amostras do mesmo
/// símbolo cujas janelas de label ainda se sobrepõem.
pub fn derive_cluster_id_for_horizon_window(
    route: RouteId,
    ts_emit_ns: u64,
    max_horizon_s: u32,
) -> String {
    use crate::ml::util::fnv1a_64;
    let min_window_ns = 15 * 60 * 1_000_000_000u64;
    let horizon_window_ns = (max_horizon_s as u64).saturating_mul(1_000_000_000);
    let window_ns = min_window_ns.max(horizon_window_ns);
    let bucket = ts_emit_ns / window_ns;
    let mut payload = Vec::with_capacity(16);
    payload.extend_from_slice(&bucket.to_le_bytes());
    payload.extend_from_slice(&route.symbol_id.0.to_le_bytes());
    format!("{:016x}", fnv1a_64(&payload))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::persistence::labeled_writer::{LabeledJsonlWriter, LabeledWriterConfig};
    use crate::ml::persistence::parquet_compactor::ParquetCompactionConfig;
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
            half_spread_buy_now: None,
            half_spread_sell_now: None,
            tail_ratio_p99_p95: None,
            entry_p25_24h: None,
            entry_p50_24h: None,
            entry_p75_24h: None,
            entry_p95_24h: None,
            entry_rank_percentile_24h: None,
            entry_minus_p50_24h: None,
            entry_mad_robust_24h: None,
            exit_p25_24h: None,
            exit_p50_24h: None,
            exit_p75_24h: None,
            exit_p95_24h: None,
            p_exit_ge_label_floor_minus_entry_24h: None,
            entry_p50_1h: None,
            entry_rank_percentile_1h: None,
            p_exit_ge_label_floor_minus_entry_1h: None,
            entry_p50_7d: None,
            entry_p95_7d: None,
            p_exit_ge_label_floor_minus_entry_7d: None,
            gross_run_p05_s: None,
            gross_run_p50_s: None,
            gross_run_p95_s: None,
            exit_excess_run_s: None,
            n_cache_observations_at_t0: 0,
            oldest_cache_ts_ns: 0,
            time_alive_at_t0_s: None,
            listing_age_days: None,
            route_first_seen_ns: None,
            route_last_seen_ns: None,
            route_active_until_ns: None,
            route_n_snapshots: None,
        }
    }

    fn mk_policy() -> PolicyMetadata {
        PolicyMetadata {
            baseline_model_version: "baseline-a3-0.2.0".into(),
            baseline_recommended: false,
            recommendation_kind: "abstain",
            abstain_reason: Some("NO_OPPORTUNITY"),
            prediction_source_kind: "baseline",
            prediction_model_version: "baseline-a3-0.2.0".into(),
            prediction_emitted_at_ns: None,
            prediction_valid_until_ns: None,
            prediction_entry_now: None,
            prediction_exit_target: None,
            prediction_gross_profit_target: None,
            prediction_p_hit: None,
            prediction_p_hit_ci_lo: None,
            prediction_p_hit_ci_hi: None,
            prediction_exit_q25: None,
            prediction_exit_q50: None,
            prediction_exit_q75: None,
            prediction_t_hit_p25_s: None,
            prediction_t_hit_median_s: None,
            prediction_t_hit_p75_s: None,
            prediction_p_censor: None,
            prediction_calibration_status: "not_applicable",
            baseline_historical_base_rate_24h: None,
            baseline_derived_enter_at_min: None,
            baseline_derived_exit_at_min: None,
            baseline_floor_pct: 0.8,
            label_stride_s: 60,
            effective_stride_s: 60,
            label_sampling_probability: 1.0,
            candidates_in_route_last_24h: 0,
            accepts_in_route_last_24h: 0,
            ci_method: "wilson_marginal",
        }
    }

    async fn setup_resolver(
        cfg: ResolverConfig,
    ) -> (
        Arc<LabelResolver>,
        tempfile::TempDir,
        tokio::task::JoinHandle<()>,
    ) {
        let tmp = tempfile::tempdir().unwrap();
        let wcfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "lrtest".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = LabeledJsonlWriter::create(wcfg);
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(cfg, handle));
        (resolver, tmp, task)
    }

    #[tokio::test]
    async fn realized_when_first_hit_occurs_within_horizon() {
        let cfg = ResolverConfig {
            horizons_s: vec![2, 4, 6],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_a".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
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
            horizons_s: vec![2, 4, 6],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_m".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            10.0,
            mk_policy(), // floor absurdo
            "allowlist",
            1.0,
            0,
        );
        // Observações com exit muito negativo → nunca hita floor 10%.
        for i in 1..=5u64 {
            resolver.on_clean_observation(mk_route(), t_emit + i * 1_000_000_000, 2.0, -2.0);
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
    async fn future_entry_improvement_does_not_realize_locked_label() {
        let cfg = ResolverConfig {
            horizons_s: vec![2],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_locked_entry".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            1.0,
            -2.0,
            mk_features(),
            3.0,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );

        // Se o label usasse entry(t>t0), este tick realizaria: 99 + 0 >= 3.
        // Correto: entry_locked=1, então 1 + 0 < 3 e o horizonte vira Miss.
        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 99.0, 0.0);
        resolver.sweep(t_emit + 4_000_000_000);
        sleep(Duration::from_millis(150)).await;

        let m = resolver.metrics();
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.labels_written_miss_total.load(Ordering::Relaxed), 1);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn post_deadline_hit_does_not_realize_horizon() {
        let cfg = ResolverConfig {
            horizons_s: vec![2],
            close_slack_ns: 60_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_late".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // t+3s fica fora do horizonte de 2s. Mesmo com gross=1.5 >= floor,
        // não pode ser marcado como realized para esse horizonte.
        resolver.on_clean_observation(mk_route(), t_emit + 3_000_000_000, 1.9, -0.5);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.labels_written_miss_total.load(Ordering::Relaxed), 1);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn expired_incomplete_horizon_is_censored_not_miss() {
        let cfg = ResolverConfig {
            horizons_s: vec![10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_incomplete".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            10.0,
            mk_policy(),
            "allowlist",
            1.0,
            0,
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
            horizons_s: vec![60, 120, 180],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 5 * 1_000_000_000, // 5s no teste
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_c".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
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
    async fn dormant_sweep_preserves_realized_when_hit_already_seen() {
        let cfg = ResolverConfig {
            horizons_s: vec![60],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 5 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t_emit = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_dormant_realized".into(),
            t_emit,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.5,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // t+2s: gross = 2.0 + (-0.5) = 1.5 >= floor 0.5.
        resolver.on_clean_observation(mk_route(), t_emit + 2_000_000_000, 1.8, -0.5);
        // t+8s: rota ja esta dormente pelo threshold de 5s, mas o hit foi
        // observado antes do silencio; outcome correto e Realized.
        resolver.sweep(t_emit + 8_000_000_000);
        sleep(Duration::from_millis(150)).await;

        let m = resolver.metrics();
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 1);
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn stride_suppresses_labels_within_window() {
        let cfg = ResolverConfig::default();
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        let created_a = resolver.on_accepted(
            "sid1".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            60, // stride 60s
        );
        assert!(created_a);
        // 30s depois — dentro do stride → skip.
        let created_b = resolver.on_accepted(
            "sid2".into(),
            t0 + 30_000_000_000,
            2,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            60,
        );
        assert!(!created_b);
        let m = resolver.metrics();
        assert_eq!(m.stride_skipped_total.load(Ordering::Relaxed), 1);
        // 91s depois — menor horizonte default tem stride efetivo 90s.
        let created_c = resolver.on_accepted(
            "sid3".into(),
            t0 + 91_000_000_000,
            3,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            60,
        );
        assert!(created_c);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn stride_filters_horizons_independently() {
        let cfg = ResolverConfig {
            horizons_s: vec![60, 600],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        assert!(resolver.on_accepted(
            "sid1".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.5,
            -1.2,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            10,
        ));

        // 20s depois: h=60 tem stride efetivo 10s; h=600 tem 60s.
        assert!(resolver.on_accepted(
            "sid2".into(),
            t0 + 20_000_000_000,
            2,
            mk_route(),
            "BTC-USDT".into(),
            2.6,
            -1.1,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            10,
        ));

        let inner = resolver.inner.lock();
        let queue = inner.pending_by_route.get(&mk_route()).unwrap();
        assert_eq!(queue.len(), 2);
        let second = queue.back().unwrap();
        assert_eq!(second.horizons.len(), 1);
        assert_eq!(second.horizons[0].horizon_s, 60);
        drop(inner);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn best_exit_tracks_max_even_after_first_hit() {
        let cfg = ResolverConfig {
            horizons_s: vec![10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.5,
            mk_features(),
            0.5,
            mk_policy(),
            "allowlist",
            1.0,
            0,
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
            "sid".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.8,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // Sem observações → observed_until == t_emit < qualquer deadline → Censored.
        // DEFAULT_HORIZONS_S agora tem 6 elementos (buraco 2h→8h fechado).
        let closed = resolver.shutdown_flush(t0 + 1_000_000_000).await;
        assert_eq!(
            closed.closed_total, 6,
            "6 horizontes default devem ter sido fechados"
        );
        assert_eq!(closed.sent_total, 6);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(
            m.shutdown_lost_pending_total.load(Ordering::Relaxed),
            6,
            "sem observações, todos 6 são Censored (lost)"
        );
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 6);
        assert_eq!(m.labels_written_realized_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn shutdown_flush_drains_more_than_writer_channel_capacity() {
        fn count_jsonl_lines(root: &std::path::Path) -> usize {
            let mut total = 0usize;
            let mut stack = vec![root.to_path_buf()];
            while let Some(dir) = stack.pop() {
                for entry in std::fs::read_dir(dir).expect("read_dir") {
                    let entry = entry.expect("dir entry");
                    let path = entry.path();
                    if path.is_dir() {
                        stack.push(path);
                    } else if path.extension().and_then(|s| s.to_str()) == Some("jsonl") {
                        let content = std::fs::read_to_string(&path).expect("jsonl content");
                        total += content.lines().count();
                    }
                }
            }
            total
        }

        let tmp = tempfile::tempdir().unwrap();
        let wcfg = LabeledWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1,
            flush_after_n: 512,
            flush_interval: Duration::from_secs(60),
            file_prefix: "lr-shutdown-drain".into(),
            rotation_interval: Duration::from_secs(3600),
            parquet: ParquetCompactionConfig {
                enabled: false,
                ..ParquetCompactionConfig::default()
            },
        };
        let (writer, handle) = LabeledJsonlWriter::create(wcfg);
        let task = tokio::spawn(writer.run());
        let resolver = Arc::new(LabelResolver::new(
            ResolverConfig::default(),
            handle.clone(),
        ));
        let t0 = 1_000_000_000u64;
        for i in 0..25u32 {
            resolver.on_accepted(
                format!("sid_{i}"),
                t0 + i as u64,
                i,
                mk_route(),
                "BTC-USDT".into(),
                2.0,
                -1.0,
                mk_features(),
                0.8,
                mk_policy(),
                "allowlist",
                1.0,
                0,
            );
        }

        let closed = resolver.shutdown_flush(t0 + 1_000_000_000).await;
        assert_eq!(closed.closed_total, 25 * DEFAULT_HORIZONS_S.len() as u64);
        assert_eq!(
            closed.sent_total, closed.closed_total,
            "shutdown must not drop when pending burst exceeds channel capacity"
        );
        assert_eq!(closed.dropped_channel_closed_total, 0);
        let writer_stats = handle.seal_current_file().await.expect("seal writer");
        assert_eq!(writer_stats.total_written, closed.closed_total);
        assert_eq!(count_jsonl_lines(tmp.path()), closed.closed_total as usize);

        drop(resolver);
        drop(handle);
        task.abort();
    }

    #[tokio::test]
    async fn shutdown_preserves_realized_when_first_hit_before_shutdown() {
        // U1 pós-auditoria 2026-04-22: shutdown_flush não deve
        // sobrescrever labels que já tinham `first_exit_ge_floor_ts_ns` —
        // eles devem ser emitidos como Realized, não como Censored{Shutdown}.
        let cfg = ResolverConfig {
            horizons_s: vec![10, 20, 30],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_realized".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            0.5,
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // Observação dentro de 2s: gross = 2.0 + (-0.5) = 1.5 > floor 0.5 → hit.
        resolver.on_clean_observation(mk_route(), t0 + 2_000_000_000, 1.8, -0.5);
        // Shutdown em t0+5s (antes de qualquer horizonte expirar).
        let closed = resolver.shutdown_flush(t0 + 5_000_000_000).await;
        assert_eq!(closed.closed_total, 3, "3 horizontes fechados no shutdown");
        assert_eq!(closed.sent_total, 3);
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(
            m.labels_written_realized_total.load(Ordering::Relaxed),
            3,
            "todos 3 horizontes tinham first_exit.is_some() → Realized"
        );
        assert_eq!(
            m.labels_written_censored_total.load(Ordering::Relaxed),
            0,
            "nenhum deve virar Censored se já havia hit"
        );
        assert_eq!(
            m.shutdown_lost_pending_total.load(Ordering::Relaxed),
            0,
            "métrica shutdown_lost_pending só conta Censored de verdade"
        );
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn shutdown_emits_miss_when_deadline_passed_without_hit() {
        // Caso de borda: horizonte vencido mas ainda aberto (não foi
        // fechado pelo sweep ainda). Shutdown deve emitir Miss, não
        // Censored, porque observed_until >= deadline.
        let cfg = ResolverConfig {
            horizons_s: vec![2, 4, 6],
            close_slack_ns: 5_000_000_000, // slack grande — sweep não fecharia ainda
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
            max_pending_per_route: 100,
            sweeper_interval: Duration::from_secs(10),
        };
        let (resolver, tmp, _task) = setup_resolver(cfg).await;
        let t0 = 1_000_000_000u64;
        resolver.on_accepted(
            "sid_miss".into(),
            t0,
            1,
            mk_route(),
            "BTC-USDT".into(),
            2.0,
            -1.0,
            mk_features(),
            10.0, // floor inalcançável → nunca hita
            mk_policy(),
            "allowlist",
            1.0,
            0,
        );
        // Observações continuam chegando (rota não sumiu) até além do último
        // deadline (6s), mas nunca hitam o floor de 10%.
        for i in 1..=7u64 {
            resolver.on_clean_observation(mk_route(), t0 + i * 1_000_000_000, 1.9, -2.0);
        }
        // Shutdown em t0+7s — slot 900s/1800s/2h (no config test: 2/4/6s)
        // todos têm observed_until >= deadline → Miss, não Censored.
        resolver.shutdown_flush(t0 + 7_000_000_000).await;
        sleep(Duration::from_millis(150)).await;
        let m = resolver.metrics();
        assert_eq!(
            m.labels_written_miss_total.load(Ordering::Relaxed),
            3,
            "3 horizontes expiraram observados sem hit → Miss"
        );
        assert_eq!(m.labels_written_censored_total.load(Ordering::Relaxed), 0);
        assert_eq!(m.shutdown_lost_pending_total.load(Ordering::Relaxed), 0);
        drop(resolver);
        drop(tmp);
    }

    #[tokio::test]
    async fn backpressure_drops_oldest_when_cap_exceeded() {
        // política invertida — drop oldest, não reject novo.
        // Regime atual é preservado em rotas quentes.
        let cfg = ResolverConfig {
            horizons_s: vec![60, 120, 180],
            close_slack_ns: 1_000_000_000,
            route_vanish_idle_ns: 10 * 60 * 1_000_000_000,
            route_delisted_idle_ns: 30 * 60 * 1_000_000_000,
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
                2.5,
                -1.2,
                mk_features(),
                0.8,
                mk_policy(),
                "allowlist",
                1.0,
                0, // sem stride
            );
        }
        let m = resolver.metrics();
        // 5 candidates, cap=3 → 2 drops (de oldest); 5 created total.
        assert_eq!(
            m.labels_dropped_capacity_overflow_total
                .load(Ordering::Relaxed),
            2,
            "2 drops esperados (cap=3 com 5 insertions)"
        );
        assert_eq!(
            m.pending_created_total.load(Ordering::Relaxed),
            5,
            "todos 5 labels foram aceitos; 2 oldest foram descartados para dar espaço"
        );
        drop(resolver);
        drop(tmp);
    }

    #[test]
    fn normalized_floors_places_primary_in_head_position() {
        // primary_floor sempre em hits[0] mesmo quando não-monotônico.
        let floors = normalized_floors(0.8, vec![0.3, 0.5, 1.2, 2.0]);
        assert_eq!(floors[0], 0.8, "primary deve estar em hits[0]");
        assert!(floors.len() == 5);
        // dedup com tolerância 1e-4.
        let dedup = normalized_floors(0.800001, vec![0.8, 0.5]);
        assert_eq!(dedup.len(), 2, "0.8 e 0.800001 dedupam; primary permanece");
        assert_eq!(dedup[0], 0.800001);
    }

    #[test]
    fn effective_stride_scales_with_horizon() {
        // stride por horizonte evita overlap massivo em h longo.
        // h=900 com N=10: 90s > base 60 ⇒ 90s.
        assert_eq!(effective_stride_for_horizon(60, 900, 10), 90);
        // h=28800 com N=10: 2880s.
        assert_eq!(effective_stride_for_horizon(60, 28800, 10), 2880);
    }

    #[test]
    fn cluster_id_deterministic_and_symbol_window_sensitive() {
        // cluster_id derivável deterministicamente.
        use crate::types::{SymbolId, Venue};
        let r1 = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        let r_same_symbol = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::BinanceFut,
            sell_venue: Venue::MexcFut,
        };
        let r2 = RouteId {
            symbol_id: SymbolId(2),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        let t = 0u64;
        assert_eq!(derive_cluster_id(r1, t), derive_cluster_id(r1, t));
        assert_eq!(
            derive_cluster_id(r1, t),
            derive_cluster_id(r_same_symbol, t)
        );
        assert_ne!(derive_cluster_id(r1, t), derive_cluster_id(r2, t));
        // Mesma janela do horizonte máximo default (8h) → mesmo cluster.
        assert_eq!(
            derive_cluster_id(r1, t),
            derive_cluster_id(r1, t + 16 * 60 * 1_000_000_000)
        );
        // Janela seguinte ao horizonte máximo → cluster distinto.
        assert_ne!(
            derive_cluster_id(r1, t),
            derive_cluster_id(r1, t + 8 * 60 * 60 * 1_000_000_000)
        );
    }
}
