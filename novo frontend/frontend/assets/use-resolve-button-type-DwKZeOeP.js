import { R as Z, a as c } from "./index-Bx06KCE-.js";
import { p as ee, o as K, l as te } from "./use-is-mounted-D7iMJT5-.js";

/* ---- useIsomorphicLayoutEffect (document-aware) ---- */
const ne = typeof document < "u" ? Z.useLayoutEffect : () => {},

/* ---- getOwnerDocument ---- */
  $ = (element) => {
    var ownerDoc;
    return (ownerDoc = element?.ownerDocument) !== null && ownerDoc !== void 0 ? ownerDoc : document;
  },

/* ---- getWindowObject ---- */
  m = (element) => {
    return element && "window" in element && element.window === element
      ? element
      : $(element).defaultView || window;
  };

/* ---- isNode ---- */
function re(value) {
  return (
    value !== null &&
    typeof value == "object" &&
    "nodeType" in value &&
    typeof value.nodeType == "number"
  );
}

/* ---- isDocumentFragment ---- */
function oe(value) {
  return re(value) && value.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in value;
}

/* ---- Shadow DOM Support Flag ---- */
let ie = !1;
function G() {
  return ie;
}

/* ---- contains (Shadow DOM aware) ---- */
function R(ancestor, descendant) {
  if (!G()) return descendant && ancestor ? ancestor.contains(descendant) : !1;
  if (!ancestor || !descendant) return !1;
  let currentNode = descendant;
  for (; currentNode !== null; ) {
    if (currentNode === ancestor) return !0;
    currentNode.tagName === "SLOT" && currentNode.assignedSlot
      ? (currentNode = currentNode.assignedSlot.parentNode)
      : oe(currentNode)
        ? (currentNode = currentNode.host)
        : (currentNode = currentNode.parentNode);
  }
  return !1;
}

/* ---- getActiveElement (Shadow DOM aware) ---- */
const W = (rootDocument = document) => {
  var shadowRoot;
  if (!G()) return rootDocument.activeElement;
  let activeElement = rootDocument.activeElement;
  for (
    ;
    activeElement &&
    "shadowRoot" in activeElement &&
    !((shadowRoot = activeElement.shadowRoot) === null || shadowRoot === void 0) &&
    shadowRoot.activeElement;
  )
    activeElement = activeElement.shadowRoot.activeElement;
  return activeElement;
};

/* ---- getEventTarget (Shadow DOM aware) ---- */
function N(event) {
  return G() && event.target.shadowRoot && event.composedPath
    ? event.composedPath()[0]
    : event.target;
}

/* ---- focusElement (with preventScroll polyfill) ---- */
function ae(element) {
  if (ue())
    element.focus({
      preventScroll: !0,
    });
  else {
    let scrollPositions = se(element);
    element.focus();
    ce(scrollPositions);
  }
}

/* ---- preventScroll Support Detection ---- */
let P = null;
function ue() {
  if (P == null) {
    P = !1;
    try {
      document.createElement("div").focus({
        get preventScroll() {
          return ((P = !0), !0);
        },
      });
    } catch {}
  }
  return P;
}

/* ---- Save Scroll Positions ---- */
function se(element) {
  let parentNode = element.parentNode,
    scrollPositions = [],
    scrollRoot = document.scrollingElement || document.documentElement;
  for (; parentNode instanceof HTMLElement && parentNode !== scrollRoot; ) {
    if (parentNode.offsetHeight < parentNode.scrollHeight || parentNode.offsetWidth < parentNode.scrollWidth) {
      scrollPositions.push({
        element: parentNode,
        scrollTop: parentNode.scrollTop,
        scrollLeft: parentNode.scrollLeft,
      });
    }
    parentNode = parentNode.parentNode;
  }
  return (
    scrollRoot instanceof HTMLElement &&
      scrollPositions.push({
        element: scrollRoot,
        scrollTop: scrollRoot.scrollTop,
        scrollLeft: scrollRoot.scrollLeft,
      }),
    scrollPositions
  );
}

/* ---- Restore Scroll Positions ---- */
function ce(scrollPositions) {
  for (let { element: el, scrollTop: top, scrollLeft: left } of scrollPositions) {
    el.scrollTop = top;
    el.scrollLeft = left;
  }
}

/* ---- User Agent Detection Helpers ---- */
function C(brandRegex) {
  var brands;
  if (typeof window > "u" || window.navigator == null) return !1;
  let uaBrands =
    (brands = window.navigator.userAgentData) === null || brands === void 0
      ? void 0
      : brands.brands;
  return (
    (Array.isArray(uaBrands) && uaBrands.some((item) => brandRegex.test(item.brand))) ||
    brandRegex.test(window.navigator.userAgent)
  );
}

function V(platformRegex) {
  var platformData;
  return typeof window < "u" && window.navigator != null
    ? platformRegex.test(
        ((platformData = window.navigator.userAgentData) === null || platformData === void 0
          ? void 0
          : platformData.platform) || window.navigator.platform,
      )
    : !1;
}

/* ---- Lazy Singleton Factory ---- */
function T(factory) {
  let cachedResult = null;
  return () => (cachedResult == null && (cachedResult = factory()), cachedResult);
}

/* ---- Platform / Browser Detection Singletons ---- */
const M = T(function () {
    return V(/^Mac/i);
  }),
  le = T(function () {
    return V(/^iPad/i) || (M() && navigator.maxTouchPoints > 1);
  }),
  fe = T(function () {
    return C(/AppleWebKit/i) && !de();
  }),
  de = T(function () {
    return C(/Chrome/i);
  }),
  ve = T(function () {
    return C(/Android/i);
  }),
  be = T(function () {
    return C(/Firefox/i);
  });

/* ---- openLink (Dispatch synthetic click/keyboard event to navigate links) ---- */
function F(linkElement, keyboardEvent, shouldOpen = !0) {
  var eventType, windowEvent;
  let { metaKey: metaKey, ctrlKey: ctrlKey, altKey: altKey, shiftKey: shiftKey } = keyboardEvent;
  if (
    be() &&
    !(
      (windowEvent = window.event) === null ||
      windowEvent === void 0 ||
      (eventType = windowEvent.type) === null ||
      eventType === void 0
    ) &&
    eventType.startsWith("key") &&
    linkElement.target === "_blank"
  ) {
    M() ? (metaKey = !0) : (ctrlKey = !0);
  }
  let syntheticEvent =
    fe() && M() && !le()
      ? new KeyboardEvent("keydown", {
          keyIdentifier: "Enter",
          metaKey: metaKey,
          ctrlKey: ctrlKey,
          altKey: altKey,
          shiftKey: shiftKey,
        })
      : new MouseEvent("click", {
          metaKey: metaKey,
          ctrlKey: ctrlKey,
          altKey: altKey,
          shiftKey: shiftKey,
          detail: 1,
          bubbles: !0,
          cancelable: !0,
        });
  F.isOpening = shouldOpen;
  ae(linkElement);
  linkElement.dispatchEvent(syntheticEvent);
  F.isOpening = !1;
}
F.isOpening = !1;

/* ---- useGlobalListeners Hook ---- */
function j() {
  let listenerMap = c.useRef(new Map()),
    addGlobalListener = c.useCallback((target, eventType, handler, options) => {
      let wrappedHandler = options?.once
        ? (...args) => {
            listenerMap.current.delete(handler);
            handler(...args);
          }
        : handler;
      listenerMap.current.set(handler, {
        type: eventType,
        eventTarget: target,
        fn: wrappedHandler,
        options: options,
      });
      target.addEventListener(eventType, wrappedHandler, options);
    }, []),
    removeGlobalListener = c.useCallback((target, eventType, handler, options) => {
      var entry;
      let storedHandler =
        ((entry = listenerMap.current.get(handler)) === null || entry === void 0 ? void 0 : entry.fn) || handler;
      target.removeEventListener(eventType, storedHandler, options);
      listenerMap.current.delete(handler);
    }, []),
    removeAllGlobalListeners = c.useCallback(() => {
      listenerMap.current.forEach((entry, originalHandler) => {
        removeGlobalListener(entry.eventTarget, entry.type, originalHandler, entry.options);
      });
    }, [removeGlobalListener]);
  return (
    c.useEffect(() => removeAllGlobalListeners, [removeAllGlobalListeners]),
    {
      addGlobalListener: addGlobalListener,
      removeGlobalListener: removeGlobalListener,
      removeAllGlobalListeners: removeAllGlobalListeners,
    }
  );
}

/* ---- isVirtualClick Detection ---- */
function pe(eventProps) {
  if (eventProps.pointerType === "" && eventProps.isTrusted) {
    return !0;
  }
  if (ve() && eventProps.pointerType) {
    return eventProps.type === "click" && eventProps.buttons === 1;
  }
  return eventProps.detail === 0 && !eventProps.pointerType;
}

/* ---- createSyntheticReactEvent ---- */
function U(nativeEvent) {
  let syntheticEvent = nativeEvent;
  return (
    (syntheticEvent.nativeEvent = nativeEvent),
    (syntheticEvent.isDefaultPrevented = () => syntheticEvent.defaultPrevented),
    (syntheticEvent.isPropagationStopped = () => syntheticEvent.cancelBubble),
    (syntheticEvent.persist = () => {}),
    syntheticEvent
  );
}

/* ---- setEventTarget ---- */
function $e(event, targetElement) {
  Object.defineProperty(event, "target", {
    value: targetElement,
  });
  Object.defineProperty(event, "currentTarget", {
    value: targetElement,
  });
}

/* ---- useFocusDisabledObserver (fires blur when element becomes disabled) ---- */
function Y(onBlurCallback) {
  let stateRef = c.useRef({
    isFocused: !1,
    observer: null,
  });
  return (
    ne(() => {
      const state = stateRef.current;
      return () => {
        if (state.observer) {
          (state.observer.disconnect(), (state.observer = null));
        }
      };
    }, []),
    c.useCallback(
      (focusEvent) => {
        if (
          focusEvent.target instanceof HTMLButtonElement ||
          focusEvent.target instanceof HTMLInputElement ||
          focusEvent.target instanceof HTMLTextAreaElement ||
          focusEvent.target instanceof HTMLSelectElement
        ) {
          stateRef.current.isFocused = !0;
          let focusedElement = focusEvent.target,
            handleFocusOut = (blurEvent) => {
              if (((stateRef.current.isFocused = !1), focusedElement.disabled)) {
                let syntheticEvent = U(blurEvent);
                onBlurCallback?.(syntheticEvent);
              }
              if (stateRef.current.observer) {
                (stateRef.current.observer.disconnect(), (stateRef.current.observer = null));
              }
            };
          focusedElement.addEventListener("focusout", handleFocusOut, {
            once: !0,
          });
          stateRef.current.observer = new MutationObserver(() => {
            if (stateRef.current.isFocused && focusedElement.disabled) {
              var observerRef;
              (observerRef = stateRef.current.observer) === null ||
                observerRef === void 0 ||
                observerRef.disconnect();
              let newActiveElement =
                focusedElement === document.activeElement ? null : document.activeElement;
              focusedElement.dispatchEvent(
                new FocusEvent("blur", {
                  relatedTarget: newActiveElement,
                }),
              );
              focusedElement.dispatchEvent(
                new FocusEvent("focusout", {
                  bubbles: !0,
                  relatedTarget: newActiveElement,
                }),
              );
            }
          });
          stateRef.current.observer.observe(focusedElement, {
            attributes: !0,
            attributeFilter: ["disabled"],
          });
        }
      },
      [onBlurCallback],
    )
  );
}

/* ---- Focus Modality Tracking (keyboard / pointer / virtual) ---- */
let ge = !1,
  x = null,
  D = new Set(),
  L = new Map(),
  h = !1,
  A = !1;
const Ee = {
  Tab: !0,
  Escape: !0,
};
function I(modality, event) {
  for (let listener of D) listener(modality, event);
}
function me(keyEvent) {
  return !(
    keyEvent.metaKey ||
    (!M() && keyEvent.altKey) ||
    keyEvent.ctrlKey ||
    keyEvent.key === "Control" ||
    keyEvent.key === "Shift" ||
    keyEvent.key === "Meta"
  );
}
function k(keyEvent) {
  h = !0;
  if (!F.isOpening && me(keyEvent)) {
    ((x = "keyboard"), I("keyboard", keyEvent));
  }
}
function y(pointerEvent) {
  x = "pointer";
  if ("pointerType" in pointerEvent) {
    pointerEvent.pointerType;
  }
  if (pointerEvent.type === "mousedown" || pointerEvent.type === "pointerdown") {
    ((h = !0), I("pointer", pointerEvent));
  }
}
function X(clickEvent) {
  if (!F.isOpening && pe(clickEvent)) {
    ((h = !0), (x = "virtual"));
  }
}
function q(focusEvent) {
  focusEvent.target === window ||
    focusEvent.target === document ||
    ge ||
    !focusEvent.isTrusted ||
    (!h && !A && ((x = "virtual"), I("virtual", focusEvent)), (h = !1), (A = !1));
}
function z() {
  h = !1;
  A = !0;
}

/* ---- setupFocusModalityListeners ---- */
function O(rootElement) {
  if (typeof window > "u" || typeof document > "u" || L.get(m(rootElement))) return;
  const windowObj = m(rootElement),
    documentObj = $(rootElement);
  let originalFocus = windowObj.HTMLElement.prototype.focus;
  windowObj.HTMLElement.prototype.focus = function () {
    h = !0;
    originalFocus.apply(this, arguments);
  };
  documentObj.addEventListener("keydown", k, !0);
  documentObj.addEventListener("keyup", k, !0);
  documentObj.addEventListener("click", X, !0);
  windowObj.addEventListener("focus", q, !0);
  windowObj.addEventListener("blur", z, !1);
  if (typeof PointerEvent < "u") {
    (documentObj.addEventListener("pointerdown", y, !0),
      documentObj.addEventListener("pointermove", y, !0),
      documentObj.addEventListener("pointerup", y, !0));
  }
  windowObj.addEventListener(
    "beforeunload",
    () => {
      J(rootElement);
    },
    {
      once: !0,
    },
  );
  L.set(windowObj, {
    focus: originalFocus,
  });
}

/* ---- teardownFocusModalityListeners ---- */
const J = (rootElement, domContentLoadedHandler) => {
  const windowObj = m(rootElement),
    documentObj = $(rootElement);
  if (domContentLoadedHandler) {
    documentObj.removeEventListener("DOMContentLoaded", domContentLoadedHandler);
  }
  if (L.has(windowObj)) {
    ((windowObj.HTMLElement.prototype.focus = L.get(windowObj).focus),
      documentObj.removeEventListener("keydown", k, !0),
      documentObj.removeEventListener("keyup", k, !0),
      documentObj.removeEventListener("click", X, !0),
      windowObj.removeEventListener("focus", q, !0),
      windowObj.removeEventListener("blur", z, !1),
      typeof PointerEvent < "u" &&
        (documentObj.removeEventListener("pointerdown", y, !0),
        documentObj.removeEventListener("pointermove", y, !0),
        documentObj.removeEventListener("pointerup", y, !0)),
      L.delete(windowObj));
  }
};

/* ---- setupFocusModality (with DOMContentLoaded fallback) ---- */
function he(rootElement) {
  const documentObj = $(rootElement);
  let onDomReady;
  return (
    documentObj.readyState !== "loading"
      ? O(rootElement)
      : ((onDomReady = () => {
          O(rootElement);
        }),
        documentObj.addEventListener("DOMContentLoaded", onDomReady)),
    () => J(rootElement, onDomReady)
  );
}
if (typeof document < "u") {
  he();
}

/* ---- isFocusVisible Check ---- */
function Q() {
  return x !== "pointer";
}

/* ---- Non-Text Input Types (for focus-visible heuristics) ---- */
const we = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset",
]);

/* ---- shouldPreserveFocusVisibility ---- */
function ye(isTextInput, modality, event) {
  let ownerDoc = $(event?.target);
  const HTMLInputElementCtor =
      typeof window < "u" ? m(event?.target).HTMLInputElement : HTMLInputElement,
    HTMLTextAreaElementCtor =
      typeof window < "u"
        ? m(event?.target).HTMLTextAreaElement
        : HTMLTextAreaElement,
    HTMLElementCtor = typeof window < "u" ? m(event?.target).HTMLElement : HTMLElement,
    KeyboardEventCtor = typeof window < "u" ? m(event?.target).KeyboardEvent : KeyboardEvent;
  return (
    (isTextInput =
      isTextInput ||
      (ownerDoc.activeElement instanceof HTMLInputElementCtor && !we.has(ownerDoc.activeElement.type)) ||
      ownerDoc.activeElement instanceof HTMLTextAreaElementCtor ||
      (ownerDoc.activeElement instanceof HTMLElementCtor && ownerDoc.activeElement.isContentEditable)),
    !(isTextInput && modality === "keyboard" && event instanceof KeyboardEventCtor && !Ee[event.key])
  );
}

/* ---- useFocusVisibilityListener ---- */
function Te(callback, deps, options) {
  O();
  c.useEffect(() => {
    let modalityHandler = (modality, event) => {
      if (ye(!!options?.isTextInput, modality, event)) {
        callback(Q());
      }
    };
    return (
      D.add(modalityHandler),
      () => {
        D.delete(modalityHandler);
      }
    );
  }, deps);
}

/* ---- useFocus Hook ---- */
function Le(props) {
  let { isDisabled: isDisabled, onFocus: onFocus, onBlur: onBlur, onFocusChange: onFocusChange } = props;
  const handleBlur = c.useCallback(
      (blurEvent) => {
        if (blurEvent.target === blurEvent.currentTarget)
          return (onBlur && onBlur(blurEvent), onFocusChange && onFocusChange(!1), !0);
      },
      [onBlur, onFocusChange],
    ),
    handleDisabledBlur = Y(handleBlur),
    handleFocus = c.useCallback(
      (focusEvent) => {
        const ownerDoc = $(focusEvent.target),
          activeEl = ownerDoc ? W(ownerDoc) : W();
        if (
          focusEvent.target === focusEvent.currentTarget &&
          activeEl === N(focusEvent.nativeEvent)
        ) {
          (onFocus && onFocus(focusEvent), onFocusChange && onFocusChange(!0), handleDisabledBlur(focusEvent));
        }
      },
      [onFocusChange, onFocus, handleDisabledBlur],
    );
  return {
    focusProps: {
      onFocus: !isDisabled && (onFocus || onFocusChange || onBlur) ? handleFocus : void 0,
      onBlur: !isDisabled && (onBlur || onFocusChange) ? handleBlur : void 0,
    },
  };
}

/* ---- useFocusWithin Hook ---- */
function Fe(props) {
  let {
      isDisabled: isDisabled,
      onBlurWithin: onBlurWithin,
      onFocusWithin: onFocusWithin,
      onFocusWithinChange: onFocusWithinChange,
    } = props,
    stateRef = c.useRef({
      isFocusWithin: !1,
    }),
    { addGlobalListener: addGlobalListener, removeAllGlobalListeners: removeAllListeners } = j(),
    handleBlurWithin = c.useCallback(
      (blurEvent) => {
        if (
          blurEvent.currentTarget.contains(blurEvent.target) &&
          stateRef.current.isFocusWithin &&
          !blurEvent.currentTarget.contains(blurEvent.relatedTarget)
        ) {
          ((stateRef.current.isFocusWithin = !1), removeAllListeners(), onBlurWithin && onBlurWithin(blurEvent), onFocusWithinChange && onFocusWithinChange(!1));
        }
      },
      [onBlurWithin, onFocusWithinChange, stateRef, removeAllListeners],
    ),
    handleDisabledBlur = Y(handleBlurWithin),
    handleFocusWithin = c.useCallback(
      (focusEvent) => {
        if (!focusEvent.currentTarget.contains(focusEvent.target)) return;
        const ownerDoc = $(focusEvent.target),
          activeEl = W(ownerDoc);
        if (!stateRef.current.isFocusWithin && activeEl === N(focusEvent.nativeEvent)) {
          if (onFocusWithin) {
            onFocusWithin(focusEvent);
          }
          if (onFocusWithinChange) {
            onFocusWithinChange(!0);
          }
          stateRef.current.isFocusWithin = !0;
          handleDisabledBlur(focusEvent);
          let containerElement = focusEvent.currentTarget;
          addGlobalListener(
            ownerDoc,
            "focus",
            (innerFocusEvent) => {
              if (stateRef.current.isFocusWithin && !R(containerElement, innerFocusEvent.target)) {
                let syntheticBlur = new ownerDoc.defaultView.FocusEvent("blur", {
                  relatedTarget: innerFocusEvent.target,
                });
                $e(syntheticBlur, containerElement);
                let reactEvent = U(syntheticBlur);
                handleBlurWithin(reactEvent);
              }
            },
            {
              capture: !0,
            },
          );
        }
      },
      [onFocusWithin, onFocusWithinChange, handleDisabledBlur, addGlobalListener, handleBlurWithin],
    );
  return isDisabled
    ? {
        focusWithinProps: {
          onFocus: void 0,
          onBlur: void 0,
        },
      }
    : {
        focusWithinProps: {
          onFocus: handleFocusWithin,
          onBlur: handleBlurWithin,
        },
      };
}

/* ---- Touch/Pointer Emulation Guard for Hover ---- */
let _ = !1,
  H = 0;
function xe() {
  _ = !0;
  setTimeout(() => {
    _ = !1;
  }, 50);
}
function B(pointerEvent) {
  if (pointerEvent.pointerType === "touch") {
    xe();
  }
}

/* ---- usePointerUpCleanup (global pointerup listener ref counting) ---- */
function Pe() {
  if (!(typeof document > "u"))
    return (
      H === 0 &&
        typeof PointerEvent < "u" &&
        document.addEventListener("pointerup", B),
      H++,
      () => {
        H--;
        if (!(H > 0) && typeof PointerEvent < "u") {
          document.removeEventListener("pointerup", B);
        }
      }
    );
}

/* ---- useHover Hook ---- */
function Se(props) {
  let {
      onHoverStart: onHoverStart,
      onHoverChange: onHoverChange,
      onHoverEnd: onHoverEnd,
      isDisabled: isDisabled,
    } = props,
    [isHovered, setIsHovered] = c.useState(!1),
    hoverState = c.useRef({
      isHovered: !1,
      ignoreEmulatedMouseEvents: !1,
      pointerType: "",
      target: null,
    }).current;
  c.useEffect(Pe, []);
  let { addGlobalListener: addGlobalListener, removeAllGlobalListeners: removeAllListeners } = j(),
    { hoverProps: hoverProps, triggerHoverEnd: triggerHoverEnd } = c.useMemo(() => {
      let handleHoverStart = (hoverEvent, pointerType) => {
          if (
            ((hoverState.pointerType = pointerType),
            isDisabled ||
              pointerType === "touch" ||
              hoverState.isHovered ||
              !hoverEvent.currentTarget.contains(hoverEvent.target))
          )
            return;
          hoverState.isHovered = !0;
          let targetElement = hoverEvent.currentTarget;
          hoverState.target = targetElement;
          addGlobalListener(
            $(hoverEvent.target),
            "pointerover",
            (innerEvent) => {
              if (hoverState.isHovered && hoverState.target && !R(hoverState.target, innerEvent.target)) {
                handleHoverEnd(innerEvent, innerEvent.pointerType);
              }
            },
            {
              capture: !0,
            },
          );
          if (onHoverStart) {
            onHoverStart({
              type: "hoverstart",
              target: targetElement,
              pointerType: pointerType,
            });
          }
          if (onHoverChange) {
            onHoverChange(!0);
          }
          setIsHovered(!0);
        },
        handleHoverEnd = (hoverEvent, pointerType) => {
          let targetElement = hoverState.target;
          hoverState.pointerType = "";
          hoverState.target = null;
          if (!(pointerType === "touch" || !hoverState.isHovered || !targetElement)) {
            ((hoverState.isHovered = !1),
              removeAllListeners(),
              onHoverEnd &&
                onHoverEnd({
                  type: "hoverend",
                  target: targetElement,
                  pointerType: pointerType,
                }),
              onHoverChange && onHoverChange(!1),
              setIsHovered(!1));
          }
        },
        builtHoverProps = {};
      return (
        typeof PointerEvent < "u" &&
          ((builtHoverProps.onPointerEnter = (event) => {
            (_ && event.pointerType === "mouse") || handleHoverStart(event, event.pointerType);
          }),
          (builtHoverProps.onPointerLeave = (event) => {
            if (!isDisabled && event.currentTarget.contains(event.target)) {
              handleHoverEnd(event, event.pointerType);
            }
          })),
        {
          hoverProps: builtHoverProps,
          triggerHoverEnd: handleHoverEnd,
        }
      );
    }, [onHoverStart, onHoverChange, onHoverEnd, isDisabled, hoverState, addGlobalListener, removeAllListeners]);
  return (
    c.useEffect(() => {
      if (isDisabled) {
        triggerHoverEnd(
          {
            currentTarget: hoverState.target,
          },
          hoverState.pointerType,
        );
      }
    }, [isDisabled]),
    {
      hoverProps: hoverProps,
      isHovered: isHovered,
    }
  );
}

/* ---- useFocusVisible Hook ---- */
function We(options = {}) {
  let { autoFocus: autoFocus = !1, isTextInput: isTextInput, within: within } = options,
    focusState = c.useRef({
      isFocused: !1,
      isFocusVisible: autoFocus || Q(),
    }),
    [isFocused, setIsFocused] = c.useState(!1),
    [isFocusVisible, setIsFocusVisible] = c.useState(() => focusState.current.isFocused && focusState.current.isFocusVisible),
    updateFocusVisible = c.useCallback(
      () => setIsFocusVisible(focusState.current.isFocused && focusState.current.isFocusVisible),
      [],
    ),
    handleFocusChange = c.useCallback(
      (focused) => {
        focusState.current.isFocused = focused;
        setIsFocused(focused);
        updateFocusVisible();
      },
      [updateFocusVisible],
    );
  Te(
    (isVisible) => {
      focusState.current.isFocusVisible = isVisible;
      updateFocusVisible();
    },
    [],
    {
      isTextInput: isTextInput,
    },
  );
  let { focusProps: focusProps } = Le({
      isDisabled: within,
      onFocusChange: handleFocusChange,
    }),
    { focusWithinProps: focusWithinProps } = Fe({
      isDisabled: !within,
      onFocusWithinChange: handleFocusChange,
    });
  return {
    isFocused: isFocused,
    isFocusVisible: isFocusVisible,
    focusProps: within ? focusWithinProps : focusProps,
  };
}

/* ---- getPointerRect ---- */
function He(pointerEvent) {
  let halfWidth = pointerEvent.width / 2,
    halfHeight = pointerEvent.height / 2;
  return {
    top: pointerEvent.clientY - halfHeight,
    right: pointerEvent.clientX + halfWidth,
    bottom: pointerEvent.clientY + halfHeight,
    left: pointerEvent.clientX - halfWidth,
  };
}

/* ---- rectsOverlap ---- */
function Me(rectA, rectB) {
  return !(
    !rectA ||
    !rectB ||
    rectA.right < rectB.left ||
    rectA.left > rectB.right ||
    rectA.bottom < rectB.top ||
    rectA.top > rectB.bottom
  );
}

/* ---- useActivePress Hook ---- */
function De({ disabled: isDisabled = !1 } = {}) {
  let pressTargetRef = c.useRef(null),
    [isPressed, setIsPressed] = c.useState(!1),
    disposables = ee(),
    handlePointerUp = K(() => {
      pressTargetRef.current = null;
      setIsPressed(!1);
      disposables.dispose();
    }),
    handlePointerDown = K((pointerEvent) => {
      if ((disposables.dispose(), pressTargetRef.current === null)) {
        pressTargetRef.current = pointerEvent.currentTarget;
        setIsPressed(!0);
        {
          let ownerDoc = te(pointerEvent.currentTarget);
          disposables.addEventListener(ownerDoc, "pointerup", handlePointerUp, !1);
          disposables.addEventListener(
            ownerDoc,
            "pointermove",
            (moveEvent) => {
              if (pressTargetRef.current) {
                let pointerRect = He(moveEvent);
                setIsPressed(Me(pointerRect, pressTargetRef.current.getBoundingClientRect()));
              }
            },
            !1,
          );
          disposables.addEventListener(ownerDoc, "pointercancel", handlePointerUp, !1);
        }
      }
    });
  return {
    pressed: isPressed,
    pressProps: isDisabled
      ? {}
      : {
          onPointerDown: handlePointerDown,
          onPointerUp: handlePointerUp,
          onClick: handlePointerUp,
        },
  };
}

/* ---- useResolveButtonType Hook ---- */
function Ae(props, element) {
  return c.useMemo(() => {
    var asTag;
    if (props.type) return props.type;
    let tagName = (asTag = props.as) != null ? asTag : "button";
    if (
      (typeof tagName == "string" && tagName.toLowerCase() === "button") ||
      (element?.tagName === "BUTTON" && !element.hasAttribute("type"))
    )
      return "button";
  }, [props.type, props.as, element]);
}

/* ---- Exports ---- */
export { We as $, Se as a, Ae as e, De as w };
