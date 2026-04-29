//! Baseline A3 — implementação ECDF marginal degradada.
//!
//! Ver `mod.rs` para limitações documentadas. O baseline continua sendo
//! safety-net. Ele ancora o lucro no `entry` acionável atual e usa a
//! distribuição marginal futura de `exit`, sem tratar `entry(t)+exit(t)`
//! simultâneo como label econômico.

use crate::ml::contract::{
    AbstainDiagnostic, AbstainReason, BaselineDiagnostics, CalibStatus, ReasonKind, Recommendation,
    RouteId, TradeReason, TradeSetup,
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

    /// Emite recomendação para `route` dado estado de spread atual.
    ///
    /// **Fluxo pós-auditoria 2026-04-21**:
    /// 1. Checa `n_observations ≥ n_min` (senão `InsufficientData`).
    /// 2. Checa tail_ratio p99/p95 > threshold → `Abstain(LongTail)`.
    /// 3. Gate acionável: `current_entry ≥ 0`, senão `NoOpportunity`.
    /// 4. Gate tático alinhado ao trigger: `current_entry ≥ p95(entry)`,
    ///    senão `NoOpportunity`.
    /// 5. Threshold diagnóstico `enter_at_min` derivado sobre LUCRO BRUTO COTADO:
    ///    `max(floor_pct − exit_typical, p50_entry)`.
    /// 6. Gate econômico degradado: `current_entry + exit_typical ≥ floor`.
    /// 7. Quantis de gross são proxy marginal:
    ///    `enter_typical + quantile(exit)`, não `entry(t)+exit(t)`.
    /// 8. `historical_base_rate_24h` é a taxa empírica marginal
    ///    `P_hist(exit ≥ floor − enter_typical)` na janela do cache.
    /// 9. Emite `TradeSetup` com `entry_now=current_entry` e
    ///    `calibration_status: Degraded`; o modelo A2
    ///    deve substituir isso por labels forward-looking reais.
    pub fn recommend(
        &self,
        route: RouteId,
        current_entry: f32,
        _current_exit: f32,
        now_ns: u64,
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

        // Observações com entry negativo continuam válidas para histórico e
        // calibração de abstenção, mas não são recomendação acionável.
        if current_entry < 0.0 {
            return Recommendation::Abstain {
                reason: AbstainReason::NoOpportunity,
                diagnostic: AbstainDiagnostic {
                    n_observations: n.min(u32::MAX as u64) as u32,
                    ci_width_if_emitted: None,
                    nearest_feasible_utility: Some(current_entry),
                    tail_ratio_p99_p95: None,
                    model_version: self.cfg.model_version.to_string(),
                    regime_posterior: [1.0, 0.0, 0.0],
                },
            };
        }

        // Gate 1b: LongTail — p99/p95 > threshold sinaliza spike anômalo.
        // Detector pós-auditoria: evita emitir durante cauda estatística
        // extrema / manipulation / spike de 1-tick.
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

        // Gate 2: spread atual deve estar na mesma cauda superior usada pelo
        // SamplingTrigger; caso contrário não há oportunidade *tática agora*.
        let p95_entry_gate = match self.cache.quantile_entry(route, 0.95) {
            Some(v) => v,
            None => {
                return Recommendation::Abstain {
                    reason: AbstainReason::InsufficientData,
                    diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
                }
            }
        };
        if current_entry + quantile_tolerance < p95_entry_gate {
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

        // Lookup de quantis marginais. Neste ponto a cauda superior já foi
        // validada contra p95.
        let (_p10_e, _p25_e, p50_e, _p75_e, _p90_e, p95_e) =
            match all_quantiles_entry(&self.cache, route) {
                Some(qs) => qs,
                None => {
                    return Recommendation::Abstain {
                        reason: AbstainReason::InsufficientData,
                        diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
                    }
                }
            };
        let (p10_x, p25_x, p50_x, p75_x, p90_x, p95_x) =
            match all_quantiles_exit(&self.cache, route) {
                Some(qs) => qs,
                None => {
                    return Recommendation::Abstain {
                        reason: AbstainReason::InsufficientData,
                        diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
                    }
                }
            };

        // Preliminares — podem ser ajustados abaixo para respeitar
        // invariante monotônico `enter_at_min ≤ enter_typical ≤ enter_peak_p95`.
        let exit_typical = p50_x;

        // Floor econômico: filtro sobre LUCRO BRUTO COTADO.
        // O modelo NÃO computa fees/funding/slippage (fronteira explícita
        // do CLAUDE.md). Operador ajusta `floor_pct` para absorver a
        // expectativa desses custos externos na sua operação.
        let floor_gross = self.cfg.floor_pct;

        // Gate 3: baseline degradado usa o entry acionável atual mais a
        // saída marginal típica. Não usa `entry(t)+exit(t)` simultâneo, pois
        // essa identidade mede reversão imediata, não saída futura.
        let gross_typical_if_enter_now = current_entry + exit_typical;
        if gross_typical_if_enter_now + quantile_tolerance < floor_gross {
            return Recommendation::Abstain {
                reason: AbstainReason::NoOpportunity,
                diagnostic: AbstainDiagnostic {
                    n_observations: n.min(u32::MAX as u64) as u32,
                    ci_width_if_emitted: None,
                    nearest_feasible_utility: Some(gross_typical_if_enter_now),
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
        let enter_typical = current_entry.max(enter_at_min);
        let enter_peak_p95 = enter_typical.max(p95_e);
        // exit_at_min simétrico: mínimo exit que fechamento garante floor_gross
        // dado enter_typical.
        let exit_at_min = floor_gross - enter_typical;

        // Proxy marginal da distribuição de lucro bruto:
        // `G_proxy(t0,t1) = enter_typical(t0) + S_saida(t1)`.
        let gross_p10 = enter_typical + p10_x;
        let gross_p25 = enter_typical + p25_x;
        let gross_median = enter_typical + p50_x;
        let gross_p75 = enter_typical + p75_x;
        let gross_p90 = enter_typical + p90_x;
        let gross_p95 = enter_typical + p95_x;

        let (p_enter_hit, _, _) = match self.cache.probability_entry_ge(route, enter_at_min) {
            Some(stats) => stats,
            None => {
                return Recommendation::Abstain {
                    reason: AbstainReason::InsufficientData,
                    diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
                }
            }
        };
        let (p_exit_hit, exit_success_count, exit_total_count) =
            match self.cache.probability_exit_ge(route, exit_at_min) {
                Some(stats) => stats,
                None => {
                    return Recommendation::Abstain {
                        reason: AbstainReason::InsufficientData,
                        diagnostic: diagnostic_insufficient(n, self.cfg.model_version),
                    }
                }
            };
        let p_realize = p_exit_hit;
        let success_count = exit_success_count;
        let total_count = exit_total_count;
        // Wilson IC com desconto de autocorrelação (Newey-West aproximado).
        // n_eff = n / 10 respeita que observações de spread cross-exchange
        // têm autocorrelação ρ ≈ 0.9 em janelas de segundos (Lahiri 2003);
        // n efetivo independente é ~10% do amostral.
        let n_eff_divisor: u64 = 10;
        let (ic_low, ic_high) =
            wilson_interval_autocorrelated(success_count, total_count, n_eff_divisor);

        let valid_until = now_ns + (self.cfg.valid_for_s as u64) * 1_000_000_000;

        // gross_profit_target deriva de exit_q50 (mediano), não de
        // exit_at_min (alvo conservador). Para consistência com CLAUDE.md
        // §Output "L = enter + exit_q50".
        let gross_profit_central = current_entry + p50_x;

        // ReasonDetail estruturado — zero prosa free-form.
        let percentile = self.cache.entry_rank_percentile(route, current_entry);
        let z = self.cache.entry_mad_robust(route).and_then(|mad| {
            if mad.abs() < 1e-6 {
                None
            } else {
                Some((current_entry - p50_e) / mad)
            }
        });
        let reason_detail = crate::ml::contract::ReasonDetail {
            entry_percentile_24h: percentile,
            regime_posterior_top: 1.0,
            regime_dominant_idx: 0,
            tail_z_score: z,
        };

        let setup = TradeSetup {
            route_id: route,
            entry_now: current_entry,
            exit_target: exit_at_min,
            gross_profit_target: gross_profit_central,
            // A3 não possui forecast condicional calibrado; expor `P_hit`
            // como Some(p_realize) confundiria taxa marginal com objetivo
            // central. Mantém None e guarda a ECDF em diagnostics.
            p_hit: None,
            p_hit_ci: None,
            // método declarado — Wilson marginal, não conformal.
            ci_method: "wilson_marginal",
            exit_q25: Some(p25_x),
            exit_q50: Some(p50_x),
            exit_q75: Some(p75_x),
            t_hit_p25_s: None,
            t_hit_median_s: None,
            t_hit_p75_s: None,
            p_censor: None,
            baseline_diagnostics: Some(BaselineDiagnostics {
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
                historical_base_rate_24h: p_realize,
                historical_base_rate_ci: (ic_low, ic_high),
            }),
            cluster_id: None, // detector vem em M1.3
            cluster_size: 1,
            cluster_rank: 1,
            // status explícito distingue "não implementado" de
            // "cluster detectado mas tamanho 1".
            cluster_detection_status: "not_implemented",
            // `Degraded` sinaliza que estamos em baseline/safety-net, não no
            // modelo A2 completo. UI deve mostrar `?/100` até que a
            // calibração do modelo principal esteja estabelecida.
            calibration_status: CalibStatus::Degraded,
            reason: TradeReason {
                kind: ReasonKind::Tail,
                detail: reason_detail,
            },
            model_version: self.cfg.model_version.to_string(),
            // fonte canônica via enum — baseline A3 é Baseline, não Model.
            source_kind: crate::ml::contract::SourceKind::Baseline,
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
fn wilson_interval_autocorrelated(successes: u64, total: u64, autocorr_divisor: u64) -> (f32, f32) {
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
    (
        (centre - margin).max(0.0) as f32,
        (centre + margin).min(1.0) as f32,
    )
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

        let rec = a3.recommend(route, 2.0, -1.0, 1);
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::InsufficientData);
            }
            Recommendation::Trade(_) => panic!("should abstain with n=100"),
        }
    }

    #[test]
    fn abstain_when_current_entry_below_p95() {
        let cache = mk_cache();
        let a3 = BaselineA3::with_defaults(cache.clone());
        let route = mk_route();
        populate(&cache, route, 1000);

        // current_entry = 0.6% está abaixo do p95 esperado (~3.9%).
        let rec = a3.recommend(route, 0.6, -1.0, 1);
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::NoOpportunity);
            }
            Recommendation::Trade(_) => panic!("should abstain with low entry"),
        }
    }

    #[test]
    fn abstain_when_current_entry_is_negative_even_with_history() {
        let cache = mk_cache();
        let a3 = BaselineA3::with_defaults(cache.clone());
        let route = mk_route();
        populate(&cache, route, 1000);

        let rec = a3.recommend(route, -0.01, 1.0, 1);
        match rec {
            Recommendation::Abstain { reason, diagnostic } => {
                assert_eq!(reason, AbstainReason::NoOpportunity);
                assert_eq!(diagnostic.nearest_feasible_utility, Some(-0.01));
            }
            Recommendation::Trade(_) => panic!("negative entry must not be actionable"),
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

        // current_entry 4.0% > p95 (~3.9%) → passa gate 2.
        let rec = a3.recommend(route, 4.0, 0.2, 1_700_000_000_000_000_000);
        match rec {
            Recommendation::Trade(setup) => {
                // Sanity checks em campos-chave do ADR-016.
                assert_eq!(setup.route_id, route);
                assert_eq!(setup.entry_now, 4.0);
                // gross_profit_target deriva de entry_now + exit_q50.
                let q50 = setup.exit_q50.expect("q50 presente em baseline trade");
                assert_eq!(setup.gross_profit_target, setup.entry_now + q50);
                // Pós-auditoria: min/typical/peak podem coincidir quando
                // piso econômico empurra os 3 níveis para cima. Apenas
                // invariante monotônico ≤ é exigido.
                let diag = setup
                    .baseline_diagnostics
                    .as_ref()
                    .expect("baseline diagnostics");
                assert!(diag.enter_at_min <= diag.enter_typical);
                assert!(diag.enter_typical <= diag.enter_peak_p95);
                assert!(diag.gross_profit_p10 <= diag.gross_profit_median);
                assert!(diag.gross_profit_median <= diag.gross_profit_p95);
                assert!(diag.historical_base_rate_24h >= 0.0);
                assert!(diag.historical_base_rate_24h <= 1.0);
                assert!(setup.t_hit_median_s.is_none());
                assert!(setup.p_hit.is_none());
                assert_eq!(setup.calibration_status, CalibStatus::Degraded);
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

        let rec = a3.recommend(route, 4.0, 0.2, 1);
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::NoOpportunity);
            }
            Recommendation::Trade(_) => panic!("floor 10% should force abstain"),
        }
    }

    #[test]
    fn emit_trade_when_current_entry_plus_marginal_exit_survives_floor() {
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

        let rec = a3.recommend(route, 4.0, 1.0, 42);
        match rec {
            Recommendation::Trade(setup) => {
                let diag = setup
                    .baseline_diagnostics
                    .as_ref()
                    .expect("baseline diagnostics");
                assert!(diag.gross_profit_p10 >= 0.5);
                assert!(diag.historical_base_rate_24h > 0.5);
                assert!(setup.t_hit_median_s.is_none());
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("marginal exit proxy should permit trade, got Abstain({reason:?})")
            }
        }
    }

    #[test]
    fn historical_base_rate_and_ci_follow_exit_threshold_rate() {
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

        let rec = a3.recommend(route, 2.1, -0.4, 1_700_000_000_000_000_000);
        match rec {
            Recommendation::Trade(setup) => {
                let diag = setup
                    .baseline_diagnostics
                    .as_ref()
                    .expect("baseline diagnostics");
                // Taxa degradada segue P(exit >= floor - enter_typical).
                assert!(
                    (diag.historical_base_rate_24h - 1.0).abs() < f32::EPSILON,
                    "expected empirical success rate of 1.0, got {}",
                    diag.historical_base_rate_24h
                );
                // Pós-auditoria: IC usa `wilson_interval_autocorrelated` com
                // n_eff = n/10 — mais largo e honesto em face de autocorrelação.
                // Para n=100 amostras com phat=1.0, n_eff=10 → lower bound
                // aproximadamente 0.72 (não mais 0.90). Isso REFLETE melhor
                // a incerteza real em séries autocorrelacionadas (Lahiri 2003).
                assert!(
                    diag.historical_base_rate_ci.0 > 0.60,
                    "lower bound deve ser > 0.60 com n_eff desconto; got {:?}",
                    diag.historical_base_rate_ci
                );
                assert!(diag.historical_base_rate_ci.1 <= 1.0);
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("expected Trade on saturated success set, got Abstain({reason:?})")
            }
        }
    }

    #[test]
    fn emits_from_current_entry_plus_marginal_exit_when_instant_gross_is_below_floor() {
        let cache = mk_cache();
        let cfg = BaselineConfig {
            floor_pct: 0.8,
            n_min: 50,
            ..BaselineConfig::default()
        };
        let a3 = BaselineA3::new(cache.clone(), cfg);
        let route = mk_route();

        let mut samples = Vec::with_capacity(100);
        for _ in 0..60 {
            samples.push((0.4, 0.0));
        }
        for _ in 0..40 {
            samples.push((2.0, -1.5));
        }
        observe_samples(&cache, route, &samples);

        let rec = a3.recommend(route, 2.1, -1.5, 1_700_000_000_000_000_000);
        match rec {
            Recommendation::Trade(setup) => {
                let diag = setup
                    .baseline_diagnostics
                    .as_ref()
                    .expect("baseline diagnostics");
                assert!(diag.gross_profit_p10 < cfg.floor_pct);
                assert!(diag.gross_profit_median >= cfg.floor_pct);
                assert_eq!(setup.calibration_status, CalibStatus::Degraded);
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("marginal exit safety-net should emit, got Abstain({reason:?})")
            }
        }
    }

    #[test]
    fn source_does_not_fabricate_time_to_exit_from_valid_for_fallback() {
        let source = include_str!("ecdf.rs");
        let p05 = ["let ", "horizon_p05_s = fallback / 2;"].concat();
        let median = ["let ", "horizon_median_s = fallback;"].concat();
        let p95 = ["let ", "horizon_p95_s = fallback.saturating_mul(2);"].concat();
        assert!(
            !source.contains(&p05),
            "baseline não deve fabricar T sintético a partir de valid_for_s"
        );
        assert!(
            !source.contains(&median),
            "baseline não deve usar valid_for_s como tempo esperado até saída"
        );
        assert!(
            !source.contains(&p95),
            "baseline não deve usar múltiplos de valid_for_s como p95 de saída"
        );
    }
}
