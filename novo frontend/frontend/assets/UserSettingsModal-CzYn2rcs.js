/* ==== Imports ==== */
import {
  a as r,
  ag as je,
  ah as Ne,
  j as e,
  B as F,
  af as Le,
  f as Ee,
  L as Se,
  e as I,
  u as oe,
  W as Me,
  p as ne,
  t as Fe,
  h as ie,
  aa as Ie,
  J as Ae,
  V as Te,
  I as Z,
  a3 as Re,
  ai as De,
} from "./index-Bx06KCE-.js";
import { G as Be } from "./iconBase-BPc6woXW.js";
import { c as ze, g as Pe, b as Ze, p as Oe } from "./discordLink-BQxtRaU4.js";
import { v as Ve, D as He, L as Ue, a as $e } from "./index-C5vO_a11.js";
import { F as _e } from "./Cog6ToothIcon-EOZD7MO5.js";
import { B as de, W as le, d as ce, j as me, K as U } from "./tabs-Cdkz3LDK.js";
import { K as q, O as $ } from "./transition-Cxix63ts.js";
import { i as We, F as J, j as Ke, k as qe } from "./discord-BL8Te9RE.js";
import { t as N } from "./index-mwGaaYkF.js";
import { h as ue, z as he, Q as pe } from "./dialog-DOjFQwF9.js";
import { F as fe } from "./XMarkIcon-mqVC0SZA.js";
import { F as ge } from "./UserIcon-B-URsuU3.js";
import { a as Ge, F as Je } from "./WalletIcon-BygHaYK8.js";
import { F as Qe } from "./CurrencyDollarIcon-DU3HPuAk.js";
import { F as Ye } from "./ShieldCheckIcon-BsJEEeR_.js";
import { F as Xe } from "./CreditCardIcon-BLR1nsX7.js";
import { k as Q } from "./authApi-ObFgLF0e.js";
import { l as er, F as Y, s as rr } from "./userPreferences-DJ2q-do7.js";
import { F as ar } from "./KeyIcon-CgJXeIvo.js";
import { y as V, K as H } from "./radio-group-CRUASA4L.js";
const tr = (a, t, s, d) => {
    const m = [
      s,
      {
        code: t,
        ...(d || {}),
      },
    ];
    if (a?.services?.logger?.forward)
      return a.services.logger.forward(m, "warn", "react-i18next::", !0);
    if (R(m[0])) {
      m[0] = `react-i18next:: ${m[0]}`;
    }
    a?.services?.logger?.warn
      ? a.services.logger.warn(...m)
      : console?.warn && console.warn(...m);
  },
  X = {},
  W = (a, t, s, d) => {
    (R(s) && X[s]) || (R(s) && (X[s] = new Date()), tr(a, t, s, d));
  },
  xe = (a, t) => () => {
    if (a.isInitialized) t();
    else {
      const s = () => {
        setTimeout(() => {
          a.off("initialized", s);
        }, 0);
        t();
      };
      a.on("initialized", s);
    }
  },
  K = (a, t, s) => {
    a.loadNamespaces(t, xe(a, s));
  },
  ee = (a, t, s, d) => {
    if (
      (R(s) && (s = [s]),
      a.options.preload && a.options.preload.indexOf(t) > -1)
    )
      return K(a, s, d);
    s.forEach((item) => {
      if (a.options.ns.indexOf(item) < 0) {
        a.options.ns.push(item);
      }
    });
    a.loadLanguages(t, xe(a, d));
  },
  sr = (a, t, s = {}) => {
    return !t.languages || !t.languages.length
      ? (W(t, "NO_LANGUAGES", "i18n.languages were undefined or empty", {
          languages: t.languages,
        }),
        !0)
      : t.hasLoadedNamespace(a, {
          lng: s.lng,
          precheck: (d, m) => {
            if (
              s.bindI18n &&
              s.bindI18n.indexOf("languageChanging") > -1 &&
              d.services.backendConnector.backend &&
              d.isLanguageChangingTo &&
              !m(d.isLanguageChangingTo, a)
            )
              return !1;
          },
        });
  },
  R = (a) => typeof a == "string",
  or = (a) => {
    return typeof a == "object" && a !== null;
  },
  nr = r.createContext();
class ir {
  constructor() {
    this.usedNamespaces = {};
  }
  addUsedNamespaces(t) {
    t.forEach((item) => {
      this.usedNamespaces[item] || (this.usedNamespaces[item] = !0);
    });
  }
  getUsedNamespaces() {
    return Object.keys(this.usedNamespaces);
  }
}
const dr = (a, t) => {
    const s = r.useRef();
    return (
      r.useEffect(() => {
        s.current = a;
      }, [a, t]),
      s.current
    );
  },
  ke = (a, t, s, d) => a.getFixedT(t, s, d),
  lr = (a, t, s, d) => r.useCallback(ke(a, t, s, d), [a, t, s, d]),
  oa = (a, t = {}) => {
    const { i18n: s } = t,
      { i18n: d, defaultNS: m } = r.useContext(nr) || {},
      c = s || d || je();
    if ((c && !c.reportNamespaces && (c.reportNamespaces = new ir()), !c)) {
      W(
        c,
        "NO_I18NEXT_INSTANCE",
        "useTranslation: You will need to pass in an i18next instance by using initReactI18next",
      );
      const l = (n, p) => {
          if (R(p)) {
            return p;
          }
          if (or(p) && R(p.defaultValue)) {
            return p.defaultValue;
          }
          if (Array.isArray(n)) {
            return n[n.length - 1];
          }
          return n;
        },
        i = [l, {}, !1];
      return ((i.t = l), (i.i18n = {}), (i.ready = !1), i);
    }
    if (c.options.react?.wait) {
      W(
        c,
        "DEPRECATED_OPTION",
        "useTranslation: It seems you are still using the old wait option, you may migrate to the new useSuspense behaviour.",
      );
    }
    const k = {
        ...Ne(),
        ...c.options.react,
        ...t,
      },
      { useSuspense: L, keyPrefix: E } = k;
    let x = m || c.options?.defaultNS;
    x = R(x) ? [x] : x || ["translation"];
    c.reportNamespaces.addUsedNamespaces?.(x);
    const g =
        (c.isInitialized || c.initializedStoreOnce) &&
        x.every((item) => sr(item, c, k)),
      C = lr(c, t.lng || null, k.nsMode === "fallback" ? x : x[0], E),
      y = () => C,
      v = () => ke(c, t.lng || null, k.nsMode === "fallback" ? x : x[0], E),
      [b, w] = r.useState(y);
    let j = x.join();
    if (t.lng) {
      j = `${t.lng}${j}`;
    }
    const A = dr(j),
      u = r.useRef(!0);
    r.useEffect(() => {
      const { bindI18n: l, bindI18nStore: i } = k;
      u.current = !0;
      if (!g && !L) {
        t.lng
          ? ee(c, t.lng, x, () => {
              if (u.current) {
                w(v);
              }
            })
          : K(c, x, () => {
              if (u.current) {
                w(v);
              }
            });
      }
      if (g && A && A !== j && u.current) {
        w(v);
      }
      const n = () => {
        if (u.current) {
          w(v);
        }
      };
      return (
        l && c?.on(l, n),
        i && c?.store.on(i, n),
        () => {
          u.current = !1;
          if (c && l) {
            l?.split(" ").forEach((p) => c.off(p, n));
          }
          if (i && c) {
            i.split(" ").forEach((item) => c.store.off(item, n));
          }
        }
      );
    }, [c, j]);
    r.useEffect(() => {
      if (u.current && g) {
        w(y);
      }
    }, [c, E, g]);
    const h = [b, c, g];
    if (((h.t = b), (h.i18n = c), (h.ready = g), g || (!g && !L))) return h;
    throw new Promise((l) => {
      t.lng ? ee(c, t.lng, x, () => l()) : K(c, x, () => l());
    });
  };
function cr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    }),
  );
}
const mr = r.forwardRef(cr);
function ur({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z",
    }),
  );
}
const hr = r.forwardRef(ur);
function pr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12",
    }),
  );
}
const fr = r.forwardRef(pr);
function gr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    }),
  );
}
const xr = r.forwardRef(gr);
function kr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46",
    }),
  );
}
const yr = r.forwardRef(kr);
function vr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42",
    }),
  );
}
const br = r.forwardRef(vr);
function Cr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z",
    }),
  );
}
const re = r.forwardRef(Cr);
function wr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
    }),
  );
}
const jr = r.forwardRef(wr);
function Nr({ title: a, titleId: t, ...s }, d) {
  return r.createElement(
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
        ref: d,
        "aria-labelledby": t,
      },
      s,
    ),
    a
      ? r.createElement(
          "title",
          {
            id: t,
          },
          a,
        )
      : null,
    r.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    }),
  );
}
const Lr = r.forwardRef(Nr),
  ye = {
    dashboards: {
      id: "dashboards",
      type: "item",
      path: "/dashboards",
      title: "Dashboards",
      transKey: "nav.dashboards.dashboards",
      icon: "dashboards",
    },
  },
  na = Array.from(Object.values(ye)),
  S = "/dashboards",
  M = (a, t) => `${a}${t}`,
  Er = {
    ...ye.dashboards,
    type: "root",
    childs: [
      {
        id: "dashboards.scanner",
        path: M(S, "/scanner"),
        type: "item",
        title: "Scanner",
        transKey: "nav.dashboards.scanner",
        icon: "dashboards.scanner",
        requiredLicenses: [2],
      },
      {
        id: "dashboards.monitoramento",
        path: M(S, "/monitoramento"),
        type: "item",
        title: "Monitoramento",
        transKey: "nav.dashboards.monitoramento",
        icon: "dashboards.monitoramento",
        requiredLicenses: [2],
      },
      {
        id: "dashboards.lancamentos",
        path: M(S, "/lancamentos"),
        type: "item",
        title: "Lancamentos",
        transKey: "nav.dashboards.lancamentos",
        icon: "dashboards.lancamentos",
        requiredLicenses: [2],
      },
      {
        id: "dashboards.home",
        path: M(S, "/home"),
        type: "item",
        title: "Home",
        transKey: "nav.dashboards.home",
        icon: "dashboards.home",
      },
      {
        id: "dashboards.plans",
        path: M(S, "/plans"),
        type: "item",
        title: "Meus Planos",
        transKey: "nav.dashboards.plans",
        icon: "dashboards.plans",
      },
      {
        id: "dashboards.auth",
        path: M(S, "/auth"),
        type: "item",
        title: "Acessos",
        transKey: "nav.dashboards.auth",
        icon: "dashboards.auth",
        roles: ["admin"],
      },
      {
        id: "dashboards.users",
        path: M(S, "/users"),
        type: "item",
        title: "Usuários",
        transKey: "nav.dashboards.users",
        icon: "dashboards.users",
        roles: ["admin", "users"],
        permissions: [
          "read:users",
          "create:users",
          "update:users",
          "delete:users",
        ],
      },
      {
        id: "dashboards.licenses",
        path: M(S, "/licenses"),
        type: "item",
        title: "Licenças",
        transKey: "nav.dashboards.licenses",
        icon: "dashboards.licenses",
        roles: ["admin", "licences"],
        permissions: [
          "read:licenses, create:licenses, update:licenses, delete:licenses",
        ],
      },
      {
        id: "dashboards.payments",
        path: M(S, "/payments"),
        type: "item",
        title: "Pagamentos",
        transKey: "nav.dashboards.payments",
        icon: "dashboards.payments",
        roles: ["admin", "payments"],
        permissions: [
          "read:payments",
          "create:payments",
          "update:payments",
          "delete:payments",
        ],
      },
      {
        id: "dashboards.operacoes",
        path: M(S, "/operacoes"),
        type: "item",
        title: "Operacoes",
        transKey: "nav.dashboards.operacoes",
        icon: "dashboards.operacoes",
        roles: ["admin"],
      },
      {
        id: "dashboards.coins",
        path: M(S, "/coins"),
        type: "item",
        title: "Moedas",
        transKey: "nav.dashboards.coins",
        icon: "dashboards.coins",
      },
    ],
  },
  ia = [Er];
function Sr(a) {
  return Be({
    attr: {
      viewBox: "0 0 512 512",
    },
    child: [
      {
        tag: "path",
        attr: {
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: "32",
          d: "M464 128 240 384l-96-96m0 96-96-96m320-160L232 284",
        },
        child: [],
      },
    ],
  })(a);
}
const ve = (a) =>
    r.createElement(
      "svg",
      {
        width: 24,
        height: 24,
        viewBox: "0 0 24 24",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...a,
      },
      r.createElement("path", {
        d: "M6 8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V9.83095C18 11.2503 18.3857 12.6429 19.116 13.8599L19.6694 14.7823C20.0364 15.3941 20.22 15.7 20.2325 15.9497C20.252 16.3366 20.0463 16.6999 19.7045 16.8823C19.4839 17 19.1272 17 18.4138 17H5.5863C4.87286 17 4.51614 17 4.29549 16.8823C3.95374 16.6999 3.74803 16.3366 3.7675 15.9497C3.78006 15.7 3.96359 15.3941 4.33065 14.7823L4.88407 13.8599C5.61428 12.6429 6 11.2503 6 9.83098V8Z",
        fill: "currentColor",
        fillOpacity: 0.3,
      }),
      r.createElement("path", {
        d: "M14.35 18C14.4328 18 14.5007 18.0673 14.493 18.1498C14.4484 18.6254 14.1923 19.0746 13.7678 19.4142C13.2989 19.7893 12.663 20 12 20C11.337 20 10.7011 19.7893 10.2322 19.4142C9.80772 19.0746 9.55165 18.6254 9.50702 18.1498C9.49928 18.0673 9.56716 18 9.65 18L12 18L14.35 18Z",
        fill: "currentColor",
      }),
    ),
  Mr = (a) =>
    r.createElement(
      "svg",
      {
        viewBox: "0 0 236 298",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...a,
      },
      r.createElement("path", {
        opacity: 0.5,
        d: "M203.08 293C203.08 295.42 186.95 297.38 167.08 297.38C147.21 297.38 131.08 295.38 131.08 293C131.08 290.62 147.2 288.63 167.08 288.63C186.96 288.63 203.08 290.62 203.08 293Z",
        fill: "#E8EBF2",
      }),
      r.createElement("path", {
        d: "M68 3.79C68 3.79 62.41 -0.600002 56 1.59C49.59 3.78 44.73 14.46 43 23.14C41.27 31.82 34.62 38.4 36.22 48.58C37.82 58.76 49.39 60.35 63.36 61.85C77.33 63.35 84.91 61.65 91.49 52.47C98.07 43.29 95.28 32.12 91.39 22.24C87.5 12.36 81.02 3.19 75.63 1.49C70.24 -0.210001 68 3.79 68 3.79Z",
        style: {
          stroke: "var(--dark)",
          fill: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M44.9 56C45.8433 56.4242 46.8243 56.759 47.83 57",
        stroke: "#E8EBF2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M66.6 10.9C64.3216 15.9904 61.4338 20.7854 58 25.18C52.28 32.53 39.63 39.47 38.82 47.18C38.6899 48.2122 38.7803 49.2604 39.0854 50.2551C39.3906 51.2497 39.9034 52.1683 40.59 52.95",
        stroke: "#E8EBF2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M89.81 47.77C89.3966 48.7379 88.866 49.6514 88.23 50.49",
        stroke: "#E8EBF2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M85 28.45C85 28.45 91.43 35.87 90.81 43.79",
        stroke: "#E8EBF2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M65.38 6.80999C62.8739 6.55491 60.3431 6.90389 57.9996 7.82774C55.6561 8.75158 53.5679 10.2234 51.91 12.12C51.68 12.38 51.47 12.64 51.27 12.9",
        stroke: "#E8EBF2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M28.49 195.3L27.24 214.54C27.24 214.54 21.92 240.35 20.24 250.99C18.56 261.63 15.48 277.81 14.92 277.81C14.36 277.81 5.18002 283.36 2.24002 287.89C-0.699985 292.42 3.03001 294.34 7.11001 292.89C11.19 291.44 16.73 287.34 18.54 282.47C20.35 277.6 21.25 275.79 21.37 275C21.49 274.21 40.84 222.26 42.76 216.71C44.68 211.16 48.76 194.86 48.76 194.86L58.27 162.6C58.27 162.6 68.45 195.77 68.57 197.24C68.69 198.71 79.09 283.49 79.57 286.66C80.05 289.83 79.91 292.09 81.83 292.77C83.75 293.45 88.28 293.45 90.66 293.45C93.04 293.45 101.3 294.7 105.37 293.68C109.44 292.66 109.9 291.98 107.07 289.94C104.24 287.9 88.52 286.6 87.07 280.66C86.95 280.21 86.84 192.94 86.84 192.94C86.84 192.94 85.48 164.08 83.22 155.94H30.92L28.49 195.3Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M7.10001 292.87C11.17 291.39 16.72 287.32 18.53 282.45L18.91 281.45C16.6 283.91 12.91 287.33 12.91 287.33C12.6839 286.17 12.1794 285.082 11.44 284.16C11.1174 283.804 10.7041 283.543 10.2444 283.404C9.7847 283.264 9.2958 283.253 8.83001 283.37L12.83 278.97C9.83001 280.83 4.43 284.63 2.31 287.9C-0.719998 292.41 3.00001 294.34 7.10001 292.87Z",
        style: {
          stroke: "var(--dark)",
          fill: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M107 289.92C105.06 288.53 97.09 287.48 91.77 285.05C91.5505 285.237 91.379 285.473 91.27 285.74C90.9323 286.698 90.6682 287.681 90.48 288.68L79.48 286.33V286.64C79.93 289.81 79.82 292.07 81.74 292.75C83.66 293.43 88.19 293.43 90.57 293.43C92.95 293.43 101.21 294.68 105.28 293.66C109.35 292.64 109.87 292 107 289.92Z",
        style: {
          stroke: "var(--dark)",
          fill: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M43.73 109C43.73 109 38.54 111.39 32.26 122.67C25.39 134.98 26.57 141.82 26.47 156.67C26.37 171.52 26.07 196.17 26.07 196.17C26.07 196.17 45.07 201.26 58.7 200.46C72.33 199.66 89.62 196.57 89.62 196.57C89.62 196.57 85.93 146.29 82.44 131.83C78.95 117.37 76.85 110.83 76.85 110.83C70.1048 111.766 63.2699 111.867 56.5 111.13C44.93 110 43.73 109 43.73 109Z",
        style: {
          stroke: "var(--dark)",
          fill: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M65.59 153.47C66.11 155.18 66.59 156.91 67.01 158.64",
        stroke: "#E8EBF2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M53.54 125.17C57.5684 132.603 61.0251 140.332 63.8801 148.29",
        stroke: "#E8EBF2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M171.12 99.44C170.52 99.04 160.69 97.5 160.69 97.5L158.77 96.71C158.77 96.71 170.67 97.66 170.77 97.16C170.87 96.66 171.27 96.06 170.47 95.96C169.67 95.86 154.36 92.75 154.36 92.75C154.36 92.75 158.25 89.07 158.75 88.27C159.25 87.47 159.94 85.87 159.14 85.87C158.34 85.87 158.14 86.37 157.05 87.07C155.96 87.77 151.66 89.47 150.46 90.46C149.26 91.45 145.68 94.05 145.68 94.05L104.1 88.33C104.1 88.33 89.5 70.33 86.33 66.49C84.1264 63.9274 81.6178 61.6438 78.86 59.69C75.8 58.34 75.86 60.6 75.86 60.6L82.25 89C82.25 89 98.78 98.85 99.8 98.85C100.82 98.85 145.48 100.33 145.48 100.33C145.48 100.33 148.48 101.73 150.36 102.92C152.24 104.11 164.23 107.92 164.23 107.92C164.23 107.92 165.03 107.52 164.13 106.82C163.23 106.12 157.45 103.33 157.45 103.33L169.45 105.93C169.45 105.93 170.15 105.43 169.85 104.93C169.55 104.43 158.85 100.34 158.85 100.34L170.85 100.94C170.85 100.94 171.71 99.84 171.12 99.44Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M101.59 85.24C97.28 79.93 88.67 69.33 86.33 66.49C84.1264 63.9274 81.6178 61.6438 78.86 59.69C75.8 58.34 75.86 60.6 75.86 60.6L82.25 89C82.25 89 89.71 93.44 94.91 96.36L101.59 85.24Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M57.4 57.26C57.4 57.26 48.72 57.66 43.4 63.55C38.08 69.44 38.71 82.4 40.91 90.18C43.11 97.96 45.91 102.25 45.3 104.95C44.69 107.65 42.51 108.54 43.7 111.03C44.89 113.52 51.78 116.22 63.95 115.82C76.12 115.42 78.42 112.82 78.52 110.54C78.62 108.26 77.72 106.35 78.02 104.95C78.32 103.55 87.1 95.77 87.1 87.19C87.1 78.61 83.31 75.62 82.41 69.43C81.51 63.24 81.81 62.35 78.12 59.65C74.43 56.95 62.29 55.56 57.4 57.26Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M53.46 87C50.559 89.4276 47.339 91.4464 43.89 93",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M54.42 88C54.42 88 52.27 94.94 47 98.77",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M75.96 63.54L76.96 73.12L72.76 68.23L75.96 63.54Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M70.37 73.92L75.96 63.54L70.87 58.06L70.37 73.92Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M59.6 40.3C60.4717 43.7587 60.9051 47.3132 60.89 50.88C60.8609 53.1895 60.6266 55.4919 60.19 57.76L70.37 73.92L73.26 58.92L75.16 48.54C75.16 48.54 63.59 47.88 59.6 40.3Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M69.77 65.24L70.37 73.92L67.38 69.23L69.77 65.24Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M56.8 57.36L66.08 74.02L69.7701 65.24L59.9 51.67L56.8 57.36Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M219.38 65.13H135.17V134.23H219.38V65.13Z",
        style: {
          fill: "var(--primary)",
        },
      }),
      r.createElement("path", {
        opacity: 0.2,
        d: "M219.38 65.13H135.17V134.23H219.38V65.13Z",
        fill: "black",
      }),
      r.createElement("path", {
        d: "M219.38 65.13H135.17V134.23H219.38V65.13Z",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M201.55 65.13H117.34V134.23H201.55V65.13Z",
        style: {
          stroke: "var(--dark)",
          fill: "var(--primary)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M233.25 157.49C230.55 153.21 219.38 134.23 219.38 134.23H201.56L210.73 157.49H233.25Z",
        style: {
          fill: "var(--primary)",
        },
      }),
      r.createElement("path", {
        opacity: 0.2,
        d: "M233.25 157.49C230.55 153.21 219.38 134.23 219.38 134.23H201.56L210.73 157.49H233.25Z",
        fill: "black",
      }),
      r.createElement("path", {
        d: "M233.25 157.49C230.55 153.21 219.38 134.23 219.38 134.23H201.56L210.73 157.49H233.25Z",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M103.42 157.49C106.12 153.21 117.28 134.23 117.28 134.23H135.11L125.94 157.49H103.42Z",
        style: {
          fill: "var(--primary)",
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M117.28 134.23L109.53 157.49H197.48L201.56 134.23H117.28Z",
        style: {
          stroke: "var(--dark)",
          fill: "var(--primary)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M230.22 90.13V113.27",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M234.6 100.14V118.9",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M108.29 113.27V127.65",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M104.54 121.4V132.65",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M42.93 82.1C45.9142 85.48 49.3777 88.4044 53.21 90.78C59.21 94.37 81.21 106.84 82.94 107.54C84.67 108.24 137.21 99.66 137.21 99.66C137.21 99.66 140.21 101.06 142.1 102.25C143.99 103.44 155.97 107.25 155.97 107.25C155.97 107.25 156.77 106.85 155.87 106.16C154.97 105.47 149.19 102.66 149.19 102.66L161.19 105.26C161.19 105.26 161.89 104.76 161.59 104.26C161.29 103.76 150.59 99.67 150.59 99.67L162.59 100.27C162.59 100.27 163.49 99.17 162.89 98.77C162.29 98.37 150 95.57 150 95.57C150 95.57 163.07 94.47 163.17 93.97C163.27 93.47 163.67 92.88 162.87 92.78C162.07 92.68 145.71 91.08 145.71 91.08C145.71 91.08 150 88.39 150.5 87.59C151 86.79 151.7 85.19 150.9 85.19C150.1 85.19 149.9 85.69 148.81 86.39C147.72 87.09 143.42 88.79 142.22 89.78C141.02 90.77 137.43 93.38 137.43 93.38L89.35 93.48L59.5 69.93",
        fill: "#E8EBF2",
      }),
      r.createElement("path", {
        d: "M42.93 82.1C45.9142 85.48 49.3777 88.4044 53.21 90.78C59.21 94.37 81.21 106.84 82.94 107.54C84.67 108.24 137.21 99.66 137.21 99.66C137.21 99.66 140.21 101.06 142.1 102.25C143.99 103.44 155.97 107.25 155.97 107.25C155.97 107.25 156.77 106.85 155.87 106.16C154.97 105.47 149.19 102.66 149.19 102.66L161.19 105.26C161.19 105.26 161.89 104.76 161.59 104.26C161.29 103.76 150.59 99.67 150.59 99.67L162.59 100.27C162.59 100.27 163.49 99.17 162.89 98.77C162.29 98.37 150 95.57 150 95.57C150 95.57 163.07 94.47 163.17 93.97C163.27 93.47 163.67 92.88 162.87 92.78C162.07 92.68 145.71 91.08 145.71 91.08C145.71 91.08 150 88.39 150.5 87.59C151 86.79 151.7 85.19 150.9 85.19C150.1 85.19 149.9 85.69 148.81 86.39C147.72 87.09 143.42 88.79 142.22 89.78C141.02 90.77 137.43 93.38 137.43 93.38L89.35 93.48L59.5 69.93",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M162.85 92.78C162.06 92.68 145.69 91.08 145.69 91.08C145.69 91.08 149.98 88.39 150.48 87.59C150.98 86.79 151.68 85.19 150.88 85.19C150.08 85.19 149.88 85.69 148.79 86.39C147.7 87.09 143.4 88.79 142.2 89.78C141 90.77 137.41 93.38 137.41 93.38L89.33 93.48L84 89.25C82 92.76 78.26 99.34 75.83 103.68C79.57 105.76 82.4 107.31 82.97 107.54C84.67 108.24 137.24 99.66 137.24 99.66C137.24 99.66 140.24 101.06 142.13 102.25C144.02 103.44 156 107.25 156 107.25C156 107.25 156.8 106.85 155.9 106.16C155 105.47 149.22 102.66 149.22 102.66L161.22 105.26C161.22 105.26 161.92 104.76 161.62 104.26C161.32 103.76 150.62 99.67 150.62 99.67L162.62 100.27C162.62 100.27 163.52 99.17 162.92 98.77C162.32 98.37 150 95.57 150 95.57C150 95.57 163.07 94.47 163.17 93.97C163.27 93.47 163.65 92.88 162.85 92.78Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M82.34 31.92C82.5104 31.7131 82.7356 31.5582 82.9897 31.4731C83.2439 31.388 83.5169 31.3761 83.7775 31.4386C84.0382 31.5012 84.276 31.6357 84.4639 31.8269C84.6517 32.0181 84.7821 32.2583 84.84 32.52C85.007 33.6048 84.9513 34.7122 84.6762 35.7747C84.4011 36.8372 83.9125 37.8326 83.24 38.7C82.14 39.8 81.14 40.1 81.14 38.7C81.4177 36.4201 81.8183 34.1568 82.34 31.92V31.92Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M70.06 14.44C69.7094 19.3066 67.6269 23.8867 64.19 27.35C60.9881 30.4986 57.3673 33.1906 53.43 35.35C53.43 35.35 54.01 38.48 55.19 39.46C56.37 40.44 58.71 40.25 58.71 40.25C60.0704 43.9695 62.2828 47.3189 65.17 50.03C69.86 54.33 75.34 53.94 78.47 47.49C81.6 41.04 83.17 34.57 82.78 30.85L82.39 27.13C82.39 27.13 72.21 21.48 70.06 14.44Z",
        fill: "#E8EBF2",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M69.47 33.78C69.9671 33.78 70.37 33.0636 70.37 32.18C70.37 31.2963 69.9671 30.58 69.47 30.58C68.9729 30.58 68.57 31.2963 68.57 32.18C68.57 33.0636 68.9729 33.78 69.47 33.78Z",
        style: {
          fill: "var(--dark)",
        },
      }),
      r.createElement("path", {
        d: "M74.36 46.55C74.8571 46.55 75.26 45.8337 75.26 44.95C75.26 44.0663 74.8571 43.35 74.36 43.35C73.863 43.35 73.46 44.0663 73.46 44.95C73.46 45.8337 73.863 46.55 74.36 46.55Z",
        style: {
          fill: "var(--dark)",
        },
      }),
      r.createElement("path", {
        d: "M78.15 33.78C78.6471 33.78 79.05 33.0636 79.05 32.18C79.05 31.2963 78.6471 30.58 78.15 30.58C77.6529 30.58 77.25 31.2963 77.25 32.18C77.25 33.0636 77.6529 33.78 78.15 33.78Z",
        style: {
          fill: "var(--dark)",
        },
      }),
      r.createElement("path", {
        d: "M76.35 30.48C76.0064 31.6779 75.9044 32.9323 76.05 34.17C76.35 35.87 77.75 38.76 76.55 39.26C76.0024 39.5098 75.3968 39.6046 74.7991 39.534C74.2014 39.4635 73.6344 39.2304 73.16 38.86",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M66.87 29.29C66.87 29.29 67.35 26.23 71.36 26.58",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      r.createElement("path", {
        d: "M77.61 27.52C77.61 27.52 81.35 24.52 82.56 30.01",
        style: {
          stroke: "var(--dark)",
        },
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
    );
ne.extend(Fe);
const Fr = "http://localhost:8000",
  T = Fr.replace(/\/$/, ""),
  Ir = (a) => {
    if (!a) return null;
    try {
      const t = new URL(a);
      return (
        (t.protocol = t.protocol === "https:" ? "wss:" : "ws:"),
        (t.pathname = "/notifications/ws"),
        (t.search = ""),
        (t.hash = ""),
        t.toString()
      );
    } catch (t) {
      return (console.warn("Could not derive notifications ws url", t), null);
    }
  },
  Ar = Ir(T) ?? "",
  ae = Ar || null,
  te = {
    notification_launches: {
      title: "Lançamentos",
      Icon: ve,
      color: "warning",
    },
    notification_default: {
      title: "Notificações",
      Icon: xr,
      color: "primary",
    },
  },
  _ = [
    {
      key: "all",
      label: "Todas",
      filter: () => !0,
    },
    {
      key: "unread",
      label: "Nao lidas",
      filter: (a) => !a.readAt,
    },
  ],
  se = (props) => {
    const t =
      typeof props?.createdAt == "number"
        ? props.createdAt
        : Date.parse(props?.createdAt ?? "") || Date.now();
    return {
      id:
        (props?.id && String(props.id)) ||
        (typeof crypto < "u" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Date.now().toString(36)),
      title: props?.title || "Notificacao",
      body: props?.body || props?.description || "",
      channel: props?.channel || "notification_default",
      createdAt: t,
      readAt:
        typeof props?.readAt == "number"
          ? props.readAt
          : (props?.readAt && Date.parse(props.readAt)) || null,
      data: props?.data ?? {},
    };
  };
function da() {
  const [a, t] = r.useState([]),
    [s, d] = r.useState(0),
    [m, c] = r.useState(!0),
    [k, L] = r.useState(null),
    [E, x] = r.useState(!1),
    g = r.useRef(null),
    C = r.useRef(null);
  r.useEffect(
    () => (
      (C.current = ze("/sounds/notification4.mp3", {
        volume: 0.8,
        preferenceKey: "launches",
        minIntervalMs: 1e3,
      })),
      () => {
        C.current?.cleanup();
        C.current = null;
      }
    ),
    [],
  );
  const y = r.useCallback(() => {
      C.current?.play();
    }, []),
    v = r.useMemo(() => a.filter((item) => !item.readAt).length, [a]),
    b = r.useMemo(() => {
      const u = _[s];
      return u ? a.filter(u.filter) : a;
    }, [s, a]);
  r.useEffect(() => {
    let u = !1;
    return (
      (async () => {
        c(!0);
        L(null);
        const l = localStorage.getItem("authToken");
        if (!l || !T) {
          c(!1);
          return;
        }
        try {
          const i = await fetch(`${T}/notifications?limit=50`, {
            headers: {
              Authorization: `Bearer ${l}`,
            },
          });
          if (!i.ok) throw new Error("Falha ao carregar notificacoes");
          const n = await i.json().catch(() => ({})),
            p = Array.isArray(n?.items) ? n.items : Array.isArray(n) ? n : [];
          if (!u) {
            const B = p.map(se).sort((a, b) => b.createdAt - a.createdAt);
            t(B);
          }
        } catch {
          u || L("Nao foi possivel carregar as notificacoes.");
        } finally {
          u || c(!1);
        }
      })(),
      () => {
        u = !0;
      }
    );
  }, []);
  r.useEffect(() => {
    const u = localStorage.getItem("authToken");
    if (!(!u || !ae))
      try {
        const h = new URL(ae);
        h.searchParams.has("token") || h.searchParams.set("token", u);
        const l = new WebSocket(h.toString());
        return (
          (g.current = l),
          (l.onmessage = (i) => {
            try {
              const n = JSON.parse(i.data);
              if (
                n?.type === "ping" ||
                n?.type === "connected" ||
                (n?.type && n.type !== "notification") ||
                (n?.message && !n?.notification && !n?.data)
              )
                return;
              const p = n?.data || n?.notification || n,
                D = se(p);
              let B = !1;
              t(
                (z) => (
                  (B = !z.some((props) => props.id === D.id)),
                  [D, ...z.filter((props) => props.id !== D.id)].sort(
                    (a, b) => b.createdAt - a.createdAt,
                  )
                ),
              );
              if (B) {
                y();
              }
            } catch (n) {
              console.error("Failed to parse notification", n);
            }
          }),
          (l.onerror = () => {
            L((i) => i ?? "Falha ao conectar com notificacoes.");
          }),
          () => {
            l.close();
            g.current = null;
          }
        );
      } catch (h) {
        console.error("Could not initialize notifications websocket", h);
      }
  }, [y]);
  const w = async (u) => {
      if (
        (t((l) =>
          l.map((props) =>
            props.id === u && !props.readAt
              ? {
                  ...props,
                  readAt: Date.now(),
                }
              : props,
          ),
        ),
        !T)
      )
        return;
      const h = localStorage.getItem("authToken");
      if (h)
        try {
          await fetch(`${T}/notifications/${u}/read`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${h}`,
            },
          });
        } catch (l) {
          console.error("Failed to mark notification as read", l);
        }
    },
    j = async () => {
      const u = a.filter((item) => !item.readAt).map((props) => props.id);
      if (u.length === 0) return;
      if (
        (x(!0),
        t((l) =>
          l.map((item) =>
            item.readAt
              ? item
              : {
                  ...item,
                  readAt: Date.now(),
                },
          ),
        ),
        !T)
      ) {
        x(!1);
        return;
      }
      const h = localStorage.getItem("authToken");
      if (!h) {
        x(!1);
        return;
      }
      try {
        await Promise.all(
          u.map((item) =>
            fetch(`${T}/notifications/${item}/read`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${h}`,
              },
            }).catch(() => null),
          ),
        );
      } finally {
        x(!1);
      }
    },
    A = (!m && b.length > 0) || a.length > 0;
  return e.jsxs(Ve, {
    className: "relative flex",
    children: [
      e.jsxs(He, {
        as: F,
        variant: "flat",
        isIcon: !0,
        className: "relative size-9 rounded-full",
        children: [
          e.jsx(ve, {
            className: "size-6 text-gray-900 dark:text-dark-100",
          }),
          v > 0 &&
            e.jsx(Le, {
              color: "error",
              isPing: !0,
              className: "top-0 ltr:right-0 rtl:left-0",
            }),
        ],
      }),
      e.jsx(q, {
        enter: "transition ease-out",
        enterFrom: "opacity-0 translate-y-2",
        enterTo: "opacity-100 translate-y-0",
        leave: "transition ease-in",
        leaveFrom: "opacity-100 translate-y-0",
        leaveTo: "opacity-0 translate-y-2",
        children: e.jsx(Ue, {
          anchor: {
            to: "bottom end",
            gap: 8,
          },
          className:
            "z-70 mx-4 flex h-[min(32rem,calc(100vh-6rem))] w-[calc(100vw-2rem)] flex-col rounded-lg border border-gray-150 bg-white shadow-soft dark:border-dark-800 dark:bg-dark-700 dark:shadow-soft-dark sm:m-0 sm:w-80",
          children: ({ close: u }) =>
            e.jsxs("div", {
              className: "flex grow flex-col overflow-hidden",
              children: [
                e.jsx("div", {
                  className: "rounded-t-lg bg-gray-100 dark:bg-dark-800",
                  children: e.jsxs("div", {
                    className: "flex items-center justify-between px-4 pt-2",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          e.jsx("h3", {
                            className:
                              "font-medium text-gray-800 dark:text-dark-100",
                            children: "Notificações",
                          }),
                          v > 0 &&
                            e.jsx(Ee, {
                              color: "primary",
                              className: "h-5 rounded-full px-1.5",
                              variant: "soft",
                              children: v,
                            }),
                        ],
                      }),
                      e.jsx(F, {
                        component: Se,
                        to: "/settings/notifications",
                        className:
                          "size-7 rounded-full ltr:-mr-1.5 rtl:-ml-1.5",
                        isIcon: !0,
                        variant: "flat",
                        onClick: u,
                        children: e.jsx(_e, {
                          className: "size-4.5",
                        }),
                      }),
                    ],
                  }),
                }),
                e.jsxs(de, {
                  as: r.Fragment,
                  selectedIndex: s,
                  onChange: d,
                  children: [
                    e.jsx(le, {
                      className:
                        "hide-scrollbar flex shrink-0 overflow-x-auto scroll-smooth bg-gray-100 px-3 dark:bg-dark-800",
                      children: _.map((props) =>
                        e.jsx(
                          ce,
                          {
                            onFocus: (event) => {
                              const i = event.target,
                                n = i.parentNode;
                              if (n) {
                                n.scrollLeft = i.offsetLeft - n.offsetWidth / 2;
                              }
                            },
                            className: ({ selected: l }) =>
                              I(
                                "shrink-0 scroll-mx-16 whitespace-nowrap border-b-2 px-3 py-2 font-medium",
                                l
                                  ? "border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400"
                                  : "border-transparent hover:text-gray-800 focus:text-gray-800 dark:hover:text-dark-100 dark:focus:text-dark-100",
                              ),
                            as: F,
                            unstyled: !0,
                            children: props.label,
                          },
                          props.key,
                        ),
                      ),
                    }),
                    e.jsx(me, {
                      as: r.Fragment,
                      children: _.map((event) => {
                        const l = a.filter(event.filter),
                          i = !m && l.length === 0;
                        return e.jsxs(
                          U,
                          {
                            className:
                              "custom-scrollbar scrollbar-hide grow space-y-4 overflow-y-auto overflow-x-hidden p-4 outline-hidden",
                            children: [
                              m
                                ? e.jsx(Dr, {})
                                : i
                                  ? e.jsx(Tr, {
                                      message:
                                        event.key === "unread"
                                          ? "Nenhuma notificacao nao lida"
                                          : "Nenhuma notificacao ainda",
                                    })
                                  : l.map((props) =>
                                      e.jsx(
                                        Rr,
                                        {
                                          markRead: w,
                                          data: props,
                                        },
                                        props.id,
                                      ),
                                    ),
                              k &&
                                e.jsx("p", {
                                  className:
                                    "text-[11px] text-error-600 dark:text-error-400",
                                  children: k,
                                }),
                            ],
                          },
                          event.key,
                        );
                      }),
                    }),
                  ],
                }),
                A &&
                  e.jsx("div", {
                    className:
                      "shrink-0 overflow-hidden rounded-b-lg bg-gray-100 dark:bg-dark-800",
                    children: e.jsx(F, {
                      disabled: E || v === 0,
                      className: "w-full rounded-t-none",
                      onClick: j,
                      children: e.jsx("span", {
                        children: E
                          ? "Marcando..."
                          : v > 0
                            ? "Marcar todas como lidas"
                            : "Tudo lido",
                      }),
                    }),
                  }),
              ],
            }),
        }),
      }),
    ],
  });
}
function Tr({ message: a }) {
  const { primaryColorScheme: t, darkColorScheme: s } = oe();
  return e.jsx("div", {
    className: "grid grow place-items-center text-center",
    children: e.jsxs("div", {
      className: "",
      children: [
        e.jsx(Mr, {
          className: "mx-auto w-40",
          style: {
            "--primary": t[500],
            "--dark": s[500],
          },
        }),
        e.jsx("div", {
          className: "mt-6",
          children: e.jsx("p", {
            children: a || "No new notifications yet",
          }),
        }),
      ],
    }),
  });
}
function Rr({ data: a, markRead: t }) {
  const s = te[a.channel] || te.notification_default,
    d = s.Icon,
    m = !a.readAt,
    c = (() => {
      const k = a.data?.coin;
      if (typeof k == "string") return k;
      if (typeof k == "number" || typeof k == "bigint") return k.toString();
    })();
  return e.jsxs("div", {
    className: I(
      "group flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white p-2 transition-colors dark:border-dark-700 dark:bg-dark-700/60",
      m && "bg-primary-50/60 dark:border-primary-500/30",
    ),
    children: [
      e.jsxs("div", {
        className: "flex min-w-0 gap-3",
        children: [
          e.jsx(Me, {
            size: 10,
            initialColor: s.color,
            classNames: {
              display: "rounded-lg",
            },
            children: e.jsx(d, {
              className: "size-4.5",
            }),
          }),
          e.jsxs("div", {
            className: "min-w-0 space-y-1",
            children: [
              e.jsx("div", {
                className: "flex items-center gap-2",
                children: e.jsx("p", {
                  className: I(
                    "-mt-0.5 truncate font-medium text-gray-800 dark:text-dark-100",
                    m && "text-gray-900 dark:text-white",
                  ),
                  children: a.title,
                }),
              }),
              e.jsx("div", {
                className: "text-xs text-gray-600 dark:text-dark-200",
                children: a.body,
              }),
              e.jsxs("div", {
                className:
                  "flex flex-wrap items-center gap-2 text-[11px] text-gray-400 dark:text-dark-300",
                children: [
                  e.jsx("span", {
                    children: ne(a.createdAt).fromNow(),
                  }),
                  c &&
                    e.jsx("span", {
                      className:
                        "rounded bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600 dark:bg-dark-600 dark:text-dark-100",
                      children: c,
                    }),
                ],
              }),
            ],
          }),
        ],
      }),
      m &&
        e.jsx(F, {
          variant: "flat",
          isIcon: !0,
          onClick: () => t(a.id),
          className:
            "size-7 rounded-full opacity-0 transition-opacity group-hover:opacity-100 ltr:-mr-2 rtl:-ml-2",
          children: e.jsx(Sr, {
            className: "size-4",
          }),
        }),
    ],
  });
}
function Dr() {
  return e.jsxs("div", {
    className: "flex flex-col gap-2 text-sm text-gray-500 dark:text-dark-200",
    children: [
      e.jsx("div", {
        className:
          "h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-dark-600",
      }),
      e.jsx("div", {
        className:
          "h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-dark-600",
      }),
    ],
  });
}
function la() {
  const { user: a, refreshUser: t } = ie(),
    [s, d] = r.useState(!1),
    [m, c] = r.useState(!1),
    [k, L] = r.useState(a?.discordId),
    [E, x] = r.useState(a?.discordUsername),
    [g, { open: C, close: y }] = Ie(),
    v = r.useMemo(() => !!k, [k]),
    b = r.useMemo(() => E || k || "", [k, E]);
  r.useEffect(() => {
    L(a?.discordId);
    x(a?.discordUsername);
  }, [a?.discordId, a?.discordUsername]);
  const w = r.useCallback(
    (i) => {
      if ((d(!1), i.status === "success")) {
        if (i.discordId !== void 0) {
          L(i.discordId);
        }
        if (i.discordUsername !== void 0) {
          x(i.discordUsername);
        }
        t().catch(() => {});
        N.success("Discord vinculado com sucesso!");
        y();
        return;
      }
      N.error(i.message || "Nao foi possivel vincular. Tente novamente.");
    },
    [y, t],
  );
  r.useEffect(() => {
    const i = (event) => {
      if (!(event.key !== Ke || !event.newValue))
        try {
          const p = JSON.parse(event.newValue);
          if (!p || p.source !== "discord-oauth") return;
          w({
            status: p.status,
            discordId: p.discordId ?? null,
            discordUsername: p.discordUsername ?? null,
            message: p.message,
          });
        } catch (p) {
          console.warn("Erro ao ler resultado do Discord no storage", p);
        }
    };
    return (
      window.addEventListener("storage", i),
      () => window.removeEventListener("storage", i)
    );
  }, [w]);
  const j = r.useCallback(() => {
      if (s || m) return;
      if (!window.localStorage.getItem("authToken")) {
        N.error("E preciso estar logado para vincular o Discord.");
        return;
      }
      const n = Pe(),
        p = Ze(n);
      if (!p) {
        N.error(
          "Configure o CLIENT_ID e o REDIRECT_URI do Discord antes de continuar.",
        );
        return;
      }
      Oe(n);
      d(!0);
      window.location.assign(p);
    }, [s, m]),
    A = r.useCallback(async () => {
      if (m || s) return;
      const i = We?.trim();
      if (!i) {
        N.error("Link do canal do Discord nao configurado.");
        return;
      }
      const n = /^https?:\/\//i.test(i)
        ? i
        : `${Ae.replace(/\/$/, "")}/${i.replace(/^\//, "")}`;
      c(!0);
      try {
        window.open(n, "_blank", "noopener,noreferrer");
      } catch {
        N.error("Nao foi possivel abrir o canal do Discord.");
      } finally {
        window.setTimeout(() => c(!1), 400);
      }
    }, [m, s]),
    u = () => {
      if (v) {
        A();
        return;
      }
      C();
    },
    h = () => {
      d(!1);
      y();
    },
    l = () => {
      j();
    };
  return e.jsxs(e.Fragment, {
    children: [
      e.jsxs(F, {
        onClick: u,
        variant: "flat",
        isIcon: !0,
        className:
          "relative size-9 rounded-full text-[#5865F2] hover:text-[#4a5ad8]",
        title: "Vincular Discord",
        "aria-label": "Vincular Discord",
        disabled: s || m,
        children: [
          e.jsx(J, {
            className: "size-5",
          }),
          !v &&
            e.jsx("span", {
              className:
                "absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-dark-900",
            }),
        ],
      }),
      e.jsx(q, {
        appear: !0,
        show: g,
        as: r.Fragment,
        children: e.jsxs(ue, {
          as: "div",
          className: "relative z-50",
          onClose: h,
          children: [
            e.jsx($, {
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
            e.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: e.jsx("div", {
                className:
                  "flex min-h-full items-center justify-center p-4 text-center",
                children: e.jsx($, {
                  as: r.Fragment,
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
                        className:
                          "mb-5 flex items-start justify-between gap-4",
                        children: [
                          e.jsxs("div", {
                            children: [
                              e.jsx(pe, {
                                className:
                                  "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                                children: "Vincular Discord",
                              }),
                              e.jsx("p", {
                                className:
                                  "mt-1 text-sm text-gray-600 dark:text-dark-200",
                                children:
                                  "Vamos levar voce para autorizar no Discord e atualizar seu perfil.",
                              }),
                            ],
                          }),
                          e.jsx("button", {
                            onClick: h,
                            className:
                              "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                            "aria-label": "Fechar",
                            children: e.jsx(fe, {
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
                              className:
                                "text-sm text-gray-700 dark:text-dark-100",
                              children: [
                                "Clique em ",
                                e.jsx("strong", {
                                  children: "Vincular agora",
                                }),
                                " para autorizar no Discord. Voltaremos para o app automaticamente.",
                              ],
                            }),
                            b &&
                              e.jsxs("p", {
                                className:
                                  "mt-2 text-xs text-gray-500 dark:text-dark-300",
                                children: ["Usuario atual: ", b],
                              }),
                          ],
                        }),
                      }),
                      e.jsxs("div", {
                        className: "mt-6 flex items-center justify-end gap-3",
                        children: [
                          e.jsx(F, {
                            type: "button",
                            variant: "soft",
                            color: "neutral",
                            onClick: h,
                            disabled: s,
                            children: "Cancelar",
                          }),
                          e.jsxs(F, {
                            onClick: l,
                            color: "primary",
                            className: "gap-2",
                            disabled: s,
                            children: [
                              e.jsx(J, {
                                className: "size-4",
                              }),
                              s ? "Redirecionando..." : "Vincular agora",
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
const Br = "http://t.me/teamopscanner_bot?start=login";
function ca() {
  const a = () => {
    window.open(Br, "_blank", "noopener,noreferrer");
  };
  return e.jsx(F, {
    onClick: a,
    variant: "flat",
    isIcon: !0,
    className:
      "relative size-9 rounded-full text-[#24A1DE] hover:bg-gray-100 hover:text-[#208bbf] dark:hover:bg-dark-600",
    title: "Abrir Telegram Bot",
    "aria-label": "Abrir Telegram Bot",
    children: e.jsx(qe, {
      className: "size-5",
    }),
  });
}
function ma() {
  const { toggle: a, isExpanded: t } = Te();
  return e.jsxs("button", {
    onClick: a,
    className: I(
      t && "active",
      "sidebar-toggle-btn cursor-pointer flex size-7 flex-col justify-center space-y-1.5 text-primary-600 outline-hidden focus:outline-hidden dark:text-primary-400 ltr:ml-0.5 rtl:mr-0.5",
    ),
    children: [e.jsx("span", {}), e.jsx("span", {}), e.jsx("span", {})],
  });
}
const zr = (a) =>
    r.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        ...a,
      },
      r.createElement("path", {
        fill: "currentColor",
        fillOpacity: 0.3,
        d: "M5 14.059c0-1.01 0-1.514.222-1.945.221-.43.632-.724 1.453-1.31l4.163-2.974c.56-.4.842-.601 1.162-.601.32 0 .601.2 1.162.601l4.163 2.974c.821.586 1.232.88 1.453 1.31.222.43.222.935.222 1.945V19c0 .943 0 1.414-.293 1.707C18.414 21 17.943 21 17 21H7c-.943 0-1.414 0-1.707-.293C5 20.414 5 19.943 5 19v-4.94Z",
      }),
      r.createElement("path", {
        fill: "currentColor",
        d: "M3 12.387c0 .267 0 .4.084.441.084.041.19-.04.4-.204l7.288-5.669c.59-.459.885-.688 1.228-.688.343 0 .638.23 1.228.688l7.288 5.669c.21.163.316.245.4.204.084-.04.084-.174.084-.441v-.409c0-.48 0-.72-.102-.928-.101-.208-.291-.355-.67-.65l-7-5.445c-.59-.459-.885-.688-1.228-.688-.343 0-.638.23-1.228.688l-7 5.445c-.379.295-.569.442-.67.65-.102.208-.102.448-.102.928v.409Z",
      }),
      r.createElement("path", {
        fill: "currentColor",
        d: "M11.5 15.5h1A1.5 1.5 0 0 1 14 17v3.5h-4V17a1.5 1.5 0 0 1 1.5-1.5Z",
      }),
      r.createElement("path", {
        fill: "currentColor",
        d: "M17.5 5h-1a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5Z",
      }),
    ),
  Pr = (a) =>
    r.createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...a,
      },
      r.createElement("path", {
        fillOpacity: 0.3,
        fill: "currentColor",
        d: "M2 12.947v-1.771c0-1.047.85-1.913 1.899-1.913 1.81 0 2.549-1.288 1.64-2.868a1.919 1.919 0 0 1 .699-2.607l1.729-.996c.79-.474 1.81-.192 2.279.603l.11.192c.9 1.58 2.379 1.58 3.288 0l.11-.192c.47-.795 1.49-1.077 2.279-.603l1.73.996a1.92 1.92 0 0 1 .699 2.607c-.91 1.58-.17 2.868 1.639 2.868 1.04 0 1.899.856 1.899 1.912v1.772c0 1.047-.85 1.912-1.9 1.912-1.808 0-2.548 1.288-1.638 2.869.52.915.21 2.083-.7 2.606l-1.729.997c-.79.473-1.81.191-2.279-.604l-.11-.191c-.9-1.58-2.379-1.58-3.288 0l-.11.19c-.47.796-1.49 1.078-2.279.605l-1.73-.997a1.919 1.919 0 0 1-.699-2.606c.91-1.58.17-2.869-1.639-2.869A1.911 1.911 0 0 1 2 12.947Z",
      }),
      r.createElement("path", {
        fill: "currentColor",
        d: "M11.995 15.332c1.794 0 3.248-1.464 3.248-3.27 0-1.807-1.454-3.272-3.248-3.272-1.794 0-3.248 1.465-3.248 3.271 0 1.807 1.454 3.271 3.248 3.271Z",
      }),
    ),
  ua = {
    dashboards: zr,
    settings: Pr,
    "dashboards.home": Je,
    "dashboards.plans": Xe,
    "dashboards.monitoramento": mr,
    "dashboards.lancamentos": yr,
    "dashboards.scanner": Lr,
    "dashboards.auth": Ye,
    "dashboards.users": jr,
    "dashboards.coins": Qe,
    "dashboards.licenses": fr,
    "dashboards.payments": Ge,
    "dashboards.operacoes": hr,
    "settings.general": ge,
    "settings.appearance": $e,
  };
function ha({ isOpen: a, onClose: t }) {
  const { user: s, refreshUser: d } = ie(),
    m = oe(),
    [c, k] = r.useState(0),
    L = ["indigo", "blue", "rose"],
    E = ["slate", "gray"],
    x = ["navy", "mirage", "cinder", "black"],
    [g, C] = r.useState({
      name: "",
      email: "",
      discordId: "",
      telegramId: "",
    }),
    [y, v] = r.useState({
      password: "",
      confirmPassword: "",
    }),
    [b, w] = r.useState(null),
    [j, A] = r.useState(!1),
    [u, h] = r.useState(!1);
  r.useEffect(() => {
    if (a && s) {
      (C({
        name: s.name || "",
        email: s.email || "",
        discordId: s.discordId || "",
        telegramId: s.telegramId || "",
      }),
        er().then(w));
    }
  }, [a, s]);
  const l = async (event) => {
      if ((event.preventDefault(), !!s)) {
        A(!0);
        try {
          await Q(s.id, {
            email: g.email,
            name: g.name,
            discordId: g.discordId,
            telegramId: g.telegramId,
          });
          await d();
          N.success("Perfil atualizado com sucesso!");
        } catch (f) {
          console.error(f);
          N.error(f.message || "Erro ao atualizar perfil.");
        } finally {
          A(!1);
        }
      }
    },
    i = async (event) => {
      if ((event.preventDefault(), !!s)) {
        if (y.password !== y.confirmPassword) {
          N.error("As senhas não coincidem.");
          return;
        }
        if (y.password.length < 6) {
          N.error("A senha deve ter pelo menos 6 caracteres.");
          return;
        }
        h(!0);
        try {
          await Q(s.id, {
            password: y.password,
            confirmPassword: y.confirmPassword,
          });
          v({
            password: "",
            confirmPassword: "",
          });
          N.success("Senha alterada com sucesso!");
        } catch (f) {
          N.error(f.message || "Erro ao alterar senha.");
        } finally {
          h(!1);
        }
      }
    },
    n = async (o, f, P) => {
      if (!b) return;
      const G = b[o],
        be = {
          ...b,
          [o]: {
            ...G,
            [f]: P,
          },
        };
      w(be);
      const Ce = {
        [o]: {
          ...G,
          [f]: P,
        },
      };
      try {
        await rr(Ce);
      } catch (we) {
        console.error("Failed to save preference", we);
      }
    },
    p = [
      {
        name: "Perfil",
        icon: ge,
        description: "Dados e acesso",
      },
      {
        name: "Aparência",
        icon: br,
        description: "Personalize o visual",
      },
      {
        name: "Áudio & alertas",
        icon: re,
        description: "Volume e notificações",
      },
    ],
    D = b?.launches?.volume ?? 0.65,
    B = b?.monitoring?.volume ?? 0.7,
    z = b?.scanner?.volume ?? 0.75,
    O = [
      {
        key: "launches",
        title: "Alertas gerais",
        description: "Toque quando novas notificações e lembretes aparecerem.",
        checked: b?.launches?.enableSound ?? !0,
        onChange: (o) => n("launches", "enableSound", o),
        volume: D,
        onVolumeChange: (o) => n("launches", "volume", o),
        icon: Y,
      },
      {
        key: "monitoring",
        title: "Painel de monitoramento",
        description: "Sons de alerta quando o monitoramento for ativado.",
        checked: b?.monitoring?.enableSoundAlerts ?? !1,
        onChange: (o) => n("monitoring", "enableSoundAlerts", o),
        volume: B,
        onVolumeChange: (o) => n("monitoring", "volume", o),
        icon: re,
      },
      {
        key: "scanner",
        title: "Scanner de oportunidades",
        description: "Ativa aviso sonoro quando surgir uma nova oportunidade.",
        checked: b?.scanner?.enableSound ?? !0,
        onChange: (o) => n("scanner", "enableSound", o),
        volume: z,
        onVolumeChange: (o) => n("scanner", "volume", o),
        icon: Y,
      },
    ];
  return e.jsx(q, {
    appear: !0,
    show: a,
    as: r.Fragment,
    children: e.jsxs(ue, {
      as: "div",
      className: "relative z-50",
      onClose: t,
      children: [
        e.jsx($, {
          as: r.Fragment,
          enter: "ease-out duration-300",
          enterFrom: "opacity-0",
          enterTo: "opacity-100",
          leave: "ease-in duration-200",
          leaveFrom: "opacity-100",
          leaveTo: "opacity-0",
          children: e.jsx("div", {
            className: "fixed inset-0 bg-black/30 backdrop-blur-sm",
          }),
        }),
        e.jsx("div", {
          className: "fixed inset-0 overflow-y-auto",
          children: e.jsx("div", {
            className: "flex min-h-full items-center justify-center p-4",
            children: e.jsx($, {
              as: r.Fragment,
              enter: "ease-out duration-300",
              enterFrom: "opacity-0 scale-95",
              enterTo: "opacity-100 scale-100",
              leave: "ease-in duration-200",
              leaveFrom: "opacity-100 scale-100",
              leaveTo: "opacity-0 scale-95",
              children: e.jsxs(he, {
                className:
                  "w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all dark:bg-dark-800",
                children: [
                  e.jsxs("div", {
                    className: "mb-6 flex items-start justify-between gap-3",
                    children: [
                      e.jsxs("div", {
                        className: "space-y-1",
                        children: [
                          e.jsx(pe, {
                            as: "h3",
                            className:
                              "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                            children: "Configurações do Usuário",
                          }),
                          e.jsx("p", {
                            className:
                              "text-sm text-gray-500 dark:text-dark-300",
                            children:
                              "Ajuste perfil, segurança e o jeito que o app toca alertas sonoros.",
                          }),
                        ],
                      }),
                      e.jsx("button", {
                        onClick: t,
                        className:
                          "rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700",
                        children: e.jsx(fe, {
                          className: "size-5",
                        }),
                      }),
                    ],
                  }),
                  e.jsxs(de, {
                    selectedIndex: c,
                    onChange: k,
                    children: [
                      e.jsx(le, {
                        className:
                          "flex w-full items-center gap-1 rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm dark:border-dark-700 dark:bg-dark-800/50",
                        children: p.map((props) =>
                          e.jsxs(
                            ce,
                            {
                              className: ({ selected: f }) =>
                                I(
                                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none",
                                  f
                                    ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:ring-primary-700/50"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-50",
                                ),
                              children: [
                                e.jsx(props.icon, {
                                  className: "size-4",
                                }),
                                props.name,
                              ],
                            },
                            props.name,
                          ),
                        ),
                      }),
                      e.jsxs(me, {
                        className: "mt-6",
                        children: [
                          e.jsxs(U, {
                            className: "space-y-5 focus:outline-none",
                            children: [
                              e.jsxs("form", {
                                onSubmit: l,
                                className:
                                  "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                                children: [
                                  e.jsxs("div", {
                                    className: "flex flex-col gap-1",
                                    children: [
                                      e.jsx("p", {
                                        className:
                                          "text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300",
                                        children: "Perfil",
                                      }),
                                      e.jsx("h4", {
                                        className:
                                          "text-base font-semibold text-gray-900 dark:text-white",
                                        children: "Informações pessoais",
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "text-xs text-gray-500 dark:text-dark-300",
                                        children:
                                          "Nome e contatos para receber alertas.",
                                      }),
                                    ],
                                  }),
                                  e.jsxs("div", {
                                    className:
                                      "mt-4 grid grid-cols-1 gap-4 md:grid-cols-2",
                                    children: [
                                      e.jsx(Z, {
                                        label: "Nome completo",
                                        value: g.name,
                                        onChange: (event) =>
                                          C({
                                            ...g,
                                            name: event.target.value,
                                          }),
                                        placeholder: "Seu nome",
                                      }),
                                      e.jsx(Z, {
                                        label: "Email",
                                        value: g.email,
                                        onChange: (event) =>
                                          C({
                                            ...g,
                                            email: event.target.value,
                                          }),
                                        placeholder: "email@exemplo.com",
                                      }),
                                      e.jsx(Z, {
                                        label: "Discord ID",
                                        value: g.discordId,
                                        onChange: (event) =>
                                          C({
                                            ...g,
                                            discordId: event.target.value,
                                          }),
                                        placeholder: "Ex: 123456789",
                                      }),
                                      e.jsx(Z, {
                                        label: "Telegram ID",
                                        value: g.telegramId,
                                        onChange: (event) =>
                                          C({
                                            ...g,
                                            telegramId: event.target.value,
                                          }),
                                        placeholder: "Ex: 123456789",
                                      }),
                                    ],
                                  }),
                                  e.jsx("div", {
                                    className: "mt-4 flex justify-end",
                                    children: e.jsx(F, {
                                      type: "submit",
                                      color: "primary",
                                      disabled: j,
                                      children: j
                                        ? "Salvando..."
                                        : "Salvar alterações",
                                    }),
                                  }),
                                ],
                              }),
                              e.jsxs("form", {
                                onSubmit: i,
                                className:
                                  "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                                children: [
                                  e.jsxs("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                      e.jsx("div", {
                                        className:
                                          "rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-900/30 dark:text-red-200",
                                        children: e.jsx(ar, {
                                          className: "size-4",
                                        }),
                                      }),
                                      e.jsxs("div", {
                                        children: [
                                          e.jsx("h4", {
                                            className:
                                              "text-base font-semibold text-gray-900 dark:text-white",
                                            children: "Alterar senha",
                                          }),
                                          e.jsx("p", {
                                            className:
                                              "text-xs text-gray-500 dark:text-dark-300",
                                            children:
                                              "Use uma senha forte para manter sua conta segura.",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  e.jsxs("div", {
                                    className:
                                      "mt-4 grid grid-cols-1 gap-4 md:grid-cols-2",
                                    children: [
                                      e.jsx(Z, {
                                        type: "password",
                                        label: "Nova senha",
                                        value: y.password,
                                        onChange: (event) =>
                                          v({
                                            ...y,
                                            password: event.target.value,
                                          }),
                                        placeholder: "******",
                                      }),
                                      e.jsx(Z, {
                                        type: "password",
                                        label: "Confirmar senha",
                                        value: y.confirmPassword,
                                        onChange: (event) =>
                                          v({
                                            ...y,
                                            confirmPassword: event.target.value,
                                          }),
                                        placeholder: "******",
                                      }),
                                    ],
                                  }),
                                  e.jsx("div", {
                                    className: "mt-4 flex justify-end",
                                    children: e.jsx(F, {
                                      type: "submit",
                                      variant: "soft",
                                      color: "error",
                                      disabled: u,
                                      children: u
                                        ? "Atualizando..."
                                        : "Salvar nova senha",
                                    }),
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsxs(U, {
                            className: "space-y-5 focus:outline-none",
                            children: [
                              e.jsxs("div", {
                                className:
                                  "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                                children: [
                                  e.jsxs("div", {
                                    className: "flex flex-col gap-1",
                                    children: [
                                      e.jsx("p", {
                                        className:
                                          "text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300",
                                        children: "Tema",
                                      }),
                                      e.jsx("h4", {
                                        className:
                                          "text-base font-semibold text-gray-900 dark:text-white",
                                        children: "Modo de exibição",
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "text-xs text-gray-500 dark:text-dark-300",
                                        children:
                                          "Escolha entre claro, escuro ou siga as configurações do sistema.",
                                      }),
                                    ],
                                  }),
                                  e.jsx(V, {
                                    value: m.themeMode,
                                    onChange: m.setThemeMode,
                                    className: "mt-4",
                                    children: e.jsx("div", {
                                      className: "flex flex-wrap gap-3",
                                      children: [
                                        {
                                          value: "system",
                                          label: "Sistema",
                                        },
                                        {
                                          value: "light",
                                          label: "Claro",
                                        },
                                        {
                                          value: "dark",
                                          label: "Escuro",
                                        },
                                      ].map((props) =>
                                        e.jsx(
                                          H,
                                          {
                                            value: props.value,
                                            className: ({ checked: f }) =>
                                              I(
                                                "cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition focus:outline-none",
                                                f
                                                  ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500 dark:bg-primary-900/20 dark:text-primary-300"
                                                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700",
                                              ),
                                            children: props.label,
                                          },
                                          props.value,
                                        ),
                                      ),
                                    }),
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                className:
                                  "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                                children: [
                                  e.jsxs("div", {
                                    className: "flex flex-col gap-1",
                                    children: [
                                      e.jsx("p", {
                                        className:
                                          "text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300",
                                        children: "Cores",
                                      }),
                                      e.jsx("h4", {
                                        className:
                                          "text-base font-semibold text-gray-900 dark:text-white",
                                        children: "Cor principal",
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "text-xs text-gray-500 dark:text-dark-300",
                                        children:
                                          "Selecione a cor de destaque do sistema.",
                                      }),
                                    ],
                                  }),
                                  e.jsx(V, {
                                    value: m.primaryColorScheme.name,
                                    onChange: m.setPrimaryColorScheme,
                                    className: "mt-4",
                                    children: e.jsx("div", {
                                      className: "flex flex-wrap gap-4",
                                      children: L.map((item) =>
                                        e.jsx(
                                          H,
                                          {
                                            value: item,
                                            className: ({ checked: f }) =>
                                              I(
                                                "flex h-14 w-16 cursor-pointer items-center justify-center rounded-lg border outline-hidden transition focus:outline-none",
                                                f
                                                  ? "border-primary-500"
                                                  : "border-gray-200 dark:border-dark-500",
                                              ),
                                            children: ({ checked: f }) =>
                                              e.jsx("div", {
                                                className: I(
                                                  "mask is-diamond size-6 transition-all",
                                                  f && "scale-110 rotate-45",
                                                ),
                                                style: {
                                                  backgroundColor:
                                                    Re[item][500],
                                                },
                                              }),
                                          },
                                          item,
                                        ),
                                      ),
                                    }),
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                className: "grid gap-5 md:grid-cols-2",
                                children: [
                                  e.jsxs("div", {
                                    className:
                                      "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                                    children: [
                                      e.jsx("h4", {
                                        className:
                                          "mb-1 text-sm font-semibold text-gray-900 dark:text-white",
                                        children: "Tom Claro",
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "mb-4 text-xs text-gray-500 dark:text-dark-300",
                                        children: "Fundo para o modo claro.",
                                      }),
                                      e.jsx(V, {
                                        value: m.lightColorScheme.name,
                                        onChange: m.setLightColorScheme,
                                        children: e.jsx("div", {
                                          className: "flex flex-wrap gap-2",
                                          children: E.map((item) =>
                                            e.jsx(
                                              H,
                                              {
                                                value: item,
                                                className: ({ checked: f }) =>
                                                  I(
                                                    "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition focus:outline-none",
                                                    f
                                                      ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                                                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700",
                                                  ),
                                                children: item,
                                              },
                                              item,
                                            ),
                                          ),
                                        }),
                                      }),
                                    ],
                                  }),
                                  e.jsxs("div", {
                                    className:
                                      "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                                    children: [
                                      e.jsx("h4", {
                                        className:
                                          "mb-1 text-sm font-semibold text-gray-900 dark:text-white",
                                        children: "Tom Escuro",
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "mb-4 text-xs text-gray-500 dark:text-dark-300",
                                        children: "Fundo para o modo escuro.",
                                      }),
                                      e.jsx(V, {
                                        value: m.darkColorScheme.name,
                                        onChange: m.setDarkColorScheme,
                                        children: e.jsx("div", {
                                          className: "flex flex-wrap gap-2",
                                          children: x.map((item) =>
                                            e.jsx(
                                              H,
                                              {
                                                value: item,
                                                className: ({ checked: f }) =>
                                                  I(
                                                    "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition focus:outline-none",
                                                    f
                                                      ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                                                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700",
                                                  ),
                                                children: item,
                                              },
                                              item,
                                            ),
                                          ),
                                        }),
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsx(U, {
                            className: "space-y-5 focus:outline-none",
                            children: e.jsx("div", {
                              className: "grid gap-4 md:grid-cols-2",
                              children: O.map((props) => {
                                const f = Math.round((props.volume ?? 0) * 100);
                                return e.jsxs(
                                  "div",
                                  {
                                    className:
                                      "flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                                    children: [
                                      e.jsx("div", {
                                        className:
                                          "flex items-start justify-between gap-3",
                                        children: e.jsxs("div", {
                                          className: "flex items-start gap-3",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "rounded-xl bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200",
                                              children: e.jsx(props.icon, {
                                                className: "size-4",
                                              }),
                                            }),
                                            e.jsxs("div", {
                                              children: [
                                                e.jsx("h5", {
                                                  className:
                                                    "text-sm font-semibold text-gray-900 dark:text-white",
                                                  children: props.title,
                                                }),
                                                e.jsx("p", {
                                                  className:
                                                    "mt-1 text-xs text-gray-500 dark:text-dark-300",
                                                  children: props.description,
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                      }),
                                      e.jsx("div", {
                                        className: "mt-4 space-y-3",
                                        children: e.jsxs("div", {
                                          className: "flex items-center gap-3",
                                          children: [
                                            e.jsx(De, {
                                              min: 0,
                                              max: 100,
                                              step: 5,
                                              value: f,
                                              onChange: (event) =>
                                                props.onVolumeChange(
                                                  Number(event.target.value) /
                                                    100,
                                                ),
                                              color: "primary",
                                            }),
                                            e.jsxs("div", {
                                              className:
                                                "min-w-[3.25rem] rounded-lg bg-white px-3 py-1 text-center text-xs font-semibold text-primary-700 ring-1 ring-primary-100 dark:bg-dark-700 dark:text-primary-200 dark:ring-primary-900/50",
                                              children: [f, "%"],
                                            }),
                                          ],
                                        }),
                                      }),
                                    ],
                                  },
                                  props.key,
                                );
                              }),
                            }),
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
export {
  la as D,
  da as N,
  ma as S,
  ca as T,
  ha as U,
  ia as a,
  na as b,
  ua as n,
  oa as u,
};
