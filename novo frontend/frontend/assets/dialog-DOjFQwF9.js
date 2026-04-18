import { R as d, a as s } from "./index-Bx06KCE-.js";
import {
  g as Re,
  o as E,
  i as H,
  E as Se,
  e as Le,
  n as ue,
  z as V,
  B as Q,
  l as ie,
  D as A,
  Y as L,
  y as Y,
  f as M,
  u as U,
  F as O,
  T as $,
  p as Ie,
  K as B,
  J as h,
  v as se,
  t as ce,
  d as xe,
  L as ne,
  a as K,
  A as re,
} from "./use-is-mounted-D7iMJT5-.js";
import {
  I as W,
  s as Ae,
  l as de,
  u as fe,
  c as Oe,
  M as Be,
  O as pe,
  e as me,
  K as Ne,
  i as N,
  h as Me,
  y as Ye,
  x as Ke,
  S as je,
  b as qe,
  f as ze,
  p as He,
  H as Ve,
  j as Qe,
  m as oe,
  t as Ue,
  X as We,
} from "./transition-Cxix63ts.js";
let Ge = s.createContext(() => {});
function Je({ value: e, children: t }) {
  return d.createElement(
    Ge.Provider,
    {
      value: e,
    },
    t,
  );
}
function ve(e, t, n, r) {
  let o = Re(n);
  s.useEffect(() => {
    e = e ?? window;
    function u(i) {
      o.current(i);
    }
    return (e.addEventListener(t, u, r), () => e.removeEventListener(t, u, r));
  }, [e, t, r]);
}
function G(e, t) {
  let n = s.useRef([]),
    r = E(e);
  s.useEffect(() => {
    let o = [...n.current];
    for (let [u, i] of t.entries())
      if (n.current[u] !== i) {
        let a = r(t, o);
        return ((n.current = t), a);
      }
  }, [r, ...t]);
}
function Xe(e) {
  function t() {
    if (document.readyState !== "loading") {
      (e(), document.removeEventListener("DOMContentLoaded", t));
    }
  }
  if (typeof window < "u" && typeof document < "u") {
    (document.addEventListener("DOMContentLoaded", t), t());
  }
}
let F = [];
Xe(() => {
  function e(event) {
    if (
      !H(event.target) ||
      event.target === document.body ||
      F[0] === event.target
    )
      return;
    let n = event.target;
    n = n.closest(Se);
    F.unshift(n ?? event.target);
    F = F.filter((item) => item != null && item.isConnected);
    F.splice(10);
  }
  window.addEventListener("click", e, {
    capture: !0,
  });
  window.addEventListener("mousedown", e, {
    capture: !0,
  });
  window.addEventListener("focus", e, {
    capture: !0,
  });
  document.body.addEventListener("click", e, {
    capture: !0,
  });
  document.body.addEventListener("mousedown", e, {
    capture: !0,
  });
  document.body.addEventListener("focus", e, {
    capture: !0,
  });
});
function _e(e, t = typeof document < "u" ? document.defaultView : null, n) {
  let r = W(e, "escape");
  ve(t, "keydown", (event) => {
    if (r) {
      event.defaultPrevented || (event.key === Le.Escape && n(event));
    }
  });
}
function Ze() {
  var e;
  let [t] = s.useState(() =>
      typeof window < "u" && typeof window.matchMedia == "function"
        ? window.matchMedia("(pointer: coarse)")
        : null,
    ),
    [n, r] = s.useState((e = t?.matches) != null ? e : !1);
  return (
    ue(() => {
      if (!t) return;
      function o(u) {
        r(u.matches);
      }
      return (
        t.addEventListener("change", o),
        () => t.removeEventListener("change", o)
      );
    }, [t]),
    n
  );
}
function et({ defaultContainers: e = [], portals: t, mainTreeNode: n } = {}) {
  let r = E(() => {
    var o, u;
    let i = ie(n),
      a = [];
    for (let l of e)
      if (l !== null) {
        A(l) ? a.push(l) : "current" in l && A(l.current) && a.push(l.current);
      }
    if (t != null && t.current) for (let l of t.current) a.push(l);
    for (let l of (o = i?.querySelectorAll("html > *, body > *")) != null
      ? o
      : [])
      if (
        l !== document.body &&
        l !== document.head &&
        A(l) &&
        l.id !== "headlessui-portal-root"
      ) {
        (n &&
          (l.contains(n) ||
            l.contains((u = n?.getRootNode()) == null ? void 0 : u.host))) ||
          a.some((item) => l.contains(item)) ||
          a.push(l);
      }
    return a;
  });
  return {
    resolveContainers: r,
    contains: E((o) => r().some((item) => item.contains(o))),
  };
}
let ge = s.createContext(null);
function le({ children: e, node: t }) {
  let [n, r] = s.useState(null),
    o = Ee(t ?? n);
  return d.createElement(
    ge.Provider,
    {
      value: o,
    },
    e,
    o === null &&
      d.createElement(V, {
        features: Q.Hidden,
        ref: (u) => {
          var i, a;
          if (u) {
            for (let l of (a =
              (i = ie(u)) == null
                ? void 0
                : i.querySelectorAll("html > *, body > *")) != null
              ? a
              : [])
              if (
                l !== document.body &&
                l !== document.head &&
                A(l) &&
                l != null &&
                l.contains(u)
              ) {
                r(l);
                break;
              }
          }
        },
      }),
  );
}
function Ee(e = null) {
  var t;
  return (t = s.useContext(ge)) != null ? t : e;
}
var x = ((e) => (
  (e[(e.Forwards = 0)] = "Forwards"),
  (e[(e.Backwards = 1)] = "Backwards"),
  e
))(x || {});
function tt() {
  let e = s.useRef(0);
  return (
    Ae(
      !0,
      "keydown",
      (event) => {
        if (event.key === "Tab") {
          e.current = event.shiftKey ? 1 : 0;
        }
      },
      !0,
    ),
    e
  );
}
function we(e) {
  if (!e) return new Set();
  if (typeof e == "function") return new Set(e());
  let t = new Set();
  for (let n of e.current)
    if (A(n.current)) {
      t.add(n.current);
    }
  return t;
}
let nt = "div";
var C = ((e) => (
  (e[(e.None = 0)] = "None"),
  (e[(e.InitialFocus = 1)] = "InitialFocus"),
  (e[(e.TabLock = 2)] = "TabLock"),
  (e[(e.FocusLock = 4)] = "FocusLock"),
  (e[(e.RestoreFocus = 8)] = "RestoreFocus"),
  (e[(e.AutoFocus = 16)] = "AutoFocus"),
  e
))(C || {});
function rt(e, t) {
  let n = s.useRef(null),
    r = Y(n, t),
    {
      initialFocus: o,
      initialFocusFallback: u,
      containers: i,
      features: a = 15,
      ...l
    } = e;
  de() || (a = 0);
  let c = fe(n.current);
  ut(a, {
    ownerDocument: c,
  });
  let p = it(a, {
    ownerDocument: c,
    container: n,
    initialFocus: o,
    initialFocusFallback: u,
  });
  st(a, {
    ownerDocument: c,
    container: n,
    containers: i,
    previousActiveElement: p,
  });
  let P = tt(),
    y = E((m) => {
      if (!M(n.current)) return;
      let D = n.current;
      ((v) => v())(() => {
        U(P.current, {
          [x.Forwards]: () => {
            O(D, $.First, {
              skipElements: [m.relatedTarget, u],
            });
          },
          [x.Backwards]: () => {
            O(D, $.Last, {
              skipElements: [m.relatedTarget, u],
            });
          },
        });
      });
    }),
    w = W(!!(a & 2), "focus-trap#tab-lock"),
    g = Ie(),
    T = s.useRef(!1),
    k = {
      ref: r,
      onKeyDown(m) {
        if (m.key == "Tab") {
          ((T.current = !0),
            g.requestAnimationFrame(() => {
              T.current = !1;
            }));
        }
      },
      onBlur(m) {
        if (!(a & 4)) return;
        let D = we(i);
        if (M(n.current)) {
          D.add(n.current);
        }
        let v = m.relatedTarget;
        if (H(v) && v.dataset.headlessuiFocusGuard !== "true") {
          he(D, v) ||
            (T.current
              ? O(
                  n.current,
                  U(P.current, {
                    [x.Forwards]: () => $.Next,
                    [x.Backwards]: () => $.Previous,
                  }) | $.WrapAround,
                  {
                    relativeTo: m.target,
                  },
                )
              : H(m.target) && h(m.target));
        }
      },
    },
    b = B();
  return d.createElement(
    d.Fragment,
    null,
    w &&
      d.createElement(V, {
        as: "button",
        type: "button",
        "data-headlessui-focus-guard": !0,
        onFocus: y,
        features: Q.Focusable,
      }),
    b({
      ourProps: k,
      theirProps: l,
      defaultTag: nt,
      name: "FocusTrap",
    }),
    w &&
      d.createElement(V, {
        as: "button",
        type: "button",
        "data-headlessui-focus-guard": !0,
        onFocus: y,
        features: Q.Focusable,
      }),
  );
}
let ot = L(rt),
  lt = Object.assign(ot, {
    features: C,
  });
function at(e = !0) {
  let t = s.useRef(F.slice());
  return (
    G(
      ([n], [r]) => {
        if (r === !0 && n === !1) {
          ce(() => {
            t.current.splice(0);
          });
        }
        if (r === !1 && n === !0) {
          t.current = F.slice();
        }
      },
      [e, F, t],
    ),
    E(() => {
      var n;
      return (n = t.current.find((item) => item != null && item.isConnected)) !=
        null
        ? n
        : null;
    })
  );
}
function ut(e, { ownerDocument: t }) {
  let n = !!(e & 8),
    r = at(n);
  G(() => {
    n || (xe(t?.body) && h(r()));
  }, [n]);
  Oe(() => {
    if (n) {
      h(r());
    }
  });
}
function it(
  e,
  { ownerDocument: t, container: n, initialFocus: r, initialFocusFallback: o },
) {
  let u = s.useRef(null),
    i = W(!!(e & 1), "focus-trap#initial-focus"),
    a = se();
  return (
    G(() => {
      if (e === 0) return;
      if (!i) {
        if (o != null && o.current) {
          h(o.current);
        }
        return;
      }
      let l = n.current;
      if (l) {
        ce(() => {
          if (!a.current) return;
          let c = t?.activeElement;
          if (r != null && r.current) {
            if (r?.current === c) {
              u.current = c;
              return;
            }
          } else if (l.contains(c)) {
            u.current = c;
            return;
          }
          if (r != null && r.current) h(r.current);
          else {
            if (e & 16) {
              if (O(l, $.First | $.AutoFocus) !== ne.Error) return;
            } else if (O(l, $.First) !== ne.Error) return;
            if (
              o != null &&
              o.current &&
              (h(o.current), t?.activeElement === o.current)
            )
              return;
            console.warn(
              "There are no focusable elements inside the <FocusTrap />",
            );
          }
          u.current = t?.activeElement;
        });
      }
    }, [o, i, e]),
    u
  );
}
function st(
  e,
  { ownerDocument: t, container: n, containers: r, previousActiveElement: o },
) {
  let u = se(),
    i = !!(e & 4);
  ve(
    t?.defaultView,
    "focus",
    (event) => {
      if (!i || !u.current) return;
      let l = we(r);
      if (M(n.current)) {
        l.add(n.current);
      }
      let c = o.current;
      if (!c) return;
      let p = event.target;
      M(p)
        ? he(l, p)
          ? ((o.current = p), h(p))
          : (event.preventDefault(), event.stopPropagation(), h(c))
        : h(o.current);
    },
    !0,
  );
}
function he(e, t) {
  for (let n of e) if (n.contains(t)) return !0;
  return !1;
}
var ct = ((e) => (
    (e[(e.Open = 0)] = "Open"),
    (e[(e.Closed = 1)] = "Closed"),
    e
  ))(ct || {}),
  dt = ((e) => ((e[(e.SetTitleId = 0)] = "SetTitleId"), e))(dt || {});
let ft = {
    0(e, t) {
      return e.titleId === t.id
        ? e
        : {
            ...e,
            titleId: t.id,
          };
    },
  },
  J = s.createContext(null);
J.displayName = "DialogContext";
function j(e) {
  let t = s.useContext(J);
  if (t === null) {
    let n = new Error(`<${e} /> is missing a parent <Dialog /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(n, j), n);
  }
  return t;
}
function pt(e, t) {
  return U(t.type, ft, e, t);
}
let ae = L(function (e, t) {
    let n = s.useId(),
      {
        id: r = `headlessui-dialog-${n}`,
        open: o,
        onClose: u,
        initialFocus: i,
        role: a = "dialog",
        autoFocus: l = !0,
        __demoMode: c = !1,
        unmount: p = !1,
        ...P
      } = e,
      y = s.useRef(!1);
    a = (function () {
      return a === "dialog" || a === "alertdialog"
        ? a
        : (y.current ||
            ((y.current = !0),
            console.warn(
              `Invalid role [${a}] passed to <Dialog />. Only \`dialog\` and and \`alertdialog\` are supported. Using \`dialog\` instead.`,
            )),
          "dialog");
    })();
    let w = me();
    if (o === void 0 && w !== null) {
      o = (w & N.Open) === N.Open;
    }
    let g = s.useRef(null),
      T = Y(g, t),
      k = fe(g.current),
      b = o ? 0 : 1,
      [m, D] = s.useReducer(pt, {
        titleId: null,
        descriptionId: null,
        panelRef: s.createRef(),
      }),
      v = E(() => u(!1)),
      X = E((f) =>
        D({
          type: 0,
          id: f,
        }),
      ),
      R = de() ? b === 0 : !1,
      [be, $e] = Me(),
      Fe = {
        get current() {
          var f;
          return (f = m.panelRef.current) != null ? f : g.current;
        },
      },
      q = Ee(),
      { resolveContainers: z } = et({
        mainTreeNode: q,
        portals: be,
        defaultContainers: [Fe],
      }),
      _ = w !== null ? (w & N.Closing) === N.Closing : !1;
    Ye(c || _ ? !1 : R, {
      allowed: E(() => {
        var f, te;
        return [
          (te =
            (f = g.current) == null
              ? void 0
              : f.closest("[data-headlessui-portal]")) != null
            ? te
            : null,
        ];
      }),
      disallowed: E(() => {
        var f;
        return [
          (f = q?.closest("body > *:not(#headlessui-portal-root)")) != null
            ? f
            : null,
        ];
      }),
    });
    let S = Ke.get(null);
    ue(() => {
      if (R) return (S.actions.push(r), () => S.actions.pop(r));
    }, [S, r, R]);
    let Z = je(
      S,
      s.useCallback((f) => S.selectors.isTop(f, r), [S, r]),
    );
    qe(Z, z, (event) => {
      event.preventDefault();
      v();
    });
    _e(Z, k?.defaultView, (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (
        document.activeElement &&
        "blur" in document.activeElement &&
        typeof document.activeElement.blur == "function"
      ) {
        document.activeElement.blur();
      }
      v();
    });
    ze(c || _ ? !1 : R, k, z);
    He(R, g, v);
    let [ye, Te] = Ve(),
      ke = s.useMemo(
        () => [
          {
            dialogState: b,
            close: v,
            setTitleId: X,
            unmount: p,
          },
          m,
        ],
        [b, v, X, p, m],
      ),
      ee = K({
        open: b === 0,
      }),
      De = {
        ref: T,
        id: r,
        role: a,
        tabIndex: -1,
        "aria-modal": c ? void 0 : b === 0 ? !0 : void 0,
        "aria-labelledby": m.titleId,
        "aria-describedby": ye,
        unmount: p,
      },
      Ce = !Ze(),
      I = C.None;
    if (R && !c) {
      ((I |= C.RestoreFocus),
        (I |= C.TabLock),
        l && (I |= C.AutoFocus),
        Ce && (I |= C.InitialFocus));
    }
    let Pe = B();
    return d.createElement(
      Qe,
      null,
      d.createElement(
        oe,
        {
          force: !0,
        },
        d.createElement(
          Ue,
          null,
          d.createElement(
            J.Provider,
            {
              value: ke,
            },
            d.createElement(
              We,
              {
                target: g,
              },
              d.createElement(
                oe,
                {
                  force: !1,
                },
                d.createElement(
                  Te,
                  {
                    slot: ee,
                  },
                  d.createElement(
                    $e,
                    null,
                    d.createElement(
                      lt,
                      {
                        initialFocus: i,
                        initialFocusFallback: g,
                        containers: z,
                        features: I,
                      },
                      d.createElement(
                        Je,
                        {
                          value: v,
                        },
                        Pe({
                          ourProps: De,
                          theirProps: P,
                          slot: ee,
                          defaultTag: mt,
                          features: vt,
                          visible: b === 0,
                          name: "Dialog",
                        }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }),
  mt = "div",
  vt = re.RenderStrategy | re.Static;
function gt(e, t) {
  let { transition: n = !1, open: r, ...o } = e,
    u = me(),
    i = e.hasOwnProperty("open") || u !== null,
    a = e.hasOwnProperty("onClose");
  if (!i && !a)
    throw new Error(
      "You have to provide an `open` and an `onClose` prop to the `Dialog` component.",
    );
  if (!i)
    throw new Error(
      "You provided an `onClose` prop to the `Dialog`, but forgot an `open` prop.",
    );
  if (!a)
    throw new Error(
      "You provided an `open` prop to the `Dialog`, but forgot an `onClose` prop.",
    );
  if (!u && typeof e.open != "boolean")
    throw new Error(
      `You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${e.open}`,
    );
  if (typeof e.onClose != "function")
    throw new Error(
      `You provided an \`onClose\` prop to the \`Dialog\`, but the value is not a function. Received: ${e.onClose}`,
    );
  return (r !== void 0 || n) && !o.static
    ? d.createElement(
        le,
        null,
        d.createElement(
          Ne,
          {
            show: r,
            transition: n,
            unmount: o.unmount,
          },
          d.createElement(ae, {
            ref: t,
            ...o,
          }),
        ),
      )
    : d.createElement(
        le,
        null,
        d.createElement(ae, {
          ref: t,
          open: r,
          ...o,
        }),
      );
}
let Et = "div";
function wt(e, t) {
  let n = s.useId(),
    { id: r = `headlessui-dialog-panel-${n}`, transition: o = !1, ...u } = e,
    [{ dialogState: i, unmount: a }, l] = j("Dialog.Panel"),
    c = Y(t, l.panelRef),
    p = K({
      open: i === 0,
    }),
    P = E((event) => {
      event.stopPropagation();
    }),
    y = {
      ref: c,
      id: r,
      onClick: P,
    },
    w = o ? pe : s.Fragment,
    g = o
      ? {
          unmount: a,
        }
      : {},
    T = B();
  return d.createElement(
    w,
    {
      ...g,
    },
    T({
      ourProps: y,
      theirProps: u,
      slot: p,
      defaultTag: Et,
      name: "Dialog.Panel",
    }),
  );
}
let ht = "div";
function bt(e, t) {
  let { transition: n = !1, ...r } = e,
    [{ dialogState: o, unmount: u }] = j("Dialog.Backdrop"),
    i = K({
      open: o === 0,
    }),
    a = {
      ref: t,
      "aria-hidden": !0,
    },
    l = n ? pe : s.Fragment,
    c = n
      ? {
          unmount: u,
        }
      : {},
    p = B();
  return d.createElement(
    l,
    {
      ...c,
    },
    p({
      ourProps: a,
      theirProps: r,
      slot: i,
      defaultTag: ht,
      name: "Dialog.Backdrop",
    }),
  );
}
let $t = "h2";
function Ft(e, t) {
  let n = s.useId(),
    { id: r = `headlessui-dialog-title-${n}`, ...o } = e,
    [{ dialogState: u, setTitleId: i }] = j("Dialog.Title"),
    a = Y(t);
  s.useEffect(() => (i(r), () => i(null)), [r, i]);
  let l = K({
      open: u === 0,
    }),
    c = {
      ref: a,
      id: r,
    };
  return B()({
    ourProps: c,
    theirProps: o,
    slot: l,
    defaultTag: $t,
    name: "Dialog.Title",
  });
}
let yt = L(gt),
  Tt = L(wt);
L(bt);
let kt = L(Ft),
  Rt = Object.assign(yt, {
    Panel: Tt,
    Title: kt,
    Description: Be,
  });
export {
  Je as C,
  ve as E,
  kt as Q,
  et as S,
  x as a,
  Rt as h,
  le as j,
  tt as u,
  Ee as x,
  Tt as z,
};
