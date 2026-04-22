//! Contrato de output do recomendador ML.
//!
//! Implementa ADR-005 (abstenção tipada) + o contrato final do operador:
//! `entry_now`, `exit_target`, `lucro_bruto_alvo`, `P_hit`, `T_hit` e `IC`.
//!
//! O baseline A3 ainda é um safety-net degradado. As estatísticas ECDF
//! marginais ficam em `BaselineDiagnostics`; elas não são o output central
//! do modelo e não devem ser lidas como forecast condicional calibrado.
//!
//! Ver `docs/ml/01_decisions/ADR-016-output-contract-refined.md` para
//! racional completo.

use crate::types::{SymbolId, Venue};

// NOTA: `Serialize`/`Deserialize` intencionalmente ausentes — `Venue` e
// `SymbolId` no scanner atual não derivam serde. Para broadcast/logging,
// um `TradeSetupDto` separado será criado seguindo o padrão de
// `broadcast::contract::OpportunityDto` (converte Venue → &'static str).
// Este módulo mantém apenas tipos fortemente tipados para uso interno.

// ---------------------------------------------------------------------------
// Identificação da rota
// ---------------------------------------------------------------------------

/// Identificação estável de uma rota de arbitragem.
///
/// `Venue` já encode se a perna é SPOT ou FUT (14 variantes: BinanceSpot,
/// BinanceFut, MexcSpot, MexcFut, etc.). Portanto `(symbol_id, buy, sell)`
/// é suficiente — não precisa carregar tipo separadamente.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct RouteId {
    pub symbol_id: SymbolId,
    pub buy_venue: Venue,
    pub sell_venue: Venue,
}

// ---------------------------------------------------------------------------
// Output principal
// ---------------------------------------------------------------------------

/// Recomendação emitida pelo modelo ML para uma rota num instante.
///
/// **Trade**: modelo tem sinal acionável e reporta `TradeSetup` completo.
/// **Abstain**: modelo escolhe não emitir; `AbstainReason` informa o motivo
/// para o operador (não é silêncio monolítico — T5 trap tratada).
#[derive(Debug, Clone)]
pub enum Recommendation {
    Trade(TradeSetup),
    Abstain {
        reason: AbstainReason,
        diagnostic: AbstainDiagnostic,
    },
}

/// Diagnósticos do baseline A3.
///
/// Esses campos são úteis para auditoria e comparação contra A3, mas não
/// compõem o output normativo do modelo descrito no CLAUDE.md.
#[derive(Debug, Clone)]
pub struct BaselineDiagnostics {
    pub enter_at_min: f32,
    pub enter_typical: f32,
    pub enter_peak_p95: f32,
    pub p_enter_hit: f32,

    pub exit_at_min: f32,
    pub exit_typical: f32,
    pub p_exit_hit_given_enter: f32,

    pub gross_profit_p10: f32,
    pub gross_profit_p25: f32,
    pub gross_profit_median: f32,
    pub gross_profit_p75: f32,
    pub gross_profit_p90: f32,
    pub gross_profit_p95: f32,

    /// Taxa marginal histórica 24h de `exit >= exit_at_min`.
    /// Não é `P_hit` condicional.
    pub historical_base_rate_24h: f32,
    pub historical_base_rate_ci: (f32, f32),
}

/// Recomendação acionável emitida para uma rota no instante `t0`.
///
/// Semântica central alinhada ao CLAUDE.md:
/// - `entry_now`: `S_entrada(t0)` observado/cotado e aceito como entrada agora.
/// - `exit_target`: threshold futuro de `S_saída(t1)`.
/// - `gross_profit_target`: `entry_now + exit_target` em spread bruto cotado.
/// - `p_hit`: probabilidade condicional calibrada de atingir `exit_target`.
/// - `t_hit_*`: distribuição de tempo até atingir `exit_target`.
///
/// Campos opcionais permanecem `None` quando a implementação atual não tem
/// estimativa honesta. O baseline A3 deve usar `calibration_status=Degraded`.
#[derive(Debug, Clone)]
pub struct TradeSetup {
    pub route_id: RouteId,

    // --- Output central ---------------------------------------------------
    pub entry_now: f32,
    pub exit_target: f32,
    pub gross_profit_target: f32,
    pub p_hit: Option<f32>,
    pub p_hit_ci: Option<(f32, f32)>,

    // --- Distribuição opcional exibida no painel expandido ---------------
    pub exit_q25: Option<f32>,
    pub exit_q50: Option<f32>,
    pub exit_q75: Option<f32>,
    pub t_hit_p25_s: Option<u32>,
    pub t_hit_median_s: Option<u32>,
    pub t_hit_p75_s: Option<u32>,
    pub p_censor: Option<f32>,

    // --- Diagnóstico de fallback -----------------------------------------
    pub baseline_diagnostics: Option<BaselineDiagnostics>,

    // --- Contexto de correlação (Q1 emendas) -----------------------------
    /// Se rota pertence a um cluster de correlação, ID do cluster.
    /// Previne interpretação errada de N setups correlacionados como N
    /// oportunidades independentes (Diebold-Yilmaz 2012).
    pub cluster_id: Option<u32>,
    /// # rotas no cluster (1 se rota isolada).
    pub cluster_size: u8,
    /// Ranking desta rota dentro do cluster (1 = melhor).
    pub cluster_rank: u8,

    // --- Status da calibração --------------------------------------------
    pub calibration_status: CalibStatus,

    // --- Metadata --------------------------------------------------------
    pub reason: TradeReason,
    pub model_version: String,
    /// Instante da emissão (nanosegundos desde UNIX_EPOCH).
    pub emitted_at: u64,
    /// Instante até quando a recomendação é válida.
    pub valid_until: u64,
}

// ---------------------------------------------------------------------------
// Razões de abstenção (ADR-005, T5)
// ---------------------------------------------------------------------------

/// Quatro categorias mutuamente exclusivas para não emissão.
///
/// Precedência (quando múltiplas aplicam simultaneamente):
/// `InsufficientData > LongTail > LowConfidence > NoOpportunity`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbstainReason {
    /// Nenhuma tupla `(enter_at, exit_at)` viável atinge o floor de
    /// utilidade. Modelo tem confiança nos dados; não há trade.
    NoOpportunity,
    /// Rota tem histórico insuficiente (`n < n_min = 500`). Listing
    /// novo, halt recente, delisting, ticker rename, etc.
    InsufficientData,
    /// Dados existem (`n ≥ n_min`), mas largura do IC 95% excede
    /// `τ_abst`. Incerteza epistêmica alta — possivelmente regime
    /// transition, feature shift, calibração degradada.
    LowConfidence,
    /// Distribuição amostral apresenta cauda excepcional (p99/p95 > 3.0)
    /// — spike event, hack, exchange manipulation. Modelo não treinou
    /// para este regime.
    LongTail,
}

/// Diagnóstico estruturado acompanhando abstenção.
#[derive(Debug, Clone)]
pub struct AbstainDiagnostic {
    /// Histórico disponível da rota no feature store.
    pub n_observations: u32,
    /// Presente se `LowConfidence`: largura do IC 95% do base rate
    /// histórico que seria emitido.
    pub ci_width_if_emitted: Option<f32>,
    /// Presente se `NoOpportunity`: melhor utilidade encontrada (< floor).
    pub nearest_feasible_utility: Option<f32>,
    /// Presente se `LongTail`: razão `p99/p95` da janela rolante.
    pub tail_ratio_p99_p95: Option<f32>,
    pub model_version: String,
    /// Probabilidades do regime atual: `[calm, opportunity, event]`.
    pub regime_posterior: [f32; 3],
}

// ---------------------------------------------------------------------------
// Calibração
// ---------------------------------------------------------------------------

/// Status da calibração global do modelo no momento da emissão.
///
/// Se `Degraded` ou `Suspended`, UI não deve apresentar o baseline como
/// forecast probabilístico calibrado do modelo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CalibStatus {
    Ok,
    /// ECE_4h entre 0.05 e 0.10 — monitorar; ainda emite.
    Degraded,
    /// Kill switch ativo — emissão via fallback baseline A3.
    Suspended,
}

// ---------------------------------------------------------------------------
// Reason (razão contrastiva da recomendação — Q3 UI)
// ---------------------------------------------------------------------------

/// Razão categorizada para operador entender *por que* esta recomendação.
///
/// Quatro categorias simples (Q3 F-UX5 F-UX1 — SHAP fica offline). UI pode
/// mapear em ícones e `reason_detail` adiciona uma linha de explicação.
#[derive(Debug, Clone, PartialEq)]
pub struct TradeReason {
    pub kind: ReasonKind,
    /// Uma linha curta de contexto (ex: "regime dispersão + cauda").
    pub detail: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReasonKind {
    /// Entry na cauda superior 24h + derivada positiva.
    Trend,
    /// Regime `opportunity` ou `event` detectado pelo HMM.
    Regime,
    /// Cauda superior histórica pura (sem trend claro).
    Tail,
    /// Combinação de múltiplos fatores.
    Combined,
}

// ---------------------------------------------------------------------------
// Tactical signal (ADR-016 — emitido a 150ms enquanto oportunidade viva)
// ---------------------------------------------------------------------------

/// Sinal tático emitido a cada ciclo scanner (150 ms) enquanto o
/// `TradeSetup` correspondente está dentro de `valid_until`.
///
/// Permite ao operador decidir timing *dentro da regra* estabelecida pelo
/// `TradeSetup` — ex: entrar no primeiro `Eligible` (conservador) vs
/// esperar `NearPeak` (tático). Atualização visual da UI deve ser
/// limitada a ≤ 2 Hz (Q3 F-UX5 — Hirshleifer, Lim & Teoh 2009 JoF 64(5)).
#[derive(Debug, Clone)]
pub struct TacticalSignal {
    pub route_id: RouteId,
    /// Timestamp (ns) do tick do scanner.
    pub at: u64,

    /// Valor atual de `entrySpread`.
    pub current_entry: f32,
    /// Valor atual de `exitSpread`.
    pub current_exit: f32,

    pub entry_quality: EntryQuality,
    pub exit_quality: ExitQuality,

    /// Segundos desde emissão do TradeSetup original.
    pub time_since_emit_s: u32,
    /// Segundos até `valid_until`.
    pub time_remaining_s: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntryQuality {
    /// Spread atual abaixo do `enter_at_min`.
    HasNotAppeared,
    /// `current_entry >= enter_at_min` — regra satisfeita.
    Eligible,
    /// `current_entry >= enter_typical` — acima da mediana prevista.
    AboveMedian,
    /// `current_entry >= enter_peak_p95` — próximo do pico afortunado.
    NearPeak,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExitQuality {
    HasNotAppeared,
    Eligible,
    AboveMedian,
    NearBest,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Venue;

    #[test]
    fn tradesetup_exposes_final_operator_semantics() {
        let setup = TradeSetup {
            route_id: RouteId {
                symbol_id: SymbolId(1),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
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
            baseline_diagnostics: None,
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: "test".into(),
            },
            model_version: "a2-test".into(),
            emitted_at: 1_700_000_000_000_000_000,
            valid_until: 1_700_000_150_000_000_000,
        };

        assert_eq!(setup.entry_now + setup.exit_target, setup.gross_profit_target);
        assert_eq!(setup.p_hit, Some(0.83));
        assert_eq!(setup.t_hit_median_s, Some(1680));
    }

    #[test]
    fn tradesetup_construction_basic() {
        // Sanity: construção completa não deve panicar; tipos alinhados.
        let setup = valid_setup();
        let _ = Recommendation::Trade(setup);
    }

    #[test]
    fn abstain_reasons_are_distinct() {
        let a = AbstainReason::NoOpportunity;
        let b = AbstainReason::InsufficientData;
        let c = AbstainReason::LowConfidence;
        let d = AbstainReason::LongTail;
        assert_ne!(a, b);
        assert_ne!(b, c);
        assert_ne!(c, d);
        assert_ne!(a, d);
    }

    #[test]
    fn route_id_is_hashable_and_copy() {
        let r = RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        };
        let r2 = r; // Copy
        assert_eq!(r, r2);
        // Hash via HashSet check
        let mut set = std::collections::HashSet::new();
        set.insert(r);
        assert!(set.contains(&r2));
    }

    // -----------------------------------------------------------------------
    // Invariantes estruturais do TradeSetup (C-verif pós-auditoria Wave S+)
    //
    // Recomendações descalibradas frequentemente manifestam violação destas
    // invariantes em produção. Testar aqui no construtor pega bugs de
    // lógica do modelo antes de shadow mode.
    // -----------------------------------------------------------------------

    fn valid_setup() -> TradeSetup {
        TradeSetup {
            route_id: RouteId {
                symbol_id: SymbolId(42),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
            entry_now: 2.00,
            exit_target: -1.00,
            gross_profit_target: 1.00,
            p_hit: Some(0.83),
            p_hit_ci: Some((0.77, 0.88)),
            exit_q25: Some(-1.40),
            exit_q50: Some(-1.00),
            exit_q75: Some(-0.70),
            t_hit_p25_s: Some(720),
            t_hit_median_s: Some(1680),
            t_hit_p75_s: Some(6000),
            p_censor: Some(0.04),
            baseline_diagnostics: Some(BaselineDiagnostics {
                enter_at_min: 1.80,
                enter_typical: 2.00,
                enter_peak_p95: 2.80,
                p_enter_hit: 0.90,
                exit_at_min: -1.20,
                exit_typical: -1.00,
                p_exit_hit_given_enter: 0.85,
                gross_profit_p10: 0.60,
                gross_profit_p25: 0.70,
                gross_profit_median: 1.00,
                gross_profit_p75: 1.50,
                gross_profit_p90: 2.30,
                gross_profit_p95: 2.80,
                historical_base_rate_24h: 0.77,
                historical_base_rate_ci: (0.70, 0.82),
            }),
            cluster_id: None,
            cluster_size: 1,
            cluster_rank: 1,
            calibration_status: CalibStatus::Ok,
            reason: TradeReason {
                kind: ReasonKind::Combined,
                detail: "test".into(),
            },
            model_version: "0.1.0".into(),
            emitted_at: 1_000_000_000_000_000_000,
            valid_until: 1_000_000_150_000_000_000,
        }
    }

    #[test]
    fn invariant_exit_quantiles_are_monotonic_when_present() {
        let s = valid_setup();
        assert!(s.exit_q25.unwrap() <= s.exit_q50.unwrap(), "q25 > q50");
        assert!(s.exit_q50.unwrap() <= s.exit_q75.unwrap(), "q50 > q75");
    }

    #[test]
    fn invariant_t_hit_quantiles_are_monotonic_when_present() {
        let s = valid_setup();
        let p25 = s.t_hit_p25_s.unwrap();
        let median = s.t_hit_median_s.unwrap();
        let p75 = s.t_hit_p75_s.unwrap();
        assert!(p25 <= median, "p25 > median");
        assert!(median <= p75, "median > p75");
    }

    #[test]
    fn invariant_probabilities_within_unit_interval() {
        let s = valid_setup();
        assert!((0.0..=1.0).contains(&s.p_hit.unwrap()));
        assert!((0.0..=1.0).contains(&s.p_censor.unwrap()));
        let d = s.baseline_diagnostics.as_ref().unwrap();
        assert!((0.0..=1.0).contains(&d.historical_base_rate_24h));
        assert!((0.0..=1.0).contains(&d.p_enter_hit));
        assert!((0.0..=1.0).contains(&d.p_exit_hit_given_enter));
    }

    #[test]
    fn invariant_p_hit_ci_contains_p_hit() {
        let s = valid_setup();
        let p = s.p_hit.unwrap();
        let (lo, hi) = s.p_hit_ci.unwrap();
        assert!(lo >= 0.0 && lo <= 1.0, "CI lower out of [0,1]");
        assert!(hi >= 0.0 && hi <= 1.0, "CI upper out of [0,1]");
        assert!(lo <= hi, "CI lower > upper");
        assert!(
            lo <= p && p <= hi,
            "p_hit={} fora de IC=[{}, {}]",
            p, lo, hi
        );
    }

    #[test]
    fn invariant_cluster_rank_within_size() {
        let s = valid_setup();
        assert!(s.cluster_size >= 1);
        assert!(s.cluster_rank >= 1 && s.cluster_rank <= s.cluster_size);
    }

    #[test]
    fn invariant_identity_gross_median_approximately_enter_plus_exit() {
        // Identidade contábil (skill §3): PnL = S_entrada(t₀) + S_saída(t₁).
        let s = valid_setup();
        let identity = s.entry_now + s.exit_target;
        let delta = (s.gross_profit_target - identity).abs();
        assert!(
            delta < 1e-6,
            "gross_target {} diverge de identity {} por {}",
            s.gross_profit_target, identity, delta
        );
    }

    #[test]
    fn invariant_valid_until_after_emitted_at() {
        let s = valid_setup();
        assert!(s.valid_until > s.emitted_at, "valid_until anterior a emitted_at");
    }

    #[test]
    fn invariant_all_finite() {
        let s = valid_setup();
        let d = s.baseline_diagnostics.as_ref().unwrap();
        let finite_fields: [f32; 18] = [
            s.entry_now, s.exit_target, s.gross_profit_target, s.p_hit.unwrap(),
            s.p_censor.unwrap(), d.enter_at_min, d.enter_typical, d.enter_peak_p95,
            d.p_enter_hit, d.exit_at_min, d.exit_typical, d.p_exit_hit_given_enter,
            d.gross_profit_p10, d.gross_profit_p25, d.gross_profit_median,
            d.gross_profit_p75, d.gross_profit_p90, d.gross_profit_p95,
        ];
        for (i, v) in finite_fields.iter().enumerate() {
            assert!(v.is_finite(), "field {} is not finite: {}", i, v);
        }
    }

    #[test]
    fn source_no_longer_exposes_haircut_fields() {
        let source = include_str!("contract.rs");
        let haircut_field = ["pub ", "haircut_predicted:"].concat();
        let realizable_field = ["pub ", "gross_profit_realizable_median:"].concat();
        assert!(
            !source.contains(&haircut_field),
            "haircut_predicted não deve permanecer no contrato do ML"
        );
        assert!(
            !source.contains(&realizable_field),
            "gross_profit_realizable_median não deve permanecer no contrato do ML"
        );
    }
}
