/* ========================================
 * SearchableSelect Component
 * Dropdown select com busca integrada
 * ======================================== */

import { a as React, j as jsx, e as clsx } from "./index-Bx06KCE-.js";
import { F as MagnifyingGlassIcon } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as CheckIcon } from "./CheckIcon-WReR5saH.js";

/* ---- ChevronUpDownIcon (mini, solid) ---- */
function ChevronUpDownIconRender(
  { title: titleText, titleId, ...restProps },
  ref,
) {
  return React.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref,
        "aria-labelledby": titleId,
      },
      restProps,
    ),
    titleText ? React.createElement("title", { id: titleId }, titleText) : null,
    React.createElement("path", {
      fillRule: "evenodd",
      d: "M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 0 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Zm-4.31 9.81 3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 1 0-1.06-1.06L10 14.94l-2.72-2.72a.75.75 0 0 0-1.06 1.06Z",
      clipRule: "evenodd",
    }),
  );
}

const ChevronUpDownIcon = React.forwardRef(ChevronUpDownIconRender);

/* ---- SearchableSelect Component ---- */

/**
 * A searchable dropdown select component.
 *
 * @param {string} label - Field label
 * @param {Array<{value, label, disabled?}>} data - Options list
 * @param {*} value - Currently selected value
 * @param {Function} onChange - Called with the new value on selection
 * @param {string} error - Error message to display
 * @param {string} placeholder - Placeholder text when nothing is selected
 */
function SearchableSelect({
  label,
  data,
  value,
  onChange,
  error,
  placeholder = "Selecione...",
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef(null);

  /* Close dropdown on click outside */
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Filter options by search query (excluding disabled) */
  const filteredOptions = data.filter(
    (option) =>
      !option.disabled &&
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedOption = data.find((option) => option.value === value);

  return jsx.jsxs("div", {
    className: "relative",
    ref: containerRef,
    children: [
      /* Label */
      jsx.jsx("label", {
        className:
          "block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1.5",
        children: label,
      }),

      /* Trigger button */
      jsx.jsxs("button", {
        type: "button",
        onClick: () => {
          setIsOpen(!isOpen);
          if (isOpen) setSearchQuery("");
        },
        className: clsx(
          "relative w-full cursor-default rounded-lg border py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 sm:text-sm transition-colors",
          error
            ? "border-error focus:border-error focus:ring-error dark:border-error-lighter"
            : "border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-600",
          "bg-white dark:bg-dark-600 text-gray-900 dark:text-white",
        ),
        children: [
          jsx.jsx("span", {
            className: clsx(
              "block truncate",
              !selectedOption && "text-gray-400",
            ),
            children: selectedOption ? selectedOption.label : placeholder,
          }),
          jsx.jsx("span", {
            className:
              "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2",
            children: jsx.jsx(ChevronUpDownIcon, {
              className: "h-5 w-5 text-gray-400",
              "aria-hidden": "true",
            }),
          }),
        ],
      }),

      /* Dropdown panel */
      isOpen &&
        jsx.jsxs("div", {
          className:
            "absolute z-50 mt-1 w-full overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-dark-700 dark:ring-dark-500",
          children: [
            /* Search input */
            jsx.jsx("div", {
              className:
                "sticky top-0 border-b border-gray-100 bg-gray-50 p-2 dark:border-dark-600 dark:bg-dark-800",
              children: jsx.jsxs("div", {
                className: "relative",
                children: [
                  jsx.jsx(MagnifyingGlassIcon, {
                    className:
                      "absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400",
                  }),
                  jsx.jsx("input", {
                    type: "text",
                    className:
                      "w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-600 dark:text-white",
                    placeholder: "Buscar...",
                    value: searchQuery,
                    onChange: (event) => setSearchQuery(event.target.value),
                    autoFocus: true,
                  }),
                ],
              }),
            }),

            /* Options list */
            jsx.jsx("ul", {
              className: "max-h-60 overflow-auto py-1 custom-scrollbar",
              children:
                filteredOptions.length === 0
                  ? jsx.jsx("li", {
                      className:
                        "px-4 py-2 text-sm text-gray-500 dark:text-dark-400",
                      children: "Nenhum resultado encontrado.",
                    })
                  : filteredOptions.map((option) =>
                      jsx.jsxs(
                        "li",
                        {
                          className: clsx(
                            "relative cursor-pointer select-none py-2 pl-3 pr-9 text-sm transition-colors",
                            option.value === value
                              ? "bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100"
                              : "text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-dark-600",
                          ),
                          onClick: () => {
                            onChange(option.value);
                            setIsOpen(false);
                          },
                          children: [
                            jsx.jsx("span", {
                              className: clsx(
                                "block truncate",
                                option.value === value && "font-semibold",
                              ),
                              children: option.label,
                            }),
                            option.value === value &&
                              jsx.jsx("span", {
                                className:
                                  "absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600 dark:text-primary-400",
                                children: jsx.jsx(CheckIcon, {
                                  className: "h-5 w-5",
                                  "aria-hidden": "true",
                                }),
                              }),
                          ],
                        },
                        option.value,
                      ),
                    ),
            }),
          ],
        }),

      /* Error message */
      error &&
        jsx.jsx("p", {
          className: "mt-1 text-xs text-red-500 dark:text-red-400",
          children: error,
        }),
    ],
  });
}

export { SearchableSelect as S };
