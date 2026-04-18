//! Decoders: JSON (sonic-rs), GZIP (libdeflater), Protobuf (quick-protobuf).
//!
//! Each decoder follows two rules:
//! 1. Zero allocations on hot path after warmup (context/buffer reuse).
//! 2. Borrow from the input buffer wherever possible (`&'a [u8]` / `&'a str`).

pub mod gzip;
pub mod json_path;

pub use gzip::GzipDecoder;
