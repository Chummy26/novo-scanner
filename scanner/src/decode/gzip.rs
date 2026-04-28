//! GZIP decoder with reusable context (libdeflater).
//!
//! Used for MEXC futures (optional, disable with `"gzip":false`), BingX
//! spot + futures (always on), and as a component of the XT spot GZIP+Base64
//! application-level pipeline (D-14).
//!
//! Key invariant: one Decompressor per connection, output buffer pre-allocated,
//! no heap allocation per frame.

use crate::error::{Error, Result};
use libdeflater::{DecompressionError, Decompressor};

pub struct GzipDecoder {
    decomp: Decompressor,
    /// Reusable output buffer; grown only if a frame exceeds current capacity.
    out: Vec<u8>,
}

impl GzipDecoder {
    pub fn new(initial_capacity: usize) -> Self {
        Self {
            decomp: Decompressor::new(),
            out: Vec::with_capacity(initial_capacity),
        }
    }

    /// Decompress a GZIP-framed payload into the internal buffer. Returns a
    /// slice borrowing from `self.out`. The slice is invalidated on the next
    /// call to `decode`.
    ///
    /// If the output buffer is too small, it's grown up to `max_expand` bytes.
    /// Frames larger than that fail with `Error::Decode` (protection against
    /// decompression bombs).
    pub fn decode(&mut self, input: &[u8], max_expand: usize) -> Result<&[u8]> {
        // Empirical rule: decompressed size rarely exceeds 16× compressed for
        // small JSON-like payloads.
        let mut target = self.out.capacity().max(input.len() * 16).min(max_expand);
        if target < 64 {
            target = 64;
        }

        loop {
            if self.out.len() < target {
                // Safety: we immediately write into it via gzip_decompress; uninitialized
                // bytes beyond the returned length are never read.
                self.out.resize(target, 0);
            }
            match self.decomp.gzip_decompress(input, &mut self.out) {
                Ok(n) => {
                    self.out.truncate(n);
                    return Ok(&self.out[..n]);
                }
                Err(DecompressionError::InsufficientSpace) => {
                    if target >= max_expand {
                        return Err(Error::Decode(format!(
                            "gzip output exceeds max_expand={}B",
                            max_expand
                        )));
                    }
                    target = (target * 2).min(max_expand);
                }
                Err(e) => {
                    return Err(Error::Decode(format!("gzip decompress: {:?}", e)));
                }
            }
        }
    }
}

/// Inspect the first two bytes of a frame to distinguish gzip (1F 8B) from
/// zlib-wrapped deflate (78 01 / 78 9C / 78 DA). Important per PhD#5 D-07:
/// BingX docs say "GZIP format" without specifying; wire captures are the
/// source of truth. Call this during M10 validation.
#[inline]
pub fn sniff_format(input: &[u8]) -> Format {
    if input.len() < 2 {
        return Format::Unknown;
    }
    match (input[0], input[1]) {
        (0x1F, 0x8B) => Format::Gzip,
        (0x78, b) if matches!(b, 0x01 | 0x5E | 0x9C | 0xDA) => Format::ZlibDeflate,
        _ => Format::Unknown,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    Gzip,
    ZlibDeflate,
    Unknown,
}

#[cfg(test)]
mod tests {
    use super::*;
    use libdeflater::{CompressionLvl, Compressor};

    fn gzip_compress(data: &[u8]) -> Vec<u8> {
        let mut c = Compressor::new(CompressionLvl::default());
        let mut out = vec![0u8; c.gzip_compress_bound(data.len())];
        let n = c.gzip_compress(data, &mut out).unwrap();
        out.truncate(n);
        out
    }

    #[test]
    fn roundtrip_small_payload() {
        let msg = r#"{"hello":"world","num":42}"#;
        let compressed = gzip_compress(msg.as_bytes());
        let mut d = GzipDecoder::new(128);
        let out = d.decode(&compressed, 8192).unwrap();
        assert_eq!(out, msg.as_bytes());
    }

    #[test]
    fn reuses_buffer_across_frames() {
        let mut d = GzipDecoder::new(256);
        for i in 0..20 {
            let msg = format!(r#"{{"i":{}}}"#, i);
            let compressed = gzip_compress(msg.as_bytes());
            let out = d.decode(&compressed, 8192).unwrap();
            assert_eq!(out, msg.as_bytes());
        }
    }

    #[test]
    fn sniff_gzip() {
        assert_eq!(sniff_format(&[0x1F, 0x8B, 0x08, 0x00]), Format::Gzip);
    }

    #[test]
    fn sniff_zlib() {
        assert_eq!(sniff_format(&[0x78, 0x9C, 0xCB, 0x48]), Format::ZlibDeflate);
    }

    #[test]
    fn sniff_unknown() {
        assert_eq!(sniff_format(b"{\"json\""), Format::Unknown);
        assert_eq!(sniff_format(&[]), Format::Unknown);
    }

    #[test]
    fn max_expand_is_honored() {
        // Produce a small compressed frame whose expansion is well under max_expand,
        // then call with tiny max to verify the bomb-guard kicks in.
        let big = vec![b'x'; 64 * 1024];
        let compressed = gzip_compress(&big);
        let mut d = GzipDecoder::new(64);
        let res = d.decode(&compressed, 1024);
        assert!(
            res.is_err(),
            "max_expand guard should reject oversized output"
        );
    }
}
