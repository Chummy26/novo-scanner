---
name: ADR-025 — Stream contínuo de RawSample (decimação 1-in-10) pré-requisito de Marco 0
description: Resolve lacuna estrutural em ADRs 018/019/020/023. `AcceptedSample` é filtrado pelo trigger e insuficiente para medir gates empíricos E1–E11 sem viés de survivorship/truncation. Introduz segundo dataset — `RawSample` — com decimação 1-in-10 de TODAS as observações do scanner, independente de trigger, persistido em paralelo ao AcceptedSample, Hive-partitioned JSONL.
type: adr
status: approved
author: operador + critica-review-round-2
date: 2026-04-20
version: 1.0.0
supersedes: null
extends: ADR-012 (feature store §Persistência), ADR-018 (Marco 0 escopo §Implementação)
reviewed_by: [operador]
---

# ADR-025 — Stream contínuo de RawSample (pré-requisito de Marco 0)

## Contexto

A auditoria de segunda ordem sobre os ADRs 017–024 (2026-04-20) identificou lacuna sistêmica oculta:

- **ADR-018** lista 11 gates empíricos E1–E11 medidos em Marco 0. Nenhum documento especifica a **fonte de dados** das medições.
- **ADR-019** (gating econômico) requer simulação de `pnl_bruto` agregado por janela — requer série **completa** de `entry_spread(t)/exit_spread(t)` por rota, não apenas snapshots que passaram trigger.
- **ADR-020** (volume útil) requer distribuição real da taxa de emissão por trigger, mas o trigger **é o filtro** — medir emissão apenas em dados filtrados é tautológico.
- **ADR-023** (LOVO) exige leave-one-venue-out sobre distribuição completa de cada venue; AcceptedSample já vem contaminado por gates de staleness e volume que selecionam determinadas venues desigualmente.

O dataset `AcceptedSample` (C4 fix, ADR-012 §Schema canônico) é o **conjunto pós-filtro** — intencionalmente limpo para treino. Gates E1/E2/E4/E6/E8/E10/E11 e os ADRs supracitados exigem **distribuição pré-filtro** para:

1. **Estimar o α cauda (Hill)** sem truncamento: filtro `book_age_ms < limite_venue` remove observações de venues com feed mais lento — introduz viés seletivo nos momentos da distribuição.
2. **Estimar persistência `D_{x=2%}`** (E4) — requer todos os cruzamentos do spread em 2%, não apenas aqueles onde o trigger disparou.
3. **Medir LOVO por venue** — se o trigger exclui rotas de baixo volume de uma venue, essa venue aparece como "generalizável" apenas porque o modelo nunca viu os casos difíceis.
4. **Simular `pnl_bruto` ADR-019** — requer `exit_spread(t₁)` para todo par `(rota, t₀)` candidato, inclusive os que não passariam trigger em t₀ mas poderiam ser rotulados retroativamente para experimentação.
5. **Medir haircut E5** (quando Marco 2 Fase 2 chegar) — requer série de referência imperturbada, não resíduo pós-filtragem.

Ignorar isso converte os gates E1–E11 em **estimadores enviesados** — decisão go/no-go de Marco 1 passaria por baseline de qualidade indeterminada, violando ADR-018 §Gates e o princípio de "iteração empírica > planejamento extensivo" (mesmo ADR).

## Decisão

Instituir um segundo stream de persistência, **`RawSample`**, em paralelo ao `AcceptedSample` já existente. Propriedades:

| Propriedade | Valor | Justificativa |
|---|---|---|
| **Gatilho** | toda chamada `MlServer::on_opportunity` passa pelo writer RawSample | pré-filtro; distribuição íntegra |
| **Decimação** | 1-in-10 por rota (sampling determinístico `hash(route) mod 10`) | reduz custo de I/O ~10× mantendo ≥ 1k obs/rota em 7 dias |
| **Schema** | campos mínimos pré-cálculo + `halt_active` + `is_clean_data` flag | rastreabilidade do filtro sem impor filtro |
| **Rotação** | horária Hive-style `year=/month=/day=/hour=/` | paridade com AcceptedSample; particionamento para DataFusion |
| **Formato** | JSONL gzipado (suportado em Marco 0 pelo trainer Python) | zero crate novo; conversão Parquet trivial em Marco 2 |
| **Canal** | `tokio::mpsc::channel(100_000)` bounded | backpressure drop idêntico ao AcceptedSample writer |
| **Write quota** | `try_send` não bloqueante; perdas contadas em métrica `raw_writer_dropped_total` | hot path não afetado |
| **Storage 90d** | ~300 MB ZSTD (decimação 10 × ~200 B/sample × 17 req/s × 86_400 × 90 × 0.1) | tolerável; ≪ orçamento de 2 GB da feature store |

A decimação é **determinística por rota**: `hash_u64(route) % 10 == 0`. Rotas "sorteadas" gravam toda observação; demais são descartadas. Isso preserva **densidade temporal** (toda observação daquela rota é capturada) ao custo de **densidade de rota** (só ~260 das 2600 rotas são persistidas). Para gates agregados (E1/E2/E6/E8/E10) a amostra é suficiente via bootstrap estratificado; para gates per-rota (E4/E9/E11) a cobertura é a mesma qualidade em menos rotas, aceitável no MVP.

Alternativa rejeitada: **decimação temporal (1-in-10 global)**. Isso rompe a correlação serial `entry×exit` que ADR-008 precisa estimar (E8), porque amostra alterna entre rotas arbitrárias a cada tick. Decimação por rota preserva estrutura de série temporal intra-rota — crítico para Hurst e para quantis condicionais.

### Contrato `RawSample` (schema v1)

```rust
pub struct RawSample {
    pub ts_ns: u64,
    pub cycle_seq: u32,
    pub schema_version: u16,      // 1
    pub route_id: RouteId,
    pub entry_spread: f32,
    pub exit_spread: f32,
    pub buy_book_age_ms: u32,
    pub sell_book_age_ms: u32,
    pub buy_vol24: f64,
    pub sell_vol24: f64,
    pub halt_active: bool,
    /// Snapshot do veredito do trigger para esta observação. Permite
    /// reconstruir offline "o que o trigger teria feito" sem ter que
    /// re-rodar o trigger no Python (evita dupla-fonte-verdade sobre
    /// regras de filtro).
    pub sample_decision: SampleDecision,
}
```

**NÃO inclui** no schema v1: features derivadas (regime HMM, Hurst local, quantis empíricos da rota). Motivo: features derivadas são computadas no treinador offline a partir das séries brutas; incluí-las no RawSample criaria dupla-fonte-verdade entre Rust (hot path) e Python (trainer). O writer escreve apenas dados observáveis. Qualquer feature é função pura dos campos brutos.

### Integração em `MlServer::on_opportunity`

- Novo campo no `MlServer`: `raw_writer: Option<RawWriterHandle>`. `None` em modo off (ex.: testes unitários que só exercem baseline).
- Novo campo no `MlServer`: `raw_sample_decimator: RouteDecimator` — precomputa `hash(route) % 10` ao registrar via `listing.record_seen`; evita recomputar a cada tick.
- Fluxo:
  1. `on_opportunity` executa como hoje até calcular `sample_dec`.
  2. **Depois de** `bump_sample_metric`, se `raw_writer.is_some()` e `decimator.should_persist(route)`: monta `RawSample`, envia via `try_send`. Drop se canal cheio.
  3. Writer task consome via loop idêntico ao `JsonlWriter::run` — rotação horária, flush a cada 1024 linhas ou 5 s.
- Hot path: adiciona ~100 ns por chamada quando `should_persist == false` (lookup hash cached), ~500 ns quando escreve (ainda ≪ budget de 150 ms do ciclo).

### Path de saída

- `data/ml/raw_samples/year=YYYY/month=MM/day=DD/hour=HH/{hostname}-{pid}_{start_ts}.jsonl`
- Separado de `data/ml/accepted_samples/` — permite pipeline de treino consumir seletivamente (só AcceptedSample para treino supervisionado; RawSample para audits, LOVO, simulações counterfactual).

### Campo `sample_decision` no RawSample — racional

Alternativa 1 (rejeitada): não incluir o veredito; recomputar no Python. **Risco**: regras de trigger evoluem no Rust (ADR-014 futuro). Python defasa e reproduz trigger incorretamente — leakage sutil.

Alternativa 2 (adotada): **incluir o veredito congelado no tempo em que foi calculado**. Python trusts Rust. Se trigger mudar, RawSample antigo carrega rotulagem da regra antiga, identificável via `schema_version`. Isso é **exatamente o princípio Point-in-Time (PIT)** aplicado à rotulagem do próprio trigger.

## Alternativas consideradas

### A — Manter só AcceptedSample, medir gates com o que houver

**Rejeitada**. Todos os gates dependentes da cauda (E1/E2/E10) ficam subestimados porque o trigger remove `book_age > limite` que é exatamente a cauda operacional de venues lentas (Bingx, XT, Gate:SPOT). Viés sistemático de ~5–40% nos momentos da distribuição segundo simulações offline.

### B — Log completo sem decimação

**Rejeitada**. ~17 req/s × 86_400 s × 90 d × 200 B = 26 GB ZSTD. Orçamento feature store era 2 GB. Além do custo em disco, I/O a esse volume sustenta ~80 MB/s pico; risco real de contenção com logs de aplicação e persistência do QuestDB (ADR-012).

### C — Decimação temporal 1-in-10 global (tick-based)

**Rejeitada**. Quebra correlação intra-rota (E8 via ADR-008: `corr(entry, exit) ≈ −0.93`). Amostras sequenciais da mesma rota ficam 10 ticks = 1.5 s apart, subamostrando regime de persistência (D_{x=2%} < 0.5s em E4). Inferência de Hurst deslocada.

### D — Reservoir sampling k=10_000 por rota

**Rejeitada** para Marco 0. Reservoir requer 10k buckets in-memory × 2600 rotas = 26M f32 = 100 MB hot. Aceitável em Marco 1/2 quando feature store estiver completa, mas para Marco 0 a simplicidade de JSONL em disco vence. Reservoir é referido por Vitter 1985 "Random Sampling with a Reservoir" *ACM TOMS*; mantido para consideração em Marco 2.

### E — QuestDB direto (sem JSONL intermediário)

**Rejeitada no MVP**. QuestDB é infra Marco 1 (ADR-012 §Camada 2). Adicionar dependência em Marco 0 atrasa o marco. JSONL → QuestDB migration é ETL trivial de 1 arquivo Python.

## Consequências

### Positivas

- Gates E1/E2/E4/E6/E8/E10/E11 medidos sobre distribuição não-truncada — reduz viés estrutural nas decisões go/no-go.
- Simulação `pnl_bruto` (ADR-019) tem série completa para reconstituir trajetórias.
- LOVO (ADR-023) computável com rigor — cada venue representada proporcionalmente à sua prevalência real.
- Haircut E5 fica monitorável quando execução for introduzida (Marco 2 Fase 2) porque serão comparáveis `quoted_spread` (RawSample) vs `realized_spread` (execução).
- PIT rigoroso — `sample_decision` congelado no tempo da observação é rastreabilidade perfeita.
- Custo de implementação baixo: 2–3 dias de Rust, 95% reuso do writer já implementado.

### Negativas

- Segundo canal mpsc adiciona ~50 ns/tick overhead ao hot path (medido em benchmark prévio de `try_send` bounded: ~40 ns no fast path).
- Storage +300 MB em 90d (≪ orçamento).
- Writer task adicional consome ~0.5% CPU em load sustentado.
- Ligeira expansão do surface area: dois caminhos de dados; cuidado em mudar schema requer migração de dois lugares.

### Riscos residuais

- **Hash de decimação mal distribuído**: se `hash(route)` tem cauda, algumas venues ficam sub-representadas. Mitigação: usar `rustc_hash::FxHasher` (determinístico, cauda uniforme em pequenos conjuntos; validado em CI via teste de χ² após bootstrap).
- **Deriva schema vs AcceptedSample**: mudança em `RouteId` requer sincronização. Mitigação: ambos os schemas importam `RouteId` do `contract.rs` — ponto único de definição.

## Gates de aceitação (para marcar ADR-025 como `implemented`)

1. Teste unitário `raw_sample_hash_uniform_chi2` passa com p > 0.05 sobre 10 000 rotas sintéticas.
2. Teste integração `raw_writer_receives_all_decimated_samples` — envia 10 000 ticks por 10 rotas, verifica que ~1 000 foram persistidas por rota-selecionada, ±10%.
3. Teste que `sample_decision` persistido é idêntico ao retornado por `on_opportunity` — PIT holding.
4. Bench micro: `on_opportunity` com raw_writer habilitado vs desabilitado — delta ≤ 100 ns em p50, ≤ 500 ns em p99.
5. Scanner roda 1h com writer habilitado — pelo menos 1 arquivo por hora em `data/ml/raw_samples/year=.../hour=.../`. Tamanho esperado 5–15 MB.

## Status

Status: `approved` 2026-04-20.
Próximo passo: implementação (tarefas #35 + #36 no tracker).
Promoção para `implemented` após gates de aceitação passarem em CI + scanner live validation.

## Referências cruzadas

- ADR-012 §Camada 1 — Hot query cache (é complementar, não substituto).
- ADR-018 §Gates — todas as referências a E1/E2/E4/E6/E8/E10/E11 assumem este dataset.
- ADR-019 §Simulação — série completa requerida.
- ADR-020 §Volume útil — mesma série.
- ADR-023 §LOVO — distribuição per-venue completa.
- Vitter, J. S. (1985). "Random Sampling with a Reservoir". *ACM TOMS* 11(1). — alternativa D.
- López de Prado (2018). *Advances in Financial Machine Learning*, cap. 3 — discussão sobre contaminação de rotulagem post-filter.
