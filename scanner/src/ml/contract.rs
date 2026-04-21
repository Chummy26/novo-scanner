//! Contrato de output do recomendador ML.
//!
//! Implementa ADR-005 (abstenção tipada 4 razões) + ADR-016 (output como
//! thresholds + distribuição empírica de lucro + `P(realize)` via CDF de G).
//!
//! `TradeSetup` representa uma *regra acionável*, não um par de pontos
//! exatos. Operador captura valores reais durante a vida da oportunidade;
//! o lucro bruto realizado é posição na distribuição reportada.
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

/// Regra acionável emitida para uma rota.
///
/// Contrato thresholds + distribuição empírica (ADR-016):
/// - `enter_at_min` / `exit_at_min`: regras ("entre quando `entrySpread ≥ X`").
/// - `gross_profit_{p10, p25, median, p75, p90, p95}`: quantis **empíricos**
///   verificáveis com ~10 trades (Kolassa 2016 IJF 32(3)).
/// - `realization_probability`: `P(G(t, t') ≥ floor | features)` derivado
///   **direto da CDF** do modelo G unificado (ADR-008). NÃO é decomposição
///   multiplicativa das marginais — essa fórmula foi o bug crítico corrigido
///   pela investigação PhD Q2-M2.
#[derive(Debug, Clone)]
pub struct TradeSetup {
    pub route_id: RouteId,

    // --- Regra de entrada (threshold, não ponto) -------------------------
    /// Regra: entre quando `entrySpread(t) ≥ enter_at_min`.
    pub enter_at_min: f32,
    /// Mediana prevista do entry observável em horizonte.
    pub enter_typical: f32,
    /// Pico esperado (p95) — informa decisão "esperar por mais?".
    pub enter_peak_p95: f32,
    /// P(entrySpread atingir `enter_at_min` em horizonte). **Informativo
    /// apenas**; NÃO entra no cálculo de `realization_probability`.
    pub p_enter_hit: f32,

    // --- Regra de saída (threshold) --------------------------------------
    /// Regra: saia quando `exitSpread(t) ≥ exit_at_min`.
    pub exit_at_min: f32,
    pub exit_typical: f32,
    /// P(exit atingir threshold | entrou). **Informativo apenas**.
    pub p_exit_hit_given_enter: f32,

    // --- Lucro bruto como distribuição empírica --------------------------
    /// Quantis empíricos previstos da variável unificada
    /// `G(t₀, t₁) = S_entrada(t₀) + S_saída(t₁)` (ADR-008).
    pub gross_profit_p10: f32,
    pub gross_profit_p25: f32,
    pub gross_profit_median: f32,
    pub gross_profit_p75: f32,
    pub gross_profit_p90: f32,
    pub gross_profit_p95: f32,

    // --- Probabilidade de realização via CDF de G (ADR-016 Q2-M2) --------
    /// `P(G(t, t') ≥ floor_operador | features, t₀)` derivado direto da
    /// CDF prevista do modelo G unificado. Calibrado via CQR (ADR-004).
    pub realization_probability: f32,
    /// IC 95% sobre `realization_probability`.
    pub confidence_interval: (f32, f32),

    // --- Horizonte com quantis (cauda pesada) ----------------------------
    /// Pior caso rápido: oportunidade some em X segundos (Q1-E3).
    pub horizon_p05_s: u32,
    pub horizon_median_s: u32,
    /// Pior caso longo (exceeds T_max → timeout).
    pub horizon_p95_s: u32,

    // --- Contextos microestruturais (Q1 emendas) -------------------------
    /// Rotula região da cauda direita como potencialmente tóxica
    /// (Foucault, Kozhan & Tham 2017 RFS 30(4)).
    pub toxicity_level: ToxicityLevel,
    /// Se rota pertence a um cluster de correlação, ID do cluster.
    /// Previne interpretação errada de N setups correlacionados como N
    /// oportunidades independentes (Diebold-Yilmaz 2012).
    pub cluster_id: Option<u32>,
    /// # rotas no cluster (1 se rota isolada).
    pub cluster_size: u8,
    /// Ranking desta rota dentro do cluster (1 = melhor).
    pub cluster_rank: u8,

    // --- Haircut empírico (ADR-013 Fase 2 shadow) ------------------------
    /// Fração esperada de haircut `quoted → realizable` (0.0–1.0).
    pub haircut_predicted: f32,
    /// Mediana do lucro bruto após haircut aplicado.
    pub gross_profit_realizable_median: f32,

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
    /// Presente se `LowConfidence`: largura do IC 95% que seria emitido.
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
// Microestrutura (Q1 emendas em ADR-016)
// ---------------------------------------------------------------------------

/// Nível de toxicidade da região de cauda direita do entry spread.
///
/// `enter_peak_p95` existe, mas um pico só é *oportunidade legítima* se
/// `toxicity_level = Healthy`. Picos `Suspicious` ou `Toxic` devem ser
/// ignorados pelo operador mesmo que tecnicamente atinjam threshold.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToxicityLevel {
    /// Cauda normal — pico é oportunidade legítima.
    Healthy,
    /// `book_age` elevado em uma das pernas; staleness possível.
    Suspicious,
    /// Staleness confirmada OU outage OU spike de sample único.
    Toxic,
}

/// Status da calibração global do modelo no momento da emissão.
///
/// Se `Degraded` ou `Suspended`, UI exibe `P` como "? / 100" em vez
/// do valor reportado (Q3 recomendação).
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
    fn tradesetup_construction_basic() {
        // Sanity: construção completa não deve panicar; tipos alinhados.
        let setup = TradeSetup {
            route_id: RouteId {
                symbol_id: SymbolId(42),
                buy_venue: Venue::MexcFut,
                sell_venue: Venue::BingxFut,
            },
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
                detail: "regime opportunity + cauda superior".into(),
            },
            model_version: "0.1.0".into(),
            emitted_at: 1_730_000_000_000_000_000,
            valid_until: 1_730_000_150_000_000_000,
        };
        // Identidade básica: gross_profit_median deveria ser enter_typical + exit_typical.
        // (modelo pode prever diferente; apenas checa campos existem e são f32.)
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
    fn toxicity_ordering_makes_sense() {
        // Healthy é o único estado sem flag para operador.
        assert_eq!(ToxicityLevel::Healthy, ToxicityLevel::Healthy);
        assert_ne!(ToxicityLevel::Healthy, ToxicityLevel::Suspicious);
        assert_ne!(ToxicityLevel::Suspicious, ToxicityLevel::Toxic);
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
            model_version: "0.1.0".into(),
            emitted_at: 1_000_000_000_000_000_000,
            valid_until: 1_000_000_150_000_000_000,
        }
    }

    #[test]
    fn invariant_gross_quantiles_are_monotonic() {
        let s = valid_setup();
        assert!(s.gross_profit_p10 <= s.gross_profit_p25, "p10 > p25");
        assert!(s.gross_profit_p25 <= s.gross_profit_median, "p25 > median");
        assert!(s.gross_profit_median <= s.gross_profit_p75, "median > p75");
        assert!(s.gross_profit_p75 <= s.gross_profit_p90, "p75 > p90");
        assert!(s.gross_profit_p90 <= s.gross_profit_p95, "p90 > p95");
    }

    #[test]
    fn invariant_enter_levels_are_monotonic() {
        let s = valid_setup();
        assert!(s.enter_at_min <= s.enter_typical, "enter_at_min > enter_typical");
        assert!(s.enter_typical <= s.enter_peak_p95, "enter_typical > enter_peak_p95");
    }

    #[test]
    fn invariant_horizon_quantiles_are_monotonic() {
        let s = valid_setup();
        assert!(s.horizon_p05_s <= s.horizon_median_s, "p05 > median");
        assert!(s.horizon_median_s <= s.horizon_p95_s, "median > p95");
    }

    #[test]
    fn invariant_probability_within_unit_interval() {
        let s = valid_setup();
        assert!(s.realization_probability >= 0.0 && s.realization_probability <= 1.0);
        assert!(s.p_enter_hit >= 0.0 && s.p_enter_hit <= 1.0);
        assert!(s.p_exit_hit_given_enter >= 0.0 && s.p_exit_hit_given_enter <= 1.0);
    }

    #[test]
    fn invariant_confidence_interval_contains_probability() {
        let s = valid_setup();
        let (lo, hi) = s.confidence_interval;
        assert!(lo >= 0.0 && lo <= 1.0, "CI lower out of [0,1]");
        assert!(hi >= 0.0 && hi <= 1.0, "CI upper out of [0,1]");
        assert!(lo <= hi, "CI lower > upper");
        assert!(
            lo <= s.realization_probability && s.realization_probability <= hi,
            "P(realize)={} fora de IC=[{}, {}]",
            s.realization_probability, lo, hi
        );
    }

    #[test]
    fn invariant_haircut_consistency() {
        let s = valid_setup();
        assert!(s.haircut_predicted >= 0.0 && s.haircut_predicted <= 1.0);
        // realizable <= median × (1 − haircut) com tolerância numérica
        let expected = s.gross_profit_median * (1.0 - s.haircut_predicted);
        assert!(
            s.gross_profit_realizable_median <= expected + 1e-4,
            "realizable {} > median {} × (1 − haircut {}) = {}",
            s.gross_profit_realizable_median, s.gross_profit_median, s.haircut_predicted, expected
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
        // Não exige igualdade exata (modelo pode prever marginais ≠ dos
        // quantis exatos), mas mediana do gross deve estar razoavelmente
        // próxima de enter_typical + exit_typical em regime normal.
        let s = valid_setup();
        let identity = s.enter_typical + s.exit_typical;
        let delta = (s.gross_profit_median - identity).abs();
        assert!(
            delta < 0.50,
            "gross_median {} diverge de identity {} por {} (tolerância 0.50pp)",
            s.gross_profit_median, identity, delta
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
        let finite_fields: [f32; 14] = [
            s.enter_at_min, s.enter_typical, s.enter_peak_p95, s.p_enter_hit,
            s.exit_at_min, s.exit_typical, s.p_exit_hit_given_enter,
            s.gross_profit_p10, s.gross_profit_p25, s.gross_profit_median,
            s.gross_profit_p75, s.gross_profit_p90, s.gross_profit_p95,
            s.realization_probability,
        ];
        for (i, v) in finite_fields.iter().enumerate() {
            assert!(v.is_finite(), "field {} is not finite: {}", i, v);
        }
    }
}
