use std::fmt;
use std::sync::atomic::AtomicU64;

pub const FIXED_POINT_SCALE: u64 = 100_000_000;
pub const FIXED_POINT_SCALE_F64: f64 = 100_000_000.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(transparent)]
pub struct Price(pub u64);

impl Price {
    #[inline(always)]
    pub fn from_f64(v: f64) -> Self {
        Price((v * FIXED_POINT_SCALE_F64).round() as u64)
    }

    #[inline(always)]
    pub fn to_f64(self) -> f64 {
        self.0 as f64 / FIXED_POINT_SCALE_F64
    }

    #[inline(always)]
    pub fn is_zero(self) -> bool {
        self.0 == 0
    }
}

impl fmt::Display for Price {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.8}", self.to_f64())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(transparent)]
pub struct Qty(pub u64);

impl Qty {
    #[inline(always)]
    pub fn from_f64(v: f64) -> Self {
        Qty((v * FIXED_POINT_SCALE_F64).round() as u64)
    }

    #[inline(always)]
    pub fn to_f64(self) -> f64 {
        self.0 as f64 / FIXED_POINT_SCALE_F64
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(transparent)]
pub struct SymbolId(pub u32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(u8)]
pub enum Market {
    Spot = 0,
    Perp = 1,
}

impl Market {
    #[inline(always)]
    pub fn as_str(self) -> &'static str {
        match self {
            Market::Spot => "SPOT",
            Market::Perp => "FUTURES",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(u8)]
pub enum Venue {
    BinanceSpot    = 0,
    BinanceFut     = 1,
    MexcSpot       = 2,
    MexcFut        = 3,
    BingxSpot      = 4,
    BingxFut       = 5,
    GateSpot       = 6,
    GateFut        = 7,
    KucoinSpot     = 8,
    KucoinFut      = 9,
    XtSpot         = 10,
    XtFut          = 11,
    BitgetSpot     = 12,
    BitgetFut      = 13,
}

pub const VENUE_COUNT: usize = 14;

impl Venue {
    pub const ALL: [Venue; VENUE_COUNT] = [
        Venue::BinanceSpot, Venue::BinanceFut,
        Venue::MexcSpot, Venue::MexcFut,
        Venue::BingxSpot, Venue::BingxFut,
        Venue::GateSpot, Venue::GateFut,
        Venue::KucoinSpot, Venue::KucoinFut,
        Venue::XtSpot, Venue::XtFut,
        Venue::BitgetSpot, Venue::BitgetFut,
    ];

    #[inline(always)]
    pub fn idx(self) -> usize {
        self as u8 as usize
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Venue::BinanceSpot => "binance",
            Venue::BinanceFut  => "binance",
            Venue::MexcSpot    => "mexc",
            Venue::MexcFut     => "mexc",
            Venue::BingxSpot   => "bingx",
            Venue::BingxFut    => "bingx",
            Venue::GateSpot    => "gate",
            Venue::GateFut     => "gate",
            Venue::KucoinSpot  => "kucoin",
            Venue::KucoinFut   => "kucoin",
            Venue::XtSpot      => "xt",
            Venue::XtFut       => "xt",
            Venue::BitgetSpot  => "bitget",
            Venue::BitgetFut   => "bitget",
        }
    }

    #[inline(always)]
    pub fn market(self) -> Market {
        match self {
            Venue::BinanceSpot | Venue::MexcSpot | Venue::BingxSpot
            | Venue::GateSpot | Venue::XtSpot | Venue::KucoinSpot | Venue::BitgetSpot => Market::Spot,
            Venue::BinanceFut | Venue::MexcFut | Venue::BingxFut
            | Venue::GateFut  | Venue::XtFut | Venue::KucoinFut | Venue::BitgetFut => Market::Perp,
        }
    }

    /// Limite superior para `book_age` (ms) considerado "fresco" para a venue.
    ///
    /// Cada venue tem cadência típica de updates WS distinta; um threshold
    /// universal de 200 ms (primeiro design) rejeitava ~93% dos snapshots
    /// longtail porque MEXC/BingX/XT fazem book update em ~500ms–2s por design.
    /// Valores abaixo são heurísticos da microestrutura empírica (D2 §5.6)
    /// e do comportamento observado em 15 min de dev-mode do scanner em
    /// `docs/ml/06_labels_and_data/DATASET_ACTION_PLAN.md` §1.
    ///
    /// Trade-off: valores muito baixos rejeitam dados legítimos (C3 gap);
    /// muito altos admitem staleness real. Revisar empiricamente após 30 dias
    /// de coleta real com métricas `ml_sample_decisions_total{reason=stale}`
    /// decomposto por venue.
    #[inline(always)]
    pub fn max_book_age_ms(self) -> u32 {
        match self {
            // Top-5 — book updates frequentes, baseline 100ms é adequado.
            Venue::BinanceSpot | Venue::BinanceFut => 100,
            // Kucoin, Bitget, Gate — updates regulares; 500ms cobre.
            Venue::KucoinSpot | Venue::KucoinFut
            | Venue::BitgetSpot | Venue::BitgetFut => 500,
            Venue::GateSpot | Venue::GateFut => 1000,
            // MEXC — WS spot via REST polling ~1s; fut ~500ms.
            Venue::MexcSpot => 1500,
            Venue::MexcFut => 500,
            // BingX, XT — cadência lenta observada D2; 2s cobre folgadamente.
            Venue::BingxSpot | Venue::BingxFut
            | Venue::XtSpot | Venue::XtFut => 2000,
        }
    }
}

impl fmt::Display for Venue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.as_str(), self.market().as_str())
    }
}

/// Canonical asset pair (e.g., `BTC-USDT`).
///
/// We deliberately do NOT include market (Spot/Perp) in the canonical: a
/// cross-exchange, cross-market opportunity (e.g. buy on Binance SPOT, sell
/// on MEXC PERP) is only detectable if the SAME logical asset is represented
/// by the SAME `SymbolId`. Market comes from the `Venue` side of each leg.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CanonicalPair {
    pub base:   String,
    pub quote:  String,
}

impl CanonicalPair {
    pub fn new(base: impl Into<String>, quote: impl Into<String>, _market: Market) -> Self {
        Self::of(base, quote)
    }

    pub fn of(base: impl Into<String>, quote: impl Into<String>) -> Self {
        let base  = base.into().to_ascii_uppercase();
        let quote = quote.into().to_ascii_uppercase();
        Self { base, quote }
    }

    pub fn canonical(&self) -> String {
        format!("{}-{}", self.base, self.quote)
    }
}

impl fmt::Display for CanonicalPair {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.canonical())
    }
}

#[inline(always)]
pub fn now_ns() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0)
}

#[inline(always)]
pub fn now_ns_atomic(a: &AtomicU64) {
    a.store(now_ns(), std::sync::atomic::Ordering::Relaxed);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_roundtrip() {
        let p = Price::from_f64(43567.12345678);
        let back = p.to_f64();
        assert!((back - 43567.12345678).abs() < 1e-8);
    }

    #[test]
    fn venue_all_len_matches_count() {
        assert_eq!(Venue::ALL.len(), VENUE_COUNT);
    }

    #[test]
    fn venue_idx_stable() {
        for (i, v) in Venue::ALL.iter().enumerate() {
            assert_eq!(v.idx(), i, "venue idx mismatch for {:?}", v);
        }
    }

    #[test]
    fn canonical_uppercased() {
        let p = CanonicalPair::new("btc", "usdt", Market::Spot);
        assert_eq!(p.canonical(), "BTC-USDT");
    }

    #[test]
    fn spot_and_perp_same_canonical() {
        let a = CanonicalPair::new("BTC", "USDT", Market::Spot);
        let b = CanonicalPair::new("BTC", "USDT", Market::Perp);
        assert_eq!(a, b, "spot and perp of same base/quote must share SymbolId");
    }
}
