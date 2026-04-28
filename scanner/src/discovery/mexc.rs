//! MEXC Spot + Futures symbol discovery.
//!
//! Spot:    GET https://api.mexc.com/api/v3/exchangeInfo  (Binance-compatible shape)
//! Futures: GET https://contract.mexc.com/api/v1/contract/detail

use async_trait::async_trait;
use serde::Deserialize;

use crate::discovery::{Discoverer, VenueSymbol};
use crate::error::{Error, Result};
use crate::normalize;
use crate::types::Venue;

pub struct MexcDiscoverer {
    pub venue: Venue,
}

impl MexcDiscoverer {
    pub fn new(venue: Venue) -> Self {
        assert!(matches!(venue, Venue::MexcSpot | Venue::MexcFut));
        Self { venue }
    }

    fn url(&self) -> &'static str {
        match self.venue {
            Venue::MexcSpot => "https://api.mexc.com/api/v3/exchangeInfo",
            Venue::MexcFut => "https://contract.mexc.com/api/v1/contract/detail",
            _ => unreachable!(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct SpotExchangeInfo {
    symbols: Vec<SpotSymbol>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotSymbol {
    symbol: String,
    #[serde(default)]
    status: String,
}

#[derive(Debug, Deserialize)]
struct FutResp {
    data: Vec<FutContract>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FutContract {
    symbol: String,
    #[serde(default)]
    state: i32, // 0 = enabled typically
}

#[async_trait]
impl Discoverer for MexcDiscoverer {
    fn venue(&self) -> Venue {
        self.venue
    }

    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>> {
        let mut out = Vec::new();
        match self.venue {
            Venue::MexcSpot => {
                let resp: SpotExchangeInfo = http
                    .get(self.url())
                    .send()
                    .await?
                    .error_for_status()?
                    .json()
                    .await?;
                for s in resp.symbols {
                    if s.status != "1"
                        && s.status.to_ascii_uppercase() != "ENABLED"
                        && !s.status.is_empty()
                    {
                        // MEXC uses "1" for enabled in some versions; be lenient.
                        if !matches!(s.status.as_str(), "1" | "ENABLED" | "TRADING") {
                            continue;
                        }
                    }
                    if let Some(canonical) = normalize::parse(self.venue, &s.symbol) {
                        out.push(VenueSymbol {
                            venue: self.venue,
                            raw: s.symbol,
                            canonical,
                        });
                    }
                }
            }
            Venue::MexcFut => {
                let resp: FutResp = http
                    .get(self.url())
                    .send()
                    .await?
                    .error_for_status()?
                    .json()
                    .await?;
                for c in resp.data {
                    if c.state != 0 {
                        continue;
                    }
                    if let Some(canonical) = normalize::parse(self.venue, &c.symbol) {
                        out.push(VenueSymbol {
                            venue: self.venue,
                            raw: c.symbol,
                            canonical,
                        });
                    }
                }
            }
            _ => unreachable!(),
        }
        if out.is_empty() {
            return Err(Error::Discovery(format!("mexc {}: 0 symbols", self.venue)));
        }
        Ok(out)
    }
}
