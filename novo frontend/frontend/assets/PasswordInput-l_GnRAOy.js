/* ========================================
 * PasswordInput Component
 * Input de senha com toggle show/hide
 * ======================================== */

import { a as React, j as jsx, I as InputField } from "./index-Bx06KCE-.js";
import { F as EyeSlashIcon } from "./EyeSlashIcon-CsqEf1t-.js";
import { F as EyeIcon } from "./EyeIcon-CCF3MwDA.js";

/* ---- LockClosedIcon (Heroicon outline) ---- */
function LockClosedIconRender(
  { title: titleText, titleId, ...restProps },
  ref,
) {
  return React.createElement(
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
    titleText ? React.createElement("title", { id: titleId }, titleText) : null,
    React.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
    }),
  );
}

const LockClosedIcon = React.forwardRef(LockClosedIconRender);

/* ---- PasswordInput ---- */

/**
 * Password input field with a show/hide toggle button.
 * Wraps the base InputField component.
 */
function PasswordInput({
  toggleAriaLabel = {
    show: "Mostrar senha",
    hide: "Ocultar senha",
  },
  ...inputProps
}) {
  const [isVisible, setIsVisible] = React.useState(false);

  return jsx.jsx(InputField, {
    ...inputProps,
    type: isVisible ? "text" : "password",
    suffix: jsx.jsx("button", {
      type: "button",
      onClick: () => setIsVisible((prev) => !prev),
      className:
        "flex h-full w-full items-center justify-center focus:outline-none",
      "aria-label": isVisible ? toggleAriaLabel.hide : toggleAriaLabel.show,
      children: isVisible
        ? jsx.jsx(EyeSlashIcon, { className: "size-4" })
        : jsx.jsx(EyeIcon, { className: "size-4" }),
    }),
  });
}

export { LockClosedIcon as F, PasswordInput as P };
