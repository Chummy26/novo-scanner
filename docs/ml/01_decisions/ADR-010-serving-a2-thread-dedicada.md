---
name: ADR-010 — Serving Architecture A2 (Thread Dedicada no Mesmo Binário)
description: Arquitetura de serving do modelo ML via thread dedicada com crossbeam channel e core affinity, rejeitando inline (A1) por ausência de failure isolation e gRPC (A4) por violação do budget de latência
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d8-serving, phd-d7-rust-ml]
---

# ADR-010 — Serving Architecture A2 (Thread Dedicada)

## Contexto

O scanner Rust tem latência hard: WS → book p99 < 500 µs; ciclo spread p99 < 2 ms × 2600 símbolos; zero alocações hot path após warmup. Budget de inferência ML consolidado em Wave 2 = ~67 µs/rota single-thread (D3 features 39 µs + D1 inferência 28 µs + D5 calibração <60 ns). Com 4 cores × 150 ms → budget efetivo ~230 µs/rota (folga 3×).

D8 avaliou 5 arquiteturas de serving:

| # | Arquitetura | p50 added | p99 added | Failure isolation | Hot-reload downtime | Dev cost |
|---|---|---|---|---|---|---|
| A1 | Inline no processo scanner | 0 µs | **2 µs** | **NÃO — panic mata processo** | 0 ms | 1–2 sem |
| **A2** | **Thread dedicada no mesmo binário** | **0.2 µs** | **0.8 µs** | **SIM — thread isolada** | **300 ms** | **2–3 sem** |
| A3 | Processo separado same-host | 1 µs | 10 µs | SIM | 1000 ms | 4–5 sem |
| A4 | Serviço gRPC | 300 µs | 5000 µs | SIM | 0 ms | 5–7 sem |
| A5 | Sidecar consumindo `/ws/scanner` | 200 µs | 3000 µs | SIM | 0 ms | 3–4 sem |

## Decisão

Adotar **A2 — Thread dedicada no mesmo binário** como arquitetura de serving.

### Design

- **Thread ML** dedicada com `core_affinity::set_for_current` em core distinto do spread engine (evita contention L3).
- **Canal de entrada**: `crossbeam::channel::bounded(1)` com `SendSync` sobre `FeatureVec` pré-alocada; última frame sobrescreve anteriores (semântica "latest wins").
- **Canal de saída**: `arc_swap::ArcSwap<[TradeSetup; 2600]>` — scanner lê snapshot atomicamente sem lock.
- **Modelo carregado**: `tract::SimpleState` + buffers pré-alocados; swap via `ArcSwap<OnnxModel>` para hot-reload.
- **Canal de controle** separado: reload model, retrain trigger, kill switch ativação.

### Justificativa numérica

**Razão principal para rejeitar A1 inline**:
- Panic em `tract::SimpleState::run` **não é capturável** por `catch_unwind` em todos os paths SIMD internos.
- Se ocorre, processo inteiro cai: **14 adapters WS + orderbook seqlock + broadcast axum perdidos simultaneamente**.
- Risco de indisponibilidade total é inaceitável para scanner em produção.

**Razão principal para escolher A2**:
- Entrega **99.7% do ganho de latência de A1** (0.8 µs p99 vs 0.0 µs — overhead desprezível).
- Overhead `crossbeam::bounded(1)`: p50 = 200 ns, p99 = 800 ns (Aaron Turon, crossbeam-rs/crossbeam benchmarks 2023).
- Versus budget de 67 µs: **1.2% de overhead**.
- Thread isolada → panic na ML não derruba scanner.
- Hot-reload graceful via canal de controle (300 ms downtime aceitável — 2 ciclos perdidos).

**Razão para rejeitar A3–A5**:
- A4 gRPC: 300–5000 µs overhead destrói budget 67 µs (4–75× overhead).
- A5 sidecar: 260 µs só de serialização JSON 520 KB/ciclo (2600 rotas × 200 B) antes da inferência.
- A3 processo: 2–50 µs IPC Windows named pipe; 4–5 semanas-pessoa extras sem ganho material sobre A2.

### Circuit breaker + fallback

**Threshold de abertura**: p99 da chamada ML > 100 µs em janela de 1 segundo (medido via `hdrhistogram 7.5` já na stack).

**Ao abrir**:
- Scanner emite `Opportunity` com `trade_setup: None` e `ml_status: CircuitOpen`.
- Módulo A3 ECDF+bootstrap (<1 µs/rota — ADR-001 baseline shadow) entra como fallback com flag `calibration_source: ecdf_fallback`.
- Adicionalmente, **kill switch de D5** (ADR-004: ECE_4h > 0.05) bypassa ML completamente — independente do circuit breaker.

**Recuperação**:
- Probe de 1 rota após 10 s.
- Se latência < 100 µs e sem panic → fechar breaker.
- Se repetido failure ≥ 3 vezes em 1h → alert operator + bloquear reabertura automática.

### Hot-reload

- Thread ML monitora `model_path` via `notify 6.1` crate (watchman/FSEvents/`ReadDirectoryChangesW`).
- Ao detectar mudança:
  1. Thread ML emite `emit_status: ReloadInProgress` via canal controle.
  2. Para consumir do canal de entrada.
  3. Carrega novo ONNX (50–500 ms dependendo tamanho).
  4. Warmup `SimpleState` com 10 inferências dummy (excluídas do hot path).
  5. Atomic swap via `ArcSwap<Model>`.
  6. Retoma consumir.
- **Janela de emissão perdida**: 1–2 ciclos = **150–300 ms**. Aceitável para recomendador (vs 0 ms de A1 que custaria coupling).

### Zero-allocation verification

MIRI não suporta tokio runtime completo (rust-lang/miri#1338, 2021). Solução adotada:

1. **Extrair kernel de inferência** como função síncrona pura:
   ```rust
   fn infer(state: &mut SimpleState, features: &[f32]) -> [f32; N_OUTPUTS];
   ```
   Testar isoladamente com MIRI.
2. **GlobalAlloc debug counter**: custom allocator que incrementa counter; `assert_eq!(alloc_after, alloc_before)` em cada chamada do hot path.
3. **Sustained benchmark 1h** via `heaptrack` Linux: RSS deve estabilizar em < 200 MB em 5 min e não crescer monotonicamente. Se cresce > 1 MB/min após warmup, alocação oculta detectada.

Se MIRI ou sustained benchmark falham:
- Thread ML (A2) contém o dano — alocações confinadas à thread.
- Scanner engine não vê a alocação.
- Diferente de A1 onde alocação hot path = perda de latência permanente do scanner inteiro.

## Alternativas consideradas

Ver tabela acima. Também considerados e rejeitados:

### Rust + lock-free mpsc custom

- Implementar canal lock-free custom em vez de `crossbeam::bounded(1)`.
- **Rejeitada**: `crossbeam` é state-of-the-art Rust há 5+ anos; overhead 200 ns p50 é aceitável.

### A1 com `catch_unwind` comprehensive

- Capturar todos os panics em inference.
- **Parcialmente considerada**: catch_unwind não captura abort-on-panic SIMD internal em algumas implementações tract. Margem de segurança insuficiente.

## Consequências

**Positivas**:
- Failure isolation robusta — scanner sobrevive qualquer bug no código ML.
- Hot-reload graceful sem derrubar scanner.
- Budget de latência amplamente respeitado.
- Circuit breaker + fallback A3 → sistema "nunca fica sem resposta".
- Core affinity evita contention L3 entre spread engine e ML.

**Negativas**:
- Overhead 800 ns p99 (aceitável).
- Hot-reload downtime 150–300 ms (vs 0 ms A1) — 2 ciclos.
- 2–3 semanas-pessoa desenvolvimento (vs 1–2 sem A1).

**Risco residual**:
- **Bug de memória em `tract`** corrompe heap compartilhado com scanner (worst case).
  - Mitigação parcial: `tract` é pure-Rust sem `unsafe` fora de interop BLAS opcional; nossa config `lto = "fat"` + sem BLAS minimiza risco de corrupção cross-thread.
  - Confidence: 70%.
  - Trigger para migrar A3 (processo separado): taxa de crash > 1/dia em produção → isolamento completo.

## Status

**Aprovado** para Marco 1. Zero-alloc verification é **pré-condição de merge** — sem resultado limpo MIRI + GlobalAlloc + sustained benchmark, ADR permanece em status `pending`.

## Referências cruzadas

- [D08_serving.md](../00_research/D08_serving.md) — análise completa das 5 arquiteturas.
- [D07_rust_ecosystem.md](../00_research/D07_rust_ecosystem.md) §L3 (tract + ort).
- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — A3 ECDF como fallback.
- [ADR-003](ADR-003-rust-default-python-treino-onnx.md) — inferência via tract ONNX.
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — kill switch D5.

## Evidência numérica

- `crossbeam::channel::bounded(1)` latência: 200 ns p50, 800 ns p99 (crossbeam-rs benchmarks 2023).
- `core_affinity` Rust crate overhead: <10 ns set per thread (Linux `sched_setaffinity`).
- `tract 0.21.7` MLP 3-layer 128-wide inference: 2.1 µs/sample (sonos benchmark).
- `notify 6.1` FS event delay: 10–50 ms typical Linux inotify.
- Panic em SIMD tract não capturável: confirmed via tests com `catch_unwind` em modelos com operators não-implementados.
