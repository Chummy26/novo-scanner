//! KuCoin Spot + Futures symbol discovery.
//!
//! Spot    — GET https://api.kucoin.com/api/v2/symbols
//! Futures — GET https://api-futures.kucoin.com/api/v1/contracts/active

use async_trait::async_trait;
use serde::Deserialize;

use crate::discovery::{Discoverer, VenueSymbol};
use crate::error::{Error, Result};
use crate::normalize;
use crate::types::Venue;

pub struct KucoinDiscoverer {
    pub venue: Venue,
}

impl KucoinDiscoverer {
    pub fn new(venue: Venue) -> Self {
        assert!(matches!(venue, Venue::KucoinSpot | Venue::KucoinFut));
        Self { venue }
    }

    fn url(&self) -> &'static str {
        match self.venue {
            Venue::KucoinSpot => "https://api.kucoin.com/api/v2/symbols",
            Venue::KucoinFut => "https://api-futures.kucoin.com/api/v1/contracts/active",
            _ => unreachable!(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct SpotResp {
    data: Vec<SpotSym>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotSym {
    symbol: String,
    #[serde(default)]
    enable_trading: bool,
}

#[derive(Debug, Deserialize)]
struct FutResp {
    data: Vec<FutContract>,
}
#[derive(Debug, Deserialize)]
struct FutContract {
    symbol: String,
    #[serde(default)]
    status: String, // "Open" when tradable
}

#[async_trait]
impl Discoverer for KucoinDiscoverer {
    fn venue(&self) -> Venue {
        self.venue
    }

    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>> {
        let mut out = Vec::new();
        match self.venue {
            Venue::KucoinSpot => {
                let r: SpotResp = http
                    .get(self.url())
                    .send()
                    .await?
                    .error_for_status()?
                    .json()
                    .await?;
                for s in r.data {
                    if !s.enable_trading {
                        continue;
                    }
                    if let Some(c) = normalize::parse(self.venue, &s.symbol) {
                        out.push(VenueSymbol {
                            venue: self.venue,
                            raw: s.symbol,
                            canonical: c,
                        });
                    }
                }
            }
            Venue::KucoinFut => {
                let r: FutResp = http
                    .get(self.url())
                    .send()
                    .await?
                    .error_for_status()?
                    .json()
                    .await?;
                for c in r.data {
                    let ok = c.status.is_empty() || c.status.eq_ignore_ascii_case("open");
                    if !ok {
                        continue;
                    }
                    if let Some(can) = normalize::parse(self.venue, &c.symbol) {
                        out.push(VenueSymbol {
                            venue: self.venue,
                            raw: c.symbol,
                            canonical: can,
                        });
                    }
                }
            }
            _ => unreachable!(),
        }
        if out.is_empty() {
            return Err(Error::Discovery(format!(
                "kucoin {}: 0 symbols",
                self.venue
            )));
        }
        Ok(out)
    }
}
