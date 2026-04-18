//! Ticker normalization: map venue-specific symbol strings to a CanonicalPair.
//!
//! Rules derived from the protocol verification PhD brief (2026-04).
//! Each venue has its own separator convention plus aliases:
//!
//!   - KuCoin uses `XBT` for Bitcoin on futures → map to `BTC`.
//!   - Several assets rebranded over time; we collapse both names to the
//!     new canonical (e.g. `MATIC → POL`, `FTM → S`). Without these,
//!     venue A listing the old ticker and venue B listing the new one
//!     would look like two different assets and no cross-venue opp would
//!     ever be emitted.
//!   - `1000PEPE`, `1000BONK`, `1000FLOKI` etc. are DIFFERENT contracts
//!     (1000× price of the underlying), not aliases — we keep them distinct.
//!   - `WBTC`/`WETH` are wrapped variants with separate markets; kept distinct.

use crate::types::{CanonicalPair, Market, Venue};

/// Ordered list of known quote assets, longest-first so the splitter never
/// mis-classifies (e.g., "BNBUSDT" must not be split as BN/BUSDT).
/// Longest-first is critical for the no-separator format used by Binance/
/// MEXC/Bitget spot. USDT/USDC/USDE etc. must precede USD, BUSD precedes BNB.
pub const KNOWN_QUOTES: &[&str] = &[
    // 5 chars
    "FDUSD",
    // 4 chars (stablecoins before any base-asset-like 3-char)
    "USDT", "USDC", "USDE", "USDF", "USD1", "USDS", "BUSD", "TUSD", "USDD",
    // 3 chars — fiat first (to avoid conflict with e.g. TRY+X crypto bases)
    "DAI", "EUR", "TRY", "BRL", "GBP", "USD", "KRW", "JPY",
    // 3 chars — crypto quote-assets
    "BTC", "ETH", "BNB", "TRX", "SOL", "KCS",
    // 2 chars
    "XT",
];

/// Bases that indicate leveraged ETF tokens — they must NOT enter the universe
/// because their price is 3×/5× underlying, creating phantom spreads.
pub const LEVERAGED_SUFFIXES: &[&str] = &[
    "3L", "3S", "5L", "5S", "2L", "2S", "4L", "4S",
];

/// Bases that are CFD / equity / index proxies listed on MEXC / Gate futures.
/// Arbitrage between these and any crypto venue is nonsense.
pub const CFD_BLOCKLIST: &[&str] = &[
    // Commodities
    "SILVER", "GOLD", "PLATINUM", "PALLADIUM", "USOIL", "UKOIL",
    "NATGAS", "COPPER", "CORN", "WHEAT",
    // Equity / index CFDs
    "SPX500", "NAS100", "DJ30", "UK100", "GER40", "FRA40", "HK50",
    "TESLA", "TSLA", "TSLAX", "AAPL", "MSFT", "GOOG", "GOOGL", "AMZN",
    "META", "NVDA", "NFLX", "BABA", "BIDU", "INTC", "AMD", "JPM",
    "MSTR", "MSTRX", "COIN", "COINX", "MARA", "RIOT", "SPYX", "ESPORTS",
    "TSM", "UBER", "SQ", "PYPL", "DIS", "WMT",
    // Volatility / derived
    "EVIX", "VIX",
];

pub fn is_leveraged_token(base: &str) -> bool {
    LEVERAGED_SUFFIXES.iter().any(|s| base.ends_with(s))
        // extra safety: strip trailing digits before suffix check
        && base.chars().any(|c| c.is_ascii_alphabetic())
}

pub fn is_cfd_or_equity(base: &str) -> bool {
    CFD_BLOCKLIST.iter().any(|b| *b == base)
}

/// Parse a venue-native symbol into a CanonicalPair. Returns None on failure
/// (unknown format, unknown quote, etc.). Callers must treat a None as a
/// discovery bug, never as a silent skip (project mandate: silent coverage
/// gaps = bug).
pub fn parse(venue: Venue, raw: &str) -> Option<CanonicalPair> {
    let market = venue.market();
    match venue {
        Venue::BinanceSpot | Venue::BinanceFut
        | Venue::MexcSpot
        | Venue::BitgetSpot => split_no_separator(raw, market),

        Venue::BitgetFut => {
            // Bitget futures live symbols are `BTCUSDT_UMCBL` or bare `BTCUSDT`
            // depending on the product type. Strip any underscore-suffix then
            // use the no-separator splitter.
            let base = raw.split('_').next().unwrap_or(raw);
            split_no_separator(base, market)
        }

        Venue::MexcFut | Venue::GateSpot | Venue::GateFut | Venue::XtFut => {
            split_by(raw, '_', market).map(uppercase_pair)
        }

        Venue::BingxSpot | Venue::BingxFut => {
            split_by(raw, '-', market).map(uppercase_pair)
        }

        Venue::XtSpot => {
            // Lowercase + underscore (e.g., "btc_usdt")
            split_by(raw, '_', market).map(uppercase_pair)
        }

        Venue::KucoinSpot => {
            // "BTC-USDT"
            split_by(raw, '-', market).map(uppercase_pair).map(kucoin_alias)
        }

        Venue::KucoinFut => {
            // Classic USDT-linear futures: XBTUSDTM, ETHUSDTM.
            // The legacy `XBTUSDM` / `ETHUSDM` suffix WITHOUT a `T` are
            // USD-settled INVERSE perpetuals — their PnL is non-linear in
            // USDT terms and MUST NOT be paired against USDT-linear books
            // on other venues. We reject anything whose stripped form ends
            // in `USD` (not `USDT`).
            let stripped = raw.strip_suffix('M').unwrap_or(raw);
            if stripped.ends_with("USD") && !stripped.ends_with("USDT") && !stripped.ends_with("USDC") {
                // inverse contract — drop
                return None;
            }
            split_no_separator(stripped, market).map(kucoin_alias)
        }
    }.and_then(reject_unwanted)
}

fn split_no_separator(raw: &str, market: Market) -> Option<CanonicalPair> {
    let up = raw.to_ascii_uppercase();
    for &quote in KNOWN_QUOTES {
        if up.len() > quote.len() && up.ends_with(quote) {
            let base = &up[..up.len() - quote.len()];
            if !base.is_empty() {
                return Some(apply_global_aliases(CanonicalPair::new(base, quote, market)));
            }
        }
    }
    None
}

fn split_by(raw: &str, sep: char, market: Market) -> Option<CanonicalPair> {
    let mut it = raw.split(sep);
    let base  = it.next()?;
    let quote = it.next()?;
    if it.next().is_some() { return None; }
    if base.is_empty() || quote.is_empty() { return None; }
    Some(CanonicalPair::new(base, quote, market))
}

fn uppercase_pair(mut p: CanonicalPair) -> CanonicalPair {
    p.base  = p.base.to_ascii_uppercase();
    p.quote = p.quote.to_ascii_uppercase();
    apply_global_aliases(p)
}

/// KuCoin uses XBT as an alias for BTC in futures contracts.
fn kucoin_alias(mut p: CanonicalPair) -> CanonicalPair {
    if p.base == "XBT" {
        p.base = "BTC".into();
    }
    apply_global_aliases(p)
}

/// Canonical aliases applied to every venue. Only includes TRUE aliases —
/// same underlying asset with a different ticker. Does NOT include 1000×
/// wrappers (different contract), leveraged tokens, or wrapped assets
/// (WBTC/WETH/STETH trade at imperfect parity and must stay distinct).
///
/// Sources:
///   - MATIC → POL   Polygon rebrand completed 2024-09-04.
///   - FTM   → S     Fantom → Sonic rebrand effective 2024-08.
///   - BCHA  → XEC   Bitcoin Cash ABC rebranded to eCash (XEC) in 2021.
///   - MKR   → SKY   MakerDAO → Sky rebrand, Sept 2025.
///   - FET,AGIX,OCEAN → ASI   Fetch.ai + SingularityNET + Ocean Protocol
///                           merger into Artificial Superintelligence Alliance,
///                           July 2024.
///   - LUNA2 → LUNA  Some venues list the post-fork chain as LUNA2; canonical
///                   is LUNA. (LUNC remains its own asset — Terra Classic.)
const ALIASES: &[(&str, &str)] = &[
    ("MATIC", "POL"),
    ("FTM",   "S"),
    ("BCHA",  "XEC"),
    ("MKR",   "SKY"),
    ("AGIX",  "ASI"),
    ("OCEAN", "ASI"),
    ("FET",   "ASI"),
    ("LUNA2", "LUNA"),
];

fn apply_global_aliases(mut p: CanonicalPair) -> CanonicalPair {
    for (old, new) in ALIASES {
        if p.base == *old { p.base = (*new).to_string(); }
    }
    p
}

/// Final guard applied inside every venue splitter: drops leveraged tokens
/// and CFD/equity proxies so they never enter the universe.
fn reject_unwanted(p: CanonicalPair) -> Option<CanonicalPair> {
    if is_leveraged_token(&p.base) { return None; }
    if is_cfd_or_equity(&p.base) { return None; }
    Some(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binance_spot_no_separator() {
        let p = parse(Venue::BinanceSpot, "BTCUSDT").unwrap();
        assert_eq!(p.base, "BTC");
        assert_eq!(p.quote, "USDT");
    }

    #[test]
    fn binance_spot_longest_quote_match() {
        let p = parse(Venue::BinanceSpot, "BNBUSDT").unwrap();
        assert_eq!(p.base, "BNB");
        assert_eq!(p.quote, "USDT");
    }

    #[test]
    fn mexc_spot_fdusd() {
        let p = parse(Venue::MexcSpot, "BTCFDUSD").unwrap();
        assert_eq!(p.base, "BTC");
        assert_eq!(p.quote, "FDUSD");
    }

    #[test]
    fn mexc_futures_underscore() {
        let p = parse(Venue::MexcFut, "BTC_USDT").unwrap();
        assert_eq!(p.base, "BTC");
        assert_eq!(p.quote, "USDT");
    }

    #[test]
    fn bingx_hyphen() {
        let p = parse(Venue::BingxSpot, "BTC-USDT").unwrap();
        assert_eq!(p.base, "BTC");
        assert_eq!(p.quote, "USDT");
    }

    #[test]
    fn xt_spot_lowercase() {
        let p = parse(Venue::XtSpot, "btc_usdt").unwrap();
        assert_eq!(p.base, "BTC");
        assert_eq!(p.quote, "USDT");
    }

    #[test]
    fn kucoin_spot_xbt_alias() {
        let p = parse(Venue::KucoinSpot, "XBT-USDT").unwrap();
        assert_eq!(p.base, "BTC");
    }

    #[test]
    fn kucoin_fut_xbtusdtm() {
        let p = parse(Venue::KucoinFut, "XBTUSDTM").unwrap();
        assert_eq!(p.base, "BTC");
        assert_eq!(p.quote, "USDT");
    }

    #[test]
    fn kucoin_fut_inverse_rejected() {
        assert!(parse(Venue::KucoinFut, "XBTUSDM").is_none(),
                "inverse USD-settled perpetual must be dropped");
        assert!(parse(Venue::KucoinFut, "ETHUSDM").is_none());
    }

    #[test]
    fn new_aliases_applied() {
        assert_eq!(parse(Venue::BinanceSpot, "MKRUSDT").unwrap().base, "SKY");
        assert_eq!(parse(Venue::BinanceSpot, "AGIXUSDT").unwrap().base, "ASI");
        assert_eq!(parse(Venue::BinanceSpot, "FETUSDT").unwrap().base, "ASI");
        assert_eq!(parse(Venue::MexcFut, "LUNA2_USDT").unwrap().base, "LUNA");
    }

    #[test]
    fn new_quotes_supported() {
        assert_eq!(parse(Venue::BinanceSpot, "BTCTRY").unwrap().quote, "TRY");
        assert_eq!(parse(Venue::BinanceSpot, "BTCGBP").unwrap().quote, "GBP");
        assert_eq!(parse(Venue::BinanceSpot, "USDTBRL").unwrap().quote, "BRL");
        assert_eq!(parse(Venue::KucoinSpot, "WIN-TRX").unwrap().quote, "TRX");
        assert_eq!(parse(Venue::MexcSpot,   "AAVEUSD1").unwrap().quote, "USD1");
        assert_eq!(parse(Venue::BitgetSpot, "BTCUSDE").unwrap().quote, "USDE");
    }

    #[test]
    fn leveraged_tokens_rejected() {
        assert!(parse(Venue::GateSpot, "ETH3L_USDT").is_none());
        assert!(parse(Venue::GateSpot, "BTC3S_USDT").is_none());
        assert!(parse(Venue::GateSpot, "WIF5S_USDT").is_none());
    }

    #[test]
    fn cfd_equity_rejected() {
        assert!(parse(Venue::MexcFut, "TESLA_USDT").is_none());
        assert!(parse(Venue::MexcFut, "SPX500_USDT").is_none());
        assert!(parse(Venue::GateFut, "BABA_USDT").is_none());
        assert!(parse(Venue::GateFut, "EVIX_USDT").is_none());
    }

    #[test]
    fn longest_quote_first_disambiguation() {
        // BNBUSDT must go to BNB/USDT, not BN/BUSDT and not to a weird short-match.
        let p = parse(Venue::BinanceSpot, "BNBUSDT").unwrap();
        assert_eq!(p.base, "BNB"); assert_eq!(p.quote, "USDT");
        // BUSDUSDT: base=BUSD quote=USDT.
        let p = parse(Venue::BinanceSpot, "BUSDUSDT").unwrap();
        assert_eq!(p.base, "BUSD"); assert_eq!(p.quote, "USDT");
    }

    #[test]
    fn unknown_quote_returns_none() {
        assert!(parse(Venue::BinanceSpot, "BTCFOOBAR").is_none());
    }

    #[test]
    fn empty_returns_none() {
        assert!(parse(Venue::BinanceSpot, "").is_none());
        assert!(parse(Venue::MexcFut, "_USDT").is_none());
        assert!(parse(Venue::BingxSpot, "-USDT").is_none());
    }

    #[test]
    fn market_doesnt_affect_canonical() {
        // Post-refactor: Market is ignored in CanonicalPair equality.
        let a = parse(Venue::BinanceSpot, "BTCUSDT").unwrap();
        let b = parse(Venue::BinanceFut,  "BTCUSDT").unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn triple_segment_rejected() {
        assert!(parse(Venue::BingxSpot, "BTC-USDT-X").is_none());
    }
}
