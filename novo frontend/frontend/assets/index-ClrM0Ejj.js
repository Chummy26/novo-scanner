import {
  h as Ne,
  a,
  j as e,
  B as U,
  x as we,
  y as Fe,
  v as S,
  A as Ue,
  e as L,
  z as Se,
  w as O,
  S as Re,
  I as R,
} from "./index-Bx06KCE-.js";
import {
  c as Ce,
  u as Pe,
  f as I,
  P as ze,
  b as Me,
  d as Te,
  g as $e,
  a as Ae,
} from "./PaginationSection-uLCLiG5r.js";
import { t as i } from "./index-mwGaaYkF.js";
import { P as ee } from "./Page-hVEPjFz_.js";
import {
  j as Ee,
  k as De,
  m as Le,
  n as Oe,
  f as Ge,
  a as He,
  o as Ve,
  p as Be,
  q as qe,
  r as Ke,
  s as Qe,
  t as _e,
} from "./authApi-ObFgLF0e.js";
import { F as Je } from "./UserIcon-B-URsuU3.js";
import { F as We } from "./KeyIcon-CgJXeIvo.js";
import { F as Xe } from "./PencilSquareIcon-4O8tAZey.js";
import { a as Ye, F as Ze } from "./TrashIcon-DZPNpgRn.js";
import { F as re } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as Ie, a as er } from "./BarsArrowUpIcon-DltkYWyW.js";
import { F as rr } from "./FunnelIcon-D3v6sT5b.js";
import { F as se } from "./XMarkIcon-mqVC0SZA.js";
import { F as sr } from "./EyeSlashIcon-CsqEf1t-.js";
import { F as ar } from "./EyeIcon-CCF3MwDA.js";
import { F as ae } from "./CheckIcon-BhaIjZ56.js";
import { K as te, O as C } from "./transition-Cxix63ts.js";
import { h as oe, z as ie, Q as le } from "./dialog-DOjFQwF9.js";
import "./use-is-mounted-D7iMJT5-.js";
function Nr() {
  const { user: G } = Ne(),
    H = G?.roles || [],
    b = G?.permissions || [],
    h = H.includes("admin"),
    ne = H.includes("users"),
    P = h || ne || b.includes("read:users"),
    z = h || b.includes("create:users"),
    f = h || b.includes("update:users"),
    j = h || b.includes("delete:users"),
    u = h,
    [de, v] = a.useState([]),
    [ce, V] = a.useState(!0),
    [B, q] = a.useState(""),
    [me, xe] = a.useState([]),
    [ue, g] = a.useState(!1),
    [ge, y] = a.useState(!1),
    [c, M] = a.useState("roles"),
    [l, K] = a.useState(null),
    [n, p] = a.useState({
      username: "",
      email: "",
      password: "",
    }),
    [T, $] = a.useState(!1),
    [m, pe] = a.useState(null),
    [Q, he] = a.useState([]),
    [_, fe] = a.useState([]),
    [A, N] = a.useState([]),
    [E, w] = a.useState([]),
    [ye, J] = a.useState(!1),
    W = async () => {
      V(!0);
      try {
        if (!P) {
          v([]);
          return;
        }
        const r = await Ee();
        v(r);
      } catch (r) {
        console.error(r);
        i.error(r.message || "Erro ao carregar usuários.");
      } finally {
        V(!1);
      }
    };
  a.useEffect(() => {
    W();
  }, [P]);
  const ke = () => {
      if (!z) {
        i.error("Permissão insuficiente para criar usuários.");
        return;
      }
      K(null);
      p({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      $(!1);
      g(!0);
    },
    X = (props) => {
      if (!f) {
        i.error("Permissão insuficiente para editar usuários.");
        return;
      }
      K(props);
      p({
        name: props.name || "",
        username: props.username,
        email: props.email,
        password: "",
        confirmPassword: "",
      });
      $(!1);
      g(!0);
    },
    be = async (event) => {
      event.preventDefault();
      const s = !!l;
      if (s && !f) {
        i.error("Permissão insuficiente para editar usuários.");
        return;
      }
      if (!s && !z) {
        i.error("Permissão insuficiente para criar usuários.");
        return;
      }
      if (!n.username.trim() || !n.email.trim()) {
        i.error("Nome de usuário e e-mail são obrigatórios.");
        return;
      }
      if (!l && !n.password) {
        i.error("Senha é obrigatória para novos usuários.");
        return;
      }
      const t = {
        ...n,
      };
      t.password || (delete t.password, delete t.confirmPassword);
      if (!t.name || !t.name.trim()) {
        delete t.name;
      }
      const o = l ? De(l.id, t) : Le(t);
      i.promise(o, {
        loading: l ? "Atualizando usuário..." : "Criando usuário...",
        success: () => (
          l
            ? v((d) =>
                d.map((props) =>
                  props.id === l.id
                    ? {
                        ...props,
                        ...t,
                      }
                    : props,
                ),
              )
            : W(),
          g(!1),
          l ? "Usuário atualizado!" : "Usuário criado com sucesso!"
        ),
        error: (d) => d.message || "Erro ao salvar usuário.",
      });
    },
    Y = async (r) => {
      if (!j) {
        i.error("Permissão insuficiente para excluir usuários.");
        return;
      }
      if (confirm("Tem certeza que deseja excluir este usuário?")) {
        i.promise(Oe(r), {
          loading: "Excluindo...",
          success: () => (
            v((s) => s.filter((props) => props.id !== r)),
            "Usuário excluído."
          ),
          error: (s) => s.message || "Erro ao excluir usuário.",
        });
      }
    },
    Z = async (props) => {
      if (!u) {
        i.error("Permissão insuficiente para gerenciar acessos.");
        return;
      }
      pe(props);
      y(!0);
      J(!0);
      M("roles");
      try {
        const [s, t, o, d] = await Promise.all([
          Ge(),
          He(),
          Ve(props.id),
          Be(props.id),
        ]);
        he(s);
        fe(t);
        N(o.map((props) => props.id));
        w(d.map((props) => props.id));
      } catch (s) {
        console.error(s);
        i.error(s.message || "Erro ao carregar dados de acesso do usuário.");
        y(!1);
      } finally {
        J(!1);
      }
    },
    je = async (r) => {
      if (!u) {
        i.error("Permissão insuficiente para atualizar roles.");
        return;
      }
      if (!m) return;
      const s = A.includes(r),
        t = [...A];
      N(s ? (o) => o.filter((item) => item !== r) : (o) => [...o, r]);
      try {
        s ? await qe(m.id, r) : await Ke(m.id, r);
      } catch (o) {
        N(t);
        i.error(o.message || "Erro ao atualizar vínculo de role.");
      }
    },
    ve = async (r) => {
      if (!u) {
        i.error("Permissão insuficiente para atualizar permissões.");
        return;
      }
      if (!m) return;
      const s = E.includes(r),
        t = [...E];
      w(s ? (o) => o.filter((item) => item !== r) : (o) => [...o, r]);
      try {
        s ? await Qe(m.id, r) : await _e(m.id, r);
      } catch (o) {
        w(t);
        i.error(o.message || "Erro ao atualizar vínculo de permissão.");
      }
    },
    F = Ce(),
    D = a.useMemo(
      () => [
        F.accessor("username", {
          header: "Usuário",
          cell: (r) =>
            e.jsxs("div", {
              className: "flex items-center gap-3",
              children: [
                e.jsx("div", {
                  className:
                    "flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                  children: e.jsx(Je, {
                    className: "size-4",
                  }),
                }),
                e.jsx("div", {
                  className: "flex flex-col",
                  children: e.jsx("span", {
                    className: "font-medium text-gray-900 dark:text-dark-50",
                    children: r.getValue(),
                  }),
                }),
              ],
            }),
        }),
        F.accessor("email", {
          header: "E-mail",
          cell: (r) =>
            e.jsx("span", {
              className: "text-gray-500 dark:text-dark-300",
              children: r.getValue(),
            }),
        }),
        F.accessor("createdAt", {
          header: "Cadastro",
          cell: (r) => {
            const s = r.getValue();
            return e.jsx("span", {
              className: "text-sm text-gray-500",
              children: s ? new Date(s).toLocaleDateString() : "—",
            });
          },
        }),
        F.display({
          id: "actions",
          header: () =>
            e.jsx("div", {
              className: "text-center",
              children: "Ações",
            }),
          cell: (r) =>
            e.jsxs("div", {
              className: "flex justify-center gap-2",
              children: [
                u &&
                  e.jsx("button", {
                    onClick: () => Z(r.row.original),
                    className:
                      "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400",
                    title: "Gerenciar acessos",
                    children: e.jsx(We, {
                      className: "size-3.5",
                    }),
                  }),
                f &&
                  e.jsx("button", {
                    onClick: () => X(r.row.original),
                    className:
                      "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400",
                    title: "Editar usuário",
                    children: e.jsx(Xe, {
                      className: "size-4",
                    }),
                  }),
                j &&
                  e.jsx("button", {
                    onClick: () => Y(r.row.original.id),
                    className:
                      "rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400",
                    title: "Excluir usuário",
                    children: e.jsx(Ye, {
                      className: "size-4",
                    }),
                  }),
                !u &&
                  !f &&
                  !j &&
                  e.jsx("span", {
                    className: "text-xs text-gray-400 dark:text-dark-500",
                    children: "-",
                  }),
              ],
            }),
        }),
      ],
      [j, u, f, Y, X, Z],
    ),
    k = Pe({
      data: de,
      columns: D,
      state: {
        sorting: me,
        globalFilter: B,
      },
      onSortingChange: xe,
      getCoreRowModel: Ae(),
      getSortedRowModel: $e(),
      getPaginationRowModel: Te(),
      getFilteredRowModel: Me(),
      onGlobalFilterChange: q,
    });
  return P
    ? e.jsx(ee, {
        title: "Gestão de Usuários",
        children: e.jsxs("div", {
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
                      children: "Usuários",
                    }),
                    e.jsx("p", {
                      className:
                        "mt-1 text-sm text-gray-500 dark:text-dark-300",
                      children:
                        "Gerencie usuários, roles e permissões individuais.",
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "flex items-center gap-3",
                  children: [
                    e.jsxs("div", {
                      className: "relative",
                      children: [
                        e.jsx(re, {
                          className:
                            "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400",
                        }),
                        e.jsx("input", {
                          type: "text",
                          placeholder: "Pesquisar usuário...",
                          value: B,
                          onChange: (event) => q(event.target.value),
                          className:
                            "h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50 sm:w-64",
                        }),
                      ],
                    }),
                    z &&
                      e.jsxs(U, {
                        variant: "soft",
                        color: "primary",
                        className: "gap-2 h-9 px-4 text-sm font-medium",
                        onClick: ke,
                        children: [
                          e.jsx(Ze, {
                            className: "size-5",
                          }),
                          e.jsx("span", {
                            className: "hidden sm:inline",
                            children: "Novo Usuário",
                          }),
                        ],
                      }),
                  ],
                }),
              ],
            }),
            e.jsxs("div", {
              className:
                "overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700",
              children: [
                e.jsx("div", {
                  className: "overflow-x-auto",
                  children: e.jsxs(we, {
                    className: "w-full",
                    children: [
                      e.jsx(Fe, {
                        children: k.getHeaderGroups().map((props) =>
                          e.jsx(
                            S,
                            {
                              className:
                                "border-b border-gray-200 dark:border-dark-700",
                              children: props.headers.map((props) =>
                                e.jsx(
                                  Ue,
                                  {
                                    className: L(
                                      "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                                      props.column.getCanSort() &&
                                        "cursor-pointer select-none hover:text-gray-700 dark:hover:text-dark-300",
                                      props.id === "actions" && "w-[120px]",
                                    ),
                                    onClick:
                                      props.column.getToggleSortingHandler(),
                                    children: e.jsxs("div", {
                                      className: L(
                                        "flex items-center gap-2",
                                        props.id === "actions" &&
                                          "justify-center",
                                      ),
                                      children: [
                                        I(
                                          props.column.columnDef.header,
                                          props.getContext(),
                                        ),
                                        {
                                          asc: e.jsx(er, {
                                            className: "size-3",
                                          }),
                                          desc: e.jsx(Ie, {
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
                        children: ce
                          ? Array.from({
                              length: 6,
                            }).map((item, index) =>
                              e.jsx(
                                S,
                                {
                                  className:
                                    "border-b border-gray-200 dark:border-dark-700",
                                  children: Array.from({
                                    length: D.length,
                                  }).map((item, index) =>
                                    e.jsx(
                                      O,
                                      {
                                        className: "px-4 py-4",
                                        children: e.jsx(Re, {
                                          className: "h-4 w-full max-w-[180px]",
                                        }),
                                      },
                                      `user-skeleton-cell-${index}-${index}`,
                                    ),
                                  ),
                                },
                                `user-skeleton-${index}`,
                              ),
                            )
                          : k.getRowModel().rows.length === 0
                            ? e.jsx(S, {
                                children: e.jsx(O, {
                                  colSpan: D.length,
                                  className: "px-4 py-12 text-center",
                                  children: e.jsxs("div", {
                                    className:
                                      "flex flex-col items-center gap-3",
                                    children: [
                                      e.jsx("div", {
                                        className:
                                          "size-12 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center",
                                        children: e.jsx(rr, {
                                          className:
                                            "size-6 text-gray-400 dark:text-dark-400",
                                        }),
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "text-sm text-gray-500 dark:text-dark-400",
                                        children: "Nenhum usuário encontrado.",
                                      }),
                                    ],
                                  }),
                                }),
                              })
                            : k.getRowModel().rows.map((props) =>
                                e.jsx(
                                  S,
                                  {
                                    className:
                                      "border-b border-gray-200 hover:bg-gray-50/50 dark:border-dark-700 dark:hover:bg-dark-800/50 transition-colors",
                                    children: props
                                      .getVisibleCells()
                                      .map((props) =>
                                        e.jsx(
                                          O,
                                          {
                                            className: L(
                                              "px-4 py-4",
                                              props.column.id === "actions" &&
                                                "w-[120px]",
                                            ),
                                            children: I(
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
                    children: e.jsx(ze, {
                      table: k,
                    }),
                  }),
              ],
            }),
            e.jsx(te, {
              appear: !0,
              show: ue,
              as: a.Fragment,
              children: e.jsxs(oe, {
                as: "div",
                className: "relative z-50",
                onClose: () => g(!1),
                children: [
                  e.jsx(C, {
                    as: a.Fragment,
                    enter: "ease-out duration-300",
                    enterFrom: "opacity-0",
                    enterTo: "opacity-100",
                    leave: "ease-in duration-200",
                    leaveFrom: "opacity-100",
                    leaveTo: "opacity-0",
                    children: e.jsx("div", {
                      className:
                        "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
                    }),
                  }),
                  e.jsx("div", {
                    className: "fixed inset-0 overflow-y-auto",
                    children: e.jsx("div", {
                      className:
                        "flex min-h-full items-center justify-center p-4 text-center",
                      children: e.jsx(C, {
                        as: a.Fragment,
                        enter: "ease-out duration-300",
                        enterFrom: "opacity-0 scale-95",
                        enterTo: "opacity-100 scale-100",
                        leave: "ease-in duration-200",
                        leaveFrom: "opacity-100 scale-100",
                        leaveTo: "opacity-0 scale-95",
                        children: e.jsxs(ie, {
                          className:
                            "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                          children: [
                            e.jsxs("div", {
                              className:
                                "mb-6 flex items-start justify-between",
                              children: [
                                e.jsx(le, {
                                  as: "h3",
                                  className:
                                    "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                                  children: l
                                    ? "Editar Usuário"
                                    : "Novo Usuário",
                                }),
                                e.jsx("button", {
                                  onClick: () => g(!1),
                                  className:
                                    "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                                  children: e.jsx(se, {
                                    className: "size-5",
                                  }),
                                }),
                              ],
                            }),
                            e.jsxs("form", {
                              onSubmit: be,
                              className: "space-y-4",
                              children: [
                                e.jsx(R, {
                                  label: "Nome Completo",
                                  placeholder: "Ex: João Silva",
                                  value: n.name || "",
                                  onChange: (event) =>
                                    p({
                                      ...n,
                                      name: event.target.value,
                                    }),
                                }),
                                e.jsx(R, {
                                  label: "Nome de Usuário",
                                  placeholder: "Ex: johndoe",
                                  value: n.username,
                                  onChange: (event) =>
                                    p({
                                      ...n,
                                      username: event.target.value,
                                    }),
                                }),
                                e.jsx(R, {
                                  label: "E-mail",
                                  type: "email",
                                  placeholder: "exemplo@email.com",
                                  value: n.email,
                                  onChange: (event) =>
                                    p({
                                      ...n,
                                      email: event.target.value,
                                    }),
                                }),
                                e.jsx(R, {
                                  label: l ? "Nova Senha (opcional)" : "Senha",
                                  type: T ? "text" : "password",
                                  placeholder: l
                                    ? "Deixe em branco para manter"
                                    : "******",
                                  value: n.password,
                                  onChange: (event) =>
                                    p({
                                      ...n,
                                      password: event.target.value,
                                      confirmPassword: event.target.value,
                                    }),
                                  suffix: e.jsx("button", {
                                    type: "button",
                                    onClick: () => $((r) => !r),
                                    className:
                                      "flex h-full w-full items-center justify-center focus:outline-none",
                                    "aria-label": T
                                      ? "Ocultar senha"
                                      : "Mostrar senha",
                                    children: T
                                      ? e.jsx(sr, {
                                          className: "size-4",
                                        })
                                      : e.jsx(ar, {
                                          className: "size-4",
                                        }),
                                  }),
                                }),
                                e.jsxs("div", {
                                  className: "mt-6 flex justify-end gap-3",
                                  children: [
                                    e.jsx(U, {
                                      type: "button",
                                      variant: "soft",
                                      color: "neutral",
                                      onClick: () => g(!1),
                                      children: "Cancelar",
                                    }),
                                    e.jsx(U, {
                                      type: "submit",
                                      color: "primary",
                                      children: l
                                        ? "Salvar Alterações"
                                        : "Criar Usuário",
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
            e.jsx(te, {
              appear: !0,
              show: ge,
              as: a.Fragment,
              children: e.jsxs(oe, {
                as: "div",
                className: "relative z-50",
                onClose: () => y(!1),
                children: [
                  e.jsx(C, {
                    as: a.Fragment,
                    enter: "ease-out duration-300",
                    enterFrom: "opacity-0",
                    enterTo: "opacity-100",
                    leave: "ease-in duration-200",
                    leaveFrom: "opacity-100",
                    leaveTo: "opacity-0",
                    children: e.jsx("div", {
                      className:
                        "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
                    }),
                  }),
                  e.jsx("div", {
                    className: "fixed inset-0 overflow-y-auto",
                    children: e.jsx("div", {
                      className:
                        "flex min-h-full items-center justify-center p-4 text-center",
                      children: e.jsx(C, {
                        as: a.Fragment,
                        enter: "ease-out duration-300",
                        enterFrom: "opacity-0 scale-95",
                        enterTo: "opacity-100 scale-100",
                        leave: "ease-in duration-200",
                        leaveFrom: "opacity-100 scale-100",
                        leaveTo: "opacity-0 scale-95",
                        children: e.jsxs(ie, {
                          className:
                            "flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                          children: [
                            e.jsxs("div", {
                              className:
                                "border-b border-gray-100 px-6 py-4 dark:border-dark-700",
                              children: [
                                e.jsxs("div", {
                                  className:
                                    "flex items-center justify-between",
                                  children: [
                                    e.jsxs("div", {
                                      children: [
                                        e.jsx(le, {
                                          as: "h3",
                                          className:
                                            "text-lg font-bold text-gray-900 dark:text-white",
                                          children: "Acessos do Usuário",
                                        }),
                                        e.jsxs("p", {
                                          className:
                                            "text-sm text-gray-500 dark:text-dark-300",
                                          children: [
                                            "Gerenciando:",
                                            " ",
                                            e.jsx("span", {
                                              className:
                                                "font-semibold text-primary-600 dark:text-primary-400",
                                              children: m?.username,
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    e.jsx("button", {
                                      onClick: () => y(!1),
                                      className:
                                        "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                                      children: e.jsx(se, {
                                        className: "size-5",
                                      }),
                                    }),
                                  ],
                                }),
                                e.jsxs("div", {
                                  className:
                                    "mt-4 flex gap-1 rounded-lg bg-gray-50 p-1 dark:bg-dark-700/50",
                                  children: [
                                    e.jsx("button", {
                                      onClick: () => M("roles"),
                                      className: `flex-1 rounded-md py-1.5 text-sm font-medium transition ${c === "roles" ? "bg-white text-primary-600 shadow-sm dark:bg-dark-600 dark:text-primary-400" : "text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200"}`,
                                      children: "Roles (Funções)",
                                    }),
                                    e.jsx("button", {
                                      onClick: () => M("permissions"),
                                      className: `flex-1 rounded-md py-1.5 text-sm font-medium transition ${c === "permissions" ? "bg-white text-primary-600 shadow-sm dark:bg-dark-600 dark:text-primary-400" : "text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200"}`,
                                      children: "Permissões Diretas",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            e.jsxs("div", {
                              className:
                                "flex flex-1 flex-col overflow-hidden p-6",
                              children: [
                                e.jsxs("div", {
                                  className: "mb-4 relative",
                                  children: [
                                    e.jsx(re, {
                                      className:
                                        "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400",
                                    }),
                                    e.jsx("input", {
                                      type: "text",
                                      placeholder: `Filtrar ${c === "roles" ? "roles" : "permissões"}...`,
                                      className:
                                        "h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700/50 dark:text-dark-50",
                                    }),
                                  ],
                                }),
                                e.jsx("div", {
                                  className:
                                    "custom-scrollbar flex-1 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2 dark:border-dark-700 dark:bg-dark-800/50",
                                  children: ye
                                    ? e.jsx("div", {
                                        className:
                                          "flex h-40 items-center justify-center",
                                        children: e.jsx("div", {
                                          className:
                                            "size-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent",
                                        }),
                                      })
                                    : e.jsxs("div", {
                                        className: "space-y-1",
                                        children: [
                                          c === "roles" &&
                                            Q.map((props) => {
                                              const s = A.includes(props.id);
                                              return e.jsxs(
                                                "label",
                                                {
                                                  className: `flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition ${s ? "bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100" : "hover:bg-white hover:shadow-sm dark:hover:bg-dark-700"}`,
                                                  children: [
                                                    e.jsxs("div", {
                                                      className:
                                                        "flex items-center gap-3 overflow-hidden",
                                                      children: [
                                                        e.jsx("div", {
                                                          className: `flex size-5 shrink-0 items-center justify-center rounded border ${s ? "border-primary-500 bg-primary-500 text-white" : "border-gray-300 bg-white dark:border-dark-500 dark:bg-dark-800"}`,
                                                          children:
                                                            s &&
                                                            e.jsx(ae, {
                                                              className:
                                                                "size-3.5 stroke-[3]",
                                                            }),
                                                        }),
                                                        e.jsxs("div", {
                                                          className:
                                                            "flex flex-col truncate",
                                                          children: [
                                                            e.jsx("span", {
                                                              className:
                                                                "truncate font-medium text-sm",
                                                              children:
                                                                props.name,
                                                            }),
                                                            e.jsx("span", {
                                                              className:
                                                                "truncate text-[11px] text-gray-500 dark:text-dark-400",
                                                              children:
                                                                props.description ||
                                                                "Sem descrição",
                                                            }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                    e.jsx("input", {
                                                      type: "checkbox",
                                                      className: "hidden",
                                                      checked: s,
                                                      onChange: () =>
                                                        je(props.id),
                                                    }),
                                                  ],
                                                },
                                                props.id,
                                              );
                                            }),
                                          c === "permissions" &&
                                            _.map((props) => {
                                              const s = E.includes(props.id);
                                              return e.jsxs(
                                                "label",
                                                {
                                                  className: `flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition ${s ? "bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100" : "hover:bg-white hover:shadow-sm dark:hover:bg-dark-700"}`,
                                                  children: [
                                                    e.jsxs("div", {
                                                      className:
                                                        "flex items-center gap-3 overflow-hidden",
                                                      children: [
                                                        e.jsx("div", {
                                                          className: `flex size-5 shrink-0 items-center justify-center rounded border ${s ? "border-primary-500 bg-primary-500 text-white" : "border-gray-300 bg-white dark:border-dark-500 dark:bg-dark-800"}`,
                                                          children:
                                                            s &&
                                                            e.jsx(ae, {
                                                              className:
                                                                "size-3.5 stroke-[3]",
                                                            }),
                                                        }),
                                                        e.jsxs("div", {
                                                          className:
                                                            "flex flex-col truncate",
                                                          children: [
                                                            e.jsx("span", {
                                                              className:
                                                                "truncate font-mono text-xs font-medium",
                                                              children:
                                                                props.code,
                                                            }),
                                                            e.jsx("span", {
                                                              className:
                                                                "truncate text-[11px] text-gray-500 dark:text-dark-400",
                                                              children:
                                                                props.description,
                                                            }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                    e.jsx("input", {
                                                      type: "checkbox",
                                                      className: "hidden",
                                                      checked: s,
                                                      onChange: () =>
                                                        ve(props.id),
                                                    }),
                                                  ],
                                                },
                                                props.id,
                                              );
                                            }),
                                          c === "roles" &&
                                            Q.length === 0 &&
                                            e.jsx("div", {
                                              className:
                                                "text-center py-8 text-gray-500",
                                              children:
                                                "Nenhuma role cadastrada.",
                                            }),
                                          c === "permissions" &&
                                            _.length === 0 &&
                                            e.jsx("div", {
                                              className:
                                                "text-center py-8 text-gray-500",
                                              children:
                                                "Nenhuma permissão cadastrada.",
                                            }),
                                        ],
                                      }),
                                }),
                                e.jsx("p", {
                                  className:
                                    "mt-2 text-center text-xs text-gray-400 dark:text-dark-500",
                                  children:
                                    "As alterações são salvas automaticamente.",
                                }),
                              ],
                            }),
                            e.jsx("div", {
                              className:
                                "border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-dark-700 dark:bg-dark-800/50",
                              children: e.jsx("div", {
                                className: "flex justify-end",
                                children: e.jsx(U, {
                                  color: "primary",
                                  onClick: () => y(!1),
                                  className: "w-full sm:w-auto",
                                  children: "Concluir",
                                }),
                              }),
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
      })
    : e.jsx(ee, {
        title: "Gestão de Usuários",
        children: e.jsx("div", {
          className: "w-full px-(--margin-x) pb-10 pt-5 lg:pt-6",
          children: e.jsxs("div", {
            className:
              "rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-dark-700 dark:bg-dark-800/60",
            children: [
              e.jsx("h2", {
                className:
                  "text-lg font-semibold text-gray-900 dark:text-dark-50",
                children: "Acesso restrito",
              }),
              e.jsx("p", {
                className: "mt-2 text-sm text-gray-500 dark:text-dark-300",
                children:
                  "Você precisa da role ou permissão apropriada para visualizar usuários.",
              }),
            ],
          }),
        }),
      });
}
export { Nr as default };
