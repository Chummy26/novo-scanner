# Exchanges WebSocket — Documentação Técnica Completa
> Atualizado: abril/2026 | Cobre: MEXC, BingX, KuCoin, Gate, Bitget, XT

---

## MEXC

### Spot WS (`wss://wbs-api.mexc.com/ws`)

**Conexão**
- Endpoint: `wss://wbs-api.mexc.com/ws`
- Validade máxima: 24h (reconectar manualmente após expirar)
- Encoding: **Protobuf** — baixar `.proto` em https://github.com/mexcdevelop/websocket-proto

**Ping/Pong**
- Cliente envia: `{"method": "PING"}`
- Servidor responde: `{"id": 0, "code": 0, "msg": "PONG"}`
- Enviar quando não houver fluxo de dados para manter a conexão viva

**Disconnect**
- Sem subscription ativa → desconecta em **30s**
- Com subscription mas sem fluxo de dados → desconecta em **1 min**

**Reconnect:** Manual (re-abrir + re-subscribe)

**Limites**
- Subscriptions por conexão: **máx. 30**
- Rate limit WS: **100 msgs/s**
- Conexões por IP: não documentado oficialmente

**Streams agregados (cobertura total)**
| Canal | Cobertura | Frequência |
|---|---|---|
| `spot@public.miniTickers.v3.api.pb@UTC+8` | **Todos os pares** | A cada 3s |
| `spot@public.miniTicker.v3.api.pb@{SYMBOL}@UTC+8` | Símbolo específico | A cada 3s |

**Para 1000+ símbolos:** Usar `spot@public.miniTickers.v3.api.pb@UTC+8` → **1 conexão cobre tudo**. Se precisar de canais individuais (depth/trades), usar 34+ conexões (ceil(1000÷30)).

---

### Futures WS (`wss://contract.mexc.com/edge`)

**Conexão**
- Endpoint WS: `wss://contract.mexc.com/edge` ← **URL do WS não mudou**
- REST novo domínio (desde jan/2026): `https://api.mexc.com` (era `contract.mexc.com`)
- Encoding: **GZIP por padrão** — desativar com `"gzip": false` no subscribe

**Ping/Pong**
- Cliente envia: `{"method": "ping"}`
- Servidor responde: `{"channel": "pong", "data": [timestamp]}`
- Intervalo recomendado: **10–20s**
- Timeout: sem ping em **1 min** → desconecta

**Reconnect:** Manual

**Limites**
- Subscriptions por conexão: **sem limite documentado**
- Conexões por IP: não documentado
- Depth updates: a cada **200ms**
- Ticker updates: **1–2s**

**Auth (canais privados)**
- Login: `HMAC-SHA256(api_key + req_time, sec_key)`
- Após login, **todos** os streams pessoais são enviados automaticamente
- Usar `personal.filter` para filtrar por contrato específico
- Exceções: `asset` e `adl.level` não suportam filtro por símbolo

**Streams agregados**
| Canal | Cobertura |
|---|---|
| `sub.tickers` | Todos os perpetual contracts em uma mensagem |

**Para orderbook incremental:** snapshot inicial via `GET https://api.mexc.com/api/v1/contract/depth`, depois deltas via WS. Recuperação de pacotes perdidos: `/depth_commits` (últimos 1000 commits).

**Para 1000+ símbolos:** `sub.tickers` → 1 conexão cobre tudo.

---

## BingX

### Spot WS (`wss://open-api-ws.bingx.com/market`)

**Conexão**
- Endpoint público/market: `wss://open-api-ws.bingx.com/market`
- User Data Stream (privado): `wss://open-api-ws.bingx.com/market?listenKey={key}`
- Encoding: **GZIP obrigatório** — todas as respostas são comprimidas, decomprimir com zlib

**Ping/Pong**
- **Servidor envia Ping** periodicamente → cliente deve responder `Pong` (texto simples)
- Sem resposta → conexão pode ser encerrada

**Disconnect / Reconnect:** Não documentado publicamente (monitorar com heartbeat + reconectar automaticamente)

**Limites**
- Subscriptions por conexão: **máx. 200** (atualizado em 20/ago/2024, antes era ilimitado)
- Rate limit ordens (REST): **10 req/s** por endpoint (atualizado em 16/out/2025, era 5/s)
- Rate limit WS: segue limites REST
- Conexões por IP: não documentado

**Para 1000+ símbolos:** Mínimo **5 conexões** (ceil(1000÷200))

---

### Futures/Swap WS (`wss://open-api-swap.bingx.com/swap-market`)

**Conexão**
- Endpoint: `wss://open-api-swap.bingx.com/swap-market`
- Encoding: **GZIP obrigatório** — decomprimir com zlib
- ⚠️ Domínio antigo `open-ws-swap.bingbon.pro` foi desligado em **18/set/2025** — não usar

**Ping/Pong**
- **Servidor envia Ping** → cliente responde `Pong`

**Disconnect / Reconnect:** Não documentado (usar heartbeat + reconnect automático)

**Limites**
- Subscriptions por conexão: não documentado (testar com limite conservador ~200)
- Rate limit ordens: **10 req/s** (mesmo que Spot)
- Conexões por IP: não documentado

---

## KuCoin (Pro API / UTA)

> ⚠️ **AINDA EM BETA — Não usar em produção.** Documentação explícita: *"Please DO NOT use this API in production environments or live trading under any circumstances."*

**Conexão**
- URL base: obtida via REST (token válido por **24h**)
  - Público: `POST /api/v1/bullet-public`
  - Privado: `POST /api/v1/bullet-private`
- Conexão encerra automaticamente após 24h (novo token + nova conexão)

**Ping/Pong**
- `pingInterval` vem no welcome message — ex: `30000` (30s)
- Cliente envia: `{"id": "uuid", "type": "ping"}`
- Servidor responde: `{"id": "uuid", "type": "pong", "ts": timestamp}`
- **⚠️ Máximo 1 ping/s** — exceder causa desconexão imediata
- Sem pong em ~3s → considerar conexão quebrada, reconectar

**Reconnect:** Manual (novo token + nova conexão)

**Limites (atualizados fev/2025)**
| Limite | Valor |
|---|---|
| Conexões simultâneas por UID | **800** (era 500) |
| Total de conexões (public + private) | **1024** |
| Mensagens por conexão | **100 msgs / 10s** |
| Tópicos por conexão | **200** |

**Subscribe**
```json
{
  "action": "subscribe",
  "channel": "nome-do-canal",
  "symbol": "BTC-USDT",
  "tradeType": "SPOT"
}
```
- `tradeType`: `"SPOT"` ou `"FUTURES"`

**Suporte atual:** Spot + Futures. Margin e Options → planejado para 2026.

**Auth:** obrigatório para private channels.

---

## Gate (Gate.io)

### Spot WS v4 (`wss://api.gateio.ws/ws/v4/`)

**Conexão**
- Endpoint: `wss://api.gateio.ws/ws/v4/`
- Auth obrigatória para canais privados (APIv4 key pair)

**Ping/Pong**
- Cliente envia: `{"channel": "spot.ping"}`
- Servidor responde: `{"channel": "spot.pong"}`
- Servidor também suporta **protocol-level ping/pong** (RFC 6455)
- Ao receber `spot.ping`, o servidor reseta o timer de timeout
- Intervalo recomendado: **5–15s** para manter conexão estável

**Disconnect:** upgrade do servidor ou idle sem ping
**Reconnect:** manual + re-login para canais privados

**Limites**
- Subscriptions por conexão: **sem limite** — multi-subscribe com array de símbolos permitido
- Rate limit ordens: **10/s por key** (headers `x-gate-ratelimit-*` retornam remain/limit/reset)
- Erro 211 = rate limit atingido, 212 = rate limit exceeded
- Conexões por IP: não documentado

**Streams agregados**
| Canal | Payload | Cobertura |
|---|---|---|
| `spot.tickers` | `["!all"]` | **Todos os símbolos spot** |
| `spot.order_book_update` | — | Order book 20ms (disponível desde mai/2025) |

**Para 1000+ símbolos:** `spot.tickers` com `["!all"]` → **1 conexão cobre tudo**

---

### Futures WS v4

**Endpoints**
| Margem | URL |
|---|---|
| USDT-margined | `wss://fx-ws.gateio.ws/v4/ws/usdt` |
| BTC-margined | `wss://fx-ws.gateio.ws/v4/ws/btc` |

**Ping/Pong**
- Cliente envia: `{"channel": "futures.ping"}`
- Servidor responde: `{"channel": "futures.pong"}`
- Mesma lógica de protocol-level ping/pong do Spot

**Auth:** mesma lógica do Spot (APIv4 key pair)

**Limites**
- Rate limit ordens: **100/s por key**
- Erro 311 = rate limit atingido, 312 = exceeded
- Order book: **10ms** de update disponível
- Subscriptions por conexão: sem limite documentado

**Para 1000+ símbolos:** sem limite de subscriptions → pode subscrever tudo em **1 conexão**

---

## Bitget

> Existem duas gerações de API. Para novos projetos, usar **V3/UTA**.

**Endpoints**

| Versão | Ambiente | Público | Privado |
|---|---|---|---|
| V2 (legado) | Produção | `wss://ws.bitget.com/v2/ws/public` | `wss://ws.bitget.com/v2/ws/private` |
| **V3/UTA** (recomendado) | Produção | `wss://ws.bitget.com/v3/ws/public` | `wss://ws.bitget.com/v3/ws/private` |
| V2 | Demo/Paper | `wss://wspap.bitget.com/v2/ws/public` | `wss://wspap.bitget.com/v2/ws/private` |
| V3 | Demo/Paper | `wss://wspap.bitget.com/v3/ws/public` | `wss://wspap.bitget.com/v3/ws/private` |

**Ping/Pong**
- Cliente envia: string `"ping"` (texto simples, **não JSON**)
- Servidor responde: string `"pong"`
- Intervalo recomendado: **a cada 30s**
- Disconnect se: sem ping por **2 minutos** OU mais de **10 msgs/s**
- ⚠️ IP repetidamente desconectado pode ser **bloqueado permanentemente**

**Reconnect:** Manual. Implementar reconnect automático é obrigatório.

**Auth (privado)**
- Campos: `apiKey` + `passphrase` + `timestamp` + `sign` (HMAC SHA256)
- `op: "login"` antes de subscrever canais privados

**Subscribe / Unsubscribe**
```json
{"op": "subscribe", "args": [{"instType": "SPOT", "channel": "ticker", "instId": "BTCUSDT"}]}
{"op": "unsubscribe", "args": [...]}
```

**Limites por conexão**
| Limite | Valor |
|---|---|
| Channels máx. por conexão | **1000** (recomendado: **< 50** para estabilidade) |
| Requests de subscription/hora | **240** |
| Rate msgs/s | **máx. 10** |

**Limites por IP**
| Limite | Valor |
|---|---|
| Conexões simultâneas por IP | **máx. 100** |
| Connection requests em 5 min | **máx. 300** |
| REST rate limit | **6.000 req/IP/min** (cooldown: 5 min após trigger) |

**Para 1000+ símbolos**
- Recomendado: **20 conexões** (50 channels cada) — estável
- Alternativa: 1–2 conexões com ~1000 channels — possível mas menos estável
- Nunca exceder 300 connection requests em 5 min

---

## XT

### Futures WS (`wss://fstream.x.group/ws/market`)

**Conexão**
- Endpoint principal: `wss://fstream.x.group/ws/market`
- Endpoint alternativo: `wss://fstream.xt.com/ws/market`
- Canais apenas públicos (sem private documentado)

**Ping/Pong**
- Cliente envia: texto simples `ping`
- Servidor responde: texto simples `pong`
- Timeout: sem ping em **30s** → desconecta

**Reconnect:** Manual (não documentado)

**Subscribe**
```json
{"method": "SUBSCRIBE", "params": ["depth_update@btc_usdt"], "id": "uuid"}
```
- Resposta: `{"id": "uuid", "code": 0, "msg": ""}` (0=sucesso, 1=falha)

**Limites**
- Subscription limit: não documentado
- Rate limits: não documentados
- IP limits: não documentados

---

### Spot WS (`wss://stream.xt.com/public`)

> ⚠️ **Endpoint diferente do Futures** — não confundir

**Conexão**
- Endpoint: `wss://stream.xt.com/public`
- Header obrigatório: `Sec-WebSocket-Extensions: permessage-deflate`

**Ping/Pong**
- Cliente envia: texto simples `ping`
- Servidor responde: texto simples `pong`
- Timeout: sem ping em **1 min** → desconecta (diferente do Futures que é 30s)

**Subscribe** (formato diferente do Futures)
```json
{"method": "SUBSCRIBE", "params": ["ticker@btc_usdt"]}
```
- Resposta de conexão: `{"rc": 0, "mc": "SUCCESS", "ma": [], "result": {}}`

**Limites**
- Subscription limit: não documentado
- Rate limits: não documentados
- IP limits: não documentados

---

## Estratégia para 1000+ Símbolos

### Resumo por exchange

| Exchange | Modalidade | Solução recomendada | Conexões |
|---|---|---|---|
| MEXC | Spot | Stream agregado `spot@public.miniTickers.v3.api.pb@UTC+8` | **1** |
| MEXC | Futures | `sub.tickers` | **1** |
| BingX | Spot | Distribuir (máx. 200/conn) | **≥5** |
| BingX | Futures | Não documentado (usar ~200/conn conservador) | **≥5** |
| KuCoin | Spot+Futures | Distribuir (máx. 200 tópicos/conn) | **≥5** |
| Gate | Spot | `spot.tickers` com `["!all"]` | **1** |
| Gate | Futures | Multi-subscribe sem limite | **1** |
| Bitget | Spot+Futures | ≤50 channels/conn para estabilidade | **≥20** |
| XT | Spot | Não documentado (testar limites) | **a definir** |
| XT | Futures | Não documentado (testar limites) | **a definir** |

### Regras obrigatórias para qualquer exchange

1. **Prefira streams agregados** ("all tickers") — 1 subscription cobre milhares de símbolos
2. **Implemente reconnect automático** — todas desconectam em 24h ou por timeout
3. **Cada conexão tem seu próprio loop de ping/pong** independente
4. **Nunca abra conexões mais rápido que o rate limit** da exchange
5. **Monitore IP ban** — Bitget e outras bloqueiam IPs com reconnects excessivos
6. **GZIP/Protobuf** — MEXC Spot usa Protobuf; BingX usa GZIP; MEXC Futures usa GZIP opcional

### Rate limits críticos por IP

| Exchange | Limite | Cooldown |
|---|---|---|
| MEXC Spot WS | 100 msgs/s por conexão | — |
| BingX ordens | 10 req/s | — |
| Gate ordens Spot | 10/s por key | — |
| Gate ordens Futures | 100/s por key | — |
| Bitget REST | 6.000 req/IP/min | 5 min |
| Bitget conexões | 100/IP simultâneas + 300 conn req/5min | — |
| KuCoin WS | 100 msgs / 10s por conexão | — |
