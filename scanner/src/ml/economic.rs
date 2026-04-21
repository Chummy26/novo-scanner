//! Módulo econômico — `simulated_pnl_bruto_aggregated` (ADR-019).
//!
//! Implementa o gate econômico obrigatório do Marco 0+: para cada
//! recomendação emitida (Trade), o `EconomicEvaluator` resolve o
//! outcome (REALIZED / WINDOW_MISS / EXIT_MISS) varrendo as amostras
//! subsequentes e calcula PnL bruto simulado com capital hipotético
//! fixo `10_000 USDT`.
//!
//! Agregação rolling 1h / 24h / 7d / 30d é exposta via
//! `EconomicMetrics::snapshot()`; consumida pelo dashboard e pelos
//! gates 7 e 8 do kill switch (STACK.md §10).
//!
//! # Resolução de outcome (ADR-019)
//!
//! ```text
//! REALIZED    se ∃ t_enter ∈ [t₀, t₀+T_trigger_max]: entrySpread(t_enter) ≥ enter_at_min
//!             AND ∃ t_exit ∈ [t_enter, t_enter+T_max]: exitSpread(t_exit) ≥ exit_at_min
//! WINDOW_MISS se enter_at_min não foi atingido em T_trigger_max
//! EXIT_MISS   se enter hit mas exit não em T_max (fecha forçado no timeout)
//! ```
//!
//! # Limitação atual (Marco 0)
//!
//! Neste módulo reside apenas a **lógica de acúmulo**. A conexão real
//! `AcceptedSample → resolve_outcome` depende de persistência histórica
//! queryável por rota, que é função do `raw_samples_*.jsonl`. Marco 0
//! define estrutura de dados e unit tests; integração full com o stream
//! acontece em Marco 0 semana 4–6.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;

use crate::ml::contract::{RouteId, TradeSetup};

/// Capital hipotético fixo para comparabilidade cross-Marco/cross-modelo.
/// Decisão: 10_000 USDT (ADR-019 §Capital hipotético fixo de referência).
pub const CAPITAL_HYPOTHETICAL_USD: f64 = 10_000.0;

/// `T_trigger_max`: janela máxima em segundos para aguardar `entrySpread`
/// atingir `enter_at_min`. Default ADR-019 §Definição operacional: 300 s.
pub const DEFAULT_T_TRIGGER_MAX_S: u32 = 300;

/// Custo estimado por recomendação (atenção do operador, ADR-019).
/// Default: 0.1 bp = 0.001% do capital hipotético = 0.10 USDT por emissão.
pub const DEFAULT_OPERATOR_ATTENTION_COST_USD: f64 = 0.10;

/// Outcome resolvido de uma recomendação.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TradeOutcome {
    /// Entry E saída realizadas conforme regra.
    Realized {
        enter_realized_pct: f32,
        exit_realized_pct: f32,
        horizon_observed_s: u32,
    },
    /// `enter_at_min` não foi atingido em `T_trigger_max`.
    WindowMiss,
    /// Entry hit, mas exit não em `T_max` — fechamento forçado no timeout.
    ExitMiss {
        enter_realized_pct: f32,
        forced_exit_pct: f32,
    },
}

impl TradeOutcome {
    /// PnL bruto % (enter_realized + exit_realized) dado o outcome.
    /// `WindowMiss` = 0 (nunca executou).
    pub fn gross_pnl_pct(&self) -> f32 {
        match *self {
            TradeOutcome::Realized {
                enter_realized_pct, exit_realized_pct, ..
            } => enter_realized_pct + exit_realized_pct,
            TradeOutcome::WindowMiss => 0.0,
            TradeOutcome::ExitMiss {
                enter_realized_pct,
                forced_exit_pct,
            } => enter_realized_pct + forced_exit_pct,
        }
    }

    /// PnL em USDT sobre `CAPITAL_HYPOTHETICAL_USD`.
    pub fn gross_pnl_usd(&self) -> f64 {
        (self.gross_pnl_pct() as f64 / 100.0) * CAPITAL_HYPOTHETICAL_USD
    }
}

/// Evento registrado por emissão (recomendação + outcome resolvido).
#[derive(Debug, Clone)]
pub struct EconomicEvent {
    pub ts_emitted_ns: u64,
    pub ts_resolved_ns: u64,
    pub route_id: RouteId,
    pub model_version: String,
    pub outcome: TradeOutcome,
    /// PnL bruto % — cacheado para agregações rápidas.
    pub gross_pnl_pct: f32,
    /// PnL em USDT sobre capital hipotético — cacheado.
    pub gross_pnl_usd: f64,
    /// `true` se foi recomendação do modelo A2; `false` se baseline A3.
    pub from_model: bool,
}

impl EconomicEvent {
    pub fn new(
        setup: &TradeSetup,
        outcome: TradeOutcome,
        resolved_ns: u64,
        from_model: bool,
    ) -> Self {
        let gross_pct = outcome.gross_pnl_pct();
        Self {
            ts_emitted_ns: setup.emitted_at,
            ts_resolved_ns: resolved_ns,
            route_id: setup.route_id,
            model_version: setup.model_version.clone(),
            outcome,
            gross_pnl_pct: gross_pct,
            gross_pnl_usd: (gross_pct as f64 / 100.0) * CAPITAL_HYPOTHETICAL_USD,
            from_model,
        }
    }

    /// Serialização JSONL (persistência append-only `data/ml/economic/`).
    pub fn to_json_line(&self) -> String {
        let (outcome_label, enter_r, exit_r, horizon) = match self.outcome {
            TradeOutcome::Realized {
                enter_realized_pct,
                exit_realized_pct,
                horizon_observed_s,
            } => (
                "realized",
                enter_realized_pct,
                exit_realized_pct,
                horizon_observed_s as i32,
            ),
            TradeOutcome::WindowMiss => ("window_miss", 0.0, 0.0, -1),
            TradeOutcome::ExitMiss {
                enter_realized_pct,
                forced_exit_pct,
            } => ("exit_miss", enter_realized_pct, forced_exit_pct, -1),
        };
        format!(
            concat!(
                r#"{{"ts_emitted_ns":{},"ts_resolved_ns":{},"#,
                r#""symbol_id":{},"buy_venue":"{}","sell_venue":"{}","#,
                r#""model_version":"{}","outcome":"{}","#,
                r#""enter_realized_pct":{},"exit_realized_pct":{},"#,
                r#""horizon_observed_s":{},"gross_pnl_pct":{},"#,
                r#""gross_pnl_usd":{},"from_model":{}}}"#,
            ),
            self.ts_emitted_ns,
            self.ts_resolved_ns,
            self.route_id.symbol_id.0,
            self.route_id.buy_venue.as_str(),
            self.route_id.sell_venue.as_str(),
            self.model_version,
            outcome_label,
            finite_or_null_f32(enter_r),
            finite_or_null_f32(exit_r),
            horizon,
            finite_or_null_f32(self.gross_pnl_pct),
            finite_or_null_f64(self.gross_pnl_usd),
            self.from_model,
        )
    }
}

#[inline]
fn finite_or_null_f32(v: f32) -> String {
    if v.is_finite() { v.to_string() } else { "null".into() }
}

#[inline]
fn finite_or_null_f64(v: f64) -> String {
    if v.is_finite() { v.to_string() } else { "null".into() }
}

// ---------------------------------------------------------------------------
// Acumulador rolling
// ---------------------------------------------------------------------------

/// Métricas agregadas para janela temporal.
#[derive(Debug, Clone, Copy)]
pub struct WindowMetrics {
    pub window_s: u32,
    pub n_emissions: u64,
    pub n_realized: u64,
    pub n_window_miss: u64,
    pub n_exit_miss: u64,
    pub simulated_pnl_aggregated_usd: f64,
    pub pnl_per_emission_median_usd: f64,
    pub pnl_per_emission_p10_usd: f64,
    pub realization_rate: f32,
}

impl WindowMetrics {
    pub fn empty(window_s: u32) -> Self {
        Self {
            window_s,
            n_emissions: 0,
            n_realized: 0,
            n_window_miss: 0,
            n_exit_miss: 0,
            simulated_pnl_aggregated_usd: 0.0,
            pnl_per_emission_median_usd: 0.0,
            pnl_per_emission_p10_usd: 0.0,
            realization_rate: 0.0,
        }
    }

    /// Gate 7 (ADR-019): modelo vs baseline. Aqui somente agregado.
    pub fn economic_value_minus(&self, baseline: &WindowMetrics) -> f64 {
        self.simulated_pnl_aggregated_usd - baseline.simulated_pnl_aggregated_usd
    }
}

/// Acumulador de eventos econômicos com agregação rolling.
///
/// Mantém ring buffer de eventos recentes; evita armazenar indefinido.
/// Janelas calculadas on-demand em `snapshot_*`.
pub struct EconomicAccumulator {
    events: VecDeque<EconomicEvent>,
    /// Tamanho máximo do buffer. Default: 100k eventos (~7d ao ritmo de 1 rec/min
    /// sobre 2600 rotas ≈ 3.7M — VecDeque seria grande. Em MVP limitamos a 100k
    /// mais recentes; eventos mais antigos são descartados em memória mas
    /// persistidos em JSONL.
    max_events: usize,
    /// Metrics atómicos para Prometheus.
    metrics: Arc<EconomicMetrics>,
}

/// Contadores atômicos para Prometheus (exportado via `ml/metrics.rs`).
#[derive(Debug, Default)]
pub struct EconomicMetrics {
    pub n_emissions_total: std::sync::atomic::AtomicU64,
    pub n_realized_total: std::sync::atomic::AtomicU64,
    pub n_window_miss_total: std::sync::atomic::AtomicU64,
    pub n_exit_miss_total: std::sync::atomic::AtomicU64,
    /// PnL agregado USD × 1e4 (inteiro para evitar float atômico).
    /// Divide por 1e4 ao ler.
    pub pnl_aggregated_usd_times_10k: AtomicI64,
}

impl EconomicAccumulator {
    pub fn new() -> Self {
        Self::with_capacity(100_000)
    }

    pub fn with_capacity(max_events: usize) -> Self {
        Self {
            events: VecDeque::with_capacity(max_events.min(1024)),
            max_events,
            metrics: Arc::new(EconomicMetrics::default()),
        }
    }

    pub fn metrics(&self) -> Arc<EconomicMetrics> {
        Arc::clone(&self.metrics)
    }

    /// Adiciona evento resolvido ao buffer + atualiza métricas atômicas.
    pub fn push(&mut self, evt: EconomicEvent) {
        self.metrics.n_emissions_total.fetch_add(1, Ordering::Relaxed);
        match evt.outcome {
            TradeOutcome::Realized { .. } => {
                self.metrics.n_realized_total.fetch_add(1, Ordering::Relaxed);
            }
            TradeOutcome::WindowMiss => {
                self.metrics.n_window_miss_total.fetch_add(1, Ordering::Relaxed);
            }
            TradeOutcome::ExitMiss { .. } => {
                self.metrics.n_exit_miss_total.fetch_add(1, Ordering::Relaxed);
            }
        }
        let pnl_scaled = (evt.gross_pnl_usd * 10_000.0) as i64;
        // Delta assinado preserva perdas e ganhos sem underflow/wrap.
        self.metrics
            .pnl_aggregated_usd_times_10k
            .fetch_add(pnl_scaled, Ordering::Relaxed);

        self.events.push_back(evt);
        while self.events.len() > self.max_events {
            self.events.pop_front();
        }
    }

    /// Snapshot agregado de eventos resolvidos em [now − window, now].
    pub fn snapshot_window(&self, window_s: u32, now_ns: u64) -> WindowMetrics {
        let window_ns = (window_s as u64) * 1_000_000_000;
        let cutoff = now_ns.saturating_sub(window_ns);
        let mut relevant: Vec<&EconomicEvent> = self
            .events
            .iter()
            .filter(|e| e.ts_resolved_ns >= cutoff && e.ts_resolved_ns <= now_ns)
            .collect();
        let n = relevant.len() as u64;
        if n == 0 {
            return WindowMetrics::empty(window_s);
        }
        let mut realized = 0u64;
        let mut window_miss = 0u64;
        let mut exit_miss = 0u64;
        let mut total_usd = 0.0;
        let mut pnl_vec: Vec<f64> = Vec::with_capacity(relevant.len());
        for e in &relevant {
            match e.outcome {
                TradeOutcome::Realized { .. } => realized += 1,
                TradeOutcome::WindowMiss => window_miss += 1,
                TradeOutcome::ExitMiss { .. } => exit_miss += 1,
            }
            total_usd += e.gross_pnl_usd;
            pnl_vec.push(e.gross_pnl_usd);
        }
        pnl_vec.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        relevant.sort_by_key(|e| e.ts_resolved_ns);
        let median = pnl_vec[pnl_vec.len() / 2];
        let p10 = pnl_vec[pnl_vec.len() / 10];
        WindowMetrics {
            window_s,
            n_emissions: n,
            n_realized: realized,
            n_window_miss: window_miss,
            n_exit_miss: exit_miss,
            simulated_pnl_aggregated_usd: total_usd,
            pnl_per_emission_median_usd: median,
            pnl_per_emission_p10_usd: p10,
            realization_rate: realized as f32 / n as f32,
        }
    }

    /// Conveniência: 1h, 24h, 7d, 30d.
    pub fn standard_windows(&self, now_ns: u64) -> [WindowMetrics; 4] {
        [
            self.snapshot_window(3_600, now_ns),
            self.snapshot_window(86_400, now_ns),
            self.snapshot_window(604_800, now_ns),
            self.snapshot_window(2_592_000, now_ns),
        ]
    }

    pub fn len(&self) -> usize {
        self.events.len()
    }

    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }
}

impl Default for EconomicAccumulator {
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
        CalibStatus, ReasonKind, ToxicityLevel, TradeReason,
    };
    use crate::types::{SymbolId, Venue};

    fn mk_setup(emitted_at: u64) -> TradeSetup {
        TradeSetup {
            route_id: RouteId {
                symbol_id: SymbolId(1),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
            enter_at_min: 2.0,
            enter_typical: 2.5,
            enter_peak_p95: 3.0,
            p_enter_hit: 0.9,
            exit_at_min: -1.0,
            exit_typical: -0.5,
            p_exit_hit_given_enter: 0.85,
            gross_profit_p10: 1.0,
            gross_profit_p25: 1.3,
            gross_profit_median: 2.0,
            gross_profit_p75: 2.5,
            gross_profit_p90: 2.9,
            gross_profit_p95: 3.0,
            realization_probability: 0.77,
            confidence_interval: (0.70, 0.82),
            horizon_p05_s: 60,
            horizon_median_s: 600,
            horizon_p95_s: 3600,
            toxicity_level: ToxicityLevel::Healthy,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            haircut_predicted: 0.2,
            gross_profit_realizable_median: 1.6,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: "test".into(),
            },
            model_version: "a3-0.1.0".into(),
            emitted_at,
            valid_until: emitted_at + 30_000_000_000,
        }
    }

    #[test]
    fn realized_outcome_computes_pnl_correctly() {
        let out = TradeOutcome::Realized {
            enter_realized_pct: 2.3,
            exit_realized_pct: -0.9,
            horizon_observed_s: 400,
        };
        assert!((out.gross_pnl_pct() - 1.4).abs() < 1e-5);
        // 1.4% × 10_000 / 100 = 140 USD
        assert!((out.gross_pnl_usd() - 140.0).abs() < 1e-3);
    }

    #[test]
    fn window_miss_has_zero_pnl() {
        let out = TradeOutcome::WindowMiss;
        assert_eq!(out.gross_pnl_pct(), 0.0);
        assert_eq!(out.gross_pnl_usd(), 0.0);
    }

    #[test]
    fn accumulator_tracks_aggregations() {
        let mut acc = EconomicAccumulator::new();
        let now_ns = 1_000_000_000_000;
        let setup1 = mk_setup(now_ns - 500_000_000);
        acc.push(EconomicEvent::new(
            &setup1,
            TradeOutcome::Realized {
                enter_realized_pct: 2.1,
                exit_realized_pct: -0.8,
                horizon_observed_s: 300,
            },
            now_ns,
            false,
        ));
        let setup2 = mk_setup(now_ns - 400_000_000);
        acc.push(EconomicEvent::new(
            &setup2,
            TradeOutcome::WindowMiss,
            now_ns,
            false,
        ));
        let m = acc.snapshot_window(3600, now_ns);
        assert_eq!(m.n_emissions, 2);
        assert_eq!(m.n_realized, 1);
        assert_eq!(m.n_window_miss, 1);
        assert!((m.realization_rate - 0.5).abs() < 1e-4);
        // PnL agregado = 1.3% de 10k = 130 USD
        assert!((m.simulated_pnl_aggregated_usd - 130.0).abs() < 1e-2);
    }

    #[test]
    fn accumulator_preserves_negative_pnl_sign() {
        let mut acc = EconomicAccumulator::new();
        let now_ns = 1_000_000_000_000;
        let setup = mk_setup(now_ns);
        acc.push(EconomicEvent::new(
            &setup,
            TradeOutcome::Realized {
                enter_realized_pct: 0.0,
                exit_realized_pct: -1.1,
                horizon_observed_s: 300,
            },
            now_ns,
            true,
        ));
        assert_eq!(
            acc.metrics()
                .pnl_aggregated_usd_times_10k
                .load(Ordering::Relaxed),
            -1_100_000
        );
        let m = acc.snapshot_window(3600, now_ns);
        assert!((m.simulated_pnl_aggregated_usd + 110.0).abs() < 1e-2);
    }

    #[test]
    fn events_outside_window_are_excluded() {
        let mut acc = EconomicAccumulator::new();
        let now_ns = 10_000_000_000_000;
        // Evento fora da janela 1h.
        let setup_old = mk_setup(now_ns - 3_700_000_000_000);
        acc.push(EconomicEvent::new(
            &setup_old,
            TradeOutcome::Realized {
                enter_realized_pct: 5.0,
                exit_realized_pct: 5.0,
                horizon_observed_s: 100,
            },
            now_ns - 3_700_000_000_000, // resolved_ns > 1h atrás
            false,
        ));
        let m = acc.snapshot_window(3600, now_ns);
        assert_eq!(m.n_emissions, 0);
    }

    #[test]
    fn json_line_serialization_is_parseable() {
        let setup = mk_setup(1_700_000_000_000_000_000);
        let evt = EconomicEvent::new(
            &setup,
            TradeOutcome::Realized {
                enter_realized_pct: 2.1,
                exit_realized_pct: -0.8,
                horizon_observed_s: 300,
            },
            1_700_000_001_000_000_000,
            false,
        );
        let line = evt.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).expect("valid json");
        assert_eq!(v["outcome"], "realized");
        assert_eq!(v["horizon_observed_s"], 300);
        assert_eq!(v["from_model"], false);
    }

    #[test]
    fn buffer_respects_max_capacity() {
        let mut acc = EconomicAccumulator::with_capacity(3);
        let setup = mk_setup(1);
        for _ in 0..5 {
            acc.push(EconomicEvent::new(
                &setup,
                TradeOutcome::WindowMiss,
                2,
                false,
            ));
        }
        assert_eq!(acc.len(), 3);
        // Counter atômico NÃO é truncado (registra todos 5).
        assert_eq!(acc.metrics().n_emissions_total.load(Ordering::Relaxed), 5);
    }

    #[test]
    fn standard_windows_returns_four() {
        let acc = EconomicAccumulator::new();
        let ws = acc.standard_windows(1_000_000_000_000);
        assert_eq!(ws.len(), 4);
        assert_eq!(ws[0].window_s, 3_600);
        assert_eq!(ws[3].window_s, 2_592_000);
    }
}
