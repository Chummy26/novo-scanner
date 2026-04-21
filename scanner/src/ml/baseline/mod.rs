//! Baseline A3 — ECDF + bootstrap empírico condicional.
//!
//! Implementa o **baseline shadow** definido em ADR-001: ECDF empírica
//! sobre histórico da rota, emitindo `TradeSetup` (ADR-016) sem treino
//! de modelo ML. Serve como:
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
//! A versão MVP computa `P(realize)` via produto de marginais
//! (`p_enter_hit × p_exit_hit`), ADMITIDAMENTE sub-ótimo por violar
//! a correção crítica Q2-M2 de ADR-016 (correlação empírica entry×exit
//! = −0.93; marginais independentes inflam P otimisticamente).
//!
//! Essa simplificação é explícita e **OK para baseline**:
//!
//! - Baseline A3 tem apenas histogramas marginais no `HotQueryCache`
//!   (joint storage viria em M1.1b com ring buffer; não vale para MVP).
//! - Modelo A2 (Marco 2) computa `P(realize)` corretamente via CDF de
//!   `G(t,t')` unificado (ADR-008). A3 é comparativo, não canônico.
//! - Campo `calibration_status` sinaliza `Degraded` quando A3 está
//!   ativo — operador sabe que está em fallback.
//!
//! Vide `docs/ml/01_decisions/ADR-016-output-contract-refined.md` para
//! o contrato correto (modelo A2 completo).

pub mod ecdf;

pub use ecdf::{BaselineA3, BaselineConfig};
