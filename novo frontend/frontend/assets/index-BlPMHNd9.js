import {
  h as $e,
  a as t,
  j as e,
  T as Ve,
  B as N,
  x as He,
  y as Be,
  v as F,
  A as Ye,
  e as B,
  z as Ke,
  w as Y,
  S as Qe,
  k as w,
} from "./index-Bx06KCE-.js";
import {
  c as qe,
  u as Ge,
  f as oe,
  P as Je,
  d as We,
  g as Xe,
  a as Ze,
} from "./PaginationSection-uLCLiG5r.js";
import { t as u } from "./index-mwGaaYkF.js";
import { P as ea } from "./Page-hVEPjFz_.js";
import { S as le } from "./SearchableSelect-9vRGJJts.js";
import {
  L as ve,
  a as ke,
  f as aa,
  u as ie,
  d as ra,
  g as de,
  c as ta,
} from "./licensesApi-BVBHUoUP.js";
import { C as je, P as sa, a as na, c as oa } from "./paymentsApi-DsZT4bW9.js";
import { j as la, v as ce } from "./authApi-ObFgLF0e.js";
import { F as ia } from "./PencilSquareIcon-4O8tAZey.js";
import { F as da } from "./CreditCardIcon-BLR1nsX7.js";
import { a as ca, F as ua } from "./TrashIcon-DZPNpgRn.js";
import { F as ma } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as xa, a as ga } from "./BarsArrowUpIcon-DltkYWyW.js";
import { F as pa } from "./FunnelIcon-D3v6sT5b.js";
import { F as ue } from "./XMarkIcon-mqVC0SZA.js";
import { K as me, O as M } from "./transition-Cxix63ts.js";
import { h as xe, z as ge, Q as pe } from "./dialog-DOjFQwF9.js";
import "./CheckIcon-WReR5saH.js";
import "./use-is-mounted-D7iMJT5-.js";

/* ==== Column Helper & Default Form Factories ==== */
const columnHelper = qe(),
  createDefaultLicenceForm = () => ({
    userId: "",
    type: ke[0]?.value ?? 1,
    startDate: "",
    endDate: "",
    status: ve[0]?.value ?? "active",
  }),
  getLocalDateTimeNow = () => {
    const now = new Date(),
      timezoneOffsetMs = now.getTimezoneOffset() * 6e4;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
  },
  createDefaultPaymentForm = (licence) => ({
    licenceId: licence?.id ?? "",
    amount: "",
    currencyCode: je[0]?.value ?? "USDT",
    status: "pending",
    paidAt: getLocalDateTimeNow(),
    sellerUserId: licence?.user_id ?? "",
    paymentMethod: "pix_manual",
    proofHash: "",
    notes: "",
  }),

  /* ==== Status Display Mappings ==== */
  statusLabels = {
    active: "Ativa",
    expiring: "Expira em breve",
    expired: "Expirada",
  },
  ha = {
    active: "success",
    expiring: "warning",
    expired: "error",
  },
  q = (s) => {
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [b, g, x] = s.split("-").map(Number);
      return new Date(b, g - 1, x);
    }
    const o = new Date(s);
    return Number.isNaN(o.getTime()) ? null : o;
  },
  he = (s, o = 7) => {
    if (String(s.status || "").toLowerCase() === "expired") return "expired";
    const g = new Date(),
      x = q(s.end_date);
    if (!x || x < g) return "expired";
    const f = new Date(g);
    return (f.setDate(g.getDate() + o), x <= f ? "expiring" : "active");
  },
  Q = (s) => {
    const o = q(s);
    return o ? o.toLocaleDateString("pt-BR") : "-";
  },
  ye = (s) => {
    if (!s) return "";
    if (s.length >= 10) return s.slice(0, 10);
    const o = new Date(s);
    return Number.isNaN(o.getTime()) ? "" : o.toISOString().slice(0, 10);
  },
  be = (s, o = !1) => {
    if (!s) return null;
    const [b, g, x] = s.split("-");
    if (!b || !g || !x) return null;
    const f = new Date(Number(b), Number(g) - 1, Number(x));
    return (o ? f.setHours(23, 59, 59, 999) : f.setHours(0, 0, 0, 0), f);
  };
function Aa() {
  const { user: s } = $e(),
    [o, b] = t.useState([]),
    [g, x] = t.useState(!0),
    [f, G] = t.useState(!1),
    [we, Se] = t.useState([]),
    [E, J] = t.useState(""),
    [_, W] = t.useState(""),
    [P, X] = t.useState(""),
    [R, A] = t.useState(!1),
    [v, O] = t.useState(null),
    [d, h] = t.useState(fe()),
    [k, Ce] = t.useState([]),
    [Le, Z] = t.useState(!0),
    [j, Ie] = t.useState([]),
    [De, ee] = t.useState(!0),
    [U, ae] = t.useState(!1),
    [n, m] = t.useState(K(null)),
    [Te, re] = t.useState(!1),
    p = t.useMemo(
      () =>
        s?.permissions?.includes("licences") ||
        s?.roles?.includes("admin") ||
        !1,
      [s],
    ),
    z = t.useMemo(
      () =>
        s?.roles?.includes("admin") ||
        ["create:payments", "update:payments", "delete:payments"].some((item) =>
          s?.permissions?.includes(item),
        ) ||
        !1,
      [s],
    ),
    y = t.useCallback(async () => {
      x(!0);
      try {
        const a = await aa();
        b(a);
      } catch (a) {
        console.error(a);
        u.error(a.message || "Erro ao carregar licenças.");
      } finally {
        x(!1);
      }
    }, []);
  t.useEffect(() => {
    y();
  }, [y]);
  t.useEffect(() => {
    (async () => {
      Z(!0);
      try {
        const r = await la();
        Ce(r);
      } catch (r) {
        console.error(r);
        u.error("Erro ao carregar usuários.");
      } finally {
        Z(!1);
      }
    })();
  }, []);
  t.useEffect(() => {
    (async () => {
      ee(!0);
      try {
        const [r, l] = await Promise.allSettled([
            ce({
              role: "admin",
              limit: 200,
            }),
            ce({
              permission: "licences",
              limit: 200,
            }),
          ]),
          i = new Map();
        r.status === "fulfilled"
          ? r.value.forEach((props) => i.set(props.id, props))
          : console.error(r.reason);
        l.status === "fulfilled"
          ? l.value.forEach((props) => i.set(props.id, props))
          : console.error(l.reason);
        Ie(Array.from(i.values()));
      } catch (r) {
        console.error(r);
        u.error("Erro ao carregar vendedores.");
      } finally {
        ee(!1);
      }
    })();
  }, []);
  const Fe = t.useCallback(() => {
      O(null);
      h(fe());
      A(!0);
    }, []),
    te = t.useCallback((props) => {
      O(props);
      h({
        userId: props.user_id,
        type: props.type,
        startDate: ye(props.start_date),
        endDate: ye(props.end_date),
        status: props.status || "active",
      });
      A(!0);
    }, []);
  t.useEffect(() => {
    !R ||
      v ||
      (!d.userId &&
        k.length > 0 &&
        h((a) => ({
          ...a,
          userId: k[0].id,
        })));
  }, [k, v, R, d.userId]);
  t.useEffect(() => {
    if (!U || j.length === 0) return;
    j.some((props) => props.id === n.sellerUserId) ||
      m((r) => ({
        ...r,
        sellerUserId: j[0].id,
      }));
  }, [j, U, n.sellerUserId]);
  const L = t.useMemo(() => new Map(k.map((props) => [props.id, props])), [k]),
    I = t.useCallback((a) => L.get(a)?.username || a, [L]),
    Me = t.useMemo(() => {
      const a = k.map((props) => ({
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
    }, [k]),
    se = t.useCallback((a) => {
      m(K(a));
      ae(!0);
    }, []),
    D = () => {
      A(!1);
      O(null);
    },
    T = () => {
      ae(!1);
      m(K(null));
    },
    Ee = t.useCallback(
      (props) => {
        if (!p) return;
        const l = {
          status: "expired",
          end_date: new Date().toISOString().slice(0, 10),
        };
        u.promise(ie(props.id, l), {
          loading: "Expirando licença...",
          success: () => (y(), "Licença expirada."),
          error: (i) => i?.message || "Erro ao expirar licença.",
        });
      },
      [p, y],
    ),
    ne = t.useCallback(
      (a) => {
        if (p && confirm("Deseja excluir esta licença?")) {
          u.promise(ra(a), {
            loading: "Removendo licença...",
            success: () => (y(), "Licença removida."),
            error: (r) => r?.message || "Erro ao remover licença.",
          });
        }
      },
      [p, y],
    ),
    _e = async (event) => {
      if ((event.preventDefault(), !p)) return;
      if (!d.userId) {
        u.error("Selecione um usuário válido.");
        return;
      }
      if (!d.endDate) {
        u.error("Informe a data de expiração.");
        return;
      }
      if (d.startDate && d.startDate > d.endDate) {
        u.error("A data de início deve ser anterior à expiração.");
        return;
      }
      const r = {
        user_id: d.userId,
        type: d.type,
        end_date: d.endDate,
        status: d.status || "active",
      };
      if (d.startDate) {
        r.start_date = d.startDate;
      }
      G(!0);
      const l = v ? ie(v.id, r) : ta(r);
      try {
        await u.promise(l, {
          loading: v ? "Atualizando licença..." : "Criando licença...",
          success: () => (
            y(),
            D(),
            v ? "Licença atualizada." : "Licença cadastrada."
          ),
          error: (i) => i?.message || "Erro ao salvar licença.",
        });
      } finally {
        G(!1);
      }
    },
    Pe = async (event) => {
      if ((event.preventDefault(), !z)) return;
      if (!n.licenceId) {
        u.error("Selecione uma licença.");
        return;
      }
      if (!n.amount.trim()) {
        u.error("Informe o valor.");
        return;
      }
      if (!n.currencyCode.trim()) {
        u.error("Informe a moeda.");
        return;
      }
      if (!n.sellerUserId) {
        u.error("Informe o vendedor.");
        return;
      }
      const r = Number(n.amount),
        l = n.paidAt || Ne(),
        i = new Date(l),
        c = Number.isNaN(i.getTime()) ? new Date() : i,
        H = {
          licence_id: n.licenceId,
          amount: r,
          currency_code: n.currencyCode.trim().toUpperCase(),
          status: n.status,
          paid_at: c.toISOString(),
          seller_user_id: n.sellerUserId,
          payment_method: n.paymentMethod,
          proof_hash: n.proofHash.trim() || void 0,
          notes: n.notes.trim() || void 0,
        };
      re(!0);
      try {
        await u.promise(oa(H), {
          loading: "Registrando pagamento...",
          success: () => (T(), y(), "Pagamento registrado."),
          error: (ze) => ze?.message || "Erro ao registrar pagamento.",
        });
      } finally {
        re(!1);
      }
    },
    $ = t.useMemo(
      () =>
        o.reduce(
          (item, acc) => {
            const l = he(acc);
            return ((item[l] += 1), item);
          },
          {
            active: 0,
            expiring: 0,
            expired: 0,
          },
        ),
      [o],
    ),
    Re = t.useMemo(() => {
      const a = E.trim().toLowerCase(),
        r = be(_),
        l = be(P, !0);
      return o.filter((props) => {
        const c = q(props.end_date),
          H = I(props.user_id);
        return !(
          (a &&
            !props.id.toLowerCase().includes(a) &&
            !props.user_id.toLowerCase().includes(a) &&
            !H.toLowerCase().includes(a)) ||
          (r && c && c < r) ||
          (l && c && c > l)
        );
      });
    }, [_, P, o, I, E]),
    Ae = t.useMemo(() => {
      const a = o.map((props) => {
        const l = I(props.user_id),
          i = de(props.type),
          c = Q(props.end_date);
        return {
          value: props.id,
          label: `${l} - ${i} - ${c}`,
        };
      });
      return a.length === 0
        ? [
            {
              value: "",
              label: "Nenhuma licença disponível",
              disabled: !0,
            },
          ]
        : a;
    }, [o, I]),
    Oe = t.useMemo(() => {
      const a = j.map((props) => ({
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
    }, [j]),
    V = t.useMemo(
      () => [
        S.accessor("user_id", {
          header: "Usuário",
          cell: (a) => {
            const r = L.get(a.getValue());
            return e.jsxs("div", {
              children: [
                e.jsx("span", {
                  className: "font-medium text-gray-900 dark:text-dark-50",
                  children: r?.username || a.getValue(),
                }),
                r?.email &&
                  e.jsx("span", {
                    className:
                      "mt-0.5 block text-xs text-gray-400 dark:text-dark-400",
                    children: r.email,
                  }),
              ],
            });
          },
        }),
        S.accessor("type", {
          header: "Tipo",
          cell: (a) =>
            e.jsx("span", {
              className: "text-sm text-gray-500 dark:text-dark-200",
              children: de(a.getValue()),
            }),
        }),
        S.accessor("start_date", {
          header: "Início",
          cell: (a) =>
            e.jsx("span", {
              className: "text-sm text-gray-500 dark:text-dark-200",
              children: Q(a.getValue()),
            }),
        }),
        S.accessor("end_date", {
          header: "Validade",
          cell: (a) =>
            e.jsx("span", {
              className: "text-sm text-gray-500 dark:text-dark-200",
              children: Q(a.getValue()),
            }),
        }),
        S.display({
          id: "status",
          header: () =>
            e.jsx("div", {
              className: "text-center",
              children: "Status",
            }),
          cell: (a) => {
            const r = he(a.row.original);
            return e.jsx(Ve, {
              variant: "soft",
              color: ha[r],
              className: "text-xs font-semibold",
              children: fa[r],
            });
          },
        }),
        S.display({
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
                p &&
                  e.jsx("button", {
                    type: "button",
                    className:
                      "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400",
                    onClick: () => te(a.row.original),
                    title: "Editar",
                    children: e.jsx(ia, {
                      className: "size-4",
                    }),
                  }),
                z &&
                  e.jsx("button", {
                    type: "button",
                    className:
                      "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-emerald-600 dark:hover:bg-dark-700 dark:hover:text-emerald-400",
                    onClick: () => se(a.row.original),
                    title: "Registrar pagamento",
                    children: e.jsx(da, {
                      className: "size-4",
                    }),
                  }),
                p &&
                  e.jsx("button", {
                    type: "button",
                    className:
                      "rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400",
                    onClick: () => ne(a.row.original.id),
                    title: "Excluir",
                    children: e.jsx(ca, {
                      className: "size-4",
                    }),
                  }),
              ],
            }),
        }),
      ],
      [p, z, ne, Ee, te, se, L],
    ),
    C = Ge({
      data: Re,
      columns: V,
      state: {
        sorting: we,
      },
      onSortingChange: Se,
      getCoreRowModel: Ze(),
      getSortedRowModel: Xe(),
      getPaginationRowModel: We(),
      manualPagination: !1,
    }),
    Ue = () => {
      W("");
      X("");
      J("");
    };
  return e.jsxs(ea, {
    title: "Controle de Licenças",
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
                    children: "Licenças",
                  }),
                  e.jsx("p", {
                    className: "mt-1 text-sm text-gray-500 dark:text-dark-300",
                    children:
                      "Controle os tipos, validade e status das licenças dos usuários.",
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  e.jsxs("div", {
                    className: "relative",
                    children: [
                      e.jsx(ma, {
                        className:
                          "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400",
                      }),
                      e.jsx("input", {
                        type: "text",
                        placeholder: "Pesquisar usuário ou licença...",
                        value: E,
                        onChange: (event) => J(event.target.value),
                        className:
                          "h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50 sm:w-64",
                      }),
                    ],
                  }),
                  p &&
                    e.jsxs(N, {
                      onClick: Fe,
                      variant: "soft",
                      color: "primary",
                      className: "gap-2 h-9 px-4 text-sm font-medium",
                      children: [
                        e.jsx(ua, {
                          className: "size-5",
                        }),
                        e.jsx("span", {
                          className: "hidden sm:inline",
                          children: "Nova licença",
                        }),
                      ],
                    }),
                ],
              }),
            ],
          }),
          e.jsx("div", {
            className: "mb-6 grid gap-4 md:grid-cols-3",
            children: ["Ativas", "Expiram em 7 dias", "Vencidas"].map(
              (item, index) => {
                const l = {
                  0: $.active,
                  1: $.expiring,
                  2: $.expired,
                };
                return e.jsxs(
                  "div",
                  {
                    className:
                      "rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800",
                    children: [
                      e.jsx("p", {
                        className:
                          "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                        children: item,
                      }),
                      e.jsx("p", {
                        className:
                          "mt-2 text-3xl font-semibold text-gray-900 dark:text-dark-50",
                        children: l[index],
                      }),
                    ],
                  },
                  item,
                );
              },
            ),
          }),
          e.jsxs("div", {
            className: "mb-6 grid gap-4 md:grid-cols-3",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("label", {
                    className:
                      "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                    children: "Validade a partir",
                  }),
                  e.jsx("input", {
                    type: "date",
                    value: _,
                    onChange: (event) => W(event.target.value),
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
                    children: "Validade até",
                  }),
                  e.jsx("input", {
                    type: "date",
                    value: P,
                    onChange: (event) => X(event.target.value),
                    className:
                      "mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50",
                  }),
                ],
              }),
              e.jsx("div", {
                className: "flex items-end justify-end",
                children: e.jsx(N, {
                  variant: "soft",
                  color: "neutral",
                  onClick: Ue,
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
                children: e.jsxs(He, {
                  className: "w-full",
                  children: [
                    e.jsx(Be, {
                      children: C.getHeaderGroups().map((props) =>
                        e.jsx(
                          F,
                          {
                            className:
                              "border-b border-gray-200 dark:border-dark-700",
                            children: props.headers.map((props) =>
                              e.jsx(
                                Ye,
                                {
                                  className: B(
                                    "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                                    props.column.getCanSort() &&
                                      "cursor-pointer select-none hover:text-gray-700 dark:hover:text-dark-300",
                                    props.column.id === "actions" &&
                                      "w-[180px]",
                                  ),
                                  onClick: props.column.getCanSort()
                                    ? props.column.getToggleSortingHandler()
                                    : void 0,
                                  children: e.jsxs("div", {
                                    className: B(
                                      "flex items-center gap-2",
                                      props.column.id === "actions" &&
                                        "justify-center",
                                    ),
                                    children: [
                                      oe(
                                        props.column.columnDef.header,
                                        props.getContext(),
                                      ),
                                      {
                                        asc: e.jsx(ga, {
                                          className: "size-3",
                                        }),
                                        desc: e.jsx(xa, {
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
                    e.jsx(Ke, {
                      children: g
                        ? Array.from({
                            length: 6,
                          }).map((item, index) =>
                            e.jsx(
                              F,
                              {
                                className:
                                  "border-b border-gray-200 dark:border-dark-700",
                                children: V.map((item, index) =>
                                  e.jsx(
                                    Y,
                                    {
                                      className: "px-4 py-4",
                                      children: e.jsx(Qe, {
                                        className: `h-4 ${item.id === "actions" ? "w-24" : "w-full max-w-[180px]"}`,
                                      }),
                                    },
                                    `license-skeleton-cell-${index}-${index}`,
                                  ),
                                ),
                              },
                              `license-skeleton-${index}`,
                            ),
                          )
                        : C.getRowModel().rows.length === 0
                          ? e.jsx(F, {
                              children: e.jsx(Y, {
                                colSpan: V.length,
                                className: "px-4 py-12 text-center",
                                children: e.jsxs("div", {
                                  className: "flex flex-col items-center gap-3",
                                  children: [
                                    e.jsx("div", {
                                      className:
                                        "size-12 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center",
                                      children: e.jsx(pa, {
                                        className:
                                          "size-6 text-gray-400 dark:text-dark-400",
                                      }),
                                    }),
                                    e.jsx("p", {
                                      className:
                                        "text-sm text-gray-500 dark:text-dark-400",
                                      children: "Nenhuma licença encontrada.",
                                    }),
                                  ],
                                }),
                              }),
                            })
                          : C.getRowModel().rows.map((props) =>
                              e.jsx(
                                F,
                                {
                                  className:
                                    "border-b border-gray-200 hover:bg-gray-50/50 dark:border-dark-700 dark:hover:bg-dark-800/50 transition-colors",
                                  children: props
                                    .getVisibleCells()
                                    .map((props) =>
                                      e.jsx(
                                        Y,
                                        {
                                          className: B(
                                            "px-4 py-4 text-sm text-gray-700 dark:text-dark-200",
                                            props.column.id === "actions" &&
                                              "w-[180px]",
                                          ),
                                          children: oe(
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
              C.getRowModel().rows.length > 0 &&
                e.jsx("div", {
                  className:
                    "border-t border-gray-200 dark:border-dark-700 px-6 py-4",
                  children: e.jsx(Je, {
                    table: C,
                  }),
                }),
            ],
          }),
        ],
      }),
      e.jsx(me, {
        appear: !0,
        show: R,
        as: t.Fragment,
        children: e.jsxs(xe, {
          as: "div",
          className: "relative z-50",
          onClose: D,
          children: [
            e.jsx(M, {
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
                children: e.jsx(M, {
                  as: t.Fragment,
                  enter: "ease-out duration-300",
                  enterFrom: "opacity-0 scale-95",
                  enterTo: "opacity-100 scale-100",
                  leave: "ease-in duration-200",
                  leaveFrom: "opacity-100 scale-100",
                  leaveTo: "opacity-0 scale-95",
                  children: e.jsxs(ge, {
                    className:
                      "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                    children: [
                      e.jsxs("div", {
                        className: "mb-6 flex items-start justify-between",
                        children: [
                          e.jsxs("div", {
                            children: [
                              e.jsx(pe, {
                                className:
                                  "text-lg font-bold text-gray-900 dark:text-white",
                                children: v ? "Editar licença" : "Nova licença",
                              }),
                              e.jsx("p", {
                                className:
                                  "text-sm text-gray-500 dark:text-dark-300",
                                children:
                                  "Informe o usuário, o tipo, a validade e o status.",
                              }),
                            ],
                          }),
                          e.jsx("button", {
                            type: "button",
                            onClick: D,
                            className:
                              "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                            children: e.jsx(ue, {
                              className: "size-5",
                            }),
                          }),
                        ],
                      }),
                      e.jsxs("form", {
                        onSubmit: _e,
                        className: "space-y-4",
                        children: [
                          e.jsx("div", {
                            className: "space-y-1",
                            children: e.jsx(le, {
                              label: "Usuário",
                              data: Me,
                              value: d.userId,
                              onChange: (a) =>
                                h((r) => ({
                                  ...r,
                                  userId: a,
                                })),
                              placeholder: Le
                                ? "Carregando usuários..."
                                : "Selecione...",
                            }),
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                children: "Tipo de licença",
                              }),
                              e.jsx(w, {
                                value: d.type,
                                onChange: (event) =>
                                  h((r) => ({
                                    ...r,
                                    type: Number(event.target.value),
                                  })),
                                data: [...ke],
                                className: "mt-1",
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                children: "Status",
                              }),
                              e.jsx(w, {
                                value: d.status,
                                onChange: (event) =>
                                  h((r) => ({
                                    ...r,
                                    status: event.target.value,
                                  })),
                                data: [...ve],
                                className: "mt-1",
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                children: "Início (opcional)",
                              }),
                              e.jsx("input", {
                                type: "date",
                                value: d.startDate,
                                onChange: (event) =>
                                  h((r) => ({
                                    ...r,
                                    startDate: event.target.value,
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
                                children: "Validade",
                              }),
                              e.jsx("input", {
                                type: "date",
                                value: d.endDate,
                                onChange: (event) =>
                                  h((r) => ({
                                    ...r,
                                    endDate: event.target.value,
                                  })),
                                className:
                                  "mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50",
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className: "flex justify-end gap-3 pt-2",
                            children: [
                              e.jsx(N, {
                                type: "button",
                                variant: "soft",
                                color: "neutral",
                                onClick: D,
                                children: "Cancelar",
                              }),
                              e.jsx(N, {
                                type: "submit",
                                color: "primary",
                                disabled: f,
                                children: "Salvar licença",
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
      e.jsx(me, {
        appear: !0,
        show: U,
        as: t.Fragment,
        children: e.jsxs(xe, {
          as: "div",
          className: "relative z-50",
          onClose: T,
          children: [
            e.jsx(M, {
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
                children: e.jsx(M, {
                  as: t.Fragment,
                  enter: "ease-out duration-300",
                  enterFrom: "opacity-0 scale-95",
                  enterTo: "opacity-100 scale-100",
                  leave: "ease-in duration-200",
                  leaveFrom: "opacity-100 scale-100",
                  leaveTo: "opacity-0 scale-95",
                  children: e.jsxs(ge, {
                    className:
                      "w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                    children: [
                      e.jsxs("div", {
                        className: "mb-6 flex items-start justify-between",
                        children: [
                          e.jsxs("div", {
                            children: [
                              e.jsx(pe, {
                                className:
                                  "text-lg font-bold text-gray-900 dark:text-white",
                                children: "Registrar pagamento",
                              }),
                              e.jsx("p", {
                                className:
                                  "text-sm text-gray-500 dark:text-dark-300",
                                children:
                                  "Vincule o pagamento a uma licença ativa.",
                              }),
                            ],
                          }),
                          e.jsx("button", {
                            type: "button",
                            onClick: T,
                            className:
                              "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                            children: e.jsx(ue, {
                              className: "size-5",
                            }),
                          }),
                        ],
                      }),
                      e.jsxs("form", {
                        onSubmit: Pe,
                        className: "space-y-4",
                        children: [
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300",
                                children: "Licença",
                              }),
                              e.jsx(w, {
                                value: n.licenceId,
                                onChange: (event) =>
                                  m((r) => ({
                                    ...r,
                                    licenceId: event.target.value,
                                  })),
                                data: Ae,
                                className: "mt-1",
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
                                    value: n.amount,
                                    onChange: (event) =>
                                      m((r) => ({
                                        ...r,
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
                                  e.jsx(w, {
                                    value: n.currencyCode,
                                    onChange: (event) =>
                                      m((r) => ({
                                        ...r,
                                        currencyCode:
                                          event.target.value.toUpperCase(),
                                      })),
                                    data: je,
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
                                  e.jsx(w, {
                                    value: n.status,
                                    onChange: (event) =>
                                      m((r) => ({
                                        ...r,
                                        status: event.target.value,
                                      })),
                                    data: sa,
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
                                  e.jsx(w, {
                                    value: n.paymentMethod,
                                    onChange: (event) =>
                                      m((r) => ({
                                        ...r,
                                        paymentMethod: event.target.value,
                                      })),
                                    data: na,
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
                                    value: n.paidAt,
                                    onChange: (event) =>
                                      m((r) => ({
                                        ...r,
                                        paidAt: event.target.value,
                                      })),
                                    className:
                                      "mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50",
                                  }),
                                ],
                              }),
                              e.jsx("div", {
                                children: e.jsx(le, {
                                  label: "Vendedor",
                                  data: Oe,
                                  value: n.sellerUserId,
                                  onChange: (a) =>
                                    m((r) => ({
                                      ...r,
                                      sellerUserId: a,
                                    })),
                                  placeholder: De
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
                                value: n.proofHash,
                                onChange: (event) =>
                                  m((r) => ({
                                    ...r,
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
                                value: n.notes,
                                onChange: (event) =>
                                  m((r) => ({
                                    ...r,
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
                              e.jsx(N, {
                                type: "button",
                                variant: "soft",
                                color: "neutral",
                                onClick: T,
                                children: "Cancelar",
                              }),
                              e.jsx(N, {
                                type: "submit",
                                color: "primary",
                                disabled: Te,
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
export { Aa as default };
