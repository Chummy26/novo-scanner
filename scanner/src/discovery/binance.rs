//! Binance Spot + Futures symbol discovery via /exchangeInfo.
//!
//! Spot:    GET https://api.binance.com/api/v3/exchangeInfo
//! Futures: GET https://fapi.binance.com/fapi/v1/exchangeInfo

use async_trait::async_trait;
use serde::Deserialize;

use crate::discovery::{Discoverer, VenueSymbol};
use crate::error::{Error, Result};
use crate::normalize;
use crate::types::Venue;

pub struct BinanceDiscoverer {
    pub venue: Venue,
}

impl BinanceDiscoverer {
    pub fn new(venue: Venue) -> Self {
        assert!(matches!(venue, Venue::BinanceSpot | Venue::BinanceFut));
        Self { venue }
    }

    #[allow(dead_code)]
    fn check(v: Venue) { assert!(matches!(v, Venue::BinanceSpot | Venue::BinanceFut)); }

    fn url(&self) -> &'static str {
        match self.venue {
            Venue::BinanceSpot => "https://api.binance.com/api/v3/exchangeInfo",
            Venue::BinanceFut  => "https://fapi.binance.com/fapi/v1/exchangeInfo",
            _ => unreachable!(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct ExchangeInfo {
    symbols: Vec<SymbolEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SymbolEntry {
    symbol:    String,
    status:    String,
    #[serde(default)]
    contract_type: Option<String>,
}

#[async_trait]
impl Discoverer for BinanceDiscoverer {
    fn venue(&self) -> Venue { self.venue }

    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>> {
        let resp = http.get(self.url())
            .send().await?
            .error_for_status()?
            .json::<ExchangeInfo>().await?;

        let mut out = Vec::with_capacity(resp.symbols.len());
        for s in resp.symbols {
            if s.status != "TRADING" { continue; }
            // Futures: keep only PERPETUAL contracts (exclude dated quarterly futures).
            if matches!(self.venue, Venue::BinanceFut) {
                match s.contract_type.as_deref() {
                    Some("PERPETUAL") => {}
                    _ => continue,
                }
            }
            let Some(canonical) = normalize::parse(self.venue, &s.symbol) else {
                // Unknown quote or malformed symbol — skip silently for DISCOVERY ONLY.
                // Silent skip here is acceptable because the exchange may list tokens
                // pegged to exotic quotes we don't track (e.g., ZAR, RUB). It is NOT
                // acceptable at the adapter layer (M5+) where silent drops = bugs.
                continue;
            };
            out.push(VenueSymbol {
                venue: self.venue,
                raw: s.symbol,
                canonical,
            });
        }
        if out.is_empty() {
            return Err(Error::Discovery(format!(
                "binance {}: 0 symbols returned (API change?)", self.venue.as_str()
            )));
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_per_venue() {
        assert_eq!(
            BinanceDiscoverer::new(Venue::BinanceSpot).url(),
            "https://api.binance.com/api/v3/exchangeInfo"
        );
        assert_eq!(
            BinanceDiscoverer::new(Venue::BinanceFut).url(),
            "https://fapi.binance.com/fapi/v1/exchangeInfo"
        );
    }

    #[test]
    #[should_panic]
    fn non_binance_venue_panics() {
        BinanceDiscoverer::check(Venue::MexcSpot);
    }
}
