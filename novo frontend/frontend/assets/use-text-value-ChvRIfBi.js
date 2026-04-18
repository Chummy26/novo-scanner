import { a as s } from "./index-Bx06KCE-.js";
import { s as m } from "./floating-CA5b9ljT.js";
import {
  o as c,
  O as $,
  i as w,
  b as x,
  f as y,
} from "./use-is-mounted-D7iMJT5-.js";
import { n as v } from "./transition-Cxix63ts.js";
var k = ((e) => ((e[(e.Left = 0)] = "Left"), (e[(e.Right = 2)] = "Right"), e))(
  k || {},
);
function B(e) {
  let n = s.useRef(null),
    r = c((event) => {
      n.current = event.pointerType;
      if (
        !m(event.currentTarget) &&
        event.pointerType === "mouse" &&
        event.button === k.Left
      ) {
        (event.preventDefault(), e(event));
      }
    }),
    l = c((event) => {
      if (n.current !== "mouse") {
        m(event.currentTarget) || e(event);
      }
    });
  return {
    onPointerDown: r,
    onClick: l,
  };
}
var R = ((e) => (
  (e[(e.Ignore = 0)] = "Ignore"),
  (e[(e.Select = 1)] = "Select"),
  (e[(e.Close = 2)] = "Close"),
  e
))(R || {});
const P = {
    Ignore: {
      kind: 0,
    },
    Select: (e) => ({
      kind: 1,
      target: e,
    }),
    Close: {
      kind: 2,
    },
  },
  T = 200,
  b = 5;
function j(e, { trigger: n, action: r, close: l, select: u }) {
  let t = s.useRef(null),
    o = s.useRef(null),
    a = s.useRef(null);
  v(e && n !== null, "pointerdown", (event) => {
    if ($(event?.target) && n != null && n.contains(event.target)) {
      ((o.current = event.x),
        (a.current = event.y),
        (t.current = event.timeStamp));
    }
  });
  v(
    e && n !== null,
    "pointerup",
    (event) => {
      var f, d;
      let g = t.current;
      if (
        g === null ||
        ((t.current = null), !w(event.target)) ||
        (Math.abs(event.x - ((f = o.current) != null ? f : event.x)) < b &&
          Math.abs(event.y - ((d = a.current) != null ? d : event.y)) < b)
      )
        return;
      let p = r(event);
      switch (p.kind) {
        case 0:
          return;
        case 1: {
          if (event.timeStamp - g > T) {
            (u(p.target), l());
          }
          break;
        }
        case 2: {
          l();
          break;
        }
      }
    },
    {
      capture: !0,
    },
  );
}
function h(e) {
  return [e.screenX, e.screenY];
}
function z() {
  let e = s.useRef([-1, -1]);
  return {
    wasMoved(n) {
      let r = h(n);
      return e.current[0] === r[0] && e.current[1] === r[1]
        ? !1
        : ((e.current = r), !0);
    },
    update(n) {
      e.current = h(n);
    },
  };
}
function C(e) {
  throw new Error("Unexpected object: " + e);
}
var I = ((e) => (
  (e[(e.First = 0)] = "First"),
  (e[(e.Previous = 1)] = "Previous"),
  (e[(e.Next = 2)] = "Next"),
  (e[(e.Last = 3)] = "Last"),
  (e[(e.Specific = 4)] = "Specific"),
  (e[(e.Nothing = 5)] = "Nothing"),
  e
))(I || {});
function O(e, n) {
  let r = n.resolveItems();
  if (r.length <= 0) return null;
  let l = n.resolveActiveIndex(),
    u = l ?? -1;
  switch (e.focus) {
    case 0: {
      for (let t = 0; t < r.length; ++t)
        if (!n.resolveDisabled(r[t], t, r)) return t;
      return l;
    }
    case 1: {
      if (u === -1) {
        u = r.length;
      }
      for (let t = u - 1; t >= 0; --t)
        if (!n.resolveDisabled(r[t], t, r)) return t;
      return l;
    }
    case 2: {
      for (let t = u + 1; t < r.length; ++t)
        if (!n.resolveDisabled(r[t], t, r)) return t;
      return l;
    }
    case 3: {
      for (let t = r.length - 1; t >= 0; --t)
        if (!n.resolveDisabled(r[t], t, r)) return t;
      return l;
    }
    case 4: {
      for (let t = 0; t < r.length; ++t)
        if (n.resolveId(r[t], t, r) === e.id) return t;
      return l;
    }
    case 5:
      return null;
    default:
      C(e);
  }
}
const q = {
  Idle: {
    kind: "Idle",
  },
  Tracked: (e) => ({
    kind: "Tracked",
    position: e,
  }),
  Moved: {
    kind: "Moved",
  },
};
function L(e) {
  let n = e.getBoundingClientRect();
  return `${n.x},${n.y}`;
}
function H(e, n, r) {
  let l = x();
  if (n.kind === "Tracked") {
    let u = function () {
        if (t !== L(e)) {
          (l.dispose(), r());
        }
      },
      { position: t } = n,
      o = new ResizeObserver(u);
    o.observe(e);
    l.add(() => o.disconnect());
    l.addEventListener(window, "scroll", u, {
      passive: !0,
    });
    l.addEventListener(window, "resize", u);
  }
  return () => l.dispose();
}
let D =
  /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
function F(e) {
  var n, r;
  let l = (n = e.innerText) != null ? n : "",
    u = e.cloneNode(!0);
  if (!y(u)) return l;
  let t = !1;
  for (let a of u.querySelectorAll('[hidden],[aria-hidden],[role="img"]')) {
    a.remove();
    t = !0;
  }
  let o = t ? ((r = u.innerText) != null ? r : "") : l;
  return (D.test(o) && (o = o.replace(D, "")), o);
}
function S(e) {
  let n = e.getAttribute("aria-label");
  if (typeof n == "string") return n.trim();
  let r = e.getAttribute("aria-labelledby");
  if (r) {
    let l = r
      .split(" ")
      .map((item) => {
        let t = document.getElementById(item);
        if (t) {
          let o = t.getAttribute("aria-label");
          return typeof o == "string" ? o.trim() : F(t).trim();
        }
        return null;
      })
      .filter(Boolean);
    if (l.length > 0) return l.join(", ");
  }
  return F(e).trim();
}
function U(e) {
  let n = s.useRef(""),
    r = s.useRef("");
  return c(() => {
    let l = e.current;
    if (!l) return "";
    let u = l.innerText;
    if (n.current === u) return r.current;
    let t = S(l).trim().toLowerCase();
    return ((n.current = u), (r.current = t), t);
  });
}
export {
  j as L,
  P as S,
  I as a,
  L as b,
  q as c,
  B as d,
  O as f,
  H as p,
  U as s,
  z as u,
};
