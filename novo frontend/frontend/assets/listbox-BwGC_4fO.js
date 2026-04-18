import {
  $ as we,
  a as Me,
  w as ke,
  e as Te,
} from "./use-resolve-button-type-DwKZeOeP.js";
import { a as p, R as y, c as ce } from "./index-Bx06KCE-.js";
import {
  l as Ce,
  b as De,
  u as Ae,
  j as Fe,
  g as _e,
} from "./radio-group-CRUASA4L.js";
import {
  u as H,
  G as Ne,
  Y as j,
  y as G,
  f as Ve,
  o as F,
  a as K,
  V as ge,
  K as W,
  p as Be,
  d as ze,
  g as Qe,
  n as de,
  A as ve,
  e as O,
  R as Ue,
  T as be,
  H as He,
  I as Ke,
  b as qe,
} from "./use-is-mounted-D7iMJT5-.js";
import {
  F as je,
  b as Ge,
  y as We,
  R as Ye,
  T as Ze,
  w as Je,
  A as Xe,
} from "./floating-CA5b9ljT.js";
import {
  p as et,
  c as ee,
  a as h,
  f as J,
  b as tt,
  L as nt,
  S as X,
  d as ot,
  s as it,
  u as st,
} from "./use-text-value-ChvRIfBi.js";
import {
  T as at,
  k as ue,
  x as Oe,
  a as lt,
  c as rt,
  S as R,
  w as ut,
  u as me,
  e as ct,
  N as dt,
  p as pt,
  f as ft,
  y as vt,
  g as bt,
  t as mt,
  o as ht,
  b as xt,
  d as gt,
  i as ne,
} from "./transition-Cxix63ts.js";
import { Z as Ot, u as St, N as $t, V as It } from "./label-DDDQpD4Z.js";
function yt({ children: e, freeze: o }, t) {
  let n = Se(o, e);
  return p.isValidElement(n)
    ? p.cloneElement(n, {
        ref: t,
      })
    : y.createElement(y.Fragment, null, n);
}
y.forwardRef(yt);
function Se(e, o) {
  let [t, n] = p.useState(o);
  return (!e && t !== o && n(o), e ? t : o);
}
var Et = Object.defineProperty,
  Rt = (e, o, t) => {
    return o in e
      ? Et(e, o, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: t,
        })
      : (e[o] = t);
  },
  he = (e, o, t) => {
    return (Rt(e, typeof o != "symbol" ? o + "" : o, t), t);
  },
  S = ((e) => ((e[(e.Open = 0)] = "Open"), (e[(e.Closed = 1)] = "Closed"), e))(
    S || {},
  ),
  B = ((e) => (
    (e[(e.Single = 0)] = "Single"),
    (e[(e.Multi = 1)] = "Multi"),
    e
  ))(B || {}),
  te = ((e) => (
    (e[(e.Pointer = 0)] = "Pointer"),
    (e[(e.Other = 1)] = "Other"),
    e
  ))(te || {}),
  $e = ((e) => (
    (e[(e.OpenListbox = 0)] = "OpenListbox"),
    (e[(e.CloseListbox = 1)] = "CloseListbox"),
    (e[(e.GoToOption = 2)] = "GoToOption"),
    (e[(e.Search = 3)] = "Search"),
    (e[(e.ClearSearch = 4)] = "ClearSearch"),
    (e[(e.SelectOption = 5)] = "SelectOption"),
    (e[(e.RegisterOptions = 6)] = "RegisterOptions"),
    (e[(e.UnregisterOptions = 7)] = "UnregisterOptions"),
    (e[(e.SetButtonElement = 8)] = "SetButtonElement"),
    (e[(e.SetOptionsElement = 9)] = "SetOptionsElement"),
    (e[(e.SortOptions = 10)] = "SortOptions"),
    (e[(e.MarkButtonAsMoved = 11)] = "MarkButtonAsMoved"),
    e
  ))($e || {});
function xe(e, o = (t) => t) {
  let t = e.activeOptionIndex !== null ? e.options[e.activeOptionIndex] : null,
    n = Ne(o(e.options.slice()), (s) => s.dataRef.current.domRef.current),
    i = t ? n.indexOf(t) : null;
  return (
    i === -1 && (i = null),
    {
      options: n,
      activeOptionIndex: i,
    }
  );
}
let Pt = {
  1(e) {
    if (e.dataRef.current.disabled || e.listboxState === 1) return e;
    let o = e.buttonElement
      ? ee.Tracked(tt(e.buttonElement))
      : e.buttonPositionState;
    return {
      ...e,
      activeOptionIndex: null,
      pendingFocus: {
        focus: h.Nothing,
      },
      listboxState: 1,
      __demoMode: !1,
      buttonPositionState: o,
    };
  },
  0(e, o) {
    if (e.dataRef.current.disabled || e.listboxState === 0) return e;
    let t = e.activeOptionIndex,
      { isSelected: n } = e.dataRef.current,
      i = e.options.findIndex((s) => n(s.dataRef.current.value));
    return (
      i !== -1 && (t = i),
      {
        ...e,
        frozenValue: !1,
        pendingFocus: o.focus,
        listboxState: 0,
        activeOptionIndex: t,
        __demoMode: !1,
        buttonPositionState: ee.Idle,
      }
    );
  },
  2(e, o) {
    var t, n, i, s, d;
    if (e.dataRef.current.disabled || e.listboxState === 1) return e;
    let c = {
      ...e,
      searchQuery: "",
      activationTrigger: (t = o.trigger) != null ? t : 1,
      __demoMode: !1,
    };
    if (o.focus === h.Nothing)
      return {
        ...c,
        activeOptionIndex: null,
      };
    if (o.focus === h.Specific)
      return {
        ...c,
        activeOptionIndex: e.options.findIndex((props) => props.id === o.id),
      };
    if (o.focus === h.Previous) {
      let b = e.activeOptionIndex;
      if (b !== null) {
        let g = e.options[b].dataRef.current.domRef,
          u = J(o, {
            resolveItems: () => e.options,
            resolveActiveIndex: () => e.activeOptionIndex,
            resolveId: (props) => props.id,
            resolveDisabled: (a) => a.dataRef.current.disabled,
          });
        if (u !== null) {
          let a = e.options[u].dataRef.current.domRef;
          if (
            ((n = g.current) == null ? void 0 : n.previousElementSibling) ===
              a.current ||
            ((i = a.current) == null ? void 0 : i.previousElementSibling) ===
              null
          )
            return {
              ...c,
              activeOptionIndex: u,
            };
        }
      }
    } else if (o.focus === h.Next) {
      let b = e.activeOptionIndex;
      if (b !== null) {
        let g = e.options[b].dataRef.current.domRef,
          u = J(o, {
            resolveItems: () => e.options,
            resolveActiveIndex: () => e.activeOptionIndex,
            resolveId: (props) => props.id,
            resolveDisabled: (a) => a.dataRef.current.disabled,
          });
        if (u !== null) {
          let a = e.options[u].dataRef.current.domRef;
          if (
            ((s = g.current) == null ? void 0 : s.nextElementSibling) ===
              a.current ||
            ((d = a.current) == null ? void 0 : d.nextElementSibling) === null
          )
            return {
              ...c,
              activeOptionIndex: u,
            };
        }
      }
    }
    let m = xe(e),
      r = J(o, {
        resolveItems: () => m.options,
        resolveActiveIndex: () => m.activeOptionIndex,
        resolveId: (props) => props.id,
        resolveDisabled: (b) => b.dataRef.current.disabled,
      });
    return {
      ...c,
      ...m,
      activeOptionIndex: r,
    };
  },
  3: (e, o) => {
    if (e.dataRef.current.disabled || e.listboxState === 1) return e;
    let t = e.searchQuery !== "" ? 0 : 1,
      n = e.searchQuery + o.value.toLowerCase(),
      i = (
        e.activeOptionIndex !== null
          ? e.options
              .slice(e.activeOptionIndex + t)
              .concat(e.options.slice(0, e.activeOptionIndex + t))
          : e.options
      ).find((item) => {
        var c;
        return (
          !item.dataRef.current.disabled &&
          ((c = item.dataRef.current.textValue) == null
            ? void 0
            : c.startsWith(n))
        );
      }),
      s = i ? e.options.indexOf(i) : -1;
    return s === -1 || s === e.activeOptionIndex
      ? {
          ...e,
          searchQuery: n,
        }
      : {
          ...e,
          searchQuery: n,
          activeOptionIndex: s,
          activationTrigger: 1,
        };
  },
  4(e) {
    return e.dataRef.current.disabled ||
      e.listboxState === 1 ||
      e.searchQuery === ""
      ? e
      : {
          ...e,
          searchQuery: "",
        };
  },
  5(e) {
    return e.dataRef.current.mode === 0
      ? {
          ...e,
          frozenValue: !0,
        }
      : {
          ...e,
        };
  },
  6: (e, o) => {
    let t = e.options.concat(o.options),
      n = e.activeOptionIndex;
    if (
      (e.pendingFocus.focus !== h.Nothing &&
        (n = J(e.pendingFocus, {
          resolveItems: () => t,
          resolveActiveIndex: () => e.activeOptionIndex,
          resolveId: (props) => props.id,
          resolveDisabled: (i) => i.dataRef.current.disabled,
        })),
      e.activeOptionIndex === null)
    ) {
      let { isSelected: i } = e.dataRef.current;
      if (i) {
        let s = t.findIndex((d) => i?.(d.dataRef.current.value));
        if (s !== -1) {
          n = s;
        }
      }
    }
    return {
      ...e,
      options: t,
      activeOptionIndex: n,
      pendingFocus: {
        focus: h.Nothing,
      },
      pendingShouldSort: !0,
    };
  },
  7: (e, o) => {
    let t = e.options,
      n = [],
      i = new Set(o.options);
    for (let [s, d] of t.entries())
      if (i.has(d.id) && (n.push(s), i.delete(d.id), i.size === 0)) break;
    if (n.length > 0) {
      t = t.slice();
      for (let s of n.reverse()) t.splice(s, 1);
    }
    return {
      ...e,
      options: t,
      activationTrigger: 1,
    };
  },
  8: (e, o) =>
    e.buttonElement === o.element
      ? e
      : {
          ...e,
          buttonElement: o.element,
        },
  9: (e, o) =>
    e.optionsElement === o.element
      ? e
      : {
          ...e,
          optionsElement: o.element,
        },
  10: (e) =>
    e.pendingShouldSort
      ? {
          ...e,
          ...xe(e),
          pendingShouldSort: !1,
        }
      : e,
  11(e) {
    return e.buttonPositionState.kind !== "Tracked"
      ? e
      : {
          ...e,
          buttonPositionState: ee.Moved,
        };
  },
};
class pe extends at {
  constructor(o) {
    super(o);
    he(this, "actions", {
      onChange: (t) => {
        let {
          onChange: n,
          compare: i,
          mode: s,
          value: d,
        } = this.state.dataRef.current;
        return H(s, {
          0: () => n?.(t),
          1: () => {
            let c = d.slice(),
              m = c.findIndex((r) => i(r, t));
            return (m === -1 ? c.push(t) : c.splice(m, 1), n?.(c));
          },
        });
      },
      registerOption: ue(() => {
        let t = [],
          n = new Set();
        return [
          (i, s) => {
            n.has(s) ||
              (n.add(s),
              t.push({
                id: i,
                dataRef: s,
              }));
          },
          () => (
            n.clear(),
            this.send({
              type: 6,
              options: t.splice(0),
            })
          ),
        ];
      }),
      unregisterOption: ue(() => {
        let t = [];
        return [
          (n) => t.push(n),
          () => {
            this.send({
              type: 7,
              options: t.splice(0),
            });
          },
        ];
      }),
      goToOption: ue(() => {
        let t = null;
        return [
          (n, i) => {
            t = {
              type: 2,
              ...n,
              trigger: i,
            };
          },
          () => t && this.send(t),
        ];
      }),
      closeListbox: () => {
        this.send({
          type: 1,
        });
      },
      openListbox: (t) => {
        this.send({
          type: 0,
          focus: t,
        });
      },
      selectActiveOption: () => {
        var t;
        if (this.state.activeOptionIndex !== null) {
          let { dataRef: n } = this.state.options[this.state.activeOptionIndex];
          this.actions.selectOption(n.current.value);
        } else if (this.state.dataRef.current.mode === 0) {
          (this.actions.closeListbox(),
            (t = this.state.buttonElement) == null ||
              t.focus({
                preventScroll: !0,
              }));
        }
      },
      selectOption: (t) => {
        this.send({
          type: 5,
          value: t,
        });
      },
      search: (t) => {
        this.send({
          type: 3,
          value: t,
        });
      },
      clearSearch: () => {
        this.send({
          type: 4,
        });
      },
      setButtonElement: (t) => {
        this.send({
          type: 8,
          element: t,
        });
      },
      setOptionsElement: (t) => {
        this.send({
          type: 9,
          element: t,
        });
      },
    });
    he(this, "selectors", {
      activeDescendantId(t) {
        var n;
        let i = t.activeOptionIndex,
          s = t.options;
        return i === null || (n = s[i]) == null ? void 0 : n.id;
      },
      isActive(t, n) {
        var i;
        let s = t.activeOptionIndex,
          d = t.options;
        return s !== null ? ((i = d[s]) == null ? void 0 : i.id) === n : !1;
      },
      hasFrozenValue(t) {
        return t.frozenValue;
      },
      shouldScrollIntoView(t, n) {
        return t.__demoMode || t.listboxState !== 0 || t.activationTrigger === 0
          ? !1
          : this.isActive(t, n);
      },
      didButtonMove(t) {
        return t.buttonPositionState.kind === "Moved";
      },
    });
    this.on(6, () => {
      requestAnimationFrame(() => {
        this.send({
          type: 10,
        });
      });
    });
    {
      let t = this.state.id,
        n = Oe.get(null);
      this.disposables.add(
        n.on(lt.Push, (i) => {
          if (!n.selectors.isTop(i, t) && this.state.listboxState === 0) {
            this.actions.closeListbox();
          }
        }),
      );
      this.on(0, () => n.actions.push(t));
      this.on(1, () => n.actions.pop(t));
    }
    this.disposables.group((t) => {
      this.on(1, (n) => {
        if (n.buttonElement) {
          (t.dispose(),
            t.add(
              et(n.buttonElement, n.buttonPositionState, () => {
                this.send({
                  type: 11,
                });
              }),
            ));
        }
      });
    });
    this.on(5, (t, n) => {
      var i;
      this.actions.onChange(n.value);
      if (this.state.dataRef.current.mode === 0) {
        (this.actions.closeListbox(),
          (i = this.state.buttonElement) == null ||
            i.focus({
              preventScroll: !0,
            }));
      }
    });
  }
  static new({ id: o, __demoMode: t = !1 }) {
    return new pe({
      id: o,
      dataRef: {
        current: {},
      },
      listboxState: t ? 0 : 1,
      options: [],
      searchQuery: "",
      activeOptionIndex: null,
      activationTrigger: 1,
      buttonElement: null,
      optionsElement: null,
      pendingShouldSort: !1,
      pendingFocus: {
        focus: h.Nothing,
      },
      frozenValue: !1,
      __demoMode: t,
      buttonPositionState: ee.Idle,
    });
  }
  reduce(o, t) {
    return H(t.type, Pt, o, t);
  }
}
const Ie = p.createContext(null);
function fe(e) {
  let o = p.useContext(Ie);
  if (o === null) {
    let t = new Error(`<${e} /> is missing a parent <Listbox /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(t, ye), t);
  }
  return o;
}
function ye({ id: e, __demoMode: o = !1 }) {
  let t = p.useMemo(
    () =>
      pe.new({
        id: e,
        __demoMode: o,
      }),
    [],
  );
  return (rt(() => t.dispose()), t);
}
let oe = p.createContext(null);
oe.displayName = "ListboxDataContext";
function Y(e) {
  let o = p.useContext(oe);
  if (o === null) {
    let t = new Error(`<${e} /> is missing a parent <Listbox /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(t, Y), t);
  }
  return o;
}
let Lt = p.Fragment;
function wt(e, o) {
  let t = p.useId(),
    n = ht(),
    {
      value: i,
      defaultValue: s,
      form: d,
      name: c,
      onChange: m,
      by: r,
      invalid: b = !1,
      disabled: g = n || !1,
      horizontal: u = !1,
      multiple: a = !1,
      __demoMode: x = !1,
      ...w
    } = e;
  const P = u ? "horizontal" : "vertical";
  let _ = G(o),
    k = Ce(s),
    [$ = a ? [] : void 0, L] = De(i, m, k),
    I = ye({
      id: t,
      __demoMode: x,
    }),
    N = p.useRef({
      static: !1,
      hold: !1,
    }),
    z = p.useRef(new Map()),
    T = Ae(r),
    Q = p.useCallback(
      (E) =>
        H(f.mode, {
          [B.Multi]: () => $.some((item) => T(item, E)),
          [B.Single]: () => T($, E),
        }),
      [$],
    ),
    f = K({
      value: $,
      disabled: g,
      invalid: b,
      mode: a ? B.Multi : B.Single,
      orientation: P,
      onChange: L,
      compare: T,
      isSelected: Q,
      optionsPropsRef: N,
      listRef: z,
    });
  de(() => {
    I.state.dataRef.current = f;
  }, [f]);
  let M = R(I, (E) => E.listboxState),
    C = Oe.get(null),
    U = R(
      C,
      p.useCallback((E) => C.selectors.isTop(E, t), [C, t]),
    ),
    [D, v] = R(I, (E) => [E.buttonElement, E.optionsElement]);
  xt(U, [D, v], (E, q) => {
    I.send({
      type: $e.CloseListbox,
    });
    He(q, Ke.Loose) || (E.preventDefault(), D?.focus());
  });
  let A = K({
      open: M === S.Open,
      disabled: g,
      invalid: b,
      value: $,
    }),
    [ie, se] = It({
      inherit: !0,
    }),
    Z = {
      ref: _,
    },
    ae = p.useCallback(() => {
      if (k !== void 0) return L?.(k);
    }, [L, k]),
    le = W();
  return y.createElement(
    se,
    {
      value: ie,
      props: {
        htmlFor: D?.id,
      },
      slot: {
        open: M === S.Open,
        disabled: g,
      },
    },
    y.createElement(
      Xe,
      null,
      y.createElement(
        Ie.Provider,
        {
          value: I,
        },
        y.createElement(
          oe.Provider,
          {
            value: f,
          },
          y.createElement(
            gt,
            {
              value: H(M, {
                [S.Open]: ne.Open,
                [S.Closed]: ne.Closed,
              }),
            },
            c != null &&
              $ != null &&
              y.createElement(Fe, {
                disabled: g,
                data: {
                  [c]: $,
                },
                form: d,
                onReset: ae,
              }),
            le({
              ourProps: Z,
              theirProps: w,
              slot: A,
              defaultTag: Lt,
              name: "Listbox",
            }),
          ),
        ),
      ),
    ),
  );
}
let Mt = "button";
function kt(e, o) {
  let t = p.useId(),
    n = St(),
    i = Y("Listbox.Button"),
    s = fe("Listbox.Button"),
    {
      id: d = n || `headlessui-listbox-button-${t}`,
      disabled: c = i.disabled || !1,
      autoFocus: m = !1,
      ...r
    } = e,
    b = G(o, je(), s.actions.setButtonElement),
    g = Ge(),
    [u, a, x] = R(s, (v) => [
      v.listboxState,
      v.buttonElement,
      v.optionsElement,
    ]),
    w = u === S.Open;
  nt(w, {
    trigger: a,
    action: p.useCallback(
      (event) => {
        if (a != null && a.contains(event.target)) return X.Ignore;
        let A = event.target.closest('[role="option"]:not([data-disabled])');
        if (Ve(A)) {
          return X.Select(A);
        }
        if (x != null && x.contains(event.target)) {
          return X.Ignore;
        }
        return X.Close;
      },
      [a, x],
    ),
    close: s.actions.closeListbox,
    select: s.actions.selectActiveOption,
  });
  let P = F((event) => {
      switch (event.key) {
        case O.Enter:
          _e(event.currentTarget);
          break;
        case O.Space:
        case O.ArrowDown:
          event.preventDefault();
          s.actions.openListbox({
            focus: i.value ? h.Nothing : h.First,
          });
          break;
        case O.ArrowUp:
          event.preventDefault();
          s.actions.openListbox({
            focus: i.value ? h.Nothing : h.Last,
          });
          break;
      }
    }),
    _ = F((event) => {
      if (event.key === O.Space) {
        event.preventDefault();
      }
    }),
    k = ot((event) => {
      var A;
      s.state.listboxState === S.Open
        ? (ce.flushSync(() => s.actions.closeListbox()),
          (A = s.state.buttonElement) == null ||
            A.focus({
              preventScroll: !0,
            }))
        : (event.preventDefault(),
          s.actions.openListbox({
            focus: h.Nothing,
          }));
    }),
    $ = F((event) => event.preventDefault()),
    L = $t([d]),
    I = ut(),
    { isFocusVisible: N, focusProps: z } = we({
      autoFocus: m,
    }),
    { isHovered: T, hoverProps: Q } = Me({
      isDisabled: c,
    }),
    { pressed: f, pressProps: M } = ke({
      disabled: c,
    }),
    C = K({
      open: u === S.Open,
      active: f || u === S.Open,
      disabled: c,
      invalid: i.invalid,
      value: i.value,
      hover: T,
      focus: N,
      autofocus: m,
    }),
    U = R(s, (v) => v.listboxState === S.Open),
    D = ge(
      g(),
      {
        ref: b,
        id: d,
        type: Te(e, a),
        "aria-haspopup": "listbox",
        "aria-controls": x?.id,
        "aria-expanded": U,
        "aria-labelledby": L,
        "aria-describedby": I,
        disabled: c || void 0,
        autoFocus: m,
        onKeyDown: P,
        onKeyUp: _,
        onKeyPress: $,
      },
      k,
      z,
      Q,
      M,
    );
  return W()({
    ourProps: D,
    theirProps: r,
    slot: C,
    defaultTag: Mt,
    name: "Listbox.Button",
  });
}
let Ee = p.createContext(!1),
  Tt = "div",
  Ct = ve.RenderStrategy | ve.Static;
function Dt(e, o) {
  let t = p.useId(),
    {
      id: n = `headlessui-listbox-options-${t}`,
      anchor: i,
      portal: s = !1,
      modal: d = !0,
      transition: c = !1,
      ...m
    } = e,
    r = We(i),
    [b, g] = p.useState(null);
  if (r) {
    s = !0;
  }
  let u = Y("Listbox.Options"),
    a = fe("Listbox.Options"),
    [x, w, P, _] = R(a, (l) => [
      l.listboxState,
      l.buttonElement,
      l.optionsElement,
      l.__demoMode,
    ]),
    k = me(w),
    $ = me(P),
    L = ct(),
    [I, N] = dt(c, b, L !== null ? (L & ne.Open) === ne.Open : x === S.Open);
  pt(I, w, a.actions.closeListbox);
  let z = _ ? !1 : d && x === S.Open;
  ft(z, $);
  let T = _ ? !1 : d && x === S.Open;
  vt(T, {
    allowed: p.useCallback(() => [w, P], [w, P]),
  });
  let Q = R(a, a.selectors.didButtonMove) ? !1 : I,
    f = R(a, a.selectors.hasFrozenValue) && !e.static,
    M = Se(f, u.value),
    C = p.useCallback((l) => u.compare(M, l), [u.compare, M]),
    U = R(a, (l) => {
      var V;
      if (r == null || !((V = r?.to) != null && V.includes("selection")))
        return null;
      let re = l.options.findIndex((Le) => C(Le.dataRef.current.value));
      return (re === -1 && (re = 0), re);
    }),
    D = (() => {
      if (r == null) return;
      if (U === null)
        return {
          ...r,
          inner: void 0,
        };
      let l = Array.from(u.listRef.current.values());
      return {
        ...r,
        inner: {
          listRef: {
            current: l,
          },
          index: U,
        },
      };
    })(),
    [v, A] = Ye(D),
    ie = Ze(),
    se = G(o, r ? v : null, a.actions.setOptionsElement, g),
    Z = Be();
  p.useEffect(() => {
    let l = P;
    if (l && x === S.Open) {
      ze(l) ||
        l == null ||
        l.focus({
          preventScroll: !0,
        });
    }
  }, [x, P]);
  let ae = F((event) => {
      var V;
      switch ((Z.dispose(), event.key)) {
        case O.Space:
          if (a.state.searchQuery !== "")
            return (
              event.preventDefault(),
              event.stopPropagation(),
              a.actions.search(event.key)
            );
        case O.Enter:
          event.preventDefault();
          event.stopPropagation();
          a.actions.selectActiveOption();
          break;
        case H(u.orientation, {
          vertical: O.ArrowDown,
          horizontal: O.ArrowRight,
        }):
          return (
            event.preventDefault(),
            event.stopPropagation(),
            a.actions.goToOption({
              focus: h.Next,
            })
          );
        case H(u.orientation, {
          vertical: O.ArrowUp,
          horizontal: O.ArrowLeft,
        }):
          return (
            event.preventDefault(),
            event.stopPropagation(),
            a.actions.goToOption({
              focus: h.Previous,
            })
          );
        case O.Home:
        case O.PageUp:
          return (
            event.preventDefault(),
            event.stopPropagation(),
            a.actions.goToOption({
              focus: h.First,
            })
          );
        case O.End:
        case O.PageDown:
          return (
            event.preventDefault(),
            event.stopPropagation(),
            a.actions.goToOption({
              focus: h.Last,
            })
          );
        case O.Escape:
          event.preventDefault();
          event.stopPropagation();
          ce.flushSync(() => a.actions.closeListbox());
          (V = a.state.buttonElement) == null ||
            V.focus({
              preventScroll: !0,
            });
          return;
        case O.Tab:
          event.preventDefault();
          event.stopPropagation();
          ce.flushSync(() => a.actions.closeListbox());
          Ue(a.state.buttonElement, event.shiftKey ? be.Previous : be.Next);
          break;
        default:
          if (event.key.length === 1) {
            (a.actions.search(event.key),
              Z.setTimeout(() => a.actions.clearSearch(), 350));
          }
          break;
      }
    }),
    le = R(a, (l) => {
      var V;
      return (V = l.buttonElement) == null ? void 0 : V.id;
    }),
    E = K({
      open: x === S.Open,
    }),
    q = ge(r ? ie() : {}, {
      id: n,
      ref: se,
      "aria-activedescendant": R(a, a.selectors.activeDescendantId),
      "aria-multiselectable": u.mode === B.Multi ? !0 : void 0,
      "aria-labelledby": le,
      "aria-orientation": u.orientation,
      onKeyDown: ae,
      role: "listbox",
      tabIndex: x === S.Open ? 0 : void 0,
      style: {
        ...m.style,
        ...A,
        "--button-width": Je(I, w, !0).width,
      },
      ...bt(N),
    }),
    Re = W(),
    Pe = p.useMemo(
      () =>
        u.mode === B.Multi
          ? u
          : {
              ...u,
              isSelected: C,
            },
      [u, C],
    );
  return y.createElement(
    mt,
    {
      enabled: s ? e.static || I : !1,
      ownerDocument: k,
    },
    y.createElement(
      oe.Provider,
      {
        value: Pe,
      },
      Re({
        ourProps: q,
        theirProps: m,
        slot: E,
        defaultTag: Tt,
        features: Ct,
        visible: Q,
        name: "Listbox.Options",
      }),
    ),
  );
}
let At = "div";
function Ft(e, o) {
  let t = p.useId(),
    {
      id: n = `headlessui-listbox-option-${t}`,
      disabled: i = !1,
      value: s,
      ...d
    } = e,
    c = p.useContext(Ee) === !0,
    m = Y("Listbox.Option"),
    r = fe("Listbox.Option"),
    b = R(r, (f) => r.selectors.isActive(f, n)),
    g = m.isSelected(s),
    u = p.useRef(null),
    a = it(u),
    x = Qe({
      disabled: i,
      value: s,
      domRef: u,
      get textValue() {
        return a();
      },
    }),
    w = G(o, u, (f) => {
      f ? m.listRef.current.set(n, f) : m.listRef.current.delete(n);
    }),
    P = R(r, (f) => r.selectors.shouldScrollIntoView(f, n));
  de(() => {
    if (P)
      return qe().requestAnimationFrame(() => {
        var f, M;
        (M = (f = u.current) == null ? void 0 : f.scrollIntoView) == null ||
          M.call(f, {
            block: "nearest",
          });
      });
  }, [P, u]);
  de(() => {
    if (!c)
      return (
        r.actions.registerOption(n, x),
        () => r.actions.unregisterOption(n)
      );
  }, [x, n, c]);
  let _ = F((event) => {
      if (i) return event.preventDefault();
      r.actions.selectOption(s);
    }),
    k = F(() => {
      if (i)
        return r.actions.goToOption({
          focus: h.Nothing,
        });
      r.actions.goToOption({
        focus: h.Specific,
        id: n,
      });
    }),
    $ = st(),
    L = F((f) => $.update(f)),
    I = F((f) => {
      if ($.wasMoved(f)) {
        i ||
          (b && r.state.activationTrigger === te.Pointer) ||
          r.actions.goToOption(
            {
              focus: h.Specific,
              id: n,
            },
            te.Pointer,
          );
      }
    }),
    N = F((f) => {
      if ($.wasMoved(f)) {
        i ||
          (b &&
            r.state.activationTrigger === te.Pointer &&
            r.actions.goToOption({
              focus: h.Nothing,
            }));
      }
    }),
    z = K({
      active: b,
      focus: b,
      selected: g,
      disabled: i,
      selectedOption: g && c,
    }),
    T = c
      ? {}
      : {
          id: n,
          ref: w,
          role: "option",
          tabIndex: i === !0 ? void 0 : -1,
          "aria-disabled": i === !0 ? !0 : void 0,
          "aria-selected": g,
          disabled: void 0,
          onClick: _,
          onFocus: k,
          onPointerEnter: L,
          onMouseEnter: L,
          onPointerMove: I,
          onMouseMove: I,
          onPointerLeave: N,
          onMouseLeave: N,
        },
    Q = W();
  return !g && c
    ? null
    : Q({
        ourProps: T,
        theirProps: d,
        slot: z,
        defaultTag: At,
        name: "Listbox.Option",
      });
}
let _t = p.Fragment;
function Nt(e, o) {
  let { options: t, placeholder: n, ...i } = e,
    s = {
      ref: G(o),
    },
    d = Y("ListboxSelectedOption"),
    c = K({}),
    m =
      d.value === void 0 ||
      d.value === null ||
      (d.mode === B.Multi && Array.isArray(d.value) && d.value.length === 0),
    r = W();
  return y.createElement(
    Ee.Provider,
    {
      value: !0,
    },
    r({
      ourProps: s,
      theirProps: {
        ...i,
        children: y.createElement(y.Fragment, null, n && m ? n : t),
      },
      slot: c,
      defaultTag: _t,
      name: "ListboxSelectedOption",
    }),
  );
}
let Vt = j(wt),
  Bt = j(kt),
  zt = Ot,
  Qt = j(Dt),
  Ut = j(Ft),
  Ht = j(Nt),
  Xt = Object.assign(Vt, {
    Button: Bt,
    Label: zt,
    Options: Qt,
    Option: Ut,
    SelectedOption: Ht,
  });
export { Qt as B, Ut as I, Xt as M, Bt as a };
