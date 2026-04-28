---
status: draft
author: codex
date: 2026-04-23
version: 0.1.0
supersedes: null
reviewed_by: null
---

# Stack ML

Estado atual: coleta supervisionada Rust-native com três streams:
`raw_samples`, `accepted_samples` e `labeled_trades`.

Objetivo preservado: recomendar oportunidade calibrada em spread bruto:
`enter`, `exit`, `lucro_bruto = enter + exit`, `P`, `T` e intervalo de
confiança. O dataset não modela PnL líquido nem execução.

Gates para promover coleta 7d+:

- partições `raw_samples`, `accepted_samples` e `labeled_trades` presentes;
- `schema_version` esperado em cada stream;
- `oldest_cache_ts_ns <= ts_emit_ns` e cobertura temporal coerente;
- labels `realized/miss/censored` aparecendo nos horizontes já vencidos;
- `priority_set_generation_id` avança após rerank;
- sem drops sustentados nos canais de writers.
