/* ======================================================================
 * floating-CA5b9ljT.js
 * Floating UI React bindings + Headless UI anchor/floating context
 * ====================================================================== */

/* ---- Imports ---- */
import {
  M as isMainTreeElement,
  N as isLeafNode,
  n as useIsoLayoutEffect,
  b as createDisposables,
  f as isHTMLElement,
  o as useEvent,
  p as useDisposables,
} from "./use-is-mounted-D7iMJT5-.js";
import { a as o, c as V, a9 as ye } from "./index-Bx06KCE-.js";
import {
  o as offsetMiddleware,
  s as shiftMiddleware,
  f as flipMiddleware,
  d as sizeMiddleware,
  c as computePosition,
  i as isDOMElement,
  e as evaluate,
  g as detectOverflow,
  m as mathMax,
  r as mathRound,
  h as mathMin,
  a as autoUpdate,
} from "./floating-ui.dom-DmqE9iVV.js";

/* ---- Disabled Fieldset Detection ---- */
function isDisabledByFieldset(element) {
  let parentElement = element.parentElement,
    legendCandidate = null;
  for (; parentElement && !isMainTreeElement(parentElement); ) {
    if (isLeafNode(parentElement)) {
      legendCandidate = parentElement;
    }
    parentElement = parentElement.parentElement;
  }
  let isDisabled = parentElement?.getAttribute("disabled") === "";
  return isDisabled && isFirstLegend(legendCandidate) ? !1 : isDisabled;
}
function isFirstLegend(element) {
  if (!element) return !1;
  let sibling = element.previousElementSibling;
  for (; sibling !== null; ) {
    if (isLeafNode(sibling)) return !1;
    sibling = sibling.previousElementSibling;
  }
  return !0;
}

/* ---- Element Size Measurement ---- */
function getElementSize(element) {
  if (element === null)
    return {
      width: 0,
      height: 0,
    };
  let { width: width, height: height } = element.getBoundingClientRect();
  return {
    width: width,
    height: height,
  };
}
function useElementSize(shouldTrack, element, asStyles = !1) {
  let [size, setSize] = o.useState(() => getElementSize(element));
  return (
    useIsoLayoutEffect(() => {
      if (!element || !shouldTrack) return;
      let disposables = createDisposables();
      return (
        disposables.requestAnimationFrame(function pollSize() {
          disposables.requestAnimationFrame(pollSize);
          setSize((prevSize) => {
            let newSize = getElementSize(element);
            return newSize.width === prevSize.width && newSize.height === prevSize.height ? prevSize : newSize;
          });
        }),
        () => {
          disposables.dispose();
        }
      );
    }, [element, shouldTrack]),
    asStyles
      ? {
          width: `${size.width}px`,
          height: `${size.height}px`,
        }
      : size
  );
}

/* ---- User Agent Detection ---- */
function getUserAgent() {
  const uaData = navigator.userAgentData;
  return uaData && Array.isArray(uaData.brands)
    ? uaData.brands
        .map((props) => {
          let { brand: brandName, version: brandVersion } = props;
          return brandName + "/" + brandVersion;
        })
        .join(" ")
    : navigator.userAgent;
}

/* ---- Isomorphic Layout Effect ---- */
var hasDocument = typeof document < "u",
  noopFn = function () {},
  useIsomorphicLayoutEffect = hasDocument ? o.useLayoutEffect : noopFn;

/* ---- Deep Equality Check ---- */
function deepEqual(a, b) {
  if (a === b) return !0;
  if (typeof a != typeof b) return !1;
  if (typeof a == "function" && a.toString() === b.toString()) return !0;
  let index, length, keys;
  if (a && b && typeof a == "object") {
    if (Array.isArray(a)) {
      if (((index = a.length), index !== b.length)) return !1;
      for (length = index; length-- !== 0; ) if (!deepEqual(a[length], b[length])) return !1;
      return !0;
    }
    if (((keys = Object.keys(a)), (index = keys.length), index !== Object.keys(b).length))
      return !1;
    for (length = index; length-- !== 0; ) if (!{}.hasOwnProperty.call(b, keys[length])) return !1;
    for (length = index; length-- !== 0; ) {
      const key = keys[length];
      if (!(key === "_owner" && a.$$typeof) && !deepEqual(a[key], b[key])) return !1;
    }
    return !0;
  }
  return a !== a && b !== b;
}

/* ---- Device Pixel Ratio Helpers ---- */
function getDevicePixelRatio(element) {
  return typeof window > "u"
    ? 1
    : (element.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function roundByDPR(element, value) {
  const dpr = getDevicePixelRatio(element);
  return Math.round(value * dpr) / dpr;
}

/* ---- Stable Callback Ref ---- */
function useLatestRef(value) {
  const ref = o.useRef(value);
  return (
    useIsomorphicLayoutEffect(() => {
      ref.current = value;
    }),
    ref
  );
}

/* ---- useFloating (core Floating UI React hook) ---- */
function useFloating(props) {
  if (props === void 0) {
    props = {};
  }
  const {
      placement: initialPlacement = "bottom",
      strategy: positionStrategy = "absolute",
      middleware: middlewareList = [],
      platform: platformOverride,
      elements: { reference: externalReference, floating: externalFloating } = {},
      transform: useTransform = !0,
      whileElementsMounted: whileElementsMountedFn,
      open: isOpen,
    } = props,
    [positionData, setPositionData] = o.useState({
      x: 0,
      y: 0,
      strategy: positionStrategy,
      placement: initialPlacement,
      middlewareData: {},
      isPositioned: !1,
    }),
    [currentMiddleware, setCurrentMiddleware] = o.useState(middlewareList);
  deepEqual(currentMiddleware, middlewareList) || setCurrentMiddleware(middlewareList);
  const [referenceElement, setReferenceElement] = o.useState(null),
    [floatingElement, setFloatingElement] = o.useState(null),
    setReferenceCallback = o.useCallback((element) => {
      if (element !== referenceRef.current) {
        ((referenceRef.current = element), setReferenceElement(element));
      }
    }, []),
    setFloatingCallback = o.useCallback((element) => {
      if (element !== floatingRef.current) {
        ((floatingRef.current = element), setFloatingElement(element));
      }
    }, []),
    resolvedReference = externalReference || referenceElement,
    resolvedFloating = externalFloating || floatingElement,
    referenceRef = o.useRef(null),
    floatingRef = o.useRef(null),
    prevPositionData = o.useRef(positionData),
    hasWhileElementsMounted = whileElementsMountedFn != null,
    whileElementsMountedRef = useLatestRef(whileElementsMountedFn),
    platformRef = useLatestRef(platformOverride),
    openRef = useLatestRef(isOpen),
    updatePosition = o.useCallback(() => {
      if (!referenceRef.current || !floatingRef.current) return;
      const computeOptions = {
        placement: initialPlacement,
        strategy: positionStrategy,
        middleware: currentMiddleware,
      };
      if (platformRef.current) {
        computeOptions.platform = platformRef.current;
      }
      computePosition(referenceRef.current, floatingRef.current, computeOptions).then((result) => {
        const newData = {
          ...result,
          isPositioned: openRef.current !== !1,
        };
        if (isMountedRef.current && !deepEqual(prevPositionData.current, newData)) {
          ((prevPositionData.current = newData),
            V.flushSync(() => {
              setPositionData(newData);
            }));
        }
      });
    }, [currentMiddleware, initialPlacement, positionStrategy, platformRef, openRef]);
  useIsomorphicLayoutEffect(() => {
    if (isOpen === !1 && prevPositionData.current.isPositioned) {
      ((prevPositionData.current.isPositioned = !1),
        setPositionData((prev) => ({
          ...prev,
          isPositioned: !1,
        })));
    }
  }, [isOpen]);
  const isMountedRef = o.useRef(!1);
  useIsomorphicLayoutEffect(
    () => (
      (isMountedRef.current = !0),
      () => {
        isMountedRef.current = !1;
      }
    ),
    [],
  );
  useIsomorphicLayoutEffect(() => {
    if ((resolvedReference && (referenceRef.current = resolvedReference), resolvedFloating && (floatingRef.current = resolvedFloating), resolvedReference && resolvedFloating)) {
      if (whileElementsMountedRef.current) return whileElementsMountedRef.current(resolvedReference, resolvedFloating, updatePosition);
      updatePosition();
    }
  }, [resolvedReference, resolvedFloating, updatePosition, whileElementsMountedRef, hasWhileElementsMounted]);
  const refs = o.useMemo(
      () => ({
        reference: referenceRef,
        floating: floatingRef,
        setReference: setReferenceCallback,
        setFloating: setFloatingCallback,
      }),
      [setReferenceCallback, setFloatingCallback],
    ),
    elements = o.useMemo(
      () => ({
        reference: resolvedReference,
        floating: resolvedFloating,
      }),
      [resolvedReference, resolvedFloating],
    ),
    floatingStyles = o.useMemo(() => {
      const baseStyles = {
        position: positionStrategy,
        left: 0,
        top: 0,
      };
      if (!elements.floating) return baseStyles;
      const roundedX = roundByDPR(elements.floating, positionData.x),
        roundedY = roundByDPR(elements.floating, positionData.y);
      return useTransform
        ? {
            ...baseStyles,
            transform: "translate(" + roundedX + "px, " + roundedY + "px)",
            ...(getDevicePixelRatio(elements.floating) >= 1.5 && {
              willChange: "transform",
            }),
          }
        : {
            position: positionStrategy,
            left: roundedX,
            top: roundedY,
          };
    }, [positionStrategy, useTransform, elements.floating, positionData.x, positionData.y]);
  return o.useMemo(
    () => ({
      ...positionData,
      update: updatePosition,
      refs: refs,
      elements: elements,
      floatingStyles: floatingStyles,
    }),
    [positionData, updatePosition, refs, elements, floatingStyles],
  );
}

/* ---- Middleware Wrappers (with options tracking) ---- */
const wrappedOffset = (value, options) => ({
    ...offsetMiddleware(value),
    options: [value, options],
  }),
  wrappedShift = (value, options) => ({
    ...shiftMiddleware(value),
    options: [value, options],
  }),
  wrappedFlip = (value, options) => ({
    ...flipMiddleware(value),
    options: [value, options],
  }),
  wrappedSize = (value, options) => ({
    ...sizeMiddleware(value),
    options: [value, options],
  }),
  reactInternals = {
    ...ye,
  },
  useInsertionEffectShim = reactInternals.useInsertionEffect,
  safeInsertionEffect = useInsertionEffectShim || ((fn) => fn());

/* ---- useEffectEvent (stable callback) ---- */
function useEffectEvent(callback) {
  const callbackRef = o.useRef(() => {});
  return (
    safeInsertionEffect(() => {
      callbackRef.current = callback;
    }),
    o.useCallback(function () {
      for (var args = arguments.length, argArray = new Array(args), idx = 0; idx < args; idx++)
        argArray[idx] = arguments[idx];
      return callbackRef.current == null ? void 0 : callbackRef.current(...argArray);
    }, [])
  );
}

/* ---- Isomorphic Layout Effect (for floating) ---- */
var useFloatingLayoutEffect = typeof document < "u" ? o.useLayoutEffect : o.useEffect;

/* ---- Unique ID Generation ---- */
let idInitialized = !1,
  idCounter = 0;
const generateId = () => "floating-ui-" + Math.random().toString(36).slice(2, 6) + idCounter++;
function useFloatingId() {
  const [id, setId] = o.useState(() => (idInitialized ? generateId() : void 0));
  return (
    useFloatingLayoutEffect(() => {
      if (id == null) {
        setId(generateId());
      }
    }, []),
    o.useEffect(() => {
      idInitialized = !0;
    }, []),
    id
  );
}
const nativeUseId = reactInternals.useId,
  useId = nativeUseId || useFloatingId;

/* ---- Event Emitter ---- */
function createEventEmitter() {
  const listenersMap = new Map();
  return {
    emit(eventName, data) {
      var listeners;
      (listeners = listenersMap.get(eventName)) == null || listeners.forEach((item) => item(data));
    },
    on(eventName, handler) {
      listenersMap.set(eventName, [...(listenersMap.get(eventName) || []), handler]);
    },
    off(eventName, handler) {
      var listeners;
      listenersMap.set(
        eventName,
        ((listeners = listenersMap.get(eventName)) == null ? void 0 : listeners.filter((item) => item !== handler)) ||
          [],
      );
    },
  };
}

/* ---- Floating Tree / Nested Contexts ---- */
const FloatingTreeContext = o.createContext(null),
  FloatingNodeContext = o.createContext(null),
  useFloatingParentNodeId = () => {
    var context;
    return ((context = o.useContext(FloatingTreeContext)) == null ? void 0 : context.id) || null;
  },
  useFloatingTree = () => o.useContext(FloatingNodeContext),
  FOCUSABLE_ATTR = "data-floating-ui-focusable";

/* ---- useFloatingRootContext ---- */
function useFloatingRootContext(props) {
  const { open: isOpen = !1, onOpenChange: onOpenChangeProp, elements: elementsConfig } = props,
    floatingId = useId(),
    dataRef = o.useRef({}),
    [events] = o.useState(() => createEventEmitter()),
    isNested = useFloatingParentNodeId() != null,
    [positionReference, setPositionReference] = o.useState(elementsConfig.reference),
    handleOpenChange = useEffectEvent((open, event, reason) => {
      dataRef.current.openEvent = open ? event : void 0;
      events.emit("openchange", {
        open: open,
        event: event,
        reason: reason,
        nested: isNested,
      });
      onOpenChangeProp?.(open, event, reason);
    }),
    actions = o.useMemo(
      () => ({
        setPositionReference: setPositionReference,
      }),
      [],
    ),
    resolvedElements = o.useMemo(
      () => ({
        reference: positionReference || elementsConfig.reference || null,
        floating: elementsConfig.floating || null,
        domReference: elementsConfig.reference,
      }),
      [positionReference, elementsConfig.reference, elementsConfig.floating],
    );
  return o.useMemo(
    () => ({
      dataRef: dataRef,
      open: isOpen,
      onOpenChange: handleOpenChange,
      elements: resolvedElements,
      events: events,
      floatingId: floatingId,
      refs: actions,
    }),
    [isOpen, handleOpenChange, resolvedElements, events, floatingId, actions],
  );
}

/* ---- useFloating (extended with interactions) ---- */
function useFloatingContext(props) {
  if (props === void 0) {
    props = {};
  }
  const { nodeId: nodeId } = props,
    rootContext = useFloatingRootContext({
      ...props,
      elements: {
        reference: null,
        floating: null,
        ...props.elements,
      },
    }),
    context = props.rootContext || rootContext,
    contextElements = context.elements,
    [domReference, setDomReference] = o.useState(null),
    [positionReference, setPositionReference] = o.useState(null),
    resolvedDomReference = contextElements?.domReference || domReference,
    domReferenceRef = o.useRef(null),
    tree = useFloatingTree();
  useFloatingLayoutEffect(() => {
    if (resolvedDomReference) {
      domReferenceRef.current = resolvedDomReference;
    }
  }, [resolvedDomReference]);
  const floatingResult = useFloating({
      ...props,
      elements: {
        ...contextElements,
        ...(positionReference && {
          reference: positionReference,
        }),
      },
    }),
    setPositionRef = o.useCallback(
      (element) => {
        const virtualElement = isDOMElement(element)
          ? {
              getBoundingClientRect: () => element.getBoundingClientRect(),
              contextElement: element,
            }
          : element;
        setPositionReference(virtualElement);
        floatingResult.refs.setReference(virtualElement);
      },
      [floatingResult.refs],
    ),
    setReference = o.useCallback(
      (element) => {
        if (isDOMElement(element) || element === null) {
          ((domReferenceRef.current = element), setDomReference(element));
        }
        if (
          isDOMElement(floatingResult.refs.reference.current) ||
          floatingResult.refs.reference.current === null ||
          (element !== null && !isDOMElement(element))
        ) {
          floatingResult.refs.setReference(element);
        }
      },
      [floatingResult.refs],
    ),
    refs = o.useMemo(
      () => ({
        ...floatingResult.refs,
        setReference: setReference,
        setPositionReference: setPositionRef,
        domReference: domReferenceRef,
      }),
      [floatingResult.refs, setReference, setPositionRef],
    ),
    elements = o.useMemo(
      () => ({
        ...floatingResult.elements,
        domReference: resolvedDomReference,
      }),
      [floatingResult.elements, resolvedDomReference],
    ),
    fullContext = o.useMemo(
      () => ({
        ...floatingResult,
        ...context,
        refs: refs,
        elements: elements,
        nodeId: nodeId,
      }),
      [floatingResult, refs, elements, nodeId, context],
    );
  return (
    useFloatingLayoutEffect(() => {
      context.dataRef.current.floatingContext = fullContext;
      const treeNode = tree?.nodesRef.current.find((props) => props.id === nodeId);
      if (treeNode) {
        treeNode.context = fullContext;
      }
    }),
    o.useMemo(
      () => ({
        ...floatingResult,
        context: fullContext,
        refs: refs,
        elements: elements,
      }),
      [floatingResult, refs, elements, fullContext],
    )
  );
}

/* ---- Interaction Props Merger ---- */
const ACTIVE_KEY = "active",
  SELECTED_KEY = "selected";
function mergeInteractionProps(userProps, interactionsList, elementRole) {
  const handlerMap = new Map(),
    isItemRole = elementRole === "item";
  let cleanedProps = userProps;
  if (isItemRole && userProps) {
    const { [ACTIVE_KEY]: _active, [SELECTED_KEY]: _selected, ...rest } = userProps;
    cleanedProps = rest;
  }
  return {
    ...(elementRole === "floating" && {
      tabIndex: -1,
      [FOCUSABLE_ATTR]: "",
    }),
    ...cleanedProps,
    ...interactionsList
      .map((item) => {
        const handler = item ? item[elementRole] : null;
        return typeof handler == "function" ? (userProps ? handler(userProps) : null) : handler;
      })
      .concat(userProps)
      .reduce(
        (merged, current) => (
          current &&
            Object.entries(current).forEach((entry) => {
              let [propName, propValue] = entry;
              if (!(isItemRole && [ACTIVE_KEY, SELECTED_KEY].includes(propName)))
                if (propName.indexOf("on") === 0) {
                  if ((handlerMap.has(propName) || handlerMap.set(propName, []), typeof propValue == "function")) {
                    var handlers;
                    (handlers = handlerMap.get(propName)) == null || handlers.push(propValue);
                    merged[propName] = function () {
                      for (
                        var results, argCount = arguments.length, args = new Array(argCount), argIdx = 0;
                        argIdx < argCount;
                        argIdx++
                      )
                        args[argIdx] = arguments[argIdx];
                      return (results = handlerMap.get(propName)) == null
                        ? void 0
                        : results
                            .map((item) => item(...args))
                            .find((item) => item !== void 0);
                    };
                  }
                } else merged[propName] = propValue;
            }),
          merged
        ),
        {},
      ),
  };
}

/* ---- useInteractions ---- */
function useInteractions(interactionsList) {
  if (interactionsList === void 0) {
    interactionsList = [];
  }
  const referenceDepList = interactionsList.map((item) => item?.reference),
    floatingDepList = interactionsList.map((item) => item?.floating),
    itemDepList = interactionsList.map((item) => item?.item),
    getReferenceProps = o.useCallback((userProps) => mergeInteractionProps(userProps, interactionsList, "reference"), referenceDepList),
    getFloatingProps = o.useCallback((userProps) => mergeInteractionProps(userProps, interactionsList, "floating"), floatingDepList),
    getItemProps = o.useCallback((userProps) => mergeInteractionProps(userProps, interactionsList, "item"), itemDepList);
  return o.useMemo(
    () => ({
      getReferenceProps: getReferenceProps,
      getFloatingProps: getFloatingProps,
      getItemProps: getItemProps,
    }),
    [getReferenceProps, getFloatingProps, getItemProps],
  );
}

/* ---- Inner Middleware Helpers ---- */
function withOverriddenHeight(state, height) {
  return {
    ...state,
    rects: {
      ...state.rects,
      floating: {
        ...state.rects.floating,
        height: height,
      },
    },
  };
}
const innerMiddleware = (options) => ({
  name: "inner",
  options: options,
  async fn(state) {
    const {
        listRef: listRef,
        overflowRef: overflowRef,
        onFallbackChange: onFallbackChange,
        offset: innerOffset = 0,
        index: selectedIndex = 0,
        minItemsVisible: minVisible = 4,
        referenceOverflowThreshold: overflowThreshold = 0,
        scrollRef: scrollRefOption,
        ...detectOverflowOptions
      } = evaluate(options, state),
      {
        rects: rects,
        elements: { floating: floatingEl },
      } = state,
      selectedItem = listRef.current[selectedIndex],
      scrollContainer = scrollRefOption?.current || floatingEl,
      clientTopPadding = floatingEl.clientTop || scrollContainer.clientTop,
      floatingHasClientTop = floatingEl.clientTop !== 0,
      scrollHasClientTop = scrollContainer.clientTop !== 0,
      isSameElement = floatingEl === scrollContainer;
    if (!selectedItem) return {};
    const innerState = {
        ...state,
        ...(await wrappedOffset(
          -selectedItem.offsetTop -
            floatingEl.clientTop -
            rects.reference.height / 2 -
            selectedItem.offsetHeight / 2 -
            innerOffset,
        ).fn(state)),
      },
      scrollOverflow = await detectOverflow(withOverriddenHeight(innerState, scrollContainer.scrollHeight + clientTopPadding + floatingEl.clientTop), detectOverflowOptions),
      referenceOverflow = await detectOverflow(innerState, {
        ...detectOverflowOptions,
        elementContext: "reference",
      }),
      overflowTop = mathMax(0, scrollOverflow.top),
      adjustedY = innerState.y + overflowTop,
      maxScrollHeight = (scrollContainer.scrollHeight > scrollContainer.clientHeight ? (val) => val : mathRound)(
        mathMax(0, scrollContainer.scrollHeight + ((floatingHasClientTop && isSameElement) || scrollHasClientTop ? clientTopPadding * 2 : 0) - overflowTop - mathMax(0, scrollOverflow.bottom)),
      );
    if (((scrollContainer.style.maxHeight = maxScrollHeight + "px"), (scrollContainer.scrollTop = overflowTop), onFallbackChange)) {
      const shouldFallback =
        scrollContainer.offsetHeight < selectedItem.offsetHeight * mathMin(minVisible, listRef.current.length) - 1 ||
        referenceOverflow.top >= -overflowThreshold ||
        referenceOverflow.bottom >= -overflowThreshold;
      V.flushSync(() => onFallbackChange(shouldFallback));
    }
    return (
      overflowRef &&
        (overflowRef.current = await detectOverflow(
          withOverriddenHeight(
            {
              ...innerState,
              y: adjustedY,
            },
            scrollContainer.offsetHeight + clientTopPadding + floatingEl.clientTop,
          ),
          detectOverflowOptions,
        )),
      {
        y: adjustedY,
      }
    );
  },
});

/* ---- useInnerOffset Hook ---- */
function useInnerOffset(context, options) {
  const { open: isOpen, elements: contextElements } = context,
    { enabled: isEnabled = !0, overflowRef: overflowRef, scrollRef: scrollRef, onChange: onChangeProp } = options,
    handleChange = useEffectEvent(onChangeProp),
    isKeyboardRef = o.useRef(!1),
    prevScrollTopRef = o.useRef(null),
    prevOverflowRef = o.useRef(null);
  o.useEffect(() => {
    if (!isEnabled) return;
    function handleWheel(event) {
      if (event.ctrlKey || !scrollElement || overflowRef.current == null) return;
      const deltaY = event.deltaY,
        isOverflowingTop = overflowRef.current.top >= -0.5,
        isOverflowingBottom = overflowRef.current.bottom >= -0.5,
        maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight,
        direction = deltaY < 0 ? -1 : 1,
        clampFn = deltaY < 0 ? "max" : "min";
      scrollElement.scrollHeight <= scrollElement.clientHeight ||
        ((!isOverflowingTop && deltaY > 0) || (!isOverflowingBottom && deltaY < 0)
          ? (event.preventDefault(),
            V.flushSync(() => {
              handleChange((currentOffset) => currentOffset + Math[clampFn](deltaY, maxScroll * direction));
            }))
          : /firefox/i.test(getUserAgent()) && (scrollElement.scrollTop += deltaY));
    }
    const scrollElement = scrollRef?.current || contextElements.floating;
    if (isOpen && scrollElement)
      return (
        scrollElement.addEventListener("wheel", handleWheel),
        requestAnimationFrame(() => {
          prevScrollTopRef.current = scrollElement.scrollTop;
          if (overflowRef.current != null) {
            prevOverflowRef.current = {
              ...overflowRef.current,
            };
          }
        }),
        () => {
          prevScrollTopRef.current = null;
          prevOverflowRef.current = null;
          scrollElement.removeEventListener("wheel", handleWheel);
        }
      );
  }, [isEnabled, isOpen, contextElements.floating, overflowRef, scrollRef, handleChange]);
  const floatingProps = o.useMemo(
    () => ({
      onKeyDown() {
        isKeyboardRef.current = !0;
      },
      onWheel() {
        isKeyboardRef.current = !1;
      },
      onPointerMove() {
        isKeyboardRef.current = !1;
      },
      onScroll() {
        const scrollEl = scrollRef?.current || contextElements.floating;
        if (!(!overflowRef.current || !scrollEl || !isKeyboardRef.current)) {
          if (prevScrollTopRef.current !== null) {
            const scrollDelta = scrollEl.scrollTop - prevScrollTopRef.current;
            if (
              (overflowRef.current.bottom < -0.5 && scrollDelta < -1) ||
              (overflowRef.current.top < -0.5 && scrollDelta > 1)
            ) {
              V.flushSync(() => handleChange((currentOffset) => currentOffset + scrollDelta));
            }
          }
          requestAnimationFrame(() => {
            prevScrollTopRef.current = scrollEl.scrollTop;
          });
        }
      },
    }),
    [contextElements.floating, handleChange, overflowRef, scrollRef],
  );
  return o.useMemo(
    () =>
      isEnabled
        ? {
            floating: floatingProps,
          }
        : {},
    [isEnabled, floatingProps],
  );
}

/* ---- Headless UI Floating/Anchor Context ---- */
let FloatingContext = o.createContext({
  styles: void 0,
  setReference: () => {},
  setFloating: () => {},
  getReferenceProps: () => ({}),
  getFloatingProps: () => ({}),
  slot: {},
});
FloatingContext.displayName = "FloatingContext";
let PlacementContext = o.createContext(null);
PlacementContext.displayName = "PlacementContext";

/* ---- Anchor Config Parser ---- */
function parseAnchorConfig(anchorProp) {
  return o.useMemo(
    () =>
      anchorProp
        ? typeof anchorProp == "string"
          ? {
              to: anchorProp,
            }
          : anchorProp
        : null,
    [anchorProp],
  );
}

/* ---- useFloatingReference (Headless UI) ---- */
function useFloatingReference() {
  return o.useContext(FloatingContext).setReference;
}

/* ---- useFloatingReferenceProps (Headless UI) ---- */
function useFloatingReferenceProps() {
  return o.useContext(FloatingContext).getReferenceProps;
}

/* ---- useFloatingPanelProps (Headless UI) ---- */
function useFloatingPanelProps() {
  let { getFloatingProps: getFloatingProps, slot: slotData } = o.useContext(FloatingContext);
  return o.useCallback(
    (...args) =>
      Object.assign({}, getFloatingProps(...args), {
        "data-anchor": slotData.anchor,
      }),
    [getFloatingProps, slotData],
  );
}

/* ---- useResolvedAnchor (Headless UI) ---- */
function useResolvedAnchor(anchorProp = null) {
  if (anchorProp === !1) {
    anchorProp = null;
  }
  if (typeof anchorProp == "string") {
    anchorProp = {
      to: anchorProp,
    };
  }
  let placementSetter = o.useContext(PlacementContext),
    memoizedAnchor = o.useMemo(
      () => anchorProp,
      [
        JSON.stringify(anchorProp, (key, value) => {
          var outerHTML;
          return (outerHTML = value?.outerHTML) != null ? outerHTML : value;
        }),
      ],
    );
  useIsoLayoutEffect(() => {
    placementSetter?.(memoizedAnchor ?? null);
  }, [placementSetter, memoizedAnchor]);
  let floatingCtx = o.useContext(FloatingContext);
  return o.useMemo(
    () => [floatingCtx.setFloating, anchorProp ? floatingCtx.styles : {}],
    [floatingCtx.setFloating, anchorProp, floatingCtx.styles],
  );
}

/* ---- AnchorProvider Component (Headless UI) ---- */
let MIN_ITEMS_VISIBLE = 4;
function AnchorProvider({ children: children, enabled: isEnabled = !0 }) {
  let [anchorConfig, setAnchorConfig] = o.useState(null),
    [innerOffset, setInnerOffset] = o.useState(0),
    overflowRef = o.useRef(null),
    [floatingElement, setFloatingElement] = o.useState(null);
  observeMaxHeightRounding(floatingElement);
  let isActive = isEnabled && anchorConfig !== null && floatingElement !== null,
    {
      to: anchorTo = "bottom",
      gap: anchorGap = 0,
      offset: anchorOffset = 0,
      padding: anchorPadding = 0,
      inner: innerConfig,
    } = resolveAnchorValues(anchorConfig, floatingElement),
    [mainAxis, crossAxis = "center"] = anchorTo.split(" ");
  useIsoLayoutEffect(() => {
    if (isActive) {
      setInnerOffset(0);
    }
  }, [isActive]);
  let {
      refs: floatingRefs,
      floatingStyles: computedFloatingStyles,
      context: floatingContext,
    } = useFloatingContext({
      open: isActive,
      placement:
        mainAxis === "selection"
          ? crossAxis === "center"
            ? "bottom"
            : `bottom-${crossAxis}`
          : crossAxis === "center"
            ? `${mainAxis}`
            : `${mainAxis}-${crossAxis}`,
      strategy: "absolute",
      transform: !1,
      middleware: [
        wrappedOffset({
          mainAxis: mainAxis === "selection" ? 0 : anchorGap,
          crossAxis: anchorOffset,
        }),
        wrappedShift({
          padding: anchorPadding,
        }),
        mainAxis !== "selection" &&
          wrappedFlip({
            padding: anchorPadding,
          }),
        mainAxis === "selection" && innerConfig
          ? innerMiddleware({
              ...innerConfig,
              padding: anchorPadding,
              overflowRef: overflowRef,
              offset: innerOffset,
              minItemsVisible: MIN_ITEMS_VISIBLE,
              referenceOverflowThreshold: anchorPadding,
              onFallbackChange(isFallback) {
                var childNodes, floatingChildren;
                if (!isFallback) return;
                let floatingEl = floatingContext.elements.floating;
                if (!floatingEl) return;
                let scrollPaddingBottom =
                    parseFloat(getComputedStyle(floatingEl).scrollPaddingBottom) || 0,
                  visibleCount = Math.min(MIN_ITEMS_VISIBLE, floatingEl.childElementCount),
                  partialHeight = 0,
                  partialVisible = 0;
                for (let child of (floatingChildren =
                  (childNodes = floatingContext.elements.floating) == null ? void 0 : childNodes.childNodes) !=
                null
                  ? floatingChildren
                  : [])
                  if (isHTMLElement(child)) {
                    let childTop = child.offsetTop,
                      childBottom = childTop + child.clientHeight + scrollPaddingBottom,
                      scrollTop = floatingEl.scrollTop,
                      scrollBottom = scrollTop + floatingEl.clientHeight;
                    if (childTop >= scrollTop && childBottom <= scrollBottom) visibleCount--;
                    else {
                      partialVisible = Math.max(0, Math.min(childBottom, scrollBottom) - Math.max(childTop, scrollTop));
                      partialHeight = child.clientHeight;
                      break;
                    }
                  }
                if (visibleCount >= 1) {
                  setInnerOffset((currentOffset) => {
                    let neededOffset = partialHeight * visibleCount - partialVisible + scrollPaddingBottom;
                    return currentOffset >= neededOffset ? currentOffset : neededOffset;
                  });
                }
              },
            })
          : null,
        wrappedSize({
          padding: anchorPadding,
          apply({ availableWidth: availWidth, availableHeight: availHeight, elements: sizeElements }) {
            Object.assign(sizeElements.floating.style, {
              overflow: "auto",
              maxWidth: `${availWidth}px`,
              maxHeight: `min(var(--anchor-max-height, 100vh), ${availHeight}px)`,
            });
          },
        }),
      ].filter(Boolean),
      whileElementsMounted: autoUpdate,
    }),
    [resolvedMainAxis = mainAxis, resolvedCrossAxis = crossAxis] = floatingContext.placement.split("-");
  if (mainAxis === "selection") {
    resolvedMainAxis = "selection";
  }
  let slotData = o.useMemo(
      () => ({
        anchor: [resolvedMainAxis, resolvedCrossAxis].filter(Boolean).join(" "),
      }),
      [resolvedMainAxis, resolvedCrossAxis],
    ),
    innerOffsetInteraction = useInnerOffset(floatingContext, {
      overflowRef: overflowRef,
      onChange: setInnerOffset,
    }),
    { getReferenceProps: getReferenceProps, getFloatingProps: getFloatingProps } = useInteractions([innerOffsetInteraction]),
    setFloatingRef = useEvent((element) => {
      setFloatingElement(element);
      floatingRefs.setFloating(element);
    });
  return o.createElement(
    PlacementContext.Provider,
    {
      value: setAnchorConfig,
    },
    o.createElement(
      FloatingContext.Provider,
      {
        value: {
          setFloating: setFloatingRef,
          setReference: floatingRefs.setReference,
          styles: computedFloatingStyles,
          getReferenceProps: getReferenceProps,
          getFloatingProps: getFloatingProps,
          slot: slotData,
        },
      },
      children,
    ),
  );
}

/* ---- Max Height Rounding Observer ---- */
function observeMaxHeightRounding(props) {
  useIsoLayoutEffect(() => {
    if (!props) return;
    let observer = new MutationObserver(() => {
      let maxHeightStr = window.getComputedStyle(props).maxHeight,
        maxHeightFloat = parseFloat(maxHeightStr);
      if (isNaN(maxHeightFloat)) return;
      let maxHeightInt = parseInt(maxHeightStr);
      isNaN(maxHeightInt) || (maxHeightFloat !== maxHeightInt && (props.style.maxHeight = `${Math.ceil(maxHeightFloat)}px`));
    });
    return (
      observer.observe(props, {
        attributes: !0,
        attributeFilter: ["style"],
      }),
      () => {
        observer.disconnect();
      }
    );
  }, [props]);
}

/* ---- Anchor Value Resolution ---- */
function resolveAnchorValues(anchorConfig, floatingElement) {
  var gapRaw, offsetRaw, paddingRaw;
  let gap = resolveCSSValue((gapRaw = anchorConfig?.gap) != null ? gapRaw : "var(--anchor-gap, 0)", floatingElement),
    offset = resolveCSSValue((offsetRaw = anchorConfig?.offset) != null ? offsetRaw : "var(--anchor-offset, 0)", floatingElement),
    padding = resolveCSSValue((paddingRaw = anchorConfig?.padding) != null ? paddingRaw : "var(--anchor-padding, 0)", floatingElement);
  return {
    ...anchorConfig,
    gap: gap,
    offset: offset,
    padding: padding,
  };
}

/* ---- CSS Value Resolution (with live tracking) ---- */
function resolveCSSValue(value, element, defaultValue = void 0) {
  let disposables = useDisposables(),
    resolve = useEvent((val, el) => {
      if (val == null) return [defaultValue, null];
      if (typeof val == "number") return [val, null];
      if (typeof val == "string") {
        if (!el) return [defaultValue, null];
        let computedValue = computeCSSValue(val, el);
        return [
          computedValue,
          (setValue) => {
            let cssVarNames = extractCSSVariables(val);
            {
              let cachedValues = cssVarNames.map((item) =>
                window.getComputedStyle(el).getPropertyValue(item),
              );
              disposables.requestAnimationFrame(function poll() {
                disposables.nextFrame(poll);
                let hasChanged = !1;
                for (let [idx, varName] of cssVarNames.entries()) {
                  let currentValue = window.getComputedStyle(el).getPropertyValue(varName);
                  if (cachedValues[idx] !== currentValue) {
                    cachedValues[idx] = currentValue;
                    hasChanged = !0;
                    break;
                  }
                }
                if (!hasChanged) return;
                let newValue = computeCSSValue(val, el);
                if (computedValue !== newValue) {
                  (setValue(newValue), (computedValue = newValue));
                }
              });
            }
            return disposables.dispose;
          },
        ];
      }
      return [defaultValue, null];
    }),
    initialValue = o.useMemo(() => resolve(value, element)[0], [value, element]),
    [trackedValue = initialValue, setTrackedValue] = o.useState();
  return (
    useIsoLayoutEffect(() => {
      let [resolvedVal, setupTracking] = resolve(value, element);
      if ((setTrackedValue(resolvedVal), !!setupTracking)) return setupTracking(setTrackedValue);
    }, [value, element]),
    trackedValue
  );
}

/* ---- CSS Variable Extraction ---- */
function extractCSSVariables(cssExpression) {
  let match = /var\((.*)\)/.exec(cssExpression);
  if (match) {
    let commaIdx = match[1].indexOf(",");
    if (commaIdx === -1) return [match[1]];
    let varName = match[1].slice(0, commaIdx).trim(),
      fallback = match[1].slice(commaIdx + 1).trim();
    return fallback ? [varName, ...extractCSSVariables(fallback)] : [varName];
  }
  return [];
}

/* ---- CSS Value Computation (via temp DOM element) ---- */
function computeCSSValue(expression, parentElement) {
  let tempDiv = document.createElement("div");
  parentElement.appendChild(tempDiv);
  tempDiv.style.setProperty("margin-top", "0px", "important");
  tempDiv.style.setProperty("margin-top", expression, "important");
  let computedValue = parseFloat(window.getComputedStyle(tempDiv).marginTop) || 0;
  return (parentElement.removeChild(tempDiv), computedValue);
}

/* ---- Exports ---- */
export {
  AnchorProvider as A,
  useFloatingReference as F,
  useResolvedAnchor as R,
  useFloatingPanelProps as T,
  useFloatingReferenceProps as b,
  isDisabledByFieldset as s,
  useElementSize as w,
  parseAnchorConfig as y,
};
