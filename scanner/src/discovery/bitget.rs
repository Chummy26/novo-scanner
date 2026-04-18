//! Bitget symbol discovery (Spot + Futures — v2 API).

use async_trait::async_trait;
use serde::Deserialize;

use crate::discovery::{Discoverer, VenueSymbol};
use crate::error::{Error, Result};
use crate::normalize;
use crate::types::Venue;

pub struct BitgetDiscoverer {
    pub venue: Venue,
}

impl BitgetDiscoverer {
    pub fn new(venue: Venue) -> Self {
        assert!(matches!(venue, Venue::BitgetSpot | Venue::BitgetFut));
        Self { venue }
    }

    fn url(&self) -> &'static str {
        match self.venue {
            Venue::BitgetSpot => "https://api.bitget.com/api/v2/spot/public/symbols",
            // USDT-M perpetuals (UMCBL product type).
            Venue::BitgetFut  => "https://api.bitget.com/api/v2/mix/market/contracts?productType=usdt-futures",
            _ => unreachable!(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct Resp { data: Vec<Sym> }
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Sym {
    symbol: String,
    #[serde(default)]
    status: String, // "online" (spot) / "normal" (futures)
    #[serde(default)]
    symbol_status: String,
}

#[async_trait]
impl Discoverer for BitgetDiscoverer {
    fn venue(&self) -> Venue { self.venue }

    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>> {
        let r: Resp = http.get(self.url())
            .send().await?.error_for_status()?.json().await?;
        let mut out = Vec::new();
        for s in r.data {
            let st = if !s.status.is_empty() { &s.status } else { &s.symbol_status };
            let ok = st.is_empty()
                || st.eq_ignore_ascii_case("online")
                || st.eq_ignore_ascii_case("normal")
                || st.eq_ignore_ascii_case("listed");
            if !ok { continue; }
            if let Some(c) = normalize::parse(self.venue, &s.symbol) {
                out.push(VenueSymbol { venue: self.venue, raw: s.symbol, canonical: c });
            }
        }
        if out.is_empty() {
            return Err(Error::Discovery(format!("bitget {}: 0 symbols", self.venue)));
        }
        Ok(out)
    }
}
