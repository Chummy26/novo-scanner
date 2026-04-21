//! Baseline A3 — ECDF marginal degradado.
//!
//! Implementa o **baseline shadow** definido em ADR-001: ECDF empírica
//! sobre histórico da rota, emitindo `TradeSetup` (ADR-016) sem treino
//! de modelo ML. Usa o `entry` acionável atual mais a distribuição marginal
//! futura de `exit`; não usa `entry(t)+exit(t)` simultâneo como lucro
//! econômico. Serve como:
//!
//! 1. **Safety-net do kill switch**: quando modelo A2 composta falha
//!    (ECE alto, panic, latência), fallback para A3 garante que sistema
//!    continua emitindo recomendações — nunca fica em silêncio.
//! 2. **Barra absoluta de comparação**: qualquer modelo futuro precisa
//!    superar A3 em ≥ 5pp de precision@10 para justificar complexidade.
//! 3. **MVP funcional imediato**: permite operação em shadow mode desde
//!    o dia 1, sem dependência de pipeline Python/ONNX.
//!
//! # Limitação documentada (MVP)
//!
//! A3 continua sendo baseline/fallback, então mantém `calibration_status`
//! como `Degraded` e usa aproximações conservadoras para horizonte e
//! metadados táticos. A correção atual evita o bug crítico de interpretar
//! `entry(t)+exit(t)` instantâneo como label de `G(t0,t1)`.
//!
//! - A3 deriva `G_proxy(t0,t1) = entry_atual(t0) + S_saida(t1)` via ECDF
//!   marginal de saída.
//! - Modelo A2 (Marco 2) continua sendo o caminho para calibração e
//!   CDF unificada completa de `G(t0,t1)` com labels forward-looking.
//! - `calibration_status = Degraded` continua sinalizando fallback.
//!
//! Vide `docs/ml/01_decisions/ADR-016-output-contract-refined.md` para
//! o contrato correto (modelo A2 completo).

pub mod ecdf;

pub use ecdf::{BaselineA3, BaselineConfig};
