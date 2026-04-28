//! JSON contract between scanner and frontend. Field names MUST match what
//! the frontend observes; changes here break the existing UI.

use serde::Serialize;

use crate::spread::Opportunity;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpportunityDto {
    pub id: String,
    pub symbol: String,
    pub current: String,
    pub buy_from: String,
    pub sell_to: String,
    pub buy_type: String,
    pub sell_type: String,
    pub buy_price: f64,
    pub sell_price: f64,
    pub entry_spread: f64,
    pub exit_spread: f64,
    pub buy_vol24: f64,
    pub sell_vol24: f64,
    pub buy_book_age: u64,
    pub sell_book_age: u64,
}

fn market_key(market: &str) -> &'static str {
    if market.eq_ignore_ascii_case("FUTURES") || market.eq_ignore_ascii_case("FUTURO") {
        "future"
    } else {
        "spot"
    }
}

fn opportunity_id(
    symbol: &str,
    current: &str,
    buy_from: &str,
    buy_type: &str,
    sell_to: &str,
    sell_type: &str,
) -> String {
    format!(
        "{}-{}-{}-{}-{}-{}",
        symbol.trim().to_uppercase(),
        current.trim().to_uppercase(),
        buy_from.trim().to_ascii_lowercase(),
        market_key(buy_type),
        sell_to.trim().to_ascii_lowercase(),
        market_key(sell_type),
    )
}

impl From<&Opportunity> for OpportunityDto {
    fn from(o: &Opportunity) -> Self {
        Self {
            id: opportunity_id(
                &o.symbol,
                &o.current,
                o.buy_from,
                o.buy_type,
                o.sell_to,
                o.sell_type,
            ),
            symbol: o.symbol.clone(),
            current: o.current.clone(),
            buy_from: o.buy_from.to_string(),
            sell_to: o.sell_to.to_string(),
            buy_type: o.buy_type.to_string(),
            sell_type: o.sell_type.to_string(),
            buy_price: o.buy_price,
            sell_price: o.sell_price,
            entry_spread: o.entry_spread,
            exit_spread: o.exit_spread,
            buy_vol24: o.buy_vol24,
            sell_vol24: o.sell_vol24,
            buy_book_age: o.buy_book_age,
            sell_book_age: o.sell_book_age,
        }
    }
}

pub struct VolStore {
    /// `[venue_idx * n_symbols + symbol_id.0]` — base-asset 24h volume in
    /// base currency (or quote currency — whichever the venue emits first).
    pub base: Box<[std::sync::atomic::AtomicU64]>,
    pub n_symbols: u32,
}

impl VolStore {
    pub fn with_capacity(n_symbols: u32) -> Self {
        let total = (n_symbols as usize) * crate::types::VENUE_COUNT;
        let v: Vec<std::sync::atomic::AtomicU64> = (0..total)
            .map(|_| std::sync::atomic::AtomicU64::new(0))
            .collect();
        Self {
            base: v.into_boxed_slice(),
            n_symbols,
        }
    }
    #[inline]
    fn idx(&self, venue: crate::types::Venue, sym: crate::types::SymbolId) -> usize {
        venue.idx() * (self.n_symbols as usize) + sym.0 as usize
    }
    #[inline]
    pub fn set(&self, venue: crate::types::Venue, sym: crate::types::SymbolId, vol_usd: f64) {
        let bits = vol_usd.to_bits();
        self.base[self.idx(venue, sym)].store(bits, std::sync::atomic::Ordering::Relaxed);
    }
    #[inline]
    pub fn get(&self, venue: crate::types::Venue, sym: crate::types::SymbolId) -> f64 {
        f64::from_bits(self.base[self.idx(venue, sym)].load(std::sync::atomic::Ordering::Relaxed))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn camel_case_serialization() {
        let dto = OpportunityDto {
            id: "BTC-USDT-binance-spot-gate-future".into(),
            symbol: "BTC".into(),
            current: "USDT".into(),
            buy_from: "binance".into(),
            sell_to: "gate".into(),
            buy_type: "SPOT".into(),
            sell_type: "FUTURES".into(),
            buy_price: 43567.12,
            sell_price: 43812.98,
            entry_spread: 0.5637,
            exit_spread: -0.3412,
            buy_vol24: 1_234_567.89,
            sell_vol24: 987_654.32,
            buy_book_age: 45,
            sell_book_age: 78,
        };
        let json = serde_json::to_string(&dto).unwrap();
        assert!(json.contains(r#""id":"BTC-USDT-binance-spot-gate-future""#));
        assert!(json.contains(r#""current":"USDT""#));
        assert!(json.contains(r#""buyFrom":"binance""#));
        assert!(json.contains(r#""sellTo":"gate""#));
        assert!(json.contains(r#""buyPrice":43567.12"#));
        assert!(json.contains(r#""entrySpread":0.5637"#));
        assert!(json.contains(r#""buyBookAge":45"#));
    }
}
