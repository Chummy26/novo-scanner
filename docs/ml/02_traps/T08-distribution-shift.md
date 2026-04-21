---
name: T08 — Distribution Shift entre Treino e Inferência
description: Longtail crypto tem não-estacionariedade severa; tratamento em 3 camadas: adaptive conformal (lento), ADWIN (moderado), retreino emergencial (abrupto)
type: trap
status: addressed
severity: critical
primary_domain: D5
secondary_domains: [D6, D2]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T08 — Distribution Shift entre Treino e Inferência

## Descrição

Cripto longtail tem não-estacionariedade severa e **característica do regime** (D2):

- **15–30 listings/mês** — novas rotas surgem com propriedades próprias.
- **2–5 halts/mês** — shift abrupto de distribuição.
- **3–8 delistings/mês** — liquidez some.
- **Funding schedule changes** — timing de custo altera.
- **Fee tier updates** — mudança silenciosa no custo operacional.
- **Eventos macro** (CPI, FOMC, regulatory) — correlação cross-asset muda.

Modelo treinado em janela X opera em janela X+k com distribuição diferente → calibração silenciosamente quebra. Sem detecção ativa, deteriora dias-semanas antes de operador perceber.

## Manifestação empírica

- ECE global sobe de 0.02 → 0.08 sustentado após halt de venue principal (MEXC, ex-caso 2025-11).
- Precision@10 cai 40% em regime event sem que alarm clássico (AUC drop) dispare — precision é muito sensível a calibração.
- Operador continua consumindo recomendações sem saber que são agora descalibradas — erode confiança.

## Tratamento (E5 Hybrid — ADR-011)

### Camada 1 — Adaptive Conformal γ=0.005 (ADR-004 Camada 3) — drift lento

`α_t+1 = α_t + γ·(α* − 𝟙[y_t ∉ IC_t])` (Gibbs & Candès 2021 *NeurIPS*).

Compensa distribution shift **lento** sem retreino. Zero custo adicional.

### Camada 2 — ADWIN sobre residuais de calibração — drift moderado

Bifet & Gavaldà 2007 *SDM*:
- δ=0.001 (falso alarme < 1/1000).
- Detecta shift de 0.05 em erro em < 200 amostras.
- Aplicado sobre `|prob_predita − outcome_real|` (residuais diretos).
- ~120 LoC Rust custom (confirmado D6).

**Ação**: dispara retreino emergencial (Camada 3).

### Camada 3 — Retreino emergencial — drift abrupto

- Trigger: ADWIN fires OR ECE_4h > 0.05 (kill switch D5).
- Pipeline: dump 14 dias feature store → purged K-fold K=6 → ONNX export → Rust self-test → hot-reload.
- Duração alvo: < 45 min.
- Rollback automático se precision@10_novo degradou.

### Secundário — Calibração estratificada por regime (ADR-004 Camada 2)

3 calibradores Temperature Scaling separados (calm / opportunity / event). Regime shift dentro do modelo é detectado e calibração específica aplicada.

### Terciário — Kill switch fallback (ADR-010)

ECE_4h > 0.05 OR coverage < nominal − 0.05 → fallback A3 ECDF+bootstrap (ADR-001) com flag `calibration_status: kill_switch_active`.

### Quaternário — Scheduled nightly retrain (ADR-011 T1)

Cobre drift gradual abaixo do radar do ADWIN. 04:00 UTC, janela rolante 14 dias.

## Residual risk

- **IID formalmente violado** (H~0.8, spillover >70%) → cobertura CQR não **formalmente** garantida. Mitigação: validação empírica via purged walk-forward + stationary bootstrap (Politis & Romano 1994 *JASA* 89).
- **ADWIN false positives** em regime event legítimo (não drift, apenas outlier). Mitigação: δ=0.001 conservador; logs detalhados em `08_drift_reports/`.
- **Retreino contaminado** por feedback loop (T12). Mitigação: exclusão `was_recommended` + auditoria ECE split.
- **Recovery time ainda alto** em shifts muito abruptos (< 2h melhor que 13–37h E1 puro, mas ainda vulnerável).

## Owner do tratamento

- ADR-011 (primário — E5 Hybrid).
- ADR-004 (secundário — calibração estratificada + adaptive).
- ADR-010 (terciário — kill switch fallback).

## Referências cruzadas

- [ADR-011](../01_decisions/ADR-011-drift-detection-e5-hybrid.md).
- [ADR-004](../01_decisions/ADR-004-calibration-temperature-cqr-adaptive.md).
- [ADR-010](../01_decisions/ADR-010-serving-a2-thread-dedicada.md).
- [D06_online_drift.md](../00_research/D06_online_drift.md).
- [D05_calibration.md](../00_research/D05_calibration.md).
- [T12_feedback_loop.md](T12-feedback-loop.md).

## Evidência numérica citada

- D2 eventos: 15–30 listings + 2–5 halts + 3–8 delistings /mês longtail.
- Adaptive γ=0.005: Zaffran et al. 2022 *ICML* — cobertura empírica dentro de 1pp de nominal em M4.
- ADWIN detect 0.05 error shift < 200 samples (Bifet & Gavaldà 2007 *SDM*).
- HAT online vs batch RF gap 11% (Losing, Hammer & Wersing 2018 *Neurocomputing* 275).
- Recovery time E1 puro 13–37h vs E5 Hybrid < 2h (D6 §análise comparativa).
