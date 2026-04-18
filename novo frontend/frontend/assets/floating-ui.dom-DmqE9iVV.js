const I = Math.min,
  R = Math.max,
  nt = Math.round,
  et = Math.floor,
  k = (t) => ({
    x: t,
    y: t,
  }),
  Nt = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom",
  },
  Vt = {
    start: "end",
    end: "start",
  };
function ut(t, e, n) {
  return R(t, I(e, n));
}
function G(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function X(t) {
  return t.split("-")[0];
}
function J(t) {
  return t.split("-")[1];
}
function St(t) {
  return t === "x" ? "y" : "x";
}
function ht(t) {
  return t === "y" ? "height" : "width";
}
const $t = new Set(["top", "bottom"]);
function $(t) {
  return $t.has(X(t)) ? "y" : "x";
}
function gt(t) {
  return St($(t));
}
function Ht(t, e, n) {
  if (n === void 0) {
    n = !1;
  }
  const o = J(t),
    i = gt(t),
    r = ht(i);
  let s =
    i === "x"
      ? o === (n ? "end" : "start")
        ? "right"
        : "left"
      : o === "start"
        ? "bottom"
        : "top";
  return (e.reference[r] > e.floating[r] && (s = ot(s)), [s, ot(s)]);
}
function _t(t) {
  const e = ot(t);
  return [dt(t), e, dt(e)];
}
function dt(t) {
  return t.replace(/start|end/g, (e) => Vt[e]);
}
const yt = ["left", "right"],
  vt = ["right", "left"],
  zt = ["top", "bottom"],
  It = ["bottom", "top"];
function Xt(t, e, n) {
  switch (t) {
    case "top":
    case "bottom":
      if (n) {
        return e ? vt : yt;
      }
      if (e) {
        return yt;
      }
      return vt;
    case "left":
    case "right":
      return e ? zt : It;
    default:
      return [];
  }
}
function jt(t, e, n, o) {
  const i = J(t);
  let r = Xt(X(t), n === "start", o);
  return (
    i &&
      ((r = r.map((item) => item + "-" + i)), e && (r = r.concat(r.map(dt)))),
    r
  );
}
function ot(t) {
  return t.replace(/left|right|bottom|top/g, (e) => Nt[e]);
}
function Yt(t) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...t,
  };
}
function Lt(t) {
  return typeof t != "number"
    ? Yt(t)
    : {
        top: t,
        right: t,
        bottom: t,
        left: t,
      };
}
function it(props) {
  const { x: e, y: n, width: o, height: i } = props;
  return {
    width: o,
    height: i,
    top: n,
    left: e,
    right: e + o,
    bottom: n + i,
    x: e,
    y: n,
  };
}
function bt(t, e, n) {
  let { reference: o, floating: i } = t;
  const r = $(e),
    s = gt(e),
    c = ht(s),
    a = X(e),
    l = r === "y",
    f = o.x + o.width / 2 - i.width / 2,
    d = o.y + o.height / 2 - i.height / 2,
    h = o[c] / 2 - i[c] / 2;
  let u;
  switch (a) {
    case "top":
      u = {
        x: f,
        y: o.y - i.height,
      };
      break;
    case "bottom":
      u = {
        x: f,
        y: o.y + o.height,
      };
      break;
    case "right":
      u = {
        x: o.x + o.width,
        y: d,
      };
      break;
    case "left":
      u = {
        x: o.x - i.width,
        y: d,
      };
      break;
    default:
      u = {
        x: o.x,
        y: o.y,
      };
  }
  switch (J(e)) {
    case "start":
      u[s] -= h * (n && l ? -1 : 1);
      break;
    case "end":
      u[s] += h * (n && l ? -1 : 1);
      break;
  }
  return u;
}
const qt = async (t, e, n) => {
  const {
      placement: o = "bottom",
      strategy: i = "absolute",
      middleware: r = [],
      platform: s,
    } = n,
    c = r.filter(Boolean),
    a = await (s.isRTL == null ? void 0 : s.isRTL(e));
  let l = await s.getElementRects({
      reference: t,
      floating: e,
      strategy: i,
    }),
    { x: f, y: d } = bt(l, o, a),
    h = o,
    u = {},
    m = 0;
  for (let g = 0; g < c.length; g++) {
    const { name: w, fn: p } = c[g],
      {
        x,
        y,
        data: b,
        reset: v,
      } = await p({
        x: f,
        y: d,
        initialPlacement: o,
        placement: h,
        strategy: i,
        middlewareData: u,
        rects: l,
        platform: s,
        elements: {
          reference: t,
          floating: e,
        },
      });
    f = x ?? f;
    d = y ?? d;
    u = {
      ...u,
      [w]: {
        ...u[w],
        ...b,
      },
    };
    if (v && m <= 50) {
      (m++,
        typeof v == "object" &&
          (v.placement && (h = v.placement),
          v.rects &&
            (l =
              v.rects === !0
                ? await s.getElementRects({
                    reference: t,
                    floating: e,
                    strategy: i,
                  })
                : v.rects),
          ({ x: f, y: d } = bt(l, h, a))),
        (g = -1));
    }
  }
  return {
    x: f,
    y: d,
    placement: h,
    strategy: i,
    middlewareData: u,
  };
};
async function st(t, e) {
  var n;
  if (e === void 0) {
    e = {};
  }
  const { x: o, y: i, platform: r, rects: s, elements: c, strategy: a } = t,
    {
      boundary: l = "clippingAncestors",
      rootBoundary: f = "viewport",
      elementContext: d = "floating",
      altBoundary: h = !1,
      padding: u = 0,
    } = G(e, t),
    m = Lt(u),
    w = c[h ? (d === "floating" ? "reference" : "floating") : d],
    p = it(
      await r.getClippingRect({
        element:
          (n = await (r.isElement == null ? void 0 : r.isElement(w))) == null ||
          n
            ? w
            : w.contextElement ||
              (await (r.getDocumentElement == null
                ? void 0
                : r.getDocumentElement(c.floating))),
        boundary: l,
        rootBoundary: f,
        strategy: a,
      }),
    ),
    x =
      d === "floating"
        ? {
            x: o,
            y: i,
            width: s.floating.width,
            height: s.floating.height,
          }
        : s.reference,
    y = await (r.getOffsetParent == null
      ? void 0
      : r.getOffsetParent(c.floating)),
    b = (await (r.isElement == null ? void 0 : r.isElement(y)))
      ? (await (r.getScale == null ? void 0 : r.getScale(y))) || {
          x: 1,
          y: 1,
        }
      : {
          x: 1,
          y: 1,
        },
    v = it(
      r.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await r.convertOffsetParentRelativeRectToViewportRelativeRect({
            elements: c,
            rect: x,
            offsetParent: y,
            strategy: a,
          })
        : x,
    );
  return {
    top: (p.top - v.top + m.top) / b.y,
    bottom: (v.bottom - p.bottom + m.bottom) / b.y,
    left: (p.left - v.left + m.left) / b.x,
    right: (v.right - p.right + m.right) / b.x,
  };
}
const Ut = (t) => ({
    name: "arrow",
    options: t,
    async fn(e) {
      const {
          x: n,
          y: o,
          placement: i,
          rects: r,
          platform: s,
          elements: c,
          middlewareData: a,
        } = e,
        { element: l, padding: f = 0 } = G(t, e) || {};
      if (l == null) return {};
      const d = Lt(f),
        h = {
          x: n,
          y: o,
        },
        u = gt(i),
        m = ht(u),
        g = await s.getDimensions(l),
        w = u === "y",
        p = w ? "top" : "left",
        x = w ? "bottom" : "right",
        y = w ? "clientHeight" : "clientWidth",
        b = r.reference[m] + r.reference[u] - h[u] - r.floating[m],
        v = h[u] - r.reference[u],
        L = await (s.getOffsetParent == null ? void 0 : s.getOffsetParent(l));
      let A = L ? L[y] : 0;
      if (!A || !(await (s.isElement == null ? void 0 : s.isElement(L)))) {
        A = c.floating[y] || r.floating[m];
      }
      const N = b / 2 - v / 2,
        F = A / 2 - g[m] / 2 - 1,
        S = I(d[p], F),
        H = I(d[x], F),
        M = S,
        _ = A - g[m] - H,
        O = A / 2 - g[m] / 2 + N,
        Y = ut(M, O, _),
        V =
          !a.arrow &&
          J(i) != null &&
          O !== Y &&
          r.reference[m] / 2 - (O < M ? S : H) - g[m] / 2 < 0,
        T = V ? (O < M ? O - M : O - _) : 0;
      return {
        [u]: h[u] + T,
        data: {
          [u]: Y,
          centerOffset: O - Y - T,
          ...(V && {
            alignmentOffset: T,
          }),
        },
        reset: V,
      };
    },
  }),
  Kt = function (t) {
    return (
      t === void 0 && (t = {}),
      {
        name: "flip",
        options: t,
        async fn(e) {
          var n, o;
          const {
              placement: i,
              middlewareData: r,
              rects: s,
              initialPlacement: c,
              platform: a,
              elements: l,
            } = e,
            {
              mainAxis: f = !0,
              crossAxis: d = !0,
              fallbackPlacements: h,
              fallbackStrategy: u = "bestFit",
              fallbackAxisSideDirection: m = "none",
              flipAlignment: g = !0,
              ...w
            } = G(t, e);
          if ((n = r.arrow) != null && n.alignmentOffset) return {};
          const p = X(i),
            x = $(c),
            y = X(c) === c,
            b = await (a.isRTL == null ? void 0 : a.isRTL(l.floating)),
            v = h || (y || !g ? [ot(c)] : _t(c)),
            L = m !== "none";
          if (!h && L) {
            v.push(...jt(c, g, m, b));
          }
          const A = [c, ...v],
            N = await st(e, w),
            F = [];
          let S = ((o = r.flip) == null ? void 0 : o.overflows) || [];
          if ((f && F.push(N[p]), d)) {
            const O = Ht(i, s, b);
            F.push(N[O[0]], N[O[1]]);
          }
          if (
            ((S = [
              ...S,
              {
                placement: i,
                overflows: F,
              },
            ]),
            !F.every((item) => item <= 0))
          ) {
            var H, M;
            const O = (((H = r.flip) == null ? void 0 : H.index) || 0) + 1,
              Y = A[O];
            if (
              Y &&
              (!(d === "alignment" ? x !== $(Y) : !1) ||
                S.every((item) =>
                  $(item.placement) === x ? item.overflows[0] > 0 : !0,
                ))
            )
              return {
                data: {
                  index: O,
                  overflows: S,
                },
                reset: {
                  placement: Y,
                },
              };
            let V =
              (M = S.filter((item) => item.overflows[0] <= 0).sort(
                (a, b) => a.overflows[1] - b.overflows[1],
              )[0]) == null
                ? void 0
                : M.placement;
            if (!V)
              switch (u) {
                case "bestFit": {
                  var _;
                  const T =
                    (_ = S.filter((item) => {
                      if (L) {
                        const z = $(item.placement);
                        return z === x || z === "y";
                      }
                      return !0;
                    })
                      .map((item) => [
                        item.placement,
                        item.overflows
                          .filter((item) => item > 0)
                          .reduce((item, acc) => item + acc, 0),
                      ])
                      .sort((a, b) => a[1] - b[1])[0]) == null
                      ? void 0
                      : _[0];
                  if (T) {
                    V = T;
                  }
                  break;
                }
                case "initialPlacement":
                  V = c;
                  break;
              }
            if (i !== V)
              return {
                reset: {
                  placement: V,
                },
              };
          }
          return {};
        },
      }
    );
  },
  Gt = new Set(["left", "top"]);
async function Jt(t, e) {
  const { placement: n, platform: o, elements: i } = t,
    r = await (o.isRTL == null ? void 0 : o.isRTL(i.floating)),
    s = X(n),
    c = J(n),
    a = $(n) === "y",
    l = Gt.has(s) ? -1 : 1,
    f = r && a ? -1 : 1,
    d = G(e, t);
  let {
    mainAxis: h,
    crossAxis: u,
    alignmentAxis: m,
  } = typeof d == "number"
    ? {
        mainAxis: d,
        crossAxis: 0,
        alignmentAxis: null,
      }
    : {
        mainAxis: d.mainAxis || 0,
        crossAxis: d.crossAxis || 0,
        alignmentAxis: d.alignmentAxis,
      };
  return (
    c && typeof m == "number" && (u = c === "end" ? m * -1 : m),
    a
      ? {
          x: u * f,
          y: h * l,
        }
      : {
          x: h * l,
          y: u * f,
        }
  );
}
const Qt = function (t) {
    return (
      t === void 0 && (t = 0),
      {
        name: "offset",
        options: t,
        async fn(e) {
          var n, o;
          const { x: i, y: r, placement: s, middlewareData: c } = e,
            a = await Jt(e, t);
          return s === ((n = c.offset) == null ? void 0 : n.placement) &&
            (o = c.arrow) != null &&
            o.alignmentOffset
            ? {}
            : {
                x: i + a.x,
                y: r + a.y,
                data: {
                  ...a,
                  placement: s,
                },
              };
        },
      }
    );
  },
  Zt = function (t) {
    return (
      t === void 0 && (t = {}),
      {
        name: "shift",
        options: t,
        async fn(e) {
          const { x: n, y: o, placement: i } = e,
            {
              mainAxis: r = !0,
              crossAxis: s = !1,
              limiter: c = {
                fn: (props) => {
                  let { x: p, y: x } = props;
                  return {
                    x: p,
                    y: x,
                  };
                },
              },
              ...a
            } = G(t, e),
            l = {
              x: n,
              y: o,
            },
            f = await st(e, a),
            d = $(X(i)),
            h = St(d);
          let u = l[h],
            m = l[d];
          if (r) {
            const w = h === "y" ? "top" : "left",
              p = h === "y" ? "bottom" : "right",
              x = u + f[w],
              y = u - f[p];
            u = ut(x, u, y);
          }
          if (s) {
            const w = d === "y" ? "top" : "left",
              p = d === "y" ? "bottom" : "right",
              x = m + f[w],
              y = m - f[p];
            m = ut(x, m, y);
          }
          const g = c.fn({
            ...e,
            [h]: u,
            [d]: m,
          });
          return {
            ...g,
            data: {
              x: g.x - n,
              y: g.y - o,
              enabled: {
                [h]: r,
                [d]: s,
              },
            },
          };
        },
      }
    );
  },
  te = function (t) {
    return (
      t === void 0 && (t = {}),
      {
        name: "size",
        options: t,
        async fn(e) {
          var n, o;
          const { placement: i, rects: r, platform: s, elements: c } = e,
            { apply: a = () => {}, ...l } = G(t, e),
            f = await st(e, l),
            d = X(i),
            h = J(i),
            u = $(i) === "y",
            { width: m, height: g } = r.floating;
          let w, p;
          d === "top" || d === "bottom"
            ? ((w = d),
              (p =
                h ===
                ((await (s.isRTL == null ? void 0 : s.isRTL(c.floating)))
                  ? "start"
                  : "end")
                  ? "left"
                  : "right"))
            : ((p = d), (w = h === "end" ? "top" : "bottom"));
          const x = g - f.top - f.bottom,
            y = m - f.left - f.right,
            b = I(g - f[w], x),
            v = I(m - f[p], y),
            L = !e.middlewareData.shift;
          let A = b,
            N = v;
          if (
            ((n = e.middlewareData.shift) != null && n.enabled.x && (N = y),
            (o = e.middlewareData.shift) != null && o.enabled.y && (A = x),
            L && !h)
          ) {
            const S = R(f.left, 0),
              H = R(f.right, 0),
              M = R(f.top, 0),
              _ = R(f.bottom, 0);
            u
              ? (N = m - 2 * (S !== 0 || H !== 0 ? S + H : R(f.left, f.right)))
              : (A = g - 2 * (M !== 0 || _ !== 0 ? M + _ : R(f.top, f.bottom)));
          }
          await a({
            ...e,
            availableWidth: N,
            availableHeight: A,
          });
          const F = await s.getDimensions(c.floating);
          return m !== F.width || g !== F.height
            ? {
                reset: {
                  rects: !0,
                },
              }
            : {};
        },
      }
    );
  };
function rt() {
  return typeof window < "u";
}
function Q(t) {
  return Tt(t) ? (t.nodeName || "").toLowerCase() : "#document";
}
function C(t) {
  var e;
  return (
    (t == null || (e = t.ownerDocument) == null ? void 0 : e.defaultView) ||
    window
  );
}
function B(t) {
  var e;
  return (e = (Tt(t) ? t.ownerDocument : t.document) || window.document) == null
    ? void 0
    : e.documentElement;
}
function Tt(t) {
  return rt() ? t instanceof Node || t instanceof C(t).Node : !1;
}
function D(t) {
  return rt() ? t instanceof Element || t instanceof C(t).Element : !1;
}
function W(t) {
  return rt() ? t instanceof HTMLElement || t instanceof C(t).HTMLElement : !1;
}
function At(t) {
  return !rt() || typeof ShadowRoot > "u"
    ? !1
    : t instanceof ShadowRoot || t instanceof C(t).ShadowRoot;
}
const ee = new Set(["inline", "contents"]);
function tt(t) {
  const { overflow: e, overflowX: n, overflowY: o, display: i } = P(t);
  return /auto|scroll|overlay|hidden|clip/.test(e + o + n) && !ee.has(i);
}
const ne = new Set(["table", "td", "th"]);
function oe(t) {
  return ne.has(Q(t));
}
const ie = [":popover-open", ":modal"];
function ct(t) {
  return ie.some((item) => {
    try {
      return t.matches(item);
    } catch {
      return !1;
    }
  });
}
const se = ["transform", "translate", "scale", "rotate", "perspective"],
  re = ["transform", "translate", "scale", "rotate", "perspective", "filter"],
  ce = ["paint", "layout", "strict", "content"];
function pt(t) {
  const e = wt(),
    n = D(t) ? P(t) : t;
  return (
    se.some((item) => (n[item] ? n[item] !== "none" : !1)) ||
    (n.containerType ? n.containerType !== "normal" : !1) ||
    (!e && (n.backdropFilter ? n.backdropFilter !== "none" : !1)) ||
    (!e && (n.filter ? n.filter !== "none" : !1)) ||
    re.some((item) => (n.willChange || "").includes(item)) ||
    ce.some((item) => (n.contain || "").includes(item))
  );
}
function le(t) {
  let e = j(t);
  for (; W(e) && !K(e); ) {
    if (pt(e)) return e;
    if (ct(e)) return null;
    e = j(e);
  }
  return null;
}
function wt() {
  return typeof CSS > "u" || !CSS.supports
    ? !1
    : CSS.supports("-webkit-backdrop-filter", "none");
}
const ae = new Set(["html", "body", "#document"]);
function K(t) {
  return ae.has(Q(t));
}
function P(t) {
  return C(t).getComputedStyle(t);
}
function lt(t) {
  return D(t)
    ? {
        scrollLeft: t.scrollLeft,
        scrollTop: t.scrollTop,
      }
    : {
        scrollLeft: t.scrollX,
        scrollTop: t.scrollY,
      };
}
function j(t) {
  if (Q(t) === "html") return t;
  const e = t.assignedSlot || t.parentNode || (At(t) && t.host) || B(t);
  return At(e) ? e.host : e;
}
function Et(t) {
  const e = j(t);
  if (K(e)) {
    return t.ownerDocument ? t.ownerDocument.body : t.body;
  }
  if (W(e) && tt(e)) {
    return e;
  }
  return Et(e);
}
function Z(t, e, n) {
  var o;
  if (e === void 0) {
    e = [];
  }
  if (n === void 0) {
    n = !0;
  }
  const i = Et(t),
    r = i === ((o = t.ownerDocument) == null ? void 0 : o.body),
    s = C(i);
  if (r) {
    const c = mt(s);
    return e.concat(
      s,
      s.visualViewport || [],
      tt(i) ? i : [],
      c && n ? Z(c) : [],
    );
  }
  return e.concat(i, Z(i, [], n));
}
function mt(t) {
  return t.parent && Object.getPrototypeOf(t.parent) ? t.frameElement : null;
}
function Dt(t) {
  const e = P(t);
  let n = parseFloat(e.width) || 0,
    o = parseFloat(e.height) || 0;
  const i = W(t),
    r = i ? t.offsetWidth : n,
    s = i ? t.offsetHeight : o,
    c = nt(n) !== r || nt(o) !== s;
  return (
    c && ((n = r), (o = s)),
    {
      width: n,
      height: o,
      $: c,
    }
  );
}
function xt(t) {
  return D(t) ? t : t.contextElement;
}
function U(t) {
  const e = xt(t);
  if (!W(e)) return k(1);
  const n = e.getBoundingClientRect(),
    { width: o, height: i, $: r } = Dt(e);
  let s = (r ? nt(n.width) : n.width) / o,
    c = (r ? nt(n.height) : n.height) / i;
  return (
    (!s || !Number.isFinite(s)) && (s = 1),
    (!c || !Number.isFinite(c)) && (c = 1),
    {
      x: s,
      y: c,
    }
  );
}
const fe = k(0);
function Pt(t) {
  const e = C(t);
  return !wt() || !e.visualViewport
    ? fe
    : {
        x: e.visualViewport.offsetLeft,
        y: e.visualViewport.offsetTop,
      };
}
function ue(t, e, n) {
  return (e === void 0 && (e = !1), !n || (e && n !== C(t)) ? !1 : e);
}
function q(t, e, n, o) {
  if (e === void 0) {
    e = !1;
  }
  if (n === void 0) {
    n = !1;
  }
  const i = t.getBoundingClientRect(),
    r = xt(t);
  let s = k(1);
  if (e) {
    o ? D(o) && (s = U(o)) : (s = U(t));
  }
  const c = ue(r, n, o) ? Pt(r) : k(0);
  let a = (i.left + c.x) / s.x,
    l = (i.top + c.y) / s.y,
    f = i.width / s.x,
    d = i.height / s.y;
  if (r) {
    const h = C(r),
      u = o && D(o) ? C(o) : o;
    let m = h,
      g = mt(m);
    for (; g && o && u !== m; ) {
      const w = U(g),
        p = g.getBoundingClientRect(),
        x = P(g),
        y = p.left + (g.clientLeft + parseFloat(x.paddingLeft)) * w.x,
        b = p.top + (g.clientTop + parseFloat(x.paddingTop)) * w.y;
      a *= w.x;
      l *= w.y;
      f *= w.x;
      d *= w.y;
      a += y;
      l += b;
      m = C(g);
      g = mt(m);
    }
  }
  return it({
    width: f,
    height: d,
    x: a,
    y: l,
  });
}
function at(t, e) {
  const n = lt(t).scrollLeft;
  return e ? e.left + n : q(B(t)).left + n;
}
function Ft(t, e) {
  const n = t.getBoundingClientRect(),
    o = n.left + e.scrollLeft - at(t, n),
    i = n.top + e.scrollTop;
  return {
    x: o,
    y: i,
  };
}
function de(props) {
  let { elements: e, rect: n, offsetParent: o, strategy: i } = props;
  const r = i === "fixed",
    s = B(o),
    c = e ? ct(e.floating) : !1;
  if (o === s || (c && r)) return n;
  let a = {
      scrollLeft: 0,
      scrollTop: 0,
    },
    l = k(1);
  const f = k(0),
    d = W(o);
  if ((d || (!d && !r)) && ((Q(o) !== "body" || tt(s)) && (a = lt(o)), W(o))) {
    const u = q(o);
    l = U(o);
    f.x = u.x + o.clientLeft;
    f.y = u.y + o.clientTop;
  }
  const h = s && !d && !r ? Ft(s, a) : k(0);
  return {
    width: n.width * l.x,
    height: n.height * l.y,
    x: n.x * l.x - a.scrollLeft * l.x + f.x + h.x,
    y: n.y * l.y - a.scrollTop * l.y + f.y + h.y,
  };
}
function me(t) {
  return Array.from(t.getClientRects());
}
function he(t) {
  const e = B(t),
    n = lt(t),
    o = t.ownerDocument.body,
    i = R(e.scrollWidth, e.clientWidth, o.scrollWidth, o.clientWidth),
    r = R(e.scrollHeight, e.clientHeight, o.scrollHeight, o.clientHeight);
  let s = -n.scrollLeft + at(t);
  const c = -n.scrollTop;
  return (
    P(o).direction === "rtl" && (s += R(e.clientWidth, o.clientWidth) - i),
    {
      width: i,
      height: r,
      x: s,
      y: c,
    }
  );
}
const Ot = 25;
function ge(t, e) {
  const n = C(t),
    o = B(t),
    i = n.visualViewport;
  let r = o.clientWidth,
    s = o.clientHeight,
    c = 0,
    a = 0;
  if (i) {
    r = i.width;
    s = i.height;
    const f = wt();
    if (!f || (f && e === "fixed")) {
      ((c = i.offsetLeft), (a = i.offsetTop));
    }
  }
  const l = at(o);
  if (l <= 0) {
    const f = o.ownerDocument,
      d = f.body,
      h = getComputedStyle(d),
      u =
        (f.compatMode === "CSS1Compat" &&
          parseFloat(h.marginLeft) + parseFloat(h.marginRight)) ||
        0,
      m = Math.abs(o.clientWidth - d.clientWidth - u);
    if (m <= Ot) {
      r -= m;
    }
  } else if (l <= Ot) {
    r += l;
  }
  return {
    width: r,
    height: s,
    x: c,
    y: a,
  };
}
const pe = new Set(["absolute", "fixed"]);
function we(t, e) {
  const n = q(t, !0, e === "fixed"),
    o = n.top + t.clientTop,
    i = n.left + t.clientLeft,
    r = W(t) ? U(t) : k(1),
    s = t.clientWidth * r.x,
    c = t.clientHeight * r.y,
    a = i * r.x,
    l = o * r.y;
  return {
    width: s,
    height: c,
    x: a,
    y: l,
  };
}
function Rt(t, e, n) {
  let o;
  if (e === "viewport") o = ge(t, n);
  else if (e === "document") o = he(B(t));
  else if (D(e)) o = we(e, n);
  else {
    const i = Pt(t);
    o = {
      x: e.x - i.x,
      y: e.y - i.y,
      width: e.width,
      height: e.height,
    };
  }
  return it(o);
}
function Mt(t, e) {
  const n = j(t);
  return n === e || !D(n) || K(n) ? !1 : P(n).position === "fixed" || Mt(n, e);
}
function xe(t, e) {
  const n = e.get(t);
  if (n) return n;
  let o = Z(t, [], !1).filter((item) => D(item) && Q(item) !== "body"),
    i = null;
  const r = P(t).position === "fixed";
  let s = r ? j(t) : t;
  for (; D(s) && !K(s); ) {
    const c = P(s),
      a = pt(s);
    if (!a && c.position === "fixed") {
      i = null;
    }
    (
      r
        ? !a && !i
        : (!a && c.position === "static" && !!i && pe.has(i.position)) ||
          (tt(s) && !a && Mt(t, s))
    )
      ? (o = o.filter((item) => item !== s))
      : (i = c);
    s = j(s);
  }
  return (e.set(t, o), o);
}
function ye(props) {
  let { element: e, boundary: n, rootBoundary: o, strategy: i } = props;
  const s = [
      ...(n === "clippingAncestors"
        ? ct(e)
          ? []
          : xe(e, this._c)
        : [].concat(n)),
      o,
    ],
    c = s[0],
    a = s.reduce(
      (item, acc) => {
        const d = Rt(e, acc, i);
        return (
          (item.top = R(d.top, item.top)),
          (item.right = I(d.right, item.right)),
          (item.bottom = I(d.bottom, item.bottom)),
          (item.left = R(d.left, item.left)),
          item
        );
      },
      Rt(e, c, i),
    );
  return {
    width: a.right - a.left,
    height: a.bottom - a.top,
    x: a.left,
    y: a.top,
  };
}
function ve(t) {
  const { width: e, height: n } = Dt(t);
  return {
    width: e,
    height: n,
  };
}
function be(t, e, n) {
  const o = W(e),
    i = B(e),
    r = n === "fixed",
    s = q(t, !0, r, e);
  let c = {
    scrollLeft: 0,
    scrollTop: 0,
  };
  const a = k(0);
  function l() {
    a.x = at(i);
  }
  if (o || (!o && !r))
    if (((Q(e) !== "body" || tt(i)) && (c = lt(e)), o)) {
      const u = q(e, !0, r, e);
      a.x = u.x + e.clientLeft;
      a.y = u.y + e.clientTop;
    } else if (i) {
      l();
    }
  if (r && !o && i) {
    l();
  }
  const f = i && !o && !r ? Ft(i, c) : k(0),
    d = s.left + c.scrollLeft - a.x - f.x,
    h = s.top + c.scrollTop - a.y - f.y;
  return {
    x: d,
    y: h,
    width: s.width,
    height: s.height,
  };
}
function ft(t) {
  return P(t).position === "static";
}
function Ct(t, e) {
  if (!W(t) || P(t).position === "fixed") return null;
  if (e) return e(t);
  let n = t.offsetParent;
  return (B(t) === n && (n = n.ownerDocument.body), n);
}
function kt(t, e) {
  const n = C(t);
  if (ct(t)) return n;
  if (!W(t)) {
    let i = j(t);
    for (; i && !K(i); ) {
      if (D(i) && !ft(i)) return i;
      i = j(i);
    }
    return n;
  }
  let o = Ct(t, e);
  for (; o && oe(o) && ft(o); ) o = Ct(o, e);
  return o && K(o) && ft(o) && !pt(o) ? n : o || le(t) || n;
}
const Ae = async function (t) {
  const e = this.getOffsetParent || kt,
    n = this.getDimensions,
    o = await n(t.floating);
  return {
    reference: be(t.reference, await e(t.floating), t.strategy),
    floating: {
      x: 0,
      y: 0,
      width: o.width,
      height: o.height,
    },
  };
};
function Oe(t) {
  return P(t).direction === "rtl";
}
const Re = {
  convertOffsetParentRelativeRectToViewportRelativeRect: de,
  getDocumentElement: B,
  getClippingRect: ye,
  getOffsetParent: kt,
  getElementRects: Ae,
  getClientRects: me,
  getDimensions: ve,
  getScale: U,
  isElement: D,
  isRTL: Oe,
};
function Wt(t, e) {
  return (
    t.x === e.x && t.y === e.y && t.width === e.width && t.height === e.height
  );
}
function Ce(t, e) {
  let n = null,
    o;
  const i = B(t);
  function r() {
    var c;
    clearTimeout(o);
    (c = n) == null || c.disconnect();
    n = null;
  }
  function s(c, a) {
    if (c === void 0) {
      c = !1;
    }
    if (a === void 0) {
      a = 1;
    }
    r();
    const l = t.getBoundingClientRect(),
      { left: f, top: d, width: h, height: u } = l;
    if ((c || e(), !h || !u)) return;
    const m = et(d),
      g = et(i.clientWidth - (f + h)),
      w = et(i.clientHeight - (d + u)),
      p = et(f),
      y = {
        rootMargin: -m + "px " + -g + "px " + -w + "px " + -p + "px",
        threshold: R(0, I(1, a)) || 1,
      };
    let b = !0;
    function v(L) {
      const A = L[0].intersectionRatio;
      if (A !== a) {
        if (!b) return s();
        A
          ? s(!1, A)
          : (o = setTimeout(() => {
              s(!1, 1e-7);
            }, 1e3));
      }
      if (A === 1 && !Wt(l, t.getBoundingClientRect())) {
        s();
      }
      b = !1;
    }
    try {
      n = new IntersectionObserver(v, {
        ...y,
        root: i.ownerDocument,
      });
    } catch {
      n = new IntersectionObserver(v, y);
    }
    n.observe(t);
  }
  return (s(!0), r);
}
function Se(t, e, n, o) {
  if (o === void 0) {
    o = {};
  }
  const {
      ancestorScroll: i = !0,
      ancestorResize: r = !0,
      elementResize: s = typeof ResizeObserver == "function",
      layoutShift: c = typeof IntersectionObserver == "function",
      animationFrame: a = !1,
    } = o,
    l = xt(t),
    f = i || r ? [...(l ? Z(l) : []), ...Z(e)] : [];
  f.forEach((item) => {
    if (i) {
      item.addEventListener("scroll", n, {
        passive: !0,
      });
    }
    if (r) {
      item.addEventListener("resize", n);
    }
  });
  const d = l && c ? Ce(l, n) : null;
  let h = -1,
    u = null;
  if (s) {
    ((u = new ResizeObserver((p) => {
      let [x] = p;
      if (x && x.target === l && u) {
        (u.unobserve(e),
          cancelAnimationFrame(h),
          (h = requestAnimationFrame(() => {
            var y;
            (y = u) == null || y.observe(e);
          })));
      }
      n();
    })),
      l && !a && u.observe(l),
      u.observe(e));
  }
  let m,
    g = a ? q(t) : null;
  if (a) {
    w();
  }
  function w() {
    const p = q(t);
    if (g && !Wt(g, p)) {
      n();
    }
    g = p;
    m = requestAnimationFrame(w);
  }
  return (
    n(),
    () => {
      var p;
      f.forEach((item) => {
        if (i) {
          item.removeEventListener("scroll", n);
        }
        if (r) {
          item.removeEventListener("resize", n);
        }
      });
      d?.();
      (p = u) == null || p.disconnect();
      u = null;
      if (a) {
        cancelAnimationFrame(m);
      }
    }
  );
}
const Le = st,
  Te = Qt,
  Ee = Zt,
  De = Kt,
  Pe = te,
  Fe = Ut,
  Me = (t, e, n) => {
    const o = new Map(),
      i = {
        platform: Re,
        ...n,
      },
      r = {
        ...i.platform,
        _c: o,
      };
    return qt(t, e, {
      ...i,
      platform: r,
    });
  };
export {
  Se as a,
  Fe as b,
  Me as c,
  Pe as d,
  G as e,
  De as f,
  Le as g,
  I as h,
  D as i,
  R as m,
  Te as o,
  nt as r,
  Ee as s,
};
