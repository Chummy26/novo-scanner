/* ========================================
 * Plans & Licenses Page
 * Exibe licencas ativas do usuario e planos disponiveis para compra
 * ======================================== */

import {
  a as t,
  h as k,
  j as e,
  S as y,
  T as j,
  e as m,
  B as v,
} from "./index-Bx06KCE-.js";
import { t as u } from "./index-mwGaaYkF.js";
import { P as N } from "./Page-hVEPjFz_.js";
import { g as w, f as L } from "./licensesApi-BVBHUoUP.js";
import { F as R } from "./ShieldCheckIcon-BsJEEeR_.js";
import { F as M } from "./ClockIcon-c5Zk21LG.js";
import { F as E } from "./CurrencyDollarIcon-DU3HPuAk.js";
import { F as S } from "./CheckCircleIcon-oyDfoM4P.js";

/* ---- Bolt Icon (Software plan) ---- */

function A({ title: svgTitle, titleId: svgTitleId, ...restProps }, forwardedRef) {
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
        ref: forwardedRef,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? t.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    t.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
    }),
  );
}
const F = t.forwardRef(A);

/* ---- CPU Chip Icon (Robot plan) ---- */

function B({ title: svgTitle, titleId: svgTitleId, ...restProps }, forwardedRef) {
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
        ref: forwardedRef,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? t.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    t.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z",
    }),
  );
}
const D = t.forwardRef(B),

  /* ---- Date Helpers ---- */

  parseDate = (rawDate) => {
    if (!rawDate) return null;
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? null : date;
  },
  daysUntilExpiry = (endDate) => {
    const parsed = parseDate(endDate);
    if (!parsed) return 0;
    const now = new Date(),
      diffMs = parsed.getTime() - now.getTime(),
      diffDays = Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

/* ---- Plans Page Component ---- */

function O() {
  const { user: currentUser } = k(),
    [licenses, setLicenses] = t.useState([]),
    [isLoading, setIsLoading] = t.useState(!0),

    /* Static plan definitions */
    availablePlans = t.useMemo(
      () => [
        {
          type: 2,
          name: "Software",
          description: "Sinais de arbitragem Spot e Futuros",
          price: "R$289,00",
          period: "/mês",
          features: [
            "Sinais de arbitragem Spot",
            "Sinais de arbitragem Futuros",
            "Mais de 800 moedas",
            "Suporte a +8 corretoras",
            "Análise em Tempo Real",
            "Sem limitações de uso",
          ],
          buyLink: "http://t.me/devborba",
          popular: !0,
          icon: F,
        },
        {
          type: 3,
          name: "Robô",
          description: "Robô de arbitragem de criptomoedas",
          price: "R$300,00",
          period: "/mês",
          features: [
            "Robô de arbitragem dedicado",
            "Estratégias personalizáveis",
            "Sem limitações de uso",
          ],
          buyLink: "http://t.me/devborba",
          popular: !1,
          icon: D,
        },
      ],
      [],
    );

  /* Load user licenses on mount */
  t.useEffect(() => {
    (async () => {
      if (currentUser?.id) {
        setIsLoading(!0);
        try {
          const userLicenses = (await L())
            .filter((item) => item.user_id === currentUser.id)
            .sort((a, b) => {
              const b = new Date(a.end_date).getTime();
              return new Date(b.end_date).getTime() - b;
            });
          setLicenses(userLicenses);
        } catch (i) {
          console.error(i);
          u.error("Erro ao carregar suas licenças.");
        } finally {
          setIsLoading(!1);
        }
      }
    })();
  }, [currentUser?.id]);

  const activeLicenses = t.useMemo(
      () =>
        licenses.filter((item) => {
          const remainingDays = daysUntilExpiry(item.end_date);
          return item.status === "active" && remainingDays >= 0;
        }),
      [licenses],
    ),
    handleBuyClick = (buyLink) => {
      if (!buyLink || buyLink === "#") {
        u.info("Link de compra em breve!");
        return;
      }
      window.open(buyLink, "_blank");
    };

  /* ---- Render ---- */

  return e.jsx(N, {
    title: "Meus Planos",
    children: e.jsxs("div", {
      className: "w-full px-(--margin-x) pb-10 pt-5 lg:pt-6 transition-content",
      children: [
        /* Page Header */
        e.jsxs("div", {
          className: "mb-8",
          children: [
            e.jsx("h1", {
              className: "text-2xl font-bold text-gray-900 dark:text-dark-50",
              children: "Assinaturas & Licenças",
            }),
            e.jsx("p", {
              className: "mt-1 text-sm text-gray-500 dark:text-dark-300",
              children:
                "Gerencie suas licenças ativas ou faça um upgrade no seu plano.",
            }),
          ],
        }),

        /* Main Grid: Active Licenses + Available Plans */
        e.jsxs("div", {
          className: "grid grid-cols-1 gap-8 lg:grid-cols-3 items-start",
          children: [
            /* Active Licenses Section */
            e.jsxs("section", {
              className: "lg:col-span-2",
              children: [
                e.jsxs("h2", {
                  className:
                    "text-lg font-semibold text-gray-900 dark:text-dark-50 mb-4 flex items-center gap-2",
                  children: [
                    e.jsx(R, {
                      className: "size-5 text-primary-500",
                    }),
                    "Minhas Licenças Ativas",
                  ],
                }),
                isLoading
                  ? e.jsx("div", {
                      className: "grid gap-4 md:grid-cols-2",
                      children: [1, 2].map((item) =>
                        e.jsx(
                          y,
                          {
                            className: "h-32 rounded-xl",
                          },
                          item,
                        ),
                      ),
                    })
                  : activeLicenses.length === 0
                    ? e.jsx("div", {
                        className:
                          "rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-dark-600 dark:bg-dark-800/50",
                        children: e.jsx("p", {
                          className: "text-gray-500 dark:text-dark-300",
                          children:
                            "Você não possui nenhuma licença ativa no momento.",
                        }),
                      })
                    : e.jsx("div", {
                        className: "grid gap-4 md:grid-cols-2",
                        children: activeLicenses.map((props) => {
                          const remainingDays = daysUntilExpiry(props.end_date),
                            isExpiringSoon = remainingDays <= 5;
                          return e.jsxs(
                            "div",
                            {
                              className:
                                "relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-dark-700 dark:bg-dark-800",
                              children: [
                                /* License Header */
                                e.jsxs("div", {
                                  className:
                                    "flex items-start justify-between mb-4",
                                  children: [
                                    e.jsx("div", {
                                      children: e.jsx("h3", {
                                        className:
                                          "font-bold text-gray-900 dark:text-dark-50",
                                        children: w(props.type),
                                      }),
                                    }),
                                    e.jsx(j, {
                                      color: isExpiringSoon ? "warning" : "success",
                                      variant: "soft",
                                      className: "text-xs",
                                      children: isExpiringSoon ? "Renovar" : "Ativa",
                                    }),
                                  ],
                                }),
                                /* License Details */
                                e.jsxs("div", {
                                  className: "space-y-3",
                                  children: [
                                    e.jsxs("div", {
                                      className:
                                        "flex items-center justify-between text-sm",
                                      children: [
                                        e.jsxs("span", {
                                          className:
                                            "text-gray-500 dark:text-dark-300 flex items-center gap-1.5",
                                          children: [
                                            e.jsx(M, {
                                              className: "size-4",
                                            }),
                                            "Expira em:",
                                          ],
                                        }),
                                        e.jsxs("span", {
                                          className: m(
                                            "font-medium",
                                            isExpiringSoon
                                              ? "text-amber-600 dark:text-amber-400"
                                              : "text-gray-900 dark:text-dark-50",
                                          ),
                                          children: [remainingDays, " dias"],
                                        }),
                                      ],
                                    }),
                                    e.jsxs("div", {
                                      className:
                                        "flex items-center justify-between text-sm",
                                      children: [
                                        e.jsx("span", {
                                          className:
                                            "text-gray-500 dark:text-dark-300",
                                          children: "Válido até:",
                                        }),
                                        e.jsx("span", {
                                          className:
                                            "text-gray-900 dark:text-dark-50",
                                          children: new Date(
                                            props.end_date,
                                          ).toLocaleDateString("pt-BR"),
                                        }),
                                      ],
                                    }),
                                    /* Expiry Progress Bar */
                                    e.jsx("div", {
                                      className:
                                        "mt-4 pt-4 border-t border-gray-100 dark:border-dark-700",
                                      children: e.jsx("div", {
                                        className:
                                          "h-2 w-full rounded-full bg-gray-100 dark:bg-dark-700 overflow-hidden",
                                        children: e.jsx("div", {
                                          className: m(
                                            "h-full rounded-full transition-all duration-500",
                                            isExpiringSoon
                                              ? "bg-amber-500"
                                              : "bg-emerald-500",
                                          ),
                                          style: {
                                            width: `${Math.min(100, Math.max(5, (remainingDays / 30) * 100))}%`,
                                          },
                                        }),
                                      }),
                                    }),
                                  ],
                                }),
                              ],
                            },
                            props.id,
                          );
                        }),
                      }),
              ],
            }),

            /* Available Plans Section */
            e.jsxs("section", {
              className: "lg:col-span-1",
              children: [
                e.jsxs("h2", {
                  className:
                    "text-lg font-semibold text-gray-900 dark:text-dark-50 mb-4 flex items-center gap-2",
                  children: [
                    e.jsx(E, {
                      className: "size-5 text-primary-500",
                    }),
                    "Planos Disponíveis",
                  ],
                }),
                e.jsx("div", {
                  className: "grid gap-6",
                  children: availablePlans.map((props) => {
                    const PlanIcon = props.icon;
                    return e.jsxs(
                      "div",
                      {
                        className: m(
                          "relative card rounded-2xl border p-4 text-center sm:p-6 transition-all duration-300",
                          props.popular
                            ? "dark:border-dark-600 border-gray-200 shadow-xl z-10 bg-white dark:bg-dark-800"
                            : "dark:border-dark-700 border-gray-200 bg-white/50 dark:bg-dark-800/50 hover:bg-white dark:hover:bg-dark-800",
                        ),
                        children: [
                          e.jsx("div", {
                            className: "mt-4 flex justify-center",
                            children: e.jsx(PlanIcon, {
                              className:
                                "text-primary-600 dark:text-primary-400 size-16 stroke-1",
                            }),
                          }),
                          e.jsxs("div", {
                            className: "mt-5",
                            children: [
                              e.jsx("h4", {
                                className:
                                  "dark:text-dark-100 text-xl font-bold text-gray-700",
                                children: props.name,
                              }),
                              e.jsx("p", {
                                className:
                                  "text-sm text-gray-500 dark:text-dark-400 mt-1",
                                children: props.description,
                              }),
                            ],
                          }),
                          /* Price Display */
                          e.jsxs("div", {
                            className:
                              "mt-6 flex items-baseline justify-center gap-1",
                            children: [
                              e.jsx("span", {
                                className:
                                  "text-primary-600 dark:text-primary-400 text-4xl font-extrabold tracking-tight",
                                children: props.price,
                              }),
                              e.jsx("span", {
                                className:
                                  "text-gray-500 dark:text-dark-400 text-sm",
                                children: props.period,
                              }),
                            ],
                          }),
                          /* Feature List */
                          e.jsx("div", {
                            className: "mt-8 space-y-4 text-left",
                            children: props.features.map((item, index) =>
                              e.jsxs(
                                "div",
                                {
                                  className: "flex items-start gap-3",
                                  children: [
                                    e.jsx("div", {
                                      className:
                                        "flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-600/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400",
                                      children: e.jsx(S, {
                                        className: "size-3.5",
                                      }),
                                    }),
                                    e.jsx("span", {
                                      className:
                                        "font-medium text-sm text-gray-600 dark:text-dark-200",
                                      children: item,
                                    }),
                                  ],
                                },
                                index,
                              ),
                            ),
                          }),
                          /* Buy Button */
                          e.jsx("div", {
                            className: "mt-8",
                            children: e.jsx(v, {
                              onClick: () => handleBuyClick(props.buyLink),
                              color: props.popular ? "primary" : "neutral",
                              variant: props.popular ? "filled" : "outlined",
                              className:
                                "w-full justify-center rounded-full py-2.5 font-semibold transition-transform hover:scale-[1.02]",
                              children: props.popular
                                ? "Escolher Plano"
                                : "Começar Agora",
                            }),
                          }),
                        ],
                      },
                      props.type,
                    );
                  }),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
export { O as default };
