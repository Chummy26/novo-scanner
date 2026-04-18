//! BingX Spot + Futures symbol discovery.

use async_trait::async_trait;
use serde::Deserialize;

use crate::discovery::{Discoverer, VenueSymbol};
use crate::error::{Error, Result};
use crate::normalize;
use crate::types::Venue;

pub struct BingxDiscoverer {
    pub venue: Venue,
}

impl BingxDiscoverer {
    pub fn new(venue: Venue) -> Self {
        assert!(matches!(venue, Venue::BingxSpot | Venue::BingxFut));
        Self { venue }
    }
    fn url(&self) -> &'static str {
        match self.venue {
            Venue::BingxSpot => "https://open-api.bingx.com/openApi/spot/v1/common/symbols",
            Venue::BingxFut  => "https://open-api.bingx.com/openApi/swap/v2/quote/contracts",
            _ => unreachable!(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct SpotResp   { data: SpotData }
#[derive(Debug, Deserialize)]
struct SpotData   { symbols: Vec<SpotSym> }
#[derive(Debug, Deserialize)]
struct SpotSym    { symbol: String, #[serde(default)] status: i32 }

#[derive(Debug, Deserialize)]
struct FutResp    { data: Vec<FutContract> }
#[derive(Debug, Deserialize)]
struct FutContract {
    symbol: String,
    #[serde(default)]
    status: i32, // 1 = enabled
}

#[async_trait]
impl Discoverer for BingxDiscoverer {
    fn venue(&self) -> Venue { self.venue }

    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>> {
        let mut out = Vec::new();
        match self.venue {
            Venue::BingxSpot => {
                let r: SpotResp = http.get(self.url())
                    .send().await?.error_for_status()?.json().await?;
                for s in r.data.symbols {
                    if s.status != 1 { continue; }
                    if let Some(c) = normalize::parse(self.venue, &s.symbol) {
                        out.push(VenueSymbol { venue: self.venue, raw: s.symbol, canonical: c });
                    }
                }
            }
            Venue::BingxFut => {
                let r: FutResp = http.get(self.url())
                    .send().await?.error_for_status()?.json().await?;
                for c in r.data {
                    if c.status != 1 { continue; }
                    if let Some(can) = normalize::parse(self.venue, &c.symbol) {
                        out.push(VenueSymbol { venue: self.venue, raw: c.symbol, canonical: can });
                    }
                }
            }
            _ => unreachable!(),
        }
        if out.is_empty() {
            return Err(Error::Discovery(format!("bingx {}: 0 symbols", self.venue)));
        }
        Ok(out)
    }
}
