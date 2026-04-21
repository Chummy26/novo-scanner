---
name: ADR-001 — Arquitetura Composta A2 com Baseline Shadow A3
description: Adoção de arquitetura composta (QRF + CatBoost MultiQuantile + RSF + agregador conformal) para o recomendador TradeSetup, com baseline ECDF+bootstrap rodando sempre em shadow
type: adr
status: approved
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
supersedes: null
reviewed_by: [phd-d1-formulation, phd-d5-calibration]
---

# ADR-001 — Arquitetura Composta A2 com Baseline Shadow A3

## Contexto

O problema de recomendação do TradeSetup exige **distributional forecasting conjunto** sobre `(S_entrada(t), S_saída(t'))` com `t' ∈ [t, t+T_max]`, condicionado em features atuais (D3). A partir da distribuição conjunta, o modelo deve extrair:

- `enter_at` — threshold ótimo sob utilidade configurada.
- `exit_at` — threshold de saída emparelhado.
- `gross_profit = enter_at + exit_at` — identidade tautológica do PnL bruto (§3 skill).
- `realization_probability` — calibrada, com ECE < 0.02.
- `expected_horizon_s` — first-passage time com quantis (mediana + p25 + p75 + p95).
- `confidence_interval` — cobertura empírica ≥ nominal.

Cinco arquiteturas foram avaliadas em D1 (relatório `00_research/D01_formulation.md`):

| # | Arquitetura | Latência est. | Calibração | Cold-start | Coerência identidade |
|---|---|---|---|---|---|
| A1 | Monolítica (NGBoost multi-output ou CQR multivariado) | ~60 µs | pós-hoc | ruim | não garantida |
| **A2** | **Composta (QRF entry + CatBoost MultiQuantile exit\|entry + RSF horizon + agregador conformal)** | **~28 µs** | **natural por componente** | **OK via partial pooling D3** | **validável post-hoc** |
| A3 | ECDF + bootstrap empírico condicional | <1 µs | direto | ruim | trivialmente OK |
| A4 | Bayesian hierarchical com MCMC | >1 ms inferência | excelente | excelente | OK |
| A5 | Reinforcement Learning (PPO) | variável | sem garantia | catastrófica | não |

## Decisão

Adotar **A2 composta como arquitetura primária** do recomendador em produção.

Adotar **A3 ECDF + bootstrap como baseline shadow** rodando sempre em paralelo:
- Atua como safety-net no kill switch (ADR-004): se ECE_4h > 0.05 ou precision@k degrada, sistema regride para A3 até retreino emergencial.
- Serve como barra de comparação absoluta — qualquer futura evolução do modelo precisa superar A3 em pelo menos 5 pp de AUC-PR e 2 pp de precision@10 para justificar complexidade adicional.
- Latência desprezível (<1 µs/rota) permite rodar sempre, sem custo operacional material.

A4 (Bayesian MCMC) e A5 (RL) são **rejeitadas**:
- **A4**: latência MCMC ~1 ms viola budget de 60 µs/rota; ecossistema Rust Bayesian maduro (<10% cobertura PyMC/Stan em 2026 — D7) inadequado.
- **A5**: amostra-eficiência catastrófica (PPO precisa ≥10⁶ trajetórias — Dulac-Arnold et al. 2021 *ML Journal* 110); sem calibração nativa; overfitting severo em baixo SNR; complexidade operacional desproporcional.

A1 (monolítica) é **rejeitada por ora**:
- Calibração pós-hoc multi-output é mais frágil que calibração por componente.
- Cold-start fraco (modelo único não herda prior de cluster de rotas).
- Fica como candidato de revisão em V3 se A2 mostrar limitações.

## Alternativas consideradas

Ver tabela acima. Adicionalmente, **não-arquiteturas**:

- **Ensemble de A1 + A2**: overhead de complexidade sem ganho mensurável esperado.
- **Deep learning (Transformer, TCN)**: rejeitado em §7 anti-padrões sem benchmark direto vs boosting/regras simples neste regime (baixo SNR, não-estacionário, 2600 séries paralelas curtas). Não há evidência publicada de DL vencer CatBoost/LightGBM em regime de baixa SNR com amostra < 10⁷ (Makridakis M5 2022 confirma).

## Consequências

**Positivas**:
- Latência de inferência controlada (~28 µs D1 + ~39 µs D3 + <60 ns D5 = ~67 µs single-thread; folga 3× com 4 cores paralelos).
- Calibração por componente é mais auditável (cada quantile regressor tem reliability diagram próprio).
- Fallback A3 reduz risco operacional — sistema nunca "fica sem resposta".
- Compatível com treino Python offline + ONNX export + inferência Rust (ADR-003).

**Negativas / Trade-offs**:
- Manutenção de dois sistemas (A2 produção + A3 shadow) aumenta carga operacional em ~15%.
- Coerência interna entre componentes não é por construção — exige **validador Rust** que verifica pós-emissão que `P ≥ τ_min` e que `sum_inst ≤ structural_cap` (identidade do §2 skill). Implementação: ~50 LoC; overhead < 1 µs.
- Decomposição (enter_at, exit_at) é pós-processamento determinístico com **floor na `exit_at`** para evitar trivial partition.

**Risco residual**:
- Regime shift severo (halt exchange-wide) pode colapsar simultaneamente A2 e A3 — mitigação via ADR-011 (drift detection — pendente D6).
- Longtail de longtail (rotas com n < 500 histórico) não atendidas por A2 — abstém com `InsufficientData` (ADR-005).

## Status

**Aprovado** para Marco 1 (MVP). Revisão obrigatória após 60 dias de shadow mode (D10 pendente) com métricas empíricas coletadas. Triggers para revisão:

- A2 não supera A3 em ΔAUC-PR ≥ 0.05 → considerar simplificação para A3 puro.
- A2 atinge ECE > 0.05 sustentado em ≥ 2 estratos → revisar arquitetura (possível migração parcial para A4 Bayesian).

## Referências cruzadas

- [D01_formulation.md](../00_research/D01_formulation.md) — análise completa das 5 arquiteturas.
- [D05_calibration.md](../00_research/D05_calibration.md) — calibração por componente + CQR.
- [D07_rust_ecosystem.md](../00_research/D07_rust_ecosystem.md) — viabilidade Rust inference.
- [ADR-003](ADR-003-rust-default-python-bridge.md) — treino Python + inferência Rust.
- [ADR-004](ADR-004-calibration-temperature-cqr-adaptive.md) — stack de calibração.
- [ADR-008](ADR-008-joint-forecasting-unified-variable.md) — modelagem conjunta via `G(t,t')`.

## Evidência numérica principal

- Latência `tract 0.21.7` inference MLP 3-layer 128-wide: ~2.1 µs/sample (sonos benchmark, D7 relatório §L3).
- CatBoost MultiQuantile inference via ONNX: ~15 µs/sample extrapolado de benchmarks catboost-inference (Prokhorenkova et al. 2018 *NeurIPS*).
- QRF (Meinshausen 2006 *JMLR* 7) com 100 árvores × depth 8 em ndarray: ~8 µs/sample.
- RSF (Ishwaran et al. 2008 *Annals of Applied Statistics* 2(3)) com 50 árvores: ~5 µs/sample.
- Agregador conformal split (Papadopoulos et al. 2002 ECML): <100 ns (quantile lookup).
