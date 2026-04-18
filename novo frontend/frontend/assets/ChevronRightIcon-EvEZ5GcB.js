/* Heroicon: ChevronRightIcon (outline) */
import { a as React } from "./index-Bx06KCE-.js";
function ChevronRightIconRender(
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
      d: "m8.25 4.5 7.5 7.5-7.5 7.5",
    }),
  );
}
const ChevronRightIcon = React.forwardRef(ChevronRightIconRender);
export { ChevronRightIcon as F };
