/* ==========================================================================
 * useExchangePiP - PiP/History Modal Module
 *
 * Shows entry/exit spread charts (ApexCharts), funding rates,
 * network status (deposit/withdraw), and Telegram sharing for exchange pairs.
 * ========================================================================== */

// ---------------------------------------------------------------------------
//  Imports (kept exactly as original)
// ---------------------------------------------------------------------------
import {
  a as t,
  h as Ze,
  j as e,
  B as ee,
  e as z,
  k as Te,
  n as Ge,
  p as Q,
  E as Xe,
  F as er,
} from "./index-Bx06KCE-.js";
import { F as re } from "./discord-BL8Te9RE.js";
import { t as Pe } from "./index-mwGaaYkF.js";
import { g as rr, b as tr, p as ar } from "./discordLink-BQxtRaU4.js";
import { F as ue } from "./XMarkIcon-mqVC0SZA.js";
import { K as te, O as W } from "./transition-Cxix63ts.js";
import { h as ge, z as he, Q as be } from "./dialog-DOjFQwF9.js";
import { h as Re } from "./react-apexcharts.esm-B8DZI7x8.js";
import { f as sr, a as nr } from "./coinsApi-BPsBZGFa.js";
import { n as Y, b as Ae } from "./exchange-BNVQP8m4.js";
import { S as ce } from "./SearchableSelect-9vRGJJts.js";
import { F as Oe } from "./ArrowPathIcon-Ek2z4Juv.js";
import { B as or, W as ir, d as dr, j as lr, K as J } from "./tabs-Cdkz3LDK.js";

// ---------------------------------------------------------------------------
//  SVG Icon Components
// ---------------------------------------------------------------------------

/** ArrowDownTray icon (download / deposit) */
function ArrowDownTrayIconRaw(
  { title: titleText, titleId: titleElementId, ...restProps },
  ref,
) {
  return t.createElement(
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
        "aria-labelledby": titleElementId,
      },
      restProps,
    ),
    titleText
      ? t.createElement(
          "title",
          {
            id: titleElementId,
          },
          titleText,
        )
      : null,
    t.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3",
    }),
  );
}
const ArrowDownTrayIcon = t.forwardRef(ArrowDownTrayIconRaw);

/** ArrowUpTray icon (upload / withdraw) */
function ArrowUpTrayIconRaw(
  { title: titleText, titleId: titleElementId, ...restProps },
  ref,
) {
  return t.createElement(
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
        "aria-labelledby": titleElementId,
      },
      restProps,
    ),
    titleText
      ? t.createElement(
          "title",
          {
            id: titleElementId,
          },
          titleText,
        )
      : null,
    t.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5",
    }),
  );
}
const ArrowUpTrayIcon = t.forwardRef(ArrowUpTrayIconRaw);

/** ArrowsPointingOut icon (expand / fullscreen) */
function ArrowsPointingOutIconRaw(
  { title: titleText, titleId: titleElementId, ...restProps },
  ref,
) {
  return t.createElement(
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
        "aria-labelledby": titleElementId,
      },
      restProps,
    ),
    titleText
      ? t.createElement(
          "title",
          {
            id: titleElementId,
          },
          titleText,
        )
      : null,
    t.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
    }),
  );
}
const ArrowsPointingOutIcon = t.forwardRef(ArrowsPointingOutIconRaw);

/** ChartBarIcon (bar chart / statistics) */
function ChartBarIconRaw(
  { title: titleText, titleId: titleElementId, ...restProps },
  ref,
) {
  return t.createElement(
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
        "aria-labelledby": titleElementId,
      },
      restProps,
    ),
    titleText
      ? t.createElement(
          "title",
          {
            id: titleElementId,
          },
          titleText,
        )
      : null,
    t.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
    }),
  );
}
const ChartBarIcon = t.forwardRef(ChartBarIconRaw);

/** ChevronDown icon (dropdown indicator) */
function ChevronDownIconRaw(
  { title: titleText, titleId: titleElementId, ...restProps },
  ref,
) {
  return t.createElement(
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
        "aria-labelledby": titleElementId,
      },
      restProps,
    ),
    titleText
      ? t.createElement(
          "title",
          {
            id: titleElementId,
          },
          titleText,
        )
      : null,
    t.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "m19.5 8.25-7.5 7.5-7.5-7.5",
    }),
  );
}
const ChevronDownIcon = t.forwardRef(ChevronDownIconRaw);

// ---------------------------------------------------------------------------
//  Discord Link Modal
// ---------------------------------------------------------------------------

function DiscordLinkModal({ isOpen: isOpen, onClose: onClose }) {
  const { user: currentUser } = Ze(),
    [isRedirecting, setIsRedirecting] = t.useState(false),
    discordDisplayName = t.useMemo(
      () => currentUser?.discordUsername || currentUser?.discordId || "",
      [currentUser?.discordId, currentUser?.discordUsername],
    ),
    handleClose = t.useCallback(() => {
      isRedirecting || onClose();
    }, [isRedirecting, onClose]),
    handleLinkDiscord = t.useCallback(() => {
      if (isRedirecting) return;
      if (!window.localStorage.getItem("authToken")) {
        Pe.error("E preciso estar logado para vincular o Discord.");
        return;
      }
      const discordState = rr(),
        discordAuthUrl = tr(discordState);
      if (!discordAuthUrl) {
        Pe.error(
          "Configure o CLIENT_ID e o REDIRECT_URI do Discord antes de continuar.",
        );
        return;
      }
      ar(discordState);
      setIsRedirecting(true);
      window.location.assign(discordAuthUrl);
    }, [isRedirecting]);
  return e.jsx(te, {
    appear: true,
    show: isOpen,
    as: t.Fragment,
    children: e.jsxs(ge, {
      as: "div",
      className: "relative z-50",
      onClose: handleClose,
      children: [
        e.jsx(W, {
          as: t.Fragment,
          enter: "ease-out duration-300",
          enterFrom: "opacity-0",
          enterTo: "opacity-100",
          leave: "ease-in duration-200",
          leaveFrom: "opacity-100",
          leaveTo: "opacity-0",
          children: e.jsx("div", {
            className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
          }),
        }),
        e.jsx("div", {
          className: "fixed inset-0 overflow-y-auto",
          children: e.jsx("div", {
            className:
              "flex min-h-full items-center justify-center p-4 text-center",
            children: e.jsx(W, {
              as: t.Fragment,
              enter: "ease-out duration-300",
              enterFrom: "opacity-0 scale-95",
              enterTo: "opacity-100 scale-100",
              leave: "ease-in duration-200",
              leaveFrom: "opacity-100 scale-100",
              leaveTo: "opacity-0 scale-95",
              children: e.jsxs(he, {
                className:
                  "w-full max-w-lg transform overflow-visible rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                children: [
                  e.jsxs("div", {
                    className: "mb-5 flex items-start justify-between gap-4",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center gap-3",
                        children: [
                          e.jsx("span", {
                            className:
                              "flex size-11 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2]",
                            children: e.jsx(re, {
                              className: "size-5",
                            }),
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx(be, {
                                className:
                                  "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                                children: "Vincular Discord",
                              }),
                              e.jsx("p", {
                                className:
                                  "mt-1 text-sm text-gray-600 dark:text-dark-200",
                                children:
                                  "Conecte sua conta para liberar o envio de oportunidades.",
                              }),
                            ],
                          }),
                        ],
                      }),
                      e.jsx("button", {
                        onClick: handleClose,
                        className:
                          "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                        "aria-label": "Fechar",
                        children: e.jsx(ue, {
                          className: "size-5",
                        }),
                      }),
                    ],
                  }),
                  e.jsx("div", {
                    className: "space-y-4",
                    children: e.jsxs("div", {
                      className:
                        "rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-sm text-gray-700 shadow-sm dark:border-dark-700 dark:bg-dark-750 dark:text-dark-100",
                      children: [
                        e.jsx("p", {
                          className:
                            "mb-2 font-medium text-gray-900 dark:text-white",
                          children: "Confirmar vinculo",
                        }),
                        e.jsxs("p", {
                          className: "text-sm text-gray-700 dark:text-dark-100",
                          children: [
                            "Clique em ",
                            e.jsx("strong", {
                              children: "Vincular agora",
                            }),
                            " para autorizar no Discord. Voce retornara automaticamente.",
                          ],
                        }),
                        discordDisplayName &&
                          e.jsxs("p", {
                            className:
                              "mt-2 text-xs text-gray-500 dark:text-dark-300",
                            children: ["Usuario atual: ", discordDisplayName],
                          }),
                      ],
                    }),
                  }),
                  e.jsxs("div", {
                    className: "mt-6 flex items-center justify-end gap-3",
                    children: [
                      e.jsx(ee, {
                        type: "button",
                        variant: "soft",
                        color: "neutral",
                        onClick: handleClose,
                        disabled: isRedirecting,
                        children: "Cancelar",
                      }),
                      e.jsxs(ee, {
                        onClick: handleLinkDiscord,
                        color: "primary",
                        className: "gap-2",
                        disabled: isRedirecting,
                        children: [
                          e.jsx(re, {
                            className: "size-4",
                          }),
                          isRedirecting
                            ? "Redirecionando..."
                            : "Vincular agora",
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            }),
          }),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
//  Utility: Format spread percentage
// ---------------------------------------------------------------------------

const formatSpreadPercent = (value) => {
  return typeof value != "number" || !Number.isFinite(value)
    ? "-"
    : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

// ---------------------------------------------------------------------------
//  Discord Send Confirmation Modal
// ---------------------------------------------------------------------------

function DiscordSendConfirmModal({
  isOpen: isOpen,
  onClose: onClose,
  onConfirm: onConfirm,
  isLoading: isLoading,
  symbol: symbol,
  buyExchange: buyExchange,
  sellExchange: sellExchange,
  entrySpread: entrySpread,
  exitSpread: exitSpread,
}) {
  const formattedEntry = t.useMemo(
      () => formatSpreadPercent(entrySpread),
      [entrySpread],
    ),
    formattedExit = t.useMemo(
      () => formatSpreadPercent(exitSpread),
      [exitSpread],
    ),
    isEntryValid =
      typeof entrySpread == "number" && Number.isFinite(entrySpread),
    isExitValid = typeof exitSpread == "number" && Number.isFinite(exitSpread),
    isEntryPositive = isEntryValid && entrySpread > 0,
    isExitPositive = isExitValid && exitSpread > 0;
  return e.jsx(te, {
    appear: true,
    show: isOpen,
    as: t.Fragment,
    children: e.jsxs(ge, {
      as: "div",
      className: "relative z-50",
      onClose: onClose,
      children: [
        e.jsx(W, {
          as: t.Fragment,
          enter: "ease-out duration-300",
          enterFrom: "opacity-0",
          enterTo: "opacity-100",
          leave: "ease-in duration-200",
          leaveFrom: "opacity-100",
          leaveTo: "opacity-0",
          children: e.jsx("div", {
            className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
          }),
        }),
        e.jsx("div", {
          className: "fixed inset-0 overflow-y-auto",
          children: e.jsx("div", {
            className:
              "flex min-h-full items-center justify-center p-4 text-center",
            children: e.jsx(W, {
              as: t.Fragment,
              enter: "ease-out duration-300",
              enterFrom: "opacity-0 scale-95",
              enterTo: "opacity-100 scale-100",
              leave: "ease-in duration-200",
              leaveFrom: "opacity-100 scale-100",
              leaveTo: "opacity-0 scale-95",
              children: e.jsxs(he, {
                className:
                  "w-full max-w-lg transform overflow-visible rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                children: [
                  e.jsxs("div", {
                    className: "mb-5 flex items-start justify-between gap-4",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center gap-3",
                        children: [
                          e.jsx("span", {
                            className:
                              "flex size-11 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2]",
                            children: e.jsx(re, {
                              className: "size-5",
                            }),
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx(be, {
                                className:
                                  "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                                children: "Enviar oportunidade para o Discord?",
                              }),
                              e.jsx("p", {
                                className:
                                  "mt-1 text-sm text-gray-600 dark:text-dark-200",
                                children:
                                  "Confirme o envio do card para o canal configurado.",
                              }),
                            ],
                          }),
                        ],
                      }),
                      e.jsx("button", {
                        onClick: onClose,
                        className:
                          "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                        "aria-label": "Fechar",
                        disabled: isLoading,
                        children: e.jsx(ue, {
                          className: "size-5",
                        }),
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className:
                      "rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-sm text-gray-700 shadow-sm dark:border-dark-700 dark:bg-dark-750 dark:text-dark-100",
                    children: [
                      e.jsxs("div", {
                        className:
                          "flex flex-wrap items-center justify-between gap-2",
                        children: [
                          e.jsx("span", {
                            className:
                              "text-base font-semibold text-gray-900 dark:text-white",
                            children: symbol,
                          }),
                          e.jsxs("div", {
                            className:
                              "flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300",
                            children: [
                              e.jsx("span", {
                                className:
                                  "rounded-full bg-white px-2 py-1 shadow-sm dark:bg-dark-800",
                                children: buyExchange,
                              }),
                              e.jsx("span", {
                                className: "text-gray-400 dark:text-dark-500",
                                children: "\u2192",
                              }),
                              e.jsx("span", {
                                className:
                                  "rounded-full bg-white px-2 py-1 shadow-sm dark:bg-dark-800",
                                children: sellExchange,
                              }),
                            ],
                          }),
                        ],
                      }),
                      e.jsxs("div", {
                        className: "mt-4 grid grid-cols-2 gap-3",
                        children: [
                          e.jsxs("div", {
                            className: z(
                              "rounded-lg border px-3 py-2",
                              isEntryValid
                                ? isEntryPositive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                                : "border-gray-200 bg-white text-gray-600 dark:border-dark-600 dark:bg-dark-800/40 dark:text-dark-200",
                            ),
                            children: [
                              e.jsx("p", {
                                className:
                                  "text-[11px] font-semibold uppercase tracking-wide",
                                children: "Entrada",
                              }),
                              e.jsx("p", {
                                className: "mt-1 text-lg font-bold",
                                children: formattedEntry,
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className: z(
                              "rounded-lg border px-3 py-2",
                              isExitValid
                                ? isExitPositive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                                : "border-gray-200 bg-white text-gray-600 dark:border-dark-600 dark:bg-dark-800/40 dark:text-dark-200",
                            ),
                            children: [
                              e.jsx("p", {
                                className:
                                  "text-[11px] font-semibold uppercase tracking-wide",
                                children: "Saida",
                              }),
                              e.jsx("p", {
                                className: "mt-1 text-lg font-bold",
                                children: formattedExit,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "mt-6 flex items-center justify-end gap-3",
                    children: [
                      e.jsx(ee, {
                        type: "button",
                        variant: "soft",
                        color: "neutral",
                        onClick: onClose,
                        disabled: isLoading,
                        children: "Cancelar",
                      }),
                      e.jsxs(ee, {
                        onClick: onConfirm,
                        color: "primary",
                        className: "gap-2",
                        disabled: isLoading,
                        children: [
                          e.jsx(re, {
                            className: "size-4",
                          }),
                          isLoading ? "Enviando..." : "Enviar agora",
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            }),
          }),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
//  Hook: useFilterOptions - Fetches coins & exchanges for dropdowns
// ---------------------------------------------------------------------------

function useFilterOptions() {
  const [coinOptions, setCoinOptions] = t.useState([]),
    [exchangeOptions, setExchangeOptions] = t.useState([]);
  return (
    t.useEffect(() => {
      (async () => {
        try {
          const apiBaseUrl = "http://localhost:8000".replace(/\/$/, ""),
            [coinsResponse, exchangesResponse] = await Promise.all([
              sr(),
              fetch(`${apiBaseUrl}/catalog/exchanges`),
            ]),
            exchangeCatalog = await exchangesResponse.json(),
            formattedCoins = (coinsResponse.data || []).map((coinSymbol) => {
              const upperSymbol = String(coinSymbol).trim().toUpperCase(),
                pairSymbol = upperSymbol.includes("/")
                  ? upperSymbol
                  : `${upperSymbol}/USDT`;
              return {
                value: pairSymbol,
                label: pairSymbol,
              };
            }),
            formattedExchanges = (exchangeCatalog?.items || [])
              .filter((exchangeItem) => exchangeItem.is_active)
              .map((exchangeItem) => ({
                value: exchangeItem.slug,
                label: exchangeItem.name,
              }));
          formattedExchanges.unshift({
            value: "",
            label: "Selecione...",
            disabled: true,
          });
          setCoinOptions(formattedCoins);
          setExchangeOptions(formattedExchanges);
        } catch (error) {
          console.error("Erro ao carregar filtros", error);
        }
      })();
    }, []),
    {
      coins: coinOptions,
      exchanges: exchangeOptions,
    }
  );
}

// ---------------------------------------------------------------------------
//  Hook: useDebounce - Delays value updates
// ---------------------------------------------------------------------------

function useDebounce(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = t.useState(value);
  return (
    t.useEffect(() => {
      const timeoutId = setTimeout(() => {
        setDebouncedValue(value);
      }, delayMs);
      return () => {
        clearTimeout(timeoutId);
      };
    }, [value, delayMs]),
    debouncedValue
  );
}

// ---------------------------------------------------------------------------
//  Utility: Compute min/max/avg stats from a numeric array
// ---------------------------------------------------------------------------

function computeStats(values) {
  if (values.length === 0)
    return {
      max: 0,
      min: 0,
      avg: 0,
    };
  const maxVal = Math.max(...values),
    minVal = Math.min(...values),
    avgVal = values.reduce((sum, current) => sum + current, 0) / values.length;
  return {
    max: maxVal,
    min: minVal,
    avg: avgVal,
  };
}

// ---------------------------------------------------------------------------
//  Utility: Build a trading symbol from raw symbol string and market type
// ---------------------------------------------------------------------------

function buildTradingSymbol(rawSymbol, marketType) {
  const normalizedMarket = (marketType || "").toLowerCase(),
    trimmedSymbol = (rawSymbol || "").trim();
  if (!trimmedSymbol) return "";
  const pairPart = trimmedSymbol.split(":")[0],
    [baseAsset, quoteAsset] = pairPart.split("/"),
    upperBase = (baseAsset || "").toUpperCase(),
    upperQuote = (quoteAsset || "USDT").toUpperCase(),
    fullPair = `${upperBase}/${upperQuote}`;
  return normalizedMarket === "future" ? `${fullPair}:USDT` : fullPair;
}

// ---------------------------------------------------------------------------
//  Utility: Downsample data points to maxPoints for chart rendering
// ---------------------------------------------------------------------------

function downsampleDataPoints(dataArray, maxPoints = 100) {
  if (dataArray.length <= maxPoints) return dataArray;
  const stepSize = Math.ceil(dataArray.length / maxPoints);
  return dataArray.filter((_dataPoint, index) => index % stepSize === 0);
}

// ---------------------------------------------------------------------------
//  Skeleton Components (loading placeholders)
// ---------------------------------------------------------------------------

/** A single pulsing skeleton bar */
const SkeletonBar = ({ className: cssClass }) =>
    e.jsx("div", {
      className: z(
        "animate-pulse bg-gray-200 dark:bg-dark-700 rounded",
        cssClass,
      ),
    }),
  /** Skeleton for the chart area */
  ChartSkeleton = () =>
    e.jsx("div", {
      className:
        "w-full h-[300px] bg-gray-50 dark:bg-dark-700/30 rounded-lg animate-pulse flex items-center justify-center border border-gray-100 dark:border-dark-600",
      children: e.jsx(Oe, {
        className: "w-8 h-8 text-gray-300 dark:text-dark-600 animate-spin",
      }),
    }),
  /** Skeleton for the stats grid (max/min/avg) */
  StatsGridSkeleton = () =>
    e.jsx("div", {
      className: "grid grid-cols-3 gap-4 mb-6",
      children: [1, 2, 3].map((skeletonIndex) =>
        e.jsxs(
          "div",
          {
            className:
              "p-3 rounded-lg border border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700/50",
            children: [
              e.jsx(SkeletonBar, {
                className: "h-3 w-16 mb-2",
              }),
              e.jsx(SkeletonBar, {
                className: "h-6 w-24",
              }),
            ],
          },
          skeletonIndex,
        ),
      ),
    }),
  /** Skeleton for a data table */
  TableSkeleton = () =>
    e.jsxs("div", {
      className:
        "overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700 h-[300px] flex flex-col bg-white dark:bg-dark-800",
      children: [
        e.jsxs("div", {
          className:
            "bg-gray-50 dark:bg-dark-800 p-2 border-b border-gray-200 dark:border-dark-700 flex justify-between",
          children: [
            e.jsx(SkeletonBar, {
              className: "h-4 w-20",
            }),
            e.jsx(SkeletonBar, {
              className: "h-4 w-20",
            }),
            e.jsx(SkeletonBar, {
              className: "h-4 w-20",
            }),
          ],
        }),
        e.jsx("div", {
          className: "p-4 space-y-4",
          children: [1, 2, 3, 4, 5].map((rowIndex) =>
            e.jsxs(
              "div",
              {
                className: "flex justify-between items-center",
                children: [
                  e.jsx(SkeletonBar, {
                    className: "h-4 w-16",
                  }),
                  e.jsx(SkeletonBar, {
                    className: "h-4 w-20",
                  }),
                  e.jsx(SkeletonBar, {
                    className: "h-4 w-20",
                  }),
                ],
              },
              rowIndex,
            ),
          ),
        }),
      ],
    });

// ---------------------------------------------------------------------------
//  History & Details Modal (main modal with tabs)
// ---------------------------------------------------------------------------

function HistoryDetailsModal({
  isOpen: isOpen,
  onClose: onClose,
  card: cardData,
}) {
  const [activeTabIndex, setActiveTabIndex] = t.useState(0),
    [isLoadingData, setIsLoadingData] = t.useState(false),
    [historyData, setHistoryData] = t.useState(null),
    [fundingData, setFundingData] = t.useState(null),
    { coins: coinOptions, exchanges: exchangeOptions } = useFilterOptions(),
    [selectedSymbol, setSelectedSymbol] = t.useState(""),
    [selectedBuyExchange, setSelectedBuyExchange] = t.useState(""),
    [selectedSellExchange, setSelectedSellExchange] = t.useState(""),
    [selectedBuyMarket, setSelectedBuyMarket] = t.useState("spot"),
    [selectedSellMarket, setSelectedSellMarket] = t.useState("future"),
    [isFiltersExpanded, setIsFiltersExpanded] = t.useState(false),
    lastCardIdRef = t.useRef(null);

  /* Sync form fields with incoming card data */
  t.useEffect(() => {
    if (isOpen && cardData && cardData.id !== lastCardIdRef.current) {
      ((lastCardIdRef.current = cardData.id),
        setSelectedSymbol(cardData.symbol),
        setSelectedBuyExchange(cardData.buyExchange),
        setSelectedSellExchange(cardData.sellExchange),
        setSelectedBuyMarket(cardData.buyMarket || "spot"),
        setSelectedSellMarket(cardData.sellMarket || "future"));
    }
  }, [isOpen, cardData?.id]);

  /* Min spread filter state */
  const [minEntrySpread, setMinEntrySpread] = t.useState(0),
    [minExitSpread, setMinExitSpread] = t.useState(0),
    [minEntryInputValue, setMinEntryInputValue] = t.useState("0"),
    [minExitInputValue, setMinExitInputValue] = t.useState("0");

  /* Reset min spread filters when modal opens or card changes */
  t.useEffect(() => {
    if (isOpen) {
      (setMinEntrySpread(0),
        setMinExitSpread(0),
        setMinEntryInputValue("0"),
        setMinExitInputValue("0"));
    }
  }, [isOpen, cardData?.id]);

  /* Debounced filter values */
  const debouncedSymbol = useDebounce(selectedSymbol, 500),
    debouncedBuyExchange = useDebounce(selectedBuyExchange, 500),
    debouncedSellExchange = useDebounce(selectedSellExchange, 500),
    /* Build the query params object, memoized to avoid unnecessary fetches */
    queryParams = t.useMemo(
      () =>
        !cardData ||
        !debouncedSymbol ||
        !debouncedBuyExchange ||
        !debouncedSellExchange
          ? null
          : {
              id: cardData.id,
              symbol: debouncedSymbol,
              buyExchange: debouncedBuyExchange,
              sellExchange: debouncedSellExchange,
              buyMarket: selectedBuyMarket,
              sellMarket: selectedSellMarket,
              minEntry: minEntrySpread,
              minExit: minExitSpread,
            },
      [
        cardData?.id,
        debouncedSymbol,
        debouncedBuyExchange,
        debouncedSellExchange,
        selectedBuyMarket,
        selectedSellMarket,
        minEntrySpread,
        minExitSpread,
      ],
    );

  /* Fetch history & funding data whenever query params change */
  t.useEffect(() => {
    if (!isOpen || !queryParams) return;
    (async () => {
      setIsLoadingData(true);
      try {
        const endDate = new Date(),
          startDate = new Date(endDate.getTime() - 1440 * 60 * 1e3),
          requestPayload = {
            buy_exchange: Y(queryParams.buyExchange),
            buy_symbol: buildTradingSymbol(
              queryParams.symbol,
              queryParams.buyMarket,
            ),
            sell_exchange: Y(queryParams.sellExchange),
            sell_symbol: buildTradingSymbol(
              queryParams.symbol,
              queryParams.sellMarket,
            ),
            date_start: startDate.toISOString(),
            date_end: endDate.toISOString(),
            min_entry_spread: queryParams.minEntry,
            min_exit_spread: queryParams.minExit,
          },
          historyRequest = Ge.post(
            "http://localhost:8000/api/v1/buy-sell-data",
            requestPayload,
          ),
          baseAsset = queryParams.symbol.split(/[\/:]/)[0],
          fundingRequest = nr(baseAsset).catch(
            (error) => (
              console.warn("Failed to fetch funding data", error),
              null
            ),
          ),
          [historyResponse, fundingResponse] = await Promise.all([
            historyRequest,
            fundingRequest,
          ]);
        setHistoryData(historyResponse.data);
        setFundingData(fundingResponse);
      } catch (error) {
        console.error("Failed to fetch history", error);
        setHistoryData(null);
        setFundingData(null);
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, [isOpen, queryParams]);

  /* Handlers for min-spread input blur / Enter key */
  const handleMinEntryBlur = () => {
      const parsed = parseFloat(minEntryInputValue);
      if (!isNaN(parsed) && parsed !== minEntrySpread) {
        setMinEntrySpread(parsed);
      }
    },
    handleMinExitBlur = () => {
      const parsed = parseFloat(minExitInputValue);
      if (!isNaN(parsed) && parsed !== minExitSpread) {
        setMinExitSpread(parsed);
      }
    },
    // ---------------------------------------------------------------------------
    //  Memoized data transformations
    // ---------------------------------------------------------------------------

    /** Transform entry spread history into {time, value} array */
    entrySpreadSeries = t.useMemo(
      () =>
        historyData?.entry
          ? historyData.entry.map((record) => ({
              time: new Date(record.time).getTime(),
              value: record.entry_spread,
            }))
          : [],
      [historyData],
    ),
    /** Transform exit spread history into {time, value} array */
    exitSpreadSeries = t.useMemo(() => {
      const exitSource =
        historyData?.exit && historyData.exit.length > 0
          ? historyData.exit
          : historyData?.entry;
      return exitSource
        ? exitSource.map((record) => ({
            time: new Date(record.time).getTime(),
            value: record.exit_spread,
          }))
        : [];
    }, [historyData]),
    /** Build funding rate history table rows */
    fundingRateRows = t.useMemo(() => {
      if (!fundingData || !cardData) return [];
      const futureMarketData = fundingData.items?.find(
        (marketItem) => marketItem.market === "future",
      );
      if (!futureMarketData) return [];
      const findExchangeData = (exchangeName) => {
          const lowerName = exchangeName.toLowerCase();
          return futureMarketData.data?.find(
            (exchangeEntry) =>
              (exchangeEntry.exchange || "").toLowerCase() === lowerName ||
              (exchangeEntry.exchange || "").toLowerCase().includes(lowerName),
          );
        },
        buyExchangeData = findExchangeData(selectedBuyExchange),
        sellExchangeData = findExchangeData(selectedSellExchange);
      if (!buyExchangeData && !sellExchangeData) return [];
      const extractFundingHistory = (exchangeDataItem) => {
          return exchangeDataItem?.data?.funding_history || [];
        },
        buyFundingHistory = extractFundingHistory(buyExchangeData),
        sellFundingHistory = extractFundingHistory(sellExchangeData),
        timeToRatesMap = new Map(),
        populateRates = (historyArray, side) => {
          historyArray.forEach((fundingRecord) => {
            let normalizedTime = Number(
              fundingRecord.funding_time || fundingRecord.fundingTime,
            );
            normalizedTime = Math.round(normalizedTime / 60) * 60 * 1e3;
            const fundingRate = parseFloat(
              fundingRecord.funding_rate || fundingRecord.fundingRate,
            );
            timeToRatesMap.has(normalizedTime) ||
              timeToRatesMap.set(normalizedTime, {
                buy: null,
                sell: null,
              });
            const rateEntry = timeToRatesMap.get(normalizedTime);
            side === "buy"
              ? (rateEntry.buy = fundingRate)
              : (rateEntry.sell = fundingRate);
          });
        };
      return (
        populateRates(buyFundingHistory, "buy"),
        populateRates(sellFundingHistory, "sell"),
        Array.from(timeToRatesMap.entries())
          .map(([timestamp, rates]) => {
            const buyRate = rates.buy,
              sellRate = rates.sell,
              rateDifference = (sellRate ?? 0) - (buyRate ?? 0);
            return {
              time: timestamp,
              rateBuy: buyRate,
              rateSell: sellRate,
              diff: rateDifference,
            };
          })
          .sort((rowA, rowB) => rowB.time - rowA.time)
      );
    }, [fundingData, cardData]),
    /** Extract funding interval labels (e.g. "8h") for buy/sell exchanges */
    fundingIntervalLabels = t.useMemo(() => {
      if (!fundingData || !cardData)
        return {
          buy: null,
          sell: null,
        };
      const futureMarketData = fundingData.items?.find(
        (marketItem) => marketItem.market === "future",
      );
      if (!futureMarketData)
        return {
          buy: null,
          sell: null,
        };
      const getIntervalLabel = (exchangeName) => {
        const lowerName = exchangeName.toLowerCase(),
          matchedExchange = futureMarketData.data?.find(
            (exchangeEntry) =>
              (exchangeEntry.exchange || "").toLowerCase() === lowerName ||
              (exchangeEntry.exchange || "").toLowerCase().includes(lowerName),
          ),
          rawInterval =
            matchedExchange?.data?.ticker?.funding_interval ||
            matchedExchange?.data?.contract?.funding_interval;
        if (!rawInterval) return null;
        const numericInterval = Number(rawInterval);
        if (isNaN(numericInterval) || numericInterval === 0) return null;
        const intervalHours =
          numericInterval > 100 ? numericInterval / 3600 : numericInterval / 60;
        return `${Number.isInteger(intervalHours) ? intervalHours : intervalHours.toFixed(1)}h`;
      };
      return {
        buy: getIntervalLabel(selectedBuyExchange || ""),
        sell: getIntervalLabel(selectedSellExchange || ""),
      };
    }, [fundingData, cardData, selectedBuyExchange, selectedSellExchange]),
    /** Extract network/chain info for all exchanges */
    networkInfoByExchange = t.useMemo(() => {
      if (!fundingData?.items) return [];
      const exchangeNetworkMap = new Map();
      return (
        fundingData.items.forEach((marketItem) => {
          if (marketItem.data) {
            marketItem.data.forEach((exchangeEntry) => {
              const exchangeName = exchangeEntry.exchange || "Unknown",
                currencyData = exchangeEntry.data?.currency,
                chainList =
                  currencyData?.chains || currencyData?.networkList || [];
              if (Array.isArray(chainList) && chainList.length > 0) {
                const parsedChains = chainList.map((chainInfo) => {
                  const parseBooleanValue = (val) => {
                    return val === true || val === "true";
                  };
                  let isDepositEnabled = false;
                  chainInfo.deposit_disabled !== undefined
                    ? (isDepositEnabled = !parseBooleanValue(
                        chainInfo.deposit_disabled,
                      ))
                    : chainInfo.depositEnable !== undefined
                      ? (isDepositEnabled = parseBooleanValue(
                          chainInfo.depositEnable,
                        ))
                      : chainInfo.rechargeable !== undefined
                        ? (isDepositEnabled = parseBooleanValue(
                            chainInfo.rechargeable,
                          ))
                        : chainInfo.deposit_enabled !== undefined &&
                          (isDepositEnabled = parseBooleanValue(
                            chainInfo.deposit_enabled,
                          ));
                  let isWithdrawEnabled = false;
                  return (
                    chainInfo.withdraw_disabled !== undefined
                      ? (isWithdrawEnabled = !parseBooleanValue(
                          chainInfo.withdraw_disabled,
                        ))
                      : chainInfo.withdrawEnable !== undefined
                        ? (isWithdrawEnabled = parseBooleanValue(
                            chainInfo.withdrawEnable,
                          ))
                        : chainInfo.withdrawable !== undefined
                          ? (isWithdrawEnabled = parseBooleanValue(
                              chainInfo.withdrawable,
                            ))
                          : chainInfo.withdraw_enabled !== undefined &&
                            (isWithdrawEnabled = parseBooleanValue(
                              chainInfo.withdraw_enabled,
                            )),
                    {
                      chain:
                        chainInfo.chain ||
                        chainInfo.chainName ||
                        chainInfo.network ||
                        "Unknown",
                      withdrawFee: chainInfo.withdrawFee,
                      minWithdrawAmount:
                        chainInfo.minWithdrawAmount || chainInfo.minWithdraw,
                      depositEnable: isDepositEnabled,
                      withdrawEnable: isWithdrawEnabled,
                      contractAddress:
                        chainInfo.contractAddress || chainInfo.contract,
                    }
                  );
                });
                if (
                  !exchangeNetworkMap.has(exchangeName) ||
                  (exchangeEntry.market === "spot" && parsedChains.length > 0)
                ) {
                  exchangeNetworkMap.set(exchangeName, parsedChains);
                }
              }
            });
          }
        }),
        Array.from(exchangeNetworkMap.entries())
          .map(([exchangeName, networks]) => ({
            exchange: exchangeName,
            networks: networks,
          }))
          .sort((exchangeA, exchangeB) => exchangeA.exchange.localeCompare(exchangeB.exchange))
      );
    }, [fundingData]),
    /** Downsampled entry data for chart rendering */
    downsampledEntrySeries = t.useMemo(
      () => downsampleDataPoints(entrySpreadSeries),
      [entrySpreadSeries],
    ),
    /** Downsampled exit data for chart rendering */
    downsampledExitSeries = t.useMemo(
      () => downsampleDataPoints(exitSpreadSeries),
      [exitSpreadSeries],
    ),
    /** Entry spread stats (max, min, avg) */
    entrySpreadStats = t.useMemo(() => {
      if (!historyData)
        return {
          max: 0,
          min: 0,
          avg: 0,
        };
      const values = entrySpreadSeries.map((dataPoint) => dataPoint.value);
      return {
        ...computeStats(values),
        avg: historyData.avg_entry_spread || computeStats(values).avg,
      };
    }, [historyData, entrySpreadSeries]),
    /** Exit spread stats (max, min, avg) */
    exitSpreadStats = t.useMemo(() => {
      if (!historyData)
        return {
          max: 0,
          min: 0,
          avg: 0,
        };
      const values = exitSpreadSeries.map((dataPoint) => dataPoint.value);
      return {
        ...computeStats(values),
        avg: historyData.avg_exit_spread || computeStats(values).avg,
      };
    }, [historyData, exitSpreadSeries]),
    // ---------------------------------------------------------------------------
    //  Chart configuration builder
    // ---------------------------------------------------------------------------

    buildChartOptions = (chartColor) => ({
      chart: {
        type: "area",
        height: 300,
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
        fontFamily: "inherit",
        background: "transparent",
        animations: {
          enabled: false,
        },
        sparkline: {
          enabled: false,
        },
      },
      colors: [chartColor],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
        width: 3,
        lineCap: "round",
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      xaxis: {
        type: "datetime",
        tooltip: {
          enabled: false,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          show: true,
          style: {
            colors: "#94a3b8",
            fontSize: "11px",
            fontFamily: "inherit",
          },
          datetimeFormatter: {
            year: "yyyy",
            month: "MMM 'yy",
            day: "dd MMM",
            hour: "HH:mm",
          },
        },
        crosshairs: {
          show: true,
          position: "back",
          stroke: {
            color: "#cbd5e1",
            width: 1,
            dashArray: 3,
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#94a3b8",
            fontSize: "11px",
            fontFamily: "inherit",
          },
          formatter: (yValue) => `${yValue.toFixed(2)}%`,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      grid: {
        show: true,
        borderColor: "rgba(148, 163, 184, 0.1)",
        strokeDashArray: 4,
        padding: {
          top: 0,
          right: 10,
          bottom: 0,
          left: 10,
        },
        xaxis: {
          lines: {
            show: false,
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
      tooltip: {
        enabled: true,
        shared: true,
        followCursor: true,
        intersect: false,
        theme: "dark",
        style: {
          fontSize: "12px",
          fontFamily: "inherit",
        },
        x: {
          format: "dd MMM HH:mm",
        },
        y: {
          formatter: (yValue) => `${yValue.toFixed(2)}%`,
        },
        marker: {
          show: true,
        },
      },
      markers: {
        size: 0,
        colors: [chartColor],
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: {
          size: 6,
        },
      },
    }),
    // ---------------------------------------------------------------------------
    //  Render helpers (sub-sections of the modal)
    // ---------------------------------------------------------------------------

    /** Renders the Max / Min / Avg stats grid */
    renderStatsGrid = (stats, colorClass) =>
      e.jsxs("div", {
        className: "grid grid-cols-3 gap-4 mb-6",
        children: [
          e.jsxs("div", {
            className:
              "group bg-gray-50 dark:bg-dark-700/50 p-3 rounded-lg border border-gray-100 dark:border-dark-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-gray-200 dark:hover:border-dark-500",
            children: [
              e.jsx("span", {
                className:
                  "text-xs text-gray-500 dark:text-dark-400 uppercase block mb-1",
                children: "M\u00e1ximo",
              }),
              e.jsxs("span", {
                className: `text-lg font-bold ${colorClass}`,
                children: [stats.max.toFixed(2), "%"],
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "group bg-gray-50 dark:bg-dark-700/50 p-3 rounded-lg border border-gray-100 dark:border-dark-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-gray-200 dark:hover:border-dark-500 delay-75",
            children: [
              e.jsx("span", {
                className:
                  "text-xs text-gray-500 dark:text-dark-400 uppercase block mb-1",
                children: "M\u00ednimo",
              }),
              e.jsxs("span", {
                className: `text-lg font-bold ${colorClass}`,
                children: [stats.min.toFixed(2), "%"],
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "group bg-gray-50 dark:bg-dark-700/50 p-3 rounded-lg border border-gray-100 dark:border-dark-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-gray-200 dark:hover:border-dark-500 delay-150",
            children: [
              e.jsx("span", {
                className:
                  "text-xs text-gray-500 dark:text-dark-400 uppercase block mb-1",
                children: "M\u00e9dia",
              }),
              e.jsxs("span", {
                className: `text-lg font-bold ${colorClass}`,
                children: [stats.avg.toFixed(2), "%"],
              }),
            ],
          }),
        ],
      }),
    /** Renders a spread history data table */
    renderSpreadTable = (spreadDataArray) =>
      e.jsxs("div", {
        className:
          "overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700 flex flex-col h-[300px]",
        children: [
          e.jsx("div", {
            className: "overflow-y-auto custom-scrollbar flex-1",
            children: e.jsxs("table", {
              className:
                "min-w-full divide-y divide-gray-200 dark:divide-dark-700 relative",
              children: [
                e.jsx("thead", {
                  className:
                    "bg-gray-50 dark:bg-dark-800 sticky top-0 z-10 shadow-sm",
                  children: e.jsxs("tr", {
                    children: [
                      e.jsx("th", {
                        className:
                          "px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                        children: "Hor\u00e1rio",
                      }),
                      e.jsx("th", {
                        className:
                          "px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                        children: "Spread",
                      }),
                    ],
                  }),
                }),
                e.jsx("tbody", {
                  className:
                    "divide-y divide-gray-200 dark:divide-dark-700 bg-white dark:bg-dark-800",
                  children: [...spreadDataArray]
                    .reverse()
                    .map((spreadRecord, index) =>
                      e.jsxs(
                        "tr",
                        {
                          className:
                            "group hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors duration-200",
                          children: [
                            e.jsxs("td", {
                              className:
                                "px-4 py-2 text-sm text-gray-700 dark:text-dark-200 whitespace-nowrap group-hover:text-gray-900 dark:group-hover:text-white transition-colors",
                              children: [
                                Q(spreadRecord.time).format("HH:mm:ss"),
                                e.jsxs("span", {
                                  className:
                                    "text-xs text-gray-400 ml-1 group-hover:text-gray-500 transition-colors",
                                  children: [
                                    "(",
                                    Q(spreadRecord.time).format("DD/MM"),
                                    ")",
                                  ],
                                }),
                              ],
                            }),
                            e.jsxs("td", {
                              className: z(
                                "px-4 py-2 text-sm text-right font-mono font-medium transition-all duration-200 group-hover:scale-105 origin-right",
                                spreadRecord.value > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400",
                              ),
                              children: [
                                spreadRecord.value > 0 ? "+" : "",
                                spreadRecord.value.toFixed(2),
                                "%",
                              ],
                            }),
                          ],
                        },
                        index,
                      ),
                    ),
                }),
              ],
            }),
          }),
          e.jsxs("div", {
            className:
              "bg-gray-50 dark:bg-dark-800 p-2 text-center text-xs text-gray-500 dark:text-dark-400 border-t border-gray-200 dark:border-dark-700",
            children: ["Total de ", spreadDataArray.length, " registros"],
          }),
        ],
      }),
    /** Renders the Funding Rates tab content */
    renderFundingRatesTab = () =>
      e.jsxs("div", {
        className: "flex flex-col h-full",
        children: [
          e.jsxs("div", {
            className: "grid grid-cols-2 gap-4 mb-4",
            children: [
              e.jsxs("div", {
                className:
                  "p-3 rounded-lg border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700/30 flex flex-col items-center justify-center",
                children: [
                  e.jsxs("span", {
                    className:
                      "text-[10px] uppercase text-gray-500 dark:text-dark-400 mb-1 font-semibold tracking-wider",
                    children: ["Ciclo ", selectedBuyExchange],
                  }),
                  isLoadingData
                    ? e.jsx(SkeletonBar, {
                        className: "h-6 w-12",
                      })
                    : e.jsx("span", {
                        className:
                          "text-lg font-bold text-gray-900 dark:text-white",
                        children:
                          fundingIntervalLabels.buy ||
                          e.jsx("span", {
                            className: "text-gray-400 text-sm font-normal",
                            children: "N/A",
                          }),
                      }),
                ],
              }),
              e.jsxs("div", {
                className:
                  "p-3 rounded-lg border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700/30 flex flex-col items-center justify-center",
                children: [
                  e.jsxs("span", {
                    className:
                      "text-[10px] uppercase text-gray-500 dark:text-dark-400 mb-1 font-semibold tracking-wider",
                    children: ["Ciclo ", selectedSellExchange],
                  }),
                  isLoadingData
                    ? e.jsx(SkeletonBar, {
                        className: "h-6 w-12",
                      })
                    : e.jsx("span", {
                        className:
                          "text-lg font-bold text-gray-900 dark:text-white",
                        children:
                          fundingIntervalLabels.sell ||
                          e.jsx("span", {
                            className: "text-gray-400 text-sm font-normal",
                            children: "N/A",
                          }),
                      }),
                ],
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700 flex flex-col h-[300px]",
            children: [
              e.jsx("div", {
                className: "overflow-y-auto custom-scrollbar flex-1",
                children: e.jsxs("table", {
                  className:
                    "min-w-full divide-y divide-gray-200 dark:divide-dark-700 relative",
                  children: [
                    e.jsx("thead", {
                      className:
                        "bg-gray-50 dark:bg-dark-800 sticky top-0 z-10 shadow-sm",
                      children: e.jsxs("tr", {
                        children: [
                          e.jsx("th", {
                            className:
                              "px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                            children: "Hor\u00e1rio",
                          }),
                          e.jsxs("th", {
                            className:
                              "px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                            children: [
                              selectedBuyExchange,
                              " ",
                              e.jsx("span", {
                                className: "text-[9px] opacity-70",
                                children: "(Compra)",
                              }),
                            ],
                          }),
                          e.jsxs("th", {
                            className:
                              "px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                            children: [
                              selectedSellExchange,
                              " ",
                              e.jsx("span", {
                                className: "text-[9px] opacity-70",
                                children: "(Venda)",
                              }),
                            ],
                          }),
                          e.jsx("th", {
                            className:
                              "px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                            children: "Diferen\u00e7a",
                          }),
                        ],
                      }),
                    }),
                    e.jsx("tbody", {
                      className:
                        "divide-y divide-gray-200 dark:divide-dark-700 bg-white dark:bg-dark-800",
                      children:
                        fundingRateRows.length === 0
                          ? e.jsx("tr", {
                              children: e.jsx("td", {
                                colSpan: 4,
                                className:
                                  "px-4 py-8 text-center text-sm text-gray-500 dark:text-dark-400",
                                children: "Nenhum dado de funding encontrado.",
                              }),
                            })
                          : fundingRateRows.map((fundingRow, index) =>
                              e.jsxs(
                                "tr",
                                {
                                  className:
                                    "group hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors duration-200",
                                  children: [
                                    e.jsxs("td", {
                                      className:
                                        "px-4 py-3 text-sm text-gray-700 dark:text-dark-200 whitespace-nowrap group-hover:text-gray-900 dark:group-hover:text-white transition-colors",
                                      children: [
                                        Q(fundingRow.time).format("HH:mm"),
                                        e.jsx("span", {
                                          className:
                                            "text-xs text-gray-400 block group-hover:text-gray-500 transition-colors",
                                          children: Q(fundingRow.time).format(
                                            "DD/MM/YYYY",
                                          ),
                                        }),
                                      ],
                                    }),
                                    e.jsx("td", {
                                      className:
                                        "px-4 py-3 text-sm text-right font-mono text-gray-600 dark:text-dark-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors",
                                      children:
                                        fundingRow.rateBuy !== null
                                          ? `${fundingRow.rateBuy > 0 ? "+" : ""}${(fundingRow.rateBuy * 100).toFixed(4)}%`
                                          : "-",
                                    }),
                                    e.jsx("td", {
                                      className:
                                        "px-4 py-3 text-sm text-right font-mono text-gray-600 dark:text-dark-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors",
                                      children:
                                        fundingRow.rateSell !== null
                                          ? `${fundingRow.rateSell > 0 ? "+" : ""}${(fundingRow.rateSell * 100).toFixed(4)}%`
                                          : "-",
                                    }),
                                    e.jsx("td", {
                                      className:
                                        "px-4 py-3 text-sm text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 group-hover:bg-blue-100/50 dark:group-hover:bg-blue-900/30 transition-colors",
                                      children:
                                        fundingRow.diff !== null
                                          ? `${(fundingRow.diff * 100).toFixed(4)}%`
                                          : "-",
                                    }),
                                  ],
                                },
                                index,
                              ),
                            ),
                    }),
                  ],
                }),
              }),
              e.jsx("div", {
                className:
                  "bg-gray-50 dark:bg-dark-800 p-2 text-center text-xs text-gray-500 dark:text-dark-400 border-t border-gray-200 dark:border-dark-700",
                children: "Hist\u00f3rico de Taxas",
              }),
            ],
          }),
        ],
      }),
    /** Renders the Networks tab content */
    renderNetworksTab = () =>
      e.jsx("div", {
        className: "space-y-4",
        children:
          networkInfoByExchange.length === 0
            ? e.jsx("div", {
                className:
                  "text-center py-12 text-gray-500 dark:text-dark-400 bg-gray-50 dark:bg-dark-700/30 rounded-xl border border-dashed border-gray-300 dark:border-dark-600",
                children: e.jsx("p", {
                  children: "Nenhuma informa\u00e7\u00e3o de rede encontrada.",
                }),
              })
            : networkInfoByExchange.map((exchangeInfo) =>
                e.jsxs(
                  "div",
                  {
                    className:
                      "overflow-hidden rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm",
                    children: [
                      e.jsxs("div", {
                        className:
                          "px-4 py-3 bg-gray-50 dark:bg-dark-700/50 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between",
                        children: [
                          e.jsx("h4", {
                            className:
                              "font-bold text-gray-800 dark:text-gray-200",
                            children: exchangeInfo.exchange,
                          }),
                          e.jsxs("span", {
                            className:
                              "text-xs text-gray-500 bg-gray-200 dark:bg-dark-600 px-2 py-0.5 rounded-full",
                            children: [exchangeInfo.networks.length, " redes"],
                          }),
                        ],
                      }),
                      e.jsx("div", {
                        className:
                          "divide-y divide-gray-100 dark:divide-dark-700",
                        children: exchangeInfo.networks.map(
                          (networkDetail, index) =>
                            e.jsxs(
                              "div",
                              {
                                className:
                                  "p-4 hover:bg-gray-50 dark:hover:bg-dark-700/30 transition-colors",
                                children: [
                                  e.jsxs("div", {
                                    className:
                                      "flex items-center justify-between mb-3",
                                    children: [
                                      e.jsx("div", {
                                        className: "flex items-center gap-2",
                                        children: e.jsx("span", {
                                          className:
                                            "font-bold text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-600 px-2 py-1 rounded text-xs uppercase tracking-wide font-mono",
                                          children: networkDetail.chain,
                                        }),
                                      }),
                                      e.jsxs("div", {
                                        className: "flex gap-2",
                                        children: [
                                          e.jsxs("div", {
                                            className: z(
                                              "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                                              networkDetail.depositEnable
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
                                            ),
                                            children: [
                                              e.jsx(ArrowDownTrayIcon, {
                                                className: "size-3",
                                              }),
                                              networkDetail.depositEnable
                                                ? "Dep\u00f3sito ON"
                                                : "Dep\u00f3sito OFF",
                                            ],
                                          }),
                                          e.jsxs("div", {
                                            className: z(
                                              "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                                              networkDetail.withdrawEnable
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
                                            ),
                                            children: [
                                              e.jsx(ArrowUpTrayIcon, {
                                                className: "size-3",
                                              }),
                                              networkDetail.withdrawEnable
                                                ? "Saque ON"
                                                : "Saque OFF",
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  e.jsxs("div", {
                                    className: "grid grid-cols-2 gap-4 text-xs",
                                    children: [
                                      e.jsxs("div", {
                                        children: [
                                          e.jsx("span", {
                                            className:
                                              "text-gray-500 dark:text-dark-400 block mb-0.5",
                                            children: "Taxa de Saque",
                                          }),
                                          e.jsx("span", {
                                            className:
                                              "font-mono text-gray-700 dark:text-gray-300",
                                            children: networkDetail.withdrawFee
                                              ? `${parseFloat(networkDetail.withdrawFee)}`
                                              : "-",
                                          }),
                                        ],
                                      }),
                                      e.jsxs("div", {
                                        children: [
                                          e.jsx("span", {
                                            className:
                                              "text-gray-500 dark:text-dark-400 block mb-0.5",
                                            children: "Saque M\u00ednimo",
                                          }),
                                          e.jsx("span", {
                                            className:
                                              "font-mono text-gray-700 dark:text-gray-300",
                                            children:
                                              networkDetail.minWithdrawAmount
                                                ? `${parseFloat(networkDetail.minWithdrawAmount)}`
                                                : "-",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              },
                              index,
                            ),
                        ),
                      }),
                    ],
                  },
                  exchangeInfo.exchange,
                ),
              ),
      });

  // ---------------------------------------------------------------------------
  //  Main modal render
  // ---------------------------------------------------------------------------

  return e.jsx(te, {
    appear: true,
    show: isOpen,
    as: t.Fragment,
    children: e.jsxs(ge, {
      as: "div",
      className: "relative z-50",
      onClose: onClose,
      children: [
        e.jsx(W, {
          as: t.Fragment,
          enter: "ease-out duration-300",
          enterFrom: "opacity-0",
          enterTo: "opacity-100",
          leave: "ease-in duration-200",
          leaveFrom: "opacity-100",
          leaveTo: "opacity-0",
          children: e.jsx("div", {
            className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
          }),
        }),
        e.jsx("div", {
          className: "fixed inset-0 overflow-y-auto",
          children: e.jsx("div", {
            className: "flex min-h-full items-center justify-center p-4",
            children: e.jsx(W, {
              as: t.Fragment,
              enter: "ease-out duration-300",
              enterFrom: "opacity-0 scale-95",
              enterTo: "opacity-100 scale-100",
              leave: "ease-in duration-200",
              leaveFrom: "opacity-100 scale-100",
              leaveTo: "opacity-0 scale-95",
              children: e.jsxs(he, {
                className:
                  "w-full max-w-3xl transform rounded-2xl bg-white dark:bg-dark-800 p-6 text-left align-middle shadow-xl transition-all border dark:border-dark-700",
                children: [
                  e.jsxs("div", {
                    className: "flex items-center justify-between mb-6",
                    children: [
                      e.jsxs("div", {
                        children: [
                          e.jsxs(be, {
                            as: "h3",
                            className:
                              "text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2",
                            children: [
                              "Hist\u00f3rico e Detalhes",
                              isLoadingData &&
                                e.jsx(Oe, {
                                  className:
                                    "size-4 animate-spin text-gray-400",
                                }),
                            ],
                          }),
                          e.jsxs("button", {
                            onClick: () =>
                              setIsFiltersExpanded(!isFiltersExpanded),
                            className:
                              "group flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left",
                            children: [
                              e.jsxs("span", {
                                children: [
                                  selectedSymbol,
                                  " \u2022 ",
                                  selectedBuyExchange,
                                  " \u27A4 ",
                                  selectedSellExchange,
                                ],
                              }),
                              e.jsx(ChevronDownIcon, {
                                className: z(
                                  "size-4 transition-transform duration-200",
                                  isFiltersExpanded ? "rotate-180" : "",
                                ),
                              }),
                            ],
                          }),
                        ],
                      }),
                      e.jsx("button", {
                        onClick: onClose,
                        className:
                          "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300 transition-all duration-300 hover:rotate-90 hover:scale-110",
                        children: e.jsx(ue, {
                          className: "size-6",
                        }),
                      }),
                    ],
                  }),

                  /* Collapsible filters panel */
                  e.jsx(te, {
                    show: isFiltersExpanded,
                    enter: "transition duration-200 ease-out",
                    enterFrom: "transform scale-95 opacity-0 height-0",
                    enterTo: "transform scale-100 opacity-100 height-auto",
                    leave: "transition duration-150 ease-in",
                    leaveFrom: "transform scale-100 opacity-100 height-auto",
                    leaveTo: "transform scale-95 opacity-0 height-0",
                    children: e.jsxs("div", {
                      className:
                        "mb-6 p-4 rounded-xl bg-gray-50 dark:bg-dark-700/30 border border-gray-200 dark:border-dark-600",
                      children: [
                        e.jsx("div", {
                          className: "mb-4",
                          children: e.jsx(ce, {
                            label: "Moeda",
                            data: coinOptions,
                            value: selectedSymbol,
                            onChange: setSelectedSymbol,
                            placeholder: "Buscar moeda...",
                          }),
                        }),
                        e.jsxs("div", {
                          className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                          children: [
                            e.jsxs("div", {
                              className: "grid grid-cols-2 gap-2",
                              children: [
                                e.jsx(ce, {
                                  label: "Compra",
                                  data: exchangeOptions,
                                  value: selectedBuyExchange,
                                  onChange: setSelectedBuyExchange,
                                  placeholder: "Exch...",
                                }),
                                e.jsx(Te, {
                                  label: "Tipo",
                                  data: [
                                    {
                                      value: "spot",
                                      label: "Spot",
                                    },
                                    {
                                      value: "future",
                                      label: "Fut",
                                    },
                                  ],
                                  value: selectedBuyMarket,
                                  onChange: (event) =>
                                    setSelectedBuyMarket(event.target.value),
                                }),
                              ],
                            }),
                            e.jsxs("div", {
                              className: "grid grid-cols-2 gap-2",
                              children: [
                                e.jsx(ce, {
                                  label: "Venda",
                                  data: exchangeOptions,
                                  value: selectedSellExchange,
                                  onChange: setSelectedSellExchange,
                                  placeholder: "Exch...",
                                }),
                                e.jsx(Te, {
                                  label: "Tipo",
                                  data: [
                                    {
                                      value: "spot",
                                      label: "Spot",
                                    },
                                    {
                                      value: "future",
                                      label: "Fut",
                                    },
                                  ],
                                  value: selectedSellMarket,
                                  onChange: (event) =>
                                    setSelectedSellMarket(event.target.value),
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  }),

                  /* Tab group: Entry Spread / Exit Spread / Funding Rates / Networks */
                  e.jsxs(or, {
                    selectedIndex: activeTabIndex,
                    onChange: setActiveTabIndex,
                    children: [
                      e.jsx(ir, {
                        className:
                          "flex space-x-1 rounded-xl bg-gray-100 dark:bg-dark-700/50 p-1 mb-6",
                        children: [
                          "Entradas (Spread)",
                          "Sa\u00eddas (Spread)",
                          "Funding Rates",
                          "Redes",
                        ].map((tabLabel) =>
                          e.jsx(
                            dr,
                            {
                              className: ({ selected: isSelected }) =>
                                z(
                                  "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-300 ease-out",
                                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-white dark:ring-offset-dark-800 ring-primary-400",
                                  isSelected
                                    ? "bg-white dark:bg-dark-800 text-primary-700 dark:text-primary-400 shadow-md scale-100"
                                    : "text-gray-600 dark:text-dark-300 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-700",
                                ),
                              children: tabLabel,
                            },
                            tabLabel,
                          ),
                        ),
                      }),
                      e.jsxs(lr, {
                        children: [
                          /* ---- Tab Panel: Entry Spread ---- */
                          e.jsx(J, {
                            className:
                              "focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500",
                            children: isLoadingData
                              ? e.jsxs(e.Fragment, {
                                  children: [
                                    e.jsx(StatsGridSkeleton, {}),
                                    e.jsx("div", {
                                      className: "mb-6",
                                      children: e.jsx(ChartSkeleton, {}),
                                    }),
                                    e.jsx(TableSkeleton, {}),
                                  ],
                                })
                              : e.jsxs(e.Fragment, {
                                  children: [
                                    renderStatsGrid(
                                      entrySpreadStats,
                                      "text-emerald-600 dark:text-emerald-400",
                                    ),
                                    e.jsxs("div", {
                                      className:
                                        "mb-6 p-4 rounded-xl bg-gray-50/50 dark:bg-dark-700/20 border border-gray-100 dark:border-dark-600",
                                      children: [
                                        e.jsx("div", {
                                          className: "h-[300px] w-full",
                                          children:
                                            activeTabIndex === 0 &&
                                            downsampledEntrySeries.length > 0 &&
                                            e.jsx(Re, {
                                              options:
                                                buildChartOptions("#10b981"),
                                              series: [
                                                {
                                                  name: "Spread Entrada",
                                                  data: downsampledEntrySeries.map(
                                                    (dataPoint) => ({
                                                      x: dataPoint.time,
                                                      y: dataPoint.value,
                                                    }),
                                                  ),
                                                },
                                              ],
                                              type: "area",
                                              height: "100%",
                                            }),
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "mt-4 pt-3 border-t border-gray-200 dark:border-dark-600 flex justify-end items-center gap-3",
                                          children: [
                                            e.jsx("label", {
                                              className:
                                                "text-xs font-medium text-gray-500 dark:text-dark-400",
                                              children: "Spread M\u00ednimo:",
                                            }),
                                            e.jsxs("div", {
                                              className:
                                                "relative flex items-center",
                                              children: [
                                                e.jsx("input", {
                                                  type: "number",
                                                  step: "0.1",
                                                  className:
                                                    "w-20 h-8 pl-3 pr-8 text-sm bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-right",
                                                  value: minEntryInputValue,
                                                  onChange: (event) =>
                                                    setMinEntryInputValue(
                                                      event.target.value,
                                                    ),
                                                  onBlur: handleMinEntryBlur,
                                                  onKeyDown: (event) =>
                                                    event.key === "Enter" &&
                                                    handleMinEntryBlur(),
                                                }),
                                                e.jsx("span", {
                                                  className:
                                                    "absolute right-3 text-xs text-gray-400 pointer-events-none",
                                                  children: "%",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    e.jsx("h4", {
                                      className:
                                        "text-sm font-bold text-gray-900 dark:text-white mb-3",
                                      children: "\u00daltimos Registros",
                                    }),
                                    renderSpreadTable(entrySpreadSeries),
                                  ],
                                }),
                          }),

                          /* ---- Tab Panel: Exit Spread ---- */
                          e.jsx(J, {
                            className:
                              "focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500",
                            children: isLoadingData
                              ? e.jsxs(e.Fragment, {
                                  children: [
                                    e.jsx(StatsGridSkeleton, {}),
                                    e.jsx("div", {
                                      className: "mb-6",
                                      children: e.jsx(ChartSkeleton, {}),
                                    }),
                                    e.jsx(TableSkeleton, {}),
                                  ],
                                })
                              : e.jsxs(e.Fragment, {
                                  children: [
                                    renderStatsGrid(
                                      exitSpreadStats,
                                      "text-blue-600 dark:text-blue-400",
                                    ),
                                    e.jsxs("div", {
                                      className:
                                        "mb-6 p-4 rounded-xl bg-gray-50/50 dark:bg-dark-700/20 border border-gray-100 dark:border-dark-600",
                                      children: [
                                        e.jsx("div", {
                                          className: "h-[300px] w-full",
                                          children:
                                            activeTabIndex === 1 &&
                                            downsampledExitSeries.length > 0 &&
                                            e.jsx(Re, {
                                              options:
                                                buildChartOptions("#3b82f6"),
                                              series: [
                                                {
                                                  name: "Spread Sa\u00edda",
                                                  data: downsampledExitSeries.map(
                                                    (dataPoint) => ({
                                                      x: dataPoint.time,
                                                      y: dataPoint.value,
                                                    }),
                                                  ),
                                                },
                                              ],
                                              type: "area",
                                              height: "100%",
                                            }),
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "mt-4 pt-3 border-t border-gray-200 dark:border-dark-600 flex justify-end items-center gap-3",
                                          children: [
                                            e.jsx("label", {
                                              className:
                                                "text-xs font-medium text-gray-500 dark:text-dark-400",
                                              children: "Spread M\u00ednimo:",
                                            }),
                                            e.jsxs("div", {
                                              className:
                                                "relative flex items-center",
                                              children: [
                                                e.jsx("input", {
                                                  type: "number",
                                                  step: "0.1",
                                                  className:
                                                    "w-20 h-8 pl-3 pr-8 text-sm bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-right",
                                                  value: minExitInputValue,
                                                  onChange: (event) =>
                                                    setMinExitInputValue(
                                                      event.target.value,
                                                    ),
                                                  onBlur: handleMinExitBlur,
                                                  onKeyDown: (event) =>
                                                    event.key === "Enter" &&
                                                    handleMinExitBlur(),
                                                }),
                                                e.jsx("span", {
                                                  className:
                                                    "absolute right-3 text-xs text-gray-400 pointer-events-none",
                                                  children: "%",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    e.jsx("h4", {
                                      className:
                                        "text-sm font-bold text-gray-900 dark:text-white mb-3",
                                      children: "\u00daltimos Registros",
                                    }),
                                    renderSpreadTable(exitSpreadSeries),
                                  ],
                                }),
                          }),

                          /* ---- Tab Panel: Funding Rates ---- */
                          e.jsx(J, {
                            className:
                              "focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500",
                            children: isLoadingData
                              ? e.jsxs(e.Fragment, {
                                  children: [
                                    e.jsxs("div", {
                                      className: "grid grid-cols-2 gap-4 mb-4",
                                      children: [
                                        e.jsx(SkeletonBar, {
                                          className: "h-[72px]",
                                        }),
                                        e.jsx(SkeletonBar, {
                                          className: "h-[72px]",
                                        }),
                                      ],
                                    }),
                                    e.jsx(TableSkeleton, {}),
                                  ],
                                })
                              : renderFundingRatesTab(),
                          }),

                          /* ---- Tab Panel: Networks ---- */
                          e.jsx(J, {
                            className:
                              "focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500",
                            children: isLoadingData
                              ? e.jsx(TableSkeleton, {})
                              : renderNetworksTab(),
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            }),
          }),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
//  Utility: Walk order book levels to compute VWAP and liquidity
// ---------------------------------------------------------------------------

function walkOrderBook(bookLevels = [], targetUsdVolume) {
  let accumulatedUsdVolume = 0,
    weightedPriceSum = 0,
    totalQuantity = 0,
    levelIndex = 0;
  const result = {
    price: Number(bookLevels?.[0]?.[0] ?? 0),
    liquidity: 0,
  };
  if (!targetUsdVolume || targetUsdVolume <= 0) {
    const topPrice = Number(bookLevels?.[0]?.[0] ?? 0),
      topQuantity = Number(bookLevels?.[0]?.[1] ?? 0);
    return (
      (result.price = topPrice),
      (result.liquidity = topQuantity * topPrice),
      result
    );
  }
  for (
    ;
    levelIndex < bookLevels.length && accumulatedUsdVolume < targetUsdVolume;
  ) {
    const levelPrice = Number(bookLevels[levelIndex][0]),
      levelQuantity = Number(bookLevels[levelIndex][1]),
      levelUsdValue = levelPrice * levelQuantity;
    weightedPriceSum += levelPrice * levelQuantity;
    totalQuantity += levelQuantity;
    accumulatedUsdVolume += levelUsdValue;
    levelIndex++;
  }
  return accumulatedUsdVolume < targetUsdVolume
    ? (accumulatedUsdVolume > 0 &&
        ((result.price = weightedPriceSum / totalQuantity),
        (result.liquidity = accumulatedUsdVolume)),
      result)
    : ((result.price = weightedPriceSum / totalQuantity),
      (result.liquidity = accumulatedUsdVolume),
      result);
}

// ---------------------------------------------------------------------------
//  Telegram Send Utility
// ---------------------------------------------------------------------------

const telegramRateLimitMap = new Map(),
  TELEGRAM_RATE_LIMIT_MS = 2e3,
  TELEGRAM_SEND_URL = "http://localhost:8000/integrations/telegram/send",
  sendTelegramMessage = async (
    messageContent,
    rateLimitKey,
    rateLimitMs = TELEGRAM_RATE_LIMIT_MS,
  ) => {
    if (rateLimitKey) {
      const now = Date.now(),
        lastSent = telegramRateLimitMap.get(rateLimitKey);
      if (lastSent && now - lastSent < rateLimitMs) return true;
      telegramRateLimitMap.set(rateLimitKey, now);
    }
    try {
      const authToken = localStorage.getItem("authToken");
      return authToken
        ? (await Xe.post(
            TELEGRAM_SEND_URL,
            {
              content: messageContent,
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            },
          ),
          true)
        : (console.warn(
            "Token de autentica\u00e7\u00e3o n\u00e3o encontrado para envio de Telegram.",
          ),
          false);
    } catch (error) {
      return (
        console.error("Erro ao enviar mensagem para Telegram:", error),
        false
      );
    }
  },
  // ---------------------------------------------------------------------------
  //  Constants & helpers for PiP / WebSocket
  // ---------------------------------------------------------------------------

  DEFAULT_MIN_LIQUIDITY = 50,
  ensureMinLiquidity = (value) => {
    return value && value > 0 ? value : DEFAULT_MIN_LIQUIDITY;
  },
  WEBSOCKET_BASE_URL = "ws://localhost:8000";

// ---------------------------------------------------------------------------
//  Hook: useCompareWebSocket - connects to the compare WS for live spreads
// ---------------------------------------------------------------------------

function useCompareWebSocket(seedCard) {
  const [liveData, setLiveData] = t.useState(null),
    [connectionStatus, setConnectionStatus] = t.useState("idle"),
    [minLiquidity, setMinLiquidity] = t.useState(
      ensureMinLiquidity(seedCard?.minLiquidity),
    ),
    websocketRef = t.useRef(null),
    minLiquidityRef = t.useRef(ensureMinLiquidity(seedCard?.minLiquidity));
  return (
    /* Reset live data when seed card changes */
    (
      t.useEffect(() => {
        setMinLiquidity(ensureMinLiquidity(seedCard?.minLiquidity));
        setLiveData(
          seedCard
            ? {
                ...seedCard,
                entryPercent: 0,
                exitPercent: 0,
                entryPrice: "-",
                exitPrice: "-",
                liquidity: "$0",
              }
            : null,
        );
      }, [seedCard]),
      /* Keep minLiquidity ref in sync */
      t.useEffect(() => {
        minLiquidityRef.current = minLiquidity;
        setLiveData(
          (prevData) =>
            prevData && {
              ...prevData,
              minLiquidity: minLiquidity,
            },
        );
      }, [minLiquidity]),
      /* Establish WebSocket connection */
      t.useEffect(() => {
        if (!seedCard) {
          setConnectionStatus("idle");
          return;
        }
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          setConnectionStatus("error");
          return;
        }
        if (websocketRef.current) {
          (websocketRef.current.close(), (websocketRef.current = null));
        }
        const wsUrl = `${WEBSOCKET_BASE_URL}/crypto/compare-ws?token=${authToken}`,
          socket = new WebSocket(wsUrl);
        return (
          (websocketRef.current = socket),
          setConnectionStatus("connecting"),
          (socket.onopen = () => {
            setConnectionStatus("open");
            const normalizedBuyExchange = Y(seedCard.buyExchange),
              normalizedSellExchange = Y(seedCard.sellExchange);
            socket.send(
              JSON.stringify({
                crypto: seedCard.symbol.replace("/USDT", ""),
                current: "USDT",
                buy: {
                  exchange: normalizedBuyExchange,
                  market: seedCard.buyMarket,
                },
                sell: {
                  exchange: normalizedSellExchange,
                  market: seedCard.sellMarket,
                },
              }),
            );
          }),
          (socket.onmessage = (messageEvent) => {
            try {
              const wsPayload = JSON.parse(messageEvent.data);
              if (
                wsPayload?.type === "ping" ||
                !wsPayload?.buyExchange ||
                !wsPayload?.sellExchange
              )
                return;
              setLiveData((prevData) => {
                if (!prevData) return prevData;
                const currentMinLiquidity = minLiquidityRef.current ?? 0,
                  entryBuyResult = walkOrderBook(
                    wsPayload.buyExchange.asks,
                    currentMinLiquidity,
                  ),
                  entrySellResult = walkOrderBook(
                    wsPayload.sellExchange.bids,
                    currentMinLiquidity,
                  ),
                  exitBuyResult = walkOrderBook(
                    wsPayload.buyExchange.bids,
                    currentMinLiquidity,
                  ),
                  exitSellResult = walkOrderBook(
                    wsPayload.sellExchange.asks,
                    currentMinLiquidity,
                  ),
                  entryBuyPrice = entryBuyResult.price,
                  entrySellPrice = entrySellResult.price,
                  entrySpreadPct =
                    entryBuyPrice > 0
                      ? ((entrySellPrice - entryBuyPrice) / entryBuyPrice) * 100
                      : 0,
                  exitBuyPrice = exitBuyResult.price,
                  exitSellPrice = exitSellResult.price,
                  exitSpreadPct =
                    exitBuyPrice > 0
                      ? (exitSellPrice / exitBuyPrice - 1) * -1 * 100
                      : 0;
                return {
                  ...prevData,
                  entryPercent: entrySpreadPct,
                  exitPercent: exitSpreadPct,
                  entryPrice:
                    entryBuyPrice > 0 ? `$${entryBuyPrice.toFixed(4)}` : "-",
                  exitPrice:
                    exitSellPrice > 0 ? `$${exitSellPrice.toFixed(4)}` : "-",
                  entryPriceBuy:
                    entryBuyPrice > 0 ? `$${entryBuyPrice.toFixed(4)}` : "-",
                  entryPriceSell:
                    entrySellPrice > 0 ? `$${entrySellPrice.toFixed(4)}` : "-",
                  exitPriceSpot:
                    exitBuyPrice > 0 ? `$${exitBuyPrice.toFixed(4)}` : "-",
                  exitPriceFuture:
                    exitSellPrice > 0 ? `$${exitSellPrice.toFixed(4)}` : "-",
                  entryLiquidity: entryBuyResult.liquidity,
                  exitLiquidity: Math.min(
                    exitBuyResult.liquidity,
                    exitSellResult.liquidity,
                  ),
                  liquidity: `$${Math.min(exitBuyResult.liquidity, exitSellResult.liquidity).toFixed(0)}`,
                  lastUpdated: Date.now(),
                };
              });
            } catch {
              setConnectionStatus("error");
            }
          }),
          (socket.onerror = () => setConnectionStatus("error")),
          (socket.onclose = () => setConnectionStatus("idle")),
          () => {
            socket.close();
            websocketRef.current = null;
            setConnectionStatus("idle");
          }
        );
      }, [
        seedCard?.id,
        seedCard?.symbol,
        seedCard?.buyExchange,
        seedCard?.sellExchange,
        seedCard?.buyMarket,
        seedCard?.sellMarket,
      ]),
      {
        data: liveData,
        status: connectionStatus,
        minLiquidity: minLiquidity,
        setMinLiquidity: setMinLiquidity,
      }
    )
  );
}

// ---------------------------------------------------------------------------
//  PiP Window Content Component (rendered inside Picture-in-Picture window)
// ---------------------------------------------------------------------------

function PiPWindowContent({ seed: seedCard }) {
  const {
    data: liveData,
    status: connectionStatus,
    minLiquidity: minLiquidity,
    setMinLiquidity: setMinLiquidity,
  } = useCompareWebSocket(seedCard);
  if (!liveData) return null;
  const isEntryPositive = liveData.entryPercent >= 0,
    isExitPositive = liveData.exitPercent >= 0,
    formatPercent = (percentValue) =>
      `${percentValue > 0 ? "+" : ""}${percentValue.toFixed(2)}%`,
    statusDotColor =
      connectionStatus === "open"
        ? "bg-emerald-500"
        : connectionStatus === "connecting"
          ? "bg-amber-400"
          : connectionStatus === "error"
            ? "bg-red-500"
            : "bg-gray-300",
    statusLabel =
      connectionStatus === "open"
        ? "ao vivo"
        : connectionStatus === "connecting"
          ? "conectando"
          : "offline";
  return e.jsxs("div", {
    className:
      "flex flex-col h-full bg-white dark:bg-dark-800 overflow-hidden text-[11px] rounded-xl shadow-sm border border-gray-200 dark:border-dark-700",
    children: [
      e.jsxs("div", {
        className:
          "px-2 py-1.5 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between bg-gray-50 dark:bg-dark-900/50",
        children: [
          e.jsx("span", {
            className: "font-bold text-gray-900 dark:text-dark-50 truncate",
            children: liveData.symbol,
          }),
          e.jsxs("span", {
            className:
              "flex items-center gap-1 text-[9px] text-gray-500 dark:text-dark-400",
            children: [
              e.jsx("span", {
                className: z(
                  "inline-block size-2 rounded-full",
                  statusDotColor,
                ),
              }),
              statusLabel,
            ],
          }),
        ],
      }),
      connectionStatus !== "open" &&
        e.jsx("div", {
          className:
            "px-2 py-1 bg-red-50 text-red-700 text-[10px] border-b border-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/40",
          children:
            "Offline \u2014 reabra o sistema para retomar o monitoramento.",
        }),
      e.jsxs("div", {
        className: "p-1.5 grid grid-cols-2 gap-1.5 flex-1",
        children: [
          e.jsxs("div", {
            className: z(
              "p-1 rounded border text-center flex flex-col justify-center",
              isEntryPositive
                ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-300"
                : "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-300",
            ),
            children: [
              e.jsx("span", {
                className: "text-[8px] uppercase font-bold opacity-70 mb-0.5",
                children: "Entrada",
              }),
              e.jsx("span", {
                className: "text-sm font-bold leading-tight",
                children: formatPercent(liveData.entryPercent),
              }),
            ],
          }),
          e.jsxs("div", {
            className: z(
              "p-1 rounded border text-center flex flex-col justify-center",
              isExitPositive
                ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-300"
                : "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-300",
            ),
            children: [
              e.jsx("span", {
                className: "text-[8px] uppercase font-bold opacity-70 mb-0.5",
                children: "Saida",
              }),
              e.jsx("span", {
                className: "text-sm font-bold leading-tight",
                children: formatPercent(liveData.exitPercent),
              }),
            ],
          }),
        ],
      }),
      e.jsx("div", {
        className: "px-2 pb-1.5",
        children: e.jsxs("div", {
          className:
            "flex items-center gap-1 bg-gray-50 dark:bg-dark-700/50 p-0.5 rounded border border-gray-200 dark:border-dark-600",
          children: [
            e.jsx("span", {
              className: "text-[9px] text-gray-500 dark:text-dark-400 pl-1",
              children: "Liq: $",
            }),
            e.jsx("input", {
              type: "number",
              className:
                "w-full bg-transparent text-[11px] outline-none text-gray-900 dark:text-dark-50 font-medium h-4",
              value: minLiquidity,
              onChange: (event) =>
                setMinLiquidity(Number(event.target.value) || 0),
            }),
          ],
        }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
//  Helpers for normalizing card data before opening exchange/PiP windows
// ---------------------------------------------------------------------------

const normalizeMarketType = (marketType) => {
    return marketType === "future" ? "future" : "spot";
  },
  PIP_DEFAULT_MIN_LIQUIDITY = 50,
  ensurePipMinLiquidity = (value) => {
    return value && value > 0 ? value : PIP_DEFAULT_MIN_LIQUIDITY;
  },
  normalizeExchangeSlug = (exchangeName) => Y(exchangeName),
  normalizeSymbolPair = (rawSymbol) => {
    const symbol = rawSymbol || "";
    return symbol.includes("/")
      ? symbol.toUpperCase()
      : `${symbol.toUpperCase()}/USDT`;
  };

// ---------------------------------------------------------------------------
//  Hook: useExchangePiP - Manages PiP windows and exchange tab opening
// ---------------------------------------------------------------------------

function useExchangePiP() {
  const pipWindowsRef = t.useRef(new Map()),
    reactRootsRef = t.useRef(new Map()),
    isMountedRef = t.useRef(true);

  /* Cleanup all PiP windows on unmount */
  t.useEffect(
    () => () => {
      isMountedRef.current = false;
      pipWindowsRef.current.forEach((pipWindow) => {
        pipWindow.closed || pipWindow.close();
      });
      reactRootsRef.current.forEach((reactRoot) => reactRoot.unmount());
      pipWindowsRef.current.clear();
      reactRootsRef.current.clear();
    },
    [],
  );

  /** Render PiP content into a target window */
  const renderPipContent = t.useCallback((cardData, targetWindow) => {
      const rootElementId = "pip-root";
      let rootElement = targetWindow.document.getElementById(rootElementId);
      rootElement ||
        ((rootElement = targetWindow.document.createElement("div")),
        (rootElement.id = rootElementId),
        (rootElement.style.height = "100%"),
        targetWindow.document.body.appendChild(rootElement));
      let reactRoot = reactRootsRef.current.get(cardData.id);
      reactRoot ||
        ((reactRoot = er.createRoot(rootElement)),
        reactRootsRef.current.set(cardData.id, reactRoot));
      reactRoot.render(
        e.jsx(PiPWindowContent, {
          seed: cardData,
        }),
      );
    }, []),
    /** Close a specific PiP window by card ID */
    closePiPWindow = t.useCallback((cardId) => {
      const pipWindow = pipWindowsRef.current.get(cardId);
      if (pipWindow) {
        (pipWindow.closed || pipWindow.close(),
          pipWindowsRef.current.delete(cardId));
      }
      const reactRoot = reactRootsRef.current.get(cardId);
      if (reactRoot) {
        (reactRoot.unmount(), reactRootsRef.current.delete(cardId));
      }
    }, []),
    /** Open (or focus) a PiP window for the given card data */
    openPipWindow = t.useCallback(
      async (cardData) => {
        const { id: cardId } = cardData,
          existingWindow = pipWindowsRef.current.get(cardId);
        if (existingWindow && !existingWindow.closed) {
          existingWindow.focus();
          renderPipContent(cardData, existingWindow);
          return;
        } else {
          pipWindowsRef.current.delete(cardId);
          reactRootsRef.current.delete(cardId);
        }
        const pipWidth = 250,
          pipHeight = 220,
          screenLeft =
            window.screen.availLeft !== undefined ? window.screen.availLeft : 0,
          screenTop =
            window.screen.availTop !== undefined ? window.screen.availTop : 0,
          cascadeOffset = (pipWindowsRef.current.size % 10) * 20,
          windowLeft =
            screenLeft +
            window.screen.availWidth / 2 -
            pipWidth / 2 +
            cascadeOffset,
          windowTop =
            screenTop +
            window.screen.availHeight * 0.6 -
            pipHeight / 2 +
            cascadeOffset,
          windowName = `TeamOPScannerPiP_${cardId}`;
        let pipWindow = null;
        if (
          pipWindowsRef.current.size === 0 &&
          "documentPictureInPicture" in window &&
          window.documentPictureInPicture
        )
          try {
            pipWindow = await window.documentPictureInPicture.requestWindow({
              width: pipWidth,
              height: pipHeight,
            });
          } catch (error) {
            console.error("Failed to open Document PiP window:", error);
          }
        if (
          (pipWindow ||
            (pipWindow = window.open(
              "",
              windowName,
              `width=${pipWidth},height=${pipHeight},left=${windowLeft},top=${windowTop},alwaysOnTop=yes,menubar=no,toolbar=no,location=no,status=no,resizable=yes`,
            )),
          pipWindow)
        ) {
          /* Copy stylesheets from parent document into PiP window */
          const collectedCssText = Array.from(document.styleSheets).map(
              (styleSheet) => {
                try {
                  return Array.from(styleSheet.cssRules)
                    .map((cssRule) => cssRule.cssText)
                    .join("");
                } catch {
                  return "";
                }
              },
            ).join(`
`),
            styleElement = pipWindow.document.createElement("style");
          styleElement.textContent = collectedCssText;
          pipWindow.document.head.appendChild(styleElement);

          /* Apply dark mode if active */
          if (document.documentElement.classList.contains("dark")) {
            pipWindow.document.documentElement.classList.add("dark");
          }
          pipWindow.document.body.style.margin = "0";
          pipWindow.document.body.style.backgroundColor =
            document.documentElement.classList.contains("dark")
              ? "#111827"
              : "#ffffff";

          /* Cleanup handlers when PiP window closes */
          pipWindow.addEventListener("pagehide", () => {
            const reactRoot = reactRootsRef.current.get(cardId);
            if (reactRoot) {
              (reactRoot.unmount(), reactRootsRef.current.delete(cardId));
            }
            pipWindowsRef.current.delete(cardId);
          });
          pipWindow.onbeforeunload = () => {
            const reactRoot = reactRootsRef.current.get(cardId);
            if (reactRoot) {
              (reactRoot.unmount(), reactRootsRef.current.delete(cardId));
            }
            pipWindowsRef.current.delete(cardId);
          };

          pipWindowsRef.current.set(cardId, pipWindow);
          renderPipContent(cardData, pipWindow);
          pipWindow.focus();
          setTimeout(() => {
            pipWindow.closed || pipWindow.focus();
          }, 50);
        }
      },
      [renderPipContent],
    );

  return {
    handleOpenExchanges: t.useCallback(
      async (cardData, options) => {
        const normalizedCard = {
            ...cardData,
            symbol: normalizeSymbolPair(cardData.symbol),
            buyExchange: normalizeExchangeSlug(cardData.buyExchange),
            sellExchange: normalizeExchangeSlug(cardData.sellExchange),
            buyMarket: normalizeMarketType(cardData.buyMarket),
            sellMarket: normalizeMarketType(cardData.sellMarket),
            createdAt: cardData.createdAt ?? Date.now(),
            minLiquidity: ensurePipMinLiquidity(cardData.minLiquidity),
          },
          baseAsset = normalizedCard.symbol.split("/")[0],
          buyExchangeUrl = Ae(
            baseAsset,
            normalizedCard.buyExchange,
            normalizedCard.buyMarket || "spot",
          ),
          sellExchangeUrl = Ae(
            baseAsset,
            normalizedCard.sellExchange,
            normalizedCard.sellMarket || "spot",
          ),
          hasBothUrls = !!(buyExchangeUrl && sellExchangeUrl);

        /* Open exchange tabs side-by-side */
        if (!options?.skipExchanges)
          if (hasBothUrls) {
            const screenLeft = window.screen.availLeft || 0,
              screenTop = window.screen.availTop || 0,
              halfScreenWidth = Math.floor(window.screen.availWidth / 2),
              screenHeight = window.screen.availHeight,
              windowFeatures =
                "menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes";
            window.open(
              buyExchangeUrl,
              "_blank",
              `width=${halfScreenWidth},height=${screenHeight},left=${screenLeft},top=${screenTop},${windowFeatures}`,
            );
            window.open(
              sellExchangeUrl,
              "_blank",
              `width=${halfScreenWidth},height=${screenHeight},left=${screenLeft + halfScreenWidth},top=${screenTop},${windowFeatures}`,
            );
          } else {
            if (buyExchangeUrl) {
              window.open(buyExchangeUrl, "_blank");
            }
            if (sellExchangeUrl) {
              window.open(sellExchangeUrl, "_blank");
            }
          }

        /* Open PiP window */
        if (hasBothUrls || options?.skipExchanges) {
          (await openPipWindow(normalizedCard),
            pipWindowsRef.current.get(normalizedCard.id)?.focus(),
            setTimeout(() => {
              const pipWin = pipWindowsRef.current.get(normalizedCard.id);
              if (pipWin && !pipWin.closed) {
                pipWin.focus();
              }
            }, 120));
        }
      },
      [openPipWindow],
    ),
    closePiP: closePiPWindow,
  };
}

// ---------------------------------------------------------------------------
//  Exports (kept exactly as original)
// ---------------------------------------------------------------------------

export {
  DiscordSendConfirmModal as D,
  ChartBarIcon as F,
  HistoryDetailsModal as H,
  ArrowsPointingOutIcon as a,
  useExchangePiP as b,
  walkOrderBook as c,
  DiscordLinkModal as d,
  ChevronDownIcon as e,
  sendTelegramMessage as s,
  useFilterOptions as u,
};
