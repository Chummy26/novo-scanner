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

/// Capacidade default do canal broadcast.
///
/// Fix pós-auditoria 2026-04-21: o valor anterior de 512 era severamente
/// subdimensionado — 2600 rotas ativas a 150 ms produz até 17k mensagens/s;
/// qualquer consumer com latência > 30 ms lotava o canal. `tokio::sync::broadcast`
/// sobrescreve mensagens antigas silenciosamente quando lotado, e até o
/// fix do `lagged_frames_total` tais perdas eram invisíveis.
/// 8192 cobre ~3 ciclos completos do scanner com margem para 4+ consumers.
pub const DEFAULT_CHANNEL_CAPACITY: usize = 8192;

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

    /// Serializa envelope do canal ML com tipo `"ml_recommendation"`.
    ///
    /// **Fix pós-auditoria 2026-04-21**: o envelope anterior reusava
    /// `"type": "opportunity"` e preenchia `buyPrice`/`sellPrice` com
    /// campos do contrato ML (valores de SPREAD em %),
    /// que no schema original do scanner representavam **preços reais**
    /// do orderbook. Isso confundia a UI legada (risco de execução com
    /// preço 2.4 USDT em ativo que vale 0.00123). Agora usa envelope
    /// dedicado, sem mistura de semântica.
    ///
    /// Frontend ML deve consumir o schema explícito `ml_recommendation`.
    /// UI legada do scanner continua no WS `/ws/spread` sem alterações.
    pub fn to_scanner_like_json_string(&self) -> Result<String, serde_json::Error> {
        let timestamp = iso8601_from_ns(self.emitted_at_ns);
        // Fix pós-auditoria M11: envelope de Abstain também carrega a rota.
        // `RecommendationFrame` já guarda `route_id` no nível do frame
        // (independente de Trade/Abstain), então expor no envelope melhora
        // a explicabilidade — operador vê "rota X abstida por LongTail"
        // em vez de "um abstain genérico".
        let body = serde_json::json!({
            "type": "ml_recommendation",
            "timestamp": timestamp,
            "cycle_seq": self.cycle_seq,
            "symbol": &self.symbol_name,
            "route": {
                "buy_venue": self.route_id.buy_venue.as_str(),
                "sell_venue": self.route_id.sell_venue.as_str(),
                "buy_market": self.route_id.buy_venue.market().as_str(),
                "sell_market": self.route_id.sell_venue.market().as_str(),
            },
            "ml": &self.dto,
        });
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
    /// Fix pós-auditoria 2026-04-21: número agregado de frames
    /// sobrescritos por consumers lentos (`RecvError::Lagged(n)`).
    /// Incrementado pelo handler WS em `broadcast/server.rs`.
    /// Observabilidade antes ausente — consumers lentos causavam perda
    /// silenciosa de recomendações.
    pub lagged_frames_total: AtomicU64,
}

impl BroadcasterMetrics {
    /// Incrementa `lagged_frames_total` pela quantidade `n` reportada
    /// por `RecvError::Lagged(n)` do tokio broadcast.
    #[inline]
    pub fn record_lagged(&self, n: u64) {
        self.lagged_frames_total.fetch_add(n, Ordering::Relaxed);
    }
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
        AbstainDiagnostic, AbstainReason, BaselineDiagnostics, CalibStatus, ReasonKind,
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
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: "t".into(),
            },
            model_version: "a3-0.1.0".into(),
            emitted_at: 1_000,
            valid_until: 2_000,
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
    async fn ml_recommendation_envelope_is_distinct_from_scanner() {
        // Fix pós-auditoria: envelope ML não reusa "opportunity" do scanner
        // bruto (evita confusão de semântica preço vs spread).
        let b = RecommendationBroadcaster::new();
        let mut rx = b.subscribe();
        b.publish(7, 1_700_000_000_000_000_000, mk_route(), "BTC-USDT", &mk_trade());
        let frame = rx.recv().await.unwrap();
        let s = frame.to_scanner_like_json_string().unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();

        assert_eq!(v["type"], "ml_recommendation");
        assert_eq!(v["symbol"], "BTC-USDT");
        assert_eq!(v["route"]["buy_venue"], "mexc");
        assert_eq!(v["route"]["sell_venue"], "bingx");
        assert_eq!(v["ml"]["kind"], "trade");
        assert_eq!(v["cycle_seq"], 7);
    }

    #[test]
    fn lagged_frames_total_is_tracked() {
        let m = BroadcasterMetrics::default();
        m.record_lagged(5);
        m.record_lagged(3);
        assert_eq!(m.lagged_frames_total.load(Ordering::Relaxed), 8);
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
