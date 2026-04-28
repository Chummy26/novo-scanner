//! Função única de `sample_id` compartilhada por RawSample, AcceptedSample
//! e LabeledTrade (correção PhD Q5).
//!
//! Hash **determinístico entre runs**: FNV-1a 128-bit. Zero dependências
//! novas e saída estável (o mesmo tuple produz o mesmo hex em qualquer
//! processo). Essencial para joins cross-schema no trainer Python.
//!
//! # Composição do tuple
//!
//! `(ts_ns, cycle_seq, symbol_name, buy_venue_str, buy_market_str,
//!   sell_venue_str, sell_market_str)`
//!
//! Não inclui `symbol_id` — esse é volátil entre runs (ADR-029). Usa
//! `symbol_name` canonical (ex. "BTC-USDT") que é estável.
//!
//! # Formato de saída
//!
//! Hex lowercase de 32 chars (u128). Colisão fica desprezível mesmo em
//! janelas multi-dia com centenas de milhões de linhas.
//!
//! # Por que FNV-1a e não ahash/xxhash
//!
//! - `ahash`: intencionalmente aleatório por-processo (proteção HashDoS).
//!   Quebraria joins cross-run.
//! - `xxhash-rust`: determinístico e mais rápido, mas adicionaria nova dep.
//!   FNV-1a 128 puro-Rust ≈ 20 linhas, suficiente para 1 hash por sample.

use crate::types::{Market, Venue};

const FNV_OFFSET_128: u128 = 0x6c62272e07bb014262b821756295c58d;
const FNV_PRIME_128: u128 = 0x0000000001000000000000000000013b;

#[inline]
fn fnv1a_update(state: &mut u128, bytes: &[u8]) {
    for &b in bytes {
        *state ^= b as u128;
        *state = state.wrapping_mul(FNV_PRIME_128);
    }
}

/// Computa `sample_id` hex de 32 chars para a tupla canonical.
///
/// Inclui todos os campos que identificam unicamente um snapshot de
/// oportunidade no scanner. `ts_ns + cycle_seq` diferencia ciclos; a
/// quíntupla de rota + símbolo diferencia rotas.
#[inline]
pub fn sample_id_of(
    ts_ns: u64,
    cycle_seq: u32,
    symbol_name: &str,
    buy_venue: Venue,
    sell_venue: Venue,
) -> String {
    let mut h = FNV_OFFSET_128;
    fnv1a_update(&mut h, &ts_ns.to_le_bytes());
    fnv1a_update(&mut h, &cycle_seq.to_le_bytes());
    fnv1a_update(&mut h, symbol_name.as_bytes());
    fnv1a_update(&mut h, b"|");
    fnv1a_update(&mut h, buy_venue.as_str().as_bytes());
    fnv1a_update(&mut h, b":");
    fnv1a_update(&mut h, market_str(buy_venue.market()).as_bytes());
    fnv1a_update(&mut h, b"->");
    fnv1a_update(&mut h, sell_venue.as_str().as_bytes());
    fnv1a_update(&mut h, b":");
    fnv1a_update(&mut h, market_str(sell_venue.market()).as_bytes());
    format!("{:032x}", h)
}

#[inline]
fn market_str(m: Market) -> &'static str {
    m.as_str()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Venue;

    #[test]
    fn sample_id_is_hex32_lowercase() {
        let id = sample_id_of(
            1_700_000_000_000_000_000,
            42,
            "BTC-USDT",
            Venue::MexcFut,
            Venue::BingxFut,
        );
        assert_eq!(id.len(), 32);
        assert!(id
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
    }

    #[test]
    fn sample_id_stable_across_calls() {
        let a = sample_id_of(100, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        let b = sample_id_of(100, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        assert_eq!(a, b);
    }

    #[test]
    fn sample_id_differs_on_ts_or_cycle() {
        let a = sample_id_of(100, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        let b = sample_id_of(101, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        let c = sample_id_of(100, 2, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        assert_ne!(a, b);
        assert_ne!(a, c);
    }

    #[test]
    fn sample_id_differs_on_symbol() {
        let a = sample_id_of(100, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        let b = sample_id_of(100, 1, "ETH-USDT", Venue::MexcFut, Venue::BingxFut);
        assert_ne!(a, b);
    }

    #[test]
    fn sample_id_differs_on_route_direction() {
        // A→B != B→A
        let a = sample_id_of(100, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        let b = sample_id_of(100, 1, "BTC-USDT", Venue::BingxFut, Venue::MexcFut);
        assert_ne!(a, b);
    }

    #[test]
    fn sample_id_differs_on_market() {
        // Mesmos nomes venue curtos, mas spot vs fut.
        // MexcSpot e MexcFut têm as_str() == "mexc" mas market() distinto.
        let a = sample_id_of(100, 1, "BTC-USDT", Venue::MexcSpot, Venue::BingxFut);
        let b = sample_id_of(100, 1, "BTC-USDT", Venue::MexcFut, Venue::BingxFut);
        assert_ne!(a, b, "spot e fut da mesma venue devem gerar ids distintos");
    }
}
