pub mod adapter;
pub mod book;
pub mod broadcast;
pub mod config;
pub mod decode;
pub mod discovery;
pub mod error;
pub mod ml;
pub mod normalize;
pub mod obs;
pub mod spread;
pub mod types;

pub use config::Config;
pub use error::{Error, Result};

use std::sync::Arc;
use std::time::Duration;

use tracing::{info, warn};

use crate::adapter::Adapter;
use crate::book::BookStore;
use crate::broadcast::server::BroadcastState;
use crate::broadcast::VolStore;
use crate::discovery::SymbolUniverse;
use crate::ml::baseline::{BaselineA3, BaselineConfig};
use crate::ml::broadcast::RecommendationBroadcaster;
use crate::ml::contract::RouteId;
use crate::ml::feature_store::HotQueryCache;
use crate::ml::metrics::MlPrometheusMetrics;
use crate::ml::persistence::{
    JsonlWriter, RawSampleWriter, RawWriterConfig, WriterConfig, WriterHandle,
    WriterSendError,
};
use crate::ml::serving::MlServer;
use crate::ml::trigger::SamplingTrigger;
use crate::spread::engine::{
    new_stale_table, scan_once_with_observer, Opportunity, ScanCounters, StaleTable,
};
use crate::types::now_ns;

#[inline]
fn should_mark_sample_recommended(rec: &crate::ml::contract::Recommendation) -> bool {
    matches!(rec, crate::ml::contract::Recommendation::Trade(_))
}

/// Top-level entry point. Wires: discovery → book store → adapters →
/// spread engine → broadcast server.
pub async fn run(cfg: Config) -> anyhow::Result<()> {
    obs::Metrics::init();

    // --- Symbol discovery (REST, parallel per-venue) ---
    let http = reqwest::Client::builder()
        .user_agent("scanner/0.1")
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| Error::Other(format!("http client: {}", e)))?;
    let discoverers = discovery::orchestrator::default_discoverers();
    let universe = discovery::orchestrator::discover_all(&cfg.venues, &http, discoverers).await?;
    info!(symbols = universe.len(), "symbol universe ready");

    // --- Book store + staleness table + vol store ---
    let n_symbols = (universe.len() as u32).max(cfg.limits.max_symbols);
    let store = Arc::new(BookStore::with_capacity(n_symbols));
    let stale = new_stale_table(n_symbols);
    let vol   = Arc::new(VolStore::with_capacity(n_symbols));
    info!(n_symbols, "book store + staleness table + vol store allocated");

    // --- Scan counters (shared with /api/spread/debug) ---
    let counters = Arc::new(ScanCounters::default());

    // --- ML Recommendation broadcaster ---
    // Criado cedo para ser anexado ao `BroadcastState` e ao engine.
    // Canal `tokio::sync::broadcast` cap 512; não bloqueia em backpressure.
    // Resolve lacuna "Recommendation descartada em lib.rs" (Wave T).
    let ml_broadcaster = RecommendationBroadcaster::new();

    // --- Broadcast state + server ---
    let bstate = BroadcastState::new()
        .with_refs(
            Arc::clone(&universe),
            Arc::clone(&store),
            Arc::clone(&stale),
            Arc::clone(&counters),
            Arc::clone(&vol),
        )
        .with_ml_broadcaster(ml_broadcaster.clone());
    let addr: std::net::SocketAddr = cfg.bind.parse()
        .map_err(|e| Error::Config(format!("invalid bind {:?}: {}", cfg.bind, e)))?;
    {
        let bs = bstate.clone();
        let frontend = cfg.frontend_dir.clone();
        tokio::spawn(async move {
            if let Err(e) = broadcast::server::serve(addr, bs, frontend).await {
                warn!("broadcast server terminated: {}", e);
            }
        });
    }

    // --- Adapters ---
    spawn_adapters(&cfg, Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol), Arc::clone(&store));

    // --- REST vol poller (fills VolStore for venues whose WS omits 24h vol) ---
    {
        let u = Arc::clone(&universe);
        let v = Arc::clone(&vol);
        tokio::spawn(async move { adapter::vol_poller::run(u, v).await; });
    }

    // --- ML recomendador (M1.7) ---
    // Módulo `ml` roda inline no loop do spread engine — baseline A3 tem
    // latência ~1–5 µs/opp, desprezível vs ciclo 150 ms. Não altera a
    // lógica de emissão de oportunidades; apenas observa spreads no
    // HotQueryCache e produz `Recommendation` (logadas; broadcast em
    // iteração futura). Se o módulo ML falhar, scanner continua normal.
    let ml_cache = HotQueryCache::new();
    let ml_baseline = BaselineA3::new(ml_cache, BaselineConfig::default());

    // --- ML RawSample writer (ADR-025) ---
    // Stream contínuo pré-trigger, decimado 1-in-10 por rota, para medição
    // não-enviesada dos gates empíricos E1/E2/E4/E6/E8/E10/E11 do Marco 0.
    // Paralelo ao AcceptedSample writer; ambos usam Hive-style partitioning.
    //
    // Fix pós-auditoria: log ABSOLUTO do path data_dir no startup.
    // Default é relativo ("data/ml/..."), dependendo do CWD — primeira
    // coleta podia "sumir" silenciosamente no disco errado.
    let raw_writer_cfg = RawWriterConfig::default();
    let raw_writer_abs = std::env::current_dir()
        .map(|cwd| cwd.join(&raw_writer_cfg.data_dir))
        .unwrap_or_else(|_| raw_writer_cfg.data_dir.clone());
    info!(
        abs_path = %raw_writer_abs.display(),
        cap = raw_writer_cfg.channel_capacity,
        "ML raw writer — path absoluto"
    );
    let (ml_raw_writer, ml_raw_writer_handle) =
        RawSampleWriter::create(raw_writer_cfg);
    tokio::spawn(async move { ml_raw_writer.run().await; });

    let ml_server = Arc::new(
        MlServer::new(ml_baseline, SamplingTrigger::with_defaults())
            .with_raw_writer(ml_raw_writer_handle),
    );
    let ml_metrics_opt = match MlPrometheusMetrics::register(&obs::Metrics::init().registry) {
        Ok(m) => {
            info!("ML prometheus metrics registered");
            Some(m)
        }
        Err(e) => {
            warn!("ML prometheus register failed: {} — métricas ML indisponíveis", e);
            None
        }
    };
    if let Some(mut metrics) = ml_metrics_opt {
        let server_for_metrics = Arc::clone(&ml_server);
        let broadcaster_for_metrics = ml_broadcaster.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_secs(1));
            loop {
                tick.tick().await;
                metrics.update_from_runtime(
                    &server_for_metrics,
                    Some(&broadcaster_for_metrics),
                    None,
                );
            }
        });
    }

    // --- ML dataset writer (C1 fix) ---
    // Consumer task que grava cada `AcceptedSample` em JSONL rotativa
    // horária em `{data_dir}/year=YYYY/month=MM/day=DD/hour=HH/`. Alimenta
    // o dataset de treino do modelo A2 (Marco 2). Canal bounded 100k
    // amortece picos de ~100 min a 17 req/s.
    //
    // Fix pós-auditoria: log ABSOLUTO do path.
    let writer_cfg = WriterConfig::default();
    let writer_abs = std::env::current_dir()
        .map(|cwd| cwd.join(&writer_cfg.data_dir))
        .unwrap_or_else(|_| writer_cfg.data_dir.clone());
    info!(
        abs_path = %writer_abs.display(),
        cap = writer_cfg.channel_capacity,
        "ML accepted writer — path absoluto"
    );
    let (ml_writer, ml_writer_handle) = JsonlWriter::create(writer_cfg);
    tokio::spawn(async move { ml_writer.run().await; });

    // --- Spread engine loop (150ms) ---
    let u_engine  = Arc::clone(&universe);
    let s_engine  = Arc::clone(&store);
    let st_engine = Arc::clone(&stale);
    let v_engine  = Arc::clone(&vol);
    let threshold = cfg.entry_threshold_pct;
    let max_spread = cfg.max_spread_pct;
    let min_vol = cfg.min_vol_usd;
    let broadcast_ms = cfg.broadcast_ms;
    let c_engine = Arc::clone(&counters);
    let ml_engine = Arc::clone(&ml_server);
    let ml_writer_engine = ml_writer_handle.clone();
    let ml_broadcaster_engine = ml_broadcaster.clone();
    run_spread_engine(u_engine, s_engine, st_engine, v_engine, c_engine, threshold, max_spread, min_vol, broadcast_ms, bstate, ml_engine, ml_writer_engine, ml_broadcaster_engine).await;
    Ok(())
}

fn spawn_adapters(
    cfg:       &Config,
    universe:  Arc<SymbolUniverse>,
    stale:     Arc<StaleTable>,
    vol:       Arc<VolStore>,
    store:     Arc<BookStore>,
) {
    let _ = vol;  // consumed below per-venue where applicable
    use crate::types::Venue;

    if cfg.venues.is_enabled(Venue::BinanceSpot) {
        let a = adapter::binance_spot::BinanceSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("binance-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::GateSpot) {
        let a = adapter::gate_spot::GateSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("gate-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BitgetSpot) {
        let a = adapter::bitget::BitgetAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), cfg.bitget_mode);
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bitget-spot adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BitgetFut) {
        let a = adapter::bitget_fut::BitgetFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), cfg.bitget_mode);
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("bitget-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::MexcFut) {
        let a = adapter::mexc_fut::MexcFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("mexc-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::GateFut) {
        let a = adapter::gate_fut::GateFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await {
                warn!("gate-fut adapter exited: {}", e);
            }
        });
    }
    if cfg.venues.is_enabled(Venue::BinanceFut) {
        let a = adapter::binance_fut::BinanceFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("binance-fut adapter exited: {}", e); }
        });
    }
    // (mexc-spot is handled below via REST polling)
    if cfg.venues.is_enabled(Venue::BingxSpot) {
        let a = adapter::bingx_spot::BingxSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("bingx-spot adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::BingxFut) {
        let a = adapter::bingx_fut::BingxFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("bingx-fut adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::XtSpot) {
        let a = adapter::xt_spot::XtSpotAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("xt-spot adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::XtFut) {
        let a = adapter::xt_fut::XtFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("xt-fut adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::KucoinSpot) && cfg.kucoin_mode != crate::config::KucoinMode::Disabled {
        let a = adapter::kucoin::KucoinAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("kucoin-spot adapter exited: {}", e); }
        });
    }
    if cfg.venues.is_enabled(Venue::KucoinFut) && cfg.kucoin_mode != crate::config::KucoinMode::Disabled {
        let a = adapter::kucoin_fut::KucoinFutAdapter::new(
            Arc::clone(&universe), Arc::clone(&stale), Arc::clone(&vol));
        let store = Arc::clone(&store);
        tokio::spawn(async move {
            if let Err(e) = a.run(&store).await { warn!("kucoin-fut adapter exited: {}", e); }
        });
    }

    // MEXC spot is a REST-polled adapter (WS is Protobuf-only; REST at 1s
    // gives complete coverage with simpler decode).
    if cfg.venues.is_enabled(Venue::MexcSpot) {
        let u = Arc::clone(&universe);
        let st = Arc::clone(&stale);
        let s = Arc::clone(&store);
        tokio::spawn(async move {
            adapter::mexc_spot_rest::run(u, st, s).await;
        });
    }

    // All 14 venues covered: Binance Spot+Fut, MEXC Spot(REST)+Fut,
    // BingX Spot+Fut, Gate Spot+Fut, KuCoin Spot+Fut, XT Spot+Fut, Bitget Spot+Fut.
}

async fn run_spread_engine(
    universe:         Arc<SymbolUniverse>,
    store:            Arc<BookStore>,
    stale:            Arc<StaleTable>,
    vol:              Arc<VolStore>,
    counters:         Arc<ScanCounters>,
    threshold_pct:    f64,
    max_spread_pct:   f64,
    min_vol_usd:      f64,
    broadcast_ms:     u64,
    bstate:           BroadcastState,
    ml_server:        Arc<MlServer>,
    ml_writer:        WriterHandle,
    ml_broadcaster:   RecommendationBroadcaster,
) {
    let mut buf: Vec<Opportunity> = Vec::with_capacity(1024);
    let mut ml_observations: Vec<Opportunity> = Vec::with_capacity(4096);
    let mut tick = tokio::time::interval(Duration::from_millis(broadcast_ms));
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        tick.tick().await;
        let t0 = std::time::Instant::now();
        buf.clear();
        ml_observations.clear();
        scan_once_with_observer(
            &universe,
            &store,
            &stale,
            &vol,
            threshold_pct,
            max_spread_pct,
            min_vol_usd,
            &counters,
            &mut buf,
            |opp| ml_observations.push(opp.clone()),
        );
        let elapsed_ns = t0.elapsed().as_nanos() as u64;
        obs::Metrics::init().record_cycle(elapsed_ns);

        let count = buf.len();
        if count > 0 {
            obs::Metrics::init().opportunities_total.inc_by(count as u64);
        }

        // --- ML pass (M1.7 shadow mode inline) ---
        // Alimenta HotQueryCache + aciona baseline A3 + broadcast
        // `Recommendation` via `RecommendationBroadcaster` (pós-Wave T:
        // resolve lacuna de `_rec` descartado). Se o broadcast encontra
        // ao menos 1 consumer, `AcceptedSample.was_recommended` vira um
        // proxy de entrega antes da persistência.
        //
        // Latência ~1–5 µs por opp; para 50–200 opps por ciclo, overhead
        // total <1 ms em budget de 150 ms.
        let now = now_ns();
        let cycle_seq = ml_server.begin_cycle();
        for opp in &buf {
            let route = RouteId {
                symbol_id:  opp.symbol_id,
                buy_venue:  opp.buy_venue,
                sell_venue: opp.sell_venue,
            };
            // ADR-029: resolver nome canonical ESTÁVEL (entre runs) via universe.
            // Sem isso, SymbolId muda entre runs e dados ficam inúteis
            // retrospectivamente.
            let symbol_name = universe.canonical_name_of(opp.symbol_id);
            // Fix pós-auditoria: `halt_active_external=false` aqui é OK
            // porque `MlServer::on_opportunity` computa o proxy de halt
            // internamente via `detect_halt_proxy(buy_age, sell_age)`.
            // Hook operacional externo (admin halts manuais) pode ser
            // ligado via campo dedicado no futuro.
            let (rec, _dec, accepted) = ml_server.on_opportunity(
                cycle_seq,
                route,
                &symbol_name,
                opp.entry_spread as f32,
                opp.exit_spread as f32,
                opp.buy_book_age.min(u32::MAX as u64) as u32,
                opp.sell_book_age.min(u32::MAX as u64) as u32,
                opp.buy_vol24,
                opp.sell_vol24,
                false, // halt_active_external; interno via book_age proxy
                now,
            );
            // Publica recomendação no canal broadcast para consumers WS /
            // REST. Entrega ao consumer é observabilidade; o dataset não
            // pode depender da presença de uma UI conectada.
            let _had_active_consumers =
                ml_broadcaster.publish(cycle_seq, now, route, symbol_name.as_str(), &rec);

            // **C1 + C4 fix** — enfileira AcceptedSample para JSONL writer
            // quando trigger aceitou, com flag `was_recommended`
            // refletindo a emissão real de `TradeSetup`, não o estado do
            // WebSocket/UI no instante.
            //
            // Fix pós-auditoria: drops do canal agora contados em métricas
            // `accepted_samples_dropped_channel_full/closed`. Antes eram
            // silenciosos (`let _ = ...`), causando perdas invisíveis
            // durante bursts ou writer travado.
            if let Some(mut sample) = accepted {
                if should_mark_sample_recommended(&rec) {
                    sample.mark_recommended();
                }
                if let Err(e) = ml_writer.try_send(sample) {
                    let metrics = ml_server.metrics();
                    match e {
                        WriterSendError::ChannelFull => {
                            metrics
                                .accepted_samples_dropped_channel_full
                                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                        }
                        WriterSendError::ChannelClosed => {
                            metrics
                                .accepted_samples_dropped_channel_closed
                                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                        }
                    }
                }
            }
        }

        // Feed ML/cache with valid route observations that were below the UI
        // opportunity threshold. This runs after the thresholded
        // `on_opportunity` pass to preserve point-in-time behavior for
        // recommendations emitted this cycle.
        for opp in &ml_observations {
            if opp.entry_spread >= threshold_pct {
                continue;
            }
            let route = RouteId {
                symbol_id:  opp.symbol_id,
                buy_venue:  opp.buy_venue,
                sell_venue: opp.sell_venue,
            };
            let symbol_name = universe.canonical_name_of(opp.symbol_id);
            ml_server.observe_background(
                cycle_seq,
                route,
                &symbol_name,
                opp.entry_spread as f32,
                opp.exit_spread as f32,
                opp.buy_book_age.min(u32::MAX as u64) as u32,
                opp.sell_book_age.min(u32::MAX as u64) as u32,
                opp.buy_vol24,
                opp.sell_vol24,
                false,
                now,
            );
        }

        // Move buf contents into DTOs; reuse allocation on next cycle.
        let snapshot: Vec<Opportunity> = std::mem::take(&mut buf);
        buf = Vec::with_capacity(count.max(1024));
        bstate.publish(snapshot);
    }
}

#[cfg(test)]
mod tests {
    use crate::ml::contract::{
        AbstainDiagnostic, AbstainReason, CalibStatus, ReasonKind, Recommendation,
        RouteId, ToxicityLevel, TradeReason, TradeSetup,
    };
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(1),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_trade() -> Recommendation {
        Recommendation::Trade(TradeSetup {
            route_id: mk_route(),
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
            realization_probability: 0.77,
            confidence_interval: (0.70, 0.82),
            horizon_p05_s: 720,
            horizon_median_s: 1680,
            horizon_p95_s: 6000,
            toxicity_level: ToxicityLevel::Healthy,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            haircut_predicted: 0.25,
            gross_profit_realizable_median: 0.75,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: "test".into(),
            },
            model_version: "a3-0.1.0".into(),
            emitted_at: 1_700_000_000_000_000_000,
            valid_until: 1_700_000_150_000_000_000,
        })
    }

    fn mk_abstain() -> Recommendation {
        Recommendation::Abstain {
            reason: AbstainReason::LowConfidence,
            diagnostic: AbstainDiagnostic {
                n_observations: 100,
                ci_width_if_emitted: Some(0.4),
                nearest_feasible_utility: None,
                tail_ratio_p99_p95: None,
                model_version: "a3-0.1.0".into(),
                regime_posterior: [0.6, 0.3, 0.1],
            },
        }
    }

    #[test]
    fn only_trade_recommendations_mark_samples_as_recommended() {
        assert!(super::should_mark_sample_recommended(&mk_trade()));
        assert!(!super::should_mark_sample_recommended(&mk_abstain()));
    }
}
