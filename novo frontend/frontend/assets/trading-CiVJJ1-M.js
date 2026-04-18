/* ============================================================
 *  Trading Page – TradingView charts, order book, depth chart,
 *  funding history for crypto trading
 * ============================================================ */

/* -------------------------------------------------------
 *  Imports
 * ------------------------------------------------------- */
import {
  a as l,
  K as ie,
  j as e,
  e as g,
  T as I,
  S as h,
  M as oe,
  B as de,
} from "./index-Bx06KCE-.js";
import { h as ce } from "./react-apexcharts.esm-B8DZI7x8.js";
import { P as J } from "./Page-hVEPjFz_.js";
import { a as xe } from "./coinsApi-BPsBZGFa.js";
import { F as me } from "./ArrowTrendingUpIcon-CPkyWYZ2.js";
import { F as W } from "./CheckCircleIcon-oyDfoM4P.js";
import { F as he } from "./Squares2X2Icon-CnDifh_s.js";
import { F as ue } from "./ClockIcon-c5Zk21LG.js";
import { B as pe, W as fe, d as ge, j as be, K as _ } from "./tabs-Cdkz3LDK.js";
import "./use-resolve-button-type-DwKZeOeP.js";
import "./use-is-mounted-D7iMJT5-.js";

/* -------------------------------------------------------
 *  SVG Icon: ExclamationTriangleIcon (warning triangle)
 * ------------------------------------------------------- */
function ExclamationTriangleIconRender(
  { title: svgTitle, titleId: svgTitleId, ...restProps },
  ref,
) {
  return l.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        strokeWidth: 1.5,
        stroke: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? l.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    l.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
    }),
  );
}
const ExclamationTriangleIcon = l.forwardRef(ExclamationTriangleIconRender);

/* -------------------------------------------------------
 *  SVG Icon: StarIcon (outline star – unfavorited)
 * ------------------------------------------------------- */
function StarOutlineIconRender(
  { title: svgTitle, titleId: svgTitleId, ...restProps },
  ref,
) {
  return l.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        strokeWidth: 1.5,
        stroke: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? l.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    l.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
    }),
  );
}
const StarOutlineIcon = l.forwardRef(StarOutlineIconRender);

/* -------------------------------------------------------
 *  SVG Icon: XCircleIcon (circle with X – cancel/error)
 * ------------------------------------------------------- */
function XCircleIconRender(
  { title: svgTitle, titleId: svgTitleId, ...restProps },
  ref,
) {
  return l.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        strokeWidth: 1.5,
        stroke: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? l.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    l.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    }),
  );
}
const XCircleIcon = l.forwardRef(XCircleIconRender);

/* -------------------------------------------------------
 *  SVG Icon: StarSolidIcon (filled star – favorited)
 * ------------------------------------------------------- */
function StarSolidIconRender(
  { title: svgTitle, titleId: svgTitleId, ...restProps },
  ref,
) {
  return l.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? l.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    l.createElement("path", {
      fillRule: "evenodd",
      d: "M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z",
      clipRule: "evenodd",
    }),
  );
}
const StarSolidIcon = l.forwardRef(StarSolidIconRender);

/* -------------------------------------------------------
 *  Mock Data: Candlestick chart generation
 * ------------------------------------------------------- */
const DEFAULT_MOCK_PRICE = 67e3;

const generateCandlestickData = (candleCount, basePrice) => {
  const candles = [];
  let timestamp = new Date().getTime() - candleCount * 15 * 60 * 1e3;
  let currentPrice = basePrice;
  for (let idx = 0; idx < candleCount; idx++) {
    const openPrice = currentPrice;
    const priceStep = basePrice * 0.001;
    const randomDelta = (Math.random() - 0.5) * priceStep * 3;
    const closePrice = openPrice + randomDelta;
    const highPrice =
      Math.max(openPrice, closePrice) + Math.random() * priceStep;
    const lowPrice =
      Math.min(openPrice, closePrice) - Math.random() * priceStep;
    candles.push({
      x: new Date(timestamp),
      y: [
        Number(openPrice.toFixed(2)),
        Number(highPrice.toFixed(2)),
        Number(lowPrice.toFixed(2)),
        Number(closePrice.toFixed(2)),
      ],
    });
    currentPrice = closePrice;
    timestamp += 900 * 1e3;
  }
  return candles;
};

const candlestickSeries = [
  {
    name: "candle",
    data: generateCandlestickData(60, DEFAULT_MOCK_PRICE),
  },
];

/* -------------------------------------------------------
 *  ApexCharts configuration for candlestick chart
 * ------------------------------------------------------- */
const candlestickChartOptions = {
  chart: {
    type: "candlestick",
    height: 450,
    fontFamily: "inherit",
    toolbar: {
      show: true,
    },
    background: "transparent",
  },
  grid: {
    borderColor: "rgba(107, 114, 128, 0.1)",
    strokeDashArray: 4,
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  theme: {
    mode: "light",
  },
  xaxis: {
    type: "datetime",
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
    tooltip: {
      enabled: false,
    },
    labels: {
      style: {
        colors: "#6b7280",
      },
    },
  },
  yaxis: {
    tooltip: {
      enabled: true,
    },
    opposite: true,
    labels: {
      formatter: (value) => value.toFixed(2),
      style: {
        colors: "#6b7280",
      },
    },
  },
  plotOptions: {
    candlestick: {
      colors: {
        upward: "#10b981",
        downward: "#f43f5e",
      },
    },
  },
};

/* -------------------------------------------------------
 *  Mock Data: Order book generation (bids & asks)
 * ------------------------------------------------------- */
const generateMockOrderBook = (midPrice, levelCount) => {
  const bids = [];
  const asks = [];
  let currentBidPrice = midPrice * 0.9998;
  let currentAskPrice = midPrice * 1.0002;
  for (let idx = 0; idx < levelCount; idx++) {
    const bidSize = Math.random() * 2 + 0.05;
    const bidDecrement = Math.random() * (midPrice * 1e-4);
    const bidPrice = currentBidPrice - bidDecrement;
    bids.push({
      price: bidPrice,
      size: bidSize,
      total: (bids[idx - 1]?.total || 0) + bidSize,
    });
    currentBidPrice = bidPrice;
    const askSize = Math.random() * 2 + 0.05;
    const askIncrement = Math.random() * (midPrice * 1e-4);
    const askPrice = currentAskPrice + askIncrement;
    asks.push({
      price: askPrice,
      size: askSize,
      total: (asks[idx - 1]?.total || 0) + askSize,
    });
    currentAskPrice = askPrice;
  }
  return {
    bids: bids,
    asks: asks,
  };
};

/* -------------------------------------------------------
 *  WebSocket configuration & auth helpers
 * ------------------------------------------------------- */
const ORDERBOOK_WS_URL = "ws://localhost:8087/crypto/exchange-ws";

const getAuthToken = () => {
  return typeof window < "u" ? localStorage.getItem("authToken") : null;
};

const buildAuthenticatedWsUrl = () => {
  const baseUrl = ORDERBOOK_WS_URL;
  const token = getAuthToken();
  if (!token) return baseUrl;
  try {
    const urlObj = new URL(baseUrl);
    return (urlObj.searchParams.set("token", token), urlObj.toString());
  } catch {
    return token ? `${baseUrl}?token=${token}` : baseUrl;
  }
};

/* -------------------------------------------------------
 *  Initial mock order book data & formatters
 * ------------------------------------------------------- */
const initialMockOrderBook = generateMockOrderBook(DEFAULT_MOCK_PRICE, 12);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* -------------------------------------------------------
 *  Order book parsing helpers
 * ------------------------------------------------------- */
const parseOrderBookSide = (rawLevels, sortDirection = "asc") => {
  const levels = Array.isArray(rawLevels) ? [...rawLevels] : [];
  levels.sort((levelA, levelB) => {
    const priceA = Number(levelA[0]) || 0;
    const priceB = Number(levelB[0]) || 0;
    return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
  });
  let runningTotal = 0;
  return levels.map(([rawPrice, rawSize]) => {
    const price = Number(rawPrice) || 0;
    const size = Number(rawSize) || 0;
    return (
      (runningTotal += size),
      {
        price: price,
        size: size,
        total: runningTotal,
      }
    );
  });
};

const parseWebSocketOrderBook = (wsMessage) => ({
  asks: parseOrderBookSide(wsMessage.orderBook?.asks, "asc"),
  bids: parseOrderBookSide(wsMessage.orderBook?.bids, "desc"),
});

/* -------------------------------------------------------
 *  Exchange name normalizer
 * ------------------------------------------------------- */
const normalizeExchangeName = (rawExchange) => {
  if (!rawExchange) return "htx";
  const lowerName = rawExchange.toLowerCase();
  return lowerName.includes("gate") ? "gate" : lowerName.replace(/\.io$/, "");
};

/* -------------------------------------------------------
 *  Loading skeleton placeholder component
 * ------------------------------------------------------- */
const TradingPageSkeleton = () =>
  e.jsxs("div", {
    className:
      "flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-dark-900 text-white",
    children: [
      e.jsxs("div", {
        className:
          "flex shrink-0 flex-col gap-4 border-b border-dark-700 bg-dark-900 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-2",
        children: [
          e.jsxs("div", {
            className: "flex items-center gap-5",
            children: [
              e.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  e.jsx(h, {
                    className: "h-8 w-8 rounded-full",
                  }),
                  e.jsxs("div", {
                    className: "space-y-2",
                    children: [
                      e.jsx(h, {
                        className: "h-4 w-24",
                      }),
                      e.jsx(h, {
                        className: "h-3 w-16",
                      }),
                    ],
                  }),
                ],
              }),
              e.jsx("div", {
                className: "hidden h-8 w-px bg-dark-700/70 sm:block",
              }),
              e.jsx(h, {
                className: "h-6 w-20",
              }),
            ],
          }),
          e.jsxs("div", {
            className: "hidden items-center gap-6 xl:flex",
            children: [
              e.jsx(h, {
                className: "h-4 w-20",
              }),
              e.jsx(h, {
                className: "h-4 w-20",
              }),
              e.jsx(h, {
                className: "h-4 w-24",
              }),
              e.jsx(h, {
                className: "h-4 w-24",
              }),
            ],
          }),
          e.jsxs("div", {
            className: "flex flex-wrap items-center gap-3",
            children: [
              e.jsx(h, {
                className: "h-10 w-40 rounded-2xl",
              }),
              e.jsx(h, {
                className: "h-10 w-56 rounded-2xl",
              }),
            ],
          }),
        ],
      }),
      e.jsxs("div", {
        className: "flex flex-1 overflow-hidden bg-dark-900/60",
        children: [
          e.jsxs("div", {
            className: "flex flex-1 flex-col overflow-hidden",
            children: [
              e.jsx("div", {
                className:
                  "relative flex-1 border-b border-r border-dark-700 bg-dark-900 p-4",
                children: e.jsx(h, {
                  className: "h-full w-full rounded-2xl",
                }),
              }),
              e.jsxs("div", {
                className:
                  "h-[320px] shrink-0 border-r border-dark-700 bg-dark-900 p-4",
                children: [
                  e.jsx(h, {
                    className: "mb-4 h-5 w-40",
                  }),
                  e.jsx(h, {
                    className: "h-full w-full rounded-xl",
                  }),
                ],
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "hidden w-[300px] shrink-0 flex-col gap-4 border-l border-dark-700 bg-dark-900 p-4 lg:flex",
            children: [
              e.jsx(h, {
                className: "h-4 w-24",
              }),
              e.jsx("div", {
                className: "space-y-2",
                children: Array.from({
                  length: 8,
                }).map((item, index) =>
                  e.jsx(
                    h,
                    {
                      className: "h-4 w-full",
                    },
                    `orderbook-skeleton-${index}`,
                  ),
                ),
              }),
              e.jsx(h, {
                className: "mt-2 h-4 w-32",
              }),
              e.jsx("div", {
                className: "space-y-2",
                children: Array.from({
                  length: 4,
                }).map((item, index) =>
                  e.jsx(
                    h,
                    {
                      className: "h-10 w-full rounded-lg",
                    },
                    `chain-skeleton-${index}`,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  });

/* -------------------------------------------------------
 *  Main Trading Page Component
 * ------------------------------------------------------- */
function TradingPage() {
  const { symbol: routeSymbol } = ie();
  const [isFavorited, setIsFavorited] = l.useState(false);
  const [coinRawData, setCoinRawData] = l.useState(null);
  const [isLoading, setIsLoading] = l.useState(true);
  const [selectedMarketType, setSelectedMarketType] = l.useState(null);
  const [selectedExchangeId, setSelectedExchangeId] = l.useState(null);
  const [orderBookData, setOrderBookData] = l.useState(initialMockOrderBook);
  const wsRef = l.useRef(null);
  const wsSubscriptionRef = l.useRef(null);
  const [activeChartView, setActiveChartView] = l.useState("original");

  const chartViewOptions = [
    {
      id: "original",
      label: "Original",
    },
    {
      id: "tradingview",
      label: "TradingView",
    },
    {
      id: "depth",
      label: "Depth",
    },
  ];

  const symbol = (routeSymbol || "BTC").toUpperCase();
  const bottomTabIds = [
    "posicoes",
    "ordens_abertas",
    "historico",
    "funding_history",
  ];

  /* --- Fetch coin data from API --- */
  l.useEffect(() => {
    async function fetchCoinData() {
      setIsLoading(true);
      try {
        const response = await xe(symbol);
        setCoinRawData(response);
      } catch (error) {
        console.error("Failed to load coin raw data", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCoinData();
  }, [symbol]);

  /* --- Build market type options (Spot / Futures) --- */
  const marketItems = coinRawData?.items || [];
  const marketTypeOptions = l.useMemo(
    () =>
      marketItems.map((item) => ({
        value: item.market,
        label: item.market === "future" ? "Futuros" : "Spot",
        item: item,
      })),
    [marketItems],
  );

  /* --- Default to "future" market if available --- */
  l.useEffect(() => {
    if (!marketTypeOptions.length) return;
    const defaultMarket =
      marketTypeOptions.find((opt) => opt.value === "future")?.value ||
      marketTypeOptions[0].value;
    setSelectedMarketType((current) => current || defaultMarket);
  }, [marketTypeOptions]);

  /* --- Resolve currently selected market item --- */
  const selectedMarketItem = l.useMemo(
    () =>
      selectedMarketType
        ? marketTypeOptions.find((opt) => opt.value === selectedMarketType)
            ?.item ||
          marketTypeOptions[0]?.item ||
          null
        : marketTypeOptions[0]?.item || null,
    [marketTypeOptions, selectedMarketType],
  );

  /* --- Build exchange options for selected market --- */
  const exchangeOptions = l.useMemo(
    () =>
      selectedMarketItem?.data?.length
        ? selectedMarketItem.data.map((item, index) => {
            const ticker = item.data?.ticker || {};
            const contract = item.data?.contract;
            const rawLabel =
              item.exchange ||
              ticker.symbol ||
              contract?.symbol ||
              ticker.contract ||
              ticker.currency_pair ||
              `Exchange ${index + 1}`;
            const displayLabel =
              typeof rawLabel == "string"
                ? rawLabel.replace(/[_-]/g, "/")
                : `Exchange ${index + 1}`;
            const exchangeSlug = item.exchange || displayLabel;
            return {
              id: `${selectedMarketItem.market}-${index}-${exchangeSlug}`,
              label: displayLabel,
              entry: item,
            };
          })
        : [],
    [selectedMarketItem],
  );

  /* --- Auto-select first exchange when options change --- */
  l.useEffect(() => {
    if (!exchangeOptions.length) return;
    (selectedExchangeId &&
      exchangeOptions.some((opt) => opt.id === selectedExchangeId)) ||
      setSelectedExchangeId(exchangeOptions[0].id);
  }, [exchangeOptions, selectedExchangeId]);

  /* --- Resolve selected exchange option --- */
  const selectedExchangeOption = l.useMemo(
    () =>
      exchangeOptions.length
        ? (selectedExchangeId
            ? exchangeOptions.find((opt) => opt.id === selectedExchangeId)
            : null) || exchangeOptions[0]
        : null,
    [exchangeOptions, selectedExchangeId],
  );

  /* --- Resolve selected exchange entry data --- */
  const selectedExchangeEntry = l.useMemo(
    () => (selectedExchangeOption?.entry ? selectedExchangeOption.entry : null),
    [selectedExchangeOption],
  );

  const isSpotMarket = selectedMarketItem?.market === "spot";

  /* --- Build TradingView symbol string --- */
  const tradingViewSymbol = l.useMemo(() => {
    const exchangeName = (
      selectedExchangeOption?.entry?.exchange ||
      selectedExchangeOption?.label ||
      "BINANCE"
    )
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const cleanSymbol = symbol.replace(/[^A-Z0-9]/g, "");
    return `${exchangeName}:${cleanSymbol}USDT`;
  }, [
    symbol,
    selectedExchangeOption?.entry?.exchange,
    selectedExchangeOption?.label,
    isSpotMarket,
  ]);

  /* --- Extract ticker stats (price, volume, funding, etc.) --- */
  const tickerStats = l.useMemo(() => {
    const ticker = selectedExchangeEntry?.data?.ticker;
    const lastPrice = Number(ticker?.last || ticker?.lastPrice || 0);
    const low24h = Number(ticker?.low_24h || 0);
    const high24h = Number(ticker?.high_24h || 0);
    const volume24h = Number(ticker?.volume_24h || 0);
    const volume24hUsdt = Number(ticker?.volume_24h_quote || 0);
    let fundingRate =
      ticker?.fundingRate ||
      ticker?.funding_rate ||
      selectedExchangeEntry?.data?.contract?.funding_rate ||
      0;
    return (
      (fundingRate = Number(fundingRate)),
      {
        price: lastPrice,
        change: 0,
        high: high24h,
        low: low24h,
        vol24h: volume24h,
        volUsdt: volume24hUsdt,
        funding: fundingRate,
        contract:
          ticker?.contract || selectedExchangeEntry?.data?.contract?.symbol,
      }
    );
  }, [selectedExchangeEntry]);
  console.log(tickerStats);

  /* --- Extract blockchain network/chain info --- */
  const chainNetworks = l.useMemo(
    () =>
      (
        (
          selectedExchangeEntry?.data?.currency ||
          selectedExchangeEntry?.data?.coin
        )?.chains || []
      ).map((item) => ({
        name: item.chainName || item.chain || "Unknown",
        network: item.chain || item.chainName || "UNK",
        status:
          item.isDepositEnabled ||
          item.rechargeable === "true" ||
          item.rechargeable === true
            ? "active"
            : "maintenance",
        deposit:
          item.isDepositEnabled ||
          item.rechargeable === "true" ||
          item.rechargeable === true,
        withdraw:
          item.isWithdrawEnabled ||
          item.withdrawable === "true" ||
          item.withdrawable === true,
        confirmations: Number(item.depositConfirm || item.confirms || 0),
      })),
    [selectedExchangeEntry],
  );

  /* --- Extract funding rate history --- */
  const fundingHistory = l.useMemo(
    () => selectedExchangeEntry?.data?.funding_history || [],
    [selectedExchangeEntry],
  );

  /* --- Sliced order book (top 9 levels each side) --- */
  const slicedOrderBook = l.useMemo(
    () => ({
      asks: orderBookData.asks.slice(0, 9),
      bids: orderBookData.bids.slice(0, 9),
    }),
    [orderBookData],
  );

  /* --- Max cumulative total for order book bar rendering --- */
  const orderBookMaxTotal = l.useMemo(() => {
    const maxAskTotal =
      slicedOrderBook.asks[slicedOrderBook.asks.length - 1]?.total ?? 0;
    const maxBidTotal =
      slicedOrderBook.bids[slicedOrderBook.bids.length - 1]?.total ?? 0;
    return Math.max(maxAskTotal, maxBidTotal, 1);
  }, [slicedOrderBook]);

  /* --- Mid-price between best ask and best bid --- */
  const midPrice = l.useMemo(() => {
    const bestAsk = slicedOrderBook.asks[0]?.price;
    const bestBid = slicedOrderBook.bids[0]?.price;
    return bestAsk && bestBid
      ? (bestAsk + bestBid) / 2
      : (bestAsk ?? bestBid ?? tickerStats.price);
  }, [slicedOrderBook, tickerStats.price]);

  return (
    /* --- WebSocket connection for live order book --- */
    (
      l.useEffect(() => {
        const wsUrl = buildAuthenticatedWsUrl();
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        const handleOpen = () => {
          if (wsSubscriptionRef.current) {
            socket.send(JSON.stringify(wsSubscriptionRef.current));
          }
        };

        const handleMessage = (messageEvent) => {
          try {
            const parsedData = JSON.parse(messageEvent.data);
            if (!parsedData.orderBook) return;
            const parsedBook = parseWebSocketOrderBook(parsedData);
            setOrderBookData((prevBook) => ({
              asks: parsedBook.asks.length ? parsedBook.asks : prevBook.asks,
              bids: parsedBook.bids.length ? parsedBook.bids : prevBook.bids,
            }));
          } catch (parseError) {
            console.warn("Fallha ao interpretar o order book:", parseError);
          }
        };

        const handleError = () => console.warn("Order book websocket error");
        const handleClose = () =>
          console.info("Order book websocket disconnected, reconnecting...");

        return (
          socket.addEventListener("open", handleOpen),
          socket.addEventListener("message", handleMessage),
          socket.addEventListener("error", handleError),
          socket.addEventListener("close", handleClose),
          () => {
            socket.removeEventListener("open", handleOpen);
            socket.removeEventListener("message", handleMessage);
            socket.removeEventListener("error", handleError);
            socket.removeEventListener("close", handleClose);
            if (
              socket.readyState === WebSocket.OPEN ||
              socket.readyState === WebSocket.CONNECTING
            ) {
              socket.close();
            }
            if (wsRef.current === socket) {
              wsRef.current = null;
            }
          }
        );
      }, []),
      /* --- Send subscription message when exchange/market changes --- */
      l.useEffect(() => {
        const exchangeSlug = normalizeExchangeName(
          selectedExchangeOption?.entry?.exchange ||
            selectedExchangeOption?.label,
        );
        const subscriptionPayload = {
          crypto: symbol,
          current: "USDT",
          exchange: String(exchangeSlug).toLowerCase(),
          market: selectedMarketItem?.market || "spot",
        };
        wsSubscriptionRef.current = subscriptionPayload;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(subscriptionPayload));
        }
      }, [
        symbol,
        selectedMarketItem?.market,
        selectedExchangeOption?.entry?.exchange,
        selectedExchangeOption?.label,
        selectedExchangeId,
        selectedMarketType,
      ]),
      /* --- Render: show skeleton while loading --- */
      isLoading
        ? e.jsx(J, {
            title: `Trading ${symbol}`,
            children: e.jsx(TradingPageSkeleton, {}),
          })
        : e.jsx(J, {
            title: `Trading ${symbol}`,
            children: e.jsxs("div", {
              className:
                "flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-dark-900 text-white",
              children: [
                /* ===== TOP HEADER BAR ===== */
                e.jsxs("div", {
                  className:
                    "flex shrink-0 flex-col gap-4 border-b border-dark-700 bg-dark-900 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-2",
                  children: [
                    /* --- Symbol info & price --- */
                    e.jsxs("div", {
                      className: "flex items-center gap-5",
                      children: [
                        e.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            /* Favorite toggle button */
                            e.jsx("button", {
                              onClick: () => setIsFavorited(!isFavorited),
                              className: g(
                                "transition p-1 rounded-full hover:bg-dark-800 dark:hover:bg-dark-700",
                                isFavorited
                                  ? "text-amber-400"
                                  : "text-gray-300",
                              ),
                              children: isFavorited
                                ? e.jsx(StarSolidIcon, {
                                    className: "size-5",
                                  })
                                : e.jsx(StarOutlineIcon, {
                                    className: "size-5",
                                  }),
                            }),
                            /* Symbol badge & market label */
                            e.jsxs("div", {
                              className: "flex items-center gap-2",
                              children: [
                                e.jsx("div", {
                                  className:
                                    "h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs",
                                  children: symbol[0],
                                }),
                                e.jsxs("div", {
                                  children: [
                                    e.jsxs("h1", {
                                      className:
                                        "text-lg font-bold leading-tight text-white flex items-center gap-2",
                                      children: [symbol, "/USDT"],
                                    }),
                                    e.jsxs("span", {
                                      className:
                                        "text-xs text-gray-400 capitalize",
                                      children: [
                                        selectedMarketItem?.market || "Spot",
                                        " Market",
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                        /* Vertical divider */
                        e.jsx("div", {
                          className: "h-8 w-px bg-dark-700/70 hidden sm:block",
                        }),
                        /* Current price display */
                        e.jsx("div", {
                          className: "flex flex-col",
                          children: e.jsx("span", {
                            className:
                              "text-xl font-bold text-emerald-500 leading-none",
                            children: tickerStats.price.toString(),
                          }),
                        }),
                      ],
                    }),
                    /* --- 24h stats (visible on xl screens) --- */
                    e.jsxs("div", {
                      className:
                        "hidden xl:flex items-center gap-8 text-xs border-x border-dark-700 px-6 text-gray-300",
                      children: [
                        e.jsx(StatLabel, {
                          label: "24h High",
                          value: tickerStats.high.toString(),
                        }),
                        e.jsx(StatLabel, {
                          label: "24h Low",
                          value: tickerStats.low.toString(),
                        }),
                        e.jsx(StatLabel, {
                          label: "24h Vol (BTC)",
                          value: (tickerStats.vol24h / 1e6).toFixed(2) + "M",
                        }),
                        e.jsx(StatLabel, {
                          label: "24h Vol (USDT)",
                          value: (tickerStats.volUsdt / 1e6).toFixed(2) + "M",
                        }),
                        !isSpotMarket &&
                          e.jsx(StatLabel, {
                            label: "Funding Rate",
                            value: (tickerStats.funding * 100).toFixed(4) + "%",
                            highlight: "amber",
                          }),
                      ],
                    }),
                    /* --- Market type & exchange selectors --- */
                    e.jsxs("div", {
                      className: "flex flex-wrap items-center gap-3",
                      children: [
                        /* Market type toggle (Spot / Futures) */
                        e.jsx("div", {
                          className:
                            "flex items-center gap-2 rounded-2xl border border-dark-700 bg-dark-900/60 px-2 py-2 shadow-sm",
                          children: marketTypeOptions.map((opt) => {
                            const isActive =
                              (selectedMarketType ||
                                marketTypeOptions[0]?.value) === opt.value;
                            return e.jsx(
                              "button",
                              {
                                onClick: () => {
                                  setSelectedMarketType(opt.value);
                                  setSelectedExchangeId(null);
                                },
                                className: g(
                                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                                  isActive
                                    ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-500"
                                    : "text-gray-300 hover:text-primary-400 dark:text-primary-300",
                                ),
                                children: opt.label,
                              },
                              opt.value,
                            );
                          }),
                        }),
                        /* Exchange dropdown selector */
                        e.jsxs("div", {
                          className:
                            "flex items-center gap-2 rounded-2xl border border-dark-700 bg-dark-800/70 px-3 py-2 shadow-sm",
                          children: [
                            e.jsx("span", {
                              className:
                                "text-xs font-semibold text-gray-500 dark:text-dark-300 whitespace-nowrap",
                              children: "Exchange",
                            }),
                            e.jsx("select", {
                              className:
                                "min-w-[200px] rounded-lg border border-dark-700 bg-dark-900 px-3 py-1.5 text-xs font-semibold text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500",
                              value:
                                selectedExchangeId ||
                                exchangeOptions[0]?.id ||
                                "",
                              onChange: (event) =>
                                setSelectedExchangeId(
                                  event.target.value || null,
                                ),
                              children: exchangeOptions.map((opt) =>
                                e.jsx(
                                  "option",
                                  {
                                    value: opt.id,
                                    children: opt.label,
                                  },
                                  opt.id,
                                ),
                              ),
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),

                /* ===== MAIN CONTENT AREA ===== */
                e.jsxs("div", {
                  className: "flex flex-1 overflow-hidden bg-dark-900/60",
                  children: [
                    /* --- Left column: Chart + bottom tabs --- */
                    e.jsxs("div", {
                      className: "flex flex-1 flex-col overflow-hidden",
                      children: [
                        /* --- Chart area --- */
                        e.jsxs("div", {
                          className:
                            "relative flex-1 border-b border-r border-dark-700 bg-dark-900",
                          children: [
                            /* Chart toolbar: timeframe + view mode */
                            e.jsxs("div", {
                              className:
                                "absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-dark-700/60",
                              children: [
                                /* Timeframe buttons */
                                e.jsx("div", {
                                  className: "flex gap-1",
                                  children: [
                                    "Time",
                                    "15m",
                                    "1h",
                                    "4h",
                                    "1D",
                                    "1W",
                                  ].map((timeframe, index) =>
                                    e.jsx(
                                      "button",
                                      {
                                        className: g(
                                          "text-xs font-medium px-2 py-1 rounded transition-colors hover:bg-dark-800",
                                          index === 2
                                            ? "text-primary-400 bg-dark-800/80 shadow-inner border border-primary-500/40"
                                            : "text-gray-300",
                                        ),
                                        children: timeframe,
                                      },
                                      timeframe,
                                    ),
                                  ),
                                }),
                                /* Chart view mode toggle */
                                e.jsx("div", {
                                  className: "flex gap-2",
                                  children: chartViewOptions.map((viewOpt) => {
                                    const isActiveView =
                                      activeChartView === viewOpt.id;
                                    return e.jsx(
                                      "button",
                                      {
                                        onClick: () =>
                                          setActiveChartView(viewOpt.id),
                                        className: g(
                                          "text-xs font-medium px-2 py-1 rounded transition-colors",
                                          isActiveView
                                            ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400 shadow-sm"
                                            : "text-gray-500 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400",
                                        ),
                                        children: viewOpt.label,
                                      },
                                      viewOpt.id,
                                    );
                                  }),
                                }),
                              ],
                            }),
                            /* Chart content area */
                            e.jsxs("div", {
                              className: "h-full w-full pt-12 pb-2",
                              children: [
                                activeChartView === "original" &&
                                  e.jsx(OriginalCandlestickChart, {}),
                                activeChartView === "tradingview" &&
                                  e.jsx("div", {
                                    className: "flex h-full flex-col",
                                    children: e.jsx("div", {
                                      className: "flex-1",
                                      children: e.jsx(TradingViewWidget, {
                                        symbol: tradingViewSymbol,
                                      }),
                                    }),
                                  }),
                                activeChartView === "depth" &&
                                  e.jsx(DepthChart, {
                                    asks: slicedOrderBook.asks,
                                    bids: slicedOrderBook.bids,
                                    midPrice: midPrice,
                                  }),
                              ],
                            }),
                          ],
                        }),
                        /* --- Bottom tabbed panel (positions, orders, history, funding) --- */
                        e.jsx("div", {
                          className:
                            "h-[320px] shrink-0 border-r border-dark-700 bg-dark-900 flex flex-col",
                          children: e.jsxs(pe, {
                            className: "flex flex-col h-full",
                            children: [
                              /* Tab headers */
                              e.jsx(fe, {
                                className:
                                  "flex gap-1 border-b border-dark-700 bg-dark-900/70 px-4 pt-2",
                                children: bottomTabIds.map((tabId) =>
                                  e.jsx(
                                    ge,
                                    {
                                      className: ({ selected: isSelected }) =>
                                        g(
                                          "px-4 py-2 text-xs font-semibold rounded-t-lg border-t border-l border-r border-transparent outline-none transition-all",
                                          isSelected
                                            ? "bg-dark-800 text-primary-400 border-dark-600 translate-y-[1px]"
                                            : "text-gray-400 hover:text-white hover:bg-dark-800/40",
                                        ),
                                      children: tabId
                                        .replace("_", " ")
                                        .toUpperCase(),
                                    },
                                    tabId,
                                  ),
                                ),
                              }),
                              /* Tab panels */
                              e.jsxs(be, {
                                className: "flex-1 overflow-y-auto p-0",
                                children: [
                                  e.jsx(_, {
                                    className: "h-full",
                                    children: e.jsx(PositionsTable, {}),
                                  }),
                                  e.jsx(_, {
                                    children: e.jsx(EmptyStateMessage, {
                                      message:
                                        "Nenhuma ordem aberta no momento.",
                                    }),
                                  }),
                                  e.jsx(_, {
                                    children: e.jsx(EmptyStateMessage, {
                                      message: "Historico de ordens vazio.",
                                    }),
                                  }),
                                  e.jsx(_, {
                                    children: e.jsx("div", {
                                      className: "p-4",
                                      children: e.jsx(FundingHistoryGrid, {
                                        history: fundingHistory,
                                      }),
                                    }),
                                  }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      ],
                    }),

                    /* --- Right sidebar: Order book + network status --- */
                    e.jsxs("div", {
                      className:
                        "hidden w-[300px] shrink-0 flex-col bg-dark-900 lg:flex border-l border-dark-700",
                      children: [
                        /* Order book section */
                        e.jsxs("div", {
                          className:
                            "flex flex-col flex-1 overflow-hidden min-h-0",
                          children: [
                            /* Order book column headers */
                            e.jsxs("div", {
                              className:
                                "grid grid-cols-3 px-3 py-2 text-[10px] font-semibold text-gray-300 uppercase border-b border-dark-700/60",
                              children: [
                                e.jsx("span", {
                                  children: "Preço",
                                }),
                                e.jsx("span", {
                                  className: "text-right",
                                  children: "Quantia",
                                }),
                                e.jsx("span", {
                                  className: "text-right",
                                  children: "Total",
                                }),
                              ],
                            }),
                            /* Order book rows */
                            e.jsxs("div", {
                              className:
                                "flex-1 overflow-y-auto scrollbar-none",
                              children: [
                                /* Asks (sell orders) – displayed in reverse */
                                e.jsx("div", {
                                  className: "flex flex-col-reverse pb-1",
                                  children: slicedOrderBook.asks.map(
                                    (item, index) =>
                                      e.jsx(
                                        OrderBookRow,
                                        {
                                          row: item,
                                          type: "ask",
                                          maxTotal: orderBookMaxTotal,
                                        },
                                        index,
                                      ),
                                  ),
                                }),
                                /* Mid-price display */
                                e.jsx("div", {
                                  className:
                                    "sticky top-0 bottom-0 z-20 flex items-center justify-between bg-dark-900/80 px-4 py-2 my-1 border-y border-dark-700",
                                  children: e.jsxs("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                      e.jsx("span", {
                                        className:
                                          "text-base font-bold text-emerald-500",
                                        children:
                                          currencyFormatter.format(midPrice),
                                      }),
                                      e.jsx(me, {
                                        className: "size-4 text-emerald-500",
                                      }),
                                    ],
                                  }),
                                }),
                                /* Bids (buy orders) */
                                e.jsx("div", {
                                  className: "flex flex-col pt-1",
                                  children: slicedOrderBook.bids.map(
                                    (item, index) =>
                                      e.jsx(
                                        OrderBookRow,
                                        {
                                          row: item,
                                          type: "bid",
                                          maxTotal: orderBookMaxTotal,
                                        },
                                        index,
                                      ),
                                  ),
                                }),
                              ],
                            }),
                          ],
                        }),
                        /* Network status section */
                        e.jsxs("div", {
                          className:
                            "h-[280px] shrink-0 border-t border-dark-700 flex flex-col bg-dark-900/80",
                          children: [
                            /* Network status header */
                            e.jsx("div", {
                              className:
                                "flex items-center justify-between px-3 py-3 border-b border-dark-700",
                              children: e.jsxs("h3", {
                                className:
                                  "text-xs font-bold text-gray-200 uppercase flex items-center gap-2",
                                children: [
                                  e.jsx(W, {
                                    className: "size-4 text-primary-500",
                                  }),
                                  "Status da Rede de Posição",
                                ],
                              }),
                            }),
                            /* Network chain cards */
                            e.jsx("div", {
                              className: "flex-1 overflow-y-auto p-2 space-y-2",
                              children:
                                chainNetworks.length > 0
                                  ? chainNetworks.map((item, index) =>
                                      e.jsxs(
                                        "div",
                                        {
                                          className:
                                            "rounded-lg border border-dark-700 bg-dark-800/70 p-2.5 text-gray-200",
                                          children: [
                                            /* Chain name + status badge */
                                            e.jsxs("div", {
                                              className:
                                                "flex items-center justify-between mb-2",
                                              children: [
                                                e.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-2",
                                                  children: [
                                                    e.jsx("span", {
                                                      className:
                                                        "text-xs font-bold text-gray-100",
                                                      children:
                                                        item.network.toUpperCase(),
                                                    }),
                                                    e.jsx("span", {
                                                      className:
                                                        "text-[10px] text-gray-400 max-w-[80px] truncate",
                                                      title: item.name,
                                                      children: item.name,
                                                    }),
                                                  ],
                                                }),
                                                item.status === "active" &&
                                                  e.jsx(I, {
                                                    color: "success",
                                                    variant: "filled",
                                                    className:
                                                      "text-[9px] px-1.5 h-4",
                                                    children: "Ativo",
                                                  }),
                                                item.status === "congested" &&
                                                  e.jsx(I, {
                                                    color: "warning",
                                                    variant: "filled",
                                                    className:
                                                      "text-[9px] px-1.5 h-4",
                                                    children: "Lento",
                                                  }),
                                                item.status === "maintenance" &&
                                                  e.jsx(I, {
                                                    color: "error",
                                                    variant: "filled",
                                                    className:
                                                      "text-[9px] px-1.5 h-4",
                                                    children: "Manut.",
                                                  }),
                                              ],
                                            }),
                                            /* Deposit & withdraw status icons */
                                            e.jsx("div", {
                                              className:
                                                "flex items-center justify-between gap-2 text-[10px]",
                                              children: e.jsxs("div", {
                                                className:
                                                  "flex gap-3 text-gray-300",
                                                children: [
                                                  e.jsxs("span", {
                                                    className: g(
                                                      "flex items-center gap-1",
                                                      !item.deposit &&
                                                        "opacity-50 decoration-line-through",
                                                    ),
                                                    children: [
                                                      "Dep.",
                                                      item.deposit
                                                        ? e.jsx(W, {
                                                            className:
                                                              "size-3 text-emerald-500",
                                                          })
                                                        : e.jsx(XCircleIcon, {
                                                            className:
                                                              "size-3 text-gray-400",
                                                          }),
                                                    ],
                                                  }),
                                                  e.jsxs("span", {
                                                    className: g(
                                                      "flex items-center gap-1",
                                                      !item.withdraw &&
                                                        "opacity-50 decoration-line-through",
                                                    ),
                                                    children: [
                                                      "Saq.",
                                                      item.withdraw
                                                        ? e.jsx(W, {
                                                            className:
                                                              "size-3 text-emerald-500",
                                                          })
                                                        : e.jsx(XCircleIcon, {
                                                            className:
                                                              "size-3 text-gray-400",
                                                          }),
                                                    ],
                                                  }),
                                                ],
                                              }),
                                            }),
                                          ],
                                        },
                                        `${item.network}-${index}`,
                                      ),
                                    )
                                  : e.jsx("div", {
                                      className:
                                        "flex h-full items-center justify-center text-xs text-gray-400",
                                      children: "Nenhuma informacao de rede.",
                                    }),
                            }),
                            /* Footer timestamp */
                            e.jsx("div", {
                              className:
                                "px-3 py-2 text-[10px] text-gray-400 text-center bg-dark-900/80 border-t border-dark-700",
                              children: "Atualizado em tempo real",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          })
    )
  );
}

/* -------------------------------------------------------
 *  StatLabel – Displays a labeled stat value (e.g. "24h High")
 * ------------------------------------------------------- */
function StatLabel({
  label: labelText,
  value: displayValue,
  highlight: highlightColor,
  subValue: subValueText,
}) {
  return e.jsxs("div", {
    className: "flex flex-col",
    children: [
      e.jsx("span", {
        className: "text-[10px] font-medium text-gray-400 mb-0.5",
        children: labelText,
      }),
      e.jsxs("div", {
        className: "flex items-baseline gap-1.5",
        children: [
          e.jsx("span", {
            className: g(
              "font-bold text-white",
              highlightColor === "amber" && "text-amber-400",
              highlightColor === "emerald" && "text-emerald-400",
            ),
            children: displayValue,
          }),
          subValueText &&
            e.jsx("span", {
              className: "text-[10px] font-medium text-gray-400",
              children: subValueText,
            }),
        ],
      }),
    ],
  });
}

/* -------------------------------------------------------
 *  OriginalCandlestickChart – ApexCharts candlestick (desktop only)
 * ------------------------------------------------------- */
function OriginalCandlestickChart() {
  const { smAndUp: isDesktopSize } = oe();
  return e.jsx("div", {
    className: "h-full w-full px-0 pb-0",
    children: isDesktopSize
      ? e.jsx(ce, {
          series: candlestickSeries,
          options: candlestickChartOptions,
          height: "100%",
          type: "candlestick",
        })
      : e.jsxs("div", {
          className:
            "flex h-full items-center justify-center text-gray-400 flex-col gap-2",
          children: [
            e.jsx(ExclamationTriangleIcon, {
              className: "size-8 opacity-50",
            }),
            e.jsx("span", {
              className: "text-xs",
              children: "Grafico otimizado para Desktop",
            }),
          ],
        }),
  });
}

/* -------------------------------------------------------
 *  TradingView Widget – Loads and embeds the TradingView chart
 * ------------------------------------------------------- */
const TRADINGVIEW_SCRIPT_ID = "tradingview-widget-script";
let tradingViewScriptPromise = null;

const loadTradingViewScript = () => {
  return typeof window > "u" || window.TradingView
    ? Promise.resolve()
    : tradingViewScriptPromise ||
        ((tradingViewScriptPromise = new Promise((resolve) => {
          const existingScript = document.getElementById(TRADINGVIEW_SCRIPT_ID);
          if (existingScript) {
            window.TradingView
              ? resolve()
              : existingScript.addEventListener("load", () => resolve(), {
                  once: true,
                });
            return;
          }
          const scriptElement = document.createElement("script");
          scriptElement.id = TRADINGVIEW_SCRIPT_ID;
          scriptElement.src = "https://s3.tradingview.com/tv.js";
          scriptElement.async = true;
          scriptElement.onload = () => resolve();
          document.head.appendChild(scriptElement);
        })),
        tradingViewScriptPromise);
};

function TradingViewWidget({ symbol: tvSymbol }) {
  const containerRef = l.useRef(null);
  const containerId = l.useMemo(
    () => `tradingview-widget-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const widgetInstanceRef = l.useRef(null);
  return (
    l.useEffect(() => {
      let isCancelled = false;
      let cleanupFn = () => {};
      if (!(typeof window > "u"))
        return (
          loadTradingViewScript()
            .then(() => {
              isCancelled ||
                !containerRef.current ||
                !window.TradingView ||
                (widgetInstanceRef.current &&
                  typeof widgetInstanceRef.current.remove == "function" &&
                  widgetInstanceRef.current.remove(),
                (widgetInstanceRef.current = new window.TradingView.widget({
                  autosize: true,
                  symbol: tvSymbol,
                  interval: "60",
                  timezone: "Etc/UTC",
                  theme: "dark",
                  style: 1,
                  locale: "pt_BR",
                  toolbar_bg: "#0b111a",
                  hide_top_toolbar: false,
                  allow_symbol_change: false,
                  details: true,
                  container_id: containerId,
                  enable_publishing: false,
                  withdateranges: true,
                })));
            })
            .catch((loadError) => {
              console.error("TradingView widget failed to load", loadError);
            }),
          (cleanupFn = () => {
            if (((isCancelled = true), widgetInstanceRef.current))
              try {
                const containerElement = document.getElementById(containerId);
                if (
                  containerElement &&
                  containerElement.parentNode &&
                  typeof widgetInstanceRef.current.remove == "function"
                ) {
                  widgetInstanceRef.current.remove();
                }
              } catch (cleanupError) {
                console.warn(
                  "TradingView widget cleanup error (ignored):",
                  cleanupError,
                );
              } finally {
                widgetInstanceRef.current = null;
              }
          }),
          cleanupFn
        );
    }, [tvSymbol, containerId]),
    e.jsx("div", {
      className: "h-full w-full",
      children: e.jsx("div", {
        id: containerId,
        ref: containerRef,
        className: "h-full w-full",
      }),
    })
  );
}

/* -------------------------------------------------------
 *  DepthChart – Visual depth chart (asks vs bids bars)
 * ------------------------------------------------------- */
function DepthChart({
  asks: askLevels,
  bids: bidLevels,
  midPrice: depthMidPrice,
}) {
  const visibleAsks = askLevels.slice(-6);
  const visibleBids = bidLevels.slice(0, 6);
  const maxDepthTotal = Math.max(
    visibleAsks[visibleAsks.length - 1]?.total ?? 0,
    visibleBids[visibleBids.length - 1]?.total ?? 0,
    1,
  );
  return e.jsxs("div", {
    className:
      "flex h-full flex-col gap-4 overflow-hidden px-6 py-4 text-gray-200",
    children: [
      /* Header: best bid/ask label + mid price */
      e.jsxs("div", {
        className:
          "flex items-center justify-between text-xs uppercase text-gray-400",
        children: [
          e.jsx("span", {
            children: "Best Bid / Ask",
          }),
          e.jsx("span", {
            className: "font-bold text-white",
            children: currencyFormatter.format(depthMidPrice),
          }),
        ],
      }),
      /* Two-column layout: asks on left, bids on right */
      e.jsxs("div", {
        className: "grid flex-1 grid-cols-2 gap-6 overflow-hidden",
        children: [
          /* Asks column */
          e.jsxs("div", {
            className: "space-y-3 overflow-y-auto pr-2",
            children: [
              e.jsx("div", {
                className: "text-[10px] font-semibold uppercase text-rose-400",
                children: "Asks",
              }),
              visibleAsks.map((item, index) =>
                e.jsxs(
                  "div",
                  {
                    className: "space-y-1 text-[12px]",
                    children: [
                      e.jsxs("div", {
                        className: "flex justify-between text-xs",
                        children: [
                          e.jsx("span", {
                            children: currencyFormatter.format(item.price),
                          }),
                          e.jsx("span", {
                            children: item.size.toFixed(3),
                          }),
                        ],
                      }),
                      e.jsx("div", {
                        className: "h-1.5 rounded-full bg-rose-900/20",
                        children: e.jsx("div", {
                          className: "h-full rounded-full bg-rose-500",
                          style: {
                            width: `${Math.min((item.total / maxDepthTotal) * 100, 100)}%`,
                          },
                        }),
                      }),
                    ],
                  },
                  `ask-${index}`,
                ),
              ),
            ],
          }),
          /* Bids column */
          e.jsxs("div", {
            className: "space-y-3 overflow-y-auto pr-2",
            children: [
              e.jsx("div", {
                className:
                  "text-[10px] font-semibold uppercase text-emerald-400",
                children: "Bids",
              }),
              visibleBids.map((item, index) =>
                e.jsxs(
                  "div",
                  {
                    className: "space-y-1 text-[12px]",
                    children: [
                      e.jsxs("div", {
                        className: "flex justify-between text-xs",
                        children: [
                          e.jsx("span", {
                            children: currencyFormatter.format(item.price),
                          }),
                          e.jsx("span", {
                            children: item.size.toFixed(3),
                          }),
                        ],
                      }),
                      e.jsx("div", {
                        className: "h-1.5 rounded-full bg-emerald-900/20",
                        children: e.jsx("div", {
                          className: "h-full rounded-full bg-emerald-500",
                          style: {
                            width: `${Math.min((item.total / maxDepthTotal) * 100, 100)}%`,
                          },
                        }),
                      }),
                    ],
                  },
                  `bid-${index}`,
                ),
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

/* -------------------------------------------------------
 *  OrderBookRow – Single row in the order book sidebar
 * ------------------------------------------------------- */
function OrderBookRow({
  row: rowData,
  type: orderType,
  maxTotal: maxCumulativeTotal,
}) {
  const barWidthPct = Math.min((rowData.total / maxCumulativeTotal) * 100, 100);
  const barColorClass = orderType === "bid" ? "bg-emerald-500" : "bg-rose-500";
  const priceColorClass =
    orderType === "bid" ? "text-emerald-400" : "text-rose-400";
  return e.jsxs("div", {
    className:
      "relative grid cursor-pointer grid-cols-3 items-center px-3 py-[2px] text-[11px] hover:bg-dark-800/50 transition-colors",
    children: [
      /* Background bar indicating cumulative depth */
      e.jsx("div", {
        className: g(
          "absolute right-0 top-0 bottom-0 opacity-20 transition-all duration-300",
          barColorClass,
        ),
        style: {
          width: `${barWidthPct}%`,
        },
      }),
      /* Price */
      e.jsx("span", {
        className: g("font-bold relative z-10 tabular-nums", priceColorClass),
        children: rowData.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        }),
      }),
      /* Size */
      e.jsx("span", {
        className:
          "text-right relative z-10 text-gray-200 tabular-nums font-medium",
        children: rowData.size.toFixed(3),
      }),
      /* Cumulative total */
      e.jsx("span", {
        className: "text-right relative z-10 text-gray-400 tabular-nums",
        children: rowData.total.toFixed(3),
      }),
    ],
  });
}

/* -------------------------------------------------------
 *  PositionsTable – Mock open positions table
 * ------------------------------------------------------- */
function PositionsTable() {
  return e.jsx("div", {
    className: "w-full overflow-x-auto",
    children: e.jsxs("table", {
      className: "w-full min-w-[800px] text-left text-xs",
      children: [
        e.jsx("thead", {
          className: "bg-dark-900/60 sticky top-0 z-10",
          children: e.jsxs("tr", {
            className: "text-gray-400 border-b border-dark-700",
            children: [
              e.jsx("th", {
                className: "py-2 px-4 font-medium text-gray-300",
                children: "Symbol",
              }),
              e.jsx("th", {
                className: "py-2 px-4 font-medium text-gray-300",
                children: "Size",
              }),
              e.jsx("th", {
                className: "py-2 px-4 font-medium text-gray-300",
                children: "Entry Price",
              }),
              e.jsx("th", {
                className: "py-2 px-4 font-medium text-gray-300",
                children: "Mark Price",
              }),
              e.jsx("th", {
                className: "py-2 px-4 font-medium text-gray-300",
                children: "Liq. Price",
              }),
              e.jsx("th", {
                className: "py-2 px-4 font-medium text-gray-300",
                children: "Margin",
              }),
              e.jsx("th", {
                className: "py-2 px-4 font-medium text-gray-300",
                children: "PNL (ROE%)",
              }),
              e.jsx("th", {
                className: "py-2 px-4 text-right font-medium text-gray-300",
                children: "Action",
              }),
            ],
          }),
        }),
        e.jsx("tbody", {
          className: "text-gray-200 divide-y divide-dark-700/70",
          children: e.jsxs("tr", {
            className: "group hover:bg-dark-800/50 transition-colors",
            children: [
              e.jsxs("td", {
                className:
                  "py-3 px-4 font-bold text-white flex items-center gap-2",
                children: [
                  "BTC/USDT",
                  e.jsx("span", {
                    className:
                      "rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40",
                    children: "Long 10x",
                  }),
                ],
              }),
              e.jsx("td", {
                className:
                  "py-3 px-4 tabular-nums font-medium text-emerald-400",
                children: "0.052 BTC",
              }),
              e.jsx("td", {
                className: "py-3 px-4 tabular-nums text-gray-300",
                children: "66,230.50",
              }),
              e.jsx("td", {
                className: "py-3 px-4 tabular-nums font-medium text-white",
                children: "67,302.15",
              }),
              e.jsx("td", {
                className: "py-3 px-4 text-amber-500 tabular-nums font-medium",
                children: "61,100.00",
              }),
              e.jsx("td", {
                className: "py-3 px-4 tabular-nums text-gray-300",
                children: "345.20 USDT",
              }),
              e.jsx("td", {
                className: "py-3 px-4 tabular-nums",
                children: e.jsxs("div", {
                  className: "flex flex-col",
                  children: [
                    e.jsx("span", {
                      className: "text-emerald-400 font-bold",
                      children: "+55.72",
                    }),
                    e.jsx("span", {
                      className: "text-[10px] text-emerald-300",
                      children: "(+16.14%)",
                    }),
                  ],
                }),
              }),
              e.jsx("td", {
                className: "py-3 px-4 text-right",
                children: e.jsx(de, {
                  variant: "soft",
                  color: "neutral",
                  className:
                    "h-7 px-3 text-[10px] font-semibold border border-dark-600 bg-dark-800 text-gray-200 shadow-sm hover:bg-dark-700/80",
                  children: "Close Position",
                }),
              }),
            ],
          }),
        }),
      ],
    }),
  });
}

/* -------------------------------------------------------
 *  FundingHistoryGrid – Grid of funding rate history cards
 * ------------------------------------------------------- */
function FundingHistoryGrid({ history: fundingEntries }) {
  return !fundingEntries || fundingEntries.length === 0
    ? e.jsx(EmptyStateMessage, {
        message: "Sem historico de funding disponivel.",
      })
    : e.jsx("div", {
        className: "grid gap-4 md:grid-cols-3 lg:grid-cols-4",
        children: fundingEntries.slice(0, 8).map((item, index) =>
          e.jsxs(
            "div",
            {
              className:
                "rounded-xl border border-dark-700 bg-dark-900/70 p-4 shadow-sm text-gray-200",
              children: [
                /* Card header: symbol + time */
                e.jsxs("div", {
                  className: "flex items-center justify-between mb-3",
                  children: [
                    e.jsx("span", {
                      className: "font-bold text-sm text-white",
                      children: item.symbol,
                    }),
                    e.jsxs("span", {
                      className:
                        "text-xs font-medium text-gray-400 flex items-center gap-1",
                      children: [
                        e.jsx(ue, {
                          className: "size-3",
                        }),
                        item.fundingTime
                          ? new Date(
                              Number(item.fundingTime),
                            ).toLocaleTimeString()
                          : "--",
                      ],
                    }),
                  ],
                }),
                /* Funding rate value */
                e.jsx("div", {
                  className: "flex items-baseline gap-2 mb-1",
                  children: e.jsxs("span", {
                    className: g(
                      "text-xl font-bold",
                      Number(item.fundingRate) >= 0
                        ? "text-emerald-500"
                        : "text-rose-500",
                    ),
                    children: [
                      (Number(item.fundingRate) * 100).toFixed(4),
                      "%",
                    ],
                  }),
                }),
                e.jsx("div", {
                  className: "text-xs text-gray-400",
                  children: "Funding Rate",
                }),
                /* Mark price footer */
                e.jsx("div", {
                  className:
                    "mt-4 flex justify-between border-t border-dark-700 pt-3",
                  children: e.jsxs("div", {
                    className: "flex flex-col",
                    children: [
                      e.jsx("span", {
                        className: "text-[10px] text-gray-400 uppercase",
                        children: "Mark Price",
                      }),
                      e.jsx("span", {
                        className: "text-xs font-semibold text-white",
                        children: item.markPrice
                          ? Number(item.markPrice).toFixed(2)
                          : "--",
                      }),
                    ],
                  }),
                }),
              ],
            },
            index,
          ),
        ),
      });
}

/* -------------------------------------------------------
 *  EmptyStateMessage – Centered placeholder with icon
 * ------------------------------------------------------- */
function EmptyStateMessage({ message: displayMessage }) {
  return e.jsxs("div", {
    className:
      "flex flex-col items-center justify-center h-full py-12 text-gray-400",
    children: [
      e.jsx("div", {
        className: "bg-dark-800/70 rounded-full p-4 mb-3",
        children: e.jsx(he, {
          className: "size-8 opacity-40 text-gray-400",
        }),
      }),
      e.jsx("span", {
        className: "text-sm font-medium text-gray-300",
        children: displayMessage,
      }),
    ],
  });
}

/* -------------------------------------------------------
 *  Export alias (preserves original minified export name)
 * ------------------------------------------------------- */
const et = TradingPage;
export { et as default };
