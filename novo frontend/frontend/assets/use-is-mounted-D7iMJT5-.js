import { a as f, R as L } from "./index-Bx06KCE-.js";

/* ---- Define Property Helper (Minified class field decorator) ---- */
var U = Object.defineProperty,
  _ = (target, key, value) => {
    return key in target
      ? U(target, key, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: value,
        })
      : (target[key] = value);
  },
  F = (target, key, value) => {
    return (_(target, typeof key != "symbol" ? key + "" : key, value), value);
  };

/* ---- Environment Detection Class ---- */
let C = class {
    constructor() {
      F(this, "current", this.detect());
      F(this, "handoffState", "pending");
      F(this, "currentId", 0);
    }
    set(environment) {
      if (this.current !== environment) {
        ((this.handoffState = "pending"),
          (this.currentId = 0),
          (this.current = environment));
      }
    }
    reset() {
      this.set(this.detect());
    }
    nextId() {
      return ++this.currentId;
    }
    get isServer() {
      return this.current === "server";
    }
    get isClient() {
      return this.current === "client";
    }
    detect() {
      return typeof window > "u" || typeof document > "u" ? "server" : "client";
    }
    handoff() {
      if (this.handoffState === "pending") {
        this.handoffState = "complete";
      }
    }
    get isHandoffComplete() {
      return this.handoffState === "complete";
    }
  },
  j = new C();

/* ---- Owner Document Helper ---- */
function H(element) {
  var ownerDoc;
  if (j.isServer) {
    return null;
  }
  if (element == null) {
    return document;
  }
  if ((ownerDoc = element?.ownerDocument) != null) {
    return ownerDoc;
  }
  return document;
}

/* ---- Root Node Helper ---- */
function A(element) {
  var rootNode, callResult;
  if (j.isServer) {
    return null;
  }
  if (element == null) {
    return document;
  }
  if ((callResult = (rootNode = element?.getRootNode) == null ? void 0 : rootNode.call(element)) != null) {
    return callResult;
  }
  return document;
}

/* ---- Get Active Element ---- */
function x(element) {
  var rootNode, activeEl;
  return (activeEl = (rootNode = A(element)) == null ? void 0 : rootNode.activeElement) != null ? activeEl : null;
}

/* ---- Check If Element Is Focused ---- */
function we(element) {
  return x(element) === element;
}

/* ---- Queue Microtask Utility ---- */
function K(callback) {
  typeof queueMicrotask == "function"
    ? queueMicrotask(callback)
    : Promise.resolve()
        .then(callback)
        .catch((error) =>
          setTimeout(() => {
            throw error;
          }),
        );
}

/* ---- Disposables (Cleanup Scheduler) ---- */
function T() {
  let disposers = [],
    disposables = {
      addEventListener(target, eventName, handler, options) {
        return (
          target.addEventListener(eventName, handler, options),
          disposables.add(() => target.removeEventListener(eventName, handler, options))
        );
      },
      requestAnimationFrame(...args) {
        let frameId = requestAnimationFrame(...args);
        return disposables.add(() => cancelAnimationFrame(frameId));
      },
      nextFrame(...args) {
        return disposables.requestAnimationFrame(() => disposables.requestAnimationFrame(...args));
      },
      setTimeout(...args) {
        let timerId = setTimeout(...args);
        return disposables.add(() => clearTimeout(timerId));
      },
      microTask(...args) {
        let active = {
          current: !0,
        };
        return (
          K(() => {
            if (active.current) {
              args[0]();
            }
          }),
          disposables.add(() => {
            active.current = !1;
          })
        );
      },
      style(element, property, newValue) {
        let previousValue = element.style.getPropertyValue(property);
        return (
          Object.assign(element.style, {
            [property]: newValue,
          }),
          this.add(() => {
            Object.assign(element.style, {
              [property]: previousValue,
            });
          })
        );
      },
      group(callback) {
        let childDisposables = T();
        return (callback(childDisposables), this.add(() => childDisposables.dispose()));
      },
      add(disposer) {
        return (
          disposers.includes(disposer) || disposers.push(disposer),
          () => {
            let index = disposers.indexOf(disposer);
            if (index >= 0) for (let removed of disposers.splice(index, 1)) removed();
          }
        );
      },
      dispose() {
        for (let disposer of disposers.splice(0)) disposer();
      },
    };
  return disposables;
}

/* ---- useDisposables Hook ---- */
function Ne() {
  let [disposables] = f.useState(T);
  return (f.useEffect(() => () => disposables.dispose(), [disposables]), disposables);
}

/* ---- useIsomorphicLayoutEffect ---- */
let R = (effect, deps) => {
  j.isServer ? f.useEffect(effect, deps) : f.useLayoutEffect(effect, deps);
};

/* ---- useLatestValue (Ref that stays up-to-date) ---- */
function q(value) {
  let latestRef = f.useRef(value);
  return (
    R(() => {
      latestRef.current = value;
    }, [value]),
    latestRef
  );
}

/* ---- useEvent (Stable callback reference) ---- */
let G = function (callback) {
  let callbackRef = q(callback);
  return L.useCallback((...args) => callbackRef.current(...args), [callbackRef]);
};

/* ---- useMemoByValues ---- */
function Ae(object) {
  return f.useMemo(() => object, Object.values(object));
}

/* ---- classNames Utility ---- */
function I(...classNames) {
  return Array.from(
    new Set(
      classNames.flatMap((item) => (typeof item == "string" ? item.split(" ") : [])),
    ),
  )
    .filter(Boolean)
    .join(" ");
}

/* ---- Match Handler (Exhaustive switch-like utility) ---- */
function P(key, handlers, ...args) {
  if (key in handlers) {
    let handler = handlers[key];
    return typeof handler == "function" ? handler(...args) : handler;
  }
  let error = new Error(
    `Tried to handle "${key}" but there is no handler defined. Only defined handlers are: ${Object.keys(
      handlers,
    )
      .map((item) => `"${item}"`)
      .join(", ")}.`,
  );
  throw (Error.captureStackTrace && Error.captureStackTrace(error, P), error);
}

/* ---- Render Feature Flags ---- */
var V = ((e) => (
    (e[(e.None = 0)] = "None"),
    (e[(e.RenderStrategy = 1)] = "RenderStrategy"),
    (e[(e.Static = 2)] = "Static"),
    e
  ))(V || {}),
  W = ((e) => (
    (e[(e.Unmount = 0)] = "Unmount"),
    (e[(e.Hidden = 1)] = "Hidden"),
    e
  ))(W || {});

/* ---- useRender Hook ---- */
function B() {
  let mergeRefs = Y();
  return f.useCallback(
    (renderArgs) =>
      X({
        mergeRefs: mergeRefs,
        ...renderArgs,
      }),
    [mergeRefs],
  );
}

/* ---- Core Render Function ---- */
function X({
  ourProps: ourProps,
  theirProps: theirProps,
  slot: slotData,
  defaultTag: defaultTag,
  features: features,
  visible: visible = !0,
  name: componentName,
  mergeRefs: mergeRefsFn,
}) {
  mergeRefsFn = mergeRefsFn ?? z;
  let mergedProps = M(theirProps, ourProps);
  if (visible) return w(mergedProps, slotData, defaultTag, componentName, mergeRefsFn);
  let featureFlags = features ?? 0;
  if (featureFlags & 2) {
    let { static: isStatic = !1, ...restProps } = mergedProps;
    if (isStatic) return w(restProps, slotData, defaultTag, componentName, mergeRefsFn);
  }
  if (featureFlags & 1) {
    let { unmount: shouldUnmount = !0, ...restProps } = mergedProps;
    return P(shouldUnmount ? 0 : 1, {
      0() {
        return null;
      },
      1() {
        return w(
          {
            ...restProps,
            hidden: !0,
            style: {
              display: "none",
            },
          },
          slotData,
          defaultTag,
          componentName,
          mergeRefsFn,
        );
      },
    });
  }
  return w(mergedProps, slotData, defaultTag, componentName, mergeRefsFn);
}

/* ---- Render Element with Slot Data ---- */
function w(props, slotData = {}, defaultTag, componentName, mergeRefsFn) {
  let {
      as: ElementType = defaultTag,
      children: children,
      refName: refName = "ref",
      ...restProps
    } = O(props, ["unmount", "static"]),
    refProp =
      props.ref !== void 0
        ? {
            [refName]: props.ref,
          }
        : {},
    renderedChildren = typeof children == "function" ? children(slotData) : children;
  if ("className" in restProps && restProps.className && typeof restProps.className == "function") {
    restProps.className = restProps.className(slotData);
  }
  if (restProps["aria-labelledby"] && restProps["aria-labelledby"] === restProps.id) {
    restProps["aria-labelledby"] = void 0;
  }
  let dataAttributes = {};
  if (slotData) {
    let hasBooleanSlot = !1,
      trueSlotNames = [];
    for (let [slotKey, slotValue] of Object.entries(slotData)) {
      if (typeof slotValue == "boolean") {
        hasBooleanSlot = !0;
      }
      if (slotValue === !0) {
        trueSlotNames.push(slotKey.replace(/([A-Z])/g, (char) => `-${char.toLowerCase()}`));
      }
    }
    if (hasBooleanSlot) {
      dataAttributes["data-headlessui-state"] = trueSlotNames.join(" ");
      for (let attrName of trueSlotNames) dataAttributes[`data-${attrName}`] = "";
    }
  }
  if (N(ElementType) && (Object.keys(v(restProps)).length > 0 || Object.keys(v(dataAttributes)).length > 0))
    if (!f.isValidElement(renderedChildren) || (Array.isArray(renderedChildren) && renderedChildren.length > 1) || Z(renderedChildren)) {
      if (Object.keys(v(restProps)).length > 0)
        throw new Error(
          [
            'Passing props on "Fragment"!',
            "",
            `The current component <${componentName} /> is rendering a "Fragment".`,
            "However we need to passthrough the following props:",
            Object.keys(v(restProps))
              .concat(Object.keys(v(dataAttributes)))
              .map((item) => `  - ${item}`).join(`
`),
            "",
            "You can apply a few solutions:",
            [
              'Add an `as="..."` prop, to ensure that we render an actual element instead of a "Fragment".',
              "Render a single element as the child so that we can forward the props onto that element.",
            ].map((item) => `  - ${item}`).join(`
`),
          ].join(`
`),
        );
    } else {
      let childProps = renderedChildren.props,
        existingClassName = childProps?.className,
        mergedClassName =
          typeof existingClassName == "function"
            ? (...args) => I(existingClassName(...args), restProps.className)
            : I(existingClassName, restProps.className),
        classNameProp = mergedClassName
          ? {
              className: mergedClassName,
            }
          : {},
        combinedProps = M(renderedChildren.props, v(O(restProps, ["ref"])));
      for (let attrKey in dataAttributes)
        if (attrKey in combinedProps) {
          delete dataAttributes[attrKey];
        }
      return f.cloneElement(
        renderedChildren,
        Object.assign(
          {},
          combinedProps,
          dataAttributes,
          refProp,
          {
            ref: mergeRefsFn(Q(renderedChildren), refProp.ref),
          },
          classNameProp,
        ),
      );
    }
  return f.createElement(
    ElementType,
    Object.assign({}, O(restProps, ["ref"]), !N(ElementType) && refProp, !N(ElementType) && dataAttributes),
    renderedChildren,
  );
}

/* ---- useMergeRefsFn Hook ---- */
function Y() {
  let refsCollection = f.useRef([]),
    mergeCallback = f.useCallback((node) => {
      for (let singleRef of refsCollection.current)
        if (singleRef != null) {
          typeof singleRef == "function" ? singleRef(node) : (singleRef.current = node);
        }
    }, []);
  return (...refs) => {
    if (!refs.every((item) => item == null)) return ((refsCollection.current = refs), mergeCallback);
  };
}

/* ---- Static mergeRefs ---- */
function z(...refs) {
  return refs.every((item) => item == null)
    ? void 0
    : (node) => {
        for (let singleRef of refs)
          if (singleRef != null) {
            typeof singleRef == "function" ? singleRef(node) : (singleRef.current = node);
          }
      };
}

/* ---- Merge Props (with event handler chaining and disabled interception) ---- */
function M(...propSets) {
  if (propSets.length === 0) return {};
  if (propSets.length === 1) return propSets[0];
  let mergedProps = {},
    eventHandlerMap = {};
  for (let propSet of propSets)
    for (let propKey in propSet)
      propKey.startsWith("on") && typeof propSet[propKey] == "function"
        ? (eventHandlerMap[propKey] != null || (eventHandlerMap[propKey] = []), eventHandlerMap[propKey].push(propSet[propKey]))
        : (mergedProps[propKey] = propSet[propKey]);
  if (mergedProps.disabled || mergedProps["aria-disabled"])
    for (let eventKey in eventHandlerMap)
      if (/^(on(?:Click|Pointer|Mouse|Key)(?:Down|Up|Press)?)$/.test(eventKey)) {
        eventHandlerMap[eventKey] = [
          (event) => {
            var preventDefault;
            return (preventDefault = event?.preventDefault) == null ? void 0 : preventDefault.call(event);
          },
        ];
      }
  for (let eventKey in eventHandlerMap)
    Object.assign(mergedProps, {
      [eventKey](event, ...extraArgs) {
        let handlers = eventHandlerMap[eventKey];
        for (let handler of handlers) {
          if (
            (event instanceof Event || event?.nativeEvent instanceof Event) &&
            event.defaultPrevented
          )
            return;
          handler(event, ...extraArgs);
        }
      },
    });
  return mergedProps;
}

/* ---- Merge Props (Simple, no disabled interception) ---- */
function Se(...propSets) {
  if (propSets.length === 0) return {};
  if (propSets.length === 1) return propSets[0];
  let mergedProps = {},
    eventHandlerMap = {};
  for (let propSet of propSets)
    for (let propKey in propSet)
      propKey.startsWith("on") && typeof propSet[propKey] == "function"
        ? (eventHandlerMap[propKey] != null || (eventHandlerMap[propKey] = []), eventHandlerMap[propKey].push(propSet[propKey]))
        : (mergedProps[propKey] = propSet[propKey]);
  for (let eventKey in eventHandlerMap)
    Object.assign(mergedProps, {
      [eventKey](...args) {
        let handlers = eventHandlerMap[eventKey];
        for (let handler of handlers) handler?.(...args);
      },
    });
  return mergedProps;
}

/* ---- forwardRefWithName ---- */
function J(renderFn) {
  var displayName;
  return Object.assign(f.forwardRef(renderFn), {
    displayName: (displayName = renderFn.displayName) != null ? displayName : renderFn.name,
  });
}

/* ---- Remove Undefined Props ---- */
function v(props) {
  let cleaned = Object.assign({}, props);
  for (let key in cleaned)
    if (cleaned[key] === void 0) {
      delete cleaned[key];
    }
  return cleaned;
}

/* ---- Omit Keys From Object ---- */
function O(source, keysToOmit = []) {
  let result = Object.assign({}, source);
  for (let key of keysToOmit)
    if (key in result) {
      delete result[key];
    }
  return result;
}

/* ---- Get Ref from React Element (v18/v19 compat) ---- */
function Q(element) {
  return L.version.split(".")[0] >= "19" ? element.props.ref : element.ref;
}

/* ---- Check if type is Fragment ---- */
function N(elementType) {
  return elementType === f.Fragment || elementType === Symbol.for("react.fragment");
}

/* ---- Check if element wraps Fragment ---- */
function Z(element) {
  return N(element.type);
}

/* ---- Hidden Component ---- */
let ee = "span";
var te = ((e) => (
  (e[(e.None = 1)] = "None"),
  (e[(e.Focusable = 2)] = "Focusable"),
  (e[(e.Hidden = 4)] = "Hidden"),
  e
))(te || {});
function ne(props, ref) {
  var ariaHidden;
  let { features: featureFlags = 1, ...restProps } = props,
    hiddenProps = {
      ref: ref,
      "aria-hidden":
        (featureFlags & 2) === 2 ? !0 : (ariaHidden = restProps["aria-hidden"]) != null ? ariaHidden : void 0,
      hidden: (featureFlags & 4) === 4 ? !0 : void 0,
      style: {
        position: "fixed",
        top: 1,
        left: 1,
        width: 1,
        height: 0,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: "0",
        ...((featureFlags & 4) === 4 &&
          (featureFlags & 2) !== 2 && {
            display: "none",
          }),
      },
    };
  return B()({
    ourProps: hiddenProps,
    theirProps: restProps,
    slot: {},
    defaultTag: ee,
    name: "Hidden",
  });
}
let Fe = J(ne);

/* ---- DOM Node Type Checks ---- */
function re(value) {
  return typeof value != "object" || value === null ? !1 : "nodeType" in value;
}
function S(value) {
  return re(value) && "tagName" in value;
}
function y(value) {
  return S(value) && "accessKey" in value;
}
function oe(value) {
  return S(value) && "tabIndex" in value;
}
function Oe(value) {
  return S(value) && "style" in value;
}
function $e(value) {
  return y(value) && value.nodeName === "IFRAME";
}
function je(value) {
  return y(value) && value.nodeName === "INPUT";
}
function xe(value) {
  return y(value) && value.nodeName === "LABEL";
}
function Te(value) {
  return y(value) && value.nodeName === "FIELDSET";
}
function Pe(value) {
  return y(value) && value.nodeName === "LEGEND";
}
function Ie(element) {
  return S(element)
    ? element.matches(
        'a[href],audio[controls],button,details,embed,iframe,img[usemap],input:not([type="hidden"]),label,select,textarea,video[controls]',
      )
    : !1;
}

/* ---- Optional Ref Marker ---- */
let k = Symbol();
function Le(ref, isOptional = !0) {
  return Object.assign(ref, {
    [k]: isOptional,
  });
}

/* ---- useSyncRefs ---- */
function Re(...refs) {
  let refsStore = f.useRef(refs);
  f.useEffect(() => {
    refsStore.current = refs;
  }, [refs]);
  let syncCallback = G((node) => {
    for (let singleRef of refsStore.current)
      if (singleRef != null) {
        typeof singleRef == "function" ? singleRef(node) : (singleRef.current = node);
      }
  });
  return refs.every((item) => item == null || item?.[k]) ? void 0 : syncCallback;
}

/* ---- Keyboard Keys Enum ---- */
var ue = ((e) => (
  (e.Space = " "),
  (e.Enter = "Enter"),
  (e.Escape = "Escape"),
  (e.Backspace = "Backspace"),
  (e.Delete = "Delete"),
  (e.ArrowLeft = "ArrowLeft"),
  (e.ArrowUp = "ArrowUp"),
  (e.ArrowRight = "ArrowRight"),
  (e.ArrowDown = "ArrowDown"),
  (e.Home = "Home"),
  (e.End = "End"),
  (e.PageUp = "PageUp"),
  (e.PageDown = "PageDown"),
  (e.Tab = "Tab"),
  e
))(ue || {});

/* ---- Focusable Elements Selector ---- */
let $ = [
    "[contentEditable=true]",
    "[tabindex]",
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    "iframe",
    "input:not([disabled])",
    "select:not([disabled])",
    "details>summary",
    "textarea:not([disabled])",
  ]
    .map((item) => `${item}:not([tabindex='-1'])`)
    .join(","),
  ae = ["[data-autofocus]"]
    .map((item) => `${item}:not([tabindex='-1'])`)
    .join(",");

/* ---- Focus Direction Enums ---- */
var le = ((e) => (
    (e[(e.First = 1)] = "First"),
    (e[(e.Previous = 2)] = "Previous"),
    (e[(e.Next = 4)] = "Next"),
    (e[(e.Last = 8)] = "Last"),
    (e[(e.WrapAround = 16)] = "WrapAround"),
    (e[(e.NoScroll = 32)] = "NoScroll"),
    (e[(e.AutoFocus = 64)] = "AutoFocus"),
    e
  ))(le || {}),
  ie = ((e) => (
    (e[(e.Error = 0)] = "Error"),
    (e[(e.Overflow = 1)] = "Overflow"),
    (e[(e.Success = 2)] = "Success"),
    (e[(e.Underflow = 3)] = "Underflow"),
    e
  ))(ie || {}),
  se = ((e) => (
    (e[(e.Previous = -1)] = "Previous"),
    (e[(e.Next = 1)] = "Next"),
    e
  ))(se || {});

/* ---- Get All Focusable Elements ---- */
function D(container = document.body) {
  return container == null
    ? []
    : Array.from(container.querySelectorAll($)).sort((elementA, elementB) =>
        Math.sign(
          (elementA.tabIndex || Number.MAX_SAFE_INTEGER) -
            (elementB.tabIndex || Number.MAX_SAFE_INTEGER),
        ),
      );
}

/* ---- Get All Auto-Focus Elements ---- */
function ce(container = document.body) {
  return container == null
    ? []
    : Array.from(container.querySelectorAll(ae)).sort((elementA, elementB) =>
        Math.sign(
          (elementA.tabIndex || Number.MAX_SAFE_INTEGER) -
            (elementB.tabIndex || Number.MAX_SAFE_INTEGER),
        ),
      );
}

/* ---- Focusable Match Mode ---- */
var fe = ((e) => (
  (e[(e.Strict = 0)] = "Strict"),
  (e[(e.Loose = 1)] = "Loose"),
  e
))(fe || {});

/* ---- Check if Element is Focusable ---- */
function de(element, mode = 0) {
  var ownerDoc;
  return element === ((ownerDoc = H(element)) == null ? void 0 : ownerDoc.body)
    ? !1
    : P(mode, {
        0() {
          return element.matches($);
        },
        1() {
          let current = element;
          for (; current !== null; ) {
            if (current.matches($)) return !0;
            current = current.parentElement;
          }
          return !1;
        },
      });
}

/* ---- Restore Focus if Active Element Becomes Unfocusable ---- */
function Me(rootElement) {
  T().nextFrame(() => {
    let activeElement = x(rootElement);
    if (activeElement && oe(activeElement) && !de(activeElement, 0)) {
      pe(rootElement);
    }
  });
}

/* ---- Focus Trigger Type ---- */
var me = ((e) => (
  (e[(e.Keyboard = 0)] = "Keyboard"),
  (e[(e.Mouse = 1)] = "Mouse"),
  e
))(me || {});

/* ---- Global Focus-Visible Listener Setup ---- */
if (typeof window < "u" && typeof document < "u") {
  (document.addEventListener(
    "keydown",
    (event) => {
      event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        (document.documentElement.dataset.headlessuiFocusVisible = "");
    },
    !0,
  ),
    document.addEventListener(
      "click",
      (event) => {
        event.detail === 1
          ? delete document.documentElement.dataset.headlessuiFocusVisible
          : event.detail === 0 &&
            (document.documentElement.dataset.headlessuiFocusVisible = "");
      },
      !0,
    ));
}

/* ---- Focus with preventScroll ---- */
function pe(element) {
  element?.focus({
    preventScroll: !0,
  });
}

/* ---- Check if Element is Text Input ---- */
let he = ["textarea", "input"].join(",");
function ve(element) {
  var result, matchResult;
  return (matchResult = (result = element?.matches) == null ? void 0 : result.call(element, he)) != null
    ? matchResult
    : !1;
}

/* ---- Sort Elements by Document Position ---- */
function ye(elements, getNode = (item) => item) {
  return elements.slice().sort((itemA, itemB) => {
    let nodeA = getNode(itemA),
      nodeB = getNode(itemB);
    if (nodeA === null || nodeB === null) return 0;
    let position = nodeA.compareDocumentPosition(nodeB);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
}

/* ---- Focus Within Container by Direction ---- */
function ke(activeElement, focusDirection, container = activeElement === null ? document.body : A(activeElement)) {
  return be(D(container), focusDirection, {
    relativeTo: activeElement,
  });
}

/* ---- Focus Navigation Core Logic ---- */
function be(
  elements,
  focusDirection,
  { sorted: isSorted = !0, relativeTo: relativeElement = null, skipElements: elementsToSkip = [] } = {},
) {
  let rootNode = Array.isArray(elements) ? (elements.length > 0 ? A(elements[0]) : document) : A(elements),
    focusableElements = Array.isArray(elements) ? (isSorted ? ye(elements) : elements) : focusDirection & 64 ? ce(elements) : D(elements);
  if (elementsToSkip.length > 0 && focusableElements.length > 1) {
    focusableElements = focusableElements.filter(
      (item) =>
        !elementsToSkip.some((item) =>
          item != null && "current" in item
            ? item?.current === item
            : item === item,
        ),
    );
  }
  relativeElement = relativeElement ?? rootNode?.activeElement;
  let directionSign = (() => {
      if (focusDirection & 5) return 1;
      if (focusDirection & 10) return -1;
      throw new Error(
        "Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last",
      );
    })(),
    startIndex = (() => {
      if (focusDirection & 1) return 0;
      if (focusDirection & 2) return Math.max(0, focusableElements.indexOf(relativeElement)) - 1;
      if (focusDirection & 4) return Math.max(0, focusableElements.indexOf(relativeElement)) + 1;
      if (focusDirection & 8) return focusableElements.length - 1;
      throw new Error(
        "Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last",
      );
    })(),
    focusOptions =
      focusDirection & 32
        ? {
            preventScroll: !0,
          }
        : {},
    iteration = 0,
    totalElements = focusableElements.length,
    candidateElement;
  do {
    if (iteration >= totalElements || iteration + totalElements <= 0) return 0;
    let candidateIndex = startIndex + iteration;
    if (focusDirection & 16) candidateIndex = (candidateIndex + totalElements) % totalElements;
    else {
      if (candidateIndex < 0) return 3;
      if (candidateIndex >= totalElements) return 1;
    }
    candidateElement = focusableElements[candidateIndex];
    candidateElement?.focus(focusOptions);
    iteration += directionSign;
  } while (candidateElement !== x(candidateElement));
  return (focusDirection & 6 && ve(candidateElement) && candidateElement.select(), 2);
}

/* ---- useIsMounted Hook ---- */
function De() {
  let isMountedRef = f.useRef(!1);
  return (
    R(
      () => (
        (isMountedRef.current = !0),
        () => {
          isMountedRef.current = !1;
        }
      ),
      [],
    ),
    isMountedRef
  );
}

/* ---- Exports ---- */
export {
  V as A,
  te as B,
  W as C,
  S as D,
  $ as E,
  be as F,
  ye as G,
  de as H,
  fe as I,
  pe as J,
  B as K,
  ie as L,
  Te as M,
  Pe as N,
  re as O,
  Ie as P,
  xe as Q,
  ke as R,
  x as S,
  le as T,
  D as U,
  Se as V,
  J as Y,
  Ae as a,
  T as b,
  Me as c,
  we as d,
  ue as e,
  y as f,
  q as g,
  $e as h,
  oe as i,
  Oe as j,
  je as k,
  H as l,
  Le as m,
  R as n,
  G as o,
  Ne as p,
  N as q,
  A as r,
  j as s,
  K as t,
  P as u,
  De as v,
  v as w,
  I as x,
  Re as y,
  Fe as z,
};
