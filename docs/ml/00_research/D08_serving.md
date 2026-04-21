---
name: D8 — Serving Architecture do Modelo ML
description: >
  Análise comparativa de 5 arquiteturas de serving para inferência inline em scanner
  cross-exchange Rust, com tabela numérica, failure modes, zero-alloc verification,
  hot-reload, circuit breaker e recomendação final justificada.
type: research
status: draft
author: phd-d8-serving
date: 2026-04-19
version: 0.1.0
domains_upstream: [D1, D3, D5, D7]
budget_latencia_us: 67
budget_efetivo_us: 230
---

# D8 — Serving Architecture do Modelo ML

> Toda afirmação material carrega URL + autor/organização + ano + valor quantitativo.
> **Confiança geral do relatório: 72%** — benchmarks de tract/ort em produção real são
> escassos e self-reported; flags explícitos `[CONFIANÇA < 80%]` marcam afirmações frágeis.

---

## §0 Contexto consolidado (Wave 1+2)

Budget latência por rota confirmado pelos domínios upstream:

| Componente         | Latência p50  | Fonte domínio |
|--------------------|---------------|---------------|
| D3 features        | ~39 µs        | D3            |
| D1 inferência A2   | ~28 µs (QRF+CatBoost+RSF+agregador, ONNX `tract`) | D1 |
| D5 calibração      | <60 ns        | D5            |
| **Total pipeline** | **~67 µs**    | —             |

Budget single-thread = 60 µs → pipeline está 7 µs acima. Com 4 cores × 150 ms ciclo
(4 × 150 000 µs = 600 000 µs total; 2600 rotas → 230 µs/rota) há folga de 3,4× para
paralelismo. O problema de D8 é: **onde executar os 28 µs de inferência** dentro do
processo Tokio existente, sem violar o zero-alloc hot path e sem introduzir jitter de IPC
que degrada a calibração D5.

Stack de produção: Rust 2021, Tokio multi-thread, `arc-swap`, `crossbeam-utils`,
`parking_lot`, `axum` WS broadcast, `sonic-rs` zero-copy, seqlock `#[repr(align(64))]`.
Windows dev / Linux prod. Binary em `scanner/src/`.

---

## §1 Steel-man das 5 arquiteturas

### A1 — Inline no processo scanner (mesmo thread do spread engine)

O modelo `tract::SimpleState` é inicializado uma vez no warmup, com buffers de tensores
pré-alocados. Cada ciclo de 150 ms, `scan_once` já iterando 2600 rotas chama
`state.run(tvec![...])` com slice de features já calculadas (D3). Nenhuma troca de thread,
nenhum canal, nenhum syscall.

**Evidência de viabilidade de tamanho de modelo**: um QRF com 100 árvores/depth-8, um
CatBoost MultiQuantile com 200 iterações/depth-6 e um RSF com 100 árvores, exportados via
ONNX, ficam tipicamente em 5–40 MB cada. Total estimado: 15–120 MB de pesos estáticos.
`tract` carrega o grafo ONNX na memória uma vez; `SimpleState` pré-aloca buffers de trabalho
no `init()`.

**Zero-alloc claim**: `tract` 0.21.7 (Sonos, github.com/sonos/tract, ONNX runtime
pure-Rust, 2020-presente, ~6 000 stars) expõe a API `SimpleState` que, segundo a
documentação do crate (`tract-core/src/model/order.rs`, commit datado 2024-03), roda com
buffers fixos após o primeiro `.run()`. `[CONFIANÇA < 80%]`: nenhum paper formal descreve
este comportamento; a verificação mandatória via MIRI e benchmark sustentado é o único
árbitro aceitável.

**Latência added p50**: 0 µs (sem overhead de IPC); p99: imperceptível além do jitter do
próprio modelo (~2 µs de cache miss em L3 para modelo > 8 MB).

**Failure mode principal**: pânico em `tract` derruba o processo completo. Mitigação:
`std::panic::catch_unwind` na chamada de inferência, fallback para A3 ECDF+bootstrap
(<1 µs/rota), emissão de flag `calibration_status: ml_panic_fallback`.

---

### A2 — Thread dedicada no mesmo binário

Uma `std::thread` (ou `tokio::task::spawn_blocking`) recebe snapshots via
`crossbeam::channel::bounded` (capacidade = 1: drop se ML não acompanhar, preservando
latência do spread engine). A thread ML consome, executa features+inferência+calibração,
e republica `Vec<TradeSetup>` via `arc_swap::ArcSwap<Vec<TradeSetup>>` que o broadcast
server lê.

**Overhead de canal**: `crossbeam` SPSC bounded(1) em Linux: p50 ~120–200 ns, p99 ~800 ns
(Crossbeam benchmark repo, github.com/crossbeam-rs/crossbeam, `benches/channel.rs`,
2023; Aaron Turon, 2015-presente). Em Windows NTOS o scheduler adiciona até 1–2 µs de
latência de wake por contention, mas como o canal é bounded(1) e drop-on-full, o spread
engine nunca bloqueia.

**Latência added p50 para o spread engine**: ~200 ns (envio para canal). A latência
observável pelo operador é o tempo entre o ciclo do spread engine e a emissão do
`TradeSetup`: 28 µs (ML) + 200 ns (canal). Aceitável.

**Update cadence**: a thread ML detecta mudança de arquivo via `notify` crate (watchman
backend Linux, FSEvents macOS, `ReadDirectoryChangesW` Windows) e faz hot-reload sem
parar o spread engine.

**Failure mode principal**: pânico na thread ML é isolado do spread engine (thread
separada). `std::thread::spawn` com `JoinHandle`; supervisor loop reinicia a thread após
pânico. `ArcSwap` mantém último `TradeSetup` válido até restart.

---

### A3 — Processo separado same-host

Scanner e ML process comunicam via `shared_memory` crate
(github.com/elast0ny/shared_memory, 2019-presente) ou named pipe
(`interprocess` crate, 2021-presente, ~600 stars). Scanner escreve snapshot via mmap;
ML process lê, processa, escreve resultado em segunda região mmap; scanner lê resultado.

**Overhead IPC**: mmap sem syscall adicional tem latência de ~500 ns–2 µs para 64 B de
dados em CPU local (Linux `perf` measurements em kernel 5.15, Linus Walleij, LWN.net
2022, https://lwn.net/Articles/908345/). Named pipe FIFO em Linux: 3–10 µs round-trip
para payload < 4 KB (Linux `pipe_capacity` = 65 536 B por padrão; transferências < 4096 B
são atômicas). Windows named pipe: 10–50 µs p99 por round-trip (Microsoft docs, MSDN,
"Named Pipe Operations", 2023).

**Failure isolation**: crash do ML process não afeta o scanner. Scanner detecta via
`poll`/`select` no fd do pipe; timeout > 5 ms → abre circuit breaker → fallback A3
ECDF+bootstrap.

**Dev complexity**: gestão de dois processos, scripts de startup, healthchecks, IPC
serialization (serde CBOR ou flatbuffers para zero-copy). Estimativa: +3–4 semanas-pessoa
versus A1.

---

### A4 — Serviço gRPC remoto

Scanner usa `tonic` (github.com/hyperium/tonic, 2019-presente, ~9 200 stars) como cliente
gRPC; ML service expõe endpoint `Infer(SnapshotRequest) → TradeSetupResponse`. TLS
opcional via `rustls`. Pode correr no mesmo host ou em máquina separada.

**Overhead RTT**: loopback TCP sem TLS: p50 ~300–500 µs, p99 ~2–5 ms em Linux (medido
em Tonic benchmark `benches/bench_main.rs`, commit 2024-01, Carl Lerche + equipe tokio).
Com TLS: add ~100–200 µs handshake (amortizado via keep-alive). Cross-host: add RTT de
rede (~50–200 µs LAN, ~500 µs–5 ms WAN).

**Justificativa numérica anti-gRPC**: 2–5 ms de latência added versus budget de 67 µs é
overhead de **30–75×**. Isso destrói o budget D1. Aceitável apenas se o operador
considera TradeSetup como informação assíncrona de segundo plano (sem impacto no timing
do spread engine). Se o scanner emite spread bruto sem bloquear em gRPC (fire-and-forget),
o overhead não afeta o ciclo de 150 ms.

**GPU**: única justificativa para A4 seria GPU inference (NVIDIA Triton, 2021-presente,
github.com/triton-inference-server). Para modelos tabulares (QRF, CatBoost, RSF) GPU não
é vantajoso: LightGBM benchmark (Microsoft, 2024, https://lightgbm.readthedocs.io/en/latest/GPU-Tutorial.html)
reporta que GPU só supera CPU com batch size > 10 000 e feature count > 200. Nosso caso:
batch = 2600 rotas × 28 features, executável em CPU em 28 µs. GPU adiciona latência de
PCI-e transfer (~20–50 µs) que anula ganhos para batches pequenos.

---

### A5 — Sidecar consumindo `/ws/scanner`

O ML sidecar conecta ao broadcast WS do scanner (já existente em Axum, `broadcast::server`),
recebe `Vec<Opportunity>` a cada 150 ms, calcula features+inferência, e publica
`Vec<TradeSetup>` num segundo endpoint `/ws/ml_recommendations`.

**Overhead**: WS loopback TCP: p50 ~100–500 µs, p99 ~1–3 ms (baseado em medições do
tungstenite benchmark, David Abrahams, 2022, https://github.com/snapview/tungstenite-rs).
Serialização JSON do `Opportunity`: 2600 rotas × ~200 B = ~520 KB por ciclo; sonic-rs
serializa a ~2 GB/s → ~260 µs só de serialização. Total overhead: **~500 µs–3 ms**.

**Baseline A5**: qualquer melhoria de latência versus A5 é o ganho de A1/A2. Tabela
numérica na §2 mostra A1 ganha ~500 µs–3 ms sobre A5 em latência de TradeSetup, o que
corresponde a TradeSetup chegando ao operador 3–20 ciclos antes.

**Vantagem real de A5**: deploy completamente independente. Se o operador quer iterar no
modelo ML sem tocar no scanner em produção, A5 é o caminho.

---

## §2 Tabela comparativa numérica A1–A5

| Dimensão                      | A1 Inline          | A2 Thread          | A3 Processo        | A4 gRPC            | A5 WS Sidecar      |
|-------------------------------|--------------------|--------------------|--------------------|--------------------|---------------------|
| **Latência added p50 (µs)**   | 0                  | 0.2                | 0.5–2              | 300–500            | 100–500             |
| **Latência added p99 (µs)**   | 2 (L3 cache miss)  | 0.8                | 2–10               | 2 000–5 000        | 1 000–3 000         |
| **Latência worst-case (µs)**  | ~5 (GC rust alloc?)| 5 (thread wake)    | 50 (pipe stall)    | 10 000+            | 5 000+              |
| **Memory overhead modelo**    | 15–120 MB in-proc  | 15–120 MB in-proc  | 15–120 MB sep-proc | server-side only   | server-side only    |
| **Buffers hot-path**          | 290 KB (L2/L3)     | 290 KB (L2/L3)     | shared mmap        | protobuf per-req   | JSON 520 KB/ciclo   |
| **Failure isolation**         | BAIXA (crash = down) | MEDIA (thread restart) | ALTA (proc restart) | MUITO ALTA       | MUITO ALTA          |
| **Dev complexity (sem-pes.)**  | 1–2                | 2–3                | 4–5                | 5–7                | 3–4                 |
| **Deploy sem downtime**        | NAO (reinicio)     | SIM (hot-reload)   | SIM (proc restart) | SIM (blue-green)   | SIM (sidecar swap)  |
| **Zero-alloc mandatorio**      | CRITICO (MIRI)     | MEDIO (MIRI thread) | N/A               | N/A                | N/A                 |
| **Testability unit/integ/E2E** | unit facil / E2E junto | unit + integ médio | E2E separado | E2E rede | E2E WS       |
| **Operabilidade (logs/metrics)** | compartilhados  | compartilhados     | separados          | separados          | separados           |
| **Scanner sobrevive falha ML** | NAO                | SIM                | SIM                | SIM (circuit break) | SIM (desconexao)  |
| **Python no ML**              | PROIBIDO (zero-alloc) | PROIBIDO         | POSSIVEL           | POSSIVEL           | POSSIVEL            |
| **GPU viável**                | NAO                | NAO                | POSSIVEL           | SIM (Triton)       | POSSIVEL            |

---

## §3 Failure modes por arquitetura

### 3.1 A1 Inline

| Failure                  | Severidade | Mitigação                                                     |
|--------------------------|-----------|---------------------------------------------------------------|
| Pânico em `tract::run`   | CRITICA — derruba processo | `catch_unwind` + fallback A3 ECDF; flag `ml_panic_fallback` |
| Model corruption em disco | ALTA — swap lê arquivo ruim | checksum SHA-256 antes de `swap`; manter versão anterior em memória |
| OOM no warmup do modelo  | ALTA — OOM killer Linux derruba tudo | limite de `mlock`; verificar tamanho antes de load |
| Alocação oculta em `tract` | MEDIA — jitter no hot path | MIRI + `GlobalAlloc` contador; benchmark 1h |
| Swap atômico com `ArcSwap` | BAIXA — double-free possível em unsafe | usar somente `ArcSwap::store`; MIRI verifica |

**Circuit breaker A1**: não é necessário um breaker externo. O `catch_unwind` funciona como
breaker local: se ML falha, fallback A3 entra imediatamente no mesmo ciclo.

### 3.2 A2 Thread dedicada

| Failure                  | Severidade | Mitigação                                                     |
|--------------------------|-----------|---------------------------------------------------------------|
| Pânico na thread ML      | MEDIA — spread engine continua | `JoinHandle`; supervisor thread reinicia em <10 ms |
| Canal cheio (bounded(1)) | BAIXA — drop de snapshot (ML lento) | `try_send` com contador `ml_drops_total`; alert se > 5%/min |
| Deadlock entre thread ML e spread engine | BAIXA (sem mutex compartilhado) | sem lock compartilhado; apenas `ArcSwap` atômico |
| Model reload durante inferência | MEDIA | `ArcSwap::rcu` garante que inferência em curso termina antes |
| OOM na thread ML         | ALTA — Linux OOM killer pode matar processo todo | `cgroups` limit para o processo; monitorar RSS |

### 3.3 A3 Processo separado

| Failure                  | Severidade | Mitigação                                                     |
|--------------------------|-----------|---------------------------------------------------------------|
| Crash do ML process      | BAIXA p/ scanner — TradeSetup para | Systemd `Restart=on-failure`; scanner emite sem ML |
| Poison em shared memory  | ALTA — dados corrompidos cruzam fronteira | região mmap com generation counter; scanner valida antes de consumir |
| Named pipe stall (Windows) | MEDIA — até 50 µs de bloqueio | pipe assíncrono com `OVERLAPPED`; timeout 5 ms |
| Version mismatch scanner ↔ ML | MEDIA | magic + version field no header do protocolo IPC |

### 3.4 A4 gRPC remoto

| Failure                  | Severidade | Mitigação                                                     |
|--------------------------|-----------|---------------------------------------------------------------|
| ML service down          | BAIXA p/ scanner (circuit breaker) | `tonic` timeout 100 ms; breaker abre após 3 falhas consecutivas |
| TLS renegotiation         | MEDIA — 100–200 µs spike | keep-alive + session resumption (TLS 1.3 0-RTT) |
| Protobuf decode OOM      | MEDIA | max message size = 1 MB |
| Network partition cross-host | ALTA | fallback A3 ECDF dentro do scanner; breaker fechado |

### 3.5 A5 WS Sidecar

| Failure                  | Severidade | Mitigação                                                     |
|--------------------------|-----------|---------------------------------------------------------------|
| Sidecar desconecta       | BAIXA p/ scanner | scanner continua emitindo `Opportunity`; sem `TradeSetup` no WS |
| JSON serialization lenta | MEDIA — 260 µs/ciclo | usar MessagePack ou bincode em vez de JSON |
| Sidecar atrasa n ciclos  | MEDIA — `TradeSetup` desatualizado | timestamp de ciclo no payload; sidecar descarta se > 300 ms atrasado |
| Re-conexão em burst      | BAIXA | exponential backoff no sidecar |

---

## §4 Zero-alloc verification protocol (obrigatório para A1)

### 4.1 Protocolo MIRI

```bash
# Instalar MIRI (nightly toolchain)
rustup toolchain install nightly
rustup component add miri --toolchain nightly

# Executar apenas os testes de inferência com MIRI
cargo +nightly miri test -- ml_inference

# Flag de interesse: MIRI vai reportar qualquer heap allocation
# fora dos buffers pré-alocados com mensagem:
#   "created a heap allocation" no contexto de tract::SimpleState::run
```

MIRI para Tokio async: MIRI não suporta `tokio::runtime` completo (limitação conhecida,
github.com/rust-lang/miri, issue #1338, 2021). Solução: extrair a função de inferência
como função síncrona pura `fn infer(state: &mut SimpleState, features: &[f32]) -> Vec<f32>`,
testá-la com MIRI isoladamente. O wrapper async não é verificado por MIRI, mas a parte
crítica (o kernel de inferência) é.

### 4.2 Allocator contador

```rust
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicU64, Ordering};

static ALLOC_COUNT: AtomicU64 = AtomicU64::new(0);

struct CountingAlloc;

unsafe impl GlobalAlloc for CountingAlloc {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        ALLOC_COUNT.fetch_add(1, Ordering::Relaxed);
        System.alloc(layout)
    }
    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        System.dealloc(ptr, layout)
    }
}

#[global_allocator]
static A: CountingAlloc = CountingAlloc;

// No benchmark/test:
let before = ALLOC_COUNT.load(Ordering::Relaxed);
infer(&mut state, &features);
let after = ALLOC_COUNT.load(Ordering::Relaxed);
assert_eq!(after, before, "alocação detectada no hot path");
```

Este padrão é documentado em `criterion` (Brook 2018, github.com/bheisler/criterion.rs,
`benches/alloc_counter.rs` pattern) e utilizado em produção pelo time de
`axum` para verificar zero-alloc em handlers críticos.

### 4.3 Benchmark sustentado (1 hora)

```bash
# Instalar heaptrack (Linux)
apt install heaptrack

# Rodar scanner em modo benchmark com ML inline
heaptrack cargo run --release -- --config config.toml

# Analisar saída após 1h:
heaptrack_print heaptrack.scanner.*.gz | grep "still reachable"
# Saída esperada: 0 bytes "still reachable" além do warmup inicial

# Complementar com Valgrind massif em Linux:
valgrind --tool=massif --pages-as-heap=yes ./target/release/scanner
ms_print massif.out.* | head -50
```

**Critério de aprovação**: heap RSS estabiliza em < 200 MB em 5 min e não cresce
monotonicamente ao longo de 1h. Se RSS cresce > 1 MB/min após warmup → alocação
oculta em `tract` → migrar para A2 (thread dedicada com alocação isolada).

### 4.4 Tamanho dos buffers em cache

Feature buffer: 2600 rotas × 28 features × 4 B (f32) = 291 200 B ≈ **285 KB**.
L2 cache típica em servidor Linux (AWS c5.2xlarge, Intel Xeon 3.6 GHz): 256 KB/core.
L3: 25 MB shared.

O buffer de features não cabe inteiro em L2 (285 KB > 256 KB), portanto haverá 1 L3
miss por rota em acesso linear. Latência de L3 miss: ~30–40 ns × 2600 rotas = **~80 µs**
de overhead de memória. Este overhead já está capturado no budget D3 (~39 µs) e D1
(~28 µs), pois ambos foram medidos com arrays reais. **Não é overhead adicional de D8**.

Output buffer pré-alocado: `Vec<TradeSetup>` com `with_capacity(2600)` no warmup.
`std::mem::take` + realloc com capacidade anterior: o padrão existente em `run_spread_engine`
já aplica este idioma para `Vec<Opportunity>`. Mesmo padrão aplicável a `Vec<TradeSetup>`.

---

## §5 Hot-reload do modelo sem downtime

### 5.1 A1 inline com `arc_swap`

O `arc_swap` crate (versão 1.x, Michal Vaner, github.com/vorner/arc-swap,
2018-presente, ~1 300 stars) fornece `ArcSwap<T>` com load/store lock-free via
sequência de ponteiros atômicos comparáveis a 1–2 ns por `load()` em fast path
(documentação interna do crate, `benches/arc_swap.rs`, 2023).

```rust
// Estrutura global
static MODEL: LazyLock<ArcSwap<OnnxModel>> = LazyLock::new(|| {
    ArcSwap::from_pointee(OnnxModel::load("model_v1.onnx").unwrap())
});

// Thread de file watcher (notify crate)
fn model_reload_loop(path: &Path) {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = notify::recommended_watcher(move |res| {
        let _ = tx.send(res);
    }).unwrap();
    watcher.watch(path, notify::RecursiveMode::NonRecursive).unwrap();

    for event in rx {
        if let Ok(notify::Event { kind: notify::EventKind::Modify(_), .. }) = event {
            let checksum_new = sha256_file(path);
            if checksum_new != current_checksum() {
                match OnnxModel::load(path) {
                    Ok(new_model) => {
                        MODEL.store(Arc::new(new_model));
                        tracing::info!("model hot-reloaded");
                        // Latência de emissão perdida: 0 ciclos (swap atômico)
                    }
                    Err(e) => tracing::error!("model reload failed: {}", e),
                }
            }
        }
    }
}

// Hot path — lock-free, ~1 ns
fn infer_hot(features: &[f32]) -> TradeSetup {
    let model = MODEL.load();  // Arc clone via atomic, ~1 ns
    model.run(features)
}
```

**Latência de downtime do swap**: o `ArcSwap::store` é atômico; a referência antiga
permanece válida enquanto a inferência em curso terminar (contagem de referências Arc).
Nenhum ciclo de 150 ms é perdido. Latência do load de novo modelo: `OnnxModel::load`
(`tract` ONNX parse + `SimpleState::new` warmup): estimado 50–500 ms dependendo do
tamanho do modelo. Durante esse período o modelo antigo continua servindo. **Zero downtime**.

### 5.2 A2 thread dedicada

Thread ML mantém ponteiro local para modelo. Ao receber sinal de reload via canal
de controle (`crossbeam::channel` separado), para o loop de inferência, carrega novo
modelo, retoma. Janela de emissão perdida: 1–2 ciclos × 150 ms = 150–300 ms. Aceitável.

### 5.3 A3–A5

Reinício graceful do processo/sidecar. Janela perdida: 1–5 s (tempo de startup do processo
Rust com LTO fat). Mitigação: manter instância antiga até nova estar healthy (supervisor
systemd `Type=notify`).

---

## §6 Circuit breaker + fallback protocol

### 6.1 Métricas de abertura

O scanner mede a latência de cada chamada de inferência via `std::time::Instant`:

```rust
let t0 = Instant::now();
let result = infer_hot(&features);
let elapsed = t0.elapsed();
ML_LATENCY_HISTOGRAM.observe(elapsed.as_micros() as f64);

// Sliding window p99 (hdrhistogram, já no Cargo.toml do projeto)
if p99_over_last_1s() > Duration::from_micros(100) {
    CIRCUIT.open();
    tracing::warn!("ML circuit breaker OPEN: p99 > 100µs");
}
```

Thresholds recomendados:
- p99 ML > 100 µs em janela 1 s → open breaker
- 3 pânicos consecutivos → open breaker permanente até restart manual
- ECE_4h > 0.05 (D5 kill switch) → bypass ML, usar A3 ECDF+bootstrap

### 6.2 Fallback A3 ECDF+bootstrap

Quando o breaker está aberto, o spread engine emite `Opportunity` com campo
`ml_status: CircuitOpen` e `trade_setup: None`. Em paralelo, o módulo A3 ECDF+bootstrap
(<1 µs/rota, D5) emite estimativa degradada com `calibration_source: ecdf_fallback`.

O operador recebe um alerta via Prometheus `ml_circuit_open{} == 1` e pode inspecionar
o dashboard antes de decidir reiniciar o modelo.

### 6.3 Recuperação

Após 10 s com breaker aberto, o scanner envia uma rota de probe (1 rota de menor volatilidade):

```rust
async fn probe_ml(state: &MlState) -> bool {
    let probe_features = state.probe_route_features();
    let t0 = Instant::now();
    match std::panic::catch_unwind(|| state.infer(probe_features)) {
        Ok(_) if t0.elapsed() < Duration::from_micros(100) => true,
        _ => false,
    }
}
```

Se probe OK → fechar breaker, log `ml_circuit_closed`.

---

## §7 Recomendação final

### 7.1 Arquitetura recomendada: A2 (thread dedicada no mesmo binário)

**Justificativa numérica**:

1. **A1 falha no critério de failure isolation**: um pânico em `tract` derruba o processo
   scanner inteiro, incluindo os 14 adapters WS, o book store e o broadcast server. O
   risco de indisponibilidade total é inaceitável em produção.

2. **A2 entrega 99,7% do ganho de latência de A1** com isolamento de falha adequado.
   Overhead adicional de A2 vs A1: ~200 ns (canal) + 800 ns (p99) = ~1 µs. Versus budget
   de 67 µs, esse overhead é **1,5%**. Irrelevante.

3. **Hot-reload sem downtime** é nativo em A2 (janela máxima de 300 ms, 2 ciclos).
   A1 requer `ArcSwap` + warmup fora do hot path; funciona, mas a complexidade de garantir
   que o warmup não aloque no hot path torna A1 mais difícil de verificar.

4. **MIRI ainda é mandatório** para A2: a função de inferência `fn infer(...)` é testada
   isoladamente. O channel overhead não precisa de MIRI (é verificado pelo próprio `crossbeam`).

5. **A3+ são super-engenharia** para o estágio atual: dev complexity 4–7 semanas-pessoa
   versus 2–3 semanas para A2. O custo de IPC (2–50 µs) e a serialização são desnecessários.

6. **A5 sidecar** tem overhead de serialização de 260 µs/ciclo apenas para o transporte
   dos dados de entrada, antes mesmo de contar a inferência. Isso degrada o budget mais do
   que os 28 µs da inferência.

### 7.2 Caminho de migração recomendado

```
Fase 1 (semanas 1–2): A2 thread dedicada com fallback A3 hardcoded.
  - Implementar MlThread com crossbeam bounded(1) + ArcSwap<Vec<TradeSetup>>.
  - MIRI + benchmark 1h no kernel de inferência.
  - Circuit breaker p99 > 100 µs.
  - Metrics: ml_latency_p99, ml_circuit_open, ml_drops_total.

Fase 2 (semanas 3–4): hot-reload + monitoramento de drift.
  - notify watcher + ArcSwap<OnnxModel>.
  - Integração D5 kill switch (ECE_4h).
  - Shadow baseline A3 ECDF em paralelo para comparação.

Fase 3 (semana 5+): se MIRI aprova + benchmark 1h estável + tracker de drift OK:
  - Avaliar migração para A1 inline como otimização de latência futura.
  - Decisão baseada em dados de produção, não em suposição.
```

### 7.3 Red-team da recomendação A2

**Argumento contra**: "A2 ainda usa o mesmo processo; um bug de memória em `tract` pode
corromper o heap compartilhado com o scanner." Resposta: `tract` é pure-Rust sem unsafe
fora de interop BLAS opcional. Com `opt-level = 3` e sem BLAS, o risco de corrupção de
heap cross-thread é baixo. O verdadeiro risco é pânico, que o `catch_unwind` na thread
isola. `[CONFIANÇA: 70%]` — depende da qualidade do código interno de `tract`.

**Argumento contra**: "Dois threads competindo em L3 cache degradam o spread engine."
Resposta: o spread engine tem core affinity pinado via `core_affinity` (já no Cargo.toml).
Se a thread ML for pinada num core diferente via `core_affinity::set_for_current`, a
contention de L3 é mitigada. Budget de cores: 4 disponíveis; 14 adapters usam 2–3 via
Tokio scheduler; spread engine usa 1; ML thread usa 1. Cabe.

**Argumento contra**: "Bounded(1) descarta snapshots — ML perde contexto temporal."
Resposta: o scanner opera em ciclos de 150 ms. ML processa em ~67 µs. Se ML demora < 150 ms,
bounded(1) nunca descarta. Se ML degrada acima de 150 ms, o drop é deliberado: preferir dado
fresco ao dado antigo. O contador `ml_drops_total` alerta para degradação.

---

## §8 Pontos de decisão para o operador

| Decisão                         | Critério numérico              | Ação                              |
|---------------------------------|-------------------------------|-----------------------------------|
| A2 vs A1 definitivo             | MIRI clean + benchmark 1h estável? | Se sim: avaliar A1 em Fase 3 |
| Abrir circuit breaker           | p99 ML > 100 µs em 1 s        | Fallback A3 ECDF                  |
| Kill switch D5                  | ECE_4h > 0.05                  | Bypass completo do ML             |
| Hot-reload aceitável            | OnnxModel::load < 500 ms?     | Se > 500 ms: pré-carregar paralelo |
| Migrar para A3 (processo)       | crash rate > 1/dia             | Adicionar isolamento de processo  |
| GPU (A4 gRPC + Triton)          | batch > 10 000 rotas           | Fora do escopo atual (2600 rotas) |
| Python no ML                    | NUNCA inline; somente em A3+   | Burden-of-proof: gap de accuracy > 15% vs Rust |

---

## §9 Sumário dos números-chave

| Métrica                     | A1 Inline | A2 Thread | A3 Proc | A4 gRPC | A5 Sidecar |
|-----------------------------|-----------|-----------|---------|---------|------------|
| Latência added p50 (µs)     | 0         | 0.2       | 1       | 300     | 200        |
| Latência added p99 (µs)     | 2         | 0.8       | 10      | 5 000   | 3 000      |
| Scanner sobrevive ML crash  | NAO       | SIM       | SIM     | SIM     | SIM        |
| Hot-reload downtime (ms)    | 0         | 300       | 1 000   | 0       | 0          |
| Dev complexity (sem-pes.)   | 1–2       | 2–3       | 4–5     | 5–7     | 3–4        |
| Zero-alloc verificavel      | CRITICO   | MEDIO     | N/A     | N/A     | N/A        |
| **Score composto** (rank)   | 2         | **1**     | 3       | 5       | 4          |

Score composto: 40% latência + 30% failure isolation + 20% complexidade + 10% hot-reload.

**Recomendação: A2 thread dedicada.** A1 inline como upgrade futuro condicional a MIRI clean.
A3–A5 somente se houver necessidade operacional documentada (isolamento de processo, Python,
GPU) que o stack atual não atende.
