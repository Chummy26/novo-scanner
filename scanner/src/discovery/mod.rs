//! Symbol discovery via REST at startup + periodic refresh.
//!
//! Each venue has a list endpoint that enumerates every listed pair. The
//! discovery layer calls them all concurrently, normalizes symbols to
//! CanonicalPair, and emits a `SymbolUniverse` describing which venues carry
//! each pair — callers build the cross-venue coverage set from this.

pub mod binance;
pub mod bingx;
pub mod bitget;
pub mod gate;
pub mod kucoin;
pub mod mexc;
pub mod orchestrator;
pub mod xt;

use ahash::AHashMap;
use ahash::AHashSet;

use crate::error::Result;
use crate::types::{CanonicalPair, SymbolId, Venue, VENUE_COUNT};

/// Per-venue raw symbol (as the exchange names it) plus its canonical form.
#[derive(Debug, Clone)]
pub struct VenueSymbol {
    pub venue:     Venue,
    pub raw:       String,
    pub canonical: CanonicalPair,
}

/// Built by the discovery layer: the full universe + per-venue mapping tables.
pub struct SymbolUniverse {
    /// CanonicalPair → SymbolId assigned at startup (stable until restart).
    pub by_canonical: AHashMap<CanonicalPair, SymbolId>,
    /// Reverse lookup.
    pub by_id:        Vec<CanonicalPair>,
    /// Per-venue map from raw venue string → SymbolId. Used by adapters at
    /// decode time.
    pub per_venue:    [AHashMap<String, SymbolId>; VENUE_COUNT],
    /// Per-venue bitset: does venue V carry SymbolId S?
    pub coverage:     Vec<[bool; VENUE_COUNT]>,
}

impl SymbolUniverse {
    pub fn empty() -> Self {
        Self {
            by_canonical: AHashMap::new(),
            by_id:        Vec::new(),
            per_venue:    std::array::from_fn(|_| AHashMap::new()),
            coverage:     Vec::new(),
        }
    }

    pub fn len(&self) -> usize { self.by_id.len() }
    pub fn is_empty(&self) -> bool { self.by_id.is_empty() }

    /// Build the universe from per-venue discovery results. Only pairs listed
    /// on ≥ 2 venues are assigned a SymbolId (the coverage requirement).
    pub fn from_venue_symbols(per_venue: Vec<Vec<VenueSymbol>>) -> Self {
        assert_eq!(per_venue.len(), VENUE_COUNT, "must pass one Vec per venue");

        // Count occurrences per canonical pair.
        let mut counts: AHashMap<CanonicalPair, AHashSet<Venue>> = AHashMap::new();
        for venue_list in &per_venue {
            for vs in venue_list {
                counts.entry(vs.canonical.clone()).or_default().insert(vs.venue);
            }
        }

        let mut by_canonical = AHashMap::new();
        let mut by_id:  Vec<CanonicalPair> = Vec::new();
        let mut coverage: Vec<[bool; VENUE_COUNT]> = Vec::new();

        for (canonical, venues) in counts.into_iter() {
            if venues.len() < 2 { continue; } // must be on ≥ 2 venues
            let id = SymbolId(by_id.len() as u32);
            by_canonical.insert(canonical.clone(), id);
            by_id.push(canonical);
            let mut row = [false; VENUE_COUNT];
            for v in venues { row[v.idx()] = true; }
            coverage.push(row);
        }

        let mut per_venue_maps: [AHashMap<String, SymbolId>; VENUE_COUNT] =
            std::array::from_fn(|_| AHashMap::new());

        for (vi, venue_list) in per_venue.into_iter().enumerate() {
            for vs in venue_list {
                if let Some(&id) = by_canonical.get(&vs.canonical) {
                    per_venue_maps[vi].insert(vs.raw, id);
                }
            }
        }

        Self {
            by_canonical,
            by_id,
            per_venue: per_venue_maps,
            coverage,
        }
    }

    /// For a given SymbolId, return the set of venues that carry it.
    pub fn venues_for(&self, id: SymbolId) -> Vec<Venue> {
        let row = &self.coverage[id.0 as usize];
        Venue::ALL.iter().copied().filter(|v| row[v.idx()]).collect()
    }

    /// Venue-native raw string → SymbolId (hot lookup from adapter).
    #[inline]
    pub fn lookup(&self, venue: Venue, raw: &str) -> Option<SymbolId> {
        self.per_venue[venue.idx()].get(raw).copied()
    }

    /// `SymbolId` → `CanonicalPair` (ex: BTC-USDT). Estável DENTRO de um run;
    /// **NÃO é estável entre runs** porque a atribuição de IDs depende da
    /// ordem de iteração de `AHashMap` e do universo de pairs descobertos
    /// (que muda com listings/delistings).
    ///
    /// Consequência crítica para persistência ML (ADR-029): qualquer stream
    /// JSONL **DEVE** persistir `symbol_name` canonical (via `.canonical()`)
    /// ao lado do `symbol_id`, senão dados de dias diferentes não são
    /// joinables retrospectivamente.
    #[inline]
    pub fn canonical_of(&self, id: SymbolId) -> Option<&CanonicalPair> {
        self.by_id.get(id.0 as usize)
    }

    /// Conveniência: nome canonical como `String` (ex: "BTC-USDT"). Retorna
    /// `String::new()` se SymbolId inválido — nunca panica. Persistência
    /// JSONL usa este método.
    #[inline]
    pub fn canonical_name_of(&self, id: SymbolId) -> String {
        self.canonical_of(id)
            .map(|c| c.canonical())
            .unwrap_or_default()
    }
}

/// Fetch symbols from one venue via its REST list endpoint. This trait lets
/// each adapter contribute a venue-specific implementation.
#[async_trait::async_trait]
pub trait Discoverer: Send + Sync {
    fn venue(&self) -> Venue;
    async fn fetch(&self, http: &reqwest::Client) -> Result<Vec<VenueSymbol>>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Market;

    fn vs(v: Venue, base: &str, quote: &str, mkt: Market) -> VenueSymbol {
        VenueSymbol {
            venue: v,
            raw:   format!("{}{}", base, quote),
            canonical: CanonicalPair::new(base, quote, mkt),
        }
    }

    #[test]
    fn universe_only_keeps_cross_listed_pairs() {
        let mut per_venue: Vec<Vec<VenueSymbol>> = (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        per_venue[Venue::BinanceSpot.idx()].push(vs(Venue::BinanceSpot, "BTC", "USDT", Market::Spot));
        per_venue[Venue::MexcSpot.idx()].push(vs(Venue::MexcSpot,       "BTC", "USDT", Market::Spot));
        // ETH only on Binance → must NOT be in universe.
        per_venue[Venue::BinanceSpot.idx()].push(vs(Venue::BinanceSpot, "ETH", "USDT", Market::Spot));

        let u = SymbolUniverse::from_venue_symbols(per_venue);
        assert_eq!(u.len(), 1);
        let id = u.by_canonical[&CanonicalPair::new("BTC", "USDT", Market::Spot)];
        let venues = u.venues_for(id);
        assert_eq!(venues.len(), 2);
        assert!(venues.contains(&Venue::BinanceSpot));
        assert!(venues.contains(&Venue::MexcSpot));
    }

    #[test]
    fn lookup_by_venue_raw() {
        let mut per_venue: Vec<Vec<VenueSymbol>> = (0..VENUE_COUNT).map(|_| Vec::new()).collect();
        per_venue[Venue::BinanceSpot.idx()].push(vs(Venue::BinanceSpot, "BTC", "USDT", Market::Spot));
        per_venue[Venue::MexcSpot.idx()].push(vs(Venue::MexcSpot,       "BTC", "USDT", Market::Spot));

        let u = SymbolUniverse::from_venue_symbols(per_venue);
        let id = u.lookup(Venue::BinanceSpot, "BTCUSDT").unwrap();
        assert_eq!(id.0, 0);
        assert!(u.lookup(Venue::BinanceSpot, "UNKNOWN").is_none());
    }
}
