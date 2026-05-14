# P99 Tail Latency Optimization Plan

Date: 2026-05-14

Scope: reduce scanner P99 latency without reducing `raw_samples`, `accepted_samples`,
`labeled_trades`, horizons, floors, PIT features, sampling metadata, or future trainer
quality.

## Evidence Base

- Dean & Barroso, "The Tail at Scale" (CACM, 2013):
  https://research.google/pubs/the-tail-at-scale/
  Tail latency is dominated by variance, queueing and composition, not only mean cost.
- Schroeder, Wierman & Harchol-Balter, "Open Versus Closed: A Cautionary Tale"
  (NSDI, 2006): https://www.usenix.org/conference/nsdi-06/open-versus-closed-cautionary-tale
  Closed-loop measurement can understate latency when the load generator slows with the system.
- Gil Tene, `wrk2` coordinated-omission notes:
  https://github.com/giltene/wrk2
  P99 measurement needs intended-arrival semantics, or at least separate service time,
  queue wait and end-to-end latency.
- Kingman, "The single server queue in heavy traffic" (1961):
  https://doi.org/10.1017/S0305004100036094
  Utilization and service-time variability amplify queue delay near saturation.
- Dunning & Ertl, "Computing Extremely Accurate Quantiles Using t-Digests" (2019):
  https://arxiv.org/abs/1902.04023
  Streaming quantile sketches can reduce online quantile cost, but must be validated
  against exact offline Parquet data before replacing trainer-facing feature semantics.
- Leijen, Zorn & de Moura, "Mimalloc: Free List Sharding in Action" (2019):
  https://www.microsoft.com/en-us/research/publication/mimalloc-free-list-sharding-in-action/
  Allocation locality and bounded allocator maintenance matter for tail behavior.

## Non-Negotiable Guardrails

- Do not reduce labels, floors, horizons, `entry_locked_pct`, `exit_start_pct`,
  `label_floor_hits[]`, policy metadata or sampling metadata.
- Do not use physical `raw_samples` as first-hit label truth.
- Do not move cache observation before `FeaturesT0`; PIT must remain pre-observation.
- Do not couple `raw_decimation_mod` to supervised label/background population.
- Do not silently skip accepted label candidates after they enter the supervised
  population. In strict-lossless mode, fail high instead.
- Any feature-semantic change in hot cache representation requires version/hash
  fragmentation and offline equivalence analysis.

## Baseline Interpretation

The current `scanner_ml_background_ns_p99` is batch-level latency. It grows with
events per cycle even when per-route cost is stable. Therefore:

- `scanner_ml_background_ns_p99` remains the batch SLO.
- `scanner_ml_background_event_ns_p99` is added as a per-event estimate.
- Queue depth, inflight events and over-budget counters remain required to detect
  true backlog rather than just larger batches.

## Implemented In This Pass

- Hot cache now maintains exact `sampled_weight_sum` incrementally per route.
  This removes repeated O(ring) scans for logical counts during observe/sweep while
  preserving weighted ring semantics exactly.
- Binance Spot frame progress logging no longer emits high-frequency `info!` logs
  after the first frames. Periodic frame progress is debug-level only.
- Background ML exports `scanner_ml_background_event_ns_p99`, computed once per
  batch as elapsed background service time divided by processed background events.
- Label resolver metadata-spool insert failure now fails high in strict-lossless
  mode instead of returning `false` and skipping a supervised candidate.

## Next Optimizations Requiring Benchmark First

- Fuse repeated `feature_stats` scans, especially the two exit-run-duration passes.
- Add a route-local or sharded cache access path to reduce global `RwLock` tail risk.
- Move label sweep to an opportunistic or separate ordered executor so administrative
  sweeps do not share the same FIFO pressure as fresh background observations.
- Benchmark writer threads versus async tasks with synchronous filesystem calls.
- Compare exact offline Parquet quantiles against any future KLL/t-digest/summary
  replacement before changing online feature semantics.

