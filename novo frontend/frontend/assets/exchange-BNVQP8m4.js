/* ========================================
 * Exchange URL Mapping Module
 * Gera URLs de trading para 16 exchanges (spot + futures)
 * ======================================== */

/**
 * Normaliza o nome da exchange para slug padrao.
 * Ex: "Gate.io" -> "gate", "GateIO" -> "gate"
 */
const normalizeExchangeName = (exchangeName) => {
  const slug = (exchangeName ?? "").trim().toLowerCase();
  if (!slug) return "";
  if (slug === "gate.io" || slug === "gateio") return "gate";
  return slug;
};

/**
 * Retorna a URL de trading para uma moeda em determinada exchange.
 * @param {string} asset - Simbolo do ativo (ex: "BTC", "ETH")
 * @param {string} exchangeName - Nome da exchange (ex: "binance", "mexc")
 * @param {string} marketType - Tipo de mercado: "spot" ou "future"
 * @returns {string} URL da pagina de trading, ou string vazia se nao encontrado
 */
const getExchangeUrl = (asset, exchangeName, marketType) => {
  const symbol = (asset || "").replace("/", "").toUpperCase();
  const pairUSDT = `${symbol}_USDT`;
  const baseSymbol = symbol;

  const exchangeUrlMap = {
    binance: {
      spot: `https://www.binance.com/pt-BR/trade/${pairUSDT}?type=spot`,
      future: `https://www.binance.com/pt-BR/futures/${pairUSDT}`,
    },
    mexc: {
      spot: `https://www.mexc.com/pt-PT/exchange/${pairUSDT}`,
      future: `https://futures.mexc.com/pt-PT/exchange/${pairUSDT}`,
    },
    gate: {
      spot: `https://www.gate.com/pt-br/trade/${pairUSDT}`,
      future: `https://www.gate.com/pt-br/futures/USDT/${pairUSDT}`,
    },
    gateio: {
      spot: `https://www.gate.com/pt-br/trade/${pairUSDT}`,
      future: `https://www.gate.com/pt-br/futures/USDT/${pairUSDT}`,
    },
    "gate.io": {
      spot: `https://www.gate.com/pt-br/trade/${pairUSDT}`,
      future: `https://www.gate.com/pt-br/futures/USDT/${pairUSDT}`,
    },
    bybit: {
      spot: `https://www.bybit.com/trade/spot/${baseSymbol}/USDT`,
      future: `https://www.bybit.com/trade/usdt/${pairUSDT}`,
    },
    kucoin: {
      spot: `https://www.kucoin.com/pt/trade/${baseSymbol}-USDT`,
      future: `https://www.kucoin.com/pt/futures/trade/${baseSymbol}USDTM`,
    },
    bitget: {
      spot: `https://www.bitget.com/pt/spot/${baseSymbol}USDT`,
      future: `https://www.bitget.com/pt/futures/usdt/${baseSymbol}USDT`,
    },
    htx: {
      spot: `https://www.htx.com/trade/${baseSymbol.toLowerCase()}_usdt?type=spot`,
      future: `https://www.htx.com/pt-pt/futures/linear_swap/exchange#contract_code=${baseSymbol}-USDT`,
    },
    bingx: {
      spot: `https://bingx.com/pt-br/spot/${baseSymbol}USDT`,
      future: `https://bingx.com/pt-br/perpetual/${baseSymbol}-USDT`,
    },
    kcex: {
      spot: `https://www.kcex.com/exchange/${pairUSDT}?inviteCode=MUQRPU`,
      future: `https://www.kcex.com/pt-PT/futures/exchange/${pairUSDT}?inviteCode=MUQRPU`,
    },
    coinext: {
      spot: `https://coinext.com.br/trade/${baseSymbol.toLowerCase()}usdt`,
      future: `https://coinext.com.br/trade/${baseSymbol.toLowerCase()}usdt`,
    },
    mercado: {
      spot: `https://www.mercadobitcoin.com.br/negociacao/compra-e-venda/${baseSymbol}`,
      future: `https://www.mercadobitcoin.com.br/negociacao/compra-e-venda/${baseSymbol}`,
    },
    novadax: {
      spot: `https://www.novadax.com/product/${baseSymbol}_USDT`,
      future: `https://www.novadax.com/product/${baseSymbol}_USDT`,
    },
    ripiotrade: {
      spot: `https://www.ripio.com/br/app/exchange/${baseSymbol}/USDT`,
      future: `https://www.ripio.com/br/app/exchange/${baseSymbol}/USDT`,
    },
    xt: {
      spot: `https://www.xt.com/trade/${baseSymbol.toLowerCase()}_usdt`,
      future: `https://www.xt.com/pt/futures/trade/${baseSymbol.toLowerCase()}_usdt`,
    },
    XT: {
      spot: `https://www.xt.com/trade/${baseSymbol.toLowerCase()}_usdt`,
      future: `https://www.xt.com/pt/futures/trade/${baseSymbol.toLowerCase()}_usdt`,
    },
    ourbit: {
      spot: `https://www.ourbit.com/pt-PT/exchange/${baseSymbol.toUpperCase()}_USDT`,
      future: `https://futures.ourbit.com/pt-PT/exchange/${baseSymbol.toUpperCase()}_USDT`,
    },
  };

  const normalizedExchange = (exchangeName || "").toLowerCase();
  return exchangeUrlMap[normalizedExchange]?.[marketType] || "";
};

export { getExchangeUrl as b, normalizeExchangeName as n };
