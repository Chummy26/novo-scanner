import {
  a as p,
  c as _r,
  j as s,
  v as Y,
  e as z,
  w as re,
  x as Vr,
  y as Hr,
  z as Wr,
  A as Kr,
  C as lr,
  g as qr,
  R as Gr,
  h as Jr,
  J as Xr,
  n as $e,
  I as se,
  B as Z,
  D as Qr,
  q as Zr,
} from "./index-Bx06KCE-.js";
import {
  f as cr,
  c as Yr,
  u as Pt,
  P as en,
  g as tn,
  a as Ot,
} from "./PaginationSection-uLCLiG5r.js";
import { t as X } from "./index-mwGaaYkF.js";
import { P as rn } from "./Page-hVEPjFz_.js";
import {
  a as nn,
  F as sn,
  s as an,
  b as on,
  H as ln,
  D as cn,
  d as dn,
  e as dr,
} from "./useExchangePiP-DV_Gxb4B.js";
import { f as un } from "./coinsApi-BPsBZGFa.js";
import {
  F as mn,
  d as te,
  M as hn,
  S as Ft,
  a as fn,
  P as ur,
  g as be,
  l as Tt,
  b as pn,
  s as gn,
} from "./userPreferences-DJ2q-do7.js";
import { F as xn, D as yn } from "./discord-BL8Te9RE.js";
import { F as mr } from "./FunnelIcon-D3v6sT5b.js";
import { T as bn, v as hr, D as fr, L as pr } from "./index-C5vO_a11.js";
import { b as At, n as Se } from "./exchange-BNVQP8m4.js";
import { F as zt } from "./ArrowTopRightOnSquareIcon-dBVxg5nU.js";
import { F as Sn } from "./CurrencyDollarIcon-DU3HPuAk.js";
import { F as kn } from "./EyeIcon-CCF3MwDA.js";
import { F as qe } from "./XMarkIcon-mqVC0SZA.js";
import { c as gr } from "./discordLink-BQxtRaU4.js";
import { F as xr } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { a as Dt, F as vn } from "./TrashIcon-DZPNpgRn.js";
import { F as Bt } from "./CheckIcon-WReR5saH.js";
import { K as wn, O as $t } from "./transition-Cxix63ts.js";
import { h as Nn, z as jn, Q as En } from "./dialog-DOjFQwF9.js";
import "./react-apexcharts.esm-B8DZI7x8.js";
import "./SearchableSelect-9vRGJJts.js";
import "./ArrowPathIcon-Ek2z4Juv.js";
import "./tabs-Cdkz3LDK.js";
import "./use-resolve-button-type-DwKZeOeP.js";
import "./use-is-mounted-D7iMJT5-.js";
import "./iconBase-BPc6woXW.js";
import "./floating-CA5b9ljT.js";
import "./floating-ui.dom-DmqE9iVV.js";
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll("[data-book-ts]").forEach((el) => {
    const ts = Number(el.dataset.bookTs);
    if (!ts) return;
    const age = Math.round((now - ts) / 1000);
    el.textContent = age + "s";
    const cls =
      age > 10
        ? "text-red-400 font-mono text-[10px]"
        : "text-emerald-400 font-mono text-[10px]";
    if (el.className !== cls) el.className = cls;
  });
}, 1000);

function In({ title: e, titleId: a, ...t }, r) {
  return p.createElement(
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
        ref: r,
        "aria-labelledby": a,
      },
      t,
    ),
    e
      ? p.createElement(
          "title",
          {
            id: a,
          },
          e,
        )
      : null,
    p.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M9.143 17.082a24.248 24.248 0 0 0 3.844.148m-3.844-.148a23.856 23.856 0 0 1-5.455-1.31 8.964 8.964 0 0 0 2.3-5.542m3.155 6.852a3 3 0 0 0 5.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 0 0 3.536-1.003A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53",
    }),
  );
}
const Cn = p.forwardRef(In);

function ce(e, a, t) {
  let r = t.initialDeps ?? [],
    n,
    l = !0;

  function c() {
    var d, m, u;
    let o;
    t.key && (d = t.debug) != null && d.call(t) && (o = Date.now());
    const f = e();
    if (!(f.length !== r.length || f.some((S, g) => r[g] !== S))) return n;
    r = f;
    let x;
    if (
      (t.key && (m = t.debug) != null && m.call(t) && (x = Date.now()),
      (n = a(...f)),
      t.key && (u = t.debug) != null && u.call(t))
    ) {
      const S = Math.round((Date.now() - o) * 100) / 100,
        g = Math.round((Date.now() - x) * 100) / 100,
        y = g / 16,
        N = (C, O) => {
          for (C = String(C); C.length < O; ) C = " " + C;
          return C;
        };
      console.info(
        `%c⏱ ${N(g, 5)} /${N(S, 5)} ms`,
        `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * y, 120))}deg 100% 31%);`,
        t?.key,
      );
    }
    return (
      t?.onChange && !(l && t.skipInitialOnChange) && t.onChange(n),
      (l = !1),
      n
    );
  }
  return (
    (c.updateDeps = (d) => {
      r = d;
    }),
    c
  );
}

function Ut(e, a) {
  if (e === void 0) throw new Error("Unexpected undefined");
  return e;
}
const Rn = (e, a) => Math.abs(e - a) < 1.01,
  Mn = (e, a, t) => {
    let r;
    return function (...n) {
      (e.clearTimeout(r), (r = e.setTimeout(() => a.apply(this, n), t)));
    };
  },
  Lt = (e) => {
    const { offsetWidth: a, offsetHeight: t } = e;
    return {
      width: a,
      height: t,
    };
  },
  Pn = (e) => e,
  On = (e) => {
    const a = Math.max(e.startIndex - e.overscan, 0),
      t = Math.min(e.endIndex + e.overscan, e.count - 1),
      r = [];
    for (let n = a; n <= t; n++) r.push(n);
    return r;
  },
  Fn = (e, a) => {
    const t = e.scrollElement;
    if (!t) return;
    const r = e.targetWindow;
    if (!r) return;
    const n = (c) => {
      const { width: d, height: m } = c;
      a({
        width: Math.round(d),
        height: Math.round(m),
      });
    };
    if ((n(Lt(t)), !r.ResizeObserver)) return () => {};
    const l = new r.ResizeObserver((c) => {
      const d = () => {
        const m = c[0];
        if (m?.borderBoxSize) {
          const u = m.borderBoxSize[0];
          if (u) {
            n({
              width: u.inlineSize,
              height: u.blockSize,
            });
            return;
          }
        }
        n(Lt(t));
      };
      e.options.useAnimationFrameWithResizeObserver
        ? requestAnimationFrame(d)
        : d();
    });
    return (
      l.observe(t, {
        box: "border-box",
      }),
      () => {
        l.unobserve(t);
      }
    );
  },
  _t = {
    passive: !0,
  },
  Vt = typeof window > "u" ? !0 : "onscrollend" in window,
  Tn = (e, a) => {
    const t = e.scrollElement;
    if (!t) return;
    const r = e.targetWindow;
    if (!r) return;
    let n = 0;
    const l =
        e.options.useScrollendEvent && Vt
          ? () => {}
          : Mn(
              r,
              () => {
                a(n, !1);
              },
              e.options.isScrollingResetDelay,
            ),
      c = (o) => () => {
        const { horizontal: f, isRtl: h } = e.options;
        ((n = f ? t.scrollLeft * ((h && -1) || 1) : t.scrollTop), l(), a(n, o));
      },
      d = c(!0),
      m = c(!1);
    t.addEventListener("scroll", d, _t);
    const u = e.options.useScrollendEvent && Vt;
    return (
      u && t.addEventListener("scrollend", m, _t),
      () => {
        (t.removeEventListener("scroll", d),
          u && t.removeEventListener("scrollend", m));
      }
    );
  },
  An = (e, a, t) => {
    if (a?.borderBoxSize) {
      const r = a.borderBoxSize[0];
      if (r)
        return Math.round(r[t.options.horizontal ? "inlineSize" : "blockSize"]);
    }
    return e[t.options.horizontal ? "offsetWidth" : "offsetHeight"];
  },
  zn = (e, { adjustments: a = 0, behavior: t }, r) => {
    var n, l;
    const c = e + a;
    (l = (n = r.scrollElement) == null ? void 0 : n.scrollTo) == null ||
      l.call(n, {
        [r.options.horizontal ? "left" : "top"]: c,
        behavior: t,
      });
  };
class Dn {
  constructor(a) {
    ((this.unsubs = []),
      (this.scrollElement = null),
      (this.targetWindow = null),
      (this.isScrolling = !1),
      (this.currentScrollToIndex = null),
      (this.measurementsCache = []),
      (this.itemSizeCache = new Map()),
      (this.laneAssignments = new Map()),
      (this.pendingMeasuredCacheIndexes = []),
      (this.prevLanes = void 0),
      (this.lanesChangedFlag = !1),
      (this.lanesSettling = !1),
      (this.scrollRect = null),
      (this.scrollOffset = null),
      (this.scrollDirection = null),
      (this.scrollAdjustments = 0),
      (this.elementsCache = new Map()),
      (this.observer = (() => {
        let t = null;
        const r = () =>
          t ||
          (!this.targetWindow || !this.targetWindow.ResizeObserver
            ? null
            : (t = new this.targetWindow.ResizeObserver((n) => {
                n.forEach((l) => {
                  const c = () => {
                    this._measureElement(l.target, l);
                  };
                  this.options.useAnimationFrameWithResizeObserver
                    ? requestAnimationFrame(c)
                    : c();
                });
              })));
        return {
          disconnect: () => {
            var n;
            ((n = r()) == null || n.disconnect(), (t = null));
          },
          observe: (n) => {
            var l;
            return (l = r()) == null
              ? void 0
              : l.observe(n, {
                  box: "border-box",
                });
          },
          unobserve: (n) => {
            var l;
            return (l = r()) == null ? void 0 : l.unobserve(n);
          },
        };
      })()),
      (this.range = null),
      (this.setOptions = (t) => {
        (Object.entries(t).forEach(([r, n]) => {
          typeof n > "u" && delete t[r];
        }),
          (this.options = {
            debug: !1,
            initialOffset: 0,
            overscan: 1,
            paddingStart: 0,
            paddingEnd: 0,
            scrollPaddingStart: 0,
            scrollPaddingEnd: 0,
            horizontal: !1,
            getItemKey: Pn,
            rangeExtractor: On,
            onChange: () => {},
            measureElement: An,
            initialRect: {
              width: 0,
              height: 0,
            },
            scrollMargin: 0,
            gap: 0,
            indexAttribute: "data-index",
            initialMeasurementsCache: [],
            lanes: 1,
            isScrollingResetDelay: 150,
            enabled: !0,
            isRtl: !1,
            useScrollendEvent: !1,
            useAnimationFrameWithResizeObserver: !1,
            ...t,
          }));
      }),
      (this.notify = (t) => {
        var r, n;
        (n = (r = this.options).onChange) == null || n.call(r, this, t);
      }),
      (this.maybeNotify = ce(
        () => (
          this.calculateRange(),
          [
            this.isScrolling,
            this.range ? this.range.startIndex : null,
            this.range ? this.range.endIndex : null,
          ]
        ),
        (t) => {
          this.notify(t);
        },
        {
          key: !1,
          debug: () => this.options.debug,
          initialDeps: [
            this.isScrolling,
            this.range ? this.range.startIndex : null,
            this.range ? this.range.endIndex : null,
          ],
        },
      )),
      (this.cleanup = () => {
        (this.unsubs.filter(Boolean).forEach((t) => t()),
          (this.unsubs = []),
          this.observer.disconnect(),
          (this.scrollElement = null),
          (this.targetWindow = null));
      }),
      (this._didMount = () => () => {
        this.cleanup();
      }),
      (this._willUpdate = () => {
        var t;
        const r = this.options.enabled ? this.options.getScrollElement() : null;
        if (this.scrollElement !== r) {
          if ((this.cleanup(), !r)) {
            this.maybeNotify();
            return;
          }
          ((this.scrollElement = r),
            this.scrollElement && "ownerDocument" in this.scrollElement
              ? (this.targetWindow =
                  this.scrollElement.ownerDocument.defaultView)
              : (this.targetWindow =
                  ((t = this.scrollElement) == null ? void 0 : t.window) ??
                  null),
            this.elementsCache.forEach((n) => {
              this.observer.observe(n);
            }),
            this.unsubs.push(
              this.options.observeElementRect(this, (n) => {
                ((this.scrollRect = n), this.maybeNotify());
              }),
            ),
            this.unsubs.push(
              this.options.observeElementOffset(this, (n, l) => {
                ((this.scrollAdjustments = 0),
                  (this.scrollDirection = l
                    ? this.getScrollOffset() < n
                      ? "forward"
                      : "backward"
                    : null),
                  (this.scrollOffset = n),
                  (this.isScrolling = l),
                  this.maybeNotify());
              }),
            ),
            this._scrollToOffset(this.getScrollOffset(), {
              adjustments: void 0,
              behavior: void 0,
            }));
        }
      }),
      (this.getSize = () =>
        this.options.enabled
          ? ((this.scrollRect = this.scrollRect ?? this.options.initialRect),
            this.scrollRect[this.options.horizontal ? "width" : "height"])
          : ((this.scrollRect = null), 0)),
      (this.getScrollOffset = () =>
        this.options.enabled
          ? ((this.scrollOffset =
              this.scrollOffset ??
              (typeof this.options.initialOffset == "function"
                ? this.options.initialOffset()
                : this.options.initialOffset)),
            this.scrollOffset)
          : ((this.scrollOffset = null), 0)),
      (this.getFurthestMeasurement = (t, r) => {
        const n = new Map(),
          l = new Map();
        for (let c = r - 1; c >= 0; c--) {
          const d = t[c];
          if (n.has(d.lane)) continue;
          const m = l.get(d.lane);
          if (
            (m == null || d.end > m.end
              ? l.set(d.lane, d)
              : d.end < m.end && n.set(d.lane, !0),
            n.size === this.options.lanes)
          )
            break;
        }
        return l.size === this.options.lanes
          ? Array.from(l.values()).sort((c, d) =>
              c.end === d.end ? c.index - d.index : c.end - d.end,
            )[0]
          : void 0;
      }),
      (this.getMeasurementOptions = ce(
        () => [
          this.options.count,
          this.options.paddingStart,
          this.options.scrollMargin,
          this.options.getItemKey,
          this.options.enabled,
          this.options.lanes,
        ],
        (t, r, n, l, c, d) => (
          this.prevLanes !== void 0 &&
            this.prevLanes !== d &&
            (this.lanesChangedFlag = !0),
          (this.prevLanes = d),
          (this.pendingMeasuredCacheIndexes = []),
          {
            count: t,
            paddingStart: r,
            scrollMargin: n,
            getItemKey: l,
            enabled: c,
            lanes: d,
          }
        ),
        {
          key: !1,
          skipInitialOnChange: !0,
          onChange: () => {
            this.notify(this.isScrolling);
          },
        },
      )),
      (this.getMeasurements = ce(
        () => [this.getMeasurementOptions(), this.itemSizeCache],
        (
          {
            count: t,
            paddingStart: r,
            scrollMargin: n,
            getItemKey: l,
            enabled: c,
            lanes: d,
          },
          m,
        ) => {
          if (!c)
            return (
              (this.measurementsCache = []),
              this.itemSizeCache.clear(),
              this.laneAssignments.clear(),
              []
            );
          if (this.laneAssignments.size > t)
            for (const h of this.laneAssignments.keys())
              h >= t && this.laneAssignments.delete(h);
          (this.lanesChangedFlag &&
            ((this.lanesChangedFlag = !1),
            (this.lanesSettling = !0),
            (this.measurementsCache = []),
            this.itemSizeCache.clear(),
            this.laneAssignments.clear(),
            (this.pendingMeasuredCacheIndexes = [])),
            this.measurementsCache.length === 0 &&
              !this.lanesSettling &&
              ((this.measurementsCache = this.options.initialMeasurementsCache),
              this.measurementsCache.forEach((h) => {
                this.itemSizeCache.set(h.key, h.size);
              })));
          const u = this.lanesSettling
            ? 0
            : this.pendingMeasuredCacheIndexes.length > 0
              ? Math.min(...this.pendingMeasuredCacheIndexes)
              : 0;
          ((this.pendingMeasuredCacheIndexes = []),
            this.lanesSettling &&
              this.measurementsCache.length === t &&
              (this.lanesSettling = !1));
          const o = this.measurementsCache.slice(0, u),
            f = new Array(d).fill(void 0);
          for (let h = 0; h < u; h++) {
            const x = o[h];
            x && (f[x.lane] = h);
          }
          for (let h = u; h < t; h++) {
            const x = l(h),
              S = this.laneAssignments.get(h);
            let g, y;
            if (S !== void 0 && this.options.lanes > 1) {
              g = S;
              const R = f[g],
                I = R !== void 0 ? o[R] : void 0;
              y = I ? I.end + this.options.gap : r + n;
            } else {
              const R =
                this.options.lanes === 1
                  ? o[h - 1]
                  : this.getFurthestMeasurement(o, h);
              ((y = R ? R.end + this.options.gap : r + n),
                (g = R ? R.lane : h % this.options.lanes),
                this.options.lanes > 1 && this.laneAssignments.set(h, g));
            }
            const N = m.get(x),
              C = typeof N == "number" ? N : this.options.estimateSize(h),
              O = y + C;
            ((o[h] = {
              index: h,
              start: y,
              size: C,
              end: O,
              key: x,
              lane: g,
            }),
              (f[g] = h));
          }
          return ((this.measurementsCache = o), o);
        },
        {
          key: !1,
          debug: () => this.options.debug,
        },
      )),
      (this.calculateRange = ce(
        () => [
          this.getMeasurements(),
          this.getSize(),
          this.getScrollOffset(),
          this.options.lanes,
        ],
        (t, r, n, l) =>
          (this.range =
            t.length > 0 && r > 0
              ? Bn({
                  measurements: t,
                  outerSize: r,
                  scrollOffset: n,
                  lanes: l,
                })
              : null),
        {
          key: !1,
          debug: () => this.options.debug,
        },
      )),
      (this.getVirtualIndexes = ce(
        () => {
          let t = null,
            r = null;
          const n = this.calculateRange();
          return (
            n && ((t = n.startIndex), (r = n.endIndex)),
            this.maybeNotify.updateDeps([this.isScrolling, t, r]),
            [
              this.options.rangeExtractor,
              this.options.overscan,
              this.options.count,
              t,
              r,
            ]
          );
        },
        (t, r, n, l, c) =>
          l === null || c === null
            ? []
            : t({
                startIndex: l,
                endIndex: c,
                overscan: r,
                count: n,
              }),
        {
          key: !1,
          debug: () => this.options.debug,
        },
      )),
      (this.indexFromElement = (t) => {
        const r = this.options.indexAttribute,
          n = t.getAttribute(r);
        return n
          ? parseInt(n, 10)
          : (console.warn(
              `Missing attribute name '${r}={index}' on measured element.`,
            ),
            -1);
      }),
      (this._measureElement = (t, r) => {
        const n = this.indexFromElement(t),
          l = this.measurementsCache[n];
        if (!l) return;
        const c = l.key,
          d = this.elementsCache.get(c);
        (d !== t &&
          (d && this.observer.unobserve(d),
          this.observer.observe(t),
          this.elementsCache.set(c, t)),
          t.isConnected &&
            this.resizeItem(n, this.options.measureElement(t, r, this)));
      }),
      (this.resizeItem = (t, r) => {
        const n = this.measurementsCache[t];
        if (!n) return;
        const l = this.itemSizeCache.get(n.key) ?? n.size,
          c = r - l;
        c !== 0 &&
          ((this.shouldAdjustScrollPositionOnItemSizeChange !== void 0
            ? this.shouldAdjustScrollPositionOnItemSizeChange(n, c, this)
            : n.start < this.getScrollOffset() + this.scrollAdjustments) &&
            this._scrollToOffset(this.getScrollOffset(), {
              adjustments: (this.scrollAdjustments += c),
              behavior: void 0,
            }),
          this.pendingMeasuredCacheIndexes.push(n.index),
          (this.itemSizeCache = new Map(this.itemSizeCache.set(n.key, r))),
          this.notify(!1));
      }),
      (this.measureElement = (t) => {
        if (!t) {
          this.elementsCache.forEach((r, n) => {
            r.isConnected ||
              (this.observer.unobserve(r), this.elementsCache.delete(n));
          });
          return;
        }
        this._measureElement(t, void 0);
      }),
      (this.getVirtualItems = ce(
        () => [this.getVirtualIndexes(), this.getMeasurements()],
        (t, r) => {
          const n = [];
          for (let l = 0, c = t.length; l < c; l++) {
            const d = t[l],
              m = r[d];
            n.push(m);
          }
          return n;
        },
        {
          key: !1,
          debug: () => this.options.debug,
        },
      )),
      (this.getVirtualItemForOffset = (t) => {
        const r = this.getMeasurements();
        if (r.length !== 0)
          return Ut(r[yr(0, r.length - 1, (n) => Ut(r[n]).start, t)]);
      }),
      (this.getMaxScrollOffset = () => {
        if (!this.scrollElement) return 0;
        if ("scrollHeight" in this.scrollElement)
          return this.options.horizontal
            ? this.scrollElement.scrollWidth - this.scrollElement.clientWidth
            : this.scrollElement.scrollHeight - this.scrollElement.clientHeight;
        {
          const t = this.scrollElement.document.documentElement;
          return this.options.horizontal
            ? t.scrollWidth - this.scrollElement.innerWidth
            : t.scrollHeight - this.scrollElement.innerHeight;
        }
      }),
      (this.getOffsetForAlignment = (t, r, n = 0) => {
        if (!this.scrollElement) return 0;
        const l = this.getSize(),
          c = this.getScrollOffset();
        (r === "auto" && (r = t >= c + l ? "end" : "start"),
          r === "center" ? (t += (n - l) / 2) : r === "end" && (t -= l));
        const d = this.getMaxScrollOffset();
        return Math.max(Math.min(d, t), 0);
      }),
      (this.getOffsetForIndex = (t, r = "auto") => {
        t = Math.max(0, Math.min(t, this.options.count - 1));
        const n = this.measurementsCache[t];
        if (!n) return;
        const l = this.getSize(),
          c = this.getScrollOffset();
        if (r === "auto")
          if (n.end >= c + l - this.options.scrollPaddingEnd) r = "end";
          else if (n.start <= c + this.options.scrollPaddingStart) r = "start";
          else return [c, "start"];
        if (r === "end" && t === this.options.count - 1)
          return [this.getMaxScrollOffset(), r];
        const d =
          r === "end"
            ? n.end + this.options.scrollPaddingEnd
            : n.start - this.options.scrollPaddingStart;
        return [this.getOffsetForAlignment(d, r, n.size), r];
      }),
      (this.isDynamicMode = () => this.elementsCache.size > 0),
      (this.scrollToOffset = (t, { align: r = "start", behavior: n } = {}) => {
        (n === "smooth" &&
          this.isDynamicMode() &&
          console.warn(
            "The `smooth` scroll behavior is not fully supported with dynamic size.",
          ),
          this._scrollToOffset(this.getOffsetForAlignment(t, r), {
            adjustments: void 0,
            behavior: n,
          }));
      }),
      (this.scrollToIndex = (t, { align: r = "auto", behavior: n } = {}) => {
        (n === "smooth" &&
          this.isDynamicMode() &&
          console.warn(
            "The `smooth` scroll behavior is not fully supported with dynamic size.",
          ),
          (t = Math.max(0, Math.min(t, this.options.count - 1))),
          (this.currentScrollToIndex = t));
        let l = 0;
        const c = 10,
          d = (u) => {
            if (!this.targetWindow) return;
            const o = this.getOffsetForIndex(t, u);
            if (!o) {
              console.warn("Failed to get offset for index:", t);
              return;
            }
            const [f, h] = o;
            (this._scrollToOffset(f, {
              adjustments: void 0,
              behavior: n,
            }),
              this.targetWindow.requestAnimationFrame(() => {
                const x = () => {
                  if (this.currentScrollToIndex !== t) return;
                  const S = this.getScrollOffset(),
                    g = this.getOffsetForIndex(t, h);
                  if (!g) {
                    console.warn("Failed to get offset for index:", t);
                    return;
                  }
                  Rn(g[0], S) || m(h);
                };
                this.isDynamicMode()
                  ? this.targetWindow.requestAnimationFrame(x)
                  : x();
              }));
          },
          m = (u) => {
            this.targetWindow &&
              this.currentScrollToIndex === t &&
              (l++,
              l < c
                ? this.targetWindow.requestAnimationFrame(() => d(u))
                : console.warn(
                    `Failed to scroll to index ${t} after ${c} attempts.`,
                  ));
          };
        d(r);
      }),
      (this.scrollBy = (t, { behavior: r } = {}) => {
        (r === "smooth" &&
          this.isDynamicMode() &&
          console.warn(
            "The `smooth` scroll behavior is not fully supported with dynamic size.",
          ),
          this._scrollToOffset(this.getScrollOffset() + t, {
            adjustments: void 0,
            behavior: r,
          }));
      }),
      (this.getTotalSize = () => {
        var t;
        const r = this.getMeasurements();
        let n;
        if (r.length === 0) n = this.options.paddingStart;
        else if (this.options.lanes === 1)
          n = ((t = r[r.length - 1]) == null ? void 0 : t.end) ?? 0;
        else {
          const l = Array(this.options.lanes).fill(null);
          let c = r.length - 1;
          for (; c >= 0 && l.some((d) => d === null); ) {
            const d = r[c];
            (l[d.lane] === null && (l[d.lane] = d.end), c--);
          }
          n = Math.max(...l.filter((d) => d !== null));
        }
        return Math.max(
          n - this.options.scrollMargin + this.options.paddingEnd,
          0,
        );
      }),
      (this._scrollToOffset = (t, { adjustments: r, behavior: n }) => {
        this.options.scrollToFn(
          t,
          {
            behavior: n,
            adjustments: r,
          },
          this,
        );
      }),
      (this.measure = () => {
        ((this.itemSizeCache = new Map()),
          (this.laneAssignments = new Map()),
          this.notify(!1));
      }),
      this.setOptions(a));
  }
}
const yr = (e, a, t, r) => {
  for (; e <= a; ) {
    const n = ((e + a) / 2) | 0,
      l = t(n);
    if (l < r) e = n + 1;
    else if (l > r) a = n - 1;
    else return n;
  }
  return e > 0 ? e - 1 : 0;
};

function Bn({ measurements: e, outerSize: a, scrollOffset: t, lanes: r }) {
  const n = e.length - 1,
    l = (m) => e[m].start;
  if (e.length <= r)
    return {
      startIndex: 0,
      endIndex: n,
    };
  let c = yr(0, n, l, t),
    d = c;
  if (r === 1) for (; d < n && e[d].end < t + a; ) d++;
  else if (r > 1) {
    const m = Array(r).fill(0);
    for (; d < n && m.some((o) => o < t + a); ) {
      const o = e[d];
      ((m[o.lane] = o.end), d++);
    }
    const u = Array(r).fill(t + a);
    for (; c >= 0 && u.some((o) => o >= t); ) {
      const o = e[c];
      ((u[o.lane] = o.start), c--);
    }
    ((c = Math.max(0, c - (c % r))), (d = Math.min(n, d + (r - 1 - (d % r)))));
  }
  return {
    startIndex: c,
    endIndex: d,
  };
}
const Ht = typeof document < "u" ? p.useLayoutEffect : p.useEffect;

function $n({ useFlushSync: e = !0, ...a }) {
  const t = p.useReducer(() => ({}), {})[1],
    r = {
      ...a,
      onChange: (l, c) => {
        var d;
        (e && c ? _r.flushSync(t) : t(),
          (d = a.onChange) == null || d.call(a, l, c));
      },
    },
    [n] = p.useState(() => new Dn(r));
  return (
    n.setOptions(r),
    Ht(() => n._didMount(), []),
    Ht(() => n._willUpdate()),
    n
  );
}

function br(e) {
  return $n({
    observeElementRect: Fn,
    observeElementOffset: Tn,
    scrollToFn: zn,
    ...e,
  });
}

function Un({ title: e, titleId: a, ...t }, r) {
  return p.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: r,
        "aria-labelledby": a,
      },
      t,
    ),
    e
      ? p.createElement(
          "title",
          {
            id: a,
          },
          e,
        )
      : null,
    p.createElement("path", {
      fillRule: "evenodd",
      d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM9 8.25a.75.75 0 0 0-.75.75v6c0 .414.336.75.75.75h.75a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75H9Zm5.25 0a.75.75 0 0 0-.75.75v6c0 .414.336.75.75.75H15a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75h-.75Z",
      clipRule: "evenodd",
    }),
  );
}
const Ln = p.forwardRef(Un);

function _n({ title: e, titleId: a, ...t }, r) {
  return p.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: r,
        "aria-labelledby": a,
      },
      t,
    ),
    e
      ? p.createElement(
          "title",
          {
            id: a,
          },
          e,
        )
      : null,
    p.createElement("path", {
      fillRule: "evenodd",
      d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.113A1.125 1.125 0 0 1 9 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113Z",
      clipRule: "evenodd",
    }),
  );
}
const Vn = p.forwardRef(_n),
  Wt = (e) => Symbol.iterator in e,
  Kt = (e) => "entries" in e,
  qt = (e, a) => {
    const t = e instanceof Map ? e : new Map(e.entries()),
      r = a instanceof Map ? a : new Map(a.entries());
    if (t.size !== r.size) return !1;
    for (const [n, l] of t) if (!r.has(n) || !Object.is(l, r.get(n))) return !1;
    return !0;
  },
  Hn = (e, a) => {
    const t = e[Symbol.iterator](),
      r = a[Symbol.iterator]();
    let n = t.next(),
      l = r.next();
    for (; !n.done && !l.done; ) {
      if (!Object.is(n.value, l.value)) return !1;
      ((n = t.next()), (l = r.next()));
    }
    return !!n.done && !!l.done;
  };

function Gt(e, a) {
  return Object.is(e, a)
    ? !0
    : typeof e != "object" ||
        e === null ||
        typeof a != "object" ||
        a === null ||
        Object.getPrototypeOf(e) !== Object.getPrototypeOf(a)
      ? !1
      : Wt(e) && Wt(a)
        ? Kt(e) && Kt(a)
          ? qt(e, a)
          : Hn(e, a)
        : qt(
            {
              entries: () => Object.entries(e),
            },
            {
              entries: () => Object.entries(a),
            },
          );
}
const Wn = ({ row: e, className: a, style: t, onDoubleClick: r }) =>
    s.jsx(
      Y,
      {
        className: z(
          a,
          (e.original.alertProfitHit || e.original.alertTelegramHit) &&
            "ring-2 ring-amber-400/60 bg-amber-50/50 dark:ring-amber-500/60 dark:bg-amber-900/10",
          r,
        ),
        style: t,
        "data-row-id": e.id,
        onDoubleClick: r,
        children: e.getVisibleCells().map((n) =>
          s.jsx(
            re,
            {
              className: "px-4 py-4",
              children: cr(n.column.columnDef.cell, n.getContext()),
            },
            n.id,
          ),
        ),
      },
      e.id,
    ),
  Ge = p.memo(
    Wn,
    (e, a) =>
      e.row.id === a.row.id &&
      e.row.original === a.row.original &&
      e.className === a.className &&
      e.style?.height === a.style?.height,
  );
Ge.displayName = "SignalRow";

function Jt({
  rows: e,
  rowHeight: a,
  parentRef: t,
  columnsLength: r,
  renderRow: n,
}) {
  const l = p.useRef(null),
    c = () => {
      const f = t.current,
        h = l.current;
      if (!f || !h) return f?.scrollTop ?? 0;
      const x = f.getBoundingClientRect().top,
        S = h.getBoundingClientRect().top;
      return Math.max(x - S, 0);
    },
    d = br({
      count: e.length,
      getScrollElement: () => t.current,
      estimateSize: () => a,
      overscan: 8,
      observeElementOffset: (f, h) => {
        const x = t.current;
        if (!x) return;
        const S = (N) => {
            h(c(), N);
          },
          g = () => S(!0);
        x.addEventListener("scroll", g, {
          passive: !0,
        });
        let y = null;
        return (
          typeof ResizeObserver < "u" &&
            ((y = new ResizeObserver(() => S(!1))),
            y.observe(x),
            l.current && y.observe(l.current)),
          S(!1),
          () => {
            (x.removeEventListener("scroll", g), y?.disconnect());
          }
        );
      },
    }),
    m = d.getVirtualItems(),
    u = m.length > 0 ? m[0].start : 0,
    o = m.length > 0 ? d.getTotalSize() - m[m.length - 1].end : 0;
  return s.jsxs(s.Fragment, {
    children: [
      s.jsx(Y, {
        ref: l,
        "aria-hidden": !0,
        className: "pointer-events-none h-0 border-0",
        children: s.jsx(re, {
          colSpan: r,
          className: "p-0",
          style: {
            height: 0,
          },
        }),
      }),
      u > 0 &&
        s.jsx(Y, {
          "aria-hidden": !0,
          className: "pointer-events-none",
          children: s.jsx(re, {
            colSpan: r,
            style: {
              height: u,
            },
          }),
        }),
      m.map((f) => {
        const h = e[f.index];
        return h
          ? n(h, {
              height: f.size,
            })
          : null;
      }),
      o > 0 &&
        s.jsx(Y, {
          "aria-hidden": !0,
          className: "pointer-events-none",
          children: s.jsx(re, {
            colSpan: r,
            style: {
              height: o,
            },
          }),
        }),
    ],
  });
}
const Kn = ({ state: e }) =>
    e === "asc"
      ? s.jsx("span", {
          className: "text-gray-400",
          children: "↑",
        })
      : e === "desc"
        ? s.jsx("span", {
            className: "text-gray-400",
            children: "↓",
          })
        : null,
  qn = ({
    mainTable: e,
    pinnedTable: a,
    columnsLength: t,
    isLoading: r,
    rowHeight: n = 72,
    onRowDoubleClick: l,
  }) => {
    const c = p.useRef(null),
      d = p.useRef(0),
      m = a.getRowModel().rows,
      u = e.getRowModel().rows,
      o = m[0]?.id ?? "none",
      f = u[0]?.id ?? "none",
      h = () => {
        c.current && (d.current = c.current.scrollTop);
      };
    p.useEffect(() => {
      const S = c.current;
      if (!S) return;
      const g = Math.max(0, S.scrollHeight - S.clientHeight),
        y = Math.min(d.current, g);
      S.scrollTop !== y && (S.scrollTop = y);
    }, [o, f, m.length, u.length]);
    const x = (S) =>
      S.getHeaderGroups().map((g) =>
        s.jsx(
          Y,
          {
            className: "border-b border-gray-200 dark:border-dark-700",
            children: g.headers.map((y) =>
              s.jsx(
                Kr,
                {
                  className: z(
                    "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider",
                    y.column.getCanSort() &&
                      "cursor-pointer select-none hover:text-gray-700 dark:hover:text-dark-300",
                    !y.column.columnDef.header && "w-[120px]",
                  ),
                  onClick: y.column.getToggleSortingHandler(),
                  children:
                    y.column.columnDef.header &&
                    s.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [
                        cr(y.column.columnDef.header, y.getContext()),
                        s.jsx(Kn, {
                          state: y.column.getIsSorted(),
                        }),
                      ],
                    }),
                },
                y.id,
              ),
            ),
          },
          g.id,
        ),
      );
    return s.jsx("div", {
      className:
        "overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700",
      children: s.jsx("div", {
        ref: c,
        className: "overflow-x-auto overflow-y-auto max-h-[70vh]",
        onScroll: h,
        children: s.jsxs(Vr, {
          className: "w-full",
          children: [
            s.jsx(Hr, {
              children: x(e),
            }),
            s.jsx(Wr, {
              children: r
                ? Array.from({
                    length: 6,
                  }).map((S, g) =>
                    s.jsx(
                      Y,
                      {
                        className:
                          "border-b border-gray-200 dark:border-dark-700",
                        children: Array.from({
                          length: t,
                        }).map((y, N) =>
                          s.jsx(
                            re,
                            {
                              className: "px-4 py-4",
                              children: s.jsx("div", {
                                className:
                                  "h-4 w-full max-w-[180px] animate-pulse rounded bg-gray-200 dark:bg-dark-700",
                              }),
                            },
                            N,
                          ),
                        ),
                      },
                      `skeleton-${g}`,
                    ),
                  )
                : u.length === 0 && m.length === 0
                  ? s.jsx(Y, {
                      children: s.jsx(re, {
                        colSpan: t,
                        className: "text-center py-12",
                        children: s.jsxs("div", {
                          className: "flex flex-col items-center gap-3",
                          children: [
                            s.jsx("div", {
                              className:
                                "size-12 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center",
                              children: s.jsx(mr, {
                                className:
                                  "size-6 text-gray-400 dark:text-dark-400",
                              }),
                            }),
                            s.jsx("p", {
                              className:
                                "text-sm text-gray-500 dark:text-dark-400",
                              children: "Nenhuma oportunidade encontrada",
                            }),
                          ],
                        }),
                      }),
                    })
                  : s.jsxs(s.Fragment, {
                      children: [
                        m.length > 0 &&
                          s.jsxs(s.Fragment, {
                            children: [
                              s.jsx(Y, {
                                children: s.jsx(re, {
                                  colSpan: t,
                                  className:
                                    "bg-primary-50/80 dark:bg-primary-900/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-100 border-b border-primary-100 dark:border-primary-900/40",
                                  children: "Sinais fixados",
                                }),
                              }),
                              s.jsx(Jt, {
                                rows: m,
                                parentRef: c,
                                rowHeight: n,
                                columnsLength: t,
                                renderRow: (S, g) =>
                                  s.jsx(
                                    Ge,
                                    {
                                      row: S,
                                      style: g,
                                      onDoubleClick: () => l?.(S.original),
                                      className:
                                        "border-b border-primary-100 dark:border-primary-900/30 hover:bg-primary-50/70 dark:hover:bg-primary-900/15 transition-colors",
                                    },
                                    S.id,
                                  ),
                              }),
                            ],
                          }),
                        m.length > 0 &&
                          u.length > 0 &&
                          s.jsx(Y, {
                            children: s.jsx(re, {
                              colSpan: t,
                              className:
                                "bg-white/60 dark:bg-dark-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400 border-y border-gray-200 dark:border-dark-700",
                              children: "Outras oportunidades",
                            }),
                          }),
                        u.length > 0 &&
                          s.jsx(Jt, {
                            rows: u,
                            parentRef: c,
                            rowHeight: n,
                            columnsLength: t,
                            renderRow: (S, g) =>
                              s.jsx(
                                Ge,
                                {
                                  row: S,
                                  style: g,
                                  onDoubleClick: () => l?.(S.original),
                                  className:
                                    "border-b border-gray-200 dark:border-dark-700 hover:bg-gray-50/50 dark:hover:bg-dark-800/50 transition-colors",
                                },
                                S.id,
                              ),
                          }),
                      ],
                    }),
            }),
          ],
        }),
      }),
    });
  },
  Gn = {
    binance: "Binance",
    bybit: "Bybit",
    "gate.io": "Gate.io",
    gate: "Gate.io",
    gateio: "Gate.io",
    mexc: "MEXC",
    kucoin: "Kucoin",
    bitget: "Bitget",
    htx: "HTX",
    okx: "OKX",
    bingx: "BingX",
    xt: "XT",
  },
  we = (e) => {
    if (!e) return null;
    const a = Date.parse(e);
    return Number.isNaN(a) ? null : a;
  },
  fe = (e) => {
    if (!e) return "-";
    const a = e.toLowerCase();
    return Gn[a] ?? e;
  },
  opQuote = (e) =>
    (
      e.current ||
      (typeof e.coin == "string" && e.coin.includes("/")
        ? e.coin.split("/")[1]
        : "") ||
      "USDT"
    )
      .toString()
      .trim()
      .toUpperCase() || "USDT",
  opKey = (e) => {
    const a = (
        e.symbol ||
        e.coinName ||
        e.code ||
        (typeof e.coin == "string" ? e.coin.split("/")[0] : "") ||
        "-"
      )
        .toString()
        .trim()
        .toUpperCase() || "-",
      t = opQuote(e),
      r = ne(e.buyFrom || e.buyExchange || ""),
      n = ne(e.sellTo || e.sellExchange || ""),
      l = A(e.buyType || e.buyMarket),
      c = A(e.sellType || e.sellMarket);
    return `${a}-${t}-${r}-${l}-${n}-${c}`;
  },
  marketAliasKey = (e) => {
    const a = (
        e.symbol ||
        e.coinName ||
        e.code ||
        (typeof e.coin == "string" ? e.coin.split("/")[0] : "") ||
        "-"
      )
        .toString()
        .trim()
        .toUpperCase() || "-",
      t = ne(e.buyFrom || e.buyExchange || ""),
      r = ne(e.sellTo || e.sellExchange || ""),
      n = A(e.buyType || e.buyMarket),
      l = A(e.sellType || e.sellMarket);
    return `${a}-${t}-${n}-${r}-${l}`;
  },
  legacyOpKey = (e) => {
    const a = (
      e.symbol ||
      e.coinName ||
      e.code ||
      (typeof e.coin == "string" ? e.coin.split("/")[0] : "") ||
      "-"
    )
      .toString()
      .trim()
      .toUpperCase() || "-";
    return `${a}-${ne(e.buyFrom || e.buyExchange || "")}-${ne(e.sellTo || e.sellExchange || "")}`;
  },
  hasStoredAlias = (e, a) =>
    [e.pinKey, ...(Array.isArray(e.pinAliases) ? e.pinAliases : [])].some((t) =>
      a.has(t),
    ),
  Jn = (e) => e.id || opKey(e),
  Je = (e) => {
    const a = (e || "").toUpperCase();
    return a.includes("FUTURE") || a.includes("FUTURO") ? "FUTURO" : "SPOT";
  },
  A = (e) => (Je(e) === "FUTURO" ? "future" : "spot"),
  ne = (e) => {
    const a = (e || "").toLowerCase();
    return a === "gate.io" || a === "gateio" ? "gate" : a;
  },
  Sr = (e) => {
    if (e.pair) return e.pair;
    const a = e.coinName || e.symbol || e.coin || "" || "",
      t =
        e.current ||
        (e.coin && e.coin.includes("/") ? e.coin.split("/")[1] : "") ||
        "USDT",
      r = a.trim().toUpperCase();
    if (!r) return "";
    const n = r.includes("/") ? r : `${r}/${t.toUpperCase()}`,
      l = ne(e.buyExchange || e.buyFrom),
      c = ne(e.sellExchange || e.sellTo),
      d = A(e.buyMarket || e.buyType),
      m = A(e.sellMarket || e.sellType);
    return `${n}|buy:${l}-${d}|sell:${c}-${m}`;
  },
  Xn = (e, a) =>
    typeof e == "number" &&
    typeof a == "number" &&
    Number.isFinite(e) &&
    Number.isFinite(a) &&
    e > 0
      ? ((a - e) / e) * 100
      : null,
  Qn = (e, a) => {
    const t = we(a?.timestamp) ?? Date.now(),
      r =
        Array.isArray(a?.buyExchange?.asks) && a.buyExchange.asks.length > 0
          ? Number(a.buyExchange.asks[0][0])
          : null,
      n =
        Array.isArray(a?.sellExchange?.bids) && a.sellExchange.bids.length > 0
          ? Number(a.sellExchange.bids[0][0])
          : null,
      l = {
        ...e,
        lastSeen: t,
        buyPrice: r !== null && Number.isFinite(r) ? r : e.buyPrice,
        sellPrice: n !== null && Number.isFinite(n) ? n : e.sellPrice,
      },
      c = Xn(l.buyPrice, l.sellPrice);
    c !== null && (l.result = c);
    const d =
        Array.isArray(a?.buyExchange?.bids) && a.buyExchange.bids.length > 0
          ? Number(a.buyExchange.bids[0][0])
          : null,
      m =
        Array.isArray(a?.sellExchange?.asks) && a.sellExchange.asks.length > 0
          ? Number(a.sellExchange.asks[0][0])
          : null;
    if (d && m && d > 0) {
      const u = (m / d - 1) * -1 * 100;
      l.exitSpread = u;
    }
    return l;
  },
  Zn = (e, a) => {
    const t = Je(e),
      r = Je(a);
    return t === "SPOT" && r === "SPOT"
      ? "SPOT"
      : t === "FUTURO" && r === "FUTURO"
        ? "FUTURO-FUTURO"
        : "SPOT-FUTURO";
  },
  Yn = (e, a) => {
    if (!e) return null;
    const t = Jn(e),
      r = Array.from(
        new Set(
          [
            t,
            opKey(e),
            marketAliasKey(e),
            e.id,
            e.code,
            e.pinKey,
            ...(Array.isArray(e.pinAliases) ? e.pinAliases : []),
            legacyOpKey(e),
          ].filter(Boolean),
        ),
      ),
      n = e.symbol || e.code || "-",
      l = e.current || "USDT",
      c =
        typeof e?.histCruzamento == "object" &&
        e?.histCruzamento !== null &&
        typeof e.histCruzamento.inverted_count == "number"
          ? e.histCruzamento.inverted_count
          : 0,
      d =
        typeof e.buyVol24 == "number" && !Number.isNaN(e.buyVol24)
          ? e.buyVol24
          : 0,
      m =
        typeof e.sellVol24 == "number" && !Number.isNaN(e.sellVol24)
          ? e.sellVol24
          : 0,
      u = Math.min(d || 0, m || 0) || d || m || 0,
      o = we(e.timestamp) ?? we(e.updatedAt) ?? a ?? Date.now(),
      f =
        typeof e.entrySpread == "number" && Number.isFinite(e.entrySpread)
          ? e.entrySpread
          : 0,
      h =
        typeof e.exitSpread == "number" && Number.isFinite(e.exitSpread)
          ? e.exitSpread
          : null;
    return {
      id: t,
      coin: `${n}/${l}`,
      coinName: n,
      buyExchange: fe(e.buyFrom),
      buyPrice:
        typeof e.buyPrice == "number" && Number.isFinite(e.buyPrice)
          ? e.buyPrice
          : 0,
      buyVolume: d,
      sellExchange: fe(e.sellTo),
      sellPrice:
        typeof e.sellPrice == "number" && Number.isFinite(e.sellPrice)
          ? e.sellPrice
          : 0,
      sellVolume: m,
      fundingRate:
        typeof e.sellFundingRate == "number"
          ? e.sellFundingRate
          : typeof e.buyFundingRate == "number"
            ? e.buyFundingRate
            : void 0,
      buyFundingRate:
        typeof e.buyFundingRate == "number" ? e.buyFundingRate : void 0,
      sellFundingRate:
        typeof e.sellFundingRate == "number" ? e.sellFundingRate : void 0,
      maxVolume: void 0,
      result: f,
      history: [],
      lastSeen: o,
      alertProfitHit: !1,
      alertTelegramHit: !1,
      muteAlert: !1,
      volume: u,
      opportunityType: Zn(e.buyType, e.sellType),
      isInverted: c > 0 || (h !== null ? h < 0 : !1),
      invertedCount: c,
      invertedCounts:
        typeof e?.histCruzamento == "object" &&
        e?.histCruzamento !== null &&
        typeof e.histCruzamento.inverted_counts == "object" &&
        e.histCruzamento.inverted_counts !== null
          ? e.histCruzamento.inverted_counts
          : void 0,
      isBlacklisted: !1,
      pinKey: t,
      pinAliases: r,
      pair: Sr({
        coinName: n,
        current: l,
        buyExchange: fe(e.buyFrom),
        sellExchange: fe(e.sellTo),
        buyMarket: A(e.buyType),
        sellMarket: A(e.sellType),
      }),
      buyMarket: A(e.buyType),
      sellMarket: A(e.sellType),
      exitSpread: h,
      buyBookTs:
        typeof e.buyBookAge == "number"
          ? Date.now() - e.buyBookAge * 1000
          : void 0,
      sellBookTs:
        typeof e.sellBookAge == "number"
          ? Date.now() - e.sellBookAge * 1000
          : void 0,
      buyWithdrawOk:
        typeof e.buyWithdrawOk == "boolean" ? e.buyWithdrawOk : void 0,
      sellWithdrawOk:
        typeof e.sellWithdrawOk == "boolean" ? e.sellWithdrawOk : void 0,
      buyDepositOk:
        typeof e.buyDepositOk == "boolean" ? e.buyDepositOk : void 0,
      sellDepositOk:
        typeof e.sellDepositOk == "boolean" ? e.sellDepositOk : void 0,
    };
  },
  Xe = (e, a) => {
    const t =
      typeof a == "number" && !Number.isNaN(a)
        ? a
        : (we(e?.timestamp) ?? Date.now());
    return (
      Array.isArray(e?.data)
        ? e.data
        : e?.data
          ? [e.data]
          : e?.type === "opportunity"
            ? [e]
            : []
    )
      .map((n) => Yn(n, t))
      .filter((n) => !!n && n.opportunityType !== "SPOT");
  },
  Ue = (e) =>
    e >= 1e6
      ? `$${(e / 1e6).toFixed(1)}M`
      : e >= 1e3
        ? `$${(e / 1e3).toFixed(1)}K`
        : `$${e.toFixed(2)}`,
  Ne = (e) => (e < 1e-4 ? e.toFixed(8) : e < 1 ? e.toFixed(6) : e.toFixed(2)),
  ae = Yr(),
  Le = (e) => `${e > 0 ? "+" : ""}${e.toFixed(3)}%`,
  es = ({
    onTogglePin: e,
    onRemove: a,
    onToggleNotify: t,
    onOpenExchanges: r,
    onOpenHistory: n,
    onShareDiscord: l,
    onSaveToMonitoring: c,
    sharingSignalId: d,
    savingSignalId: m,
  }) => [
    ae.display({
      id: "opportunity",
      header: "OPORTUNIDADE",
      cell: (u) => {
        const o = u.row.original,
          f = o.opportunityType.split("-");
        return s.jsxs("div", {
          className: "flex flex-col gap-0.5",
          children: [
            s.jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                s.jsx("div", {
                  className:
                    "font-bold text-base text-gray-900 dark:text-white",
                  children: o.coinName,
                }),
                o.isPinned &&
                  s.jsx("span", {
                    className:
                      "rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    children: "Fixado",
                  }),
              ],
            }),
            s.jsx("div", {
              className:
                "text-xs text-gray-500 dark:text-dark-400 font-medium uppercase",
              children: f.join(" - "),
            }),
          ],
        });
      },
    }),
    ae.display({
      id: "buy",
      header: "COMPRA",
      cell: (u) => {
        const o = u.row.original,
          f = At(o.coinName || o.coin, o.buyExchange, o.buyMarket || "spot");
        return s.jsxs("div", {
          className: "flex flex-col gap-1",
          children: [
            s.jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                f
                  ? s.jsxs("a", {
                      href: f,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className:
                        "inline-flex items-center gap-1 font-semibold text-sm text-blue-600 dark:text-white hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors",
                      title: `Abrir ${o.buyExchange} (${o.buyMarket || "spot"})`,
                      onClick: (h) => h.stopPropagation(),
                      children: [
                        o.buyExchange,
                        s.jsx(zt, {
                          className: "size-3",
                        }),
                      ],
                    })
                  : s.jsx("span", {
                      className:
                        "font-semibold text-sm text-gray-900 dark:text-white",
                      children: o.buyExchange,
                    }),
                s.jsx("span", {
                  className:
                    "text-sm text-gray-700 dark:text-dark-300 font-mono",
                  children: Ne(o.buyPrice),
                }),
              ],
            }),
            s.jsxs("div", {
              className:
                "flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400 flex-wrap",
              children: [
                s.jsxs("span", {
                  children: ["VOL: ", Ue(o.buyVolume)],
                }),
                o.buyBookTs !== void 0 &&
                  s.jsx("span", {
                    "data-book-ts": o.buyBookTs,
                    className:
                      (Date.now() - o.buyBookTs) / 1000 > 10
                        ? "text-red-400 font-mono text-[10px]"
                        : "text-emerald-400 font-mono text-[10px]",
                    children:
                      Math.round((Date.now() - o.buyBookTs) / 1000) + "s",
                  }),
                o.buyFundingRate !== void 0 &&
                  s.jsxs("span", {
                    children: ["FR: ", Le(o.buyFundingRate * 100)],
                  }),
                (o.buyDepositOk !== void 0 || o.buyWithdrawOk !== void 0) &&
                  s.jsxs("span", {
                    className: "inline-flex items-center gap-1",
                    children: [
                      s.jsx("span", {
                        className:
                          "size-1.5 rounded-full " +
                          (o.buyDepositOk === !0
                            ? "bg-emerald-500"
                            : o.buyDepositOk === !1
                              ? "bg-red-500"
                              : "bg-gray-400"),
                        title:
                          o.buyDepositOk === !0
                            ? "Deposito ativo"
                            : o.buyDepositOk === !1
                              ? "Deposito desativado"
                              : "Deposito desconhecido",
                      }),
                      s.jsx("span", {
                        className:
                          "text-[9px] text-gray-400 dark:text-dark-500",
                        children: "D",
                      }),
                      s.jsx("span", {
                        className:
                          "size-1.5 rounded-full " +
                          (o.buyWithdrawOk === !0
                            ? "bg-emerald-500"
                            : o.buyWithdrawOk === !1
                              ? "bg-red-500"
                              : "bg-gray-400"),
                        title:
                          o.buyWithdrawOk === !0
                            ? "Saque ativo"
                            : o.buyWithdrawOk === !1
                              ? "Saque desativado"
                              : "Saque desconhecido",
                      }),
                      s.jsx("span", {
                        className:
                          "text-[9px] text-gray-400 dark:text-dark-500",
                        children: "S",
                      }),
                    ],
                  }),
              ],
            }),
          ],
        });
      },
    }),
    ae.display({
      id: "sell",
      header: "VENDA",
      cell: (u) => {
        const o = u.row.original,
          f = At(o.coinName || o.coin, o.sellExchange, o.sellMarket || "spot");
        return s.jsxs("div", {
          className: "flex flex-col gap-1",
          children: [
            s.jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                f
                  ? s.jsxs("a", {
                      href: f,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className:
                        "inline-flex items-center gap-1 font-semibold text-sm text-blue-600 dark:text-white hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors",
                      title: `Abrir ${o.sellExchange} (${o.sellMarket || "spot"})`,
                      onClick: (h) => h.stopPropagation(),
                      children: [
                        o.sellExchange,
                        s.jsx(zt, {
                          className: "size-3",
                        }),
                      ],
                    })
                  : s.jsx("span", {
                      className:
                        "font-semibold text-sm text-gray-900 dark:text-white",
                      children: o.sellExchange,
                    }),
                s.jsx("span", {
                  className:
                    "text-sm text-gray-700 dark:text-dark-300 font-mono",
                  children: Ne(o.sellPrice),
                }),
              ],
            }),
            s.jsxs("div", {
              className:
                "flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400 flex-wrap",
              children: [
                s.jsxs("span", {
                  children: ["VOL: ", Ue(o.sellVolume)],
                }),
                o.sellBookTs !== void 0 &&
                  s.jsx("span", {
                    "data-book-ts": o.sellBookTs,
                    className:
                      (Date.now() - o.sellBookTs) / 1000 > 10
                        ? "text-red-400 font-mono text-[10px]"
                        : "text-emerald-400 font-mono text-[10px]",
                    children:
                      Math.round((Date.now() - o.sellBookTs) / 1000) + "s",
                  }),
                o.sellFundingRate !== void 0 &&
                  s.jsxs("span", {
                    children: ["FR: ", Le(o.sellFundingRate * 100)],
                  }),
                (o.sellDepositOk !== void 0 || o.sellWithdrawOk !== void 0) &&
                  s.jsxs("span", {
                    className: "inline-flex items-center gap-1",
                    children: [
                      s.jsx("span", {
                        className:
                          "size-1.5 rounded-full " +
                          (o.sellDepositOk === !0
                            ? "bg-emerald-500"
                            : o.sellDepositOk === !1
                              ? "bg-red-500"
                              : "bg-gray-400"),
                        title:
                          o.sellDepositOk === !0
                            ? "Deposito ativo"
                            : o.sellDepositOk === !1
                              ? "Deposito desativado"
                              : "Deposito desconhecido",
                      }),
                      s.jsx("span", {
                        className:
                          "text-[9px] text-gray-400 dark:text-dark-500",
                        children: "D",
                      }),
                      s.jsx("span", {
                        className:
                          "size-1.5 rounded-full " +
                          (o.sellWithdrawOk === !0
                            ? "bg-emerald-500"
                            : o.sellWithdrawOk === !1
                              ? "bg-red-500"
                              : "bg-gray-400"),
                        title:
                          o.sellWithdrawOk === !0
                            ? "Saque ativo"
                            : o.sellWithdrawOk === !1
                              ? "Saque desativado"
                              : "Saque desconhecido",
                      }),
                      s.jsx("span", {
                        className:
                          "text-[9px] text-gray-400 dark:text-dark-500",
                        children: "S",
                      }),
                    ],
                  }),
                o.maxVolume !== void 0 &&
                  s.jsxs("span", {
                    children: ["MAX: ", Ue(o.maxVolume)],
                  }),
              ],
            }),
          ],
        });
      },
    }),
    ae.accessor("result", {
      header: "SPREAD",
      cell: (u) => {
        const o = u.row.original,
          f = u.getValue(),
          h = f > 0,
          x = o.buyFundingRate ?? 0,
          g = (o.sellFundingRate ?? 0) - x,
          y = o.buyFundingRate !== void 0 || o.sellFundingRate !== void 0;
        return s.jsxs("div", {
          className: "flex flex-col items-start gap-1",
          children: [
            s.jsxs("span", {
              className: z(
                "font-bold text-lg",
                h
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              ),
              children: [h ? "+" : "", f.toFixed(2), "%"],
            }),
            y &&
              s.jsxs("span", {
                className:
                  "flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400",
                children: [
                  s.jsx(Sn, {
                    className: "size-3",
                  }),
                  Le(g * 100),
                ],
              }),
          ],
        });
      },
    }),
    ae.accessor("exitSpread", {
      header: "SPREAD SAÍDA",
      cell: (u) => {
        const o = u.getValue();
        if (o == null) return "-";
        const f = o > 0;
        return s.jsx("div", {
          className: "flex flex-col items-start gap-1",
          children: s.jsxs("span", {
            className: z(
              "font-bold text-lg",
              f
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            ),
            children: [f ? "+" : "", o.toFixed(2), "%"],
          }),
        });
      },
    }),
    ae.accessor("invertedCount", {
      id: "inverted",
      header: "INVERTIDAS",
      cell: (u) => {
        const o = u.row.original,
          f = globalThis.__TEAMOP_INV_WIN || "4h",
          h = o.invertedCounts?.[f] ?? u.getValue();
        return s.jsxs("div", {
          className: "text-sm font-medium text-gray-700 dark:text-dark-300",
          children: [h, " invertidas (", f, ")"],
        });
      },
    }),
    ae.display({
      id: "actions",
      header: "",
      cell: (u) => {
        const o = u.row.original,
          f = !!o.isPinned,
          h = !!o.muteAlert,
          x = d === o.pinKey,
          S = m === o.pinKey;
        return s.jsxs("div", {
          className: "flex items-center gap-2.5",
          children: [
            s.jsx("button", {
              onClick: () => c(o),
              className: z(
                "p-1.5 rounded-md border transition-colors",
                S
                  ? "border-gray-300 dark:border-dark-600 text-gray-400 opacity-60 cursor-not-allowed"
                  : "border-gray-300 dark:border-dark-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-600 dark:text-dark-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-800",
              ),
              title: "Salvar no Monitoramento",
              disabled: S,
              children: s.jsx(kn, {
                className: "size-3.5",
              }),
            }),
            s.jsx("button", {
              onClick: () => t(o),
              className: z(
                "p-1.5 rounded-md border transition-colors",
                h
                  ? "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  : "border-gray-300 dark:border-dark-600 hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-dark-200 hover:border-gray-400 dark:hover:border-dark-500",
              ),
              title: h
                ? "Notificações desativadas para este sinal"
                : "Silenciar sinal",
              children: s.jsx(mn, {
                className: "size-3.5",
              }),
            }),
            s.jsx("button", {
              onClick: () => e(o),
              className: z(
                "p-1.5 rounded-md border transition-colors",
                f
                  ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                  : "border-gray-300 dark:border-dark-600 hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-dark-200 hover:border-gray-400 dark:hover:border-dark-500",
              ),
              title: f ? "Desafixar" : "Fixar",
              children: s.jsx(bn, {
                className: "size-3.5",
              }),
            }),
            s.jsx("button", {
              onClick: () => r(o),
              className:
                "p-1.5 rounded-md border border-gray-300 dark:border-dark-600 hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-dark-200 hover:border-gray-400 dark:hover:border-dark-500 transition-colors",
              title: "Abrir exchanges",
              children: s.jsx(nn, {
                className: "size-3.5",
              }),
            }),
            s.jsx("button", {
              onClick: () => n(o),
              className:
                "p-1.5 rounded-md border border-gray-300 dark:border-dark-600 hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-dark-200 hover:border-gray-400 dark:hover:border-dark-500 transition-colors",
              title: "Histórico",
              children: s.jsx(sn, {
                className: "size-3.5",
              }),
            }),
            s.jsx("button", {
              onClick: () => l(o),
              className: z(
                "p-1.5 rounded-md border transition-colors",
                x
                  ? "border-gray-300 dark:border-dark-600 text-gray-400 opacity-60 cursor-not-allowed"
                  : "border-gray-300 dark:border-dark-600 hover:bg-[#5865F2]/10 text-gray-600 dark:text-dark-300 hover:text-[#5865F2] hover:border-[#5865F2]/40 dark:hover:text-[#8EA1FF] dark:hover:border-[#5865F2]/50",
              ),
              title: "Enviar para o Discord",
              disabled: x,
              children: s.jsx(xn, {
                className: "size-3.5",
              }),
            }),
            s.jsx("button", {
              onClick: () => a(o),
              className:
                "p-1.5 rounded-md border border-gray-300 dark:border-dark-600 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-600 dark:text-dark-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 transition-colors",
              title: "Remover",
              children: s.jsx(qe, {
                className: "size-3.5",
              }),
            }),
          ],
        });
      },
    }),
  ];
var _e = {
    exports: {},
  },
  Ve = {},
  He = {
    exports: {},
  },
  We = {};
var Xt;

function ts() {
  if (Xt) return We;
  Xt = 1;
  var e = lr();

  function a(f, h) {
    return (f === h && (f !== 0 || 1 / f === 1 / h)) || (f !== f && h !== h);
  }
  var t = typeof Object.is == "function" ? Object.is : a,
    r = e.useState,
    n = e.useEffect,
    l = e.useLayoutEffect,
    c = e.useDebugValue;

  function d(f, h) {
    var x = h(),
      S = r({
        inst: {
          value: x,
          getSnapshot: h,
        },
      }),
      g = S[0].inst,
      y = S[1];
    return (
      l(
        function () {
          ((g.value = x),
            (g.getSnapshot = h),
            m(g) &&
              y({
                inst: g,
              }));
        },
        [f, x, h],
      ),
      n(
        function () {
          return (
            m(g) &&
              y({
                inst: g,
              }),
            f(function () {
              m(g) &&
                y({
                  inst: g,
                });
            })
          );
        },
        [f],
      ),
      c(x),
      x
    );
  }

  function m(f) {
    var h = f.getSnapshot;
    f = f.value;
    try {
      var x = h();
      return !t(f, x);
    } catch {
      return !0;
    }
  }

  function u(f, h) {
    return h();
  }
  var o =
    typeof window > "u" ||
    typeof window.document > "u" ||
    typeof window.document.createElement > "u"
      ? u
      : d;
  return (
    (We.useSyncExternalStore =
      e.useSyncExternalStore !== void 0 ? e.useSyncExternalStore : o),
    We
  );
}
var Qt;

function rs() {
  return (Qt || ((Qt = 1), (He.exports = ts())), He.exports);
}
var Zt;

function ns() {
  if (Zt) return Ve;
  Zt = 1;
  var e = lr(),
    a = rs();

  function t(u, o) {
    return (u === o && (u !== 0 || 1 / u === 1 / o)) || (u !== u && o !== o);
  }
  var r = typeof Object.is == "function" ? Object.is : t,
    n = a.useSyncExternalStore,
    l = e.useRef,
    c = e.useEffect,
    d = e.useMemo,
    m = e.useDebugValue;
  return (
    (Ve.useSyncExternalStoreWithSelector = function (u, o, f, h, x) {
      var S = l(null);
      if (S.current === null) {
        var g = {
          hasValue: !1,
          value: null,
        };
        S.current = g;
      } else g = S.current;
      S = d(
        function () {
          function N(b) {
            if (!C) {
              if (((C = !0), (O = b), (b = h(b)), x !== void 0 && g.hasValue)) {
                var w = g.value;
                if (x(w, b)) return (R = w);
              }
              return (R = b);
            }
            if (((w = R), r(O, b))) return w;
            var M = h(b);
            return x !== void 0 && x(w, M) ? ((O = b), w) : ((O = b), (R = M));
          }
          var C = !1,
            O,
            R,
            I = f === void 0 ? null : f;
          return [
            function () {
              return N(o());
            },
            I === null
              ? void 0
              : function () {
                  return N(I());
                },
          ];
        },
        [o, f, h, x],
      );
      var y = n(u, S[0], S[1]);
      return (
        c(
          function () {
            ((g.hasValue = !0), (g.value = y));
          },
          [y],
        ),
        m(y),
        y
      );
    }),
    Ve
  );
}
var Yt;

function ss() {
  return (Yt || ((Yt = 1), (_e.exports = ns())), _e.exports);
}
var as = ss();
const is = qr(as),
  er = (e) => {
    let a;
    const t = new Set(),
      r = (u, o) => {
        const f = typeof u == "function" ? u(a) : u;
        if (!Object.is(f, a)) {
          const h = a;
          ((a =
            (o ?? (typeof f != "object" || f === null))
              ? f
              : Object.assign({}, a, f)),
            t.forEach((x) => x(a, h)));
        }
      },
      n = () => a,
      d = {
        setState: r,
        getState: n,
        getInitialState: () => m,
        subscribe: (u) => (t.add(u), () => t.delete(u)),
      },
      m = (a = e(r, n, d));
    return d;
  },
  os = (e) => (e ? er(e) : er),
  { useSyncExternalStoreWithSelector: ls } = is,
  cs = (e) => e;

function ds(e, a = cs, t) {
  const r = ls(e.subscribe, e.getState, e.getInitialState, a, t);
  return (Gr.useDebugValue(r), r);
}
const tr = (e, a) => {
    const t = os(e),
      r = (n, l = a) => ds(t, n, l);
    return (Object.assign(r, t), r);
  },
  us = (e, a) => (e ? tr(e, a) : tr),
  ie = (e) => {
    const a = new Set();
    return (
      Object.values(e).forEach((t) => {
        (t.pinAliases.forEach((r) => a.add(r)), a.add(t.pinKey));
      }),
      a
    );
  },
  ke = (e, a) =>
    e.lastSeen !== a.lastSeen ||
    e.muteAlert !== a.muteAlert ||
    e.result !== a.result ||
    e.buyPrice !== a.buyPrice ||
    e.sellPrice !== a.sellPrice ||
    e.buyVolume !== a.buyVolume ||
    e.sellVolume !== a.sellVolume ||
    e.volume !== a.volume ||
    e.invertedCount !== a.invertedCount ||
    (e.invertedCounts?.["30m"] ?? 0) !== (a.invertedCounts?.["30m"] ?? 0) ||
    (e.invertedCounts?.["1h"] ?? 0) !== (a.invertedCounts?.["1h"] ?? 0) ||
    (e.invertedCounts?.["4h"] ?? 0) !== (a.invertedCounts?.["4h"] ?? 0) ||
    (e.invertedCounts?.["8h"] ?? 0) !== (a.invertedCounts?.["8h"] ?? 0) ||
    (e.invertedCounts?.["24h"] ?? 0) !== (a.invertedCounts?.["24h"] ?? 0) ||
    e.fundingRate !== a.fundingRate ||
    e.buyFundingRate !== a.buyFundingRate ||
    e.sellFundingRate !== a.sellFundingRate ||
    e.maxVolume !== a.maxVolume ||
    e.isInverted !== a.isInverted ||
    e.isBlacklisted !== a.isBlacklisted ||
    e.buyBookTs !== a.buyBookTs ||
    e.sellBookTs !== a.sellBookTs,
  ms = (e, a) => (typeof e == "function" ? e(a) : e),
  hs = (e) => Array.from(new Set(e)),
  fs = (e) => e === "SPOT-FUTURO" || e === "FUTURO-FUTURO",
  rr = 5e3,
  Qe = 500,
  ps = 10,
  nr = (e) => {
    const a = Object.entries(e);
    return a.length <= rr
      ? e
      : (a.sort((t, r) => (r[1].lastSeen ?? 0) - (t[1].lastSeen ?? 0)),
        Object.fromEntries(a.slice(0, rr)));
  },
  gs = (e, a) => {
    if (e.length <= Qe)
      return {
        ids: e,
        items: a,
      };
    const t = e.slice(0, Qe),
      r = {};
    return (
      t.forEach((n) => {
        a[n] && (r[n] = a[n]);
      }),
      {
        ids: t,
        items: r,
      }
    );
  },
  sr = {
    pageIndex: 0,
    pageSize: 100,
  },
  Ye = (e, a) => {
    const t = a.trim().toLowerCase();
    return t
      ? e.filter(
          (r) =>
            r.coinName.toLowerCase().includes(t) ||
            r.coin.toLowerCase().includes(t) ||
            r.buyExchange.toLowerCase().includes(t) ||
            r.sellExchange.toLowerCase().includes(t),
        )
      : e;
  },
  et = (e, a) => {
    let t = [...e];
    return (
      a.exchange1.length > 0 &&
        (t = t.filter((r) =>
          a.exchange1.some((n) => {
            const l = n.endsWith(" (Futuro)"),
              c = l ? n.replace(" (Futuro)", "").trim() : n,
              d = Se(r.buyExchange),
              m = Se(c);
            if (d !== m) return !1;
            const u = r.buyMarket === "future";
            return l === u;
          }),
        )),
      a.exchange2.length > 0 &&
        (t = t.filter((r) =>
          a.exchange2.some((n) => {
            const l = n.endsWith(" (Futuro)"),
              c = l ? n.replace(" (Futuro)", "").trim() : n,
              d = Se(r.sellExchange),
              m = Se(c);
            if (d !== m) return !1;
            const u = r.sellMarket === "future";
            return l === u;
          }),
        )),
      a.opportunityTypes.length > 0 &&
        (t = t.filter(
          (r) =>
            fs(r.opportunityType) &&
            a.opportunityTypes.includes(r.opportunityType),
        )),
      a.volumeMin > 0 && (t = t.filter((r) => r.volume >= a.volumeMin)),
      a.spreadMin > 0 && (t = t.filter((r) => r.result >= a.spreadMin)),
      a.invertedMin > 0 &&
        (t = t.filter((r) => {
          const n = a.invertedWindow || "4h",
            l = r.invertedCounts?.[n] ?? r.invertedCount ?? 0;
          return l >= a.invertedMin;
        })),
      a.whitelist.length > 0 &&
        (t = t.filter((r) => a.whitelist.includes(r.coin))),
      a.blacklist.length > 0 &&
        (t = t.filter((r) => !a.blacklist.includes(r.coin))),
      (t = t.filter((r) => !r.isBlacklisted || a.blacklist.includes(r.coin))),
      t
    );
  },
  xs = {
    opportunity: (e) => e.coinName,
    buy: (e) => e.buyPrice,
    sell: (e) => e.sellPrice,
    result: (e) => e.result,
    inverted: (e) =>
      e.invertedCounts?.[globalThis.__TEAMOP_INV_WIN || "4h"] ??
      e.invertedCount,
  },
  ar = (e) => (e.alertProfitHit || e.alertTelegramHit ? 1 : 0),
  kr = (e, a) => {
    const t = [...e];
    return (
      t.sort((r, n) => {
        const l = ar(n) - ar(r);
        if (l !== 0) return l;
        if (!a.length) return 0;
        for (const c of a) {
          const d = xs[c.id] ?? (() => {}),
            m = d(r),
            u = d(n);
          if (m !== u) {
            if (m == null) return 1;
            if (u == null) return -1;
            if (typeof m == "string" || typeof u == "string") {
              const o = String(m).localeCompare(String(u));
              if (o !== 0) return c.desc ? -o : o;
            } else {
              const o = Number(m),
                f = Number(u);
              if (o !== f) {
                const h = o < f ? -1 : 1;
                return c.desc ? -h : h;
              }
            }
          }
        }
        return 0;
      }),
      t
    );
  },
  vr = (e, a) => {
    if (e === a) return !0;
    if (e.length !== a.length) return !1;
    for (let t = 0; t < e.length; t += 1) if (e[t] !== a[t]) return !1;
    return !0;
  },
  j = us()((e, a) => ({
    signalsById: {},
    pinnedById: {},
    pinnedOrder: [],
    pinnedAliasSet: new Set(),
    mutedAlerts: new Set(),
    removedIds: [],
    removedSet: new Set(),
    removedItems: {},
    filters:
      ((globalThis.__TEAMOP_INV_WIN = te.invertedWindow || "4h"),
      {
        ...te,
      }),
    searchTerm: "",
    sorting: [],
    pageIndex: sr.pageIndex,
    pageSize: sr.pageSize,
    lastUpdate: null,
    connectionStatus: "idle",
    isLive: !1,
    isPaused: !1,
    setConnectionStatus: (t) =>
      e({
        connectionStatus: t,
      }),
    setLastUpdate: (t) =>
      e({
        lastUpdate: t,
      }),
    setIsLive: (t) =>
      e({
        isLive: t,
      }),
    setIsPaused: (t) =>
      e({
        isPaused: t,
      }),
    togglePause: () =>
      e((t) => ({
        isPaused: !t.isPaused,
      })),
    setSearchTerm: (t) =>
      e({
        searchTerm: t,
        pageIndex: 0,
      }),
    setFilters: (t) => (
      (globalThis.__TEAMOP_INV_WIN = t.invertedWindow || "4h"),
      e({
        filters: {
          ...t,
        },
        pageIndex: 0,
      })
    ),
    setSorting: (t) =>
      e((r) => ({
        sorting: typeof t == "function" ? t(r.sorting) : t,
      })),
    setPagination: (t) =>
      e((r) => {
        const n = ms(t, {
          pageIndex: r.pageIndex,
          pageSize: r.pageSize,
        });
        return {
          pageIndex: n.pageIndex,
          pageSize: n.pageSize,
        };
      }),
    clearSignals: () =>
      e((t) => ({
        ...t,
        signalsById: {},
        lastUpdate: null,
        isLive: !1,
      })),
    hydratePinned: (t, r) =>
      e((n) => {
        if (!t.length || !r.length) return n;
        const l = Date.now(),
          c = {},
          d = new Map();
        r.forEach((u) => {
          if (!u) return;
          const o = opKey(u),
            f = Array.from(
              new Set(
                [
                  o,
                  ...(Array.isArray(u.pinAliases) ? u.pinAliases : []),
                  u.pinKey,
                  u.id,
                  u.code,
                  legacyOpKey(u),
                ].filter(Boolean),
              ),
            );
          c[o] = {
            ...u,
            id: o,
            pinKey: o,
            pinAliases: f,
            buyMarket: u.buyMarket ?? A(u.buyType),
            sellMarket: u.sellMarket ?? A(u.sellType),
            isPinned: !0,
            lastSeen: u.lastSeen ?? l,
            muteAlert: f.some((h) => n.mutedAlerts.has(h)),
          };
          f.forEach((h) => d.set(h, o));
        });
        const m = ie(c),
          u = hs(t.map((o) => d.get(o) || o)).filter((o) => !!c[o]);
        return {
          ...n,
          pinnedById: c,
          pinnedOrder: u,
          pinnedAliasSet: m,
        };
      }),
    hydrateRemovedSignals: (t) =>
      e((r) => {
        const n = Array.from(
          new Set(
            (t || [])
              .map((o) => (typeof o == "string" ? o.trim() : ""))
              .filter(Boolean),
          ),
        ).slice(0, Qe);
        if (vr(n, r.removedIds)) return r;
        const l = new Set(n),
          c = {
            ...r.signalsById,
          };
        n.forEach((o) => {
          c[o] && delete c[o];
        });
        const d = {
          ...r.pinnedById,
        };
        n.forEach((o) => {
          d[o] && delete d[o];
        });
        const m = r.pinnedOrder.filter((o) => !l.has(o)),
          u = {};
        return (
          n.forEach((o) => {
            r.removedItems[o] && (u[o] = r.removedItems[o]);
          }),
          {
            ...r,
            removedIds: n,
            removedSet: l,
            removedItems: u,
            signalsById: c,
            pinnedById: d,
            pinnedOrder: m,
            pinnedAliasSet: ie(d),
          }
        );
      }),
    hydrateMutedAlerts: (t) =>
      e((r) => {
        const n = Array.from(
          new Set(
            (t || [])
              .map((u) => (typeof u == "string" ? u.trim() : ""))
              .filter(Boolean),
          ),
        );
        if (
          n.length === r.mutedAlerts.size &&
          n.every((u) => r.mutedAlerts.has(u))
        )
          return r;
        const c = new Set(n),
          d = {
            ...r.signalsById,
          };
        Object.keys(d).forEach((u) => {
          d[u] = {
            ...d[u],
            muteAlert: hasStoredAlias(d[u], c),
          };
        });
        const m = {
          ...r.pinnedById,
        };
        return (
          Object.keys(m).forEach((u) => {
            m[u] = {
              ...m[u],
              muteAlert: hasStoredAlias(m[u], c),
            };
          }),
          {
            ...r,
            mutedAlerts: c,
            signalsById: d,
            pinnedById: m,
          }
        );
      }),
    upsertSignals: (t) =>
      e((r) => {
        if (!t.length) return r;
        const n = {
            ...r.signalsById,
          },
          l = {
            ...r.pinnedById,
          };
        let c = !1,
          d = !1;
        const m = Date.now();
        if (
          (t.forEach((o) => {
            if (o.pinAliases.some((g) => r.removedSet.has(g))) return;
            const h = o.pinAliases.some((g) => r.pinnedAliasSet.has(g)),
              x = hasStoredAlias(o, r.mutedAlerts),
              S = {
                ...o,
                lastSeen: o.lastSeen ?? m,
                muteAlert: x,
              };
            if (h) {
              const g = l[o.pinKey],
                y = {
                  ...S,
                  isPinned: !0,
                };
              ((!g || ke(g, y)) && ((l[o.pinKey] = y), (c = !0)),
                delete n[o.pinKey]);
            } else {
              const g = n[o.pinKey],
                y = {
                  ...S,
                  isPinned: !1,
                };
              (!g || ke(g, y)) && ((n[o.pinKey] = y), (d = !0));
            }
          }),
          !d && !c)
        )
          return r;
        let u = d ? n : r.signalsById;
        if (d) {
          const o = nr(n);
          o !== n && (u = o);
        }
        return {
          ...r,
          signalsById: u,
          pinnedById: c ? l : r.pinnedById,
          pinnedAliasSet: c ? ie(l) : r.pinnedAliasSet,
        };
      }),
    upsertSignal: (t) => a().upsertSignals([t]),
    applySnapshot: (t) =>
      e((r) => {
        if (!t.length) return r;
        const n = {};
        let l = r.pinnedById,
          c = !1;
        const d = r.removedSet,
          m = Date.now();
        t.forEach((x) => {
          if (x.pinAliases.some((C) => d.has(C))) return;
          const g = x.pinAliases.some((C) => r.pinnedAliasSet.has(C)),
            y = hasStoredAlias(x, r.mutedAlerts),
            N = {
              ...x,
              lastSeen: x.lastSeen ?? m,
              muteAlert: y,
            };
          if (g) {
            const C = l[x.pinKey],
              O = {
                ...N,
                isPinned: !0,
              };
            (!C || ke(C, O)) &&
              ((l = {
                ...l,
                [x.pinKey]: O,
              }),
              (c = !0));
            return;
          }
          n[x.pinKey] = {
            ...N,
            isPinned: !1,
          };
        });
        const u = nr(n),
          o = et(
            Ye(
              Object.values(u).filter(
                (x) => !x.pinAliases.some((S) => r.removedSet.has(S)),
              ),
              r.searchTerm,
            ),
            r.filters,
          ).length,
          f = o > 0 ? Math.max(0, Math.floor((o - 1) / r.pageSize)) : 0,
          h = Math.min(r.pageIndex, f);
        return {
          ...r,
          signalsById: u,
          pinnedById: c ? l : r.pinnedById,
          pinnedAliasSet: c ? ie(l) : r.pinnedAliasSet,
          pageIndex: h,
        };
      }),
    updatePinnedSignal: (t, r) =>
      e((n) => {
        const l = n.pinnedById[t];
        if (!l) return n;
        const c = {
          ...r(l),
        };
        if (((c.lastSeen = c.lastSeen ?? Date.now()), !ke(l, c))) return n;
        const d = {
          ...n.pinnedById,
          [t]: c,
        };
        return {
          ...n,
          pinnedById: d,
        };
      }),
    pinSignal: (t) =>
      e((r) => {
        const n = t.pinKey,
          l = r.pinnedOrder.includes(n);
        if (!l && r.pinnedOrder.length >= ps) return r;
        const c = {
            ...r.pinnedById,
          },
          d = {
            ...r.signalsById,
          },
          m = {
            ...r.removedItems,
          };
        let u = r.removedIds;
        const o = Date.now();
        if (!l) {
          const f = [n, ...r.pinnedOrder];
          return (
            (c[n] = {
              ...t,
              isPinned: !0,
              lastSeen: t.lastSeen ?? o,
              alertProfitHit: !1,
              alertTelegramHit: !1,
            }),
            delete d[n],
            r.removedSet.has(n) &&
              ((u = r.removedIds.filter((h) => h !== n)), delete m[n]),
            {
              ...r,
              pinnedById: c,
              pinnedOrder: f,
              pinnedAliasSet: ie(c),
              signalsById: d,
              removedIds: u,
              removedSet: new Set(u),
              removedItems: m,
            }
          );
        }
        return r;
      }),
    unpinSignal: (t) =>
      e((r) => {
        if (!r.pinnedOrder.includes(t)) return r;
        const n = {
          ...r.pinnedById,
        };
        delete n[t];
        const l = r.pinnedOrder.filter((c) => c !== t);
        return {
          ...r,
          pinnedById: n,
          pinnedOrder: l,
          pinnedAliasSet: ie(n),
        };
      }),
    removeSignal: (t) =>
      e((r) => {
        const n = t.pinKey;
        if (r.removedSet.has(n)) return r;
        const l = {
            ...t,
            lastSeen: t.lastSeen ?? Date.now(),
            muteAlert: hasStoredAlias(t, r.mutedAlerts),
          },
          c = [n, ...r.removedIds],
          d = {
            ...r.removedItems,
            [n]: l,
          },
          { ids: m, items: u } = gs(c, d),
          o = new Set(m),
          f = {
            ...r.signalsById,
          };
        delete f[n];
        const h = {
          ...r.pinnedById,
        };
        h[n] && delete h[n];
        const x = r.pinnedOrder.filter((S) => S !== n);
        return {
          ...r,
          removedIds: m,
          removedSet: o,
          removedItems: u,
          signalsById: f,
          pinnedById: h,
          pinnedOrder: x,
          pinnedAliasSet: ie(h),
        };
      }),
    restoreSignal: (t) =>
      e((r) => {
        if (!r.removedSet.has(t)) return r;
        const n = r.removedIds.filter((m) => m !== t),
          l = {
            ...r.removedItems,
          },
          c = l[t];
        delete l[t];
        const d = {
          ...r.signalsById,
        };
        return (
          c &&
            (d[t] = {
              ...c,
              isPinned: !1,
              lastSeen: c.lastSeen ?? Date.now(),
              muteAlert: hasStoredAlias(c, r.mutedAlerts),
            }),
          {
            ...r,
            removedIds: n,
            removedSet: new Set(n),
            removedItems: l,
            signalsById: d,
          }
        );
      }),
    toggleMuteAlert: (t, r = []) =>
      e((n) => {
        const l = Array.from(
            new Set([t, ...(Array.isArray(r) ? r : [])].filter(Boolean)),
          ),
          c = new Set(n.mutedAlerts),
          d = l.some((u) => c.has(u));
        d ? l.forEach((u) => c.delete(u)) : c.add(t);
        const m = {
            ...n.signalsById,
          },
          u = {
            ...n.pinnedById,
          };
        return (
          Object.keys(m).forEach((o) => {
            m[o] = {
              ...m[o],
              muteAlert: hasStoredAlias(m[o], c),
            };
          }),
          Object.keys(u).forEach((o) => {
            u[o] = {
              ...u[o],
              muteAlert: hasStoredAlias(u[o], c),
            };
          }),
          {
            ...n,
            mutedAlerts: c,
            signalsById: m,
            pinnedById: u,
          }
        );
      }),
  })),
  ys = () => {
    let e = null,
      a = {
        rows: [],
        total: 0,
      };
    return (t) => {
      const r = [
        t.signalsById,
        t.filters,
        t.searchTerm,
        t.removedSet,
        t.sorting,
        t.pageIndex,
        t.pageSize,
      ];
      if (
        e &&
        e[0] === r[0] &&
        e[1] === r[1] &&
        e[2] === r[2] &&
        e[3] === r[3] &&
        e[4] === r[4] &&
        e[5] === r[5] &&
        e[6] === r[6]
      )
        return a;
      const n = r[3],
        l = Object.values(r[0]).filter(
          (h) => !h.pinAliases.some((x) => n.has(x)),
        ),
        c = Ye(l, r[2]),
        d = et(c, r[1]),
        m = kr(d, r[4]),
        u = m.length,
        o = r[5] * r[6],
        f = m.length > 0 ? m.slice(o, o + r[6]) : [];
      return (
        (e = r),
        (a = {
          rows: f,
          total: u,
        }),
        a
      );
    };
  },
  bs = () => {
    let e = null,
      a = [];
    return (t) => {
      const r = [t.pinnedById, t.searchTerm, t.pinnedOrder];
      if (e && e[0] === r[0] && e[1] === r[1] && vr(e[2], r[2])) return a;
      const n = r[2].map((d) => r[0][d]).filter(Boolean),
        l = Ye(n, r[1]).map((d) => ({
          ...d,
          isPinned: !0,
        })),
        c = kr(l, []);
      return ((e = r), (a = c), a);
    };
  },
  ir = new Map(),
  Ss = 3e3,
  wr = (e) => {
    const a = j.getState(),
      { profitSpreadMin: t, profitSpreadTelegramMin: r } = a.filters,
      n = t > 0,
      l = r > 0;
    let c = !1;
    const d = [],
      m = Date.now(),
      u = e.map((o) => {
        const f = o.pinAliases.some((N) => a.removedSet.has(N)),
          h = o.pinAliases.some((N) => a.pinnedAliasSet.has(N)),
          x = hasStoredAlias(o, a.mutedAlerts);
        if (f || x || h)
          return {
            ...o,
            alertProfitHit: !1,
            alertTelegramHit: !1,
          };
        if (!(et([o], a.filters).length > 0))
          return {
            ...o,
            alertProfitHit: !1,
            alertTelegramHit: !1,
          };
        const g = n && o.result >= t,
          y = l && o.result >= r;
        if ((g && (c = !0), y)) {
          const N = ir.get(o.pinKey) || 0;
          if (m - N > Ss) {
            const C = o.result.toFixed(2),
              O = Ne(o.buyPrice),
              R = Ne(o.sellPrice),
              I =
                o.exitSpread !== null && o.exitSpread !== void 0
                  ? `${o.exitSpread.toFixed(2)}%`
                  : "N/A",
              b = o.buyMarket === "future" ? "Futuro" : "Spot",
              w = o.sellMarket === "future" ? "Futuro" : "Spot",
              M = r.toFixed(2),
              E = `
🔔 *Alerta de Entrada*

📊 Moeda: *${o.coin}*
🏢 Corretoras: ${o.buyExchange} (${b}) ➡️ ${o.sellExchange} (${w})
📈 Spread Atual: *${C}%*
📉 Spread Saída: ${I}
🎯 Spread Alvo: ${M}%
💰 Preços: ${O} -> ${R}`;
            (d.push(E), ir.set(o.pinKey, m));
          }
        }
        return {
          ...o,
          alertProfitHit: g,
          alertTelegramHit: y,
        };
      });
    if (d.length > 0) {
      const o = `🚨 *Scanner Alerta (${d.length})* 🚨`,
        f = d.join(`
-------------------
`),
        h = `${o}
${f}`;
      an(h);
    }
    return {
      signals: u,
      shouldPlay: c,
    };
  },
  Ze = (e) => wr(e),
  ks = (e) => {
    const a = wr([e]);
    return {
      signal: a.signals[0],
      shouldPlay: a.shouldPlay,
    };
  },
  vs = (e, a) => {
    const t = Object.keys(e),
      r = Object.keys(a);
    return t.length !== r.length ? !1 : t.every((n) => r.includes(n));
  },
  ws = () => {
    const e = j((f) => f.updatePinnedSignal),
      a = p.useRef(null),
      t = p.useRef(null),
      r = p.useRef(new Map()),
      n = p.useRef(new Set()),
      l = p.useRef(new Map()),
      c = p.useRef(new Set()),
      d = 800,
      m = 1800,
      u = p.useRef(null);
    p.useEffect(
      () => (
        (u.current = gr("/sounds/notification3.mp3", {
          volume: 0.8,
          preferenceKey: "scanner",
          minIntervalMs: m,
        })),
        () => {
          (u.current?.cleanup(), (u.current = null));
        }
      ),
      [],
    );
    const o = () => {
      u.current?.play();
    };
    p.useEffect(() => {
      let f = j.getState().pinnedById,
        h = j.getState().removedSet;
      const x = () =>
          typeof window < "u" ? localStorage.getItem("authToken") : null,
        S = () => {
          if (
            (t.current && (clearTimeout(t.current), (t.current = null)),
            a.current)
          ) {
            try {
              a.current.close();
            } catch {}
            a.current = null;
          }
          n.current.clear();
        },
        g = () => {
          const R = a.current;
          !R ||
            R.readyState !== WebSocket.OPEN ||
            (Array.from(c.current).forEach((I) => {
              (R.send(
                JSON.stringify({
                  type: "unsubscribe",
                  pair: I,
                }),
              ),
                c.current.delete(I),
                n.current.delete(I),
                l.current.set(I, Date.now()));
            }),
            Array.from(n.current).forEach((I) => {
              r.current.has(I) ||
                (R.send(
                  JSON.stringify({
                    type: "unsubscribe",
                    pair: I,
                  }),
                ),
                n.current.delete(I),
                l.current.set(I, Date.now()));
            }),
            r.current.forEach((I, b) => {
              if (n.current.has(b)) return;
              const w = l.current.get(b);
              if (w && Date.now() - w < d) return;
              l.current.delete(b);
              const [M] = Array.from(I),
                E = M ? j.getState().pinnedById[M] : null;
              if (!E) return;
              const F = (E.coinName || E.coin || "")
                .replace("/USDT", "")
                .replace("/usd", "")
                .toUpperCase();
              (R.send(
                JSON.stringify({
                  crypto: F,
                  current: "USDT",
                  buy: {
                    exchange: ne(E.buyExchange),
                    market: A(E.buyMarket),
                  },
                  sell: {
                    exchange: ne(E.sellExchange),
                    market: A(E.sellMarket),
                  },
                }),
              ),
                n.current.add(b));
            }));
        },
        y = (R) => {
          f = R;
          const I = new Map();
          (Object.entries(R).forEach(([b, w]) => {
            if (h.has(b)) return;
            const M = w.pair || Sr(w);
            if (!M) return;
            w.pair ||
              e(b, (F) => ({
                ...F,
                pair: M,
              }));
            const E = I.get(M) ?? new Set();
            (E.add(b), I.set(M, E));
          }),
            r.current.clear(),
            I.forEach((b, w) => r.current.set(w, b)),
            n.current.forEach((b) => {
              r.current.has(b) || c.current.add(b);
            }),
            l.current.forEach((b, w) => {
              r.current.has(w) || c.current.add(w);
            }),
            g());
        },
        N = j.subscribe((R, I) => {
          vs(I.pinnedById, R.pinnedById) || y(R.pinnedById);
        }),
        C = j.subscribe((R, I) => {
          R.removedSet !== I.removedSet &&
            ((h = R.removedSet), y(j.getState().pinnedById));
        }),
        O = () => {
          const R = x(),
            I = new WebSocket(
              `${hn.replace(/\/$/, "")}/crypto/compare-ws?token=${R ?? ""}`,
            );
          ((a.current = I),
            (I.onopen = () => {
              (n.current.clear(), g());
            }),
            (I.onmessage = (b) => {
              try {
                const w = JSON.parse(b.data || "{}");
                if (w?.type === "ping") return;
                w?.pair && r.current.has(w.pair);
                const M = Xe(w, Date.now());
                if (w?.buyExchange && w?.sellExchange && w?.pair) {
                  const T = r.current.get(w.pair);
                  if (T) {
                    T.forEach((L) => {
                      e(L, (B) => {
                        const ee = Qn(B, w),
                          { signal: oe, shouldPlay: H } = ks(ee);
                        return (H && o(), oe);
                      });
                    });
                    return;
                  }
                }
                const { signals: E, shouldPlay: F } = Ze(M);
                (E.forEach((T) => {
                  const L = r.current.get(T.pair || "");
                  L &&
                    L.forEach((B) => {
                      e(B, () => ({
                        ...T,
                        isPinned: !0,
                        pair: T.pair,
                      }));
                    });
                }),
                  F && o());
              } catch {}
            }),
            (I.onerror = () => {
              I.close();
            }),
            (I.onclose = () => {
              ((a.current = null),
                n.current.clear(),
                t.current && clearTimeout(t.current),
                (t.current = setTimeout(() => {
                  Object.keys(j.getState().pinnedById).length > 0 && O();
                }, 2e3)));
            }));
        };
      return (
        y(f),
        O(),
        () => {
          (N(), C(), t.current && clearTimeout(t.current), S());
        }
      );
    }, [e]);
  },
  Ns = 1e3,
  or = 1500,
  js = 600 * 1e3,
  Es = 1800,
  Is = () => {
    const e = j((b) => b.upsertSignals),
      a = j((b) => b.applySnapshot),
      t = j((b) => b.setConnectionStatus),
      r = j((b) => b.setLastUpdate),
      n = j((b) => b.setIsLive),
      l = j((b) => b.clearSignals),
      c = j((b) => b.filters.tableUpdateSeconds),
      d = p.useRef(null),
      m = p.useRef(null),
      u = p.useRef(null),
      o = p.useRef(null),
      f = p.useRef(null),
      h = p.useRef(null),
      x = p.useRef(null),
      S = p.useRef(Ft),
      _wdLastData = p.useRef(0),
      _wdTimer = p.useRef(null),
      g = p.useRef(!1),
      y = p.useRef({}),
      N = p.useRef(0);
    p.useEffect(
      () => (
        (x.current = gr("/sounds/notification3.mp3", {
          volume: 0.8,
          preferenceKey: "scanner",
          minIntervalMs: Es,
        })),
        () => {
          (x.current?.cleanup(), (x.current = null));
        }
      ),
      [],
    );
    const C = p.useCallback(() => {
      x.current?.play();
    }, []);
    p.useEffect(() => {
      const b = Number(c);
      if (!Number.isFinite(b) || b <= 0) {
        S.current = Ft;
        return;
      }
      const w = Math.max(0.05, b);
      S.current = Math.round(w * 1e3);
    }, [c]);
    const O = p.useCallback((b) => {
        const w = Object.entries(y.current);
        if (!w.length) return;
        const M = w.filter(([, E]) => b - E <= js);
        (M.length === w.length && M.length <= or) ||
          (M.sort((E, F) => F[1] - E[1]),
          (y.current = Object.fromEntries(M.slice(0, or))));
      }, []),
      R = p.useCallback(
        (b) => {
          if (j.getState().isPaused) return;
          const w = b.find((T) => T.alertProfitHit || T.alertTelegramHit);
          if (!w) return;
          const M = Date.now();
          O(M);
          const E = w.pinKey || w.id,
            F = y.current[E] || 0;
          if (!(M - F < 15e3)) {
            if (
              ((y.current[E] = M),
              typeof window < "u" && "Notification" in window)
            ) {
              if (Notification.permission === "default") {
                const L = N.current || 0;
                M - L > 6e4 &&
                  ((N.current = M),
                  Notification.requestPermission().catch(() => {}));
              }
              if (Notification.permission === "granted") {
                const L = w.alertTelegramHit
                    ? "Alerta (Telegram)"
                    : "Alerta de lucro",
                  B = `${w.coinName} — ${w.buyExchange} → ${w.sellExchange} | Spread ${w.result.toFixed(2)}%`;
                try {
                  new Notification(L, {
                    body: B,
                    tag: `scanner-${E}`,
                  });
                } catch {}
              }
            }
            C();
          }
        },
        [C],
      ),
      I = p.useCallback(
        (b) => {
          if (j.getState().isPaused) {
            o.current = b;
            return;
          }
          const w =
              b?.timestamp && !Number.isNaN(Date.parse(b.timestamp))
                ? Date.parse(b.timestamp)
                : Date.now(),
            M = Xe(b, w);
          if (!M.length) return;
          const { signals: E, shouldPlay: F } = Ze(M);
          (p.startTransition(() => {
            (Array.isArray(b?.data) ? a(E) : e(E),
              n(!0),
              t("open"),
              r(b?.timestamp || new Date().toISOString()));
          }),
            F && C());
        },
        [a, C, t, n, r, e],
      );
    (p.useEffect(() => {
      let b = j.getState().isPaused;
      const w = j.subscribe((M) => {
        if (M.isPaused !== b && ((b = M.isPaused), !M.isPaused && o.current)) {
          const E = o.current;
          ((o.current = null), I(E));
        }
      });
      return () => {
        w();
      };
    }, [I]),
      p.useEffect(() => {
        let b = !0;
        const w = () => {
            m.current && (clearTimeout(m.current), (m.current = null));
          },
          M = () => {
            f.current && (clearTimeout(f.current), (f.current = null));
          },
          E = () => {
            h.current && (clearTimeout(h.current), (h.current = null));
          },
          F = () => {
            if (d.current)
              try {
                ((d.current.onopen = null),
                  (d.current.onmessage = null),
                  (d.current.onerror = null),
                  (d.current.onclose = null),
                  d.current.close());
              } catch {}
          },
          T = () => {
            if (!b) return;
            (w(),
              E(),
              d.current &&
                d.current.readyState !== WebSocket.CLOSED &&
                d.current.readyState !== WebSocket.CLOSING &&
                F(),
              t("connecting"));
            const B = new WebSocket("ws://127.0.0.1:8000/ws");
            ((d.current = B),
              (B.onopen = () => {
                (t("open"), l());
              }),
              (B.onmessage = (ee) => {
                _wdLastData.current = Date.now();
                try {
                  const oe = JSON.parse(ee.data || "{}");
                  if (oe?.type === "ping") return;
                  if (((u.current = oe), g.current || document.hidden)) {
                    h.current ||
                      (h.current = setTimeout(() => {
                        h.current = null;
                        const H = u.current;
                        if (((u.current = null), !H)) return;
                        const Ee =
                            H?.timestamp &&
                            !Number.isNaN(Date.parse(H.timestamp))
                              ? Date.parse(H.timestamp)
                              : Date.now(),
                          de = Xe(H, Ee);
                        if (!de.length) return;
                        const { signals: pe, shouldPlay: ge } = Ze(de);
                        ge && R(pe);
                      }, Ns));
                    return;
                  }
                  (E(),
                    f.current ||
                      (f.current = setTimeout(() => {
                        f.current = null;
                        const H = u.current;
                        ((u.current = null), H && I(H));
                      }, S.current)));
                } catch {
                  t("error");
                }
              }),
              (B.onerror = () => {
                b && t("error");
              }),
              (B.onclose = () => {
                b && (t("idle"), w(), (m.current = setTimeout(T, 2e3)));
              }));
          },
          L = () => {
            const B = document.hidden;
            if (((g.current = B), B)) {
              M();
              return;
            }
            E();
            const ee = u.current;
            ee && !j.getState().isPaused && ((u.current = null), I(ee));
          };
        return (
          document.addEventListener("visibilitychange", L),
          T(),
          (_wdTimer.current = setInterval(() => {
            if (
              _wdLastData.current > 0 &&
              Date.now() - _wdLastData.current > 45000 &&
              b
            ) {
              console.warn(
                "[ML WS] Watchdog: no data for 45s, reconnecting...",
              );
              _wdLastData.current = 0;
              d.current &&
                d.current.readyState !== WebSocket.CLOSED &&
                d.current.readyState !== WebSocket.CLOSING &&
                F();
              w();
              m.current = setTimeout(T, 1000);
            }
          }, 10000)),
          () => {
            ((b = !1),
              document.removeEventListener("visibilitychange", L),
              _wdTimer.current && clearInterval(_wdTimer.current),
              w(),
              M(),
              E(),
              (u.current = null),
              d.current && F());
          }
        );
      }, [I, l, t]));
  },
  Cs = () => {
    if (typeof window > "u")
      return {
        ids: [],
        data: [],
      };
    try {
      const e = localStorage.getItem(ur);
      if (!e)
        return {
          ids: [],
          data: [],
        };
      const a = JSON.parse(e),
        t = Array.isArray(a?.ids) ? a.ids : Array.isArray(a) ? a : [],
        r = Array.isArray(a?.data) ? a.data : [];
      return {
        ids: t,
        data: r,
      };
    } catch {
      return {
        ids: [],
        data: [],
      };
    }
  },
  Rs = (e, a) => {
    if (!(typeof window > "u"))
      try {
        const t = e.map((r) => a[r]).filter(Boolean);
        localStorage.setItem(
          ur,
          JSON.stringify({
            ids: e,
            data: t,
          }),
        );
      } catch {}
  },
  Nr = (e) => {
    const a = e.split("_");
    if (a.length < 5) return null;
    const [t, r, n, l, c] = a,
      d = n.split("-")[0] || n,
      m = (u, o) => {
        const f = fe(u);
        return o === "FUTURES" ? `${f} (Futuro)` : f;
      };
    return {
      coin: d,
      buyDisplay: m(r, t),
      sellDisplay: m(l, c),
    };
  },
  je = (e, a) =>
    e
      ? (a || "").toUpperCase().includes("FUTURE") ||
        (a || "").toUpperCase().includes("FUTURO")
        ? `${e} (Futuro)`
        : e
      : "-",
  Ms = (e) => ({
    idle: "Aguardando",
    connecting: "Conectando...",
    open: e ? "Conectado" : "Conectado (aguardando dados)",
    error: "Erro na conexao",
  }),
  Ps = {
    idle: "border-gray-200 bg-gray-100 text-gray-700 dark:border-dark-700 dark:bg-dark-700/40 dark:text-dark-100",
    connecting:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200",
    open: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-200",
    error:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200",
  },
  Os = {
    idle: "bg-gray-400",
    connecting: "bg-amber-500",
    open: "bg-emerald-500",
    error: "bg-red-500",
  },
  Fs = (e) => {
    if (!e) return "";
    const a = new Date(e);
    return Number.isNaN(a.getTime()) ? "" : a.toLocaleTimeString();
  },
  Ts = ({
    isOpen: e,
    onClose: a,
    removedIds: t,
    removedItems: r,
    onRestore: n,
  }) =>
    e
      ? s.jsxs("div", {
          className:
            "mb-6 rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-4 shadow-sm",
          children: [
            s.jsxs("div", {
              className: "flex items-center justify-between mb-3",
              children: [
                s.jsx("h3", {
                  className:
                    "text-sm font-semibold text-gray-900 dark:text-dark-100 uppercase tracking-wide",
                  children: "Sinais excluídos",
                }),
                s.jsx("button", {
                  className:
                    "text-xs text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200",
                  onClick: a,
                  children: "Fechar",
                }),
              ],
            }),
            t.length === 0
              ? s.jsx("p", {
                  className: "text-sm text-gray-500 dark:text-dark-400",
                  children: "Nenhum sinal excluído",
                })
              : s.jsx("div", {
                  className: "grid gap-3",
                  children: t.map((l) => {
                    const c = r[l],
                      d = c ? null : Nr(l);
                    return s.jsxs(
                      "div",
                      {
                        className:
                          "flex items-center justify-between rounded-md border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700/40 px-3 py-2",
                        children: [
                          s.jsxs("div", {
                            className: "flex flex-col",
                            children: [
                              s.jsx("span", {
                                className:
                                  "text-sm font-semibold text-gray-900 dark:text-dark-50",
                                children:
                                  c?.coinName || c?.coin || d?.coin || l,
                              }),
                              s.jsx("span", {
                                className:
                                  "text-xs text-gray-500 dark:text-dark-400",
                                children: c
                                  ? `${je(c.buyExchange, c.buyMarket)} → ${je(c.sellExchange, c.sellMarket)}`
                                  : d
                                    ? `${d.buyDisplay} → ${d.sellDisplay}`
                                    : "Informações indisponíveis",
                              }),
                            ],
                          }),
                          s.jsx(Z, {
                            variant: "soft",
                            color: "primary",
                            className: "h-8 px-3 text-sm",
                            onClick: () => n(l),
                            children: "Restaurar",
                          }),
                        ],
                      },
                      l,
                    );
                  }),
                }),
          ],
        })
      : null,
  As = ({
    isOpen: e,
    onClose: a,
    mutedIds: t,
    mutedItems: r,
    onUnsilence: n,
  }) =>
    e
      ? s.jsxs("div", {
          className:
            "mb-6 rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-4 shadow-sm",
          children: [
            s.jsxs("div", {
              className: "flex items-center justify-between mb-3",
              children: [
                s.jsx("h3", {
                  className:
                    "text-sm font-semibold text-gray-900 dark:text-dark-100 uppercase tracking-wide",
                  children: "Sinais silenciados",
                }),
                s.jsx("button", {
                  className:
                    "text-xs text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200",
                  onClick: a,
                  children: "Fechar",
                }),
              ],
            }),
            t.length === 0
              ? s.jsx("p", {
                  className: "text-sm text-gray-500 dark:text-dark-400",
                  children: "Nenhum sinal silenciado",
                })
              : s.jsx("div", {
                  className: "grid gap-3",
                  children: t.map((l) => {
                    const c = r[l],
                      d = c ? null : Nr(l);
                    return s.jsxs(
                      "div",
                      {
                        className:
                          "flex items-center justify-between rounded-md border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700/40 px-3 py-2",
                        children: [
                          s.jsxs("div", {
                            className: "flex flex-col",
                            children: [
                              s.jsx("span", {
                                className:
                                  "text-sm font-semibold text-gray-900 dark:text-dark-50",
                                children:
                                  c?.coinName || c?.coin || d?.coin || l,
                              }),
                              s.jsx("span", {
                                className:
                                  "text-xs text-gray-500 dark:text-dark-400",
                                children: c
                                  ? `${je(c.buyExchange, c.buyMarket)} → ${je(c.sellExchange, c.sellMarket)}`
                                  : d
                                    ? `${d.buyDisplay} → ${d.sellDisplay}`
                                    : "Informações indisponíveis",
                              }),
                            ],
                          }),
                          s.jsx(Z, {
                            variant: "soft",
                            color: "primary",
                            className: "h-8 px-3 text-sm",
                            onClick: () => n(l),
                            children: "Reativar",
                          }),
                        ],
                      },
                      l,
                    );
                  }),
                }),
          ],
        })
      : null,
  Q = ({ title: e, description: a, action: t, children: r }) =>
    s.jsxs("div", {
      className:
        "rounded-2xl border border-gray-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-gray-100/50 transition dark:border-dark-700 dark:bg-dark-800/80 dark:ring-white/5",
      children: [
        s.jsxs("div", {
          className: "mb-4 flex items-start justify-between gap-3",
          children: [
            s.jsxs("div", {
              className: "space-y-1",
              children: [
                s.jsx("p", {
                  className:
                    "text-sm font-semibold text-gray-900 dark:text-dark-50",
                  children: e,
                }),
                a &&
                  s.jsx("p", {
                    className: "text-xs text-gray-500 dark:text-dark-400",
                    children: a,
                  }),
              ],
            }),
            t,
          ],
        }),
        s.jsx("div", {
          className: "space-y-3",
          children: r,
        }),
      ],
    }),
  ve = ({
    label: e,
    placeholder: a = "Selecione...",
    value: t,
    options: r,
    emptyMessage: n = "Nenhum resultado encontrado",
    onChange: l,
  }) => {
    const [c, d] = p.useState(""),
      m = p.useMemo(() => {
        const g = c.toLowerCase();
        return r
          .filter((N) => N.toLowerCase().includes(g))
          .sort((N, C) => {
            const O = t.includes(N),
              R = t.includes(C);
            return O === R ? 0 : O ? -1 : 1;
          });
      }, [r, c, t]),
      u = (g) => {
        t.includes(g) ? l(t.filter((y) => y !== g)) : l([...t, g]);
      },
      o = () => {
        const g = new Set(t);
        (m.forEach((y) => g.add(y)), l(Array.from(g)));
      },
      f = () => {
        const g = new Set(m);
        l(t.filter((y) => !g.has(y)));
      },
      h = p.useMemo(
        () =>
          t.length === 0
            ? a
            : t.length === 1
              ? t[0]
              : t.length <= 3
                ? t.join(", ")
                : `${t.length} selecionados`,
        [t, a],
      ),
      x = p.useRef(null),
      S = br({
        count: m.length,
        getScrollElement: () => x.current,
        estimateSize: () => 36,
        overscan: 5,
      });
    return s.jsxs("div", {
      className: "space-y-2",
      children: [
        s.jsxs("div", {
          className: "flex items-center justify-between gap-2",
          children: [
            s.jsx("p", {
              className:
                "text-sm font-semibold text-gray-900 dark:text-dark-50",
              children: e,
            }),
            t.length > 0 &&
              s.jsxs("span", {
                className:
                  "text-xs font-medium text-primary-600 dark:text-primary-200",
                children: [t.length, " selecionado", t.length > 1 ? "s" : ""],
              }),
          ],
        }),
        s.jsx(hr, {
          className: "relative",
          children: ({ open: g }) =>
            s.jsxs(s.Fragment, {
              children: [
                s.jsxs(fr, {
                  className: z(
                    "flex w-full items-center justify-between rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2.5 text-left text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-dark-600 dark:bg-dark-800/80 dark:focus:border-primary-500 dark:focus:ring-primary-500/30",
                    g &&
                      "border-primary-500 ring-2 ring-primary-100 dark:ring-primary-500/30",
                  ),
                  children: [
                    s.jsx("span", {
                      className: z(
                        "block truncate",
                        t.length === 0 && "text-gray-400 dark:text-dark-400",
                      ),
                      children: h,
                    }),
                    s.jsx(dr, {
                      className: "size-4 text-gray-400",
                    }),
                  ],
                }),
                s.jsxs(pr, {
                  transition: !0,
                  anchor: "bottom start",
                  className:
                    "z-[60] w-[var(--button-width)] rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-dark-600 dark:bg-dark-800 transition duration-200 ease-out data-[closed]:-translate-y-1 data-[closed]:opacity-0 [--anchor-gap:4px]",
                  children: [
                    s.jsxs("div", {
                      className:
                        "p-2 border-b border-gray-100 dark:border-dark-700 space-y-2",
                      children: [
                        s.jsxs("div", {
                          className: "relative",
                          children: [
                            s.jsx(xr, {
                              className:
                                "absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400",
                            }),
                            s.jsx("input", {
                              type: "text",
                              className:
                                "w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-900/50 dark:text-white",
                              placeholder: "Buscar...",
                              value: c,
                              onChange: (y) => d(y.target.value),
                            }),
                          ],
                        }),
                        s.jsxs("div", {
                          className: "flex items-center justify-between px-1",
                          children: [
                            s.jsx("button", {
                              type: "button",
                              onClick: o,
                              className:
                                "text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300",
                              children: "Selecionar Todos",
                            }),
                            s.jsx("button", {
                              type: "button",
                              onClick: f,
                              className:
                                "text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                              children: "Limpar",
                            }),
                          ],
                        }),
                      ],
                    }),
                    s.jsx("div", {
                      ref: x,
                      className:
                        "max-h-60 overflow-y-auto p-1 custom-scrollbar",
                      children:
                        m.length === 0
                          ? s.jsx("div", {
                              className:
                                "px-3 py-2 text-sm text-gray-500 dark:text-dark-300",
                              children: n,
                            })
                          : s.jsx("div", {
                              style: {
                                height: `${S.getTotalSize()}px`,
                                width: "100%",
                                position: "relative",
                              },
                              children: S.getVirtualItems().map((y) => {
                                const N = m[y.index],
                                  C = t.includes(N);
                                return s.jsx(
                                  "div",
                                  {
                                    style: {
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      width: "100%",
                                      height: `${y.size}px`,
                                      transform: `translateY(${y.start}px)`,
                                    },
                                    children: s.jsxs("label", {
                                      className: z(
                                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-dark-700/50 h-full",
                                        C &&
                                          "bg-primary-50/50 dark:bg-primary-900/10",
                                      ),
                                      children: [
                                        s.jsx(Qr, {
                                          checked: C,
                                          onChange: () => u(N),
                                          className:
                                            "size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700",
                                        }),
                                        s.jsx("span", {
                                          className:
                                            "text-sm text-gray-700 dark:text-dark-100 truncate",
                                          children: N,
                                        }),
                                      ],
                                    }),
                                  },
                                  N,
                                );
                              }),
                            }),
                    }),
                  ],
                }),
              ],
            }),
        }),
      ],
    });
  },
  zs = ({ label: e, description: a, checked: t, onChange: r }) =>
    s.jsxs("div", {
      className: z(
        "flex items-center justify-between gap-3 rounded-xl border p-4 transition",
        t
          ? "border-primary-500/70 bg-primary-50/70 shadow-sm ring-1 ring-primary-200/60 dark:border-primary-500/50 dark:bg-primary-900/30 dark:ring-primary-700/40"
          : "border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800",
      ),
      children: [
        s.jsxs("div", {
          className: "space-y-1",
          children: [
            s.jsx("p", {
              className:
                "text-sm font-semibold text-gray-900 dark:text-dark-50",
              children: e,
            }),
            s.jsx("p", {
              className: "text-xs text-gray-500 dark:text-dark-400",
              children: a,
            }),
          ],
        }),
        s.jsx(Zr, {
          checked: t,
          onChange: (n) => r(n.target.checked),
          "aria-label": e,
        }),
      ],
    }),
  Ke = () =>
    typeof crypto < "u" && typeof crypto.randomUUID == "function"
      ? crypto.randomUUID()
      : `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  Ds = (e) => !!(e.alertProfitHit || e.alertTelegramHit),
  Bs = () => {
    const e = (t) => {
        if (!t || !t.length) return t || [];
        const r = [],
          n = [];
        return (
          t.forEach((l) => {
            Ds(l.original) ? r.push(l) : n.push(l);
          }),
          r.length ? [...r, ...n] : t
        );
      },
      a = tn();
    return (t) => {
      const r = a(t);
      return () => {
        const n = r();
        return {
          ...n,
          rows: e(n.rows),
          flatRows: e(n.flatRows),
        };
      };
    };
  };

function xa() {
  (Is(), ws());
  const { handleOpenExchanges: e } = on(),
    { user: a } = Jr(),
    t = !!(a?.discordId || a?.discordUsername),
    [r, n] = p.useState(!1),
    [l, c] = p.useState(!1),
    [d, m] = p.useState(!1),
    [u, o] = p.useState(() => be().scanner.filterProfiles),
    [f, h] = p.useState(() => be().scanner.activeProfileId),
    [x, S] = p.useState(null),
    [g, y] = p.useState(null),
    [N, C] = p.useState(null),
    [O, R] = p.useState(!1),
    [I, b] = p.useState(!1),
    [w, M] = p.useState([]),
    [E, F] = p.useState(""),
    [T, L] = p.useState(null),
    B = p.useMemo(() => ys(), []),
    ee = p.useMemo(() => bs(), []),
    { rows: oe, total: H } = j(B),
    Ee = j(ee),
    de = p.useMemo(() => Bs(), []),
    pe = j((i) => i.sorting),
    ge = j((i) => i.setSorting),
    tt = j(
      (i) => ({
        pageIndex: i.pageIndex,
        pageSize: i.pageSize,
      }),
      Gt,
    ),
    jr = j((i) => i.setPagination),
    D = j((i) => i.filters),
    G = j((i) => i.setFilters),
    rt = j((i) => i.searchTerm),
    nt = j((i) => i.setSearchTerm),
    {
      connectionStatus: xe,
      lastUpdate: st,
      isLive: at,
      isPaused: ue,
    } = j(
      (i) => ({
        connectionStatus: i.connectionStatus,
        lastUpdate: i.lastUpdate,
        isLive: i.isLive,
        isPaused: i.isPaused,
      }),
      Gt,
    ),
    me = j((i) => i.removedIds),
    Ie = j((i) => i.removedItems),
    le = j((i) => i.mutedAlerts),
    it = j((i) => i.pinSignal),
    ot = j((i) => i.unpinSignal),
    lt = j((i) => i.removeSignal),
    ct = j((i) => i.restoreSignal),
    dt = j((i) => i.hydratePinned),
    Ce = j((i) => i.hydrateRemovedSignals),
    Re = j((i) => i.hydrateMutedAlerts),
    ut = j((i) => i.pinnedById),
    mt = j((i) => i.signalsById),
    ye = j((i) => i.pinnedOrder),
    Me = j((i) => i.togglePause),
    Pe = p.useMemo(() => Array.from(le), [le]),
    Er = p.useMemo(() => {
      const i = {
          ...mt,
          ...ut,
          ...Ie,
        },
        k = {};
      return (
        Pe.forEach((v) => {
          i[v] && (k[v] = i[v]);
        }),
        k
      );
    }, [Pe, mt, ut, Ie]),
    Oe = p.useRef(!1),
    ht = p.useRef(!1);
  (p.useEffect(() => {
    let i = !0;
    return (
      (async () => {
        try {
          const v = await Tt();
          if (!i) return;
          (Ce(v.scanner.removedSignals), Re(v.scanner.mutedSignals));
          const P =
              v.scanner.filterProfiles && v.scanner.filterProfiles.length
                ? v.scanner.filterProfiles
                : be().scanner.filterProfiles,
            $ = P.find((W) => W.id === v.scanner.activeProfileId) || P[0];
          (o(P),
            h($?.id ?? null),
            $ &&
              G({
                ...te,
                ...$.filters,
              }));
          const U = localStorage.getItem("authToken");
          if (U)
            try {
              const V = (
                  await $e.get("http://localhost:8000/panels", {
                    headers: {
                      Authorization: `Bearer ${U}`,
                    },
                  })
                ).data,
                q = Array.isArray(V)
                  ? V
                  : Array.isArray(V?.items)
                    ? V.items
                    : [];
              if (!i) return;
              (M(q),
                q.length > 0 && v.scanner.selectedMonitoringPanelId
                  ? F(v.scanner.selectedMonitoringPanelId)
                  : q.length > 0 && F(q[0].id));
            } catch (W) {
              console.error("Erro ao carregar painéis de monitoramento:", W);
            }
        } catch (v) {
          if (
            (console.error("Erro ao carregar preferências do scanner", v), !i)
          )
            return;
          const P = be();
          (Ce(P.scanner.removedSignals), Re(P.scanner.mutedSignals));
          const $ = P.scanner.filterProfiles,
            U = $.find((W) => W.id === P.scanner.activeProfileId) || $[0];
          (o($),
            h(U?.id ?? null),
            U &&
              G({
                ...te,
                ...U.filters,
              }));
        } finally {
          Oe.current = !0;
        }
      })(),
      () => {
        i = !1;
      }
    );
  }, [Re, Ce, G]),
    p.useEffect(() => {
      if (Oe.current && u.length === 0) {
        const i = {
          id: Ke(),
          name: "Padrão",
          filters: {
            ...te,
          },
        };
        (o([i]), h(i.id), G(i.filters));
      }
    }, [u.length, G]),
    p.useEffect(() => {
      if (!Oe.current) return;
      if (!ht.current) {
        ht.current = !0;
        return;
      }
      if (!u.length) return;
      (async () => {
        try {
          await gn({
            scanner: {
              filterProfiles: u,
              activeProfileId: f,
              removedSignals: me,
              mutedSignals: Array.from(le),
              selectedMonitoringPanelId: E,
            },
          });
        } catch (k) {
          console.error("Erro ao salvar preferências do scanner", k);
        }
      })();
    }, [u, f, me, le, E]),
    p.useEffect(() => {
      const i = Cs();
      i.ids.length > 0 && i.data.length > 0 && dt(i.ids, i.data);
    }, [dt]),
    p.useEffect(() => {
      Rs(ye, j.getState().pinnedById);
    }, [ye]),
    p.useEffect(() => {
      const i = (k) => {
        if (k.metaKey || k.ctrlKey || k.altKey || k.key.toLowerCase() !== "p")
          return;
        const v = k.target,
          P = v?.tagName;
        v?.isContentEditable ||
          P === "INPUT" ||
          P === "TEXTAREA" ||
          P === "SELECT" ||
          (k.preventDefault(), Me());
      };
      return (
        window.addEventListener("keydown", i),
        () => window.removeEventListener("keydown", i)
      );
    }, [Me]));
  const ft = p.useCallback(
      (i) => {
        if (!i.isPinned && ye.length >= 10) {
          X.error("Você pode fixar no máximo 10 sinais.");
          return;
        }
        i.isPinned ? ot(i.pinKey) : it(i);
      },
      [it, ye.length, ot],
    ),
    pt = p.useCallback(
      (i) => {
        lt(i);
      },
      [lt],
    ),
    Fe = j((i) => i.toggleMuteAlert),
    gt = p.useCallback(
      (i) => {
        Fe(i.pinKey, i.pinAliases);
      },
      [Fe],
    ),
    xt = p.useCallback(
      (i) => {
        const k =
          i.coin ||
          (i.coinName ? `${i.coinName.toUpperCase()}/USDT` : i.coinName);
        e({
          id: i.pinKey || i.id,
          symbol: k || i.id,
          buyExchange: i.buyExchange,
          sellExchange: i.sellExchange,
          buyMarket: A(i.buyMarket),
          sellMarket: A(i.sellMarket),
          createdAt: i.lastSeen,
        });
      },
      [e],
    ),
    Ir = p.useCallback(
      (i) => {
        const k =
          i.coin ||
          (i.coinName ? `${i.coinName.toUpperCase()}/USDT` : i.coinName);
        e(
          {
            id: i.pinKey || i.id,
            symbol: k || i.id,
            buyExchange: i.buyExchange,
            sellExchange: i.sellExchange,
            buyMarket: A(i.buyMarket),
            sellMarket: A(i.sellMarket),
            createdAt: i.lastSeen,
          },
          {
            skipExchanges: !0,
          },
        );
      },
      [e],
    ),
    yt = p.useCallback((i) => {
      const k =
        i.coinName?.toUpperCase() ||
        (i.coin ? i.coin.replace(/\/USDT$/i, "").toUpperCase() : i.id);
      S({
        id: i.pinKey || i.id,
        symbol: k,
        buyExchange: i.buyExchange,
        sellExchange: i.sellExchange,
        buyMarket: A(i.buyMarket),
        sellMarket: A(i.sellMarket),
      });
    }, []),
    Cr = p.useCallback((i) => ct(i), [ct]),
    bt = p.useCallback(
      (i) => {
        if (i?.trim()) return i.trim();
        const k = a?.name?.trim() || "",
          v = a?.email?.trim() || "";
        return k && v
          ? `Compartilhado por ${k} (${v})`
          : k
            ? `Compartilhado por ${k}`
            : v
              ? `Compartilhado por ${v}`
              : "Compartilhado por usuario autenticado";
      },
      [a?.email, a?.name],
    ),
    St = p.useCallback((i) => {
      const v = (i.coin?.trim() || i.coinName?.trim() || i.id).toUpperCase();
      return v.includes("/") ? v : `${v}/USDT`;
    }, []),
    kt = p.useCallback(
      (i) => {
        if (!(g || O)) {
          if (!t) {
            b(!0);
            return;
          }
          C(i);
        }
      },
      [t, O, g],
    ),
    Rr = p.useCallback(() => {
      O || C(null);
    }, [O]),
    Mr = p.useCallback(async () => {
      if (!N || g) return;
      if (!t) {
        (C(null), b(!0));
        return;
      }
      const i = window.localStorage.getItem("authToken");
      if (!i) {
        (X.error("Faca login para compartilhar no Discord."), C(null));
        return;
      }
      const k = yn?.trim() || "",
        v = Number.isFinite(N.result) ? N.result : 0,
        P =
          typeof N.exitSpread == "number" && Number.isFinite(N.exitSpread)
            ? N.exitSpread
            : 0,
        $ = {
          symbol: St(N),
          buyExchange: ne(N.buyExchange),
          sellExchange: ne(N.sellExchange),
          buyMarket: A(N.buyMarket),
          sellMarket: A(N.sellMarket),
          entrySpread: v,
          exitSpread: P,
          channelId: k,
          content: bt(),
        };
      (y(N.pinKey), R(!0));
      try {
        const U = await fetch(
            `${Xr.replace(/\/$/, "")}/integrations/discord/share-card`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${i}`,
              },
              body: JSON.stringify($),
            },
          ),
          W = await U.text();
        let _ = W;
        try {
          _ = W ? JSON.parse(W) : null;
        } catch {}
        if (!U.ok) {
          const V =
            (_ &&
              typeof _ == "object" &&
              ("message" in _ ? _.message : "error" in _ ? _.error : null)) ||
            W ||
            "Nao foi possivel compartilhar no Discord.";
          throw new Error(
            typeof V == "string"
              ? V
              : "Nao foi possivel compartilhar no Discord.",
          );
        }
        X.success("Sinal enviado para o Discord.");
      } catch (U) {
        (console.error("Erro ao compartilhar no Discord", U),
          X.error(U?.message || "Erro ao compartilhar no Discord."));
      } finally {
        (R(!1), y(null), C(null));
      }
    }, [N, t, bt, St, g]),
    vt = p.useCallback(
      async (i) => {
        if (T || !E) return;
        if (!E) {
          X.error("Selecione um painel de monitoramento nos filtros.");
          return;
        }
        const k = localStorage.getItem("authToken");
        if (!k) {
          X.error("Faça login para salvar no monitoramento.");
          return;
        }
        L(i.pinKey);
        try {
          const v = "http://localhost:8000",
            $ = (await Tt()).monitoring.globalMinLiquidity,
            U = $ && $ > 0 ? $ : 50,
            _ = (
              await $e.get(`${v}/cards`, {
                headers: {
                  Authorization: `Bearer ${k}`,
                },
              })
            ).data,
            q = (
              Array.isArray(_) ? _ : Array.isArray(_?.items) ? _.items : []
            ).filter((J) => J.panelId === E),
            ze = i.coinName || i.coin || i.id,
            De = ze.toUpperCase().includes("/")
              ? ze.toUpperCase()
              : `${ze.toUpperCase()}/USDT`,
            It = ne(i.buyExchange),
            Ct = ne(i.sellExchange),
            Rt = A(i.buyMarket),
            Mt = A(i.sellMarket);
          if (
            q.some((J) => {
              const Be = (J.symbol || "").toUpperCase();
              return (
                (Be.includes("/") ? Be : `${Be}/USDT`) === De &&
                (J.buyExchange || "").toLowerCase() === It.toLowerCase() &&
                (J.sellExchange || "").toLowerCase() === Ct.toLowerCase() &&
                (J.buyMarket || "").toLowerCase() === Rt.toLowerCase() &&
                (J.sellMarket || "").toLowerCase() === Mt.toLowerCase()
              );
            })
          ) {
            (X.error("Este monitoramento já existe no painel selecionado!"),
              L(null));
            return;
          }
          const Ur = q.length > 0 ? Math.max(...q.map((J) => J.order ?? 0)) : 0,
            Lr = {
              panelId: E,
              symbol: De,
              buyExchange: It,
              sellExchange: Ct,
              buyMarket: Rt,
              sellMarket: Mt,
              minLiquidity: U,
              order: Ur + 1,
            };
          (await $e.post(`${v}/cards`, Lr, {
            headers: {
              Authorization: `Bearer ${k}`,
            },
          }),
            X.success(`Sinal ${De} salvo no monitoramento!`));
        } catch (v) {
          (console.error("Erro ao salvar no monitoramento:", v),
            X.error("Erro ao salvar sinal no monitoramento."));
        } finally {
          L(null);
        }
      },
      [E, T],
    ),
    Te = p.useMemo(
      () =>
        es({
          onTogglePin: ft,
          onRemove: pt,
          onToggleNotify: gt,
          onOpenExchanges: xt,
          onOpenHistory: yt,
          onShareDiscord: kt,
          onSaveToMonitoring: vt,
          sharingSignalId: g,
          savingSignalId: T,
        }),
      [ft, pt, gt, xt, yt, kt, vt, g, T],
    ),
    Pr = Pt({
      data: Ee,
      columns: Te,
      state: {
        sorting: pe,
      },
      onSortingChange: ge,
      getCoreRowModel: Ot(),
      getSortedRowModel: de,
      getRowId: (i) => i.pinKey,
    }),
    Ae = Pt({
      data: oe,
      columns: Te,
      state: {
        sorting: pe,
        pagination: tt,
      },
      pageCount: Math.max(1, Math.ceil((H || 0) / (tt.pageSize || 1))),
      manualPagination: !0,
      onSortingChange: ge,
      onPaginationChange: jr,
      getCoreRowModel: Ot(),
      getSortedRowModel: de,
      getRowId: (i) => i.pinKey,
      meta: {
        totalRowCount: H,
      },
    }),
    Or = () => {
      const i = prompt("Nome do perfil:");
      if (!i) return;
      const k = {
          ...D,
        },
        v = {
          id: Ke(),
          name: i,
          filters: k,
        };
      (o((P) => [...P, v]), h(v.id), G(k));
    },
    wt = (i) => {
      const k = u.find((v) => v.id === i);
      k &&
        (G({
          ...te,
          ...k.filters,
        }),
        h(i));
    },
    Fr = (i) => {
      if (confirm("Tem certeza que deseja excluir este perfil?")) {
        const k = u.filter((v) => v.id !== i);
        if (k.length === 0) {
          const v = {
            id: Ke(),
            name: "Padrão",
            filters: {
              ...te,
            },
          };
          (o([v]), h(v.id), G(v.filters));
          return;
        }
        if ((o(k), f === i)) {
          const v = k[0];
          (h(v.id), G(v.filters));
        }
      }
    },
    [Nt, Tr] = p.useState([]),
    [he, Ar] = p.useState([]),
    [jt, Et] = p.useState(!1),
    zr = p.useMemo(() => [...he, ...he.map((i) => `${i} (Futuro)`)], [he]),
    Dr = p.useMemo(() => he.map((i) => `${i} (Futuro)`), [he]);
  p.useEffect(() => {
    (async () => {
      Et(!0);
      try {
        const k = "http://localhost:8000".replace(/\/$/, ""),
          [v, P] = await Promise.all([un(), fetch(`${k}/catalog/exchanges`)]),
          $ = (v.data || []).map((V) => {
            const q = String(V).trim().toUpperCase();
            return q.includes("/") ? q : `${q}/USDT`;
          }),
          U = Array.from(new Set($)).sort();
        Tr(U);
        const _ = ((await P.json())?.items || [])
          .filter((V) => V.is_active)
          .map((V) => V.slug);
        Ar(_);
      } catch (k) {
        console.error("Erro ao carregar dados", k);
      } finally {
        Et(!1);
      }
    })();
  }, []);
  const K = p.useCallback(
      (i) => {
        const k = {
          ...D,
          ...i,
        };
        (G(k),
          f &&
            o((v) =>
              v.map((P) =>
                P.id === f
                  ? {
                      ...P,
                      filters: k,
                    }
                  : P,
              ),
            ));
      },
      [D, G, f],
    ),
    Br = p.useCallback(
      (i, k) => {
        const v = k
          ? Array.from(new Set([...D.opportunityTypes, i]))
          : D.opportunityTypes.filter((P) => P !== i);
        K({
          opportunityTypes: v,
        });
      },
      [D.opportunityTypes, K],
    ),
    $r = xe !== "open" || !at;
  return s.jsxs(rn, {
    title: "Scanner de Arbitragem",
    children: [
      s.jsxs("div", {
        className:
          "transition-content w-full px-(--margin-x) pb-10 pt-5 lg:pt-6",
        children: [
          s.jsxs("div", {
            className:
              "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6",
            children: [
              s.jsxs("div", {
                className: "flex flex-col gap-1",
                children: [
                  s.jsx("h1", {
                    className:
                      "text-2xl font-bold text-gray-900 dark:text-dark-50",
                    children: "Scanner de Arbitragem",
                  }),
                  s.jsx("p", {
                    className: "text-sm text-gray-500 dark:text-dark-300",
                    children:
                      "Encontre oportunidades de arbitragem entre corretoras",
                  }),
                  s.jsxs("div", {
                    className: "flex flex-wrap items-center gap-2",
                    children: [
                      s.jsxs("span", {
                        className: z(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          Ps[xe],
                        ),
                        children: [
                          s.jsx("span", {
                            className: z("size-2.5 rounded-full", Os[xe]),
                          }),
                          Ms(at)[xe],
                        ],
                      }),
                      st &&
                        s.jsxs("span", {
                          className: "text-xs text-gray-500 dark:text-dark-400",
                          children: ["Atualizado ", Fs(st)],
                        }),
                    ],
                  }),
                ],
              }),
              s.jsx("div", {
                className: "w-full sm:w-auto",
                children: s.jsxs("div", {
                  className:
                    "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3",
                  children: [
                    s.jsx("div", {
                      className: "flex-1 min-w-[220px]",
                      children: s.jsx(se, {
                        placeholder: "Buscar sinais",
                        value: rt,
                        onChange: (i) => nt(i.target.value),
                        prefix: s.jsx(xr, {
                          className: "size-4 text-gray-400 dark:text-dark-400",
                        }),
                        suffix: rt
                          ? s.jsx("button", {
                              type: "button",
                              onClick: () => nt(""),
                              className:
                                "flex h-full items-center justify-center rounded-full text-gray-400 transition hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200",
                              "aria-label": "Limpar busca",
                              children: s.jsx(qe, {
                                className: "size-4",
                              }),
                            })
                          : void 0,
                        className:
                          "h-10 rounded-lg border-gray-200 bg-white text-sm dark:border-dark-700 dark:bg-dark-900/60",
                        classNames: {
                          wrapper:
                            "rounded-lg ring-1 ring-gray-100/70 focus-within:ring-2 focus-within:ring-primary-100 dark:ring-white/5 dark:focus-within:ring-primary-500/30",
                        },
                        "aria-label": "Buscar sinais",
                      }),
                    }),
                    s.jsxs("div", {
                      className: "flex flex-wrap items-center gap-1.5 sm:gap-2",
                      children: [
                        s.jsxs(Z, {
                          variant: "soft",
                          color: ue ? "primary" : "neutral",
                          className: "h-10 gap-1.5 px-3 text-xs font-semibold",
                          title: ue ? "Retomar (P)" : "Pausar (P)",
                          "aria-label": ue ? "Retomar" : "Pausar",
                          onClick: Me,
                          children: [
                            ue
                              ? s.jsx(Vn, {
                                  className: "size-4.5",
                                })
                              : s.jsx(Ln, {
                                  className: "size-4.5",
                                }),
                            s.jsx("span", {
                              className: "hidden sm:inline",
                              children: ue ? "Retomar" : "Pausar",
                            }),
                          ],
                        }),
                        s.jsxs(Z, {
                          variant: "soft",
                          color: "primary",
                          className: "h-10 gap-1.5 px-3 text-xs font-semibold",
                          title: "Filtros",
                          "aria-label": "Filtros",
                          onClick: () => m(!0),
                          children: [
                            s.jsx(mr, {
                              className: "size-4.5",
                            }),
                            s.jsx("span", {
                              className: "hidden sm:inline",
                              children: "Filtros",
                            }),
                          ],
                        }),
                        s.jsxs(Z, {
                          variant: "soft",
                          color: "neutral",
                          className:
                            "relative h-10 gap-1.5 px-3 text-xs font-semibold",
                          title: "Sinais excluídos",
                          "aria-label": "Sinais excluídos",
                          onClick: () => n((i) => !i),
                          children: [
                            s.jsx(Dt, {
                              className: "size-4.5",
                            }),
                            s.jsx("span", {
                              className: "hidden sm:inline",
                              children: "Excluídos",
                            }),
                            me.length > 0 &&
                              s.jsx("span", {
                                className:
                                  "absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white shadow-sm",
                                children: me.length,
                              }),
                          ],
                        }),
                        s.jsxs(Z, {
                          variant: "soft",
                          color: "neutral",
                          className:
                            "relative h-10 gap-1.5 px-3 text-xs font-semibold",
                          title: "Sinais silenciados",
                          "aria-label": "Sinais silenciados",
                          onClick: () => c((i) => !i),
                          children: [
                            s.jsx(Cn, {
                              className: "size-4.5",
                            }),
                            s.jsx("span", {
                              className: "hidden sm:inline",
                              children: "Silenciados",
                            }),
                            le.size > 0 &&
                              s.jsx("span", {
                                className:
                                  "absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white shadow-sm",
                                children: le.size,
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
          s.jsx(Ts, {
            isOpen: r,
            onClose: () => n(!1),
            removedIds: me,
            removedItems: Ie,
            onRestore: Cr,
          }),
          s.jsx(As, {
            isOpen: l,
            onClose: () => c(!1),
            mutedIds: Pe,
            mutedItems: Er,
            onUnsilence: (i) => Fe(i),
          }),
          s.jsx(qn, {
            mainTable: Ae,
            pinnedTable: Pr,
            columnsLength: Te.length,
            isLoading: $r,
            onRowDoubleClick: Ir,
          }),
          Ae.getRowModel().rows.length > 0 &&
            s.jsx("div", {
              className:
                "border-t border-gray-200 dark:border-dark-700 px-6 py-4",
              children: s.jsx(en, {
                table: Ae,
              }),
            }),
        ],
      }),
      s.jsx(ln, {
        isOpen: !!x,
        onClose: () => S(null),
        card: x,
      }),
      s.jsx(cn, {
        isOpen: !!N,
        onClose: Rr,
        onConfirm: Mr,
        isLoading: O,
        symbol: N?.coinName || N?.coin || "Oportunidade",
        buyExchange: N?.buyExchange || "",
        sellExchange: N?.sellExchange || "",
        entrySpread: N?.result,
        exitSpread: N?.exitSpread,
      }),
      s.jsx(dn, {
        isOpen: I,
        onClose: () => b(!1),
      }),
      s.jsx(wn, {
        appear: !0,
        show: d,
        as: p.Fragment,
        children: s.jsxs(Nn, {
          as: "div",
          className: "relative z-50",
          onClose: () => m(!1),
          children: [
            s.jsx($t, {
              as: p.Fragment,
              enter: "ease-out duration-200",
              enterFrom: "opacity-0",
              enterTo: "opacity-100",
              leave: "ease-in duration-150",
              leaveFrom: "opacity-100",
              leaveTo: "opacity-0",
              children: s.jsx("div", {
                className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
              }),
            }),
            s.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: s.jsx("div", {
                className: "flex min-h-full items-center justify-center p-4",
                children: s.jsxs($t, {
                  as: jn,
                  className:
                    "w-full max-w-5xl rounded-2xl bg-white dark:bg-dark-800 p-6 shadow-2xl transition dark:border dark:border-dark-700",
                  children: [
                    s.jsxs("div", {
                      className: "flex items-start justify-between gap-4 mb-6",
                      children: [
                        s.jsxs("div", {
                          children: [
                            s.jsx(En, {
                              className:
                                "text-lg font-bold text-gray-900 dark:text-dark-50",
                              children: "Configurar Filtros",
                            }),
                            s.jsx("p", {
                              className:
                                "text-sm text-gray-500 dark:text-dark-400 mt-1",
                              children:
                                "Configure os filtros para encontrar oportunidades de arbitragem",
                            }),
                          ],
                        }),
                        s.jsx("button", {
                          onClick: () => m(!1),
                          className:
                            "text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200 transition",
                          title: "Fechar",
                          children: s.jsx(qe, {
                            className: "size-5",
                          }),
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      className: "space-y-5 max-h-[70vh] overflow-y-auto pr-2",
                      children: [
                        s.jsx(Q, {
                          title: "Perfis de Filtro",
                          description:
                            "Todos os ajustes ficam dentro de um perfil. Escolha um para editar; salvamos automaticamente.",
                          action: s.jsxs(Z, {
                            variant: "soft",
                            color: "primary",
                            className: "gap-2 h-9 px-4 text-sm",
                            onClick: Or,
                            children: [
                              s.jsx(vn, {
                                className: "size-4",
                              }),
                              "Criar Perfil",
                            ],
                          }),
                          children:
                            u.length > 0
                              ? s.jsxs("div", {
                                  className: "grid gap-3 sm:grid-cols-2",
                                  children: [
                                    u.map((i) => {
                                      const k = f === i.id,
                                        v = (P) => {
                                          (P.key === "Enter" ||
                                            P.key === " ") &&
                                            (P.preventDefault(), wt(i.id));
                                        };
                                      return s.jsx(
                                        "div",
                                        {
                                          role: "button",
                                          tabIndex: 0,
                                          onClick: () => wt(i.id),
                                          onKeyDown: v,
                                          className: z(
                                            "group relative flex flex-col gap-3 rounded-xl border px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-700/60",
                                            k
                                              ? "border-primary-500 bg-primary-50/80 ring-1 ring-primary-200/80 dark:border-primary-500 dark:bg-primary-900/30 dark:ring-primary-700/60"
                                              : "border-gray-200 bg-white hover:border-primary-200 dark:border-dark-600 dark:bg-dark-800 dark:hover:border-primary-600/60",
                                          ),
                                          children: s.jsxs("div", {
                                            className:
                                              "flex items-start justify-between gap-3",
                                            children: [
                                              s.jsxs("div", {
                                                className: "space-y-1",
                                                children: [
                                                  s.jsx("p", {
                                                    className:
                                                      "text-sm font-semibold text-gray-900 dark:text-dark-50",
                                                    children: i.name,
                                                  }),
                                                  s.jsx("p", {
                                                    className:
                                                      "text-xs text-gray-500 dark:text-dark-400",
                                                    children:
                                                      "Clique para ativar e editar os filtros deste perfil.",
                                                  }),
                                                ],
                                              }),
                                              s.jsxs("div", {
                                                className:
                                                  "flex items-center gap-2",
                                                children: [
                                                  k
                                                    ? s.jsxs("span", {
                                                        className:
                                                          "inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-200 dark:bg-primary-900/50 dark:text-primary-100 dark:ring-primary-700/60",
                                                        children: [
                                                          s.jsx(Bt, {
                                                            className:
                                                              "size-3.5",
                                                          }),
                                                          "Ativo",
                                                        ],
                                                      })
                                                    : s.jsx("span", {
                                                        className:
                                                          "text-[11px] font-medium text-gray-500 group-hover:text-primary-600 dark:text-dark-400 dark:group-hover:text-primary-200",
                                                        children: "Selecionar",
                                                      }),
                                                  s.jsx("button", {
                                                    type: "button",
                                                    onClick: (P) => {
                                                      (P.stopPropagation(),
                                                        Fr(i.id));
                                                    },
                                                    className:
                                                      "btn-base btn this:error text-this-darker bg-this-darker/[.08] hover:bg-this-darker/[.15] focus:bg-this-darker/[.15] active:focus:bg-this-darker/20 dark:bg-this-lighter/10 dark:text-this-lighter dark:hover:bg-this-lighter/20 dark:focus:bg-this-lighter/20 dark:active:bg-this-lighter/25 size-8 shrink-0 p-0",
                                                    "aria-label": `Excluir filtro ${i.name}`,
                                                    title: "Excluir perfil",
                                                    children: s.jsx(Dt, {
                                                      className:
                                                        "size-4 transition-transform group-hover/delete:scale-110",
                                                    }),
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                        },
                                        i.id,
                                      );
                                    }),
                                    u.length === 1 &&
                                      s.jsx("div", {
                                        className:
                                          "rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-dark-600 dark:bg-dark-800/50 dark:text-dark-200",
                                        children:
                                          "Use “Criar Perfil” para separar estratégias diferentes.",
                                      }),
                                  ],
                                })
                              : s.jsx("p", {
                                  className:
                                    "py-2 text-center text-sm text-gray-500 dark:text-dark-400",
                                  children: "Nenhum perfil salvo",
                                }),
                        }),
                        s.jsxs("div", {
                          className: "grid gap-4 lg:grid-cols-2",
                          children: [
                            s.jsx(Q, {
                              title: "Filtro de Moedas",
                              description:
                                "Selecione pares específicos que deseja visualizar.",
                              children: s.jsx(ve, {
                                label: "Moedas",
                                placeholder: "Escolha as moedas para exibir",
                                value: D.whitelist,
                                options: Nt,
                                emptyMessage: jt
                                  ? "Carregando moedas..."
                                  : "Nenhuma moeda encontrada",
                                onChange: (i) =>
                                  K({
                                    whitelist: i,
                                  }),
                              }),
                            }),
                            s.jsx(Q, {
                              title: "Lista negra",
                              description:
                                "Selecione pares que deseja ocultar.",
                              children: s.jsx(ve, {
                                label: "Moedas",
                                placeholder: "Escolha as moedas para ocultar",
                                value: D.blacklist,
                                options: Nt,
                                emptyMessage: jt
                                  ? "Carregando moedas..."
                                  : "Nenhuma moeda encontrada",
                                onChange: (i) =>
                                  K({
                                    blacklist: i,
                                  }),
                              }),
                            }),
                          ],
                        }),
                        s.jsxs("div", {
                          className: "grid gap-4 lg:grid-cols-2",
                          children: [
                            s.jsxs(Q, {
                              title: "Corretoras",
                              description:
                                "Escolha onde comprar e vender ou deixe vazio para todas.",
                              children: [
                                s.jsx(ve, {
                                  label: "Compra",
                                  placeholder: "Selecione corretoras de compra",
                                  value: D.exchange1,
                                  options: zr,
                                  onChange: (i) =>
                                    K({
                                      exchange1: i,
                                    }),
                                }),
                                s.jsx(ve, {
                                  label: "Venda",
                                  placeholder: "Selecione corretoras de venda",
                                  value: D.exchange2,
                                  options: Dr,
                                  onChange: (i) =>
                                    K({
                                      exchange2: i,
                                    }),
                                }),
                              ],
                            }),
                            s.jsx(Q, {
                              title: "Tipos de oportunidade",
                              description:
                                "Use os switches para focar no estilo de operação.",
                              children: s.jsxs("div", {
                                className: "space-y-3",
                                children: [
                                  pn.map((i) =>
                                    s.jsx(
                                      zs,
                                      {
                                        label: i.label,
                                        description: i.description,
                                        checked: D.opportunityTypes.includes(
                                          i.value,
                                        ),
                                        onChange: (k) => Br(i.value, k),
                                      },
                                      i.value,
                                    ),
                                  ),
                                  s.jsx("p", {
                                    className:
                                      "text-xs text-gray-500 dark:text-dark-400",
                                    children:
                                      "Deixe desmarcado para visualizar todos os tipos.",
                                  }),
                                ],
                              }),
                            }),
                          ],
                        }),
                        s.jsxs("div", {
                          className: "grid gap-4 lg:grid-cols-2",
                          children: [
                            s.jsxs(Q, {
                              title: "Requisitos mínimos",
                              description:
                                "Ajuste tamanho e spread mínimo das oportunidades.",
                              children: [
                                s.jsxs("div", {
                                  className:
                                    "grid grid-cols-1 gap-3 sm:grid-cols-2",
                                  children: [
                                    s.jsx(se, {
                                      type: "number",
                                      min: 0,
                                      value: D.volumeMin,
                                      onChange: (i) =>
                                        K({
                                          volumeMin:
                                            Number(i.target.value) || 0,
                                        }),
                                      placeholder: "Ex: 10000",
                                      label: "Volume mínimo (USDT)",
                                    }),
                                    s.jsx(se, {
                                      type: "number",
                                      min: 0,
                                      step: "0.01",
                                      value: D.spreadMin,
                                      onChange: (i) =>
                                        K({
                                          spreadMin:
                                            Number(i.target.value) || 0,
                                        }),
                                      placeholder: "Ex: 2.5",
                                      label: "Spread mínimo (%)",
                                      suffix: s.jsx("span", {
                                        className: "text-xs font-semibold",
                                        children: "%",
                                      }),
                                    }),
                                  ],
                                }),
                                s.jsxs("div", {
                                  className:
                                    "grid grid-cols-1 gap-3 sm:grid-cols-2",
                                  children: [
                                    s.jsx(se, {
                                      type: "number",
                                      min: 0,
                                      value: D.invertedMin,
                                      onChange: (i) =>
                                        K({
                                          invertedMin:
                                            Number(i.target.value) || 0,
                                        }),
                                      placeholder: "0",
                                      label: "Qtd. mínima de invertidas",
                                    }),
                                    s.jsxs("div", {
                                      className: "flex flex-col gap-1.5",
                                      children: [
                                        s.jsx("label", {
                                          className:
                                            "text-sm font-semibold text-gray-900 dark:text-dark-50",
                                          children: "Janela (invertidas)",
                                        }),
                                        s.jsxs("select", {
                                          value: D.invertedWindow || "4h",
                                          onChange: (i) =>
                                            K({
                                              invertedWindow: i.target.value,
                                            }),
                                          className:
                                            "w-full rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-dark-600 dark:bg-dark-800/80 dark:focus:border-primary-500 dark:focus:ring-primary-500/30",
                                          children: [
                                            s.jsx("option", {
                                              value: "30m",
                                              children: "30m",
                                            }),
                                            s.jsx("option", {
                                              value: "1h",
                                              children: "1h",
                                            }),
                                            s.jsx("option", {
                                              value: "4h",
                                              children: "4h (padrão)",
                                            }),
                                            s.jsx("option", {
                                              value: "8h",
                                              children: "8h",
                                            }),
                                            s.jsx("option", {
                                              value: "24h",
                                              children: "24h",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            s.jsx(Q, {
                              title: "Alertas",
                              description:
                                "Defina limites e preferências de acompanhamento.",
                              children: s.jsxs("div", {
                                className: "grid gap-3 sm:grid-cols-2",
                                children: [
                                  s.jsx(se, {
                                    type: "number",
                                    min: 0,
                                    step: "0.1",
                                    value: D.profitSpreadMin,
                                    onChange: (i) =>
                                      K({
                                        profitSpreadMin:
                                          Number(i.target.value) || 0,
                                      }),
                                    placeholder: "Ex: 2.5",
                                    label: "Notificar Lucro",
                                    suffix: s.jsx("span", {
                                      className: "text-xs font-semibold",
                                      children: "%",
                                    }),
                                  }),
                                  s.jsx(se, {
                                    type: "number",
                                    min: 0,
                                    step: "0.1",
                                    value: D.profitSpreadTelegramMin,
                                    onChange: (i) =>
                                      K({
                                        profitSpreadTelegramMin:
                                          Number(i.target.value) || 0,
                                      }),
                                    placeholder: "Ex: 3.0",
                                    label: "Notificar Lucro (Telegram)",
                                    suffix: s.jsx("span", {
                                      className: "text-xs font-semibold",
                                      children: "%",
                                    }),
                                  }),
                                ],
                              }),
                            }),
                          ],
                        }),
                        s.jsxs("div", {
                          className: "grid gap-4 lg:grid-cols-2",
                          children: [
                            s.jsx(Q, {
                              title: "Atualização da tabela",
                              description:
                                "Controle o tempo entre atualizações visíveis na tabela.",
                              children: s.jsx(se, {
                                type: "number",
                                min: 0,
                                step: "0.05",
                                value: D.tableUpdateSeconds,
                                onChange: (i) =>
                                  K({
                                    tableUpdateSeconds:
                                      Number(i.target.value) || 0,
                                  }),
                                placeholder: `Padrão: ${te.tableUpdateSeconds}s`,
                                label: "Intervalo (segundos)",
                                description: `0 = padrão (${te.tableUpdateSeconds}s)`,
                                suffix: s.jsx("span", {
                                  className: "text-xs font-semibold",
                                  children: "s",
                                }),
                              }),
                            }),
                            s.jsx(Q, {
                              title: "Painel de Monitoramento",
                              description:
                                "Selecione o painel onde os sinais serão salvos ao clicar no botão de salvar.",
                              children:
                                w.length === 0
                                  ? s.jsx("p", {
                                      className:
                                        "text-sm text-gray-500 dark:text-dark-400",
                                      children:
                                        "Nenhum painel disponível. Crie um painel em /monitoramento.",
                                    })
                                  : s.jsxs("div", {
                                      className: "space-y-2",
                                      children: [
                                        s.jsx("p", {
                                          className:
                                            "text-sm font-semibold text-gray-900 dark:text-dark-50",
                                          children: "Painel Selecionado",
                                        }),
                                        s.jsx(hr, {
                                          className: "relative",
                                          children: ({ open: i }) =>
                                            s.jsxs(s.Fragment, {
                                              children: [
                                                s.jsxs(fr, {
                                                  className: z(
                                                    "flex w-full items-center justify-between rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2.5 text-left text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-dark-600 dark:bg-dark-800/80 dark:focus:border-primary-500 dark:focus:ring-primary-500/30",
                                                    i &&
                                                      "border-primary-500 ring-2 ring-primary-100 dark:ring-primary-500/30",
                                                  ),
                                                  children: [
                                                    s.jsx("span", {
                                                      className: z(
                                                        "block truncate",
                                                        !E &&
                                                          "text-gray-400 dark:text-dark-400",
                                                      ),
                                                      children:
                                                        (E &&
                                                          w.find(
                                                            (k) => k.id === E,
                                                          )?.name) ||
                                                        "Selecione um painel",
                                                    }),
                                                    s.jsx(dr, {
                                                      className:
                                                        "size-4 text-gray-400",
                                                    }),
                                                  ],
                                                }),
                                                s.jsx(pr, {
                                                  transition: !0,
                                                  anchor: "bottom start",
                                                  className:
                                                    "z-[60] w-[var(--button-width)] rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-dark-600 dark:bg-dark-800 transition duration-200 ease-out data-[closed]:-translate-y-1 data-[closed]:opacity-0 [--anchor-gap:4px]",
                                                  children: s.jsx("div", {
                                                    className: "p-1",
                                                    children: w.map((k) => {
                                                      const v = E === k.id;
                                                      return s.jsxs(
                                                        "button",
                                                        {
                                                          onClick: () =>
                                                            F(k.id),
                                                          className: z(
                                                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                                                            v
                                                              ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-100"
                                                              : "text-gray-700 hover:bg-gray-50 dark:text-dark-100 dark:hover:bg-dark-700/50",
                                                          ),
                                                          children: [
                                                            s.jsx("span", {
                                                              children: k.name,
                                                            }),
                                                            v &&
                                                              s.jsx(Bt, {
                                                                className:
                                                                  "size-4 text-primary-600 dark:text-primary-400",
                                                              }),
                                                          ],
                                                        },
                                                        k.id,
                                                      );
                                                    }),
                                                  }),
                                                }),
                                              ],
                                            }),
                                        }),
                                      ],
                                    }),
                            }),
                          ],
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      className:
                        "flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-dark-700",
                      children: [
                        s.jsx(Z, {
                          variant: "soft",
                          color: "neutral",
                          onClick: () => m(!1),
                          children: "Fechar",
                        }),
                        s.jsx(Z, {
                          color: "primary",
                          onClick: () => m(!1),
                          children: "Aplicar Filtros",
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    ],
  });
}
export { xa as default };
