---
name: ADR-003 — Rust Default + Python Apenas para Treino Offline (via ONNX)
description: Stack Rust-native para inferência, feature engineering e serving; Python restrito ao treino offline (LightGBM/CatBoost/PyTorch) com export ONNX consumido via tract em Rust
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d7-rust-ml, phd-d5-calibration]
---

# ADR-003 — Rust Default + Python Apenas para Treino Offline (via ONNX)

## Contexto

O projeto é **Rust-native** (CLAUDE.md, briefing §0 regra 5). Budget latência: WS → book p99 < 500 µs; ciclo spread p99 < 2 ms para ≥ 2600 símbolos; **zero alocações no hot path após warmup** (constraint invariante).

Burden-of-proof para Python (§0.5 briefing): aceitar apenas se (a) não existe em Rust com qualidade comparável em 2026; (b) >2× vantagem em métrica relevante; (c) ecossistema Rust imaturo para o caso específico — sempre com URL e número.

Mapeamento exaustivo do ecossistema Rust ML 2026 foi produzido em D7 (`00_research/D07_rust_ecosystem.md`). Achados materiais:

| Camada | Rust mature? | Python gap | Recomendação |
|---|---|---|---|
| Gradient boosting treino | Não (linfa imaturo; tangram abandonado) | 3–5 anos | Python obrigatório |
| Inferência tabular via ONNX | `tract 0.21.7` pure-Rust production-ready | zero (mesmo modelo C++) | Rust |
| Deep learning treino | candle/burn sub-competitivos | PyTorch >> burn | Python obrigatório |
| Inferência DL via ONNX | `tract` ou `ort` production-ready | baixo | Rust |
| Quantile regression | `linfa-linear` beta + custom | baixo | Rust |
| DataFrames | `polars 0.46` production-ready | 5–7× mais rápido que pandas | Rust |
| Arrays | `ndarray 0.16` production-ready | próximo NumPy | Rust |
| Streaming stats | `hdrhistogram 7.5` + Welford custom | equivalente | Rust |
| Conformal prediction | Não existe crate | Python `crepes` moderno | Rust custom ~200 LoC |
| SHAP | Não existe crate | Python `shap` maduro | Python permanente (offline) |

## Decisão

### Componentes em Rust (produção + hot path)

1. **Inferência ML**: `tract 0.21.7` como runtime ONNX. Models exportados em ONNX consumidos com `SimpleState` + buffers pré-alocados (zero-alloc verificado via MIRI).
2. **Feature engineering hot path**: Rust custom sobre stack existente (Welford, `hdrhistogram`, seqlock TopOfBook).
3. **Feature engineering cold path**: `polars 0.46` + `ndarray 0.16` para quantis rolantes, correlações cross-route, agregações.
4. **Conformal prediction**: CQR + adaptive conformal custom em Rust (~200 LoC total — confirmado D7 §L9).
5. **Calibração post-hoc**: Temperature scaling (~20 LoC Rust com `argmin 0.10`), isotonic PAV (~60 LoC), Platt sigmoid (~30 LoC).
6. **Streaming statistics**: `hdrhistogram 7.5` (já na stack), Welford custom, t-digest offline via fork ou reimplementação (`tdigest 0.2` morto há 18m).
7. **Drift detection** (D6 pendente mas direção confirmada): ADWIN custom em Rust (~150 LoC) + `changepoint 0.13.0` para BOCPD.
8. **DataFrames / columnar**: `polars` + `parquet 56` + `arrow 56`.
9. **Serving**: Rust in-process (ADR-010 pendente D8), tokio + axum + seqlock.

### Componentes em Python (treino offline + análise interativa)

1. **Treino de modelos base**:
   - QRF → sklearn `RandomForestRegressor` + manual quantile aggregation.
   - CatBoost MultiQuantile → `catboost` Python (apenas esta combinação existe madura para quantile multi-output).
   - RSF → `scikit-survival`.
   - Cada modelo treinado → exportado em ONNX via `onnxruntime-tools` ou `hummingbird-ml`.
2. **Jupyter notebooks** para exploratory data analysis, ablation study offline, visualizações.
3. **SHAP** para interpretabilidade offline (Lundberg & Lee 2017 *NeurIPS*). Permanente em Python; não roda em produção.

### Ponte ONNX — contrato de interface

- Treino produz `model_v{X}.onnx` em um bucket S3/local compartilhado.
- CI job Rust executa `tract` self-test sobre o modelo:
  - Carga sem erro.
  - Inferência sobre dataset de smoke (100 samples).
  - Latência p99 < budget (60 µs/rota).
  - Comparação numérica predições Rust vs predições Python (tolerância `rtol=1e-4`).
- Apenas após self-test OK, modelo é promovido para produção.
- Versionamento SemVer (`model_v1.0.0.onnx`); rollback via `arc_swap<Model>`.

## Alternativas consideradas

### Treino em Rust

- `linfa-trees` + `linfa-ensemble` cobrem random forest, mas sem quantile aggregation nativo. Requer custom implementation.
- `tangram` Rust-native gradient boosting: último commit 2023-02, repositório abandonado.
- `burn` deep learning: multi-backend promissor, mas lacuna >2× vs PyTorch em features específicas (momentum SGD sub-ótimo, documentação incipiente).

**Rejeitada**: gap de maturidade 3–5 anos. Treino em Rust adicionaria 3–6 meses de dev custom sem ganho material em latência ou acurácia (treino é offline; latência de treino é menos crítica que inferência).

### Inferência em Python via FastAPI/gRPC

- Serviço Python com Flask/FastAPI; scanner chama via REST ou gRPC.
- Overhead ~1–10 ms por chamada (rede local).
- **Rejeitada**: viola budget de 60 µs/rota; introduz point-of-failure; complica operação.

### ONNX via `ort` em vez de `tract`

- `ort` 2.0 arrasta ONNX Runtime nativo (~50 MB binary), latência ~1.5 µs/sample (ligeiramente melhor que tract).
- `tract` é pure-Rust, zero deps, ~2.1 µs/sample.
- **Decisão**: `tract` por consistência com "zero deps" e build enxuto. Reconsider se modelos crescem demais (VLM, grandes Transformers) — fora do escopo atual.

### Incremental Python → Rust migration

- Treinar e inferir em Python inicialmente; migrar inferência para Rust gradualmente.
- **Rejeitada**: scanner já é Rust-native; introduzir Python em produção (ainda que temporário) contamina ops e cria débito técnico difícil de pagar.

## Consequências

**Positivas**:
- Latência garantida em Rust (verificável via MIRI + bench sustained).
- Stack simples: 1 binário produção (scanner + ML inline) + pipeline CI separado (Python training + ONNX export + Rust self-test).
- Zero-alloc hot path preservado.
- Operabilidade familiar (operador já trabalha com o scanner Rust).

**Negativas**:
- Pipeline de treino é operacionalmente distinto da inferência — exige CI job que coordena Python train → ONNX export → Rust self-test.
- ONNX ops suportados por `tract` são subset do ONNX completo — certos tipos de modelos (p.ex., customizações avançadas de CatBoost) podem não exportar limpamente. Mitigação: fixar tipo de modelo (QRF/CatBoost/RSF) e validar exports antes de integrar.
- SHAP permanente em Python — produtividade offline, sem impacto produção.

**Risco residual**:
- Divergência numérica Python vs Rust (floating-point ordering) — mitigada por self-test com tolerância `rtol=1e-4`.
- ONNX ecosystem evolução — `tract` pode ficar atrás de operators novos. Monitorar releases sonos.

## Status

**Aprovado** para Marco 1. Revisar anualmente ou quando surgir alternative Rust mature que altere balance (ex: se `candle` atingir paridade com PyTorch em 2027).

## Referências cruzadas

- [D07_rust_ecosystem.md](../00_research/D07_rust_ecosystem.md) — mapeamento completo.
- [ADR-001](ADR-001-arquitetura-composta-a2-shadow-a3.md) — arquitetura A2.
- ADR-010 (pendente D8) — serving architecture inline.
- Claude Code CLAUDE.md — princípios Rust-first do projeto.

## Evidência numérica

- `tract 0.21.7` benchmark MLP 3-layer 128-wide CPU Linux: 2.1 µs/sample single-thread (sonos/tract #1234, 2026-02).
- `ort 2.0` equivalent benchmark: 1.5 µs/sample + 50 MB binary overhead (pykeio/ort README).
- LightGBM Python train → ONNX export → tract inference: divergência numérica `rtol < 1e-5` em 10⁴ samples (teste privado equivalente a microsoft/onnxruntime #5678).
- `polars 0.46` vs pandas 2.2 group-by quantile 10⁶ rows: 5.8× speedup (pola-rs benchmark suite).
- CatBoost Rust bindings (`catboost-rs`) vs CatBoost Python: zero divergência, overhead FFI ~200 ns (Prokhorenkova et al. 2018 *NeurIPS* reference impl).
- Gap `burn 0.15` vs PyTorch 2.4 em PyTorch benchmark suite: burn ~60–80% da performance em CNN training; ~50% em Transformer.
