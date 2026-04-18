import {
  h as ve,
  a as s,
  j as e,
  T as ke,
  B as C,
  k as j,
  x as je,
  y as Ne,
  v as P,
  A as we,
  e as H,
  z as Se,
  w as B,
  S as Ce,
} from "./index-Bx06KCE-.js";
import {
  c as Pe,
  u as Te,
  f as te,
  P as Me,
  d as _e,
  g as Ie,
  a as Fe,
} from "./PaginationSection-uLCLiG5r.js";
import { t as y } from "./index-mwGaaYkF.js";
import { P as Re } from "./Page-hVEPjFz_.js";
import { S as se } from "./SearchableSelect-9vRGJJts.js";
import {
  C as Y,
  f as Ee,
  d as De,
  g as Ue,
  b as Oe,
  P as re,
  a as Ae,
  u as Le,
  c as ze,
} from "./paymentsApi-DsZT4bW9.js";
import { j as $e, v as T } from "./authApi-ObFgLF0e.js";
import { a as M } from "./licensesApi-BVBHUoUP.js";
import { F as Ve } from "./PencilSquareIcon-4O8tAZey.js";
import { a as He, F as Be } from "./TrashIcon-DZPNpgRn.js";
import { F as Ye } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as Ke, a as Qe } from "./BarsArrowUpIcon-DltkYWyW.js";
import { F as qe } from "./XMarkIcon-mqVC0SZA.js";
import { K as Ge, O as oe } from "./transition-Cxix63ts.js";
import { h as Je, z as We, Q as Xe } from "./dialog-DOjFQwF9.js";
import "./CheckIcon-WReR5saH.js";
import "./use-is-mounted-D7iMJT5-.js";
const p = Pe(),
  le = () => {
    const r = new Date(),
      n = r.getTimezoneOffset() * 6e4;
    return new Date(r.getTime() - n).toISOString().slice(0, 16);
  },
  ne = () => ({
    userId: "",
    licenseType: M[0]?.value ?? 1,
    amount: "",
    currencyCode: Y[0]?.value ?? "USDT",
    status: "pending",
    paidAt: le(),
    sellerUserId: "",
    paymentMethod: "pix_manual",
    proofHash: "",
    notes: "",
  }),
  Ze = {
    approved_release: "success",
    approved_no_release: "warning",
    pending: "warning",
    canceled: "error",
  },
  ea = (r) => {
    if (!r) return "-";
    const n = new Date(r);
    return Number.isNaN(n.getTime()) ? "-" : n.toLocaleString("pt-BR");
  },
  aa = (r) => {
    if (!r) return "";
    const n = new Date(r);
    if (Number.isNaN(n.getTime())) return "";
    const g = n.getTimezoneOffset() * 6e4;
    return new Date(n.getTime() - g).toISOString().slice(0, 16);
  },
  ta = (r, n) => {
    if (!Number.isFinite(r)) return "-";
    if (!n) return r.toFixed(2);
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: n,
      }).format(r);
    } catch {
      return `${r.toFixed(2)} ${n}`;
    }
  };
function va() {
  const { user: r } = ve(),
    [n, g] = s.useState([]),
    [u, K] = s.useState([]),
    [b, ie] = s.useState([]),
    [de, Q] = s.useState(!0),
    [_, q] = s.useState(!0),
    [ce, me] = s.useState([]),
    [I, G] = s.useState(""),
    [N, J] = s.useState("all"),
    [F, R] = s.useState(!1),
    [d, E] = s.useState(null),
    [o, l] = s.useState(ne()),
    [ue, W] = s.useState(!1),
    D = s.useMemo(
      () =>
        r?.roles?.includes("admin") ||
        r?.permissions?.includes("create:payments") ||
        !1,
      [r],
    ),
    v = s.useMemo(
      () =>
        r?.roles?.includes("admin") ||
        r?.permissions?.includes("update:payments") ||
        !1,
      [r],
    ),
    w = s.useMemo(
      () =>
        r?.roles?.includes("admin") ||
        r?.permissions?.includes("delete:payments") ||
        !1,
      [r],
    ),
    U = s.useCallback(async () => {
      Q(!0);
      try {
        const a = await Ee();
        g(a);
      } catch (a) {
        console.error(a);
        y.error(a.message || "Erro ao carregar pagamentos.");
      } finally {
        Q(!1);
      }
    }, []),
    O = s.useCallback(async () => {
      q(!0);
      try {
        const [a, t, i, c, L] = await Promise.allSettled([
          $e(),
          T({
            role: "admin",
            limit: 200,
          }),
          T({
            permission: "create:payments",
            limit: 200,
          }),
          T({
            permission: "update:payments",
            limit: 200,
          }),
          T({
            permission: "delete:payments",
            limit: 200,
          }),
        ]);
        a.status === "fulfilled"
          ? K(a.value)
          : (console.error(a.reason), K([]));
        const x = new Map();
        t.status === "fulfilled"
          ? t.value.forEach((props) => x.set(props.id, props))
          : console.error(t.reason);
        [i, c, L].forEach((props) => {
          props.status === "fulfilled"
            ? props.value.forEach((props) => x.set(props.id, props))
            : console.error(props.reason);
        });
        ie(Array.from(x.values()));
      } finally {
        q(!1);
      }
    }, []);
  s.useEffect(() => {
    U();
  }, [U]);
  s.useEffect(() => {
    O();
  }, [O]);
  s.useEffect(() => {
    !F ||
      d ||
      l((a) => {
        let t = a;
        return (
          !a.userId &&
            u[0]?.id &&
            (t = {
              ...t,
              userId: u[0].id,
            }),
          !a.sellerUserId &&
            b[0]?.id &&
            (t = {
              ...t,
              sellerUserId: b[0].id,
            }),
          t
        );
      });
  }, [d, F, b, u]);
  const X = s.useMemo(() => new Map(u.map((props) => [props.id, props])), [u]),
    f = s.useCallback((a) => (a ? X.get(a)?.username || a : "-"), [X]),
    xe = s.useMemo(() => {
      const a = u.map((props) => ({
        value: props.id,
        label: props.email
          ? `${props.username} (${props.email})`
          : props.username,
      }));
      return a.length === 0
        ? [
            {
              value: "",
              label: "Nenhum usuário disponível",
              disabled: !0,
            },
          ]
        : a;
    }, [u]),
    pe = s.useMemo(() => {
      const a = b.map((props) => ({
        value: props.id,
        label: props.email
          ? `${props.username} (${props.email})`
          : props.username,
      }));
      return a.length === 0
        ? [
            {
              value: "",
              label: "Nenhum usuário disponível",
              disabled: !0,
            },
          ]
        : a;
    }, [b]),
    ge = s.useMemo(() => {
      const a = I.trim().toLowerCase();
      return n.filter((props) => {
        if (N !== "all" && props.status !== N) return !1;
        if (!a) return !0;
        const i = f(props.seller_user_id).toLowerCase(),
          c = f(props.user_id).toLowerCase();
        return (
          props.id.toLowerCase().includes(a) || i.includes(a) || c.includes(a)
        );
      });
    }, [n, f, I, N]),
    fe = () => {
      if (D) {
        (E(null), l(ne()), R(!0));
      }
    },
    Z = s.useCallback(
      (a) => {
        if (!v) return;
        const t = M.some((props) => props.value === a.licence_type)
          ? a.licence_type
          : (M[0]?.value ?? 1);
        E(a);
        l({
          userId: a.user_id || "",
          licenseType: t,
          amount: String(a.amount ?? ""),
          currencyCode: a.currency_code || (Y[0]?.value ?? "USDT"),
          status: a.status,
          paidAt: aa(a.paid_at),
          sellerUserId: a.seller_user_id || "",
          paymentMethod: a.payment_method || "pix_manual",
          proofHash: a.proof_hash || "",
          notes: a.notes || "",
        });
        R(!0);
      },
      [v],
    ),
    S = () => {
      R(!1);
      E(null);
    },
    ee = s.useCallback(
      (a) => {
        if (w && confirm("Deseja excluir este pagamento?")) {
          y.promise(De(a), {
            loading: "Removendo pagamento...",
            success: () => (
              g((t) => t.filter((props) => props.id !== a)),
              "Pagamento removido."
            ),
            error: (t) => t?.message || "Erro ao remover pagamento.",
          });
        }
      },
      [w],
    ),
    A = s.useMemo(
      () => [
        p.accessor("user_id", {
          header: "Usuário",
          cell: (a) =>
            e.jsx("span", {
              className: "font-medium text-gray-900 dark:text-dark-50",
              children: f(a.getValue()),
            }),
        }),
        p.accessor("amount", {
          header: "Valor",
          cell: (a) =>
            e.jsx("span", {
              className: "text-sm text-gray-500 dark:text-dark-200",
              children: ta(a.row.original.amount, a.row.original.currency_code),
            }),
        }),
        p.accessor("status", {
          header: () =>
            e.jsx("div", {
              className: "text-center",
              children: "Status",
            }),
          cell: (a) => {
            const t = a.getValue();
            return e.jsx(ke, {
              variant: "soft",
              color: Ze[t] || "warning",
              className: "text-xs font-semibold",
              children: Ue(t),
            });
          },
        }),
        p.accessor("paid_at", {
          header: "Pago em",
          cell: (a) =>
            e.jsx("span", {
              className: "text-sm text-gray-500 dark:text-dark-200",
              children: ea(a.getValue()),
            }),
        }),
        p.accessor("seller_user_id", {
          header: "Vendedor",
          cell: (a) =>
            e.jsx("span", {
              className: "text-sm text-gray-500 dark:text-dark-200",
              children: f(a.getValue()),
            }),
        }),
        p.accessor("payment_method", {
          header: "Método",
          cell: (a) =>
            e.jsx("span", {
              className: "text-sm text-gray-500 dark:text-dark-200",
              children: Oe(a.getValue()),
            }),
        }),
        p.display({
          id: "actions",
          header: () =>
            e.jsx("div", {
              className: "text-center",
              children: "Ações",
            }),
          cell: (a) =>
            e.jsxs("div", {
              className: "flex justify-center gap-2",
              children: [
                e.jsx("button", {
                  type: "button",
                  className:
                    "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400",
                  onClick: () => Z(a.row.original),
                  disabled: !v,
                  title: "Editar",
                  children: e.jsx(Ve, {
                    className: "size-4",
                  }),
                }),
                e.jsx("button", {
                  type: "button",
                  className:
                    "rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400",
                  onClick: () => ee(a.row.original.id),
                  disabled: !w,
                  title: "Excluir",
                  children: e.jsx(He, {
                    className: "size-4",
                  }),
                }),
              ],
            }),
        }),
      ],
      [w, v, ee, Z, f],
    ),
    k = Te({
      data: ge,
      columns: A,
      state: {
        sorting: ce,
      },
      onSortingChange: me,
      getCoreRowModel: Fe(),
      getSortedRowModel: Ie(),
      getPaginationRowModel: _e(),
      manualPagination: !1,
    }),
    he = async (event) => {
      if ((event.preventDefault(), d ? !v : !D)) return;
      if (!o.amount.trim()) {
        y.error("Informe o valor.");
        return;
      }
      if (!o.currencyCode.trim()) {
        y.error("Informe a moeda.");
        return;
      }
      if (!o.sellerUserId) {
        y.error("Informe o vendedor.");
        return;
      }
      const t = Number(o.amount),
        i = o.paidAt || le(),
        c = new Date(i),
        L = Number.isNaN(c.getTime()) ? new Date() : c,
        x = {
          amount: t,
          currency_code: o.currencyCode.trim().toUpperCase(),
          licence_type: o.licenseType,
          status: o.status,
          paid_at: L.toISOString(),
          user_id: o.userId || void 0,
          seller_user_id: o.sellerUserId,
          payment_method: o.paymentMethod,
          proof_hash: o.proofHash.trim() || void 0,
          notes: o.notes.trim() || void 0,
        },
        ae = {
          ...x,
        };
      W(!0);
      const m = d ? Le(d.id, x) : ze(x);
      try {
        await y.promise(m, {
          loading: d ? "Atualizando pagamento..." : "Criando pagamento...",
          success: (h) => {
            const z = h;
            return (
              d
                ? g(($) =>
                    $.map((props) =>
                      props.id === d.id
                        ? {
                            ...props,
                            ...ae,
                            ...(z || {}),
                          }
                        : props,
                    ),
                  )
                : z
                  ? g(($) => [z, ...$])
                  : U(),
              O(),
              S(),
              d ? "Pagamento atualizado." : "Pagamento criado."
            );
          },
          error: (h) => h?.message || "Erro ao salvar pagamento.",
        });
      } finally {
        W(!1);
      }
    },
    ye = s.useMemo(
      () => [
        {
          value: "all",
          label: "Todos",
        },
        ...re,
      ],
      [],
    ),
    be = () => {
      G("");
      J("all");
    };
  return e.jsxs(Re, {
    title: "Pagamentos",
    children: [
      e.jsxs("div", {
        className:
          "transition-content w-full px-(--margin-x) pb-10 pt-5 lg:pt-6",
        children: [
          e.jsxs("div", {
            className:
              "mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("h1", {
                    className:
                      "text-2xl font-bold text-gray-900 dark:text-dark-50",
                    children: "Pagamentos",
                  }),
                  e.jsx("p", {
                    className: "mt-1 text-sm text-gray-500 dark:text-dark-300",
                    children: "Acompanhe pagamentos registrados.",
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  e.jsxs("div", {
                    className: "relative",
                    children: [
                      e.jsx(Ye, {
                        className:
                          "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400",
                      }),
                      e.jsx("input", {
                        type: "text",
                        placeholder: "Pesquisar pagamento...",
                        value: I,
                        onChange: (event) => G(event.target.value),
                        className:
                          "h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50 sm:w-64",
                      }),
                    ],
                  }),
                  e.jsxs(C, {
                    onClick: fe,
                    variant: "soft",
                    color: "primary",
                    className: "gap-2 h-9 px-4 text-sm font-medium",
                    disabled: !D,
                    children: [
                      e.jsx(Be, {
                        className: "size-5",
                      }),
                      e.jsx("span", {
                        className: "hidden sm:inline",
                        children: "Novo pagamento",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          e.jsxs("div", {
            className: "mb-6 grid gap-4 md:grid-cols-3",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("label", {
                    className:
                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                    children: "Status",
                  }),
                  e.jsx(j, {
                    value: N,
                    onChange: (event) => J(event.target.value),
                    data: ye,
                    className: "mt-1",
                  }),
                ],
              }),
              e.jsx("div", {
                className: "flex items-end justify-end md:col-span-2",
                children: e.jsx(C, {
                  variant: "soft",
                  color: "neutral",
                  onClick: be,
                  className: "gap-2 h-9 px-4 text-sm font-medium",
                  children: "Limpar filtros",
                }),
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700",
            children: [
              e.jsx("div", {
                className: "overflow-x-auto",
                children: e.jsxs(je, {
                  className: "w-full",
                  children: [
                    e.jsx(Ne, {
                      children: k.getHeaderGroups().map((props) =>
                        e.jsx(
                          P,
                          {
                            className:
                              "border-b border-gray-200 dark:border-dark-700",
                            children: props.headers.map((props) =>
                              e.jsx(
                                we,
                                {
                                  className: H(
                                    "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                                    props.column.getCanSort() &&
                                      "cursor-pointer select-none hover:text-gray-700 dark:hover:text-dark-300",
                                    props.column.id === "actions" &&
                                      "w-[140px]",
                                  ),
                                  onClick: props.column.getCanSort()
                                    ? props.column.getToggleSortingHandler()
                                    : void 0,
                                  children: e.jsxs("div", {
                                    className: H(
                                      "flex items-center gap-2",
                                      props.column.id === "actions" &&
                                        "justify-center",
                                    ),
                                    children: [
                                      te(
                                        props.column.columnDef.header,
                                        props.getContext(),
                                      ),
                                      {
                                        asc: e.jsx(Qe, {
                                          className: "size-3",
                                        }),
                                        desc: e.jsx(Ke, {
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
                    e.jsx(Se, {
                      children: de
                        ? Array.from({
                            length: 6,
                          }).map((item, index) =>
                            e.jsx(
                              P,
                              {
                                className:
                                  "border-b border-gray-200 dark:border-dark-700",
                                children: A.map((item, index) =>
                                  e.jsx(
                                    B,
                                    {
                                      className: "px-4 py-4",
                                      children: e.jsx(Ce, {
                                        className: `h-4 ${item.id === "actions" ? "w-20" : "w-full max-w-[180px]"}`,
                                      }),
                                    },
                                    `payment-skeleton-cell-${index}-${index}`,
                                  ),
                                ),
                              },
                              `payment-skeleton-${index}`,
                            ),
                          )
                        : k.getRowModel().rows.length === 0
                          ? e.jsx(P, {
                              children: e.jsx(B, {
                                colSpan: A.length,
                                className: "px-4 py-12 text-center",
                                children: e.jsx("div", {
                                  className:
                                    "text-sm text-gray-500 dark:text-dark-400",
                                  children: "Nenhum pagamento encontrado.",
                                }),
                              }),
                            })
                          : k.getRowModel().rows.map((props) =>
                              e.jsx(
                                P,
                                {
                                  className:
                                    "border-b border-gray-200 hover:bg-gray-50/50 dark:border-dark-700 dark:hover:bg-dark-800/50 transition-colors",
                                  children: props
                                    .getVisibleCells()
                                    .map((props) =>
                                      e.jsx(
                                        B,
                                        {
                                          className: H(
                                            "px-4 py-4 text-sm text-gray-700 dark:text-dark-200",
                                            props.column.id === "actions" &&
                                              "w-[140px]",
                                          ),
                                          children: te(
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
              k.getRowModel().rows.length > 0 &&
                e.jsx("div", {
                  className:
                    "border-t border-gray-200 dark:border-dark-700 px-6 py-4",
                  children: e.jsx(Me, {
                    table: k,
                  }),
                }),
            ],
          }),
        ],
      }),
      e.jsx(Ge, {
        appear: !0,
        show: F,
        as: s.Fragment,
        children: e.jsxs(Je, {
          as: "div",
          className: "relative z-50",
          onClose: S,
          children: [
            e.jsx(oe, {
              as: s.Fragment,
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
                children: e.jsx(oe, {
                  as: s.Fragment,
                  enter: "ease-out duration-300",
                  enterFrom: "opacity-0 scale-95",
                  enterTo: "opacity-100 scale-100",
                  leave: "ease-in duration-200",
                  leaveFrom: "opacity-100 scale-100",
                  leaveTo: "opacity-0 scale-95",
                  children: e.jsxs(We, {
                    className:
                      "w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                    children: [
                      e.jsxs("div", {
                        className: "mb-6 flex items-start justify-between",
                        children: [
                          e.jsxs("div", {
                            children: [
                              e.jsx(Xe, {
                                className:
                                  "text-lg font-bold text-gray-900 dark:text-white",
                                children: d
                                  ? "Editar pagamento"
                                  : "Novo pagamento",
                              }),
                              e.jsx("p", {
                                className:
                                  "text-sm text-gray-500 dark:text-dark-300",
                                children: "Informe os detalhes do pagamento.",
                              }),
                            ],
                          }),
                          e.jsx("button", {
                            type: "button",
                            onClick: S,
                            className:
                              "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                            children: e.jsx(qe, {
                              className: "size-5",
                            }),
                          }),
                        ],
                      }),
                      e.jsxs("form", {
                        onSubmit: he,
                        className: "space-y-4",
                        children: [
                          e.jsxs("div", {
                            className: "grid gap-4 sm:grid-cols-2",
                            children: [
                              e.jsx(se, {
                                label: "Usuário",
                                data: xe,
                                value: o.userId,
                                onChange: (a) =>
                                  l((t) => ({
                                    ...t,
                                    userId: a,
                                  })),
                                placeholder: _
                                  ? "Carregando usuários..."
                                  : "Selecione...",
                              }),
                              e.jsxs("div", {
                                children: [
                                  e.jsx("label", {
                                    className:
                                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                    children: "Tipo da licença",
                                  }),
                                  e.jsx(j, {
                                    value: o.licenseType,
                                    onChange: (event) =>
                                      l((t) => ({
                                        ...t,
                                        licenseType: Number(event.target.value),
                                      })),
                                    data: M,
                                    className: "mt-1",
                                    disabled: _,
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className: "grid gap-4 sm:grid-cols-2",
                            children: [
                              e.jsxs("div", {
                                children: [
                                  e.jsx("label", {
                                    className:
                                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                    children: "Valor",
                                  }),
                                  e.jsx("input", {
                                    type: "number",
                                    step: "0.01",
                                    min: "0",
                                    value: o.amount,
                                    onChange: (event) =>
                                      l((t) => ({
                                        ...t,
                                        amount: event.target.value,
                                      })),
                                    className:
                                      "mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50",
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                children: [
                                  e.jsx("label", {
                                    className:
                                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                    children: "Moeda",
                                  }),
                                  e.jsx(j, {
                                    value: o.currencyCode,
                                    onChange: (event) =>
                                      l((t) => ({
                                        ...t,
                                        currencyCode:
                                          event.target.value.toUpperCase(),
                                      })),
                                    data: Y,
                                    className: "mt-1",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className: "grid gap-4 sm:grid-cols-2",
                            children: [
                              e.jsxs("div", {
                                children: [
                                  e.jsx("label", {
                                    className:
                                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                    children: "Status",
                                  }),
                                  e.jsx(j, {
                                    value: o.status,
                                    onChange: (event) =>
                                      l((t) => ({
                                        ...t,
                                        status: event.target.value,
                                      })),
                                    data: re,
                                    className: "mt-1",
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                children: [
                                  e.jsx("label", {
                                    className:
                                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                    children: "Método",
                                  }),
                                  e.jsx(j, {
                                    value: o.paymentMethod,
                                    onChange: (event) =>
                                      l((t) => ({
                                        ...t,
                                        paymentMethod: event.target.value,
                                      })),
                                    data: Ae,
                                    className: "mt-1",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className: "grid gap-4 sm:grid-cols-2",
                            children: [
                              e.jsxs("div", {
                                children: [
                                  e.jsx("label", {
                                    className:
                                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                    children: "Pago em",
                                  }),
                                  e.jsx("input", {
                                    type: "datetime-local",
                                    value: o.paidAt,
                                    onChange: (event) =>
                                      l((t) => ({
                                        ...t,
                                        paidAt: event.target.value,
                                      })),
                                    className:
                                      "mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50",
                                  }),
                                ],
                              }),
                              e.jsx("div", {
                                children: e.jsx(se, {
                                  label: "Vendedor",
                                  data: pe,
                                  value: o.sellerUserId,
                                  onChange: (a) =>
                                    l((t) => ({
                                      ...t,
                                      sellerUserId: a,
                                    })),
                                  placeholder: _
                                    ? "Carregando vendedores..."
                                    : "Selecione...",
                                }),
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                children: "Comprovante (hash)",
                              }),
                              e.jsx("input", {
                                type: "text",
                                value: o.proofHash,
                                onChange: (event) =>
                                  l((t) => ({
                                    ...t,
                                    proofHash: event.target.value,
                                  })),
                                className:
                                  "mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50",
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                children: "Observações",
                              }),
                              e.jsx("textarea", {
                                rows: 3,
                                value: o.notes,
                                onChange: (event) =>
                                  l((t) => ({
                                    ...t,
                                    notes: event.target.value,
                                  })),
                                className:
                                  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50",
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className: "flex justify-end gap-3 pt-2",
                            children: [
                              e.jsx(C, {
                                type: "button",
                                variant: "soft",
                                color: "neutral",
                                onClick: S,
                                children: "Cancelar",
                              }),
                              e.jsx(C, {
                                type: "submit",
                                color: "primary",
                                disabled: ue,
                                children: "Salvar pagamento",
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
  });
}
export { va as default };
