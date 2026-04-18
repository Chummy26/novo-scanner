import {
  a as u,
  R as $,
  C as nt,
  c as lt,
  a9 as ye,
} from "./index-Bx06KCE-.js";
import {
  Y as D,
  y as H,
  n as R,
  a as it,
  K as N,
  o as w,
  b as A,
  s as W,
  u as he,
  l as Fe,
  g as B,
  f as st,
  H as at,
  I as ot,
  i as U,
  h as ut,
  r as ct,
  j as dt,
  k as ft,
  p as ve,
  t as pt,
  m as ht,
  A as vt,
  q as mt,
  v as gt,
  C as j,
  w as bt,
  x as $t,
} from "./use-is-mounted-D7iMJT5-.js";
let Et = u.createContext(void 0);
function wt() {
  return u.useContext(Et);
}
let Q = u.createContext(null);
Q.displayName = "DescriptionContext";
function We() {
  let e = u.useContext(Q);
  if (e === null) {
    let t = new Error(
      "You used a <Description /> component, but it is not inside a relevant parent.",
    );
    throw (Error.captureStackTrace && Error.captureStackTrace(t, We), t);
  }
  return e;
}
function Cr() {
  var e, t;
  return (t = (e = u.useContext(Q)) == null ? void 0 : e.value) != null
    ? t
    : void 0;
}
function xr() {
  let [e, t] = u.useState([]);
  return [
    e.length > 0 ? e.join(" ") : void 0,
    u.useMemo(
      () =>
        function (props) {
          let n = w(
              (i) => (
                t((o) => [...o, i]),
                () =>
                  t((o) => {
                    let a = o.slice(),
                      s = a.indexOf(i);
                    return (s !== -1 && a.splice(s, 1), a);
                  })
              ),
            ),
            l = u.useMemo(
              () => ({
                register: n,
                slot: props.slot,
                name: props.name,
                props: props.props,
                value: props.value,
              }),
              [n, props.slot, props.name, props.props, props.value],
            );
          return $.createElement(
            Q.Provider,
            {
              value: l,
            },
            props.children,
          );
        },
      [t],
    ),
  ];
}
let yt = "p";
function St(e, t) {
  let r = u.useId(),
    n = wt(),
    { id: l = `headlessui-description-${r}`, ...i } = e,
    o = We(),
    a = H(t);
  R(() => o.register(l), [l, o.register]);
  let s = it({
      ...o.slot,
      disabled: n || !1,
    }),
    c = {
      ref: a,
      ...o.props,
      id: l,
    };
  return N()({
    ourProps: c,
    theirProps: i,
    slot: s,
    defaultTag: yt,
    name: o.name || "Description",
  });
}
let Ct = D(St),
  Pr = Object.assign(Ct, {}),
  De = class extends Map {
    constructor(t) {
      super();
      this.factory = t;
    }
    get(t) {
      let r = super.get(t);
      return (r === void 0 && ((r = this.factory(t)), this.set(t, r)), r);
    }
  };
var xt = Object.defineProperty,
  Pt = (e, t, r) => {
    return t in e
      ? xt(e, t, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: r,
        })
      : (e[t] = r);
  },
  Ot = (e, t, r) => {
    return (Pt(e, t + "", r), r);
  },
  He = (e, t, r) => {
    if (!t.has(e)) throw TypeError("Cannot " + r);
  },
  C = (e, t, r) => {
    return (He(e, t, "read from private field"), r ? r.call(e) : t.get(e));
  },
  ae = (e, t, r) => {
    if (t.has(e))
      throw TypeError("Cannot add the same private member more than once");
    t instanceof WeakSet ? t.add(e) : t.set(e, r);
  },
  Se = (e, t, r, n) => {
    return (He(e, t, "write to private field"), t.set(e, r), r);
  },
  k,
  _,
  Y;
let Tt = class {
  constructor(t) {
    ae(this, k, {});
    ae(this, _, new De(() => new Set()));
    ae(this, Y, new Set());
    Ot(this, "disposables", A());
    Se(this, k, t);
    if (W.isServer) {
      this.disposables.microTask(() => {
        this.dispose();
      });
    }
  }
  dispose() {
    this.disposables.dispose();
  }
  get state() {
    return C(this, k);
  }
  subscribe(t, r) {
    if (W.isServer) return () => {};
    let n = {
      selector: t,
      callback: r,
      current: t(C(this, k)),
    };
    return (
      C(this, Y).add(n),
      this.disposables.add(() => {
        C(this, Y).delete(n);
      })
    );
  }
  on(t, r) {
    return W.isServer
      ? () => {}
      : (C(this, _).get(t).add(r),
        this.disposables.add(() => {
          C(this, _).get(t).delete(r);
        }));
  }
  send(t) {
    let r = this.reduce(C(this, k), t);
    if (r !== C(this, k)) {
      Se(this, k, r);
      for (let n of C(this, Y)) {
        let l = n.selector(C(this, k));
        Ne(n.current, l) || ((n.current = l), n.callback(l));
      }
      for (let n of C(this, _).get(t.type)) n(C(this, k), t);
    }
  }
};
k = new WeakMap();
_ = new WeakMap();
Y = new WeakMap();
function Ne(e, t) {
  if (Object.is(e, t)) {
    return !0;
  }
  if (
    typeof e != "object" ||
    e === null ||
    typeof t != "object" ||
    t === null
  ) {
    return !1;
  }
  if (Array.isArray(e) && Array.isArray(t)) {
    return e.length !== t.length
      ? !1
      : oe(e[Symbol.iterator](), t[Symbol.iterator]());
  }
  if (
    (e instanceof Map && t instanceof Map) ||
    (e instanceof Set && t instanceof Set)
  ) {
    return e.size !== t.size ? !1 : oe(e.entries(), t.entries());
  }
  if (Ce(e) && Ce(t)) {
    return oe(
      Object.entries(e)[Symbol.iterator](),
      Object.entries(t)[Symbol.iterator](),
    );
  }
  return !1;
}
function oe(e, t) {
  do {
    let r = e.next(),
      n = t.next();
    if (r.done && n.done) return !0;
    if (r.done || n.done || !Object.is(r.value, n.value)) return !1;
  } while (!0);
}
function Ce(e) {
  if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
  let t = Object.getPrototypeOf(e);
  return t === null || Object.getPrototypeOf(t) === null;
}
function kr(e) {
  let [t, r] = e(),
    n = A();
  return (...l) => {
    t(...l);
    n.dispose();
    n.microTask(r);
  };
}
var kt = Object.defineProperty,
  Rt = (e, t, r) => {
    return t in e
      ? kt(e, t, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: r,
        })
      : (e[t] = r);
  },
  xe = (e, t, r) => {
    return (Rt(e, typeof t != "symbol" ? t + "" : t, r), r);
  },
  Mt = ((e) => ((e[(e.Push = 0)] = "Push"), (e[(e.Pop = 1)] = "Pop"), e))(
    Mt || {},
  );
let At = {
    0(e, t) {
      let r = t.id,
        n = e.stack,
        l = e.stack.indexOf(r);
      if (l !== -1) {
        let i = e.stack.slice();
        return (
          i.splice(l, 1),
          i.push(r),
          (n = i),
          {
            ...e,
            stack: n,
          }
        );
      }
      return {
        ...e,
        stack: [...e.stack, r],
      };
    },
    1(e, t) {
      let r = t.id,
        n = e.stack.indexOf(r);
      if (n === -1) return e;
      let l = e.stack.slice();
      return (
        l.splice(n, 1),
        {
          ...e,
          stack: l,
        }
      );
    },
  },
  jt = class Ie extends Tt {
    constructor() {
      super(...arguments);
      xe(this, "actions", {
        push: (t) =>
          this.send({
            type: 0,
            id: t,
          }),
        pop: (t) =>
          this.send({
            type: 1,
            id: t,
          }),
      });
      xe(this, "selectors", {
        isTop: (t, r) => t.stack[t.stack.length - 1] === r,
        inStack: (t, r) => t.stack.includes(r),
      });
    }
    static new() {
      return new Ie({
        stack: [],
      });
    }
    reduce(t, r) {
      return he(r.type, At, t, r);
    }
  };
const Lt = new De(() => jt.new());
var ue = {
    exports: {},
  },
  ce = {};
var Pe;
function Ft() {
  if (Pe) return ce;
  Pe = 1;
  var e = nt();
  function t(s, c) {
    return (s === c && (s !== 0 || 1 / s === 1 / c)) || (s !== s && c !== c);
  }
  var r = typeof Object.is == "function" ? Object.is : t,
    n = e.useSyncExternalStore,
    l = e.useRef,
    i = e.useEffect,
    o = e.useMemo,
    a = e.useDebugValue;
  return (
    (ce.useSyncExternalStoreWithSelector = function (s, c, d, v, f) {
      var h = l(null);
      if (h.current === null) {
        var p = {
          hasValue: !1,
          value: null,
        };
        h.current = p;
      } else p = h.current;
      h = o(
        function () {
          function m(E) {
            if (!P) {
              if (((P = !0), (O = E), (E = v(E)), f !== void 0 && p.hasValue)) {
                var M = p.value;
                if (f(M, E)) return (b = M);
              }
              return (b = E);
            }
            if (((M = b), r(O, E))) return M;
            var y = v(E);
            return f !== void 0 && f(M, y) ? ((O = E), M) : ((O = E), (b = y));
          }
          var P = !1,
            O,
            b,
            x = d === void 0 ? null : d;
          return [
            function () {
              return m(c());
            },
            x === null
              ? void 0
              : function () {
                  return m(x());
                },
          ];
        },
        [c, d, v, f],
      );
      var g = n(s, h[0], h[1]);
      return (
        i(
          function () {
            p.hasValue = !0;
            p.value = g;
          },
          [g],
        ),
        a(g),
        g
      );
    }),
    ce
  );
}
var Oe;
function Wt() {
  return (Oe || ((Oe = 1), (ue.exports = Ft())), ue.exports);
}
var Dt = Wt();
function Ht(e, t, r = Ne) {
  return Dt.useSyncExternalStoreWithSelector(
    w((n) => e.subscribe(Nt, n)),
    w(() => e.state),
    w(() => e.state),
    w(t),
    r,
  );
}
function Nt(e) {
  return e;
}
function Ve(e, t) {
  let r = u.useId(),
    n = Lt.get(t),
    [l, i] = Ht(
      n,
      u.useCallback(
        (o) => [n.selectors.isTop(o, r), n.selectors.inStack(o, r)],
        [n, r],
      ),
    );
  return (
    R(() => {
      if (e) return (n.actions.push(r), () => n.actions.pop(r));
    }, [n, e, r]),
    e ? (i ? l : !0) : !1
  );
}
let de = new Map(),
  z = new Map();
function Te(e) {
  var t;
  let r = (t = z.get(e)) != null ? t : 0;
  return (
    z.set(e, r + 1),
    r !== 0
      ? () => ke(e)
      : (de.set(e, {
          "aria-hidden": e.getAttribute("aria-hidden"),
          inert: e.inert,
        }),
        e.setAttribute("aria-hidden", "true"),
        (e.inert = !0),
        () => ke(e))
  );
}
function ke(e) {
  var t;
  let r = (t = z.get(e)) != null ? t : 1;
  if ((r === 1 ? z.delete(e) : z.set(e, r - 1), r !== 1)) return;
  let n = de.get(e);
  if (n) {
    (n["aria-hidden"] === null
      ? e.removeAttribute("aria-hidden")
      : e.setAttribute("aria-hidden", n["aria-hidden"]),
      (e.inert = n.inert),
      de.delete(e));
  }
}
function Rr(e, { allowed: t, disallowed: r } = {}) {
  let n = Ve(e, "inert-others");
  R(() => {
    var l, i;
    if (!n) return;
    let o = A();
    for (let s of (l = r?.()) != null ? l : [])
      if (s) {
        o.add(Te(s));
      }
    let a = (i = t?.()) != null ? i : [];
    for (let s of a) {
      if (!s) continue;
      let c = Fe(s);
      if (!c) continue;
      let d = s.parentElement;
      for (; d && d !== c.body; ) {
        for (let v of d.children)
          a.some((item) => v.contains(item)) || o.add(Te(v));
        d = d.parentElement;
      }
    }
    return o.dispose;
  }, [n, t, r]);
}
function Mr(e, t, r) {
  let n = B((l) => {
    let i = l.getBoundingClientRect();
    if (i.x === 0 && i.y === 0 && i.width === 0 && i.height === 0) {
      r();
    }
  });
  u.useEffect(() => {
    if (!e) return;
    let l = t === null ? null : st(t) ? t : t.current;
    if (!l) return;
    let i = A();
    if (typeof ResizeObserver < "u") {
      let o = new ResizeObserver(() => n.current(l));
      o.observe(l);
      i.add(() => o.disconnect());
    }
    if (typeof IntersectionObserver < "u") {
      let o = new IntersectionObserver(() => n.current(l));
      o.observe(l);
      i.add(() => o.disconnect());
    }
    return () => i.dispose();
  }, [t, n, e]);
}
function Ue() {
  return (
    /iPhone/gi.test(window.navigator.platform) ||
    (/Mac/gi.test(window.navigator.platform) &&
      window.navigator.maxTouchPoints > 0)
  );
}
function It() {
  return /Android/gi.test(window.navigator.userAgent);
}
function Re() {
  return Ue() || It();
}
function J(e, t, r, n) {
  let l = B(r);
  u.useEffect(() => {
    if (!e) return;
    function i(o) {
      l.current(o);
    }
    return (
      document.addEventListener(t, i, n),
      () => document.removeEventListener(t, i, n)
    );
  }, [e, t, n]);
}
function Vt(e, t, r, n) {
  let l = B(r);
  u.useEffect(() => {
    if (!e) return;
    function i(o) {
      l.current(o);
    }
    return (
      window.addEventListener(t, i, n),
      () => window.removeEventListener(t, i, n)
    );
  }, [e, t, n]);
}
const Me = 30;
function Ar(e, t, r) {
  let n = B(r),
    l = u.useCallback(
      function (a, s) {
        if (a.defaultPrevented) return;
        let c = s(a);
        if (c === null || !c.getRootNode().contains(c) || !c.isConnected)
          return;
        let d = (function v(f) {
          if (typeof f == "function") {
            return v(f());
          }
          if (Array.isArray(f) || f instanceof Set) {
            return f;
          }
          return [f];
        })(t);
        for (let v of d)
          if (
            v !== null &&
            (v.contains(c) || (a.composed && a.composedPath().includes(v)))
          )
            return;
        return (
          !at(c, ot.Loose) && c.tabIndex !== -1 && a.preventDefault(),
          n.current(a, c)
        );
      },
      [n, t],
    ),
    i = u.useRef(null);
  J(
    e,
    "pointerdown",
    (event) => {
      var s, c;
      Re() ||
        (i.current =
          ((c = (s = event.composedPath) == null ? void 0 : s.call(event)) ==
          null
            ? void 0
            : c[0]) || event.target);
    },
    !0,
  );
  J(
    e,
    "pointerup",
    (a) => {
      if (Re() || !i.current) return;
      let s = i.current;
      return ((i.current = null), l(a, () => s));
    },
    !0,
  );
  let o = u.useRef({
    x: 0,
    y: 0,
  });
  J(
    e,
    "touchstart",
    (a) => {
      o.current.x = a.touches[0].clientX;
      o.current.y = a.touches[0].clientY;
    },
    !0,
  );
  J(
    e,
    "touchend",
    (event) => {
      let s = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
      };
      if (
        !(
          Math.abs(s.x - o.current.x) >= Me || Math.abs(s.y - o.current.y) >= Me
        )
      )
        return l(event, () => (U(event.target) ? event.target : null));
    },
    !0,
  );
  Vt(
    e,
    "blur",
    (a) =>
      l(a, () =>
        ut(window.document.activeElement)
          ? window.document.activeElement
          : null,
      ),
    !0,
  );
}
function Ut(...e) {
  return u.useMemo(() => Fe(...e), [...e]);
}
function jr(...e) {
  return u.useMemo(() => ct(...e), [...e]);
}
function _t(e) {
  return u.useSyncExternalStore(e.subscribe, e.getSnapshot, e.getSnapshot);
}
function Yt(e, t) {
  let r = e(),
    n = new Set();
  return {
    getSnapshot() {
      return r;
    },
    subscribe(l) {
      return (n.add(l), () => n.delete(l));
    },
    dispatch(l, ...i) {
      let o = t[l].call(r, ...i);
      if (o) {
        ((r = o), n.forEach((item) => item()));
      }
    },
  };
}
function zt() {
  let e;
  return {
    before({ doc: t }) {
      var r;
      let n = t.documentElement,
        l = (r = t.defaultView) != null ? r : window;
      e = Math.max(0, l.innerWidth - n.clientWidth);
    },
    after({ doc: t, d: r }) {
      let n = t.documentElement,
        l = Math.max(0, n.clientWidth - n.offsetWidth),
        i = Math.max(0, e - l);
      r.style(n, "paddingRight", `${i}px`);
    },
  };
}
function Bt() {
  return Ue()
    ? {
        before({ doc: e, d: t, meta: r }) {
          function n(l) {
            for (let i of r().containers)
              for (let o of i()) if (o.contains(l)) return !0;
            return !1;
          }
          t.microTask(() => {
            var l;
            if (
              window.getComputedStyle(e.documentElement).scrollBehavior !==
              "auto"
            ) {
              let a = A();
              a.style(e.documentElement, "scrollBehavior", "auto");
              t.add(() => t.microTask(() => a.dispose()));
            }
            let i = (l = window.scrollY) != null ? l : window.pageYOffset,
              o = null;
            t.addEventListener(
              e,
              "click",
              (event) => {
                if (U(event.target))
                  try {
                    let s = event.target.closest("a");
                    if (!s) return;
                    let { hash: c } = new URL(s.href),
                      d = e.querySelector(c);
                    if (U(d) && !n(d)) {
                      o = d;
                    }
                  } catch {}
              },
              !0,
            );
            t.group((props) => {
              t.addEventListener(e, "touchstart", (event) => {
                if ((props.dispose(), U(event.target) && dt(event.target)))
                  if (n(event.target)) {
                    let c = event.target;
                    for (; c.parentElement && n(c.parentElement); )
                      c = c.parentElement;
                    props.style(c, "overscrollBehavior", "contain");
                  } else props.style(event.target, "touchAction", "none");
              });
            });
            t.addEventListener(
              e,
              "touchmove",
              (event) => {
                if (U(event.target)) {
                  if (ft(event.target)) return;
                  if (n(event.target)) {
                    let s = event.target;
                    for (
                      ;
                      s.parentElement &&
                      s.dataset.headlessuiPortal !== "" &&
                      !(
                        s.scrollHeight > s.clientHeight ||
                        s.scrollWidth > s.clientWidth
                      );
                    )
                      s = s.parentElement;
                    if (s.dataset.headlessuiPortal === "") {
                      event.preventDefault();
                    }
                  } else event.preventDefault();
                }
              },
              {
                passive: !1,
              },
            );
            t.add(() => {
              var a;
              let s = (a = window.scrollY) != null ? a : window.pageYOffset;
              if (i !== s) {
                window.scrollTo(0, i);
              }
              if (o && o.isConnected) {
                (o.scrollIntoView({
                  block: "nearest",
                }),
                  (o = null));
              }
            });
          });
        },
      }
    : {};
}
function qt() {
  return {
    before({ doc: e, d: t }) {
      t.style(e.documentElement, "overflow", "hidden");
    },
  };
}
function Ae(e) {
  let t = {};
  for (let r of e) Object.assign(t, r(t));
  return t;
}
let L = Yt(() => new Map(), {
  PUSH(e, t) {
    var r;
    let n =
      (r = this.get(e)) != null
        ? r
        : {
            doc: e,
            count: 0,
            d: A(),
            meta: new Set(),
            computedMeta: {},
          };
    return (
      n.count++,
      n.meta.add(t),
      (n.computedMeta = Ae(n.meta)),
      this.set(e, n),
      this
    );
  },
  POP(e, t) {
    let r = this.get(e);
    return (
      r && (r.count--, r.meta.delete(t), (r.computedMeta = Ae(r.meta))),
      this
    );
  },
  SCROLL_PREVENT(e) {
    let t = {
        doc: e.doc,
        d: e.d,
        meta() {
          return e.computedMeta;
        },
      },
      r = [Bt(), zt(), qt()];
    r.forEach(({ before: n }) => n?.(t));
    r.forEach(({ after: n }) => n?.(t));
  },
  SCROLL_ALLOW({ d: e }) {
    e.dispose();
  },
  TEARDOWN({ doc: e }) {
    this.delete(e);
  },
});
L.subscribe(() => {
  let e = L.getSnapshot(),
    t = new Map();
  for (let [r] of e) t.set(r, r.documentElement.style.overflow);
  for (let r of e.values()) {
    let n = t.get(r.doc) === "hidden",
      l = r.count !== 0;
    if ((l && !n) || (!l && n)) {
      L.dispatch(r.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", r);
    }
    if (r.count === 0) {
      L.dispatch("TEARDOWN", r);
    }
  }
});
function Xt(
  e,
  t,
  r = () => ({
    containers: [],
  }),
) {
  let n = _t(L),
    l = t ? n.get(t) : void 0,
    i = l ? l.count > 0 : !1;
  return (
    R(() => {
      if (!(!t || !e))
        return (L.dispatch("PUSH", t, r), () => L.dispatch("POP", t, r));
    }, [e, t]),
    i
  );
}
function Lr(e, t, r = () => [document.body]) {
  let n = Ve(e, "scroll-lock");
  Xt(n, t, (l) => {
    var i;
    return {
      containers: [...((i = l.containers) != null ? i : []), r],
    };
  });
}
function Gt(e = 0) {
  let [t, r] = u.useState(e),
    n = u.useCallback((s) => r(s), []),
    l = u.useCallback((s) => r((c) => c | s), []),
    i = u.useCallback((s) => (t & s) === s, [t]),
    o = u.useCallback((s) => r((c) => c & ~s), []),
    a = u.useCallback((s) => r((c) => c ^ s), []);
  return {
    flags: t,
    setFlag: n,
    addFlag: l,
    hasFlag: i,
    removeFlag: o,
    toggleFlag: a,
  };
}
var Kt = {},
  je,
  Le;
if (
  typeof process < "u" &&
  typeof globalThis < "u" &&
  typeof Element < "u" &&
  ((je = process == null ? void 0 : Kt) == null ? void 0 : je.NODE_ENV) ===
    "test" &&
  typeof ((Le = Element?.prototype) == null ? void 0 : Le.getAnimations) > "u"
) {
  Element.prototype.getAnimations = function () {
    return (
      console.warn(
        [
          "Headless UI has polyfilled `Element.prototype.getAnimations` for your tests.",
          "Please install a proper polyfill e.g. `jsdom-testing-mocks`, to silence these warnings.",
          "",
          "Example usage:",
          "```js",
          "import { mockAnimationsApi } from 'jsdom-testing-mocks'",
          "mockAnimationsApi()",
          "```",
        ].join(`
`),
      ),
      []
    );
  };
}
var Jt = ((e) => (
  (e[(e.None = 0)] = "None"),
  (e[(e.Closed = 1)] = "Closed"),
  (e[(e.Enter = 2)] = "Enter"),
  (e[(e.Leave = 4)] = "Leave"),
  e
))(Jt || {});
function Qt(e) {
  let t = {};
  for (let r in e)
    if (e[r] === !0) {
      t[`data-${r}`] = "";
    }
  return t;
}
function Zt(e, t, r, n) {
  let [l, i] = u.useState(r),
    { hasFlag: o, addFlag: a, removeFlag: s } = Gt(e && l ? 3 : 0),
    c = u.useRef(!1),
    d = u.useRef(!1),
    v = ve();
  return (
    R(() => {
      var f;
      if (e) {
        if ((r && i(!0), !t)) {
          if (r) {
            a(3);
          }
          return;
        }
        return (
          (f = n?.start) == null || f.call(n, r),
          er(t, {
            inFlight: c,
            prepare() {
              d.current ? (d.current = !1) : (d.current = c.current);
              c.current = !0;
              if (!d.current) {
                r ? (a(3), s(4)) : (a(4), s(2));
              }
            },
            run() {
              d.current ? (r ? (s(3), a(4)) : (s(4), a(3))) : r ? s(1) : a(1);
            },
            done() {
              var h;
              (d.current && nr(t)) ||
                ((c.current = !1),
                s(7),
                r || i(!1),
                (h = n?.end) == null || h.call(n, r));
            },
          })
        );
      }
    }, [e, r, t, v]),
    e
      ? [
          l,
          {
            closed: o(1),
            enter: o(2),
            leave: o(4),
            transition: o(2) || o(4),
          },
        ]
      : [
          r,
          {
            closed: void 0,
            enter: void 0,
            leave: void 0,
            transition: void 0,
          },
        ]
  );
}
function er(e, { prepare: t, run: r, done: n, inFlight: l }) {
  let i = A();
  return (
    rr(e, {
      prepare: t,
      inFlight: l,
    }),
    i.nextFrame(() => {
      r();
      i.requestAnimationFrame(() => {
        i.add(tr(e, n));
      });
    }),
    i.dispose
  );
}
function tr(e, t) {
  var r, n;
  let l = A();
  if (!e) return l.dispose;
  let i = !1;
  l.add(() => {
    i = !0;
  });
  let o =
    (n =
      (r = e.getAnimations) == null
        ? void 0
        : r.call(e).filter((item) => item instanceof CSSTransition)) != null
      ? n
      : [];
  return o.length === 0
    ? (t(), l.dispose)
    : (Promise.allSettled(o.map((item) => item.finished)).then(() => {
        i || t();
      }),
      l.dispose);
}
function rr(e, { inFlight: t, prepare: r }) {
  if (t != null && t.current) {
    r();
    return;
  }
  let n = e.style.transition;
  e.style.transition = "none";
  r();
  e.offsetHeight;
  e.style.transition = n;
}
function nr(e) {
  var t, r;
  return (
    (r = (t = e.getAnimations) == null ? void 0 : t.call(e)) != null ? r : []
  ).some(
    (item) => item instanceof CSSTransition && item.playState !== "finished",
  );
}
let Z = u.createContext(null);
Z.displayName = "OpenClosedContext";
var F = ((e) => (
  (e[(e.Open = 1)] = "Open"),
  (e[(e.Closed = 2)] = "Closed"),
  (e[(e.Closing = 4)] = "Closing"),
  (e[(e.Opening = 8)] = "Opening"),
  e
))(F || {});
function _e() {
  return u.useContext(Z);
}
function lr({ value: e, children: t }) {
  return $.createElement(
    Z.Provider,
    {
      value: e,
    },
    t,
  );
}
function Fr({ children: e }) {
  return $.createElement(
    Z.Provider,
    {
      value: null,
    },
    e,
  );
}
function ir(e) {
  let t = w(e),
    r = u.useRef(!1);
  u.useEffect(
    () => (
      (r.current = !1),
      () => {
        r.current = !0;
        pt(() => {
          if (r.current) {
            t();
          }
        });
      }
    ),
    [t],
  );
}
let Ye = u.createContext(!1);
function sr() {
  return u.useContext(Ye);
}
function Wr(props) {
  return $.createElement(
    Ye.Provider,
    {
      value: props.force,
    },
    props.children,
  );
}
function ar(e) {
  let t = sr(),
    r = u.useContext(Be),
    [n, l] = u.useState(() => {
      var i;
      if (!t && r !== null) return (i = r.current) != null ? i : null;
      if (W.isServer) return null;
      let o = e?.getElementById("headlessui-portal-root");
      if (o) return o;
      if (e === null) return null;
      let a = e.createElement("div");
      return (
        a.setAttribute("id", "headlessui-portal-root"),
        e.body.appendChild(a)
      );
    });
  return (
    u.useEffect(() => {
      if (n !== null) {
        (e != null && e.body.contains(n)) || e == null || e.body.appendChild(n);
      }
    }, [n, e]),
    u.useEffect(() => {
      t || (r !== null && l(r.current));
    }, [r, l, t]),
    n
  );
}
let ze = u.Fragment,
  or = D(function (e, t) {
    let { ownerDocument: r = null, ...n } = e,
      l = u.useRef(null),
      i = H(
        ht((f) => {
          l.current = f;
        }),
        t,
      ),
      o = Ut(l.current),
      a = r ?? o,
      s = ar(a),
      c = u.useContext(fe),
      d = ve(),
      v = N();
    return (
      ir(() => {
        var f;
        if (s && s.childNodes.length <= 0) {
          (f = s.parentElement) == null || f.removeChild(s);
        }
      }),
      s
        ? lt.createPortal(
            $.createElement(
              "div",
              {
                "data-headlessui-portal": "",
                ref: (f) => {
                  d.dispose();
                  if (c && f) {
                    d.add(c.register(f));
                  }
                },
              },
              v({
                ourProps: {
                  ref: i,
                },
                theirProps: n,
                slot: {},
                defaultTag: ze,
                name: "Portal",
              }),
            ),
            s,
          )
        : null
    );
  });
function ur(e, t) {
  let r = H(t),
    { enabled: n = !0, ownerDocument: l, ...i } = e,
    o = N();
  return n
    ? $.createElement(or, {
        ...i,
        ownerDocument: l,
        ref: r,
      })
    : o({
        ourProps: {
          ref: r,
        },
        theirProps: i,
        slot: {},
        defaultTag: ze,
        name: "Portal",
      });
}
let cr = u.Fragment,
  Be = u.createContext(null);
function dr(e, t) {
  let { target: r, ...n } = e,
    l = {
      ref: H(t),
    },
    i = N();
  return $.createElement(
    Be.Provider,
    {
      value: r,
    },
    i({
      ourProps: l,
      theirProps: n,
      defaultTag: cr,
      name: "Popover.Group",
    }),
  );
}
let fe = u.createContext(null);
function Dr() {
  let e = u.useContext(fe),
    t = u.useRef([]),
    r = w((i) => (t.current.push(i), e && e.register(i), () => n(i))),
    n = w((i) => {
      let o = t.current.indexOf(i);
      if (o !== -1) {
        t.current.splice(o, 1);
      }
      if (e) {
        e.unregister(i);
      }
    }),
    l = u.useMemo(
      () => ({
        register: r,
        unregister: n,
        portals: t,
      }),
      [r, n, t],
    );
  return [
    t,
    u.useMemo(
      () =>
        function ({ children: i }) {
          return $.createElement(
            fe.Provider,
            {
              value: l,
            },
            i,
          );
        },
      [l],
    ),
  ];
}
let fr = D(ur),
  pr = D(dr),
  Hr = Object.assign(fr, {
    Group: pr,
  });
function hr() {
  let e = typeof document > "u";
  return "useSyncExternalStore" in ye
    ? ((t) => t.useSyncExternalStore)(ye)(
        () => () => {},
        () => !1,
        () => !e,
      )
    : !1;
}
function qe() {
  let e = hr(),
    [t, r] = u.useState(W.isHandoffComplete);
  return (
    t && W.isHandoffComplete === !1 && r(!1),
    u.useEffect(() => {
      if (t !== !0) {
        r(!0);
      }
    }, [t]),
    u.useEffect(() => W.handoff(), []),
    e ? !1 : t
  );
}
function Xe(props) {
  var t;
  return (
    !!(
      props.enter ||
      props.enterFrom ||
      props.enterTo ||
      props.leave ||
      props.leaveFrom ||
      props.leaveTo
    ) ||
    !mt((t = props.as) != null ? t : Ke) ||
    $.Children.count(props.children) === 1
  );
}
let ee = u.createContext(null);
ee.displayName = "TransitionContext";
var vr = ((e) => ((e.Visible = "visible"), (e.Hidden = "hidden"), e))(vr || {});
function mr() {
  let e = u.useContext(ee);
  if (e === null)
    throw new Error(
      "A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.",
    );
  return e;
}
function gr() {
  let e = u.useContext(te);
  if (e === null)
    throw new Error(
      "A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.",
    );
  return e;
}
let te = u.createContext(null);
te.displayName = "NestingContext";
function re(props) {
  return "children" in props
    ? re(props.children)
    : props.current
        .filter(({ el: t }) => t.current !== null)
        .filter(({ state: t }) => t === "visible").length > 0;
}
function Ge(e, t) {
  let r = B(e),
    n = u.useRef([]),
    l = gt(),
    i = ve(),
    o = w((h, p = j.Hidden) => {
      let g = n.current.findIndex(({ el: m }) => m === h);
      if (g !== -1) {
        (he(p, {
          [j.Unmount]() {
            n.current.splice(g, 1);
          },
          [j.Hidden]() {
            n.current[g].state = "hidden";
          },
        }),
          i.microTask(() => {
            var m;
            if (!re(n) && l.current) {
              (m = r.current) == null || m.call(r);
            }
          }));
      }
    }),
    a = w((h) => {
      let p = n.current.find(({ el: g }) => g === h);
      return (
        p
          ? p.state !== "visible" && (p.state = "visible")
          : n.current.push({
              el: h,
              state: "visible",
            }),
        () => o(h, j.Unmount)
      );
    }),
    s = u.useRef([]),
    c = u.useRef(Promise.resolve()),
    d = u.useRef({
      enter: [],
      leave: [],
    }),
    v = w((h, p, g) => {
      s.current.splice(0);
      if (t) {
        t.chains.current[p] = t.chains.current[p].filter(([m]) => m !== h);
      }
      t?.chains.current[p].push([
        h,
        new Promise((m) => {
          s.current.push(m);
        }),
      ]);
      t?.chains.current[p].push([
        h,
        new Promise((m) => {
          Promise.all(d.current[p].map(([P, O]) => O)).then(() => m());
        }),
      ]);
      p === "enter"
        ? (c.current = c.current.then(() => t?.wait.current).then(() => g(p)))
        : g(p);
    }),
    f = w((h, p, g) => {
      Promise.all(d.current[p].splice(0).map(([m, P]) => P))
        .then(() => {
          var m;
          (m = s.current.shift()) == null || m();
        })
        .then(() => g(p));
    });
  return u.useMemo(
    () => ({
      children: n,
      register: a,
      unregister: o,
      onStart: v,
      onStop: f,
      wait: c,
      chains: d,
    }),
    [a, o, n, v, f, d, c],
  );
}
let Ke = u.Fragment,
  Je = vt.RenderStrategy;
function br(e, t) {
  var r, n;
  let {
      transition: l = !0,
      beforeEnter: i,
      afterEnter: o,
      beforeLeave: a,
      afterLeave: s,
      enter: c,
      enterFrom: d,
      enterTo: v,
      entered: f,
      leave: h,
      leaveFrom: p,
      leaveTo: g,
      ...m
    } = e,
    [P, O] = u.useState(null),
    b = u.useRef(null),
    x = Xe(e),
    E = H(...(x ? [b, t, O] : t === null ? [] : [t])),
    M = (r = m.unmount) == null || r ? j.Unmount : j.Hidden,
    { show: y, appear: me, initial: ge } = mr(),
    [T, ne] = u.useState(y ? "visible" : "hidden"),
    be = gr(),
    { register: q, unregister: X } = be;
  R(() => q(b), [q, b]);
  R(() => {
    if (M === j.Hidden && b.current) {
      if (y && T !== "visible") {
        ne("visible");
        return;
      }
      return he(T, {
        hidden: () => X(b),
        visible: () => q(b),
      });
    }
  }, [T, b, q, X, y, M]);
  let le = qe();
  R(() => {
    if (x && le && T === "visible" && b.current === null)
      throw new Error(
        "Did you forget to passthrough the `ref` to the actual DOM node?",
      );
  }, [b, T, le, x]);
  let Ze = ge && !me,
    $e = me && y && ge,
    ie = u.useRef(!1),
    G = Ge(() => {
      ie.current || (ne("hidden"), X(b));
    }, be),
    Ee = w((se) => {
      ie.current = !0;
      let K = se ? "enter" : "leave";
      G.onStart(b, K, (V) => {
        V === "enter" ? i?.() : V === "leave" && a?.();
      });
    }),
    we = w((se) => {
      let K = se ? "enter" : "leave";
      ie.current = !1;
      G.onStop(b, K, (V) => {
        V === "enter" ? o?.() : V === "leave" && s?.();
      });
      if (K === "leave" && !re(G)) {
        (ne("hidden"), X(b));
      }
    });
  u.useEffect(() => {
    (x && l) || (Ee(y), we(y));
  }, [y, x, l]);
  let et = !(!l || !x || !le || Ze),
    [, S] = Zt(et, P, y, {
      start: Ee,
      end: we,
    }),
    tt = bt({
      ref: E,
      className:
        ((n = $t(
          m.className,
          $e && c,
          $e && d,
          S.enter && c,
          S.enter && S.closed && d,
          S.enter && !S.closed && v,
          S.leave && h,
          S.leave && !S.closed && p,
          S.leave && S.closed && g,
          !S.transition && y && f,
        )) == null
          ? void 0
          : n.trim()) || void 0,
      ...Qt(S),
    }),
    I = 0;
  if (T === "visible") {
    I |= F.Open;
  }
  if (T === "hidden") {
    I |= F.Closed;
  }
  if (y && T === "hidden") {
    I |= F.Opening;
  }
  if (!y && T === "visible") {
    I |= F.Closing;
  }
  let rt = N();
  return $.createElement(
    te.Provider,
    {
      value: G,
    },
    $.createElement(
      lr,
      {
        value: I,
      },
      rt({
        ourProps: tt,
        theirProps: m,
        defaultTag: Ke,
        features: Je,
        visible: T === "visible",
        name: "Transition.Child",
      }),
    ),
  );
}
function $r(e, t) {
  let { show: r, appear: n = !1, unmount: l = !0, ...i } = e,
    o = u.useRef(null),
    a = Xe(e),
    s = H(...(a ? [o, t] : t === null ? [] : [t]));
  qe();
  let c = _e();
  if (
    (r === void 0 && c !== null && (r = (c & F.Open) === F.Open), r === void 0)
  )
    throw new Error(
      "A <Transition /> is used but it is missing a `show={true | false}` prop.",
    );
  let [d, v] = u.useState(r ? "visible" : "hidden"),
    f = Ge(() => {
      r || v("hidden");
    }),
    [h, p] = u.useState(!0),
    g = u.useRef([r]);
  R(() => {
    if (h !== !1 && g.current[g.current.length - 1] !== r) {
      (g.current.push(r), p(!1));
    }
  }, [g, r]);
  let m = u.useMemo(
    () => ({
      show: r,
      appear: n,
      initial: h,
    }),
    [r, n, h],
  );
  R(() => {
    r ? v("visible") : !re(f) && o.current !== null && v("hidden");
  }, [r, f]);
  let P = {
      unmount: l,
    },
    O = w(() => {
      var E;
      if (h) {
        p(!1);
      }
      (E = e.beforeEnter) == null || E.call(e);
    }),
    b = w(() => {
      var E;
      if (h) {
        p(!1);
      }
      (E = e.beforeLeave) == null || E.call(e);
    }),
    x = N();
  return $.createElement(
    te.Provider,
    {
      value: f,
    },
    $.createElement(
      ee.Provider,
      {
        value: m,
      },
      x({
        ourProps: {
          ...P,
          as: u.Fragment,
          children: $.createElement(Qe, {
            ref: s,
            ...P,
            ...i,
            beforeEnter: O,
            beforeLeave: b,
          }),
        },
        theirProps: {},
        defaultTag: u.Fragment,
        features: Je,
        visible: d === "visible",
        name: "Transition",
      }),
    ),
  );
}
function Er(e, t) {
  let r = u.useContext(ee) !== null,
    n = _e() !== null;
  return $.createElement(
    $.Fragment,
    null,
    !r && n
      ? $.createElement(pe, {
          ref: t,
          ...e,
        })
      : $.createElement(Qe, {
          ref: t,
          ...e,
        }),
  );
}
let pe = D($r),
  Qe = D(br),
  wr = D(Er),
  Nr = Object.assign(pe, {
    Child: wr,
    Root: pe,
  });
export {
  xr as H,
  Ve as I,
  Nr as K,
  Pr as M,
  Zt as N,
  wr as O,
  Ht as S,
  Tt as T,
  pr as X,
  Mt as a,
  Ar as b,
  ir as c,
  lr as d,
  _e as e,
  Lr as f,
  Qt as g,
  Dr as h,
  F as i,
  Fr as j,
  kr as k,
  qe as l,
  Wr as m,
  J as n,
  wt as o,
  Mr as p,
  jr as q,
  Vt as s,
  Hr as t,
  Ut as u,
  Cr as w,
  Lt as x,
  Rr as y,
};
