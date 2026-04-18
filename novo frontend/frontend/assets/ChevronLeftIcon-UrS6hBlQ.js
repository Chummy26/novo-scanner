/* Heroicon: ChevronLeftIcon (outline) */
import { a as React } from "./index-Bx06KCE-.js";
function ChevronLeftIconRender(
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
      d: "M15.75 19.5 8.25 12l7.5-7.5",
    }),
  );
}
const ChevronLeftIcon = React.forwardRef(ChevronLeftIconRender);
export { ChevronLeftIcon as F };
