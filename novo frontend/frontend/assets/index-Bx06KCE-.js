/* ==============================================================
 * Main Application Bundle (Vite)
 * Contains: React, ReactDOM, React Router, Axios, i18next,
 *           SimpleBar, App Components & Utilities
 * ============================================================== */

/* ---- Vite Dependency Map ---- */
const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "assets/Toaster-CLfKOJ2a.js",
      "assets/index-mwGaaYkF.js",
      "assets/Tooltip-3-76g3mr.js",
      "assets/floating-ui.dom-DmqE9iVV.js",
      "assets/FloatingSpreadCalculator-CUVr1WZy.js",
      "assets/ArrowTopRightOnSquareIcon-dBVxg5nU.js",
      "assets/ArrowPathIcon-Ek2z4Juv.js",
      "assets/XMarkIcon-mqVC0SZA.js",
      "assets/SparklesIcon-DU5U9T8X.js",
      "assets/401-Rg_IQ_mV.js",
      "assets/Page-hVEPjFz_.js",
      "assets/404-g9LXz3c9.js",
      "assets/429-Tv24lfSC.js",
      "assets/500-yYKblytm.js",
      "assets/index-BBcVLxBw.js",
      "assets/index-DqFyO0CR.js",
      "assets/UserSettingsModal-CzYn2rcs.js",
      "assets/iconBase-BPc6woXW.js",
      "assets/discordLink-BQxtRaU4.js",
      "assets/discord-BL8Te9RE.js",
      "assets/index-C5vO_a11.js",
      "assets/use-resolve-button-type-DwKZeOeP.js",
      "assets/use-is-mounted-D7iMJT5-.js",
      "assets/floating-CA5b9ljT.js",
      "assets/dialog-DOjFQwF9.js",
      "assets/transition-Cxix63ts.js",
      "assets/Cog6ToothIcon-EOZD7MO5.js",
      "assets/tabs-Cdkz3LDK.js",
      "assets/UserIcon-B-URsuU3.js",
      "assets/WalletIcon-BygHaYK8.js",
      "assets/CurrencyDollarIcon-DU3HPuAk.js",
      "assets/ShieldCheckIcon-BsJEEeR_.js",
      "assets/CreditCardIcon-BLR1nsX7.js",
      "assets/authApi-ObFgLF0e.js",
      "assets/userPreferences-DJ2q-do7.js",
      "assets/KeyIcon-CgJXeIvo.js",
      "assets/radio-group-CRUASA4L.js",
      "assets/label-DDDQpD4Z.js",
      "assets/MagnifyingGlassIcon-DA0XI0aS.js",
      "assets/ChevronRightIcon-EvEZ5GcB.js",
      "assets/CalendarIcon-BAdYkhA_.js",
      "assets/listbox-BwGC_4fO.js",
      "assets/use-text-value-ChvRIfBi.js",
      "assets/teamopLogoBlack-DzW8yP3A.js",
      "assets/navigation-Dzggl1Hr.js",
      "assets/ChevronLeftIcon-UrS6hBlQ.js",
      "assets/index-DndxzjOV.js",
      "assets/index-DJd4Id7Y.js",
      "assets/TrashIcon-DZPNpgRn.js",
      "assets/ArrowTrendingUpIcon-CPkyWYZ2.js",
      "assets/react-apexcharts.esm-B8DZI7x8.js",
      "assets/FunnelIcon-D3v6sT5b.js",
      "assets/CheckIcon-BhaIjZ56.js",
      "assets/index-BaZ9iwuu.js",
      "assets/licensesApi-BVBHUoUP.js",
      "assets/ClockIcon-c5Zk21LG.js",
      "assets/CheckCircleIcon-oyDfoM4P.js",
      "assets/index-BgfcHNT4.js",
      "assets/useExchangePiP-DV_Gxb4B.js",
      "assets/coinsApi-BPsBZGFa.js",
      "assets/exchange-BNVQP8m4.js",
      "assets/SearchableSelect-9vRGJJts.js",
      "assets/CheckIcon-WReR5saH.js",
      "assets/Squares2X2Icon-CnDifh_s.js",
      "assets/index-2Rmnk0ik.js",
      "assets/index-C_nZDfEk.js",
      "assets/PaginationSection-uLCLiG5r.js",
      "assets/EyeIcon-CCF3MwDA.js",
      "assets/index-ZMQRJa76.js",
      "assets/PencilSquareIcon-4O8tAZey.js",
      "assets/BarsArrowUpIcon-DltkYWyW.js",
      "assets/trading-CiVJJ1-M.js",
      "assets/index-Cb9IEWsQ.js",
      "assets/index-ClrM0Ejj.js",
      "assets/EyeSlashIcon-CsqEf1t-.js",
      "assets/index-BlPMHNd9.js",
      "assets/paymentsApi-DsZT4bW9.js",
      "assets/index-D3K-O_pF.js",
      "assets/index-4K8j17Rq.js",
      "assets/Layout-4udCJNoo.js",
      "assets/General-K6wVnjA7.js",
      "assets/EnvelopeIcon-CcLEeLlf.js",
      "assets/Appearance-Dcnlrhjh.js",
      "assets/index-B7S_VRVu.js",
      "assets/index.esm-B0FtDp2r.js",
      "assets/PasswordInput-l_GnRAOy.js",
      "assets/Register-CeunrM2H.js",
      "assets/ForgotPassword-CxM7qbuF.js",
      "assets/ResetPassword-fdVABVLd.js",
      "assets/LegacyMigration-mZGEGLr4.js",
      "assets/DiscordCallback-kCpBkqPW.js",
      "assets/VerifyOtp-DBqwSVec.js",
    ]),
) => i.map((item) => d[item]);
/* ---- Module Namespace Helper ---- */
function nS(n, r) {
  for (var l = 0; l < r.length; l++) {
    const o = r[l];
    if (typeof o != "string" && !Array.isArray(o)) {
      for (const s in o)
        if (s !== "default" && !(s in n)) {
          const c = Object.getOwnPropertyDescriptor(o, s);
          if (c) {
            Object.defineProperty(
              n,
              s,
              c.get
                ? c
                : {
                    enumerable: !0,
                    get: () => o[s],
                  },
            );
          }
        }
    }
  }
  return Object.freeze(
    Object.defineProperty(n, Symbol.toStringTag, {
      value: "Module",
    }),
  );
}
/* ---- Module Preload Polyfill ---- */
(function () {
  const r = document.createElement("link").relList;
  if (r && r.supports && r.supports("modulepreload")) return;
  for (const s of document.querySelectorAll('link[rel="modulepreload"]')) o(s);
  new MutationObserver((s) => {
    for (const c of s)
      if (c.type === "childList")
        for (const f of c.addedNodes)
          if (f.tagName === "LINK" && f.rel === "modulepreload") {
            o(f);
          }
  }).observe(document, {
    childList: !0,
    subtree: !0,
  });
  function l(s) {
    const c = {};
    return (
      s.integrity && (c.integrity = s.integrity),
      s.referrerPolicy && (c.referrerPolicy = s.referrerPolicy),
      s.crossOrigin === "use-credentials"
        ? (c.credentials = "include")
        : s.crossOrigin === "anonymous"
          ? (c.credentials = "omit")
          : (c.credentials = "same-origin"),
      c
    );
  }
  function o(s) {
    if (s.ep) return;
    s.ep = !0;
    const c = l(s);
    fetch(s.href, c);
  }
})();
/* ---- Global Object Detection ---- */
var ss =
  typeof globalThis < "u"
    ? globalThis
    : typeof window < "u"
      ? window
      : typeof global < "u"
        ? global
        : typeof self < "u"
          ? self
          : {};
function ji(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default")
    ? n.default
    : n;
}
/* ---- React Core Library ---- */
var uf = {
    exports: {},
  },
  vi = {};
var gg;
function aS() {
  if (gg) return vi;
  gg = 1;
  var n = Symbol.for("react.transitional.element"),
    r = Symbol.for("react.fragment");
  function l(o, s, c) {
    var f = null;
    if (
      (c !== void 0 && (f = "" + c),
      s.key !== void 0 && (f = "" + s.key),
      "key" in s)
    ) {
      c = {};
      for (var m in s)
        if (m !== "key") {
          c[m] = s[m];
        }
    } else c = s;
    return (
      (s = c.ref),
      {
        $$typeof: n,
        type: o,
        key: f,
        ref: s !== void 0 ? s : null,
        props: c,
      }
    );
  }
  return ((vi.Fragment = r), (vi.jsx = l), (vi.jsxs = l), vi);
}
var pg;
function rS() {
  return (pg || ((pg = 1), (uf.exports = aS())), uf.exports);
}
var L = rS(),
  cf = {
    exports: {},
  },
  bi = {},
  ff = {
    exports: {},
  },
  df = {};
var yg;
function lS() {
  return (
    yg ||
      ((yg = 1),
      (function (n) {
        function r(T, V) {
          var B = T.length;
          T.push(V);
          e: for (; 0 < B; ) {
            var re = (B - 1) >>> 1,
              oe = T[re];
            if (0 < s(oe, V)) {
              T[re] = V;
              T[B] = oe;
              B = re;
            } else break e;
          }
        }
        function l(T) {
          return T.length === 0 ? null : T[0];
        }
        function o(T) {
          if (T.length === 0) return null;
          var V = T[0],
            B = T.pop();
          if (B !== V) {
            T[0] = B;
            e: for (var re = 0, oe = T.length, R = oe >>> 1; re < R; ) {
              var H = 2 * (re + 1) - 1,
                J = T[H],
                ne = H + 1,
                me = T[ne];
              if (0 > s(J, B))
                ne < oe && 0 > s(me, J)
                  ? ((T[re] = me), (T[ne] = B), (re = ne))
                  : ((T[re] = J), (T[H] = B), (re = H));
              else if (ne < oe && 0 > s(me, B)) {
                T[re] = me;
                T[ne] = B;
                re = ne;
              } else break e;
            }
          }
          return V;
        }
        function s(T, V) {
          var B = T.sortIndex - V.sortIndex;
          return B !== 0 ? B : T.id - V.id;
        }
        if (
          ((n.unstable_now = void 0),
          typeof performance == "object" &&
            typeof performance.now == "function")
        ) {
          var c = performance;
          n.unstable_now = function () {
            return c.now();
          };
        } else {
          var f = Date,
            m = f.now();
          n.unstable_now = function () {
            return f.now() - m;
          };
        }
        var g = [],
          h = [],
          y = 1,
          v = null,
          S = 3,
          w = !1,
          x = !1,
          _ = !1,
          A = !1,
          z = typeof setTimeout == "function" ? setTimeout : null,
          M = typeof clearTimeout == "function" ? clearTimeout : null,
          F = typeof setImmediate < "u" ? setImmediate : null;
        function te(T) {
          for (var V = l(h); V !== null; ) {
            if (V.callback === null) o(h);
            else if (V.startTime <= T) {
              o(h);
              V.sortIndex = V.expirationTime;
              r(g, V);
            } else break;
            V = l(h);
          }
        }
        function U(T) {
          if (((_ = !1), te(T), !x))
            if (l(g) !== null) {
              x = !0;
              W || ((W = !0), Ee());
            } else {
              var V = l(h);
              if (V !== null) {
                Z(U, V.startTime - T);
              }
            }
        }
        var W = !1,
          D = -1,
          le = 5,
          ie = -1;
        function ue() {
          return A ? !0 : !(n.unstable_now() - ie < le);
        }
        function ce() {
          if (((A = !1), W)) {
            var T = n.unstable_now();
            ie = T;
            var V = !0;
            try {
              e: {
                x = !1;
                if (_) {
                  ((_ = !1), M(D), (D = -1));
                }
                w = !0;
                var B = S;
                try {
                  t: {
                    for (
                      te(T), v = l(g);
                      v !== null && !(v.expirationTime > T && ue());
                    ) {
                      var re = v.callback;
                      if (typeof re == "function") {
                        v.callback = null;
                        S = v.priorityLevel;
                        var oe = re(v.expirationTime <= T);
                        if (((T = n.unstable_now()), typeof oe == "function")) {
                          v.callback = oe;
                          te(T);
                          V = !0;
                          break t;
                        }
                        if (v === l(g)) {
                          o(g);
                        }
                        te(T);
                      } else o(g);
                      v = l(g);
                    }
                    if (v !== null) V = !0;
                    else {
                      var R = l(h);
                      if (R !== null) {
                        Z(U, R.startTime - T);
                      }
                      V = !1;
                    }
                  }
                  break e;
                } finally {
                  v = null;
                  S = B;
                  w = !1;
                }
                V = void 0;
              }
            } finally {
              V ? Ee() : (W = !1);
            }
          }
        }
        var Ee;
        if (typeof F == "function")
          Ee = function () {
            F(ce);
          };
        else if (typeof MessageChannel < "u") {
          var be = new MessageChannel(),
            ee = be.port2;
          be.port1.onmessage = ce;
          Ee = function () {
            ee.postMessage(null);
          };
        } else
          Ee = function () {
            z(ce, 0);
          };
        function Z(T, V) {
          D = z(function () {
            T(n.unstable_now());
          }, V);
        }
        n.unstable_IdlePriority = 5;
        n.unstable_ImmediatePriority = 1;
        n.unstable_LowPriority = 4;
        n.unstable_NormalPriority = 3;
        n.unstable_Profiling = null;
        n.unstable_UserBlockingPriority = 2;
        n.unstable_cancelCallback = function (T) {
          T.callback = null;
        };
        n.unstable_forceFrameRate = function (T) {
          0 > T || 125 < T
            ? console.error(
                "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
              )
            : (le = 0 < T ? Math.floor(1e3 / T) : 5);
        };
        n.unstable_getCurrentPriorityLevel = function () {
          return S;
        };
        n.unstable_next = function (T) {
          switch (S) {
            case 1:
            case 2:
            case 3:
              var V = 3;
              break;
            default:
              V = S;
          }
          var B = S;
          S = V;
          try {
            return T();
          } finally {
            S = B;
          }
        };
        n.unstable_requestPaint = function () {
          A = !0;
        };
        n.unstable_runWithPriority = function (T, V) {
          switch (T) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
              break;
            default:
              T = 3;
          }
          var B = S;
          S = T;
          try {
            return V();
          } finally {
            S = B;
          }
        };
        n.unstable_scheduleCallback = function (T, V, B) {
          var re = n.unstable_now();
          switch (
            (typeof B == "object" && B !== null
              ? ((B = B.delay),
                (B = typeof B == "number" && 0 < B ? re + B : re))
              : (B = re),
            T)
          ) {
            case 1:
              var oe = -1;
              break;
            case 2:
              oe = 250;
              break;
            case 5:
              oe = 1073741823;
              break;
            case 4:
              oe = 1e4;
              break;
            default:
              oe = 5e3;
          }
          return (
            (oe = B + oe),
            (T = {
              id: y++,
              callback: V,
              priorityLevel: T,
              startTime: B,
              expirationTime: oe,
              sortIndex: -1,
            }),
            B > re
              ? ((T.sortIndex = B),
                r(h, T),
                l(g) === null &&
                  T === l(h) &&
                  (_ ? (M(D), (D = -1)) : (_ = !0), Z(U, B - re)))
              : ((T.sortIndex = oe),
                r(g, T),
                x || w || ((x = !0), W || ((W = !0), Ee()))),
            T
          );
        };
        n.unstable_shouldYield = ue;
        n.unstable_wrapCallback = function (T) {
          var V = S;
          return function () {
            var B = S;
            S = V;
            try {
              return T.apply(this, arguments);
            } finally {
              S = B;
            }
          };
        };
      })(df)),
    df
  );
}
var vg;
function iS() {
  return (vg || ((vg = 1), (ff.exports = lS())), ff.exports);
}
var hf = {
    exports: {},
  },
  Ce = {};
var bg;
function oS() {
  if (bg) return Ce;
  bg = 1;
  var n = Symbol.for("react.transitional.element"),
    r = Symbol.for("react.portal"),
    l = Symbol.for("react.fragment"),
    o = Symbol.for("react.strict_mode"),
    s = Symbol.for("react.profiler"),
    c = Symbol.for("react.consumer"),
    f = Symbol.for("react.context"),
    m = Symbol.for("react.forward_ref"),
    g = Symbol.for("react.suspense"),
    h = Symbol.for("react.memo"),
    y = Symbol.for("react.lazy"),
    v = Symbol.for("react.activity"),
    S = Symbol.iterator;
  function w(R) {
    return R === null || typeof R != "object"
      ? null
      : ((R = (S && R[S]) || R["@@iterator"]),
        typeof R == "function" ? R : null);
  }
  var x = {
      isMounted: function () {
        return !1;
      },
      enqueueForceUpdate: function () {},
      enqueueReplaceState: function () {},
      enqueueSetState: function () {},
    },
    _ = Object.assign,
    A = {};
  function z(R, H, J) {
    this.props = R;
    this.context = H;
    this.refs = A;
    this.updater = J || x;
  }
  z.prototype.isReactComponent = {};
  z.prototype.setState = function (R, H) {
    if (typeof R != "object" && typeof R != "function" && R != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables.",
      );
    this.updater.enqueueSetState(this, R, H, "setState");
  };
  z.prototype.forceUpdate = function (R) {
    this.updater.enqueueForceUpdate(this, R, "forceUpdate");
  };
  function M() {}
  M.prototype = z.prototype;
  function F(R, H, J) {
    this.props = R;
    this.context = H;
    this.refs = A;
    this.updater = J || x;
  }
  var te = (F.prototype = new M());
  te.constructor = F;
  _(te, z.prototype);
  te.isPureReactComponent = !0;
  var U = Array.isArray;
  function W() {}
  var D = {
      H: null,
      A: null,
      T: null,
      S: null,
    },
    le = Object.prototype.hasOwnProperty;
  function ie(R, H, J) {
    var ne = J.ref;
    return {
      $$typeof: n,
      type: R,
      key: H,
      ref: ne !== void 0 ? ne : null,
      props: J,
    };
  }
  function ue(R, H) {
    return ie(R.type, H, R.props);
  }
  function ce(R) {
    return typeof R == "object" && R !== null && R.$$typeof === n;
  }
  function Ee(R) {
    var H = {
      "=": "=0",
      ":": "=2",
    };
    return (
      "$" +
      R.replace(/[=:]/g, function (J) {
        return H[J];
      })
    );
  }
  var be = /\/+/g;
  function ee(R, H) {
    return typeof R == "object" && R !== null && R.key != null
      ? Ee("" + R.key)
      : H.toString(36);
  }
  function Z(props) {
    switch (props.status) {
      case "fulfilled":
        return props.value;
      case "rejected":
        throw props.reason;
      default:
        switch (
          (typeof props.status == "string"
            ? props.then(W, W)
            : ((props.status = "pending"),
              props.then(
                function (response) {
                  if (props.status === "pending") {
                    ((props.status = "fulfilled"), (props.value = response));
                  }
                },
                function (response) {
                  if (props.status === "pending") {
                    ((props.status = "rejected"), (props.reason = response));
                  }
                },
              )),
          props.status)
        ) {
          case "fulfilled":
            return props.value;
          case "rejected":
            throw props.reason;
        }
    }
    throw props;
  }
  function T(R, H, J, ne, me) {
    var Re = typeof R;
    if (Re === "undefined" || Re === "boolean") {
      R = null;
    }
    var Ae = !1;
    if (R === null) Ae = !0;
    else
      switch (Re) {
        case "bigint":
        case "string":
        case "number":
          Ae = !0;
          break;
        case "object":
          switch (R.$$typeof) {
            case n:
            case r:
              Ae = !0;
              break;
            case y:
              return ((Ae = R._init), T(Ae(R._payload), H, J, ne, me));
          }
      }
    if (Ae)
      return (
        (me = me(R)),
        (Ae = ne === "" ? "." + ee(R, 0) : ne),
        U(me)
          ? ((J = ""),
            Ae != null && (J = Ae.replace(be, "$&/") + "/"),
            T(me, H, J, "", function (ft) {
              return ft;
            }))
          : me != null &&
            (ce(me) &&
              (me = ue(
                me,
                J +
                  (me.key == null || (R && R.key === me.key)
                    ? ""
                    : ("" + me.key).replace(be, "$&/") + "/") +
                  Ae,
              )),
            H.push(me)),
        1
      );
    Ae = 0;
    var tt = ne === "" ? "." : ne + ":";
    if (U(R))
      for (var Pe = 0; Pe < R.length; Pe++) {
        ne = R[Pe];
        Re = tt + ee(ne, Pe);
        Ae += T(ne, H, J, Re, me);
      }
    else if (((Pe = w(R)), typeof Pe == "function"))
      for (R = Pe.call(R), Pe = 0; !(ne = R.next()).done; ) {
        ne = ne.value;
        Re = tt + ee(ne, Pe++);
        Ae += T(ne, H, J, Re, me);
      }
    else if (Re === "object") {
      if (typeof R.then == "function") return T(Z(R), H, J, ne, me);
      throw (
        (H = String(R)),
        Error(
          "Objects are not valid as a React child (found: " +
            (H === "[object Object]"
              ? "object with keys {" + Object.keys(R).join(", ") + "}"
              : H) +
            "). If you meant to render a collection of children, use an array instead.",
        )
      );
    }
    return Ae;
  }
  function V(R, H, J) {
    if (R == null) return R;
    var ne = [],
      me = 0;
    return (
      T(R, ne, "", "", function (Re) {
        return H.call(J, Re, me++);
      }),
      ne
    );
  }
  function B(R) {
    if (R._status === -1) {
      var H = R._result;
      H = H();
      H.then(
        function (response) {
          if (R._status === 0 || R._status === -1) {
            ((R._status = 1), (R._result = response));
          }
        },
        function (response) {
          if (R._status === 0 || R._status === -1) {
            ((R._status = 2), (R._result = response));
          }
        },
      );
      if (R._status === -1) {
        ((R._status = 0), (R._result = H));
      }
    }
    if (R._status === 1) return R._result.default;
    throw R._result;
  }
  var re =
      typeof reportError == "function"
        ? reportError
        : function (R) {
            if (
              typeof window == "object" &&
              typeof window.ErrorEvent == "function"
            ) {
              var H = new window.ErrorEvent("error", {
                bubbles: !0,
                cancelable: !0,
                message:
                  typeof R == "object" &&
                  R !== null &&
                  typeof R.message == "string"
                    ? String(R.message)
                    : String(R),
                error: R,
              });
              if (!window.dispatchEvent(H)) return;
            } else if (
              typeof process == "object" &&
              typeof process.emit == "function"
            ) {
              process.emit("uncaughtException", R);
              return;
            }
            console.error(R);
          },
    oe = {
      map: V,
      forEach: function (R, H, J) {
        V(
          R,
          function () {
            H.apply(this, arguments);
          },
          J,
        );
      },
      count: function (R) {
        var H = 0;
        return (
          V(R, function () {
            H++;
          }),
          H
        );
      },
      toArray: function (R) {
        return (
          V(R, function (H) {
            return H;
          }) || []
        );
      },
      only: function (R) {
        if (!ce(R))
          throw Error(
            "React.Children.only expected to receive a single React element child.",
          );
        return R;
      },
    };
  return (
    (Ce.Activity = v),
    (Ce.Children = oe),
    (Ce.Component = z),
    (Ce.Fragment = l),
    (Ce.Profiler = s),
    (Ce.PureComponent = F),
    (Ce.StrictMode = o),
    (Ce.Suspense = g),
    (Ce.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = D),
    (Ce.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function (R) {
        return D.H.useMemoCache(R);
      },
    }),
    (Ce.cache = function (R) {
      return function () {
        return R.apply(null, arguments);
      };
    }),
    (Ce.cacheSignal = function () {
      return null;
    }),
    (Ce.cloneElement = function (R, H, J) {
      if (R == null)
        throw Error(
          "The argument must be a React element, but you passed " + R + ".",
        );
      var ne = _({}, R.props),
        me = R.key;
      if (H != null)
        for (Re in (H.key !== void 0 && (me = "" + H.key), H))
          !le.call(H, Re) ||
            Re === "key" ||
            Re === "__self" ||
            Re === "__source" ||
            (Re === "ref" && H.ref === void 0) ||
            (ne[Re] = H[Re]);
      var Re = arguments.length - 2;
      if (Re === 1) ne.children = J;
      else if (1 < Re) {
        for (var Ae = Array(Re), tt = 0; tt < Re; tt++)
          Ae[tt] = arguments[tt + 2];
        ne.children = Ae;
      }
      return ie(R.type, me, ne);
    }),
    (Ce.createContext = function (R) {
      return (
        (R = {
          $$typeof: f,
          _currentValue: R,
          _currentValue2: R,
          _threadCount: 0,
          Provider: null,
          Consumer: null,
        }),
        (R.Provider = R),
        (R.Consumer = {
          $$typeof: c,
          _context: R,
        }),
        R
      );
    }),
    (Ce.createElement = function (R, H, J) {
      var ne,
        me = {},
        Re = null;
      if (H != null)
        for (ne in (H.key !== void 0 && (Re = "" + H.key), H))
          if (
            le.call(H, ne) &&
            ne !== "key" &&
            ne !== "__self" &&
            ne !== "__source"
          ) {
            me[ne] = H[ne];
          }
      var Ae = arguments.length - 2;
      if (Ae === 1) me.children = J;
      else if (1 < Ae) {
        for (var tt = Array(Ae), Pe = 0; Pe < Ae; Pe++)
          tt[Pe] = arguments[Pe + 2];
        me.children = tt;
      }
      if (R && R.defaultProps)
        for (ne in ((Ae = R.defaultProps), Ae))
          if (me[ne] === void 0) {
            me[ne] = Ae[ne];
          }
      return ie(R, Re, me);
    }),
    (Ce.createRef = function () {
      return {
        current: null,
      };
    }),
    (Ce.forwardRef = function (R) {
      return {
        $$typeof: m,
        render: R,
      };
    }),
    (Ce.isValidElement = ce),
    (Ce.lazy = function (R) {
      return {
        $$typeof: y,
        _payload: {
          _status: -1,
          _result: R,
        },
        _init: B,
      };
    }),
    (Ce.memo = function (R, H) {
      return {
        $$typeof: h,
        type: R,
        compare: H === void 0 ? null : H,
      };
    }),
    (Ce.startTransition = function (R) {
      var H = D.T,
        J = {};
      D.T = J;
      try {
        var ne = R(),
          me = D.S;
        if (me !== null) {
          me(J, ne);
        }
        if (
          typeof ne == "object" &&
          ne !== null &&
          typeof ne.then == "function"
        ) {
          ne.then(W, re);
        }
      } catch (Re) {
        re(Re);
      } finally {
        if (H !== null && J.types !== null) {
          H.types = J.types;
        }
        D.T = H;
      }
    }),
    (Ce.unstable_useCacheRefresh = function () {
      return D.H.useCacheRefresh();
    }),
    (Ce.use = function (R) {
      return D.H.use(R);
    }),
    (Ce.useActionState = function (R, H, J) {
      return D.H.useActionState(R, H, J);
    }),
    (Ce.useCallback = function (R, H) {
      return D.H.useCallback(R, H);
    }),
    (Ce.useContext = function (R) {
      return D.H.useContext(R);
    }),
    (Ce.useDebugValue = function () {}),
    (Ce.useDeferredValue = function (R, H) {
      return D.H.useDeferredValue(R, H);
    }),
    (Ce.useEffect = function (R, H) {
      return D.H.useEffect(R, H);
    }),
    (Ce.useEffectEvent = function (R) {
      return D.H.useEffectEvent(R);
    }),
    (Ce.useId = function () {
      return D.H.useId();
    }),
    (Ce.useImperativeHandle = function (R, H, J) {
      return D.H.useImperativeHandle(R, H, J);
    }),
    (Ce.useInsertionEffect = function (R, H) {
      return D.H.useInsertionEffect(R, H);
    }),
    (Ce.useLayoutEffect = function (R, H) {
      return D.H.useLayoutEffect(R, H);
    }),
    (Ce.useMemo = function (R, H) {
      return D.H.useMemo(R, H);
    }),
    (Ce.useOptimistic = function (R, H) {
      return D.H.useOptimistic(R, H);
    }),
    (Ce.useReducer = function (R, H, J) {
      return D.H.useReducer(R, H, J);
    }),
    (Ce.useRef = function (R) {
      return D.H.useRef(R);
    }),
    (Ce.useState = function (R) {
      return D.H.useState(R);
    }),
    (Ce.useSyncExternalStore = function (R, H, J) {
      return D.H.useSyncExternalStore(R, H, J);
    }),
    (Ce.useTransition = function () {
      return D.H.useTransition();
    }),
    (Ce.version = "19.2.3"),
    Ce
  );
}
var Sg;
function sd() {
  return (Sg || ((Sg = 1), (hf.exports = oS())), hf.exports);
}
var mf = {
    exports: {},
  },
  Ut = {};
var Eg;
function sS() {
  if (Eg) return Ut;
  Eg = 1;
  var n = sd();
  function r(g) {
    var h = "https://react.dev/errors/" + g;
    if (1 < arguments.length) {
      h += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var y = 2; y < arguments.length; y++)
        h += "&args[]=" + encodeURIComponent(arguments[y]);
    }
    return (
      "Minified React error #" +
      g +
      "; visit " +
      h +
      " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    );
  }
  function l() {}
  var o = {
      d: {
        f: l,
        r: function () {
          throw Error(r(522));
        },
        D: l,
        C: l,
        L: l,
        m: l,
        X: l,
        S: l,
        M: l,
      },
      p: 0,
      findDOMNode: null,
    },
    s = Symbol.for("react.portal");
  function c(g, h, y) {
    var v =
      3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: s,
      key: v == null ? null : "" + v,
      children: g,
      containerInfo: h,
      implementation: y,
    };
  }
  var f = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function m(g, h) {
    if (g === "font") return "";
    if (typeof h == "string") return h === "use-credentials" ? h : "";
  }
  return (
    (Ut.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = o),
    (Ut.createPortal = function (g, h) {
      var y =
        2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!h || (h.nodeType !== 1 && h.nodeType !== 9 && h.nodeType !== 11))
        throw Error(r(299));
      return c(g, h, null, y);
    }),
    (Ut.flushSync = function (g) {
      var h = f.T,
        y = o.p;
      try {
        if (((f.T = null), (o.p = 2), g)) return g();
      } finally {
        f.T = h;
        o.p = y;
        o.d.f();
      }
    }),
    (Ut.preconnect = function (g, h) {
      if (typeof g == "string") {
        (h
          ? ((h = h.crossOrigin),
            (h =
              typeof h == "string"
                ? h === "use-credentials"
                  ? h
                  : ""
                : void 0))
          : (h = null),
          o.d.C(g, h));
      }
    }),
    (Ut.prefetchDNS = function (g) {
      if (typeof g == "string") {
        o.d.D(g);
      }
    }),
    (Ut.preinit = function (g, h) {
      if (typeof g == "string" && h && typeof h.as == "string") {
        var y = h.as,
          v = m(y, h.crossOrigin),
          S = typeof h.integrity == "string" ? h.integrity : void 0,
          w = typeof h.fetchPriority == "string" ? h.fetchPriority : void 0;
        y === "style"
          ? o.d.S(g, typeof h.precedence == "string" ? h.precedence : void 0, {
              crossOrigin: v,
              integrity: S,
              fetchPriority: w,
            })
          : y === "script" &&
            o.d.X(g, {
              crossOrigin: v,
              integrity: S,
              fetchPriority: w,
              nonce: typeof h.nonce == "string" ? h.nonce : void 0,
            });
      }
    }),
    (Ut.preinitModule = function (g, h) {
      if (typeof g == "string")
        if (typeof h == "object" && h !== null) {
          if (h.as == null || h.as === "script") {
            var y = m(h.as, h.crossOrigin);
            o.d.M(g, {
              crossOrigin: y,
              integrity: typeof h.integrity == "string" ? h.integrity : void 0,
              nonce: typeof h.nonce == "string" ? h.nonce : void 0,
            });
          }
        } else if (h == null) {
          o.d.M(g);
        }
    }),
    (Ut.preload = function (g, h) {
      if (
        typeof g == "string" &&
        typeof h == "object" &&
        h !== null &&
        typeof h.as == "string"
      ) {
        var y = h.as,
          v = m(y, h.crossOrigin);
        o.d.L(g, y, {
          crossOrigin: v,
          integrity: typeof h.integrity == "string" ? h.integrity : void 0,
          nonce: typeof h.nonce == "string" ? h.nonce : void 0,
          type: typeof h.type == "string" ? h.type : void 0,
          fetchPriority:
            typeof h.fetchPriority == "string" ? h.fetchPriority : void 0,
          referrerPolicy:
            typeof h.referrerPolicy == "string" ? h.referrerPolicy : void 0,
          imageSrcSet:
            typeof h.imageSrcSet == "string" ? h.imageSrcSet : void 0,
          imageSizes: typeof h.imageSizes == "string" ? h.imageSizes : void 0,
          media: typeof h.media == "string" ? h.media : void 0,
        });
      }
    }),
    (Ut.preloadModule = function (g, h) {
      if (typeof g == "string")
        if (h) {
          var y = m(h.as, h.crossOrigin);
          o.d.m(g, {
            as: typeof h.as == "string" && h.as !== "script" ? h.as : void 0,
            crossOrigin: y,
            integrity: typeof h.integrity == "string" ? h.integrity : void 0,
          });
        } else o.d.m(g);
    }),
    (Ut.requestFormReset = function (g) {
      o.d.r(g);
    }),
    (Ut.unstable_batchedUpdates = function (g, h) {
      return g(h);
    }),
    (Ut.useFormState = function (g, h, y) {
      return f.H.useFormState(g, h, y);
    }),
    (Ut.useFormStatus = function () {
      return f.H.useHostTransitionStatus();
    }),
    (Ut.version = "19.2.3"),
    Ut
  );
}
var xg;
function py() {
  if (xg) return mf.exports;
  xg = 1;
  function n() {
    if (
      !(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
      )
    )
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
      } catch (r) {
        console.error(r);
      }
  }
  return (n(), (mf.exports = sS()), mf.exports);
}
/* ---- ReactDOM Library ---- */
var wg;
function uS() {
  if (wg) return bi;
  wg = 1;
  var n = iS(),
    r = sd(),
    l = py();
  function o(e) {
    var t = "https://react.dev/errors/" + e;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return (
      "Minified React error #" +
      e +
      "; visit " +
      t +
      " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    );
  }
  function s(e) {
    return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
  }
  function c(e) {
    var t = e,
      a = e;
    if (e.alternate) for (; t.return; ) t = t.return;
    else {
      e = t;
      do {
        t = e;
        if ((t.flags & 4098) !== 0) {
          a = t.return;
        }
        e = t.return;
      } while (e);
    }
    return t.tag === 3 ? a : null;
  }
  function f(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (
        (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
        t !== null)
      )
        return t.dehydrated;
    }
    return null;
  }
  function m(e) {
    if (e.tag === 31) {
      var t = e.memoizedState;
      if (
        (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
        t !== null)
      )
        return t.dehydrated;
    }
    return null;
  }
  function g(e) {
    if (c(e) !== e) throw Error(o(188));
  }
  function h(e) {
    var t = e.alternate;
    if (!t) {
      if (((t = c(e)), t === null)) throw Error(o(188));
      return t !== e ? null : e;
    }
    for (var a = e, i = t; ; ) {
      var u = a.return;
      if (u === null) break;
      var d = u.alternate;
      if (d === null) {
        if (((i = u.return), i !== null)) {
          a = i;
          continue;
        }
        break;
      }
      if (u.child === d.child) {
        for (d = u.child; d; ) {
          if (d === a) return (g(u), e);
          if (d === i) return (g(u), t);
          d = d.sibling;
        }
        throw Error(o(188));
      }
      if (a.return !== i.return) {
        a = u;
        i = d;
      } else {
        for (var p = !1, b = u.child; b; ) {
          if (b === a) {
            p = !0;
            a = u;
            i = d;
            break;
          }
          if (b === i) {
            p = !0;
            i = u;
            a = d;
            break;
          }
          b = b.sibling;
        }
        if (!p) {
          for (b = d.child; b; ) {
            if (b === a) {
              p = !0;
              a = d;
              i = u;
              break;
            }
            if (b === i) {
              p = !0;
              i = d;
              a = u;
              break;
            }
            b = b.sibling;
          }
          if (!p) throw Error(o(189));
        }
      }
      if (a.alternate !== i) throw Error(o(190));
    }
    if (a.tag !== 3) throw Error(o(188));
    return a.stateNode.current === a ? e : t;
  }
  function y(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e;
    for (e = e.child; e !== null; ) {
      if (((t = y(e)), t !== null)) return t;
      e = e.sibling;
    }
    return null;
  }
  var v = Object.assign,
    S = Symbol.for("react.element"),
    w = Symbol.for("react.transitional.element"),
    x = Symbol.for("react.portal"),
    _ = Symbol.for("react.fragment"),
    A = Symbol.for("react.strict_mode"),
    z = Symbol.for("react.profiler"),
    M = Symbol.for("react.consumer"),
    F = Symbol.for("react.context"),
    te = Symbol.for("react.forward_ref"),
    U = Symbol.for("react.suspense"),
    W = Symbol.for("react.suspense_list"),
    D = Symbol.for("react.memo"),
    le = Symbol.for("react.lazy"),
    ie = Symbol.for("react.activity"),
    ue = Symbol.for("react.memo_cache_sentinel"),
    ce = Symbol.iterator;
  function Ee(e) {
    return e === null || typeof e != "object"
      ? null
      : ((e = (ce && e[ce]) || e["@@iterator"]),
        typeof e == "function" ? e : null);
  }
  var be = Symbol.for("react.client.reference");
  function ee(props) {
    if (props == null) return null;
    if (typeof props == "function")
      return props.$$typeof === be
        ? null
        : props.displayName || props.name || null;
    if (typeof props == "string") return props;
    switch (props) {
      case _:
        return "Fragment";
      case z:
        return "Profiler";
      case A:
        return "StrictMode";
      case U:
        return "Suspense";
      case W:
        return "SuspenseList";
      case ie:
        return "Activity";
    }
    if (typeof props == "object")
      switch (props.$$typeof) {
        case x:
          return "Portal";
        case F:
          return props.displayName || "Context";
        case M:
          return (props._context.displayName || "Context") + ".Consumer";
        case te:
          var t = props.render;
          return (
            (props = props.displayName),
            props ||
              ((props = t.displayName || t.name || ""),
              (props =
                props !== "" ? "ForwardRef(" + props + ")" : "ForwardRef")),
            props
          );
        case D:
          return (
            (t = props.displayName || null),
            t !== null ? t : ee(props.type) || "Memo"
          );
        case le:
          t = props._payload;
          props = props._init;
          try {
            return ee(props(t));
          } catch {}
      }
    return null;
  }
  var Z = Array.isArray,
    T = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    V = l.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    B = {
      pending: !1,
      data: null,
      method: null,
      action: null,
    },
    re = [],
    oe = -1;
  function R(e) {
    return {
      current: e,
    };
  }
  function H(e) {
    0 > oe || ((e.current = re[oe]), (re[oe] = null), oe--);
  }
  function J(e, t) {
    oe++;
    re[oe] = e.current;
    e.current = t;
  }
  var ne = R(null),
    me = R(null),
    Re = R(null),
    Ae = R(null);
  function tt(e, t) {
    switch ((J(Re, t), J(me, e), J(ne, null), t.nodeType)) {
      case 9:
      case 11:
        e = (e = t.documentElement) && (e = e.namespaceURI) ? H0(e) : 0;
        break;
      default:
        if (((e = t.tagName), (t = t.namespaceURI))) {
          t = H0(t);
          e = B0(t, e);
        } else
          switch (e) {
            case "svg":
              e = 1;
              break;
            case "math":
              e = 2;
              break;
            default:
              e = 0;
          }
    }
    H(ne);
    J(ne, e);
  }
  function Pe() {
    H(ne);
    H(me);
    H(Re);
  }
  function ft(props) {
    if (props.memoizedState !== null) {
      J(Ae, props);
    }
    var t = ne.current,
      a = B0(t, props.type);
    if (t !== a) {
      (J(me, props), J(ne, a));
    }
  }
  function qt(e) {
    if (me.current === e) {
      (H(ne), H(me));
    }
    if (Ae.current === e) {
      (H(Ae), (mi._currentValue = B));
    }
  }
  var at, Gt;
  function jn(e) {
    if (at === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        at = (t && t[1]) || "";
        Gt =
          -1 <
          a.stack.indexOf(`
    at`)
            ? " (<anonymous>)"
            : -1 < a.stack.indexOf("@")
              ? "@unknown:0:0"
              : "";
      }
    return (
      `
` +
      at +
      e +
      Gt
    );
  }
  var Rl = !1;
  function Tn(e, t) {
    if (!e || Rl) return "";
    Rl = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var i = {
        DetermineComponentFrameRoot: function () {
          try {
            if (t) {
              var I = function () {
                throw Error();
              };
              if (
                (Object.defineProperty(I.prototype, "props", {
                  set: function () {
                    throw Error();
                  },
                }),
                typeof Reflect == "object" && Reflect.construct)
              ) {
                try {
                  Reflect.construct(I, []);
                } catch (P) {
                  var Y = P;
                }
                Reflect.construct(e, [], I);
              } else {
                try {
                  I.call();
                } catch (P) {
                  Y = P;
                }
                e.call(I.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (P) {
                Y = P;
              }
              if ((I = e()) && typeof I.catch == "function") {
                I.catch(function () {});
              }
            }
          } catch (P) {
            if (P && Y && typeof P.stack == "string") return [P.stack, Y.stack];
          }
          return [null, null];
        },
      };
      i.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var u = Object.getOwnPropertyDescriptor(
        i.DetermineComponentFrameRoot,
        "name",
      );
      if (u && u.configurable) {
        Object.defineProperty(i.DetermineComponentFrameRoot, "name", {
          value: "DetermineComponentFrameRoot",
        });
      }
      var d = i.DetermineComponentFrameRoot(),
        p = d[0],
        b = d[1];
      if (p && b) {
        var C = p.split(`
`),
          q = b.split(`
`);
        for (
          u = i = 0;
          i < C.length && !C[i].includes("DetermineComponentFrameRoot");
        )
          i++;
        for (; u < q.length && !q[u].includes("DetermineComponentFrameRoot"); )
          u++;
        if (i === C.length || u === q.length)
          for (
            i = C.length - 1, u = q.length - 1;
            1 <= i && 0 <= u && C[i] !== q[u];
          )
            u--;
        for (; 1 <= i && 0 <= u; i--, u--)
          if (C[i] !== q[u]) {
            if (i !== 1 || u !== 1)
              do
                if ((i--, u--, 0 > u || C[i] !== q[u])) {
                  var Q =
                    `
` + C[i].replace(" at new ", " at ");
                  return (
                    e.displayName &&
                      Q.includes("<anonymous>") &&
                      (Q = Q.replace("<anonymous>", e.displayName)),
                    Q
                  );
                }
              while (1 <= i && 0 <= u);
            break;
          }
      }
    } finally {
      Rl = !1;
      Error.prepareStackTrace = a;
    }
    return (a = e ? e.displayName || e.name : "") ? jn(a) : "";
  }
  function Zs(e, t) {
    switch (e.tag) {
      case 26:
      case 27:
      case 5:
        return jn(e.type);
      case 16:
        return jn("Lazy");
      case 13:
        return e.child !== t && t !== null
          ? jn("Suspense Fallback")
          : jn("Suspense");
      case 19:
        return jn("SuspenseList");
      case 0:
      case 15:
        return Tn(e.type, !1);
      case 11:
        return Tn(e.type.render, !1);
      case 1:
        return Tn(e.type, !0);
      case 31:
        return jn("Activity");
      default:
        return "";
    }
  }
  function Fi(e) {
    try {
      var t = "",
        a = null;
      do {
        t += Zs(e, a);
        a = e;
        e = e.return;
      } while (e);
      return t;
    } catch (i) {
      return (
        `
Error generating stack: ` +
        i.message +
        `
` +
        i.stack
      );
    }
  }
  var xr = Object.prototype.hasOwnProperty,
    _l = n.unstable_scheduleCallback,
    Tl = n.unstable_cancelCallback,
    Js = n.unstable_shouldYield,
    Is = n.unstable_requestPaint,
    pt = n.unstable_now,
    Fa = n.unstable_getCurrentPriorityLevel,
    Ol = n.unstable_ImmediatePriority,
    wr = n.unstable_UserBlockingPriority,
    Ft = n.unstable_NormalPriority,
    On = n.unstable_LowPriority,
    Cl = n.unstable_IdlePriority,
    Ws = n.log,
    Al = n.unstable_setDisableYieldValue,
    Xa = null,
    ut = null;
  function Cn(e) {
    if (
      (typeof Ws == "function" && Al(e),
      ut && typeof ut.setStrictMode == "function")
    )
      try {
        ut.setStrictMode(Xa, e);
      } catch {}
  }
  var jt = Math.clz32 ? Math.clz32 : Pi,
    Xi = Math.log,
    eu = Math.LN2;
  function Pi(e) {
    return ((e >>>= 0), e === 0 ? 32 : (31 - ((Xi(e) / eu) | 0)) | 0);
  }
  var Fn = 256,
    Pa = 262144,
    ha = 4194304;
  function Xn(e) {
    var t = e & 42;
    if (t !== 0) return t;
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return e & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return e & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return e;
    }
  }
  function Qa(e, t, a) {
    var i = e.pendingLanes;
    if (i === 0) return 0;
    var u = 0,
      d = e.suspendedLanes,
      p = e.pingedLanes;
    e = e.warmLanes;
    var b = i & 134217727;
    return (
      b !== 0
        ? ((i = b & ~d),
          i !== 0
            ? (u = Xn(i))
            : ((p &= b),
              p !== 0
                ? (u = Xn(p))
                : a || ((a = b & ~e), a !== 0 && (u = Xn(a)))))
        : ((b = i & ~d),
          b !== 0
            ? (u = Xn(b))
            : p !== 0
              ? (u = Xn(p))
              : a || ((a = i & ~e), a !== 0 && (u = Xn(a)))),
      u === 0
        ? 0
        : t !== 0 &&
            t !== u &&
            (t & d) === 0 &&
            ((d = u & -u),
            (a = t & -t),
            d >= a || (d === 32 && (a & 4194048) !== 0))
          ? t
          : u
    );
  }
  function Ka(e, t) {
    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
  }
  function Qi(e, t) {
    switch (e) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Za() {
    var e = ha;
    return ((ha <<= 1), (ha & 62914560) === 0 && (ha = 4194304), e);
  }
  function ma(e) {
    for (var t = [], a = 0; 31 > a; a++) t.push(e);
    return t;
  }
  function ga(e, t) {
    e.pendingLanes |= t;
    if (t !== 268435456) {
      ((e.suspendedLanes = 0), (e.pingedLanes = 0), (e.warmLanes = 0));
    }
  }
  function tu(e, t, a, i, u, d) {
    var p = e.pendingLanes;
    e.pendingLanes = a;
    e.suspendedLanes = 0;
    e.pingedLanes = 0;
    e.warmLanes = 0;
    e.expiredLanes &= a;
    e.entangledLanes &= a;
    e.errorRecoveryDisabledLanes &= a;
    e.shellSuspendCounter = 0;
    var b = e.entanglements,
      C = e.expirationTimes,
      q = e.hiddenUpdates;
    for (a = p & ~a; 0 < a; ) {
      var Q = 31 - jt(a),
        I = 1 << Q;
      b[Q] = 0;
      C[Q] = -1;
      var Y = q[Q];
      if (Y !== null)
        for (q[Q] = null, Q = 0; Q < Y.length; Q++) {
          var P = Y[Q];
          if (P !== null) {
            P.lane &= -536870913;
          }
        }
      a &= ~I;
    }
    if (i !== 0) {
      Ki(e, i, 0);
    }
    if (d !== 0 && u === 0 && e.tag !== 0) {
      e.suspendedLanes |= d & ~(p & ~t);
    }
  }
  function Ki(e, t, a) {
    e.pendingLanes |= t;
    e.suspendedLanes &= ~t;
    var i = 31 - jt(t);
    e.entangledLanes |= t;
    e.entanglements[i] = e.entanglements[i] | 1073741824 | (a & 261930);
  }
  function O(e, t) {
    var a = (e.entangledLanes |= t);
    for (e = e.entanglements; a; ) {
      var i = 31 - jt(a),
        u = 1 << i;
      if ((u & t) | (e[i] & t)) {
        e[i] |= t;
      }
      a &= ~u;
    }
  }
  function j(e, t) {
    var a = t & -t;
    return (
      (a = (a & 42) !== 0 ? 1 : G(a)),
      (a & (e.suspendedLanes | t)) !== 0 ? 0 : a
    );
  }
  function G(e) {
    switch (e) {
      case 2:
        e = 1;
        break;
      case 8:
        e = 4;
        break;
      case 32:
        e = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        e = 128;
        break;
      case 268435456:
        e = 134217728;
        break;
      default:
        e = 0;
    }
    return e;
  }
  function ae(e) {
    return (
      (e &= -e),
      2 < e ? (8 < e ? ((e & 134217727) !== 0 ? 32 : 268435456) : 8) : 2
    );
  }
  function se() {
    var e = V.p;
    return e !== 0 ? e : ((e = window.event), e === void 0 ? 32 : sg(e.type));
  }
  function Se(e, t) {
    var a = V.p;
    try {
      return ((V.p = e), t());
    } finally {
      V.p = a;
    }
  }
  var de = Math.random().toString(36).slice(2),
    fe = "__reactFiber$" + de,
    ge = "__reactProps$" + de,
    ve = "__reactContainer$" + de,
    _e = "__reactEvents$" + de,
    xe = "__reactListeners$" + de,
    Ge = "__reactHandles$" + de,
    Be = "__reactResources$" + de,
    ct = "__reactMarker$" + de;
  function dt(e) {
    delete e[fe];
    delete e[ge];
    delete e[_e];
    delete e[xe];
    delete e[Ge];
  }
  function ht(e) {
    var t = e[fe];
    if (t) return t;
    for (var a = e.parentNode; a; ) {
      if ((t = a[ve] || a[fe])) {
        if (
          ((a = t.alternate),
          t.child !== null || (a !== null && a.child !== null))
        )
          for (e = X0(e); e !== null; ) {
            if ((a = e[fe])) return a;
            e = X0(e);
          }
        return t;
      }
      e = a;
      a = e.parentNode;
    }
    return null;
  }
  function $e(e) {
    if ((e = e[fe] || e[ve])) {
      var t = e.tag;
      if (
        t === 5 ||
        t === 6 ||
        t === 13 ||
        t === 31 ||
        t === 26 ||
        t === 27 ||
        t === 3
      )
        return e;
    }
    return null;
  }
  function Ot(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
    throw Error(o(33));
  }
  function Xt(e) {
    var t = e[Be];
    return (
      t ||
        (t = e[Be] =
          {
            hoistableStyles: new Map(),
            hoistableScripts: new Map(),
          }),
      t
    );
  }
  function ot(e) {
    e[ct] = !0;
  }
  var An = new Set(),
    nn = {};
  function Dn(e, t) {
    hn(e, t);
    hn(e + "Capture", t);
  }
  function hn(e, t) {
    for (nn[e] = t, e = 0; e < t.length; e++) An.add(t[e]);
  }
  var Pn = RegExp(
      "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$",
    ),
    Ja = {},
    Ia = {};
  function qe(e) {
    if (xr.call(Ia, e)) {
      return !0;
    }
    if (xr.call(Ja, e)) {
      return !1;
    }
    if (Pn.test(e)) {
      return (Ia[e] = !0);
    }
    return ((Ja[e] = !0), !1);
  }
  function yt(e, t, a) {
    if (qe(t))
      if (a === null) e.removeAttribute(t);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            e.removeAttribute(t);
            return;
          case "boolean":
            var i = t.toLowerCase().slice(0, 5);
            if (i !== "data-" && i !== "aria-") {
              e.removeAttribute(t);
              return;
            }
        }
        e.setAttribute(t, "" + a);
      }
  }
  function Ln(e, t, a) {
    if (a === null) e.removeAttribute(t);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(t);
          return;
      }
      e.setAttribute(t, "" + a);
    }
  }
  function Dt(e, t, a, i) {
    if (i === null) e.removeAttribute(a);
    else {
      switch (typeof i) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(a);
          return;
      }
      e.setAttributeNS(t, a, "" + i);
    }
  }
  function Ve(e) {
    switch (typeof e) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return e;
      case "object":
        return e;
      default:
        return "";
    }
  }
  function Wa(props) {
    var t = props.type;
    return (
      (props = props.nodeName) &&
      props.toLowerCase() === "input" &&
      (t === "checkbox" || t === "radio")
    );
  }
  function Zi(e, t, a) {
    var i = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
    if (
      !e.hasOwnProperty(t) &&
      typeof i < "u" &&
      typeof i.get == "function" &&
      typeof i.set == "function"
    ) {
      var u = i.get,
        d = i.set;
      return (
        Object.defineProperty(e, t, {
          configurable: !0,
          get: function () {
            return u.call(this);
          },
          set: function (p) {
            a = "" + p;
            d.call(this, p);
          },
        }),
        Object.defineProperty(e, t, {
          enumerable: i.enumerable,
        }),
        {
          getValue: function () {
            return a;
          },
          setValue: function (p) {
            a = "" + p;
          },
          stopTracking: function () {
            e._valueTracker = null;
            delete e[t];
          },
        }
      );
    }
  }
  function Dl(e) {
    if (!e._valueTracker) {
      var t = Wa(e) ? "checked" : "value";
      e._valueTracker = Zi(e, t, "" + e[t]);
    }
  }
  function Ld(props) {
    if (!props) return !1;
    var t = props._valueTracker;
    if (!t) return !0;
    var a = t.getValue(),
      i = "";
    return (
      props &&
        (i = Wa(props) ? (props.checked ? "true" : "false") : props.value),
      (props = i),
      props !== a ? (t.setValue(props), !0) : !1
    );
  }
  function Ji(e) {
    if (
      ((e = e || (typeof document < "u" ? document : void 0)), typeof e > "u")
    )
      return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  var Zv = /[\n"\\]/g;
  function mn(e) {
    return e.replace(Zv, function (t) {
      return "\\" + t.charCodeAt(0).toString(16) + " ";
    });
  }
  function nu(e, t, a, i, u, d, p, b) {
    e.name = "";
    p != null &&
    typeof p != "function" &&
    typeof p != "symbol" &&
    typeof p != "boolean"
      ? (e.type = p)
      : e.removeAttribute("type");
    t != null
      ? p === "number"
        ? ((t === 0 && e.value === "") || e.value != t) &&
          (e.value = "" + Ve(t))
        : e.value !== "" + Ve(t) && (e.value = "" + Ve(t))
      : (p !== "submit" && p !== "reset") || e.removeAttribute("value");
    t != null
      ? au(e, p, Ve(t))
      : a != null
        ? au(e, p, Ve(a))
        : i != null && e.removeAttribute("value");
    if (u == null && d != null) {
      e.defaultChecked = !!d;
    }
    if (u != null) {
      e.checked = u && typeof u != "function" && typeof u != "symbol";
    }
    b != null &&
    typeof b != "function" &&
    typeof b != "symbol" &&
    typeof b != "boolean"
      ? (e.name = "" + Ve(b))
      : e.removeAttribute("name");
  }
  function Nd(e, t, a, i, u, d, p, b) {
    if (
      (d != null &&
        typeof d != "function" &&
        typeof d != "symbol" &&
        typeof d != "boolean" &&
        (e.type = d),
      t != null || a != null)
    ) {
      if (!((d !== "submit" && d !== "reset") || t != null)) {
        Dl(e);
        return;
      }
      a = a != null ? "" + Ve(a) : "";
      t = t != null ? "" + Ve(t) : a;
      b || t === e.value || (e.value = t);
      e.defaultValue = t;
    }
    i = i ?? u;
    i = typeof i != "function" && typeof i != "symbol" && !!i;
    e.checked = b ? e.checked : !!i;
    e.defaultChecked = !!i;
    if (
      p != null &&
      typeof p != "function" &&
      typeof p != "symbol" &&
      typeof p != "boolean"
    ) {
      e.name = p;
    }
    Dl(e);
  }
  function au(e, t, a) {
    (t === "number" && Ji(e.ownerDocument) === e) ||
      e.defaultValue === "" + a ||
      (e.defaultValue = "" + a);
  }
  function Rr(e, t, a, i) {
    if (((e = e.options), t)) {
      t = {};
      for (var u = 0; u < a.length; u++) t["$" + a[u]] = !0;
      for (a = 0; a < e.length; a++) {
        u = t.hasOwnProperty("$" + e[a].value);
        if (e[a].selected !== u) {
          e[a].selected = u;
        }
        if (u && i) {
          e[a].defaultSelected = !0;
        }
      }
    } else {
      for (a = "" + Ve(a), t = null, u = 0; u < e.length; u++) {
        if (e[u].value === a) {
          e[u].selected = !0;
          if (i) {
            e[u].defaultSelected = !0;
          }
          return;
        }
        t !== null || e[u].disabled || (t = e[u]);
      }
      if (t !== null) {
        t.selected = !0;
      }
    }
  }
  function Md(e, t, a) {
    if (
      t != null &&
      ((t = "" + Ve(t)), t !== e.value && (e.value = t), a == null)
    ) {
      if (e.defaultValue !== t) {
        e.defaultValue = t;
      }
      return;
    }
    e.defaultValue = a != null ? "" + Ve(a) : "";
  }
  function zd(e, t, a, i) {
    if (t == null) {
      if (i != null) {
        if (a != null) throw Error(o(92));
        if (Z(i)) {
          if (1 < i.length) throw Error(o(93));
          i = i[0];
        }
        a = i;
      }
      if (a == null) {
        a = "";
      }
      t = a;
    }
    a = Ve(t);
    e.defaultValue = a;
    i = e.textContent;
    if (i === a && i !== "" && i !== null) {
      e.value = i;
    }
    Dl(e);
  }
  function _r(e, t) {
    if (t) {
      var a = e.firstChild;
      if (a && a === e.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var Jv = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " ",
    ),
  );
  function kd(e, t, a) {
    var i = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === ""
      ? i
        ? e.setProperty(t, "")
        : t === "float"
          ? (e.cssFloat = "")
          : (e[t] = "")
      : i
        ? e.setProperty(t, a)
        : typeof a != "number" || a === 0 || Jv.has(t)
          ? t === "float"
            ? (e.cssFloat = a)
            : (e[t] = ("" + a).trim())
          : (e[t] = a + "px");
  }
  function jd(e, t, a) {
    if (t != null && typeof t != "object") throw Error(o(62));
    if (((e = e.style), a != null)) {
      for (var i in a)
        !a.hasOwnProperty(i) ||
          (t != null && t.hasOwnProperty(i)) ||
          (i.indexOf("--") === 0
            ? e.setProperty(i, "")
            : i === "float"
              ? (e.cssFloat = "")
              : (e[i] = ""));
      for (var u in t) {
        i = t[u];
        if (t.hasOwnProperty(u) && a[u] !== i) {
          kd(e, u, i);
        }
      }
    } else
      for (var d in t)
        if (t.hasOwnProperty(d)) {
          kd(e, d, t[d]);
        }
  }
  function ru(e) {
    if (e.indexOf("-") === -1) return !1;
    switch (e) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Iv = new Map([
      ["acceptCharset", "accept-charset"],
      ["htmlFor", "for"],
      ["httpEquiv", "http-equiv"],
      ["crossOrigin", "crossorigin"],
      ["accentHeight", "accent-height"],
      ["alignmentBaseline", "alignment-baseline"],
      ["arabicForm", "arabic-form"],
      ["baselineShift", "baseline-shift"],
      ["capHeight", "cap-height"],
      ["clipPath", "clip-path"],
      ["clipRule", "clip-rule"],
      ["colorInterpolation", "color-interpolation"],
      ["colorInterpolationFilters", "color-interpolation-filters"],
      ["colorProfile", "color-profile"],
      ["colorRendering", "color-rendering"],
      ["dominantBaseline", "dominant-baseline"],
      ["enableBackground", "enable-background"],
      ["fillOpacity", "fill-opacity"],
      ["fillRule", "fill-rule"],
      ["floodColor", "flood-color"],
      ["floodOpacity", "flood-opacity"],
      ["fontFamily", "font-family"],
      ["fontSize", "font-size"],
      ["fontSizeAdjust", "font-size-adjust"],
      ["fontStretch", "font-stretch"],
      ["fontStyle", "font-style"],
      ["fontVariant", "font-variant"],
      ["fontWeight", "font-weight"],
      ["glyphName", "glyph-name"],
      ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
      ["glyphOrientationVertical", "glyph-orientation-vertical"],
      ["horizAdvX", "horiz-adv-x"],
      ["horizOriginX", "horiz-origin-x"],
      ["imageRendering", "image-rendering"],
      ["letterSpacing", "letter-spacing"],
      ["lightingColor", "lighting-color"],
      ["markerEnd", "marker-end"],
      ["markerMid", "marker-mid"],
      ["markerStart", "marker-start"],
      ["overlinePosition", "overline-position"],
      ["overlineThickness", "overline-thickness"],
      ["paintOrder", "paint-order"],
      ["panose-1", "panose-1"],
      ["pointerEvents", "pointer-events"],
      ["renderingIntent", "rendering-intent"],
      ["shapeRendering", "shape-rendering"],
      ["stopColor", "stop-color"],
      ["stopOpacity", "stop-opacity"],
      ["strikethroughPosition", "strikethrough-position"],
      ["strikethroughThickness", "strikethrough-thickness"],
      ["strokeDasharray", "stroke-dasharray"],
      ["strokeDashoffset", "stroke-dashoffset"],
      ["strokeLinecap", "stroke-linecap"],
      ["strokeLinejoin", "stroke-linejoin"],
      ["strokeMiterlimit", "stroke-miterlimit"],
      ["strokeOpacity", "stroke-opacity"],
      ["strokeWidth", "stroke-width"],
      ["textAnchor", "text-anchor"],
      ["textDecoration", "text-decoration"],
      ["textRendering", "text-rendering"],
      ["transformOrigin", "transform-origin"],
      ["underlinePosition", "underline-position"],
      ["underlineThickness", "underline-thickness"],
      ["unicodeBidi", "unicode-bidi"],
      ["unicodeRange", "unicode-range"],
      ["unitsPerEm", "units-per-em"],
      ["vAlphabetic", "v-alphabetic"],
      ["vHanging", "v-hanging"],
      ["vIdeographic", "v-ideographic"],
      ["vMathematical", "v-mathematical"],
      ["vectorEffect", "vector-effect"],
      ["vertAdvY", "vert-adv-y"],
      ["vertOriginX", "vert-origin-x"],
      ["vertOriginY", "vert-origin-y"],
      ["wordSpacing", "word-spacing"],
      ["writingMode", "writing-mode"],
      ["xmlnsXlink", "xmlns:xlink"],
      ["xHeight", "x-height"],
    ]),
    Wv =
      /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function Ii(e) {
    return Wv.test("" + e)
      ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
      : e;
  }
  function Qn() {}
  var lu = null;
  function iu(event) {
    return (
      (event = event.target || event.srcElement || window),
      event.correspondingUseElement && (event = event.correspondingUseElement),
      event.nodeType === 3 ? event.parentNode : event
    );
  }
  var Tr = null,
    Or = null;
  function Ud(e) {
    var t = $e(e);
    if (t && (e = t.stateNode)) {
      var a = e[ge] || null;
      e: switch (((e = t.stateNode), t.type)) {
        case "input":
          if (
            (nu(
              e,
              a.value,
              a.defaultValue,
              a.defaultValue,
              a.checked,
              a.defaultChecked,
              a.type,
              a.name,
            ),
            (t = a.name),
            a.type === "radio" && t != null)
          ) {
            for (a = e; a.parentNode; ) a = a.parentNode;
            for (
              a = a.querySelectorAll(
                'input[name="' + mn("" + t) + '"][type="radio"]',
              ),
                t = 0;
              t < a.length;
              t++
            ) {
              var i = a[t];
              if (i !== e && i.form === e.form) {
                var u = i[ge] || null;
                if (!u) throw Error(o(90));
                nu(
                  i,
                  u.value,
                  u.defaultValue,
                  u.defaultValue,
                  u.checked,
                  u.defaultChecked,
                  u.type,
                  u.name,
                );
              }
            }
            for (t = 0; t < a.length; t++) {
              i = a[t];
              if (i.form === e.form) {
                Ld(i);
              }
            }
          }
          break e;
        case "textarea":
          Md(e, a.value, a.defaultValue);
          break e;
        case "select":
          t = a.value;
          if (t != null) {
            Rr(e, !!a.multiple, t, !1);
          }
      }
    }
  }
  var ou = !1;
  function Hd(e, t, a) {
    if (ou) return e(t, a);
    ou = !0;
    try {
      var i = e(t);
      return i;
    } finally {
      if (
        ((ou = !1),
        (Tr !== null || Or !== null) &&
          ($o(), Tr && ((t = Tr), (e = Or), (Or = Tr = null), Ud(t), e)))
      )
        for (t = 0; t < e.length; t++) Ud(e[t]);
    }
  }
  function Ll(e, t) {
    var a = e.stateNode;
    if (a === null) return null;
    var i = a[ge] || null;
    if (i === null) return null;
    a = i[t];
    e: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (i = !i.disabled) ||
          ((e = e.type),
          (i = !(
            e === "button" ||
            e === "input" ||
            e === "select" ||
            e === "textarea"
          )));
        e = !i;
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (a && typeof a != "function") throw Error(o(231, t, typeof a));
    return a;
  }
  var Kn = !(
      typeof window > "u" ||
      typeof window.document > "u" ||
      typeof window.document.createElement > "u"
    ),
    su = !1;
  if (Kn)
    try {
      var Nl = {};
      Object.defineProperty(Nl, "passive", {
        get: function () {
          su = !0;
        },
      });
      window.addEventListener("test", Nl, Nl);
      window.removeEventListener("test", Nl, Nl);
    } catch {
      su = !1;
    }
  var pa = null,
    uu = null,
    Wi = null;
  function Bd() {
    if (Wi) return Wi;
    var e,
      t = uu,
      a = t.length,
      i,
      u = "value" in pa ? pa.value : pa.textContent,
      d = u.length;
    for (e = 0; e < a && t[e] === u[e]; e++);
    var p = a - e;
    for (i = 1; i <= p && t[a - i] === u[d - i]; i++);
    return (Wi = u.slice(e, 1 < i ? 1 - i : void 0));
  }
  function eo(event) {
    var t = event.keyCode;
    return (
      "charCode" in event
        ? ((event = event.charCode), event === 0 && t === 13 && (event = 13))
        : (event = t),
      event === 10 && (event = 13),
      32 <= event || event === 13 ? event : 0
    );
  }
  function to() {
    return !0;
  }
  function $d() {
    return !1;
  }
  function Pt(e) {
    function t(a, i, u, d, p) {
      this._reactName = a;
      this._targetInst = u;
      this.type = i;
      this.nativeEvent = d;
      this.target = p;
      this.currentTarget = null;
      for (var b in e)
        if (e.hasOwnProperty(b)) {
          ((a = e[b]), (this[b] = a ? a(d) : d[b]));
        }
      return (
        (this.isDefaultPrevented = (
          d.defaultPrevented != null ? d.defaultPrevented : d.returnValue === !1
        )
          ? to
          : $d),
        (this.isPropagationStopped = $d),
        this
      );
    }
    return (
      v(t.prototype, {
        preventDefault: function () {
          this.defaultPrevented = !0;
          var a = this.nativeEvent;
          if (a) {
            (a.preventDefault
              ? a.preventDefault()
              : typeof a.returnValue != "unknown" && (a.returnValue = !1),
              (this.isDefaultPrevented = to));
          }
        },
        stopPropagation: function () {
          var a = this.nativeEvent;
          if (a) {
            (a.stopPropagation
              ? a.stopPropagation()
              : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0),
              (this.isPropagationStopped = to));
          }
        },
        persist: function () {},
        isPersistent: to,
      }),
      t
    );
  }
  var er = {
      eventPhase: 0,
      bubbles: 0,
      cancelable: 0,
      timeStamp: function (e) {
        return e.timeStamp || Date.now();
      },
      defaultPrevented: 0,
      isTrusted: 0,
    },
    no = Pt(er),
    Ml = v({}, er, {
      view: 0,
      detail: 0,
    }),
    eb = Pt(Ml),
    cu,
    fu,
    zl,
    ao = v({}, Ml, {
      screenX: 0,
      screenY: 0,
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      getModifierState: hu,
      button: 0,
      buttons: 0,
      relatedTarget: function (e) {
        return e.relatedTarget === void 0
          ? e.fromElement === e.srcElement
            ? e.toElement
            : e.fromElement
          : e.relatedTarget;
      },
      movementX: function (props) {
        return "movementX" in props
          ? props.movementX
          : (props !== zl &&
              (zl && props.type === "mousemove"
                ? ((cu = props.screenX - zl.screenX),
                  (fu = props.screenY - zl.screenY))
                : (fu = cu = 0),
              (zl = props)),
            cu);
      },
      movementY: function (e) {
        return "movementY" in e ? e.movementY : fu;
      },
    }),
    qd = Pt(ao),
    tb = v({}, ao, {
      dataTransfer: 0,
    }),
    nb = Pt(tb),
    ab = v({}, Ml, {
      relatedTarget: 0,
    }),
    du = Pt(ab),
    rb = v({}, er, {
      animationName: 0,
      elapsedTime: 0,
      pseudoElement: 0,
    }),
    lb = Pt(rb),
    ib = v({}, er, {
      clipboardData: function (e) {
        return "clipboardData" in e ? e.clipboardData : window.clipboardData;
      },
    }),
    ob = Pt(ib),
    sb = v({}, er, {
      data: 0,
    }),
    Vd = Pt(sb),
    ub = {
      Esc: "Escape",
      Spacebar: " ",
      Left: "ArrowLeft",
      Up: "ArrowUp",
      Right: "ArrowRight",
      Down: "ArrowDown",
      Del: "Delete",
      Win: "OS",
      Menu: "ContextMenu",
      Apps: "ContextMenu",
      Scroll: "ScrollLock",
      MozPrintableKey: "Unidentified",
    },
    cb = {
      8: "Backspace",
      9: "Tab",
      12: "Clear",
      13: "Enter",
      16: "Shift",
      17: "Control",
      18: "Alt",
      19: "Pause",
      20: "CapsLock",
      27: "Escape",
      32: " ",
      33: "PageUp",
      34: "PageDown",
      35: "End",
      36: "Home",
      37: "ArrowLeft",
      38: "ArrowUp",
      39: "ArrowRight",
      40: "ArrowDown",
      45: "Insert",
      46: "Delete",
      112: "F1",
      113: "F2",
      114: "F3",
      115: "F4",
      116: "F5",
      117: "F6",
      118: "F7",
      119: "F8",
      120: "F9",
      121: "F10",
      122: "F11",
      123: "F12",
      144: "NumLock",
      145: "ScrollLock",
      224: "Meta",
    },
    fb = {
      Alt: "altKey",
      Control: "ctrlKey",
      Meta: "metaKey",
      Shift: "shiftKey",
    };
  function db(e) {
    var t = this.nativeEvent;
    if (t.getModifierState) {
      return t.getModifierState(e);
    }
    if ((e = fb[e])) {
      return !!t[e];
    }
    return !1;
  }
  function hu() {
    return db;
  }
  var hb = v({}, Ml, {
      key: function (props) {
        if (props.key) {
          var t = ub[props.key] || props.key;
          if (t !== "Unidentified") return t;
        }
        if (props.type === "keypress") {
          return (
            (props = eo(props)),
            props === 13 ? "Enter" : String.fromCharCode(props)
          );
        }
        if (props.type === "keydown" || props.type === "keyup") {
          return cb[props.keyCode] || "Unidentified";
        }
        return "";
      },
      code: 0,
      location: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      repeat: 0,
      locale: 0,
      getModifierState: hu,
      charCode: function (props) {
        return props.type === "keypress" ? eo(props) : 0;
      },
      keyCode: function (props) {
        return props.type === "keydown" || props.type === "keyup"
          ? props.keyCode
          : 0;
      },
      which: function (props) {
        if (props.type === "keypress") {
          return eo(props);
        }
        if (props.type === "keydown" || props.type === "keyup") {
          return props.keyCode;
        }
        return 0;
      },
    }),
    mb = Pt(hb),
    gb = v({}, ao, {
      pointerId: 0,
      width: 0,
      height: 0,
      pressure: 0,
      tangentialPressure: 0,
      tiltX: 0,
      tiltY: 0,
      twist: 0,
      pointerType: 0,
      isPrimary: 0,
    }),
    Yd = Pt(gb),
    pb = v({}, Ml, {
      touches: 0,
      targetTouches: 0,
      changedTouches: 0,
      altKey: 0,
      metaKey: 0,
      ctrlKey: 0,
      shiftKey: 0,
      getModifierState: hu,
    }),
    yb = Pt(pb),
    vb = v({}, er, {
      propertyName: 0,
      elapsedTime: 0,
      pseudoElement: 0,
    }),
    bb = Pt(vb),
    Sb = v({}, ao, {
      deltaX: function (e) {
        if ("deltaX" in e) {
          return e.deltaX;
        }
        if ("wheelDeltaX" in e) {
          return -e.wheelDeltaX;
        }
        return 0;
      },
      deltaY: function (e) {
        if ("deltaY" in e) {
          return e.deltaY;
        }
        if ("wheelDeltaY" in e) {
          return -e.wheelDeltaY;
        }
        if ("wheelDelta" in e) {
          return -e.wheelDelta;
        }
        return 0;
      },
      deltaZ: 0,
      deltaMode: 0,
    }),
    Eb = Pt(Sb),
    xb = v({}, er, {
      newState: 0,
      oldState: 0,
    }),
    wb = Pt(xb),
    Rb = [9, 13, 27, 32],
    mu = Kn && "CompositionEvent" in window,
    kl = null;
  if (Kn && "documentMode" in document) {
    kl = document.documentMode;
  }
  var _b = Kn && "TextEvent" in window && !kl,
    Gd = Kn && (!mu || (kl && 8 < kl && 11 >= kl)),
    Fd = " ",
    Xd = !1;
  function Pd(e, t) {
    switch (e) {
      case "keyup":
        return Rb.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function Qd(e) {
    return (
      (e = e.detail),
      typeof e == "object" && "data" in e ? e.data : null
    );
  }
  var Cr = !1;
  function Tb(e, t) {
    switch (e) {
      case "compositionend":
        return Qd(t);
      case "keypress":
        return t.which !== 32 ? null : ((Xd = !0), Fd);
      case "textInput":
        return ((e = t.data), e === Fd && Xd ? null : e);
      default:
        return null;
    }
  }
  function Ob(e, t) {
    if (Cr)
      return e === "compositionend" || (!mu && Pd(e, t))
        ? ((e = Bd()), (Wi = uu = pa = null), (Cr = !1), e)
        : null;
    switch (e) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
          if (t.char && 1 < t.char.length) return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return Gd && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var Cb = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0,
  };
  function Kd(props) {
    var t = props && props.nodeName && props.nodeName.toLowerCase();
    return t === "input" ? !!Cb[props.type] : t === "textarea";
  }
  function Zd(e, t, a, i) {
    Tr ? (Or ? Or.push(i) : (Or = [i])) : (Tr = i);
    t = Po(t, "onChange");
    if (0 < t.length) {
      ((a = new no("onChange", "change", null, a, i)),
        e.push({
          event: a,
          listeners: t,
        }));
    }
  }
  var jl = null,
    Ul = null;
  function Ab(e) {
    N0(e, 0);
  }
  function ro(e) {
    var t = Ot(e);
    if (Ld(t)) return e;
  }
  function Jd(e, t) {
    if (e === "change") return t;
  }
  var Id = !1;
  if (Kn) {
    var gu;
    if (Kn) {
      var pu = "oninput" in document;
      if (!pu) {
        var Wd = document.createElement("div");
        Wd.setAttribute("oninput", "return;");
        pu = typeof Wd.oninput == "function";
      }
      gu = pu;
    } else gu = !1;
    Id = gu && (!document.documentMode || 9 < document.documentMode);
  }
  function eh() {
    if (jl) {
      (jl.detachEvent("onpropertychange", th), (Ul = jl = null));
    }
  }
  function th(e) {
    if (e.propertyName === "value" && ro(Ul)) {
      var t = [];
      Zd(t, Ul, e, iu(e));
      Hd(Ab, t);
    }
  }
  function Db(e, t, a) {
    e === "focusin"
      ? (eh(), (jl = t), (Ul = a), jl.attachEvent("onpropertychange", th))
      : e === "focusout" && eh();
  }
  function Lb(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown")
      return ro(Ul);
  }
  function Nb(e, t) {
    if (e === "click") return ro(t);
  }
  function Mb(e, t) {
    if (e === "input" || e === "change") return ro(t);
  }
  function zb(e, t) {
    return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
  }
  var an = typeof Object.is == "function" ? Object.is : zb;
  function Hl(e, t) {
    if (an(e, t)) return !0;
    if (
      typeof e != "object" ||
      e === null ||
      typeof t != "object" ||
      t === null
    )
      return !1;
    var a = Object.keys(e),
      i = Object.keys(t);
    if (a.length !== i.length) return !1;
    for (i = 0; i < a.length; i++) {
      var u = a[i];
      if (!xr.call(t, u) || !an(e[u], t[u])) return !1;
    }
    return !0;
  }
  function nh(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function ah(e, t) {
    var a = nh(e);
    e = 0;
    for (var i; a; ) {
      if (a.nodeType === 3) {
        if (((i = e + a.textContent.length), e <= t && i >= t))
          return {
            node: a,
            offset: t - e,
          };
        e = i;
      }
      e: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break e;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = nh(a);
    }
  }
  function rh(e, t) {
    return e && t
      ? e === t
        ? !0
        : e && e.nodeType === 3
          ? !1
          : t && t.nodeType === 3
            ? rh(e, t.parentNode)
            : "contains" in e
              ? e.contains(t)
              : e.compareDocumentPosition
                ? !!(e.compareDocumentPosition(t) & 16)
                : !1
      : !1;
  }
  function lh(e) {
    e =
      e != null &&
      e.ownerDocument != null &&
      e.ownerDocument.defaultView != null
        ? e.ownerDocument.defaultView
        : window;
    for (var t = Ji(e.document); t instanceof e.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) e = t.contentWindow;
      else break;
      t = Ji(e.document);
    }
    return t;
  }
  function yu(props) {
    var t = props && props.nodeName && props.nodeName.toLowerCase();
    return (
      t &&
      ((t === "input" &&
        (props.type === "text" ||
          props.type === "search" ||
          props.type === "tel" ||
          props.type === "url" ||
          props.type === "password")) ||
        t === "textarea" ||
        props.contentEditable === "true")
    );
  }
  var kb = Kn && "documentMode" in document && 11 >= document.documentMode,
    Ar = null,
    vu = null,
    Bl = null,
    bu = !1;
  function ih(e, t, a) {
    var i =
      a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    bu ||
      Ar == null ||
      Ar !== Ji(i) ||
      ((i = Ar),
      "selectionStart" in i && yu(i)
        ? (i = {
            start: i.selectionStart,
            end: i.selectionEnd,
          })
        : ((i = (
            (i.ownerDocument && i.ownerDocument.defaultView) ||
            window
          ).getSelection()),
          (i = {
            anchorNode: i.anchorNode,
            anchorOffset: i.anchorOffset,
            focusNode: i.focusNode,
            focusOffset: i.focusOffset,
          })),
      (Bl && Hl(Bl, i)) ||
        ((Bl = i),
        (i = Po(vu, "onSelect")),
        0 < i.length &&
          ((t = new no("onSelect", "select", null, t, a)),
          e.push({
            event: t,
            listeners: i,
          }),
          (t.target = Ar))));
  }
  function tr(e, t) {
    var a = {};
    return (
      (a[e.toLowerCase()] = t.toLowerCase()),
      (a["Webkit" + e] = "webkit" + t),
      (a["Moz" + e] = "moz" + t),
      a
    );
  }
  var Dr = {
      animationend: tr("Animation", "AnimationEnd"),
      animationiteration: tr("Animation", "AnimationIteration"),
      animationstart: tr("Animation", "AnimationStart"),
      transitionrun: tr("Transition", "TransitionRun"),
      transitionstart: tr("Transition", "TransitionStart"),
      transitioncancel: tr("Transition", "TransitionCancel"),
      transitionend: tr("Transition", "TransitionEnd"),
    },
    Su = {},
    oh = {};
  if (Kn) {
    ((oh = document.createElement("div").style),
      "AnimationEvent" in window ||
        (delete Dr.animationend.animation,
        delete Dr.animationiteration.animation,
        delete Dr.animationstart.animation),
      "TransitionEvent" in window || delete Dr.transitionend.transition);
  }
  function nr(e) {
    if (Su[e]) return Su[e];
    if (!Dr[e]) return e;
    var t = Dr[e],
      a;
    for (a in t) if (t.hasOwnProperty(a) && a in oh) return (Su[e] = t[a]);
    return e;
  }
  var sh = nr("animationend"),
    uh = nr("animationiteration"),
    ch = nr("animationstart"),
    jb = nr("transitionrun"),
    Ub = nr("transitionstart"),
    Hb = nr("transitioncancel"),
    fh = nr("transitionend"),
    dh = new Map(),
    Eu =
      "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
        " ",
      );
  Eu.push("scrollEnd");
  function Nn(e, t) {
    dh.set(e, t);
    Dn(t, [e]);
  }
  var lo =
      typeof reportError == "function"
        ? reportError
        : function (e) {
            if (
              typeof window == "object" &&
              typeof window.ErrorEvent == "function"
            ) {
              var t = new window.ErrorEvent("error", {
                bubbles: !0,
                cancelable: !0,
                message:
                  typeof e == "object" &&
                  e !== null &&
                  typeof e.message == "string"
                    ? String(e.message)
                    : String(e),
                error: e,
              });
              if (!window.dispatchEvent(t)) return;
            } else if (
              typeof process == "object" &&
              typeof process.emit == "function"
            ) {
              process.emit("uncaughtException", e);
              return;
            }
            console.error(e);
          },
    gn = [],
    Lr = 0,
    xu = 0;
  function io() {
    for (var e = Lr, t = (xu = Lr = 0); t < e; ) {
      var a = gn[t];
      gn[t++] = null;
      var i = gn[t];
      gn[t++] = null;
      var u = gn[t];
      gn[t++] = null;
      var d = gn[t];
      if (((gn[t++] = null), i !== null && u !== null)) {
        var p = i.pending;
        p === null ? (u.next = u) : ((u.next = p.next), (p.next = u));
        i.pending = u;
      }
      if (d !== 0) {
        hh(a, u, d);
      }
    }
  }
  function oo(e, t, a, i) {
    gn[Lr++] = e;
    gn[Lr++] = t;
    gn[Lr++] = a;
    gn[Lr++] = i;
    xu |= i;
    e.lanes |= i;
    e = e.alternate;
    if (e !== null) {
      e.lanes |= i;
    }
  }
  function wu(e, t, a, i) {
    return (oo(e, t, a, i), so(e));
  }
  function ar(e, t) {
    return (oo(e, null, null, t), so(e));
  }
  function hh(e, t, a) {
    e.lanes |= a;
    var i = e.alternate;
    if (i !== null) {
      i.lanes |= a;
    }
    for (var u = !1, d = e.return; d !== null; ) {
      d.childLanes |= a;
      i = d.alternate;
      if (i !== null) {
        i.childLanes |= a;
      }
      if (d.tag === 22) {
        ((e = d.stateNode), e === null || e._visibility & 1 || (u = !0));
      }
      e = d;
      d = d.return;
    }
    return e.tag === 3
      ? ((d = e.stateNode),
        u &&
          t !== null &&
          ((u = 31 - jt(a)),
          (e = d.hiddenUpdates),
          (i = e[u]),
          i === null ? (e[u] = [t]) : i.push(t),
          (t.lane = a | 536870912)),
        d)
      : null;
  }
  function so(e) {
    if (50 < oi) throw ((oi = 0), (Nc = null), Error(o(185)));
    for (var t = e.return; t !== null; ) {
      e = t;
      t = e.return;
    }
    return e.tag === 3 ? e.stateNode : null;
  }
  var Nr = {};
  function Bb(e, t, a, i) {
    this.tag = e;
    this.key = a;
    this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null;
    this.index = 0;
    this.refCleanup = this.ref = null;
    this.pendingProps = t;
    this.dependencies =
      this.memoizedState =
      this.updateQueue =
      this.memoizedProps =
        null;
    this.mode = i;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function rn(e, t, a, i) {
    return new Bb(e, t, a, i);
  }
  function Ru(e) {
    return ((e = e.prototype), !(!e || !e.isReactComponent));
  }
  function Zn(e, t) {
    var a = e.alternate;
    return (
      a === null
        ? ((a = rn(e.tag, t, e.key, e.mode)),
          (a.elementType = e.elementType),
          (a.type = e.type),
          (a.stateNode = e.stateNode),
          (a.alternate = e),
          (e.alternate = a))
        : ((a.pendingProps = t),
          (a.type = e.type),
          (a.flags = 0),
          (a.subtreeFlags = 0),
          (a.deletions = null)),
      (a.flags = e.flags & 65011712),
      (a.childLanes = e.childLanes),
      (a.lanes = e.lanes),
      (a.child = e.child),
      (a.memoizedProps = e.memoizedProps),
      (a.memoizedState = e.memoizedState),
      (a.updateQueue = e.updateQueue),
      (t = e.dependencies),
      (a.dependencies =
        t === null
          ? null
          : {
              lanes: t.lanes,
              firstContext: t.firstContext,
            }),
      (a.sibling = e.sibling),
      (a.index = e.index),
      (a.ref = e.ref),
      (a.refCleanup = e.refCleanup),
      a
    );
  }
  function mh(e, t) {
    e.flags &= 65011714;
    var a = e.alternate;
    return (
      a === null
        ? ((e.childLanes = 0),
          (e.lanes = t),
          (e.child = null),
          (e.subtreeFlags = 0),
          (e.memoizedProps = null),
          (e.memoizedState = null),
          (e.updateQueue = null),
          (e.dependencies = null),
          (e.stateNode = null))
        : ((e.childLanes = a.childLanes),
          (e.lanes = a.lanes),
          (e.child = a.child),
          (e.subtreeFlags = 0),
          (e.deletions = null),
          (e.memoizedProps = a.memoizedProps),
          (e.memoizedState = a.memoizedState),
          (e.updateQueue = a.updateQueue),
          (e.type = a.type),
          (t = a.dependencies),
          (e.dependencies =
            t === null
              ? null
              : {
                  lanes: t.lanes,
                  firstContext: t.firstContext,
                })),
      e
    );
  }
  function uo(e, t, a, i, u, d) {
    var p = 0;
    if (((i = e), typeof e == "function")) {
      if (Ru(e)) {
        p = 1;
      }
    } else if (typeof e == "string")
      p = G1(e, a, ne.current)
        ? 26
        : e === "html" || e === "head" || e === "body"
          ? 27
          : 5;
    else
      e: switch (e) {
        case ie:
          return (
            (e = rn(31, a, t, u)),
            (e.elementType = ie),
            (e.lanes = d),
            e
          );
        case _:
          return rr(a.children, u, d, t);
        case A:
          p = 8;
          u |= 24;
          break;
        case z:
          return (
            (e = rn(12, a, t, u | 2)),
            (e.elementType = z),
            (e.lanes = d),
            e
          );
        case U:
          return ((e = rn(13, a, t, u)), (e.elementType = U), (e.lanes = d), e);
        case W:
          return ((e = rn(19, a, t, u)), (e.elementType = W), (e.lanes = d), e);
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case F:
                p = 10;
                break e;
              case M:
                p = 9;
                break e;
              case te:
                p = 11;
                break e;
              case D:
                p = 14;
                break e;
              case le:
                p = 16;
                i = null;
                break e;
            }
          p = 29;
          a = Error(o(130, e === null ? "null" : typeof e, ""));
          i = null;
      }
    return (
      (t = rn(p, a, t, u)),
      (t.elementType = e),
      (t.type = i),
      (t.lanes = d),
      t
    );
  }
  function rr(e, t, a, i) {
    return ((e = rn(7, e, i, t)), (e.lanes = a), e);
  }
  function _u(e, t, a) {
    return ((e = rn(6, e, null, t)), (e.lanes = a), e);
  }
  function gh(e) {
    var t = rn(18, null, null, 0);
    return ((t.stateNode = e), t);
  }
  function Tu(e, t, a) {
    return (
      (t = rn(4, e.children !== null ? e.children : [], e.key, t)),
      (t.lanes = a),
      (t.stateNode = {
        containerInfo: e.containerInfo,
        pendingChildren: null,
        implementation: e.implementation,
      }),
      t
    );
  }
  var ph = new WeakMap();
  function pn(e, t) {
    if (typeof e == "object" && e !== null) {
      var a = ph.get(e);
      return a !== void 0
        ? a
        : ((t = {
            value: e,
            source: t,
            stack: Fi(t),
          }),
          ph.set(e, t),
          t);
    }
    return {
      value: e,
      source: t,
      stack: Fi(t),
    };
  }
  var Mr = [],
    zr = 0,
    co = null,
    $l = 0,
    yn = [],
    vn = 0,
    ya = null,
    Un = 1,
    Hn = "";
  function Jn(e, t) {
    Mr[zr++] = $l;
    Mr[zr++] = co;
    co = e;
    $l = t;
  }
  function yh(e, t, a) {
    yn[vn++] = Un;
    yn[vn++] = Hn;
    yn[vn++] = ya;
    ya = e;
    var i = Un;
    e = Hn;
    var u = 32 - jt(i) - 1;
    i &= ~(1 << u);
    a += 1;
    var d = 32 - jt(t) + u;
    if (30 < d) {
      var p = u - (u % 5);
      d = (i & ((1 << p) - 1)).toString(32);
      i >>= p;
      u -= p;
      Un = (1 << (32 - jt(t) + u)) | (a << u) | i;
      Hn = d + e;
    } else {
      Un = (1 << d) | (a << u) | i;
      Hn = e;
    }
  }
  function Ou(e) {
    if (e.return !== null) {
      (Jn(e, 1), yh(e, 1, 0));
    }
  }
  function Cu(e) {
    for (; e === co; ) {
      co = Mr[--zr];
      Mr[zr] = null;
      $l = Mr[--zr];
      Mr[zr] = null;
    }
    for (; e === ya; ) {
      ya = yn[--vn];
      yn[vn] = null;
      Hn = yn[--vn];
      yn[vn] = null;
      Un = yn[--vn];
      yn[vn] = null;
    }
  }
  function vh(e, t) {
    yn[vn++] = Un;
    yn[vn++] = Hn;
    yn[vn++] = ya;
    Un = t.id;
    Hn = t.overflow;
    ya = e;
  }
  var Lt = null,
    rt = null,
    Ye = !1,
    va = null,
    bn = !1,
    Au = Error(o(519));
  function ba(e) {
    var t = Error(
      o(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1]
          ? "text"
          : "HTML",
        "",
      ),
    );
    throw (ql(pn(t, e)), Au);
  }
  function bh(props) {
    var t = props.stateNode,
      a = props.type,
      i = props.memoizedProps;
    switch (((t[fe] = props), (t[ge] = i), a)) {
      case "dialog":
        je("cancel", t);
        je("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        je("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < ui.length; a++) je(ui[a], t);
        break;
      case "source":
        je("error", t);
        break;
      case "img":
      case "image":
      case "link":
        je("error", t);
        je("load", t);
        break;
      case "details":
        je("toggle", t);
        break;
      case "input":
        je("invalid", t);
        Nd(
          t,
          i.value,
          i.defaultValue,
          i.checked,
          i.defaultChecked,
          i.type,
          i.name,
          !0,
        );
        break;
      case "select":
        je("invalid", t);
        break;
      case "textarea":
        je("invalid", t);
        zd(t, i.value, i.defaultValue, i.children);
    }
    a = i.children;
    (typeof a != "string" && typeof a != "number" && typeof a != "bigint") ||
    t.textContent === "" + a ||
    i.suppressHydrationWarning === !0 ||
    j0(t.textContent, a)
      ? (i.popover != null && (je("beforetoggle", t), je("toggle", t)),
        i.onScroll != null && je("scroll", t),
        i.onScrollEnd != null && je("scrollend", t),
        i.onClick != null && (t.onclick = Qn),
        (t = !0))
      : (t = !1);
    t || ba(props, !0);
  }
  function Sh(e) {
    for (Lt = e.return; Lt; )
      switch (Lt.tag) {
        case 5:
        case 31:
        case 13:
          bn = !1;
          return;
        case 27:
        case 3:
          bn = !0;
          return;
        default:
          Lt = Lt.return;
      }
  }
  function kr(props) {
    if (props !== Lt) return !1;
    if (!Ye) return (Sh(props), (Ye = !0), !1);
    var t = props.tag,
      a;
    if (
      ((a = t !== 3 && t !== 27) &&
        ((a = t === 5) &&
          ((a = props.type),
          (a =
            !(a !== "form" && a !== "button") ||
            Pc(props.type, props.memoizedProps))),
        (a = !a)),
      a && rt && ba(props),
      Sh(props),
      t === 13)
    ) {
      if (
        ((props = props.memoizedState),
        (props = props !== null ? props.dehydrated : null),
        !props)
      )
        throw Error(o(317));
      rt = F0(props);
    } else if (t === 31) {
      if (
        ((props = props.memoizedState),
        (props = props !== null ? props.dehydrated : null),
        !props)
      )
        throw Error(o(317));
      rt = F0(props);
    } else
      t === 27
        ? ((t = rt),
          Ma(props.type) ? ((props = Ic), (Ic = null), (rt = props)) : (rt = t))
        : (rt = Lt ? En(props.stateNode.nextSibling) : null);
    return !0;
  }
  function lr() {
    rt = Lt = null;
    Ye = !1;
  }
  function Du() {
    var e = va;
    return (
      e !== null &&
        (Jt === null ? (Jt = e) : Jt.push.apply(Jt, e), (va = null)),
      e
    );
  }
  function ql(e) {
    va === null ? (va = [e]) : va.push(e);
  }
  var Lu = R(null),
    ir = null,
    In = null;
  function Sa(e, t, a) {
    J(Lu, t._currentValue);
    t._currentValue = a;
  }
  function Wn(e) {
    e._currentValue = Lu.current;
    H(Lu);
  }
  function Nu(e, t, a) {
    for (; e !== null; ) {
      var i = e.alternate;
      if (
        ((e.childLanes & t) !== t
          ? ((e.childLanes |= t), i !== null && (i.childLanes |= t))
          : i !== null && (i.childLanes & t) !== t && (i.childLanes |= t),
        e === a)
      )
        break;
      e = e.return;
    }
  }
  function Mu(e, t, a, i) {
    var u = e.child;
    for (u !== null && (u.return = e); u !== null; ) {
      var d = u.dependencies;
      if (d !== null) {
        var p = u.child;
        d = d.firstContext;
        e: for (; d !== null; ) {
          var b = d;
          d = u;
          for (var C = 0; C < t.length; C++)
            if (b.context === t[C]) {
              d.lanes |= a;
              b = d.alternate;
              if (b !== null) {
                b.lanes |= a;
              }
              Nu(d.return, a, e);
              i || (p = null);
              break e;
            }
          d = b.next;
        }
      } else if (u.tag === 18) {
        if (((p = u.return), p === null)) throw Error(o(341));
        p.lanes |= a;
        d = p.alternate;
        if (d !== null) {
          d.lanes |= a;
        }
        Nu(p, a, e);
        p = null;
      } else p = u.child;
      if (p !== null) p.return = u;
      else
        for (p = u; p !== null; ) {
          if (p === e) {
            p = null;
            break;
          }
          if (((u = p.sibling), u !== null)) {
            u.return = p.return;
            p = u;
            break;
          }
          p = p.return;
        }
      u = p;
    }
  }
  function jr(e, t, a, i) {
    e = null;
    for (var u = t, d = !1; u !== null; ) {
      if (!d) {
        if ((u.flags & 524288) !== 0) d = !0;
        else if ((u.flags & 262144) !== 0) break;
      }
      if (u.tag === 10) {
        var p = u.alternate;
        if (p === null) throw Error(o(387));
        if (((p = p.memoizedProps), p !== null)) {
          var b = u.type;
          an(u.pendingProps.value, p.value) ||
            (e !== null ? e.push(b) : (e = [b]));
        }
      } else if (u === Ae.current) {
        if (((p = u.alternate), p === null)) throw Error(o(387));
        if (p.memoizedState.memoizedState !== u.memoizedState.memoizedState) {
          e !== null ? e.push(mi) : (e = [mi]);
        }
      }
      u = u.return;
    }
    if (e !== null) {
      Mu(t, e, a, i);
    }
    t.flags |= 262144;
  }
  function fo(e) {
    for (e = e.firstContext; e !== null; ) {
      if (!an(e.context._currentValue, e.memoizedValue)) return !0;
      e = e.next;
    }
    return !1;
  }
  function or(e) {
    ir = e;
    In = null;
    e = e.dependencies;
    if (e !== null) {
      e.firstContext = null;
    }
  }
  function Nt(e) {
    return Eh(ir, e);
  }
  function ho(e, t) {
    return (ir === null && or(e), Eh(e, t));
  }
  function Eh(e, t) {
    var a = t._currentValue;
    if (
      ((t = {
        context: t,
        memoizedValue: a,
        next: null,
      }),
      In === null)
    ) {
      if (e === null) throw Error(o(308));
      In = t;
      e.dependencies = {
        lanes: 0,
        firstContext: t,
      };
      e.flags |= 524288;
    } else In = In.next = t;
    return a;
  }
  var $b =
      typeof AbortController < "u"
        ? AbortController
        : function () {
            var e = [],
              t = (this.signal = {
                aborted: !1,
                addEventListener: function (a, i) {
                  e.push(i);
                },
              });
            this.abort = function () {
              t.aborted = !0;
              e.forEach(function (item) {
                return item();
              });
            };
          },
    qb = n.unstable_scheduleCallback,
    Vb = n.unstable_NormalPriority,
    xt = {
      $$typeof: F,
      Consumer: null,
      Provider: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
    };
  function zu() {
    return {
      controller: new $b(),
      data: new Map(),
      refCount: 0,
    };
  }
  function Vl(e) {
    e.refCount--;
    if (e.refCount === 0) {
      qb(Vb, function () {
        e.controller.abort();
      });
    }
  }
  var Yl = null,
    ku = 0,
    Ur = 0,
    Hr = null;
  function Yb(e, t) {
    if (Yl === null) {
      var a = (Yl = []);
      ku = 0;
      Ur = Hc();
      Hr = {
        status: "pending",
        value: void 0,
        then: function (i) {
          a.push(i);
        },
      };
    }
    return (ku++, t.then(xh, xh), t);
  }
  function xh() {
    if (--ku === 0 && Yl !== null) {
      if (Hr !== null) {
        Hr.status = "fulfilled";
      }
      var e = Yl;
      Yl = null;
      Ur = 0;
      Hr = null;
      for (var t = 0; t < e.length; t++) (0, e[t])();
    }
  }
  function Gb(e, t) {
    var a = [],
      i = {
        status: "pending",
        value: null,
        reason: null,
        then: function (u) {
          a.push(u);
        },
      };
    return (
      e.then(
        function () {
          i.status = "fulfilled";
          i.value = t;
          for (var u = 0; u < a.length; u++) (0, a[u])(t);
        },
        function (response) {
          for (
            i.status = "rejected", i.reason = response, response = 0;
            response < a.length;
            response++
          )
            (0, a[response])(void 0);
        },
      ),
      i
    );
  }
  var wh = T.S;
  T.S = function (e, t) {
    i0 = pt();
    if (typeof t == "object" && t !== null && typeof t.then == "function") {
      Yb(e, t);
    }
    if (wh !== null) {
      wh(e, t);
    }
  };
  var sr = R(null);
  function ju() {
    var e = sr.current;
    return e !== null ? e : nt.pooledCache;
  }
  function mo(e, t) {
    t === null ? J(sr, sr.current) : J(sr, t.pool);
  }
  function Rh() {
    var e = ju();
    return e === null
      ? null
      : {
          parent: xt._currentValue,
          pool: e,
        };
  }
  var Br = Error(o(460)),
    Uu = Error(o(474)),
    go = Error(o(542)),
    po = {
      then: function () {},
    };
  function _h(e) {
    return ((e = e.status), e === "fulfilled" || e === "rejected");
  }
  function Th(e, t, a) {
    switch (
      ((a = e[a]),
      a === void 0 ? e.push(t) : a !== t && (t.then(Qn, Qn), (t = a)),
      t.status)
    ) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw ((e = t.reason), Ch(e), e);
      default:
        if (typeof t.status == "string") t.then(Qn, Qn);
        else {
          if (((e = nt), e !== null && 100 < e.shellSuspendCounter))
            throw Error(o(482));
          e = t;
          e.status = "pending";
          e.then(
            function (response) {
              if (t.status === "pending") {
                var u = t;
                u.status = "fulfilled";
                u.value = response;
              }
            },
            function (response) {
              if (t.status === "pending") {
                var u = t;
                u.status = "rejected";
                u.reason = response;
              }
            },
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw ((e = t.reason), Ch(e), e);
        }
        throw ((cr = t), Br);
    }
  }
  function ur(e) {
    try {
      var t = e._init;
      return t(e._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function"
        ? ((cr = a), Br)
        : a;
    }
  }
  var cr = null;
  function Oh() {
    if (cr === null) throw Error(o(459));
    var e = cr;
    return ((cr = null), e);
  }
  function Ch(e) {
    if (e === Br || e === go) throw Error(o(483));
  }
  var $r = null,
    Gl = 0;
  function yo(e) {
    var t = Gl;
    return ((Gl += 1), $r === null && ($r = []), Th($r, e, t));
  }
  function Fl(e, t) {
    t = t.props.ref;
    e.ref = t !== void 0 ? t : null;
  }
  function vo(e, t) {
    throw t.$$typeof === S
      ? Error(o(525))
      : ((e = Object.prototype.toString.call(t)),
        Error(
          o(
            31,
            e === "[object Object]"
              ? "object with keys {" + Object.keys(t).join(", ") + "}"
              : e,
          ),
        ));
  }
  function Ah(e) {
    function t(k, N) {
      if (e) {
        var $ = k.deletions;
        $ === null ? ((k.deletions = [N]), (k.flags |= 16)) : $.push(N);
      }
    }
    function a(k, N) {
      if (!e) return null;
      for (; N !== null; ) {
        t(k, N);
        N = N.sibling;
      }
      return null;
    }
    function i(event) {
      for (var N = new Map(); event !== null; ) {
        event.key !== null
          ? N.set(event.key, event)
          : N.set(event.index, event);
        event = event.sibling;
      }
      return N;
    }
    function u(k, N) {
      return ((k = Zn(k, N)), (k.index = 0), (k.sibling = null), k);
    }
    function d(k, N, $) {
      return (
        (k.index = $),
        e
          ? (($ = k.alternate),
            $ !== null
              ? (($ = $.index), $ < N ? ((k.flags |= 67108866), N) : $)
              : ((k.flags |= 67108866), N))
          : ((k.flags |= 1048576), N)
      );
    }
    function p(k) {
      return (e && k.alternate === null && (k.flags |= 67108866), k);
    }
    function b(k, N, $, K) {
      return N === null || N.tag !== 6
        ? ((N = _u($, k.mode, K)), (N.return = k), N)
        : ((N = u(N, $)), (N.return = k), N);
    }
    function C(k, N, $, K) {
      var we = $.type;
      if (we === _) {
        return Q(k, N, $.props.children, K, $.key);
      }
      if (
        N !== null &&
        (N.elementType === we ||
          (typeof we == "object" &&
            we !== null &&
            we.$$typeof === le &&
            ur(we) === N.type))
      ) {
        return ((N = u(N, $.props)), Fl(N, $), (N.return = k), N);
      }
      return (
        (N = uo($.type, $.key, $.props, null, k.mode, K)),
        Fl(N, $),
        (N.return = k),
        N
      );
    }
    function q(k, N, $, K) {
      return N === null ||
        N.tag !== 4 ||
        N.stateNode.containerInfo !== $.containerInfo ||
        N.stateNode.implementation !== $.implementation
        ? ((N = Tu($, k.mode, K)), (N.return = k), N)
        : ((N = u(N, $.children || [])), (N.return = k), N);
    }
    function Q(k, N, $, K, we) {
      return N === null || N.tag !== 7
        ? ((N = rr($, k.mode, K, we)), (N.return = k), N)
        : ((N = u(N, $)), (N.return = k), N);
    }
    function I(k, N, $) {
      if (
        (typeof N == "string" && N !== "") ||
        typeof N == "number" ||
        typeof N == "bigint"
      )
        return ((N = _u("" + N, k.mode, $)), (N.return = k), N);
      if (typeof N == "object" && N !== null) {
        switch (N.$$typeof) {
          case w:
            return (
              ($ = uo(N.type, N.key, N.props, null, k.mode, $)),
              Fl($, N),
              ($.return = k),
              $
            );
          case x:
            return ((N = Tu(N, k.mode, $)), (N.return = k), N);
          case le:
            return ((N = ur(N)), I(k, N, $));
        }
        if (Z(N) || Ee(N))
          return ((N = rr(N, k.mode, $, null)), (N.return = k), N);
        if (typeof N.then == "function") return I(k, yo(N), $);
        if (N.$$typeof === F) return I(k, ho(k, N), $);
        vo(k, N);
      }
      return null;
    }
    function Y(k, N, $, K) {
      var we = N !== null ? N.key : null;
      if (
        (typeof $ == "string" && $ !== "") ||
        typeof $ == "number" ||
        typeof $ == "bigint"
      )
        return we !== null ? null : b(k, N, "" + $, K);
      if (typeof $ == "object" && $ !== null) {
        switch ($.$$typeof) {
          case w:
            return $.key === we ? C(k, N, $, K) : null;
          case x:
            return $.key === we ? q(k, N, $, K) : null;
          case le:
            return (($ = ur($)), Y(k, N, $, K));
        }
        if (Z($) || Ee($)) return we !== null ? null : Q(k, N, $, K, null);
        if (typeof $.then == "function") return Y(k, N, yo($), K);
        if ($.$$typeof === F) return Y(k, N, ho(k, $), K);
        vo(k, $);
      }
      return null;
    }
    function P(k, N, $, K, we) {
      if (
        (typeof K == "string" && K !== "") ||
        typeof K == "number" ||
        typeof K == "bigint"
      )
        return ((k = k.get($) || null), b(N, k, "" + K, we));
      if (typeof K == "object" && K !== null) {
        switch (K.$$typeof) {
          case w:
            return (
              (k = k.get(K.key === null ? $ : K.key) || null),
              C(N, k, K, we)
            );
          case x:
            return (
              (k = k.get(K.key === null ? $ : K.key) || null),
              q(N, k, K, we)
            );
          case le:
            return ((K = ur(K)), P(k, N, $, K, we));
        }
        if (Z(K) || Ee(K))
          return ((k = k.get($) || null), Q(N, k, K, we, null));
        if (typeof K.then == "function") return P(k, N, $, yo(K), we);
        if (K.$$typeof === F) return P(k, N, $, ho(N, K), we);
        vo(N, K);
      }
      return null;
    }
    function pe(k, N, $, K) {
      for (
        var we = null, Fe = null, ye = N, Ne = (N = 0), He = null;
        ye !== null && Ne < $.length;
        Ne++
      ) {
        ye.index > Ne ? ((He = ye), (ye = null)) : (He = ye.sibling);
        var Xe = Y(k, ye, $[Ne], K);
        if (Xe === null) {
          if (ye === null) {
            ye = He;
          }
          break;
        }
        if (e && ye && Xe.alternate === null) {
          t(k, ye);
        }
        N = d(Xe, N, Ne);
        Fe === null ? (we = Xe) : (Fe.sibling = Xe);
        Fe = Xe;
        ye = He;
      }
      if (Ne === $.length) return (a(k, ye), Ye && Jn(k, Ne), we);
      if (ye === null) {
        for (; Ne < $.length; Ne++) {
          ye = I(k, $[Ne], K);
          if (ye !== null) {
            ((N = d(ye, N, Ne)),
              Fe === null ? (we = ye) : (Fe.sibling = ye),
              (Fe = ye));
          }
        }
        return (Ye && Jn(k, Ne), we);
      }
      for (ye = i(ye); Ne < $.length; Ne++) {
        He = P(ye, k, Ne, $[Ne], K);
        if (He !== null) {
          (e &&
            He.alternate !== null &&
            ye.delete(He.key === null ? Ne : He.key),
            (N = d(He, N, Ne)),
            Fe === null ? (we = He) : (Fe.sibling = He),
            (Fe = He));
        }
      }
      return (
        e &&
          ye.forEach(function (item) {
            return t(k, item);
          }),
        Ye && Jn(k, Ne),
        we
      );
    }
    function Te(k, N, $, K) {
      if ($ == null) throw Error(o(151));
      for (
        var we = null,
          Fe = null,
          ye = N,
          Ne = (N = 0),
          He = null,
          Xe = $.next();
        ye !== null && !Xe.done;
        Ne++, Xe = $.next()
      ) {
        ye.index > Ne ? ((He = ye), (ye = null)) : (He = ye.sibling);
        var Ha = Y(k, ye, Xe.value, K);
        if (Ha === null) {
          if (ye === null) {
            ye = He;
          }
          break;
        }
        if (e && ye && Ha.alternate === null) {
          t(k, ye);
        }
        N = d(Ha, N, Ne);
        Fe === null ? (we = Ha) : (Fe.sibling = Ha);
        Fe = Ha;
        ye = He;
      }
      if (Xe.done) return (a(k, ye), Ye && Jn(k, Ne), we);
      if (ye === null) {
        for (; !Xe.done; Ne++, Xe = $.next()) {
          Xe = I(k, Xe.value, K);
          if (Xe !== null) {
            ((N = d(Xe, N, Ne)),
              Fe === null ? (we = Xe) : (Fe.sibling = Xe),
              (Fe = Xe));
          }
        }
        return (Ye && Jn(k, Ne), we);
      }
      for (ye = i(ye); !Xe.done; Ne++, Xe = $.next()) {
        Xe = P(ye, k, Ne, Xe.value, K);
        if (Xe !== null) {
          (e &&
            Xe.alternate !== null &&
            ye.delete(Xe.key === null ? Ne : Xe.key),
            (N = d(Xe, N, Ne)),
            Fe === null ? (we = Xe) : (Fe.sibling = Xe),
            (Fe = Xe));
        }
      }
      return (
        e &&
          ye.forEach(function (item) {
            return t(k, item);
          }),
        Ye && Jn(k, Ne),
        we
      );
    }
    function et(k, N, $, K) {
      if (
        (typeof $ == "object" &&
          $ !== null &&
          $.type === _ &&
          $.key === null &&
          ($ = $.props.children),
        typeof $ == "object" && $ !== null)
      ) {
        switch ($.$$typeof) {
          case w:
            e: {
              for (var we = $.key; N !== null; ) {
                if (N.key === we) {
                  if (((we = $.type), we === _)) {
                    if (N.tag === 7) {
                      a(k, N.sibling);
                      K = u(N, $.props.children);
                      K.return = k;
                      k = K;
                      break e;
                    }
                  } else if (
                    N.elementType === we ||
                    (typeof we == "object" &&
                      we !== null &&
                      we.$$typeof === le &&
                      ur(we) === N.type)
                  ) {
                    a(k, N.sibling);
                    K = u(N, $.props);
                    Fl(K, $);
                    K.return = k;
                    k = K;
                    break e;
                  }
                  a(k, N);
                  break;
                } else t(k, N);
                N = N.sibling;
              }
              $.type === _
                ? ((K = rr($.props.children, k.mode, K, $.key)),
                  (K.return = k),
                  (k = K))
                : ((K = uo($.type, $.key, $.props, null, k.mode, K)),
                  Fl(K, $),
                  (K.return = k),
                  (k = K));
            }
            return p(k);
          case x:
            e: {
              for (we = $.key; N !== null; ) {
                if (N.key === we) {
                  if (
                    N.tag === 4 &&
                    N.stateNode.containerInfo === $.containerInfo &&
                    N.stateNode.implementation === $.implementation
                  ) {
                    a(k, N.sibling);
                    K = u(N, $.children || []);
                    K.return = k;
                    k = K;
                    break e;
                  } else {
                    a(k, N);
                    break;
                  }
                } else t(k, N);
                N = N.sibling;
              }
              K = Tu($, k.mode, K);
              K.return = k;
              k = K;
            }
            return p(k);
          case le:
            return (($ = ur($)), et(k, N, $, K));
        }
        if (Z($)) return pe(k, N, $, K);
        if (Ee($)) {
          if (((we = Ee($)), typeof we != "function")) throw Error(o(150));
          return (($ = we.call($)), Te(k, N, $, K));
        }
        if (typeof $.then == "function") return et(k, N, yo($), K);
        if ($.$$typeof === F) return et(k, N, ho(k, $), K);
        vo(k, $);
      }
      return (typeof $ == "string" && $ !== "") ||
        typeof $ == "number" ||
        typeof $ == "bigint"
        ? (($ = "" + $),
          N !== null && N.tag === 6
            ? (a(k, N.sibling), (K = u(N, $)), (K.return = k), (k = K))
            : (a(k, N), (K = _u($, k.mode, K)), (K.return = k), (k = K)),
          p(k))
        : a(k, N);
    }
    return function (k, N, $, K) {
      try {
        Gl = 0;
        var we = et(k, N, $, K);
        return (($r = null), we);
      } catch (ye) {
        if (ye === Br || ye === go) throw ye;
        var Fe = rn(29, ye, null, k.mode);
        return ((Fe.lanes = K), (Fe.return = k), Fe);
      }
    };
  }
  var fr = Ah(!0),
    Dh = Ah(!1),
    Ea = !1;
  function Hu(e) {
    e.updateQueue = {
      baseState: e.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: {
        pending: null,
        lanes: 0,
        hiddenCallbacks: null,
      },
      callbacks: null,
    };
  }
  function Bu(e, t) {
    e = e.updateQueue;
    if (t.updateQueue === e) {
      t.updateQueue = {
        baseState: e.baseState,
        firstBaseUpdate: e.firstBaseUpdate,
        lastBaseUpdate: e.lastBaseUpdate,
        shared: e.shared,
        callbacks: null,
      };
    }
  }
  function xa(e) {
    return {
      lane: e,
      tag: 0,
      payload: null,
      callback: null,
      next: null,
    };
  }
  function wa(e, t, a) {
    var i = e.updateQueue;
    if (i === null) return null;
    if (((i = i.shared), (Qe & 2) !== 0)) {
      var u = i.pending;
      return (
        u === null ? (t.next = t) : ((t.next = u.next), (u.next = t)),
        (i.pending = t),
        (t = so(e)),
        hh(e, null, a),
        t
      );
    }
    return (oo(e, i, t, a), so(e));
  }
  function Xl(e, t, a) {
    if (
      ((t = t.updateQueue), t !== null && ((t = t.shared), (a & 4194048) !== 0))
    ) {
      var i = t.lanes;
      i &= e.pendingLanes;
      a |= i;
      t.lanes = a;
      O(e, a);
    }
  }
  function $u(e, t) {
    var a = e.updateQueue,
      i = e.alternate;
    if (i !== null && ((i = i.updateQueue), a === i)) {
      var u = null,
        d = null;
      if (((a = a.firstBaseUpdate), a !== null)) {
        do {
          var p = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null,
          };
          d === null ? (u = d = p) : (d = d.next = p);
          a = a.next;
        } while (a !== null);
        d === null ? (u = d = t) : (d = d.next = t);
      } else u = d = t;
      a = {
        baseState: i.baseState,
        firstBaseUpdate: u,
        lastBaseUpdate: d,
        shared: i.shared,
        callbacks: i.callbacks,
      };
      e.updateQueue = a;
      return;
    }
    e = a.lastBaseUpdate;
    e === null ? (a.firstBaseUpdate = t) : (e.next = t);
    a.lastBaseUpdate = t;
  }
  var qu = !1;
  function Pl() {
    if (qu) {
      var e = Hr;
      if (e !== null) throw e;
    }
  }
  function Ql(e, t, a, i) {
    qu = !1;
    var u = e.updateQueue;
    Ea = !1;
    var d = u.firstBaseUpdate,
      p = u.lastBaseUpdate,
      b = u.shared.pending;
    if (b !== null) {
      u.shared.pending = null;
      var C = b,
        q = C.next;
      C.next = null;
      p === null ? (d = q) : (p.next = q);
      p = C;
      var Q = e.alternate;
      if (Q !== null) {
        ((Q = Q.updateQueue),
          (b = Q.lastBaseUpdate),
          b !== p &&
            (b === null ? (Q.firstBaseUpdate = q) : (b.next = q),
            (Q.lastBaseUpdate = C)));
      }
    }
    if (d !== null) {
      var I = u.baseState;
      p = 0;
      Q = q = C = null;
      b = d;
      do {
        var Y = b.lane & -536870913,
          P = Y !== b.lane;
        if (P ? (Ue & Y) === Y : (i & Y) === Y) {
          if (Y !== 0 && Y === Ur) {
            qu = !0;
          }
          if (Q !== null) {
            Q = Q.next = {
              lane: 0,
              tag: b.tag,
              payload: b.payload,
              callback: null,
              next: null,
            };
          }
          e: {
            var pe = e,
              Te = b;
            Y = t;
            var et = a;
            switch (Te.tag) {
              case 1:
                if (((pe = Te.payload), typeof pe == "function")) {
                  I = pe.call(et, I, Y);
                  break e;
                }
                I = pe;
                break e;
              case 3:
                pe.flags = (pe.flags & -65537) | 128;
              case 0:
                if (
                  ((pe = Te.payload),
                  (Y = typeof pe == "function" ? pe.call(et, I, Y) : pe),
                  Y == null)
                )
                  break e;
                I = v({}, I, Y);
                break e;
              case 2:
                Ea = !0;
            }
          }
          Y = b.callback;
          if (Y !== null) {
            ((e.flags |= 64),
              P && (e.flags |= 8192),
              (P = u.callbacks),
              P === null ? (u.callbacks = [Y]) : P.push(Y));
          }
        } else {
          P = {
            lane: Y,
            tag: b.tag,
            payload: b.payload,
            callback: b.callback,
            next: null,
          };
          Q === null ? ((q = Q = P), (C = I)) : (Q = Q.next = P);
          p |= Y;
        }
        if (((b = b.next), b === null)) {
          if (((b = u.shared.pending), b === null)) break;
          P = b;
          b = P.next;
          P.next = null;
          u.lastBaseUpdate = P;
          u.shared.pending = null;
        }
      } while (!0);
      if (Q === null) {
        C = I;
      }
      u.baseState = C;
      u.firstBaseUpdate = q;
      u.lastBaseUpdate = Q;
      if (d === null) {
        u.shared.lanes = 0;
      }
      Ca |= p;
      e.lanes = p;
      e.memoizedState = I;
    }
  }
  function Lh(e, t) {
    if (typeof e != "function") throw Error(o(191, e));
    e.call(t);
  }
  function Nh(e, t) {
    var a = e.callbacks;
    if (a !== null)
      for (e.callbacks = null, e = 0; e < a.length; e++) Lh(a[e], t);
  }
  var qr = R(null),
    bo = R(0);
  function Mh(e, t) {
    e = sa;
    J(bo, e);
    J(qr, t);
    sa = e | t.baseLanes;
  }
  function Vu() {
    J(bo, sa);
    J(qr, qr.current);
  }
  function Yu() {
    sa = bo.current;
    H(qr);
    H(bo);
  }
  var ln = R(null),
    Sn = null;
  function Ra(e) {
    var t = e.alternate;
    J(vt, vt.current & 1);
    J(ln, e);
    if (
      Sn === null &&
      (t === null || qr.current !== null || t.memoizedState !== null)
    ) {
      Sn = e;
    }
  }
  function Gu(e) {
    J(vt, vt.current);
    J(ln, e);
    if (Sn === null) {
      Sn = e;
    }
  }
  function zh(e) {
    e.tag === 22
      ? (J(vt, vt.current), J(ln, e), Sn === null && (Sn = e))
      : _a();
  }
  function _a() {
    J(vt, vt.current);
    J(ln, ln.current);
  }
  function on(e) {
    H(ln);
    if (Sn === e) {
      Sn = null;
    }
    H(vt);
  }
  var vt = R(0);
  function So(e) {
    for (var t = e; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && ((a = a.dehydrated), a === null || Zc(a) || Jc(a)))
          return t;
      } else if (
        t.tag === 19 &&
        (t.memoizedProps.revealOrder === "forwards" ||
          t.memoizedProps.revealOrder === "backwards" ||
          t.memoizedProps.revealOrder === "unstable_legacy-backwards" ||
          t.memoizedProps.revealOrder === "together")
      ) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t;
        t = t.child;
        continue;
      }
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return null;
        t = t.return;
      }
      t.sibling.return = t.return;
      t = t.sibling;
    }
    return null;
  }
  var ea = 0,
    De = null,
    Ie = null,
    wt = null,
    Eo = !1,
    Vr = !1,
    dr = !1,
    xo = 0,
    Kl = 0,
    Yr = null,
    Fb = 0;
  function mt() {
    throw Error(o(321));
  }
  function Fu(e, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < e.length; a++)
      if (!an(e[a], t[a])) return !1;
    return !0;
  }
  function Xu(e, t, a, i, u, d) {
    return (
      (ea = d),
      (De = t),
      (t.memoizedState = null),
      (t.updateQueue = null),
      (t.lanes = 0),
      (T.H = e === null || e.memoizedState === null ? ym : oc),
      (dr = !1),
      (d = a(i, u)),
      (dr = !1),
      Vr && (d = jh(t, a, i, u)),
      kh(e),
      d
    );
  }
  function kh(e) {
    T.H = Il;
    var t = Ie !== null && Ie.next !== null;
    if (((ea = 0), (wt = Ie = De = null), (Eo = !1), (Kl = 0), (Yr = null), t))
      throw Error(o(300));
    e === null ||
      Rt ||
      ((e = e.dependencies), e !== null && fo(e) && (Rt = !0));
  }
  function jh(e, t, a, i) {
    De = e;
    var u = 0;
    do {
      if ((Vr && (Yr = null), (Kl = 0), (Vr = !1), 25 <= u))
        throw Error(o(301));
      if (((u += 1), (wt = Ie = null), e.updateQueue != null)) {
        var d = e.updateQueue;
        d.lastEffect = null;
        d.events = null;
        d.stores = null;
        if (d.memoCache != null) {
          d.memoCache.index = 0;
        }
      }
      T.H = vm;
      d = t(a, i);
    } while (Vr);
    return d;
  }
  function Xb() {
    var e = T.H,
      t = e.useState()[0];
    return (
      (t = typeof t.then == "function" ? Zl(t) : t),
      (e = e.useState()[0]),
      (Ie !== null ? Ie.memoizedState : null) !== e && (De.flags |= 1024),
      t
    );
  }
  function Pu() {
    var e = xo !== 0;
    return ((xo = 0), e);
  }
  function Qu(e, t, a) {
    t.updateQueue = e.updateQueue;
    t.flags &= -2053;
    e.lanes &= ~a;
  }
  function Ku(e) {
    if (Eo) {
      for (e = e.memoizedState; e !== null; ) {
        var t = e.queue;
        if (t !== null) {
          t.pending = null;
        }
        e = e.next;
      }
      Eo = !1;
    }
    ea = 0;
    wt = Ie = De = null;
    Vr = !1;
    Kl = xo = 0;
    Yr = null;
  }
  function Vt() {
    var e = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null,
    };
    return (wt === null ? (De.memoizedState = wt = e) : (wt = wt.next = e), wt);
  }
  function bt() {
    if (Ie === null) {
      var e = De.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = Ie.next;
    var t = wt === null ? De.memoizedState : wt.next;
    if (t !== null) {
      wt = t;
      Ie = e;
    } else {
      if (e === null)
        throw De.alternate === null ? Error(o(467)) : Error(o(310));
      Ie = e;
      e = {
        memoizedState: Ie.memoizedState,
        baseState: Ie.baseState,
        baseQueue: Ie.baseQueue,
        queue: Ie.queue,
        next: null,
      };
      wt === null ? (De.memoizedState = wt = e) : (wt = wt.next = e);
    }
    return wt;
  }
  function wo() {
    return {
      lastEffect: null,
      events: null,
      stores: null,
      memoCache: null,
    };
  }
  function Zl(e) {
    var t = Kl;
    return (
      (Kl += 1),
      Yr === null && (Yr = []),
      (e = Th(Yr, e, t)),
      (t = De),
      (wt === null ? t.memoizedState : wt.next) === null &&
        ((t = t.alternate),
        (T.H = t === null || t.memoizedState === null ? ym : oc)),
      e
    );
  }
  function Ro(e) {
    if (e !== null && typeof e == "object") {
      if (typeof e.then == "function") return Zl(e);
      if (e.$$typeof === F) return Nt(e);
    }
    throw Error(o(438, String(e)));
  }
  function Zu(e) {
    var t = null,
      a = De.updateQueue;
    if ((a !== null && (t = a.memoCache), t == null)) {
      var i = De.alternate;
      if (i !== null) {
        ((i = i.updateQueue),
          i !== null &&
            ((i = i.memoCache),
            i != null &&
              (t = {
                data: i.data.map(function (item) {
                  return item.slice();
                }),
                index: 0,
              })));
      }
    }
    if (
      (t == null &&
        (t = {
          data: [],
          index: 0,
        }),
      a === null && ((a = wo()), (De.updateQueue = a)),
      (a.memoCache = t),
      (a = t.data[t.index]),
      a === void 0)
    )
      for (a = t.data[t.index] = Array(e), i = 0; i < e; i++) a[i] = ue;
    return (t.index++, a);
  }
  function ta(e, t) {
    return typeof t == "function" ? t(e) : t;
  }
  function _o(e) {
    var t = bt();
    return Ju(t, Ie, e);
  }
  function Ju(e, t, a) {
    var i = e.queue;
    if (i === null) throw Error(o(311));
    i.lastRenderedReducer = a;
    var u = e.baseQueue,
      d = i.pending;
    if (d !== null) {
      if (u !== null) {
        var p = u.next;
        u.next = d.next;
        d.next = p;
      }
      t.baseQueue = u = d;
      i.pending = null;
    }
    if (((d = e.baseState), u === null)) e.memoizedState = d;
    else {
      t = u.next;
      var b = (p = null),
        C = null,
        q = t,
        Q = !1;
      do {
        var I = q.lane & -536870913;
        if (I !== q.lane ? (Ue & I) === I : (ea & I) === I) {
          var Y = q.revertLane;
          if (Y === 0) {
            if (C !== null) {
              C = C.next = {
                lane: 0,
                revertLane: 0,
                gesture: null,
                action: q.action,
                hasEagerState: q.hasEagerState,
                eagerState: q.eagerState,
                next: null,
              };
            }
            if (I === Ur) {
              Q = !0;
            }
          } else if ((ea & Y) === Y) {
            q = q.next;
            if (Y === Ur) {
              Q = !0;
            }
            continue;
          } else {
            I = {
              lane: 0,
              revertLane: q.revertLane,
              gesture: null,
              action: q.action,
              hasEagerState: q.hasEagerState,
              eagerState: q.eagerState,
              next: null,
            };
            C === null ? ((b = C = I), (p = d)) : (C = C.next = I);
            De.lanes |= Y;
            Ca |= Y;
          }
          I = q.action;
          if (dr) {
            a(d, I);
          }
          d = q.hasEagerState ? q.eagerState : a(d, I);
        } else {
          Y = {
            lane: I,
            revertLane: q.revertLane,
            gesture: q.gesture,
            action: q.action,
            hasEagerState: q.hasEagerState,
            eagerState: q.eagerState,
            next: null,
          };
          C === null ? ((b = C = Y), (p = d)) : (C = C.next = Y);
          De.lanes |= I;
          Ca |= I;
        }
        q = q.next;
      } while (q !== null && q !== t);
      if (
        (C === null ? (p = d) : (C.next = b),
        !an(d, e.memoizedState) && ((Rt = !0), Q && ((a = Hr), a !== null)))
      )
        throw a;
      e.memoizedState = d;
      e.baseState = p;
      e.baseQueue = C;
      i.lastRenderedState = d;
    }
    return (u === null && (i.lanes = 0), [e.memoizedState, i.dispatch]);
  }
  function Iu(e) {
    var t = bt(),
      a = t.queue;
    if (a === null) throw Error(o(311));
    a.lastRenderedReducer = e;
    var i = a.dispatch,
      u = a.pending,
      d = t.memoizedState;
    if (u !== null) {
      a.pending = null;
      var p = (u = u.next);
      do {
        d = e(d, p.action);
        p = p.next;
      } while (p !== u);
      an(d, t.memoizedState) || (Rt = !0);
      t.memoizedState = d;
      if (t.baseQueue === null) {
        t.baseState = d;
      }
      a.lastRenderedState = d;
    }
    return [d, i];
  }
  function Uh(e, t, a) {
    var i = De,
      u = bt(),
      d = Ye;
    if (d) {
      if (a === void 0) throw Error(o(407));
      a = a();
    } else a = t();
    var p = !an((Ie || u).memoizedState, a);
    if (
      (p && ((u.memoizedState = a), (Rt = !0)),
      (u = u.queue),
      tc($h.bind(null, i, u, e), [e]),
      u.getSnapshot !== t || p || (wt !== null && wt.memoizedState.tag & 1))
    ) {
      if (
        ((i.flags |= 2048),
        Gr(
          9,
          {
            destroy: void 0,
          },
          Bh.bind(null, i, u, a, t),
          null,
        ),
        nt === null)
      )
        throw Error(o(349));
      d || (ea & 127) !== 0 || Hh(i, t, a);
    }
    return a;
  }
  function Hh(e, t, a) {
    e.flags |= 16384;
    e = {
      getSnapshot: t,
      value: a,
    };
    t = De.updateQueue;
    t === null
      ? ((t = wo()), (De.updateQueue = t), (t.stores = [e]))
      : ((a = t.stores), a === null ? (t.stores = [e]) : a.push(e));
  }
  function Bh(e, t, a, i) {
    t.value = a;
    t.getSnapshot = i;
    if (qh(t)) {
      Vh(e);
    }
  }
  function $h(e, t, a) {
    return a(function () {
      if (qh(t)) {
        Vh(e);
      }
    });
  }
  function qh(props) {
    var t = props.getSnapshot;
    props = props.value;
    try {
      var a = t();
      return !an(props, a);
    } catch {
      return !0;
    }
  }
  function Vh(e) {
    var t = ar(e, 2);
    if (t !== null) {
      It(t, e, 2);
    }
  }
  function Wu(e) {
    var t = Vt();
    if (typeof e == "function") {
      var a = e;
      if (((e = a()), dr)) {
        Cn(!0);
        try {
          a();
        } finally {
          Cn(!1);
        }
      }
    }
    return (
      (t.memoizedState = t.baseState = e),
      (t.queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: ta,
        lastRenderedState: e,
      }),
      t
    );
  }
  function Yh(e, t, a, i) {
    return ((e.baseState = a), Ju(e, Ie, typeof i == "function" ? i : ta));
  }
  function Pb(e, t, a, i, u) {
    if (Co(e)) throw Error(o(485));
    if (((e = t.action), e !== null)) {
      var d = {
        payload: u,
        action: e,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function (p) {
          d.listeners.push(p);
        },
      };
      T.T !== null ? a(!0) : (d.isTransition = !1);
      i(d);
      a = t.pending;
      a === null
        ? ((d.next = t.pending = d), Gh(t, d))
        : ((d.next = a.next), (t.pending = a.next = d));
    }
  }
  function Gh(e, t) {
    var a = t.action,
      i = t.payload,
      u = e.state;
    if (t.isTransition) {
      var d = T.T,
        p = {};
      T.T = p;
      try {
        var b = a(u, i),
          C = T.S;
        if (C !== null) {
          C(p, b);
        }
        Fh(e, t, b);
      } catch (q) {
        ec(e, t, q);
      } finally {
        if (d !== null && p.types !== null) {
          d.types = p.types;
        }
        T.T = d;
      }
    } else
      try {
        d = a(u, i);
        Fh(e, t, d);
      } catch (q) {
        ec(e, t, q);
      }
  }
  function Fh(e, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function"
      ? a.then(
          function (response) {
            Xh(e, t, response);
          },
          function (response) {
            return ec(e, t, response);
          },
        )
      : Xh(e, t, a);
  }
  function Xh(e, t, a) {
    t.status = "fulfilled";
    t.value = a;
    Ph(t);
    e.state = a;
    t = e.pending;
    if (t !== null) {
      ((a = t.next),
        a === t ? (e.pending = null) : ((a = a.next), (t.next = a), Gh(e, a)));
    }
  }
  function ec(e, t, a) {
    var i = e.pending;
    if (((e.pending = null), i !== null)) {
      i = i.next;
      do {
        t.status = "rejected";
        t.reason = a;
        Ph(t);
        t = t.next;
      } while (t !== i);
    }
    e.action = null;
  }
  function Ph(e) {
    e = e.listeners;
    for (var t = 0; t < e.length; t++) (0, e[t])();
  }
  function Qh(e, t) {
    return t;
  }
  function Kh(e, t) {
    if (Ye) {
      var a = nt.formState;
      if (a !== null) {
        e: {
          var i = De;
          if (Ye) {
            if (rt) {
              t: {
                for (var u = rt, d = bn; u.nodeType !== 8; ) {
                  if (!d) {
                    u = null;
                    break t;
                  }
                  if (((u = En(u.nextSibling)), u === null)) {
                    u = null;
                    break t;
                  }
                }
                d = u.data;
                u = d === "F!" || d === "F" ? u : null;
              }
              if (u) {
                rt = En(u.nextSibling);
                i = u.data === "F!";
                break e;
              }
            }
            ba(i);
          }
          i = !1;
        }
        if (i) {
          t = a[0];
        }
      }
    }
    return (
      (a = Vt()),
      (a.memoizedState = a.baseState = t),
      (i = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Qh,
        lastRenderedState: t,
      }),
      (a.queue = i),
      (a = mm.bind(null, De, i)),
      (i.dispatch = a),
      (i = Wu(!1)),
      (d = ic.bind(null, De, !1, i.queue)),
      (i = Vt()),
      (u = {
        state: t,
        dispatch: null,
        action: e,
        pending: null,
      }),
      (i.queue = u),
      (a = Pb.bind(null, De, u, d, a)),
      (u.dispatch = a),
      (i.memoizedState = e),
      [t, a, !1]
    );
  }
  function Zh(e) {
    var t = bt();
    return Jh(t, Ie, e);
  }
  function Jh(e, t, a) {
    if (
      ((t = Ju(e, t, Qh)[0]),
      (e = _o(ta)[0]),
      typeof t == "object" && t !== null && typeof t.then == "function")
    )
      try {
        var i = Zl(t);
      } catch (p) {
        throw p === Br ? go : p;
      }
    else i = t;
    t = bt();
    var u = t.queue,
      d = u.dispatch;
    return (
      a !== t.memoizedState &&
        ((De.flags |= 2048),
        Gr(
          9,
          {
            destroy: void 0,
          },
          Qb.bind(null, u, a),
          null,
        )),
      [i, d, e]
    );
  }
  function Qb(e, t) {
    e.action = t;
  }
  function Ih(e) {
    var t = bt(),
      a = Ie;
    if (a !== null) return Jh(t, a, e);
    bt();
    t = t.memoizedState;
    a = bt();
    var i = a.queue.dispatch;
    return ((a.memoizedState = e), [t, i, !1]);
  }
  function Gr(e, t, a, i) {
    return (
      (e = {
        tag: e,
        create: a,
        deps: i,
        inst: t,
        next: null,
      }),
      (t = De.updateQueue),
      t === null && ((t = wo()), (De.updateQueue = t)),
      (a = t.lastEffect),
      a === null
        ? (t.lastEffect = e.next = e)
        : ((i = a.next), (a.next = e), (e.next = i), (t.lastEffect = e)),
      e
    );
  }
  function Wh() {
    return bt().memoizedState;
  }
  function To(e, t, a, i) {
    var u = Vt();
    De.flags |= e;
    u.memoizedState = Gr(
      1 | t,
      {
        destroy: void 0,
      },
      a,
      i === void 0 ? null : i,
    );
  }
  function Oo(e, t, a, i) {
    var u = bt();
    i = i === void 0 ? null : i;
    var d = u.memoizedState.inst;
    Ie !== null && i !== null && Fu(i, Ie.memoizedState.deps)
      ? (u.memoizedState = Gr(t, d, a, i))
      : ((De.flags |= e), (u.memoizedState = Gr(1 | t, d, a, i)));
  }
  function em(e, t) {
    To(8390656, 8, e, t);
  }
  function tc(e, t) {
    Oo(2048, 8, e, t);
  }
  function Kb(e) {
    De.flags |= 4;
    var t = De.updateQueue;
    if (t === null) {
      t = wo();
      De.updateQueue = t;
      t.events = [e];
    } else {
      var a = t.events;
      a === null ? (t.events = [e]) : a.push(e);
    }
  }
  function tm(e) {
    var t = bt().memoizedState;
    return (
      Kb({
        ref: t,
        nextImpl: e,
      }),
      function () {
        if ((Qe & 2) !== 0) throw Error(o(440));
        return t.impl.apply(void 0, arguments);
      }
    );
  }
  function nm(e, t) {
    return Oo(4, 2, e, t);
  }
  function am(e, t) {
    return Oo(4, 4, e, t);
  }
  function rm(e, t) {
    if (typeof t == "function") {
      e = e();
      var a = t(e);
      return function () {
        typeof a == "function" ? a() : t(null);
      };
    }
    if (t != null)
      return (
        (e = e()),
        (t.current = e),
        function () {
          t.current = null;
        }
      );
  }
  function lm(e, t, a) {
    a = a != null ? a.concat([e]) : null;
    Oo(4, 4, rm.bind(null, t, e), a);
  }
  function nc() {}
  function im(e, t) {
    var a = bt();
    t = t === void 0 ? null : t;
    var i = a.memoizedState;
    return t !== null && Fu(t, i[1]) ? i[0] : ((a.memoizedState = [e, t]), e);
  }
  function om(e, t) {
    var a = bt();
    t = t === void 0 ? null : t;
    var i = a.memoizedState;
    if (t !== null && Fu(t, i[1])) return i[0];
    if (((i = e()), dr)) {
      Cn(!0);
      try {
        e();
      } finally {
        Cn(!1);
      }
    }
    return ((a.memoizedState = [i, t]), i);
  }
  function ac(e, t, a) {
    return a === void 0 || ((ea & 1073741824) !== 0 && (Ue & 261930) === 0)
      ? (e.memoizedState = t)
      : ((e.memoizedState = a), (e = s0()), (De.lanes |= e), (Ca |= e), a);
  }
  function sm(e, t, a, i) {
    if (an(a, t)) {
      return a;
    }
    if (qr.current !== null) {
      return ((e = ac(e, a, i)), an(e, t) || (Rt = !0), e);
    }
    if ((ea & 42) === 0 || ((ea & 1073741824) !== 0 && (Ue & 261930) === 0)) {
      return ((Rt = !0), (e.memoizedState = a));
    }
    return ((e = s0()), (De.lanes |= e), (Ca |= e), t);
  }
  function um(e, t, a, i, u) {
    var d = V.p;
    V.p = d !== 0 && 8 > d ? d : 8;
    var p = T.T,
      b = {};
    T.T = b;
    ic(e, !1, t, a);
    try {
      var C = u(),
        q = T.S;
      if (
        (q !== null && q(b, C),
        C !== null && typeof C == "object" && typeof C.then == "function")
      ) {
        var Q = Gb(C, i);
        Jl(e, t, Q, cn(e));
      } else Jl(e, t, i, cn(e));
    } catch (I) {
      Jl(
        e,
        t,
        {
          then: function () {},
          status: "rejected",
          reason: I,
        },
        cn(),
      );
    } finally {
      V.p = d;
      if (p !== null && b.types !== null) {
        p.types = b.types;
      }
      T.T = p;
    }
  }
  function Zb() {}
  function rc(e, t, a, i) {
    if (e.tag !== 5) throw Error(o(476));
    var u = cm(e).queue;
    um(
      e,
      u,
      t,
      B,
      a === null
        ? Zb
        : function () {
            return (fm(e), a(i));
          },
    );
  }
  function cm(e) {
    var t = e.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: B,
      baseState: B,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: ta,
        lastRenderedState: B,
      },
      next: null,
    };
    var a = {};
    return (
      (t.next = {
        memoizedState: a,
        baseState: a,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: ta,
          lastRenderedState: a,
        },
        next: null,
      }),
      (e.memoizedState = t),
      (e = e.alternate),
      e !== null && (e.memoizedState = t),
      t
    );
  }
  function fm(e) {
    var t = cm(e);
    if (t.next === null) {
      t = e.alternate.memoizedState;
    }
    Jl(e, t.next.queue, {}, cn());
  }
  function lc() {
    return Nt(mi);
  }
  function dm() {
    return bt().memoizedState;
  }
  function hm() {
    return bt().memoizedState;
  }
  function Jb(e) {
    for (var t = e.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = cn();
          e = xa(a);
          var i = wa(t, e, a);
          if (i !== null) {
            (It(i, t, a), Xl(i, t, a));
          }
          t = {
            cache: zu(),
          };
          e.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Ib(e, t, a) {
    var i = cn();
    a = {
      lane: i,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    };
    Co(e)
      ? gm(t, a)
      : ((a = wu(e, t, a, i)), a !== null && (It(a, e, i), pm(a, t, i)));
  }
  function mm(e, t, a) {
    var i = cn();
    Jl(e, t, a, i);
  }
  function Jl(e, t, a, i) {
    var u = {
      lane: i,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    };
    if (Co(e)) gm(t, u);
    else {
      var d = e.alternate;
      if (
        e.lanes === 0 &&
        (d === null || d.lanes === 0) &&
        ((d = t.lastRenderedReducer), d !== null)
      )
        try {
          var p = t.lastRenderedState,
            b = d(p, a);
          if (((u.hasEagerState = !0), (u.eagerState = b), an(b, p)))
            return (oo(e, t, u, 0), nt === null && io(), !1);
        } catch {}
      if (((a = wu(e, t, u, i)), a !== null))
        return (It(a, e, i), pm(a, t, i), !0);
    }
    return !1;
  }
  function ic(e, t, a, i) {
    if (
      ((i = {
        lane: 2,
        revertLane: Hc(),
        gesture: null,
        action: i,
        hasEagerState: !1,
        eagerState: null,
        next: null,
      }),
      Co(e))
    ) {
      if (t) throw Error(o(479));
    } else {
      t = wu(e, a, i, 2);
      if (t !== null) {
        It(t, e, 2);
      }
    }
  }
  function Co(e) {
    var t = e.alternate;
    return e === De || (t !== null && t === De);
  }
  function gm(e, t) {
    Vr = Eo = !0;
    var a = e.pending;
    a === null ? (t.next = t) : ((t.next = a.next), (a.next = t));
    e.pending = t;
  }
  function pm(e, t, a) {
    if ((a & 4194048) !== 0) {
      var i = t.lanes;
      i &= e.pendingLanes;
      a |= i;
      t.lanes = a;
      O(e, a);
    }
  }
  var Il = {
    readContext: Nt,
    use: Ro,
    useCallback: mt,
    useContext: mt,
    useEffect: mt,
    useImperativeHandle: mt,
    useLayoutEffect: mt,
    useInsertionEffect: mt,
    useMemo: mt,
    useReducer: mt,
    useRef: mt,
    useState: mt,
    useDebugValue: mt,
    useDeferredValue: mt,
    useTransition: mt,
    useSyncExternalStore: mt,
    useId: mt,
    useHostTransitionStatus: mt,
    useFormState: mt,
    useActionState: mt,
    useOptimistic: mt,
    useMemoCache: mt,
    useCacheRefresh: mt,
  };
  Il.useEffectEvent = mt;
  var ym = {
      readContext: Nt,
      use: Ro,
      useCallback: function (e, t) {
        return ((Vt().memoizedState = [e, t === void 0 ? null : t]), e);
      },
      useContext: Nt,
      useEffect: em,
      useImperativeHandle: function (e, t, a) {
        a = a != null ? a.concat([e]) : null;
        To(4194308, 4, rm.bind(null, t, e), a);
      },
      useLayoutEffect: function (e, t) {
        return To(4194308, 4, e, t);
      },
      useInsertionEffect: function (e, t) {
        To(4, 2, e, t);
      },
      useMemo: function (e, t) {
        var a = Vt();
        t = t === void 0 ? null : t;
        var i = e();
        if (dr) {
          Cn(!0);
          try {
            e();
          } finally {
            Cn(!1);
          }
        }
        return ((a.memoizedState = [i, t]), i);
      },
      useReducer: function (e, t, a) {
        var i = Vt();
        if (a !== void 0) {
          var u = a(t);
          if (dr) {
            Cn(!0);
            try {
              a(t);
            } finally {
              Cn(!1);
            }
          }
        } else u = t;
        return (
          (i.memoizedState = i.baseState = u),
          (e = {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: e,
            lastRenderedState: u,
          }),
          (i.queue = e),
          (e = e.dispatch = Ib.bind(null, De, e)),
          [i.memoizedState, e]
        );
      },
      useRef: function (e) {
        var t = Vt();
        return (
          (e = {
            current: e,
          }),
          (t.memoizedState = e)
        );
      },
      useState: function (e) {
        e = Wu(e);
        var t = e.queue,
          a = mm.bind(null, De, t);
        return ((t.dispatch = a), [e.memoizedState, a]);
      },
      useDebugValue: nc,
      useDeferredValue: function (e, t) {
        var a = Vt();
        return ac(a, e, t);
      },
      useTransition: function () {
        var e = Wu(!1);
        return (
          (e = um.bind(null, De, e.queue, !0, !1)),
          (Vt().memoizedState = e),
          [!1, e]
        );
      },
      useSyncExternalStore: function (e, t, a) {
        var i = De,
          u = Vt();
        if (Ye) {
          if (a === void 0) throw Error(o(407));
          a = a();
        } else {
          if (((a = t()), nt === null)) throw Error(o(349));
          (Ue & 127) !== 0 || Hh(i, t, a);
        }
        u.memoizedState = a;
        var d = {
          value: a,
          getSnapshot: t,
        };
        return (
          (u.queue = d),
          em($h.bind(null, i, d, e), [e]),
          (i.flags |= 2048),
          Gr(
            9,
            {
              destroy: void 0,
            },
            Bh.bind(null, i, d, a, t),
            null,
          ),
          a
        );
      },
      useId: function () {
        var e = Vt(),
          t = nt.identifierPrefix;
        if (Ye) {
          var a = Hn,
            i = Un;
          a = (i & ~(1 << (32 - jt(i) - 1))).toString(32) + a;
          t = "_" + t + "R_" + a;
          a = xo++;
          if (0 < a) {
            t += "H" + a.toString(32);
          }
          t += "_";
        } else {
          a = Fb++;
          t = "_" + t + "r_" + a.toString(32) + "_";
        }
        return (e.memoizedState = t);
      },
      useHostTransitionStatus: lc,
      useFormState: Kh,
      useActionState: Kh,
      useOptimistic: function (e) {
        var t = Vt();
        t.memoizedState = t.baseState = e;
        var a = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: null,
          lastRenderedState: null,
        };
        return (
          (t.queue = a),
          (t = ic.bind(null, De, !0, a)),
          (a.dispatch = t),
          [e, t]
        );
      },
      useMemoCache: Zu,
      useCacheRefresh: function () {
        return (Vt().memoizedState = Jb.bind(null, De));
      },
      useEffectEvent: function (e) {
        var t = Vt(),
          a = {
            impl: e,
          };
        return (
          (t.memoizedState = a),
          function () {
            if ((Qe & 2) !== 0) throw Error(o(440));
            return a.impl.apply(void 0, arguments);
          }
        );
      },
    },
    oc = {
      readContext: Nt,
      use: Ro,
      useCallback: im,
      useContext: Nt,
      useEffect: tc,
      useImperativeHandle: lm,
      useInsertionEffect: nm,
      useLayoutEffect: am,
      useMemo: om,
      useReducer: _o,
      useRef: Wh,
      useState: function () {
        return _o(ta);
      },
      useDebugValue: nc,
      useDeferredValue: function (e, t) {
        var a = bt();
        return sm(a, Ie.memoizedState, e, t);
      },
      useTransition: function () {
        var e = _o(ta)[0],
          t = bt().memoizedState;
        return [typeof e == "boolean" ? e : Zl(e), t];
      },
      useSyncExternalStore: Uh,
      useId: dm,
      useHostTransitionStatus: lc,
      useFormState: Zh,
      useActionState: Zh,
      useOptimistic: function (e, t) {
        var a = bt();
        return Yh(a, Ie, e, t);
      },
      useMemoCache: Zu,
      useCacheRefresh: hm,
    };
  oc.useEffectEvent = tm;
  var vm = {
    readContext: Nt,
    use: Ro,
    useCallback: im,
    useContext: Nt,
    useEffect: tc,
    useImperativeHandle: lm,
    useInsertionEffect: nm,
    useLayoutEffect: am,
    useMemo: om,
    useReducer: Iu,
    useRef: Wh,
    useState: function () {
      return Iu(ta);
    },
    useDebugValue: nc,
    useDeferredValue: function (e, t) {
      var a = bt();
      return Ie === null ? ac(a, e, t) : sm(a, Ie.memoizedState, e, t);
    },
    useTransition: function () {
      var e = Iu(ta)[0],
        t = bt().memoizedState;
      return [typeof e == "boolean" ? e : Zl(e), t];
    },
    useSyncExternalStore: Uh,
    useId: dm,
    useHostTransitionStatus: lc,
    useFormState: Ih,
    useActionState: Ih,
    useOptimistic: function (e, t) {
      var a = bt();
      return Ie !== null
        ? Yh(a, Ie, e, t)
        : ((a.baseState = e), [e, a.queue.dispatch]);
    },
    useMemoCache: Zu,
    useCacheRefresh: hm,
  };
  vm.useEffectEvent = tm;
  function sc(e, t, a, i) {
    t = e.memoizedState;
    a = a(i, t);
    a = a == null ? t : v({}, t, a);
    e.memoizedState = a;
    if (e.lanes === 0) {
      e.updateQueue.baseState = a;
    }
  }
  var uc = {
    enqueueSetState: function (e, t, a) {
      e = e._reactInternals;
      var i = cn(),
        u = xa(i);
      u.payload = t;
      if (a != null) {
        u.callback = a;
      }
      t = wa(e, u, i);
      if (t !== null) {
        (It(t, e, i), Xl(t, e, i));
      }
    },
    enqueueReplaceState: function (e, t, a) {
      e = e._reactInternals;
      var i = cn(),
        u = xa(i);
      u.tag = 1;
      u.payload = t;
      if (a != null) {
        u.callback = a;
      }
      t = wa(e, u, i);
      if (t !== null) {
        (It(t, e, i), Xl(t, e, i));
      }
    },
    enqueueForceUpdate: function (e, t) {
      e = e._reactInternals;
      var a = cn(),
        i = xa(a);
      i.tag = 2;
      if (t != null) {
        i.callback = t;
      }
      t = wa(e, i, a);
      if (t !== null) {
        (It(t, e, a), Xl(t, e, a));
      }
    },
  };
  function bm(e, t, a, i, u, d, p) {
    return (
      (e = e.stateNode),
      typeof e.shouldComponentUpdate == "function"
        ? e.shouldComponentUpdate(i, d, p)
        : t.prototype && t.prototype.isPureReactComponent
          ? !Hl(a, i) || !Hl(u, d)
          : !0
    );
  }
  function Sm(e, t, a, i) {
    e = t.state;
    if (typeof t.componentWillReceiveProps == "function") {
      t.componentWillReceiveProps(a, i);
    }
    if (typeof t.UNSAFE_componentWillReceiveProps == "function") {
      t.UNSAFE_componentWillReceiveProps(a, i);
    }
    if (t.state !== e) {
      uc.enqueueReplaceState(t, t.state, null);
    }
  }
  function hr(e, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var i in t)
        if (i !== "ref") {
          a[i] = t[i];
        }
    }
    if ((e = e.defaultProps)) {
      if (a === t) {
        a = v({}, a);
      }
      for (var u in e)
        if (a[u] === void 0) {
          a[u] = e[u];
        }
    }
    return a;
  }
  function Em(e) {
    lo(e);
  }
  function xm(e) {
    console.error(e);
  }
  function wm(e) {
    lo(e);
  }
  function Ao(e, t) {
    try {
      var a = e.onUncaughtError;
      a(t.value, {
        componentStack: t.stack,
      });
    } catch (i) {
      setTimeout(function () {
        throw i;
      });
    }
  }
  function Rm(e, t, a) {
    try {
      var i = e.onCaughtError;
      i(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null,
      });
    } catch (u) {
      setTimeout(function () {
        throw u;
      });
    }
  }
  function cc(e, t, a) {
    return (
      (a = xa(a)),
      (a.tag = 3),
      (a.payload = {
        element: null,
      }),
      (a.callback = function () {
        Ao(e, t);
      }),
      a
    );
  }
  function _m(e) {
    return ((e = xa(e)), (e.tag = 3), e);
  }
  function Tm(e, t, a, i) {
    var u = a.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var d = i.value;
      e.payload = function () {
        return u(d);
      };
      e.callback = function () {
        Rm(t, a, i);
      };
    }
    var p = a.stateNode;
    if (p !== null && typeof p.componentDidCatch == "function") {
      e.callback = function () {
        Rm(t, a, i);
        if (typeof u != "function") {
          Aa === null ? (Aa = new Set([this])) : Aa.add(this);
        }
        var b = i.stack;
        this.componentDidCatch(i.value, {
          componentStack: b !== null ? b : "",
        });
      };
    }
  }
  function Wb(e, t, a, i, u) {
    if (
      ((a.flags |= 32768),
      i !== null && typeof i == "object" && typeof i.then == "function")
    ) {
      if (
        ((t = a.alternate),
        t !== null && jr(t, a, u, !0),
        (a = ln.current),
        a !== null)
      ) {
        switch (a.tag) {
          case 31:
          case 13:
            return (
              Sn === null ? qo() : a.alternate === null && gt === 0 && (gt = 3),
              (a.flags &= -257),
              (a.flags |= 65536),
              (a.lanes = u),
              i === po
                ? (a.flags |= 16384)
                : ((t = a.updateQueue),
                  t === null ? (a.updateQueue = new Set([i])) : t.add(i),
                  kc(e, i, u)),
              !1
            );
          case 22:
            return (
              (a.flags |= 65536),
              i === po
                ? (a.flags |= 16384)
                : ((t = a.updateQueue),
                  t === null
                    ? ((t = {
                        transitions: null,
                        markerInstances: null,
                        retryQueue: new Set([i]),
                      }),
                      (a.updateQueue = t))
                    : ((a = t.retryQueue),
                      a === null ? (t.retryQueue = new Set([i])) : a.add(i)),
                  kc(e, i, u)),
              !1
            );
        }
        throw Error(o(435, a.tag));
      }
      return (kc(e, i, u), qo(), !1);
    }
    if (Ye)
      return (
        (t = ln.current),
        t !== null
          ? ((t.flags & 65536) === 0 && (t.flags |= 256),
            (t.flags |= 65536),
            (t.lanes = u),
            i !== Au &&
              ((e = Error(o(422), {
                cause: i,
              })),
              ql(pn(e, a))))
          : (i !== Au &&
              ((t = Error(o(423), {
                cause: i,
              })),
              ql(pn(t, a))),
            (e = e.current.alternate),
            (e.flags |= 65536),
            (u &= -u),
            (e.lanes |= u),
            (i = pn(i, a)),
            (u = cc(e.stateNode, i, u)),
            $u(e, u),
            gt !== 4 && (gt = 2)),
        !1
      );
    var d = Error(o(520), {
      cause: i,
    });
    if (
      ((d = pn(d, a)),
      ii === null ? (ii = [d]) : ii.push(d),
      gt !== 4 && (gt = 2),
      t === null)
    )
      return !0;
    i = pn(i, a);
    a = t;
    do {
      switch (a.tag) {
        case 3:
          return (
            (a.flags |= 65536),
            (e = u & -u),
            (a.lanes |= e),
            (e = cc(a.stateNode, i, e)),
            $u(a, e),
            !1
          );
        case 1:
          if (
            ((t = a.type),
            (d = a.stateNode),
            (a.flags & 128) === 0 &&
              (typeof t.getDerivedStateFromError == "function" ||
                (d !== null &&
                  typeof d.componentDidCatch == "function" &&
                  (Aa === null || !Aa.has(d)))))
          )
            return (
              (a.flags |= 65536),
              (u &= -u),
              (a.lanes |= u),
              (u = _m(u)),
              Tm(u, e, a, i),
              $u(a, u),
              !1
            );
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var fc = Error(o(461)),
    Rt = !1;
  function Mt(e, t, a, i) {
    t.child = e === null ? Dh(t, null, a, i) : fr(t, e.child, a, i);
  }
  function Om(e, t, a, i, u) {
    a = a.render;
    var d = t.ref;
    if ("ref" in i) {
      var p = {};
      for (var b in i)
        if (b !== "ref") {
          p[b] = i[b];
        }
    } else p = i;
    return (
      or(t),
      (i = Xu(e, t, a, p, d, u)),
      (b = Pu()),
      e !== null && !Rt
        ? (Qu(e, t, u), na(e, t, u))
        : (Ye && b && Ou(t), (t.flags |= 1), Mt(e, t, i, u), t.child)
    );
  }
  function Cm(e, t, a, i, u) {
    if (e === null) {
      var d = a.type;
      return typeof d == "function" &&
        !Ru(d) &&
        d.defaultProps === void 0 &&
        a.compare === null
        ? ((t.tag = 15), (t.type = d), Am(e, t, d, i, u))
        : ((e = uo(a.type, null, i, t, t.mode, u)),
          (e.ref = t.ref),
          (e.return = t),
          (t.child = e));
    }
    if (((d = e.child), !bc(e, u))) {
      var p = d.memoizedProps;
      if (
        ((a = a.compare), (a = a !== null ? a : Hl), a(p, i) && e.ref === t.ref)
      )
        return na(e, t, u);
    }
    return (
      (t.flags |= 1),
      (e = Zn(d, i)),
      (e.ref = t.ref),
      (e.return = t),
      (t.child = e)
    );
  }
  function Am(e, t, a, i, u) {
    if (e !== null) {
      var d = e.memoizedProps;
      if (Hl(d, i) && e.ref === t.ref)
        if (((Rt = !1), (t.pendingProps = i = d), bc(e, u))) {
          if ((e.flags & 131072) !== 0) {
            Rt = !0;
          }
        } else return ((t.lanes = e.lanes), na(e, t, u));
    }
    return dc(e, t, a, i, u);
  }
  function Dm(e, t, a, i) {
    var u = i.children,
      d = e !== null ? e.memoizedState : null;
    if (
      (e === null &&
        t.stateNode === null &&
        (t.stateNode = {
          _visibility: 1,
          _pendingMarkers: null,
          _retryCache: null,
          _transitions: null,
        }),
      i.mode === "hidden")
    ) {
      if ((t.flags & 128) !== 0) {
        if (((d = d !== null ? d.baseLanes | a : a), e !== null)) {
          for (i = t.child = e.child, u = 0; i !== null; ) {
            u = u | i.lanes | i.childLanes;
            i = i.sibling;
          }
          i = u & ~d;
        } else {
          i = 0;
          t.child = null;
        }
        return Lm(e, t, d, a, i);
      }
      if ((a & 536870912) !== 0) {
        t.memoizedState = {
          baseLanes: 0,
          cachePool: null,
        };
        if (e !== null) {
          mo(t, d !== null ? d.cachePool : null);
        }
        d !== null ? Mh(t, d) : Vu();
        zh(t);
      } else
        return (
          (i = t.lanes = 536870912),
          Lm(e, t, d !== null ? d.baseLanes | a : a, a, i)
        );
    } else
      d !== null
        ? (mo(t, d.cachePool), Mh(t, d), _a(), (t.memoizedState = null))
        : (e !== null && mo(t, null), Vu(), _a());
    return (Mt(e, t, u, a), t.child);
  }
  function Wl(e, t) {
    return (
      (e !== null && e.tag === 22) ||
        t.stateNode !== null ||
        (t.stateNode = {
          _visibility: 1,
          _pendingMarkers: null,
          _retryCache: null,
          _transitions: null,
        }),
      t.sibling
    );
  }
  function Lm(e, t, a, i, u) {
    var d = ju();
    return (
      (d =
        d === null
          ? null
          : {
              parent: xt._currentValue,
              pool: d,
            }),
      (t.memoizedState = {
        baseLanes: a,
        cachePool: d,
      }),
      e !== null && mo(t, null),
      Vu(),
      zh(t),
      e !== null && jr(e, t, i, !0),
      (t.childLanes = u),
      null
    );
  }
  function Do(e, t) {
    return (
      (t = No(
        {
          mode: t.mode,
          children: t.children,
        },
        e.mode,
      )),
      (t.ref = e.ref),
      (e.child = t),
      (t.return = e),
      t
    );
  }
  function Nm(e, t, a) {
    return (
      fr(t, e.child, null, a),
      (e = Do(t, t.pendingProps)),
      (e.flags |= 2),
      on(t),
      (t.memoizedState = null),
      e
    );
  }
  function e1(e, t, a) {
    var i = t.pendingProps,
      u = (t.flags & 128) !== 0;
    if (((t.flags &= -129), e === null)) {
      if (Ye) {
        if (i.mode === "hidden")
          return ((e = Do(t, i)), (t.lanes = 536870912), Wl(null, e));
        if (
          (Gu(t),
          (e = rt)
            ? ((e = G0(e, bn)),
              (e = e !== null && e.data === "&" ? e : null),
              e !== null &&
                ((t.memoizedState = {
                  dehydrated: e,
                  treeContext:
                    ya !== null
                      ? {
                          id: Un,
                          overflow: Hn,
                        }
                      : null,
                  retryLane: 536870912,
                  hydrationErrors: null,
                }),
                (a = gh(e)),
                (a.return = t),
                (t.child = a),
                (Lt = t),
                (rt = null)))
            : (e = null),
          e === null)
        )
          throw ba(t);
        return ((t.lanes = 536870912), null);
      }
      return Do(t, i);
    }
    var d = e.memoizedState;
    if (d !== null) {
      var p = d.dehydrated;
      if ((Gu(t), u)) {
        if (t.flags & 256) {
          t.flags &= -257;
          t = Nm(e, t, a);
        } else if (t.memoizedState !== null) {
          t.child = e.child;
          t.flags |= 128;
          t = null;
        } else throw Error(o(558));
      } else if (
        (Rt || jr(e, t, a, !1), (u = (a & e.childLanes) !== 0), Rt || u)
      ) {
        if (
          ((i = nt),
          i !== null && ((p = j(i, a)), p !== 0 && p !== d.retryLane))
        )
          throw ((d.retryLane = p), ar(e, p), It(i, e, p), fc);
        qo();
        t = Nm(e, t, a);
      } else {
        e = d.treeContext;
        rt = En(p.nextSibling);
        Lt = t;
        Ye = !0;
        va = null;
        bn = !1;
        if (e !== null) {
          vh(t, e);
        }
        t = Do(t, i);
        t.flags |= 4096;
      }
      return t;
    }
    return (
      (e = Zn(e.child, {
        mode: i.mode,
        children: i.children,
      })),
      (e.ref = t.ref),
      (t.child = e),
      (e.return = t),
      e
    );
  }
  function Lo(e, t) {
    var a = t.ref;
    if (a === null) {
      if (e !== null && e.ref !== null) {
        t.flags |= 4194816;
      }
    } else {
      if (typeof a != "function" && typeof a != "object") throw Error(o(284));
      if (e === null || e.ref !== a) {
        t.flags |= 4194816;
      }
    }
  }
  function dc(e, t, a, i, u) {
    return (
      or(t),
      (a = Xu(e, t, a, i, void 0, u)),
      (i = Pu()),
      e !== null && !Rt
        ? (Qu(e, t, u), na(e, t, u))
        : (Ye && i && Ou(t), (t.flags |= 1), Mt(e, t, a, u), t.child)
    );
  }
  function Mm(e, t, a, i, u, d) {
    return (
      or(t),
      (t.updateQueue = null),
      (a = jh(t, i, a, u)),
      kh(e),
      (i = Pu()),
      e !== null && !Rt
        ? (Qu(e, t, d), na(e, t, d))
        : (Ye && i && Ou(t), (t.flags |= 1), Mt(e, t, a, d), t.child)
    );
  }
  function zm(e, t, a, i, u) {
    if ((or(t), t.stateNode === null)) {
      var d = Nr,
        p = a.contextType;
      if (typeof p == "object" && p !== null) {
        d = Nt(p);
      }
      d = new a(i, d);
      t.memoizedState = d.state !== null && d.state !== void 0 ? d.state : null;
      d.updater = uc;
      t.stateNode = d;
      d._reactInternals = t;
      d = t.stateNode;
      d.props = i;
      d.state = t.memoizedState;
      d.refs = {};
      Hu(t);
      p = a.contextType;
      d.context = typeof p == "object" && p !== null ? Nt(p) : Nr;
      d.state = t.memoizedState;
      p = a.getDerivedStateFromProps;
      if (typeof p == "function") {
        (sc(t, a, p, i), (d.state = t.memoizedState));
      }
      typeof a.getDerivedStateFromProps == "function" ||
        typeof d.getSnapshotBeforeUpdate == "function" ||
        (typeof d.UNSAFE_componentWillMount != "function" &&
          typeof d.componentWillMount != "function") ||
        ((p = d.state),
        typeof d.componentWillMount == "function" && d.componentWillMount(),
        typeof d.UNSAFE_componentWillMount == "function" &&
          d.UNSAFE_componentWillMount(),
        p !== d.state && uc.enqueueReplaceState(d, d.state, null),
        Ql(t, i, d, u),
        Pl(),
        (d.state = t.memoizedState));
      if (typeof d.componentDidMount == "function") {
        t.flags |= 4194308;
      }
      i = !0;
    } else if (e === null) {
      d = t.stateNode;
      var b = t.memoizedProps,
        C = hr(a, b);
      d.props = C;
      var q = d.context,
        Q = a.contextType;
      p = Nr;
      if (typeof Q == "object" && Q !== null) {
        p = Nt(Q);
      }
      var I = a.getDerivedStateFromProps;
      Q =
        typeof I == "function" ||
        typeof d.getSnapshotBeforeUpdate == "function";
      b = t.pendingProps !== b;
      Q ||
        (typeof d.UNSAFE_componentWillReceiveProps != "function" &&
          typeof d.componentWillReceiveProps != "function") ||
        ((b || q !== p) && Sm(t, d, i, p));
      Ea = !1;
      var Y = t.memoizedState;
      d.state = Y;
      Ql(t, i, d, u);
      Pl();
      q = t.memoizedState;
      b || Y !== q || Ea
        ? (typeof I == "function" && (sc(t, a, I, i), (q = t.memoizedState)),
          (C = Ea || bm(t, a, C, i, Y, q, p))
            ? (Q ||
                (typeof d.UNSAFE_componentWillMount != "function" &&
                  typeof d.componentWillMount != "function") ||
                (typeof d.componentWillMount == "function" &&
                  d.componentWillMount(),
                typeof d.UNSAFE_componentWillMount == "function" &&
                  d.UNSAFE_componentWillMount()),
              typeof d.componentDidMount == "function" && (t.flags |= 4194308))
            : (typeof d.componentDidMount == "function" && (t.flags |= 4194308),
              (t.memoizedProps = i),
              (t.memoizedState = q)),
          (d.props = i),
          (d.state = q),
          (d.context = p),
          (i = C))
        : (typeof d.componentDidMount == "function" && (t.flags |= 4194308),
          (i = !1));
    } else {
      d = t.stateNode;
      Bu(e, t);
      p = t.memoizedProps;
      Q = hr(a, p);
      d.props = Q;
      I = t.pendingProps;
      Y = d.context;
      q = a.contextType;
      C = Nr;
      if (typeof q == "object" && q !== null) {
        C = Nt(q);
      }
      b = a.getDerivedStateFromProps;
      (q =
        typeof b == "function" ||
        typeof d.getSnapshotBeforeUpdate == "function") ||
        (typeof d.UNSAFE_componentWillReceiveProps != "function" &&
          typeof d.componentWillReceiveProps != "function") ||
        ((p !== I || Y !== C) && Sm(t, d, i, C));
      Ea = !1;
      Y = t.memoizedState;
      d.state = Y;
      Ql(t, i, d, u);
      Pl();
      var P = t.memoizedState;
      p !== I ||
      Y !== P ||
      Ea ||
      (e !== null && e.dependencies !== null && fo(e.dependencies))
        ? (typeof b == "function" && (sc(t, a, b, i), (P = t.memoizedState)),
          (Q =
            Ea ||
            bm(t, a, Q, i, Y, P, C) ||
            (e !== null && e.dependencies !== null && fo(e.dependencies)))
            ? (q ||
                (typeof d.UNSAFE_componentWillUpdate != "function" &&
                  typeof d.componentWillUpdate != "function") ||
                (typeof d.componentWillUpdate == "function" &&
                  d.componentWillUpdate(i, P, C),
                typeof d.UNSAFE_componentWillUpdate == "function" &&
                  d.UNSAFE_componentWillUpdate(i, P, C)),
              typeof d.componentDidUpdate == "function" && (t.flags |= 4),
              typeof d.getSnapshotBeforeUpdate == "function" &&
                (t.flags |= 1024))
            : (typeof d.componentDidUpdate != "function" ||
                (p === e.memoizedProps && Y === e.memoizedState) ||
                (t.flags |= 4),
              typeof d.getSnapshotBeforeUpdate != "function" ||
                (p === e.memoizedProps && Y === e.memoizedState) ||
                (t.flags |= 1024),
              (t.memoizedProps = i),
              (t.memoizedState = P)),
          (d.props = i),
          (d.state = P),
          (d.context = C),
          (i = Q))
        : (typeof d.componentDidUpdate != "function" ||
            (p === e.memoizedProps && Y === e.memoizedState) ||
            (t.flags |= 4),
          typeof d.getSnapshotBeforeUpdate != "function" ||
            (p === e.memoizedProps && Y === e.memoizedState) ||
            (t.flags |= 1024),
          (i = !1));
    }
    return (
      (d = i),
      Lo(e, t),
      (i = (t.flags & 128) !== 0),
      d || i
        ? ((d = t.stateNode),
          (a =
            i && typeof a.getDerivedStateFromError != "function"
              ? null
              : d.render()),
          (t.flags |= 1),
          e !== null && i
            ? ((t.child = fr(t, e.child, null, u)),
              (t.child = fr(t, null, a, u)))
            : Mt(e, t, a, u),
          (t.memoizedState = d.state),
          (e = t.child))
        : (e = na(e, t, u)),
      e
    );
  }
  function km(e, t, a, i) {
    return (lr(), (t.flags |= 256), Mt(e, t, a, i), t.child);
  }
  var hc = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null,
  };
  function mc(e) {
    return {
      baseLanes: e,
      cachePool: Rh(),
    };
  }
  function gc(e, t, a) {
    return ((e = e !== null ? e.childLanes & ~a : 0), t && (e |= un), e);
  }
  function jm(e, t, a) {
    var i = t.pendingProps,
      u = !1,
      d = (t.flags & 128) !== 0,
      p;
    if (
      ((p = d) ||
        (p =
          e !== null && e.memoizedState === null ? !1 : (vt.current & 2) !== 0),
      p && ((u = !0), (t.flags &= -129)),
      (p = (t.flags & 32) !== 0),
      (t.flags &= -33),
      e === null)
    ) {
      if (Ye) {
        if (
          (u ? Ra(t) : _a(),
          (e = rt)
            ? ((e = G0(e, bn)),
              (e = e !== null && e.data !== "&" ? e : null),
              e !== null &&
                ((t.memoizedState = {
                  dehydrated: e,
                  treeContext:
                    ya !== null
                      ? {
                          id: Un,
                          overflow: Hn,
                        }
                      : null,
                  retryLane: 536870912,
                  hydrationErrors: null,
                }),
                (a = gh(e)),
                (a.return = t),
                (t.child = a),
                (Lt = t),
                (rt = null)))
            : (e = null),
          e === null)
        )
          throw ba(t);
        return (Jc(e) ? (t.lanes = 32) : (t.lanes = 536870912), null);
      }
      var b = i.children;
      return (
        (i = i.fallback),
        u
          ? (_a(),
            (u = t.mode),
            (b = No(
              {
                mode: "hidden",
                children: b,
              },
              u,
            )),
            (i = rr(i, u, a, null)),
            (b.return = t),
            (i.return = t),
            (b.sibling = i),
            (t.child = b),
            (i = t.child),
            (i.memoizedState = mc(a)),
            (i.childLanes = gc(e, p, a)),
            (t.memoizedState = hc),
            Wl(null, i))
          : (Ra(t), pc(t, b))
      );
    }
    var C = e.memoizedState;
    if (C !== null && ((b = C.dehydrated), b !== null)) {
      if (d)
        t.flags & 256
          ? (Ra(t), (t.flags &= -257), (t = yc(e, t, a)))
          : t.memoizedState !== null
            ? (_a(), (t.child = e.child), (t.flags |= 128), (t = null))
            : (_a(),
              (b = i.fallback),
              (u = t.mode),
              (i = No(
                {
                  mode: "visible",
                  children: i.children,
                },
                u,
              )),
              (b = rr(b, u, a, null)),
              (b.flags |= 2),
              (i.return = t),
              (b.return = t),
              (i.sibling = b),
              (t.child = i),
              fr(t, e.child, null, a),
              (i = t.child),
              (i.memoizedState = mc(a)),
              (i.childLanes = gc(e, p, a)),
              (t.memoizedState = hc),
              (t = Wl(null, i)));
      else if ((Ra(t), Jc(b))) {
        if (((p = b.nextSibling && b.nextSibling.dataset), p)) var q = p.dgst;
        p = q;
        i = Error(o(419));
        i.stack = "";
        i.digest = p;
        ql({
          value: i,
          source: null,
          stack: null,
        });
        t = yc(e, t, a);
      } else if (
        (Rt || jr(e, t, a, !1), (p = (a & e.childLanes) !== 0), Rt || p)
      ) {
        if (
          ((p = nt),
          p !== null && ((i = j(p, a)), i !== 0 && i !== C.retryLane))
        )
          throw ((C.retryLane = i), ar(e, i), It(p, e, i), fc);
        Zc(b) || qo();
        t = yc(e, t, a);
      } else
        Zc(b)
          ? ((t.flags |= 192), (t.child = e.child), (t = null))
          : ((e = C.treeContext),
            (rt = En(b.nextSibling)),
            (Lt = t),
            (Ye = !0),
            (va = null),
            (bn = !1),
            e !== null && vh(t, e),
            (t = pc(t, i.children)),
            (t.flags |= 4096));
      return t;
    }
    return u
      ? (_a(),
        (b = i.fallback),
        (u = t.mode),
        (C = e.child),
        (q = C.sibling),
        (i = Zn(C, {
          mode: "hidden",
          children: i.children,
        })),
        (i.subtreeFlags = C.subtreeFlags & 65011712),
        q !== null ? (b = Zn(q, b)) : ((b = rr(b, u, a, null)), (b.flags |= 2)),
        (b.return = t),
        (i.return = t),
        (i.sibling = b),
        (t.child = i),
        Wl(null, i),
        (i = t.child),
        (b = e.child.memoizedState),
        b === null
          ? (b = mc(a))
          : ((u = b.cachePool),
            u !== null
              ? ((C = xt._currentValue),
                (u =
                  u.parent !== C
                    ? {
                        parent: C,
                        pool: C,
                      }
                    : u))
              : (u = Rh()),
            (b = {
              baseLanes: b.baseLanes | a,
              cachePool: u,
            })),
        (i.memoizedState = b),
        (i.childLanes = gc(e, p, a)),
        (t.memoizedState = hc),
        Wl(e.child, i))
      : (Ra(t),
        (a = e.child),
        (e = a.sibling),
        (a = Zn(a, {
          mode: "visible",
          children: i.children,
        })),
        (a.return = t),
        (a.sibling = null),
        e !== null &&
          ((p = t.deletions),
          p === null ? ((t.deletions = [e]), (t.flags |= 16)) : p.push(e)),
        (t.child = a),
        (t.memoizedState = null),
        a);
  }
  function pc(e, t) {
    return (
      (t = No(
        {
          mode: "visible",
          children: t,
        },
        e.mode,
      )),
      (t.return = e),
      (e.child = t)
    );
  }
  function No(e, t) {
    return ((e = rn(22, e, null, t)), (e.lanes = 0), e);
  }
  function yc(e, t, a) {
    return (
      fr(t, e.child, null, a),
      (e = pc(t, t.pendingProps.children)),
      (e.flags |= 2),
      (t.memoizedState = null),
      e
    );
  }
  function Um(e, t, a) {
    e.lanes |= t;
    var i = e.alternate;
    if (i !== null) {
      i.lanes |= t;
    }
    Nu(e.return, t, a);
  }
  function vc(e, t, a, i, u, d) {
    var p = e.memoizedState;
    p === null
      ? (e.memoizedState = {
          isBackwards: t,
          rendering: null,
          renderingStartTime: 0,
          last: i,
          tail: a,
          tailMode: u,
          treeForkCount: d,
        })
      : ((p.isBackwards = t),
        (p.rendering = null),
        (p.renderingStartTime = 0),
        (p.last = i),
        (p.tail = a),
        (p.tailMode = u),
        (p.treeForkCount = d));
  }
  function Hm(e, t, a) {
    var i = t.pendingProps,
      u = i.revealOrder,
      d = i.tail;
    i = i.children;
    var p = vt.current,
      b = (p & 2) !== 0;
    if (
      (b ? ((p = (p & 1) | 2), (t.flags |= 128)) : (p &= 1),
      J(vt, p),
      Mt(e, t, i, a),
      (i = Ye ? $l : 0),
      !b && e !== null && (e.flags & 128) !== 0)
    )
      e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) {
          if (e.memoizedState !== null) {
            Um(e, a, t);
          }
        } else if (e.tag === 19) Um(e, a, t);
        else if (e.child !== null) {
          e.child.return = e;
          e = e.child;
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        e.sibling.return = e.return;
        e = e.sibling;
      }
    switch (u) {
      case "forwards":
        for (a = t.child, u = null; a !== null; ) {
          e = a.alternate;
          if (e !== null && So(e) === null) {
            u = a;
          }
          a = a.sibling;
        }
        a = u;
        a === null
          ? ((u = t.child), (t.child = null))
          : ((u = a.sibling), (a.sibling = null));
        vc(t, !1, u, a, d, i);
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        for (a = null, u = t.child, t.child = null; u !== null; ) {
          if (((e = u.alternate), e !== null && So(e) === null)) {
            t.child = u;
            break;
          }
          e = u.sibling;
          u.sibling = a;
          a = u;
          u = e;
        }
        vc(t, !0, a, null, d, i);
        break;
      case "together":
        vc(t, !1, null, null, void 0, i);
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function na(e, t, a) {
    if (
      (e !== null && (t.dependencies = e.dependencies),
      (Ca |= t.lanes),
      (a & t.childLanes) === 0)
    )
      if (e !== null) {
        if ((jr(e, t, a, !1), (a & t.childLanes) === 0)) return null;
      } else return null;
    if (e !== null && t.child !== e.child) throw Error(o(153));
    if (t.child !== null) {
      for (
        e = t.child, a = Zn(e, e.pendingProps), t.child = a, a.return = t;
        e.sibling !== null;
      ) {
        e = e.sibling;
        a = a.sibling = Zn(e, e.pendingProps);
        a.return = t;
      }
      a.sibling = null;
    }
    return t.child;
  }
  function bc(e, t) {
    return (e.lanes & t) !== 0
      ? !0
      : ((e = e.dependencies), !!(e !== null && fo(e)));
  }
  function t1(e, t, a) {
    switch (t.tag) {
      case 3:
        tt(t, t.stateNode.containerInfo);
        Sa(t, xt, e.memoizedState.cache);
        lr();
        break;
      case 27:
      case 5:
        ft(t);
        break;
      case 4:
        tt(t, t.stateNode.containerInfo);
        break;
      case 10:
        Sa(t, t.type, t.memoizedProps.value);
        break;
      case 31:
        if (t.memoizedState !== null) return ((t.flags |= 128), Gu(t), null);
        break;
      case 13:
        var i = t.memoizedState;
        if (i !== null) {
          if (i.dehydrated !== null) {
            return (Ra(t), (t.flags |= 128), null);
          }
          if ((a & t.child.childLanes) !== 0) {
            return jm(e, t, a);
          }
          return (Ra(t), (e = na(e, t, a)), e !== null ? e.sibling : null);
        }
        Ra(t);
        break;
      case 19:
        var u = (e.flags & 128) !== 0;
        if (
          ((i = (a & t.childLanes) !== 0),
          i || (jr(e, t, a, !1), (i = (a & t.childLanes) !== 0)),
          u)
        ) {
          if (i) return Hm(e, t, a);
          t.flags |= 128;
        }
        if (
          ((u = t.memoizedState),
          u !== null &&
            ((u.rendering = null), (u.tail = null), (u.lastEffect = null)),
          J(vt, vt.current),
          i)
        )
          break;
        return null;
      case 22:
        return ((t.lanes = 0), Dm(e, t, a, t.pendingProps));
      case 24:
        Sa(t, xt, e.memoizedState.cache);
    }
    return na(e, t, a);
  }
  function Bm(e, t, a) {
    if (e !== null) {
      if (e.memoizedProps !== t.pendingProps) Rt = !0;
      else {
        if (!bc(e, a) && (t.flags & 128) === 0) return ((Rt = !1), t1(e, t, a));
        Rt = (e.flags & 131072) !== 0;
      }
    } else {
      Rt = !1;
      if (Ye && (t.flags & 1048576) !== 0) {
        yh(t, $l, t.index);
      }
    }
    switch (((t.lanes = 0), t.tag)) {
      case 16:
        e: {
          var i = t.pendingProps;
          if (((e = ur(t.elementType)), (t.type = e), typeof e == "function"))
            Ru(e)
              ? ((i = hr(e, i)), (t.tag = 1), (t = zm(null, t, e, i, a)))
              : ((t.tag = 0), (t = dc(null, t, e, i, a)));
          else {
            if (e != null) {
              var u = e.$$typeof;
              if (u === te) {
                t.tag = 11;
                t = Om(null, t, e, i, a);
                break e;
              } else if (u === D) {
                t.tag = 14;
                t = Cm(null, t, e, i, a);
                break e;
              }
            }
            throw ((t = ee(e) || e), Error(o(306, t, "")));
          }
        }
        return t;
      case 0:
        return dc(e, t, t.type, t.pendingProps, a);
      case 1:
        return ((i = t.type), (u = hr(i, t.pendingProps)), zm(e, t, i, u, a));
      case 3:
        e: {
          if ((tt(t, t.stateNode.containerInfo), e === null))
            throw Error(o(387));
          i = t.pendingProps;
          var d = t.memoizedState;
          u = d.element;
          Bu(e, t);
          Ql(t, i, null, a);
          var p = t.memoizedState;
          if (
            ((i = p.cache),
            Sa(t, xt, i),
            i !== d.cache && Mu(t, [xt], a, !0),
            Pl(),
            (i = p.element),
            d.isDehydrated)
          ) {
            if (
              ((d = {
                element: i,
                isDehydrated: !1,
                cache: p.cache,
              }),
              (t.updateQueue.baseState = d),
              (t.memoizedState = d),
              t.flags & 256)
            ) {
              t = km(e, t, i, a);
              break e;
            } else if (i !== u) {
              u = pn(Error(o(424)), t);
              ql(u);
              t = km(e, t, i, a);
              break e;
            } else
              for (
                e = t.stateNode.containerInfo,
                  e.nodeType === 9
                    ? (e = e.body)
                    : (e = e.nodeName === "HTML" ? e.ownerDocument.body : e),
                  rt = En(e.firstChild),
                  Lt = t,
                  Ye = !0,
                  va = null,
                  bn = !0,
                  a = Dh(t, null, i, a),
                  t.child = a;
                a;
              ) {
                a.flags = (a.flags & -3) | 4096;
                a = a.sibling;
              }
          } else {
            if ((lr(), i === u)) {
              t = na(e, t, a);
              break e;
            }
            Mt(e, t, i, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return (
          Lo(e, t),
          e === null
            ? (a = Z0(t.type, null, t.pendingProps, null))
              ? (t.memoizedState = a)
              : Ye ||
                ((a = t.type),
                (e = t.pendingProps),
                (i = Qo(Re.current).createElement(a)),
                (i[fe] = t),
                (i[ge] = e),
                zt(i, a, e),
                ot(i),
                (t.stateNode = i))
            : (t.memoizedState = Z0(
                t.type,
                e.memoizedProps,
                t.pendingProps,
                e.memoizedState,
              )),
          null
        );
      case 27:
        return (
          ft(t),
          e === null &&
            Ye &&
            ((i = t.stateNode = P0(t.type, t.pendingProps, Re.current)),
            (Lt = t),
            (bn = !0),
            (u = rt),
            Ma(t.type) ? ((Ic = u), (rt = En(i.firstChild))) : (rt = u)),
          Mt(e, t, t.pendingProps.children, a),
          Lo(e, t),
          e === null && (t.flags |= 4194304),
          t.child
        );
      case 5:
        return (
          e === null &&
            Ye &&
            ((u = i = rt) &&
              ((i = L1(i, t.type, t.pendingProps, bn)),
              i !== null
                ? ((t.stateNode = i),
                  (Lt = t),
                  (rt = En(i.firstChild)),
                  (bn = !1),
                  (u = !0))
                : (u = !1)),
            u || ba(t)),
          ft(t),
          (u = t.type),
          (d = t.pendingProps),
          (p = e !== null ? e.memoizedProps : null),
          (i = d.children),
          Pc(u, d) ? (i = null) : p !== null && Pc(u, p) && (t.flags |= 32),
          t.memoizedState !== null &&
            ((u = Xu(e, t, Xb, null, null, a)), (mi._currentValue = u)),
          Lo(e, t),
          Mt(e, t, i, a),
          t.child
        );
      case 6:
        return (
          e === null &&
            Ye &&
            ((e = a = rt) &&
              ((a = N1(a, t.pendingProps, bn)),
              a !== null
                ? ((t.stateNode = a), (Lt = t), (rt = null), (e = !0))
                : (e = !1)),
            e || ba(t)),
          null
        );
      case 13:
        return jm(e, t, a);
      case 4:
        return (
          tt(t, t.stateNode.containerInfo),
          (i = t.pendingProps),
          e === null ? (t.child = fr(t, null, i, a)) : Mt(e, t, i, a),
          t.child
        );
      case 11:
        return Om(e, t, t.type, t.pendingProps, a);
      case 7:
        return (Mt(e, t, t.pendingProps, a), t.child);
      case 8:
        return (Mt(e, t, t.pendingProps.children, a), t.child);
      case 12:
        return (Mt(e, t, t.pendingProps.children, a), t.child);
      case 10:
        return (
          (i = t.pendingProps),
          Sa(t, t.type, i.value),
          Mt(e, t, i.children, a),
          t.child
        );
      case 9:
        return (
          (u = t.type._context),
          (i = t.pendingProps.children),
          or(t),
          (u = Nt(u)),
          (i = i(u)),
          (t.flags |= 1),
          Mt(e, t, i, a),
          t.child
        );
      case 14:
        return Cm(e, t, t.type, t.pendingProps, a);
      case 15:
        return Am(e, t, t.type, t.pendingProps, a);
      case 19:
        return Hm(e, t, a);
      case 31:
        return e1(e, t, a);
      case 22:
        return Dm(e, t, a, t.pendingProps);
      case 24:
        return (
          or(t),
          (i = Nt(xt)),
          e === null
            ? ((u = ju()),
              u === null &&
                ((u = nt),
                (d = zu()),
                (u.pooledCache = d),
                d.refCount++,
                d !== null && (u.pooledCacheLanes |= a),
                (u = d)),
              (t.memoizedState = {
                parent: i,
                cache: u,
              }),
              Hu(t),
              Sa(t, xt, u))
            : ((e.lanes & a) !== 0 && (Bu(e, t), Ql(t, null, null, a), Pl()),
              (u = e.memoizedState),
              (d = t.memoizedState),
              u.parent !== i
                ? ((u = {
                    parent: i,
                    cache: i,
                  }),
                  (t.memoizedState = u),
                  t.lanes === 0 &&
                    (t.memoizedState = t.updateQueue.baseState = u),
                  Sa(t, xt, i))
                : ((i = d.cache),
                  Sa(t, xt, i),
                  i !== u.cache && Mu(t, [xt], a, !0))),
          Mt(e, t, t.pendingProps.children, a),
          t.child
        );
      case 29:
        throw t.pendingProps;
    }
    throw Error(o(156, t.tag));
  }
  function aa(e) {
    e.flags |= 4;
  }
  function Sc(e, t, a, i, u) {
    if (((t = (e.mode & 32) !== 0) && (t = !1), t)) {
      if (((e.flags |= 16777216), (u & 335544128) === u))
        if (e.stateNode.complete) e.flags |= 8192;
        else if (d0()) e.flags |= 8192;
        else throw ((cr = po), Uu);
    } else e.flags &= -16777217;
  }
  function $m(e, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      e.flags &= -16777217;
    else if (((e.flags |= 16777216), !tg(t)))
      if (d0()) e.flags |= 8192;
      else throw ((cr = po), Uu);
  }
  function Mo(e, t) {
    if (t !== null) {
      e.flags |= 4;
    }
    if (e.flags & 16384) {
      ((t = e.tag !== 22 ? Za() : 536870912), (e.lanes |= t), (Qr |= t));
    }
  }
  function ei(e, t) {
    if (!Ye)
      switch (e.tailMode) {
        case "hidden":
          t = e.tail;
          for (var a = null; t !== null; ) {
            if (t.alternate !== null) {
              a = t;
            }
            t = t.sibling;
          }
          a === null ? (e.tail = null) : (a.sibling = null);
          break;
        case "collapsed":
          a = e.tail;
          for (var i = null; a !== null; ) {
            if (a.alternate !== null) {
              i = a;
            }
            a = a.sibling;
          }
          i === null
            ? t || e.tail === null
              ? (e.tail = null)
              : (e.tail.sibling = null)
            : (i.sibling = null);
      }
  }
  function lt(e) {
    var t = e.alternate !== null && e.alternate.child === e.child,
      a = 0,
      i = 0;
    if (t)
      for (var u = e.child; u !== null; ) {
        a |= u.lanes | u.childLanes;
        i |= u.subtreeFlags & 65011712;
        i |= u.flags & 65011712;
        u.return = e;
        u = u.sibling;
      }
    else
      for (u = e.child; u !== null; ) {
        a |= u.lanes | u.childLanes;
        i |= u.subtreeFlags;
        i |= u.flags;
        u.return = e;
        u = u.sibling;
      }
    return ((e.subtreeFlags |= i), (e.childLanes = a), t);
  }
  function n1(e, t, a) {
    var i = t.pendingProps;
    switch ((Cu(t), t.tag)) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return (lt(t), null);
      case 1:
        return (lt(t), null);
      case 3:
        return (
          (a = t.stateNode),
          (i = null),
          e !== null && (i = e.memoizedState.cache),
          t.memoizedState.cache !== i && (t.flags |= 2048),
          Wn(xt),
          Pe(),
          a.pendingContext &&
            ((a.context = a.pendingContext), (a.pendingContext = null)),
          (e === null || e.child === null) &&
            (kr(t)
              ? aa(t)
              : e === null ||
                (e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
                ((t.flags |= 1024), Du())),
          lt(t),
          null
        );
      case 26:
        var u = t.type,
          d = t.memoizedState;
        return (
          e === null
            ? (aa(t),
              d !== null ? (lt(t), $m(t, d)) : (lt(t), Sc(t, u, null, i, a)))
            : d
              ? d !== e.memoizedState
                ? (aa(t), lt(t), $m(t, d))
                : (lt(t), (t.flags &= -16777217))
              : ((e = e.memoizedProps),
                e !== i && aa(t),
                lt(t),
                Sc(t, u, e, i, a)),
          null
        );
      case 27:
        if (
          (qt(t),
          (a = Re.current),
          (u = t.type),
          e !== null && t.stateNode != null)
        ) {
          if (e.memoizedProps !== i) {
            aa(t);
          }
        } else {
          if (!i) {
            if (t.stateNode === null) throw Error(o(166));
            return (lt(t), null);
          }
          e = ne.current;
          kr(t) ? bh(t) : ((e = P0(u, i, a)), (t.stateNode = e), aa(t));
        }
        return (lt(t), null);
      case 5:
        if ((qt(t), (u = t.type), e !== null && t.stateNode != null)) {
          if (e.memoizedProps !== i) {
            aa(t);
          }
        } else {
          if (!i) {
            if (t.stateNode === null) throw Error(o(166));
            return (lt(t), null);
          }
          if (((d = ne.current), kr(t))) bh(t);
          else {
            var p = Qo(Re.current);
            switch (d) {
              case 1:
                d = p.createElementNS("http://www.w3.org/2000/svg", u);
                break;
              case 2:
                d = p.createElementNS("http://www.w3.org/1998/Math/MathML", u);
                break;
              default:
                switch (u) {
                  case "svg":
                    d = p.createElementNS("http://www.w3.org/2000/svg", u);
                    break;
                  case "math":
                    d = p.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      u,
                    );
                    break;
                  case "script":
                    d = p.createElement("div");
                    d.innerHTML = "<script><\/script>";
                    d = d.removeChild(d.firstChild);
                    break;
                  case "select":
                    d =
                      typeof i.is == "string"
                        ? p.createElement("select", {
                            is: i.is,
                          })
                        : p.createElement("select");
                    i.multiple
                      ? (d.multiple = !0)
                      : i.size && (d.size = i.size);
                    break;
                  default:
                    d =
                      typeof i.is == "string"
                        ? p.createElement(u, {
                            is: i.is,
                          })
                        : p.createElement(u);
                }
            }
            d[fe] = t;
            d[ge] = i;
            e: for (p = t.child; p !== null; ) {
              if (p.tag === 5 || p.tag === 6) d.appendChild(p.stateNode);
              else if (p.tag !== 4 && p.tag !== 27 && p.child !== null) {
                p.child.return = p;
                p = p.child;
                continue;
              }
              if (p === t) break e;
              for (; p.sibling === null; ) {
                if (p.return === null || p.return === t) break e;
                p = p.return;
              }
              p.sibling.return = p.return;
              p = p.sibling;
            }
            t.stateNode = d;
            e: switch ((zt(d, u, i), u)) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                i = !!i.autoFocus;
                break e;
              case "img":
                i = !0;
                break e;
              default:
                i = !1;
            }
            if (i) {
              aa(t);
            }
          }
        }
        return (
          lt(t),
          Sc(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, a),
          null
        );
      case 6:
        if (e && t.stateNode != null) {
          if (e.memoizedProps !== i) {
            aa(t);
          }
        } else {
          if (typeof i != "string" && t.stateNode === null) throw Error(o(166));
          if (((e = Re.current), kr(t))) {
            if (
              ((e = t.stateNode),
              (a = t.memoizedProps),
              (i = null),
              (u = Lt),
              u !== null)
            )
              switch (u.tag) {
                case 27:
                case 5:
                  i = u.memoizedProps;
              }
            e[fe] = t;
            e = !!(
              e.nodeValue === a ||
              (i !== null && i.suppressHydrationWarning === !0) ||
              j0(e.nodeValue, a)
            );
            e || ba(t, !0);
          } else {
            e = Qo(e).createTextNode(i);
            e[fe] = t;
            t.stateNode = e;
          }
        }
        return (lt(t), null);
      case 31:
        if (((a = t.memoizedState), e === null || e.memoizedState !== null)) {
          if (((i = kr(t)), a !== null)) {
            if (e === null) {
              if (!i) throw Error(o(318));
              if (
                ((e = t.memoizedState),
                (e = e !== null ? e.dehydrated : null),
                !e)
              )
                throw Error(o(557));
              e[fe] = t;
            } else {
              lr();
              if ((t.flags & 128) === 0) {
                t.memoizedState = null;
              }
              t.flags |= 4;
            }
            lt(t);
            e = !1;
          } else {
            a = Du();
            if (e !== null && e.memoizedState !== null) {
              e.memoizedState.hydrationErrors = a;
            }
            e = !0;
          }
          if (!e) return t.flags & 256 ? (on(t), t) : (on(t), null);
          if ((t.flags & 128) !== 0) throw Error(o(558));
        }
        return (lt(t), null);
      case 13:
        if (
          ((i = t.memoizedState),
          e === null ||
            (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
        ) {
          if (((u = kr(t)), i !== null && i.dehydrated !== null)) {
            if (e === null) {
              if (!u) throw Error(o(318));
              if (
                ((u = t.memoizedState),
                (u = u !== null ? u.dehydrated : null),
                !u)
              )
                throw Error(o(317));
              u[fe] = t;
            } else {
              lr();
              if ((t.flags & 128) === 0) {
                t.memoizedState = null;
              }
              t.flags |= 4;
            }
            lt(t);
            u = !1;
          } else {
            u = Du();
            if (e !== null && e.memoizedState !== null) {
              e.memoizedState.hydrationErrors = u;
            }
            u = !0;
          }
          if (!u) return t.flags & 256 ? (on(t), t) : (on(t), null);
        }
        return (
          on(t),
          (t.flags & 128) !== 0
            ? ((t.lanes = a), t)
            : ((a = i !== null),
              (e = e !== null && e.memoizedState !== null),
              a &&
                ((i = t.child),
                (u = null),
                i.alternate !== null &&
                  i.alternate.memoizedState !== null &&
                  i.alternate.memoizedState.cachePool !== null &&
                  (u = i.alternate.memoizedState.cachePool.pool),
                (d = null),
                i.memoizedState !== null &&
                  i.memoizedState.cachePool !== null &&
                  (d = i.memoizedState.cachePool.pool),
                d !== u && (i.flags |= 2048)),
              a !== e && a && (t.child.flags |= 8192),
              Mo(t, t.updateQueue),
              lt(t),
              null)
        );
      case 4:
        return (Pe(), e === null && Vc(t.stateNode.containerInfo), lt(t), null);
      case 10:
        return (Wn(t.type), lt(t), null);
      case 19:
        if ((H(vt), (i = t.memoizedState), i === null)) return (lt(t), null);
        if (((u = (t.flags & 128) !== 0), (d = i.rendering), d === null)) {
          if (u) ei(i, !1);
          else {
            if (gt !== 0 || (e !== null && (e.flags & 128) !== 0))
              for (e = t.child; e !== null; ) {
                if (((d = So(e)), d !== null)) {
                  for (
                    t.flags |= 128,
                      ei(i, !1),
                      e = d.updateQueue,
                      t.updateQueue = e,
                      Mo(t, e),
                      t.subtreeFlags = 0,
                      e = a,
                      a = t.child;
                    a !== null;
                  ) {
                    mh(a, e);
                    a = a.sibling;
                  }
                  return (
                    J(vt, (vt.current & 1) | 2),
                    Ye && Jn(t, i.treeForkCount),
                    t.child
                  );
                }
                e = e.sibling;
              }
            if (i.tail !== null && pt() > Ho) {
              ((t.flags |= 128), (u = !0), ei(i, !1), (t.lanes = 4194304));
            }
          }
        } else {
          if (!u)
            if (((e = So(d)), e !== null)) {
              if (
                ((t.flags |= 128),
                (u = !0),
                (e = e.updateQueue),
                (t.updateQueue = e),
                Mo(t, e),
                ei(i, !0),
                i.tail === null &&
                  i.tailMode === "hidden" &&
                  !d.alternate &&
                  !Ye)
              )
                return (lt(t), null);
            } else if (
              2 * pt() - i.renderingStartTime > Ho &&
              a !== 536870912
            ) {
              ((t.flags |= 128), (u = !0), ei(i, !1), (t.lanes = 4194304));
            }
          i.isBackwards
            ? ((d.sibling = t.child), (t.child = d))
            : ((e = i.last),
              e !== null ? (e.sibling = d) : (t.child = d),
              (i.last = d));
        }
        return i.tail !== null
          ? ((e = i.tail),
            (i.rendering = e),
            (i.tail = e.sibling),
            (i.renderingStartTime = pt()),
            (e.sibling = null),
            (a = vt.current),
            J(vt, u ? (a & 1) | 2 : a & 1),
            Ye && Jn(t, i.treeForkCount),
            e)
          : (lt(t), null);
      case 22:
      case 23:
        return (
          on(t),
          Yu(),
          (i = t.memoizedState !== null),
          e !== null
            ? (e.memoizedState !== null) !== i && (t.flags |= 8192)
            : i && (t.flags |= 8192),
          i
            ? (a & 536870912) !== 0 &&
              (t.flags & 128) === 0 &&
              (lt(t), t.subtreeFlags & 6 && (t.flags |= 8192))
            : lt(t),
          (a = t.updateQueue),
          a !== null && Mo(t, a.retryQueue),
          (a = null),
          e !== null &&
            e.memoizedState !== null &&
            e.memoizedState.cachePool !== null &&
            (a = e.memoizedState.cachePool.pool),
          (i = null),
          t.memoizedState !== null &&
            t.memoizedState.cachePool !== null &&
            (i = t.memoizedState.cachePool.pool),
          i !== a && (t.flags |= 2048),
          e !== null && H(sr),
          null
        );
      case 24:
        return (
          (a = null),
          e !== null && (a = e.memoizedState.cache),
          t.memoizedState.cache !== a && (t.flags |= 2048),
          Wn(xt),
          lt(t),
          null
        );
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(o(156, t.tag));
  }
  function a1(e, t) {
    switch ((Cu(t), t.tag)) {
      case 1:
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 3:
        return (
          Wn(xt),
          Pe(),
          (e = t.flags),
          (e & 65536) !== 0 && (e & 128) === 0
            ? ((t.flags = (e & -65537) | 128), t)
            : null
        );
      case 26:
      case 27:
      case 5:
        return (qt(t), null);
      case 31:
        if (t.memoizedState !== null) {
          if ((on(t), t.alternate === null)) throw Error(o(340));
          lr();
        }
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 13:
        if (
          (on(t), (e = t.memoizedState), e !== null && e.dehydrated !== null)
        ) {
          if (t.alternate === null) throw Error(o(340));
          lr();
        }
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 19:
        return (H(vt), null);
      case 4:
        return (Pe(), null);
      case 10:
        return (Wn(t.type), null);
      case 22:
      case 23:
        return (
          on(t),
          Yu(),
          e !== null && H(sr),
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 24:
        return (Wn(xt), null);
      case 25:
        return null;
      default:
        return null;
    }
  }
  function qm(e, t) {
    switch ((Cu(t), t.tag)) {
      case 3:
        Wn(xt);
        Pe();
        break;
      case 26:
      case 27:
      case 5:
        qt(t);
        break;
      case 4:
        Pe();
        break;
      case 31:
        if (t.memoizedState !== null) {
          on(t);
        }
        break;
      case 13:
        on(t);
        break;
      case 19:
        H(vt);
        break;
      case 10:
        Wn(t.type);
        break;
      case 22:
      case 23:
        on(t);
        Yu();
        if (e !== null) {
          H(sr);
        }
        break;
      case 24:
        Wn(xt);
    }
  }
  function ti(e, t) {
    try {
      var a = t.updateQueue,
        i = a !== null ? a.lastEffect : null;
      if (i !== null) {
        var u = i.next;
        a = u;
        do {
          if ((a.tag & e) === e) {
            i = void 0;
            var d = a.create,
              p = a.inst;
            i = d();
            p.destroy = i;
          }
          a = a.next;
        } while (a !== u);
      }
    } catch (b) {
      Je(t, t.return, b);
    }
  }
  function Ta(e, t, a) {
    try {
      var i = t.updateQueue,
        u = i !== null ? i.lastEffect : null;
      if (u !== null) {
        var d = u.next;
        i = d;
        do {
          if ((i.tag & e) === e) {
            var p = i.inst,
              b = p.destroy;
            if (b !== void 0) {
              p.destroy = void 0;
              u = t;
              var C = a,
                q = b;
              try {
                q();
              } catch (Q) {
                Je(u, C, Q);
              }
            }
          }
          i = i.next;
        } while (i !== d);
      }
    } catch (Q) {
      Je(t, t.return, Q);
    }
  }
  function Vm(e) {
    var t = e.updateQueue;
    if (t !== null) {
      var a = e.stateNode;
      try {
        Nh(t, a);
      } catch (i) {
        Je(e, e.return, i);
      }
    }
  }
  function Ym(e, t, a) {
    a.props = hr(e.type, e.memoizedProps);
    a.state = e.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (i) {
      Je(e, t, i);
    }
  }
  function ni(e, t) {
    try {
      var a = e.ref;
      if (a !== null) {
        switch (e.tag) {
          case 26:
          case 27:
          case 5:
            var i = e.stateNode;
            break;
          case 30:
            i = e.stateNode;
            break;
          default:
            i = e.stateNode;
        }
        typeof a == "function" ? (e.refCleanup = a(i)) : (a.current = i);
      }
    } catch (u) {
      Je(e, t, u);
    }
  }
  function Bn(e, t) {
    var a = e.ref,
      i = e.refCleanup;
    if (a !== null)
      if (typeof i == "function")
        try {
          i();
        } catch (u) {
          Je(e, t, u);
        } finally {
          e.refCleanup = null;
          e = e.alternate;
          if (e != null) {
            e.refCleanup = null;
          }
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (u) {
          Je(e, t, u);
        }
      else a.current = null;
  }
  function Gm(props) {
    var t = props.type,
      a = props.memoizedProps,
      i = props.stateNode;
    try {
      e: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          if (a.autoFocus) {
            i.focus();
          }
          break e;
        case "img":
          a.src ? (i.src = a.src) : a.srcSet && (i.srcset = a.srcSet);
      }
    } catch (u) {
      Je(props, props.return, u);
    }
  }
  function Ec(e, t, a) {
    try {
      var i = e.stateNode;
      _1(i, e.type, a, t);
      i[ge] = t;
    } catch (u) {
      Je(e, e.return, u);
    }
  }
  function Fm(props) {
    return (
      props.tag === 5 ||
      props.tag === 3 ||
      props.tag === 26 ||
      (props.tag === 27 && Ma(props.type)) ||
      props.tag === 4
    );
  }
  function xc(props) {
    e: for (;;) {
      for (; props.sibling === null; ) {
        if (props.return === null || Fm(props.return)) return null;
        props = props.return;
      }
      for (
        props.sibling.return = props.return, props = props.sibling;
        props.tag !== 5 && props.tag !== 6 && props.tag !== 18;
      ) {
        if (
          (props.tag === 27 && Ma(props.type)) ||
          props.flags & 2 ||
          props.child === null ||
          props.tag === 4
        )
          continue e;
        props.child.return = props;
        props = props.child;
      }
      if (!(props.flags & 2)) return props.stateNode;
    }
  }
  function wc(e, t, a) {
    var i = e.tag;
    if (i === 5 || i === 6) {
      e = e.stateNode;
      t
        ? (a.nodeType === 9
            ? a.body
            : a.nodeName === "HTML"
              ? a.ownerDocument.body
              : a
          ).insertBefore(e, t)
        : ((t =
            a.nodeType === 9
              ? a.body
              : a.nodeName === "HTML"
                ? a.ownerDocument.body
                : a),
          t.appendChild(e),
          (a = a._reactRootContainer),
          a != null || t.onclick !== null || (t.onclick = Qn));
    } else if (
      i !== 4 &&
      (i === 27 && Ma(e.type) && ((a = e.stateNode), (t = null)),
      (e = e.child),
      e !== null)
    )
      for (wc(e, t, a), e = e.sibling; e !== null; ) {
        wc(e, t, a);
        e = e.sibling;
      }
  }
  function zo(e, t, a) {
    var i = e.tag;
    if (i === 5 || i === 6) {
      e = e.stateNode;
      t ? a.insertBefore(e, t) : a.appendChild(e);
    } else if (
      i !== 4 &&
      (i === 27 && Ma(e.type) && (a = e.stateNode), (e = e.child), e !== null)
    )
      for (zo(e, t, a), e = e.sibling; e !== null; ) {
        zo(e, t, a);
        e = e.sibling;
      }
  }
  function Xm(props) {
    var t = props.stateNode,
      a = props.memoizedProps;
    try {
      for (var i = props.type, u = t.attributes; u.length; )
        t.removeAttributeNode(u[0]);
      zt(t, i, a);
      t[fe] = props;
      t[ge] = a;
    } catch (d) {
      Je(props, props.return, d);
    }
  }
  var ra = !1,
    _t = !1,
    Rc = !1,
    Pm = typeof WeakSet == "function" ? WeakSet : Set,
    Ct = null;
  function r1(e, t) {
    if (((e = e.containerInfo), (Fc = ts), (e = lh(e)), yu(e))) {
      if ("selectionStart" in e)
        var a = {
          start: e.selectionStart,
          end: e.selectionEnd,
        };
      else
        e: {
          a = ((a = e.ownerDocument) && a.defaultView) || window;
          var i = a.getSelection && a.getSelection();
          if (i && i.rangeCount !== 0) {
            a = i.anchorNode;
            var u = i.anchorOffset,
              d = i.focusNode;
            i = i.focusOffset;
            try {
              a.nodeType;
              d.nodeType;
            } catch {
              a = null;
              break e;
            }
            var p = 0,
              b = -1,
              C = -1,
              q = 0,
              Q = 0,
              I = e,
              Y = null;
            t: for (;;) {
              for (
                var P;
                I !== a || (u !== 0 && I.nodeType !== 3) || (b = p + u),
                  I !== d || (i !== 0 && I.nodeType !== 3) || (C = p + i),
                  I.nodeType === 3 && (p += I.nodeValue.length),
                  (P = I.firstChild) !== null;
              ) {
                Y = I;
                I = P;
              }
              for (;;) {
                if (I === e) break t;
                if (
                  (Y === a && ++q === u && (b = p),
                  Y === d && ++Q === i && (C = p),
                  (P = I.nextSibling) !== null)
                )
                  break;
                I = Y;
                Y = I.parentNode;
              }
              I = P;
            }
            a =
              b === -1 || C === -1
                ? null
                : {
                    start: b,
                    end: C,
                  };
          } else a = null;
        }
      a = a || {
        start: 0,
        end: 0,
      };
    } else a = null;
    for (
      Xc = {
        focusedElem: e,
        selectionRange: a,
      },
        ts = !1,
        Ct = t;
      Ct !== null;
    )
      if (
        ((t = Ct), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null)
      ) {
        e.return = t;
        Ct = e;
      } else
        for (; Ct !== null; ) {
          switch (((t = Ct), (d = t.alternate), (e = t.flags), t.tag)) {
            case 0:
              if (
                (e & 4) !== 0 &&
                ((e = t.updateQueue),
                (e = e !== null ? e.events : null),
                e !== null)
              )
                for (a = 0; a < e.length; a++) {
                  u = e[a];
                  u.ref.impl = u.nextImpl;
                }
              break;
            case 11:
            case 15:
              break;
            case 1:
              if ((e & 1024) !== 0 && d !== null) {
                e = void 0;
                a = t;
                u = d.memoizedProps;
                d = d.memoizedState;
                i = a.stateNode;
                try {
                  var pe = hr(a.type, u);
                  e = i.getSnapshotBeforeUpdate(pe, d);
                  i.__reactInternalSnapshotBeforeUpdate = e;
                } catch (Te) {
                  Je(a, a.return, Te);
                }
              }
              break;
            case 3:
              if ((e & 1024) !== 0) {
                if (
                  ((e = t.stateNode.containerInfo), (a = e.nodeType), a === 9)
                )
                  Kc(e);
                else if (a === 1)
                  switch (e.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      Kc(e);
                      break;
                    default:
                      e.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if ((e & 1024) !== 0) throw Error(o(163));
          }
          if (((e = t.sibling), e !== null)) {
            e.return = t.return;
            Ct = e;
            break;
          }
          Ct = t.return;
        }
  }
  function Qm(e, t, a) {
    var i = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        ia(e, a);
        if (i & 4) {
          ti(5, a);
        }
        break;
      case 1:
        if ((ia(e, a), i & 4))
          if (((e = a.stateNode), t === null))
            try {
              e.componentDidMount();
            } catch (p) {
              Je(a, a.return, p);
            }
          else {
            var u = hr(a.type, t.memoizedProps);
            t = t.memoizedState;
            try {
              e.componentDidUpdate(u, t, e.__reactInternalSnapshotBeforeUpdate);
            } catch (p) {
              Je(a, a.return, p);
            }
          }
        if (i & 64) {
          Vm(a);
        }
        if (i & 512) {
          ni(a, a.return);
        }
        break;
      case 3:
        if ((ia(e, a), i & 64 && ((e = a.updateQueue), e !== null))) {
          if (((t = null), a.child !== null))
            switch (a.child.tag) {
              case 27:
              case 5:
                t = a.child.stateNode;
                break;
              case 1:
                t = a.child.stateNode;
            }
          try {
            Nh(e, t);
          } catch (p) {
            Je(a, a.return, p);
          }
        }
        break;
      case 27:
        if (t === null && i & 4) {
          Xm(a);
        }
      case 26:
      case 5:
        ia(e, a);
        if (t === null && i & 4) {
          Gm(a);
        }
        if (i & 512) {
          ni(a, a.return);
        }
        break;
      case 12:
        ia(e, a);
        break;
      case 31:
        ia(e, a);
        if (i & 4) {
          Jm(e, a);
        }
        break;
      case 13:
        ia(e, a);
        if (i & 4) {
          Im(e, a);
        }
        if (i & 64) {
          ((e = a.memoizedState),
            e !== null &&
              ((e = e.dehydrated),
              e !== null && ((a = h1.bind(null, a)), M1(e, a))));
        }
        break;
      case 22:
        if (((i = a.memoizedState !== null || ra), !i)) {
          t = (t !== null && t.memoizedState !== null) || _t;
          u = ra;
          var d = _t;
          ra = i;
          (_t = t) && !d ? oa(e, a, (a.subtreeFlags & 8772) !== 0) : ia(e, a);
          ra = u;
          _t = d;
        }
        break;
      case 30:
        break;
      default:
        ia(e, a);
    }
  }
  function Km(e) {
    var t = e.alternate;
    if (t !== null) {
      ((e.alternate = null), Km(t));
    }
    e.child = null;
    e.deletions = null;
    e.sibling = null;
    if (e.tag === 5) {
      ((t = e.stateNode), t !== null && dt(t));
    }
    e.stateNode = null;
    e.return = null;
    e.dependencies = null;
    e.memoizedProps = null;
    e.memoizedState = null;
    e.pendingProps = null;
    e.stateNode = null;
    e.updateQueue = null;
  }
  var st = null,
    Qt = !1;
  function la(e, t, a) {
    for (a = a.child; a !== null; ) {
      Zm(e, t, a);
      a = a.sibling;
    }
  }
  function Zm(e, t, a) {
    if (ut && typeof ut.onCommitFiberUnmount == "function")
      try {
        ut.onCommitFiberUnmount(Xa, a);
      } catch {}
    switch (a.tag) {
      case 26:
        _t || Bn(a, t);
        la(e, t, a);
        a.memoizedState
          ? a.memoizedState.count--
          : a.stateNode && ((a = a.stateNode), a.parentNode.removeChild(a));
        break;
      case 27:
        _t || Bn(a, t);
        var i = st,
          u = Qt;
        if (Ma(a.type)) {
          ((st = a.stateNode), (Qt = !1));
        }
        la(e, t, a);
        fi(a.stateNode);
        st = i;
        Qt = u;
        break;
      case 5:
        _t || Bn(a, t);
      case 6:
        if (
          ((i = st),
          (u = Qt),
          (st = null),
          la(e, t, a),
          (st = i),
          (Qt = u),
          st !== null)
        )
          if (Qt)
            try {
              (st.nodeType === 9
                ? st.body
                : st.nodeName === "HTML"
                  ? st.ownerDocument.body
                  : st
              ).removeChild(a.stateNode);
            } catch (d) {
              Je(a, t, d);
            }
          else
            try {
              st.removeChild(a.stateNode);
            } catch (d) {
              Je(a, t, d);
            }
        break;
      case 18:
        if (st !== null) {
          Qt
            ? ((e = st),
              V0(
                e.nodeType === 9
                  ? e.body
                  : e.nodeName === "HTML"
                    ? e.ownerDocument.body
                    : e,
                a.stateNode,
              ),
              nl(e))
            : V0(st, a.stateNode);
        }
        break;
      case 4:
        i = st;
        u = Qt;
        st = a.stateNode.containerInfo;
        Qt = !0;
        la(e, t, a);
        st = i;
        Qt = u;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Ta(2, a, t);
        _t || Ta(4, a, t);
        la(e, t, a);
        break;
      case 1:
        _t ||
          (Bn(a, t),
          (i = a.stateNode),
          typeof i.componentWillUnmount == "function" && Ym(a, t, i));
        la(e, t, a);
        break;
      case 21:
        la(e, t, a);
        break;
      case 22:
        _t = (i = _t) || a.memoizedState !== null;
        la(e, t, a);
        _t = i;
        break;
      default:
        la(e, t, a);
    }
  }
  function Jm(e, t) {
    if (
      t.memoizedState === null &&
      ((e = t.alternate), e !== null && ((e = e.memoizedState), e !== null))
    ) {
      e = e.dehydrated;
      try {
        nl(e);
      } catch (a) {
        Je(t, t.return, a);
      }
    }
  }
  function Im(e, t) {
    if (
      t.memoizedState === null &&
      ((e = t.alternate),
      e !== null &&
        ((e = e.memoizedState), e !== null && ((e = e.dehydrated), e !== null)))
    )
      try {
        nl(e);
      } catch (a) {
        Je(t, t.return, a);
      }
  }
  function l1(e) {
    switch (e.tag) {
      case 31:
      case 13:
      case 19:
        var t = e.stateNode;
        return (t === null && (t = e.stateNode = new Pm()), t);
      case 22:
        return (
          (e = e.stateNode),
          (t = e._retryCache),
          t === null && (t = e._retryCache = new Pm()),
          t
        );
      default:
        throw Error(o(435, e.tag));
    }
  }
  function ko(e, t) {
    var a = l1(e);
    t.forEach(function (item) {
      if (!a.has(item)) {
        a.add(item);
        var u = m1.bind(null, e, item);
        item.then(u, u);
      }
    });
  }
  function Kt(e, t) {
    var a = t.deletions;
    if (a !== null)
      for (var i = 0; i < a.length; i++) {
        var u = a[i],
          d = e,
          p = t,
          b = p;
        e: for (; b !== null; ) {
          switch (b.tag) {
            case 27:
              if (Ma(b.type)) {
                st = b.stateNode;
                Qt = !1;
                break e;
              }
              break;
            case 5:
              st = b.stateNode;
              Qt = !1;
              break e;
            case 3:
            case 4:
              st = b.stateNode.containerInfo;
              Qt = !0;
              break e;
          }
          b = b.return;
        }
        if (st === null) throw Error(o(160));
        Zm(d, p, u);
        st = null;
        Qt = !1;
        d = u.alternate;
        if (d !== null) {
          d.return = null;
        }
        u.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; ) {
        Wm(t, e);
        t = t.sibling;
      }
  }
  var Mn = null;
  function Wm(e, t) {
    var a = e.alternate,
      i = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        Kt(t, e);
        Zt(e);
        if (i & 4) {
          (Ta(3, e, e.return), ti(3, e), Ta(5, e, e.return));
        }
        break;
      case 1:
        Kt(t, e);
        Zt(e);
        if (i & 512) {
          _t || a === null || Bn(a, a.return);
        }
        if (i & 64 && ra) {
          ((e = e.updateQueue),
            e !== null &&
              ((i = e.callbacks),
              i !== null &&
                ((a = e.shared.hiddenCallbacks),
                (e.shared.hiddenCallbacks = a === null ? i : a.concat(i)))));
        }
        break;
      case 26:
        var u = Mn;
        if (
          (Kt(t, e),
          Zt(e),
          i & 512 && (_t || a === null || Bn(a, a.return)),
          i & 4)
        ) {
          var d = a !== null ? a.memoizedState : null;
          if (((i = e.memoizedState), a === null)) {
            if (i === null) {
              if (e.stateNode === null) {
                e: {
                  i = e.type;
                  a = e.memoizedProps;
                  u = u.ownerDocument || u;
                  t: switch (i) {
                    case "title":
                      d = u.getElementsByTagName("title")[0];
                      if (
                        !d ||
                        d[ct] ||
                        d[fe] ||
                        d.namespaceURI === "http://www.w3.org/2000/svg" ||
                        d.hasAttribute("itemprop")
                      ) {
                        ((d = u.createElement(i)),
                          u.head.insertBefore(
                            d,
                            u.querySelector("head > title"),
                          ));
                      }
                      zt(d, i, a);
                      d[fe] = e;
                      ot(d);
                      i = d;
                      break e;
                    case "link":
                      var p = W0("link", "href", u).get(i + (a.href || ""));
                      if (p) {
                        for (var b = 0; b < p.length; b++)
                          if (
                            ((d = p[b]),
                            d.getAttribute("href") ===
                              (a.href == null || a.href === ""
                                ? null
                                : a.href) &&
                              d.getAttribute("rel") ===
                                (a.rel == null ? null : a.rel) &&
                              d.getAttribute("title") ===
                                (a.title == null ? null : a.title) &&
                              d.getAttribute("crossorigin") ===
                                (a.crossOrigin == null ? null : a.crossOrigin))
                          ) {
                            p.splice(b, 1);
                            break t;
                          }
                      }
                      d = u.createElement(i);
                      zt(d, i, a);
                      u.head.appendChild(d);
                      break;
                    case "meta":
                      if (
                        (p = W0("meta", "content", u).get(
                          i + (a.content || ""),
                        ))
                      ) {
                        for (b = 0; b < p.length; b++)
                          if (
                            ((d = p[b]),
                            d.getAttribute("content") ===
                              (a.content == null ? null : "" + a.content) &&
                              d.getAttribute("name") ===
                                (a.name == null ? null : a.name) &&
                              d.getAttribute("property") ===
                                (a.property == null ? null : a.property) &&
                              d.getAttribute("http-equiv") ===
                                (a.httpEquiv == null ? null : a.httpEquiv) &&
                              d.getAttribute("charset") ===
                                (a.charSet == null ? null : a.charSet))
                          ) {
                            p.splice(b, 1);
                            break t;
                          }
                      }
                      d = u.createElement(i);
                      zt(d, i, a);
                      u.head.appendChild(d);
                      break;
                    default:
                      throw Error(o(468, i));
                  }
                  d[fe] = e;
                  ot(d);
                  i = d;
                }
                e.stateNode = i;
              } else eg(u, e.type, e.stateNode);
            } else e.stateNode = I0(u, i, e.memoizedProps);
          } else
            d !== i
              ? (d === null
                  ? a.stateNode !== null &&
                    ((a = a.stateNode), a.parentNode.removeChild(a))
                  : d.count--,
                i === null
                  ? eg(u, e.type, e.stateNode)
                  : I0(u, i, e.memoizedProps))
              : i === null &&
                e.stateNode !== null &&
                Ec(e, e.memoizedProps, a.memoizedProps);
        }
        break;
      case 27:
        Kt(t, e);
        Zt(e);
        if (i & 512) {
          _t || a === null || Bn(a, a.return);
        }
        if (a !== null && i & 4) {
          Ec(e, e.memoizedProps, a.memoizedProps);
        }
        break;
      case 5:
        if (
          (Kt(t, e),
          Zt(e),
          i & 512 && (_t || a === null || Bn(a, a.return)),
          e.flags & 32)
        ) {
          u = e.stateNode;
          try {
            _r(u, "");
          } catch (pe) {
            Je(e, e.return, pe);
          }
        }
        if (i & 4 && e.stateNode != null) {
          ((u = e.memoizedProps), Ec(e, u, a !== null ? a.memoizedProps : u));
        }
        if (i & 1024) {
          Rc = !0;
        }
        break;
      case 6:
        if ((Kt(t, e), Zt(e), i & 4)) {
          if (e.stateNode === null) throw Error(o(162));
          i = e.memoizedProps;
          a = e.stateNode;
          try {
            a.nodeValue = i;
          } catch (pe) {
            Je(e, e.return, pe);
          }
        }
        break;
      case 3:
        if (
          ((Jo = null),
          (u = Mn),
          (Mn = Ko(t.containerInfo)),
          Kt(t, e),
          (Mn = u),
          Zt(e),
          i & 4 && a !== null && a.memoizedState.isDehydrated)
        )
          try {
            nl(t.containerInfo);
          } catch (pe) {
            Je(e, e.return, pe);
          }
        if (Rc) {
          ((Rc = !1), e0(e));
        }
        break;
      case 4:
        i = Mn;
        Mn = Ko(e.stateNode.containerInfo);
        Kt(t, e);
        Zt(e);
        Mn = i;
        break;
      case 12:
        Kt(t, e);
        Zt(e);
        break;
      case 31:
        Kt(t, e);
        Zt(e);
        if (i & 4) {
          ((i = e.updateQueue),
            i !== null && ((e.updateQueue = null), ko(e, i)));
        }
        break;
      case 13:
        Kt(t, e);
        Zt(e);
        if (
          e.child.flags & 8192 &&
          (e.memoizedState !== null) != (a !== null && a.memoizedState !== null)
        ) {
          Uo = pt();
        }
        if (i & 4) {
          ((i = e.updateQueue),
            i !== null && ((e.updateQueue = null), ko(e, i)));
        }
        break;
      case 22:
        u = e.memoizedState !== null;
        var C = a !== null && a.memoizedState !== null,
          q = ra,
          Q = _t;
        if (
          ((ra = q || u),
          (_t = Q || C),
          Kt(t, e),
          (_t = Q),
          (ra = q),
          Zt(e),
          i & 8192)
        )
          e: for (
            t = e.stateNode,
              t._visibility = u ? t._visibility & -2 : t._visibility | 1,
              u && (a === null || C || ra || _t || mr(e)),
              a = null,
              t = e;
            ;
          ) {
            if (t.tag === 5 || t.tag === 26) {
              if (a === null) {
                C = a = t;
                try {
                  if (((d = C.stateNode), u)) {
                    p = d.style;
                    typeof p.setProperty == "function"
                      ? p.setProperty("display", "none", "important")
                      : (p.display = "none");
                  } else {
                    b = C.stateNode;
                    var I = C.memoizedProps.style,
                      Y =
                        I != null && I.hasOwnProperty("display")
                          ? I.display
                          : null;
                    b.style.display =
                      Y == null || typeof Y == "boolean" ? "" : ("" + Y).trim();
                  }
                } catch (pe) {
                  Je(C, C.return, pe);
                }
              }
            } else if (t.tag === 6) {
              if (a === null) {
                C = t;
                try {
                  C.stateNode.nodeValue = u ? "" : C.memoizedProps;
                } catch (pe) {
                  Je(C, C.return, pe);
                }
              }
            } else if (t.tag === 18) {
              if (a === null) {
                C = t;
                try {
                  var P = C.stateNode;
                  u ? Y0(P, !0) : Y0(C.stateNode, !1);
                } catch (pe) {
                  Je(C, C.return, pe);
                }
              }
            } else if (
              ((t.tag !== 22 && t.tag !== 23) ||
                t.memoizedState === null ||
                t === e) &&
              t.child !== null
            ) {
              t.child.return = t;
              t = t.child;
              continue;
            }
            if (t === e) break e;
            for (; t.sibling === null; ) {
              if (t.return === null || t.return === e) break e;
              if (a === t) {
                a = null;
              }
              t = t.return;
            }
            if (a === t) {
              a = null;
            }
            t.sibling.return = t.return;
            t = t.sibling;
          }
        if (i & 4) {
          ((i = e.updateQueue),
            i !== null &&
              ((a = i.retryQueue),
              a !== null && ((i.retryQueue = null), ko(e, a))));
        }
        break;
      case 19:
        Kt(t, e);
        Zt(e);
        if (i & 4) {
          ((i = e.updateQueue),
            i !== null && ((e.updateQueue = null), ko(e, i)));
        }
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        Kt(t, e);
        Zt(e);
    }
  }
  function Zt(e) {
    var t = e.flags;
    if (t & 2) {
      try {
        for (var a, i = e.return; i !== null; ) {
          if (Fm(i)) {
            a = i;
            break;
          }
          i = i.return;
        }
        if (a == null) throw Error(o(160));
        switch (a.tag) {
          case 27:
            var u = a.stateNode,
              d = xc(e);
            zo(e, d, u);
            break;
          case 5:
            var p = a.stateNode;
            if (a.flags & 32) {
              (_r(p, ""), (a.flags &= -33));
            }
            var b = xc(e);
            zo(e, b, p);
            break;
          case 3:
          case 4:
            var C = a.stateNode.containerInfo,
              q = xc(e);
            wc(e, q, C);
            break;
          default:
            throw Error(o(161));
        }
      } catch (Q) {
        Je(e, e.return, Q);
      }
      e.flags &= -3;
    }
    if (t & 4096) {
      e.flags &= -4097;
    }
  }
  function e0(e) {
    if (e.subtreeFlags & 1024)
      for (e = e.child; e !== null; ) {
        var t = e;
        e0(t);
        if (t.tag === 5 && t.flags & 1024) {
          t.stateNode.reset();
        }
        e = e.sibling;
      }
  }
  function ia(e, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; ) {
        Qm(e, t.alternate, t);
        t = t.sibling;
      }
  }
  function mr(e) {
    for (e = e.child; e !== null; ) {
      var t = e;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Ta(4, t, t.return);
          mr(t);
          break;
        case 1:
          Bn(t, t.return);
          var a = t.stateNode;
          if (typeof a.componentWillUnmount == "function") {
            Ym(t, t.return, a);
          }
          mr(t);
          break;
        case 27:
          fi(t.stateNode);
        case 26:
        case 5:
          Bn(t, t.return);
          mr(t);
          break;
        case 22:
          if (t.memoizedState === null) {
            mr(t);
          }
          break;
        case 30:
          mr(t);
          break;
        default:
          mr(t);
      }
      e = e.sibling;
    }
  }
  function oa(e, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var i = t.alternate,
        u = e,
        d = t,
        p = d.flags;
      switch (d.tag) {
        case 0:
        case 11:
        case 15:
          oa(u, d, a);
          ti(4, d);
          break;
        case 1:
          if (
            (oa(u, d, a),
            (i = d),
            (u = i.stateNode),
            typeof u.componentDidMount == "function")
          )
            try {
              u.componentDidMount();
            } catch (q) {
              Je(i, i.return, q);
            }
          if (((i = d), (u = i.updateQueue), u !== null)) {
            var b = i.stateNode;
            try {
              var C = u.shared.hiddenCallbacks;
              if (C !== null)
                for (u.shared.hiddenCallbacks = null, u = 0; u < C.length; u++)
                  Lh(C[u], b);
            } catch (q) {
              Je(i, i.return, q);
            }
          }
          if (a && p & 64) {
            Vm(d);
          }
          ni(d, d.return);
          break;
        case 27:
          Xm(d);
        case 26:
        case 5:
          oa(u, d, a);
          if (a && i === null && p & 4) {
            Gm(d);
          }
          ni(d, d.return);
          break;
        case 12:
          oa(u, d, a);
          break;
        case 31:
          oa(u, d, a);
          if (a && p & 4) {
            Jm(u, d);
          }
          break;
        case 13:
          oa(u, d, a);
          if (a && p & 4) {
            Im(u, d);
          }
          break;
        case 22:
          if (d.memoizedState === null) {
            oa(u, d, a);
          }
          ni(d, d.return);
          break;
        case 30:
          break;
        default:
          oa(u, d, a);
      }
      t = t.sibling;
    }
  }
  function _c(e, t) {
    var a = null;
    if (
      e !== null &&
      e.memoizedState !== null &&
      e.memoizedState.cachePool !== null
    ) {
      a = e.memoizedState.cachePool.pool;
    }
    e = null;
    if (t.memoizedState !== null && t.memoizedState.cachePool !== null) {
      e = t.memoizedState.cachePool.pool;
    }
    if (e !== a) {
      (e != null && e.refCount++, a != null && Vl(a));
    }
  }
  function Tc(e, t) {
    e = null;
    if (t.alternate !== null) {
      e = t.alternate.memoizedState.cache;
    }
    t = t.memoizedState.cache;
    if (t !== e) {
      (t.refCount++, e != null && Vl(e));
    }
  }
  function zn(e, t, a, i) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        t0(e, t, a, i);
        t = t.sibling;
      }
  }
  function t0(e, t, a, i) {
    var u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        zn(e, t, a, i);
        if (u & 2048) {
          ti(9, t);
        }
        break;
      case 1:
        zn(e, t, a, i);
        break;
      case 3:
        zn(e, t, a, i);
        if (u & 2048) {
          ((e = null),
            t.alternate !== null && (e = t.alternate.memoizedState.cache),
            (t = t.memoizedState.cache),
            t !== e && (t.refCount++, e != null && Vl(e)));
        }
        break;
      case 12:
        if (u & 2048) {
          zn(e, t, a, i);
          e = t.stateNode;
          try {
            var d = t.memoizedProps,
              p = d.id,
              b = d.onPostCommit;
            if (typeof b == "function") {
              b(
                p,
                t.alternate === null ? "mount" : "update",
                e.passiveEffectDuration,
                -0,
              );
            }
          } catch (C) {
            Je(t, t.return, C);
          }
        } else zn(e, t, a, i);
        break;
      case 31:
        zn(e, t, a, i);
        break;
      case 13:
        zn(e, t, a, i);
        break;
      case 23:
        break;
      case 22:
        d = t.stateNode;
        p = t.alternate;
        t.memoizedState !== null
          ? d._visibility & 2
            ? zn(e, t, a, i)
            : ai(e, t)
          : d._visibility & 2
            ? zn(e, t, a, i)
            : ((d._visibility |= 2),
              Fr(e, t, a, i, (t.subtreeFlags & 10256) !== 0 || !1));
        if (u & 2048) {
          _c(p, t);
        }
        break;
      case 24:
        zn(e, t, a, i);
        if (u & 2048) {
          Tc(t.alternate, t);
        }
        break;
      default:
        zn(e, t, a, i);
    }
  }
  function Fr(e, t, a, i, u) {
    for (
      u = u && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child;
      t !== null;
    ) {
      var d = e,
        p = t,
        b = a,
        C = i,
        q = p.flags;
      switch (p.tag) {
        case 0:
        case 11:
        case 15:
          Fr(d, p, b, C, u);
          ti(8, p);
          break;
        case 23:
          break;
        case 22:
          var Q = p.stateNode;
          p.memoizedState !== null
            ? Q._visibility & 2
              ? Fr(d, p, b, C, u)
              : ai(d, p)
            : ((Q._visibility |= 2), Fr(d, p, b, C, u));
          if (u && q & 2048) {
            _c(p.alternate, p);
          }
          break;
        case 24:
          Fr(d, p, b, C, u);
          if (u && q & 2048) {
            Tc(p.alternate, p);
          }
          break;
        default:
          Fr(d, p, b, C, u);
      }
      t = t.sibling;
    }
  }
  function ai(e, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = e,
          i = t,
          u = i.flags;
        switch (i.tag) {
          case 22:
            ai(a, i);
            if (u & 2048) {
              _c(i.alternate, i);
            }
            break;
          case 24:
            ai(a, i);
            if (u & 2048) {
              Tc(i.alternate, i);
            }
            break;
          default:
            ai(a, i);
        }
        t = t.sibling;
      }
  }
  var ri = 8192;
  function Xr(e, t, a) {
    if (e.subtreeFlags & ri)
      for (e = e.child; e !== null; ) {
        n0(e, t, a);
        e = e.sibling;
      }
  }
  function n0(e, t, a) {
    switch (e.tag) {
      case 26:
        Xr(e, t, a);
        if (e.flags & ri && e.memoizedState !== null) {
          F1(a, Mn, e.memoizedState, e.memoizedProps);
        }
        break;
      case 5:
        Xr(e, t, a);
        break;
      case 3:
      case 4:
        var i = Mn;
        Mn = Ko(e.stateNode.containerInfo);
        Xr(e, t, a);
        Mn = i;
        break;
      case 22:
        if (e.memoizedState === null) {
          ((i = e.alternate),
            i !== null && i.memoizedState !== null
              ? ((i = ri), (ri = 16777216), Xr(e, t, a), (ri = i))
              : Xr(e, t, a));
        }
        break;
      default:
        Xr(e, t, a);
    }
  }
  function a0(e) {
    var t = e.alternate;
    if (t !== null && ((e = t.child), e !== null)) {
      t.child = null;
      do {
        t = e.sibling;
        e.sibling = null;
        e = t;
      } while (e !== null);
    }
  }
  function li(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var i = t[a];
          Ct = i;
          l0(i, e);
        }
      a0(e);
    }
    if (e.subtreeFlags & 10256)
      for (e = e.child; e !== null; ) {
        r0(e);
        e = e.sibling;
      }
  }
  function r0(e) {
    switch (e.tag) {
      case 0:
      case 11:
      case 15:
        li(e);
        if (e.flags & 2048) {
          Ta(9, e, e.return);
        }
        break;
      case 3:
        li(e);
        break;
      case 12:
        li(e);
        break;
      case 22:
        var t = e.stateNode;
        e.memoizedState !== null &&
        t._visibility & 2 &&
        (e.return === null || e.return.tag !== 13)
          ? ((t._visibility &= -3), jo(e))
          : li(e);
        break;
      default:
        li(e);
    }
  }
  function jo(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var i = t[a];
          Ct = i;
          l0(i, e);
        }
      a0(e);
    }
    for (e = e.child; e !== null; ) {
      switch (((t = e), t.tag)) {
        case 0:
        case 11:
        case 15:
          Ta(8, t, t.return);
          jo(t);
          break;
        case 22:
          a = t.stateNode;
          if (a._visibility & 2) {
            ((a._visibility &= -3), jo(t));
          }
          break;
        default:
          jo(t);
      }
      e = e.sibling;
    }
  }
  function l0(e, t) {
    for (; Ct !== null; ) {
      var a = Ct;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          Ta(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var i = a.memoizedState.cachePool.pool;
            if (i != null) {
              i.refCount++;
            }
          }
          break;
        case 24:
          Vl(a.memoizedState.cache);
      }
      if (((i = a.child), i !== null)) {
        i.return = a;
        Ct = i;
      } else
        e: for (a = e; Ct !== null; ) {
          i = Ct;
          var u = i.sibling,
            d = i.return;
          if ((Km(i), i === a)) {
            Ct = null;
            break e;
          }
          if (u !== null) {
            u.return = d;
            Ct = u;
            break e;
          }
          Ct = d;
        }
    }
  }
  var i1 = {
      getCacheForType: function (e) {
        var t = Nt(xt),
          a = t.data.get(e);
        return (a === void 0 && ((a = e()), t.data.set(e, a)), a);
      },
      cacheSignal: function () {
        return Nt(xt).controller.signal;
      },
    },
    o1 = typeof WeakMap == "function" ? WeakMap : Map,
    Qe = 0,
    nt = null,
    ke = null,
    Ue = 0,
    Ze = 0,
    sn = null,
    Oa = !1,
    Pr = !1,
    Oc = !1,
    sa = 0,
    gt = 0,
    Ca = 0,
    gr = 0,
    Cc = 0,
    un = 0,
    Qr = 0,
    ii = null,
    Jt = null,
    Ac = !1,
    Uo = 0,
    i0 = 0,
    Ho = 1 / 0,
    Bo = null,
    Aa = null,
    Tt = 0,
    Da = null,
    Kr = null,
    ua = 0,
    Dc = 0,
    Lc = null,
    o0 = null,
    oi = 0,
    Nc = null;
  function cn() {
    if ((Qe & 2) !== 0 && Ue !== 0) {
      return Ue & -Ue;
    }
    if (T.T !== null) {
      return Hc();
    }
    return se();
  }
  function s0() {
    if (un === 0)
      if ((Ue & 536870912) === 0 || Ye) {
        var e = Pa;
        Pa <<= 1;
        if ((Pa & 3932160) === 0) {
          Pa = 262144;
        }
        un = e;
      } else un = 536870912;
    return ((e = ln.current), e !== null && (e.flags |= 32), un);
  }
  function It(e, t, a) {
    if (
      (e === nt && (Ze === 2 || Ze === 9)) ||
      e.cancelPendingCommit !== null
    ) {
      (Zr(e, 0), La(e, Ue, un, !1));
    }
    ga(e, a);
    if ((Qe & 2) === 0 || e !== nt) {
      (e === nt && ((Qe & 2) === 0 && (gr |= a), gt === 4 && La(e, Ue, un, !1)),
        $n(e));
    }
  }
  function u0(e, t, a) {
    if ((Qe & 6) !== 0) throw Error(o(327));
    var i = (!a && (t & 127) === 0 && (t & e.expiredLanes) === 0) || Ka(e, t),
      u = i ? c1(e, t) : zc(e, t, !0),
      d = i;
    do {
      if (u === 0) {
        if (Pr && !i) {
          La(e, t, 0, !1);
        }
        break;
      } else {
        if (((a = e.current.alternate), d && !s1(a))) {
          u = zc(e, t, !1);
          d = !1;
          continue;
        }
        if (u === 2) {
          if (((d = t), e.errorRecoveryDisabledLanes & d)) var p = 0;
          else {
            p = e.pendingLanes & -536870913;
            p = p !== 0 ? p : p & 536870912 ? 536870912 : 0;
          }
          if (p !== 0) {
            t = p;
            e: {
              var b = e;
              u = ii;
              var C = b.current.memoizedState.isDehydrated;
              if ((C && (Zr(b, p).flags |= 256), (p = zc(b, p, !1)), p !== 2)) {
                if (Oc && !C) {
                  b.errorRecoveryDisabledLanes |= d;
                  gr |= d;
                  u = 4;
                  break e;
                }
                d = Jt;
                Jt = u;
                if (d !== null) {
                  Jt === null ? (Jt = d) : Jt.push.apply(Jt, d);
                }
              }
              u = p;
            }
            if (((d = !1), u !== 2)) continue;
          }
        }
        if (u === 1) {
          Zr(e, 0);
          La(e, t, 0, !0);
          break;
        }
        e: {
          switch (((i = e), (d = u), d)) {
            case 0:
            case 1:
              throw Error(o(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              La(i, t, un, !Oa);
              break e;
            case 2:
              Jt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(o(329));
          }
          if ((t & 62914560) === t && ((u = Uo + 300 - pt()), 10 < u)) {
            if ((La(i, t, un, !Oa), Qa(i, 0, !0) !== 0)) break e;
            ua = t;
            i.timeoutHandle = $0(
              c0.bind(
                null,
                i,
                a,
                Jt,
                Bo,
                Ac,
                t,
                un,
                gr,
                Qr,
                Oa,
                d,
                "Throttled",
                -0,
                0,
              ),
              u,
            );
            break e;
          }
          c0(i, a, Jt, Bo, Ac, t, un, gr, Qr, Oa, d, null, -0, 0);
        }
      }
      break;
    } while (!0);
    $n(e);
  }
  function c0(e, t, a, i, u, d, p, b, C, q, Q, I, Y, P) {
    if (
      ((e.timeoutHandle = -1),
      (I = t.subtreeFlags),
      I & 8192 || (I & 16785408) === 16785408)
    ) {
      I = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: Qn,
      };
      n0(t, d, I);
      var pe =
        (d & 62914560) === d ? Uo - pt() : (d & 4194048) === d ? i0 - pt() : 0;
      if (((pe = X1(I, pe)), pe !== null)) {
        ua = d;
        e.cancelPendingCommit = pe(
          v0.bind(null, e, t, d, a, i, u, p, b, C, Q, I, null, Y, P),
        );
        La(e, d, p, !q);
        return;
      }
    }
    v0(e, t, d, a, i, u, p, b, C);
  }
  function s1(e) {
    for (var t = e; ; ) {
      var a = t.tag;
      if (
        (a === 0 || a === 11 || a === 15) &&
        t.flags & 16384 &&
        ((a = t.updateQueue), a !== null && ((a = a.stores), a !== null))
      )
        for (var i = 0; i < a.length; i++) {
          var u = a[i],
            d = u.getSnapshot;
          u = u.value;
          try {
            if (!an(d(), u)) return !1;
          } catch {
            return !1;
          }
        }
      if (((a = t.child), t.subtreeFlags & 16384 && a !== null)) {
        a.return = t;
        t = a;
      } else {
        if (t === e) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === e) return !0;
          t = t.return;
        }
        t.sibling.return = t.return;
        t = t.sibling;
      }
    }
    return !0;
  }
  function La(e, t, a, i) {
    t &= ~Cc;
    t &= ~gr;
    e.suspendedLanes |= t;
    e.pingedLanes &= ~t;
    if (i) {
      e.warmLanes |= t;
    }
    i = e.expirationTimes;
    for (var u = t; 0 < u; ) {
      var d = 31 - jt(u),
        p = 1 << d;
      i[d] = -1;
      u &= ~p;
    }
    if (a !== 0) {
      Ki(e, a, t);
    }
  }
  function $o() {
    return (Qe & 6) === 0 ? (si(0), !1) : !0;
  }
  function Mc() {
    if (ke !== null) {
      if (Ze === 0) var e = ke.return;
      else {
        e = ke;
        In = ir = null;
        Ku(e);
        $r = null;
        Gl = 0;
        e = ke;
      }
      for (; e !== null; ) {
        qm(e.alternate, e);
        e = e.return;
      }
      ke = null;
    }
  }
  function Zr(e, t) {
    var a = e.timeoutHandle;
    if (a !== -1) {
      ((e.timeoutHandle = -1), C1(a));
    }
    a = e.cancelPendingCommit;
    if (a !== null) {
      ((e.cancelPendingCommit = null), a());
    }
    ua = 0;
    Mc();
    nt = e;
    ke = a = Zn(e.current, null);
    Ue = t;
    Ze = 0;
    sn = null;
    Oa = !1;
    Pr = Ka(e, t);
    Oc = !1;
    Qr = un = Cc = gr = Ca = gt = 0;
    Jt = ii = null;
    Ac = !1;
    if ((t & 8) !== 0) {
      t |= t & 32;
    }
    var i = e.entangledLanes;
    if (i !== 0)
      for (e = e.entanglements, i &= t; 0 < i; ) {
        var u = 31 - jt(i),
          d = 1 << u;
        t |= e[u];
        i &= ~d;
      }
    return ((sa = t), io(), a);
  }
  function f0(e, t) {
    De = null;
    T.H = Il;
    t === Br || t === go
      ? ((t = Oh()), (Ze = 3))
      : t === Uu
        ? ((t = Oh()), (Ze = 4))
        : (Ze =
            t === fc
              ? 8
              : t !== null &&
                  typeof t == "object" &&
                  typeof t.then == "function"
                ? 6
                : 1);
    sn = t;
    if (ke === null) {
      ((gt = 1), Ao(e, pn(t, e.current)));
    }
  }
  function d0() {
    var e = ln.current;
    if (e === null) {
      return !0;
    }
    if ((Ue & 4194048) === Ue) {
      return Sn === null;
    }
    if ((Ue & 62914560) === Ue || (Ue & 536870912) !== 0) {
      return e === Sn;
    }
    return !1;
  }
  function h0() {
    var e = T.H;
    return ((T.H = Il), e === null ? Il : e);
  }
  function m0() {
    var e = T.A;
    return ((T.A = i1), e);
  }
  function qo() {
    gt = 4;
    Oa || ((Ue & 4194048) !== Ue && ln.current !== null) || (Pr = !0);
    ((Ca & 134217727) === 0 && (gr & 134217727) === 0) ||
      nt === null ||
      La(nt, Ue, un, !1);
  }
  function zc(e, t, a) {
    var i = Qe;
    Qe |= 2;
    var u = h0(),
      d = m0();
    if (nt !== e || Ue !== t) {
      ((Bo = null), Zr(e, t));
    }
    t = !1;
    var p = gt;
    e: do
      try {
        if (Ze !== 0 && ke !== null) {
          var b = ke,
            C = sn;
          switch (Ze) {
            case 8:
              Mc();
              p = 6;
              break e;
            case 3:
            case 2:
            case 9:
            case 6:
              if (ln.current === null) {
                t = !0;
              }
              var q = Ze;
              if (((Ze = 0), (sn = null), Jr(e, b, C, q), a && Pr)) {
                p = 0;
                break e;
              }
              break;
            default:
              q = Ze;
              Ze = 0;
              sn = null;
              Jr(e, b, C, q);
          }
        }
        u1();
        p = gt;
        break;
      } catch (Q) {
        f0(e, Q);
      }
    while (!0);
    return (
      t && e.shellSuspendCounter++,
      (In = ir = null),
      (Qe = i),
      (T.H = u),
      (T.A = d),
      ke === null && ((nt = null), (Ue = 0), io()),
      p
    );
  }
  function u1() {
    for (; ke !== null; ) g0(ke);
  }
  function c1(e, t) {
    var a = Qe;
    Qe |= 2;
    var i = h0(),
      u = m0();
    nt !== e || Ue !== t
      ? ((Bo = null), (Ho = pt() + 500), Zr(e, t))
      : (Pr = Ka(e, t));
    e: do
      try {
        if (Ze !== 0 && ke !== null) {
          t = ke;
          var d = sn;
          t: switch (Ze) {
            case 1:
              Ze = 0;
              sn = null;
              Jr(e, t, d, 1);
              break;
            case 2:
            case 9:
              if (_h(d)) {
                Ze = 0;
                sn = null;
                p0(t);
                break;
              }
              t = function () {
                (Ze !== 2 && Ze !== 9) || nt !== e || (Ze = 7);
                $n(e);
              };
              d.then(t, t);
              break e;
            case 3:
              Ze = 7;
              break e;
            case 4:
              Ze = 5;
              break e;
            case 7:
              _h(d)
                ? ((Ze = 0), (sn = null), p0(t))
                : ((Ze = 0), (sn = null), Jr(e, t, d, 7));
              break;
            case 5:
              var p = null;
              switch (ke.tag) {
                case 26:
                  p = ke.memoizedState;
                case 5:
                case 27:
                  var b = ke;
                  if (p ? tg(p) : b.stateNode.complete) {
                    Ze = 0;
                    sn = null;
                    var C = b.sibling;
                    if (C !== null) ke = C;
                    else {
                      var q = b.return;
                      q !== null ? ((ke = q), Vo(q)) : (ke = null);
                    }
                    break t;
                  }
              }
              Ze = 0;
              sn = null;
              Jr(e, t, d, 5);
              break;
            case 6:
              Ze = 0;
              sn = null;
              Jr(e, t, d, 6);
              break;
            case 8:
              Mc();
              gt = 6;
              break e;
            default:
              throw Error(o(462));
          }
        }
        f1();
        break;
      } catch (Q) {
        f0(e, Q);
      }
    while (!0);
    return (
      (In = ir = null),
      (T.H = i),
      (T.A = u),
      (Qe = a),
      ke !== null ? 0 : ((nt = null), (Ue = 0), io(), gt)
    );
  }
  function f1() {
    for (; ke !== null && !Js(); ) g0(ke);
  }
  function g0(e) {
    var t = Bm(e.alternate, e, sa);
    e.memoizedProps = e.pendingProps;
    t === null ? Vo(e) : (ke = t);
  }
  function p0(e) {
    var t = e,
      a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = Mm(a, t, t.pendingProps, t.type, void 0, Ue);
        break;
      case 11:
        t = Mm(a, t, t.pendingProps, t.type.render, t.ref, Ue);
        break;
      case 5:
        Ku(t);
      default:
        qm(a, t);
        t = ke = mh(t, sa);
        t = Bm(a, t, sa);
    }
    e.memoizedProps = e.pendingProps;
    t === null ? Vo(e) : (ke = t);
  }
  function Jr(e, t, a, i) {
    In = ir = null;
    Ku(t);
    $r = null;
    Gl = 0;
    var u = t.return;
    try {
      if (Wb(e, u, t, a, Ue)) {
        gt = 1;
        Ao(e, pn(a, e.current));
        ke = null;
        return;
      }
    } catch (d) {
      if (u !== null) throw ((ke = u), d);
      gt = 1;
      Ao(e, pn(a, e.current));
      ke = null;
      return;
    }
    t.flags & 32768
      ? (Ye || i === 1
          ? (e = !0)
          : Pr || (Ue & 536870912) !== 0
            ? (e = !1)
            : ((Oa = e = !0),
              (i === 2 || i === 9 || i === 3 || i === 6) &&
                ((i = ln.current),
                i !== null && i.tag === 13 && (i.flags |= 16384))),
        y0(t, e))
      : Vo(t);
  }
  function Vo(e) {
    var t = e;
    do {
      if ((t.flags & 32768) !== 0) {
        y0(t, Oa);
        return;
      }
      e = t.return;
      var a = n1(t.alternate, t, sa);
      if (a !== null) {
        ke = a;
        return;
      }
      if (((t = t.sibling), t !== null)) {
        ke = t;
        return;
      }
      ke = t = e;
    } while (t !== null);
    if (gt === 0) {
      gt = 5;
    }
  }
  function y0(e, t) {
    do {
      var a = a1(e.alternate, e);
      if (a !== null) {
        a.flags &= 32767;
        ke = a;
        return;
      }
      if (
        ((a = e.return),
        a !== null &&
          ((a.flags |= 32768), (a.subtreeFlags = 0), (a.deletions = null)),
        !t && ((e = e.sibling), e !== null))
      ) {
        ke = e;
        return;
      }
      ke = e = a;
    } while (e !== null);
    gt = 6;
    ke = null;
  }
  function v0(e, t, a, i, u, d, p, b, C) {
    e.cancelPendingCommit = null;
    do Yo();
    while (Tt !== 0);
    if ((Qe & 6) !== 0) throw Error(o(327));
    if (t !== null) {
      if (t === e.current) throw Error(o(177));
      if (
        ((d = t.lanes | t.childLanes),
        (d |= xu),
        tu(e, a, d, p, b, C),
        e === nt && ((ke = nt = null), (Ue = 0)),
        (Kr = t),
        (Da = e),
        (ua = a),
        (Dc = d),
        (Lc = u),
        (o0 = i),
        (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
          ? ((e.callbackNode = null),
            (e.callbackPriority = 0),
            g1(Ft, function () {
              return (w0(), null);
            }))
          : ((e.callbackNode = null), (e.callbackPriority = 0)),
        (i = (t.flags & 13878) !== 0),
        (t.subtreeFlags & 13878) !== 0 || i)
      ) {
        i = T.T;
        T.T = null;
        u = V.p;
        V.p = 2;
        p = Qe;
        Qe |= 4;
        try {
          r1(e, t, a);
        } finally {
          Qe = p;
          V.p = u;
          T.T = i;
        }
      }
      Tt = 1;
      b0();
      S0();
      E0();
    }
  }
  function b0() {
    if (Tt === 1) {
      Tt = 0;
      var e = Da,
        t = Kr,
        a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        a = T.T;
        T.T = null;
        var i = V.p;
        V.p = 2;
        var u = Qe;
        Qe |= 4;
        try {
          Wm(t, e);
          var d = Xc,
            p = lh(e.containerInfo),
            b = d.focusedElem,
            C = d.selectionRange;
          if (
            p !== b &&
            b &&
            b.ownerDocument &&
            rh(b.ownerDocument.documentElement, b)
          ) {
            if (C !== null && yu(b)) {
              var q = C.start,
                Q = C.end;
              if ((Q === void 0 && (Q = q), "selectionStart" in b)) {
                b.selectionStart = q;
                b.selectionEnd = Math.min(Q, b.value.length);
              } else {
                var I = b.ownerDocument || document,
                  Y = (I && I.defaultView) || window;
                if (Y.getSelection) {
                  var P = Y.getSelection(),
                    pe = b.textContent.length,
                    Te = Math.min(C.start, pe),
                    et = C.end === void 0 ? Te : Math.min(C.end, pe);
                  if (!P.extend && Te > et) {
                    ((p = et), (et = Te), (Te = p));
                  }
                  var k = ah(b, Te),
                    N = ah(b, et);
                  if (
                    k &&
                    N &&
                    (P.rangeCount !== 1 ||
                      P.anchorNode !== k.node ||
                      P.anchorOffset !== k.offset ||
                      P.focusNode !== N.node ||
                      P.focusOffset !== N.offset)
                  ) {
                    var $ = I.createRange();
                    $.setStart(k.node, k.offset);
                    P.removeAllRanges();
                    Te > et
                      ? (P.addRange($), P.extend(N.node, N.offset))
                      : ($.setEnd(N.node, N.offset), P.addRange($));
                  }
                }
              }
            }
            for (I = [], P = b; (P = P.parentNode); )
              if (P.nodeType === 1) {
                I.push({
                  element: P,
                  left: P.scrollLeft,
                  top: P.scrollTop,
                });
              }
            for (
              typeof b.focus == "function" && b.focus(), b = 0;
              b < I.length;
              b++
            ) {
              var K = I[b];
              K.element.scrollLeft = K.left;
              K.element.scrollTop = K.top;
            }
          }
          ts = !!Fc;
          Xc = Fc = null;
        } finally {
          Qe = u;
          V.p = i;
          T.T = a;
        }
      }
      e.current = t;
      Tt = 2;
    }
  }
  function S0() {
    if (Tt === 2) {
      Tt = 0;
      var e = Da,
        t = Kr,
        a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = T.T;
        T.T = null;
        var i = V.p;
        V.p = 2;
        var u = Qe;
        Qe |= 4;
        try {
          Qm(e, t.alternate, t);
        } finally {
          Qe = u;
          V.p = i;
          T.T = a;
        }
      }
      Tt = 3;
    }
  }
  function E0() {
    if (Tt === 4 || Tt === 3) {
      Tt = 0;
      Is();
      var e = Da,
        t = Kr,
        a = ua,
        i = o0;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
        ? (Tt = 5)
        : ((Tt = 0), (Kr = Da = null), x0(e, e.pendingLanes));
      var u = e.pendingLanes;
      if (
        (u === 0 && (Aa = null),
        ae(a),
        (t = t.stateNode),
        ut && typeof ut.onCommitFiberRoot == "function")
      )
        try {
          ut.onCommitFiberRoot(Xa, t, void 0, (t.current.flags & 128) === 128);
        } catch {}
      if (i !== null) {
        t = T.T;
        u = V.p;
        V.p = 2;
        T.T = null;
        try {
          for (var d = e.onRecoverableError, p = 0; p < i.length; p++) {
            var b = i[p];
            d(b.value, {
              componentStack: b.stack,
            });
          }
        } finally {
          T.T = t;
          V.p = u;
        }
      }
      if ((ua & 3) !== 0) {
        Yo();
      }
      $n(e);
      u = e.pendingLanes;
      (a & 261930) !== 0 && (u & 42) !== 0
        ? e === Nc
          ? oi++
          : ((oi = 0), (Nc = e))
        : (oi = 0);
      si(0);
    }
  }
  function x0(e, t) {
    if ((e.pooledCacheLanes &= t) === 0) {
      ((t = e.pooledCache), t != null && ((e.pooledCache = null), Vl(t)));
    }
  }
  function Yo() {
    return (b0(), S0(), E0(), w0());
  }
  function w0() {
    if (Tt !== 5) return !1;
    var e = Da,
      t = Dc;
    Dc = 0;
    var a = ae(ua),
      i = T.T,
      u = V.p;
    try {
      V.p = 32 > a ? 32 : a;
      T.T = null;
      a = Lc;
      Lc = null;
      var d = Da,
        p = ua;
      if (((Tt = 0), (Kr = Da = null), (ua = 0), (Qe & 6) !== 0))
        throw Error(o(331));
      var b = Qe;
      if (
        ((Qe |= 4),
        r0(d.current),
        t0(d, d.current, p, a),
        (Qe = b),
        si(0, !1),
        ut && typeof ut.onPostCommitFiberRoot == "function")
      )
        try {
          ut.onPostCommitFiberRoot(Xa, d);
        } catch {}
      return !0;
    } finally {
      V.p = u;
      T.T = i;
      x0(e, t);
    }
  }
  function R0(e, t, a) {
    t = pn(a, t);
    t = cc(e.stateNode, t, 2);
    e = wa(e, t, 2);
    if (e !== null) {
      (ga(e, 2), $n(e));
    }
  }
  function Je(e, t, a) {
    if (e.tag === 3) R0(e, e, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          R0(t, e, a);
          break;
        } else if (t.tag === 1) {
          var i = t.stateNode;
          if (
            typeof t.type.getDerivedStateFromError == "function" ||
            (typeof i.componentDidCatch == "function" &&
              (Aa === null || !Aa.has(i)))
          ) {
            e = pn(a, e);
            a = _m(2);
            i = wa(t, a, 2);
            if (i !== null) {
              (Tm(a, i, t, e), ga(i, 2), $n(i));
            }
            break;
          }
        }
        t = t.return;
      }
  }
  function kc(e, t, a) {
    var i = e.pingCache;
    if (i === null) {
      i = e.pingCache = new o1();
      var u = new Set();
      i.set(t, u);
    } else {
      u = i.get(t);
      if (u === void 0) {
        ((u = new Set()), i.set(t, u));
      }
    }
    u.has(a) ||
      ((Oc = !0), u.add(a), (e = d1.bind(null, e, t, a)), t.then(e, e));
  }
  function d1(e, t, a) {
    var i = e.pingCache;
    if (i !== null) {
      i.delete(t);
    }
    e.pingedLanes |= e.suspendedLanes & a;
    e.warmLanes &= ~a;
    if (nt === e && (Ue & a) === a) {
      (gt === 4 || (gt === 3 && (Ue & 62914560) === Ue && 300 > pt() - Uo)
        ? (Qe & 2) === 0 && Zr(e, 0)
        : (Cc |= a),
        Qr === Ue && (Qr = 0));
    }
    $n(e);
  }
  function _0(e, t) {
    if (t === 0) {
      t = Za();
    }
    e = ar(e, t);
    if (e !== null) {
      (ga(e, t), $n(e));
    }
  }
  function h1(e) {
    var t = e.memoizedState,
      a = 0;
    if (t !== null) {
      a = t.retryLane;
    }
    _0(e, a);
  }
  function m1(e, t) {
    var a = 0;
    switch (e.tag) {
      case 31:
      case 13:
        var i = e.stateNode,
          u = e.memoizedState;
        if (u !== null) {
          a = u.retryLane;
        }
        break;
      case 19:
        i = e.stateNode;
        break;
      case 22:
        i = e.stateNode._retryCache;
        break;
      default:
        throw Error(o(314));
    }
    if (i !== null) {
      i.delete(t);
    }
    _0(e, a);
  }
  function g1(e, t) {
    return _l(e, t);
  }
  var Go = null,
    Ir = null,
    jc = !1,
    Fo = !1,
    Uc = !1,
    Na = 0;
  function $n(e) {
    if (e !== Ir && e.next === null) {
      Ir === null ? (Go = Ir = e) : (Ir = Ir.next = e);
    }
    Fo = !0;
    jc || ((jc = !0), y1());
  }
  function si(e, t) {
    if (!Uc && Fo) {
      Uc = !0;
      do
        for (var a = !1, i = Go; i !== null; ) {
          if (e !== 0) {
            var u = i.pendingLanes;
            if (u === 0) var d = 0;
            else {
              var p = i.suspendedLanes,
                b = i.pingedLanes;
              d = (1 << (31 - jt(42 | e) + 1)) - 1;
              d &= u & ~(p & ~b);
              d = d & 201326741 ? (d & 201326741) | 1 : d ? d | 2 : 0;
            }
            if (d !== 0) {
              ((a = !0), A0(i, d));
            }
          } else {
            d = Ue;
            d = Qa(
              i,
              i === nt ? d : 0,
              i.cancelPendingCommit !== null || i.timeoutHandle !== -1,
            );
            (d & 3) === 0 || Ka(i, d) || ((a = !0), A0(i, d));
          }
          i = i.next;
        }
      while (a);
      Uc = !1;
    }
  }
  function p1() {
    T0();
  }
  function T0() {
    Fo = jc = !1;
    var e = 0;
    if (Na !== 0 && O1()) {
      e = Na;
    }
    for (var t = pt(), a = null, i = Go; i !== null; ) {
      var u = i.next,
        d = O0(i, t);
      d === 0
        ? ((i.next = null),
          a === null ? (Go = u) : (a.next = u),
          u === null && (Ir = a))
        : ((a = i), (e !== 0 || (d & 3) !== 0) && (Fo = !0));
      i = u;
    }
    (Tt !== 0 && Tt !== 5) || si(e);
    if (Na !== 0) {
      Na = 0;
    }
  }
  function O0(e, t) {
    for (
      var a = e.suspendedLanes,
        i = e.pingedLanes,
        u = e.expirationTimes,
        d = e.pendingLanes & -62914561;
      0 < d;
    ) {
      var p = 31 - jt(d),
        b = 1 << p,
        C = u[p];
      C === -1
        ? ((b & a) === 0 || (b & i) !== 0) && (u[p] = Qi(b, t))
        : C <= t && (e.expiredLanes |= b);
      d &= ~b;
    }
    if (
      ((t = nt),
      (a = Ue),
      (a = Qa(
        e,
        e === t ? a : 0,
        e.cancelPendingCommit !== null || e.timeoutHandle !== -1,
      )),
      (i = e.callbackNode),
      a === 0 ||
        (e === t && (Ze === 2 || Ze === 9)) ||
        e.cancelPendingCommit !== null)
    )
      return (
        i !== null && i !== null && Tl(i),
        (e.callbackNode = null),
        (e.callbackPriority = 0)
      );
    if ((a & 3) === 0 || Ka(e, a)) {
      if (((t = a & -a), t === e.callbackPriority)) return t;
      switch ((i !== null && Tl(i), ae(a))) {
        case 2:
        case 8:
          a = wr;
          break;
        case 32:
          a = Ft;
          break;
        case 268435456:
          a = Cl;
          break;
        default:
          a = Ft;
      }
      return (
        (i = C0.bind(null, e)),
        (a = _l(a, i)),
        (e.callbackPriority = t),
        (e.callbackNode = a),
        t
      );
    }
    return (
      i !== null && i !== null && Tl(i),
      (e.callbackPriority = 2),
      (e.callbackNode = null),
      2
    );
  }
  function C0(e, t) {
    if (Tt !== 0 && Tt !== 5)
      return ((e.callbackNode = null), (e.callbackPriority = 0), null);
    var a = e.callbackNode;
    if (Yo() && e.callbackNode !== a) return null;
    var i = Ue;
    return (
      (i = Qa(
        e,
        e === nt ? i : 0,
        e.cancelPendingCommit !== null || e.timeoutHandle !== -1,
      )),
      i === 0
        ? null
        : (u0(e, i, t),
          O0(e, pt()),
          e.callbackNode != null && e.callbackNode === a
            ? C0.bind(null, e)
            : null)
    );
  }
  function A0(e, t) {
    if (Yo()) return null;
    u0(e, t, !0);
  }
  function y1() {
    A1(function () {
      (Qe & 6) !== 0 ? _l(Ol, p1) : T0();
    });
  }
  function Hc() {
    if (Na === 0) {
      var e = Ur;
      if (e === 0) {
        ((e = Fn), (Fn <<= 1), (Fn & 261888) === 0 && (Fn = 256));
      }
      Na = e;
    }
    return Na;
  }
  function D0(e) {
    if (e == null || typeof e == "symbol" || typeof e == "boolean") {
      return null;
    }
    if (typeof e == "function") {
      return e;
    }
    return Ii("" + e);
  }
  function L0(e, t) {
    var a = t.ownerDocument.createElement("input");
    return (
      (a.name = t.name),
      (a.value = t.value),
      e.id && a.setAttribute("form", e.id),
      t.parentNode.insertBefore(a, t),
      (e = new FormData(e)),
      a.parentNode.removeChild(a),
      e
    );
  }
  function v1(e, t, a, i, u) {
    if (t === "submit" && a && a.stateNode === u) {
      var d = D0((u[ge] || null).action),
        p = i.submitter;
      if (p) {
        ((t = (t = p[ge] || null)
          ? D0(t.formAction)
          : p.getAttribute("formAction")),
          t !== null && ((d = t), (p = null)));
      }
      var b = new no("action", "action", null, i, u);
      e.push({
        event: b,
        listeners: [
          {
            instance: null,
            listener: function () {
              if (i.defaultPrevented) {
                if (Na !== 0) {
                  var C = p ? L0(u, p) : new FormData(u);
                  rc(
                    a,
                    {
                      pending: !0,
                      data: C,
                      method: u.method,
                      action: d,
                    },
                    null,
                    C,
                  );
                }
              } else if (typeof d == "function") {
                (b.preventDefault(),
                  (C = p ? L0(u, p) : new FormData(u)),
                  rc(
                    a,
                    {
                      pending: !0,
                      data: C,
                      method: u.method,
                      action: d,
                    },
                    d,
                    C,
                  ));
              }
            },
            currentTarget: u,
          },
        ],
      });
    }
  }
  for (var Bc = 0; Bc < Eu.length; Bc++) {
    var $c = Eu[Bc],
      b1 = $c.toLowerCase(),
      S1 = $c[0].toUpperCase() + $c.slice(1);
    Nn(b1, "on" + S1);
  }
  Nn(sh, "onAnimationEnd");
  Nn(uh, "onAnimationIteration");
  Nn(ch, "onAnimationStart");
  Nn("dblclick", "onDoubleClick");
  Nn("focusin", "onFocus");
  Nn("focusout", "onBlur");
  Nn(jb, "onTransitionRun");
  Nn(Ub, "onTransitionStart");
  Nn(Hb, "onTransitionCancel");
  Nn(fh, "onTransitionEnd");
  hn("onMouseEnter", ["mouseout", "mouseover"]);
  hn("onMouseLeave", ["mouseout", "mouseover"]);
  hn("onPointerEnter", ["pointerout", "pointerover"]);
  hn("onPointerLeave", ["pointerout", "pointerover"]);
  Dn(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(
      " ",
    ),
  );
  Dn(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " ",
    ),
  );
  Dn("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
  Dn(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" "),
  );
  Dn(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" "),
  );
  Dn(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" "),
  );
  var ui =
      "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
        " ",
      ),
    E1 = new Set(
      "beforetoggle cancel close invalid load scroll scrollend toggle"
        .split(" ")
        .concat(ui),
    );
  function N0(e, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < e.length; a++) {
      var i = e[a],
        u = i.event;
      i = i.listeners;
      e: {
        var d = void 0;
        if (t)
          for (var p = i.length - 1; 0 <= p; p--) {
            var b = i[p],
              C = b.instance,
              q = b.currentTarget;
            if (((b = b.listener), C !== d && u.isPropagationStopped()))
              break e;
            d = b;
            u.currentTarget = q;
            try {
              d(u);
            } catch (Q) {
              lo(Q);
            }
            u.currentTarget = null;
            d = C;
          }
        else
          for (p = 0; p < i.length; p++) {
            if (
              ((b = i[p]),
              (C = b.instance),
              (q = b.currentTarget),
              (b = b.listener),
              C !== d && u.isPropagationStopped())
            )
              break e;
            d = b;
            u.currentTarget = q;
            try {
              d(u);
            } catch (Q) {
              lo(Q);
            }
            u.currentTarget = null;
            d = C;
          }
      }
    }
  }
  function je(e, t) {
    var a = t[_e];
    if (a === void 0) {
      a = t[_e] = new Set();
    }
    var i = e + "__bubble";
    a.has(i) || (M0(t, e, 2, !1), a.add(i));
  }
  function qc(e, t, a) {
    var i = 0;
    if (t) {
      i |= 4;
    }
    M0(a, e, i, t);
  }
  var Xo = "_reactListening" + Math.random().toString(36).slice(2);
  function Vc(e) {
    if (!e[Xo]) {
      e[Xo] = !0;
      An.forEach(function (item) {
        if (item !== "selectionchange") {
          (E1.has(item) || qc(item, !1, e), qc(item, !0, e));
        }
      });
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Xo] || ((t[Xo] = !0), qc("selectionchange", !1, t));
    }
  }
  function M0(e, t, a, i) {
    switch (sg(t)) {
      case 2:
        var u = K1;
        break;
      case 8:
        u = Z1;
        break;
      default:
        u = af;
    }
    a = u.bind(null, t, a, e);
    u = void 0;
    !su ||
      (t !== "touchstart" && t !== "touchmove" && t !== "wheel") ||
      (u = !0);
    i
      ? u !== void 0
        ? e.addEventListener(t, a, {
            capture: !0,
            passive: u,
          })
        : e.addEventListener(t, a, !0)
      : u !== void 0
        ? e.addEventListener(t, a, {
            passive: u,
          })
        : e.addEventListener(t, a, !1);
  }
  function Yc(e, t, a, i, u) {
    var d = i;
    if ((t & 1) === 0 && (t & 2) === 0 && i !== null)
      e: for (;;) {
        if (i === null) return;
        var p = i.tag;
        if (p === 3 || p === 4) {
          var b = i.stateNode.containerInfo;
          if (b === u) break;
          if (p === 4)
            for (p = i.return; p !== null; ) {
              var C = p.tag;
              if ((C === 3 || C === 4) && p.stateNode.containerInfo === u)
                return;
              p = p.return;
            }
          for (; b !== null; ) {
            if (((p = ht(b)), p === null)) return;
            if (((C = p.tag), C === 5 || C === 6 || C === 26 || C === 27)) {
              i = d = p;
              continue e;
            }
            b = b.parentNode;
          }
        }
        i = i.return;
      }
    Hd(function () {
      var q = d,
        Q = iu(a),
        I = [];
      e: {
        var Y = dh.get(e);
        if (Y !== void 0) {
          var P = no,
            pe = e;
          switch (e) {
            case "keypress":
              if (eo(a) === 0) break e;
            case "keydown":
            case "keyup":
              P = mb;
              break;
            case "focusin":
              pe = "focus";
              P = du;
              break;
            case "focusout":
              pe = "blur";
              P = du;
              break;
            case "beforeblur":
            case "afterblur":
              P = du;
              break;
            case "click":
              if (a.button === 2) break e;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              P = qd;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              P = nb;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              P = yb;
              break;
            case sh:
            case uh:
            case ch:
              P = lb;
              break;
            case fh:
              P = bb;
              break;
            case "scroll":
            case "scrollend":
              P = eb;
              break;
            case "wheel":
              P = Eb;
              break;
            case "copy":
            case "cut":
            case "paste":
              P = ob;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              P = Yd;
              break;
            case "toggle":
            case "beforetoggle":
              P = wb;
          }
          var Te = (t & 4) !== 0,
            et = !Te && (e === "scroll" || e === "scrollend"),
            k = Te ? (Y !== null ? Y + "Capture" : null) : Y;
          Te = [];
          for (var N = q, $; N !== null; ) {
            var K = N;
            if (
              (($ = K.stateNode),
              (K = K.tag),
              (K !== 5 && K !== 26 && K !== 27) ||
                $ === null ||
                k === null ||
                ((K = Ll(N, k)), K != null && Te.push(ci(N, K, $))),
              et)
            )
              break;
            N = N.return;
          }
          if (0 < Te.length) {
            ((Y = new P(Y, pe, null, a, Q)),
              I.push({
                event: Y,
                listeners: Te,
              }));
          }
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (
            ((Y = e === "mouseover" || e === "pointerover"),
            (P = e === "mouseout" || e === "pointerout"),
            Y &&
              a !== lu &&
              (pe = a.relatedTarget || a.fromElement) &&
              (ht(pe) || pe[ve]))
          )
            break e;
          if (
            (P || Y) &&
            ((Y =
              Q.window === Q
                ? Q
                : (Y = Q.ownerDocument)
                  ? Y.defaultView || Y.parentWindow
                  : window),
            P
              ? ((pe = a.relatedTarget || a.toElement),
                (P = q),
                (pe = pe ? ht(pe) : null),
                pe !== null &&
                  ((et = c(pe)),
                  (Te = pe.tag),
                  pe !== et || (Te !== 5 && Te !== 27 && Te !== 6)) &&
                  (pe = null))
              : ((P = null), (pe = q)),
            P !== pe)
          ) {
            if (
              ((Te = qd),
              (K = "onMouseLeave"),
              (k = "onMouseEnter"),
              (N = "mouse"),
              (e === "pointerout" || e === "pointerover") &&
                ((Te = Yd),
                (K = "onPointerLeave"),
                (k = "onPointerEnter"),
                (N = "pointer")),
              (et = P == null ? Y : Ot(P)),
              ($ = pe == null ? Y : Ot(pe)),
              (Y = new Te(K, N + "leave", P, a, Q)),
              (Y.target = et),
              (Y.relatedTarget = $),
              (K = null),
              ht(Q) === q &&
                ((Te = new Te(k, N + "enter", pe, a, Q)),
                (Te.target = $),
                (Te.relatedTarget = et),
                (K = Te)),
              (et = K),
              P && pe)
            )
              t: {
                for (Te = x1, k = P, N = pe, $ = 0, K = k; K; K = Te(K)) $++;
                K = 0;
                for (var we = N; we; we = Te(we)) K++;
                for (; 0 < $ - K; ) {
                  k = Te(k);
                  $--;
                }
                for (; 0 < K - $; ) {
                  N = Te(N);
                  K--;
                }
                for (; $--; ) {
                  if (k === N || (N !== null && k === N.alternate)) {
                    Te = k;
                    break t;
                  }
                  k = Te(k);
                  N = Te(N);
                }
                Te = null;
              }
            else Te = null;
            if (P !== null) {
              z0(I, Y, P, Te, !1);
            }
            if (pe !== null && et !== null) {
              z0(I, et, pe, Te, !0);
            }
          }
        }
        e: {
          if (
            ((Y = q ? Ot(q) : window),
            (P = Y.nodeName && Y.nodeName.toLowerCase()),
            P === "select" || (P === "input" && Y.type === "file"))
          )
            var Fe = Jd;
          else if (Kd(Y)) {
            if (Id) Fe = Mb;
            else {
              Fe = Lb;
              var ye = Db;
            }
          } else {
            P = Y.nodeName;
            !P ||
            P.toLowerCase() !== "input" ||
            (Y.type !== "checkbox" && Y.type !== "radio")
              ? q && ru(q.elementType) && (Fe = Jd)
              : (Fe = Nb);
          }
          if (Fe && (Fe = Fe(e, q))) {
            Zd(I, Fe, a, Q);
            break e;
          }
          if (ye) {
            ye(e, Y, q);
          }
          if (
            e === "focusout" &&
            q &&
            Y.type === "number" &&
            q.memoizedProps.value != null
          ) {
            au(Y, "number", Y.value);
          }
        }
        switch (((ye = q ? Ot(q) : window), e)) {
          case "focusin":
            if (Kd(ye) || ye.contentEditable === "true") {
              ((Ar = ye), (vu = q), (Bl = null));
            }
            break;
          case "focusout":
            Bl = vu = Ar = null;
            break;
          case "mousedown":
            bu = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            bu = !1;
            ih(I, a, Q);
            break;
          case "selectionchange":
            if (kb) break;
          case "keydown":
          case "keyup":
            ih(I, a, Q);
        }
        var Ne;
        if (mu)
          e: {
            switch (e) {
              case "compositionstart":
                var He = "onCompositionStart";
                break e;
              case "compositionend":
                He = "onCompositionEnd";
                break e;
              case "compositionupdate":
                He = "onCompositionUpdate";
                break e;
            }
            He = void 0;
          }
        else
          Cr
            ? Pd(e, a) && (He = "onCompositionEnd")
            : e === "keydown" &&
              a.keyCode === 229 &&
              (He = "onCompositionStart");
        if (He) {
          (Gd &&
            a.locale !== "ko" &&
            (Cr || He !== "onCompositionStart"
              ? He === "onCompositionEnd" && Cr && (Ne = Bd())
              : ((pa = Q),
                (uu = "value" in pa ? pa.value : pa.textContent),
                (Cr = !0))),
            (ye = Po(q, He)),
            0 < ye.length &&
              ((He = new Vd(He, e, null, a, Q)),
              I.push({
                event: He,
                listeners: ye,
              }),
              Ne
                ? (He.data = Ne)
                : ((Ne = Qd(a)), Ne !== null && (He.data = Ne))));
        }
        if ((Ne = _b ? Tb(e, a) : Ob(e, a))) {
          ((He = Po(q, "onBeforeInput")),
            0 < He.length &&
              ((ye = new Vd("onBeforeInput", "beforeinput", null, a, Q)),
              I.push({
                event: ye,
                listeners: He,
              }),
              (ye.data = Ne)));
        }
        v1(I, e, q, a, Q);
      }
      N0(I, t);
    });
  }
  function ci(e, t, a) {
    return {
      instance: e,
      listener: t,
      currentTarget: a,
    };
  }
  function Po(e, t) {
    for (var a = t + "Capture", i = []; e !== null; ) {
      var u = e,
        d = u.stateNode;
      if (
        ((u = u.tag),
        (u !== 5 && u !== 26 && u !== 27) ||
          d === null ||
          ((u = Ll(e, a)),
          u != null && i.unshift(ci(e, u, d)),
          (u = Ll(e, t)),
          u != null && i.push(ci(e, u, d))),
        e.tag === 3)
      )
        return i;
      e = e.return;
    }
    return [];
  }
  function x1(e) {
    if (e === null) return null;
    do e = e.return;
    while (e && e.tag !== 5 && e.tag !== 27);
    return e || null;
  }
  function z0(e, t, a, i, u) {
    for (var d = t._reactName, p = []; a !== null && a !== i; ) {
      var b = a,
        C = b.alternate,
        q = b.stateNode;
      if (((b = b.tag), C !== null && C === i)) break;
      (b !== 5 && b !== 26 && b !== 27) ||
        q === null ||
        ((C = q),
        u
          ? ((q = Ll(a, d)), q != null && p.unshift(ci(a, q, C)))
          : u || ((q = Ll(a, d)), q != null && p.push(ci(a, q, C))));
      a = a.return;
    }
    if (p.length !== 0) {
      e.push({
        event: t,
        listeners: p,
      });
    }
  }
  var w1 = /\r\n?/g,
    R1 = /\u0000|\uFFFD/g;
  function k0(e) {
    return (typeof e == "string" ? e : "" + e)
      .replace(
        w1,
        `
`,
      )
      .replace(R1, "");
  }
  function j0(e, t) {
    return ((t = k0(t)), k0(e) === t);
  }
  function We(e, t, a, i, u, d) {
    switch (a) {
      case "children":
        typeof i == "string"
          ? t === "body" || (t === "textarea" && i === "") || _r(e, i)
          : (typeof i == "number" || typeof i == "bigint") &&
            t !== "body" &&
            _r(e, "" + i);
        break;
      case "className":
        Ln(e, "class", i);
        break;
      case "tabIndex":
        Ln(e, "tabindex", i);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Ln(e, a, i);
        break;
      case "style":
        jd(e, i, d);
        break;
      case "data":
        if (t !== "object") {
          Ln(e, "data", i);
          break;
        }
      case "src":
      case "href":
        if (i === "" && (t !== "a" || a !== "href")) {
          e.removeAttribute(a);
          break;
        }
        if (
          i == null ||
          typeof i == "function" ||
          typeof i == "symbol" ||
          typeof i == "boolean"
        ) {
          e.removeAttribute(a);
          break;
        }
        i = Ii("" + i);
        e.setAttribute(a, i);
        break;
      case "action":
      case "formAction":
        if (typeof i == "function") {
          e.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')",
          );
          break;
        } else if (typeof d == "function") {
          a === "formAction"
            ? (t !== "input" && We(e, t, "name", u.name, u, null),
              We(e, t, "formEncType", u.formEncType, u, null),
              We(e, t, "formMethod", u.formMethod, u, null),
              We(e, t, "formTarget", u.formTarget, u, null))
            : (We(e, t, "encType", u.encType, u, null),
              We(e, t, "method", u.method, u, null),
              We(e, t, "target", u.target, u, null));
        }
        if (i == null || typeof i == "symbol" || typeof i == "boolean") {
          e.removeAttribute(a);
          break;
        }
        i = Ii("" + i);
        e.setAttribute(a, i);
        break;
      case "onClick":
        if (i != null) {
          e.onclick = Qn;
        }
        break;
      case "onScroll":
        if (i != null) {
          je("scroll", e);
        }
        break;
      case "onScrollEnd":
        if (i != null) {
          je("scrollend", e);
        }
        break;
      case "dangerouslySetInnerHTML":
        if (i != null) {
          if (typeof i != "object" || !("__html" in i)) throw Error(o(61));
          if (((a = i.__html), a != null)) {
            if (u.children != null) throw Error(o(60));
            e.innerHTML = a;
          }
        }
        break;
      case "multiple":
        e.multiple = i && typeof i != "function" && typeof i != "symbol";
        break;
      case "muted":
        e.muted = i && typeof i != "function" && typeof i != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (
          i == null ||
          typeof i == "function" ||
          typeof i == "boolean" ||
          typeof i == "symbol"
        ) {
          e.removeAttribute("xlink:href");
          break;
        }
        a = Ii("" + i);
        e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", a);
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        i != null && typeof i != "function" && typeof i != "symbol"
          ? e.setAttribute(a, "" + i)
          : e.removeAttribute(a);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        i && typeof i != "function" && typeof i != "symbol"
          ? e.setAttribute(a, "")
          : e.removeAttribute(a);
        break;
      case "capture":
      case "download":
        i === !0
          ? e.setAttribute(a, "")
          : i !== !1 &&
              i != null &&
              typeof i != "function" &&
              typeof i != "symbol"
            ? e.setAttribute(a, i)
            : e.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        i != null &&
        typeof i != "function" &&
        typeof i != "symbol" &&
        !isNaN(i) &&
        1 <= i
          ? e.setAttribute(a, i)
          : e.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        i == null || typeof i == "function" || typeof i == "symbol" || isNaN(i)
          ? e.removeAttribute(a)
          : e.setAttribute(a, i);
        break;
      case "popover":
        je("beforetoggle", e);
        je("toggle", e);
        yt(e, "popover", i);
        break;
      case "xlinkActuate":
        Dt(e, "http://www.w3.org/1999/xlink", "xlink:actuate", i);
        break;
      case "xlinkArcrole":
        Dt(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", i);
        break;
      case "xlinkRole":
        Dt(e, "http://www.w3.org/1999/xlink", "xlink:role", i);
        break;
      case "xlinkShow":
        Dt(e, "http://www.w3.org/1999/xlink", "xlink:show", i);
        break;
      case "xlinkTitle":
        Dt(e, "http://www.w3.org/1999/xlink", "xlink:title", i);
        break;
      case "xlinkType":
        Dt(e, "http://www.w3.org/1999/xlink", "xlink:type", i);
        break;
      case "xmlBase":
        Dt(e, "http://www.w3.org/XML/1998/namespace", "xml:base", i);
        break;
      case "xmlLang":
        Dt(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", i);
        break;
      case "xmlSpace":
        Dt(e, "http://www.w3.org/XML/1998/namespace", "xml:space", i);
        break;
      case "is":
        yt(e, "is", i);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (
          !(2 < a.length) ||
          (a[0] !== "o" && a[0] !== "O") ||
          (a[1] !== "n" && a[1] !== "N")
        ) {
          ((a = Iv.get(a) || a), yt(e, a, i));
        }
    }
  }
  function Gc(e, t, a, i, u, d) {
    switch (a) {
      case "style":
        jd(e, i, d);
        break;
      case "dangerouslySetInnerHTML":
        if (i != null) {
          if (typeof i != "object" || !("__html" in i)) throw Error(o(61));
          if (((a = i.__html), a != null)) {
            if (u.children != null) throw Error(o(60));
            e.innerHTML = a;
          }
        }
        break;
      case "children":
        typeof i == "string"
          ? _r(e, i)
          : (typeof i == "number" || typeof i == "bigint") && _r(e, "" + i);
        break;
      case "onScroll":
        if (i != null) {
          je("scroll", e);
        }
        break;
      case "onScrollEnd":
        if (i != null) {
          je("scrollend", e);
        }
        break;
      case "onClick":
        if (i != null) {
          e.onclick = Qn;
        }
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!nn.hasOwnProperty(a))
          e: {
            if (
              a[0] === "o" &&
              a[1] === "n" &&
              ((u = a.endsWith("Capture")),
              (t = a.slice(2, u ? a.length - 7 : void 0)),
              (d = e[ge] || null),
              (d = d != null ? d[a] : null),
              typeof d == "function" && e.removeEventListener(t, d, u),
              typeof i == "function")
            ) {
              if (typeof d != "function" && d !== null) {
                a in e
                  ? (e[a] = null)
                  : e.hasAttribute(a) && e.removeAttribute(a);
              }
              e.addEventListener(t, i, u);
              break e;
            }
            a in e
              ? (e[a] = i)
              : i === !0
                ? e.setAttribute(a, "")
                : yt(e, a, i);
          }
    }
  }
  function zt(e, t, a) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        je("error", e);
        je("load", e);
        var i = !1,
          u = !1,
          d;
        for (d in a)
          if (a.hasOwnProperty(d)) {
            var p = a[d];
            if (p != null)
              switch (d) {
                case "src":
                  i = !0;
                  break;
                case "srcSet":
                  u = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(o(137, t));
                default:
                  We(e, t, d, p, a, null);
              }
          }
        if (u) {
          We(e, t, "srcSet", a.srcSet, a, null);
        }
        if (i) {
          We(e, t, "src", a.src, a, null);
        }
        return;
      case "input":
        je("invalid", e);
        var b = (d = p = u = null),
          C = null,
          q = null;
        for (i in a)
          if (a.hasOwnProperty(i)) {
            var Q = a[i];
            if (Q != null)
              switch (i) {
                case "name":
                  u = Q;
                  break;
                case "type":
                  p = Q;
                  break;
                case "checked":
                  C = Q;
                  break;
                case "defaultChecked":
                  q = Q;
                  break;
                case "value":
                  d = Q;
                  break;
                case "defaultValue":
                  b = Q;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (Q != null) throw Error(o(137, t));
                  break;
                default:
                  We(e, t, i, Q, a, null);
              }
          }
        Nd(e, d, b, C, q, p, u, !1);
        return;
      case "select":
        je("invalid", e);
        i = p = d = null;
        for (u in a)
          if (a.hasOwnProperty(u) && ((b = a[u]), b != null))
            switch (u) {
              case "value":
                d = b;
                break;
              case "defaultValue":
                p = b;
                break;
              case "multiple":
                i = b;
              default:
                We(e, t, u, b, a, null);
            }
        t = d;
        a = p;
        e.multiple = !!i;
        t != null ? Rr(e, !!i, t, !1) : a != null && Rr(e, !!i, a, !0);
        return;
      case "textarea":
        je("invalid", e);
        d = u = i = null;
        for (p in a)
          if (a.hasOwnProperty(p) && ((b = a[p]), b != null))
            switch (p) {
              case "value":
                i = b;
                break;
              case "defaultValue":
                u = b;
                break;
              case "children":
                d = b;
                break;
              case "dangerouslySetInnerHTML":
                if (b != null) throw Error(o(91));
                break;
              default:
                We(e, t, p, b, a, null);
            }
        zd(e, i, u, d);
        return;
      case "option":
        for (C in a)
          if (a.hasOwnProperty(C) && ((i = a[C]), i != null)) {
            C === "selected"
              ? (e.selected =
                  i && typeof i != "function" && typeof i != "symbol")
              : We(e, t, C, i, a, null);
          }
        return;
      case "dialog":
        je("beforetoggle", e);
        je("toggle", e);
        je("cancel", e);
        je("close", e);
        break;
      case "iframe":
      case "object":
        je("load", e);
        break;
      case "video":
      case "audio":
        for (i = 0; i < ui.length; i++) je(ui[i], e);
        break;
      case "image":
        je("error", e);
        je("load", e);
        break;
      case "details":
        je("toggle", e);
        break;
      case "embed":
      case "source":
      case "link":
        je("error", e);
        je("load", e);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (q in a)
          if (a.hasOwnProperty(q) && ((i = a[q]), i != null))
            switch (q) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(o(137, t));
              default:
                We(e, t, q, i, a, null);
            }
        return;
      default:
        if (ru(t)) {
          for (Q in a)
            if (a.hasOwnProperty(Q)) {
              ((i = a[Q]), i !== void 0 && Gc(e, t, Q, i, a, void 0));
            }
          return;
        }
    }
    for (b in a)
      if (a.hasOwnProperty(b)) {
        ((i = a[b]), i != null && We(e, t, b, i, a, null));
      }
  }
  function _1(e, t, a, i) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var u = null,
          d = null,
          p = null,
          b = null,
          C = null,
          q = null,
          Q = null;
        for (P in a) {
          var I = a[P];
          if (a.hasOwnProperty(P) && I != null)
            switch (P) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                C = I;
              default:
                i.hasOwnProperty(P) || We(e, t, P, null, i, I);
            }
        }
        for (var Y in i) {
          var P = i[Y];
          if (((I = a[Y]), i.hasOwnProperty(Y) && (P != null || I != null)))
            switch (Y) {
              case "type":
                d = P;
                break;
              case "name":
                u = P;
                break;
              case "checked":
                q = P;
                break;
              case "defaultChecked":
                Q = P;
                break;
              case "value":
                p = P;
                break;
              case "defaultValue":
                b = P;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (P != null) throw Error(o(137, t));
                break;
              default:
                if (P !== I) {
                  We(e, t, Y, P, i, I);
                }
            }
        }
        nu(e, p, b, C, q, Q, d, u);
        return;
      case "select":
        P = p = b = Y = null;
        for (d in a)
          if (((C = a[d]), a.hasOwnProperty(d) && C != null))
            switch (d) {
              case "value":
                break;
              case "multiple":
                P = C;
              default:
                i.hasOwnProperty(d) || We(e, t, d, null, i, C);
            }
        for (u in i)
          if (
            ((d = i[u]),
            (C = a[u]),
            i.hasOwnProperty(u) && (d != null || C != null))
          )
            switch (u) {
              case "value":
                Y = d;
                break;
              case "defaultValue":
                b = d;
                break;
              case "multiple":
                p = d;
              default:
                if (d !== C) {
                  We(e, t, u, d, i, C);
                }
            }
        t = b;
        a = p;
        i = P;
        Y != null
          ? Rr(e, !!a, Y, !1)
          : !!i != !!a &&
            (t != null ? Rr(e, !!a, t, !0) : Rr(e, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        P = Y = null;
        for (b in a)
          if (
            ((u = a[b]),
            a.hasOwnProperty(b) && u != null && !i.hasOwnProperty(b))
          )
            switch (b) {
              case "value":
                break;
              case "children":
                break;
              default:
                We(e, t, b, null, i, u);
            }
        for (p in i)
          if (
            ((u = i[p]),
            (d = a[p]),
            i.hasOwnProperty(p) && (u != null || d != null))
          )
            switch (p) {
              case "value":
                Y = u;
                break;
              case "defaultValue":
                P = u;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (u != null) throw Error(o(91));
                break;
              default:
                if (u !== d) {
                  We(e, t, p, u, i, d);
                }
            }
        Md(e, Y, P);
        return;
      case "option":
        for (var pe in a) {
          Y = a[pe];
          if (a.hasOwnProperty(pe) && Y != null && !i.hasOwnProperty(pe)) {
            pe === "selected" ? (e.selected = !1) : We(e, t, pe, null, i, Y);
          }
        }
        for (C in i) {
          Y = i[C];
          P = a[C];
          if (i.hasOwnProperty(C) && Y !== P && (Y != null || P != null)) {
            C === "selected"
              ? (e.selected =
                  Y && typeof Y != "function" && typeof Y != "symbol")
              : We(e, t, C, Y, i, P);
          }
        }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var Te in a) {
          Y = a[Te];
          if (a.hasOwnProperty(Te) && Y != null && !i.hasOwnProperty(Te)) {
            We(e, t, Te, null, i, Y);
          }
        }
        for (q in i)
          if (
            ((Y = i[q]),
            (P = a[q]),
            i.hasOwnProperty(q) && Y !== P && (Y != null || P != null))
          )
            switch (q) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (Y != null) throw Error(o(137, t));
                break;
              default:
                We(e, t, q, Y, i, P);
            }
        return;
      default:
        if (ru(t)) {
          for (var et in a) {
            Y = a[et];
            if (a.hasOwnProperty(et) && Y !== void 0 && !i.hasOwnProperty(et)) {
              Gc(e, t, et, void 0, i, Y);
            }
          }
          for (Q in i) {
            Y = i[Q];
            P = a[Q];
            !i.hasOwnProperty(Q) ||
              Y === P ||
              (Y === void 0 && P === void 0) ||
              Gc(e, t, Q, Y, i, P);
          }
          return;
        }
    }
    for (var k in a) {
      Y = a[k];
      if (a.hasOwnProperty(k) && Y != null && !i.hasOwnProperty(k)) {
        We(e, t, k, null, i, Y);
      }
    }
    for (I in i) {
      Y = i[I];
      P = a[I];
      !i.hasOwnProperty(I) ||
        Y === P ||
        (Y == null && P == null) ||
        We(e, t, I, Y, i, P);
    }
  }
  function U0(e) {
    switch (e) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function T1() {
    if (typeof performance.getEntriesByType == "function") {
      for (
        var e = 0, t = 0, a = performance.getEntriesByType("resource"), i = 0;
        i < a.length;
        i++
      ) {
        var u = a[i],
          d = u.transferSize,
          p = u.initiatorType,
          b = u.duration;
        if (d && b && U0(p)) {
          for (p = 0, b = u.responseEnd, i += 1; i < a.length; i++) {
            var C = a[i],
              q = C.startTime;
            if (q > b) break;
            var Q = C.transferSize,
              I = C.initiatorType;
            if (Q && U0(I)) {
              ((C = C.responseEnd), (p += Q * (C < b ? 1 : (b - q) / (C - q))));
            }
          }
          if ((--i, (t += (8 * (d + p)) / (u.duration / 1e3)), e++, 10 < e))
            break;
        }
      }
      if (0 < e) return t / e / 1e6;
    }
    return navigator.connection &&
      ((e = navigator.connection.downlink), typeof e == "number")
      ? e
      : 5;
  }
  var Fc = null,
    Xc = null;
  function Qo(e) {
    return e.nodeType === 9 ? e : e.ownerDocument;
  }
  function H0(e) {
    switch (e) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function B0(e, t) {
    if (e === 0)
      switch (t) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return e === 1 && t === "foreignObject" ? 0 : e;
  }
  function Pc(e, t) {
    return (
      e === "textarea" ||
      e === "noscript" ||
      typeof t.children == "string" ||
      typeof t.children == "number" ||
      typeof t.children == "bigint" ||
      (typeof t.dangerouslySetInnerHTML == "object" &&
        t.dangerouslySetInnerHTML !== null &&
        t.dangerouslySetInnerHTML.__html != null)
    );
  }
  var Qc = null;
  function O1() {
    var e = window.event;
    return e && e.type === "popstate"
      ? e === Qc
        ? !1
        : ((Qc = e), !0)
      : ((Qc = null), !1);
  }
  var $0 = typeof setTimeout == "function" ? setTimeout : void 0,
    C1 = typeof clearTimeout == "function" ? clearTimeout : void 0,
    q0 = typeof Promise == "function" ? Promise : void 0,
    A1 =
      typeof queueMicrotask == "function"
        ? queueMicrotask
        : typeof q0 < "u"
          ? function (e) {
              return q0.resolve(null).then(e).catch(D1);
            }
          : $0;
  function D1(e) {
    setTimeout(function () {
      throw e;
    });
  }
  function Ma(e) {
    return e === "head";
  }
  function V0(e, t) {
    var a = t,
      i = 0;
    do {
      var u = a.nextSibling;
      if ((e.removeChild(a), u && u.nodeType === 8))
        if (((a = u.data), a === "/$" || a === "/&")) {
          if (i === 0) {
            e.removeChild(u);
            nl(t);
            return;
          }
          i--;
        } else if (
          a === "$" ||
          a === "$?" ||
          a === "$~" ||
          a === "$!" ||
          a === "&"
        )
          i++;
        else if (a === "html") fi(e.ownerDocument.documentElement);
        else if (a === "head") {
          a = e.ownerDocument.head;
          fi(a);
          for (var d = a.firstChild; d; ) {
            var p = d.nextSibling,
              b = d.nodeName;
            d[ct] ||
              b === "SCRIPT" ||
              b === "STYLE" ||
              (b === "LINK" && d.rel.toLowerCase() === "stylesheet") ||
              a.removeChild(d);
            d = p;
          }
        } else if (a === "body") {
          fi(e.ownerDocument.body);
        }
      a = u;
    } while (a);
    nl(t);
  }
  function Y0(e, t) {
    var a = e;
    e = 0;
    do {
      var i = a.nextSibling;
      if (
        (a.nodeType === 1
          ? t
            ? ((a._stashedDisplay = a.style.display),
              (a.style.display = "none"))
            : ((a.style.display = a._stashedDisplay || ""),
              a.getAttribute("style") === "" && a.removeAttribute("style"))
          : a.nodeType === 3 &&
            (t
              ? ((a._stashedText = a.nodeValue), (a.nodeValue = ""))
              : (a.nodeValue = a._stashedText || "")),
        i && i.nodeType === 8)
      )
        if (((a = i.data), a === "/$")) {
          if (e === 0) break;
          e--;
        } else (a !== "$" && a !== "$?" && a !== "$~" && a !== "$!") || e++;
      a = i;
    } while (a);
  }
  function Kc(e) {
    var t = e.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (((t = t.nextSibling), a.nodeName)) {
        case "HTML":
        case "HEAD":
        case "BODY":
          Kc(a);
          dt(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      e.removeChild(a);
    }
  }
  function L1(e, t, a, i) {
    for (; e.nodeType === 1; ) {
      var u = a;
      if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!i && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
      } else if (i) {
        if (!e[ct])
          switch (t) {
            case "meta":
              if (!e.hasAttribute("itemprop")) break;
              return e;
            case "link":
              if (
                ((d = e.getAttribute("rel")),
                d === "stylesheet" && e.hasAttribute("data-precedence"))
              )
                break;
              if (
                d !== u.rel ||
                e.getAttribute("href") !==
                  (u.href == null || u.href === "" ? null : u.href) ||
                e.getAttribute("crossorigin") !==
                  (u.crossOrigin == null ? null : u.crossOrigin) ||
                e.getAttribute("title") !== (u.title == null ? null : u.title)
              )
                break;
              return e;
            case "style":
              if (e.hasAttribute("data-precedence")) break;
              return e;
            case "script":
              if (
                ((d = e.getAttribute("src")),
                (d !== (u.src == null ? null : u.src) ||
                  e.getAttribute("type") !== (u.type == null ? null : u.type) ||
                  e.getAttribute("crossorigin") !==
                    (u.crossOrigin == null ? null : u.crossOrigin)) &&
                  d &&
                  e.hasAttribute("async") &&
                  !e.hasAttribute("itemprop"))
              )
                break;
              return e;
            default:
              return e;
          }
      } else if (t === "input" && e.type === "hidden") {
        var d = u.name == null ? null : "" + u.name;
        if (u.type === "hidden" && e.getAttribute("name") === d) return e;
      } else return e;
      if (((e = En(e.nextSibling)), e === null)) break;
    }
    return null;
  }
  function N1(e, t, a) {
    if (t === "") return null;
    for (; e.nodeType !== 3; )
      if (
        ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") &&
          !a) ||
        ((e = En(e.nextSibling)), e === null)
      )
        return null;
    return e;
  }
  function G0(e, t) {
    for (; e.nodeType !== 8; )
      if (
        ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") &&
          !t) ||
        ((e = En(e.nextSibling)), e === null)
      )
        return null;
    return e;
  }
  function Zc(e) {
    return e.data === "$?" || e.data === "$~";
  }
  function Jc(e) {
    return (
      e.data === "$!" ||
      (e.data === "$?" && e.ownerDocument.readyState !== "loading")
    );
  }
  function M1(e, t) {
    var a = e.ownerDocument;
    if (e.data === "$~") e._reactRetry = t;
    else if (e.data !== "$?" || a.readyState !== "loading") t();
    else {
      var i = function () {
        t();
        a.removeEventListener("DOMContentLoaded", i);
      };
      a.addEventListener("DOMContentLoaded", i);
      e._reactRetry = i;
    }
  }
  function En(e) {
    for (; e != null; e = e.nextSibling) {
      var t = e.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (
          ((t = e.data),
          t === "$" ||
            t === "$!" ||
            t === "$?" ||
            t === "$~" ||
            t === "&" ||
            t === "F!" ||
            t === "F")
        )
          break;
        if (t === "/$" || t === "/&") return null;
      }
    }
    return e;
  }
  var Ic = null;
  function F0(e) {
    e = e.nextSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var a = e.data;
        if (a === "/$" || a === "/&") {
          if (t === 0) return En(e.nextSibling);
          t--;
        } else
          (a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&") ||
            t++;
      }
      e = e.nextSibling;
    }
    return null;
  }
  function X0(e) {
    e = e.previousSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var a = e.data;
        if (a === "$" || a === "$!" || a === "$?" || a === "$~" || a === "&") {
          if (t === 0) return e;
          t--;
        } else (a !== "/$" && a !== "/&") || t++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  function P0(e, t, a) {
    switch (((t = Qo(a)), e)) {
      case "html":
        if (((e = t.documentElement), !e)) throw Error(o(452));
        return e;
      case "head":
        if (((e = t.head), !e)) throw Error(o(453));
        return e;
      case "body":
        if (((e = t.body), !e)) throw Error(o(454));
        return e;
      default:
        throw Error(o(451));
    }
  }
  function fi(e) {
    for (var t = e.attributes; t.length; ) e.removeAttributeNode(t[0]);
    dt(e);
  }
  var xn = new Map(),
    Q0 = new Set();
  function Ko(e) {
    if (typeof e.getRootNode == "function") {
      return e.getRootNode();
    }
    if (e.nodeType === 9) {
      return e;
    }
    return e.ownerDocument;
  }
  var ca = V.d;
  V.d = {
    f: z1,
    r: k1,
    D: j1,
    C: U1,
    L: H1,
    m: B1,
    X: q1,
    S: $1,
    M: V1,
  };
  function z1() {
    var e = ca.f(),
      t = $o();
    return e || t;
  }
  function k1(e) {
    var t = $e(e);
    t !== null && t.tag === 5 && t.type === "form" ? fm(t) : ca.r(e);
  }
  var Wr = typeof document > "u" ? null : document;
  function K0(e, t, a) {
    var i = Wr;
    if (i && typeof t == "string" && t) {
      var u = mn(t);
      u = 'link[rel="' + e + '"][href="' + u + '"]';
      if (typeof a == "string") {
        u += '[crossorigin="' + a + '"]';
      }
      Q0.has(u) ||
        (Q0.add(u),
        (e = {
          rel: e,
          crossOrigin: a,
          href: t,
        }),
        i.querySelector(u) === null &&
          ((t = i.createElement("link")),
          zt(t, "link", e),
          ot(t),
          i.head.appendChild(t)));
    }
  }
  function j1(e) {
    ca.D(e);
    K0("dns-prefetch", e, null);
  }
  function U1(e, t) {
    ca.C(e, t);
    K0("preconnect", e, t);
  }
  function H1(e, t, a) {
    ca.L(e, t, a);
    var i = Wr;
    if (i && e && t) {
      var u = 'link[rel="preload"][as="' + mn(t) + '"]';
      t === "image" && a && a.imageSrcSet
        ? ((u += '[imagesrcset="' + mn(a.imageSrcSet) + '"]'),
          typeof a.imageSizes == "string" &&
            (u += '[imagesizes="' + mn(a.imageSizes) + '"]'))
        : (u += '[href="' + mn(e) + '"]');
      var d = u;
      switch (t) {
        case "style":
          d = el(e);
          break;
        case "script":
          d = tl(e);
      }
      xn.has(d) ||
        ((e = v(
          {
            rel: "preload",
            href: t === "image" && a && a.imageSrcSet ? void 0 : e,
            as: t,
          },
          a,
        )),
        xn.set(d, e),
        i.querySelector(u) !== null ||
          (t === "style" && i.querySelector(di(d))) ||
          (t === "script" && i.querySelector(hi(d))) ||
          ((t = i.createElement("link")),
          zt(t, "link", e),
          ot(t),
          i.head.appendChild(t)));
    }
  }
  function B1(e, t) {
    ca.m(e, t);
    var a = Wr;
    if (a && e) {
      var i = t && typeof t.as == "string" ? t.as : "script",
        u =
          'link[rel="modulepreload"][as="' + mn(i) + '"][href="' + mn(e) + '"]',
        d = u;
      switch (i) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          d = tl(e);
      }
      if (
        !xn.has(d) &&
        ((e = v(
          {
            rel: "modulepreload",
            href: e,
          },
          t,
        )),
        xn.set(d, e),
        a.querySelector(u) === null)
      ) {
        switch (i) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(hi(d))) return;
        }
        i = a.createElement("link");
        zt(i, "link", e);
        ot(i);
        a.head.appendChild(i);
      }
    }
  }
  function $1(e, t, a) {
    ca.S(e, t, a);
    var i = Wr;
    if (i && e) {
      var u = Xt(i).hoistableStyles,
        d = el(e);
      t = t || "default";
      var p = u.get(d);
      if (!p) {
        var b = {
          loading: 0,
          preload: null,
        };
        if ((p = i.querySelector(di(d)))) b.loading = 5;
        else {
          e = v(
            {
              rel: "stylesheet",
              href: e,
              "data-precedence": t,
            },
            a,
          );
          if ((a = xn.get(d))) {
            Wc(e, a);
          }
          var C = (p = i.createElement("link"));
          ot(C);
          zt(C, "link", e);
          C._p = new Promise(function (q, Q) {
            C.onload = q;
            C.onerror = Q;
          });
          C.addEventListener("load", function () {
            b.loading |= 1;
          });
          C.addEventListener("error", function () {
            b.loading |= 2;
          });
          b.loading |= 4;
          Zo(p, t, i);
        }
        p = {
          type: "stylesheet",
          instance: p,
          count: 1,
          state: b,
        };
        u.set(d, p);
      }
    }
  }
  function q1(e, t) {
    ca.X(e, t);
    var a = Wr;
    if (a && e) {
      var i = Xt(a).hoistableScripts,
        u = tl(e),
        d = i.get(u);
      d ||
        ((d = a.querySelector(hi(u))),
        d ||
          ((e = v(
            {
              src: e,
              async: !0,
            },
            t,
          )),
          (t = xn.get(u)) && ef(e, t),
          (d = a.createElement("script")),
          ot(d),
          zt(d, "link", e),
          a.head.appendChild(d)),
        (d = {
          type: "script",
          instance: d,
          count: 1,
          state: null,
        }),
        i.set(u, d));
    }
  }
  function V1(e, t) {
    ca.M(e, t);
    var a = Wr;
    if (a && e) {
      var i = Xt(a).hoistableScripts,
        u = tl(e),
        d = i.get(u);
      d ||
        ((d = a.querySelector(hi(u))),
        d ||
          ((e = v(
            {
              src: e,
              async: !0,
              type: "module",
            },
            t,
          )),
          (t = xn.get(u)) && ef(e, t),
          (d = a.createElement("script")),
          ot(d),
          zt(d, "link", e),
          a.head.appendChild(d)),
        (d = {
          type: "script",
          instance: d,
          count: 1,
          state: null,
        }),
        i.set(u, d));
    }
  }
  function Z0(e, t, a, i) {
    var u = (u = Re.current) ? Ko(u) : null;
    if (!u) throw Error(o(446));
    switch (e) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string"
          ? ((t = el(a.href)),
            (a = Xt(u).hoistableStyles),
            (i = a.get(t)),
            i ||
              ((i = {
                type: "style",
                instance: null,
                count: 0,
                state: null,
              }),
              a.set(t, i)),
            i)
          : {
              type: "void",
              instance: null,
              count: 0,
              state: null,
            };
      case "link":
        if (
          a.rel === "stylesheet" &&
          typeof a.href == "string" &&
          typeof a.precedence == "string"
        ) {
          e = el(a.href);
          var d = Xt(u).hoistableStyles,
            p = d.get(e);
          if (
            (p ||
              ((u = u.ownerDocument || u),
              (p = {
                type: "stylesheet",
                instance: null,
                count: 0,
                state: {
                  loading: 0,
                  preload: null,
                },
              }),
              d.set(e, p),
              (d = u.querySelector(di(e))) &&
                !d._p &&
                ((p.instance = d), (p.state.loading = 5)),
              xn.has(e) ||
                ((a = {
                  rel: "preload",
                  as: "style",
                  href: a.href,
                  crossOrigin: a.crossOrigin,
                  integrity: a.integrity,
                  media: a.media,
                  hrefLang: a.hrefLang,
                  referrerPolicy: a.referrerPolicy,
                }),
                xn.set(e, a),
                d || Y1(u, e, a, p.state))),
            t && i === null)
          )
            throw Error(o(528, ""));
          return p;
        }
        if (t && i !== null) throw Error(o(529, ""));
        return null;
      case "script":
        return (
          (t = a.async),
          (a = a.src),
          typeof a == "string" &&
          t &&
          typeof t != "function" &&
          typeof t != "symbol"
            ? ((t = tl(a)),
              (a = Xt(u).hoistableScripts),
              (i = a.get(t)),
              i ||
                ((i = {
                  type: "script",
                  instance: null,
                  count: 0,
                  state: null,
                }),
                a.set(t, i)),
              i)
            : {
                type: "void",
                instance: null,
                count: 0,
                state: null,
              }
        );
      default:
        throw Error(o(444, e));
    }
  }
  function el(e) {
    return 'href="' + mn(e) + '"';
  }
  function di(e) {
    return 'link[rel="stylesheet"][' + e + "]";
  }
  function J0(e) {
    return v({}, e, {
      "data-precedence": e.precedence,
      precedence: null,
    });
  }
  function Y1(e, t, a, i) {
    e.querySelector('link[rel="preload"][as="style"][' + t + "]")
      ? (i.loading = 1)
      : ((t = e.createElement("link")),
        (i.preload = t),
        t.addEventListener("load", function () {
          return (i.loading |= 1);
        }),
        t.addEventListener("error", function () {
          return (i.loading |= 2);
        }),
        zt(t, "link", a),
        ot(t),
        e.head.appendChild(t));
  }
  function tl(e) {
    return '[src="' + mn(e) + '"]';
  }
  function hi(e) {
    return "script[async]" + e;
  }
  function I0(e, t, a) {
    if ((t.count++, t.instance === null))
      switch (t.type) {
        case "style":
          var i = e.querySelector('style[data-href~="' + mn(a.href) + '"]');
          if (i) return ((t.instance = i), ot(i), i);
          var u = v({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null,
          });
          return (
            (i = (e.ownerDocument || e).createElement("style")),
            ot(i),
            zt(i, "style", u),
            Zo(i, a.precedence, e),
            (t.instance = i)
          );
        case "stylesheet":
          u = el(a.href);
          var d = e.querySelector(di(u));
          if (d) return ((t.state.loading |= 4), (t.instance = d), ot(d), d);
          i = J0(a);
          if ((u = xn.get(u))) {
            Wc(i, u);
          }
          d = (e.ownerDocument || e).createElement("link");
          ot(d);
          var p = d;
          return (
            (p._p = new Promise(function (b, C) {
              p.onload = b;
              p.onerror = C;
            })),
            zt(d, "link", i),
            (t.state.loading |= 4),
            Zo(d, a.precedence, e),
            (t.instance = d)
          );
        case "script":
          return (
            (d = tl(a.src)),
            (u = e.querySelector(hi(d)))
              ? ((t.instance = u), ot(u), u)
              : ((i = a),
                (u = xn.get(d)) && ((i = v({}, a)), ef(i, u)),
                (e = e.ownerDocument || e),
                (u = e.createElement("script")),
                ot(u),
                zt(u, "link", i),
                e.head.appendChild(u),
                (t.instance = u))
          );
        case "void":
          return null;
        default:
          throw Error(o(443, t.type));
      }
    else if (t.type === "stylesheet" && (t.state.loading & 4) === 0) {
      ((i = t.instance), (t.state.loading |= 4), Zo(i, a.precedence, e));
    }
    return t.instance;
  }
  function Zo(e, t, a) {
    for (
      var i = a.querySelectorAll(
          'link[rel="stylesheet"][data-precedence],style[data-precedence]',
        ),
        u = i.length ? i[i.length - 1] : null,
        d = u,
        p = 0;
      p < i.length;
      p++
    ) {
      var b = i[p];
      if (b.dataset.precedence === t) d = b;
      else if (d !== u) break;
    }
    d
      ? d.parentNode.insertBefore(e, d.nextSibling)
      : ((t = a.nodeType === 9 ? a.head : a), t.insertBefore(e, t.firstChild));
  }
  function Wc(e, t) {
    if (e.crossOrigin == null) {
      e.crossOrigin = t.crossOrigin;
    }
    if (e.referrerPolicy == null) {
      e.referrerPolicy = t.referrerPolicy;
    }
    if (e.title == null) {
      e.title = t.title;
    }
  }
  function ef(e, t) {
    if (e.crossOrigin == null) {
      e.crossOrigin = t.crossOrigin;
    }
    if (e.referrerPolicy == null) {
      e.referrerPolicy = t.referrerPolicy;
    }
    if (e.integrity == null) {
      e.integrity = t.integrity;
    }
  }
  var Jo = null;
  function W0(e, t, a) {
    if (Jo === null) {
      var i = new Map(),
        u = (Jo = new Map());
      u.set(a, i);
    } else {
      u = Jo;
      i = u.get(a);
      i || ((i = new Map()), u.set(a, i));
    }
    if (i.has(e)) return i;
    for (
      i.set(e, null), a = a.getElementsByTagName(e), u = 0;
      u < a.length;
      u++
    ) {
      var d = a[u];
      if (
        !(
          d[ct] ||
          d[fe] ||
          (e === "link" && d.getAttribute("rel") === "stylesheet")
        ) &&
        d.namespaceURI !== "http://www.w3.org/2000/svg"
      ) {
        var p = d.getAttribute(t) || "";
        p = e + p;
        var b = i.get(p);
        b ? b.push(d) : i.set(p, [d]);
      }
    }
    return i;
  }
  function eg(e, t, a) {
    e = e.ownerDocument || e;
    e.head.insertBefore(
      a,
      t === "title" ? e.querySelector("head > title") : null,
    );
  }
  function G1(e, t, a) {
    if (a === 1 || t.itemProp != null) return !1;
    switch (e) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (
          typeof t.precedence != "string" ||
          typeof t.href != "string" ||
          t.href === ""
        )
          break;
        return !0;
      case "link":
        if (
          typeof t.rel != "string" ||
          typeof t.href != "string" ||
          t.href === "" ||
          t.onLoad ||
          t.onError
        )
          break;
        return t.rel === "stylesheet"
          ? ((e = t.disabled), typeof t.precedence == "string" && e == null)
          : !0;
      case "script":
        if (
          t.async &&
          typeof t.async != "function" &&
          typeof t.async != "symbol" &&
          !t.onLoad &&
          !t.onError &&
          t.src &&
          typeof t.src == "string"
        )
          return !0;
    }
    return !1;
  }
  function tg(props) {
    return !(props.type === "stylesheet" && (props.state.loading & 3) === 0);
  }
  function F1(e, t, a, i) {
    if (
      a.type === "stylesheet" &&
      (typeof i.media != "string" || matchMedia(i.media).matches !== !1) &&
      (a.state.loading & 4) === 0
    ) {
      if (a.instance === null) {
        var u = el(i.href),
          d = t.querySelector(di(u));
        if (d) {
          t = d._p;
          if (
            t !== null &&
            typeof t == "object" &&
            typeof t.then == "function"
          ) {
            (e.count++, (e = Io.bind(e)), t.then(e, e));
          }
          a.state.loading |= 4;
          a.instance = d;
          ot(d);
          return;
        }
        d = t.ownerDocument || t;
        i = J0(i);
        if ((u = xn.get(u))) {
          Wc(i, u);
        }
        d = d.createElement("link");
        ot(d);
        var p = d;
        p._p = new Promise(function (b, C) {
          p.onload = b;
          p.onerror = C;
        });
        zt(d, "link", i);
        a.instance = d;
      }
      if (e.stylesheets === null) {
        e.stylesheets = new Map();
      }
      e.stylesheets.set(a, t);
      if ((t = a.state.preload) && (a.state.loading & 3) === 0) {
        (e.count++,
          (a = Io.bind(e)),
          t.addEventListener("load", a),
          t.addEventListener("error", a));
      }
    }
  }
  var tf = 0;
  function X1(e, t) {
    return (
      e.stylesheets && e.count === 0 && es(e, e.stylesheets),
      0 < e.count || 0 < e.imgCount
        ? function (a) {
            var i = setTimeout(function () {
              if ((e.stylesheets && es(e, e.stylesheets), e.unsuspend)) {
                var d = e.unsuspend;
                e.unsuspend = null;
                d();
              }
            }, 6e4 + t);
            if (0 < e.imgBytes && tf === 0) {
              tf = 62500 * T1();
            }
            var u = setTimeout(
              function () {
                if (
                  ((e.waitingForImages = !1),
                  e.count === 0 &&
                    (e.stylesheets && es(e, e.stylesheets), e.unsuspend))
                ) {
                  var d = e.unsuspend;
                  e.unsuspend = null;
                  d();
                }
              },
              (e.imgBytes > tf ? 50 : 800) + t,
            );
            return (
              (e.unsuspend = a),
              function () {
                e.unsuspend = null;
                clearTimeout(i);
                clearTimeout(u);
              }
            );
          }
        : null
    );
  }
  function Io() {
    if (
      (this.count--,
      this.count === 0 && (this.imgCount === 0 || !this.waitingForImages))
    ) {
      if (this.stylesheets) es(this, this.stylesheets);
      else if (this.unsuspend) {
        var e = this.unsuspend;
        this.unsuspend = null;
        e();
      }
    }
  }
  var Wo = null;
  function es(e, t) {
    e.stylesheets = null;
    if (e.unsuspend !== null) {
      (e.count++, (Wo = new Map()), t.forEach(P1, e), (Wo = null), Io.call(e));
    }
  }
  function P1(e, t) {
    if (!(t.state.loading & 4)) {
      var a = Wo.get(e);
      if (a) var i = a.get(null);
      else {
        a = new Map();
        Wo.set(e, a);
        for (
          var u = e.querySelectorAll(
              "link[data-precedence],style[data-precedence]",
            ),
            d = 0;
          d < u.length;
          d++
        ) {
          var p = u[d];
          if (p.nodeName === "LINK" || p.getAttribute("media") !== "not all") {
            (a.set(p.dataset.precedence, p), (i = p));
          }
        }
        if (i) {
          a.set(null, i);
        }
      }
      u = t.instance;
      p = u.getAttribute("data-precedence");
      d = a.get(p) || i;
      if (d === i) {
        a.set(null, u);
      }
      a.set(p, u);
      this.count++;
      i = Io.bind(this);
      u.addEventListener("load", i);
      u.addEventListener("error", i);
      d
        ? d.parentNode.insertBefore(u, d.nextSibling)
        : ((e = e.nodeType === 9 ? e.head : e),
          e.insertBefore(u, e.firstChild));
      t.state.loading |= 4;
    }
  }
  var mi = {
    $$typeof: F,
    Provider: null,
    Consumer: null,
    _currentValue: B,
    _currentValue2: B,
    _threadCount: 0,
  };
  function Q1(e, t, a, i, u, d, p, b, C) {
    this.tag = 1;
    this.containerInfo = e;
    this.pingCache = this.current = this.pendingChildren = null;
    this.timeoutHandle = -1;
    this.callbackNode =
      this.next =
      this.pendingContext =
      this.context =
      this.cancelPendingCommit =
        null;
    this.callbackPriority = 0;
    this.expirationTimes = ma(-1);
    this.entangledLanes =
      this.shellSuspendCounter =
      this.errorRecoveryDisabledLanes =
      this.expiredLanes =
      this.warmLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0;
    this.entanglements = ma(0);
    this.hiddenUpdates = ma(null);
    this.identifierPrefix = i;
    this.onUncaughtError = u;
    this.onCaughtError = d;
    this.onRecoverableError = p;
    this.pooledCache = null;
    this.pooledCacheLanes = 0;
    this.formState = C;
    this.incompleteTransitions = new Map();
  }
  function ng(e, t, a, i, u, d, p, b, C, q, Q, I) {
    return (
      (e = new Q1(e, t, a, p, C, q, Q, I, b)),
      (t = 1),
      d === !0 && (t |= 24),
      (d = rn(3, null, null, t)),
      (e.current = d),
      (d.stateNode = e),
      (t = zu()),
      t.refCount++,
      (e.pooledCache = t),
      t.refCount++,
      (d.memoizedState = {
        element: i,
        isDehydrated: a,
        cache: t,
      }),
      Hu(d),
      e
    );
  }
  function ag(e) {
    return e ? ((e = Nr), e) : Nr;
  }
  function rg(e, t, a, i, u, d) {
    u = ag(u);
    i.context === null ? (i.context = u) : (i.pendingContext = u);
    i = xa(t);
    i.payload = {
      element: a,
    };
    d = d === void 0 ? null : d;
    if (d !== null) {
      i.callback = d;
    }
    a = wa(e, i, t);
    if (a !== null) {
      (It(a, e, t), Xl(a, e, t));
    }
  }
  function lg(e, t) {
    if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
      var a = e.retryLane;
      e.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function nf(e, t) {
    lg(e, t);
    if ((e = e.alternate)) {
      lg(e, t);
    }
  }
  function ig(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = ar(e, 67108864);
      if (t !== null) {
        It(t, e, 67108864);
      }
      nf(e, 67108864);
    }
  }
  function og(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = cn();
      t = G(t);
      var a = ar(e, t);
      if (a !== null) {
        It(a, e, t);
      }
      nf(e, t);
    }
  }
  var ts = !0;
  function K1(e, t, a, i) {
    var u = T.T;
    T.T = null;
    var d = V.p;
    try {
      V.p = 2;
      af(e, t, a, i);
    } finally {
      V.p = d;
      T.T = u;
    }
  }
  function Z1(e, t, a, i) {
    var u = T.T;
    T.T = null;
    var d = V.p;
    try {
      V.p = 8;
      af(e, t, a, i);
    } finally {
      V.p = d;
      T.T = u;
    }
  }
  function af(e, t, a, i) {
    if (ts) {
      var u = rf(i);
      if (u === null) {
        Yc(e, t, i, ns, a);
        ug(e, i);
      } else if (I1(u, e, t, a, i)) i.stopPropagation();
      else if ((ug(e, i), t & 4 && -1 < J1.indexOf(e))) {
        for (; u !== null; ) {
          var d = $e(u);
          if (d !== null)
            switch (d.tag) {
              case 3:
                if (((d = d.stateNode), d.current.memoizedState.isDehydrated)) {
                  var p = Xn(d.pendingLanes);
                  if (p !== 0) {
                    var b = d;
                    for (b.pendingLanes |= 2, b.entangledLanes |= 2; p; ) {
                      var C = 1 << (31 - jt(p));
                      b.entanglements[1] |= C;
                      p &= ~C;
                    }
                    $n(d);
                    if ((Qe & 6) === 0) {
                      ((Ho = pt() + 500), si(0));
                    }
                  }
                }
                break;
              case 31:
              case 13:
                b = ar(d, 2);
                if (b !== null) {
                  It(b, d, 2);
                }
                $o();
                nf(d, 2);
            }
          if (((d = rf(i)), d === null && Yc(e, t, i, ns, a), d === u)) break;
          u = d;
        }
        if (u !== null) {
          i.stopPropagation();
        }
      } else Yc(e, t, i, null, a);
    }
  }
  function rf(e) {
    return ((e = iu(e)), lf(e));
  }
  var ns = null;
  function lf(e) {
    if (((ns = null), (e = ht(e)), e !== null)) {
      var t = c(e);
      if (t === null) e = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (((e = f(t)), e !== null)) return e;
          e = null;
        } else if (a === 31) {
          if (((e = m(t)), e !== null)) return e;
          e = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          e = null;
        } else if (t !== e) {
          e = null;
        }
      }
    }
    return ((ns = e), null);
  }
  function sg(e) {
    switch (e) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (Fa()) {
          case Ol:
            return 2;
          case wr:
            return 8;
          case Ft:
          case On:
            return 32;
          case Cl:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var of = !1,
    za = null,
    ka = null,
    ja = null,
    gi = new Map(),
    pi = new Map(),
    Ua = [],
    J1 =
      "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
        " ",
      );
  function ug(e, t) {
    switch (e) {
      case "focusin":
      case "focusout":
        za = null;
        break;
      case "dragenter":
      case "dragleave":
        ka = null;
        break;
      case "mouseover":
      case "mouseout":
        ja = null;
        break;
      case "pointerover":
      case "pointerout":
        gi.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        pi.delete(t.pointerId);
    }
  }
  function yi(e, t, a, i, u, d) {
    return e === null || e.nativeEvent !== d
      ? ((e = {
          blockedOn: t,
          domEventName: a,
          eventSystemFlags: i,
          nativeEvent: d,
          targetContainers: [u],
        }),
        t !== null && ((t = $e(t)), t !== null && ig(t)),
        e)
      : ((e.eventSystemFlags |= i),
        (t = e.targetContainers),
        u !== null && t.indexOf(u) === -1 && t.push(u),
        e);
  }
  function I1(e, t, a, i, u) {
    switch (t) {
      case "focusin":
        return ((za = yi(za, e, t, a, i, u)), !0);
      case "dragenter":
        return ((ka = yi(ka, e, t, a, i, u)), !0);
      case "mouseover":
        return ((ja = yi(ja, e, t, a, i, u)), !0);
      case "pointerover":
        var d = u.pointerId;
        return (gi.set(d, yi(gi.get(d) || null, e, t, a, i, u)), !0);
      case "gotpointercapture":
        return (
          (d = u.pointerId),
          pi.set(d, yi(pi.get(d) || null, e, t, a, i, u)),
          !0
        );
    }
    return !1;
  }
  function cg(event) {
    var t = ht(event.target);
    if (t !== null) {
      var a = c(t);
      if (a !== null) {
        if (((t = a.tag), t === 13)) {
          if (((t = f(a)), t !== null)) {
            event.blockedOn = t;
            Se(event.priority, function () {
              og(a);
            });
            return;
          }
        } else if (t === 31) {
          if (((t = m(a)), t !== null)) {
            event.blockedOn = t;
            Se(event.priority, function () {
              og(a);
            });
            return;
          }
        } else if (t === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          event.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    event.blockedOn = null;
  }
  function as(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
      var a = rf(e.nativeEvent);
      if (a === null) {
        a = e.nativeEvent;
        var i = new a.constructor(a.type, a);
        lu = i;
        a.target.dispatchEvent(i);
        lu = null;
      } else return ((t = $e(a)), t !== null && ig(t), (e.blockedOn = a), !1);
      t.shift();
    }
    return !0;
  }
  function fg(e, t, a) {
    if (as(e)) {
      a.delete(t);
    }
  }
  function W1() {
    of = !1;
    if (za !== null && as(za)) {
      za = null;
    }
    if (ka !== null && as(ka)) {
      ka = null;
    }
    if (ja !== null && as(ja)) {
      ja = null;
    }
    gi.forEach(fg);
    pi.forEach(fg);
  }
  function rs(e, t) {
    if (e.blockedOn === t) {
      ((e.blockedOn = null),
        of ||
          ((of = !0),
          n.unstable_scheduleCallback(n.unstable_NormalPriority, W1)));
    }
  }
  var ls = null;
  function dg(e) {
    if (ls !== e) {
      ((ls = e),
        n.unstable_scheduleCallback(n.unstable_NormalPriority, function () {
          if (ls === e) {
            ls = null;
          }
          for (var t = 0; t < e.length; t += 3) {
            var a = e[t],
              i = e[t + 1],
              u = e[t + 2];
            if (typeof i != "function") {
              if (lf(i || a) === null) continue;
              break;
            }
            var d = $e(a);
            if (d !== null) {
              (e.splice(t, 3),
                (t -= 3),
                rc(
                  d,
                  {
                    pending: !0,
                    data: u,
                    method: a.method,
                    action: i,
                  },
                  i,
                  u,
                ));
            }
          }
        }));
    }
  }
  function nl(e) {
    function t(C) {
      return rs(C, e);
    }
    if (za !== null) {
      rs(za, e);
    }
    if (ka !== null) {
      rs(ka, e);
    }
    if (ja !== null) {
      rs(ja, e);
    }
    gi.forEach(t);
    pi.forEach(t);
    for (var a = 0; a < Ua.length; a++) {
      var i = Ua[a];
      if (i.blockedOn === e) {
        i.blockedOn = null;
      }
    }
    for (; 0 < Ua.length && ((a = Ua[0]), a.blockedOn === null); ) {
      cg(a);
      if (a.blockedOn === null) {
        Ua.shift();
      }
    }
    if (((a = (e.ownerDocument || e).$$reactFormReplay), a != null))
      for (i = 0; i < a.length; i += 3) {
        var u = a[i],
          d = a[i + 1],
          p = u[ge] || null;
        if (typeof d == "function") p || dg(a);
        else if (p) {
          var b = null;
          if (d && d.hasAttribute("formAction")) {
            if (((u = d), (p = d[ge] || null))) b = p.formAction;
            else if (lf(u) !== null) continue;
          } else b = p.action;
          typeof b == "function" ? (a[i + 1] = b) : (a.splice(i, 3), (i -= 3));
          dg(a);
        }
      }
  }
  function hg() {
    function e(d) {
      if (d.canIntercept && d.info === "react-transition") {
        d.intercept({
          handler: function () {
            return new Promise(function (p) {
              return (u = p);
            });
          },
          focusReset: "manual",
          scroll: "manual",
        });
      }
    }
    function t() {
      if (u !== null) {
        (u(), (u = null));
      }
      i || setTimeout(a, 20);
    }
    function a() {
      if (!i && !navigation.transition) {
        var d = navigation.currentEntry;
        if (d && d.url != null) {
          navigation.navigate(d.url, {
            state: d.getState(),
            info: "react-transition",
            history: "replace",
          });
        }
      }
    }
    if (typeof navigation == "object") {
      var i = !1,
        u = null;
      return (
        navigation.addEventListener("navigate", e),
        navigation.addEventListener("navigatesuccess", t),
        navigation.addEventListener("navigateerror", t),
        setTimeout(a, 100),
        function () {
          i = !0;
          navigation.removeEventListener("navigate", e);
          navigation.removeEventListener("navigatesuccess", t);
          navigation.removeEventListener("navigateerror", t);
          if (u !== null) {
            (u(), (u = null));
          }
        }
      );
    }
  }
  function sf(e) {
    this._internalRoot = e;
  }
  is.prototype.render = sf.prototype.render = function (e) {
    var t = this._internalRoot;
    if (t === null) throw Error(o(409));
    var a = t.current,
      i = cn();
    rg(a, i, e, t, null, null);
  };
  is.prototype.unmount = sf.prototype.unmount = function () {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var t = e.containerInfo;
      rg(e.current, 2, null, e, null, null);
      $o();
      t[ve] = null;
    }
  };
  function is(e) {
    this._internalRoot = e;
  }
  is.prototype.unstable_scheduleHydration = function (e) {
    if (e) {
      var t = se();
      e = {
        blockedOn: null,
        target: e,
        priority: t,
      };
      for (var a = 0; a < Ua.length && t !== 0 && t < Ua[a].priority; a++);
      Ua.splice(a, 0, e);
      if (a === 0) {
        cg(e);
      }
    }
  };
  var mg = r.version;
  if (mg !== "19.2.3") throw Error(o(527, mg, "19.2.3"));
  V.findDOMNode = function (e) {
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == "function"
        ? Error(o(188))
        : ((e = Object.keys(e).join(",")), Error(o(268, e)));
    return (
      (e = h(t)),
      (e = e !== null ? y(e) : null),
      (e = e === null ? null : e.stateNode),
      e
    );
  };
  var eS = {
    bundleType: 0,
    version: "19.2.3",
    rendererPackageName: "react-dom",
    currentDispatcherRef: T,
    reconcilerVersion: "19.2.3",
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var os = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!os.isDisabled && os.supportsFiber)
      try {
        Xa = os.inject(eS);
        ut = os;
      } catch {}
  }
  return (
    (bi.createRoot = function (e, t) {
      if (!s(e)) throw Error(o(299));
      var a = !1,
        i = "",
        u = Em,
        d = xm,
        p = wm;
      return (
        t != null &&
          (t.unstable_strictMode === !0 && (a = !0),
          t.identifierPrefix !== void 0 && (i = t.identifierPrefix),
          t.onUncaughtError !== void 0 && (u = t.onUncaughtError),
          t.onCaughtError !== void 0 && (d = t.onCaughtError),
          t.onRecoverableError !== void 0 && (p = t.onRecoverableError)),
        (t = ng(e, 1, !1, null, null, a, i, null, u, d, p, hg)),
        (e[ve] = t.current),
        Vc(e),
        new sf(t)
      );
    }),
    (bi.hydrateRoot = function (e, t, a) {
      if (!s(e)) throw Error(o(299));
      var i = !1,
        u = "",
        d = Em,
        p = xm,
        b = wm,
        C = null;
      return (
        a != null &&
          (a.unstable_strictMode === !0 && (i = !0),
          a.identifierPrefix !== void 0 && (u = a.identifierPrefix),
          a.onUncaughtError !== void 0 && (d = a.onUncaughtError),
          a.onCaughtError !== void 0 && (p = a.onCaughtError),
          a.onRecoverableError !== void 0 && (b = a.onRecoverableError),
          a.formState !== void 0 && (C = a.formState)),
        (t = ng(e, 1, !0, t, a ?? null, i, u, C, d, p, b, hg)),
        (t.context = ag(null)),
        (a = t.current),
        (i = cn()),
        (i = G(i)),
        (u = xa(i)),
        (u.callback = null),
        wa(a, u, i),
        (a = i),
        (t.current.lanes = a),
        ga(t, a),
        $n(t),
        (e[ve] = t.current),
        Vc(e),
        new is(t)
      );
    }),
    (bi.version = "19.2.3"),
    bi
  );
}
var Rg;
function cS() {
  if (Rg) return cf.exports;
  Rg = 1;
  function n() {
    if (
      !(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
      )
    )
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
      } catch (r) {
        console.error(r);
      }
  }
  return (n(), (cf.exports = uS()), cf.exports);
}
var fS = cS(),
  E = sd();
const dS = ji(E),
  hS = nS(
    {
      __proto__: null,
      default: dS,
    },
    [E],
  );
/* ---- React Router Library ---- */
var yy = (n) => {
    throw TypeError(n);
  },
  mS = (n, r, l) => {
    return r.has(n) || yy("Cannot " + l);
  },
  gf = (n, r, l) => {
    return (mS(n, r, "read from private field"), l ? l.call(n) : r.get(n));
  },
  gS = (n, r, l) => {
    if (r.has(n)) {
      return yy("Cannot add the same private member more than once");
    }
    if (r instanceof WeakSet) {
      return r.add(n);
    }
    return r.set(n, l);
  },
  _g = "popstate";
function pS(n = {}) {
  function r(o, s) {
    let { pathname: c, search: f, hash: m } = o.location;
    return Mi(
      "",
      {
        pathname: c,
        search: f,
        hash: m,
      },
      (s.state && s.state.usr) || null,
      (s.state && s.state.key) || "default",
    );
  }
  function l(o, s) {
    return typeof s == "string" ? s : Gn(s);
  }
  return vS(r, l, null, n);
}
function Me(n, r) {
  if (n === !1 || n === null || typeof n > "u") throw new Error(r);
}
function it(n, r) {
  if (!n) {
    if (typeof console < "u") {
      console.warn(r);
    }
    try {
      throw new Error(r);
    } catch {}
  }
}
function yS() {
  return Math.random().toString(36).substring(2, 10);
}
function Tg(n, r) {
  return {
    usr: n.state,
    key: n.key,
    idx: r,
  };
}
function Mi(n, r, l = null, o) {
  return {
    pathname: typeof n == "string" ? n : n.pathname,
    search: "",
    hash: "",
    ...(typeof r == "string" ? Ga(r) : r),
    state: l,
    key: (r && r.key) || o || yS(),
  };
}
function Gn({ pathname: n = "/", search: r = "", hash: l = "" }) {
  return (
    r && r !== "?" && (n += r.charAt(0) === "?" ? r : "?" + r),
    l && l !== "#" && (n += l.charAt(0) === "#" ? l : "#" + l),
    n
  );
}
function Ga(n) {
  let r = {};
  if (n) {
    let l = n.indexOf("#");
    if (l >= 0) {
      ((r.hash = n.substring(l)), (n = n.substring(0, l)));
    }
    let o = n.indexOf("?");
    if (o >= 0) {
      ((r.search = n.substring(o)), (n = n.substring(0, o)));
    }
    if (n) {
      r.pathname = n;
    }
  }
  return r;
}
function vS(n, r, l, o = {}) {
  let { window: s = document.defaultView, v5Compat: c = !1 } = o,
    f = s.history,
    m = "POP",
    g = null,
    h = y();
  if (h == null) {
    ((h = 0),
      f.replaceState(
        {
          ...f.state,
          idx: h,
        },
        "",
      ));
  }
  function y() {
    return (
      f.state || {
        idx: null,
      }
    ).idx;
  }
  function v() {
    m = "POP";
    let A = y(),
      z = A == null ? null : A - h;
    h = A;
    if (g) {
      g({
        action: m,
        location: _.location,
        delta: z,
      });
    }
  }
  function S(A, z) {
    m = "PUSH";
    let M = Mi(_.location, A, z);
    h = y() + 1;
    let F = Tg(M, h),
      te = _.createHref(M);
    try {
      f.pushState(F, "", te);
    } catch (U) {
      if (U instanceof DOMException && U.name === "DataCloneError") throw U;
      s.location.assign(te);
    }
    if (c && g) {
      g({
        action: m,
        location: _.location,
        delta: 1,
      });
    }
  }
  function w(A, z) {
    m = "REPLACE";
    let M = Mi(_.location, A, z);
    h = y();
    let F = Tg(M, h),
      te = _.createHref(M);
    f.replaceState(F, "", te);
    if (c && g) {
      g({
        action: m,
        location: _.location,
        delta: 0,
      });
    }
  }
  function x(A) {
    return vy(A);
  }
  let _ = {
    get action() {
      return m;
    },
    get location() {
      return n(s, f);
    },
    listen(A) {
      if (g) throw new Error("A history only accepts one active listener");
      return (
        s.addEventListener(_g, v),
        (g = A),
        () => {
          s.removeEventListener(_g, v);
          g = null;
        }
      );
    },
    createHref(A) {
      return r(s, A);
    },
    createURL: x,
    encodeLocation(A) {
      let z = x(A);
      return {
        pathname: z.pathname,
        search: z.search,
        hash: z.hash,
      };
    },
    push: S,
    replace: w,
    go(A) {
      return f.go(A);
    },
  };
  return _;
}
function vy(n, r = !1) {
  let l = "http://localhost";
  if (typeof window < "u") {
    l =
      window.location.origin !== "null"
        ? window.location.origin
        : window.location.href;
  }
  Me(l, "No window.location.(origin|href) available to create URL");
  let o = typeof n == "string" ? n : Gn(n);
  return (
    (o = o.replace(/ $/, "%20")),
    !r && o.startsWith("//") && (o = l + o),
    new URL(o, l)
  );
}
var Oi,
  Og = class {
    constructor(n) {
      if ((gS(this, Oi, new Map()), n)) for (let [r, l] of n) this.set(r, l);
    }
    get(n) {
      if (gf(this, Oi).has(n)) return gf(this, Oi).get(n);
      if (n.defaultValue !== void 0) return n.defaultValue;
      throw new Error("No value found for context");
    }
    set(n, r) {
      gf(this, Oi).set(n, r);
    }
  };
Oi = new WeakMap();
var bS = new Set(["lazy", "caseSensitive", "path", "id", "index", "children"]);
function SS(n) {
  return bS.has(n);
}
var ES = new Set([
  "lazy",
  "caseSensitive",
  "path",
  "id",
  "index",
  "middleware",
  "children",
]);
function xS(n) {
  return ES.has(n);
}
function wS(n) {
  return n.index === !0;
}
function zi(n, r, l = [], o = {}, s = !1) {
  return n.map((item, index) => {
    let m = [...l, String(index)],
      g = typeof item.id == "string" ? item.id : m.join("-");
    if (
      (Me(
        item.index !== !0 || !item.children,
        "Cannot specify children on an index route",
      ),
      Me(
        s || !o[g],
        `Found a route id collision on id "${g}".  Route id's must be globally unique within Data Router usages`,
      ),
      wS(item))
    ) {
      let h = {
        ...item,
        id: g,
      };
      return ((o[g] = Cg(h, r(h))), h);
    } else {
      let h = {
        ...item,
        id: g,
        children: void 0,
      };
      return (
        (o[g] = Cg(h, r(h))),
        item.children && (h.children = zi(item.children, r, m, o, s)),
        h
      );
    }
  });
}
function Cg(n, r) {
  return Object.assign(n, {
    ...r,
    ...(typeof r.lazy == "object" && r.lazy != null
      ? {
          lazy: {
            ...n.lazy,
            ...r.lazy,
          },
        }
      : {}),
  });
}
function qa(n, r, l = "/") {
  return Ci(n, r, l, !1);
}
function Ci(n, r, l, o) {
  let s = typeof r == "string" ? Ga(r) : r,
    c = dn(s.pathname || "/", l);
  if (c == null) return null;
  let f = Sy(n);
  RS(f);
  let m = null;
  for (let g = 0; m == null && g < f.length; ++g) {
    let h = kS(c);
    m = MS(f[g], h, o);
  }
  return m;
}
function by(n, r) {
  let { route: l, pathname: o, params: s } = n;
  return {
    id: l.id,
    pathname: o,
    params: s,
    data: r[l.id],
    loaderData: r[l.id],
    handle: l.handle,
  };
}
function Sy(n, r = [], l = [], o = "", s = !1) {
  let c = (f, m, g = s, h) => {
    let y = {
      relativePath: h === void 0 ? f.path || "" : h,
      caseSensitive: f.caseSensitive === !0,
      childrenIndex: m,
      route: f,
    };
    if (y.relativePath.startsWith("/")) {
      if (!y.relativePath.startsWith(o) && g) return;
      Me(
        y.relativePath.startsWith(o),
        `Absolute route path "${y.relativePath}" nested under path "${o}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`,
      );
      y.relativePath = y.relativePath.slice(o.length);
    }
    let v = Yn([o, y.relativePath]),
      S = l.concat(y);
    if (f.children && f.children.length > 0) {
      (Me(
        f.index !== !0,
        `Index routes must not have child routes. Please remove all child routes from route path "${v}".`,
      ),
        Sy(f.children, r, S, v, g));
    }
    if (!(f.path == null && !f.index)) {
      r.push({
        path: v,
        score: LS(v, f.index),
        routesMeta: S,
      });
    }
  };
  return (
    n.forEach((item, index) => {
      if (item.path === "" || !item.path?.includes("?")) c(item, index);
      else for (let g of Ey(item.path)) c(item, index, !0, g);
    }),
    r
  );
}
function Ey(n) {
  let r = n.split("/");
  if (r.length === 0) return [];
  let [l, ...o] = r,
    s = l.endsWith("?"),
    c = l.replace(/\?$/, "");
  if (o.length === 0) return s ? [c, ""] : [c];
  let f = Ey(o.join("/")),
    m = [];
  return (
    m.push(...f.map((item) => (item === "" ? c : [c, item].join("/")))),
    s && m.push(...f),
    m.map((item) => (n.startsWith("/") && item === "" ? "/" : item))
  );
}
function RS(n) {
  n.sort((a, b) =>
    a.score !== b.score
      ? b.score - a.score
      : NS(
          a.routesMeta.map((item) => item.childrenIndex),
          b.routesMeta.map((item) => item.childrenIndex),
        ),
  );
}
var _S = /^:[\w-]+$/,
  TS = 3,
  OS = 2,
  CS = 1,
  AS = 10,
  DS = -2,
  Ag = (n) => n === "*";
function LS(n, r) {
  let l = n.split("/"),
    o = l.length;
  return (
    l.some(Ag) && (o += DS),
    r && (o += OS),
    l
      .filter((item) => !Ag(item))
      .reduce(
        (item, acc) => item + (_S.test(acc) ? TS : acc === "" ? CS : AS),
        o,
      )
  );
}
function NS(n, r) {
  return n.length === r.length &&
    n.slice(0, -1).every((item, index) => item === r[index])
    ? n[n.length - 1] - r[r.length - 1]
    : 0;
}
function MS(n, r, l = !1) {
  let { routesMeta: o } = n,
    s = {},
    c = "/",
    f = [];
  for (let m = 0; m < o.length; ++m) {
    let g = o[m],
      h = m === o.length - 1,
      y = c === "/" ? r : r.slice(c.length) || "/",
      v = Cs(
        {
          path: g.relativePath,
          caseSensitive: g.caseSensitive,
          end: h,
        },
        y,
      ),
      S = g.route;
    if (
      (!v &&
        h &&
        l &&
        !o[o.length - 1].route.index &&
        (v = Cs(
          {
            path: g.relativePath,
            caseSensitive: g.caseSensitive,
            end: !1,
          },
          y,
        )),
      !v)
    )
      return null;
    Object.assign(s, v.params);
    f.push({
      params: s,
      pathname: Yn([c, v.pathname]),
      pathnameBase: HS(Yn([c, v.pathnameBase])),
      route: S,
    });
    if (v.pathnameBase !== "/") {
      c = Yn([c, v.pathnameBase]);
    }
  }
  return f;
}
function Cs(n, r) {
  if (typeof n == "string") {
    n = {
      path: n,
      caseSensitive: !1,
      end: !0,
    };
  }
  let [l, o] = zS(n.path, n.caseSensitive, n.end),
    s = r.match(l);
  if (!s) return null;
  let c = s[0],
    f = c.replace(/(.)\/+$/, "$1"),
    m = s.slice(1);
  return {
    params: o.reduce((item, { paramName: y, isOptional: v }, S) => {
      if (y === "*") {
        let x = m[S] || "";
        f = c.slice(0, c.length - x.length).replace(/(.)\/+$/, "$1");
      }
      const w = m[S];
      return (
        v && !w
          ? (item[y] = void 0)
          : (item[y] = (w || "").replace(/%2F/g, "/")),
        item
      );
    }, {}),
    pathname: c,
    pathnameBase: f,
    pattern: n,
  };
}
function zS(n, r = !1, l = !0) {
  it(
    n === "*" || !n.endsWith("*") || n.endsWith("/*"),
    `Route path "${n}" will be treated as if it were "${n.replace(/\*$/, "/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${n.replace(/\*$/, "/*")}".`,
  );
  let o = [],
    s =
      "^" +
      n
        .replace(/\/*\*?$/, "")
        .replace(/^\/*/, "/")
        .replace(/[\\.*+^${}|()[\]]/g, "\\$&")
        .replace(
          /\/:([\w-]+)(\?)?/g,
          (f, m, g) => (
            o.push({
              paramName: m,
              isOptional: g != null,
            }),
            g ? "/?([^\\/]+)?" : "/([^\\/]+)"
          ),
        )
        .replace(/\/([\w-]+)\?(\/|$)/g, "(/$1)?$2");
  return (
    n.endsWith("*")
      ? (o.push({
          paramName: "*",
        }),
        (s += n === "*" || n === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$"))
      : l
        ? (s += "\\/*$")
        : n !== "" && n !== "/" && (s += "(?:(?=\\/|$))"),
    [new RegExp(s, r ? void 0 : "i"), o]
  );
}
function kS(n) {
  try {
    return n
      .split("/")
      .map((item) => decodeURIComponent(item).replace(/\//g, "%2F"))
      .join("/");
  } catch (r) {
    return (
      it(
        !1,
        `The URL path "${n}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${r}).`,
      ),
      n
    );
  }
}
function dn(n, r) {
  if (r === "/") return n;
  if (!n.toLowerCase().startsWith(r.toLowerCase())) return null;
  let l = r.endsWith("/") ? r.length - 1 : r.length,
    o = n.charAt(l);
  return o && o !== "/" ? null : n.slice(l) || "/";
}
function jS({ basename: n, pathname: r }) {
  return r === "/" ? n : Yn([n, r]);
}
var xy = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  zs = (n) => xy.test(n);
function US(n, r = "/") {
  let {
      pathname: l,
      search: o = "",
      hash: s = "",
    } = typeof n == "string" ? Ga(n) : n,
    c;
  if (l) {
    if (zs(l)) c = l;
    else {
      if (l.includes("//")) {
        let f = l;
        l = l.replace(/\/\/+/g, "/");
        it(
          !1,
          `Pathnames cannot have embedded double slashes - normalizing ${f} -> ${l}`,
        );
      }
      l.startsWith("/") ? (c = Dg(l.substring(1), "/")) : (c = Dg(l, r));
    }
  } else c = r;
  return {
    pathname: c,
    search: BS(o),
    hash: $S(s),
  };
}
function Dg(n, r) {
  let l = r.replace(/\/+$/, "").split("/");
  return (
    n.split("/").forEach((item) => {
      item === ".." ? l.length > 1 && l.pop() : item !== "." && l.push(item);
    }),
    l.length > 1 ? l.join("/") : "/"
  );
}
function pf(n, r, l, o) {
  return `Cannot include a '${n}' character in a manually specified \`to.${r}\` field [${JSON.stringify(o)}].  Please separate it out to the \`to.${l}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function wy(n) {
  return n.filter(
    (item, index) =>
      index === 0 || (item.route.path && item.route.path.length > 0),
  );
}
function ks(n) {
  let r = wy(n);
  return r.map((item, index) =>
    index === r.length - 1 ? item.pathname : item.pathnameBase,
  );
}
function js(n, r, l, o = !1) {
  let s;
  typeof n == "string"
    ? (s = Ga(n))
    : ((s = {
        ...n,
      }),
      Me(
        !s.pathname || !s.pathname.includes("?"),
        pf("?", "pathname", "search", s),
      ),
      Me(
        !s.pathname || !s.pathname.includes("#"),
        pf("#", "pathname", "hash", s),
      ),
      Me(!s.search || !s.search.includes("#"), pf("#", "search", "hash", s)));
  let c = n === "" || s.pathname === "",
    f = c ? "/" : s.pathname,
    m;
  if (f == null) m = l;
  else {
    let v = r.length - 1;
    if (!o && f.startsWith("..")) {
      let S = f.split("/");
      for (; S[0] === ".."; ) {
        S.shift();
        v -= 1;
      }
      s.pathname = S.join("/");
    }
    m = v >= 0 ? r[v] : "/";
  }
  let g = US(s, m),
    h = f && f !== "/" && f.endsWith("/"),
    y = (c || f === ".") && l.endsWith("/");
  return (!g.pathname.endsWith("/") && (h || y) && (g.pathname += "/"), g);
}
var Yn = (n) => n.join("/").replace(/\/\/+/g, "/"),
  HS = (n) => n.replace(/\/+$/, "").replace(/^\/*/, "/"),
  BS = (n) => {
    if (!n || n === "?") {
      return "";
    }
    if (n.startsWith("?")) {
      return n;
    }
    return "?" + n;
  },
  $S = (n) => {
    if (!n || n === "#") {
      return "";
    }
    if (n.startsWith("#")) {
      return n;
    }
    return "#" + n;
  },
  Ui = class {
    constructor(n, r, l, o = !1) {
      this.status = n;
      this.statusText = r || "";
      this.internal = o;
      l instanceof Error
        ? ((this.data = l.toString()), (this.error = l))
        : (this.data = l);
    }
  };
function hl(n) {
  return (
    n != null &&
    typeof n.status == "number" &&
    typeof n.statusText == "string" &&
    typeof n.internal == "boolean" &&
    "data" in n
  );
}
function Hi(n) {
  return (
    n
      .map((item) => item.route.path)
      .filter(Boolean)
      .join("/")
      .replace(/\/\/*/g, "/") || "/"
  );
}
var Ry =
  typeof window < "u" &&
  typeof window.document < "u" &&
  typeof window.document.createElement < "u";
function _y(n, r) {
  let l = n;
  if (typeof l != "string" || !xy.test(l))
    return {
      absoluteURL: void 0,
      isExternal: !1,
      to: l,
    };
  let o = l,
    s = !1;
  if (Ry)
    try {
      let c = new URL(window.location.href),
        f = l.startsWith("//") ? new URL(c.protocol + l) : new URL(l),
        m = dn(f.pathname, r);
      f.origin === c.origin && m != null
        ? (l = m + f.search + f.hash)
        : (s = !0);
    } catch {
      it(
        !1,
        `<Link to="${l}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`,
      );
    }
  return {
    absoluteURL: o,
    isExternal: s,
    to: l,
  };
}
var Ya = Symbol("Uninstrumented");
function qS(n, r) {
  let l = {
    lazy: [],
    "lazy.loader": [],
    "lazy.action": [],
    "lazy.middleware": [],
    middleware: [],
    loader: [],
    action: [],
  };
  n.forEach((item) =>
    item({
      id: r.id,
      index: r.index,
      path: r.path,
      instrument(c) {
        let f = Object.keys(l);
        for (let m of f)
          if (c[m]) {
            l[m].push(c[m]);
          }
      },
    }),
  );
  let o = {};
  if (typeof r.lazy == "function" && l.lazy.length > 0) {
    let s = sl(l.lazy, r.lazy, () => {});
    if (s) {
      o.lazy = s;
    }
  }
  if (typeof r.lazy == "object") {
    let s = r.lazy;
    ["middleware", "loader", "action"].forEach((item) => {
      let f = s[item],
        m = l[`lazy.${item}`];
      if (typeof f == "function" && m.length > 0) {
        let g = sl(m, f, () => {});
        if (g) {
          o.lazy = Object.assign(o.lazy || {}, {
            [item]: g,
          });
        }
      }
    });
  }
  return (
    ["loader", "action"].forEach((item) => {
      let c = r[item];
      if (typeof c == "function" && l[item].length > 0) {
        let f = c[Ya] ?? c,
          m = sl(l[item], f, (...g) => Lg(g[0]));
        if (m) {
          ((m[Ya] = f), (o[item] = m));
        }
      }
    }),
    r.middleware &&
      r.middleware.length > 0 &&
      l.middleware.length > 0 &&
      (o.middleware = r.middleware.map((item) => {
        let c = item[Ya] ?? item,
          f = sl(l.middleware, c, (...m) => Lg(m[0]));
        return f ? ((f[Ya] = c), f) : item;
      })),
    o
  );
}
function VS(n, r) {
  let l = {
    navigate: [],
    fetch: [],
  };
  if (
    (r.forEach((item) =>
      item({
        instrument(s) {
          let c = Object.keys(s);
          for (let f of c)
            if (s[f]) {
              l[f].push(s[f]);
            }
        },
      }),
    ),
    l.navigate.length > 0)
  ) {
    let o = n.navigate[Ya] ?? n.navigate,
      s = sl(l.navigate, o, (...c) => {
        let [f, m] = c;
        return {
          to:
            typeof f == "number" || typeof f == "string" ? f : f ? Gn(f) : ".",
          ...Ng(n, m ?? {}),
        };
      });
    if (s) {
      ((s[Ya] = o), (n.navigate = s));
    }
  }
  if (l.fetch.length > 0) {
    let o = n.fetch[Ya] ?? n.fetch,
      s = sl(l.fetch, o, (...c) => {
        let [f, , m, g] = c;
        return {
          href: m ?? ".",
          fetcherKey: f,
          ...Ng(n, g ?? {}),
        };
      });
    if (s) {
      ((s[Ya] = o), (n.fetch = s));
    }
  }
  return n;
}
function sl(n, r, l) {
  return n.length === 0
    ? null
    : async (...o) => {
        let s = await Ty(n, l(...o), () => r(...o), n.length - 1);
        if (s.type === "error") throw s.value;
        return s.value;
      };
}
async function Ty(n, r, l, o) {
  let s = n[o],
    c;
  if (s) {
    let f,
      m = async () => {
        return (
          f
            ? console.error(
                "You cannot call instrumented handlers more than once",
              )
            : (f = Ty(n, r, l, o - 1)),
          (c = await f),
          Me(c, "Expected a result"),
          c.type === "error" && c.value instanceof Error
            ? {
                status: "error",
                error: c.value,
              }
            : {
                status: "success",
                error: void 0,
              }
        );
      };
    try {
      await s(m, r);
    } catch (g) {
      console.error("An instrumentation function threw an error:", g);
    }
    f || (await m());
    await f;
  } else
    try {
      c = {
        type: "success",
        value: await l(),
      };
    } catch (f) {
      c = {
        type: "error",
        value: f,
      };
    }
  return (
    c || {
      type: "error",
      value: new Error("No result assigned in instrumentation chain."),
    }
  );
}
function Lg(props) {
  let { request: r, context: l, params: o, unstable_pattern: s } = props;
  return {
    request: YS(r),
    params: {
      ...o,
    },
    unstable_pattern: s,
    context: GS(l),
  };
}
function Ng(n, r) {
  return {
    currentUrl: Gn(n.state.location),
    ...("formMethod" in r
      ? {
          formMethod: r.formMethod,
        }
      : {}),
    ...("formEncType" in r
      ? {
          formEncType: r.formEncType,
        }
      : {}),
    ...("formData" in r
      ? {
          formData: r.formData,
        }
      : {}),
    ...("body" in r
      ? {
          body: r.body,
        }
      : {}),
  };
}
function YS(n) {
  return {
    method: n.method,
    url: n.url,
    headers: {
      get: (...r) => n.headers.get(...r),
    },
  };
}
function GS(n) {
  if (XS(n)) {
    let r = {
      ...n,
    };
    return (Object.freeze(r), r);
  } else
    return {
      get: (r) => n.get(r),
    };
}
var FS = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function XS(n) {
  if (n === null || typeof n != "object") return !1;
  const r = Object.getPrototypeOf(n);
  return (
    r === Object.prototype ||
    r === null ||
    Object.getOwnPropertyNames(r).sort().join("\0") === FS
  );
}
var Oy = ["POST", "PUT", "PATCH", "DELETE"],
  PS = new Set(Oy),
  QS = ["GET", ...Oy],
  KS = new Set(QS),
  Cy = new Set([301, 302, 303, 307, 308]),
  ZS = new Set([307, 308]),
  yf = {
    state: "idle",
    location: void 0,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
  },
  JS = {
    state: "idle",
    data: void 0,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
  },
  Si = {
    state: "unblocked",
    proceed: void 0,
    reset: void 0,
    location: void 0,
  },
  IS = (n) => ({
    hasErrorBoundary: !!n.hasErrorBoundary,
  }),
  Ay = "remix-router-transitions",
  Dy = Symbol("ResetLoaderData");
function WS(n) {
  const r = n.window ? n.window : typeof window < "u" ? window : void 0,
    l =
      typeof r < "u" &&
      typeof r.document < "u" &&
      typeof r.document.createElement < "u";
  Me(
    n.routes.length > 0,
    "You must provide a non-empty routes array to createRouter",
  );
  let o = n.hydrationRouteProperties || [],
    s = n.mapRouteProperties || IS,
    c = s;
  if (n.unstable_instrumentations) {
    let O = n.unstable_instrumentations;
    c = (j) => ({
      ...s(j),
      ...qS(O.map((item) => item.route).filter(Boolean), j),
    });
  }
  let f = {},
    m = zi(n.routes, c, void 0, f),
    g,
    h = n.basename || "/";
  h.startsWith("/") || (h = `/${h}`);
  let y = n.dataStrategy || r2,
    v = {
      ...n.future,
    },
    S = null,
    w = new Set(),
    x = null,
    _ = null,
    A = null,
    z = n.hydrationData != null,
    M = qa(m, n.history.location, h),
    F = !1,
    te = null,
    U;
  if (M == null && !n.patchRoutesOnNavigation) {
    let O = wn(404, {
        pathname: n.history.location.pathname,
      }),
      { matches: j, route: G } = us(m);
    U = !0;
    M = j;
    te = {
      [G.id]: O,
    };
  } else if (
    (M &&
      !n.hydrationData &&
      Za(M, m, n.history.location.pathname).active &&
      (M = null),
    M)
  ) {
    if (M.some((item) => item.route.lazy)) U = !1;
    else if (!M.some((item) => ud(item.route))) U = !0;
    else {
      let O = n.hydrationData ? n.hydrationData.loaderData : null,
        j = n.hydrationData ? n.hydrationData.errors : null;
      if (j) {
        let G = M.findIndex((ae) => j[ae.route.id] !== void 0);
        U = M.slice(0, G + 1).every((item) => !Pf(item.route, O, j));
      } else U = M.every((item) => !Pf(item.route, O, j));
    }
  } else {
    U = !1;
    M = [];
    let O = Za(null, m, n.history.location.pathname);
    if (O.active && O.matches) {
      ((F = !0), (M = O.matches));
    }
  }
  let W,
    D = {
      historyAction: n.history.action,
      location: n.history.location,
      matches: M,
      initialized: U,
      navigation: yf,
      restoreScrollPosition: n.hydrationData != null ? !1 : null,
      preventScrollReset: !1,
      revalidation: "idle",
      loaderData: (n.hydrationData && n.hydrationData.loaderData) || {},
      actionData: (n.hydrationData && n.hydrationData.actionData) || null,
      errors: (n.hydrationData && n.hydrationData.errors) || te,
      fetchers: new Map(),
      blockers: new Map(),
    },
    le = "POP",
    ie = null,
    ue = !1,
    ce,
    Ee = !1,
    be = new Map(),
    ee = null,
    Z = !1,
    T = !1,
    V = new Set(),
    B = new Map(),
    re = 0,
    oe = -1,
    R = new Map(),
    H = new Set(),
    J = new Map(),
    ne = new Map(),
    me = new Set(),
    Re = new Map(),
    Ae,
    tt = null;
  function Pe() {
    if (
      ((S = n.history.listen(({ action: O, location: j, delta: G }) => {
        if (Ae) {
          Ae();
          Ae = void 0;
          return;
        }
        it(
          Re.size === 0 || G != null,
          "You are trying to use a blocker on a POP navigation to a location that was not created by @remix-run/router. This will fail silently in production. This can happen if you are navigating outside the router via `window.history.pushState`/`window.location.hash` instead of using router navigation APIs.  This can also happen if you are using createHashRouter and the user manually changes the URL.",
        );
        let ae = Pa({
          currentLocation: D.location,
          nextLocation: j,
          historyAction: O,
        });
        if (ae && G != null) {
          let se = new Promise((Se) => {
            Ae = Se;
          });
          n.history.go(G * -1);
          Fn(ae, {
            state: "blocked",
            location: j,
            proceed() {
              Fn(ae, {
                state: "proceeding",
                proceed: void 0,
                reset: void 0,
                location: j,
              });
              se.then(() => n.history.go(G));
            },
            reset() {
              let Se = new Map(D.blockers);
              Se.set(ae, Si);
              at({
                blockers: Se,
              });
            },
          });
          ie?.resolve();
          ie = null;
          return;
        }
        return Tn(O, j);
      })),
      l)
    ) {
      x2(r, be);
      let O = () => w2(r, be);
      r.addEventListener("pagehide", O);
      ee = () => r.removeEventListener("pagehide", O);
    }
    return (
      D.initialized ||
        Tn("POP", D.location, {
          initialHydration: !0,
        }),
      W
    );
  }
  function ft() {
    if (S) {
      S();
    }
    if (ee) {
      ee();
    }
    w.clear();
    if (ce) {
      ce.abort();
    }
    D.fetchers.forEach((item, index) => Al(index));
    D.blockers.forEach((item, index) => Pi(index));
  }
  function qt(O) {
    return (w.add(O), () => w.delete(O));
  }
  function at(O, j = {}) {
    if (O.matches) {
      O.matches = O.matches.map((item) => {
        let Se = f[item.route.id],
          de = item.route;
        return de.element !== Se.element ||
          de.errorElement !== Se.errorElement ||
          de.hydrateFallbackElement !== Se.hydrateFallbackElement
          ? {
              ...item,
              route: Se,
            }
          : item;
      });
    }
    D = {
      ...D,
      ...O,
    };
    let G = [],
      ae = [];
    D.fetchers.forEach((item, index) => {
      if (item.state === "idle") {
        me.has(index) ? G.push(index) : ae.push(index);
      }
    });
    me.forEach((item) => {
      if (!D.fetchers.has(item) && !B.has(item)) {
        G.push(item);
      }
    });
    [...w].forEach((item) =>
      item(D, {
        deletedFetchers: G,
        newErrors: O.errors ?? null,
        viewTransitionOpts: j.viewTransitionOpts,
        flushSync: j.flushSync === !0,
      }),
    );
    G.forEach((item) => Al(item));
    ae.forEach((item) => D.fetchers.delete(item));
  }
  function Gt(O, j, { flushSync: G } = {}) {
    let ae =
        D.actionData != null &&
        D.navigation.formMethod != null &&
        Bt(D.navigation.formMethod) &&
        D.navigation.state === "loading" &&
        O.state?._isRedirect !== !0,
      se;
    j.actionData
      ? Object.keys(j.actionData).length > 0
        ? (se = j.actionData)
        : (se = null)
      : ae
        ? (se = D.actionData)
        : (se = null);
    let Se = j.loaderData
        ? Vg(D.loaderData, j.loaderData, j.matches || [], j.errors)
        : D.loaderData,
      de = D.blockers;
    if (de.size > 0) {
      ((de = new Map(de)), de.forEach((item, index) => de.set(index, Si)));
    }
    let fe = Z ? !1 : Qi(O, j.matches || D.matches),
      ge =
        ue === !0 ||
        (D.navigation.formMethod != null &&
          Bt(D.navigation.formMethod) &&
          O.state?._isRedirect !== !0);
    if (g) {
      ((m = g), (g = void 0));
    }
    Z ||
      le === "POP" ||
      (le === "PUSH"
        ? n.history.push(O, O.state)
        : le === "REPLACE" && n.history.replace(O, O.state));
    let ve;
    if (le === "POP") {
      let _e = be.get(D.location.pathname);
      _e && _e.has(O.pathname)
        ? (ve = {
            currentLocation: D.location,
            nextLocation: O,
          })
        : be.has(O.pathname) &&
          (ve = {
            currentLocation: O,
            nextLocation: D.location,
          });
    } else if (Ee) {
      let _e = be.get(D.location.pathname);
      _e
        ? _e.add(O.pathname)
        : ((_e = new Set([O.pathname])), be.set(D.location.pathname, _e));
      ve = {
        currentLocation: D.location,
        nextLocation: O,
      };
    }
    at(
      {
        ...j,
        actionData: se,
        loaderData: Se,
        historyAction: le,
        location: O,
        initialized: !0,
        navigation: yf,
        revalidation: "idle",
        restoreScrollPosition: fe,
        preventScrollReset: ge,
        blockers: de,
      },
      {
        viewTransitionOpts: ve,
        flushSync: G === !0,
      },
    );
    le = "POP";
    ue = !1;
    Ee = !1;
    Z = !1;
    T = !1;
    ie?.resolve();
    ie = null;
    tt?.resolve();
    tt = null;
  }
  async function jn(O, j) {
    if ((ie?.resolve(), (ie = null), typeof O == "number")) {
      ie || (ie = Xg());
      let Be = ie.promise;
      return (n.history.go(O), Be);
    }
    let G = Xf(D.location, D.matches, h, O, j?.fromRouteId, j?.relative),
      { path: ae, submission: se, error: Se } = Mg(!1, G, j),
      de = D.location,
      fe = Mi(D.location, ae, j && j.state);
    fe = {
      ...fe,
      ...n.history.encodeLocation(fe),
    };
    let ge = j && j.replace != null ? j.replace : void 0,
      ve = "PUSH";
    ge === !0
      ? (ve = "REPLACE")
      : ge === !1 ||
        (se != null &&
          Bt(se.formMethod) &&
          se.formAction === D.location.pathname + D.location.search &&
          (ve = "REPLACE"));
    let _e =
        j && "preventScrollReset" in j ? j.preventScrollReset === !0 : void 0,
      xe = (j && j.flushSync) === !0,
      Ge = Pa({
        currentLocation: de,
        nextLocation: fe,
        historyAction: ve,
      });
    if (Ge) {
      Fn(Ge, {
        state: "blocked",
        location: fe,
        proceed() {
          Fn(Ge, {
            state: "proceeding",
            proceed: void 0,
            reset: void 0,
            location: fe,
          });
          jn(O, j);
        },
        reset() {
          let Be = new Map(D.blockers);
          Be.set(Ge, Si);
          at({
            blockers: Be,
          });
        },
      });
      return;
    }
    await Tn(ve, fe, {
      submission: se,
      pendingError: Se,
      preventScrollReset: _e,
      replace: j && j.replace,
      enableViewTransition: j && j.viewTransition,
      flushSync: xe,
      callSiteDefaultShouldRevalidate: j && j.unstable_defaultShouldRevalidate,
    });
  }
  function Rl() {
    tt || (tt = Xg());
    wr();
    at({
      revalidation: "loading",
    });
    let O = tt.promise;
    if (D.navigation.state === "submitting") {
      return O;
    }
    if (D.navigation.state === "idle") {
      return (
        Tn(D.historyAction, D.location, {
          startUninterruptedRevalidation: !0,
        }),
        O
      );
    }
    return (
      Tn(le || D.historyAction, D.navigation.location, {
        overrideNavigation: D.navigation,
        enableViewTransition: Ee === !0,
      }),
      O
    );
  }
  async function Tn(O, j, G) {
    if (ce) {
      ce.abort();
    }
    ce = null;
    le = O;
    Z = (G && G.startUninterruptedRevalidation) === !0;
    Ka(D.location, D.matches);
    ue = (G && G.preventScrollReset) === !0;
    Ee = (G && G.enableViewTransition) === !0;
    let ae = g || m,
      se = G && G.overrideNavigation,
      Se =
        G?.initialHydration && D.matches && D.matches.length > 0 && !F
          ? D.matches
          : qa(ae, j, h),
      de = (G && G.flushSync) === !0;
    if (
      Se &&
      D.initialized &&
      !T &&
      d2(D.location, j) &&
      !(G && G.submission && Bt(G.submission.formMethod))
    ) {
      Gt(
        j,
        {
          matches: Se,
        },
        {
          flushSync: de,
        },
      );
      return;
    }
    let fe = Za(Se, ae, j.pathname);
    if ((fe.active && fe.matches && (Se = fe.matches), !Se)) {
      let { error: dt, notFoundMatches: ht, route: $e } = ha(j.pathname);
      Gt(
        j,
        {
          matches: ht,
          loaderData: {},
          errors: {
            [$e.id]: dt,
          },
        },
        {
          flushSync: de,
        },
      );
      return;
    }
    ce = new AbortController();
    let ge = ol(n.history, j, ce.signal, G && G.submission),
      ve = n.getContext ? await n.getContext() : new Og(),
      _e;
    if (G && G.pendingError)
      _e = [
        Va(Se).route.id,
        {
          type: "error",
          error: G.pendingError,
        },
      ];
    else if (G && G.submission && Bt(G.submission.formMethod)) {
      let dt = await Zs(
        ge,
        j,
        G.submission,
        Se,
        ve,
        fe.active,
        G && G.initialHydration === !0,
        {
          replace: G.replace,
          flushSync: de,
        },
      );
      if (dt.shortCircuited) return;
      if (dt.pendingActionResult) {
        let [ht, $e] = dt.pendingActionResult;
        if (fn($e) && hl($e.error) && $e.error.status === 404) {
          ce = null;
          Gt(j, {
            matches: dt.matches,
            loaderData: {},
            errors: {
              [ht]: $e.error,
            },
          });
          return;
        }
      }
      Se = dt.matches || Se;
      _e = dt.pendingActionResult;
      se = vf(j, G.submission);
      de = !1;
      fe.active = !1;
      ge = ol(n.history, ge.url, ge.signal);
    }
    let {
      shortCircuited: xe,
      matches: Ge,
      loaderData: Be,
      errors: ct,
    } = await Fi(
      ge,
      j,
      Se,
      ve,
      fe.active,
      se,
      G && G.submission,
      G && G.fetcherSubmission,
      G && G.replace,
      G && G.initialHydration === !0,
      de,
      _e,
      G && G.callSiteDefaultShouldRevalidate,
    );
    xe ||
      ((ce = null),
      Gt(j, {
        matches: Ge || Se,
        ...Yg(_e),
        loaderData: Be,
        errors: ct,
      }));
  }
  async function Zs(O, j, G, ae, se, Se, de, fe = {}) {
    wr();
    let ge = S2(j, G);
    if (
      (at(
        {
          navigation: ge,
        },
        {
          flushSync: fe.flushSync === !0,
        },
      ),
      Se)
    ) {
      let xe = await ma(ae, j.pathname, O.signal);
      if (xe.type === "aborted")
        return {
          shortCircuited: !0,
        };
      if (xe.type === "error") {
        if (xe.partialMatches.length === 0) {
          let { matches: Be, route: ct } = us(m);
          return {
            matches: Be,
            pendingActionResult: [
              ct.id,
              {
                type: "error",
                error: xe.error,
              },
            ],
          };
        }
        let Ge = Va(xe.partialMatches).route.id;
        return {
          matches: xe.partialMatches,
          pendingActionResult: [
            Ge,
            {
              type: "error",
              error: xe.error,
            },
          ],
        };
      } else if (xe.matches) ae = xe.matches;
      else {
        let { notFoundMatches: Ge, error: Be, route: ct } = ha(j.pathname);
        return {
          matches: Ge,
          pendingActionResult: [
            ct.id,
            {
              type: "error",
              error: Be,
            },
          ],
        };
      }
    }
    let ve,
      _e = bs(ae, j);
    if (!_e.route.action && !_e.route.lazy)
      ve = {
        type: "error",
        error: wn(405, {
          method: O.method,
          pathname: j.pathname,
          routeId: _e.route.id,
        }),
      };
    else {
      let xe = ul(c, f, O, ae, _e, de ? [] : o, se),
        Ge = await Fa(O, xe, se, null);
      if (((ve = Ge[_e.route.id]), !ve)) {
        for (let Be of ae)
          if (Ge[Be.route.id]) {
            ve = Ge[Be.route.id];
            break;
          }
      }
      if (O.signal.aborted)
        return {
          shortCircuited: !0,
        };
    }
    if (yr(ve)) {
      let xe;
      return (
        fe && fe.replace != null
          ? (xe = fe.replace)
          : (xe =
              Bg(ve.response.headers.get("Location"), new URL(O.url), h) ===
              D.location.pathname + D.location.search),
        await pt(O, ve, !0, {
          submission: G,
          replace: xe,
        }),
        {
          shortCircuited: !0,
        }
      );
    }
    if (fn(ve)) {
      let xe = Va(ae, _e.route.id);
      return (
        (fe && fe.replace) !== !0 && (le = "PUSH"),
        {
          matches: ae,
          pendingActionResult: [xe.route.id, ve, _e.route.id],
        }
      );
    }
    return {
      matches: ae,
      pendingActionResult: [_e.route.id, ve],
    };
  }
  async function Fi(O, j, G, ae, se, Se, de, fe, ge, ve, _e, xe, Ge) {
    let Be = Se || vf(j, de),
      ct = de || fe || Fg(Be),
      dt = !Z && !ve;
    if (se) {
      if (dt) {
        let yt = xr(xe);
        at(
          {
            navigation: Be,
            ...(yt !== void 0
              ? {
                  actionData: yt,
                }
              : {}),
          },
          {
            flushSync: _e,
          },
        );
      }
      let qe = await ma(G, j.pathname, O.signal);
      if (qe.type === "aborted")
        return {
          shortCircuited: !0,
        };
      if (qe.type === "error") {
        if (qe.partialMatches.length === 0) {
          let { matches: Ln, route: Dt } = us(m);
          return {
            matches: Ln,
            loaderData: {},
            errors: {
              [Dt.id]: qe.error,
            },
          };
        }
        let yt = Va(qe.partialMatches).route.id;
        return {
          matches: qe.partialMatches,
          loaderData: {},
          errors: {
            [yt]: qe.error,
          },
        };
      } else if (qe.matches) G = qe.matches;
      else {
        let { error: yt, notFoundMatches: Ln, route: Dt } = ha(j.pathname);
        return {
          matches: Ln,
          loaderData: {},
          errors: {
            [Dt.id]: yt,
          },
        };
      }
    }
    let ht = g || m,
      { dsMatches: $e, revalidatingFetchers: Ot } = zg(
        O,
        ae,
        c,
        f,
        n.history,
        D,
        G,
        ct,
        j,
        ve ? [] : o,
        ve === !0,
        T,
        V,
        me,
        J,
        H,
        ht,
        h,
        n.patchRoutesOnNavigation != null,
        xe,
        Ge,
      );
    if (
      ((oe = ++re),
      !n.dataStrategy &&
        !$e.some((item) => item.shouldLoad) &&
        !$e.some(
          (item) => item.route.middleware && item.route.middleware.length > 0,
        ) &&
        Ot.length === 0)
    ) {
      let qe = jt();
      return (
        Gt(
          j,
          {
            matches: G,
            loaderData: {},
            errors:
              xe && fn(xe[1])
                ? {
                    [xe[0]]: xe[1].error,
                  }
                : null,
            ...Yg(xe),
            ...(qe
              ? {
                  fetchers: new Map(D.fetchers),
                }
              : {}),
          },
          {
            flushSync: _e,
          },
        ),
        {
          shortCircuited: !0,
        }
      );
    }
    if (dt) {
      let qe = {};
      if (!se) {
        qe.navigation = Be;
        let yt = xr(xe);
        if (yt !== void 0) {
          qe.actionData = yt;
        }
      }
      if (Ot.length > 0) {
        qe.fetchers = _l(Ot);
      }
      at(qe, {
        flushSync: _e,
      });
    }
    Ot.forEach((item) => {
      ut(item.key);
      if (item.controller) {
        B.set(item.key, item.controller);
      }
    });
    let Xt = () => Ot.forEach((item) => ut(item.key));
    if (ce) {
      ce.signal.addEventListener("abort", Xt);
    }
    let { loaderResults: ot, fetcherResults: An } = await Ol($e, Ot, O, ae);
    if (O.signal.aborted)
      return {
        shortCircuited: !0,
      };
    if (ce) {
      ce.signal.removeEventListener("abort", Xt);
    }
    Ot.forEach((item) => B.delete(item.key));
    let nn = cs(ot);
    if (nn)
      return (
        await pt(O, nn.result, !0, {
          replace: ge,
        }),
        {
          shortCircuited: !0,
        }
      );
    if (((nn = cs(An)), nn))
      return (
        H.add(nn.key),
        await pt(O, nn.result, !0, {
          replace: ge,
        }),
        {
          shortCircuited: !0,
        }
      );
    let { loaderData: Dn, errors: hn } = qg(D, G, ot, xe, Ot, An);
    if (ve && D.errors) {
      hn = {
        ...D.errors,
        ...hn,
      };
    }
    let Pn = jt(),
      Ja = Xi(oe),
      Ia = Pn || Ja || Ot.length > 0;
    return {
      matches: G,
      loaderData: Dn,
      errors: hn,
      ...(Ia
        ? {
            fetchers: new Map(D.fetchers),
          }
        : {}),
    };
  }
  function xr(O) {
    if (O && !fn(O[1]))
      return {
        [O[0]]: O[1].data,
      };
    if (D.actionData)
      return Object.keys(D.actionData).length === 0 ? null : D.actionData;
  }
  function _l(O) {
    return (
      O.forEach((event) => {
        let G = D.fetchers.get(event.key),
          ae = Ei(void 0, G ? G.data : void 0);
        D.fetchers.set(event.key, ae);
      }),
      new Map(D.fetchers)
    );
  }
  async function Tl(O, j, G, ae) {
    ut(O);
    let se = (ae && ae.flushSync) === !0,
      Se = g || m,
      de = Xf(D.location, D.matches, h, G, j, ae?.relative),
      fe = qa(Se, de, h),
      ge = Za(fe, Se, de);
    if ((ge.active && ge.matches && (fe = ge.matches), !fe)) {
      On(
        O,
        j,
        wn(404, {
          pathname: de,
        }),
        {
          flushSync: se,
        },
      );
      return;
    }
    let { path: ve, submission: _e, error: xe } = Mg(!0, de, ae);
    if (xe) {
      On(O, j, xe, {
        flushSync: se,
      });
      return;
    }
    let Ge = n.getContext ? await n.getContext() : new Og(),
      Be = (ae && ae.preventScrollReset) === !0;
    if (_e && Bt(_e.formMethod)) {
      await Js(
        O,
        j,
        ve,
        fe,
        Ge,
        ge.active,
        se,
        Be,
        _e,
        ae && ae.unstable_defaultShouldRevalidate,
      );
      return;
    }
    J.set(O, {
      routeId: j,
      path: ve,
    });
    await Is(O, j, ve, fe, Ge, ge.active, se, Be, _e);
  }
  async function Js(O, j, G, ae, se, Se, de, fe, ge, ve) {
    wr();
    J.delete(O);
    let _e = D.fetchers.get(O);
    Ft(O, E2(ge, _e), {
      flushSync: de,
    });
    let xe = new AbortController(),
      Ge = ol(n.history, G, xe.signal, ge);
    if (Se) {
      let Ve = await ma(ae, new URL(Ge.url).pathname, Ge.signal, O);
      if (Ve.type === "aborted") return;
      if (Ve.type === "error") {
        On(O, j, Ve.error, {
          flushSync: de,
        });
        return;
      } else if (Ve.matches) ae = Ve.matches;
      else {
        On(
          O,
          j,
          wn(404, {
            pathname: G,
          }),
          {
            flushSync: de,
          },
        );
        return;
      }
    }
    let Be = bs(ae, G);
    if (!Be.route.action && !Be.route.lazy) {
      let Ve = wn(405, {
        method: ge.formMethod,
        pathname: G,
        routeId: j,
      });
      On(O, j, Ve, {
        flushSync: de,
      });
      return;
    }
    B.set(O, xe);
    let ct = re,
      dt = ul(c, f, Ge, ae, Be, o, se),
      ht = await Fa(Ge, dt, se, O),
      $e = ht[Be.route.id];
    if (!$e) {
      for (let Ve of dt)
        if (ht[Ve.route.id]) {
          $e = ht[Ve.route.id];
          break;
        }
    }
    if (Ge.signal.aborted) {
      if (B.get(O) === xe) {
        B.delete(O);
      }
      return;
    }
    if (me.has(O)) {
      if (yr($e) || fn($e)) {
        Ft(O, fa(void 0));
        return;
      }
    } else {
      if (yr($e))
        if ((B.delete(O), oe > ct)) {
          Ft(O, fa(void 0));
          return;
        } else
          return (
            H.add(O),
            Ft(O, Ei(ge)),
            pt(Ge, $e, !1, {
              fetcherSubmission: ge,
              preventScrollReset: fe,
            })
          );
      if (fn($e)) {
        On(O, j, $e.error);
        return;
      }
    }
    let Ot = D.navigation.location || D.location,
      Xt = ol(n.history, Ot, xe.signal),
      ot = g || m,
      An =
        D.navigation.state !== "idle"
          ? qa(ot, D.navigation.location, h)
          : D.matches;
    Me(An, "Didn't find any matches after fetcher action");
    let nn = ++re;
    R.set(O, nn);
    let Dn = Ei(ge, $e.data);
    D.fetchers.set(O, Dn);
    let { dsMatches: hn, revalidatingFetchers: Pn } = zg(
      Xt,
      se,
      c,
      f,
      n.history,
      D,
      An,
      ge,
      Ot,
      o,
      !1,
      T,
      V,
      me,
      J,
      H,
      ot,
      h,
      n.patchRoutesOnNavigation != null,
      [Be.route.id, $e],
      ve,
    );
    Pn.filter((item) => item.key !== O).forEach((item) => {
      let Wa = item.key,
        Zi = D.fetchers.get(Wa),
        Dl = Ei(void 0, Zi ? Zi.data : void 0);
      D.fetchers.set(Wa, Dl);
      ut(Wa);
      if (item.controller) {
        B.set(Wa, item.controller);
      }
    });
    at({
      fetchers: new Map(D.fetchers),
    });
    let Ja = () => Pn.forEach((item) => ut(item.key));
    xe.signal.addEventListener("abort", Ja);
    let { loaderResults: Ia, fetcherResults: qe } = await Ol(hn, Pn, Xt, se);
    if (xe.signal.aborted) return;
    if (
      (xe.signal.removeEventListener("abort", Ja),
      R.delete(O),
      B.delete(O),
      Pn.forEach((item) => B.delete(item.key)),
      D.fetchers.has(O))
    ) {
      let Ve = fa($e.data);
      D.fetchers.set(O, Ve);
    }
    let yt = cs(Ia);
    if (yt)
      return pt(Xt, yt.result, !1, {
        preventScrollReset: fe,
      });
    if (((yt = cs(qe)), yt))
      return (
        H.add(yt.key),
        pt(Xt, yt.result, !1, {
          preventScrollReset: fe,
        })
      );
    let { loaderData: Ln, errors: Dt } = qg(D, An, Ia, void 0, Pn, qe);
    Xi(nn);
    D.navigation.state === "loading" && nn > oe
      ? (Me(le, "Expected pending action"),
        ce && ce.abort(),
        Gt(D.navigation.location, {
          matches: An,
          loaderData: Ln,
          errors: Dt,
          fetchers: new Map(D.fetchers),
        }))
      : (at({
          errors: Dt,
          loaderData: Vg(D.loaderData, Ln, An, Dt),
          fetchers: new Map(D.fetchers),
        }),
        (T = !1));
  }
  async function Is(O, j, G, ae, se, Se, de, fe, ge) {
    let ve = D.fetchers.get(O);
    Ft(O, Ei(ge, ve ? ve.data : void 0), {
      flushSync: de,
    });
    let _e = new AbortController(),
      xe = ol(n.history, G, _e.signal);
    if (Se) {
      let $e = await ma(ae, new URL(xe.url).pathname, xe.signal, O);
      if ($e.type === "aborted") return;
      if ($e.type === "error") {
        On(O, j, $e.error, {
          flushSync: de,
        });
        return;
      } else if ($e.matches) ae = $e.matches;
      else {
        On(
          O,
          j,
          wn(404, {
            pathname: G,
          }),
          {
            flushSync: de,
          },
        );
        return;
      }
    }
    let Ge = bs(ae, G);
    B.set(O, _e);
    let Be = re,
      ct = ul(c, f, xe, ae, Ge, o, se),
      ht = (await Fa(xe, ct, se, O))[Ge.route.id];
    if ((B.get(O) === _e && B.delete(O), !xe.signal.aborted)) {
      if (me.has(O)) {
        Ft(O, fa(void 0));
        return;
      }
      if (yr(ht))
        if (oe > Be) {
          Ft(O, fa(void 0));
          return;
        } else {
          H.add(O);
          await pt(xe, ht, !1, {
            preventScrollReset: fe,
          });
          return;
        }
      if (fn(ht)) {
        On(O, j, ht.error);
        return;
      }
      Ft(O, fa(ht.data));
    }
  }
  async function pt(
    O,
    j,
    G,
    {
      submission: ae,
      fetcherSubmission: se,
      preventScrollReset: Se,
      replace: de,
    } = {},
  ) {
    G || (ie?.resolve(), (ie = null));
    if (j.response.headers.has("X-Remix-Revalidate")) {
      T = !0;
    }
    let fe = j.response.headers.get("Location");
    Me(fe, "Expected a Location header on the redirect Response");
    fe = Bg(fe, new URL(O.url), h);
    let ge = Mi(D.location, fe, {
      _isRedirect: !0,
    });
    if (l) {
      let ct = !1;
      if (j.response.headers.has("X-Remix-Reload-Document")) ct = !0;
      else if (zs(fe)) {
        const dt = vy(fe, !0);
        ct = dt.origin !== r.location.origin || dn(dt.pathname, h) == null;
      }
      if (ct) {
        de ? r.location.replace(fe) : r.location.assign(fe);
        return;
      }
    }
    ce = null;
    let ve =
        de === !0 || j.response.headers.has("X-Remix-Replace")
          ? "REPLACE"
          : "PUSH",
      { formMethod: _e, formAction: xe, formEncType: Ge } = D.navigation;
    if (!ae && !se && _e && xe && Ge) {
      ae = Fg(D.navigation);
    }
    let Be = ae || se;
    if (ZS.has(j.response.status) && Be && Bt(Be.formMethod))
      await Tn(ve, ge, {
        submission: {
          ...Be,
          formAction: fe,
        },
        preventScrollReset: Se || ue,
        enableViewTransition: G ? Ee : void 0,
      });
    else {
      let ct = vf(ge, ae);
      await Tn(ve, ge, {
        overrideNavigation: ct,
        fetcherSubmission: se,
        preventScrollReset: Se || ue,
        enableViewTransition: G ? Ee : void 0,
      });
    }
  }
  async function Fa(O, j, G, ae) {
    let se,
      Se = {};
    try {
      se = await i2(y, O, j, ae, G, !1);
    } catch (de) {
      return (
        j
          .filter((item) => item.shouldLoad)
          .forEach((item) => {
            Se[item.route.id] = {
              type: "error",
              error: de,
            };
          }),
        Se
      );
    }
    if (O.signal.aborted) return Se;
    if (!Bt(O.method))
      for (let de of j) {
        if (se[de.route.id]?.type === "error") break;
        if (
          !se.hasOwnProperty(de.route.id) &&
          !D.loaderData.hasOwnProperty(de.route.id) &&
          (!D.errors || !D.errors.hasOwnProperty(de.route.id)) &&
          de.shouldCallHandler()
        ) {
          se[de.route.id] = {
            type: "error",
            result: new Error(
              `No result returned from dataStrategy for route ${de.route.id}`,
            ),
          };
        }
      }
    for (let [de, fe] of Object.entries(se))
      if (p2(fe)) {
        let ge = fe.result;
        Se[de] = {
          type: "redirect",
          response: c2(ge, O, de, j, h),
        };
      } else Se[de] = await u2(fe);
    return Se;
  }
  async function Ol(O, j, G, ae) {
    let se = Fa(G, O, ae, null),
      Se = Promise.all(
        j.map(async (item) => {
          if (item.matches && item.match && item.request && item.controller) {
            let _e = (await Fa(item.request, item.matches, ae, item.key))[
              item.match.route.id
            ];
            return {
              [item.key]: _e,
            };
          } else
            return Promise.resolve({
              [item.key]: {
                type: "error",
                error: wn(404, {
                  pathname: item.path,
                }),
              },
            });
        }),
      ),
      de = await se,
      fe = (await Se).reduce((item, acc) => Object.assign(item, acc), {});
    return {
      loaderResults: de,
      fetcherResults: fe,
    };
  }
  function wr() {
    T = !0;
    J.forEach((item, index) => {
      if (B.has(index)) {
        V.add(index);
      }
      ut(index);
    });
  }
  function Ft(O, j, G = {}) {
    D.fetchers.set(O, j);
    at(
      {
        fetchers: new Map(D.fetchers),
      },
      {
        flushSync: (G && G.flushSync) === !0,
      },
    );
  }
  function On(O, j, G, ae = {}) {
    let se = Va(D.matches, j);
    Al(O);
    at(
      {
        errors: {
          [se.route.id]: G,
        },
        fetchers: new Map(D.fetchers),
      },
      {
        flushSync: (ae && ae.flushSync) === !0,
      },
    );
  }
  function Cl(O) {
    return (
      ne.set(O, (ne.get(O) || 0) + 1),
      me.has(O) && me.delete(O),
      D.fetchers.get(O) || JS
    );
  }
  function Ws(O, j) {
    ut(O, j?.reason);
    Ft(O, fa(null));
  }
  function Al(O) {
    let j = D.fetchers.get(O);
    if (B.has(O) && !(j && j.state === "loading" && R.has(O))) {
      ut(O);
    }
    J.delete(O);
    R.delete(O);
    H.delete(O);
    me.delete(O);
    V.delete(O);
    D.fetchers.delete(O);
  }
  function Xa(O) {
    let j = (ne.get(O) || 0) - 1;
    j <= 0 ? (ne.delete(O), me.add(O)) : ne.set(O, j);
    at({
      fetchers: new Map(D.fetchers),
    });
  }
  function ut(O, j) {
    let G = B.get(O);
    if (G) {
      (G.abort(j), B.delete(O));
    }
  }
  function Cn(O) {
    for (let j of O) {
      let G = Cl(j),
        ae = fa(G.data);
      D.fetchers.set(j, ae);
    }
  }
  function jt() {
    let O = [],
      j = !1;
    for (let G of H) {
      let ae = D.fetchers.get(G);
      Me(ae, `Expected fetcher: ${G}`);
      if (ae.state === "loading") {
        (H.delete(G), O.push(G), (j = !0));
      }
    }
    return (Cn(O), j);
  }
  function Xi(O) {
    let j = [];
    for (let [G, ae] of R)
      if (ae < O) {
        let se = D.fetchers.get(G);
        Me(se, `Expected fetcher: ${G}`);
        if (se.state === "loading") {
          (ut(G), R.delete(G), j.push(G));
        }
      }
    return (Cn(j), j.length > 0);
  }
  function eu(O, j) {
    let G = D.blockers.get(O) || Si;
    return (Re.get(O) !== j && Re.set(O, j), G);
  }
  function Pi(O) {
    D.blockers.delete(O);
    Re.delete(O);
  }
  function Fn(O, j) {
    let G = D.blockers.get(O) || Si;
    Me(
      (G.state === "unblocked" && j.state === "blocked") ||
        (G.state === "blocked" && j.state === "blocked") ||
        (G.state === "blocked" && j.state === "proceeding") ||
        (G.state === "blocked" && j.state === "unblocked") ||
        (G.state === "proceeding" && j.state === "unblocked"),
      `Invalid blocker state transition: ${G.state} -> ${j.state}`,
    );
    let ae = new Map(D.blockers);
    ae.set(O, j);
    at({
      blockers: ae,
    });
  }
  function Pa({ currentLocation: O, nextLocation: j, historyAction: G }) {
    if (Re.size === 0) return;
    if (Re.size > 1) {
      it(!1, "A router only supports one blocker at a time");
    }
    let ae = Array.from(Re.entries()),
      [se, Se] = ae[ae.length - 1],
      de = D.blockers.get(se);
    if (
      !(de && de.state === "proceeding") &&
      Se({
        currentLocation: O,
        nextLocation: j,
        historyAction: G,
      })
    )
      return se;
  }
  function ha(O) {
    let j = wn(404, {
        pathname: O,
      }),
      G = g || m,
      { matches: ae, route: se } = us(G);
    return {
      notFoundMatches: ae,
      route: se,
      error: j,
    };
  }
  function Xn(O, j, G) {
    if (((x = O), (A = j), (_ = G || null), !z && D.navigation === yf)) {
      z = !0;
      let ae = Qi(D.location, D.matches);
      if (ae != null) {
        at({
          restoreScrollPosition: ae,
        });
      }
    }
    return () => {
      x = null;
      A = null;
      _ = null;
    };
  }
  function Qa(O, j) {
    return (
      (_ &&
        _(
          O,
          j.map((item) => by(item, D.loaderData)),
        )) ||
      O.key
    );
  }
  function Ka(O, j) {
    if (x && A) {
      let G = Qa(O, j);
      x[G] = A();
    }
  }
  function Qi(O, j) {
    if (x) {
      let G = Qa(O, j),
        ae = x[G];
      if (typeof ae == "number") return ae;
    }
    return null;
  }
  function Za(O, j, G) {
    if (n.patchRoutesOnNavigation)
      if (O) {
        if (Object.keys(O[0].params).length > 0)
          return {
            active: !0,
            matches: Ci(j, G, h, !0),
          };
      } else
        return {
          active: !0,
          matches: Ci(j, G, h, !0) || [],
        };
    return {
      active: !1,
      matches: null,
    };
  }
  async function ma(O, j, G, ae) {
    if (!n.patchRoutesOnNavigation)
      return {
        type: "success",
        matches: O,
      };
    let se = O;
    for (;;) {
      let Se = g == null,
        de = g || m,
        fe = f;
      try {
        await n.patchRoutesOnNavigation({
          signal: G,
          path: j,
          matches: se,
          fetcherKey: ae,
          patch: (_e, xe) => {
            G.aborted || kg(_e, xe, de, fe, c, !1);
          },
        });
      } catch (_e) {
        return {
          type: "error",
          error: _e,
          partialMatches: se,
        };
      } finally {
        if (Se && !G.aborted) {
          m = [...m];
        }
      }
      if (G.aborted)
        return {
          type: "aborted",
        };
      let ge = qa(de, j, h),
        ve = null;
      if (ge) {
        if (Object.keys(ge[0].params).length === 0)
          return {
            type: "success",
            matches: ge,
          };
        if (
          ((ve = Ci(de, j, h, !0)),
          !(ve && se.length < ve.length && ga(se, ve.slice(0, se.length))))
        )
          return {
            type: "success",
            matches: ge,
          };
      }
      if ((ve || (ve = Ci(de, j, h, !0)), !ve || ga(se, ve)))
        return {
          type: "success",
          matches: null,
        };
      se = ve;
    }
  }
  function ga(O, j) {
    return (
      O.length === j.length &&
      O.every((item, index) => item.route.id === j[index].route.id)
    );
  }
  function tu(O) {
    f = {};
    g = zi(O, c, void 0, f);
  }
  function Ki(O, j, G = !1) {
    let ae = g == null;
    kg(O, j, g || m, f, c, G);
    if (ae) {
      ((m = [...m]), at({}));
    }
  }
  return (
    (W = {
      get basename() {
        return h;
      },
      get future() {
        return v;
      },
      get state() {
        return D;
      },
      get routes() {
        return m;
      },
      get window() {
        return r;
      },
      initialize: Pe,
      subscribe: qt,
      enableScrollRestoration: Xn,
      navigate: jn,
      fetch: Tl,
      revalidate: Rl,
      createHref: (O) => n.history.createHref(O),
      encodeLocation: (O) => n.history.encodeLocation(O),
      getFetcher: Cl,
      resetFetcher: Ws,
      deleteFetcher: Xa,
      dispose: ft,
      getBlocker: eu,
      deleteBlocker: Pi,
      patchRoutes: Ki,
      _internalFetchControllers: B,
      _internalSetRoutes: tu,
      _internalSetStateDoNotUseOrYouWillBreakYourApp(O) {
        at(O);
      },
    }),
    n.unstable_instrumentations &&
      (W = VS(
        W,
        n.unstable_instrumentations.map((item) => item.router).filter(Boolean),
      )),
    W
  );
}
function e2(n) {
  return (
    n != null &&
    (("formData" in n && n.formData != null) ||
      ("body" in n && n.body !== void 0))
  );
}
function Xf(n, r, l, o, s, c) {
  let f, m;
  if (s) {
    f = [];
    for (let h of r)
      if ((f.push(h), h.route.id === s)) {
        m = h;
        break;
      }
  } else {
    f = r;
    m = r[r.length - 1];
  }
  let g = js(o || ".", ks(f), dn(n.pathname, l) || n.pathname, c === "path");
  if (
    (o == null && ((g.search = n.search), (g.hash = n.hash)),
    (o == null || o === "" || o === ".") && m)
  ) {
    let h = fd(g.search);
    if (m.route.index && !h)
      g.search = g.search ? g.search.replace(/^\?/, "?index&") : "?index";
    else if (!m.route.index && h) {
      let y = new URLSearchParams(g.search),
        v = y.getAll("index");
      y.delete("index");
      v.filter((item) => item).forEach((item) => y.append("index", item));
      let S = y.toString();
      g.search = S ? `?${S}` : "";
    }
  }
  return (
    l !== "/" &&
      (g.pathname = jS({
        basename: l,
        pathname: g.pathname,
      })),
    Gn(g)
  );
}
function Mg(n, r, l) {
  if (!l || !e2(l))
    return {
      path: r,
    };
  if (l.formMethod && !b2(l.formMethod))
    return {
      path: r,
      error: wn(405, {
        method: l.formMethod,
      }),
    };
  let o = () => ({
      path: r,
      error: wn(400, {
        type: "invalid-body",
      }),
    }),
    c = (l.formMethod || "get").toUpperCase(),
    f = jy(r);
  if (l.body !== void 0) {
    if (l.formEncType === "text/plain") {
      if (!Bt(c)) return o();
      let v =
        typeof l.body == "string"
          ? l.body
          : l.body instanceof FormData || l.body instanceof URLSearchParams
            ? Array.from(l.body.entries()).reduce(
                (item, [w, x]) => `${item}${w}=${x}
`,
                "",
              )
            : String(l.body);
      return {
        path: r,
        submission: {
          formMethod: c,
          formAction: f,
          formEncType: l.formEncType,
          formData: void 0,
          json: void 0,
          text: v,
        },
      };
    } else if (l.formEncType === "application/json") {
      if (!Bt(c)) return o();
      try {
        let v = typeof l.body == "string" ? JSON.parse(l.body) : l.body;
        return {
          path: r,
          submission: {
            formMethod: c,
            formAction: f,
            formEncType: l.formEncType,
            formData: void 0,
            json: v,
            text: void 0,
          },
        };
      } catch {
        return o();
      }
    }
  }
  Me(
    typeof FormData == "function",
    "FormData is not available in this environment",
  );
  let m, g;
  if (l.formData) {
    m = Kf(l.formData);
    g = l.formData;
  } else if (l.body instanceof FormData) {
    m = Kf(l.body);
    g = l.body;
  } else if (l.body instanceof URLSearchParams) {
    m = l.body;
    g = $g(m);
  } else if (l.body == null) {
    m = new URLSearchParams();
    g = new FormData();
  } else
    try {
      m = new URLSearchParams(l.body);
      g = $g(m);
    } catch {
      return o();
    }
  let h = {
    formMethod: c,
    formAction: f,
    formEncType: (l && l.formEncType) || "application/x-www-form-urlencoded",
    formData: g,
    json: void 0,
    text: void 0,
  };
  if (Bt(h.formMethod))
    return {
      path: r,
      submission: h,
    };
  let y = Ga(r);
  return (
    n && y.search && fd(y.search) && m.append("index", ""),
    (y.search = `?${m}`),
    {
      path: Gn(y),
      submission: h,
    }
  );
}
function zg(n, r, l, o, s, c, f, m, g, h, y, v, S, w, x, _, A, z, M, F, te) {
  let U = F ? (fn(F[1]) ? F[1].error : F[1].data) : void 0,
    W = s.createURL(c.location),
    D = s.createURL(g),
    le;
  if (y && c.errors) {
    let Z = Object.keys(c.errors)[0];
    le = f.findIndex((T) => T.route.id === Z);
  } else if (F && fn(F[1])) {
    let Z = F[0];
    le = f.findIndex((T) => T.route.id === Z) - 1;
  }
  let ie = F ? F[1].statusCode : void 0,
    ue = ie && ie >= 400,
    ce = {
      currentUrl: W,
      currentParams: c.matches[0]?.params || {},
      nextUrl: D,
      nextParams: f[0].params,
      ...m,
      actionResult: U,
      actionStatus: ie,
    },
    Ee = Hi(f),
    be = f.map((item, index) => {
      let { route: V } = item,
        B = null;
      if (
        (le != null && index > le
          ? (B = !1)
          : V.lazy
            ? (B = !0)
            : ud(V)
              ? y
                ? (B = Pf(V, c.loaderData, c.errors))
                : t2(c.loaderData, c.matches[index], item) && (B = !0)
              : (B = !1),
        B !== null)
      )
        return Qf(l, o, n, Ee, item, h, r, B);
      let re = !1;
      typeof te == "boolean"
        ? (re = te)
        : ue
          ? (re = !1)
          : (v ||
              W.pathname + W.search === D.pathname + D.search ||
              W.search !== D.search ||
              n2(c.matches[index], item)) &&
            (re = !0);
      let oe = {
          ...ce,
          defaultShouldRevalidate: re,
        },
        R = Di(item, oe);
      return Qf(l, o, n, Ee, item, h, r, R, oe, te);
    }),
    ee = [];
  return (
    x.forEach((item, index) => {
      if (
        y ||
        !f.some((item) => item.route.id === item.routeId) ||
        w.has(index)
      )
        return;
      let V = c.fetchers.get(index),
        B = V && V.state !== "idle" && V.data === void 0,
        re = qa(A, item.path, z);
      if (!re) {
        if (M && B) return;
        ee.push({
          key: index,
          routeId: item.routeId,
          path: item.path,
          matches: null,
          match: null,
          request: null,
          controller: null,
        });
        return;
      }
      if (_.has(index)) return;
      let oe = bs(re, item.path),
        R = new AbortController(),
        H = ol(s, item.path, R.signal),
        J = null;
      if (S.has(index)) {
        S.delete(index);
        J = ul(l, o, H, re, oe, h, r);
      } else if (B) {
        if (v) {
          J = ul(l, o, H, re, oe, h, r);
        }
      } else {
        let ne;
        typeof te == "boolean" ? (ne = te) : ue ? (ne = !1) : (ne = v);
        let me = {
          ...ce,
          defaultShouldRevalidate: ne,
        };
        if (Di(oe, me)) {
          J = ul(l, o, H, re, oe, h, r, me);
        }
      }
      if (J) {
        ee.push({
          key: index,
          routeId: item.routeId,
          path: item.path,
          matches: J,
          match: oe,
          request: H,
          controller: R,
        });
      }
    }),
    {
      dsMatches: be,
      revalidatingFetchers: ee,
    }
  );
}
function ud(n) {
  return n.loader != null || (n.middleware != null && n.middleware.length > 0);
}
function Pf(n, r, l) {
  if (n.lazy) return !0;
  if (!ud(n)) return !1;
  let o = r != null && n.id in r,
    s = l != null && l[n.id] !== void 0;
  if (!o && s) {
    return !1;
  }
  if (typeof n.loader == "function" && n.loader.hydrate === !0) {
    return !0;
  }
  return !o && !s;
}
function t2(n, r, l) {
  let o = !r || l.route.id !== r.route.id,
    s = !n.hasOwnProperty(l.route.id);
  return o || s;
}
function n2(n, r) {
  let l = n.route.path;
  return (
    n.pathname !== r.pathname ||
    (l != null && l.endsWith("*") && n.params["*"] !== r.params["*"])
  );
}
function Di(n, r) {
  if (n.route.shouldRevalidate) {
    let l = n.route.shouldRevalidate(r);
    if (typeof l == "boolean") return l;
  }
  return r.defaultShouldRevalidate;
}
function kg(n, r, l, o, s, c) {
  let f;
  if (n) {
    let h = o[n];
    Me(h, `No route found to patch children into: routeId = ${n}`);
    h.children || (h.children = []);
    f = h.children;
  } else f = l;
  let m = [],
    g = [];
  if (
    (r.forEach((item) => {
      let y = f.find((item) => Ly(item, item));
      y
        ? g.push({
            existingRoute: y,
            newRoute: item,
          })
        : m.push(item);
    }),
    m.length > 0)
  ) {
    let h = zi(m, s, [n || "_", "patch", String(f?.length || "0")], o);
    f.push(...h);
  }
  if (c && g.length > 0)
    for (let h = 0; h < g.length; h++) {
      let { existingRoute: y, newRoute: v } = g[h],
        S = y,
        [w] = zi([v], s, [], {}, !0);
      Object.assign(S, {
        element: w.element ? w.element : S.element,
        errorElement: w.errorElement ? w.errorElement : S.errorElement,
        hydrateFallbackElement: w.hydrateFallbackElement
          ? w.hydrateFallbackElement
          : S.hydrateFallbackElement,
      });
    }
}
function Ly(n, r) {
  if ("id" in n && "id" in r && n.id === r.id) {
    return !0;
  }
  if (
    n.index === r.index &&
    n.path === r.path &&
    n.caseSensitive === r.caseSensitive
  ) {
    return (!n.children || n.children.length === 0) &&
      (!r.children || r.children.length === 0)
      ? !0
      : n.children.every((item, index) => r.children?.some((s) => Ly(item, s)));
  }
  return !1;
}
var jg = new WeakMap(),
  Ny = ({ key: n, route: r, manifest: l, mapRouteProperties: o }) => {
    let s = l[r.id];
    if (
      (Me(s, "No route found in manifest"),
      !s.lazy || typeof s.lazy != "object")
    )
      return;
    let c = s.lazy[n];
    if (!c) return;
    let f = jg.get(s);
    f || ((f = {}), jg.set(s, f));
    let m = f[n];
    if (m) return m;
    let g = (async () => {
      let h = SS(n),
        v = s[n] !== void 0 && n !== "hasErrorBoundary";
      if (h) {
        it(
          !h,
          "Route property " +
            n +
            " is not a supported lazy route property. This property will be ignored.",
        );
        f[n] = Promise.resolve();
      } else if (v)
        it(
          !1,
          `Route "${s.id}" has a static property "${n}" defined. The lazy property will be ignored.`,
        );
      else {
        let S = await c();
        if (S != null) {
          (Object.assign(s, {
            [n]: S,
          }),
            Object.assign(s, o(s)));
        }
      }
      if (typeof s.lazy == "object") {
        ((s.lazy[n] = void 0),
          Object.values(s.lazy).every((item) => item === void 0) &&
            (s.lazy = void 0));
      }
    })();
    return ((f[n] = g), g);
  },
  Ug = new WeakMap();
function a2(n, r, l, o, s) {
  let c = l[n.id];
  if ((Me(c, "No route found in manifest"), !n.lazy))
    return {
      lazyRoutePromise: void 0,
      lazyHandlerPromise: void 0,
    };
  if (typeof n.lazy == "function") {
    let y = Ug.get(c);
    if (y)
      return {
        lazyRoutePromise: y,
        lazyHandlerPromise: y,
      };
    let v = (async () => {
      Me(typeof n.lazy == "function", "No lazy route function found");
      let S = await n.lazy(),
        w = {};
      for (let x in S) {
        let _ = S[x];
        if (_ === void 0) continue;
        let A = xS(x),
          M = c[x] !== void 0 && x !== "hasErrorBoundary";
        A
          ? it(
              !A,
              "Route property " +
                x +
                " is not a supported property to be returned from a lazy route function. This property will be ignored.",
            )
          : M
            ? it(
                !M,
                `Route "${c.id}" has a static property "${x}" defined but its lazy function is also returning a value for this property. The lazy route property "${x}" will be ignored.`,
              )
            : (w[x] = _);
      }
      Object.assign(c, w);
      Object.assign(c, {
        ...o(c),
        lazy: void 0,
      });
    })();
    return (
      Ug.set(c, v),
      v.catch(() => {}),
      {
        lazyRoutePromise: v,
        lazyHandlerPromise: v,
      }
    );
  }
  let f = Object.keys(n.lazy),
    m = [],
    g;
  for (let y of f) {
    if (s && s.includes(y)) continue;
    let v = Ny({
      key: y,
      route: n,
      manifest: l,
      mapRouteProperties: o,
    });
    if (v) {
      (m.push(v), y === r && (g = v));
    }
  }
  let h = m.length > 0 ? Promise.all(m).then(() => {}) : void 0;
  return (
    h?.catch(() => {}),
    g?.catch(() => {}),
    {
      lazyRoutePromise: h,
      lazyHandlerPromise: g,
    }
  );
}
async function Hg(n) {
  let r = n.matches.filter((item) => item.shouldLoad),
    l = {};
  return (
    (await Promise.all(r.map((item) => item.resolve()))).forEach(
      (item, index) => {
        l[r[index].route.id] = item;
      },
    ),
    l
  );
}
async function r2(n) {
  return n.matches.some((item) => item.route.middleware)
    ? My(n, () => Hg(n))
    : Hg(n);
}
function My(n, r) {
  return l2(
    n,
    r,
    (o) => {
      if (v2(o)) throw o;
      return o;
    },
    m2,
    l,
  );
  function l(o, s, c) {
    if (c)
      return Promise.resolve(
        Object.assign(c.value, {
          [s]: {
            type: "error",
            result: o,
          },
        }),
      );
    {
      let { matches: f } = n,
        m = Math.min(
          Math.max(
            f.findIndex((h) => h.route.id === s),
            0,
          ),
          Math.max(
            f.findIndex((h) => h.shouldCallHandler()),
            0,
          ),
        ),
        g = Va(f, f[m].route.id).route.id;
      return Promise.resolve({
        [g]: {
          type: "error",
          result: o,
        },
      });
    }
  }
}
async function l2(n, r, l, o, s) {
  let {
      matches: c,
      request: f,
      params: m,
      context: g,
      unstable_pattern: h,
    } = n,
    y = c.flatMap((item) =>
      item.route.middleware
        ? item.route.middleware.map((item) => [item.route.id, item])
        : [],
    );
  return await zy(
    {
      request: f,
      params: m,
      context: g,
      unstable_pattern: h,
    },
    y,
    r,
    l,
    o,
    s,
  );
}
async function zy(n, r, l, o, s, c, f = 0) {
  let { request: m } = n;
  if (m.signal.aborted)
    throw m.signal.reason ?? new Error(`Request aborted: ${m.method} ${m.url}`);
  let g = r[f];
  if (!g) return await l();
  let [h, y] = g,
    v,
    S = async () => {
      if (v) throw new Error("You may only call `next()` once per middleware");
      try {
        return (
          (v = {
            value: await zy(n, r, l, o, s, c, f + 1),
          }),
          v.value
        );
      } catch (w) {
        return (
          (v = {
            value: await c(w, h, v),
          }),
          v.value
        );
      }
    };
  try {
    let w = await y(n, S),
      x = w != null ? o(w) : void 0;
    if (s(x)) {
      return x;
    }
    if (v) {
      return x ?? v.value;
    }
    return (
      (v = {
        value: await S(),
      }),
      v.value
    );
  } catch (w) {
    return await c(w, h, v);
  }
}
function ky(n, r, l, o, s) {
  let c = Ny({
      key: "middleware",
      route: o.route,
      manifest: r,
      mapRouteProperties: n,
    }),
    f = a2(o.route, Bt(l.method) ? "action" : "loader", r, n, s);
  return {
    middleware: c,
    route: f.lazyRoutePromise,
    handler: f.lazyHandlerPromise,
  };
}
function Qf(n, r, l, o, s, c, f, m, g = null, h) {
  let y = !1,
    v = ky(n, r, l, s, c);
  return {
    ...s,
    _lazyPromises: v,
    shouldLoad: m,
    shouldRevalidateArgs: g,
    shouldCallHandler(S) {
      return (
        (y = !0),
        g
          ? typeof h == "boolean"
            ? Di(s, {
                ...g,
                defaultShouldRevalidate: h,
              })
            : typeof S == "boolean"
              ? Di(s, {
                  ...g,
                  defaultShouldRevalidate: S,
                })
              : Di(s, g)
          : m
      );
    },
    resolve(S) {
      let { lazy: w, loader: x, middleware: _ } = s.route,
        A = y || m || (S && !Bt(l.method) && (w || x)),
        z = _ && _.length > 0 && !x && !w;
      return A && (Bt(l.method) || !z)
        ? o2({
            request: l,
            unstable_pattern: o,
            match: s,
            lazyHandlerPromise: v?.handler,
            lazyRoutePromise: v?.route,
            handlerOverride: S,
            scopedContext: f,
          })
        : Promise.resolve({
            type: "data",
            result: void 0,
          });
    },
  };
}
function ul(n, r, l, o, s, c, f, m = null) {
  return o.map((item) =>
    item.route.id !== s.route.id
      ? {
          ...item,
          shouldLoad: !1,
          shouldRevalidateArgs: m,
          shouldCallHandler: () => !1,
          _lazyPromises: ky(n, r, l, item, c),
          resolve: () =>
            Promise.resolve({
              type: "data",
              result: void 0,
            }),
        }
      : Qf(n, r, l, Hi(o), item, c, f, !0, m),
  );
}
async function i2(n, r, l, o, s, c) {
  if (l.some((item) => item._lazyPromises?.middleware)) {
    await Promise.all(l.map((item) => item._lazyPromises?.middleware));
  }
  let f = {
      request: r,
      unstable_pattern: Hi(l),
      params: l[0].params,
      context: s,
      matches: l,
    },
    g = await n({
      ...f,
      fetcherKey: o,
      runClientMiddleware: (h) => {
        let y = f;
        return My(y, () =>
          h({
            ...y,
            fetcherKey: o,
            runClientMiddleware: () => {
              throw new Error(
                "Cannot call `runClientMiddleware()` from within an `runClientMiddleware` handler",
              );
            },
          }),
        );
      },
    });
  try {
    await Promise.all(
      l.flatMap((item) => [
        item._lazyPromises?.handler,
        item._lazyPromises?.route,
      ]),
    );
  } catch {}
  return g;
}
async function o2({
  request: n,
  unstable_pattern: r,
  match: l,
  lazyHandlerPromise: o,
  lazyRoutePromise: s,
  handlerOverride: c,
  scopedContext: f,
}) {
  let m,
    g,
    h = Bt(n.method),
    y = h ? "action" : "loader",
    v = (S) => {
      let w,
        x = new Promise((z, M) => (w = M));
      g = () => w();
      n.signal.addEventListener("abort", g);
      let _ = (z) => {
          return typeof S != "function"
            ? Promise.reject(
                new Error(
                  `You cannot call the handler for a route which defines a boolean "${y}" [routeId: ${l.route.id}]`,
                ),
              )
            : S(
                {
                  request: n,
                  unstable_pattern: r,
                  params: l.params,
                  context: f,
                },
                ...(z !== void 0 ? [z] : []),
              );
        },
        A = (async () => {
          try {
            return {
              type: "data",
              result: await (c ? c((M) => _(M)) : _()),
            };
          } catch (z) {
            return {
              type: "error",
              result: z,
            };
          }
        })();
      return Promise.race([A, x]);
    };
  try {
    let S = h ? l.route.action : l.route.loader;
    if (o || s) {
      if (S) {
        let w,
          [x] = await Promise.all([
            v(S).catch((error) => {
              w = error;
            }),
            o,
            s,
          ]);
        if (w !== void 0) throw w;
        m = x;
      } else {
        await o;
        let w = h ? l.route.action : l.route.loader;
        if (w) [m] = await Promise.all([v(w), s]);
        else if (y === "action") {
          let x = new URL(n.url),
            _ = x.pathname + x.search;
          throw wn(405, {
            method: n.method,
            pathname: _,
            routeId: l.route.id,
          });
        } else
          return {
            type: "data",
            result: void 0,
          };
      }
    } else if (S) m = await v(S);
    else {
      let w = new URL(n.url),
        x = w.pathname + w.search;
      throw wn(404, {
        pathname: x,
      });
    }
  } catch (S) {
    return {
      type: "error",
      result: S,
    };
  } finally {
    if (g) {
      n.signal.removeEventListener("abort", g);
    }
  }
  return m;
}
async function s2(n) {
  let r = n.headers.get("Content-Type");
  return r && /\bapplication\/json\b/.test(r)
    ? n.body == null
      ? null
      : n.json()
    : n.text();
}
async function u2(props) {
  let { result: r, type: l } = props;
  if (cd(r)) {
    let o;
    try {
      o = await s2(r);
    } catch (s) {
      return {
        type: "error",
        error: s,
      };
    }
    return l === "error"
      ? {
          type: "error",
          error: new Ui(r.status, r.statusText, o),
          statusCode: r.status,
          headers: r.headers,
        }
      : {
          type: "data",
          data: o,
          statusCode: r.status,
          headers: r.headers,
        };
  }
  if (l === "error") {
    return Gg(r)
      ? r.data instanceof Error
        ? {
            type: "error",
            error: r.data,
            statusCode: r.init?.status,
            headers: r.init?.headers ? new Headers(r.init.headers) : void 0,
          }
        : {
            type: "error",
            error: h2(r),
            statusCode: hl(r) ? r.status : void 0,
            headers: r.init?.headers ? new Headers(r.init.headers) : void 0,
          }
      : {
          type: "error",
          error: r,
          statusCode: hl(r) ? r.status : void 0,
        };
  }
  if (Gg(r)) {
    return {
      type: "data",
      data: r.data,
      statusCode: r.init?.status,
      headers: r.init?.headers ? new Headers(r.init.headers) : void 0,
    };
  }
  return {
    type: "data",
    data: r,
  };
}
function c2(n, r, l, o, s) {
  let c = n.headers.get("Location");
  if (
    (Me(
      c,
      "Redirects returned/thrown from loaders/actions must have a Location header",
    ),
    !zs(c))
  ) {
    let f = o.slice(0, o.findIndex((m) => m.route.id === l) + 1);
    c = Xf(new URL(r.url), f, s, c);
    n.headers.set("Location", c);
  }
  return n;
}
function Bg(n, r, l) {
  if (zs(n)) {
    let o = n,
      s = o.startsWith("//") ? new URL(r.protocol + o) : new URL(o),
      c = dn(s.pathname, l) != null;
    if (s.origin === r.origin && c) return s.pathname + s.search + s.hash;
  }
  return n;
}
function ol(n, r, l, o) {
  let s = n.createURL(jy(r)).toString(),
    c = {
      signal: l,
    };
  if (o && Bt(o.formMethod)) {
    let { formMethod: f, formEncType: m } = o;
    c.method = f.toUpperCase();
    m === "application/json"
      ? ((c.headers = new Headers({
          "Content-Type": m,
        })),
        (c.body = JSON.stringify(o.json)))
      : m === "text/plain"
        ? (c.body = o.text)
        : m === "application/x-www-form-urlencoded" && o.formData
          ? (c.body = Kf(o.formData))
          : (c.body = o.formData);
  }
  return new Request(s, c);
}
function Kf(n) {
  let r = new URLSearchParams();
  for (let [l, o] of n.entries())
    r.append(l, typeof o == "string" ? o : o.name);
  return r;
}
function $g(n) {
  let r = new FormData();
  for (let [l, o] of n.entries()) r.append(l, o);
  return r;
}
function f2(n, r, l, o = !1, s = !1) {
  let c = {},
    f = null,
    m,
    g = !1,
    h = {},
    y = l && fn(l[1]) ? l[1].error : void 0;
  return (
    n.forEach((item) => {
      if (!(item.route.id in r)) return;
      let S = item.route.id,
        w = r[S];
      if (
        (Me(!yr(w), "Cannot handle redirect results in processLoaderData"),
        fn(w))
      ) {
        let x = w.error;
        if ((y !== void 0 && ((x = y), (y = void 0)), (f = f || {}), s))
          f[S] = x;
        else {
          let _ = Va(n, S);
          if (f[_.route.id] == null) {
            f[_.route.id] = x;
          }
        }
        o || (c[S] = Dy);
        g || ((g = !0), (m = hl(w.error) ? w.error.status : 500));
        if (w.headers) {
          h[S] = w.headers;
        }
      } else {
        c[S] = w.data;
        if (w.statusCode && w.statusCode !== 200 && !g) {
          m = w.statusCode;
        }
        if (w.headers) {
          h[S] = w.headers;
        }
      }
    }),
    y !== void 0 &&
      l &&
      ((f = {
        [l[0]]: y,
      }),
      l[2] && (c[l[2]] = void 0)),
    {
      loaderData: c,
      errors: f,
      statusCode: m || 200,
      loaderHeaders: h,
    }
  );
}
function qg(n, r, l, o, s, c) {
  let { loaderData: f, errors: m } = f2(r, l, o);
  return (
    s
      .filter(
        (item) => !item.matches || item.matches.some((item) => item.shouldLoad),
      )
      .forEach((props) => {
        let { key: h, match: y, controller: v } = props;
        if (v && v.signal.aborted) return;
        let S = c[h];
        if ((Me(S, "Did not find corresponding fetcher result"), fn(S))) {
          let w = Va(n.matches, y?.route.id);
          (m && m[w.route.id]) ||
            (m = {
              ...m,
              [w.route.id]: S.error,
            });
          n.fetchers.delete(h);
        } else if (yr(S)) Me(!1, "Unhandled fetcher revalidation redirect");
        else {
          let w = fa(S.data);
          n.fetchers.set(h, w);
        }
      }),
    {
      loaderData: f,
      errors: m,
    }
  );
}
function Vg(n, r, l, o) {
  let s = Object.entries(r)
    .filter(([, c]) => c !== Dy)
    .reduce((item, [f, m]) => ((item[f] = m), item), {});
  for (let c of l) {
    let f = c.route.id;
    if (
      (!r.hasOwnProperty(f) &&
        n.hasOwnProperty(f) &&
        c.route.loader &&
        (s[f] = n[f]),
      o && o.hasOwnProperty(f))
    )
      break;
  }
  return s;
}
function Yg(n) {
  return n
    ? fn(n[1])
      ? {
          actionData: {},
        }
      : {
          actionData: {
            [n[0]]: n[1].data,
          },
        }
    : {};
}
function Va(n, r) {
  return (
    (r ? n.slice(0, n.findIndex((o) => o.route.id === r) + 1) : [...n])
      .reverse()
      .find((item) => item.route.hasErrorBoundary === !0) || n[0]
  );
}
function us(n) {
  let r =
    n.length === 1
      ? n[0]
      : n.find((item) => item.index || !item.path || item.path === "/") || {
          id: "__shim-error-route__",
        };
  return {
    matches: [
      {
        params: {},
        pathname: "",
        pathnameBase: "",
        route: r,
      },
    ],
    route: r,
  };
}
function wn(
  n,
  { pathname: r, routeId: l, method: o, type: s, message: c } = {},
) {
  let f = "Unknown Server Error",
    m = "Unknown @remix-run/router error";
  return (
    n === 400
      ? ((f = "Bad Request"),
        o && r && l
          ? (m = `You made a ${o} request to "${r}" but did not provide a \`loader\` for route "${l}", so there is no way to handle the request.`)
          : s === "invalid-body" && (m = "Unable to encode submission body"))
      : n === 403
        ? ((f = "Forbidden"), (m = `Route "${l}" does not match URL "${r}"`))
        : n === 404
          ? ((f = "Not Found"), (m = `No route matches URL "${r}"`))
          : n === 405 &&
            ((f = "Method Not Allowed"),
            o && r && l
              ? (m = `You made a ${o.toUpperCase()} request to "${r}" but did not provide an \`action\` for route "${l}", so there is no way to handle the request.`)
              : o && (m = `Invalid request method "${o.toUpperCase()}"`)),
    new Ui(n || 500, f, new Error(m), !0)
  );
}
function cs(n) {
  let r = Object.entries(n);
  for (let l = r.length - 1; l >= 0; l--) {
    let [o, s] = r[l];
    if (yr(s))
      return {
        key: o,
        result: s,
      };
  }
}
function jy(n) {
  let r = typeof n == "string" ? Ga(n) : n;
  return Gn({
    ...r,
    hash: "",
  });
}
function d2(n, r) {
  if (n.pathname !== r.pathname || n.search !== r.search) {
    return !1;
  }
  if (n.hash === "") {
    return r.hash !== "";
  }
  if (n.hash === r.hash) {
    return !0;
  }
  return r.hash !== "";
}
function h2(n) {
  return new Ui(
    n.init?.status ?? 500,
    n.init?.statusText ?? "Internal Server Error",
    n.data,
  );
}
function m2(n) {
  return (
    n != null &&
    typeof n == "object" &&
    Object.entries(n).every(([r, l]) => typeof r == "string" && g2(l))
  );
}
function g2(props) {
  return (
    props != null &&
    typeof props == "object" &&
    "type" in props &&
    "result" in props &&
    (props.type === "data" || props.type === "error")
  );
}
function p2(n) {
  return cd(n.result) && Cy.has(n.result.status);
}
function fn(props) {
  return props.type === "error";
}
function yr(props) {
  return (props && props.type) === "redirect";
}
function Gg(props) {
  return (
    typeof props == "object" &&
    props != null &&
    "type" in props &&
    "data" in props &&
    "init" in props &&
    props.type === "DataWithResponseInit"
  );
}
function cd(n) {
  return (
    n != null &&
    typeof n.status == "number" &&
    typeof n.statusText == "string" &&
    typeof n.headers == "object" &&
    typeof n.body < "u"
  );
}
function y2(n) {
  return Cy.has(n);
}
function v2(n) {
  return cd(n) && y2(n.status) && n.headers.has("Location");
}
function b2(n) {
  return KS.has(n.toUpperCase());
}
function Bt(n) {
  return PS.has(n.toUpperCase());
}
function fd(n) {
  return new URLSearchParams(n).getAll("index").some((item) => item === "");
}
function bs(n, r) {
  let l = typeof r == "string" ? Ga(r).search : r.search;
  if (n[n.length - 1].route.index && fd(l || "")) return n[n.length - 1];
  let o = wy(n);
  return o[o.length - 1];
}
function Fg(props) {
  let {
    formMethod: r,
    formAction: l,
    formEncType: o,
    text: s,
    formData: c,
    json: f,
  } = props;
  if (!(!r || !l || !o)) {
    if (s != null)
      return {
        formMethod: r,
        formAction: l,
        formEncType: o,
        formData: void 0,
        json: void 0,
        text: s,
      };
    if (c != null)
      return {
        formMethod: r,
        formAction: l,
        formEncType: o,
        formData: c,
        json: void 0,
        text: void 0,
      };
    if (f !== void 0)
      return {
        formMethod: r,
        formAction: l,
        formEncType: o,
        formData: void 0,
        json: f,
        text: void 0,
      };
  }
}
function vf(n, r) {
  return r
    ? {
        state: "loading",
        location: n,
        formMethod: r.formMethod,
        formAction: r.formAction,
        formEncType: r.formEncType,
        formData: r.formData,
        json: r.json,
        text: r.text,
      }
    : {
        state: "loading",
        location: n,
        formMethod: void 0,
        formAction: void 0,
        formEncType: void 0,
        formData: void 0,
        json: void 0,
        text: void 0,
      };
}
function S2(n, r) {
  return {
    state: "submitting",
    location: n,
    formMethod: r.formMethod,
    formAction: r.formAction,
    formEncType: r.formEncType,
    formData: r.formData,
    json: r.json,
    text: r.text,
  };
}
function Ei(n, r) {
  return n
    ? {
        state: "loading",
        formMethod: n.formMethod,
        formAction: n.formAction,
        formEncType: n.formEncType,
        formData: n.formData,
        json: n.json,
        text: n.text,
        data: r,
      }
    : {
        state: "loading",
        formMethod: void 0,
        formAction: void 0,
        formEncType: void 0,
        formData: void 0,
        json: void 0,
        text: void 0,
        data: r,
      };
}
function E2(n, r) {
  return {
    state: "submitting",
    formMethod: n.formMethod,
    formAction: n.formAction,
    formEncType: n.formEncType,
    formData: n.formData,
    json: n.json,
    text: n.text,
    data: r ? r.data : void 0,
  };
}
function fa(n) {
  return {
    state: "idle",
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
    data: n,
  };
}
function x2(n, r) {
  try {
    let l = n.sessionStorage.getItem(Ay);
    if (l) {
      let o = JSON.parse(l);
      for (let [s, c] of Object.entries(o || {}))
        if (c && Array.isArray(c)) {
          r.set(s, new Set(c || []));
        }
    }
  } catch {}
}
function w2(n, r) {
  if (r.size > 0) {
    let l = {};
    for (let [o, s] of r) l[o] = [...s];
    try {
      n.sessionStorage.setItem(Ay, JSON.stringify(l));
    } catch (o) {
      it(
        !1,
        `Failed to save applied view transitions in sessionStorage (${o}).`,
      );
    }
  }
}
function Xg() {
  let n,
    r,
    l = new Promise((o, s) => {
      n = async (c) => {
        o(c);
        try {
          await l;
        } catch {}
      };
      r = async (c) => {
        s(c);
        try {
          await l;
        } catch {}
      };
    });
  return {
    promise: l,
    resolve: n,
    reject: r,
  };
}
var Er = E.createContext(null);
Er.displayName = "DataRouter";
var pl = E.createContext(null);
pl.displayName = "DataRouterState";
var Uy = E.createContext(!1);
function R2() {
  return E.useContext(Uy);
}
var dd = E.createContext({
  isTransitioning: !1,
});
dd.displayName = "ViewTransition";
var Hy = E.createContext(new Map());
Hy.displayName = "Fetchers";
var _2 = E.createContext(null);
_2.displayName = "Await";
var Yt = E.createContext(null);
Yt.displayName = "Navigation";
var Us = E.createContext(null);
Us.displayName = "Location";
var _n = E.createContext({
  outlet: null,
  matches: [],
  isDataRoute: !1,
});
_n.displayName = "Route";
var hd = E.createContext(null);
hd.displayName = "RouteError";
var By = "REACT_ROUTER_ERROR",
  T2 = "REDIRECT",
  O2 = "ROUTE_ERROR_RESPONSE";
function C2(n) {
  if (n.startsWith(`${By}:${T2}:{`))
    try {
      let r = JSON.parse(n.slice(28));
      if (
        typeof r == "object" &&
        r &&
        typeof r.status == "number" &&
        typeof r.statusText == "string" &&
        typeof r.location == "string" &&
        typeof r.reloadDocument == "boolean" &&
        typeof r.replace == "boolean"
      )
        return r;
    } catch {}
}
function A2(n) {
  if (n.startsWith(`${By}:${O2}:{`))
    try {
      let r = JSON.parse(n.slice(40));
      if (
        typeof r == "object" &&
        r &&
        typeof r.status == "number" &&
        typeof r.statusText == "string"
      )
        return new Ui(r.status, r.statusText, r.data);
    } catch {}
}
function D2(n, { relative: r } = {}) {
  Me(
    yl(),
    "useHref() may be used only in the context of a <Router> component.",
  );
  let { basename: l, navigator: o } = E.useContext(Yt),
    {
      hash: s,
      pathname: c,
      search: f,
    } = Bi(n, {
      relative: r,
    }),
    m = c;
  return (
    l !== "/" && (m = c === "/" ? l : Yn([l, c])),
    o.createHref({
      pathname: m,
      search: f,
      hash: s,
    })
  );
}
function yl() {
  return E.useContext(Us) != null;
}
function tn() {
  return (
    Me(
      yl(),
      "useLocation() may be used only in the context of a <Router> component.",
    ),
    E.useContext(Us).location
  );
}
var $y =
  "You should call navigate() in a React.useEffect(), not when your component is first rendered.";
function qy(n) {
  E.useContext(Yt).static || E.useLayoutEffect(n);
}
function md() {
  let { isDataRoute: n } = E.useContext(_n);
  return n ? V2() : L2();
}
function L2() {
  Me(
    yl(),
    "useNavigate() may be used only in the context of a <Router> component.",
  );
  let n = E.useContext(Er),
    { basename: r, navigator: l } = E.useContext(Yt),
    { matches: o } = E.useContext(_n),
    { pathname: s } = tn(),
    c = JSON.stringify(ks(o)),
    f = E.useRef(!1);
  return (
    qy(() => {
      f.current = !0;
    }),
    E.useCallback(
      (g, h = {}) => {
        if ((it(f.current, $y), !f.current)) return;
        if (typeof g == "number") {
          l.go(g);
          return;
        }
        let y = js(g, JSON.parse(c), s, h.relative === "path");
        if (n == null && r !== "/") {
          y.pathname = y.pathname === "/" ? r : Yn([r, y.pathname]);
        }
        (h.replace ? l.replace : l.push)(y, h.state, h);
      },
      [r, l, c, s, n],
    )
  );
}
var N2 = E.createContext(null);
function vl(n) {
  let r = E.useContext(_n).outlet;
  return E.useMemo(
    () =>
      r &&
      E.createElement(
        N2.Provider,
        {
          value: n,
        },
        r,
      ),
    [r, n],
  );
}
function pT() {
  let { matches: n } = E.useContext(_n),
    r = n[n.length - 1];
  return r ? r.params : {};
}
function Bi(n, { relative: r } = {}) {
  let { matches: l } = E.useContext(_n),
    { pathname: o } = tn(),
    s = JSON.stringify(ks(l));
  return E.useMemo(() => js(n, JSON.parse(s), o, r === "path"), [n, s, o, r]);
}
function M2(n, r, l, o, s) {
  Me(
    yl(),
    "useRoutes() may be used only in the context of a <Router> component.",
  );
  let { navigator: c } = E.useContext(Yt),
    { matches: f } = E.useContext(_n),
    m = f[f.length - 1],
    g = m ? m.params : {},
    h = m ? m.pathname : "/",
    y = m ? m.pathnameBase : "/",
    v = m && m.route;
  {
    let M = (v && v.path) || "";
    Xy(
      h,
      !v || M.endsWith("*") || M.endsWith("*?"),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${h}" (under <Route path="${M}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${M}"> to <Route path="${M === "/" ? "*" : `${M}/*`}">.`,
    );
  }
  let S = tn(),
    w;
  w = S;
  let x = w.pathname || "/",
    _ = x;
  if (y !== "/") {
    let M = y.replace(/^\//, "").split("/");
    _ = "/" + x.replace(/^\//, "").split("/").slice(M.length).join("/");
  }
  let A = qa(n, {
    pathname: _,
  });
  return (
    it(
      v || A != null,
      `No routes matched location "${w.pathname}${w.search}${w.hash}" `,
    ),
    it(
      A == null ||
        A[A.length - 1].route.element !== void 0 ||
        A[A.length - 1].route.Component !== void 0 ||
        A[A.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${w.pathname}${w.search}${w.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`,
    ),
    H2(
      A &&
        A.map((item) =>
          Object.assign({}, item, {
            params: Object.assign({}, g, item.params),
            pathname: Yn([
              y,
              c.encodeLocation
                ? c.encodeLocation(
                    item.pathname.replace(/\?/g, "%3F").replace(/#/g, "%23"),
                  ).pathname
                : item.pathname,
            ]),
            pathnameBase:
              item.pathnameBase === "/"
                ? y
                : Yn([
                    y,
                    c.encodeLocation
                      ? c.encodeLocation(
                          item.pathnameBase
                            .replace(/\?/g, "%3F")
                            .replace(/#/g, "%23"),
                        ).pathname
                      : item.pathnameBase,
                  ]),
          }),
        ),
      f,
      l,
      o,
      s,
    )
  );
}
function z2() {
  let n = Fy(),
    r = hl(n)
      ? `${n.status} ${n.statusText}`
      : n instanceof Error
        ? n.message
        : JSON.stringify(n),
    l = n instanceof Error ? n.stack : null,
    o = "rgba(200,200,200, 0.5)",
    s = {
      padding: "0.5rem",
      backgroundColor: o,
    },
    c = {
      padding: "2px 4px",
      backgroundColor: o,
    },
    f = null;
  return (
    console.error("Error handled by React Router default ErrorBoundary:", n),
    (f = E.createElement(
      E.Fragment,
      null,
      E.createElement("p", null, "💿 Hey developer 👋"),
      E.createElement(
        "p",
        null,
        "You can provide a way better UX than this when your app throws errors by providing your own ",
        E.createElement(
          "code",
          {
            style: c,
          },
          "ErrorBoundary",
        ),
        " or",
        " ",
        E.createElement(
          "code",
          {
            style: c,
          },
          "errorElement",
        ),
        " prop on your route.",
      ),
    )),
    E.createElement(
      E.Fragment,
      null,
      E.createElement("h2", null, "Unexpected Application Error!"),
      E.createElement(
        "h3",
        {
          style: {
            fontStyle: "italic",
          },
        },
        r,
      ),
      l
        ? E.createElement(
            "pre",
            {
              style: s,
            },
            l,
          )
        : null,
      f,
    )
  );
}
var k2 = E.createElement(z2, null),
  Vy = class extends E.Component {
    constructor(n) {
      super(n);
      this.state = {
        location: n.location,
        revalidation: n.revalidation,
        error: n.error,
      };
    }
    static getDerivedStateFromError(n) {
      return {
        error: n,
      };
    }
    static getDerivedStateFromProps(n, r) {
      return r.location !== n.location ||
        (r.revalidation !== "idle" && n.revalidation === "idle")
        ? {
            error: n.error,
            location: n.location,
            revalidation: n.revalidation,
          }
        : {
            error: n.error !== void 0 ? n.error : r.error,
            location: r.location,
            revalidation: n.revalidation || r.revalidation,
          };
    }
    componentDidCatch(n, r) {
      this.props.onError
        ? this.props.onError(n, r)
        : console.error(
            "React Router caught the following error during render",
            n,
          );
    }
    render() {
      let n = this.state.error;
      if (
        this.context &&
        typeof n == "object" &&
        n &&
        "digest" in n &&
        typeof n.digest == "string"
      ) {
        const l = A2(n.digest);
        if (l) {
          n = l;
        }
      }
      let r =
        n !== void 0
          ? E.createElement(
              _n.Provider,
              {
                value: this.props.routeContext,
              },
              E.createElement(hd.Provider, {
                value: n,
                children: this.props.component,
              }),
            )
          : this.props.children;
      return this.context
        ? E.createElement(
            j2,
            {
              error: n,
            },
            r,
          )
        : r;
    }
  };
Vy.contextType = Uy;
var bf = new WeakMap();
function j2({ children: n, error: r }) {
  let { basename: l } = E.useContext(Yt);
  if (
    typeof r == "object" &&
    r &&
    "digest" in r &&
    typeof r.digest == "string"
  ) {
    let o = C2(r.digest);
    if (o) {
      let s = bf.get(r);
      if (s) throw s;
      let c = _y(o.location, l);
      if (Ry && !bf.get(r))
        if (c.isExternal || o.reloadDocument)
          window.location.href = c.absoluteURL || c.to;
        else {
          const f = Promise.resolve().then(() =>
            window.__reactRouterDataRouter.navigate(c.to, {
              replace: o.replace,
            }),
          );
          throw (bf.set(r, f), f);
        }
      return E.createElement("meta", {
        httpEquiv: "refresh",
        content: `0;url=${c.absoluteURL || c.to}`,
      });
    }
  }
  return n;
}
function U2({ routeContext: n, match: r, children: l }) {
  let o = E.useContext(Er);
  return (
    o &&
      o.static &&
      o.staticContext &&
      (r.route.errorElement || r.route.ErrorBoundary) &&
      (o.staticContext._deepestRenderedBoundaryId = r.route.id),
    E.createElement(
      _n.Provider,
      {
        value: n,
      },
      l,
    )
  );
}
function H2(n, r = [], l = null, o = null, s = null) {
  if (n == null) {
    if (!l) return null;
    if (l.errors) n = l.matches;
    else if (r.length === 0 && !l.initialized && l.matches.length > 0)
      n = l.matches;
    else return null;
  }
  let c = n,
    f = l?.errors;
  if (f != null) {
    let y = c.findIndex((v) => v.route.id && f?.[v.route.id] !== void 0);
    Me(
      y >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(f).join(",")}`,
    );
    c = c.slice(0, Math.min(c.length, y + 1));
  }
  let m = !1,
    g = -1;
  if (l)
    for (let y = 0; y < c.length; y++) {
      let v = c[y];
      if (
        ((v.route.HydrateFallback || v.route.hydrateFallbackElement) && (g = y),
        v.route.id)
      ) {
        let { loaderData: S, errors: w } = l,
          x =
            v.route.loader &&
            !S.hasOwnProperty(v.route.id) &&
            (!w || w[v.route.id] === void 0);
        if (v.route.lazy || x) {
          m = !0;
          g >= 0 ? (c = c.slice(0, g + 1)) : (c = [c[0]]);
          break;
        }
      }
    }
  let h =
    l && o
      ? (y, v) => {
          o(y, {
            location: l.location,
            params: l.matches?.[0]?.params ?? {},
            unstable_pattern: Hi(l.matches),
            errorInfo: v,
          });
        }
      : void 0;
  return c.reduceRight((y, v, S) => {
    let w,
      x = !1,
      _ = null,
      A = null;
    if (l) {
      ((w = f && v.route.id ? f[v.route.id] : void 0),
        (_ = v.route.errorElement || k2),
        m &&
          (g < 0 && S === 0
            ? (Xy(
                "route-fallback",
                !1,
                "No `HydrateFallback` element provided to render during initial hydration",
              ),
              (x = !0),
              (A = null))
            : g === S &&
              ((x = !0), (A = v.route.hydrateFallbackElement || null))));
    }
    let z = r.concat(c.slice(0, S + 1)),
      M = () => {
        let F;
        return (
          w
            ? (F = _)
            : x
              ? (F = A)
              : v.route.Component
                ? (F = E.createElement(v.route.Component, null))
                : v.route.element
                  ? (F = v.route.element)
                  : (F = y),
          E.createElement(U2, {
            match: v,
            routeContext: {
              outlet: y,
              matches: z,
              isDataRoute: l != null,
            },
            children: F,
          })
        );
      };
    return l && (v.route.ErrorBoundary || v.route.errorElement || S === 0)
      ? E.createElement(Vy, {
          location: l.location,
          revalidation: l.revalidation,
          component: _,
          error: w,
          children: M(),
          routeContext: {
            outlet: null,
            matches: z,
            isDataRoute: !0,
          },
          onError: h,
        })
      : M();
  }, null);
}
function gd(n) {
  return `${n} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function B2(n) {
  let r = E.useContext(Er);
  return (Me(r, gd(n)), r);
}
function Hs(n) {
  let r = E.useContext(pl);
  return (Me(r, gd(n)), r);
}
function $2(n) {
  let r = E.useContext(_n);
  return (Me(r, gd(n)), r);
}
function pd(n) {
  let r = $2(n),
    l = r.matches[r.matches.length - 1];
  return (
    Me(
      l.route.id,
      `${n} can only be used on routes that contain a unique "id"`,
    ),
    l.route.id
  );
}
function q2() {
  return pd("useRouteId");
}
function Yy() {
  return Hs("useNavigation").navigation;
}
function Gy() {
  let { matches: n, loaderData: r } = Hs("useMatches");
  return E.useMemo(() => n.map((item) => by(item, r)), [n, r]);
}
function yT(n) {
  return Hs("useRouteLoaderData").loaderData[n];
}
function Fy() {
  let n = E.useContext(hd),
    r = Hs("useRouteError"),
    l = pd("useRouteError");
  return n !== void 0 ? n : r.errors?.[l];
}
function V2() {
  let { router: n } = B2("useNavigate"),
    r = pd("useNavigate"),
    l = E.useRef(!1);
  return (
    qy(() => {
      l.current = !0;
    }),
    E.useCallback(
      async (s, c = {}) => {
        it(l.current, $y);
        if (l.current) {
          typeof s == "number"
            ? await n.navigate(s)
            : await n.navigate(s, {
                fromRouteId: r,
                ...c,
              });
        }
      },
      [n, r],
    )
  );
}
var Pg = {};
function Xy(n, r, l) {
  if (!r && !Pg[n]) {
    ((Pg[n] = !0), it(!1, l));
  }
}
var Qg = {};
function Kg(n, r) {
  if (!n && !Qg[r]) {
    ((Qg[r] = !0), console.warn(r));
  }
}
var Y2 = "useOptimistic",
  Zg = hS[Y2],
  G2 = () => {};
function F2(n) {
  return Zg ? Zg(n) : [n, G2];
}
function X2(n) {
  let r = {
    hasErrorBoundary:
      n.hasErrorBoundary || n.ErrorBoundary != null || n.errorElement != null,
  };
  return (
    n.Component &&
      (n.element &&
        it(
          !1,
          "You should not include both `Component` and `element` on your route - `Component` will be used.",
        ),
      Object.assign(r, {
        element: E.createElement(n.Component),
        Component: void 0,
      })),
    n.HydrateFallback &&
      (n.hydrateFallbackElement &&
        it(
          !1,
          "You should not include both `HydrateFallback` and `hydrateFallbackElement` on your route - `HydrateFallback` will be used.",
        ),
      Object.assign(r, {
        hydrateFallbackElement: E.createElement(n.HydrateFallback),
        HydrateFallback: void 0,
      })),
    n.ErrorBoundary &&
      (n.errorElement &&
        it(
          !1,
          "You should not include both `ErrorBoundary` and `errorElement` on your route - `ErrorBoundary` will be used.",
        ),
      Object.assign(r, {
        errorElement: E.createElement(n.ErrorBoundary),
        ErrorBoundary: void 0,
      })),
    r
  );
}
var P2 = ["HydrateFallback", "hydrateFallbackElement"],
  Q2 = class {
    constructor() {
      this.status = "pending";
      this.promise = new Promise((n, r) => {
        this.resolve = (l) => {
          if (this.status === "pending") {
            ((this.status = "resolved"), n(l));
          }
        };
        this.reject = (l) => {
          if (this.status === "pending") {
            ((this.status = "rejected"), r(l));
          }
        };
      });
    }
  };
function K2({
  router: n,
  flushSync: r,
  onError: l,
  unstable_useTransitions: o,
}) {
  o = R2() || o;
  let [c, f] = E.useState(n.state),
    [m, g] = F2(c),
    [h, y] = E.useState(),
    [v, S] = E.useState({
      isTransitioning: !1,
    }),
    [w, x] = E.useState(),
    [_, A] = E.useState(),
    [z, M] = E.useState(),
    F = E.useRef(new Map()),
    te = E.useCallback(
      (
        le,
        {
          deletedFetchers: ie,
          newErrors: ue,
          flushSync: ce,
          viewTransitionOpts: Ee,
        },
      ) => {
        if (ue && l) {
          Object.values(ue).forEach((item) =>
            l(item, {
              location: le.location,
              params: le.matches[0]?.params ?? {},
              unstable_pattern: Hi(le.matches),
            }),
          );
        }
        le.fetchers.forEach((item, index) => {
          if (item.data !== void 0) {
            F.current.set(index, item.data);
          }
        });
        ie.forEach((item) => F.current.delete(item));
        Kg(
          ce === !1 || r != null,
          'You provided the `flushSync` option to a router update, but you are not using the `<RouterProvider>` from `react-router/dom` so `ReactDOM.flushSync()` is unavailable.  Please update your app to `import { RouterProvider } from "react-router/dom"` and ensure you have `react-dom` installed as a dependency to use the `flushSync` option.',
        );
        let be =
          n.window != null &&
          n.window.document != null &&
          typeof n.window.document.startViewTransition == "function";
        if (
          (Kg(
            Ee == null || be,
            "You provided the `viewTransition` option to a router update, but you do not appear to be running in a DOM environment as `window.startViewTransition` is not available.",
          ),
          !Ee || !be)
        ) {
          r && ce
            ? r(() => f(le))
            : o === !1
              ? f(le)
              : E.startTransition(() => {
                  if (o === !0) {
                    g((ee) => Jg(ee, le));
                  }
                  f(le);
                });
          return;
        }
        if (r && ce) {
          r(() => {
            if (_) {
              (w?.resolve(), _.skipTransition());
            }
            S({
              isTransitioning: !0,
              flushSync: !0,
              currentLocation: Ee.currentLocation,
              nextLocation: Ee.nextLocation,
            });
          });
          let ee = n.window.document.startViewTransition(() => {
            r(() => f(le));
          });
          ee.finished.finally(() => {
            r(() => {
              x(void 0);
              A(void 0);
              y(void 0);
              S({
                isTransitioning: !1,
              });
            });
          });
          r(() => A(ee));
          return;
        }
        _
          ? (w?.resolve(),
            _.skipTransition(),
            M({
              state: le,
              currentLocation: Ee.currentLocation,
              nextLocation: Ee.nextLocation,
            }))
          : (y(le),
            S({
              isTransitioning: !0,
              flushSync: !1,
              currentLocation: Ee.currentLocation,
              nextLocation: Ee.nextLocation,
            }));
      },
      [n.window, r, _, w, o, g, l],
    );
  E.useLayoutEffect(() => n.subscribe(te), [n, te]);
  E.useEffect(() => {
    if (v.isTransitioning && !v.flushSync) {
      x(new Q2());
    }
  }, [v]);
  E.useEffect(() => {
    if (w && h && n.window) {
      let le = h,
        ie = w.promise,
        ue = n.window.document.startViewTransition(async () => {
          o === !1
            ? f(le)
            : E.startTransition(() => {
                if (o === !0) {
                  g((ce) => Jg(ce, le));
                }
                f(le);
              });
          await ie;
        });
      ue.finished.finally(() => {
        x(void 0);
        A(void 0);
        y(void 0);
        S({
          isTransitioning: !1,
        });
      });
      A(ue);
    }
  }, [h, w, n.window, o, g]);
  E.useEffect(() => {
    if (w && h && m.location.key === h.location.key) {
      w.resolve();
    }
  }, [w, _, m.location, h]);
  E.useEffect(() => {
    if (!v.isTransitioning && z) {
      (y(z.state),
        S({
          isTransitioning: !0,
          flushSync: !1,
          currentLocation: z.currentLocation,
          nextLocation: z.nextLocation,
        }),
        M(void 0));
    }
  }, [v.isTransitioning, z]);
  let U = E.useMemo(
      () => ({
        createHref: n.createHref,
        encodeLocation: n.encodeLocation,
        go: (le) => n.navigate(le),
        push: (le, ie, ue) =>
          n.navigate(le, {
            state: ie,
            preventScrollReset: ue?.preventScrollReset,
          }),
        replace: (le, ie, ue) =>
          n.navigate(le, {
            replace: !0,
            state: ie,
            preventScrollReset: ue?.preventScrollReset,
          }),
      }),
      [n],
    ),
    W = n.basename || "/",
    D = E.useMemo(
      () => ({
        router: n,
        navigator: U,
        static: !1,
        basename: W,
        onError: l,
      }),
      [n, U, W, l],
    );
  return E.createElement(
    E.Fragment,
    null,
    E.createElement(
      Er.Provider,
      {
        value: D,
      },
      E.createElement(
        pl.Provider,
        {
          value: m,
        },
        E.createElement(
          Hy.Provider,
          {
            value: F.current,
          },
          E.createElement(
            dd.Provider,
            {
              value: v,
            },
            E.createElement(
              I2,
              {
                basename: W,
                location: m.location,
                navigationType: m.historyAction,
                navigator: U,
                unstable_useTransitions: o,
              },
              E.createElement(Z2, {
                routes: n.routes,
                future: n.future,
                state: m,
                onError: l,
              }),
            ),
          ),
        ),
      ),
    ),
    null,
  );
}
function Jg(n, r) {
  return {
    ...n,
    navigation: r.navigation.state !== "idle" ? r.navigation : n.navigation,
    revalidation: r.revalidation !== "idle" ? r.revalidation : n.revalidation,
    actionData:
      r.navigation.state !== "submitting" ? r.actionData : n.actionData,
    fetchers: r.fetchers,
  };
}
var Z2 = E.memo(J2);
function J2({ routes: n, future: r, state: l, onError: o }) {
  return M2(n, void 0, l, o, r);
}
function Rn({ to: n, replace: r, state: l, relative: o }) {
  Me(
    yl(),
    "<Navigate> may be used only in the context of a <Router> component.",
  );
  let { static: s } = E.useContext(Yt);
  it(
    !s,
    "<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.",
  );
  let { matches: c } = E.useContext(_n),
    { pathname: f } = tn(),
    m = md(),
    g = js(n, ks(c), f, o === "path"),
    h = JSON.stringify(g);
  return (
    E.useEffect(() => {
      m(JSON.parse(h), {
        replace: r,
        state: l,
        relative: o,
      });
    }, [m, h, o, r, l]),
    null
  );
}
function Py(n) {
  return vl(n.context);
}
function I2({
  basename: n = "/",
  children: r = null,
  location: l,
  navigationType: o = "POP",
  navigator: s,
  static: c = !1,
  unstable_useTransitions: f,
}) {
  Me(
    !yl(),
    "You cannot render a <Router> inside another <Router>. You should never have more than one in your app.",
  );
  let m = n.replace(/^\/*/, "/"),
    g = E.useMemo(
      () => ({
        basename: m,
        navigator: s,
        static: c,
        unstable_useTransitions: f,
        future: {},
      }),
      [m, s, c, f],
    );
  if (typeof l == "string") {
    l = Ga(l);
  }
  let {
      pathname: h = "/",
      search: y = "",
      hash: v = "",
      state: S = null,
      key: w = "default",
    } = l,
    x = E.useMemo(() => {
      let _ = dn(h, m);
      return _ == null
        ? null
        : {
            location: {
              pathname: _,
              search: y,
              hash: v,
              state: S,
              key: w,
            },
            navigationType: o,
          };
    }, [m, h, y, v, S, w, o]);
  return (
    it(
      x != null,
      `<Router basename="${m}"> is not able to match the URL "${h}${y}${v}" because it does not start with the basename, so the <Router> won't render anything.`,
    ),
    x == null
      ? null
      : E.createElement(
          Yt.Provider,
          {
            value: g,
          },
          E.createElement(Us.Provider, {
            children: r,
            value: x,
          }),
        )
  );
}
var Ss = "get",
  Es = "application/x-www-form-urlencoded";
function Bs(n) {
  return typeof HTMLElement < "u" && n instanceof HTMLElement;
}
function W2(n) {
  return Bs(n) && n.tagName.toLowerCase() === "button";
}
function eE(n) {
  return Bs(n) && n.tagName.toLowerCase() === "form";
}
function tE(n) {
  return Bs(n) && n.tagName.toLowerCase() === "input";
}
function nE(n) {
  return !!(n.metaKey || n.altKey || n.ctrlKey || n.shiftKey);
}
function aE(n, r) {
  return n.button === 0 && (!r || r === "_self") && !nE(n);
}
function Zf(n = "") {
  return new URLSearchParams(
    typeof n == "string" || Array.isArray(n) || n instanceof URLSearchParams
      ? n
      : Object.keys(n).reduce((item, acc) => {
          let o = n[acc];
          return item.concat(
            Array.isArray(o) ? o.map((item) => [acc, item]) : [[acc, o]],
          );
        }, []),
  );
}
function rE(n, r) {
  let l = Zf(n);
  return (
    r &&
      r.forEach((item, index) => {
        l.has(index) ||
          r.getAll(index).forEach((item) => {
            l.append(index, item);
          });
      }),
    l
  );
}
var fs = null;
function lE() {
  if (fs === null)
    try {
      new FormData(document.createElement("form"), 0);
      fs = !1;
    } catch {
      fs = !0;
    }
  return fs;
}
var iE = new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
]);
function Sf(n) {
  return n != null && !iE.has(n)
    ? (it(
        !1,
        `"${n}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Es}"`,
      ),
      null)
    : n;
}
function oE(n, r) {
  let l, o, s, c, f;
  if (eE(n)) {
    let m = n.getAttribute("action");
    o = m ? dn(m, r) : null;
    l = n.getAttribute("method") || Ss;
    s = Sf(n.getAttribute("enctype")) || Es;
    c = new FormData(n);
  } else if (W2(n) || (tE(n) && (n.type === "submit" || n.type === "image"))) {
    let m = n.form;
    if (m == null)
      throw new Error(
        'Cannot submit a <button> or <input type="submit"> without a <form>',
      );
    let g = n.getAttribute("formaction") || m.getAttribute("action");
    if (
      ((o = g ? dn(g, r) : null),
      (l = n.getAttribute("formmethod") || m.getAttribute("method") || Ss),
      (s =
        Sf(n.getAttribute("formenctype")) ||
        Sf(m.getAttribute("enctype")) ||
        Es),
      (c = new FormData(m, n)),
      !lE())
    ) {
      let { name: h, type: y, value: v } = n;
      if (y === "image") {
        let S = h ? `${h}.` : "";
        c.append(`${S}x`, "0");
        c.append(`${S}y`, "0");
      } else if (h) {
        c.append(h, v);
      }
    }
  } else {
    if (Bs(n))
      throw new Error(
        'Cannot submit element that is not <form>, <button>, or <input type="submit|image">',
      );
    l = Ss;
    o = null;
    s = Es;
    f = n;
  }
  return (
    c && s === "text/plain" && ((f = c), (c = void 0)),
    {
      action: o,
      method: l.toLowerCase(),
      encType: s,
      formData: c,
      body: f,
    }
  );
}
Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function yd(n, r) {
  if (n === !1 || n === null || typeof n > "u") throw new Error(r);
}
function sE(n, r, l) {
  let o =
    typeof n == "string"
      ? new URL(
          n,
          typeof window > "u"
            ? "server://singlefetch/"
            : window.location.origin,
        )
      : n;
  return (
    o.pathname === "/"
      ? (o.pathname = `_root.${l}`)
      : r && dn(o.pathname, r) === "/"
        ? (o.pathname = `${r.replace(/\/$/, "")}/_root.${l}`)
        : (o.pathname = `${o.pathname.replace(/\/$/, "")}.${l}`),
    o
  );
}
async function uE(n, r) {
  if (n.id in r) return r[n.id];
  try {
    let l = await /* Dynamic import */ import(n.module);
    return ((r[n.id] = l), l);
  } catch (l) {
    return (
      console.error(
        `Error loading route module \`${n.module}\`, reloading page...`,
      ),
      console.error(l),
      window.__reactRouterContext && window.__reactRouterContext.isSpaMode,
      window.location.reload(),
      new Promise(() => {})
    );
  }
}
function cE(n) {
  if (n == null) {
    return !1;
  }
  if (n.href == null) {
    return (
      n.rel === "preload" &&
      typeof n.imageSrcSet == "string" &&
      typeof n.imageSizes == "string"
    );
  }
  return typeof n.rel == "string" && typeof n.href == "string";
}
async function fE(n, r, l) {
  let o = await Promise.all(
    n.map(async (item) => {
      let c = r.routes[item.route.id];
      if (c) {
        let f = await uE(c, l);
        return f.links ? f.links() : [];
      }
      return [];
    }),
  );
  return gE(
    o
      .flat(1)
      .filter(cE)
      .filter((item) => item.rel === "stylesheet" || item.rel === "preload")
      .map((item) =>
        item.rel === "stylesheet"
          ? {
              ...item,
              rel: "prefetch",
              as: "style",
            }
          : {
              ...item,
              rel: "prefetch",
            },
      ),
  );
}
function Ig(n, r, l, o, s, c) {
  let f = (g, h) => {
      return l[h] ? g.route.id !== l[h].route.id : !0;
    },
    m = (g, h) => {
      return (
        l[h].pathname !== g.pathname ||
        (l[h].route.path?.endsWith("*") && l[h].params["*"] !== g.params["*"])
      );
    };
  if (c === "assets") {
    return r.filter((item, index) => f(item, index) || m(item, index));
  }
  if (c === "data") {
    return r.filter((item, index) => {
      let y = o.routes[item.route.id];
      if (!y || !y.hasLoader) return !1;
      if (f(item, index) || m(item, index)) return !0;
      if (item.route.shouldRevalidate) {
        let v = item.route.shouldRevalidate({
          currentUrl: new URL(s.pathname + s.search + s.hash, window.origin),
          currentParams: l[0]?.params || {},
          nextUrl: new URL(n, window.origin),
          nextParams: item.params,
          defaultShouldRevalidate: !0,
        });
        if (typeof v == "boolean") return v;
      }
      return !0;
    });
  }
  return [];
}
function dE(n, r, { includeHydrateFallback: l } = {}) {
  return hE(
    n
      .map((item) => {
        let s = r.routes[item.route.id];
        if (!s) return [];
        let c = [s.module];
        return (
          s.clientActionModule && (c = c.concat(s.clientActionModule)),
          s.clientLoaderModule && (c = c.concat(s.clientLoaderModule)),
          l &&
            s.hydrateFallbackModule &&
            (c = c.concat(s.hydrateFallbackModule)),
          s.imports && (c = c.concat(s.imports)),
          c
        );
      })
      .flat(1),
  );
}
function hE(n) {
  return [...new Set(n)];
}
function mE(n) {
  let r = {},
    l = Object.keys(n).sort();
  for (let o of l) r[o] = n[o];
  return r;
}
function gE(n, r) {
  let l = new Set();
  return (
    new Set(r),
    n.reduce((item, acc) => {
      let c = JSON.stringify(mE(acc));
      return (
        l.has(c) ||
          (l.add(c),
          item.push({
            key: c,
            link: acc,
          })),
        item
      );
    }, [])
  );
}
function Qy() {
  let n = E.useContext(Er);
  return (
    yd(
      n,
      "You must render this element inside a <DataRouterContext.Provider> element",
    ),
    n
  );
}
function pE() {
  let n = E.useContext(pl);
  return (
    yd(
      n,
      "You must render this element inside a <DataRouterStateContext.Provider> element",
    ),
    n
  );
}
var $s = E.createContext(void 0);
$s.displayName = "FrameworkContext";
function Ky() {
  let n = E.useContext($s);
  return (
    yd(n, "You must render this element inside a <HydratedRouter> element"),
    n
  );
}
function yE(n, r) {
  let l = E.useContext($s),
    [o, s] = E.useState(!1),
    [c, f] = E.useState(!1),
    {
      onFocus: m,
      onBlur: g,
      onMouseEnter: h,
      onMouseLeave: y,
      onTouchStart: v,
    } = r,
    S = E.useRef(null);
  E.useEffect(() => {
    if ((n === "render" && f(!0), n === "viewport")) {
      let _ = (z) => {
          z.forEach((item) => {
            f(item.isIntersecting);
          });
        },
        A = new IntersectionObserver(_, {
          threshold: 0.5,
        });
      return (
        S.current && A.observe(S.current),
        () => {
          A.disconnect();
        }
      );
    }
  }, [n]);
  E.useEffect(() => {
    if (o) {
      let _ = setTimeout(() => {
        f(!0);
      }, 100);
      return () => {
        clearTimeout(_);
      };
    }
  }, [o]);
  let w = () => {
      s(!0);
    },
    x = () => {
      s(!1);
      f(!1);
    };
  return l
    ? n !== "intent"
      ? [c, S, {}]
      : [
          c,
          S,
          {
            onFocus: xi(m, w),
            onBlur: xi(g, x),
            onMouseEnter: xi(h, w),
            onMouseLeave: xi(y, x),
            onTouchStart: xi(v, w),
          },
        ]
    : [!1, S, {}];
}
function xi(n, r) {
  return (l) => {
    if (n) {
      n(l);
    }
    l.defaultPrevented || r(l);
  };
}
function vE({ page: n, ...r }) {
  let { router: l } = Qy(),
    o = E.useMemo(() => qa(l.routes, n, l.basename), [l.routes, n, l.basename]);
  return o
    ? E.createElement(SE, {
        page: n,
        matches: o,
        ...r,
      })
    : null;
}
function bE(n) {
  let { manifest: r, routeModules: l } = Ky(),
    [o, s] = E.useState([]);
  return (
    E.useEffect(() => {
      let c = !1;
      return (
        fE(n, r, l).then((response) => {
          c || s(response);
        }),
        () => {
          c = !0;
        }
      );
    }, [n, r, l]),
    o
  );
}
function SE({ page: n, matches: r, ...l }) {
  let o = tn(),
    { manifest: s, routeModules: c } = Ky(),
    { basename: f } = Qy(),
    { loaderData: m, matches: g } = pE(),
    h = E.useMemo(() => Ig(n, r, g, s, o, "data"), [n, r, g, s, o]),
    y = E.useMemo(() => Ig(n, r, g, s, o, "assets"), [n, r, g, s, o]),
    v = E.useMemo(() => {
      if (n === o.pathname + o.search + o.hash) return [];
      let x = new Set(),
        _ = !1;
      if (
        (r.forEach((item) => {
          let M = s.routes[item.route.id];
          !M ||
            !M.hasLoader ||
            ((!h.some((item) => item.route.id === item.route.id) &&
              item.route.id in m &&
              c[item.route.id]?.shouldRevalidate) ||
            M.hasClientLoader
              ? (_ = !0)
              : x.add(item.route.id));
        }),
        x.size === 0)
      )
        return [];
      let A = sE(n, f, "data");
      return (
        _ &&
          x.size > 0 &&
          A.searchParams.set(
            "_routes",
            r
              .filter((item) => x.has(item.route.id))
              .map((item) => item.route.id)
              .join(","),
          ),
        [A.pathname + A.search]
      );
    }, [f, m, o, s, h, r, n, c]),
    S = E.useMemo(() => dE(y, s), [y, s]),
    w = bE(y);
  return E.createElement(
    E.Fragment,
    null,
    v.map((item) =>
      E.createElement("link", {
        key: item,
        rel: "prefetch",
        as: "fetch",
        href: item,
        ...l,
      }),
    ),
    S.map((item) =>
      E.createElement("link", {
        key: item,
        rel: "modulepreload",
        href: item,
        ...l,
      }),
    ),
    w.map(({ key: x, link: _ }) =>
      E.createElement("link", {
        key: x,
        nonce: l.nonce,
        ..._,
      }),
    ),
  );
}
function EE(...n) {
  return (r) => {
    n.forEach((item) => {
      typeof item == "function" ? item(r) : item != null && (item.current = r);
    });
  };
}
var xE =
  typeof window < "u" &&
  typeof window.document < "u" &&
  typeof window.document.createElement < "u";
try {
  if (xE) {
    window.__reactRouterVersion = "7.11.0";
  }
} catch {}
function wE(n, r) {
  return WS({
    basename: r?.basename,
    getContext: r?.getContext,
    future: r?.future,
    history: pS({
      window: r?.window,
    }),
    hydrationData: RE(),
    routes: n,
    mapRouteProperties: X2,
    hydrationRouteProperties: P2,
    dataStrategy: r?.dataStrategy,
    patchRoutesOnNavigation: r?.patchRoutesOnNavigation,
    window: r?.window,
    unstable_instrumentations: r?.unstable_instrumentations,
  }).initialize();
}
function RE() {
  let n = window?.__staticRouterHydrationData;
  return (
    n &&
      n.errors &&
      (n = {
        ...n,
        errors: _E(n.errors),
      }),
    n
  );
}
function _E(n) {
  if (!n) return null;
  let r = Object.entries(n),
    l = {};
  for (let [o, s] of r)
    if (s && s.__type === "RouteErrorResponse")
      l[o] = new Ui(s.status, s.statusText, s.data, s.internal === !0);
    else if (s && s.__type === "Error") {
      if (s.__subType) {
        let c = window[s.__subType];
        if (typeof c == "function")
          try {
            let f = new c(s.message);
            f.stack = "";
            l[o] = f;
          } catch {}
      }
      if (l[o] == null) {
        let c = new Error(s.message);
        c.stack = "";
        l[o] = c;
      }
    } else l[o] = s;
  return l;
}
var Zy = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  Jy = E.forwardRef(function (
    {
      onClick: r,
      discover: l = "render",
      prefetch: o = "none",
      relative: s,
      reloadDocument: c,
      replace: f,
      state: m,
      target: g,
      to: h,
      preventScrollReset: y,
      viewTransition: v,
      unstable_defaultShouldRevalidate: S,
      ...w
    },
    x,
  ) {
    let { basename: _, unstable_useTransitions: A } = E.useContext(Yt),
      z = typeof h == "string" && Zy.test(h),
      M = _y(h, _);
    h = M.to;
    let F = D2(h, {
        relative: s,
      }),
      [te, U, W] = yE(o, w),
      D = AE(h, {
        replace: f,
        state: m,
        target: g,
        preventScrollReset: y,
        relative: s,
        viewTransition: v,
        unstable_defaultShouldRevalidate: S,
        unstable_useTransitions: A,
      });
    function le(ue) {
      if (r) {
        r(ue);
      }
      ue.defaultPrevented || D(ue);
    }
    let ie = E.createElement("a", {
      ...w,
      ...W,
      href: M.absoluteURL || F,
      onClick: M.isExternal || c ? r : le,
      ref: EE(x, U),
      target: g,
      "data-discover": !z && l === "render" ? "true" : void 0,
    });
    return te && !z
      ? E.createElement(
          E.Fragment,
          null,
          ie,
          E.createElement(vE, {
            page: F,
          }),
        )
      : ie;
  });
Jy.displayName = "Link";
var TE = E.forwardRef(function (
  {
    "aria-current": r = "page",
    caseSensitive: l = !1,
    className: o = "",
    end: s = !1,
    style: c,
    to: f,
    viewTransition: m,
    children: g,
    ...h
  },
  y,
) {
  let v = Bi(f, {
      relative: h.relative,
    }),
    S = tn(),
    w = E.useContext(pl),
    { navigator: x, basename: _ } = E.useContext(Yt),
    A = w != null && jE(v) && m === !0,
    z = x.encodeLocation ? x.encodeLocation(v).pathname : v.pathname,
    M = S.pathname,
    F =
      w && w.navigation && w.navigation.location
        ? w.navigation.location.pathname
        : null;
  l ||
    ((M = M.toLowerCase()),
    (F = F ? F.toLowerCase() : null),
    (z = z.toLowerCase()));
  if (F && _) {
    F = dn(F, _) || F;
  }
  const te = z !== "/" && z.endsWith("/") ? z.length - 1 : z.length;
  let U = M === z || (!s && M.startsWith(z) && M.charAt(te) === "/"),
    W =
      F != null &&
      (F === z || (!s && F.startsWith(z) && F.charAt(z.length) === "/")),
    D = {
      isActive: U,
      isPending: W,
      isTransitioning: A,
    },
    le = U ? r : void 0,
    ie;
  typeof o == "function"
    ? (ie = o(D))
    : (ie = [
        o,
        U ? "active" : null,
        W ? "pending" : null,
        A ? "transitioning" : null,
      ]
        .filter(Boolean)
        .join(" "));
  let ue = typeof c == "function" ? c(D) : c;
  return E.createElement(
    Jy,
    {
      ...h,
      "aria-current": le,
      className: ie,
      ref: y,
      style: ue,
      to: f,
      viewTransition: m,
    },
    typeof g == "function" ? g(D) : g,
  );
});
TE.displayName = "NavLink";
var OE = E.forwardRef(
  (
    {
      discover: n = "render",
      fetcherKey: r,
      navigate: l,
      reloadDocument: o,
      replace: s,
      state: c,
      method: f = Ss,
      action: m,
      onSubmit: g,
      relative: h,
      preventScrollReset: y,
      viewTransition: v,
      unstable_defaultShouldRevalidate: S,
      ...w
    },
    x,
  ) => {
    let { unstable_useTransitions: _ } = E.useContext(Yt),
      A = NE(),
      z = ME(m, {
        relative: h,
      }),
      M = f.toLowerCase() === "get" ? "get" : "post",
      F = typeof m == "string" && Zy.test(m),
      te = (event) => {
        if ((g && g(event), event.defaultPrevented)) return;
        event.preventDefault();
        let W = event.nativeEvent.submitter,
          D = W?.getAttribute("formmethod") || f,
          le = () =>
            A(W || event.currentTarget, {
              fetcherKey: r,
              method: D,
              navigate: l,
              replace: s,
              state: c,
              relative: h,
              preventScrollReset: y,
              viewTransition: v,
              unstable_defaultShouldRevalidate: S,
            });
        _ && l !== !1 ? E.startTransition(() => le()) : le();
      };
    return E.createElement("form", {
      ref: x,
      method: M,
      action: z,
      onSubmit: o ? g : te,
      ...w,
      "data-discover": !F && n === "render" ? "true" : void 0,
    });
  },
);
OE.displayName = "Form";
function Iy({ getKey: n, storageKey: r, ...l }) {
  let o = E.useContext($s),
    { basename: s } = E.useContext(Yt),
    c = tn(),
    f = Gy();
  zE({
    getKey: n,
    storageKey: r,
  });
  let m = E.useMemo(() => {
    if (!o || !n) return null;
    let h = If(c, f, s, n);
    return h !== c.key ? h : null;
  }, []);
  if (!o || o.isSpaMode) return null;
  let g = ((h, y) => {
    if (!window.history.state || !window.history.state.key) {
      let v = Math.random().toString(32).slice(2);
      window.history.replaceState(
        {
          key: v,
        },
        "",
      );
    }
    try {
      let S = JSON.parse(sessionStorage.getItem(h) || "{}")[
        y || window.history.state.key
      ];
      if (typeof S == "number") {
        window.scrollTo(0, S);
      }
    } catch (v) {
      console.error(v);
      sessionStorage.removeItem(h);
    }
  }).toString();
  return E.createElement("script", {
    ...l,
    suppressHydrationWarning: !0,
    dangerouslySetInnerHTML: {
      __html: `(${g})(${JSON.stringify(r || Jf)}, ${JSON.stringify(m)})`,
    },
  });
}
Iy.displayName = "ScrollRestoration";
function Wy(n) {
  return `${n} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function vd(n) {
  let r = E.useContext(Er);
  return (Me(r, Wy(n)), r);
}
function CE(n) {
  let r = E.useContext(pl);
  return (Me(r, Wy(n)), r);
}
function AE(
  n,
  {
    target: r,
    replace: l,
    state: o,
    preventScrollReset: s,
    relative: c,
    viewTransition: f,
    unstable_defaultShouldRevalidate: m,
    unstable_useTransitions: g,
  } = {},
) {
  let h = md(),
    y = tn(),
    v = Bi(n, {
      relative: c,
    });
  return E.useCallback(
    (event) => {
      if (aE(event, r)) {
        event.preventDefault();
        let w = l !== void 0 ? l : Gn(y) === Gn(v),
          x = () =>
            h(n, {
              replace: w,
              state: o,
              preventScrollReset: s,
              relative: c,
              viewTransition: f,
              unstable_defaultShouldRevalidate: m,
            });
        g ? E.startTransition(() => x()) : x();
      }
    },
    [y, h, v, l, o, r, n, s, c, f, m, g],
  );
}
function vT(n) {
  it(
    typeof URLSearchParams < "u",
    "You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.",
  );
  let r = E.useRef(Zf(n)),
    l = E.useRef(!1),
    o = tn(),
    s = E.useMemo(() => rE(o.search, l.current ? null : r.current), [o.search]),
    c = md(),
    f = E.useCallback(
      (m, g) => {
        const h = Zf(typeof m == "function" ? m(new URLSearchParams(s)) : m);
        l.current = !0;
        c("?" + h, g);
      },
      [c, s],
    );
  return [s, f];
}
var DE = 0,
  LE = () => `__${String(++DE)}__`;
function NE() {
  let { router: n } = vd("useSubmit"),
    { basename: r } = E.useContext(Yt),
    l = q2(),
    o = n.fetch,
    s = n.navigate;
  return E.useCallback(
    async (c, f = {}) => {
      let { action: m, method: g, encType: h, formData: y, body: v } = oE(c, r);
      if (f.navigate === !1) {
        let S = f.fetcherKey || LE();
        await o(S, l, f.action || m, {
          unstable_defaultShouldRevalidate: f.unstable_defaultShouldRevalidate,
          preventScrollReset: f.preventScrollReset,
          formData: y,
          body: v,
          formMethod: f.method || g,
          formEncType: f.encType || h,
          flushSync: f.flushSync,
        });
      } else
        await s(f.action || m, {
          unstable_defaultShouldRevalidate: f.unstable_defaultShouldRevalidate,
          preventScrollReset: f.preventScrollReset,
          formData: y,
          body: v,
          formMethod: f.method || g,
          formEncType: f.encType || h,
          replace: f.replace,
          state: f.state,
          fromRouteId: l,
          flushSync: f.flushSync,
          viewTransition: f.viewTransition,
        });
    },
    [o, s, r, l],
  );
}
function ME(n, { relative: r } = {}) {
  let { basename: l } = E.useContext(Yt),
    o = E.useContext(_n);
  Me(o, "useFormAction must be used inside a RouteContext");
  let [s] = o.matches.slice(-1),
    c = {
      ...Bi(n || ".", {
        relative: r,
      }),
    },
    f = tn();
  if (n == null) {
    c.search = f.search;
    let m = new URLSearchParams(c.search),
      g = m.getAll("index");
    if (g.some((item) => item === "")) {
      m.delete("index");
      g.filter((item) => item).forEach((item) => m.append("index", item));
      let y = m.toString();
      c.search = y ? `?${y}` : "";
    }
  }
  return (
    (!n || n === ".") &&
      s.route.index &&
      (c.search = c.search ? c.search.replace(/^\?/, "?index&") : "?index"),
    l !== "/" && (c.pathname = c.pathname === "/" ? l : Yn([l, c.pathname])),
    Gn(c)
  );
}
var Jf = "react-router-scroll-positions",
  ds = {};
function If(n, r, l, o) {
  let s = null;
  return (
    o &&
      (l !== "/"
        ? (s = o(
            {
              ...n,
              pathname: dn(n.pathname, l) || n.pathname,
            },
            r,
          ))
        : (s = o(n, r))),
    s == null && (s = n.key),
    s
  );
}
function zE({ getKey: n, storageKey: r } = {}) {
  let { router: l } = vd("useScrollRestoration"),
    { restoreScrollPosition: o, preventScrollReset: s } = CE(
      "useScrollRestoration",
    ),
    { basename: c } = E.useContext(Yt),
    f = tn(),
    m = Gy(),
    g = Yy();
  E.useEffect(
    () => (
      (window.history.scrollRestoration = "manual"),
      () => {
        window.history.scrollRestoration = "auto";
      }
    ),
    [],
  );
  kE(
    E.useCallback(() => {
      if (g.state === "idle") {
        let h = If(f, m, c, n);
        ds[h] = window.scrollY;
      }
      try {
        sessionStorage.setItem(r || Jf, JSON.stringify(ds));
      } catch (h) {
        it(
          !1,
          `Failed to save scroll positions in sessionStorage, <ScrollRestoration /> will not work properly (${h}).`,
        );
      }
      window.history.scrollRestoration = "auto";
    }, [g.state, n, c, f, m, r]),
  );
  if (typeof document < "u") {
    (E.useLayoutEffect(() => {
      try {
        let h = sessionStorage.getItem(r || Jf);
        if (h) {
          ds = JSON.parse(h);
        }
      } catch {}
    }, [r]),
      E.useLayoutEffect(() => {
        let h = l?.enableScrollRestoration(
          ds,
          () => window.scrollY,
          n ? (y, v) => If(y, v, c, n) : void 0,
        );
        return () => h && h();
      }, [l, c, n]),
      E.useLayoutEffect(() => {
        if (o !== !1) {
          if (typeof o == "number") {
            window.scrollTo(0, o);
            return;
          }
          try {
            if (f.hash) {
              let h = document.getElementById(
                decodeURIComponent(f.hash.slice(1)),
              );
              if (h) {
                h.scrollIntoView();
                return;
              }
            }
          } catch {
            it(
              !1,
              `"${f.hash.slice(1)}" is not a decodable element ID. The view will not scroll to it.`,
            );
          }
          if (s !== !0) {
            window.scrollTo(0, 0);
          }
        }
      }, [f, o, s]));
  }
}
function kE(n, r) {
  let { capture: l } = {};
  E.useEffect(() => {
    let o =
      l != null
        ? {
            capture: l,
          }
        : void 0;
    return (
      window.addEventListener("pagehide", n, o),
      () => {
        window.removeEventListener("pagehide", n, o);
      }
    );
  }, [n, l]);
}
function jE(n, { relative: r } = {}) {
  let l = E.useContext(dd);
  Me(
    l != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?",
  );
  let { basename: o } = vd("useViewTransitionState"),
    s = Bi(n, {
      relative: r,
    });
  if (!l.isTransitioning) return !1;
  let c = dn(l.currentLocation.pathname, o) || l.currentLocation.pathname,
    f = dn(l.nextLocation.pathname, o) || l.nextLocation.pathname;
  return Cs(s.pathname, f) != null || Cs(s.pathname, c) != null;
}
class Ai extends Error {}
Ai.prototype.name = "InvalidTokenError";
function UE(n) {
  return decodeURIComponent(
    atob(n).replace(/(.)/g, (r, l) => {
      let o = l.charCodeAt(0).toString(16).toUpperCase();
      return (o.length < 2 && (o = "0" + o), "%" + o);
    }),
  );
}
function HE(n) {
  let r = n.replace(/-/g, "+").replace(/_/g, "/");
  switch (r.length % 4) {
    case 0:
      break;
    case 2:
      r += "==";
      break;
    case 3:
      r += "=";
      break;
    default:
      throw new Error("base64 string is not of the correct length");
  }
  try {
    return UE(r);
  } catch {
    return atob(r);
  }
}
function ev(n, r) {
  if (typeof n != "string")
    throw new Ai("Invalid token specified: must be a string");
  r || (r = {});
  const l = r.header === !0 ? 0 : 1,
    o = n.split(".")[l];
  if (typeof o != "string")
    throw new Ai(`Invalid token specified: missing part #${l + 1}`);
  let s;
  try {
    s = HE(o);
  } catch (c) {
    throw new Ai(
      `Invalid token specified: invalid base64 for part #${l + 1} (${c.message})`,
    );
  }
  try {
    return JSON.parse(s);
  } catch (c) {
    throw new Ai(
      `Invalid token specified: invalid json for part #${l + 1} (${c.message})`,
    );
  }
}
/* ---- Axios HTTP Client ---- */
function tv(n, r) {
  return function () {
    return n.apply(r, arguments);
  };
}
const { toString: BE } = Object.prototype,
  { getPrototypeOf: bd } = Object,
  { iterator: qs, toStringTag: nv } = Symbol,
  Vs = ((n) => (r) => {
    const l = BE.call(r);
    return n[l] || (n[l] = l.slice(8, -1).toLowerCase());
  })(Object.create(null)),
  kn = (n) => {
    return ((n = n.toLowerCase()), (r) => Vs(r) === n);
  },
  Ys = (n) => (r) => typeof r === n,
  { isArray: bl } = Array,
  ml = Ys("undefined");
function $i(n) {
  return (
    n !== null &&
    !ml(n) &&
    n.constructor !== null &&
    !ml(n.constructor) &&
    Wt(n.constructor.isBuffer) &&
    n.constructor.isBuffer(n)
  );
}
const av = kn("ArrayBuffer");
function $E(n) {
  let r;
  return (
    typeof ArrayBuffer < "u" && ArrayBuffer.isView
      ? (r = ArrayBuffer.isView(n))
      : (r = n && n.buffer && av(n.buffer)),
    r
  );
}
const qE = Ys("string"),
  Wt = Ys("function"),
  rv = Ys("number"),
  qi = (n) => {
    return n !== null && typeof n == "object";
  },
  VE = (n) => {
    return n === !0 || n === !1;
  },
  xs = (n) => {
    if (Vs(n) !== "object") return !1;
    const r = bd(n);
    return (
      (r === null ||
        r === Object.prototype ||
        Object.getPrototypeOf(r) === null) &&
      !(nv in n) &&
      !(qs in n)
    );
  },
  YE = (n) => {
    if (!qi(n) || $i(n)) return !1;
    try {
      return (
        Object.keys(n).length === 0 &&
        Object.getPrototypeOf(n) === Object.prototype
      );
    } catch {
      return !1;
    }
  },
  GE = kn("Date"),
  FE = kn("File"),
  XE = kn("Blob"),
  PE = kn("FileList"),
  QE = (n) => {
    return qi(n) && Wt(n.pipe);
  },
  KE = (n) => {
    let r;
    return (
      n &&
      ((typeof FormData == "function" && n instanceof FormData) ||
        (Wt(n.append) &&
          ((r = Vs(n)) === "formdata" ||
            (r === "object" &&
              Wt(n.toString) &&
              n.toString() === "[object FormData]"))))
    );
  },
  ZE = kn("URLSearchParams"),
  [JE, IE, WE, ex] = ["ReadableStream", "Request", "Response", "Headers"].map(
    kn,
  ),
  tx = (n) => {
    return n.trim
      ? n.trim()
      : n.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
  };
function Vi(n, r, { allOwnKeys: l = !1 } = {}) {
  if (n === null || typeof n > "u") return;
  let o, s;
  if ((typeof n != "object" && (n = [n]), bl(n)))
    for (o = 0, s = n.length; o < s; o++) r.call(null, n[o], o, n);
  else {
    if ($i(n)) return;
    const c = l ? Object.getOwnPropertyNames(n) : Object.keys(n),
      f = c.length;
    let m;
    for (o = 0; o < f; o++) {
      m = c[o];
      r.call(null, n[m], m, n);
    }
  }
}
function lv(n, r) {
  if ($i(n)) return null;
  r = r.toLowerCase();
  const l = Object.keys(n);
  let o = l.length,
    s;
  for (; o-- > 0; ) if (((s = l[o]), r === s.toLowerCase())) return s;
  return null;
}
const vr =
    typeof globalThis < "u"
      ? globalThis
      : typeof self < "u"
        ? self
        : typeof window < "u"
          ? window
          : global,
  iv = (n) => {
    return !ml(n) && n !== vr;
  };
function Wf() {
  const { caseless: n, skipUndefined: r } = (iv(this) && this) || {},
    l = {},
    o = (s, c) => {
      const f = (n && lv(l, c)) || c;
      xs(l[f]) && xs(s)
        ? (l[f] = Wf(l[f], s))
        : xs(s)
          ? (l[f] = Wf({}, s))
          : bl(s)
            ? (l[f] = s.slice())
            : (!r || !ml(s)) && (l[f] = s);
    };
  for (let s = 0, c = arguments.length; s < c; s++)
    if (arguments[s]) {
      Vi(arguments[s], o);
    }
  return l;
}
const nx = (n, r, l, { allOwnKeys: o } = {}) => {
    return (
      Vi(
        r,
        (s, c) => {
          l && Wt(s) ? (n[c] = tv(s, l)) : (n[c] = s);
        },
        {
          allOwnKeys: o,
        },
      ),
      n
    );
  },
  ax = (n) => {
    return (n.charCodeAt(0) === 65279 && (n = n.slice(1)), n);
  },
  rx = (n, r, l, o) => {
    n.prototype = Object.create(r.prototype, o);
    n.prototype.constructor = n;
    Object.defineProperty(n, "super", {
      value: r.prototype,
    });
    if (l) {
      Object.assign(n.prototype, l);
    }
  },
  lx = (n, r, l, o) => {
    let s, c, f;
    const m = {};
    if (((r = r || {}), n == null)) return r;
    do {
      for (s = Object.getOwnPropertyNames(n), c = s.length; c-- > 0; ) {
        f = s[c];
        if ((!o || o(f, n, r)) && !m[f]) {
          ((r[f] = n[f]), (m[f] = !0));
        }
      }
      n = l !== !1 && bd(n);
    } while (n && (!l || l(n, r)) && n !== Object.prototype);
    return r;
  },
  ix = (n, r, l) => {
    n = String(n);
    if (l === void 0 || l > n.length) {
      l = n.length;
    }
    l -= r.length;
    const o = n.indexOf(r, l);
    return o !== -1 && o === l;
  },
  ox = (n) => {
    if (!n) return null;
    if (bl(n)) return n;
    let r = n.length;
    if (!rv(r)) return null;
    const l = new Array(r);
    for (; r-- > 0; ) l[r] = n[r];
    return l;
  },
  sx = (
    (n) => (r) =>
      n && r instanceof n
  )(typeof Uint8Array < "u" && bd(Uint8Array)),
  ux = (n, r) => {
    const o = (n && n[qs]).call(n);
    let s;
    for (; (s = o.next()) && !s.done; ) {
      const c = s.value;
      r.call(n, c[0], c[1]);
    }
  },
  cx = (n, r) => {
    let l;
    const o = [];
    for (; (l = n.exec(r)) !== null; ) o.push(l);
    return o;
  },
  fx = kn("HTMLFormElement"),
  dx = (n) =>
    n.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function (l, o, s) {
      return o.toUpperCase() + s;
    }),
  Wg = (
    ({ hasOwnProperty: n }) =>
    (r, l) =>
      n.call(r, l)
  )(Object.prototype),
  hx = kn("RegExp"),
  ov = (n, r) => {
    const l = Object.getOwnPropertyDescriptors(n),
      o = {};
    Vi(l, (s, c) => {
      let f;
      if ((f = r(s, c, n)) !== !1) {
        o[c] = f || s;
      }
    });
    Object.defineProperties(n, o);
  },
  mx = (n) => {
    ov(n, (r, l) => {
      if (Wt(n) && ["arguments", "caller", "callee"].indexOf(l) !== -1)
        return !1;
      const o = n[l];
      if (Wt(o)) {
        if (((r.enumerable = !1), "writable" in r)) {
          r.writable = !1;
          return;
        }
        r.set ||
          (r.set = () => {
            throw Error("Can not rewrite read-only method '" + l + "'");
          });
      }
    });
  },
  gx = (n, r) => {
    const l = {},
      o = (s) => {
        s.forEach((item) => {
          l[item] = !0;
        });
      };
    return (bl(n) ? o(n) : o(String(n).split(r)), l);
  },
  px = () => {},
  yx = (n, r) => {
    return n != null && Number.isFinite((n = +n)) ? n : r;
  };
function vx(n) {
  return !!(n && Wt(n.append) && n[nv] === "FormData" && n[qs]);
}
const bx = (n) => {
    const r = new Array(10),
      l = (o, s) => {
        if (qi(o)) {
          if (r.indexOf(o) >= 0) return;
          if ($i(o)) return o;
          if (!("toJSON" in o)) {
            r[s] = o;
            const c = bl(o) ? [] : {};
            return (
              Vi(o, (f, m) => {
                const g = l(f, s + 1);
                if (!ml(g)) {
                  c[m] = g;
                }
              }),
              (r[s] = void 0),
              c
            );
          }
        }
        return o;
      };
    return l(n, 0);
  },
  Sx = kn("AsyncFunction"),
  Ex = (n) => {
    return n && (qi(n) || Wt(n)) && Wt(n.then) && Wt(n.catch);
  },
  sv = ((n, r) =>
    n
      ? setImmediate
      : r
        ? ((l, o) => (
            vr.addEventListener(
              "message",
              ({ source: s, data: c }) => {
                if (s === vr && c === l && o.length) {
                  o.shift()();
                }
              },
              !1,
            ),
            (s) => {
              o.push(s);
              vr.postMessage(l, "*");
            }
          ))(`axios@${Math.random()}`, [])
        : (l) => setTimeout(l))(
    typeof setImmediate == "function",
    Wt(vr.postMessage),
  ),
  xx =
    typeof queueMicrotask < "u"
      ? queueMicrotask.bind(vr)
      : (typeof process < "u" && process.nextTick) || sv,
  wx = (n) => {
    return n != null && Wt(n[qs]);
  },
  X = {
    isArray: bl,
    isArrayBuffer: av,
    isBuffer: $i,
    isFormData: KE,
    isArrayBufferView: $E,
    isString: qE,
    isNumber: rv,
    isBoolean: VE,
    isObject: qi,
    isPlainObject: xs,
    isEmptyObject: YE,
    isReadableStream: JE,
    isRequest: IE,
    isResponse: WE,
    isHeaders: ex,
    isUndefined: ml,
    isDate: GE,
    isFile: FE,
    isBlob: XE,
    isRegExp: hx,
    isFunction: Wt,
    isStream: QE,
    isURLSearchParams: ZE,
    isTypedArray: sx,
    isFileList: PE,
    forEach: Vi,
    merge: Wf,
    extend: nx,
    trim: tx,
    stripBOM: ax,
    inherits: rx,
    toFlatObject: lx,
    kindOf: Vs,
    kindOfTest: kn,
    endsWith: ix,
    toArray: ox,
    forEachEntry: ux,
    matchAll: cx,
    isHTMLForm: fx,
    hasOwnProperty: Wg,
    hasOwnProp: Wg,
    reduceDescriptors: ov,
    freezeMethods: mx,
    toObjectSet: gx,
    toCamelCase: dx,
    noop: px,
    toFiniteNumber: yx,
    findKey: lv,
    global: vr,
    isContextDefined: iv,
    isSpecCompliantForm: vx,
    toJSONObject: bx,
    isAsyncFn: Sx,
    isThenable: Ex,
    setImmediate: sv,
    asap: xx,
    isIterable: wx,
  };
function Le(n, r, l, o, s) {
  Error.call(this);
  Error.captureStackTrace
    ? Error.captureStackTrace(this, this.constructor)
    : (this.stack = new Error().stack);
  this.message = n;
  this.name = "AxiosError";
  if (r) {
    this.code = r;
  }
  if (l) {
    this.config = l;
  }
  if (o) {
    this.request = o;
  }
  if (s) {
    ((this.response = s), (this.status = s.status ? s.status : null));
  }
}
X.inherits(Le, Error, {
  toJSON: function () {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: X.toJSONObject(this.config),
      code: this.code,
      status: this.status,
    };
  },
});
const uv = Le.prototype,
  cv = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL",
].forEach((item) => {
  cv[item] = {
    value: item,
  };
});
Object.defineProperties(Le, cv);
Object.defineProperty(uv, "isAxiosError", {
  value: !0,
});
Le.from = (n, r, l, o, s, c) => {
  const f = Object.create(uv);
  X.toFlatObject(
    n,
    f,
    function (y) {
      return y !== Error.prototype;
    },
    (h) => h !== "isAxiosError",
  );
  const m = n && n.message ? n.message : "Error",
    g = r == null && n ? n.code : r;
  return (
    Le.call(f, m, g, l, o, s),
    n &&
      f.cause == null &&
      Object.defineProperty(f, "cause", {
        value: n,
        configurable: !0,
      }),
    (f.name = (n && n.name) || "Error"),
    c && Object.assign(f, c),
    f
  );
};
const Rx = null;
function ed(n) {
  return X.isPlainObject(n) || X.isArray(n);
}
function fv(n) {
  return X.endsWith(n, "[]") ? n.slice(0, -2) : n;
}
function ep(n, r, l) {
  return n
    ? n
        .concat(r)
        .map(function (item, index) {
          return ((item = fv(item)), !l && index ? "[" + item + "]" : item);
        })
        .join(l ? "." : "")
    : r;
}
function _x(n) {
  return X.isArray(n) && !n.some(ed);
}
const Tx = X.toFlatObject(X, {}, null, function (r) {
  return /^is[A-Z]/.test(r);
});
function Gs(n, r, l) {
  if (!X.isObject(n)) throw new TypeError("target must be an object");
  r = r || new FormData();
  l = X.toFlatObject(
    l,
    {
      metaTokens: !0,
      dots: !1,
      indexes: !1,
    },
    !1,
    function (_, A) {
      return !X.isUndefined(A[_]);
    },
  );
  const o = l.metaTokens,
    s = l.visitor || y,
    c = l.dots,
    f = l.indexes,
    g = (l.Blob || (typeof Blob < "u" && Blob)) && X.isSpecCompliantForm(r);
  if (!X.isFunction(s)) throw new TypeError("visitor must be a function");
  function h(x) {
    if (x === null) return "";
    if (X.isDate(x)) return x.toISOString();
    if (X.isBoolean(x)) return x.toString();
    if (!g && X.isBlob(x))
      throw new Le("Blob is not supported. Use a Buffer instead.");
    return X.isArrayBuffer(x) || X.isTypedArray(x)
      ? g && typeof Blob == "function"
        ? new Blob([x])
        : Buffer.from(x)
      : x;
  }
  function y(x, _, A) {
    let z = x;
    if (x && !A && typeof x == "object") {
      if (X.endsWith(_, "{}")) {
        _ = o ? _ : _.slice(0, -2);
        x = JSON.stringify(x);
      } else if (
        (X.isArray(x) && _x(x)) ||
        ((X.isFileList(x) || X.endsWith(_, "[]")) && (z = X.toArray(x)))
      )
        return (
          (_ = fv(_)),
          z.forEach(function (item, index) {
            if (!(X.isUndefined(item) || item === null)) {
              r.append(
                f === !0 ? ep([_], index, c) : f === null ? _ : _ + "[]",
                h(item),
              );
            }
          }),
          !1
        );
    }
    return ed(x) ? !0 : (r.append(ep(A, _, c), h(x)), !1);
  }
  const v = [],
    S = Object.assign(Tx, {
      defaultVisitor: y,
      convertValue: h,
      isVisitable: ed,
    });
  function w(x, _) {
    if (!X.isUndefined(x)) {
      if (v.indexOf(x) !== -1)
        throw Error("Circular reference detected in " + _.join("."));
      v.push(x);
      X.forEach(x, function (item, index) {
        if (
          (!(X.isUndefined(item) || item === null) &&
            s.call(r, item, X.isString(index) ? index.trim() : index, _, S)) ===
          !0
        ) {
          w(item, _ ? _.concat(index) : [index]);
        }
      });
      v.pop();
    }
  }
  if (!X.isObject(n)) throw new TypeError("data must be an object");
  return (w(n), r);
}
function tp(n) {
  const r = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0",
  };
  return encodeURIComponent(n).replace(/[!'()~]|%20|%00/g, function (o) {
    return r[o];
  });
}
function Sd(n, r) {
  this._pairs = [];
  if (n) {
    Gs(n, this, r);
  }
}
const dv = Sd.prototype;
dv.append = function (r, l) {
  this._pairs.push([r, l]);
};
dv.toString = function (r) {
  const l = r
    ? function (o) {
        return r.call(this, o, tp);
      }
    : tp;
  return this._pairs
    .map(function (item) {
      return l(item[0]) + "=" + l(item[1]);
    }, "")
    .join("&");
};
function Ox(n) {
  return encodeURIComponent(n)
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%20/g, "+");
}
function hv(n, r, l) {
  if (!r) return n;
  const o = (l && l.encode) || Ox;
  if (X.isFunction(l)) {
    l = {
      serialize: l,
    };
  }
  const s = l && l.serialize;
  let c;
  if (
    (s
      ? (c = s(r, l))
      : (c = X.isURLSearchParams(r) ? r.toString() : new Sd(r, l).toString(o)),
    c)
  ) {
    const f = n.indexOf("#");
    if (f !== -1) {
      n = n.slice(0, f);
    }
    n += (n.indexOf("?") === -1 ? "?" : "&") + c;
  }
  return n;
}
class np {
  constructor() {
    this.handlers = [];
  }
  use(r, l, o) {
    return (
      this.handlers.push({
        fulfilled: r,
        rejected: l,
        synchronous: o ? o.synchronous : !1,
        runWhen: o ? o.runWhen : null,
      }),
      this.handlers.length - 1
    );
  }
  eject(r) {
    if (this.handlers[r]) {
      this.handlers[r] = null;
    }
  }
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  forEach(r) {
    X.forEach(this.handlers, function (item) {
      if (item !== null) {
        r(item);
      }
    });
  }
}
const mv = {
    silentJSONParsing: !0,
    forcedJSONParsing: !0,
    clarifyTimeoutError: !1,
  },
  Cx = typeof URLSearchParams < "u" ? URLSearchParams : Sd,
  Ax = typeof FormData < "u" ? FormData : null,
  Dx = typeof Blob < "u" ? Blob : null,
  Lx = {
    isBrowser: !0,
    classes: {
      URLSearchParams: Cx,
      FormData: Ax,
      Blob: Dx,
    },
    protocols: ["http", "https", "file", "blob", "url", "data"],
  },
  Ed = typeof window < "u" && typeof document < "u",
  td = (typeof navigator == "object" && navigator) || void 0,
  Nx =
    Ed &&
    (!td || ["ReactNative", "NativeScript", "NS"].indexOf(td.product) < 0),
  Mx =
    typeof WorkerGlobalScope < "u" &&
    self instanceof WorkerGlobalScope &&
    typeof self.importScripts == "function",
  zx = (Ed && window.location.href) || "http://localhost",
  kx = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        hasBrowserEnv: Ed,
        hasStandardBrowserEnv: Nx,
        hasStandardBrowserWebWorkerEnv: Mx,
        navigator: td,
        origin: zx,
      },
      Symbol.toStringTag,
      {
        value: "Module",
      },
    ),
  ),
  $t = {
    ...kx,
    ...Lx,
  };
function jx(n, r) {
  return Gs(n, new $t.classes.URLSearchParams(), {
    visitor: function (l, o, s, c) {
      return $t.isNode && X.isBuffer(l)
        ? (this.append(o, l.toString("base64")), !1)
        : c.defaultVisitor.apply(this, arguments);
    },
    ...r,
  });
}
function Ux(n) {
  return X.matchAll(/\w+|\[(\w*)]/g, n).map((item) =>
    item[0] === "[]" ? "" : item[1] || item[0],
  );
}
function Hx(n) {
  const r = {},
    l = Object.keys(n);
  let o;
  const s = l.length;
  let c;
  for (o = 0; o < s; o++) {
    c = l[o];
    r[c] = n[c];
  }
  return r;
}
function gv(n) {
  function r(l, o, s, c) {
    let f = l[c++];
    if (f === "__proto__") return !0;
    const m = Number.isFinite(+f),
      g = c >= l.length;
    return (
      (f = !f && X.isArray(s) ? s.length : f),
      g
        ? (X.hasOwnProp(s, f) ? (s[f] = [s[f], o]) : (s[f] = o), !m)
        : ((!s[f] || !X.isObject(s[f])) && (s[f] = []),
          r(l, o, s[f], c) && X.isArray(s[f]) && (s[f] = Hx(s[f])),
          !m)
    );
  }
  if (X.isFormData(n) && X.isFunction(n.entries)) {
    const l = {};
    return (
      X.forEachEntry(n, (o, s) => {
        r(Ux(o), s, l, 0);
      }),
      l
    );
  }
  return null;
}
function Bx(n, r, l) {
  if (X.isString(n))
    try {
      return ((r || JSON.parse)(n), X.trim(n));
    } catch (o) {
      if (o.name !== "SyntaxError") throw o;
    }
  return (l || JSON.stringify)(n);
}
const Yi = {
  transitional: mv,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function (r, l) {
      const o = l.getContentType() || "",
        s = o.indexOf("application/json") > -1,
        c = X.isObject(r);
      if ((c && X.isHTMLForm(r) && (r = new FormData(r)), X.isFormData(r)))
        return s ? JSON.stringify(gv(r)) : r;
      if (
        X.isArrayBuffer(r) ||
        X.isBuffer(r) ||
        X.isStream(r) ||
        X.isFile(r) ||
        X.isBlob(r) ||
        X.isReadableStream(r)
      )
        return r;
      if (X.isArrayBufferView(r)) return r.buffer;
      if (X.isURLSearchParams(r))
        return (
          l.setContentType(
            "application/x-www-form-urlencoded;charset=utf-8",
            !1,
          ),
          r.toString()
        );
      let m;
      if (c) {
        if (o.indexOf("application/x-www-form-urlencoded") > -1)
          return jx(r, this.formSerializer).toString();
        if ((m = X.isFileList(r)) || o.indexOf("multipart/form-data") > -1) {
          const g = this.env && this.env.FormData;
          return Gs(
            m
              ? {
                  "files[]": r,
                }
              : r,
            g && new g(),
            this.formSerializer,
          );
        }
      }
      return c || s ? (l.setContentType("application/json", !1), Bx(r)) : r;
    },
  ],
  transformResponse: [
    function (r) {
      const l = this.transitional || Yi.transitional,
        o = l && l.forcedJSONParsing,
        s = this.responseType === "json";
      if (X.isResponse(r) || X.isReadableStream(r)) return r;
      if (r && X.isString(r) && ((o && !this.responseType) || s)) {
        const f = !(l && l.silentJSONParsing) && s;
        try {
          return JSON.parse(r, this.parseReviver);
        } catch (m) {
          if (f)
            throw m.name === "SyntaxError"
              ? Le.from(m, Le.ERR_BAD_RESPONSE, this, null, this.response)
              : m;
        }
      }
      return r;
    },
  ],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: $t.classes.FormData,
    Blob: $t.classes.Blob,
  },
  validateStatus: function (r) {
    return r >= 200 && r < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0,
    },
  },
};
X.forEach(["delete", "get", "head", "post", "put", "patch"], (item) => {
  Yi.headers[item] = {};
});
const $x = X.toObjectSet([
    "age",
    "authorization",
    "content-length",
    "content-type",
    "etag",
    "expires",
    "from",
    "host",
    "if-modified-since",
    "if-unmodified-since",
    "last-modified",
    "location",
    "max-forwards",
    "proxy-authorization",
    "referer",
    "retry-after",
    "user-agent",
  ]),
  qx = (n) => {
    const r = {};
    let l, o, s;
    return (
      n &&
        n
          .split(
            `
`,
          )
          .forEach(function (item) {
            s = item.indexOf(":");
            l = item.substring(0, s).trim().toLowerCase();
            o = item.substring(s + 1).trim();
            if (!(!l || (r[l] && $x[l]))) {
              l === "set-cookie"
                ? r[l]
                  ? r[l].push(o)
                  : (r[l] = [o])
                : (r[l] = r[l] ? r[l] + ", " + o : o);
            }
          }),
      r
    );
  },
  ap = Symbol("internals");
function wi(n) {
  return n && String(n).trim().toLowerCase();
}
function ws(n) {
  if (n === !1 || n == null) {
    return n;
  }
  if (X.isArray(n)) {
    return n.map(ws);
  }
  return String(n);
}
function Vx(n) {
  const r = Object.create(null),
    l = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let o;
  for (; (o = l.exec(n)); ) r[o[1]] = o[2];
  return r;
}
const Yx = (n) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(n.trim());
function Ef(n, r, l, o, s) {
  if (X.isFunction(o)) return o.call(this, r, l);
  if ((s && (r = l), !!X.isString(r))) {
    if (X.isString(o)) return r.indexOf(o) !== -1;
    if (X.isRegExp(o)) return o.test(r);
  }
}
function Gx(n) {
  return n
    .trim()
    .toLowerCase()
    .replace(/([a-z\d])(\w*)/g, (r, l, o) => l.toUpperCase() + o);
}
function Fx(n, r) {
  const l = X.toCamelCase(" " + r);
  ["get", "set", "has"].forEach((item) => {
    Object.defineProperty(n, item + l, {
      value: function (s, c, f) {
        return this[item].call(this, r, s, c, f);
      },
      configurable: !0,
    });
  });
}
let en = class {
  constructor(r) {
    if (r) {
      this.set(r);
    }
  }
  set(r, l, o) {
    const s = this;
    function c(m, g, h) {
      const y = wi(g);
      if (!y) throw new Error("header name must be a non-empty string");
      const v = X.findKey(s, y);
      if (!v || s[v] === void 0 || h === !0 || (h === void 0 && s[v] !== !1)) {
        s[v || g] = ws(m);
      }
    }
    const f = (m, g) => X.forEach(m, (item, index) => c(item, index, g));
    if (X.isPlainObject(r) || r instanceof this.constructor) f(r, l);
    else if (X.isString(r) && (r = r.trim()) && !Yx(r)) f(qx(r), l);
    else if (X.isObject(r) && X.isIterable(r)) {
      let m = {},
        g,
        h;
      for (const y of r) {
        if (!X.isArray(y))
          throw TypeError("Object iterator must return a key-value pair");
        m[(h = y[0])] = (g = m[h])
          ? X.isArray(g)
            ? [...g, y[1]]
            : [g, y[1]]
          : y[1];
      }
      f(m, l);
    } else if (r != null) {
      c(l, r, o);
    }
    return this;
  }
  get(r, l) {
    if (((r = wi(r)), r)) {
      const o = X.findKey(this, r);
      if (o) {
        const s = this[o];
        if (!l) return s;
        if (l === !0) return Vx(s);
        if (X.isFunction(l)) return l.call(this, s, o);
        if (X.isRegExp(l)) return l.exec(s);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(r, l) {
    if (((r = wi(r)), r)) {
      const o = X.findKey(this, r);
      return !!(o && this[o] !== void 0 && (!l || Ef(this, this[o], o, l)));
    }
    return !1;
  }
  delete(r, l) {
    const o = this;
    let s = !1;
    function c(f) {
      if (((f = wi(f)), f)) {
        const m = X.findKey(o, f);
        if (m && (!l || Ef(o, o[m], m, l))) {
          (delete o[m], (s = !0));
        }
      }
    }
    return (X.isArray(r) ? r.forEach(c) : c(r), s);
  }
  clear(r) {
    const l = Object.keys(this);
    let o = l.length,
      s = !1;
    for (; o--; ) {
      const c = l[o];
      if (!r || Ef(this, this[c], c, r, !0)) {
        (delete this[c], (s = !0));
      }
    }
    return s;
  }
  normalize(r) {
    const l = this,
      o = {};
    return (
      X.forEach(this, (item, index) => {
        const f = X.findKey(o, index);
        if (f) {
          l[f] = ws(item);
          delete l[index];
          return;
        }
        const m = r ? Gx(index) : String(index).trim();
        if (m !== index) {
          delete l[index];
        }
        l[m] = ws(item);
        o[m] = !0;
      }),
      this
    );
  }
  concat(...r) {
    return this.constructor.concat(this, ...r);
  }
  toJSON(r) {
    const l = Object.create(null);
    return (
      X.forEach(this, (item, index) => {
        if (item != null && item !== !1) {
          l[index] = r && X.isArray(item) ? item.join(", ") : item;
        }
      }),
      l
    );
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([r, l]) => r + ": " + l).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(r) {
    return r instanceof this ? r : new this(r);
  }
  static concat(r, ...l) {
    const o = new this(r);
    return (l.forEach((item) => o.set(item)), o);
  }
  static accessor(r) {
    const o = (this[ap] = this[ap] =
        {
          accessors: {},
        }).accessors,
      s = this.prototype;
    function c(f) {
      const m = wi(f);
      o[m] || (Fx(s, f), (o[m] = !0));
    }
    return (X.isArray(r) ? r.forEach(c) : c(r), this);
  }
};
en.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization",
]);
X.reduceDescriptors(en.prototype, ({ value: n }, r) => {
  let l = r[0].toUpperCase() + r.slice(1);
  return {
    get: () => n,
    set(o) {
      this[l] = o;
    },
  };
});
X.freezeMethods(en);
function xf(n, r) {
  const l = this || Yi,
    o = r || l,
    s = en.from(o.headers);
  let c = o.data;
  return (
    X.forEach(n, function (item) {
      c = item.call(l, c, s.normalize(), r ? r.status : void 0);
    }),
    s.normalize(),
    c
  );
}
function pv(n) {
  return !!(n && n.__CANCEL__);
}
function Sl(n, r, l) {
  Le.call(this, n ?? "canceled", Le.ERR_CANCELED, r, l);
  this.name = "CanceledError";
}
X.inherits(Sl, Le, {
  __CANCEL__: !0,
});
function yv(n, r, l) {
  const o = l.config.validateStatus;
  !l.status || !o || o(l.status)
    ? n(l)
    : r(
        new Le(
          "Request failed with status code " + l.status,
          [Le.ERR_BAD_REQUEST, Le.ERR_BAD_RESPONSE][
            Math.floor(l.status / 100) - 4
          ],
          l.config,
          l.request,
          l,
        ),
      );
}
function Xx(n) {
  const r = /^([-+\w]{1,25})(:?\/\/|:)/.exec(n);
  return (r && r[1]) || "";
}
function Px(n, r) {
  n = n || 10;
  const l = new Array(n),
    o = new Array(n);
  let s = 0,
    c = 0,
    f;
  return (
    (r = r !== void 0 ? r : 1e3),
    function (g) {
      const h = Date.now(),
        y = o[c];
      f || (f = h);
      l[s] = g;
      o[s] = h;
      let v = c,
        S = 0;
      for (; v !== s; ) {
        S += l[v++];
        v = v % n;
      }
      if (((s = (s + 1) % n), s === c && (c = (c + 1) % n), h - f < r)) return;
      const w = y && h - y;
      return w ? Math.round((S * 1e3) / w) : void 0;
    }
  );
}
function Qx(n, r) {
  let l = 0,
    o = 1e3 / r,
    s,
    c;
  const f = (h, y = Date.now()) => {
    l = y;
    s = null;
    if (c) {
      (clearTimeout(c), (c = null));
    }
    n(...h);
  };
  return [
    (...h) => {
      const y = Date.now(),
        v = y - l;
      v >= o
        ? f(h, y)
        : ((s = h),
          c ||
            (c = setTimeout(() => {
              c = null;
              f(s);
            }, o - v)));
    },
    () => s && f(s),
  ];
}
const As = (n, r, l = 3) => {
    let o = 0;
    const s = Px(50, 250);
    return Qx((c) => {
      const f = c.loaded,
        m = c.lengthComputable ? c.total : void 0,
        g = f - o,
        h = s(g),
        y = f <= m;
      o = f;
      const v = {
        loaded: f,
        total: m,
        progress: m ? f / m : void 0,
        bytes: g,
        rate: h || void 0,
        estimated: h && m && y ? (m - f) / h : void 0,
        event: c,
        lengthComputable: m != null,
        [r ? "download" : "upload"]: !0,
      };
      n(v);
    }, l);
  },
  rp = (n, r) => {
    const l = n != null;
    return [
      (o) =>
        r[0]({
          lengthComputable: l,
          total: n,
          loaded: o,
        }),
      r[1],
    ];
  },
  lp =
    (n) =>
    (...r) =>
      X.asap(() => n(...r)),
  Kx = $t.hasStandardBrowserEnv
    ? ((n, r) => (l) => (
        (l = new URL(l, $t.origin)),
        n.protocol === l.protocol &&
          n.host === l.host &&
          (r || n.port === l.port)
      ))(
        new URL($t.origin),
        $t.navigator && /(msie|trident)/i.test($t.navigator.userAgent),
      )
    : () => !0,
  Zx = $t.hasStandardBrowserEnv
    ? {
        write(n, r, l, o, s, c, f) {
          if (typeof document > "u") return;
          const m = [`${n}=${encodeURIComponent(r)}`];
          if (X.isNumber(l)) {
            m.push(`expires=${new Date(l).toUTCString()}`);
          }
          if (X.isString(o)) {
            m.push(`path=${o}`);
          }
          if (X.isString(s)) {
            m.push(`domain=${s}`);
          }
          if (c === !0) {
            m.push("secure");
          }
          if (X.isString(f)) {
            m.push(`SameSite=${f}`);
          }
          document.cookie = m.join("; ");
        },
        read(n) {
          if (typeof document > "u") return null;
          const r = document.cookie.match(
            new RegExp("(?:^|; )" + n + "=([^;]*)"),
          );
          return r ? decodeURIComponent(r[1]) : null;
        },
        remove(n) {
          this.write(n, "", Date.now() - 864e5, "/");
        },
      }
    : {
        write() {},
        read() {
          return null;
        },
        remove() {},
      };
function Jx(n) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(n);
}
function Ix(n, r) {
  return r ? n.replace(/\/?\/$/, "") + "/" + r.replace(/^\/+/, "") : n;
}
function vv(n, r, l) {
  let o = !Jx(r);
  return n && (o || l == !1) ? Ix(n, r) : r;
}
const ip = (n) => {
  return n instanceof en
    ? {
        ...n,
      }
    : n;
};
function Sr(n, r) {
  r = r || {};
  const l = {};
  function o(h, y, v, S) {
    if (X.isPlainObject(h) && X.isPlainObject(y)) {
      return X.merge.call(
        {
          caseless: S,
        },
        h,
        y,
      );
    }
    if (X.isPlainObject(y)) {
      return X.merge({}, y);
    }
    if (X.isArray(y)) {
      return y.slice();
    }
    return y;
  }
  function s(h, y, v, S) {
    if (X.isUndefined(y)) {
      if (!X.isUndefined(h)) return o(void 0, h, v, S);
    } else return o(h, y, v, S);
  }
  function c(h, y) {
    if (!X.isUndefined(y)) return o(void 0, y);
  }
  function f(h, y) {
    if (X.isUndefined(y)) {
      if (!X.isUndefined(h)) return o(void 0, h);
    } else return o(void 0, y);
  }
  function m(h, y, v) {
    if (v in r) return o(h, y);
    if (v in n) return o(void 0, h);
  }
  const g = {
    url: c,
    method: c,
    data: c,
    baseURL: f,
    transformRequest: f,
    transformResponse: f,
    paramsSerializer: f,
    timeout: f,
    timeoutMessage: f,
    withCredentials: f,
    withXSRFToken: f,
    adapter: f,
    responseType: f,
    xsrfCookieName: f,
    xsrfHeaderName: f,
    onUploadProgress: f,
    onDownloadProgress: f,
    decompress: f,
    maxContentLength: f,
    maxBodyLength: f,
    beforeRedirect: f,
    transport: f,
    httpAgent: f,
    httpsAgent: f,
    cancelToken: f,
    socketPath: f,
    responseEncoding: f,
    validateStatus: m,
    headers: (h, y, v) => s(ip(h), ip(y), v, !0),
  };
  return (
    X.forEach(
      Object.keys({
        ...n,
        ...r,
      }),
      function (item) {
        const v = g[item] || s,
          S = v(n[item], r[item], item);
        (X.isUndefined(S) && v !== m) || (l[item] = S);
      },
    ),
    l
  );
}
const bv = (n) => {
    const r = Sr({}, n);
    let {
      data: l,
      withXSRFToken: o,
      xsrfHeaderName: s,
      xsrfCookieName: c,
      headers: f,
      auth: m,
    } = r;
    if (
      ((r.headers = f = en.from(f)),
      (r.url = hv(
        vv(r.baseURL, r.url, r.allowAbsoluteUrls),
        n.params,
        n.paramsSerializer,
      )),
      m &&
        f.set(
          "Authorization",
          "Basic " +
            btoa(
              (m.username || "") +
                ":" +
                (m.password ? unescape(encodeURIComponent(m.password)) : ""),
            ),
        ),
      X.isFormData(l))
    ) {
      if ($t.hasStandardBrowserEnv || $t.hasStandardBrowserWebWorkerEnv)
        f.setContentType(void 0);
      else if (X.isFunction(l.getHeaders)) {
        const g = l.getHeaders(),
          h = ["content-type", "content-length"];
        Object.entries(g).forEach(([y, v]) => {
          if (h.includes(y.toLowerCase())) {
            f.set(y, v);
          }
        });
      }
    }
    if (
      $t.hasStandardBrowserEnv &&
      (o && X.isFunction(o) && (o = o(r)), o || (o !== !1 && Kx(r.url)))
    ) {
      const g = s && c && Zx.read(c);
      if (g) {
        f.set(s, g);
      }
    }
    return r;
  },
  Wx = typeof XMLHttpRequest < "u",
  ew =
    Wx &&
    function (n) {
      return new Promise(function (l, o) {
        const s = bv(n);
        let c = s.data;
        const f = en.from(s.headers).normalize();
        let { responseType: m, onUploadProgress: g, onDownloadProgress: h } = s,
          y,
          v,
          S,
          w,
          x;
        function _() {
          if (w) {
            w();
          }
          if (x) {
            x();
          }
          if (s.cancelToken) {
            s.cancelToken.unsubscribe(y);
          }
          if (s.signal) {
            s.signal.removeEventListener("abort", y);
          }
        }
        let A = new XMLHttpRequest();
        A.open(s.method.toUpperCase(), s.url, !0);
        A.timeout = s.timeout;
        function z() {
          if (!A) return;
          const F = en.from(
              "getAllResponseHeaders" in A && A.getAllResponseHeaders(),
            ),
            U = {
              data:
                !m || m === "text" || m === "json"
                  ? A.responseText
                  : A.response,
              status: A.status,
              statusText: A.statusText,
              headers: F,
              config: n,
              request: A,
            };
          yv(
            function (D) {
              l(D);
              _();
            },
            function (D) {
              o(D);
              _();
            },
            U,
          );
          A = null;
        }
        "onloadend" in A
          ? (A.onloadend = z)
          : (A.onreadystatechange = function () {
              !A ||
                A.readyState !== 4 ||
                (A.status === 0 &&
                  !(A.responseURL && A.responseURL.indexOf("file:") === 0)) ||
                setTimeout(z);
            });
        A.onabort = function () {
          if (A) {
            (o(new Le("Request aborted", Le.ECONNABORTED, n, A)), (A = null));
          }
        };
        A.onerror = function (te) {
          const U = te && te.message ? te.message : "Network Error",
            W = new Le(U, Le.ERR_NETWORK, n, A);
          W.event = te || null;
          o(W);
          A = null;
        };
        A.ontimeout = function () {
          let te = s.timeout
            ? "timeout of " + s.timeout + "ms exceeded"
            : "timeout exceeded";
          const U = s.transitional || mv;
          if (s.timeoutErrorMessage) {
            te = s.timeoutErrorMessage;
          }
          o(
            new Le(
              te,
              U.clarifyTimeoutError ? Le.ETIMEDOUT : Le.ECONNABORTED,
              n,
              A,
            ),
          );
          A = null;
        };
        if (c === void 0) {
          f.setContentType(null);
        }
        if ("setRequestHeader" in A) {
          X.forEach(f.toJSON(), function (item, index) {
            A.setRequestHeader(index, item);
          });
        }
        X.isUndefined(s.withCredentials) ||
          (A.withCredentials = !!s.withCredentials);
        if (m && m !== "json") {
          A.responseType = s.responseType;
        }
        if (h) {
          (([S, x] = As(h, !0)), A.addEventListener("progress", S));
        }
        if (g && A.upload) {
          (([v, w] = As(g)),
            A.upload.addEventListener("progress", v),
            A.upload.addEventListener("loadend", w));
        }
        if (s.cancelToken || s.signal) {
          ((y = (props) => {
            if (A) {
              (o(!props || props.type ? new Sl(null, n, A) : props),
                A.abort(),
                (A = null));
            }
          }),
            s.cancelToken && s.cancelToken.subscribe(y),
            s.signal &&
              (s.signal.aborted ? y() : s.signal.addEventListener("abort", y)));
        }
        const M = Xx(s.url);
        if (M && $t.protocols.indexOf(M) === -1) {
          o(new Le("Unsupported protocol " + M + ":", Le.ERR_BAD_REQUEST, n));
          return;
        }
        A.send(c || null);
      });
    },
  tw = (n, r) => {
    const { length: l } = (n = n ? n.filter(Boolean) : []);
    if (r || l) {
      let o = new AbortController(),
        s;
      const c = function (h) {
        if (!s) {
          s = !0;
          m();
          const y = h instanceof Error ? h : this.reason;
          o.abort(
            y instanceof Le ? y : new Sl(y instanceof Error ? y.message : y),
          );
        }
      };
      let f =
        r &&
        setTimeout(() => {
          f = null;
          c(new Le(`timeout ${r} of ms exceeded`, Le.ETIMEDOUT));
        }, r);
      const m = () => {
        if (n) {
          (f && clearTimeout(f),
            (f = null),
            n.forEach((item) => {
              item.unsubscribe
                ? item.unsubscribe(c)
                : item.removeEventListener("abort", c);
            }),
            (n = null));
        }
      };
      n.forEach((item) => item.addEventListener("abort", c));
      const { signal: g } = o;
      return ((g.unsubscribe = () => X.asap(m)), g);
    }
  },
  nw = function* (n, r) {
    let l = n.byteLength;
    if (l < r) {
      yield n;
      return;
    }
    let o = 0,
      s;
    for (; o < l; ) {
      s = o + r;
      yield n.slice(o, s);
      o = s;
    }
  },
  aw = async function* (n, r) {
    for await (const l of rw(n)) yield* nw(l, r);
  },
  rw = async function* (n) {
    if (n[Symbol.asyncIterator]) {
      yield* n;
      return;
    }
    const r = n.getReader();
    try {
      for (;;) {
        const { done: l, value: o } = await r.read();
        if (l) break;
        yield o;
      }
    } finally {
      await r.cancel();
    }
  },
  op = (n, r, l, o) => {
    const s = aw(n, r);
    let c = 0,
      f,
      m = (g) => {
        f || ((f = !0), o && o(g));
      };
    return new ReadableStream(
      {
        async pull(g) {
          try {
            const { done: h, value: y } = await s.next();
            if (h) {
              m();
              g.close();
              return;
            }
            let v = y.byteLength;
            if (l) {
              let S = (c += v);
              l(S);
            }
            g.enqueue(new Uint8Array(y));
          } catch (h) {
            throw (m(h), h);
          }
        },
        cancel(g) {
          return (m(g), s.return());
        },
      },
      {
        highWaterMark: 2,
      },
    );
  },
  sp = 64 * 1024,
  { isFunction: hs } = X,
  lw = (({ Request: n, Response: r }) => ({
    Request: n,
    Response: r,
  }))(X.global),
  { ReadableStream: up, TextEncoder: cp } = X.global,
  fp = (n, ...r) => {
    try {
      return !!n(...r);
    } catch {
      return !1;
    }
  },
  iw = (props) => {
    props = X.merge.call(
      {
        skipUndefined: !0,
      },
      lw,
      props,
    );
    const { fetch: r, Request: l, Response: o } = props,
      s = r ? hs(r) : typeof fetch == "function",
      c = hs(l),
      f = hs(o);
    if (!s) return !1;
    const m = s && hs(up),
      g =
        s &&
        (typeof cp == "function"
          ? (
              (x) => (_) =>
                x.encode(_)
            )(new cp())
          : async (x) => new Uint8Array(await new l(x).arrayBuffer())),
      h =
        c &&
        m &&
        fp(() => {
          let x = !1;
          const _ = new l($t.origin, {
            body: new up(),
            method: "POST",
            get duplex() {
              return ((x = !0), "half");
            },
          }).headers.has("Content-Type");
          return x && !_;
        }),
      y = f && m && fp(() => X.isReadableStream(new o("").body)),
      v = {
        stream: y && ((x) => x.body),
      };
    if (s) {
      ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((item) => {
        if (!v[item]) {
          v[item] = (_, A) => {
            let z = _ && _[item];
            if (z) return z.call(_);
            throw new Le(
              `Response type '${item}' is not supported`,
              Le.ERR_NOT_SUPPORT,
              A,
            );
          };
        }
      });
    }
    const S = async (x) => {
        if (x == null) return 0;
        if (X.isBlob(x)) return x.size;
        if (X.isSpecCompliantForm(x))
          return (
            await new l($t.origin, {
              method: "POST",
              body: x,
            }).arrayBuffer()
          ).byteLength;
        if (X.isArrayBufferView(x) || X.isArrayBuffer(x)) return x.byteLength;
        if ((X.isURLSearchParams(x) && (x = x + ""), X.isString(x)))
          return (await g(x)).byteLength;
      },
      w = async (x, _) => {
        const A = X.toFiniteNumber(x.getContentLength());
        return A ?? S(_);
      };
    return async (x) => {
      let {
          url: _,
          method: A,
          data: z,
          signal: M,
          cancelToken: F,
          timeout: te,
          onDownloadProgress: U,
          onUploadProgress: W,
          responseType: D,
          headers: le,
          withCredentials: ie = "same-origin",
          fetchOptions: ue,
        } = bv(x),
        ce = r || fetch;
      D = D ? (D + "").toLowerCase() : "text";
      let Ee = tw([M, F && F.toAbortSignal()], te),
        be = null;
      const ee =
        Ee &&
        Ee.unsubscribe &&
        (() => {
          Ee.unsubscribe();
        });
      let Z;
      try {
        if (
          W &&
          h &&
          A !== "get" &&
          A !== "head" &&
          (Z = await w(le, z)) !== 0
        ) {
          let R = new l(_, {
              method: "POST",
              body: z,
              duplex: "half",
            }),
            H;
          if (
            (X.isFormData(z) &&
              (H = R.headers.get("content-type")) &&
              le.setContentType(H),
            R.body)
          ) {
            const [J, ne] = rp(Z, As(lp(W)));
            z = op(R.body, sp, J, ne);
          }
        }
        X.isString(ie) || (ie = ie ? "include" : "omit");
        const T = c && "credentials" in l.prototype,
          V = {
            ...ue,
            signal: Ee,
            method: A.toUpperCase(),
            headers: le.normalize().toJSON(),
            body: z,
            duplex: "half",
            credentials: T ? ie : void 0,
          };
        be = c && new l(_, V);
        let B = await (c ? ce(be, ue) : ce(_, V));
        const re = y && (D === "stream" || D === "response");
        if (y && (U || (re && ee))) {
          const R = {};
          ["status", "statusText", "headers"].forEach((item) => {
            R[item] = B[item];
          });
          const H = X.toFiniteNumber(B.headers.get("content-length")),
            [J, ne] = (U && rp(H, As(lp(U), !0))) || [];
          B = new o(
            op(B.body, sp, J, () => {
              if (ne) {
                ne();
              }
              if (ee) {
                ee();
              }
            }),
            R,
          );
        }
        D = D || "text";
        let oe = await v[X.findKey(v, D) || "text"](B, x);
        return (
          !re && ee && ee(),
          await new Promise((R, H) => {
            yv(R, H, {
              data: oe,
              headers: en.from(B.headers),
              status: B.status,
              statusText: B.statusText,
              config: x,
              request: be,
            });
          })
        );
      } catch (T) {
        throw (
          ee && ee(),
          T && T.name === "TypeError" && /Load failed|fetch/i.test(T.message)
            ? Object.assign(new Le("Network Error", Le.ERR_NETWORK, x, be), {
                cause: T.cause || T,
              })
            : Le.from(T, T && T.code, x, be)
        );
      }
    };
  },
  ow = new Map(),
  Sv = (n) => {
    let r = (n && n.env) || {};
    const { fetch: l, Request: o, Response: s } = r,
      c = [o, s, l];
    let f = c.length,
      m = f,
      g,
      h,
      y = ow;
    for (; m--; ) {
      g = c[m];
      h = y.get(g);
      if (h === void 0) {
        y.set(g, (h = m ? new Map() : iw(r)));
      }
      y = h;
    }
    return h;
  };
Sv();
const xd = {
  http: Rx,
  xhr: ew,
  fetch: {
    get: Sv,
  },
};
X.forEach(xd, (item, index) => {
  if (item) {
    try {
      Object.defineProperty(item, "name", {
        value: index,
      });
    } catch {}
    Object.defineProperty(item, "adapterName", {
      value: index,
    });
  }
});
const dp = (n) => `- ${n}`,
  sw = (n) => {
    return X.isFunction(n) || n === null || n === !1;
  };
function uw(n, r) {
  n = X.isArray(n) ? n : [n];
  const { length: l } = n;
  let o, s;
  const c = {};
  for (let f = 0; f < l; f++) {
    o = n[f];
    let m;
    if (
      ((s = o),
      !sw(o) && ((s = xd[(m = String(o)).toLowerCase()]), s === void 0))
    )
      throw new Le(`Unknown adapter '${m}'`);
    if (s && (X.isFunction(s) || (s = s.get(r)))) break;
    c[m || "#" + f] = s;
  }
  if (!s) {
    const f = Object.entries(c).map(
      ([g, h]) =>
        `adapter ${g} ` +
        (h === !1
          ? "is not supported by the environment"
          : "is not available in the build"),
    );
    let m = l
      ? f.length > 1
        ? `since :
` +
          f.map(dp).join(`
`)
        : " " + dp(f[0])
      : "as no adapter specified";
    throw new Le(
      "There is no suitable adapter to dispatch the request " + m,
      "ERR_NOT_SUPPORT",
    );
  }
  return s;
}
const Ev = {
  getAdapter: uw,
  adapters: xd,
};
function wf(props) {
  if (
    (props.cancelToken && props.cancelToken.throwIfRequested(),
    props.signal && props.signal.aborted)
  )
    throw new Sl(null, props);
}
function hp(n) {
  return (
    wf(n),
    (n.headers = en.from(n.headers)),
    (n.data = xf.call(n, n.transformRequest)),
    ["post", "put", "patch"].indexOf(n.method) !== -1 &&
      n.headers.setContentType("application/x-www-form-urlencoded", !1),
    Ev.getAdapter(
      n.adapter || Yi.adapter,
      n,
    )(n).then(
      function (response) {
        return (
          wf(n),
          (response.data = xf.call(n, n.transformResponse, response)),
          (response.headers = en.from(response.headers)),
          response
        );
      },
      function (response) {
        return (
          pv(response) ||
            (wf(n),
            response &&
              response.response &&
              ((response.response.data = xf.call(
                n,
                n.transformResponse,
                response.response,
              )),
              (response.response.headers = en.from(
                response.response.headers,
              )))),
          Promise.reject(response)
        );
      },
    )
  );
}
const xv = "1.13.2",
  Fs = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach(
  (item, index) => {
    Fs[item] = function (o) {
      return typeof o === item || "a" + (index < 1 ? "n " : " ") + item;
    };
  },
);
const mp = {};
Fs.transitional = function (r, l, o) {
  function s(c, f) {
    return (
      "[Axios v" +
      xv +
      "] Transitional option '" +
      c +
      "'" +
      f +
      (o ? ". " + o : "")
    );
  }
  return (c, f, m) => {
    if (r === !1)
      throw new Le(
        s(f, " has been removed" + (l ? " in " + l : "")),
        Le.ERR_DEPRECATED,
      );
    return (
      l &&
        !mp[f] &&
        ((mp[f] = !0),
        console.warn(
          s(
            f,
            " has been deprecated since v" +
              l +
              " and will be removed in the near future",
          ),
        )),
      r ? r(c, f, m) : !0
    );
  };
};
Fs.spelling = function (r) {
  return (l, o) => (console.warn(`${o} is likely a misspelling of ${r}`), !0);
};
function cw(n, r, l) {
  if (typeof n != "object")
    throw new Le("options must be an object", Le.ERR_BAD_OPTION_VALUE);
  const o = Object.keys(n);
  let s = o.length;
  for (; s-- > 0; ) {
    const c = o[s],
      f = r[c];
    if (f) {
      const m = n[c],
        g = m === void 0 || f(m, c, n);
      if (g !== !0)
        throw new Le("option " + c + " must be " + g, Le.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (l !== !0) throw new Le("Unknown option " + c, Le.ERR_BAD_OPTION);
  }
}
const Rs = {
    assertOptions: cw,
    validators: Fs,
  },
  qn = Rs.validators;
let br = class {
  constructor(r) {
    this.defaults = r || {};
    this.interceptors = {
      request: new np(),
      response: new np(),
    };
  }
  async request(r, l) {
    try {
      return await this._request(r, l);
    } catch (o) {
      if (o instanceof Error) {
        let s = {};
        Error.captureStackTrace
          ? Error.captureStackTrace(s)
          : (s = new Error());
        const c = s.stack ? s.stack.replace(/^.+\n/, "") : "";
        try {
          o.stack
            ? c &&
              !String(o.stack).endsWith(c.replace(/^.+\n.+\n/, "")) &&
              (o.stack +=
                `
` + c)
            : (o.stack = c);
        } catch {}
      }
      throw o;
    }
  }
  _request(r, l) {
    typeof r == "string" ? ((l = l || {}), (l.url = r)) : (l = r || {});
    l = Sr(this.defaults, l);
    const { transitional: o, paramsSerializer: s, headers: c } = l;
    if (o !== void 0) {
      Rs.assertOptions(
        o,
        {
          silentJSONParsing: qn.transitional(qn.boolean),
          forcedJSONParsing: qn.transitional(qn.boolean),
          clarifyTimeoutError: qn.transitional(qn.boolean),
        },
        !1,
      );
    }
    if (s != null) {
      X.isFunction(s)
        ? (l.paramsSerializer = {
            serialize: s,
          })
        : Rs.assertOptions(
            s,
            {
              encode: qn.function,
              serialize: qn.function,
            },
            !0,
          );
    }
    l.allowAbsoluteUrls !== void 0 ||
      (this.defaults.allowAbsoluteUrls !== void 0
        ? (l.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls)
        : (l.allowAbsoluteUrls = !0));
    Rs.assertOptions(
      l,
      {
        baseUrl: qn.spelling("baseURL"),
        withXsrfToken: qn.spelling("withXSRFToken"),
      },
      !0,
    );
    l.method = (l.method || this.defaults.method || "get").toLowerCase();
    let f = c && X.merge(c.common, c[l.method]);
    if (c) {
      X.forEach(
        ["delete", "get", "head", "post", "put", "patch", "common"],
        (item) => {
          delete c[item];
        },
      );
    }
    l.headers = en.concat(f, c);
    const m = [];
    let g = !0;
    this.interceptors.request.forEach(function (item) {
      (typeof item.runWhen == "function" && item.runWhen(l) === !1) ||
        ((g = g && item.synchronous), m.unshift(item.fulfilled, item.rejected));
    });
    const h = [];
    this.interceptors.response.forEach(function (item) {
      h.push(item.fulfilled, item.rejected);
    });
    let y,
      v = 0,
      S;
    if (!g) {
      const x = [hp.bind(this), void 0];
      for (
        x.unshift(...m), x.push(...h), S = x.length, y = Promise.resolve(l);
        v < S;
      )
        y = y.then(x[v++], x[v++]);
      return y;
    }
    S = m.length;
    let w = l;
    for (; v < S; ) {
      const x = m[v++],
        _ = m[v++];
      try {
        w = x(w);
      } catch (A) {
        _.call(this, A);
        break;
      }
    }
    try {
      y = hp.call(this, w);
    } catch (x) {
      return Promise.reject(x);
    }
    for (v = 0, S = h.length; v < S; ) y = y.then(h[v++], h[v++]);
    return y;
  }
  getUri(r) {
    r = Sr(this.defaults, r);
    const l = vv(r.baseURL, r.url, r.allowAbsoluteUrls);
    return hv(l, r.params, r.paramsSerializer);
  }
};
X.forEach(["delete", "get", "head", "options"], function (item) {
  br.prototype[item] = function (l, o) {
    return this.request(
      Sr(o || {}, {
        method: item,
        url: l,
        data: (o || {}).data,
      }),
    );
  };
});
X.forEach(["post", "put", "patch"], function (item) {
  function l(o) {
    return function (c, f, m) {
      return this.request(
        Sr(m || {}, {
          method: item,
          headers: o
            ? {
                "Content-Type": "multipart/form-data",
              }
            : {},
          url: c,
          data: f,
        }),
      );
    };
  }
  br.prototype[item] = l();
  br.prototype[item + "Form"] = l(!0);
});
let fw = class wv {
  constructor(r) {
    if (typeof r != "function")
      throw new TypeError("executor must be a function.");
    let l;
    this.promise = new Promise(function (c) {
      l = c;
    });
    const o = this;
    this.promise.then((response) => {
      if (!o._listeners) return;
      let c = o._listeners.length;
      for (; c-- > 0; ) o._listeners[c](response);
      o._listeners = null;
    });
    this.promise.then = (s) => {
      let c;
      const f = new Promise((m) => {
        o.subscribe(m);
        c = m;
      }).then(s);
      return (
        (f.cancel = function () {
          o.unsubscribe(c);
        }),
        f
      );
    };
    r(function (c, f, m) {
      o.reason || ((o.reason = new Sl(c, f, m)), l(o.reason));
    });
  }
  throwIfRequested() {
    if (this.reason) throw this.reason;
  }
  subscribe(r) {
    if (this.reason) {
      r(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(r) : (this._listeners = [r]);
  }
  unsubscribe(r) {
    if (!this._listeners) return;
    const l = this._listeners.indexOf(r);
    if (l !== -1) {
      this._listeners.splice(l, 1);
    }
  }
  toAbortSignal() {
    const r = new AbortController(),
      l = (o) => {
        r.abort(o);
      };
    return (
      this.subscribe(l),
      (r.signal.unsubscribe = () => this.unsubscribe(l)),
      r.signal
    );
  }
  static source() {
    let r;
    return {
      token: new wv(function (s) {
        r = s;
      }),
      cancel: r,
    };
  }
};
function dw(n) {
  return function (l) {
    return n.apply(null, l);
  };
}
function hw(n) {
  return X.isObject(n) && n.isAxiosError === !0;
}
const nd = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526,
};
Object.entries(nd).forEach(([n, r]) => {
  nd[r] = n;
});
function Rv(n) {
  const r = new br(n),
    l = tv(br.prototype.request, r);
  return (
    X.extend(l, br.prototype, r, {
      allOwnKeys: !0,
    }),
    X.extend(l, r, null, {
      allOwnKeys: !0,
    }),
    (l.create = function (s) {
      return Rv(Sr(n, s));
    }),
    l
  );
}
const Et = Rv(Yi);
Et.Axios = br;
Et.CanceledError = Sl;
Et.CancelToken = fw;
Et.isCancel = pv;
Et.VERSION = xv;
Et.toFormData = Gs;
Et.AxiosError = Le;
Et.Cancel = Et.CanceledError;
Et.all = function (r) {
  return Promise.all(r);
};
Et.spread = dw;
Et.isAxiosError = hw;
Et.mergeConfig = Sr;
Et.AxiosHeaders = en;
Et.formToJSON = (n) => gv(X.isHTMLForm(n) ? new FormData(n) : n);
Et.getAdapter = Ev.getAdapter;
Et.HttpStatusCode = nd;
Et.default = Et;
const {
    Axios: ET,
    AxiosError: xT,
    CanceledError: wT,
    isCancel: RT,
    CancelToken: _T,
    VERSION: TT,
    all: OT,
    Cancel: CT,
    isAxiosError: AT,
    spread: DT,
    toFormData: LT,
    AxiosHeaders: NT,
    HttpStatusCode: MT,
    formToJSON: zT,
    getAdapter: kT,
    mergeConfig: jT,
  } = Et,
  mw = "http://localhost:8000",
  cl = Et.create({
    baseURL: mw,
  });
cl.interceptors.response.use(
  (n) => n,
  (n) => Promise.reject(n.response?.data || "Something went wrong"),
);
const gp = (n) => {
    try {
      const r = ev(n);
      if (!r.exp)
        return (
          console.error("Token does not contain an expiration time."),
          !1
        );
      const l = Date.now() / 1e3;
      return r.exp > l;
    } catch (r) {
      return (console.error("Failed to decode token:", r), !1);
    }
  },
  pr = (n) => {
    typeof n == "string" && n.trim() !== ""
      ? (localStorage.setItem("authToken", n),
        (cl.defaults.headers.common.Authorization = `Bearer ${n}`))
      : (localStorage.removeItem("authToken"),
        delete cl.defaults.headers.common.Authorization);
  };
function da(n) {
  const r = E.createContext(null);
  return [
    ({ children: s, value: c }) =>
      L.jsx(r.Provider, {
        value: c,
        children: s,
      }),
    () => {
      const s = E.useContext(r);
      if (s === null) throw new Error(n);
      return s;
    },
  ];
}
const [gw, El] = da("useAuthContext must be used within AuthProvider"),
  pw = {
    isAuthenticated: !1,
    isLoading: !1,
    isInitialized: !1,
    errorMessage: null,
    user: null,
    lastProfileSync: null,
    refreshUser: async () => null,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
  },
  yw = {
    INITIALIZE: (n, r) => ({
      ...n,
      isAuthenticated: r.payload?.isAuthenticated ?? !1,
      isInitialized: !0,
      user: r.payload?.user ?? null,
      lastProfileSync: r.payload?.lastProfileSync ?? n.lastProfileSync ?? null,
    }),
    LOGIN_REQUEST: (n) => ({
      ...n,
      errorMessage: null,
      isLoading: !0,
    }),
    LOGIN_SUCCESS: (n, r) => ({
      ...n,
      isAuthenticated: !0,
      isLoading: !1,
      user: r.payload?.user ?? null,
      lastProfileSync: r.payload?.lastProfileSync ?? Date.now(),
    }),
    LOGIN_ERROR: (n, r) => ({
      ...n,
      errorMessage: r.payload?.errorMessage ?? "An error occurred",
      isLoading: !1,
    }),
    LOGOUT: (n) => ({
      ...n,
      isAuthenticated: !1,
      user: null,
      lastProfileSync: null,
    }),
  },
  vw = (n, r) => {
    const l = yw[r.type];
    return l ? l(n, r) : n;
  },
  Rf = (n, r) => {
    if (typeof n == "string") return n;
    if (n instanceof Error && n.message) return n.message;
    if (n && typeof n == "object" && "message" in n) {
      const l = n.message;
      if (typeof l == "string") return l;
    }
    return r;
  },
  _v = (n) => {
    return (
      !n ||
        typeof n != "object" ||
        Object.isFrozen(n) ||
        (Object.freeze(n),
        Object.values(n).forEach((item) => {
          _v(item);
        })),
      n
    );
  },
  bw = (n) => {
    const r = (o, s) => {
        if (!o || typeof o != "object") return null;
        const c = o[s];
        return Array.isArray(c) ? c : null;
      },
      l =
        (n && Array.isArray(n) && n) ||
        r(n, "licenses") ||
        r(n, "licences") ||
        r(n, "license") ||
        r(n, "licence") ||
        [];
    return Array.isArray(l)
      ? l
          .map((item) => {
            if (!item || typeof item != "object") return null;
            const s = item,
              c =
                s.type ??
                s.license_type ??
                s.licence_type ??
                s.licenseType ??
                s.licenceType,
              f =
                typeof c == "number"
                  ? c
                  : typeof c == "string"
                    ? Number(c)
                    : null;
            if (!f || Number.isNaN(f)) return null;
            const m =
                s.id ??
                s.license_id ??
                s.licence_id ??
                s.licenseId ??
                s.licenceId,
              g = typeof s.status == "string" ? s.status : void 0,
              h =
                (typeof s.start_date == "string" && s.start_date) ||
                (typeof s.startDate == "string" && s.startDate) ||
                void 0,
              y =
                (typeof s.end_date == "string" && s.end_date) ||
                (typeof s.endDate == "string" && s.endDate) ||
                void 0;
            return {
              id: typeof m == "string" ? m : void 0,
              type: f,
              status: g,
              startDate: h,
              endDate: y,
            };
          })
          .filter(Boolean)
      : [];
  },
  Sw = (n) => {
    const r = n,
      l = [
        "email_verified_at",
        "emailVerifiedAt",
        "email_verifed_at",
        "emailVerifedAt",
      ];
    for (const o of l) {
      const s = r[o];
      if (typeof s == "string") return s;
      if (typeof s == "number" && Number.isFinite(s))
        return new Date(s).toISOString();
      if (s instanceof Date && !Number.isNaN(s.getTime()))
        return s.toISOString();
    }
    return null;
  },
  Ew = (n) => {
    const r = n,
      l = ["email_verified", "emailVerified", "email_verifed", "emailVerifed"];
    for (const o of l) {
      const s = r[o];
      if (typeof s == "boolean" || typeof s == "string" || typeof s == "number")
        return s;
    }
    return null;
  };
function xw({ children: n }) {
  const [r, l] = E.useReducer(vw, pw),
    o = async (g) => {
      const { data: h } = await cl.get("/auth/profile"),
        y = h.discordId || h.discord_id || null,
        v = h.telegramId || h.telegram_id || null,
        S = h.discordUsername || h.discord_username || null,
        w = typeof h.oldId < "u" ? h.oldId : (h.old_id ?? null),
        x = typeof h.firstLogin < "u" ? h.firstLogin : (h.first_login ?? null);
      let _ = [],
        A = [],
        z = null;
      const M = g || window.localStorage.getItem("authToken");
      if (M)
        try {
          const ie = ev(M);
          Array.isArray(ie.permissions)
            ? (_ = ie.permissions)
            : Array.isArray(ie.authorities) && (_ = ie.authorities);
          Array.isArray(ie.roles)
            ? (A = ie.roles)
            : ie.realm_access &&
              Array.isArray(ie.realm_access.roles) &&
              (A = ie.realm_access.roles);
          typeof ie.email_verified == "boolean"
            ? (z = ie.email_verified)
            : (ie.email_verified_at || ie.emailVerifiedAt) && (z = !0);
        } catch (ie) {
          console.warn("Failed to decode token for permissions", ie);
        }
      const F = Sw(h),
        te = Ew(h),
        U = typeof te == "string" ? te.trim().toLowerCase() : te,
        W = !!(F || U === !0 || U === "true" || U === 1 || U === "1" || z),
        D = F || null,
        le = bw(h);
      return _v({
        id: h.id,
        username: h.username,
        name: h.name,
        email: h.email,
        emailVerified: W,
        emailVerifiedAt: D,
        permissions: _,
        roles: A,
        telegramId: v,
        discordId: y,
        discordUsername: S,
        oldId: w,
        firstLogin: x,
        licenses: le,
      });
    };
  E.useEffect(() => {
    (async () => {
      try {
        const h = window.localStorage.getItem("authToken");
        if (h && gp(h)) {
          pr(h);
          const y = await o(h);
          l({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: !0,
              user: y,
              lastProfileSync: Date.now(),
            },
          });
        } else
          l({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: !1,
              user: null,
            },
          });
      } catch (h) {
        console.error(h);
        l({
          type: "INITIALIZE",
          payload: {
            isAuthenticated: !1,
            user: null,
          },
        });
      }
    })();
  }, []);
  const s = async () => {
      const g = window.localStorage.getItem("authToken");
      if (!g || !gp(g))
        return (
          pr(null),
          l({
            type: "LOGOUT",
          }),
          null
        );
      try {
        pr(g);
        const h = await o(g);
        return (
          l({
            type: "LOGIN_SUCCESS",
            payload: {
              user: h,
              lastProfileSync: Date.now(),
            },
          }),
          h
        );
      } catch (h) {
        console.error("Failed to refresh user profile", h);
        const y =
          typeof h == "object" &&
          h &&
          "status" in h &&
          typeof h.status == "number"
            ? h.status
            : null;
        return (
          (y === 401 || y === 403) &&
            (pr(null),
            l({
              type: "LOGOUT",
            })),
          null
        );
      }
    },
    c = async (g) => {
      l({
        type: "LOGIN_REQUEST",
      });
      try {
        const h = await cl.post("/auth/login", g),
          { token: y } = h.data;
        if (typeof y != "string") throw new Error("Response is not valid");
        pr(y);
        const v = await o(y);
        l({
          type: "LOGIN_SUCCESS",
          payload: {
            user: v,
            lastProfileSync: Date.now(),
          },
        });
      } catch (h) {
        l({
          type: "LOGIN_ERROR",
          payload: {
            errorMessage: Rf(h, "Login failed"),
          },
        });
      }
    },
    f = async (g) => {
      l({
        type: "LOGIN_REQUEST",
      });
      try {
        const h = await cl.post("/auth/register", g),
          { token: y } = h.data;
        if (typeof y != "string") throw new Error("Response is not valid");
        pr(y);
        const v = await o(y);
        l({
          type: "LOGIN_SUCCESS",
          payload: {
            user: v,
            lastProfileSync: Date.now(),
          },
        });
      } catch (h) {
        throw (
          l({
            type: "LOGIN_ERROR",
            payload: {
              errorMessage: Rf(h, "Register failed"),
            },
          }),
          new Error(Rf(h, "Register failed"))
        );
      }
    },
    m = async () => {
      pr(null);
      l({
        type: "LOGOUT",
      });
    };
  return n
    ? L.jsx(gw, {
        value: {
          ...r,
          refreshUser: s,
          login: c,
          register: f,
          logout: m,
        },
        children: n,
      })
    : null;
}
const Ba = {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    "2XL": 1536,
  },
  wd = typeof window > "u" || typeof document > "u",
  [ww, Tv] = da("useBreakpointsContext must be used within BreakpointsContext");
function Rw({ children: n }) {
  const [r, l] = E.useState(pp()),
    o = E.useRef(null);
  return (
    E.useEffect(() => {
      const s = () => {
        const c = pp();
        if (c.name !== r.name) {
          l(c);
        }
      };
      return (
        wd ||
          ((o.current = new ResizeObserver(s)),
          o.current.observe(document.documentElement)),
        () => {
          o.current?.disconnect();
        }
      );
    }, [r.name]),
    n
      ? L.jsx(ww, {
          value: r,
          children: n,
        })
      : null
  );
}
function pp() {
  if (wd)
    return {
      name: "",
      isXs: !1,
      isSm: !1,
      isMd: !1,
      isLg: !1,
      isXl: !1,
      is2xl: !1,
      smAndDown: !1,
      smAndUp: !1,
      mdAndDown: !1,
      mdAndUp: !1,
      lgAndDown: !1,
      lgAndUp: !1,
      xlAndDown: !1,
      xlAndUp: !1,
      ...Ba,
    };
  const n = window.innerWidth;
  let r = "";
  const l = n < Ba.SM,
    o = n < Ba.MD && !l,
    s = n < Ba.LG && !(o || l),
    c = n < Ba.XL && !(s || o || l),
    f = n < Ba["2XL"] && !(c || s || o || l),
    m = n >= Ba["2XL"];
  return (
    l && (r = "xs"),
    o && (r = "sm"),
    s && (r = "md"),
    c && (r = "lg"),
    f && (r = "xl"),
    m && (r = "2xl"),
    {
      name: r,
      isXs: l,
      isSm: o,
      isMd: s,
      isLg: c,
      isXl: f,
      is2xl: m,
      smAndDown: l || o,
      smAndUp: o || s || c || f || m,
      mdAndDown: l || o || s,
      mdAndUp: s || c || f || m,
      lgAndDown: l || o || s || c,
      lgAndUp: c || f || m,
      xlAndDown: l || o || s || c || f,
      xlAndUp: f || m,
      ...Ba,
    }
  );
}
var _s = {
    exports: {},
  },
  _w = _s.exports,
  yp;
function Tw() {
  return (
    yp ||
      ((yp = 1),
      (function (n, r) {
        (function (l, o) {
          n.exports = o();
        })(_w, function () {
          var l = 1e3,
            o = 6e4,
            s = 36e5,
            c = "millisecond",
            f = "second",
            m = "minute",
            g = "hour",
            h = "day",
            y = "week",
            v = "month",
            S = "quarter",
            w = "year",
            x = "date",
            _ = "Invalid Date",
            A =
              /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,
            z =
              /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,
            M = {
              name: "en",
              weekdays:
                "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split(
                  "_",
                ),
              months:
                "January_February_March_April_May_June_July_August_September_October_November_December".split(
                  "_",
                ),
              ordinal: function (ee) {
                var Z = ["th", "st", "nd", "rd"],
                  T = ee % 100;
                return "[" + ee + (Z[(T - 20) % 10] || Z[T] || Z[0]) + "]";
              },
            },
            F = function (ee, Z, T) {
              var V = String(ee);
              return !V || V.length >= Z
                ? ee
                : "" + Array(Z + 1 - V.length).join(T) + ee;
            },
            te = {
              s: F,
              z: function (ee) {
                var Z = -ee.utcOffset(),
                  T = Math.abs(Z),
                  V = Math.floor(T / 60),
                  B = T % 60;
                return (Z <= 0 ? "+" : "-") + F(V, 2, "0") + ":" + F(B, 2, "0");
              },
              m: function ee(Z, T) {
                if (Z.date() < T.date()) return -ee(T, Z);
                var V = 12 * (T.year() - Z.year()) + (T.month() - Z.month()),
                  B = Z.clone().add(V, v),
                  re = T - B < 0,
                  oe = Z.clone().add(V + (re ? -1 : 1), v);
                return +(-(V + (T - B) / (re ? B - oe : oe - B)) || 0);
              },
              a: function (ee) {
                return ee < 0 ? Math.ceil(ee) || 0 : Math.floor(ee);
              },
              p: function (ee) {
                return (
                  {
                    M: v,
                    y: w,
                    w: y,
                    d: h,
                    D: x,
                    h: g,
                    m,
                    s: f,
                    ms: c,
                    Q: S,
                  }[ee] ||
                  String(ee || "")
                    .toLowerCase()
                    .replace(/s$/, "")
                );
              },
              u: function (ee) {
                return ee === void 0;
              },
            },
            U = "en",
            W = {};
          W[U] = M;
          var D = "$isDayjsObject",
            le = function (ee) {
              return ee instanceof Ee || !(!ee || !ee[D]);
            },
            ie = function ee(Z, T, V) {
              var B;
              if (!Z) return U;
              if (typeof Z == "string") {
                var re = Z.toLowerCase();
                if (W[re]) {
                  B = re;
                }
                if (T) {
                  ((W[re] = T), (B = re));
                }
                var oe = Z.split("-");
                if (!B && oe.length > 1) return ee(oe[0]);
              } else {
                var R = Z.name;
                W[R] = Z;
                B = R;
              }
              return (!V && B && (U = B), B || (!V && U));
            },
            ue = function (ee, Z) {
              if (le(ee)) return ee.clone();
              var T = typeof Z == "object" ? Z : {};
              return ((T.date = ee), (T.args = arguments), new Ee(T));
            },
            ce = te;
          ce.l = ie;
          ce.i = le;
          ce.w = function (ee, Z) {
            return ue(ee, {
              locale: Z.$L,
              utc: Z.$u,
              x: Z.$x,
              $offset: Z.$offset,
            });
          };
          var Ee = (function () {
              function ee(T) {
                this.$L = ie(T.locale, null, !0);
                this.parse(T);
                this.$x = this.$x || T.x || {};
                this[D] = !0;
              }
              var Z = ee.prototype;
              return (
                (Z.parse = function (T) {
                  this.$d = (function (V) {
                    var B = V.date,
                      re = V.utc;
                    if (B === null) return new Date(NaN);
                    if (ce.u(B)) return new Date();
                    if (B instanceof Date) return new Date(B);
                    if (typeof B == "string" && !/Z$/i.test(B)) {
                      var oe = B.match(A);
                      if (oe) {
                        var R = oe[2] - 1 || 0,
                          H = (oe[7] || "0").substring(0, 3);
                        return re
                          ? new Date(
                              Date.UTC(
                                oe[1],
                                R,
                                oe[3] || 1,
                                oe[4] || 0,
                                oe[5] || 0,
                                oe[6] || 0,
                                H,
                              ),
                            )
                          : new Date(
                              oe[1],
                              R,
                              oe[3] || 1,
                              oe[4] || 0,
                              oe[5] || 0,
                              oe[6] || 0,
                              H,
                            );
                      }
                    }
                    return new Date(B);
                  })(T);
                  this.init();
                }),
                (Z.init = function () {
                  var T = this.$d;
                  this.$y = T.getFullYear();
                  this.$M = T.getMonth();
                  this.$D = T.getDate();
                  this.$W = T.getDay();
                  this.$H = T.getHours();
                  this.$m = T.getMinutes();
                  this.$s = T.getSeconds();
                  this.$ms = T.getMilliseconds();
                }),
                (Z.$utils = function () {
                  return ce;
                }),
                (Z.isValid = function () {
                  return this.$d.toString() !== _;
                }),
                (Z.isSame = function (T, V) {
                  var B = ue(T);
                  return this.startOf(V) <= B && B <= this.endOf(V);
                }),
                (Z.isAfter = function (T, V) {
                  return ue(T) < this.startOf(V);
                }),
                (Z.isBefore = function (T, V) {
                  return this.endOf(V) < ue(T);
                }),
                (Z.$g = function (T, V, B) {
                  return ce.u(T) ? this[V] : this.set(B, T);
                }),
                (Z.unix = function () {
                  return Math.floor(this.valueOf() / 1e3);
                }),
                (Z.valueOf = function () {
                  return this.$d.getTime();
                }),
                (Z.startOf = function (T, V) {
                  var B = this,
                    re = !!ce.u(V) || V,
                    oe = ce.p(T),
                    R = function (Pe, ft) {
                      var qt = ce.w(
                        B.$u ? Date.UTC(B.$y, ft, Pe) : new Date(B.$y, ft, Pe),
                        B,
                      );
                      return re ? qt : qt.endOf(h);
                    },
                    H = function (Pe, ft) {
                      return ce.w(
                        B.toDate()[Pe].apply(
                          B.toDate("s"),
                          (re ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(ft),
                        ),
                        B,
                      );
                    },
                    J = this.$W,
                    ne = this.$M,
                    me = this.$D,
                    Re = "set" + (this.$u ? "UTC" : "");
                  switch (oe) {
                    case w:
                      return re ? R(1, 0) : R(31, 11);
                    case v:
                      return re ? R(1, ne) : R(0, ne + 1);
                    case y:
                      var Ae = this.$locale().weekStart || 0,
                        tt = (J < Ae ? J + 7 : J) - Ae;
                      return R(re ? me - tt : me + (6 - tt), ne);
                    case h:
                    case x:
                      return H(Re + "Hours", 0);
                    case g:
                      return H(Re + "Minutes", 1);
                    case m:
                      return H(Re + "Seconds", 2);
                    case f:
                      return H(Re + "Milliseconds", 3);
                    default:
                      return this.clone();
                  }
                }),
                (Z.endOf = function (T) {
                  return this.startOf(T, !1);
                }),
                (Z.$set = function (T, V) {
                  var B,
                    re = ce.p(T),
                    oe = "set" + (this.$u ? "UTC" : ""),
                    R = ((B = {}),
                    (B[h] = oe + "Date"),
                    (B[x] = oe + "Date"),
                    (B[v] = oe + "Month"),
                    (B[w] = oe + "FullYear"),
                    (B[g] = oe + "Hours"),
                    (B[m] = oe + "Minutes"),
                    (B[f] = oe + "Seconds"),
                    (B[c] = oe + "Milliseconds"),
                    B)[re],
                    H = re === h ? this.$D + (V - this.$W) : V;
                  if (re === v || re === w) {
                    var J = this.clone().set(x, 1);
                    J.$d[R](H);
                    J.init();
                    this.$d = J.set(x, Math.min(this.$D, J.daysInMonth())).$d;
                  } else if (R) {
                    this.$d[R](H);
                  }
                  return (this.init(), this);
                }),
                (Z.set = function (T, V) {
                  return this.clone().$set(T, V);
                }),
                (Z.get = function (T) {
                  return this[ce.p(T)]();
                }),
                (Z.add = function (T, V) {
                  var B,
                    re = this;
                  T = Number(T);
                  var oe = ce.p(V),
                    R = function (ne) {
                      var me = ue(re);
                      return ce.w(me.date(me.date() + Math.round(ne * T)), re);
                    };
                  if (oe === v) return this.set(v, this.$M + T);
                  if (oe === w) return this.set(w, this.$y + T);
                  if (oe === h) return R(1);
                  if (oe === y) return R(7);
                  var H =
                      ((B = {}), (B[m] = o), (B[g] = s), (B[f] = l), B)[oe] ||
                      1,
                    J = this.$d.getTime() + T * H;
                  return ce.w(J, this);
                }),
                (Z.subtract = function (T, V) {
                  return this.add(-1 * T, V);
                }),
                (Z.format = function (T) {
                  var V = this,
                    B = this.$locale();
                  if (!this.isValid()) return B.invalidDate || _;
                  var re = T || "YYYY-MM-DDTHH:mm:ssZ",
                    oe = ce.z(this),
                    R = this.$H,
                    H = this.$m,
                    J = this.$M,
                    ne = B.weekdays,
                    me = B.months,
                    Re = B.meridiem,
                    Ae = function (ft, qt, at, Gt) {
                      return (
                        (ft && (ft[qt] || ft(V, re))) || at[qt].slice(0, Gt)
                      );
                    },
                    tt = function (ft) {
                      return ce.s(R % 12 || 12, ft, "0");
                    },
                    Pe =
                      Re ||
                      function (ft, qt, at) {
                        var Gt = ft < 12 ? "AM" : "PM";
                        return at ? Gt.toLowerCase() : Gt;
                      };
                  return re.replace(z, function (ft, qt) {
                    return (
                      qt ||
                      (function (at) {
                        switch (at) {
                          case "YY":
                            return String(V.$y).slice(-2);
                          case "YYYY":
                            return ce.s(V.$y, 4, "0");
                          case "M":
                            return J + 1;
                          case "MM":
                            return ce.s(J + 1, 2, "0");
                          case "MMM":
                            return Ae(B.monthsShort, J, me, 3);
                          case "MMMM":
                            return Ae(me, J);
                          case "D":
                            return V.$D;
                          case "DD":
                            return ce.s(V.$D, 2, "0");
                          case "d":
                            return String(V.$W);
                          case "dd":
                            return Ae(B.weekdaysMin, V.$W, ne, 2);
                          case "ddd":
                            return Ae(B.weekdaysShort, V.$W, ne, 3);
                          case "dddd":
                            return ne[V.$W];
                          case "H":
                            return String(R);
                          case "HH":
                            return ce.s(R, 2, "0");
                          case "h":
                            return tt(1);
                          case "hh":
                            return tt(2);
                          case "a":
                            return Pe(R, H, !0);
                          case "A":
                            return Pe(R, H, !1);
                          case "m":
                            return String(H);
                          case "mm":
                            return ce.s(H, 2, "0");
                          case "s":
                            return String(V.$s);
                          case "ss":
                            return ce.s(V.$s, 2, "0");
                          case "SSS":
                            return ce.s(V.$ms, 3, "0");
                          case "Z":
                            return oe;
                        }
                        return null;
                      })(ft) ||
                      oe.replace(":", "")
                    );
                  });
                }),
                (Z.utcOffset = function () {
                  return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
                }),
                (Z.diff = function (T, V, B) {
                  var re,
                    oe = this,
                    R = ce.p(V),
                    H = ue(T),
                    J = (H.utcOffset() - this.utcOffset()) * o,
                    ne = this - H,
                    me = function () {
                      return ce.m(oe, H);
                    };
                  switch (R) {
                    case w:
                      re = me() / 12;
                      break;
                    case v:
                      re = me();
                      break;
                    case S:
                      re = me() / 3;
                      break;
                    case y:
                      re = (ne - J) / 6048e5;
                      break;
                    case h:
                      re = (ne - J) / 864e5;
                      break;
                    case g:
                      re = ne / s;
                      break;
                    case m:
                      re = ne / o;
                      break;
                    case f:
                      re = ne / l;
                      break;
                    default:
                      re = ne;
                  }
                  return B ? re : ce.a(re);
                }),
                (Z.daysInMonth = function () {
                  return this.endOf(v).$D;
                }),
                (Z.$locale = function () {
                  return W[this.$L];
                }),
                (Z.locale = function (T, V) {
                  if (!T) return this.$L;
                  var B = this.clone(),
                    re = ie(T, V, !0);
                  return (re && (B.$L = re), B);
                }),
                (Z.clone = function () {
                  return ce.w(this.$d, this);
                }),
                (Z.toDate = function () {
                  return new Date(this.valueOf());
                }),
                (Z.toJSON = function () {
                  return this.isValid() ? this.toISOString() : null;
                }),
                (Z.toISOString = function () {
                  return this.$d.toISOString();
                }),
                (Z.toString = function () {
                  return this.$d.toUTCString();
                }),
                ee
              );
            })(),
            be = Ee.prototype;
          return (
            (ue.prototype = be),
            [
              ["$ms", c],
              ["$s", f],
              ["$m", m],
              ["$H", g],
              ["$W", h],
              ["$M", v],
              ["$y", w],
              ["$D", x],
            ].forEach(function (item) {
              be[item[1]] = function (Z) {
                return this.$g(Z, item[0], item[1]);
              };
            }),
            (ue.extend = function (ee, Z) {
              return (ee.$i || (ee(Z, Ee, ue), (ee.$i = !0)), ue);
            }),
            (ue.locale = ie),
            (ue.isDayjs = le),
            (ue.unix = function (ee) {
              return ue(1e3 * ee);
            }),
            (ue.en = W[U]),
            (ue.Ls = W),
            (ue.p = {}),
            ue
          );
        });
      })(_s)),
    _s.exports
  );
}
var Ow = Tw();
/* ---- i18next Internationalization Library ---- */
const Rd = ji(Ow),
  Oe = (n) => typeof n == "string",
  Ri = () => {
    let n, r;
    const l = new Promise((o, s) => {
      n = o;
      r = s;
    });
    return ((l.resolve = n), (l.reject = r), l);
  },
  vp = (n) => {
    return n == null ? "" : "" + n;
  },
  Cw = (n, r, l) => {
    n.forEach((item) => {
      if (r[item]) {
        l[item] = r[item];
      }
    });
  },
  Aw = /###/g,
  bp = (n) => {
    return n && n.indexOf("###") > -1 ? n.replace(Aw, ".") : n;
  },
  Sp = (n) => {
    return !n || Oe(n);
  },
  Li = (n, r, l) => {
    const o = Oe(r) ? r.split(".") : r;
    let s = 0;
    for (; s < o.length - 1; ) {
      if (Sp(n)) return {};
      const c = bp(o[s]);
      if (!n[c] && l) {
        n[c] = new l();
      }
      Object.prototype.hasOwnProperty.call(n, c) ? (n = n[c]) : (n = {});
      ++s;
    }
    return Sp(n)
      ? {}
      : {
          obj: n,
          k: bp(o[s]),
        };
  },
  Ep = (n, r, l) => {
    const { obj: o, k: s } = Li(n, r, Object);
    if (o !== void 0 || r.length === 1) {
      o[s] = l;
      return;
    }
    let c = r[r.length - 1],
      f = r.slice(0, r.length - 1),
      m = Li(n, f, Object);
    for (; m.obj === void 0 && f.length; ) {
      c = `${f[f.length - 1]}.${c}`;
      f = f.slice(0, f.length - 1);
      m = Li(n, f, Object);
      if (m?.obj && typeof m.obj[`${m.k}.${c}`] < "u") {
        m.obj = void 0;
      }
    }
    m.obj[`${m.k}.${c}`] = l;
  },
  Dw = (n, r, l, o) => {
    const { obj: s, k: c } = Li(n, r, Object);
    s[c] = s[c] || [];
    s[c].push(l);
  },
  Ds = (n, r) => {
    const { obj: l, k: o } = Li(n, r);
    if (l && Object.prototype.hasOwnProperty.call(l, o)) return l[o];
  },
  Lw = (n, r, l) => {
    const o = Ds(n, l);
    return o !== void 0 ? o : Ds(r, l);
  },
  Ov = (n, r, l) => {
    for (const o in r)
      if (o !== "__proto__" && o !== "constructor") {
        o in n
          ? Oe(n[o]) ||
            n[o] instanceof String ||
            Oe(r[o]) ||
            r[o] instanceof String
            ? l && (n[o] = r[o])
            : Ov(n[o], r[o], l)
          : (n[o] = r[o]);
      }
    return n;
  },
  al = (n) => n.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
var Nw = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};
const Mw = (n) => {
  return Oe(n) ? n.replace(/[&<>"'\/]/g, (r) => Nw[r]) : n;
};
class zw {
  constructor(r) {
    this.capacity = r;
    this.regExpMap = new Map();
    this.regExpQueue = [];
  }
  getRegExp(r) {
    const l = this.regExpMap.get(r);
    if (l !== void 0) return l;
    const o = new RegExp(r);
    return (
      this.regExpQueue.length === this.capacity &&
        this.regExpMap.delete(this.regExpQueue.shift()),
      this.regExpMap.set(r, o),
      this.regExpQueue.push(r),
      o
    );
  }
}
const kw = [" ", ",", "?", "!", ";"],
  jw = new zw(20),
  Uw = (n, r, l) => {
    r = r || "";
    l = l || "";
    const o = kw.filter((item) => r.indexOf(item) < 0 && l.indexOf(item) < 0);
    if (o.length === 0) return !0;
    const s = jw.getRegExp(
      `(${o.map((item) => (item === "?" ? "\\?" : item)).join("|")})`,
    );
    let c = !s.test(n);
    if (!c) {
      const f = n.indexOf(l);
      if (f > 0 && !s.test(n.substring(0, f))) {
        c = !0;
      }
    }
    return c;
  },
  ad = (n, r, l = ".") => {
    if (!n) return;
    if (n[r]) return Object.prototype.hasOwnProperty.call(n, r) ? n[r] : void 0;
    const o = r.split(l);
    let s = n;
    for (let c = 0; c < o.length; ) {
      if (!s || typeof s != "object") return;
      let f,
        m = "";
      for (let g = c; g < o.length; ++g)
        if ((g !== c && (m += l), (m += o[g]), (f = s[m]), f !== void 0)) {
          if (
            ["string", "number", "boolean"].indexOf(typeof f) > -1 &&
            g < o.length - 1
          )
            continue;
          c += g - c + 1;
          break;
        }
      s = f;
    }
    return s;
  },
  ki = (n) => n?.replace("_", "-"),
  Hw = {
    type: "logger",
    log(n) {
      this.output("log", n);
    },
    warn(n) {
      this.output("warn", n);
    },
    error(n) {
      this.output("error", n);
    },
    output(n, r) {
      console?.[n]?.apply?.(console, r);
    },
  };
class Ls {
  constructor(r, l = {}) {
    this.init(r, l);
  }
  init(r, l = {}) {
    this.prefix = l.prefix || "i18next:";
    this.logger = r || Hw;
    this.options = l;
    this.debug = l.debug;
  }
  log(...r) {
    return this.forward(r, "log", "", !0);
  }
  warn(...r) {
    return this.forward(r, "warn", "", !0);
  }
  error(...r) {
    return this.forward(r, "error", "");
  }
  deprecate(...r) {
    return this.forward(r, "warn", "WARNING DEPRECATED: ", !0);
  }
  forward(r, l, o, s) {
    return s && !this.debug
      ? null
      : (Oe(r[0]) && (r[0] = `${o}${this.prefix} ${r[0]}`), this.logger[l](r));
  }
  create(r) {
    return new Ls(this.logger, {
      prefix: `${this.prefix}:${r}:`,
      ...this.options,
    });
  }
  clone(r) {
    return (
      (r = r || this.options),
      (r.prefix = r.prefix || this.prefix),
      new Ls(this.logger, r)
    );
  }
}
var Vn = new Ls();
class Xs {
  constructor() {
    this.observers = {};
  }
  on(r, l) {
    return (
      r.split(" ").forEach((item) => {
        this.observers[item] || (this.observers[item] = new Map());
        const s = this.observers[item].get(l) || 0;
        this.observers[item].set(l, s + 1);
      }),
      this
    );
  }
  off(r, l) {
    if (this.observers[r]) {
      if (!l) {
        delete this.observers[r];
        return;
      }
      this.observers[r].delete(l);
    }
  }
  emit(r, ...l) {
    if (this.observers[r]) {
      Array.from(this.observers[r].entries()).forEach(([s, c]) => {
        for (let f = 0; f < c; f++) s(...l);
      });
    }
    if (this.observers["*"]) {
      Array.from(this.observers["*"].entries()).forEach(([s, c]) => {
        for (let f = 0; f < c; f++) s.apply(s, [r, ...l]);
      });
    }
  }
}
class xp extends Xs {
  constructor(
    r,
    l = {
      ns: ["translation"],
      defaultNS: "translation",
    },
  ) {
    super();
    this.data = r || {};
    this.options = l;
    if (this.options.keySeparator === void 0) {
      this.options.keySeparator = ".";
    }
    if (this.options.ignoreJSONStructure === void 0) {
      this.options.ignoreJSONStructure = !0;
    }
  }
  addNamespaces(r) {
    if (this.options.ns.indexOf(r) < 0) {
      this.options.ns.push(r);
    }
  }
  removeNamespaces(r) {
    const l = this.options.ns.indexOf(r);
    if (l > -1) {
      this.options.ns.splice(l, 1);
    }
  }
  getResource(r, l, o, s = {}) {
    const c =
        s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator,
      f =
        s.ignoreJSONStructure !== void 0
          ? s.ignoreJSONStructure
          : this.options.ignoreJSONStructure;
    let m;
    r.indexOf(".") > -1
      ? (m = r.split("."))
      : ((m = [r, l]),
        o &&
          (Array.isArray(o)
            ? m.push(...o)
            : Oe(o) && c
              ? m.push(...o.split(c))
              : m.push(o)));
    const g = Ds(this.data, m);
    return (
      !g &&
        !l &&
        !o &&
        r.indexOf(".") > -1 &&
        ((r = m[0]), (l = m[1]), (o = m.slice(2).join("."))),
      g || !f || !Oe(o) ? g : ad(this.data?.[r]?.[l], o, c)
    );
  }
  addResource(
    r,
    l,
    o,
    s,
    c = {
      silent: !1,
    },
  ) {
    const f =
      c.keySeparator !== void 0 ? c.keySeparator : this.options.keySeparator;
    let m = [r, l];
    if (o) {
      m = m.concat(f ? o.split(f) : o);
    }
    if (r.indexOf(".") > -1) {
      ((m = r.split(".")), (s = l), (l = m[1]));
    }
    this.addNamespaces(l);
    Ep(this.data, m, s);
    c.silent || this.emit("added", r, l, o, s);
  }
  addResources(
    r,
    l,
    o,
    s = {
      silent: !1,
    },
  ) {
    for (const c in o)
      if (Oe(o[c]) || Array.isArray(o[c])) {
        this.addResource(r, l, c, o[c], {
          silent: !0,
        });
      }
    s.silent || this.emit("added", r, l, o);
  }
  addResourceBundle(
    r,
    l,
    o,
    s,
    c,
    f = {
      silent: !1,
      skipCopy: !1,
    },
  ) {
    let m = [r, l];
    if (r.indexOf(".") > -1) {
      ((m = r.split(".")), (s = o), (o = l), (l = m[1]));
    }
    this.addNamespaces(l);
    let g = Ds(this.data, m) || {};
    f.skipCopy || (o = JSON.parse(JSON.stringify(o)));
    s
      ? Ov(g, o, c)
      : (g = {
          ...g,
          ...o,
        });
    Ep(this.data, m, g);
    f.silent || this.emit("added", r, l, o);
  }
  removeResourceBundle(r, l) {
    if (this.hasResourceBundle(r, l)) {
      delete this.data[r][l];
    }
    this.removeNamespaces(l);
    this.emit("removed", r, l);
  }
  hasResourceBundle(r, l) {
    return this.getResource(r, l) !== void 0;
  }
  getResourceBundle(r, l) {
    return (l || (l = this.options.defaultNS), this.getResource(r, l));
  }
  getDataByLanguage(r) {
    return this.data[r];
  }
  hasLanguageSomeTranslations(r) {
    const l = this.getDataByLanguage(r);
    return !!((l && Object.keys(l)) || []).find(
      (item) => l[item] && Object.keys(l[item]).length > 0,
    );
  }
  toJSON() {
    return this.data;
  }
}
var Cv = {
  processors: {},
  addPostProcessor(n) {
    this.processors[n.name] = n;
  },
  handle(n, r, l, o, s) {
    return (
      n.forEach((item) => {
        r = this.processors[item]?.process(r, l, o, s) ?? r;
      }),
      r
    );
  },
};
const Av = Symbol("i18next/PATH_KEY");
function Bw() {
  const n = [],
    r = Object.create(null);
  let l;
  return (
    (r.get = (o, s) => (
      l?.revoke?.(),
      s === Av ? n : (n.push(s), (l = Proxy.revocable(o, r)), l.proxy)
    )),
    Proxy.revocable(Object.create(null), r).proxy
  );
}
function rd(n, r) {
  const { [Av]: l } = n(Bw());
  return l.join(r?.keySeparator ?? ".");
}
const wp = {},
  _f = (n) => {
    return !Oe(n) && typeof n != "boolean" && typeof n != "number";
  };
class Ns extends Xs {
  constructor(r, l = {}) {
    super();
    Cw(
      [
        "resourceStore",
        "languageUtils",
        "pluralResolver",
        "interpolator",
        "backendConnector",
        "i18nFormat",
        "utils",
      ],
      r,
      this,
    );
    this.options = l;
    if (this.options.keySeparator === void 0) {
      this.options.keySeparator = ".";
    }
    this.logger = Vn.create("translator");
  }
  changeLanguage(r) {
    if (r) {
      this.language = r;
    }
  }
  exists(
    r,
    l = {
      interpolation: {},
    },
  ) {
    const o = {
      ...l,
    };
    if (r == null) return !1;
    const s = this.resolve(r, o);
    if (s?.res === void 0) return !1;
    const c = _f(s.res);
    return !(o.returnObjects === !1 && c);
  }
  extractFromKey(r, l) {
    let o = l.nsSeparator !== void 0 ? l.nsSeparator : this.options.nsSeparator;
    if (o === void 0) {
      o = ":";
    }
    const s =
      l.keySeparator !== void 0 ? l.keySeparator : this.options.keySeparator;
    let c = l.ns || this.options.defaultNS || [];
    const f = o && r.indexOf(o) > -1,
      m =
        !this.options.userDefinedKeySeparator &&
        !l.keySeparator &&
        !this.options.userDefinedNsSeparator &&
        !l.nsSeparator &&
        !Uw(r, o, s);
    if (f && !m) {
      const g = r.match(this.interpolator.nestingRegexp);
      if (g && g.length > 0)
        return {
          key: r,
          namespaces: Oe(c) ? [c] : c,
        };
      const h = r.split(o);
      if (o !== s || (o === s && this.options.ns.indexOf(h[0]) > -1)) {
        c = h.shift();
      }
      r = h.join(s);
    }
    return {
      key: r,
      namespaces: Oe(c) ? [c] : c,
    };
  }
  translate(r, l, o) {
    let s =
      typeof l == "object"
        ? {
            ...l,
          }
        : l;
    if (
      (typeof s != "object" &&
        this.options.overloadTranslationOptionHandler &&
        (s = this.options.overloadTranslationOptionHandler(arguments)),
      typeof s == "object" &&
        (s = {
          ...s,
        }),
      s || (s = {}),
      r == null)
    )
      return "";
    if (typeof r == "function") {
      r = rd(r, {
        ...this.options,
        ...s,
      });
    }
    Array.isArray(r) || (r = [String(r)]);
    const c =
        s.returnDetails !== void 0
          ? s.returnDetails
          : this.options.returnDetails,
      f =
        s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator,
      { key: m, namespaces: g } = this.extractFromKey(r[r.length - 1], s),
      h = g[g.length - 1];
    let y = s.nsSeparator !== void 0 ? s.nsSeparator : this.options.nsSeparator;
    if (y === void 0) {
      y = ":";
    }
    const v = s.lng || this.language,
      S = s.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
    if (v?.toLowerCase() === "cimode") {
      if (S) {
        return c
          ? {
              res: `${h}${y}${m}`,
              usedKey: m,
              exactUsedKey: m,
              usedLng: v,
              usedNS: h,
              usedParams: this.getUsedParamsDetails(s),
            }
          : `${h}${y}${m}`;
      }
      if (c) {
        return {
          res: m,
          usedKey: m,
          exactUsedKey: m,
          usedLng: v,
          usedNS: h,
          usedParams: this.getUsedParamsDetails(s),
        };
      }
      return m;
    }
    const w = this.resolve(r, s);
    let x = w?.res;
    const _ = w?.usedKey || m,
      A = w?.exactUsedKey || m,
      z = ["[object Number]", "[object Function]", "[object RegExp]"],
      M = s.joinArrays !== void 0 ? s.joinArrays : this.options.joinArrays,
      F = !this.i18nFormat || this.i18nFormat.handleAsObject,
      te = s.count !== void 0 && !Oe(s.count),
      U = Ns.hasDefaultValue(s),
      W = te ? this.pluralResolver.getSuffix(v, s.count, s) : "",
      D =
        s.ordinal && te
          ? this.pluralResolver.getSuffix(v, s.count, {
              ordinal: !1,
            })
          : "",
      le = te && !s.ordinal && s.count === 0,
      ie =
        (le && s[`defaultValue${this.options.pluralSeparator}zero`]) ||
        s[`defaultValue${W}`] ||
        s[`defaultValue${D}`] ||
        s.defaultValue;
    let ue = x;
    if (F && !x && U) {
      ue = ie;
    }
    const ce = _f(ue),
      Ee = Object.prototype.toString.apply(ue);
    if (F && ue && ce && z.indexOf(Ee) < 0 && !(Oe(M) && Array.isArray(ue))) {
      if (!s.returnObjects && !this.options.returnObjects) {
        this.options.returnedObjectHandler ||
          this.logger.warn(
            "accessing an object - but returnObjects options is not enabled!",
          );
        const be = this.options.returnedObjectHandler
          ? this.options.returnedObjectHandler(_, ue, {
              ...s,
              ns: g,
            })
          : `key '${m} (${this.language})' returned an object instead of string.`;
        return c
          ? ((w.res = be), (w.usedParams = this.getUsedParamsDetails(s)), w)
          : be;
      }
      if (f) {
        const be = Array.isArray(ue),
          ee = be ? [] : {},
          Z = be ? A : _;
        for (const T in ue)
          if (Object.prototype.hasOwnProperty.call(ue, T)) {
            const V = `${Z}${f}${T}`;
            U && !x
              ? (ee[T] = this.translate(V, {
                  ...s,
                  defaultValue: _f(ie) ? ie[T] : void 0,
                  joinArrays: !1,
                  ns: g,
                }))
              : (ee[T] = this.translate(V, {
                  ...s,
                  joinArrays: !1,
                  ns: g,
                }));
            if (ee[T] === V) {
              ee[T] = ue[T];
            }
          }
        x = ee;
      }
    } else if (F && Oe(M) && Array.isArray(x)) {
      x = x.join(M);
      if (x) {
        x = this.extendTranslation(x, r, s, o);
      }
    } else {
      let be = !1,
        ee = !1;
      if (!this.isValidLookup(x) && U) {
        ((be = !0), (x = ie));
      }
      this.isValidLookup(x) || ((ee = !0), (x = m));
      const T =
          (s.missingKeyNoValueFallbackToKey ||
            this.options.missingKeyNoValueFallbackToKey) &&
          ee
            ? void 0
            : x,
        V = U && ie !== x && this.options.updateMissing;
      if (ee || be || V) {
        if (
          (this.logger.log(V ? "updateKey" : "missingKey", v, h, m, V ? ie : x),
          f)
        ) {
          const R = this.resolve(m, {
            ...s,
            keySeparator: !1,
          });
          if (R && R.res) {
            this.logger.warn(
              "Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.",
            );
          }
        }
        let B = [];
        const re = this.languageUtils.getFallbackCodes(
          this.options.fallbackLng,
          s.lng || this.language,
        );
        if (this.options.saveMissingTo === "fallback" && re && re[0])
          for (let R = 0; R < re.length; R++) B.push(re[R]);
        else
          this.options.saveMissingTo === "all"
            ? (B = this.languageUtils.toResolveHierarchy(
                s.lng || this.language,
              ))
            : B.push(s.lng || this.language);
        const oe = (R, H, J) => {
          const ne = U && J !== x ? J : T;
          this.options.missingKeyHandler
            ? this.options.missingKeyHandler(R, h, H, ne, V, s)
            : this.backendConnector?.saveMissing &&
              this.backendConnector.saveMissing(R, h, H, ne, V, s);
          this.emit("missingKey", R, h, H, x);
        };
        if (this.options.saveMissing) {
          this.options.saveMissingPlurals && te
            ? B.forEach((item) => {
                const H = this.pluralResolver.getSuffixes(item, s);
                if (
                  le &&
                  s[`defaultValue${this.options.pluralSeparator}zero`] &&
                  H.indexOf(`${this.options.pluralSeparator}zero`) < 0
                ) {
                  H.push(`${this.options.pluralSeparator}zero`);
                }
                H.forEach((item) => {
                  oe([item], m + item, s[`defaultValue${item}`] || ie);
                });
              })
            : oe(B, m, ie);
        }
      }
      x = this.extendTranslation(x, r, s, w, o);
      if (ee && x === m && this.options.appendNamespaceToMissingKey) {
        x = `${h}${y}${m}`;
      }
      if ((ee || be) && this.options.parseMissingKeyHandler) {
        x = this.options.parseMissingKeyHandler(
          this.options.appendNamespaceToMissingKey ? `${h}${y}${m}` : m,
          be ? x : void 0,
          s,
        );
      }
    }
    return c
      ? ((w.res = x), (w.usedParams = this.getUsedParamsDetails(s)), w)
      : x;
  }
  extendTranslation(r, l, o, s, c) {
    if (this.i18nFormat?.parse)
      r = this.i18nFormat.parse(
        r,
        {
          ...this.options.interpolation.defaultVariables,
          ...o,
        },
        o.lng || this.language || s.usedLng,
        s.usedNS,
        s.usedKey,
        {
          resolved: s,
        },
      );
    else if (!o.skipInterpolation) {
      if (o.interpolation) {
        this.interpolator.init({
          ...o,
          interpolation: {
            ...this.options.interpolation,
            ...o.interpolation,
          },
        });
      }
      const g =
        Oe(r) &&
        (o?.interpolation?.skipOnVariables !== void 0
          ? o.interpolation.skipOnVariables
          : this.options.interpolation.skipOnVariables);
      let h;
      if (g) {
        const v = r.match(this.interpolator.nestingRegexp);
        h = v && v.length;
      }
      let y = o.replace && !Oe(o.replace) ? o.replace : o;
      if (
        (this.options.interpolation.defaultVariables &&
          (y = {
            ...this.options.interpolation.defaultVariables,
            ...y,
          }),
        (r = this.interpolator.interpolate(
          r,
          y,
          o.lng || this.language || s.usedLng,
          o,
        )),
        g)
      ) {
        const v = r.match(this.interpolator.nestingRegexp),
          S = v && v.length;
        if (h < S) {
          o.nest = !1;
        }
      }
      if (!o.lng && s && s.res) {
        o.lng = this.language || s.usedLng;
      }
      if (o.nest !== !1) {
        r = this.interpolator.nest(
          r,
          (...v) =>
            c?.[0] === v[0] && !o.context
              ? (this.logger.warn(
                  `It seems you are nesting recursively key: ${v[0]} in key: ${l[0]}`,
                ),
                null)
              : this.translate(...v, l),
          o,
        );
      }
      if (o.interpolation) {
        this.interpolator.reset();
      }
    }
    const f = o.postProcess || this.options.postProcess,
      m = Oe(f) ? [f] : f;
    return (
      r != null &&
        m?.length &&
        o.applyPostProcessor !== !1 &&
        (r = Cv.handle(
          m,
          r,
          l,
          this.options && this.options.postProcessPassResolved
            ? {
                i18nResolved: {
                  ...s,
                  usedParams: this.getUsedParamsDetails(o),
                },
                ...o,
              }
            : o,
          this,
        )),
      r
    );
  }
  resolve(r, l = {}) {
    let o, s, c, f, m;
    return (
      Oe(r) && (r = [r]),
      r.forEach((item) => {
        if (this.isValidLookup(o)) return;
        const h = this.extractFromKey(item, l),
          y = h.key;
        s = y;
        let v = h.namespaces;
        if (this.options.fallbackNS) {
          v = v.concat(this.options.fallbackNS);
        }
        const S = l.count !== void 0 && !Oe(l.count),
          w = S && !l.ordinal && l.count === 0,
          x =
            l.context !== void 0 &&
            (Oe(l.context) || typeof l.context == "number") &&
            l.context !== "",
          _ = l.lngs
            ? l.lngs
            : this.languageUtils.toResolveHierarchy(
                l.lng || this.language,
                l.fallbackLng,
              );
        v.forEach((item) => {
          this.isValidLookup(o) ||
            ((m = item),
            !wp[`${_[0]}-${item}`] &&
              this.utils?.hasLoadedNamespace &&
              !this.utils?.hasLoadedNamespace(m) &&
              ((wp[`${_[0]}-${item}`] = !0),
              this.logger.warn(
                `key "${s}" for languages "${_.join(", ")}" won't get resolved as namespace "${m}" was not yet loaded`,
                "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!",
              )),
            _.forEach((item) => {
              if (this.isValidLookup(o)) return;
              f = item;
              const M = [y];
              if (this.i18nFormat?.addLookupKeys)
                this.i18nFormat.addLookupKeys(M, y, item, item, l);
              else {
                let te;
                if (S) {
                  te = this.pluralResolver.getSuffix(item, l.count, l);
                }
                const U = `${this.options.pluralSeparator}zero`,
                  W = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
                if (
                  (S &&
                    (l.ordinal &&
                      te.indexOf(W) === 0 &&
                      M.push(y + te.replace(W, this.options.pluralSeparator)),
                    M.push(y + te),
                    w && M.push(y + U)),
                  x)
                ) {
                  const D = `${y}${this.options.contextSeparator || "_"}${l.context}`;
                  M.push(D);
                  if (S) {
                    (l.ordinal &&
                      te.indexOf(W) === 0 &&
                      M.push(D + te.replace(W, this.options.pluralSeparator)),
                      M.push(D + te),
                      w && M.push(D + U));
                  }
                }
              }
              let F;
              for (; (F = M.pop()); )
                this.isValidLookup(o) ||
                  ((c = F), (o = this.getResource(item, item, F, l)));
            }));
        });
      }),
      {
        res: o,
        usedKey: s,
        exactUsedKey: c,
        usedLng: f,
        usedNS: m,
      }
    );
  }
  isValidLookup(r) {
    return (
      r !== void 0 &&
      !(!this.options.returnNull && r === null) &&
      !(!this.options.returnEmptyString && r === "")
    );
  }
  getResource(r, l, o, s = {}) {
    return this.i18nFormat?.getResource
      ? this.i18nFormat.getResource(r, l, o, s)
      : this.resourceStore.getResource(r, l, o, s);
  }
  getUsedParamsDetails(r = {}) {
    const l = [
        "defaultValue",
        "ordinal",
        "context",
        "replace",
        "lng",
        "lngs",
        "fallbackLng",
        "ns",
        "keySeparator",
        "nsSeparator",
        "returnObjects",
        "returnDetails",
        "joinArrays",
        "postProcess",
        "interpolation",
      ],
      o = r.replace && !Oe(r.replace);
    let s = o ? r.replace : r;
    if (
      (o && typeof r.count < "u" && (s.count = r.count),
      this.options.interpolation.defaultVariables &&
        (s = {
          ...this.options.interpolation.defaultVariables,
          ...s,
        }),
      !o)
    ) {
      s = {
        ...s,
      };
      for (const c of l) delete s[c];
    }
    return s;
  }
  static hasDefaultValue(r) {
    const l = "defaultValue";
    for (const o in r)
      if (
        Object.prototype.hasOwnProperty.call(r, o) &&
        l === o.substring(0, l.length) &&
        r[o] !== void 0
      )
        return !0;
    return !1;
  }
}
class Rp {
  constructor(r) {
    this.options = r;
    this.supportedLngs = this.options.supportedLngs || !1;
    this.logger = Vn.create("languageUtils");
  }
  getScriptPartFromCode(r) {
    if (((r = ki(r)), !r || r.indexOf("-") < 0)) return null;
    const l = r.split("-");
    return l.length === 2 || (l.pop(), l[l.length - 1].toLowerCase() === "x")
      ? null
      : this.formatLanguageCode(l.join("-"));
  }
  getLanguagePartFromCode(r) {
    if (((r = ki(r)), !r || r.indexOf("-") < 0)) return r;
    const l = r.split("-");
    return this.formatLanguageCode(l[0]);
  }
  formatLanguageCode(r) {
    if (Oe(r) && r.indexOf("-") > -1) {
      let l;
      try {
        l = Intl.getCanonicalLocales(r)[0];
      } catch {}
      return (
        l && this.options.lowerCaseLng && (l = l.toLowerCase()),
        l || (this.options.lowerCaseLng ? r.toLowerCase() : r)
      );
    }
    return this.options.cleanCode || this.options.lowerCaseLng
      ? r.toLowerCase()
      : r;
  }
  isSupportedCode(r) {
    return (
      (this.options.load === "languageOnly" ||
        this.options.nonExplicitSupportedLngs) &&
        (r = this.getLanguagePartFromCode(r)),
      !this.supportedLngs ||
        !this.supportedLngs.length ||
        this.supportedLngs.indexOf(r) > -1
    );
  }
  getBestMatchFromCodes(r) {
    if (!r) return null;
    let l;
    return (
      r.forEach((item) => {
        if (l) return;
        const s = this.formatLanguageCode(item);
        if (!this.options.supportedLngs || this.isSupportedCode(s)) {
          l = s;
        }
      }),
      !l &&
        this.options.supportedLngs &&
        r.forEach((item) => {
          if (l) return;
          const s = this.getScriptPartFromCode(item);
          if (this.isSupportedCode(s)) return (l = s);
          const c = this.getLanguagePartFromCode(item);
          if (this.isSupportedCode(c)) return (l = c);
          l = this.options.supportedLngs.find((item) => {
            if (item === c) return item;
            if (
              !(item.indexOf("-") < 0 && c.indexOf("-") < 0) &&
              ((item.indexOf("-") > 0 &&
                c.indexOf("-") < 0 &&
                item.substring(0, item.indexOf("-")) === c) ||
                (item.indexOf(c) === 0 && c.length > 1))
            )
              return item;
          });
        }),
      l || (l = this.getFallbackCodes(this.options.fallbackLng)[0]),
      l
    );
  }
  getFallbackCodes(r, l) {
    if (!r) return [];
    if (
      (typeof r == "function" && (r = r(l)),
      Oe(r) && (r = [r]),
      Array.isArray(r))
    )
      return r;
    if (!l) return r.default || [];
    let o = r[l];
    return (
      o || (o = r[this.getScriptPartFromCode(l)]),
      o || (o = r[this.formatLanguageCode(l)]),
      o || (o = r[this.getLanguagePartFromCode(l)]),
      o || (o = r.default),
      o || []
    );
  }
  toResolveHierarchy(r, l) {
    const o = this.getFallbackCodes(
        (l === !1 ? [] : l) || this.options.fallbackLng || [],
        r,
      ),
      s = [],
      c = (f) => {
        if (f) {
          this.isSupportedCode(f)
            ? s.push(f)
            : this.logger.warn(
                `rejecting language code not found in supportedLngs: ${f}`,
              );
        }
      };
    return (
      Oe(r) && (r.indexOf("-") > -1 || r.indexOf("_") > -1)
        ? (this.options.load !== "languageOnly" &&
            c(this.formatLanguageCode(r)),
          this.options.load !== "languageOnly" &&
            this.options.load !== "currentOnly" &&
            c(this.getScriptPartFromCode(r)),
          this.options.load !== "currentOnly" &&
            c(this.getLanguagePartFromCode(r)))
        : Oe(r) && c(this.formatLanguageCode(r)),
      o.forEach((item) => {
        if (s.indexOf(item) < 0) {
          c(this.formatLanguageCode(item));
        }
      }),
      s
    );
  }
}
const _p = {
    zero: 0,
    one: 1,
    two: 2,
    few: 3,
    many: 4,
    other: 5,
  },
  Tp = {
    select: (n) => (n === 1 ? "one" : "other"),
    resolvedOptions: () => ({
      pluralCategories: ["one", "other"],
    }),
  };
class $w {
  constructor(r, l = {}) {
    this.languageUtils = r;
    this.options = l;
    this.logger = Vn.create("pluralResolver");
    this.pluralRulesCache = {};
  }
  addRule(r, l) {
    this.rules[r] = l;
  }
  clearCache() {
    this.pluralRulesCache = {};
  }
  getRule(r, l = {}) {
    const o = ki(r === "dev" ? "en" : r),
      s = l.ordinal ? "ordinal" : "cardinal",
      c = JSON.stringify({
        cleanedCode: o,
        type: s,
      });
    if (c in this.pluralRulesCache) return this.pluralRulesCache[c];
    let f;
    try {
      f = new Intl.PluralRules(o, {
        type: s,
      });
    } catch {
      if (!Intl)
        return (
          this.logger.error("No Intl support, please use an Intl polyfill!"),
          Tp
        );
      if (!r.match(/-|_/)) return Tp;
      const g = this.languageUtils.getLanguagePartFromCode(r);
      f = this.getRule(g, l);
    }
    return ((this.pluralRulesCache[c] = f), f);
  }
  needsPlural(r, l = {}) {
    let o = this.getRule(r, l);
    return (
      o || (o = this.getRule("dev", l)),
      o?.resolvedOptions().pluralCategories.length > 1
    );
  }
  getPluralFormsOfKey(r, l, o = {}) {
    return this.getSuffixes(r, o).map((item) => `${l}${item}`);
  }
  getSuffixes(r, l = {}) {
    let o = this.getRule(r, l);
    return (
      o || (o = this.getRule("dev", l)),
      o
        ? o
            .resolvedOptions()
            .pluralCategories.sort((a, b) => _p[a] - _p[b])
            .map(
              (item) =>
                `${this.options.prepend}${l.ordinal ? `ordinal${this.options.prepend}` : ""}${item}`,
            )
        : []
    );
  }
  getSuffix(r, l, o = {}) {
    const s = this.getRule(r, o);
    return s
      ? `${this.options.prepend}${o.ordinal ? `ordinal${this.options.prepend}` : ""}${s.select(l)}`
      : (this.logger.warn(`no plural rule found for: ${r}`),
        this.getSuffix("dev", l, o));
  }
}
const Op = (n, r, l, o = ".", s = !0) => {
    let c = Lw(n, r, l);
    return (
      !c &&
        s &&
        Oe(l) &&
        ((c = ad(n, l, o)), c === void 0 && (c = ad(r, l, o))),
      c
    );
  },
  Tf = (n) => n.replace(/\$/g, "$$$$");
class Cp {
  constructor(r = {}) {
    this.logger = Vn.create("interpolator");
    this.options = r;
    this.format = r?.interpolation?.format || ((l) => l);
    this.init(r);
  }
  init(r = {}) {
    r.interpolation ||
      (r.interpolation = {
        escapeValue: !0,
      });
    const {
      escape: l,
      escapeValue: o,
      useRawValueToEscape: s,
      prefix: c,
      prefixEscaped: f,
      suffix: m,
      suffixEscaped: g,
      formatSeparator: h,
      unescapeSuffix: y,
      unescapePrefix: v,
      nestingPrefix: S,
      nestingPrefixEscaped: w,
      nestingSuffix: x,
      nestingSuffixEscaped: _,
      nestingOptionsSeparator: A,
      maxReplaces: z,
      alwaysFormat: M,
    } = r.interpolation;
    this.escape = l !== void 0 ? l : Mw;
    this.escapeValue = o !== void 0 ? o : !0;
    this.useRawValueToEscape = s !== void 0 ? s : !1;
    this.prefix = c ? al(c) : f || "{{";
    this.suffix = m ? al(m) : g || "}}";
    this.formatSeparator = h || ",";
    this.unescapePrefix = y ? "" : v || "-";
    this.unescapeSuffix = this.unescapePrefix ? "" : y || "";
    this.nestingPrefix = S ? al(S) : w || al("$t(");
    this.nestingSuffix = x ? al(x) : _ || al(")");
    this.nestingOptionsSeparator = A || ",";
    this.maxReplaces = z || 1e3;
    this.alwaysFormat = M !== void 0 ? M : !1;
    this.resetRegExp();
  }
  reset() {
    if (this.options) {
      this.init(this.options);
    }
  }
  resetRegExp() {
    const r = (l, o) => {
      return l?.source === o ? ((l.lastIndex = 0), l) : new RegExp(o, "g");
    };
    this.regexp = r(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
    this.regexpUnescape = r(
      this.regexpUnescape,
      `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`,
    );
    this.nestingRegexp = r(
      this.nestingRegexp,
      `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`,
    );
  }
  interpolate(r, l, o, s) {
    let c, f, m;
    const g =
        (this.options &&
          this.options.interpolation &&
          this.options.interpolation.defaultVariables) ||
        {},
      h = (w) => {
        if (w.indexOf(this.formatSeparator) < 0) {
          const z = Op(
            l,
            g,
            w,
            this.options.keySeparator,
            this.options.ignoreJSONStructure,
          );
          return this.alwaysFormat
            ? this.format(z, void 0, o, {
                ...s,
                ...l,
                interpolationkey: w,
              })
            : z;
        }
        const x = w.split(this.formatSeparator),
          _ = x.shift().trim(),
          A = x.join(this.formatSeparator).trim();
        return this.format(
          Op(
            l,
            g,
            _,
            this.options.keySeparator,
            this.options.ignoreJSONStructure,
          ),
          A,
          o,
          {
            ...s,
            ...l,
            interpolationkey: _,
          },
        );
      };
    this.resetRegExp();
    const y =
        s?.missingInterpolationHandler ||
        this.options.missingInterpolationHandler,
      v =
        s?.interpolation?.skipOnVariables !== void 0
          ? s.interpolation.skipOnVariables
          : this.options.interpolation.skipOnVariables;
    return (
      [
        {
          regex: this.regexpUnescape,
          safeValue: (w) => Tf(w),
        },
        {
          regex: this.regexp,
          safeValue: (w) => (this.escapeValue ? Tf(this.escape(w)) : Tf(w)),
        },
      ].forEach((item) => {
        for (m = 0; (c = item.regex.exec(r)); ) {
          const x = c[1].trim();
          if (((f = h(x)), f === void 0)) {
            if (typeof y == "function") {
              const A = y(r, c, s);
              f = Oe(A) ? A : "";
            } else if (s && Object.prototype.hasOwnProperty.call(s, x)) f = "";
            else if (v) {
              f = c[0];
              continue;
            } else {
              this.logger.warn(
                `missed to pass in variable ${x} for interpolating ${r}`,
              );
              f = "";
            }
          } else if (!Oe(f) && !this.useRawValueToEscape) {
            f = vp(f);
          }
          const _ = item.safeValue(f);
          if (
            ((r = r.replace(c[0], _)),
            v
              ? ((item.regex.lastIndex += f.length),
                (item.regex.lastIndex -= c[0].length))
              : (item.regex.lastIndex = 0),
            m++,
            m >= this.maxReplaces)
          )
            break;
        }
      }),
      r
    );
  }
  nest(r, l, o = {}) {
    let s, c, f;
    const m = (g, h) => {
      const y = this.nestingOptionsSeparator;
      if (g.indexOf(y) < 0) return g;
      const v = g.split(new RegExp(`${y}[ ]*{`));
      let S = `{${v[1]}`;
      g = v[0];
      S = this.interpolate(S, f);
      const w = S.match(/'/g),
        x = S.match(/"/g);
      if (((w?.length ?? 0) % 2 === 0 && !x) || x.length % 2 !== 0) {
        S = S.replace(/'/g, '"');
      }
      try {
        f = JSON.parse(S);
        if (h) {
          f = {
            ...h,
            ...f,
          };
        }
      } catch (_) {
        return (
          this.logger.warn(
            `failed parsing options string in nesting for key ${g}`,
            _,
          ),
          `${g}${y}${S}`
        );
      }
      return (
        f.defaultValue &&
          f.defaultValue.indexOf(this.prefix) > -1 &&
          delete f.defaultValue,
        g
      );
    };
    for (; (s = this.nestingRegexp.exec(r)); ) {
      let g = [];
      f = {
        ...o,
      };
      f = f.replace && !Oe(f.replace) ? f.replace : f;
      f.applyPostProcessor = !1;
      delete f.defaultValue;
      const h = /{.*}/.test(s[1])
        ? s[1].lastIndexOf("}") + 1
        : s[1].indexOf(this.formatSeparator);
      if (
        (h !== -1 &&
          ((g = s[1]
            .slice(h)
            .split(this.formatSeparator)
            .map((item) => item.trim())
            .filter(Boolean)),
          (s[1] = s[1].slice(0, h))),
        (c = l(m.call(this, s[1].trim(), f), f)),
        c && s[0] === r && !Oe(c))
      )
        return c;
      Oe(c) || (c = vp(c));
      c ||
        (this.logger.warn(`missed to resolve ${s[1]} for nesting ${r}`),
        (c = ""));
      if (g.length) {
        c = g.reduce(
          (item, acc) =>
            this.format(item, acc, o.lng, {
              ...o,
              interpolationkey: s[1].trim(),
            }),
          c.trim(),
        );
      }
      r = r.replace(s[0], c);
      this.regexp.lastIndex = 0;
    }
    return r;
  }
}
const qw = (n) => {
    let r = n.toLowerCase().trim();
    const l = {};
    if (n.indexOf("(") > -1) {
      const o = n.split("(");
      r = o[0].toLowerCase().trim();
      const s = o[1].substring(0, o[1].length - 1);
      r === "currency" && s.indexOf(":") < 0
        ? l.currency || (l.currency = s.trim())
        : r === "relativetime" && s.indexOf(":") < 0
          ? l.range || (l.range = s.trim())
          : s.split(";").forEach((item) => {
              if (item) {
                const [m, ...g] = item.split(":"),
                  h = g
                    .join(":")
                    .trim()
                    .replace(/^'+|'+$/g, ""),
                  y = m.trim();
                l[y] || (l[y] = h);
                if (h === "false") {
                  l[y] = !1;
                }
                if (h === "true") {
                  l[y] = !0;
                }
                isNaN(h) || (l[y] = parseInt(h, 10));
              }
            });
    }
    return {
      formatName: r,
      formatOptions: l,
    };
  },
  Ap = (n) => {
    const r = {};
    return (l, o, s) => {
      let c = s;
      if (
        s &&
        s.interpolationkey &&
        s.formatParams &&
        s.formatParams[s.interpolationkey] &&
        s[s.interpolationkey]
      ) {
        c = {
          ...c,
          [s.interpolationkey]: void 0,
        };
      }
      const f = o + JSON.stringify(c);
      let m = r[f];
      return (m || ((m = n(ki(o), s)), (r[f] = m)), m(l));
    };
  },
  Vw = (n) => (r, l, o) => n(ki(l), o)(r);
class Yw {
  constructor(r = {}) {
    this.logger = Vn.create("formatter");
    this.options = r;
    this.init(r);
  }
  init(
    r,
    l = {
      interpolation: {},
    },
  ) {
    this.formatSeparator = l.interpolation.formatSeparator || ",";
    const o = l.cacheInBuiltFormats ? Ap : Vw;
    this.formats = {
      number: o((s, c) => {
        const f = new Intl.NumberFormat(s, {
          ...c,
        });
        return (m) => f.format(m);
      }),
      currency: o((s, c) => {
        const f = new Intl.NumberFormat(s, {
          ...c,
          style: "currency",
        });
        return (m) => f.format(m);
      }),
      datetime: o((s, c) => {
        const f = new Intl.DateTimeFormat(s, {
          ...c,
        });
        return (m) => f.format(m);
      }),
      relativetime: o((s, c) => {
        const f = new Intl.RelativeTimeFormat(s, {
          ...c,
        });
        return (m) => f.format(m, c.range || "day");
      }),
      list: o((s, c) => {
        const f = new Intl.ListFormat(s, {
          ...c,
        });
        return (m) => f.format(m);
      }),
    };
  }
  add(r, l) {
    this.formats[r.toLowerCase().trim()] = l;
  }
  addCached(r, l) {
    this.formats[r.toLowerCase().trim()] = Ap(l);
  }
  format(r, l, o, s = {}) {
    const c = l.split(this.formatSeparator);
    if (
      c.length > 1 &&
      c[0].indexOf("(") > 1 &&
      c[0].indexOf(")") < 0 &&
      c.find((item) => item.indexOf(")") > -1)
    ) {
      const m = c.findIndex((g) => g.indexOf(")") > -1);
      c[0] = [c[0], ...c.splice(1, m)].join(this.formatSeparator);
    }
    return c.reduce((item, acc) => {
      const { formatName: h, formatOptions: y } = qw(acc);
      if (this.formats[h]) {
        let v = item;
        try {
          const S = s?.formatParams?.[s.interpolationkey] || {},
            w = S.locale || S.lng || s.locale || s.lng || o;
          v = this.formats[h](item, w, {
            ...y,
            ...s,
            ...S,
          });
        } catch (S) {
          this.logger.warn(S);
        }
        return v;
      } else this.logger.warn(`there was no format function for ${h}`);
      return item;
    }, r);
  }
}
const Gw = (n, r) => {
  if (n.pending[r] !== void 0) {
    (delete n.pending[r], n.pendingCount--);
  }
};
class Fw extends Xs {
  constructor(r, l, o, s = {}) {
    super();
    this.backend = r;
    this.store = l;
    this.services = o;
    this.languageUtils = o.languageUtils;
    this.options = s;
    this.logger = Vn.create("backendConnector");
    this.waitingReads = [];
    this.maxParallelReads = s.maxParallelReads || 10;
    this.readingCalls = 0;
    this.maxRetries = s.maxRetries >= 0 ? s.maxRetries : 5;
    this.retryTimeout = s.retryTimeout >= 1 ? s.retryTimeout : 350;
    this.state = {};
    this.queue = [];
    this.backend?.init?.(o, s.backend, s);
  }
  queueLoad(r, l, o, s) {
    const c = {},
      f = {},
      m = {},
      g = {};
    return (
      r.forEach((item) => {
        let y = !0;
        l.forEach((item) => {
          const S = `${item}|${item}`;
          !o.reload && this.store.hasResourceBundle(item, item)
            ? (this.state[S] = 2)
            : this.state[S] < 0 ||
              (this.state[S] === 1
                ? f[S] === void 0 && (f[S] = !0)
                : ((this.state[S] = 1),
                  (y = !1),
                  f[S] === void 0 && (f[S] = !0),
                  c[S] === void 0 && (c[S] = !0),
                  g[item] === void 0 && (g[item] = !0)));
        });
        y || (m[item] = !0);
      }),
      (Object.keys(c).length || Object.keys(f).length) &&
        this.queue.push({
          pending: f,
          pendingCount: Object.keys(f).length,
          loaded: {},
          errors: [],
          callback: s,
        }),
      {
        toLoad: Object.keys(c),
        pending: Object.keys(f),
        toLoadLanguages: Object.keys(m),
        toLoadNamespaces: Object.keys(g),
      }
    );
  }
  loaded(r, l, o) {
    const s = r.split("|"),
      c = s[0],
      f = s[1];
    if (l) {
      this.emit("failedLoading", c, f, l);
    }
    if (!l && o) {
      this.store.addResourceBundle(c, f, o, void 0, void 0, {
        skipCopy: !0,
      });
    }
    this.state[r] = l ? -1 : 2;
    if (l && o) {
      this.state[r] = 0;
    }
    const m = {};
    this.queue.forEach((item) => {
      Dw(item.loaded, [c], f);
      Gw(item, r);
      if (l) {
        item.errors.push(l);
      }
      if (item.pendingCount === 0 && !item.done) {
        (Object.keys(item.loaded).forEach((item) => {
          m[item] || (m[item] = {});
          const y = item.loaded[item];
          if (y.length) {
            y.forEach((item) => {
              if (m[item][item] === void 0) {
                m[item][item] = !0;
              }
            });
          }
        }),
          (item.done = !0),
          item.errors.length ? item.callback(item.errors) : item.callback());
      }
    });
    this.emit("loaded", m);
    this.queue = this.queue.filter((item) => !item.done);
  }
  read(r, l, o, s = 0, c = this.retryTimeout, f) {
    if (!r.length) return f(null, {});
    if (this.readingCalls >= this.maxParallelReads) {
      this.waitingReads.push({
        lng: r,
        ns: l,
        fcName: o,
        tried: s,
        wait: c,
        callback: f,
      });
      return;
    }
    this.readingCalls++;
    const m = (h, y) => {
        if ((this.readingCalls--, this.waitingReads.length > 0)) {
          const v = this.waitingReads.shift();
          this.read(v.lng, v.ns, v.fcName, v.tried, v.wait, v.callback);
        }
        if (h && y && s < this.maxRetries) {
          setTimeout(() => {
            this.read.call(this, r, l, o, s + 1, c * 2, f);
          }, c);
          return;
        }
        f(h, y);
      },
      g = this.backend[o].bind(this.backend);
    if (g.length === 2) {
      try {
        const h = g(r, l);
        h && typeof h.then == "function"
          ? h.then((response) => m(null, response)).catch(m)
          : m(null, h);
      } catch (h) {
        m(h);
      }
      return;
    }
    return g(r, l, m);
  }
  prepareLoading(r, l, o = {}, s) {
    if (!this.backend)
      return (
        this.logger.warn(
          "No backend was added via i18next.use. Will not load resources.",
        ),
        s && s()
      );
    if (Oe(r)) {
      r = this.languageUtils.toResolveHierarchy(r);
    }
    if (Oe(l)) {
      l = [l];
    }
    const c = this.queueLoad(r, l, o, s);
    if (!c.toLoad.length) return (c.pending.length || s(), null);
    c.toLoad.forEach((item) => {
      this.loadOne(item);
    });
  }
  load(r, l, o) {
    this.prepareLoading(r, l, {}, o);
  }
  reload(r, l, o) {
    this.prepareLoading(
      r,
      l,
      {
        reload: !0,
      },
      o,
    );
  }
  loadOne(r, l = "") {
    const o = r.split("|"),
      s = o[0],
      c = o[1];
    this.read(s, c, "read", void 0, void 0, (f, m) => {
      if (f) {
        this.logger.warn(
          `${l}loading namespace ${c} for language ${s} failed`,
          f,
        );
      }
      if (!f && m) {
        this.logger.log(`${l}loaded namespace ${c} for language ${s}`, m);
      }
      this.loaded(r, f, m);
    });
  }
  saveMissing(r, l, o, s, c, f = {}, m = () => {}) {
    if (
      this.services?.utils?.hasLoadedNamespace &&
      !this.services?.utils?.hasLoadedNamespace(l)
    ) {
      this.logger.warn(
        `did not save key "${o}" as the namespace "${l}" was not yet loaded`,
        "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!",
      );
      return;
    }
    if (!(o == null || o === "")) {
      if (this.backend?.create) {
        const g = {
            ...f,
            isUpdate: c,
          },
          h = this.backend.create.bind(this.backend);
        if (h.length < 6)
          try {
            let y;
            h.length === 5 ? (y = h(r, l, o, s, g)) : (y = h(r, l, o, s));
            y && typeof y.then == "function"
              ? y.then((response) => m(null, response)).catch(m)
              : m(null, y);
          } catch (y) {
            m(y);
          }
        else h(r, l, o, s, m, g);
      }
      !r || !r[0] || this.store.addResource(r[0], l, o, s);
    }
  }
}
const Dp = () => ({
    debug: !1,
    initAsync: !0,
    ns: ["translation"],
    defaultNS: ["translation"],
    fallbackLng: ["dev"],
    fallbackNS: !1,
    supportedLngs: !1,
    nonExplicitSupportedLngs: !1,
    load: "all",
    preload: !1,
    simplifyPluralSuffix: !0,
    keySeparator: ".",
    nsSeparator: ":",
    pluralSeparator: "_",
    contextSeparator: "_",
    partialBundledLanguages: !1,
    saveMissing: !1,
    updateMissing: !1,
    saveMissingTo: "fallback",
    saveMissingPlurals: !0,
    missingKeyHandler: !1,
    missingInterpolationHandler: !1,
    postProcess: !1,
    postProcessPassResolved: !1,
    returnNull: !1,
    returnEmptyString: !0,
    returnObjects: !1,
    joinArrays: !1,
    returnedObjectHandler: !1,
    parseMissingKeyHandler: !1,
    appendNamespaceToMissingKey: !1,
    appendNamespaceToCIMode: !1,
    overloadTranslationOptionHandler: (n) => {
      let r = {};
      if (
        (typeof n[1] == "object" && (r = n[1]),
        Oe(n[1]) && (r.defaultValue = n[1]),
        Oe(n[2]) && (r.tDescription = n[2]),
        typeof n[2] == "object" || typeof n[3] == "object")
      ) {
        const l = n[3] || n[2];
        Object.keys(l).forEach((item) => {
          r[item] = l[item];
        });
      }
      return r;
    },
    interpolation: {
      escapeValue: !0,
      format: (n) => n,
      prefix: "{{",
      suffix: "}}",
      formatSeparator: ",",
      unescapePrefix: "-",
      nestingPrefix: "$t(",
      nestingSuffix: ")",
      nestingOptionsSeparator: ",",
      maxReplaces: 1e3,
      skipOnVariables: !0,
    },
    cacheInBuiltFormats: !0,
  }),
  Lp = (n) => {
    return (
      Oe(n.ns) && (n.ns = [n.ns]),
      Oe(n.fallbackLng) && (n.fallbackLng = [n.fallbackLng]),
      Oe(n.fallbackNS) && (n.fallbackNS = [n.fallbackNS]),
      n.supportedLngs?.indexOf?.("cimode") < 0 &&
        (n.supportedLngs = n.supportedLngs.concat(["cimode"])),
      typeof n.initImmediate == "boolean" && (n.initAsync = n.initImmediate),
      n
    );
  },
  ms = () => {},
  Xw = (n) => {
    Object.getOwnPropertyNames(Object.getPrototypeOf(n)).forEach((item) => {
      if (typeof n[item] == "function") {
        n[item] = n[item].bind(n);
      }
    });
  };
class Ni extends Xs {
  constructor(r = {}, l) {
    if (
      (super(),
      (this.options = Lp(r)),
      (this.services = {}),
      (this.logger = Vn),
      (this.modules = {
        external: [],
      }),
      Xw(this),
      l && !this.isInitialized && !r.isClone)
    ) {
      if (!this.options.initAsync) return (this.init(r, l), this);
      setTimeout(() => {
        this.init(r, l);
      }, 0);
    }
  }
  init(r = {}, l) {
    this.isInitializing = !0;
    if (typeof r == "function") {
      ((l = r), (r = {}));
    }
    if (r.defaultNS == null && r.ns) {
      Oe(r.ns)
        ? (r.defaultNS = r.ns)
        : r.ns.indexOf("translation") < 0 && (r.defaultNS = r.ns[0]);
    }
    const o = Dp();
    this.options = {
      ...o,
      ...this.options,
      ...Lp(r),
    };
    this.options.interpolation = {
      ...o.interpolation,
      ...this.options.interpolation,
    };
    if (r.keySeparator !== void 0) {
      this.options.userDefinedKeySeparator = r.keySeparator;
    }
    if (r.nsSeparator !== void 0) {
      this.options.userDefinedNsSeparator = r.nsSeparator;
    }
    if (typeof this.options.overloadTranslationOptionHandler != "function") {
      this.options.overloadTranslationOptionHandler =
        o.overloadTranslationOptionHandler;
    }
    const s = (h) => {
      return h ? (typeof h == "function" ? new h() : h) : null;
    };
    if (!this.options.isClone) {
      this.modules.logger
        ? Vn.init(s(this.modules.logger), this.options)
        : Vn.init(null, this.options);
      let h;
      this.modules.formatter ? (h = this.modules.formatter) : (h = Yw);
      const y = new Rp(this.options);
      this.store = new xp(this.options.resources, this.options);
      const v = this.services;
      v.logger = Vn;
      v.resourceStore = this.store;
      v.languageUtils = y;
      v.pluralResolver = new $w(y, {
        prepend: this.options.pluralSeparator,
        simplifyPluralSuffix: this.options.simplifyPluralSuffix,
      });
      if (
        this.options.interpolation.format &&
        this.options.interpolation.format !== o.interpolation.format
      ) {
        this.logger.deprecate(
          "init: you are still using the legacy format function, please use the new approach: https://www.i18next.com/translation-function/formatting",
        );
      }
      if (
        h &&
        (!this.options.interpolation.format ||
          this.options.interpolation.format === o.interpolation.format)
      ) {
        ((v.formatter = s(h)),
          v.formatter.init && v.formatter.init(v, this.options),
          (this.options.interpolation.format = v.formatter.format.bind(
            v.formatter,
          )));
      }
      v.interpolator = new Cp(this.options);
      v.utils = {
        hasLoadedNamespace: this.hasLoadedNamespace.bind(this),
      };
      v.backendConnector = new Fw(
        s(this.modules.backend),
        v.resourceStore,
        v,
        this.options,
      );
      v.backendConnector.on("*", (w, ...x) => {
        this.emit(w, ...x);
      });
      if (this.modules.languageDetector) {
        ((v.languageDetector = s(this.modules.languageDetector)),
          v.languageDetector.init &&
            v.languageDetector.init(v, this.options.detection, this.options));
      }
      if (this.modules.i18nFormat) {
        ((v.i18nFormat = s(this.modules.i18nFormat)),
          v.i18nFormat.init && v.i18nFormat.init(this));
      }
      this.translator = new Ns(this.services, this.options);
      this.translator.on("*", (w, ...x) => {
        this.emit(w, ...x);
      });
      this.modules.external.forEach((item) => {
        if (item.init) {
          item.init(this);
        }
      });
    }
    if (
      ((this.format = this.options.interpolation.format),
      l || (l = ms),
      this.options.fallbackLng &&
        !this.services.languageDetector &&
        !this.options.lng)
    ) {
      const h = this.services.languageUtils.getFallbackCodes(
        this.options.fallbackLng,
      );
      if (h.length > 0 && h[0] !== "dev") {
        this.options.lng = h[0];
      }
    }
    if (!this.services.languageDetector && !this.options.lng) {
      this.logger.warn(
        "init: no languageDetector is used and no lng is defined",
      );
    }
    [
      "getResource",
      "hasResourceBundle",
      "getResourceBundle",
      "getDataByLanguage",
    ].forEach((item) => {
      this[item] = (...y) => this.store[item](...y);
    });
    [
      "addResource",
      "addResources",
      "addResourceBundle",
      "removeResourceBundle",
    ].forEach((item) => {
      this[item] = (...y) => (this.store[item](...y), this);
    });
    const m = Ri(),
      g = () => {
        const h = (y, v) => {
          this.isInitializing = !1;
          if (this.isInitialized && !this.initializedStoreOnce) {
            this.logger.warn(
              "init: i18next is already initialized. You should call init just once!",
            );
          }
          this.isInitialized = !0;
          this.options.isClone || this.logger.log("initialized", this.options);
          this.emit("initialized", this.options);
          m.resolve(v);
          l(y, v);
        };
        if (this.languages && !this.isInitialized)
          return h(null, this.t.bind(this));
        this.changeLanguage(this.options.lng, h);
      };
    return (
      this.options.resources || !this.options.initAsync
        ? g()
        : setTimeout(g, 0),
      m
    );
  }
  loadResources(r, l = ms) {
    let o = l;
    const s = Oe(r) ? r : this.language;
    if (
      (typeof r == "function" && (o = r),
      !this.options.resources || this.options.partialBundledLanguages)
    ) {
      if (
        s?.toLowerCase() === "cimode" &&
        (!this.options.preload || this.options.preload.length === 0)
      )
        return o();
      const c = [],
        f = (m) => {
          if (!m || m === "cimode") return;
          this.services.languageUtils.toResolveHierarchy(m).forEach((item) => {
            if (item !== "cimode" && c.indexOf(item) < 0) {
              c.push(item);
            }
          });
        };
      s
        ? f(s)
        : this.services.languageUtils
            .getFallbackCodes(this.options.fallbackLng)
            .forEach((item) => f(item));
      this.options.preload?.forEach?.((m) => f(m));
      this.services.backendConnector.load(c, this.options.ns, (m) => {
        if (!m && !this.resolvedLanguage && this.language) {
          this.setResolvedLanguage(this.language);
        }
        o(m);
      });
    } else o(null);
  }
  reloadResources(r, l, o) {
    const s = Ri();
    return (
      typeof r == "function" && ((o = r), (r = void 0)),
      typeof l == "function" && ((o = l), (l = void 0)),
      r || (r = this.languages),
      l || (l = this.options.ns),
      o || (o = ms),
      this.services.backendConnector.reload(r, l, (c) => {
        s.resolve();
        o(c);
      }),
      s
    );
  }
  use(r) {
    if (!r)
      throw new Error(
        "You are passing an undefined module! Please check the object you are passing to i18next.use()",
      );
    if (!r.type)
      throw new Error(
        "You are passing a wrong module! Please check the object you are passing to i18next.use()",
      );
    return (
      r.type === "backend" && (this.modules.backend = r),
      (r.type === "logger" || (r.log && r.warn && r.error)) &&
        (this.modules.logger = r),
      r.type === "languageDetector" && (this.modules.languageDetector = r),
      r.type === "i18nFormat" && (this.modules.i18nFormat = r),
      r.type === "postProcessor" && Cv.addPostProcessor(r),
      r.type === "formatter" && (this.modules.formatter = r),
      r.type === "3rdParty" && this.modules.external.push(r),
      this
    );
  }
  setResolvedLanguage(r) {
    if (!(!r || !this.languages) && !(["cimode", "dev"].indexOf(r) > -1)) {
      for (let l = 0; l < this.languages.length; l++) {
        const o = this.languages[l];
        if (
          !(["cimode", "dev"].indexOf(o) > -1) &&
          this.store.hasLanguageSomeTranslations(o)
        ) {
          this.resolvedLanguage = o;
          break;
        }
      }
      if (
        !this.resolvedLanguage &&
        this.languages.indexOf(r) < 0 &&
        this.store.hasLanguageSomeTranslations(r)
      ) {
        ((this.resolvedLanguage = r), this.languages.unshift(r));
      }
    }
  }
  changeLanguage(r, l) {
    this.isLanguageChangingTo = r;
    const o = Ri();
    this.emit("languageChanging", r);
    const s = (m) => {
        this.language = m;
        this.languages = this.services.languageUtils.toResolveHierarchy(m);
        this.resolvedLanguage = void 0;
        this.setResolvedLanguage(m);
      },
      c = (m, g) => {
        g
          ? this.isLanguageChangingTo === r &&
            (s(g),
            this.translator.changeLanguage(g),
            (this.isLanguageChangingTo = void 0),
            this.emit("languageChanged", g),
            this.logger.log("languageChanged", g))
          : (this.isLanguageChangingTo = void 0);
        o.resolve((...h) => this.t(...h));
        if (l) {
          l(m, (...h) => this.t(...h));
        }
      },
      f = (m) => {
        if (!r && !m && this.services.languageDetector) {
          m = [];
        }
        const g = Oe(m) ? m : m && m[0],
          h = this.store.hasLanguageSomeTranslations(g)
            ? g
            : this.services.languageUtils.getBestMatchFromCodes(
                Oe(m) ? [m] : m,
              );
        if (h) {
          (this.language || s(h),
            this.translator.language || this.translator.changeLanguage(h),
            this.services.languageDetector?.cacheUserLanguage?.(h));
        }
        this.loadResources(h, (y) => {
          c(y, h);
        });
      };
    return (
      !r &&
      this.services.languageDetector &&
      !this.services.languageDetector.async
        ? f(this.services.languageDetector.detect())
        : !r &&
            this.services.languageDetector &&
            this.services.languageDetector.async
          ? this.services.languageDetector.detect.length === 0
            ? this.services.languageDetector.detect().then(f)
            : this.services.languageDetector.detect(f)
          : f(r),
      o
    );
  }
  getFixedT(r, l, o) {
    const s = (c, f, ...m) => {
      let g;
      typeof f != "object"
        ? (g = this.options.overloadTranslationOptionHandler([c, f].concat(m)))
        : (g = {
            ...f,
          });
      g.lng = g.lng || s.lng;
      g.lngs = g.lngs || s.lngs;
      g.ns = g.ns || s.ns;
      if (g.keyPrefix !== "") {
        g.keyPrefix = g.keyPrefix || o || s.keyPrefix;
      }
      const h = this.options.keySeparator || ".";
      let y;
      return (
        g.keyPrefix && Array.isArray(c)
          ? (y = c.map(
              (item) => (
                typeof item == "function" &&
                  (item = rd(item, {
                    ...this.options,
                    ...f,
                  })),
                `${g.keyPrefix}${h}${item}`
              ),
            ))
          : (typeof c == "function" &&
              (c = rd(c, {
                ...this.options,
                ...f,
              })),
            (y = g.keyPrefix ? `${g.keyPrefix}${h}${c}` : c)),
        this.t(y, g)
      );
    };
    return (
      Oe(r) ? (s.lng = r) : (s.lngs = r),
      (s.ns = l),
      (s.keyPrefix = o),
      s
    );
  }
  t(...r) {
    return this.translator?.translate(...r);
  }
  exists(...r) {
    return this.translator?.exists(...r);
  }
  setDefaultNamespace(r) {
    this.options.defaultNS = r;
  }
  hasLoadedNamespace(r, l = {}) {
    if (!this.isInitialized)
      return (
        this.logger.warn(
          "hasLoadedNamespace: i18next was not initialized",
          this.languages,
        ),
        !1
      );
    if (!this.languages || !this.languages.length)
      return (
        this.logger.warn(
          "hasLoadedNamespace: i18n.languages were undefined or empty",
          this.languages,
        ),
        !1
      );
    const o = l.lng || this.resolvedLanguage || this.languages[0],
      s = this.options ? this.options.fallbackLng : !1,
      c = this.languages[this.languages.length - 1];
    if (o.toLowerCase() === "cimode") return !0;
    const f = (m, g) => {
      const h = this.services.backendConnector.state[`${m}|${g}`];
      return h === -1 || h === 0 || h === 2;
    };
    if (l.precheck) {
      const m = l.precheck(this, f);
      if (m !== void 0) return m;
    }
    return !!(
      this.hasResourceBundle(o, r) ||
      !this.services.backendConnector.backend ||
      (this.options.resources && !this.options.partialBundledLanguages) ||
      (f(o, r) && (!s || f(c, r)))
    );
  }
  loadNamespaces(r, l) {
    const o = Ri();
    return this.options.ns
      ? (Oe(r) && (r = [r]),
        r.forEach((item) => {
          if (this.options.ns.indexOf(item) < 0) {
            this.options.ns.push(item);
          }
        }),
        this.loadResources((s) => {
          o.resolve();
          if (l) {
            l(s);
          }
        }),
        o)
      : (l && l(), Promise.resolve());
  }
  loadLanguages(r, l) {
    const o = Ri();
    if (Oe(r)) {
      r = [r];
    }
    const s = this.options.preload || [],
      c = r.filter(
        (item) =>
          s.indexOf(item) < 0 &&
          this.services.languageUtils.isSupportedCode(item),
      );
    return c.length
      ? ((this.options.preload = s.concat(c)),
        this.loadResources((f) => {
          o.resolve();
          if (l) {
            l(f);
          }
        }),
        o)
      : (l && l(), Promise.resolve());
  }
  dir(r) {
    if (
      (r ||
        (r =
          this.resolvedLanguage ||
          (this.languages?.length > 0 ? this.languages[0] : this.language)),
      !r)
    )
      return "rtl";
    try {
      const s = new Intl.Locale(r);
      if (s && s.getTextInfo) {
        const c = s.getTextInfo();
        if (c && c.direction) return c.direction;
      }
    } catch {}
    const l = [
        "ar",
        "shu",
        "sqr",
        "ssh",
        "xaa",
        "yhd",
        "yud",
        "aao",
        "abh",
        "abv",
        "acm",
        "acq",
        "acw",
        "acx",
        "acy",
        "adf",
        "ads",
        "aeb",
        "aec",
        "afb",
        "ajp",
        "apc",
        "apd",
        "arb",
        "arq",
        "ars",
        "ary",
        "arz",
        "auz",
        "avl",
        "ayh",
        "ayl",
        "ayn",
        "ayp",
        "bbz",
        "pga",
        "he",
        "iw",
        "ps",
        "pbt",
        "pbu",
        "pst",
        "prp",
        "prd",
        "ug",
        "ur",
        "ydd",
        "yds",
        "yih",
        "ji",
        "yi",
        "hbo",
        "men",
        "xmn",
        "fa",
        "jpr",
        "peo",
        "pes",
        "prs",
        "dv",
        "sam",
        "ckb",
      ],
      o = this.services?.languageUtils || new Rp(Dp());
    if (r.toLowerCase().indexOf("-latn") > 1) {
      return "ltr";
    }
    if (
      l.indexOf(o.getLanguagePartFromCode(r)) > -1 ||
      r.toLowerCase().indexOf("-arab") > 1
    ) {
      return "rtl";
    }
    return "ltr";
  }
  static createInstance(r = {}, l) {
    const o = new Ni(r, l);
    return ((o.createInstance = Ni.createInstance), o);
  }
  cloneInstance(r = {}, l = ms) {
    const o = r.forkResourceStore;
    if (o) {
      delete r.forkResourceStore;
    }
    const s = {
        ...this.options,
        ...r,
        isClone: !0,
      },
      c = new Ni(s);
    if (
      ((r.debug !== void 0 || r.prefix !== void 0) &&
        (c.logger = c.logger.clone(r)),
      ["store", "services", "language"].forEach((item) => {
        c[item] = this[item];
      }),
      (c.services = {
        ...this.services,
      }),
      (c.services.utils = {
        hasLoadedNamespace: c.hasLoadedNamespace.bind(c),
      }),
      o)
    ) {
      const m = Object.keys(this.store.data).reduce(
        (item, acc) => (
          (item[acc] = {
            ...this.store.data[acc],
          }),
          (item[acc] = Object.keys(item[acc]).reduce(
            (item, acc) => (
              (item[acc] = {
                ...item[acc][acc],
              }),
              item
            ),
            item[acc],
          )),
          item
        ),
        {},
      );
      c.store = new xp(m, s);
      c.services.resourceStore = c.store;
    }
    return (
      r.interpolation && (c.services.interpolator = new Cp(s)),
      (c.translator = new Ns(c.services, s)),
      c.translator.on("*", (m, ...g) => {
        c.emit(m, ...g);
      }),
      c.init(s, l),
      (c.translator.options = s),
      (c.translator.backendConnector.services.utils = {
        hasLoadedNamespace: c.hasLoadedNamespace.bind(c),
      }),
      c
    );
  }
  toJSON() {
    return {
      options: this.options,
      store: this.store,
      language: this.language,
      languages: this.languages,
      resolvedLanguage: this.resolvedLanguage,
    };
  }
}
const St = Ni.createInstance();
St.createInstance;
St.dir;
St.init;
St.loadResources;
St.reloadResources;
St.use;
St.changeLanguage;
St.getFixedT;
St.t;
St.exists;
St.setDefaultNamespace;
St.hasLoadedNamespace;
St.loadNamespaces;
St.loadLanguages;
const Pw =
    /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34|nbsp|#160|copy|#169|reg|#174|hellip|#8230|#x2F|#47);/g,
  Qw = {
    "&amp;": "&",
    "&#38;": "&",
    "&lt;": "<",
    "&#60;": "<",
    "&gt;": ">",
    "&#62;": ">",
    "&apos;": "'",
    "&#39;": "'",
    "&quot;": '"',
    "&#34;": '"',
    "&nbsp;": " ",
    "&#160;": " ",
    "&copy;": "©",
    "&#169;": "©",
    "&reg;": "®",
    "&#174;": "®",
    "&hellip;": "…",
    "&#8230;": "…",
    "&#x2F;": "/",
    "&#47;": "/",
  },
  Kw = (n) => Qw[n],
  Zw = (n) => n.replace(Pw, Kw);
let ld = {
  bindI18n: "languageChanged",
  bindI18nStore: "",
  transEmptyNodeValue: "",
  transSupportBasicHtmlNodes: !0,
  transWrapTextNodes: "",
  transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p"],
  useSuspense: !0,
  unescape: Zw,
};
const Jw = (n = {}) => {
    ld = {
      ...ld,
      ...n,
    };
  },
  UT = () => ld;
let Dv;
const Iw = (n) => {
    Dv = n;
  },
  HT = () => Dv,
  Ww = {
    type: "3rdParty",
    init(n) {
      Jw(n.options.react);
      Iw(n);
    },
  },
  { slice: eR, forEach: tR } = [];
/* ---- i18next Language Detector Plugin ---- */
function nR(n) {
  return (
    tR.call(eR.call(arguments, 1), (r) => {
      if (r)
        for (const l in r)
          if (n[l] === void 0) {
            n[l] = r[l];
          }
    }),
    n
  );
}
function aR(n) {
  return typeof n != "string"
    ? !1
    : [
        /<\s*script.*?>/i,
        /<\s*\/\s*script\s*>/i,
        /<\s*img.*?on\w+\s*=/i,
        /<\s*\w+\s*on\w+\s*=.*?>/i,
        /javascript\s*:/i,
        /vbscript\s*:/i,
        /expression\s*\(/i,
        /eval\s*\(/i,
        /alert\s*\(/i,
        /document\.cookie/i,
        /document\.write\s*\(/i,
        /window\.location/i,
        /innerHTML/i,
      ].some((item) => item.test(n));
}
const Np = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/,
  rR = function (n, r) {
    const o =
        arguments.length > 2 && arguments[2] !== void 0
          ? arguments[2]
          : {
              path: "/",
            },
      s = encodeURIComponent(r);
    let c = `${n}=${s}`;
    if (o.maxAge > 0) {
      const f = o.maxAge - 0;
      if (Number.isNaN(f)) throw new Error("maxAge should be a Number");
      c += `; Max-Age=${Math.floor(f)}`;
    }
    if (o.domain) {
      if (!Np.test(o.domain)) throw new TypeError("option domain is invalid");
      c += `; Domain=${o.domain}`;
    }
    if (o.path) {
      if (!Np.test(o.path)) throw new TypeError("option path is invalid");
      c += `; Path=${o.path}`;
    }
    if (o.expires) {
      if (typeof o.expires.toUTCString != "function")
        throw new TypeError("option expires is invalid");
      c += `; Expires=${o.expires.toUTCString()}`;
    }
    if (
      (o.httpOnly && (c += "; HttpOnly"),
      o.secure && (c += "; Secure"),
      o.sameSite)
    )
      switch (
        typeof o.sameSite == "string" ? o.sameSite.toLowerCase() : o.sameSite
      ) {
        case !0:
          c += "; SameSite=Strict";
          break;
        case "lax":
          c += "; SameSite=Lax";
          break;
        case "strict":
          c += "; SameSite=Strict";
          break;
        case "none":
          c += "; SameSite=None";
          break;
        default:
          throw new TypeError("option sameSite is invalid");
      }
    return (o.partitioned && (c += "; Partitioned"), c);
  },
  Mp = {
    create(n, r, l, o) {
      let s =
        arguments.length > 4 && arguments[4] !== void 0
          ? arguments[4]
          : {
              path: "/",
              sameSite: "strict",
            };
      if (l) {
        ((s.expires = new Date()),
          s.expires.setTime(s.expires.getTime() + l * 60 * 1e3));
      }
      if (o) {
        s.domain = o;
      }
      document.cookie = rR(n, r, s);
    },
    read(n) {
      const r = `${n}=`,
        l = document.cookie.split(";");
      for (let o = 0; o < l.length; o++) {
        let s = l[o];
        for (; s.charAt(0) === " "; ) s = s.substring(1, s.length);
        if (s.indexOf(r) === 0) return s.substring(r.length, s.length);
      }
      return null;
    },
    remove(n, r) {
      this.create(n, "", -1, r);
    },
  };
var lR = {
    name: "cookie",
    lookup(n) {
      let { lookupCookie: r } = n;
      if (r && typeof document < "u") return Mp.read(r) || void 0;
    },
    cacheUserLanguage(n, r) {
      let {
        lookupCookie: l,
        cookieMinutes: o,
        cookieDomain: s,
        cookieOptions: c,
      } = r;
      if (l && typeof document < "u") {
        Mp.create(l, n, o, s, c);
      }
    },
  },
  iR = {
    name: "querystring",
    lookup(n) {
      let { lookupQuerystring: r } = n,
        l;
      if (typeof window < "u") {
        let { search: o } = window.location;
        if (
          !window.location.search &&
          window.location.hash?.indexOf("?") > -1
        ) {
          o = window.location.hash.substring(window.location.hash.indexOf("?"));
        }
        const c = o.substring(1).split("&");
        for (let f = 0; f < c.length; f++) {
          const m = c[f].indexOf("=");
          if (m > 0 && c[f].substring(0, m) === r) {
            l = c[f].substring(m + 1);
          }
        }
      }
      return l;
    },
  },
  oR = {
    name: "hash",
    lookup(n) {
      let { lookupHash: r, lookupFromHashIndex: l } = n,
        o;
      if (typeof window < "u") {
        const { hash: s } = window.location;
        if (s && s.length > 2) {
          const c = s.substring(1);
          if (r) {
            const f = c.split("&");
            for (let m = 0; m < f.length; m++) {
              const g = f[m].indexOf("=");
              if (g > 0 && f[m].substring(0, g) === r) {
                o = f[m].substring(g + 1);
              }
            }
          }
          if (o) return o;
          if (!o && l > -1) {
            const f = s.match(/\/([a-zA-Z-]*)/g);
            return Array.isArray(f)
              ? f[typeof l == "number" ? l : 0]?.replace("/", "")
              : void 0;
          }
        }
      }
      return o;
    },
  };
let rl = null;
const zp = () => {
  if (rl !== null) return rl;
  try {
    if (((rl = typeof window < "u" && window.localStorage !== null), !rl))
      return !1;
    const n = "i18next.translate.boo";
    window.localStorage.setItem(n, "foo");
    window.localStorage.removeItem(n);
  } catch {
    rl = !1;
  }
  return rl;
};
var sR = {
  name: "localStorage",
  lookup(n) {
    let { lookupLocalStorage: r } = n;
    if (r && zp()) return window.localStorage.getItem(r) || void 0;
  },
  cacheUserLanguage(n, r) {
    let { lookupLocalStorage: l } = r;
    if (l && zp()) {
      window.localStorage.setItem(l, n);
    }
  },
};
let ll = null;
const kp = () => {
  if (ll !== null) return ll;
  try {
    if (((ll = typeof window < "u" && window.sessionStorage !== null), !ll))
      return !1;
    const n = "i18next.translate.boo";
    window.sessionStorage.setItem(n, "foo");
    window.sessionStorage.removeItem(n);
  } catch {
    ll = !1;
  }
  return ll;
};
var uR = {
    name: "sessionStorage",
    lookup(n) {
      let { lookupSessionStorage: r } = n;
      if (r && kp()) return window.sessionStorage.getItem(r) || void 0;
    },
    cacheUserLanguage(n, r) {
      let { lookupSessionStorage: l } = r;
      if (l && kp()) {
        window.sessionStorage.setItem(l, n);
      }
    },
  },
  cR = {
    name: "navigator",
    lookup(n) {
      const r = [];
      if (typeof navigator < "u") {
        const { languages: l, userLanguage: o, language: s } = navigator;
        if (l) for (let c = 0; c < l.length; c++) r.push(l[c]);
        if (o) {
          r.push(o);
        }
        if (s) {
          r.push(s);
        }
      }
      return r.length > 0 ? r : void 0;
    },
  },
  fR = {
    name: "htmlTag",
    lookup(n) {
      let { htmlTag: r } = n,
        l;
      const o = r || (typeof document < "u" ? document.documentElement : null);
      return (
        o &&
          typeof o.getAttribute == "function" &&
          (l = o.getAttribute("lang")),
        l
      );
    },
  },
  dR = {
    name: "path",
    lookup(n) {
      let { lookupFromPathIndex: r } = n;
      if (typeof window > "u") return;
      const l = window.location.pathname.match(/\/([a-zA-Z-]*)/g);
      return Array.isArray(l)
        ? l[typeof r == "number" ? r : 0]?.replace("/", "")
        : void 0;
    },
  },
  hR = {
    name: "subdomain",
    lookup(n) {
      let { lookupFromSubdomainIndex: r } = n;
      const l = typeof r == "number" ? r + 1 : 1,
        o =
          typeof window < "u" &&
          window.location?.hostname?.match(
            /^(\w{2,5})\.(([a-z0-9-]{1,63}\.[a-z]{2,6})|localhost)/i,
          );
      if (o) return o[l];
    },
  };
let Lv = !1;
try {
  document.cookie;
  Lv = !0;
} catch {}
const Nv = [
  "querystring",
  "cookie",
  "localStorage",
  "sessionStorage",
  "navigator",
  "htmlTag",
];
Lv || Nv.splice(1, 1);
const mR = () => ({
  order: Nv,
  lookupQuerystring: "lng",
  lookupCookie: "i18next",
  lookupLocalStorage: "i18nextLng",
  lookupSessionStorage: "i18nextLng",
  caches: ["localStorage"],
  excludeCacheFor: ["cimode"],
  convertDetectedLanguage: (n) => n,
});
class Mv {
  constructor(r) {
    let l = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    this.type = "languageDetector";
    this.detectors = {};
    this.init(r, l);
  }
  init() {
    let r =
        arguments.length > 0 && arguments[0] !== void 0
          ? arguments[0]
          : {
              languageUtils: {},
            },
      l = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {},
      o = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    this.services = r;
    this.options = nR(l, this.options || {}, mR());
    if (
      typeof this.options.convertDetectedLanguage == "string" &&
      this.options.convertDetectedLanguage.indexOf("15897") > -1
    ) {
      this.options.convertDetectedLanguage = (s) => s.replace("-", "_");
    }
    if (this.options.lookupFromUrlIndex) {
      this.options.lookupFromPathIndex = this.options.lookupFromUrlIndex;
    }
    this.i18nOptions = o;
    this.addDetector(lR);
    this.addDetector(iR);
    this.addDetector(sR);
    this.addDetector(uR);
    this.addDetector(cR);
    this.addDetector(fR);
    this.addDetector(dR);
    this.addDetector(hR);
    this.addDetector(oR);
  }
  addDetector(r) {
    return ((this.detectors[r.name] = r), this);
  }
  detect() {
    let r =
        arguments.length > 0 && arguments[0] !== void 0
          ? arguments[0]
          : this.options.order,
      l = [];
    return (
      r.forEach((item) => {
        if (this.detectors[item]) {
          let s = this.detectors[item].lookup(this.options);
          if (s && typeof s == "string") {
            s = [s];
          }
          if (s) {
            l = l.concat(s);
          }
        }
      }),
      (l = l
        .filter((item) => item != null && !aR(item))
        .map((item) => this.options.convertDetectedLanguage(item))),
      this.services &&
      this.services.languageUtils &&
      this.services.languageUtils.getBestMatchFromCodes
        ? l
        : l.length > 0
          ? l[0]
          : null
    );
  }
  cacheUserLanguage(r) {
    let l =
      arguments.length > 1 && arguments[1] !== void 0
        ? arguments[1]
        : this.options.caches;
    if (l) {
      (this.options.excludeCacheFor &&
        this.options.excludeCacheFor.indexOf(r) > -1) ||
        l.forEach((item) => {
          if (this.detectors[item]) {
            this.detectors[item].cacheUserLanguage(r, this.options);
          }
        });
    }
  }
}
Mv.type = "languageDetector";
const gR = "modulepreload",
  pR = function (n) {
    return "/" + n;
  },
  jp = {},
  ze = function (r, l, o) {
    let s = Promise.resolve();
    if (l && l.length > 0) {
      let g = function (h) {
        return Promise.all(
          h.map((item) =>
            Promise.resolve(item).then(
              (response) => ({
                status: "fulfilled",
                value: response,
              }),
              (response) => ({
                status: "rejected",
                reason: response,
              }),
            ),
          ),
        );
      };
      document.getElementsByTagName("link");
      const f = document.querySelector("meta[property=csp-nonce]"),
        m = f?.nonce || f?.getAttribute("nonce");
      s = g(
        l.map((item) => {
          if (((item = pR(item)), item in jp)) return;
          jp[item] = !0;
          const y = item.endsWith(".css"),
            v = y ? '[rel="stylesheet"]' : "";
          if (document.querySelector(`link[href="${item}"]${v}`)) return;
          const S = document.createElement("link");
          if (
            ((S.rel = y ? "stylesheet" : gR),
            y || (S.as = "script"),
            (S.crossOrigin = ""),
            (S.href = item),
            m && S.setAttribute("nonce", m),
            document.head.appendChild(S),
            y)
          )
            return new Promise((w, x) => {
              S.addEventListener("load", w);
              S.addEventListener("error", () =>
                x(new Error(`Unable to preload CSS for ${item}`)),
              );
            });
        }),
      );
    }
    function c(f) {
      const m = new Event("vite:preloadError", {
        cancelable: !0,
      });
      if (((m.payload = f), window.dispatchEvent(m), !m.defaultPrevented))
        throw f;
    }
    return s.then((response) => {
      for (const m of response || [])
        if (m.status === "rejected") {
          c(m.reason);
        }
      return r().catch(c);
    });
  },
  Ts = {
    en: {
      label: "English",
      dayjs: () =>
        ze(
          () =>
            /* Dynamic import */ import("./en-D0FRhgTl.js").then(
              (response) => response.e,
            ),
          [],
        ),
      flatpickr: null,
      i18n: () =>
        ze(() => /* Dynamic import */ import("./translations-BHzXhNc_.js"), []),
      flag: "united-kingdom",
    },
    ar: {
      label: "Arabic",
      dayjs: () =>
        ze(
          () =>
            /* Dynamic import */ import("./ar-DJZMOdD9.js").then(
              (response) => response.a,
            ),
          [],
        ),
      flatpickr: () =>
        ze(
          () =>
            /* Dynamic import */ import("./ar-B8h54-HC.js").then(
              (response) => response.a,
            ),
          [],
        ).then((response) => response.Arabic),
      i18n: () =>
        ze(() => /* Dynamic import */ import("./translations-StecOuCx.js"), []),
      flag: "saudi",
    },
    "pt-br": {
      label: "Português (Brasil)",
      dayjs: () =>
        ze(
          () =>
            /* Dynamic import */ import("./pt-br-SFI5iJqj.js").then(
              (response) => response.p,
            ),
          [],
        ),
      flatpickr: () =>
        ze(
          () =>
            /* Dynamic import */ import("./pt-Bqr8fudb.js").then(
              (response) => response.p,
            ),
          [],
        ).then((response) => response.Portuguese),
      i18n: () =>
        ze(() => /* Dynamic import */ import("./translations-DZk4KAhw.js"), []),
      flag: "brazil",
    },
  },
  zv = Object.keys(Ts),
  kv = "pt-br",
  yR = "pt-br";
St.use(Mv)
  .use(Ww)
  .init({
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      lookupSessionStorage: "i18nextLng",
    },
    fallbackLng: yR,
    lng: localStorage.getItem("i18nextLng") || kv,
    supportedLngs: zv,
    ns: ["translations"],
    defaultNS: "translations",
    interpolation: {
      escapeValue: !1,
    },
    lowerCaseLng: !0,
    debug: !1,
  });
St.languages = zv;
const [vR, bR] = da("useLocaleContext must be used within LocaleProvider"),
  jv = (typeof localStorage < "u" && localStorage.getItem("i18nextLng")) || kv,
  SR = St.dir(jv);
function ER({ children: n }) {
  const [r, l] = E.useState(jv),
    [o, s] = E.useState(SR),
    c = E.useCallback(async (f) => {
      try {
        if (Ts[f]) {
          await Ts[f].dayjs();
          Rd.locale(f);
          const m = await Ts[f].i18n();
          St.addResourceBundle(f, "translations", m);
        }
        St.changeLanguage(f);
        l(f);
      } catch (m) {
        console.error("Failed to update locale:", m);
        St.changeLanguage(f);
        l(f);
      }
    }, []);
  return (
    E.useLayoutEffect(() => {
      if (r) {
        c(r);
      }
    }, []),
    E.useLayoutEffect(() => {
      const f = St.dir(r);
      if (f !== o) {
        s(f);
      }
    }, [r]),
    E.useLayoutEffect(() => {
      document.documentElement.dir = o;
    }, [o]),
    L.jsx(vR, {
      value: {
        locale: r,
        updateLocale: c,
        direction: o,
        setDirection: s,
        isRtl: o === "rtl",
      },
      children: n,
    })
  );
}
var Uv = py();
const BT = ji(Uv);
function xR(n) {
  if (!n || typeof n == "string") return 0;
  const r = n / 36;
  return Math.round((4 + 15 * r ** 0.25 + r / 5) * 10);
}
function Of(n) {
  return n?.current ? n.current.scrollHeight : "auto";
}
const _i = typeof window < "u" && window.requestAnimationFrame;
function wR({
  transitionDuration: n,
  transitionTimingFunction: r = "ease",
  onTransitionEnd: l = () => {},
  opened: o,
  min: s = "0px",
}) {
  const c = E.useRef(null),
    f = s,
    m = {
      display: s === "0px" ? "none" : void 0,
      height: f,
      overflow: "hidden",
    },
    [g, h] = E.useState(o ? {} : m),
    y = (_) => {
      Uv.flushSync(() => h(_));
    },
    v = (_) => {
      y((A) => ({
        ...A,
        ..._,
      }));
    };
  function S(_) {
    return {
      transition: `height ${n || xR(_)}ms ${r}`,
    };
  }
  id(() => {
    if (typeof _i == "function") {
      _i(
        o
          ? () => {
              v({
                willChange: "height",
                display: "block",
                overflow: "hidden",
              });
              _i(() => {
                const _ = Of(c);
                v({
                  ...S(_),
                  height: _,
                });
              });
            }
          : () => {
              const _ = Of(c);
              v({
                ...S(_),
                willChange: "height",
                height: _,
              });
              _i(() =>
                v({
                  height: f,
                  overflow: "hidden",
                }),
              );
            },
      );
    }
  }, [o]);
  const w = (event) => {
    if (!(event.target !== c.current || event.propertyName !== "height"))
      if (o) {
        const A = Of(c);
        A === g.height
          ? y({})
          : v({
              height: A,
            });
        l();
      } else if (g.height === f) {
        (y(m), l());
      }
  };
  function x({ style: _ = {}, refKey: A = "ref", ...z } = {}) {
    const M = z[A];
    return {
      "aria-hidden": !o,
      ...z,
      [A]: _d(c, M),
      onTransitionEnd: w,
      style: {
        boxSizing: "border-box",
        ..._,
        ...g,
      },
    };
  }
  return x;
}
const RR = (n) => {
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";
};
function _R(n = {}) {
  const {
      isEnabled: r = !0,
      overflowCheck: l = "vertical",
      visibility: o = "auto",
      offset: s = 0,
      onVisibilityChange: c,
      updateDeps: f = [],
    } = n,
    m = E.useRef(o),
    g = E.useRef(null);
  return (
    E.useEffect(() => {
      const h = g?.current;
      if (!h || !r) return;
      const y = (x, _, A, z, M) => {
          if (o === "auto") {
            const F = `${z}${RR(M)}Scroll`;
            _ && A
              ? ((h.dataset[F] = "true"),
                h.removeAttribute(`data-${z}-scroll`),
                h.removeAttribute(`data-${M}-scroll`))
              : ((h.dataset[`${z}Scroll`] = _.toString()),
                (h.dataset[`${M}Scroll`] = A.toString()),
                h.removeAttribute(`data-${z}-${M}-scroll`));
          } else {
            const F = _ && A ? "both" : _ ? z : A ? M : "none";
            if (F !== m.current) {
              (c?.(F), (m.current = F));
            }
          }
        },
        v = () => {
          const x = [
              {
                type: "vertical",
                prefix: "top",
                suffix: "bottom",
              },
              {
                type: "horizontal",
                prefix: "left",
                suffix: "right",
              },
            ],
            _ = h.querySelector('ul[data-slot="list"]'),
            A = +(
              _?.getAttribute("data-virtual-scroll-height") ?? h.scrollHeight
            ),
            z = +(_?.getAttribute("data-virtual-scroll-top") ?? h.scrollTop);
          for (const { type: M, prefix: F, suffix: te } of x)
            if (l === M || l === "both") {
              const U = M === "vertical" ? z > s : h.scrollLeft > s,
                W =
                  M === "vertical"
                    ? z + h.clientHeight + s < A
                    : h.scrollLeft + h.clientWidth + s < h.scrollWidth;
              y(M, U, W, F, te);
            }
        },
        S = () => {
          [
            "top",
            "bottom",
            "top-bottom",
            "left",
            "right",
            "left-right",
          ].forEach((item) => {
            h.removeAttribute(`data-${item}-scroll`);
          });
        },
        w = new ResizeObserver(v);
      return (
        w.observe(h),
        h.addEventListener("scroll", v, !0),
        o !== "auto" &&
          (S(),
          o === "both"
            ? ((h.dataset.topBottomScroll = String(l === "vertical")),
              (h.dataset.leftRightScroll = String(l === "horizontal")))
            : ((h.dataset.topBottomScroll = "false"),
              (h.dataset.leftRightScroll = "false"),
              ["top", "bottom", "left", "right"].forEach((item) => {
                h.dataset[`${item}Scroll`] = String(o === item);
              }))),
        () => {
          h.removeEventListener("scroll", v, !0);
          w.disconnect();
          S();
        }
      );
    }, [r, o, l, c, g, s, f]),
    {
      ref: g,
    }
  );
}
var Cf, Up;
function Hv() {
  if (Up) return Cf;
  Up = 1;
  function n(r) {
    var l = typeof r;
    return r != null && (l == "object" || l == "function");
  }
  return ((Cf = n), Cf);
}
var Af, Hp;
function TR() {
  if (Hp) return Af;
  Hp = 1;
  var n = typeof ss == "object" && ss && ss.Object === Object && ss;
  return ((Af = n), Af);
}
var Df, Bp;
function Bv() {
  if (Bp) return Df;
  Bp = 1;
  var n = TR(),
    r = typeof self == "object" && self && self.Object === Object && self,
    l = n || r || Function("return this")();
  return ((Df = l), Df);
}
var Lf, $p;
function OR() {
  if ($p) return Lf;
  $p = 1;
  var n = Bv(),
    r = function () {
      return n.Date.now();
    };
  return ((Lf = r), Lf);
}
var Nf, qp;
function CR() {
  if (qp) return Nf;
  qp = 1;
  var n = /\s/;
  function r(l) {
    for (var o = l.length; o-- && n.test(l.charAt(o)); );
    return o;
  }
  return ((Nf = r), Nf);
}
var Mf, Vp;
function AR() {
  if (Vp) return Mf;
  Vp = 1;
  var n = CR(),
    r = /^\s+/;
  function l(o) {
    return o && o.slice(0, n(o) + 1).replace(r, "");
  }
  return ((Mf = l), Mf);
}
var zf, Yp;
function $v() {
  if (Yp) return zf;
  Yp = 1;
  var n = Bv(),
    r = n.Symbol;
  return ((zf = r), zf);
}
var kf, Gp;
function DR() {
  if (Gp) return kf;
  Gp = 1;
  var n = $v(),
    r = Object.prototype,
    l = r.hasOwnProperty,
    o = r.toString,
    s = n ? n.toStringTag : void 0;
  function c(f) {
    var m = l.call(f, s),
      g = f[s];
    try {
      f[s] = void 0;
      var h = !0;
    } catch {}
    var y = o.call(f);
    return (h && (m ? (f[s] = g) : delete f[s]), y);
  }
  return ((kf = c), kf);
}
var jf, Fp;
function LR() {
  if (Fp) return jf;
  Fp = 1;
  var n = Object.prototype,
    r = n.toString;
  function l(o) {
    return r.call(o);
  }
  return ((jf = l), jf);
}
var Uf, Xp;
function NR() {
  if (Xp) return Uf;
  Xp = 1;
  var n = $v(),
    r = DR(),
    l = LR(),
    o = "[object Null]",
    s = "[object Undefined]",
    c = n ? n.toStringTag : void 0;
  function f(m) {
    if (m == null) {
      return m === void 0 ? s : o;
    }
    if (c && c in Object(m)) {
      return r(m);
    }
    return l(m);
  }
  return ((Uf = f), Uf);
}
var Hf, Pp;
function MR() {
  if (Pp) return Hf;
  Pp = 1;
  function n(r) {
    return r != null && typeof r == "object";
  }
  return ((Hf = n), Hf);
}
var Bf, Qp;
function zR() {
  if (Qp) return Bf;
  Qp = 1;
  var n = NR(),
    r = MR(),
    l = "[object Symbol]";
  function o(s) {
    return typeof s == "symbol" || (r(s) && n(s) == l);
  }
  return ((Bf = o), Bf);
}
var $f, Kp;
function kR() {
  if (Kp) return $f;
  Kp = 1;
  var n = AR(),
    r = Hv(),
    l = zR(),
    o = NaN,
    s = /^[-+]0x[0-9a-f]+$/i,
    c = /^0b[01]+$/i,
    f = /^0o[0-7]+$/i,
    m = parseInt;
  function g(h) {
    if (typeof h == "number") return h;
    if (l(h)) return o;
    if (r(h)) {
      var y = typeof h.valueOf == "function" ? h.valueOf() : h;
      h = r(y) ? y + "" : y;
    }
    if (typeof h != "string") return h === 0 ? h : +h;
    h = n(h);
    var v = c.test(h);
    if (v || f.test(h)) {
      return m(h.slice(2), v ? 2 : 8);
    }
    if (s.test(h)) {
      return o;
    }
    return +h;
  }
  return (($f = g), $f);
}
var qf, Zp;
function jR() {
  if (Zp) return qf;
  Zp = 1;
  var n = Hv(),
    r = OR(),
    l = kR(),
    o = "Expected a function",
    s = Math.max,
    c = Math.min;
  function f(m, g, h) {
    var y,
      v,
      S,
      w,
      x,
      _,
      A = 0,
      z = !1,
      M = !1,
      F = !0;
    if (typeof m != "function") throw new TypeError(o);
    g = l(g) || 0;
    if (n(h)) {
      ((z = !!h.leading),
        (M = "maxWait" in h),
        (S = M ? s(l(h.maxWait) || 0, g) : S),
        (F = "trailing" in h ? !!h.trailing : F));
    }
    function te(be) {
      var ee = y,
        Z = v;
      return ((y = v = void 0), (A = be), (w = m.apply(Z, ee)), w);
    }
    function U(be) {
      return ((A = be), (x = setTimeout(le, g)), z ? te(be) : w);
    }
    function W(be) {
      var ee = be - _,
        Z = be - A,
        T = g - ee;
      return M ? c(T, S - Z) : T;
    }
    function D(be) {
      var ee = be - _,
        Z = be - A;
      return _ === void 0 || ee >= g || ee < 0 || (M && Z >= S);
    }
    function le() {
      var be = r();
      if (D(be)) return ie(be);
      x = setTimeout(le, W(be));
    }
    function ie(be) {
      return ((x = void 0), F && y ? te(be) : ((y = v = void 0), w));
    }
    function ue() {
      if (x !== void 0) {
        clearTimeout(x);
      }
      A = 0;
      y = _ = v = x = void 0;
    }
    function ce() {
      return x === void 0 ? w : ie(r());
    }
    function Ee() {
      var be = r(),
        ee = D(be);
      if (((y = arguments), (v = this), (_ = be), ee)) {
        if (x === void 0) return U(_);
        if (M) return (clearTimeout(x), (x = setTimeout(le, g)), te(_));
      }
      return (x === void 0 && (x = setTimeout(le, g)), w);
    }
    return ((Ee.cancel = ue), (Ee.flush = ce), Ee);
  }
  return ((qf = f), qf);
}
var UR = jR();
const $T = ji(UR);
function id(n, r) {
  const l = E.useRef(!1);
  E.useEffect(
    () => () => {
      l.current = !1;
    },
    [],
  );
  E.useEffect(() => {
    if (l.current) return n();
    l.current = !0;
  }, r);
}
function HR(n = !1, r) {
  const { onOpen: l, onClose: o } = {},
    [s, c] = E.useState(n),
    f = E.useCallback(() => {
      c((h) => h || (l?.(), !0));
    }, [l]),
    m = E.useCallback(() => {
      c((h) => h && (o?.(), !1));
    }, [o]),
    g = E.useCallback(() => {
      s ? m() : f();
    }, [m, f, s]);
  return [
    s,
    {
      open: f,
      close: m,
      toggle: g,
    },
  ];
}
function Jp(n) {
  const r = E.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return (
    E.useLayoutEffect(() => {
      r.current = n;
    }, [n]),
    E.useCallback((...l) => r.current?.(...l), [r])
  );
}
function Ip(n, r, l, o) {
  const s = E.useRef(r);
  E.useLayoutEffect(() => {
    s.current = r;
  }, [r]);
  E.useEffect(() => {
    const c = window;
    if (!(c && c.addEventListener)) return;
    const f = (m) => {
      s.current(m);
    };
    return (
      c.addEventListener(n, f, o),
      () => {
        c.removeEventListener(n, f, o);
      }
    );
  }, [n, l, o]);
}
function Ps(n, r = "") {
  const l = `tl-${E.useId()}-${r}`;
  return typeof n == "string" ? n : l;
}
const Vf = typeof window > "u";
function BR(n, r, l = {}) {
  const { initializeWithValue: o = !0 } = l,
    s = E.useCallback(
      (S) => (l.serializer ? l.serializer(S) : JSON.stringify(S)),
      [l],
    ),
    c = E.useCallback(
      (S) => {
        if (l.deserializer) return l.deserializer(S);
        if (S === "undefined") return;
        const w = r instanceof Function ? r() : r;
        let x;
        try {
          x = JSON.parse(S);
        } catch (_) {
          return (console.error("Error parsing JSON:", _), w);
        }
        return x;
      },
      [l, r],
    ),
    f = E.useCallback(() => {
      const S = r instanceof Function ? r() : r;
      if (Vf) return S;
      try {
        const w = window.localStorage.getItem(n);
        return w ? c(w) : S;
      } catch (w) {
        return (console.warn(`Error reading localStorage key “${n}”:`, w), S);
      }
    }, [r, n, c]),
    [m, g] = E.useState(() => (o ? f() : r instanceof Function ? r() : r)),
    h = Jp((S) => {
      if (Vf) {
        console.warn(
          `Tried setting localStorage key “${n}” even though environment is not a client`,
        );
      }
      try {
        const w = S instanceof Function ? S(f()) : S;
        window.localStorage.setItem(n, s(w));
        g(w);
        window.dispatchEvent(
          new StorageEvent("local-storage", {
            key: n,
          }),
        );
      } catch (w) {
        console.warn(`Error setting localStorage key “${n}”:`, w);
      }
    }),
    y = Jp(() => {
      if (Vf) {
        console.warn(
          `Tried removing localStorage key “${n}” even though environment is not a client`,
        );
      }
      const S = r instanceof Function ? r() : r;
      window.localStorage.removeItem(n);
      g(S);
      window.dispatchEvent(
        new StorageEvent("local-storage", {
          key: n,
        }),
      );
    });
  E.useEffect(() => {
    g(f());
  }, [n]);
  const v = E.useCallback(
    (event) => {
      (event.key && event.key !== n) || g(f());
    },
    [n, f],
  );
  return (Ip("storage", v), Ip("local-storage", v), [m, h, y]);
}
const $R = document.head || document.getElementsByTagName("head")[0];
function qT(n) {
  $R.appendChild(n);
}
function VT(n, r) {
  n.styleSheet
    ? (n.styleSheet.cssText = r)
    : n.appendChild(document.createTextNode(r));
}
function YT() {
  const n = document.createElement("style");
  return ((n.type = "text/css"), n);
}
function qR(n, { defaultValue: r = !1, initializeWithValue: l = !0 } = {}) {
  const o = (m) => {
      return wd ? r : window.matchMedia(m).matches;
    },
    [s, c] = E.useState(() => (l ? o(n) : r));
  function f() {
    c(o(n));
  }
  return (
    E.useLayoutEffect(() => {
      const m = window.matchMedia(n);
      return (
        f(),
        m.addListener ? m.addListener(f) : m.addEventListener("change", f),
        () => {
          m.removeListener
            ? m.removeListener(f)
            : m.removeEventListener("change", f);
        }
      );
    }, [n]),
    s
  );
}
function Wp(n, r) {
  if (typeof n == "function") return n(r);
  if (typeof n == "object" && n !== null && "current" in n) {
    n.current = r;
  }
}
function _d(...n) {
  const r = new Map();
  return (l) => {
    if (
      (n.forEach((item) => {
        const s = Wp(item, l);
        if (s) {
          r.set(item, s);
        }
      }),
      r.size > 0)
    )
      return () => {
        n.forEach((item) => {
          const s = r.get(item);
          s ? s() : Wp(item, null);
        });
        r.clear();
      };
  };
}
function qv(...n) {
  return E.useCallback(_d(...n), n);
}
function Td({
  value: n,
  defaultValue: r,
  finalValue: l,
  onChange: o = () => {},
}) {
  const [s, c] = E.useState(r !== void 0 ? r : l),
    f = (m, ...g) => {
      c(m);
      o?.(m, ...g);
    };
  return n !== void 0 ? [n, o, !0] : [s, f, !1];
}
/* ---- Sidebar Context Provider ---- */
const [VR, YR] = da("useSidebarContext must be used within SidebarProvider"),
  ey = {
    isExpanded: !0,
    toggle: () => {},
    open: () => {},
    close: () => {},
  };
function GR({ children: children }) {
  const { lgAndDown: isSmallScreen, name: breakpointName } = Tv(),
    [isExpanded, { open: openSidebar, close: closeSidebar, toggle: toggleSidebar }] = HR(
      (() => {
        try {
          const stored = localStorage.getItem("sidebar_expanded");
          return stored !== null ? JSON.parse(stored) : ey.isExpanded;
        } catch {
          return ey.isExpanded;
        }
      })(),
    );
  return (
    id(() => {
      localStorage.setItem("sidebar_expanded", JSON.stringify(isExpanded));
    }, [isExpanded]),
    id(() => {
      if (isSmallScreen) {
        closeSidebar();
      }
    }, [breakpointName]),
    E.useLayoutEffect(() => {
      const bodyEl = document?.body;
      if (bodyEl) {
        isExpanded
          ? bodyEl.classList.add("is-sidebar-open")
          : bodyEl.classList.remove("is-sidebar-open");
      }
    }, [isExpanded]),
    children
      ? L.jsx(VR, {
          value: {
            isExpanded: isExpanded,
            toggle: toggleSidebar,
            open: openSidebar,
            close: closeSidebar,
          },
          children: children,
        })
      : null
  );
}
/* ---- Theme Context & Color Palettes ---- */
const [FR, xl] = da("useThemeContext must be used within ThemeProvider");
var kt = {
  slate: {
    50: "oklch(98.4% 0.003 247.858)",
    100: "oklch(96.8% 0.007 247.896)",
    200: "oklch(92.9% 0.013 255.508)",
    300: "oklch(86.9% 0.022 252.894)",
    400: "oklch(70.4% 0.04 256.788)",
    500: "oklch(55.4% 0.046 257.417)",
    600: "oklch(44.6% 0.043 257.281)",
    700: "oklch(37.2% 0.044 257.287)",
    800: "oklch(27.9% 0.041 260.031)",
    900: "oklch(20.8% 0.042 265.755)",
    950: "oklch(12.9% 0.042 264.695)",
  },
  gray: {
    50: "oklch(98.5% 0.002 247.839)",
    100: "oklch(96.7% 0.003 264.542)",
    200: "oklch(92.8% 0.006 264.531)",
    300: "oklch(87.2% 0.01 258.338)",
    400: "oklch(70.7% 0.022 261.325)",
    500: "oklch(55.1% 0.027 264.364)",
    600: "oklch(44.6% 0.03 256.802)",
    700: "oklch(37.3% 0.034 259.733)",
    800: "oklch(27.8% 0.033 256.848)",
    900: "oklch(21% 0.034 264.665)",
    950: "oklch(13% 0.028 261.692)",
  },
  neutral: {
    50: "oklch(98.5% 0 0)",
    100: "oklch(97% 0 0)",
    200: "oklch(92.2% 0 0)",
    300: "oklch(87% 0 0)",
    400: "oklch(70.8% 0 0)",
    500: "oklch(55.6% 0 0)",
    600: "oklch(43.9% 0 0)",
    700: "oklch(37.1% 0 0)",
    800: "oklch(26.9% 0 0)",
    900: "oklch(20.5% 0 0)",
    950: "oklch(14.5% 0 0)",
  },
  amber: {
    50: "oklch(98.7% 0.022 95.277)",
    100: "oklch(96.2% 0.059 95.617)",
    200: "oklch(92.4% 0.12 95.746)",
    300: "oklch(87.9% 0.169 91.605)",
    400: "oklch(82.8% 0.189 84.429)",
    500: "oklch(76.9% 0.188 70.08)",
    600: "oklch(66.6% 0.179 58.318)",
    700: "oklch(55.5% 0.163 48.998)",
    800: "oklch(47.3% 0.137 46.201)",
    900: "oklch(41.4% 0.112 45.904)",
    950: "oklch(27.9% 0.077 45.635)",
  },
  green: {
    50: "oklch(98.2% 0.018 155.826)",
    100: "oklch(96.2% 0.044 156.743)",
    200: "oklch(92.5% 0.084 155.995)",
    300: "oklch(87.1% 0.15 154.449)",
    400: "oklch(79.2% 0.209 151.711)",
    500: "oklch(72.3% 0.219 149.579)",
    600: "oklch(62.7% 0.194 149.214)",
    700: "oklch(52.7% 0.154 150.069)",
    800: "oklch(44.8% 0.119 151.328)",
    900: "oklch(39.3% 0.095 152.535)",
    950: "oklch(26.6% 0.065 152.934)",
  },
  emerald: {
    400: "oklch(76.5% 0.177 163.223)",
    500: "oklch(69.6% 0.17 162.48)",
    600: "oklch(59.6% 0.145 163.225)",
    700: "oklch(50.8% 0.118 165.612)",
  },
  sky: {
    400: "oklch(74.6% 0.16 232.661)",
    500: "oklch(68.5% 0.169 237.323)",
    600: "oklch(58.8% 0.158 241.966)",
    700: "oklch(50% 0.134 242.749)",
  },
  blue: {
    50: "oklch(97% 0.014 254.604)",
    100: "oklch(93.2% 0.032 255.585)",
    200: "oklch(88.2% 0.059 254.128)",
    300: "oklch(80.9% 0.105 251.813)",
    400: "oklch(70.7% 0.165 254.624)",
    500: "oklch(62.3% 0.214 259.815)",
    600: "oklch(54.6% 0.245 262.881)",
    700: "oklch(48.8% 0.243 264.376)",
    800: "oklch(42.4% 0.199 265.638)",
    900: "oklch(37.9% 0.146 265.522)",
    950: "oklch(28.2% 0.091 267.935)",
  },
  indigo: {
    50: "oklch(96.2% 0.018 272.314)",
    100: "oklch(93% 0.034 272.788)",
    200: "oklch(87% 0.065 274.039)",
    300: "oklch(78.5% 0.115 274.713)",
    400: "oklch(67.3% 0.182 276.935)",
    500: "oklch(58.5% 0.233 277.117)",
    600: "oklch(51.1% 0.262 276.966)",
    700: "oklch(45.7% 0.24 277.023)",
    800: "oklch(39.8% 0.195 277.366)",
    900: "oklch(35.9% 0.144 278.697)",
    950: "oklch(25.7% 0.09 281.288)",
  },
  purple: {
    50: "oklch(97.7% 0.014 308.299)",
    100: "oklch(94.6% 0.033 307.174)",
    200: "oklch(90.2% 0.063 306.703)",
    300: "oklch(82.7% 0.119 306.383)",
    400: "oklch(71.4% 0.203 305.504)",
    500: "oklch(62.7% 0.265 303.9)",
    600: "oklch(55.8% 0.288 302.321)",
    700: "oklch(49.6% 0.265 301.924)",
    800: "oklch(43.8% 0.218 303.724)",
    900: "oklch(38.1% 0.176 304.987)",
    950: "oklch(29.1% 0.149 302.717)",
  },
  rose: {
    50: "oklch(96.9% 0.015 12.422)",
    100: "oklch(94.1% 0.03 12.58)",
    200: "oklch(89.2% 0.058 10.001)",
    300: "oklch(81% 0.117 11.638)",
    400: "oklch(71.2% 0.194 13.428)",
    500: "oklch(64.5% 0.246 16.439)",
    600: "oklch(58.6% 0.253 17.585)",
    700: "oklch(51.4% 0.222 16.935)",
    800: "oklch(45.5% 0.188 13.697)",
    900: "oklch(41% 0.159 10.272)",
    950: "oklch(27.1% 0.105 12.094)",
  },
};
/* ---- Extended Color Schemes (with custom shades) ---- */
const fl = {
    gray: {
      ...kt.gray,
      150: "#EBEDF0",
    },
    slate: {
      ...kt.slate,
      150: "#E9EEF5",
    },
    neutral: {
      ...kt.neutral,
      150: "#EDEDED",
    },
    navy: {
      50: "#E7E9EF",
      100: "#C2C9D6",
      200: "#A5AFC4",
      300: "#6D7EA1",
      400: "#5C6B8A",
      450: "#465675",
      500: "#384766",
      600: "#313E59",
      700: "#24314A",
      750: "#222E45",
      800: "#202B40",
      900: "#182030",
    },
    mirage: {
      50: "#DDE5F5",
      100: "#B4BFD9",
      200: "#9EAAC4",
      300: "#6C7C9E",
      400: "#3D4E70",
      450: "#293859",
      500: "#1E2B47",
      600: "#1A2640",
      700: "#101A2E",
      750: "#0F1729",
      800: "#0C1221",
      900: "#050A16",
    },
    black: {
      50: "#EBEBED",
      100: "#D9D9DE",
      200: "#C5C5CC",
      300: "#93939C",
      400: "#4A4A4F",
      450: "#333338",
      500: "#242428",
      600: "#1F1F21",
      700: "#131314",
      750: "#0C0C0D",
      800: "#080809",
      900: "#000000",
    },
    mint: {
      50: "#E1E5EA",
      100: "#C5CCD3",
      200: "#A0ABB6",
      300: "#70838F",
      400: "#506877",
      450: "#384954",
      500: "#2A3942",
      600: "#242F38",
      700: "#152129",
      750: "#111B22",
      800: "#0D161C",
      900: "#0A1014",
    },
    cinder: {
      50: "#E6E7EB",
      100: "#D0D2DB",
      200: "#B7BAC4",
      300: "#838794",
      400: "#4C4F57",
      450: "#383A41",
      500: "#2A2C32",
      600: "#232429",
      700: "#1C1D21",
      750: "#1A1B1F",
      800: "#15161A",
      900: "#0E0F11",
    },
    indigo: kt.indigo,
    blue: kt.blue,
    green: kt.green,
    amber: kt.amber,
    purple: kt.purple,
    rose: kt.rose,
    variants: {
      "secondary-lighter": "#FF75DF",
      "secondary-light": "#FF2ECF",
      secondary: "#E000AD",
      "secondary-darker": "#B8008C",
      "info-lighter": kt.sky[400],
      "info-light": kt.sky[500],
      info: kt.sky[600],
      "info-darker": kt.sky[700],
      "success-lighter": kt.emerald[400],
      "success-light": kt.emerald[500],
      success: kt.emerald[600],
      "success-darker": kt.emerald[700],
      "warning-lighter": "#FFBA42",
      "warning-light": "#FFA71A",
      warning: "#F59200",
      "warning-darker": "#DB7C00",
      "error-lighter": "#FF8A5C",
      "error-light": "#FF6933",
      error: "#FF4F1A",
      "error-darker": "#E52E00",
    },
  },
/* ---- Default Theme Configuration ---- */
  ty = "cinder",
  ny = "slate",
  ay = "blue",
  XR = {
    themeMode: "system",
    isMonochrome: !1,
    themeLayout: "sideblock",
    cardSkin: "bordered",
    darkColorScheme: {
      name: ty,
      ...fl[ty],
    },
    lightColorScheme: {
      name: ny,
      ...fl[ny],
    },
    primaryColorScheme: {
      name: ay,
      ...fl[ay],
    },
    notification: {
      isExpanded: !1,
      position: "top-right",
      visibleToasts: 4,
    },
  },
  Ht = {
    ...XR,
  },
  PR = "(prefers-color-scheme: dark)",
  il = document?.documentElement;
/* ---- ThemeProvider Component ---- */
function QR({ children: children }) {
  const prefersDark = qR(PR),
    [settings, setSettings] = BR("settings", {
      themeMode: Ht.themeMode,
      themeLayout: Ht.themeLayout,
      cardSkin: Ht.cardSkin,
      isMonochrome: Ht.isMonochrome,
      darkColorScheme: Ht.darkColorScheme,
      lightColorScheme: Ht.lightColorScheme,
      primaryColorScheme: Ht.primaryColorScheme,
      notification: {
        ...Ht.notification,
      },
    }),
    isDark = (settings.themeMode === "system" && prefersDark) || settings.themeMode === "dark",
    setThemeMode = (mode) => {
      setSettings((prev) => ({
        ...prev,
        themeMode: mode,
      }));
    },
    setThemeLayout = (layout) => {
      setSettings((prev) => ({
        ...prev,
        themeLayout: layout,
      }));
    },
    setMonochromeMode = (enabled) => {
      setSettings((prev) => ({
        ...prev,
        isMonochrome: enabled,
      }));
    },
    setDarkColorScheme = (schemeName) => {
      setSettings((prev) => ({
        ...prev,
        darkColorScheme: {
          name: schemeName,
          ...fl[schemeName],
        },
      }));
    },
    setLightColorScheme = (schemeName) => {
      setSettings((prev) => ({
        ...prev,
        lightColorScheme: {
          name: schemeName,
          ...fl[schemeName],
        },
      }));
    },
    setPrimaryColorScheme = (schemeName) => {
      setSettings((prev) => ({
        ...prev,
        primaryColorScheme: {
          name: schemeName,
          ...fl[schemeName],
        },
      }));
    },
    setNotificationPosition = (position) => {
      setSettings((prev) => ({
        ...prev,
        notification: {
          ...prev.notification,
          position: position,
        },
      }));
    },
    setNotificationExpand = (expanded) => {
      setSettings((prev) => ({
        ...prev,
        notification: {
          ...prev.notification,
          isExpanded: expanded,
        },
      }));
    },
    setNotificationMaxCount = (count) => {
      setSettings((prev) => ({
        ...prev,
        notification: {
          ...prev.notification,
          visibleToasts: count,
        },
      }));
    },
    setCardSkin = (skin) => {
      setSettings((prev) => ({
        ...prev,
        cardSkin: skin,
      }));
    },
    resetTheme = () => {
      setSettings({
        themeMode: Ht.themeMode,
        themeLayout: Ht.themeLayout,
        isMonochrome: Ht.isMonochrome,
        darkColorScheme: Ht.darkColorScheme,
        lightColorScheme: Ht.lightColorScheme,
        primaryColorScheme: Ht.primaryColorScheme,
        cardSkin: Ht.cardSkin,
        notification: {
          ...Ht.notification,
        },
      });
    };
  if (
    (E.useLayoutEffect(() => {
      isDark ? il?.classList.add("dark") : il?.classList.remove("dark");
    }, [isDark]),
    E.useLayoutEffect(() => {
      settings.isMonochrome
        ? document.body.classList.add("is-monochrome")
        : document.body.classList.remove("is-monochrome");
    }, [settings.isMonochrome]),
    E.useLayoutEffect(() => {
      il.dataset.themeLight = settings.lightColorScheme.name;
    }, [settings.lightColorScheme]),
    E.useLayoutEffect(() => {
      il.dataset.themeDark = settings.darkColorScheme.name;
    }, [settings.darkColorScheme]),
    E.useLayoutEffect(() => {
      il.dataset.themePrimary = settings.primaryColorScheme.name;
    }, [settings.primaryColorScheme]),
    E.useLayoutEffect(() => {
      il.dataset.cardSkin = settings.cardSkin;
    }, [settings.cardSkin]),
    E.useLayoutEffect(() => {
      if (document) {
        document.body.dataset.layout = settings.themeLayout;
      }
    }, [settings.themeLayout]),
    !children)
  )
    return null;
  const themeContextValue = {
    ...settings,
    isDark: isDark,
    setMonochromeMode: setMonochromeMode,
    setThemeMode: setThemeMode,
    setThemeLayout: setThemeLayout,
    setLightColorScheme: setLightColorScheme,
    setDarkColorScheme: setDarkColorScheme,
    setPrimaryColorScheme: setPrimaryColorScheme,
    setNotificationPosition: setNotificationPosition,
    setNotificationExpand: setNotificationExpand,
    setNotificationMaxCount: setNotificationMaxCount,
    setCardSkin: setCardSkin,
    setSettings: setSettings,
    resetTheme: resetTheme,
  };
  return L.jsx(FR, {
    value: themeContextValue,
    children: children,
  });
}
/* ---- App Unlock Configuration ---- */
const KR = {
    unlockAt: new Date("2026-01-14T19:00:00-03:00"),
  },
/* ---- Team OP Logo SVG Component ---- */
  ZR = (svgProps) =>
    E.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "-0.884 -3.979 98.981 112.786",
        "xmlns:bx": "https://boxy-svg.com",
        ...svgProps,
      },
      E.createElement(
        "defs",
        null,
        E.createElement("bx:guide", {
          x: 177.241,
          y: -29.094,
          angle: 90,
        }),
      ),
      E.createElement(
        "g",
        {
          id: "svg1",
          transform: "matrix(1, 0, 0, 1, -107.134514, 37.231144)",
        },
        E.createElement(
          "g",
          {
            id: "layer1-8",
            transform: "matrix(1, 0, 0, 1, 219.936111, -34.573868)",
          },
          E.createElement(
            "g",
            {
              id: "g23-2-1",
              style: {
                fill: "rgb(8, 0, 41)",
                fillOpacity: 1,
              },
              transform:
                "matrix(1.123595, 0, 0, 1.123595, 290.640106, 495.618439)",
            },
            E.createElement(
              "g",
              {
                id: "layer1-4",
                transform:
                  "matrix(0.264583, 0, 0, 0.264583, 17.058146, 129.751389)",
              },
              E.createElement(
                "g",
                {
                  id: "layer1-2",
                  transform:
                    "matrix(0.990881, 0, 0, 1, -43.218922, -105.263351)",
                  style: {},
                },
                E.createElement(
                  "g",
                  {
                    id: "layer1-1",
                    transform: "translate(162.15808,227.20999)",
                  },
                  E.createElement(
                    "g",
                    {
                      id: "svg-1",
                      transform:
                        "matrix(0.758629, 0, 0, 0.758629, -863.085327, -675.94281)",
                      style: {},
                    },
                    E.createElement(
                      "g",
                      {
                        id: "layer1",
                        transform:
                          "matrix(3.394742, 0, 0, 3.363785, 292.405853, -4034.063477)",
                      },
                      E.createElement(
                        "g",
                        {
                          id: "group-1",
                          transform: "translate(-270.39718,66.736666)",
                        },
                        E.createElement(
                          "g",
                          {
                            id: "group-2",
                            style: {
                              fill: "#080029",
                              fillOpacity: 1,
                            },
                            transform:
                              "matrix(3.7795279,0,0,3.7795279,90.864482,-20.612298)",
                          },
                          E.createElement(
                            "g",
                            {
                              id: "group-3",
                              transform:
                                "matrix(0.26458331,0,0,0.26458331,-22.839982,131.78011)",
                            },
                            E.createElement(
                              "g",
                              {
                                id: "group-4",
                                transform: "translate(-50.397165,-105.26335)",
                              },
                              E.createElement(
                                "g",
                                {
                                  id: "group-5",
                                  transform: "translate(162.15808,227.20999)",
                                },
                                E.createElement(
                                  "g",
                                  {
                                    id: "layer1-8-7",
                                    transform:
                                      "translate(16.205645,-58.526693)",
                                  },
                                  E.createElement("path", {
                                    id: "rect42-3-8",
                                    style: {
                                      fill: "#ffffff",
                                      fillOpacity: 1,
                                      strokeWidth: 1.33237,
                                    },
                                    d: "m -151.94508,-44.892437 -63.87439,35.8485516 V 67.225611 l 56.53796,34.408639 V 49.106612 h -14.03082 V 70.284391 L -196.3679,56.838811 V 1.6523713 l 42.7724,-24.5670733 v 15.7886101 h 0.005 l -0.002,-15.7780801 42.77238,24.5670721 V 56.84724 l -23.05557,13.44558 V 49.106612 h -13.03929 V 101.62793 L -90.374691,67.225611 V -9.0438854 Z m -7.33643,47.266871 -14.03082,6.1028234 V 30.023448 h 14.03082 z m 12.36562,0.4399838 V 30.023448 h 13.03928 V 8.4856868 Z",
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
              ),
            ),
          ),
        ),
      ),
    ),
/* ---- Accordion Components ---- */
  [JR, IR] = da(
    "useAccordionItemContext must be used within AccordionItemProvider",
  ),
  [WR, Vv] = da("useAccordionContext must be used within AccordionProvider"),
  e3 = E.forwardRef((props, ref) => {
    const { children: children, className: className, value: itemValue, component: component, ...restProps } = props,
      isActive = Vv().isItemActive(itemValue),
      Component = component || "div";
    return L.jsx(JR, {
      value: {
        value: itemValue,
      },
      children: L.jsx(Component, {
        "data-state": isActive ? "open" : void 0,
        className:
          typeof className == "function"
            ? className({
                open: isActive,
              })
            : className,
        ref: ref,
        ...restProps,
        children:
          typeof children == "function"
            ? children({
                open: isActive,
              })
            : children,
      }),
    });
  }),
  t3 = e3;
t3.displayName = "AccordionItem";
/* ---- DOM Traversal & Keyboard Navigation Helpers ---- */
function od(element, selector) {
  let current = element;
  for (; (current = current.parentElement) && !current.matches(selector); );
  return current;
}
function gl(props) {
  return "disabled" in props
    ? !!props.disabled
    : props.getAttribute("aria-disabled") === "true";
}
function n3(currentIndex, items, shouldLoop) {
  for (let idx = currentIndex - 1; idx >= 0; idx -= 1) if (!gl(items[idx])) return idx;
  if (shouldLoop) {
    for (let idx = items.length - 1; idx > -1; idx -= 1) if (!gl(items[idx])) return idx;
  }
  return currentIndex;
}
function a3(currentIndex, items, shouldLoop) {
  for (let idx = currentIndex + 1; idx < items.length; idx += 1) if (!gl(items[idx])) return idx;
  if (shouldLoop) {
    for (let idx = 0; idx < items.length; idx += 1) if (!gl(items[idx])) return idx;
  }
  return currentIndex;
}
function r3(elementA, elementB, parentSelector) {
  return od(elementA, parentSelector) === od(elementB, parentSelector);
}
function l3({
  parentSelector: n,
  siblingSelector: r,
  onKeyDown: l,
  loop: o = !0,
  activateOnFocus: s = !1,
  dir: c = "ltr",
  orientation: f,
}) {
  return (event) => {
    l?.(event);
    const g = Array.from(
        od(event.currentTarget, n)?.querySelectorAll(r) || [],
      ).filter((item) => r3(event.currentTarget, item, n)),
      h = g.findIndex((S) => event.currentTarget === S),
      y = a3(h, g, o),
      v = n3(h, g, o);
    switch (event.key) {
      case "ArrowRight":
        break;
      case "ArrowLeft":
        break;
      case "ArrowUp": {
        event.stopPropagation();
        event.preventDefault();
        g[v].focus();
        if (s) {
          g[v].click();
        }
        break;
      }
      case "ArrowDown": {
        event.stopPropagation();
        event.preventDefault();
        g[y].focus();
        if (s) {
          g[y].click();
        }
        break;
      }
      case "Home": {
        event.stopPropagation();
        event.preventDefault();
        gl(g[0]) || g[0].focus();
        break;
      }
      case "End": {
        event.stopPropagation();
        event.preventDefault();
        const S = g.length - 1;
        gl(g[S]) || g[S].focus();
        break;
      }
    }
  };
}
const i3 = E.forwardRef((props, ref) => {
    const {
        children: children,
        className: className,
        disabled: disabled,
        onClick: onClick,
        component: component,
        onKeyDown: onKeyDown,
        ...restProps
      } = props,
      accordionCtx = Vv(),
      { value: itemValue } = IR(),
      isActive = accordionCtx.isItemActive(itemValue),
      ButtonComponent = component || "button";
    return L.jsx(ButtonComponent, {
      ...restProps,
      ref: ref,
      "data-accordion-control": !0,
      disabled: disabled,
      className:
        typeof className == "function"
          ? className({
              open: isActive,
            })
          : className,
      onClick: (event) => {
        onClick?.(event);
        accordionCtx.onChange(itemValue);
      },
      type: "button",
      "aria-expanded": isActive,
      "aria-controls": `${accordionCtx.panelId}-${itemValue}`,
      id: `${accordionCtx.buttonId}-${itemValue}`,
      onKeyDown: l3({
        siblingSelector: "[data-accordion-control]",
        parentSelector: "[data-accordion]",
        activateOnFocus: !1,
        loop: accordionCtx.loop,
        orientation: "vertical",
        onKeyDown: onKeyDown,
      }),
      children:
        typeof children == "function"
          ? children({
              open: isActive,
            })
          : children,
    });
  }),
  o3 = i3;
o3.displayName = "AccordionButton";
function s3({
  children: n,
  multiple: r = !1,
  value: l,
  defaultValue: o,
  onChange: s,
  id: c,
  transitionDuration: f,
  loop: m,
}) {
  const g = Ps(c, "accordion"),
    [h, y] = Td({
      value: l,
      defaultValue: o,
      finalValue: r ? [] : "",
      onChange: s,
    }),
    v = (w) => {
      return Array.isArray(h) ? h.includes(w) : h === w;
    },
    S = (w) => {
      const x = Array.isArray(h)
        ? h.includes(w)
          ? h.filter((item) => item !== w)
          : [...h, w]
        : w === h
          ? ""
          : w;
      y(x);
    };
  return L.jsx(WR, {
    value: {
      isItemActive: v,
      onChange: S,
      buttonId: `${g}-control`,
      panelId: `${g}-panel`,
      transitionDuration: f,
      loop: m,
    },
    children: n,
  });
}
const u3 = E.forwardRef((n, r) => {
    const {
        component: l,
        id: o,
        children: s,
        multiple: c,
        value: f,
        defaultValue: m,
        onChange: g,
        transitionDuration: h,
        loop: y,
        ...v
      } = n,
      S = l || "div";
    return L.jsx(s3, {
      id: o,
      multiple: c,
      value: f,
      defaultValue: m,
      onChange: g,
      transitionDuration: h,
      loop: y,
      children: L.jsx(S, {
        ...v,
        ref: r,
        "data-accordion": !0,
        children: s,
      }),
    });
  }),
  c3 = u3;
c3.displayName = "Accordion";
/* ---- clsx-like Class Name Utility ---- */
function Yv(n) {
  var r,
    l,
    o = "";
  if (typeof n == "string" || typeof n == "number") o += n;
  else if (typeof n == "object")
    if (Array.isArray(n)) {
      var s = n.length;
      for (r = 0; r < s; r++)
        if (n[r] && (l = Yv(n[r]))) {
          (o && (o += " "), (o += l));
        }
    } else
      for (l in n)
        if (n[l]) {
          (o && (o += " "), (o += l));
        }
  return o;
}
function he() {
  for (var n, r, l = 0, o = "", s = arguments.length; l < s; l++)
    if ((n = arguments[l]) && (r = Yv(n))) {
      (o && (o += " "), (o += r));
    }
  return o;
}
/* ---- App Constants & Route Paths ---- */
const GT = "Team OP Scanner",
  dl = "redirect",
  f3 = "/",
  d3 = "/login",
  ry = [
    "neutral",
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
  ];
function h3(n) {
  const o =
    n
      .charAt(n.length - 1)
      .toLowerCase()
      .charCodeAt(0) % ry.length;
  return ry[o];
}
const m3 = {
  primary: "this:primary",
  secondary: "this:secondary",
  info: "this:info",
  success: "this:success",
  warning: "this:warning",
  error: "this:error",
};
function At(n) {
  const r = m3[n];
  if (!r) throw new Error(`Color "${n}" not found in the color map.`);
  return r;
}
const g3 = {
    filled: "bg-this text-white",
    soft: "text-this-darker bg-this-darker/10 dark:text-this-lighter dark:bg-this-lighter/10",
  },
  p3 = {
    filled: "bg-gray-200 text-gray-700 dark:bg-surface-2 dark:text-dark-100",
    soft: "bg-gray-200/30 text-gray-700 dark:bg-surface-2/30 dark:text-dark-100",
  },
/* ---- Avatar Component ---- */
  y3 = E.forwardRef((props, ref) => {
    const {
        component: RootComponent = "div",
        imgComponent: ImgComponent = "img",
        alt: alt,
        loading: loading = "lazy",
        imgProps: imgProps,
        src: src,
        srcSet: srcSet,
        name: name,
        initialColor: initialColor = "neutral",
        initialVariant: initialVariant = "filled",
        initialProps: initialProps,
        className: className,
        classNames: classNames = {},
        children: children,
        size: size = 12,
        style: style,
        indicator: indicator,
        ...restProps
      } = props,
      initials =
        name
          ?.match(/\b(\w)/g)
          ?.slice(0, 2)
          .join("") || "",
      resolvedColor = initialColor === "auto" ? h3(initials) : (initialColor ?? "neutral");
    return L.jsxs(RootComponent, {
      className: he("avatar relative inline-flex shrink-0", className, classNames?.root),
      style: {
        height: `${size / 4}rem`,
        width: `${size / 4}rem`,
        ...style,
      },
      ref: ref,
      ...restProps,
      children: [
        src || srcSet
          ? L.jsx(ImgComponent, {
              className: he(
                "avatar-image avatar-display before:bg-gray-150 dark:before:bg-dark-600 relative h-full w-full before:absolute before:inset-0 before:rounded-[inherit]",
                classNames?.display,
                classNames?.image,
              ),
              src: src,
              srcSet: srcSet,
              alt: alt || name || "avatar",
              loading: loading,
              ...imgProps,
            })
          : L.jsx("div", {
              className: he(
                "avatar-initial avatar-display flex h-full w-full items-center justify-center font-medium uppercase select-none",
                resolvedColor !== "neutral" ? [At(resolvedColor), g3[initialVariant]] : p3[initialVariant],
                classNames?.display,
                classNames?.initial,
              ),
              ...initialProps,
              children: name ? initials : children,
            }),
        indicator,
      ],
    });
  }),
  v3 = y3;
v3.displayName = "Avatar";
const b3 = E.forwardRef(
  ({ color: n = "neutral", isPing: r, className: l, children: o, ...s }, c) =>
    L.jsxs("div", {
      className: he(
        "avatar-dot absolute rounded-full",
        n === "neutral"
          ? "bg-gray-300 dark:bg-dark-200"
          : [At(n), "bg-this dark:bg-this-light"],
        l,
      ),
      ...s,
      ref: c,
      children: [
        r &&
          L.jsx("span", {
            className:
              "absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-inherit opacity-80",
          }),
        o,
      ],
    }),
);
b3.displayName = "AvatarDot";
const S3 = {
    filled: "text-white bg-this",
    outlined:
      "border border-this/30 text-this dark:border-this-lighter/30 dark:text-this-lighter",
    soft: "text-this-darker bg-this-darker/[0.07] dark:text-this-lighter dark:bg-this-lighter/10",
  },
  E3 = {
    filled: "bg-gray-200 text-gray-900 dark:bg-surface-2 dark:text-dark-50",
    outlined:
      "border border-gray-300 text-gray-900 dark:border-surface-1 dark:text-dark-50",
    soft: "bg-gray-200/30 text-gray-900 dark:bg-dark-500/30 dark:text-dark-50",
  },
/* ---- Badge Component ---- */
  x3 = E.forwardRef((props, ref) => {
    const {
        component: component,
        className: className,
        unstyled: unstyled,
        variant: variant = "filled",
        color: color = "neutral",
        isGlow: isGlow,
        children: children,
        ...restProps
      } = props,
      Component = component || "div";
    return L.jsx(Component, {
      className: he(
        "badge-base",
        !unstyled && [
          "badge",
          color === "neutral"
            ? [
                E3[variant],
                isGlow && "dark:shadow-dark-450/50 shadow-lg shadow-gray-200/50",
              ]
            : [
                At(color),
                S3[variant],
                isGlow && "shadow-this/50 dark:shadow-this-light/50 shadow-lg",
              ],
        ],
        className,
      ),
      ref: ref,
      ...restProps,
      children: children,
    });
  }),
  w3 = x3;
w3.displayName = "Badge";
const R3 = {
    filled:
      "bg-this text-white hover:bg-this-darker focus:bg-this-darker active:bg-this-darker/90 disabled:bg-this-light dark:disabled:bg-this-darker",
    soft: "text-this-darker bg-this-darker/[.08] hover:bg-this-darker/[.15] focus:bg-this-darker/[.15] active:focus:bg-this-darker/20 dark:bg-this-lighter/10 dark:text-this-lighter dark:hover:bg-this-lighter/20 dark:focus:bg-this-lighter/20 dark:active:bg-this-lighter/25",
    outlined:
      "text-this-darker border border-this-darker hover:bg-this-darker/[.05] focus:bg-this-darker/[.05] active:bg-this-darker/10 dark:border-this-lighter dark:text-this-lighter dark:hover:bg-this-lighter/[.05] dark:focus:bg-this-lighter/[.05] dark:active:bg-this-lighter/10",
    flat: "text-this-darker hover:bg-this-darker/[.08] focus:bg-this-darker/[.08] active:bg-this-darker/[.15] dark:text-this-lighter dark:hover:bg-this-lighter/10 dark:focus:bg-this-lighter/10 dark:active:bg-this-lighter/[.15]",
  },
  _3 = {
    filled:
      "bg-gray-150 text-gray-900 hover:bg-gray-200 focus:bg-gray-200 active:bg-gray-200/80 dark:bg-surface-2 dark:text-dark-50 dark:hover:bg-surface-1 dark:focus:bg-surface-1 dark:active:bg-surface-1/90",
    soft: "bg-gray-150/30 text-gray-900 hover:bg-gray-200/[.15] focus:bg-gray-200/[.15] active:bg-gray-200/20 dark:bg-dark-500/30 dark:text-dark-50 dark:hover:bg-dark-450/[.15] dark:focus:bg-dark-450/[.15] dark:active:bg-dark-450/20",
    outlined:
      "border border-gray-300 hover:bg-gray-300/20 focus:bg-gray-300/20 text-gray-900 active:bg-gray-300/25 dark:text-dark-50 dark:hover:bg-dark-300/20 dark:focus:bg-dark-300/20 dark:active:bg-dark-300/25 dark:border-dark-450",
    flat: "hover:bg-gray-300/20 focus:bg-gray-300/20 text-gray-700 active:bg-gray-300/25 dark:text-dark-200 dark:hover:bg-dark-300/10 dark:focus:bg-dark-300/10 dark:active:bg-dark-300/20",
  },
/* ---- Button Component ---- */
  T3 = E.forwardRef((props, ref) => {
    const {
        component: component,
        className: className,
        children: children,
        color: color = "neutral",
        isIcon: isIcon = !1,
        variant: variant = "filled",
        unstyled: unstyled = !1,
        isGlow: isGlow = !1,
        type: type,
        ...otherProps
      } = props,
      Component = component || "button",
      { disabled: disabled, ...restProps } = otherProps,
      resolvedType = Component === "button" ? type || "button" : void 0;
    return L.jsx(Component, {
      ref: ref,
      type: resolvedType,
      className: he(
        "btn-base",
        unstyled
          ? color !== "neutral" && At(color)
          : [
              "btn",
              isIcon && "shrink-0 p-0",
              color === "neutral"
                ? [
                    _3[variant],
                    isGlow && "dark:shadow-dark-450/5 shadow-lg shadow-gray-200/50",
                  ]
                : [
                    At(color),
                    R3[variant],
                    isGlow &&
                      "shadow-soft shadow-this/50 dark:shadow-this/50 dark:shadow-lg",
                  ],
            ],
        className,
      ),
      disabled: Component === "button" ? disabled : void 0,
      "data-disabled": disabled,
      ...restProps,
      children: children,
    });
  }),
  O3 = T3;
O3.displayName = "Button";
/* ---- Card Component ---- */
const C3 = E.forwardRef((props, ref) => {
    const { component: component, className: className, children: children, skin: skinProp, ...restProps } = props,
      { cardSkin: themeCardSkin } = xl(),
      resolvedSkin = skinProp ?? themeCardSkin,
      Component = component || "div";
    return L.jsx(Component, {
      ref: ref,
      className: he(
        "card rounded-lg",
        resolvedSkin !== "none" && [
          resolvedSkin === "bordered" &&
            "dark:border-dark-600 border border-gray-200 print:border-0",
          resolvedSkin === "shadow" &&
            "shadow-soft dark:bg-dark-700 bg-white dark:shadow-none print:shadow-none",
        ],
        className,
      ),
      ...restProps,
      children: children,
    });
  }),
  A3 = C3;
A3.displayName = "Card";
/* ---- Circlebar (Circular Progress) Component ---- */
function ly(percent, offsetDegree, gapDegree, strokeWidth) {
  const halfSize = 50 + strokeWidth / 2,
    pathString = `M ${halfSize},${halfSize} m 0,50
      a 50,50 0 1 1 0,-100
      a 50,50 0 1 1 0,100`,
    circumference = Math.PI * 2 * 50,
    pathStyle = {
      strokeDasharray: `${(percent / 100) * (circumference - gapDegree)}px 800px`,
      strokeDashoffset: `-${gapDegree / 2}px`,
      transformOrigin: offsetDegree ? "center" : void 0,
      transform: offsetDegree ? `rotate(${offsetDegree}deg)` : void 0,
    };
  return {
    pathString: pathString,
    pathStyle: pathStyle,
  };
}
function D3() {
  const n = Math.random().toString(36).substring(2, 11),
    r = Date.now().toString(36).slice(-4);
  return `tl-${n}-${r}`;
}
const L3 = E.forwardRef(
  (
    {
      value: n,
      isIndeterminate: r = !1,
      offsetDegree: l,
      gapDegree: o = 0,
      gapOffsetDegree: s = 0,
      strokeWidth: c = 6,
      strokeLinecap: f = "round",
      isActive: m = !1,
      size: g = 24,
      showRail: h = !0,
      children: y,
      color: v = "neutral",
      variant: S = "default",
      contentProps: w = {},
      rootProps: x = {},
      wrapperProps: _ = {},
      className: A,
      classNames: z = {},
      gradient: M,
      ...F
    },
    te,
  ) => {
    if (!r && n === void 0) {
      console.error(`Circlebar Error: 'value' prop is required when 'isIndeterminate' is false.
      Please provide a number value between 0-100 to display the progress circle.`);
    }
    if (S === "gradient" && !M) {
      console.error(`Circlebar Error: 'gradient' prop is required when 'variant' is "gradient".
      Please provide a gradient config with { start: string, end: string } format.`);
    }
    if (n !== void 0 && (n < 0 || n > 100)) {
      console.warn(`Circlebar Warning: 'value' should be between 0 and 100, got ${n}.
      Values outside this range may cause unexpected display issues.`);
    }
    const U = `gradient-${D3()}`,
      W = 100 + c,
      { pathString: D, pathStyle: le } = E.useMemo(
        () => ly(100, 0, o, c),
        [o, c],
      ),
      { pathString: ie, pathStyle: ue } = E.useMemo(
        () => ly(n || 0, l, o, c),
        [o, l, c, n],
      ),
      { cardSkin: ce } = xl(),
      Ee = [
        S === "gradient"
          ? ""
          : v === "neutral"
            ? "stroke-gray-500 dark:stroke-dark-450"
            : [At(v), "stroke-this dark:stroke-this-light"],
      ];
    return L.jsx("div", {
      className: he("max-w-full", z?.root),
      ...x,
      ref: te,
      children: L.jsxs("div", {
        ..._,
        className: he("circlebar-wrapper relative inline-block", z?.wrapper),
        style: {
          width: `${g / 4}rem`,
          height: `${g / 4}rem`,
        },
        children: [
          L.jsxs("svg", {
            style: {
              transform: s ? `rotate(${s}deg)` : void 0,
            },
            viewBox: `0 0 ${W} ${W}`,
            className: he(
              "circlebar-svg",
              r && "circlebar-indeterminate-wrapper",
              A,
              z?.svg,
            ),
            ...F,
            children: [
              h &&
                L.jsx("path", {
                  d: D,
                  strokeWidth: c,
                  strokeLinecap: f,
                  fill: "none",
                  style: le,
                  className: he("circlebar-rail-path", [
                    v === "neutral" || S !== "soft"
                      ? [
                          "stroke-gray-150",
                          ce === "shadow"
                            ? "dark:stroke-dark-900"
                            : "dark:stroke-dark-700",
                        ]
                      : [At(v), "stroke-this/[.15] dark:stroke-this-light/20"],
                  ]),
                }),
              r
                ? L.jsx("circle", {
                    cx: W / 2,
                    cy: W / 2,
                    r: "50",
                    fill: "none",
                    strokeWidth: c,
                    className: he("circlebar-indeterminate", Ee),
                    stroke: S === "gradient" ? `url(#${U})` : void 0,
                  })
                : L.jsxs(L.Fragment, {
                    children: [
                      L.jsx("path", {
                        d: ie,
                        strokeWidth: c,
                        strokeLinecap: f,
                        fill: "none",
                        style: {
                          ...ue,
                          transitionProperty: "stroke-dasharray",
                          transitionDuration: "200ms",
                        },
                        className: he("circlebar-inner-path ease-out", Ee),
                        stroke: S === "gradient" ? `url(#${U})` : void 0,
                      }),
                      m &&
                        L.jsx("path", {
                          d: ie,
                          strokeWidth: c,
                          strokeLinecap: f,
                          fill: "none",
                          style: {
                            ...ue,
                            "--dashoffset": `${((n || 0) / 100) * (Math.PI * 100 - o)}px`,
                            transformOrigin: "center",
                            transform: `rotate(${(o / 2) * 1.15}deg)`,
                          },
                          className: "circlebar-active-path stroke-white",
                        }),
                    ],
                  }),
              S === "gradient" &&
                M &&
                L.jsx("defs", {
                  children: L.jsxs("linearGradient", {
                    id: U,
                    x1: "0%",
                    y1: "0%",
                    x2: "100%",
                    y2: "0%",
                    children: [
                      L.jsx("stop", {
                        offset: "0%",
                        style: {
                          stopColor: M.start,
                          stopOpacity: 1,
                        },
                      }),
                      L.jsx("stop", {
                        offset: "100%",
                        style: {
                          stopColor: M.end,
                          stopOpacity: 1,
                        },
                      }),
                    ],
                  }),
                }),
            ],
          }),
          E.Children.count(y) > 0 &&
            L.jsx("div", {
              className: he(
                "absolute inset-0 flex items-center justify-center",
                z?.content,
              ),
              ...w,
              children: y,
            }),
        ],
      }),
    });
  },
);
L3.displayName = "Circlebar";
/* ---- Collapse Component ---- */
const N3 = E.forwardRef((n, r) => {
    const {
        children: l,
        in: o,
        transitionDuration: s,
        transitionTimingFunction: c,
        min: f,
        style: m,
        onTransitionEnd: g,
        component: h = "div",
        className: y,
        ...v
      } = n,
      S = wR({
        opened: o,
        transitionDuration: s,
        transitionTimingFunction: c,
        min: f,
        onTransitionEnd: g,
      });
    if (s === 0)
      return o
        ? L.jsx(oy, {
            component: h,
            ref: r,
            className: y,
            ...v,
            children: l,
          })
        : null;
    const w = S({
      style: m,
      className: y,
      ref: r,
      ...v,
    });
    return L.jsx(oy, {
      component: h,
      ...w,
      children: l,
    });
  }),
  M3 = N3;
M3.displayName = "Collapse";
/* ---- Pagination Components ---- */
const [z3, Qs] = da("Pagination component was not found in tree");
function $a(n, r, l = 1) {
  const o = [];
  for (let s = n; l > 0 ? s <= r : s >= r; s += l) o.push(s);
  return o;
}
const gs = "dots";
function k3({
  total: n,
  siblings: r = 1,
  boundaries: l = 1,
  page: o,
  initialPage: s = 1,
  onChange: c,
}) {
  const f = Math.max(Math.trunc(n), 0),
    [m, g] = Td({
      value: o,
      onChange: c,
      defaultValue: s,
      finalValue: s,
    }),
    h = (_) => {
      _ <= 0 ? g(1) : _ > f ? g(f) : g(_);
    },
    y = () => h(m + 1),
    v = () => h(m - 1),
    S = () => h(1),
    w = () => h(f);
  return {
    range: E.useMemo(() => {
      if (r * 2 + 3 + l * 2 >= f) return $a(1, f);
      const A = Math.max(m - r, l),
        z = Math.min(m + r, f - l),
        M = A > l + 2,
        F = z < f - (l + 1);
      if (!M && F) {
        const te = r * 2 + l + 2;
        return [...$a(1, te), gs, ...$a(f - (l - 1), f)];
      }
      if (M && !F) {
        const te = l + 1 + 2 * r;
        return [...$a(1, l), gs, ...$a(f - te, f)];
      }
      return [...$a(1, l), gs, ...$a(A, z), gs, ...$a(f - l + 1, f)];
    }, [r, l, f, m]),
    active: m,
    setPage: h,
    next: y,
    previous: v,
    first: S,
    last: w,
  };
}
function ps(n, r) {
  return (l) => {
    n?.(l);
    r?.(l);
  };
}
const FT = E.forwardRef((n, r) => {
  const {
      total: l,
      value: o,
      defaultValue: s,
      onChange: c,
      disabled: f,
      getItemProps: m,
      className: g,
      classNames: h = {},
      siblings: y = 1,
      boundaries: v = 1,
      children: S,
      onNextPage: w,
      onPreviousPage: x,
      onFirstPage: _,
      onLastPage: A,
    } = n,
    {
      range: z,
      setPage: M,
      next: F,
      previous: te,
      active: U,
      first: W,
      last: D,
    } = k3({
      page: o,
      initialPage: s,
      onChange: c,
      total: l,
      siblings: y,
      boundaries: v,
    }),
    le = ps(w, F),
    ie = ps(x, te),
    ue = ps(_, W),
    ce = ps(A, D);
  return l <= 0
    ? null
    : L.jsx(z3, {
        value: {
          total: l,
          range: z,
          active: U,
          disabled: f,
          classNames: h,
          onChange: M,
          onNext: le,
          onPrevious: ie,
          onFirst: ue,
          onLast: ce,
          getItemProps: m,
        },
        children: L.jsx("div", {
          ref: r,
          className: he(
            "pagination hide-scrollbar max-w-full overflow-x-auto",
            g,
            h?.root,
          ),
          children: S,
        }),
      });
});
function j3({ title: n, titleId: r, ...l }, o) {
  return E.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: o,
        "aria-labelledby": r,
      },
      l,
    ),
    n
      ? E.createElement(
          "title",
          {
            id: r,
          },
          n,
        )
      : null,
    E.createElement("path", {
      fillRule: "evenodd",
      d: "M4.72 9.47a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 1 0 1.06-1.06L6.31 10l3.72-3.72a.75.75 0 1 0-1.06-1.06L4.72 9.47Zm9.25-4.25L9.72 9.47a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 1 0 1.06-1.06L11.31 10l3.72-3.72a.75.75 0 0 0-1.06-1.06Z",
      clipRule: "evenodd",
    }),
  );
}
const U3 = E.forwardRef(j3);
function H3({ title: n, titleId: r, ...l }, o) {
  return E.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: o,
        "aria-labelledby": r,
      },
      l,
    ),
    n
      ? E.createElement(
          "title",
          {
            id: r,
          },
          n,
        )
      : null,
    E.createElement("path", {
      fillRule: "evenodd",
      d: "M15.28 9.47a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L13.69 10 9.97 6.28a.75.75 0 0 1 1.06-1.06l4.25 4.25ZM6.03 5.22l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L8.69 10 4.97 6.28a.75.75 0 0 1 1.06-1.06Z",
      clipRule: "evenodd",
    }),
  );
}
const B3 = E.forwardRef(H3);
function $3({ title: n, titleId: r, ...l }, o) {
  return E.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: o,
        "aria-labelledby": r,
      },
      l,
    ),
    n
      ? E.createElement(
          "title",
          {
            id: r,
          },
          n,
        )
      : null,
    E.createElement("path", {
      fillRule: "evenodd",
      d: "M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z",
      clipRule: "evenodd",
    }),
  );
}
const q3 = E.forwardRef($3);
function V3({ title: n, titleId: r, ...l }, o) {
  return E.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: o,
        "aria-labelledby": r,
      },
      l,
    ),
    n
      ? E.createElement(
          "title",
          {
            id: r,
          },
          n,
        )
      : null,
    E.createElement("path", {
      fillRule: "evenodd",
      d: "M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z",
      clipRule: "evenodd",
    }),
  );
}
const Y3 = E.forwardRef(V3);
function G3({ title: n, titleId: r, ...l }, o) {
  return E.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: o,
        "aria-labelledby": r,
      },
      l,
    ),
    n
      ? E.createElement(
          "title",
          {
            id: r,
          },
          n,
        )
      : null,
    E.createElement("path", {
      fillRule: "evenodd",
      d: "M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z",
      clipRule: "evenodd",
    }),
  );
}
const F3 = E.forwardRef(G3);
function X3({ title: n, titleId: r, ...l }, o) {
  return E.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: o,
        "aria-labelledby": r,
      },
      l,
    ),
    n
      ? E.createElement(
          "title",
          {
            id: r,
          },
          n,
        )
      : null,
    E.createElement("path", {
      d: "M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
    }),
  );
}
const P3 = E.forwardRef(X3),
  Q3 = E.forwardRef((n, r) => {
    const {
        component: l,
        active: o,
        className: s,
        disabled: c,
        children: f,
        ...m
      } = n,
      g = Qs(),
      h = l || "button";
    return L.jsx(h, {
      ...m,
      ref: r,
      disabled: c,
      "data-active": o || void 0,
      "data-disabled": c || void 0,
      className: he(
        "pagination-control cursor-pointer",
        [
          o
            ? "active this:primary bg-this disabled:bg-this-light dark:bg-this-light dark:disabled:bg-this-darker text-white disabled:cursor-not-allowed disabled:opacity-60"
            : [
                c
                  ? "disabled:cursor-not-allowed disabled:opacity-60"
                  : "dark:hover:bg-surface-1 dark:focus-visible:bg-surface-1 dark:active:bg-surface-1/90 hover:bg-gray-300 focus-visible:bg-gray-300 active:bg-gray-300/80",
              ],
        ],
        g.classNames?.control,
        s,
      ),
      children: f,
    });
  }),
  Od = Q3;
Od.displayName = "PaginationControl";
function Ks({ icon: n, type: r, action: l }) {
  function o({ Icon: s = n, ...c }) {
    const f = Qs(),
      m = r === "next" ? f.active === f.total : f.active === 1;
    return L.jsx(Od, {
      disabled: f.disabled || m,
      onClick: f[l],
      className: he("pagination-control-icon", f.classNames?.controlIcon),
      ...c,
      children: L.jsx(s, {
        className: he("pagination-icon rtl:rotate-180", f.classNames?.icon),
      }),
    });
  }
  return (
    (o.displayName = "Pagination" + r.charAt(0).toUpperCase() + r.slice(1)),
    o
  );
}
const XT = Ks({
    icon: F3,
    type: "next",
    action: "onNext",
  }),
  PT = Ks({
    icon: Y3,
    type: "previous",
    action: "onPrevious",
  });
Ks({
  icon: U3,
  type: "previous",
  action: "onFirst",
});
Ks({
  icon: B3,
  type: "next",
  action: "onLast",
});
const Gv = ({ icon: n }) => {
  const r = n || P3,
    l = Qs();
  return L.jsx("div", {
    className: he(
      "pagination-control pagination-control-icon",
      l.classNames?.control,
      l.classNames?.controlIcon,
    ),
    children: L.jsx(r, {
      className: he("pagination-icon", l.classNames?.icon),
    }),
  });
};
Gv.displayName = "PaginationDots";
function K3() {
  const n = Qs(),
    r = n.range.map((item, index) =>
      typeof item == "number"
        ? L.jsx(
            Od,
            {
              active: item === n.active,
              "aria-current": item === n.active ? "page" : void 0,
              onClick: () => n.onChange(item),
              disabled: n.disabled,
              ...n.getItemProps?.(item),
              children: item,
            },
            index,
          )
        : L.jsx(Gv, {}, index),
    );
  return L.jsx(L.Fragment, {
    children: r,
  });
}
K3.displayName = "PaginationItems";
/* ---- Progress Bar Component ---- */
const Fv = E.forwardRef((n, r) => {
  const {
    children: l,
    value: o = 0,
    showRail: s = !0,
    isActive: c = !1,
    isIndeterminate: f = !1,
    unstyled: m = !1,
    color: g = "neutral",
    variant: h = "default",
    className: y,
    classNames: v,
    animationDuration: S,
    style: w = {},
    rootProps: x = {},
    ..._
  } = n;
  return L.jsx("div", {
    ...x,
    className: he(
      "progress-rail",
      s &&
        !m && [
          g === "neutral" || h !== "soft"
            ? "bg-gray-150 dark:bg-dark-500"
            : [At(g), "bg-this/[.15] dark:bg-this-light/25"],
        ],
      y,
      v?.root,
    ),
    children: L.jsx("div", {
      ref: r,
      ..._,
      className: he(
        "progress relative rounded-full transition-[width] ease-out",
        !m && [
          g === "neutral"
            ? "dark:bg-dark-400 bg-gray-500"
            : [At(g), "bg-this dark:bg-this-light"],
        ],
        c && "is-active",
        f ? "is-indeterminate" : "flex items-center justify-end leading-none",
        v?.bar,
      ),
      style: {
        width: f ? "100%" : `${o}%`,
        animationDuration: S,
        ...w,
      },
      children: l,
    }),
  });
});
Fv.displayName = "Progress";
/* ---- ScrollShadow Component ---- */
const Z3 = E.forwardRef((n, r) => {
    const {
        component: l,
        children: o,
        className: s,
        size: c = 10,
        offset: f = 0,
        isEnabled: m = !0,
        orientation: g = "vertical",
        style: h,
        ...y
      } = n,
      { ref: v } = _R({
        offset: f,
        isEnabled: m,
        overflowCheck: g,
      }),
      S = qv(v, r),
      w = l || "div";
    return L.jsx(w, {
      ref: S,
      "data-orientation": g,
      className: he(
        g === "vertical" && "overflow-y-auto",
        g === "horizontal" && "overflow-x-auto",
        g === "both" && "overflow-auto",
        s,
      ),
      style: {
        "--scroll-shadow-size": `${c / 4}rem`,
        ...h,
      },
      ...y,
      children: o,
    });
  }),
  J3 = Z3;
J3.displayName = "ScrollShadow";
/* ---- Skeleton Component ---- */
const I3 = E.forwardRef((n, r) => {
  const { animate: l = !0, className: o, ...s } = n;
  return L.jsx("div", {
    className: he(
      "skeleton relative overflow-hidden",
      l && "animate-wave before:absolute before:inset-0",
      o,
    ),
    ref: r,
    ...s,
  });
});
I3.displayName = "Skeleton";
/* ---- Spinner Component ---- */
const Xv = E.forwardRef(
  (
    {
      className: n,
      animate: r = !0,
      isElastic: l,
      disabled: o,
      variant: s = "default",
      color: c = "neutral",
      unstyled: f,
      ...m
    },
    g,
  ) =>
    s === "default" || s === "soft"
      ? L.jsx("div", {
          ref: g,
          className: he(
            "spinner spinner-base rounded-full",
            l && "is-elastic",
            r && !o && "animate-spin",
            o && "opacity-50",
            !f && [
              s === "default"
                ? [
                    c === "neutral"
                      ? "border-gray-500 dark:border-dark-400"
                      : [At(c), "border-this dark:border-this-light"],
                    "border-r-transparent dark:border-r-transparent",
                  ]
                : [
                    c === "neutral"
                      ? "border-gray-150 border-r-gray-500 dark:border-dark-500 dark:border-r-dark-400"
                      : [
                          At(c),
                          "border-this/30 border-r-this dark:border-this-light/30 dark:border-r-this-light",
                        ],
                  ],
            ],
            n,
          ),
          "aria-disabled": o,
          ...m,
        })
      : L.jsx("div", {
          ref: g,
          className: he(
            "spinner-base",
            l && "is-elastic",
            r && !o && "animate-spin",
            o && "opacity-50",
            !f && [
              c === "neutral"
                ? "text-gray-500 dark:text-dark-400"
                : [At(c), "text-this dark:text-this-light"],
            ],
            n,
          ),
          "aria-disabled": o,
          ...m,
          children: L.jsx("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            className: "h-full w-full",
            viewBox: "0 0 28 28",
            children: L.jsx("path", {
              fill: "currentColor",
              fillRule: "evenodd",
              d: "M28 14c0 7.732-6.268 14-14 14S0 21.732 0 14 6.268 0 14 0s14 6.268 14 14zm-2.764.005c0 6.185-5.014 11.2-11.2 11.2-6.185 0-11.2-5.015-11.2-11.2 0-6.186 5.015-11.2 11.2-11.2 6.186 0 11.2 5.014 11.2 11.2zM8.4 16.8a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z",
              clipRule: "evenodd",
            }),
          }),
        }),
);
Xv.displayName = "Spinner";
const W3 = E.forwardRef((n, r) => {
  const { variant: l = "default", className: o, ...s } = n;
  return L.jsx(Xv, {
    unstyled: !0,
    className: he(
      "ghost-spinner",
      {
        "border-white border-r-transparent": l === "default",
        "border-white/30 border-r-white": l === "soft",
        "text-white": l === "innerDot",
      },
      o,
    ),
    variant: l,
    ref: r,
    ...s,
  });
});
W3.displayName = "GhostSpinner";
const e_ = E.forwardRef((n, r) => {
    const {
        component: l,
        children: o,
        className: s,
        hoverable: c,
        zebra: f,
        dense: m,
        sticky: g,
        ...h
      } = n,
      y = l || "table";
    return L.jsx(y, {
      className: he(
        "table",
        c && "is-hoverable",
        f && "is-zebra",
        m && "is-dense",
        g && "is-sticky",
        s,
      ),
      ref: r,
      ...h,
      children: o,
    });
  }),
  t_ = e_;
t_.displayName = "Table";
function wl({ className: n, component: r }) {
  function l({ component: o, className: s, children: c, ...f }) {
    const m = o || r;
    return L.jsx(m, {
      className: he(n, s),
      ...f,
      children: c,
    });
  }
  return ((l.displayName = typeof r == "string" ? r : "TableComponent"), l);
}
const QT = wl({
    className: "table-tbody group/tbody",
    component: "tbody",
  }),
  KT = wl({
    className: "table-thead group/thead",
    component: "thead",
  });
wl({
  className: "table-tfoot group/tfoot",
  component: "tfoot",
});
const ZT = wl({
    className: "table-tr group/tr",
    component: "tr",
  }),
  JT = wl({
    className: "table-th group/th",
    component: "th",
  }),
  IT = wl({
    className: "table-td group/td",
    component: "td",
  }),
  n_ = {
    filled:
      "bg-this text-white hover:bg-this-darker focus:bg-this-darker active:bg-this-darker/90 disabled:bg-this-light dark:disabled:bg-this-darker",
    outlined:
      "border border-gray-300 dark:border-dark-450 text-this hover:border-this focus:border-this dark:border-this-lighter/30 dark:text-this-lighter dark:hover:border-this-lighter dark:focus:border-this-lighter",
    soft: "text-this-darker bg-this-darker/[0.07] hover:text-white hover:bg-this-darker focus:text-white focus:bg-this-darker dark:text-this-lighter dark:bg-this-lighter/[.13] dark:hover:bg-this dark:hover:text-white dark:focus:bg-this dark:focus:text-white",
  },
  a_ = {
    filled:
      "bg-gray-150 text-gray-900 hover:bg-gray-200 focus:bg-gray-200 active:bg-gray-200/80 dark:bg-surface-2 dark:text-dark-100 dark:hover:bg-surface-1 dark:focus:bg-surface-1 dark:active:bg-surface-1/90",
    outlined:
      "border border-gray-300 text-gray-800 hover:border-gray-800 focus:border-gray-800 dark:border-surface-2 dark:text-dark-100 dark:hover:border-dark-100 dark:focus:border-dark-100",
    soft: "text-this-darker bg-gray-150/10 hover:text-gray-900 focus:text-gray-900 hover:bg-gray-150 focus:bg-gray-150 active:bg-gray-150/80 dark:text-dark-100 dark:bg-dark-500/10 dark:hover:bg-dark-500 dark:focus:bg-dark-500 dark:active:bg-dark-500/80",
  },
  r_ = E.forwardRef((n, r) => {
    const {
        component: l,
        className: o,
        children: s,
        color: c = "neutral",
        unstyled: f,
        variant: m = "filled",
        isGlow: g,
        ...h
      } = n,
      y = l || "a";
    return L.jsx(y, {
      className: he(
        "tag-base",
        !f && [
          "tag",
          c === "neutral"
            ? [
                a_[m],
                g && "dark:shadow-dark-450/50 shadow-lg shadow-gray-200/50",
              ]
            : [
                At(c),
                n_[m],
                g && "shadow-this/50 dark:shadow-this-light/50 shadow-lg",
              ],
        ],
        o,
      ),
      ref: r,
      ...h,
      children: s,
    });
  }),
  l_ = r_;
l_.displayName = "Tag";
const [WT, i_] = da("useTimelineContext must be used within TimelineProvider");
var Os = {
    exports: {},
  },
  o_ = Os.exports,
  iy;
function s_() {
  return (
    iy ||
      ((iy = 1),
      (function (n, r) {
        (function (l, o) {
          n.exports = o();
        })(o_, function () {
          return function (l, o, s) {
            l = l || {};
            var c = o.prototype,
              f = {
                future: "in %s",
                past: "%s ago",
                s: "a few seconds",
                m: "a minute",
                mm: "%d minutes",
                h: "an hour",
                hh: "%d hours",
                d: "a day",
                dd: "%d days",
                M: "a month",
                MM: "%d months",
                y: "a year",
                yy: "%d years",
              };
            function m(h, y, v, S) {
              return c.fromToBase(h, y, v, S);
            }
            s.en.relativeTime = f;
            c.fromToBase = function (h, y, v, S, w) {
              for (
                var x,
                  _,
                  A,
                  z = v.$locale().relativeTime || f,
                  M = l.thresholds || [
                    {
                      l: "s",
                      r: 44,
                      d: "second",
                    },
                    {
                      l: "m",
                      r: 89,
                    },
                    {
                      l: "mm",
                      r: 44,
                      d: "minute",
                    },
                    {
                      l: "h",
                      r: 89,
                    },
                    {
                      l: "hh",
                      r: 21,
                      d: "hour",
                    },
                    {
                      l: "d",
                      r: 35,
                    },
                    {
                      l: "dd",
                      r: 25,
                      d: "day",
                    },
                    {
                      l: "M",
                      r: 45,
                    },
                    {
                      l: "MM",
                      r: 10,
                      d: "month",
                    },
                    {
                      l: "y",
                      r: 17,
                    },
                    {
                      l: "yy",
                      d: "year",
                    },
                  ],
                  F = M.length,
                  te = 0;
                te < F;
                te += 1
              ) {
                var U = M[te];
                if (U.d) {
                  x = S ? s(h).diff(v, U.d, !0) : v.diff(h, U.d, !0);
                }
                var W = (l.rounding || Math.round)(Math.abs(x));
                if (((A = x > 0), W <= U.r || !U.r)) {
                  if (W <= 1 && te > 0) {
                    U = M[te - 1];
                  }
                  var D = z[U.l];
                  if (w) {
                    W = w("" + W);
                  }
                  _ =
                    typeof D == "string" ? D.replace("%d", W) : D(W, y, U.l, A);
                  break;
                }
              }
              if (y) return _;
              var le = A ? z.future : z.past;
              return typeof le == "function" ? le(_) : le.replace("%s", _);
            };
            c.to = function (h, y) {
              return m(h, y, this, !0);
            };
            c.from = function (h, y) {
              return m(h, y, this);
            };
            var g = function (h) {
              return h.$u ? s.utc() : s();
            };
            c.toNow = function (h) {
              return this.to(g(this), h);
            };
            c.fromNow = function (h) {
              return this.from(g(this), h);
            };
          };
        });
      })(Os)),
    Os.exports
  );
}
var u_ = s_();
const c_ = ji(u_);
Rd.extend(c_);
const f_ = {
    filled: "bg-this dark:bg-this-light",
    outlined: "border-2 border-this dark:border-this-light",
  },
  d_ = {
    filled: "bg-gray-300 dark:bg-dark-400",
    outlined: "border-2 border-gray-300 dark:border-dark-400",
  },
  h_ = E.forwardRef(
    (
      {
        children: n,
        title: r,
        time: l,
        point: o,
        color: s = "neutral",
        variant: c,
        className: f,
        classNames: m = {},
        isPing: g,
        ...h
      },
      y,
    ) => {
      const { locale: v } = bR(),
        S = i_(),
        w = c || S.variant,
        x = Rd(l).locale(v).fromNow(),
        _ = L.jsx("div", {
          className: he(
            "timeline-item-point relative flex shrink-0 items-center justify-center rounded-full",
            s === "neutral" ? d_[w] : [At(s), f_[w]],
            m?.point,
          ),
          children:
            g &&
            L.jsx("span", {
              className:
                "inline-flex h-full w-full animate-ping rounded-full bg-inherit opacity-80",
            }),
        });
      return L.jsxs("div", {
        className: he("timeline-item", f, m?.root),
        ref: y,
        ...h,
        children: [
          o || _,
          L.jsxs("div", {
            className: he("timeline-item-content-wrappper", m?.contentWrapper),
            children: [
              L.jsxs("div", {
                className: "flex flex-col pb-1.5",
                children: [
                  r &&
                    L.jsx("h3", {
                      className: he(
                        "dark:text-dark-100 pb-1.5 leading-none font-medium text-gray-600",
                        m?.title,
                      ),
                      children: r,
                    }),
                  l &&
                    L.jsx("span", {
                      className: he(
                        "dark:text-dark-300 text-xs text-gray-400",
                        m?.time,
                      ),
                      children: x,
                    }),
                ],
              }),
              L.jsx("div", {
                className: he("timeline-item-content py-1", m?.content),
                children: n,
              }),
            ],
          }),
        ],
      });
    },
  );
h_.displayName = "TimelineItem";
function oy({ component: n, className: r, ...l }) {
  const o = n || "div";
  return L.jsx(o, {
    className: he("relative break-words print:border", r),
    ...l,
  });
}
function Cd({ when: n, wrapper: r, children: l }) {
  return n
    ? r(l)
    : L.jsx(L.Fragment, {
        children: l,
      });
}
const m_ =
    "before:[mask-image:var(--tw-thumb)] before:bg-gray-400 border-gray-150 bg-gray-150 pointer-events-none select-none opacity-70 dark:bg-dark-450 dark:border-dark-450 dark:before:bg-dark-800 dark:opacity-60",
  g_ = {
    basic:
      "border-gray-400/70 bg-origin-border before:bg-center before:bg-no-repeat before:[background-size:100%_100%] before:[background-image:var(--tw-thumb)] checked:border-this checked:bg-this indeterminate:border-this indeterminate:bg-this hover:border-this focus:border-this dark:border-dark-400 dark:checked:border-this-light dark:checked:bg-this-light dark:indeterminate:border-this-light dark:indeterminate:bg-this-light dark:hover:border-this-light dark:focus:border-this-light",
    outlined:
      "border-gray-400/70 before:bg-this before:[mask-image:var(--tw-thumb)] checked:border-this hover:border-this focus:border-this dark:border-dark-400 dark:hover:border-this-light dark:focus:border-this-light dark:before:bg-this-light dark:checked:border-this-light",
  },
  p_ = E.forwardRef(
    (
      {
        variant: n = "basic",
        unstyled: r,
        color: l = "primary",
        type: o = "checkbox",
        className: s,
        classNames: c = {},
        label: f,
        disabled: m,
        indeterminate: g,
        labelProps: h,
        ...y
      },
      v,
    ) => {
      const S = E.useRef(null);
      return (
        E.useEffect(() => {
          if (S.current) {
            S.current.indeterminate = !!g;
          }
        }, [g]),
        L.jsx(Cd, {
          when: !!f,
          wrapper: (w) =>
            L.jsxs("label", {
              className: he(
                "input-label inline-flex items-center gap-2",
                c?.label,
              ),
              ...h,
              children: [
                w,
                L.jsx("span", {
                  className: he("label", c?.labelText),
                  children: f,
                }),
              ],
            }),
          children: L.jsx("input", {
            className: he(
              "form-checkbox",
              !r && [At(l), m ? m_ : g_[n]],
              s,
              c?.input,
            ),
            disabled: m,
            "data-disabled": m,
            "data-indeterminate": g,
            ref: _d(S, v),
            type: o,
            ...y,
          }),
        })
      );
    },
  );
p_.displayName = "Checkbox";
function Ad({ when: n, children: r, className: l }) {
  return n
    ? L.jsx("span", {
        className: he(
          "input-text-error mt-1 text-xs text-error dark:text-error-lighter",
          l,
        ),
        children: r,
      })
    : null;
}
const y_ = E.forwardRef(
  (
    {
      className: n,
      color: r = "neutral",
      thumbSize: l,
      trackSize: o,
      style: s,
      ...c
    },
    f,
  ) =>
    L.jsx("input", {
      type: "range",
      className: he(
        "form-range",
        r === "neutral"
          ? "text-gray-500 dark:text-dark-300"
          : [At(r), "text-this dark:text-this-light"],
        n,
      ),
      ref: f,
      style: {
        "--thumb-size": l,
        "--track-h": o,
        ...s,
      },
      ...c,
    }),
);
y_.displayName = "Range";
const v_ =
    "before:[mask-image:var(--tw-thumb)] before:bg-gray-400 border-gray-150 bg-gray-150 pointer-events-none select-none opacity-70 dark:bg-dark-450 dark:border-dark-450 dark:before:bg-dark-800 dark:opacity-60",
  b_ = {
    basic:
      "border-gray-400/70 bg-origin-border before:bg-center before:bg-no-repeat before:[background-size:100%_100%] before:[background-image:var(--tw-thumb)] checked:border-this checked:bg-this hover:border-this focus:border-this dark:border-dark-400 dark:checked:border-this-light dark:checked:bg-this-light dark:hover:border-this-light dark:focus:border-this-light",
    outlined:
      "border-gray-400/70 before:bg-this before:[mask-image:var(--tw-thumb)] checked:border-this hover:border-this focus:border-this dark:border-dark-400 dark:hover:border-this-light dark:focus:border-this-light dark:before:bg-this-light dark:checked:border-this-light",
  },
  S_ = E.forwardRef(
    (
      {
        variant: n = "basic",
        unstyled: r,
        color: l = "primary",
        className: o,
        classNames: s = {},
        label: c,
        disabled: f,
        labelProps: m,
        ...g
      },
      h,
    ) =>
      L.jsx(Cd, {
        when: !!c,
        wrapper: (y) =>
          L.jsxs("label", {
            className: he(
              "input-label inline-flex items-center gap-2",
              s?.label,
            ),
            ...m,
            children: [
              y,
              L.jsx("span", {
                className: he("label", s?.labelText),
                children: c,
              }),
            ],
          }),
        children: L.jsx("input", {
          className: he(
            "form-radio",
            !r && [At(l), f ? v_ : b_[n]],
            o,
            s?.input,
          ),
          disabled: f,
          "data-disabled": f,
          type: "radio",
          ref: h,
          ...g,
        }),
      }),
  );
S_.displayName = "Radio";
const E_ = E.forwardRef((n, r) => {
    const {
        component: l,
        label: o,
        prefix: s,
        suffix: c,
        description: f,
        className: m,
        classNames: g = {},
        error: h,
        unstyled: y,
        disabled: v,
        type: S = "text",
        rootProps: w,
        labelProps: x,
        id: _,
        ...A
      } = n,
      z = l || "input",
      M = Ps(_, "input"),
      F = he(
        "absolute top-0 flex h-full w-9 items-center justify-center transition-colors",
        h
          ? "text-error dark:text-error-light"
          : "peer-focus:text-primary-600 dark:text-dark-300 dark:peer-focus:text-primary-500 text-gray-400",
      );
    return L.jsxs("div", {
      className: he("input-root", g.root),
      ...w,
      children: [
        o &&
          L.jsx("label", {
            htmlFor: M,
            className: he("input-label", g.label),
            ...x,
            children: L.jsx("span", {
              className: he("input-label", g.labelText),
              children: o,
            }),
          }),
        L.jsxs("div", {
          className: he("input-wrapper relative", o && "mt-1.5", g.wrapper),
          children: [
            L.jsx(z, {
              className: he(
                "form-input-base",
                c && "ltr:pr-9 rtl:pl-9",
                s && "ltr:pl-9 rtl:pr-9",
                !y && [
                  "form-input",
                  h
                    ? "border-error dark:border-error-lighter"
                    : v
                      ? "bg-gray-150 dark:border-dark-500 dark:bg-dark-600 cursor-not-allowed border-gray-300 opacity-60"
                      : "peer focus:border-primary-600 dark:border-dark-450 dark:hover:border-dark-400 dark:focus:border-primary-500 border-gray-300 hover:border-gray-400",
                ],
                m,
                g.input,
              ),
              type: S,
              id: M,
              ref: r,
              disabled: v,
              ...A,
            }),
            s &&
              L.jsx("div", {
                className: he("prefix ltr:left-0 rtl:right-0", F, g.prefix),
                children: s,
              }),
            c &&
              L.jsx("div", {
                className: he("suffix ltr:right-0 rtl:left-0", F, g.suffix),
                children: c,
              }),
          ],
        }),
        L.jsx(Ad, {
          when: !!h && typeof h != "boolean",
          className: g.error,
          children: h,
        }),
        f &&
          L.jsx("span", {
            className: he(
              "input-description dark:text-dark-300 mt-1 text-xs text-gray-400",
              g.description,
            ),
            children: f,
          }),
      ],
    });
  }),
  x_ = E_;
x_.displayName = "Input";
function w_(n) {
  if (!(n instanceof HTMLElement))
    throw new TypeError("The input must be an HTMLElement.");
  let r = n.parentElement;
  for (; r && r !== document.documentElement; ) {
    const l = window.getComputedStyle(r).backgroundColor;
    if (l && l !== "rgba(0, 0, 0, 0)" && l !== "transparent") return l;
    r = r.parentElement;
  }
  return null;
}
const R_ = ({
  label: n,
  prefix: r,
  suffix: l = L.jsx(q3, {
    className: "w-2/3",
  }),
  description: o,
  classNames: s = {},
  className: c,
  error: f,
  multiple: m = !1,
  unstyled: g,
  disabled: h,
  rootProps: y,
  labelProps: v,
  id: S,
  data: w = [],
  children: x,
  ref: _,
  ...A
}) => {
  const z = Ps(S, "select"),
    M = E.useRef(null),
    F = xl(),
    te = E.useMemo(
      () =>
        w.map((item) => {
          const D =
            typeof item != "object"
              ? {
                  label: item,
                  value: item,
                }
              : item;
          return L.jsx(
            "option",
            {
              value: D.value,
              disabled: D.disabled,
              children: D.label,
            },
            D.value,
          );
        }),
      [w],
    ),
    U = he(
      "pointer-events-none absolute top-0 flex h-full w-9 items-center justify-center transition-colors",
      f
        ? "text-error dark:text-error-light"
        : "peer-focus:text-primary-600 dark:text-dark-300 dark:peer-focus:text-primary-500 text-gray-400",
    );
  return (
    E.useEffect(() => {
      const W = M.current;
      if (!W) return;
      const D = w_(W);
      W.style.setProperty("--bg-color", D);
    }, [F]),
    L.jsxs("div", {
      className: he("input-root", s.root),
      ...y,
      children: [
        n &&
          L.jsx("label", {
            htmlFor: z,
            className: he("input-label", s.label),
            ...v,
            children: L.jsx("span", {
              className: he("input-label", s.labelText),
              children: n,
            }),
          }),
        L.jsxs("div", {
          className: he("input-wrapper relative", n && "mt-1.5", s.wrapper),
          children: [
            L.jsx("select", {
              className: he(
                m ? "form-multiselect" : "form-select-base",
                !g && [
                  !m && "form-select",
                  l && "ltr:pr-9 rtl:pl-9",
                  r && "ltr:pl-9 rtl:pr-9",
                  f
                    ? "border-error dark:border-error-lighter"
                    : [
                        h
                          ? "bg-gray-150 dark:border-dark-500 dark:bg-dark-600 cursor-not-allowed border-gray-300 opacity-60"
                          : "peer focus:border-primary-600 dark:border-dark-450 dark:hover:border-dark-400 dark:focus:border-primary-500 border-gray-300 hover:border-gray-400",
                      ],
                ],
                c,
                s.select,
              ),
              id: z,
              ref: _ || M,
              disabled: h,
              "data-disabled": h,
              multiple: m,
              ...A,
              children: x || te,
            }),
            !m &&
              !g &&
              r &&
              L.jsx("div", {
                className: he("prefix ltr:left-0 rtl:right-0", U, s.prefix),
                children: r,
              }),
            !m &&
              !g &&
              L.jsx("div", {
                className: he("suffix ltr:right-0 rtl:left-0", U, s.suffix),
                children: l,
              }),
          ],
        }),
        L.jsx(Ad, {
          when: !!(f && typeof f != "boolean"),
          className: s.error,
          children: f,
        }),
        o &&
          L.jsx("span", {
            className: he(
              "input-description dark:text-dark-300 mt-1 text-xs text-gray-400",
              s.description,
            ),
            children: o,
          }),
      ],
    })
  );
};
R_.displayName = "Select";
const __ =
    "before:bg-gray-400 bg-gray-150 border border-gray-200 pointer-events-none select-none opacity-70 dark:bg-dark-450 dark:border-dark-450 dark:before:bg-dark-800 dark:opacity-60",
  T_ = {
    basic:
      "bg-gray-300 before:bg-gray-50 checked:bg-this checked:before:bg-white dark:bg-surface-1 dark:before:bg-dark-50 dark:checked:bg-this-light dark:checked:before:bg-white focus-visible:ring-3 focus-visible:ring-this/50 dark:focus-visible:ring-this-light/50",
    outlined:
      "is-outline border-gray-400/70 border before:bg-gray-300 checked:border-this checked:before:bg-this dark:border-dark-400 dark:before:bg-dark-300 dark:checked:border-this-light dark:checked:before:bg-this-light focus-visible:ring-3 focus-visible:ring-this/50 dark:focus-visible:ring-this-light/50",
  },
  O_ = E.forwardRef(
    (
      {
        variant: n = "basic",
        unstyled: r,
        color: l = "primary",
        className: o,
        classNames: s = {},
        label: c,
        role: f = "switch",
        disabled: m,
        labelProps: g,
        ...h
      },
      y,
    ) =>
      L.jsx(Cd, {
        when: !!c,
        wrapper: (v) =>
          L.jsxs("label", {
            className: he(
              "input-label inline-flex items-center gap-2",
              s.label,
            ),
            ...g,
            children: [
              v,
              L.jsx("span", {
                className: he("label", s.labelText),
                children: c,
              }),
            ],
          }),
        children: L.jsx("input", {
          className: he(
            "form-switch",
            !r && [At(l), m ? __ : T_[n]],
            o,
            s.input,
          ),
          disabled: m,
          type: "checkbox",
          role: f,
          ref: y,
          ...h,
        }),
      }),
  );
O_.displayName = "Switch";
const C_ = (n, r) => {
    const {
        component: l,
        label: o,
        description: s,
        className: c,
        classNames: f = {},
        error: m,
        unstyled: g,
        rootProps: h,
        labelProps: y,
        id: v,
        disabled: S,
        ...w
      } = n,
      x = l || "textarea",
      _ = Ps(v, "textarea");
    return L.jsxs("div", {
      className: he("input-root", f.root),
      ...h,
      children: [
        o &&
          L.jsx("label", {
            htmlFor: _,
            className: he("input-label", f.label),
            ...y,
            children: L.jsx("span", {
              className: he("input-label", f.labelText),
              children: o,
            }),
          }),
        L.jsx("div", {
          className: he("input-wrapper relative", o && "mt-1.5", f.wrapper),
          children: L.jsx(x, {
            ref: r,
            id: _,
            className: he(
              "form-textarea-base",
              !g && [
                "form-textarea",
                m
                  ? "border-error dark:border-error-lighter"
                  : [
                      S
                        ? "bg-gray-150 dark:border-dark-500 dark:bg-dark-600 cursor-not-allowed border-gray-300 opacity-60"
                        : "peer focus:border-primary-600 dark:border-dark-450 dark:hover:border-dark-400 dark:focus:border-primary-500 border-gray-300 hover:border-gray-400",
                    ],
              ],
              c,
              f.input,
            ),
            ...w,
          }),
        }),
        L.jsx(Ad, {
          when: !!(m && typeof m != "boolean"),
          className: f.error,
          children: m,
        }),
        s &&
          L.jsx("span", {
            className: he(
              "input-description dark:text-dark-300 mt-1 text-xs text-gray-400",
              f.description,
            ),
            children: s,
          }),
      ],
    });
  },
  A_ = C_;
A_.displayName = "Textarea";
const D_ = E.forwardRef((n, r) => {
    const {
        children: l,
        component: o = "div",
        effect: s = "fade",
        value: c,
        className: f,
        defaultValue: m,
        onChange: g,
        disabled: h,
        onClick: y,
        ...v
      } = n,
      [S, w] = Td({
        value: c,
        defaultValue: m,
        finalValue: "on",
        onChange: g,
      }),
      x = (_) => {
        h || w(S === "on" ? "off" : "on");
        y?.(_);
      };
    return L.jsx(o, {
      "data-swap-value": S,
      ref: r,
      disabled: h,
      "data-disabled": h,
      "data-swap-effect": s,
      className: he(
        "swap relative inline-grid place-content-center select-none",
        s === "flip" && "swap-flip",
        s === "rotate" && "swap-rotate",
        S === "on"
          ? "swap-active **:data-swap-on:z-11"
          : "**:data-swap-off:z-11",
        h ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        f,
      ),
      onClick: x,
      ...v,
      children: l,
    });
  }),
  L_ = D_;
L_.displayName = "Swap";
const N_ = E.forwardRef((n, r) => {
  const {
      onChange: l = () => {},
      children: o,
      accept: s,
      name: c,
      form: f,
      disabled: m,
      capture: g,
      inputProps: h,
      ...y
    } = n,
    v = E.useRef(null),
    S = () => {
      if (!m && v.current) {
        v.current.click();
      }
    },
    w = (event) => {
      const A = event.currentTarget.files;
      if (A) {
        l(Array.from(A));
      }
    },
    x = qv(r, v);
  return L.jsxs(L.Fragment, {
    children: [
      o({
        onClick: S,
        disabled: m,
        ...y,
      }),
      L.jsx("input", {
        hidden: !0,
        type: "file",
        accept: s,
        onChange: w,
        ref: x,
        name: c,
        form: f,
        capture: g,
        disabled: m,
        ...h,
      }),
    ],
  });
});
N_.displayName = "Upload";
function Dd() {
  return L.jsx(L.Fragment, {
    children: L.jsxs("div", {
      className: "fixed grid h-full w-full place-content-center",
      children: [
        L.jsx(ZR, {
          className: "size-20 mb-2",
        }),
        L.jsx(Fv, {
          color: "primary",
          isIndeterminate: !0,
          animationDuration: "1s",
          className: "mt-2 h-1",
        }),
      ],
    }),
  });
}
function Gi(n, r) {
  return function (o) {
    return L.jsx(E.Suspense, {
      fallback: r ? L.jsx(r, {}) : null,
      children: L.jsx(n, {
        ...o,
      }),
    });
  };
}
function Ms() {
  return (
    (Ms = Object.assign
      ? Object.assign.bind()
      : function (n) {
          for (var r = 1; r < arguments.length; r++) {
            var l = arguments[r];
            for (var o in l)
              if ({}.hasOwnProperty.call(l, o)) {
                n[o] = l[o];
              }
          }
          return n;
        }),
    Ms.apply(null, arguments)
  );
}
var Yf = {
    exports: {},
  },
  Ke = {};
var sy;
function M_() {
  if (sy) return Ke;
  sy = 1;
  var n = typeof Symbol == "function" && Symbol.for,
    r = n ? Symbol.for("react.element") : 60103,
    l = n ? Symbol.for("react.portal") : 60106,
    o = n ? Symbol.for("react.fragment") : 60107,
    s = n ? Symbol.for("react.strict_mode") : 60108,
    c = n ? Symbol.for("react.profiler") : 60114,
    f = n ? Symbol.for("react.provider") : 60109,
    m = n ? Symbol.for("react.context") : 60110,
    g = n ? Symbol.for("react.async_mode") : 60111,
    h = n ? Symbol.for("react.concurrent_mode") : 60111,
    y = n ? Symbol.for("react.forward_ref") : 60112,
    v = n ? Symbol.for("react.suspense") : 60113,
    S = n ? Symbol.for("react.suspense_list") : 60120,
    w = n ? Symbol.for("react.memo") : 60115,
    x = n ? Symbol.for("react.lazy") : 60116,
    _ = n ? Symbol.for("react.block") : 60121,
    A = n ? Symbol.for("react.fundamental") : 60117,
    z = n ? Symbol.for("react.responder") : 60118,
    M = n ? Symbol.for("react.scope") : 60119;
  function F(props) {
    if (typeof props == "object" && props !== null) {
      var W = props.$$typeof;
      switch (W) {
        case r:
          switch (((props = props.type), props)) {
            case g:
            case h:
            case o:
            case c:
            case s:
            case v:
              return props;
            default:
              switch (((props = props && props.$$typeof), props)) {
                case m:
                case y:
                case x:
                case w:
                case f:
                  return props;
                default:
                  return W;
              }
          }
        case l:
          return W;
      }
    }
  }
  function te(U) {
    return F(U) === h;
  }
  return (
    (Ke.AsyncMode = g),
    (Ke.ConcurrentMode = h),
    (Ke.ContextConsumer = m),
    (Ke.ContextProvider = f),
    (Ke.Element = r),
    (Ke.ForwardRef = y),
    (Ke.Fragment = o),
    (Ke.Lazy = x),
    (Ke.Memo = w),
    (Ke.Portal = l),
    (Ke.Profiler = c),
    (Ke.StrictMode = s),
    (Ke.Suspense = v),
    (Ke.isAsyncMode = function (U) {
      return te(U) || F(U) === g;
    }),
    (Ke.isConcurrentMode = te),
    (Ke.isContextConsumer = function (U) {
      return F(U) === m;
    }),
    (Ke.isContextProvider = function (U) {
      return F(U) === f;
    }),
    (Ke.isElement = function (U) {
      return typeof U == "object" && U !== null && U.$$typeof === r;
    }),
    (Ke.isForwardRef = function (U) {
      return F(U) === y;
    }),
    (Ke.isFragment = function (U) {
      return F(U) === o;
    }),
    (Ke.isLazy = function (U) {
      return F(U) === x;
    }),
    (Ke.isMemo = function (U) {
      return F(U) === w;
    }),
    (Ke.isPortal = function (U) {
      return F(U) === l;
    }),
    (Ke.isProfiler = function (U) {
      return F(U) === c;
    }),
    (Ke.isStrictMode = function (U) {
      return F(U) === s;
    }),
    (Ke.isSuspense = function (U) {
      return F(U) === v;
    }),
    (Ke.isValidElementType = function (U) {
      return (
        typeof U == "string" ||
        typeof U == "function" ||
        U === o ||
        U === h ||
        U === c ||
        U === s ||
        U === v ||
        U === S ||
        (typeof U == "object" &&
          U !== null &&
          (U.$$typeof === x ||
            U.$$typeof === w ||
            U.$$typeof === f ||
            U.$$typeof === m ||
            U.$$typeof === y ||
            U.$$typeof === A ||
            U.$$typeof === z ||
            U.$$typeof === M ||
            U.$$typeof === _))
      );
    }),
    (Ke.typeOf = F),
    Ke
  );
}
var uy;
function z_() {
  return (uy || ((uy = 1), (Yf.exports = M_())), Yf.exports);
}
var Gf, cy;
function k_() {
  if (cy) return Gf;
  cy = 1;
  var n = z_(),
    r = {
      childContextTypes: !0,
      contextType: !0,
      contextTypes: !0,
      defaultProps: !0,
      displayName: !0,
      getDefaultProps: !0,
      getDerivedStateFromError: !0,
      getDerivedStateFromProps: !0,
      mixins: !0,
      propTypes: !0,
      type: !0,
    },
    l = {
      name: !0,
      length: !0,
      prototype: !0,
      caller: !0,
      callee: !0,
      arguments: !0,
      arity: !0,
    },
    o = {
      $$typeof: !0,
      render: !0,
      defaultProps: !0,
      displayName: !0,
      propTypes: !0,
    },
    s = {
      $$typeof: !0,
      compare: !0,
      defaultProps: !0,
      displayName: !0,
      propTypes: !0,
      type: !0,
    },
    c = {};
  c[n.ForwardRef] = o;
  c[n.Memo] = s;
  function f(x) {
    return n.isMemo(x) ? s : c[x.$$typeof] || r;
  }
  var m = Object.defineProperty,
    g = Object.getOwnPropertyNames,
    h = Object.getOwnPropertySymbols,
    y = Object.getOwnPropertyDescriptor,
    v = Object.getPrototypeOf,
    S = Object.prototype;
  function w(x, _, A) {
    if (typeof _ != "string") {
      if (S) {
        var z = v(_);
        if (z && z !== S) {
          w(x, z, A);
        }
      }
      var M = g(_);
      if (h) {
        M = M.concat(h(_));
      }
      for (var F = f(x), te = f(_), U = 0; U < M.length; ++U) {
        var W = M[U];
        if (!l[W] && !(A && A[W]) && !(te && te[W]) && !(F && F[W])) {
          var D = y(_, W);
          try {
            m(x, W, D);
          } catch {}
        }
      }
    }
    return x;
  }
  return ((Gf = w), Gf);
}
k_();
var Pv = function (r, l, o) {
    return ((r = r <= o ? r : o), (r = r >= l ? r : l), r);
  },
  j_ = function () {
    var r = !1,
      l = [],
      o = function () {
        r = !0;
        var m = l.shift();
        if (m) return m(o);
        r = !1;
      },
      s = function () {
        r = !1;
        l = [];
      },
      c = function (m) {
        l.push(m);
        if (!r && l.length === 1) {
          o();
        }
      };
    return {
      clear: s,
      enqueue: c,
    };
  },
  U_ = function () {
    var r,
      l = function () {
        if (r) {
          window.cancelAnimationFrame(r);
        }
      },
      o = function (c, f) {
        var m,
          g,
          h = function (v) {
            if (((g = g || v), (m = v - g), m > f)) {
              c();
              return;
            }
            r = window.requestAnimationFrame(h);
          };
        r = window.requestAnimationFrame(h);
      };
    return {
      cancel: l,
      schedule: o,
    };
  },
  H_ = function (r) {
    var l = 0;
    return (
      r >= 0 && r < 0.2
        ? (l = 0.1)
        : r >= 0.2 && r < 0.5
          ? (l = 0.04)
          : r >= 0.5 && r < 0.8
            ? (l = 0.02)
            : r >= 0.8 && r < 0.99 && (l = 0.005),
      Pv(r + l, 0, 0.994)
    );
  },
  fy = function (r) {
    E.useEffect(r, []);
  },
  B_ = function (r) {
    return ++r % 1e6;
  },
  $_ = function () {
    var r = E.useState(0),
      l = r[1];
    return E.useCallback(function () {
      return l(B_);
    }, []);
  },
  q_ = function (r) {
    if (r === void 0) {
      r = {};
    }
    var l = $_(),
      o = E.useRef(Ms({}, r)),
      s = E.useCallback(function () {
        return o.current;
      }, []),
      c = E.useCallback(function (f) {
        if (f) {
          (Object.assign(o.current, f), l());
        }
      }, []);
    return [s, c];
  },
  V_ = function () {
    var r = E.useRef(!0);
    return r.current ? ((r.current = !1), !0) : r.current;
  },
  dy = function (r, l) {
    var o = V_();
    E.useEffect(function () {
      if (!o) return r();
    }, l);
  },
  Qv = function () {},
  hy = {
    isFinished: !0,
    progress: 0,
    sideEffect: Qv,
  },
  Y_ = function (r) {
    var l = r === void 0 ? {} : r,
      o = l.animationDuration,
      s = o === void 0 ? 200 : o,
      c = l.incrementDuration,
      f = c === void 0 ? 800 : c,
      m = l.isAnimating,
      g = m === void 0 ? !1 : m,
      h = l.minimum,
      y = h === void 0 ? 0.08 : h,
      v = q_(hy),
      S = v[0],
      w = v[1],
      x = E.useRef(null),
      _ = E.useRef(null);
    fy(function () {
      x.current = j_();
      _.current = U_();
    });
    var A = E.useCallback(function () {
        var W, D;
        (W = _.current) == null || W.cancel();
        (D = x.current) == null || D.clear();
      }, []),
      z = E.useCallback(
        function (W) {
          var D;
          if (((W = Pv(W, y, 1)), W === 1)) {
            var le, ie;
            A();
            (le = x.current) == null ||
              le.enqueue(function (ue) {
                w({
                  progress: W,
                  sideEffect: function () {
                    var Ee;
                    return (Ee = _.current) == null
                      ? void 0
                      : Ee.schedule(ue, s);
                  },
                });
              });
            (ie = x.current) == null ||
              ie.enqueue(function () {
                w({
                  isFinished: !0,
                  sideEffect: A,
                });
              });
            return;
          }
          (D = x.current) == null ||
            D.enqueue(function (ue) {
              w({
                isFinished: !1,
                progress: W,
                sideEffect: function () {
                  var Ee;
                  return (Ee = _.current) == null ? void 0 : Ee.schedule(ue, s);
                },
              });
            });
        },
        [s, A, y, x, w, _],
      ),
      M = E.useCallback(
        function () {
          z(H_(S().progress));
        },
        [S, z],
      ),
      F = E.useCallback(
        function () {
          var W = function () {
            var le;
            M();
            (le = x.current) == null ||
              le.enqueue(function (ie) {
                var ue;
                (ue = _.current) == null ||
                  ue.schedule(function () {
                    W();
                    ie();
                  }, f);
              });
          };
          W();
        },
        [f, x, _, M],
      ),
      te = E.useRef(Qv),
      U = S().sideEffect;
    return (
      E.useEffect(function () {
        te.current = M;
      }),
      fy(function () {
        return (g && F(), A);
      }),
      dy(
        function () {
          S().sideEffect();
        },
        [S, U],
      ),
      dy(
        function () {
          g
            ? w(
                Ms({}, hy, {
                  sideEffect: F,
                }),
              )
            : z(1);
        },
        [g, z, w, F],
      ),
      {
        animationDuration: s,
        isFinished: S().isFinished,
        progress: S().progress,
      }
    );
  };
function Kv({ isAnimating: n }) {
  const { primaryColorScheme: r, isDark: l } = xl(),
    {
      animationDuration: o,
      isFinished: s,
      progress: c,
    } = Y_({
      isAnimating: n,
    });
  return L.jsx("div", {
    className: "pointer-events-none fixed left-0 top-0 h-0.5 w-full",
    style: {
      zIndex: 9999,
    },
    children:
      !s &&
      L.jsx("div", {
        className: "relative h-full",
        style: {
          backgroundColor: l ? r[500] : r[600],
          width: `${c * 100}%`,
          transition: `width ${o}ms ease-out`,
        },
        children: L.jsx("div", {
          className: "absolute right-0 h-full opacity-100",
          style: {
            boxShadow: `0 0 10px ${l ? r[500] : r[600]}, 0 0 5px ${l ? r[500] : r[600]}`,
            transform: "rotate(3deg) translate(0px, -4px)",
            width: 100,
          },
        }),
      }),
  });
}
Kv.displayName = "NProgress";
function G_() {
  const n = Yy(),
    r = n.state === "loading" && n.formData == null && !!n.location?.pathname;
  return L.jsx(Kv, {
    isAnimating: r,
  });
}
const F_ =
    "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='utf-8'?%3e%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='-0.884%20-3.979%2098.981%20112.786'%20xmlns:bx='https://boxy-svg.com'%3e%3cdefs%3e%3cbx:guide%20x='177.241'%20y='-29.094'%20angle='90'/%3e%3c/defs%3e%3cg%20id='svg1'%20transform='matrix(1,%200,%200,%201,%20-107.134514,%2037.231144)'%3e%3cg%20id='layer1-8'%20transform='matrix(1,%200,%200,%201,%20219.936111,%20-34.573868)'%3e%3cg%20id='g23-2-1'%20style='fill:%20rgb(8,%200,%2041);%20fill-opacity:%201;'%20transform='matrix(1.123595,%200,%200,%201.123595,%20290.640106,%20495.618439)'%3e%3cg%20id='layer1-4'%20transform='matrix(0.264583,%200,%200,%200.264583,%2017.058146,%20129.751389)'%3e%3cg%20id='layer1-2'%20transform='matrix(0.990881,%200,%200,%201,%20-43.218922,%20-105.263351)'%20style=''%3e%3cg%20id='layer1-1'%20transform='translate(162.15808,227.20999)'%3e%3cg%20id='svg-1'%20transform='matrix(0.758629,%200,%200,%200.758629,%20-863.085327,%20-675.94281)'%20style=''%3e%3cg%20id='layer1'%20transform='matrix(3.394742,%200,%200,%203.363785,%20292.405853,%20-4034.063477)'%3e%3cg%20id='group-1'%20transform='translate(-270.39718,66.736666)'%3e%3cg%20id='group-2'%20style='fill:%23080029;fill-opacity:1'%20transform='matrix(3.7795279,0,0,3.7795279,90.864482,-20.612298)'%3e%3cg%20id='group-3'%20transform='matrix(0.26458331,0,0,0.26458331,-22.839982,131.78011)'%3e%3cg%20id='group-4'%20transform='translate(-50.397165,-105.26335)'%3e%3cg%20id='group-5'%20transform='translate(162.15808,227.20999)'%3e%3cg%20id='layer1-8-7'%20transform='translate(16.205645,-58.526693)'%3e%3cpath%20id='rect42-3-8'%20style='fill:%23ffffff;fill-opacity:1;stroke-width:1.33237'%20d='m%20-151.94508,-44.892437%20-63.87439,35.8485516%20V%2067.225611%20l%2056.53796,34.408639%20V%2049.106612%20h%20-14.03082%20V%2070.284391%20L%20-196.3679,56.838811%20V%201.6523713%20l%2042.7724,-24.5670733%20v%2015.7886101%20h%200.005%20l%20-0.002,-15.7780801%2042.77238,24.5670721%20V%2056.84724%20l%20-23.05557,13.44558%20V%2049.106612%20h%20-13.03929%20V%20101.62793%20L%20-90.374691,67.225611%20V%20-9.0438854%20Z%20m%20-7.33643,47.266871%20-14.03082,6.1028234%20V%2030.023448%20h%2014.03082%20z%20m%2012.36562,0.4399838%20V%2030.023448%20h%2013.03928%20V%208.4856868%20Z'/%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/svg%3e",
  ys = (n) => n.toString().padStart(2, "0"),
  X_ = (n) => {
    const r = Math.max(0, n),
      l = Math.floor(r / 1e3),
      o = Math.floor(l / (3600 * 24)),
      s = Math.floor((l % (3600 * 24)) / 3600),
      c = Math.floor((l % 3600) / 60),
      f = l % 60;
    return {
      days: o < 100 ? ys(o) : o.toString(),
      hours: ys(s),
      minutes: ys(c),
      seconds: ys(f),
    };
  };
function P_({ unlockAt: n }) {
  const r = E.useMemo(() => new Date().getFullYear(), []),
    l = "TEAM OP",
    [o, s] = E.useState(() => Date.now());
  E.useEffect(() => {
    const m = window.setInterval(() => s(Date.now()), 1e3);
    return () => window.clearInterval(m);
  }, []);
  const c = n.getTime() - o,
    f = E.useMemo(() => X_(c), [c]);
  return L.jsxs("div", {
    className:
      "relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 text-white",
    children: [
      L.jsx("div", {
        className: "absolute inset-0 bg-[#02030a]",
      }),
      L.jsx("div", {
        className:
          "absolute inset-0 bg-[radial-gradient(900px_380px_at_50%_20%,rgba(56,189,248,0.14)_0%,rgba(2,3,10,0)_60%)]",
      }),
      L.jsx("div", {
        className:
          "absolute inset-0 bg-[radial-gradient(700px_280px_at_50%_35%,rgba(59,130,246,0.12)_0%,rgba(2,3,10,0)_65%)]",
      }),
      L.jsx("div", {
        className:
          "absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,3,10,0)_0%,rgba(2,3,10,0.5)_35%,rgba(2,3,10,1)_100%)]",
      }),
      L.jsx("div", {
        className: "relative w-full max-w-3xl py-10",
        children: L.jsxs("div", {
          className: "flex flex-col items-center text-center",
          children: [
            L.jsxs("div", {
              className: "flex items-center gap-3",
              children: [
                L.jsx("img", {
                  src: F_,
                  alt: l,
                  className:
                    "h-10 w-10 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]",
                }),
                L.jsx("div", {
                  className: "text-4xl font-extrabold tracking-wide text-white",
                  children: l,
                }),
              ],
            }),
            L.jsxs("p", {
              className: "mt-6 text-lg text-white/60",
              children: [
                "A nova versão do ",
                L.jsx("span", {
                  className: "font-semibold",
                  children: l,
                }),
                " ",
                "está chegando.",
              ],
            }),
            L.jsx("p", {
              className:
                "mt-1 text-2xl font-semibold tracking-tight text-white/90 sm:text-3xl",
              children: "Reescrito do zero. Mais rápido. Mais preciso.",
            }),
            L.jsxs("div", {
              className:
                "mt-10 grid w-full grid-cols-2 gap-4 sm:mt-12 sm:grid-cols-4 sm:gap-6",
              children: [
                L.jsx(vs, {
                  label: "DIAS",
                  value: f.days,
                }),
                L.jsx(vs, {
                  label: "HORAS",
                  value: f.hours,
                }),
                L.jsx(vs, {
                  label: "MINUTOS",
                  value: f.minutes,
                }),
                L.jsx(vs, {
                  label: "SEGUNDOS",
                  value: f.seconds,
                }),
              ],
            }),
            L.jsx("p", {
              className: "mt-10 text-sm text-white/45",
              children: "A versão atual continua funcionando normalmente.",
            }),
            L.jsxs("p", {
              className: "mt-1 text-sm text-white/35",
              children: ["© ", r, " ", l],
            }),
          ],
        }),
      }),
    ],
  });
}
function vs({ label: n, value: r }) {
  return L.jsxs("div", {
    className:
      "rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-md",
    children: [
      L.jsx("div", {
        className:
          "text-5xl font-extrabold tracking-wide text-[#4aa2ff] drop-shadow-[0_8px_30px_rgba(74,162,255,0.18)]",
        children: r,
      }),
      L.jsx("div", {
        className: "mt-3 text-xs font-semibold tracking-[0.25em] text-white/55",
        children: n,
      }),
    ],
  });
}
const Q_ = Gi(
    E.lazy(() =>
      ze(
        () => /* Dynamic import */ import("./Toaster-CLfKOJ2a.js"),
        __vite__mapDeps([0, 1]),
      ),
    ),
  ),
  K_ = Gi(
    E.lazy(() =>
      ze(
        () => /* Dynamic import */ import("./Tooltip-3-76g3mr.js"),
        __vite__mapDeps([2, 3]),
      ),
    ),
  ),
  Z_ = Gi(
    E.lazy(() =>
      ze(
        () =>
          /* Dynamic import */ import("./FloatingSpreadCalculator-CUVr1WZy.js"),
        __vite__mapDeps([4, 1, 5, 6, 7, 8]),
      ).then((response) => ({
        default: response.FloatingSpreadCalculator,
      })),
    ),
  );
function J_() {
  const { isInitialized: n, isAuthenticated: r } = El(),
    [l, o] = E.useState(() => Date.now()),
    s = KR.unlockAt,
    f = s != null && !r && l < s.getTime();
  E.useEffect(() => {
    if (!n || !f) return;
    const g = window.setInterval(() => o(Date.now()), 1e3);
    return () => window.clearInterval(g);
  }, [n, f]);
  const m = E.useMemo(() => n && f && s != null, [n, f, s]);
  return n
    ? m && s
      ? L.jsx(P_, {
          unlockAt: s,
        })
      : L.jsxs(L.Fragment, {
          children: [
            L.jsx(G_, {}),
            L.jsx(Iy, {}),
            L.jsx(Py, {}),
            L.jsx(Z_, {}),
            L.jsx(K_, {}),
            L.jsx(Q_, {}),
          ],
        })
    : L.jsx(Dd, {});
}
const my = {
  401: E.lazy(() =>
    ze(
      () => /* Dynamic import */ import("./401-Rg_IQ_mV.js"),
      __vite__mapDeps([9, 10]),
    ),
  ),
  404: E.lazy(() =>
    ze(
      () => /* Dynamic import */ import("./404-g9LXz3c9.js"),
      __vite__mapDeps([11, 10]),
    ),
  ),
  429: E.lazy(() =>
    ze(
      () => /* Dynamic import */ import("./429-Tv24lfSC.js"),
      __vite__mapDeps([12, 10]),
    ),
  ),
  500: E.lazy(() =>
    ze(
      () => /* Dynamic import */ import("./500-yYKblytm.js"),
      __vite__mapDeps([13, 10]),
    ),
  ),
};
function I_() {
  const n = Fy();
  if (hl(n) && Object.keys(my).includes(n.status.toString())) {
    const r = Gi(my[n.status]);
    return L.jsx(r, {});
  }
  return L.jsx("div", {
    className: "flex h-screen w-screen items-center justify-center",
    children: L.jsx("div", {
      className: "mx-auto max-w-xl text-center",
      children:
        "Application error: a client-side exception has occurred while loading (see the browser console for more information).",
    }),
  });
}
const Ff = 60 * 1e3,
  W_ = [
    "/dashboards/monitoramento",
    "/dashboards/lancamentos",
    "/dashboards/scanner",
  ];
function eT() {
  const n = vl(),
    r = tn(),
    {
      isAuthenticated: l,
      isInitialized: o,
      user: s,
      refreshUser: c,
      lastProfileSync: f,
    } = El(),
    [m, g] = E.useState(!1),
    h = E.useRef(null),
    y = E.useRef(!1),
    v = () => {
      y.current ||
        ((y.current = !0),
        g(!0),
        c()
          .catch(() => {})
          .finally(() => {
            y.current = !1;
            g(!1);
          }));
    },
    S = E.useMemo(
      () => W_.some((item) => r.pathname.startsWith(item)),
      [r.pathname],
    ),
    w = E.useMemo(
      () => (!o || !l ? !1 : f ? Date.now() - f > Ff : !0),
      [l, o, f],
    );
  if (
    (E.useEffect(() => {
      !S ||
        m ||
        (f && Date.now() - f < Ff) ||
        (h.current !== r.pathname && ((h.current = r.pathname), v()));
    }, [S, m, f, r.pathname, c]),
    E.useEffect(() => {
      !w || m || v();
    }, [m, w]),
    E.useEffect(() => {
      if (!o || !l) return;
      const A = window.setInterval(() => {
        if (S) {
          v();
        }
      }, Ff);
      return () => {
        window.clearInterval(A);
      };
    }, [l, o, S]),
    !o)
  )
    return L.jsx("div", {
      className:
        "flex h-screen w-full items-center justify-center bg-gray-50 text-gray-500 dark:bg-dark-900 dark:text-dark-300",
      children: L.jsxs("div", {
        className: "flex flex-col items-center gap-2",
        children: [
          L.jsx("div", {
            className:
              "h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-dark-700",
          }),
          L.jsx("p", {
            className: "text-sm font-medium",
            children: "Carregando sua sessao...",
          }),
        ],
      }),
    });
  if (!l)
    return L.jsx(Rn, {
      to: `${d3}?${dl}=${r.pathname}`,
      replace: !0,
    });
  if (s?.oldId != null && s?.firstLogin == null) {
    const A = new URLSearchParams();
    return (
      A.set(dl, r.pathname),
      L.jsx(Rn, {
        to: `/legacy-migration?${A.toString()}`,
        replace: !0,
      })
    );
  }
  if (!(s?.emailVerified === !0 || !!s?.emailVerifiedAt)) {
    const A = new URLSearchParams();
    A.set(dl, r.pathname);
    const z = A.toString();
    return L.jsx(Rn, {
      to: `/verify-otp${z ? `?${z}` : ""}`,
      replace: !0,
    });
  }
  return L.jsx(L.Fragment, {
    children: n,
  });
}
function Ti({ allowedRoles: n = [], allowedPermissions: r = [] }) {
  const l = vl(),
    { user: o } = El(),
    s = o?.roles || [],
    c = o?.permissions || [],
    f = n.some((item) => s.includes(item) || c.includes(item)),
    m = r.some((item) => c.includes(item));
  return (n.length === 0 && r.length === 0 ? !0 : f || m)
    ? L.jsx(L.Fragment, {
        children: l,
      })
    : L.jsx(Rn, {
        to: "/dashboards/home",
        replace: !0,
      });
}
const tT = (n) => {
    if (!n) return null;
    const r = new Date(n);
    return Number.isNaN(r.getTime()) ? null : r;
  },
  nT = (n, r = new Date()) => {
    if ((n.status || "").toLowerCase() !== "active") return !1;
    const o = tT(n.endDate);
    if (!o) return !1;
    const s = new Date(o);
    return (s.setHours(23, 59, 59, 999), s.getTime() >= r.getTime());
  },
  aT = (n) => {
    if (!n?.licenses || n.licenses.length === 0) return [];
    const r = new Date(),
      l = n.licenses.filter((item) => nT(item, r)).map((props) => props.type);
    return Array.from(new Set(l));
  },
  rT = (n, r) => {
    if (!r || r.length === 0) return !0;
    const l = aT(n);
    return r.some((item) => l.includes(item));
  };
function lT({ requiredTypes: n }) {
  const r = vl(),
    { user: l } = El();
  return rT(l, n)
    ? L.jsx(L.Fragment, {
        children: r,
      })
    : L.jsx(Rn, {
        to: "/dashboards/home",
        replace: !0,
      });
}
const gy = {
  "main-layout": E.lazy(() =>
    ze(
      () => /* Dynamic import */ import("./index-BBcVLxBw.js"),
      __vite__mapDeps([
        14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 3, 24, 25, 26, 27, 1, 7, 28, 29,
        30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,
      ]),
    ),
  ),
  sideblock: E.lazy(() =>
    ze(
      () => /* Dynamic import */ import("./index-DndxzjOV.js"),
      __vite__mapDeps([
        46, 25, 22, 43, 45, 44, 16, 17, 18, 19, 20, 21, 23, 3, 24, 26, 27, 1, 7,
        28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39,
      ]),
    ),
  ),
};
function iT() {
  const { themeLayout: n } = xl(),
    r = E.useMemo(() => Gi(gy[n] || gy["main-layout"], Dd), [n]);
  return L.jsx(r, {});
}
function oT() {
  const { themeLayout: n } = xl(),
    { close: r, open: l } = YR(),
    { lgAndDown: o, xlAndUp: s } = Tv(),
    [c, f] = E.useState(!1);
  return (
    E.useLayoutEffect(
      () => () => {
        if (o) {
          r();
        }
      },
      [r, o, l, s],
    ),
    E.useLayoutEffect(() => {
      if (document?.body?.dataset)
        return (
          (document.body.dataset.layout = "main-layout"),
          queueMicrotask(() => {
            document.body.dataset.layout = "main-layout";
          }),
          () => {
            document.body.dataset.layout = n;
          }
        );
    }, [n]),
    E.useLayoutEffect(() => {
      f(!0);
    }, []),
    c ? L.jsx(Py, {}) : null
  );
}
const sT = 2,
  uT = {
    id: "protected",
    Component: eT,
    children: [
      {
        Component: iT,
        children: [
          {
            index: !0,
            element: L.jsx(Rn, {
              to: "/dashboards/scanner",
            }),
          },
          {
            path: "dashboards",
            children: [
              {
                index: !0,
                element: L.jsx(Rn, {
                  to: "/dashboards/scanner",
                }),
              },
              {
                path: "home",
                lazy: async () => ({
                  Component: (
                    await ze(
                      async () => {
                        const { default: n } =
                          await /* Dynamic import */ import("./index-DJd4Id7Y.js");
                        return {
                          default: n,
                        };
                      },
                      __vite__mapDeps([
                        47, 10, 48, 29, 49, 8, 26, 50, 21, 22, 23, 3, 42, 25,
                        37, 51, 52, 40, 24,
                      ]),
                    )
                  ).default,
                }),
              },
              {
                path: "plans",
                lazy: async () => ({
                  Component: (
                    await ze(
                      async () => {
                        const { default: n } =
                          await /* Dynamic import */ import("./index-BaZ9iwuu.js");
                        return {
                          default: n,
                        };
                      },
                      __vite__mapDeps([53, 1, 10, 54, 31, 55, 30, 56]),
                    )
                  ).default,
                }),
              },
              {
                element: L.jsx(lT, {
                  requiredTypes: [sT],
                }),
                children: [
                  {
                    path: "monitoramento",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-BgfcHNT4.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            57, 1, 34, 19, 17, 10, 18, 48, 58, 7, 25, 22, 24,
                            50, 59, 60, 61, 38, 62, 6, 27, 21, 26, 63,
                          ]),
                        )
                      ).default,
                    }),
                  },
                  {
                    path: "lancamentos",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-2Rmnk0ik.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            64, 10, 60, 34, 48, 26, 45, 39, 55, 7, 25, 22, 24,
                          ]),
                        )
                      ).default,
                    }),
                  },
                  {
                    path: "scanner",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-C_nZDfEk.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            65, 66, 1, 10, 58, 19, 17, 18, 7, 25, 22, 24, 50,
                            59, 60, 61, 38, 62, 6, 27, 21, 34, 51, 20, 23, 3, 5,
                            30, 67, 48,
                          ]),
                        )
                      ).default,
                    }),
                  },
                ],
              },
              {
                path: "coins",
                lazy: async () => ({
                  Component: (
                    await ze(
                      async () => {
                        const { default: n } =
                          await /* Dynamic import */ import("./index-ZMQRJa76.js");
                        return {
                          default: n,
                        };
                      },
                      __vite__mapDeps([
                        68, 66, 1, 10, 59, 67, 69, 48, 7, 38, 70, 25, 22, 24,
                      ]),
                    )
                  ).default,
                }),
              },
              {
                element: L.jsx(Ti, {
                  allowedRoles: ["admin"],
                }),
                children: [
                  {
                    path: "coins/:symbol",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./trading-CiVJJ1-M.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            71, 50, 10, 59, 49, 56, 63, 55, 27, 21, 22,
                          ]),
                        )
                      ).default,
                    }),
                  },
                ],
              },
              {
                element: L.jsx(Ti, {
                  allowedRoles: ["admin"],
                  allowedPermissions: [
                    "read:users",
                    "create:users",
                    "update:users",
                    "delete:users",
                  ],
                }),
                children: [
                  {
                    path: "auth",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-Cb9IEWsQ.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            72, 66, 1, 10, 33, 35, 69, 48, 38, 31, 70, 7, 52,
                            25, 22, 24,
                          ]),
                        )
                      ).default,
                    }),
                  },
                  {
                    path: "users",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-ClrM0Ejj.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            73, 66, 1, 10, 33, 28, 35, 69, 48, 38, 70, 51, 7,
                            74, 67, 52, 25, 22, 24,
                          ]),
                        )
                      ).default,
                    }),
                  },
                ],
              },
              {
                element: L.jsx(Ti, {
                  allowedRoles: ["admin", "licences"],
                  allowedPermissions: ["read:licenses"],
                }),
                children: [
                  {
                    path: "licenses",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-BlPMHNd9.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            75, 66, 1, 10, 61, 38, 62, 54, 76, 33, 69, 32, 48,
                            70, 51, 7, 25, 22, 24,
                          ]),
                        )
                      ).default,
                    }),
                  },
                ],
              },
              {
                element: L.jsx(Ti, {
                  allowedRoles: ["admin", "payments"],
                  allowedPermissions: [
                    "read:payments",
                    "create:payments",
                    "update:payments",
                    "delete:payments",
                  ],
                }),
                children: [
                  {
                    path: "payments",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-D3K-O_pF.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([
                            77, 66, 1, 10, 61, 38, 62, 76, 33, 54, 69, 48, 70,
                            7, 25, 22, 24,
                          ]),
                        )
                      ).default,
                    }),
                  },
                ],
              },
              {
                element: L.jsx(Ti, {
                  allowedRoles: ["admin"],
                }),
                children: [
                  {
                    path: "operacoes",
                    lazy: async () => ({
                      Component: (
                        await ze(
                          async () => {
                            const { default: n } =
                              await /* Dynamic import */ import("./index-4K8j17Rq.js");
                            return {
                              default: n,
                            };
                          },
                          __vite__mapDeps([78, 66, 1, 10, 55, 38, 6, 70]),
                        )
                      ).default,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        Component: oT,
        children: [
          {
            path: "settings",
            lazy: async () => ({
              Component: (
                await ze(
                  async () => {
                    const { default: n } =
                      await /* Dynamic import */ import("./Layout-4udCJNoo.js");
                    return {
                      default: n,
                    };
                  },
                  __vite__mapDeps([
                    79, 10, 15, 16, 17, 18, 19, 20, 21, 22, 23, 3, 24, 25, 26,
                    27, 1, 7, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
                    40, 41, 42, 43,
                  ]),
                )
              ).default,
            }),
            children: [
              {
                index: !0,
                element: L.jsx(Rn, {
                  to: "/settings/general",
                }),
              },
              {
                path: "general",
                lazy: async () => ({
                  Component: (
                    await ze(
                      async () => {
                        const { default: n } =
                          await /* Dynamic import */ import("./General-K6wVnjA7.js");
                        return {
                          default: n,
                        };
                      },
                      __vite__mapDeps([80, 17, 28, 81]),
                    )
                  ).default,
                }),
              },
              {
                path: "appearance",
                lazy: async () => ({
                  Component: (
                    await ze(
                      async () => {
                        const { default: n } =
                          await /* Dynamic import */ import("./Appearance-Dcnlrhjh.js");
                        return {
                          default: n,
                        };
                      },
                      __vite__mapDeps([
                        82, 37, 22, 25, 36, 21, 23, 3, 1, 41, 42, 62,
                      ]),
                    )
                  ).default,
                }),
              },
            ],
          },
        ],
      },
    ],
  };
function cT() {
  const n = vl(),
    { isAuthenticated: r, user: l } = El(),
    o = tn(),
    s = l?.emailVerified === !0 || !!l?.emailVerifiedAt,
    c = new URLSearchParams(window.location.search).get(dl),
    f = c && c !== "null" ? c : "",
    m = ["/legacy-migration", "/login", "/register"],
    g = m.includes(o.pathname);
  if (r && l?.oldId != null && l?.firstLogin == null && !g) {
    const v = new URLSearchParams();
    if (c) {
      v.set(dl, c);
    }
    const S = v.toString();
    return L.jsx(Rn, {
      to: `/legacy-migration${S ? `?${S}` : ""}`,
      replace: !0,
    });
  }
  if (m.includes(o.pathname)) {
    return L.jsx(L.Fragment, {
      children: n,
    });
  }
  if (r && s) {
    return f && f !== ""
      ? L.jsx(Rn, {
          to: f,
        })
      : L.jsx(Rn, {
          to: f3,
        });
  }
  return L.jsx(L.Fragment, {
    children: n,
  });
}
const fT = {
  id: "ghost",
  Component: cT,
  children: [
    {
      path: "login",
      lazy: async () => ({
        Component: (
          await ze(
            async () => {
              const { default: n } =
                await /* Dynamic import */ import("./index-B7S_VRVu.js");
              return {
                default: n,
              };
            },
            __vite__mapDeps([83, 84, 1, 43, 85, 74, 67, 10, 81]),
          )
        ).default,
      }),
    },
    {
      path: "register",
      lazy: async () => ({
        Component: (
          await ze(
            async () => {
              const { default: n } =
                await /* Dynamic import */ import("./Register-CeunrM2H.js");
              return {
                default: n,
              };
            },
            __vite__mapDeps([86, 84, 1, 85, 74, 67, 10, 28, 81]),
          )
        ).default,
      }),
    },
    {
      path: "forgot-password",
      lazy: async () => ({
        Component: (
          await ze(
            async () => {
              const { default: n } =
                await /* Dynamic import */ import("./ForgotPassword-CxM7qbuF.js");
              return {
                default: n,
              };
            },
            __vite__mapDeps([87, 84, 1, 10, 81]),
          )
        ).default,
      }),
    },
    {
      path: "reset-password",
      lazy: async () => ({
        Component: (
          await ze(
            async () => {
              const { default: n } =
                await /* Dynamic import */ import("./ResetPassword-fdVABVLd.js");
              return {
                default: n,
              };
            },
            __vite__mapDeps([88, 84, 1, 85, 74, 67, 10]),
          )
        ).default,
      }),
    },
    {
      path: "legacy-migration",
      lazy: async () => ({
        Component: (
          await ze(
            async () => {
              const { default: n } =
                await /* Dynamic import */ import("./LegacyMigration-mZGEGLr4.js");
              return {
                default: n,
              };
            },
            __vite__mapDeps([89, 84, 1, 85, 74, 67, 10, 81, 6]),
          )
        ).default,
      }),
    },
  ],
};
function dT() {
  const n = vl(),
    r = tn(),
    { isAuthenticated: l, user: o } = El();
  if (
    l &&
    o?.oldId != null &&
    o?.firstLogin == null &&
    r.pathname !== "/legacy-migration"
  ) {
    const c = new URLSearchParams();
    return (
      c.set(dl, r.pathname),
      L.jsx(Rn, {
        to: `/legacy-migration?${c.toString()}`,
        replace: !0,
      })
    );
  }
  return L.jsx(L.Fragment, {
    children: n,
  });
}
const hT = {
    id: "public",
    Component: dT,
    children: [
      {
        path: "auth/discord/callback",
        lazy: async () => ({
          Component: (
            await ze(
              async () => {
                const { default: n } =
                  await /* Dynamic import */ import("./DiscordCallback-kCpBkqPW.js");
                return {
                  default: n,
                };
              },
              __vite__mapDeps([90, 19, 17]),
            )
          ).default,
        }),
      },
      {
        path: "verify-otp",
        lazy: async () => ({
          Component: (
            await ze(
              async () => {
                const { default: n } =
                  await /* Dynamic import */ import("./VerifyOtp-DBqwSVec.js");
                return {
                  default: n,
                };
              },
              __vite__mapDeps([91, 1, 10]),
            )
          ).default,
        }),
      },
    ],
  },
  mT = wE([
    {
      id: "root",
      Component: J_,
      hydrateFallbackElement: L.jsx(Dd, {}),
      ErrorBoundary: I_,
      children: [uT, fT, hT],
    },
  ]);
function gT() {
  return L.jsx(xw, {
    children: L.jsx(QR, {
      children: L.jsx(ER, {
        children: L.jsx(Rw, {
          children: L.jsx(GR, {
            children: L.jsx(K2, {
              router: mT,
            }),
          }),
        }),
      }),
    }),
  });
}
fS.createRoot(document.getElementById("root")).render(L.jsx(gT, {}));
export {
  Py as $,
  JT as A,
  O3 as B,
  sd as C,
  p_ as D,
  cl as E,
  fS as F,
  md as G,
  A3 as H,
  x_ as I,
  mw as J,
  pT as K,
  Jy as L,
  Tv as M,
  vT as N,
  PT as O,
  FT as P,
  K3 as Q,
  dS as R,
  I3 as S,
  l_ as T,
  XT as U,
  YR as V,
  v3 as W,
  Y3 as X,
  J3 as Y,
  TE as Z,
  l3 as _,
  E as a,
  N_ as a0,
  q3 as a1,
  id as a2,
  fl as a3,
  dl as a4,
  f3 as a5,
  ZR as a6,
  BT as a7,
  GT as a8,
  hS as a9,
  HR as aa,
  bR as ab,
  Xv as ac,
  Ts as ad,
  yT as ae,
  b3 as af,
  HT as ag,
  UT as ah,
  y_ as ai,
  pr as aj,
  t3 as ak,
  o3 as al,
  _R as am,
  c3 as an,
  tn as ao,
  aT as ap,
  Vv as aq,
  IR as ar,
  M3 as as,
  Cs as at,
  d3 as au,
  qT as b,
  Uv as c,
  XR as d,
  he as e,
  w3 as f,
  ji as g,
  El as h,
  VT as i,
  L as j,
  R_ as k,
  D3 as l,
  YT as m,
  Et as n,
  $T as o,
  Rd as p,
  O_ as q,
  Tw as r,
  A_ as s,
  c_ as t,
  xl as u,
  ZT as v,
  IT as w,
  t_ as x,
  KT as y,
  QT as z,
};
