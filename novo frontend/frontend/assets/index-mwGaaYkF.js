/* ---- Imports ---- */
import { R as a, a7 as Ut } from "./index-Bx06KCE-.js";

/* ---- Inject CSS into Document Head ---- */
function Xt(cssText) {
  if (typeof document > "u") return;
  let headElement = document.head || document.getElementsByTagName("head")[0],
    styleElement = document.createElement("style");
  styleElement.type = "text/css";
  headElement.appendChild(styleElement);
  styleElement.styleSheet
    ? (styleElement.styleSheet.cssText = cssText)
    : styleElement.appendChild(document.createTextNode(cssText));
}

/* ---- Toast Type Icons (SVG Elements) ---- */
const Wt = (toastType) => {
    switch (toastType) {
      case "success":
        return Gt;
      case "info":
        return Jt;
      case "warning":
        return Qt;
      case "error":
        return Zt;
      default:
        return null;
    }
  },
  Kt = Array(12).fill(0),
  qt = ({ visible: isVisible, className: spinnerClassName }) =>
    a.createElement(
      "div",
      {
        className: ["sonner-loading-wrapper", spinnerClassName].filter(Boolean).join(" "),
        "data-visible": isVisible,
      },
      a.createElement(
        "div",
        {
          className: "sonner-spinner",
        },
        Kt.map((item, index) =>
          a.createElement("div", {
            className: "sonner-loading-bar",
            key: `spinner-bar-${index}`,
          }),
        ),
      ),
    ),
  /* ---- Success Icon SVG ---- */
  Gt = a.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 20 20",
      fill: "currentColor",
      height: "20",
      width: "20",
    },
    a.createElement("path", {
      fillRule: "evenodd",
      d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
      clipRule: "evenodd",
    }),
  ),
  /* ---- Warning Icon SVG ---- */
  Qt = a.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "currentColor",
      height: "20",
      width: "20",
    },
    a.createElement("path", {
      fillRule: "evenodd",
      d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
      clipRule: "evenodd",
    }),
  ),
  /* ---- Info Icon SVG ---- */
  Jt = a.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 20 20",
      fill: "currentColor",
      height: "20",
      width: "20",
    },
    a.createElement("path", {
      fillRule: "evenodd",
      d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
      clipRule: "evenodd",
    }),
  ),
  /* ---- Error Icon SVG ---- */
  Zt = a.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 20 20",
      fill: "currentColor",
      height: "20",
      width: "20",
    },
    a.createElement("path", {
      fillRule: "evenodd",
      d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
      clipRule: "evenodd",
    }),
  ),
  /* ---- Close Button Icon SVG ---- */
  te = a.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    a.createElement("line", {
      x1: "18",
      y1: "6",
      x2: "6",
      y2: "18",
    }),
    a.createElement("line", {
      x1: "6",
      y1: "6",
      x2: "18",
      y2: "18",
    }),
  ),
  /* ---- Document Visibility Hook ---- */
  ee = () => {
    const [isHidden, setIsHidden] = a.useState(document.hidden);
    return (
      a.useEffect(() => {
        const handleVisibilityChange = () => {
          setIsHidden(document.hidden);
        };
        return (
          document.addEventListener("visibilitychange", handleVisibilityChange),
          () => window.removeEventListener("visibilitychange", handleVisibilityChange)
        );
      }, []),
      isHidden
    );
  };

/* ---- Toast ID Counter ---- */
let xt = 1;

/* ---- Toast State Manager Class ---- */
class ae {
  constructor() {
    this.subscribe = (callback) => (
      this.subscribers.push(callback),
      () => {
        const subscriberIndex = this.subscribers.indexOf(callback);
        this.subscribers.splice(subscriberIndex, 1);
      }
    );
    this.publish = (toastData) => {
      this.subscribers.forEach((item) => item(toastData));
    };
    this.addToast = (toastData) => {
      this.publish(toastData);
      this.toasts = [...this.toasts, toastData];
    };
    this.create = (props) => {
      var existingId;
      const { message: messageText, ...restProps } = props,
        toastId =
          typeof props?.id == "number" ||
          ((existingId = props.id) == null ? void 0 : existingId.length) > 0
            ? props.id
            : xt++,
        existingToast = this.toasts.find((props) => props.id === toastId),
        isDismissible = props.dismissible === void 0 ? !0 : props.dismissible;
      return (
        this.dismissedToasts.has(toastId) && this.dismissedToasts.delete(toastId),
        existingToast
          ? (this.toasts = this.toasts.map((props) =>
              props.id === toastId
                ? (this.publish({
                    ...props,
                    ...props,
                    id: toastId,
                    title: messageText,
                  }),
                  {
                    ...props,
                    ...props,
                    id: toastId,
                    dismissible: isDismissible,
                    title: messageText,
                  })
                : props,
            ))
          : this.addToast({
              title: messageText,
              ...restProps,
              dismissible: isDismissible,
              id: toastId,
            }),
        toastId
      );
    };
    this.dismiss = (toastId) => (
      toastId
        ? (this.dismissedToasts.add(toastId),
          requestAnimationFrame(() =>
            this.subscribers.forEach((item) =>
              item({
                id: toastId,
                dismiss: !0,
              }),
            ),
          ))
        : this.toasts.forEach((props) => {
            this.subscribers.forEach((item) =>
              item({
                id: props.id,
                dismiss: !0,
              }),
            );
          }),
      toastId
    );
    this.message = (messageText, options) =>
      this.create({
        ...options,
        message: messageText,
      });
    this.error = (messageText, options) =>
      this.create({
        ...options,
        message: messageText,
        type: "error",
      });
    this.success = (messageText, options) =>
      this.create({
        ...options,
        type: "success",
        message: messageText,
      });
    this.info = (messageText, options) =>
      this.create({
        ...options,
        type: "info",
        message: messageText,
      });
    this.warning = (messageText, options) =>
      this.create({
        ...options,
        type: "warning",
        message: messageText,
      });
    this.loading = (messageText, options) =>
      this.create({
        ...options,
        type: "loading",
        message: messageText,
      });
    this.promise = (promiseOrFn, handlers) => {
      if (!handlers) return;
      let loadingToastId;
      if (handlers.loading !== void 0) {
        loadingToastId = this.create({
          ...handlers,
          promise: promiseOrFn,
          type: "loading",
          message: handlers.loading,
          description:
            typeof handlers.description != "function" ? handlers.description : void 0,
        });
      }
      const resolvedPromise = Promise.resolve(promiseOrFn instanceof Function ? promiseOrFn() : promiseOrFn);
      let shouldDismissOnComplete = loadingToastId !== void 0,
        promiseResult;
      const promiseChain = resolvedPromise.then(async (response) => {
          if (((promiseResult = ["resolve", response]), a.isValidElement(response))) {
            shouldDismissOnComplete = !1;
            this.create({
              id: loadingToastId,
              type: "default",
              message: response,
            });
          } else if (se(response) && !response.ok) {
            shouldDismissOnComplete = !1;
            const errorMessage =
                typeof handlers.error == "function"
                  ? await handlers.error(`HTTP error! status: ${response.status}`)
                  : handlers.error,
              errorDescription =
                typeof handlers.description == "function"
                  ? await handlers.description(
                      `HTTP error! status: ${response.status}`,
                    )
                  : handlers.description,
              errorProps =
                typeof errorMessage == "object" && !a.isValidElement(errorMessage)
                  ? errorMessage
                  : {
                      message: errorMessage,
                    };
            this.create({
              id: loadingToastId,
              type: "error",
              description: errorDescription,
              ...errorProps,
            });
          } else if (response instanceof Error) {
            shouldDismissOnComplete = !1;
            const errorMessage =
                typeof handlers.error == "function"
                  ? await handlers.error(response)
                  : handlers.error,
              errorDescription =
                typeof handlers.description == "function"
                  ? await handlers.description(response)
                  : handlers.description,
              errorProps =
                typeof errorMessage == "object" && !a.isValidElement(errorMessage)
                  ? errorMessage
                  : {
                      message: errorMessage,
                    };
            this.create({
              id: loadingToastId,
              type: "error",
              description: errorDescription,
              ...errorProps,
            });
          } else if (handlers.success !== void 0) {
            shouldDismissOnComplete = !1;
            const successMessage =
                typeof handlers.success == "function"
                  ? await handlers.success(response)
                  : handlers.success,
              successDescription =
                typeof handlers.description == "function"
                  ? await handlers.description(response)
                  : handlers.description,
              successProps =
                typeof successMessage == "object" && !a.isValidElement(successMessage)
                  ? successMessage
                  : {
                      message: successMessage,
                    };
            this.create({
              id: loadingToastId,
              type: "success",
              description: successDescription,
              ...successProps,
            });
          }
        })
          .catch(async (error) => {
            if (((promiseResult = ["reject", error]), handlers.error !== void 0)) {
              shouldDismissOnComplete = !1;
              const errorMessage =
                  typeof handlers.error == "function" ? await handlers.error(error) : handlers.error,
                errorDescription =
                  typeof handlers.description == "function"
                    ? await handlers.description(error)
                    : handlers.description,
                errorProps =
                  typeof errorMessage == "object" && !a.isValidElement(errorMessage)
                    ? errorMessage
                    : {
                        message: errorMessage,
                      };
              this.create({
                id: loadingToastId,
                type: "error",
                description: errorDescription,
                ...errorProps,
              });
            }
          })
          .finally(() => {
            if (shouldDismissOnComplete) {
              (this.dismiss(loadingToastId), (loadingToastId = void 0));
            }
            handlers.finally == null || handlers.finally.call(handlers);
          }),
        unwrapPromise = () =>
          new Promise((resolve, reject) =>
            promiseChain.then(() => (promiseResult[0] === "reject" ? reject(promiseResult[1]) : resolve(promiseResult[1]))).catch(reject),
          );
      return typeof loadingToastId != "string" && typeof loadingToastId != "number"
        ? {
            unwrap: unwrapPromise,
          }
        : Object.assign(loadingToastId, {
            unwrap: unwrapPromise,
          });
    };
    this.custom = (renderFn, options) => {
      const customToastId = options?.id || xt++;
      return (
        this.create({
          jsx: renderFn(customToastId),
          id: customToastId,
          ...options,
        }),
        customToastId
      );
    };
    this.getActiveToasts = () =>
      this.toasts.filter((props) => !this.dismissedToasts.has(props.id));
    this.subscribers = [];
    this.toasts = [];
    this.dismissedToasts = new Set();
  }
}

/* ---- Toast Singleton & Public API ---- */
const S = new ae(),
  oe = (message, options) => {
    const toastId = options?.id || xt++;
    return (
      S.addToast({
        title: message,
        ...options,
        id: toastId,
      }),
      toastId
    );
  },
  se = (value) => {
    return (
      value &&
      typeof value == "object" &&
      "ok" in value &&
      typeof value.ok == "boolean" &&
      "status" in value &&
      typeof value.status == "number"
    );
  },
  ne = oe,
  re = () => S.toasts,
  ie = () => S.getActiveToasts(),
  we = Object.assign(
    ne,
    {
      success: S.success,
      info: S.info,
      warning: S.warning,
      error: S.error,
      custom: S.custom,
      message: S.message,
      promise: S.promise,
      dismiss: S.dismiss,
      loading: S.loading,
    },
    {
      getHistory: re,
      getToasts: ie,
    },
  );

/* ---- Sonner Toast CSS Styles ---- */
Xt(
  "[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}",
);

/* ---- Action Button Label Check ---- */
function mt(props) {
  return props.label !== void 0;
}

/* ---- Toast Configuration Constants ---- */
const le = 3,
  de = "24px",
  ce = "16px",
  Mt = 4e3,
  ue = 356,
  fe = 14,
  me = 45,
  pe = 200;

/* ---- CSS Class Name Joiner Utility ---- */
function H(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

/* ---- Parse Position String into Directions ---- */
function ge(positionStr) {
  const [yPosition, xPosition] = positionStr.split("-"),
    directions = [];
  return (yPosition && directions.push(yPosition), xPosition && directions.push(xPosition), directions);
}

/* ---- Individual Toast Component ---- */
const he = (props) => {
  var o, e, s, C, u, g, _, b, i;
  const {
      invert: T,
      toast: t,
      unstyled: x,
      interacting: O,
      setHeights: E,
      visibleToasts: pt,
      heights: U,
      index: d,
      toasts: ot,
      expanded: X,
      removeToast: st,
      defaultRichColors: gt,
      closeButton: z,
      style: Z,
      cancelButtonStyle: Y,
      actionButtonStyle: ht,
      className: nt = "",
      descriptionClassName: bt = "",
      duration: tt,
      position: A,
      gap: rt,
      expandByDefault: et,
      classNames: c,
      icons: v,
      closeButtonAriaLabel: j = "Close toast",
    } = props,
    [swipeAxis, setSwipeAxis] = a.useState(null),
    [swipeDirection, setSwipeDirection] = a.useState(null),
    [isMounted, setIsMounted] = a.useState(!1),
    [isRemoved, setIsRemoved] = a.useState(!1),
    [isSwiping, setIsSwiping] = a.useState(!1),
    [isSwipeOut, setIsSwipeOut] = a.useState(!1),
    [isSwiped, setIsSwiped] = a.useState(!1),
    [removedOffset, setRemovedOffset] = a.useState(0),
    [toastHeight, setToastHeight] = a.useState(0),
    remainingDuration = a.useRef(t.duration || tt || Mt),
    pointerDownTime = a.useRef(null),
    toastRef = a.useRef(null),
    isFirstToast = d === 0,
    isVisible = d + 1 <= pt,
    toastType = t.type,
    isDismissible = t.dismissible !== !1,
    toastClassName = t.className || "",
    toastDescClassName = t.descriptionClassName || "",
    heightIndex = a.useMemo(
      () => U.findIndex((heightEntry) => heightEntry.toastId === t.id) || 0,
      [U, t.id],
    ),
    shouldShowCloseButton = a.useMemo(() => {
      var heightEntry;
      return (heightEntry = t.closeButton) != null ? heightEntry : z;
    }, [t.closeButton, z]),
    effectiveDuration = a.useMemo(() => t.duration || tt || Mt, [t.duration, tt]),
    pauseStartTime = a.useRef(0),
    currentOffset = a.useRef(0),
    lastPauseTimestamp = a.useRef(0),
    pointerStartPosition = a.useRef(null),
    [yPositionPart, xPositionPart] = A.split("-"),
    toastsBeforeOffset = a.useMemo(
      () => U.reduce((item, acc, heightIdx) => (heightIdx >= heightIndex ? item : item + acc.height), 0),
      [U, heightIndex],
    ),
    isDocumentHidden = ee(),
    isInverted = t.invert || T,
    isLoadingType = toastType === "loading";
  currentOffset.current = a.useMemo(() => heightIndex * rt + toastsBeforeOffset, [heightIndex, toastsBeforeOffset]);
  a.useEffect(() => {
    remainingDuration.current = effectiveDuration;
  }, [effectiveDuration]);
  a.useEffect(() => {
    setIsMounted(!0);
  }, []);
  a.useEffect(() => {
    const toastElement = toastRef.current;
    if (toastElement) {
      const measuredHeight = toastElement.getBoundingClientRect().height;
      return (
        setToastHeight(measuredHeight),
        E((currentHeights) => [
          {
            toastId: t.id,
            height: measuredHeight,
            position: t.position,
          },
          ...currentHeights,
        ]),
        () => E((currentHeights) => currentHeights.filter((item) => item.toastId !== t.id))
      );
    }
  }, [E, t.id]);
  a.useLayoutEffect(() => {
    if (!isMounted) return;
    const toastElement = toastRef.current,
      previousHeight = toastElement.style.height;
    toastElement.style.height = "auto";
    const newHeight = toastElement.getBoundingClientRect().height;
    toastElement.style.height = previousHeight;
    setToastHeight(newHeight);
    E((currentHeights) =>
      currentHeights.find((item) => item.toastId === t.id)
        ? currentHeights.map((item) =>
            item.toastId === t.id
              ? {
                  ...item,
                  height: newHeight,
                }
              : item,
          )
        : [
            {
              toastId: t.id,
              height: newHeight,
              position: t.position,
            },
            ...currentHeights,
          ],
    );
  }, [isMounted, t.title, t.description, E, t.id, t.jsx, t.action, t.cancel]);
  const dismissToast = a.useCallback(() => {
    setIsRemoved(!0);
    setRemovedOffset(currentOffset.current);
    E((currentHeights) => currentHeights.filter((item) => item.toastId !== t.id));
    setTimeout(() => {
      st(t);
    }, pe);
  }, [t, st, E, currentOffset]);
  a.useEffect(() => {
    if (
      (t.promise && toastType === "loading") ||
      t.duration === 1 / 0 ||
      t.type === "loading"
    )
      return;
    let autoCloseTimer;
    return (
      X || O || isDocumentHidden
        ? (() => {
            if (lastPauseTimestamp.current < pauseStartTime.current) {
              const elapsed = new Date().getTime() - pauseStartTime.current;
              remainingDuration.current = remainingDuration.current - elapsed;
            }
            lastPauseTimestamp.current = new Date().getTime();
          })()
        : remainingDuration.current !== 1 / 0 &&
          ((pauseStartTime.current = new Date().getTime()),
          (autoCloseTimer = setTimeout(() => {
            t.onAutoClose == null || t.onAutoClose.call(t, t);
            dismissToast();
          }, remainingDuration.current))),
      () => clearTimeout(autoCloseTimer)
    );
  }, [X, O, t, toastType, isDocumentHidden, dismissToast]);
  a.useEffect(() => {
    if (t.delete) {
      (dismissToast(), t.onDismiss == null || t.onDismiss.call(t, t));
    }
  }, [dismissToast, t.delete]);
  function renderLoadingIcon() {
    var loaderClassRef;
    if (v?.loading) {
      var loaderClassRef2;
      return a.createElement(
        "div",
        {
          className: H(
            c?.loader,
            t == null || (loaderClassRef2 = t.classNames) == null ? void 0 : loaderClassRef2.loader,
            "sonner-loader",
          ),
          "data-visible": toastType === "loading",
        },
        v.loading,
      );
    }
    return a.createElement(qt, {
      className: H(
        c?.loader,
        t == null || (loaderClassRef = t.classNames) == null ? void 0 : loaderClassRef.loader,
      ),
      visible: toastType === "loading",
    });
  }
  const toastIcon = t.icon || v?.[toastType] || Wt(toastType);
  var Dt, Rt;
  return a.createElement(
    "li",
    {
      tabIndex: 0,
      ref: toastRef,
      className: H(
        nt,
        toastClassName,
        c?.toast,
        t == null || (o = t.classNames) == null ? void 0 : o.toast,
        c?.default,
        c?.[toastType],
        t == null || (e = t.classNames) == null ? void 0 : e[toastType],
      ),
      "data-sonner-toast": "",
      "data-rich-colors": (Dt = t.richColors) != null ? Dt : gt,
      "data-styled": !(t.jsx || t.unstyled || x),
      "data-mounted": isMounted,
      "data-promise": !!t.promise,
      "data-swiped": isSwiped,
      "data-removed": isRemoved,
      "data-visible": isVisible,
      "data-y-position": yPositionPart,
      "data-x-position": xPositionPart,
      "data-index": d,
      "data-front": isFirstToast,
      "data-swiping": isSwiping,
      "data-dismissible": isDismissible,
      "data-type": toastType,
      "data-invert": isInverted,
      "data-swipe-out": isSwipeOut,
      "data-swipe-direction": swipeDirection,
      "data-expanded": !!(X || (et && isMounted)),
      "data-testid": t.testId,
      style: {
        "--index": d,
        "--toasts-before": d,
        "--z-index": ot.length - d,
        "--offset": `${isRemoved ? removedOffset : currentOffset.current}px`,
        "--initial-height": et ? "auto" : `${toastHeight}px`,
        ...Z,
        ...t.style,
      },
      onDragEnd: () => {
        setIsSwiping(!1);
        setSwipeAxis(null);
        pointerStartPosition.current = null;
      },
      onPointerDown: (event) => {
        if (event.button !== 2) {
          isLoadingType ||
            !isDismissible ||
            ((pointerDownTime.current = new Date()),
            setRemovedOffset(currentOffset.current),
            event.target.setPointerCapture(event.pointerId),
            event.target.tagName !== "BUTTON" &&
              (setIsSwiping(!0),
              (pointerStartPosition.current = {
                x: event.clientX,
                y: event.clientY,
              })));
        }
      },
      onPointerUp: () => {
        var refResult, refResult2, timeRef;
        if (isSwipeOut || !isDismissible) return;
        pointerStartPosition.current = null;
        const swipeAmountX = Number(
            ((refResult = toastRef.current) == null
              ? void 0
              : refResult.style
                  .getPropertyValue("--swipe-amount-x")
                  .replace("px", "")) || 0,
          ),
          swipeAmountY = Number(
            ((refResult2 = toastRef.current) == null
              ? void 0
              : refResult2.style
                  .getPropertyValue("--swipe-amount-y")
                  .replace("px", "")) || 0,
          ),
          elapsedMs =
            new Date().getTime() -
            ((timeRef = pointerDownTime.current) == null ? void 0 : timeRef.getTime()),
          swipeAmount = swipeAxis === "x" ? swipeAmountX : swipeAmountY,
          swipeVelocity = Math.abs(swipeAmount) / elapsedMs;
        if (Math.abs(swipeAmount) >= me || swipeVelocity > 0.11) {
          setRemovedOffset(currentOffset.current);
          t.onDismiss == null || t.onDismiss.call(t, t);
          setSwipeDirection(swipeAxis === "x" ? (swipeAmountX > 0 ? "right" : "left") : swipeAmountY > 0 ? "down" : "up");
          dismissToast();
          setIsSwipeOut(!0);
          return;
        } else {
          var toastEl1, toastEl2;
          (toastEl1 = toastRef.current) == null ||
            toastEl1.style.setProperty("--swipe-amount-x", "0px");
          (toastEl2 = toastRef.current) == null ||
            toastEl2.style.setProperty("--swipe-amount-y", "0px");
        }
        setIsSwiped(!1);
        setIsSwiping(!1);
        setSwipeAxis(null);
      },
      onPointerMove: (moveEvent) => {
        var selectionRef, toastElX, toastElY;
        if (
          !pointerStartPosition.current ||
          !isDismissible ||
          ((selectionRef = window.getSelection()) == null ? void 0 : selectionRef.toString().length) >
            0
        )
          return;
        const deltaY = moveEvent.clientY - pointerStartPosition.current.y,
          deltaX = moveEvent.clientX - pointerStartPosition.current.x;
        var swipeDirsOverride;
        const allowedSwipeDirections = (swipeDirsOverride = props.swipeDirections) != null ? swipeDirsOverride : ge(A);
        if (!swipeAxis && (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
          setSwipeAxis(Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y");
        }
        let swipeOffset = {
          x: 0,
          y: 0,
        };
        const dampingFactor = (distance) => 1 / (1.5 + Math.abs(distance) / 20);
        if (swipeAxis === "y") {
          if (allowedSwipeDirections.includes("top") || allowedSwipeDirections.includes("bottom"))
            if ((allowedSwipeDirections.includes("top") && deltaY < 0) || (allowedSwipeDirections.includes("bottom") && deltaY > 0))
              swipeOffset.y = deltaY;
            else {
              const dampedDelta = deltaY * dampingFactor(deltaY);
              swipeOffset.y = Math.abs(dampedDelta) < Math.abs(deltaY) ? dampedDelta : deltaY;
            }
        } else if (swipeAxis === "x" && (allowedSwipeDirections.includes("left") || allowedSwipeDirections.includes("right")))
          if ((allowedSwipeDirections.includes("left") && deltaX < 0) || (allowedSwipeDirections.includes("right") && deltaX > 0))
            swipeOffset.x = deltaX;
          else {
            const dampedDelta = deltaX * dampingFactor(deltaX);
            swipeOffset.x = Math.abs(dampedDelta) < Math.abs(deltaX) ? dampedDelta : deltaX;
          }
        if (Math.abs(swipeOffset.x) > 0 || Math.abs(swipeOffset.y) > 0) {
          setIsSwiped(!0);
        }
        (toastElX = toastRef.current) == null ||
          toastElX.style.setProperty("--swipe-amount-x", `${swipeOffset.x}px`);
        (toastElY = toastRef.current) == null ||
          toastElY.style.setProperty("--swipe-amount-y", `${swipeOffset.y}px`);
      },
    },
    shouldShowCloseButton && !t.jsx && toastType !== "loading"
      ? a.createElement(
          "button",
          {
            "aria-label": j,
            "data-disabled": isLoadingType,
            "data-close-button": !0,
            onClick:
              isLoadingType || !isDismissible
                ? () => {}
                : () => {
                    dismissToast();
                    t.onDismiss == null || t.onDismiss.call(t, t);
                  },
            className: H(
              c?.closeButton,
              t == null || (s = t.classNames) == null ? void 0 : s.closeButton,
            ),
          },
          (Rt = v?.close) != null ? Rt : te,
        )
      : null,
    (toastType || t.icon || t.promise) && t.icon !== null && (v?.[toastType] !== null || t.icon)
      ? a.createElement(
          "div",
          {
            "data-icon": "",
            className: H(
              c?.icon,
              t == null || (C = t.classNames) == null ? void 0 : C.icon,
            ),
          },
          t.promise || (t.type === "loading" && !t.icon)
            ? t.icon || renderLoadingIcon()
            : null,
          t.type !== "loading" ? toastIcon : null,
        )
      : null,
    a.createElement(
      "div",
      {
        "data-content": "",
        className: H(
          c?.content,
          t == null || (u = t.classNames) == null ? void 0 : u.content,
        ),
      },
      a.createElement(
        "div",
        {
          "data-title": "",
          className: H(
            c?.title,
            t == null || (g = t.classNames) == null ? void 0 : g.title,
          ),
        },
        t.jsx ? t.jsx : typeof t.title == "function" ? t.title() : t.title,
      ),
      t.description
        ? a.createElement(
            "div",
            {
              "data-description": "",
              className: H(
                bt,
                toastDescClassName,
                c?.description,
                t == null || (_ = t.classNames) == null
                  ? void 0
                  : _.description,
              ),
            },
            typeof t.description == "function"
              ? t.description()
              : t.description,
          )
        : null,
    ),
    a.isValidElement(t.cancel)
      ? t.cancel
      : t.cancel && mt(t.cancel)
        ? a.createElement(
            "button",
            {
              "data-button": !0,
              "data-cancel": !0,
              style: t.cancelButtonStyle || Y,
              onClick: (clickEvent) => {
                if (mt(t.cancel) && isDismissible) {
                  (t.cancel.onClick == null ||
                    t.cancel.onClick.call(t.cancel, clickEvent),
                    dismissToast());
                }
              },
              className: H(
                c?.cancelButton,
                t == null || (b = t.classNames) == null
                  ? void 0
                  : b.cancelButton,
              ),
            },
            t.cancel.label,
          )
        : null,
    a.isValidElement(t.action)
      ? t.action
      : t.action && mt(t.action)
        ? a.createElement(
            "button",
            {
              "data-button": !0,
              "data-action": !0,
              style: t.actionButtonStyle || ht,
              onClick: (clickEvent) => {
                if (mt(t.action)) {
                  (t.action.onClick == null ||
                    t.action.onClick.call(t.action, clickEvent),
                    !clickEvent.defaultPrevented && dismissToast());
                }
              },
              className: H(
                c?.actionButton,
                t == null || (i = t.classNames) == null
                  ? void 0
                  : i.actionButton,
              ),
            },
            t.action.label,
          )
        : null,
  );
};

/* ---- Get Document Direction ---- */
function It() {
  if (typeof window > "u" || typeof document > "u") return "ltr";
  const dirAttribute = document.documentElement.getAttribute("dir");
  return dirAttribute === "auto" || !dirAttribute
    ? window.getComputedStyle(document.documentElement).direction
    : dirAttribute;
}

/* ---- Compute Offset CSS Variables from Config ---- */
function be(desktopOffset, mobileOffset) {
  const cssVars = {};
  return (
    [desktopOffset, mobileOffset].forEach((item, index) => {
      const isMobile = index === 1,
        varPrefix = isMobile ? "--mobile-offset" : "--offset",
        defaultValue = isMobile ? ce : de;
      function applyUniformOffset(offsetValue) {
        ["top", "right", "bottom", "left"].forEach((item) => {
          cssVars[`${varPrefix}-${item}`] = typeof offsetValue == "number" ? `${offsetValue}px` : offsetValue;
        });
      }
      typeof item == "number" || typeof item == "string"
        ? applyUniformOffset(item)
        : typeof item == "object"
          ? ["top", "right", "bottom", "left"].forEach((item) => {
              item[item] === void 0
                ? (cssVars[`${varPrefix}-${item}`] = defaultValue)
                : (cssVars[`${varPrefix}-${item}`] =
                    typeof item[item] == "number"
                      ? `${item[item]}px`
                      : item[item]);
            })
          : applyUniformOffset(defaultValue);
    }),
    cssVars
  );
}

/* ---- Toaster Container Component ---- */
const xe = a.forwardRef(function (toasterProps, forwardedRef) {
  const {
      id: toasterId,
      invert: C,
      position: defaultPosition = "bottom-right",
      hotkey: hotkeyKeys = ["altKey", "KeyT"],
      expand: expandByDefault,
      closeButton: showCloseButton,
      className: containerClassName,
      offset: desktopOffset,
      mobileOffset: mobileOffsetConfig,
      theme: themeConfig = "light",
      richColors: useRichColors,
      duration: defaultDuration,
      style: containerStyle,
      visibleToasts: maxVisibleToasts = le,
      toastOptions: toastOptionOverrides,
      dir: directionConfig = It(),
      gap: gapSize = fe,
      icons: customIcons,
      containerAriaLabel: ariaLabel = "Notifications",
    } = toasterProps,
    [allToasts, setAllToasts] = a.useState([]),
    filteredToasts = a.useMemo(
      () =>
        toasterId
          ? allToasts.filter((item) => item.toasterId === toasterId)
          : allToasts.filter((item) => !item.toasterId),
      [allToasts, toasterId],
    ),
    uniquePositions = a.useMemo(
      () =>
        Array.from(
          new Set(
            [defaultPosition].concat(
              filteredToasts.filter((item) => item.position).map((item) => item.position),
            ),
          ),
        ),
      [filteredToasts, defaultPosition],
    ),
    [toastHeights, setToastHeights] = a.useState([]),
    [isExpanded, setIsExpanded] = a.useState(!1),
    [isInteracting, setIsInteracting] = a.useState(!1),
    [resolvedTheme, setResolvedTheme] = a.useState(
      themeConfig !== "system"
        ? themeConfig
        : typeof window < "u" &&
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    ),
    toasterListRef = a.useRef(null),
    hotkeyLabel = hotkeyKeys.join("+").replace(/Key/g, "").replace(/Digit/g, ""),
    previouslyFocusedElement = a.useRef(null),
    wasFocusedInsideToaster = a.useRef(!1),
    removeToastCallback = a.useCallback((props) => {
      setAllToasts((currentToasts) => {
        var matchingToast;
        return (
          ((matchingToast = currentToasts.find((props) => props.id === props.id)) != null &&
            matchingToast.delete) ||
            S.dismiss(props.id),
          currentToasts.filter(({ id: toastId }) => toastId !== props.id)
        );
      });
    }, []);
  return (
    a.useEffect(
      () =>
        S.subscribe((props) => {
          if (props.dismiss) {
            requestAnimationFrame(() => {
              setAllToasts((currentToasts) =>
                currentToasts.map((props) =>
                  props.id === props.id
                    ? {
                        ...props,
                        delete: !0,
                      }
                    : props,
                ),
              );
            });
            return;
          }
          setTimeout(() => {
            Ut.flushSync(() => {
              setAllToasts((currentToasts) => {
                const existingIndex = currentToasts.findIndex((props) => props.id === props.id);
                return existingIndex !== -1
                  ? [
                      ...currentToasts.slice(0, existingIndex),
                      {
                        ...currentToasts[existingIndex],
                        ...props,
                      },
                      ...currentToasts.slice(existingIndex + 1),
                    ]
                  : [props, ...currentToasts];
              });
            });
          });
        }),
      [allToasts],
    ),
    a.useEffect(() => {
      if (themeConfig !== "system") {
        setResolvedTheme(themeConfig);
        return;
      }
      if (
        (themeConfig === "system" &&
          (window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
            ? setResolvedTheme("dark")
            : setResolvedTheme("light")),
        typeof window > "u")
      )
        return;
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      try {
        darkModeQuery.addEventListener("change", ({ matches: isDark }) => {
          setResolvedTheme(isDark ? "dark" : "light");
        });
      } catch {
        darkModeQuery.addListener(({ matches: isDark }) => {
          try {
            setResolvedTheme(isDark ? "dark" : "light");
          } catch (err) {
            console.error(err);
          }
        });
      }
    }, [themeConfig]),
    a.useEffect(() => {
      if (allToasts.length <= 1) {
        setIsExpanded(!1);
      }
    }, [allToasts]),
    a.useEffect(() => {
      const handleKeyDown = (keyEvent) => {
        var toasterRef;
        if (hotkeyKeys.every((item) => keyEvent[item] || keyEvent.code === item)) {
          var toasterEl;
          setIsExpanded(!0);
          (toasterEl = toasterListRef.current) == null || toasterEl.focus();
        }
        if (
          keyEvent.code === "Escape" &&
          (document.activeElement === toasterListRef.current ||
            ((toasterRef = toasterListRef.current) != null && toasterRef.contains(document.activeElement)))
        ) {
          setIsExpanded(!1);
        }
      };
      return (
        document.addEventListener("keydown", handleKeyDown),
        () => document.removeEventListener("keydown", handleKeyDown)
      );
    }, [hotkeyKeys]),
    a.useEffect(() => {
      if (toasterListRef.current)
        return () => {
          if (previouslyFocusedElement.current) {
            (previouslyFocusedElement.current.focus({
              preventScroll: !0,
            }),
              (previouslyFocusedElement.current = null),
              (wasFocusedInsideToaster.current = !1));
          }
        };
    }, [toasterListRef.current]),
    a.createElement(
      "section",
      {
        ref: forwardedRef,
        "aria-label": `${ariaLabel} ${hotkeyLabel}`,
        tabIndex: -1,
        "aria-live": "polite",
        "aria-relevant": "additions text",
        "aria-atomic": "false",
        suppressHydrationWarning: !0,
      },
      uniquePositions.map((item, index) => {
        var frontHeight;
        const [yPos, xPos] = item.split("-");
        return filteredToasts.length
          ? a.createElement(
              "ol",
              {
                key: item,
                dir: directionConfig === "auto" ? It() : directionConfig,
                tabIndex: -1,
                ref: toasterListRef,
                className: containerClassName,
                "data-sonner-toaster": !0,
                "data-sonner-theme": resolvedTheme,
                "data-y-position": yPos,
                "data-x-position": xPos,
                style: {
                  "--front-toast-height": `${((frontHeight = toastHeights[0]) == null ? void 0 : frontHeight.height) || 0}px`,
                  "--width": `${ue}px`,
                  "--gap": `${gapSize}px`,
                  ...containerStyle,
                  ...be(desktopOffset, mobileOffsetConfig),
                },
                onBlur: (event) => {
                  if (
                    wasFocusedInsideToaster.current &&
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    ((wasFocusedInsideToaster.current = !1),
                      previouslyFocusedElement.current &&
                        (previouslyFocusedElement.current.focus({
                          preventScroll: !0,
                        }),
                        (previouslyFocusedElement.current = null)));
                  }
                },
                onFocus: (event) => {
                  (event.target instanceof HTMLElement &&
                    event.target.dataset.dismissible === "false") ||
                    wasFocusedInsideToaster.current ||
                    ((wasFocusedInsideToaster.current = !0), (previouslyFocusedElement.current = event.relatedTarget));
                },
                onMouseEnter: () => setIsExpanded(!0),
                onMouseMove: () => setIsExpanded(!0),
                onMouseLeave: () => {
                  isInteracting || setIsExpanded(!1);
                },
                onDragEnd: () => setIsExpanded(!1),
                onPointerDown: (event) => {
                  (event.target instanceof HTMLElement &&
                    event.target.dataset.dismissible === "false") ||
                    setIsInteracting(!0);
                },
                onPointerUp: () => setIsInteracting(!1),
              },
              filteredToasts.filter(
                (item) =>
                  (!item.position && index === 0) || item.position === item,
              ).map((item, index) => {
                var durationOverride, closeButtonOverride;
                return a.createElement(he, {
                  key: item.id,
                  icons: customIcons,
                  index: index,
                  toast: item,
                  defaultRichColors: useRichColors,
                  duration: (durationOverride = toastOptionOverrides?.duration) != null ? durationOverride : defaultDuration,
                  className: toastOptionOverrides?.className,
                  descriptionClassName: toastOptionOverrides?.descriptionClassName,
                  invert: C,
                  visibleToasts: maxVisibleToasts,
                  closeButton: (closeButtonOverride = toastOptionOverrides?.closeButton) != null ? closeButtonOverride : showCloseButton,
                  interacting: isInteracting,
                  position: item,
                  style: toastOptionOverrides?.style,
                  unstyled: toastOptionOverrides?.unstyled,
                  classNames: toastOptionOverrides?.classNames,
                  cancelButtonStyle: toastOptionOverrides?.cancelButtonStyle,
                  actionButtonStyle: toastOptionOverrides?.actionButtonStyle,
                  closeButtonAriaLabel: toastOptionOverrides?.closeButtonAriaLabel,
                  removeToast: removeToastCallback,
                  toasts: filteredToasts.filter((item) => item.position == item.position),
                  heights: toastHeights.filter((item) => item.position == item.position),
                  setHeights: setToastHeights,
                  expandByDefault: expandByDefault,
                  gap: gapSize,
                  expanded: isExpanded,
                  swipeDirections: toasterProps.swipeDirections,
                });
              }),
            )
          : null;
      }),
    )
  );
});

/* ---- Exports ---- */
export { xe as T, we as t };
