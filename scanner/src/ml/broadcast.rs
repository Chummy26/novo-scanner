//! Broadcaster de `Recommendation` para consumidores WebSocket/REST.
//!
//! Resolve a lacuna **`lib.rs:347` — Recommendation descartada** (crítica
//! equipe: "Recommendation é produzido e descartado; o broadcast continua
//! mandando apenas OpportunityDto bruto"). Agora cada Recommendation
//! emitida pelo `MlServer` flui para:
//!
//! - `tokio::sync::broadcast::Receiver<Arc<RecommendationFrame>>` →
//!   handlers WS `/ws/ml/recommendations`.
//! - Contador atômico `was_recommended_publications` exposto em métricas.
//!
//! Capacidade do canal: 512 mensagens (suficiente para lag temporário de
//! consumer; se lotar, consumer perde mensagens mas o publisher não bloqueia
//! — é o comportamento correto para hot path).

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use tokio::sync::broadcast;

use crate::ml::contract::{Recommendation, RouteId};
use crate::ml::dto::RecommendationDto;

/// Capacidade default do canal broadcast. Tamanho escolhido para cobrir
/// até ~3 s de lag (2600 rotas × 0.2 s ciclo ÷ 2 = 500 mensagens).
pub const DEFAULT_CHANNEL_CAPACITY: usize = 512;

/// Frame publicado no canal broadcast.
///
/// Carrega `RecommendationDto` pré-serializável + metadata de contexto
/// (cycle_seq + ts). Consumer WS apenas chama `serde_json::to_string(&dto)`
/// para enviar; zero trabalho adicional por consumer.
#[derive(Debug, Clone)]
pub struct RecommendationFrame {
    pub cycle_seq: u32,
    pub emitted_at_ns: u64,
    pub route_id: RouteId,
    pub symbol_name: String,
    pub dto: RecommendationDto,
}

impl RecommendationFrame {
    pub fn from_recommendation(
        cycle_seq: u32,
        emitted_at_ns: u64,
        route_id: RouteId,
        symbol_name: impl Into<String>,
        rec: &Recommendation,
    ) -> Self {
        Self {
            cycle_seq,
            emitted_at_ns,
            route_id,
            symbol_name: symbol_name.into(),
            dto: RecommendationDto::from(rec),
        }
    }

    /// Serializa o DTO para linha JSON — usado pelo WS handler.
    pub fn to_json_string(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(&self.dto)
    }

    /// Serializa um envelope compatível com a UI legado do scanner.
    ///
    /// A tela atual ainda consome o dialeto "opportunity" do scanner bruto.
    /// Para evitar reescrever a SPA neste momento, o websocket de ML emite
    /// um envelope equivalente, com o `RecommendationDto` preservado em `ml`
    /// para consumidores mais novos.
    pub fn to_scanner_like_json_string(&self) -> Result<String, serde_json::Error> {
        let timestamp = iso8601_from_ns(self.emitted_at_ns);
        let body = match &self.dto {
            RecommendationDto::Trade(setup) => serde_json::json!({
                "type": "opportunity",
                "timestamp": timestamp,
                "data": [{
                    "symbol": &self.symbol_name,
                    "current": "USDT",
                    "buyFrom": setup.route_id.buy_venue,
                    "sellTo": setup.route_id.sell_venue,
                    "buyType": setup.route_id.buy_market,
                    "sellType": setup.route_id.sell_market,
                    "buyPrice": setup.enter_typical,
                    "sellPrice": setup.exit_typical,
                    "entrySpread": setup.enter_at_min,
                    "exitSpread": setup.exit_at_min,
                    "buyVol24": 0.0,
                    "sellVol24": 0.0,
                    "buyBookAge": 0,
                    "sellBookAge": 0,
                    "ml": &self.dto,
                }],
            }),
            RecommendationDto::Abstain { .. } => serde_json::json!({
                "type": "opportunity",
                "timestamp": timestamp,
                "data": [],
                "ml": &self.dto,
            }),
        };
        serde_json::to_string(&body)
    }
}

/// Broadcaster que aceita `Recommendation` via `publish()` e serve
/// consumidores via `subscribe()`.
#[derive(Clone)]
pub struct RecommendationBroadcaster {
    tx: broadcast::Sender<Arc<RecommendationFrame>>,
    metrics: Arc<BroadcasterMetrics>,
}

/// Contadores atômicos para observabilidade.
#[derive(Debug, Default)]
pub struct BroadcasterMetrics {
    pub published_total: AtomicU64,
    pub trade_published_total: AtomicU64,
    pub abstain_published_total: AtomicU64,
    /// Contagem de publicações quando não havia consumers inscritos.
    /// `broadcast::Sender::send` retorna Err(SendError) nesse caso;
    /// não é erro real, apenas sinaliza ausência de listeners.
    pub no_subscribers_total: AtomicU64,
    /// Quando `publish` encontrou ≥ 1 consumer no instante do envio.
    /// É proxy de entrega, não confirmação de leitura humana.
    pub was_recommended_publications: AtomicU64,
}

impl RecommendationBroadcaster {
    pub fn new() -> Self {
        Self::with_capacity(DEFAULT_CHANNEL_CAPACITY)
    }

    pub fn with_capacity(cap: usize) -> Self {
        let (tx, _) = broadcast::channel(cap);
        Self {
            tx,
            metrics: Arc::new(BroadcasterMetrics::default()),
        }
    }

    pub fn metrics(&self) -> Arc<BroadcasterMetrics> {
        Arc::clone(&self.metrics)
    }

    /// Registra novo consumer.
    pub fn subscribe(&self) -> broadcast::Receiver<Arc<RecommendationFrame>> {
        self.tx.subscribe()
    }

    /// Publica recomendação. Retorna `true` se houve ≥ 1 consumer.
    ///
    /// Hot path: chamada por ciclo do scanner (150 ms). Não bloqueia;
    /// consumer lento pode perder mensagens (bounded channel).
    pub fn publish(
        &self,
        cycle_seq: u32,
        emitted_at_ns: u64,
        route_id: RouteId,
        symbol_name: impl Into<String>,
        rec: &Recommendation,
    ) -> bool {
        let frame = RecommendationFrame::from_recommendation(
            cycle_seq, emitted_at_ns, route_id, symbol_name, rec,
        );
        match rec {
            Recommendation::Trade(_) => {
                self.metrics.trade_published_total.fetch_add(1, Ordering::Relaxed);
            }
            Recommendation::Abstain { .. } => {
                self.metrics.abstain_published_total.fetch_add(1, Ordering::Relaxed);
            }
        }
        self.metrics.published_total.fetch_add(1, Ordering::Relaxed);

        match self.tx.send(Arc::new(frame)) {
            Ok(_n_receivers) => {
                self.metrics
                    .was_recommended_publications
                    .fetch_add(1, Ordering::Relaxed);
                true
            }
            Err(_) => {
                self.metrics
                    .no_subscribers_total
                    .fetch_add(1, Ordering::Relaxed);
                false
            }
        }
    }

    /// Número de consumers atualmente ativos.
    pub fn receiver_count(&self) -> usize {
        self.tx.receiver_count()
    }
}

impl Default for RecommendationBroadcaster {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::contract::{
        AbstainDiagnostic, AbstainReason, CalibStatus, ReasonKind, ToxicityLevel,
        TradeReason, TradeSetup,
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
            enter_at_min: 1.8, enter_typical: 2.0, enter_peak_p95: 2.8, p_enter_hit: 0.9,
            exit_at_min: -1.2, exit_typical: -1.0, p_exit_hit_given_enter: 0.85,
            gross_profit_p10: 0.6, gross_profit_p25: 0.7, gross_profit_median: 1.0,
            gross_profit_p75: 1.5, gross_profit_p90: 2.3, gross_profit_p95: 2.8,
            realization_probability: 0.77, confidence_interval: (0.70, 0.82),
            horizon_p05_s: 720, horizon_median_s: 1680, horizon_p95_s: 6000,
            toxicity_level: ToxicityLevel::Healthy, cluster_id: None,
            cluster_size: 1, cluster_rank: 1,
            haircut_predicted: 0.25, gross_profit_realizable_median: 0.75,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason { kind: ReasonKind::Combined, detail: "t".into() },
            model_version: "a3-0.1.0".into(),
            emitted_at: 1_000, valid_until: 2_000,
        })
    }

    fn mk_abstain() -> Recommendation {
        Recommendation::Abstain {
            reason: AbstainReason::InsufficientData,
            diagnostic: AbstainDiagnostic {
                n_observations: 100,
                ci_width_if_emitted: None,
                nearest_feasible_utility: None,
                tail_ratio_p99_p95: None,
                model_version: "a3-0.1.0".into(),
                regime_posterior: [1.0, 0.0, 0.0],
            },
        }
    }

    #[tokio::test]
    async fn publish_without_subscribers_does_not_panic() {
        let b = RecommendationBroadcaster::new();
        let r = mk_trade();
        let had_consumers = b.publish(1, 100, mk_route(), "BTC-USDT", &r);
        assert!(!had_consumers);
        assert_eq!(b.metrics().published_total.load(Ordering::Relaxed), 1);
        assert_eq!(
            b.metrics().no_subscribers_total.load(Ordering::Relaxed),
            1
        );
    }

    #[tokio::test]
    async fn single_subscriber_receives_frame() {
        let b = RecommendationBroadcaster::new();
        let mut rx = b.subscribe();
        let r = mk_trade();
        assert!(b.publish(42, 1_234, mk_route(), "BTC-USDT", &r));

        let frame = rx.recv().await.expect("frame recv");
        assert_eq!(frame.cycle_seq, 42);
        assert_eq!(frame.emitted_at_ns, 1_234);
        assert_eq!(frame.symbol_name, "BTC-USDT");
        assert!(matches!(frame.dto, RecommendationDto::Trade(_)));
    }

    #[tokio::test]
    async fn abstain_increments_metrics_separately() {
        let b = RecommendationBroadcaster::new();
        let mut rx = b.subscribe();
        b.publish(1, 1, mk_route(), "BTC-USDT", &mk_trade());
        b.publish(2, 2, mk_route(), "BTC-USDT", &mk_abstain());
        let _ = rx.recv().await;
        let _ = rx.recv().await;

        assert_eq!(b.metrics().trade_published_total.load(Ordering::Relaxed), 1);
        assert_eq!(
            b.metrics().abstain_published_total.load(Ordering::Relaxed),
            1
        );
    }

    #[tokio::test]
    async fn frame_to_json_roundtrips() {
        let b = RecommendationBroadcaster::new();
        let mut rx = b.subscribe();
        b.publish(1, 1, mk_route(), "BTC-USDT", &mk_trade());
        let frame = rx.recv().await.unwrap();
        let s = frame.to_json_string().unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["kind"], "trade");
    }

    #[tokio::test]
    async fn multiple_subscribers_all_receive() {
        let b = RecommendationBroadcaster::new();
        let mut rx1 = b.subscribe();
        let mut rx2 = b.subscribe();
        b.publish(1, 1, mk_route(), "BTC-USDT", &mk_trade());

        let f1 = rx1.recv().await.unwrap();
        let f2 = rx2.recv().await.unwrap();
        assert_eq!(f1.cycle_seq, f2.cycle_seq);
    }

    #[tokio::test]
    async fn scanner_like_json_contains_legacy_opportunity_envelope() {
        let b = RecommendationBroadcaster::new();
        let mut rx = b.subscribe();
        b.publish(7, 1_700_000_000_000_000_000, mk_route(), "BTC-USDT", &mk_trade());
        let frame = rx.recv().await.unwrap();
        let s = frame.to_scanner_like_json_string().unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();

        assert_eq!(v["type"], "opportunity");
        assert_eq!(v["data"][0]["symbol"], "BTC-USDT");
        assert_eq!(v["data"][0]["buyFrom"], "mexc");
        assert_eq!(v["data"][0]["sellTo"], "bingx");
        assert_eq!(v["data"][0]["ml"]["kind"], "trade");
    }
}

fn iso8601_from_ns(ns: u64) -> String {
    let secs = (ns / 1_000_000_000) as i64;
    let ms = ((ns / 1_000_000) % 1000) as u32;
    iso8601_from_secs(secs, ms)
}

fn iso8601_from_secs(secs: i64, ms: u32) -> String {
    let (date_days, time_secs) = (secs.div_euclid(86400), secs.rem_euclid(86400));
    let (y, m, d) = civil_from_days(date_days);
    let h = time_secs / 3600;
    let mi = (time_secs % 3600) / 60;
    let s = time_secs % 60;
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z", y, m, d, h, mi, s, ms)
}

fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as i64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}
