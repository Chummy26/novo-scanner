import { a as n, R as T } from "./index-Bx06KCE-.js";
import {
  Y as F,
  o as x,
  y as L,
  n as j,
  P,
  Q as k,
  k as S,
  a as w,
  K as B,
} from "./use-is-mounted-D7iMJT5-.js";
import { o as A } from "./transition-Cxix63ts.js";

/* ---- Parent Label ID Context (for nested label providers) ---- */
let I = n.createContext(void 0);
function M() {
  return n.useContext(I);
}

/* ---- Label Context ---- */
let b = n.createContext(null);
b.displayName = "LabelContext";

/* ---- useLabelContext (required) ---- */
function y() {
  let labelContext = n.useContext(b);
  if (labelContext === null) {
    let error = new Error(
      "You used a <Label /> component, but it is not inside a relevant parent.",
    );
    throw (Error.captureStackTrace && Error.captureStackTrace(error, y), error);
  }
  return labelContext;
}

/* ---- Resolve label IDs from context ---- */
function N(additionalIds) {
  var contextValue, labelValue, length;
  let parentLabelId =
    (labelValue = (contextValue = n.useContext(b)) == null ? void 0 : contextValue.value) != null ? labelValue : void 0;
  return ((length = additionalIds?.length) != null ? length : 0) > 0
    ? [parentLabelId, ...additionalIds].filter(Boolean).join(" ")
    : parentLabelId;
}

/* ---- useLabels Hook (manages label registration and provides LabelProvider) ---- */
function Q({ inherit: shouldInherit = !1 } = {}) {
  let parentLabelId = N(),
    [registeredIds, setRegisteredIds] = n.useState([]),
    allLabelIds = shouldInherit ? [parentLabelId, ...registeredIds].filter(Boolean) : registeredIds;
  return [
    allLabelIds.length > 0 ? allLabelIds.join(" ") : void 0,
    n.useMemo(
      () =>
        function (providerProps) {
          let registerLabel = x(
              (labelId) => (
                setRegisteredIds((currentIds) => [...currentIds, labelId]),
                () =>
                  setRegisteredIds((currentIds) => {
                    let updatedIds = currentIds.slice(),
                      removeIndex = updatedIds.indexOf(labelId);
                    return (removeIndex !== -1 && updatedIds.splice(removeIndex, 1), updatedIds);
                  })
              ),
            ),
            contextValue = n.useMemo(
              () => ({
                register: registerLabel,
                slot: providerProps.slot,
                name: providerProps.name,
                props: providerProps.props,
                value: providerProps.value,
              }),
              [registerLabel, providerProps.slot, providerProps.name, providerProps.props, providerProps.value],
            );
          return T.createElement(
            b.Provider,
            {
              value: contextValue,
            },
            providerProps.children,
          );
        },
      [setRegisteredIds],
    ),
  ];
}

/* ---- Label Component ---- */
let O = "label";
function R(props, ref) {
  var htmlForFallback;
  let generatedId = n.useId(),
    labelContext = y(),
    parentHtmlFor = M(),
    isDisabled = A(),
    {
      id: labelId = `headlessui-label-${generatedId}`,
      htmlFor: htmlFor = parentHtmlFor ?? ((htmlForFallback = labelContext.props) == null ? void 0 : htmlForFallback.htmlFor),
      passive: isPassive = !1,
      ...restProps
    } = props,
    mergedRef = L(ref);
  j(() => labelContext.register(labelId), [labelId, labelContext.register]);
  let handleClick = x((clickEvent) => {
      let labelElement = clickEvent.currentTarget;
      if (
        !(clickEvent.target !== clickEvent.currentTarget && P(clickEvent.target)) &&
        (k(labelElement) && clickEvent.preventDefault(),
        labelContext.props &&
          "onClick" in labelContext.props &&
          typeof labelContext.props.onClick == "function" &&
          labelContext.props.onClick(clickEvent),
        k(labelElement))
      ) {
        let targetElement = document.getElementById(labelElement.htmlFor);
        if (targetElement) {
          let disabledAttr = targetElement.getAttribute("disabled");
          if (disabledAttr === "true" || disabledAttr === "") return;
          let ariaDisabledAttr = targetElement.getAttribute("aria-disabled");
          if (ariaDisabledAttr === "true" || ariaDisabledAttr === "") return;
          if (
            (S(targetElement) &&
              (targetElement.type === "file" ||
                targetElement.type === "radio" ||
                targetElement.type === "checkbox")) ||
            targetElement.role === "radio" ||
            targetElement.role === "checkbox" ||
            targetElement.role === "switch"
          ) {
            targetElement.click();
          }
          targetElement.focus({
            preventScroll: !0,
          });
        }
      }
    }),
    slotData = w({
      ...labelContext.slot,
      disabled: isDisabled || !1,
    }),
    ourProps = {
      ref: mergedRef,
      ...labelContext.props,
      id: labelId,
      htmlFor: htmlFor,
      onClick: handleClick,
    };
  return (
    isPassive &&
      ("onClick" in ourProps && (delete ourProps.htmlFor, delete ourProps.onClick),
      "onClick" in restProps && delete restProps.onClick),
    B()({
      ourProps: ourProps,
      theirProps: restProps,
      slot: slotData,
      defaultTag: htmlFor ? O : "div",
      name: labelContext.name || "Label",
    })
  );
}

/* ---- Exported Label with forwardRef ---- */
let Y = F(R),
  U = Object.assign(Y, {});
export { y as C, N, Q as V, U as Z, M as u };
