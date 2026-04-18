import {
  a as f,
  j as i,
  e as K,
  aa as ke,
  u as ce,
  I as We,
  _ as te,
  B as O,
  L as T,
  W,
  ab as Ae,
  p as Ve,
  Y as be,
  ac as Ze,
  ad as V,
  M as Ye,
  ae as Ue,
  f as Qe,
  V as Ge,
  h as Je,
  af as Xe,
  a6 as qe,
} from "./index-Bx06KCE-.js";
import {
  a as et,
  S as tt,
  N as rt,
  D as st,
  T as nt,
  n as fe,
  u as at,
  U as it,
} from "./UserSettingsModal-CzYn2rcs.js";
import { K as G, O as Y } from "./transition-Cxix63ts.js";
import { h as Ce, z as Ee } from "./dialog-DOjFQwF9.js";
import { F as je } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as pe } from "./CurrencyDollarIcon-DU3HPuAk.js";
import { F as ot } from "./ChevronRightIcon-EvEZ5GcB.js";
import { F as ct } from "./CalendarIcon-BAdYkhA_.js";
import { F as lt } from "./XMarkIcon-mqVC0SZA.js";
import { M as ut, a as dt, B as ht, I as ft } from "./listbox-BwGC_4fO.js";
import { S as pt } from "./teamopLogoBlack-DzW8yP3A.js";
import { F as mt } from "./Cog6ToothIcon-EOZD7MO5.js";
import { v as gt, D as xt, L as yt } from "./index-C5vO_a11.js";

/* ==== Fuse.js - Fuzzy Search Library (v7.1.0) ==== */

/* ---- Type Checking Utilities ---- */
function D(t) {
  return Array.isArray ? Array.isArray(t) : Se(t) === "[object Array]";
}
function vt(t) {
  if (typeof t == "string") return t;
  let e = t + "";
  return e == "0" && 1 / t == -1 / 0 ? "-0" : e;
}
function wt(t) {
  return t == null ? "" : vt(t);
}
function N(t) {
  return typeof t == "string";
}
function Fe(t) {
  return typeof t == "number";
}
function kt(t) {
  return t === !0 || t === !1 || (At(t) && Se(t) == "[object Boolean]");
}
function Me(t) {
  return typeof t == "object";
}
function At(t) {
  return Me(t) && t !== null;
}
function b(t) {
  return t != null;
}
function X(t) {
  return !t.trim().length;
}
function Se(t) {
  return t == null
    ? t === void 0
      ? "[object Undefined]"
      : "[object Null]"
    : Object.prototype.toString.call(t);
}
const bt = "Incorrect 'index' type",
  Ct = (t) => `Invalid value for key ${t}`,
  Et = (t) => `Pattern length exceeds max of ${t}.`,
  jt = (t) => `Missing ${t} property in key`,
  Ft = (t) => `Property 'weight' in key '${t}' must be a positive integer`,
  me = Object.prototype.hasOwnProperty;
class Mt {
  constructor(e) {
    this._keys = [];
    this._keyMap = {};
    let r = 0;
    e.forEach((item) => {
      let n = Ne(item);
      this._keys.push(n);
      this._keyMap[n.id] = n;
      r += n.weight;
    });
    this._keys.forEach((item) => {
      item.weight /= r;
    });
  }
  get(e) {
    return this._keyMap[e];
  }
  keys() {
    return this._keys;
  }
  toJSON() {
    return JSON.stringify(this._keys);
  }
}
function Ne(props) {
  let e = null,
    r = null,
    s = null,
    n = 1,
    a = null;
  if (N(props) || D(props)) {
    s = props;
    e = ge(props);
    r = re(props);
  } else {
    if (!me.call(props, "name")) throw new Error(jt("name"));
    const o = props.name;
    if (((s = o), me.call(props, "weight") && ((n = props.weight), n <= 0)))
      throw new Error(Ft(o));
    e = ge(o);
    r = re(o);
    a = props.getFn;
  }
  return {
    path: e,
    id: r,
    weight: n,
    src: s,
    getFn: a,
  };
}
function ge(t) {
  return D(t) ? t : t.split(".");
}
function re(t) {
  return D(t) ? t.join(".") : t;
}
function St(t, e) {
  let r = [],
    s = !1;
  const n = (a, o, c) => {
    if (b(a))
      if (!o[c]) r.push(a);
      else {
        let l = o[c];
        const u = a[l];
        if (!b(u)) return;
        if (c === o.length - 1 && (N(u) || Fe(u) || kt(u))) r.push(wt(u));
        else if (D(u)) {
          s = !0;
          for (let h = 0, d = u.length; h < d; h += 1) n(u[h], o, c + 1);
        } else if (o.length) {
          n(u, o, c + 1);
        }
      }
  };
  return (n(t, N(e) ? e.split(".") : e, 0), s ? r : r[0]);
}
const Nt = {
    includeMatches: !1,
    findAllMatches: !1,
    minMatchCharLength: 1,
  },
  Bt = {
    isCaseSensitive: !1,
    ignoreDiacritics: !1,
    includeScore: !1,
    keys: [],
    shouldSort: !0,
    sortFn: (t, e) =>
      t.score === e.score
        ? t.idx < e.idx
          ? -1
          : 1
        : t.score < e.score
          ? -1
          : 1,
  },
  Dt = {
    location: 0,
    threshold: 0.6,
    distance: 100,
  },
  Lt = {
    useExtendedSearch: !1,
    getFn: St,
    ignoreLocation: !1,
    ignoreFieldNorm: !1,
    fieldNormWeight: 1,
  };
var p = {
  ...Bt,
  ...Nt,
  ...Dt,
  ...Lt,
};
const It = /[^ ]+/g;
function Rt(t = 1, e = 3) {
  const r = new Map(),
    s = Math.pow(10, e);
  return {
    get(n) {
      const a = n.match(It).length;
      if (r.has(a)) return r.get(a);
      const o = 1 / Math.pow(a, 0.5 * t),
        c = parseFloat(Math.round(o * s) / s);
      return (r.set(a, c), c);
    },
    clear() {
      r.clear();
    },
  };
}
class le {
  constructor({
    getFn: e = p.getFn,
    fieldNormWeight: r = p.fieldNormWeight,
  } = {}) {
    this.norm = Rt(r, 3);
    this.getFn = e;
    this.isCreated = !1;
    this.setIndexRecords();
  }
  setSources(e = []) {
    this.docs = e;
  }
  setIndexRecords(e = []) {
    this.records = e;
  }
  setKeys(e = []) {
    this.keys = e;
    this._keysMap = {};
    e.forEach((item, index) => {
      this._keysMap[item.id] = index;
    });
  }
  create() {
    this.isCreated ||
      !this.docs.length ||
      ((this.isCreated = !0),
      N(this.docs[0])
        ? this.docs.forEach((item, index) => {
            this._addString(item, index);
          })
        : this.docs.forEach((item, index) => {
            this._addObject(item, index);
          }),
      this.norm.clear());
  }
  add(e) {
    const r = this.size();
    N(e) ? this._addString(e, r) : this._addObject(e, r);
  }
  removeAt(e) {
    this.records.splice(e, 1);
    for (let r = e, s = this.size(); r < s; r += 1) this.records[r].i -= 1;
  }
  getValueForItemAtKeyId(e, r) {
    return e[this._keysMap[r]];
  }
  size() {
    return this.records.length;
  }
  _addString(e, r) {
    if (!b(e) || X(e)) return;
    let s = {
      v: e,
      i: r,
      n: this.norm.get(e),
    };
    this.records.push(s);
  }
  _addObject(e, r) {
    let s = {
      i: r,
      $: {},
    };
    this.keys.forEach((item, index) => {
      let o = item.getFn ? item.getFn(e) : this.getFn(e, item.path);
      if (b(o)) {
        if (D(o)) {
          let c = [];
          const l = [
            {
              nestedArrIndex: -1,
              value: o,
            },
          ];
          for (; l.length; ) {
            const { nestedArrIndex: u, value: h } = l.pop();
            if (b(h))
              if (N(h) && !X(h)) {
                let d = {
                  v: h,
                  i: u,
                  n: this.norm.get(h),
                };
                c.push(d);
              } else if (D(h)) {
                h.forEach((item, index) => {
                  l.push({
                    nestedArrIndex: index,
                    value: item,
                  });
                });
              }
          }
          s.$[index] = c;
        } else if (N(o) && !X(o)) {
          let c = {
            v: o,
            n: this.norm.get(o),
          };
          s.$[index] = c;
        }
      }
    });
    this.records.push(s);
  }
  toJSON() {
    return {
      keys: this.keys,
      records: this.records,
    };
  }
}
function Be(
  t,
  e,
  { getFn: r = p.getFn, fieldNormWeight: s = p.fieldNormWeight } = {},
) {
  const n = new le({
    getFn: r,
    fieldNormWeight: s,
  });
  return (n.setKeys(t.map(Ne)), n.setSources(e), n.create(), n);
}
function _t(
  t,
  { getFn: e = p.getFn, fieldNormWeight: r = p.fieldNormWeight } = {},
) {
  const { keys: s, records: n } = t,
    a = new le({
      getFn: e,
      fieldNormWeight: r,
    });
  return (a.setKeys(s), a.setIndexRecords(n), a);
}
function H(
  t,
  {
    errors: e = 0,
    currentLocation: r = 0,
    expectedLocation: s = 0,
    distance: n = p.distance,
    ignoreLocation: a = p.ignoreLocation,
  } = {},
) {
  const o = e / t.length;
  if (a) return o;
  const c = Math.abs(s - r);
  if (n) {
    return o + c / n;
  }
  if (c) {
    return 1;
  }
  return o;
}
function Ot(t = [], e = p.minMatchCharLength) {
  let r = [],
    s = -1,
    n = -1,
    a = 0;
  for (let o = t.length; a < o; a += 1) {
    let c = t[a];
    c && s === -1
      ? (s = a)
      : !c &&
        s !== -1 &&
        ((n = a - 1), n - s + 1 >= e && r.push([s, n]), (s = -1));
  }
  return (t[a - 1] && a - s >= e && r.push([s, a - 1]), r);
}
const R = 32;
function $t(
  t,
  e,
  r,
  {
    location: s = p.location,
    distance: n = p.distance,
    threshold: a = p.threshold,
    findAllMatches: o = p.findAllMatches,
    minMatchCharLength: c = p.minMatchCharLength,
    includeMatches: l = p.includeMatches,
    ignoreLocation: u = p.ignoreLocation,
  } = {},
) {
  if (e.length > R) throw new Error(Et(R));
  const h = e.length,
    d = t.length,
    m = Math.max(0, Math.min(s, d));
  let g = a,
    y = m;
  const w = c > 1 || l,
    v = w ? Array(d) : [];
  let j;
  for (; (j = t.indexOf(e, y)) > -1; ) {
    let k = H(e, {
      currentLocation: j,
      expectedLocation: m,
      distance: n,
      ignoreLocation: u,
    });
    if (((g = Math.min(k, g)), (y = j + h), w)) {
      let E = 0;
      for (; E < h; ) {
        v[j + E] = 1;
        E += 1;
      }
    }
  }
  y = -1;
  let C = [],
    F = 1,
    x = h + d;
  const z = 1 << (h - 1);
  for (let k = 0; k < h; k += 1) {
    let E = 0,
      S = x;
    for (; E < S; ) {
      H(e, {
        errors: k,
        currentLocation: m + S,
        expectedLocation: m,
        distance: n,
        ignoreLocation: u,
      }) <= g
        ? (E = S)
        : (x = S);
      S = Math.floor((x - E) / 2 + E);
    }
    x = S;
    let de = Math.max(1, m - S + 1),
      J = o ? d : Math.min(m + S, d) + h,
      _ = Array(J + 2);
    _[J + 1] = (1 << k) - 1;
    for (let M = J; M >= de; M -= 1) {
      let P = M - 1,
        he = r[t.charAt(P)];
      if (
        (w && (v[P] = +!!he),
        (_[M] = ((_[M + 1] << 1) | 1) & he),
        k && (_[M] |= ((C[M + 1] | C[M]) << 1) | 1 | C[M + 1]),
        _[M] & z &&
          ((F = H(e, {
            errors: k,
            currentLocation: P,
            expectedLocation: m,
            distance: n,
            ignoreLocation: u,
          })),
          F <= g))
      ) {
        if (((g = F), (y = P), y <= m)) break;
        de = Math.max(1, 2 * m - y);
      }
    }
    if (
      H(e, {
        errors: k + 1,
        currentLocation: m,
        expectedLocation: m,
        distance: n,
        ignoreLocation: u,
      }) > g
    )
      break;
    C = _;
  }
  const A = {
    isMatch: y >= 0,
    score: Math.max(0.001, F),
  };
  if (w) {
    const k = Ot(v, c);
    k.length ? l && (A.indices = k) : (A.isMatch = !1);
  }
  return A;
}
function Tt(t) {
  let e = {};
  for (let r = 0, s = t.length; r < s; r += 1) {
    const n = t.charAt(r);
    e[n] = (e[n] || 0) | (1 << (s - r - 1));
  }
  return e;
}
const U = String.prototype.normalize
  ? (t) =>
      t
        .normalize("NFD")
        .replace(
          /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g,
          "",
        )
  : (t) => t;
class De {
  constructor(
    e,
    {
      location: r = p.location,
      threshold: s = p.threshold,
      distance: n = p.distance,
      includeMatches: a = p.includeMatches,
      findAllMatches: o = p.findAllMatches,
      minMatchCharLength: c = p.minMatchCharLength,
      isCaseSensitive: l = p.isCaseSensitive,
      ignoreDiacritics: u = p.ignoreDiacritics,
      ignoreLocation: h = p.ignoreLocation,
    } = {},
  ) {
    if (
      ((this.options = {
        location: r,
        threshold: s,
        distance: n,
        includeMatches: a,
        findAllMatches: o,
        minMatchCharLength: c,
        isCaseSensitive: l,
        ignoreDiacritics: u,
        ignoreLocation: h,
      }),
      (e = l ? e : e.toLowerCase()),
      (e = u ? U(e) : e),
      (this.pattern = e),
      (this.chunks = []),
      !this.pattern.length)
    )
      return;
    const d = (g, y) => {
        this.chunks.push({
          pattern: g,
          alphabet: Tt(g),
          startIndex: y,
        });
      },
      m = this.pattern.length;
    if (m > R) {
      let g = 0;
      const y = m % R,
        w = m - y;
      for (; g < w; ) {
        d(this.pattern.substr(g, R), g);
        g += R;
      }
      if (y) {
        const v = m - R;
        d(this.pattern.substr(v), v);
      }
    } else d(this.pattern, 0);
  }
  searchIn(e) {
    const {
      isCaseSensitive: r,
      ignoreDiacritics: s,
      includeMatches: n,
    } = this.options;
    if (
      ((e = r ? e : e.toLowerCase()), (e = s ? U(e) : e), this.pattern === e)
    ) {
      let w = {
        isMatch: !0,
        score: 0,
      };
      return (n && (w.indices = [[0, e.length - 1]]), w);
    }
    const {
      location: a,
      distance: o,
      threshold: c,
      findAllMatches: l,
      minMatchCharLength: u,
      ignoreLocation: h,
    } = this.options;
    let d = [],
      m = 0,
      g = !1;
    this.chunks.forEach(({ pattern: w, alphabet: v, startIndex: j }) => {
      const {
        isMatch: C,
        score: F,
        indices: x,
      } = $t(e, w, v, {
        location: a + j,
        distance: o,
        threshold: c,
        findAllMatches: l,
        minMatchCharLength: u,
        includeMatches: n,
        ignoreLocation: h,
      });
      if (C) {
        g = !0;
      }
      m += F;
      if (C && x) {
        d = [...d, ...x];
      }
    });
    let y = {
      isMatch: g,
      score: g ? m / this.chunks.length : 1,
    };
    return (g && n && (y.indices = d), y);
  }
}
class I {
  constructor(e) {
    this.pattern = e;
  }
  static isMultiMatch(e) {
    return xe(e, this.multiRegex);
  }
  static isSingleMatch(e) {
    return xe(e, this.singleRegex);
  }
  search() {}
}
function xe(t, e) {
  const r = t.match(e);
  return r ? r[1] : null;
}
class Kt extends I {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "exact";
  }
  static get multiRegex() {
    return /^="(.*)"$/;
  }
  static get singleRegex() {
    return /^=(.*)$/;
  }
  search(e) {
    const r = e === this.pattern;
    return {
      isMatch: r,
      score: r ? 0 : 1,
      indices: [0, this.pattern.length - 1],
    };
  }
}
class zt extends I {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "inverse-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"$/;
  }
  static get singleRegex() {
    return /^!(.*)$/;
  }
  search(e) {
    const s = e.indexOf(this.pattern) === -1;
    return {
      isMatch: s,
      score: s ? 0 : 1,
      indices: [0, e.length - 1],
    };
  }
}
class Pt extends I {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "prefix-exact";
  }
  static get multiRegex() {
    return /^\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^\^(.*)$/;
  }
  search(e) {
    const r = e.startsWith(this.pattern);
    return {
      isMatch: r,
      score: r ? 0 : 1,
      indices: [0, this.pattern.length - 1],
    };
  }
}
class Ht extends I {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "inverse-prefix-exact";
  }
  static get multiRegex() {
    return /^!\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^!\^(.*)$/;
  }
  search(e) {
    const r = !e.startsWith(this.pattern);
    return {
      isMatch: r,
      score: r ? 0 : 1,
      indices: [0, e.length - 1],
    };
  }
}
class Wt extends I {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "suffix-exact";
  }
  static get multiRegex() {
    return /^"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^(.*)\$$/;
  }
  search(e) {
    const r = e.endsWith(this.pattern);
    return {
      isMatch: r,
      score: r ? 0 : 1,
      indices: [e.length - this.pattern.length, e.length - 1],
    };
  }
}
class Vt extends I {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "inverse-suffix-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^!(.*)\$$/;
  }
  search(e) {
    const r = !e.endsWith(this.pattern);
    return {
      isMatch: r,
      score: r ? 0 : 1,
      indices: [0, e.length - 1],
    };
  }
}
class Le extends I {
  constructor(
    e,
    {
      location: r = p.location,
      threshold: s = p.threshold,
      distance: n = p.distance,
      includeMatches: a = p.includeMatches,
      findAllMatches: o = p.findAllMatches,
      minMatchCharLength: c = p.minMatchCharLength,
      isCaseSensitive: l = p.isCaseSensitive,
      ignoreDiacritics: u = p.ignoreDiacritics,
      ignoreLocation: h = p.ignoreLocation,
    } = {},
  ) {
    super(e);
    this._bitapSearch = new De(e, {
      location: r,
      threshold: s,
      distance: n,
      includeMatches: a,
      findAllMatches: o,
      minMatchCharLength: c,
      isCaseSensitive: l,
      ignoreDiacritics: u,
      ignoreLocation: h,
    });
  }
  static get type() {
    return "fuzzy";
  }
  static get multiRegex() {
    return /^"(.*)"$/;
  }
  static get singleRegex() {
    return /^(.*)$/;
  }
  search(e) {
    return this._bitapSearch.searchIn(e);
  }
}
class Ie extends I {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "include";
  }
  static get multiRegex() {
    return /^'"(.*)"$/;
  }
  static get singleRegex() {
    return /^'(.*)$/;
  }
  search(e) {
    let r = 0,
      s;
    const n = [],
      a = this.pattern.length;
    for (; (s = e.indexOf(this.pattern, r)) > -1; ) {
      r = s + a;
      n.push([s, r - 1]);
    }
    const o = !!n.length;
    return {
      isMatch: o,
      score: o ? 0 : 1,
      indices: n,
    };
  }
}
const se = [Kt, Ie, Pt, Ht, Vt, Wt, zt, Le],
  ye = se.length,
  Zt = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/,
  Yt = "|";
function Ut(t, e = {}) {
  return t.split(Yt).map((item) => {
    let s = item
        .trim()
        .split(Zt)
        .filter((item) => item && !!item.trim()),
      n = [];
    for (let a = 0, o = s.length; a < o; a += 1) {
      const c = s[a];
      let l = !1,
        u = -1;
      for (; !l && ++u < ye; ) {
        const h = se[u];
        let d = h.isMultiMatch(c);
        if (d) {
          (n.push(new h(d, e)), (l = !0));
        }
      }
      if (!l)
        for (u = -1; ++u < ye; ) {
          const h = se[u];
          let d = h.isSingleMatch(c);
          if (d) {
            n.push(new h(d, e));
            break;
          }
        }
    }
    return n;
  });
}
const Qt = new Set([Le.type, Ie.type]);
class Gt {
  constructor(
    e,
    {
      isCaseSensitive: r = p.isCaseSensitive,
      ignoreDiacritics: s = p.ignoreDiacritics,
      includeMatches: n = p.includeMatches,
      minMatchCharLength: a = p.minMatchCharLength,
      ignoreLocation: o = p.ignoreLocation,
      findAllMatches: c = p.findAllMatches,
      location: l = p.location,
      threshold: u = p.threshold,
      distance: h = p.distance,
    } = {},
  ) {
    this.query = null;
    this.options = {
      isCaseSensitive: r,
      ignoreDiacritics: s,
      includeMatches: n,
      minMatchCharLength: a,
      findAllMatches: c,
      ignoreLocation: o,
      location: l,
      threshold: u,
      distance: h,
    };
    e = r ? e : e.toLowerCase();
    e = s ? U(e) : e;
    this.pattern = e;
    this.query = Ut(this.pattern, this.options);
  }
  static condition(e, r) {
    return r.useExtendedSearch;
  }
  searchIn(e) {
    const r = this.query;
    if (!r)
      return {
        isMatch: !1,
        score: 1,
      };
    const {
      includeMatches: s,
      isCaseSensitive: n,
      ignoreDiacritics: a,
    } = this.options;
    e = n ? e : e.toLowerCase();
    e = a ? U(e) : e;
    let o = 0,
      c = [],
      l = 0;
    for (let u = 0, h = r.length; u < h; u += 1) {
      const d = r[u];
      c.length = 0;
      o = 0;
      for (let m = 0, g = d.length; m < g; m += 1) {
        const y = d[m],
          { isMatch: w, indices: v, score: j } = y.search(e);
        if (w) {
          if (((o += 1), (l += j), s)) {
            const C = y.constructor.type;
            Qt.has(C) ? (c = [...c, ...v]) : c.push(v);
          }
        } else {
          l = 0;
          o = 0;
          c.length = 0;
          break;
        }
      }
      if (o) {
        let m = {
          isMatch: !0,
          score: l / o,
        };
        return (s && (m.indices = c), m);
      }
    }
    return {
      isMatch: !1,
      score: 1,
    };
  }
}
const ne = [];
function Jt(...t) {
  ne.push(...t);
}
function ae(t, e) {
  for (let r = 0, s = ne.length; r < s; r += 1) {
    let n = ne[r];
    if (n.condition(t, e)) return new n(t, e);
  }
  return new De(t, e);
}
const Q = {
    AND: "$and",
    OR: "$or",
  },
  ie = {
    PATH: "$path",
    PATTERN: "$val",
  },
  oe = (t) => !!(t[Q.AND] || t[Q.OR]),
  Xt = (t) => !!t[ie.PATH],
  qt = (t) => {
    return !D(t) && Me(t) && !oe(t);
  },
  ve = (t) => ({
    [Q.AND]: Object.keys(t).map((item) => ({
      [item]: t[item],
    })),
  });
function Re(t, e, { auto: r = !0 } = {}) {
  const s = (n) => {
    let a = Object.keys(n);
    const o = Xt(n);
    if (!o && a.length > 1 && !oe(n)) return s(ve(n));
    if (qt(n)) {
      const l = o ? n[ie.PATH] : a[0],
        u = o ? n[ie.PATTERN] : n[l];
      if (!N(u)) throw new Error(Ct(l));
      const h = {
        keyId: re(l),
        pattern: u,
      };
      return (r && (h.searcher = ae(u, e)), h);
    }
    let c = {
      children: [],
      operator: a[0],
    };
    return (
      a.forEach((item) => {
        const u = n[item];
        if (D(u)) {
          u.forEach((item) => {
            c.children.push(s(item));
          });
        }
      }),
      c
    );
  };
  return (oe(t) || (t = ve(t)), s(t));
}
function er(t, { ignoreFieldNorm: e = p.ignoreFieldNorm }) {
  t.forEach((item) => {
    let s = 1;
    item.matches.forEach(({ key: n, norm: a, score: o }) => {
      const c = n ? n.weight : null;
      s *= Math.pow(o === 0 && c ? Number.EPSILON : o, (c || 1) * (e ? 1 : a));
    });
    item.score = s;
  });
}
function tr(t, e) {
  const r = t.matches;
  e.matches = [];
  if (b(r)) {
    r.forEach((props) => {
      if (!b(props.indices) || !props.indices.length) return;
      const { indices: n, value: a } = props;
      let o = {
        indices: n,
        value: a,
      };
      if (props.key) {
        o.key = props.key.src;
      }
      if (props.idx > -1) {
        o.refIndex = props.idx;
      }
      e.matches.push(o);
    });
  }
}
function rr(t, e) {
  e.score = t.score;
}
function sr(
  t,
  e,
  {
    includeMatches: r = p.includeMatches,
    includeScore: s = p.includeScore,
  } = {},
) {
  const n = [];
  return (
    r && n.push(tr),
    s && n.push(rr),
    t.map((props) => {
      const { idx: o } = props,
        c = {
          item: e[o],
          refIndex: o,
        };
      return (
        n.length &&
          n.forEach((item) => {
            item(props, c);
          }),
        c
      );
    })
  );
}
class $ {
  constructor(e, r = {}, s) {
    this.options = {
      ...p,
      ...r,
    };
    this.options.useExtendedSearch;
    this._keyStore = new Mt(this.options.keys);
    this.setCollection(e, s);
  }
  setCollection(e, r) {
    if (((this._docs = e), r && !(r instanceof le))) throw new Error(bt);
    this._myIndex =
      r ||
      Be(this.options.keys, this._docs, {
        getFn: this.options.getFn,
        fieldNormWeight: this.options.fieldNormWeight,
      });
  }
  add(e) {
    if (b(e)) {
      (this._docs.push(e), this._myIndex.add(e));
    }
  }
  remove(e = () => !1) {
    const r = [];
    for (let s = 0, n = this._docs.length; s < n; s += 1) {
      const a = this._docs[s];
      if (e(a, s)) {
        (this.removeAt(s), (s -= 1), (n -= 1), r.push(a));
      }
    }
    return r;
  }
  removeAt(e) {
    this._docs.splice(e, 1);
    this._myIndex.removeAt(e);
  }
  getIndex() {
    return this._myIndex;
  }
  search(e, { limit: r = -1 } = {}) {
    const {
      includeMatches: s,
      includeScore: n,
      shouldSort: a,
      sortFn: o,
      ignoreFieldNorm: c,
    } = this.options;
    let l = N(e)
      ? N(this._docs[0])
        ? this._searchStringList(e)
        : this._searchObjectList(e)
      : this._searchLogical(e);
    return (
      er(l, {
        ignoreFieldNorm: c,
      }),
      a && l.sort(o),
      Fe(r) && r > -1 && (l = l.slice(0, r)),
      sr(l, this._docs, {
        includeMatches: s,
        includeScore: n,
      })
    );
  }
  _searchStringList(e) {
    const r = ae(e, this.options),
      { records: s } = this._myIndex,
      n = [];
    return (
      s.forEach(({ v: a, i: o, n: c }) => {
        if (!b(a)) return;
        const { isMatch: l, score: u, indices: h } = r.searchIn(a);
        if (l) {
          n.push({
            item: a,
            idx: o,
            matches: [
              {
                score: u,
                value: a,
                norm: c,
                indices: h,
              },
            ],
          });
        }
      }),
      n
    );
  }
  _searchLogical(e) {
    const r = Re(e, this.options),
      s = (c, l, u) => {
        if (!c.children) {
          const { keyId: d, searcher: m } = c,
            g = this._findMatches({
              key: this._keyStore.get(d),
              value: this._myIndex.getValueForItemAtKeyId(l, d),
              searcher: m,
            });
          return g && g.length
            ? [
                {
                  idx: u,
                  item: l,
                  matches: g,
                },
              ]
            : [];
        }
        const h = [];
        for (let d = 0, m = c.children.length; d < m; d += 1) {
          const g = c.children[d],
            y = s(g, l, u);
          if (y.length) h.push(...y);
          else if (c.operator === Q.AND) return [];
        }
        return h;
      },
      n = this._myIndex.records,
      a = {},
      o = [];
    return (
      n.forEach(({ $: c, i: l }) => {
        if (b(c)) {
          let u = s(r, c, l);
          if (u.length) {
            (a[l] ||
              ((a[l] = {
                idx: l,
                item: c,
                matches: [],
              }),
              o.push(a[l])),
              u.forEach(({ matches: h }) => {
                a[l].matches.push(...h);
              }));
          }
        }
      }),
      o
    );
  }
  _searchObjectList(e) {
    const r = ae(e, this.options),
      { keys: s, records: n } = this._myIndex,
      a = [];
    return (
      n.forEach(({ $: o, i: c }) => {
        if (!b(o)) return;
        let l = [];
        s.forEach((item, index) => {
          l.push(
            ...this._findMatches({
              key: item,
              value: o[index],
              searcher: r,
            }),
          );
        });
        if (l.length) {
          a.push({
            idx: c,
            item: o,
            matches: l,
          });
        }
      }),
      a
    );
  }
  _findMatches({ key: e, value: r, searcher: s }) {
    if (!b(r)) return [];
    let n = [];
    if (D(r))
      r.forEach(({ v: a, i: o, n: c }) => {
        if (!b(a)) return;
        const { isMatch: l, score: u, indices: h } = s.searchIn(a);
        if (l) {
          n.push({
            score: u,
            key: e,
            value: a,
            idx: o,
            norm: c,
            indices: h,
          });
        }
      });
    else {
      const { v: a, n: o } = r,
        { isMatch: c, score: l, indices: u } = s.searchIn(a);
      if (c) {
        n.push({
          score: l,
          key: e,
          value: a,
          norm: o,
          indices: u,
        });
      }
    }
    return n;
  }
}
$.version = "7.1.0";
$.createIndex = Be;
$.parseIndex = _t;
$.config = p;
$.parseQuery = Re;
Jt(Gt);
function nr(t, e) {
  const [r, s] = f.useState(""),
    n = f.useDeferredValue(r),
    { limit: a = 10, matchAllOnEmptyQuery: o = !1, ...c } = e,
    l = f.useMemo(() => new $(t, c), [t, c]);
  return {
    result: f.useMemo(
      () =>
        !n.trim() && o
          ? t.slice(0, a).map((item, index) => ({
              item: item,
              refIndex: index,
            }))
          : l.search(n.trim(), {
              limit: a,
            }),
      [l, a, o, n, t],
    ),
    query: n,
    loading: n !== r,
    setQuery: s,
  };
}
const ar = (t) => t.replace(/[|\\{}()[\]^$+*?.-]/g, (e) => `\\${e}`);
function ir(t) {
  const e = t
    .filter((item) => item.length !== 0)
    .map((item) => ar(item.trim()));
  return e.length ? new RegExp(`(${e.join("|")})`, "ig") : null;
}
function or({ text: t, query: e }) {
  const r = ir(Array.isArray(e) ? e : [e]);
  return r
    ? t
        .split(r)
        .filter(Boolean)
        .map((item) => ({
          text: item,
          match: r.test(item),
        }))
    : [
        {
          text: t,
          match: !1,
        },
      ];
}
function cr(props) {
  const { text: e, query: r } = props;
  return f.useMemo(
    () =>
      or({
        text: e,
        query: r,
      }),
    [e, r],
  );
}
function lr({ title: t, titleId: e, ...r }, s) {
  return f.createElement(
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
        "aria-labelledby": e,
      },
      r,
    ),
    t
      ? f.createElement(
          "title",
          {
            id: e,
          },
          t,
        )
      : null,
    f.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
    }),
  );
}
const ur = f.forwardRef(lr);
function dr({ title: t, titleId: e, ...r }, s) {
  return f.createElement(
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
        "aria-labelledby": e,
      },
      r,
    ),
    t
      ? f.createElement(
          "title",
          {
            id: e,
          },
          t,
        )
      : null,
    f.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z",
    }),
  );
}
const hr = f.forwardRef(dr);
function fr({ title: t, titleId: e, ...r }, s) {
  return f.createElement(
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
        "aria-labelledby": e,
      },
      r,
    ),
    t
      ? f.createElement(
          "title",
          {
            id: e,
          },
          t,
        )
      : null,
    f.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
    }),
  );
}
const pr = f.forwardRef(fr);
function mr({ title: t, titleId: e, ...r }, s) {
  return f.createElement(
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
        "aria-labelledby": e,
      },
      r,
    ),
    t
      ? f.createElement(
          "title",
          {
            id: e,
          },
          t,
        )
      : null,
    f.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
    }),
  );
}
const gr = f.forwardRef(mr);
function xr({ title: t, titleId: e, ...r }, s) {
  return f.createElement(
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
        "aria-labelledby": e,
      },
      r,
    ),
    t
      ? f.createElement(
          "title",
          {
            id: e,
          },
          t,
        )
      : null,
    f.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z",
    }),
  );
}
const yr = f.forwardRef(xr),
  vr = (t) =>
    f.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 24,
        fill: "none",
        viewBox: "0 0 24 24",
        ...t,
      },
      f.createElement("path", {
        fill: "currentColor",
        d: "M10.5 19a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z",
        opacity: 0.3,
      }),
      f.createElement("path", {
        fill: "currentColor",
        d: "M20.92 22a1.07 1.07 0 0 1-.752-.308l-2.857-2.859a1.086 1.086 0 0 1 0-1.522 1.084 1.084 0 0 1 1.52 0l2.858 2.86a1.086 1.086 0 0 1 0 1.521c-.215.2-.492.308-.768.308Z",
      }),
    ),
  _e = ["shift", "alt", "meta", "mod", "ctrl", "control"],
  wr = {
    esc: "escape",
    return: "enter",
    left: "arrowleft",
    right: "arrowright",
    up: "arrowup",
    down: "arrowdown",
    ShiftLeft: "shift",
    ShiftRight: "shift",
    AltLeft: "alt",
    AltRight: "alt",
    MetaLeft: "meta",
    MetaRight: "meta",
    OSLeft: "meta",
    OSRight: "meta",
    ControlLeft: "ctrl",
    ControlRight: "ctrl",
  };
function L(t) {
  return (wr[t.trim()] || t.trim())
    .toLowerCase()
    .replace(/key|digit|numpad/, "");
}
function Oe(t) {
  return _e.includes(t);
}
function q(t, e = ",") {
  return t.toLowerCase().split(e);
}
function ee(t, e = "+", r = ">", s = !1, n) {
  let a = [],
    o = !1;
  t = t.trim();
  t.includes(r)
    ? ((o = !0),
      (a = t
        .toLocaleLowerCase()
        .split(r)
        .map((item) => L(item))))
    : (a = t
        .toLocaleLowerCase()
        .split(e)
        .map((item) => L(item)));
  const c = {
      alt: a.includes("alt"),
      ctrl: a.includes("ctrl") || a.includes("control"),
      shift: a.includes("shift"),
      meta: a.includes("meta"),
      mod: a.includes("mod"),
      useKey: s,
    },
    l = a.filter((item) => !_e.includes(item));
  return {
    ...c,
    keys: l,
    description: n,
    isSequence: o,
    hotkey: t,
  };
}
if (typeof document < "u") {
  (document.addEventListener("keydown", (t) => {
    if (t.code !== void 0) {
      $e([L(t.code)]);
    }
  }),
    document.addEventListener("keyup", (t) => {
      if (t.code !== void 0) {
        Te([L(t.code)]);
      }
    }));
}
if (typeof window < "u") {
  (window.addEventListener("blur", () => {
    B.clear();
  }),
    window.addEventListener("contextmenu", () => {
      setTimeout(() => {
        B.clear();
      }, 0);
    }));
}
const B = new Set();
function ue(t) {
  return Array.isArray(t);
}
function kr(t, e = ",") {
  return (ue(t) ? t : t.split(e)).every((item) =>
    B.has(item.trim().toLowerCase()),
  );
}
function $e(t) {
  const e = Array.isArray(t) ? t : [t];
  if (B.has("meta")) {
    B.forEach((item) => !Oe(item) && B.delete(item.toLowerCase()));
  }
  e.forEach((item) => B.add(item.toLowerCase()));
}
function Te(t) {
  const e = Array.isArray(t) ? t : [t];
  t === "meta" ? B.clear() : e.forEach((item) => B.delete(item.toLowerCase()));
}
function Ar(t, e, r) {
  if ((typeof r == "function" && r(t, e)) || r === !0) {
    t.preventDefault();
  }
}
function br(t, e, r) {
  return typeof r == "function" ? r(t, e) : r === !0 || r === void 0;
}
const Cr = [
  "input",
  "textarea",
  "select",
  "searchbox",
  "slider",
  "spinbutton",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "textbox",
];
function Er(t) {
  return Ke(t, Cr);
}
function Ke(t, e = !1) {
  const { target: r, composed: s } = t;
  let n, a;
  return (
    jr(r) && s
      ? ((n = t.composedPath()[0] && t.composedPath()[0].tagName),
        (a = t.composedPath()[0] && t.composedPath()[0].role))
      : ((n = r && r.tagName), (a = r && r.role)),
    ue(e)
      ? !!(
          n &&
          e &&
          e.some((item) => item.toLowerCase() === n.toLowerCase() || item === a)
        )
      : !!(n && e && e)
  );
}
function jr(t) {
  return !!t.tagName && !t.tagName.startsWith("-") && t.tagName.includes("-");
}
function Fr(t, e) {
  if (t.length === 0 && e) {
    return (
      console.warn(
        'A hotkey has the "scopes" option set, however no active scopes were found. If you want to use the global scopes feature, you need to wrap your app in a <HotkeysProvider>',
      ),
      !0
    );
  }
  if (e) {
    return t.some((item) => e.includes(item)) || t.includes("*");
  }
  return !0;
}
const Mr = (t, e, r = !1) => {
    const {
        alt: s,
        meta: n,
        mod: a,
        shift: o,
        ctrl: c,
        keys: l,
        useKey: u,
      } = e,
      { code: h, key: d, ctrlKey: m, metaKey: g, shiftKey: y, altKey: w } = t,
      v = L(h);
    if (u && l?.length === 1 && l.includes(d)) return !0;
    if (
      !l?.includes(v) &&
      !["ctrl", "control", "unknown", "meta", "alt", "shift", "os"].includes(v)
    )
      return !1;
    if (!r) {
      if ((s !== w && v !== "alt") || (o !== y && v !== "shift")) return !1;
      if (a) {
        if (!g && !m) return !1;
      } else if (
        (n !== g && v !== "meta" && v !== "os") ||
        (c !== m && v !== "ctrl" && v !== "control")
      )
        return !1;
    }
    if (l && l.length === 1 && l.includes(v)) {
      return !0;
    }
    if (l) {
      return kr(l);
    }
    return !l;
  },
  Sr = f.createContext(void 0),
  Nr = () => f.useContext(Sr);
function ze(t, e) {
  return t && e && typeof t == "object" && typeof e == "object"
    ? Object.keys(t).length === Object.keys(e).length &&
        Object.keys(t).reduce((item, acc) => item && ze(t[acc], e[acc]), !0)
    : t === e;
}
const Br = f.createContext({
    hotkeys: [],
    activeScopes: [],
    toggleScope: () => {},
    enableScope: () => {},
    disableScope: () => {},
  }),
  Dr = () => f.useContext(Br);
function Lr(t) {
  const e = f.useRef(void 0);
  return (ze(e.current, t) || (e.current = t), e.current);
}
const we = (event) => {
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  Ir = typeof window < "u" ? f.useLayoutEffect : f.useEffect;
function Rr(t, e, r, s) {
  const n = f.useRef(null),
    a = f.useRef(!1),
    o = Array.isArray(r) ? (Array.isArray(s) ? void 0 : s) : r,
    c = ue(t) ? t.join(o?.delimiter) : t,
    l = Array.isArray(r) ? r : Array.isArray(s) ? s : void 0,
    u = f.useCallback(e, l ?? []),
    h = f.useRef(u);
  l ? (h.current = u) : (h.current = e);
  const d = Lr(o),
    { activeScopes: m } = Dr(),
    g = Nr();
  return (
    Ir(() => {
      if (d?.enabled === !1 || !Fr(m, d?.scopes)) return;
      let y = [],
        w;
      const v = (x, z = !1) => {
          if (!(Er(x) && !Ke(x, d?.enableOnFormTags))) {
            if (n.current !== null) {
              const A = n.current.getRootNode();
              if (
                (A instanceof Document || A instanceof ShadowRoot) &&
                A.activeElement !== n.current &&
                !n.current.contains(A.activeElement)
              ) {
                we(x);
                return;
              }
            }
            (x.target?.isContentEditable && !d?.enableOnContentEditable) ||
              q(c, d?.delimiter).forEach((item) => {
                if (
                  item.includes(d?.splitKey ?? "+") &&
                  item.includes(d?.sequenceSplitKey ?? ">")
                ) {
                  console.warn(
                    `Hotkey ${item} contains both ${d?.splitKey ?? "+"} and ${d?.sequenceSplitKey ?? ">"} which is not supported.`,
                  );
                  return;
                }
                const k = ee(
                  item,
                  d?.splitKey,
                  d?.sequenceSplitKey,
                  d?.useKey,
                  d?.description,
                );
                if (k.isSequence) {
                  w = setTimeout(() => {
                    y = [];
                  }, d?.sequenceTimeoutMs ?? 1e3);
                  const E = k.useKey ? x.key : L(x.code);
                  if (Oe(E.toLowerCase())) return;
                  y.push(E);
                  const S = k.keys?.[y.length - 1];
                  if (E !== S) {
                    y = [];
                    if (w) {
                      clearTimeout(w);
                    }
                    return;
                  }
                  if (y.length === k.keys?.length) {
                    (h.current(x, k), w && clearTimeout(w), (y = []));
                  }
                } else if (
                  Mr(x, k, d?.ignoreModifiers) ||
                  k.keys?.includes("*")
                ) {
                  if (d?.ignoreEventWhen?.(x) || (z && a.current)) return;
                  if ((Ar(x, k, d?.preventDefault), !br(x, k, d?.enabled))) {
                    we(x);
                    return;
                  }
                  h.current(x, k);
                  z || (a.current = !0);
                }
              });
          }
        },
        j = (x) => {
          if (x.code !== void 0) {
            ($e(L(x.code)),
              ((d?.keydown === void 0 && d?.keyup !== !0) || d?.keydown) &&
                v(x));
          }
        },
        C = (x) => {
          if (x.code !== void 0) {
            (Te(L(x.code)), (a.current = !1), d?.keyup && v(x, !0));
          }
        },
        F = n.current || o?.document || document;
      return (
        F.addEventListener("keyup", C, o?.eventListenerOptions),
        F.addEventListener("keydown", j, o?.eventListenerOptions),
        g &&
          q(c, d?.delimiter).forEach((item) =>
            g.addHotkey(
              ee(
                item,
                d?.splitKey,
                d?.sequenceSplitKey,
                d?.useKey,
                d?.description,
              ),
            ),
          ),
        () => {
          F.removeEventListener("keyup", C, o?.eventListenerOptions);
          F.removeEventListener("keydown", j, o?.eventListenerOptions);
          if (g) {
            q(c, d?.delimiter).forEach((item) =>
              g.removeHotkey(
                ee(
                  item,
                  d?.splitKey,
                  d?.sequenceSplitKey,
                  d?.useKey,
                  d?.description,
                ),
              ),
            );
          }
          y = [];
          if (w) {
            clearTimeout(w);
          }
        }
      );
    }, [c, d, m]),
    n
  );
}
function _r({ children: t, query: e, unstyled: r = !1, highlightClass: s }) {
  if (!(typeof t == "string" || typeof t == "number"))
    throw new Error(
      "The children prop of Highlight must be a string or number.",
    );
  const n = cr({
    query: e,
    text: t.toString(),
  });
  return i.jsx(i.Fragment, {
    children: n.map((item, index) =>
      item.match
        ? i.jsx(
            "mark",
            {
              className: K(
                "whitespace-nowrap",
                !r && "inline-block rounded-xs bg-lime-200 dark:bg-lime-300",
                s,
              ),
              children: item.text,
            },
            index,
          )
        : i.jsx(
            f.Fragment,
            {
              children: item.text,
            },
            index,
          ),
    ),
  });
}
const Z = {
    id: "settings",
    type: "item",
    path: "/settings",
    title: "Settings",
    transKey: "nav.settings.settings",
    icon: "settings",
    childs: [
      {
        id: "general",
        type: "item",
        path: "/settings/general",
        title: "General",
        transKey: "nav.settings.general",
        icon: "settings.general",
      },
      {
        id: "appearance",
        type: "item",
        path: "/settings/appearance",
        title: "Appearance",
        transKey: "nav.settings.appearance",
        icon: "settings.appearance",
      },
    ],
  },
  Or = [
    {
      id: "0",
      Icon: pr,
      title: "Documentation",
      color: "primary",
      to: "/docs/getting-started",
    },
    {
      id: "1",
      Icon: yr,
      title: "Kanban",
      color: "success",
      to: "/apps/kanban",
    },
    {
      id: "2",
      Icon: pe,
      title: "Analytics",
      color: "warning",
      to: "/dashboards/crm-analytics",
    },
    {
      id: "3",
      Icon: ur,
      title: "Chat",
      color: "info",
      to: "/apps/chat",
    },
    {
      id: "4",
      Icon: hr,
      title: "File Manager",
      color: "error",
      to: "/apps/filemanager",
    },
    {
      id: "5",
      Icon: gr,
      title: "Orders",
      color: "info",
      to: "/dashboards/orders",
    },
    {
      id: "6",
      Icon: pe,
      title: "Sales",
      color: "success",
      to: "/dashboards/sales",
    },
  ],
  $r = Pe([...et, Z]);
function Tr({ renderButton: t }) {
  const [e, { open: r, close: s }] = ke(!1);
  return (
    Rr("/", () => r(), {
      ignoreModifiers: !0,
      preventDefault: !0,
    }),
    i.jsxs(i.Fragment, {
      children: [
        i.jsx(G, {
          appear: !0,
          show: e,
          as: f.Fragment,
          children: i.jsxs(Ce, {
            as: "div",
            className:
              "fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden sm:px-5 sm:py-6",
            onClose: s,
            children: [
              i.jsx(Y, {
                as: f.Fragment,
                enter: "ease-out duration-300",
                enterFrom: "opacity-0",
                enterTo: "opacity-100",
                leave: "ease-in duration-200",
                leaveFrom: "opacity-100",
                leaveTo: "opacity-0",
                children: i.jsx("div", {
                  className:
                    "absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/30",
                }),
              }),
              i.jsx(Y, {
                as: f.Fragment,
                enter: "ease-out duration-300",
                enterFrom: "opacity-0 scale-95",
                enterTo: "opacity-100 scale-100",
                leave: "ease-in duration-200",
                leaveFrom: "opacity-100 scale-100",
                leaveTo: "opacity-0 scale-95",
                children: i.jsx(Ee, {
                  className:
                    "dark:bg-dark-700 relative flex h-full w-full max-w-lg origin-bottom flex-col bg-white transition-all duration-300 sm:max-h-[600px] sm:rounded-lg",
                  children: i.jsx(Kr, {
                    close: s,
                  }),
                }),
              }),
            ],
          }),
        }),
        t ? t(r) : null,
      ],
    })
  );
}
function Kr({ close: t }) {
  const { isDark: e } = ce(),
    r = f.useRef(
      `search-input-${Math.random().toString(36).substring(2, 11)}`,
    ).current,
    {
      result: s,
      query: n,
      setQuery: a,
    } = nr($r, {
      keys: ["title"],
      threshold: 0.2,
      matchAllOnEmptyQuery: !1,
    });
  return (
    f.useEffect(() => {
      const o = document.getElementById(r);
      if (o) {
        o.focus();
      }
    }, [r]),
    i.jsxs("div", {
      "data-search-wrapper": !0,
      className: "flex flex-col overflow-hidden",
      children: [
        i.jsx("div", {
          className: "dark:bg-dark-800 rounded-t-lg bg-gray-200 py-2 lg:py-3",
          children: i.jsxs("div", {
            className:
              "flex items-center justify-between pr-4 pl-2 rtl:pr-2 rtl:pl-4",
            children: [
              i.jsx(We, {
                id: r,
                placeholder: "Search here...",
                value: n,
                "data-search-item": !0,
                onChange: (event) => a(event.target.value),
                classNames: {
                  root: "flex-1",
                  input: "border-none",
                },
                prefix: i.jsx(je, {
                  className: "size-5",
                }),
                onKeyDown: te({
                  siblingSelector: "[data-search-item]",
                  parentSelector: "[data-search-wrapper]",
                  activateOnFocus: !1,
                  loop: !0,
                  orientation: "vertical",
                }),
              }),
              i.jsx(O, {
                onClick: t,
                variant: e ? "filled" : "outlined",
                className: "px-3 py-1.5 text-xs",
                children: "ESC",
              }),
            ],
          }),
        }),
        s.length === 0 &&
          n === "" &&
          i.jsxs("div", {
            className: "mt-4",
            children: [
              i.jsx("h3", {
                className: "dark:text-dark-50 px-4 text-gray-800 sm:px-5",
                children: "Popular search",
              }),
              i.jsx("div", {
                className: "mt-3 flex flex-wrap gap-3.5 px-4",
                children: Or.map(
                  ({ id: o, to: c, Icon: l, title: u, color: h }) =>
                    i.jsxs(
                      T,
                      {
                        to: c,
                        onClick: t,
                        className: "w-14 shrink-0 text-center",
                        children: [
                          i.jsx(W, {
                            size: 12,
                            initialColor: h,
                            classNames: {
                              display: "rounded-2xl",
                            },
                            children: i.jsx(l, {
                              className: "size-5 stroke-2",
                            }),
                          }),
                          i.jsx("p", {
                            className:
                              "dark:text-dark-100 mt-1.5 truncate text-xs whitespace-nowrap text-gray-800",
                            children: u,
                          }),
                        ],
                      },
                      o,
                    ),
                ),
              }),
            ],
          }),
        s.length === 0 &&
          n !== "" &&
          i.jsx("div", {
            className: "flex flex-col overflow-y-auto py-4",
            children: i.jsx("h3", {
              className: "dark:text-dark-50 px-4 text-gray-800 sm:px-5",
              children: "No Result Found",
            }),
          }),
        s.length > 0 &&
          i.jsxs("div", {
            className: "flex flex-col overflow-y-auto py-4",
            children: [
              i.jsx("h3", {
                className: "dark:text-dark-50 px-4 text-gray-800 sm:px-5",
                children: "Search Result",
              }),
              i.jsx("div", {
                className: "space-y-3 px-4 pt-3",
                children: s.map(({ item: o, refIndex: c }) =>
                  i.jsxs(
                    T,
                    {
                      onKeyDown: te({
                        siblingSelector: "[data-search-item]",
                        parentSelector: "[data-search-wrapper]",
                        activateOnFocus: !1,
                        loop: !0,
                        orientation: "vertical",
                      }),
                      "data-search-item": !0,
                      to: o.path || "#",
                      className:
                        "group focus:ring-primary-500/50 dark:bg-dark-600 dark:text-dark-100 flex items-center justify-between space-x-2 rounded-lg bg-gray-100 px-2.5 py-2 tracking-wide text-gray-800 outline-hidden transition-all focus:ring-3 rtl:space-x-reverse",
                      onClick: t,
                      children: [
                        i.jsx("div", {
                          className: "min-w-0",
                          children: i.jsx("span", {
                            className: "truncate",
                            children: i.jsx(_r, {
                              query: n,
                              children: o.title || "",
                            }),
                          }),
                        }),
                        i.jsx(ot, {
                          className: "size-4.5 rtl:rotate-180",
                        }),
                      ],
                    },
                    c,
                  ),
                ),
              }),
            ],
          }),
      ],
    })
  );
}
function Pe(t) {
  let e = [];
  return (
    t.forEach((props) => {
      if (props.path && props.type !== "collapse") {
        const { transKey: s, ...n } = props;
        e.push(n);
      }
      if (props.childs) {
        e = e.concat(Pe(props.childs));
      }
    }),
    e
  );
}
const zr = (t) =>
  f.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      fill: "none",
      viewBox: "0 0 24 24",
      ...t,
    },
    f.createElement("path", {
      fill: "currentColor",
      d: "M15 2H9C7.34 2 6 3.34 6 5v14c0 1.66 1.34 3 3 3h6c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3Z",
      opacity: 0.4,
    }),
    f.createElement("path", {
      fill: "currentColor",
      d: "M18.67 5.33h-.34c-.12 0-.23 0-.35.01.01.05.02.1.02.16v13c0 .06-.01.11-.02.16.11.01.22.01.35.01h.34c2.66 0 3.33-.67 3.33-3.34V8.67c0-2.67-.67-3.34-3.33-3.34ZM6 18.5v-13c0-.06.01-.11.02-.16-.12-.01-.23-.01-.35-.01h-.34C2.67 5.33 2 6 2 8.67v6.66c0 2.67.67 3.34 3.33 3.34h.34c.12 0 .23 0 .35-.01A.777.777 0 0 1 6 18.5Z",
    }),
  );
function Pr({ close: t }) {
  const { locale: e } = Ae(),
    r = Ve().locale(e).format("DD MMMM, YYYY");
  return i.jsxs("div", {
    className: "flex items-center justify-between px-4 py-2",
    children: [
      i.jsxs("div", {
        className: "flex shrink-0 items-center gap-1.5",
        children: [
          i.jsx(ct, {
            className: "size-4",
          }),
          i.jsx("span", {
            children: r,
          }),
        ],
      }),
      i.jsx(O, {
        onClick: t,
        variant: "flat",
        isIcon: !0,
        className: "size-6 rounded-full ltr:-mr-1 rtl:-ml-1",
        children: i.jsx(lt, {
          className: "size-4",
        }),
      }),
    ],
  });
}
function Hr() {
  const [t, { open: e, close: r }] = ke();
  return i.jsxs(i.Fragment, {
    children: [
      i.jsx(O, {
        onClick: e,
        variant: "flat",
        isIcon: !0,
        className: "relative size-9 rounded-full",
        children: i.jsx(zr, {
          className: "size-6",
        }),
      }),
      i.jsx(Wr, {
        isOpen: t,
        close: r,
      }),
    ],
  });
}
function Wr({ isOpen: t, close: e }) {
  return i.jsx(G, {
    show: t,
    children: i.jsxs(Ce, {
      open: !0,
      onClose: e,
      static: !0,
      autoFocus: !0,
      children: [
        i.jsx(Y, {
          as: "div",
          enter: "ease-out duration-300",
          enterFrom: "opacity-0",
          enterTo: "opacity-100",
          leave: "ease-in duration-200",
          leaveFrom: "opacity-100",
          leaveTo: "opacity-0",
          className:
            "fixed inset-0 z-60 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40",
        }),
        i.jsxs(Y, {
          as: Ee,
          enter: "ease-out transform-gpu transition-transform duration-200",
          enterFrom: "translate-x-full",
          enterTo: "translate-x-0",
          leave: "ease-in transform-gpu transition-transform duration-200",
          leaveFrom: "translate-x-0",
          leaveTo: "translate-x-full",
          className:
            "dark:bg-dark-750 fixed inset-y-0 right-0 z-61 flex w-screen transform-gpu flex-col bg-white transition-transform duration-200 sm:inset-y-2 sm:mx-2 sm:w-80 sm:rounded-xl",
          children: [
            i.jsx(Pr, {
              close: e,
            }),
            i.jsx(be, {
              size: 4,
              className:
                "hide-scrollbar overflow-y-auto overscroll-contain pb-5",
              children: i.jsx("div", {
                className: "px-4 italic",
                children: "Start magic form here",
              }),
            }),
          ],
        }),
      ],
    }),
  });
}
const Vr = Object.keys(V).map((item) => ({
    value: item,
    label: V[item].label,
    flag: V[item].flag,
  })),
  Zr = () => {
    const [t, e] = f.useState(!1),
      { locale: r, updateLocale: s } = Ae(),
      n = async (a) => {
        e(!0);
        try {
          await s(a);
          e(!1);
        } catch (o) {
          console.error(o);
          e(!1);
        }
      };
    return i.jsx(ut, {
      as: "div",
      value: r,
      onChange: n,
      children: i.jsxs("div", {
        className: "relative",
        children: [
          i.jsx(dt, {
            as: O,
            variant: "flat",
            isIcon: !0,
            className: "size-9 rounded-full",
            children: t
              ? i.jsx(Ze, {
                  color: "primary",
                  className: "size-5",
                })
              : i.jsx("img", {
                  className: "size-6",
                  src: `/images/flags/svg/rounded/${V[r].flag}.svg`,
                  alt: r,
                }),
          }),
          i.jsx(G, {
            enter: "transition ease-out",
            enterFrom: "opacity-0 translate-y-2",
            enterTo: "opacity-100 translate-y-0",
            leave: "transition ease-in",
            leaveFrom: "opacity-100 translate-y-0",
            leaveTo: "opacity-0 translate-y-2",
            children: i.jsx(ht, {
              anchor: {
                to: "bottom end",
                gap: 8,
              },
              className:
                "dark:border-dark-500 dark:bg-dark-700 z-101 w-min min-w-[10rem] overflow-y-auto rounded-lg border border-gray-300 bg-white py-1 font-medium shadow-lg shadow-gray-200/50 outline-hidden focus-visible:outline-hidden ltr:right-0 rtl:left-0 dark:shadow-none",
              children: Vr.map((props) =>
                i.jsx(
                  ft,
                  {
                    className: ({ selected: o, active: c }) =>
                      K(
                        "relative flex cursor-pointer px-4 py-2 transition-colors select-none",
                        c && !o && "dark:bg-dark-600 bg-gray-100",
                        o
                          ? "bg-primary-600 dark:bg-primary-500 text-white"
                          : "dark:text-dark-100 text-gray-800",
                      ),
                    value: props.value,
                    children: i.jsxs("div", {
                      className: "flex space-x-3 rtl:space-x-reverse",
                      children: [
                        i.jsx("img", {
                          className: "size-5",
                          src: `/images/flags/svg/rounded/${props.flag}.svg`,
                          alt: props.value,
                        }),
                        i.jsx("span", {
                          className: "block truncate",
                          children: props.label,
                        }),
                      ],
                    }),
                  },
                  props.value,
                ),
              ),
            }),
          }),
        ],
      }),
    });
  };
function Yr(t) {
  return i.jsxs("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "22",
    height: "20",
    "aria-hidden": "true",
    ...t,
    children: [
      i.jsx("path", {
        fill: "none",
        stroke: "currentColor",
        d: "M3.5.5h12c1.7 0 3 1.3 3 3v13c0 1.7-1.3 3-3 3h-12c-1.7 0-3-1.3-3-3v-13c0-1.7 1.3-3 3-3z",
        opacity: "0.4",
      }),
      i.jsx("path", {
        fill: "currentColor",
        d: "M11.8 6L8 15.1h-.9L10.8 6h1z",
      }),
    ],
  });
}
function us() {
  const { cardSkin: t } = ce();
  return i.jsxs("header", {
    className: K(
      "app-header transition-content sticky top-0 z-20 flex h-[65px] shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-(--margin-x) backdrop-blur-sm backdrop-saturate-150 dark:border-dark-600",
      t === "shadow" ? "dark:bg-dark-750/80" : "dark:bg-dark-900/80",
    ),
    children: [
      i.jsx(tt, {}),
      i.jsxs("div", {
        className: "flex items-center gap-2 ltr:-mr-1.5 rtl:-ml-1.5",
        children: [
          i.jsx(Tr, {
            renderButton: (e) =>
              i.jsxs(i.Fragment, {
                children: [
                  i.jsxs(O, {
                    onClick: e,
                    unstyled: !0,
                    className:
                      "h-8 w-64 justify-between gap-2 rounded-full border border-gray-200 px-3 text-xs-plus hover:border-gray-400 dark:border-dark-500 dark:hover:border-dark-400 max-sm:hidden",
                    children: [
                      i.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          i.jsx(je, {
                            className: "size-4",
                          }),
                          i.jsx("span", {
                            className: "text-gray-400 dark:text-dark-300",
                            children: "Search here...",
                          }),
                        ],
                      }),
                      i.jsx(Yr, {}),
                    ],
                  }),
                  i.jsx(O, {
                    onClick: e,
                    variant: "flat",
                    isIcon: !0,
                    className: "relative size-9 rounded-full sm:hidden",
                    children: i.jsx(vr, {
                      className: "size-6 text-gray-900 dark:text-dark-100",
                    }),
                  }),
                ],
              }),
          }),
          i.jsx(rt, {}),
          i.jsx(st, {}),
          i.jsx(nt, {}),
          i.jsx(Hr, {}),
          i.jsx(Zr, {}),
        ],
      }),
    ],
  });
}
function He({
  id: t,
  title: e,
  isActive: r,
  icon: s,
  component: n,
  onKeyDown: a,
  ...o
}) {
  if (!s || !fe[s]) throw new Error(`Icon ${s} not found in navigationIcons`);
  const c = n || "button",
    { lgAndUp: l } = Ye(),
    u = Ue("root")?.[t]?.info,
    h = fe[s];
  return i.jsxs(c, {
    "data-root-menu-item": !0,
    "data-tooltip": l ? !0 : void 0,
    "data-tooltip-content": e,
    "data-tooltip-place": "right",
    className: K(
      "relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-hidden transition-colors duration-200",
      r
        ? "bg-primary-600/10 text-primary-600 dark:bg-primary-400/15 dark:text-primary-400"
        : "hover:bg-primary-600/20 focus:bg-primary-600/20 active:bg-primary-600/25 dark:text-dark-200 dark:hover:bg-dark-300/20 dark:focus:bg-dark-300/20 dark:active:bg-dark-300/25 text-gray-500",
    ),
    onKeyDown: te({
      siblingSelector: "[data-root-menu-item]",
      parentSelector: "[data-root-menu]",
      activateOnFocus: !1,
      loop: !0,
      orientation: "vertical",
      onKeyDown: a,
    }),
    ...o,
    children: [
      i.jsx(h, {
        className: "size-7",
      }),
      u?.val &&
        i.jsx(Qe, {
          color: u.color,
          className:
            "text-tiny-plus dark:ring-dark-800 absolute top-0 right-0 -m-1 h-4 min-w-[1rem] rounded-full px-1 py-0 ring-1 ring-white",
          children: i.jsx("span", {
            children: u.val,
          }),
        }),
    ],
  });
}
function Ur({ nav: t, setActiveSegmentPath: e, activeSegmentPath: r }) {
  const { t: s } = at(),
    { isExpanded: n, open: a } = Ge(),
    o = (l) => {
      e?.(l);
      n || a();
    },
    c = ({ path: l, type: u, title: h, transKey: d }) => {
      const m = u === "item";
      return {
        component: m ? T : "button",
        ...(m
          ? {
              to: l,
            }
          : {}),
        onClick: m ? void 0 : () => o(l),
        isActive: l === r,
        title: s(d) || h,
        path: l,
      };
    };
  return i.jsx(be, {
    "data-root-menu": !0,
    className:
      "hide-scrollbar flex w-full grow flex-col items-center space-y-4 overflow-y-auto pt-5 lg:space-y-3 xl:pt-5 2xl:space-y-4",
    children: t.map(
      ({ id: l, icon: u, path: h, type: d, title: m, transKey: g }) =>
        i.jsx(
          He,
          {
            ...c({
              path: h,
              type: d,
              title: m,
              transKey: g,
            }),
            id: l,
            icon: u,
          },
          h,
        ),
    ),
  });
}
function Qr() {
  const { user: t } = Je(),
    [e, r] = f.useState(!1);
  return i.jsxs(i.Fragment, {
    children: [
      i.jsxs(gt, {
        className: "relative flex",
        children: [
          i.jsx(xt, {
            className: "relative cursor-pointer",
            children: i.jsx(W, {
              size: 12,
              src: t?.avatarUrl,
              alt: "Profile",
              indicator: i.jsx(Xe, {
                color: "success",
                className: "ltr:right-0 rtl:left-0",
              }),
              className: "hover:ring-2 hover:ring-primary-500 transition-all",
            }),
          }),
          i.jsx(G, {
            as: f.Fragment,
            enter: "transition ease-out",
            enterFrom: "opacity-0 translate-y-2",
            enterTo: "opacity-100 translate-y-0",
            leave: "transition ease-in",
            leaveFrom: "opacity-100 translate-y-0",
            leaveTo: "opacity-0 translate-y-2",
            children: i.jsx(yt, {
              anchor: {
                to: "bottom end",
                gap: 8,
              },
              className:
                "z-70 flex w-64 flex-col rounded-lg border border-gray-150 bg-white shadow-soft transition dark:border-dark-600 dark:bg-dark-700 dark:shadow-none",
              children: ({ close: s }) =>
                i.jsxs(i.Fragment, {
                  children: [
                    i.jsxs("div", {
                      className:
                        "flex items-center gap-4 rounded-t-lg bg-gray-100 px-4 py-5 dark:bg-dark-800",
                      children: [
                        i.jsx(W, {
                          size: 14,
                          src: t?.avatarUrl,
                          alt: t?.name || "User",
                        }),
                        i.jsxs("div", {
                          children: [
                            i.jsx("p", {
                              className:
                                "text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 dark:text-dark-100 dark:hover:text-primary-400 dark:focus:text-primary-400",
                              children: t?.name || t?.username || "Usuário",
                            }),
                            t?.email &&
                              i.jsx("p", {
                                className:
                                  "mt-0.5 text-xs text-gray-400 dark:text-dark-300",
                                children: t.email,
                              }),
                          ],
                        }),
                      ],
                    }),
                    i.jsx("div", {
                      className: "flex flex-col pt-2 pb-5",
                      children: i.jsxs("button", {
                        onClick: () => {
                          r(!0);
                          s();
                        },
                        className:
                          "group flex items-center gap-3 px-4 py-2 tracking-wide outline-hidden transition-all hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-dark-600 dark:focus:bg-dark-600",
                        children: [
                          i.jsx(W, {
                            size: 8,
                            initialColor: "warning",
                            initialVariant: "filled",
                            name: "Configurações",
                            children: i.jsx(mt, {
                              className: "size-4.5",
                            }),
                          }),
                          i.jsxs("div", {
                            children: [
                              i.jsx("h2", {
                                className:
                                  "font-medium text-gray-800 transition-colors group-hover:text-primary-600 group-focus:text-primary-600 dark:text-dark-100 dark:group-hover:text-primary-400 dark:group-focus:text-primary-400",
                                children: "Configurações",
                              }),
                              i.jsx("div", {
                                className:
                                  "truncate text-xs text-gray-400 dark:text-dark-300",
                                children: "Configurações do usuário",
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  ],
                }),
            }),
          }),
        ],
      }),
      i.jsx(it, {
        isOpen: e,
        onClose: () => r(!1),
      }),
    ],
  });
}
function ds({ nav: t, setActiveSegmentPath: e, activeSegmentPath: r }) {
  const { cardSkin: s, isDark: n } = ce(),
    a = n ? qe : pt;
  return i.jsx("div", {
    className: "main-panel",
    children: i.jsxs("div", {
      className: K(
        "border-gray-150 dark:border-dark-600/80 flex h-full w-full flex-col items-center bg-white ltr:border-r rtl:border-l",
        s === "shadow" ? "dark:bg-dark-750" : "dark:bg-dark-900",
      ),
      children: [
        i.jsx("div", {
          className: "flex pt-3.5",
          children: i.jsx(T, {
            to: "/",
            children: i.jsx(a, {
              className: "text-primary-600 dark:text-primary-400 size-10",
            }),
          }),
        }),
        i.jsx(Ur, {
          nav: t,
          activeSegmentPath: r,
          setActiveSegmentPath: e,
        }),
        i.jsxs("div", {
          className: "flex flex-col items-center space-y-3 py-2.5",
          children: [
            i.jsx(He, {
              id: Z.id,
              component: T,
              to: "/settings/appearance",
              title: "Settings",
              isActive: r === Z.path,
              icon: Z.icon,
            }),
            i.jsx(Qr, {}),
          ],
        }),
      ],
    }),
  });
}
export { ur as F, us as H, ds as M, Z as s };
