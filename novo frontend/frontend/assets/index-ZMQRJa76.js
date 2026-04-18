/* ========================================
 * Coins Management Page
 * CRUD de moedas com filtros, pesquisa e modal de edicao
 * ======================================== */

import {
  a as r,
  G as ne,
  h as de,
  j as e,
  T,
  B as z,
  H as Q,
  I as M,
  e as ce,
  x as me,
  y as xe,
  v as k,
  A as ue,
  z as ge,
  w as $,
  S as pe,
  q as he,
} from "./index-Bx06KCE-.js";
import {
  c as fe,
  u as be,
  f as G,
  P as ye,
  a as ke,
} from "./PaginationSection-uLCLiG5r.js";
import { t as j } from "./index-mwGaaYkF.js";
import { P as je } from "./Page-hVEPjFz_.js";
import { b as ve, u as Ne, c as we, d as Ce } from "./coinsApi-BPsBZGFa.js";
import { F as Se } from "./EyeIcon-CCF3MwDA.js";
import { F as Fe } from "./PencilSquareIcon-4O8tAZey.js";
import { a as Te, F as ze } from "./TrashIcon-DZPNpgRn.js";
import { F as Me } from "./XMarkIcon-mqVC0SZA.js";
import { F as $e } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as Ee, a as Re } from "./BarsArrowUpIcon-DltkYWyW.js";
import { K as Ie, O as J } from "./transition-Cxix63ts.js";
import { h as Ae, z as Pe, Q as Be } from "./dialog-DOjFQwF9.js";
import "./use-is-mounted-D7iMJT5-.js";

/* ---- Status Filter Tabs ---- */

const STATUS_FILTER_OPTIONS = [
  {
    id: "all",
    label: "Todas",
  },
  {
    id: "active",
    label: "Ativas",
  },
  {
    id: "inactive",
    label: "Inativas",
  },
];

/* ---- Coins Page Component ---- */

function Ye() {
  const [coins, setCoins] = r.useState([]),
    [totalCount, setTotalCount] = r.useState(0),
    [isLoading, setIsLoading] = r.useState(!0),
    [searchInput, setSearchInput] = r.useState(""),
    [debouncedSearch, setDebouncedSearch] = r.useState(""),
    [activeStatusFilter, setActiveStatusFilter] = r.useState("all"),
    [sorting, setSorting] = r.useState([]),
    [pagination, setPagination] = r.useState({
      pageIndex: 0,
      pageSize: 10,
    }),
    [isModalOpen, setIsModalOpen] = r.useState(!1),
    [editingCoin, setEditingCoin] = r.useState(null),
    [formData, setFormData] = r.useState({
      coin: "",
      apelido: "",
      status: !0,
    }),
    [isSaving, setIsSaving] = r.useState(!1),
    [deletingCoinId, setDeletingCoinId] = r.useState(null),
    navigate = ne(),
    { user: currentUser } = de(),

    /* ---- Permission Check ---- */

    isAdmin = r.useMemo(() => {
      const userRoles = currentUser?.roles || [],
        userPermissions = currentUser?.permissions || [];
      return userRoles.includes("admin") || userPermissions.includes("admin");
    }, [currentUser]),

    activeFilterOption = STATUS_FILTER_OPTIONS.find((props) => props.id === activeStatusFilter) ?? STATUS_FILTER_OPTIONS[0],
    hasActiveFilters = !!searchInput.trim() || activeStatusFilter !== "all",
    filterDescription = searchInput.trim()
      ? `Filtrando por "${searchInput.trim()}"`
      : activeStatusFilter !== "all"
        ? `Exibindo ${activeFilterOption.label.toLowerCase()}`
        : "Todas as moedas cadastradas";

  /* Debounce search input */
  r.useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  /* Reset page index on filter change */
  r.useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [debouncedSearch, activeStatusFilter]);

  /* ---- Fetch Coins ---- */

  const loadCoins = r.useCallback(async () => {
    setIsLoading(!0);
    try {
      const response = await ve({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch,
        status: activeStatusFilter === "all" ? void 0 : activeStatusFilter === "active",
        sort_by: sorting[0]?.id,
        sort_dir: sorting[0]?.desc ? "desc" : "asc",
      });
      setCoins(response.data);
      setTotalCount(response.meta.total);
    } catch (error) {
      console.error(error);
      j.error(error.message || "Erro ao carregar moedas.");
    } finally {
      setIsLoading(!1);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch, activeStatusFilter, sorting]);

  r.useEffect(() => {
    loadCoins();
  }, [loadCoins]);

  /* ---- Action Handlers ---- */

  const clearFilters = () => {
      setSearchInput("");
      setActiveStatusFilter("all");
      setPagination((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    },
    openCreateModal = () => {
      setEditingCoin(null);
      setFormData({
        coin: "",
        apelido: "",
        status: !0,
      });
      setIsModalOpen(!0);
    },
    openEditModal = r.useCallback((coinRow) => {
      setEditingCoin(coinRow);
      setFormData({
        coin: coinRow.coin || "",
        apelido: coinRow.apelido || "",
        status: coinRow.status !== !1,
      });
      setIsModalOpen(!0);
    }, []),
    handleFormSubmit = async (event) => {
      event.preventDefault();
      const coinCode = formData.coin.trim().toUpperCase();
      if (!coinCode) {
        j.error("O codigo da moeda e obrigatorio.");
        return;
      }
      const payload = {
        coin: coinCode,
        apelido: formData.apelido.trim() || void 0,
        status: formData.status,
      };
      setIsSaving(!0);
      const apiPromise = editingCoin ? Ne(editingCoin.id, payload) : we(payload);
      try {
        await j.promise(apiPromise, {
          loading: editingCoin ? "Atualizando moeda..." : "Criando moeda...",
          success: () => (
            loadCoins(),
            setIsModalOpen(!1),
            editingCoin ? "Moeda atualizada!" : "Moeda criada com sucesso!"
          ),
          error: (err) => err?.message || "Erro ao salvar moeda.",
        });
      } finally {
        setIsSaving(!1);
      }
    },
    handleDeleteCoin = async (coinId) => {
      if (confirm("Tem certeza que deseja excluir esta moeda?")) {
        setDeletingCoinId(coinId);
        try {
          await j.promise(Ce(coinId), {
            loading: "Excluindo...",
            success: () => (loadCoins(), "Moeda excluida."),
            error: (err) => err?.message || "Erro ao excluir moeda.",
          });
        } catch {
        } finally {
          setDeletingCoinId(null);
        }
      }
    },
    navigateToTradingView = r.useCallback(
      (props) => {
        const coinSlug = props.coin?.toUpperCase() || props.id;
        navigate(`/dashboards/coins/${encodeURIComponent(coinSlug)}`);
      },
      [navigate],
    ),

    /* ---- Table Configuration ---- */

    columnHelper = fe(),
    columns = r.useMemo(() => {
      const columnDefs = [
        columnHelper.accessor("coin", {
          header: "Moeda",
          cell: (cellCtx) =>
            e.jsx("div", {
              className: "flex items-center gap-3",
              children: e.jsx(T, {
                color: "primary",
                variant: "filled",
                className: "uppercase",
                children: cellCtx.getValue(),
              }),
            }),
        }),
        columnHelper.display({
          id: "exchanges",
          header: "Exchanges",
          cell: (cellCtx) => {
            const tickerExchanges = Array.from(
                new Set(
                  (cellCtx.row.original.tickers || [])
                    .map((item) => item.exchange_name || item.exchange_slug)
                    .filter(Boolean),
                ),
              ),
              csvExchanges =
                cellCtx.row.original.exchanges
                  ?.split(",")
                  .map((item) => item.trim())
                  .filter(Boolean) || [],
              allExchanges = tickerExchanges.length > 0 ? tickerExchanges : csvExchanges;
            if (!allExchanges.length)
              return e.jsx("span", {
                className: "text-xs text-gray-400 dark:text-dark-400",
                children: "--",
              });
            const visibleExchanges = allExchanges.slice(0, 6),
              overflowCount = allExchanges.length - visibleExchanges.length;
            return e.jsxs("div", {
              className: "flex flex-wrap gap-1",
              children: [
                visibleExchanges.map((item) =>
                  e.jsx(
                    T,
                    {
                      variant: "soft",
                      color: "neutral",
                      className: "text-[11px]",
                      children: item,
                    },
                    item,
                  ),
                ),
                overflowCount > 0 &&
                  e.jsxs(T, {
                    variant: "filled",
                    color: "primary",
                    className: "text-[11px]",
                    children: ["+", overflowCount],
                  }),
              ],
            });
          },
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: (cellCtx) => {
            const isActive = !!cellCtx.getValue();
            return e.jsx("span", {
              className: `text-sm dark:bg-dark-700/40 px-2 py-1 rounded-full font-semibold ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-dark-300"}`,
              children: isActive ? "Ativa" : "Inativa",
            });
          },
        }),
      ];
      return (
        columnDefs.push(
          columnHelper.display({
            id: "actions",
            header: () =>
              e.jsx("div", {
                className: "text-center",
                children: "Acoes",
              }),
            cell: (cellCtx) =>
              e.jsxs("div", {
                className: "flex justify-center gap-2",
                children: [
                  e.jsx("button", {
                    onClick: () => navigateToTradingView(cellCtx.row.original),
                    className:
                      "rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-dark-700 dark:hover:text-blue-300",
                    title: "Visualizar trading",
                    children: e.jsx(Se, {
                      className: "size-4",
                    }),
                  }),
                  isAdmin &&
                    e.jsxs(e.Fragment, {
                      children: [
                        e.jsx("button", {
                          onClick: () => openEditModal(cellCtx.row.original),
                          className:
                            "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400",
                          title: "Editar",
                          children: e.jsx(Fe, {
                            className: "size-4",
                          }),
                        }),
                        e.jsx("button", {
                          onClick: () => handleDeleteCoin(cellCtx.row.original.id),
                          className:
                            "rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400",
                          title: "Excluir",
                          disabled: deletingCoinId === cellCtx.row.original.id,
                          children: e.jsx(Te, {
                            className: "size-4",
                          }),
                        }),
                      ],
                    }),
                ],
              }),
          }),
        ),
        columnDefs
      );
    }, [openEditModal, navigateToTradingView, isAdmin, deletingCoinId]),

    table = be({
      data: coins,
      columns: columns,
      state: {
        sorting: sorting,
        pagination: pagination,
      },
      manualPagination: !0,
      manualSorting: !0,
      pageCount: Math.ceil(totalCount / pagination.pageSize),
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
      getCoreRowModel: ke(),
      meta: {
        totalRowCount: totalCount,
      },
    });

  /* ---- Render ---- */

  return e.jsx(je, {
    title: "Moedas",
    children: e.jsxs("div", {
      className:
        "transition-content w-full px-(--margin-x) pb-10 pt-5 lg:pt-6 space-y-6",
      children: [
        /* Page Header */
        e.jsx("div", {
          className: "space-y-4",
          children: e.jsxs("div", {
            className:
              "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
            children: [
              e.jsxs("div", {
                className: "flex flex-col gap-1",
                children: [
                  e.jsx("div", {
                    className: "flex items-center gap-3",
                    children: e.jsx("h1", {
                      className:
                        "text-2xl font-bold text-gray-900 dark:text-dark-50",
                      children: "Moedas",
                    }),
                  }),
                  e.jsx("p", {
                    className: "text-sm text-gray-500 dark:text-dark-300",
                    children:
                      "Pesquise por moeda ou exchange para encontrar as informacoes disponiveis.",
                  }),
                ],
              }),
              e.jsx("div", {
                className: "flex flex-col gap-2 sm:flex-row sm:items-center",
                children:
                  isAdmin &&
                  e.jsxs(z, {
                    variant: "soft",
                    color: "primary",
                    className: "gap-2 px-4 py-2 text-sm font-semibold",
                    onClick: openCreateModal,
                    children: [
                      e.jsx(ze, {
                        className: "size-5",
                      }),
                      "Nova Moeda",
                    ],
                  }),
              }),
            ],
          }),
        }),

        /* Search & Filter Card */
        e.jsxs(Q, {
          className:
            "space-y-4 rounded-2xl border border-gray-200 bg-white/70 px-5 py-5 shadow-sm dark:border-dark-700 dark:bg-dark-800/70",
          children: [
            e.jsxs("div", {
              className: "flex flex-col gap-4 lg:flex-row lg:items-end",
              children: [
                e.jsx("div", {
                  className: "flex-1 space-y-2",
                  children: e.jsx(M, {
                    placeholder: "Pesquisar moeda ou exchange ...",
                    value: searchInput,
                    onChange: (event) => setSearchInput(event.target.value),
                    prefix: e.jsx($e, {
                      className: "size-5 text-gray-400",
                    }),
                    suffix: searchInput
                      ? e.jsx("button", {
                          type: "button",
                          onClick: () => setSearchInput(""),
                          className:
                            "flex h-full items-center justify-center rounded-full text-gray-400 transition hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200",
                          children: e.jsx(Me, {
                            className: "size-4",
                          }),
                        })
                      : void 0,
                    className:
                      "rounded-2xl border-gray-200 bg-white dark:bg-dark-900",
                  }),
                }),
                /* Status Filter Buttons */
                e.jsx("div", {
                  className: "flex flex-wrap items-center gap-2",
                  children: STATUS_FILTER_OPTIONS.map((props) =>
                    e.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setActiveStatusFilter(props.id),
                        className: ce(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none",
                          activeStatusFilter === props.id
                            ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:border-primary-400 dark:bg-primary-500/15 dark:text-primary-300"
                            : "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-dark-600 dark:bg-dark-700/60 dark:text-dark-300 dark:hover:bg-dark-600/60",
                        ),
                        children: props.label,
                      },
                      props.id,
                    ),
                  ),
                }),
              ],
            }),
            /* Filter Summary */
            e.jsxs("div", {
              className:
                "flex items-center justify-between text-xs text-gray-500 dark:text-dark-400",
              children: [
                e.jsxs("span", {
                  className: "font-medium text-gray-700 dark:text-dark-200",
                  children: [
                    totalCount,
                    " moedas encontradas",
                    activeStatusFilter !== "all" ? ` (${activeFilterOption.label})` : "",
                  ],
                }),
                hasActiveFilters &&
                  e.jsx("button", {
                    type: "button",
                    onClick: clearFilters,
                    className: "text-primary-500 hover:underline",
                    children: "Limpar filtros",
                  }),
              ],
            }),
          ],
        }),

        /* Data Table Card */
        e.jsxs(Q, {
          className:
            "overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-700",
          children: [
            /* Table Header Info */
            e.jsx("div", {
              className:
                "border-b border-gray-100 px-6 py-4 dark:border-dark-700",
              children: e.jsxs("div", {
                className:
                  "flex flex-col gap-2 md:flex-row md:items-center md:justify-between",
                children: [
                  e.jsxs("div", {
                    children: [
                      e.jsx("h2", {
                        className:
                          "text-lg font-semibold text-gray-900 dark:text-dark-50",
                        children: "Moedas registradas",
                      }),
                      e.jsx("p", {
                        className: "text-xs text-gray-500 dark:text-dark-400",
                        children: filterDescription,
                      }),
                    ],
                  }),
                  e.jsxs("span", {
                    className:
                      "text-sm font-semibold text-gray-700 dark:text-dark-200",
                    children: [totalCount, " Total"],
                  }),
                ],
              }),
            }),

            /* Table Body */
            e.jsx("div", {
              className: "overflow-x-auto",
              children: e.jsxs(me, {
                className: "w-full",
                children: [
                  /* Table Header */
                  e.jsx(xe, {
                    children: table.getHeaderGroups().map((props) =>
                      e.jsx(
                        k,
                        {
                          children: props.headers.map((props) =>
                            e.jsx(
                              ue,
                              {
                                className: `cursor-pointer select-none px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200 ${props.id === "actions" ? "w-[1%] whitespace-nowrap" : ""}`,
                                onClick: props.column.getToggleSortingHandler(),
                                children: e.jsxs("div", {
                                  className: `flex items-center gap-2 ${props.id === "actions" ? "justify-center" : ""}`,
                                  children: [
                                    G(
                                      props.column.columnDef.header,
                                      props.getContext(),
                                    ),
                                    {
                                      asc: e.jsx(Re, {
                                        className: "size-3",
                                      }),
                                      desc: e.jsx(Ee, {
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
                  /* Table Rows */
                  e.jsxs(ge, {
                    children: [
                      isLoading
                        ? Array.from({
                            length: 6,
                          }).map((item, index) =>
                            e.jsx(
                              k,
                              {
                                className:
                                  "border-b border-gray-100 dark:border-dark-700",
                                children: columns.map((item, index) =>
                                  e.jsx(
                                    $,
                                    {
                                      className: `px-6 py-4 ${item.id === "actions" ? "w-[1%] whitespace-nowrap" : ""}`,
                                      children: e.jsx(pe, {
                                        className: `h-4 ${item.id === "actions" ? "w-16" : "w-full max-w-[180px]"}`,
                                      }),
                                    },
                                    `skeleton-cell-${index}-${index}`,
                                  ),
                                ),
                              },
                              `skeleton-${index}`,
                            ),
                          )
                        : table.getRowModel().rows.map((props) =>
                            e.jsx(
                              k,
                              {
                                className:
                                  "group border-b border-gray-100 hover:bg-gray-50/50 dark:border-dark-700 dark:hover:bg-dark-700/30",
                                children: props.getVisibleCells().map((props) =>
                                  e.jsx(
                                    $,
                                    {
                                      className: `px-6 py-4 ${props.column.id === "actions" ? "w-[1%] whitespace-nowrap" : ""}`,
                                      children: G(
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
                      /* Empty State */
                      !isLoading &&
                        table.getRowModel().rows.length === 0 &&
                        e.jsx(k, {
                          children: e.jsx($, {
                            colSpan: columns.length,
                            className:
                              "py-12 text-center text-gray-500 dark:text-dark-400",
                            children: "Nenhuma moeda encontrada.",
                          }),
                        }),
                    ],
                  }),
                ],
              }),
            }),
            /* Pagination */
            e.jsx("div", {
              className: "border-t border-gray-100 p-4 dark:border-dark-700",
              children: e.jsx(ye, {
                table: table,
              }),
            }),
          ],
        }),

        /* ---- Create/Edit Coin Modal ---- */
        e.jsx(Ie, {
          appear: !0,
          show: isModalOpen,
          as: r.Fragment,
          children: e.jsxs(Ae, {
            as: "div",
            className: "relative z-50",
            onClose: () => setIsModalOpen(!1),
            children: [
              /* Backdrop */
              e.jsx(J, {
                as: r.Fragment,
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
              /* Modal Content */
              e.jsx("div", {
                className: "fixed inset-0 overflow-y-auto",
                children: e.jsx("div", {
                  className:
                    "flex min-h-full items-center justify-center p-4 text-center",
                  children: e.jsx(J, {
                    as: r.Fragment,
                    enter: "ease-out duration-300",
                    enterFrom: "opacity-0 scale-95",
                    enterTo: "opacity-100 scale-100",
                    leave: "ease-in duration-200",
                    leaveFrom: "opacity-100 scale-100",
                    leaveTo: "opacity-0 scale-95",
                    children: e.jsxs(Pe, {
                      className:
                        "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                      children: [
                        /* Modal Title */
                        e.jsx("div", {
                          className: "mb-6 flex items-start justify-between",
                          children: e.jsx(Be, {
                            as: "h3",
                            className:
                              "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                            children: editingCoin ? "Editar moeda" : "Nova moeda",
                          }),
                        }),
                        /* Modal Form */
                        e.jsxs("form", {
                          className: "space-y-4",
                          onSubmit: handleFormSubmit,
                          children: [
                            e.jsx(M, {
                              label: "Codigo",
                              placeholder: "Ex: BTC",
                              value: formData.coin,
                              onChange: (event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  coin: event.target.value.toUpperCase(),
                                })),
                              required: !0,
                            }),
                            e.jsx(M, {
                              label: "Apelido",
                              placeholder: "Nome amigavel",
                              value: formData.apelido,
                              onChange: (event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  apelido: event.target.value,
                                })),
                            }),
                            /* Status Toggle */
                            e.jsxs("div", {
                              className:
                                "flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-dark-700 dark:bg-dark-700/50",
                              children: [
                                e.jsxs("div", {
                                  children: [
                                    e.jsx("p", {
                                      className:
                                        "text-sm font-medium text-gray-900 dark:text-dark-50",
                                      children: "Status",
                                    }),
                                    e.jsx("p", {
                                      className:
                                        "text-xs text-gray-500 dark:text-dark-300",
                                      children:
                                        "Controle se a moeda fica disponivel nas telas.",
                                    }),
                                  ],
                                }),
                                e.jsx(he, {
                                  checked: formData.status,
                                  onChange: (event) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      status: event.target.checked,
                                    })),
                                }),
                              ],
                            }),
                            /* Modal Actions */
                            e.jsxs("div", {
                              className: "mt-6 flex justify-end gap-3",
                              children: [
                                e.jsx(z, {
                                  type: "button",
                                  variant: "soft",
                                  color: "neutral",
                                  onClick: () => setIsModalOpen(!1),
                                  children: "Cancelar",
                                }),
                                e.jsx(z, {
                                  type: "submit",
                                  color: "primary",
                                  disabled: isSaving,
                                  className: "min-w-[120px]",
                                  children: isSaving
                                    ? "Salvando..."
                                    : editingCoin
                                      ? "Salvar alteracoes"
                                      : "Criar moeda",
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
        }),
      ],
    }),
  });
}
export { Ye as default };
