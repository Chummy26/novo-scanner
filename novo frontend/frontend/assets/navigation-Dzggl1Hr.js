/* ---- Imports ---- */
import {
  aq as ie,
  ar as re,
  j as B,
  as as se,
  at as le,
  a as d,
} from "./index-Bx06KCE-.js";

/* ---- Accordion Panel Component ---- */
const Ve = (props) => {
  const {
      children: childContent,
      className: cssClass,
      collapseProps: collapseConfig,
      ...restProps
    } = props,
    accordionContext = ie(),
    { value: itemValue } = re(),
    isOpen = accordionContext.isItemActive(itemValue);
  return B.jsx(se, {
    ...collapseConfig,
    in: isOpen,
    transitionDuration: accordionContext.transitionDuration,
    role: "panel",
    id: `${accordionContext.panelId}-${itemValue}`,
    "aria-labelledby": `${accordionContext.buttonId}-${itemValue}`,
    children: B.jsx("div", {
      className:
        typeof cssClass == "function"
          ? cssClass({
              open: isOpen,
            })
          : cssClass,
      ...restProps,
      children:
        typeof childContent == "function"
          ? childContent({
              open: isOpen,
            })
          : childContent,
    }),
  });
};

/* ---- Route Matching Utility ---- */
function Ie(routePath, currentLocation) {
  return routePath
    ? !!le(
        {
          path: routePath,
          end: false,
        },
        currentLocation,
      )
    : false;
}

/* ---- Type Checking Utilities ---- */
function _(value) {
  var valueType = typeof value;
  return value != null && (valueType == "object" || valueType == "function");
}

/* ---- Global Object Detection ---- */
var globalObject =
    typeof global == "object" && global && global.Object === Object && global,
  selfObject =
    typeof self == "object" && self && self.Object === Object && self,
  root = globalObject || selfObject || Function("return this")(),
  dateNow = function () {
    return root.Date.now();
  },
  reTrimEnd = /\s/;

/* ---- String Trimming Utilities ---- */
function trimmedEndIndex(str) {
  for (var index = str.length; index-- && reTrimEnd.test(str.charAt(index)); );
  return index;
}

var reTrimStart = /^\s+/;

function baseTrim(str) {
  return str && str.slice(0, trimmedEndIndex(str) + 1).replace(reTrimStart, "");
}

/* ---- Symbol and Tag Utilities ---- */
var NativeSymbol = root.Symbol,
  objectProto = Object.prototype,
  hasOwnProperty = objectProto.hasOwnProperty,
  nativeObjectToString = objectProto.toString,
  symToStringTag = NativeSymbol ? NativeSymbol.toStringTag : undefined;

function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
    tag = value[symToStringTag];
  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch {}
  var result = nativeObjectToString.call(value);
  return (
    unmasked &&
      (isOwn ? (value[symToStringTag] = tag) : delete value[symToStringTag]),
    result
  );
}

var objectProtoForToString = Object.prototype,
  objectToString = objectProtoForToString.toString;

function baseObjectToString(value) {
  return objectToString.call(value);
}

/* ---- Base Get Tag ---- */
var nullTag = "[object Null]",
  undefinedTag = "[object Undefined]",
  symToStringTagForGetTag = NativeSymbol ? NativeSymbol.toStringTag : undefined;

function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  if (symToStringTagForGetTag && symToStringTagForGetTag in Object(value)) {
    return getRawTag(value);
  }
  return baseObjectToString(value);
}

/* ---- Object Type Checking ---- */
function isObjectLike(value) {
  return value != null && typeof value == "object";
}

var symbolTag = "[object Symbol]";

function isSymbol(value) {
  return (
    typeof value == "symbol" ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag)
  );
}

/* ---- Number Conversion ---- */
var NAN = NaN,
  reIsBadHex = /^[-+]0x[0-9a-f]+$/i,
  reIsBinary = /^0b[01]+$/i,
  reIsOctal = /^0o[0-7]+$/i,
  nativeParseInt = parseInt;

function toNumber(value) {
  if (typeof value == "number") return value;
  if (isSymbol(value)) return NAN;
  if (_(value)) {
    var other = typeof value.valueOf == "function" ? value.valueOf() : value;
    value = _(other) ? other + "" : other;
  }
  if (typeof value != "string") return value === 0 ? value : +value;
  value = baseTrim(value);
  var isBinary = reIsBinary.test(value);
  if (isBinary || reIsOctal.test(value)) {
    return nativeParseInt(value.slice(2), isBinary ? 2 : 8);
  }
  if (reIsBadHex.test(value)) {
    return NAN;
  }
  return +value;
}

/* ---- Debounce Function ---- */
var FUNC_ERROR_TEXT = "Expected a function",
  nativeMax = Math.max,
  nativeMin = Math.min;

function debounce(func, wait, options) {
  var lastArgs,
    lastThis,
    maxWait,
    result,
    timerId,
    lastCallTime,
    lastInvokeTime = 0,
    leading = false,
    maxing = false,
    trailing = true;
  if (typeof func != "function") throw new TypeError(FUNC_ERROR_TEXT);
  wait = toNumber(wait) || 0;
  if (_(options)) {
    ((leading = !!options.leading),
      (maxing = "maxWait" in options),
      (maxWait = maxing
        ? nativeMax(toNumber(options.maxWait) || 0, wait)
        : maxWait),
      (trailing = "trailing" in options ? !!options.trailing : trailing));
  }
  function invokeFunc(time) {
    var args = lastArgs,
      thisArg = lastThis;
    return (
      (lastArgs = lastThis = undefined),
      (lastInvokeTime = time),
      (result = func.apply(thisArg, args)),
      result
    );
  }
  function leadingEdge(time) {
    return (
      (lastInvokeTime = time),
      (timerId = setTimeout(timerExpired, wait)),
      leading ? invokeFunc(time) : result
    );
  }
  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
      timeSinceLastInvoke = time - lastInvokeTime,
      timeWaiting = wait - timeSinceLastCall;
    return maxing
      ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }
  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
      timeSinceLastInvoke = time - lastInvokeTime;
    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWait)
    );
  }
  function timerExpired() {
    var time = dateNow();
    if (shouldInvoke(time)) return trailingEdge(time);
    timerId = setTimeout(timerExpired, remainingWait(time));
  }
  function trailingEdge(time) {
    return (
      (timerId = undefined),
      trailing && lastArgs
        ? invokeFunc(time)
        : ((lastArgs = lastThis = undefined), result)
    );
  }
  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }
  function flush() {
    return timerId === undefined ? result : trailingEdge(dateNow());
  }
  function debounced() {
    var time = dateNow(),
      isInvoking = shouldInvoke(time);
    if (
      ((lastArgs = arguments),
      (lastThis = this),
      (lastCallTime = time),
      isInvoking)
    ) {
      if (timerId === undefined) return leadingEdge(lastCallTime);
      if (maxing)
        return (
          clearTimeout(timerId),
          (timerId = setTimeout(timerExpired, wait)),
          invokeFunc(lastCallTime)
        );
    }
    return (
      timerId === undefined && (timerId = setTimeout(timerExpired, wait)),
      result
    );
  }
  return ((debounced.cancel = cancel), (debounced.flush = flush), debounced);
}

/* ---- Throttle Function ---- */
var THROTTLE_FUNC_ERROR_TEXT = "Expected a function";

function throttle(func, wait, options) {
  var leading = true,
    trailing = true;
  if (typeof func != "function") throw new TypeError(THROTTLE_FUNC_ERROR_TEXT);
  return (
    _(options) &&
      ((leading = "leading" in options ? !!options.leading : leading),
      (trailing = "trailing" in options ? !!options.trailing : trailing)),
    debounce(func, wait, {
      leading: leading,
      maxWait: wait,
      trailing: trailing,
    })
  );
}

/* ---- Object Assign Polyfill ---- */
var assign = function () {
  return (
    (assign =
      Object.assign ||
      function (target) {
        for (
          var source, index = 1, length = arguments.length;
          index < length;
          index++
        ) {
          source = arguments[index];
          for (var key in source)
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
        }
        return target;
      }),
    assign.apply(this, arguments)
  );
};

/* ---- DOM Helper Functions ---- */
function getElementWindow(element) {
  return !element ||
    !element.ownerDocument ||
    !element.ownerDocument.defaultView
    ? window
    : element.ownerDocument.defaultView;
}

function getElementDocument(element) {
  return !element || !element.ownerDocument ? document : element.ownerDocument;
}

var getOptions = function (attributes) {
  var result = {},
    parsed = Array.prototype.reduce.call(
      attributes,
      function (accumulator, attr) {
        var match = attr.name.match(/data-simplebar-(.+)/);
        if (match) {
          var camelCaseKey = match[1].replace(
            /\W+(.)/g,
            function (fullMatch, letter) {
              return letter.toUpperCase();
            },
          );
          switch (attr.value) {
            case "true":
              accumulator[camelCaseKey] = true;
              break;
            case "false":
              accumulator[camelCaseKey] = false;
              break;
            case undefined:
              accumulator[camelCaseKey] = true;
              break;
            default:
              accumulator[camelCaseKey] = attr.value;
          }
        }
        return accumulator;
      },
      result,
    );
  return parsed;
};

function addClasses(element, classNames) {
  var classList;
  if (element) {
    (classList = element.classList).add.apply(classList, classNames.split(" "));
  }
}

function removeClasses(element, classNames) {
  if (element) {
    classNames.split(" ").forEach(function (item) {
      element.classList.remove(item);
    });
  }
}

function classNamesToQuery(classNames) {
  return ".".concat(classNames.split(" ").join("."));
}

/* ---- DOM Feature Detection ---- */
var canUseDOM = !!(
    typeof window < "u" &&
    window.document &&
    window.document.createElement
  ),
  helpers = Object.freeze({
    __proto__: null,
    addClasses: addClasses,
    canUseDOM: canUseDOM,
    classNamesToQuery: classNamesToQuery,
    getElementDocument: getElementDocument,
    getElementWindow: getElementWindow,
    getOptions: getOptions,
    removeClasses: removeClasses,
  }),
  cachedScrollbarWidth = null,
  cachedDevicePixelRatio = null;

if (canUseDOM) {
  window.addEventListener("resize", function () {
    if (cachedDevicePixelRatio !== window.devicePixelRatio) {
      ((cachedDevicePixelRatio = window.devicePixelRatio),
        (cachedScrollbarWidth = null));
    }
  });
}

/* ---- Scrollbar Width Measurement ---- */
function getScrollbarWidth() {
  if (cachedScrollbarWidth === null) {
    if (typeof document > "u")
      return ((cachedScrollbarWidth = 0), cachedScrollbarWidth);
    var body = document.body,
      testDiv = document.createElement("div");
    testDiv.classList.add("simplebar-hide-scrollbar");
    body.appendChild(testDiv);
    var scrollbarRight = testDiv.getBoundingClientRect().right;
    body.removeChild(testDiv);
    cachedScrollbarWidth = scrollbarRight;
  }
  return cachedScrollbarWidth;
}

/* ---- SimpleBar Aliases ---- */
var w = getElementWindow,
  V = getElementDocument,
  Le = getOptions,
  A = addClasses,
  W = removeClasses,
  g = classNamesToQuery,
  /* ---- SimpleBar Core Class ---- */
  SimpleBar = (function () {
    function SimpleBarConstructor(element, options) {
      if (options === undefined) {
        options = {};
      }
      var self = this;
      if (
        ((this.removePreventClickId = null),
        (this.minScrollbarWidth = 20),
        (this.stopScrollDelay = 175),
        (this.isScrolling = false),
        (this.isMouseEntering = false),
        (this.isDragging = false),
        (this.scrollXTicking = false),
        (this.scrollYTicking = false),
        (this.wrapperEl = null),
        (this.contentWrapperEl = null),
        (this.contentEl = null),
        (this.offsetEl = null),
        (this.maskEl = null),
        (this.placeholderEl = null),
        (this.heightAutoObserverWrapperEl = null),
        (this.heightAutoObserverEl = null),
        (this.rtlHelpers = null),
        (this.scrollbarWidth = 0),
        (this.resizeObserver = null),
        (this.mutationObserver = null),
        (this.elStyles = null),
        (this.isRtl = null),
        (this.mouseX = 0),
        (this.mouseY = 0),
        (this.onMouseMove = function () {}),
        (this.onWindowResize = function () {}),
        (this.onStopScrolling = function () {}),
        (this.onMouseEntered = function () {}),
        (this.onScroll = function () {
          var win = w(self.el);
          self.scrollXTicking ||
            (win.requestAnimationFrame(self.scrollX),
            (self.scrollXTicking = true));
          self.scrollYTicking ||
            (win.requestAnimationFrame(self.scrollY),
            (self.scrollYTicking = true));
          self.isScrolling ||
            ((self.isScrolling = true), A(self.el, self.classNames.scrolling));
          self.showScrollbar("x");
          self.showScrollbar("y");
          self.onStopScrolling();
        }),
        (this.scrollX = function () {
          if (self.axis.x.isOverflowing) {
            self.positionScrollbar("x");
          }
          self.scrollXTicking = false;
        }),
        (this.scrollY = function () {
          if (self.axis.y.isOverflowing) {
            self.positionScrollbar("y");
          }
          self.scrollYTicking = false;
        }),
        (this._onStopScrolling = function () {
          W(self.el, self.classNames.scrolling);
          if (self.options.autoHide) {
            (self.hideScrollbar("x"), self.hideScrollbar("y"));
          }
          self.isScrolling = false;
        }),
        (this.onMouseEnter = function () {
          self.isMouseEntering ||
            (A(self.el, self.classNames.mouseEntered),
            self.showScrollbar("x"),
            self.showScrollbar("y"),
            (self.isMouseEntering = true));
          self.onMouseEntered();
        }),
        (this._onMouseEntered = function () {
          W(self.el, self.classNames.mouseEntered);
          if (self.options.autoHide) {
            (self.hideScrollbar("x"), self.hideScrollbar("y"));
          }
          self.isMouseEntering = false;
        }),
        (this._onMouseMove = function (mouseEvent) {
          self.mouseX = mouseEvent.clientX;
          self.mouseY = mouseEvent.clientY;
          if (self.axis.x.isOverflowing || self.axis.x.forceVisible) {
            self.onMouseMoveForAxis("x");
          }
          if (self.axis.y.isOverflowing || self.axis.y.forceVisible) {
            self.onMouseMoveForAxis("y");
          }
        }),
        (this.onMouseLeave = function () {
          self.onMouseMove.cancel();
          if (self.axis.x.isOverflowing || self.axis.x.forceVisible) {
            self.onMouseLeaveForAxis("x");
          }
          if (self.axis.y.isOverflowing || self.axis.y.forceVisible) {
            self.onMouseLeaveForAxis("y");
          }
          self.mouseX = -1;
          self.mouseY = -1;
        }),
        (this._onWindowResize = function () {
          self.scrollbarWidth = self.getScrollbarWidth();
          self.hideNativeScrollbar();
        }),
        (this.onPointerEvent = function (pointerEvent) {
          if (
            !(
              !self.axis.x.track.el ||
              !self.axis.y.track.el ||
              !self.axis.x.scrollbar.el ||
              !self.axis.y.scrollbar.el
            )
          ) {
            var isWithinTrackX, isWithinTrackY;
            self.axis.x.track.rect =
              self.axis.x.track.el.getBoundingClientRect();
            self.axis.y.track.rect =
              self.axis.y.track.el.getBoundingClientRect();
            if (self.axis.x.isOverflowing || self.axis.x.forceVisible) {
              isWithinTrackX = self.isWithinBounds(self.axis.x.track.rect);
            }
            if (self.axis.y.isOverflowing || self.axis.y.forceVisible) {
              isWithinTrackY = self.isWithinBounds(self.axis.y.track.rect);
            }
            if (isWithinTrackX || isWithinTrackY) {
              (pointerEvent.stopPropagation(),
                pointerEvent.type === "pointerdown" &&
                  pointerEvent.pointerType !== "touch" &&
                  (isWithinTrackX &&
                    ((self.axis.x.scrollbar.rect =
                      self.axis.x.scrollbar.el.getBoundingClientRect()),
                    self.isWithinBounds(self.axis.x.scrollbar.rect)
                      ? self.onDragStart(pointerEvent, "x")
                      : self.onTrackClick(pointerEvent, "x")),
                  isWithinTrackY &&
                    ((self.axis.y.scrollbar.rect =
                      self.axis.y.scrollbar.el.getBoundingClientRect()),
                    self.isWithinBounds(self.axis.y.scrollbar.rect)
                      ? self.onDragStart(pointerEvent, "y")
                      : self.onTrackClick(pointerEvent, "y"))));
            }
          }
        }),
        (this.drag = function (dragEvent) {
          var trackRectRef,
            trackSizeRef,
            contentWrapperRef,
            scrollSizeRef,
            elStylesRef,
            elStylesSizeRef,
            trackRectOffsetRef,
            trackRectOffsetVal,
            trackRectSizeRtlRef,
            trackRectSizeRtlVal,
            rtlHelpersRef;
          if (!(!self.draggedAxis || !self.contentWrapperEl)) {
            var mousePosition,
              track = self.axis[self.draggedAxis].track,
              trackSize =
                (trackSizeRef =
                  (trackRectRef = track.rect) === null ||
                  trackRectRef === undefined
                    ? undefined
                    : trackRectRef[self.axis[self.draggedAxis].sizeAttr]) !==
                  null && trackSizeRef !== undefined
                  ? trackSizeRef
                  : 0,
              scrollbar = self.axis[self.draggedAxis].scrollbar,
              scrollSize =
                (scrollSizeRef =
                  (contentWrapperRef = self.contentWrapperEl) === null ||
                  contentWrapperRef === undefined
                    ? undefined
                    : contentWrapperRef[
                        self.axis[self.draggedAxis].scrollSizeAttr
                      ]) !== null && scrollSizeRef !== undefined
                  ? scrollSizeRef
                  : 0,
              contentSize = parseInt(
                (elStylesSizeRef =
                  (elStylesRef = self.elStyles) === null ||
                  elStylesRef === undefined
                    ? undefined
                    : elStylesRef[self.axis[self.draggedAxis].sizeAttr]) !==
                  null && elStylesSizeRef !== undefined
                  ? elStylesSizeRef
                  : "0px",
                10,
              );
            dragEvent.preventDefault();
            dragEvent.stopPropagation();
            self.draggedAxis === "y"
              ? (mousePosition = dragEvent.pageY)
              : (mousePosition = dragEvent.pageX);
            var dragPosition =
              mousePosition -
              ((trackRectOffsetVal =
                (trackRectOffsetRef = track.rect) === null ||
                trackRectOffsetRef === undefined
                  ? undefined
                  : trackRectOffsetRef[
                      self.axis[self.draggedAxis].offsetAttr
                    ]) !== null && trackRectOffsetVal !== undefined
                ? trackRectOffsetVal
                : 0) -
              self.axis[self.draggedAxis].dragOffset;
            dragPosition =
              self.draggedAxis === "x" && self.isRtl
                ? ((trackRectSizeRtlVal =
                    (trackRectSizeRtlRef = track.rect) === null ||
                    trackRectSizeRtlRef === undefined
                      ? undefined
                      : trackRectSizeRtlRef[
                          self.axis[self.draggedAxis].sizeAttr
                        ]) !== null && trackRectSizeRtlVal !== undefined
                    ? trackRectSizeRtlVal
                    : 0) -
                  scrollbar.size -
                  dragPosition
                : dragPosition;
            var scrollPercent = dragPosition / (trackSize - scrollbar.size),
              scrollOffset = scrollPercent * (scrollSize - contentSize);
            if (self.draggedAxis === "x" && self.isRtl) {
              scrollOffset =
                !(
                  (rtlHelpersRef = SimpleBarConstructor.getRtlHelpers()) ===
                    null || rtlHelpersRef === undefined
                ) && rtlHelpersRef.isScrollingToNegative
                  ? -scrollOffset
                  : scrollOffset;
            }
            self.contentWrapperEl[
              self.axis[self.draggedAxis].scrollOffsetAttr
            ] = scrollOffset;
          }
        }),
        (this.onEndDrag = function (endDragEvent) {
          self.isDragging = false;
          var doc = V(self.el),
            win = w(self.el);
          endDragEvent.preventDefault();
          endDragEvent.stopPropagation();
          W(self.el, self.classNames.dragging);
          self.onStopScrolling();
          doc.removeEventListener("mousemove", self.drag, true);
          doc.removeEventListener("mouseup", self.onEndDrag, true);
          self.removePreventClickId = win.setTimeout(function () {
            doc.removeEventListener("click", self.preventClick, true);
            doc.removeEventListener("dblclick", self.preventClick, true);
            self.removePreventClickId = null;
          });
        }),
        (this.preventClick = function (clickEvent) {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
        }),
        (this.el = element),
        (this.options = assign(
          assign({}, SimpleBarConstructor.defaultOptions),
          options,
        )),
        (this.classNames = assign(
          assign({}, SimpleBarConstructor.defaultOptions.classNames),
          options.classNames,
        )),
        (this.axis = {
          x: {
            scrollOffsetAttr: "scrollLeft",
            sizeAttr: "width",
            scrollSizeAttr: "scrollWidth",
            offsetSizeAttr: "offsetWidth",
            offsetAttr: "left",
            overflowAttr: "overflowX",
            dragOffset: 0,
            isOverflowing: true,
            forceVisible: false,
            track: {
              size: null,
              el: null,
              rect: null,
              isVisible: false,
            },
            scrollbar: {
              size: null,
              el: null,
              rect: null,
              isVisible: false,
            },
          },
          y: {
            scrollOffsetAttr: "scrollTop",
            sizeAttr: "height",
            scrollSizeAttr: "scrollHeight",
            offsetSizeAttr: "offsetHeight",
            offsetAttr: "top",
            overflowAttr: "overflowY",
            dragOffset: 0,
            isOverflowing: true,
            forceVisible: false,
            track: {
              size: null,
              el: null,
              rect: null,
              isVisible: false,
            },
            scrollbar: {
              size: null,
              el: null,
              rect: null,
              isVisible: false,
            },
          },
        }),
        typeof this.el != "object" || !this.el.nodeName)
      )
        throw new Error(
          "Argument passed to SimpleBar must be an HTML element instead of ".concat(
            this.el,
          ),
        );
      this.onMouseMove = throttle(this._onMouseMove, 64);
      this.onWindowResize = debounce(this._onWindowResize, 64, {
        leading: true,
      });
      this.onStopScrolling = debounce(
        this._onStopScrolling,
        this.stopScrollDelay,
      );
      this.onMouseEntered = debounce(
        this._onMouseEntered,
        this.stopScrollDelay,
      );
      this.init();
    }
    return (
      (SimpleBarConstructor.getRtlHelpers = function () {
        if (SimpleBarConstructor.rtlHelpers)
          return SimpleBarConstructor.rtlHelpers;
        var container = document.createElement("div");
        container.innerHTML =
          '<div class="simplebar-dummy-scrollbar-size"><div></div></div>';
        var scrollableDiv = container.firstElementChild,
          innerDiv = scrollableDiv?.firstElementChild;
        if (!innerDiv) return null;
        document.body.appendChild(scrollableDiv);
        scrollableDiv.scrollLeft = 0;
        var scrollableOffset = SimpleBarConstructor.getOffset(scrollableDiv),
          innerOffset = SimpleBarConstructor.getOffset(innerDiv);
        scrollableDiv.scrollLeft = -999;
        var scrolledInnerOffset = SimpleBarConstructor.getOffset(innerDiv);
        return (
          document.body.removeChild(scrollableDiv),
          (SimpleBarConstructor.rtlHelpers = {
            isScrollOriginAtZero: scrollableOffset.left !== innerOffset.left,
            isScrollingToNegative:
              innerOffset.left !== scrolledInnerOffset.left,
          }),
          SimpleBarConstructor.rtlHelpers
        );
      }),
      (SimpleBarConstructor.prototype.getScrollbarWidth = function () {
        try {
          return (this.contentWrapperEl &&
            getComputedStyle(this.contentWrapperEl, "::-webkit-scrollbar")
              .display === "none") ||
            "scrollbarWidth" in document.documentElement.style ||
            "-ms-overflow-style" in document.documentElement.style
            ? 0
            : getScrollbarWidth();
        } catch {
          return getScrollbarWidth();
        }
      }),
      (SimpleBarConstructor.getOffset = function (element) {
        var rect = element.getBoundingClientRect(),
          doc = V(element),
          win = w(element);
        return {
          top: rect.top + (win.pageYOffset || doc.documentElement.scrollTop),
          left: rect.left + (win.pageXOffset || doc.documentElement.scrollLeft),
        };
      }),
      (SimpleBarConstructor.prototype.init = function () {
        if (canUseDOM) {
          (this.initDOM(),
            (this.rtlHelpers = SimpleBarConstructor.getRtlHelpers()),
            (this.scrollbarWidth = this.getScrollbarWidth()),
            this.recalculate(),
            this.initListeners());
        }
      }),
      (SimpleBarConstructor.prototype.initDOM = function () {
        var xScrollbarEl, yScrollbarEl;
        this.wrapperEl = this.el.querySelector(g(this.classNames.wrapper));
        this.contentWrapperEl =
          this.options.scrollableNode ||
          this.el.querySelector(g(this.classNames.contentWrapper));
        this.contentEl =
          this.options.contentNode ||
          this.el.querySelector(g(this.classNames.contentEl));
        this.offsetEl = this.el.querySelector(g(this.classNames.offset));
        this.maskEl = this.el.querySelector(g(this.classNames.mask));
        this.placeholderEl = this.findChild(
          this.wrapperEl,
          g(this.classNames.placeholder),
        );
        this.heightAutoObserverWrapperEl = this.el.querySelector(
          g(this.classNames.heightAutoObserverWrapperEl),
        );
        this.heightAutoObserverEl = this.el.querySelector(
          g(this.classNames.heightAutoObserverEl),
        );
        this.axis.x.track.el = this.findChild(
          this.el,
          ""
            .concat(g(this.classNames.track))
            .concat(g(this.classNames.horizontal)),
        );
        this.axis.y.track.el = this.findChild(
          this.el,
          ""
            .concat(g(this.classNames.track))
            .concat(g(this.classNames.vertical)),
        );
        this.axis.x.scrollbar.el =
          ((xScrollbarEl = this.axis.x.track.el) === null ||
          xScrollbarEl === undefined
            ? undefined
            : xScrollbarEl.querySelector(g(this.classNames.scrollbar))) || null;
        this.axis.y.scrollbar.el =
          ((yScrollbarEl = this.axis.y.track.el) === null ||
          yScrollbarEl === undefined
            ? undefined
            : yScrollbarEl.querySelector(g(this.classNames.scrollbar))) || null;
        this.options.autoHide ||
          (A(this.axis.x.scrollbar.el, this.classNames.visible),
          A(this.axis.y.scrollbar.el, this.classNames.visible));
      }),
      (SimpleBarConstructor.prototype.initListeners = function () {
        var self = this,
          contentWrapperRef,
          elWindow = w(this.el);
        if (
          (this.el.addEventListener("mouseenter", this.onMouseEnter),
          this.el.addEventListener("pointerdown", this.onPointerEvent, true),
          this.el.addEventListener("mousemove", this.onMouseMove),
          this.el.addEventListener("mouseleave", this.onMouseLeave),
          (contentWrapperRef = this.contentWrapperEl) === null ||
            contentWrapperRef === undefined ||
            contentWrapperRef.addEventListener("scroll", this.onScroll),
          elWindow.addEventListener("resize", this.onWindowResize),
          !!this.contentEl)
        ) {
          if (window.ResizeObserver) {
            var isInitialized = false,
              ResizeObserverClass = elWindow.ResizeObserver || ResizeObserver;
            this.resizeObserver = new ResizeObserverClass(function () {
              if (isInitialized) {
                elWindow.requestAnimationFrame(function () {
                  self.recalculate();
                });
              }
            });
            this.resizeObserver.observe(this.el);
            this.resizeObserver.observe(this.contentEl);
            elWindow.requestAnimationFrame(function () {
              isInitialized = true;
            });
          }
          this.mutationObserver = new elWindow.MutationObserver(function () {
            elWindow.requestAnimationFrame(function () {
              self.recalculate();
            });
          });
          this.mutationObserver.observe(this.contentEl, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }
      }),
      (SimpleBarConstructor.prototype.recalculate = function () {
        if (
          !(
            !this.heightAutoObserverEl ||
            !this.contentEl ||
            !this.contentWrapperEl ||
            !this.wrapperEl ||
            !this.placeholderEl
          )
        ) {
          var elWindow = w(this.el);
          this.elStyles = elWindow.getComputedStyle(this.el);
          this.isRtl = this.elStyles.direction === "rtl";
          var contentWidth = this.contentEl.offsetWidth,
            isHeightAuto = this.heightAutoObserverEl.offsetHeight <= 1,
            isWidthAuto =
              this.heightAutoObserverEl.offsetWidth <= 1 || contentWidth > 0,
            wrapperWidth = this.contentWrapperEl.offsetWidth,
            overflowX = this.elStyles.overflowX,
            overflowY = this.elStyles.overflowY;
          this.contentEl.style.padding = ""
            .concat(this.elStyles.paddingTop, " ")
            .concat(this.elStyles.paddingRight, " ")
            .concat(this.elStyles.paddingBottom, " ")
            .concat(this.elStyles.paddingLeft);
          this.wrapperEl.style.margin = "-"
            .concat(this.elStyles.paddingTop, " -")
            .concat(this.elStyles.paddingRight, " -")
            .concat(this.elStyles.paddingBottom, " -")
            .concat(this.elStyles.paddingLeft);
          var scrollHeight = this.contentEl.scrollHeight,
            scrollWidth = this.contentEl.scrollWidth;
          this.contentWrapperEl.style.height = isHeightAuto ? "auto" : "100%";
          this.placeholderEl.style.width = isWidthAuto
            ? "".concat(contentWidth || scrollWidth, "px")
            : "auto";
          this.placeholderEl.style.height = "".concat(scrollHeight, "px");
          var wrapperHeight = this.contentWrapperEl.offsetHeight;
          this.axis.x.isOverflowing =
            contentWidth !== 0 && scrollWidth > contentWidth;
          this.axis.y.isOverflowing = scrollHeight > wrapperHeight;
          this.axis.x.isOverflowing =
            overflowX === "hidden" ? false : this.axis.x.isOverflowing;
          this.axis.y.isOverflowing =
            overflowY === "hidden" ? false : this.axis.y.isOverflowing;
          this.axis.x.forceVisible =
            this.options.forceVisible === "x" ||
            this.options.forceVisible === true;
          this.axis.y.forceVisible =
            this.options.forceVisible === "y" ||
            this.options.forceVisible === true;
          this.hideNativeScrollbar();
          var xScrollbarWidth = this.axis.x.isOverflowing
              ? this.scrollbarWidth
              : 0,
            yScrollbarWidth = this.axis.y.isOverflowing
              ? this.scrollbarWidth
              : 0;
          this.axis.x.isOverflowing =
            this.axis.x.isOverflowing &&
            scrollWidth > wrapperWidth - yScrollbarWidth;
          this.axis.y.isOverflowing =
            this.axis.y.isOverflowing &&
            scrollHeight > wrapperHeight - xScrollbarWidth;
          this.axis.x.scrollbar.size = this.getScrollbarSize("x");
          this.axis.y.scrollbar.size = this.getScrollbarSize("y");
          if (this.axis.x.scrollbar.el) {
            this.axis.x.scrollbar.el.style.width = "".concat(
              this.axis.x.scrollbar.size,
              "px",
            );
          }
          if (this.axis.y.scrollbar.el) {
            this.axis.y.scrollbar.el.style.height = "".concat(
              this.axis.y.scrollbar.size,
              "px",
            );
          }
          this.positionScrollbar("x");
          this.positionScrollbar("y");
          this.toggleTrackVisibility("x");
          this.toggleTrackVisibility("y");
        }
      }),
      (SimpleBarConstructor.prototype.getScrollbarSize = function (axis) {
        var trackElRef, trackOffsetSize;
        if (
          (axis === undefined && (axis = "y"),
          !this.axis[axis].isOverflowing || !this.contentEl)
        )
          return 0;
        var scrollSize = this.contentEl[this.axis[axis].scrollSizeAttr],
          trackSize =
            (trackOffsetSize =
              (trackElRef = this.axis[axis].track.el) === null ||
              trackElRef === undefined
                ? undefined
                : trackElRef[this.axis[axis].offsetSizeAttr]) !== null &&
            trackOffsetSize !== undefined
              ? trackOffsetSize
              : 0,
          scrollbarRatio = trackSize / scrollSize,
          calculatedSize;
        return (
          (calculatedSize = Math.max(
            ~~(scrollbarRatio * trackSize),
            this.options.scrollbarMinSize,
          )),
          this.options.scrollbarMaxSize &&
            (calculatedSize = Math.min(
              calculatedSize,
              this.options.scrollbarMaxSize,
            )),
          calculatedSize
        );
      }),
      (SimpleBarConstructor.prototype.positionScrollbar = function (axis) {
        var trackElRef, rtlHelpersRef, rtlHelpersRef2;
        if (axis === undefined) {
          axis = "y";
        }
        var scrollbar = this.axis[axis].scrollbar;
        if (
          !(
            !this.axis[axis].isOverflowing ||
            !this.contentWrapperEl ||
            !scrollbar.el ||
            !this.elStyles
          )
        ) {
          var scrollSize =
              this.contentWrapperEl[this.axis[axis].scrollSizeAttr],
            trackSize =
              ((trackElRef = this.axis[axis].track.el) === null ||
              trackElRef === undefined
                ? undefined
                : trackElRef[this.axis[axis].offsetSizeAttr]) || 0,
            contentSize = parseInt(this.elStyles[this.axis[axis].sizeAttr], 10),
            scrollOffset =
              this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
          scrollOffset =
            axis === "x" &&
            this.isRtl &&
            !(
              (rtlHelpersRef = SimpleBarConstructor.getRtlHelpers()) === null ||
              rtlHelpersRef === undefined
            ) &&
            rtlHelpersRef.isScrollOriginAtZero
              ? -scrollOffset
              : scrollOffset;
          if (axis === "x" && this.isRtl) {
            scrollOffset =
              !(
                (rtlHelpersRef2 = SimpleBarConstructor.getRtlHelpers()) ===
                  null || rtlHelpersRef2 === undefined
              ) && rtlHelpersRef2.isScrollingToNegative
                ? scrollOffset
                : -scrollOffset;
          }
          var scrollPercent = scrollOffset / (scrollSize - contentSize),
            scrollbarPosition = ~~(
              (trackSize - scrollbar.size) *
              scrollPercent
            );
          scrollbarPosition =
            axis === "x" && this.isRtl
              ? -scrollbarPosition + (trackSize - scrollbar.size)
              : scrollbarPosition;
          scrollbar.el.style.transform =
            axis === "x"
              ? "translate3d(".concat(scrollbarPosition, "px, 0, 0)")
              : "translate3d(0, ".concat(scrollbarPosition, "px, 0)");
        }
      }),
      (SimpleBarConstructor.prototype.toggleTrackVisibility = function (axis) {
        if (axis === undefined) {
          axis = "y";
        }
        var trackEl = this.axis[axis].track.el,
          scrollbarEl = this.axis[axis].scrollbar.el;
        !trackEl ||
          !scrollbarEl ||
          !this.contentWrapperEl ||
          (this.axis[axis].isOverflowing || this.axis[axis].forceVisible
            ? ((trackEl.style.visibility = "visible"),
              (this.contentWrapperEl.style[this.axis[axis].overflowAttr] =
                "scroll"),
              this.el.classList.add(
                "".concat(this.classNames.scrollable, "-").concat(axis),
              ))
            : ((trackEl.style.visibility = "hidden"),
              (this.contentWrapperEl.style[this.axis[axis].overflowAttr] =
                "hidden"),
              this.el.classList.remove(
                "".concat(this.classNames.scrollable, "-").concat(axis),
              )),
          this.axis[axis].isOverflowing
            ? (scrollbarEl.style.display = "block")
            : (scrollbarEl.style.display = "none"));
      }),
      (SimpleBarConstructor.prototype.showScrollbar = function (axis) {
        if (axis === undefined) {
          axis = "y";
        }
        if (
          this.axis[axis].isOverflowing &&
          !this.axis[axis].scrollbar.isVisible
        ) {
          (A(this.axis[axis].scrollbar.el, this.classNames.visible),
            (this.axis[axis].scrollbar.isVisible = true));
        }
      }),
      (SimpleBarConstructor.prototype.hideScrollbar = function (axis) {
        if (axis === undefined) {
          axis = "y";
        }
        if (
          !this.isDragging &&
          this.axis[axis].isOverflowing &&
          this.axis[axis].scrollbar.isVisible
        ) {
          (W(this.axis[axis].scrollbar.el, this.classNames.visible),
            (this.axis[axis].scrollbar.isVisible = false));
        }
      }),
      (SimpleBarConstructor.prototype.hideNativeScrollbar = function () {
        if (this.offsetEl) {
          ((this.offsetEl.style[this.isRtl ? "left" : "right"] =
            this.axis.y.isOverflowing || this.axis.y.forceVisible
              ? "-".concat(this.scrollbarWidth, "px")
              : "0px"),
            (this.offsetEl.style.bottom =
              this.axis.x.isOverflowing || this.axis.x.forceVisible
                ? "-".concat(this.scrollbarWidth, "px")
                : "0px"));
        }
      }),
      (SimpleBarConstructor.prototype.onMouseMoveForAxis = function (axis) {
        if (axis === undefined) {
          axis = "y";
        }
        var axisData = this.axis[axis];
        !axisData.track.el ||
          !axisData.scrollbar.el ||
          ((axisData.track.rect = axisData.track.el.getBoundingClientRect()),
          (axisData.scrollbar.rect =
            axisData.scrollbar.el.getBoundingClientRect()),
          this.isWithinBounds(axisData.track.rect)
            ? (this.showScrollbar(axis),
              A(axisData.track.el, this.classNames.hover),
              this.isWithinBounds(axisData.scrollbar.rect)
                ? A(axisData.scrollbar.el, this.classNames.hover)
                : W(axisData.scrollbar.el, this.classNames.hover))
            : (W(axisData.track.el, this.classNames.hover),
              this.options.autoHide && this.hideScrollbar(axis)));
      }),
      (SimpleBarConstructor.prototype.onMouseLeaveForAxis = function (axis) {
        if (axis === undefined) {
          axis = "y";
        }
        W(this.axis[axis].track.el, this.classNames.hover);
        W(this.axis[axis].scrollbar.el, this.classNames.hover);
        if (this.options.autoHide) {
          this.hideScrollbar(axis);
        }
      }),
      (SimpleBarConstructor.prototype.onDragStart = function (event, axis) {
        var scrollbarRectRef;
        if (axis === undefined) {
          axis = "y";
        }
        this.isDragging = true;
        var doc = V(this.el),
          win = w(this.el),
          scrollbar = this.axis[axis].scrollbar,
          mousePosition = axis === "y" ? event.pageY : event.pageX;
        this.axis[axis].dragOffset =
          mousePosition -
          (((scrollbarRectRef = scrollbar.rect) === null ||
          scrollbarRectRef === undefined
            ? undefined
            : scrollbarRectRef[this.axis[axis].offsetAttr]) || 0);
        this.draggedAxis = axis;
        A(this.el, this.classNames.dragging);
        doc.addEventListener("mousemove", this.drag, true);
        doc.addEventListener("mouseup", this.onEndDrag, true);
        this.removePreventClickId === null
          ? (doc.addEventListener("click", this.preventClick, true),
            doc.addEventListener("dblclick", this.preventClick, true))
          : (win.clearTimeout(this.removePreventClickId),
            (this.removePreventClickId = null));
      }),
      (SimpleBarConstructor.prototype.onTrackClick = function (event, axis) {
        var self = this,
          scrollbarRectRef,
          scrollbarOffsetRef,
          elStylesRef,
          elStylesSizeRef;
        if (axis === undefined) {
          axis = "y";
        }
        var axisData = this.axis[axis];
        if (
          !(
            !this.options.clickOnTrack ||
            !axisData.scrollbar.el ||
            !this.contentWrapperEl
          )
        ) {
          event.preventDefault();
          var elWindow = w(this.el);
          this.axis[axis].scrollbar.rect =
            axisData.scrollbar.el.getBoundingClientRect();
          var scrollbar = this.axis[axis].scrollbar,
            scrollbarOffset =
              (scrollbarOffsetRef =
                (scrollbarRectRef = scrollbar.rect) === null ||
                scrollbarRectRef === undefined
                  ? undefined
                  : scrollbarRectRef[this.axis[axis].offsetAttr]) !== null &&
              scrollbarOffsetRef !== undefined
                ? scrollbarOffsetRef
                : 0,
            containerSize = parseInt(
              (elStylesSizeRef =
                (elStylesRef = this.elStyles) === null ||
                elStylesRef === undefined
                  ? undefined
                  : elStylesRef[this.axis[axis].sizeAttr]) !== null &&
                elStylesSizeRef !== undefined
                ? elStylesSizeRef
                : "0px",
              10,
            ),
            currentScroll =
              this.contentWrapperEl[this.axis[axis].scrollOffsetAttr],
            mouseDistanceFromScrollbar =
              axis === "y"
                ? this.mouseY - scrollbarOffset
                : this.mouseX - scrollbarOffset,
            scrollDirection = mouseDistanceFromScrollbar < 0 ? -1 : 1,
            targetScroll =
              scrollDirection === -1
                ? currentScroll - containerSize
                : currentScroll + containerSize,
            scrollStep = 40,
            animateScroll = function () {
              if (self.contentWrapperEl) {
                scrollDirection === -1
                  ? currentScroll > targetScroll &&
                    ((currentScroll -= scrollStep),
                    (self.contentWrapperEl[self.axis[axis].scrollOffsetAttr] =
                      currentScroll),
                    elWindow.requestAnimationFrame(animateScroll))
                  : currentScroll < targetScroll &&
                    ((currentScroll += scrollStep),
                    (self.contentWrapperEl[self.axis[axis].scrollOffsetAttr] =
                      currentScroll),
                    elWindow.requestAnimationFrame(animateScroll));
              }
            };
          animateScroll();
        }
      }),
      (SimpleBarConstructor.prototype.getContentElement = function () {
        return this.contentEl;
      }),
      (SimpleBarConstructor.prototype.getScrollElement = function () {
        return this.contentWrapperEl;
      }),
      (SimpleBarConstructor.prototype.removeListeners = function () {
        var elWindow = w(this.el);
        this.el.removeEventListener("mouseenter", this.onMouseEnter);
        this.el.removeEventListener("pointerdown", this.onPointerEvent, true);
        this.el.removeEventListener("mousemove", this.onMouseMove);
        this.el.removeEventListener("mouseleave", this.onMouseLeave);
        if (this.contentWrapperEl) {
          this.contentWrapperEl.removeEventListener("scroll", this.onScroll);
        }
        elWindow.removeEventListener("resize", this.onWindowResize);
        if (this.mutationObserver) {
          this.mutationObserver.disconnect();
        }
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
        }
        this.onMouseMove.cancel();
        this.onWindowResize.cancel();
        this.onStopScrolling.cancel();
        this.onMouseEntered.cancel();
      }),
      (SimpleBarConstructor.prototype.unMount = function () {
        this.removeListeners();
      }),
      (SimpleBarConstructor.prototype.isWithinBounds = function (rect) {
        return (
          this.mouseX >= rect.left &&
          this.mouseX <= rect.left + rect.width &&
          this.mouseY >= rect.top &&
          this.mouseY <= rect.top + rect.height
        );
      }),
      (SimpleBarConstructor.prototype.findChild = function (
        parentEl,
        selector,
      ) {
        var matchesFn =
          parentEl.matches ||
          parentEl.webkitMatchesSelector ||
          parentEl.mozMatchesSelector ||
          parentEl.msMatchesSelector;
        return Array.prototype.filter.call(parentEl.children, function (child) {
          return matchesFn.call(child, selector);
        })[0];
      }),
      (SimpleBarConstructor.rtlHelpers = null),
      (SimpleBarConstructor.defaultOptions = {
        forceVisible: false,
        clickOnTrack: true,
        scrollbarMinSize: 25,
        scrollbarMaxSize: 0,
        ariaLabel: "scrollable content",
        tabIndex: 0,
        classNames: {
          contentEl: "simplebar-content",
          contentWrapper: "simplebar-content-wrapper",
          offset: "simplebar-offset",
          mask: "simplebar-mask",
          wrapper: "simplebar-wrapper",
          placeholder: "simplebar-placeholder",
          scrollbar: "simplebar-scrollbar",
          track: "simplebar-track",
          heightAutoObserverWrapperEl: "simplebar-height-auto-observer-wrapper",
          heightAutoObserverEl: "simplebar-height-auto-observer",
          visible: "simplebar-visible",
          horizontal: "simplebar-horizontal",
          vertical: "simplebar-vertical",
          hover: "simplebar-hover",
          dragging: "simplebar-dragging",
          scrolling: "simplebar-scrolling",
          scrollable: "simplebar-scrollable",
          mouseEntered: "simplebar-mouse-entered",
        },
        scrollableNode: null,
        contentNode: null,
        autoHide: true,
      }),
      (SimpleBarConstructor.getOptions = Le),
      (SimpleBarConstructor.helpers = helpers),
      SimpleBarConstructor
    );
  })(),
  /* ---- Object Assign Polyfill (for SimpleBar React wrapper) ---- */
  assignForWrapper = function () {
    return (
      (assignForWrapper =
        Object.assign ||
        function (target) {
          for (
            var source, index = 1, length = arguments.length;
            index < length;
            index++
          ) {
            source = arguments[index];
            for (var key in source)
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
              }
          }
          return target;
        }),
      assignForWrapper.apply(this, arguments)
    );
  };

/* ---- Object Rest/Omit Helper ---- */
function objectWithoutProperties(source, excludedKeys) {
  var result = {};
  for (var key in source)
    if (
      Object.prototype.hasOwnProperty.call(source, key) &&
      excludedKeys.indexOf(key) < 0
    ) {
      result[key] = source[key];
    }
  if (source != null && typeof Object.getOwnPropertySymbols == "function")
    for (
      var symbolIndex = 0, key = Object.getOwnPropertySymbols(source);
      symbolIndex < key.length;
      symbolIndex++
    )
      if (
        excludedKeys.indexOf(key[symbolIndex]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(source, key[symbolIndex])
      ) {
        result[key[symbolIndex]] = source[key[symbolIndex]];
      }
  return result;
}

/* ---- SimpleBar React Wrapper Component ---- */
var Pe = d.forwardRef(function (props, ref) {
  var children = props.children,
    scrollableNodePropsInput = props.scrollableNodeProps,
    scrollableNodeConfig =
      scrollableNodePropsInput === undefined ? {} : scrollableNodePropsInput,
    remainingProps = objectWithoutProperties(props, [
      "children",
      "scrollableNodeProps",
    ]),
    rootRef = d.useRef(),
    scrollableNodeRef = d.useRef(),
    contentNodeRef = d.useRef(),
    simpleBarOptions = {},
    domAttributes = {};
  Object.keys(remainingProps).forEach(function (propKey) {
    Object.prototype.hasOwnProperty.call(SimpleBar.defaultOptions, propKey)
      ? (simpleBarOptions[propKey] = remainingProps[propKey])
      : (domAttributes[propKey] = remainingProps[propKey]);
  });
  var mergedClassNames = assignForWrapper(
      assignForWrapper({}, SimpleBar.defaultOptions.classNames),
      simpleBarOptions.classNames,
    ),
    scrollableNodeProps = assignForWrapper(
      assignForWrapper({}, scrollableNodeConfig),
      {
        className: ""
          .concat(mergedClassNames.contentWrapper)
          .concat(
            scrollableNodeConfig.className
              ? " ".concat(scrollableNodeConfig.className)
              : "",
          ),
        tabIndex:
          simpleBarOptions.tabIndex || SimpleBar.defaultOptions.tabIndex,
        role: "region",
        "aria-label":
          simpleBarOptions.ariaLabel || SimpleBar.defaultOptions.ariaLabel,
      },
    );
  return (
    d.useEffect(function () {
      var simpleBarInstance;
      return (
        (scrollableNodeRef.current = scrollableNodeProps.ref
          ? scrollableNodeProps.ref.current
          : scrollableNodeRef.current),
        rootRef.current &&
          ((simpleBarInstance = new SimpleBar(
            rootRef.current,
            assignForWrapper(
              assignForWrapper(
                assignForWrapper({}, simpleBarOptions),
                scrollableNodeRef.current && {
                  scrollableNode: scrollableNodeRef.current,
                },
              ),
              contentNodeRef.current && {
                contentNode: contentNodeRef.current,
              },
            ),
          )),
          typeof ref == "function"
            ? ref(simpleBarInstance)
            : ref && (ref.current = simpleBarInstance)),
        function () {
          simpleBarInstance?.unMount();
          simpleBarInstance = null;
          if (typeof ref == "function") {
            ref(null);
          }
        }
      );
    }, []),
    d.createElement(
      "div",
      assignForWrapper(
        {
          "data-simplebar": "init",
          ref: rootRef,
        },
        domAttributes,
      ),
      d.createElement(
        "div",
        {
          className: mergedClassNames.wrapper,
        },
        d.createElement(
          "div",
          {
            className: mergedClassNames.heightAutoObserverWrapperEl,
          },
          d.createElement("div", {
            className: mergedClassNames.heightAutoObserverEl,
          }),
        ),
        d.createElement(
          "div",
          {
            className: mergedClassNames.mask,
          },
          d.createElement(
            "div",
            {
              className: mergedClassNames.offset,
            },
            typeof children == "function"
              ? children({
                  scrollableNodeRef: scrollableNodeRef,
                  scrollableNodeProps: assignForWrapper(
                    assignForWrapper({}, scrollableNodeProps),
                    {
                      ref: scrollableNodeRef,
                    },
                  ),
                  contentNodeRef: contentNodeRef,
                  contentNodeProps: {
                    className: mergedClassNames.contentEl,
                    ref: contentNodeRef,
                  },
                })
              : d.createElement(
                  "div",
                  assignForWrapper({}, scrollableNodeProps),
                  d.createElement(
                    "div",
                    {
                      className: mergedClassNames.contentEl,
                    },
                    children,
                  ),
                ),
          ),
        ),
        d.createElement("div", {
          className: mergedClassNames.placeholder,
        }),
      ),
      d.createElement(
        "div",
        {
          className: ""
            .concat(mergedClassNames.track, " ")
            .concat(mergedClassNames.horizontal),
        },
        d.createElement("div", {
          className: mergedClassNames.scrollbar,
        }),
      ),
      d.createElement(
        "div",
        {
          className: ""
            .concat(mergedClassNames.track, " ")
            .concat(mergedClassNames.vertical),
        },
        d.createElement("div", {
          className: mergedClassNames.scrollbar,
        }),
      ),
    )
  );
});
Pe.displayName = "SimpleBar";

/* ---- Navigation Menu Filter by Roles/Permissions/Licenses ---- */
function je(menuItems, userRoles, userPermissions = [], userLicenses = []) {
  return menuItems.reduce((filteredItems, menuItem) => {
    const hasMatchingRole =
        menuItem.roles?.some((role) => userRoles.includes(role)) ?? false,
      hasMatchingPermission =
        menuItem.permissions?.some((permission) =>
          userPermissions.includes(permission),
        ) ?? false;
    if (
      (((menuItem.roles?.length ?? 0) > 0 ||
        (menuItem.permissions?.length ?? 0) > 0) &&
        !hasMatchingRole &&
        !hasMatchingPermission) ||
      (menuItem.requiredLicenses &&
        menuItem.requiredLicenses.length > 0 &&
        !menuItem.requiredLicenses.some((license) =>
          userLicenses.includes(license),
        ))
    )
      return filteredItems;
    if (menuItem.childs) {
      const filteredChildren = je(
        menuItem.childs,
        userRoles,
        userPermissions,
        userLicenses,
      );
      filteredChildren.length > 0
        ? filteredItems.push({
            ...menuItem,
            childs: filteredChildren,
          })
        : menuItem.childs.length === 0 && filteredItems.push(menuItem);
    } else filteredItems.push(menuItem);
    return filteredItems;
  }, []);
}

/* ---- Module Exports ---- */
export { Ve as A, Pe as S, je as f, Ie as i };
