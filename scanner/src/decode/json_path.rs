//! sonic-rs wrapper for zero-copy field extraction on the hot path.
//!
//! Pattern: `get_unchecked(input, path)` returns a `LazyValue<'a>` borrowing
//! from the input buffer. Callers pull scalars via `.as_str()` / `.as_f64()` /
//! `.as_u64()`. No `sonic_rs::Value` allocation.
//!
//! This module intentionally stays thin — most code will call sonic_rs
//! directly with known field paths. We keep a couple of helpers here for
//! parsing level arrays (bid/ask sides).

use sonic_rs::{JsonContainerTrait, JsonValueTrait};

use crate::error::{Error, Result};
use crate::types::{Price, Qty};

/// Parse a `[["px","qty"], …]` array into (Price, Qty) pairs via a callback.
/// Accepts both ["str","str"] and ["num","num"] encodings (venues differ).
pub fn for_each_level<F>(raw_array: &str, mut f: F) -> Result<usize>
where
    F: FnMut(Price, Qty),
{
    let val: sonic_rs::Value = sonic_rs::from_str(raw_array)
        .map_err(|e| Error::Decode(format!("level array parse: {}", e)))?;

    let arr = val.as_array().ok_or_else(|| {
        Error::Decode("expected array".to_string())
    })?;

    let mut count = 0usize;
    for lvl in arr {
        let pair = lvl.as_array().ok_or_else(|| {
            Error::Decode("level entry not an array".into())
        })?;
        if pair.len() < 2 {
            return Err(Error::Decode("level entry missing px/qty".into()));
        }
        let px  = parse_num_or_str(pair.get(0).unwrap())?;
        let qty = parse_num_or_str(pair.get(1).unwrap())?;
        f(Price::from_f64(px), Qty::from_f64(qty));
        count += 1;
    }
    Ok(count)
}

fn parse_num_or_str(v: &sonic_rs::Value) -> Result<f64> {
    if let Some(s) = v.as_str() {
        s.parse::<f64>()
            .map_err(|e| Error::Decode(format!("parse '{}' as f64: {}", s, e)))
    } else if let Some(f) = v.as_f64() {
        Ok(f)
    } else if let Some(u) = v.as_u64() {
        Ok(u as f64)
    } else if let Some(i) = v.as_i64() {
        Ok(i as f64)
    } else {
        Err(Error::Decode(format!("non-numeric: {:?}", v)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_string_levels() {
        let raw = r#"[["100.50","1.25"],["101.00","0.50"]]"#;
        let mut levels = Vec::new();
        let n = for_each_level(raw, |p, q| levels.push((p, q))).unwrap();
        assert_eq!(n, 2);
        assert_eq!(levels[0].0, Price::from_f64(100.50));
        assert_eq!(levels[0].1, Qty::from_f64(1.25));
        assert_eq!(levels[1].0, Price::from_f64(101.00));
    }

    #[test]
    fn parse_number_levels() {
        let raw = r#"[[100.5,1.25],[101.0,0.5]]"#;
        let mut count = 0;
        for_each_level(raw, |_p, _q| count += 1).unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn rejects_non_array() {
        let raw = r#"{"not":"array"}"#;
        let res: Result<_> = for_each_level(raw, |_, _| {});
        assert!(res.is_err());
    }

    #[test]
    fn rejects_short_level() {
        let raw = r#"[["100.50"]]"#;
        let res: Result<_> = for_each_level(raw, |_, _| {});
        assert!(res.is_err());
    }
}
