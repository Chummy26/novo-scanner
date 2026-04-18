/* ---- Imports ---- */
import {
  g as At,
  R as ae,
  a as t,
  m as kt,
  i as xt,
  b as Ot,
  j as Rt,
} from "./index-Bx06KCE-.js";
import {
  a as Tt,
  c as ct,
  o as Lt,
  f as Ct,
  s as Nt,
  b as jt,
} from "./floating-ui.dom-DmqE9iVV.js";

/* ---- classNames Library (vendored) ---- */
var et = {
  exports: {},
};
var classNamesLoaded;
function loadClassNames() {
  return (
    classNamesLoaded ||
      ((classNamesLoaded = 1),
      (function (moduleExport) {
        (function () {
          var hasOwn = {}.hasOwnProperty;
          function classNames() {
            for (var result = "", argIndex = 0; argIndex < arguments.length; argIndex++) {
              var arg = arguments[argIndex];
              if (arg) {
                result = appendClass(result, processValue(arg));
              }
            }
            return result;
          }
          function processValue(arg) {
            if (typeof arg == "string" || typeof arg == "number") return arg;
            if (typeof arg != "object") return "";
            if (Array.isArray(arg)) return classNames.apply(null, arg);
            if (
              arg.toString !== Object.prototype.toString &&
              !arg.toString.toString().includes("[native code]")
            )
              return arg.toString();
            var result = "";
            for (var key in arg)
              if (hasOwn.call(arg, key) && arg[key]) {
                result = appendClass(result, key);
              }
            return result;
          }
          function appendClass(existing, newClass) {
            return newClass ? (existing ? existing + " " + newClass : existing + newClass) : existing;
          }
          moduleExport.exports
            ? ((classNames.default = classNames), (moduleExport.exports = classNames))
            : (window.classNames = classNames);
        })();
      })(et)),
    et.exports
  );
}
var $t = loadClassNames();
const ot = At($t);

/* ---- Style Injection Utilities ---- */
var dt = {};
const It = "react-tooltip-core-styles",
  Dt = "react-tooltip-base-styles",
  ft = {
    core: !1,
    base: !1,
  };
function injectStyles({ css: cssContent, id: styleId = Dt, type: styleType = "base", ref: options }) {
  var envProcessCore, envProcessBase;
  if (
    !cssContent ||
    typeof document > "u" ||
    ft[styleType] ||
    (styleType === "core" &&
      typeof process < "u" &&
      !((envProcessCore = process == null ? void 0 : dt) === null || envProcessCore === void 0) &&
      envProcessCore.REACT_TOOLTIP_DISABLE_CORE_STYLES) ||
    (styleType !== "base" &&
      typeof process < "u" &&
      !((envProcessBase = process == null ? void 0 : dt) === null || envProcessBase === void 0) &&
      envProcessBase.REACT_TOOLTIP_DISABLE_BASE_STYLES)
  )
    return;
  if (styleType === "core") {
    styleId = It;
  }
  options || (options = {});
  const { insertAt: insertPosition } = options;
  if (document.getElementById(styleId)) return;
  const headElement = document.head || document.getElementsByTagName("head")[0],
    styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.type = "text/css";
  insertPosition === "top" && headElement.firstChild
    ? headElement.insertBefore(styleElement, headElement.firstChild)
    : headElement.appendChild(styleElement);
  styleElement.styleSheet
    ? (styleElement.styleSheet.cssText = cssContent)
    : styleElement.appendChild(document.createTextNode(cssContent));
  ft[styleType] = !0;
}

/* ---- Tooltip Position Computation ---- */
const computeTooltipPosition = async ({
    elementReference: anchorElement = null,
    tooltipReference: tooltipElement = null,
    tooltipArrowReference: arrowElement = null,
    place: placement = "top",
    offset: offsetValue = 10,
    strategy: positionStrategy = "absolute",
    middlewares: middlewareList = [
      Lt(Number(offsetValue)),
      Ct({
        fallbackAxisSideDirection: "start",
      }),
      Nt({
        padding: 5,
      }),
    ],
    border: borderStyle,
    arrowSize: arrowDimension = 8,
  }) => {
    if (!anchorElement)
      return {
        tooltipStyles: {},
        tooltipArrowStyles: {},
        place: placement,
      };
    if (tooltipElement === null)
      return {
        tooltipStyles: {},
        tooltipArrowStyles: {},
        place: placement,
      };
    const activeMiddlewares = middlewareList;
    return arrowElement
      ? (activeMiddlewares.push(
          jt({
            element: arrowElement,
            padding: 5,
          }),
        ),
        ct(anchorElement, tooltipElement, {
          placement: placement,
          strategy: positionStrategy,
          middleware: activeMiddlewares,
        }).then(({ x: xPos, y: yPos, placement: finalPlacement, middlewareData: middlewareResult }) => {
          var arrowDataRef, sideRef;
          const computedTooltipStyles = {
              left: `${xPos}px`,
              top: `${yPos}px`,
              border: borderStyle,
            },
            { x: arrowX, y: arrowY } =
              (arrowDataRef = middlewareResult.arrow) !== null && arrowDataRef !== void 0
                ? arrowDataRef
                : {
                    x: 0,
                    y: 0,
                  },
            oppositeSide =
              (sideRef = {
                top: "bottom",
                right: "left",
                bottom: "top",
                left: "right",
              }[finalPlacement.split("-")[0]]) !== null && sideRef !== void 0
                ? sideRef
                : "bottom",
            borderStyles = borderStyle && {
              borderBottom: borderStyle,
              borderRight: borderStyle,
            };
          let borderWidth = 0;
          if (borderStyle) {
            const borderMatch = `${borderStyle}`.match(/(\d+)px/);
            borderWidth = borderMatch?.[1] ? Number(borderMatch[1]) : 1;
          }
          return {
            tooltipStyles: computedTooltipStyles,
            tooltipArrowStyles: {
              left: arrowX != null ? `${arrowX}px` : "",
              top: arrowY != null ? `${arrowY}px` : "",
              right: "",
              bottom: "",
              ...borderStyles,
              [oppositeSide]: `-${arrowDimension / 2 + borderWidth}px`,
            },
            place: finalPlacement,
          };
        }))
      : ct(anchorElement, tooltipElement, {
          placement: "bottom",
          strategy: positionStrategy,
          middleware: activeMiddlewares,
        }).then(({ x: xPos, y: yPos, placement: finalPlacement }) => ({
          tooltipStyles: {
            left: `${xPos}px`,
            top: `${yPos}px`,
          },
          tooltipArrowStyles: {},
          place: finalPlacement,
        }));
  },

  /* ---- CSS Supports Check ---- */
  cssSupportsCheck = (property, value) => {
    return (
      !("CSS" in window && "supports" in window.CSS) ||
      window.CSS.supports(property, value)
    );
  },

  /* ---- Throttle Function ---- */
  throttle = (callback, delay, _unused) => {
    let timerId = null;
    const throttled = function (...args) {
      const clearTimer = () => {
        timerId = null;
      };
      if (!timerId) {
        (callback.apply(this, args), (timerId = setTimeout(clearTimer, delay)));
      }
    };
    return (
      (throttled.cancel = () => {
        if (timerId) {
          (clearTimeout(timerId), (timerId = null));
        }
      }),
      throttled
    );
  },

  /* ---- Object Type Check ---- */
  isPlainObject = (value) => {
    return value !== null && !Array.isArray(value) && typeof value == "object";
  },

  /* ---- Deep Equality Check ---- */
  deepEqual = (objA, objB) => {
    if (objA === objB) return !0;
    if (Array.isArray(objA) && Array.isArray(objB))
      return (
        objA.length === objB.length && objA.every((item, index) => deepEqual(item, objB[index]))
      );
    if (Array.isArray(objA) !== Array.isArray(objB)) return !1;
    if (!isPlainObject(objA) || !isPlainObject(objB)) return objA === objB;
    const keysA = Object.keys(objA),
      keysB = Object.keys(objB);
    return keysA.length === keysB.length && keysA.every((item) => deepEqual(objA[item], objB[item]));
  },

  /* ---- Overflow Detection ---- */
  hasOverflow = (element) => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return !1;
    const computedStyle = getComputedStyle(element);
    return ["overflow", "overflow-x", "overflow-y"].some((item) => {
      const propValue = computedStyle.getPropertyValue(item);
      return propValue === "auto" || propValue === "scroll";
    });
  },

  /* ---- Find Nearest Scrollable Parent ---- */
  findScrollableParent = (element) => {
    if (!element) return null;
    let currentParent = element.parentElement;
    for (; currentParent; ) {
      if (hasOverflow(currentParent)) return currentParent;
      currentParent = currentParent.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  },

  /* ---- Isomorphic Layout Effect ---- */
  Bt = typeof window < "u" ? t.useLayoutEffect : t.useEffect,

  /* ---- Clear Timeout Helper ---- */
  clearTimeoutRef = (timeoutRef) => {
    if (timeoutRef.current) {
      (clearTimeout(timeoutRef.current), (timeoutRef.current = null));
    }
  },

  /* ---- Default Tooltip Constants ---- */
  Kt = "DEFAULT_TOOLTIP_ID",
  Mt = {
    anchorRefs: new Set(),
    activeAnchor: {
      current: null,
    },
    attach: () => {},
    detach: () => {},
    setActiveAnchor: () => {},
  },
  Wt = t.createContext({
    getTooltipData: () => Mt,
  });

/* ---- Tooltip Context Hook ---- */
function bt(tooltipId = Kt) {
  return t.useContext(Wt).getTooltipData(tooltipId);
}

/* ---- CSS Module Class Names ---- */
var ke = {
    tooltip: "core-styles-module_tooltip__3vRRp",
    fixed: "core-styles-module_fixed__pcSol",
    arrow: "core-styles-module_arrow__cvMwQ",
    noArrow: "core-styles-module_noArrow__xock6",
    clickable: "core-styles-module_clickable__ZuTTB",
    show: "core-styles-module_show__Nt9eE",
    closing: "core-styles-module_closing__sGnxF",
  },
  tt = {
    tooltip: "styles-module_tooltip__mnnfp",
    arrow: "styles-module_arrow__K0L3T",
    dark: "styles-module_dark__xNqje",
    light: "styles-module_light__Z6W-X",
    success: "styles-module_success__A2AKt",
    warning: "styles-module_warning__SCK0X",
    error: "styles-module_error__JvumD",
    info: "styles-module_info__BWdHW",
  };

/* ---- Tooltip Controller Component (internal) ---- */
const Ht = ({
    forwardRef: forwardedRef,
    id: tooltipId,
    className: className,
    classNameArrow: classNameArrow,
    variant: variant = "dark",
    anchorId: anchorId,
    anchorSelect: anchorSelect,
    place: place = "top",
    offset: offset = 10,
    events: events = ["hover"],
    openOnClick: openOnClick = !1,
    positionStrategy: positionStrategy = "absolute",
    middlewares: middlewares,
    wrapper: WrapperTag,
    delayShow: delayShow = 0,
    delayHide: delayHide = 0,
    float: floatMode = !1,
    hidden: isHidden = !1,
    noArrow: noArrow = !1,
    clickable: isClickable = !1,
    closeOnEsc: closeOnEsc = !1,
    closeOnScroll: closeOnScroll = !1,
    closeOnResize: closeOnResize = !1,
    openEvents: customOpenEvents,
    closeEvents: customCloseEvents,
    globalCloseEvents: customGlobalCloseEvents,
    imperativeModeOnly: imperativeModeOnly,
    style: userStyle,
    position: fixedPosition,
    afterShow: afterShowCallback,
    afterHide: afterHideCallback,
    disableTooltip: disableTooltipFn,
    content: contentProp,
    contentWrapperRef: contentWrapperRef,
    isOpen: controlledIsOpen,
    defaultIsOpen: defaultIsOpen = !1,
    setIsOpen: setIsOpenCallback,
    previousActiveAnchor: previousActiveAnchor,
    activeAnchor: activeAnchor,
    setActiveAnchor: setActiveAnchor,
    border: borderProp,
    opacity: opacityProp,
    arrowColor: arrowColor,
    arrowSize: arrowSize = 8,
    role: roleProp = "tooltip",
  }) => {
    var imperativeContentRef;
    const tooltipRef = t.useRef(null),
      arrowRef = t.useRef(null),
      showTimerRef = t.useRef(null),
      hideTimerRef = t.useRef(null),
      transitionTimerRef = t.useRef(null),
      [positionState, setPositionState] = t.useState({
        tooltipStyles: {},
        tooltipArrowStyles: {},
        place: place,
      }),
      [isVisible, setIsVisible] = t.useState(!1),
      [isRendered, setIsRendered] = t.useState(!1),
      [imperativeData, setImperativeData] = t.useState(null),
      prevIsVisibleRef = t.useRef(!1),
      mousePositionRef = t.useRef(null),
      { anchorRefs: contextAnchorRefs, setActiveAnchor: setGlobalActiveAnchor } = bt(tooltipId),
      isHoveredOnTooltipRef = t.useRef(!1),
      [extraAnchors, setExtraAnchors] = t.useState([]),
      isMountedRef = t.useRef(!1),
      isClickTrigger = openOnClick || events.includes("click"),
      hasClickEvent = isClickTrigger || customOpenEvents?.click || customOpenEvents?.dblclick || customOpenEvents?.mousedown,
      openEventHandlers = customOpenEvents
        ? {
            ...customOpenEvents,
          }
        : {
            mouseover: !0,
            focus: !0,
            mouseenter: !1,
            click: !1,
            dblclick: !1,
            mousedown: !1,
          };
    if (!customOpenEvents && isClickTrigger) {
      Object.assign(openEventHandlers, {
        mouseenter: !1,
        focus: !1,
        mouseover: !1,
        click: !0,
      });
    }
    const closeEventHandlers = customCloseEvents
      ? {
          ...customCloseEvents,
        }
      : {
          mouseout: !0,
          blur: !0,
          mouseleave: !1,
          click: !1,
          dblclick: !1,
          mouseup: !1,
        };
    if (!customCloseEvents && isClickTrigger) {
      Object.assign(closeEventHandlers, {
        mouseleave: !1,
        blur: !1,
        mouseout: !1,
      });
    }
    const globalCloseConfig = customGlobalCloseEvents
      ? {
          ...customGlobalCloseEvents,
        }
      : {
          escape: closeOnEsc || !1,
          scroll: closeOnScroll || !1,
          resize: closeOnResize || !1,
          clickOutsideAnchor: hasClickEvent || !1,
        };
    if (imperativeModeOnly) {
      (Object.assign(openEventHandlers, {
        mouseover: !1,
        focus: !1,
        mouseenter: !1,
        click: !1,
        dblclick: !1,
        mousedown: !1,
      }),
        Object.assign(closeEventHandlers, {
          mouseout: !1,
          blur: !1,
          mouseleave: !1,
          click: !1,
          dblclick: !1,
          mouseup: !1,
        }),
        Object.assign(globalCloseConfig, {
          escape: !1,
          scroll: !1,
          resize: !1,
          clickOutsideAnchor: !1,
        }));
    }

    /* ---- Mounted lifecycle ---- */
    Bt(
      () => (
        (isMountedRef.current = !0),
        () => {
          isMountedRef.current = !1;
        }
      ),
      [],
    );

    /* ---- Visibility toggle ---- */
    const updateIsVisible = (show) => {
      if (isMountedRef.current) {
        (show && setIsRendered(!0),
          setTimeout(() => {
            if (isMountedRef.current) {
              (setIsOpenCallback?.(show), controlledIsOpen === void 0 && setIsVisible(show));
            }
          }, 10));
      }
    };

    /* ---- Aria-describedby management ---- */
    t.useEffect(() => {
      if (tooltipId) {
        if (isVisible) {
          removeAriaDescribedBy(previousActiveAnchor);
          const existingIds = getAriaDescribedByIds(activeAnchor),
            mergedIds = [...new Set([...existingIds, tooltipId])].filter(Boolean).join(" ");
          activeAnchor?.setAttribute("aria-describedby", mergedIds);
        } else removeAriaDescribedBy(activeAnchor);
        return () => {
          removeAriaDescribedBy(activeAnchor);
          removeAriaDescribedBy(previousActiveAnchor);
        };
      }
      function getAriaDescribedByIds(element) {
        var existing;
        return (
          ((existing = element?.getAttribute("aria-describedby")) === null || existing === void 0
            ? void 0
            : existing.split(" ")) || []
        );
      }
      function removeAriaDescribedBy(element) {
        const filteredIds = getAriaDescribedByIds(element).filter((item) => item !== tooltipId);
        filteredIds.length
          ? element?.setAttribute("aria-describedby", filteredIds.join(" "))
          : element?.removeAttribute("aria-describedby");
      }
    }, [activeAnchor, isVisible, tooltipId, previousActiveAnchor]);

    /* ---- Controlled isOpen sync ---- */
    t.useEffect(() => {
      if (controlledIsOpen === void 0) return () => null;
      if (controlledIsOpen) {
        setIsRendered(!0);
      }
      const timer = setTimeout(() => {
        setIsVisible(controlledIsOpen);
      }, 10);
      return () => {
        clearTimeout(timer);
      };
    }, [controlledIsOpen]);

    /* ---- After show/hide callbacks ---- */
    t.useEffect(() => {
      if (isVisible !== prevIsVisibleRef.current)
        if ((clearTimeoutRef(transitionTimerRef), (prevIsVisibleRef.current = isVisible), isVisible)) afterShowCallback?.();
        else {
          const transitionDelay = ((rawDelay) => {
            const match = rawDelay.match(/^([\d.]+)(ms|s)$/);
            if (!match) return 0;
            const [, numStr, unit] = match;
            return Number(numStr) * (unit === "ms" ? 1 : 1e3);
          })(
            getComputedStyle(document.body).getPropertyValue(
              "--rt-transition-show-delay",
            ),
          );
          transitionTimerRef.current = setTimeout(() => {
            setIsRendered(!1);
            setImperativeData(null);
            afterHideCallback?.();
          }, transitionDelay + 25);
        }
    }, [isVisible]);

    /* ---- Position state updater (dedup) ---- */
    const updatePositionState = (newState) => {
        setPositionState((prev) => (deepEqual(prev, newState) ? prev : newState));
      },

      /* ---- Delayed show ---- */
      handleDelayedShow = (showDelay = delayShow) => {
        clearTimeoutRef(showTimerRef);
        isRendered
          ? updateIsVisible(!0)
          : (showTimerRef.current = setTimeout(() => {
              updateIsVisible(!0);
            }, showDelay));
      },

      /* ---- Delayed hide ---- */
      handleDelayedHide = (hideDelay = delayHide) => {
        clearTimeoutRef(hideTimerRef);
        hideTimerRef.current = setTimeout(() => {
          isHoveredOnTooltipRef.current || updateIsVisible(!1);
        }, hideDelay);
      },

      /* ---- Show event handler ---- */
      handleShow = (event) => {
        var currentTargetRef;
        if (!event) return;
        const anchorElement =
          (currentTargetRef = event.currentTarget) !== null && currentTargetRef !== void 0 ? currentTargetRef : event.target;
        if (!anchorElement?.isConnected)
          return (
            setActiveAnchor(null),
            void setGlobalActiveAnchor({
              current: null,
            })
          );
        delayShow ? handleDelayedShow() : updateIsVisible(!0);
        setActiveAnchor(anchorElement);
        setGlobalActiveAnchor({
          current: anchorElement,
        });
        clearTimeoutRef(hideTimerRef);
      },

      /* ---- Hide event handler ---- */
      handleHide = () => {
        isClickable ? handleDelayedHide(delayHide || 100) : delayHide ? handleDelayedHide() : updateIsVisible(!1);
        clearTimeoutRef(showTimerRef);
      },

      /* ---- Compute floating position from coordinates ---- */
      computeFloatingPosition = ({ x: xCoord, y: yCoord }) => {
        var placeRef;
        const virtualElement = {
          getBoundingClientRect: () => ({
            x: xCoord,
            y: yCoord,
            width: 0,
            height: 0,
            top: yCoord,
            left: xCoord,
            right: xCoord,
            bottom: yCoord,
          }),
        };
        computeTooltipPosition({
          place: (placeRef = imperativeData?.place) !== null && placeRef !== void 0 ? placeRef : place,
          offset: offset,
          elementReference: virtualElement,
          tooltipReference: tooltipRef.current,
          tooltipArrowReference: arrowRef.current,
          strategy: positionStrategy,
          middlewares: middlewares,
          border: borderProp,
          arrowSize: arrowSize,
        }).then((response) => {
          updatePositionState(response);
        });
      },

      /* ---- Mouse move handler (float mode) ---- */
      handleMouseMove = (event) => {
        if (!event) return;
        const mouseEvent = event,
          coords = {
            x: mouseEvent.clientX,
            y: mouseEvent.clientY,
          };
        computeFloatingPosition(coords);
        mousePositionRef.current = coords;
      },

      /* ---- Click outside handler ---- */
      handleClickOutside = (event) => {
        var tooltipNodeRef;
        if (!isVisible) return;
        const target = event.target;
        if (target.isConnected) {
          (!((tooltipNodeRef = tooltipRef.current) === null || tooltipNodeRef === void 0) && tooltipNodeRef.contains(target)) ||
            [document.querySelector(`[id='${anchorId}']`), ...extraAnchors].some((item) =>
              item?.contains(target),
            ) ||
            (updateIsVisible(!1), clearTimeoutRef(showTimerRef));
        }
      },

      /* ---- Throttled event handlers ---- */
      throttledShow = throttle(handleShow, 50),
      throttledHide = throttle(handleHide, 50),
      showWithCancelHide = (event) => {
        throttledHide.cancel();
        throttledShow(event);
      },
      hideWithCancelShow = () => {
        throttledShow.cancel();
        throttledHide();
      },

      /* ---- Main position update callback ---- */
      updateTooltipPosition = t.useCallback(() => {
        var posRef, placeRef;
        const overridePosition = (posRef = imperativeData?.position) !== null && posRef !== void 0 ? posRef : fixedPosition;
        overridePosition
          ? computeFloatingPosition(overridePosition)
          : floatMode
            ? mousePositionRef.current && computeFloatingPosition(mousePositionRef.current)
            : activeAnchor?.isConnected &&
              computeTooltipPosition({
                place: (placeRef = imperativeData?.place) !== null && placeRef !== void 0 ? placeRef : place,
                offset: offset,
                elementReference: activeAnchor,
                tooltipReference: tooltipRef.current,
                tooltipArrowReference: arrowRef.current,
                strategy: positionStrategy,
                middlewares: middlewares,
                border: borderProp,
                arrowSize: arrowSize,
              }).then((response) => {
                if (isMountedRef.current) {
                  updatePositionState(response);
                }
              });
      }, [isVisible, activeAnchor, contentProp, userStyle, place, imperativeData?.place, offset, positionStrategy, fixedPosition, imperativeData?.position, floatMode, arrowSize]);

    /* ---- Event listeners setup ---- */
    t.useEffect(() => {
      var tooltipNode, tooltipNodeCleanup;
      const allAnchorRefs = new Set(contextAnchorRefs);
      extraAnchors.forEach((item) => {
        disableTooltipFn?.(item) ||
          allAnchorRefs.add({
            current: item,
          });
      });
      const anchorByIdElement = document.querySelector(`[id='${anchorId}']`);
      if (anchorByIdElement && !disableTooltipFn?.(anchorByIdElement)) {
        allAnchorRefs.add({
          current: anchorByIdElement,
        });
      }
      const closeTooltip = () => {
          updateIsVisible(!1);
        },
        anchorScrollParent = findScrollableParent(activeAnchor),
        tooltipScrollParent = findScrollableParent(tooltipRef.current);
      if (globalCloseConfig.scroll) {
        (window.addEventListener("scroll", closeTooltip),
          anchorScrollParent?.addEventListener("scroll", closeTooltip),
          tooltipScrollParent?.addEventListener("scroll", closeTooltip));
      }
      let autoUpdateCleanup = null;
      globalCloseConfig.resize
        ? window.addEventListener("resize", closeTooltip)
        : activeAnchor &&
          tooltipRef.current &&
          (autoUpdateCleanup = Tt(activeAnchor, tooltipRef.current, updateTooltipPosition, {
            ancestorResize: !0,
            elementResize: !0,
            layoutShift: !0,
          }));
      const handleEscapeKey = (event) => {
        if (event.key === "Escape") {
          updateIsVisible(!1);
        }
      };
      if (globalCloseConfig.escape) {
        window.addEventListener("keydown", handleEscapeKey);
      }
      if (globalCloseConfig.clickOutsideAnchor) {
        window.addEventListener("click", handleClickOutside);
      }
      const eventBindings = [],
        isEventFromActiveAnchor = (event) => !!(event?.target && activeAnchor?.contains(event.target)),
        handleOpenClick = (clickEvent) => {
          (isVisible && isEventFromActiveAnchor(clickEvent)) || handleShow(clickEvent);
        },
        handleCloseClick = (clickEvent) => {
          if (isVisible && isEventFromActiveAnchor(clickEvent)) {
            handleHide();
          }
        },
        hoverEvents = [
          "mouseover",
          "mouseout",
          "mouseenter",
          "mouseleave",
          "focus",
          "blur",
        ],
        clickEvents = ["click", "dblclick", "mousedown", "mouseup"];

      /* ---- Bind open events ---- */
      Object.entries(openEventHandlers).forEach(([eventName, isEnabled]) => {
        if (isEnabled) {
          hoverEvents.includes(eventName)
            ? eventBindings.push({
                event: eventName,
                listener: showWithCancelHide,
              })
            : clickEvents.includes(eventName) &&
              eventBindings.push({
                event: eventName,
                listener: handleOpenClick,
              });
        }
      });

      /* ---- Bind close events ---- */
      Object.entries(closeEventHandlers).forEach(([eventName, isEnabled]) => {
        if (isEnabled) {
          hoverEvents.includes(eventName)
            ? eventBindings.push({
                event: eventName,
                listener: hideWithCancelShow,
              })
            : clickEvents.includes(eventName) &&
              eventBindings.push({
                event: eventName,
                listener: handleCloseClick,
              });
        }
      });

      /* ---- Float mode pointer tracking ---- */
      if (floatMode) {
        eventBindings.push({
          event: "pointermove",
          listener: handleMouseMove,
        });
      }

      /* ---- Clickable tooltip hover persistence ---- */
      const onTooltipMouseOver = () => {
          isHoveredOnTooltipRef.current = !0;
        },
        onTooltipMouseOut = () => {
          isHoveredOnTooltipRef.current = !1;
          handleHide();
        },
        shouldTrackTooltipHover = isClickable && (closeEventHandlers.mouseout || closeEventHandlers.mouseleave);
      return (
        shouldTrackTooltipHover &&
          ((tooltipNode = tooltipRef.current) === null ||
            tooltipNode === void 0 ||
            tooltipNode.addEventListener("mouseover", onTooltipMouseOver),
          (tooltipNodeCleanup = tooltipRef.current) === null ||
            tooltipNodeCleanup === void 0 ||
            tooltipNodeCleanup.addEventListener("mouseout", onTooltipMouseOut)),
        eventBindings.forEach(({ event: eventName, listener: handler }) => {
          allAnchorRefs.forEach((item) => {
            var anchorNode;
            (anchorNode = item.current) === null ||
              anchorNode === void 0 ||
              anchorNode.addEventListener(eventName, handler);
          });
        }),
        () => {
          var cleanupTooltipNode, cleanupTooltipNodeAlt;
          if (globalCloseConfig.scroll) {
            (window.removeEventListener("scroll", closeTooltip),
              anchorScrollParent?.removeEventListener("scroll", closeTooltip),
              tooltipScrollParent?.removeEventListener("scroll", closeTooltip));
          }
          globalCloseConfig.resize ? window.removeEventListener("resize", closeTooltip) : autoUpdateCleanup?.();
          if (globalCloseConfig.clickOutsideAnchor) {
            window.removeEventListener("click", handleClickOutside);
          }
          if (globalCloseConfig.escape) {
            window.removeEventListener("keydown", handleEscapeKey);
          }
          if (shouldTrackTooltipHover) {
            ((cleanupTooltipNode = tooltipRef.current) === null ||
              cleanupTooltipNode === void 0 ||
              cleanupTooltipNode.removeEventListener("mouseover", onTooltipMouseOver),
              (cleanupTooltipNodeAlt = tooltipRef.current) === null ||
                cleanupTooltipNodeAlt === void 0 ||
                cleanupTooltipNodeAlt.removeEventListener("mouseout", onTooltipMouseOut));
          }
          eventBindings.forEach(({ event: eventName, listener: handler }) => {
            allAnchorRefs.forEach((item) => {
              var anchorNode;
              (anchorNode = item.current) === null ||
                anchorNode === void 0 ||
                anchorNode.removeEventListener(eventName, handler);
            });
          });
        }
      );
    }, [activeAnchor, updateTooltipPosition, isRendered, contextAnchorRefs, extraAnchors, customOpenEvents, customCloseEvents, customGlobalCloseEvents, isClickTrigger, delayShow, delayHide]);

    /* ---- MutationObserver for dynamic anchors ---- */
    t.useEffect(() => {
      var selectorOverrideRef, selectorRef;
      let selector =
        (selectorRef = (selectorOverrideRef = imperativeData?.anchorSelect) !== null && selectorOverrideRef !== void 0 ? selectorOverrideRef : anchorSelect) !== null &&
        selectorRef !== void 0
          ? selectorRef
          : "";
      if (!selector && tooltipId) {
        selector = `[data-tooltip-id='${tooltipId.replace(/'/g, "\\'")}']`;
      }
      const observer = new MutationObserver((mutations) => {
        const addedElements = [],
          removedElements = [];
        mutations.forEach((props) => {
          if (
            (props.type === "attributes" &&
              props.attributeName === "data-tooltip-id" &&
              (props.target.getAttribute("data-tooltip-id") === tooltipId
                ? addedElements.push(props.target)
                : props.oldValue === tooltipId && removedElements.push(props.target)),
            props.type === "childList")
          ) {
            if (activeAnchor) {
              const removedNodes = [...props.removedNodes].filter(
                (item) => item.nodeType === 1,
              );
              if (selector)
                try {
                  removedElements.push(...removedNodes.filter((item) => item.matches(selector)));
                  removedElements.push(...removedNodes.flatMap((item) => [...item.querySelectorAll(selector)]));
                } catch {}
              removedNodes.some((item) => {
                var containsFn;
                return (
                  !!(
                    !((containsFn = item?.contains) === null || containsFn === void 0) &&
                    containsFn.call(item, activeAnchor)
                  ) && (setIsRendered(!1), updateIsVisible(!1), setActiveAnchor(null), clearTimeoutRef(showTimerRef), clearTimeoutRef(hideTimerRef), !0)
                );
              });
            }
            if (selector)
              try {
                const addedNodes = [...props.addedNodes].filter(
                  (item) => item.nodeType === 1,
                );
                addedElements.push(...addedNodes.filter((item) => item.matches(selector)));
                addedElements.push(...addedNodes.flatMap((item) => [...item.querySelectorAll(selector)]));
              } catch {}
          }
        });
        if (addedElements.length || removedElements.length) {
          setExtraAnchors((currentAnchors) => [...currentAnchors.filter((item) => !removedElements.includes(item)), ...addedElements]);
        }
      });
      return (
        observer.observe(document.body, {
          childList: !0,
          subtree: !0,
          attributes: !0,
          attributeFilter: ["data-tooltip-id"],
          attributeOldValue: !0,
        }),
        () => {
          observer.disconnect();
        }
      );
    }, [tooltipId, anchorSelect, imperativeData?.anchorSelect, activeAnchor]);

    /* ---- Trigger position update on dependency changes ---- */
    t.useEffect(() => {
      updateTooltipPosition();
    }, [updateTooltipPosition]);

    /* ---- Content wrapper resize observer ---- */
    t.useEffect(() => {
      if (!contentWrapperRef?.current) return () => null;
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => updateTooltipPosition());
      });
      return (
        resizeObserver.observe(contentWrapperRef.current),
        () => {
          resizeObserver.disconnect();
        }
      );
    }, [contentProp, contentWrapperRef?.current]);

    /* ---- Active anchor fallback ---- */
    t.useEffect(() => {
      var fallbackAnchor;
      const anchorByIdEl = document.querySelector(`[id='${anchorId}']`),
        allAnchors = [...extraAnchors, anchorByIdEl];
      (activeAnchor && allAnchors.includes(activeAnchor)) || setActiveAnchor((fallbackAnchor = extraAnchors[0]) !== null && fallbackAnchor !== void 0 ? fallbackAnchor : anchorByIdEl);
    }, [anchorId, extraAnchors, activeAnchor]);

    /* ---- Default open and cleanup ---- */
    t.useEffect(
      () => (
        defaultIsOpen && updateIsVisible(!0),
        () => {
          clearTimeoutRef(showTimerRef);
          clearTimeoutRef(hideTimerRef);
        }
      ),
      [],
    );

    /* ---- Query selector anchors ---- */
    t.useEffect(() => {
      var selectorOverride;
      let selector = (selectorOverride = imperativeData?.anchorSelect) !== null && selectorOverride !== void 0 ? selectorOverride : anchorSelect;
      if ((!selector && tooltipId && (selector = `[data-tooltip-id='${tooltipId.replace(/'/g, "\\'")}']`), selector))
        try {
          const matchedElements = Array.from(document.querySelectorAll(selector));
          setExtraAnchors(matchedElements);
        } catch {
          setExtraAnchors([]);
        }
    }, [tooltipId, anchorSelect, imperativeData?.anchorSelect]);

    /* ---- Delay show change ---- */
    t.useEffect(() => {
      if (showTimerRef.current) {
        (clearTimeoutRef(showTimerRef), handleDelayedShow(delayShow));
      }
    }, [delayShow]);

    /* ---- Final content and visibility ---- */
    const resolvedContent = (imperativeContentRef = imperativeData?.content) !== null && imperativeContentRef !== void 0 ? imperativeContentRef : contentProp,
      isFullyVisible = isVisible && Object.keys(positionState.tooltipStyles).length > 0;
    return (
      /* ---- Imperative handle ---- */
      t.useImperativeHandle(forwardedRef, () => ({
        open: (options) => {
          if (options?.anchorSelect)
            try {
              document.querySelector(options.anchorSelect);
            } catch {
              return void console.warn(
                `[react-tooltip] "${options.anchorSelect}" is not a valid CSS selector`,
              );
            }
          setImperativeData(options ?? null);
          options?.delay ? handleDelayedShow(options.delay) : updateIsVisible(!0);
        },
        close: (options) => {
          options?.delay ? handleDelayedHide(options.delay) : updateIsVisible(!1);
        },
        activeAnchor: activeAnchor,
        place: positionState.place,
        isOpen: !!(isRendered && !isHidden && resolvedContent && isFullyVisible),
      })),

      /* ---- Render ---- */
      isRendered && !isHidden && resolvedContent
        ? ae.createElement(
            WrapperTag,
            {
              id: tooltipId,
              role: roleProp,
              className: ot(
                "react-tooltip",
                ke.tooltip,
                tt.tooltip,
                tt[variant],
                className,
                `react-tooltip__place-${positionState.place}`,
                ke[isFullyVisible ? "show" : "closing"],
                isFullyVisible ? "react-tooltip__show" : "react-tooltip__closing",
                positionStrategy === "fixed" && ke.fixed,
                isClickable && ke.clickable,
              ),
              onTransitionEnd: (transitionEvent) => {
                clearTimeoutRef(transitionTimerRef);
                isVisible || transitionEvent.propertyName !== "opacity" || (setIsRendered(!1), setImperativeData(null), afterHideCallback?.());
              },
              style: {
                ...userStyle,
                ...positionState.tooltipStyles,
                opacity: opacityProp !== void 0 && isFullyVisible ? opacityProp : void 0,
              },
              ref: tooltipRef,
            },
            resolvedContent,
            ae.createElement(WrapperTag, {
              className: ot(
                "react-tooltip-arrow",
                ke.arrow,
                tt.arrow,
                classNameArrow,
                noArrow && ke.noArrow,
              ),
              style: {
                ...positionState.tooltipArrowStyles,
                background: arrowColor
                  ? `linear-gradient(to right bottom, transparent 50%, ${arrowColor} 50%)`
                  : void 0,
                "--rt-arrow-size": `${arrowSize}px`,
              },
              ref: arrowRef,
            }),
          )
        : null
    );
  },

  /* ---- Dangerous HTML Renderer ---- */
  Pt = ({ content: htmlContent }) =>
    ae.createElement("span", {
      dangerouslySetInnerHTML: {
        __html: htmlContent,
      },
    }),

  /* ---- Main Tooltip Wrapper Component ---- */
  Vt = ae.forwardRef(
    (
      {
        id: tooltipId,
        anchorId: anchorId,
        anchorSelect: anchorSelect,
        content: contentProp,
        html: htmlProp,
        render: renderFn,
        className: classNameProp,
        classNameArrow: classNameArrowProp,
        variant: variantProp = "dark",
        place: placeProp = "top",
        offset: offsetProp = 10,
        wrapper: wrapperProp = "div",
        children: childrenProp = null,
        events: eventsProp = ["hover"],
        openOnClick: openOnClickProp = !1,
        positionStrategy: positionStrategyProp = "absolute",
        middlewares: middlewaresProp,
        delayShow: delayShowProp = 0,
        delayHide: delayHideProp = 0,
        float: floatProp = !1,
        hidden: hiddenProp = !1,
        noArrow: noArrowProp = !1,
        clickable: clickableProp = !1,
        closeOnEsc: closeOnEscProp = !1,
        closeOnScroll: closeOnScrollProp = !1,
        closeOnResize: closeOnResizeProp = !1,
        openEvents: openEventsProp,
        closeEvents: closeEventsProp,
        globalCloseEvents: globalCloseEventsProp,
        imperativeModeOnly: imperativeModeProp = !1,
        style: styleProp,
        position: positionProp,
        isOpen: isOpenProp,
        defaultIsOpen: defaultIsOpenProp = !1,
        disableStyleInjection: disableStyleInjectionProp = !1,
        border: borderProp,
        opacity: opacityProp,
        arrowColor: arrowColorProp,
        arrowSize: arrowSizeProp,
        setIsOpen: setIsOpenProp,
        afterShow: afterShowProp,
        afterHide: afterHideProp,
        disableTooltip: disableTooltipProp,
        role: roleProp = "tooltip",
      },
      forwardedRef,
    ) => {
      const [computedContent, setComputedContent] = t.useState(contentProp),
        [computedHtml, setComputedHtml] = t.useState(htmlProp),
        [computedPlace, setComputedPlace] = t.useState(placeProp),
        [computedVariant, setComputedVariant] = t.useState(variantProp),
        [computedOffset, setComputedOffset] = t.useState(offsetProp),
        [computedDelayShow, setComputedDelayShow] = t.useState(delayShowProp),
        [computedDelayHide, setComputedDelayHide] = t.useState(delayHideProp),
        [computedFloat, setComputedFloat] = t.useState(floatProp),
        [computedHidden, setComputedHidden] = t.useState(hiddenProp),
        [computedWrapper, setComputedWrapper] = t.useState(wrapperProp),
        [computedEvents, setComputedEvents] = t.useState(eventsProp),
        [computedPositionStrategy, setComputedPositionStrategy] = t.useState(positionStrategyProp),
        [dataAttrClassName, setDataAttrClassName] = t.useState(null),
        [currentActiveAnchor, setCurrentActiveAnchor] = t.useState(null),
        previousActiveAnchorRef = t.useRef(null),
        disableStyleInjectionRef = t.useRef(disableStyleInjectionProp),
        { anchorRefs: contextAnchorRefs, activeAnchor: contextActiveAnchor } = bt(tooltipId),

        /* ---- Extract data-tooltip-* attributes ---- */
        getDataAttributes = (element) =>
          element?.getAttributeNames().reduce((attrs, attrName) => {
            var attrValue;
            return (
              attrName.startsWith("data-tooltip-") &&
                (attrs[attrName.replace(/^data-tooltip-/, "")] =
                  (attrValue = element?.getAttribute(attrName)) !== null && attrValue !== void 0 ? attrValue : null),
              attrs
            );
          }, {}),

        /* ---- Sync state from data attributes ---- */
        updateFromDataAttributes = (dataAttrs) => {
          const attributeHandlers = {
            place: (val) => {
              var resolved;
              setComputedPlace((resolved = val) !== null && resolved !== void 0 ? resolved : placeProp);
            },
            content: (val) => {
              setComputedContent(val ?? contentProp);
            },
            html: (val) => {
              setComputedHtml(val ?? htmlProp);
            },
            variant: (val) => {
              var resolved;
              setComputedVariant((resolved = val) !== null && resolved !== void 0 ? resolved : variantProp);
            },
            offset: (val) => {
              setComputedOffset(val === null ? offsetProp : Number(val));
            },
            wrapper: (val) => {
              var resolved;
              setComputedWrapper((resolved = val) !== null && resolved !== void 0 ? resolved : wrapperProp);
            },
            events: (val) => {
              const parsed = val?.split(" ");
              setComputedEvents(parsed ?? eventsProp);
            },
            "position-strategy": (val) => {
              var resolved;
              setComputedPositionStrategy((resolved = val) !== null && resolved !== void 0 ? resolved : positionStrategyProp);
            },
            "delay-show": (val) => {
              setComputedDelayShow(val === null ? delayShowProp : Number(val));
            },
            "delay-hide": (val) => {
              setComputedDelayHide(val === null ? delayHideProp : Number(val));
            },
            float: (val) => {
              setComputedFloat(val === null ? floatProp : val === "true");
            },
            hidden: (val) => {
              setComputedHidden(val === null ? hiddenProp : val === "true");
            },
            "class-name": (val) => {
              setDataAttrClassName(val);
            },
          };
          Object.values(attributeHandlers).forEach((item) => item(null));
          Object.entries(dataAttrs).forEach(([key, val]) => {
            var handler;
            (handler = attributeHandlers[key]) === null || handler === void 0 || handler.call(attributeHandlers, val);
          });
        };

      /* ---- Prop sync effects ---- */
      t.useEffect(() => {
        setComputedContent(contentProp);
      }, [contentProp]);
      t.useEffect(() => {
        setComputedHtml(htmlProp);
      }, [htmlProp]);
      t.useEffect(() => {
        setComputedPlace(placeProp);
      }, [placeProp]);
      t.useEffect(() => {
        setComputedVariant(variantProp);
      }, [variantProp]);
      t.useEffect(() => {
        setComputedOffset(offsetProp);
      }, [offsetProp]);
      t.useEffect(() => {
        setComputedDelayShow(delayShowProp);
      }, [delayShowProp]);
      t.useEffect(() => {
        setComputedDelayHide(delayHideProp);
      }, [delayHideProp]);
      t.useEffect(() => {
        setComputedFloat(floatProp);
      }, [floatProp]);
      t.useEffect(() => {
        setComputedHidden(hiddenProp);
      }, [hiddenProp]);
      t.useEffect(() => {
        setComputedPositionStrategy(positionStrategyProp);
      }, [positionStrategyProp]);

      /* ---- Style injection warning ---- */
      t.useEffect(() => {
        if (disableStyleInjectionRef.current !== disableStyleInjectionProp) {
          console.warn(
            "[react-tooltip] Do not change `disableStyleInjection` dynamically.",
          );
        }
      }, [disableStyleInjectionProp]);

      /* ---- Dispatch style injection event ---- */
      t.useEffect(() => {
        if (typeof window < "u") {
          window.dispatchEvent(
            new CustomEvent("react-tooltip-inject-styles", {
              detail: {
                disableCore: disableStyleInjectionProp === "core",
                disableBase: disableStyleInjectionProp,
              },
            }),
          );
        }
      }, []);

      /* ---- Data attribute observer ---- */
      t.useEffect(() => {
        var activeAnchorFallback;
        const allRefs = new Set(contextAnchorRefs);
        let selector = anchorSelect;
        if (
          (!selector && tooltipId && (selector = `[data-tooltip-id='${tooltipId.replace(/'/g, "\\'")}']`), selector)
        )
          try {
            document.querySelectorAll(selector).forEach((item) => {
              allRefs.add({
                current: item,
              });
            });
          } catch {
            console.warn(`[react-tooltip] "${selector}" is not a valid CSS selector`);
          }
        const anchorByIdElement = document.querySelector(`[id='${anchorId}']`);
        if (
          (anchorByIdElement &&
            allRefs.add({
              current: anchorByIdElement,
            }),
          !allRefs.size)
        )
          return () => null;
        const resolvedActiveAnchor = (activeAnchorFallback = currentActiveAnchor ?? anchorByIdElement) !== null && activeAnchorFallback !== void 0 ? activeAnchorFallback : contextActiveAnchor.current,
          attrObserver = new MutationObserver((mutations) => {
            mutations.forEach((props) => {
              var attrName;
              if (
                !resolvedActiveAnchor ||
                props.type !== "attributes" ||
                !(
                  !((attrName = props.attributeName) === null || attrName === void 0) &&
                  attrName.startsWith("data-tooltip-")
                )
              )
                return;
              const attrs = getDataAttributes(resolvedActiveAnchor);
              updateFromDataAttributes(attrs);
            });
          }),
          observerConfig = {
            attributes: !0,
            childList: !1,
            subtree: !1,
          };
        if (resolvedActiveAnchor) {
          const attrs = getDataAttributes(resolvedActiveAnchor);
          updateFromDataAttributes(attrs);
          attrObserver.observe(resolvedActiveAnchor, observerConfig);
        }
        return () => {
          attrObserver.disconnect();
        };
      }, [contextAnchorRefs, contextActiveAnchor, currentActiveAnchor, anchorId, anchorSelect]);

      /* ---- Style validation warnings ---- */
      t.useEffect(() => {
        if (styleProp?.border) {
          console.warn(
            "[react-tooltip] Do not set `style.border`. Use `border` prop instead.",
          );
        }
        if (borderProp && !cssSupportsCheck("border", `${borderProp}`)) {
          console.warn(`[react-tooltip] "${borderProp}" is not a valid \`border\`.`);
        }
        if (styleProp?.opacity) {
          console.warn(
            "[react-tooltip] Do not set `style.opacity`. Use `opacity` prop instead.",
          );
        }
        if (opacityProp && !cssSupportsCheck("opacity", `${opacityProp}`)) {
          console.warn(`[react-tooltip] "${opacityProp}" is not a valid \`opacity\`.`);
        }
      }, []);

      /* ---- Resolve content ---- */
      let resolvedChildren = childrenProp;
      const contentWrapperRef = t.useRef(null);
      if (renderFn) {
        const rendered = renderFn({
          content: currentActiveAnchor?.getAttribute("data-tooltip-content") || computedContent || null,
          activeAnchor: currentActiveAnchor,
        });
        resolvedChildren = rendered
          ? ae.createElement(
              "div",
              {
                ref: contentWrapperRef,
                className: "react-tooltip-content-wrapper",
              },
              rendered,
            )
          : null;
      } else if (computedContent) {
        resolvedChildren = computedContent;
      }
      if (computedHtml) {
        resolvedChildren = ae.createElement(Pt, {
          content: computedHtml,
        });
      }

      /* ---- Build controller props ---- */
      const controllerProps = {
        forwardRef: forwardedRef,
        id: tooltipId,
        anchorId: anchorId,
        anchorSelect: anchorSelect,
        className: ot(classNameProp, dataAttrClassName),
        classNameArrow: classNameArrowProp,
        content: resolvedChildren,
        contentWrapperRef: contentWrapperRef,
        place: computedPlace,
        variant: computedVariant,
        offset: computedOffset,
        wrapper: computedWrapper,
        events: computedEvents,
        openOnClick: openOnClickProp,
        positionStrategy: computedPositionStrategy,
        middlewares: middlewaresProp,
        delayShow: computedDelayShow,
        delayHide: computedDelayHide,
        float: computedFloat,
        hidden: computedHidden,
        noArrow: noArrowProp,
        clickable: clickableProp,
        closeOnEsc: closeOnEscProp,
        closeOnScroll: closeOnScrollProp,
        closeOnResize: closeOnResizeProp,
        openEvents: openEventsProp,
        closeEvents: closeEventsProp,
        globalCloseEvents: globalCloseEventsProp,
        imperativeModeOnly: imperativeModeProp,
        style: styleProp,
        position: positionProp,
        isOpen: isOpenProp,
        defaultIsOpen: defaultIsOpenProp,
        border: borderProp,
        opacity: opacityProp,
        arrowColor: arrowColorProp,
        arrowSize: arrowSizeProp,
        setIsOpen: setIsOpenProp,
        afterShow: afterShowProp,
        afterHide: afterHideProp,
        disableTooltip: disableTooltipProp,
        activeAnchor: currentActiveAnchor,
        previousActiveAnchor: previousActiveAnchorRef.current,
        setActiveAnchor: (element) => {
          setCurrentActiveAnchor((prev) => (element?.isSameNode(prev) || (previousActiveAnchorRef.current = prev), element));
        },
        role: roleProp,
      };
      return ae.createElement(Ht, {
        ...controllerProps,
      });
    },
  );

/* ---- Global Style Injection Listener ---- */
if (typeof window < "u") {
  window.addEventListener("react-tooltip-inject-styles", (event) => {
    event.detail.disableCore ||
      injectStyles({
        css: ":root{--rt-color-white:#fff;--rt-color-dark:#222;--rt-color-success:#8dc572;--rt-color-error:#be6464;--rt-color-warning:#f0ad4e;--rt-color-info:#337ab7;--rt-opacity:0.9;--rt-transition-show-delay:0.15s;--rt-transition-closing-delay:0.15s;--rt-arrow-size:8px}.core-styles-module_tooltip__3vRRp{position:absolute;top:0;left:0;pointer-events:none;opacity:0;will-change:opacity}.core-styles-module_fixed__pcSol{position:fixed}.core-styles-module_arrow__cvMwQ{position:absolute;background:inherit;z-index:-1}.core-styles-module_noArrow__xock6{display:none}.core-styles-module_clickable__ZuTTB{pointer-events:auto}.core-styles-module_show__Nt9eE{opacity:var(--rt-opacity);transition:opacity var(--rt-transition-show-delay)ease-out}.core-styles-module_closing__sGnxF{opacity:0;transition:opacity var(--rt-transition-closing-delay)ease-in}",
        type: "core",
      });
    event.detail.disableBase ||
      injectStyles({
        css: `
.styles-module_tooltip__mnnfp{padding:8px 16px;border-radius:3px;font-size:90%;width:max-content}.styles-module_arrow__K0L3T{width:var(--rt-arrow-size);height:var(--rt-arrow-size)}[class*='react-tooltip__place-top']>.styles-module_arrow__K0L3T{transform:rotate(45deg)}[class*='react-tooltip__place-right']>.styles-module_arrow__K0L3T{transform:rotate(135deg)}[class*='react-tooltip__place-bottom']>.styles-module_arrow__K0L3T{transform:rotate(225deg)}[class*='react-tooltip__place-left']>.styles-module_arrow__K0L3T{transform:rotate(315deg)}.styles-module_dark__xNqje{background:var(--rt-color-dark);color:var(--rt-color-white)}.styles-module_light__Z6W-X{background-color:var(--rt-color-white);color:var(--rt-color-dark)}.styles-module_success__A2AKt{background-color:var(--rt-color-success);color:var(--rt-color-white)}.styles-module_warning__SCK0X{background-color:var(--rt-color-warning);color:var(--rt-color-white)}.styles-module_error__JvumD{background-color:var(--rt-color-error);color:var(--rt-color-white)}.styles-module_info__BWdHW{background-color:var(--rt-color-info);color:var(--rt-color-white)}`,
        type: "base",
      });
  });
}

/* ---- Custom Theme Variables ---- */
const Xt = `
:root {
  --rt-color-white: #fff;
  --rt-color-dark: var(--color-gray-800) !important;
  --rt-color-success: var(--color-success-darker) !important;
  --rt-color-error: var(--color-error-darker) !important;
  --rt-color-warning: var(--color-warning-darker) !important;
  --rt-color-info: var(--color-info-darker) !important;
  --rt-opacity: 1;
  --rt-transition-show-delay: 0.15s;
  --rt-transition-closing-delay: 0.15s;
}

:root.dark {
  --rt-color-white: var(--color-dark-50) !important;
  --rt-color-dark: var(--color-dark-500) !important;
}`,
  _t = kt();
xt(_t, Xt);
Ot(_t);

/* ---- Default Tooltip Export ---- */
function Ut() {
  return Rt.jsx(Vt, {
    anchorSelect: "[data-tooltip]",
    opacity: 1,
    style: {
      padding: "0.3rem 0.75rem",
      borderRadius: "0.5rem",
      zIndex: 1e3,
    },
  });
}
export { Ut as default };
