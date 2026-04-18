/* ==== Imports ==== */
import {
  $ as Ae,
  a as Ge,
  w as Le,
  e as je,
} from "./use-resolve-button-type-DwKZeOeP.js";
import { a as u, R as S } from "./index-Bx06KCE-.js";
import {
  y as Ne,
  R as We,
  T as He,
  w as Ke,
  A as Ve,
  s as Be,
  F as Ye,
} from "./floating-CA5b9ljT.js";
import {
  f as fe,
  l as Qe,
  U as Pe,
  u as Z,
  Y as J,
  y as q,
  n as Ze,
  o as I,
  S as oe,
  F as W,
  T as A,
  a as ae,
  V as ve,
  K as re,
  z as be,
  B as me,
  m as qe,
  g as Ie,
  A as ue,
  e as N,
  i as Ue,
  H as ze,
  I as Je,
  L as he,
  r as $e,
} from "./use-is-mounted-D7iMJT5-.js";
import {
  u as we,
  C as xe,
  x as Xe,
  S as et,
  E as tt,
  j as Fe,
  a as G,
} from "./dialog-DOjFQwF9.js";
import {
  T as nt,
  x as ot,
  c as at,
  S as U,
  u as Ce,
  e as Oe,
  N as Ee,
  i as z,
  p as rt,
  f as lt,
  g as Te,
  j as st,
  t as ut,
  q as ct,
  h as it,
  b as dt,
  d as pt,
} from "./transition-Cxix63ts.js";
import { G as Me } from "./iconBase-BPc6woXW.js";

/* ==== Utility: defineProperty helper (TypeScript class field decorator) ==== */
var ft = Object.defineProperty,
  vt = (targetObj, propKey, propValue) => {
    return propKey in targetObj
      ? ft(targetObj, propKey, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: propValue,
        })
      : (targetObj[propKey] = propValue);
  },
  ke = (targetObj, propKey, propValue) => {
    return (vt(targetObj, typeof propKey != "symbol" ? propKey + "" : propKey, propValue), propValue);
  },

/* ==== Enums: PopoverState and PopoverAction ==== */
  h = ((enumObj) => ((enumObj[(enumObj.Open = 0)] = "Open"), (enumObj[(enumObj.Closed = 1)] = "Closed"), enumObj))(
    h || {},
  ),
  bt = ((enumObj) => (
    (enumObj[(enumObj.OpenPopover = 0)] = "OpenPopover"),
    (enumObj[(enumObj.ClosePopover = 1)] = "ClosePopover"),
    (enumObj[(enumObj.SetButton = 2)] = "SetButton"),
    (enumObj[(enumObj.SetButtonId = 3)] = "SetButtonId"),
    (enumObj[(enumObj.SetPanel = 4)] = "SetPanel"),
    (enumObj[(enumObj.SetPanelId = 5)] = "SetPanelId"),
    enumObj
  ))(bt || {});
/* ==== Popover State Reducer ==== */
let mt = {
  0: (state) =>
    state.popoverState === 0
      ? state
      : {
          ...state,
          popoverState: 0,
          __demoMode: !1,
        },
  1(state) {
    return state.popoverState === 1
      ? state
      : {
          ...state,
          popoverState: 1,
          __demoMode: !1,
        };
  },
  2(state, action) {
    return state.button === action.button
      ? state
      : {
          ...state,
          button: action.button,
        };
  },
  3(state, action) {
    return state.buttonId === action.buttonId
      ? state
      : {
          ...state,
          buttonId: action.buttonId,
        };
  },
  4(state, action) {
    return state.panel === action.panel
      ? state
      : {
          ...state,
          panel: action.panel,
        };
  },
  5(state, action) {
    return state.panelId === action.panelId
      ? state
      : {
          ...state,
          panelId: action.panelId,
        };
  },
};
class Se extends nt {
  constructor(a) {
    super(a);
    ke(this, "actions", {
      close: () =>
        this.send({
          type: 1,
        }),
      refocusableClose: (t) => {
        this.actions.close();
        let f = t
          ? fe(t)
            ? t
            : "current" in t && fe(t.current)
              ? t.current
              : this.state.button
          : this.state.button;
        f?.focus();
      },
      open: () =>
        this.send({
          type: 0,
        }),
      setButtonId: (t) =>
        this.send({
          type: 3,
          buttonId: t,
        }),
      setButton: (t) =>
        this.send({
          type: 2,
          button: t,
        }),
      setPanelId: (t) =>
        this.send({
          type: 5,
          panelId: t,
        }),
      setPanel: (t) =>
        this.send({
          type: 4,
          panel: t,
        }),
    });
    ke(this, "selectors", {
      isPortalled: (t) => {
        var f;
        if (!t.button || !t.panel) return !1;
        let b = (f = Qe(t.button)) != null ? f : document;
        for (let g of b.querySelectorAll("body > *"))
          if (Number(g?.contains(t.button)) ^ Number(g?.contains(t.panel)))
            return !0;
        let m = Pe(b),
          l = m.indexOf(t.button),
          n = (l + m.length - 1) % m.length,
          k = (l + 1) % m.length,
          C = m[n],
          r = m[k];
        return !t.panel.contains(C) && !t.panel.contains(r);
      },
    });
    {
      let t = this.state.id,
        f = ot.get(null);
      this.on(0, () => f.actions.push(t));
      this.on(1, () => f.actions.pop(t));
    }
  }
  static new({ id: a, __demoMode: t = !1 }) {
    return new Se({
      id: a,
      __demoMode: t,
      popoverState: t ? 0 : 1,
      buttons: {
        current: [],
      },
      button: null,
      buttonId: null,
      panel: null,
      panelId: null,
      beforePanelSentinel: {
        current: null,
      },
      afterPanelSentinel: {
        current: null,
      },
      afterButtonSentinel: {
        current: null,
      },
    });
  }
  reduce(a, t) {
    return Z(t.type, mt, a, t);
  }
}
const _e = u.createContext(null);
function ce(e) {
  let a = u.useContext(_e);
  if (a === null) {
    let t = new Error(`<${e} /> is missing a parent <Popover /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(t, ce), t);
  }
  return a;
}
function ht({ id: e, __demoMode: a = !1 }) {
  let t = u.useMemo(
    () =>
      Se.new({
        id: e,
        __demoMode: a,
      }),
    [],
  );
  return (at(() => t.dispose()), t);
}
let ge = u.createContext(null);
ge.displayName = "PopoverGroupContext";
function De() {
  return u.useContext(ge);
}
let ie = u.createContext(null);
ie.displayName = "PopoverPanelContext";
function Pt() {
  return u.useContext(ie);
}
let $t = "div";
function St(e, a) {
  var t;
  let f = u.useId(),
    { __demoMode: b = !1, ...m } = e,
    l = ht({
      id: f,
      __demoMode: b,
    }),
    n = u.useRef(null),
    k = q(
      a,
      qe((s) => {
        n.current = s;
      }),
    ),
    [C, r, g, y, F] = U(
      l,
      u.useCallback(
        (s) => [s.popoverState, s.button, s.panel, s.buttonId, s.panelId],
        [],
      ),
    ),
    O = ct((t = n.current) != null ? t : r),
    p = Ie(y),
    v = Ie(F),
    P = u.useMemo(
      () => ({
        buttonId: p,
        panelId: v,
        close: l.actions.close,
      }),
      [p, v, l],
    ),
    $ = De(),
    c = $?.registerPopover,
    B = I(() => {
      var s, w;
      let E = oe((s = n.current) != null ? s : r);
      return (w = $?.isFocusWithinPopoverGroup()) != null
        ? w
        : E && (r?.contains(E) || g?.contains(E));
    });
  u.useEffect(() => c?.(P), [c, P]);
  let [X, ee] = it(),
    L = Xe(r),
    D = et({
      mainTreeNode: L,
      portals: X,
      defaultContainers: [
        {
          get current() {
            return l.state.button;
          },
        },
        {
          get current() {
            return l.state.panel;
          },
        },
      ],
    });
  tt(
    O,
    "focus",
    (event) => {
      var w, E, M, Y, _, Q;
      if (
        event.target !== window &&
        Ue(event.target) &&
        l.state.popoverState === h.Open
      ) {
        B() ||
          (l.state.button &&
            l.state.panel &&
            (D.contains(event.target) ||
              ((E =
                (w = l.state.beforePanelSentinel.current) == null
                  ? void 0
                  : w.contains) != null &&
                E.call(w, event.target)) ||
              ((Y =
                (M = l.state.afterPanelSentinel.current) == null
                  ? void 0
                  : M.contains) != null &&
                Y.call(M, event.target)) ||
              ((Q =
                (_ = l.state.afterButtonSentinel.current) == null
                  ? void 0
                  : _.contains) != null &&
                Q.call(_, event.target)) ||
              l.actions.close()));
      }
    },
    !0,
  );
  let H = C === h.Open;
  dt(H, D.resolveContainers, (s, w) => {
    l.actions.close();
    ze(w, Je.Loose) || (s.preventDefault(), r?.focus());
  });
  let te = ae({
      open: C === h.Open,
      close: l.actions.refocusableClose,
    }),
    ne = U(
      l,
      u.useCallback(
        (s) =>
          Z(s.popoverState, {
            [h.Open]: z.Open,
            [h.Closed]: z.Closed,
          }),
        [],
      ),
    ),
    K = {
      ref: k,
    },
    V = re();
  return S.createElement(
    Fe,
    {
      node: L,
    },
    S.createElement(
      Ve,
      null,
      S.createElement(
        ie.Provider,
        {
          value: null,
        },
        S.createElement(
          _e.Provider,
          {
            value: l,
          },
          S.createElement(
            xe,
            {
              value: l.actions.refocusableClose,
            },
            S.createElement(
              pt,
              {
                value: ne,
              },
              S.createElement(
                ee,
                null,
                V({
                  ourProps: K,
                  theirProps: m,
                  slot: te,
                  defaultTag: $t,
                  name: "Popover",
                }),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
let gt = "button";
function yt(e, a) {
  let t = u.useId(),
    {
      id: f = `headlessui-popover-button-${t}`,
      disabled: b = !1,
      autoFocus: m = !1,
      ...l
    } = e,
    n = ce("Popover.Button"),
    [k, C, r, g, y, F, O] = U(
      n,
      u.useCallback(
        (o) => [
          o.popoverState,
          n.selectors.isPortalled(o),
          o.button,
          o.buttonId,
          o.panel,
          o.panelId,
          o.afterButtonSentinel,
        ],
        [],
      ),
    ),
    p = u.useRef(null),
    v = `headlessui-focus-sentinel-${u.useId()}`,
    P = De(),
    $ = P?.closeOthers,
    c = Pt() !== null;
  u.useEffect(() => {
    if (!c)
      return (n.actions.setButtonId(f), () => n.actions.setButtonId(null));
  }, [c, f, n]);
  let [B] = u.useState(() => Symbol()),
    X = q(
      p,
      a,
      Ye(),
      I((o) => {
        if (!c) {
          if (o) n.state.buttons.current.push(B);
          else {
            let i = n.state.buttons.current.indexOf(B);
            if (i !== -1) {
              n.state.buttons.current.splice(i, 1);
            }
          }
          if (n.state.buttons.current.length > 1) {
            console.warn(
              "You are already using a <Popover.Button /> but only 1 <Popover.Button /> is supported.",
            );
          }
          if (o) {
            n.actions.setButton(o);
          }
        }
      }),
    ),
    ee = q(p, a),
    L = I((event) => {
      var i, x, T;
      if (c) {
        if (n.state.popoverState === h.Closed) return;
        switch (event.key) {
          case N.Space:
          case N.Enter:
            event.preventDefault();
            (x = (i = event.target).click) == null || x.call(i);
            n.actions.close();
            (T = n.state.button) == null || T.focus();
            break;
        }
      } else
        switch (event.key) {
          case N.Space:
          case N.Enter:
            event.preventDefault();
            event.stopPropagation();
            n.state.popoverState === h.Closed
              ? ($?.(n.state.buttonId), n.actions.open())
              : n.actions.close();
            break;
          case N.Escape:
            if (n.state.popoverState !== h.Open) return $?.(n.state.buttonId);
            if (!p.current) return;
            let R = oe(p.current);
            if (R && !p.current.contains(R)) return;
            event.preventDefault();
            event.stopPropagation();
            n.actions.close();
            break;
        }
    }),
    D = I((event) => {
      c || (event.key === N.Space && event.preventDefault());
    }),
    H = I((event) => {
      var i, x;
      Be(event.currentTarget) ||
        b ||
        (c
          ? (n.actions.close(), (i = n.state.button) == null || i.focus())
          : (event.preventDefault(),
            event.stopPropagation(),
            n.state.popoverState === h.Closed
              ? ($?.(n.state.buttonId), n.actions.open())
              : n.actions.close(),
            (x = n.state.button) == null || x.focus()));
    }),
    te = I((event) => {
      event.preventDefault();
      event.stopPropagation();
    }),
    { isFocusVisible: ne, focusProps: K } = Ae({
      autoFocus: m,
    }),
    { isHovered: V, hoverProps: s } = Ge({
      isDisabled: b,
    }),
    { pressed: w, pressProps: E } = Le({
      disabled: b,
    }),
    M = k === h.Open,
    Y = ae({
      open: M,
      active: w || M,
      disabled: b,
      hover: V,
      focus: ne,
      autofocus: m,
    }),
    _ = je(e, r),
    Q = c
      ? ve(
          {
            ref: ee,
            type: _,
            onKeyDown: L,
            onClick: H,
            disabled: b || void 0,
            autoFocus: m,
          },
          K,
          s,
          E,
        )
      : ve(
          {
            ref: X,
            id: g,
            type: _,
            "aria-expanded": k === h.Open,
            "aria-controls": y ? F : void 0,
            disabled: b || void 0,
            autoFocus: m,
            onKeyDown: L,
            onKeyUp: D,
            onClick: H,
            onMouseDown: te,
          },
          K,
          s,
          E,
        ),
    le = we(),
    de = I(() => {
      if (!fe(n.state.panel)) return;
      let o = n.state.panel;
      function i() {
        if (
          Z(le.current, {
            [G.Forwards]: () => W(o, A.First),
            [G.Backwards]: () => W(o, A.Last),
          }) === he.Error
        ) {
          W(
            Pe($e(n.state.button)).filter(
              (item) => item.dataset.headlessuiFocusGuard !== "true",
            ),
            Z(le.current, {
              [G.Forwards]: A.Next,
              [G.Backwards]: A.Previous,
            }),
            {
              relativeTo: n.state.button,
            },
          );
        }
      }
      i();
    }),
    d = re();
  return S.createElement(
    S.Fragment,
    null,
    d({
      ourProps: Q,
      theirProps: l,
      slot: Y,
      defaultTag: gt,
      name: "Popover.Button",
    }),
    M &&
      !c &&
      C &&
      S.createElement(be, {
        id: v,
        ref: O,
        features: me.Focusable,
        "data-headlessui-focus-guard": !0,
        as: "button",
        type: "button",
        onFocus: de,
      }),
  );
}
let It = "div",
  Ct = ue.RenderStrategy | ue.Static;
function Re(e, a) {
  let t = u.useId(),
    {
      id: f = `headlessui-popover-backdrop-${t}`,
      transition: b = !1,
      ...m
    } = e,
    l = ce("Popover.Backdrop"),
    n = U(
      l,
      u.useCallback((P) => P.popoverState, []),
    ),
    [k, C] = u.useState(null),
    r = q(a, C),
    g = Oe(),
    [y, F] = Ee(b, k, g !== null ? (g & z.Open) === z.Open : n === h.Open),
    O = I((event) => {
      if (Be(event.currentTarget)) return event.preventDefault();
      l.actions.close();
    }),
    p = ae({
      open: n === h.Open,
    }),
    v = {
      ref: r,
      id: f,
      "aria-hidden": !0,
      onClick: O,
      ...Te(F),
    };
  return re()({
    ourProps: v,
    theirProps: m,
    slot: p,
    defaultTag: It,
    features: Ct,
    visible: y,
    name: "Popover.Backdrop",
  });
}
let kt = "div",
  Bt = ue.RenderStrategy | ue.Static;
function wt(e, a) {
  let t = u.useId(),
    {
      id: f = `headlessui-popover-panel-${t}`,
      focus: b = !1,
      anchor: m,
      portal: l = !1,
      modal: n = !1,
      transition: k = !1,
      ...C
    } = e,
    r = ce("Popover.Panel"),
    g = U(r, r.selectors.isPortalled),
    [y, F, O, p, v] = U(
      r,
      u.useCallback(
        (d) => [
          d.popoverState,
          d.button,
          d.__demoMode,
          d.beforePanelSentinel,
          d.afterPanelSentinel,
        ],
        [],
      ),
    ),
    P = `headlessui-focus-sentinel-before-${t}`,
    $ = `headlessui-focus-sentinel-after-${t}`,
    c = u.useRef(null),
    B = Ne(m),
    [X, ee] = We(B),
    L = He();
  if (B) {
    l = !0;
  }
  let [D, H] = u.useState(null),
    te = q(c, a, B ? X : null, r.actions.setPanel, H),
    ne = Ce(F),
    K = Ce(c.current);
  Ze(() => (r.actions.setPanelId(f), () => r.actions.setPanelId(null)), [f, r]);
  let V = Oe(),
    [s, w] = Ee(k, D, V !== null ? (V & z.Open) === z.Open : y === h.Open);
  rt(s, F, r.actions.close);
  lt(O ? !1 : n && s, K);
  let E = I((event) => {
    var o;
    switch (event.key) {
      case N.Escape:
        if (r.state.popoverState !== h.Open || !c.current) return;
        let i = oe(c.current);
        if (i && !c.current.contains(i)) return;
        event.preventDefault();
        event.stopPropagation();
        r.actions.close();
        (o = r.state.button) == null || o.focus();
        break;
    }
  });
  u.useEffect(() => {
    var d;
    e.static ||
      (y === h.Closed &&
        ((d = e.unmount) == null || d) &&
        r.actions.setPanel(null));
  }, [y, e.unmount, e.static, r]);
  u.useEffect(() => {
    if (O || !b || y !== h.Open || !c.current) return;
    let d = oe(c.current);
    c.current.contains(d) || W(c.current, A.First);
  }, [O, b, c.current, y]);
  let M = ae({
      open: y === h.Open,
      close: r.actions.refocusableClose,
    }),
    Y = ve(B ? L() : {}, {
      ref: te,
      id: f,
      onKeyDown: E,
      onBlur:
        b && y === h.Open
          ? (d) => {
              var o, i, x, T, R;
              let j = d.relatedTarget;
              if (j && c.current) {
                ((o = c.current) != null && o.contains(j)) ||
                  (r.actions.close(),
                  (((x = (i = p.current) == null ? void 0 : i.contains) !=
                    null &&
                    x.call(i, j)) ||
                    ((R = (T = v.current) == null ? void 0 : T.contains) !=
                      null &&
                      R.call(T, j))) &&
                    j.focus({
                      preventScroll: !0,
                    }));
              }
            }
          : void 0,
      tabIndex: -1,
      style: {
        ...C.style,
        ...ee,
        "--button-width": Ke(s, F, !0).width,
      },
      ...Te(w),
    }),
    _ = we(),
    Q = I(() => {
      let d = c.current;
      if (!d) return;
      function o() {
        Z(_.current, {
          [G.Forwards]: () => {
            var i;
            if (W(d, A.First) === he.Error) {
              (i = r.state.afterPanelSentinel.current) == null || i.focus();
            }
          },
          [G.Backwards]: () => {
            var i;
            (i = r.state.button) == null ||
              i.focus({
                preventScroll: !0,
              });
          },
        });
      }
      o();
    }),
    le = I(() => {
      let d = c.current;
      if (!d) return;
      function o() {
        Z(_.current, {
          [G.Forwards]: () => {
            var i;
            if (!r.state.button) return;
            let x = (i = $e(r.state.button)) != null ? i : document.body,
              T = Pe(x),
              R = T.indexOf(r.state.button),
              j = T.slice(0, R + 1),
              se = [...T.slice(R + 1), ...j];
            for (let pe of se.slice())
              if (
                pe.dataset.headlessuiFocusGuard === "true" ||
                (D != null && D.contains(pe))
              ) {
                let ye = se.indexOf(pe);
                if (ye !== -1) {
                  se.splice(ye, 1);
                }
              }
            W(se, A.First, {
              sorted: !1,
            });
          },
          [G.Backwards]: () => {
            var i;
            if (W(d, A.Previous) === he.Error) {
              (i = r.state.button) == null || i.focus();
            }
          },
        });
      }
      o();
    }),
    de = re();
  return S.createElement(
    st,
    null,
    S.createElement(
      ie.Provider,
      {
        value: f,
      },
      S.createElement(
        xe,
        {
          value: r.actions.refocusableClose,
        },
        S.createElement(
          ut,
          {
            enabled: l ? e.static || s : !1,
            ownerDocument: ne,
          },
          s &&
            g &&
            S.createElement(be, {
              id: P,
              ref: p,
              features: me.Focusable,
              "data-headlessui-focus-guard": !0,
              as: "button",
              type: "button",
              onFocus: Q,
            }),
          de({
            ourProps: Y,
            theirProps: C,
            slot: M,
            defaultTag: kt,
            features: Bt,
            visible: s,
            name: "Popover.Panel",
          }),
          s &&
            g &&
            S.createElement(be, {
              id: $,
              ref: v,
              features: me.Focusable,
              "data-headlessui-focus-guard": !0,
              as: "button",
              type: "button",
              onFocus: le,
            }),
        ),
      ),
    ),
  );
}
let xt = "div";
function Ft(e, a) {
  let t = u.useRef(null),
    f = q(t, a),
    [b, m] = u.useState([]),
    l = I((p) => {
      m((v) => {
        let P = v.indexOf(p);
        if (P !== -1) {
          let $ = v.slice();
          return ($.splice(P, 1), $);
        }
        return v;
      });
    }),
    n = I((p) => (m((v) => [...v, p]), () => l(p))),
    k = I(() => {
      var p;
      let v = $e(t.current);
      if (!v) return !1;
      let P = oe(t.current);
      return (p = t.current) != null && p.contains(P)
        ? !0
        : b.some((item) => {
            var c, B;
            return (
              ((c = v.getElementById(item.buttonId.current)) == null
                ? void 0
                : c.contains(P)) ||
              ((B = v.getElementById(item.panelId.current)) == null
                ? void 0
                : B.contains(P))
            );
          });
    }),
    C = I((p) => {
      for (let v of b)
        if (v.buttonId.current !== p) {
          v.close();
        }
    }),
    r = u.useMemo(
      () => ({
        registerPopover: n,
        unregisterPopover: l,
        isFocusWithinPopoverGroup: k,
        closeOthers: C,
      }),
      [n, l, k, C],
    ),
    g = ae({}),
    y = e,
    F = {
      ref: f,
    },
    O = re();
  return S.createElement(
    Fe,
    null,
    S.createElement(
      ge.Provider,
      {
        value: r,
      },
      O({
        ourProps: F,
        theirProps: y,
        slot: g,
        defaultTag: xt,
        name: "Popover.Group",
      }),
    ),
  );
}
let Ot = J(St),
  Et = J(yt),
  Tt = J(Re),
  Mt = J(Re),
  _t = J(wt),
  Dt = J(Ft),
  Ht = Object.assign(Ot, {
    Button: Et,
    Backdrop: Mt,
    Overlay: Tt,
    Panel: _t,
    Group: Dt,
  });
function Kt(e) {
  return Me({
    attr: {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    child: [
      {
        tag: "path",
        attr: {
          d: "M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25",
        },
        child: [],
      },
      {
        tag: "path",
        attr: {
          d: "M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
        },
        child: [],
      },
      {
        tag: "path",
        attr: {
          d: "M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
        },
        child: [],
      },
      {
        tag: "path",
        attr: {
          d: "M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
        },
        child: [],
      },
    ],
  })(e);
}
function Vt(e) {
  return Me({
    attr: {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    child: [
      {
        tag: "path",
        attr: {
          d: "M9 4v6l-2 4v2h10v-2l-2 -4v-6",
        },
        child: [],
      },
      {
        tag: "path",
        attr: {
          d: "M12 16l0 5",
        },
        child: [],
      },
      {
        tag: "path",
        attr: {
          d: "M8 4l8 0",
        },
        child: [],
      },
    ],
  })(e);
}
export { Et as D, _t as L, Vt as T, Kt as a, Ht as v };
