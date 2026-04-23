//! Schema `LabeledTrade` — label supervisionado do objetivo ML.
//!
//! Wave V 2026-04-21. Correções PhD rodada 1 (C1-C5, A1-A6) e rodada 2
//! (P1-P6, Q1-Q5) integradas.
//!
//! # Semântica canônica
//!
//! - `entry_locked_pct = entry_spread(t0)` é **imutável por design**
//!   (skill §3.1 — "preços executados, não cotados"). O operador já entrou
//!   em t0; não é hipótese futura.
//! - Label resolve APENAS `exit(t1)` em `[t0, t0+horizon_s]` com t1 > t0.
//! - O alvo supervisionado principal é `first_exit_ge_label_floor_*` com
//!   censura; `best_exit_pct`/`best_gross_pct` são auditoria hindsight.
//!
//! # Fix C1 — filtragem obrigatória no trainer
//!
//! O resolver cria `PendingLabel` para **todos** os candidates limpos, não
//! apenas `sample_decision == "accept"`. Isso permite calibrar abstenção e
//! treinar classificador de `NoOpportunity`/`InsufficientData`. Porém o
//! objetivo canônico do modelo (CLAUDE.md §Objetivo) é aprender sobre a
//! cauda superior (Teste 1 da skill §4). Trainer **deve** filtrar:
//!
//! ```python
//! df_canonical = df[df["sample_decision"] == "accept"]
//! df_abstention = df[df["sample_decision"] != "accept"]
//! ```
//!
//! Sem este filtro, mistura de regimes contamina o target e calibração
//! fica ambígua.
//!
//! # Opção B: 1 record por (sample_id, horizon_s)
//!
//! Cada horizonte (15 min, 30 min, 2 h) escreve seu próprio record quando
//! fecha. JSONL é append-only; sem update in-place. Smoke test vê h15m em
//! 15 min sem esperar 2 h.
//!
//! # Alvos contínuos vs first-hit
//!
//! - First-hit (alvo principal anti-hindsight): `first_exit_ge_label_floor_*`
//!   com `label_floor_pct` explícito — falsificável sem conhecer a melhor
//!   saída absoluta da trajetória.
//! - Alvos contínuos: `best_exit_pct`, `best_gross_pct`, `T_to_best_s`.
//!   **Oracle hindsight** — usar apenas como auditoria/pesquisa ou alvo
//!   auxiliar explicitamente separado.
//!
//! # Fronteira ML
//!
//! Proibido por CLAUDE.md + skill §Fronteira: fees, funding, slippage,
//! PnL líquido, position sizing. Label só mede **lucro bruto cotado**.

use crate::ml::contract::RouteId;

/// Versão atual do schema do LabeledTrade.
///
/// v4 (2026-04-22): adiciona `sample_decision` e `label_floor_hits`
/// multi-threshold. Mantem os campos first-hit primarios por compatibilidade,
/// mas permite treinar P(exit >= floor | state, floor) sem congelar o modelo
/// em um unico floor global.
/// v5 (2026-04-23): `gross_run_*` passa a significar run histórico de
/// `exit >= label_floor - entry_locked(t0)`; `sampling_probability` do label
/// serializa null quando a probabilidade efetiva depende do stride por rota.
/// v6 (2026-04-23 Wave W): auditoria PhD de 70 findings. Novos campos:
///   - `FeaturesT0`: `entry_rank_percentile_24h`, `entry_minus_p50_24h`,
///     `entry_mad_robust_24h`, `p_exit_ge_label_floor_minus_entry_24h`,
///     `n_cache_observations_at_t0`, `oldest_cache_ts_ns`,
///     `log_min_vol24_usd`, `vol_ratio`, `exit_excess_run_s` (B1, B2, B4,
///     C7/C15); volumes brutos mantidos por compat porém marcados.
///   - `LabeledTrade`: `cluster_id`, `cluster_size`, `cluster_rank`,
///     `runtime_config_hash`, `priority_set_generation_id`,
///     `priority_set_updated_at_ns` (C2, C3, C13).
///   - `PolicyMetadata`: `candidates_in_route_last_24h`,
///     `accepts_in_route_last_24h`, `effective_stride_s`, `ci_method` (A6, C4, D2).
///   - Renomeação protetora: `best_exit_pct` → `audit_hindsight_best_exit_pct`,
///     `best_gross_pct` → `audit_hindsight_best_gross_pct`, `t_to_best_s` →
///     `audit_hindsight_t_to_best_s` (A10). Nomes antigos removidos do JSON.
///   - `SCANNER_VERSION` consolidado em `ml/mod.rs` (E5).
pub const LABELED_TRADE_SCHEMA_VERSION: u16 = 6;

/// Re-export da versão única do scanner (consolidada em `ml/mod.rs`, fix E5).
pub use crate::ml::SCANNER_VERSION;

/// Outcome resolvido de um horizonte do label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LabelOutcome {
    /// `first_exit_ge_label_floor` existe dentro de `[t0, t0+h]`.
    Realized,
    /// Horizonte completo observado; first-hit nunca ocorreu.
    Miss,
    /// Horizonte não foi observado por inteiro (rota silenciou ou shutdown).
    Censored,
}

impl LabelOutcome {
    pub fn as_str(self) -> &'static str {
        match self {
            LabelOutcome::Realized => "realized",
            LabelOutcome::Miss => "miss",
            LabelOutcome::Censored => "censored",
        }
    }
}

/// Fix A2 + A8: CensorReason tipado distinguindo ilíquidez transitória vs
/// delisting estrutural. `IncompleteWindow` removido (era dead code — nenhum
/// caminho produzia esse valor em sweep, shutdown usa `Shutdown` explícito).
///
/// Skill §6: censura é primeira ordem; Kaplan-Meier exige independência
/// entre mecanismo de censura e evento. Ilíquidez transitória (`RouteDormant`)
/// é aleatória; delisting (`RouteDelisted`) é informativa. Separar permite
/// trainer ajustar IPW por tipo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CensorReason {
    /// Alias histórico: rota silenciou além do threshold, antes de classificar
    /// como `Dormant`/`Delisted`. Mantido por compat com datasets pré-v6.
    RouteVanished,
    /// Rota ficou silenciosa entre `ROUTE_VANISH_IDLE_NS` e
    /// `ROUTE_DELISTED_IDLE_NS` — padrão típico de baixa liquidez intradiária.
    RouteDormant,
    /// Rota silenciou além de `ROUTE_DELISTED_IDLE_NS` — evento estrutural
    /// (delisting, halt, ticker rename). Censura informativa.
    RouteDelisted,
    /// Shutdown limpo do scanner; pendings sem horizonte completo.
    Shutdown,
}

impl CensorReason {
    pub fn as_str(self) -> &'static str {
        match self {
            CensorReason::RouteVanished => "route_vanished",
            CensorReason::RouteDormant => "route_dormant",
            CensorReason::RouteDelisted => "route_delisted",
            CensorReason::Shutdown => "shutdown",
        }
    }
}

/// Features observadas em t0 (estado estrutural de spread bruto).
///
/// Fix B1 + B2 + B4 + B8 + C7: schema v6 adiciona features que respondem
/// literalmente aos Testes 1 e 2 da skill §4.
#[derive(Debug, Clone)]
pub struct FeaturesT0 {
    // --- Liquidez (fix B4) -----------------------------------------------
    /// Volumes brutos mantidos por compat; preferir `log_min_vol24_usd` +
    /// `vol_ratio` como features; `buy_vol24`/`sell_vol24` expostos apenas
    /// para reconstrução offline de agregações pré-v6.
    pub buy_vol24: f64,
    pub sell_vol24: f64,
    /// Fix B4: amplitude de participantes (não capacidade operacional).
    /// Evita que modelo aprenda atalho "volume alto → atenua slippage" —
    /// CLAUDE.md §Fronteira ML proíbe modelar slippage/execução.
    pub log_min_vol24_usd: Option<f32>,
    /// Razão `max(buy,sell) / min(buy,sell)` — assimetria de liquidez.
    pub vol_ratio: Option<f32>,

    // --- Cauda (skill §4 Teste 1) ----------------------------------------
    pub tail_ratio_p99_p95: Option<f32>,
    pub entry_p25_24h: Option<f32>,
    pub entry_p50_24h: Option<f32>,
    pub entry_p75_24h: Option<f32>,
    pub entry_p95_24h: Option<f32>,
    /// Fix B1: percentil empírico de `entry_now` na ECDF 24h da rota.
    /// Teste 1 literal: `P_hist(entry ≤ entry_now)`. Feature primária
    /// que antes exigia reconstrução offline por composição não-linear.
    pub entry_rank_percentile_24h: Option<f32>,
    /// Fix B1: magnitude do entry atual vs mediana histórica.
    pub entry_minus_p50_24h: Option<f32>,
    /// Fix B1: Median Absolute Deviation robusto — escala para z-score
    /// resistente a caudas. Permite `z = (entry_now - p50) / MAD`.
    pub entry_mad_robust_24h: Option<f32>,

    // --- Saída (skill §4 Teste 2) ----------------------------------------
    pub exit_p25_24h: Option<f32>,
    pub exit_p50_24h: Option<f32>,
    pub exit_p75_24h: Option<f32>,
    pub exit_p95_24h: Option<f32>,
    /// Fix B2: frequência empírica `P_hist(exit ≥ label_floor − entry_now)`.
    /// Teste 2 literal: proxy direto da base rate do hit condicional.
    pub p_exit_ge_label_floor_minus_entry_24h: Option<f32>,

    // --- Runs (fix A4) ---------------------------------------------------
    /// Duração histórica de janelas em que `entry_locked(t0) + exit_hist`
    /// teria atingido o `label_floor_pct` primário. Computado como run de
    /// `exit_hist >= label_floor_pct - entry_locked(t0)`, não como
    /// `entry(t)+exit(t)` simultâneo.
    pub gross_run_p05_s: Option<u32>,
    pub gross_run_p50_s: Option<u32>,
    pub gross_run_p95_s: Option<u32>,
    /// Fix A4: runs de `exit(τ) ≥ exit_p50_24h`, sem condicionamento em
    /// entry atual. Feature mais estacionária complementar.
    pub exit_excess_run_s: Option<u32>,

    // --- Estado do cache PIT (fix C7) ------------------------------------
    /// Número de observações no cache rolante 24h da rota no instante t0.
    /// Permite trainer filtrar por "histórico suficiente" de forma idêntica
    /// ao gate do trigger e reconstruir estado PIT.
    pub n_cache_observations_at_t0: u32,
    /// Timestamp (ns) da observação mais antiga no ring no instante t0.
    /// Distância até `ts_emit_ns` revela cobertura temporal efetiva da
    /// janela 24h (rotas baixo-volume têm cobertura parcial).
    pub oldest_cache_ts_ns: u64,

    pub listing_age_days: Option<f32>,
}

/// Metadados de policy (auditoria, não target do modelo — correção A1/P3).
///
/// Fix A6 + C4 + D2: v6 adiciona contadores de `RouteRanking` para IPW
/// offline correto, `effective_stride_s` por horizonte (A13), `ci_method`.
#[derive(Debug, Clone)]
pub struct PolicyMetadata {
    pub baseline_model_version: String,
    pub baseline_recommended: bool,
    pub baseline_historical_base_rate_24h: Option<f32>,
    pub baseline_derived_enter_at_min: Option<f32>,
    pub baseline_derived_exit_at_min: Option<f32>,
    pub baseline_floor_pct: f32,
    pub label_stride_s: u32,
    /// Fix A13: stride efetivo por horizonte deste record específico.
    pub effective_stride_s: u32,
    /// Probabilidade efetiva do label quando conhecida.
    ///
    /// No runtime atual, o labeler usa stride por rota, não amostragem
    /// Bernoulli independente. A probabilidade efetiva depende da taxa
    /// observada de candidates por rota/horizonte; quando não for conhecida
    /// online, serializa como `null` e o trainer deve estimar offline.
    pub label_sampling_probability: f32,
    /// Fix A6: candidates da rota nas últimas 24h (pré-stride). Permite
    /// trainer reconstruir `π(x)` offline sem ambiguidade.
    pub candidates_in_route_last_24h: u32,
    /// Fix A6: accepts da rota nas últimas 24h. `accepts/candidates` é a
    /// taxa histórica de trigger aceitando na cauda.
    pub accepts_in_route_last_24h: u32,
    /// Fix D2: método usado para construir `p_hit_ci` do baseline/modelo
    /// que emitiu este candidate.
    pub ci_method: &'static str,
}

/// Resultado first-hit para um floor bruto especifico.
///
/// O primeiro elemento normalmente replica `label_floor_pct` e os campos
/// `first_exit_ge_label_floor_*` para compatibilidade. Demais elementos
/// permitem estimar a curva condicional P(exit atinge floor) sem oracle de
/// melhor saida absoluta.
#[derive(Debug, Clone)]
pub struct FloorHitLabel {
    pub floor_pct: f32,
    pub first_exit_ge_floor_ts_ns: Option<u64>,
    pub first_exit_ge_floor_pct: Option<f32>,
    pub t_to_first_hit_s: Option<u32>,
    pub realized: bool,
}

/// `LabeledTrade` — 1 record por `(sample_id, horizon_s)` conforme Opção B.
///
/// Schema v6 (fix C3, C13, A10, A9, C2):
/// - `best_*` → `audit_hindsight_best_*` (namespace protetor contra uso indevido como target);
/// - `cluster_id`/`cluster_size`/`cluster_rank` (anti-IID pseudoreplicação);
/// - `runtime_config_hash` (distingue datasets gerados com configs diferentes);
/// - `priority_set_generation_id`/`priority_set_updated_at_ns` (auditoria de membership);
/// - `observed_until_ns`/`closed_ts_ns`/`written_ts_ns` agora semanticamente distintos.
#[derive(Debug, Clone)]
pub struct LabeledTrade {
    // Identificação & join
    pub sample_id: String,
    pub sample_decision: &'static str,
    pub horizon_s: u32,
    pub ts_emit_ns: u64,
    pub cycle_seq: u32,
    pub schema_version: u16,
    pub scanner_version: &'static str,
    pub route_id: RouteId,
    pub symbol_name: String,

    // Fix C3: cluster de correlação para CPCV correto.
    /// ID do cluster: hash determinístico `route_id + floor(ts_emit_ns / 15min)`.
    pub cluster_id: String,
    /// Tamanho do cluster no instante de emit (inicializa 1; pode ser atualizado
    /// offline por detector correlacional).
    pub cluster_size: u32,
    /// Rank desta rota dentro do cluster (1 = melhor).
    pub cluster_rank: u32,

    // Fix C13: fingerprint da config runtime em hex16.
    pub runtime_config_hash: String,
    // Fix C2: auditoria de membership do priority_set.
    pub priority_set_generation_id: u32,
    pub priority_set_updated_at_ns: u64,

    // Entrada TRAVADA em t0 (imutável, skill §3.1)
    pub entry_locked_pct: f32,
    pub exit_start_pct: f32,

    // Features t0
    pub features_t0: FeaturesT0,

    // Fix A10: auditoria oracle/hindsight com prefix protetor — NUNCA usar
    // como target supervisionado principal. Nomes antigos (`best_exit_pct`
    // etc.) foram removidos do schema v6.
    pub audit_hindsight_best_exit_pct: Option<f32>,
    pub audit_hindsight_best_exit_ts_ns: Option<u64>,
    pub audit_hindsight_best_gross_pct: Option<f32>,
    pub audit_hindsight_t_to_best_s: Option<u32>,
    pub n_clean_future_samples: u32,

    // Alvos first-hit DERIVADOS de floor explícito (anti-hindsight)
    pub label_floor_pct: f32,
    pub first_exit_ge_label_floor_ts_ns: Option<u64>,
    pub first_exit_ge_label_floor_pct: Option<f32>,
    pub t_to_first_hit_s: Option<u32>,
    pub label_floor_hits: Vec<FloorHitLabel>,

    // Outcome + 3 timestamps distintos por semântica (correção P5, fix A9)
    pub outcome: LabelOutcome,
    pub censor_reason: Option<CensorReason>,
    /// Ts do último update do slot (limita best_exit/first_hit).
    pub observed_until_ns: u64,
    /// Ts em que o slot foi fechado pelo resolver (after close_slack ou sweep).
    pub closed_ts_ns: u64,
    /// Fix A9: ts em que o writer de fato serializou a linha. Agora distinto
    /// de `closed_ts_ns`; populado pelo writer task no momento do `writeln!`.
    pub written_ts_ns: u64,

    // Policy metadata (não é target)
    pub policy_metadata: PolicyMetadata,

    // Contexto de tier bruto. `sampling_probability` pode ser null quando
    // a probabilidade efetiva do label depende do stride por rota.
    pub sampling_tier: &'static str,
    pub sampling_probability: f32,
}

impl LabeledTrade {
    /// Serializa para linha JSON (sem newline).
    ///
    /// Schema v6 — renomes A10, novos campos C3/C13/C2, PolicyMetadata
    /// expandida (A6/C4/D2), FeaturesT0 expandida (B1/B2/B4/B8/C7).
    pub fn to_json_line(&self) -> String {
        let censor_str = self
            .censor_reason
            .map(|r| format!("\"{}\"", r.as_str()))
            .unwrap_or_else(|| "null".to_string());
        let label_floor_hits = floor_hits_json(&self.label_floor_hits);

        format!(
            concat!(
                r#"{{"sample_id":"{}","sample_decision":"{}","horizon_s":{},"ts_emit_ns":{},"cycle_seq":{},"#,
                r#""schema_version":{},"scanner_version":"{}","#,
                r#""cluster_id":"{}","cluster_size":{},"cluster_rank":{},"#,
                r#""runtime_config_hash":"{}","#,
                r#""priority_set_generation_id":{},"priority_set_updated_at_ns":{},"#,
                r#""symbol_id":{},"symbol_name":"{}","#,
                r#""buy_venue":"{}","sell_venue":"{}","#,
                r#""buy_market":"{}","sell_market":"{}","#,
                r#""entry_locked_pct":{},"exit_start_pct":{},"#,
                r#""features_t0":{{"buy_vol24":{},"sell_vol24":{},"#,
                r#""log_min_vol24_usd":{},"vol_ratio":{},"#,
                r#""tail_ratio_p99_p95":{},"entry_p25_24h":{},"entry_p50_24h":{},"#,
                r#""entry_p75_24h":{},"entry_p95_24h":{},"#,
                r#""entry_rank_percentile_24h":{},"entry_minus_p50_24h":{},"entry_mad_robust_24h":{},"#,
                r#""exit_p25_24h":{},"exit_p50_24h":{},"exit_p75_24h":{},"exit_p95_24h":{},"#,
                r#""p_exit_ge_label_floor_minus_entry_24h":{},"#,
                r#""gross_run_p05_s":{},"gross_run_p50_s":{},"gross_run_p95_s":{},"#,
                r#""exit_excess_run_s":{},"#,
                r#""n_cache_observations_at_t0":{},"oldest_cache_ts_ns":{},"#,
                r#""listing_age_days":{}}},"#,
                r#""audit_hindsight_best_exit_pct":{},"audit_hindsight_best_exit_ts_ns":{},"#,
                r#""audit_hindsight_best_gross_pct":{},"audit_hindsight_t_to_best_s":{},"#,
                r#""n_clean_future_samples":{},"#,
                r#""label_floor_pct":{},"first_exit_ge_label_floor_ts_ns":{},"#,
                r#""first_exit_ge_label_floor_pct":{},"t_to_first_hit_s":{},"#,
                r#""label_floor_hits":{},"#,
                r#""outcome":"{}","censor_reason":{},"#,
                r#""observed_until_ns":{},"closed_ts_ns":{},"written_ts_ns":{},"#,
                r#""policy_metadata":{{"baseline_model_version":"{}","#,
                r#""baseline_recommended":{},"baseline_historical_base_rate_24h":{},"#,
                r#""baseline_derived_enter_at_min":{},"baseline_derived_exit_at_min":{},"#,
                r#""baseline_floor_pct":{},"label_stride_s":{},"effective_stride_s":{},"#,
                r#""label_sampling_probability":{},"#,
                r#""candidates_in_route_last_24h":{},"accepts_in_route_last_24h":{},"#,
                r#""ci_method":"{}"}},"#,
                r#""sampling_tier":"{}","sampling_probability":{}}}"#,
            ),
            self.sample_id,
            self.sample_decision,
            self.horizon_s,
            self.ts_emit_ns,
            self.cycle_seq,
            self.schema_version,
            self.scanner_version,
            self.cluster_id,
            self.cluster_size,
            self.cluster_rank,
            self.runtime_config_hash,
            self.priority_set_generation_id,
            self.priority_set_updated_at_ns,
            self.route_id.symbol_id.0,
            escape_json(&self.symbol_name),
            self.route_id.buy_venue.as_str(),
            self.route_id.sell_venue.as_str(),
            self.route_id.buy_venue.market().as_str(),
            self.route_id.sell_venue.market().as_str(),
            f32_or_null(self.entry_locked_pct),
            f32_or_null(self.exit_start_pct),
            f64_or_null(self.features_t0.buy_vol24),
            f64_or_null(self.features_t0.sell_vol24),
            opt_f32(self.features_t0.log_min_vol24_usd),
            opt_f32(self.features_t0.vol_ratio),
            opt_f32(self.features_t0.tail_ratio_p99_p95),
            opt_f32(self.features_t0.entry_p25_24h),
            opt_f32(self.features_t0.entry_p50_24h),
            opt_f32(self.features_t0.entry_p75_24h),
            opt_f32(self.features_t0.entry_p95_24h),
            opt_f32(self.features_t0.entry_rank_percentile_24h),
            opt_f32(self.features_t0.entry_minus_p50_24h),
            opt_f32(self.features_t0.entry_mad_robust_24h),
            opt_f32(self.features_t0.exit_p25_24h),
            opt_f32(self.features_t0.exit_p50_24h),
            opt_f32(self.features_t0.exit_p75_24h),
            opt_f32(self.features_t0.exit_p95_24h),
            opt_f32(self.features_t0.p_exit_ge_label_floor_minus_entry_24h),
            opt_u32(self.features_t0.gross_run_p05_s),
            opt_u32(self.features_t0.gross_run_p50_s),
            opt_u32(self.features_t0.gross_run_p95_s),
            opt_u32(self.features_t0.exit_excess_run_s),
            self.features_t0.n_cache_observations_at_t0,
            self.features_t0.oldest_cache_ts_ns,
            opt_f32(self.features_t0.listing_age_days),
            opt_f32(self.audit_hindsight_best_exit_pct),
            opt_u64(self.audit_hindsight_best_exit_ts_ns),
            opt_f32(self.audit_hindsight_best_gross_pct),
            opt_u32(self.audit_hindsight_t_to_best_s),
            self.n_clean_future_samples,
            f32_or_null(self.label_floor_pct),
            opt_u64(self.first_exit_ge_label_floor_ts_ns),
            opt_f32(self.first_exit_ge_label_floor_pct),
            opt_u32(self.t_to_first_hit_s),
            label_floor_hits,
            self.outcome.as_str(),
            censor_str,
            self.observed_until_ns,
            self.closed_ts_ns,
            self.written_ts_ns,
            escape_json(&self.policy_metadata.baseline_model_version),
            self.policy_metadata.baseline_recommended,
            opt_f32(self.policy_metadata.baseline_historical_base_rate_24h),
            opt_f32(self.policy_metadata.baseline_derived_enter_at_min),
            opt_f32(self.policy_metadata.baseline_derived_exit_at_min),
            f32_or_null(self.policy_metadata.baseline_floor_pct),
            self.policy_metadata.label_stride_s,
            self.policy_metadata.effective_stride_s,
            f32_or_null(self.policy_metadata.label_sampling_probability),
            self.policy_metadata.candidates_in_route_last_24h,
            self.policy_metadata.accepts_in_route_last_24h,
            self.policy_metadata.ci_method,
            self.sampling_tier,
            f32_or_null(self.sampling_probability),
        )
    }
}

#[inline]
fn f32_or_null(v: f32) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
    }
}
#[inline]
fn f64_or_null(v: f64) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
    }
}
#[inline]
fn opt_f32(o: Option<f32>) -> String {
    match o {
        Some(v) => f32_or_null(v),
        None => "null".to_string(),
    }
}
#[inline]
fn opt_u32(o: Option<u32>) -> String {
    match o {
        Some(v) => v.to_string(),
        None => "null".to_string(),
    }
}
#[inline]
fn opt_u64(o: Option<u64>) -> String {
    match o {
        Some(v) => v.to_string(),
        None => "null".to_string(),
    }
}
#[inline]
fn escape_json(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn floor_hits_json(hits: &[FloorHitLabel]) -> String {
    let mut out = String::from("[");
    for (idx, hit) in hits.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push_str(&format!(
            concat!(
                r#"{{"floor_pct":{},"first_exit_ge_floor_ts_ns":{},"#,
                r#""first_exit_ge_floor_pct":{},"t_to_first_hit_s":{},"#,
                r#""realized":{}}}"#
            ),
            f32_or_null(hit.floor_pct),
            opt_u64(hit.first_exit_ge_floor_ts_ns),
            opt_f32(hit.first_exit_ge_floor_pct),
            opt_u32(hit.t_to_first_hit_s),
            hit.realized,
        ));
    }
    out.push(']');
    out
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(42),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_label() -> LabeledTrade {
        LabeledTrade {
            sample_id: "abcdef0123456789abcdef0123456789".into(),
            sample_decision: "accept",
            horizon_s: 900,
            ts_emit_ns: 1_700_000_000_000_000_000,
            cycle_seq: 42,
            schema_version: LABELED_TRADE_SCHEMA_VERSION,
            scanner_version: SCANNER_VERSION,
            cluster_id: "deadbeefdeadbeef".into(),
            cluster_size: 1,
            cluster_rank: 1,
            runtime_config_hash: "0000000000000000".into(),
            priority_set_generation_id: 0,
            priority_set_updated_at_ns: 0,
            route_id: mk_route(),
            symbol_name: "BTC-USDT".into(),
            entry_locked_pct: 2.5,
            exit_start_pct: -1.2,
            features_t0: FeaturesT0 {
                buy_vol24: 1e6,
                sell_vol24: 2e6,
                log_min_vol24_usd: Some(13.8),
                vol_ratio: Some(2.0),
                tail_ratio_p99_p95: Some(1.8),
                entry_p25_24h: Some(1.4),
                entry_p50_24h: Some(2.0),
                entry_p75_24h: Some(2.4),
                entry_p95_24h: Some(3.0),
                entry_rank_percentile_24h: Some(0.75),
                entry_minus_p50_24h: Some(0.5),
                entry_mad_robust_24h: Some(0.4),
                exit_p25_24h: Some(-1.4),
                exit_p50_24h: Some(-1.1),
                exit_p75_24h: Some(-0.8),
                exit_p95_24h: Some(-0.5),
                p_exit_ge_label_floor_minus_entry_24h: Some(0.33),
                gross_run_p05_s: Some(30),
                gross_run_p50_s: Some(120),
                gross_run_p95_s: Some(600),
                exit_excess_run_s: Some(90),
                n_cache_observations_at_t0: 850,
                oldest_cache_ts_ns: 1_700_000_000_000_000_000 - 24 * 3600 * 1_000_000_000,
                listing_age_days: Some(14.0),
            },
            audit_hindsight_best_exit_pct: Some(-0.3),
            audit_hindsight_best_exit_ts_ns: Some(1_700_000_000_000_000_000 + 300 * 1_000_000_000),
            audit_hindsight_best_gross_pct: Some(2.2),
            audit_hindsight_t_to_best_s: Some(300),
            n_clean_future_samples: 60,
            label_floor_pct: 0.8,
            first_exit_ge_label_floor_ts_ns: Some(
                1_700_000_000_000_000_000 + 120 * 1_000_000_000,
            ),
            first_exit_ge_label_floor_pct: Some(-1.7),
            t_to_first_hit_s: Some(120),
            label_floor_hits: vec![
                FloorHitLabel {
                    floor_pct: 0.5,
                    first_exit_ge_floor_ts_ns: Some(
                        1_700_000_000_000_000_000 + 60 * 1_000_000_000,
                    ),
                    first_exit_ge_floor_pct: Some(-1.9),
                    t_to_first_hit_s: Some(60),
                    realized: true,
                },
                FloorHitLabel {
                    floor_pct: 0.8,
                    first_exit_ge_floor_ts_ns: Some(
                        1_700_000_000_000_000_000 + 120 * 1_000_000_000,
                    ),
                    first_exit_ge_floor_pct: Some(-1.7),
                    t_to_first_hit_s: Some(120),
                    realized: true,
                },
                FloorHitLabel {
                    floor_pct: 3.0,
                    first_exit_ge_floor_ts_ns: None,
                    first_exit_ge_floor_pct: None,
                    t_to_first_hit_s: None,
                    realized: false,
                },
            ],
            outcome: LabelOutcome::Realized,
            censor_reason: None,
            observed_until_ns: 1_700_000_000_000_000_000 + 900 * 1_000_000_000,
            closed_ts_ns: 1_700_000_000_000_000_000 + 900 * 1_000_000_000 + 1_000_000_000,
            written_ts_ns: 1_700_000_000_000_000_000 + 900 * 1_000_000_000 + 2_000_000_000,
            policy_metadata: PolicyMetadata {
                baseline_model_version: "baseline-a3-0.2.0".into(),
                baseline_recommended: true,
                baseline_historical_base_rate_24h: Some(0.77),
                baseline_derived_enter_at_min: Some(1.9),
                baseline_derived_exit_at_min: Some(-1.1),
                baseline_floor_pct: 0.8,
                label_stride_s: 60,
                effective_stride_s: 60,
                label_sampling_probability: 1.0,
                candidates_in_route_last_24h: 10_000,
                accepts_in_route_last_24h: 500,
                ci_method: "wilson_marginal",
            },
            sampling_tier: "allowlist",
            sampling_probability: 1.0,
        }
    }

    #[test]
    fn json_line_is_parseable_and_carries_all_fields() {
        let l = mk_label();
        let line = l.to_json_line();
        assert!(!line.contains('\n'));
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(v["sample_id"], "abcdef0123456789abcdef0123456789");
        assert_eq!(v["sample_decision"], "accept");
        assert_eq!(v["horizon_s"], 900);
        assert_eq!(v["schema_version"], 6);
        assert_eq!(v["cluster_id"], "deadbeefdeadbeef");
        assert_eq!(v["cluster_size"], 1);
        assert!(v["runtime_config_hash"].is_string());
        assert_eq!(v["symbol_name"], "BTC-USDT");
        assert_eq!(v["entry_locked_pct"], 2.5);
        assert_eq!(v["outcome"], "realized");
        assert!(v["censor_reason"].is_null());
        assert_eq!(v["label_floor_pct"], 0.8);
        assert_eq!(v["label_floor_hits"].as_array().unwrap().len(), 3);
        assert_eq!(v["label_floor_hits"][0]["floor_pct"], 0.5);
        assert_eq!(v["label_floor_hits"][2]["realized"], false);
        assert_eq!(v["policy_metadata"]["baseline_model_version"], "baseline-a3-0.2.0");
        assert_eq!(v["policy_metadata"]["ci_method"], "wilson_marginal");
        assert_eq!(v["policy_metadata"]["candidates_in_route_last_24h"], 10_000);
        assert_eq!(v["sampling_tier"], "allowlist");
        // Fix B1/B2/B4 — novas features exportadas.
        assert_eq!(v["features_t0"]["entry_rank_percentile_24h"], 0.75);
        assert_eq!(v["features_t0"]["entry_minus_p50_24h"], 0.5);
        assert_eq!(v["features_t0"]["p_exit_ge_label_floor_minus_entry_24h"], 0.33);
        assert_eq!(v["features_t0"]["vol_ratio"], 2.0);
        assert_eq!(v["features_t0"]["n_cache_observations_at_t0"], 850);
        assert_eq!(v["features_t0"]["entry_p95_24h"], 3.0);
        assert_eq!(v["features_t0"]["exit_p25_24h"], -1.4);
        assert_eq!(v["features_t0"]["gross_run_p50_s"], 120);
        assert_eq!(v["features_t0"]["exit_excess_run_s"], 90);
        assert_eq!(v["features_t0"]["listing_age_days"], 14.0);
        // Fix A10 — renomeação protetora ativa.
        assert!(v.get("best_exit_pct").is_none(), "nome antigo não deve sair no v6");
        assert_eq!(v["audit_hindsight_best_exit_pct"], -0.3);
        assert!(v["features_t0"].get("buy_book_age_ms").is_none());
        assert!(v["features_t0"].get("sell_book_age_ms").is_none());
        assert!(v["features_t0"].get("halt_active").is_none());
        assert!(v["features_t0"].get("toxicity_level").is_none());
    }

    #[test]
    fn censored_outcome_serializes_reason() {
        let mut l = mk_label();
        l.outcome = LabelOutcome::Censored;
        l.censor_reason = Some(CensorReason::RouteDelisted);
        l.audit_hindsight_best_exit_pct = None;
        l.audit_hindsight_best_gross_pct = None;
        l.audit_hindsight_best_exit_ts_ns = None;
        l.audit_hindsight_t_to_best_s = None;
        l.first_exit_ge_label_floor_ts_ns = None;
        l.first_exit_ge_label_floor_pct = None;
        l.t_to_first_hit_s = None;
        let line = l.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(v["outcome"], "censored");
        // Fix A2: RouteDelisted é variante distinta de RouteVanished.
        assert_eq!(v["censor_reason"], "route_delisted");
        assert!(v["audit_hindsight_best_exit_pct"].is_null());
        assert!(v["first_exit_ge_label_floor_ts_ns"].is_null());
    }

    #[test]
    fn miss_outcome_has_no_hit_but_has_observation_window() {
        let mut l = mk_label();
        l.outcome = LabelOutcome::Miss;
        l.first_exit_ge_label_floor_ts_ns = None;
        l.first_exit_ge_label_floor_pct = None;
        l.t_to_first_hit_s = None;
        let line = l.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(v["outcome"], "miss");
        assert!(v["censor_reason"].is_null());
        assert!(v["first_exit_ge_label_floor_ts_ns"].is_null());
        // Mesmo em miss, audit_hindsight_best_exit_pct é um número.
        assert!(v["audit_hindsight_best_exit_pct"].is_number());
    }

    #[test]
    fn three_timestamps_are_distinct() {
        let l = mk_label();
        assert!(l.observed_until_ns <= l.closed_ts_ns);
        assert!(l.closed_ts_ns <= l.written_ts_ns);
    }

}
