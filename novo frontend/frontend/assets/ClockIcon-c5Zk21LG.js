/* Heroicon: ClockIcon (outline) */
import { a as React } from "./index-Bx06KCE-.js";
function ClockIconRender({ title: titleText, titleId, ...restProps }, ref) {
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
    titleText
      ? React.createElement(
          "title",
          {
            id: titleId,
          },
          titleText,
        )
      : null,
    React.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    }),
  );
}
const ClockIcon = React.forwardRef(ClockIconRender);
export { ClockIcon as F };
