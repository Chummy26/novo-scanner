//! Módulo econômico — `simulated_pnl_bruto_aggregated` (ADR-019).
//!
//! Implementa o gate econômico obrigatório do Marco 0+: para cada
//! recomendação emitida (Trade), o `EconomicEvaluator` resolve o
//! outcome (REALIZED / EXIT_MISS) varrendo as amostras
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
//! REALIZED    se ∃ t_exit ∈ [t₀, valid_until]: exitSpread(t_exit) ≥ exit_target
//! EXIT_MISS   se a saída não atinge `exit_target` até o timeout
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

/// Outcome resolvido de uma recomendação.
///
/// `entry_now` é imutável por skill §3.1 (preço executado). PnL bruto deriva
/// de `entry_locked + exit_realized_pct` — entry é parâmetro externo.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TradeOutcome {
    /// Entry travado em t0 e saída realizada conforme regra.
    Realized {
        exit_realized_pct: f32,
        horizon_observed_ms: u32,
    },
    /// Exit não atingiu threshold dentro de `T_max` — fechamento forçado.
    ExitMiss { forced_exit_pct: f32 },
    /// Horizonte não observado com dados limpos até `valid_until`.
    /// Não alimenta PnL agregado nem calibração.
    Censored,
}

impl TradeOutcome {
    /// PnL bruto percentual dado `entry_now` travado em t0.
    pub fn gross_pnl_pct(&self, entry_locked_pct: f32) -> f32 {
        match *self {
            TradeOutcome::Realized {
                exit_realized_pct, ..
            } => entry_locked_pct + exit_realized_pct,
            TradeOutcome::ExitMiss { forced_exit_pct } => entry_locked_pct + forced_exit_pct,
            TradeOutcome::Censored => f32::NAN,
        }
    }

    /// Valor indicativo bruto sobre `CAPITAL_HYPOTHETICAL_USD` — não é PnL
    /// operacional real; fees/funding/slippage excluídos (fronteira ML).
    pub fn indicative_gross_at_10k_ref_usd(&self, entry_locked_pct: f32) -> f64 {
        (self.gross_pnl_pct(entry_locked_pct) as f64 / 100.0) * CAPITAL_HYPOTHETICAL_USD
    }
}

/// Evento registrado por emissão (recomendação + outcome resolvido).
///
/// inclui `sampling_probability` para Horvitz-Thompson 1952 correto
/// na agregação `WindowMetrics`. Eventos allowlist (π=1.0) ponderam
/// diferente de eventos Uniform (π=0.1); agregação ingênua enviesa para
/// rotas priority sobre-representadas.
///
/// campo renomeado `gross_pnl_usd` → `indicative_gross_at_10k_ref_usd`
/// para eliminar semântica falsa de "ganho operacional real" no dashboard.
#[derive(Debug, Clone)]
pub struct EconomicEvent {
    pub ts_emitted_ns: u64,
    pub ts_resolved_ns: u64,
    pub route_id: RouteId,
    pub model_version: String,
    /// fonte canônica via enum, substituindo prefix match `!starts_with("baseline-")`.
    pub source_kind: crate::ml::contract::SourceKind,
    /// `entry_now` travado pelo `TradeSetup` em t0 (imutável, skill §3.1).
    pub entry_locked_pct: f32,
    pub outcome: TradeOutcome,
    /// Lucro bruto percentual (entry_locked + exit_realized). Cacheado.
    pub gross_pnl_pct: f32,
    /// Valor indicativo sobre 10k USDT de referência.
    /// **NÃO é PnL operacional real** — fees/funding/slippage excluídos
    /// (CLAUDE.md §Fronteira ML). Renomeado em fix D11.
    pub indicative_gross_at_10k_ref_usd: f64,
    /// probabilidade de amostragem Horvitz-Thompson (IPW).
    /// NaN ⇒ trainer/agregador deve estimar offline.
    pub sampling_probability: f32,
    /// `true` se foi recomendação do modelo real; `false` se baseline/fallback.
    /// Derivado de `source_kind.is_model()` — mantido para compat binário dos
    /// consumidores JSONL mais antigos.
    pub from_model: bool,
    /// Forecast condicional calibrado do modelo para `P_hit`.
    ///
    /// Baseline A3 degradado deixa `None`; sua taxa marginal histórica fica
    /// apenas em `BaselineDiagnostics` e não alimenta ECE do modelo.
    pub p_hit_forecast: Option<f32>,
}

impl EconomicEvent {
    pub fn new(setup: &TradeSetup, outcome: TradeOutcome, resolved_ns: u64) -> Self {
        let gross_pct = outcome.gross_pnl_pct(setup.entry_now);
        Self {
            ts_emitted_ns: setup.emitted_at,
            ts_resolved_ns: resolved_ns,
            route_id: setup.route_id,
            model_version: setup.model_version.clone(),
            source_kind: setup.source_kind,
            entry_locked_pct: setup.entry_now,
            outcome,
            gross_pnl_pct: gross_pct,
            indicative_gross_at_10k_ref_usd: (gross_pct as f64 / 100.0) * CAPITAL_HYPOTHETICAL_USD,
            sampling_probability: f32::NAN,
            from_model: setup.source_kind.is_model(),
            p_hit_forecast: setup.p_hit,
        }
    }

    /// Serialização JSONL (persistência append-only `data/ml/economic/`).
    pub fn to_json_line(&self) -> String {
        let (outcome_label, exit_r, horizon) = match self.outcome {
            TradeOutcome::Realized {
                exit_realized_pct,
                horizon_observed_ms,
            } => (
                "realized",
                Some(exit_realized_pct),
                horizon_observed_ms as i32,
            ),
            TradeOutcome::ExitMiss { forced_exit_pct } => ("exit_miss", Some(forced_exit_pct), -1),
            TradeOutcome::Censored => ("censored", None, -1),
        };
        format!(
            concat!(
                r#"{{"ts_emitted_ns":{},"ts_resolved_ns":{},"#,
                r#""symbol_id":{},"buy_venue":"{}","sell_venue":"{}","#,
                r#""model_version":"{}","source_kind":"{}","outcome":"{}","#,
                r#""entry_locked_pct":{},"exit_realized_pct":{},"#,
                r#""horizon_observed_ms":{},"gross_pnl_pct":{},"#,
                r#""indicative_gross_at_10k_ref_usd":{},"#,
                r#""sampling_probability":{},"from_model":{},"#,
                r#""disclaimer":"bruto sobre capital hipotético 10k; não inclui fees/funding/slippage"}}"#,
            ),
            self.ts_emitted_ns,
            self.ts_resolved_ns,
            self.route_id.symbol_id.0,
            self.route_id.buy_venue.as_str(),
            self.route_id.sell_venue.as_str(),
            self.model_version,
            self.source_kind.as_str(),
            outcome_label,
            finite_or_null_f32(self.entry_locked_pct),
            opt_f32_or_null(exit_r),
            horizon,
            finite_or_null_f32(self.gross_pnl_pct),
            finite_or_null_f64(self.indicative_gross_at_10k_ref_usd),
            finite_or_null_f32(self.sampling_probability),
            self.from_model,
        )
    }
}

#[inline]
fn finite_or_null_f32(v: f32) -> String {
    if v.is_finite() {
        v.to_string()
    } else {
        "null".into()
    }
}

#[inline]
fn opt_f32_or_null(v: Option<f32>) -> String {
    v.map(finite_or_null_f32).unwrap_or_else(|| "null".into())
}

#[inline]
fn finite_or_null_f64(v: f64) -> String {
    if v.is_finite() {
        v.to_string()
    } else {
        "null".into()
    }
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
    pub n_exit_miss: u64,
    pub n_censored: u64,
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
            n_exit_miss: 0,
            n_censored: 0,
            simulated_pnl_aggregated_usd: 0.0,
            pnl_per_emission_median_usd: 0.0,
            pnl_per_emission_p10_usd: 0.0,
            realization_rate: 0.0,
        }
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
    /// Calibration tracker rolling por bucket.
    /// Registra `(P_hit, realized)` apenas quando há forecast condicional.
    /// Exposto via `calibration_ece()` + `reliability_points()`.
    calibration: CalibrationAccumulator,
}

/// Contadores atômicos para Prometheus (exportado via `ml/metrics.rs`).
#[derive(Debug, Default)]
pub struct EconomicMetrics {
    pub n_emissions_total: std::sync::atomic::AtomicU64,
    pub n_realized_total: std::sync::atomic::AtomicU64,
    pub n_exit_miss_total: std::sync::atomic::AtomicU64,
    pub n_censored_total: std::sync::atomic::AtomicU64,
    /// PnL agregado USD × 1e4 (inteiro para evitar float atômico).
    /// Divide por 1e4 ao ler.
    pub pnl_aggregated_usd_times_10k: AtomicI64,
    /// Expected Calibration Error em bps (×1e4).
    /// Atualizado quando um evento com `p_hit_forecast` resolve.
    /// ECE = Σ |conf_bucket − freq_bucket| × (n_bucket / n_total).
    /// Meta CLAUDE.md: ECE < 0.10 (1000 bps) em janela 24h.
    pub calibration_ece_bps: std::sync::atomic::AtomicU64,
    /// Número total de pares (P_emitida, y_realized) observados.
    pub calibration_observations: std::sync::atomic::AtomicU64,
}

// ---------------------------------------------------------------------------
// BaseRateAccumulator (ECE bucket-based)
// ---------------------------------------------------------------------------

/// Buckets de horizonte para ECE condicional.
///
/// Skill §3.2: multiplicidade de pares (t0, t1) significa que calibração deve
/// ser avaliada por horizonte. Misturar setups de 30s vs 8h num único ECE
/// viola DeGroot-Fienberg 1983 (reliability diagram assume condição idêntica).
///
/// Grid log-uniforme: `< 60s | < 5min | < 30min | < 2h | >= 2h`.
pub const HORIZON_BUCKETS_S: [u32; 5] = [60, 300, 1800, 7200, u32::MAX];

/// Classifica `horizon_observed_ms` em bucket de horizonte.
#[inline]
pub fn horizon_bucket_idx(horizon_observed_ms: u32) -> usize {
    let horizon_s = horizon_observed_ms / 1000;
    HORIZON_BUCKETS_S
        .iter()
        .position(|&threshold| horizon_s < threshold)
        .unwrap_or(HORIZON_BUCKETS_S.len() - 1)
}

/// Janela de decay para ECE rolling.
///
/// Sem decay, acumulador vitalício atenua drift: em 30 dias, um regime novo
/// de 6h representa ~0.8% do total e não move ECE. Meta CLAUDE.md "ECE<0.10
/// em janela 24h" requer decay. Half-life 24h via exponential weighting.
pub const ECE_DECAY_HALF_LIFE_NS: u64 = 24 * 3600 * 1_000_000_000;

/// Acumulador de calibração de `P_hit` com decay exponencial e segregação
/// por horizonte (fixes D6 + D8).
///
/// Buckets: `[horizon_bucket; 5] × [p_decile; 10]`. Contadores em `f64`
/// decaídos exponencialmente com half-life 24h para responder a drift.
///
/// DeGroot & Fienberg 1983 (reliability). Ao contrário do acumulador
/// vitalício anterior, este limita janela efetiva e segrega condição de
/// horizonte.
#[derive(Debug)]
pub struct CalibrationAccumulator {
    /// `(n_soft, k_soft)` por (horizon_bucket, p_decile). f64 para decay.
    pub buckets: [[(f64, f64); 10]; 5],
    /// Último timestamp de record para decay entre chamadas.
    last_record_ns: u64,
    /// Agregado sem segregação de horizonte — compat com API `ece()` global.
    flat_buckets: [(u64, u64); 10],
}

impl Default for CalibrationAccumulator {
    fn default() -> Self {
        Self {
            buckets: [[(0.0, 0.0); 10]; 5],
            last_record_ns: 0,
            flat_buckets: [(0, 0); 10],
        }
    }
}

impl CalibrationAccumulator {
    /// Registra observação com horizonte e timestamp.
    pub fn record_at(&mut self, p_hit: f32, realized: bool, horizon_observed_ms: u32, now_ns: u64) {
        // Decay exponencial sobre buckets por horizonte.
        if self.last_record_ns > 0 && now_ns > self.last_record_ns {
            let dt_ns = now_ns - self.last_record_ns;
            let decay = (-0.693147_f64 * (dt_ns as f64) / (ECE_DECAY_HALF_LIFE_NS as f64)).exp();
            for h_row in self.buckets.iter_mut() {
                for slot in h_row.iter_mut() {
                    slot.0 *= decay;
                    slot.1 *= decay;
                }
            }
        }
        self.last_record_ns = now_ns;

        let p = p_hit.clamp(0.0, 0.9999);
        let p_idx = ((p * 10.0) as usize).min(9);
        let h_idx = horizon_bucket_idx(horizon_observed_ms);

        self.buckets[h_idx][p_idx].0 += 1.0;
        if realized {
            self.buckets[h_idx][p_idx].1 += 1.0;
        }
        // Flat agregado — não-decaído para API antiga.
        self.flat_buckets[p_idx].0 = self.flat_buckets[p_idx].0.saturating_add(1);
        if realized {
            self.flat_buckets[p_idx].1 = self.flat_buckets[p_idx].1.saturating_add(1);
        }
    }

    /// Total de observações registradas (API legada via flat_buckets).
    pub fn total(&self) -> u64 {
        self.flat_buckets.iter().map(|(n, _)| *n).sum()
    }

    /// Total decaído (soma sobre todos horizon buckets).
    fn total_soft(&self) -> f64 {
        self.buckets
            .iter()
            .flat_map(|row| row.iter())
            .map(|(n, _)| *n)
            .sum()
    }

    /// ECE global (agregado sobre horizontes) com decay ativo.
    ///
    /// usa soft counts decaídos; meta "ECE<0.10 em 24h" computável.
    pub fn ece(&self) -> f32 {
        let total = self.total_soft();
        if total < 10.0 {
            return 0.0;
        }
        let mut ece = 0.0_f64;
        for (p_idx, p_bucket) in self.flat_buckets.iter().enumerate() {
            // Agrega soft counts dos 5 horizon buckets no mesmo decil.
            let (mut n_soft, mut k_soft) = (0.0_f64, 0.0_f64);
            for h_row in self.buckets.iter() {
                n_soft += h_row[p_idx].0;
                k_soft += h_row[p_idx].1;
            }
            let _ = p_bucket;
            if n_soft == 0.0 {
                continue;
            }
            let conf_mid = (p_idx as f64 + 0.5) / 10.0;
            let freq = k_soft / n_soft;
            let weight = n_soft / total;
            ece += (conf_mid - freq).abs() * weight;
        }
        ece as f32
    }

    /// ECE por bucket de horizonte. Útil para detectar miscalibração
    /// localizada (curto superconfiante + longo subconfiante se compensam no
    /// ECE global).
    pub fn ece_by_horizon_bucket(&self) -> [Option<f32>; 5] {
        let mut out = [None; 5];
        for (h_idx, h_row) in self.buckets.iter().enumerate() {
            let total: f64 = h_row.iter().map(|(n, _)| *n).sum();
            if total < 10.0 {
                continue;
            }
            let mut ece = 0.0_f64;
            for (p_idx, (n_soft, k_soft)) in h_row.iter().enumerate() {
                if *n_soft == 0.0 {
                    continue;
                }
                let conf_mid = (p_idx as f64 + 0.5) / 10.0;
                let freq = k_soft / n_soft;
                let weight = n_soft / total;
                ece += (conf_mid - freq).abs() * weight;
            }
            out[h_idx] = Some(ece as f32);
        }
        out
    }

    /// Reliability diagram data — pontos com IC de Wilson por bucket.
    /// Buckets com `n < RELIABILITY_BUCKET_MIN_N` são marcados `unstable`.
    pub fn reliability_points(&self) -> Vec<ReliabilityPoint> {
        let mut pts = Vec::new();
        for (i, (n, k)) in self.flat_buckets.iter().enumerate() {
            if *n == 0 {
                continue;
            }
            let conf_mid = (i as f32 + 0.5) / 10.0;
            let freq = (*k as f32) / (*n as f32);
            let (ic_lower, ic_upper) = wilson_ci_95(*n, *k);
            pts.push(ReliabilityPoint {
                conf_mid,
                freq,
                n: *n,
                ic_lower,
                ic_upper,
                unstable: *n < RELIABILITY_BUCKET_MIN_N,
            });
        }
        pts
    }
}

/// Threshold mínimo de amostras por bucket para considerar estatisticamente
/// estável. Wilson IC perde acurácia abaixo desse N (Student-t rule-of-thumb).
pub const RELIABILITY_BUCKET_MIN_N: u64 = 30;

/// Ponto do reliability diagram com IC de Wilson.
///
/// Campos:
/// - `conf_mid`: centro do decil de confiança (0.05, 0.15, ..., 0.95).
/// - `freq`: frequência empírica realizada dentro do bucket.
/// - `n`: tamanho da amostra no bucket.
/// - `ic_lower`, `ic_upper`: Wilson 95% IC da frequência.
/// - `unstable`: `true` se `n < RELIABILITY_BUCKET_MIN_N`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ReliabilityPoint {
    pub conf_mid: f32,
    pub freq: f32,
    pub n: u64,
    pub ic_lower: f32,
    pub ic_upper: f32,
    pub unstable: bool,
}

/// Wilson score interval 95% (Wilson 1927, Agresti-Coull 1998).
///
/// `IC = [ĉp − margin, ĉp + margin]`
/// onde `ĉp = (p̂ + z²/(2n)) / (1 + z²/n)`
/// e `margin = z × sqrt(p̂(1−p̂)/n + z²/(4n²)) / (1 + z²/n)`.
///
/// Para `n=0` retorna `(0.0, 1.0)` (intervalo total — desconhecido).
///
/// Superior a Wald para proporções em amostra pequena: não viola `[0, 1]`,
/// não colapsa em `p=0` ou `p=1`, cobertura empírica mais próxima do nominal.
pub fn wilson_ci_95(n: u64, k: u64) -> (f32, f32) {
    if n == 0 {
        return (0.0, 1.0);
    }
    // z = 1.96 para 95% de confiança (two-sided normal).
    const Z: f64 = 1.96;
    const Z2: f64 = Z * Z;
    let n_f = n as f64;
    let p = (k as f64) / n_f;
    let denom = 1.0 + Z2 / n_f;
    let center = (p + Z2 / (2.0 * n_f)) / denom;
    let margin_term = (p * (1.0 - p) / n_f + Z2 / (4.0 * n_f * n_f)).sqrt();
    let margin = Z * margin_term / denom;
    let lo = (center - margin).clamp(0.0, 1.0) as f32;
    let hi = (center + margin).clamp(0.0, 1.0) as f32;
    (lo, hi)
}

impl EconomicAccumulator {
    pub fn new() -> Self {
        // meta CLAUDE.md "ECE<0.10 em 24h" implica janela 24h ~3.7M
        // eventos a 1 rec/min × 2600 rotas. 100k anterior truncava em ~40min.
        // Elevamos para 4M para cobrir 24h com folga em regime estacionário.
        Self::with_capacity(4_000_000)
    }

    pub fn with_capacity(max_events: usize) -> Self {
        Self {
            events: VecDeque::with_capacity(max_events.min(1024)),
            max_events,
            metrics: Arc::new(EconomicMetrics::default()),
            calibration: CalibrationAccumulator::default(),
        }
    }

    pub fn metrics(&self) -> Arc<EconomicMetrics> {
        Arc::clone(&self.metrics)
    }

    /// ECE atual (bucket-based). Ver [`CalibrationAccumulator::ece`].
    pub fn calibration_ece(&self) -> f32 {
        self.calibration.ece()
    }

    /// Reliability diagram data para dashboard (com Wilson IC 95% por bucket).
    pub fn reliability_points(&self) -> Vec<ReliabilityPoint> {
        self.calibration.reliability_points()
    }

    /// Adiciona evento resolvido ao buffer + atualiza métricas atômicas
    /// + calibration tracker.
    pub fn push(&mut self, evt: EconomicEvent) {
        self.metrics
            .n_emissions_total
            .fetch_add(1, Ordering::Relaxed);
        let realized_bool = matches!(evt.outcome, TradeOutcome::Realized { .. });
        match evt.outcome {
            TradeOutcome::Realized { .. } => {
                self.metrics
                    .n_realized_total
                    .fetch_add(1, Ordering::Relaxed);
            }
            TradeOutcome::ExitMiss { .. } => {
                self.metrics
                    .n_exit_miss_total
                    .fetch_add(1, Ordering::Relaxed);
            }
            TradeOutcome::Censored => {
                self.metrics
                    .n_censored_total
                    .fetch_add(1, Ordering::Relaxed);
            }
        }
        if evt.indicative_gross_at_10k_ref_usd.is_finite() {
            let pnl_scaled = (evt.indicative_gross_at_10k_ref_usd * 10_000.0) as i64;
            // Delta assinado preserva perdas e ganhos sem underflow/wrap.
            self.metrics
                .pnl_aggregated_usd_times_10k
                .fetch_add(pnl_scaled, Ordering::Relaxed);
        }

        // record_at com horizonte observado para ECE segregada.
        // ts_resolved_ns aciona decay exponencial 24h.
        if let Some(p_hit) = evt.p_hit_forecast {
            if matches!(evt.outcome, TradeOutcome::Censored) {
                self.events.push_back(evt);
                while self.events.len() > self.max_events {
                    self.events.pop_front();
                }
                return;
            }
            let horizon_ms = match evt.outcome {
                TradeOutcome::Realized {
                    horizon_observed_ms,
                    ..
                } => horizon_observed_ms,
                TradeOutcome::ExitMiss { .. } => u32::MAX, // longest bucket
                TradeOutcome::Censored => unreachable!("censored returned before calibration"),
            };
            self.calibration
                .record_at(p_hit, realized_bool, horizon_ms, evt.ts_resolved_ns);
        }
        let ece_bps = (self.calibration.ece() * 10_000.0) as u64;
        self.metrics
            .calibration_ece_bps
            .store(ece_bps, Ordering::Relaxed);
        self.metrics
            .calibration_observations
            .store(self.calibration.total(), Ordering::Relaxed);

        self.events.push_back(evt);
        while self.events.len() > self.max_events {
            self.events.pop_front();
        }
    }

    /// Snapshot agregado de eventos resolvidos em [now − window, now].
    ///
    /// aplica Horvitz-Thompson 1952 quando `sampling_probability` é
    /// finito. Eventos allowlist (π=1.0) ponderam 1×, Uniform (π=0.1)
    /// ponderam 10×; reconstrói distribuição populacional sem viés para
    /// rotas priority sobre-representadas.
    pub fn snapshot_window(&self, window_s: u32, now_ns: u64) -> WindowMetrics {
        let window_ns = (window_s as u64) * 1_000_000_000;
        let cutoff = now_ns.saturating_sub(window_ns);
        let relevant: Vec<&EconomicEvent> = self
            .events
            .iter()
            .filter(|e| e.ts_resolved_ns >= cutoff && e.ts_resolved_ns <= now_ns)
            .collect();
        let n = relevant.len() as u64;
        if n == 0 {
            return WindowMetrics::empty(window_s);
        }
        let mut realized = 0u64;
        let mut exit_miss = 0u64;
        let mut censored = 0u64;
        let mut total_usd = 0.0;
        let mut pnl_vec: Vec<f64> = Vec::with_capacity(relevant.len());
        // IPW: se `sampling_probability` ausente/NaN, peso = 1.0 (neutro).
        let mut weighted_realized = 0.0_f64;
        let mut weighted_n = 0.0_f64;
        for e in &relevant {
            match e.outcome {
                TradeOutcome::Realized { .. } => realized += 1,
                TradeOutcome::ExitMiss { .. } => exit_miss += 1,
                TradeOutcome::Censored => censored += 1,
            }
            if matches!(e.outcome, TradeOutcome::Censored) {
                continue;
            }
            let w: f64 = if e.sampling_probability.is_finite() && e.sampling_probability > 1e-6 {
                1.0 / (e.sampling_probability as f64)
            } else {
                1.0
            };
            let is_realized = matches!(e.outcome, TradeOutcome::Realized { .. });
            weighted_n += w;
            if is_realized {
                weighted_realized += w;
            }
            if e.indicative_gross_at_10k_ref_usd.is_finite() {
                total_usd += e.indicative_gross_at_10k_ref_usd * w;
                pnl_vec.push(e.indicative_gross_at_10k_ref_usd);
            }
        }
        if pnl_vec.is_empty() {
            return WindowMetrics {
                window_s,
                n_emissions: n,
                n_realized: realized,
                n_exit_miss: exit_miss,
                n_censored: censored,
                simulated_pnl_aggregated_usd: 0.0,
                pnl_per_emission_median_usd: 0.0,
                pnl_per_emission_p10_usd: 0.0,
                realization_rate: 0.0,
            };
        }
        pnl_vec.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let median = pnl_vec[pnl_vec.len() / 2];
        let p10 = pnl_vec[pnl_vec.len() / 10];
        let realization_rate = if weighted_n > 0.0 {
            (weighted_realized / weighted_n) as f32
        } else {
            realized as f32 / n as f32
        };
        WindowMetrics {
            window_s,
            n_emissions: n,
            n_realized: realized,
            n_exit_miss: exit_miss,
            n_censored: censored,
            simulated_pnl_aggregated_usd: total_usd,
            pnl_per_emission_median_usd: median,
            pnl_per_emission_p10_usd: p10,
            realization_rate,
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
        BaselineDiagnostics, CalibStatus, ReasonDetail, ReasonKind, SourceKind, TradeReason,
    };
    use crate::types::{SymbolId, Venue};

    fn mk_setup(emitted_at: u64) -> TradeSetup {
        TradeSetup {
            route_id: RouteId {
                symbol_id: SymbolId(1),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
            entry_now: 2.5,
            exit_target: -0.5,
            gross_profit_target: 2.0, // entry_now + exit_q50 = 2.5 + (-0.5)
            p_hit: Some(0.83),
            p_hit_ci: Some((0.77, 0.88)),
            ci_method: "wilson_marginal",
            exit_q25: Some(-0.8),
            exit_q50: Some(-0.5),
            exit_q75: Some(-0.2),
            t_hit_p25_s: Some(900),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(3120),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
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
                historical_base_rate_24h: 0.77,
                historical_base_rate_ci: (0.70, 0.82),
            }),
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            cluster_detection_status: "not_implemented",
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: ReasonDetail::placeholder(),
            },
            model_version: "baseline-a3-0.2.0".into(),
            source_kind: SourceKind::Baseline,
            emitted_at,
            valid_until: emitted_at + 30_000_000_000,
        }
    }

    #[test]
    fn realized_outcome_computes_pnl_correctly() {
        let out = TradeOutcome::Realized {
            exit_realized_pct: -0.9,
            horizon_observed_ms: 400,
        };
        // entry_locked é parâmetro externo, não campo interno.
        assert!((out.gross_pnl_pct(2.3) - 1.4).abs() < 1e-5);
        // 1.4% × 10_000 / 100 = 140 USD
        assert!((out.indicative_gross_at_10k_ref_usd(2.3) - 140.0).abs() < 1e-3);
    }

    #[test]
    fn censored_outcome_does_not_feed_pnl_or_calibration() {
        let mut acc = EconomicAccumulator::new();
        let now_ns = 1_000_000_000_000;
        let setup = mk_setup(now_ns - 500_000_000);
        acc.push(EconomicEvent::new(&setup, TradeOutcome::Censored, now_ns));

        let metrics = acc.metrics();
        assert_eq!(metrics.n_censored_total.load(Ordering::Relaxed), 1);
        assert_eq!(
            metrics.pnl_aggregated_usd_times_10k.load(Ordering::Relaxed),
            0
        );
        assert_eq!(metrics.calibration_observations.load(Ordering::Relaxed), 0);

        let m = acc.snapshot_window(3600, now_ns);
        assert_eq!(m.n_censored, 1);
        assert_eq!(m.n_exit_miss, 0);
        assert_eq!(m.simulated_pnl_aggregated_usd, 0.0);

        let line = EconomicEvent::new(&setup, TradeOutcome::Censored, now_ns).to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).expect("valid json");
        assert_eq!(v["outcome"], "censored");
        assert!(v["exit_realized_pct"].is_null());
        assert!(v["gross_pnl_pct"].is_null());
    }

    #[test]
    fn accumulator_tracks_aggregations() {
        let mut acc = EconomicAccumulator::new();
        let now_ns = 1_000_000_000_000;
        let setup1 = mk_setup(now_ns - 500_000_000);
        acc.push(EconomicEvent::new(
            &setup1,
            TradeOutcome::Realized {
                exit_realized_pct: -0.8,
                horizon_observed_ms: 300,
            },
            now_ns,
        ));
        let setup2 = mk_setup(now_ns - 400_000_000);
        acc.push(EconomicEvent::new(
            &setup2,
            TradeOutcome::ExitMiss {
                forced_exit_pct: -3.0,
            },
            now_ns,
        ));
        let m = acc.snapshot_window(3600, now_ns);
        assert_eq!(m.n_emissions, 2);
        assert_eq!(m.n_realized, 1);
        assert_eq!(m.n_exit_miss, 1);
        assert!((m.realization_rate - 0.5).abs() < 1e-4);
        // Realized: entry(2.5) + exit_realized(-0.8) = 1.7% × 10k/100 = 170.
        // ExitMiss: entry(2.5) + forced_exit(-3.0) = -0.5% × 10k/100 = -50.
        // Total: 120 USD.
        assert!((m.simulated_pnl_aggregated_usd - 120.0).abs() < 1e-2);
    }

    #[test]
    fn baseline_without_p_hit_does_not_feed_calibration() {
        let mut acc = EconomicAccumulator::new();
        let now_ns = 1_000_000_000_000;
        let mut setup = mk_setup(now_ns - 500_000_000);
        setup.p_hit = None;
        setup.p_hit_ci = None;
        setup.calibration_status = CalibStatus::Degraded;

        acc.push(EconomicEvent::new(
            &setup,
            TradeOutcome::Realized {
                exit_realized_pct: -0.8,
                horizon_observed_ms: 300,
            },
            now_ns,
        ));

        assert_eq!(
            acc.metrics()
                .calibration_observations
                .load(Ordering::Relaxed),
            0
        );
        assert_eq!(acc.calibration_ece(), 0.0);
    }

    #[test]
    fn accumulator_preserves_negative_pnl_sign() {
        let mut acc = EconomicAccumulator::new();
        let now_ns = 1_000_000_000_000;
        let mut setup = mk_setup(now_ns);
        // Força entry_now = 0 para teste de perda pura vir do exit.
        setup.entry_now = 0.0;
        setup.gross_profit_target = 0.0 + (-0.5); // entry + exit_q50
        acc.push(EconomicEvent::new(
            &setup,
            TradeOutcome::Realized {
                exit_realized_pct: -1.1,
                horizon_observed_ms: 300,
            },
            now_ns,
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
                exit_realized_pct: 5.0,
                horizon_observed_ms: 100,
            },
            now_ns - 3_700_000_000_000, // resolved_ns > 1h atrás
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
                exit_realized_pct: -0.8,
                horizon_observed_ms: 300,
            },
            1_700_000_001_000_000_000,
        );
        let line = evt.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).expect("valid json");
        assert_eq!(v["outcome"], "realized");
        assert_eq!(v["horizon_observed_ms"], 300);
        // setup_kind Baseline → from_model false.
        assert_eq!(v["from_model"], false);
        assert_eq!(v["source_kind"], "baseline");
        assert!(v["indicative_gross_at_10k_ref_usd"].is_number());
        assert!(v["disclaimer"].as_str().unwrap().contains("fees"));
    }

    #[test]
    fn buffer_respects_max_capacity() {
        let mut acc = EconomicAccumulator::with_capacity(3);
        let setup = mk_setup(1);
        for _ in 0..5 {
            acc.push(EconomicEvent::new(&setup, TradeOutcome::Censored, 2));
        }
        assert_eq!(acc.len(), 3);
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

    // ---- ECE por horizon bucket --------------------------------

    #[test]
    fn horizon_bucket_idx_segregates_correctly() {
        assert_eq!(horizon_bucket_idx(30_000), 0); // 30s < 60s
        assert_eq!(horizon_bucket_idx(120_000), 1); // 2min < 5min
        assert_eq!(horizon_bucket_idx(1_200_000), 2); // 20min < 30min
        assert_eq!(horizon_bucket_idx(3_600_000), 3); // 1h < 2h
        assert_eq!(horizon_bucket_idx(20_000_000), 4); // 5h bucket longest
    }

    #[test]
    fn ece_segregated_by_horizon_bucket() {
        let mut c = CalibrationAccumulator::default();
        // Bucket 0 (30s): calibrado 0.85 → 0.85 (3 obs)
        for _ in 0..3 {
            c.record_at(0.85, true, 30_000, 1_000_000_000_000);
        }
        // Bucket 3 (2h): miscalibrado 0.85 → 0.2 (100 obs para quorum)
        for _ in 0..20 {
            c.record_at(0.85, true, 4_000_000, 1_000_000_000_001);
        }
        for _ in 0..80 {
            c.record_at(0.85, false, 4_000_000, 1_000_000_000_001);
        }
        let per_bucket = c.ece_by_horizon_bucket();
        // Bucket 0: < 10 obs → None.
        assert!(per_bucket[0].is_none());
        // Bucket 3: 100 obs; freq_realized ≈ 0.2; conf_mid 0.85 → ECE ≈ 0.65.
        assert!(per_bucket[3].unwrap() > 0.3);
    }

    // ---- ECE com decay 24h --------------------------------------

    #[test]
    fn ece_decay_shrinks_old_observations() {
        let mut c = CalibrationAccumulator::default();
        let t0 = 1_000_000_000_000_000_000u64;
        // Observações antigas (muito miscalibradas).
        for _ in 0..100 {
            c.record_at(0.85, false, 1_800_000, t0);
        }
        let ece_fresh = c.ece();
        // 72h depois com observações bem calibradas.
        let t1 = t0 + 3 * ECE_DECAY_HALF_LIFE_NS;
        for _ in 0..100 {
            c.record_at(0.85, true, 1_800_000, t1);
        }
        let ece_decayed = c.ece();
        // Observações antigas decaíram por fator ~0.125 (3 half-lives),
        // então novas dominam; ECE cai substancialmente.
        assert!(
            ece_decayed < ece_fresh,
            "ECE decaída ({}) deveria ser menor que fresca ({})",
            ece_decayed,
            ece_fresh
        );
    }

    // -------------------------------------------------------------------
    // Wilson IC 95% + ReliabilityPoint (correção F2-R1 pós-auditoria 2026-04-22)
    // -------------------------------------------------------------------

    #[test]
    fn wilson_ci_handles_zero_samples() {
        // n=0: intervalo total [0, 1] — desconhecido.
        let (lo, hi) = wilson_ci_95(0, 0);
        assert_eq!(lo, 0.0);
        assert_eq!(hi, 1.0);
    }

    #[test]
    fn wilson_ci_does_not_exceed_unit_interval() {
        // Wilson nunca viola [0, 1] mesmo em corner cases (ao contrário de Wald).
        for (n, k) in [(1, 0), (1, 1), (10, 0), (10, 10), (100, 0), (100, 100)] {
            let (lo, hi) = wilson_ci_95(n, k);
            assert!(lo >= 0.0 && lo <= 1.0, "lo={} n={} k={}", lo, n, k);
            assert!(hi >= 0.0 && hi <= 1.0, "hi={} n={} k={}", hi, n, k);
            assert!(lo <= hi, "lo > hi: lo={} hi={}", lo, hi);
        }
    }

    #[test]
    fn wilson_ci_contains_observed_proportion_for_large_n() {
        // Amostra grande (n=1000, p̂=0.7): IC deve conter 0.7 e ser apertado.
        let (lo, hi) = wilson_ci_95(1000, 700);
        assert!(lo < 0.70 && hi > 0.70);
        assert!(
            hi - lo < 0.06,
            "IC muito largo para n=1000: width={}",
            hi - lo
        );
    }

    #[test]
    fn wilson_ci_widens_for_small_n() {
        // Amostra pequena (n=10, p̂=0.7): IC deve ser bem mais largo.
        let (lo_small, hi_small) = wilson_ci_95(10, 7);
        let (lo_large, hi_large) = wilson_ci_95(1000, 700);
        let width_small = hi_small - lo_small;
        let width_large = hi_large - lo_large;
        assert!(
            width_small > width_large * 3.0,
            "IC pequeno não é significativamente mais largo: small={} large={}",
            width_small,
            width_large
        );
    }

    #[test]
    fn wilson_ci_does_not_collapse_at_boundary() {
        // Wald colapsaria em (0, 0) para k=0; Wilson preserva IC não-trivial.
        let (lo, hi) = wilson_ci_95(50, 0);
        assert_eq!(lo, 0.0, "lower bound sensato em p̂=0");
        assert!(hi > 0.0, "upper bound NÃO deve colapsar em 0 para n>0");
        assert!(hi < 0.15, "upper bound razoavelmente apertado: hi={}", hi);
    }

    #[test]
    fn reliability_points_include_wilson_ic_and_stability_flag() {
        let mut c = CalibrationAccumulator::default();
        let mut ts = 1u64;
        // Bucket [0.8, 0.9): 50 emissões, 40 realized → freq = 0.80
        for _ in 0..40 {
            c.record_at(0.85, true, 0, ts);
            ts += 1;
        }
        for _ in 0..10 {
            c.record_at(0.85, false, 0, ts);
            ts += 1;
        }
        // Bucket [0.5, 0.6): 15 emissões, 8 realized → instável (n<30)
        for _ in 0..8 {
            c.record_at(0.55, true, 0, ts);
            ts += 1;
        }
        for _ in 0..7 {
            c.record_at(0.55, false, 0, ts);
            ts += 1;
        }

        let pts = c.reliability_points();
        assert_eq!(pts.len(), 2);

        let big = pts.iter().find(|p| p.n == 50).unwrap();
        assert!((big.freq - 0.80).abs() < 1e-4);
        assert!(big.ic_lower < 0.80 && big.ic_upper > 0.80);
        assert!(!big.unstable, "n=50 deve ser estável");
        assert!(big.ic_upper - big.ic_lower < 0.25);

        let small = pts.iter().find(|p| p.n == 15).unwrap();
        assert!(small.unstable, "n=15 < 30 deve ser unstable=true");
        let width = small.ic_upper - small.ic_lower;
        assert!(
            width > 0.30,
            "IC de bucket pequeno deve ser largo: {}",
            width
        );
    }

    #[test]
    fn reliability_bucket_min_n_matches_constant() {
        // Documenta que o threshold de stability é 30 (derivado de
        // aproximação normal → rule of thumb Student-t clássico).
        assert_eq!(RELIABILITY_BUCKET_MIN_N, 30);
    }
}
