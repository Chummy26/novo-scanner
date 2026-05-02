//! axum server exposing /ws/scanner + /api/spread/* on the configured port.

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use parking_lot::RwLock;
use serde::Serialize;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::{info, warn};

use crate::book::BookStore;
use crate::broadcast::contract::OpportunityDto;
use crate::broadcast::history::HistoryStore;
use crate::discovery::SymbolUniverse;
use crate::error::Result;
use crate::ml::broadcast::RecommendationBroadcaster;
use crate::spread::engine::StaleTable;
use crate::spread::{Opportunity, ScanCounters};
use crate::types::{now_ns, SymbolId, Venue};

/// Shared broadcast state. The spread engine pushes snapshots here; the WS
/// handler fans them out to every connected client.
#[derive(Clone)]
pub struct BroadcastState {
    /// Most recent snapshot of opportunities, cached for REST /opportunities.
    pub latest: Arc<RwLock<Vec<OpportunityDto>>>,
    /// Channel over which spread engine publishes each new snapshot.
    pub tx: broadcast::Sender<Arc<Vec<OpportunityDto>>>,
    /// Per-venue status (populated by adapters).
    pub status: Arc<RwLock<VenueStatus>>,
    /// Per-symbol ring buffer of past opportunities.
    pub history: Arc<RwLock<HistoryStore>>,
    /// Optional references used by the /api/spread/status handler to compute
    /// real-time venue health (active/stale symbols). Populated at startup
    /// by the runtime wiring.
    pub universe: Option<Arc<SymbolUniverse>>,
    pub store: Option<Arc<BookStore>>,
    pub stale: Option<Arc<StaleTable>>,
    pub counters: Option<Arc<ScanCounters>>,
    pub vol: Option<Arc<crate::broadcast::VolStore>>,
    /// Broadcaster de `Recommendation` (ADR-026, Wave T). `None` em testes
    /// ou quando scanner roda sem pipeline ML. Injetado por `with_ml_broadcaster`.
    pub ml_broadcaster: Option<RecommendationBroadcaster>,
    /// Sinal de shutdown administrativo. Usado por coletas supervisionadas
    /// para acionar o mesmo flush limpo do `Ctrl+C`.
    pub admin_shutdown_tx: Option<broadcast::Sender<()>>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VenueStatus {
    pub venues: Vec<VenueHealth>,
    pub total_symbols: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VenueHealth {
    pub venue: String,
    pub market: String,
    pub connected: bool,
    pub last_frame_age_ms: u64,
    pub active_symbols: u32,
    pub stale_symbols: u32,
}

impl BroadcastState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel::<Arc<Vec<OpportunityDto>>>(64);
        Self {
            latest: Arc::new(RwLock::new(Vec::new())),
            tx,
            status: Arc::new(RwLock::new(VenueStatus::default())),
            history: Arc::new(RwLock::new(HistoryStore::new(512))),
            universe: None,
            store: None,
            stale: None,
            counters: None,
            vol: None,
            ml_broadcaster: None,
            admin_shutdown_tx: None,
        }
    }

    /// Wire up live references that /api/spread/status uses to compute health.
    pub fn with_refs(
        mut self,
        universe: Arc<SymbolUniverse>,
        store: Arc<BookStore>,
        stale: Arc<StaleTable>,
        counters: Arc<ScanCounters>,
        vol: Arc<crate::broadcast::VolStore>,
    ) -> Self {
        self.universe = Some(universe);
        self.store = Some(store);
        self.stale = Some(stale);
        self.counters = Some(counters);
        self.vol = Some(vol);
        self
    }

    /// Wire up o broadcaster de `Recommendation`. Necessário para ativar
    /// o endpoint WS `/ws/ml/recommendations`. Se `None`, o endpoint
    /// responde 503 Service Unavailable.
    pub fn with_ml_broadcaster(mut self, b: RecommendationBroadcaster) -> Self {
        self.ml_broadcaster = Some(b);
        self
    }

    pub fn with_admin_shutdown(mut self, tx: broadcast::Sender<()>) -> Self {
        self.admin_shutdown_tx = Some(tx);
        self
    }

    /// Called by the spread-engine driver after each scan cycle.
    pub fn publish(&self, ops: Vec<Opportunity>) {
        let dtos: Vec<OpportunityDto> = ops.iter().map(OpportunityDto::from).collect();
        {
            let mut w = self.latest.write();
            *w = dtos.clone();
        }
        // History: append per-symbol.
        {
            let mut h = self.history.write();
            h.record_batch(&dtos);
        }
        // Broadcast — if there are no listeners, the value is just dropped.
        let _ = self.tx.send(Arc::new(dtos));
    }
}

pub async fn serve(
    addr: impl Into<SocketAddr>,
    state: BroadcastState,
    frontend_dir: Option<std::path::PathBuf>,
) -> Result<()> {
    let addr: SocketAddr = addr.into();
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let mut app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/ws/scanner", get(ws_handler))
        .route("/ws/ml/recommendations", get(ws_ml_recommendations))
        .route("/api/ml/recommendations/status", get(rest_ml_rec_status))
        .route("/api/spread/opportunities", get(rest_opportunities))
        .route("/api/spread/status", get(rest_status))
        .route("/api/spread/history/:symbol", get(rest_history))
        .route("/api/spread/debug", get(rest_debug))
        .route("/api/admin/shutdown", post(admin_shutdown))
        .route("/metrics", get(rest_metrics))
        .route("/healthz", get(healthz))
        // Dev auth bypass: frontend's login screen calls these; we return
        // fabricated success so the dashboard opens without a real backend.
        // Do NOT enable in a production deployment — this is for the scanner
        // running on localhost alongside the existing SPA.
        .route("/auth/login", axum::routing::post(auth_login))
        .route("/auth/register", axum::routing::post(auth_login))
        .route("/auth/profile", get(auth_profile))
        .route("/auth/me", get(auth_profile))
        .route("/auth/otp/verify", axum::routing::post(auth_otp_verify))
        .route("/auth/otp/request", axum::routing::post(auth_otp_request))
        .route("/auth/otp/resend", axum::routing::post(auth_otp_request))
        .route("/auth/refresh", axum::routing::post(auth_login))
        .route("/auth/logout", axum::routing::post(auth_empty_vec))
        .route("/auth/users/:id/permissions", get(auth_empty_vec))
        .route("/auth/users/:id/roles", get(auth_empty_vec))
        .route("/auth/roles", get(auth_empty_vec))
        .route("/auth/permissions", get(auth_empty_vec))
        .route("/auth/users", get(auth_empty_vec))
        // Notifications: REST list + WS channel. The UI subscribes at login and
        // blocks rendering the side-nav until at least the handshake succeeds.
        .route("/notifications", get(auth_empty_vec))
        .route("/notifications/ws", get(notifications_ws))
        // Finance widgets (account / bankrolls / balances). Return empty sets
        // so the dashboard renders even without a real finance backend.
        .route("/finance/bankrolls", get(auth_empty_vec))
        .route("/finance/balances", get(auth_empty_obj))
        .route("/finance/transactions", get(auth_empty_vec))
        .route("/finance/exchanges", get(auth_empty_vec))
        // Catch-all API placeholder: any /api/* that we don't know yet returns
        // [] instead of falling through to the SPA index, which the axios
        // consumer would try to JSON.parse and throw on.
        .route("/api/*rest", get(auth_empty_vec))
        .with_state(state);

    if let Some(dir) = frontend_dir {
        if dir.is_dir() {
            info!(dir = %dir.display(), "serving frontend static files at /");
            // SPA fallback: React Router handles /dashboards/*, /login, /verify-otp,
            // etc. client-side. We serve static assets when they exist; anything
            // else gets index.html with HTTP 200 so the SPA router boots.
            //
            // Using `ServeFile` as not_found_service would preserve the 404
            // status, which browsers then render as an error page. We roll a
            // minimal handler that reads the file and returns 200.
            let index_path: std::path::PathBuf = dir.join("index.html");
            let serve_dir = ServeDir::new(&dir).fallback(axum::routing::any(move || {
                let path = index_path.clone();
                async move {
                    match tokio::fs::read(&path).await {
                        Ok(bytes) => (
                            http::StatusCode::OK,
                            [(http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
                            bytes,
                        )
                            .into_response(),
                        Err(_) => (
                            http::StatusCode::INTERNAL_SERVER_ERROR,
                            "index.html not found",
                        )
                            .into_response(),
                    }
                }
            }));
            app = app.fallback_service(serve_dir);
        } else {
            warn!(dir = %dir.display(), "frontend_dir not a directory — serving backend only");
        }
    }

    let app = app.layer(cors);

    info!("broadcast server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(crate::error::Error::Io)?;
    axum::serve(listener, app)
        .await
        .map_err(|e| crate::error::Error::Other(e.to_string()))?;
    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<BroadcastState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: BroadcastState) {
    let mut rx = state.tx.subscribe();
    // Push the latest snapshot immediately so a fresh client isn't blank until
    // the next broadcast.
    {
        let latest = state.latest.read().clone();
        if !latest.is_empty() {
            let msg = scanner_frame(&latest);
            if socket.send(Message::Text(msg)).await.is_err() {
                return;
            }
        }
    }

    loop {
        tokio::select! {
            ev = rx.recv() => {
                match ev {
                    Ok(snapshot) => {
                        let msg = scanner_frame(&snapshot);
                        if socket.send(Message::Text(msg)).await.is_err() { break; }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        warn!("ws client lagged {} snapshots", n);
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            inbound = socket.recv() => {
                match inbound {
                    Some(Ok(Message::Ping(p))) => { let _ = socket.send(Message::Pong(p)).await; }
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(_)) => break,
                    _ => {}
                }
            }
            // Heartbeat: a quiet broadcast means no opportunities above threshold,
            // not a stuck scanner. We don't push anything in that case — clients
            // keep the last snapshot on their side.
            _ = tokio::time::sleep(Duration::from_secs(30)) => {
                if socket.send(Message::Ping(Vec::new())).await.is_err() { break; }
            }
        }
    }
}

/// Build the WS frame envelope the frontend expects.
///
/// Contract observed in the bundle: `Xe()` parses either an array under `data`,
/// a single object under `data`, or `{type:"opportunity", ...}`. Each entry's
/// `buyBookAge`/`sellBookAge` is multiplied by 1000, meaning it's treated as
/// SECONDS. We therefore convert ms→s at serialisation time.
fn scanner_frame(dtos: &[OpportunityDto]) -> String {
    let ts = chrono_iso_now();
    // Transform ages ms → seconds to match the frontend's expectation.
    let data: Vec<serde_json::Value> = dtos
        .iter()
        .map(|d| {
            serde_json::json!({
                "id":            d.id,
                "symbol":        d.symbol,
                "current":       d.current,
                "buyFrom":       d.buy_from,
                "sellTo":        d.sell_to,
                "buyType":       d.buy_type,
                "sellType":      d.sell_type,
                "buyPrice":      d.buy_price,
                "sellPrice":     d.sell_price,
                "entrySpread":   d.entry_spread,
                "exitSpread":    d.exit_spread,
                "buyVol24":      d.buy_vol24,
                "sellVol24":     d.sell_vol24,
                "buyBookAge":    (d.buy_book_age  as f64) / 1000.0,
                "sellBookAge":   (d.sell_book_age as f64) / 1000.0,
            })
        })
        .collect();
    serde_json::json!({
        "timestamp": ts,
        "data":      data,
    })
    .to_string()
}

fn chrono_iso_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let d = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    // RFC3339 epoch-seconds + milliseconds; good enough for the frontend's
    // `Date.parse`.
    let secs = d.as_secs() as i64;
    let ms = d.subsec_millis();
    // Convert epoch secs to YYYY-MM-DDTHH:MM:SS without bringing in chrono.
    iso8601_from_secs(secs, ms)
}

fn iso8601_from_secs(secs: i64, ms: u32) -> String {
    // Very small civil-from-days: good for epoch > 1970. Sufficient here.
    let (date_days, time_secs) = (secs.div_euclid(86400), secs.rem_euclid(86400));
    let (y, m, d) = civil_from_days(date_days);
    let h = time_secs / 3600;
    let mi = (time_secs % 3600) / 60;
    let s = time_secs % 60;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        y, m, d, h, mi, s, ms
    )
}

// Howard Hinnant's `civil_from_days` algorithm (public domain).
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

// ---------------------------------------------------------------------------
// WS `/ws/ml/recommendations` — stream de Recommendations (ADR-026, Wave T)
// ---------------------------------------------------------------------------

async fn ws_ml_recommendations(
    ws: WebSocketUpgrade,
    State(state): State<BroadcastState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ml_socket(socket, state))
}

async fn handle_ml_socket(mut socket: WebSocket, state: BroadcastState) {
    let bcast = match state.ml_broadcaster {
        Some(b) => b,
        None => {
            // Sem broadcaster (ex: scanner sem pipeline ML) — retorna
            // notice e fecha.
            let msg = r#"{"type":"error","reason":"ml_broadcaster_not_configured"}"#;
            let _ = socket.send(Message::Text(msg.into())).await;
            return;
        }
    };
    let mut rx = bcast.subscribe();

    loop {
        tokio::select! {
            ev = rx.recv() => {
                match ev {
                    Ok(frame) => {
                        match frame.to_scanner_like_json_string() {
                            Ok(payload) => {
                                let msg = payload;
                                if socket.send(Message::Text(msg)).await.is_err() { break; }
                            }
                            Err(e) => {
                                warn!("ml rec json serialize failed: {}", e);
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        // Fix pós-auditoria: registra drops na métrica
                        // `lagged_frames_total` — antes era só warn, invisível
                        // em dashboards. Consumer lento perde frames quando
                        // o canal (cap 8192) sobrescreve mensagens antigas.
                        bcast.metrics().record_lagged(n);
                        warn!("ws ml client lagged {} frames", n);
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            inbound = socket.recv() => {
                match inbound {
                    Some(Ok(Message::Ping(p))) => { let _ = socket.send(Message::Pong(p)).await; }
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(_)) => break,
                    _ => {}
                }
            }
            _ = tokio::time::sleep(Duration::from_secs(30)) => {
                if socket.send(Message::Ping(Vec::new())).await.is_err() { break; }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// REST `/api/ml/recommendations/status` — snapshot de contadores do broadcaster
// ---------------------------------------------------------------------------

async fn rest_ml_rec_status(State(state): State<BroadcastState>) -> impl IntoResponse {
    use std::sync::atomic::Ordering;
    let body = match state.ml_broadcaster {
        Some(b) => {
            let m = b.metrics();
            serde_json::json!({
                "broadcaster_configured": true,
                "active_receivers":       b.receiver_count(),
                "published_total":        m.published_total.load(Ordering::Relaxed),
                "trade_published_total":  m.trade_published_total.load(Ordering::Relaxed),
                "abstain_published_total": m.abstain_published_total.load(Ordering::Relaxed),
                "no_subscribers_total":   m.no_subscribers_total.load(Ordering::Relaxed),
                "was_recommended_publications": m.was_recommended_publications.load(Ordering::Relaxed),
                "lagged_frames_total":    m.lagged_frames_total.load(Ordering::Relaxed),
            })
        }
        None => serde_json::json!({ "broadcaster_configured": false }),
    };
    Json(body)
}

async fn rest_opportunities(State(state): State<BroadcastState>) -> impl IntoResponse {
    Json(state.latest.read().clone())
}

async fn rest_status(State(state): State<BroadcastState>) -> impl IntoResponse {
    // Compute live status from BookStore + StaleTable if references are wired.
    let (Some(u), Some(s), Some(st)) = (&state.universe, &state.store, &state.stale) else {
        return Json(state.status.read().clone());
    };
    let status = compute_status(u, s, st);
    Json(status)
}

fn compute_status(universe: &SymbolUniverse, store: &BookStore, stale: &StaleTable) -> VenueStatus {
    let now = now_ns();
    let mut venues: Vec<VenueHealth> = Venue::ALL
        .iter()
        .map(|&v| {
            let mut active = 0u32;
            let mut stale_cnt = 0u32;
            let mut min_age_ms: u64 = u64::MAX;
            for i in 0..universe.len() {
                let id = SymbolId(i as u32);
                if !universe.coverage[i][v.idx()] {
                    continue;
                }
                let slot = store.slot(v, id);
                if slot.is_uninitialized() {
                    continue;
                }
                active += 1;
                let cell = stale.cell(v, id);
                if crate::spread::staleness::is_stale_for(v, cell, now) {
                    stale_cnt += 1;
                }
                let age = cell.age_ms(now);
                if age < min_age_ms {
                    min_age_ms = age;
                }
            }
            VenueHealth {
                venue: v.as_str().to_string(),
                market: v.market().as_str().to_string(),
                connected: active > 0,
                last_frame_age_ms: if min_age_ms == u64::MAX {
                    0
                } else {
                    min_age_ms
                },
                active_symbols: active,
                stale_symbols: stale_cnt,
            }
        })
        .collect();
    venues.sort_by(|a, b| a.venue.cmp(&b.venue).then(a.market.cmp(&b.market)));
    VenueStatus {
        venues,
        total_symbols: universe.len() as u32,
    }
}

async fn rest_history(
    axum::extract::Path(symbol): axum::extract::Path<String>,
    State(state): State<BroadcastState>,
) -> impl IntoResponse {
    let symbol = symbol.to_ascii_uppercase();
    let v = state.history.read().history_of(&symbol);
    Json(v)
}

/// Debug dump for investigating missing opportunities. Returns counters from
/// the scan engine (why candidates were dropped) and the top-5 spread
/// candidates that made it into `latest`.
async fn rest_debug(State(state): State<BroadcastState>) -> impl IntoResponse {
    let counters = state
        .counters
        .as_ref()
        .map(|c| c.snapshot())
        .unwrap_or_default();
    let latest = state.latest.read().clone();
    let mut top: Vec<OpportunityDto> = latest.clone();
    top.sort_by(|a, b| {
        b.entry_spread
            .partial_cmp(&a.entry_spread)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    top.truncate(20);
    let histogram: Vec<(String, usize)> = {
        let buckets = [0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 25.0, 50.0, 100.0];
        let mut counts = vec![0usize; buckets.len() + 1];
        for o in &latest {
            let mut placed = false;
            for (i, &b) in buckets.iter().enumerate() {
                if o.entry_spread < b {
                    counts[i] += 1;
                    placed = true;
                    break;
                }
            }
            if !placed {
                counts[buckets.len()] += 1;
            }
        }
        let labels = [
            "<0.2", "<0.5", "<1", "<2", "<5", "<10", "<25", "<50", "<100", ">=100",
        ];
        labels
            .iter()
            .zip(counts.iter())
            .map(|(l, c)| (l.to_string(), *c))
            .collect()
    };
    Json(serde_json::json!({
        "counters":          counters,
        "latest_total":      latest.len(),
        "top_spreads":       top,
        "spread_histogram":  histogram,
        // All 14 venues now expose real BBO to the book store:
        //   - XT spot:       method=subscribe params=[depth@{sym},5] (current Spot Public)
        //   - XT fut:        ticker@{sym}
        //   - MEXC fut:      bid1/ask1 with skip-if-empty (M21, M25)
        //   - Gate fut:      futures.book_ticker b/a with skip-if-empty
        //   - MEXC spot:     REST /ticker/bookTicker 1Hz
        //   - others:        dedicated bookTicker / best-bid-ask channels
        "last_price_only_venues": [],
        "notes": {
            "xt_depth":      "XT spot uses current Spot Public subscribe shape {\"method\":\"subscribe\",\"params\":[\"depth@sym,5\"]}; client sends text ping and does not advertise permessage-deflate.",
            "mexc_fut_fix":  "M21+M25: sub.ticker per-symbol, bid1/ask1 only; no lastPrice fallback.",
            "gate_fut_fix":  "Gate futures uses futures.book_ticker with b/a/B/A; no `last` fallback.",
            "bingx_bbo_driven":"BingX spot/fut subscribe {sym}@bookTicker which is BBO-driven (no heartbeat on illiquid pairs). The fix is a different channel — not a tighter threshold.",
        }
    }))
}

async fn admin_shutdown(State(state): State<BroadcastState>) -> impl IntoResponse {
    let Some(tx) = state.admin_shutdown_tx else {
        return (
            http::StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "accepted": false,
                "reason": "admin_shutdown_not_configured"
            })),
        )
            .into_response();
    };

    let _ = tx.send(());
    Json(serde_json::json!({
        "accepted": true,
        "reason": "shutdown_requested"
    }))
    .into_response()
}

async fn healthz() -> &'static str {
    "ok"
}

// ---- Dev auth bypass: all handlers return a fabricated authenticated user ----
//
// The frontend decodes the token as a JWT and reads `exp` to decide whether
// the session is still valid. We emit a real JWT with a far-future `exp` so
// the token-refresh guard never kicks in and the user stays logged in.

fn dev_jwt() -> String {
    use base64::Engine;
    let header = r#"{"alg":"HS256","typ":"JWT"}"#;
    let payload = serde_json::json!({
        "sub":            "1",
        "email":          "dev@localhost",
        "name":           "Developer",
        "emailVerified":  true,
        "email_verified": true,
        // Unix seconds — 2100-01-01. Well beyond any realistic session.
        "exp":            4_102_444_800u64,
        "iat":            1_700_000_000u64,
        "nbf":            1_700_000_000u64,
        "permissions":    ["*", "scanner.view", "scanner.manage"],
        "roles":          ["admin"],
    })
    .to_string();
    let signature = b"dev-bypass-signature-not-verified";
    let b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD;
    format!(
        "{}.{}.{}",
        b64.encode(header),
        b64.encode(payload.as_bytes()),
        b64.encode(signature),
    )
}

async fn auth_login() -> impl IntoResponse {
    let t = dev_jwt();
    Json(serde_json::json!({
        "token":         t,
        "refreshToken":  t,
        "accessToken":   t,
        "access_token":  t,
        "user": {
            "id":            1,
            "email":         "dev@localhost",
            "name":          "Developer",
            "firstLogin":    false,
            "oldId":         null,
            "emailVerified": true,
        }
    }))
}

async fn auth_profile() -> impl IntoResponse {
    // The frontend router redirects to /verify-otp unless either
    // `emailVerified === true` or `emailVerifiedAt` is truthy, and to
    // /legacy-migration if `oldId != null && firstLogin == null`. We set
    // everything to bypass both gates.
    Json(serde_json::json!({
        "id":               1,
        "email":            "dev@localhost",
        "name":             "Developer",
        "emailVerified":    true,
        "emailVerifiedAt":  "2026-01-01T00:00:00Z",
        "email_verified":       true,
        "email_verified_at":    "2026-01-01T00:00:00Z",
        "discordId":        null,
        "discord_id":       null,
        "telegramId":       null,
        "telegram_id":      null,
        "discordUsername":  null,
        "discord_username": null,
        "oldId":            null,
        "old_id":           null,
        "firstLogin":       false,
        "first_login":      false,
        "isActive":         true,
        "is_active":        true,
        "status":           "active",
        "subscription":     { "active": true, "plan": "dev", "expiresAt": null },
        // Grant all conceivable permissions to avoid the UI hiding features.
        "roles":            ["admin"],
        "permissions":      [
            "scanner.view", "scanner.manage",
            "admin.view",   "admin.manage",
            "*"
        ],
        // License gate: the router's `requiredTypes: [2]` maps `scanner`,
        // `monitoramento`, `lancamentos` behind an active license of type 2.
        // We grant types 1..=5 so every gated dashboard renders.
        "licenses": [
            { "type": 1, "status": "active", "endDate": "2099-12-31T23:59:59Z", "startDate": "2020-01-01T00:00:00Z" },
            { "type": 2, "status": "active", "endDate": "2099-12-31T23:59:59Z", "startDate": "2020-01-01T00:00:00Z" },
            { "type": 3, "status": "active", "endDate": "2099-12-31T23:59:59Z", "startDate": "2020-01-01T00:00:00Z" },
            { "type": 4, "status": "active", "endDate": "2099-12-31T23:59:59Z", "startDate": "2020-01-01T00:00:00Z" },
            { "type": 5, "status": "active", "endDate": "2099-12-31T23:59:59Z", "startDate": "2020-01-01T00:00:00Z" },
        ],
    }))
}

/// The OTP path is bypassed — if the frontend routes the user to /verify-otp
/// anyway (e.g., because of a cached token), both endpoints respond as
/// "verification succeeded" with a fresh token so the user lands on the
/// dashboard without providing a real code.
async fn auth_otp_verify() -> impl IntoResponse {
    let t = dev_jwt();
    Json(serde_json::json!({
        "token":         t,
        "refreshToken":  t,
        "accessToken":   t,
        "access_token":  t,
        "verified":      true,
        "emailVerified": true,
        "user": {
            "id":               1,
            "email":            "dev@localhost",
            "name":             "Developer",
            "emailVerified":    true,
            "emailVerifiedAt":  "2026-01-01T00:00:00Z",
        }
    }))
}

async fn auth_otp_request() -> impl IntoResponse {
    Json(serde_json::json!({
        "ok":      true,
        "message": "OTP bypass (dev)",
    }))
}

async fn auth_empty_vec() -> impl IntoResponse {
    Json(Vec::<serde_json::Value>::new())
}

async fn auth_empty_obj() -> impl IntoResponse {
    Json(serde_json::json!({}))
}

/// Mock notifications WebSocket — accept the upgrade, then idle. The frontend
/// only cares that the handshake succeeds; it doesn't require any specific
/// push payload to render the dashboard.
async fn notifications_ws(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|mut socket| async move {
        loop {
            tokio::select! {
                m = socket.recv() => {
                    match m {
                        Some(Ok(Message::Ping(p))) => { let _ = socket.send(Message::Pong(p)).await; }
                        Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                        _ => {}
                    }
                }
                _ = tokio::time::sleep(Duration::from_secs(30)) => {
                    if socket.send(Message::Ping(Vec::new())).await.is_err() { break; }
                }
            }
        }
    })
}

async fn rest_metrics() -> impl IntoResponse {
    use prometheus::Encoder;
    let metrics = crate::obs::Metrics::init();
    let encoder = prometheus::TextEncoder::new();
    let mut buf = Vec::new();
    let mf = metrics.registry.gather();
    if encoder.encode(&mf, &mut buf).is_err() {
        return (
            http::StatusCode::INTERNAL_SERVER_ERROR,
            "encode error".to_string(),
        )
            .into_response();
    }
    // Append HdrHistogram summaries manually (prometheus crate doesn't know about them).
    let mut extra = String::new();
    for v in crate::types::Venue::ALL {
        if let Some(h) = metrics.ingest_hist[v.idx()].try_lock() {
            if h.len() > 0 {
                extra.push_str(&format!(
                    "# HELP scanner_ingest_latency_ns_p99 Per-venue ingest p99 latency ns\n\
                     # TYPE scanner_ingest_latency_ns_p99 gauge\n\
                     scanner_ingest_latency_ns_p99{{venue=\"{}\"}} {}\n",
                    v.as_str(),
                    h.value_at_quantile(0.99)
                ));
            }
        }
    }
    if let Some(h) = metrics.cycle_hist.try_lock() {
        if h.len() > 0 {
            extra.push_str(&format!(
                "# HELP scanner_spread_cycle_ns_p99 Spread-engine cycle p99 latency ns\n\
                 # TYPE scanner_spread_cycle_ns_p99 gauge\n\
                 scanner_spread_cycle_ns_p99 {}\n",
                h.value_at_quantile(0.99)
            ));
        }
    }
    let body = String::from_utf8_lossy(&buf).into_owned() + &extra;
    (http::StatusCode::OK, body).into_response()
}
