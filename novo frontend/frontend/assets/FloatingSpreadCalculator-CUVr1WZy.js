/* ---- Imports ---- */
import {
  a as s,
  j as e,
  c as T,
  B as w,
  e as v,
  I as j,
} from "./index-Bx06KCE-.js";
import { t as M } from "./index-mwGaaYkF.js";
import { F as U } from "./ArrowTopRightOnSquareIcon-dBVxg5nU.js";
import { F as G } from "./ArrowPathIcon-Ek2z4Juv.js";
import { F as J } from "./XMarkIcon-mqVC0SZA.js";
import { F as z } from "./SparklesIcon-DU5U9T8X.js";

/* ---- Calculator Icon SVG Component ---- */
function CalculatorIconRender(
  { title: titleText, titleId: titleId, ...restProps },
  ref,
) {
  return s.createElement(
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
        ref: ref,
        "aria-labelledby": titleId,
      },
      restProps,
    ),
    titleText
      ? s.createElement(
          "title",
          {
            id: titleId,
          },
          titleText,
        )
      : null,
    s.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z",
    }),
  );
}

/* ---- Calculator Icon (forwarded ref) ---- */
const CalculatorIcon = s.forwardRef(CalculatorIconRender),
  /* ---- Initial Form Values ---- */
  INITIAL_FORM_VALUES = {
    openSpot: "",
    openShort: "",
    closeSpot: "",
    closeShort: "",
  },
  /* ---- Spread Formatting Utility ---- */
  formatSpreadValue = (spreadValue) => {
    return spreadValue === null ? "--" : spreadValue.toFixed(3);
  },
  /* ---- Spread Color Class Utility ---- */
  getSpreadColorClass = (spreadValue) => {
    if (spreadValue === null) {
      return "text-gray-400";
    }
    if (spreadValue > 0) {
      return "text-emerald-400";
    }
    if (spreadValue < 0) {
      return "text-rose-400";
    }
    return "text-gray-200";
  },
  /* ---- Copy Styles to Popout Window ---- */
  copyStylesToPopoutDocument = (props) => {
    const { document: popoutDocument } = props;
    document
      .querySelectorAll('style, link[rel="stylesheet"]')
      .forEach((styleElement) => {
        const clonedElement = styleElement.cloneNode(true);
        popoutDocument.head.appendChild(clonedElement);
      });
    const inlineStylesText = Array.from(document.styleSheets).map(
      (styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules || [])
            .map((cssRule) => cssRule.cssText)
            .join("");
        } catch {
          return "";
        }
      },
    ).join(`
`);
    if (inlineStylesText.trim().length > 0) {
      const dynamicStyleElement = popoutDocument.createElement("style");
      dynamicStyleElement.textContent = inlineStylesText;
      popoutDocument.head.appendChild(dynamicStyleElement);
    }
  };

/* ---- Spread Calculator Panel Component ---- */
function SpreadCalculatorPanel({
  values: formValues,
  onChange: onFieldChange,
  onClear: onClear,
  onClose: onClose,
  onPopout: onPopout,
  entrySpread: entrySpread,
  exitSpread: exitSpread,
  finalSpread: finalSpread,
  variant: variant = "inline",
}) {
  return e.jsxs("div", {
    className: v(
      "relative w-full rounded-xl border shadow-xl ring-1 ring-black/5 transition-all",
      "bg-white/95 dark:border-dark-600 dark:bg-dark-800/95 dark:shadow-none backdrop-blur-xl",
      variant === "inline" ? "p-3" : "p-4",
    ),
    children: [
      /* ---- Header: Title + Action Buttons ---- */
      e.jsxs("div", {
        className: "mb-3 flex items-start justify-between gap-3",
        children: [
          /* ---- Title with Calculator Icon ---- */
          e.jsxs("div", {
            className: "flex items-start gap-2.5",
            children: [
              e.jsx("div", {
                className:
                  "flex size-10 items-center justify-center rounded-lg bg-black/80 text-white shadow dark:bg-dark-700",
                children: e.jsx(CalculatorIcon, {
                  className: "size-5",
                }),
              }),
              e.jsxs("div", {
                children: [
                  e.jsx("p", {
                    className:
                      "text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-dark-300",
                    children: "Spread",
                  }),
                  e.jsx("div", {
                    className: "flex items-center gap-2",
                    children: e.jsx("h3", {
                      className:
                        "text-base font-semibold text-gray-900 dark:text-dark-50",
                      children: "Calculadora",
                    }),
                  }),
                ],
              }),
            ],
          }),
          /* ---- Action Buttons (Popout, Clear, Close) ---- */
          e.jsxs("div", {
            className: "flex shrink-0 items-center gap-2",
            children: [
              variant === "inline" &&
                e.jsx(w, {
                  onClick: onPopout,
                  color: "primary",
                  variant: "soft",
                  isIcon: true,
                  className: "hidden h-10 w-10 sm:inline-flex",
                  title: "Abrir em janela flutuante",
                  children: e.jsx(U, {
                    className: "size-5",
                  }),
                }),
              e.jsx(w, {
                onClick: onClear,
                color: "neutral",
                variant: "flat",
                isIcon: true,
                className: "h-10 w-10",
                title: "Limpar campos",
                children: e.jsx(G, {
                  className: "size-5",
                }),
              }),
              onClose &&
                e.jsx(w, {
                  onClick: onClose,
                  color: "neutral",
                  variant: "flat",
                  isIcon: true,
                  className: "h-10 w-10",
                  title: "Fechar",
                  children: e.jsx(J, {
                    className: "size-5",
                  }),
                }),
            ],
          }),
        ],
      }),
      /* ---- Form Sections ---- */
      e.jsxs("div", {
        className: "space-y-3",
        children: [
          /* ---- Entry (Abertura) Section ---- */
          e.jsxs("section", {
            className:
              "rounded-lg border border-gray-100/80 bg-gray-50/70 p-3 dark:border-dark-600 dark:bg-dark-750/60",
            children: [
              /* ---- Entry Section Header ---- */
              e.jsxs("div", {
                className: "flex items-center justify-between gap-2",
                children: [
                  e.jsxs("div", {
                    className:
                      "flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-dark-100",
                    children: [
                      e.jsx(z, {
                        className: "size-4 text-primary-500",
                      }),
                      e.jsx("span", {
                        children: "Abertura",
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: v(
                      "text-sm font-semibold",
                      getSpreadColorClass(entrySpread),
                    ),
                    children: [formatSpreadValue(entrySpread), "%"],
                  }),
                ],
              }),
              /* ---- Entry Spot + Short Inputs ---- */
              e.jsxs("div", {
                className: "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2",
                children: [
                  e.jsx(j, {
                    label: "Spot",
                    type: "number",
                    inputMode: "decimal",
                    step: "0.01",
                    value: formValues.openSpot,
                    onChange: (event) =>
                      onFieldChange("openSpot", event.target.value),
                    placeholder: "0.00",
                    classNames: {
                      input:
                        "bg-white/90 dark:bg-dark-800/60 dark:border-dark-600 focus:border-primary-500",
                      label: "text-[11px] text-gray-500 dark:text-dark-300",
                    },
                  }),
                  e.jsx(j, {
                    label: "Short",
                    type: "number",
                    inputMode: "decimal",
                    step: "0.01",
                    value: formValues.openShort,
                    onChange: (event) =>
                      onFieldChange("openShort", event.target.value),
                    placeholder: "0.00",
                    classNames: {
                      input:
                        "bg-white/90 dark:bg-dark-800/60 dark:border-dark-600 focus:border-primary-500",
                      label: "text-[11px] text-gray-500 dark:text-dark-300",
                    },
                  }),
                ],
              }),
            ],
          }),
          /* ---- Exit (Fechamento) Section ---- */
          e.jsxs("section", {
            className:
              "rounded-lg border border-gray-100/80 bg-gray-50/70 p-3 dark:border-dark-600 dark:bg-dark-750/60",
            children: [
              /* ---- Exit Section Header ---- */
              e.jsxs("div", {
                className: "flex items-center justify-between gap-2",
                children: [
                  e.jsxs("div", {
                    className: v(
                      "flex items-center gap-2 text-sm font-semibold",
                      "text-gray-800 dark:text-dark-100",
                    ),
                    children: [
                      e.jsx(z, {
                        className: "size-4 text-primary-500",
                      }),
                      e.jsx("span", {
                        children: "Fechamento",
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: v(
                      "text-sm font-semibold",
                      getSpreadColorClass(exitSpread),
                    ),
                    children: [formatSpreadValue(exitSpread), "%"],
                  }),
                ],
              }),
              /* ---- Exit Spot + Short Inputs ---- */
              e.jsxs("div", {
                className: "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2",
                children: [
                  e.jsx(j, {
                    label: "Spot",
                    type: "number",
                    inputMode: "decimal",
                    step: "0.01",
                    value: formValues.closeSpot,
                    onChange: (event) =>
                      onFieldChange("closeSpot", event.target.value),
                    placeholder: "0.00",
                    classNames: {
                      input:
                        "bg-white/90 dark:bg-dark-800/60 dark:border-dark-600 focus:border-primary-500",
                      label: "text-[11px] text-gray-500 dark:text-dark-300",
                    },
                  }),
                  e.jsx(j, {
                    label: "Short",
                    type: "number",
                    inputMode: "decimal",
                    step: "0.01",
                    value: formValues.closeShort,
                    onChange: (event) =>
                      onFieldChange("closeShort", event.target.value),
                    placeholder: "0.00",
                    classNames: {
                      input:
                        "bg-white/90 dark:bg-dark-800/60 dark:border-dark-600 focus:border-primary-500",
                      label: "text-[11px] text-gray-500 dark:text-dark-300",
                    },
                  }),
                ],
              }),
            ],
          }),
          /* ---- Final Spread Display ---- */
          e.jsx("section", {
            className:
              "rounded-lg border border-primary-500/20 bg-primary-500/10 p-3 dark:border-primary-400/30 dark:bg-primary-400/10",
            children: e.jsxs("div", {
              className: "flex items-center justify-between",
              children: [
                e.jsx("div", {
                  children: e.jsx("p", {
                    className:
                      "text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-200",
                    children: "Spread final",
                  }),
                }),
                e.jsxs("div", {
                  className: v(
                    "text-3xl font-bold leading-none",
                    getSpreadColorClass(finalSpread),
                  ),
                  children: [
                    finalSpread !== null
                      ? formatSpreadValue(finalSpread)
                      : "--",
                    e.jsx("span", {
                      className:
                        "ml-1 text-sm text-gray-500 dark:text-dark-300",
                      children: "%",
                    }),
                  ],
                }),
              ],
            }),
          }),
        ],
      }),
    ],
  });
}

/* ---- Floating Spread Calculator Widget (Main Export) ---- */
function se() {
  /* ---- State: Panel visibility ---- */
  const [isOpen, setIsOpen] = s.useState(false),
    /* ---- State: Form field values ---- */
    [formValues, setFormValues] = s.useState(INITIAL_FORM_VALUES),
    /* ---- State: Popout portal container element ---- */
    [portalContainer, setPortalContainer] = s.useState(null),
    /* ---- State: Whether calculator is in popout mode ---- */
    [isPopout, setIsPopout] = s.useState(false),
    /* ---- Ref: Inline container element (for click-outside detection) ---- */
    inlineContainerRef = s.useRef(null),
    /* ---- Ref: Popout window reference ---- */
    popoutWindowRef = s.useRef(null),
    /* ---- Ref: Cleanup functions for popout event listeners ---- */
    cleanupFnsRef = s.useRef([]),
    /* ---- Parse Price: converts input string to a valid positive number or null ---- */
    parsePrice = s.useCallback((inputValue) => {
      if (!inputValue) return null;
      const parsedNumber = parseFloat(inputValue.replace(",", "."));
      return Number.isFinite(parsedNumber) && parsedNumber > 0
        ? parsedNumber
        : null;
    }, []),
    /* ---- Computed: Entry spread = (shortPrice / spotPrice - 1) * 100 ---- */
    entrySpread = s.useMemo(() => {
      const spotPrice = parsePrice(formValues.openSpot),
        shortPrice = parsePrice(formValues.openShort);
      return !spotPrice || !shortPrice
        ? null
        : (shortPrice / spotPrice - 1) * 100;
    }, [parsePrice, formValues.openShort, formValues.openSpot]),
    /* ---- Computed: Exit spread = (shortPrice / spotPrice - 1) * -100 ---- */
    exitSpread = s.useMemo(() => {
      const spotPrice = parsePrice(formValues.closeSpot),
        shortPrice = parsePrice(formValues.closeShort);
      return !spotPrice || !shortPrice
        ? null
        : (shortPrice / spotPrice - 1) * -1 * 100;
    }, [parsePrice, formValues.closeShort, formValues.closeSpot]),
    /* ---- Computed: Final spread = entry + exit ---- */
    finalSpread = s.useMemo(
      () =>
        entrySpread === null || exitSpread === null
          ? null
          : entrySpread + exitSpread,
      [entrySpread, exitSpread],
    ),
    /* ---- Handler: Update a single form field ---- */
    handleFieldChange = (fieldName, fieldValue) => {
      setFormValues((prevValues) => ({
        ...prevValues,
        [fieldName]: fieldValue,
      }));
    },
    /* ---- Handler: Clear all form fields ---- */
    handleClear = () => {
      setFormValues(INITIAL_FORM_VALUES);
    },
    /* ---- Handler: Close popout window and clean up ---- */
    closePopout = s.useCallback(() => {
      cleanupFnsRef.current.forEach((cleanupFn) => cleanupFn());
      cleanupFnsRef.current = [];
      if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
        popoutWindowRef.current.close();
      }
      popoutWindowRef.current = null;
      setPortalContainer(null);
      setIsPopout(false);
    }, []);

  /* ---- Cleanup popout on unmount ---- */
  s.useEffect(() => () => closePopout(), [closePopout]);

  /* ---- Handler: Open calculator in a popout window (PiP or fallback) ---- */
  const openPopout = s.useCallback(async () => {
      /* If popout already exists, just focus it */
      if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
        popoutWindowRef.current.focus();
        return;
      }
      let popoutWindow = null,
        isPictureInPicture = false;

      /* ---- Try Document Picture-in-Picture API first ---- */
      const pipApi = window.documentPictureInPicture;
      if (
        !!pipApi &&
        typeof pipApi.requestWindow == "function" &&
        (!pipApi.window || pipApi.window === popoutWindowRef.current)
      )
        try {
          popoutWindow = await pipApi.requestWindow({
            width: 360,
            height: 480,
          });
          isPictureInPicture = true;
        } catch (pipError) {
          console.error(
            "Erro ao abrir Picture-in-Picture do documento",
            pipError,
          );
        }

      /* ---- Fallback: open a regular popup window ---- */
      if (!popoutWindow) {
        const { availWidth: screenWidth, availHeight: screenHeight } =
            window.screen,
          windowWidth = 380,
          windowHeight = 520,
          windowLeft = Math.max(0, screenWidth - windowWidth - 24),
          windowTop = Math.max(0, screenHeight - windowHeight - 48);
        popoutWindow = window.open(
          "",
          "spreadCalcPopout",
          `width=${windowWidth},height=${windowHeight},left=${windowLeft},top=${windowTop},resizable=yes,menubar=no,toolbar=no,location=no,status=no`,
        );
      }

      /* ---- Guard: popup blocked ---- */
      if (!popoutWindow) {
        M.error(
          "Não consegui abrir a janela flutuante (verifique se o bloqueador de pop-up está ativo).",
        );
        return;
      }

      /* ---- Configure popout window document ---- */
      copyStylesToPopoutDocument(popoutWindow);
      popoutWindow.document.title = "Calculadora de Spread";
      popoutWindow.document.body.style.margin = "0";
      const isDarkMode = document.documentElement.classList.contains("dark"),
        backgroundColor =
          getComputedStyle(document.body).backgroundColor ||
          (isDarkMode ? "#0b1220" : "#f8fafc");
      popoutWindow.document.body.style.background = backgroundColor;
      popoutWindow.document.documentElement.className =
        document.documentElement.className;

      /* ---- Create the root mount element in the popout ---- */
      const popoutRootElement = popoutWindow.document.createElement("div");
      popoutRootElement.id = "spread-calc-popout-root";
      popoutRootElement.style.minHeight = "100vh";
      popoutRootElement.style.padding = "0";
      popoutRootElement.style.background = backgroundColor;
      popoutWindow.document.body.appendChild(popoutRootElement);

      /* ---- Listen for popout window close events ---- */
      const handlePopoutClose = () => closePopout();
      popoutWindow.addEventListener("pagehide", handlePopoutClose);
      popoutWindow.addEventListener("beforeunload", handlePopoutClose);
      cleanupFnsRef.current = [
        () => popoutWindow.removeEventListener("pagehide", handlePopoutClose),
        () =>
          popoutWindow.removeEventListener("beforeunload", handlePopoutClose),
      ];

      /* ---- Update state to enable portal rendering ---- */
      popoutWindowRef.current = popoutWindow;
      setPortalContainer(popoutRootElement);
      setIsPopout(true);
      setIsOpen(false);

      /* ---- Notify user ---- */
      M.success(
        isPictureInPicture
          ? "Calculadora aberta em janela flutuante (Picture-in-Picture)."
          : "Calculadora aberta em uma nova janela.",
      );
    }, [closePopout]),
    /* ---- Handler: Toggle inline panel open/closed ---- */
    toggleOpen = () => setIsOpen((wasOpen) => !wasOpen);

  /* ---- Effect: Click-outside and Escape key handling ---- */
  return (
    s.useEffect(() => {
      if (!isOpen && !isPopout) return;
      const handleClickOutside = (event) => {
          if (
            inlineContainerRef.current &&
            !inlineContainerRef.current.contains(event.target)
          ) {
            setIsOpen(false);
          }
        },
        handleKeyDown = (event) => {
          if (event.key === "Escape") {
            if (isPopout) {
              closePopout();
              return;
            }
            setIsOpen(false);
          }
        };
      return (
        document.addEventListener("mousedown", handleClickOutside),
        document.addEventListener("keydown", handleKeyDown),
        () => {
          document.removeEventListener("mousedown", handleClickOutside);
          document.removeEventListener("keydown", handleKeyDown);
        }
      );
    }, [isOpen, isPopout, closePopout]),
    /* ---- Render ---- */
    e.jsxs(e.Fragment, {
      children: [
        /* ---- Fixed-position Floating Button + Inline Panel ---- */
        e.jsxs("div", {
          ref: inlineContainerRef,
          className:
            "pointer-events-none fixed bottom-3 right-3 z-[90] flex flex-col items-end gap-2 sm:bottom-4 sm:right-4",
          children: [
            /* ---- Floating Toggle Button ---- */
            e.jsx("div", {
              className: "pointer-events-auto",
              children: e.jsx(w, {
                onClick: toggleOpen,
                unstyled: true,
                isIcon: true,
                className:
                  "flex h-10 w-10 items-center justify-center rounded-md bg-black text-white shadow-lg shadow-black/50 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:shadow-black/60 dark:bg-dark-700 dark:text-dark-50",
                title: "Abrir calculadora",
                children: e.jsx(CalculatorIcon, {
                  className: "size-5",
                }),
              }),
            }),
            /* ---- Inline Calculator Panel (shown when open) ---- */
            isOpen &&
              e.jsx("div", {
                className:
                  "pointer-events-auto w-[calc(100vw-1.5rem)] max-w-sm animate-in fade-in slide-in-from-bottom-3",
                children: e.jsx(SpreadCalculatorPanel, {
                  values: formValues,
                  onChange: handleFieldChange,
                  onClear: handleClear,
                  onClose: () => setIsOpen(false),
                  onPopout: openPopout,
                  entrySpread: entrySpread,
                  exitSpread: exitSpread,
                  finalSpread: finalSpread,
                }),
              }),
          ],
        }),
        /* ---- Popout Portal (renders calculator into external window) ---- */
        portalContainer &&
          popoutWindowRef.current &&
          !popoutWindowRef.current.closed &&
          T.createPortal(
            e.jsx("div", {
              className: "min-h-screen p-0",
              children: e.jsx(SpreadCalculatorPanel, {
                values: formValues,
                onChange: handleFieldChange,
                onClear: handleClear,
                onClose: closePopout,
                entrySpread: entrySpread,
                exitSpread: exitSpread,
                finalSpread: finalSpread,
                variant: "popout",
              }),
            }),
            portalContainer,
          ),
      ],
    })
  );
}

/* ---- Module Export ---- */
export { se as FloatingSpreadCalculator };
