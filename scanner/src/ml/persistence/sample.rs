//! Schema de persistência — `AcceptedSample`.
//!
//! Implementa C4 fix (was_recommended) + ADR-012 §Schema canônico.
//! Vide `mod.rs` para racional de formato.

use crate::ml::contract::RouteId;
use crate::ml::persistence::sample_id::sample_id_of;
use crate::ml::trigger::SampleDecision;

/// Versão atual do schema. Bump quando adicionar/remover/renomear campos.
///
/// # Histórico
///
/// - **v1** (original): `ts_ns, cycle_seq, schema_version, symbol_id,
///   buy_venue, sell_venue, buy_market, sell_market, entry_spread,
///   exit_spread, buy/sell_vol24, sample_decision, was_recommended`.
/// - **v2** (ADR-029, 2026-04-21): adiciona `symbol_name` (string canonical
///   "BASE-QUOTE", ex: "BTC-USDT") e `scanner_version` (env `CARGO_PKG_VERSION`).
///   Motivação: `symbol_id` é atribuído dinamicamente em discovery e NÃO é
///   estável entre runs → join retrospectivo de dados diários exige nome
///   canonical. Sem v2, 30 dias de coleta viram inúteis se universo mudar.
/// - **v3** (Wave V dataset PhD, 2026-04-21): adiciona `sample_id` (hash
///   determinístico FNV-1a hex16) para join cross-schema com `RawSample`
///   e `LabeledTrade`. Correção PhD Q5.
/// - **v4** (2026-04-21): remove `buy/sell_book_age_ms`; book age é
///   diagnóstico operacional de corretora, não dado do dataset ML.
/// - **v5** (2026-04-22): `sample_id` passa a FNV-1a 128-bit hex32.
pub const ACCEPTED_SAMPLE_SCHEMA_VERSION: u16 = 5;

/// Versão do scanner no momento da serialização. Injetado pelo crate
/// via `env!("CARGO_PKG_VERSION")`. Permite debugging retrospectivo de
/// bugs introduzidos em versões específicas.
pub const SCANNER_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Uma observação aceita pelo trigger, pronta para gravação.
///
/// Este é o **contrato de dados persistido**. **Não altere campos sem
/// bump de `schema_version`**. Python trainer em Marco 2 consome com
/// este schema via JSONL (`pandas.read_json(lines=True)`).
#[derive(Debug, Clone)]
pub struct AcceptedSample {
    pub ts_ns: u64,
    pub cycle_seq: u32,
    pub schema_version: u16,
    pub route_id: RouteId,
    /// **v2** — nome canonical estável entre runs (ex: "BTC-USDT"). Único
    /// join key confiável para análise cross-dia. `symbol_id` é incluído
    /// como auxiliar mas não deve ser usado entre runs.
    pub symbol_name: String,
    /// **v2** — versão do scanner que gerou a amostra. Útil para excluir
    /// dados gerados por versões bugadas retrospectivamente.
    pub scanner_version: &'static str,
    /// **v3** — hash determinístico da tupla canonical (ts_ns+cycle_seq+
    /// symbol+venues+markets). Chave de join cross-schema com RawSample
    /// e LabeledTrade. Computado via `sample_id_of()` — função única.
    pub sample_id: String,
    pub entry_spread: f32,
    pub exit_spread: f32,
    pub buy_vol24: f64,
    pub sell_vol24: f64,
    pub sample_decision: SampleDecision,
    /// Flag de emissão do baseline — `true` se o baseline A3 produziu
    /// `Recommendation::Trade` para este snapshot (observe: Abstain =
    /// false). Determinado por `should_mark_sample_recommended` em
    /// `lib.rs`: `matches!(rec, Recommendation::Trade(_))`.
    ///
    /// Fix pós-auditoria L12: a doc anterior dizia "proxy de entrega
    /// (≥1 consumer WS ativo)", mas a implementação real nunca olha o
    /// estado do broadcast. Documento reflete o comportamento vigente.
    /// Trainer usa como sinal de "baseline quis recomendar" para comparar
    /// contra outcomes supervisionados.
    pub was_recommended: bool,
}

impl AcceptedSample {
    /// Novo AcceptedSample com `symbol_name` resolvido externamente
    /// (caller busca via `SymbolUniverse::canonical_name_of(symbol_id)`).
    /// `scanner_version` é constante de módulo.
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        ts_ns: u64,
        cycle_seq: u32,
        route_id: RouteId,
        symbol_name: impl Into<String>,
        entry_spread: f32,
        exit_spread: f32,
        buy_vol24: f64,
        sell_vol24: f64,
        sample_decision: SampleDecision,
    ) -> Self {
        let symbol_name = symbol_name.into();
        let sample_id = sample_id_of(
            ts_ns,
            cycle_seq,
            &symbol_name,
            route_id.buy_venue,
            route_id.sell_venue,
        );
        Self {
            ts_ns,
            cycle_seq,
            schema_version: ACCEPTED_SAMPLE_SCHEMA_VERSION,
            route_id,
            symbol_name,
            scanner_version: SCANNER_VERSION,
            sample_id,
            entry_spread,
            exit_spread,
            buy_vol24,
            sell_vol24,
            sample_decision,
            was_recommended: false,
        }
    }

    pub fn mark_recommended(&mut self) {
        self.was_recommended = true;
    }

    /// Serializa para uma linha JSON (sem newline). Usado pelo
    /// `JsonlWriter`. Manual para evitar dependência de `Serialize`
    /// derive em `Venue`/`SymbolId` (requer mudança em `types.rs`).
    pub fn to_json_line(&self) -> String {
        let decision = self.sample_decision.reason_label();
        format!(
            concat!(
                r#"{{"ts_ns":{},"cycle_seq":{},"schema_version":{},"#,
                r#""scanner_version":"{}","sample_id":"{}","#,
                r#""symbol_id":{},"symbol_name":"{}","#,
                r#""buy_venue":"{}","sell_venue":"{}","#,
                r#""buy_market":"{}","sell_market":"{}","#,
                r#""entry_spread":{},"exit_spread":{},"#,
                r#""buy_vol24":{},"sell_vol24":{},"#,
                r#""sample_decision":"{}","was_recommended":{}}}"#,
            ),
            self.ts_ns,
            self.cycle_seq,
            self.schema_version,
            self.scanner_version,
            self.sample_id,
            self.route_id.symbol_id.0,
            escape_json_string(&self.symbol_name),
            self.route_id.buy_venue.as_str(),
            self.route_id.sell_venue.as_str(),
            self.route_id.buy_venue.market().as_str(),
            self.route_id.sell_venue.market().as_str(),
            format_f32(self.entry_spread),
            format_f32(self.exit_spread),
            format_f64(self.buy_vol24),
            format_f64(self.sell_vol24),
            decision,
            self.was_recommended,
        )
    }
}

/// Escapa caracteres JSON especiais em strings — nomes canonical não
/// contêm `\` ou `"` normalmente (são uppercase alfanuméricos + `-`),
/// mas é defensivo caso um símbolo exótico apareça.
#[inline]
fn escape_json_string(s: &str) -> String {
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

/// f32 → string JSON-safe: `NaN` e `Inf` viram `null`.
#[inline]
fn format_f32(v: f32) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
    }
}

#[inline]
fn format_f64(v: f64) -> String {
    if v.is_finite() {
        format!("{}", v)
    } else {
        "null".to_string()
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
            symbol_id: SymbolId(42),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    #[test]
    fn new_sets_schema_version_and_defaults() {
        let s = AcceptedSample::new(
            1_700_000_000_000_000_000,
            42,
            mk_route(),
            "BTC-USDT",
            2.5,
            -0.8,
            1e6,
            2e6,
            SampleDecision::Accept,
        );
        assert_eq!(s.schema_version, ACCEPTED_SAMPLE_SCHEMA_VERSION);
        assert_eq!(s.schema_version, 5);
        assert_eq!(s.symbol_name, "BTC-USDT");
        assert!(!s.scanner_version.is_empty());
        assert_eq!(s.sample_id.len(), 32);
        assert!(!s.was_recommended);
    }

    #[test]
    fn json_line_is_single_line_valid_json() {
        let s = AcceptedSample::new(
            1_700_000_000_000_000_000,
            42,
            mk_route(),
            "BTC-USDT",
            2.5,
            -0.8,
            1e6,
            2e6,
            SampleDecision::Accept,
        );
        let line = s.to_json_line();
        assert!(!line.contains('\n'));
        // Round-trip via serde_json value parse.
        let v: serde_json::Value = serde_json::from_str(&line).expect("valid json");
        assert_eq!(v["symbol_id"], 42);
        assert_eq!(v["symbol_name"], "BTC-USDT");
        assert_eq!(v["buy_venue"], "mexc");
        assert_eq!(v["sell_venue"], "bingx");
        assert_eq!(v["buy_market"], "FUTURES");
        assert_eq!(v["sample_decision"], "accept");
        assert_eq!(v["was_recommended"], false);
        assert!(v["scanner_version"].is_string());
        assert_eq!(v["schema_version"], 5);
        assert_eq!(v["sample_id"].as_str().unwrap().len(), 32);
        assert!(
            v.get("buy_book_age_ms").is_none(),
            "book age não deve sair no dataset ML"
        );
        assert!(
            v.get("sell_book_age_ms").is_none(),
            "book age não deve sair no dataset ML"
        );
    }

    #[test]
    fn non_finite_floats_serialize_as_null() {
        let mut s = AcceptedSample::new(
            1, 0, mk_route(), "BTC-USDT", f32::NAN, f32::INFINITY,
            f64::NEG_INFINITY, 1e6,
            SampleDecision::Accept,
        );
        s.mark_recommended();
        let line = s.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert!(v["entry_spread"].is_null());
        assert!(v["exit_spread"].is_null());
        assert!(v["buy_vol24"].is_null());
        assert_eq!(v["was_recommended"], true);
    }

    #[test]
    fn schema_version_in_output_matches_const() {
        let s = AcceptedSample::new(
            1, 0, mk_route(), "ETH-USDT", 1.0, -1.0, 1e6, 1e6,
            SampleDecision::Accept,
        );
        let line = s.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(
            v["schema_version"].as_u64().unwrap() as u16,
            ACCEPTED_SAMPLE_SCHEMA_VERSION
        );
    }

    #[test]
    fn symbol_name_with_special_chars_is_escaped() {
        // Defensivo — nomes canonical normalmente não têm aspas/backslash,
        // mas garantimos que o escaping não quebra JSON.
        let s = AcceptedSample::new(
            1, 0, mk_route(), "XYZ\"EVIL", 1.0, -1.0, 1e6, 1e6,
            SampleDecision::Accept,
        );
        let line = s.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).expect("still valid json");
        assert_eq!(v["symbol_name"], "XYZ\"EVIL");
    }

    #[test]
    fn empty_symbol_name_is_handled_gracefully() {
        // Caso fallback — universe lookup falhou retorna "".
        let s = AcceptedSample::new(
            1, 0, mk_route(), "", 1.0, -1.0, 1e6, 1e6,
            SampleDecision::Accept,
        );
        let line = s.to_json_line();
        let v: serde_json::Value = serde_json::from_str(&line).expect("json valido mesmo vazio");
        assert_eq!(v["symbol_name"], "");
    }
}
