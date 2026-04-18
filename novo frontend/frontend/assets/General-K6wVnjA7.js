import {
  a,
  j as e,
  W as x,
  B as t,
  a0 as u,
  I as c,
} from "./index-Bx06KCE-.js";
import { G as h } from "./iconBase-BPc6woXW.js";
import { F as m } from "./UserIcon-B-URsuU3.js";
import { F as f } from "./EnvelopeIcon-CcLEeLlf.js";

// ============================================================================
// SVG Icon Components
// ============================================================================

/**
 * PhoneIcon - Renders a solid phone/telephone SVG icon (20x20 viewBox).
 * Used as a prefix icon for the phone number input field.
 *
 * @param {object} props - SVG props including title, titleId, and spread attributes.
 * @param {React.Ref} ref - Forwarded ref for the SVG element.
 * @returns {React.Element} SVG phone icon element.
 */
function PhoneIconInner(
  { title: svgTitle, titleId: svgTitleId, ...restProps },
  ref,
) {
  return a.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? a.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    a.createElement("path", {
      fillRule: "evenodd",
      d: "M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z",
      clipRule: "evenodd",
    }),
  );
}
const PhoneIcon = a.forwardRef(PhoneIconInner);

/**
 * XMarkMiniIcon - Renders an X/close mark SVG icon (20x20 viewBox).
 * Used to remove the selected avatar image.
 *
 * @param {object} props - SVG props including title, titleId, and spread attributes.
 * @param {React.Ref} ref - Forwarded ref for the SVG element.
 * @returns {React.Element} SVG close/X icon element.
 */
function XMarkMiniIconInner(
  { title: svgTitle, titleId: svgTitleId, ...restProps },
  ref,
) {
  return a.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 20 20",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? a.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    a.createElement("path", {
      d: "M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z",
    }),
  );
}
const XMarkMiniIcon = a.forwardRef(XMarkMiniIconInner);

/**
 * PencilIcon - Renders a pencil/edit SVG icon using the iconBase utility (20x20 viewBox).
 * Used as the indicator icon on the avatar to trigger the file upload.
 *
 * @param {object} iconProps - Props passed to the icon base renderer.
 * @returns {React.Element} SVG pencil icon element.
 */
function PencilIcon(iconProps) {
  return h({
    attr: {
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true",
    },
    child: [
      {
        tag: "path",
        attr: {
          d: "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z",
        },
        child: [],
      },
    ],
  })(iconProps);
}

// ============================================================================
// Avatar Image Preview Component
// ============================================================================

/**
 * AvatarImagePreview - Renders an image that displays either a file blob URL
 * or a fallback src. Manages the lifecycle of object URLs to prevent memory leaks.
 *
 * @param {object} props
 * @param {File|null} props.file - Optional File object to preview as a blob URL.
 * @param {string} props.src - Fallback image source URL.
 * @param {string} props.alt - Alt text for the image.
 * @returns {React.Element} An <img> element showing the file preview or fallback.
 */
function AvatarImagePreview({
  file: imageFile,
  src: fallbackSrc,
  alt: altText,
  ...restProps
}) {
  const [blobUrl, setBlobUrl] = a.useState(null);
  return (
    a.useEffect(() => {
      if (!imageFile) {
        setBlobUrl(null);
        return;
      }
      try {
        setBlobUrl(URL.createObjectURL(imageFile));
      } catch (error) {
        console.error(error);
        setBlobUrl(null);
      }
      return () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    }, [imageFile]),
    e.jsx("img", {
      src: blobUrl || fallbackSrc,
      onLoad: () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      },
      alt: altText,
      ...restProps,
    })
  );
}

// ============================================================================
// General Settings Page Component
// ============================================================================

/**
 * GeneralSettingsPage - Main component for the "General" settings tab.
 * Allows users to update their avatar, personal information (display name,
 * full name, email, phone), and manage linked social accounts (Google,
 * GitHub, Instagram, Discord).
 *
 * @returns {React.Element} The complete General settings tab layout.
 */
function GeneralSettingsPage() {
  const [avatarFile, setAvatarFile] = a.useState(null);
  return e.jsxs("div", {
    className: "w-full max-w-3xl 2xl:max-w-5xl",
    children: [
      e.jsx("h5", {
        className: "dark:text-dark-50 text-lg font-medium text-gray-800",
        children: "General",
      }),
      e.jsx("p", {
        className:
          "dark:text-dark-200 mt-0.5 text-sm text-balance text-gray-500",
        children: "Update your account settings.",
      }),
      e.jsx("div", {
        className: "dark:bg-dark-500 my-5 h-px bg-gray-200",
      }),

      /* ---- Avatar Section ---- */
      e.jsxs("div", {
        className: "mt-4 flex flex-col space-y-1.5",
        children: [
          e.jsx("span", {
            className: "dark:text-dark-100 text-base font-medium text-gray-800",
            children: "Avatar",
          }),
          e.jsx(x, {
            size: 20,
            imgComponent: AvatarImagePreview,
            imgProps: {
              file: avatarFile,
            },
            src: "/images/avatar/avatar-20.jpg",
            classNames: {
              root: "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 rounded-xl ring-offset-[3px] ring-offset-white transition-all hover:ring-3",
              display: "rounded-xl",
            },
            indicator: e.jsx("div", {
              className:
                "dark:bg-dark-700 absolute right-0 bottom-0 -m-1 flex items-center justify-center rounded-full bg-white",
              children: avatarFile
                ? e.jsx(t, {
                    onClick: () => setAvatarFile(null),
                    isIcon: true,
                    className: "size-6 rounded-full",
                    children: e.jsx(XMarkMiniIcon, {
                      className: "size-4",
                    }),
                  })
                : e.jsx(u, {
                    name: "avatar",
                    onChange: (selectedFiles) =>
                      setAvatarFile(selectedFiles[0]),
                    accept: "image/*",
                    children: ({ ...fileInputProps }) =>
                      e.jsx(t, {
                        isIcon: true,
                        className: "size-6 rounded-full",
                        ...fileInputProps,
                        children: e.jsx(PencilIcon, {
                          className: "size-3.5",
                        }),
                      }),
                  }),
            }),
          }),
        ],
      }),

      /* ---- Personal Information Form Fields ---- */
      e.jsxs("div", {
        className:
          "mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 [&_.prefix]:pointer-events-none",
        children: [
          e.jsx(c, {
            placeholder: "Enter Nickname",
            label: "Display name",
            className: "rounded-xl",
            prefix: e.jsx(m, {
              className: "size-4.5",
            }),
          }),
          e.jsx(c, {
            placeholder: "Enter FullName",
            label: "Full name",
            className: "rounded-xl",
            prefix: e.jsx(m, {
              className: "size-4.5",
            }),
          }),
          e.jsx(c, {
            placeholder: "Enter Email",
            label: "Email",
            className: "rounded-xl",
            prefix: e.jsx(f, {
              className: "size-4.5",
            }),
          }),
          e.jsx(c, {
            placeholder: "Phone Number",
            label: "Phone Number",
            className: "rounded-xl",
            prefix: e.jsx(PhoneIcon, {
              className: "size-4.5",
            }),
          }),
        ],
      }),
      e.jsx("div", {
        className: "dark:bg-dark-500 my-7 h-px bg-gray-200",
      }),

      /* ---- Linked Accounts Section ---- */
      e.jsxs("div", {
        children: [
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "dark:text-dark-100 text-base font-medium text-gray-800",
                children: "Linked Accounts",
              }),
              e.jsx("p", {
                className: "mt-0.5",
                children: "Manage your linked accounts and their permissions.",
              }),
            ],
          }),
          e.jsxs("div", {
            children: [
              /* Google */
              e.jsxs("div", {
                className: "mt-4 flex items-center justify-between space-x-2",
                children: [
                  e.jsxs("div", {
                    className: "flex min-w-0 items-center space-x-4",
                    children: [
                      e.jsx("div", {
                        className: "size-12",
                        children: e.jsx("img", {
                          className: "h-full w-full",
                          src: "/images/logos/google.svg",
                          alt: "logo",
                        }),
                      }),
                      e.jsx("p", {
                        className: "truncate font-medium",
                        children: "Sign In with Google",
                      }),
                    ],
                  }),
                  e.jsx(t, {
                    className: "text-xs-plus h-8 rounded-full px-3",
                    variant: "outlined",
                    children: "Connect",
                  }),
                ],
              }),
              /* GitHub */
              e.jsxs("div", {
                className: "mt-4 flex items-center justify-between space-x-2",
                children: [
                  e.jsxs("div", {
                    className: "flex min-w-0 items-center space-x-4",
                    children: [
                      e.jsx("div", {
                        className: "size-12",
                        children: e.jsx("img", {
                          className: "h-full w-full",
                          src: "/images/logos/github-round.svg",
                          alt: "logo",
                        }),
                      }),
                      e.jsx("p", {
                        className: "truncate font-medium",
                        children: "Sign In with Github",
                      }),
                    ],
                  }),
                  e.jsx(t, {
                    className: "text-xs-plus h-8 rounded-full px-3",
                    variant: "outlined",
                    children: "Connect",
                  }),
                ],
              }),
              /* Instagram */
              e.jsxs("div", {
                className: "mt-4 flex items-center justify-between space-x-2",
                children: [
                  e.jsxs("div", {
                    className: "flex min-w-0 items-center space-x-4",
                    children: [
                      e.jsx("div", {
                        className: "size-12",
                        children: e.jsx("img", {
                          className: "h-full w-full",
                          src: "/images/logos/instagram-round.svg",
                          alt: "logo",
                        }),
                      }),
                      e.jsx("p", {
                        className: "truncate font-medium",
                        children: "Sign In with Instagram",
                      }),
                    ],
                  }),
                  e.jsx(t, {
                    className: "text-xs-plus h-8 rounded-full px-3",
                    variant: "outlined",
                    children: "Connect",
                  }),
                ],
              }),
              /* Discord */
              e.jsxs("div", {
                className: "mt-4 flex items-center justify-between space-x-2",
                children: [
                  e.jsxs("div", {
                    className: "flex min-w-0 items-center space-x-4",
                    children: [
                      e.jsx("div", {
                        className: "size-12",
                        children: e.jsx("img", {
                          className: "h-full w-full",
                          src: "/images/logos/discord-round.svg",
                          alt: "logo",
                        }),
                      }),
                      e.jsx("p", {
                        className: "truncate font-medium",
                        children: "Sign In with Discord",
                      }),
                    ],
                  }),
                  e.jsxs(t, {
                    className: "text-xs-plus h-8 rounded-full px-3",
                    variant: "outlined",
                    children: [" ", "Connect"],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      /* ---- Action Buttons (Cancel / Save) ---- */
      e.jsxs("div", {
        className: "mt-8 flex justify-end space-x-3",
        children: [
          e.jsx(t, {
            className: "min-w-[7rem]",
            children: "Cancel",
          }),
          e.jsx(t, {
            className: "min-w-[7rem]",
            color: "primary",
            children: "Save",
          }),
        ],
      }),
    ],
  });
}
export { GeneralSettingsPage as default };
