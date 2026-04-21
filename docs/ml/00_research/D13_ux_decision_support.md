---
name: Q3 — UX e Decisão Humana Discricionária — Contrato de Output Consumido
description: Steel-man de 4 formatos UX, análise Q3.a–Q3.h, veredito modificado sobre ADR-015 e layout hierárquico progressivo com wireframe textual, fundamentado em literatura de risk communication, cognitive load e decision support
type: research
status: draft
author: phd-q3-ux-decision-output
date: 2026-04-19
version: 0.1.0
---

# Q3 — UX e Decisão Humana Discricionária

## §0 Postura e escopo

Questão empírica sobre cognição humana, não sobre arquitetura de modelo: dado que backend Rust emite `TradeSetup` estruturado (ADR-015), qual representação visual+textual maximiza convicção de decisão sem criar viés sistemático? Separado de D5 (calibração) e D11 (microestrutura). Critério de arbitragem: evidência de estudos com humanos tomando decisões em condições análogas (risco, incerteza, tempo limitado, remuneração real). Extrapolações de medicina/seguro aceitas com haircut explícito.

## §1 Steel-man: 4 formatos UX

### F-UX1 — Minimalista (2 campos + P)
- **Steel-man**: Miller (1956 *Psych Review* 63(2)) 7±2 chunks; Cowan (2001 *BBS* 24(1)) refina para 3–4 slots em items relacionais. 3 chunks cabem.
- **Fraqueza fatal**: ignora variabilidade estrutural que operador identificou. Barber & Odean (2001 *QJE* 116(1)): acesso reduzido a informação induz overtrading. Inadequado para operador discricionário tático.

### F-UX2 — ADR-015 flat (10+ campos em hierarquia visual única)
- **Steel-man**: Fenton-O'Creevy et al. (2003 *JOOP* 76(1)) traders de alto desempenho demandam informação calibrada; Bloomberg Terminal tem 40+ campos.
- **Fraqueza**: Sweller (1988 *Cognitive Science* 12(2)) carga extrínseca reduz capacidade de decisão; Hirshleifer, Lim & Teoh (2009 *JoF* 64(5)) sub-reação a sinais sob alto volume concorrente. Conteúdo correto, layout não.

### F-UX3 — Visual gráfico (boxplot inline)
- **Steel-man**: Spiegelhalter, Pearson & Short (2011 *Science* 333(6048)) múltiplos formatos dominam em numeracia média-alta.
- **Fraqueza**: Spiegelhalter (2017 *ARSA* 4) boxplot induz overconfidence na forma; operador interpreta como simétrica quando tem heavy tail.

### F-UX4 — Linguagem natural com frequência
- **Steel-man**: Gigerenzer & Hoffrage (1995 *Psych Review* 102(4)) frequências naturais "77 de 100" produzem 3× mais inferências Bayesianas corretas.
- **Fraqueza**: em painel multi-rota parágrafos são ingerenciáveis. Hogarth & Soyer (2015 *JARMAC* 4(1)) texto cria ilusão de predictabilidade.

### F-UX5 — Hierárquico progressivo (RECOMENDADO)
- 3 camadas drill-down sob demanda.
- Triangula Miller/Cowan (3 chunks camada 1), Pirolli & Card (1999 *Psych Review* 106(4)) baixo custo scent, Gigerenzer (frequência natural), Spiegelhalter 2017 (múltiplos formatos camada 2), Dietvorst et al. (2018 *Management Science* 64(3)) controle percebido.

## §2 Q3.a–Q3.h

- **Q3.a** Número: Cowan (2001) 3–4 slots. Camada 1: 3 elementos; camada 2: ≤7; nunca >10 flat.
- **Q3.b** Representação distribuição: Spiegelhalter et al. (2011) range notation > boxplot isolado para numeracia média-alta. Camada 1: "típico 1.0%, entre 0.6% e 2.8%"; camada 2: mini boxplot.
- **Q3.c** Thresholds vs ponto-alvo: Tversky & Kahneman (1974 *Science* 185) enter_typical com proeminência cria ancoragem. Solução: posição atual relativa ao threshold, "típico" vai para camada 2.
- **Q3.d** Tactical 150 ms: Hirshleifer et al. (2009) flickering degrada reação. Atualizar visual ≤ 2 Hz; 3 estados estáticos (SEM SINAL, ELIGIBLE, PICO IMINENTE); nunca auto-focar painel.
- **Q3.e** Gráfico 24h: Pirolli & Card (1999) proximal cues. Overlay com linhas horizontais estáticas enter_at_min/exit_at_min; ponto spread atual se move; zero campos extras.
- **Q3.f** P(realize): Gigerenzer & Hoffrage (1995) "77/100" em vez de "P=0.77"; tooltip: "Em 100 oportunidades similares, 77 realizadas". Flag <80% confiança: generalização para trading cripto não validada.
- **Q3.g** Reason: Dietvorst et al. (2015 *JEP: General* 144(1)) transparência reduz aversion; Yeomans et al. (2019 *JBDM* 32(4)) aumenta uptake acuracy. Uma linha + ícone categorial (4 tipos) camada 1. Sem SHAP.
- **Q3.h** Operadores mesma regra lucros diferentes: Fenton-O'Creevy et al. (2003) illusion of control ↔ performance inversa. NÃO exibir percentil pós-trade individual; apenas métricas agregadas de calibração ("últimas 20 entradas: 15 realizadas — alinhado com P≈77").

## §3 Veredito ADR-015

**Correto no conteúdo (struct de dados), incorreto na apresentação (layout flat).**

- ✅ Thresholds + distribuição + P + TacticalSignal = estrutura certa pela literatura.
- ❌ Layout flat cria carga extrínseca (Sweller 1988); `enter_typical` proeminente = ancoragem (TK 1974); `P = 0.77` float = subótimo (GH 1995); display a 150 ms = distração (Hirshleifer 2009).

**Modificação**: struct ADR-015 intacto; apenas camada de apresentação UI muda para F-UX5.

## §4 Wireframe

### Camada 1 (sempre visível)
```
┌─ BP mexc:FUT → bingx:FUT ── [●] ELIGIBLE ─────┐
│  Agora: 1.95%  min: 1.80%  (+0.15% acima min) │
│  Lucro típico: ~1.0%  (entre 0.6% e 2.8%)     │
│  Probabilidade: 77/100  Horizonte: ~28 min     │
│  Razão: [tendência] regime dispersão + cauda  │
│  [ENTRAR AGORA]    [VER DETALHES]  [IGNORAR]  │
└────────────────────────────────────────────────┘
```

### Camada 2 (drill-down)
```
┌─ DETALHES: BP mexc:FUT → bingx:FUT ──────────────┐
│  ENTRADA                                         │
│    Mínimo:  ≥ 1.80%   Típico: 2.00%  Pico: 2.80% │
│    P(aparecer mínimo): 90%                       │
│  SAÍDA (após entrada)                            │
│    Mínimo: ≤ −1.20%   Típico: −1.00%             │
│    P(aparecer | entrou): 85%                     │
│  LUCRO BRUTO                                     │
│    p10 0.60% | p25 0.70% | p50 1.00%             │
│    p75 1.50% | p90 2.30% | p95 2.80% (afortunado)│
│    IC 95% sobre P(realize): [0.70, 0.82]         │
│    Horizonte: p5 12 min | p50 28 min | p95 1h40  │
└───────────────────────────────────────────────────┘
```

### Camada 3 (overlay gráfico 24h)
Linhas horizontais estáticas: `enter_at_min = 1.80%` (verde tracejado) e `exit_at_min = −1.20%` (laranja tracejado). Ponto indicador do spread atual se move em tempo real. Banda sombreada entre p50 e p75 como "zona típica".

## §5 Red-team

1. **Anchoring no típico camada 2**: label explícito "aguardar pode render mais, mas não é necessário".
2. **Algorithm appreciation cegando deliberação** (Logg et al. 2019 *OBHDP* 151): botão [ENTRAR] permite modificar valor antes de confirmar (Dietvorst et al. 2018 controle percebido).
3. **Múltiplas rotas simultâneas** (Hirshleifer 2009): ordenar por P × gross_median decrescente.
4. **P calibrado em regime divergente**: badge "calibração: OK / DEGRADADA / SUSPEITA" (ADR-013); DEGRADADA → P exibido como "? / 100".
5. **Viés retrospectivo pós-trade**: Q3.h — apenas métricas agregadas.

## §6 Pontos < 80% confiança

1. (65%) Frequência natural "77/100" vs "P=0.77" para operador cripto sofisticado — testar em sessão 30 min com operador real.
2. (70%) 2 Hz limit atualização visual — princípio geral, não estudo TUI trading.
3. (60%) Mecanismo "modificação permitida" vs "delay 3s forçado" — Dietvorst 2018 principle strong, mecanismo específico não validado no domínio.
4. (68%) Ausência feedback percentil pós-trade — painel learning analytics opt-in pode ser meio-termo.
5. (72%) Overlay no gráfico 24h — Few (2006 *Information Dashboard Design*) princípio suporta, mas não peer-reviewed, contexto BI ≠ TUI trading tempo real.

## §7 Struct apresentação Rust-factível

```rust
pub struct TradeSetupDisplay {
    // Camada 1
    pub tier_label:          &'static str,  // "ELIGIBLE" | "ACIMA TIPICO" | "PICO IMINENTE"
    pub current_vs_min_pct:  f32,           // atual - min
    pub profit_natural_freq: u8,            // 77 (de 100)
    pub horizon_label:       String,        // "~28 min"
    pub reason_icon:         ReasonIcon,    // enum de 4 tipos
    pub reason_text:         String,        // "regime dispersão + cauda"
    // Camada 2
    pub enter_at_min:        f32,
    pub enter_typical:       f32,
    pub enter_peak_p95:      f32,
    pub p_enter_hit_pct:     u8,            // 90
    pub exit_at_min:         f32,
    pub exit_typical:        f32,
    pub p_exit_hit_pct:      u8,
    pub gross_p10:           f32,
    pub gross_p25:           f32,
    pub gross_median:        f32,
    pub gross_p75:           f32,
    pub gross_p90:           f32,
    pub gross_p95:           f32,
    pub ic_low:              f32,
    pub ic_high:             f32,
    pub horizon_median_s:    u32,
    pub horizon_p05_s:       u32,
    pub horizon_p95_s:       u32,
    pub calibration_status:  CalibStatus,   // Ok | Degraded | Suspended
}
```

Toda derivação (P float → u8 natural freq, "~28 min" string, tier_label) é Rust backend. UI é consumidora passiva.

## §8 Referências

- Barber & Odean 2001 *QJE* 116(1) 261–292.
- Cowan 2001 *BBS* 24(1) 87–114.
- Dietvorst, Simmons & Massey 2015 *JEP: General* 144(1) 114–126.
- Dietvorst, Simmons & Massey 2018 *Management Science* 64(3) 1155–1170.
- Fenton-O'Creevy et al. 2003 *J Occup Organ Psych* 76(1) 53–68.
- Few 2006 *Information Dashboard Design* (O'Reilly).
- Gigerenzer & Hoffrage 1995 *Psych Review* 102(4) 684–704.
- Glaser & Weber 2007 *Geneva Risk Insurance Review* 32(1) 1–36.
- Hirshleifer, Lim & Teoh 2009 *J Finance* 64(5) 2289–2325.
- Hoffrage, Lindsey, Hertwig & Gigerenzer 2000 *Science* 290(5500) 2261–2262.
- Hogarth & Soyer 2015 *JARMAC* 4(1) 6–16.
- Logg, Minson & Moore 2019 *OBHDP* 151 90–103.
- Miller 1956 *Psych Review* 63(2) 81–97.
- Pirolli & Card 1999 *Psych Review* 106(4) 643–675.
- Spiegelhalter, Pearson & Short 2011 *Science* 333(6048) 1393–1400.
- Spiegelhalter 2017 *ARSA* 4 31–60.
- Sweller 1988 *Cognitive Science* 12(2) 257–285.
- Tversky & Kahneman 1974 *Science* 185(4157) 1124–1131.
- Yeomans, Shah, Mullainathan & Kleinberg 2019 *JBDM* 32(4) 418–431.
