//! Baseline A3 — implementação ECDF pareada.
//!
//! Ver `mod.rs` para limitações documentadas. O baseline continua sendo
//! safety-net, mas já usa estatísticas conjuntivas do par `entry+exit`
//! para não cair no trap de marginais independentes.

use crate::ml::contract::{
    AbstainDiagnostic, AbstainReason, CalibStatus, ReasonKind, Recommendation, RouteId,
    ToxicityLevel, TradeReason, TradeSetup,
};
use crate::ml::feature_store::HotQueryCache;

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/// Parâmetros configuráveis do baseline A3.
///
/// Defaults aprovados em `DECISIONS_APPROVED.md` Tema B (floor 0.8%,
/// n_min 500). Todos ajustáveis via CLI/UI pelo operador.
#[derive(Debug, Clone, Copy)]
pub struct BaselineConfig {
    /// Floor econômico de `gross_profit bruto cotado` — abaixo disso,
    /// abstém `NoOpportunity` (T1 mitigação, ADR-002).
    ///
    /// NOTA: operador ajusta este valor em função da sua expectativa de
    /// fees/funding/slippage, mas o MODELO não computa nem otimiza esses
    /// termos (fronteira explícita do CLAUDE.md). O floor é um filtro
    /// sobre lucro bruto cotado; operador assume a responsabilidade do
    /// dimensionamento vs custos reais.
    pub floor_pct: f32,
    /// Observações mínimas por rota antes de emitir — abaixo disso,
    /// abstém `InsufficientData` (T6 mitigação, ADR-005).
    pub n_min: u64,
    /// Versão reportada do baseline. Bump quando lógica mudar
    /// materialmente.
    pub model_version: &'static str,
    /// Validade da recomendação em segundos — após isso, scanner não
    /// considera o setup mais vigente.
    pub valid_for_s: u32,
    /// Haircut empírico default aplicado ao `gross_profit_median`
    /// (D2 projeção para longtail cripto: 20–40% em setups 1%).
    /// Será calibrado empiricamente via shadow mode (ADR-013 Fase 2).
    pub default_haircut: f32,
    /// Razão máxima P99/P95 de entry_spread antes de abstermos por
    /// `LongTail` (spike anômalo). Default 3.0 (Kolassa 2016 IJF 32(3)
    /// — cauda gaussiana ≈ 1.3; cripto normal ≈ 1.8–2.2; > 3.0 sinaliza
    /// outlier não representativo / toxic arbitrage).
    pub tail_ratio_abstain_threshold: f32,
}

impl Default for BaselineConfig {
    fn default() -> Self {
        Self {
            floor_pct: 0.8,
            n_min: 500,
            model_version: "baseline-a3-0.2.0",
            valid_for_s: 30,
            default_haircut: 0.25,
            tail_ratio_abstain_threshold: 3.0,
        }
    }
}

// ---------------------------------------------------------------------------
// BaselineA3
// ---------------------------------------------------------------------------

/// Recomendador baseline usando apenas ECDF empírica do `HotQueryCache`.
///
/// Thread-safe via `HotQueryCache` interno (RwLock). Clone é barato
/// (compartilha cache via Arc).
pub struct BaselineA3 {
    cache: HotQueryCache,
    cfg: BaselineConfig,
}

impl BaselineA3 {
    pub fn new(cache: HotQueryCache, cfg: BaselineConfig) -> Self {
        Self { cache, cfg }
    }

    /// Atalho: construtor com configuração default.
    pub fn with_defaults(cache: HotQueryCache) -> Self {
        Self::new(cache, BaselineConfig::default())
    }

    /// Exposição read-only da config (para dashboards/debug).
    pub fn config(&self) -> BaselineConfig {
        self.cfg
    }

    /// Exposição read-only do cache (permite múltiplos consumidores).
    pub fn cache(&self) -> &HotQueryCache {
        &self.cache
    }

    /// Emite recomendação para `route` dado estado (spread atual + toxicity
    /// pré-computada em `serving`).
    ///
    /// **Fluxo pós-auditoria 2026-04-21**:
    /// 1. Checa `n_observations ≥ n_min` (senão `InsufficientData`).
    /// 2. Se `toxicity_hint == Toxic`, emite `Abstain(LowConfidence)`.
    /// 3. Checa tail_ratio p99/p95 > threshold → `Abstain(LongTail)`.
    /// 4. Gate tático: `current_entry ≥ p50(entry)` senão `NoOpportunity`.
    /// 5. `enter_at_min` derivado economicamente sobre LUCRO BRUTO COTADO:
    ///    `max(floor_pct − exit_typical, p50_entry)`. Operador ajusta
    ///    `floor_pct` para absorver expectativa de fees/slippage, mas o
    ///    modelo NÃO computa esses termos (fronteira explícita).
    /// 6. Se `gross_p10 < floor_pct` → `NoOpportunity` com diagnóstico.
    /// 8. `historical_base_rate_24h` (expostada como `realization_probability`
    ///    no tipo; DTO renomeia) é taxa empírica incondicional; IC Wilson com
    ///    n_eff desconto de autocorrelação 10× (conservador).
    /// 9. Emite `TradeSetup` com `toxicity_level` recebido e
    ///    `calibration_status: Degraded`.
    pub fn recommend(
        &self,
        route: RouteId,
        current_entry: f32,
        _current_exit: f32,
        now_ns: u64,
        toxicity_hint: ToxicityLevel,
    ) -> Recommendation {
        let n = self.cache.n_observations(route);
        // Quantis vêm de buckets de 1e-4; usa tolerância de um bucket para
        // evitar decisões instáveis em igualdade numérica.
        let quantile_tolerance = 1e-4_f32;

        // Gate 1: dados insuficientes.
        if n < self.cfg.n_min {
            return Recommendation::Abstain {
                reason: AbstainReason::InsufficientData,
                diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
            };
        }

        // Gate 1b: toxicity Toxic confirmada → recusa explícita.
        // (Suspicious passa para o TradeSetup para o operador decidir.)
        if matches!(toxicity_hint, ToxicityLevel::Toxic) {
            return Recommendation::Abstain {
                reason: AbstainReason::LowConfidence,
                diagnostic: AbstainDiagnostic {
                    n_observations: n.min(u32::MAX as u64) as u32,
                    ci_width_if_emitted: None,
                    nearest_feasible_utility: None,
                    tail_ratio_p99_p95: None,
                    model_version: self.cfg.model_version.to_string(),
                    regime_posterior: [1.0, 0.0, 0.0],
                },
            };
        }

        // Gate 1c: LongTail — p99/p95 > threshold sinaliza spike anômalo.
        // Detector pós-auditoria: evita emitir durante toxic arbitrage /
        // halt iminente / manipulation / spike de 1-tick.
        let p99_entry_opt = self.cache.quantile_entry(route, 0.99);
        let p95_entry_opt_for_tail = self.cache.quantile_entry(route, 0.95);
        if let (Some(p99), Some(p95_t)) = (p99_entry_opt, p95_entry_opt_for_tail) {
            if p95_t > 1e-6 {
                let tail_ratio = p99 / p95_t;
                if tail_ratio > self.cfg.tail_ratio_abstain_threshold {
                    return Recommendation::Abstain {
                        reason: AbstainReason::LongTail,
                        diagnostic: AbstainDiagnostic {
                            n_observations: n.min(u32::MAX as u64) as u32,
                            ci_width_if_emitted: None,
                            nearest_feasible_utility: None,
                            tail_ratio_p99_p95: Some(tail_ratio),
                            model_version: self.cfg.model_version.to_string(),
                            regime_posterior: [1.0, 0.0, 0.0],
                        },
                    };
                }
            }
        }

        // Gate 2: spread atual deve estar na cauda superior — caso
        // contrário não há oportunidade *tática agora*.
        let p50_entry = match self.cache.quantile_entry(route, 0.50) {
            Some(v) => v,
            None => return Recommendation::Abstain {
                reason: AbstainReason::InsufficientData,
                diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
            },
        };
        if current_entry + quantile_tolerance < p50_entry {
            return Recommendation::Abstain {
                reason: AbstainReason::NoOpportunity,
                diagnostic: AbstainDiagnostic {
                    n_observations: n.min(u32::MAX as u64) as u32,
                    ci_width_if_emitted: None,
                    nearest_feasible_utility: Some(0.0),
                    tail_ratio_p99_p95: None,
                    model_version: self.cfg.model_version.to_string(),
                    regime_posterior: [1.0, 0.0, 0.0],
                },
            };
        }

        // Lookup de quantis marginais.
        let (_p10_e, _p25_e, p50_e, _p75_e, _p90_e, p95_e) = match all_quantiles_entry(&self.cache, route) {
            Some(qs) => qs,
            None => return Recommendation::Abstain {
                reason: AbstainReason::InsufficientData,
                diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
            },
        };
        let (_p10_x, _p25_x, p50_x, _p75_x, _p90_x, _p95_x) = match all_quantiles_exit(&self.cache, route) {
            Some(qs) => qs,
            None => return Recommendation::Abstain {
                reason: AbstainReason::InsufficientData,
                diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
            },
        };
        let (g10, g25, g50, g75, g90, g95) = match all_quantiles_gross(&self.cache, route) {
            Some(qs) => qs,
            None => return Recommendation::Abstain {
                reason: AbstainReason::InsufficientData,
                diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
            },
        };

        // Preliminares — podem ser ajustados abaixo para respeitar
        // invariante monotônico `enter_at_min ≤ enter_typical ≤ enter_peak_p95`.
        let exit_typical = p50_x;

        // Floor econômico: filtro sobre LUCRO BRUTO COTADO.
        // O modelo NÃO computa fees/funding/slippage (fronteira explícita
        // do CLAUDE.md). Operador ajusta `floor_pct` para absorver a
        // expectativa desses custos externos na sua operação.
        let floor_gross = self.cfg.floor_pct;

        // Gross profit quantis via distribuição conjunta pareada.
        let gross_p10 = g10;
        let gross_p25 = g25;
        let gross_median = g50;
        let gross_p75 = g75;
        let gross_p90 = g90;
        let gross_p95 = g95;

        // Gate 3: gross_p10 abaixo do floor BRUTO → não vale.
        if gross_p10 + quantile_tolerance < floor_gross {
            return Recommendation::Abstain {
                reason: AbstainReason::NoOpportunity,
                diagnostic: AbstainDiagnostic {
                    n_observations: n.min(u32::MAX as u64) as u32,
                    ci_width_if_emitted: None,
                    nearest_feasible_utility: Some(gross_median),
                    tail_ratio_p99_p95: None,
                    model_version: self.cfg.model_version.to_string(),
                    regime_posterior: [1.0, 0.0, 0.0],
                },
            };
        }

        // **Fix pós-auditoria**: enter_at_min derivado economicamente sobre
        // LUCRO BRUTO COTADO. Para atingir floor_gross dado exit_typical
        // esperado: entry ≥ floor_gross − exit_typical. Piso inferior é p50.
        // Se exit_typical ≈ −1% e floor_gross = 0.8%, enter_at_min ≈ 1.8%.
        // Substituiu `p10` (trivial) — agora threshold é ACIONÁVEL.
        let enter_at_min_derivado = floor_gross - exit_typical;
        let enter_at_min = enter_at_min_derivado.max(p50_e);
        // Preservar invariante contratual `enter_at_min ≤ enter_typical ≤ enter_peak_p95`.
        let enter_typical = enter_at_min.max(p50_e);
        let enter_peak_p95 = enter_typical.max(p95_e);
        // exit_at_min simétrico: mínimo exit que fechamento garante floor_gross
        // dado enter_typical.
        let exit_at_min_derivado = floor_gross - enter_typical;
        let exit_at_min = exit_at_min_derivado.min(p50_x);

        let (p_enter_hit, _, _) = match self.cache.probability_entry_ge(route, enter_at_min) {
            Some(stats) => stats,
            None => return Recommendation::Abstain {
                reason: AbstainReason::InsufficientData,
                diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
            },
        };
        let (p_exit_hit, _, _) = match self.cache.probability_exit_ge(route, exit_at_min) {
            Some(stats) => stats,
            None => return Recommendation::Abstain {
                reason: AbstainReason::InsufficientData,
                diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
            },
        };
        // Probabilidade histórica de gross >= floor BRUTO.
        let (p_realize, success_count, total_count) =
            match self.cache.probability_gross_ge(route, floor_gross) {
                Some(stats) => stats,
                None => return Recommendation::Abstain {
                    reason: AbstainReason::InsufficientData,
                    diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
                },
            };
        // Wilson IC com desconto de autocorrelação (Newey-West aproximado).
        // n_eff = n / 10 respeita que observações de spread cross-exchange
        // têm autocorrelação ρ ≈ 0.9 em janelas de segundos (Lahiri 2003);
        // n efetivo independente é ~10% do amostral.
        let n_eff_divisor: u64 = 10;
        let (ic_low, ic_high) = wilson_interval_autocorrelated(
            success_count, total_count, n_eff_divisor,
        );

        // Horizon: duração empírica dos runs favoráveis acima do floor BRUTO.
        // Se ainda não houver run suficiente, usa uma heurística conservadora
        // baseada na validade da recomendação, não um número fixo.
        let fallback = self.cfg.valid_for_s.max(1);
        let (horizon_p05_s, horizon_median_s, horizon_p95_s) = self
            .cache
            .gross_run_duration_quantiles(route, floor_gross)
            .unwrap_or((fallback / 2, fallback, fallback.saturating_mul(2)));

        // Haircut empírico default — será calibrado em shadow (ADR-013 Fase 2).
        let haircut = self.cfg.default_haircut;
        let gross_realizable_median = gross_median * (1.0 - haircut);

        let valid_until = now_ns + (self.cfg.valid_for_s as u64) * 1_000_000_000;

        let setup = TradeSetup {
            route_id: route,
            enter_at_min,
            enter_typical,
            enter_peak_p95,
            p_enter_hit,
            exit_at_min,
            exit_typical,
            p_exit_hit_given_enter: p_exit_hit,
            gross_profit_p10: gross_p10,
            gross_profit_p25: gross_p25,
            gross_profit_median: gross_median,
            gross_profit_p75: gross_p75,
            gross_profit_p90: gross_p90,
            gross_profit_p95: gross_p95,
            realization_probability: p_realize,
            confidence_interval: (ic_low, ic_high),
            horizon_p05_s,
            horizon_median_s,
            horizon_p95_s,
            // Pós-auditoria: usa toxicity REAL detectada em serving.
            // Unknown é default honesto, Suspicious emite com warning;
            // Toxic foi rejeitado acima no Gate 1b.
            toxicity_level: toxicity_hint,
            cluster_id: None,                       // detector vem em M1.3
            cluster_size: 1,
            cluster_rank: 1,
            haircut_predicted: haircut,
            gross_profit_realizable_median: gross_realizable_median,
            // `Degraded` sinaliza que estamos em baseline/safety-net, não no
            // modelo A2 completo. UI deve mostrar `?/100` até que a
            // calibração do modelo principal esteja estabelecida.
            calibration_status: CalibStatus::Degraded,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: format!(
                    "entry {:.2}% ≥ p50 {:.2}% | floor_gross {:.2}% | n={}",
                    current_entry, p50_entry, floor_gross, n
                ),
            },
            model_version: self.cfg.model_version.to_string(),
            emitted_at: now_ns,
            valid_until,
        };
        Recommendation::Trade(setup)
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn all_quantiles_entry(
    cache: &HotQueryCache,
    route: RouteId,
) -> Option<(f32, f32, f32, f32, f32, f32)> {
    Some((
        cache.quantile_entry(route, 0.10)?,
        cache.quantile_entry(route, 0.25)?,
        cache.quantile_entry(route, 0.50)?,
        cache.quantile_entry(route, 0.75)?,
        cache.quantile_entry(route, 0.90)?,
        cache.quantile_entry(route, 0.95)?,
    ))
}

fn all_quantiles_exit(
    cache: &HotQueryCache,
    route: RouteId,
) -> Option<(f32, f32, f32, f32, f32, f32)> {
    Some((
        cache.quantile_exit(route, 0.10)?,
        cache.quantile_exit(route, 0.25)?,
        cache.quantile_exit(route, 0.50)?,
        cache.quantile_exit(route, 0.75)?,
        cache.quantile_exit(route, 0.90)?,
        cache.quantile_exit(route, 0.95)?,
    ))
}

fn all_quantiles_gross(
    cache: &HotQueryCache,
    route: RouteId,
) -> Option<(f32, f32, f32, f32, f32, f32)> {
    Some((
        cache.quantile_gross(route, 0.10)?,
        cache.quantile_gross(route, 0.25)?,
        cache.quantile_gross(route, 0.50)?,
        cache.quantile_gross(route, 0.75)?,
        cache.quantile_gross(route, 0.90)?,
        cache.quantile_gross(route, 0.95)?,
    ))
}

/// Wilson IC com desconto conservador para autocorrelação serial.
///
/// Observações de spread cross-exchange em escala de 1 s têm autocorrelação
/// ρ ≈ 0.9+ (Newey-West 1987 Econometrica 55(3); Lahiri 2003). O estimador
/// IID de Wilson sobrestima a precisão — cobertura real do IC 95% cai para
/// ~70–80% se aplicado diretamente. Dividir n efetivo por `autocorr_divisor`
/// (default 10) aproxima o bloco médio independente de Politis-White 2004.
///
/// Mantém `phat = successes/total` (taxa empírica real reportada), mas
/// a margem usa `n_eff = total / autocorr_divisor`. IC fica correspondentemente
/// mais largo — honesto sobre incerteza real. Se `autocorr_divisor = 1`,
/// comportamento equivalente a `wilson_interval`.
fn wilson_interval_autocorrelated(
    successes: u64,
    total: u64,
    autocorr_divisor: u64,
) -> (f32, f32) {
    if total == 0 {
        return (0.0, 1.0);
    }
    let divisor = autocorr_divisor.max(1);
    let n_eff = (total / divisor).max(1);
    let n = n_eff as f64;
    // phat continua baseado no total original — é a taxa empírica observada.
    let phat = (successes as f64) / (total as f64);
    let z = 1.96_f64;
    let z2 = z * z;
    let denom = 1.0 + z2 / n;
    let centre = (phat + z2 / (2.0 * n)) / denom;
    let margin = z * ((phat * (1.0 - phat) / n + z2 / (4.0 * n * n)).sqrt()) / denom;
    ((centre - margin).max(0.0) as f32, (centre + margin).min(1.0) as f32)
}

fn diagnostic_insufficient(n: u64, version: &'static str) -> AbstainDiagnostic {
    AbstainDiagnostic {
        n_observations: n.min(u32::MAX as u64) as u32,
        ci_width_if_emitted: None,
        nearest_feasible_utility: None,
        tail_ratio_p99_p95: None,
        model_version: version.to_string(),
        regime_posterior: [1.0, 0.0, 0.0],
    }
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
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn populate(cache: &HotQueryCache, route: RouteId, n: u64) {
        // Distribuição sintética otimista: entry ∈ [2%, 4%], exit ∈ [-1%, +0.5%]
        // → gross_p10 ≈ 1.35% (positivo), permite validar Gate 3 (floor).
        for i in 0..n {
            let t = (i % 100) as f32 / 100.0;
            let entry = 2.0 + t * 2.0;
            let exit = -1.0 + t * 1.5;
            cache.observe(route, entry, exit, i);
        }
    }

    fn observe_samples(cache: &HotQueryCache, route: RouteId, samples: &[(f32, f32)]) {
        for (i, (entry, exit)) in samples.iter().copied().enumerate() {
            cache.observe(route, entry, exit, i as u64);
        }
    }

    fn mk_cache() -> HotQueryCache {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        HotQueryCache::with_config(CacheConfig::for_testing())
    }

    #[test]
    fn abstain_when_insufficient_data() {
        let cache = mk_cache();
        let a3 = BaselineA3::with_defaults(cache.clone());
        let route = mk_route();
        populate(&cache, route, 100); // < n_min=500

        let rec = a3.recommend(route, 2.0, -1.0, 1, ToxicityLevel::Unknown);
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::InsufficientData);
            }
            Recommendation::Trade(_) => panic!("should abstain with n=100"),
        }
    }

    #[test]
    fn abstain_when_current_entry_below_median() {
        let cache = mk_cache();
        let a3 = BaselineA3::with_defaults(cache.clone());
        let route = mk_route();
        populate(&cache, route, 1000);

        // current_entry = 0.6% está abaixo do p50 esperado (~1.7%).
        let rec = a3.recommend(route, 0.6, -1.0, 1, ToxicityLevel::Unknown);
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::NoOpportunity);
            }
            Recommendation::Trade(_) => panic!("should abstain with low entry"),
        }
    }

    #[test]
    fn emit_trade_with_full_fields_when_conditions_met() {
        let cache = mk_cache();
        // floor 0.5% — entra no range de gross da distribuição sintética.
        let cfg = BaselineConfig {
            floor_pct: 0.5,
            n_min: 100,
            ..BaselineConfig::default()
        };
        let a3 = BaselineA3::new(cache.clone(), cfg);
        let route = mk_route();
        populate(&cache, route, 500);

        // current_entry 3.8% > p50 (~3.0%) → passa gate 2.
        let rec = a3.recommend(route, 3.8, 0.2, 1_700_000_000_000_000_000, ToxicityLevel::Unknown);
        match rec {
            Recommendation::Trade(setup) => {
                // Sanity checks em campos-chave do ADR-016.
                assert_eq!(setup.route_id, route);
                // Pós-auditoria: min/typical/peak podem coincidir quando
                // piso econômico empurra os 3 níveis para cima. Apenas
                // invariante monotônico ≤ é exigido.
                assert!(setup.enter_at_min <= setup.enter_typical);
                assert!(setup.enter_typical <= setup.enter_peak_p95);
                assert!(setup.gross_profit_p10 <= setup.gross_profit_median);
                assert!(setup.gross_profit_median <= setup.gross_profit_p95);
                assert!(setup.realization_probability >= 0.0);
                assert!(setup.realization_probability <= 1.0);
                assert_eq!(setup.calibration_status, CalibStatus::Degraded);
                // Pós-auditoria: toxicity é Unknown quando recommend recebe
                // essa hint (serving decide). Baseline apenas propaga.
                assert_eq!(setup.toxicity_level, ToxicityLevel::Unknown);
                assert!(setup.valid_until > setup.emitted_at);
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("should emit Trade, got Abstain({:?})", reason);
            }
        }
    }

    #[test]
    fn abstain_when_gross_below_floor() {
        let cache = mk_cache();
        // floor 10% — nenhuma distribuição sintética atinge.
        let cfg = BaselineConfig {
            floor_pct: 10.0,
            n_min: 100,
            ..BaselineConfig::default()
        };
        let a3 = BaselineA3::new(cache.clone(), cfg);
        let route = mk_route();
        populate(&cache, route, 500);

        let rec = a3.recommend(route, 3.8, 0.2, 1, ToxicityLevel::Unknown);
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::NoOpportunity);
            }
            Recommendation::Trade(_) => panic!("floor 10% should force abstain"),
        }
    }

    #[test]
    fn emit_trade_when_joint_gross_survives_floor_even_if_marginals_are_misaligned() {
        let cache = mk_cache();
        let cfg = BaselineConfig {
            floor_pct: 0.5,
            n_min: 4,
            ..BaselineConfig::default()
        };
        let a3 = BaselineA3::new(cache.clone(), cfg);
        let route = mk_route();
        observe_samples(
            &cache,
            route,
            &[(4.0, -3.0), (1.0, 1.0), (1.0, 1.0), (1.0, 1.0)],
        );

        let rec = a3.recommend(route, 4.0, 1.0, 42, ToxicityLevel::Unknown);
        match rec {
            Recommendation::Trade(setup) => {
                assert!(setup.gross_profit_p10 >= 0.5);
                assert!(setup.realization_probability > 0.5);
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("joint distribution should permit trade, got Abstain({reason:?})")
            }
        }
    }

    #[test]
    fn realization_probability_and_ci_follow_observed_joint_success_rate() {
        let cache = mk_cache();
        let cfg = BaselineConfig {
            floor_pct: 0.5,
            n_min: 50,
            ..BaselineConfig::default()
        };
        let a3 = BaselineA3::new(cache.clone(), cfg);
        let route = mk_route();
        let mut samples = Vec::with_capacity(100);
        for _ in 0..100 {
            samples.push((2.0, -0.5));
        }
        observe_samples(&cache, route, &samples);

        let rec = a3.recommend(route, 2.1, -0.4, 1_700_000_000_000_000_000, ToxicityLevel::Unknown);
        match rec {
            Recommendation::Trade(setup) => {
                // Taxa empírica bruta continua em 1.0 (100% das observações
                // tinham gross >= floor).
                assert!(
                    (setup.realization_probability - 1.0).abs() < f32::EPSILON,
                    "expected empirical success rate of 1.0, got {}",
                    setup.realization_probability
                );
                // Pós-auditoria: IC usa `wilson_interval_autocorrelated` com
                // n_eff = n/10 — mais largo e honesto em face de autocorrelação.
                // Para n=100 amostras com phat=1.0, n_eff=10 → lower bound
                // aproximadamente 0.72 (não mais 0.90). Isso REFLETE melhor
                // a incerteza real em séries autocorrelacionadas (Lahiri 2003).
                assert!(
                    setup.confidence_interval.0 > 0.60,
                    "lower bound deve ser > 0.60 com n_eff desconto; got {:?}",
                    setup.confidence_interval
                );
                assert!(setup.confidence_interval.1 <= 1.0);
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("expected Trade on saturated success set, got Abstain({reason:?})")
            }
        }
    }
}
