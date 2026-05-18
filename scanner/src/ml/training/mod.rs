//! Offline trainers for the ML recommendation stack.
//!
//! The scanner remains the real-time producer. Training code lives behind this
//! module so empirical baselines, calibration and future challengers can share
//! the same logical V2 ingestion and audit gates without contaminating the hot
//! serving path.

pub mod estimator_only;
