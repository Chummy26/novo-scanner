/* ===========================================================================
 * Appearance Settings Page
 * ---------------------------------------------------------------------------
 * This module provides the Appearance/Theme settings page component.
 * It allows users to customize:
 *   - Theme mode (System / Light / Dark)
 *   - Primary accent color (indigo, blue, green, amber, purple, rose)
 *   - Light color scheme (slate, gray, neutral)
 *   - Dark color scheme (mint, navy, mirage, cinder, black)
 *   - Notification group style (stacked vs expanded)
 *   - Notification max visible count (1-5)
 *   - Notification position (top/bottom, left/center/right)
 *   - Card skin (shadow vs bordered)
 *   - Monochrome mode toggle
 *   - Reset theme to defaults
 * =========================================================================== */

/* ---- Imports ---- */
import {
  a as b,
  j as e,
  e as d,
  I as L,
  a1 as B,
  u as A,
  a2 as k,
  a3 as l,
  q as I,
  B as E,
} from "./index-Bx06KCE-.js";
import { Z as t } from "./label-DDDQpD4Z.js";
import { y as n, K as i } from "./radio-group-CRUASA4L.js";
import { t as N } from "./index-mwGaaYkF.js";
import { M as R, a as D, B as K, I as O } from "./listbox-BwGC_4fO.js";
import { K as G } from "./transition-Cxix63ts.js";
import { F as U } from "./CheckIcon-WReR5saH.js";
import "./use-is-mounted-D7iMJT5-.js";
import "./use-resolve-button-type-DwKZeOeP.js";
import "./floating-CA5b9ljT.js";
import "./floating-ui.dom-DmqE9iVV.js";
import "./use-text-value-ChvRIfBi.js";

/* ===========================================================================
 * Listbox Select Component
 * ---------------------------------------------------------------------------
 * A reusable dropdown select component built on top of the Headless UI
 * Listbox. Supports single and multiple selection, custom display fields,
 * error states, and animated dropdown transitions.
 * =========================================================================== */
const defaultTag = "div",
  ListboxSelect = b.forwardRef((props, ref) => {
    const {
      data: data,
      placeholder: placeholder,
      label: label,
      displayField: displayField = "label",
      error: error,
      inputProps: inputProps,
      rootProps: rootProps,
      className: className,
      classNames: classNames,
      multiple: multiple,
      as: asElement = defaultTag,
      by: compareBy,
      ...restProps
    } = props;
    return e.jsx("div", {
      className: d(
        "flex flex-col [&_.suffix]:pointer-events-none",
        classNames?.root,
      ),
      ...rootProps,
      children: e.jsx(R, {
        as: asElement,
        className: d(className, classNames?.listbox),
        ref: ref,
        multiple: multiple,
        by: compareBy,
        ...restProps,
        children: ({ open: isOpen, value: selectedValue }) =>
          e.jsxs(e.Fragment, {
            children: [
              /* ---- Optional Label ---- */
              label &&
                e.jsx(t, {
                  children: label,
                }),

              /* ---- Trigger Button & Dropdown Container ---- */
              e.jsxs("div", {
                className: d("relative", label && "mt-1.5"),
                children: [
                  /* ---- Listbox Trigger Button ---- */
                  e.jsx(D, {
                    as: L,
                    component: "button",
                    type: "button",
                    error: error,
                    suffix: e.jsx(B, {
                      className: d(
                        "size-5 transition-transform",
                        isOpen && "rotate-180",
                      ),
                    }),
                    ...inputProps,
                    children: e.jsxs("span", {
                      className: "block truncate",
                      children: [
                        /* Placeholder text (shown when no value is selected) */
                        e.jsx("span", {
                          className: "dark:text-dark-200 text-gray-600",
                          children:
                            !selectedValue?.[
                              multiple ? "length" : displayField
                            ] && placeholder,
                        }),
                        /* Selected value display */
                        e.jsx("span", {
                          children: multiple
                            ? selectedValue
                                .map((item) => item[displayField])
                                .join(", ")
                            : selectedValue?.[displayField],
                        }),
                      ],
                    }),
                  }),

                  /* ---- Dropdown Options Panel with Transition ---- */
                  e.jsx(G, {
                    as: b.Fragment,
                    enter: "transition ease-out",
                    enterFrom: "opacity-0 translate-y-2",
                    enterTo: "opacity-100 translate-y-0",
                    leave: "transition ease-in",
                    leaveFrom: "opacity-100 translate-y-0",
                    leaveTo: "opacity-0 translate-y-2",
                    children: e.jsx(K, {
                      anchor: {
                        to: "bottom end",
                        gap: 8,
                      },
                      className:
                        "dark:border-dark-500 dark:bg-dark-750 absolute z-100 max-h-60 w-(--button-width) overflow-auto rounded-lg border border-gray-300 bg-white py-1 shadow-lg shadow-gray-200/50 outline-hidden focus-visible:outline-hidden dark:shadow-none",
                      children: data.map((item, index) =>
                        e.jsx(
                          O,
                          {
                            className: ({
                              selected: isSelected,
                              active: isActive,
                            }) =>
                              d(
                                "relative cursor-pointer py-2 pr-10 pl-4 outline-hidden transition-colors select-none rtl:pr-4 rtl:pl-10",
                                isActive &&
                                  !isSelected &&
                                  "dark:bg-dark-600 bg-gray-100",
                                isSelected
                                  ? "bg-primary-600 dark:bg-primary-500 text-white"
                                  : "dark:text-dark-100 text-gray-800",
                              ),
                            value: item,
                            children: ({ selected: isSelected }) =>
                              e.jsxs(e.Fragment, {
                                children: [
                                  /* Option label text */
                                  e.jsx("span", {
                                    className: "block truncate",
                                    children: item[displayField],
                                  }),
                                  /* Check icon for selected option */
                                  isSelected
                                    ? e.jsx("span", {
                                        className:
                                          "absolute inset-y-0 flex items-center ltr:right-0 ltr:pr-3 rtl:left-0 rtl:pl-3",
                                        children: e.jsx(U, {
                                          className: "size-5",
                                          "aria-hidden": "true",
                                        }),
                                      })
                                    : null,
                                ],
                              }),
                          },
                          index,
                        ),
                      ),
                    }),
                  }),
                ],
              }),
            ],
          }),
      }),
    });
  });
ListboxSelect.displayName = "Listbox";

/* ===========================================================================
 * Theme Configuration Constants
 * ---------------------------------------------------------------------------
 * Available options for theme customization dropdowns and radio groups.
 * =========================================================================== */

const primaryColors = ["indigo", "blue", "green", "amber", "purple", "rose"],
  lightColorSchemes = ["slate", "gray", "neutral"],
  darkColorSchemes = ["mint", "navy", "mirage", "cinder", "black"],
  cardSkinOptions = [
    {
      value: "shadow",
      label: "Shadow",
    },
    {
      value: "bordered",
      label: "Bordered",
    },
  ],
  notificationPositionOptions = [
    {
      value: "top-left",
      label: "Top Left",
    },
    {
      value: "top-center",
      label: "Top Center",
    },
    {
      value: "top-right",
      label: "Top Right",
    },
    {
      value: "bottom-left",
      label: "Bottom Left",
    },
    {
      value: "bottom-center",
      label: "Bottom Center",
    },
    {
      value: "bottom-right",
      label: "Bottom Right",
    },
  ],
  maxToastCount = 5;

/* ===========================================================================
 * Appearance Page Component
 * ---------------------------------------------------------------------------
 * Main settings page for theme and appearance customization.
 * Reads from and writes to the global appearance store.
 * =========================================================================== */
function AppearancePage() {
  const appearanceStore = A();

  /* ---- Side Effect: Show toast when notification position changes ---- */
  k(() => {
    const matchedPosition = notificationPositionOptions.find(
      (option) => option.value === appearanceStore.notification?.position,
    );
    if (matchedPosition) {
      N("Position updated", {
        description: `Notification position updated to ${matchedPosition.label}`,
        descriptionClassName:
          "text-gray-600 dark:text-dark-200 text-xs mt-0.5",
      });
    }
  }, [appearanceStore.notification?.position]);

  /* ---- Side Effect: Show sample toasts when expand mode changes ---- */
  k(() => {
    for (let toastIndex = 0; toastIndex < 3; toastIndex++)
      N("This is a Toast");
  }, [appearanceStore.notification?.isExpanded]);

  return (
    /* ---- Page Layout Container ---- */
    e.jsxs("div", {
      className: "w-full max-w-3xl 2xl:max-w-5xl",
      children: [
        /* ---- Page Header ---- */
        e.jsx("h5", {
          className: "dark:text-dark-50 text-lg font-medium text-gray-800",
          children: "Appearance",
        }),
        e.jsx("p", {
          className:
            "dark:text-dark-200 mt-0.5 text-sm text-balance text-gray-500",
          children:
            "Customize the appearance of the app. Select Theme colors and mode, to change the look of the app.",
        }),
        e.jsx("div", {
          className: "dark:bg-dark-500 my-5 h-px bg-gray-200",
        }),

        /* =================================================================
         * Theme & Color Settings Section
         * ================================================================= */
        e.jsxs("div", {
          className: "space-y-8",
          children: [
            /* ----- Theme Mode Selector (System / Light / Dark) ----- */
            e.jsxs("div", {
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsx("p", {
                      className:
                        "dark:text-dark-100 text-base font-medium text-gray-800",
                      children: "Theme",
                    }),
                    e.jsx("p", {
                      className: "mt-0.5",
                      children:
                        "You can select a theme color from the list below.",
                    }),
                  ],
                }),
                e.jsxs(n, {
                  value: appearanceStore.themeMode,
                  onChange: appearanceStore.setThemeMode,
                  className: "mt-4",
                  children: [
                    e.jsx(t, {
                      className: "sr-only",
                      children: "Theme Mode (dark or light)",
                    }),
                    e.jsxs("div", {
                      className: "mt-2 flex flex-wrap gap-6",
                      children: [
                        /* ---- System Theme Option Card ---- */
                        e.jsx(i, {
                          value: "system",
                          className: "w-44 cursor-pointer outline-hidden",
                          children: ({ checked: isChecked }) =>
                            e.jsxs(e.Fragment, {
                              children: [
                                e.jsxs("div", {
                                  className: d(
                                    "bg-dark-900 relative overflow-hidden rounded-lg border-2 dark:border-transparent",
                                    isChecked &&
                                      "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                                  ),
                                  children: [
                                    /* Light half (top-left triangle via clip-path) */
                                    e.jsxs("div", {
                                      style: {
                                        clipPath:
                                          "polygon(50% 50%, 100% 0, 0 0, 0% 100%)",
                                      },
                                      className:
                                        "w-full space-y-2 bg-gray-50 p-1.5",
                                      children: [
                                        e.jsxs("div", {
                                          className:
                                            "w-full space-y-2 rounded-sm bg-white p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 h-2 w-9/12 rounded-lg",
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 h-2 w-11/12 rounded-lg",
                                            }),
                                          ],
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 size-4 shrink-0 rounded-full",
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 h-2 w-full rounded-lg",
                                            }),
                                          ],
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 size-4 shrink-0 rounded-full",
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 h-2 w-9/12 rounded-lg",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    /* Dark half (bottom-right triangle via clip-path) */
                                    e.jsxs("div", {
                                      style: {
                                        clipPath:
                                          "polygon(50% 50%, 100% 0, 100% 100%, 0% 100%)",
                                      },
                                      className:
                                        "absolute inset-0 space-y-2 p-1.5",
                                      children: [
                                        e.jsxs("div", {
                                          className:
                                            "bg-dark-700 w-full space-y-2 rounded-sm p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "bg-dark-400 h-2 w-9/12 rounded-lg",
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "bg-dark-400 h-2 w-11/12 rounded-lg",
                                            }),
                                          ],
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "bg-dark-400 size-4 shrink-0 rounded-full",
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "bg-dark-400 h-2 w-full rounded-lg",
                                            }),
                                          ],
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "bg-dark-400 size-4 shrink-0 rounded-full",
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "bg-dark-400 h-2 w-9/12 rounded-lg",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                e.jsx("p", {
                                  className: "mt-1.5 text-center",
                                  children: "System",
                                }),
                              ],
                            }),
                        }),

                        /* ---- Light Theme Option Card ---- */
                        e.jsx(i, {
                          value: "light",
                          className: "w-44 cursor-pointer outline-hidden",
                          children: ({ checked: isChecked }) =>
                            e.jsxs(e.Fragment, {
                              children: [
                                e.jsx("div", {
                                  className: d(
                                    "relative overflow-hidden rounded-lg border-2 dark:border-transparent",
                                    isChecked &&
                                      "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                                  ),
                                  children: e.jsxs("div", {
                                    className:
                                      "w-full space-y-2 bg-gray-50 p-1.5",
                                    children: [
                                      e.jsxs("div", {
                                        className:
                                          "w-full space-y-2 rounded-sm bg-white p-2 shadow-xs",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 h-2 w-9/12 rounded-lg",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 h-2 w-11/12 rounded-lg",
                                          }),
                                        ],
                                      }),
                                      e.jsxs("div", {
                                        className:
                                          "flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 size-4 shrink-0 rounded-full",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 h-2 w-full rounded-lg",
                                          }),
                                        ],
                                      }),
                                      e.jsxs("div", {
                                        className:
                                          "flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 size-4 shrink-0 rounded-full",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 h-2 w-9/12 rounded-lg",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                }),
                                e.jsx("p", {
                                  className: "mt-1.5 text-center",
                                  children: "Light",
                                }),
                              ],
                            }),
                        }),

                        /* ---- Dark Theme Option Card ---- */
                        e.jsx(i, {
                          value: "dark",
                          className: "w-44 cursor-pointer outline-hidden",
                          children: ({ checked: isChecked }) =>
                            e.jsxs(e.Fragment, {
                              children: [
                                e.jsx("div", {
                                  className: d(
                                    "bg-dark-900 relative overflow-hidden rounded-lg border border-transparent",
                                    isChecked &&
                                      "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                                  ),
                                  children: e.jsxs("div", {
                                    className:
                                      "bg-dark-900 w-full space-y-2 p-1.5",
                                    children: [
                                      e.jsxs("div", {
                                        className:
                                          "bg-dark-700 w-full space-y-2 rounded-sm p-2 shadow-xs",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-dark-400 h-2 w-9/12 rounded-lg",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-dark-400 h-2 w-11/12 rounded-lg",
                                          }),
                                        ],
                                      }),
                                      e.jsxs("div", {
                                        className:
                                          "bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-dark-400 size-4 shrink-0 rounded-full",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-dark-400 h-2 w-full rounded-lg",
                                          }),
                                        ],
                                      }),
                                      e.jsxs("div", {
                                        className:
                                          "bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-dark-400 size-4 shrink-0 rounded-full",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-dark-400 h-2 w-9/12 rounded-lg",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                }),
                                e.jsx("p", {
                                  className: "mt-1.5 text-center",
                                  children: "Dark",
                                }),
                              ],
                            }),
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            /* ----- Primary Color Picker ----- */
            e.jsxs("div", {
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsx("p", {
                      className:
                        "dark:text-dark-100 text-base font-medium text-gray-800",
                      children: "Primary Color",
                    }),
                    e.jsx("p", {
                      className: "mt-0.5",
                      children:
                        "Choose a color that will be used as the primary color for your theme.",
                    }),
                  ],
                }),
                e.jsxs(n, {
                  value: appearanceStore.primaryColorScheme.name,
                  onChange: appearanceStore.setPrimaryColorScheme,
                  className: "mt-2",
                  children: [
                    e.jsx(t, {
                      className: "sr-only",
                      children: "Choose Primary Theme Color",
                    }),
                    e.jsx("div", {
                      className: "mt-2 flex w-fit flex-wrap gap-4 sm:gap-5",
                      children: primaryColors.map((colorName) =>
                        e.jsx(
                          i,
                          {
                            value: colorName,
                            className: ({ checked: isChecked }) =>
                              d(
                                "flex h-14 w-16 cursor-pointer items-center justify-center rounded-lg border outline-hidden",
                                isChecked
                                  ? "border-primary-500"
                                  : "dark:border-dark-500 border-gray-200",
                              ),
                            children: ({ checked: isChecked }) =>
                              e.jsx("div", {
                                className: d(
                                  "mask is-diamond size-6 transition-all",
                                  isChecked && "scale-110 rotate-45",
                                ),
                                style: {
                                  backgroundColor: l[colorName][500],
                                },
                              }),
                          },
                          colorName,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            }),

            /* ----- Light Color Scheme Picker ----- */
            e.jsxs("div", {
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsx("p", {
                      className:
                        "dark:text-dark-100 text-base font-medium text-gray-800",
                      children: "Light Color Scheme",
                    }),
                    e.jsx("p", {
                      className: "mt-0.5",
                      children:
                        "Select light color scheme that will be used for your theme.",
                    }),
                  ],
                }),
                e.jsxs(n, {
                  value: appearanceStore.lightColorScheme.name,
                  onChange: appearanceStore.setLightColorScheme,
                  className: "mt-4",
                  children: [
                    e.jsx(t, {
                      className: "sr-only",
                      children: "Theme Light Mode Color Scheme",
                    }),
                    e.jsx("div", {
                      className: "mt-2 flex flex-wrap gap-4",
                      children: lightColorSchemes.map((schemeName) =>
                        e.jsx(
                          i,
                          {
                            value: schemeName,
                            className: "w-32 cursor-pointer outline-hidden",
                            children: ({ checked: isChecked }) =>
                              e.jsxs(e.Fragment, {
                                children: [
                                  /* Color scheme preview card */
                                  e.jsx("div", {
                                    className: d(
                                      "relative overflow-hidden rounded-lg border-2 dark:border-transparent",
                                      isChecked &&
                                        "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                                    ),
                                    children: e.jsxs("div", {
                                      className: "w-full space-y-2 p-1.5",
                                      style: {
                                        backgroundColor: l[schemeName][200],
                                      },
                                      children: [
                                        e.jsxs("div", {
                                          className:
                                            "w-full space-y-2 rounded-sm bg-white p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "h-2 w-9/12 rounded-lg",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "h-2 w-11/12 rounded-lg",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                          ],
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "size-4 shrink-0 rounded-full",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "h-2 w-full rounded-lg",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  }),
                                  /* Scheme name label */
                                  e.jsx("p", {
                                    className: "mt-1.5 text-center capitalize",
                                    children: schemeName,
                                  }),
                                ],
                              }),
                          },
                          schemeName,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            }),

            /* ----- Dark Color Scheme Picker ----- */
            e.jsxs("div", {
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsx("p", {
                      className:
                        "dark:text-dark-100 text-base font-medium text-gray-800",
                      children: "Dark Color Scheme",
                    }),
                    e.jsx("p", {
                      className: "mt-0.5",
                      children:
                        "Select dark color scheme that will be used for your theme.",
                    }),
                  ],
                }),
                e.jsxs(n, {
                  value: appearanceStore.darkColorScheme.name,
                  onChange: appearanceStore.setDarkColorScheme,
                  className: "mt-4",
                  children: [
                    e.jsx(t, {
                      className: "sr-only",
                      children: "Dark Mode Color Schemes",
                    }),
                    e.jsx("div", {
                      className: "mt-2 flex flex-wrap gap-4",
                      children: darkColorSchemes.map((schemeName) =>
                        e.jsx(
                          i,
                          {
                            value: schemeName,
                            className: "w-32 cursor-pointer outline-hidden",
                            children: ({ checked: isChecked }) =>
                              e.jsxs(e.Fragment, {
                                children: [
                                  /* Dark scheme preview card */
                                  e.jsx("div", {
                                    className: d(
                                      "relative overflow-hidden rounded-lg",
                                      isChecked &&
                                        "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                                    ),
                                    children: e.jsxs("div", {
                                      className: "w-full space-y-2 p-1.5",
                                      style: {
                                        backgroundColor: l[schemeName][900],
                                      },
                                      children: [
                                        e.jsxs("div", {
                                          className:
                                            "w-full space-y-2 rounded-sm p-2 shadow-xs",
                                          style: {
                                            backgroundColor: l[schemeName][700],
                                          },
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "h-2 w-9/12 rounded-lg",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "h-2 w-11/12 rounded-lg",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                          ],
                                        }),
                                        e.jsxs("div", {
                                          className:
                                            "flex items-center space-x-2 rounded-sm p-2 shadow-xs",
                                          style: {
                                            backgroundColor: l[schemeName][700],
                                          },
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "size-4 shrink-0 rounded-full",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "h-2 w-full rounded-lg",
                                              style: {
                                                backgroundColor:
                                                  l[schemeName][400],
                                              },
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  }),
                                  /* Scheme name label */
                                  e.jsx("p", {
                                    className: "mt-1.5 text-center capitalize",
                                    children: schemeName,
                                  }),
                                ],
                              }),
                          },
                          schemeName,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        /* ---- Section Divider ---- */
        e.jsx("div", {
          className: "dark:bg-dark-500 my-6 h-px bg-gray-200",
        }),

        /* =================================================================
         * Notification Settings Section
         * ================================================================= */
        e.jsxs("div", {
          children: [
            /* ---- Section Header ---- */
            e.jsxs("div", {
              children: [
                e.jsx("p", {
                  className:
                    "dark:text-dark-100 text-base font-medium text-gray-800",
                  children: "Notification",
                }),
                e.jsx("p", {
                  className: "mt-0.5",
                  children:
                    "Choose Notification position and group style for your application",
                }),
              ],
            }),

            /* ----- Notification Group Style (Stacked / Expanded) ----- */
            e.jsxs("div", {
              className: "mt-3",
              children: [
                e.jsx("p", {
                  children: "Notification Group Style",
                }),
                e.jsxs(n, {
                  value: appearanceStore.notification?.isExpanded
                    ? "expand"
                    : "stack",
                  onChange: (selectedStyle) =>
                    appearanceStore.setNotificationExpand(
                      selectedStyle === "expand",
                    ),
                  className: "mt-3 text-center",
                  children: [
                    e.jsx(t, {
                      className: "sr-only",
                      children: "Notification Group Style",
                    }),
                    e.jsxs("div", {
                      className: "grid max-w-xl gap-4 sm:grid-cols-2",
                      children: [
                        /* ---- Stacked Notification Preview Card ---- */
                        e.jsx(i, {
                          value: "stack",
                          className: "cursor-pointer outline-hidden",
                          children: ({ checked: isChecked }) =>
                            e.jsxs(e.Fragment, {
                              children: [
                                e.jsx("div", {
                                  className: d(
                                    "dark:border-dark-500 relative flex h-52 w-full items-center rounded-lg border border-gray-200 px-3 py-4",
                                    isChecked &&
                                      "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                                  ),
                                  children: e.jsxs("div", {
                                    className: "w-full -space-y-6",
                                    children: [
                                      /* First stacked card (smallest, furthest back) */
                                      e.jsxs("div", {
                                        className:
                                          "dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white p-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none",
                                        style: {
                                          transform: "scale(.9)",
                                        },
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg",
                                          }),
                                        ],
                                      }),
                                      /* Second stacked card (medium, middle layer) */
                                      e.jsxs("div", {
                                        className:
                                          "dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white p-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none",
                                        style: {
                                          transform: "scale(.95)",
                                        },
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg",
                                          }),
                                        ],
                                      }),
                                      /* Third stacked card (front, full size) */
                                      e.jsxs("div", {
                                        className:
                                          "dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white p-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg",
                                          }),
                                          e.jsx("div", {
                                            className:
                                              "bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                }),
                                e.jsx("p", {
                                  className: "mt-2",
                                  children: "Stacked",
                                }),
                              ],
                            }),
                        }),

                        /* ---- Expanded Notification Preview Card ---- */
                        e.jsx(i, {
                          value: "expand",
                          className: "cursor-pointer outline-hidden",
                          children: ({ checked: isChecked }) =>
                            e.jsxs(e.Fragment, {
                              children: [
                                e.jsx("div", {
                                  className: d(
                                    "dark:border-dark-500 relative flex h-52 w-full flex-col justify-between space-y-2 rounded-lg border border-gray-200 px-4 py-5",
                                    isChecked &&
                                      "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                                  ),
                                  children: Array(3)
                                    .fill(null)
                                    .map((unusedItem, cardIndex) =>
                                      e.jsxs(
                                        "div",
                                        {
                                          className:
                                            "dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white p-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none",
                                          children: [
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg",
                                            }),
                                            e.jsx("div", {
                                              className:
                                                "bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg",
                                            }),
                                          ],
                                        },
                                        cardIndex,
                                      ),
                                    ),
                                }),
                                e.jsx("p", {
                                  className: "mt-2",
                                  children: "Expanded",
                                }),
                              ],
                            }),
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            /* ----- Notification Max Count Selector (1-5) ----- */
            e.jsxs("div", {
              className: "mt-4",
              children: [
                e.jsx("p", {
                  children: "Notification Max Count",
                }),
                e.jsxs(n, {
                  value: appearanceStore.notification?.visibleToasts,
                  onChange: (selectedCount) =>
                    appearanceStore.setNotificationMaxCount(selectedCount),
                  className: "mt-3 text-center",
                  children: [
                    e.jsx(t, {
                      className: "sr-only",
                      children: "Notification Max Count",
                    }),
                    e.jsx("div", {
                      className: "flex w-full max-w-sm space-x-0.5",
                      children: Array(maxToastCount)
                        .fill(null)
                        .map((unusedItem, countIndex) =>
                          e.jsx(
                            i,
                            {
                              value: countIndex + 1,
                              className: ({ checked: isChecked }) =>
                                d(
                                  "flex-1 cursor-pointer border-2 border-transparent border-b-current pb-1 text-base font-medium outline-hidden",
                                  isChecked
                                    ? "text-primary-600 dark:text-primary-400"
                                    : "dark:text-dark-300 text-gray-500",
                                ),
                              children: countIndex + 1,
                            },
                            countIndex,
                          ),
                        ),
                    }),
                  ],
                }),
              ],
            }),

            /* ----- Notification Position Dropdown ----- */
            e.jsxs("div", {
              className: "mt-5 grid grid-cols-1 md:grid-cols-3",
              children: [
                e.jsx("p", {
                  className: "my-auto",
                  children: "Notification Position:",
                }),
                e.jsx(ListboxSelect, {
                  classNames: {
                    root: "mt-1.5 flex-1 md:col-span-2 md:mt-0",
                  },
                  data: notificationPositionOptions,
                  value: notificationPositionOptions.find(
                    (option) =>
                      option.value === appearanceStore.notification?.position,
                  ),
                  onChange: ({ value: selectedPosition }) =>
                    appearanceStore.setNotificationPosition(selectedPosition),
                }),
              ],
            }),
          ],
        }),

        /* ---- Section Divider ---- */
        e.jsx("div", {
          className: "dark:bg-dark-500 my-6 h-px bg-gray-200",
        }),

        /* =================================================================
         * Card Skin & Monochrome Settings Section
         * ================================================================= */
        e.jsxs("div", {
          className: "space-y-5",
          children: [
            /* ----- Card Skin Dropdown (Shadow / Bordered) ----- */
            e.jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-3",
              children: [
                e.jsx("p", {
                  className: "my-auto",
                  children: "Card Skin:",
                }),
                e.jsx(ListboxSelect, {
                  classNames: {
                    root: "mt-1.5 flex-1 md:col-span-2 md:mt-0",
                  },
                  data: cardSkinOptions,
                  value: cardSkinOptions.find(
                    (option) => option.value === appearanceStore.cardSkin,
                  ),
                  onChange: ({ value: selectedSkin }) =>
                    appearanceStore.setCardSkin(selectedSkin),
                }),
              ],
            }),

            /* ----- Monochrome Mode Toggle ----- */
            e.jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-3",
              children: [
                e.jsx("p", {
                  className: "my-auto",
                  children: "Theme Chrome Mode:",
                }),
                e.jsxs("div", {
                  className:
                    "dark:border-dark-450 mt-1.5 flex flex-1 items-center justify-between space-x-2 rounded-lg border border-gray-300 px-3 py-2 md:col-span-2 md:mt-0",
                  children: [
                    e.jsx("p", {
                      className: "dark:text-dark-100 text-gray-800",
                      children: "Monochrome Mode",
                    }),
                    e.jsx(I, {
                      checked: appearanceStore.isMonochrome,
                      onChange: (event) =>
                        appearanceStore.setMonochromeMode(event.target.checked),
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        /* ---- Reset Theme Button ---- */
        e.jsx("div", {
          className: "mt-10",
          children: e.jsx(E, {
            color: "primary",
            onClick: appearanceStore.resetTheme,
            children: "Reset Theme",
          }),
        }),
      ],
    })
  );
}
export { AppearancePage as default };
