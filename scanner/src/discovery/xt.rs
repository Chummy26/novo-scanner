//! XT Spot + Futures symbol discovery.

use async_trait::async_trait;
use serde::Deserialize;

use crate::discovery::{Discoverer, VenueSymbol};
use crate::error::{Error, Result};
use crate::normalize;
use crate::types::Venue;

pub struct XtDiscoverer {
    pub venue: Venue,
}

impl XtDiscoverer {
    pub fn new(venue: Venue) -> Self {
        assert!(matches!(venue, Venue::XtSpot | Venue::XtFut));
        Self { venue }
    }
    fn url(&self) -> &'static str {
        match self.venue {
            Venue::XtSpot => "https://sapi.xt.com/v4/public/symbol",
            Venue::XtFut => "https://fapi.xt.com/future/market/v1/public/symbol/list",
            _ => unreachable!(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct SpotResp {
    result: SpotResult,
}
#[derive(Debug, Deserialize)]
struct SpotResult {
    symbols: Vec<SpotSym>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotSym {
    symbol: String,
    #[serde(default)]
    state: String, // e.g., "ONLINE"
}

#[derive(Debug, Deserialize)]
struct FutResp {
    result: Vec<FutSym>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FutSym {
    symbol: String,
    #[serde(default)]
    state: i32, // 1 = trading on many XT futures endpoints
}

#[async_trait]
impl Discoverer for XtDiscoverer {
    fn venue(&self) -> Venue {
        self.venue
    }

    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>> {
        let mut out = Vec::new();
        match self.venue {
            Venue::XtSpot => {
                let r: SpotResp = http
                    .get(self.url())
                    .send()
                    .await?
                    .error_for_status()?
                    .json()
                    .await?;
                for s in r.result.symbols {
                    if !s.state.is_empty() && s.state.to_uppercase() != "ONLINE" {
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
            Venue::XtFut => {
                let r: FutResp = http
                    .get(self.url())
                    .send()
                    .await?
                    .error_for_status()?
                    .json()
                    .await?;
                for s in r.result {
                    if s.state != 1 && s.state != 0 {
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
            _ => unreachable!(),
        }
        if out.is_empty() {
            return Err(Error::Discovery(format!("xt {}: 0 symbols", self.venue)));
        }
        Ok(out)
    }
}
