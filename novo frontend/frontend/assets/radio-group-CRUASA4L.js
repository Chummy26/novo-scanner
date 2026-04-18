import { $ as Z, a as J } from "./use-resolve-button-type-DwKZeOeP.js";
import { a as n, c as _, R as p } from "./index-Bx06KCE-.js";
import {
  o as F,
  p as ye,
  z as ee,
  w as Re,
  B as te,
  Y as V,
  y as H,
  g as re,
  n as oe,
  V as ae,
  a as M,
  K as B,
  e as C,
  d as U,
  F as Q,
  T as L,
  L as X,
  u as $e,
  G as Ee,
} from "./use-is-mounted-D7iMJT5-.js";
import { M as Oe, o as ne, w as ke, H as ie } from "./transition-Cxix63ts.js";
import { Z as Pe, u as xe, N as Te, V as ue } from "./label-DDDQpD4Z.js";
import { s as le } from "./floating-CA5b9ljT.js";
function Ie(e, t, r) {
  let [o, a] = n.useState(r),
    l = e !== void 0,
    s = n.useRef(l),
    m = n.useRef(!1),
    i = n.useRef(!1);
  return (
    l && !s.current && !m.current
      ? ((m.current = !0),
        (s.current = l),
        console.error(
          "A component is changing from uncontrolled to controlled. This may be caused by the value changing from undefined to a defined value, which should not happen.",
        ))
      : !l &&
        s.current &&
        !i.current &&
        ((i.current = !0),
        (s.current = l),
        console.error(
          "A component is changing from controlled to uncontrolled. This may be caused by the value changing from a defined value to undefined, which should not happen.",
        )),
    [l ? e : o, F((f) => (l || _.flushSync(() => a(f)), t?.(f)))]
  );
}
function De(e) {
  let [t] = n.useState(e);
  return t;
}
function se(e = {}, t = null, r = []) {
  for (let [o, a] of Object.entries(e)) ce(r, de(t, o), a);
  return r;
}
function de(e, t) {
  return e ? e + "[" + t + "]" : t;
}
function ce(e, t, r) {
  if (Array.isArray(r))
    for (let [o, a] of r.entries()) ce(e, de(t, o.toString()), a);
  else
    r instanceof Date
      ? e.push([t, r.toISOString()])
      : typeof r == "boolean"
        ? e.push([t, r ? "1" : "0"])
        : typeof r == "string"
          ? e.push([t, r])
          : typeof r == "number"
            ? e.push([t, `${r}`])
            : r == null
              ? e.push([t, ""])
              : Ce(r) && !n.isValidElement(r) && se(r, t, e);
}
function Se(e) {
  var t, r;
  let o = (t = e?.form) != null ? t : e.closest("form");
  if (o) {
    for (let a of o.elements)
      if (
        a !== e &&
        ((a.tagName === "INPUT" && a.type === "submit") ||
          (a.tagName === "BUTTON" && a.type === "submit") ||
          (a.nodeName === "INPUT" && a.type === "image"))
      ) {
        a.click();
        return;
      }
    (r = o.requestSubmit) == null || r.call(o);
  }
}
function Ce(e) {
  if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
  let t = Object.getPrototypeOf(e);
  return t === null || Object.getPrototypeOf(t) === null;
}
let Fe = n.createContext(null);
function we({ children: e }) {
  let t = n.useContext(Fe);
  if (!t) return p.createElement(p.Fragment, null, e);
  let { target: r } = t;
  return r ? _.createPortal(p.createElement(p.Fragment, null, e), r) : null;
}
function Ge({ data: e, form: t, disabled: r, onReset: o, overrides: a }) {
  let [l, s] = n.useState(null),
    m = ye();
  return (
    n.useEffect(() => {
      if (o && l) return m.addEventListener(l, "reset", o);
    }, [l, t, o]),
    p.createElement(
      we,
      null,
      p.createElement(Ae, {
        setForm: s,
        formId: t,
      }),
      se(e).map(([i, f]) =>
        p.createElement(ee, {
          features: te.Hidden,
          ...Re({
            key: i,
            as: "input",
            type: "hidden",
            hidden: !0,
            readOnly: !0,
            form: t,
            disabled: r,
            name: i,
            value: f,
            ...a,
          }),
        }),
      ),
    )
  );
}
function Ae({ setForm: e, formId: t }) {
  return (
    n.useEffect(() => {
      if (t) {
        let r = document.getElementById(t);
        if (r) {
          e(r);
        }
      }
    }, [e, t]),
    t
      ? null
      : p.createElement(ee, {
          features: te.Hidden,
          as: "input",
          type: "hidden",
          hidden: !0,
          readOnly: !0,
          ref: (r) => {
            if (!r) return;
            let o = r.closest("form");
            if (o) {
              e(o);
            }
          },
        })
  );
}
function je(e, t) {
  return e !== null &&
    t !== null &&
    typeof e == "object" &&
    typeof t == "object" &&
    "id" in e &&
    "id" in t
    ? e.id === t.id
    : e === t;
}
function Ne(e = je) {
  return n.useCallback(
    (t, r) => {
      if (typeof e == "string") {
        let o = e;
        return t?.[o] === r?.[o];
      }
      return e(t, r);
    },
    [e],
  );
}
var Le = ((e) => (
  (e[(e.RegisterOption = 0)] = "RegisterOption"),
  (e[(e.UnregisterOption = 1)] = "UnregisterOption"),
  e
))(Le || {});
let Ue = {
    0(e, t) {
      let r = [
        ...e.options,
        {
          id: t.id,
          element: t.element,
          propsRef: t.propsRef,
        },
      ];
      return {
        ...e,
        options: Ee(r, (o) => o.element.current),
      };
    },
    1(e, t) {
      let r = e.options.slice(),
        o = e.options.findIndex((props) => props.id === t.id);
      return o === -1
        ? e
        : (r.splice(o, 1),
          {
            ...e,
            options: r,
          });
    },
  },
  K = n.createContext(null);
K.displayName = "RadioGroupDataContext";
function W(e) {
  let t = n.useContext(K);
  if (t === null) {
    let r = new Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(r, W), r);
  }
  return t;
}
let q = n.createContext(null);
q.displayName = "RadioGroupActionsContext";
function z(e) {
  let t = n.useContext(q);
  if (t === null) {
    let r = new Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(r, z), r);
  }
  return t;
}
function Ve(e, t) {
  return $e(t.type, Ue, e, t);
}
let He = "div";
function Me(e, t) {
  let r = n.useId(),
    o = ne(),
    {
      id: a = `headlessui-radiogroup-${r}`,
      value: l,
      form: s,
      name: m,
      onChange: i,
      by: f,
      disabled: b = o || !1,
      defaultValue: g,
      tabIndex: x = 0,
      ...$
    } = e,
    R = Ne(f),
    [O, T] = n.useReducer(Ve, {
      options: [],
    }),
    d = O.options,
    [w, G] = ue(),
    [I, A] = ie(),
    D = n.useRef(null),
    j = H(D, t),
    v = De(g),
    [h, S] = Ie(l, i, v),
    k = n.useMemo(() => d.find((item) => !item.propsRef.current.disabled), [d]),
    E = n.useMemo(
      () => d.some((item) => R(item.propsRef.current.value, h)),
      [d, h],
    ),
    y = F((u) => {
      var N;
      if (b || R(u, h)) return !1;
      let c =
        (N = d.find((item) => R(item.propsRef.current.value, u))) == null
          ? void 0
          : N.propsRef.current;
      return c != null && c.disabled ? !1 : (S?.(u), !0);
    }),
    pe = F((event) => {
      if (!D.current) return;
      let N = d
        .filter((item) => item.propsRef.current.disabled === !1)
        .map((item) => item.element.current);
      switch (event.key) {
        case C.Enter:
          Se(event.currentTarget);
          break;
        case C.ArrowLeft:
        case C.ArrowUp:
          if (
            (event.preventDefault(),
            event.stopPropagation(),
            Q(N, L.Previous | L.WrapAround) === X.Success)
          ) {
            let c = d.find((item) => U(item.element.current));
            if (c) {
              y(c.propsRef.current.value);
            }
          }
          break;
        case C.ArrowRight:
        case C.ArrowDown:
          if (
            (event.preventDefault(),
            event.stopPropagation(),
            Q(N, L.Next | L.WrapAround) === X.Success)
          ) {
            let c = d.find((item) => U(item.element.current));
            if (c) {
              y(c.propsRef.current.value);
            }
          }
          break;
        case C.Space:
          {
            event.preventDefault();
            event.stopPropagation();
            let c = d.find((item) => U(item.element.current));
            if (c) {
              y(c.propsRef.current.value);
            }
          }
          break;
      }
    }),
    Y = F(
      (props) => (
        T({
          type: 0,
          ...props,
        }),
        () =>
          T({
            type: 1,
            id: props.id,
          })
      ),
    ),
    fe = n.useMemo(
      () => ({
        value: h,
        firstOption: k,
        containsCheckedOption: E,
        disabled: b,
        compare: R,
        tabIndex: x,
        ...O,
      }),
      [h, k, E, b, R, x, O],
    ),
    me = n.useMemo(
      () => ({
        registerOption: Y,
        change: y,
      }),
      [Y, y],
    ),
    be = {
      ref: j,
      id: a,
      role: "radiogroup",
      "aria-labelledby": w,
      "aria-describedby": I,
      onKeyDown: pe,
    },
    ve = M({
      value: h,
    }),
    he = n.useCallback(() => {
      if (v !== void 0) return y(v);
    }, [y, v]),
    ge = B();
  return p.createElement(
    A,
    {
      name: "RadioGroup.Description",
    },
    p.createElement(
      G,
      {
        name: "RadioGroup.Label",
      },
      p.createElement(
        q.Provider,
        {
          value: me,
        },
        p.createElement(
          K.Provider,
          {
            value: fe,
          },
          m != null &&
            p.createElement(Ge, {
              disabled: b,
              data: {
                [m]: h || "on",
              },
              overrides: {
                type: "radio",
                checked: h != null,
              },
              form: s,
              onReset: he,
            }),
          ge({
            ourProps: be,
            theirProps: $,
            slot: ve,
            defaultTag: He,
            name: "RadioGroup",
          }),
        ),
      ),
    ),
  );
}
let Be = "div";
function Ke(e, t) {
  var r;
  let o = W("RadioGroup.Option"),
    a = z("RadioGroup.Option"),
    l = n.useId(),
    {
      id: s = `headlessui-radiogroup-option-${l}`,
      value: m,
      disabled: i = o.disabled || !1,
      autoFocus: f = !1,
      ...b
    } = e,
    g = n.useRef(null),
    x = H(g, t),
    [$, R] = ue(),
    [O, T] = ie(),
    d = re({
      value: m,
      disabled: i,
    });
  oe(
    () =>
      a.registerOption({
        id: s,
        element: g,
        propsRef: d,
      }),
    [s, a, g, d],
  );
  let w = F((event) => {
      var y;
      if (le(event.currentTarget)) return event.preventDefault();
      if (a.change(m)) {
        (y = g.current) == null || y.focus();
      }
    }),
    G = ((r = o.firstOption) == null ? void 0 : r.id) === s,
    { isFocusVisible: I, focusProps: A } = Z({
      autoFocus: f,
    }),
    { isHovered: D, hoverProps: j } = J({
      isDisabled: i,
    }),
    v = o.compare(o.value, m),
    h = ae(
      {
        ref: x,
        id: s,
        role: "radio",
        "aria-checked": v ? "true" : "false",
        "aria-labelledby": $,
        "aria-describedby": O,
        "aria-disabled": i ? !0 : void 0,
        tabIndex: i
          ? -1
          : v || (!o.containsCheckedOption && G)
            ? o.tabIndex
            : -1,
        onClick: i ? void 0 : w,
        autoFocus: f,
      },
      A,
      j,
    ),
    S = M({
      checked: v,
      disabled: i,
      active: I,
      hover: D,
      focus: I,
      autofocus: f,
    }),
    k = B();
  return p.createElement(
    T,
    {
      name: "RadioGroup.Description",
    },
    p.createElement(
      R,
      {
        name: "RadioGroup.Label",
      },
      k({
        ourProps: h,
        theirProps: b,
        slot: S,
        defaultTag: Be,
        name: "RadioGroup.Option",
      }),
    ),
  );
}
let We = "span";
function qe(e, t) {
  var r;
  let o = W("Radio"),
    a = z("Radio"),
    l = n.useId(),
    s = xe(),
    m = ne(),
    {
      id: i = s || `headlessui-radio-${l}`,
      value: f,
      disabled: b = o.disabled || m || !1,
      autoFocus: g = !1,
      ...x
    } = e,
    $ = n.useRef(null),
    R = H($, t),
    O = Te(),
    T = ke(),
    d = re({
      value: f,
      disabled: b,
    });
  oe(
    () =>
      a.registerOption({
        id: i,
        element: $,
        propsRef: d,
      }),
    [i, a, $, d],
  );
  let w = F((event) => {
      var E;
      if (le(event.currentTarget)) return event.preventDefault();
      if (a.change(f)) {
        (E = $.current) == null || E.focus();
      }
    }),
    { isFocusVisible: G, focusProps: I } = Z({
      autoFocus: g,
    }),
    { isHovered: A, hoverProps: D } = J({
      isDisabled: b,
    }),
    j = ((r = o.firstOption) == null ? void 0 : r.id) === i,
    v = o.compare(o.value, f),
    h = ae(
      {
        ref: R,
        id: i,
        role: "radio",
        "aria-checked": v ? "true" : "false",
        "aria-labelledby": O,
        "aria-describedby": T,
        "aria-disabled": b ? !0 : void 0,
        tabIndex: b
          ? -1
          : v || (!o.containsCheckedOption && j)
            ? o.tabIndex
            : -1,
        autoFocus: g,
        onClick: b ? void 0 : w,
      },
      I,
      D,
    ),
    S = M({
      checked: v,
      disabled: b,
      hover: A,
      focus: G,
      autofocus: g,
    });
  return B()({
    ourProps: h,
    theirProps: x,
    slot: S,
    defaultTag: We,
    name: "Radio",
  });
}
let ze = V(Me),
  Ye = V(Ke),
  Qe = V(qe),
  Xe = Pe,
  Ze = Oe,
  at = Object.assign(ze, {
    Option: Ye,
    Radio: Qe,
    Label: Xe,
    Description: Ze,
  });
export { Qe as K, Ie as b, Se as g, Ge as j, De as l, Ne as u, at as y };
