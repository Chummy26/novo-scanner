---
name: T11 — Execution Feasibility Gap (Quoted vs Realized)
description: Scanner só tem top-of-book; spread cotado ≠ spread executado; tratamento via haircut empírico calibrado em shadow + depth proxies
type: trap
status: addressed
severity: high
primary_domain: D2
secondary_domains: [D3, D10]
author: programa-phd-sub-agentes
date: 2026-04-19
version: 1.0.0
---

# T11 — Execution Feasibility Gap (Quoted vs Realized)

## Descrição

`enter_at = 2%` significa "abrir quando entrySpread atingir 2%". Mas:

- Quanto **tempo** o spread permanece em 2%? Se por 80 ms, operador humano não executa.
- Qual **profundidade** no preço 2%? Top-of-book pode ter $500 de liquidez; tamanho do operador é $10k → preço realizado é pior ("caminhar pelo book").

Scanner só tem top-of-book (**limitação fundamental** — §6.3 skill). Modelo que ignora isso entrega setups "existentes" mas não **executáveis**.

## Manifestação empírica (D2)

- **Persistência `D_x`** estimada: `median(D_{x=2%}) < 0.5s` → **menos de 50% dos setups `enter_at ≥ 2%` executáveis em latência humana (≥ 2s)**.
- **Haircut empírico esperado** (D2 §T11):
  - 1% quoted → 0.6–0.8% realizable (20–40% haircut).
  - 2% quoted → 1.4–1.7% realizable (15–30% haircut).
  - 3%+ quoted → 30–70% haircut (liquidez pontual).

Operador que confia no `gross_profit_quoted` pode executar no 2% e receber 1.4% — **o vão entre cotado e realizável é de primeira ordem no PnL líquido**.

## Tratamento

### Primário — ADR-001 Output dual

Em vez de emitir apenas `gross_profit`:

```rust
pub struct TradeSetup {
    // ...
    pub gross_profit_quoted: f64,      // o que o scanner cota agora
    pub gross_profit_realizable: f64,  // quoted × (1 − haircut_predicted)
    pub haircut_predicted: f64,        // fração estimada (0.0–1.0)
    // ...
}
```

Operador decide com base em **realizable**, não cotado.

### Secundário — ADR-007 Features proxy (D3 famílias C e D)

- `log1p_max_book_age` — book age inverso como proxy de atividade.
- `book_age_z_venue` — anomalia vs baseline dinâmico.
- `log_min_vol24` — vol24 normalizado cross-venue.
- `trade_rate_1min` — proxy de liquidez em tempo real.
- `persistence_ratio_1pct_1h` — histórico de quanto tempo spread ≥ 1% persiste.

Modelo aprende a predizer haircut com essas features.

### Terciário — ADR-012 D10 Shadow mode calibration

**Protocolo** (pendente D10):
- Para trades executados pelo operador em shadow, coletar `(rota, size, tod, S_quoted, S_realized)`.
- Regressão empírica: `haircut(rota, size, tod) = S_quoted − S_realized`.
- Função atualizada mensalmente.
- Modelo consome função calibrada para predizer `haircut_predicted` em tempo real.

### Quaternário — Depth subscription futura (V2/V3)

Se haircut real revelar-se maior que projetado (> 50% em setups > 1%), considerar:
- Assinar L2 depth top-5 em exchanges que oferecem (Binance, Bybit).
- **Não é option para todas** (MEXC spot, BingX perp não oferecem L2 estável).
- Feature adicional `depth_at_2pct_usd` alimenta modelo.

Decisão pendente (D3 ponto de decisão).

## Residual risk

- **Haircut por rota específica**: calibrar por cada rota × tamanho é cardinal alto — shadow pode demorar para cobrir todos casos. Mitigação: fallback para cluster (venue-pair + base-symbol).
- **Regime change na liquidez**: halt parcial reduz depth drasticamente; features proxy podem lagar. Mitigação: book_age detection imediata (hot path).
- **Operador que executa em batch** (múltiplos setups em < 1 min): feedback loop T12 corrupt-calibration. Mitigação: log `was_recommended` + exclusão no retreino.

## Owner do tratamento

- ADR-001 (output dual).
- ADR-007 (features proxy).
- ADR pendente D10 (shadow calibration).

## Referências cruzadas

- [ADR-001](../01_decisions/ADR-001-arquitetura-composta-a2-shadow-a3.md).
- [ADR-007](../01_decisions/ADR-007-features-mvp-24-9-familias.md).
- [D02_microstructure.md](../00_research/D02_microstructure.md) §T11.
- [D03_features.md](../00_research/D03_features.md) §5.6–5.7.
- Skill canônica §6.3 (risco depth/slippage).

## Evidência numérica citada

- D2 estimativa (coleta pendente): `median(D_{x=2%}) < 0.5s`; <50% dos setups executáveis em latência humana ≥ 2s.
- Haircut empírico projetado (D2 §T11): 20–70% conforme magnitude.
- Brauneis et al. 2021 *JFM* 52 — `vol24` R² vs depth correlation ~0.55 top-5; 0.3–0.5 longtail (mais fraco).
- Amihud 2002 *J Financial Markets* 5 — illiquidity measure e referência conceitual.
