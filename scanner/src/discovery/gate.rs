//! Gate.io Spot + Futures symbol discovery.
//!
//! Spot:    GET https://api.gateio.ws/api/v4/spot/currency_pairs
//! Futures: GET https://api.gateio.ws/api/v4/futures/usdt/contracts

use async_trait::async_trait;
use serde::Deserialize;

use crate::discovery::{Discoverer, VenueSymbol};
use crate::error::{Error, Result};
use crate::normalize;
use crate::types::Venue;

pub struct GateDiscoverer {
    pub venue: Venue,
}

impl GateDiscoverer {
    pub fn new(venue: Venue) -> Self {
        assert!(matches!(venue, Venue::GateSpot | Venue::GateFut));
        Self { venue }
    }

    fn url(&self) -> &'static str {
        match self.venue {
            Venue::GateSpot => "https://api.gateio.ws/api/v4/spot/currency_pairs",
            Venue::GateFut  => "https://api.gateio.ws/api/v4/futures/usdt/contracts",
            _ => unreachable!(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct SpotPair {
    id:             String,
    #[serde(default)]
    trade_status:   Option<String>,
}

#[derive(Debug, Deserialize)]
struct FuturesContract {
    name:       String,
    #[serde(default)]
    in_delisting: bool,
}

#[async_trait]
impl Discoverer for GateDiscoverer {
    fn venue(&self) -> Venue { self.venue }

    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>> {
        let url = self.url();
        let text = http.get(url).send().await?.error_for_status()?.text().await?;
        let mut out = Vec::new();

        match self.venue {
            Venue::GateSpot => {
                let pairs: Vec<SpotPair> = serde_json::from_str(&text)?;
                for p in pairs {
                    if let Some(status) = &p.trade_status {
                        if status != "tradable" { continue; }
                    }
                    if let Some(canonical) = normalize::parse(self.venue, &p.id) {
                        out.push(VenueSymbol { venue: self.venue, raw: p.id, canonical });
                    }
                }
            }
            Venue::GateFut => {
                let contracts: Vec<FuturesContract> = serde_json::from_str(&text)?;
                for c in contracts {
                    if c.in_delisting { continue; }
                    if let Some(canonical) = normalize::parse(self.venue, &c.name) {
                        out.push(VenueSymbol { venue: self.venue, raw: c.name, canonical });
                    }
                }
            }
            _ => unreachable!(),
        }

        if out.is_empty() {
            return Err(Error::Discovery(format!("gate {}: 0 symbols returned", self.venue)));
        }
        Ok(out)
    }
}
