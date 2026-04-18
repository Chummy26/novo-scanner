import {
  a as c,
  R as X,
  c as Te,
  j as t,
  T as Fe,
  f as ot,
  B as $,
  e as Z,
  u as it,
} from "./index-Bx06KCE-.js";
import { P as Pe } from "./Page-hVEPjFz_.js";
import { F as Ke, a as $e } from "./TrashIcon-DZPNpgRn.js";
import { F as Re, a as lt } from "./WalletIcon-BygHaYK8.js";
import { F as Qe } from "./ArrowTrendingUpIcon-CPkyWYZ2.js";
import { F as Ve } from "./SparklesIcon-DU5U9T8X.js";
import { F as dt } from "./Cog6ToothIcon-EOZD7MO5.js";
import { h as ct } from "./react-apexcharts.esm-B8DZI7x8.js";
import {
  $ as ut,
  a as mt,
  w as ht,
  e as xt,
} from "./use-resolve-button-type-DwKZeOeP.js";
import {
  n as de,
  l as ft,
  u as qe,
  G as pt,
  Y as ee,
  y as ve,
  H as gt,
  I as bt,
  o as O,
  a as ye,
  K as te,
  b as vt,
  c as Je,
  d as yt,
  p as wt,
  e as F,
  R as kt,
  T as Le,
  V as Ye,
  f as jt,
  A as Ae,
} from "./use-is-mounted-D7iMJT5-.js";
import {
  A as Nt,
  y as St,
  R as It,
  T as Dt,
  w as Et,
  b as Ct,
  F as Mt,
} from "./floating-CA5b9ljT.js";
import {
  p as Tt,
  c as pe,
  a as M,
  f as me,
  b as $t,
  s as Ft,
  u as Rt,
  L as Bt,
  S as he,
  d as Ot,
} from "./use-text-value-ChvRIfBi.js";
import {
  T as Pt,
  k as _e,
  x as Ze,
  a as Lt,
  c as At,
  S as U,
  b as _t,
  d as zt,
  i as ge,
  H as Ut,
  u as ze,
  e as Ht,
  N as Gt,
  p as Wt,
  f as Kt,
  y as Qt,
  g as Vt,
  t as qt,
  K as ce,
} from "./transition-Cxix63ts.js";
import { C as Jt, V as Xe } from "./label-DDDQpD4Z.js";
import { F as Yt } from "./FunnelIcon-D3v6sT5b.js";
import { F as Zt } from "./CheckIcon-BhaIjZ56.js";
import { F as Xt } from "./CalendarIcon-BAdYkhA_.js";
import { h as we, z as ke, Q as je } from "./dialog-DOjFQwF9.js";
import "./floating-ui.dom-DmqE9iVV.js";
function ea({ title: e, titleId: r, ...a }, s) {
  return c.createElement(
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
        ref: s,
        "aria-labelledby": r,
      },
      a,
    ),
    e
      ? c.createElement(
          "title",
          {
            id: r,
          },
          e,
        )
      : null,
    c.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18",
    }),
  );
}
const ta = c.forwardRef(ea);
function aa({ title: e, titleId: r, ...a }, s) {
  return c.createElement(
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
        ref: s,
        "aria-labelledby": r,
      },
      a,
    ),
    e
      ? c.createElement(
          "title",
          {
            id: r,
          },
          e,
        )
      : null,
    c.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3",
    }),
  );
}
const ra = c.forwardRef(aa);
function sa({ title: e, titleId: r, ...a }, s) {
  return c.createElement(
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
        ref: s,
        "aria-labelledby": r,
      },
      a,
    ),
    e
      ? c.createElement(
          "title",
          {
            id: r,
          },
          e,
        )
      : null,
    c.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181",
    }),
  );
}
const na = c.forwardRef(sa);
function oa(e, { container: r, accept: a, walk: s }) {
  let n = c.useRef(a),
    l = c.useRef(s);
  c.useEffect(() => {
    n.current = a;
    l.current = s;
  }, [a, s]);
  de(() => {
    if (!r || !e) return;
    let o = ft(r);
    if (!o) return;
    let d = n.current,
      h = l.current,
      b = Object.assign((N) => d(N), {
        acceptNode: d,
      }),
      m = o.createTreeWalker(r, NodeFilter.SHOW_ELEMENT, b, !1);
    for (; m.nextNode(); ) h(m.currentNode);
  }, [r, e, n, l]);
}
var ia = Object.defineProperty,
  la = (e, r, a) => {
    return r in e
      ? ia(e, r, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: a,
        })
      : (e[r] = a);
  },
  Ue = (e, r, a) => {
    return (la(e, typeof r != "symbol" ? r + "" : r, a), a);
  },
  R = ((e) => ((e[(e.Open = 0)] = "Open"), (e[(e.Closed = 1)] = "Closed"), e))(
    R || {},
  ),
  be = ((e) => (
    (e[(e.Pointer = 0)] = "Pointer"),
    (e[(e.Other = 1)] = "Other"),
    e
  ))(be || {}),
  S = ((e) => (
    (e[(e.OpenMenu = 0)] = "OpenMenu"),
    (e[(e.CloseMenu = 1)] = "CloseMenu"),
    (e[(e.GoToItem = 2)] = "GoToItem"),
    (e[(e.Search = 3)] = "Search"),
    (e[(e.ClearSearch = 4)] = "ClearSearch"),
    (e[(e.RegisterItems = 5)] = "RegisterItems"),
    (e[(e.UnregisterItems = 6)] = "UnregisterItems"),
    (e[(e.SetButtonElement = 7)] = "SetButtonElement"),
    (e[(e.SetItemsElement = 8)] = "SetItemsElement"),
    (e[(e.SortItems = 9)] = "SortItems"),
    (e[(e.MarkButtonAsMoved = 10)] = "MarkButtonAsMoved"),
    e
  ))(S || {});
function He(e, r = (a) => a) {
  let a = e.activeItemIndex !== null ? e.items[e.activeItemIndex] : null,
    s = pt(r(e.items.slice()), (l) => l.dataRef.current.domRef.current),
    n = a ? s.indexOf(a) : null;
  return (
    n === -1 && (n = null),
    {
      items: s,
      activeItemIndex: n,
    }
  );
}
let da = {
  1(e) {
    if (e.menuState === 1) return e;
    let r = e.buttonElement
      ? pe.Tracked($t(e.buttonElement))
      : e.buttonPositionState;
    return {
      ...e,
      activeItemIndex: null,
      pendingFocus: {
        focus: M.Nothing,
      },
      menuState: 1,
      buttonPositionState: r,
    };
  },
  0(e, r) {
    return e.menuState === 0
      ? e
      : {
          ...e,
          __demoMode: !1,
          pendingFocus: r.focus,
          menuState: 0,
          buttonPositionState: pe.Idle,
        };
  },
  2: (e, r) => {
    var a, s, n, l, o;
    if (e.menuState === 1) return e;
    let d = {
      ...e,
      searchQuery: "",
      activationTrigger: (a = r.trigger) != null ? a : 1,
      __demoMode: !1,
    };
    if (r.focus === M.Nothing)
      return {
        ...d,
        activeItemIndex: null,
      };
    if (r.focus === M.Specific)
      return {
        ...d,
        activeItemIndex: e.items.findIndex((props) => props.id === r.id),
      };
    if (r.focus === M.Previous) {
      let m = e.activeItemIndex;
      if (m !== null) {
        let N = e.items[m].dataRef.current.domRef,
          y = me(r, {
            resolveItems: () => e.items,
            resolveActiveIndex: () => e.activeItemIndex,
            resolveId: (props) => props.id,
            resolveDisabled: (f) => f.dataRef.current.disabled,
          });
        if (y !== null) {
          let f = e.items[y].dataRef.current.domRef;
          if (
            ((s = N.current) == null ? void 0 : s.previousElementSibling) ===
              f.current ||
            ((n = f.current) == null ? void 0 : n.previousElementSibling) ===
              null
          )
            return {
              ...d,
              activeItemIndex: y,
            };
        }
      }
    } else if (r.focus === M.Next) {
      let m = e.activeItemIndex;
      if (m !== null) {
        let N = e.items[m].dataRef.current.domRef,
          y = me(r, {
            resolveItems: () => e.items,
            resolveActiveIndex: () => e.activeItemIndex,
            resolveId: (props) => props.id,
            resolveDisabled: (f) => f.dataRef.current.disabled,
          });
        if (y !== null) {
          let f = e.items[y].dataRef.current.domRef;
          if (
            ((l = N.current) == null ? void 0 : l.nextElementSibling) ===
              f.current ||
            ((o = f.current) == null ? void 0 : o.nextElementSibling) === null
          )
            return {
              ...d,
              activeItemIndex: y,
            };
        }
      }
    }
    let h = He(e),
      b = me(r, {
        resolveItems: () => h.items,
        resolveActiveIndex: () => h.activeItemIndex,
        resolveId: (props) => props.id,
        resolveDisabled: (m) => m.dataRef.current.disabled,
      });
    return {
      ...d,
      ...h,
      activeItemIndex: b,
    };
  },
  3: (e, r) => {
    let a = e.searchQuery !== "" ? 0 : 1,
      s = e.searchQuery + r.value.toLowerCase(),
      n = (
        e.activeItemIndex !== null
          ? e.items
              .slice(e.activeItemIndex + a)
              .concat(e.items.slice(0, e.activeItemIndex + a))
          : e.items
      ).find((item) => {
        var d;
        return (
          ((d = item.dataRef.current.textValue) == null
            ? void 0
            : d.startsWith(s)) && !item.dataRef.current.disabled
        );
      }),
      l = n ? e.items.indexOf(n) : -1;
    return l === -1 || l === e.activeItemIndex
      ? {
          ...e,
          searchQuery: s,
        }
      : {
          ...e,
          searchQuery: s,
          activeItemIndex: l,
          activationTrigger: 1,
        };
  },
  4(e) {
    return e.searchQuery === ""
      ? e
      : {
          ...e,
          searchQuery: "",
          searchActiveItemIndex: null,
        };
  },
  5: (e, r) => {
    let a = e.items.concat(r.items.map((item) => item)),
      s = e.activeItemIndex;
    return (
      e.pendingFocus.focus !== M.Nothing &&
        (s = me(e.pendingFocus, {
          resolveItems: () => a,
          resolveActiveIndex: () => e.activeItemIndex,
          resolveId: (props) => props.id,
          resolveDisabled: (n) => n.dataRef.current.disabled,
        })),
      {
        ...e,
        items: a,
        activeItemIndex: s,
        pendingFocus: {
          focus: M.Nothing,
        },
        pendingShouldSort: !0,
      }
    );
  },
  6: (e, r) => {
    let a = e.items,
      s = [],
      n = new Set(r.items);
    for (let [l, o] of a.entries())
      if (n.has(o.id) && (s.push(l), n.delete(o.id), n.size === 0)) break;
    if (s.length > 0) {
      a = a.slice();
      for (let l of s.reverse()) a.splice(l, 1);
    }
    return {
      ...e,
      items: a,
      activationTrigger: 1,
    };
  },
  7: (e, r) =>
    e.buttonElement === r.element
      ? e
      : {
          ...e,
          buttonElement: r.element,
        },
  8: (e, r) =>
    e.itemsElement === r.element
      ? e
      : {
          ...e,
          itemsElement: r.element,
        },
  9: (e) =>
    e.pendingShouldSort
      ? {
          ...e,
          ...He(e),
          pendingShouldSort: !1,
        }
      : e,
  10(e) {
    return e.buttonPositionState.kind !== "Tracked"
      ? e
      : {
          ...e,
          buttonPositionState: pe.Moved,
        };
  },
};
class Be extends Pt {
  constructor(r) {
    super(r);
    Ue(this, "actions", {
      registerItem: _e(() => {
        let a = [],
          s = new Set();
        return [
          (n, l) => {
            s.has(l) ||
              (s.add(l),
              a.push({
                id: n,
                dataRef: l,
              }));
          },
          () => (
            s.clear(),
            this.send({
              type: 5,
              items: a.splice(0),
            })
          ),
        ];
      }),
      unregisterItem: _e(() => {
        let a = [];
        return [
          (s) => a.push(s),
          () =>
            this.send({
              type: 6,
              items: a.splice(0),
            }),
        ];
      }),
    });
    Ue(this, "selectors", {
      activeDescendantId(a) {
        var s;
        let n = a.activeItemIndex,
          l = a.items;
        return n === null || (s = l[n]) == null ? void 0 : s.id;
      },
      isActive(a, s) {
        var n;
        let l = a.activeItemIndex,
          o = a.items;
        return l !== null ? ((n = o[l]) == null ? void 0 : n.id) === s : !1;
      },
      shouldScrollIntoView(a, s) {
        return a.__demoMode || a.menuState !== 0 || a.activationTrigger === 0
          ? !1
          : this.isActive(a, s);
      },
      didButtonMove(a) {
        return a.buttonPositionState.kind === "Moved";
      },
    });
    this.on(5, () => {
      this.disposables.requestAnimationFrame(() => {
        this.send({
          type: 9,
        });
      });
    });
    {
      let a = this.state.id,
        s = Ze.get(null);
      this.disposables.add(
        s.on(Lt.Push, (n) => {
          if (!s.selectors.isTop(n, a) && this.state.menuState === 0) {
            this.send({
              type: 1,
            });
          }
        }),
      );
      this.on(0, () => s.actions.push(a));
      this.on(1, () => s.actions.pop(a));
    }
    this.disposables.group((a) => {
      this.on(1, (s) => {
        if (s.buttonElement) {
          (a.dispose(),
            a.add(
              Tt(s.buttonElement, s.buttonPositionState, () => {
                this.send({
                  type: 10,
                });
              }),
            ));
        }
      });
    });
  }
  static new({ id: r, __demoMode: a = !1 }) {
    return new Be({
      id: r,
      __demoMode: a,
      menuState: a ? 0 : 1,
      buttonElement: null,
      itemsElement: null,
      items: [],
      searchQuery: "",
      activeItemIndex: null,
      activationTrigger: 1,
      pendingShouldSort: !1,
      pendingFocus: {
        focus: M.Nothing,
      },
      buttonPositionState: pe.Idle,
    });
  }
  reduce(r, a) {
    return qe(a.type, da, r, a);
  }
}
const et = c.createContext(null);
function Oe(e) {
  let r = c.useContext(et);
  if (r === null) {
    let a = new Error(`<${e} /> is missing a parent <Menu /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(a, tt), a);
  }
  return r;
}
function tt({ id: e, __demoMode: r = !1 }) {
  let a = c.useMemo(
    () =>
      Be.new({
        id: e,
        __demoMode: r,
      }),
    [],
  );
  return (At(() => a.dispose()), a);
}
let ca = c.Fragment;
function ua(e, r) {
  let a = c.useId(),
    { __demoMode: s = !1, ...n } = e,
    l = tt({
      id: a,
      __demoMode: s,
    }),
    [o, d, h] = U(l, (w) => [w.menuState, w.itemsElement, w.buttonElement]),
    b = ve(r),
    m = Ze.get(null),
    N = U(
      m,
      c.useCallback((w) => m.selectors.isTop(w, a), [m, a]),
    );
  _t(N, [h, d], (w, v) => {
    var D;
    l.send({
      type: S.CloseMenu,
    });
    gt(v, bt.Loose) ||
      (w.preventDefault(), (D = l.state.buttonElement) == null || D.focus());
  });
  let y = O(() => {
      l.send({
        type: S.CloseMenu,
      });
    }),
    f = ye({
      open: o === R.Open,
      close: y,
    }),
    k = {
      ref: b,
    },
    B = te();
  return X.createElement(
    Nt,
    null,
    X.createElement(
      et.Provider,
      {
        value: l,
      },
      X.createElement(
        zt,
        {
          value: qe(o, {
            [R.Open]: ge.Open,
            [R.Closed]: ge.Closed,
          }),
        },
        B({
          ourProps: k,
          theirProps: n,
          slot: f,
          defaultTag: ca,
          name: "Menu",
        }),
      ),
    ),
  );
}
let ma = "button";
function ha(e, r) {
  let a = Oe("Menu.Button"),
    s = c.useId(),
    {
      id: n = `headlessui-menu-button-${s}`,
      disabled: l = !1,
      autoFocus: o = !1,
      ...d
    } = e,
    h = c.useRef(null),
    b = Ct(),
    m = ve(
      r,
      h,
      Mt(),
      O((j) =>
        a.send({
          type: S.SetButtonElement,
          element: j,
        }),
      ),
    ),
    N = O((event) => {
      switch (event.key) {
        case F.Space:
        case F.Enter:
        case F.ArrowDown:
          event.preventDefault();
          event.stopPropagation();
          a.send({
            type: S.OpenMenu,
            focus: {
              focus: M.First,
            },
          });
          break;
        case F.ArrowUp:
          event.preventDefault();
          event.stopPropagation();
          a.send({
            type: S.OpenMenu,
            focus: {
              focus: M.Last,
            },
          });
          break;
      }
    }),
    y = O((event) => {
      if (event.key === F.Space) {
        event.preventDefault();
      }
    }),
    [f, k, B] = U(a, (j) => [j.menuState, j.buttonElement, j.itemsElement]),
    w = f === R.Open;
  Bt(w, {
    trigger: k,
    action: c.useCallback(
      (event) => {
        if (k != null && k.contains(event.target)) return he.Ignore;
        let I = event.target.closest('[role="menuitem"]:not([data-disabled])');
        if (jt(I)) {
          return he.Select(I);
        }
        if (B != null && B.contains(event.target)) {
          return he.Ignore;
        }
        return he.Close;
      },
      [k, B],
    ),
    close: c.useCallback(
      () =>
        a.send({
          type: S.CloseMenu,
        }),
      [],
    ),
    select: c.useCallback((j) => j.click(), []),
  });
  let v = Ot((event) => {
      var I;
      l ||
        (f === R.Open
          ? (Te.flushSync(() =>
              a.send({
                type: S.CloseMenu,
              }),
            ),
            (I = h.current) == null ||
              I.focus({
                preventScroll: !0,
              }))
          : (event.preventDefault(),
            a.send({
              type: S.OpenMenu,
              focus: {
                focus: M.Nothing,
              },
              trigger: be.Pointer,
            })));
    }),
    { isFocusVisible: D, focusProps: H } = ut({
      autoFocus: o,
    }),
    { isHovered: A, hoverProps: G } = mt({
      isDisabled: l,
    }),
    { pressed: _, pressProps: z } = ht({
      disabled: l,
    }),
    Q = ye({
      open: f === R.Open,
      active: _ || f === R.Open,
      disabled: l,
      hover: A,
      focus: D,
      autofocus: o,
    }),
    V = Ye(
      b(),
      {
        ref: m,
        id: n,
        type: xt(e, h.current),
        "aria-haspopup": "menu",
        "aria-controls": B?.id,
        "aria-expanded": f === R.Open,
        disabled: l || void 0,
        autoFocus: o,
        onKeyDown: N,
        onKeyUp: y,
      },
      v,
      H,
      G,
      z,
    );
  return te()({
    ourProps: V,
    theirProps: d,
    slot: Q,
    defaultTag: ma,
    name: "Menu.Button",
  });
}
let xa = "div",
  fa = Ae.RenderStrategy | Ae.Static;
function pa(e, r) {
  let a = c.useId(),
    {
      id: s = `headlessui-menu-items-${a}`,
      anchor: n,
      portal: l = !1,
      modal: o = !0,
      transition: d = !1,
      ...h
    } = e,
    b = St(n),
    m = Oe("Menu.Items"),
    [N, y] = It(b),
    f = Dt(),
    [k, B] = c.useState(null),
    w = ve(
      r,
      b ? N : null,
      O((p) =>
        m.send({
          type: S.SetItemsElement,
          element: p,
        }),
      ),
      B,
    ),
    [v, D] = U(m, (p) => [p.menuState, p.buttonElement]),
    H = ze(D),
    A = ze(k);
  if (b) {
    l = !0;
  }
  let G = Ht(),
    [_, z] = Gt(d, k, G !== null ? (G & ge.Open) === ge.Open : v === R.Open);
  Wt(_, D, () => {
    m.send({
      type: S.CloseMenu,
    });
  });
  let Q = U(m, (p) => p.__demoMode),
    V = Q ? !1 : o && v === R.Open;
  Kt(V, A);
  let j = Q ? !1 : o && v === R.Open;
  Qt(j, {
    allowed: c.useCallback(() => [D, k], [D, k]),
  });
  let I = U(m, m.selectors.didButtonMove) ? !1 : _;
  c.useEffect(() => {
    let p = k;
    if (p && v === R.Open) {
      yt(p) ||
        p.focus({
          preventScroll: !0,
        });
    }
  }, [v, k]);
  oa(v === R.Open, {
    container: k,
    accept(p) {
      if (p.getAttribute("role") === "menuitem") {
        return NodeFilter.FILTER_REJECT;
      }
      if (p.hasAttribute("role")) {
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
    walk(p) {
      p.setAttribute("role", "none");
    },
  });
  let J = wt(),
    Ne = O((event) => {
      var W, ue, ae;
      switch ((J.dispose(), event.key)) {
        case F.Space:
          if (m.state.searchQuery !== "")
            return (
              event.preventDefault(),
              event.stopPropagation(),
              m.send({
                type: S.Search,
                value: event.key,
              })
            );
        case F.Enter:
          if (
            (event.preventDefault(),
            event.stopPropagation(),
            m.state.activeItemIndex !== null)
          ) {
            let { dataRef: Y } = m.state.items[m.state.activeItemIndex];
            (ue = (W = Y.current) == null ? void 0 : W.domRef.current) ==
              null || ue.click();
          }
          m.send({
            type: S.CloseMenu,
          });
          Je(m.state.buttonElement);
          break;
        case F.ArrowDown:
          return (
            event.preventDefault(),
            event.stopPropagation(),
            m.send({
              type: S.GoToItem,
              focus: M.Next,
            })
          );
        case F.ArrowUp:
          return (
            event.preventDefault(),
            event.stopPropagation(),
            m.send({
              type: S.GoToItem,
              focus: M.Previous,
            })
          );
        case F.Home:
        case F.PageUp:
          return (
            event.preventDefault(),
            event.stopPropagation(),
            m.send({
              type: S.GoToItem,
              focus: M.First,
            })
          );
        case F.End:
        case F.PageDown:
          return (
            event.preventDefault(),
            event.stopPropagation(),
            m.send({
              type: S.GoToItem,
              focus: M.Last,
            })
          );
        case F.Escape:
          event.preventDefault();
          event.stopPropagation();
          Te.flushSync(() =>
            m.send({
              type: S.CloseMenu,
            }),
          );
          (ae = m.state.buttonElement) == null ||
            ae.focus({
              preventScroll: !0,
            });
          break;
        case F.Tab:
          event.preventDefault();
          event.stopPropagation();
          Te.flushSync(() =>
            m.send({
              type: S.CloseMenu,
            }),
          );
          kt(m.state.buttonElement, event.shiftKey ? Le.Previous : Le.Next);
          break;
        default:
          if (event.key.length === 1) {
            (m.send({
              type: S.Search,
              value: event.key,
            }),
              J.setTimeout(
                () =>
                  m.send({
                    type: S.ClearSearch,
                  }),
                350,
              ));
          }
          break;
      }
    }),
    Se = O((event) => {
      if (event.key === F.Space) {
        event.preventDefault();
      }
    }),
    Ie = ye({
      open: v === R.Open,
    }),
    ne = Ye(b ? f() : {}, {
      "aria-activedescendant": U(m, m.selectors.activeDescendantId),
      "aria-labelledby": U(m, (p) => {
        var W;
        return (W = p.buttonElement) == null ? void 0 : W.id;
      }),
      id: s,
      onKeyDown: Ne,
      onKeyUp: Se,
      role: "menu",
      tabIndex: v === R.Open ? 0 : void 0,
      ref: w,
      style: {
        ...h.style,
        ...y,
        "--button-width": Et(_, D, !0).width,
      },
      ...Vt(z),
    }),
    De = te();
  return X.createElement(
    qt,
    {
      enabled: l ? e.static || _ : !1,
      ownerDocument: H,
    },
    De({
      ourProps: ne,
      theirProps: h,
      slot: Ie,
      defaultTag: xa,
      features: fa,
      visible: I,
      name: "Menu.Items",
    }),
  );
}
let ga = c.Fragment;
function ba(e, r) {
  let a = c.useId(),
    { id: s = `headlessui-menu-item-${a}`, disabled: n = !1, ...l } = e,
    o = Oe("Menu.Item"),
    d = U(o, (I) => o.selectors.isActive(I, s)),
    h = c.useRef(null),
    b = ve(r, h),
    m = U(o, (I) => o.selectors.shouldScrollIntoView(I, s));
  de(() => {
    if (m)
      return vt().requestAnimationFrame(() => {
        var I, J;
        (J = (I = h.current) == null ? void 0 : I.scrollIntoView) == null ||
          J.call(I, {
            block: "nearest",
          });
      });
  }, [m, h]);
  let N = Ft(h),
    y = c.useRef({
      disabled: n,
      domRef: h,
      get textValue() {
        return N();
      },
    });
  de(() => {
    y.current.disabled = n;
  }, [y, n]);
  de(
    () => (o.actions.registerItem(s, y), () => o.actions.unregisterItem(s)),
    [y, s],
  );
  let f = O(() => {
      o.send({
        type: S.CloseMenu,
      });
    }),
    k = O((event) => {
      if (n) return event.preventDefault();
      o.send({
        type: S.CloseMenu,
      });
      Je(o.state.buttonElement);
    }),
    B = O(() => {
      if (n)
        return o.send({
          type: S.GoToItem,
          focus: M.Nothing,
        });
      o.send({
        type: S.GoToItem,
        focus: M.Specific,
        id: s,
      });
    }),
    w = Rt(),
    v = O((I) => w.update(I)),
    D = O((I) => {
      if (w.wasMoved(I)) {
        n ||
          d ||
          o.send({
            type: S.GoToItem,
            focus: M.Specific,
            id: s,
            trigger: be.Pointer,
          });
      }
    }),
    H = O((I) => {
      if (w.wasMoved(I)) {
        n ||
          (d &&
            o.state.activationTrigger === be.Pointer &&
            o.send({
              type: S.GoToItem,
              focus: M.Nothing,
            }));
      }
    }),
    [A, G] = Xe(),
    [_, z] = Ut(),
    Q = ye({
      active: d,
      focus: d,
      disabled: n,
      close: f,
    }),
    V = {
      id: s,
      ref: b,
      role: "menuitem",
      tabIndex: n === !0 ? void 0 : -1,
      "aria-disabled": n === !0 ? !0 : void 0,
      "aria-labelledby": A,
      "aria-describedby": _,
      disabled: void 0,
      onClick: k,
      onFocus: B,
      onPointerEnter: v,
      onMouseEnter: v,
      onPointerMove: D,
      onMouseMove: D,
      onPointerLeave: H,
      onMouseLeave: H,
    },
    j = te();
  return X.createElement(
    G,
    null,
    X.createElement(
      z,
      null,
      j({
        ourProps: V,
        theirProps: l,
        slot: Q,
        defaultTag: ga,
        name: "Menu.Item",
      }),
    ),
  );
}
let va = "div";
function ya(e, r) {
  let [a, s] = Xe(),
    n = e,
    l = {
      ref: r,
      "aria-labelledby": a,
      role: "group",
    },
    o = te();
  return X.createElement(
    s,
    null,
    o({
      ourProps: l,
      theirProps: n,
      slot: {},
      defaultTag: va,
      name: "Menu.Section",
    }),
  );
}
let wa = "header";
function ka(e, r) {
  let a = c.useId(),
    { id: s = `headlessui-menu-heading-${a}`, ...n } = e,
    l = Jt();
  de(() => l.register(s), [s, l.register]);
  let o = {
    id: s,
    ref: r,
    role: "presentation",
    ...l.props,
  };
  return te()({
    ourProps: o,
    theirProps: n,
    slot: {},
    defaultTag: wa,
    name: "Menu.Heading",
  });
}
let ja = "div";
function Na(e, r) {
  let a = e,
    s = {
      ref: r,
      role: "separator",
    };
  return te()({
    ourProps: s,
    theirProps: a,
    slot: {},
    defaultTag: ja,
    name: "Menu.Separator",
  });
}
let Sa = ee(ua),
  Ia = ee(ha),
  Da = ee(pa),
  Ea = ee(ba),
  Ca = ee(ya),
  Ma = ee(ka),
  Ta = ee(Na),
  xe = Object.assign(Sa, {
    Button: Ia,
    Items: Da,
    Item: Ea,
    Section: Ca,
    Heading: Ma,
    Separator: Ta,
  });
function le(e) {
  return e.toISOString().split("T")[0];
}
function fe(e) {
  return e.toISOString().split("T")[0].slice(0, 7);
}
function se(e, r = "USDT") {
  if (!Number.isFinite(e))
    switch (r) {
      case "BRL":
        return "R$ 0,00";
      case "EUR":
        return "€ 0,00";
      case "BTC":
        return "₿ 0.00000000";
      default:
        return "$0.00";
    }
  const a = e >= 0 ? "" : "-",
    s = Math.abs(e);
  switch (r) {
    case "BRL":
      return `${a}R$ ${s.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case "EUR":
      return `${a}€ ${s.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case "BTC":
      return `${a}₿ ${s.toLocaleString("en-US", {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8,
      })}`;
    default:
      return `${a}$${s.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
  }
}
function $a(e) {
  switch (e) {
    case "update":
      return "Ajuste de Saldo";
    case "deposit":
      return "Depósito";
    case "withdraw":
      return "Saque";
    default:
      return e;
  }
}
const Fa = "http://localhost:8000".replace(/\/$/, ""),
  Ra = () => {
    const e = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(e
        ? {
            Authorization: `Bearer ${e}`,
          }
        : {}),
    };
  };
async function L(e, r) {
  const a = await fetch(`${Fa}${e}`, {
      ...r,
      headers: {
        ...Ra(),
        ...(r?.headers || {}),
      },
    }),
    s = await a.json().catch(() => ({}));
  if (!a.ok) {
    const n = (s && (s.message || s.error)) || "Request failed",
      l = new Error(n);
    throw ((l.status = a.status), l);
  }
  return s;
}
async function Ba() {
  return L("/finance/exchanges");
}
async function Oa(e) {
  return L("/finance/exchanges", {
    method: "POST",
    body: JSON.stringify(e),
  });
}
async function Pa(e, r) {
  return L(`/finance/exchanges/${e}`, {
    method: "PATCH",
    body: JSON.stringify(r),
  });
}
async function La(e) {
  return L(`/finance/exchanges/${e}`, {
    method: "DELETE",
  });
}
async function Aa(e) {
  try {
    return await L(`/finance/bankrolls?month=${e}`);
  } catch (r) {
    if (r?.status === 404) return null;
    throw r;
  }
}
async function _a(e) {
  return L("/finance/bankrolls", {
    method: "PUT",
    body: JSON.stringify({
      currency_code: "USD",
      ...e,
    }),
  });
}
async function za(e) {
  try {
    return await L(`/finance/balances?month=${e}`);
  } catch (r) {
    if (r?.status === 404) return null;
    throw r;
  }
}
async function Ge(e) {
  return L("/finance/balances", {
    method: "PUT",
    body: JSON.stringify(e),
  });
}
async function We(e) {
  try {
    return await L(`/finance/transactions?month=${e}`);
  } catch (r) {
    if (r?.status === 404)
      return {
        items: [],
      };
    throw r;
  }
}
async function Ua(e) {
  return L("/finance/transactions", {
    method: "POST",
    body: JSON.stringify(e),
  });
}
async function Ha(e) {
  return L(`/finance/transactions/${e}`, {
    method: "DELETE",
  });
}
function Ga() {
  const e = new Date(),
    r = fe(e),
    [a, s] = c.useState(!1),
    [n, l] = c.useState(r),
    [o, d] = c.useState(le(e)),
    [h, b] = c.useState("USDT"),
    [m, N] = c.useState({
      USDT: 1,
      BRL: 1,
      EUR: 1,
      BTC: 1,
    }),
    [y, f] = c.useState({}),
    [k, B] = c.useState([]),
    [w, v] = c.useState({}),
    [D, H] = c.useState([]),
    [A, G] = c.useState(!0),
    [_, z] = c.useState(!1),
    [Q, V] = c.useState(!1),
    [j, I] = c.useState(!1),
    [J, Ne] = c.useState(!1),
    Se = (props) => ({
      id: props.id,
      code: props.code,
      name: props.name,
      type: props.kind,
      note: props.note,
      is_active: props.is_active,
      created_at: props.created_at,
    }),
    Ie = (props) => ({
      id: props.id,
      date: props.tx_date,
      timestamp: props.created_at
        ? new Date(props.created_at).getTime()
        : new Date(props.tx_date).getTime(),
      type: props.tx_type,
      exchangeId: props.exchange_id,
      amount: props.amount,
      delta: props.delta,
      note: props.note,
    }),
    ne = async () => {
      try {
        const i = await Ba();
        B((i.items || []).map(Se));
      } catch (i) {
        console.error("Erro ao buscar corretoras", i);
      }
    },
    De = async (i, u = !1) => {
      try {
        const x = await Aa(i);
        x
          ? f((g) => ({
              ...g,
              [i]: x.initial_bankroll,
            }))
          : u && z(!0);
      } catch (x) {
        console.error("Erro ao buscar banca inicial", x);
        if (u) {
          z(!0);
        }
      }
    },
    p = async (i) => {
      try {
        const u = await za(i);
        if (u?.items) {
          const x = {};
          u.items.forEach((item) => {
            x[item.date] || (x[item.date] = {});
            x[item.date][item.exchange_id] = item.balance;
          });
          v((g) => ({
            ...g,
            ...x,
          }));
        }
      } catch (u) {
        console.error("Erro ao buscar saldos", u);
      }
    },
    W = async (i) => {
      try {
        const x = ((await We(i)).items || []).map(Ie);
        x.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        H(x);
      } catch (u) {
        console.error("Erro ao buscar transações", u);
      }
    },
    ue = async () => {
      try {
        const u = await (
            await fetch(
              "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL",
            )
          ).json(),
          x = parseFloat(u.USDBRL?.bid || "0"),
          g = parseFloat(u.EURBRL?.bid || "0"),
          E = parseFloat(u.BTCBRL?.bid || "0");
        if (x > 0) {
          N({
            USDT: 1,
            BRL: x,
            EUR: g > 0 ? x / g : 0,
            BTC: E > 0 ? x / E : 0,
          });
        }
      } catch (i) {
        console.error("Erro ao buscar cotações", i);
      }
    };
  c.useEffect(() => {
    (async () => {
      G(!0);
      const u = [De(n, !a), p(n), W(n)];
      a || (u.push(ne()), u.push(ue()));
      await Promise.all(u);
      G(!1);
      a || s(!0);
    })();
  }, [n]);
  c.useEffect(() => {
    o.startsWith(n) || d(`${n}-01`);
  }, [n, o]);
  const ae = (i, u) => {
      if (w[u]?.[i] !== void 0) return w[u][i];
      const x = Object.keys(w).sort(),
        g = x.indexOf(u);
      if (w[u]?.[i] !== void 0) return w[u][i];
      const E = g === -1 ? x.filter((item) => item < u).length - 1 : g - 1;
      for (let T = E; T >= 0; T--) {
        const C = x[T];
        if (w[C]?.[i] !== void 0) return w[C][i];
      }
      return 0;
    },
    Y = (i) => k.reduce((item, acc) => item + ae(acc.id, i), 0),
    Ee = c.useMemo(() => {
      if (!a || A)
        return {
          startBalance: 0,
          currentBalance: 0,
          deposits: 0,
          withdrawals: 0,
          profit: 0,
          roi: 0,
        };
      const i = y[n] || 0;
      if (i === 0)
        return {
          startBalance: 0,
          currentBalance: 0,
          deposits: 0,
          withdrawals: 0,
          profit: 0,
          roi: 0,
        };
      const u = Y(o);
      let x = 0,
        g = 0;
      D.forEach((props) => {
        if (props.date.startsWith(n) && props.date <= o) {
          (props.type === "deposit" && (x += Number(props.amount)),
            props.type === "withdraw" && (g += Number(props.amount)));
        }
      });
      const E = u - i - (x - g),
        T = i > 0 ? (E / i) * 100 : 0;
      return {
        startBalance: i,
        currentBalance: u,
        deposits: x,
        withdrawals: g,
        profit: E,
        roi: T,
      };
    }, [n, o, D, w, k, y]),
    at = c.useMemo(() => {
      if (!a || A)
        return {
          profit: 0,
          roi: 0,
          currentTotal: 0,
        };
      const i = Y(o),
        u = new Date(o),
        x = new Date(u);
      x.setDate(u.getDate() - 1);
      const g = le(x);
      let E = Y(g);
      const T = o.endsWith("-01");
      if (E === 0 || T) {
        const P = o.slice(0, 7);
        if (y[P]) {
          E = y[P];
        }
      }
      let C = 0,
        K = 0;
      D.forEach((props) => {
        if (props.date === o) {
          (props.type === "deposit" && (C += Number(props.amount)),
            props.type === "withdraw" && (K += Number(props.amount)));
        }
      });
      const q = i - E - C + K,
        re = E,
        oe = re > 0 ? (q / re) * 100 : 0;
      return {
        profit: q,
        roi: oe,
        currentTotal: i,
      };
    }, [o, D, w, k, y]),
    rt = c.useMemo(() => {
      if (!a || A) return 0;
      const [i, u] = n.split("-").map(Number),
        x = new Date(i, u, 0).getDate(),
        g = new Date(),
        T = g.getFullYear() === i && g.getMonth() + 1 === u ? g.getDate() : x;
      let C = 1;
      for (let K = T; K >= 1; K--) {
        const q = `${n}-${K.toString().padStart(2, "0")}`,
          re = Object.keys(w[q] || {}).length > 0,
          oe = D.some((item) => item.date === q);
        if (re || oe) {
          C = K;
          break;
        }
      }
      return Ee.profit / C;
    }, [Ee.profit, n, w, D]),
    st = c.useMemo(() => {
      if (!a || A)
        return [
          {
            name: "Lucro Diário",
            type: "bar",
            data: [],
          },
        ];
      const [i, u] = n.split("-").map(Number),
        x = new Date(i, u, 0).getDate(),
        g = [],
        T = n === fe(new Date()) ? new Date().getDate() : x;
      for (let C = 1; C <= T; C++) {
        const K = C.toString().padStart(2, "0"),
          q = `${n}-${K}`,
          re = Y(q),
          oe = new Date(i, u - 1, C - 1),
          P = le(oe);
        let Ce = Y(P);
        if (C === 1 && Ce === 0) {
          Ce = y[n] || 0;
        }
        let Me = 0;
        D.forEach((props) => {
          if (props.date === q) {
            (props.type === "deposit" && (Me += Number(props.amount)),
              props.type === "withdraw" && (Me -= Number(props.amount)));
          }
        });
        const nt = re - Ce - Me;
        g.push({
          x: C,
          y: nt,
        });
      }
      return [
        {
          name: "Lucro Diário",
          type: "bar",
          data: g,
        },
      ];
    }, [n, w, D]);
  return {
    isLoaded: a,
    selectedMonth: n,
    selectedDate: o,
    currency: h,
    conversionRates: m,
    initialBankrolls: y,
    exchanges: k,
    entries: w,
    transactions: D,
    monthStats: Ee,
    dailyStats: at,
    monthlyAverage: rt,
    chartSeries: st,
    isInitModalOpen: _,
    isTransactionModalOpen: Q,
    isExchangeModalOpen: j,
    isConfigModalOpen: J,
    setSelectedMonth: l,
    setCurrency: b,
    setIsInitModalOpen: z,
    setIsTransactionModalOpen: V,
    setIsExchangeModalOpen: I,
    setIsConfigModalOpen: Ne,
    handlePrevDay: () => {
      const i = new Date(o);
      i.setDate(i.getDate() - 1);
      const u = le(i);
      d(u);
      u.startsWith(n) || l(fe(i));
    },
    handleNextDay: () => {
      const i = new Date(o);
      i.setDate(i.getDate() + 1);
      const u = le(i);
      d(u);
      u.startsWith(n) || l(fe(i));
    },
    handleDateChange: (i) => {
      if (!i) return;
      d(i);
      const u = i.slice(0, 7);
      if (u !== n) {
        l(u);
      }
    },
    handleSaveInitialBankroll: async (i) => {
      if (!isNaN(i))
        try {
          await _a({
            month: n,
            initial_bankroll: i,
            currency_code: "USD",
          });
          f((u) => ({
            ...u,
            [n]: i,
          }));
          z(!1);
        } catch (u) {
          console.error("Erro ao salvar banca inicial", u);
        }
    },
    handleDirectBalanceUpdate: async (i, u) => {
      try {
        const x = await Ge({
          exchange_id: i,
          date: o,
          balance: u,
        });
        v((g) => ({
          ...g,
          [o]: {
            ...(g[o] || {}),
            [i]: x.balance,
          },
        }));
        await Promise.all([W(n), p(n)]);
      } catch (x) {
        console.error("Erro ao salvar saldo", x);
      }
    },
    handleAddTransaction: async (i, u, x, g) => {
      if (!(!u || isNaN(x)))
        try {
          if (
            (await Ua({
              tx_date: o,
              tx_type: i,
              exchange_id: u,
              amount: x,
              note: g,
            }),
            i === "deposit" || i === "withdraw")
          ) {
            let T = ae(u, o);
            if (i === "deposit") {
              T += x;
            }
            if (i === "withdraw") {
              T -= x;
            }
            await Ge({
              exchange_id: u,
              date: o,
              balance: T,
            });
          }
          await Promise.all([W(n), p(n)]);
          V(!1);
        } catch (E) {
          console.error("Erro ao criar transação", E);
        }
    },
    handleSaveExchange: async (i, u, x, g) => {
      if (i)
        try {
          if (g)
            await Pa(g, {
              name: i,
              kind: u,
              note: x,
            });
          else {
            const E = i.toLowerCase().replace(/\s+/g, "-");
            await Oa({
              code: E,
              name: i,
              kind: u,
              note: x,
            });
          }
          await ne();
          I(!1);
        } catch (E) {
          console.error("Erro ao salvar corretora", E);
        }
    },
    handleDeleteExchange: async (i) => {
      try {
        await La(i);
        await ne();
      } catch (u) {
        console.error("Erro ao remover corretora", u);
      }
    },
    handleClearMonthData: async () => {
      try {
        const i = await We(n);
        await Promise.all(
          (i.items || []).map((props) => Ha(props.id).catch(() => null)),
        );
        v((u) => {
          const x = {
            ...u,
          };
          return (
            Object.keys(x).forEach((item) => {
              if (item.startsWith(n)) {
                delete x[item];
              }
            }),
            x
          );
        });
        H((u) => u.filter((item) => !item.date.startsWith(n)));
      } catch (i) {
        console.error("Erro ao limpar dados do mês", i);
      }
    },
    getBalanceAtDate: ae,
  };
}
function Wa({
  selectedMonth: e,
  initialBankroll: r,
  selectedDate: a,
  onUpdateBankroll: s,
  onMonthChange: n,
  onDateChange: l,
  onPrevDay: o,
  onNextDay: d,
  onOpenTransaction: h,
  currency: b,
  onCurrencyChange: m,
  conversionRate: N,
}) {
  const [y, f] = c.useState(r?.toString() || ""),
    k = c.useRef(null);
  c.useEffect(() => {
    f(r?.toString() || "");
  }, [r]);
  c.useEffect(
    () => () => {
      if (k.current) {
        clearTimeout(k.current);
      }
    },
    [],
  );
  const B = (v) => {
      f(v);
      if (k.current) {
        clearTimeout(k.current);
      }
      k.current = setTimeout(() => {
        const D = parseFloat(v) || 0;
        s(D);
      }, 800);
    },
    w = () => {
      if (k.current) {
        (clearTimeout(k.current), (k.current = null));
      }
      const v = parseFloat(y) || 0;
      s(v);
    };
  return t.jsx("div", {
    className: "mb-8 space-y-6",
    children: t.jsxs("div", {
      className:
        "relative overflow-hidden rounded-3xl border border-gray-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 px-6 py-8 shadow-xl ring-1 ring-white/10 dark:border-dark-700 dark:from-dark-900 dark:via-dark-900 dark:to-indigo-950/30",
      children: [
        t.jsxs("div", {
          className: "absolute inset-0 opacity-60",
          children: [
            t.jsx("div", {
              className:
                "absolute -left-10 top-6 h-40 w-40 rounded-full bg-emerald-400/30 blur-3xl",
            }),
            t.jsx("div", {
              className:
                "absolute bottom-0 right-0 h-48 w-48 rounded-full bg-indigo-400/30 blur-3xl",
            }),
            t.jsx("div", {
              className:
                "absolute left-1/3 top-8 h-24 w-[420px] rotate-3 rounded-full bg-white/10 blur-2xl",
            }),
          ],
        }),
        t.jsxs("div", {
          className:
            "relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center",
          children: [
            t.jsxs("div", {
              className: "space-y-4",
              children: [
                t.jsx("div", {
                  className:
                    "flex flex-wrap items-center gap-2 text-xs text-white/80",
                  children: t.jsx(Fe, {
                    variant: "filled",
                    color: "primary",
                    className:
                      "bg-white/15 px-3 py-1 text-white backdrop-blur border border-white/10",
                    children: "Controle Financeiro",
                  }),
                }),
                t.jsxs("div", {
                  children: [
                    t.jsx("h1", {
                      className: "text-3xl font-bold text-white md:text-4xl",
                      children: "Gestão de Ativos",
                    }),
                    t.jsx("div", {
                      className: "mt-4 flex items-center gap-3",
                      children: t.jsxs("div", {
                        className: "flex flex-col",
                        children: [
                          t.jsxs("span", {
                            className:
                              "text-xs text-white/60 uppercase font-bold tracking-wider",
                            children: ["Banca Inicial (", e, ")"],
                          }),
                          t.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              t.jsx("span", {
                                className: "text-white/60",
                                children: "$",
                              }),
                              t.jsx("input", {
                                type: "number",
                                value: y,
                                onChange: (event) => B(event.target.value),
                                onBlur: w,
                                className:
                                  "w-32 bg-transparent text-2xl font-bold text-white outline-none border-b border-white/20 focus:border-white/50 transition-colors placeholder-white/30",
                                placeholder: "0.00",
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  ],
                }),
              ],
            }),
            t.jsxs("div", {
              className:
                "relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur flex flex-col gap-4",
              children: [
                t.jsxs("div", {
                  className:
                    "flex items-center justify-between border-b border-white/10 pb-3",
                  children: [
                    t.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        t.jsx("p", {
                          className:
                            "text-xs uppercase text-white/60 font-medium tracking-wider",
                          children: "Controles",
                        }),
                        t.jsxs("select", {
                          value: b,
                          onChange: (event) => m(event.target.value),
                          className:
                            "bg-white/10 text-xs font-bold text-white outline-none border border-white/20 rounded px-2 py-0.5 cursor-pointer hover:bg-white/20",
                          children: [
                            t.jsx("option", {
                              value: "USDT",
                              className: "text-gray-900",
                              children: "USDT",
                            }),
                            t.jsx("option", {
                              value: "BRL",
                              className: "text-gray-900",
                              children: "BRL",
                            }),
                            t.jsx("option", {
                              value: "EUR",
                              className: "text-gray-900",
                              children: "EUR",
                            }),
                            t.jsx("option", {
                              value: "BTC",
                              className: "text-gray-900",
                              children: "BTC",
                            }),
                          ],
                        }),
                        N !== void 0 &&
                          b !== "USDT" &&
                          t.jsx(ot, {
                            variant: "soft",
                            color: "primary",
                            className:
                              "border border-this-darker/20 dark:border-this-lighter/20 mr-2",
                            children: N.toLocaleString(void 0, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: b === "BTC" ? 7 : 2,
                            }),
                          }),
                      ],
                    }),
                    t.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [
                        t.jsx("span", {
                          className: "text-xs text-white/80",
                          children: "Mês:",
                        }),
                        t.jsx("input", {
                          type: "month",
                          value: e,
                          onChange: (event) => n(event.target.value),
                          className:
                            "bg-transparent text-sm font-bold text-white outline-none [&::-webkit-calendar-picker-indicator]:invert",
                        }),
                      ],
                    }),
                  ],
                }),
                t.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    t.jsx("label", {
                      className: "text-xs text-white/70",
                      children: "Data de Referência",
                    }),
                    t.jsxs("div", {
                      className: "flex gap-3",
                      children: [
                        t.jsxs("div", {
                          className:
                            "flex-1 flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20",
                          children: [
                            t.jsx($, {
                              isIcon: !0,
                              variant: "flat",
                              className:
                                "size-8 text-white/70 hover:text-white hover:bg-white/10 rounded-md",
                              onClick: o,
                              children: t.jsx(ta, {
                                className: "size-4",
                              }),
                            }),
                            t.jsx("input", {
                              type: "date",
                              value: a,
                              onChange: (event) => l(event.target.value),
                              className:
                                "flex-1 bg-transparent text-sm text-center text-white outline-none [&::-webkit-calendar-picker-indicator]:invert",
                            }),
                            t.jsx($, {
                              isIcon: !0,
                              variant: "flat",
                              className:
                                "size-8 text-white/70 hover:text-white hover:bg-white/10 rounded-md",
                              onClick: d,
                              children: t.jsx(ra, {
                                className: "size-4",
                              }),
                            }),
                          ],
                        }),
                        t.jsxs($, {
                          color: "primary",
                          className:
                            "shadow-lg shadow-indigo-500/20 whitespace-nowrap",
                          onClick: h,
                          children: [
                            t.jsx(Ke, {
                              className: "size-4 mr-2",
                            }),
                            "Lançamento",
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
function Ka({
  monthStats: e,
  dailyStats: r,
  monthlyAverage: a,
  selectedDate: s,
  currency: n,
  conversionRate: l,
}) {
  const o = (h) => {
      return n !== "USDT" ? h * l : h;
    },
    d = [
      {
        title: "Banca Total",
        value: se(o(e.currentBalance), n),
        badge: `Atual em ${s}`,
        icon: t.jsx(Re, {
          className: "size-5 text-indigo-600",
        }),
        tone: "from-indigo-500/20 to-blue-500/10",
        borderColor: "border-indigo-100",
      },
      {
        title: "Lucro do Mês",
        value: se(o(e.profit), n),
        badge: `ROI: ${e.roi.toFixed(2)}%`,
        icon: t.jsx(Qe, {
          className: "size-5 text-emerald-600",
        }),
        tone: "from-emerald-500/20 to-teal-500/10",
        borderColor: "border-emerald-100",
      },
      {
        title: "Lucro do Dia",
        value: se(o(r.profit), n),
        badge: `ROI: ${r.roi.toFixed(2)}%`,
        icon: t.jsx(Ve, {
          className: "size-5 text-amber-600",
        }),
        tone: "from-amber-500/20 to-orange-500/10",
        borderColor: "border-amber-100",
      },
      {
        title: "Média Diária (Mês)",
        value: se(o(a), n),
        badge: "Performance média",
        icon: t.jsx(lt, {
          className: "size-5 text-blue-600",
        }),
        tone: "from-blue-500/20 to-cyan-500/10",
        borderColor: "border-blue-100",
      },
    ];
  return t.jsx("div", {
    className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
    children: d.map((props) =>
      t.jsxs(
        "div",
        {
          className: Z(
            "overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-700/80 dark:bg-dark-800/80",
            props.borderColor,
          ),
          children: [
            t.jsx("div", {
              className: `h-1.5 w-full bg-gradient-to-r ${props.tone}`,
            }),
            t.jsxs("div", {
              className: "p-5",
              children: [
                t.jsxs("div", {
                  className: "flex items-center justify-between mb-3",
                  children: [
                    t.jsx("div", {
                      className: Z(
                        "p-2 rounded-lg bg-gray-50 dark:bg-dark-700",
                      ),
                      children: props.icon,
                    }),
                    t.jsx(Fe, {
                      variant: "soft",
                      className: "text-[10px]",
                      children: props.badge,
                    }),
                  ],
                }),
                t.jsxs("div", {
                  children: [
                    t.jsx("p", {
                      className:
                        "text-xs uppercase tracking-wide text-gray-500 dark:text-dark-300 font-medium",
                      children: props.title,
                    }),
                    t.jsx("p", {
                      className:
                        "mt-1 text-2xl font-bold text-gray-900 dark:text-dark-50",
                      children: props.value,
                    }),
                  ],
                }),
              ],
            }),
          ],
        },
        props.title,
      ),
    ),
  });
}
const Qa = ({ value: e, onSave: r }) => {
  const [a, s] = c.useState(e.toString());
  c.useEffect(() => {
    s(e.toString());
  }, [e]);
  const n = () => {
      if (a.trim() === "") {
        r(0);
        s("0");
        return;
      }
      const o = parseFloat(a);
      !isNaN(o) && o !== parseFloat(e.toString()) ? r(o) : s(e.toString());
    },
    l = (event) => {
      if (event.key === "Enter") {
        event.target.blur();
      }
    };
  return t.jsxs("div", {
    className: "relative",
    children: [
      t.jsx("span", {
        className:
          "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium",
        children: "$",
      }),
      t.jsx("input", {
        type: "number",
        value: a,
        onChange: (event) => s(event.target.value),
        onBlur: n,
        onKeyDown: l,
        placeholder: "0.00",
        className:
          "w-full rounded-lg border border-gray-200 bg-white py-2 pl-6 pr-3 text-sm font-semibold text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-dark-600 dark:bg-dark-700 dark:text-white",
      }),
    ],
  });
};
function Va({
  exchanges: e,
  selectedDate: r,
  getBalanceAtDate: a,
  onUpdateBalance: s,
  onManage: n,
  onNew: l,
}) {
  const o = () => {
    if (
      window.confirm("Tem certeza que deseja zerar todos os saldos exibidos?")
    ) {
      e.forEach((props) => {
        if (a(props.id, r) !== 0) {
          s(props.id, 0);
        }
      });
    }
  };
  return t.jsxs("div", {
    className:
      "rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-dark-700/80 dark:bg-dark-800/80",
    children: [
      t.jsxs("div", {
        className: "mb-6 flex flex-wrap items-center justify-between gap-4",
        children: [
          t.jsxs("div", {
            children: [
              t.jsxs("h3", {
                className:
                  "text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2",
                children: [
                  t.jsx(Re, {
                    className: "size-5 text-gray-400",
                  }),
                  "Saldos por Corretora",
                ],
              }),
              t.jsxs("p", {
                className: "text-sm text-gray-500 dark:text-dark-300 mt-1",
                children: [
                  "Atualize o valor atual em cada conta para o dia ",
                  t.jsx("span", {
                    className: "font-semibold text-indigo-600",
                    children: r,
                  }),
                  ".",
                ],
              }),
            ],
          }),
          t.jsxs("div", {
            className: "flex gap-2",
            children: [
              t.jsxs($, {
                variant: "soft",
                onClick: o,
                className:
                  "text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
                children: [
                  t.jsx($e, {
                    className: "size-4 mr-1",
                  }),
                  " Limpar",
                ],
              }),
              t.jsxs($, {
                variant: "soft",
                onClick: n,
                className: "text-xs",
                children: [
                  t.jsx(dt, {
                    className: "size-4 mr-1",
                  }),
                  " Gerenciar",
                ],
              }),
              t.jsxs($, {
                variant: "soft",
                onClick: l,
                className: "text-xs",
                children: [
                  t.jsx(Ke, {
                    className: "size-4 mr-1",
                  }),
                  " Nova",
                ],
              }),
            ],
          }),
        ],
      }),
      t.jsx("div", {
        className: "grid gap-4 sm:grid-cols-2",
        children: e.map((props) => {
          const h = a(props.id, r);
          return t.jsxs(
            "div",
            {
              className:
                "group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-md dark:border-dark-700 dark:bg-dark-700/30 dark:hover:border-indigo-500/30 dark:hover:bg-dark-700",
              children: [
                t.jsx("div", {
                  className: "flex justify-between items-start mb-3",
                  children: t.jsxs("div", {
                    className: "flex items-center gap-3",
                    children: [
                      t.jsx("div", {
                        className:
                          "grid size-10 place-items-center rounded-xl bg-white text-lg font-bold text-indigo-600 shadow-sm ring-1 ring-gray-100 dark:bg-dark-600 dark:text-indigo-400 dark:ring-dark-500",
                        children: props.name[0],
                      }),
                      t.jsxs("div", {
                        children: [
                          t.jsx("h4", {
                            className:
                              "font-bold text-gray-900 dark:text-white text-sm",
                            children: props.name,
                          }),
                          t.jsx("span", {
                            className:
                              "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-600 dark:text-dark-300",
                            children: props.type,
                          }),
                        ],
                      }),
                    ],
                  }),
                }),
                t.jsxs("div", {
                  className: "space-y-1",
                  children: [
                    t.jsx("label", {
                      className:
                        "text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-300",
                      children: "Saldo (USD)",
                    }),
                    t.jsx(Qa, {
                      value: h,
                      onSave: (b) => s(props.id, b),
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
  });
}
function qa({ series: e, selectedMonth: r }) {
  const { primaryColorScheme: a, isDark: s } = it(),
    n = c.useMemo(
      () => ({
        chart: {
          type: "bar",
          toolbar: {
            show: !1,
          },
          zoom: {
            enabled: !1,
          },
          fontFamily: "Inter, sans-serif",
          background: "transparent",
          animations: {
            enabled: !0,
            speed: 800,
          },
        },
        colors: [a[500]],
        dataLabels: {
          enabled: !1,
        },
        plotOptions: {
          bar: {
            borderRadius: 4,
            columnWidth: "60%",
          },
        },
        xaxis: {
          type: "category",
          tooltip: {
            enabled: !1,
          },
          axisBorder: {
            show: !1,
          },
          axisTicks: {
            show: !1,
          },
          labels: {
            style: {
              colors: s ? "#94a3b8" : "#64748b",
              fontSize: "12px",
            },
          },
          crosshairs: {
            show: !0,
            stroke: {
              color: s ? "#334155" : "#e2e8f0",
              width: 1,
              dashArray: 4,
            },
          },
        },
        yaxis: {
          title: {
            text: "Lucro Diário",
            style: {
              color: s ? "#94a3b8" : "#64748b",
              fontSize: "12px",
              fontWeight: 500,
            },
          },
          labels: {
            style: {
              colors: s ? "#94a3b8" : "#64748b",
            },
            formatter: (l) =>
              `$${l.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}`,
          },
        },
        grid: {
          show: !0,
          borderColor: s ? "#334155" : "#f1f5f9",
          strokeDashArray: 4,
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        theme: {
          mode: s ? "dark" : "light",
        },
        legend: {
          show: !1,
        },
        tooltip: {
          enabled: !0,
          shared: !0,
          intersect: !1,
          theme: s ? "dark" : "light",
          y: {
            formatter: function (l) {
              return (
                "$ " +
                l.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              );
            },
          },
          style: {
            fontSize: "12px",
          },
          marker: {
            show: !0,
          },
          x: {
            show: !0,
            format: "dd MMM",
          },
        },
      }),
      [s, a],
    );
  return t.jsxs("div", {
    className:
      "rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-dark-700/60 dark:bg-dark-800/60",
    children: [
      t.jsxs("div", {
        className: "mb-8 flex items-center justify-between",
        children: [
          t.jsxs("div", {
            children: [
              t.jsx("h3", {
                className:
                  "text-lg font-bold tracking-tight text-gray-900 dark:text-white",
                children: "Lucro Diário",
              }),
              t.jsx("div", {
                className: "mt-1 flex items-center gap-2",
                children: t.jsx("p", {
                  className:
                    "text-xs font-medium text-gray-500 dark:text-gray-400",
                  children: "Performance diária no mês",
                }),
              }),
            ],
          }),
          t.jsx(Fe, {
            variant: "soft",
            color: "primary",
            className:
              "px-3 py-1 text-xs font-semibold uppercase tracking-wider",
            children: r,
          }),
        ],
      }),
      t.jsx("div", {
        className: "h-[320px] w-full",
        children: t.jsx(
          ct,
          {
            options: n,
            series: e,
            type: "bar",
            height: 320,
          },
          r,
        ),
      }),
    ],
  });
}
function Ja({ transactions: e, exchanges: r, selectedMonth: a }) {
  const [s, n] = c.useState("all"),
    l = e.filter((props) =>
      props.date.startsWith(a) ? (s === "all" ? !0 : props.type === s) : !1,
    ),
    o = [
      {
        label: "Todas",
        value: "all",
      },
      {
        label: "Depósitos",
        value: "deposit",
      },
      {
        label: "Saques",
        value: "withdraw",
      },
      {
        label: "Atualizações",
        value: "update",
      },
    ];
  return t.jsxs("div", {
    className:
      "rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-dark-700/80 dark:bg-dark-800/80 h-full flex flex-col",
    children: [
      t.jsxs("div", {
        className: "mb-4 flex items-center justify-between",
        children: [
          t.jsx("h3", {
            className: "text-lg font-bold text-gray-900 dark:text-white",
            children: "Histórico",
          }),
          t.jsxs(xe, {
            as: "div",
            className: "relative inline-block text-left",
            children: [
              t.jsx(xe.Button, {
                as: c.Fragment,
                children: t.jsx($, {
                  variant: "flat",
                  isIcon: !0,
                  className: Z(
                    "size-8 transition-colors",
                    s !== "all"
                      ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400"
                      : "text-gray-400",
                  ),
                  children: t.jsx(Yt, {
                    className: "size-4",
                  }),
                }),
              }),
              t.jsx(ce, {
                as: c.Fragment,
                enter: "transition ease-out duration-100",
                enterFrom: "transform opacity-0 scale-95",
                enterTo: "transform opacity-100 scale-100",
                leave: "transition ease-in duration-75",
                leaveFrom: "transform opacity-100 scale-100",
                leaveTo: "transform opacity-0 scale-95",
                children: t.jsx(xe.Items, {
                  className:
                    "absolute right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:divide-dark-600 dark:bg-dark-700 dark:ring-white/5 z-10",
                  children: t.jsx("div", {
                    className: "p-1",
                    children: o.map((props) =>
                      t.jsx(
                        xe.Item,
                        {
                          children: ({ active: h }) =>
                            t.jsxs("button", {
                              onClick: () => n(props.value),
                              className: Z(
                                "group flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs",
                                h
                                  ? "bg-indigo-50 text-indigo-600 dark:bg-dark-600 dark:text-indigo-400"
                                  : "text-gray-700 dark:text-dark-200",
                                s === props.value && !h
                                  ? "font-semibold text-indigo-600 dark:text-indigo-400"
                                  : "",
                              ),
                              children: [
                                props.label,
                                s === props.value &&
                                  t.jsx(Zt, {
                                    className: "size-3",
                                  }),
                              ],
                            }),
                        },
                        props.value,
                      ),
                    ),
                  }),
                }),
              }),
            ],
          }),
        ],
      }),
      t.jsxs("div", {
        className:
          "flex-1 overflow-y-auto pr-2 space-y-3 max-h-[950px] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-dark-600",
        children: [
          l.length === 0 &&
            t.jsxs("div", {
              className:
                "flex flex-col items-center justify-center py-12 text-center text-gray-400",
              children: [
                t.jsx("div", {
                  className:
                    "rounded-full bg-gray-50 p-4 mb-3 dark:bg-dark-700",
                  children: t.jsx(Xt, {
                    className: "size-6 text-gray-300",
                  }),
                }),
                t.jsxs("p", {
                  className: "text-sm",
                  children: [
                    "Nenhuma atividade encontrada",
                    t.jsx("br", {}),
                    "com este filtro.",
                  ],
                }),
              ],
            }),
          l.map((props) => {
            const h =
                r.find((props) => props.id === props.exchangeId)?.name ||
                props.exchangeId,
              b =
                props.type === "deposit" ||
                (props.type === "update" && (props.delta || 0) > 0);
            return t.jsxs(
              "div",
              {
                className:
                  "relative flex gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:bg-white hover:shadow-sm dark:border-dark-700 dark:bg-dark-700/50",
                children: [
                  t.jsx("div", {
                    className: Z(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      props.type === "deposit"
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : props.type === "withdraw"
                          ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
                    ),
                    children:
                      props.type === "deposit"
                        ? t.jsx(Qe, {
                            className: "size-4",
                          })
                        : props.type === "withdraw"
                          ? t.jsx(na, {
                              className: "size-4",
                            })
                          : t.jsx(Ve, {
                              className: "size-4",
                            }),
                  }),
                  t.jsxs("div", {
                    className: "flex-1 min-w-0",
                    children: [
                      t.jsxs("div", {
                        className: "flex justify-between items-start",
                        children: [
                          t.jsx("p", {
                            className:
                              "text-xs font-bold text-gray-900 dark:text-white truncate",
                            children: $a(props.type),
                          }),
                          t.jsx("span", {
                            className:
                              "text-[10px] text-gray-400 whitespace-nowrap ml-2",
                            children: props.date.slice(5),
                          }),
                        ],
                      }),
                      t.jsx("p", {
                        className:
                          "text-[11px] text-gray-500 dark:text-dark-300 truncate",
                        children: h,
                      }),
                      props.note &&
                        t.jsxs("p", {
                          className:
                            "mt-0.5 text-[10px] italic text-gray-400 truncate",
                          children: ['"', props.note, '"'],
                        }),
                    ],
                  }),
                  t.jsxs("div", {
                    className: "text-right shrink-0",
                    children: [
                      t.jsxs("p", {
                        className: Z(
                          "text-sm font-bold",
                          props.type === "withdraw"
                            ? "text-red-600 dark:text-red-400"
                            : b
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-700 dark:text-gray-300",
                        ),
                        children: [
                          props.type === "withdraw" ? "-" : "+",
                          se(
                            props.type === "update"
                              ? Math.abs(props.delta || 0)
                              : props.amount,
                          ),
                        ],
                      }),
                      props.type === "update" &&
                        t.jsxs("p", {
                          className: "text-[9px] text-gray-400",
                          children: ["Total: ", se(props.amount)],
                        }),
                    ],
                  }),
                ],
              },
              props.id,
            );
          }),
        ],
      }),
    ],
  });
}
function Ya() {
  return t.jsxs("div", {
    className: "w-full px-(--margin-x) pb-10 pt-5 lg:pt-6 space-y-6",
    children: [
      t.jsxs("div", {
        className:
          "animate-pulse rounded-3xl border border-gray-200/80 bg-white/80 p-6 shadow-sm dark:border-dark-700/80 dark:bg-dark-800/80",
        children: [
          t.jsx("div", {
            className: "h-6 w-32 rounded bg-gray-200 dark:bg-dark-600 mb-3",
          }),
          t.jsx("div", {
            className: "h-10 w-64 rounded bg-gray-200 dark:bg-dark-600 mb-4",
          }),
          t.jsx("div", {
            className: "h-12 w-full rounded bg-gray-100 dark:bg-dark-700",
          }),
        ],
      }),
      t.jsx("div", {
        className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        children: [...Array(4)].map((item, index) =>
          t.jsxs(
            "div",
            {
              className:
                "animate-pulse overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-dark-700/80 dark:bg-dark-800/80",
              children: [
                t.jsx("div", {
                  className:
                    "h-4 w-24 rounded bg-gray-200 dark:bg-dark-600 mb-3",
                }),
                t.jsx("div", {
                  className:
                    "h-7 w-28 rounded bg-gray-200 dark:bg-dark-600 mb-2",
                }),
                t.jsx("div", {
                  className: "h-3 w-20 rounded bg-gray-100 dark:bg-dark-700",
                }),
              ],
            },
            index,
          ),
        ),
      }),
      t.jsxs("div", {
        className: "grid gap-6 lg:grid-cols-3",
        children: [
          t.jsxs("div", {
            className: "lg:col-span-2 space-y-6",
            children: [
              t.jsxs("div", {
                className:
                  "animate-pulse rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-dark-700/80 dark:bg-dark-800/80",
                children: [
                  t.jsx("div", {
                    className:
                      "h-5 w-40 rounded bg-gray-200 dark:bg-dark-600 mb-4",
                  }),
                  t.jsx("div", {
                    className: "grid gap-3 sm:grid-cols-2",
                    children: [...Array(4)].map((item, index) =>
                      t.jsxs(
                        "div",
                        {
                          className:
                            "rounded-xl border border-dashed border-gray-200/80 p-4 dark:border-dark-700/60",
                          children: [
                            t.jsx("div", {
                              className:
                                "h-4 w-28 rounded bg-gray-200 dark:bg-dark-600 mb-2",
                            }),
                            t.jsx("div", {
                              className:
                                "h-10 w-full rounded bg-gray-100 dark:bg-dark-700",
                            }),
                          ],
                        },
                        index,
                      ),
                    ),
                  }),
                ],
              }),
              t.jsxs("div", {
                className:
                  "animate-pulse rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-dark-700/80 dark:bg-dark-800/80",
                children: [
                  t.jsx("div", {
                    className:
                      "h-5 w-48 rounded bg-gray-200 dark:bg-dark-600 mb-4",
                  }),
                  t.jsx("div", {
                    className:
                      "h-[260px] w-full rounded-2xl bg-gray-100 dark:bg-dark-700",
                  }),
                ],
              }),
            ],
          }),
          t.jsx("div", {
            className: "space-y-4",
            children: [...Array(3)].map((item, index) =>
              t.jsxs(
                "div",
                {
                  className:
                    "animate-pulse rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-dark-700/80 dark:bg-dark-800/80",
                  children: [
                    t.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        t.jsx("div", {
                          className:
                            "h-9 w-9 rounded-full bg-gray-200 dark:bg-dark-700",
                        }),
                        t.jsxs("div", {
                          className: "flex-1",
                          children: [
                            t.jsx("div", {
                              className:
                                "h-3 w-20 rounded bg-gray-200 dark:bg-dark-600 mb-2",
                            }),
                            t.jsx("div", {
                              className:
                                "h-3 w-16 rounded bg-gray-100 dark:bg-dark-700",
                            }),
                          ],
                        }),
                      ],
                    }),
                    t.jsx("div", {
                      className:
                        "h-3 w-12 rounded bg-gray-200 dark:bg-dark-600 mt-3",
                    }),
                  ],
                },
                index,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
function Za({
  isOpen: e,
  onClose: r,
  selectedMonth: a,
  initialValue: s,
  onSave: n,
}) {
  const [l, o] = c.useState("");
  c.useEffect(() => {
    if (e) {
      o(s ? s.toString() : "");
    }
  }, [e, s]);
  const d = () => {
    const h = parseFloat(l);
    isNaN(h) || n(h);
  };
  return t.jsx(ce, {
    appear: !0,
    show: e,
    as: c.Fragment,
    children: t.jsxs(we, {
      as: "div",
      className: "relative z-50",
      onClose: r,
      children: [
        t.jsx("div", {
          className:
            "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
        }),
        t.jsx("div", {
          className: "fixed inset-0 flex items-center justify-center p-4",
          children: t.jsxs(ke, {
            className:
              "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800",
            children: [
              t.jsxs(je, {
                className:
                  "text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2",
                children: [
                  t.jsx(Re, {
                    className: "size-6 text-indigo-500",
                  }),
                  " Banca Inicial (",
                  a,
                  ")",
                ],
              }),
              t.jsx("p", {
                className: "mt-2 text-sm text-gray-500",
                children: "Qual o valor total para iniciar este mês?",
              }),
              t.jsxs("div", {
                className: "mt-6 relative",
                children: [
                  t.jsx("span", {
                    className:
                      "absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium",
                    children: "$",
                  }),
                  t.jsx("input", {
                    type: "number",
                    value: l,
                    onChange: (event) => o(event.target.value),
                    className:
                      "w-full rounded-xl border border-gray-300 py-4 pl-8 pr-4 text-2xl font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-dark-600 dark:bg-dark-700 dark:text-white",
                    placeholder: "0.00",
                    autoFocus: !0,
                  }),
                ],
              }),
              t.jsxs("div", {
                className: "mt-8 flex justify-end gap-3",
                children: [
                  t.jsx($, {
                    variant: "soft",
                    onClick: r,
                    children: "Cancelar",
                  }),
                  t.jsx($, {
                    color: "primary",
                    onClick: d,
                    className: "px-6",
                    children: "Salvar Banca",
                  }),
                ],
              }),
            ],
          }),
        }),
      ],
    }),
  });
}
function Xa({ isOpen: e, onClose: r, exchanges: a, onSave: s }) {
  const [n, l] = c.useState("deposit"),
    [o, d] = c.useState(""),
    [h, b] = c.useState(""),
    [m, N] = c.useState("");
  c.useEffect(() => {
    if (e) {
      (l("deposit"), d(""), b(""), N(""));
    }
  }, [e]);
  const y = () => {
    const f = parseFloat(h);
    if (o && !isNaN(f)) {
      s(n, o, f, m);
    }
  };
  return t.jsx(ce, {
    appear: !0,
    show: e,
    as: c.Fragment,
    children: t.jsxs(we, {
      as: "div",
      className: "relative z-50",
      onClose: r,
      children: [
        t.jsx("div", {
          className:
            "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
        }),
        t.jsx("div", {
          className: "fixed inset-0 flex items-center justify-center p-4",
          children: t.jsxs(ke, {
            className:
              "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800",
            children: [
              t.jsx(je, {
                className: "text-xl font-bold text-gray-900 dark:text-white",
                children: "Novo Lançamento",
              }),
              t.jsxs("div", {
                className: "mt-6 space-y-5",
                children: [
                  t.jsx("div", {
                    className:
                      "grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-1.5 dark:bg-dark-700",
                    children: ["deposit", "withdraw", "update"].map((item) =>
                      t.jsx(
                        "button",
                        {
                          onClick: () => l(item),
                          className: Z(
                            "rounded-lg py-2.5 text-xs font-bold uppercase transition-all",
                            n === item
                              ? "bg-white text-indigo-600 shadow-sm dark:bg-dark-600 dark:text-indigo-400"
                              : "text-gray-500 hover:bg-gray-200/50 dark:text-gray-400",
                          ),
                          children:
                            item === "update"
                              ? "Ajuste"
                              : item === "deposit"
                                ? "Depósito"
                                : "Saque",
                        },
                        item,
                      ),
                    ),
                  }),
                  t.jsxs("div", {
                    children: [
                      t.jsx("label", {
                        className:
                          "text-xs font-bold uppercase text-gray-500 mb-1.5 block",
                        children: "Corretora",
                      }),
                      t.jsxs("select", {
                        value: o,
                        onChange: (event) => d(event.target.value),
                        className:
                          "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-dark-600 dark:bg-dark-700",
                        children: [
                          t.jsx("option", {
                            value: "",
                            children: "Selecione...",
                          }),
                          a.map((props) =>
                            t.jsx(
                              "option",
                              {
                                value: props.id,
                                children: props.name,
                              },
                              props.id,
                            ),
                          ),
                        ],
                      }),
                    ],
                  }),
                  t.jsxs("div", {
                    children: [
                      t.jsx("label", {
                        className:
                          "text-xs font-bold uppercase text-gray-500 mb-1.5 block",
                        children: "Valor",
                      }),
                      t.jsxs("div", {
                        className: "relative",
                        children: [
                          t.jsx("span", {
                            className:
                              "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium",
                            children: "$",
                          }),
                          t.jsx("input", {
                            type: "number",
                            value: h,
                            onChange: (event) => b(event.target.value),
                            placeholder: "0.00",
                            className:
                              "w-full rounded-xl border border-gray-200 bg-white py-3 pl-7 pr-4 text-lg font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-dark-600 dark:bg-dark-700",
                          }),
                        ],
                      }),
                    ],
                  }),
                  t.jsxs("div", {
                    children: [
                      t.jsx("label", {
                        className:
                          "text-xs font-bold uppercase text-gray-500 mb-1.5 block",
                        children: "Observação (Opcional)",
                      }),
                      t.jsx("input", {
                        type: "text",
                        value: m,
                        onChange: (event) => N(event.target.value),
                        placeholder: "Ex: Lucro da semana",
                        className:
                          "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-dark-600 dark:bg-dark-700",
                      }),
                    ],
                  }),
                ],
              }),
              t.jsxs("div", {
                className: "mt-8 flex gap-3",
                children: [
                  t.jsx($, {
                    className: "flex-1",
                    variant: "soft",
                    onClick: r,
                    children: "Cancelar",
                  }),
                  t.jsx($, {
                    className: "flex-1",
                    color: "primary",
                    onClick: y,
                    children: "Confirmar",
                  }),
                ],
              }),
            ],
          }),
        }),
      ],
    }),
  });
}
function er({ isOpen: e, onClose: r, initialValues: a, onSave: s }) {
  const [n, l] = c.useState(""),
    [o, d] = c.useState("Spot"),
    [h, b] = c.useState("");
  c.useEffect(() => {
    if (e) {
      a ? (l(a.name), d(a.type), b(a.note || "")) : (l(""), d("Spot"), b(""));
    }
  }, [e, a]);
  const m = () => {
    if (n) {
      s(n, o, h, a?.id);
    }
  };
  return t.jsx(ce, {
    appear: !0,
    show: e,
    as: c.Fragment,
    children: t.jsxs(we, {
      as: "div",
      className: "relative z-50",
      onClose: r,
      children: [
        t.jsx("div", {
          className:
            "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
        }),
        t.jsx("div", {
          className: "fixed inset-0 flex items-center justify-center p-4",
          children: t.jsxs(ke, {
            className:
              "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800",
            children: [
              t.jsx(je, {
                className: "text-xl font-bold text-gray-900 dark:text-white",
                children: a ? "Editar Corretora" : "Nova Corretora",
              }),
              t.jsxs("div", {
                className: "mt-6 space-y-5",
                children: [
                  t.jsxs("div", {
                    children: [
                      t.jsx("label", {
                        className:
                          "text-xs font-bold uppercase text-gray-500 mb-1.5 block",
                        children: "Nome",
                      }),
                      t.jsx("input", {
                        type: "text",
                        value: n,
                        onChange: (event) => l(event.target.value),
                        placeholder: "Ex: Kraken",
                        className:
                          "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-dark-600 dark:bg-dark-700",
                      }),
                    ],
                  }),
                  t.jsxs("div", {
                    children: [
                      t.jsx("label", {
                        className:
                          "text-xs font-bold uppercase text-gray-500 mb-1.5 block",
                        children: "Tipo",
                      }),
                      t.jsx("input", {
                        type: "text",
                        value: o,
                        onChange: (event) => d(event.target.value),
                        placeholder: "Ex: Spot",
                        className:
                          "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-dark-600 dark:bg-dark-700",
                      }),
                    ],
                  }),
                  t.jsxs("div", {
                    children: [
                      t.jsx("label", {
                        className:
                          "text-xs font-bold uppercase text-gray-500 mb-1.5 block",
                        children: "Observação",
                      }),
                      t.jsx("input", {
                        type: "text",
                        value: h,
                        onChange: (event) => b(event.target.value),
                        placeholder: "Ex: Taxas baixas",
                        className:
                          "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-dark-600 dark:bg-dark-700",
                      }),
                    ],
                  }),
                ],
              }),
              t.jsxs("div", {
                className: "mt-8 flex gap-3",
                children: [
                  t.jsx($, {
                    className: "flex-1",
                    variant: "soft",
                    onClick: r,
                    children: "Cancelar",
                  }),
                  t.jsx($, {
                    className: "flex-1",
                    color: "primary",
                    onClick: m,
                    children: "Salvar",
                  }),
                ],
              }),
            ],
          }),
        }),
      ],
    }),
  });
}
function tr({
  isOpen: e,
  onClose: r,
  exchanges: a,
  selectedMonth: s,
  onEditExchange: n,
  onDeleteExchange: l,
  onClearData: o,
}) {
  const d = () => {
      if (
        confirm(
          `Tem certeza que deseja apagar TODOS os dados de ${s}? Isso inclui lançamentos e saldos.`,
        )
      ) {
        (o(), alert("Dados do mês limpos com sucesso."));
      }
    },
    h = (b) => {
      if (confirm("Tem certeza que deseja remover esta corretora?")) {
        l(b);
      }
    };
  return t.jsx(ce, {
    appear: !0,
    show: e,
    as: c.Fragment,
    children: t.jsxs(we, {
      as: "div",
      className: "relative z-50",
      onClose: r,
      children: [
        t.jsx("div", {
          className:
            "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
        }),
        t.jsx("div", {
          className: "fixed inset-0 flex items-center justify-center p-4",
          children: t.jsxs(ke, {
            className:
              "w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800",
            children: [
              t.jsxs("div", {
                className:
                  "flex items-center justify-between border-b border-gray-100 pb-4 dark:border-dark-700",
                children: [
                  t.jsx(je, {
                    className:
                      "text-xl font-bold text-gray-900 dark:text-white",
                    children: "Gerenciar Corretoras & Dados",
                  }),
                  t.jsx($, {
                    variant: "flat",
                    isIcon: !0,
                    onClick: r,
                    className: "size-8",
                    children: "X",
                  }),
                ],
              }),
              t.jsxs("div", {
                className: "mt-6 space-y-8",
                children: [
                  t.jsxs("div", {
                    children: [
                      t.jsx("h4", {
                        className:
                          "text-sm font-bold uppercase text-gray-500 mb-3",
                        children: "Corretoras Ativas",
                      }),
                      t.jsxs("div", {
                        className: "grid gap-2 max-h-60 overflow-y-auto pr-2",
                        children: [
                          a.map((props) =>
                            t.jsxs(
                              "div",
                              {
                                className:
                                  "flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-700/50",
                                children: [
                                  t.jsxs("div", {
                                    children: [
                                      t.jsx("p", {
                                        className:
                                          "font-bold text-sm text-gray-900 dark:text-white",
                                        children: props.name,
                                      }),
                                      t.jsx("p", {
                                        className: "text-xs text-gray-500",
                                        children: props.type,
                                      }),
                                    ],
                                  }),
                                  t.jsxs("div", {
                                    className: "flex gap-2",
                                    children: [
                                      t.jsx($, {
                                        variant: "soft",
                                        className: "text-xs px-3 py-1",
                                        onClick: () => n(props),
                                        children: "Editar",
                                      }),
                                      t.jsx($, {
                                        variant: "soft",
                                        color: "error",
                                        className: "text-xs px-3 py-1",
                                        onClick: () => h(props.id),
                                        children: t.jsx($e, {
                                          className: "size-4",
                                        }),
                                      }),
                                    ],
                                  }),
                                ],
                              },
                              props.id,
                            ),
                          ),
                          a.length === 0 &&
                            t.jsx("p", {
                              className: "text-sm text-gray-400 italic",
                              children: "Nenhuma corretora cadastrada.",
                            }),
                        ],
                      }),
                    ],
                  }),
                  t.jsxs("div", {
                    className:
                      "rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10",
                    children: [
                      t.jsxs("h4", {
                        className:
                          "text-sm font-bold uppercase text-red-600 dark:text-red-400 mb-2 flex items-center gap-2",
                        children: [
                          t.jsx($e, {
                            className: "size-4",
                          }),
                          " Zona de Perigo",
                        ],
                      }),
                      t.jsxs("p", {
                        className:
                          "text-xs text-gray-600 dark:text-gray-400 mb-4",
                        children: [
                          "Deseja resetar todos os dados do mês de ",
                          t.jsx("strong", {
                            children: s,
                          }),
                          "? Isso apagará todos os lançamentos, histórico de transações e saldos diários registrados neste mês. A configuração de corretoras será mantida.",
                        ],
                      }),
                      t.jsxs($, {
                        color: "error",
                        variant: "filled",
                        onClick: d,
                        className: "w-full justify-center",
                        children: ["Apagar Dados de ", s],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        }),
      ],
    }),
  });
}
function Mr() {
  const e = Ga(),
    [r, a] = c.useState(void 0),
    s = (o) => {
      a(o);
      e.setIsExchangeModalOpen(!0);
    },
    n = () => {
      a(void 0);
      e.setIsExchangeModalOpen(!0);
    },
    l = () => {
      e.setIsExchangeModalOpen(!1);
      a(void 0);
    };
  return e.isLoaded
    ? t.jsxs(Pe, {
        title: "Financeiro Dashboard",
        children: [
          t.jsxs("div", {
            className:
              "transition-content w-full px-(--margin-x) pb-10 pt-5 lg:pt-6",
            children: [
              t.jsx(Wa, {
                selectedMonth: e.selectedMonth,
                initialBankroll: e.initialBankrolls[e.selectedMonth] || 0,
                selectedDate: e.selectedDate,
                onUpdateBankroll: e.handleSaveInitialBankroll,
                onMonthChange: e.setSelectedMonth,
                onDateChange: (o) => e.handleDateChange(o),
                onPrevDay: e.handlePrevDay,
                onNextDay: e.handleNextDay,
                onOpenTransaction: () => e.setIsTransactionModalOpen(!0),
                currency: e.currency,
                onCurrencyChange: e.setCurrency,
                conversionRate: e.conversionRates[e.currency],
              }),
              t.jsx("div", {
                className: "mb-6",
                children: t.jsx(Ka, {
                  monthStats: e.monthStats,
                  dailyStats: e.dailyStats,
                  monthlyAverage: e.monthlyAverage,
                  selectedDate: e.selectedDate,
                  currency: e.currency,
                  conversionRate: e.conversionRates[e.currency],
                }),
              }),
              t.jsxs("div", {
                className: "grid gap-6 lg:grid-cols-3",
                children: [
                  t.jsxs("div", {
                    className: "lg:col-span-2 space-y-6",
                    children: [
                      t.jsx(Va, {
                        exchanges: e.exchanges,
                        selectedDate: e.selectedDate,
                        getBalanceAtDate: e.getBalanceAtDate,
                        onUpdateBalance: e.handleDirectBalanceUpdate,
                        onManage: () => e.setIsConfigModalOpen(!0),
                        onNew: n,
                      }),
                      t.jsx(qa, {
                        series: e.chartSeries,
                        selectedMonth: e.selectedMonth,
                      }),
                    ],
                  }),
                  t.jsx("div", {
                    className: "space-y-6",
                    children: t.jsx(Ja, {
                      transactions: e.transactions,
                      exchanges: e.exchanges,
                      selectedMonth: e.selectedMonth,
                    }),
                  }),
                ],
              }),
            ],
          }),
          t.jsx(Za, {
            isOpen: e.isInitModalOpen,
            onClose: () => e.setIsInitModalOpen(!1),
            selectedMonth: e.selectedMonth,
            initialValue: e.initialBankrolls[e.selectedMonth],
            onSave: e.handleSaveInitialBankroll,
          }),
          t.jsx(Xa, {
            isOpen: e.isTransactionModalOpen,
            onClose: () => e.setIsTransactionModalOpen(!1),
            exchanges: e.exchanges,
            onSave: e.handleAddTransaction,
          }),
          t.jsx(er, {
            isOpen: e.isExchangeModalOpen,
            onClose: l,
            initialValues: r,
            onSave: e.handleSaveExchange,
          }),
          t.jsx(tr, {
            isOpen: e.isConfigModalOpen,
            onClose: () => e.setIsConfigModalOpen(!1),
            exchanges: e.exchanges,
            selectedMonth: e.selectedMonth,
            onEditExchange: s,
            onDeleteExchange: e.handleDeleteExchange,
            onClearData: e.handleClearMonthData,
          }),
        ],
      })
    : t.jsx(Pe, {
        title: "Financeiro Dashboard",
        children: t.jsx(Ya, {}),
      });
}
export { Mr as default };
