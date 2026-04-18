import {
  a as U,
  M as Ce,
  j as x,
  k as Re,
  P as we,
  O as ve,
  Q as he,
  U as _e,
} from "./index-Bx06KCE-.js";
function mt() {
  return {
    accessor: (e, o) =>
      typeof e == "function"
        ? {
            ...o,
            accessorFn: e,
          }
        : {
            ...o,
            accessorKey: e,
          },
    display: (e) => e,
    group: (e) => e,
  };
}
function I(e, o) {
  return typeof e == "function" ? e(o) : e;
}
function $(e, o) {
  return (t) => {
    o.setState((n) => ({
      ...n,
      [e]: I(t, n[e]),
    }));
  };
}
function L(e) {
  return e instanceof Function;
}
function Fe(e) {
  return Array.isArray(e) && e.every((item) => typeof item == "number");
}
function $e(e, o) {
  const t = [],
    n = (i) => {
      i.forEach((item) => {
        t.push(item);
        const l = o(item);
        if (l != null && l.length) {
          n(l);
        }
      });
    };
  return (n(e), t);
}
function m(e, o, t) {
  let n = [],
    i;
  return (r) => {
    let l;
    if (t.key && t.debug) {
      l = Date.now();
    }
    const u = e(r);
    if (!(u.length !== n.length || u.some((item, index) => n[index] !== item)))
      return i;
    n = u;
    let g;
    if (
      (t.key && t.debug && (g = Date.now()),
      (i = o(...u)),
      t == null || t.onChange == null || t.onChange(i),
      t.key && t.debug && t != null && t.debug())
    ) {
      const c = Math.round((Date.now() - l) * 100) / 100,
        S = Math.round((Date.now() - g) * 100) / 100,
        d = S / 16,
        s = (f, p) => {
          for (f = String(f); f.length < p; ) f = " " + f;
          return f;
        };
      console.info(
        `%c⏱ ${s(S, 5)} /${s(c, 5)} ms`,
        `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * d, 120))}deg 100% 31%);`,
        t?.key,
      );
    }
    return i;
  };
}
function C(e, o, t, n) {
  return {
    debug: () => {
      var i;
      return (i = e?.debugAll) != null ? i : e[o];
    },
    key: !1,
    onChange: n,
  };
}
function xe(e, o, t, n) {
  const i = () => {
      var l;
      return (l = r.getValue()) != null ? l : e.options.renderFallbackValue;
    },
    r = {
      id: `${o.id}_${t.id}`,
      row: o,
      column: t,
      getValue: () => o.getValue(n),
      renderValue: i,
      getContext: m(
        () => [e, t, o, r],
        (l, u, a, g) => ({
          table: l,
          column: u,
          row: a,
          cell: g,
          getValue: g.getValue,
          renderValue: g.renderValue,
        }),
        C(e.options, "debugCells"),
      ),
    };
  return (
    e._features.forEach((item) => {
      item.createCell == null || item.createCell(r, t, o, e);
    }, {}),
    r
  );
}
function Pe(e, o, t, n) {
  var i, r;
  const u = {
      ...e._getDefaultColumnDef(),
      ...o,
    },
    a = u.accessorKey;
  let g =
      (i =
        (r = u.id) != null
          ? r
          : a
            ? typeof String.prototype.replaceAll == "function"
              ? a.replaceAll(".", "_")
              : a.replace(/\./g, "_")
            : void 0) != null
        ? i
        : typeof u.header == "string"
          ? u.header
          : void 0,
    c;
  if (
    (u.accessorFn
      ? (c = u.accessorFn)
      : a &&
        (a.includes(".")
          ? (c = (d) => {
              let s = d;
              for (const p of a.split(".")) {
                var f;
                s = (f = s) == null ? void 0 : f[p];
              }
              return s;
            })
          : (c = (d) => d[u.accessorKey])),
    !g)
  )
    throw new Error();
  let S = {
    id: `${String(g)}`,
    accessorFn: c,
    parent: n,
    depth: t,
    columnDef: u,
    columns: [],
    getFlatColumns: m(
      () => [!0],
      () => {
        var d;
        return [
          S,
          ...((d = S.columns) == null
            ? void 0
            : d.flatMap((item) => item.getFlatColumns())),
        ];
      },
      C(e.options, "debugColumns"),
    ),
    getLeafColumns: m(
      () => [e._getOrderColumnsFn()],
      (d) => {
        var s;
        if ((s = S.columns) != null && s.length) {
          let f = S.columns.flatMap((item) => item.getLeafColumns());
          return d(f);
        }
        return [S];
      },
      C(e.options, "debugColumns"),
    ),
  };
  for (const d of e._features) d.createColumn == null || d.createColumn(S, e);
  return S;
}
const _ = "debugHeaders";
function ie(e, o, t) {
  var n;
  let r = {
    id: (n = t.id) != null ? n : o.id,
    column: o,
    index: t.index,
    isPlaceholder: !!t.isPlaceholder,
    placeholderId: t.placeholderId,
    depth: t.depth,
    subHeaders: [],
    colSpan: 0,
    rowSpan: 0,
    headerGroup: null,
    getLeafHeaders: () => {
      const l = [],
        u = (a) => {
          if (a.subHeaders && a.subHeaders.length) {
            a.subHeaders.map(u);
          }
          l.push(a);
        };
      return (u(r), l);
    },
    getContext: () => ({
      table: e,
      header: r,
      column: o,
    }),
  };
  return (
    e._features.forEach((item) => {
      item.createHeader == null || item.createHeader(r, e);
    }),
    r
  );
}
const Ve = {
  createTable: (e) => {
    e.getHeaderGroups = m(
      () => [
        e.getAllColumns(),
        e.getVisibleLeafColumns(),
        e.getState().columnPinning.left,
        e.getState().columnPinning.right,
      ],
      (o, t, n, i) => {
        var r, l;
        const u =
            (r = n
              ?.map((S) => t.find((props) => props.id === S))
              .filter(Boolean)) != null
              ? r
              : [],
          a =
            (l = i
              ?.map((S) => t.find((props) => props.id === S))
              .filter(Boolean)) != null
              ? l
              : [],
          g = t.filter(
            (props) =>
              !(n != null && n.includes(props.id)) &&
              !(i != null && i.includes(props.id)),
          );
        return H(o, [...u, ...g, ...a], e);
      },
      C(e.options, _),
    );
    e.getCenterHeaderGroups = m(
      () => [
        e.getAllColumns(),
        e.getVisibleLeafColumns(),
        e.getState().columnPinning.left,
        e.getState().columnPinning.right,
      ],
      (o, t, n, i) => (
        (t = t.filter(
          (props) =>
            !(n != null && n.includes(props.id)) &&
            !(i != null && i.includes(props.id)),
        )),
        H(o, t, e, "center")
      ),
      C(e.options, _),
    );
    e.getLeftHeaderGroups = m(
      () => [
        e.getAllColumns(),
        e.getVisibleLeafColumns(),
        e.getState().columnPinning.left,
      ],
      (o, t, n) => {
        var i;
        const r =
          (i = n
            ?.map((l) => t.find((props) => props.id === l))
            .filter(Boolean)) != null
            ? i
            : [];
        return H(o, r, e, "left");
      },
      C(e.options, _),
    );
    e.getRightHeaderGroups = m(
      () => [
        e.getAllColumns(),
        e.getVisibleLeafColumns(),
        e.getState().columnPinning.right,
      ],
      (o, t, n) => {
        var i;
        const r =
          (i = n
            ?.map((l) => t.find((props) => props.id === l))
            .filter(Boolean)) != null
            ? i
            : [];
        return H(o, r, e, "right");
      },
      C(e.options, _),
    );
    e.getFooterGroups = m(
      () => [e.getHeaderGroups()],
      (o) => [...o].reverse(),
      C(e.options, _),
    );
    e.getLeftFooterGroups = m(
      () => [e.getLeftHeaderGroups()],
      (o) => [...o].reverse(),
      C(e.options, _),
    );
    e.getCenterFooterGroups = m(
      () => [e.getCenterHeaderGroups()],
      (o) => [...o].reverse(),
      C(e.options, _),
    );
    e.getRightFooterGroups = m(
      () => [e.getRightHeaderGroups()],
      (o) => [...o].reverse(),
      C(e.options, _),
    );
    e.getFlatHeaders = m(
      () => [e.getHeaderGroups()],
      (o) => o.map((item) => item.headers).flat(),
      C(e.options, _),
    );
    e.getLeftFlatHeaders = m(
      () => [e.getLeftHeaderGroups()],
      (o) => o.map((item) => item.headers).flat(),
      C(e.options, _),
    );
    e.getCenterFlatHeaders = m(
      () => [e.getCenterHeaderGroups()],
      (o) => o.map((item) => item.headers).flat(),
      C(e.options, _),
    );
    e.getRightFlatHeaders = m(
      () => [e.getRightHeaderGroups()],
      (o) => o.map((item) => item.headers).flat(),
      C(e.options, _),
    );
    e.getCenterLeafHeaders = m(
      () => [e.getCenterFlatHeaders()],
      (o) =>
        o.filter((item) => {
          var n;
          return !((n = item.subHeaders) != null && n.length);
        }),
      C(e.options, _),
    );
    e.getLeftLeafHeaders = m(
      () => [e.getLeftFlatHeaders()],
      (o) =>
        o.filter((item) => {
          var n;
          return !((n = item.subHeaders) != null && n.length);
        }),
      C(e.options, _),
    );
    e.getRightLeafHeaders = m(
      () => [e.getRightFlatHeaders()],
      (o) =>
        o.filter((item) => {
          var n;
          return !((n = item.subHeaders) != null && n.length);
        }),
      C(e.options, _),
    );
    e.getLeafHeaders = m(
      () => [
        e.getLeftHeaderGroups(),
        e.getCenterHeaderGroups(),
        e.getRightHeaderGroups(),
      ],
      (o, t, n) => {
        var i, r, l, u, a, g;
        return [
          ...((i = (r = o[0]) == null ? void 0 : r.headers) != null ? i : []),
          ...((l = (u = t[0]) == null ? void 0 : u.headers) != null ? l : []),
          ...((a = (g = n[0]) == null ? void 0 : g.headers) != null ? a : []),
        ]
          .map((item) => item.getLeafHeaders())
          .flat();
      },
      C(e.options, _),
    );
  },
};
function H(e, o, t, n) {
  var i, r;
  let l = 0;
  const u = function (d, s) {
    if (s === void 0) {
      s = 1;
    }
    l = Math.max(l, s);
    d.filter((item) => item.getIsVisible()).forEach((item) => {
      var p;
      if ((p = item.columns) != null && p.length) {
        u(item.columns, s + 1);
      }
    }, 0);
  };
  u(e);
  let a = [];
  const g = (d, s) => {
      const f = {
          depth: s,
          id: [n, `${s}`].filter(Boolean).join("_"),
          headers: [],
        },
        p = [];
      d.forEach((item) => {
        const w = [...p].reverse()[0],
          v = item.column.depth === f.depth;
        let h,
          V = !1;
        if (
          (v && item.column.parent
            ? (h = item.column.parent)
            : ((h = item.column), (V = !0)),
          w && w?.column === h)
        )
          w.subHeaders.push(item);
        else {
          const F = ie(t, h, {
            id: [n, s, h.id, item?.id].filter(Boolean).join("_"),
            isPlaceholder: V,
            placeholderId: V
              ? `${p.filter((item) => item.column === h).length}`
              : void 0,
            depth: s,
            index: p.length,
          });
          F.subHeaders.push(item);
          p.push(F);
        }
        f.headers.push(item);
        item.headerGroup = f;
      });
      a.push(f);
      if (s > 0) {
        g(p, s - 1);
      }
    },
    c = o.map((item, index) =>
      ie(t, item, {
        depth: l,
        index: index,
      }),
    );
  g(c, l - 1);
  a.reverse();
  const S = (d) =>
    d
      .filter((item) => item.column.getIsVisible())
      .map((item) => {
        let p = 0,
          R = 0,
          w = [0];
        item.subHeaders && item.subHeaders.length
          ? ((w = []),
            S(item.subHeaders).forEach((props) => {
              let { colSpan: V, rowSpan: F } = props;
              p += V;
              w.push(F);
            }))
          : (p = 1);
        const v = Math.min(...w);
        return (
          (R = R + v),
          (item.colSpan = p),
          (item.rowSpan = R),
          {
            colSpan: p,
            rowSpan: R,
          }
        );
      });
  return (S((i = (r = a[0]) == null ? void 0 : r.headers) != null ? i : []), a);
}
const Y = (e, o, t, n, i, r, l) => {
    let u = {
      id: o,
      index: n,
      original: t,
      depth: i,
      parentId: l,
      _valuesCache: {},
      _uniqueValuesCache: {},
      getValue: (a) => {
        if (u._valuesCache.hasOwnProperty(a)) return u._valuesCache[a];
        const g = e.getColumn(a);
        if (g != null && g.accessorFn)
          return (
            (u._valuesCache[a] = g.accessorFn(u.original, n)),
            u._valuesCache[a]
          );
      },
      getUniqueValues: (a) => {
        if (u._uniqueValuesCache.hasOwnProperty(a))
          return u._uniqueValuesCache[a];
        const g = e.getColumn(a);
        if (g != null && g.accessorFn)
          return g.columnDef.getUniqueValues
            ? ((u._uniqueValuesCache[a] = g.columnDef.getUniqueValues(
                u.original,
                n,
              )),
              u._uniqueValuesCache[a])
            : ((u._uniqueValuesCache[a] = [u.getValue(a)]),
              u._uniqueValuesCache[a]);
      },
      renderValue: (a) => {
        var g;
        return (g = u.getValue(a)) != null ? g : e.options.renderFallbackValue;
      },
      subRows: [],
      getLeafRows: () => $e(u.subRows, (a) => a.subRows),
      getParentRow: () => (u.parentId ? e.getRow(u.parentId, !0) : void 0),
      getParentRows: () => {
        let a = [],
          g = u;
        for (;;) {
          const c = g.getParentRow();
          if (!c) break;
          a.push(c);
          g = c;
        }
        return a.reverse();
      },
      getAllCells: m(
        () => [e.getAllLeafColumns()],
        (a) => a.map((props) => xe(e, u, props, props.id)),
        C(e.options, "debugRows"),
      ),
      _getAllCellsByColumnId: m(
        () => [u.getAllCells()],
        (a) => a.reduce((item, acc) => ((item[acc.column.id] = acc), item), {}),
        C(e.options, "debugRows"),
      ),
    };
    for (let a = 0; a < e._features.length; a++) {
      const g = e._features[a];
      g == null || g.createRow == null || g.createRow(u, e);
    }
    return u;
  },
  Me = {
    createColumn: (e, o) => {
      e._getFacetedRowModel =
        o.options.getFacetedRowModel && o.options.getFacetedRowModel(o, e.id);
      e.getFacetedRowModel = () =>
        e._getFacetedRowModel
          ? e._getFacetedRowModel()
          : o.getPreFilteredRowModel();
      e._getFacetedUniqueValues =
        o.options.getFacetedUniqueValues &&
        o.options.getFacetedUniqueValues(o, e.id);
      e.getFacetedUniqueValues = () =>
        e._getFacetedUniqueValues ? e._getFacetedUniqueValues() : new Map();
      e._getFacetedMinMaxValues =
        o.options.getFacetedMinMaxValues &&
        o.options.getFacetedMinMaxValues(o, e.id);
      e.getFacetedMinMaxValues = () => {
        if (e._getFacetedMinMaxValues) return e._getFacetedMinMaxValues();
      };
    },
  },
  le = (e, o, t) => {
    var n, i;
    const r =
      t == null || (n = t.toString()) == null ? void 0 : n.toLowerCase();
    return !!(
      !(
        (i = e.getValue(o)) == null ||
        (i = i.toString()) == null ||
        (i = i.toLowerCase()) == null
      ) && i.includes(r)
    );
  };
le.autoRemove = (e) => P(e);
const se = (e, o, t) => {
  var n;
  return !!(
    !((n = e.getValue(o)) == null || (n = n.toString()) == null) &&
    n.includes(t)
  );
};
se.autoRemove = (e) => P(e);
const ue = (e, o, t) => {
  var n;
  return (
    ((n = e.getValue(o)) == null || (n = n.toString()) == null
      ? void 0
      : n.toLowerCase()) === t?.toLowerCase()
  );
};
ue.autoRemove = (e) => P(e);
const ae = (e, o, t) => {
  var n;
  return (n = e.getValue(o)) == null ? void 0 : n.includes(t);
};
ae.autoRemove = (e) => P(e);
const ge = (e, o, t) =>
  !t.some((item) => {
    var i;
    return !((i = e.getValue(o)) != null && i.includes(item));
  });
ge.autoRemove = (e) => P(e) || !(e != null && e.length);
const de = (e, o, t) =>
  t.some((item) => {
    var i;
    return (i = e.getValue(o)) == null ? void 0 : i.includes(item);
  });
de.autoRemove = (e) => P(e) || !(e != null && e.length);
const ce = (e, o, t) => e.getValue(o) === t;
ce.autoRemove = (e) => P(e);
const fe = (e, o, t) => e.getValue(o) == t;
fe.autoRemove = (e) => P(e);
const Z = (e, o, t) => {
  let [n, i] = t;
  const r = e.getValue(o);
  return r >= n && r <= i;
};
Z.resolveFilterValue = (e) => {
  let [o, t] = e,
    n = typeof o != "number" ? parseFloat(o) : o,
    i = typeof t != "number" ? parseFloat(t) : t,
    r = o === null || Number.isNaN(n) ? -1 / 0 : n,
    l = t === null || Number.isNaN(i) ? 1 / 0 : i;
  if (r > l) {
    const u = r;
    r = l;
    l = u;
  }
  return [r, l];
};
Z.autoRemove = (e) => P(e) || (P(e[0]) && P(e[1]));
const M = {
  includesString: le,
  includesStringSensitive: se,
  equalsString: ue,
  arrIncludes: ae,
  arrIncludesAll: ge,
  arrIncludesSome: de,
  equals: ce,
  weakEquals: fe,
  inNumberRange: Z,
};
function P(e) {
  return e == null || e === "";
}
const Ie = {
  getDefaultColumnDef: () => ({
    filterFn: "auto",
  }),
  getInitialState: (e) => ({
    columnFilters: [],
    ...e,
  }),
  getDefaultOptions: (e) => ({
    onColumnFiltersChange: $("columnFilters", e),
    filterFromLeafRows: !1,
    maxLeafRowFilterDepth: 100,
  }),
  createColumn: (e, o) => {
    e.getAutoFilterFn = () => {
      const t = o.getCoreRowModel().flatRows[0],
        n = t?.getValue(e.id);
      if (typeof n == "string") {
        return M.includesString;
      }
      if (typeof n == "number") {
        return M.inNumberRange;
      }
      if (typeof n == "boolean" || (n !== null && typeof n == "object")) {
        return M.equals;
      }
      if (Array.isArray(n)) {
        return M.arrIncludes;
      }
      return M.weakEquals;
    };
    e.getFilterFn = () => {
      var t, n;
      if (L(e.columnDef.filterFn)) {
        return e.columnDef.filterFn;
      }
      if (e.columnDef.filterFn === "auto") {
        return e.getAutoFilterFn();
      }
      if (
        (t =
          (n = o.options.filterFns) == null
            ? void 0
            : n[e.columnDef.filterFn]) != null
      ) {
        return t;
      }
      return M[e.columnDef.filterFn];
    };
    e.getCanFilter = () => {
      var t, n, i;
      return (
        ((t = e.columnDef.enableColumnFilter) != null ? t : !0) &&
        ((n = o.options.enableColumnFilters) != null ? n : !0) &&
        ((i = o.options.enableFilters) != null ? i : !0) &&
        !!e.accessorFn
      );
    };
    e.getIsFiltered = () => e.getFilterIndex() > -1;
    e.getFilterValue = () => {
      var t;
      return (t = o.getState().columnFilters) == null ||
        (t = t.find((props) => props.id === e.id)) == null
        ? void 0
        : t.value;
    };
    e.getFilterIndex = () => {
      var t, n;
      return (t =
        (n = o.getState().columnFilters) == null
          ? void 0
          : n.findIndex((props) => props.id === e.id)) != null
        ? t
        : -1;
    };
    e.setFilterValue = (t) => {
      o.setColumnFilters((n) => {
        const i = e.getFilterFn(),
          r = n?.find((props) => props.id === e.id),
          l = I(t, r ? r.value : void 0);
        if (re(i, l, e)) {
          var u;
          return (u = n?.filter((props) => props.id !== e.id)) != null ? u : [];
        }
        const a = {
          id: e.id,
          value: l,
        };
        if (r) {
          var g;
          return (g = n?.map((props) => (props.id === e.id ? a : props))) !=
            null
            ? g
            : [];
        }
        return n != null && n.length ? [...n, a] : [a];
      });
    };
  },
  createRow: (e, o) => {
    e.columnFilters = {};
    e.columnFiltersMeta = {};
  },
  createTable: (e) => {
    e.setColumnFilters = (o) => {
      const t = e.getAllLeafColumns(),
        n = (i) => {
          var r;
          return (r = I(o, i)) == null
            ? void 0
            : r.filter((props) => {
                const u = t.find((props) => props.id === props.id);
                if (u) {
                  const a = u.getFilterFn();
                  if (re(a, props.value, u)) return !1;
                }
                return !0;
              });
        };
      e.options.onColumnFiltersChange == null ||
        e.options.onColumnFiltersChange(n);
    };
    e.resetColumnFilters = (o) => {
      var t, n;
      e.setColumnFilters(
        o
          ? []
          : (t = (n = e.initialState) == null ? void 0 : n.columnFilters) !=
              null
            ? t
            : [],
      );
    };
    e.getPreFilteredRowModel = () => e.getCoreRowModel();
    e.getFilteredRowModel = () => (
      !e._getFilteredRowModel &&
        e.options.getFilteredRowModel &&
        (e._getFilteredRowModel = e.options.getFilteredRowModel(e)),
      e.options.manualFiltering || !e._getFilteredRowModel
        ? e.getPreFilteredRowModel()
        : e._getFilteredRowModel()
    );
  },
};
function re(e, o, t) {
  return (
    (e && e.autoRemove ? e.autoRemove(o, t) : !1) ||
    typeof o > "u" ||
    (typeof o == "string" && !o)
  );
}
const ye = (e, o, t) =>
    t.reduce((item, acc) => {
      const r = acc.getValue(e);
      return item + (typeof r == "number" ? r : 0);
    }, 0),
  Ee = (e, o, t) => {
    let n;
    return (
      t.forEach((item) => {
        const r = item.getValue(e);
        if (r != null && (n > r || (n === void 0 && r >= r))) {
          n = r;
        }
      }),
      n
    );
  },
  De = (e, o, t) => {
    let n;
    return (
      t.forEach((item) => {
        const r = item.getValue(e);
        if (r != null && (n < r || (n === void 0 && r >= r))) {
          n = r;
        }
      }),
      n
    );
  },
  Ge = (e, o, t) => {
    let n, i;
    return (
      t.forEach((item) => {
        const l = item.getValue(e);
        if (l != null) {
          n === void 0
            ? l >= l && (n = i = l)
            : (n > l && (n = l), i < l && (i = l));
        }
      }),
      [n, i]
    );
  },
  He = (e, o) => {
    let t = 0,
      n = 0;
    if (
      (o.forEach((item) => {
        let r = item.getValue(e);
        if (r != null && (r = +r) >= r) {
          (++t, (n += r));
        }
      }),
      t)
    )
      return n / t;
  },
  Ae = (e, o) => {
    if (!o.length) return;
    const t = o.map((item) => item.getValue(e));
    if (!Fe(t)) return;
    if (t.length === 1) return t[0];
    const n = Math.floor(t.length / 2),
      i = t.sort((a, b) => a - b);
    return t.length % 2 !== 0 ? i[n] : (i[n - 1] + i[n]) / 2;
  },
  ze = (e, o) =>
    Array.from(new Set(o.map((item) => item.getValue(e))).values()),
  Le = (e, o) => new Set(o.map((item) => item.getValue(e))).size,
  Oe = (e, o) => o.length,
  O = {
    sum: ye,
    min: Ee,
    max: De,
    extent: Ge,
    mean: He,
    median: Ae,
    unique: ze,
    uniqueCount: Le,
    count: Oe,
  },
  Be = {
    getDefaultColumnDef: () => ({
      aggregatedCell: (e) => {
        var o, t;
        return (o =
          (t = e.getValue()) == null || t.toString == null
            ? void 0
            : t.toString()) != null
          ? o
          : null;
      },
      aggregationFn: "auto",
    }),
    getInitialState: (e) => ({
      grouping: [],
      ...e,
    }),
    getDefaultOptions: (e) => ({
      onGroupingChange: $("grouping", e),
      groupedColumnMode: "reorder",
    }),
    createColumn: (e, o) => {
      e.toggleGrouping = () => {
        o.setGrouping((t) =>
          t != null && t.includes(e.id)
            ? t.filter((item) => item !== e.id)
            : [...(t ?? []), e.id],
        );
      };
      e.getCanGroup = () => {
        var t, n;
        return (
          ((t = e.columnDef.enableGrouping) != null ? t : !0) &&
          ((n = o.options.enableGrouping) != null ? n : !0) &&
          (!!e.accessorFn || !!e.columnDef.getGroupingValue)
        );
      };
      e.getIsGrouped = () => {
        var t;
        return (t = o.getState().grouping) == null ? void 0 : t.includes(e.id);
      };
      e.getGroupedIndex = () => {
        var t;
        return (t = o.getState().grouping) == null ? void 0 : t.indexOf(e.id);
      };
      e.getToggleGroupingHandler = () => {
        const t = e.getCanGroup();
        return () => {
          if (t) {
            e.toggleGrouping();
          }
        };
      };
      e.getAutoAggregationFn = () => {
        const t = o.getCoreRowModel().flatRows[0],
          n = t?.getValue(e.id);
        if (typeof n == "number") return O.sum;
        if (Object.prototype.toString.call(n) === "[object Date]")
          return O.extent;
      };
      e.getAggregationFn = () => {
        var t, n;
        if (!e) throw new Error();
        if (L(e.columnDef.aggregationFn)) {
          return e.columnDef.aggregationFn;
        }
        if (e.columnDef.aggregationFn === "auto") {
          return e.getAutoAggregationFn();
        }
        if (
          (t =
            (n = o.options.aggregationFns) == null
              ? void 0
              : n[e.columnDef.aggregationFn]) != null
        ) {
          return t;
        }
        return O[e.columnDef.aggregationFn];
      };
    },
    createTable: (e) => {
      e.setGrouping = (o) =>
        e.options.onGroupingChange == null
          ? void 0
          : e.options.onGroupingChange(o);
      e.resetGrouping = (o) => {
        var t, n;
        e.setGrouping(
          o
            ? []
            : (t = (n = e.initialState) == null ? void 0 : n.grouping) != null
              ? t
              : [],
        );
      };
      e.getPreGroupedRowModel = () => e.getFilteredRowModel();
      e.getGroupedRowModel = () => (
        !e._getGroupedRowModel &&
          e.options.getGroupedRowModel &&
          (e._getGroupedRowModel = e.options.getGroupedRowModel(e)),
        e.options.manualGrouping || !e._getGroupedRowModel
          ? e.getPreGroupedRowModel()
          : e._getGroupedRowModel()
      );
    },
    createRow: (e, o) => {
      e.getIsGrouped = () => !!e.groupingColumnId;
      e.getGroupingValue = (t) => {
        if (e._groupingValuesCache.hasOwnProperty(t))
          return e._groupingValuesCache[t];
        const n = o.getColumn(t);
        return n != null && n.columnDef.getGroupingValue
          ? ((e._groupingValuesCache[t] = n.columnDef.getGroupingValue(
              e.original,
            )),
            e._groupingValuesCache[t])
          : e.getValue(t);
      };
      e._groupingValuesCache = {};
    },
    createCell: (e, o, t, n) => {
      e.getIsGrouped = () => o.getIsGrouped() && o.id === t.groupingColumnId;
      e.getIsPlaceholder = () => !e.getIsGrouped() && o.getIsGrouped();
      e.getIsAggregated = () => {
        var i;
        return (
          !e.getIsGrouped() &&
          !e.getIsPlaceholder() &&
          !!((i = t.subRows) != null && i.length)
        );
      };
    },
  };
function Te(e, o, t) {
  if (!(o != null && o.length) || !t) return e;
  const n = e.filter((props) => !o.includes(props.id));
  return t === "remove"
    ? n
    : [
        ...o
          .map((item) => e.find((props) => props.id === item))
          .filter(Boolean),
        ...n,
      ];
}
const je = {
    getInitialState: (e) => ({
      columnOrder: [],
      ...e,
    }),
    getDefaultOptions: (e) => ({
      onColumnOrderChange: $("columnOrder", e),
    }),
    createColumn: (e, o) => {
      e.getIndex = m(
        (t) => [G(o, t)],
        (t) => t.findIndex((props) => props.id === e.id),
        C(o.options, "debugColumns"),
      );
      e.getIsFirstColumn = (t) => {
        var n;
        return ((n = G(o, t)[0]) == null ? void 0 : n.id) === e.id;
      };
      e.getIsLastColumn = (t) => {
        var n;
        const i = G(o, t);
        return ((n = i[i.length - 1]) == null ? void 0 : n.id) === e.id;
      };
    },
    createTable: (e) => {
      e.setColumnOrder = (o) =>
        e.options.onColumnOrderChange == null
          ? void 0
          : e.options.onColumnOrderChange(o);
      e.resetColumnOrder = (o) => {
        var t;
        e.setColumnOrder(
          o ? [] : (t = e.initialState.columnOrder) != null ? t : [],
        );
      };
      e._getOrderColumnsFn = m(
        () => [
          e.getState().columnOrder,
          e.getState().grouping,
          e.options.groupedColumnMode,
        ],
        (o, t, n) => (i) => {
          let r = [];
          if (!(o != null && o.length)) r = i;
          else {
            const l = [...o],
              u = [...i];
            for (; u.length && l.length; ) {
              const a = l.shift(),
                g = u.findIndex((props) => props.id === a);
              if (g > -1) {
                r.push(u.splice(g, 1)[0]);
              }
            }
            r = [...r, ...u];
          }
          return Te(r, t, n);
        },
        C(e.options, "debugTable"),
      );
    },
  },
  B = () => ({
    left: [],
    right: [],
  }),
  qe = {
    getInitialState: (e) => ({
      columnPinning: B(),
      ...e,
    }),
    getDefaultOptions: (e) => ({
      onColumnPinningChange: $("columnPinning", e),
    }),
    createColumn: (e, o) => {
      e.pin = (t) => {
        const n = e
          .getLeafColumns()
          .map((props) => props.id)
          .filter(Boolean);
        o.setColumnPinning((i) => {
          var r, l;
          if (t === "right") {
            var u, a;
            return {
              left: ((u = i?.left) != null ? u : []).filter(
                (item) => !(n != null && n.includes(item)),
              ),
              right: [
                ...((a = i?.right) != null ? a : []).filter(
                  (item) => !(n != null && n.includes(item)),
                ),
                ...n,
              ],
            };
          }
          if (t === "left") {
            var g, c;
            return {
              left: [
                ...((g = i?.left) != null ? g : []).filter(
                  (item) => !(n != null && n.includes(item)),
                ),
                ...n,
              ],
              right: ((c = i?.right) != null ? c : []).filter(
                (item) => !(n != null && n.includes(item)),
              ),
            };
          }
          return {
            left: ((r = i?.left) != null ? r : []).filter(
              (item) => !(n != null && n.includes(item)),
            ),
            right: ((l = i?.right) != null ? l : []).filter(
              (item) => !(n != null && n.includes(item)),
            ),
          };
        });
      };
      e.getCanPin = () =>
        e.getLeafColumns().some((item) => {
          var i, r, l;
          return (
            ((i = item.columnDef.enablePinning) != null ? i : !0) &&
            ((r =
              (l = o.options.enableColumnPinning) != null
                ? l
                : o.options.enablePinning) != null
              ? r
              : !0)
          );
        });
      e.getIsPinned = () => {
        const t = e.getLeafColumns().map((props) => props.id),
          { left: n, right: i } = o.getState().columnPinning,
          r = t.some((item) => n?.includes(item)),
          l = t.some((item) => i?.includes(item));
        if (r) {
          return "left";
        }
        if (l) {
          return "right";
        }
        return !1;
      };
      e.getPinnedIndex = () => {
        var t, n;
        const i = e.getIsPinned();
        return i
          ? (t =
              (n = o.getState().columnPinning) == null || (n = n[i]) == null
                ? void 0
                : n.indexOf(e.id)) != null
            ? t
            : -1
          : 0;
      };
    },
    createRow: (e, o) => {
      e.getCenterVisibleCells = m(
        () => [
          e._getAllVisibleCells(),
          o.getState().columnPinning.left,
          o.getState().columnPinning.right,
        ],
        (t, n, i) => {
          const r = [...(n ?? []), ...(i ?? [])];
          return t.filter((item) => !r.includes(item.column.id));
        },
        C(o.options, "debugRows"),
      );
      e.getLeftVisibleCells = m(
        () => [e._getAllVisibleCells(), o.getState().columnPinning.left],
        (t, n) =>
          (n ?? [])
            .map((item) => t.find((item) => item.column.id === item))
            .filter(Boolean)
            .map((item) => ({
              ...item,
              position: "left",
            })),
        C(o.options, "debugRows"),
      );
      e.getRightVisibleCells = m(
        () => [e._getAllVisibleCells(), o.getState().columnPinning.right],
        (t, n) =>
          (n ?? [])
            .map((item) => t.find((item) => item.column.id === item))
            .filter(Boolean)
            .map((item) => ({
              ...item,
              position: "right",
            })),
        C(o.options, "debugRows"),
      );
    },
    createTable: (e) => {
      e.setColumnPinning = (o) =>
        e.options.onColumnPinningChange == null
          ? void 0
          : e.options.onColumnPinningChange(o);
      e.resetColumnPinning = (o) => {
        var t, n;
        return e.setColumnPinning(
          o
            ? B()
            : (t = (n = e.initialState) == null ? void 0 : n.columnPinning) !=
                null
              ? t
              : B(),
        );
      };
      e.getIsSomeColumnsPinned = (o) => {
        var t;
        const n = e.getState().columnPinning;
        if (!o) {
          var i, r;
          return !!(
            ((i = n.left) != null && i.length) ||
            ((r = n.right) != null && r.length)
          );
        }
        return !!((t = n[o]) != null && t.length);
      };
      e.getLeftLeafColumns = m(
        () => [e.getAllLeafColumns(), e.getState().columnPinning.left],
        (o, t) =>
          (t ?? [])
            .map((item) => o.find((props) => props.id === item))
            .filter(Boolean),
        C(e.options, "debugColumns"),
      );
      e.getRightLeafColumns = m(
        () => [e.getAllLeafColumns(), e.getState().columnPinning.right],
        (o, t) =>
          (t ?? [])
            .map((item) => o.find((props) => props.id === item))
            .filter(Boolean),
        C(e.options, "debugColumns"),
      );
      e.getCenterLeafColumns = m(
        () => [
          e.getAllLeafColumns(),
          e.getState().columnPinning.left,
          e.getState().columnPinning.right,
        ],
        (o, t, n) => {
          const i = [...(t ?? []), ...(n ?? [])];
          return o.filter((props) => !i.includes(props.id));
        },
        C(e.options, "debugColumns"),
      );
    },
  };
function ke(e) {
  return e || (typeof document < "u" ? document : null);
}
const A = {
    size: 150,
    minSize: 20,
    maxSize: Number.MAX_SAFE_INTEGER,
  },
  T = () => ({
    startOffset: null,
    startSize: null,
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: !1,
    columnSizingStart: [],
  }),
  Ne = {
    getDefaultColumnDef: () => A,
    getInitialState: (e) => ({
      columnSizing: {},
      columnSizingInfo: T(),
      ...e,
    }),
    getDefaultOptions: (e) => ({
      columnResizeMode: "onEnd",
      columnResizeDirection: "ltr",
      onColumnSizingChange: $("columnSizing", e),
      onColumnSizingInfoChange: $("columnSizingInfo", e),
    }),
    createColumn: (e, o) => {
      e.getSize = () => {
        var t, n, i;
        const r = o.getState().columnSizing[e.id];
        return Math.min(
          Math.max(
            (t = e.columnDef.minSize) != null ? t : A.minSize,
            (n = r ?? e.columnDef.size) != null ? n : A.size,
          ),
          (i = e.columnDef.maxSize) != null ? i : A.maxSize,
        );
      };
      e.getStart = m(
        (t) => [t, G(o, t), o.getState().columnSizing],
        (t, n) =>
          n
            .slice(0, e.getIndex(t))
            .reduce((item, acc) => item + acc.getSize(), 0),
        C(o.options, "debugColumns"),
      );
      e.getAfter = m(
        (t) => [t, G(o, t), o.getState().columnSizing],
        (t, n) =>
          n
            .slice(e.getIndex(t) + 1)
            .reduce((item, acc) => item + acc.getSize(), 0),
        C(o.options, "debugColumns"),
      );
      e.resetSize = () => {
        o.setColumnSizing((props) => {
          let { [e.id]: n, ...i } = props;
          return i;
        });
      };
      e.getCanResize = () => {
        var t, n;
        return (
          ((t = e.columnDef.enableResizing) != null ? t : !0) &&
          ((n = o.options.enableColumnResizing) != null ? n : !0)
        );
      };
      e.getIsResizing = () =>
        o.getState().columnSizingInfo.isResizingColumn === e.id;
    },
    createHeader: (e, o) => {
      e.getSize = () => {
        let t = 0;
        const n = (i) => {
          if (i.subHeaders.length) i.subHeaders.forEach(n);
          else {
            var r;
            t += (r = i.column.getSize()) != null ? r : 0;
          }
        };
        return (n(e), t);
      };
      e.getStart = () => {
        if (e.index > 0) {
          const t = e.headerGroup.headers[e.index - 1];
          return t.getStart() + t.getSize();
        }
        return 0;
      };
      e.getResizeHandler = (t) => {
        const n = o.getColumn(e.column.id),
          i = n?.getCanResize();
        return (r) => {
          if (
            !n ||
            !i ||
            (r.persist == null || r.persist(),
            j(r) && r.touches && r.touches.length > 1)
          )
            return;
          const l = e.getSize(),
            u = e
              ? e
                  .getLeafHeaders()
                  .map((item) => [item.column.id, item.column.getSize()])
              : [[n.id, n.getSize()]],
            a = j(r) ? Math.round(r.touches[0].clientX) : r.clientX,
            g = {},
            c = (w, v) => {
              if (typeof v == "number") {
                (o.setColumnSizingInfo((h) => {
                  var V, F;
                  const E = o.options.columnResizeDirection === "rtl" ? -1 : 1,
                    te = (v - ((V = h?.startOffset) != null ? V : 0)) * E,
                    ne = Math.max(
                      te / ((F = h?.startSize) != null ? F : 0),
                      -0.999999,
                    );
                  return (
                    h.columnSizingStart.forEach((item) => {
                      let [me, oe] = item;
                      g[me] = Math.round(Math.max(oe + oe * ne, 0) * 100) / 100;
                    }),
                    {
                      ...h,
                      deltaOffset: te,
                      deltaPercentage: ne,
                    }
                  );
                }),
                  (o.options.columnResizeMode === "onChange" || w === "end") &&
                    o.setColumnSizing((h) => ({
                      ...h,
                      ...g,
                    })));
              }
            },
            S = (w) => c("move", w),
            d = (w) => {
              c("end", w);
              o.setColumnSizingInfo((v) => ({
                ...v,
                isResizingColumn: !1,
                startOffset: null,
                startSize: null,
                deltaOffset: null,
                deltaPercentage: null,
                columnSizingStart: [],
              }));
            },
            s = ke(t),
            f = {
              moveHandler: (w) => S(w.clientX),
              upHandler: (w) => {
                s?.removeEventListener("mousemove", f.moveHandler);
                s?.removeEventListener("mouseup", f.upHandler);
                d(w.clientX);
              },
            },
            p = {
              moveHandler: (event) => (
                event.cancelable &&
                  (event.preventDefault(), event.stopPropagation()),
                S(event.touches[0].clientX),
                !1
              ),
              upHandler: (event) => {
                var v;
                s?.removeEventListener("touchmove", p.moveHandler);
                s?.removeEventListener("touchend", p.upHandler);
                if (event.cancelable) {
                  (event.preventDefault(), event.stopPropagation());
                }
                d((v = event.touches[0]) == null ? void 0 : v.clientX);
              },
            },
            R = Ue()
              ? {
                  passive: !1,
                }
              : !1;
          j(r)
            ? (s?.addEventListener("touchmove", p.moveHandler, R),
              s?.addEventListener("touchend", p.upHandler, R))
            : (s?.addEventListener("mousemove", f.moveHandler, R),
              s?.addEventListener("mouseup", f.upHandler, R));
          o.setColumnSizingInfo((w) => ({
            ...w,
            startOffset: a,
            startSize: l,
            deltaOffset: 0,
            deltaPercentage: 0,
            columnSizingStart: u,
            isResizingColumn: n.id,
          }));
        };
      };
    },
    createTable: (e) => {
      e.setColumnSizing = (o) =>
        e.options.onColumnSizingChange == null
          ? void 0
          : e.options.onColumnSizingChange(o);
      e.setColumnSizingInfo = (o) =>
        e.options.onColumnSizingInfoChange == null
          ? void 0
          : e.options.onColumnSizingInfoChange(o);
      e.resetColumnSizing = (o) => {
        var t;
        e.setColumnSizing(
          o ? {} : (t = e.initialState.columnSizing) != null ? t : {},
        );
      };
      e.resetHeaderSizeInfo = (o) => {
        var t;
        e.setColumnSizingInfo(
          o ? T() : (t = e.initialState.columnSizingInfo) != null ? t : T(),
        );
      };
      e.getTotalSize = () => {
        var o, t;
        return (o =
          (t = e.getHeaderGroups()[0]) == null
            ? void 0
            : t.headers.reduce((item, acc) => item + acc.getSize(), 0)) != null
          ? o
          : 0;
      };
      e.getLeftTotalSize = () => {
        var o, t;
        return (o =
          (t = e.getLeftHeaderGroups()[0]) == null
            ? void 0
            : t.headers.reduce((item, acc) => item + acc.getSize(), 0)) != null
          ? o
          : 0;
      };
      e.getCenterTotalSize = () => {
        var o, t;
        return (o =
          (t = e.getCenterHeaderGroups()[0]) == null
            ? void 0
            : t.headers.reduce((item, acc) => item + acc.getSize(), 0)) != null
          ? o
          : 0;
      };
      e.getRightTotalSize = () => {
        var o, t;
        return (o =
          (t = e.getRightHeaderGroups()[0]) == null
            ? void 0
            : t.headers.reduce((item, acc) => item + acc.getSize(), 0)) != null
          ? o
          : 0;
      };
    },
  };
let z = null;
function Ue() {
  if (typeof z == "boolean") return z;
  let e = !1;
  try {
    const o = {
        get passive() {
          return ((e = !0), !1);
        },
      },
      t = () => {};
    window.addEventListener("test", t, o);
    window.removeEventListener("test", t);
  } catch {
    e = !1;
  }
  return ((z = e), z);
}
function j(props) {
  return props.type === "touchstart";
}
const Xe = {
  getInitialState: (e) => ({
    columnVisibility: {},
    ...e,
  }),
  getDefaultOptions: (e) => ({
    onColumnVisibilityChange: $("columnVisibility", e),
  }),
  createColumn: (e, o) => {
    e.toggleVisibility = (t) => {
      if (e.getCanHide()) {
        o.setColumnVisibility((n) => ({
          ...n,
          [e.id]: t ?? !e.getIsVisible(),
        }));
      }
    };
    e.getIsVisible = () => {
      var t, n;
      const i = e.columns;
      return (t = i.length
        ? i.some((item) => item.getIsVisible())
        : (n = o.getState().columnVisibility) == null
          ? void 0
          : n[e.id]) != null
        ? t
        : !0;
    };
    e.getCanHide = () => {
      var t, n;
      return (
        ((t = e.columnDef.enableHiding) != null ? t : !0) &&
        ((n = o.options.enableHiding) != null ? n : !0)
      );
    };
    e.getToggleVisibilityHandler = () => (event) => {
      e.toggleVisibility == null || e.toggleVisibility(event.target.checked);
    };
  },
  createRow: (e, o) => {
    e._getAllVisibleCells = m(
      () => [e.getAllCells(), o.getState().columnVisibility],
      (t) => t.filter((item) => item.column.getIsVisible()),
      C(o.options, "debugRows"),
    );
    e.getVisibleCells = m(
      () => [
        e.getLeftVisibleCells(),
        e.getCenterVisibleCells(),
        e.getRightVisibleCells(),
      ],
      (t, n, i) => [...t, ...n, ...i],
      C(o.options, "debugRows"),
    );
  },
  createTable: (e) => {
    const o = (t, n) =>
      m(
        () => [
          n(),
          n()
            .filter((item) => item.getIsVisible())
            .map((props) => props.id)
            .join("_"),
        ],
        (i) =>
          i.filter((item) =>
            item.getIsVisible == null ? void 0 : item.getIsVisible(),
          ),
        C(e.options, "debugColumns"),
      );
    e.getVisibleFlatColumns = o("getVisibleFlatColumns", () =>
      e.getAllFlatColumns(),
    );
    e.getVisibleLeafColumns = o("getVisibleLeafColumns", () =>
      e.getAllLeafColumns(),
    );
    e.getLeftVisibleLeafColumns = o("getLeftVisibleLeafColumns", () =>
      e.getLeftLeafColumns(),
    );
    e.getRightVisibleLeafColumns = o("getRightVisibleLeafColumns", () =>
      e.getRightLeafColumns(),
    );
    e.getCenterVisibleLeafColumns = o("getCenterVisibleLeafColumns", () =>
      e.getCenterLeafColumns(),
    );
    e.setColumnVisibility = (t) =>
      e.options.onColumnVisibilityChange == null
        ? void 0
        : e.options.onColumnVisibilityChange(t);
    e.resetColumnVisibility = (t) => {
      var n;
      e.setColumnVisibility(
        t ? {} : (n = e.initialState.columnVisibility) != null ? n : {},
      );
    };
    e.toggleAllColumnsVisible = (t) => {
      var n;
      t = (n = t) != null ? n : !e.getIsAllColumnsVisible();
      e.setColumnVisibility(
        e.getAllLeafColumns().reduce(
          (item, acc) => ({
            ...item,
            [acc.id]: t || !(acc.getCanHide != null && acc.getCanHide()),
          }),
          {},
        ),
      );
    };
    e.getIsAllColumnsVisible = () =>
      !e
        .getAllLeafColumns()
        .some((item) => !(item.getIsVisible != null && item.getIsVisible()));
    e.getIsSomeColumnsVisible = () =>
      e
        .getAllLeafColumns()
        .some((item) =>
          item.getIsVisible == null ? void 0 : item.getIsVisible(),
        );
    e.getToggleAllColumnsVisibilityHandler = () => (event) => {
      var n;
      e.toggleAllColumnsVisible(
        (n = event.target) == null ? void 0 : n.checked,
      );
    };
  },
};
function G(e, o) {
  return o
    ? o === "center"
      ? e.getCenterVisibleLeafColumns()
      : o === "left"
        ? e.getLeftVisibleLeafColumns()
        : e.getRightVisibleLeafColumns()
    : e.getVisibleLeafColumns();
}
const Ke = {
    createTable: (e) => {
      e._getGlobalFacetedRowModel =
        e.options.getFacetedRowModel &&
        e.options.getFacetedRowModel(e, "__global__");
      e.getGlobalFacetedRowModel = () =>
        e.options.manualFiltering || !e._getGlobalFacetedRowModel
          ? e.getPreFilteredRowModel()
          : e._getGlobalFacetedRowModel();
      e._getGlobalFacetedUniqueValues =
        e.options.getFacetedUniqueValues &&
        e.options.getFacetedUniqueValues(e, "__global__");
      e.getGlobalFacetedUniqueValues = () =>
        e._getGlobalFacetedUniqueValues
          ? e._getGlobalFacetedUniqueValues()
          : new Map();
      e._getGlobalFacetedMinMaxValues =
        e.options.getFacetedMinMaxValues &&
        e.options.getFacetedMinMaxValues(e, "__global__");
      e.getGlobalFacetedMinMaxValues = () => {
        if (e._getGlobalFacetedMinMaxValues)
          return e._getGlobalFacetedMinMaxValues();
      };
    },
  },
  Qe = {
    getInitialState: (e) => ({
      globalFilter: void 0,
      ...e,
    }),
    getDefaultOptions: (e) => ({
      onGlobalFilterChange: $("globalFilter", e),
      globalFilterFn: "auto",
      getColumnCanGlobalFilter: (props) => {
        var t;
        const n =
          (t = e.getCoreRowModel().flatRows[0]) == null ||
          (t = t._getAllCellsByColumnId()[props.id]) == null
            ? void 0
            : t.getValue();
        return typeof n == "string" || typeof n == "number";
      },
    }),
    createColumn: (e, o) => {
      e.getCanGlobalFilter = () => {
        var t, n, i, r;
        return (
          ((t = e.columnDef.enableGlobalFilter) != null ? t : !0) &&
          ((n = o.options.enableGlobalFilter) != null ? n : !0) &&
          ((i = o.options.enableFilters) != null ? i : !0) &&
          ((r =
            o.options.getColumnCanGlobalFilter == null
              ? void 0
              : o.options.getColumnCanGlobalFilter(e)) != null
            ? r
            : !0) &&
          !!e.accessorFn
        );
      };
    },
    createTable: (e) => {
      e.getGlobalAutoFilterFn = () => M.includesString;
      e.getGlobalFilterFn = () => {
        var o, t;
        const { globalFilterFn: n } = e.options;
        if (L(n)) {
          return n;
        }
        if (n === "auto") {
          return e.getGlobalAutoFilterFn();
        }
        if ((o = (t = e.options.filterFns) == null ? void 0 : t[n]) != null) {
          return o;
        }
        return M[n];
      };
      e.setGlobalFilter = (o) => {
        e.options.onGlobalFilterChange == null ||
          e.options.onGlobalFilterChange(o);
      };
      e.resetGlobalFilter = (o) => {
        e.setGlobalFilter(o ? void 0 : e.initialState.globalFilter);
      };
    },
  },
  Je = {
    getInitialState: (e) => ({
      expanded: {},
      ...e,
    }),
    getDefaultOptions: (e) => ({
      onExpandedChange: $("expanded", e),
      paginateExpandedRows: !0,
    }),
    createTable: (e) => {
      let o = !1,
        t = !1;
      e._autoResetExpanded = () => {
        var n, i;
        if (!o) {
          e._queue(() => {
            o = !0;
          });
          return;
        }
        if (
          (n =
            (i = e.options.autoResetAll) != null
              ? i
              : e.options.autoResetExpanded) != null
            ? n
            : !e.options.manualExpanding
        ) {
          if (t) return;
          t = !0;
          e._queue(() => {
            e.resetExpanded();
            t = !1;
          });
        }
      };
      e.setExpanded = (n) =>
        e.options.onExpandedChange == null
          ? void 0
          : e.options.onExpandedChange(n);
      e.toggleAllRowsExpanded = (n) => {
        (n ?? !e.getIsAllRowsExpanded())
          ? e.setExpanded(!0)
          : e.setExpanded({});
      };
      e.resetExpanded = (n) => {
        var i, r;
        e.setExpanded(
          n
            ? {}
            : (i = (r = e.initialState) == null ? void 0 : r.expanded) != null
              ? i
              : {},
        );
      };
      e.getCanSomeRowsExpand = () =>
        e
          .getPrePaginationRowModel()
          .flatRows.some((item) => item.getCanExpand());
      e.getToggleAllRowsExpandedHandler = () => (n) => {
        n.persist == null || n.persist();
        e.toggleAllRowsExpanded();
      };
      e.getIsSomeRowsExpanded = () => {
        const n = e.getState().expanded;
        return n === !0 || Object.values(n).some(Boolean);
      };
      e.getIsAllRowsExpanded = () => {
        const n = e.getState().expanded;
        return typeof n == "boolean"
          ? n === !0
          : !(
              !Object.keys(n).length ||
              e.getRowModel().flatRows.some((item) => !item.getIsExpanded())
            );
      };
      e.getExpandedDepth = () => {
        let n = 0;
        return (
          (e.getState().expanded === !0
            ? Object.keys(e.getRowModel().rowsById)
            : Object.keys(e.getState().expanded)
          ).forEach((item) => {
            const l = item.split(".");
            n = Math.max(n, l.length);
          }),
          n
        );
      };
      e.getPreExpandedRowModel = () => e.getSortedRowModel();
      e.getExpandedRowModel = () => (
        !e._getExpandedRowModel &&
          e.options.getExpandedRowModel &&
          (e._getExpandedRowModel = e.options.getExpandedRowModel(e)),
        e.options.manualExpanding || !e._getExpandedRowModel
          ? e.getPreExpandedRowModel()
          : e._getExpandedRowModel()
      );
    },
    createRow: (e, o) => {
      e.toggleExpanded = (t) => {
        o.setExpanded((n) => {
          var i;
          const r = n === !0 ? !0 : !!(n != null && n[e.id]);
          let l = {};
          if (
            (n === !0
              ? Object.keys(o.getRowModel().rowsById).forEach((item) => {
                  l[item] = !0;
                })
              : (l = n),
            (t = (i = t) != null ? i : !r),
            !r && t)
          )
            return {
              ...l,
              [e.id]: !0,
            };
          if (r && !t) {
            const { [e.id]: u, ...a } = l;
            return a;
          }
          return n;
        });
      };
      e.getIsExpanded = () => {
        var t;
        const n = o.getState().expanded;
        return !!((t =
          o.options.getIsRowExpanded == null
            ? void 0
            : o.options.getIsRowExpanded(e)) != null
          ? t
          : n === !0 || n?.[e.id]);
      };
      e.getCanExpand = () => {
        var t, n, i;
        return (t =
          o.options.getRowCanExpand == null
            ? void 0
            : o.options.getRowCanExpand(e)) != null
          ? t
          : ((n = o.options.enableExpanding) != null ? n : !0) &&
              !!((i = e.subRows) != null && i.length);
      };
      e.getIsAllParentsExpanded = () => {
        let t = !0,
          n = e;
        for (; t && n.parentId; ) {
          n = o.getRow(n.parentId, !0);
          t = n.getIsExpanded();
        }
        return t;
      };
      e.getToggleExpandedHandler = () => {
        const t = e.getCanExpand();
        return () => {
          if (t) {
            e.toggleExpanded();
          }
        };
      };
    },
  },
  X = 0,
  K = 10,
  q = () => ({
    pageIndex: X,
    pageSize: K,
  }),
  We = {
    getInitialState: (e) => ({
      ...e,
      pagination: {
        ...q(),
        ...e?.pagination,
      },
    }),
    getDefaultOptions: (e) => ({
      onPaginationChange: $("pagination", e),
    }),
    createTable: (e) => {
      let o = !1,
        t = !1;
      e._autoResetPageIndex = () => {
        var n, i;
        if (!o) {
          e._queue(() => {
            o = !0;
          });
          return;
        }
        if (
          (n =
            (i = e.options.autoResetAll) != null
              ? i
              : e.options.autoResetPageIndex) != null
            ? n
            : !e.options.manualPagination
        ) {
          if (t) return;
          t = !0;
          e._queue(() => {
            e.resetPageIndex();
            t = !1;
          });
        }
      };
      e.setPagination = (n) => {
        const i = (r) => I(n, r);
        return e.options.onPaginationChange == null
          ? void 0
          : e.options.onPaginationChange(i);
      };
      e.resetPagination = (n) => {
        var i;
        e.setPagination(
          n ? q() : (i = e.initialState.pagination) != null ? i : q(),
        );
      };
      e.setPageIndex = (n) => {
        e.setPagination((i) => {
          let r = I(n, i.pageIndex);
          const l =
            typeof e.options.pageCount > "u" || e.options.pageCount === -1
              ? Number.MAX_SAFE_INTEGER
              : e.options.pageCount - 1;
          return (
            (r = Math.max(0, Math.min(r, l))),
            {
              ...i,
              pageIndex: r,
            }
          );
        });
      };
      e.resetPageIndex = (n) => {
        var i, r;
        e.setPageIndex(
          n
            ? X
            : (i =
                  (r = e.initialState) == null || (r = r.pagination) == null
                    ? void 0
                    : r.pageIndex) != null
              ? i
              : X,
        );
      };
      e.resetPageSize = (n) => {
        var i, r;
        e.setPageSize(
          n
            ? K
            : (i =
                  (r = e.initialState) == null || (r = r.pagination) == null
                    ? void 0
                    : r.pageSize) != null
              ? i
              : K,
        );
      };
      e.setPageSize = (n) => {
        e.setPagination((i) => {
          const r = Math.max(1, I(n, i.pageSize)),
            l = i.pageSize * i.pageIndex,
            u = Math.floor(l / r);
          return {
            ...i,
            pageIndex: u,
            pageSize: r,
          };
        });
      };
      e.setPageCount = (n) =>
        e.setPagination((i) => {
          var r;
          let l = I(n, (r = e.options.pageCount) != null ? r : -1);
          return (
            typeof l == "number" && (l = Math.max(-1, l)),
            {
              ...i,
              pageCount: l,
            }
          );
        });
      e.getPageOptions = m(
        () => [e.getPageCount()],
        (n) => {
          let i = [];
          return (
            n &&
              n > 0 &&
              (i = [...new Array(n)].fill(null).map((item, index) => index)),
            i
          );
        },
        C(e.options, "debugTable"),
      );
      e.getCanPreviousPage = () => e.getState().pagination.pageIndex > 0;
      e.getCanNextPage = () => {
        const { pageIndex: n } = e.getState().pagination,
          i = e.getPageCount();
        if (i === -1) {
          return !0;
        }
        if (i === 0) {
          return !1;
        }
        return n < i - 1;
      };
      e.previousPage = () => e.setPageIndex((n) => n - 1);
      e.nextPage = () => e.setPageIndex((n) => n + 1);
      e.firstPage = () => e.setPageIndex(0);
      e.lastPage = () => e.setPageIndex(e.getPageCount() - 1);
      e.getPrePaginationRowModel = () => e.getExpandedRowModel();
      e.getPaginationRowModel = () => (
        !e._getPaginationRowModel &&
          e.options.getPaginationRowModel &&
          (e._getPaginationRowModel = e.options.getPaginationRowModel(e)),
        e.options.manualPagination || !e._getPaginationRowModel
          ? e.getPrePaginationRowModel()
          : e._getPaginationRowModel()
      );
      e.getPageCount = () => {
        var n;
        return (n = e.options.pageCount) != null
          ? n
          : Math.ceil(e.getRowCount() / e.getState().pagination.pageSize);
      };
      e.getRowCount = () => {
        var n;
        return (n = e.options.rowCount) != null
          ? n
          : e.getPrePaginationRowModel().rows.length;
      };
    },
  },
  k = () => ({
    top: [],
    bottom: [],
  }),
  Ye = {
    getInitialState: (e) => ({
      rowPinning: k(),
      ...e,
    }),
    getDefaultOptions: (e) => ({
      onRowPinningChange: $("rowPinning", e),
    }),
    createRow: (e, o) => {
      e.pin = (t, n, i) => {
        const r = n
            ? e.getLeafRows().map((props) => {
                let { id: g } = props;
                return g;
              })
            : [],
          l = i
            ? e.getParentRows().map((props) => {
                let { id: g } = props;
                return g;
              })
            : [],
          u = new Set([...l, e.id, ...r]);
        o.setRowPinning((a) => {
          var g, c;
          if (t === "bottom") {
            var S, d;
            return {
              top: ((S = a?.top) != null ? S : []).filter(
                (item) => !(u != null && u.has(item)),
              ),
              bottom: [
                ...((d = a?.bottom) != null ? d : []).filter(
                  (item) => !(u != null && u.has(item)),
                ),
                ...Array.from(u),
              ],
            };
          }
          if (t === "top") {
            var s, f;
            return {
              top: [
                ...((s = a?.top) != null ? s : []).filter(
                  (item) => !(u != null && u.has(item)),
                ),
                ...Array.from(u),
              ],
              bottom: ((f = a?.bottom) != null ? f : []).filter(
                (item) => !(u != null && u.has(item)),
              ),
            };
          }
          return {
            top: ((g = a?.top) != null ? g : []).filter(
              (item) => !(u != null && u.has(item)),
            ),
            bottom: ((c = a?.bottom) != null ? c : []).filter(
              (item) => !(u != null && u.has(item)),
            ),
          };
        });
      };
      e.getCanPin = () => {
        var t;
        const { enableRowPinning: n, enablePinning: i } = o.options;
        if (typeof n == "function") {
          return n(e);
        }
        if ((t = n ?? i) != null) {
          return t;
        }
        return !0;
      };
      e.getIsPinned = () => {
        const t = [e.id],
          { top: n, bottom: i } = o.getState().rowPinning,
          r = t.some((item) => n?.includes(item)),
          l = t.some((item) => i?.includes(item));
        if (r) {
          return "top";
        }
        if (l) {
          return "bottom";
        }
        return !1;
      };
      e.getPinnedIndex = () => {
        var t, n;
        const i = e.getIsPinned();
        if (!i) return -1;
        const r =
          (t = i === "top" ? o.getTopRows() : o.getBottomRows()) == null
            ? void 0
            : t.map((props) => {
                let { id: u } = props;
                return u;
              });
        return (n = r?.indexOf(e.id)) != null ? n : -1;
      };
    },
    createTable: (e) => {
      e.setRowPinning = (o) =>
        e.options.onRowPinningChange == null
          ? void 0
          : e.options.onRowPinningChange(o);
      e.resetRowPinning = (o) => {
        var t, n;
        return e.setRowPinning(
          o
            ? k()
            : (t = (n = e.initialState) == null ? void 0 : n.rowPinning) != null
              ? t
              : k(),
        );
      };
      e.getIsSomeRowsPinned = (o) => {
        var t;
        const n = e.getState().rowPinning;
        if (!o) {
          var i, r;
          return !!(
            ((i = n.top) != null && i.length) ||
            ((r = n.bottom) != null && r.length)
          );
        }
        return !!((t = n[o]) != null && t.length);
      };
      e._getPinnedRows = (o, t, n) => {
        var i;
        return (
          (i = e.options.keepPinnedRows) == null || i
            ? (t ?? []).map((item) => {
                const u = e.getRow(item, !0);
                return u.getIsAllParentsExpanded() ? u : null;
              })
            : (t ?? []).map((item) => o.find((props) => props.id === item))
        )
          .filter(Boolean)
          .map((item) => ({
            ...item,
            position: n,
          }));
      };
      e.getTopRows = m(
        () => [e.getRowModel().rows, e.getState().rowPinning.top],
        (o, t) => e._getPinnedRows(o, t, "top"),
        C(e.options, "debugRows"),
      );
      e.getBottomRows = m(
        () => [e.getRowModel().rows, e.getState().rowPinning.bottom],
        (o, t) => e._getPinnedRows(o, t, "bottom"),
        C(e.options, "debugRows"),
      );
      e.getCenterRows = m(
        () => [
          e.getRowModel().rows,
          e.getState().rowPinning.top,
          e.getState().rowPinning.bottom,
        ],
        (o, t, n) => {
          const i = new Set([...(t ?? []), ...(n ?? [])]);
          return o.filter((props) => !i.has(props.id));
        },
        C(e.options, "debugRows"),
      );
    },
  },
  Ze = {
    getInitialState: (e) => ({
      rowSelection: {},
      ...e,
    }),
    getDefaultOptions: (e) => ({
      onRowSelectionChange: $("rowSelection", e),
      enableRowSelection: !0,
      enableMultiRowSelection: !0,
      enableSubRowSelection: !0,
    }),
    createTable: (e) => {
      e.setRowSelection = (o) =>
        e.options.onRowSelectionChange == null
          ? void 0
          : e.options.onRowSelectionChange(o);
      e.resetRowSelection = (o) => {
        var t;
        return e.setRowSelection(
          o ? {} : (t = e.initialState.rowSelection) != null ? t : {},
        );
      };
      e.toggleAllRowsSelected = (o) => {
        e.setRowSelection((t) => {
          o = typeof o < "u" ? o : !e.getIsAllRowsSelected();
          const n = {
              ...t,
            },
            i = e.getPreGroupedRowModel().flatRows;
          return (
            o
              ? i.forEach((props) => {
                  if (props.getCanSelect()) {
                    n[props.id] = !0;
                  }
                })
              : i.forEach((props) => {
                  delete n[props.id];
                }),
            n
          );
        });
      };
      e.toggleAllPageRowsSelected = (o) =>
        e.setRowSelection((t) => {
          const n = typeof o < "u" ? o : !e.getIsAllPageRowsSelected(),
            i = {
              ...t,
            };
          return (
            e.getRowModel().rows.forEach((props) => {
              Q(i, props.id, n, !0, e);
            }),
            i
          );
        });
      e.getPreSelectedRowModel = () => e.getCoreRowModel();
      e.getSelectedRowModel = m(
        () => [e.getState().rowSelection, e.getCoreRowModel()],
        (o, t) =>
          Object.keys(o).length
            ? N(e, t)
            : {
                rows: [],
                flatRows: [],
                rowsById: {},
              },
        C(e.options, "debugTable"),
      );
      e.getFilteredSelectedRowModel = m(
        () => [e.getState().rowSelection, e.getFilteredRowModel()],
        (o, t) =>
          Object.keys(o).length
            ? N(e, t)
            : {
                rows: [],
                flatRows: [],
                rowsById: {},
              },
        C(e.options, "debugTable"),
      );
      e.getGroupedSelectedRowModel = m(
        () => [e.getState().rowSelection, e.getSortedRowModel()],
        (o, t) =>
          Object.keys(o).length
            ? N(e, t)
            : {
                rows: [],
                flatRows: [],
                rowsById: {},
              },
        C(e.options, "debugTable"),
      );
      e.getIsAllRowsSelected = () => {
        const o = e.getFilteredRowModel().flatRows,
          { rowSelection: t } = e.getState();
        let n = !!(o.length && Object.keys(t).length);
        return (
          n &&
            o.some((props) => props.getCanSelect() && !t[props.id]) &&
            (n = !1),
          n
        );
      };
      e.getIsAllPageRowsSelected = () => {
        const o = e
            .getPaginationRowModel()
            .flatRows.filter((item) => item.getCanSelect()),
          { rowSelection: t } = e.getState();
        let n = !!o.length;
        return (n && o.some((props) => !t[props.id]) && (n = !1), n);
      };
      e.getIsSomeRowsSelected = () => {
        var o;
        const t = Object.keys(
          (o = e.getState().rowSelection) != null ? o : {},
        ).length;
        return t > 0 && t < e.getFilteredRowModel().flatRows.length;
      };
      e.getIsSomePageRowsSelected = () => {
        const o = e.getPaginationRowModel().flatRows;
        return e.getIsAllPageRowsSelected()
          ? !1
          : o
              .filter((item) => item.getCanSelect())
              .some((item) => item.getIsSelected() || item.getIsSomeSelected());
      };
      e.getToggleAllRowsSelectedHandler = () => (event) => {
        e.toggleAllRowsSelected(event.target.checked);
      };
      e.getToggleAllPageRowsSelectedHandler = () => (event) => {
        e.toggleAllPageRowsSelected(event.target.checked);
      };
    },
    createRow: (e, o) => {
      e.toggleSelected = (t, n) => {
        const i = e.getIsSelected();
        o.setRowSelection((r) => {
          var l;
          if (((t = typeof t < "u" ? t : !i), e.getCanSelect() && i === t))
            return r;
          const u = {
            ...r,
          };
          return (
            Q(u, e.id, t, (l = n?.selectChildren) != null ? l : !0, o),
            u
          );
        });
      };
      e.getIsSelected = () => {
        const { rowSelection: t } = o.getState();
        return b(e, t);
      };
      e.getIsSomeSelected = () => {
        const { rowSelection: t } = o.getState();
        return J(e, t) === "some";
      };
      e.getIsAllSubRowsSelected = () => {
        const { rowSelection: t } = o.getState();
        return J(e, t) === "all";
      };
      e.getCanSelect = () => {
        var t;
        if (typeof o.options.enableRowSelection == "function") {
          return o.options.enableRowSelection(e);
        }
        if ((t = o.options.enableRowSelection) != null) {
          return t;
        }
        return !0;
      };
      e.getCanSelectSubRows = () => {
        var t;
        if (typeof o.options.enableSubRowSelection == "function") {
          return o.options.enableSubRowSelection(e);
        }
        if ((t = o.options.enableSubRowSelection) != null) {
          return t;
        }
        return !0;
      };
      e.getCanMultiSelect = () => {
        var t;
        if (typeof o.options.enableMultiRowSelection == "function") {
          return o.options.enableMultiRowSelection(e);
        }
        if ((t = o.options.enableMultiRowSelection) != null) {
          return t;
        }
        return !0;
      };
      e.getToggleSelectedHandler = () => {
        const t = e.getCanSelect();
        return (event) => {
          var i;
          if (t) {
            e.toggleSelected((i = event.target) == null ? void 0 : i.checked);
          }
        };
      };
    },
  },
  Q = (e, o, t, n, i) => {
    var r;
    const l = i.getRow(o, !0);
    t
      ? (l.getCanMultiSelect() ||
          Object.keys(e).forEach((item) => delete e[item]),
        l.getCanSelect() && (e[o] = !0))
      : delete e[o];
    if (n && (r = l.subRows) != null && r.length && l.getCanSelectSubRows()) {
      l.subRows.forEach((props) => Q(e, props.id, t, n, i));
    }
  };
function N(e, o) {
  const t = e.getState().rowSelection,
    n = [],
    i = {},
    r = function (l, u) {
      return l
        .map((props) => {
          var g;
          const c = b(props, t);
          if (
            (c && (n.push(props), (i[props.id] = props)),
            (g = props.subRows) != null &&
              g.length &&
              (props = {
                ...props,
                subRows: r(props.subRows),
              }),
            c)
          )
            return props;
        })
        .filter(Boolean);
    };
  return {
    rows: r(o.rows),
    flatRows: n,
    rowsById: i,
  };
}
function b(e, o) {
  var t;
  return (t = o[e.id]) != null ? t : !1;
}
function J(e, o, t) {
  var n;
  if (!((n = e.subRows) != null && n.length)) return !1;
  let i = !0,
    r = !1;
  return (
    e.subRows.forEach((item) => {
      if (
        !(r && !i) &&
        (item.getCanSelect() && (b(item, o) ? (r = !0) : (i = !1)),
        item.subRows && item.subRows.length)
      ) {
        const u = J(item, o);
        u === "all" ? (r = !0) : (u === "some" && (r = !0), (i = !1));
      }
    }),
    i ? "all" : r ? "some" : !1
  );
}
const W = /([0-9]+)/gm,
  be = (e, o, t) =>
    pe(y(e.getValue(t)).toLowerCase(), y(o.getValue(t)).toLowerCase()),
  et = (e, o, t) => pe(y(e.getValue(t)), y(o.getValue(t))),
  tt = (e, o, t) =>
    ee(y(e.getValue(t)).toLowerCase(), y(o.getValue(t)).toLowerCase()),
  nt = (e, o, t) => ee(y(e.getValue(t)), y(o.getValue(t))),
  ot = (e, o, t) => {
    const n = e.getValue(t),
      i = o.getValue(t);
    if (n > i) {
      return 1;
    }
    if (n < i) {
      return -1;
    }
    return 0;
  },
  it = (e, o, t) => ee(e.getValue(t), o.getValue(t));
function ee(e, o) {
  if (e === o) {
    return 0;
  }
  if (e > o) {
    return 1;
  }
  return -1;
}
function y(e) {
  if (typeof e == "number") {
    return isNaN(e) || e === 1 / 0 || e === -1 / 0 ? "" : String(e);
  }
  if (typeof e == "string") {
    return e;
  }
  return "";
}
function pe(e, o) {
  const t = e.split(W).filter(Boolean),
    n = o.split(W).filter(Boolean);
  for (; t.length && n.length; ) {
    const i = t.shift(),
      r = n.shift(),
      l = parseInt(i, 10),
      u = parseInt(r, 10),
      a = [l, u].sort();
    if (isNaN(a[0])) {
      if (i > r) return 1;
      if (r > i) return -1;
      continue;
    }
    if (isNaN(a[1])) return isNaN(l) ? -1 : 1;
    if (l > u) return 1;
    if (u > l) return -1;
  }
  return t.length - n.length;
}
const D = {
    alphanumeric: be,
    alphanumericCaseSensitive: et,
    text: tt,
    textCaseSensitive: nt,
    datetime: ot,
    basic: it,
  },
  rt = {
    getInitialState: (e) => ({
      sorting: [],
      ...e,
    }),
    getDefaultColumnDef: () => ({
      sortingFn: "auto",
      sortUndefined: 1,
    }),
    getDefaultOptions: (e) => ({
      onSortingChange: $("sorting", e),
      isMultiSortEvent: (o) => o.shiftKey,
    }),
    createColumn: (e, o) => {
      e.getAutoSortingFn = () => {
        const t = o.getFilteredRowModel().flatRows.slice(10);
        let n = !1;
        for (const i of t) {
          const r = i?.getValue(e.id);
          if (Object.prototype.toString.call(r) === "[object Date]")
            return D.datetime;
          if (typeof r == "string" && ((n = !0), r.split(W).length > 1))
            return D.alphanumeric;
        }
        return n ? D.text : D.basic;
      };
      e.getAutoSortDir = () => {
        const t = o.getFilteredRowModel().flatRows[0];
        return typeof t?.getValue(e.id) == "string" ? "asc" : "desc";
      };
      e.getSortingFn = () => {
        var t, n;
        if (!e) throw new Error();
        if (L(e.columnDef.sortingFn)) {
          return e.columnDef.sortingFn;
        }
        if (e.columnDef.sortingFn === "auto") {
          return e.getAutoSortingFn();
        }
        if (
          (t =
            (n = o.options.sortingFns) == null
              ? void 0
              : n[e.columnDef.sortingFn]) != null
        ) {
          return t;
        }
        return D[e.columnDef.sortingFn];
      };
      e.toggleSorting = (t, n) => {
        const i = e.getNextSortingOrder(),
          r = typeof t < "u" && t !== null;
        o.setSorting((l) => {
          const u = l?.find((props) => props.id === e.id),
            a = l?.findIndex((props) => props.id === e.id);
          let g = [],
            c,
            S = r ? t : i === "desc";
          if (
            (l != null && l.length && e.getCanMultiSort() && n
              ? u
                ? (c = "toggle")
                : (c = "add")
              : l != null && l.length && a !== l.length - 1
                ? (c = "replace")
                : u
                  ? (c = "toggle")
                  : (c = "replace"),
            c === "toggle" && (r || i || (c = "remove")),
            c === "add")
          ) {
            var d;
            g = [
              ...l,
              {
                id: e.id,
                desc: S,
              },
            ];
            g.splice(
              0,
              g.length -
                ((d = o.options.maxMultiSortColCount) != null
                  ? d
                  : Number.MAX_SAFE_INTEGER),
            );
          } else
            c === "toggle"
              ? (g = l.map((props) =>
                  props.id === e.id
                    ? {
                        ...props,
                        desc: S,
                      }
                    : props,
                ))
              : c === "remove"
                ? (g = l.filter((props) => props.id !== e.id))
                : (g = [
                    {
                      id: e.id,
                      desc: S,
                    },
                  ]);
          return g;
        });
      };
      e.getFirstSortDir = () => {
        var t, n;
        return (
          (t =
            (n = e.columnDef.sortDescFirst) != null
              ? n
              : o.options.sortDescFirst) != null
            ? t
            : e.getAutoSortDir() === "desc"
        )
          ? "desc"
          : "asc";
      };
      e.getNextSortingOrder = (t) => {
        var n, i;
        const r = e.getFirstSortDir(),
          l = e.getIsSorted();
        return l
          ? l !== r &&
            ((n = o.options.enableSortingRemoval) == null || n) &&
            (!(t && (i = o.options.enableMultiRemove) != null) || i)
            ? !1
            : l === "desc"
              ? "asc"
              : "desc"
          : r;
      };
      e.getCanSort = () => {
        var t, n;
        return (
          ((t = e.columnDef.enableSorting) != null ? t : !0) &&
          ((n = o.options.enableSorting) != null ? n : !0) &&
          !!e.accessorFn
        );
      };
      e.getCanMultiSort = () => {
        var t, n;
        return (t =
          (n = e.columnDef.enableMultiSort) != null
            ? n
            : o.options.enableMultiSort) != null
          ? t
          : !!e.accessorFn;
      };
      e.getIsSorted = () => {
        var t;
        const n =
          (t = o.getState().sorting) == null
            ? void 0
            : t.find((props) => props.id === e.id);
        return n ? (n.desc ? "desc" : "asc") : !1;
      };
      e.getSortIndex = () => {
        var t, n;
        return (t =
          (n = o.getState().sorting) == null
            ? void 0
            : n.findIndex((props) => props.id === e.id)) != null
          ? t
          : -1;
      };
      e.clearSorting = () => {
        o.setSorting((t) =>
          t != null && t.length ? t.filter((props) => props.id !== e.id) : [],
        );
      };
      e.getToggleSortingHandler = () => {
        const t = e.getCanSort();
        return (n) => {
          if (t) {
            (n.persist == null || n.persist(),
              e.toggleSorting == null ||
                e.toggleSorting(
                  void 0,
                  e.getCanMultiSort()
                    ? o.options.isMultiSortEvent == null
                      ? void 0
                      : o.options.isMultiSortEvent(n)
                    : !1,
                ));
          }
        };
      };
    },
    createTable: (e) => {
      e.setSorting = (o) =>
        e.options.onSortingChange == null
          ? void 0
          : e.options.onSortingChange(o);
      e.resetSorting = (o) => {
        var t, n;
        e.setSorting(
          o
            ? []
            : (t = (n = e.initialState) == null ? void 0 : n.sorting) != null
              ? t
              : [],
        );
      };
      e.getPreSortedRowModel = () => e.getGroupedRowModel();
      e.getSortedRowModel = () => (
        !e._getSortedRowModel &&
          e.options.getSortedRowModel &&
          (e._getSortedRowModel = e.options.getSortedRowModel(e)),
        e.options.manualSorting || !e._getSortedRowModel
          ? e.getPreSortedRowModel()
          : e._getSortedRowModel()
      );
    },
  },
  lt = [Ve, Xe, je, qe, Me, Ie, Ke, Qe, rt, Be, Je, We, Ye, Ze, Ne];
function st(e) {
  var o, t;
  const n = [...lt, ...((o = e._features) != null ? o : [])];
  let i = {
    _features: n,
  };
  const r = i._features.reduce(
      (item, acc) =>
        Object.assign(
          item,
          acc.getDefaultOptions == null ? void 0 : acc.getDefaultOptions(i),
        ),
      {},
    ),
    l = (d) => {
      return i.options.mergeOptions
        ? i.options.mergeOptions(r, d)
        : {
            ...r,
            ...d,
          };
    };
  let a = {
    ...{},
    ...((t = e.initialState) != null ? t : {}),
  };
  i._features.forEach((item) => {
    var s;
    a =
      (s = item.getInitialState == null ? void 0 : item.getInitialState(a)) !=
      null
        ? s
        : a;
  });
  const g = [];
  let c = !1;
  const S = {
    _features: n,
    options: {
      ...r,
      ...e,
    },
    initialState: a,
    _queue: (d) => {
      g.push(d);
      c ||
        ((c = !0),
        Promise.resolve()
          .then(() => {
            for (; g.length; ) g.shift()();
            c = !1;
          })
          .catch((error) =>
            setTimeout(() => {
              throw error;
            }),
          ));
    },
    reset: () => {
      i.setState(i.initialState);
    },
    setOptions: (d) => {
      const s = I(d, i.options);
      i.options = l(s);
    },
    getState: () => i.options.state,
    setState: (d) => {
      i.options.onStateChange == null || i.options.onStateChange(d);
    },
    _getRowId: (d, s, f) => {
      var p;
      return (p =
        i.options.getRowId == null ? void 0 : i.options.getRowId(d, s, f)) !=
        null
        ? p
        : `${f ? [f.id, s].join(".") : s}`;
    },
    getCoreRowModel: () => (
      i._getCoreRowModel || (i._getCoreRowModel = i.options.getCoreRowModel(i)),
      i._getCoreRowModel()
    ),
    getRowModel: () => i.getPaginationRowModel(),
    getRow: (d, s) => {
      let f = (s ? i.getPrePaginationRowModel() : i.getRowModel()).rowsById[d];
      if (!f && ((f = i.getCoreRowModel().rowsById[d]), !f)) throw new Error();
      return f;
    },
    _getDefaultColumnDef: m(
      () => [i.options.defaultColumn],
      (d) => {
        var s;
        return (
          (d = (s = d) != null ? s : {}),
          {
            header: (f) => {
              const p = f.header.column.columnDef;
              if (p.accessorKey) {
                return p.accessorKey;
              }
              if (p.accessorFn) {
                return p.id;
              }
              return null;
            },
            cell: (f) => {
              var p, R;
              return (p =
                (R = f.renderValue()) == null || R.toString == null
                  ? void 0
                  : R.toString()) != null
                ? p
                : null;
            },
            ...i._features.reduce(
              (item, acc) =>
                Object.assign(
                  item,
                  acc.getDefaultColumnDef == null
                    ? void 0
                    : acc.getDefaultColumnDef(),
                ),
              {},
            ),
            ...d,
          }
        );
      },
      C(e, "debugColumns"),
    ),
    _getColumnDefs: () => i.options.columns,
    getAllColumns: m(
      () => [i._getColumnDefs()],
      (d) => {
        const s = function (f, p, R) {
          return (
            R === void 0 && (R = 0),
            f.map((item) => {
              const v = Pe(i, item, R, p),
                h = item;
              return ((v.columns = h.columns ? s(h.columns, v, R + 1) : []), v);
            })
          );
        };
        return s(d);
      },
      C(e, "debugColumns"),
    ),
    getAllFlatColumns: m(
      () => [i.getAllColumns()],
      (d) => d.flatMap((item) => item.getFlatColumns()),
      C(e, "debugColumns"),
    ),
    _getAllFlatColumnsById: m(
      () => [i.getAllFlatColumns()],
      (d) => d.reduce((item, acc) => ((item[acc.id] = acc), item), {}),
      C(e, "debugColumns"),
    ),
    getAllLeafColumns: m(
      () => [i.getAllColumns(), i._getOrderColumnsFn()],
      (d, s) => {
        let f = d.flatMap((item) => item.getLeafColumns());
        return s(f);
      },
      C(e, "debugColumns"),
    ),
    getColumn: (d) => i._getAllFlatColumnsById()[d],
  };
  Object.assign(i, S);
  for (let d = 0; d < i._features.length; d++) {
    const s = i._features[d];
    s == null || s.createTable == null || s.createTable(i);
  }
  return i;
}
function Ct() {
  return (e) =>
    m(
      () => [e.options.data],
      (o) => {
        const t = {
            rows: [],
            flatRows: [],
            rowsById: {},
          },
          n = function (i, r, l) {
            if (r === void 0) {
              r = 0;
            }
            const u = [];
            for (let g = 0; g < i.length; g++) {
              const c = Y(
                e,
                e._getRowId(i[g], g, l),
                i[g],
                g,
                r,
                void 0,
                l?.id,
              );
              if (
                (t.flatRows.push(c),
                (t.rowsById[c.id] = c),
                u.push(c),
                e.options.getSubRows)
              ) {
                var a;
                c.originalSubRows = e.options.getSubRows(i[g], g);
                if ((a = c.originalSubRows) != null && a.length) {
                  c.subRows = n(c.originalSubRows, r + 1, c);
                }
              }
            }
            return u;
          };
        return ((t.rows = n(o)), t);
      },
      C(e.options, "debugTable", "getRowModel", () => e._autoResetPageIndex()),
    );
}
function ut(e) {
  const o = [],
    t = (n) => {
      var i;
      o.push(n);
      if ((i = n.subRows) != null && i.length && n.getIsExpanded()) {
        n.subRows.forEach(t);
      }
    };
  return (
    e.rows.forEach(t),
    {
      rows: o,
      flatRows: e.flatRows,
      rowsById: e.rowsById,
    }
  );
}
function at(e, o, t) {
  return t.options.filterFromLeafRows ? gt(e, o, t) : dt(e, o, t);
}
function gt(e, o, t) {
  var n;
  const i = [],
    r = {},
    l = (n = t.options.maxLeafRowFilterDepth) != null ? n : 100,
    u = function (a, g) {
      if (g === void 0) {
        g = 0;
      }
      const c = [];
      for (let d = 0; d < a.length; d++) {
        var S;
        let s = a[d];
        const f = Y(t, s.id, s.original, s.index, s.depth, void 0, s.parentId);
        if (
          ((f.columnFilters = s.columnFilters),
          (S = s.subRows) != null && S.length && g < l)
        ) {
          if (
            ((f.subRows = u(s.subRows, g + 1)),
            (s = f),
            o(s) && !f.subRows.length)
          ) {
            c.push(s);
            r[s.id] = s;
            i.push(s);
            continue;
          }
          if (o(s) || f.subRows.length) {
            c.push(s);
            r[s.id] = s;
            i.push(s);
            continue;
          }
        } else {
          s = f;
          if (o(s)) {
            (c.push(s), (r[s.id] = s), i.push(s));
          }
        }
      }
      return c;
    };
  return {
    rows: u(e),
    flatRows: i,
    rowsById: r,
  };
}
function dt(e, o, t) {
  var n;
  const i = [],
    r = {},
    l = (n = t.options.maxLeafRowFilterDepth) != null ? n : 100,
    u = function (a, g) {
      if (g === void 0) {
        g = 0;
      }
      const c = [];
      for (let d = 0; d < a.length; d++) {
        let s = a[d];
        if (o(s)) {
          var S;
          if ((S = s.subRows) != null && S.length && g < l) {
            const p = Y(
              t,
              s.id,
              s.original,
              s.index,
              s.depth,
              void 0,
              s.parentId,
            );
            p.subRows = u(s.subRows, g + 1);
            s = p;
          }
          c.push(s);
          i.push(s);
          r[s.id] = s;
        }
      }
      return c;
    };
  return {
    rows: u(e),
    flatRows: i,
    rowsById: r,
  };
}
function Rt() {
  return (e) =>
    m(
      () => [
        e.getPreFilteredRowModel(),
        e.getState().columnFilters,
        e.getState().globalFilter,
      ],
      (o, t, n) => {
        if (!o.rows.length || (!(t != null && t.length) && !n)) {
          for (let d = 0; d < o.flatRows.length; d++) {
            o.flatRows[d].columnFilters = {};
            o.flatRows[d].columnFiltersMeta = {};
          }
          return o;
        }
        const i = [],
          r = [];
        (t ?? []).forEach((props) => {
          var s;
          const f = e.getColumn(props.id);
          if (!f) return;
          const p = f.getFilterFn();
          if (p) {
            i.push({
              id: props.id,
              filterFn: p,
              resolvedValue:
                (s =
                  p.resolveFilterValue == null
                    ? void 0
                    : p.resolveFilterValue(props.value)) != null
                  ? s
                  : props.value,
            });
          }
        });
        const l = (t ?? []).map((props) => props.id),
          u = e.getGlobalFilterFn(),
          a = e.getAllLeafColumns().filter((item) => item.getCanGlobalFilter());
        if (n && u && a.length) {
          (l.push("__global__"),
            a.forEach((props) => {
              var s;
              r.push({
                id: props.id,
                filterFn: u,
                resolvedValue:
                  (s =
                    u.resolveFilterValue == null
                      ? void 0
                      : u.resolveFilterValue(n)) != null
                    ? s
                    : n,
              });
            }));
        }
        let g, c;
        for (let d = 0; d < o.flatRows.length; d++) {
          const s = o.flatRows[d];
          if (((s.columnFilters = {}), i.length))
            for (let f = 0; f < i.length; f++) {
              g = i[f];
              const p = g.id;
              s.columnFilters[p] = g.filterFn(s, p, g.resolvedValue, (R) => {
                s.columnFiltersMeta[p] = R;
              });
            }
          if (r.length) {
            for (let f = 0; f < r.length; f++) {
              c = r[f];
              const p = c.id;
              if (
                c.filterFn(s, p, c.resolvedValue, (R) => {
                  s.columnFiltersMeta[p] = R;
                })
              ) {
                s.columnFilters.__global__ = !0;
                break;
              }
            }
            if (s.columnFilters.__global__ !== !0) {
              s.columnFilters.__global__ = !1;
            }
          }
        }
        const S = (d) => {
          for (let s = 0; s < l.length; s++)
            if (d.columnFilters[l[s]] === !1) return !1;
          return !0;
        };
        return at(o.rows, S, e);
      },
      C(e.options, "debugTable", "getFilteredRowModel", () =>
        e._autoResetPageIndex(),
      ),
    );
}
function wt(e) {
  return (o) =>
    m(
      () => [
        o.getState().pagination,
        o.getPrePaginationRowModel(),
        o.options.paginateExpandedRows ? void 0 : o.getState().expanded,
      ],
      (t, n) => {
        if (!n.rows.length) return n;
        const { pageSize: i, pageIndex: r } = t;
        let { rows: l, flatRows: u, rowsById: a } = n;
        const g = i * r,
          c = g + i;
        l = l.slice(g, c);
        let S;
        o.options.paginateExpandedRows
          ? (S = {
              rows: l,
              flatRows: u,
              rowsById: a,
            })
          : (S = ut({
              rows: l,
              flatRows: u,
              rowsById: a,
            }));
        S.flatRows = [];
        const d = (s) => {
          S.flatRows.push(s);
          if (s.subRows.length) {
            s.subRows.forEach(d);
          }
        };
        return (S.rows.forEach(d), S);
      },
      C(o.options, "debugTable"),
    );
}
function vt() {
  return (e) =>
    m(
      () => [e.getState().sorting, e.getPreSortedRowModel()],
      (o, t) => {
        if (!t.rows.length || !(o != null && o.length)) return t;
        const n = e.getState().sorting,
          i = [],
          r = n.filter((props) => {
            var g;
            return (g = e.getColumn(props.id)) == null
              ? void 0
              : g.getCanSort();
          }),
          l = {};
        r.forEach((props) => {
          const g = e.getColumn(props.id);
          if (g) {
            l[props.id] = {
              sortUndefined: g.columnDef.sortUndefined,
              invertSorting: g.columnDef.invertSorting,
              sortingFn: g.getSortingFn(),
            };
          }
        });
        const u = (a) => {
          const g = a.map((item) => ({
            ...item,
          }));
          return (
            g.sort((a, b) => {
              for (let s = 0; s < r.length; s += 1) {
                var d;
                const f = r[s],
                  p = l[f.id],
                  R = p.sortUndefined,
                  w = (d = f?.desc) != null ? d : !1;
                let v = 0;
                if (R) {
                  const h = a.getValue(f.id),
                    V = b.getValue(f.id),
                    F = h === void 0,
                    E = V === void 0;
                  if (F || E) {
                    if (R === "first") return F ? -1 : 1;
                    if (R === "last") return F ? 1 : -1;
                    v = F && E ? 0 : F ? R : -R;
                  }
                }
                if ((v === 0 && (v = p.sortingFn(a, b, f.id)), v !== 0))
                  return (w && (v *= -1), p.invertSorting && (v *= -1), v);
              }
              return a.index - b.index;
            }),
            g.forEach((item) => {
              var S;
              i.push(item);
              if ((S = item.subRows) != null && S.length) {
                item.subRows = u(item.subRows);
              }
            }),
            g
          );
        };
        return {
          rows: u(t.rows),
          flatRows: i,
          rowsById: t.rowsById,
        };
      },
      C(e.options, "debugTable", "getSortedRowModel", () =>
        e._autoResetPageIndex(),
      ),
    );
}
function ht(e, o) {
  return e ? (ct(e) ? U.createElement(e, o) : e) : null;
}
function ct(e) {
  return ft(e) || typeof e == "function" || pt(e);
}
function ft(e) {
  return (
    typeof e == "function" &&
    (() => {
      const o = Object.getPrototypeOf(e);
      return o.prototype && o.prototype.isReactComponent;
    })()
  );
}
function pt(e) {
  return (
    typeof e == "object" &&
    typeof e.$$typeof == "symbol" &&
    ["react.memo", "react.forward_ref"].includes(e.$$typeof.description)
  );
}
function _t(e) {
  const o = {
      state: {},
      onStateChange: () => {},
      renderFallbackValue: null,
      ...e,
    },
    [t] = U.useState(() => ({
      current: st(o),
    })),
    [n, i] = U.useState(() => t.current.initialState);
  return (
    t.current.setOptions((r) => ({
      ...r,
      ...e,
      state: {
        ...n,
        ...e.state,
      },
      onStateChange: (l) => {
        i(l);
        e.onStateChange == null || e.onStateChange(l);
      },
    })),
    t.current
  );
}
function Ft({ table: e }) {
  const o = e.getState().pagination,
    { isXl: t, is2xl: n } = Ce(),
    i = e.options?.meta?.totalRowCount ?? e.getCoreRowModel().rows.length,
    r = e.getRowModel().rows.length,
    l = i === 0 ? 0 : o.pageIndex * o.pageSize + 1,
    u = i === 0 ? 0 : Math.min(i, l + r - 1);
  return x.jsxs("div", {
    className:
      "flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0",
    children: [
      x.jsxs("div", {
        className: "text-xs-plus flex items-center space-x-2",
        children: [
          x.jsx("span", {
            children: "Show",
          }),
          x.jsx(Re, {
            data: [10, 20, 30, 40, 50, 100],
            value: o.pageSize,
            onChange: (event) => {
              e.setPageSize(Number(event.target.value));
            },
            classNames: {
              root: "w-fit",
              select: "h-7 rounded-full py-1 text-xs ltr:pr-7! rtl:pl-7!",
            },
          }),
          x.jsx("span", {
            children: "entries",
          }),
        ],
      }),
      x.jsx("div", {
        children: x.jsxs(we, {
          total: e.getPageCount(),
          value: o.pageIndex + 1,
          onChange: (a) => e.setPageIndex(a - 1),
          siblings: t ? 2 : n ? 3 : 1,
          boundaries: t ? 2 : 1,
          children: [x.jsx(ve, {}), x.jsx(he, {}), x.jsx(_e, {})],
        }),
      }),
      x.jsxs("div", {
        className: "text-xs-plus truncate",
        children: [l, " - ", u, " of ", i, " entries"],
      }),
    ],
  });
}
export {
  Ft as P,
  Ct as a,
  Rt as b,
  mt as c,
  wt as d,
  ht as f,
  vt as g,
  _t as u,
};
