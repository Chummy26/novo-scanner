/* ========================================
 * Operations Page
 * Listagem paginada de operacoes com pesquisa local
 * ======================================== */

import {
  a as l,
  j as t,
  T as V,
  B as G,
  x as J,
  y as K,
  v as N,
  A as Q,
  z as W,
  w,
  S as X,
} from "./index-Bx06KCE-.js";
import {
  c as Y,
  u as Z,
  f as C,
  P as ee,
  g as te,
  a as re,
} from "./PaginationSection-uLCLiG5r.js";
import { t as ae } from "./index-mwGaaYkF.js";
import { P as se } from "./Page-hVEPjFz_.js";
import { F as oe } from "./ClockIcon-c5Zk21LG.js";
import { F as ne } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as ie } from "./ArrowPathIcon-Ek2z4Juv.js";
import { F as ce, a as le } from "./BarsArrowUpIcon-DltkYWyW.js";

/* ---- Finance API Client ---- */

const API_BASE_URL = "http://localhost:8000".replace(/\/$/, ""),
  buildAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    };
  };

async function apiFetch(endpoint, options) {
  if (!API_BASE_URL) throw new Error("Finance API base URL is not configured.");
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...buildAuthHeaders(),
      },
    }),
    rawText = await response.text();
  let parsedBody = rawText;
  try {
    parsedBody = rawText ? JSON.parse(rawText) : null;
  } catch {}
  if (!response.ok) {
    const errorMessage =
        (parsedBody &&
          typeof parsedBody == "object" &&
          ("message" in parsedBody ? parsedBody.message : "error" in parsedBody ? parsedBody.error : null)) ||
        rawText ||
        "Request failed",
      error = new Error(typeof errorMessage == "string" ? errorMessage : "Request failed");
    throw ((error.status = response.status), error);
  }
  return parsedBody ?? {};
}

/* ---- Response Parsing Helpers ---- */

const extractItemsArray = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData && typeof responseData == "object") {
      const knownKeys = ["items", "data", "operations", "operacoes"];
      for (const key of knownKeys) {
        const value = responseData[key];
        if (Array.isArray(value)) return value;
        if (value && typeof value == "object") {
          const nestedItems = value.items;
          if (Array.isArray(nestedItems)) return nestedItems;
        }
      }
    }
    return [];
  },
  OPERATIONS_ENDPOINT = "/finance/operations",
  parseFiniteNumber = (value) => {
    if (typeof value == "number" && Number.isFinite(value)) return value;
    if (typeof value == "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  },
  extractPaginationMeta = (responseData) => {
    if (!responseData || typeof responseData != "object") return {};
    const data = responseData,
      metaSource =
        (data.meta && typeof data.meta == "object" ? data.meta : null) ||
        (data.pagination && typeof data.pagination == "object"
          ? data.pagination
          : null) ||
        (data.page && typeof data.page == "object" ? data.page : null) ||
        null,
      totalCount =
        parseFiniteNumber(data.total) ??
        parseFiniteNumber(data.count) ??
        parseFiniteNumber(data.total_items) ??
        parseFiniteNumber(data.totalRows) ??
        parseFiniteNumber(metaSource?.total) ??
        parseFiniteNumber(metaSource?.count) ??
        parseFiniteNumber(metaSource?.total_items) ??
        parseFiniteNumber(metaSource?.totalRows),
      pageLimit = parseFiniteNumber(data.limit) ?? parseFiniteNumber(data.pageSize) ?? parseFiniteNumber(metaSource?.limit) ?? parseFiniteNumber(metaSource?.pageSize),
      pageOffset = parseFiniteNumber(data.offset) ?? parseFiniteNumber(metaSource?.offset) ?? parseFiniteNumber(metaSource?.skip);
    return {
      total: typeof totalCount == "number" && totalCount >= 0 ? totalCount : void 0,
      limit: typeof pageLimit == "number" && pageLimit >= 0 ? pageLimit : void 0,
      offset: typeof pageOffset == "number" && pageOffset >= 0 ? pageOffset : void 0,
    };
  };

/* ---- Fetch Operations ---- */

async function fetchOperations(params) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit == "number" && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(params.limit));
  }
  if (typeof params?.offset == "number" && Number.isFinite(params.offset)) {
    searchParams.set("offset", String(params.offset));
  }
  const url = searchParams.toString() ? `${OPERATIONS_ENDPOINT}?${searchParams.toString()}` : OPERATIONS_ENDPOINT,
    responseData = await apiFetch(url),
    items = extractItemsArray(responseData),
    serverMeta =
      responseData && typeof responseData == "object"
        ? (() => {
            const message = responseData.message || responseData.msg,
              status = responseData.status;
            return {
              message: typeof message == "string" ? message : void 0,
              status: typeof status == "string" ? status : void 0,
            };
          })()
        : {};
  return {
    items: items,
    ...serverMeta,
    ...extractPaginationMeta(responseData),
  };
}

/* ---- Formatting Helpers ---- */

const columnHelper = Y(),
  formatNumber = (value, decimals = 2) => {
    return typeof value != "number" || Number.isNaN(value)
      ? "--"
      : value.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  },
  formatPercent = (value) => {
    return typeof value != "number" || Number.isNaN(value)
      ? "--"
      : `${(value * 100).toFixed(2)}%`;
  },
  formatTimestamp = (value) => {
    if (value == null) return "--";
    const numericValue = typeof value == "string" ? Number(value) : value;
    if (typeof numericValue == "number" && Number.isFinite(numericValue)) {
      const milliseconds = numericValue > 1e12 ? numericValue : numericValue * 1e3,
        date = new Date(milliseconds);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    }
    const dateFromRaw = new Date(value);
    return Number.isNaN(dateFromRaw.getTime()) ? "--" : dateFromRaw.toLocaleString();
  },
  toSortableTimestamp = (value) => {
    if (value == null) return 0;
    const numericValue = typeof value == "string" ? Number(value) : value;
    if (typeof numericValue == "number" && Number.isFinite(numericValue))
      return numericValue > 1e12 ? numericValue : numericValue * 1e3;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

/* ---- Operations Page Component ---- */

function Se() {
  const [operations, setOperations] = l.useState([]),
    [isInitialLoad, setIsInitialLoad] = l.useState(!0),
    [isRefreshing, setIsRefreshing] = l.useState(!1),
    [searchQuery, setSearchQuery] = l.useState(""),
    [serverMessage, setServerMessage] = l.useState(),
    [serverStatus, setServerStatus] = l.useState(),
    [sorting, setSorting] = l.useState([]),
    [pagination, setPagination] = l.useState({
      pageIndex: 0,
      pageSize: 20,
    }),
    [totalCount, setTotalCount] = l.useState(),
    fetchGeneration = l.useRef(0),
    loadOperations = l.useCallback(async () => {
      const limit = pagination.pageSize,
        offset = pagination.pageIndex * pagination.pageSize,
        currentGeneration = (fetchGeneration.current += 1);
      setIsRefreshing(!0);
      try {
        const {
          items: fetchedItems,
          message: responseMessage,
          status: responseStatus,
          total: responseTotal,
        } = await fetchOperations({
          limit: limit,
          offset: offset,
        });
        if (currentGeneration !== fetchGeneration.current) return;
        setOperations(fetchedItems);
        setServerMessage(responseMessage);
        setServerStatus(responseStatus);
        setTotalCount(typeof responseTotal == "number" && Number.isFinite(responseTotal) ? responseTotal : void 0);
      } catch (error) {
        if (currentGeneration !== fetchGeneration.current) return;
        console.error(error);
        ae.error(error?.message || "Erro ao carregar operacoes.");
      } finally {
        if (currentGeneration === fetchGeneration.current) {
          (setIsInitialLoad(!1), setIsRefreshing(!1));
        }
      }
    }, [pagination.pageIndex, pagination.pageSize]);

  /* Auto-reload on pagination change */
  l.useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  /* ---- Filtered & Computed Data ---- */

  const filteredOperations = l.useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      return query
        ? operations.filter((props) =>
            [
              props.par,
              props.exchange,
              props.tipo,
              props.market_type,
              props.username,
              props.name,
            ]
              .filter(Boolean)
              .map((item) => item.toString().toLowerCase())
              .some((item) => item.includes(query)),
          )
        : operations;
    }, [operations, searchQuery]),
    derivedTotalCount = l.useMemo(
      () =>
        typeof totalCount == "number" && Number.isFinite(totalCount)
          ? totalCount
          : pagination.pageIndex * pagination.pageSize + operations.length,
      [operations.length, pagination.pageIndex, pagination.pageSize, totalCount],
    ),
    computedPageCount = l.useMemo(
      () =>
        typeof totalCount == "number" && Number.isFinite(totalCount)
          ? Math.max(1, Math.ceil(totalCount / (pagination.pageSize || 1)))
          : operations.length < pagination.pageSize
            ? Math.max(1, pagination.pageIndex + 1)
            : Math.max(1, pagination.pageIndex + 2),
      [operations.length, pagination.pageIndex, pagination.pageSize, totalCount],
    ),

    /* ---- Column Definitions ---- */

    columns = l.useMemo(
      () => [
        columnHelper.accessor("par", {
          header: "Par / Tipo",
          cell: (cellCtx) => {
            const row = cellCtx.row.original,
              operationType = row.tipo
                ? row.tipo.toLowerCase() === "buy"
                  ? "abertura"
                  : "fechamento"
                : "-";
            return t.jsxs("div", {
              className: "flex flex-col",
              children: [
                t.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    t.jsx(V, {
                      component: "span",
                      color: row.tipo === "buy" ? "success" : "error",
                      variant: "soft",
                      className: "text-xs font-semibold uppercase",
                      children: operationType,
                    }),
                    t.jsx("span", {
                      className:
                        "font-semibold text-gray-900 dark:text-dark-50",
                      children: row.par,
                    }),
                  ],
                }),
                t.jsxs("p", {
                  className: "mt-1 text-xs text-gray-500 dark:text-dark-400",
                  children: ["Mercado: ", row.market_type || "n/d"],
                }),
              ],
            });
          },
        }),
        columnHelper.accessor("exchange", {
          header: "Exchange",
          cell: (cellCtx) => {
            const row = cellCtx.row.original;
            return t.jsx("div", {
              className: "flex flex-col",
              children: t.jsx("span", {
                className:
                  "font-semibold text-gray-900 dark:text-dark-50 uppercase",
                children: row.exchange || "--",
              }),
            });
          },
        }),
        columnHelper.accessor("quantidade", {
          header: "Quantidade",
          cell: (cellCtx) =>
            t.jsx("p", {
              className: "font-semibold text-gray-900 dark:text-dark-50",
              children: formatNumber(cellCtx.getValue(), 4),
            }),
        }),
        columnHelper.accessor((row) => row.spread ?? 0, {
          id: "spread",
          header: "Spread Real / Gatilho / Slippage",
          cell: (cellCtx) => {
            const row = cellCtx.row.original;
            return t.jsxs("div", {
              className: "flex flex-col gap-1",
              children: [
                t.jsxs("span", {
                  className: "font-semibold text-gray-900 dark:text-dark-50",
                  children: [
                    t.jsxs("span", {
                      className: "text-emerald-500 dark:text-emerald-500",
                      children: [formatPercent(row.spread_real ?? 0), "  "],
                    }),
                    " | ",
                    formatPercent(row.spread ?? 0),
                    " | ",
                    formatPercent((row.spread_real ?? 0) - (row.spread ?? 0)),
                  ],
                }),
                t.jsx("span", {
                  className:
                    "text-xs font-medium text-gray-700 dark:text-dark-200",
                }),
                t.jsxs("span", {
                  className: "text-xs text-gray-500 dark:text-dark-400",
                  children: ["Liquidez: ", formatNumber(row.liquidez, 0)],
                }),
              ],
            });
          },
        }),
        columnHelper.accessor((row) => toSortableTimestamp(row.data_hora), {
          id: "execucao",
          header: "Execucao",
          sortingFn: (rowA, rowB) =>
            toSortableTimestamp(rowA.original.data_hora) - toSortableTimestamp(rowB.original.data_hora),
          cell: (cellCtx) => {
            const row = cellCtx.row.original;
            return t.jsxs("div", {
              className: "flex flex-col",
              children: [
                t.jsx("span", {
                  className: "font-semibold text-gray-900 dark:text-dark-50",
                  children: formatTimestamp(row.data_hora),
                }),
                t.jsxs("span", {
                  className: "text-xs text-gray-500 dark:text-dark-400",
                  children: ["Criado: ", formatTimestamp(row.created_at)],
                }),
              ],
            });
          },
        }),
        columnHelper.accessor((props) => props.name || props.username || "", {
          id: "usuario",
          header: "Usuario",
          cell: (cellCtx) => {
            const row = cellCtx.row.original;
            return t.jsx("div", {
              className: "flex flex-col",
              children: t.jsx("span", {
                className: "font-semibold text-gray-900 dark:text-dark-50",
                children: row.name || row.username || "--",
              }),
            });
          },
        }),
      ],
      [],
    ),

    /* ---- Table Instance ---- */

    table = Z({
      data: filteredOperations,
      columns: columns,
      state: {
        sorting: sorting,
        pagination: pagination,
      },
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
      manualPagination: !0,
      pageCount: computedPageCount,
      getCoreRowModel: re(),
      getSortedRowModel: te(),
      meta: {
        totalRowCount: derivedTotalCount,
      },
    });

  /* ---- Render ---- */

  return t.jsx(se, {
    title: "Operacoes",
    children: t.jsxs("div", {
      className:
        "transition-content w-full px-(--margin-x) pb-10 pt-5 lg:pt-6 space-y-6",
      children: [
        /* Page Header */
        t.jsxs("div", {
          className:
            "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          children: [
            t.jsxs("div", {
              className: "space-y-1",
              children: [
                t.jsx("h1", {
                  className:
                    "text-2xl font-bold text-gray-900 dark:text-dark-50",
                  children: "Operacoes",
                }),
                t.jsx("p", {
                  className: "text-sm text-gray-500 dark:text-dark-300",
                  children:
                    "Visualize as operacoes registradas no sistema (restrito a administradores).",
                }),
                serverMessage &&
                  t.jsxs("div", {
                    className:
                      "flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400",
                    children: [
                      t.jsx(oe, {
                        className: "size-4",
                      }),
                      t.jsxs("span", {
                        children: [serverMessage, serverStatus ? ` (${serverStatus})` : ""],
                      }),
                    ],
                  }),
              ],
            }),
            /* Search & Refresh Controls */
            t.jsxs("div", {
              className: "flex items-center gap-3",
              children: [
                t.jsxs("div", {
                  className: "relative",
                  children: [
                    t.jsx(ne, {
                      className:
                        "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400",
                    }),
                    t.jsx("input", {
                      type: "text",
                      placeholder: "Pesquisar nesta pagina...",
                      value: searchQuery,
                      onChange: (event) => setSearchQuery(event.target.value),
                      className:
                        "h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50 sm:w-64",
                    }),
                  ],
                }),
                t.jsxs(G, {
                  variant: "soft",
                  color: "primary",
                  className: "gap-2 h-9 px-4 text-sm font-medium",
                  onClick: loadOperations,
                  disabled: isRefreshing,
                  children: [
                    t.jsx(ie, {
                      className: `size-4 ${isRefreshing ? "animate-spin" : ""}`,
                    }),
                    isRefreshing ? "Atualizando..." : "Atualizar",
                  ],
                }),
              ],
            }),
          ],
        }),

        /* Data Table */
        t.jsxs("div", {
          className:
            "overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700",
          children: [
            t.jsx("div", {
              className: "overflow-x-auto",
              children: t.jsxs(J, {
                className: "w-full",
                children: [
                  /* Table Header */
                  t.jsx(K, {
                    children: table.getHeaderGroups().map((props) =>
                      t.jsx(
                        N,
                        {
                          className:
                            "border-b border-gray-200 dark:border-dark-700",
                          children: props.headers.map((props) =>
                            t.jsx(
                              Q,
                              {
                                className:
                                  "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400 select-none cursor-pointer hover:text-gray-700 dark:hover:text-dark-300",
                                onClick: props.column.getToggleSortingHandler(),
                                children: t.jsxs("div", {
                                  className: "flex items-center gap-2",
                                  children: [
                                    C(
                                      props.column.columnDef.header,
                                      props.getContext(),
                                    ),
                                    {
                                      asc: t.jsx(le, {
                                        className: "size-3",
                                      }),
                                      desc: t.jsx(ce, {
                                        className: "size-3",
                                      }),
                                    }[props.column.getIsSorted()] ?? null,
                                  ],
                                }),
                              },
                              props.id,
                            ),
                          ),
                        },
                        props.id,
                      ),
                    ),
                  }),

                  /* Table Body */
                  t.jsx(W, {
                    children:
                      isInitialLoad || isRefreshing
                        ? Array.from({
                            length: 6,
                          }).map((item, index) =>
                            t.jsx(
                              N,
                              {
                                className:
                                  "border-b border-gray-200 dark:border-dark-700",
                                children: columns.map((item, index) =>
                                  t.jsx(
                                    w,
                                    {
                                      className: "px-4 py-4",
                                      children: t.jsx(X, {
                                        className: "h-4 w-full max-w-[180px]",
                                      }),
                                    },
                                    `operations-skeleton-cell-${index}-${index}`,
                                  ),
                                ),
                              },
                              `operations-skeleton-${index}`,
                            ),
                          )
                        : table.getRowModel().rows.length === 0
                          ? t.jsx(N, {
                              children: t.jsx(w, {
                                colSpan: columns.length,
                                className:
                                  "px-4 py-12 text-center text-gray-500 dark:text-dark-400",
                                children: "Nenhuma operacao encontrada.",
                              }),
                            })
                          : table.getRowModel().rows.map((props) =>
                              t.jsx(
                                N,
                                {
                                  className:
                                    "border-b border-gray-200 hover:bg-gray-50/50 dark:border-dark-700 dark:hover:bg-dark-800/50 transition-colors",
                                  children: props
                                    .getVisibleCells()
                                    .map((props) =>
                                      t.jsx(
                                        w,
                                        {
                                          className:
                                            "px-4 py-4 text-sm text-gray-700 dark:text-dark-200",
                                          children: C(
                                            props.column.columnDef.cell,
                                            props.getContext(),
                                          ),
                                        },
                                        props.id,
                                      ),
                                    ),
                                },
                                props.id,
                              ),
                            ),
                  }),
                ],
              }),
            }),

            /* Pagination Footer */
            derivedTotalCount > 0 &&
              t.jsx("div", {
                className:
                  "border-t border-gray-200 dark:border-dark-700 px-6 py-4",
                children: t.jsx(ee, {
                  table: table,
                }),
              }),
          ],
        }),
      ],
    }),
  });
}
export { Se as default };
