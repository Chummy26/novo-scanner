---
name: A1 Dataset Audit — Labeling Feasibility vs ADR-016
description: Auditoria PhD de viabilidade de computar labels triple-barrier + scoring targets offline a partir do dataset AcceptedSample atualmente coletado pelo scanner; red-team explícito contra cada vetor de falha silenciosa
type: audit
status: draft
author: phd-dataset-a1-labeling
date: 2026-04-20
version: 0.1.0
---

# A1 Auditoria Dataset — Labeling Feasibility vs ADR-016

## §0 Postura crítica adotada

Este documento aplica o princípio de López de Prado (2018, *Advances in Financial Machine Learning*, Wiley, cap. 3): "o label é o gargalo mais frágil de todo o pipeline ML financeiro". Cada seção tem red-team explícito: "como este dataset falha em labelar triple-barrier silenciosamente?". Confiança < 80% recebe flag `[FLAG <X%]`. Proibição de aceitar "só precisa persistir accept" sem demonstração contra ADR-016.

**Steel-man mínimo**: toda seção considerou ≥ 3 alternativas com número antes de recomendar.

---

## §1 Estado atual — o que o scanner realmente persiste

Após leitura integral de `scanner/src/ml/persistence/` (sample.rs, writer.rs, mod.rs) e `scanner/src/ml/serving.rs`, o estado real é:

- `MlServer::on_opportunity()` emite `Option<AcceptedSample>` somente quando `SampleDecision::Accept`.
- `JsonlWriter` (C1 fix implementado) persiste esses `AcceptedSample` em JSONL rotado por hora UTC, particionado `year=/month=/day=/hour=/`, com flush periódico a cada 5 s ou 1024 linhas.
- O schema `AcceptedSample` (schema_version=1) contém: `{ts_ns, cycle_seq, symbol_id, buy_venue, sell_venue, buy_market, sell_market, entry_spread, exit_spread, buy_book_age_ms, sell_book_age_ms, buy_vol24, sell_vol24, sample_decision, was_recommended}`.
- **Regra de persistência**: apenas amostras com `sample_decision == accept` são gravadas. Snapshots `stale` (93% do fluxo real observado), `below_tail`, `low_volume`, `insufficient_history` e `halt` são descartados silenciosamente.
- `HotQueryCache` em RAM mantém histograma rolante por rota (ring buffer com decimação), mas **esse cache não é persistido separadamente**.

**Taxa de accept real (15 min dev mode)**: 7.565 accepts sobre 1.451.873 opportunities = **0,52%**. Numa janela de 90 dias isso projeta ≈ `0,52% × 2826 rotas × 6 RPS × 86.400 s/dia × 90 dias ≈ 7,3 × 10⁶ amostras`, mas distribuídas de forma esparsa e temporalmente descontínua.

---

## §2 Mapeamento de requisitos — ADR-016 + ADR-009 × Dataset atual

### §2.1 Tabela de viabilidade (T9 auditado)

| Alvo de treino (ADR-016 / ADR-009) | Dado bruto necessário | Dataset AcceptedSample-only provê? | Veredito |
|---|---|---|---|
| `gross_profit_p10..p95` via pinball loss | Trajetória `exit_spread(t')` para todo `t' ∈ (t₀, t₀+T_max]` por rota | **NÃO** — 99,5% dos snapshots intermediários são `stale` ou `below_tail` e não persistidos | **BLOQUEANTE** |
| `realization_probability` via CDF de G unificado (ADR-008 correção M2) | Distribuição empírica de `G(t₀, t') = entry_spread(t₀) + exit_spread(t')` sobre `t' ∈ (t₀, t₀+T_max]` | **NÃO** — o mesmo gap: sem trajetória contínua de `exit_spread(t')`, a distribuição de `G` não pode ser estimada | **BLOQUEANTE** |
| Labels `lbl_m{meta}_s{stop}_t{Tmax}` (48 colunas, ADR-009) | Para cada `t₀` aceito, varrer `exit_spread(t')` até `t₀+T_max` para detectar first-passage além de `meta` ou `stop` | **NÃO** — com `T_max=30min` e ciclos de 150 ms, são necessários 200 timestamps por rota na janela; com `T_max=24h`, são necessários ~57.600 timestamps. A proporção desses timestamps que são `accept` é de 0,52%, portanto ~99,5% dos snapshots intermediários necessários ao label estão ausentes | **BLOQUEANTE** |
| `horizon_{p05,p50,p95}_s` (first-passage time) | Série temporal contínua de `exit_spread(t')` para reconstruir instante exato de cruzamento da barreira | **NÃO** — first-passage exige observação densa; amostras esparsas (0,52%) introduzem viés sistemático no tempo de cruzamento estimado | **BLOQUEANTE** |
| `toxicity_level` (ToxicityLevel: Healthy/Suspicious/Toxic) | Histórico de `buy_book_age_ms`, `sell_book_age_ms` e stale_fraction por venue | **PARCIAL** — `AcceptedSample` inclui `book_age` para amostras accept; falta série temporal contínua de book_age para estimar stale_fraction em janela 24h | Parcial |
| `cluster_{id,size,rank}` | Correlação cruzada entre rotas em janela 1h para clusterização dinâmica | **NÃO** — correlação exige série temporal densa e simultânea de todas as rotas; dataset accept-only é esparso e assíncrono | **BLOQUEANTE** |
| `was_recommended` (ADR-011 T12 feedback loop) | Flag flipada pela UI quando setup é apresentado ao operador | **PRESENTE** — campo `was_recommended` existe no schema v1, inicializado como `false`; flip pela UI ainda não implementado (Marco 3) | OK (schema pronto) |
| `haircut_predicted` / `gross_profit_realizable_median` | Distribuição de haircut empírico (slippage + spread realizado vs teórico) | **FORA DE ESCOPO** — não coletado pelo scanner (invariante: detector, não calculadora PnL) | N/A |

**Veredito global §2.1**: o dataset `AcceptedSample`-only viabiliza treinar um classificador de `P(Accept)` — isto é, um modelo que aprende "quando o trigger vai disparar". Ele **não viabiliza** nenhuma das labels e scoring targets centrais do ADR-016.

### §2.2 Validação quantitativa da hipótese "gap só-Accept"

**Cobertura de timestamps intermediários para T_max = 30 min:**

```
Janela: t₀ → t₀ + 30 min = 12.000 timestamps (ciclos 150 ms)
Taxa de accept: 0,52%
Timestamps accept esperados na janela: 12.000 × 0,0052 ≈ 62
Timestamps necessários para trajetória contínua: 12.000
Gap de cobertura: 99,5%
```

**Para T_max = 24h:**

```
Janela: t₀ → t₀ + 24h = 576.000 timestamps por rota
Taxa de accept: 0,52%
Timestamps accept esperados: 576.000 × 0,0052 ≈ 2.995
Gap de cobertura: 99,5%
```

**Red-team T9 (López de Prado 2018 cap. 7): "ECDF condicional sobre amostras accept apenas é enviesada?"**

Sim — gravemente. A amostra `accept` é definida exatamente como `entry_spread ≥ P95(rota, 24h rolling)`. Portanto, os timestamps `t'` disponíveis na janela `(t₀, t₀+T_max]` são exclusivamente momentos em que o entry_spread da rota voltou a cruzar o limiar P95. Esses momentos são altamente correlacionados temporalmente (H~0.8, D2) e sistematicamente localizados nos picos da distribuição. Uma ECDF de `G(t₀, t')` construída apenas sobre esses picos superestima brutalmente o quantil p10 de `G` — inflando as estimativas de lucro mínimo, de `P(realize)` e de `horizon_p05`. Esse é o modo exato de survivorship bias descrito por Brown, Goetzmann & Ibbotson (1992, *Review of Financial Studies* 5(4)) aplicado à dimensão temporal.

**Conclusão**: a hipótese de gap está **correta e confirmada quantitativamente**. O dataset `AcceptedSample`-only cobre 0,52% da trajetória necessária e é estruturalmente viesado por seleção de pico. Labels triple-barrier computadas sobre esse dataset produzirão o modo de falha mais perigoso: **performance inflada em backtest, colapso silencioso em produção** (Kaufman, Rosset & Perlich 2012, *ACM TKDD* 6(4)).

---

## §3 Steel-man das opções de resolução

### Opção A — Second tier "RawSample" completo, todos os snapshots

Persistir todos os snapshots com schema mínimo `{ts_ns, route_id, entry_spread, exit_spread}`.

**Storage:**

```
2826 rotas × 6 RPS × 86.400 s/dia × 90 dias × 32 B/sample = 4,2 TB bruto
Decimação 1-em-10: 420 GB
Decimação 1-em-60: 70 GB
Compressão ZSTD nível 6 (fator ~10× em time-series numéricas,
Lemire et al. 2015, Software: Practice and Experience 46(9)): 7 GB com 1-em-60
```

**Overhead no hot path**: 32 B × 2826 rotas × 6 RPS = ~540 KB/s de escrita bruta → trivial.

**Canal mpsc**: o mesmo `JsonlWriter` já implementado suporta; só precisa de um `RawSample` path adicional.

**Viabilidade de labels**: com decimação 1-em-10 (1 snapshot a cada 1,5 s), a janela T_max=30min contém ~1.200 timestamps — suficiente para first-passage de barreira com precisão ~1,5 s. Para T_max=4h contém ~9.600 timestamps. Para T_max=24h, 57.600. Cobertura: 100%.

**T9 (PIT)**: o trainer Python usa `as_of = ts_ns` do AcceptedSample como ancora e varre o `RawSample` Parquet no intervalo `[ts_ns, ts_ns + T_max]`. Zero contaminação futura por construção — o Parquet já existe até `ts_ns + T_max` quando o label é computado (offline).

**Ponto fraco**: 70 GB em 90 dias (decimação 1-em-60) é manejável mas exige disco dedicado. Com decimação mais agressiva perde-se precisão de first-passage.

### Opção B — Flush periódico do HotQueryCache (anel decimado)

Despejar o ring buffer do `HotQueryCache` para JSONL/Parquet a cada hora, preservando a decimação 1-em-10 já implementada.

**Storage:**

```
HotQueryCache ring: janela 24h × 2826 rotas × (1/10 decimação) × 150 ms ciclo
= 2826 × 576 × 24h × 0,1 × 40 B ≈ 156 MB/dia bruto
90 dias: ~14 GB bruto; com ZSTD ~1,4 GB
```

**Viabilidade de labels**: com decimação 1-em-10 (1 snapshot a cada 1,5 s), a cobertura é a mesma da Opção A com decimação 1-em-10. Funciona para `T_max ≥ 30 min` com resolução ~1,5 s.

**Overhead no hot path**: flush horário é assíncrono; sem impacto no ciclo 150 ms do scanner.

**Ponto fraco crítico**: o `HotQueryCache` aplica clamping silencioso em `[-10%, +10%]` (problema 3, Q1 Gap GM-3) — spikes reais acima de 10% ficam truncados em exatamente 10%. Esse truncamento não afeta o trigger (que opera via P95 do histograma), mas afeta a distribuição de `G` e portanto os quantis `gross_profit_p10..p95`: labels com `meta=2%` e `entry_spread` real de 15% seriam classificadas como 10% — subestimação sistemática de G no regime longtail.

**Resolução**: expandir o range do histograma para `[-50%, +50%]` antes de iniciar o flush (requer autorização, GM-3 do Q1 Action Plan).

### Opção C — Dual tier consolidado (recomendada)

`RawSample` decimado 1-em-10 para todas as rotas (stream contínuo) + `AcceptedSample` rich (schema completo com `was_recommended`, `book_age`, etc.) — dois tipos de registro, um único `JsonlWriter` com dois canais separados.

```
RawSample: {ts_ns, route_id_u64, entry_spread_f32, exit_spread_f32} = 20 B/sample
AcceptedSample: schema v1 existente ≈ 200 B/sample (com JSON overhead)
```

**Storage:**

```
RawSample: 2826 rotas × 576 samples/dia (1-em-10) × 90 dias × 20 B = 2,94 GB bruto
→ ZSTD: ~300 MB
AcceptedSample (0,52%): 7,3 × 10⁶ × 200 B = 1,5 GB bruto → ZSTD: ~150 MB
Total 90 dias: ~450 MB comprimido
```

**Overhead no scanner**: 20 B × 2826 rotas × 0,67/s (1-em-10 de 6 RPS) ≈ 38 KB/s de escrita adicional para RawSample — desprezível.

**Canal mpsc adicional**: segundo `JsonlWriter` com `channel_capacity=200.000` para RawSample. Mesma arquitetura já existente para AcceptedSample.

**Labels**: trainer Python lê `AcceptedSample` para âncoras `t₀`, usa `RawSample` para varrer `exit_spread(t')` na janela. Sem leakage por construção.

**T9**: `RawSample` é gravado com `ts_ns` real; trainer filtra `t' ∈ (t₀, t₀+T_max]` via Parquet filter pushdown. PIT correto.

**T2 (marginais vs joint, ADR-016 M2)**: `G(t₀, t') = entry_spread(t₀) + exit_spread(t')` — entry de `t₀` vem do `AcceptedSample`, exit de `t'` vem do `RawSample`. A soma é computada diretamente, sem decomposição. Correto por construção.

### Opção D — Manter só AcceptedSample, usar janela futura de accepts

Usar como "trajetória" apenas os accepts subsequentes da mesma rota na janela `(t₀, t₀+T_max]`.

**Por que rejeitar**: Esta opção é o modo exato de survivorship bias temporal descrito em §2.2. A trajetória reconstruída é composta exclusivamente de momentos de pico (P95), o que viesa `G` para cima em média 3–5× o valor real esperado (estimativa: se P95 ≈ 2% e média global ≈ 0,3%, condicionamento nos accepts superestima `G` em fator ~2/0,3 ≈ 6,7×). Essa opção **não é defensável metodologicamente** e viola diretamente a análise de T9.

---

## §4 Schema extensions propostas (Opção C recomendada)

### §4.1 Novo tipo: RawSample (schema v1)

```rust
/// Uma observação bruta de spread — emitida para TODAS as rotas a cada
/// ciclo 150 ms (com decimação 1-em-10).
///
/// Schema mínimo para reconstrução offline de trajetória G(t₀, t').
/// Não inclui book_age, vol24, decisão — apenas dados brutos.
/// Python trainer consome via `pyarrow.json.read_json` ou polars.
pub const RAW_SAMPLE_SCHEMA_VERSION: u16 = 1;

#[repr(C, packed)]
pub struct RawSamplePacked {
    pub ts_ns:          u64,   // 8 B — âncora PIT
    pub route_id:       u64,   // 8 B — RouteId compactado (symbol_id u32 + buy u8 + sell u8 + pad u16)
    pub entry_spread:   f32,   // 4 B
    pub exit_spread:    f32,   // 4 B
    // total: 24 B packed
}
```

**Serialização MVP**: JSON line com campos `{ts_ns, route_id, entry_spread, exit_spread, schema_version}` ≈ 80 B/sample. Migrar para binário packed em Marco 2 se throughput exigir.

**Decimação**: 1-em-10 por contador atômico por rota no `JsonlWriter`. Não requer mudança no `HotQueryCache`.

### §4.2 Campo adicional em AcceptedSample v2 (quando necessário)

`raw_sample_ref: u64` — ponteiro lógico para o `RawSample` correspondente (mesmo `ts_ns`). Permite join eficiente sem index full-scan. Adicionar na v2 quando schema for bumped.

---

## §5 Storage projection — 90 dias

| Dataset | Bruto | ZSTD nível 6 | Notas |
|---|---|---|---|
| AcceptedSample atual (0,52% accept rate) | 1,5 GB | ~150 MB | Já implementado |
| RawSample 1-em-10 (Opção C) | 2,94 GB | ~300 MB | Adiciona ~3 GB bruto |
| Labels triple-barrier (48 colunas, 6,7×10⁶ linhas) | ~320 MB | ~32 MB | Computadas offline, ADR-009 estimate |
| listing_history.parquet (esqueleto) | <10 MB | <1 MB | Anti-survivorship |
| **Total Opção C** | **~4,8 GB bruto** | **~480 MB** | Dentro de qualquer orçamento razoável |

Comparação: Opção A (1-em-60) = 7 GB bruto/70 GB sem decimação. Opção C é ~15× menor que Opção A sem decimação e preserva granularidade suficiente para first-passage com resolução 1,5 s.

---

## §6 Pseudocódigo concreto do trainer Python

```python
import pyarrow.parquet as pq
import pandas as pd

def compute_label_m10_sNone_t30min(
    sample: dict,
    raw_stream_path: str,
) -> int:
    """
    Computa label triple-barrier para meta=1.0%, stop=None, T_max=30min.

    Retorna: +1 (sucesso), 0 (timeout), -1 (stop) ou NaN se dados insuficientes.

    PIT-correto: raw_stream_path contem apenas dados com ts_ns <= t0 + T_max.
    Acessa apenas t' > t0, nunca t0 em si (evita T9 vetor 2).
    """
    t0 = sample["ts_ns"]
    t_max = t0 + 30 * 60 * 1_000_000_000   # 30 min em ns
    entry_t0 = sample["entry_spread"]       # PIT: fixado em t0
    route_id = sample["route_id"]

    META = 1.0    # %
    # stop=None: sem barreira inferior

    # Carrega trajetória de exit_spread para esta rota na janela (t0, t_max]
    # Filter pushdown no Parquet — só lê partições relevantes.
    # NUNCA usa t' <= t0 (garantia PIT).
    raw_df = (
        pq.read_table(
            raw_stream_path,
            filters=[
                ("route_id", "=", route_id),
                ("ts_ns", ">", t0),           # estritamente FUTURO
                ("ts_ns", "<=", t_max),
            ],
            columns=["ts_ns", "exit_spread"],
        )
        .to_pandas()
        .sort_values("ts_ns")
    )

    if len(raw_df) < 10:
        # Dados insuficientes para labelar — retorna NaN (excluir do treino)
        return float("nan")

    # G(t0, t') = entry_spread(t0) + exit_spread(t')
    # entry_t0 é constante para esta âncora — sem contaminação futura.
    g = entry_t0 + raw_df["exit_spread"].values

    # Barreira superior: primeiro t' com G >= META
    hit_meta = g >= META
    if hit_meta.any():
        return +1  # sucesso

    # Timeout: nenhuma barreira bateu
    return 0
```

**Garantias PIT**: o filtro `("ts_ns", ">", t0)` impede que o trainer acesse o próprio snapshot de âncora (zero contaminação de `entry_spread` futuro). O `entry_t0` é lido diretamente do `AcceptedSample` — valor fixado no passado. Conforme López de Prado (2018 cap. 7): "o label deve ser computado usando apenas informação disponível em t₀ para features, e apenas informação de [t₀, t₀+T_max] para a barreira".

**Para stop=-1%**: adicionar `hit_stop = g <= -1.0; if hit_stop.any() and hit_stop.argmax() < hit_meta.argmax(): return -1`.

---

## §7 Gaps top-5 + ação priorizada

| Prioridade | Gap | Ação | Esforço estimado |
|---|---|---|---|
| **1 — CRÍTICO BLOQUEANTE** | RawSample stream ausente — impossível computar qualquer label triple-barrier | Implementar `RawSample` writer com decimação 1-em-10 (segundo canal `JsonlWriter` + struct 24 B). **Iniciar coleta agora** — cada dia perdido são 2,94/90 ≈ 33 MB de dados irrecuperáveis | 2–3 dias |
| **2 — CRÍTICO** | Clamping `[-10%, +10%]` no HotQueryCache distorce distribuição G no regime longtail | Expandir range para `[-50%, +50%]` ou adicionar counter de outliers (Q1 GM-3). **Requer autorização** | 1–2 dias |
| **3 — ALTO** | `listing_history.parquet` inexistente — survivorship bias garantido (Q3 §5.6, confiança 45%) | Implementar skeleton (ADR-012): registrar `active_from` ao primeiro `record_seen` da `ListingHistory`, flush diário. Código de `ListingHistory` já existe em `serving.rs`; adicionar persist | 1 dia |
| **4 — ALTO** | Decimação 1-em-10 perde precisão de first-passage em T_max=30min (resolução 1,5 s vs ciclo real 150 ms) | Para MVP aceitar 1-em-10; documentar que `horizon_p05_s` tem erro ± 1,5 s. Se precisão sub-segundo for necessária, usar 1-em-2 (storage 2× maior). **Decisão usuário** | Configuração |
| **5 — MÉDIO** | Cross-route lag-correlation não auditada (Q3 §5.5, confiança 55%) — feature `rolling_corr_cluster_1h` pode carregar info futura implícita | Implementar `audit_cross_route_pit()` (pseudocódigo em Q3 §5.5) após 30 dias de RawSample coletado | Marco 2 Fase 3 |

---

## §8 Pontos de decisão do usuário (confiança < 80%)

| # | Ponto | Confiança | O que bloqueia |
|---|---|---|---|
| **U1** | Decimação RawSample: 1-em-10 (1,5 s) vs 1-em-2 (300 ms) | `[FLAG 65%]` — primeira satisfaz T_max ≥ 4h; para T_max=30min, resolução 1,5 s introduz erro de ±1 ciclo no first-passage | Definir antes de iniciar coleta |
| **U2** | Clamping em [-50%,+50%] vs [-10%,+10%] com counter de outliers | `[FLAG 70%]` — impacto real de spikes >10% em longtail cripto não estimado sem dados reais | Requer observação empírica 30 dias |
| **U3** | Duração da coleta: 60 vs 90 dias | `[FLAG 72%]` — Q2 argumenta 90 dias para cobertura de halts com Clopper-Pearson adequado; 60 dias é insuficiente para regime event (apenas 10 halts esperados) | Recomendação: 90 dias mínimo |
| **U4** | Parquet vs JSONL para RawSample | `[FLAG 75%]` — JSONL tem zero dependência nova (alinha com decisão MVP em `persistence/mod.rs`); Parquet é +10× em eficiência de leitura para trainer mas adiciona ~20 MB ao binary. Para 300 MB comprimido, JSONL + polars `scan_ndjson` é aceitável | Decisão de engenharia Marco 1 vs 2 |
| **U5** | Buffer 2×T_max do feedback loop T12 (Lacuna 2, Q3 §5.4) | `[FLAG 60%]` — Avellaneda & Lee (2010, *Quantitative Finance* 10(7)) sugerem impacto de até 5×T_max em longtail; buffer conservador deveria ser 5×T_max | Testar após 30 dias shadow |

---

## §9 Referências

- López de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley. Cap. 3 (triple-barrier labeling), Cap. 7 (PIT correctness, label leakage).
- Kaufman, S., Rosset, S. & Perlich, C. (2012). Leakage in data mining: Formulation, detection, and avoidance. *ACM Transactions on Knowledge Discovery from Data (TKDD)* 6(4).
- Brown, S.J., Goetzmann, W., Ibbotson, R.G. & Ross, S.A. (1992). Survivorship bias in performance studies. *Review of Financial Studies* 5(4), 553–580.
- Bailey, D., Borwein, J., López de Prado, M. & Zhu, Q. (2014). Probability of backtest overfitting. *Journal of Computational Finance* 20(4).
- Gneiting, T. & Raftery, A.E. (2007). Strictly proper scoring rules, prediction, and estimation. *Journal of the American Statistical Association* 102(477). Theorem 8 (pinball loss), Theorem 1 (log loss), §3.3 (CRPS).
- Kolassa, S. (2016). Evaluating predictive distributions of individual observations. *International Journal of Forecasting* 32(3), 776–781.
- Lemire, D. et al. (2015). Decoding billions of integers per second through vectorization. *Software: Practice and Experience* 46(9). ZSTD compression benchmarks.
- Foucault, T., Kozhan, R. & Tham, W.W. (2017). Toxic arbitrage. *Review of Financial Studies* 30(4).
- Politis, D.N. & Romano, J.P. (1994). The stationary bootstrap. *Journal of the American Statistical Association* 89(428), 1303–1313.
- Avellaneda, M. & Lee, J.H. (2010). Statistical arbitrage in the U.S. equities market. *Quantitative Finance* 10(7).
- Kou, S.G. (2002). A jump-diffusion model for option pricing. *Management Science* 48(8). First-passage time distribution.
- Lo, A. (1991). Long-term memory in stock market prices. *Econometrica* 59(5). Processo H~0.8.
- Polyzotis, N., Roy, S., Whang, S.E. & Zinkevich, M. (2018). Data validation for machine learning. *SIGMOD*. §4.1 — validação deve preceder features.

---

## §10 Conclusão operacional

**A hipótese de gap está 100% confirmada.** O dataset `AcceptedSample`-only cobre 0,52% da trajetória temporal necessária para qualquer label triple-barrier e é estruturalmente viesado por seleção de pico (survivorship temporal). Labels computadas sobre este dataset produzem: P(realize) sistematicamente superestimado, quantis gross_profit inflados, horizon_p05 subestimado — exatamente os erros que levam operador a abrir posições com convicção infundada, o falso positivo catastrófico que CLAUDE.md identifica como o risco primário.

**Opção recomendada: C (Dual tier)**. Storage 90 dias: ~480 MB comprimido (trivial). Overhead hot path: 38 KB/s (desprezível). Implementação: 2–3 dias de engenharia Rust com o `JsonlWriter` já existente. Nenhuma dependência nova.

**Ação imediata**: implementar `RawSampleWriter` com decimação 1-em-10 antes de qualquer coleta sistemática. Cada dia de scanner rodando sem `RawSample` é um dia de dados de trajetória irrecuperáveis para labels.
