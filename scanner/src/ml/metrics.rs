//! Exports Prometheus do `MlServer` para dashboards Grafana.
//!
//! Registra contadores e gauges no registry Prometheus global do scanner
//! (já inicializado em `scanner::obs::Metrics::init()`). As métricas
//! aqui são agregadas por rótulo (reason, kind), não por rota — cobertura
//! por rota seria cardinalidade catastrófica (2600 séries por métrica).
//! Métricas per-route ficam em logs estruturados; dashboard usa agregados.
//!
//! # Métricas expostas (Wave T expansion pós-auditoria equipe)
//!
//! | Nome | Tipo | Labels | Descrição |
//! |---|---|---|---|
//! | `ml_opportunities_seen_total` | Counter | — | Total de oportunidades processadas pelo MlServer |
//! | `ml_sample_decisions_total` | CounterVec | `reason` | Amostras aceitas/rejeitadas por gate do trigger |
//! | `ml_recommendations_total` | CounterVec | `kind` | Trade / abstain por razão |
//! | `ml_cache_routes_tracked` | IntGauge | — | Rotas distintas no HotQueryCache |
//! | `ml_raw_samples_emitted_total` | Counter | — | RawSamples pré-trigger emitidos (ADR-025) |
//! | `ml_raw_samples_emitted_by_tier_total` | CounterVec | `tier` | RawSamples emitidos por tier |
//! | `ml_raw_samples_dropped_total` | CounterVec | `reason` | RawSamples descartados (channel_full/closed) |
//! | `ml_broadcaster_published_total` | CounterVec | `kind` | Recommendations publicadas ao broadcaster (ADR-026) |
//! | `ml_broadcaster_no_subscribers_total` | Counter | — | Publicações sem consumers ativos |
//! | `ml_broadcaster_was_recommended_total` | Counter | — | Publicações com ≥1 consumer no envio — proxy de entrega |
//! | `ml_economic_emissions_total` | Counter | — | Eventos econômicos acumulados |
//! | `ml_economic_outcomes_total` | CounterVec | `outcome` | realized/window_miss/exit_miss/censored |
//! | `ml_economic_pnl_aggregated_usd` | Gauge | — | PnL bruto simulado agregado (USD, capital hipotético 10k) |
//!
//! Alertmanager + Grafana consomem esses nomes (não mudar sem warning).

use std::sync::atomic::Ordering;
use std::sync::Arc;

use prometheus::{Gauge, IntCounter, IntCounterVec, IntGauge, Opts, Registry};

use crate::ml::broadcast::{BroadcasterMetrics, RecommendationBroadcaster};
use crate::ml::economic::EconomicMetrics;
use crate::ml::persistence::ResolverMetrics;
use crate::ml::serving::{MlServer, ServerMetrics};

// ---------------------------------------------------------------------------
// MlPrometheusMetrics
// ---------------------------------------------------------------------------

/// Handles para todas as métricas ML registradas no Prometheus registry.
///
/// Instância única por processo. Passa pelo `scanner::obs::Metrics` via
/// `register()`. Atualização periódica (ex: a cada 1 s) a partir de
/// `ServerMetrics` via `update_from_server`.
pub struct MlPrometheusMetrics {
    opportunities_seen_total: IntCounter,
    sample_decisions_total: IntCounterVec,
    recommendations_total: IntCounterVec,
    cache_routes_tracked: IntGauge,

    // Wave T extensions — raw samples, broadcaster, economic.
    raw_samples_emitted_total: IntCounter,
    raw_samples_emitted_by_tier_total: IntCounterVec,
    raw_samples_dropped_total: IntCounterVec,
    broadcaster_published_total: IntCounterVec,
    broadcaster_no_subscribers_total: IntCounter,
    broadcaster_was_recommended_total: IntCounter,
    broadcaster_lagged_frames_total: IntCounter,
    economic_emissions_total: IntCounter,
    economic_outcomes_total: IntCounterVec,
    economic_pnl_aggregated_usd: Gauge,

    // Wave U (pós-auditoria 2026-04-21).
    accepted_samples_dropped_total: IntCounterVec,
    rec_invariant_blocked_total: IntCounter,
    calibration_ece: Gauge,
    calibration_observations: IntGauge,
    // F2-R4 (pós-auditoria 2026-04-22) — taxa de "recomendação prematura".
    // Definição: `n_window_miss_total / n_emissions_total` acumulado. Alta
    // taxa indica que o modelo está recomendando antes do entry realmente
    // atingir `enter_at_min` dentro da janela, validado empiricamente.
    // Complementa ECE: calibra a dimensão TEMPORAL do sinal ("recomendar
    // cedo demais sistematicamente é erro do modelo" — CLAUDE.md).
    premature_recommendation_rate: Gauge,

    // Labels supervisionados + decimator tiers.
    labels_created_total: IntCounter,
    labels_stride_skipped_total: IntCounter,
    labels_written_total: IntCounterVec,
    labels_dropped_writer_total: IntCounterVec,
    labels_dropped_capacity_total: IntCounter,
    shutdown_lost_pending_total: IntCounter,

    // Snapshots do último update (para computar delta → Counter.inc_by).
    last_seen: ServerMetricsSnapshot,
    last_broadcaster: BroadcasterSnapshot,
    last_economic: EconomicSnapshot,
    last_resolver: ResolverSnapshot,
}

#[derive(Default)]
struct ResolverSnapshot {
    pending_created: u64,
    stride_skipped: u64,
    written_realized: u64,
    written_miss: u64,
    written_censored: u64,
    dropped_channel_full: u64,
    dropped_channel_closed: u64,
    dropped_capacity_overflow: u64,
    shutdown_lost: u64,
}

#[derive(Default)]
struct ServerMetricsSnapshot {
    opportunities_seen: u64,
    sample_accepts: u64,
    sample_rejects_low_volume: u64,
    sample_rejects_insufficient_history: u64,
    sample_rejects_below_tail: u64,
    rec_trade_total: u64,
    rec_abstain_no_opportunity: u64,
    rec_abstain_insufficient_data: u64,
    rec_abstain_low_confidence: u64,
    rec_abstain_long_tail: u64,
    raw_samples_emitted: u64,
    raw_samples_emitted_allowlist: u64,
    raw_samples_emitted_priority: u64,
    raw_samples_emitted_decimated_uniform: u64,
    raw_samples_dropped_channel_full: u64,
    raw_samples_dropped_channel_closed: u64,
    // Wave U pós-auditoria.
    rec_invariant_blocked: u64,
    accepted_samples_dropped_channel_full: u64,
    accepted_samples_dropped_channel_closed: u64,
}

#[derive(Default)]
struct BroadcasterSnapshot {
    published_total: u64,
    trade_published_total: u64,
    abstain_published_total: u64,
    no_subscribers_total: u64,
    was_recommended_publications: u64,
    lagged_frames_total: u64,
}

#[derive(Default)]
struct EconomicSnapshot {
    n_emissions_total: u64,
    n_realized_total: u64,
    n_exit_miss_total: u64,
    n_censored_total: u64,
    pnl_aggregated_usd_times_10k: i64,
}

impl MlPrometheusMetrics {
    /// Registra todas as métricas no `Registry` fornecido.
    ///
    /// Devolve erro de `prometheus::Error` se alguma métrica já foi
    /// registrada com o mesmo nome — chamada dupla da função é bug.
    pub fn register(registry: &Registry) -> Result<Self, prometheus::Error> {
        let opportunities_seen_total = IntCounter::with_opts(Opts::new(
            "ml_opportunities_seen_total",
            "Total de oportunidades processadas pelo MlServer",
        ))?;
        let sample_decisions_total = IntCounterVec::new(
            Opts::new(
                "ml_sample_decisions_total",
                "Decisões do sampling trigger por razão",
            ),
            &["reason"],
        )?;
        let recommendations_total = IntCounterVec::new(
            Opts::new(
                "ml_recommendations_total",
                "Recomendações emitidas por categoria",
            ),
            &["kind"],
        )?;
        let cache_routes_tracked = IntGauge::with_opts(Opts::new(
            "ml_cache_routes_tracked",
            "Rotas distintas no HotQueryCache (n_obs ≥ 1)",
        ))?;

        // Wave T — raw samples (ADR-025).
        let raw_samples_emitted_total = IntCounter::with_opts(Opts::new(
            "ml_raw_samples_emitted_total",
            "RawSamples pré-trigger emitidos ao writer JSONL (ADR-025)",
        ))?;
        let raw_samples_emitted_by_tier_total = IntCounterVec::new(
            Opts::new(
                "ml_raw_samples_emitted_by_tier_total",
                "RawSamples pré-trigger emitidos por tier de decimação",
            ),
            &["tier"],
        )?;
        let raw_samples_dropped_total = IntCounterVec::new(
            Opts::new(
                "ml_raw_samples_dropped_total",
                "RawSamples descartados por backpressure (ADR-025)",
            ),
            &["reason"],
        )?;

        // Wave T — broadcaster (ADR-026).
        let broadcaster_published_total = IntCounterVec::new(
            Opts::new(
                "ml_broadcaster_published_total",
                "Recommendations publicadas ao canal broadcast (ADR-026)",
            ),
            &["kind"],
        )?;
        let broadcaster_no_subscribers_total = IntCounter::with_opts(Opts::new(
            "ml_broadcaster_no_subscribers_total",
            "Publicações sem consumers ativos (ADR-026)",
        ))?;
        let broadcaster_was_recommended_total = IntCounter::with_opts(Opts::new(
            "ml_broadcaster_was_recommended_total",
            "Publicações que encontraram ≥1 consumer no envio — proxy de entrega",
        ))?;

        // Wave T — economic (ADR-019).
        let economic_emissions_total = IntCounter::with_opts(Opts::new(
            "ml_economic_emissions_total",
            "Eventos econômicos acumulados (ADR-019)",
        ))?;
        let economic_outcomes_total = IntCounterVec::new(
            Opts::new(
                "ml_economic_outcomes_total",
                "Outcomes resolvidos de recomendações (ADR-019)",
            ),
            &["outcome"],
        )?;
        let economic_pnl_aggregated_usd = Gauge::with_opts(Opts::new(
            "ml_economic_pnl_aggregated_usd",
            "PnL bruto simulado agregado em USD (capital hipotético 10k)",
        ))?;

        // (removed) Fix pós-auditoria 2026-04-21.
        let broadcaster_lagged_frames_total = IntCounter::with_opts(Opts::new(
            "ml_broadcaster_lagged_frames_total",
            "Frames sobrescritos por consumer WS lento (RecvError::Lagged)",
        ))?;
        let accepted_samples_dropped_total = IntCounterVec::new(
            Opts::new(
                "ml_accepted_samples_dropped_total",
                "AcceptedSamples descartadas por backpressure do writer JSONL",
            ),
            &["reason"],
        )?;
        let rec_invariant_blocked_total = IntCounter::with_opts(Opts::new(
            "ml_rec_invariant_blocked_total",
            "TradeSetup bloqueado pelo verificador de invariantes (downgrade para Abstain)",
        ))?;
        let calibration_ece = Gauge::with_opts(Opts::new(
            "ml_p_hit_calibration_ece",
            "Expected Calibration Error de P_hit em [0,1] — baseline A3 degradado não alimenta esta métrica",
        ))?;
        let calibration_observations = IntGauge::with_opts(Opts::new(
            "ml_calibration_observations",
            "Total de pares (P_hit, realized) registrados no tracker de calibração",
        ))?;
        // F2-R4: taxa acumulada de recomendação prematura.
        let premature_recommendation_rate = Gauge::with_opts(Opts::new(
            "ml_premature_recommendation_rate",
            "n_window_miss_total / n_emissions_total acumulado — taxa de recomendações que não realizaram o entry dentro da janela (CLAUDE.md: 'recomendar cedo demais sistematicamente é erro do modelo')",
        ))?;

        // (removed) labels supervisionados + tiers.
        let labels_created_total = IntCounter::with_opts(Opts::new(
            "ml_labels_created_total",
            "PendingLabels criados (1 por AcceptedSample elegível após stride)",
        ))?;
        let labels_stride_skipped_total = IntCounter::with_opts(Opts::new(
            "ml_labels_stride_skipped_total",
            "AcceptedSamples pulados por label_stride dentro da janela",
        ))?;
        let labels_written_total = IntCounterVec::new(
            Opts::new(
                "ml_labels_written_total",
                "LabeledTrades persistidos (1 por horizonte fechado) — labeled por outcome",
            ),
            &["outcome"],
        )?;
        let labels_dropped_writer_total = IntCounterVec::new(
            Opts::new(
                "ml_labels_dropped_writer_total",
                "LabeledTrades descartados por writer indisponível",
            ),
            &["reason"],
        )?;
        let labels_dropped_capacity_total = IntCounter::with_opts(Opts::new(
            "ml_labels_dropped_capacity_total",
            "PendingLabels descartados por overflow do cap por rota",
        ))?;
        let shutdown_lost_pending_total = IntCounter::with_opts(Opts::new(
            "ml_shutdown_lost_pending_total",
            "PendingLabels forçados censored{shutdown} ao encerrar",
        ))?;

        registry.register(Box::new(opportunities_seen_total.clone()))?;
        registry.register(Box::new(sample_decisions_total.clone()))?;
        registry.register(Box::new(recommendations_total.clone()))?;
        registry.register(Box::new(cache_routes_tracked.clone()))?;
        registry.register(Box::new(raw_samples_emitted_total.clone()))?;
        registry.register(Box::new(raw_samples_emitted_by_tier_total.clone()))?;
        registry.register(Box::new(raw_samples_dropped_total.clone()))?;
        registry.register(Box::new(broadcaster_published_total.clone()))?;
        registry.register(Box::new(broadcaster_no_subscribers_total.clone()))?;
        registry.register(Box::new(broadcaster_was_recommended_total.clone()))?;
        registry.register(Box::new(economic_emissions_total.clone()))?;
        registry.register(Box::new(economic_outcomes_total.clone()))?;
        registry.register(Box::new(economic_pnl_aggregated_usd.clone()))?;
        // Wave U pós-auditoria.
        registry.register(Box::new(broadcaster_lagged_frames_total.clone()))?;
        registry.register(Box::new(accepted_samples_dropped_total.clone()))?;
        registry.register(Box::new(rec_invariant_blocked_total.clone()))?;
        registry.register(Box::new(calibration_ece.clone()))?;
        registry.register(Box::new(calibration_observations.clone()))?;
        registry.register(Box::new(premature_recommendation_rate.clone()))?;
        // Wave V
        registry.register(Box::new(labels_created_total.clone()))?;
        registry.register(Box::new(labels_stride_skipped_total.clone()))?;
        registry.register(Box::new(labels_written_total.clone()))?;
        registry.register(Box::new(labels_dropped_writer_total.clone()))?;
        registry.register(Box::new(labels_dropped_capacity_total.clone()))?;
        registry.register(Box::new(shutdown_lost_pending_total.clone()))?;

        // Pre-touch todos os labels — garante que aparecem em `gather()`
        // desde o primeiro scrape Prometheus, mesmo sem incrementos ainda.
        // Dashboards Grafana funcionam com `rate()` / `increase()` e
        // precisam das séries existirem (mesmo que com valor 0).
        for reason in &["accept", "low_volume", "insufficient_history", "below_tail"] {
            sample_decisions_total
                .with_label_values(&[reason])
                .inc_by(0);
        }
        for kind in &[
            "trade",
            "abstain_no_opportunity",
            "abstain_insufficient_data",
            "abstain_low_confidence",
            "abstain_long_tail",
        ] {
            recommendations_total.with_label_values(&[kind]).inc_by(0);
        }
        // Pre-touch labels Wave T.
        for reason in &["channel_full", "channel_closed"] {
            raw_samples_dropped_total
                .with_label_values(&[reason])
                .inc_by(0);
        }
        for tier in &["allowlist", "priority", "decimated_uniform"] {
            raw_samples_emitted_by_tier_total
                .with_label_values(&[tier])
                .inc_by(0);
        }
        for kind in &["trade", "abstain"] {
            broadcaster_published_total
                .with_label_values(&[kind])
                .inc_by(0);
        }
        for outcome in &["realized", "window_miss", "exit_miss"] {
            economic_outcomes_total
                .with_label_values(&[outcome])
                .inc_by(0);
        }
        // Wave U pre-touch.
        for reason in &["channel_full", "channel_closed"] {
            accepted_samples_dropped_total
                .with_label_values(&[reason])
                .inc_by(0);
        }
        // Wave V pre-touch.
        for outcome in &["realized", "miss", "censored"] {
            labels_written_total.with_label_values(&[outcome]).inc_by(0);
        }
        for reason in &["channel_full", "channel_closed"] {
            labels_dropped_writer_total
                .with_label_values(&[reason])
                .inc_by(0);
        }

        Ok(Self {
            opportunities_seen_total,
            sample_decisions_total,
            recommendations_total,
            cache_routes_tracked,
            raw_samples_emitted_total,
            raw_samples_emitted_by_tier_total,
            raw_samples_dropped_total,
            broadcaster_published_total,
            broadcaster_no_subscribers_total,
            broadcaster_was_recommended_total,
            economic_emissions_total,
            economic_outcomes_total,
            economic_pnl_aggregated_usd,
            broadcaster_lagged_frames_total,
            accepted_samples_dropped_total,
            rec_invariant_blocked_total,
            calibration_ece,
            calibration_observations,
            premature_recommendation_rate,
            labels_created_total,
            labels_stride_skipped_total,
            labels_written_total,
            labels_dropped_writer_total,
            labels_dropped_capacity_total,
            shutdown_lost_pending_total,
            last_seen: ServerMetricsSnapshot::default(),
            last_broadcaster: BroadcasterSnapshot::default(),
            last_economic: EconomicSnapshot::default(),
            last_resolver: ResolverSnapshot::default(),
        })
    }

    /// Atualiza todos os valores Prometheus a partir do `MlServer`.
    ///
    /// Computa delta entre snapshot anterior e atual e chama `inc_by` nos
    /// Counters (Prometheus Counters são monotonicamente crescentes; não
    /// aceitam `set` direto). Gauges (`cache_routes_tracked`) recebem
    /// valor absoluto.
    ///
    /// Chamar periodicamente — tipicamente via task tokio com interval
    /// de 1 s. Chamar muito frequentemente não quebra nada (delta = 0).
    pub fn update_from_server(&mut self, server: &MlServer) {
        let metrics = server.metrics();
        let current = snapshot(&metrics);

        macro_rules! diff {
            ($field:ident) => {{
                let delta = current.$field.saturating_sub(self.last_seen.$field);
                if delta > 0 {
                    delta
                } else {
                    0
                }
            }};
        }

        self.opportunities_seen_total
            .inc_by(diff!(opportunities_seen));

        self.sample_decisions_total
            .with_label_values(&["accept"])
            .inc_by(diff!(sample_accepts));
        self.sample_decisions_total
            .with_label_values(&["low_volume"])
            .inc_by(diff!(sample_rejects_low_volume));
        self.sample_decisions_total
            .with_label_values(&["insufficient_history"])
            .inc_by(diff!(sample_rejects_insufficient_history));
        self.sample_decisions_total
            .with_label_values(&["below_tail"])
            .inc_by(diff!(sample_rejects_below_tail));

        self.recommendations_total
            .with_label_values(&["trade"])
            .inc_by(diff!(rec_trade_total));
        self.recommendations_total
            .with_label_values(&["abstain_no_opportunity"])
            .inc_by(diff!(rec_abstain_no_opportunity));
        self.recommendations_total
            .with_label_values(&["abstain_insufficient_data"])
            .inc_by(diff!(rec_abstain_insufficient_data));
        self.recommendations_total
            .with_label_values(&["abstain_low_confidence"])
            .inc_by(diff!(rec_abstain_low_confidence));
        self.recommendations_total
            .with_label_values(&["abstain_long_tail"])
            .inc_by(diff!(rec_abstain_long_tail));

        self.cache_routes_tracked
            .set(server.baseline().cache().routes_tracked() as i64);

        // Raw samples do ServerMetrics.
        self.raw_samples_emitted_total
            .inc_by(diff!(raw_samples_emitted));
        self.raw_samples_emitted_by_tier_total
            .with_label_values(&["allowlist"])
            .inc_by(diff!(raw_samples_emitted_allowlist));
        self.raw_samples_emitted_by_tier_total
            .with_label_values(&["priority"])
            .inc_by(diff!(raw_samples_emitted_priority));
        self.raw_samples_emitted_by_tier_total
            .with_label_values(&["decimated_uniform"])
            .inc_by(diff!(raw_samples_emitted_decimated_uniform));
        self.raw_samples_dropped_total
            .with_label_values(&["channel_full"])
            .inc_by(diff!(raw_samples_dropped_channel_full));
        self.raw_samples_dropped_total
            .with_label_values(&["channel_closed"])
            .inc_by(diff!(raw_samples_dropped_channel_closed));

        // Wave U pós-auditoria — novos contadores do ServerMetrics.
        self.rec_invariant_blocked_total
            .inc_by(diff!(rec_invariant_blocked));
        self.accepted_samples_dropped_total
            .with_label_values(&["channel_full"])
            .inc_by(diff!(accepted_samples_dropped_channel_full));
        self.accepted_samples_dropped_total
            .with_label_values(&["channel_closed"])
            .inc_by(diff!(accepted_samples_dropped_channel_closed));
        let economic = server.economic_metrics();
        self.update_from_economic(&economic);

        self.last_seen = current;
    }

    /// Atualiza o snapshot Prometheus completo do runtime ML.
    ///
    /// `server` é obrigatório; broadcaster, economic e resolver são
    /// opcionais porque podem não estar conectados em alguns modos de
    /// execução/teste.
    pub fn update_from_runtime(
        &mut self,
        server: &MlServer,
        broadcaster: Option<&RecommendationBroadcaster>,
        economic: Option<&EconomicMetrics>,
        resolver: Option<&ResolverMetrics>,
    ) {
        self.update_from_server(server);
        if let Some(b) = broadcaster {
            let metrics = b.metrics();
            self.update_from_broadcaster(metrics.as_ref());
        }
        if let Some(e) = economic {
            self.update_from_economic(e);
        }
        if let Some(r) = resolver {
            self.update_from_resolver(r);
        }
    }

    /// (removed) atualiza métricas do `LabelResolver`.
    pub fn update_from_resolver(&mut self, rm: &ResolverMetrics) {
        let pending = rm.pending_created_total.load(Ordering::Relaxed);
        let stride = rm.stride_skipped_total.load(Ordering::Relaxed);
        let _written_total = rm.labels_written_total.load(Ordering::Relaxed);
        let written_realized = rm.labels_written_realized_total.load(Ordering::Relaxed);
        let written_miss = rm.labels_written_miss_total.load(Ordering::Relaxed);
        let written_censored = rm.labels_written_censored_total.load(Ordering::Relaxed);
        let drop_full = rm.labels_dropped_channel_full_total.load(Ordering::Relaxed);
        let drop_closed = rm
            .labels_dropped_channel_closed_total
            .load(Ordering::Relaxed);
        let drop_cap = rm
            .labels_dropped_capacity_overflow_total
            .load(Ordering::Relaxed);
        let shutdown = rm.shutdown_lost_pending_total.load(Ordering::Relaxed);

        self.labels_created_total
            .inc_by(pending.saturating_sub(self.last_resolver.pending_created));
        self.labels_stride_skipped_total
            .inc_by(stride.saturating_sub(self.last_resolver.stride_skipped));
        self.labels_written_total
            .with_label_values(&["realized"])
            .inc_by(written_realized.saturating_sub(self.last_resolver.written_realized));
        self.labels_written_total
            .with_label_values(&["miss"])
            .inc_by(written_miss.saturating_sub(self.last_resolver.written_miss));
        self.labels_written_total
            .with_label_values(&["censored"])
            .inc_by(written_censored.saturating_sub(self.last_resolver.written_censored));
        self.labels_dropped_writer_total
            .with_label_values(&["channel_full"])
            .inc_by(drop_full.saturating_sub(self.last_resolver.dropped_channel_full));
        self.labels_dropped_writer_total
            .with_label_values(&["channel_closed"])
            .inc_by(drop_closed.saturating_sub(self.last_resolver.dropped_channel_closed));
        self.labels_dropped_capacity_total
            .inc_by(drop_cap.saturating_sub(self.last_resolver.dropped_capacity_overflow));
        self.shutdown_lost_pending_total
            .inc_by(shutdown.saturating_sub(self.last_resolver.shutdown_lost));

        self.last_resolver = ResolverSnapshot {
            pending_created: pending,
            stride_skipped: stride,
            written_realized,
            written_miss,
            written_censored,
            dropped_channel_full: drop_full,
            dropped_channel_closed: drop_closed,
            dropped_capacity_overflow: drop_cap,
            shutdown_lost: shutdown,
        };
    }

    /// Atualiza métricas do broadcaster a partir de `BroadcasterMetrics`.
    pub fn update_from_broadcaster(&mut self, bm: &BroadcasterMetrics) {
        let trade = bm.trade_published_total.load(Ordering::Relaxed);
        let abstain = bm.abstain_published_total.load(Ordering::Relaxed);
        let no_subs = bm.no_subscribers_total.load(Ordering::Relaxed);
        let recommended = bm.was_recommended_publications.load(Ordering::Relaxed);

        let d_trade = trade.saturating_sub(self.last_broadcaster.trade_published_total);
        let d_abstain = abstain.saturating_sub(self.last_broadcaster.abstain_published_total);
        let d_no_subs = no_subs.saturating_sub(self.last_broadcaster.no_subscribers_total);
        let d_rec = recommended.saturating_sub(self.last_broadcaster.was_recommended_publications);

        self.broadcaster_published_total
            .with_label_values(&["trade"])
            .inc_by(d_trade);
        self.broadcaster_published_total
            .with_label_values(&["abstain"])
            .inc_by(d_abstain);
        self.broadcaster_no_subscribers_total.inc_by(d_no_subs);
        self.broadcaster_was_recommended_total.inc_by(d_rec);

        // (removed) lagged frames.
        let lagged = bm.lagged_frames_total.load(Ordering::Relaxed);
        let d_lagged = lagged.saturating_sub(self.last_broadcaster.lagged_frames_total);
        self.broadcaster_lagged_frames_total.inc_by(d_lagged);

        self.last_broadcaster.trade_published_total = trade;
        self.last_broadcaster.abstain_published_total = abstain;
        self.last_broadcaster.no_subscribers_total = no_subs;
        self.last_broadcaster.was_recommended_publications = recommended;
        self.last_broadcaster.published_total = bm.published_total.load(Ordering::Relaxed);
        self.last_broadcaster.lagged_frames_total = lagged;
    }

    /// Atualiza métricas econômicas a partir de `EconomicMetrics`.
    pub fn update_from_economic(&mut self, em: &EconomicMetrics) {
        let emissions = em.n_emissions_total.load(Ordering::Relaxed);
        let realized = em.n_realized_total.load(Ordering::Relaxed);
        let exit_miss = em.n_exit_miss_total.load(Ordering::Relaxed);
        let censored = em.n_censored_total.load(Ordering::Relaxed);
        let pnl_x10k = em.pnl_aggregated_usd_times_10k.load(Ordering::Relaxed);

        let d_emissions = emissions.saturating_sub(self.last_economic.n_emissions_total);
        let d_realized = realized.saturating_sub(self.last_economic.n_realized_total);
        let d_exit_miss = exit_miss.saturating_sub(self.last_economic.n_exit_miss_total);
        let d_censored = censored.saturating_sub(self.last_economic.n_censored_total);

        self.economic_emissions_total.inc_by(d_emissions);
        self.economic_outcomes_total
            .with_label_values(&["realized"])
            .inc_by(d_realized);
        self.economic_outcomes_total
            .with_label_values(&["exit_miss"])
            .inc_by(d_exit_miss);
        self.economic_outcomes_total
            .with_label_values(&["censored"])
            .inc_by(d_censored);

        let pnl_usd = (pnl_x10k as f64) / 10_000.0;
        self.economic_pnl_aggregated_usd.set(pnl_usd);

        let ece_bps = em.calibration_ece_bps.load(Ordering::Relaxed);
        self.calibration_ece.set((ece_bps as f64) / 10_000.0);
        let obs = em.calibration_observations.load(Ordering::Relaxed);
        self.calibration_observations.set(obs as i64);

        // Taxa de exit miss acumulada: `exit_miss / observed_emissions`.
        // Censurados não entram no denominador (horizonte não observável).
        let observed_emissions = emissions.saturating_sub(censored);
        let exit_miss_rate = if observed_emissions > 0 {
            (exit_miss as f64) / (observed_emissions as f64)
        } else {
            0.0
        };
        self.premature_recommendation_rate.set(exit_miss_rate);

        self.last_economic.n_emissions_total = emissions;
        self.last_economic.n_realized_total = realized;
        self.last_economic.n_exit_miss_total = exit_miss;
        self.last_economic.n_censored_total = censored;
        self.last_economic.pnl_aggregated_usd_times_10k = pnl_x10k;
    }
}

fn snapshot(m: &Arc<ServerMetrics>) -> ServerMetricsSnapshot {
    ServerMetricsSnapshot {
        opportunities_seen: m.opportunities_seen.load(Ordering::Relaxed),
        sample_accepts: m.sample_accepts.load(Ordering::Relaxed),
        sample_rejects_low_volume: m.sample_rejects_low_volume.load(Ordering::Relaxed),
        sample_rejects_insufficient_history: m
            .sample_rejects_insufficient_history
            .load(Ordering::Relaxed),
        sample_rejects_below_tail: m.sample_rejects_below_tail.load(Ordering::Relaxed),
        rec_trade_total: m.rec_trade_total.load(Ordering::Relaxed),
        rec_abstain_no_opportunity: m.rec_abstain_no_opportunity.load(Ordering::Relaxed),
        rec_abstain_insufficient_data: m.rec_abstain_insufficient_data.load(Ordering::Relaxed),
        rec_abstain_low_confidence: m.rec_abstain_low_confidence.load(Ordering::Relaxed),
        rec_abstain_long_tail: m.rec_abstain_long_tail.load(Ordering::Relaxed),
        raw_samples_emitted: m.raw_samples_emitted.load(Ordering::Relaxed),
        raw_samples_emitted_allowlist: m.raw_samples_emitted_allowlist.load(Ordering::Relaxed),
        raw_samples_emitted_priority: m.raw_samples_emitted_priority.load(Ordering::Relaxed),
        raw_samples_emitted_decimated_uniform: m
            .raw_samples_emitted_decimated_uniform
            .load(Ordering::Relaxed),
        raw_samples_dropped_channel_full: m
            .raw_samples_dropped_channel_full
            .load(Ordering::Relaxed),
        raw_samples_dropped_channel_closed: m
            .raw_samples_dropped_channel_closed
            .load(Ordering::Relaxed),
        // Wave U.
        rec_invariant_blocked: m.rec_invariant_blocked.load(Ordering::Relaxed),
        accepted_samples_dropped_channel_full: m
            .accepted_samples_dropped_channel_full
            .load(Ordering::Relaxed),
        accepted_samples_dropped_channel_closed: m
            .accepted_samples_dropped_channel_closed
            .load(Ordering::Relaxed),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::baseline::{BaselineA3, BaselineConfig};
    use crate::ml::contract::RouteId;
    use crate::ml::feature_store::HotQueryCache;
    use crate::ml::trigger::{SamplingConfig, SamplingTrigger};
    use crate::types::{SymbolId, Venue};

    fn mk_server() -> MlServer {
        use crate::ml::feature_store::hot_cache::CacheConfig;
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

    #[test]
    fn register_creates_all_metrics() {
        let registry = Registry::new();
        let _m = MlPrometheusMetrics::register(&registry).expect("register");
        // Coleta e verifica nomes presentes.
        let families = registry.gather();
        let names: Vec<String> = families.iter().map(|f| f.get_name().to_string()).collect();
        assert!(names.contains(&"ml_opportunities_seen_total".to_string()));
        assert!(names.contains(&"ml_sample_decisions_total".to_string()));
        assert!(names.contains(&"ml_recommendations_total".to_string()));
        assert!(names.contains(&"ml_cache_routes_tracked".to_string()));
        assert!(names.contains(&"ml_raw_samples_emitted_by_tier_total".to_string()));
        // F2-R4
        assert!(names.contains(&"ml_premature_recommendation_rate".to_string()));
    }

    #[test]
    fn premature_recommendation_rate_is_window_miss_over_emissions() {
        use crate::ml::contract::{
            BaselineDiagnostics, CalibStatus, ReasonKind, TradeReason, TradeSetup,
        };
        use crate::ml::economic::{EconomicAccumulator, EconomicEvent, TradeOutcome};

        let registry = Registry::new();
        let mut m = MlPrometheusMetrics::register(&registry).expect("register");
        let mut acc = EconomicAccumulator::new();

        fn mk_setup(emitted_at: u64) -> TradeSetup {
            TradeSetup {
                route_id: RouteId {
                    symbol_id: SymbolId(1),
                    buy_venue: Venue::MexcFut,
                    sell_venue: Venue::BingxFut,
                },
                entry_now: 2.0,
                exit_target: -1.0,
                gross_profit_target: 1.0,
                p_hit: None,
                p_hit_ci: None,
                exit_q25: None,
                exit_q50: None,
                exit_q75: None,
                t_hit_p25_s: None,
                t_hit_median_s: None,
                t_hit_p75_s: None,
                p_censor: None,
                baseline_diagnostics: Some(BaselineDiagnostics {
                    enter_at_min: 1.8,
                    enter_typical: 2.0,
                    enter_peak_p95: 2.8,
                    p_enter_hit: 0.9,
                    exit_at_min: -1.2,
                    exit_typical: -1.0,
                    p_exit_hit_given_enter: 0.85,
                    gross_profit_p10: 0.6,
                    gross_profit_p25: 0.7,
                    gross_profit_median: 1.0,
                    gross_profit_p75: 1.5,
                    gross_profit_p90: 2.3,
                    gross_profit_p95: 2.8,
                    historical_base_rate_24h: 0.7,
                    historical_base_rate_ci: (0.65, 0.75),
                }),
                cluster_id: None,
                cluster_size: 1,
                cluster_rank: 1,
                cluster_detection_status: "not_implemented",
                calibration_status: CalibStatus::Degraded,
                reason: TradeReason {
                    kind: ReasonKind::Combined,
                    detail: crate::ml::ReasonDetail::placeholder(),
                },
                ci_method: "wilson_marginal",
                model_version: "baseline-a3-0.2.0".into(),
                source_kind: crate::ml::contract::SourceKind::Baseline,
                emitted_at,
                valid_until: emitted_at + 30_000_000_000,
            }
        }

        // 10 emissões: 3 realized, 7 window_miss.
        for i in 0..3u64 {
            acc.push(EconomicEvent::new(
                &mk_setup(1_000_000_000 + i * 1_000_000_000),
                TradeOutcome::Realized {
                    exit_realized_pct: -1.0,
                    horizon_observed_ms: 100,
                },
                2_000_000_000 + i * 1_000_000_000,
            ));
        }
        for i in 0..7u64 {
            acc.push(EconomicEvent::new(
                &mk_setup(10_000_000_000 + i * 1_000_000_000),
                TradeOutcome::ExitMiss { forced_exit_pct: -2.0 },
                11_000_000_000 + i * 1_000_000_000,
            ));
        }

        m.update_from_economic(&acc.metrics());
        // 7 exit_miss / 10 emissions = 0.7
        let rate = m.premature_recommendation_rate.get();
        assert!(
            (rate - 0.7).abs() < 1e-6,
            "premature rate esperado 0.7; observado {}",
            rate
        );
    }

    #[test]
    fn premature_recommendation_rate_is_zero_without_emissions() {
        use crate::ml::economic::EconomicAccumulator;
        let registry = Registry::new();
        let mut m = MlPrometheusMetrics::register(&registry).expect("register");
        let acc = EconomicAccumulator::new();
        m.update_from_economic(&acc.metrics());
        assert_eq!(m.premature_recommendation_rate.get(), 0.0);
    }

    #[test]
    fn double_register_fails() {
        let registry = Registry::new();
        let _m1 = MlPrometheusMetrics::register(&registry).expect("first");
        let m2 = MlPrometheusMetrics::register(&registry);
        assert!(m2.is_err(), "second register should fail");
    }

    #[test]
    fn update_propagates_server_counters() {
        let registry = Registry::new();
        let mut m = MlPrometheusMetrics::register(&registry).expect("register");
        let server = mk_server();
        let route = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        for i in 0..5 {
            server.on_opportunity(i as u32, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6, i);
        }
        m.update_from_server(&server);
        assert_eq!(m.opportunities_seen_total.get(), 5);
        assert_eq!(
            m.sample_decisions_total
                .with_label_values(&["insufficient_history"])
                .get(),
            5
        );

        server
            .metrics()
            .raw_samples_emitted_allowlist
            .fetch_add(2, Ordering::Relaxed);
        server
            .metrics()
            .raw_samples_emitted_priority
            .fetch_add(3, Ordering::Relaxed);
        server
            .metrics()
            .raw_samples_emitted_decimated_uniform
            .fetch_add(4, Ordering::Relaxed);
        m.update_from_server(&server);
        assert_eq!(
            m.raw_samples_emitted_by_tier_total
                .with_label_values(&["allowlist"])
                .get(),
            2
        );
        assert_eq!(
            m.raw_samples_emitted_by_tier_total
                .with_label_values(&["priority"])
                .get(),
            3
        );
        assert_eq!(
            m.raw_samples_emitted_by_tier_total
                .with_label_values(&["decimated_uniform"])
                .get(),
            4
        );
    }

    #[test]
    fn update_idempotent_with_no_delta() {
        let registry = Registry::new();
        let mut m = MlPrometheusMetrics::register(&registry).expect("register");
        let server = mk_server();
        let route = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        server.on_opportunity(0, route, "BTC-USDT", 2.5, -0.8, 1e6, 1e6, 1);
        m.update_from_server(&server);
        let before = m.opportunities_seen_total.get();
        // Chamar de novo sem nova observação — delta 0.
        m.update_from_server(&server);
        let after = m.opportunities_seen_total.get();
        assert_eq!(before, after, "idempotent update");
    }

    #[tokio::test]
    async fn runtime_update_includes_broadcaster_counters() {
        use crate::ml::broadcast::RecommendationBroadcaster;
        use crate::ml::contract::{
            BaselineDiagnostics, CalibStatus, ReasonKind, Recommendation, TradeReason, TradeSetup,
        };

        let registry = Registry::new();
        let mut m = MlPrometheusMetrics::register(&registry).expect("register");
        let server = mk_server();
        let broadcaster = RecommendationBroadcaster::new();
        let mut rx = broadcaster.subscribe();
        let route = RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        let rec = Recommendation::Trade(TradeSetup {
            route_id: route,
            entry_now: 2.0,
            exit_target: -1.0,
            gross_profit_target: 1.0,
            p_hit: Some(0.83),
            p_hit_ci: Some((0.77, 0.88)),
            exit_q25: Some(-1.4),
            exit_q50: Some(-1.0),
            exit_q75: Some(-0.7),
            t_hit_p25_s: Some(900),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(3120),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
                enter_at_min: 1.8,
                enter_typical: 2.0,
                enter_peak_p95: 2.8,
                p_enter_hit: 0.9,
                exit_at_min: -1.2,
                exit_typical: -1.0,
                p_exit_hit_given_enter: 0.85,
                gross_profit_p10: 0.6,
                gross_profit_p25: 0.7,
                gross_profit_median: 1.0,
                gross_profit_p75: 1.5,
                gross_profit_p90: 2.3,
                gross_profit_p95: 2.8,
                historical_base_rate_24h: 0.77,
                historical_base_rate_ci: (0.70, 0.82),
            }),
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            cluster_detection_status: "not_implemented",
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: crate::ml::ReasonDetail::placeholder(),
            },
            ci_method: "wilson_marginal",
            model_version: "baseline-a3-0.2.0".into(),
            source_kind: crate::ml::contract::SourceKind::Baseline,
            emitted_at: 1_700_000_000_000_000_000,
            valid_until: 1_700_000_150_000_000_000,
        });

        assert!(broadcaster.publish(7, 123, route, "BTC-USDT", &rec));
        let _ = rx.recv().await.expect("frame");

        m.update_from_runtime(&server, Some(&broadcaster), None, None);

        assert_eq!(
            m.broadcaster_published_total
                .with_label_values(&["trade"])
                .get(),
            1
        );
        assert_eq!(m.broadcaster_was_recommended_total.get(), 1);
    }
}
