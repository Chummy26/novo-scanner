//! Baseline A3 — ECDF + bootstrap empírico pareado.
//!
//! Implementa o **baseline shadow** definido em ADR-001: ECDF empírica
//! sobre histórico da rota, emitindo `TradeSetup` (ADR-016) sem treino
//! de modelo ML. Usa a distribuição conjunta do par `entry+exit` para
//! evitar o trap de marginais independentes. Serve como:
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
//! metadados táticos. O que foi corrigido é a parte mais importante do
//! contrato: `P(realize)` e os quantis de lucro bruto agora usam a
//! distribuição conjunta empírica do par `entry+exit`, não soma de
//! marginais.
//!
//! - `HotQueryCache` mantém entry/exit/gross para o mesmo histórico de
//!   rota.
//! - Modelo A2 (Marco 2) continua sendo o caminho para calibração e
//!   CDF unificada completa de `G(t,t')` (ADR-008).
//! - `calibration_status = Degraded` continua sinalizando fallback.
//!
//! Vide `docs/ml/01_decisions/ADR-016-output-contract-refined.md` para
//! o contrato correto (modelo A2 completo).

pub mod ecdf;

pub use ecdf::{BaselineA3, BaselineConfig};
